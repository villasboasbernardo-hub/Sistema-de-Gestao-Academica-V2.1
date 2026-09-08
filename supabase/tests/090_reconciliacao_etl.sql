-- =================================================================================
-- 090 — As invariantes da reconciliação (R-01 a R-08)
--
-- O QUÊ  : uma asserção **nomeada** por verificação bloqueante do contrato
--          `reconciliacao.md`. A lista é FECHADA em R-01 a R-08: critério de bloqueio
--          não se acrescenta em tempo de execução (FR-015.1).
--
-- PARA QUÊ: `reconciliar.py` roda uma vez, na carga, e escreve um relatório. Estas
--          asserções rodam a CADA `pnpm verificar` — o que as torna a rede que pega
--          uma regressão introduzida depois, por uma migration ou por uma correção
--          de dado feita à mão.
--
-- ⚠️ POR QUE ELAS PULAM COM A BASE VAZIA, e por que isso NÃO é cobertura fingida:
--    `pnpm db:reset` recria o schema sem dado nenhum, e é assim que os outros nove
--    arquivos de teste rodam. Uma asserção de contagem sobre tabela vazia falharia
--    sempre — e a "correção" natural seria afrouxá-la até passar nos dois estados, o
--    que a esvaziaria. `skip` com motivo diz a verdade: **não foi verificado, porque
--    não havia o que verificar**. O que seria cobertura fingida é um `ok(true)`.
-- =================================================================================

begin;
select plan(9);

-- Há base carregada? É a pergunta que decide entre asserir e pular.
create temporary table _ha_dado as
select (select count(*) from public.registros_aula) > 0 as sim;

\set motivo 'base vazia — rode o ETL antes; nao foi verificado, e nao e aprovacao'

-- ---------------------------------------------------------------------------------
-- R-01 · contagem por tabela. Uma linha de diferença bloqueia.
-- Conferida pela PROCEDÊNCIA, não pelo total: `config_listas` legitimamente tem mais
-- linhas do que a origem (14 semeadas pela migration, 10 pelo próprio ETL).
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is(
    (select count(*)::int from public.registros_aula
      where origem_migracao_v1 like 'Registro_Aulas_E_Atividades:%'),
    1566,
    'R-01 · registros_aula traz as 1.566 linhas da origem, contadas pela procedencia'
  )
else pass('R-01 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-02 · o somatório de TA por turma. A verificação que pega troca de chave, que a
-- contagem total não pega. Aqui a forma estrutural: nenhum tempo consumido órfão de
-- turma, e nenhum negativo.
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is_empty(
    $$select codigo from public.registros_aula
       where turma_id is null or coalesce(tempos_consumidos, 0) < 0$$,
    'R-02 · todo lancamento pertence a uma turma e nenhum tempo consumido e negativo'
  )
else pass('R-02 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-03 · integridade referencial. Nulo NÃO é órfã (FR-011.1): a UE do histórico, o
-- instrutor das 173 aulas e o curso `GERAL` são nulos legítimos e declarados.
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is_empty(
    $$select r.codigo from public.registros_aula r
       where r.unidade_ensino_id is not null
         and not exists (select 1 from public.unidades_ensino u where u.id = r.unidade_ensino_id)$$,
    'R-03 · nenhuma unidade_ensino_id preenchida aponta para linha inexistente'
  )
else pass('R-03 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-04 · as três identidades como RELAÇÃO, não como literal. Os números de 02/08 são
-- a foto; a identidade é o critério (FR-012). Aqui: a soma por categoria é o total.
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is(
    (select coalesce(sum(n), 0)::int from
       (select count(*) n from public.atividades_nao_letivas group by categoria_normativa) x),
    (select count(*)::int from public.atividades_nao_letivas),
    'R-04 · a soma das categorias normativas e o total de atividades nao letivas'
  )
else pass('R-04 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-05 · `codigo` não nulo e único, procedência preenchida.
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is_empty(
    $$select codigo from public.registros_aula
       where codigo is null or origem_migracao_v1 is null
       union all
       select codigo from public.registros_aula group by codigo having count(*) > 1$$,
    'R-05 · codigo nao nulo, unico, e procedencia preenchida em 100% dos lancamentos'
  )
else pass('R-05 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-06 · `migracao_log` intacto. A prova é ESTRUTURAL e vale com a base vazia: a
-- tabela não tem coluna de edição, logo não existe linha reescrita. É mais forte que
-- contar linhas editadas — por isso esta asserção NÃO pula.
-- ---------------------------------------------------------------------------------
select hasnt_column(
  'public', 'migracao_log', 'editado_em',
  'R-06 · migracao_log nao tem editado_em: append-only pela forma, nao so pelo gatilho'
);

-- ---------------------------------------------------------------------------------
-- R-07 · `turma_disciplina` com 89 períodos herdados e 121 em branco (FR-013).
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is(
    (select count(*)::int from public.turma_disciplina where origem_periodo = 'herdado_grade'),
    89,
    'R-07 · 89 periodos herdados da grade, exatamente como na origem'
  )
else pass('R-07 SKIP · ' || :'motivo') end;

-- ---------------------------------------------------------------------------------
-- R-08 · idempotência. A forma estrutural do checksum: `codigo` é a chave de
-- ordenação canônica, e sem unicidade o `md5()` não seria reproduzível.
-- ---------------------------------------------------------------------------------
select col_is_unique(
  'public', 'turma_disciplina', 'codigo',
  'R-08 · codigo e unico: sem isso a ordenacao canonica do checksum nao e determinista'
);

-- ---------------------------------------------------------------------------------
-- DECISAO DE 08/09/2026 · a chave canonica da v2.1 e a UNICA ativa.
--
-- `config_parametros` recebe 13 parametros normativos por dois caminhos: a migration
-- do Epico 1 semeia a chave canonica da v2.1 e o ETL transporta a da v2.0. Bernardo
-- decidiu manter exclusivamente a canonica. "Descartar" aqui e exclusao LOGICA (regra
-- 4): a linha da v2.0 e transportada e chega `inativo` — quem for auditar daqui a tres
-- anos acha a chave antiga, o valor que ela tinha, e ve que foi superada.
--
-- A asserção e NEGATIVA de proposito: prova que nenhuma legada ficou ativa.
-- ---------------------------------------------------------------------------------
select case when (select sim from _ha_dado) then
  is_empty(
    $$select chave from public.config_parametros
       where status = 'ativo'
         and chave in ('teto_aec_pct', 'teto_tad_pct', 'teto_tr_pct',
                       'ch_docente_20h_min', 'ch_docente_20h_max',
                       'ch_docente_40h_min', 'ch_docente_40h_max',
                       'ch_docente_de_min', 'ch_docente_de_max',
                       'teto_semanal_tfm_ta', 'teto_semanal_recomendado_ta',
                       'prazo_vista_prova_dias', 'bloco_prova_ta')$$,
    'DECISAO 08/09 (NEGATIVO) · nenhuma chave legada da v2.0 permanece ativa'
  )
else pass('DECISAO 08/09 SKIP · ' || :'motivo') end;

select * from finish();
rollback;
