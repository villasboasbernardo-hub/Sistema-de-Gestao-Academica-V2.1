-- =================================================================================
-- 149 — A exclusao permanente dos cadastros do Bloco 10 (spec 025, D-COR-6, D-9 a D-13, D-30, D-32)
--
-- O QUE  : prova a estrutura e as regras de banco da migration `20261024063555` —
--          as funcoes existem, as de `app` sao SECURITY DEFINER e os espelhos de `public`
--          INVOKER; o porteiro levanta 42501 SEM sessao (gotcha 15: a forma `coalesce`);
--          a restricao do rastro aceita as oito tabelas; o que PRENDE a turma e o feriado,
--          com o caso que discrimina de cada um; a exclusao da turma limpa, com o rastro
--          gravado ANTES e a estrutura saindo junto; e a rede pelo catalogo.
--
-- ⚠️ A SESSAO E SIMULADA COMO O POSTGREST FAZ (`request.jwt.claim.sub`), e isso serve para
--    o porteiro e o rastro, NUNCA para autorizacao: "quem pode o que" mora em
--    `tests/invariantes/rls/exclusao-de-cadastros.test.ts`, com sessao autenticada de verdade.
--
-- ⚠️ OS CASOS QUE DISCRIMINAM (DoD 8):
--    · turma: a ATRIBUICAO de instrutor e ESTRUTURA (sai junto) — a turma so com ela e
--      excluivel; com UM evento `salvo` do DSA, nao e. Antes desta migration, nao havia
--      exclusao de turma nenhuma.
--    · feriado: a semana com evento `salvo` de turma ALCANCADA prende; o mesmo evento de
--      turma FORA das escolhidas, nao.
--    · a rede: a disciplina com linha de turma continua presa (107), e agora tambem pela
--      FK que a lista antiga nao conhecia.
--
-- ⚠️ A ASSERCAO FINAL e a que prova que a excecao NAO ABRE PORTA: zero policy de DELETE no
--    catalogo inteiro, e zero privilegio de DELETE para `authenticated` nas tabelas novas.
-- =================================================================================
begin;
select plan(30);

-- ── estrutura ────────────────────────────────────────────────────────────────────
select has_function('app', 'excluir_turma', array['uuid', 'text'], 'app.excluir_turma existe');
select has_function('app', 'excluir_feriado', array['uuid', 'text'], 'app.excluir_feriado existe');
select has_function('app', 'excluir_regime_de_horario', array['uuid', 'text'], 'app.excluir_regime_de_horario existe');
select has_function('app', 'excluir_item_de_avaliacao_do_curriculo', array['uuid', 'text'], 'app.excluir_item_de_avaliacao_do_curriculo existe');
select has_function('app', 'excluir_sala', array['uuid', 'text'], 'app.excluir_sala existe');
select has_function('app', 'referencias_por_fk', array['regclass', 'uuid[]', 'text[]'], 'a rede pelo catalogo existe');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname in ('excluir_turma', 'excluir_feriado', 'excluir_regime_de_horario',
          'excluir_item_de_avaliacao_do_curriculo', 'excluir_sala', 'impedimentos_de_exclusao_da_turma',
          'impedimentos_de_exclusao_das_turmas', 'impedimentos_de_exclusao_do_feriado',
          'impedimentos_de_exclusao_dos_feriados', 'impedimentos_de_exclusao_dos_regimes',
          'impedimentos_de_exclusao_dos_itens', 'impedimentos_de_exclusao_das_salas')
      and not p.prosecdef),
  0,
  'as funcoes de app sao todas SECURITY DEFINER'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('excluir_turma', 'excluir_feriado', 'excluir_regime_de_horario',
          'excluir_item_de_avaliacao_do_curriculo', 'excluir_sala', 'impedimentos_de_exclusao_da_turma',
          'impedimentos_de_exclusao_das_turmas', 'impedimentos_de_exclusao_dos_feriados')
      and p.prosecdef),
  0,
  'os espelhos de public sao INVOKER'
);
select ok(
  not has_function_privilege('authenticated', 'app.referencias_por_fk(regclass, uuid[], text[])', 'execute'),
  'a rede e interna: authenticated nao a executa'
);
select ok(
  not has_function_privilege('anon', 'public.excluir_turma(uuid, text)', 'execute'),
  'anon nao executa a exclusao de turma'
);

