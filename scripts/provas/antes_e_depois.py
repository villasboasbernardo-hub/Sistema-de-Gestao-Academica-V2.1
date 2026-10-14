"""O antes/depois de uma migration de DADO, para a aprovação de Bernardo (spec 014, R-15).

    python -m scripts.provas.antes_e_depois <migration.sql> <contagens.sql> <saida.md> [--copia <arquivo>]

Roda, no banco LOCAL (o contêiner Docker `supabase_db_*` desta máquina — nunca outro destino):
    1. as contagens de `<contagens.sql>`;
    2. o corpo da migration, numa transação;
    3. as contagens de novo;
    4. ROLLBACK — o local termina como estava.

Pré-condição, que é do operador e fica escrita no relatório: o local foi recriado pelas migrations
da `main`, restaurado da cópia do remoto (`python -m scripts.manutencao.dado_do_remoto`) e recebeu, por
cima, as migrations do ramo ANTERIORES à medida (`supabase migration up --local` até ela). Assim o
antes/depois mede o dado real, e nunca dado de antes de uma migration de estrutura num esquema de
depois dela.

⚠️ `setval` não obedece a ROLLBACK (gotcha 6): migration de dado desta spec não chama `setval`. `nextval`
consumido na transação desfeita é inofensivo (a sequência só avança).

Cada consulta de `<contagens.sql>` é separada por uma linha `-- @ <título>`.
"""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime
from pathlib import Path

SEPARADOR = "-- @ "


def conteiner_local() -> str:
    saida = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, check=True)
    nomes = [n for n in saida.stdout.split() if n.startswith("supabase_db_")]
    if len(nomes) != 1:
        sys.exit(f"porteiro: esperava exatamente um contêiner local supabase_db_*, há {nomes!r}")
    return nomes[0]


def consultas(caminho: Path) -> list[tuple[str, str]]:
    blocos: list[tuple[str, str]] = []
    titulo, corpo = None, []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if linha.startswith(SEPARADOR):
            if titulo:
                blocos.append((titulo, "\n".join(corpo)))
            titulo, corpo = linha[len(SEPARADOR):].strip(), []
        else:
            corpo.append(linha)
    if titulo:
        blocos.append((titulo, "\n".join(corpo)))
    return blocos


def psql(conteiner: str, script: str) -> str:
    r = subprocess.run(
        ["docker", "exec", "-i", conteiner, "psql", "-U", "postgres", "-d", "postgres", "-X", "-q",
         "-v", "ON_ERROR_STOP=1", "-P", "pager=off", "-P", "footer=off", "--csv"],
        input=script, capture_output=True, text=True, encoding="utf-8",
    )
    if r.returncode != 0:
        sys.exit(f"psql falhou:\n{r.stderr}")
    return r.stdout


def tabela_md(csv_texto: str) -> str:
    linhas = [l.split(",") for l in csv_texto.strip().splitlines() if l.strip()]
    if not linhas:
        return "*(nenhuma linha)*\n"
    out = ["| " + " | ".join(linhas[0]) + " |", "|" + "---|" * len(linhas[0])]
    out += ["| " + " | ".join(l) + " |" for l in linhas[1:]]
    return "\n".join(out) + "\n"


def main(argv: list[str]) -> int:
    if len(argv) < 4:
        print(__doc__)
        return 2
    migration, contagens, saida = Path(argv[1]), Path(argv[2]), Path(argv[3])
    copia = argv[argv.index("--copia") + 1] if "--copia" in argv else "[informar a cópia]"
    conteiner = conteiner_local()
    blocos = consultas(contagens)
    marca = "\\echo ===BLOCO===\n"
    antes_sql = "".join(marca + c + ";\n" for _, c in blocos)
    script = (antes_sql + "begin;\n" + migration.read_text(encoding="utf-8") + "\n"
              + antes_sql + "rollback;\n")
    partes = psql(conteiner, script).split("===BLOCO===")[1:]
    n = len(blocos)
    antes, depois = partes[:n], partes[n:]
    md = [f"# Antes/depois — `{migration.name}`\n",
          f"Medido em {datetime.now():%d/%m/%Y %H:%M} no banco **local** (`{conteiner}`), restaurado da cópia "
          f"`{copia}`, com as migrations anteriores do ramo aplicadas. A migration rodou numa transação "
          "**desfeita** (ROLLBACK): nada ficou gravado.\n",
          "**Aprovação de Bernardo:** [pendente]\n"]
    for (titulo, _), a, d in zip(blocos, antes, depois):
        md += [f"\n## {titulo}\n", "**Antes**\n", tabela_md(a), "\n**Depois**\n", tabela_md(d)]
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text("\n".join(md), encoding="utf-8", newline="\n")
    print(f"relatório -> {saida}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
