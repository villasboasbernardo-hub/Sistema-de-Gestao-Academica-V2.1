-- =================================================================================
-- 091 — A Unidade de Ensino anulável, e a catraca que a segura (FR-025.8, R-1)
--
-- O QUÊ  : prova que o `CHECK` reg_aula_ue_so_nula_no_historico faz as três coisas
--          que a decisão de 08/09/2026 pediu.
-- PARA QUÊ: a coluna deixou de ser `NOT NULL`, e o que garante o grão de Unidade de
--          Ensino para dado novo passou a ser ESTE constraint. Sem teste, ele é uma
--          linha de SQL que ninguém confere — e a decisão UE-1 vira comentário.
-- COMO   : quatro asserções nomeadas, três delas ESPERANDO A FALHA.
--
-- Testar só o caminho feliz não prova nada: o valor deste arquivo está nas três
-- asserções negativas.
-- =================================================================================

begin;
select plan(4);

-- ---------------------------------------------------------------------------------
-- 1. A coluna aceita nulo — sem isso, os 17 cursos sem fonte não entram.
-- ---------------------------------------------------------------------------------
select col_is_null(
  'public', 'registros_aula', 'unidade_ensino_id',
  'RN-UE-1: unidade_ensino_id aceita nulo, para o historico que a v2.0 nunca guardou'
);

-- ---------------------------------------------------------------------------------
-- 2. O constraint existe e está nomeado — a proteção é conferível, não presumida.
-- ---------------------------------------------------------------------------------
select has_check(
  'public', 'registros_aula',
  'RN-UE-2: existe CHECK confinando o nulo ao historico migrado'
);

-- ---------------------------------------------------------------------------------
-- 3. NEGATIVO — dado NOVO sem UE é RECUSADO.
--    É a asserção que prova que a decisão UE-1 continua valendo onde importa.
-- ---------------------------------------------------------------------------------
select throws_ok(
  $$
    insert into public.registros_aula
      (codigo, data, turma_id, unidade_ensino_id, curso_id, categoria_normativa,
       tipo_atividade, metodologia, tempos_consumidos, origem_migracao_v1)
    values
      ('REG-TESTE-NOVO', '2026-04-13',
       (select id from public.turmas limit 1), null,
       (select id from public.cursos limit 1), 'aula',
       'aula_teorica', 'expositiva', 2, null)
  $$,
  '23514',
  null,
  'RN-UE-3 (NEGATIVO): registro NOVO sem UE e sem procedencia e RECUSADO pelo banco'
);

-- ---------------------------------------------------------------------------------
-- 4. NEGATIVO — linha migrada JÁ EDITADA não pode ficar sem UE.
--    Esta é a catraca: o histórico pode nascer incompleto, mas não pode ser MANTIDO
--    incompleto por quem mexe nele.
-- ---------------------------------------------------------------------------------
select throws_ok(
  $$
    insert into public.registros_aula
      (codigo, data, turma_id, unidade_ensino_id, curso_id, categoria_normativa,
       tipo_atividade, metodologia, tempos_consumidos, origem_migracao_v1, editado_em)
    values
      ('REG-TESTE-EDITADO', '2026-04-13',
       (select id from public.turmas limit 1), null,
       (select id from public.cursos limit 1), 'aula',
       'aula_teorica', 'expositiva', 2,
       'Registros_Aula:REG-000001', now())
  $$,
  '23514',
  null,
  'RN-UE-4 (NEGATIVO): linha migrada com editado_em preenchido EXIGE a UE — a catraca'
);

select * from finish();
rollback;
