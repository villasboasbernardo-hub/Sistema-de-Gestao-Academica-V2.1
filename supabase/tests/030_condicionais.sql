-- =====================================================================================
-- 030_condicionais.sql — as regras "se e somente se"
-- Epico 1 · T037 · FR-012 · FR-014 · FR-015 · FR-016
-- -------------------------------------------------------------------------------------
-- Regra condicional e a que mais escapa em revisao de codigo: o caminho valido funciona,
-- e o invalido so aparece em producao. Cada uma aqui e testada nos DOIS sentidos.
-- =====================================================================================
begin;
select plan(9);

insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000c1', 'COND-A', 'Curso Condicional', 'regular');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-0000000000c1', 'COND-A-MAT', '11111111-0000-0000-0000-0000000000c1', 'MAT', 'Disciplina Condicional', 40);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('33333333-0000-0000-0000-0000000000c1', 'COND-A 2026', '11111111-0000-0000-0000-0000000000c1', 'T1', 2026, 'ativa');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('44444444-0000-0000-0000-0000000000c1', 'COND-INS-1', 'CT', 'AA', 'Instrutor Condicional', 'Militar', 'CIAARA'),
  ('44444444-0000-0000-0000-0000000000c2', 'COND-INS-2', 'CT', 'AA', 'Fiscal Condicional', 'Militar', 'CIAARA');

-- =============================================== FR-014 / RN-EVT-02 — escopo x turma
-- Turma e obrigatoria SE E SOMENTE SE o escopo for de turma. O evento global vale para
-- todas as turmas ativas na data; amarra-lo a uma so seria mudar a regra.
select lives_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id)
    values ('ATV-COND-1', 'AEC', '2026-05-04', 'Palestra da turma', 2, 'turma', '33333333-0000-0000-0000-0000000000c1')$$,
  'FR-014 · escopo de turma COM turma e aceito'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id)
    values ('ATV-COND-2', 'AEC', '2026-05-05', 'Palestra sem turma', 2, 'turma', null)$$,
  '23514',
  null,
  'FR-014 · escopo de turma SEM turma e recusado'
);
select lives_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id)
    values ('ATV-COND-3', 'TAD', '2026-05-06', 'Formatura do Centro', 4, 'global', null)$$,
  'FR-014 · escopo global SEM turma e aceito'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id)
    values ('ATV-COND-4', 'TAD', '2026-05-07', 'Formatura com turma', 4, 'global', '33333333-0000-0000-0000-0000000000c1')$$,
  '23514',
  null,
  'FR-014 · escopo global COM turma e recusado — o evento global nao pertence a uma turma'
);

-- ========================================= FR-015 / RF-AVAL-06 — fiscal exclusivo
-- Fiscal interno OU externo, nunca os dois. O fiscal NAO exige habilitacao — RN-INST-01 e
-- delimitada nesse ponto —, por isso a FK do fiscal e `set null` e nao `restrict`.
select lives_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, data_avaliacao, instrutor_responsavel_id, fiscal_id)
    values ('AVAL-COND-1', '33333333-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-0000000000c1',
            '11111111-0000-0000-0000-0000000000c1', '2026-06-01', '44444444-0000-0000-0000-0000000000c1',
            '44444444-0000-0000-0000-0000000000c2')$$,
  'FR-015 · avaliacao so com fiscal interno e aceita'
);
select lives_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, data_avaliacao, instrutor_responsavel_id, nome_fiscal_externo)
    values ('AVAL-COND-2', '33333333-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-0000000000c1',
            '11111111-0000-0000-0000-0000000000c1', '2026-06-02', '44444444-0000-0000-0000-0000000000c1',
            'Fiscal de outra OM')$$,
  'FR-015 · avaliacao so com fiscal externo e aceita'
);
select throws_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, data_avaliacao, instrutor_responsavel_id, fiscal_id, nome_fiscal_externo)
    values ('AVAL-COND-3', '33333333-0000-0000-0000-0000000000c1', '22222222-0000-0000-0000-0000000000c1',
            '11111111-0000-0000-0000-0000000000c1', '2026-06-03', '44444444-0000-0000-0000-0000000000c1',
            '44444444-0000-0000-0000-0000000000c2', 'Fiscal de outra OM')$$,
  '23514',
  null,
  'FR-015 · avaliacao com fiscal interno E externo ao mesmo tempo e recusada'
);

-- ================================= FR-016 — linha de disciplina exige disciplina
select throws_ok(
  $$insert into public.planejamento_anual (codigo, ano_letivo, versao, curso_id, tipo_linha, semana_ano, data_inicio_semana, tempos_alocados, disciplina_id)
    values ('PLAN-COND-1', 2027, 1, '11111111-0000-0000-0000-0000000000c1', 'disciplina', 10, '2027-03-08', 8, null)$$,
  '23514',
  null,
  'FR-016 · linha de disciplina SEM disciplina e recusada'
);
select throws_ok(
  $$insert into public.planejamento_anual (codigo, ano_letivo, versao, curso_id, tipo_linha, semana_ano, data_inicio_semana, tempos_alocados, disciplina_id)
    values ('PLAN-COND-2', 2027, 1, '11111111-0000-0000-0000-0000000000c1', 'feriado', 11, '2027-03-15', 8, '22222222-0000-0000-0000-0000000000c1')$$,
  '23514',
  null,
  'FR-016 · linha que NAO e de disciplina COM disciplina e recusada'
);

select * from finish();
rollback;
