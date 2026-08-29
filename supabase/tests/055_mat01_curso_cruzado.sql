-- =====================================================================================
-- 055_mat01_curso_cruzado.sql — RN-MAT-01, Risco: Alto
-- Epico 1 · T040 · FR-061 · FR-062
-- -------------------------------------------------------------------------------------
-- A REGRA (documento 04): "Uma aula ou avaliacao so pode ser lancada para uma disciplina
-- que pertenca ao mesmo curso da turma selecionada — a validacao cruzada
-- materia<->curso<->turma e obrigatoria em TODO ponto de lancamento."
--
-- Na v2.0 isso era uma chamada de funcao que cada ponto de lancamento tinha de lembrar de
-- fazer. Era por isso que a regra era de risco alto: bastava esquecer uma.
--
-- Na v2.1 e uma cadeia de chaves estrangeiras COMPOSTAS (research.md §3). Um lancamento
-- cuja turma e cuja unidade de ensino pertencam a cursos diferentes nao tem `curso_id` que
-- satisfaca as duas chaves ao mesmo tempo.
--
-- POR QUE ESTE ARQUIVO EXISTE (achado C2 de /speckit-analyze, 29/08/2026): a cadeia foi
-- implementada antes de haver requisito e SEM assercao nomeada. Uma cadeia a que faltasse
-- UMA das duas chaves passaria em todos os outros testes desta suite — o schema pareceria
-- correto, e RN-MAT-01 estaria desprotegida em producao.
--
-- As duas cadeias sao DIFERENTES, e confundi-las foi o achado M1 da mesma analise:
--   registros_aula  cruza turma x UNIDADE DE ENSINO;
--   avaliacoes      cruza turma x DISCIPLINA (a avaliacao nao referencia unidade).
-- =====================================================================================
begin;
select plan(6);

-- ------------------------------------------------------------------------- cenario
-- Dois cursos, cada um com sua turma, sua disciplina e sua unidade de ensino. O unico
-- jeito de errar e cruzar os dois — que e exatamente o que a regra proibe.
insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-1111-1111-1111-111111111111', 'SONDA-A', 'Curso Sonda A', 'regular'),
  ('22222222-2222-2222-2222-222222222222', 'SONDA-B', 'Curso Sonda B', 'regular');

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'SONDA-A 2026', '11111111-1111-1111-1111-111111111111', 'T1', 2026, 'ativa'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'SONDA-B 2026', '22222222-2222-2222-2222-222222222222', 'T1', 2026, 'ativa');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '1 - SONDA-A - MAT', '11111111-1111-1111-1111-111111111111', 'MAT', 'Disciplina do Curso A', 40),
  ('bbbbbbbb-0000-0000-0000-000000000002', '1 - SONDA-B - FIS', '22222222-2222-2222-2222-222222222222', 'FIS', 'Disciplina do Curso B', 40);

insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'SONDA-A-MAT-UE1', 'aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, 'Unidade do Curso A', 40),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'SONDA-B-FIS-UE1', 'bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 1, 'Unidade do Curso B', 40);

-- ------------------------------------------------------- 1. o caminho valido funciona
-- Controle positivo. Sem ele, uma cadeia que recusasse TUDO passaria nos testes 2 e 3.
select lives_ok(
  $$insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, categoria_normativa, instrutor_id)
    values ('REG-SONDA-OK', '2026-03-02',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000003',
            '11111111-1111-1111-1111-111111111111', 2, 'atividade_extraclasse', null)$$,
  'RN-MAT-01 · controle positivo: turma e unidade do MESMO curso sao aceitas'
);

-- ------------------------------------------------- 2. turma de um curso, UE de outro
select throws_ok(
  $$insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, categoria_normativa, instrutor_id)
    values ('REG-SONDA-CRUZ1', '2026-03-03',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'bbbbbbbb-0000-0000-0000-000000000003',
            '11111111-1111-1111-1111-111111111111', 2, 'atividade_extraclasse', null)$$,
  '23503',
  null,
  'RN-MAT-01 · registros_aula: turma do curso A com unidade do curso B e RECUSADA'
);

-- Simetrico: declarar o curso B faz a chave da TURMA falhar. Nao ha `curso_id` que
-- satisfaca as duas ao mesmo tempo — e esse e exatamente o ponto da cadeia.
select throws_ok(
  $$insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, categoria_normativa, instrutor_id)
    values ('REG-SONDA-CRUZ2', '2026-03-04',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'bbbbbbbb-0000-0000-0000-000000000003',
            '22222222-2222-2222-2222-222222222222', 2, 'atividade_extraclasse', null)$$,
  '23503',
  null,
  'RN-MAT-01 · registros_aula: nao existe curso_id que satisfaca as duas chaves de uma vez'
);

-- --------------------------------------------------------------- 3. em `avaliacoes`
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
  values ('cccccccc-0000-0000-0000-000000000001', 'INS-SONDA', 'CT', 'AA',
          'Instrutor de Sonda', 'Militar', 'CIAARA');

select lives_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, data_avaliacao, instrutor_responsavel_id)
    values ('AVAL-SONDA-OK',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', '2026-04-01',
            'cccccccc-0000-0000-0000-000000000001')$$,
  'RN-MAT-01 · controle positivo: avaliacao com turma e disciplina do mesmo curso'
);

select throws_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, data_avaliacao, instrutor_responsavel_id)
    values ('AVAL-SONDA-CRUZ',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'bbbbbbbb-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', '2026-04-02',
            'cccccccc-0000-0000-0000-000000000001')$$,
  '23503',
  null,
  'RN-MAT-01 · avaliacoes: turma do curso A com disciplina do curso B e RECUSADA'
);

-- ------------------------------------------- 4. a unidade pertence ao curso da sua disciplina
select throws_ok(
  $$insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
    values ('SONDA-CRUZ-UE', 'aaaaaaaa-0000-0000-0000-000000000002',
            '22222222-2222-2222-2222-222222222222', 9, 'Unidade incoerente', 10)$$,
  '23503',
  null,
  'RN-MAT-01 · unidades_ensino: unidade de disciplina do curso A declarada no curso B e RECUSADA'
);

select * from finish();
rollback;
