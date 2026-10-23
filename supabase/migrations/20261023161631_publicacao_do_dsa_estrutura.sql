-- =================================================================================
-- Spec 024 · Bloco 9 — M1: o RASCUNHO e a PUBLICAÇÃO do DSA, e a marca PRESENCIAL da disciplina
-- Data local: 23/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Regras: `docs/correcoes/regras-da-publicacao-do-dsa.md` (RP-0 a RP-8), decisões de Bernardo Villas Boas de 21, 22 e
-- 23/10/2026. Esta migration SÓ ACRESCENTA: colunas novas com padrão, uma tabela nova, funções novas e views novas.
-- Quem passa a ler só o salvo é a M2 (`20261023161634`), pelo portão autorizado.
--
--   1. `salvo`, `rascunho_de` e `rascunho_exclui` nas cinco tabelas de lançamento do DSA. Tudo o que existe nasce SALVO
--      (`default true`, RP-6/RP-8); scripts sem sessão continuam gravando salvo.
--   2. `dsa_eventos_da_semana`: a trilha da semana — salvo, rascunho descartado, publicado, alteração iniciada,
--      alteração publicada (com o retrato e a justificativa). Só de acréscimo, imutável inclusive para a service_role.
--   3. `public.gravar_rascunho_do_dsa`: o ÚNICO ponto de escrita do DSA. Inserção vira rascunho; atualização de um salvo
--      vira o rascunho-SOMBRA dele (a versão salva continua contando até o Salvar); excluir um salvo vira sombra de
--      exclusão. Recusa semana publicada para quem tem sessão (RP-5).
--   4. `salvar_semana_do_dsa`, `descartar_rascunho_do_dsa`, `iniciar_alteracao_do_dsa`, `publicar_semana_do_dsa`.
--   5. `vw_ocupacao_do_dsa`: a grade da PRÓPRIA turma com o rascunho por cima (o salvo sombreado sai; a sombra de exclusão
--      some). Só a tela do DSA a lê; soma e cruzamento leem `vw_ocupacao_ta`, só do salvo (M2).
--   6. `disciplinas.presencial`: a marca da etapa presencial da turma semipresencial (FR-019), com a soma
--      `vw_carga_presencial_turma` e `chd_da_turma_na_etapa_ate`.
--
-- Reversão: `specs/024-bloco-9-publicacao-do-dsa/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. as colunas do rascunho
do $$
declare
  t text;
begin
  foreach t in array array['registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'vistas_de_avaliacao',
                           'sessoes_de_aplicacao'] loop
    execute format('alter table public.%I add column salvo boolean not null default true', t);
    execute format('alter table public.%I add column rascunho_de uuid references public.%I (id) on delete restrict',
                   t, t);
    execute format('alter table public.%I add column rascunho_exclui boolean not null default false', t);
    -- O salvo não é sombra nem pede exclusão; a exclusão é só de sombra.
    execute format('alter table public.%I add constraint %I check (not salvo or (rascunho_de is null and not rascunho_exclui))',
                   t, t || '_salvo_sem_rascunho');
    execute format('alter table public.%I add constraint %I check (not rascunho_exclui or rascunho_de is not null)',
                   t, t || '_exclusao_so_de_sombra');
    execute format('create index %I on public.%I (rascunho_de) where rascunho_de is not null', 'idx_' || t || '_rascunho_de', t);
    execute format('create index %I on public.%I (salvo) where not salvo', 'idx_' || t || '_nao_salvo', t);
    execute format($c$comment on column public.%I.salvo is
      'Bloco 9 (RP-0, RP-8): false = rascunho do DSA, guardado e visível só na tela do DSA da turma, sem contar em nada. '
      'O que existe e o que os scripts gravam nasce salvo.'$c$, t);
    execute format($c$comment on column public.%I.rascunho_de is
      'Bloco 9 (RP-0): o registro SALVO de que este rascunho é a edição (sombra). No Salvar, a sombra é aplicada sobre ele.'$c$, t);
    execute format($c$comment on column public.%I.rascunho_exclui is
      'Bloco 9 (RP-0): a sombra pede a EXCLUSÃO do salvo no Salvar.'$c$, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- 2. a trilha da semana
create sequence app.dsa_eventos_codigo_seq as bigint;
create or replace function app.proximo_codigo_evento_do_dsa()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'DEV-' || lpad(nextval('app.dsa_eventos_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_evento_do_dsa() from public, anon;
grant execute on function app.proximo_codigo_evento_do_dsa() to authenticated, service_role;

create table public.dsa_eventos_da_semana (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_evento_do_dsa(),
  turma_id            uuid not null references public.turmas (id) on delete restrict,
  ano                 smallint not null,
  semana              smallint not null,
  tipo                text not null,
  numero              smallint,
  justificativa       text,
  retrato             jsonb,
  autor_id            uuid,
  ocorrido_em         timestamptz not null default clock_timestamp(),
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  constraint dsa_eventos_semana_valida check (semana between 1 and 53 and ano between 2020 and 2099),
  constraint dsa_eventos_tipo_valido check (tipo in ('salvo', 'rascunho_descartado', 'publicado',
                                                     'alteracao_iniciada', 'alteracao_publicada')),
  constraint dsa_eventos_publicacao_com_retrato check (
    (tipo in ('publicado', 'alteracao_publicada')) = (retrato is not null and numero is not null)),
  constraint dsa_eventos_original_e_zero check (tipo <> 'publicado' or numero = 0),
  constraint dsa_eventos_alteracao_com_justificativa check (
    tipo <> 'alteracao_publicada' or (numero >= 1 and length(btrim(coalesce(justificativa, ''))) >= 10))
);
comment on table public.dsa_eventos_da_semana is
  'Bloco 9 (RP-1 a RP-7): a trilha de cada semana do DSA de uma turma — salvo, rascunho descartado, publicado (versão '
  'original, numero 0, com o retrato), alteração iniciada e alteração publicada (ALT N, com a justificativa e o '
  'retrato). Só de acréscimo e imutável inclusive para a service_role; a situação da semana é DERIVADA dela.';

create unique index dsa_eventos_publicacao_unica on public.dsa_eventos_da_semana (turma_id, ano, semana, numero)
  where tipo in ('publicado', 'alteracao_publicada');
create index idx_dsa_eventos_semana on public.dsa_eventos_da_semana (turma_id, ano, semana, ocorrido_em);

alter table public.dsa_eventos_da_semana enable row level security;
create trigger trg_dsa_eventos_auditoria
  before insert on public.dsa_eventos_da_semana
  for each row execute function app.set_auditoria();

create policy dsa_eventos_ler on public.dsa_eventos_da_semana
  for select to authenticated
  using (coalesce(app.pode('registros_aula', 'ler'), false) and app.alcanca_turma(turma_id));
-- Sem policy de escrita: só as funções abaixo gravam (por `app.registrar_evento_do_dsa`, de dono).
revoke all on public.dsa_eventos_da_semana from anon;
revoke insert, update, delete, truncate on public.dsa_eventos_da_semana from authenticated;

create or replace function app.dsa_eventos_imutaveis()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception 'dsa_eventos_da_semana e so de acrescimo: % nao e permitido', tg_op
    using errcode = '42501', hint = 'rastro_imutavel',
          detail = 'Publicação e alteração nunca se apagam (RP-7).';
end;
$$;
revoke all on function app.dsa_eventos_imutaveis() from public, anon, authenticated;
create trigger trg_dsa_eventos_imutaveis
  before update or delete on public.dsa_eventos_da_semana
  for each statement execute function app.dsa_eventos_imutaveis();
create trigger trg_dsa_eventos_sem_truncate
  before truncate on public.dsa_eventos_da_semana
  for each statement execute function app.dsa_eventos_imutaveis();

-- ---------------------------------------------------------------- 3. a situação da semana (a trava)
-- A semana ISO de uma data: a mesma régua do DSA (`?ano=&semana=`).
create or replace function app.semana_iso(p_data date)
returns table (ano smallint, semana smallint)
language sql immutable set search_path = pg_catalog as $$
  select extract(isoyear from p_data)::smallint, extract(week from p_data)::smallint;
$$;
grant execute on function app.semana_iso(date) to authenticated, service_role;

-- Travada = a última publicação não tem «alteração iniciada» depois dela.
create or replace function app.semana_do_dsa_travada(p_turma uuid, p_ano smallint, p_semana smallint)
returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce((
    select e.tipo in ('publicado', 'alteracao_publicada')
      from public.dsa_eventos_da_semana e
     where e.turma_id = p_turma and e.ano = p_ano and e.semana = p_semana
       and e.tipo in ('publicado', 'alteracao_publicada', 'alteracao_iniciada')
     order by e.ocorrido_em desc, e.criado_em desc
     limit 1), false);
$$;
revoke all on function app.semana_do_dsa_travada(uuid, smallint, smallint) from public, anon;
grant execute on function app.semana_do_dsa_travada(uuid, smallint, smallint) to authenticated, service_role;

-- A mesma pergunta pela data, exposta às ações (D-4: o «Parar dia» da turma também respeita a trava).
create or replace function public.dsa_travado_na_data(p_turma uuid, p_data date)
returns boolean
language sql stable set search_path = pg_catalog, public as $$
  select app.semana_do_dsa_travada(p_turma, s.ano, s.semana) from app.semana_iso(p_data) s;
$$;
revoke all on function public.dsa_travado_na_data(uuid, date) from public, anon;
grant execute on function public.dsa_travado_na_data(uuid, date) to authenticated, service_role;

-- Recusa para quem tem sessão (RP-5: script sem sessão não é travado).
create or replace function app.recusar_se_semana_travada(p_turma uuid, p_data date)
returns void
language plpgsql stable set search_path = pg_catalog, public as $$
begin
  if p_turma is null or p_data is null or auth.uid() is null then
    return;
  end if;
  if public.dsa_travado_na_data(p_turma, p_data) then
    raise exception 'A semana de % do DSA desta turma está publicada.', to_char(p_data, 'DD/MM/YYYY')
      using errcode = '23514', hint = 'semana_do_dsa_publicada',
            detail = 'Para mudar, use «Fazer alteração» na tela do DSA (RP-1).';
  end if;
end;
$$;
revoke all on function app.recusar_se_semana_travada(uuid, date) from public, anon;
grant execute on function app.recusar_se_semana_travada(uuid, date) to authenticated, service_role;

-- O evento, gravado pelo dono: a tabela não tem policy de escrita (a trilha não se forja pela interface de dados).
create or replace function app.registrar_evento_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint, p_tipo text,
                                                       p_numero smallint default null, p_justificativa text default null,
                                                       p_retrato jsonb default null)
returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is not null
     and not (coalesce(app.pode('registros_aula', 'criar'), false) and app.alcanca_turma(p_turma)) then
    raise exception 'O seu perfil não lança o DSA desta turma.'
      using errcode = '42501', hint = 'dsa_fora_do_alcance';
  end if;
  insert into public.dsa_eventos_da_semana (id, turma_id, ano, semana, tipo, numero, justificativa, retrato, autor_id)
  values (v_id, p_turma, p_ano, p_semana, p_tipo, p_numero, nullif(btrim(coalesce(p_justificativa, '')), ''),
          p_retrato, auth.uid());
  return v_id;
end;
$$;
revoke all on function app.registrar_evento_do_dsa(uuid, smallint, smallint, text, smallint, text, jsonb)
  from public, anon;
grant execute on function app.registrar_evento_do_dsa(uuid, smallint, smallint, text, smallint, text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------- 4. o rascunho: o ponto único de escrita do DSA
-- A turma e a data de uma linha de lançamento (as sessões e as vistas, pela avaliação).
create or replace function app.turma_e_data_do_lancamento(p_tabela text, p_linha jsonb)
returns table (turma_id uuid, data date)
language plpgsql stable set search_path = pg_catalog, public as $$
begin
  if p_tabela in ('vistas_de_avaliacao', 'sessoes_de_aplicacao') then
    return query select a.turma_id, (p_linha ->> 'data')::date
                   from public.avaliacoes a where a.id = (p_linha ->> 'avaliacao_id')::uuid;
  elsif p_tabela = 'avaliacoes' then
    return query select (p_linha ->> 'turma_id')::uuid, (p_linha ->> 'data_avaliacao')::date;
  else
    return query select (p_linha ->> 'turma_id')::uuid, (p_linha ->> 'data')::date;
  end if;
end;
$$;
grant execute on function app.turma_e_data_do_lancamento(text, jsonb) to authenticated, service_role;

-- O status de «excluído» de cada tabela: a avaliação é cancelada; as demais, inativas.
create or replace function app.status_de_excluido(p_tabela text)
returns text language sql immutable as $$
  select case when p_tabela = 'avaliacoes' then 'cancelada' else 'inativo' end;
$$;
grant execute on function app.status_de_excluido(text) to authenticated, service_role;

-- As colunas copiáveis de uma tabela (sem as geradas, o id, o código, a auditoria e as do rascunho; com ou sem o status).
create or replace function app.colunas_copiaveis(p_tabela text, p_com_status boolean)
returns text language sql stable set search_path = pg_catalog, public as $$
  select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position)
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = p_tabela and c.is_generated = 'NEVER'
     and c.column_name not in ('id', 'codigo', 'criado_por', 'criado_em', 'editado_por', 'editado_em',
                               'salvo', 'rascunho_de', 'rascunho_exclui')
     and (p_com_status or c.column_name <> 'status');
$$;
grant execute on function app.colunas_copiaveis(text, boolean) to authenticated, service_role;

/*
 * As operações têm a forma de `gravar_lancamentos_em_transacao` ({acao, tabela, id?, campos}).
 * - inserir: a linha nasce rascunho (`salvo = false`).
 * - atualizar um RASCUNHO: muda o próprio rascunho; se o pedido é excluir (status de excluído) e o rascunho é uma sombra,
 *   ela vira sombra de exclusão; se é um rascunho novo, ele sai (status de excluído).
 * - atualizar um SALVO: muda a sombra dele (cria, se não houver) — o salvo não é tocado e continua contando.
 */
create or replace function public.gravar_rascunho_do_dsa(p_operacoes jsonb)
returns integer
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_op        jsonb;
  v_acao      text;
  v_tabela    text;
  v_campos    jsonb;
  v_id        uuid;
  v_alvo      jsonb;
  v_sombra    uuid;
  v_colunas   text;
  v_copia     text;
  v_qtd       integer;
  v_chaves    integer;
  v_linhas    integer;
  v_exclui    boolean;
  v_total     integer := 0;
  v_turma     uuid;
  v_data      date;
begin
  if jsonb_typeof(p_operacoes) is distinct from 'array' or jsonb_array_length(p_operacoes) = 0 then
    raise exception 'Operacao invalida para gravar_rascunho_do_dsa' using errcode = '22023', hint = 'operacoes_invalidas';
  end if;

  for v_op in select o from jsonb_array_elements(p_operacoes) as o loop
    v_acao   := v_op ->> 'acao';
    v_tabela := v_op ->> 'tabela';
    v_campos := v_op -> 'campos';
    if v_tabela is null
       or v_tabela not in ('registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'vistas_de_avaliacao',
                           'sessoes_de_aplicacao')
       or jsonb_typeof(v_campos) is distinct from 'object'
       or v_campos ?| array['salvo', 'rascunho_de', 'rascunho_exclui'] then
      raise exception 'Operacao invalida para gravar_rascunho_do_dsa' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position), count(*)
      into v_colunas, v_qtd
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = v_tabela and c.is_generated = 'NEVER'
       and c.column_name not in ('criado_por', 'criado_em', 'editado_por', 'editado_em')
       and v_campos ? c.column_name;
    select count(*) into v_chaves from jsonb_object_keys(v_campos);
    if v_qtd = 0 or v_qtd <> v_chaves then
      raise exception 'Operacao invalida para gravar_rascunho_do_dsa' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;
    v_exclui := (v_campos ->> 'status') = app.status_de_excluido(v_tabela);

    if v_acao = 'inserir' and v_tabela = 'atividades_nao_letivas' and (v_campos ->> 'turma_id') is null then
      -- D-14: a atividade de TODAS as turmas é do calendário, como a parada — grava na hora (não é rascunho).
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos;
      get diagnostics v_linhas = row_count;

    elsif v_acao = 'inserir' then
      select t.turma_id, t.data into v_turma, v_data from app.turma_e_data_do_lancamento(v_tabela, v_campos) t;
      perform app.recusar_se_semana_travada(v_turma, v_data);
      execute format(
        'insert into public.%I (%s, salvo) select %s, false from jsonb_populate_record(null::public.%I, $1)',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos;
      get diagnostics v_linhas = row_count;

    elsif v_acao = 'atualizar' then
      v_id := (v_op ->> 'id')::uuid;
      if v_id is null then
        raise exception 'Operacao invalida para gravar_rascunho_do_dsa' using errcode = '22023', hint = 'operacoes_invalidas';
      end if;
      execute format('select to_jsonb(x) from public.%I x where x.id = $1', v_tabela) into v_alvo using v_id;
      if v_alvo is null then
        raise exception 'Lancamento fora do alcance de quem grava' using errcode = '42501', hint = 'lancamento_fora_do_alcance';
      end if;
      -- A trava vale para a data de hoje do registro e para a nova (mover para dentro de uma semana publicada).
      select t.turma_id, t.data into v_turma, v_data from app.turma_e_data_do_lancamento(v_tabela, v_alvo) t;
      perform app.recusar_se_semana_travada(v_turma, v_data);
      select t.turma_id, t.data into v_turma, v_data
        from app.turma_e_data_do_lancamento(v_tabela, v_alvo || v_campos) t;
      perform app.recusar_se_semana_travada(v_turma, v_data);

      if v_tabela = 'atividades_nao_letivas' and (v_alvo ->> 'turma_id') is null then
        -- D-14: a atividade de todas as turmas muda na hora, como foi gravada.
        execute format(
          'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
          v_tabela, v_colunas, v_colunas, v_tabela
        ) using v_campos, v_id;
      elsif not (v_alvo ->> 'salvo')::boolean then
        -- Um rascunho: muda ele mesmo (a sombra que pede exclusão vira sombra de exclusão).
        if v_exclui and (v_alvo ->> 'rascunho_de') is not null then
          execute format('update public.%I set rascunho_exclui = true where id = $1', v_tabela) using v_id;
        else
          execute format(
            'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
            v_tabela, v_colunas, v_colunas, v_tabela
          ) using v_campos, v_id;
        end if;
      else
        -- Um salvo: a sombra dele (a que já existe, ou uma nova copiada do salvo).
        execute format(
          'select x.id from public.%I x where x.rascunho_de = $1 and not x.salvo and x.status::text <> $2 limit 1',
          v_tabela) into v_sombra using v_id, app.status_de_excluido(v_tabela);
        if v_sombra is null then
          v_sombra := gen_random_uuid();
          v_copia := app.colunas_copiaveis(v_tabela, true);
          execute format(
            'insert into public.%I (id, codigo, %s, salvo, rascunho_de) '
            'select $1, x.codigo || ''#R-'' || left($1::text, 8), %s, false, x.id from public.%I x where x.id = $2',
            v_tabela, v_copia, v_copia, v_tabela) using v_sombra, v_id;
        end if;
        if v_exclui then
          execute format('update public.%I set rascunho_exclui = true where id = $1', v_tabela) using v_sombra;
        else
          execute format(
            'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
            v_tabela, v_colunas, v_colunas, v_tabela
          ) using v_campos, v_sombra;
        end if;
      end if;
      get diagnostics v_linhas = row_count;
    else
      raise exception 'Operacao invalida para gravar_rascunho_do_dsa' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;
    if v_linhas = 0 then
      raise exception 'Lancamento fora do alcance de quem grava' using errcode = '42501', hint = 'lancamento_fora_do_alcance';
    end if;
    v_total := v_total + 1;
  end loop;
  return v_total;
end
$$;
revoke all on function public.gravar_rascunho_do_dsa(jsonb) from public, anon;
grant execute on function public.gravar_rascunho_do_dsa(jsonb) to authenticated;

-- ---------------------------------------------------------------- 5. salvar, descartar, alterar e publicar
-- Os rascunhos da turma na semana: a data do rascunho, ou a do salvo que ele sombreia, cai na semana.
create or replace function app.rascunhos_da_semana(p_turma uuid, p_de date, p_ate date)
returns table (tabela text, id uuid, rascunho_de uuid, exclui boolean)
language sql stable set search_path = pg_catalog, public as $$
  select 'avaliacoes'::text, a.id, a.rascunho_de, a.rascunho_exclui
    from public.avaliacoes a
    left join public.avaliacoes o on o.id = a.rascunho_de
   where not a.salvo and a.turma_id = p_turma and a.status::text <> 'cancelada'
     and (a.data_avaliacao between p_de and p_ate or o.data_avaliacao between p_de and p_ate)
  union all
  select 'registros_aula', r.id, r.rascunho_de, r.rascunho_exclui
    from public.registros_aula r
    left join public.registros_aula o on o.id = r.rascunho_de
   where not r.salvo and r.turma_id = p_turma and r.status = 'ativo'
     and (r.data between p_de and p_ate or o.data between p_de and p_ate)
  union all
  select 'atividades_nao_letivas', n.id, n.rascunho_de, n.rascunho_exclui
    from public.atividades_nao_letivas n
    left join public.atividades_nao_letivas o on o.id = n.rascunho_de
   where not n.salvo and n.turma_id = p_turma and n.status = 'ativo'
     and (n.data between p_de and p_ate or o.data between p_de and p_ate)
  union all
  select 'sessoes_de_aplicacao', p.id, p.rascunho_de, p.rascunho_exclui
    from public.sessoes_de_aplicacao p
    join public.avaliacoes a on a.id = p.avaliacao_id
    left join public.sessoes_de_aplicacao o on o.id = p.rascunho_de
   where not p.salvo and a.turma_id = p_turma and p.status = 'ativo'
     and (p.data between p_de and p_ate or o.data between p_de and p_ate)
  union all
  select 'vistas_de_avaliacao', s.id, s.rascunho_de, s.rascunho_exclui
    from public.vistas_de_avaliacao s
    join public.avaliacoes a on a.id = s.avaliacao_id
    left join public.vistas_de_avaliacao o on o.id = s.rascunho_de
   where not s.salvo and a.turma_id = p_turma and s.status = 'ativo'
     and (s.data between p_de and p_ate or o.data between p_de and p_ate);
$$;
grant execute on function app.rascunhos_da_semana(uuid, date, date) to authenticated, service_role;

create or replace function public.quantos_rascunhos_na_semana(p_turma uuid, p_de date, p_ate date)
returns integer language sql stable set search_path = pg_catalog, public as $$
  select count(*)::integer from app.rascunhos_da_semana(p_turma, p_de, p_ate);
$$;
revoke all on function public.quantos_rascunhos_na_semana(uuid, date, date) from public, anon;
grant execute on function public.quantos_rascunhos_na_semana(uuid, date, date) to authenticated;

-- O status de excluído aplicado a uma linha, com o tipo certo da coluna.
create or replace function app.marcar_excluido(p_tabela text, p_id uuid)
returns void language plpgsql set search_path = pg_catalog, public as $$
begin
  if p_tabela = 'avaliacoes' then
    update public.avaliacoes set status = 'cancelada' where id = p_id;
  else
    execute format('update public.%I set status = ''inativo'' where id = $1', p_tabela) using p_id;
  end if;
end;
$$;
grant execute on function app.marcar_excluido(text, uuid) to authenticated, service_role;

-- Aplica os rascunhos da semana (sem evento). A avaliação primeiro: as sessões novas de uma sombra passam ao salvo.
create or replace function app.aplicar_rascunhos_da_semana(p_turma uuid, p_de date, p_ate date)
returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_r      record;
  v_copia  text;
  v_total  integer := 0;
begin
  -- A marca de que quem muda o salvo é o Salvar (o gatilho `app.guardar_rascunho_do_dsa`, da M2, só deixa por aqui).
  perform set_config('app.dsa_salvando', 'sim', true);
  for v_r in
    select r.*, case r.tabela when 'avaliacoes' then 0 when 'registros_aula' then 1
                              when 'atividades_nao_letivas' then 2 when 'sessoes_de_aplicacao' then 3 else 4 end as ordem
      from app.rascunhos_da_semana(p_turma, p_de, p_ate) r
     order by ordem
  loop
    if v_r.rascunho_de is null then
      execute format('update public.%I set salvo = true where id = $1', v_r.tabela) using v_r.id;
    elsif v_r.exclui then
      perform app.marcar_excluido(v_r.tabela, v_r.id);
      perform app.marcar_excluido(v_r.tabela, v_r.rascunho_de);
    else
      -- O salvo recebe os valores da sombra (o MESMO registro, o mesmo código), sem o status; a sombra sai.
      v_copia := app.colunas_copiaveis(v_r.tabela, false);
      execute format(
        'update public.%I o set (%s) = (select %s from public.%I s where s.id = $1) where o.id = $2',
        v_r.tabela, v_copia, v_copia, v_r.tabela) using v_r.id, v_r.rascunho_de;
      if v_r.tabela = 'avaliacoes' then
        -- As sessões e as vistas novas penduradas na SOMBRA passam para a avaliação salva.
        update public.sessoes_de_aplicacao set avaliacao_id = v_r.rascunho_de where avaliacao_id = v_r.id;
        update public.vistas_de_avaliacao set avaliacao_id = v_r.rascunho_de where avaliacao_id = v_r.id;
      end if;
      perform app.marcar_excluido(v_r.tabela, v_r.id);
    end if;
    v_total := v_total + 1;
  end loop;
  perform set_config('app.dsa_salvando', '', true);
  return v_total;
end;
$$;
grant execute on function app.aplicar_rascunhos_da_semana(uuid, date, date) to authenticated, service_role;

create or replace function public.salvar_semana_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint,
                                                       p_de date, p_ate date)
returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_total integer;
begin
  if app.semana_do_dsa_travada(p_turma, p_ano, p_semana) then
    raise exception 'A semana está publicada: use «Fazer alteração».' using errcode = '23514', hint = 'semana_do_dsa_publicada';
  end if;
  v_total := app.aplicar_rascunhos_da_semana(p_turma, p_de, p_ate);
  perform app.registrar_evento_do_dsa(p_turma, p_ano, p_semana, 'salvo');
  return v_total;
end;
$$;
revoke all on function public.salvar_semana_do_dsa(uuid, smallint, smallint, date, date) from public, anon;
grant execute on function public.salvar_semana_do_dsa(uuid, smallint, smallint, date, date) to authenticated;

create or replace function public.descartar_rascunho_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint,
                                                            p_de date, p_ate date)
returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_r     record;
  v_total integer := 0;
begin
  for v_r in select * from app.rascunhos_da_semana(p_turma, p_de, p_ate) loop
    perform app.marcar_excluido(v_r.tabela, v_r.id);
    v_total := v_total + 1;
  end loop;
  perform app.registrar_evento_do_dsa(p_turma, p_ano, p_semana, 'rascunho_descartado');
  return v_total;
end;
$$;
revoke all on function public.descartar_rascunho_do_dsa(uuid, smallint, smallint, date, date) from public, anon;
grant execute on function public.descartar_rascunho_do_dsa(uuid, smallint, smallint, date, date) to authenticated;

create or replace function public.iniciar_alteracao_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint)
returns uuid
language plpgsql set search_path = pg_catalog, public as $$
begin
  if not app.semana_do_dsa_travada(p_turma, p_ano, p_semana) then
    raise exception 'A semana não está publicada.' using errcode = '23514', hint = 'semana_do_dsa_nao_publicada';
  end if;
  return app.registrar_evento_do_dsa(p_turma, p_ano, p_semana, 'alteracao_iniciada');
end;
$$;
revoke all on function public.iniciar_alteracao_do_dsa(uuid, smallint, smallint) from public, anon;
grant execute on function public.iniciar_alteracao_do_dsa(uuid, smallint, smallint) to authenticated;

/*
 * Publicar: a ORIGINAL exige a semana registrada (um «salvo» e nenhum rascunho) e nenhuma publicação antes; a ALTERAÇÃO
 * exige «alteração iniciada» aberta e justificativa — aplica os rascunhos e publica numa só ação (RP-2). O retrato é o
 * documento que a tela montou com o rascunho aplicado (o mesmo que fica salvo).
 */
create or replace function public.publicar_semana_do_dsa(p_turma uuid, p_ano smallint, p_semana smallint,
                                                         p_de date, p_ate date, p_retrato jsonb,
                                                         p_justificativa text default null)
returns smallint
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_ultimo text;
  v_numero smallint;
begin
  if jsonb_typeof(p_retrato) is distinct from 'object' then
    raise exception 'Retrato invalido' using errcode = '22023', hint = 'operacoes_invalidas';
  end if;
  select e.tipo into v_ultimo
    from public.dsa_eventos_da_semana e
   where e.turma_id = p_turma and e.ano = p_ano and e.semana = p_semana
     and e.tipo in ('publicado', 'alteracao_publicada', 'alteracao_iniciada')
   order by e.ocorrido_em desc, e.criado_em desc limit 1;

  if v_ultimo is null then
    -- D-18: salva é NÃO TER RASCUNHO — o que existe nasce salvo (RP-8); o evento «salvo» não é exigido.
    if exists (select 1 from app.rascunhos_da_semana(p_turma, p_de, p_ate)) then
      raise exception 'Salve a semana antes de publicar.' using errcode = '23514', hint = 'semana_do_dsa_nao_salva';
    end if;
    perform app.registrar_evento_do_dsa(p_turma, p_ano, p_semana, 'publicado', 0::smallint, null, p_retrato);
    return 0;
  elsif v_ultimo = 'alteracao_iniciada' then
    if length(btrim(coalesce(p_justificativa, ''))) < 10 then
      raise exception 'Escreva a justificativa da alteração (ao menos 10 caracteres).'
        using errcode = '23514', hint = 'alteracao_sem_justificativa';
    end if;
    perform app.aplicar_rascunhos_da_semana(p_turma, p_de, p_ate);
    select coalesce(max(e.numero), 0) + 1 into v_numero
      from public.dsa_eventos_da_semana e
     where e.turma_id = p_turma and e.ano = p_ano and e.semana = p_semana and e.tipo = 'alteracao_publicada';
    perform app.registrar_evento_do_dsa(p_turma, p_ano, p_semana, 'alteracao_publicada', v_numero, p_justificativa,
                                        p_retrato);
    return v_numero;
  else
    raise exception 'A semana já está publicada: use «Fazer alteração».'
      using errcode = '23514', hint = 'semana_do_dsa_publicada';
  end if;
end;
$$;
revoke all on function public.publicar_semana_do_dsa(uuid, smallint, smallint, date, date, jsonb, text) from public, anon;
grant execute on function public.publicar_semana_do_dsa(uuid, smallint, smallint, date, date, jsonb, text) to authenticated;

-- ---------------------------------------------------------------- 6. a grade da turma com o rascunho por cima
-- O corpo de `vw_ocupacao_ta` com o rascunho: o salvo sombreado por um rascunho sai, a sombra de exclusão some, e a
-- coluna `rascunho` marca o «não salvo». Só a tela e as ações do DSA leem esta view, sempre pela própria turma.
create or replace view public.vw_ocupacao_do_dsa with (security_invoker = true) as
with av as (
  -- A avaliação viva, com a marca de que há uma sombra viva dela.
  select a.*,
         exists (select 1 from public.avaliacoes s
                  where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada') as sombreada
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos, 'aula'::text as origem, r.id as fato_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id, r.instrutor_id, null::uuid as fiscal_id, r.local,
       r.origem_migracao_v1 is not null and r.editado_em is null as herdado, null::uuid as sessao_id,
       null::smallint as numero_sessao, not r.salvo as rascunho, r.rascunho_de
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo' and r.ta_inicial is not null and not r.rascunho_exclui
   and (not r.salvo or not exists (select 1 from public.registros_aula s
                                    where s.rascunho_de = r.id and not s.salvo and s.status = 'ativo'))
union all
select a.turma_id, a.data_avaliacao, a.ta_inicial, a.ta_final, a.tempos_consumidos, 'avaliacao', a.id, a.disciplina_id,
       a.instrutor_responsavel_id, a.fiscal_id, a.local, a.origem_migracao_v1 is not null and a.editado_em is null,
       null::uuid, null::smallint, not a.salvo, a.rascunho_de
  from av a
 where a.ta_inicial is not null and not a.rascunho_exclui and (not a.salvo or not a.sombreada)
union all
select coalesce(sh.turma_id, a.turma_id), p.data, p.ta_inicial, p.ta_final, p.tempos_consumidos, 'sessao_aplicacao',
       coalesce(sh.id, a.id), coalesce(sh.disciplina_id, a.disciplina_id),
       coalesce(sh.instrutor_responsavel_id, a.instrutor_responsavel_id), coalesce(sh.fiscal_id, a.fiscal_id), p.local,
       a.origem_migracao_v1 is not null and a.editado_em is null, p.id, p.numero, not p.salvo, p.rascunho_de
  from public.sessoes_de_aplicacao p
  join av a on a.id = p.avaliacao_id and not a.rascunho_exclui
  left join lateral (select s.* from public.avaliacoes s
                      where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada' limit 1) sh on true
 where p.status = 'ativo' and p.ta_inicial is not null and not p.rascunho_exclui
   and not coalesce(sh.rascunho_exclui, false)
   and (not p.salvo or not exists (select 1 from public.sessoes_de_aplicacao s
                                    where s.rascunho_de = p.id and not s.salvo and s.status = 'ativo'))
union all
select coalesce(sh.turma_id, a.turma_id), v.data, v.ta_inicial, v.ta_final, v.tempos_consumidos, 'vista_prova',
       coalesce(sh.id, a.id), coalesce(sh.disciplina_id, a.disciplina_id),
       coalesce(v.conduz_instrutor_id, sh.instrutor_responsavel_id, a.instrutor_responsavel_id),
       coalesce(sh.fiscal_id, a.fiscal_id), v.local,
       a.origem_migracao_v1 is not null and a.editado_em is null, v.id, v.numero, not v.salvo, v.rascunho_de
  from public.vistas_de_avaliacao v
  join av a on a.id = v.avaliacao_id and not a.rascunho_exclui
  left join lateral (select s.* from public.avaliacoes s
                      where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada' limit 1) sh on true
 where v.status = 'ativo' and v.ta_inicial is not null and not v.rascunho_exclui
   and not coalesce(sh.rascunho_exclui, false)
   and (not v.salvo or not exists (select 1 from public.vistas_de_avaliacao s
                                    where s.rascunho_de = v.id and not s.salvo and s.status = 'ativo'))
union all
select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos, 'atividade_nao_letiva', n.id, null::uuid,
       n.instrutor_id, null::uuid, n.local, n.origem_migracao_v1 is not null and n.editado_em is null,
       null::uuid, null::smallint, not n.salvo, n.rascunho_de
  from public.atividades_nao_letivas n
 where n.status = 'ativo' and n.ta_inicial is not null and not n.rascunho_exclui
   and (not n.salvo or not exists (select 1 from public.atividades_nao_letivas s
                                    where s.rascunho_de = n.id and not s.salvo and s.status = 'ativo'));
comment on view public.vw_ocupacao_do_dsa is
  'Bloco 9 (RP-0): a grade da turma COM o rascunho por cima — só a tela e as ações do DSA leem, pela própria turma. '
  'Soma e cruzamento leem `vw_ocupacao_ta`, que é só do salvo (RP-8).';
revoke all on public.vw_ocupacao_do_dsa from anon;
revoke insert, update, delete, truncate on public.vw_ocupacao_do_dsa from authenticated;
grant select on public.vw_ocupacao_do_dsa to authenticated;

-- ---------------------------------------------------------------- 7. a marca presencial (item 2)
alter table public.disciplinas add column presencial boolean not null default false;
comment on column public.disciplinas.presencial is
  'Bloco 9 (FR-019): a disciplina é da ETAPA PRESENCIAL da turma semipresencial. Com alguma marcada no currículo da '
  'turma, a CH prevista soma só as marcadas e a executada só o lançado na etapa presencial; sem nenhuma, conta tudo.';

create or replace view public.vw_carga_presencial_turma with (security_invoker = true) as
select t.id as turma_id,
       count(*) filter (where d.presencial)::integer as disciplinas_presenciais,
       coalesce(sum(d.carga_horaria_tempos) filter (where d.presencial), 0)::bigint as ch_presencial
  from public.turmas t
  join public.disciplinas d on d.curriculo_id = t.curriculo_id and d.status = 'ativo'
 group by t.id;
comment on view public.vw_carga_presencial_turma is
  'Bloco 9 (FR-020): a CH prevista da etapa presencial — as disciplinas marcadas do currículo da turma.';
revoke all on public.vw_carga_presencial_turma from anon;
revoke insert, update, delete, truncate on public.vw_carga_presencial_turma from authenticated;
grant select on public.vw_carga_presencial_turma to authenticated;
