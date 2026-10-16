"""O que Bernardo Villas Boas JÁ DECIDIU sobre a lista de erros (16/10/2026): o registro `decisoes-da-lista.json`.

A lista de erros por turma (`erros_por_turma`) e a lista «planilha diverge do sistema» (`sincronizar`) leem este
registro antes de pedir correção: o item decidido — «não é erro», «fato», «já resolvido», o aviso de tempo do TFM
(R8) e as divergências D1, D2, D6 e D8 — sai como INFORMAÇÃO, com «decidido em 16/10/2026 (ID)».

⚠️ O casamento é pelo TEXTO EXATO do gerador (turma + onde + o que a lista diz). Se o texto mudar, o item volta a
   pedir correção — e `erros_por_turma` imprime o que não casou, para quem confere decidir se o item sumiu (bom) ou
   só mudou de texto (registrar de novo).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

REGISTRO = Path(__file__).resolve().parent / "decisoes-da-lista.json"


@lru_cache(maxsize=1)
def carregar() -> dict:
    if not REGISTRO.exists():
        return {"itens": [], "r8_tfm": {"disciplinas": [], "contem": ""}, "divergencias": {}, "decidido_em": ""}
    return json.loads(REGISTRO.read_text(encoding="utf-8"))


def do_item(turma: str, onde: str, oque: str) -> dict | None:
    """O registro que decide este item da lista (com `id`, `decisao`), ou None."""
    r = carregar()
    for i in r["itens"]:
        if i["turma"] == turma and i["onde"] == onde and i["oque"] == oque:
            return i
    tfm = r.get("r8_tfm") or {}
    if tfm.get("contem") and tfm["contem"] in oque:
        for d in tfm.get("disciplinas", []):
            if d["turma"] == turma and onde.startswith(d["onde_comeca"]):
                return {"id": "R8", "decisao": "informação (TFM: corrida + natação divididas pela A4.7)"}
    return None


def da_divergencia(codigo: str) -> dict | None:
    return carregar().get("divergencias", {}).get(codigo)


def data() -> str:
    return carregar().get("decidido_em", "")
