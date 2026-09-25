-- =================================================================================
-- 111 — O modelo do curriculo, a marca de disciplina sem UE e o limiar do aviso
--
-- O QUE  : prova o `FR-050` e o `FR-063` da spec 010 — a D-B3 ("nem todo curso tem UE; os
--          que nao tem MUST funcionar sem UE e SEM AVISO ENGANOSO") vira DADO, e o limiar
--          de 30 dias vira PARAMETRO, nunca constante (regra 8 do `CLAUDE.md`).
--
-- ⚠️ ESTA MIGRATION NAO MARCA CURSO NENHUM, e a assercao 4 e o que declara isso: quem
--    marca e a carga do PR 2, a partir da conferencia dos 24 curriculos. Estrutura e dado
--    sao PRs diferentes de proposito.
-- =================================================================================
begin;
select plan(6);

-- -- 1 e 2 — o modelo do curriculo existe, com o padrao certo, e recusa valor fora da lista
select has_column('public', 'cursos', 'curriculo_modelo',
  'FR-063 · `cursos.curriculo_modelo` existe — o modelo do curriculo e DADO, nao deducao');

select throws_ok(
  $$insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias, curriculo_modelo)
    values ('T111-CUR', 'Curso T111', 'regular', 'presencial', 30, 'por_objetivos')$$,
  '23514',
  null,
  'FR-063 · valor fora dos dois modelos declarados e recusado pelo CHECK'
);

-- -- 3 — a marca por disciplina (a D-B3 vale por disciplina, nao so por curso)
select has_column('public', 'disciplinas', 'sem_unidades_ensino',
  'FR-063 · `disciplinas.sem_unidades_ensino` existe — as 5 AMBIENTACAO VIRTUAL dependem dela');

-- -- 4 — nenhum curso foi marcado aqui: quem marca e a carga do PR 2
select is(
  (select count(*)::int from public.cursos where curriculo_modelo <> 'unidades_de_ensino'),
  0,
  'FR-063 · esta migration nao marca curso nenhum — estrutura e dado sao PRs diferentes'
);

-- -- 5 e 6 — o parametro do aviso de inicio proximo
select is(
  (select valor from public.config_parametros
    where chave = 'disciplinas.aviso_inicio_dias' and status = 'ativo'),
  '30',
  'FR-050 · o limiar do aviso de inicio proximo e PARAMETRO, com o valor 30'
);

select is(
  (select natureza from public.config_parametros
    where chave = 'disciplinas.aviso_inicio_dias' and status = 'ativo'),
  'operacional',
  'FR-050 · e `operacional`: o numero e decisao da Divisao, nao texto de norma — por isso nao exige fundamento'
);

select * from finish();
rollback;
