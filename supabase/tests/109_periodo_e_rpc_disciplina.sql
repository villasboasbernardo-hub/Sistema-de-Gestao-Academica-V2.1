-- =================================================================================
-- 109 — O periodo previsto POR TURMA, e a disciplina que nasce nas turmas por RPC
--
-- O QUE  : prova a Q-07 (periodo fora da janela e recusado quando a turma TEM janela;
--          turma sem janela aceita) e a Q-08/N-4/A-2/A-2b (a linha de `turma_disciplina`
--          nasce nas turmas `planejada` e `ativa` pela RPC, nunca por gatilho).
--          `FR-030.1`, `FR-070` e `FR-070.1` da spec 010.
--
-- ⚠️ O CASO QUE DISCRIMINA DA Q-07 E A ASSERCAO 2: a MESMA gravacao, fora da mesma janela,
--    PASSA quando `origem_periodo` e `herdado_grade`. Sem esse caso, um gatilho
--    incondicional daria o mesmo veredito na asserção 1 e derrubaria a carga do ETL — e
--    quatro linhas da base real ja estao hoje fora da janela (medido em 25/09/2026).
--
-- ⚠️ O CASO QUE DISCRIMINA DA A-2 E A ASSERCAO 7: `insert into disciplinas` DIRETO — o
--    caminho do ETL e o das amostras pgTAP — NAO cria linha nenhuma. E o que prova que a
--    decisao (b) foi implementada: com gatilho, esta asserção falharia, e com ela
--    falhariam a carga e os arquivos 020, 094, 097 e 098.
-- =================================================================================
begin;
select plan(8);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a9200000-0000-0000-0000-000000000001', 'T109-CUR', 'Curso T109', 'regular', 'presencial', 30);

insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a9200000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

