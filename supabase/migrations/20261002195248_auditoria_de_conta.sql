-- =================================================================================
-- M2 da spec 011 — a trilha de acoes administrativas sobre conta.
--
-- O QUE  : (1) `public.auditoria_de_conta`, so de acrescimo, com QUATRO campos de
--          conteudo; (2) RLS com UMA policy, de leitura; (3) os DOIS gatilhos de
--          comando que a tornam imutavel INCLUSIVE para a `service_role`; (4) a funcao
--          `SECURITY DEFINER` que grava lendo o autor de `auth.uid()` DENTRO dela.
--
-- POR QUE: `FR-047` manda registrar toda acao administrativa sobre conta, e a `FR-047.1`
--          fixa o conteudo em QUATRO informacoes — quem, o que, sobre qual conta, quando
--          (decisao D-2 de Bernardo Villas Boas, 29/09/2026).
--
-- ⚠️ QUATRO INFORMACOES E NADA ALEM, E O "NADA ALEM" E A DECISAO.
--    Nao ha `valor_antes`, `valor_depois` nem retrato. A pergunta que esta trilha responde
--    e *"quem mexeu na conta de quem, e quando"*. Retrato do que foi apagado e outro fato,
--    e ele mora em `exclusoes_registradas` — a mesma acao pode gerar linha nas duas.
--
-- ⚠️ `conta_alvo_id` NAO E FK, e isso e deliberado. A conta excluida deixa de existir, e
--    uma FK aqui tornaria o rastro impossivel de gravar justamente no caso em que ele mais
--    importa. E por isso existe `conta_alvo_codigo`: o `id` de uma linha que nao existe mais
--    nao diz nada a quem le.
--
-- ⚠️ O MOLDE E `exclusoes_registradas` (M2 da spec 010), QUE JA RESISTE A `service_role`.
--    Nao e copia por conveniencia: aquela tabela foi conferida no remoto, e repetir o molde
--    e mais seguro que inventar um segundo jeito de ser imutavel.
--
-- ⚠️ SEM `origem_migracao_v1` E SEM O QUARTETO DE AUDITORIA — desvio de convencao declarado
--    em `data-model.md` §1.1, igual ao da tabela irma: `autor_id`/`ocorrido_em` SAO a
--    auditoria desta tabela, e `editado_por`/`editado_em` nao fazem sentido numa linha que,
--    por construcao, nunca muda.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop trigger if exists trg_auditoria_conta_sem_truncate on public.auditoria_de_conta;
--    drop trigger if exists trg_auditoria_conta_imutavel     on public.auditoria_de_conta;
--    drop function if exists public.registrar_acao_em_conta(uuid, text, text);
--    drop function if exists app.auditoria_de_conta_imutavel();
--    drop table if exists public.auditoria_de_conta;   -- SO SE VAZIA
--    ⚠️ Com linha dentro, `drop table` apaga rastro de acao que aconteceu — exatamente o que
--       a regra 4 impede. Com linha, a reversao para na funcao e nos gatilhos, e a tabela fica.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a tabela
-- ---------------------------------------------------------------------------------
create table if not exists public.auditoria_de_conta (
  id                 uuid        primary key default gen_random_uuid(),
  autor_id           uuid        not null,
  acao               text        not null,
  conta_alvo_id      uuid        not null,
  conta_alvo_codigo  text        not null,
  ocorrido_em        timestamptz not null default now(),

  -- ⚠️ SEIS valores, e o CHECK e o que impede a trilha de virar deposito de qualquer evento.
  --    `reativar` entra aqui SEM criar acao nova na matriz de permissao: a decisao D-6
  --    (29/09/2026) manda reativar sob a MESMA permissao de desativar, e a assercao existente
  --    de zero `reativar` em `perfil_permissao` fica INTACTA.
  constraint auditoria_conta_acao_conhecida
    check (acao in ('editar_perfil', 'editar_nome', 'redefinir_senha',
                    'desativar', 'reativar', 'excluir')),
  constraint auditoria_conta_codigo_nao_vazio
    check (btrim(conta_alvo_codigo) <> '')
);

comment on table public.auditoria_de_conta is
  'Trilha das acoes administrativas sobre conta de usuario (FR-047, decisao D-2 de Bernardo '
  'Villas Boas, 29/09/2026): quem, o que, sobre qual conta e quando — QUATRO informacoes e '
  'nada alem. SO DE ACRESCIMO: UPDATE, DELETE e TRUNCATE sao recusados por gatilho, '
  'INCLUSIVE para a service_role. Escrita apenas por public.registrar_acao_em_conta '
  '(SECURITY DEFINER); nenhuma policy de escrita. Leitura por quem tem `auditoria.ler`.';

comment on column public.auditoria_de_conta.autor_id is
  'QUEM fez. E o `auth.users.id` (o mesmo de `usuarios.auth_user_id`), lido de `auth.uid()` '
  'DENTRO da funcao DEFINER — nunca um valor mandado pelo cliente. Mesma razao pela qual '
  '`set_auditoria()` ignora `criado_por` vindo de fora. ATENCAO: NAO e `usuarios.id`; juntar '
  'por ele nao da erro, apenas nao casa, e o rastro sai dizendo que todo autor foi removido.';
