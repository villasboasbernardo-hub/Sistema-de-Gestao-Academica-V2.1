-- =================================================================================
-- Spec 023 · Bloco 8 — M1: o TIPO e a ABRANGÊNCIA das linhas do calendário
-- Data local: 22/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas, 22/10/2026 (/corrigir): *"Atividades ganha a seção CALENDÁRIO (...) cadastrar e
-- editar em diálogo (abrangência: todas as turmas ou turmas escolhidas) (...) Feriado e licença distinguíveis; coluna
-- nova (tipo), se precisar, só acrescenta."*
--
-- ⚠️ SÓ ACRESCENTA (regra 9.4, emenda de 19/10/2026): uma coluna nulável, uma tabela nova, uma sequência, duas funções
--    novas e um gatilho na coluna nova. Nenhuma linha existente muda; nenhuma policy existente muda.
--   1. `feriados.tipo_parada_id` → `config_listas` (lista `tipos_parada`: FR, LA, LP, RC, PF), D-1. Nulo nas linhas
--      antigas (D-2): a tela lê a sigla do nome, a mesma leitura que `vw_dias_parados_turma` já faz.
--   2. `feriado_turma`: as TURMAS ESCOLHIDAS de uma linha (D-3). Sem ligação ativa, a linha vale para todas as turmas —
--      o comportamento de hoje e o de todo dado existente.
--
-- Reversão: `specs/023-bloco-8-calendario/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o tipo da linha
alter table public.feriados
  add column tipo_parada_id uuid references public.config_listas (id) on delete restrict;
comment on column public.feriados.tipo_parada_id is
  'Bloco 8 (spec 023, D-1): o tipo da linha do calendário — FR, LA, LP, RC ou PF, da lista `tipos_parada` (a mesma do '
  '«Parar dia»). Nulo nas linhas anteriores ao Bloco 8: a tela lê a sigla do início do nome («FR — …»).';
create index idx_feriados_tipo_parada on public.feriados (tipo_parada_id) where tipo_parada_id is not null;

-- A FK não confere a LISTA: o gatilho recusa um id de outra lista de `config_listas`.
create or replace function app.conferir_tipo_do_feriado()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.tipo_parada_id is not null and not exists (
    select 1 from public.config_listas
     where id = new.tipo_parada_id and lista = 'tipos_parada'
  ) then
    raise exception 'tipo_do_calendario_invalido'
      using errcode = '23514',
            hint = 'O tipo da linha do calendário vem da lista de tipos de parada (FR, LA, LP, RC, PF).';
  end if;
  return new;
end;
$$;
revoke all on function app.conferir_tipo_do_feriado() from public, anon, authenticated;

create trigger trg_feriados_tipo
  before insert or update of tipo_parada_id on public.feriados
  for each row execute function app.conferir_tipo_do_feriado();

-- ---------------------------------------------------------------- 2. as turmas escolhidas
create sequence app.feriado_turma_codigo_seq as bigint;

create or replace function app.proximo_codigo_feriado_turma()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'FTU-' || lpad(nextval('app.feriado_turma_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_feriado_turma() from public, anon;
-- Gotcha 5.1: o DEFAULT roda com os direitos de quem insere.
grant execute on function app.proximo_codigo_feriado_turma() to authenticated, service_role;

create table public.feriado_turma (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_feriado_turma(),
  feriado_id          uuid not null references public.feriados (id) on delete restrict,
  turma_id            uuid not null references public.turmas (id)   on delete restrict,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  -- Tirar a turma e devolvê-la é trocar o status desta linha, nunca uma segunda linha.
  constraint feriado_turma_par_unico unique (feriado_id, turma_id)
);

comment on table public.feriado_turma is
  'Bloco 8 (spec 023, D-3): as turmas escolhidas de uma linha do calendário. Linha de `feriados` SEM ligação ativa vale '
  'para TODAS as turmas; com ligação ativa, só para elas — no bloqueio de aula (RN-EVT-04), no DSA e na capacidade '
  '(RN-EVT-02). Nada é apagado: tirar a turma é status = inativo.';

alter table public.feriado_turma enable row level security;

create trigger trg_feriado_turma_auditoria
  before insert or update on public.feriado_turma
  for each row execute function app.set_auditoria();

create index idx_feriado_turma_feriado on public.feriado_turma (feriado_id) where status = 'ativo';
create index idx_feriado_turma_turma   on public.feriado_turma (turma_id)   where status = 'ativo';

-- A mesma régua de `feriados`: leitura ampla (a grade e o saldo dependem dela), escrita do calendário.
create policy feriado_turma_ler on public.feriado_turma
  for select to authenticated using (app.usuario_atual() is not null);
create policy feriado_turma_criar on public.feriado_turma
  for insert to authenticated with check (coalesce(app.pode('calendario', 'criar'), false));
create policy feriado_turma_editar on public.feriado_turma
  for update to authenticated
  using      (coalesce(app.pode('calendario', 'editar'), false))
  with check (coalesce(app.pode('calendario', 'editar'), false));

revoke all on public.feriado_turma from anon;
revoke delete, truncate on public.feriado_turma from authenticated;
