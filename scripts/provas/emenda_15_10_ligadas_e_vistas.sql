-- O antes/depois da emenda de 15/10/2026 (spec 014): provas ligadas e vistas atrasadas pelas duas regras.
-- Lido por scripts/provas/medir_emenda_15_10.py. Só SELECT. Hoje fixo em 2026-10-15 (a data da medição).
\pset footer off
-- provas vivas DSAP- e ligadas
select count(*) filter (where a.avaliacao_curriculo_id is not null) as ligadas, count(*) as vivas
  from public.avaliacoes a where a.codigo like 'DSAP-%' and a.status in ('pendente','em_andamento','concluida','atrasada');
-- vistas atrasadas e vencendo, hoje = 2026-10-15, prazo 7, vence em breve = parametro
with base as (
  select a.codigo, t.codigo as turma, l.valor as instr, c.ta_vista, a.data_avaliacao,
         ('2026-10-15'::date - a.data_avaliacao) as dias
    from public.avaliacoes a
    join public.turmas t on t.id = a.turma_id
    join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
    join public.config_listas l on l.id = c.instrumento_id
   where a.status in ('pendente','em_andamento','concluida','atrasada')
     and a.data_avaliacao <= '2026-10-15'
     and coalesce(l.metadados->>'natureza','') <> 'od'
     and not exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = a.id and v.status = 'ativo'))
select 'regra antiga (ta_vista>0)' as regra,
       count(*) filter (where coalesce(ta_vista,0) > 0 and dias > 7) as atrasadas,
       count(*) filter (where coalesce(ta_vista,0) > 0 and dias <= 7 and dias >= 7 - (select coalesce(nullif(valor,'')::int,2) from public.config_parametros where chave='avaliacao.vence_em_breve_dias' limit 1)) as vencendo
  from base
union all
select 'RN-AV-13 (PM/PO)', count(*) filter (where instr in ('PM','PO') and dias > 7),
       count(*) filter (where instr in ('PM','PO') and dias <= 7 and dias >= 7 - (select coalesce(nullif(valor,'')::int,2) from public.config_parametros where chave='avaliacao.vence_em_breve_dias' limit 1))
  from base;
-- o detalhe das atrasadas pelas duas regras
with base as (
  select a.codigo, t.codigo as turma, d.cod_disciplina, l.valor as instr, c.numero, c.ta_vista, a.data_avaliacao,
         ('2026-10-15'::date - a.data_avaliacao) as dias
    from public.avaliacoes a
    join public.turmas t on t.id = a.turma_id
    join public.disciplinas d on d.id = a.disciplina_id
    join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
    join public.config_listas l on l.id = c.instrumento_id
   where a.status in ('pendente','em_andamento','concluida','atrasada')
     and a.data_avaliacao <= '2026-10-15'
     and coalesce(l.metadados->>'natureza','') <> 'od'
     and not exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = a.id and v.status = 'ativo'))
select turma, cod_disciplina, instr || ' ' || numero as item, ta_vista, data_avaliacao, dias,
       (coalesce(ta_vista,0) > 0) as antiga, (instr in ('PM','PO')) as nova
  from base where dias > 7 and (coalesce(ta_vista,0) > 0 or instr in ('PM','PO')) order by turma, data_avaliacao;
