-- =================================================================================
-- O vínculo que faltava entre a credencial e o cadastro
--
-- O QUE  : cria `app.vincular_credencial()`, que preenche `usuarios.auth_user_id` do
--          próprio autenticado quando ele ainda está nulo.
--
-- PARA QUE: o fluxo de convite nunca fechou esse espelho. `convidar()` cria a linha com
--          `auth_user_id` NULO de propósito — é a janela do FR-008 —, a pessoa recebe o
--          e-mail, define a senha, e **nada jamais escreve a coluna de volta**. Medido em
--          11/09/2026: não há escrita de `auth_user_id` em `app/` nem em `lib/`, e não há
--          gatilho em `auth.users`. A única escrita do repositório inteiro está em
--          helper de teste.
--
-- 🛑 O EFEITO É QUE NINGUÉM CONVIDADO ENTRA. `usuarioDaSessao()` procura a linha por
--    `auth_user_id`; sem o vínculo ela devolve `null`, e o layout de `(app)` manda para
--    `/login`. A pessoa autentica, vê a raiz — que é estática e renderiza sem sessão —, e
--    é devolvida ao login no primeiro clique. **Parece senha errada e não é.**
--
-- ⚠️ POR QUE A SUÍTE NÃO PEGOU, e as duas razões são independentes:
--      1. `tests/e2e/conta-de-teste.ts` grava `auth_user_id` direto ao criar a conta —
--         os 132 casos de ponta a ponta rodam como contas que a aplicação não sabe criar;
--      2. o caso V-3, que exercita o convite de verdade, **seleciona a coluna e não a
--         confere**: o comentário afirma que o espelho fecha, e a asserção olha `codigo` e
--         `origem_migracao_v1`. Ele ainda aceitava terminar em `/login` como desfecho bom.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- ⚠️ POR QUE `SECURITY DEFINER`, e por que NÃO `service_role`
--
-- Há um ovo e uma galinha: a RLS de `usuarios` identifica a linha por
-- `app.usuario_atual()`, que depende do vínculo — que é justamente o que falta. Nenhuma
-- policy consegue autorizar a escrita que a torna possível.
--
-- A saída óbvia seria uma Server Action com `service_role`. **O BRIEF §3 a proíbe**: ela
-- ignora a RLS inteira e tem três usos autorizados, nenhum deles "por requisição de tela".
-- Uma função com dono, escopo mínimo e sem parâmetro é a fronteira certa — é o banco
-- decidindo, que é o Princípio XI.
-- ---------------------------------------------------------------------------------
create or replace function app.vincular_credencial()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid        uuid;
  v_email      text;
  v_confirmado timestamptz;
  v_id         uuid;
begin
  v_uid := app.uid_atual();

  -- Contexto de servidor (ETL, script de manutenção, painel): não há credencial a
  -- vincular, e inventar uma seria o oposto do que esta função existe para fazer.
  if v_uid is null then
    return false;
  end if;

  /*
   * ⚠️ O E-MAIL VEM DE `auth.users`, NUNCA DE PARÂMETRO — e é por isso que a função não
   * recebe argumento nenhum. Um parâmetro de e-mail transformaria esta função na própria
   * tomada de conta que ela precisa impedir: bastaria pedir o vínculo com o endereço de
   * outra pessoa.
   */
  select u.email, u.email_confirmed_at
    into v_email, v_confirmado
    from auth.users u
   where u.id = v_uid;

  if v_email is null then
    return false;
  end if;

  -- Defesa em profundidade: o auto-cadastro está desligado, então toda credencial nasce
  -- de convite e chega confirmada. Se algum dia isso mudar, um endereço não confirmado
  -- não passa a valer como prova de identidade.
  if v_confirmado is null then
    return false;
  end if;

  /*
   * ⚠️ `auth_user_id is null` NÃO É OTIMIZAÇÃO, É A TRAVA. Sem ela, quem já tem vínculo
   * poderia reapontá-lo — e reapontar o vínculo de um cadastro é assumir o lugar dele,
   * com o perfil e o escopo que ele tiver. A coluna é `unique`, o que faz o banco recusar
   * o segundo dono; esta condição faz a função nem tentar.
   *
   * `status = 'ativo'` pelo mesmo motivo de sempre: conta desativada não volta por login.
   */
  update public.usuarios
     set auth_user_id = v_uid
   where email = lower(btrim(v_email))
     and auth_user_id is null
     and status = 'ativo'
  returning id into v_id;

  return v_id is not null;
