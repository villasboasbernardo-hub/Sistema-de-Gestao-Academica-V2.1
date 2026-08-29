-- =====================================================================================
-- 010_estrutura.sql — inventario e guardas negativas do schema
-- Epico 1 · specs/002-schema-rls-permissoes · T010, T041
-- -------------------------------------------------------------------------------------
-- SUBSTITUI `invariantes.test.sql`, do Epico 0, que afirmava "public tem zero tabelas".
-- Aquela invariante estava CERTA para o Epico 0 e deixa de valer na primeira migration:
-- foi removida, nao contornada.
--
-- Este arquivo cresce por camada. Enquanto so M1 estiver aplicada, as assercoes de
-- tabela ficam nos numeros que a camada corrente produz; T041 as leva a 27.
-- =====================================================================================
begin;
select plan(12);

-- ---------------------------------------------------------------------------- M1: base
select has_schema('app', 'schema `app` existe — casa das funcoes auxiliares (BRIEF §3)');

select is(
  (select count(*)::int from pg_type t
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'),
  28,
  'M1 cria os 28 dominios normativos fechados'
);

-- FR-047 / TURMA-1: "arquivada" NAO e valor de dominio. Decidido em 28/08/2026 como
-- filtro de apresentacao. Esta assercao existe para que ninguem o acrescente por engano.
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'status_turma'),
  array['planejada','ativa','concluida','cancelada'],
  'FR-047: status_turma tem exatamente os quatro valores reais — sem "arquivada"'
);

-- FR-054: as cinco funcoes de fundacao existem.
select has_function('app', 'uid_atual',        'app.uid_atual() existe');
select has_function('app', 'jsonb_valor',      'app.jsonb_valor() existe — o involucro que impede o descarte de carimbos');
select has_function('app', 'set_auditoria',    'app.set_auditoria() existe (FR-006)');
select has_function('app', 'bloquear_reescrita','app.bloquear_reescrita() existe (FR-051)');
select has_function('app', 'normalizar_texto', 'app.normalizar_texto() existe (RN-AVAL-01)');

-- FR-044: o GRANT que passa despercebido em migration, semente e ETL, e quebra todo
-- cadastro de usuario real em producao. Encontrado pelo teste T-04 da suite de seguranca.
select ok(
  not exists (select 1 from pg_roles where rolname = 'authenticated')
  or has_schema_privilege('authenticated', 'extensions', 'usage'),
  'FR-044: `authenticated` tem USAGE em `extensions` — sem isso todo INSERT de usuario real falha'
);

-- ------------------------------------------------------------------- guardas negativas
-- FR-033: a ausencia de politica de exclusao E a implementacao da exclusao logica
-- universal. E regra de negocio, nao lacuna. Um PR que acrescente uma e rejeitado.
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and cmd = 'DELETE'),
  0,
  'FR-033: ZERO politicas de DELETE em todo o schema — a ausencia e a regra'
);

-- Forcar RLS para o dono reintroduziria a recursao que `security definer` existe para
-- quebrar (doc 22 §5.3). Nenhuma tabela deste sistema recebe FORCE.
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relforcerowsecurity),
  0,
  'ZERO tabelas com FORCE ROW LEVEL SECURITY'
);

-- FR-026: a subunidade de ensino existe no curriculo e NAO vira tabela nesta fatia —
-- nao ha requisito que a peca (Principio X). Guarda para que ninguem a acrescente.
select is(
  (select count(*)::int from information_schema.tables
    where table_schema = 'public'
      and (table_name like '%subunidade%' or table_name like '%sue%')),
  0,
  'FR-026: nao existe tabela de subunidade de ensino — funcionalidade sem requisito nao entra'
);

select * from finish();
rollback;
