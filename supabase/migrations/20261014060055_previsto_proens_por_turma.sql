-- =================================================================================
-- Spec 014, PR 1.1 · migration E-3 — o previsto do PROENS por turma, com trilha imutável
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-008 a FR-008.2, SC-018, SC-019, R-10; data-model §2.7 e §2.8):
--   1. `previstos_proens_turma`: o previsto de AEC, TAD e TR por turma (dado, nunca constante —
--      regra 8). Índice único PARCIAL `previsto_unico` (inativar e recriar o mesmo par).
--   2. `previstos_proens_alteracoes`: a trilha (antes, depois, autor, instante), SÓ DE ACRÉSCIMO,
--      alimentada por gatilho AFTER no previsto e protegida por gatilho de comando que recusa UPDATE,
--      DELETE e TRUNCATE inclusive para a `service_role` (o padrão de `auditoria_de_conta`).
--   3. O recurso `previsto_proens.editar` na matriz: Admin, Encarregado e Ajudante `true`; os demais
--      `false`. ⚠️ O Ajudante é o caso que discrimina (DoD 8): medido na matriz do banco local em
--      14/10/2026 (medicoes/e3-matriz.md), `calendario.criar`/`editar` só existem para `admin` e
--      `encarregado_administracao_academica` — quem escrevia em `reservas_proens`. O Ajudante passa a
--      gravar o previsto sem ganhar nada do calendário.
--   4. `vw_conformidade_tetos` REESCRITA, uma linha por turma e categoria, SÓ COM NÚMEROS CRUS:
--      `cumprido`, `previsto`, `limite_declarado`, `ch_curricular`, `percentual_norma`. O limite, a
--      origem e o alerta são decididos em `limiteMaximo()`/`tetosDaTurma()` (ponto único; uma segunda
--      implementação em SQL divergiria). Não tem consumidor no código (varredura de 14/10/2026).
--   5. `reservas_proens` passa a SÓ LEITURA: policies de escrita retiradas e privilégio revogado. A
--      tabela fica, aposentada (o dado é transportado para as turmas pela D-3; nada é apagado).
--
-- Reversão (reversao-pr1-1.sql): a view anterior; as policies de escrita de `reservas_proens` de volta;
-- no remoto, o previsto `inativo` com evento (as tabelas ficam); `drop` só na base descartável.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o previsto por turma
create table public.previstos_proens_turma (
  id                 uuid primary key default gen_random_uuid(),
  turma_id           uuid not null references public.turmas(id) on delete restrict,
  categoria          public.categoria_normativa not null check (categoria in ('AEC', 'TAD', 'TR')),
  tempos_previstos   integer not null check (tempos_previstos >= 0),
  origem_proens      text,
  status             public.status_registro not null default 'ativo',
  origem_migracao_v1 text,
  criado_por         uuid,
  criado_em          timestamptz not null default now(),
  editado_por        uuid,
  editado_em         timestamptz
);

comment on table public.previstos_proens_turma is
  'Spec 014, FR-008: o PREVISTO de AEC, TAD e TR que o PROENS dá a cada turma, em TA. Dado editável '
  '(Admin, Encarregado e Ajudante — `previsto_proens.editar`), nunca constante (regra 8). Toda gravação '
  'deixa linha em `previstos_proens_alteracoes`. Substitui `reservas_proens`, que era por curso.';

create unique index previsto_unico on public.previstos_proens_turma (turma_id, categoria) where status = 'ativo';
create index previstos_proens_turma_turma_idx on public.previstos_proens_turma (turma_id);

create trigger trg_previstos_proens_turma_auditoria before insert or update on public.previstos_proens_turma
  for each row execute function app.set_auditoria();

alter table public.previstos_proens_turma enable row level security;

create policy previstos_proens_turma_ler on public.previstos_proens_turma
  for select to authenticated
  using (app.usuario_atual() is not null and app.alcanca_turma(turma_id));
create policy previstos_proens_turma_criar on public.previstos_proens_turma
  for insert to authenticated
  with check (coalesce(app.pode('previsto_proens', 'editar'), false) and app.alcanca_turma(turma_id)
              and app.turma_em_oferta(turma_id));
create policy previstos_proens_turma_editar on public.previstos_proens_turma
  for update to authenticated
  using (coalesce(app.pode('previsto_proens', 'editar'), false) and app.alcanca_turma(turma_id)
         and app.turma_em_oferta(turma_id))
  with check (coalesce(app.pode('previsto_proens', 'editar'), false) and app.alcanca_turma(turma_id)
              and app.turma_em_oferta(turma_id));

revoke delete, truncate on public.previstos_proens_turma from authenticated, anon;

-- ---------------------------------------------------------------- 2. a trilha, só de acréscimo
create table public.previstos_proens_alteracoes (
  id            uuid primary key default gen_random_uuid(),
  previsto_id   uuid not null,
  turma_id      uuid not null,
  categoria     public.categoria_normativa not null,
  tempos_antes  integer,
  tempos_depois integer not null,
  autor_id      uuid,
  registrado_em timestamptz not null default now()
);

comment on table public.previstos_proens_alteracoes is
  'Spec 014, FR-008.2: a trilha do previsto do PROENS — antes, depois, quem (`auth.uid()`) e quando. '
  'Só de acréscimo: UPDATE, DELETE e TRUNCATE recusados por gatilho de comando, inclusive para a '
  'service_role. Escrita só pelo gatilho `app.registrar_alteracao_do_previsto` (SECURITY DEFINER). '
  '⚠️ `previsto_id` e `turma_id` NÃO são FK, como `auditoria_de_conta.conta_alvo_id`: o rastro imutável '
  'não pode impedir que a linha que ele descreve deixe de existir (uma turma de amostra apagada pela '
  'suíte, por exemplo); por isso a turma e a categoria vêm copiadas.';

