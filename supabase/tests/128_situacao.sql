-- =================================================================================
-- 128 — Spec 014, PR 4: a situação calculada e a vista lida pelas SESSÕES (migration E-5)
--
-- RN-EVT-03 (Risco Alto): CHD = aula + aplicação + TODAS as sessões de vista.
-- R-8: `app.fn_status_vista` é ESPELHO de `situacaoDaAvaliacao` — os casos literais abaixo são os de
-- `tests/unidade/dados/situacao-da-avaliacao.json` (a prova cruzada completa é situacao-sql-igual-ts.test.ts).
-- =================================================================================
begin;
select plan(17);

select public.criar_curso_com_regime(
  '{"codigo":"T128-CUR","nome_curso":"Curso T128","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
create temporary table _t128 as select id as curso_id from public.cursos where codigo = 'T128-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T128', 'Prova T128')
  on conflict do nothing;
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20280000-0000-0000-0000-000000000001', 'T128-D1', (select curso_id from _t128), 'T128', 'Disciplina T128', 30);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50280000-0000-0000-0000-000000000001', (select curso_id from _t128), 'T1', 2046,
   'ativa', 'presencial', '2046-01-05', '2046-11-30');
insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos)
select v.id::uuid, v.codigo, '50280000-0000-0000-0000-000000000001', '20280000-0000-0000-0000-000000000001', curso_id,
       'Prova T128', v.data::date, 1, 2
  from _t128, (values ('28280000-0000-0000-0000-000000000001', 'T128-A1', '2046-10-01'),
                      ('28280000-0000-0000-0000-000000000002', 'T128-A2', '2046-10-30')) as v(id, codigo, data);

-- ── a situação, casos literais da tabela única ──
select is(app.fn_status_vista('28280000-0000-0000-0000-000000000001', '2046-10-08'), 'em_andamento', 'R-8 · 7º dia sem vista → em andamento');
select is(app.fn_status_vista('28280000-0000-0000-0000-000000000001', '2046-10-09', 7), 'atrasada', 'R-8 · 8º dia sem vista → atrasada');
select is(app.fn_status_vista('28280000-0000-0000-0000-000000000002', '2046-10-20'), 'pendente', 'R-8 · agendada à frente → pendente');
select is(app.fn_status_vista('28280000-0000-0000-0000-000000000001', '2046-10-09', 10), 'em_andamento', 'R-8 · o prazo vem por argumento');

-- ── o espelho da sessão 1 ──
update public.avaliacoes set data_vista_prova = '2046-10-03', ta_inicial_vista = 3, tempos_consumidos_vista = 1
 where id = '28280000-0000-0000-0000-000000000001';
select is((select (data, tempos_consumidos)::text from public.vistas_de_avaliacao
            where avaliacao_id = '28280000-0000-0000-0000-000000000001' and numero = 1 and status = 'ativo'),
  ('2046-10-03', 1)::text, 'Espelho · gravar a vista nas colunas antigas cria a sessão 1');
select is(app.fn_status_vista('28280000-0000-0000-0000-000000000001', '2046-10-20'), 'concluida', 'R-8 · com sessão de vista → concluída');
update public.avaliacoes set data_vista_prova = '2046-10-05' where id = '28280000-0000-0000-0000-000000000001';
select is((select data from public.vistas_de_avaliacao
            where avaliacao_id = '28280000-0000-0000-0000-000000000001' and numero = 1 and status = 'ativo'),
  '2046-10-05'::date, 'Espelho · mover a vista nas colunas antigas move a sessão 1, sem sessão velha');
select is((select count(*)::int from public.vistas_de_avaliacao where avaliacao_id = '28280000-0000-0000-0000-000000000001'),
  1, 'Espelho · continua UMA sessão (atualizada, não duplicada)');
update public.avaliacoes set status = 'concluida' where id = '28280000-0000-0000-0000-000000000001';
select is((select editado_em is null from public.vistas_de_avaliacao where avaliacao_id = '28280000-0000-0000-0000-000000000001'),
  false, 'controle: a sessão já tinha sido editada pelo espelho (move)');
select is((select count(*)::int from public.vistas_de_avaliacao where avaliacao_id = '28280000-0000-0000-0000-000000000001' and status = 'ativo'),
  1, 'Espelho · um UPDATE só de status não toca a sessão');

-- ── CHD com duas sessões ──
insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
  values ('28280000-0000-0000-0000-000000000001', 2, '2046-10-07', 4, 2);
select is((select (ta_avaliacao, ta_vista_prova)::text from public.vw_carga_horaria_turma
            where turma_id = '50280000-0000-0000-0000-000000000001'),
  (4, 3)::text, 'RN-EVT-03 · a CHD soma a aplicação e TODAS as sessões (1 + 2)');
select is((select ta_avaliacao_executados from public.vw_disciplinas_execucao
            where turma_id = '50280000-0000-0000-0000-000000000001' and disciplina_id = '20280000-0000-0000-0000-000000000001'),
  7::bigint, 'vw_disciplinas_execucao · aplicações 4 + sessões 3');
select is((select count(*)::int from public.vw_ocupacao_ta
            where fato_id = '28280000-0000-0000-0000-000000000001' and origem = 'vista_prova'),
  2, 'vw_ocupacao_ta · uma linha por sessão, com o fato = a avaliação');
select ok((select bool_and(numero_sessao is not null and sessao_id is not null) from public.vw_ocupacao_ta
            where fato_id = '28280000-0000-0000-0000-000000000001' and origem = 'vista_prova'),
  'vw_ocupacao_ta · sessao_id e numero_sessao preenchidos');

-- ── a vista anulada inativa a sessão 1 ──
update public.avaliacoes set data_vista_prova = null, ta_inicial_vista = null, tempos_consumidos_vista = null
 where id = '28280000-0000-0000-0000-000000000001';
select is((select status::text from public.vistas_de_avaliacao where avaliacao_id = '28280000-0000-0000-0000-000000000001' and numero = 1),
  'inativo', 'Espelho · anular a vista nas colunas antigas inativa a sessão 1 (nada apagado)');

-- ── views com security_invoker (gotcha 10) e a catraca ──
select is((select count(*)::int from pg_class
            where relname in ('vw_avaliacoes_situacao', 'vw_carga_horaria_turma', 'vw_ocupacao_ta',
                              'vw_disciplinas_execucao', 'vw_instrutor_carga_anual')
              and relnamespace = 'public'::regnamespace and reloptions @> array['security_invoker=true']),
  5, 'Gotcha 10 · as cinco views reescritas continuam com security_invoker');
select ok((select pg_get_constraintdef(oid) ~ 'substituida_pela_planilha' and obj_description(oid, 'pg_constraint') ~ 'CANCELADA'
             from pg_constraint where conname = 'aval_ta_coerente'),
  'aval_ta_coerente · aceita a substituída histórica, e o comentário mantém a palavra CANCELADA');

select * from finish();
rollback;
