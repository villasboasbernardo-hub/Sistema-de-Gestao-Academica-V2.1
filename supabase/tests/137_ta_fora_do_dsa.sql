-- =================================================================================
-- 137 — Spec 017, Bloco 2 · M1 (`20261019114024_ta_fora_do_dsa_e_execucao`): TA FORA DO DSA, o SEM POSIÇÃO e o
-- NOME NO DSA.
--
-- D-COR-3 (Bernardo Villas Boas, 16/10/2026): *"Esses TA somam na CH executada e no saldo"*. O caso que discrimina
-- (DoD 8): 5 TA fora do DSA numa disciplina aparecem nas TRÊS somas da CHD e nas duas funções "até hoje", e a guarda
-- do 135 (as três batem) continua valendo COM a linha. A PEND-016-5: `sem_posicao` diz que o fato não ocupa a grade.
--
-- ⚠️ Quem pode gravar se prova em `tests/invariantes/rls/bloco-2.test.ts`, com sessão real. Aqui, estrutura e regra.
-- =================================================================================
begin;
select plan(27);

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

select public.criar_curso_com_regime(
  '{"codigo":"T137-CUR","nome_curso":"Curso T137","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _t137 as select id as curso_id from public.cursos where codigo = 'T137-CUR';

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('13700000-0000-0000-0000-000000000001', 'T137-D1', (select curso_id from _t137), 'T137', 'Disciplina T137', 40),
  ('13700000-0000-0000-0000-000000000002', 'T137-D2', (select curso_id from _t137), 'T137B', 'Outra T137', 20);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('13710000-0000-0000-0000-000000000001', 'T137-UE1', '13700000-0000-0000-0000-000000000001',
   (select curso_id from _t137), 1, 'Tópico T137', 40);
-- A turma nasce DEPOIS das disciplinas: o gatilho cria as duas linhas da turma.
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('13720000-0000-0000-0000-000000000001', (select curso_id from _t137), 'T1', 2047,
   'ativa', 'presencial', '2047-03-02', '2047-11-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('13730000-0000-0000-0000-000000000001', 'T137-INS', 'CT', '-EF', 'Instrutor T137', 'Militar', 'CIAARA');
create temporary table _l137 as
  select td.id as linha, td.disciplina_id
    from public.turma_disciplina td
   where td.turma_id = '13720000-0000-0000-0000-000000000001';

-- Uma aula COM posição (2 TA) e uma SEM (3 TA, o histórico), e 5 TA fora do DSA na mesma disciplina.
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
values
  ('T137-REG-COM', '2047-05-11', '13720000-0000-0000-0000-000000000001', (select curso_id from _t137),
   '13710000-0000-0000-0000-000000000001', '13730000-0000-0000-0000-000000000001', 2, 1),
  ('T137-REG-SEM', '2047-05-04', '13720000-0000-0000-0000-000000000001', (select curso_id from _t137),
   '13710000-0000-0000-0000-000000000001', '13730000-0000-0000-0000-000000000001', 3, null);
insert into public.ta_fora_do_dsa (turma_disciplina_id, turma_id, disciplina_id, data, tempos, observacao)
select linha, '13720000-0000-0000-0000-000000000001', disciplina_id, '2047-05-12', 5, 'Aula que virou EAD'
  from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000001';

-- ── a soma (o caso que discrimina) ──
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-12')
    where turma_id = '13720000-0000-0000-0000-000000000001'),
  10::bigint,
  'D-COR-3 · até o dia, a CHD da turma soma o fora do DSA: 2 + 3 + 5 = 10'
);
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-11')
    where turma_id = '13720000-0000-0000-0000-000000000001'),
  5::bigint,
  'D-COR-2 · e "até hoje" vale para ele: no dia anterior, o fora do DSA ainda não conta'
);
select is(
  (select ta_executados from public.execucao_por_disciplina_ate('2047-05-12', '13720000-0000-0000-0000-000000000001')
    where disciplina_id = '13700000-0000-0000-0000-000000000001'),
  10::bigint,
  'D-COR-3 · e na execução da disciplina'
);
select results_eq(
  $$select chd_executada, cht_executada, ta_fora_do_dsa from public.vw_carga_horaria_turma
     where turma_id = '13720000-0000-0000-0000-000000000001'$$,
  $$values (10::bigint, 10::bigint, 5::bigint)$$,
  'D-COR-3 · vw_carga_horaria_turma: chd e cht somam os 5, e ta_fora_do_dsa os separa'
);
select results_eq(
  $$select ta_executados, ta_saldo, ta_fora_do_dsa, data_real_inicio from public.vw_disciplinas_execucao
     where turma_id = '13720000-0000-0000-0000-000000000001' and disciplina_id = '13700000-0000-0000-0000-000000000001'$$,
  $$values (10::bigint, 30::bigint, 5::bigint, '2047-05-04'::date)$$,
  'D-COR-3 · vw_disciplinas_execucao: executados 10, saldo 40 − 10, os 5 separados'
);