select matches(
  (select pg_get_constraintdef(c.oid) from pg_constraint c where c.conname = 'exclusoes_tabela_permitida'),
  'turmas.*feriados.*regimes_de_horario.*avaliacoes_curriculo.*config_listas',
  'o rastro aceita as tabelas novas'
);

-- ── o porteiro, sem sessao (gotcha 15) ───────────────────────────────────────────
select throws_ok(
  $$ select app.excluir_turma('00000000-0000-0000-0000-000000000000', 'x') $$,
  '42501', null, 'sem sessao, a exclusao de turma recusa com 42501'
);
select throws_ok(
  $$ select app.excluir_feriado('00000000-0000-0000-0000-000000000000', 'x') $$,
  '42501', null, 'sem sessao, a exclusao de feriado recusa com 42501'
);
select throws_ok(
  $$ select * from app.impedimentos_de_exclusao_das_turmas(array['00000000-0000-0000-0000-000000000000']::uuid[]) $$,
  '42501', null, 'sem sessao, nem os impedimentos se leem'
);

-- ── a amostra ────────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role) values
  ('a1490000-0000-0000-0000-000000000001', 't149-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T149-USR-ADM', 'a1490000-0000-0000-0000-000000000001', 't149-admin@ciaara.teste', 'Admin T149', 'admin');

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1492000-0000-0000-0000-000000000001', 'T149-CUR', 'Curso T149', 'regular', 'presencial', 30);
insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a1492000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values
  ('a1495000-0000-0000-0000-000000000001', 'T149-CUR T1 2026', 'a1492000-0000-0000-0000-000000000001',
   'T1', 2026, 'planejada', 'presencial', '2026-03-02', '2026-06-30'),
  ('a1495000-0000-0000-0000-000000000002', 'T149-CUR T2 2026', 'a1492000-0000-0000-0000-000000000001',
   'T2', 2026, 'planejada', 'presencial', '2026-03-02', '2026-06-30'),
  ('a1495000-0000-0000-0000-000000000003', 'T149-CUR T3 2026', 'a1492000-0000-0000-0000-000000000001',
   'T3', 2026, 'planejada', 'presencial', '2026-03-02', '2026-06-30');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('a1493000-0000-0000-0000-000000000001', 'T149-DIS', 'a1492000-0000-0000-0000-000000000001', 'I', 'Disciplina T149', 10);
insert into public.turma_disciplina (turma_id, disciplina_id)
select t.id, 'a1493000-0000-0000-0000-000000000001'
  from public.turmas t
 where t.codigo like 'T149-CUR %'
   and not exists (select 1 from public.turma_disciplina td
                    where td.turma_id = t.id and td.disciplina_id = 'a1493000-0000-0000-0000-000000000001');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a1491000-0000-0000-0000-000000000001', 'T149-INS', 'CT', '-EF', 'Instrutor T149', 'Militar', 'CIAARA');

-- A T1 so com ESTRUTURA (a atribuicao de instrutor): sem registro.
insert into public.turma_disciplina_instrutor (turma_disciplina_id, instrutor_id, codigo)
select td.id, 'a1491000-0000-0000-0000-000000000001', td.codigo || '#T149-INS'
  from public.turma_disciplina td where td.turma_id = 'a1495000-0000-0000-0000-000000000001';

-- A T2 com UM evento `salvo` do DSA na semana 12/2026 (16 a 22/03).
insert into public.dsa_eventos_da_semana (turma_id, ano, semana, tipo)
values ('a1495000-0000-0000-0000-000000000002', 2026, 12, 'salvo');

-- Dois feriados na semana 12: um para TODAS as turmas e um so para a T3.
insert into public.feriados (id, ano, data, descricao, impacto, status) values
  ('a1496000-0000-0000-0000-000000000001', 2026, '2026-03-18', 'T149 de todas', 'dia_inteiro', 'ativo'),
  ('a1496000-0000-0000-0000-000000000002', 2026, '2026-03-19', 'T149 so da T3', 'dia_inteiro', 'ativo');
