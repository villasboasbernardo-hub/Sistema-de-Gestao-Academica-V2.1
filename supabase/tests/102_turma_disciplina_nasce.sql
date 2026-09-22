-- =================================================================================
-- 102 — As linhas de disciplina nascem com a turma (Épico 5, fatia (a), migration 4)
--
-- O QUÊ  : criar turma, POR QUALQUER CAMINHO, faz nascer uma `turma_disciplina` por
--          disciplina ATIVA do curso, com o período herdado da grade quando a condição
--          vale e em branco nos demais casos. FR-032 a FR-032.3, SC-004.3, I-5, R-5, R-6.
--
-- ⚠️ A CONDIÇÃO DE HERANÇA É COMPORTAMENTO EXISTENTE, e foi lida no código que criou as 210
--    linhas da v2.0 — `migracao/criar_turma_disciplina.py`, linhas 153-157:
--        herda = grade_ini and janela_ini and janela_fim and janela_ini <= grade_ini <= janela_fim
--    O comentário do próprio script diz por quê: *"é o que impede a data da T1 de ser copiada
--    para a T2 do mesmo curso"*. Não é invenção desta fatia, e não pode ser "melhorada".
--
-- ⚠️ SÓ DISCIPLINA ATIVA, e isso DIFERE do script da v2.0, que replicava todas. É de lá que vem a
--    linha da disciplina inativa `ALH-II` em `C-Esp-ALH 2026` — 9 linhas para 8 disciplinas ativas.
--    Aquela linha é **fato histórico**: não se remove e não se replica (FR-032.3).
--
-- ⚠️ E CURSO SEM DISCIPLINA ATIVA GERA TURMA COM ZERO LINHAS — aviso, nunca bloqueio. Um gatilho
--    que recusasse a turma ali estaria transformando ausência de grade em impedimento de cadastro.
--
-- ⚠️ A PROVA DE PERMISSÃO NÃO MORA AQUI, e o motivo é o que este arquivo não pode fazer: o pgTAP
--    roda como DONO DO SCHEMA, e sob privilégio de dono **a RLS não se aplica**. Uma asserção de
--    permissão escrita aqui passaria com a RLS desligada. Ela está em
--    `tests/invariantes/rls/cursos-e-turmas.test.ts`, com **sessão autenticada de verdade** e nas
--    **duas metades** — cria turma sem `disciplinas.editar`, e é recusado ao escrever direto na
--    tabela (exigência de Bernardo Villas Boas, 17/09/2026).
-- =================================================================================

begin;
select plan(15);

-- --------------------------------------------------------------------------- amostra
-- Um curso com 22 disciplinas ativas e UMA inativa. A janela da turma vai de 01/03 a 30/06.
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('10200000-0000-0000-0000-000000000001', 'T102-CUR', 'Curso T102', 'regular', 'presencial', 120),
  ('10200000-0000-0000-0000-000000000002', 'T102-VAZIO', 'Curso T102 sem grade', 'expedito', 'presencial', 10);

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
                                previsao_inicio, previsao_termino)
select
  ('20200000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'T102-D' || lpad(n::text, 2, '0'),
  '10200000-0000-0000-0000-000000000001',
  'T102-' || lpad(n::text, 2, '0'),
  'Disciplina T102 numero ' || n,
  10,
  -- 20 delas com previsao DENTRO da janela; a 21 com previsao FORA; a 22 SEM previsao nenhuma.
  case when n <= 20 then date '2040-03-10'
       when n = 21  then date '2040-01-05'
       else null end,
  case when n <= 20 then date '2040-04-10'
       when n = 21  then date '2040-02-05'
       else null end
from generate_series(1, 22) as n;

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, status) values
  ('20200000-0000-0000-0000-0000000000f0', 'T102-INATIVA', '10200000-0000-0000-0000-000000000001',
   'T102-IN', 'Disciplina T102 inativa', 10, 'inativo');

-- ======================================================= FR-032 / FR-032.3 — quantas nascem
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('30200000-0000-0000-0000-000000000001', '10200000-0000-0000-0000-000000000001', 'T1', 2040,
   'planejada', 'presencial', '2040-03-01', '2040-06-30');

select is(
  (select count(*)::int from public.turma_disciplina where turma_id = '30200000-0000-0000-0000-000000000001'),
  22,
  'FR-032 · a turma nasce com UMA linha por disciplina ATIVA do curso — 22 de 22'
);

select is_empty(
  $$select td.codigo from public.turma_disciplina td
     where td.turma_id = '30200000-0000-0000-0000-000000000001'
       and td.disciplina_id = '20200000-0000-0000-0000-0000000000f0'$$,
  'FR-032.3 · a disciplina INATIVA nao e replicada — e o que difere do script da v2.0, de proposito'
);

-- ================================================= FR-032.1 — a condicao de heranca, nas duas pontas
select is(
  (select count(*)::int from public.turma_disciplina
    where turma_id = '30200000-0000-0000-0000-000000000001' and origem_periodo = 'herdado_grade'),
  20,
  'FR-032.1 · herdam as 20 cuja previsao de inicio cai DENTRO da janela completa da turma'
);

select results_eq(
  $$select previsao_inicio, previsao_termino from public.turma_disciplina
     where turma_id = '30200000-0000-0000-0000-000000000001'
       and disciplina_id = '20200000-0000-0000-0000-000000000001'$$,
  $$values ('2040-03-10'::date, '2040-04-10'::date)$$,
  'FR-032.1 · e herdando copia AS DUAS datas da grade, nao so a de inicio'
);

