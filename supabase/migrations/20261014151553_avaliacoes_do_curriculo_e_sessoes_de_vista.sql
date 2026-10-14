-- =================================================================================
-- Spec 014, PR 4 · migration E-4 — as avaliações do currículo, o ajuste por turma, as sessões de vista,
-- o 2º instrutor e o estado «substituída pela planilha»
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-030, FR-031.3, FR-031.6, FR-031.7, FR-033, FR-039, FR-039.1, FR-040, FR-043, FR-046, FR-047;
-- data-model §3.1 e §3.3 a §3.6):
--   1. `status_avaliacao` ganha `substituida_pela_planilha`, e `avaliacoes.status_anterior`.
--      ⚠️ R-7: valor de enum novo NÃO pode ser usado na mesma transação que o cria — nada neste arquivo o
--      cita fora de texto; quem o usa é a E-5 (e a D-7), em arquivo próprio.
--   2. `avaliacoes_curriculo` (AVC-) — o item de avaliação do currículo, com quantidade e tempo, cada um com a
--      sua origem (currículo, com arquivo e página; arbitrado; sugestão da planilha) — e
--      `avaliacoes_curriculo_turma` — o ajuste por turma, que não altera o do curso.
--   3. `vistas_de_avaliacao` (VST-) — N sessões de vista por avaliação, com quem conduz; o gatilho
--      `app.vista_apos_aplicacao()` recusa sessão anterior à aplicação.
--   4. `avaliacoes`: `avaliacao_curriculo_id` (FK composta com a disciplina), `ues_abordadas`,
--      `outros_instrutores`; `registros_aula.outros_instrutores` (FR-046, o 2º instrutor fora de `observacoes`).
--   5. O recurso `avaliacoes_curriculo_arbitrado.editar` (Admin e Encarregado) e o gatilho
--      `app.proteger_arbitrado()`, porque o Operador e o Ajudante JÁ têm `avaliacoes.editar` e
--      `disciplinas.editar` (T133) — sem o gatilho, a policy deixaria o Operador arbitrar.
--   6. `avaliacoes_planejadas` passa a SÓ LEITURA, histórico da `RN-AVAL-01` (FR-039.1).
--
-- Reversão (reversao-pr4.sql): na base descartável, `drop` das três tabelas e das colunas novas; no remoto,
-- inativação (as tabelas ficam). O valor de enum NÃO se desfaz (PostgreSQL não tem `drop value`) — fica sem uso.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o estado «substituída»
alter type public.status_avaliacao add value if not exists 'substituida_pela_planilha';

alter table public.avaliacoes add column status_anterior public.status_avaliacao;

comment on column public.avaliacoes.status_anterior is
  'Spec 014, FR-047: o status que a avaliação tinha antes de ser substituída pela planilha de controle '
  '(lido do parêntese da marca «[SUBSTITUIDO PELA PLANILHA DE CONTROLE] (status anterior: …)»). Nulo nas demais.';

comment on type public.status_avaliacao is
  'Estado de REGISTRO da avaliação. ⚠️ Desde a spec 014 (R-7), a SITUAÇÃO de execução é CALCULADA na leitura '
  '(`situacaoDaAvaliacao`, espelhada por `app.fn_status_vista`): `pendente` continua sendo o valor gravado por '
  'padrão no registro ativo, e a leitura o ignora. `cancelada` e `substituida_pela_planilha` tiram a avaliação '
  'de toda conta. Migração da v1.0: `Planejada`→pendente.';

-- ---------------------------------------------------------------- 2. sequências AVC- e VST-
create sequence app.avaliacoes_curriculo_codigo_seq as bigint;
select setval('app.avaliacoes_curriculo_codigo_seq', 1, false);

