-- =================================================================================
-- M4 da fatia (b) do Epico 5 — o periodo previsto POR TURMA passa a ser conferido
-- contra a janela da turma, e a disciplina nova nasce nas turmas por RPC.
--
-- ORIGEM : Q-07 (Bernardo Villas Boas, 24/09/2026) — "recusa quando o periodo sai da
--          janela de uma turma que TEM janela (paridade v2.0, spec 029). Turma sem
--          janela: aceita."; Q-08 e N-4 — "disciplina acrescentada nasce como
--          `nao_informado` nas turmas nao concluidas; so `planejada` e `ativa`;
--          cancelada nao recebe"; A-2 e A-2b (25/09/2026) — "(b) SEM gatilho de
--          nascimento. RPC `criar_disciplina` […] no molde do `criar_curso_com_regime`.
--          ETL e amostras nao mudam." e "a RPC de reativar acrescenta as linhas que
--          faltam nas turmas planejada/ativa, idempotente".
--          `FR-030.1`, `FR-070` e `FR-070.1` da spec 010.
--
-- ⚠️ POR QUE RPC E NAO GATILHO — e o achado que o `/speckit-analyze` pegou: um
--    `AFTER INSERT` em `disciplinas` dispararia TAMBEM para o ETL e para as amostras de
--    teste. A ordem de carga e `turmas` -> `disciplinas` -> `turma_disciplina`
--    (`scripts/etl/ordem.py`), e quatro arquivos pgTAP (020, 094, 097, 098) inserem
--    `turma_disciplina` explicitamente depois da disciplina: o gatilho criaria a linha
--    antes, e a insercao seguinte colidiria na unicidade `(turma_id, disciplina_id)`.
--    E a mesma classe do achado A-2 da spec 009, que ja custou o ajuste de 15 amostras.
--    Com RPC, o caminho da APLICACAO cria as linhas e o caminho da CARGA nao muda.
--
-- ⚠️ O GATILHO DA JANELA SO OLHA `origem_periodo = 'manual'`, e isso nao e conveniencia:
--    medido em 25/09/2026, QUATRO linhas de `turma_disciplina` ja tem hoje periodo fora
--    da janela da turma, herdadas do ETL. Um gatilho sem a clausula derrubaria a proxima
--    carga e impediria qualquer `UPDATE` nessas quatro. O que a Q-07 recusa e o que a
--    PESSOA informa; o que veio da grade fica, visivel no quadro de avisos da turma.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop trigger  if exists trg_turma_disciplina_janela on public.turma_disciplina;
--    drop function if exists app.trg_turma_disciplina_janela();
--    drop function if exists public.criar_disciplina(jsonb);
--    drop function if exists public.reativar_disciplina(uuid);
--    drop function if exists app.criar_disciplina(jsonb);
--    drop function if exists app.reativar_disciplina(uuid);
--    drop function if exists app.nascer_disciplina_nas_turmas(uuid, uuid);
--    As linhas de `turma_disciplina` ja criadas FICAM (regra 4).
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a janela da turma, so para o periodo informado a mao (FR-030.1)
-- ---------------------------------------------------------------------------------
create or replace function app.trg_turma_disciplina_janela()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_inicio  date;
  v_termino date;
  v_codigo  text;
begin
  -- ⚠️ So o periodo MANUAL e conferido. `herdado_grade` e `nao_informado` vem do ETL e da
  --    criacao da turma, e ja existem fora da janela em 4 linhas (medido em 25/09/2026).
  if new.origem_periodo <> 'manual' then
    return new;
  end if;

  if new.previsao_inicio is null and new.previsao_termino is null then
    return new;
  end if;

  select t.data_inicio, t.data_termino, t.codigo
    into v_inicio, v_termino, v_codigo
    from public.turmas t where t.id = new.turma_id;

  -- Turma sem janela: aceita o que foi informado (Q-07). Sem janela nao ha contra o que
  -- validar, e recusar seria inventar regra.
  if v_inicio is null or v_termino is null then
    return new;
  end if;

  if (new.previsao_inicio  is not null and (new.previsao_inicio  < v_inicio or new.previsao_inicio  > v_termino))
     or (new.previsao_termino is not null and (new.previsao_termino < v_inicio or new.previsao_termino > v_termino)) then
    raise exception 'periodo fora da janela da turma %', v_codigo
      using errcode = '23514',
            hint = 'periodo_fora_da_janela',
            detail = jsonb_build_object(
                       'turma', v_codigo,
                       'data_inicio', v_inicio,
                       'data_termino', v_termino,
                       'previsao_inicio', new.previsao_inicio,
                       'previsao_termino', new.previsao_termino)::text;
  end if;

  return new;
