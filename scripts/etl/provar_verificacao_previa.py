"""Prova que as dez conferências do `FR-019.6` PEGAM — e que abortar não deixa nada atrás.

O QUÊ  : para cada uma das dez conferências, injeta na origem uma linha que ela deve
         recusar, e confere que ela recusa, nomeando a linha. Depois, prova o aborto
         **por comparação de contagens**, não por mensagem.

PARA QUÊ: conferência que nunca foi vista reprovando não é conferência, é decoração
         (`SC-011.6`). E *"abortou com saída 3"* prova que o programa **parou**, não que
         ele **não escreveu** — são afirmações diferentes, e só a segunda importa.

COMO   : `python -m scripts.etl.provar_verificacao_previa`
         Código de saída 0 = as dez pegam e o aborto não deixa rastro.

⚠️ **AS NOVE PRIMEIRAS PROVAS MEXEM NO `staging`, DENTRO DE UMA TRANSAÇÃO DESFEITA.** Não
   tocam nos CSV de origem, que são artefato versionado: corrompê-los para testar é o tipo
   de conserto que alguém esquece de desfazer.

⚠️ **A DÉCIMA NÃO TOCA EM `ordem.py`.** Ela monta uma ordem inválida em memória e a passa
   à conferência — mexer no arquivo real para provar que a conferência o lê é arriscar
   deixá-lo mexido.

⚠️ **E A PROVA DO ABORTO USA UMA CÓPIA DOS CSV, NÃO OS ORIGINAIS.** Ela precisa de uma
   origem de fato inválida, porque só assim o caminho percorrido é o caminho real —
   `preparar_staging` inclusive.
"""

from __future__ import annotations

import csv
import io
import shutil
import sys
import tempfile
from pathlib import Path

import psycopg

from . import carregar, ordem

CONEXAO = carregar.CONEXAO_LOCAL


# =================================================================================
# Utilidades
# =================================================================================
def _contagens(con: psycopg.Connection) -> dict[str, int]:
    """Quantas linhas há em CADA tabela de `public` e de `staging`, agora.

    ⚠️ **É ISTO QUE TRANSFORMA "nada foi escrito" EM AFIRMAÇÃO CONFERÍVEL.** Uma mensagem
    de aborto prova que o programa parou; só a comparação antes/depois prova que ele não
    deixou nada atrás. E a varredura é por **catálogo**, não por lista escrita à mão:
    tabela nova entra na conferência sozinha, que é o contrário de uma lista que envelhece.
    """
    with con.cursor() as k:
        k.execute(
            """
            select table_schema, table_name
              from information_schema.tables
             where table_schema in ('public', 'staging') and table_type = 'BASE TABLE'
             order by 1, 2
            """
        )
        tabelas = [(e, t) for e, t in k.fetchall()]
        contagem: dict[str, int] = {}
        for esquema, tabela in tabelas:
            k.execute(f'select count(*) from {esquema}."{tabela}"')
            contagem[f"{esquema}.{tabela}"] = int(k.fetchone()[0])
    return contagem


def _diferencas(antes: dict[str, int], depois: dict[str, int]) -> list[str]:
    fora: list[str] = []
    for chave in sorted(set(antes) | set(depois)):
        a, d = antes.get(chave), depois.get(chave)
        if a != d:
            fora.append(f"{chave}: {a} → {d}")
    return fora


def _nomes_das_conferencias() -> dict[int, str]:
    return {
        1: "curso sem vigencia Padrao ativa",
        2: "classificacao que o banco recusa",
        3: "curso sem duracao em dias",
        4: "turma sem modalidade",
        5: "sala sem correspondencia na lista",
        6: "rotulo fora da forma T<n>",
        7: "codigo de turma divergente",
        8: "rotulo repetido no mesmo curso e ano",
        9: "vigencia encerrada sem sucessora",
        10: "ordem de carga invertida",
    }


