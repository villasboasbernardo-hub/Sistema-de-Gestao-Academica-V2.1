-- =================================================================================
-- 136 — Spec 016, PR 3 · M2 (`20261019035110_janela_da_ch_prevista`): a JANELA da CH prevista do instrutor.
--
-- Q-7 (Bernardo Villas Boas, 17/10/2026): a janela da atribuição sai, nesta ordem, do período da LINHA DA TURMA, do
-- período da DISCIPLINA e da JANELA DA TURMA — inteira da primeira fonte que tem as duas datas (research R-4). Sem
-- nenhuma, o início que existir e sem término. `RN-INST-04`: o instrutor ATRIBUÍDO tem CH prevista no ano.
--
-- O caso que discrimina (DoD 8): antes da M2 a view tirava ano e janela só de `disciplinas.previsao_*`. Os casos 1, 2
-- e 4 saíam com `ano` nulo (e fora da CH prevista do ano), e o 3 com a janela da disciplina. Reprovam antes; passam
-- depois.
--
-- A semente: um curso com três disciplinas (D1 e D2 sem período no currículo, D3 com 01/06 a 31/07), uma turma T1
-- com janela (02/03 a 30/11/2047) e uma turma T2 SEM término. Criar a turma faz nascer as linhas de turma
-- (`trg_turmas_fazer_nascer_disciplinas`); a de D3 em T1 herda o período do currículo, e é trocada por outro.
-- =================================================================================
begin;
select plan(9);

select public.criar_curso_com_regime(
  '{"codigo":"T136-CUR","nome_curso":"Curso T136","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _t136 as select id as curso_id from public.cursos where codigo = 'T136-CUR';

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
                                previsao_inicio, previsao_termino) values
  ('13600000-0000-0000-0000-000000000001', 'T136-D1', (select curso_id from _t136), 'I',   'Disciplina T136 I',   40, null, null),
  ('13600000-0000-0000-0000-000000000002', 'T136-D2', (select curso_id from _t136), 'II',  'Disciplina T136 II',  40, null, null),
  ('13600000-0000-0000-0000-000000000003', 'T136-D3', (select curso_id from _t136), 'III', 'Disciplina T136 III', 40,
   '2047-06-01', '2047-07-31');
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('13620000-0000-0000-0000-000000000001', (select curso_id from _t136), 'T1', 2047, 'ativa', 'presencial',
   '2047-03-02', '2047-11-30'),
  ('13620000-0000-0000-0000-000000000002', (select curso_id from _t136), 'T2', 2047, 'ativa', 'presencial',
   '2047-03-02', null);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('13630000-0000-0000-0000-000000000001', 'T136-INS', 'CT', '-EF', 'Instrutor T136', 'Militar', 'CIAARA');

create temporary table _l136 as
  select td.id, td.turma_id, td.disciplina_id from public.turma_disciplina td
   where td.turma_id in ('13620000-0000-0000-0000-000000000001', '13620000-0000-0000-0000-000000000002');

-- Caso 1: D1 em T1 com período SÓ na linha da turma.
update public.turma_disciplina set previsao_inicio = '2047-04-01', previsao_termino = '2047-05-30', origem_periodo = 'manual'
 where turma_id = '13620000-0000-0000-0000-000000000001' and disciplina_id = '13600000-0000-0000-0000-000000000001';
-- Caso 3: D3 em T1 com período na linha DIFERENTE do da disciplina (que a linha herdou ao nascer).
update public.turma_disciplina set previsao_inicio = '2047-08-01', previsao_termino = '2047-09-30', origem_periodo = 'manual'
 where turma_id = '13620000-0000-0000-0000-000000000001' and disciplina_id = '13600000-0000-0000-0000-000000000003';
-- Caso 2: D2 em T1, sem período na linha nem na disciplina (a turma tem janela). Caso 4: D1 em T2, turma sem término.
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id)
select 'T136-TDI-' || row_number() over (order by l.turma_id, l.disciplina_id) || '#1', l.id,
       '13630000-0000-0000-0000-000000000001'
  from _l136 l
 where (l.turma_id, l.disciplina_id) in (
   ('13620000-0000-0000-0000-000000000001'::uuid, '13600000-0000-0000-0000-000000000001'::uuid),
   ('13620000-0000-0000-0000-000000000001'::uuid, '13600000-0000-0000-0000-000000000002'::uuid),
   ('13620000-0000-0000-0000-000000000001'::uuid, '13600000-0000-0000-0000-000000000003'::uuid),
   ('13620000-0000-0000-0000-000000000002'::uuid, '13600000-0000-0000-0000-000000000001'::uuid));

