"""Etapa 1-B — extração da Unidade de Ensino, das planilhas da v1.0.

O QUÊ  : lê `PREENCHIMENTO` e `BD DISCIPLINAS` dos 7 arquivos autorizados e grava
         `dados/bruto/ue_v1/<curso>__<aba>.csv` com **colunas nomeadas** e proveniência.

PARA QUÊ: a v2.0 nunca guardou a Unidade de Ensino dos seus 1.566 registros. O dado
         existe nestas planilhas, e este módulo o recupera. É o escopo ampliado
         autorizado por Bernardo em 07/09/2026.

⚠️ A ARMADILHA DO `PREENCHIMENTO`, medida em 08/09/2026 e que custou uma reescrita:

    L3   |            | DATA       | TA  | COD | Nº U.E |
    L6   |            | 2026-04-13 | 3º  | PL  | 4.0    |
    L7   | ALT Nº     | SEG        | 4º  | PL  | 4.0    |
    L8   |            |            | 5º  | PL  | 4.0    |

    A **data é esparsa**: aparece uma vez e vale para o BLOCO de linhas abaixo, até a
    próxima. É célula mesclada — layout visual, não tabular. E o dia da semana (`SEG`)
    cai na MESMA coluna.

    Primeira versão deste módulo achatava a linha e indexava posição. Resultado: 69%
    dos registros caíram em `sem_fonte` — não porque faltasse dado, mas porque a data
    saía vazia ou como "SEG". O número era sintoma de defeito de leitura, não achado.

    A correção é *forward-fill* da data e descarte do dia da semana.

Contrato: `specs/003-etl-sheets-postgresql/contracts/cruzamento-ue.md`
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import openpyxl

from . import _comum  # noqa: F401  — silencia os avisos de pivotCache
from . import snapshot

RAIZ = Path(r"C:\Users\VILLAS BOAS\OneDrive\Documentos\CIAARA-11-v2.1")
DESTINO = Path(__file__).parent / "dados" / "bruto" / "ue_v1"


@dataclass(frozen=True)
class Fonte:
    caminho: Path
    curso: str


# Lista FECHADA (contrato §As fontes). Arquivo fora dela não é lido — nem se aparecer.
#   · `C-AP-HN 2026.xlsx` está FORA: vale só a `Cópia … Sabado` (achado A-2).
#   · `CAHO_2026.xlsx` está DENTRO como fonte de transporte; segue rejeitada como
#     padrão-ouro de não regressão (10/08/2026). Papéis distintos.
FONTES: tuple[Fonte, ...] = (
    Fonte(RAIZ / "Cursos Regulares" / "C-AP-FR 2026.xlsx", "C-Ap-FR"),
    Fonte(RAIZ / "Cursos Regulares" / "C-ESPC-HN 2026.xlsx", "C-Espc-HN"),
    Fonte(RAIZ / "Cursos Regulares" / "CAHO_2026.xlsx", "CAHO"),
    Fonte(RAIZ / "Cursos Regulares" / "Cópia de C-AP-HN 2026 - Sabado.xlsx", "C-Ap-HN"),
    Fonte(RAIZ / "Cursos Regulares" / "ESPC-FR 2026.xlsx", "C-Espc-FR"),
    Fonte(
        RAIZ / "Cursos Especiais-20260908T022148Z-1-001" / "Cursos Especiais" / "C-ESP-ME 2026.xlsx",
        "C-ESP-ME",
    ),
    Fonte(RAIZ / "C-EXP-METOC-OF T01_26.xlsx", "C-Exp-METOC-OF"),
)

# Colunas 1-based, medidas arquivo a arquivo (research §R-5).
COL_PREENCHIMENTO = {"data": 2, "ta_ordinal": 3, "cod": 4, "numero_ue": 5, "ta_qtd": 6, "descricao": 7}
COL_BD_DISCIPLINAS = {"cod": 1, "disciplina": 2, "numero_ue": 3, "nome_ue": 5, "ch": 6, "local": 7, "instrutor": 9}
PRIMEIRA_LINHA = {"PREENCHIMENTO": 4, "BD DISCIPLINAS": 3}

DIAS_DA_SEMANA = frozenset({"SEG", "TER", "QUA", "QUI", "SEX", "SAB", "SÁB", "DOM"})
ROTULOS = frozenset({"COD", "CÓD", "Nº U.E", "N° U.E", "DATA", "TA", "DISCIPLINA"})

# Códigos que NÃO são disciplina (FR-025.10). Marcados aqui, no lado da v1.0 — que é
# onde o requisito os situa: "lançamento cujo código não é disciplina".
CODIGOS_NAO_DISCIPLINA = frozenset({"AD", "FE", "PL", "TR", "TE", "LP"})

_NUM_SUFIXO = re.compile(r"^(\d+)(?:[.,]0+)?([A-Za-zÀ-ÿ]*)$")


def normalizar_ue(bruto: object) -> tuple[int | None, str]:
    """`1P` → `(1, "P")`, `4.0` → `(4, "")` (FR-025.9).

    `numero_ue` no destino é `smallint`; a origem grava `1P` em 439 lançamentos. O
    sufixo marca a parte prática da mesma UE e vai para `migracao_log` como
    proveniência — não se perde, e não impede o casamento.
    """
    if bruto is None:
        return None, ""
    achado = _NUM_SUFIXO.match(str(bruto).strip())
    if not achado:
        return None, ""
    return int(achado.group(1)), achado.group(2).upper()


def _talvez_data(bruto: object) -> date | None:
    """Reconhece data; devolve `None` para dia da semana, rótulo e vazio."""
    if bruto is None:
        return None
    if isinstance(bruto, datetime):
        return bruto.date()
    if isinstance(bruto, date):
        return bruto
    texto = str(bruto).strip()
    if not texto or texto.upper() in DIAS_DA_SEMANA or texto.upper() in ROTULOS:
        return None
    for formato in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(texto[:19], formato).date()
        except ValueError:
            continue
    return None


def _celula(linha: tuple, coluna_1based: int) -> str:
    indice = coluna_1based - 1
    if indice >= len(linha) or linha[indice] is None:
        return ""
    return str(linha[indice]).strip()


def extrair(destino: Path = DESTINO) -> tuple[snapshot.Snapshot, dict[str, dict[str, int]]]:
    destino.mkdir(parents=True, exist_ok=True)
    resumo: dict[str, dict[str, int]] = {}
    conteudo: list[bytes] = []

    for fonte in FONTES:
        if not fonte.caminho.exists():
            raise FileNotFoundError(
                f"Fonte autorizada ausente: {fonte.caminho}\n"
                f"A lista é FECHADA — não se troca arquivo por outro parecido sem decisão."
            )
        livro = openpyxl.load_workbook(fonte.caminho, read_only=True, data_only=True)
        conta = {"com_ue": 0, "nao_disciplina": 0, "sem_data": 0, "sem_ue": 0, "disciplinas": 0, "com_sufixo": 0}

        # ---- PREENCHIMENTO, com forward-fill da data ----
        if "PREENCHIMENTO" in livro.sheetnames:
            arquivo = destino / f"{fonte.curso}__lancamentos.csv"
            data_corrente: date | None = None
            with arquivo.open("w", encoding="utf-8", newline="") as saida:
                escritor = csv.writer(saida)
                escritor.writerow(
                    ["curso_sigla", "data", "ta_ordinal", "cod", "numero_ue", "sufixo_ue",
                     "e_disciplina", "descricao", "arquivo", "aba", "linha"]
                )
                for indice, linha in enumerate(livro["PREENCHIMENTO"].iter_rows(values_only=True), start=1):
                    if indice < PRIMEIRA_LINHA["PREENCHIMENTO"]:
                        continue
                    achada = _talvez_data(linha[COL_PREENCHIMENTO["data"] - 1] if len(linha) > 1 else None)
                    if achada:
                        data_corrente = achada  # abre um novo bloco de dia

                    cod = _celula(linha, COL_PREENCHIMENTO["cod"]).upper()
                    if not cod or cod in ROTULOS:
                        continue
                    numero, sufixo = normalizar_ue(_celula(linha, COL_PREENCHIMENTO["numero_ue"]))
                    e_disciplina = cod not in CODIGOS_NAO_DISCIPLINA

                    if not e_disciplina:
                        conta["nao_disciplina"] += 1
                    if data_corrente is None:
                        conta["sem_data"] += 1
                    if numero is None:
                        conta["sem_ue"] += 1
                    if e_disciplina and data_corrente and numero is not None:
                        conta["com_ue"] += 1
                        if sufixo:
                            conta["com_sufixo"] += 1

                    escritor.writerow(
                        [fonte.curso,
                         data_corrente.isoformat() if data_corrente else "",
                         _celula(linha, COL_PREENCHIMENTO["ta_ordinal"]),
                         cod,
                         "" if numero is None else numero,
                         sufixo,
                         "1" if e_disciplina else "0",
                         _celula(linha, COL_PREENCHIMENTO["descricao"])[:60],
                         fonte.caminho.name, "PREENCHIMENTO", indice]
                    )
            conteudo.append(arquivo.read_bytes())

        # ---- BD DISCIPLINAS ----
        if "BD DISCIPLINAS" in livro.sheetnames:
            arquivo = destino / f"{fonte.curso}__disciplinas.csv"
            with arquivo.open("w", encoding="utf-8", newline="") as saida:
                escritor = csv.writer(saida)
                escritor.writerow(
                    ["curso_sigla", "cod", "disciplina", "numero_ue", "sufixo_ue",
                     "nome_ue", "ch", "local", "instrutor", "arquivo", "aba", "linha"]
                )
                for indice, linha in enumerate(livro["BD DISCIPLINAS"].iter_rows(values_only=True), start=1):
                    if indice < PRIMEIRA_LINHA["BD DISCIPLINAS"]:
                        continue
                    cod = _celula(linha, COL_BD_DISCIPLINAS["cod"]).upper()
                    if not cod or cod in ROTULOS:
                        continue
                    numero, sufixo = normalizar_ue(_celula(linha, COL_BD_DISCIPLINAS["numero_ue"]))
                    escritor.writerow(
                        [fonte.curso, cod,
                         _celula(linha, COL_BD_DISCIPLINAS["disciplina"]),
                         "" if numero is None else numero, sufixo,
                         _celula(linha, COL_BD_DISCIPLINAS["nome_ue"]),
                         _celula(linha, COL_BD_DISCIPLINAS["ch"]),
                         _celula(linha, COL_BD_DISCIPLINAS["local"]),
                         _celula(linha, COL_BD_DISCIPLINAS["instrutor"]),
                         fonte.caminho.name, "BD DISCIPLINAS", indice]
                    )
                    conta["disciplinas"] += 1
            conteudo.append(arquivo.read_bytes())

        livro.close()
        resumo[fonte.curso] = conta

    marca = snapshot.gerar("planilhas de planejamento v1.0 (7 arquivos)", b"".join(conteudo))
    marca.gravar(destino)
    return marca, resumo


if __name__ == "__main__":
    marca, resumo = extrair()
    print(f"snapshot {marca.identificador} · {len(resumo)} cursos\n")
    print(f"{'curso':<17}{'com UE':>8}{'nao-disc':>10}{'sem data':>10}{'sem UE':>8}{'discipl':>9}{'sufixo':>8}")
    total = {k: 0 for k in ("com_ue", "nao_disciplina", "sem_data", "sem_ue", "disciplinas", "com_sufixo")}
    for curso, c in resumo.items():
        print(f"{curso:<17}{c['com_ue']:>8}{c['nao_disciplina']:>10}{c['sem_data']:>10}{c['sem_ue']:>8}{c['disciplinas']:>9}{c['com_sufixo']:>8}")
        for k in total:
            total[k] += c[k]
    print(f"{'TOTAL':<17}{total['com_ue']:>8}{total['nao_disciplina']:>10}{total['sem_data']:>10}{total['sem_ue']:>8}{total['disciplinas']:>9}{total['com_sufixo']:>8}")
