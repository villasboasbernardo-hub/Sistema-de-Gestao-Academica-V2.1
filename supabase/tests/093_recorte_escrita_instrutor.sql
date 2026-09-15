-- =================================================================================
-- 093 — O recorte de ESCRITA do dado pessoal de instrutor: a parte ESTRUTURAL
--
-- O QUÊ  : prova que a escrita de `authenticated` em `instrutores` alcança exatamente as colunas
--          que ele lê, e que a função com porteiro existe na forma certa.
--
-- ⚠️ O COMPORTAMENTO NÃO É PROVADO AQUI. O pgTAP roda como dono do schema, e o dono grava toda
--    coluna. As negativas por perfil — N-1, N-2, N-3, N-5 a N-8 — vivem em
--    `tests/invariantes/rls/rls.test.ts`, com JWT de verdade. Aqui fica o que o dono consegue
--    observar sem se enganar: privilégio de tabela, privilégio de coluna e a forma da função.
--
-- Contrato: specs/006-cadastro-de-instrutores/contracts/recorte-de-escrita.md · FR-032, SC-010
-- =================================================================================

begin;
select plan(6);

-- ---------------------------------------------------------------------------------
-- 1. Nenhum privilégio de TABELA de escrita.
--    Sem isto o grant por coluna é decorativo: privilégio de tabela cobre toda coluna, e foi
--    exatamente assim que a primeira tentativa do recorte de leitura não protegeu nada.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select 1 from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'instrutores'
       and grantee = 'authenticated' and privilege_type in ('UPDATE', 'INSERT')$$,
  'FR-032 · authenticated NAO tem UPDATE nem INSERT de tabela em instrutores'
);

-- ---------------------------------------------------------------------------------
-- 2. N-4 · nada é gravável sem ser legível.
--
-- ⚠️ A COMPARAÇÃO É CONTRA A UNIÃO DE UPDATE E INSERT, E NÃO SÓ CONTRA UPDATE. Comparar só o
--    UPDATE sairia verde com o INSERT ainda aberto em 45 colunas — é a emenda do SC-010.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select column_name from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'instrutores'
       and grantee = 'authenticated' and privilege_type in ('UPDATE', 'INSERT')
    except
    select column_name from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'instrutores'
       and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  'FR-032 · colunas com SELECT = colunas com UPDATE uniao INSERT para authenticated (N-4)'
);

-- ---------------------------------------------------------------------------------
-- 3. O recorte não recortou demais: toda coluna legível continua gravável por UPDATE e por
--    INSERT. Negar demais quebra a tela de quem tem direito, sem erro nenhum.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select s.column_name, p.privilege_type
      from information_schema.column_privileges s
     cross join (values ('UPDATE'), ('INSERT')) p(privilege_type)
     where s.table_schema = 'public' and s.table_name = 'instrutores'
       and s.grantee = 'authenticated' and s.privilege_type = 'SELECT'
       and not exists (
         select 1 from information_schema.column_privileges w
          where w.table_schema = 'public' and w.table_name = 'instrutores'
            and w.grantee = 'authenticated'
            and w.privilege_type = p.privilege_type
            and w.column_name = s.column_name)$$,
  'FR-032 · toda coluna legivel segue gravavel por UPDATE e por INSERT (N-5, estrutural)'
);

-- ---------------------------------------------------------------------------------
-- 4. A função existe e é SECURITY DEFINER — ela precisa dos direitos do dono para alcançar as
--    colunas que o passo 1 revogou. O porteiro é o que a torna segura.
-- ---------------------------------------------------------------------------------
select is(
  (select p.prosecdef
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'gravar_dados_pessoais_instrutor'),
  true,
  'FR-032 · app.gravar_dados_pessoais_instrutor existe e e SECURITY DEFINER'
);

-- ---------------------------------------------------------------------------------
-- 5. O porteiro nomeia os TRÊS perfis que leem a PII, e só eles.
--
-- ⚠️ O `coalesce(..., '')` NÃO É DETALHE: sem ele, com a função ausente, `position` devolve NULL,
--    o `where` descarta a linha e a asserção passa com a proteção ausente — o defeito que o
--    PII-6 do 092 já documentou.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select v.perfil from (values ('admin'),
                                 ('encarregado_administracao_academica'),
                                 ('ajudante_administracao_academica')) v(perfil)
     where position(v.perfil in coalesce((
       select pg_get_functiondef(p.oid)
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'app' and p.proname = 'gravar_dados_pessoais_instrutor'), '')) = 0$$,
  'FR-032 · o porteiro da funcao nomeia os TRES perfis que leem a PII'
);

-- ---------------------------------------------------------------------------------
-- 6. `anon` não executa o invólucro exposto.
--    `revoke ... from public` não tira de `anon` no Supabase — medido no PR #12.
-- ---------------------------------------------------------------------------------
select is(
  coalesce((
    select has_function_privilege('anon', p.oid, 'execute')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'gravar_dados_pessoais_instrutor'), true),
  false,
  'FR-032 · anon NAO executa public.gravar_dados_pessoais_instrutor'
);

select * from finish();
rollback;
