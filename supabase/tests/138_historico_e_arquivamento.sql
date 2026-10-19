-- =================================================================================
-- 138 — Spec 017, Bloco 2 · M2 (`20261019114234_historico_e_arquivamento_da_turma`): a TRILHA DA SITUAÇÃO e o
-- ARQUIVAMENTO.
--
-- D-COR-4 (Bernardo Villas Boas, 16/10/2026): *"toda troca de status aceita uma observação"* — o caso que discrimina
-- (DoD 8): a troca por `update` DIRETO, sem passar pela função, também fica na trilha (FR-003.2).
-- D-COR-5: arquivar não é situação; o estado é o último evento; a sequência vale; tudo só de acréscimo.
--
-- ⚠️ "Só o Admin desarquiva" é policy: prova com sessão real em `tests/invariantes/rls/bloco-2.test.ts`.
-- =================================================================================
begin;
select plan(22);

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
  '{"codigo":"T138-CUR","nome_curso":"Curso T138","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
select '13820000-0000-0000-0000-000000000001', id, 'T1', 2047, 'ativa', 'presencial', '2047-03-02', '2047-11-30'
  from public.cursos where codigo = 'T138-CUR';
create temporary table _t138 as
  select '13820000-0000-0000-0000-000000000001'::uuid as turma_id,
         (select codigo from public.turmas where id = '13820000-0000-0000-0000-000000000001') as codigo;

-- ── a trilha da situação ──
select is(
  (select count(*)::int from public.turma_trocas_de_situacao where turma_id = (select turma_id from _t138)),
  0,
  'FR-003.5 · criar a turma não gera linha na trilha'
);
update public.turmas set status = 'concluida' where id = (select turma_id from _t138);
select results_eq(
  $$select situacao_anterior::text, situacao_nova::text, observacao, autor_id
      from public.turma_trocas_de_situacao where turma_id = (select turma_id from _t138)$$,
  $$values ('ativa'::text, 'concluida'::text, null::text, null::uuid)$$,
  'FR-003.2 · o caso que discrimina: a troca por UPDATE DIRETO também fica na trilha (sem observação, sem sessão)'
);
update public.turmas set status = 'concluida' where id = (select turma_id from _t138);
select is(
  (select count(*)::int from public.turma_trocas_de_situacao where turma_id = (select turma_id from _t138)),
  1,
  'gravar a mesma situação não anota troca'
);
select public.trocar_situacao_da_turma((select codigo from _t138), 'cancelada', 'Turma sem alunos');
select results_eq(
  $$select situacao_anterior::text, situacao_nova::text, observacao
      from public.turma_trocas_de_situacao where turma_id = (select turma_id from _t138) order by ordem desc limit 1$$,
  $$values ('concluida'::text, 'cancelada'::text, 'Turma sem alunos'::text)$$,
  'D-COR-4 · pela função, a troca e a observação vão juntas'
);
update public.turmas set status = 'ativa' where id = (select turma_id from _t138);
select is(
  (select observacao from public.turma_trocas_de_situacao where turma_id = (select turma_id from _t138)
    order by ordem desc limit 1),
  null,
  'a observação não vaza para a troca seguinte da mesma transação'
);
select is(
  pg_temp.recusa($$select public.trocar_situacao_da_turma('NAO-EXISTE 2047', 'ativa', null)$$) ->> 'hint',
  'turma_fora_do_alcance',
  'zero linha = fora do alcance (42501), nunca sucesso calado'
);
select is(
  pg_temp.recusa($$update public.turma_trocas_de_situacao set observacao = 'x'$$) ->> 'hint',
  'rastro_imutavel',
  'Princípio IV · a trilha não se reescreve (nem o dono)'
);
select is(
  pg_temp.recusa($$delete from public.turma_trocas_de_situacao$$) ->> 'hint',
  'rastro_imutavel',
  'Princípio IV · nem se apaga'
);
select is(
  pg_temp.recusa($$truncate public.turma_trocas_de_situacao$$) ->> 'hint',
  'rastro_imutavel',
  'Princípio IV · nem se esvazia por TRUNCATE'
);
select is(
  (select count(*)::int
     from pg_trigger tg
     join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'public.turmas'::regclass and not tg.tgisinternal
      and p.prosrc ~* 'status' and p.prosrc ~* 'raise'),
  0,
  'a guarda de ausência do 101 continua: nenhum gatilho de turmas recusa por situação'
);

