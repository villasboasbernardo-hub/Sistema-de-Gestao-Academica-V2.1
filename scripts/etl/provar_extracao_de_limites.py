"""Prova da extração do quadro final (spec 014, FR-001.1): os casos da M-8 e a contagem de 30.

Uso: python -m scripts.etl.provar_extracao_de_limites <dir_curriculos>
Sai com 1 se algum caso reprovar.
"""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.etl.extrair_avaliacoes_curriculo import extrair_limites

ESPERADO = {
    ("CAHO", "AEC"): 166, ("CAHO", "TR"): 166,
    ("C-Ap-HN", "AEC"): 65, ("C-Ap-HN", "TR"): 78,
    ("C-Ap-FR", "AEC"): 110, ("C-Ap-FR", "TR"): 126,
    ("C-Espc-HN", "TAD"): 62, ("C-Espc-FR", "TAD"): 62,
    ("C-Espc-HN", "TR"): 112, ("EST-QF-MAREFLU", "TR"): 4,
}
TOTAL_M8 = 30


def main(argv: list[str]) -> int:
    limites = {(x.curso_codigo, x.categoria): x for x in extrair_limites(Path(argv[1]))}
    falhas = [f"{k}: esperado {v}, obtido {limites[k].tempos if k in limites else 'ausente'}"
              for k, v in ESPERADO.items() if k not in limites or limites[k].tempos != v]
    if len(limites) != TOTAL_M8:
        falhas.append(f"total: esperado {TOTAL_M8}, obtido {len(limites)}")
    if any(x.pagina <= 0 or not x.arquivo for x in limites.values()):
        falhas.append("linha sem arquivo ou página")
    for f in falhas:
        print("REPROVA", f)
    print("APROVADA" if not falhas else f"{len(falhas)} falha(s)")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
