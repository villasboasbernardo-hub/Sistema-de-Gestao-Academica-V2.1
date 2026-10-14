"""Extrai dos currículos da DEnsM o quadro final (limites de AEC, TAD e TR) — spec 014.

Parte 1 (PR 1, FR-001.1, R-11, R-13): o QUADRO FINAL de cada currículo declara, em horas, as
ATIVIDADES EXTRACLASSE (AEC), o TEMPO RESERVA (TR) e, nos C-Espc, o TEMPO PARA ADMINISTRAÇÃO (TAD).
A saída é `scripts/etl/dados/limites_curriculo.csv`, uma linha por par declarado, com arquivo e
página. Horas = TA (premissa A-10, confirmada por Bernardo em 13/10/2026).

Parte 2 (PR 4): as seções de AVALIAÇÃO DA APRENDIZAGEM, para `avaliacoes_curriculo.csv`.

Dois formatos reais, medidos em 14/10/2026 nos 24 PDFs:
    "ATIVIDADES EXTRACLASSE……… 110 HORAS"          (na mesma linha; às vezes "ATIVIDADE EXTRACLASSE")
    "ATIVIDADES EXTRACLASSE" | "(AEC)" | "80 TA"    (C-Espc: tabela, uma célula por linha)

Nada aqui grava em banco: a saída é CSV para revisão humana (coluna `conferido`), e a migration de
dado é GERADA do CSV revisado por `gerar_carga_de_limites.py`.

Uso:
    python -m scripts.etl.extrair_avaliacoes_curriculo limites <dir_curriculos> [<csv_saida>]
"""

from __future__ import annotations

import csv
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit("PyMuPDF ausente. Instale com: pip install pymupdf")

RAIZ = Path(__file__).resolve().parents[2]
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"
SAIDA_PADRAO = RAIZ / "scripts" / "etl" / "dados" / "limites_curriculo.csv"

ROTULOS = {
    "AEC": re.compile(r"ATIVIDADES?\s+EXTRA\s*-?\s*CLASSES?"),
    "TR": re.compile(r"TEMPO\s+RESERVA"),
    "TAD": re.compile(r"TEMPO\s+PARA\s+(?:A\s+)?ADMINISTRACAO"),
}
RE_NA_LINHA = re.compile(r"[\.…\s]{2,}\s*0*(\d{1,4})\s*HORAS?\b")
RE_CELULA_TA = re.compile(r"^\s*0*(\d{1,4})\s*TA\s*$")


def normalizar(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().upper()


@dataclass(frozen=True)
class Limite:
    arquivo: str
    curso_codigo: str
    categoria: str
    tempos: int
    pagina: int


# Os dois C-Espc são currículos por COMPETÊNCIA, sem UE, e por isso não aparecem em `pareamento_ue.csv`
# (CLAUDE.md, catálogo de UEs: "2 currículos sem UE por natureza"). O par vem nominal.
SEM_UE = {
    "of10-82-2024-densm-ana-c-espc-fr.pdf": "C-Espc-FR",
    "of10-82-2024-densm-anb-c-espc-hn.pdf": "C-Espc-HN",
}


def curso_por_arquivo() -> dict[str, str]:
    """O par arquivo → curso já revisado na carga das UEs (spec 010), mais os dois C-Espc."""
    mapa: dict[str, str] = dict(SEM_UE)
    with PAREAMENTO.open(encoding="utf-8") as f:
        for linha in csv.DictReader(f, delimiter=";"):
            if linha["arquivo"] and linha["curso_codigo"]:
                mapa.setdefault(linha["arquivo"], linha["curso_codigo"])
    return mapa


def limites_do_pdf(caminho: Path, curso: str) -> list[Limite]:
    achados: dict[str, Limite] = {}
    doc = fitz.open(caminho)
    for indice, pagina in enumerate(doc):
        linhas = pagina.get_text().split("\n")
        for j, linha in enumerate(linhas):
            n = normalizar(linha)
            # O rótulo do TAD na tabela dos C-Espc quebra em duas linhas: "TEMPO PARA" / "ADMINISTRAÇÃO".
            if j > 0 and n.strip().startswith("ADMINISTRACAO") and normalizar(linhas[j - 1]).strip().endswith("TEMPO PARA"):
                n = "TEMPO PARA " + n
            for categoria, padrao in ROTULOS.items():
                if categoria in achados or not padrao.search(n):
                    continue
                m = RE_NA_LINHA.search(n[padrao.search(n).end():])
                if m:
                    achados[categoria] = Limite(caminho.name, curso, categoria, int(m.group(1)), indice + 1)
                    continue
                # Formato de tabela (C-Espc): "(SIGLA)" e "N TA" nas linhas seguintes.
                seguintes = [normalizar(x) for x in linhas[j + 1 : j + 4]]
                if any(f"({categoria})" in s for s in seguintes):
                    for s in seguintes:
                        c = RE_CELULA_TA.match(s)
                        if c:
                            achados[categoria] = Limite(caminho.name, curso, categoria, int(c.group(1)), indice + 1)
                            break
    return sorted(achados.values(), key=lambda x: ("AEC", "TAD", "TR").index(x.categoria))


def extrair_limites(dir_pdf: Path) -> list[Limite]:
    mapa = curso_por_arquivo()
    saida: list[Limite] = []
    for pdf in sorted(dir_pdf.glob("*.pdf")):
        curso = mapa.get(pdf.name)
        if curso is None:
            print(f"  (sem curso no pareamento: {pdf.name})", file=sys.stderr)
            continue
        saida.extend(limites_do_pdf(pdf, curso))
    return saida


def gravar(limites: list[Limite], destino: Path) -> None:
    with destino.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(["curso_codigo", "categoria", "tempos", "fonte_arquivo", "fonte_pagina", "conferido"])
        for x in sorted(limites, key=lambda x: (x.curso_codigo, x.categoria)):
            w.writerow([x.curso_codigo, x.categoria, x.tempos, x.arquivo, x.pagina, ""])


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "limites":
        print(__doc__)
        return 2
    destino = Path(argv[3]) if len(argv) > 3 else SAIDA_PADRAO
    limites = extrair_limites(Path(argv[2]))
    gravar(limites, destino)
    print(f"{len(limites)} limites em {len({x.curso_codigo for x in limites})} cursos -> {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
