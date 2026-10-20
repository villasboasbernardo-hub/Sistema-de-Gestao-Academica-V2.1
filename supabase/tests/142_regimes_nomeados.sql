-- =================================================================================
-- 142 — Spec 018, Bloco 3 (`20261020025815_regimes_nomeados_por_curso`): os REGIMES NOMEADOS e a ESCOLHA DA TURMA.
--
-- O caso que discrimina (DoD 8): a turma COM o regime de 9 TA e um dia parado de dia inteiro conta 9 TA em
-- `vw_dias_parados_turma`; a outra turma do mesmo curso, SEM escolha, conta os 8 do regime vigente do curso — como
-- antes da migration. E as travas: TA/dia e duração imutáveis (RF-HOR-02); relógio e escolha travados depois do
-- primeiro lançamento (RF-HOR-05); regime de outro curso recusado pela FK composta; regime inativo não se escolhe.
--
-- ⚠️ Quem pode criar, editar e inativar se prova em `tests/invariantes/rls/regimes-nomeados.test.ts`, com sessão
--    real. Aqui, estrutura e regra — e o porteiro de inativar falhando FECHADO sem sessão (gotcha 15).
-- =================================================================================
begin;
select plan(24);

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

-- ── estrutura ──
select ok(
  (select relrowsecurity from pg_class where oid = 'public.regimes_de_horario'::regclass),
  'a tabela nova tem RLS ligada'
);
select ok(
  not has_table_privilege('authenticated', 'public.regimes_de_horario', 'DELETE')
  and not has_table_privilege('authenticated', 'public.regimes_de_horario', 'TRUNCATE'),
  'Regra 4 · authenticated não apaga nem esvazia regime'
);
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE no catálogo'
);
select ok(
  (select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.vw_dias_parados_turma'::regclass),
  'gotcha 10 · a view recriada continua security_invoker'
);
select is(
  (select count(*)::int
     from pg_trigger tg join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'public.turmas'::regclass and not tg.tgisinternal
      and p.prosrc ~* 'status' and p.prosrc ~* 'raise'),
  0,
  'a guarda do 101/138 continua: o gatilho novo de turmas não recusa por situação'
);
select ok(
  not has_function_privilege('authenticated', 'app.turma_tem_lancamento_no_dsa(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.regime_em_uso_com_lancamento(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.regime_da_turma_travado(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.regime_da_turma_travado(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.regime_de_horario_em_uso(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.regime_de_horario_em_uso(uuid)', 'EXECUTE'),
  'as funções de apoio ficam em app, fechadas; as duas leituras da tela, só para authenticated'
);
select ok(
  (select bool_and(lower(regexp_replace(prosrc, '--[^\n]*', '', 'g'))
                   !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)')
     from pg_proc
    where oid in ('app.turma_tem_lancamento_no_dsa(uuid)'::regprocedure,
                  'app.regime_em_uso_com_lancamento(uuid)'::regprocedure,
                  'app.guardar_regime_de_horario()'::regprocedure,
                  'app.guardar_regime_da_turma()'::regprocedure)),
  'D20 · as travas não leem o relógio do servidor'
);

-- ── a amostra: um curso com padrão de 8 TA, duas turmas, um regime de 9 ──
select public.criar_curso_com_regime(
  '{"codigo":"T142-CUR","nome_curso":"Curso T142","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
select public.criar_curso_com_regime(
  '{"codigo":"T142-OUT","nome_curso":"Outro T142","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _c142 as
  select (select id from public.cursos where codigo = 'T142-CUR') as curso,
         (select id from public.cursos where codigo = 'T142-OUT') as outro;

insert into public.regimes_de_horario
  (id, curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min,
   hora_inicio_manha, hora_inicio_tarde)
values
  ('14200000-0000-0000-0000-000000000001', (select curso from _c142), 'Regime B', 9, 45, 5, 5, '07:15', '13:15'),
  ('14200000-0000-0000-0000-000000000002', (select outro from _c142), 'Regime do outro', 9, 45, 5, 5, '07:15', '13:15');
insert into public.regimes_de_horario
  (id, curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min,
   hora_inicio_manha, hora_inicio_tarde, status)
values
  ('14200000-0000-0000-0000-000000000003', (select curso from _c142), 'Regime velho', 8, 45, 10, 10, '07:30', '13:30',
   'inativo');

insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('14210000-0000-0000-0000-000000000001', (select curso from _c142), 'T1', 2047, 'ativa', 'presencial',
   '2047-03-02', '2047-11-30'),
  ('14210000-0000-0000-0000-000000000002', (select curso from _c142), 'T2', 2047, 'ativa', 'presencial',
   '2047-03-02', '2047-11-30');

select ok(
  (select codigo ~ '^RGH-[0-9]{6}$' from public.regimes_de_horario where id = '14200000-0000-0000-0000-000000000001'),
  'o código RGH- é gerado pelo banco'
);
select is(
  pg_temp.recusa($$insert into public.regimes_de_horario
      (curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min,
       hora_inicio_manha, hora_inicio_tarde)
    values ((select curso from _c142), ' regime b ', 8, 45, 10, 10, '07:30', '13:30')$$) ->> 'sqlstate',
  '23505',
  'o nome é único entre os ATIVOS do curso, sem diferença de maiúscula nem de espaço nas pontas'
);

-- ── RF-HOR-02: TA por dia e duração não mudam ──
select is(
  pg_temp.recusa($$update public.regimes_de_horario set regime_tempos = 10
                   where id = '14200000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_curricular_imutavel',
  'RF-HOR-02 · a quantidade de TA por dia é imutável'
);
select is(
  pg_temp.recusa($$update public.regimes_de_horario set ta_duracao_min = 50
                   where id = '14200000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_curricular_imutavel',
  'RF-HOR-02 · a duração do TA é imutável'
);
select is(
  pg_temp.recusa($$update public.regimes_de_horario set status = 'inativo'
                   where id = '14200000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '42501',
  'gotcha 15 · sem sessão, inativar é recusado (o porteiro falha FECHADO)'
);

-- ── a escolha da turma ──
select is(
  pg_temp.recusa($$update public.turmas set regime_de_horario_id = '14200000-0000-0000-0000-000000000002'
                   where id = '14210000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '23503',
  'FK composta · a turma não escolhe regime de OUTRO curso'
);
select is(
  pg_temp.recusa($$update public.turmas set regime_de_horario_id = '14200000-0000-0000-0000-000000000003'
                   where id = '14210000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_inativo',
  'a turma não escolhe regime inativo'
);
select lives_ok(
  $$update public.turmas set regime_de_horario_id = '14200000-0000-0000-0000-000000000001'
     where id = '14210000-0000-0000-0000-000000000001'$$,
  'sem lançamento, a turma escolhe o Regime B'
);
select lives_ok(
  $$update public.regimes_de_horario set hora_inicio_manha = '07:00', intervalo_manha_min = 0
     where id = '14200000-0000-0000-0000-000000000001'$$,
  'RF-HOR-02 · sem lançamento nas turmas que o usam, o relógio do regime é editável'
);

-- ── o caso que discrimina: o dia parado de dia inteiro pelo regime da turma ──
insert into public.dias_parados (turma_id, data, tipo_parada_id, motivo)
select t.id, '2047-05-11', (select id from public.config_listas where lista = 'tipos_parada' and valor = 'LA'),
       'Parada T142'
  from (values ('14210000-0000-0000-0000-000000000001'::uuid), ('14210000-0000-0000-0000-000000000002'::uuid)) t(id);

select results_eq(
  $$select turma_id::text, tempos from public.vw_dias_parados_turma
     where turma_id in ('14210000-0000-0000-0000-000000000001', '14210000-0000-0000-0000-000000000002')
     order by turma_id$$,
  $$values ('14210000-0000-0000-0000-000000000001'::text, 9::bigint),
           ('14210000-0000-0000-0000-000000000002', 8::bigint)$$,
  'o caso que discrimina · dia inteiro parado: 9 TA na turma do Regime B, 8 na que não escolheu (o padrão do curso)'
);

-- ── RF-HOR-05: depois do primeiro lançamento, a escolha e o relógio travam ──
select is(
  public.regime_da_turma_travado('14210000-0000-0000-0000-000000000001'),
  false,
  'sem sessão a leitura da tela não revela nada (alcance falso)'
);
select ok(
  app.turma_tem_lancamento_no_dsa('14210000-0000-0000-0000-000000000001'),
  'o dia parado da turma já é lançamento'
);
select is(
  pg_temp.recusa($$update public.turmas set regime_de_horario_id = null
                   where id = '14210000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_da_turma_travado',
  'RF-HOR-05 · com lançamento, a turma não troca de regime (nem volta ao do curso)'
);
select is(
  pg_temp.recusa($$update public.regimes_de_horario set hora_inicio_tarde = '13:00'
                   where id = '14200000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'regime_em_uso_com_lancamento',
  'RF-HOR-05 · com lançamento numa turma que o usa, o relógio do regime trava'
);
select lives_ok(
  $$update public.regimes_de_horario set nome = 'Regime B (9 TA)'
     where id = '14200000-0000-0000-0000-000000000001'$$,
  'o nome continua editável: ele não reinterpreta lançamento'
);
select lives_ok(
  $$update public.turmas set alunos = 12 where id = '14210000-0000-0000-0000-000000000001'$$,
  'editar outro campo da turma com lançamento não esbarra na trava do regime'
);
select ok(
  not app.turma_tem_lancamento_no_dsa('14210000-0000-0000-0000-000000000002')
  or exists (select 1 from public.dias_parados where turma_id = '14210000-0000-0000-0000-000000000002'),
  'a turma 2 só tem o dia parado (a trava olha a turma, não o curso)'
);

select * from finish();
rollback;