-- ── o arquivamento ──
select is(app.turma_arquivada((select turma_id from _t138)), false, 'D-COR-5 · sem evento, a turma não está arquivada');
insert into public.turma_arquivamentos (turma_id, acao, observacao, autor_id, criado_em)
values ((select turma_id from _t138), 'arquivar', 'Encerrada', '00000000-0000-0000-0000-0000000000aa', '2000-01-01');
select ok(app.turma_arquivada((select turma_id from _t138)), 'D-COR-5 · arquivar: o último evento manda');
select results_eq(
  $$select observacao, arquivada_por from public.vw_turmas_arquivadas where turma_id = (select turma_id from _t138)$$,
  $$values ('Encerrada'::text, null::uuid)$$,
  'a view expõe a observação, e o autor é o do banco (sem sessão = nulo), não o que o cliente mandou'
);
select ok(
  (select arquivada_em > '2000-01-02' from public.vw_turmas_arquivadas where turma_id = (select turma_id from _t138)),
  'e o instante também é o do banco'
);
select is(
  (select status::text from public.turmas where id = (select turma_id from _t138)),
  'ativa',
  'D-COR-5 · arquivar NÃO muda a situação da turma'
);
select is(
  pg_temp.recusa($$insert into public.turma_arquivamentos (turma_id, acao) select turma_id, 'arquivar' from _t138$$) ->> 'hint',
  'turma_ja_arquivada',
  'a sequência: arquivar a já arquivada é recusado'
);
insert into public.turma_arquivamentos (turma_id, acao) select turma_id, 'desarquivar' from _t138;
select is(app.turma_arquivada((select turma_id from _t138)), false, 'desarquivar devolve a turma');
select is(
  pg_temp.recusa($$insert into public.turma_arquivamentos (turma_id, acao) select turma_id, 'desarquivar' from _t138$$) ->> 'hint',
  'turma_nao_arquivada',
  'a sequência: desarquivar a que não está é recusado'
);
select is(
  pg_temp.recusa($$delete from public.turma_arquivamentos$$) ->> 'hint',
  'rastro_imutavel',
  'Princípio IV · o arquivamento não se apaga'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_turmas_arquivadas'::regclass)
  and not has_table_privilege('anon', 'public.vw_turmas_arquivadas', 'SELECT')
  and not has_table_privilege('authenticated', 'public.turma_trocas_de_situacao', 'INSERT'),
  'gotcha 10 e privilégios · a view é invoker, anon não lê, ninguém escreve na trilha direto'
);
select ok(
  (select prosecdef and provolatile = 's' from pg_proc where oid = 'app.turma_arquivada(uuid)'::regprocedure)
  and not has_function_privilege('anon', 'app.turma_arquivada(uuid)', 'EXECUTE'),
  'achado 60 · turma_arquivada é definer (não falha aberta pela RLS de quem grava), stable, e anon não executa'
);
-- ⚠️ ISENÇÃO NOMINAL: `app.carimbar_arquivamento` carimba o INSTANTE do evento (`criado_em := now()`) — instante,
--    não data de fato (D20); a varredura a deixa de fora pelo nome.
select ok(
  (select bool_and(lower(regexp_replace(prosrc, '--[^\n]*', '', 'g'))
                     !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)')
     from pg_proc
    where oid in ('app.anotar_troca_de_situacao()'::regprocedure,
                  'public.trocar_situacao_da_turma(text, public.status_turma, text)'::regprocedure,
                  'app.turma_arquivada(uuid)'::regprocedure,
                  'app.trilha_da_turma_imutavel()'::regprocedure)),
  'D20 · as funções novas da M2 não leem o relógio do servidor (o carimbo de instante é a isenção nominal)'
);

select * from finish();
rollback;