create temporary view _v136 as
  select p.turma_id, p.disciplina_id, p.ano, p.previsao_inicio, p.previsao_termino, p.tempos_previstos
    from public.vw_instrutor_carga_prevista p
   where p.instrutor_id = '13630000-0000-0000-0000-000000000001';

-- ── os casos que discriminam ──
select results_eq(
  $$select ano, previsao_inicio, previsao_termino from _v136
     where turma_id = '13620000-0000-0000-0000-000000000001' and disciplina_id = '13600000-0000-0000-0000-000000000001'$$,
  $$values (2047::smallint, '2047-04-01'::date, '2047-05-30'::date)$$,
  'Q-7 · caso 1 · período só na LINHA DA TURMA → ano e janela da linha (antes: ano nulo, fora do ano)'
);
select results_eq(
  $$select ano, previsao_inicio, previsao_termino from _v136
     where turma_id = '13620000-0000-0000-0000-000000000001' and disciplina_id = '13600000-0000-0000-0000-000000000002'$$,
  $$values (2047::smallint, '2047-03-02'::date, '2047-11-30'::date)$$,
  'Q-7 · caso 2 · sem período na linha nem na disciplina → ano e janela da TURMA (antes: ano nulo)'
);
select results_eq(
  $$select ano, previsao_inicio, previsao_termino from _v136
     where turma_id = '13620000-0000-0000-0000-000000000001' and disciplina_id = '13600000-0000-0000-0000-000000000003'$$,
  $$values (2047::smallint, '2047-08-01'::date, '2047-09-30'::date)$$,
  'Q-7 · caso 3 · linha da turma e disciplina com períodos diferentes → VENCE A LINHA (antes: 01/06 a 31/07)'
);
select results_eq(
  $$select ano, previsao_inicio, previsao_termino from _v136
     where turma_id = '13620000-0000-0000-0000-000000000002' and disciplina_id = '13600000-0000-0000-0000-000000000001'$$,
  $$values (2047::smallint, '2047-03-02'::date, null::date)$$,
  'R-4 · caso 4 · nenhuma fonte com as DUAS datas → o ano do início que existe, e SEM término (nada misturado)'
);
select is(
  (select ta_previsto_ano from public.vw_instrutor_carga_anual
    where instrutor_id = '13630000-0000-0000-0000-000000000001' and ano = 2047),
  160::numeric,
  'RN-INST-04 · FR-013.1 · a CH prevista do ANO conta as quatro atribuições, 4 × 40 (antes: só a do caso 3, 40)'
);

-- ── o que NÃO muda ──
select is(
  (select array_agg(tempos_previstos order by turma_id, disciplina_id) from _v136),
  array[40, 40, 40, 40]::numeric[],
  'FR-013.2 · o rateio não muda: um instrutor só na linha leva a CH inteira (cinco casos em rateio-da-view.test.ts)'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_instrutor_carga_prevista'::regclass and attnum > 0 and not attisdropped),
  array['atribuicao_id','instrutor_id','turma_disciplina_id','turma_id','disciplina_id','curso_id','nome_disciplina',
        'curso_codigo','turma_codigo','ano','previsao_inicio','previsao_termino','modo','instrutores_designados',
        'tempos_previstos','semanas','media_semanal'],
  'R-4 · as colunas são as MESMAS, na mesma ordem — é o que mantém a reversão por create or replace'
);
select is(
  (select array_agg(format_type(atttypid, atttypmod) order by attnum) from pg_attribute
    where attrelid = 'public.vw_instrutor_carga_prevista'::regclass and attnum in (10, 11, 12)),
  array['smallint', 'date', 'date'],
  'R-4 · ano, previsao_inicio e previsao_termino mantêm o tipo'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class
    where oid = 'public.vw_instrutor_carga_prevista'::regclass),
  'FR-013.2 · Gotcha 10 · a view recriada continua com security_invoker'
);

select * from finish();
rollback;
