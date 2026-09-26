-- =================================================================================
-- M2 da fatia (b) do Epico 5 — a EXCLUSAO PERMANENTE de disciplina e de unidade de
-- ensino, com porteiro no banco e RASTRO de quem, o que e quando.
--
-- ORIGEM : decisao D-B1 de Bernardo Villas Boas, 24/09/2026 — "desativar, reativar E
--          excluir permanentemente; confirmacao + alerta; exclusao so sem historico nem
--          dependente; a recusa chega como 'este registro tem historico — desative em vez
--          de excluir'; rastro de quem, o que e quando; a spec MUST dizer como o DELETE
--          chega ao banco e sob qual permissao". `FR-020` a `FR-024` da spec 010; Q-09 e
--          P-3 (a tabela de rastro, e quem a le).
--
-- ⚠️ A REGRA 4 DO `CLAUDE.md` FOI EMENDADA POR ISTO, em 24/09/2026, e a emenda esta la:
--    a excecao a "nada e apagado" passa a cobrir TRES tabelas — `instrutores` (15/09/2026),
--    `disciplinas` e `unidades_ensino` —, sempre delimitada a registro SEM HISTORICO
--    NENHUM, sempre por RPC com porteiro, e agora tambem com rastro. NENHUMA outra tabela
--    ganha excecao, e continua havendo ZERO policy e ZERO privilegio de DELETE.
--
-- ⚠️ O MOLDE E `20260915140100_exclusao_de_instrutor_sem_historico.sql`, deliberadamente:
--    par de funcoes `app.*` DEFINER + espelho `public.*` INVOKER, porteiro por
--    `app.pode(...)`, confirmacao pelo codigo, `23503` com a lista de impedimentos.
--    O que muda e o RASTRO, que a de instrutor nao tem — harmoniza-la e PEND-5b-1.
--
-- ⚠️ MEDIDO EM 24/09/2026, e por isso esta migration nao abre porta nenhuma: das 175
--    disciplinas reais, ZERO sao excluiveis — toda uma tem ao menos linha de
--    `turma_disciplina`. A excecao existe para o cadastro criado por engano, que ainda
--    nao tem historico a proteger.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop function if exists public.excluir_disciplina(uuid, text);
--    drop function if exists public.excluir_unidade_ensino(uuid, text);
--    drop function if exists public.impedimentos_de_exclusao_da_disciplina(uuid);
--    drop function if exists public.impedimentos_de_exclusao_da_unidade_ensino(uuid);
--    drop function if exists app.excluir_disciplina(uuid, text);
--    drop function if exists app.excluir_unidade_ensino(uuid, text);
--    drop function if exists app.impedimentos_de_exclusao_da_disciplina(uuid);
--    drop function if exists app.impedimentos_de_exclusao_da_unidade_ensino(uuid);
--    drop trigger  if exists trg_exclusoes_imutaveis on public.exclusoes_registradas;
--    drop trigger  if exists trg_exclusoes_sem_truncate on public.exclusoes_registradas;
--    drop function if exists app.exclusoes_registradas_imutaveis();
--    ⚠️ `drop table public.exclusoes_registradas` SO se ela estiver VAZIA. Com linha, a
--       tabela FICA: ela e o rastro de uma exclusao que ja aconteceu, e apagar rastro e
--       exatamente o que a regra 4 existe para impedir.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a tabela de rastro, so de acrescimo
-- ---------------------------------------------------------------------------------
create table if not exists public.exclusoes_registradas (
  id               uuid primary key default gen_random_uuid(),
  tabela           text        not null,
  registro_id      uuid        not null,
  registro_codigo  text        not null,
  retrato          jsonb       not null,
  excluido_por     uuid        not null,
  excluido_em      timestamptz not null default now(),

  constraint exclusoes_tabela_permitida
    check (tabela in ('instrutores', 'disciplinas', 'unidades_ensino')),
  constraint exclusoes_codigo_nao_vazio
    check (btrim(registro_codigo) <> ''),
  constraint exclusoes_retrato_objeto
    check (jsonb_typeof(retrato) = 'object')
);

comment on table public.exclusoes_registradas is
  'Rastro das exclusoes permanentes autorizadas pela excecao da regra 4 (D-B1, Bernardo '
  'Villas Boas, 24/09/2026): quem, o que e quando. SO DE ACRESCIMO — UPDATE, DELETE e '
  'TRUNCATE sao recusados por gatilho, INCLUSIVE para a service_role. Escrita apenas de '
  'dentro de `app.excluir_*` (SECURITY DEFINER); nenhuma policy de escrita. Leitura por '
  'quem tem `auditoria.ler` (P-3, 25/09/2026).';

