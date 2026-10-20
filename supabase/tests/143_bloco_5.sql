-- =====================================================================================
-- 143_bloco_5.sql — spec 020 (Bloco 5): estrutura e regra de banco das tres migrations
-- -------------------------------------------------------------------------------------
-- ⚠️ PERMISSAO NAO SE PROVA AQUI (DoD 4): o pgTAP roda como dono e a RLS nao se aplica. Quem pode
--    carregar curriculo, ler acesso e gravar a capacitacao se prova em
--    `tests/invariantes/rls/bloco-5.test.ts`, com sessao real. Aqui: colunas, balde, policies como
--    objeto, o tipo, a CONVERSAO (os mesmos casos do teste de unidade) e a imutabilidade.
-- =====================================================================================
begin;
select plan(30);

-- ================================================================ M1 — cursos e o balde
select col_is_null('public', 'cursos', 'ofertavel_estrangeiros', 'C-1 · estrangeiros nasce nulavel (nulo = nao informado)');
select col_is_null('public', 'cursos', 'estrangeiros_observacao', 'C-1 · a observacao e opcional');
select col_is_null('public', 'cursos', 'custo_total', 'C-3 · o custo e opcional');
select col_is_null('public', 'cursos', 'custo_composicao', 'C-3 · a composicao e opcional');
select col_is_null('public', 'cursos', 'curriculo_pdf_em', 'C-8 · nulo = nenhum curriculo carregado');

select is(
  (select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = 'public.cursos'::regclass and conname = 'cursos_custo_nao_negativo'),
  'CHECK (((custo_total IS NULL) OR (custo_total >= (0)::numeric)))',
  'C-3 · custo negativo e recusado pelo banco'
);

select results_eq(
  $$select public, file_size_limit, allowed_mime_types::text[] from storage.buckets where id = 'curriculos'$$,
  $$values (false, 20971520::bigint, array['application/pdf']::text[])$$,
  'C-6/C-7 · o balde `curriculos` e privado, 20 MB e so PDF — o limite mora no motor'
);

select set_eq(
  $$select policyname::text || ':' || cmd::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and coalesce(qual, '') || coalesce(with_check, '') like '%curriculos%'$$,
  $$values ('curriculos_ler:SELECT'), ('curriculos_carregar:INSERT'), ('curriculos_substituir:UPDATE')$$,
  'C-7 · o balde tem ler, carregar e substituir — e nenhuma policy de DELETE (regra 4, STORAGE-1)'
);

select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · zero policies de DELETE no catalogo inteiro, depois da spec 020'
);

select ok(
  (select with_check from pg_policies where schemaname = 'storage' and policyname = 'curriculos_carregar')
    like '%cursos%editar%',
  'C-7 · carregar exige `cursos.editar`'
);

-- ================================================================ M2 — capacitacao didatica
select is(
  (select array_agg(e.enumlabel::text order by e.enumsortorder)
     from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tipo_capacitacao_didatica'),
  array['C-Esp-DID', 'C-Exp-TE', 'Licenciatura'],
  'C-9 · a lista fechada, na ordem do pedido'
);

select col_not_null('public', 'instrutores', 'capacitacoes_didaticas', 'C-9 · a lista nunca e nula');
select col_default_is('public', 'instrutores', 'capacitacoes_didaticas', '{}', 'C-9 · vazia por padrao');
select col_is_null('public', 'instrutores', 'capacitacao_didatica_a_corrigir', 'C-10 · o texto a corrigir e opcional');

select ok(
  has_column_privilege('authenticated', 'public.instrutores', 'capacitacoes_didaticas', 'UPDATE')
  and has_column_privilege('authenticated', 'public.instrutores', 'capacitacoes_didaticas', 'SELECT')
  and has_column_privilege('authenticated', 'public.instrutores', 'capacitacao_didatica_a_corrigir', 'UPDATE'),
  'R-5 · as colunas novas tem o mesmo privilegio por coluna da capacitacao antiga (gotcha 3)'
);

select has_column('public', 'vw_instrutores', 'capacitacoes_didaticas', 'a view mostra a lista');
select has_column('public', 'vw_instrutores', 'capacitacao_didatica_a_corrigir', 'a view mostra o texto a corrigir');

-- A conversao: os casos do teste de unidade (`tests/unidade/capacitacao-didatica.test.ts`).
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, capacitacao_didatica) values
  ('a1430000-0000-0000-0000-000000000001', 'T143-A', 'CT', '-EF', 'Instrutor T143 A', 'Militar', 'CIAARA', 'C-Exp-TE, C-Esp-DID'),
  ('a1430000-0000-0000-0000-000000000002', 'T143-B', 'CT', '-EF', 'Instrutor T143 B', 'Militar', 'CIAARA', 'licenciatura; c esp did / C-EXP-TE'),
  ('a1430000-0000-0000-0000-000000000003', 'T143-C', 'CT', '-EF', 'Instrutor T143 C', 'Militar', 'CIAARA', 'Pedagogia, C-Exp-TE'),
  ('a1430000-0000-0000-0000-000000000004', 'T143-D', 'CT', '-EF', 'Instrutor T143 D', 'Militar', 'CIAARA', ', ,'),
  ('a1430000-0000-0000-0000-000000000005', 'T143-E', 'CT', '-EF', 'Instrutor T143 E', 'Militar', 'CIAARA', null);