create or replace function app.proximo_codigo_avaliacao_curriculo()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'AVC-' || lpad(nextval('app.avaliacoes_curriculo_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_avaliacao_curriculo() from public, anon;
grant execute on function app.proximo_codigo_avaliacao_curriculo() to authenticated, service_role;

create sequence app.vistas_de_avaliacao_codigo_seq as bigint;
select setval('app.vistas_de_avaliacao_codigo_seq', 1, false);

create or replace function app.proximo_codigo_vista()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'VST-' || lpad(nextval('app.vistas_de_avaliacao_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_vista() from public, anon;
grant execute on function app.proximo_codigo_vista() to authenticated, service_role;

-- ---------------------------------------------------------------- 3. avaliacoes_curriculo
create table public.avaliacoes_curriculo (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_avaliacao_curriculo(),
  disciplina_id       uuid not null references public.disciplinas(id) on delete restrict,
  curso_id            uuid not null references public.cursos(id) on delete restrict,
  ordem               smallint not null check (ordem > 0),
  instrumento_id      uuid not null references public.config_listas(id) on delete restrict,
  numero              smallint not null check (numero > 0),
  unidade_ensino_id   uuid references public.unidades_ensino(id) on delete restrict,
  origem_ue           text check (origem_ue in ('curriculo', 'decisao_ciaara')),
  ue_decidida_em      date,
  ues_abordadas       text,
  ta_aplicacao        smallint check (ta_aplicacao >= 0),
  origem_ta_aplicacao text check (origem_ta_aplicacao in ('curriculo', 'arbitrado', 'sugestao_planilha')),
  ta_vista            smallint check (ta_vista >= 0),
  origem_ta_vista     text check (origem_ta_vista in ('curriculo', 'arbitrado', 'sugestao_planilha')),
  origem_item         text not null check (origem_item in ('curriculo', 'arbitrado')),
  fonte_arquivo       text,
  fonte_pagina        smallint,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,
  constraint avc_disciplina_do_curso foreign key (disciplina_id, curso_id) references public.disciplinas (id, curso_id),
  constraint avc_ue_da_disciplina foreign key (unidade_ensino_id, disciplina_id) references public.unidades_ensino (id, disciplina_id),
  constraint avc_id_disciplina unique (id, disciplina_id),
  constraint avc_fonte_se_curriculo check (origem_item <> 'curriculo' or (fonte_arquivo is not null and fonte_pagina is not null)),
  constraint avc_ta_com_origem check ((ta_aplicacao is null) = (origem_ta_aplicacao is null)
                                       and (ta_vista is null) = (origem_ta_vista is null)),
  -- ⚠️ `is not distinct from`, nunca `=`: com `origem_ue` nula, `=` dá NULL, e CHECK com NULL PASSA.
  constraint avc_origem_ue_coerente check (coalesce(
    (unidade_ensino_id is null and origem_ue is null and ue_decidida_em is null)
    or (unidade_ensino_id is not null and origem_ue is not distinct from 'curriculo' and ue_decidida_em is null)
    or (unidade_ensino_id is not null and origem_ue is not distinct from 'decisao_ciaara' and ue_decidida_em is not null),
    false))
);

comment on table public.avaliacoes_curriculo is
  'Spec 014, FR-030: o item de avaliação do currículo da DEnsM (prova, trabalho ou OD), por disciplina, com '
  'quantidade (uma linha por item) e tempo de aplicação e de vista, cada um com a sua origem. O tempo está '
  'DENTRO da CH da disciplina (D-CUR-1): aula = CH − avaliação (FR-031.10). Item sem UE fica no nível da '
  'disciplina (FR-031.3); a UE nomeada pela Divisão tem `origem_ue = decisao_ciaara` e a data.';
comment on column public.avaliacoes_curriculo.numero is
  'Numeração por INSTRUMENTO dentro da disciplina: o rótulo é «<sigla> <numero>» — PM 1, TG 1 (FR-057).';
comment on column public.avaliacoes_curriculo.ues_abordadas is 'Texto informativo: «UE 1 a 4» (FR-033).';

create unique index avc_numero_unico on public.avaliacoes_curriculo (disciplina_id, instrumento_id, numero)
  where status = 'ativo';
create index avaliacoes_curriculo_disciplina_idx on public.avaliacoes_curriculo (disciplina_id);
create index avaliacoes_curriculo_curso_idx on public.avaliacoes_curriculo (curso_id);

create trigger trg_avaliacoes_curriculo_auditoria before insert or update on public.avaliacoes_curriculo
  for each row execute function app.set_auditoria();

alter table public.avaliacoes_curriculo enable row level security;

create policy avaliacoes_curriculo_ler on public.avaliacoes_curriculo
  for select to authenticated
  using (app.pode('disciplinas', 'ler') and app.alcanca_curso(curso_id));
create policy avaliacoes_curriculo_criar on public.avaliacoes_curriculo
  for insert to authenticated
  with check (coalesce(app.pode('disciplinas', 'editar'), false) and app.alcanca_curso(curso_id)
              and app.curso_em_oferta(curso_id));
create policy avaliacoes_curriculo_editar on public.avaliacoes_curriculo
  for update to authenticated
  using (coalesce(app.pode('disciplinas', 'editar'), false) and app.alcanca_curso(curso_id)
         and app.curso_em_oferta(curso_id))
  with check (coalesce(app.pode('disciplinas', 'editar'), false) and app.alcanca_curso(curso_id)
              and app.curso_em_oferta(curso_id));

revoke delete, truncate on public.avaliacoes_curriculo from authenticated, anon;

-- ---------------------------------------------------------------- 4. o ajuste por turma
create table public.avaliacoes_curriculo_turma (
  id                     uuid primary key default gen_random_uuid(),
  avaliacao_curriculo_id uuid not null references public.avaliacoes_curriculo(id) on delete restrict,
  turma_id               uuid not null references public.turmas(id) on delete restrict,
  ta_aplicacao           smallint check (ta_aplicacao >= 0),
  ta_vista               smallint check (ta_vista >= 0),
  origem                 text not null check (origem in ('arbitrado', 'sugestao_planilha')),
  confirmado_em          timestamptz,
  status                 public.status_registro not null default 'ativo',
  origem_migracao_v1     text,
  criado_por             uuid,
  criado_em              timestamptz not null default now(),
  editado_por            uuid,
  editado_em             timestamptz
);

comment on table public.avaliacoes_curriculo_turma is
  'Spec 014, FR-031.7 e FR-031.8: o ajuste POR TURMA do tempo de um item do currículo (arbitrado), sem alterar '
  'o do curso; ou a sugestão da planilha a confirmar (`confirmado_em` nulo). A sincronização MUST NOT '
  'sobrescrever arbitrado confirmado.';

create unique index avct_unico on public.avaliacoes_curriculo_turma (avaliacao_curriculo_id, turma_id)
  where status = 'ativo';
create index avaliacoes_curriculo_turma_turma_idx on public.avaliacoes_curriculo_turma (turma_id);

create trigger trg_avaliacoes_curriculo_turma_auditoria before insert or update on public.avaliacoes_curriculo_turma
  for each row execute function app.set_auditoria();

alter table public.avaliacoes_curriculo_turma enable row level security;

create policy avaliacoes_curriculo_turma_ler on public.avaliacoes_curriculo_turma
  for select to authenticated
  using (app.pode('avaliacoes', 'ler') and app.alcanca_turma(turma_id));
-- ⚠️ A escrita do ajuste é SEMPRE arbitrado ou sugestão: a policy exige a permissão própria, e o gatilho
--    `app.proteger_arbitrado()` repete a guarda (defesa em profundidade, como em `avaliacoes_curriculo`).
create policy avaliacoes_curriculo_turma_criar on public.avaliacoes_curriculo_turma
  for insert to authenticated
  with check (coalesce(app.pode('avaliacoes_curriculo_arbitrado', 'editar'), false) and app.alcanca_turma(turma_id)
              and app.turma_em_oferta(turma_id));
create policy avaliacoes_curriculo_turma_editar on public.avaliacoes_curriculo_turma
  for update to authenticated
  using (coalesce(app.pode('avaliacoes_curriculo_arbitrado', 'editar'), false) and app.alcanca_turma(turma_id)
         and app.turma_em_oferta(turma_id))
  with check (coalesce(app.pode('avaliacoes_curriculo_arbitrado', 'editar'), false) and app.alcanca_turma(turma_id)
              and app.turma_em_oferta(turma_id));

revoke delete, truncate on public.avaliacoes_curriculo_turma from authenticated, anon;

-- ---------------------------------------------------------------- 5. o arbitrado, protegido por permissão própria
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'avaliacoes_curriculo_arbitrado', 'editar',
       p in ('admin', 'encarregado_administracao_academica'),
       'Spec 014, FR-031.7: arbitrar tempo ou quantidade de avaliação do currículo (curso e turma) e nomear a UE '
       'que o currículo não diz. Admin e Encarregado.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

create or replace function app.proteger_arbitrado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_toca boolean := false;
begin
  -- A carga (ETL, migration, sincronização) roda sem sessão, como dono: não é afetada.
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'avaliacoes_curriculo_turma' then
    v_toca := true;   -- todo ajuste por turma é arbitrado ou sugestão
  elsif tg_op = 'INSERT' then
    v_toca := new.origem_item = 'arbitrado'
              or new.origem_ta_aplicacao in ('arbitrado', 'sugestao_planilha')
              or new.origem_ta_vista in ('arbitrado', 'sugestao_planilha')
              or new.origem_ue = 'decisao_ciaara';
  else
    v_toca := new.origem_item is distinct from old.origem_item
              or (new.ta_aplicacao is distinct from old.ta_aplicacao
                  or new.origem_ta_aplicacao is distinct from old.origem_ta_aplicacao)
              or (new.ta_vista is distinct from old.ta_vista
                  or new.origem_ta_vista is distinct from old.origem_ta_vista)
              or (new.origem_ue = 'decisao_ciaara'
                  and (old.origem_ue is distinct from 'decisao_ciaara'
                       or new.unidade_ensino_id is distinct from old.unidade_ensino_id
                       or new.ue_decidida_em is distinct from old.ue_decidida_em))
              or (old.origem_ue = 'decisao_ciaara' and new.origem_ue is distinct from old.origem_ue);
  end if;

  -- Gotcha 15: `coalesce(…, false) is not true` — a forma que não falha aberto quando `app.pode` devolve nulo.
  if v_toca and coalesce(app.pode('avaliacoes_curriculo_arbitrado', 'editar'), false) is not true then
    raise exception 'Só o Admin e o Encarregado definem o arbitrado ou nomeiam a UE de uma avaliação do currículo.'
      using errcode = '42501', hint = 'arbitrado_sem_permissao';
  end if;
  return new;
end;
$$;

comment on function app.proteger_arbitrado() is
  'Spec 014, FR-031.7 e FR-031.3: recusa com 42501, sem `avaliacoes_curriculo_arbitrado.editar`, criar ou mudar '
  'tempo, quantidade ou origem para arbitrado/sugestão, e nomear (ou mudar) a UE decidida pela Divisão. Deixa '
  'mudar `ues_abordadas` de item de origem currículo. A carga roda sem sessão e não é afetada.';

revoke all on function app.proteger_arbitrado() from public, anon, authenticated;

create trigger trg_avaliacoes_curriculo_arbitrado before insert or update on public.avaliacoes_curriculo
  for each row execute function app.proteger_arbitrado();
create trigger trg_avaliacoes_curriculo_turma_arbitrado before insert or update on public.avaliacoes_curriculo_turma
  for each row execute function app.proteger_arbitrado();

-- ---------------------------------------------------------------- 6. as sessões de vista
create table public.vistas_de_avaliacao (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_vista(),
  avaliacao_id        uuid not null references public.avaliacoes(id) on delete restrict,
  numero              smallint not null check (numero > 0),
  data                date not null,
  ta_inicial          smallint check (ta_inicial is null or ta_inicial between 1 and 12),
  tempos_consumidos   smallint check (tempos_consumidos > 0),
  ta_final            smallint generated always as (ta_inicial + tempos_consumidos - 1) stored,
  local               text,
  conduz_instrutor_id uuid references public.instrutores(id) on delete restrict,
  conduz_nome_externo text,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,
  constraint vst_conduz_exclusivo check (conduz_instrutor_id is null or conduz_nome_externo is null)
);

comment on table public.vistas_de_avaliacao is
  'Spec 014, FR-041 e R-5: as SESSÕES de vista de uma avaliação (N por avaliação), com quem conduz. Toda '
  'leitura de vista lê daqui (E-5). Enquanto houver escritor das colunas antigas de `avaliacoes` (o DSA até o '
  'PR 5.1, a sincronização até o PR 6), a sessão 1 é mantida igual a elas pelo gatilho de espelho da E-5.';

create unique index vst_numero_unico on public.vistas_de_avaliacao (avaliacao_id, numero) where status = 'ativo';
create index vistas_de_avaliacao_avaliacao_idx on public.vistas_de_avaliacao (avaliacao_id);
create index vistas_de_avaliacao_data_idx on public.vistas_de_avaliacao (data);

create trigger trg_vistas_de_avaliacao_auditoria before insert or update on public.vistas_de_avaliacao
  for each row execute function app.set_auditoria();

create or replace function app.vista_apos_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_aplicacao date;
begin
  select a.data_avaliacao into v_aplicacao from public.avaliacoes a where a.id = new.avaliacao_id;
  if new.status = 'ativo' and v_aplicacao is not null and new.data < v_aplicacao then
    raise exception 'A sessão de vista (%) não pode ser antes da aplicação da prova (%).', new.data, v_aplicacao
      using errcode = '23514', hint = 'vista_antes_da_aplicacao';
  end if;
  return new;
end;
$$;

comment on function app.vista_apos_aplicacao() is
  'Spec 014: a sessão de vista não pode ser antes da aplicação (era a CHECK `aval_vista_apos_aplicacao` da '
  'vista única). Gatilho, porque a data da aplicação está em outra tabela.';

revoke all on function app.vista_apos_aplicacao() from public, anon, authenticated;

create trigger trg_vistas_de_avaliacao_apos_aplicacao before insert or update on public.vistas_de_avaliacao
  for each row execute function app.vista_apos_aplicacao();

alter table public.vistas_de_avaliacao enable row level security;

-- As policies seguem as de `avaliacoes`, pelo alcance da turma da avaliação-mãe.
create policy vistas_de_avaliacao_ler on public.vistas_de_avaliacao
  for select to authenticated
  using (app.pode('avaliacoes', 'ler')
         and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and app.alcanca_turma(a.turma_id)));
create policy vistas_de_avaliacao_criar on public.vistas_de_avaliacao
  for insert to authenticated
  with check (coalesce(app.pode('avaliacoes', 'editar'), false)
              and exists (select 1 from public.avaliacoes a
                           where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)));
create policy vistas_de_avaliacao_editar on public.vistas_de_avaliacao
  for update to authenticated
  using (coalesce(app.pode('avaliacoes', 'editar'), false)
         and exists (select 1 from public.avaliacoes a
                      where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)))
  with check (coalesce(app.pode('avaliacoes', 'editar'), false)
              and exists (select 1 from public.avaliacoes a
                           where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)));

