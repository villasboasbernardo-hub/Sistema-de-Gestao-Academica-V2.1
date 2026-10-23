-- =================================================================================
-- 147 — Spec 023, Bloco 8 (`20261023010547_calendario_tipo_e_abrangencia` e `20261023010557_dias_parados_respeitam_
-- abrangencia`): o TIPO e a ABRANGÊNCIA das linhas do calendário.
--
-- Estrutura: RLS ligada, as três policies, nenhuma de DELETE, sem DELETE/TRUNCATE para `authenticated`, o gerador `FTU-`
-- executável por quem insere (gotcha 5.1), `security_invoker` na view recriada (gotcha 10) e o gatilho do tipo.
-- O caso que discrimina (DoD 8), com a MESMA amostra nas duas metades: a linha de dia inteiro sem turma escolhida conta
-- para as duas turmas; com uma turma escolhida, só para ela — e o tipo vem da coluna, não do prefixo do nome.
-- ⚠️ Permissão (quem pode escrever) NÃO se prova aqui: é `tests/invariantes/rls/calendario.test.ts`.
-- =================================================================================
begin;
select plan(13);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'mensagem', sqlerrm);
end;
$f$;

-- ── estrutura ──
select ok((select relrowsecurity from pg_class where oid = 'public.feriado_turma'::regclass),
          'feriado_turma tem RLS ligada');
select is((select count(*)::int from pg_policy where polrelid = 'public.feriado_turma'::regclass), 3,
          'feriado_turma tem as três policies: ler, criar, editar');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0,
          'regra 4: nenhuma policy de DELETE no catálogo');
select ok(not has_table_privilege('authenticated', 'public.feriado_turma', 'DELETE')
          and not has_table_privilege('authenticated', 'public.feriado_turma', 'TRUNCATE'),
          'authenticated sem DELETE e sem TRUNCATE em feriado_turma');
select ok(has_function_privilege('authenticated', 'app.proximo_codigo_feriado_turma()', 'EXECUTE'),
          'o gerador FTU- do DEFAULT é executável por quem insere (gotcha 5.1)');
select is((select reloptions from pg_class where oid = 'public.vw_dias_parados_turma'::regclass),
          array['security_invoker=true'], 'vw_dias_parados_turma continua security_invoker (gotcha 10)');

-- ── a amostra: um curso, duas turmas ativas com DSA em 15/06/2046 ──
select public.criar_curso_com_regime(
  '{"codigo":"T147-CUR","nome_curso":"Curso T147","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select c.id, 2046, x.t, 'presencial', 'ativa', date '2046-02-01', date '2046-11-30', 'T147-CUR ' || x.t || ' 2046'
  from public.cursos c, (values ('T1'), ('T2')) x(t) where c.codigo = 'T147-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados)
select 'tipos_parada', 'LA', 'LA — Licença Administrativa', 2, '{"aceita_tr": true, "pode_global": true}'
 where not exists (select 1 from public.config_listas where lista = 'tipos_parada' and valor = 'LA');

insert into public.feriados (id, ano, data, descricao, impacto, tipo_parada_id)
values ('14700000-0000-0000-0000-000000000001', 2046, date '2046-06-15', 'Licença de teste T147', 'dia_inteiro',
        (select id from public.config_listas where lista = 'tipos_parada' and valor = 'LA'));

create temporary table _t as select id, codigo from public.turmas where codigo like 'T147-CUR %';

-- ── o caso que discrimina: sem turma escolhida, as duas ──
select results_eq(
  $$select t.codigo, v.tipo, v.dias::int from public.vw_dias_parados_turma v join _t t on t.id = v.turma_id
     order by t.codigo$$,
  $$values ('T147-CUR T1 2046'::text, 'LA'::text, 1), ('T147-CUR T2 2046', 'LA', 1)$$,
  'sem turma escolhida, a linha conta para TODAS as turmas — e o tipo vem da coluna (LA), não do nome');

insert into public.feriado_turma (feriado_id, turma_id)
values ('14700000-0000-0000-0000-000000000001', (select id from _t where codigo = 'T147-CUR T1 2046'));
select results_eq(
  $$select t.codigo from public.vw_dias_parados_turma v join _t t on t.id = v.turma_id order by t.codigo$$,
  $$values ('T147-CUR T1 2046'::text)$$,
  'com uma turma escolhida, a linha conta SÓ para ela');
select matches((select codigo from public.feriado_turma where feriado_id = '14700000-0000-0000-0000-000000000001'),
               '^FTU-[0-9]{6}$', 'a ligação recebe o código FTU- do DEFAULT');

update public.feriado_turma set status = 'inativo' where feriado_id = '14700000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.vw_dias_parados_turma v join _t t on t.id = v.turma_id), 2,
          'tirada a única turma (status inativo), a linha volta a valer para todas');

select is((pg_temp.recusa($$insert into public.feriado_turma (feriado_id, turma_id)
                            values ('14700000-0000-0000-0000-000000000001',
                                    (select id from _t where codigo = 'T147-CUR T1 2046'))$$)) ->> 'sqlstate',
          '23505', 'o par linha × turma é único: devolver a turma é reativar a ligação, nunca uma segunda');

select is((pg_temp.recusa($$update public.feriados set tipo_parada_id =
                              (select id from public.config_listas where lista <> 'tipos_parada' limit 1)
                             where id = '14700000-0000-0000-0000-000000000001'$$)) ->> 'sqlstate',
          '23514', 'o tipo tem de ser da lista tipos_parada (o gatilho recusa outra lista)');

select is((select is_nullable from information_schema.columns
            where table_schema = 'public' and table_name = 'feriados' and column_name = 'tipo_parada_id'),
          'YES', 'a coluna nova é nulável: as linhas antigas seguem sem tipo (D-2)');

select * from finish();
rollback;
