-- =================================================================================
-- 131 — Spec 014, PR 5: a TRILHA DO ARBITRADO (condição da D5.3, Bernardo Villas Boas, 14/10/2026):
--       quem arbitrou, quando e o valor anterior — no item do curso e no ajuste por turma —, só de acréscimo.
--
-- ⚠️ A sessão simulada (`request.jwt.claim.sub`) aqui serve só para provar QUEM fica na trilha (autoria), nunca
--    permissão — que se prova em `tests/invariantes/rls/` (DoD 4).
-- =================================================================================
begin;
select plan(14);

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000131', 't131-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T131-USR-ADM', 'a0000000-0000-0000-0000-000000000131', 't131-admin@ciaara.teste', 'Admin T131', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000131', true);

select public.criar_curso_com_regime(
  '{"codigo":"T131-CUR","nome_curso":"Curso T131","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2045-01-01"}'::jsonb);
create temporary table _t131 as select id as curso_id from public.cursos where codigo = 'T131-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
  values ('instrumentos_avaliacao', 'PM', 'Prova Mista', '{"natureza":"prova"}') on conflict do nothing;
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20310000-0000-0000-0000-000000000001', 'T131-D1', (select curso_id from _t131), 'T131', 'Disciplina T131', 30);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50310000-0000-0000-0000-000000000001', (select curso_id from _t131), 'T1', 2045,
   'ativa', 'presencial', '2045-01-05', '2045-11-30');

