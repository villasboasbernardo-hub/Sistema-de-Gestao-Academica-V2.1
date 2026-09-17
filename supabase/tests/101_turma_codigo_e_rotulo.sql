-- =================================================================================
-- 101 — O código e o rótulo da turma (Épico 5, fatia (a))
--
-- O QUÊ  : parte 1 — o RÓTULO tem forma imposta pelo banco: `T` maiúsculo seguido de
--          inteiro positivo, sem espaço. FR-025.2, SC-004.4, invariante I-4.
--          (A parte do código gerado entra na migration 3, na T031.)
--
-- ⚠️ POR QUE A FORMA É DO BANCO, e não só do formulário. A unicidade do FR-026 é por
--    IGUALDADE DE TEXTO: `t1`, `T1 ` com espaço e `Turma 1` passariam por ela como
--    rótulos DIFERENTES da `T1`, e gerariam código de turma fora do padrão — o código é
--    `sigla [rótulo] ano` e sai impresso no DSA.
--
-- ⚠️ E NÃO É MOTIVO DE ENDEREÇO. O `FR-031.1` proíbe restringir rótulo por causa de URL;
--    a restrição existe pela unicidade e pelo código, não pela barra de endereços.
--
-- ⚠️ MEDIDO EM 16/09/2026: os 10 rótulos da base são `T1` ou `T2`. A restrição entra
--    SEM SANEAMENTO — nenhuma turma existente precisa ser tocada para ela passar.
-- =================================================================================

begin;
select plan(8);

create temporary table _ha_dado as
select (select count(*) from public.turmas) > 0 as sim;

\set motivo 'base vazia — rode o ETL antes; nao foi verificado, e nao e aprovacao'

-- --------------------------------------------------------------------------- amostra
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('10100000-0000-0000-0000-000000000101', 'T101-CUR', 'Curso T101', 'expedito', 'presencial', 10);

-- ================================================= FR-025.2 — os quatro que sao recusados
select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR t1 2026', '10100000-0000-0000-0000-000000000101', 't1', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo em minuscula (t1) e RECUSADO — a unicidade e por igualdade de texto'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T1 2026', '10100000-0000-0000-0000-000000000101', 'T1 ', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo com espaco no fim (T1 ) e RECUSADO — invisivel na tela, diferente para o banco'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR Turma 1 2026', '10100000-0000-0000-0000-000000000101', 'Turma 1', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo por extenso (Turma 1) e RECUSADO'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T0 2026', '10100000-0000-0000-0000-000000000101', 'T0', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · T0 e RECUSADO — o numero e inteiro POSITIVO, e nao existe turma zero'
);

-- ================================================ FR-025.2 — os que a base ja usa, aceitos
select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T1 2026', '10100000-0000-0000-0000-000000000101', 'T1', 2026, 'planejada', 'presencial')$$,
  'FR-025.2 · T1 e aceito'
);

select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T2 2026', '10100000-0000-0000-0000-000000000101', 'T2', 2026, 'planejada', 'presencial')$$,
  'FR-025.2 · T2 e aceito'
);

-- ⚠️ AUSENCIA DE ROTULO E LEGITIMA E PERMANENTE (FR-025.1), como o Epico 2 ratificou em
-- 08/09/2026: turma unica no ano nao tem rotulo, e exigir um seria inventar dado.
select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR 2027', '10100000-0000-0000-0000-000000000101', null, 2027, 'planejada', 'presencial')$$,
  'FR-025.1 · turma SEM rotulo continua aceita — a restricao vale so para rotulo preenchido'
);

-- ============================================= SC-004.4 — a base real passa sem saneamento
select case when (select sim from _ha_dado) then
  is_empty(
    $$select codigo from public.turmas
       where turma is not null and turma !~ '^T[1-9][0-9]*$'$$,
    'SC-004.4 · nenhuma turma da base tem rotulo fora do padrao — a restricao entrou sem saneamento'
  )
else pass('SC-004.4 SKIP · ' || :'motivo') end;

select * from finish();
rollback;
