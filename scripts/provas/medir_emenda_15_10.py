"""O antes/depois da emenda de 15/10/2026 a spec 014 (RN-AV-10 a RN-AV-14, RN-RESP-1) — so leitura.

    python -X utf8 -m scripts.provas.medir_emenda_15_10 planilhas-de-origem/rodadas/<carimbo> <pasta-dos-planos>

Le o banco LOCAL (`docker exec … psql`, so `select`) com `emenda_15_10_ligadas_e_vistas.sql` — provas ligadas e vistas
atrasadas pelas DUAS regras (o tempo de vista do item, de 14/10; o instrumento PM/PO, da RN-AV-13), com hoje fixo em
15/10/2026 no SQL —, os planos `plano-*.json` que `sincronizar --relatorio` grava (provas, sessoes seguintes, ligadas),
a lista por turma pelo gerador versionado, as pendencias e as provas sem casar da rodada. A pasta da rodada e os
planos ficam FORA do git."""
import glob
import json
import re
import subprocess
import sys
from pathlib import Path

R = Path(sys.argv[1])
PLANOS = Path(sys.argv[2])
AQUI = Path(__file__).parent  # o SQL mora ao lado


def psql(sql: str) -> list[list[str]]:
    saida = subprocess.run(["docker", "exec", "-i", "supabase_db_ciaara-11-v2-1", "psql", "-U", "postgres", "-At", "-F", "|"],
                           input=sql, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    return [l.split("|") for l in saida.splitlines() if l.strip()]


print("== banco local")
for linha in psql((AQUI / "emenda_15_10_ligadas_e_vistas.sql").read_text(encoding="utf-8")):
    print("  " + " | ".join(linha))

print("== provas no plano (depois): linhas, provas (RN-AV-12), ligadas")
linhas = provas = ligadas = sessoes_seguintes = 0
grupos = []
for f in sorted(glob.glob(str(PLANOS / "plano-*.json"))):
    p = json.load(open(f, encoding="utf-8"))
    for a in p["avaliacoes"]:
        linhas += 1
        if a.get("sessao_de"):
            sessoes_seguintes += 1
            continue
        provas += 1
        ligadas += bool(a.get("avaliacao_curriculo_id") or a.get("item"))
    grupos += [(p["turma"], g) for g in p.get("sessoes_de_aplicacao", [])]
print(f"  linhas {linhas} · sessoes seguintes {sessoes_seguintes} · provas {provas} · ligadas {ligadas}")
for t, g in grupos:
    print(f"    {t} {g['disciplina']} {g['cod']}: {len(g['datas'])} sessoes {g['datas'][0]}..{g['datas'][-1]} ({g['ta']} TA)")

print("== lista de erros por turma (gerador versionado)")
saida = subprocess.run([sys.executable, "-X", "utf8", "-m", "scripts.carga_dsa.erros_por_turma", str(R)], capture_output=True, text=True,
                       encoding="utf-8", check=True).stdout
a = i = 0
for l in saida.splitlines()[1:]:
    t, x, y = l.split("\t")
    a += int(x)
    i += int(y)
    print(f"  {t:<22} a corrigir {x:>4} · informação {y:>4}")
print(f"  TOTAL a corrigir {a} · informação {i}")

print("== pendencias de responsavel")
texto = (R / "pendencias-de-responsavel.md").read_text(encoding="utf-8")
primeira, _, segunda = texto.partition("## Responsavel de nome livre gravado")
print(f"  pendencias (responsavel_sem_decisao): {len([l for l in primeira.splitlines() if re.match(r'^\| \d+ \|', l)])}")
livres = [l for l in segunda.splitlines() if re.match(r"^\| \d+ \|", l)]
print(f"  nome livre gravado: {len(livres)} texto(s); com aula de disciplina com EO: {sum('SIM' in l for l in livres)}")
print("== provas sem casar")
sem = [l for l in (R / "provas-sem-casar.md").read_text(encoding="utf-8").splitlines() if l.startswith("| ") and not l.startswith("| turma")]
print(f"  {len(sem)} prova(s)")
porque: dict[str, int] = {}
for l in sem:
    m = l.split(" | ")[-1].rstrip(" |")
    chave = re.sub(r"«[^»]*»", "«…»", m)
    porque[chave] = porque.get(chave, 0) + 1
for k, v in sorted(porque.items(), key=lambda x: -x[1]):
    print(f"    {v:>3} {k}")
