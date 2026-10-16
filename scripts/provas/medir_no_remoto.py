"""Roda um arquivo de medição SÓ DE LEITURA no remoto (ou no local), consulta por consulta — e imprime cada resultado.

    python -X utf8 -m scripts.provas.medir_no_remoto <arquivo.sql> [local|remoto]

A CLI do Supabase (`supabase db query --linked -f`) devolve só o resultado da ÚLTIMA instrução de um arquivo. Este
script separa o arquivo nas instruções (pelo `;` no fim da linha), roda cada uma pelo mesmo canal da sincronização
(`scripts.carga_dsa.banco.consultar`, que recusa destino que não seja `local` ou `remoto`) e imprime as linhas com `|`.

⚠️ SÓ `select` (e `with … select`): instrução que não comece assim é RECUSADA antes de ir ao banco. Medir não escreve.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from scripts.carga_dsa import banco


def instrucoes(texto: str) -> list[str]:
    sem_comentario = "\n".join(l for l in texto.splitlines() if not l.lstrip().startswith("--"))
    return [x.strip() for x in re.split(r";\s*\n", sem_comentario) if x.strip()]


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    arquivo = Path(sys.argv[1])
    destino = sys.argv[2] if len(sys.argv) > 2 else "remoto"
    for sql in instrucoes(arquivo.read_text(encoding="utf-8")):
        if not re.match(r"(?is)^\s*(select|with)\b", sql) or re.search(r"(?i)\b(insert|update|delete|truncate|alter|drop|create)\b", sql):
            print(f"[RECUSADO] não é só leitura: {sql[:80]}…")
            return 2
        for linha in banco.consultar(destino, sql):
            print("|".join("" if v is None else str(v) for v in linha.values()))
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
