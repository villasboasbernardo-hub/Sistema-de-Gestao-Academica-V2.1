-- =====================================================================================
-- 010_estrutura.sql — inventario e guardas negativas do schema
-- Epico 1 · specs/002-schema-rls-permissoes · T010, T041
-- -------------------------------------------------------------------------------------
-- SUBSTITUI `invariantes.test.sql`, do Epico 0, que afirmava "public tem zero tabelas".
-- Aquela invariante estava CERTA para o Epico 0 e deixa de valer na primeira migration:
-- foi removida, nao contornada.
--
-- Este arquivo cresce por camada. Com as seis migrations aplicadas, ele afirma o
-- inventario completo e as cinco guardas negativas do epico.
-- =====================================================================================
begin;
select plan(20);

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

-- FR-001: o inventario do BRIEF §2.1. Nem mais, nem menos.
select is(
  (select count(*)::int from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'),
  27,
  'FR-001: as 27 entidades do BRIEF §2.1 existem — nem mais, nem menos'
);

-- Tabela sem policy nenhuma e INACESSIVEL. Isso e intencional por padrao, mas nenhuma
-- tabela deste schema deve ficar assim: seria funcionalidade morta, nao seguranca.
select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policies p
                       where p.schemaname = 'public' and p.tablename = c.relname)),
  0,
  'FR-032: toda tabela tem ao menos uma policy — nenhuma ficou inacessivel por esquecimento'
);

-- FR-036 · teste T-03. A clausula que mais gente esquece, e a que impede a fuga de escopo:
-- sem ela um Operador reatribui um registro a uma turma fora do alcance dele e LEVA O DADO
-- JUNTO, sem violar nada — a linha original era legitima.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and cmd = 'UPDATE' and with_check is null),
  0,
  'FR-036: toda policy de UPDATE tem WITH CHECK alem de USING — sem ela ha fuga de escopo'
);

-- FR-007: toda chave estrangeira declara o que acontece na remocao. `restrict` e a regra
-- geral; as excecoes (fiscal de avaliacao, vinculo com avaliacoes_planejadas) usam
-- `set null`. O que nao pode existir e FK sem acao declarada — ou pior, com `cascade`,
-- que seria a porta pela qual historico se perderia por acidente.
select is(
  (select count(*)::int from pg_constraint
    where contype = 'f' and connamespace = 'public'::regnamespace and confdeltype = 'c'),
  0,
  'FR-007: nenhuma FK usa CASCADE — historico nao se perde por efeito colateral'
);

-- FR-034: a autorizacao e dado. A matriz precisa estar semeada, ou toda policy nega tudo.
select cmp_ok(
  (select count(*)::int from public.perfil_permissao), '>=', 152,
  'FR-034: a matriz de permissoes esta semeada (152 linhas de referencia)'
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

-- ============================ RN-INST-05 — situacao SEMPRE explicita, nunca deduzida
-- A auditoria de 31/07/2026 achou os 177 instrutores com `Status` em branco: a regra de
-- exclusao logica nunca tinha sido exercitada sobre dado real. Aqui a coluna nao aceita
-- vazio em tabela nenhuma, e por isso RN-INST-02 e testavel desde o primeiro dia.
select is_empty(
  $$select c.table_name from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'status'
       and c.is_nullable = 'YES' and t.table_type = 'BASE TABLE'$$,
  'RN-INST-05 · nenhuma coluna `status` aceita vazio — a situacao nunca e deduzida de NULL'
);

-- ============================ RN-AVAL-02 — agendamento e execucao sao UM UNICO fato
-- A base viva tinha 111 avaliacoes agendadas e 186 registros de execucao em cadastros nao
-- vinculados, sem correspondencia garantida — subdimensionando a carga horaria de forma
-- sistematica. A ESTRUTURA que permitia o descasamento deixa de existir: nao ha tabela
-- paralela de execucao onde 186 registros pudessem flutuar soltos.
select is_empty(
  $$select table_name from information_schema.tables
     where table_schema = 'public'
       and table_name similar to '%(execucao_aval|avaliacao_execu|aval_realizada)%'$$,
  'RN-AVAL-02 · nao existe tabela paralela de execucao de avaliacao — o descasamento nao e construivel'
);
select ok(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'avaliacoes'
      and column_name in ('data_avaliacao', 'data_vista_prova', 'tempos_consumidos')) = 3,
  'RN-AVAL-02 · agendamento, aplicacao e vista convivem na MESMA linha de `avaliacoes`'
);

select * from finish();
rollback;
