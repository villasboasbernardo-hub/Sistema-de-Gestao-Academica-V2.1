-- =================================================================================
-- 151 — Spec 026, Bloco 11 (`20261026043358`): o REGIME DE TEMPOS DA SEMANA no DSA (RD-3).
--
-- O que se prova aqui (regra de banco; quem pode o quê fica em `tests/invariantes/rls/regime-da-semana.test.ts`):
--   · estrutura: as duas tabelas com RLS, só a policy de leitura, sem escrita para authenticated, sem DELETE;
--   · o porteiro FALHA FECHADO sem sessão (gotcha 15);
--   · o caso que discrimina da RD-3: turma em 8 tempos, uma semana salva ANTES e uma DEPOIS do «desde» com 9 — a de antes
--     continua no do curso pela data, a de depois é CONGELADA no do curso antes de a vigência valer, e as seguintes não
--     salvas abrem com 9;
--   · «só esta semana» recusada em semana salva; regime de outro curso recusado; o retrato do nomeado gravado ao salvar;
--   · nenhuma das funções novas lê o relógio do servidor.
-- =================================================================================
begin;
select plan(23);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare v_hint text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint);
end;
$f$;

-- ── estrutura ──
select ok((select relrowsecurity from pg_class where oid = 'public.dsa_regime_da_semana'::regclass)
          and (select relrowsecurity from pg_class where oid = 'public.turma_regime_vigencia'::regclass),
          'as duas tabelas têm RLS ligada');
select is((select count(*)::int from pg_policy
            where polrelid in ('public.dsa_regime_da_semana'::regclass, 'public.turma_regime_vigencia'::regclass)), 2,
          'uma policy em cada, a de leitura (quem grava são as RPCs)');
select ok(not has_table_privilege('authenticated', 'public.dsa_regime_da_semana', 'INSERT')
          and not has_table_privilege('authenticated', 'public.dsa_regime_da_semana', 'UPDATE')
          and not has_table_privilege('authenticated', 'public.turma_regime_vigencia', 'INSERT')
          and not has_table_privilege('authenticated', 'public.turma_regime_vigencia', 'UPDATE'),
          'authenticated não insere nem altera nas duas');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0, 'regra 4: nenhuma policy de DELETE');

-- ── a amostra: curso em 8 tempos com um regime nomeado de 9; turma ativa ──
insert into auth.users (id, email, aud, role) values
  ('a1510000-0000-0000-0000-000000000001', 't151-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T151-ADM', 'a1510000-0000-0000-0000-000000000001', 't151-admin@ciaara.teste', 'Admin T151', 'admin', 'geral');
