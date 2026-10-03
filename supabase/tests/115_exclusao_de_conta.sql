-- =====================================================================================
-- 115_exclusao_de_conta.sql — a exclusao permanente de conta
-- Epico 3 · spec 011-gestao-de-usuarios · M3
-- -------------------------------------------------------------------------------------
-- ⚠️ **ESTE ARQUIVO PROVA ESTRUTURA E REGRA DE BANCO, NAO PERMISSAO.** Ele roda como DONO do
--    schema, e sob privilegio de dono a RLS nao se aplica. Quem prova quem pode o que e
--    `tests/invariantes/rls/gestao-de-usuarios.test.ts`, com sessao autenticada de verdade
--    (DoD 4 do `CLAUDE.md`).
--
-- ⚠️ **E AS RECUSAS DO PORTEIRO SAO PROVAVEIS AQUI, porque elas NAO sao de RLS.** Elas vivem
--    dentro de `public.excluir_conta`, que e `SECURITY DEFINER`: a funcao levanta a excecao por
--    conta propria, para quem quer que a chame. Rodar como dono e o caso mais forte — se o dono
--    e barrado, todo mundo e.
--
-- ⚠️ **O RETRATO DE ANTES, medido no banco local em 03/10/2026**: `usuarios` NAO tinha
--    `excluida_em`; `criado_por`/`editado_por` existem em **27 tabelas** de `public` e **nenhuma
--    delas tem FK** nessas colunas; e **uma** FK aponta para `usuarios.id` —
--    `usuario_curso.usuario_id`, com `restrict`.
-- =====================================================================================
begin;
select plan(16);

-- ============================================ o marcador
select has_column('public', 'usuarios', 'excluida_em',
  'M3 · `usuarios.excluida_em` existe — e o marcador que tira a conta anonimizada da lista');

select col_is_null('public', 'usuarios', 'excluida_em',
  'M3 · ela e ANULAVEL: nulo e conta viva, que e o caso normal');

-- ⚠️ A ausencia de valor novo no enum de status e o ponto: um terceiro caso faria todo filtro
--    escrito como `status = 'ativo'` passar a esconder coisa nova sem deixar de compilar.
select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'situacao_cadastro' or t.typname = 'status_cadastro'),
  0,
  'M3 · a exclusao NAO criou enum de situacao proprio — ela e coluna, nao terceiro status'
);

-- ============================================ as duas funcoes, e os privilegios
select has_function('public', 'excluir_conta', array['uuid'],
  'M3 · `public.excluir_conta(uuid)` existe — e e por ela que a exclusao passa');

select has_function('public', 'dependentes_da_conta', array['uuid'],
  'M3 · `public.dependentes_da_conta(uuid)` existe — e o que decide entre apagar e anonimizar');

-- ⚠️ `SECURITY DEFINER` nas duas: o porteiro mora dentro, e e por isso que nao ha policy.
select is(
  (select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('excluir_conta', 'dependentes_da_conta')),
  true,
  'M3 · as duas sao SECURITY DEFINER — o porteiro e da funcao, nao de policy'
);

select is_empty($$
  select routine_name from information_schema.routine_privileges
   where routine_schema = 'public' and grantee = 'anon'
     and routine_name in ('excluir_conta', 'dependentes_da_conta')
$$, 'M3 · `anon` nao executa nenhuma das duas');

-- ============================================ a regra 4 segue inteira
-- ⚠️ A ASSERCAO QUE MAIS IMPORTA DESTE ARQUIVO. A emenda nominal autoriza a FUNCAO, nao uma
--    policy: se um `for delete` aparecesse, a regra 4 teria sido afrouxada de verdade.
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'regra 4 · ZERO policies de DELETE no catalogo inteiro, mesmo com a exclusao de conta de pe'
);

select is_empty($$
  select privilege_type from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'usuarios'
     and grantee in ('authenticated', 'anon') and privilege_type in ('DELETE', 'TRUNCATE')
$$, 'regra 4 · `authenticated` continua sem DELETE nem TRUNCATE em `usuarios`');

-- ============================================ o porteiro recusa sem sessao
-- ⚠️ `auth.uid()` e nulo aqui porque o pgTAP nao tem sessao — e e exatamente o primeiro
--    porteiro da funcao. Sem esta assercao, uma funcao que confiasse no chamador passaria.
select throws_ok($$
  select public.excluir_conta('00000000-0000-0000-0000-000000000001'::uuid)
$$, '42501', null,
  'M3 · sem sessao autenticada a exclusao e recusada com 42501');

select throws_ok($$
  select public.dependentes_da_conta('00000000-0000-0000-0000-000000000001'::uuid)
$$, '42501', null,
  'M3 · a consulta de dependentes tambem exige Admin — ela revela onde a conta agiu');

