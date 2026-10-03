-- =================================================================================
-- O CHAO DE UM ADMIN PASSA A CONTAR SO QUEM ENTRA — spec 011
-- Data local do responsavel: 03/10/2026 (o carimbo do nome do arquivo e UTC)
-- Pedido de Bernardo Villas Boas, 03/10/2026: "Regra do ultimo admin: conte apenas admins
-- ATIVOS COM CREDENCIAL."
-- =================================================================================
-- ⚠️ ESTE E UM BURACO QUE ESTAVA ABERTO NO REMOTO, e ele e o oposto do que a `FR-042` promete.
--    Medido em 03/10/2026, so por leitura: das cinco contas, **duas tem perfil `admin` e situacao
--    `ativo` e NENHUMA credencial** (`USR-01` e `USR-02`, vindas do ETL), e **uma** entra de
--    verdade (`USR-ADMIN-001`). As duas guardas do chao — o gatilho de UPDATE e a funcao de
--    exclusao — contavam linhas, nao pessoas: elas viam TRES Administradores.
--
-- ⚠️ A CONSEQUENCIA, dita de frente: era possivel rebaixar, desativar ou EXCLUIR o unico
--    Administrador que consegue entrar, e **nao sobraria ninguem capaz de desfazer** — porque as
--    outras duas contas nunca conseguiram entrar. A guarda existia, estava escrita, parecia certa
--    e protegia um numero.
--
-- ⚠️ A REGRA PASSA A VALER DOS DOIS LADOS, e a simetria e deliberada:
--    · como PROTETOR  — admin sem credencial nao substitui ninguem, entao nao entra na contagem;
--    · como PROTEGIDO — tirar um admin que nunca entrou nao reduz quem administra, entao a guarda
--      nao o trava. Sem esta metade, as duas contas fantasma ficariam INDELEVEIS.
--
-- ⚠️ A MESMA REGRA EM TRES LUGARES, e nenhum substitui o outro: a funcao pura
--    `lib/dominio/ultimo-admin.ts` (para a tela nao oferecer o que vai ser recusado), o gatilho
--    (para quem chamar por `psql` ou `curl`) e `public.excluir_conta` (que apaga por fora do
--    gatilho, porque nao ha policy de DELETE). As tres foram emendadas nesta rodada.
--
-- REVERSAO: reaplicar `20260909020000` (o gatilho) e `20261003000205` (a funcao), que estao no
-- repositorio. Nenhuma linha de dado e tocada por esta migration.
-- ⚠️ REVERTER REABRE O BURACO.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o gatilho de UPDATE: rebaixar e desativar
-- ---------------------------------------------------------------------------------
create or replace function app.impedir_remocao_do_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admins_restantes integer;
begin
  -- So interessa a mudanca que TIRA alguem do posto de Admin ativo. Entrar nao e problema.
  if not (old.perfil = 'admin' and old.status = 'ativo') then
    return new;
  end if;
  if new.perfil = 'admin' and new.status = 'ativo' then
    return new;
  end if;

  -- ⚠️ **ADMIN SEM CREDENCIAL NAO E PROTEGIDO** (emenda de 03/10/2026): tira-lo do posto nao reduz
  --    quem administra, e trava-lo deixaria conta inutil e inalteravel na lista.
  if old.auth_user_id is null then
    return new;
  end if;

  -- ⚠️ **E NAO E PROTETOR TAMPOUCO**: `auth_user_id is not null` e o que faz esta contagem medir
  --    quem CONSEGUE ENTRAR, e nao quantas linhas dizem `admin`.
  select count(*)
    into v_admins_restantes
    from public.usuarios u
   where u.perfil = 'admin'
     and u.status = 'ativo'
     and u.auth_user_id is not null
     and u.excluida_em is null
     and u.id <> old.id;

  if v_admins_restantes = 0 then
    raise exception
      'Esta e a ultima conta Admin ativa COM ACESSO. Desativa-la ou rebaixa-la deixaria o '
      'sistema sem ninguem capaz de cadastrar, corrigir perfil ou reativar conta — inclusive '
      'sem ninguem capaz de desfazer esta operacao. Promova outra conta a Administrador e '
      'garanta que ela consegue entrar antes (FR-042).'
      using errcode = '42501', hint = 'ultimo_admin';
  end if;

  return new;
end;
$$;

comment on function app.impedir_remocao_do_ultimo_admin() is
  'Recusa a mudanca que deixaria o sistema sem Administrador ativo COM CREDENCIAL. Conta apenas '
  'quem tem `auth_user_id` (emenda de 03/10/2026): admin sem credencial nao entra, logo nao '
  'administra — contava como protetor e como protegido, e as duas metades estavam erradas.';

