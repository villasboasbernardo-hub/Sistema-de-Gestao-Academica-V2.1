-- =================================================================================
-- Os cinco obrigatorios de instrutor, e o codigo gerado
--
-- O QUE  : (1) recusa texto so com espacos nas cinco colunas obrigatorias de `instrutores`;
--          (2) gera o `codigo` de instrutor novo como inteiro simples, sem prefixo.
--
-- ⚠️ MIGRATION NAO PREVISTA NO PLANO DA FATIA. O plano listava duas migrations; a decomposicao em
--    tarefas achou que nenhuma das duas pecas abaixo existia (achados D-3 e D-4 do tasks.md da spec
--    006). O plano foi corrigido em 15/09/2026.
--
-- =================================================================================
-- (1) `RN-INST-03`, `FR-005`, `FR-006`
--
-- `NOT NULL` ja existe nas cinco desde o Epico 1, e NAO BASTA: texto so com espaco passa por
-- `NOT NULL` e e ausencia disfarcada. A recusa e `CHECK`, e e do banco porque o `FR-006` exige que ela
-- valha por qualquer caminho — tela, interface de dados ou chamada direta.
--
-- MEDIDO ANTES DE ESCREVER, em 15/09/2026, na base carregada pelo ETL do Epico 2 (177 instrutores):
--   posto_graduacao so com espacos ... 0
--   esp_hab_obs so com espacos ....... 0
--   nome_completo so com espacos ..... 0
--   categoria so com espacos ......... 0
--   om so com espacos ................ 0
-- Nenhuma linha historica viola o CHECK, entao ele entra direto, sem catraca. Se a medicao tivesse
-- dado maior que zero, a saida seria decisao, nao padrao.
-- =================================================================================

alter table public.instrutores
  add constraint instrutores_posto_graduacao_preenchido check (btrim(posto_graduacao) <> ''),
  add constraint instrutores_esp_hab_obs_preenchido     check (btrim(esp_hab_obs) <> ''),
  add constraint instrutores_nome_completo_preenchido   check (btrim(nome_completo) <> ''),
  add constraint instrutores_categoria_preenchida       check (btrim(categoria) <> ''),
  add constraint instrutores_om_preenchida              check (btrim(om) <> '');

-- =================================================================================
-- (2) `RN-CRUD-03`, `FR-007`
--
-- O identificador de instrutor e INTEIRO SIMPLES, SEM PREFIXO — excecao documentada da RN-CRUD-03,
-- porque todo o restante do sistema ja o interpreta como numero. `codigo` e `text not null unique`
-- desde o Epico 1, sem `default`, sequencia nem gatilho: os 177 vieram do ETL com o numero verbatim.
--
-- MEDIDO em 15/09/2026, na mesma base: codigo nao inteiro ... 0 · maior codigo ... 177.
--
-- ⚠️ DIVERGENCIA DE MECANISMO COM O DOCUMENTO 04, anotada e nao corrigida. O documento 04 indica um
--    GATILHO `gerar_codigo()` por tabela. Lido em 15/09/2026: para instrutores ele so fixa o
--    formato — inteiro simples, sequencial —, sem regra de reuso, lacuna ou bloqueio. E um contador
--    simples, e a decisao de Bernardo (15/09/2026) foi SEQUENCIA. O gatilho nao existe no schema.
--
-- ⚠️ A SEQUENCIA SOZINHA COLIDIRIA NO CORTE, e por isso o `default` e uma funcao. No corte as
--    migrations rodam ANTES da carga, e o ETL grava os codigos 1 a 177 explicitamente; uma sequencia
--    que comecasse em 1 devolveria "1" no primeiro cadastro pela tela, e a `unique` recusaria. A
--    funcao tira o proximo valor da sequencia e, se ele ficou para tras do maior codigo gravado,
--    avanca a sequencia para depois dele. A sequencia continua sendo a fonte do numero.
--
-- ⚠️ SEQUENCIA NAO DEVOLVE NUMERO CONSUMIDO. Transacao desfeita deixa lacuna na numeracao. O
--    documento 04 fala em "sequencial" e nao proibe lacuna; fica registrado.
--
-- ⚠️ CONCORRENCIA. Dois cadastros simultaneos, logo depois de uma carga com codigo explicito, podem
--    calcular o mesmo proximo numero; a `unique` recusa o segundo, e a tela repete. Com dezenas de
--    usuarios no maximo, e aceito e dito.
-- =================================================================================

create sequence if not exists app.instrutores_codigo_seq as bigint start with 1;

comment on sequence app.instrutores_codigo_seq is
  'Fonte do codigo de instrutor novo (RN-CRUD-03, excecao do inteiro simples). Lida por '
  'app.proximo_codigo_instrutor(), que a avanca quando ela ficou para tras do maior codigo gravado.';

-- Posiciona a sequencia depois do que ja existe no banco em que a migration roda.
select setval(
  'app.instrutores_codigo_seq',
  greatest(
    coalesce((select max(codigo::bigint) from public.instrutores where codigo ~ '^[0-9]+$'), 0),
    1
  ),
  exists (select 1 from public.instrutores where codigo ~ '^[0-9]+$')
);

create or replace function app.proximo_codigo_instrutor()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_proximo bigint;
  v_maior   bigint;
begin
  v_proximo := nextval('app.instrutores_codigo_seq');
  select coalesce(max(codigo::bigint), 0)
    into v_maior
    from public.instrutores
   where codigo ~ '^[0-9]+$';
  if v_proximo <= v_maior then
    v_proximo := v_maior + 1;
    perform setval('app.instrutores_codigo_seq', v_proximo);
  end if;
  return v_proximo::text;
end;
$$;

comment on function app.proximo_codigo_instrutor() is
  'Proximo codigo de instrutor: inteiro simples, sem prefixo (RN-CRUD-03, FR-007). Tira da '
  'sequencia app.instrutores_codigo_seq e a avanca se ela ficou para tras do maior codigo gravado '
  '— o ETL grava codigo explicito depois das migrations.';

revoke all on function app.proximo_codigo_instrutor() from public;
revoke all on function app.proximo_codigo_instrutor() from anon;
grant execute on function app.proximo_codigo_instrutor() to authenticated, service_role;

alter table public.instrutores
  alter column codigo set default app.proximo_codigo_instrutor();

-- =================================================================================
-- PLANO DE REVERSAO
--
--   alter table public.instrutores alter column codigo drop default;
--   drop function if exists app.proximo_codigo_instrutor();
--   drop sequence if exists app.instrutores_codigo_seq;
--   alter table public.instrutores
--     drop constraint if exists instrutores_posto_graduacao_preenchido,
--     drop constraint if exists instrutores_esp_hab_obs_preenchido,
--     drop constraint if exists instrutores_nome_completo_preenchido,
--     drop constraint if exists instrutores_categoria_preenchida,
--     drop constraint if exists instrutores_om_preenchida;
--
-- ⚠️ Reverter devolve a possibilidade de salvar instrutor com obrigatorio so com espacos, e faz todo
--    cadastro pela tela exigir codigo digitado — contra o FR-007.
-- =================================================================================