-- ── a guarda do 135 continua valendo COM fora do DSA ──
select is(
  (select count(*)::int
     from public.vw_carga_horaria_turma v
     left join public.chd_da_turma_ate('9999-12-31') f on f.turma_id = v.turma_id
    where coalesce(f.chd_executada, 0) <> coalesce(v.chd_executada, 0)),
  0,
  'P-3 · sem corte, a base = vw_carga_horaria_turma em toda turma, com TA fora do DSA'
);
select is(
  (select count(*)::int
     from public.vw_disciplinas_execucao v
     left join lateral public.execucao_por_disciplina_ate('9999-12-31', v.turma_id) f
       on f.disciplina_id = v.disciplina_id
    where coalesce(f.ta_executados, 0) <> coalesce(v.ta_executados, 0)),
  0,
  'P-3 · e = vw_disciplinas_execucao em toda turma × disciplina'
);

-- ── PEND-016-5: sem_posicao ──
select results_eq(
  $$select origem, sem_posicao, tempos from public.vw_chd_por_fato
     where turma_id = '13720000-0000-0000-0000-000000000001' order by data$$,
  $$values ('aula'::text, true, 3::bigint), ('aula', false, 2::bigint), ('fora_do_dsa', true, 5::bigint)$$,
  'PEND-016-5 · sem ta_inicial e fora do DSA são sem posição; com ta_inicial, não'
);

