-- =================================================================================
-- Spec 026 · Bloco 11 — o REGIME DE TEMPOS DA SEMANA no DSA (RD-3)
-- Data local: 26/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Regra: `docs/correcoes/regras-do-dsa-lancamento.md`, RD-3 — Bernardo Villas Boas, 26/10/2026:
--   «regime de tempos: padrão vem de Editar turma; no DSA, ícone de relógio abre diálogo "Só esta semana" ou "Desta
--    semana em diante" (vira o padrão da turma dali para a frente); semanas salvas ou publicadas NUNCA mudam de regime
--    (o regime fica gravado com a semana ao salvar).»
--
-- Esta migration SÓ ACRESCENTA (regra 9.4, emenda de 19/10/2026): duas tabelas novas, funções novas, nenhuma função,
-- view, policy ou dado existente muda.
--
--   1. `dsa_regime_da_semana`: o regime de UMA semana da turma — escolhido «só esta semana», ou GRAVADO ao salvar. Guarda
--      o regime nomeado e o RETRATO dos valores do relógio dele (TA, duração, intervalos, horas, catálogo): o regime
--      nomeado só trava pela escolha de `Editar turma` (RF-HOR-05), e o retrato é o que impede uma semana salva de mudar
--      quando alguém edita o relógio de um regime que ela usou por aqui. Regime NULO = o do curso na data da semana,
--      que já trava pelas vigências do curso (`app.lancamentos_que_travam_vigencia`) — por isso sem retrato.
--   2. `turma_regime_vigencia`: «desta semana em diante» — o padrão da turma no DSA a partir de uma segunda-feira, pelo
--      maior `vigente_de` <= a segunda da semana (a mesma resolução das vigências). Regime NULO = o do curso.
--   3. A resolução, na ordem: o regime gravado ou «só esta semana» > a vigência «desde» > o de `Editar turma` > o do
--      curso. É a de `lib/dominio/dsa/regime-da-semana.ts` (`regimeDaSemana`), que a leitura usa; aqui ela só serve
--      para GRAVAR o regime de uma semana salva.
--   4. As RPCs, com porteiro (`registros_aula.criar` + alcance; turma não arquivada): «só esta semana» (recusa semana
--      salva), «desde» (grava antes o regime das semanas salvas daquela segunda em diante) e o gravar-ao-salvar.
--
-- ⚠️ SEMANA SALVA (D-11 da spec 026): evento `salvo`/publicação na trilha OU lançamento salvo da turma na semana — o que
--    existe de antes do Bloco 9 nasceu salvo e sem evento, e olhar só o evento deixaria essas semanas sem proteção.
-- ⚠️ SEM `DELETE`, sem policy de escrita: só as funções abaixo gravam. Exclusão lógica (`status`), regra 4.
--
-- Reversão: `specs/026-bloco-11-dsa-lancamento-e-inicio/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. os códigos (gotcha 5.1)
create sequence app.dsa_regime_da_semana_codigo_seq as bigint;
create or replace function app.proximo_codigo_regime_da_semana()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'DRS-' || lpad(nextval('app.dsa_regime_da_semana_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_regime_da_semana() from public, anon;
grant execute on function app.proximo_codigo_regime_da_semana() to authenticated, service_role;

create sequence app.turma_regime_vigencia_codigo_seq as bigint;
create or replace function app.proximo_codigo_turma_regime_vigencia()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'TRV-' || lpad(nextval('app.turma_regime_vigencia_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_turma_regime_vigencia() from public, anon;
grant execute on function app.proximo_codigo_turma_regime_vigencia() to authenticated, service_role;

-- ---------------------------------------------------------------- 2. o regime de uma semana
create table public.dsa_regime_da_semana (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique default app.proximo_codigo_regime_da_semana(),
  turma_id                 uuid not null references public.turmas (id) on delete restrict,
  ano                      smallint not null,
  semana                   smallint not null,
  origem                   text not null,
  regime_de_horario_id     uuid references public.regimes_de_horario (id) on delete restrict,
  -- O RETRATO do relógio do regime nomeado no momento da escolha ou do salvar.
  regime_tempos            smallint,
  ta_duracao_min           smallint,
  intervalo_manha_min      smallint,
  intervalo_tarde_min      smallint,
  hora_inicio_manha        time,
  hora_inicio_tarde        time,
  configuracao_horario_id  uuid references public.configuracoes_horario (id) on delete restrict,
  status                   public.status_registro not null default 'ativo',
  origem_migracao_v1       text,
  criado_por               uuid,
  criado_em                timestamptz not null default now(),
  editado_por              uuid,
  editado_em               timestamptz,

  constraint dsa_regime_semana_valida check (semana between 1 and 53 and ano between 2020 and 2099),
  constraint dsa_regime_origem_valida check (origem in ('so_esta_semana', 'gravado')),
  -- Regime nomeado com o retrato inteiro; regime do curso (nulo) sem retrato nenhum.
  constraint dsa_regime_retrato_do_nomeado check (
    (regime_de_horario_id is null
       and regime_tempos is null and ta_duracao_min is null and intervalo_manha_min is null
       and intervalo_tarde_min is null and hora_inicio_manha is null and hora_inicio_tarde is null
       and configuracao_horario_id is null)
    or
    (regime_de_horario_id is not null
       and regime_tempos between 1 and 12 and ta_duracao_min is not null and intervalo_manha_min is not null
       and intervalo_tarde_min is not null and hora_inicio_manha is not null and hora_inicio_tarde is not null))
);
comment on table public.dsa_regime_da_semana is
  'Bloco 11 (RD-3): o regime de tempos de UMA semana do DSA da turma — escolhido «só esta semana», ou gravado ao '
  'salvar. Regime nulo = o do curso na data da semana; nomeado = com o retrato do relógio dele, para a semana salva '
  'nunca mudar. Uma linha ativa por semana; escrita só pelas RPCs do regime do DSA.';
comment on column public.dsa_regime_da_semana.origem is
  '`so_esta_semana` = a escolha do diálogo do relógio, só para esta semana; `gravado` = o regime que a semana tinha ao '
  'ser salva (ou que a vigência «desde» encontrou ao chegar), congelado.';

create unique index dsa_regime_da_semana_uma_ativa
  on public.dsa_regime_da_semana (turma_id, ano, semana) where status = 'ativo';
create index idx_dsa_regime_da_semana_regime on public.dsa_regime_da_semana (regime_de_horario_id);

alter table public.dsa_regime_da_semana enable row level security;
create trigger trg_dsa_regime_da_semana_auditoria
  before insert or update on public.dsa_regime_da_semana
  for each row execute function app.set_auditoria();
create policy dsa_regime_da_semana_ler on public.dsa_regime_da_semana
  for select to authenticated
  using (coalesce(app.pode('registros_aula', 'ler'), false) and app.alcanca_turma(turma_id));
revoke all on public.dsa_regime_da_semana from anon;
revoke insert, update, delete, truncate on public.dsa_regime_da_semana from authenticated;

-- ---------------------------------------------------------------- 3. «desta semana em diante»
create table public.turma_regime_vigencia (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique default app.proximo_codigo_turma_regime_vigencia(),
  turma_id              uuid not null references public.turmas (id) on delete restrict,
  -- A segunda-feira da semana escolhida. Resolução pelo maior `vigente_de` <= a segunda da semana; a vigência seguinte
  -- encerra a anterior (sem `vigente_ate`: «dali para a frente»).
  vigente_de            date not null,
  regime_de_horario_id  uuid references public.regimes_de_horario (id) on delete restrict,
  status                public.status_registro not null default 'ativo',
  origem_migracao_v1    text,
  criado_por            uuid,
  criado_em             timestamptz not null default now(),
  editado_por           uuid,
  editado_em            timestamptz,

  constraint turma_regime_vigencia_na_segunda check (extract(isodow from vigente_de) = 1)
);
comment on table public.turma_regime_vigencia is
  'Bloco 11 (RD-3): «desta semana em diante» — o regime de tempos da turma no DSA a partir de uma segunda-feira; nulo '
  '= o do curso. Vence o regime de `Editar turma`; perde para o regime gravado ou «só esta semana» da semana. Escrita '
  'só por `public.definir_regime_do_dsa_desde`.';
create unique index turma_regime_vigencia_uma_ativa_por_data
  on public.turma_regime_vigencia (turma_id, vigente_de) where status = 'ativo';
create index idx_turma_regime_vigencia_regime on public.turma_regime_vigencia (regime_de_horario_id);

alter table public.turma_regime_vigencia enable row level security;
create trigger trg_turma_regime_vigencia_auditoria
  before insert or update on public.turma_regime_vigencia
  for each row execute function app.set_auditoria();
create policy turma_regime_vigencia_ler on public.turma_regime_vigencia
  for select to authenticated
  using (coalesce(app.pode('turmas', 'ler'), false) and app.alcanca_turma(turma_id));
revoke all on public.turma_regime_vigencia from anon;
revoke insert, update, delete, truncate on public.turma_regime_vigencia from authenticated;

-- ---------------------------------------------------------------- 4. as funções de apoio (de dono, sem porteiro)
-- A segunda-feira de uma semana ISO.
create or replace function app.segunda_da_semana_iso(p_ano smallint, p_semana smallint)
returns date
language sql immutable set search_path = pg_catalog as $$
  select to_date(p_ano::text || '-' || lpad(p_semana::text, 2, '0'), 'IYYY-IW');
$$;
grant execute on function app.segunda_da_semana_iso(smallint, smallint) to authenticated, service_role;

-- A semana está SALVA (D-11): evento que salva na trilha, ou lançamento salvo da própria turma nela.
create or replace function app.semana_do_dsa_salva(p_turma uuid, p_ano smallint, p_semana smallint)
returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.dsa_eventos_da_semana e
                  where e.turma_id = p_turma and e.ano = p_ano and e.semana = p_semana
                    and e.tipo in ('salvo', 'publicado', 'alteracao_publicada'))
      or exists (select 1 from public.vw_ocupacao_ta o
                  where o.turma_id = p_turma
                    and o.data between app.segunda_da_semana_iso(p_ano, p_semana)
                                   and app.segunda_da_semana_iso(p_ano, p_semana) + 6);
$$;
revoke all on function app.semana_do_dsa_salva(uuid, smallint, smallint) from public, anon, authenticated;

-- O regime de uma semana SEM a linha da semana: a vigência «desde» > o de `Editar turma` > o do curso (nulo).
create or replace function app.regime_resolvido_da_semana(p_turma uuid, p_segunda date)
returns table (fonte text, regime_de_horario_id uuid)
language sql stable security definer set search_path = pg_catalog, public as $$
  with desde as (
    select v.regime_de_horario_id
      from public.turma_regime_vigencia v
     where v.turma_id = p_turma and v.status = 'ativo' and v.vigente_de <= p_segunda
     order by v.vigente_de desc
     limit 1
  )
  select case when exists (select 1 from desde) then 'desde'
              when t.regime_de_horario_id is not null then 'turma'
              else 'curso' end,
         case when exists (select 1 from desde) then (select d.regime_de_horario_id from desde d)
              else t.regime_de_horario_id end
    from public.turmas t
   where t.id = p_turma;
$$;
revoke all on function app.regime_resolvido_da_semana(uuid, date) from public, anon, authenticated;

-- Grava a linha da semana com o retrato do regime nomeado (ou sem retrato, no do curso).
create or replace function app.inserir_regime_da_semana(p_turma uuid, p_ano smallint, p_semana smallint,
                                                        p_origem text, p_regime uuid)
returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.dsa_regime_da_semana
    (id, turma_id, ano, semana, origem, regime_de_horario_id, regime_tempos, ta_duracao_min, intervalo_manha_min,
     intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, configuracao_horario_id)
  select v_id, p_turma, p_ano, p_semana, p_origem, r.id, r.regime_tempos, r.ta_duracao_min, r.intervalo_manha_min,
         r.intervalo_tarde_min, r.hora_inicio_manha, r.hora_inicio_tarde, r.configuracao_horario_id
    from (select 1) um
    left join public.regimes_de_horario r on r.id = p_regime;
  return v_id;
end;
$$;
revoke all on function app.inserir_regime_da_semana(uuid, smallint, smallint, text, uuid) from public, anon, authenticated;

-- Grava (congela) o regime de uma semana que ainda não tem linha. Devolve se gravou.
create or replace function app.congelar_regime_da_semana(p_turma uuid, p_ano smallint, p_semana smallint)
returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_regime uuid;
begin
  if exists (select 1 from public.dsa_regime_da_semana d
              where d.turma_id = p_turma and d.ano = p_ano and d.semana = p_semana and d.status = 'ativo') then
    return false;
  end if;
  select r.regime_de_horario_id into v_regime
    from app.regime_resolvido_da_semana(p_turma, app.segunda_da_semana_iso(p_ano, p_semana)) r;
  perform app.inserir_regime_da_semana(p_turma, p_ano, p_semana, 'gravado', v_regime);
  return true;
end;
$$;
revoke all on function app.congelar_regime_da_semana(uuid, smallint, smallint) from public, anon, authenticated;

-- O porteiro das três RPCs (gotcha 15: a forma que falha FECHADO).
create or replace function app.porteiro_do_regime_do_dsa(p_turma uuid, p_regime uuid)
returns void
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if (coalesce(app.pode('registros_aula', 'criar'), false) and coalesce(app.alcanca_turma(p_turma), false)) is not true then
    raise exception 'O seu perfil não lança o DSA desta turma.'
      using errcode = '42501', hint = 'dsa_fora_do_alcance';
  end if;
  if app.turma_arquivada(p_turma) then
    raise exception 'A turma está arquivada: o DSA dela é somente leitura.'
      using errcode = '23514', hint = 'turma_arquivada';
  end if;
  if p_regime is not null and not exists (
       select 1 from public.regimes_de_horario r join public.turmas t on t.curso_id = r.curso_id
        where r.id = p_regime and t.id = p_turma and r.status = 'ativo') then
    raise exception 'O regime escolhido não é um regime ativo do curso desta turma.'
      using errcode = '23514', hint = 'regime_de_outro_curso';
  end if;
end;
$$;
revoke all on function app.porteiro_do_regime_do_dsa(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. as RPCs
-- «Só esta semana»: a semana salva não muda de regime (recusa); a escolha anterior desta semana sai.
create or replace function public.definir_regime_do_dsa_so_nesta_semana(p_turma uuid, p_ano smallint,
                                                                        p_semana smallint, p_regime uuid)
returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform app.porteiro_do_regime_do_dsa(p_turma, p_regime);
  if app.semana_do_dsa_salva(p_turma, p_ano, p_semana) then
    raise exception 'Esta semana já foi salva: o regime dela não muda mais.'
      using errcode = '23514', hint = 'semana_do_dsa_salva';
  end if;
  update public.dsa_regime_da_semana set status = 'inativo'
   where turma_id = p_turma and ano = p_ano and semana = p_semana and status = 'ativo';
  return app.inserir_regime_da_semana(p_turma, p_ano, p_semana, 'so_esta_semana', p_regime);
end;
$$;
revoke all on function public.definir_regime_do_dsa_so_nesta_semana(uuid, smallint, smallint, uuid) from public, anon;
grant execute on function public.definir_regime_do_dsa_so_nesta_semana(uuid, smallint, smallint, uuid) to authenticated;

-- «Desta semana em diante»: primeiro GRAVA o regime das semanas salvas daquela segunda em diante (que não mudam), depois
-- encerra as vigências «desde» desta segunda em diante e grava a nova. A escolha «só esta semana» DESTA semana sai (a
-- pessoa escolheu nela o padrão dali para a frente); a das semanas seguintes fica. Devolve quantas semanas congelou.
create or replace function public.definir_regime_do_dsa_desde(p_turma uuid, p_ano smallint, p_semana smallint,
                                                              p_regime uuid)
returns integer
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_segunda date := app.segunda_da_semana_iso(p_ano, p_semana);
  v_semana  record;
  v_total   integer := 0;
begin
  perform app.porteiro_do_regime_do_dsa(p_turma, p_regime);
  if app.semana_do_dsa_salva(p_turma, p_ano, p_semana) then
    raise exception 'Esta semana já foi salva: o regime dela não muda mais. Escolha a partir de uma semana não salva.'
      using errcode = '23514', hint = 'semana_do_dsa_salva';
  end if;

  for v_semana in
    select distinct s.ano, s.semana
      from (
        select e.ano, e.semana from public.dsa_eventos_da_semana e
         where e.turma_id = p_turma and e.tipo in ('salvo', 'publicado', 'alteracao_publicada')
        union
        select (app.semana_iso(o.data)).ano, (app.semana_iso(o.data)).semana
          from public.vw_ocupacao_ta o
         where o.turma_id = p_turma and o.data >= v_segunda
      ) s
     where app.segunda_da_semana_iso(s.ano, s.semana) >= v_segunda
  loop
    if app.congelar_regime_da_semana(p_turma, v_semana.ano, v_semana.semana) then
      v_total := v_total + 1;
    end if;
  end loop;

  update public.turma_regime_vigencia set status = 'inativo'
   where turma_id = p_turma and status = 'ativo' and vigente_de >= v_segunda;
  insert into public.turma_regime_vigencia (turma_id, vigente_de, regime_de_horario_id)
  values (p_turma, v_segunda, p_regime);

  update public.dsa_regime_da_semana set status = 'inativo'
   where turma_id = p_turma and ano = p_ano and semana = p_semana and status = 'ativo' and origem = 'so_esta_semana';
  return v_total;
end;
$$;
revoke all on function public.definir_regime_do_dsa_desde(uuid, smallint, smallint, uuid) from public, anon;
grant execute on function public.definir_regime_do_dsa_desde(uuid, smallint, smallint, uuid) to authenticated;

-- Ao salvar (e ao publicar): grava o regime da semana, se ela ainda não tem. Devolve se gravou.
create or replace function public.gravar_regime_da_semana_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint)
returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform app.porteiro_do_regime_do_dsa(p_turma, null);
  return app.congelar_regime_da_semana(p_turma, p_ano, p_semana);
end;
$$;
revoke all on function public.gravar_regime_da_semana_do_dsa(uuid, smallint, smallint) from public, anon;
grant execute on function public.gravar_regime_da_semana_do_dsa(uuid, smallint, smallint) to authenticated;
