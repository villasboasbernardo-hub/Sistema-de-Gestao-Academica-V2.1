-- =================================================================================
-- Impressão digital do esquema — SÓ LEITURA. Compara o banco local com o remoto.
--
-- USO (spec 009, plano de aplicação no remoto, e a T106):
--   local : docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -t -A -F'|' < este_arquivo
--   remoto: supabase db query --linked -f scripts/provas/impressao_digital_do_esquema.sql
-- e comparar as duas saídas linha a linha. A última linha é o resumo: quantos objetos, e um md5
-- de todos eles juntos — se o md5 bate, o resto bate.
--
-- ⚠️ POR QUE NÃO `pg_dump` DOS DOIS LADOS: o dono dos objetos e os papéis internos diferem entre o
--    Docker e a plataforma (`postgres` × `supabase_admin`), e o diff viraria ruído. Aqui entra só o
--    que define COMPORTAMENTO — colunas, restrições, índices, policies, funções, gatilhos, views e
--    os privilégios dos três papéis que a aplicação usa —, cada um reduzido a um md5 da definição.
--
-- ⚠️ SÓ `public` E `app`. `auth`, `storage` e o resto são da plataforma, e diferem por versão.
--
-- ⚠️ **O RETORNO DE CARRO (CR, \r) SAI ANTES DO md5, E ISSO NÃO É TOLERÂNCIA — É CORREÇÃO
--    DE UM VEREDITO FALSO** *(medido em 26/09/2026, na aplicação da M7 da fatia (b))*. O corpo de
--    função guardado no catálogo carrega o fim de linha com que o arquivo chegou àquele banco, e
--    ele **difere entre os dois, nas duas direções**: medido no mesmo dia,
--    `app.proximo_codigo_disciplina` tinha **2 CR no local e 0 no remoto** (81 × 79 caracteres), e
--    `public.vigencias_do_curso` tinha **0 no local e 29 no remoto** (961 × 990). Descontado o CR,
--    os dois lados são **idênticos caractere por caractere**. Sem este `replace`, sete funções
--    apareciam divergentes e o resumo dava md5 diferente — **um "os bancos divergiram" que era fim
--    de linha**, e o pior tipo de alarme falso: o que aparece exatamente quando alguém acabou de
--    aplicar migration e vai acreditar nele.
--    ⚠️ O checkout é Windows e os arquivos vivem em CRLF na cópia de trabalho; o caminho até o
--    banco local (`db reset`, psql no contêiner) e até o remoto (`db push`, a CLI) não preservam o
--    CR do mesmo jeito. CR não é comportamento, então não é estrutura.
--    ⚠️ **E o valor do resumo MUDOU com esta correção** — comparar com um md5 anotado antes de
--    26/09/2026 não vale; o que vale é medir os dois lados com a MESMA versão deste arquivo.
-- =================================================================================
with objetos(tipo, nome, definicao) as (
  -- colunas: tipo, nulidade e padrão
  select 'coluna', c.table_schema || '.' || c.table_name || '.' || c.column_name,
         c.data_type || '|' || coalesce(c.udt_name, '') || '|' || c.is_nullable || '|' || coalesce(c.column_default, '')
    from information_schema.columns c
   where c.table_schema in ('public', 'app')
  union all
  -- restrições: PK, FK, UNIQUE, CHECK, EXCLUDE
  select 'restricao', n.nspname || '.' || r.relname || '.' || k.conname, pg_get_constraintdef(k.oid)
    from pg_constraint k
    join pg_class r on r.oid = k.conrelid
    join pg_namespace n on n.oid = r.relnamespace
   where n.nspname in ('public', 'app')
  union all
  select 'indice', schemaname || '.' || indexname, indexdef
    from pg_indexes
   where schemaname in ('public', 'app')
  union all
  select 'policy', schemaname || '.' || tablename || '.' || policyname,
         cmd || '|' || permissive || '|' || array_to_string(roles, ',') || '|' ||
         coalesce(qual, '') || '|' || coalesce(with_check, '')
    from pg_policies
   where schemaname in ('public', 'app')
  union all
  select 'rls', n.nspname || '.' || r.relname, r.relrowsecurity::text || '|' || r.relforcerowsecurity::text
    from pg_class r
    join pg_namespace n on n.oid = r.relnamespace
   where n.nspname in ('public', 'app') and r.relkind = 'r'
  union all
  select 'funcao', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'app') and p.prokind in ('f', 'p')
  union all
  select 'gatilho', n.nspname || '.' || r.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
    from pg_trigger t
    join pg_class r on r.oid = t.tgrelid
    join pg_namespace n on n.oid = r.relnamespace
   where n.nspname in ('public', 'app') and not t.tgisinternal
  union all
  select 'view', schemaname || '.' || viewname, definition
    from pg_views
   where schemaname in ('public', 'app')
  union all
  -- privilégios de tabela e view para os três papéis da aplicação
  select 'privilegio', g.table_schema || '.' || g.table_name || '.' || g.grantee,
         string_agg(g.privilege_type, ',' order by g.privilege_type)
    from information_schema.role_table_grants g
   where g.table_schema in ('public', 'app') and g.grantee in ('anon', 'authenticated', 'service_role')
   group by g.table_schema, g.table_name, g.grantee
  union all
  -- quem executa cada função
  select 'execucao', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         (select string_agg(papel, ',' order by papel)
            from unnest(array['anon', 'authenticated', 'service_role']) papel
           where has_function_privilege(papel, p.oid, 'execute'))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'app') and p.prokind in ('f', 'p')
),
linhas as (
  -- ⚠️ `chr(13)` fora antes do md5 — ver a nota do cabeçalho. Fim de linha não é estrutura.
  select tipo || '|' || nome || '|' || md5(replace(coalesce(definicao, ''), chr(13), '')) as linha
    from objetos
)
select linha from linhas
union all
select '~RESUMO|' || count(*) || ' objetos|' || md5(string_agg(linha, E'\n' order by linha)) from linhas
order by 1;