-- ── o guarda da linha ──
select is(
  pg_temp.recusa($$insert into public.ta_fora_do_dsa (turma_disciplina_id, turma_id, disciplina_id, data, tempos, observacao)
    select linha, '13720000-0000-0000-0000-000000000001', '13700000-0000-0000-0000-000000000001', '2047-05-12', 1, 'Errado'
      from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000002'$$) ->> 'hint',
  'ta_fora_linha_divergente',
  'guarda · a disciplina tem de ser a da linha'
);
update public.turma_disciplina set status = 'inativo'
 where id = (select linha from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000002');
select is(
  pg_temp.recusa($$insert into public.ta_fora_do_dsa (turma_disciplina_id, turma_id, disciplina_id, data, tempos, observacao)
    select linha, '13720000-0000-0000-0000-000000000001', disciplina_id, '2047-05-12', 1, 'Linha inativa'
      from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000002'$$) ->> 'hint',
  'ta_fora_linha_inativa',
  'guarda · a linha inativa não recebe TA fora do DSA'
);
select is(
  pg_temp.recusa($$update public.ta_fora_do_dsa set tempos = 3 where observacao = 'Aula que virou EAD'$$) ->> 'hint',
  'ta_fora_so_desfaz',
  'sem ajuste · a quantidade não se edita'
);
select is(
  pg_temp.recusa($$update public.ta_fora_do_dsa set observacao = 'Outra' where observacao = 'Aula que virou EAD'$$) ->> 'hint',
  'ta_fora_so_desfaz',
  'e a observação também não'
);
select is(
  pg_temp.recusa($$insert into public.ta_fora_do_dsa (turma_disciplina_id, turma_id, disciplina_id, data, tempos, observacao)
    select linha, '13720000-0000-0000-0000-000000000001', disciplina_id, '2047-05-12', 0, 'Zero'
      from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '23514',
  'sem ajuste negativo · quantidade 0 é recusada pelo banco'
);
select is(
  pg_temp.recusa($$insert into public.ta_fora_do_dsa (turma_disciplina_id, turma_id, disciplina_id, data, tempos, observacao)
    select linha, '13720000-0000-0000-0000-000000000001', disciplina_id, '2047-05-12', 1, '  '
      from _l137 where disciplina_id = '13700000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '23514',
  'D-COR-3 · observação obrigatória: em branco é recusada'
);

-- desfazer: sai das somas
update public.ta_fora_do_dsa set status = 'inativo' where observacao = 'Aula que virou EAD';
select is(
  (select chd_executada from public.vw_carga_horaria_turma where turma_id = '13720000-0000-0000-0000-000000000001'),
  5::bigint,
  'desfazer · o registro desfeito sai das somas'
);
select is(
  pg_temp.recusa($$update public.ta_fora_do_dsa set status = 'ativo' where observacao = 'Aula que virou EAD'$$) ->> 'hint',
  'ta_fora_so_desfaz',
  'desfazer não tem volta: corrigir é registrar de novo'
);
select ok(
  (select codigo ~ '^TFD-[0-9]{6}$' from public.ta_fora_do_dsa where observacao = 'Aula que virou EAD'),
  'o código TFD- nasce do banco'
);

-- ── a estrutura ──
select is(
  (select count(*)::int from pg_class
    where oid in ('public.vw_chd_por_fato'::regclass, 'public.vw_carga_horaria_turma'::regclass,
                  'public.vw_disciplinas_execucao'::regclass)
      and reloptions @> array['security_invoker=true']),
  3,
  'Gotcha 10 · as três views recriadas continuam security_invoker'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_chd_por_fato'::regclass and attnum > 0 and not attisdropped),
  array['turma_id', 'disciplina_id', 'data', 'tempos', 'origem', 'sem_posicao'],
  'as colunas de antes na mesma ordem, e sem_posicao no fim'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_carga_horaria_turma'::regclass and attnum > 0 and not attisdropped),
  array['turma_id', 'turma_codigo', 'curso_id', 'curso_codigo', 'nome_curso', 'ano_letivo', 'status_turma',
        'chr_curricular', 'ta_aula', 'ta_extraclasse', 'ta_avaliacao', 'ta_vista_prova', 'chd_executada', 'ta_aec',
        'ta_tad', 'ta_tr', 'ta_estudo_individual', 'cht_executada', 'ta_apoio_individualizado', 'ta_dias_parados',
        'ta_fora_do_dsa'],
  'vw_carga_horaria_turma: as 20 de antes e ta_fora_do_dsa no fim'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_disciplinas_execucao'::regclass and attnum > 18 and not attisdropped),
  array['ta_fora_do_dsa', 'nome_no_dsa'],
  'vw_disciplinas_execucao: as duas colunas novas no fim'
);
select is(
  pg_temp.recusa($$update public.disciplinas set nome_no_dsa = repeat('A', 61)
                   where id = '13700000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '23514',
  'o nome no DSA: o banco guarda até 60'
);
select is(
  (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
    where recurso = 'ta_fora_do_dsa' and acao = 'editar' and permitido),
  array['admin', 'ajudante_administracao_academica', 'encarregado_administracao_academica'],
  'D-COR-3 · só o trio registra TA fora do DSA'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.ta_fora_do_dsa'::regclass),
  'a tabela nasce com RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.ta_fora_do_dsa', 'DELETE')
  and not has_table_privilege('authenticated', 'public.ta_fora_do_dsa', 'TRUNCATE')
  and not has_table_privilege('anon', 'public.ta_fora_do_dsa', 'DELETE'),
  'Regra 4 · sem DELETE e sem TRUNCATE'
);
select ok(
  lower(regexp_replace(pg_get_viewdef('public.vw_chd_por_fato'::regclass), '--[^\n]*', '', 'g'))
    !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)',
  'D20 · a base não lê o relógio do servidor'
);
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE no catálogo'
);

select * from finish();
rollback;
