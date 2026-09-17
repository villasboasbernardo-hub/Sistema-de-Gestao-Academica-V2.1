-- =================================================================================
-- 098 — A exclusao permanente de instrutor sem historico, e a especialidade de militar novo
--
-- O QUE  : prova a excecao unica a regra 4 — "Autorizacao de Bernardo Villas Boas, 15/09/2026: fica
--          autorizada a exclusao permanente de instrutor, delimitada a registro SEM HISTORICO
--          NENHUM" — pelos dois lados: recusa com aula lancada, atribuicao, vinculo, conta de acesso
--          e para quem nao pode; sucesso so para o instrutor limpo. E o `RN-INST-03` delimitado
--          (CHK008 e CHK012): militar NOVO sem especialidade e recusado; civil, linha migrada e ficha
--          existente passam.
--
-- ⚠️ A SESSAO E SIMULADA COMO O POSTGREST FAZ: `request.jwt.claim.sub` apontando para um usuario de
--    `auth.users` com linha em `usuarios`. `app.pode` le exatamente isso. A prova com JWT de verdade,
--    pela interface de dados, mora em `tests/invariantes/rls/rls.test.ts`, bloco `Regra 4, excecao`.
--
-- ⚠️ A EXCECAO NAO ABRE PORTA NENHUMA NA RLS: a asserção 3 confere que continua havendo zero policies
--    de DELETE e zero privilegio de DELETE para `authenticated` em `instrutores`.
-- =================================================================================
begin;
select plan(17);

-- ---------------------------------------------------------------------------------
-- Amostra
-- ---------------------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('98000000-0000-0000-0000-000000000001', 't098-admin@ciaara.teste', 'authenticated', 'authenticated'),
  ('98000000-0000-0000-0000-000000000002', 't098-eop@ciaara.teste',   'authenticated', 'authenticated'),
  ('98000000-0000-0000-0000-000000000003', 't098-conta@ciaara.teste', 'authenticated', 'authenticated');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('98100000-0000-0000-0000-000000000001', 'T098-LIMPO',    'CT', '-EF', 'Instrutor Limpo',         'Militar', 'CIAARA'),
  ('98100000-0000-0000-0000-000000000002', 'T098-AULA',     'CT', '-EF', 'Instrutor Com Aula',      'Militar', 'CIAARA'),
  ('98100000-0000-0000-0000-000000000003', 'T098-ATRIB',    'CT', '-EF', 'Instrutor Com Atribuicao','Militar', 'CIAARA'),
  ('98100000-0000-0000-0000-000000000004', 'T098-VINCULO',  'CT', '-EF', 'Instrutor Com Vinculo',   'Militar', 'CIAARA'),
  ('98100000-0000-0000-0000-000000000005', 'T098-CONTA',    'CT', '-EF', 'Instrutor Com Conta',     'Militar', 'CIAARA'),
  ('98100000-0000-0000-0000-000000000006', 'T098-EXISTE',   'CT', '-EF', 'Instrutor Ja Existente',  'Militar', 'CIAARA');

insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, instrutor_id) values
  ('T098-USR-ADM',   '98000000-0000-0000-0000-000000000001', 't098-admin@ciaara.teste', 'Admin T098', 'admin', null),
  ('T098-USR-EOP',   '98000000-0000-0000-0000-000000000002', 't098-eop@ciaara.teste',   'EOP T098',   'encarregado_orientacao_pedagogica', null),
  ('T098-USR-CONTA', '98000000-0000-0000-0000-000000000003', 't098-conta@ciaara.teste', 'Conta T098', 'visualizacao', '98100000-0000-0000-0000-000000000005');

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('98200000-0000-0000-0000-000000000001', 'T098-CUR', 'Curso T098', 'regular', 'presencial', 30);
-- ⚠️ A TURMA VEM ANTES DAS DISCIPLINAS (spec 009, T014 / A-2). A partir da migration 4 desta fatia,
-- criar turma faz nascer uma linha de `turma_disciplina` por disciplina ATIVA do curso (`FR-032.2`).
-- Com a disciplina criada antes, a linha nasceria sozinha e a `turma_disciplina` de id fixo abaixo —
-- sobre a qual o teste grava a atribuição que IMPEDE a exclusão do instrutor — não seria a única
-- da turma, e a inserção explícita colidiria com `uq_turma_disciplina_ativo`.
-- Trocando a ordem, o curso ainda não tem disciplina quando a turma nasce, e a grade continua sendo
-- montada pelo próprio teste — que é de onde saem os números que as asserções conferem.
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade) values
  ('98500000-0000-0000-0000-000000000001', 'T098-CUR T1 ' || extract(year from current_date)::text,
   '98200000-0000-0000-0000-000000000001', 'T1',
   extract(year from current_date)::smallint, 'ativa', 'presencial');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('98300000-0000-0000-0000-000000000001', 'T098-DIS', '98200000-0000-0000-0000-000000000001', 'T98', 'Disciplina T098', 30);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('98400000-0000-0000-0000-000000000001', 'T098-UE1', '98300000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000001', 1, 'Unidade T098', 30);
insert into public.registros_aula
  (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial, categoria_normativa, instrutor_id)
values
  ('T098-REG-1', current_date, '98500000-0000-0000-0000-000000000001', '98400000-0000-0000-0000-000000000001',
   '98200000-0000-0000-0000-000000000001', 2, 1, 'atividade_extraclasse', '98100000-0000-0000-0000-000000000002');
insert into public.turma_disciplina (id, codigo, turma_id, disciplina_id) values
  ('98600000-0000-0000-0000-000000000001', 'T098-TD', '98500000-0000-0000-0000-000000000001', '98300000-0000-0000-0000-000000000001');
-- Atribuicao INATIVA: passado continua sendo historico.
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status) values
  ('T098-TDI', '98600000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000003', 'inativo');
-- Vinculo INATIVO: desmarcado tambem e historico.
insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id, status) values
  ('VIN-T098', '98100000-0000-0000-0000-000000000004', '98300000-0000-0000-0000-000000000001', 'inativo');

-- ---------------------------------------------------------------------------------
-- 1 a 3. A forma da porta, e a regra 4 intacta fora dela
-- ---------------------------------------------------------------------------------
select ok(
  (select prosecdef from pg_proc where oid = 'app.excluir_instrutor(uuid, text)'::regprocedure)
  and not (select prosecdef from pg_proc where oid = 'public.excluir_instrutor(uuid, text)'::regprocedure),
  'Regra 4, excecao · app.excluir_instrutor e SECURITY DEFINER com porteiro; o invólucro de public e invoker'
);

select ok(
  not has_function_privilege('anon', 'public.excluir_instrutor(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'app.excluir_instrutor(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.impedimentos_de_exclusao_do_instrutor(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.excluir_instrutor(uuid, text)', 'execute'),
  'Regra 4, excecao · anon nao executa a exclusao nem a consulta de impedimentos; authenticated executa'
);

select ok(
  (select count(*) = 0 from pg_policies where schemaname = 'public' and cmd = 'DELETE')
  and not has_table_privilege('authenticated', 'public.instrutores', 'delete'),
  'Regra 4, excecao · continua sem policy de DELETE e sem DELETE para authenticated — a unica porta e a funcao'
);

-- ---------------------------------------------------------------------------------
-- 4 e 5. Quem nao pode
-- ---------------------------------------------------------------------------------
select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000001', 'T098-LIMPO')$$,
  '42501', null,
  'Regra 4, excecao · sem sessao, a exclusao e recusada com 42501'
);

select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000001', 'T098-LIMPO')$$,
  '42501', null,
  'Regra 4, excecao · quem EDITA mas nao CRIA instrutor (orientacao pedagogica) e recusado com 42501'
);

-- ---------------------------------------------------------------------------------
-- 6 a 10. O admin, contra cada impedimento
-- ---------------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000002', 'T098-AULA')$$,
  '23503', 'instrutor_com_historico: aula_lancada',
  'Regra 4, excecao · instrutor com aula lancada nao e excluido'
);