comment on column public.auditoria_de_conta.conta_alvo_id is
  'SOBRE QUAL CONTA. NAO e FK: a conta excluida deixa de existir, e o rastro tem de '
  'sobreviver a ela.';
comment on column public.auditoria_de_conta.conta_alvo_codigo is
  'O `codigo` legivel no momento do fato (USR-...). Existe porque o `id` de uma linha que '
  'nao existe mais nao diz nada a quem le o rastro.';

create index if not exists ix_auditoria_conta_alvo_data
  on public.auditoria_de_conta (conta_alvo_id, ocorrido_em desc);

alter table public.auditoria_de_conta enable row level security;

-- UMA policy, de leitura. Nenhuma de escrita: quem grava e a funcao DEFINER, que nao passa
-- pela RLS. A invariante I-1 confere que ela continua sendo uma so.
drop policy if exists auditoria_de_conta_ler on public.auditoria_de_conta;
create policy auditoria_de_conta_ler
  on public.auditoria_de_conta
  for select
  using (app.pode('auditoria', 'ler'));

-- ⚠️ O `revoke` NAO e redundante com a RLS: RLS e filtro sobre privilegio que ja existe.
--    Sem isto, `authenticated` teria INSERT/UPDATE/DELETE/TRUNCATE por padrao do Supabase, e
--    a RLS so filtraria as linhas (gotcha 3 e achado 1 do Epico 1). E view ou tabela nova
--    nasce com esses privilegios: toda migration que cria tabela repete o revoke.
revoke insert, update, delete, truncate on public.auditoria_de_conta from authenticated, anon;

-- ---------------------------------------------------------------------------------
-- PARTE B — a imutabilidade, INCLUSIVE para a service_role
--
-- ⚠️ DOIS gatilhos, e o de TRUNCATE e deliberado: TRUNCATE nao dispara gatilho de linha, e a
--    `service_role` TEM o privilegio. Foi exatamente assim que a lacuna do `migracao_log`
--    (PEND-5a-3) passou despercebida por semanas — ela recusa UPDATE e DELETE e nao recusa
--    TRUNCATE, e a tabela pode ser esvaziada sem passar pelo gatilho.
-- ---------------------------------------------------------------------------------
create or replace function app.auditoria_de_conta_imutavel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'auditoria_de_conta e so de acrescimo: % nao e permitido', tg_op
    using errcode = '42501',
          hint = 'auditoria_imutavel',
          detail = 'Corrigir um rastro e registrar evento novo, nunca reescrever o antigo '
                   '(Principio IV, regra 5 do CLAUDE.md).';
end;
$$;

comment on function app.auditoria_de_conta_imutavel() is
  'Recusa UPDATE, DELETE e TRUNCATE em `auditoria_de_conta`. Gatilho de STATEMENT: pega '
  'tambem quem tem privilegio, a service_role inclusive.';

revoke all on function app.auditoria_de_conta_imutavel() from public, anon, authenticated;

drop trigger if exists trg_auditoria_conta_imutavel on public.auditoria_de_conta;
create trigger trg_auditoria_conta_imutavel
  before update or delete on public.auditoria_de_conta
  for each statement execute function app.auditoria_de_conta_imutavel();

drop trigger if exists trg_auditoria_conta_sem_truncate on public.auditoria_de_conta;
create trigger trg_auditoria_conta_sem_truncate
  before truncate on public.auditoria_de_conta
  for each statement execute function app.auditoria_de_conta_imutavel();

