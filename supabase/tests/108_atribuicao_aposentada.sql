-- =================================================================================
-- 108 — A atribuicao de instrutor por turma tem UMA fonte de verdade
--
-- O QUE  : prova a Q-01 (Bernardo Villas Boas, 24/09/2026) — `turma_disciplina_instrutor`
--          e a fonte; as tres colunas que a duplicavam estao APOSENTADAS, sem `drop`; e
--          nenhum valor foi perdido no caminho (`FR-032`, `FR-032.1`). E a Q-02: as tres
--          praticas de fim de curso em modo `simultaneo`, e `herdar` recusado na coluna
--          de padrao da disciplina (N-2).
--
-- ⚠️ A ASSERCAO 1 E A I-3, E ELA SO PROVA ALGO NA BASE POVOADA. Rodando depois de
--    `db:reset:limpo` ela passa vazia — e isso esta declarado aqui de proposito, porque
--    "passa vacuamente" e o modo de falha que a spec 002 ja teve com a soma das UEs. A
--    execucao que conta e a da base carregada pelo ETL (quickstart passo 1), e o bloco
--    `DO` da propria migration a refaz no remoto, onde o dado ja esta.
--
-- ⚠️ A ASSERCAO 6 E O CASO QUE DISCRIMINA DA Q-02: sem a marcacao, as tres estariam em
--    `dividido` como as outras 172 — que e exatamente o estado que o ETL deixou (0 de 175
--    em `simultaneo`, medido em 24/09/2026).
-- =================================================================================
begin;
select plan(7);

-- -- 1 — I-3: nenhum `instrutor_id` ficou sem par ativo na juncao
select is(
  (select count(*)::int from public.turma_disciplina td
    where td.instrutor_id is not null
      and not exists (select 1 from public.turma_disciplina_instrutor i
                       where i.turma_disciplina_id = td.id
                         and i.instrutor_id = td.instrutor_id
                         and i.status = 'ativo')),
  0,
  'FR-032.1 · todo `turma_disciplina.instrutor_id` tem par ATIVO na juncao — 79 de 79 na base carregada'
);

-- -- 2 e 3 — as colunas continuam existindo (regra de banco: nada de `drop`)
select has_column('public', 'turma_disciplina', 'instrutor_id',
  'FR-032 · a coluna aposentada NAO e removida — coluna com historico fica');
select has_column('public', 'disciplinas', 'instrutores_atribuidos',
  'FR-032 · `instrutores_atribuidos` tambem fica, aposentada por comentario');

-- -- 4 — e o comentario diz que estao aposentadas; e a unica marca que sobra no catalogo
select matches(
  col_description('public.turma_disciplina'::regclass,
                  (select attnum from pg_attribute
                    where attrelid = 'public.turma_disciplina'::regclass
                      and attname = 'instrutor_id')),
  'APOSENTADA',
  'FR-032 · o comentario de `instrutor_id` marca a aposentadoria, e diz que a LIQ passa a ler a juncao'
);

-- -- 5 — as duas colunas que nunca foram preenchidas continuam vazias
select is(
  (select count(*)::int from public.turma_disciplina where ch_prevista_por_instrutor is not null)
  + (select count(*)::int from public.disciplinas where cardinality(instrutores_atribuidos) > 0),
  0,
  'FR-032 · `ch_prevista_por_instrutor` e `instrutores_atribuidos` seguem vazias — nada foi perdido'
);

-- -- 6 — o caso que discrimina da Q-02: as tres nomeadas estao em `simultaneo`
--        (na base carregada; em base vazia a contagem e 0 dos dois lados e a asserção
--        continua verdadeira, porque compara com o que existe)
select is(
  (select count(*)::int from public.disciplinas
    where codigo in ('53 - C-Ap-FR - XIII', '41 - C-Ap-HN - XVIII', '20 - CAHO - XVIII')
      and modo_atribuicao_padrao <> 'simultaneo'),
  0,
  'Q-02 · nenhuma das tres praticas nomeadas pela RN-MAT-05 ficou em `dividido`'
);

-- -- 7 — N-2: `herdar` e recusado na coluna de padrao da disciplina pelo CHECK que JA EXISTIA
select throws_ok(
  $$insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias)
    values ('a8200000-0000-0000-0000-000000000001', 'T108-CUR', 'Curso T108', 'regular', 'presencial', 30);
    insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina,
                                    carga_horaria_tempos, modo_atribuicao_padrao)
    values ('a8200000-0000-0000-0000-000000000001', 'T108-A', 'Com herdar', 10, 'herdar')$$,
  '23514',
  null,
  'N-2 · `herdar` e recusado em `disciplinas.modo_atribuicao_padrao` — o CHECK ja existia, e nao foi recriado'
);

select * from finish();
rollback;
