-- =================================================================================
-- 146 — Spec 021, Bloco 6, PR 2 (`20261021201915_horarios_do_curriculo`): os HORÁRIOS são do CURRÍCULO (emenda à RC-1,
-- Bernardo Villas Boas, 21/10/2026) — e a linha gravada SEM currículo não escapa da RC-6.
--
-- Os casos que discriminam (DoD 8): o regime nasce no currículo, a cópia leva o regime com a linhagem, o nome se repete
-- em currículos diferentes e não no mesmo, a turma que troca de currículo leva o regime pelo correspondente e não
-- aponta regime de outro currículo; no currículo em uso, mudar o regime pede justificativa; e a disciplina gravada sem
-- `curriculo_id` num currículo em uso é recusada sem justificativa (antes do conserto na M4, passava).
-- =================================================================================
begin;
select plan(14);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint);
end;
$f$;
create function pg_temp.justificar(p_texto text) returns void language sql as $f$
  select set_config('request.headers',
                    jsonb_build_object('x-justificativa-de-correcao', encode(convert_to(p_texto, 'UTF8'), 'base64'))::text,
                    true);
$f$;

insert into auth.users (id, email, aud, role) values
  ('a1460000-0000-0000-0000-000000000001', 't146-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T146-ADM', 'a1460000-0000-0000-0000-000000000001', 't146-admin@ciaara.teste', 'Admin T146', 'admin', 'geral');

-- ── estrutura ──
select ok(
  (select is_nullable = 'NO' from information_schema.columns
    where table_schema = 'public' and table_name = 'regimes_de_horario' and column_name = 'curriculo_id')
  and exists (select 1 from pg_constraint where conname = 'turmas_regime_do_proprio_curriculo_fk')
  and exists (select 1 from pg_constraint where conname = 'regimes_de_horario_do_curriculo_do_curso_fk'),
  'o regime é do currículo (coluna obrigatória), e a turma só aponta regime do currículo dela (FK composta)');
select is(
  (select count(*)::int from pg_trigger
    where tgname in ('trg_regimes_de_horario_versao', 'trg_regimes_de_horario_curriculo_em_uso',
                     'trg_turmas_curriculo_regime') and not tgisinternal),
  3, 'os três gatilhos novos: sem currículo vai ao único ativo, a RC-6 nos horários, a troca leva o regime');

-- ── a amostra: um curso, o currículo 1, um regime, duas turmas (uma com lançamento) ──
select public.criar_curso_com_regime(
  '{"codigo":"T146-CUR","nome_curso":"Curso T146","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
create temporary table _c as select id from public.cursos where codigo = 'T146-CUR';
create temporary table _v1 as select c.id from public.curriculos c where c.curso_id = (select id from _c) and c.versao = 1;
update public.curriculos set vigente_de = date '2046-01-01' where id = (select id from _v1);
insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select id, 'I', 'Disciplina I', 40 from _c;
insert into public.regimes_de_horario (id, curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min,
                                       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde)
values ('14600000-0000-0000-0000-000000000001', (select id from _c), 'Regime B', 9, 45, 5, 5, '07:15', '13:15');
select is((select curriculo_id from public.regimes_de_horario where id = '14600000-0000-0000-0000-000000000001'),
          (select id from _v1), 'o regime gravado sem currículo vai para o único ativo do curso — o currículo 1');

insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo,
                           regime_de_horario_id)
values ((select id from _c), 2046, 'T1', 'presencial', 'planejada', date '2046-02-01', date '2046-11-30',
        'T146-CUR T1 2046', '14600000-0000-0000-0000-000000000001'),
       ((select id from _c), 2046, 'T2', 'presencial', 'ativa', date '2046-02-01', date '2046-11-30',
        'T146-CUR T2 2046', '14600000-0000-0000-0000-000000000001');
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem)
select 'tipos_avaliacao', 'Prova Escrita', 'Prova Escrita', 1
 where not exists (select 1 from public.config_listas where lista = 'tipos_avaliacao' and valor = 'Prova Escrita');
insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, status)
values ('T146-INS', 'CT', '-EF', 'Instrutor T146', 'Militar', 'OM-T146', 'ativo');
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao,
                               instrutor_responsavel_id)
select 'T146-AVL', (select id from public.turmas where codigo = 'T146-CUR T2 2046'), d.id, d.curso_id, 'Prova Escrita',
       '2046-03-10', (select id from public.instrutores where codigo = 'T146-INS')
  from public.disciplinas d where d.curriculo_id = (select id from _v1) and d.cod_disciplina = 'I';
select is(app.curriculo_em_uso_com_lancamento((select id from _v1)), true, 'o currículo 1 está em uso (a T2 lançou)');

-- ── a cópia leva o regime (RC-7 com os horários) ──
select set_config('request.jwt.claim.sub', 'a1460000-0000-0000-0000-000000000001', true);
create temporary table _v2 as
  select public.criar_curriculo((select id from _c), date '2047-01-01', 'T146', date '2046-10-21') as id;
select results_eq(
  $$select r2.nome, r2.regime_tempos::int, r2.linhagem_id = r1.linhagem_id, r2.id <> r1.id
      from public.regimes_de_horario r2
      join public.regimes_de_horario r1 on r1.id = '14600000-0000-0000-0000-000000000001'
     where r2.curriculo_id = (select id from _v2)$$,
  $$values ('Regime B'::text, 9, true, true)$$,
  'a cópia leva o regime: o mesmo nome e TA/dia, a mesma linhagem, outro registro');

