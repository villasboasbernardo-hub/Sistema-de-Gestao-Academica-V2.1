-- =================================================================================
-- 140 — Spec 017, Bloco 2 · M4 (`20261019130941_trava_da_turma_arquivada`): a turma arquivada é SOMENTE LEITURA
-- também no banco (D-COR-5). ⚠️ PORTÃO da regra 9.4: esta prova vive com a M4 e vai junto dela.
--
-- O que se prova: (1) o CONJUNTO das tabelas com o gatilho é exatamente o declarado (molde do 105); (2) a gravação
-- COMUM passa nos três ramos de `app.turma_da_linha` — a turma direto, pela avaliação e pela linha da turma (o achado
-- 21: `new.campo` num `case` derrubaria a gravação das tabelas sem a coluna); (3) a da arquivada é recusada com
-- `23514 turma_arquivada`, inclusive MOVER a linha para outra turma; (4) a linha GLOBAL passa; (5) depois de
-- desarquivar, a gravação volta a passar; (6) a disciplina nova não nasce na arquivada.
-- ⚠️ Quem pode o quê com sessão real está em `tests/invariantes/rls/bloco-2.test.ts`.
-- =================================================================================
begin;
select plan(18);

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

-- ── (1) a enumeração: o conjunto, não as instâncias ──
select results_eq(
  $$select c.relname::text collate "default" from pg_trigger g join pg_class c on c.oid = g.tgrelid
     where g.tgfoid = 'app.recusar_se_turma_arquivada()'::regprocedure and not g.tgisinternal
     order by 1$$,
  $$values ('atividades_nao_letivas'), ('avaliacoes'), ('avaliacoes_curriculo_turma'), ('dias_parados'),
           ('previstos_proens_turma'), ('registros_aula'), ('sessoes_de_aplicacao'), ('ta_fora_do_dsa'),
           ('turma_disciplina'), ('turma_disciplina_instrutor'), ('turma_disciplina_unidade'), ('vistas_de_avaliacao')$$,
  'FR-004.6 · as 12 tabelas da turma têm a trava, e só elas'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.turmas'::regclass
             and tgfoid = 'app.turma_arquivada_so_le()'::regprocedure and not tgisinternal),
  'FR-004.6 · e a turma arquivada não aceita alteração'
);
select is(
  (select count(*)::int from (values ('registros_aula'), ('avaliacoes'), ('sessoes_de_aplicacao'),
          ('vistas_de_avaliacao'), ('atividades_nao_letivas'), ('dias_parados'), ('turma_disciplina'),
          ('turma_disciplina_instrutor'), ('turma_disciplina_unidade'), ('ta_fora_do_dsa'),
          ('previstos_proens_turma'), ('avaliacoes_curriculo_turma')) as t(nome)
    where (pg_temp.recusa(format('select app.turma_da_linha(%L, %L::jsonb)', t.nome,
             '{"turma_id": null, "avaliacao_id": null, "turma_disciplina_id": null}')) ->> 'recusou')::boolean),
  0,
  'achado 21 · a turma da linha se lê nas 12 tabelas sem erro (por to_jsonb, nunca new.campo)'
);

-- ── a amostra: um curso, duas turmas, a disciplina, a UE, o instrutor ──
select public.criar_curso_com_regime(
  '{"codigo":"T140-CUR","nome_curso":"Curso T140","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _c140 as select id as curso_id from public.cursos where codigo = 'T140-CUR';
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
  values ('14000000-0000-0000-0000-000000000001', 'T140-D1', (select curso_id from _c140), 'T140', 'Disciplina T140', 40);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
  values ('14010000-0000-0000-0000-000000000001', 'T140-UE1', '14000000-0000-0000-0000-000000000001',
          (select curso_id from _c140), 1, 'Tópico T140', 40);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('14020000-0000-0000-0000-000000000001', (select curso_id from _c140), 'T1', 2047, 'ativa', 'presencial',
   '2047-03-02', '2047-11-30'),
  ('14020000-0000-0000-0000-000000000002', (select curso_id from _c140), 'T2', 2047, 'ativa', 'presencial',
   '2047-03-02', '2047-11-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('14030000-0000-0000-0000-000000000001', 'T140-INS', 'CT', '-EF', 'Instrutor T140', 'Militar', 'CIAARA');
create temporary table _l140 as
  select td.id as linha, td.turma_id from public.turma_disciplina td
   where td.disciplina_id = '14000000-0000-0000-0000-000000000001';

-- ── (2) a gravação COMUM passa, nos três ramos ──
select is(
  pg_temp.recusa($$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
    values ('T140-REG-1', '2047-05-11', '14020000-0000-0000-0000-000000000001', (select curso_id from _c140),
            '14010000-0000-0000-0000-000000000001', '14030000-0000-0000-0000-000000000001', 2, 1)$$) ->> 'recusou',
  'false',
  'ramo da turma direto · a aula da turma NÃO arquivada grava'
);
select is(
  pg_temp.recusa($$insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, data_avaliacao,
                     instrutor_responsavel_id, ta_inicial, tempos_consumidos)
    values ('14040000-0000-0000-0000-000000000001', 'T140-AV-1', '14020000-0000-0000-0000-000000000001',
            '14000000-0000-0000-0000-000000000001', (select curso_id from _c140), '2047-05-12',
            '14030000-0000-0000-0000-000000000001', 1, 2)$$) ->> 'recusou',
  'false',
  'a avaliação da turma não arquivada grava'
);
select is(
  pg_temp.recusa($$insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
    values ('14040000-0000-0000-0000-000000000001', 1, '2047-05-14', 3, 1)$$) ->> 'recusou',
  'false',
  'ramo da avaliação · a vista da prova grava (a tabela não tem turma_id)'
);
select is(
  pg_temp.recusa($$insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id)
    select 'T140-TDI-1', linha, '14030000-0000-0000-0000-000000000001' from _l140
     where turma_id = '14020000-0000-0000-0000-000000000001'$$) ->> 'recusou',
  'false',
  'ramo da linha da turma · a atribuição grava (a tabela não tem turma_id)'
);

