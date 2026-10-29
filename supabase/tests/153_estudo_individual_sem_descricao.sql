-- =================================================================================
-- 153 — O «O que é» opcional SÓ no Estudo Individual (spec 029, Bloco 14, item 2 · FR-002, D-5 a D-7)
--
-- O QUE  : prova a estrutura e a regra de banco da migration `20261028182926_estudo_individual_sem_descricao` — a coluna
--          `atividades_nao_letivas.descricao` perde o NOT NULL e ganha o CHECK `ativ_descricao_fora_do_estudo_individual`
--          (`descricao is not null or categoria_normativa = 'Estudo_Individual'`): o EI de turma grava com a descrição
--          NULA (D-5) e AEC, TAD, TR e Apoio Individualizado continuam recusados sem ela (D-7).
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8): a inserção do EI de turma com `descricao` nula — ANTES da migration o banco a recusa
--    com 23502 (o NOT NULL de `20260829234045_fatos_grao_unidade_ensino.sql`); DEPOIS ela vive.
-- ⚠️ AS RECUSAS FORA DO EI SÓ PASSAM DEPOIS DA MIGRATION, e de propósito: o veredito «recusou» é o mesmo antes e depois,
--    mas o CÓDIGO não — antes vem 23502 (NOT NULL), depois 23514 (o CHECK novo). A asserção confere 23514 porque é ele
--    que diz que a regra mora no CHECK por categoria, e não num NOT NULL que também recusaria o EI.
-- ⚠️ O CONTROLE POSITIVO é a amostra com descrição: o EI e a AEC descritos vivem antes e depois — sem eles, uma recusa
--    do EI nulo por OUTRO motivo (tipo, escopo, turma) se leria como a regra.
-- ⚠️ A CONSEQUÊNCIA ACEITA NA D-7: recategorizar pela lista um tipo de Estudo Individual para outra categoria é recusado
--    (23514) quando alguma linha ATIVA dele não tem descrição — `app.recategorizar_pelo_tipo` reescreve a categoria e o
--    CHECK a confere. Hoje nenhuma linha está assim (medido no remoto em 28/10/2026: 0 nulas em 1.090 EI).
--
-- ⚠️ 2047 e tipos próprios (`T153 …`), longe do dado real: o arquivo vale na base limpa e na carregada. Sem sessão: a
--    guarda do rascunho deixa passar (o que nasce aqui nasce salvo), e quem pode o quê não se prova em pgTAP.
-- =================================================================================
begin;
select plan(14);

-- ── estrutura ────────────────────────────────────────────────────────────────────
select col_is_null('public', 'atividades_nao_letivas', 'descricao',
  'D-7 · atividades_nao_letivas.descricao deixou de ser NOT NULL');
select ok(
  exists (select 1 from pg_constraint
           where conrelid = 'public.atividades_nao_letivas'::regclass
             and conname = 'ativ_descricao_fora_do_estudo_individual'
             and contype = 'c'),
  'D-7 · o CHECK ativ_descricao_fora_do_estudo_individual existe'
);
select ok(
  coalesce((select pg_get_constraintdef(oid) ~ 'descricao IS NOT NULL'
                   and pg_get_constraintdef(oid) ~ 'Estudo_Individual'
              from pg_constraint
             where conrelid = 'public.atividades_nao_letivas'::regclass
               and conname = 'ativ_descricao_fora_do_estudo_individual'), false),
  'D-7 · o CHECK libera o nulo SÓ pela categoria Estudo_Individual'
);

-- ── a amostra ────────────────────────────────────────────────────────────────────
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1532000-0000-0000-0000-000000000001', 'T153-CUR', 'Curso T153', 'regular', 'presencial', 30);
insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a1532000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1535000-0000-0000-0000-000000000001', 'T153-CUR T1 2047', 'a1532000-0000-0000-0000-000000000001',
        'T1', 2047, 'ativa', 'presencial', '2047-03-04', '2047-06-28');