select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000003', 'T098-ATRIB')$$,
  '23503', 'instrutor_com_historico: atribuicao',
  'Regra 4, excecao · instrutor com atribuicao, mesmo inativa, nao e excluido'
);

select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000004', 'T098-VINCULO')$$,
  '23503', 'instrutor_com_historico: vinculo_de_habilitacao',
  'Regra 4, excecao · instrutor com vinculo de habilitacao, mesmo inativo, nao e excluido'
);

select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000005', 'T098-CONTA')$$,
  '23503', 'instrutor_com_historico: conta_de_acesso',
  'Regra 4, excecao · instrutor com conta de acesso ligada nao e excluido, e a conta nao e tocada'
);

select throws_ok(
  $$select public.excluir_instrutor('98100000-0000-0000-0000-000000000001', 'T098-OUTRO')$$,
  '22023', null,
  'Regra 4, excecao · o codigo digitado precisa ser o do instrutor'
);

-- ---------------------------------------------------------------------------------
-- 11 a 13. O instrutor limpo, e os impedidos continuam la
-- ---------------------------------------------------------------------------------
select is(
  public.impedimentos_de_exclusao_do_instrutor('98100000-0000-0000-0000-000000000001'),
  array[]::text[],
  'Regra 4, excecao · o instrutor sem historico nao tem impedimento'
);

select is(
  public.excluir_instrutor('98100000-0000-0000-0000-000000000001', 'T098-LIMPO'),
  '{"codigo": "T098-LIMPO", "nome_completo": "Instrutor Limpo"}'::jsonb,
  'Regra 4, excecao · o instrutor limpo e excluido, e a funcao devolve codigo e nome'
);

select ok(
  not exists (select 1 from public.instrutores where codigo = 'T098-LIMPO')
  and (select count(*) = 4 from public.instrutores
        where codigo in ('T098-AULA', 'T098-ATRIB', 'T098-VINCULO', 'T098-CONTA'))
  and exists (select 1 from public.usuarios where codigo = 'T098-USR-CONTA'
               and instrutor_id = '98100000-0000-0000-0000-000000000005' and status = 'ativo'),
  'Regra 4, excecao · sumiu so o limpo; os quatro com historico e a conta ligada ficaram intactos'
);

-- ---------------------------------------------------------------------------------
-- 14 a 17. RN-INST-03 delimitado — especialidade de militar em cadastro NOVO
-- ---------------------------------------------------------------------------------
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T098-MIL-NOVO', 'CT', null, 'Militar Novo Sem Especialidade', 'Militar da Ativa', 'CIAARA')$$,
  '23514', null,
  'RN-INST-03 · militar novo sem especialidade/habilitacao e recusado pelo banco'
);

select lives_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T098-CIV-NOVO', 'SC', null, 'Civil Novo Sem Especialidade', 'SCNS', 'CIAARA')$$,
  'RN-INST-03 · civil (SC) novo sem especialidade entra — a especialidade se aplica a militar'
);

select lives_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, origem_migracao_v1)
    values ('T098-MIL-MIGR', 'CC', null, 'Militar Migrado Sem Especialidade', 'Militar da Ativa', 'CIAARA', 'Instrutores!T098')$$,
  'RN-INST-03 · linha migrada sem especialidade entra — a carga do corte traz 15 militares assim'
);

select lives_ok(
  $$update public.instrutores set esp_hab_obs = null where codigo = 'T098-EXISTE'$$,
  'RN-INST-03 · ficha existente de militar salva sem especialidade — a recusa e so do cadastro novo'
);

select * from finish();
rollback;