-- ---------------------------------------------------------------------------------
-- PARTE B — `public.excluir_conta`: a exclusao nao passa pelo gatilho de UPDATE
-- ---------------------------------------------------------------------------------
-- ⚠️ A EXCLUSAO TEM GUARDA PROPRIA, e e por isso que ela precisa da mesma emenda: no caminho
--    `apagada` ela faz `delete`, que o gatilho de UPDATE nao ve; no caminho `anonimizada` o
--    `update` dispara o gatilho, mas a linha ja esta sendo tirada do posto por decisao da funcao.
create or replace function public.excluir_conta(p_conta_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_eu        uuid := auth.uid();
  v_minha     uuid;
  v_codigo    text;
  v_perfil    public.perfil_usuario;
  v_status    text;
  v_admins    integer;
  v_auth_alvo uuid;
  v_tem       boolean;
  v_caminho   text;
begin
  if v_eu is null then
    raise exception 'exclusao de conta exige sessao autenticada'
      using errcode = '42501', hint = 'conta_sem_sessao';
  end if;
  -- ⚠️ `coalesce` aqui tambem, pelo mesmo motivo — ver a nota em `dependentes_da_conta`. Nesta
  --    funcao o `raise` de `auth.uid() is null` acima ja barraria, mas depender da ORDEM de dois
  --    porteiros e o tipo de coisa que a proxima edicao desfaz sem perceber.
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'exclusao de conta restrita ao perfil Admin'
      using errcode = '42501', hint = 'conta_sem_permissao';
  end if;

  select u.codigo, u.perfil, u.status, u.excluida_em is not null, u.auth_user_id
    into v_codigo, v_perfil, v_status, v_tem, v_auth_alvo
    from public.usuarios u where u.id = p_conta_id;
  if not found then
    raise exception 'conta % nao existe', p_conta_id
      using errcode = '23503', hint = 'conta_inexistente';
  end if;
  if v_tem then
    raise exception 'esta conta ja foi excluida'
      using errcode = '23505', hint = 'conta_ja_excluida';
  end if;

  -- ⚠️ A PROPRIA CONTA: a comparacao e por `usuarios.id`, e nao por `auth.uid()`. Comparar o
  --    uuid de `auth` com o da linha daria SEMPRE diferente, e o Admin passaria a poder excluir
  --    a si mesmo com a guarda no lugar e nada acusando.
  select u.id into v_minha from public.usuarios u where u.auth_user_id = v_eu;
  if v_minha = p_conta_id then
    raise exception 'ninguem exclui a propria conta'
      using errcode = '42501', hint = 'conta_propria';
  end if;

  -- ⚠️ O CHAO DE UM ADMIN ATIVO (`FR-042`). Excluir tira da lista de admins tanto quanto
  --    rebaixar ou desativar — e aqui sem volta.
  -- ⚠️ **SO CONTA ADMIN COM CREDENCIAL, DOS DOIS LADOS DA REGRA** *(emenda de 03/10/2026, pedida
  --    por Bernardo Villas Boas: "conte apenas admins ATIVOS COM CREDENCIAL")*. Vale como
  --    PROTEGIDO — `and v_auth_alvo is not null` — e como PROTETOR — `u.auth_user_id is not null`.
  -- ⚠️ **O CASO E REAL E ESTAVA NO REMOTO:** medido em 03/10/2026, so por leitura, duas das cinco
  --    contas sao `admin`/`ativo` SEM credencial nenhuma, vindas do ETL. Com elas na contagem, o
  --    banco acreditava ter TRES Administradores quando UM conseguia entrar — e esta guarda
  --    LIBERAVA excluir justamente esse um, sem sobrar ninguem capaz de desfazer.
  if v_perfil = 'admin' and v_status = 'ativo' and v_auth_alvo is not null then
    select count(*) into v_admins
      from public.usuarios u
     where u.perfil = 'admin' and u.status = 'ativo' and u.excluida_em is null
       and u.auth_user_id is not null
       and u.id <> p_conta_id;
    if v_admins = 0 then
      raise exception 'o sistema precisa de pelo menos um Administrador ativo com acesso'
        using errcode = '42501', hint = 'ultimo_admin';
    end if;
  end if;

  -- O rastro ANTES de a linha mudar: depois da anonimizacao o codigo ainda existe, mas depois
  -- do apagamento nao — e o rastro precisa do codigo legivel nos dois caminhos.
  perform public.registrar_acao_em_conta(p_conta_id, 'excluir', v_codigo);

  select exists (select 1 from public.dependentes_da_conta(p_conta_id)) into v_tem;

  -- Os vinculos de curso saem nos DOIS caminhos: eles sao configuracao da conta, nao
  -- historico. A FK `usuario_curso.usuario_id` e `restrict`, entao sem isto o apagamento falha.
  delete from public.usuario_curso where usuario_id = p_conta_id;

  if v_tem then
    update public.usuarios
       set nome           = 'Conta excluída',
           nome_exibicao  = 'Conta excluída',
           email          = 'excluida-' || replace(p_conta_id::text, '-', '') || '@ciaara11.invalid',
           avatar_caminho = null,
           auth_user_id   = null,
           status         = 'inativo',
           excluida_em    = now()
     where id = p_conta_id;
    v_caminho := 'anonimizada';
  else
    delete from public.usuarios where id = p_conta_id;
    v_caminho := 'apagada';
  end if;

  return v_caminho;
end;
$$;


-- ⚠️ `create or replace function` PRESERVA privilegio, e o revoke/grant fica repetido de
--    proposito: ele e a declaracao de quem alcanca a funcao, e migration que o omite ensina a
--    omitir — como a nota do Epico 3 sobre view nova que nasce com DELETE para `authenticated`.
revoke all on function public.excluir_conta(uuid) from public, anon;
grant execute on function public.excluir_conta(uuid) to authenticated;

-- ⚠️ O GATILHO NAO LEVA `grant execute`: funcao de gatilho nao exige EXECUTE de quem grava, e por
--    isso ela leva o revoke (gotcha 5.1 do `CLAUDE.md`).
revoke all on function app.impedir_remocao_do_ultimo_admin() from public, anon, authenticated;