# =================================================================================
# T088 a T096 — as nove conferências que leem o `staging`
# =================================================================================
# (número, descrição do defeito injetado, SQL que o injeta)
DEFEITOS: tuple[tuple[int, str, str], ...] = (
    (
        1,
        "apaga a linha `Padrao` de um curso",
        """delete from staging."Cad_Cursos_Regime_Historico"
            where btrim(id_curso) = (select btrim(id_curso) from staging."Cad_Cursos"
                                      where coalesce(btrim(id_curso),'') <> '' order by 1 limit 1)
              and lower(btrim(tipo_regime)) = 'padrao'""",
    ),
    (
        2,
        "poe `EAD_Semipresencial` na classificacao de um curso",
        """update staging."Cad_Cursos" set classificacao = 'EAD_Semipresencial'
            where btrim(id_curso) = (select btrim(id_curso) from staging."Cad_Cursos"
                                      where coalesce(btrim(id_curso),'') <> '' order by 1 limit 1)""",
    ),
    (
        3,
        "esvazia a duracao em dias de um curso",
        """update staging."Cad_Cursos" set duracao_dias = ''
            where btrim(id_curso) = (select btrim(id_curso) from staging."Cad_Cursos"
                                      where coalesce(btrim(id_curso),'') <> '' order by 1 limit 1)""",
    ),
    (
        4,
        "esvazia a modalidade de uma turma",
        """update staging."Turmas_Ativas" set modalidade = ''
            where btrim(id_turma) = (select btrim(id_turma) from staging."Turmas_Ativas"
                                      where coalesce(btrim(id_turma),'') <> '' order by 1 limit 1)""",
    ),
    (
        5,
        "poe `Sala 05` numa turma — sala que nao existe no inventario",
        """update staging."Turmas_Ativas" set sala_alocada = 'Sala 05'
            where btrim(id_turma) = (select btrim(id_turma) from staging."Turmas_Ativas"
                                      where coalesce(btrim(id_turma),'') <> '' order by 1 limit 1)""",
    ),
    (
        6,
        "poe o rotulo `t1` em minuscula numa turma",
        """update staging."Turmas_Ativas" set turma = 't1'
            where btrim(id_turma) = (select btrim(id_turma) from staging."Turmas_Ativas"
                                      where coalesce(btrim(id_turma),'') <> '' order by 1 limit 1)""",
    ),
    (
        7,
        "poe o codigo `CAHO 2026 T1`, com o rotulo no fim",
        """update staging."Turmas_Ativas" set id_turma = 'CAHO 2026 T1'
            where btrim(id_turma) = 'CAHO 2026'""",
    ),
    (
        8,
        "duplica uma turma sem rotulo no mesmo curso e ano",
        """insert into staging."Turmas_Ativas"
            select * from staging."Turmas_Ativas"
             where coalesce(btrim(turma), '') = '' and coalesce(btrim(id_turma),'') <> ''
             order by btrim(id_turma) limit 1""",
    ),
    (
        9,
        "encerra uma vigencia ativa sem criar sucessora",
        """update staging."Cad_Cursos_Regime_Historico" set vigente_ate = '2026-06-30'
            where id_regime = (select id_regime from staging."Cad_Cursos_Regime_Historico"
                                where lower(btrim(status)) = 'ativo'
                                  and lower(btrim(tipo_regime)) = 'padrao'
                                  and coalesce(btrim(vigente_ate), '') = ''
                                order by 1 limit 1)""",
    ),
)


def provar_as_nove(con: psycopg.Connection) -> list[str]:
    """Cada defeito injetado, conferido e desfeito. Devolve a lista de problemas."""
    problemas: list[str] = []
    nomes = _nomes_das_conferencias()

    for numero, descricao, sql in DEFEITOS:
        with con.cursor() as k:
            k.execute("savepoint defeito")
            k.execute(sql)
            afetadas = k.rowcount
        if afetadas == 0:
            problemas.append(
                f"conferencia {numero}: o defeito '{descricao}' nao atingiu linha nenhuma — "
                f"a prova nao provaria nada"
            )
            with con.cursor() as k:
                k.execute("rollback to savepoint defeito")
            continue

        falhas, _ = carregar.verificacao_previa(con)
        pegas = [f for f in falhas if f.conferencia == numero]

        if not pegas:
            outras = sorted({f.conferencia for f in falhas})
            problemas.append(
                f"conferencia {numero} ({nomes[numero]}) NAO PEGOU o defeito '{descricao}'. "
                f"Conferencias que reagiram: {outras or 'nenhuma'}"
            )
        else:
            print(f"  [ok] conferencia {numero:>2} pegou: {pegas[0].linha} — {descricao}")

        with con.cursor() as k:
            k.execute("rollback to savepoint defeito")

    return problemas


# =================================================================================
# T097 — a décima, sem tocar em `ordem.py`
# =================================================================================
def provar_a_decima() -> list[str]:
    invertida = tuple(
        t for t in ordem.ORDEM_DE_CARGA if t not in ("turmas", "disciplinas")
    )
    posicao = list(invertida)
    posicao.insert(posicao.index("instrutores"), "disciplinas")
    posicao.append("turmas")

    falhas = carregar._c10_ordem_de_carga(tuple(posicao))
    if not falhas:
        return [
            "conferencia 10 NAO PEGOU uma ordem com `disciplinas` antes de `turmas` — "
            "a precedencia do FR-032.2 passaria despercebida"
        ]
    print(f"  [ok] conferencia 10 pegou: {falhas[0].detalhe}")

    # Controle positivo: a ordem REAL tem de passar. Sem ele, uma conferência que
    # reprovasse tudo pareceria funcionar.
    if carregar._c10_ordem_de_carga():
        return ["conferencia 10 reprova a ordem REAL de `ordem.py` — ela recusa tudo"]
    print("  [ok] conferencia 10 · controle positivo: a ordem real de `ordem.py` passa")
    return []