-- O item do CURRÍCULO (D-4) e o item ARBITRADO pela Divisão.
insert into public.avaliacoes_curriculo (id, disciplina_id, curso_id, ordem, instrumento_id, numero, origem_item,
                                         ta_aplicacao, origem_ta_aplicacao, fonte_arquivo, fonte_pagina) values
  ('31310000-0000-0000-0000-000000000001', '20310000-0000-0000-0000-000000000001', (select curso_id from _t131), 1,
   (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 1, 'curriculo',
   2, 'curriculo', 'curriculo.pdf', 3),
  ('31310000-0000-0000-0000-000000000002', '20310000-0000-0000-0000-000000000001', (select curso_id from _t131), 2,
   (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 2, 'arbitrado',
   null, null, null, null);

-- ── estrutura ──
select ok((select relrowsecurity from pg_class where oid = 'public.avaliacoes_curriculo_arbitragens'::regclass),
  'R-10 · a trilha tem RLS');
select is(
  (select array_agg(polcmd::text order by polcmd) from pg_policy
    where polrelid = 'public.avaliacoes_curriculo_arbitragens'::regclass),
  array['r'], 'D5.3 · a trilha tem UMA policy, de leitura');
select ok(
  not has_table_privilege('authenticated', 'public.avaliacoes_curriculo_arbitragens', 'INSERT')
  and not has_table_privilege('authenticated', 'public.avaliacoes_curriculo_arbitragens', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.avaliacoes_curriculo_arbitragens', 'DELETE')
  and not has_table_privilege('authenticated', 'public.avaliacoes_curriculo_arbitragens', 'TRUNCATE'),
  'D5.3 · authenticated não escreve na trilha (revoke)');

-- ── o item do currículo NÃO entra; o arbitrado entra no INSERT ──
select is(
  (select count(*)::int from public.avaliacoes_curriculo_arbitragens
    where registro_id = '31310000-0000-0000-0000-000000000001'),
  0, 'D5.3 · o item do currículo carregado não é arbitrado: sem linha na trilha');
select results_eq(
  $$select operacao, antes, depois->>'origem_item', autor_id from public.avaliacoes_curriculo_arbitragens
     where registro_id = '31310000-0000-0000-0000-000000000002'$$,
  $$values ('INSERT'::text, null::jsonb, 'arbitrado'::text, 'a0000000-0000-0000-0000-000000000131'::uuid)$$,
  'D5.3 · criar o item arbitrado deixa linha: sem «antes», com quem arbitrou');

-- ── o tempo arbitrado no curso: o valor anterior fica ──
update public.avaliacoes_curriculo set ta_aplicacao = 3, origem_ta_aplicacao = 'arbitrado'
 where id = '31310000-0000-0000-0000-000000000002';
update public.avaliacoes_curriculo set ta_aplicacao = 4 where id = '31310000-0000-0000-0000-000000000002';
update public.avaliacoes_curriculo set ta_aplicacao = 4 where id = '31310000-0000-0000-0000-000000000002';
select results_eq(
  $$select (antes->>'ta_aplicacao')::int, (depois->>'ta_aplicacao')::int from public.avaliacoes_curriculo_arbitragens
     where registro_id = '31310000-0000-0000-0000-000000000002' and operacao = 'UPDATE'
     order by (depois->>'ta_aplicacao')::int$$,
  $$values (null::int, 3), (3, 4)$$,
  'D5.3 · cada mudança guarda o valor ANTERIOR; gravar o mesmo valor não é alteração');

-- ── o ajuste por turma: a sugestão da carga, sem sessão, e o arbitrado de quem confirma ──
select set_config('request.jwt.claim.sub', '', true);
insert into public.avaliacoes_curriculo_turma (id, avaliacao_curriculo_id, turma_id, ta_aplicacao, origem) values
  ('31315000-0000-0000-0000-000000000001', '31310000-0000-0000-0000-000000000001',
   '50310000-0000-0000-0000-000000000001', 5, 'sugestao_planilha');
select results_eq(
  $$select tabela, turma_id, autor_id from public.avaliacoes_curriculo_arbitragens
     where registro_id = '31315000-0000-0000-0000-000000000001'$$,
  $$values ('avaliacoes_curriculo_turma'::text, '50310000-0000-0000-0000-000000000001'::uuid, null::uuid)$$,
  'FR-031.8 · a sugestão da carga (sem sessão) deixa linha, com autor nulo — o rastro de que veio da carga');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000131', true);
update public.avaliacoes_curriculo_turma
   set origem = 'arbitrado', confirmado_em = '2045-03-01T12:00:00Z', ta_aplicacao = 6
 where id = '31315000-0000-0000-0000-000000000001';
select results_eq(
  $$select antes->>'origem', (antes->>'ta_aplicacao')::int, depois->>'origem', (depois->>'ta_aplicacao')::int, autor_id
      from public.avaliacoes_curriculo_arbitragens
     where registro_id = '31315000-0000-0000-0000-000000000001' and operacao = 'UPDATE'$$,
  $$values ('sugestao_planilha'::text, 5, 'arbitrado'::text, 6, 'a0000000-0000-0000-0000-000000000131'::uuid)$$,
  'D5.3 · arbitrar na turma: quem, o valor anterior (5, sugestão) e o novo (6, arbitrado)');
select ok(
  (select bool_and(curso_id = (select curso_id from _t131)) from public.avaliacoes_curriculo_arbitragens
    where avaliacao_curriculo_id in ('31310000-0000-0000-0000-000000000001', '31310000-0000-0000-0000-000000000002')),
  'D5.3 · toda linha leva o curso (é por ele que a leitura é recortada)');
select ok(
  (select bool_and(registrado_em is not null) from public.avaliacoes_curriculo_arbitragens),
  'D5.3 · toda linha leva o instante');

-- ── só de acréscimo, inclusive para o dono ──
select throws_ok($$update public.avaliacoes_curriculo_arbitragens set autor_id = null$$, '42501', null,
  'Regra 5 · UPDATE na trilha recusado');
select throws_ok($$delete from public.avaliacoes_curriculo_arbitragens$$, '42501', null,
  'Regra 5 · DELETE na trilha recusado');
select throws_ok($$truncate public.avaliacoes_curriculo_arbitragens$$, '42501', null,
  'Regra 5 · TRUNCATE na trilha recusado');
select ok(
  not has_function_privilege('authenticated', 'app.registrar_arbitragem()', 'EXECUTE'),
  'Gotcha 5.1 · a função de gatilho não é executável por authenticated');

select * from finish();
rollback;