end;
$$;

comment on function app.vincular_credencial() is
  'Fecha o espelho `usuarios.auth_user_id` para o proprio autenticado, uma unica vez. '
  'Sem parametro de proposito: o e-mail vem de `auth.users` pelo `auth.uid()` da sessao. '
  'Nunca reaponta vinculo existente — `auth_user_id is null` e a trava contra tomada de '
  'conta. Chamada pela tela de convite depois que a senha e definida. Origem: FR-008/FR-010.';

-- ---------------------------------------------------------------------------------
-- ⚠️ `SECURITY DEFINER` NASCE EXECUTÁVEL POR `public`. Sem o revoke abaixo, a função
--    ficaria ao alcance de `anon` — e uma função com os direitos do dono ao alcance de
--    quem não autenticou é exatamente o que não se quer. O `uid_atual()` nulo já a faria
--    devolver `false`, mas defesa que depende de uma só camada não é defesa.
-- ---------------------------------------------------------------------------------
revoke all on function app.vincular_credencial() from public;
grant execute on function app.vincular_credencial() to authenticated;

-- ---------------------------------------------------------------------------------
-- O ponto de entrada exposto — e por que ele é um segundo objeto
--
-- ⚠️ **O PostgREST NÃO EXPÕE O SCHEMA `app`.** `supabase/config.toml` lista
--    `schemas = ["public", "graphql_public"]`, e é deliberado: `app` é a maquinaria que as
--    policies chamam, não uma API. O repositório já tropeçou nisso uma vez —
--    `lib/acoes/usuarios.ts` chama `rpc("eh_admin")`, **sempre recebe erro**, e tem um
--    caminho alternativo escrito para isso.
--
-- Daí o invólucro: a regra continua em `app`, junto das outras 25, e o que fica ao alcance
-- da rede é uma linha que não decide nada. **A superfície exposta precisa ser óbvia numa
-- função de segurança** — e uma linha é o mais óbvio que dá para escrever.
--
-- Ele é `security invoker` de propósito: quem levanta privilégio é a função de dentro, uma
-- só, e é lá que a auditoria olha.
-- ---------------------------------------------------------------------------------
create or replace function public.vincular_credencial()
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select app.vincular_credencial();
$$;

comment on function public.vincular_credencial() is
  'Ponto de entrada exposto de `app.vincular_credencial()`. Existe porque o PostgREST nao '
  'expoe o schema `app`. Nao decide nada — a regra, a trava contra reapontamento e o '
  'levantamento de privilegio vivem na funcao de dentro.';

/*
 * ⚠️ `revoke ... from public` NÃO TIRA DE `anon`, E ISSO FOI MEDIDO AQUI.
 *
 * Na primeira execução desta migration, `has_function_privilege('anon', …, 'execute')`
 * devolveu **true** mesmo com o revoke acima — porque o privilégio de `anon` no schema
 * `public` do Supabase é **concessão direta ao papel**, por privilégio padrão, e não uma
 * herança do pseudo-papel `PUBLIC`. Revogar de um não revoga do outro.
 *
 * É a mesma armadilha que a migration `20260908120000` documenta para tabela e view — o
 * `revoke ... on all tables` do Épico 1 é foto do momento. **Ela vale para FUNÇÃO
 * também**, e isso ainda não estava escrito em lugar nenhum.
 *
 * O alcance de `anon` seria inofensivo na prática: o invólucro é `security invoker`, e
 * `anon` não tem execute na função de dentro. Mas "inofensivo porque a segunda camada
 * pega" é justamente como se descreve uma camada que não deveria ter sido deixada aberta.
 */
revoke all on function public.vincular_credencial() from public;
revoke all on function public.vincular_credencial() from anon;
grant execute on function public.vincular_credencial() to authenticated;

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   drop function if exists public.vincular_credencial();
--   drop function if exists app.vincular_credencial();
--
-- ⚠️ Reverter devolve o sistema ao estado em que **nenhuma pessoa convidada consegue
--    entrar**. Os vínculos já gravados permanecem — a coluna não é tocada pela remoção —,
--    então quem já entrou continua entrando, e só convites novos voltam a falhar.
-- =================================================================================
