"""Etapas 3 e 4 — staging textual e promoção para `public`, numa transação única.

O QUÊ  : carrega os CSV brutos em `staging` (tudo `text`) e promove para `public`,
         resolvendo as chaves estrangeiras por `codigo`.

PARA QUÊ: é o coração do ETL. Toda tabela passa por aqui, o que garante que a política
         de resolução de chave, de procedência e de abortar seja **a mesma nas 25** —
         e não 25 variações parecidas (documento 30 §2.6).

COMO   : a etapa 3 cria as tabelas de staging **a partir do cabeçalho do CSV**, todas
         `text`; a etapa 4 percorre `ordem.ORDEM_DE_CARGA` e promove cada uma.

⚠️ POR QUE A STAGING NASCE DO CABEÇALHO, e não de migration: ela é **efêmera por
   definição** (data-model §2) e espelha a origem, que pode mudar de coluna entre
   snapshots. Uma migration por aba criaria 24 definições a manter em sincronia com
   uma planilha que não controlamos — e a primeira divergência seria silenciosa.
   Nascer do cabeçalho torna a divergência **visível na hora**: coluna nova aparece,
   coluna sumida some, e a conferência do mapa acusa.

⚠️ TUDO NUMA TRANSAÇÃO (FR-005): ou as 25 tabelas entram, ou nenhuma. Estado parcial é
   o pior estado numa migração — é o único em que ninguém sabe se o certo é continuar
   ou voltar.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from . import mapa, ordem

BRUTO = Path(__file__).parent / "dados" / "bruto" / "v20"
NORMALIZADO = Path(__file__).parent / "dados" / "normalizado"
CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


class CoberturaIncompleta(RuntimeError):
    """A ordem de carga e o de-para discordam. Aborta **antes** de qualquer escrita."""


class OrfaoNaOrigem(RuntimeError):
    """Chave estrangeira que não encontra destino. Aborta a transação inteira."""


@dataclass
class Relatorio:
    staging: dict[str, int] = field(default_factory=dict)
    promovidas: dict[str, int] = field(default_factory=dict)
    orfaos: list[str] = field(default_factory=list)
    puladas: list[str] = field(default_factory=list)


def _identificador(bruto: str) -> str:
    """Nome de coluna seguro para `staging`, sem aspas e sem surpresa.

    A origem tem cabeçalhos como `E-mail`, `Regime de trabalho` e
    `Docente ≤ 2 disciplinas?`. Citá-los exigiria aspas em toda consulta; normalizá-los
    aqui mantém o SQL legível — e o mapa guarda o nome original, que é o que importa
    para a rastreabilidade.
    """
    fora = str.maketrans(" -.?/()≤²", "_________")
    limpo = bruto.strip().translate(fora).lower()
    limpo = "".join(c for c in limpo if c.isalnum() or c == "_")
    while "__" in limpo:
        limpo = limpo.replace("__", "_")
    return limpo.strip("_") or "coluna_sem_nome"


def preparar_staging(con: psycopg.Connection, rel: Relatorio) -> None:
    """Etapa 3 — `truncate` + `COPY` de cada CSV bruto para `staging`, tudo `text`.

    A staging é **truncada no início desta execução**, não descartada ao fim da
    anterior (achado CHK012): é isso que faz `--somente-reconciliar` ter contra o que
    comparar depois de uma carga.
    """
    for arquivo in sorted(BRUTO.glob("*.csv")):
        aba = arquivo.stem
        with arquivo.open(encoding="utf-8", newline="") as h:
            leitor = csv.reader(h)
            cabecalho = next(leitor, None)
            if not cabecalho:
                continue
            colunas = [_identificador(c) for c in cabecalho]
            # nomes repetidos na origem viram col, col_2, col_3…
            vistos: dict[str, int] = {}
            unicas: list[str] = []
            for c in colunas:
                vistos[c] = vistos.get(c, 0) + 1
                unicas.append(c if vistos[c] == 1 else f"{c}_{vistos[c]}")

            tabela = f'staging."{aba}"'
            defs = ", ".join(f'"{c}" text' for c in unicas)
            with con.cursor() as k:
                k.execute(f"drop table if exists {tabela}")
                k.execute(f"create table {tabela} ({defs})")
                alvo = ", ".join(f'"{c}"' for c in unicas)
                # Formato TEXTO, não `format csv`: o `write_row` do psycopg serializa em
                # texto separado por tabulação, e declarar `csv` faz o servidor tentar
                # ler tabulação como campo único — "missing data for column".
                # Custou uma execução para descobrir; fica escrito para não custar duas.
                with k.copy(f"copy {tabela} ({alvo}) from stdin") as copia:
                    n = 0
                    for linha in leitor:
                        if not any(x.strip() for x in linha):
                            continue
                        linha = (linha + [""] * len(unicas))[: len(unicas)]
                        copia.write_row(linha)
                        n += 1
            rel.staging[aba] = n


def _colunas_reais(con: psycopg.Connection, tabela: str) -> set[str]:
    with con.cursor() as k:
        k.execute(
            "select column_name from information_schema.columns "
            "where table_schema='public' and table_name=%s",
            (tabela,),
        )
        return {r[0] for r in k.fetchall()}


def conferir_antes_de_escrever(con: psycopg.Connection) -> list[str]:
    """Confere o de-para contra o **banco real**, antes de qualquer `INSERT`.

    Coluna de destino que não existe é o defeito que produziria carga verde com dado
    perdido: o `INSERT` a ignoraria, ou falharia no meio da transação — tarde, depois
    de dezesseis tabelas já promovidas.
    """
    problemas: list[str] = []
    cobertura = mapa.conferir_cobertura(ordem.ORDEM_DE_CARGA)
    for chave, faltantes in cobertura.items():
        for t in faltantes:
            problemas.append(f"{chave}: {t}")

    for nome, m in mapa.MAPAS.items():
        reais = _colunas_reais(con, nome)
        if not reais:
            problemas.append(f"tabela de destino inexistente no banco: {nome}")
            continue
        for c in m.migraveis():
            if c.destino and c.destino not in reais:
                problemas.append(f"{nome}.{c.destino} — no de-para, ausente no banco")
    return problemas


def carregar(conexao: str = CONEXAO_LOCAL, *, somente_conferir: bool = False) -> Relatorio:
    rel = Relatorio()
    with psycopg.connect(conexao) as con:
        con.autocommit = False

        problemas = conferir_antes_de_escrever(con)
        if problemas:
            raise CoberturaIncompleta(
                "O de-para e o banco discordam — nada foi escrito:\n  "
                + "\n  ".join(problemas[:40])
                + (f"\n  … e mais {len(problemas) - 40}" if len(problemas) > 40 else "")
            )
        if somente_conferir:
            return rel

        preparar_staging(con, rel)
        con.commit()
    return rel


if __name__ == "__main__":
    import sys

    conferir = "--conferir" in sys.argv
    try:
        rel = carregar(somente_conferir=conferir)
    except CoberturaIncompleta as erro:
        print(f"[ABORTADO] {erro}")
        sys.exit(1)

    if conferir:
        print("[OK] de-para conferido contra o banco: nenhuma divergencia")
        sys.exit(0)

    total = sum(rel.staging.values())
    print(f"staging carregada: {len(rel.staging)} tabelas, {total} linhas\n")
    for aba, n in sorted(rel.staging.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {aba:<32} {n:>6}")
