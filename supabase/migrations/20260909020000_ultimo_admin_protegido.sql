-- =================================================================================
-- O último Admin não se desativa, e não se rebaixa
--
-- O QUE  : gatilho que recusa `UPDATE` em `public.usuarios` que deixaria o sistema sem
--          nenhum Admin ativo.
--
-- PARA QUE: sem Admin ativo, ninguem convida, ninguem corrige perfil, ninguem reativa conta —
--          **inclusive ninguem desfaz o engano que produziu o estado**. E a unica operacao
--          desta fatia cujo dano nao tem caminho de volta pela propria aplicacao: exigiria
--          alguem com acesso direto ao banco.
--
-- ⚠️ POR QUE GATILHO, E NAO POLICY. Policy nao enxerga `OLD` nem `NEW` — ela avalia a linha
--    inteira e nao sabe o que MUDOU. "Este `UPDATE` esta tirando o ultimo Admin?" e uma
--    pergunta sobre a mudanca, nao sobre a linha. E o mesmo motivo pelo qual
--    `app.impedir_autoescalonamento` e gatilho (documento 22 §6.3).
--
-- ⚠️ POR QUE NAO BASTA CONFERIR NA SERVER ACTION. A conferencia que so existe na aplicacao e
--    contornavel por quem chamar a interface de dados diretamente — e a interface de dados do
--    Supabase e publica por desenho. A da aplicacao existe para dar mensagem legivel ANTES; a
--    do banco existe para que a mensagem legivel nao seja a unica coisa entre o sistema e o
--    estado sem volta.
--
-- FR-016 · decisao de 08/09/2026.
-- =================================================================================

create or replace function app.impedir_remocao_do_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admins_restantes integer;
begin
  -- Só interessa a mudança que TIRA alguém do posto de Admin ativo. Entrar não é problema.
  if not (old.perfil = 'admin' and old.status = 'ativo') then
    return new;
  end if;
  if new.perfil = 'admin' and new.status = 'ativo' then
    return new;
  end if;

  select count(*)
    into v_admins_restantes
    from public.usuarios u
   where u.perfil = 'admin'
     and u.status = 'ativo'
     and u.id <> old.id;

  if v_admins_restantes = 0 then
    raise exception
      'Esta e a ultima conta Admin ativa. Desativa-la ou rebaixa-la deixaria o sistema sem '
      'ninguem capaz de convidar, corrigir perfil ou reativar conta — inclusive sem ninguem '
      'capaz de desfazer esta operacao. Promova outro Admin antes (FR-016).'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function app.impedir_remocao_do_ultimo_admin() is
  'Recusa o UPDATE que deixaria o sistema sem Admin ativo. E gatilho, e nao policy, porque '
  'policy nao enxerga OLD/NEW: a pergunta e sobre o que MUDOU, nao sobre a linha. Mesmo motivo '
  'de app.impedir_autoescalonamento (documento 22 §6.3). FR-016.';

create trigger trg_usuarios_ultimo_admin
  before update on public.usuarios
  for each row
  execute function app.impedir_remocao_do_ultimo_admin();

-- =================================================================================
-- ⚠️ O QUE ESTE GATILHO **NAO** FAZ, e e deliberado:
--
--   · Nao impede `DELETE` — porque `DELETE` ja e impossivel em toda tabela deste sistema
--     (nenhuma policy `FOR DELETE`, e o privilegio revogado). Duas camadas ja cobrem isso.
--   · Nao roda no `INSERT` — criar Admin nunca reduz a contagem.
--   · Nao dispensa a conferencia na Server Action. Ela continua existindo para dar mensagem
--     legivel antes de o banco recusar; esta aqui existe para que a legivel nao seja a unica.
--
-- PLANO DE REVERSAO
--   drop trigger if exists trg_usuarios_ultimo_admin on public.usuarios;
--   drop function if exists app.impedir_remocao_do_ultimo_admin();
--
-- ⚠️ Reverter devolve ao sistema a capacidade de ficar sem Admin — estado do qual so se sai
--    com acesso direto ao banco.
-- =================================================================================
