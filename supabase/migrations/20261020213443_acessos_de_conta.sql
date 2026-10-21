-- =================================================================================
-- Spec 020 (Bloco 5), M3 — a contagem de acessos ao sistema.
-- 20/10/2026 (data local do responsavel; o nome do arquivo carrega o carimbo UTC da CLI).
--
-- > "5. CONTAGEM DE ACESSOS: o Admin ve, na lista de usuarios, o numero de acessos e o ultimo acesso
-- > (que ja existe), e um quadro "quem mais acessou / acessos recentes". Tabela nova so de acrescimo,
-- > gravada a cada login bem-sucedido; sem dado alem de conta e instante." — Bernardo Villas Boas,
-- > 20/10/2026 (NOVIDADE autorizada nominalmente, regra 3)
--
-- ⚠️ SO ACRESCENTA (regra 9.4): tabela nova, funcao nova, view nova. Nada existente muda.
-- ⚠️ SO CONTA E INSTANTE: sem IP, sem navegador, sem o quarteto de auditoria e sem `origem_migracao_v1`
--    — o pedido e esse, e e o modelo de `auditoria_de_conta` (20261002195248).
-- ⚠️ SEM `criado_por`, E E ISSO QUE PROTEGE A D-USR-3: `public.dependentes_da_conta` varre TODA coluna
--    `criado_por`/`editado_por` de `public` (20261003000205). Com ela aqui, toda conta que ja entrou
--    teria "dependente" e seria ANONIMIZADA em vez de apagada pela exclusao. O pgTAP 143 guarda.
-- ⚠️ SEM CHAVE ESTRANGEIRA para `usuarios`, como `auditoria_de_conta.conta_alvo_id`: a conta pode ser
--    excluida (D-USR-3), e o acesso dela fica — so de acrescimo —, com nada alem do id e do instante.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a tabela
-- ---------------------------------------------------------------------------------
create table public.acessos_de_conta (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null,
  ocorrido_em timestamptz not null default now()
);

comment on table public.acessos_de_conta is
  'Spec 020 (C-13, C-14): um registro por entrada com senha bem-sucedida — so a conta (usuarios.id) e o '
  'instante. So de acrescimo, imutavel inclusive para a service_role; so o Admin le.';

create index acessos_de_conta_por_conta on public.acessos_de_conta (usuario_id, ocorrido_em desc);
create index acessos_de_conta_recentes on public.acessos_de_conta (ocorrido_em desc);

alter table public.acessos_de_conta enable row level security;

-- ⚠️ `coalesce(..., false)`: `app.eh_admin()` ja nao devolve nulo desde 20261003042704, e a forma
--    fechada fica assim mesmo (gotcha 15).
create policy acessos_de_conta_ler
  on public.acessos_de_conta for select to authenticated
  using (coalesce(app.eh_admin(), false));

revoke all on public.acessos_de_conta from anon;
revoke insert, update, delete, truncate on public.acessos_de_conta from authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE B — a imutabilidade, INCLUSIVE para a service_role (o desenho de `auditoria_de_conta`)
-- ---------------------------------------------------------------------------------
create or replace function app.acessos_de_conta_imutavel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'acessos_de_conta e so de acrescimo: % nao e permitido', tg_op
    using errcode = '42501',
          hint = 'acessos_imutaveis',
          detail = 'O acesso registrado e historico: nao se reescreve nem se apaga (regra 4 do CLAUDE.md).';
end;
$$;

comment on function app.acessos_de_conta_imutavel() is
  'Recusa UPDATE, DELETE e TRUNCATE em `acessos_de_conta`. Gatilho de STATEMENT: pega tambem quem tem '
  'privilegio, a service_role inclusive.';

revoke all on function app.acessos_de_conta_imutavel() from public, anon, authenticated;

create trigger trg_acessos_de_conta_imutavel
  before update or delete on public.acessos_de_conta
  for each statement execute function app.acessos_de_conta_imutavel();

create trigger trg_acessos_de_conta_sem_truncate
  before truncate on public.acessos_de_conta
  for each statement execute function app.acessos_de_conta_imutavel();

-- ---------------------------------------------------------------------------------
-- PARTE C — quem grava: a propria conta, no login (P-5)
--
-- ⚠️ SEM PARAMETRO, e e a ausencia que a autoriza: a conta sai de `auth.uid()`, entao ninguem grava
--    acesso de outra conta (o mesmo desenho de `concluirObrigacaoDeTrocarSenha`).
-- ⚠️ EM `public` porque o PostgREST nao expoe `app` (achado do PR 2 da spec 011).
-- ⚠️ Conta DESATIVADA ou EXCLUIDA nao grava: o filtro e o mesmo de `app.usuario_atual()`.
-- ---------------------------------------------------------------------------------
create or replace function public.registrar_acesso()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_auth uuid := auth.uid();
begin
  if v_auth is null then
    raise exception 'registrar_acesso exige uma sessao'
      using errcode = '42501', hint = 'sem_sessao';
  end if;

  insert into public.acessos_de_conta (usuario_id)
  select u.id
    from public.usuarios u
   where u.auth_user_id = v_auth
     and u.status = 'ativo'
     and u.excluida_em is null;
end;
$$;

comment on function public.registrar_acesso() is
  'Spec 020 (C-13): grava um acesso da conta da sessao. Chamada pela Server Action `registrarAcesso` '
  '(lib/acoes/sessao.ts), depois do carimbo de `ultimo_acesso`.';

revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE D — o resumo por conta (C-15), com a RLS de quem le
-- ---------------------------------------------------------------------------------
create view public.vw_acessos_por_conta with (security_invoker = true) as
select a.usuario_id,
       count(*)::integer  as total,
       max(a.ocorrido_em) as ultimo_em,
       min(a.ocorrido_em) as primeiro_em
  from public.acessos_de_conta a
 group by a.usuario_id;

comment on view public.vw_acessos_por_conta is
  'Spec 020 (C-15): total, primeiro e ultimo acesso por conta. `security_invoker`: so o Admin ve linha.';

revoke all on public.vw_acessos_por_conta from anon;
revoke insert, update, delete, truncate on public.vw_acessos_por_conta from authenticated;
grant select on public.vw_acessos_por_conta to authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop view public.vw_acessos_por_conta;
--   drop function public.registrar_acesso();
--   drop table public.acessos_de_conta;          -- os gatilhos e a policy vao junto
--   drop function app.acessos_de_conta_imutavel();
--
-- ⚠️ Com acessos gravados, a reversao APAGA historico: so com a palavra de Bernardo. A Server Action
--    `registrarAcesso` ja trata a falha da chamada (o login segue).
-- =================================================================================