insert into public.config_listas (lista, valor, rotulo_exibicao, metadados) values
  ('tipos_atividade', 'T153 Estudo',         'T153 Estudo',         '{"categoria": "Estudo_Individual"}'),
  ('tipos_atividade', 'T153 Palestra',       'T153 Palestra',       '{"categoria": "AEC"}'),
  ('tipos_atividade', 'T153 Administracao',  'T153 Administracao',  '{"categoria": "TAD"}'),
  ('tipos_atividade', 'T153 Reserva',        'T153 Reserva',        '{"categoria": "TR"}'),
  ('tipos_atividade', 'T153 Monitoria',      'T153 Monitoria',      '{"categoria": "Apoio_Individualizado"}')
on conflict (lista, valor) do update set metadados = excluded.metadados;

-- ── controle positivo: com descrição, o EI e a AEC vivem (antes e depois) ────────
select lives_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-EI-DESCRITO', 'Estudo_Individual', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-15', 'Leitura dirigida', 'T153 Estudo', 1, 8)$$,
  'controle · o EI de turma COM descrição grava'
);
select lives_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-AEC-DESCRITA', 'AEC', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-15', 'Palestra de segurança', 'T153 Palestra', 1, 7)$$,
  'controle · a AEC de turma COM descrição grava'
);

-- ── o caso que discrimina: o EI de turma SEM descrição ───────────────────────────
select lives_ok(
  $$insert into public.atividades_nao_letivas
      (id, codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('a1537000-0000-0000-0000-000000000001', 'T153-EI-NULO', 'Estudo_Individual', 'turma',
            'a1535000-0000-0000-0000-000000000001', '2047-04-16', null, 'T153 Estudo', 1, 8)$$,
  'FR-002 / D-5 · o EI de turma SEM descrição grava (antes da migration: 23502)'
);
select is(
  (select (categoria_normativa::text, descricao is null, salvo, status::text)
     from public.atividades_nao_letivas where id = 'a1537000-0000-0000-0000-000000000001'),
  ('Estudo_Individual'::text, true, true, 'ativo'::text),
  'D-5 · a linha é Estudo Individual, ativa e salva, com a descrição NULA — nada a preenche no lugar da pessoa'
);

-- ── fora do EI, a descrição continua obrigatória — agora pelo CHECK ──────────────
select throws_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-AEC-NULA', 'AEC', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-17', null, 'T153 Palestra', 1, 1)$$,
  '23514', null,
  'D-7 · AEC sem descrição é recusada pelo CHECK (23514; antes da migration, 23502)'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-TAD-NULA', 'TAD', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-17', null, 'T153 Administracao', 1, 2)$$,
  '23514', null,
  'D-7 · TAD sem descrição é recusada pelo CHECK'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-TR-NULA', 'TR', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-17', null, 'T153 Reserva', 1, 3)$$,
  '23514', null,
  'D-7 · TR sem descrição é recusado pelo CHECK'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas
      (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, ta_inicial)
    values ('T153-APOIO-NULO', 'Apoio_Individualizado', 'turma', 'a1535000-0000-0000-0000-000000000001',
            '2047-04-17', null, 'T153 Monitoria', 1, 4)$$,
  '23514', null,
  'D-7 · Apoio Individualizado sem descrição é recusado pelo CHECK'
);
-- A edição também: apagar a descrição de uma AEC que existe é recusado; a de um EI, aceito.
select throws_ok(
  $$update public.atividades_nao_letivas set descricao = null where codigo = 'T153-AEC-DESCRITA'$$,
  '23514', null,
  'D-7 · apagar a descrição de uma AEC existente é recusado pelo CHECK'
);
select lives_ok(
  $$update public.atividades_nao_letivas set descricao = null where codigo = 'T153-EI-DESCRITO'$$,
  'FR-002 · apagar a descrição de um EI existente é aceito'
);

-- ── a consequência aceita na D-7: recategorizar o tipo do EI sem descrição ───────
select throws_ok(
  $$update public.config_listas set metadados = '{"categoria": "AEC"}'
     where lista = 'tipos_atividade' and valor = 'T153 Estudo'$$,
  '23514', null,
  'D-7 · recategorizar para AEC um tipo de EI com linha ATIVA sem descrição é recusado (23514)'
);

select * from finish();
rollback;
