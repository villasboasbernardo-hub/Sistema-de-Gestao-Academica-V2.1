-- =====================================================================================
-- 060_derivados.sql — nenhuma grandeza com duas fontes de verdade
-- Epico 1 · T063 · FR-027 · FR-028 · FR-029 · FR-030 · RN-CRUD-02 · RN-INST-04
-- -------------------------------------------------------------------------------------
-- A REGRA (RN-CRUD-02, Risco: Alto): "Colunas alimentadas por formula nunca podem ser
-- sobrescritas por uma operacao de escrita." Na v2.0 a lista dessas colunas era mantida a
-- mao, e uma delas vazou para o formulario generico e apareceu como campo editavel — o
-- defeito que a Spec V4 item 4.5 corrigiu.
--
-- Aqui a lista nao existe porque nao precisa: o motor recusa.
-- =====================================================================================
begin;
select plan(8);

insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000f1', 'DER-A', 'Curso Derivados', 'regular');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, previsao_inicio, previsao_termino) values
  ('22222222-0000-0000-0000-0000000000f1', 'DER-A-MAT', '11111111-0000-0000-0000-0000000000f1', 'MAT', 'Disciplina Derivados', 60, '2026-03-01', '2026-06-30');
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('33333333-0000-0000-0000-0000000000f1', 'DER-UE1', '22222222-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 1, 'Unidade 1', 30),
  ('33333333-0000-0000-0000-0000000000f2', 'DER-UE2', '22222222-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 2, 'Unidade 2', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('44444444-0000-0000-0000-0000000000f1', 'DER-A 2026', '11111111-0000-0000-0000-0000000000f1', 'T1', 2026, 'ativa');

-- 8 TA na unidade 1 e 5 na unidade 2 = 13 executados na disciplina.
insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial, categoria_normativa, instrutor_id) values
  ('DER-REG-1', '2026-03-10', '44444444-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 4, 1, 'atividade_extraclasse', null),
  ('DER-REG-2', '2026-03-11', '44444444-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 4, 1, 'atividade_extraclasse', null),
  ('DER-REG-3', '2026-04-01', '44444444-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-0000000000f2', '11111111-0000-0000-0000-0000000000f1', 5, 1, 'atividade_extraclasse', null);

-- ==================================== FR-027 / RN-CRUD-02 — derivado nao e gravavel
-- `ta_final` = ta_inicial + tempos_consumidos - 1, calculado pelo motor.
select is(
  (select ta_final from public.registros_aula where codigo = 'DER-REG-1'),
  4::smallint,
  'RN-CRUD-02 · o valor derivado e calculado pelo motor (ta_inicial 1 + 4 tempos - 1 = 4)'
);
select throws_ok(
  $$update public.registros_aula set ta_final = 99 where codigo = 'DER-REG-1'$$,
  '428C9',
  null,
  'RN-CRUD-02 · gravar diretamente a coluna derivada e RECUSADO pelo motor'
);

-- ================================= FR-028 / FR-029 — nao existe campo gravavel
select hasnt_column('public', 'disciplinas', 'ch_executada',
  'FR-028 · disciplinas nao tem campo gravavel de carga executada');
select hasnt_column('public', 'instrutores', 'carga_horaria_ministrada_ano',
  'RN-INST-04 · instrutores nao tem campo gravavel de carga horaria — sempre calculada, nunca digitada');

-- =============== FR-030 — o agregado por UNIDADE, e o agregado por DISCIPLINA sobre ele
select is(
  (select ta_executados from public.vw_unidades_ensino_execucao
    where unidade_codigo = 'DER-UE1' and turma_id = '44444444-0000-0000-0000-0000000000f1'),
  8::bigint,
  'FR-030 · vw_unidades_ensino_execucao soma 8 TA na unidade 1'
);
select is(
  (select ta_saldo from public.vw_unidades_ensino_execucao
    where unidade_codigo = 'DER-UE1' and turma_id = '44444444-0000-0000-0000-0000000000f1'),
  22::bigint,
  'FR-030 · o saldo da unidade e previsto menos executado (30 - 8)'
);

-- A PROVA DE QUE A MUDANCA DE GRAO E INVISIVEL AO CONSUMIDOR: `vw_disciplinas_execucao`
-- mantem a assinatura publica e devolve a soma das unidades — 8 + 5 = 13. Quem consome
-- (CHD, DSA, Cronograma, motor preditivo) nao precisa saber que o fato mudou de grao.
select is(
  (select ta_aula_executados from public.vw_disciplinas_execucao
    where disciplina_codigo = 'DER-A-MAT' and turma_id = '44444444-0000-0000-0000-0000000000f1'),
  13::bigint,
  'FR-030 · vw_disciplinas_execucao agrega as unidades (8 + 5 = 13) — o grao de UE e invisivel a quem consome'
);

-- E a contraparte: a soma das unidades da disciplina bate com o que a view reporta.
select is(
  (select sum(ta_executados)::bigint from public.vw_unidades_ensino_execucao
    where disciplina_id = '22222222-0000-0000-0000-0000000000f1'),
  13::bigint,
  'FR-030 · a soma por unidade e a agregacao por disciplina sao o MESMO numero — uma fonte, nao duas'
);

select * from finish();
rollback;
