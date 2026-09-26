-- =====================================================================================
-- 112_carga_unidades_ensino.sql — a carga das UEs dos curriculos oficiais da DEnsM
-- Epico 5 · fatia (b) · specs/010-disciplinas-e-unidades-de-ensino · T020
-- -------------------------------------------------------------------------------------
-- ⚠️ **NENHUMA ASSERCAO AQUI E PULADA, E ISSO E DE PROPOSITO.** A suite roda contra a base
--    do `db:reset:limpo`, que nasce **vazia**, e a migration da carga se abstem ali (ela
--    precisa dos cadastros). Em vez de `skip`, cada assercao compara com **o valor certo para
--    o estado em que a base esta**: 587 quando a carga esta presente, **0** quando nao esta.
--    As duas leituras sao verdades que importam — a segunda prova que a migration se abstem
--    de verdade, em vez de carregar meia coisa numa base sem destino.
--    ⚠️ O que ela NAO admite e o meio: 586, ou 587 sem fundamento, ou 587 em 137 disciplinas.
--
-- ⚠️ **A ASSERCAO `FR-024` DO `050` PASSAVA VACUAMENTE, E CONTINUA PASSANDO — POR OUTRO
--    MOTIVO.** Ela e global (`toda disciplina com UE fecha a soma`) e, com `unidades_ensino`
--    vazia, so via a amostra de 3 UEs que ela mesma semeia: passava sem dizer nada sobre o
--    catalogo. Com o catalogo carregado ela passaria a reprovar, porque **4** disciplinas reais
--    divergem — e as 4 estao confirmadas com pagina na conferencia. O `050` foi escopado para
--    excluir essas 4, nominalmente, e a conta do catalogo mora aqui.
--
-- ⚠️ **AS 4 DIVERGENCIAS SAO ESPERADAS E NOMEADAS, e o dia em que uma delas sumir este arquivo
--    REPROVA — corretamente.** Elas nao sao erro da carga: sao divergencia de CADASTRO entre o
--    banco e o curriculo, confirmada por leitura independente, que **Bernardo corrige na tela**
--    (P-1, Q-06) e nunca um script (a migration da carga nao toca CH de disciplina). Quando ele
--    corrigir `C-Ap-FR III` de 76 para 75, esta lista encolhe: o numero novo e o certo e passa a
--    ser o esperado, com a razao escrita — regra dos valores esperados, caso (a).
-- =====================================================================================
begin;
select plan(12);

-- Quantas a carga declara. Conferido contra `pareamento_ue.csv` e contra a assercao que a
-- propria migration carrega — sao tres lugares dizendo o mesmo numero de proposito.
create temporary view carregada as
  select exists (
    select 1 from public.unidades_ensino
     where origem_migracao_v1 like '%\_carga\_unidades\_ensino.sql'
  ) as sim;

-- ============================================ FR-066 — a carga esta inteira, ou ausente
select is(
  (select count(*)::int from public.unidades_ensino),
  (select case when sim then 587 else 0 end from carregada),
  'FR-066 · unidades_ensino tem 587 linhas com a carga, e 0 sem ela — nunca um numero no meio'
);

select is(
  (select count(distinct disciplina_id)::int from public.unidades_ensino),
  (select case when sim then 138 else 0 end from carregada),
  'FR-066 · as 587 caem em 138 disciplinas: 136 do curriculo, com 2 desdobradas em 4 (N-3)'
);

select is(
  (select coalesce(sum(ch_prevista_tempos), 0)::int from public.unidades_ensino),
  (select case when sim then 7411 else 0 end from carregada),
  'FR-066 / Q-12 · a soma das CH e 7411 — a CH entra SEM conversao, 1 TA = 1 hora'
);

-- ============================================ FR-064 — procedencia e fundamento em TODA linha
select is_empty(
  $$select codigo, numero_ue from public.unidades_ensino
     where fundamento_normativo is null or btrim(fundamento_normativo) = ''$$,
  'FR-064 · nenhuma UE sem fundamento normativo — ela diz de qual documento veio'
);

select is_empty(
  $$select codigo, numero_ue from public.unidades_ensino
     where origem_migracao_v1 is null$$,
  'FR-064 · nenhuma UE sem procedencia — e o que distingue carga de digitacao (D-B4)'
);

-- ⚠️ O fundamento tem DUAS formas, e so duas: o Oficio da DEnsM ou a capa do curriculo.
-- Uma terceira forma e sinal de que alguem preencheu a mao.
select is_empty(
  $$select distinct fundamento_normativo from public.unidades_ensino
     where fundamento_normativo not like 'Of no %'
       and fundamento_normativo not like 'Curriculo %'$$,
  'FR-064 · todo fundamento e `Of no N-N/AAAA` ou `Curriculo <sigla> — <orgao>, <ano>`'
);

