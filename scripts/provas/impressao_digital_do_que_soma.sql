-- Spec 024 (Bloco 9, SC-005): a impressão digital de TUDO o que soma ou cruza lançamentos — o resultado de cada view e
-- função que a M2 passou a filtrar por `salvo`. Tira-se antes e depois da M2 (ou antes e depois da reversão), na mesma
-- cópia do remoto; o `diff` tem de ser vazio.
--   docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -At < scripts/provas/impressao_digital_do_que_soma.sql
-- O "hoje" das funções «até uma data» é fixo, para a medida ser reproduzível.
\set hoje '2026-10-23'
-- `ocupacao_para_conflitos` confere o alcance: lê-se como um Admin ativo (só leitura; serve ao cálculo, não à permissão).
select set_config('request.jwt.claim.sub',
  (select auth_user_id::text from public.usuarios
    where perfil = 'admin' and status = 'ativo' and auth_user_id is not null order by codigo limit 1), false) \g /dev/null
select 'vw_ocupacao_ta', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_ocupacao_ta x
union all
select 'vw_carga_horaria_turma', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_carga_horaria_turma x
union all
select 'vw_disciplinas_execucao', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_disciplinas_execucao x
union all
select 'vw_chd_por_fato', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_chd_por_fato x
union all
select 'vw_unidades_ensino_execucao', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_unidades_ensino_execucao x
union all
select 'vw_instrutor_carga_anual', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_instrutor_carga_anual x
union all
select 'vw_avaliacoes_situacao', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_avaliacoes_situacao x
union all
select 'vw_conformidade_tetos', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.vw_conformidade_tetos x
union all
select 'chd_da_turma_ate', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), ''))
  from public.chd_da_turma_ate(date :'hoje') x
union all
select 'ocupacao_para_conflitos', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), ''))
  from generate_series(date '2025-12-29', date '2026-12-28', interval '7 days') s(seg),
       lateral public.ocupacao_para_conflitos(s.seg::date, (s.seg + interval '6 days')::date) x
union all
select 'turma_tem_lancamento_no_dsa', count(*) filter (where app.turma_tem_lancamento_no_dsa(t.id)),
       md5(string_agg(t.id::text || app.turma_tem_lancamento_no_dsa(t.id)::text, '|' order by t.id))
  from public.turmas t
union all
select 'fn_status_vista', count(*), md5(coalesce(string_agg(a.id::text || coalesce(app.fn_status_vista(a.id, date :'hoje'), '-'), '|' order by a.id), ''))
  from public.avaliacoes a
order by 1;
