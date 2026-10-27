-- =================================================================================
-- Spec 027 · Bloco 12 — EXCLUIR NO CALENDÁRIO é exclusão LÓGICA, depois de um alerta de impacto (D-COR-7)
-- Data local: 27/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisão de Bernardo Villas Boas, 26/10/2026, que substitui, para a linha do calendário, a D-COR-6 (24/10/2026):
--   «no Calendário, excluir NÃO é bloqueado, nem com DSA publicado nem com aula no dia. O Admin exclui qualquer
--    lançamento (feriado, licença administrativa, dia parado), ativo ou inativo, depois de um ALERTA que mostra o
--    impacto e pede confirmação. Motivo: lançamento cadastrado errado tem de poder sair da lista.»
--   «Excluir = exclusão lógica (regra 4): o lançamento some do calendário e da lista, inclusive em "mostrar inativos",
--    e deixa de contar em tudo. Fica na auditoria, com quem e quando. Lançamento excluído não impede cadastrar outro na
--    mesma data.» «Só o Admin exclui.» «NÃO fazer DELETE físico nem criar policy de DELETE.»
--
-- Esta migration SÓ ACRESCENTA (regra 9.4, emenda de 19/10/2026):
--   1. duas colunas NULÁVEIS em `feriados` — `excluido_em` e `excluido_por` — e duas restrições SÓ sobre elas (as linhas
--      que existem têm as duas nulas e passam);
--   2. um gatilho que guarda SÓ as colunas novas e a linha já excluída: com sessão, marcar a exclusão é do Admin, e a
--      linha excluída não se altera mais (nem reativar). Sem sessão (script, migration), nada é travado (RP-5). Nenhuma
--      escrita que existe hoje passa a ser recusada: ela não toca as colunas novas, e não há linha excluída;
--   3. duas funções novas com porteiro de Admin — o IMPACTO da exclusão (lido quando o alerta abre) e a EXCLUSÃO, que
--      grava o rastro em `exclusoes_registradas` (tabela só de acréscimo, D-B1; `feriados` já é tabela aceita ali) e
--      marca a linha: `status = 'inativo'` + `excluido_em`/`excluido_por`;
--   4. os espelhos `public.*`, SECURITY INVOKER (o PostgREST não expõe `app`).
--
-- ⚠️ POR QUE `status = 'inativo'` TAMBÉM: toda leitura que conta a linha do calendário já filtra `status = 'ativo'`
--    (`vw_dias_parados_turma`, o saldo do Início, de `/turmas` e da ficha, o DSA, os avisos, a recusa de lançar no dia).
--    Inativa, a linha excluída deixa de contar em tudo SEM mudar uma view ou função. `excluido_em` é o que a tira da
--    LISTA do calendário, que mostra as inativas (D-10 da spec 023).
-- ⚠️ NENHUMA REGRA DA TABELA PRENDE LINHA ANTIGA (medido em 27/10/2026 na cópia `remoto-20261027-061453.sql`):
--    `feriados` não tem catraca de `editado_em` (as restrições são `feriados_ano_bate_data` e `feriados_ano_valido`), e
--    `trg_feriados_tipo` só dispara em `UPDATE OF tipo_parada_id`. A linha vinda da v2.0 — 26 das 32, 18 nunca editadas —
--    se exclui como qualquer outra (pgTAP 152).
-- ⚠️ O QUE FICA COMO ESTÁ: `app.excluir_feriado` (a exclusão física da D-COR-6) e os impedimentos dela. Perdem o
--    consumidor na tela; revogar o `execute` seria mexer em permissão (portão 9.4) — `PEND-027-1`.
-- ⚠️ SEM `DELETE`, sem policy nova. Zero policy de `DELETE` no catálogo continua valendo (pgTAP 107).
--
-- Reversão: `specs/027-bloco-12-excluir-no-calendario/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. as colunas da exclusão lógica
alter table public.feriados
  add column excluido_em timestamptz,
  add column excluido_por uuid;

comment on column public.feriados.excluido_em is
  'Bloco 12 (spec 027, D-COR-7): quando o Admin excluiu a linha do calendário. Excluída, a linha fica inativa, some da '
  'lista do calendário (também das inativas) e não se altera mais. Nula = não excluída.';
comment on column public.feriados.excluido_por is
  'Bloco 12 (spec 027, D-COR-7): quem excluiu (`auth.uid()`, o mesmo espaço de nomes de `criado_por`). Nula = não excluída.';

alter table public.feriados
  add constraint feriados_exclusao_completa
    check ((excluido_em is null) = (excluido_por is null)),
  add constraint feriados_excluida_inativa
    check (excluido_em is null or status = 'inativo');

-- ---------------------------------------------------------------- 2. a guarda das colunas novas
create or replace function app.guardar_exclusao_no_calendario()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Sem sessão (script, migration, carga): nada é travado (RP-5).
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.excluido_em is not null or new.excluido_por is not null then
      raise exception 'a linha do calendario nao nasce excluida' using errcode = '42501';
    end if;
    return new;
  end if;
  -- A linha excluída não se altera mais — nem reativar (não há lixeira nem restaurar).
  if old.excluido_em is not null then
    raise exception 'linha do calendario excluida'
      using errcode = '55000', hint = 'linha_do_calendario_excluida';
  end if;
  if (new.excluido_em is distinct from old.excluido_em or new.excluido_por is distinct from old.excluido_por)
     and coalesce(app.eh_admin(), false) is not true then
    raise exception 'exclusao no calendario restrita ao Admin' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function app.guardar_exclusao_no_calendario() is
  'Bloco 12 (spec 027): com sessão, só o Admin marca a exclusão da linha do calendário, e a linha excluída não se '
  'altera mais. Sem sessão, não trava (RP-5).';

revoke all on function app.guardar_exclusao_no_calendario() from public, anon, authenticated;

create trigger trg_feriados_exclusao
  before insert or update on public.feriados
  for each row execute function app.guardar_exclusao_no_calendario();

-- ---------------------------------------------------------------- 3. o impacto, lido quando o alerta abre
-- As turmas que a linha ALCANÇA (as escolhidas ativas; sem nenhuma, todas) e que ela ATINGE: a turma ativa ou
-- planejada, presencial ou semipresencial, não arquivada, com a data no período (na semipresencial, na etapa presencial
-- quando cadastrada) — ou a que tem lançamento que conta no dia ou semana do DSA publicada que contém o dia.
-- Os lançamentos contados são os que CONTAM (RP-8: salvos e vivos): aula, atividade da turma, e a avaliação — a 1ª
-- aplicação, as sessões e a vista (a mesma lista de `app.registros_do_feriado`). A atividade de todas as turmas
-- (sem turma) vem à parte. «A data já passou» é da tela, pelo hoje de São Paulo (D20).
create or replace function app.impacto_da_exclusao_do_feriado(p_feriado_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data    date;
  v_status  text;
  v_impacto text;
  v_todas   boolean;
  v_ano     smallint;
  v_semana  smallint;
  v_turmas  jsonb;
  v_globais integer;
begin
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'exclusao no calendario restrita ao Admin' using errcode = '42501';
  end if;
  select f.data, f.status::text, f.impacto::text into v_data, v_status, v_impacto
    from public.feriados f
   where f.id = p_feriado_id and f.excluido_em is null;
  if not found then
    raise exception 'linha do calendario inexistente' using errcode = 'P0002';
  end if;
  select s.ano, s.semana into v_ano, v_semana from app.semana_iso(v_data) s;
  v_todas := not exists (select 1 from public.feriado_turma ft
                          where ft.feriado_id = p_feriado_id and ft.status = 'ativo');

  with alcancadas as (
    select t.id, t.codigo, t.ano_letivo, t.status::text as status, t.data_inicio, t.data_termino,
           c.codigo as curso_codigo, c.classificacao::text as curso_classificacao, c.duracao_semanas,
           (t.status in ('ativa', 'planejada')
            and t.modalidade <> 'ead'
            and v_data between t.data_inicio and t.data_termino
            and (t.modalidade <> 'semipresencial'
                 or t.inicio_etapa_presencial is null
                 or t.termino_etapa_presencial is null
                 or v_data between t.inicio_etapa_presencial and t.termino_etapa_presencial)
            and not exists (select 1 from public.vw_turmas_arquivadas a where a.turma_id = t.id)) as no_periodo
      from public.turmas t
      join public.cursos c on c.id = t.curso_id
     where v_todas
        or t.id in (select ft.turma_id from public.feriado_turma ft
                     where ft.feriado_id = p_feriado_id and ft.status = 'ativo')
  ), contadas as (
    select a.*,
           (select count(*) from public.registros_aula r
             where r.turma_id = a.id and r.data = v_data and r.salvo and r.status = 'ativo')::int as aulas,
           (select count(*) from public.atividades_nao_letivas x
             where x.turma_id = a.id and x.data = v_data and x.salvo and x.status = 'ativo')::int as atividades,
           (select count(*) from (
              select 1 from public.avaliacoes av
               where av.turma_id = a.id and av.data_avaliacao = v_data and av.salvo
                 and av.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
              union all
              select 1 from public.sessoes_de_aplicacao s
                join public.avaliacoes av on av.id = s.avaliacao_id
               where av.turma_id = a.id and s.data = v_data and s.salvo and s.status = 'ativo'
                 and av.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
              union all
              select 1 from public.vistas_de_avaliacao w
                join public.avaliacoes av on av.id = w.avaliacao_id
               where av.turma_id = a.id and w.data = v_data and w.salvo and w.status = 'ativo'
                 and av.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')) y)::int as avaliacoes,
           (select max(e.numero) from public.dsa_eventos_da_semana e
             where e.turma_id = a.id and e.ano = v_ano and e.semana = v_semana
               and e.tipo in ('publicado', 'alteracao_publicada'))::int as versao_publicada
      from alcancadas a
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'turma_id', c.id,
           'codigo', c.codigo,
           'ano', c.ano_letivo,
           'curso_codigo', c.curso_codigo,
           'curso_classificacao', c.curso_classificacao,
           'duracao_semanas', c.duracao_semanas,
           'data_inicio', c.data_inicio,
           'data_termino', c.data_termino,
           'aulas', c.aulas,
           'atividades', c.atividades,
           'avaliacoes', c.avaliacoes,
           'versao_publicada', c.versao_publicada) order by c.codigo), '[]'::jsonb)
    into v_turmas
    from contadas c
   where c.no_periodo or c.aulas + c.atividades + c.avaliacoes > 0 or c.versao_publicada is not null;

  select count(*)::int into v_globais
    from public.atividades_nao_letivas x
   where x.turma_id is null and x.data = v_data and x.salvo and x.status = 'ativo';

  return jsonb_build_object(
    'data', v_data,
    'situacao', v_status,
    'impacto', v_impacto,
    'todas', v_todas,
    'ano_iso', v_ano,
    'semana_iso', v_semana,
    'atividades_globais', v_globais,
    'turmas', v_turmas);
end;
$$;

comment on function app.impacto_da_exclusao_do_feriado(uuid) is
  'Bloco 12 (spec 027): o impacto de excluir a linha do calendário — as turmas atingidas, os lançamentos que contam no '
  'dia e a semana do DSA publicada que contém o dia. Só o Admin lê (é quem exclui). Não decide nada: excluir não é '
  'bloqueado (D-COR-7).';

revoke all on function app.impacto_da_exclusao_do_feriado(uuid) from public, anon;
grant execute on function app.impacto_da_exclusao_do_feriado(uuid) to authenticated;

-- ---------------------------------------------------------------- 4. a exclusão lógica
create or replace function app.excluir_linha_do_calendario(p_feriado_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_quem    uuid := auth.uid();
  v_quando  timestamptz := now();
  v_codigo  text;
  v_feriado jsonb;
begin
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'exclusao no calendario restrita ao Admin' using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select f.codigo, to_jsonb(f) into v_codigo, v_feriado
    from public.feriados f
   where f.id = p_feriado_id and f.excluido_em is null
     for update;
  if not found then
    raise exception 'linha do calendario inexistente' using errcode = 'P0002';
  end if;

  -- O rastro ANTES de a linha mudar (D-B1): o que ela era e o que atingia quando saiu.
  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por, excluido_em)
  values ('feriados', p_feriado_id, v_codigo,
          jsonb_build_object(
            'modo', 'logica',
            'feriado', v_feriado,
            'turmas', coalesce((select jsonb_agg(to_jsonb(ft) order by ft.turma_id)
                                  from public.feriado_turma ft where ft.feriado_id = p_feriado_id),
                               '[]'::jsonb),
            'impacto', app.impacto_da_exclusao_do_feriado(p_feriado_id)),
          v_quem, v_quando);

  update public.feriados
     set status = 'inativo', excluido_em = v_quando, excluido_por = v_quem
   where id = p_feriado_id;

  return jsonb_build_object('id', p_feriado_id, 'codigo', v_codigo, 'excluido_em', v_quando);
end;
$$;

comment on function app.excluir_linha_do_calendario(uuid) is
  'Bloco 12 (spec 027, D-COR-7): exclusão LÓGICA da linha do calendário, ativa ou inativa, sem bloqueio por '
  'lançamento nem por DSA publicado. Só o Admin. Grava o rastro em `exclusoes_registradas` (modo lógica) e marca a '
  'linha inativa e excluída. Nada é apagado.';

revoke all on function app.excluir_linha_do_calendario(uuid) from public, anon;
grant execute on function app.excluir_linha_do_calendario(uuid) to authenticated;

-- ---------------------------------------------------------------- 5. os espelhos `public.*` (INVOKER)
create or replace function public.impacto_da_exclusao_do_feriado(p_feriado_id uuid)
returns jsonb language sql stable security invoker set search_path = pg_catalog, public
as $$ select app.impacto_da_exclusao_do_feriado(p_feriado_id); $$;

create or replace function public.excluir_linha_do_calendario(p_feriado_id uuid)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_linha_do_calendario(p_feriado_id); $$;

revoke all on function public.impacto_da_exclusao_do_feriado(uuid) from public, anon;
revoke all on function public.excluir_linha_do_calendario(uuid) from public, anon;
grant execute on function public.impacto_da_exclusao_do_feriado(uuid) to authenticated, service_role;
grant execute on function public.excluir_linha_do_calendario(uuid) to authenticated, service_role;