create index previstos_proens_alteracoes_previsto_idx on public.previstos_proens_alteracoes (previsto_id);

alter table public.previstos_proens_alteracoes enable row level security;

create policy previstos_proens_alteracoes_ler on public.previstos_proens_alteracoes
  for select to authenticated
  using (app.usuario_atual() is not null and app.alcanca_turma(turma_id));

revoke insert, update, delete, truncate on public.previstos_proens_alteracoes from authenticated, anon;

create or replace function app.registrar_alteracao_do_previsto()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.tempos_previstos is not distinct from old.tempos_previstos
     and new.status is not distinct from old.status then
    return null;   -- gravação sem mudança de valor não é alteração
  end if;
  insert into public.previstos_proens_alteracoes (previsto_id, turma_id, categoria, tempos_antes, tempos_depois, autor_id)
  values (new.id, new.turma_id, new.categoria, case when tg_op = 'UPDATE' then old.tempos_previstos end,
          new.tempos_previstos, auth.uid());
  return null;
end;
$$;

comment on function app.registrar_alteracao_do_previsto() is
  'Alimenta `previstos_proens_alteracoes` a cada INSERT e a cada UPDATE que muda o valor ou o status '
  'do previsto. SECURITY DEFINER: a trilha não tem policy de escrita.';

revoke all on function app.registrar_alteracao_do_previsto() from public, anon, authenticated;

create trigger trg_previstos_proens_trilha after insert or update on public.previstos_proens_turma
  for each row execute function app.registrar_alteracao_do_previsto();

create or replace function app.previstos_proens_alteracoes_imutavel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'A trilha do previsto do PROENS é só de acréscimo: % não é permitido.', tg_op
    using errcode = '42501',
          hint = 'trilha_do_previsto_imutavel',
          detail = 'Corrigir o previsto é gravar valor novo, que deixa linha nova na trilha (regra 5).';
end;
$$;

revoke all on function app.previstos_proens_alteracoes_imutavel() from public, anon, authenticated;

create trigger trg_previstos_proens_alteracoes_imutavel
  before update or delete on public.previstos_proens_alteracoes
  for each statement execute function app.previstos_proens_alteracoes_imutavel();
create trigger trg_previstos_proens_alteracoes_sem_truncate
  before truncate on public.previstos_proens_alteracoes
  for each statement execute function app.previstos_proens_alteracoes_imutavel();

-- ---------------------------------------------------------------- 3. a permissão
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'previsto_proens', 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       'Spec 014, FR-008.1: grava o previsto do PROENS por turma. Admin, Encarregado e Ajudante.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- 4. vw_conformidade_tetos, só números
drop view public.vw_conformidade_tetos;

create view public.vw_conformidade_tetos with (security_invoker = true) as
select v.turma_id,
       v.turma_codigo,
       v.curso_id,
       v.curso_codigo,
       v.nome_curso,
       v.ano_letivo,
       c.categoria,
       case c.categoria when 'AEC' then v.ta_aec when 'TAD' then v.ta_tad else v.ta_tr end as cumprido,
       (select p.tempos_previstos from public.previstos_proens_turma p
         where p.turma_id = v.turma_id and p.categoria::text = c.categoria and p.status = 'ativo') as previsto,
       (select l.tempos from public.limites_curriculo l
         where l.curso_id = v.curso_id and l.categoria::text = c.categoria and l.status = 'ativo') as limite_declarado,
       v.chr_curricular as ch_curricular,
       app.fn_parametro_numerico(c.chave, v.ano_letivo) as percentual_norma
  from public.vw_carga_horaria_turma v
 cross join (values ('AEC', 'teto.aec_percentual_chr'),
                    ('TAD', 'teto.tad_percentual_chr'),
                    ('TR',  'teto.tr_percentual_chr')) as c(categoria, chave);

comment on view public.vw_conformidade_tetos is
  'Spec 014 (PR 1.1): uma linha por turma e categoria (AEC, TAD, TR), SÓ COM NÚMEROS CRUS — cumprido, '
  'previsto do PROENS da turma, limite declarado pelo currículo, CH curricular e percentual da norma. '
  'O limite máximo, a origem e os alertas são decididos em `limiteMaximo()`/`tetosDaTurma()` (ponto '
  'único). Alerta, jamais bloqueio (RN-DEG-02).';

revoke all on public.vw_conformidade_tetos from anon;
revoke insert, update, delete, truncate on public.vw_conformidade_tetos from authenticated;
grant select on public.vw_conformidade_tetos to authenticated;

-- ---------------------------------------------------------------- 5. reservas_proens só de leitura
drop policy reservas_proens_criar on public.reservas_proens;
drop policy reservas_proens_editar on public.reservas_proens;
revoke insert, update, delete, truncate on public.reservas_proens from authenticated, anon;

comment on table public.reservas_proens is
  '[APOSENTADA — v2.1] Spec 014, PR 1.1: as reservas do PROENS por curso foram transportadas para '
  '`previstos_proens_turma` (por turma) e a reserva genérica para `config_parametros` '
  '(`proens.reserva_generica_tad`/`_tr`), pela migration de dado D-3. A tabela fica só de leitura; '
  'nada é apagado (regra 4).';