# =================================================================================
# A prova do ABORTO — por comparação, não por mensagem
# =================================================================================
def provar_que_o_aborto_nao_escreve() -> list[str]:
    """Roda a carga com origem inválida e compara as contagens antes e depois.

    ⚠️ **"ABORTOU COM SAÍDA 3" PROVA QUE PAROU, NÃO QUE NÃO ESCREVEU** (exigência de
    Bernardo Villas Boas, 18/09/2026). As duas afirmações são diferentes, e só a segunda
    é a promessa do `FR-029.8`. Esta prova conta **todas** as tabelas de `public` e de
    `staging` antes e depois e exige que sejam **idênticas**, tabela por tabela.
    """
    problemas: list[str] = []

    with psycopg.connect(CONEXAO) as con:
        con.autocommit = True
        antes = _contagens(con)

    with tempfile.TemporaryDirectory() as temporario:
        copia = Path(temporario) / "v20"
        shutil.copytree(carregar.BRUTO, copia)

        # O defeito na origem COPIADA: uma sala que não existe no inventário.
        alvo = copia / "Turmas_Ativas.csv"
        linhas = list(csv.DictReader(io.open(alvo, encoding="utf-8", newline="")))
        for linha in linhas:
            if linha.get("ID_Turma", "").strip():
                linha["Sala_Alocada"] = "Sala 99"
                break
        with io.open(alvo, "w", encoding="utf-8", newline="") as h:
            escritor = csv.DictWriter(h, fieldnames=list(linhas[0].keys()))
            escritor.writeheader()
            escritor.writerows(linhas)

        original = carregar.BRUTO
        carregar.BRUTO = copia
        try:
            carregar.carregar(CONEXAO)
            problemas.append(
                "a carga NAO abortou com uma sala fora do inventario — "
                "a verificacao previa nao esta no caminho"
            )
        except carregar.CoberturaIncompleta as erro:
            if "conferencia 5" not in str(erro):
                problemas.append(
                    f"a carga abortou, mas nao pela conferencia 5: {str(erro)[:200]}"
                )
            else:
                print("  [ok] a carga abortou, nomeando a conferencia 5 e a turma")
        finally:
            carregar.BRUTO = original

    with psycopg.connect(CONEXAO) as con:
        con.autocommit = True
        depois = _contagens(con)

    fora = _diferencas(antes, depois)
    if fora:
        problemas.append(
            "O ABORTO DEIXOU RASTRO — estas tabelas mudaram de contagem:\n    "
            + "\n    ".join(fora)
        )
    else:
        print(
            f"  [ok] aborto sem rastro: as {len(antes)} tabelas de `public` e `staging` "
            f"tem a MESMA contagem antes e depois"
        )
    return problemas


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=" * 74)
    print("PROVA DAS DEZ CONFERENCIAS PREVIAS (FR-019.6, SC-011.6)")
    print("=" * 74)

    problemas: list[str] = []

    with psycopg.connect(CONEXAO) as con:
        con.autocommit = False
        rel = carregar.Relatorio()
        carregar.preparar_staging(con, rel)

        # Controle positivo: com a origem REAL, nenhuma conferência bloqueante reprova.
        # Sem ele, uma verificação que recusasse tudo passaria em todas as nove provas.
        falhas, avisos = carregar.verificacao_previa(con)
        if falhas:
            problemas.append(
                "CONTROLE POSITIVO FALHOU: a origem real ja reprova — "
                + "; ".join(str(f) for f in falhas[:5])
            )
        else:
            print("  [ok] controle positivo: a origem real passa nas dez")
        for aviso in avisos:
            print(f"  (aviso) {aviso[:150]}…")

        print()
        problemas.extend(provar_as_nove(con))
        con.rollback()

    print()
    problemas.extend(provar_a_decima())

    print()
    print("PROVA DO ABORTO — por comparacao de contagens, nao por mensagem")
    problemas.extend(provar_que_o_aborto_nao_escreve())

    print()
    if problemas:
        print(f"[REPROVADO] {len(problemas)} problema(s):")
        for p in problemas:
            print(f"  - {p}")
        return 1
    print("[APROVADO] as dez conferencias pegam, e o aborto nao deixa nada atras.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