-- Quatro turmas, uma de cada situacao, e uma quinta sem janela.
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino) values
  ('a9500000-0000-0000-0000-000000000001', 'T109-CUR T1 2026', 'a9200000-0000-0000-0000-000000000001',
   'T1', 2026, 'planejada', 'presencial', '2026-03-02', '2026-06-30'),
  ('a9500000-0000-0000-0000-000000000002', 'T109-CUR T2 2026', 'a9200000-0000-0000-0000-000000000001',
   'T2', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30'),
  ('a9500000-0000-0000-0000-000000000003', 'T109-CUR T3 2026', 'a9200000-0000-0000-0000-000000000001',
   'T3', 2026, 'concluida', 'presencial', '2026-03-02', '2026-06-30'),
  ('a9500000-0000-0000-0000-000000000004', 'T109-CUR T4 2026', 'a9200000-0000-0000-0000-000000000001',
   'T4', 2026, 'cancelada', 'presencial', '2026-03-02', '2026-06-30'),
  ('a9500000-0000-0000-0000-000000000005', 'T109-CUR T5 2026', 'a9200000-0000-0000-0000-000000000001',
   'T5', 2026, 'planejada', 'presencial', null, null);

-- -- 1 — periodo MANUAL fora da janela: recusado
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
values ('a9300000-0000-0000-0000-000000000001', 'T109-D1', 'a9200000-0000-0000-0000-000000000001',
        'I', 'Disciplina da janela', 10);

select throws_ok(
  $$insert into public.turma_disciplina
      (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
    values ('a9500000-0000-0000-0000-000000000001', 'a9300000-0000-0000-0000-000000000001',
            '2026-01-05', '2026-01-20', 'manual')$$,
  '23514',
  null,
  'FR-030.1 · periodo MANUAL fora da janela da turma e recusado'
);

-- -- 2 — O CASO QUE DISCRIMINA: a mesma data, com origem `herdado_grade`, PASSA
select lives_ok(
  $$insert into public.turma_disciplina
      (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
    values ('a9500000-0000-0000-0000-000000000001', 'a9300000-0000-0000-0000-000000000001',
            '2026-01-05', '2026-01-20', 'herdado_grade')$$,
  'FR-030.1 · a MESMA data fora da janela passa como `herdado_grade` — 4 linhas da base real dependem disso'
);

-- -- 3 — periodo manual DENTRO da janela passa
update public.turma_disciplina
   set previsao_inicio = '2026-03-10', previsao_termino = '2026-04-10', origem_periodo = 'manual'
 where turma_id = 'a9500000-0000-0000-0000-000000000001'
   and disciplina_id = 'a9300000-0000-0000-0000-000000000001';

select is(
  (select origem_periodo::text from public.turma_disciplina
    where turma_id = 'a9500000-0000-0000-0000-000000000001'
      and disciplina_id = 'a9300000-0000-0000-0000-000000000001'),
  'manual',
  'FR-030.1 · periodo manual DENTRO da janela e aceito'
);

-- -- 4 — turma SEM janela aceita o periodo informado (Q-07)
select lives_ok(
  $$insert into public.turma_disciplina
      (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
    values ('a9500000-0000-0000-0000-000000000005', 'a9300000-0000-0000-0000-000000000001',
            '2026-01-05', '2026-01-20', 'manual')$$,
  'Q-07 · turma sem janela aceita o periodo — sem janela nao ha contra o que validar'
);

-- -- 5 e 6 — a RPC faz a disciplina nascer SO nas turmas planejada/ativa
select public.criar_disciplina(jsonb_build_object(
  'curso_id', 'a9200000-0000-0000-0000-000000000001',
  'cod_disciplina', 'II',
  'nome_disciplina', 'Disciplina criada pela RPC',
  'carga_horaria_tempos', 20));

select is(
  (select count(*)::int from public.turma_disciplina td
     join public.disciplinas d on d.id = td.disciplina_id
     join public.turmas t on t.id = td.turma_id
    where d.cod_disciplina = 'II' and d.curso_id = 'a9200000-0000-0000-0000-000000000001'
      and t.status in ('planejada', 'ativa')),
  3,
  'FR-070 · a RPC cria a linha nas 3 turmas planejada/ativa (T1, T2 e T5)'
);

select is(
  (select count(*)::int from public.turma_disciplina td
     join public.disciplinas d on d.id = td.disciplina_id
     join public.turmas t on t.id = td.turma_id
    where d.cod_disciplina = 'II' and d.curso_id = 'a9200000-0000-0000-0000-000000000001'
      and t.status in ('concluida', 'cancelada')),
  0,
  'N-4 · turma concluida e cancelada NAO recebem a linha'
);

-- -- 7 — O CASO QUE DISCRIMINA DA A-2: `insert` direto nao cria linha nenhuma
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
values ('a9300000-0000-0000-0000-000000000003', 'T109-D3', 'a9200000-0000-0000-0000-000000000001',
        'III', 'Disciplina inserida direto, como o ETL faz', 10);

select is(
  (select count(*)::int from public.turma_disciplina
    where disciplina_id = 'a9300000-0000-0000-0000-000000000003'),
  0,
  'A-2 · `insert into disciplinas` DIRETO nao cria linha — e o que preserva o ETL e as amostras 020/094/097/098'
);

-- -- 8 — A-2b: reativar acrescenta a linha que falta, e a segunda chamada nao duplica
update public.disciplinas set status = 'inativo' where id = 'a9300000-0000-0000-0000-000000000003';
select public.reativar_disciplina('a9300000-0000-0000-0000-000000000003');
select public.reativar_disciplina('a9300000-0000-0000-0000-000000000003');

select is(
  (select count(*)::int from public.turma_disciplina
    where disciplina_id = 'a9300000-0000-0000-0000-000000000003'),
  3,
  'A-2b · reativar acrescenta as linhas que faltam nas planejada/ativa, e a segunda chamada NAO duplica'
);

select * from finish();
rollback;
