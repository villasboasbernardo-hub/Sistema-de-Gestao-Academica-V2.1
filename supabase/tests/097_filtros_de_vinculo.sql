-- =================================================================================
-- 097 — Os filtros de vinculo na leitura da listagem (FR-025 emendado em 15/09/2026)
--
-- O QUE  : prova que `vw_instrutores.habilitado`, `selecionado`, `cursos_vinculados` e
--          `classificacoes_vinculadas` seguem as regras da spec 015 da v2.0, com amostra semeada aqui.
--
-- Amostra:
--   · A — vinculo ATIVO em D-REG (curso T097-REG, regular); sem atribuicao;
--   · B — atribuicao ATIVA em D-EXP (curso T097-EXP, expedito); SEM vinculo — o selecionado sem
--         habilitacao que a v2.0 mediu;
--   · C — vinculo INATIVO em D-REG e atribuicao INATIVA em D-EXP: nao e nada.
-- =================================================================================
begin;
select plan(5);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('11111111-0000-0000-0000-0000000970c1', 'T097-REG', 'Curso T097 regular', 'regular', 'presencial', 30),
  ('11111111-0000-0000-0000-0000000970c2', 'T097-EXP', 'Curso T097 expedito', 'expedito', 'presencial', 10);
-- ⚠️ A TURMA VEM ANTES DAS DISCIPLINAS (spec 009, T013 / A-2). A partir da migration 4 desta fatia,
-- criar turma faz nascer uma linha de `turma_disciplina` por disciplina ATIVA do curso (`FR-032.2`).
-- Com a disciplina criada antes, a linha nasceria sozinha e a `turma_disciplina` de id fixo da linha seguinte,
-- que o teste INATIVA mais abaixo para provar que atribuição em grade inativa não seleciona ninguém,
-- conviveria com outra linha ATIVA da mesma disciplina, criada pelo gatilho.
-- Trocando a ordem, o curso ainda não tem disciplina quando a turma nasce, e a grade continua sendo
-- montada pelo próprio teste — que é de onde saem os números que as asserções conferem.
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade) values
  ('44444444-0000-0000-0000-0000000970e1', 'T097-EXP T1 2026', '11111111-0000-0000-0000-0000000970c2', 'T1', 2026, 'ativa', 'presencial');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-0000000970d1', 'T097-D-REG', '11111111-0000-0000-0000-0000000970c1', 'T97-R', 'Disciplina T097 reg', 10),
  ('22222222-0000-0000-0000-0000000970d2', 'T097-D-EXP', '11111111-0000-0000-0000-0000000970c2', 'T97-E', 'Disciplina T097 exp', 10);
insert into public.turma_disciplina (id, codigo, turma_id, disciplina_id) values
  ('55555555-0000-0000-0000-0000000970f1', 'T097-TD', '44444444-0000-0000-0000-0000000970e1', '22222222-0000-0000-0000-0000000970d2');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('66666666-0000-0000-0000-0000000970a1', 'T097-A', 'CT', '-EF', 'Instrutor T097 A', 'Militar', 'CIAARA'),
  ('66666666-0000-0000-0000-0000000970b1', 'T097-B', 'CT', '-EF', 'Instrutor T097 B', 'Militar', 'CIAARA'),
  ('66666666-0000-0000-0000-0000000970c1', 'T097-C', 'CT', '-EF', 'Instrutor T097 C', 'Militar', 'CIAARA');
insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id, status) values
  ('VIN-T097-A', '66666666-0000-0000-0000-0000000970a1', '22222222-0000-0000-0000-0000000970d1', 'ativo'),
  ('VIN-T097-C', '66666666-0000-0000-0000-0000000970c1', '22222222-0000-0000-0000-0000000970d1', 'inativo');
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status) values
  ('TDI-T097-B', '55555555-0000-0000-0000-0000000970f1', '66666666-0000-0000-0000-0000000970b1', 'ativo'),
  ('TDI-T097-C', '55555555-0000-0000-0000-0000000970f1', '66666666-0000-0000-0000-0000000970c1', 'inativo');

select results_eq(
  $$select codigo, habilitado, selecionado from public.vw_instrutores
     where codigo in ('T097-A', 'T097-B', 'T097-C') order by codigo$$,
  $$values ('T097-A'::text, true, false), ('T097-B', false, true), ('T097-C', false, false)$$,
  'FR-025 · habilitado e selecionado são independentes, e só contam vínculo e atribuição ativos'
);

select results_eq(
  $$select codigo, cursos_vinculados, classificacoes_vinculadas from public.vw_instrutores
     where codigo in ('T097-A', 'T097-B', 'T097-C') order by codigo$$,
  $$values ('T097-A'::text, array['T097-REG']::text[], array['regular']::text[]),
           ('T097-B', array['T097-EXP']::text[], array['expedito']::text[]),
           ('T097-C', '{}'::text[], '{}'::text[])$$,
  'FR-025 · curso casa por vínculo OU atribuição ativa, e a classificação vem dos cursos'
);

-- Uma atribuicao em turma_disciplina INATIVA nao faz de ninguem selecionado.
update public.turma_disciplina set status = 'inativo' where id = '55555555-0000-0000-0000-0000000970f1';
select is(
  (select selecionado from public.vw_instrutores where codigo = 'T097-B'),
  false,
  'FR-025 · atribuição numa disciplina tirada da turma não conta como seleção'
);

select has_column('public', 'vw_instrutores', 'cursos_vinculados',
  'FR-025 · vw_instrutores expõe cursos_vinculados para o filtro de curso');

select is_empty(
  $$select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'vw_instrutores'
       and grantee = 'authenticated'
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$,
  'I-8 · vw_instrutores recriada continua sem escrita para authenticated'
);

select * from finish();
rollback;