-- ── (3) arquivada: tudo recusado ──
insert into public.turma_arquivamentos (turma_id, acao) values ('14020000-0000-0000-0000-000000000001', 'arquivar');
select is(
  pg_temp.recusa($$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
    values ('T140-REG-2', '2047-05-18', '14020000-0000-0000-0000-000000000001', (select curso_id from _c140),
            '14010000-0000-0000-0000-000000000001', '14030000-0000-0000-0000-000000000001', 2, 1)$$) ->> 'hint',
  'turma_arquivada',
  'D-COR-5 · a aula na arquivada é recusada (23514 turma_arquivada)'
);
select is(
  pg_temp.recusa($$insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
    values ('14040000-0000-0000-0000-000000000001', 2, '2047-05-15', 3, 1)$$) ->> 'hint',
  'turma_arquivada',
  'a vista da prova da arquivada é recusada (pela avaliação)'
);
select is(
  pg_temp.recusa($$update public.turma_disciplina_instrutor set ch_prevista_tempos = 10
    where turma_disciplina_id in (select linha from _l140 where turma_id = '14020000-0000-0000-0000-000000000001')$$) ->> 'hint',
  'turma_arquivada',
  'a atribuição da arquivada não se altera (pela linha da turma)'
);
select is(
  pg_temp.recusa($$update public.registros_aula set turma_id = '14020000-0000-0000-0000-000000000002'
    where codigo = 'T140-REG-1'$$) ->> 'hint',
  'turma_arquivada',
  'achado 56 · MOVER a aula da arquivada para outra turma também é recusado'
);
select is(
  pg_temp.recusa($$update public.turmas set alunos = 12 where id = '14020000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'turma_arquivada',
  'a ficha da arquivada não aceita alteração (o caminho é desarquivar)'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas
      (codigo, subtipo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id)
    values ('T140-ATV-G', 'Palestra', 'AEC', '2047-05-19', 'Palestra global', 2, 'global', null)$$) ->> 'recusou',
  'false',
  'achado 67 · a atividade GLOBAL passa (e alcança a arquivada — declarado no desenho para o portão)'
);
select is(
  pg_temp.recusa($$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
    values ('T140-REG-3', '2047-05-18', '14020000-0000-0000-0000-000000000002', (select curso_id from _c140),
            '14010000-0000-0000-0000-000000000001', '14030000-0000-0000-0000-000000000001', 2, 1)$$) ->> 'recusou',
  'false',
  'controle positivo · a OUTRA turma do curso continua gravando'
);

-- ── (6) a disciplina nova não nasce na arquivada ──
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
  values ('14000000-0000-0000-0000-000000000002', 'T140-D2', (select curso_id from _c140), 'T140B', 'Outra T140', 20);
select is(
  app.nascer_disciplina_nas_turmas('14000000-0000-0000-0000-000000000002', (select curso_id from _c140)),
  1,
  'M4 · a disciplina nova nasce só na turma NÃO arquivada'
);

-- ── (5) desarquivada, volta a gravar ──
insert into public.turma_arquivamentos (turma_id, acao) values ('14020000-0000-0000-0000-000000000001', 'desarquivar');
select is(
  pg_temp.recusa($$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
    values ('T140-REG-4', '2047-05-25', '14020000-0000-0000-0000-000000000001', (select curso_id from _c140),
            '14010000-0000-0000-0000-000000000001', '14030000-0000-0000-0000-000000000001', 2, 1)$$) ->> 'recusou',
  'false',
  'desarquivada, a turma volta a gravar'
);

select ok(
  (select bool_and(not prosecdef or proconfig @> array['search_path=""'])
     from pg_proc where oid in ('app.turma_da_linha(text, jsonb)'::regprocedure,
                                'app.recusar_se_turma_arquivada()'::regprocedure,
                                'app.turma_arquivada_so_le()'::regprocedure))
  and not has_function_privilege('authenticated', 'app.recusar_se_turma_arquivada()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.turma_da_linha(text, jsonb)', 'EXECUTE'),
  'as funções novas são definer com search_path vazio, e ninguém as executa direto'
);
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE no catálogo'
);

select * from finish();
rollback;
