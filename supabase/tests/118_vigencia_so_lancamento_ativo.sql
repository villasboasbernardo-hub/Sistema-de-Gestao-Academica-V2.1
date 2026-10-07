-- =================================================================================
-- 118 — Só o lançamento ATIVO trava a vigência de regime (emenda à RN-2027-09 / FR-021.2)
--
-- O QUÊ  : `app.lancamentos_que_travam_vigencia` ignora aula e atividade `inativo` e avaliação
--          `cancelada`; o lançamento ativo continua travando, nas três tabelas, pela vista de prova
--          e pela atividade global; reativar volta a travar.
--          Migration `20261006210242` · decisão de Bernardo Villas Boas, 06/10/2026 (VIRADA-1).
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8) é o da linha INATIVA que deixa de travar: com a função anterior
--    ele reprova (a recusa vinha com `vigencia_com_lancamento` e total 1). Os negativos — linha
--    ativa trava — passam antes e depois, e existem para que a emenda não afrouxe mais do que diz.
-- =================================================================================

begin;
select plan(14);

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000118', 't118-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T118-USR-ADM', 'a0000000-0000-0000-0000-000000000118', 't118-admin@ciaara.teste', 'Admin T118', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000118', true);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
  v_detail text;
  v_json jsonb;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_detail = pg_exception_detail;
  begin
    v_json := nullif(v_detail, '')::jsonb;
  exception when others then
    v_json := to_jsonb(v_detail);
  end;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint, 'detail', v_json);
end;
$f$;

-- A pergunta de todo caso: a vigência da amostra está travada, e por quê?
create function pg_temp.trava() returns text
language sql as $f$
  select coalesce(
    (select tipo || ':' || total
       from app.lancamentos_que_travam_vigencia(
              (select id from public.curso_regime_historico
                where curso_id = (select id from public.cursos where codigo = 'T118-CUR')
                  and status = 'ativo'),
              '2042-01-01')),
    'livre');
$f$;

select public.criar_curso_com_regime(
  '{"codigo":"T118-CUR","nome_curso":"Curso T118","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2042-01-01"}'::jsonb);
create temporary table _t118 as select id as curso_id from public.cursos where codigo = 'T118-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T118', 'Prova T118');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20180000-0000-0000-0000-000000000001', 'T118-D1', (select curso_id from _t118), 'T118', 'Disciplina T118', 30);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('30180000-0000-0000-0000-000000000001', 'T118-UE1', '20180000-0000-0000-0000-000000000001',
   (select curso_id from _t118), 1, 'Unidade T118', 30);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('40180000-0000-0000-0000-000000000001', 'T118-INS', 'CT', '-EF', 'Instrutor T118', 'Militar', 'CIAARA');
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50180000-0000-0000-0000-000000000001', (select curso_id from _t118), 'T1', 2042,
   'ativa', 'presencial', '2042-01-05', '2042-11-30');

select is(pg_temp.trava(), 'livre', 'controle: curso sem lançamento, vigência livre');

-- ------------------------------------------------------------------ aula
insert into public.registros_aula
  (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial, categoria_normativa, instrutor_id)
values ('T118-REG-1', '2042-03-10', '50180000-0000-0000-0000-000000000001',
        '30180000-0000-0000-0000-000000000001', (select curso_id from _t118), 2, 1,
        'aula', '40180000-0000-0000-0000-000000000001');
select is(pg_temp.trava(), 'aula:1', 'negativo · aula ATIVA trava');

update public.registros_aula set status = 'inativo' where codigo = 'T118-REG-1';
select is(pg_temp.trava(), 'livre', '⚠️ o caso que discrimina · aula INATIVA não trava');
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime(
     (select id from public.curso_regime_historico where curso_id = (select curso_id from _t118) and status = 'ativo'),
     '{"regime_tempos":7,"hora_inicio_manha":"08:10"}'::jsonb)$$) ->> 'recusou')::boolean,
  false,
  'e a correção da vigência PASSA com só lançamento inativo no curso — o caminho que a carga da planilha usa');

update public.registros_aula set status = 'ativo' where codigo = 'T118-REG-1';
select is(pg_temp.trava(), 'aula:1', 'reativar a aula volta a travar — o critério é o estado de agora');
update public.registros_aula set status = 'inativo' where codigo = 'T118-REG-1';

-- ------------------------------------------------------------------ avaliação e vista
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, data_vista_prova) values
  ('T118-AVA-1', '50180000-0000-0000-0000-000000000001', '20180000-0000-0000-0000-000000000001',
   (select curso_id from _t118), 'Prova T118', '2042-04-10', '2042-04-12');
select is(pg_temp.trava(), 'avaliacao:2', 'negativo · avaliação ATIVA trava, pela aplicação e pela vista (2)');

update public.avaliacoes set status = 'cancelada' where codigo = 'T118-AVA-1';
select is(pg_temp.trava(), 'livre', '⚠️ avaliação CANCELADA não trava — nem pela aplicação, nem pela vista');

update public.avaliacoes set status = 'pendente' where codigo = 'T118-AVA-1';
select is(pg_temp.trava(), 'avaliacao:2', 'avaliação de volta a pendente volta a travar');
update public.avaliacoes set status = 'cancelada' where codigo = 'T118-AVA-1';

-- ------------------------------------------------------------------ atividade da turma
insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id) values
  ('T118-ATV-1', 'AEC', '2042-06-10', 'Atividade da turma T118', 2, 'turma', '50180000-0000-0000-0000-000000000001');
select is(pg_temp.trava(), 'atividade:1', 'negativo · atividade da turma ATIVA trava');
update public.atividades_nao_letivas set status = 'inativo' where codigo = 'T118-ATV-1';
select is(pg_temp.trava(), 'livre', '⚠️ atividade da turma INATIVA não trava');

-- ------------------------------------------------------------------ atividade global
insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo) values
  ('T118-GLOB-1', 'TAD', '2042-07-15', 'Formatura do Centro', 4, 'global');
select is(pg_temp.trava(), 'atividade_global:1', 'negativo · atividade GLOBAL ativa alcança o curso pela janela da turma (FR-021.5)');
update public.atividades_nao_letivas set status = 'inativo' where codigo = 'T118-GLOB-1';
select is(pg_temp.trava(), 'livre', '⚠️ atividade GLOBAL inativa não alcança');

-- ------------------------------------------------------------------ a soma
update public.registros_aula set status = 'ativo' where codigo = 'T118-REG-1';
update public.avaliacoes set status = 'pendente' where codigo = 'T118-AVA-1';
update public.atividades_nao_letivas set status = 'ativo' where codigo in ('T118-ATV-1', 'T118-GLOB-1');
select is(pg_temp.trava(), 'aula:5', 'com tudo ativo, o total soma as cinco pontas (aula, aplicação, vista, atividade, global)');

-- ------------------------------------------------------------------ a ACL não mudou
select results_eq(
  $$select r.rolname from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(p.proacl) a
      join pg_roles r on r.oid = a.grantee
     where n.nspname = 'app' and p.proname = 'lancamentos_que_travam_vigencia'
     order by 1$$,
  $$values ('authenticated'::name), ('postgres'::name), ('service_role'::name)$$,
  'a ACL da função é a mesma de antes da emenda — anon e public sem execute'
);

select * from finish();
rollback;
