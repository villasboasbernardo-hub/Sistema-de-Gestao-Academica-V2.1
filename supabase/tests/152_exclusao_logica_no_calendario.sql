-- =================================================================================
-- 152 — Excluir no Calendário é exclusão LÓGICA, sem bloqueio, só do Admin (spec 027, Bloco 12, D-COR-7)
--
-- O QUE  : prova a estrutura e as regras de banco da migration `20261027123023` — as colunas e as funções existem, as
--          de `app` sao SECURITY DEFINER e os espelhos INVOKER; o porteiro levanta 42501 SEM sessao (gotcha 15); a
--          linha VINDA DA V2.0 (procedencia preenchida, nunca editada — a forma que a `resp_dinamico_tem_chave`
--          recusava na RSP-000001) se exclui com uma aula salva no dia e a semana PUBLICADA; o rastro; a linha
--          excluida congela; outra linha na mesma data; e a `vw_dias_parados_turma` que deixa de contar o dia.
--
-- ⚠️ A SESSAO E SIMULADA COMO O POSTGREST FAZ (`request.jwt.claim.sub`), e isso serve para o porteiro, o gatilho e o
--    rastro, NUNCA para autorizacao: "quem pode o que" mora em `tests/invariantes/rls/exclusao-no-calendario.test.ts`.
--
-- ⚠️ OS CASOS QUE DISCRIMINAM (DoD 8):
--    · a `vw_dias_parados_turma` conta o dia ANTES (1) e nao conta DEPOIS (0) — a exclusao libera o dia sem mudar view.
--    · o MESMO `UPDATE` de `excluido_em`: o Encarregado recusado (42501) e, na mesma linha, o desativar dele passa.
--
-- ⚠️ 2047, longe do dado real: o arquivo vale na base limpa e na carregada.
-- =================================================================================
begin;
select plan(27);

-- ── estrutura ────────────────────────────────────────────────────────────────────
select has_column('public', 'feriados', 'excluido_em', 'feriados.excluido_em existe');
select has_column('public', 'feriados', 'excluido_por', 'feriados.excluido_por existe');
select col_is_null('public', 'feriados', 'excluido_em', 'excluido_em e nulavel (so acrescenta)');
select has_function('app', 'excluir_linha_do_calendario', array['uuid'], 'app.excluir_linha_do_calendario existe');
select has_function('app', 'impacto_da_exclusao_do_feriado', array['uuid'], 'app.impacto_da_exclusao_do_feriado existe');
select has_trigger('public', 'feriados', 'trg_feriados_exclusao', 'o gatilho que guarda as colunas novas existe');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in ('excluir_linha_do_calendario', 'impacto_da_exclusao_do_feriado', 'guardar_exclusao_no_calendario')
      and not p.prosecdef),
  0,
  'as funcoes de app sao SECURITY DEFINER'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('excluir_linha_do_calendario', 'impacto_da_exclusao_do_feriado')
      and p.prosecdef),
  0,
  'os espelhos de public sao INVOKER'
);
select ok(
  not has_function_privilege('anon', 'public.excluir_linha_do_calendario(uuid)', 'execute'),
  'anon nao executa a exclusao'
);

-- ── o porteiro, sem sessao (gotcha 15) ───────────────────────────────────────────
select throws_ok(
  $$ select app.excluir_linha_do_calendario('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'sem sessao, a exclusao recusa com 42501'
);
select throws_ok(
  $$ select app.impacto_da_exclusao_do_feriado('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'sem sessao, nem o impacto se le'
);

-- ── a amostra ────────────────────────────────────────────────────────────────────
insert into auth.users (id, email, aud, role) values
  ('a1520000-0000-0000-0000-000000000001', 't152-admin@ciaara.teste', 'authenticated', 'authenticated'),
  ('a1520000-0000-0000-0000-000000000002', 't152-enc@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T152-USR-ADM', 'a1520000-0000-0000-0000-000000000001', 't152-admin@ciaara.teste', 'Admin T152', 'admin'),
  ('T152-USR-ENC', 'a1520000-0000-0000-0000-000000000002', 't152-enc@ciaara.teste', 'Encarregado T152',
   'encarregado_administracao_academica');

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1522000-0000-0000-0000-000000000001', 'T152-CUR', 'Curso T152', 'regular', 'presencial', 30);
insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a1522000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1525000-0000-0000-0000-000000000001', 'T152-CUR T1 2047', 'a1522000-0000-0000-0000-000000000001',
        'T1', 2047, 'ativa', 'presencial', '2047-03-04', '2047-06-28');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('a1523000-0000-0000-0000-000000000001', 'T152-DIS', 'a1522000-0000-0000-0000-000000000001', 'I', 'Disciplina T152', 10);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
values ('a1527000-0000-0000-0000-000000000001', 'T152-UE', 'a1523000-0000-0000-0000-000000000001',
        'a1522000-0000-0000-0000-000000000001', 1, 'Topico T152', 10);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a1521000-0000-0000-0000-000000000001', 'T152-INS', 'CT', '-EF', 'Instrutor T152', 'Militar', 'CIAARA');

-- A linha VINDA DA V2.0 (procedencia, nunca editada), de todas as turmas, numa quarta (2047-04-17).
insert into public.feriados (id, ano, data, descricao, impacto, status, origem_migracao_v1) values
  ('a1526000-0000-0000-0000-000000000001', 2047, '2047-04-17', 'T152 da v2.0', 'dia_inteiro', 'ativo',
   'Feriados:T152'),
  ('a1526000-0000-0000-0000-000000000002', 2047, '2047-05-08', 'T152 outra', 'dia_inteiro', 'ativo', null);
-- Uma aula SALVA no dia, e a semana PUBLICADA (original) — a D-COR-6 prendia a linha pelas duas.
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo)
values ('T152-REG', '2047-04-17', 'a1525000-0000-0000-0000-000000000001', 'a1522000-0000-0000-0000-000000000001',
        'a1527000-0000-0000-0000-000000000001', 'a1521000-0000-0000-0000-000000000001', 2, 1, true);