select public.criar_curso_com_regime(
  '{"codigo":"T151-CUR","nome_curso":"Curso T151","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
select public.criar_curso_com_regime(
  '{"codigo":"T151-OUT","nome_curso":"Outro T151","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
insert into public.regimes_de_horario (id, curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min,
                                       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde)
select 'b1510000-0000-0000-0000-000000000009', id, 'Regime B', 9, 45, 10, 10, '07:30', '13:00'
  from public.cursos where codigo = 'T151-CUR';
insert into public.regimes_de_horario (id, curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min,
                                       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde)
select 'b1510000-0000-0000-0000-0000000000a9', id, 'Regime de outro', 9, 45, 10, 10, '07:30', '13:00'
  from public.cursos where codigo = 'T151-OUT';
insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2046, 'T1', 'presencial', 'ativa', date '2046-02-01', date '2046-11-30', 'T151-CUR T1 2046'
  from public.cursos where codigo = 'T151-CUR';
create temporary table _t as select t.id as turma from public.turmas t where t.codigo = 'T151-CUR T1 2046';
-- Semanas ISO de 2046: a 10 começa em 05/03, a 11 em 12/03, a 12 em 19/03, a 13 em 26/03, a 14 em 02/04.

-- Duas semanas SALVAS (pela trilha, sem sessão): a 10 (antes do «desde») e a 13 (depois).
select app.registrar_evento_do_dsa((select turma from _t), 2046::smallint, 10::smallint, 'salvo');
select app.registrar_evento_do_dsa((select turma from _t), 2046::smallint, 13::smallint, 'salvo');
select ok(app.semana_do_dsa_salva((select turma from _t), 2046::smallint, 10::smallint)
          and not app.semana_do_dsa_salva((select turma from _t), 2046::smallint, 11::smallint),
          'D-11: a semana com evento «salvo» está salva; a sem nada, não');
select is(app.segunda_da_semana_iso(2046::smallint, 11::smallint), date '2046-03-12',
          'a segunda-feira da semana ISO');

-- ── o porteiro falha fechado sem sessão (gotcha 15) ──
select is(pg_temp.recusa(format('select public.definir_regime_do_dsa_desde(%L, 2046::smallint, 11::smallint, %L)',
                                (select turma from _t), 'b1510000-0000-0000-0000-000000000009'))->>'sqlstate',
          '42501', 'sem sessão, «desde» é recusado com 42501');
select is(pg_temp.recusa(format('select public.gravar_regime_da_semana_do_dsa(%L, 2046::smallint, 11::smallint)',
                                (select turma from _t)))->>'sqlstate',
          '42501', 'sem sessão, gravar o regime da semana é recusado com 42501');
select is((select count(*)::int from public.turma_regime_vigencia where turma_id = (select turma from _t)), 0,
          'e nada foi gravado');

-- ── com sessão: o caso que discrimina ──
select set_config('request.jwt.claim.sub', 'a1510000-0000-0000-0000-000000000001', true);
select is(public.definir_regime_do_dsa_desde((select turma from _t), 2046::smallint, 11::smallint,
                                             'b1510000-0000-0000-0000-000000000009'), 1,
          '«desde» a semana 11 congela UMA semana salva depois dela (a 13)');
select is((select origem || '|' || coalesce(regime_de_horario_id::text, 'curso') from public.dsa_regime_da_semana
            where turma_id = (select turma from _t) and ano = 2046 and semana = 13 and status = 'ativo'),
          'gravado|curso', 'a semana 13, salva, fica no regime do curso (8) — não muda para 9');
select is((select count(*)::int from public.dsa_regime_da_semana
            where turma_id = (select turma from _t) and semana = 10), 0,
          'a semana 10, salva ANTES do «desde», não precisa de linha: a vigência começa depois dela');
select is((select r.fonte || '|' || coalesce(r.regime_de_horario_id::text, 'curso')
             from app.regime_resolvido_da_semana((select turma from _t), date '2046-03-05') r),
          'curso|curso', 'a semana 10 continua no regime do curso (8)');
select is((select r.fonte || '|' || r.regime_de_horario_id::text
             from app.regime_resolvido_da_semana((select turma from _t), date '2046-03-19') r),
          'desde|b1510000-0000-0000-0000-000000000009', 'a semana 12, não salva, abre com o regime de 9');

-- ── «só esta semana» ──
select is(pg_temp.recusa(format('select public.definir_regime_do_dsa_so_nesta_semana(%L, 2046::smallint, 13::smallint, null)',
                                (select turma from _t)))->>'hint',
          'semana_do_dsa_salva', '«só esta semana» em semana salva é recusado');
select is(pg_temp.recusa(format('select public.definir_regime_do_dsa_so_nesta_semana(%L, 2046::smallint, 12::smallint, %L)',
                                (select turma from _t), 'b1510000-0000-0000-0000-0000000000a9'))->>'hint',
          'regime_de_outro_curso', 'regime de outro curso é recusado');
select lives_ok(format('select public.definir_regime_do_dsa_so_nesta_semana(%L, 2046::smallint, 12::smallint, null)',
                       (select turma from _t)),
                '«só esta semana» com o regime do curso numa semana não salva');
select is((select origem || '|' || coalesce(regime_de_horario_id::text, 'curso') from public.dsa_regime_da_semana
            where turma_id = (select turma from _t) and ano = 2046 and semana = 12 and status = 'ativo'),
          'so_esta_semana|curso', 'a semana 12 fica com a escolha dela');

-- ── gravar ao salvar: o retrato do nomeado ──
select is(public.gravar_regime_da_semana_do_dsa((select turma from _t), 2046::smallint, 12::smallint), false,
          'a semana que já tem linha não ganha outra');
select is(public.gravar_regime_da_semana_do_dsa((select turma from _t), 2046::smallint, 14::smallint), true,
          'a semana 14 grava o regime que tinha');
select is((select regime_tempos::int || '|' || hora_inicio_tarde::text from public.dsa_regime_da_semana
            where turma_id = (select turma from _t) and semana = 14 and status = 'ativo'),
          '9|13:00:00', 'com o RETRATO do regime de 9 — editar o regime depois não muda a semana');

-- ── o «desde» de novo na mesma segunda substitui o anterior ──
select public.definir_regime_do_dsa_desde((select turma from _t), 2046::smallint, 11::smallint, null);
select is((select count(*)::int || '|' || coalesce(max(regime_de_horario_id::text), 'curso')
             from public.turma_regime_vigencia where turma_id = (select turma from _t) and status = 'ativo'),
          '1|curso', 'uma vigência ativa só, a nova');

-- ── nenhuma função nova lê o relógio do servidor (regra 9.1.1: sem comentário) ──
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where p.proname in ('semana_do_dsa_salva', 'regime_resolvido_da_semana', 'inserir_regime_da_semana',
                                'congelar_regime_da_semana', 'porteiro_do_regime_do_dsa',
                                'definir_regime_do_dsa_so_nesta_semana', 'definir_regime_do_dsa_desde',
                                'gravar_regime_da_semana_do_dsa')
              and regexp_replace(p.prosrc, '--[^\n]*', '', 'g') ~* '(current_date|now\(\)|localtimestamp)'), 0,
          'nenhuma função do regime da semana lê a data do servidor');

select * from finish();
rollback;
