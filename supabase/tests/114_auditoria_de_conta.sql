-- =====================================================================================
-- 114_auditoria_de_conta.sql — a trilha so de acrescimo das acoes sobre conta
-- Epico 3 · spec 011-gestao-de-usuarios · T017 · invariantes I-1 a I-3
-- -------------------------------------------------------------------------------------
-- ⚠️ **ESTE ARQUIVO PROVA ESTRUTURA E REGRA DE BANCO, NAO PERMISSAO.** Ele roda como DONO do
--    schema, e sob privilegio de dono a RLS nao se aplica — uma assercao de "o Operador nao le"
--    escrita aqui passaria com a RLS DESLIGADA. Quem prova quem pode o que e
--    `tests/invariantes/rls/gestao-de-usuarios.test.ts`, com sessao autenticada de verdade
--    (DoD 4 do `CLAUDE.md`).
--
-- ⚠️ **A IMUTABILIDADE, PORTANTO, E PROVAVEL AQUI — e e o unico jeito de prova-la de verdade.**
--    O gatilho e de COMANDO e nao consulta perfil nenhum: ele recusa `UPDATE`, `DELETE` e
--    `TRUNCATE` para quem quer que seja. Rodar como dono e o caso MAIS FORTE, nao o mais fraco:
--    se o dono do schema e barrado, a `service_role` tambem e. Foi a lacuna do `migracao_log`
--    (PEND-5a-3) que ensinou a medir `TRUNCATE` separado de `DELETE`.
--
-- ⚠️ **O RETRATO DE ANTES, medido no banco local em 02/10/2026**: a tabela `auditoria_de_conta`
--    NAO EXISTIA, e `auditoria` ja era recurso da matriz `perfil_permissao`, com `ler` permitido
--    para **quatro** perfis — `admin`, `chefe_departamento_ensino`,
--    `encarregado_administracao_academica` e `ajudante_administracao_academica`. A policy desta
--    tabela reaproveita essa linha; ela nao cria permissao nova.
-- =====================================================================================
begin;
select plan(14);

-- ============================================ a forma da tabela
select has_table('public', 'auditoria_de_conta',
  'FR-047 · a trilha de acoes sobre conta existe');

select columns_are('public', 'auditoria_de_conta',
  array['id', 'autor_id', 'acao', 'conta_alvo_id', 'conta_alvo_codigo', 'ocorrido_em'],
  'FR-047.1 · QUATRO campos de conteudo e nada alem (mais `id` e o carimbo de tempo)');

-- ⚠️ A ausencia de FK e DELIBERADA: a conta excluida deixa de existir, e uma FK tornaria o
--    rastro impossivel de gravar justamente no caso em que ele mais importa.
select is_empty($$
  select conname from pg_constraint
   where conrelid = 'public.auditoria_de_conta'::regclass and contype = 'f'
$$, 'FR-047 · `conta_alvo_id` NAO e FK — o rastro sobrevive a conta apagada');

-- ============================================ o dominio fechado de `acao`
select col_has_check('public', 'auditoria_de_conta', 'acao',
  'FR-047 · `acao` tem CHECK — a trilha nao vira deposito de qualquer evento');

-- Os SEIS valores entram...
select lives_ok($$
  insert into public.auditoria_de_conta (autor_id, acao, conta_alvo_id, conta_alvo_codigo)
  select gen_random_uuid(), a, gen_random_uuid(), 'USR-TESTE'
    from unnest(array['editar_perfil','editar_nome','redefinir_senha',
                      'desativar','reativar','excluir']) as a
$$, 'FR-047 · os SEIS valores de acao sao aceitos');

-- ...e o setimo nao.
select throws_ok($$
  insert into public.auditoria_de_conta (autor_id, acao, conta_alvo_id, conta_alvo_codigo)
  values (gen_random_uuid(), 'promover', gen_random_uuid(), 'USR-TESTE')
$$, '23514', null,
  'FR-047 · o SETIMO valor de acao e recusado pelo CHECK');

select throws_ok($$
  insert into public.auditoria_de_conta (autor_id, acao, conta_alvo_id, conta_alvo_codigo)
  values (gen_random_uuid(), 'desativar', gen_random_uuid(), '   ')
$$, '23514', null,
  'FR-047 · codigo em branco e recusado — rastro ilegivel nao e rastro');

-- ============================================ I-1 · RLS, UMA policy, zero escrita
select ok(
  (select relrowsecurity from pg_class where oid = 'public.auditoria_de_conta'::regclass),
  'I-1 · a tabela tem RLS ligada'
);

select is(
  (select count(*)::int from pg_policy where polrelid = 'public.auditoria_de_conta'::regclass),
  1,
  'I-1 · UMA policy, e so uma — a de leitura. Nenhuma de escrita, por desenho'
);

select is(
  (select polcmd::text from pg_policy where polrelid = 'public.auditoria_de_conta'::regclass),
  'r',
  'I-1 · a unica policy e de SELECT'
);

-- ⚠️ O `revoke` nao e redundante com a RLS: RLS filtra linha sobre privilegio que ja existe.
--    Tabela nova nasce com ALL para `authenticated` no Supabase.
select is_empty($$
  select privilege_type from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'auditoria_de_conta'
     and grantee in ('authenticated', 'anon')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
$$, 'I-1 · `authenticated` e `anon` sem INSERT/UPDATE/DELETE/TRUNCATE');

-- ============================================ I-2 · imutavel, inclusive para quem tem privilegio
select throws_ok($$
  update public.auditoria_de_conta set acao = 'excluir'
$$, '42501', null,
  'I-2 · UPDATE e recusado com 42501 — e o dono do schema que esta tentando');

select throws_ok($$
  delete from public.auditoria_de_conta
$$, '42501', null,
  'I-2 · DELETE e recusado com 42501');

-- ⚠️ TRUNCATE SEPARADO, e e a assercao que a lacuna do `migracao_log` pediu: TRUNCATE nao
--    dispara gatilho de LINHA, e a `service_role` tem o privilegio. Sem um gatilho de
--    COMANDO proprio, a tabela seria esvaziavel sem passar por nada.
select throws_ok($$
  truncate public.auditoria_de_conta
$$, '42501', null,
  'I-2 · TRUNCATE e recusado com 42501 — gatilho de comando proprio, nao o de linha');

select * from finish();
rollback;