insert into public.dsa_eventos_da_semana (turma_id, ano, semana, tipo, numero, retrato)
select 'a1525000-0000-0000-0000-000000000001', s.ano, s.semana, 'publicado', 0, '{"t152": true}'::jsonb
  from app.semana_iso('2047-04-17') s;

select is(
  (select sum(dias)::int from public.vw_dias_parados_turma where turma_id = 'a1525000-0000-0000-0000-000000000001'),
  2,
  'ANTES: a turma tem os dois dias de feriado contados'
);

-- ── o impacto, com a sessao do Admin ─────────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'a1520000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a1520000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is(
  (select t->>'aulas' || '/' || (t->>'versao_publicada')
     from jsonb_array_elements(app.impacto_da_exclusao_do_feriado('a1526000-0000-0000-0000-000000000001') -> 'turmas') t
    where t->>'codigo' = 'T152-CUR T1 2047'),
  '1/0',
  'o impacto cita a turma, a aula do dia e a semana publicada (original)'
);

-- ── a exclusao da linha da v2.0, com aula e semana publicada ─────────────────────
select lives_ok(
  $$ select app.excluir_linha_do_calendario('a1526000-0000-0000-0000-000000000001') $$,
  'a linha da v2.0, com aula salva no dia e semana publicada, se exclui — nada bloqueia'
);
select is(
  (select status::text || '|' || (excluido_em is not null)::text || '|' || excluido_por::text
     from public.feriados where id = 'a1526000-0000-0000-0000-000000000001'),
  'inativo|true|a1520000-0000-0000-0000-000000000001',
  'a linha ficou inativa e excluida, com quem e quando — e continua no banco'
);
select is(
  (select count(*)::int from public.exclusoes_registradas
    where tabela = 'feriados' and registro_id = 'a1526000-0000-0000-0000-000000000001'
      and retrato->>'modo' = 'logica' and retrato ? 'impacto'
      and excluido_por = 'a1520000-0000-0000-0000-000000000001'),
  1,
  'o rastro (D-B1): modo logica, o impacto daquela hora, quem e quando'
);
select is(
  (select sum(dias)::int from public.vw_dias_parados_turma where turma_id = 'a1525000-0000-0000-0000-000000000001'),
  1,
  'DISCRIMINA: DEPOIS, o dia excluido deixou de contar (a view nao mudou)'
);
select is(
  (select retrato from public.dsa_eventos_da_semana
    where turma_id = 'a1525000-0000-0000-0000-000000000001' and tipo = 'publicado'),
  '{"t152": true}'::jsonb,
  'a versao publicada nao mudou'
);

-- ── a excluida congela; a mesma data aceita outra linha ──────────────────────────
select throws_ok(
  $$ update public.feriados set status = 'ativo' where id = 'a1526000-0000-0000-0000-000000000001' $$,
  '55000', null, 'a linha excluida nao se altera mais — nem reativar, nem para o Admin'
);
select throws_ok(
  $$ select app.excluir_linha_do_calendario('a1526000-0000-0000-0000-000000000001') $$,
  'P0002', null, 'excluir de novo: a linha nao existe mais para a tela'
);
select lives_ok(
  $$ insert into public.feriados (ano, data, descricao, impacto) values (2047, '2047-04-17', 'T152 de novo', 'dia_inteiro') $$,
  'a linha excluida nao impede cadastrar outra na mesma data'
);

-- ── o Encarregado ────────────────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', 'a1520000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a1520000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$ select app.excluir_linha_do_calendario('a1526000-0000-0000-0000-000000000002') $$,
  '42501', null, 'o Encarregado nao exclui (porteiro da funcao)'
);
select throws_ok(
  $$ update public.feriados set status = 'inativo', excluido_em = now(),
            excluido_por = 'a1520000-0000-0000-0000-000000000002'
      where id = 'a1526000-0000-0000-0000-000000000002' $$,
  '42501', null, 'DISCRIMINA: o Encarregado nao marca a exclusao por UPDATE direto (gatilho)'
);
select lives_ok(
  $$ update public.feriados set status = 'inativo' where id = 'a1526000-0000-0000-0000-000000000002' $$,
  'controle positivo: o Encarregado continua desativando a mesma linha'
);
select is(
  (select excluido_em from public.feriados where id = 'a1526000-0000-0000-0000-000000000002'),
  null,
  'a linha do Encarregado nao foi excluida'
);

-- ── sem sessao nao trava (RP-5) ──────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '', true);
select lives_ok(
  $$ update public.feriados set descricao = 'T152 da v2.0 (script)' where id = 'a1526000-0000-0000-0000-000000000001' $$,
  'script sem sessao nao e travado pelo gatilho (RP-5)'
);

-- ── nada se apaga ────────────────────────────────────────────────────────────────
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0, 'zero policy de DELETE no catalogo');

select * from finish();
rollback;