-- ── o nome é único no currículo, e se repete entre currículos ──
select set_config('request.jwt.claim.sub', '', true);
select is(
  pg_temp.recusa($$insert into public.regimes_de_horario (curso_id, curriculo_id, nome, regime_tempos, ta_duracao_min,
                     intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde)
                   values ((select id from _c), (select id from _v1), 'regime b', 8, 45, 10, 10, '07:30', '13:30')$$)
    ->> 'sqlstate',
  '23505', 'o nome do regime é único entre os ativos do MESMO currículo (e existe no 1 e no 2)');

-- ── a turma e o regime do currículo dela ──
update public.turmas set curriculo_id = (select id from _v2) where codigo = 'T146-CUR T1 2046';
select is(
  (select r.curriculo_id from public.turmas t join public.regimes_de_horario r on r.id = t.regime_de_horario_id
    where t.codigo = 'T146-CUR T1 2046'),
  (select id from _v2), 'a turma sem lançamento que troca de currículo leva o regime pelo correspondente');
select is(
  pg_temp.recusa($$update public.turmas set regime_de_horario_id = '14600000-0000-0000-0000-000000000001'
                    where codigo = 'T146-CUR T1 2046'$$) ->> 'sqlstate',
  '23503', 'a turma não aponta regime de outro currículo (o do currículo 1, estando no 2)');
-- Inativar exige `horarios.desativar` (o guarda do Bloco 3 falha fechado sem sessão): o Admin inativa o regime do 2.
select set_config('request.jwt.claim.sub', 'a1460000-0000-0000-0000-000000000001', true);
update public.regimes_de_horario set status = 'inativo'
 where curriculo_id = (select id from _v2);
select set_config('request.jwt.claim.sub', '', true);
update public.turmas set regime_de_horario_id = null where codigo = 'T146-CUR T1 2046';
update public.turmas set curriculo_id = (select id from _v1) where codigo = 'T146-CUR T1 2046';
update public.turmas set regime_de_horario_id = '14600000-0000-0000-0000-000000000001' where codigo = 'T146-CUR T1 2046';
update public.turmas set curriculo_id = (select id from _v2) where codigo = 'T146-CUR T1 2046';
select is((select regime_de_horario_id from public.turmas where codigo = 'T146-CUR T1 2046'), null::uuid,
  'sem correspondente ativo no currículo novo, a turma volta ao regime vigente do curso (nulo)');
select is(
  pg_temp.recusa($$update public.regimes_de_horario set curriculo_id = (select id from _v2)
                    where id = '14600000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_curricular_imutavel', 'o regime não muda de currículo');

-- ── RC-6 nos horários do currículo em uso ──
select set_config('request.jwt.claim.sub', 'a1460000-0000-0000-0000-000000000001', true);
select set_config('request.headers', '{}', true);
select is(
  pg_temp.recusa($$update public.regimes_de_horario set nome = 'Regime B (9 TA)'
                    where id = '14600000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'justificativa_obrigatoria', 'RC-6 · no currículo em uso, mudar o regime pede justificativa — também ao Admin');
select pg_temp.justificar('O regime B é o de 9 TA da página 4');
select is(
  pg_temp.recusa($$update public.regimes_de_horario set nome = 'Regime B (9 TA)'
                    where id = '14600000-0000-0000-0000-000000000001'$$) ->> 'recusou',
  'false', 'RC-6 · com justificativa, o Admin corrige');
select is(
  (select count(*)::int from public.correcoes_de_curriculo
    where tabela = 'regimes_de_horario' and registro_id = '14600000-0000-0000-0000-000000000001'),
  1, 'RC-6 · e a trilha registra a correção do regime');

-- ── a linha gravada SEM currículo, num curso de currículo único em uso, não escapa da RC-6 ──
select public.criar_curso_com_regime(
  '{"codigo":"T146-UM","nome_curso":"Um T146","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
select set_config('request.jwt.claim.sub', '', true);
insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select id, 'I', 'Disciplina I do Um', 40 from public.cursos where codigo = 'T146-UM';
insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2046, 'T1', 'presencial', 'ativa', date '2046-02-01', date '2046-11-30', 'T146-UM T1 2046'
  from public.cursos where codigo = 'T146-UM';
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao,
                               instrutor_responsavel_id)
select 'T146-AVL-UM', t.id, d.id, d.curso_id, 'Prova Escrita', '2046-03-10',
       (select id from public.instrutores where codigo = 'T146-INS')
  from public.turmas t join public.disciplinas d on d.curso_id = t.curso_id
 where t.codigo = 'T146-UM T1 2046';
select set_config('request.jwt.claim.sub', 'a1460000-0000-0000-0000-000000000001', true);
select set_config('request.headers', '{}', true);
select is(
  pg_temp.recusa($$insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
                   select id, 'II', 'Disciplina II do Um', 20 from public.cursos where codigo = 'T146-UM'$$) ->> 'hint',
  'justificativa_obrigatoria',
  'RC-6 · a disciplina gravada SEM currículo num currículo em uso pede justificativa (o guarda não depende da ordem)');

select * from finish();
rollback;
