"""Prova da extração das avaliações do currículo (spec 014, T126, FR-030, FR-037).

Os quatro casos da T126, conferidos contra o que o PDF DIZ (medido em 14/10/2026 no texto do PyMuPDF):
  - C-Ap-HN, HN-2101 (`c-ap-hn.pdf`, p. 9): a 4ª PM, "referente à UE 7. Serão utilizados 2 (dois) TA para a
    aplicação e 1 (um) TA para a realização dos comentários e vista da prova, computados na UE 7";
  - C-Exp-MetocOf, METOC-I (`c-exp-metocof_0.pdf`, p. 6): "uma Prova Mista (PM) com duração de três (03) TA,
    abordando todas as UE; e … um (01) TA para a vista de provas" — sem UE computada;
  - C-Exp-Obs-ME, DHN-0225 (`c-exp-obs-me_0_0.pdf`, p. 6): "uma Prova Escrita Objetiva (PE) sobre as UE 1 a 4;
    e … (PE) sobre a UE 5" — duas PE, sem tempo;
  - C-Espc-HN, MATEMÁTICA APLICADA À HIDROGRAFIA, HN-1104-0808 (`of10-82-2024-densm-anb-c-espc-hn.pdf`,
    p. 14): "4 (quatro) TA para a aplicação e 1 (um) TA para … vista de prova", "CH DA AVALIAÇÃO 5".
E as invariantes do CSV: toda linha com arquivo e página (`avc_fonte_se_curriculo`), instrumento da lista da
§3.2 ou `conferir`, numeração por instrumento sem buraco, e o EST-QF-APOC sem número.

Uso: python -m scripts.etl.provar_extracao_de_avaliacoes <dir_curriculos>
Sai com 1 se algum caso reprovar.
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

from scripts.etl.extrair_avaliacoes_curriculo import SIGLAS_VALIDAS, extrair_avaliacoes


def main(argv: list[str]) -> int:
    itens, por_curso = extrair_avaliacoes(Path(argv[1]))
    falhas: list[str] = []

    def da(curso: str, cod: str) -> list:
        return [x for x in itens if x.curso_codigo == curso and x.disciplina_cod == cod]

    def confere(rotulo: str, obtido: object, esperado: object) -> None:
        if obtido != esperado:
            falhas.append(f"{rotulo}: esperado {esperado!r}, obtido {obtido!r}")

    # 1. C-Ap-HN HN-2101, UE 7: PM 2 + vista 1, p. 9 (o código do PDF já é o UNIFICADO: uma disciplina só)
    hn = da("C-Ap-HN", "HN-2101-0621")
    confere("HN-2101: itens", [(x.instrumento, x.numero) for x in hn], [("PM", 1), ("PM", 2), ("PM", 3), ("PM", 4)])
    ue7 = [x for x in hn if x.ue_computada == "7"]
    confere("HN-2101 UE 7: (aplicação, vista, página, instrumento)",
            [(x.ta_aplicacao, x.ta_vista, x.pagina, x.instrumento) for x in ue7], [(2, 1, 9, "PM")])

    # 2. C-Exp-MetocOf: PM 3 + vista 1, sem UE
    metoc = da("C-Exp-MetocOf", "METOC-I")
    confere("MetocOf METOC-I: (instrumento, aplicação, vista, UE)",
            [(x.instrumento, x.ta_aplicacao, x.ta_vista, x.ue_computada) for x in metoc], [("PM", 3, 1, "")])

    # 3. C-Exp-Obs-ME DHN-0225: duas PE, sem tempo
    obs = da("C-Exp-Obs-ME", "DHN-0225")
    confere("Obs-ME DHN-0225: (instrumento, número, aplicação, vista)",
            [(x.instrumento, x.numero, x.ta_aplicacao, x.ta_vista) for x in obs], [("PE", 1, None, None), ("PE", 2, None, None)])

    # 4. C-Espc-HN MATEMÁTICA: 4 + 1, CH da avaliação 5
    mat = da("C-Espc-HN", "HN-1104-0808")
    confere("C-Espc-HN MAT: (instrumento, aplicação, vista)", [(x.instrumento, x.ta_aplicacao, x.ta_vista) for x in mat], [("PM", 4, 1)])
    ch = [d.ch_avaliacao for d in por_curso.get("C-Espc-HN", []) if d.codigo == "HN-1104-0808"]
    confere("C-Espc-HN MAT: CH DA AVALIAÇÃO", ch, [5])

    # Invariantes do CSV
    for x in itens:
        if not x.arquivo or x.pagina <= 0:
            falhas.append(f"linha sem arquivo ou página: {x.curso_codigo} {x.disciplina_cod} {x.ordem}")
        if x.instrumento not in SIGLAS_VALIDAS and not x.conferido.startswith("conferir"):
            falhas.append(f"instrumento {x.instrumento!r} fora da lista sem 'conferir': {x.curso_codigo} {x.disciplina_cod}")
    numeros: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    for x in itens:
        numeros[(x.curso_codigo, x.disciplina_cod, x.instrumento)].append(x.numero)
    for chave, ns in numeros.items():
        if ns != list(range(1, len(ns) + 1)):
            falhas.append(f"numeração com buraco ou repetição em {chave}: {ns}")
    apoc = [x for x in itens if x.curso_codigo == "EST-QF-APOC"]
    if not apoc or any(x.ta_aplicacao is not None or x.ta_vista is not None or "digitalizado" not in x.conferido for x in apoc):
        falhas.append("EST-QF-APOC: esperado 'conferir: PDF digitalizado' sem número")

    for f in falhas:
        print("REPROVA", f)
    print("APROVADA" if not falhas else f"{len(falhas)} falha(s)")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