-- ============================================ o e-mail sentinela casa o CHECK
-- ⚠️ SE NAO CASASSE, a anonimizacao falharia no meio da exclusao — com a credencial JA apagada
--    pela Server Action. O sentinela precisa ser valido pelo CHECK, e `.invalid` e reservado
--    por norma (RFC 2606), entao ele nunca colide com e-mail de verdade.
select lives_ok($$
  insert into public.usuarios (codigo, email, nome, perfil, escopo_curso)
  values ('USR-SENTINELA-TESTE',
          'excluida-00000000000000000000000000000001@ciaara11.invalid',
          'Conta excluída', 'visualizacao', 'geral')
$$, 'M3 · o e-mail sentinela da anonimizacao passa no CHECK `usuarios_email_normalizado`');

-- ============================================ o chao de um Admin conta so quem ENTRA
-- ⚠️ **ESTE E O RETRATO DO REMOTO, MEDIDO EM 03/10/2026, so por leitura:** das cinco contas, DUAS
--    sao `admin`/`ativo` SEM credencial nenhuma (vindas do ETL) e UMA entra de verdade. Com a
--    contagem antiga — que olhava so `perfil` e `status` — o banco via TRES Administradores, e
--    estas duas guardas LIBERAVAM rebaixar, desativar ou excluir o unico que consegue entrar.
-- ⚠️ **NAO SOBRARIA NINGUEM PARA DESFAZER**, porque as outras duas nunca conseguiram entrar. A
--    guarda existia, estava escrita, parecia certa — e protegia um numero, nao uma pessoa.
-- ⚠️ **A SEMEADURA PRECISA DE LINHA EM `auth.users`**, porque `usuarios.auth_user_id` referencia
--    `auth.users(id)` com `restrict`: sem credencial de verdade nao ha como montar o caso do
--    admin que ENTRA. Tudo roda dentro da transacao desfeita deste arquivo.
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'admin-real@ciaara11.invalid');

insert into public.usuarios (codigo, email, nome, perfil, escopo_curso, status, auth_user_id)
values ('USR-REAL-TESTE', 'admin-real@ciaara11.invalid', 'Admin Que Entra',
        'admin', 'geral', 'ativo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.usuarios (codigo, email, nome, perfil, escopo_curso, status)
values ('USR-FANTASMA-TESTE', 'admin-fantasma@ciaara11.invalid', 'Admin Que Nunca Entrou',
        'admin', 'geral', 'ativo');

-- ⚠️ **A ASSERCAO QUE NOMEIA A ASSIMETRIA**: a contagem ingenua ve DOIS, a que vale ve UM. Sem
--    ela, as duas asercoes de comportamento abaixo passariam sem que ninguem soubesse POR QUE.
select is(
  (select count(*)::int from public.usuarios u
    where u.perfil = 'admin' and u.status = 'ativo' and u.excluida_em is null)
  || ' ingenuos / ' ||
  (select count(*)::int from public.usuarios u
    where u.perfil = 'admin' and u.status = 'ativo' and u.excluida_em is null
      and u.auth_user_id is not null) || ' que entram',
  '2 ingenuos / 1 que entram',
  'M4 · a contagem ingenua ve DOIS Admins ativos; a que vale ve UM — e a diferenca e o fantasma');

-- ⚠️ **O CASO QUE DISCRIMINA**: com o fantasma presente, rebaixar o unico que entra e RECUSADO.
--    Com a contagem antiga esta assercao reprova, porque o fantasma "substituia" o real.
select throws_ok($$
  update public.usuarios set perfil = 'operador' where codigo = 'USR-REAL-TESTE'
$$, '42501', null,
  'M4 · rebaixar o ultimo Admin COM ACESSO e recusado, mesmo com admin fantasma na lista');

-- E desativar tem de ser recusado pelo mesmo motivo — sao dois caminhos para o mesmo chao.
select throws_ok($$
  update public.usuarios set status = 'inativo' where codigo = 'USR-REAL-TESTE'
$$, '42501', null,
  'M4 · desativar o ultimo Admin COM ACESSO e recusado, mesmo com admin fantasma na lista');

-- ⚠️ **E O FANTASMA NAO E INDELEVEL**, que e a outra metade da regra: tira-lo do posto nao reduz
--    quem administra, e trava-lo deixaria conta inutil e inalteravel na lista para sempre.
select lives_ok($$
  update public.usuarios set perfil = 'operador' where codigo = 'USR-FANTASMA-TESTE'
$$, 'M4 · rebaixar um Admin SEM credencial e permitido — ele nao era o chao de nada');

select * from finish();
rollback;
