-- O antes/depois das correções da lista de erros de 16/10/2026 (noite) — SÓ SELECT (spec 014).
-- Rodar com `python -X utf8 -m scripts.provas.medir_no_remoto scripts/provas/lista_16_10_medidas.sql [local|remoto]`.
-- Hoje fixo em 2026-10-16 (a data das decisões), prazo de vista 7 (o parâmetro do banco).
--
-- 1. provas: as avaliações VIVAS da sincronização (DSAP-), quantas ligadas a item do currículo.
-- 2. vistas atrasadas pela regra de 16/10/2026 (`app.fn_status_vista`), com o detalhe.
-- 3. TA e CHT por turma, de `vw_carga_horaria_turma` (CHT = CHD + AEC + TAD + TR).
-- 4. a distribuição por UE das aulas da C-Ap-FR e da Ag-Mag (R1).
-- 5. as sugestões da planilha ativas sem valor (PEND-014-11).
with vivas as (
  select a.* from public.avaliacoes a
   where a.codigo like 'DSAP-%' and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select 'provas' as medida, count(*) as vivas,
       count(*) filter (where avaliacao_curriculo_id is not null) as ligadas,
       count(*) filter (where avaliacao_curriculo_id is null and instrumento_id is not null) as sem_item_com_instrumento,
       count(*) filter (where avaliacao_curriculo_id is null and instrumento_id is null) as sem_item_sem_instrumento
  from vivas;

select t.codigo as turma, d.cod_disciplina, coalesce(li.valor || ' ' || c.numero, lo.valor || ' (sem item)') as prova,
       a.data_avaliacao, a.codigo
  from public.avaliacoes a
  join public.turmas t on t.id = a.turma_id
  join public.disciplinas d on d.id = a.disciplina_id
  left join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
  left join public.config_listas li on li.id = c.instrumento_id
  left join public.config_listas lo on lo.id = a.instrumento_id
 where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
   and a.data_avaliacao <= '2026-10-16'
   and (a.avaliacao_curriculo_id is not null or a.instrumento_id is not null)
   and coalesce(li.metadados ->> 'natureza', lo.metadados ->> 'natureza', '') <> 'od'
   and app.fn_status_vista(a.id, '2026-10-16') = 'atrasada'
 order by t.codigo, a.data_avaliacao;

select turma_codigo, ta_aula, ta_avaliacao, ta_vista_prova, chd_executada, ta_aec, ta_tad, ta_tr, cht_executada,
       ta_apoio_individualizado, ta_estudo_individual
  from public.vw_carga_horaria_turma
 where turma_codigo in ('CAHO 2026', 'C-Ap-HN 2026', 'C-Ap-FR 2026', 'C-Espc-HN 2026', 'C-Espc-FR 2026', 'C-Esp-ME 2026',
                        'C-Exp-MetocOf 2026', 'C-Exp-BATI T1 2026', 'C-Exp-Ag-Mag 2026', 'C-Exp-Obs-ME 2026')
 order by turma_codigo;

select t.codigo as turma, d.cod_disciplina, u.numero_ue, sum(r.tempos_consumidos) as ta, count(*) as aulas
  from public.registros_aula r
  join public.turmas t on t.id = r.turma_id
  join public.unidades_ensino u on u.id = r.unidade_ensino_id
  join public.disciplinas d on d.id = u.disciplina_id
 where t.codigo in ('C-Ap-FR 2026', 'C-Exp-Ag-Mag 2026') and r.status = 'ativo'
 group by 1, 2, 3
 order by 1, 2, 3;

select 'sugestoes sem valor' as medida, count(*) as ativas
  from public.avaliacoes_curriculo_turma
 where origem = 'sugestao_planilha' and status = 'ativo' and confirmado_em is null
   and ta_aplicacao is null and ta_vista is null;