revoke delete, truncate on public.vistas_de_avaliacao from authenticated, anon;

-- ---------------------------------------------------------------- 7. avaliacoes e registros_aula
alter table public.avaliacoes
  add column avaliacao_curriculo_id uuid,
  add column ues_abordadas text,
  add column outros_instrutores text[] not null default '{}';

alter table public.avaliacoes
  add constraint avaliacoes_item_da_disciplina foreign key (avaliacao_curriculo_id, disciplina_id)
    references public.avaliacoes_curriculo (id, disciplina_id) on delete restrict;

create index avaliacoes_item_idx on public.avaliacoes (avaliacao_curriculo_id) where avaliacao_curriculo_id is not null;

comment on column public.avaliacoes.avaliacao_curriculo_id is
  'Spec 014, FR-039: o item do currículo que esta avaliação aplica — vínculo EXPLÍCITO, da mesma disciplina '
  '(FK composta). Nulo no histórico da v2.0, que continua casado por nome com `avaliacoes_planejadas` '
  '(RN-AVAL-01, FR-039.1).';
comment on column public.avaliacoes.ues_abordadas is 'Spec 014, FR-033: as UEs que a avaliação cobre (texto).';
comment on column public.avaliacoes.outros_instrutores is
  'Spec 014, FR-046: os demais instrutores (códigos), fora de `observacoes`.';

alter table public.registros_aula add column outros_instrutores text[] not null default '{}';

comment on column public.registros_aula.outros_instrutores is
  'Spec 014, FR-046 e Q-10: o 2º instrutor (e os demais), por código — antes vivia como texto em `observacoes` '
  '(«Demais instrutores: …»), movido pela D-8.';

-- ---------------------------------------------------------------- 8. avaliacoes_planejadas só de leitura
drop policy avaliacoes_planejadas_criar on public.avaliacoes_planejadas;
drop policy avaliacoes_planejadas_editar on public.avaliacoes_planejadas;
revoke insert, update, delete, truncate on public.avaliacoes_planejadas from authenticated, anon;

comment on table public.avaliacoes_planejadas is
  '[APOSENTADA — v2.1] Spec 014, FR-039.1: o catálogo de avaliações planejadas da v2.0 fica SÓ DE LEITURA, '
  'como histórico da RN-AVAL-01 (casamento por nome normalizado, NÃO por FK). O previsto vivo é '
  '`avaliacoes_curriculo`. Nada é apagado (regra 4).';
