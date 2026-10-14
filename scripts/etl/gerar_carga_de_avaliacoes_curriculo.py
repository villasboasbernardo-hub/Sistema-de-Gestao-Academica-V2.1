"""Gera a migration de DADO D-4 da spec 014 — as avaliações dos 24 currículos.

    python -m scripts.etl.gerar_carga_de_avaliacoes_curriculo > supabase/migrations/<ts>_avaliacoes_dos_24_curriculos.sql

Lê `scripts/etl/dados/avaliacoes_curriculo.csv` (extraído por `extrair_avaliacoes_curriculo avaliacoes` e pareado
com o banco por `parear_avaliacoes_curriculo`) e escreve o SQL que:
  1. semeia `config_listas.instrumentos_avaliacao` (data-model §3.2), que roda mesmo em base vazia;
  2. insere os itens em `avaliacoes_curriculo`, com origem `curriculo`, arquivo e página.

⚠️ SÓ ENTRA A LINHA SEM `conferir`. A linha marcada (instrumento ambíguo, PT, sem destino no banco, sem tempo
   legível, PDF digitalizado…) fica FORA e é contada no cabeçalho — vai a Bernardo no antes/depois, nunca é
   decidida pela máquina. O arquivo gerado NUNCA é editado à mão: rodar o gerador de novo dá o mesmo arquivo.
⚠️ Abstém-se, com aviso, em base sem cursos; idempotente pelo índice parcial `avc_numero_unico`; a asserção
   final confere a quantidade de itens com a procedência; evento em `migracao_log` só quando grava.
"""

from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

CSV = Path(__file__).resolve().parents[2] / "scripts" / "etl" / "dados" / "avaliacoes_curriculo.csv"

# data-model §3.2: sigla → (rótulo, natureza)
INSTRUMENTOS = {
    "PE": ("Prova Escrita", "prova"),
    "PM": ("Prova Mista", "prova"),
    "PP": ("Prova Prática", "prova"),
    "PO": ("Prova Oral", "prova"),
    "PD": ("Prova Discursiva", "prova"),
    "TG": ("Trabalho em Grupo", "trabalho"),
    "TI": ("Trabalho Individual", "trabalho"),
    "EC": ("Estudo de caso", "trabalho"),
    "PJ": ("Projeto", "trabalho"),
    "MN": ("Monografia", "trabalho"),
    "OD": ("Observação de Desempenho", "od"),
}


def lit(valor: object) -> str:
    if valor is None or valor == "":
        return "null"
    return "'" + str(valor).replace("'", "''") + "'"


def num(valor: str) -> str:
    return valor if valor and valor.strip().isdigit() else "null"


