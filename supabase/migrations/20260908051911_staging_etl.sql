-- =================================================================================
-- STAGING — o retrato textual da origem, dentro do banco de destino
--
-- O QUÊ  : o schema `staging` e as tabelas que recebem o CSV verbatim, TUDO `text`.
--
-- PARA QUÊ: é a etapa que mais gente corta, e a que mais paga. Pôr o CSV bruto dentro
--          do banco ANTES de qualquer conversão transforma a reconciliação inteira em
--          consulta SQL de duas tabelas no MESMO MOTOR — em vez de uma comparação
--          entre estrutura em memória e resultado de consulta, que é justamente o tipo
--          de comparação que passa quando não deveria (documento 30 §1.1, contrato P-2).
--
-- POR QUE TUDO `text`: nenhuma conversão antes de o dado estar dentro. Se a staging
--          tivesse tipo, o erro de conversão aconteceria na PORTA e a origem chegaria
--          já corrompida — e a reconciliação compararia duas cópias do mesmo erro.
--
-- CICLO DE VIDA (corrigido em 08/09/2026, achado CHK012): a staging é **truncada no
--          INÍCIO da execução seguinte**, não descartada ao fim da atual. É isso que
--          torna `--somente-reconciliar` executável: a etapa 5 compara `public` com
--          `staging`, e staging descartada não tem contra o que comparar.
--
-- SEM RLS, DE PROPÓSITO: `staging` não é schema de aplicação. Ninguém autenticado o
--          alcança — só o ETL, com a chave administrativa. A ausência de policy aqui
--          não é lacuna: é a mesma decisão do BRIEF §2, "tabela sem policy é
--          inacessível", aplicada a um schema que a aplicação nem enxerga.
--
-- Origem: spec 003 FR-018 · data-model §2 · contrato pipeline P-2
-- =================================================================================

create schema if not exists staging;

comment on schema staging is
  'Retrato TEXTUAL da origem, efemero. Truncado no inicio de cada execucao do ETL. '
  'Nao e historico; e andaime que so cai quando o proximo andaime sobe. '
  'Sem RLS: nao e schema de aplicacao — so o ETL o alcanca.';

revoke all on schema staging from anon, authenticated;

-- ---------------------------------------------------------------------------------
-- T014 — as três tabelas do CRUZAMENTO da Unidade de Ensino (escopo ampliado, 07/09)
--
-- As colunas `arquivo`, `aba` e `linha` NÃO são luxo: são o que cumpre o FR-025.6 e o
-- invariante X-2 do contrato. **UE sem proveniência é UE inventada** — e este épico
-- inteiro existe para não inventar dado.
-- ---------------------------------------------------------------------------------

create table staging.ue_v1_lancamentos (
  curso_sigla      text,
  data             text,   -- literal da planilha; conversao so na normalizacao (FR-019)
  ta_ordinal       text,
  cod              text,   -- codigo da disciplina DENTRO da planilha da v1.0
  numero_ue        text,   -- pode vir com sufixo: `1P` e o 2o valor mais comum
  ta_quantidade    text,
  arquivo          text not null,
  aba              text not null,
  linha            integer not null
);

comment on table staging.ue_v1_lancamentos is
  'Aba PREENCHIMENTO dos 7 arquivos da v1.0 — cabecalho na linha 3, dado da 4. '
  'Grao de TEMPO DE AULA, mais fino que o registro da v2.0: 7.421 lancamentos '
  'para 1.566 registros. O cruzamento e de muitos para um.';

comment on column staging.ue_v1_lancamentos.numero_ue is
  'Numero da UE, TEXTO de proposito: a origem grava `1P` (434 ocorrencias nos 7 '
  'arquivos), e o destino e smallint. A normalizacao `1P` -> `1` acontece depois, '
  'com o sufixo preservado como proveniencia (FR-025.9).';

create table staging.ue_v1_disciplinas (
  curso_sigla      text,
  cod              text,
  disciplina       text,
  numero_ue        text,
  nome_ue          text,
  ch               text,
  local            text,
  tecnica          text,
  instrutor        text,
  arquivo          text not null,
  aba              text not null,
  linha            integer not null
);

comment on table staging.ue_v1_disciplinas is
  'Aba BD DISCIPLINAS dos 7 arquivos — cabecalho na linha 2, dado da 3. '
  'Mapeia disciplina -> numero da UE -> nome da UE -> CH -> local -> instrutor.';

create table staging.ue_cruzamento (
  registro_aula_codigo text not null,
  unidade_ensino_id    uuid,          -- nulo quando o veredito nao for `casado`
  veredito             text not null,
  fonte_arquivo        text,
  fonte_aba            text,
  fonte_linha          integer,
  constraint ue_cruzamento_veredito_fechado check (
    veredito in ('casado', 'ambiguo', 'sem_fonte', 'fora_de_cobertura', 'nao_aplicavel')
  ),
  constraint ue_cruzamento_proveniencia_do_casado check (
    veredito <> 'casado'
    or (unidade_ensino_id is not null and fonte_arquivo is not null
        and fonte_aba is not null and fonte_linha is not null)
  )
);

comment on table staging.ue_cruzamento is
  'Resultado da etapa 2-B. Cinco vereditos, dominio FECHADO por CHECK: '
  'casado · ambiguo · sem_fonte · fora_de_cobertura · nao_aplicavel.';

comment on constraint ue_cruzamento_proveniencia_do_casado on staging.ue_cruzamento is
  'Veredito `casado` EXIGE unidade_ensino_id e as tres colunas de proveniencia. '
  'E o invariante X-2 imposto pelo banco, e nao por convencao do script: '
  'UE sem proveniencia e UE inventada.';

comment on constraint ue_cruzamento_veredito_fechado on staging.ue_cruzamento is
  'Dominio fechado. `nao_aplicavel` (codigo que nao e disciplina: AD, FE, PL, TR, TE, LP) '
  'e DISTINTO de `sem_fonte`: o primeiro diz "nao havia o que procurar", o segundo diz '
  '"procurei e nao achei". Confundi-los produziria 270 falsos negativos por arquivo.';

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   drop schema if exists staging cascade;
--
-- Seguro em qualquer momento: `staging` é efêmera por definição e não guarda
-- histórico. Nenhuma tabela de `public` depende dela.
-- =================================================================================
