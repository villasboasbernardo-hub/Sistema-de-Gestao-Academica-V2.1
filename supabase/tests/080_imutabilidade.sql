-- =====================================================================================
-- 080_imutabilidade.sql — o historico nao se reescreve
-- Epico 1 · T081 a T084 · FR-006 · FR-033 · FR-051 · FR-052 · FR-053 · FR-054
-- -------------------------------------------------------------------------------------
-- Principio IV. `migracao_log` e a evidencia auditavel de que 100% do historico foi
-- transportado; uma linha reescrita destroi a evidencia SEM DEIXAR RASTRO. Por isso a
-- protecao e redundante de proposito, em tres camadas:
--   1. privilegio de escrita revogado para `authenticated`;
--   2. gatilho que impede alteracao INCLUSIVE para a credencial de maior privilegio;
--   3. policy apenas de leitura.
--
-- ACHADO DESTE ARQUIVO (A-17, 30/08/2026): o Supabase concede ALL a `authenticated` por
-- padrao, e o referencia nunca revogava DELETE nem TRUNCATE. Para DELETE a RLS barrava, e a
-- "protecao dupla" do FR-033 era so uma. Para TRUNCATE era um buraco de verdade —
-- **TRUNCATE nao passa pela RLS** —, e um usuario autenticado poderia apagar a evidencia
-- inteira sem que policy nenhuma fosse consultada. M6 corrigida.
-- =====================================================================================
begin;
select plan(9);

insert into public.migracao_log (codigo, origem_tabela, acao)
  values ('LOG-IMUT-1', 'cursos', 'transportado');

-- ================================================= FR-051 — nao se altera, nao se apaga
select throws_ok(
  $$update public.migracao_log set origem_tabela = 'adulterado' where codigo = 'LOG-IMUT-1'$$,
  'P0001',
  null,
  'FR-051 · UPDATE em migracao_log e recusado pelo gatilho'
);

-- A assercao mais importante do arquivo: o gatilho vale para QUEM QUER QUE SEJA. A
-- credencial que ignora toda a RLS nao ignora este gatilho.
set local role service_role;
select throws_ok(
  $$update public.migracao_log set origem_tabela = 'adulterado' where codigo = 'LOG-IMUT-1'$$,
  'P0001',
  null,
  'FR-051 · o gatilho recusa TAMBEM para service_role — a chave que ignora a RLS nao ignora isto'
);
reset role;

-- ============================================== FR-033 / A-17 — as duas camadas do DELETE
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'DELETE'),
  0,
  'FR-033 · `authenticated` NAO tem privilegio de DELETE em tabela nenhuma — a segunda camada existe'
);

-- TRUNCATE NAO E FILTRADO POR RLS. Enquanto o privilegio existisse, nenhuma policy seria
-- consultada e a evidencia da migracao poderia ser apagada inteira.
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'TRUNCATE'),
  0,
  'A-17 · `authenticated` NAO tem TRUNCATE — que nao passaria pela RLS e apagaria a evidencia'
);

-- ================================================== FR-053 — a quarentena tambem
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'arquivo_avaliacoes_v1'
      and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE')),
  0,
  'FR-053 · a quarentena das avaliacoes da v1.0 e somente leitura para authenticated'
);

-- ================================================== FR-052 — corrigir e evento novo
-- Nao ha caminho para reescrever: o unico jeito de registrar uma correcao e inserir outra
-- linha. Foi assim com a renomeacao Materia -> Disciplina (P-14).
select lives_ok(
  $$insert into public.migracao_log (codigo, origem_tabela, acao)
    values ('LOG-IMUT-2', 'cursos', 'corrigido')$$,
  'FR-052 · corrigir o passado e registrar um evento NOVO — e o unico caminho que existe'
);
select is(
  (select count(*)::int from public.migracao_log where codigo like 'LOG-IMUT-%'),
  2,
  'FR-052 · a linha original permanece intacta ao lado da correcao'
);

-- ========================================= FR-006 / FR-054 — autoria automatica
-- Sem sessao autenticada — o caminho do ETL, que e o menos testado. Uma implementacao que
-- pressuponha JWT descarta os carimbos JUSTAMENTE aqui: `jsonb_set` e STRICT, e um NULL
-- anularia o acumulador inteiro. E o que o involucro `app.jsonb_valor()` impede.
insert into public.cursos (id, codigo, nome_curso, classificacao)
  values ('11111111-0000-0000-0000-0000000000b1', 'IMUT-A', 'Curso Imutabilidade', 'regular');
select is(
  (select nome_curso from public.cursos where codigo = 'IMUT-A'),
  'Curso Imutabilidade',
  'FR-054 · escrita SEM sessao autenticada (o caminho do ETL) entra integra — nenhum campo e descartado'
);
select isnt(
  (select criado_em from public.cursos where codigo = 'IMUT-A'),
  null,
  'FR-006 · o carimbo de criacao e preenchido pelo gatilho, mesmo sem sessao'
);

select * from finish();
rollback;