def main() -> int:
    linhas = list(csv.DictReader(CSV.open(encoding="utf-8"), delimiter=";"))
    entram = [l for l in linhas if "conferir" not in (l.get("conferido") or "") and l.get("destino_disciplina_codigo")
              and l["instrumento"] in INSTRUMENTOS and l["fonte_arquivo"] and l["fonte_pagina"].isdigit()]
    fora = len(linhas) - len(entram)
    motivos = Counter((l.get("conferido") or "sem conferência").split(":")[0] if l not in entram else "" for l in linhas)
    out = sys.stdout
    p = lambda s="": out.write(s + "\n")  # noqa: E731
    p("-- =================================================================================")
    p("-- Spec 014, PR 4 · migration de DADO D-4 — as avaliações dos 24 currículos da DEnsM")
    p("-- GERADA por `python -m scripts.etl.gerar_carga_de_avaliacoes_curriculo` a partir de")
    p("-- `scripts/etl/dados/avaliacoes_curriculo.csv`. NÃO editar à mão.")
    p("--")
    p(f"-- {len(linhas)} itens extraídos; ENTRAM {len(entram)} (sem `conferir`, com disciplina de destino, instrumento da")
    p(f"-- lista e página); FICAM FORA {fora}, marcados para a decisão de Bernardo (antes/depois da D-4).")
    p("-- Roda DEPOIS da D-5 e da D-6: os itens apontam para a disciplina já corrigida e unificada.")
    p("-- Abstém-se em base sem cursos (a lista de instrumentos entra sempre); idempotente; evento em")
    p("-- `migracao_log` só quando grava. Reversão: os itens com a procedência `spec014-D4:` ficam `inativo`.")
    p("-- =================================================================================")
    p()
    p("-- 1. a lista de instrumentos (domínio operacional: `config_listas`, nunca ENUM)")
    p("insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados)")
    p("values")
    p(",\n".join(f"  ('instrumentos_avaliacao', {lit(s)}, {lit(r)}, {i}, jsonb_build_object('natureza', {lit(n)}))"
                 for i, (s, (r, n)) in enumerate(INSTRUMENTOS.items(), start=1)))
    p("on conflict (lista, valor) do nothing;")
    p()
    p("-- 2. os itens")
    p("do $$")
    p("declare")
    p("  v_inseridos integer;")
    p("  v_ativos integer;")
    p("begin")
    p("  if not exists (select 1 from public.cursos) then")
    p("    raise notice 'D-4 (spec 014): base sem cursos — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';")
    p("    return;")
    p("  end if;")
    p()
    p("  with dado (disciplina, ordem, instrumento, numero, ue, ues_abordadas, ta_aplicacao, ta_vista, fonte_arquivo, fonte_pagina) as (values")
    p(",\n".join(
        f"    ({lit(l['destino_disciplina_codigo'])}, {int(l['ordem'])}, {lit(l['instrumento'])}, {int(l['numero'])}, "
        f"{num(l['ue_computada'])}::smallint, {lit(l['ues_abordadas'])}, {num(l['ta_aplicacao'])}::smallint, "
        f"{num(l['ta_vista'])}::smallint, {lit(l['fonte_arquivo'])}, {int(l['fonte_pagina'])})"
        for l in entram))
    p("  ), ins as (")
    p("    insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id,")
    p("                                             origem_ue, ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista,")
    p("                                             origem_ta_vista, origem_item, fonte_arquivo, fonte_pagina, origem_migracao_v1)")
    p("    select d.id, d.curso_id, x.ordem, i.id, x.numero, u.id, case when u.id is not null then 'curriculo' end,")
    p("           x.ues_abordadas, x.ta_aplicacao, case when x.ta_aplicacao is not null then 'curriculo' end, x.ta_vista,")
    p("           case when x.ta_vista is not null then 'curriculo' end, 'curriculo', x.fonte_arquivo, x.fonte_pagina,")
    p("           'spec014-D4:' || x.fonte_arquivo")
    p("      from dado x")
    p("      join public.disciplinas d on d.codigo = x.disciplina and d.status = 'ativo'")
    p("      join public.config_listas i on i.lista = 'instrumentos_avaliacao' and i.valor = x.instrumento")
    p("      left join public.unidades_ensino u on u.disciplina_id = d.id and u.numero_ue = x.ue and u.status = 'ativo'")
    p("    on conflict (disciplina_id, instrumento_id, numero) where status = 'ativo' do nothing")
    p("    returning 1")
    p("  )")
    p("  select count(*) into v_inseridos from ins;")
    p()
    p("  select count(*) into v_ativos from public.avaliacoes_curriculo where status = 'ativo' and origem_migracao_v1 like 'spec014-D4:%';")
    p(f"  if v_ativos <> {len(entram)} then")
    p(f"    raise exception 'D-4 (spec 014): esperava {len(entram)} itens ativos com a procedência, há % (disciplina ou UE sem destino?)', v_ativos;")
    p("  end if;")
    p("  if exists (select 1 from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id")
    p("              where a.status = 'ativo' group by d.id, d.carga_horaria_tempos")
    p("             having sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) > d.carga_horaria_tempos) then")
    p("    raise exception 'D-4 (spec 014): há disciplina com avaliação do currículo acima da CH (FR-031.2).';")
    p("  end if;")
    p("  if v_inseridos > 0 then")
    p("    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,")
    p("                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)")
    p("    values ('MLOG-014-D4-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'avaliacoes_curriculo.csv',")
    p("            'avaliacoes_curriculo', 'por disciplina', 'adicionado'::public.acao_migracao, 'FR-030 / R-13 (spec 014, D-4)',")
    p(f"            null, v_inseridos || ' itens', 'Avaliações dos currículos da DEnsM ({len(entram)} itens; {fora} ficaram para decisão).');")
    p("  end if;")
    p("  raise notice 'D-4 (spec 014): % item(ns) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_ativos;")
    p("end;")
    p("$$;")
    print(f"-- motivos de fora: {dict(m for m in motivos.items() if m[0])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
