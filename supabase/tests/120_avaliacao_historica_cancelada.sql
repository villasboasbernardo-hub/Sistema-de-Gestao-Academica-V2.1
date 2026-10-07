-- =================================================================================
-- 120 — A avaliação histórica CANCELADA dispensa a catraca de TA (migration 20261006225009)
--
-- O QUÊ  : a linha migrada da v2.0 com TA e sem tempos (a exceção que o comentário da restrição já
--          nomeava) pode ser cancelada pela carga da planilha de controle; a avaliação ativa, histórica
--          ou nova, continua obrigada a TA e tempos juntos; a linha nova cancelada não escapa.
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8): cancelar a linha histórica incoerente — reprovava com `23514` antes.
-- =================================================================================

begin;
select plan(6);

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000120', 't120-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T120-USR-ADM', 'a0000000-0000-0000-0000-000000000120', 't120-admin@ciaara.teste', 'Admin T120', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000120', true);

select public.criar_curso_com_regime(
  '{"codigo":"T120-CUR","nome_curso":"Curso T120","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2044-01-01"}'::jsonb);
create temporary table _t120 as select id as curso_id from public.cursos where codigo = 'T120-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T120', 'Prova T120');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20200000-0000-0000-0000-000000000001', 'T120-D1', (select curso_id from _t120), 'T120', 'Disciplina T120', 30);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50200000-0000-0000-0000-000000000001', (select curso_id from _t120), 'T1', 2044,
   'ativa', 'presencial', '2044-01-05', '2044-11-30');

-- a linha HISTORICA incoerente (TA sem tempos), como o ETL a trouxe — entra porque ainda nao foi editada
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos, origem_migracao_v1)
values ('T120-AVA-H', '50200000-0000-0000-0000-000000000001', '20200000-0000-0000-0000-000000000001',
        (select curso_id from _t120), 'Prova T120', '2044-04-10', 3, null, 'Avaliacao:T120');
select is((select count(*) from public.avaliacoes where codigo = 'T120-AVA-H'), 1::bigint,
  'controle: a linha historica incoerente entra, porque ainda nao foi editada');

select lives_ok(
  $$update public.avaliacoes set status = 'cancelada', observacoes = '[SUBSTITUIDO PELA PLANILHA DE CONTROLE] (status anterior: pendente)' where codigo = 'T120-AVA-H'$$,
  '⚠️ o caso que discrimina: cancelar a linha historica incoerente PASSA (reprovava com 23514 antes da emenda)');

select throws_ok(
  $$update public.avaliacoes set status = 'pendente' where codigo = 'T120-AVA-H'$$,
  '23514', null,
  'reativar a linha historica incoerente e recusado: a saida so vale enquanto cancelada');

select throws_ok(
  $$update public.avaliacoes set status = 'concluida', ta_inicial = 2, tempos_consumidos = null where codigo = 'T120-AVA-H'$$,
  '23514', null,
  'avaliacao historica ATIVA editada continua obrigada a TA e tempos juntos');

select throws_ok(
  $$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos, status)
    values ('T120-AVA-N', '50200000-0000-0000-0000-000000000001', '20200000-0000-0000-0000-000000000001',
            (select curso_id from _t120), 'Prova T120', '2044-05-10', 3, null, 'cancelada')$$,
  '23514', null,
  'linha NOVA cancelada e incoerente nao escapa: a saida exige procedencia de ETL');

select is(
  (select obj_description(oid, 'pg_constraint') like '%CANCELADA%' from pg_constraint where conname = 'aval_ta_coerente'),
  true, 'o comentario da restricao foi reescrito e nomeia a saida');

select * from finish();
rollback;
