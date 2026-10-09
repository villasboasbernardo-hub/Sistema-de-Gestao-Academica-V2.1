-- =================================================================================
-- 122 — `public.gravar_lancamentos_em_transacao` (migration 20261008223717, D-DSA-3)
--
-- O QUE  : a funcao aplica a lista de operacoes de um lancamento e dos que ele empurra NUMA
--          TRANSACAO: ou todas, ou nenhuma. E ela e SECURITY INVOKER, com tres grades no SQL dinamico.
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8): a SEGUNDA operacao falha (viola um CHECK) e a PRIMEIRA, que ja
--    tinha sido aplicada, e desfeita junto. Sem a funcao, dois UPDATE pela interface de dados deixavam
--    a primeira gravada.
-- ⚠️ Permissao NAO se prova aqui (o pgTAP roda como dono): o negativo por perfil esta em
--    tests/invariantes/rls/dsa.test.ts, com sessao real.
-- =================================================================================

begin;
select plan(16);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1220000-0000-0000-0000-000000000001', 'T122', 'Curso do 122', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino) values
  ('d1225000-0000-0000-0000-000000000001', 'T122 T1 2026',
   'd1220000-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('d1221000-0000-0000-0000-000000000001', 'T122-CT', 'CT', '-EF', 'Instrutor do 122', 'Militar', 'CIAARA');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
  values ('d1223000-0000-0000-0000-000000000001', 'T122-D', 'd1220000-0000-0000-0000-000000000001',
          'I', 'Disciplina do 122', 20);
insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('d1224000-0000-0000-0000-000000000001', 'd1223000-0000-0000-0000-000000000001',
   'd1220000-0000-0000-0000-000000000001', 1, 'UE do 122', 20);
insert into public.registros_aula
  (id, codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, local)
values
  ('d1226000-0000-0000-0000-000000000001', 'T122-A', '2026-04-10', 'd1225000-0000-0000-0000-000000000001',
   'd1220000-0000-0000-0000-000000000001', 'd1224000-0000-0000-0000-000000000001',
   'd1221000-0000-0000-0000-000000000001', 1, 1, 'Sala 1'),
  ('d1226000-0000-0000-0000-000000000002', 'T122-B', '2026-04-10', 'd1225000-0000-0000-0000-000000000001',
   'd1220000-0000-0000-0000-000000000001', 'd1224000-0000-0000-0000-000000000001',
   'd1221000-0000-0000-0000-000000000001', 1, 2, 'Sala 1');

-- ═══ estrutura ═══════════════════════════════════════════════════════════════════
select has_function('public', 'gravar_lancamentos_em_transacao', array['jsonb'],
  'D-DSA-3 · a funcao existe');
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'gravar_lancamentos_em_transacao'),
  'D-DSA-3 · ela e SECURITY INVOKER — a RLS e os privilegios sao os de quem chama');
select ok(
  (select p.proconfig::text ~ 'search_path' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'gravar_lancamentos_em_transacao'),
  'D-DSA-3 · search_path fixo');
select ok(has_function_privilege('authenticated', 'public.gravar_lancamentos_em_transacao(jsonb)', 'execute'),
  'D-DSA-3 · authenticated executa');
select ok(not has_function_privilege('anon', 'public.gravar_lancamentos_em_transacao(jsonb)', 'execute'),
  'D-DSA-3 · anon NAO executa');

-- ═══ o caminho feliz: A cresce para 2 TA e B e empurrado para o 3º ═══════════════
select is(
  public.gravar_lancamentos_em_transacao('[
    {"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000001","campos":{"tempos_consumidos":2}},
    {"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000002","campos":{"ta_inicial":3}}
  ]'::jsonb),
  2, 'D-DSA-3 · as duas operacoes sao aplicadas');
select is((select ta_inicial || '/' || ta_final from public.registros_aula where codigo = 'T122-B'), '3/3',
  'D-DSA-3 · B foi para o 3º tempo, com a mesma duracao');
select is((select local from public.registros_aula where codigo = 'T122-B'), 'Sala 1',
  'D-DSA-3 · a coluna nao mandada nao e tocada');
select is((select id from public.registros_aula where codigo = 'T122-B'),
  'd1226000-0000-0000-0000-000000000002'::uuid,
  'D-DSA-3 · e UPDATE do mesmo registro: o id e o mesmo');

-- ═══ ⚠️ O CASO QUE DISCRIMINA: a segunda falha, e a primeira e desfeita ═══════════
select throws_ok($$
  select public.gravar_lancamentos_em_transacao('[
    {"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000001","campos":{"local":"Mudou"}},
    {"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000002","campos":{"ta_inicial":0}}
  ]'::jsonb)
$$, '23514', null, 'D-DSA-3 · a segunda operacao viola o CHECK do TA');
select is((select local from public.registros_aula where codigo = 'T122-A'), 'Sala 1',
  'D-DSA-3 · ⚠️ e a PRIMEIRA, que ja tinha sido aplicada, foi DESFEITA — ou todas, ou nenhuma');

-- ═══ as grades do SQL dinamico ═════════════════════════════════════════════════
select throws_ok($$
  select public.gravar_lancamentos_em_transacao('[{"acao":"atualizar","tabela":"turmas","id":"d1225000-0000-0000-0000-000000000001","campos":{"alunos":1}}]'::jsonb)
$$, '22023', null, 'grade 1 · tabela fora das tres do DSA e recusada');
select throws_ok($$
  select public.gravar_lancamentos_em_transacao('[{"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000001","campos":{"criado_por":null}}]'::jsonb)
$$, '22023', null, 'grade 2 · coluna de auditoria e recusada');
select throws_ok($$
  select public.gravar_lancamentos_em_transacao('[{"acao":"atualizar","tabela":"registros_aula","id":"d1226000-0000-0000-0000-000000000001","campos":{"local":"x","coluna_que_nao_existe":1}}]'::jsonb)
$$, '22023', null, 'grade 2 · chave que nao e coluna recusa a operacao inteira');
select throws_ok($$
  select public.gravar_lancamentos_em_transacao('[{"acao":"atualizar","tabela":"registros_aula","id":"00000000-0000-0000-0000-000000000000","campos":{"local":"x"}}]'::jsonb)
$$, '42501', null, 'UPDATE sem linha e ERRO, nunca sucesso calado');

select lives_ok($$
  select public.gravar_lancamentos_em_transacao('[{"acao":"inserir","tabela":"registros_aula","campos":{
    "id":"d1226000-0000-0000-0000-000000000003","codigo":"T122-C","data":"2026-04-10",
    "turma_id":"d1225000-0000-0000-0000-000000000001","curso_id":"d1220000-0000-0000-0000-000000000001",
    "unidade_ensino_id":"d1224000-0000-0000-0000-000000000001","instrutor_id":"d1221000-0000-0000-0000-000000000001",
    "tempos_consumidos":1,"ta_inicial":4}}]'::jsonb)
$$, 'D-DSA-3 · inserir tambem vai pela funcao — o lancamento novo e os empurrados na mesma transacao');

select * from finish();
rollback;
