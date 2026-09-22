"""Etapa 4-B — as correções de origem, aplicadas DEPOIS do retrato fiel.

O QUÊ  : lê a tabela de `dados/correcoes-de-origem.md` e aplica cada correção na linha
         que ela nomeia, dentro da mesma transação da promoção.

PARA QUÊ: o princípio de 08/09/2026 — *"o ETL é retrato fiel da origem, sem
         preenchimentos inventados"* — foi emendado em 22/09/2026: **ele restringe o
         ETL, não o responsável pelo dado**. Quando o responsável sabe o valor certo e
         a planilha ainda não o tem, a correção entra **aqui**, com data, valor velho,
         valor novo e origem nomeada — e **nunca** por inferência da máquina.

⚠️ **A EXTRAÇÃO E O `bruto/v20/` NÃO MUDAM.** Eles continuam fiéis à cópia datada de
   20/08/2026, que é o retrato que o `FR-008` exige e contra o qual todas as medições
   desta fatia foram feitas. A correção é uma **camada por cima**, e é por isso que ela
   sobrevive ao `pnpm db:reset`: ela é parte da carga, não do banco.

⚠️ **CORREÇÃO QUE NÃO ACHA O VALOR VELHO QUE DECLARA CORRIGIR ABORTA A CARGA.** Ela
   virou **no-op**, e no-op silencioso é o pior desfecho possível: quer dizer que a
   origem mudou — alguém corrigiu na planilha, ou o valor virou outro — e a carga
   seguiria reaplicando uma correção que já não corrige nada, escondendo a mudança.
   **Correção podre grita.** O erro nomeia a linha do arquivo, o que ela esperava e o
   que está lá.

⚠️ **E CADA APLICAÇÃO VIRA UM EVENTO `corrigido` EM `migracao_log`**, com o valor antes,
   o depois e o número da linha — a regra 5 do `CLAUDE.md` não admite reescrita
   silenciosa, e o rastro é o que distingue correção de aparição.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg import sql

ARQUIVO = Path(__file__).parent / "dados" / "correcoes-de-origem.md"
SECAO = "## Correções aplicadas pela carga"
COLUNAS = ("Data", "Tabela", "Registro", "Coluna", "De", "Para", "Origem")
VAZIO = "(vazio)"


class CorrecaoInvalida(RuntimeError):
    """A tabela do arquivo não descreve uma correção aplicável. Aborta antes de escrever."""


class CorrecaoObsoleta(RuntimeError):
    """A correção não achou o valor velho que declara corrigir. Aborta a carga."""


@dataclass(frozen=True)
class Correcao:
    linha: int          # a linha DESTE arquivo, que é o rastro
    data: str
    tabela: str
    registro: str       # o `codigo` da linha a corrigir
    coluna: str
    de: str | None      # None = a célula tem de estar vazia
    para: str
    origem: str

    def __str__(self) -> str:
        de = VAZIO if self.de is None else repr(self.de)
        return (
            f"correcoes-de-origem.md:{self.linha} · {self.tabela}.{self.coluna} "
            f"de {self.registro}: {de} -> {self.para!r} ({self.origem}, {self.data})"
        )


def ler(caminho: Path = ARQUIVO) -> list[Correcao]:
    """As correções declaradas no arquivo, na ordem em que aparecem.

    ⚠️ Lê **só** a tabela da seção nomeada em `SECAO`. O arquivo tem outras tabelas —
    o registro dos 24 valores informados, os pendentes de decisão — que são leitura
    humana e **não** são instruções para a máquina. Ler o arquivo inteiro faria a
    carga obedecer a um quadro de anotações.
    """
    if not caminho.exists():
        return []
    texto = caminho.read_text(encoding="utf-8").splitlines()
    try:
        inicio = next(i for i, l in enumerate(texto) if l.strip() == SECAO)
    except StopIteration:
        return []

    correcoes: list[Correcao] = []
    cabecalho_visto = False
    for numero in range(inicio + 1, len(texto)):
        linha = texto[numero].strip()
        if linha.startswith("## "):
            break                                  # começou outra seção
        if not linha.startswith("|"):
            continue
        celulas = [c.strip() for c in linha.strip("|").split("|")]
        if not cabecalho_visto:
            if tuple(celulas) == COLUNAS:
                cabecalho_visto = True
            continue
        if set("".join(celulas)) <= {"-", ":"}:     # a linha de tracos do cabeçalho
            continue
        if len(celulas) != len(COLUNAS):
            raise CorrecaoInvalida(
                f"correcoes-de-origem.md:{numero + 1} tem {len(celulas)} colunas, "
                f"e a tabela declara {len(COLUNAS)}: {linha}"
            )
        data, tabela, registro, coluna, de, para, origem = celulas
        if not para or para == VAZIO:
            raise CorrecaoInvalida(
                f"correcoes-de-origem.md:{numero + 1}: `Para` vazio. Esta camada corrige "
                f"valor, nunca APAGA — apagar é exclusão, e exclusão aqui é lógica (regra 4)."
            )
        correcoes.append(
            Correcao(numero + 1, data, tabela, registro, coluna,
                     None if de == VAZIO or de == "" else de, para, origem)
        )
    if cabecalho_visto and not correcoes:
        return []
    return correcoes


def _tipo_da_coluna(con: psycopg.Connection, tabela: str, coluna: str) -> str:
    with con.cursor() as k:
        k.execute(
            "select udt_name from information_schema.columns "
            "where table_schema = 'public' and table_name = %s and column_name = %s",
            (tabela, coluna),
        )
        linha = k.fetchone()
    if linha is None:
        raise CorrecaoInvalida(f"public.{tabela}.{coluna} não existe no banco")
    return linha[0]


def _valor_atual(con: psycopg.Connection, c: Correcao) -> str | None:
    with con.cursor() as k:
        k.execute(
            sql.SQL("select {}::text from public.{} where codigo = %s").format(
                sql.Identifier(c.coluna), sql.Identifier(c.tabela)
            ),
            (c.registro,),
        )
        linha = k.fetchone()
    return None if linha is None else linha[0]


def aplicar(con: psycopg.Connection, correcoes: list[Correcao] | None = None) -> list[Correcao]:
    """Aplica as correções e devolve as aplicadas. Qualquer recusa aborta a transação."""
    correcoes = ler() if correcoes is None else correcoes
    if not correcoes:
        return []

    aplicadas: list[Correcao] = []
    for c in correcoes:
        tipo = _tipo_da_coluna(con, c.tabela, c.coluna)
        # ⚠️ `is not distinct from` e não `=`: o valor velho pode ser NULO, e `= null`
        #    nunca é verdadeiro — a correção dos 13 cursos sem modalidade não aplicaria
        #    NENHUMA e a carga abortaria dizendo que todas estão obsoletas.
        comando = sql.SQL(
            "update public.{tabela} set {coluna} = %(para)s::{tipo} "
            " where codigo = %(registro)s and {coluna}::text is not distinct from %(de)s"
        ).format(
            tabela=sql.Identifier(c.tabela),
            coluna=sql.Identifier(c.coluna),
            tipo=sql.Identifier(tipo),
        )
        with con.cursor() as k:
            k.execute(comando, {"para": c.para, "registro": c.registro, "de": c.de})
            atingidas = k.rowcount
        if atingidas != 1:
            atual = _valor_atual(con, c)
            onde = (
                f"o registro {c.registro!r} não existe em public.{c.tabela}"
                if atual is None and _existe(con, c) is False
                else f"a coluna está em {atual!r}"
            )
            raise CorrecaoObsoleta(
                f"CORRECAO OBSOLETA — {c}\n"
                f"  Esperava encontrar {VAZIO if c.de is None else repr(c.de)}, e {onde}.\n"
                f"  A carga abortou de proposito: reaplicar uma correcao que nao corrige nada\n"
                f"  esconderia que a origem mudou. Conserte a linha do arquivo — apague-a se a\n"
                f"  origem ja esta certa, ou reescreva o `De` — e rode de novo."
            )
        aplicadas.append(c)

    _registrar(con, aplicadas)
    return aplicadas


def _existe(con: psycopg.Connection, c: Correcao) -> bool:
    with con.cursor() as k:
        k.execute(
            sql.SQL("select 1 from public.{} where codigo = %s").format(sql.Identifier(c.tabela)),
            (c.registro,),
        )
        return k.fetchone() is not None


def _registrar(con: psycopg.Connection, aplicadas: list[Correcao]) -> None:
    """Um evento `corrigido` por correção — com a linha do arquivo, que é o rastro."""
    if not aplicadas:
        return
    with con.cursor() as k:
        k.execute(
            "select coalesce(max(substring(codigo from 5)::bigint), 0) "
            "from public.migracao_log where codigo ~ '^LOG-[0-9]+$'"
        )
        proximo = int(k.fetchone()[0] or 0)
        for i, c in enumerate(aplicadas, start=1):
            k.execute(
                """
                insert into public.migracao_log
                  (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                   acao, regra_aplicada, valor_antes, valor_depois, observacao)
                values (%s, 'correcoes-de-origem.md', %s, %s, %s, 'corrigido', %s, %s, %s, %s)
                """,
                (
                    f"LOG-{proximo + i:06d}",
                    f"linha {c.linha}",
                    c.tabela,
                    c.registro,
                    f"Correcao de origem em {c.coluna}, informada por {c.origem} em {c.data}. "
                    f"O ETL transporta a origem fielmente; esta camada corrige por cima, "
                    f"com o valor velho conferido antes de escrever.",
                    VAZIO if c.de is None else c.de,
                    c.para,
                    f"correcoes-de-origem.md:{c.linha}",
                ),
            )
