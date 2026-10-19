-- =================================================================================
-- 139 — Spec 017, Bloco 2 · M3 (`20261019114403_painel_de_turmas`): o PARÂMETRO e a OCUPAÇÃO EM LOTE do painel.
--
-- O número do "iniciando" é dado, não constante (regra 8); a função entrega a ocupação da semana para o conflito
-- (`RN-CONF-01`), com porteiro que falha FECHADO sem sessão (gotcha 15) e sem relógio do servidor (D20).
-- ⚠️ A ocupação alheia anônima se prova com sessão real (`tests/invariantes/rls/bloco-2.test.ts`).
-- =================================================================================
begin;
select plan(7);

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

select results_eq(
  $$select valor, natureza::text from public.config_parametros
     where chave = 'turmas.aviso_inicio_dias' and status = 'ativo'$$,
  $$values ('30'::text, 'operacional'::text)$$,
  'FR-005.1 · regra 8 · o "iniciando em até N dias" é parâmetro operacional, 30'
);
select is(
  pg_temp.recusa($$select * from public.ocupacao_para_conflitos('2047-05-11', '2047-05-16')$$) ->> 'sqlstate',
  '42501',
  'gotcha 15 · sem sessão o porteiro recusa (falha FECHADO)'
);
select ok(
  (select prosecdef and provolatile = 's' and pronargdefaults = 0 from pg_proc
    where oid = 'public.ocupacao_para_conflitos(date, date)'::regprocedure),
  'a função é definer (o conflito é contra turma que a pessoa pode não alcançar), stable e sem valor padrão'
);
select ok(
  (select lower(regexp_replace(prosrc, '--[^\n]*', '', 'g')) !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)'
     from pg_proc where oid = 'public.ocupacao_para_conflitos(date, date)'::regprocedure),
  'D20 · a função não lê o relógio do servidor'
);
select ok(
  (select lower(regexp_replace(prosrc, '--[^\n]*', '', 'g')) ~ 'coalesce\(app\.pode\(''registros_aula'', ''ler''\), false\) is not true'
     from pg_proc where oid = 'public.ocupacao_para_conflitos(date, date)'::regprocedure),
  'gotcha 15 · o porteiro tem a forma que falha fechado'
);
select ok(
  not has_function_privilege('anon', 'public.ocupacao_para_conflitos(date, date)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.ocupacao_para_conflitos(date, date)', 'EXECUTE'),
  'anon não executa; authenticated sim'
);
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE no catálogo'
);

select * from finish();
rollback;
