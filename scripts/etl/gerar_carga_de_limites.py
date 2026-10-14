"""Gera a migration de DADO D-1 da spec 014 — os limites máximos dos 24 currículos.

    python -m scripts.etl.gerar_carga_de_limites > supabase/migrations/<ts>_limites_dos_24_curriculos.sql

Lê `scripts/etl/dados/limites_curriculo.csv` (revisado: coluna `conferido` preenchida em toda linha)
e escreve o SQL que insere em `limites_curriculo`. O arquivo gerado NUNCA é editado à mão: rodar o
gerador de novo dá o mesmo arquivo.

⚠️ Abstém-se, com aviso, em base sem cursos (é o caso do `db reset`); idempotente pelo índice único
parcial `limite_unico` (`on conflict … where status = 'ativo' do nothing`); asserção final dentro da
transação; evento em `migracao_log` só quando gravou linha. Recusa linha sem conferência, sem arquivo
ou sem página.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

CSV = Path(__file__).resolve().parents[2] / "scripts" / "etl" / "dados" / "limites_curriculo.csv"


def lit(valor: str) -> str:
    return "'" + valor.replace("'", "''") + "'"


def main() -> int:
    linhas = list(csv.DictReader(CSV.open(encoding="utf-8"), delimiter=";"))
    for n, l in enumerate(linhas, start=2):
        if not l["conferido"].strip():
            sys.exit(f"linha {n} sem conferência — revise o CSV antes de gerar")
        if not l["fonte_arquivo"] or not l["fonte_pagina"].isdigit() or not l["tempos"].isdigit():
            sys.exit(f"linha {n} sem arquivo, página ou tempos")
    out = sys.stdout
    p = lambda s="": out.write(s + "\n")  # noqa: E731
    p("-- =================================================================================")
    p("-- Spec 014, PR 1 · migration de DADO D-1 — limites máximos de AEC, TAD e TR dos 24 currículos")
    p("-- GERADA por `python -m scripts.etl.gerar_carga_de_limites` a partir de")
    p("-- `scripts/etl/dados/limites_curriculo.csv` (revisado). NÃO editar à mão.")
    p("--")
    p(f"-- {len(linhas)} linhas: o número que o quadro final de cada currículo declara, em TA (1 h = 1 TA,")
    p("-- premissa A-10), com arquivo e página (FR-001.1, Q-16). Curso sem linha cai no percentual da norma.")
    p("-- Abstém-se em base sem cursos; idempotente; evento em `migracao_log` só quando grava.")
    p("-- Reversão: `update limites_curriculo set status = 'inativo'` nas linhas com a procedência abaixo,")
    p("-- com evento novo em `migracao_log` (regra 5).")
    p("-- =================================================================================")
    p()
    p("do $$")
    p("declare")
    p("  v_cursos integer;")
    p("  v_inseridos integer;")
    p("  v_esperados integer;")
    p("begin")
    p("  select count(*) into v_cursos from public.cursos;")
    p("  if v_cursos = 0 then")
    p("    raise notice 'D-1 (spec 014): base sem cursos — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';")
    p("    return;")
    p("  end if;")
    p()
    p("  with dado (curso_codigo, categoria, tempos, fonte_arquivo, fonte_pagina) as (values")
    valores = [
        f"    ({lit(l['curso_codigo'])}, {lit(l['categoria'])}, {int(l['tempos'])}, {lit(l['fonte_arquivo'])}, {int(l['fonte_pagina'])})"
        for l in linhas
    ]
    p(",\n".join(valores))
    p("  ), ins as (")
    p("    insert into public.limites_curriculo (curso_id, categoria, tempos, fonte_arquivo, fonte_pagina, origem_migracao_v1)")
    p("    select c.id, d.categoria::public.categoria_normativa, d.tempos, d.fonte_arquivo, d.fonte_pagina,")
    p("           'spec014-D1:' || d.fonte_arquivo")
    p("      from dado d join public.cursos c on c.codigo = d.curso_codigo")
    p("    on conflict (curso_id, categoria) where status = 'ativo' do nothing")
    p("    returning 1")
    p("  )")
    p("  select count(*) into v_inseridos from ins;")
    p()
    p("  select count(*) into v_esperados")
    p("    from public.limites_curriculo l where l.status = 'ativo' and l.origem_migracao_v1 like 'spec014-D1:%';")
    p(f"  if v_esperados <> {len(linhas)} then")
    p(f"    raise exception 'D-1 (spec 014): esperava {len(linhas)} limites ativos com a procedência, há %', v_esperados;")
    p("  end if;")
    p()
    p("  if v_inseridos > 0 then")
    p("    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,")
    p("                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)")
    p("    values ('MLOG-014-D1-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'limites_curriculo.csv',")
    p("            'limites_curriculo', 'quadro final', 'adicionado'::public.acao_migracao, 'FR-001.1 / Q-16 (spec 014)',")
    p("            null, v_inseridos || ' limites',")
    p(f"            'Carga dos limites máximos de AEC, TAD e TR do quadro final dos currículos da DEnsM ({len(linhas)} pares declarados).');")
    p("  end if;")
    p("  raise notice 'D-1 (spec 014): % limite(s) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_esperados;")
    p("end;")
    p("$$;")
    return 0


if __name__ == "__main__":
    sys.exit(main())