select results_eq(
  $$select origem_periodo::text, previsao_inicio is null, previsao_termino is null
      from public.turma_disciplina
     where turma_id = '30200000-0000-0000-0000-000000000001'
       and disciplina_id = '20200000-0000-0000-0000-000000000021'$$,
  $$values ('nao_informado'::text, true, true)$$,
  'FR-032.1 · previsao FORA da janela nao herda — e a regra que impede a data da T1 cair na T2'
);

select results_eq(
  $$select origem_periodo::text from public.turma_disciplina
     where turma_id = '30200000-0000-0000-0000-000000000001'
       and disciplina_id = '20200000-0000-0000-0000-000000000022'$$,
  $$values ('nao_informado'::text)$$,
  'FR-032.1 · disciplina SEM previsao na grade nasce nao_informado'
);

-- ================================================= FR-032.1 — turma sem datas, e janela incompleta
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('30200000-0000-0000-0000-000000000002', '10200000-0000-0000-0000-000000000001', 'T2', 2040,
   'planejada', 'presencial');
select is(
  (select count(*)::int from public.turma_disciplina
    where turma_id = '30200000-0000-0000-0000-000000000002' and origem_periodo <> 'nao_informado'),
  0,
  'FR-032.1 · turma SEM datas: 100% nao_informado — nao da para avaliar a condicao, e nao se inventa'
);

insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio) values
  ('30200000-0000-0000-0000-000000000003', '10200000-0000-0000-0000-000000000001', 'T3', 2040,
   'planejada', 'presencial', '2040-03-01');
select is(
  (select count(*)::int from public.turma_disciplina
    where turma_id = '30200000-0000-0000-0000-000000000003' and origem_periodo <> 'nao_informado'),
  0,
  'FR-032.1 · janela INCOMPLETA (so inicio) tambem nao permite avaliar: 100% nao_informado'
);

-- ===================================================== FR-032.3 — curso sem grade nao e bloqueio
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('30200000-0000-0000-0000-000000000004', '10200000-0000-0000-0000-000000000002', 'T1', 2040,
   'planejada', 'presencial');
select is(
  (select count(*)::int from public.turma_disciplina where turma_id = '30200000-0000-0000-0000-000000000004'),
  0,
  'FR-032.3 · curso sem disciplina ativa gera turma com ZERO linhas — aviso, nunca bloqueio'
);

-- ===================================================== R-5 — o codigo, e a atomicidade
select is(
  (select count(*)::int from public.turma_disciplina
    where turma_id = '30200000-0000-0000-0000-000000000001' and codigo !~ '^TDI-[0-9]{6}$'),
  0,
  'FR-032.2 · todo codigo gerado segue TDI-NNNNNN, o formato real da base'
);

-- ⚠️ DUAS TURMAS EM SEQUENCIA NAO REPETEM CODIGO. `nextval` e atomica e nao transacional: cada
-- chamada devolve um valor que nenhuma outra sessao recebe. O custo aceito e BURACO na numeracao
-- quando uma transacao e desfeita — o codigo identifica, nao conta.
select is(
  (select count(distinct codigo)::int from public.turma_disciplina
    where turma_id in ('30200000-0000-0000-0000-000000000001', '30200000-0000-0000-0000-000000000002')),
  44,
  'R-5 · duas turmas criadas em sequencia geram 44 codigos DISTINTOS — nenhum repetido'
);

-- ⚠️ A INVARIANTE QUE PEGA A CARGA: a sequencia nunca esta ATRAS do maior codigo gravado. Se ficar,
-- a proxima turma criada colide com `23505` — alto e com erro, nunca em silencio. Quem a mantem
-- verdadeira depois de uma carga e o passo final do ETL (T073), que avanca a sequencia.
select cmp_ok(
  (select coalesce(pg_sequence_last_value('app.turma_disciplina_codigo_seq'), 0))::bigint,
  '>=',
  (select coalesce(max(substring(codigo from 5)::bigint), 0) from public.turma_disciplina
    where codigo ~ '^TDI-[0-9]+$'),
  'R-5 · a sequencia TDI- nunca esta atras do maior codigo gravado'
);

-- ⚠️ E O GERADOR NAO PODE TER `max()`. E o padrao que a fatia (c) usa em `proximo_codigo_vinculo()`
-- e que o R-5 recusa: duas sessoes com a sequencia atrasada leem o mesmo `max` e devolvem o MESMO
-- codigo. Aqui e `nextval` e nada mais — e esta assercao existe para que ninguem "conserte" isso
-- copiando o padrao antigo.
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'proximo_codigo_turma_disciplina'
      and p.prosrc ~* '\mmax\s*\('),
  0,
  'R-5 · o gerador do codigo TDI- NAO le max() — e sequencia, e so sequencia'
);

-- ⚠️ FALHA DO GATILHO DESFAZ A TURMA. O defeito e deliberado: um gatilho que recusa toda insercao
-- em `turma_disciplina`. Sem atomicidade, a turma ficaria gravada com a grade pela metade.
create trigger trg_defeito_deliberado_102
  before insert on public.turma_disciplina
  for each row execute function app.bloquear_reescrita();

select throws_ok(
  $$insert into public.turmas (curso_id, turma, ano_letivo, status, modalidade)
    values ('10200000-0000-0000-0000-000000000001', 'T9', 2040, 'planejada', 'presencial')$$,
  'P0001',
  null,
  'FR-032 · se o nascimento das linhas falha, a criacao da turma falha junto'
);

drop trigger trg_defeito_deliberado_102 on public.turma_disciplina;

select is(
  (select count(*)::int from public.turmas
    where curso_id = '10200000-0000-0000-0000-000000000001' and turma = 'T9'),
  0,
  'FR-032 · e a turma NAO fica gravada — as linhas sao consequencia estrutural, na mesma transacao'
);

select * from finish();
rollback;
