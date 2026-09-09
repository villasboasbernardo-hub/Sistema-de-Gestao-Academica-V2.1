-- =================================================================================
-- 092 — O recorte do dado pessoal de instrutor: a parte ESTRUTURAL
--
-- O QUÊ  : prova que as três peças do recorte existem e estão na forma certa.
--
-- ⚠️ POR QUE SÓ A PARTE ESTRUTURAL ESTÁ AQUI, e onde está o resto.
--    O pgTAP roda como **dono do schema**, e o dono tem todo privilégio de coluna. Um teste que
--    tentasse `select cpf` daqui **passaria com o recorte desligado** — pelo mesmo motivo que o
--    cabeçalho de `tests/invariantes/rls/rls.test.ts` dá para a RLS não ser testada em pgTAP.
--    As asserções de COMPORTAMENTO (P-2, P-3, P-7, P-8 do contrato recorte-pii) vivem naquela
--    suíte, com **JWT de verdade**. Aqui ficam as que o dono consegue observar sem se enganar:
--    o privilégio foi revogado, as views existem, e o porteiro está no lugar.
--
-- Contrato: specs/004-auth-convite-e-rbac/contracts/recorte-pii.md
-- =================================================================================

begin;
select plan(6);

-- ---------------------------------------------------------------------------------
-- 1. O `revoke` de TABELA aconteceu.
--    É a peça que a primeira tentativa do experimento esqueceu — e sem ela o `grant` por
--    coluna não tem efeito nenhum, porque privilégio de tabela cobre toda coluna.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select 1 from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'instrutores'
       and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  'PII-1 · `authenticated` NAO tem SELECT de tabela em instrutores — sem isto o recorte e decorativo'
);

-- ---------------------------------------------------------------------------------
-- 2. NENHUMA das 12 colunas de PII tem privilégio de coluna para `authenticated`.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select column_name from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'instrutores'
       and grantee = 'authenticated' and privilege_type = 'SELECT'
       and column_name in ('cpf','rg','orgao_emissor','telefone','retelma',
                           'endereco_logradouro','endereco_numero','endereco_complemento',
                           'endereco_bairro','endereco_cidade','endereco_estado','endereco_cep')$$,
  'PII-2 (NEGATIVO) · nenhuma das 12 colunas de identificacao civil e residencia e concedida'
);

-- ---------------------------------------------------------------------------------
-- 3. O dado FUNCIONAL continua concedido — o recorte não pode recortar demais.
--    Sem estas colunas a grade, a LIQ e o DSA não se montam (FR-029).
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select v.coluna from (values ('posto_graduacao'),('esp_hab_obs'),('nome_guerra'),
                                 ('nome_completo'),('regime_trabalho'),('area_conhecimento'),
                                 ('status'),('codigo')) v(coluna)
     where not exists (
       select 1 from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'instrutores'
          and grantee = 'authenticated' and privilege_type = 'SELECT'
          and column_name = v.coluna)$$,
  'PII-3 · o dado funcional segue alcancavel — inclusive area_conhecimento, que NAO e dado pessoal'
);

-- ---------------------------------------------------------------------------------
-- 4. A visão de leitura existe e é `security_invoker`.
--    Sem essa opção ela rodaria com os direitos do dono e CONTORNARIA a policy da tabela —
--    trocaria um problema de coluna por um problema de linha.
-- ---------------------------------------------------------------------------------
select is(
  (select 'security_invoker=true' = any (c.reloptions)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'vw_instrutores'),
  true,
  'PII-4 · vw_instrutores existe e e security_invoker — a RLS da tabela base continua valendo'
);

-- ---------------------------------------------------------------------------------
-- 5. A visão com porteiro existe, e NÃO é `security_invoker`.
--    Ela precisa dos direitos do dono justamente para alcançar as colunas revogadas.
-- ---------------------------------------------------------------------------------
select is(
  (select coalesce('security_invoker=true' = any (coalesce(c.reloptions, '{}')), false)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'vw_instrutor_dados_pessoais'),
  false,
  'PII-5 · vw_instrutor_dados_pessoais NAO e security_invoker — precisa dos direitos do dono'
);

-- ---------------------------------------------------------------------------------
-- 6. O porteiro está na definição da visão, e nomeia os TRÊS perfis.
--    Asserção sobre o texto de propósito: é o que impede alguém de "simplificar" o `where`
--    e alargar o recorte sem que nenhum outro teste perceba.
-- ---------------------------------------------------------------------------------
--
-- ⚠️ O `coalesce(..., '')` NAO e detalhe: sem ele, quando a visao NAO EXISTE a subconsulta
--    devolve NULL, `position(x in NULL)` devolve NULL, o `where` descarta a linha e a asserção
--    PASSA COM A PROTECAO AUSENTE. Foi o que aconteceu na primeira execucao (T052) — o teste
--    verde pelo motivo errado, que e o defeito que esta suite inteira existe para nao ter.
select is_empty(
  $$select v.perfil from (values ('admin'),
                                 ('encarregado_administracao_academica'),
                                 ('ajudante_administracao_academica')) v(perfil)
     where position(v.perfil in coalesce((
       select view_definition from information_schema.views
        where table_schema = 'public' and table_name = 'vw_instrutor_dados_pessoais'), '')) = 0$$,
  'PII-6 · o porteiro da visao nomeia os TRES perfis autorizados, e so eles'
);

select * from finish();
rollback;