select is(app.converter_capacitacoes_didaticas(), 4, 'C-10 · converte os quatro com texto, e so eles');

select results_eq(
  $$select codigo, capacitacoes_didaticas::text[], capacitacao_didatica_a_corrigir
      from public.instrutores where codigo like 'T143-%' order by codigo$$,
  $$values ('T143-A', array['C-Esp-DID', 'C-Exp-TE']::text[], null::text),
           ('T143-B', array['C-Esp-DID', 'C-Exp-TE', 'Licenciatura']::text[], null::text),
           ('T143-C', array['C-Exp-TE']::text[], 'Pedagogia'),
           ('T143-D', array[]::text[], ', ,'),
           ('T143-E', array[]::text[], null::text)$$,
  'C-10 · a lista na ordem da lista fechada; o que nao casa fica, como foi escrito'
);

select is(
  (select capacitacao_didatica from public.instrutores where codigo = 'T143-C'),
  'Pedagogia, C-Exp-TE',
  'C-10 · o texto antigo NAO e tocado'
);

select is(app.converter_capacitacoes_didaticas(), 0, 'C-10 · idempotente: a segunda volta nao muda nada');

update public.instrutores set capacitacoes_didaticas = '{Licenciatura}', capacitacao_didatica_a_corrigir = null
 where codigo = 'T143-C';
select is(app.converter_capacitacoes_didaticas(), 0, 'C-11 · quem corrigiu a mao nao e sobrescrito');

-- ================================================================ M3 — acessos de conta
select hasnt_column('public', 'acessos_de_conta', 'criado_por', 'C-14 · sem `criado_por`: o acesso nao vira dependente em excluir_conta (D-USR-3)');
select hasnt_column('public', 'acessos_de_conta', 'editado_por', 'C-14 · sem `editado_por`, pelo mesmo motivo');

select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'acessos_de_conta'),
  3,
  'C-14 · so conta e instante (e o id)'
);

select ok(
  not has_table_privilege('authenticated', 'public.acessos_de_conta', 'INSERT')
  and not has_table_privilege('authenticated', 'public.acessos_de_conta', 'UPDATE'),
  'C-13 · ninguem grava direto: so a funcao do login'
);

insert into public.acessos_de_conta (usuario_id) values ('a1430000-0000-0000-0000-0000000000aa');

select throws_ok(
  $$update public.acessos_de_conta set ocorrido_em = now() where usuario_id = 'a1430000-0000-0000-0000-0000000000aa'$$,
  '42501', null,
  'C-14 · so de acrescimo: UPDATE recusado, inclusive para o dono'
);
select throws_ok(
  $$delete from public.acessos_de_conta where usuario_id = 'a1430000-0000-0000-0000-0000000000aa'$$,
  '42501', null,
  'C-14 · DELETE recusado, inclusive para o dono'
);
select throws_ok(
  $$truncate public.acessos_de_conta$$,
  '42501', null,
  'C-14 · TRUNCATE recusado, inclusive para o dono'
);

-- ⚠️ Gotcha 15: o porteiro da funcao e por `auth.uid() is null`, e o pgTAP roda sem sessao.
select throws_ok(
  $$select public.registrar_acesso()$$,
  '42501', null,
  'C-13 · registrar_acesso sem sessao e recusado — o porteiro nao falha aberto'
);

select * from finish();
rollback;
