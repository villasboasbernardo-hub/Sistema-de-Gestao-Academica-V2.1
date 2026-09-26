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

-- -- 4 — quem e marcado por competencias, e a coerencia da marca
-- ⚠️ **EMENDADA EM 26/09/2026, PORQUE A CARGA DO PR 2 CHEGOU.** A forma anterior exigia ZERO
--    cursos marcados e dizia, no proprio texto, *"quem marca e a carga do PR 2"* — ela media o
--    ESTADO daquele momento. Com `C-Espc-FR` e `C-Espc-HN` marcados ela passou a reprovar
--    (`have: 2, want: 0`), e reprovava CERTO.
--    A regra permanente e a COERENCIA da marca: curso por competencias **nao tem UE nenhuma**,
--    e curso com UE **nao e** por competencias. Nesta forma ela vale nos dois estados da base e
--    reprova no caso que interessa — um curso marcado por engano, ou uma UE carregada num curso
--    por competencias, que e a contradicao que a D-B3 existe para impedir.
--    A CONTAGEM (sao exatamente 2) mora em `112_carga_unidades_ensino.sql`, junto da carga que
--    a produz. Regra dos valores esperados, caso (a).
select is_empty(
  $$select c.codigo, c.curriculo_modelo, count(u.id) as ues
      from public.cursos c
      left join public.unidades_ensino u on u.curso_id = c.id and u.status = 'ativo'
     group by c.codigo, c.curriculo_modelo
    having c.curriculo_modelo = 'competencias' and count(u.id) > 0$$,
  'FR-063 / D-B3 · nenhum curso por competencias tem UE — a marca e coerente com o dado'
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