end;
$$;

comment on function app.trg_turma_disciplina_janela() is
  'Recusa periodo previsto fora da janela da turma — SO quando `origem_periodo = manual` '
  '(Q-07, Bernardo Villas Boas, 24/09/2026; paridade com a spec 029 da v2.0). Turma sem '
  'janela aceita. ⚠️ A clausula de origem nao e conveniencia: 4 linhas migradas ja estao '
  'fora da janela, e conferi-las derrubaria a carga do ETL.';

revoke all on function app.trg_turma_disciplina_janela() from public, anon, authenticated;

drop trigger if exists trg_turma_disciplina_janela on public.turma_disciplina;
create trigger trg_turma_disciplina_janela
  before insert or update of previsao_inicio, previsao_termino, origem_periodo
  on public.turma_disciplina
  for each row execute function app.trg_turma_disciplina_janela();

-- ---------------------------------------------------------------------------------
-- PARTE B — as linhas nascem pela RPC, nunca por gatilho (FR-070, A-2)
-- ---------------------------------------------------------------------------------
create or replace function app.nascer_disciplina_nas_turmas(p_disciplina_id uuid, p_curso_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_criadas integer;
begin
  -- ⚠️ `planejada` e `ativa` apenas (N-4, 24/09/2026): turma cancelada nao tera
  --    lancamento, e linha nova nela e ruido na LIQ; turma concluida ja fechou.
  -- ⚠️ `not exists` em vez de `on conflict`, e a razao foi MEDIDA: a unicidade
  --    `uq_turma_disciplina_ativo` e PARCIAL (`where status = 'ativo'`), e `on conflict`
  --    sobre indice parcial exige repetir o predicado — o que faria a linha INATIVA ser
  --    duplicada em vez de respeitada. Aqui, linha existente em qualquer status conta
  --    como existente, e a chamada fica idempotente de verdade (A-2b).
  insert into public.turma_disciplina (turma_id, disciplina_id, origem_periodo)
  select t.id, p_disciplina_id, 'nao_informado'
    from public.turmas t
   where t.curso_id = p_curso_id
     and t.status in ('planejada', 'ativa')
     and not exists (select 1 from public.turma_disciplina td
                      where td.turma_id = t.id and td.disciplina_id = p_disciplina_id);

  get diagnostics v_criadas = row_count;
  return v_criadas;
end;
$$;

comment on function app.nascer_disciplina_nas_turmas(uuid, uuid) is
  'Cria a linha de `turma_disciplina` da disciplina em cada turma `planejada`/`ativa` do '
  'curso, sem periodo (FR-070, Q-08, N-4). Idempotente. ⚠️ Chamada SO pelas RPCs: um '
  'gatilho `AFTER INSERT` em `disciplinas` colidiria com a ordem do ETL e com 4 amostras '
  'pgTAP (A-2, 25/09/2026). ⚠️ INVOKER, e nao DEFINER: quem decide se a linha pode nascer e a '
  'RLS de `turma_disciplina` (`disciplinas.editar` + alcance + turma em oferta), como em '
  'qualquer outra escrita. DEFINER aqui seria elevacao de privilegio disfarcada de '
  'conveniencia — quem pudesse chamar a funcao criaria linha em turma que nao alcanca.';

revoke all on function app.nascer_disciplina_nas_turmas(uuid, uuid) from public, anon;
grant execute on function app.nascer_disciplina_nas_turmas(uuid, uuid) to authenticated;

create or replace function app.criar_disciplina(p_disciplina jsonb)
returns public.disciplinas
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_id         uuid := gen_random_uuid();
  v_curso_id   uuid := (p_disciplina ->> 'curso_id')::uuid;
  v_disciplina public.disciplinas;
begin
  -- ⚠️ `INSERT` SEM `RETURNING`, e a leitura em comando separado: com alcance resolvido
  --    por funcao STABLE, o `RETURNING` nao enxerga a linha recem-inserida e a recusa
  --    chega como "new row violates row-level security policy" (gotcha 4.1). O `id` e
  --    gerado antes de proposito.
  insert into public.disciplinas (
    id, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
    ordem_sugerida, modo_atribuicao_padrao, tecnica_ensino_sugerida, local_padrao,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino)
  -- ⚠️ `semanas`, `ch_semanal` e `nome_normalizado` sao GENERATED ALWAYS e NAO entram: o
  --    PostgreSQL recusa `INSERT` sobre coluna gerada, que e exatamente a garantia do
  --    `RN-CRUD-02` — a lista de "colunas que nao se escrevem" deixou de ser lista e virou
  --    propriedade da coluna.
  values (
    v_id, v_curso_id,
    p_disciplina ->> 'cod_disciplina',
    p_disciplina ->> 'nome_disciplina',
    (p_disciplina ->> 'carga_horaria_tempos')::integer,
    (p_disciplina ->> 'ordem_sugerida')::integer,
    coalesce((p_disciplina ->> 'modo_atribuicao_padrao')::public.modo_atribuicao, 'dividido'),
    p_disciplina ->> 'tecnica_ensino_sugerida',
    p_disciplina ->> 'local_padrao',
    (p_disciplina ->> 'prioridade_alocacao_peso')::integer,
    (p_disciplina ->> 'previsao_inicio')::date,
    (p_disciplina ->> 'previsao_termino')::date);

  perform app.nascer_disciplina_nas_turmas(v_id, v_curso_id);

  select * into v_disciplina from public.disciplinas where id = v_id;
  return v_disciplina;
end;
$$;

comment on function app.criar_disciplina(jsonb) is
  'Cria a disciplina E as linhas de `turma_disciplina` das turmas planejada/ativa, na '
  'MESMA transacao (FR-070, A-2). INVOKER: a RLS de `disciplinas` decide quem cria — a '
  'RPC nao amplia permissao, so garante atomicidade. Molde: `criar_curso_com_regime`.';

revoke all on function app.criar_disciplina(jsonb) from public, anon;
grant execute on function app.criar_disciplina(jsonb) to authenticated;

create or replace function app.reativar_disciplina(p_disciplina_id uuid)
returns public.disciplinas
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_curso_id   uuid;
  v_disciplina public.disciplinas;
begin
  update public.disciplinas
     set status = 'ativo'
   where id = p_disciplina_id
  returning curso_id into v_curso_id;

  if v_curso_id is null then
    raise exception 'disciplina inexistente ou fora do alcance' using errcode = 'P0002';
  end if;

  -- ⚠️ A-2b: uma turma criada ENQUANTO a disciplina estava inativa nao tem a linha — o
  --    gatilho de nascimento da turma (FR-032.3 da spec 009) so cria para disciplina
  --    ativa. Reativar sem isto deixaria a grade da turma incompleta, em silencio.
  perform app.nascer_disciplina_nas_turmas(p_disciplina_id, v_curso_id);

  select * into v_disciplina from public.disciplinas where id = p_disciplina_id;
  return v_disciplina;
end;
$$;

comment on function app.reativar_disciplina(uuid) is
  'Reativa a disciplina e acrescenta as linhas de turma que FALTAM nas turmas '
  'planejada/ativa — uma turma criada enquanto ela estava inativa nao tem a linha '
  '(A-2b, Bernardo Villas Boas, 25/09/2026). Idempotente.';

revoke all on function app.reativar_disciplina(uuid) from public, anon;
grant execute on function app.reativar_disciplina(uuid) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE C — os espelhos em `public`
-- ---------------------------------------------------------------------------------
create or replace function public.criar_disciplina(p_disciplina jsonb)
returns public.disciplinas
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select app.criar_disciplina(p_disciplina);
$$;

create or replace function public.reativar_disciplina(p_disciplina_id uuid)
returns public.disciplinas
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select app.reativar_disciplina(p_disciplina_id);
$$;

revoke all on function public.criar_disciplina(jsonb) from public, anon;
revoke all on function public.reativar_disciplina(uuid) from public, anon;
grant execute on function public.criar_disciplina(jsonb) to authenticated, service_role;
grant execute on function public.reativar_disciplina(uuid) to authenticated, service_role;
