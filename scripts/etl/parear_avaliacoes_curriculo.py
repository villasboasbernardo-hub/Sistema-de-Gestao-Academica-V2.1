"""Preenche, em `avaliacoes_curriculo.csv`, a disciplina de DESTINO de cada item (spec 014, T127).

    python -m scripts.etl.parear_avaliacoes_curriculo [--banco local]

O código e o nome da disciplina no PDF nem sempre são os do banco (os C-Ap usam `FR-2205-1014` no currículo e
`V` no banco; o extrator corta nomes longos). A coluna `destino_disciplina_codigo` guarda o `disciplinas.codigo`
do banco, e é ELA que a migration D-4 usa — o casamento fica escrito, revisável e versionado, e a migration não
adivinha nada. Ordem das regras, a primeira que dá UM resultado vale:

  1. `pareamento_ue.csv` (revisado na spec 010): o mesmo curso e o mesmo nome de disciplina do currículo;
  2. o nome normalizado (sem acento, sem ponto final) igual ao do banco, no mesmo curso;
  3. o código do currículo igual ao `cod_disciplina` do banco, no mesmo curso (os C-Espc);
  4. um nome é começo do outro (o extrator cortou), no mesmo curso, com ao menos duas palavras.

O que não casa fica com `destino_disciplina_codigo` vazio e `conferir: disciplina sem destino no banco`.
⚠️ Lê o banco LOCAL (só `select`), que deve estar com as migrations D-5 e D-6 aplicadas — os nomes e códigos
   corrigidos por elas são o destino.
"""

from __future__ import annotations

import csv
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CSV = RAIZ / "scripts" / "etl" / "dados" / "avaliacoes_curriculo.csv"
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"
MARCA = "conferir: disciplina sem destino no banco"


def norm(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", t).strip().rstrip(".").strip()


def banco() -> list[tuple[str, str, str, str]]:
    sql = ("select c.codigo, d.codigo, d.cod_disciplina, d.nome_disciplina from public.disciplinas d "
           "join public.cursos c on c.id = d.curso_id where d.status = 'ativo'")
    saida = subprocess.run(["docker", "exec", "supabase_db_ciaara-11-v2-1", "psql", "-U", "postgres", "-At", "-F", "\t", "-c", sql],
                           capture_output=True, text=True, encoding="utf-8", check=True).stdout
    return [tuple(l.split("\t")) for l in saida.splitlines() if l.strip()]  # type: ignore[misc]


def main() -> int:
    linhas = list(csv.DictReader(CSV.open(encoding="utf-8"), delimiter=";"))
    campos = list(linhas[0].keys())
    if "destino_disciplina_codigo" not in campos:
        campos.insert(3, "destino_disciplina_codigo")
    disc = banco()
    ativos = {d[1] for d in disc}
    par: dict[tuple[str, str], set[str]] = {}
    for l in csv.DictReader(PAREAMENTO.open(encoding="utf-8"), delimiter=";"):
        if l["destino_disciplina_codigo"] in ativos:
            par.setdefault((l["curso_codigo"], norm(l["curriculo_disciplina"])), set()).add(l["destino_disciplina_codigo"])

    def achar(curso: str, cod: str, nome: str) -> str | None:
        regras = [
            par.get((curso, norm(nome)), set()),
            {d[1] for d in disc if d[0] == curso and norm(d[3]) == norm(nome)},
            {d[1] for d in disc if d[0] == curso and re.sub(r"\s", "", d[2]) == re.sub(r"\s", "", cod)},
            {d[1] for d in disc if d[0] == curso and len(norm(nome).split()) >= 2
             and (norm(d[3]).startswith(norm(nome)) or norm(nome).startswith(norm(d[3])))},
        ]
        for achados in regras:
            if len(achados) == 1:
                return next(iter(achados))
        return None

    sem = 0
    for l in linhas:
        destino = achar(l["curso_codigo"], l["disciplina_cod"], l["disciplina_nome"])
        l["destino_disciplina_codigo"] = destino or ""
        marcas = [m for m in (l["conferido"] or "").split(" | ") if m and m != MARCA]
        if destino is None:
            sem += 1
            marcas.append(MARCA)
        l["conferido"] = " | ".join(marcas)
    with CSV.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";", lineterminator="\n")
        w.writeheader()
        w.writerows(linhas)
    print(f"{len(linhas)} itens; {len(linhas) - sem} com destino; {sem} sem destino")
    return 0


if __name__ == "__main__":
    sys.exit(main())