comment on column public.exclusoes_registradas.tabela is
  'A lista e a da regra 4 emendada, e o CHECK e o que impede a tabela de virar deposito '
  'de exclusao de qualquer coisa.';
comment on column public.exclusoes_registradas.registro_id is
  'O `id` apagado. NAO e FK — a linha ja nao existe, e uma FK aqui tornaria o rastro '
  'impossivel de gravar.';
comment on column public.exclusoes_registradas.retrato is
  '`to_jsonb(linha)` tirado ANTES do DELETE. E o que permite reconstituir o que foi '
  'apagado sem depender da memoria de ninguem.';
comment on column public.exclusoes_registradas.excluido_por is
  '`auth.uid()` lido DENTRO da funcao DEFINER — nunca um valor mandado pelo cliente. '
  'Mesma razao pela qual `set_auditoria()` ignora `criado_por` vindo de fora.';

-- ⚠️ SEM `origem_migracao_v1` e SEM o quarteto de auditoria: esta tabela nao e migrada, e
--    `excluido_por`/`excluido_em` SAO a auditoria dela. `editado_por`/`editado_em` nao
--    fariam sentido numa linha que, por construcao, nunca muda. Desvio de convencao
--    declarado no `data-model.md` §1.

create index if not exists ix_exclusoes_tabela_data
  on public.exclusoes_registradas (tabela, excluido_em desc);

alter table public.exclusoes_registradas enable row level security;

-- Leitura por quem tem `auditoria.ler` — P-3. Nenhuma policy de escrita: quem grava e a
-- funcao DEFINER, que nao passa pela RLS.
drop policy if exists exclusoes_registradas_ler on public.exclusoes_registradas;
create policy exclusoes_registradas_ler
  on public.exclusoes_registradas
  for select
  using (app.pode('auditoria', 'ler'));

-- ⚠️ O `revoke` nao e redundante com a RLS: RLS e filtro sobre privilegio que ja existe.
--    Sem isto, `authenticated` teria INSERT/UPDATE/DELETE/TRUNCATE concedidos por padrao
--    pelo Supabase, e a RLS so filtraria as linhas (gotcha 3 e achado 1 do Epico 1).
revoke insert, update, delete, truncate on public.exclusoes_registradas from authenticated, anon;

-- ---------------------------------------------------------------------------------
-- PARTE B — a imutabilidade, INCLUSIVE para a service_role
--
-- ⚠️ DOIS gatilhos, e o de TRUNCATE e deliberado: TRUNCATE nao dispara gatilho de linha,
--    e a `service_role` TEM o privilegio — foi exatamente assim que a lacuna do
--    `migracao_log` (PEND-5a-3) passou despercebida. O molde e
--    `curso_sigla_historico`, da fatia (a).
-- ---------------------------------------------------------------------------------
create or replace function app.exclusoes_registradas_imutaveis()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'exclusoes_registradas e so de acrescimo: % nao e permitido', tg_op
    using errcode = '42501',
          hint = 'rastro_imutavel',
          detail = 'Corrigir um rastro e registrar evento novo, nunca reescrever o antigo '
                   '(Principio IV, regra 5 do CLAUDE.md).';
end;
$$;

comment on function app.exclusoes_registradas_imutaveis() is
  'Recusa UPDATE, DELETE e TRUNCATE em `exclusoes_registradas`. Gatilho de STATEMENT: '
  'pega tambem quem tem privilegio, a service_role inclusive.';

revoke all on function app.exclusoes_registradas_imutaveis() from public, anon, authenticated;

drop trigger if exists trg_exclusoes_imutaveis on public.exclusoes_registradas;
create trigger trg_exclusoes_imutaveis
  before update or delete on public.exclusoes_registradas
  for each statement execute function app.exclusoes_registradas_imutaveis();

drop trigger if exists trg_exclusoes_sem_truncate on public.exclusoes_registradas;
create trigger trg_exclusoes_sem_truncate
  before truncate on public.exclusoes_registradas
  for each statement execute function app.exclusoes_registradas_imutaveis();