-- ---------------------------------------------------------------------------------
-- PARTE C — quem grava
--
-- ⚠️ O AUTOR E LIDO AQUI DENTRO, de `auth.uid()`, e nao recebido por parametro. Receber o
--    autor faria da trilha um campo preenchivel: quem chama escreveria qualquer `uuid` e o
--    rastro diria o que o chamador quisesse. E o modo de falha ja medido nesta base —
--    `set_auditoria()` gravava `criado_por` mandado pelo cliente, achado na fatia (c).
--
-- ⚠️ O CODIGO DA CONTA ALVO TAMBEM E LIDO AQUI, da propria tabela, pela mesma razao: ele e o
--    que torna o rastro legivel, e um codigo vindo de fora podia nao ser o da conta tocada.
--    Na EXCLUSAO a linha ja nao existe quando o rastro e gravado, entao o chamador passa o
--    codigo que leu ANTES de apagar — por isso o parametro e opcional, e nao ausente.
-- ---------------------------------------------------------------------------------
-- ⚠️ ELA MORA EM `public`, E NAO EM `app`, POR UM MOTIVO MEDIDO EM 02/10/2026: o PostgREST **nao
--    expoe o schema `app`**, e `supabase.rpc()` so alcanca `public`. A primeira escrita a pos em
--    `app`, e o teste de sessao real recusou com `PGRST202 — Could not find the function ... in the
--    schema cache` — mensagem que se le como *"a funcao nao existe"* e significa *"a funcao nao e
--    alcancavel pela interface de dados"*.
--    ⚠️ E o mesmo obstaculo que `exigirAdmin` ja contornava para `app.eh_admin()`, com um caminho
--       alternativo escrito a mao. Aqui, em vez de contornar, a funcao nasce onde precisa estar.
--    ⚠️ Estar em `public` NAO a torna mais permissiva: ela e `SECURITY DEFINER` com porteiro de
--       Admin dentro, e `anon` nao tem `execute`.
create or replace function public.registrar_acao_em_conta(
  p_conta_alvo_id     uuid,
  p_acao              text,
  p_conta_alvo_codigo text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_autor  uuid := auth.uid();
  v_codigo text := p_conta_alvo_codigo;
begin
  if v_autor is null then
    raise exception 'registro de auditoria exige sessao autenticada'
      using errcode = '42501', hint = 'auditoria_sem_autor';
  end if;

  -- ⚠️ SO ADMIN REGISTRA, e a conferencia e aqui porque a funcao e DEFINER: sem ela, qualquer
  --    sessao autenticada poderia escrever na trilha, que nao tem policy de escrita
  --    justamente para que ninguem escreva por fora.
  if not app.eh_admin() then
    raise exception 'registro de auditoria restrito ao perfil Admin'
      using errcode = '42501', hint = 'auditoria_sem_permissao';
  end if;

  if v_codigo is null then
    select u.codigo into v_codigo from public.usuarios u where u.id = p_conta_alvo_id;
  end if;

  if v_codigo is null or btrim(v_codigo) = '' then
    raise exception 'conta alvo % nao tem codigo legivel para o rastro', p_conta_alvo_id
      using errcode = '23502', hint = 'auditoria_sem_codigo';
  end if;

  insert into public.auditoria_de_conta (autor_id, acao, conta_alvo_id, conta_alvo_codigo)
  values (v_autor, p_acao, p_conta_alvo_id, v_codigo);
end;
$$;

comment on function public.registrar_acao_em_conta(uuid, text, text) is
  'Grava uma linha na trilha de acoes sobre conta. O autor sai de `auth.uid()` DENTRO da '
  'funcao, e o codigo da conta alvo sai da propria tabela quando nao e informado — na '
  'exclusao ele e informado, porque a linha ja nao existe. Recusa sem sessao (42501) e '
  'sem perfil Admin (42501).';

-- ⚠️ `authenticated` PRECISA de `execute`: a Server Action chama esta funcao com a sessao de
--    quem pediu, nao com a `service_role` — e `service_role` nao tem `usage` em `app`.
revoke all on function public.registrar_acao_em_conta(uuid, text, text) from public, anon;
grant execute on function public.registrar_acao_em_conta(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE D — a leitura pela tela
--
-- ⚠️ A TRILHA MORA EM `public`, MAS A TELA NAO A LE DIRETO POR UM MOTIVO: ela guarda
--    `autor_id`, que e `usuarios.id`, e mostrar um uuid nao informa ninguem. Esta funcao
--    devolve o rastro JA com o nome de quem fez, aplicando a MESMA policy de leitura —
--    ela e `invoker`, nao `definer`, entao quem nao tem `auditoria.ler` recebe vazio.
-- ---------------------------------------------------------------------------------
create or replace function public.rastro_da_conta(p_conta_alvo_id uuid)
returns table (
  acao              text,
  ocorrido_em       timestamptz,
  autor_nome        text,
  conta_alvo_codigo text
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select a.acao,
         a.ocorrido_em,
         coalesce(autor.nome_exibicao, autor.nome, 'conta removida') as autor_nome,
         a.conta_alvo_codigo
    from public.auditoria_de_conta a
    -- ⚠️ A JUNCAO E POR `auth_user_id`, NAO POR `usuarios.id`, E A PRIMEIRA ESCRITA ERRAVA AQUI.
    --    `autor_id` guarda `auth.uid()` — o identificador do schema `auth` —, e `usuarios.id` e
    --    outro espaco de nomes. A juncao errada nao da erro: ela simplesmente nao casa, e a coluna
    --    sai com o `coalesce` de 'conta removida' para TODA linha. Rastro que diz que o autor foi
    --    removido quando ele esta ativo e pior que rastro sem autor, porque parece informacao.
    left join public.usuarios autor on autor.auth_user_id = a.autor_id
   where a.conta_alvo_id = p_conta_alvo_id
   order by a.ocorrido_em desc;
$$;

comment on function public.rastro_da_conta(uuid) is
  'O rastro de uma conta, com o nome de quem fez em vez do uuid. SECURITY INVOKER de '
  'proposito: a policy `auditoria_de_conta_ler` decide, e quem nao tem `auditoria.ler` '
  'recebe vazio em vez de erro.';

revoke all on function public.rastro_da_conta(uuid) from public, anon;
grant execute on function public.rastro_da_conta(uuid) to authenticated;