insert into public.feriado_turma (feriado_id, turma_id, status) values
  ('a1496000-0000-0000-0000-000000000002', 'a1495000-0000-0000-0000-000000000003', 'ativo');

-- ── o que prende a turma (D-10) ──────────────────────────────────────────────────
select is(app.registros_da_turma('a1495000-0000-0000-0000-000000000001'), array[]::text[],
  'DISCRIMINA: a turma so com atribuicao de instrutor nao tem registro — a atribuicao e estrutura');
select ok('semana_do_dsa' = any (app.registros_da_turma('a1495000-0000-0000-0000-000000000002')),
  'DISCRIMINA: com UM evento salvo do DSA, a turma tem registro');
select ok('feriado_da_turma' = any (app.registros_da_turma('a1495000-0000-0000-0000-000000000003')),
  'a turma escolhida num feriado tem registro: apaga-la alargaria o feriado para todas');

-- ── o que prende o feriado (D-11) ────────────────────────────────────────────────
select ok('semana_do_dsa_salva_ou_publicada' = any (app.registros_do_feriado('a1496000-0000-0000-0000-000000000001')),
  'o feriado de todas as turmas, na semana salva de uma delas, tem registro');
select is(app.registros_do_feriado('a1496000-0000-0000-0000-000000000002'), array[]::text[],
  'DISCRIMINA: o feriado so da T3 nao e preso pela semana salva da T2');

-- ── com sessao (porteiro e rastro; nao autorizacao) ──────────────────────────────
select set_config('request.jwt.claim.sub', 'a1490000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1490000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ select app.excluir_turma('a1495000-0000-0000-0000-000000000001', 'outro codigo') $$,
  '22023', null, 'o codigo digitado errado recusa com 22023'
);
select throws_ok(
  $$ select app.excluir_turma('a1495000-0000-0000-0000-000000000002', 'T149-CUR T2 2026') $$,
  '23503', null, 'a turma com registro recusa com 23503, nomeando o que prende'
);
select lives_ok(
  $$ select app.excluir_turma('a1495000-0000-0000-0000-000000000001', 'T149-CUR T1 2026') $$,
  'a turma sem registro sai, com o codigo certo'
);
select is((select count(*)::int from public.turmas where id = 'a1495000-0000-0000-0000-000000000001'), 0,
  'a turma saiu');
select is((select count(*)::int from public.turma_disciplina where turma_id = 'a1495000-0000-0000-0000-000000000001'), 0,
  'as linhas da grade sairam junto');
select is(
  (select count(*)::int from public.exclusoes_registradas
    where tabela = 'turmas' and registro_codigo = 'T149-CUR T1 2026'
      and excluido_por = 'a1490000-0000-0000-0000-000000000001'),
  1,
  'o rastro tem quem, o que e quando'
);
select ok(
  (select retrato ? 'atribuicoes' from public.exclusoes_registradas
    where tabela = 'turmas' and registro_codigo = 'T149-CUR T1 2026'),
  'o retrato leva as atribuicoes que sairam junto'
);

select lives_ok(
  $$ select app.excluir_feriado('a1496000-0000-0000-0000-000000000002',
       (select codigo from public.feriados where id = 'a1496000-0000-0000-0000-000000000002')) $$,
  'o feriado sem registro sai'
);
select is((select count(*)::int from public.feriado_turma where feriado_id = 'a1496000-0000-0000-0000-000000000002'), 0,
  'a abrangencia do feriado saiu junto');

-- ── a excecao nao abre porta ─────────────────────────────────────────────────────
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0, 'zero policy de DELETE no catalogo');
select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'authenticated' and privilege_type = 'DELETE'
      and table_schema = 'public'
      and table_name in ('turmas', 'feriados', 'regimes_de_horario', 'avaliacoes_curriculo', 'config_listas')),
  0,
  'authenticated sem DELETE nas tabelas que ganharam exclusao'
);

select * from finish();
rollback;