-- ============================================ FR-067 — a soma, e as 4 divergencias nomeadas
-- ⚠️ ESTA E A ASSERCAO QUE DISCRIMINA A CARGA. Trocar a CH de UMA UE carregada faz aparecer
--    uma quinta linha aqui, e o arquivo reprova nomeando a disciplina. Com `unidades_ensino`
--    vazia ela fica vazia dos dois lados e nao prova nada — e por isso a T022 planta o defeito
--    numa base CARREGADA, que e onde ela mede.
select is_empty(
  $$select c.codigo || ' / ' || d.codigo as onde,
           d.carga_horaria_tempos as ch_do_banco,
           sum(u.ch_prevista_tempos) as soma_das_ue
      from public.unidades_ensino u
      join public.disciplinas d on d.id = u.disciplina_id
      join public.cursos c on c.id = d.curso_id
     where u.status = 'ativo' and d.status = 'ativo'
     group by c.codigo, d.codigo, d.carga_horaria_tempos
    having sum(u.ch_prevista_tempos) <> d.carga_horaria_tempos
       -- As QUATRO declaradas, cada uma com a pagina na conferencia dos curriculos:
       and d.codigo not in (
         '44 - C-Ap-FR - III',      -- §4.3: banco 76 x curriculo 75 (p. 6, 12). Bernardo corrige.
         '86 - C-Exp-MetocOf - I',  -- §4.3: banco 48 x curriculo 30 (p. 4, 5). "copiada do SP".
         '90 - C-Exp-MetocOf - V',  -- §4.3: banco 40 x curriculo 50 (p. 4, 15).
         '150 - EST-QF-APOC - I'    -- §4.1: 79 x 80, divergencia INTERNA do PDF (TEMPO RESERVA
                                    --       1 HORA, p. 4). Excluida NOMINALMENTE, por P-4.
       )$$,
  'FR-067 · a soma das UE fecha com a CH em toda disciplina carregada, fora as 4 declaradas'
);

-- E o outro lado da mesma moeda: as 4 continuam divergindo. Se uma parar de divergir sem que
-- esta lista mude, o arquivo reprova — e e assim que a correcao de Bernardo aparece aqui.
select is(
  (select count(*)::int from (
     select d.codigo
       from public.unidades_ensino u
       join public.disciplinas d on d.id = u.disciplina_id
      group by d.codigo, d.carga_horaria_tempos
     having sum(u.ch_prevista_tempos) <> d.carga_horaria_tempos) as divergem),
  (select case when sim then 4 else 0 end from carregada),
  'P-1 · as divergencias de CH sao exatamente as 4 declaradas — uma a menos e correcao a registrar'
);

-- ============================================ N-3 — os dois desdobramentos, por UE
-- ⚠️ Reduzido a UMA cadeia de texto de proposito, e nao a um `results_eq`: assim a assercao
--    vale nos dois estados da base, como as outras deste arquivo. Um `results_eq` contra quatro
--    linhas fixas reprovaria na base vazia — foi o que aconteceu na primeira execucao.
select is(
  (select coalesce(string_agg(linha, ' | ' order by linha), '(sem carga)') from (
     select d.codigo || '=' || count(*) || '/' || sum(u.ch_prevista_tempos) as linha
       from public.unidades_ensino u
       join public.disciplinas d on d.id = u.disciplina_id
      where d.codigo in ('1 - CAHO - MAT', '2 - CAHO - FIS',
                         '23 - C-Ap-HN - I', '24 - C-Ap-HN - I-I')
      group by d.codigo) as x),
  (select case when sim then
     '1 - CAHO - MAT=1/28 | 2 - CAHO - FIS=1/28 | '
     '23 - C-Ap-HN - I=6/105 | 24 - C-Ap-HN - I-I=1/21'
   else '(sem carga)' end from carregada),
  'N-3 · o desdobramento cai por UE: MAT 28, FIS 28, `I` 105 em 6 UEs, `I-I` 21 em 1'
);

-- ============================================ D-B3 — curso e disciplina sem UE sao DADO
select is(
  (select count(*)::int from public.cursos where curriculo_modelo = 'competencias'),
  (select case when sim then 2 else 0 end from carregada),
  'D-B3 · `C-Espc-FR` e `C-Espc-HN` marcados por competencias — nao e deducao da ausencia'
);

select is(
  (select count(*)::int from public.disciplinas where sem_unidades_ensino),
  (select case when sim then 6 else 0 end from carregada),
  'D-B3 · as 6 sem UE por natureza marcadas: 5 AMBIENTACAO + a `IV` emprestada do SP (§4.5, §4.6)'
);

-- ============================================ gotcha 9 — a sequencia nao fica atras
-- Sem isto, a primeira UE criada na tela colide com uma que a carga acabou de trazer, e a
-- mensagem fala de valor duplicado com dado inedito.
select ok(
  (select last_value from app.unidades_ensino_codigo_seq)
    >= (select count(*) from public.unidades_ensino),
  'gotcha 9 · a sequencia `UE-` esta a frente do que a carga inseriu — nada de `setval` a mao'
);

select * from finish();
rollback;