-- ---------------------------------------------------------------------------------
-- PARTE C — os impedimentos da DISCIPLINA
--
-- ⚠️ `aula_lancada` e conferida por DOIS caminhos, e o segundo nao e FK: a aula alcanca a
--    disciplina por `unidades_ensino` (grao de UE, decisao UE-1) E por
--    `registros_aula.disciplina_codigo_legado_v1`, que guarda o `ID_Grade` da v2.0
--    verbatim. Medido em 24/09/2026: 1.566 de 1.566 aulas casam por esse texto e ZERO por
--    UE (a tabela ainda esta vazia). Sem a segunda conferencia, uma disciplina com 100
--    aulas historicas seria excluivel — e a FK nao seguraria, porque nao ha FK.
-- ---------------------------------------------------------------------------------
create or replace function app.impedimentos_de_exclusao_da_disciplina(p_disciplina_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_curso_id     uuid;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de disciplina restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select d.codigo, d.curso_id into v_codigo, v_curso_id
    from public.disciplinas d where d.id = p_disciplina_id;
  if not found then
    raise exception 'disciplina inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'disciplina fora do escopo' using errcode = '42501';
  end if;

  if exists (select 1 from public.turma_disciplina t where t.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'linha_de_turma');
  end if;

  if exists (select 1 from public.instrutor_disciplina v where v.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'vinculo_de_habilitacao');
  end if;

  if exists (select 1 from public.avaliacoes a where a.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao');
  end if;

  if exists (select 1 from public.planejamento_anual p where p.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'planejamento');
  end if;

  if exists (select 1 from public.unidades_ensino u where u.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'unidade_de_ensino');
  end if;

  if exists (select 1
               from public.registros_aula r
               join public.unidades_ensino u on u.id = r.unidade_ensino_id
              where u.disciplina_id = p_disciplina_id)
     or exists (select 1 from public.registros_aula r
                 where r.disciplina_codigo_legado_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_disciplina(uuid) is
  'O que prende a disciplina. Vazio = registro sem historico. Porteiro: '
  '`app.pode(disciplinas, criar)` + alcance do curso (FR-021). ⚠️ `aula_lancada` olha '
  'TAMBEM `registros_aula.disciplina_codigo_legado_v1`, que nao e FK — sem isso a '
  'disciplina com aula historica seria excluivel (achado A-11 da spec 010).';

revoke all on function app.impedimentos_de_exclusao_da_disciplina(uuid) from public, anon;
grant execute on function app.impedimentos_de_exclusao_da_disciplina(uuid) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE D — os impedimentos da UNIDADE DE ENSINO
--
-- ⚠️ UE COM AULA NUNCA E EXCLUIDA, SO DESATIVADA — e a armadilha nomeada no pedido da
--    fatia: a UE e o GRAO do fato de execucao desde a decisao UE-1, e apagar uma UE com
--    aula apagaria a referencia do que foi dado.
-- ---------------------------------------------------------------------------------
create or replace function app.impedimentos_de_exclusao_da_unidade_ensino(p_unidade_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curso_id     uuid;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de unidade de ensino restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select u.curso_id into v_curso_id from public.unidades_ensino u where u.id = p_unidade_id;
  if not found then
    raise exception 'unidade de ensino inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'unidade de ensino fora do escopo' using errcode = '42501';
  end if;

  if exists (select 1 from public.registros_aula r where r.unidade_ensino_id = p_unidade_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_unidade_ensino(uuid) is
  'O que prende a UE: aula lancada. UE com aula NUNCA e excluida, so desativada — ela e o '
  'grao do fato de execucao (decisao UE-1, 26/08/2026).';

revoke all on function app.impedimentos_de_exclusao_da_unidade_ensino(uuid) from public, anon;
grant execute on function app.impedimentos_de_exclusao_da_unidade_ensino(uuid) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE E — as exclusoes, com confirmacao pelo codigo e rastro na mesma transacao
-- ---------------------------------------------------------------------------------
create or replace function app.excluir_disciplina(p_disciplina_id uuid, p_codigo_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_curso_id     uuid;
  v_retrato      jsonb;
  v_impedimentos text[];
  v_quem         uuid := auth.uid();
  v_apagadas     integer;
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de disciplina restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select d.codigo, d.curso_id, to_jsonb(d) into v_codigo, v_curso_id, v_retrato
    from public.disciplinas d where d.id = p_disciplina_id;
  if not found then
    raise exception 'disciplina inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'disciplina fora do escopo' using errcode = '42501';
  end if;

  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o da disciplina'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.impedimentos_de_exclusao_da_disciplina(p_disciplina_id);
  if array_length(v_impedimentos, 1) > 0 then
    raise exception 'disciplina_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  -- ⚠️ O rastro vai ANTES do DELETE, na mesma transacao: depois do DELETE o retrato ja
  --    nao existe, e num `rollback` os dois somem juntos — que e o desejado.
  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('disciplinas', p_disciplina_id, v_codigo, v_retrato, v_quem);

  delete from public.disciplinas d where d.id = p_disciplina_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou a disciplina' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_disciplina_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

comment on function app.excluir_disciplina(uuid, text) is
  'Exclusao permanente de disciplina SEM HISTORICO NENHUM — excecao da regra 4 emendada '
  'em 24/09/2026 (D-B1). Exige `app.pode(disciplinas, criar)`, alcance do curso, o codigo '
  'digitado e zero impedimentos; grava o rastro em `exclusoes_registradas` ANTES do '
  'DELETE. Continua sem policy e sem privilegio de DELETE para authenticated.';

revoke all on function app.excluir_disciplina(uuid, text) from public, anon;
grant execute on function app.excluir_disciplina(uuid, text) to authenticated;

create or replace function app.excluir_unidade_ensino(p_unidade_id uuid, p_codigo_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_curso_id     uuid;
  v_retrato      jsonb;
  v_impedimentos text[];
  v_quem         uuid := auth.uid();
  v_apagadas     integer;
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de unidade de ensino restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select u.codigo, u.curso_id, to_jsonb(u) into v_codigo, v_curso_id, v_retrato
    from public.unidades_ensino u where u.id = p_unidade_id;
  if not found then
    raise exception 'unidade de ensino inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'unidade de ensino fora do escopo' using errcode = '42501';
  end if;

  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o da unidade de ensino'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.impedimentos_de_exclusao_da_unidade_ensino(p_unidade_id);
  if array_length(v_impedimentos, 1) > 0 then
    raise exception 'unidade_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('unidades_ensino', p_unidade_id, v_codigo, v_retrato, v_quem);

  delete from public.unidades_ensino u where u.id = p_unidade_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou a unidade de ensino' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_unidade_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

comment on function app.excluir_unidade_ensino(uuid, text) is
  'Exclusao permanente de UE SEM AULA LANCADA (D-B1). UE com aula e desativada, nunca '
  'excluida — ela e o grao do fato de execucao (UE-1).';

revoke all on function app.excluir_unidade_ensino(uuid, text) from public, anon;
grant execute on function app.excluir_unidade_ensino(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE F — os espelhos em `public`, que e o schema que o PostgREST expoe
-- ---------------------------------------------------------------------------------
create or replace function public.impedimentos_de_exclusao_da_disciplina(p_disciplina_id uuid)
returns text[]
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select app.impedimentos_de_exclusao_da_disciplina(p_disciplina_id);
$$;

create or replace function public.impedimentos_de_exclusao_da_unidade_ensino(p_unidade_id uuid)
returns text[]
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select app.impedimentos_de_exclusao_da_unidade_ensino(p_unidade_id);
$$;

create or replace function public.excluir_disciplina(p_disciplina_id uuid, p_codigo_confirmacao text)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select app.excluir_disciplina(p_disciplina_id, p_codigo_confirmacao);
$$;

create or replace function public.excluir_unidade_ensino(p_unidade_id uuid, p_codigo_confirmacao text)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select app.excluir_unidade_ensino(p_unidade_id, p_codigo_confirmacao);
$$;

comment on function public.excluir_disciplina(uuid, text) is
  'Espelho chamavel pelo PostgREST. INVOKER de proposito: quem decide e o porteiro da '
  'funcao DEFINER em `app`, nao este invólucro.';

revoke all on function public.impedimentos_de_exclusao_da_disciplina(uuid) from public, anon;
revoke all on function public.impedimentos_de_exclusao_da_unidade_ensino(uuid) from public, anon;
revoke all on function public.excluir_disciplina(uuid, text) from public, anon;
revoke all on function public.excluir_unidade_ensino(uuid, text) from public, anon;
grant execute on function public.impedimentos_de_exclusao_da_disciplina(uuid) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_da_unidade_ensino(uuid) to authenticated, service_role;
grant execute on function public.excluir_disciplina(uuid, text) to authenticated, service_role;
grant execute on function public.excluir_unidade_ensino(uuid, text) to authenticated, service_role;
