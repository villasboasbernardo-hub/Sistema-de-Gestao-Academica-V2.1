"""O coração do ETL: promoção `staging → public`, procedência e datas.

Toda tabela do sistema passa por aqui — o que garante que a política de resolução de
chave, de procedência e de conversão seja **exatamente a mesma** nas 25 tabelas, e não
25 variações parecidas. Variação parecida é o que produz o defeito que só aparece na
tabela que ninguém conferiu.

Fonte: documento 30 §2.6 · FR-002.1 · FR-018 · FR-019 · FR-019.1
"""

from __future__ import annotations

import re
import warnings
from datetime import date, datetime
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------------------------
# T005 — silenciar os avisos de tabela dinâmica órfã do openpyxl.
#
# Os sete .xlsx da v1.0 emitem `UserWarning: ... pivotCacheDefinition ... contains
# invalid dependency definitions` — dezenas por arquivo. São tabelas dinâmicas órfãs,
# INOFENSIVAS para a leitura de células. Silenciar é decisão consciente: o ruído
# esconderia um aviso que importasse. Silenciar, não investigar (research R-5).
# ---------------------------------------------------------------------------------
warnings.filterwarnings(
    "ignore",
    message=r".*contains invalid dependency definitions.*",
    module=r"openpyxl.*",
)

FUSO_BRASIL = ZoneInfo("America/Sao_Paulo")


# =================================================================================
# PROCEDÊNCIA — FR-002.1
# =================================================================================

_FORMATO_PROCEDENCIA = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*:.+$")


def procedencia(tabela_origem: str, chave_original: str) -> str:
    """Monta `origem_migracao_v1` no formato `<tabela_origem>:<chave_original>`.

    POR QUE FORMATO FIXO: esta coluna **deixou de ser auditoria**. O `CHECK` do
    FR-025.8 a usa para decidir se `registros_aula.unidade_ensino_id` pode ser nulo —
    logo o conteúdo dela afeta **correção**, não só rastro. Texto livre aqui é uma
    porta aberta que ninguém vê.

    Exemplo: `procedencia("Registros_Aula", "REG-001234")` → `Registros_Aula:REG-001234`
    """
    if not tabela_origem or not chave_original:
        raise ValueError(
            f"Procedência incompleta: tabela={tabela_origem!r}, chave={chave_original!r}. "
            f"Toda linha migrada tem origem nomeada (FR-002)."
        )
    valor = f"{tabela_origem}:{chave_original}"
    if not _FORMATO_PROCEDENCIA.match(valor):
        raise ValueError(
            f"Procedência fora do formato `<tabela_origem>:<chave_original>`: {valor!r}"
        )
    return valor


# =================================================================================
# DATAS — os DOIS caminhos, separados de propósito (FR-019, FR-019.1)
# =================================================================================


def data_civil(bruto: str) -> date:
    """Converte dia civil **sem tocar em fuso** — devolve `date`.

    ⚠️ É VEDADO aplicar conversão de fuso aqui (FR-019). Dia civil não tem fuso, e
    convertê-lo é PRECISAMENTE como se produz o deslocamento de um dia que o requisito
    existe para evitar: `2026-04-13` vira `2026-04-12T21:00-03:00`, que ao ser lido de
    volta como data vira 12 de abril. A aula muda de dia, a contagem continua batendo,
    e ninguém percebe.

    Aceita `YYYY-MM-DD` e `DD/MM/AAAA` — a planilha usa os dois.
    """
    texto = bruto.strip()
    if not texto:
        raise ValueError("Data civil vazia.")
    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    raise ValueError(
        f"Data civil fora dos formatos aceitos (`YYYY-MM-DD` ou `DD/MM/AAAA`): {texto!r}"
    )


def data_civil_literal(valor: date) -> str:
    """Serializa `date` como literal `YYYY-MM-DD`, para o `COPY` (FR-019)."""
    return valor.isoformat()


def formatar_para_leitura(valor: date) -> str:
    """`DD/MM/AAAA` — o formato brasileiro, para apresentação (FR-019.1).

    Não é usado pelo ETL; vive aqui para que o Épico 4 não reinvente a regra noutro
    lugar, com outro resultado.
    """
    return valor.strftime("%d/%m/%Y")


def instante(bruto: str) -> datetime:
    """Converte instante — este SIM leva fuso, `America/Sao_Paulo` (FR-019.1).

    O caminho é separado do `data_civil` de propósito. Um caminho só, "com fuso
    explícito", era a redação anterior do FR-019 — e era ela que autorizava aplicar
    fuso a um dia civil.
    """
    texto = bruto.strip()
    if not texto:
        raise ValueError("Instante vazio.")
    return datetime.fromisoformat(texto).replace(tzinfo=FUSO_BRASIL)


# =================================================================================
# CAMPO OBRIGATÓRIO SEM VALOR — FR-018.1
# =================================================================================


class ColunaObrigatoriaVazia(ValueError):
    """Coluna `NOT NULL` sem valor na origem. Aborta a carga, nomeando (FR-018.1)."""


def exigir(valor: str | None, *, tabela: str, coluna: str, registro: str) -> str:
    """Devolve o valor ou aborta nomeando registro e coluna.

    POR QUE NUNCA FABRICAR: preencher um `NOT NULL` com valor inventado é o
    "aproveitar e corrigir" que o documento 06 proíbe — e um valor fabricado é
    **indistinguível de dado real** depois. A lacuna dos cinco `NOT NULL` de
    `instrutores` (pendência D-08) é pendência OPERACIONAL: resolve-se na planilha,
    antes do corte, não no ETL.
    """
    if valor is None or not str(valor).strip():
        raise ColunaObrigatoriaVazia(
            f"{tabela}.{coluna} é obrigatória e está vazia no registro {registro!r}. "
            f"A carga para aqui. Corrija na planilha de origem — o ETL não inventa valor."
        )
    return str(valor).strip()
