"""A conta das provas vivas da planilha numa rodada da sincronização, em categorias EXCLUSIVAS (spec 014).

    python -X utf8 -m scripts.provas.conta_das_provas_da_rodada planilhas-de-origem/rodadas/<carimbo>

Lê o banco LOCAL (só leitura, `docker exec … psql`) — que deve ser a cópia do remoto depois da rodada — e a lista
`erros-de-planilha.md` da rodada. Cada avaliação viva `DSAP-` cai em UMA categoria, pela ordem:

    1 ligada a item · 2 OD · 3 editada na tela · 4 disciplina sem avaliação do currículo (A4.7)
    · 5 prova a mais · 6 não casa · 7 sem par na planilha atual

⚠️ A lista de erros conta LINHAS da planilha, e o banco conta AVALIAÇÕES carregadas: uma linha de "não casa" de
   prova posterior à virada da turma não tem avaliação no banco (a rodada não a carrega), e é ela que fazia as
   categorias somarem mais que as vivas. O script imprime essas linhas à parte.
"""

from __future__ import annotations

import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

CONTAINER = "supabase_db_ciaara-11-v2-1"
SQL = """
select t.codigo, coalesce(d.cod_disciplina,'?'), a.data_avaliacao, a.codigo, (a.avaliacao_curriculo_id is not null),
 exists(select 1 from avaliacoes_curriculo ac where ac.disciplina_id=a.disciplina_id and ac.status='ativo'),
 (upper(coalesce(a.tipo_avaliacao,'')) like '%OBSERVA%' or upper(coalesce(a.conteudo_resumo,'')) like '%OBSERVA%DESEMPENHO%'),
 a.editado_por is not null, replace(coalesce(a.conteudo_resumo,''),'|','/')
from avaliacoes a join turmas t on t.id=a.turma_id left join disciplinas d on d.id=a.disciplina_id
where a.codigo like 'DSAP-%' and a.status in ('pendente','em_andamento','concluida','atrasada')
"""


def normal(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper().replace(" ", "")


def main() -> int:
    rodada = Path(sys.argv[1])
    saida = subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-At", "-F", "|"],
                           input=SQL, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    vivas = [l.split("|") for l in saida.splitlines() if l.strip()]

    linhas, turma = [], None
    for l in (rodada / "erros-de-planilha.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"## (.+)", l)
        if m:
            turma = m.group(1).strip()
            continue
        m = re.search(r"\| — \| (\S+) (\S+) de (\d{4}-\d{2}-\d{2}): (.*?) \|", l)
        if not m or "vista" in m.group(4):
            continue
        d, sig, data, oque = m.groups()
        cat = ("nao casa" if "nao casa" in oque else "a mais" if "prova a mais" in oque
               else "disciplina sem item" if "nao tem avaliacao do curriculo carregada" in oque else None)
        if cat:
            linhas.append({"turma": turma, "d": d, "sig": sig, "data": data, "cat": cat})

    por_codigo: dict[str, set[str]] = defaultdict(set)
    sem_banco = []
    for L in linhas:
        cands = [v for v in vivas if v[0] == L["turma"] and v[1] == L["d"] and v[2] == L["data"]]
        if len(cands) > 1:
            cands = [v for v in cands if normal(v[8]).startswith(normal(L["sig"]))] or cands
        if not cands:
            sem_banco.append(L)
        for v in cands:
            por_codigo[v[3]].add(L["cat"])

    conta: Counter[str] = Counter()
    for turma_, d, data, cod, lig, tem, od, ed, _ in vivas:
        cats = por_codigo.get(cod, set())
        if lig == "t":
            k = "1 ligada a item do currículo"
        elif od == "t":
            k = "2 OD (contínua, não se liga a item)"
        elif ed == "t":
            k = "3 editada na tela (a tela vence)"
        elif tem == "f":
            k = "4 disciplina sem avaliação do currículo (A4.7)"
        elif "a mais" in cats:
            k = "5 prova a mais"
        elif "nao casa" in cats:
            k = "6 não casa com item da disciplina"
        else:
            k = "7 sem par na planilha atual"
        conta[k] += 1
    for k in sorted(conta):
        print(f"{conta[k]:>4}  {k}")
    print(f"{sum(conta.values()):>4}  TOTAL de avaliações vivas DSAP- no banco")
    print(f"\nlinhas da lista de erros sem avaliação no banco ({len(sem_banco)}):")
    for L in sem_banco:
        print(f"  {L['turma']} {L['d']} {L['sig']} {L['data']} — {L['cat']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
