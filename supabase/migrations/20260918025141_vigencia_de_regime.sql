-- =================================================================================
-- Migration 6 de 7 — Epico 5, fatia (a): a vigencia de regime
-- (carimbo do arquivo em UTC; o relogio da maquina marcava 17/09/2026)
--
-- O QUE  : A. a vigencia e APPEND-ONLY — nem UPDATE de parametro, nem DELETE, nem TRUNCATE —,
--             com codigo gerado por sequencia e encadeamento conferido no fim da transacao;
--          B. o que TRAVA uma vigencia, a trava da correcao e a recusa de vigencia que
--             reinterpretaria lancamento;
--          C. as tres RPCs de escrita, `SECURITY INVOKER`, e a garantia de que curso nao existe
--             sem regime;
--          D. a RPC de leitura da protecao por atividade global, e o parametro do 9o TA.
--
-- ORIGEM : FR-019 a FR-019.5, FR-020, FR-021 a FR-021.9, FR-023, FR-024, FR-046 · RN-2027-09 ·
--          spec `009-cursos-e-turmas` · R-7, R-13, R-14, R-19.
--
-- ⚠️ A REGRA QUE ESTA MIGRATION EXISTE PARA IMPOR (RN-2027-09): *"a mudanca nunca altera a
--    interpretacao de registros ja lancados sob a configuracao anterior"*. Um DSA impresso em marco
--    foi calculado com o regime de marco; uma vigencia gravada depois, com data no passado,
--    recalcularia aquele horario EM SILENCIO — sem erro, sem aviso, sem ninguem notar.
--
-- ⚠️ APPEND-ONLY COM TRUNCATE, e nao so UPDATE e DELETE (exigencia de Bernardo Villas Boas,
--    17/09/2026). E o mesmo desenho de `curso_sigla_historico`: gatilhos de STATEMENT, porque
--    TRUNCATE nao dispara gatilho de linha nem passa pela RLS, e a `service_role` tem o privilegio.
--    E a lacuna que o `migracao_log` tem, registrada na `PEND-5a-3` — nao se repete aqui.
--    ⚠️ COM UMA DIFERENCA DELIBERADA, e ela e requisito: em `curso_sigla_historico` o gatilho de
--    statement cobre `UPDATE OR DELETE`; aqui cobre **apenas `DELETE`**. O `FR-020` manda o banco
--    aceitar, numa vigencia existente, EXATAMENTE DUAS escritas — gravar `vigente_ate` quando a
--    sucessora entra, e passar `status` a `cancelado` —, e um gatilho de statement em `UPDATE`
--    recusaria as duas. Quem guarda o `UPDATE` e o gatilho de LINHA `app.guardar_vigencia_de_regime()`,
--    que deixa passar so essas duas e recusa todo o resto, coluna por coluna. `DELETE` e `TRUNCATE`
--    nao tem caso legitimo nenhum, e por isso sao bloqueados por statement.
--
-- ⚠️ A CORRIDA (R-7, FR-021.3). Conferir que nao ha lancamento e trocar a vigencia precisam ser
--    atomicos CONTRA UM LANCAMENTO NOVO, e gravar aula nao toca a linha da vigencia. A trava e do
--    lado do lancamento, e vem de graca: inserir linha com FK exige `FOR KEY SHARE` na linha
--    referenciada, e `FOR KEY SHARE` CONFLITA com `FOR UPDATE`. Travando as turmas e o curso,
--    quem lanca espera; e `READ COMMITTED` tira retrato novo a cada comando, entao a conferencia
--    seguinte ENXERGA a aula que entrou antes. Atividade de escopo GLOBAL nao tem FK para travar —
--    dai o gatilho proprio, com trava de aconselhamento exclusiva.
-- =================================================================================

-- =================================================================================
-- PARTE A — a vigencia e append-only
-- =================================================================================

create sequence app.curso_regime_historico_codigo_seq as bigint;

do $$
declare
  v_maior bigint;
begin
  select coalesce(max(substring(codigo from 5)::bigint), 0)
    into v_maior
    from public.curso_regime_historico
   where codigo ~ '^REG-[0-9]+$';
  if v_maior = 0 then
    perform setval('app.curso_regime_historico_codigo_seq', 1, false);
  else
    perform setval('app.curso_regime_historico_codigo_seq', v_maior, true);
  end if;
end;
$$;

create or replace function app.proximo_codigo_vigencia_regime()
returns text
language sql
security definer
set search_path = pg_catalog, public
as $$
  select 'REG-' || lpad(nextval('app.curso_regime_historico_codigo_seq')::text, 6, '0');
$$;

comment on function app.proximo_codigo_vigencia_regime() is
  'FR-019.3 (R-5, R-16): devolve o proximo REG-NNNNNN. SO `nextval`. ⚠️ O prefixo REG- coincide com '
  'o de `registros_aula`, que usa 4 digitos — divergencia D-20, anotada: tela que mostrar os dois '
  'juntos MUST desambiguar.';

revoke all on function app.proximo_codigo_vigencia_regime() from public, anon;
grant execute on function app.proximo_codigo_vigencia_regime() to authenticated, service_role;

alter table public.curso_regime_historico
  alter column codigo set default app.proximo_codigo_vigencia_regime();

-- ---------------------------------------------------------------- o que se pode escrever
-- ⚠️ `SECURITY DEFINER`, e o motivo foi MEDIDO em 18/09/2026: esta funcao chama
--    `app.recusar_se_ha_lancamento()`, e o papel que grava — `authenticated` ou `service_role` —
--    NAO tem `usage` no schema `app`. Sem DEFINER, toda escrita legitima falha com
--    *permission denied for schema app*, e o erro aponta para o schema, nao para a regra.
create or replace function app.guardar_vigencia_de_regime()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_mudou text[];
begin
  -- As colunas de auditoria saem da comparacao: `app.set_auditoria()` as escreve em TODA edicao, e
  -- compara-las faria qualquer escrita legitima parecer alteracao de parametro.
  select coalesce(array_agg(chave order by chave), '{}')
    into v_mudou
    from jsonb_each_text(to_jsonb(new)) as n(chave, valor)
    join jsonb_each_text(to_jsonb(old)) as o(chave, valor) using (chave)
   where n.valor is distinct from o.valor
     and chave not in ('editado_por', 'editado_em');

  if v_mudou = '{}' then
    return new;
  end if;

  -- ESCRITA 1 — gravar `vigente_ate` quando a sucessora entra. So em vigencia ATIVA.
  if v_mudou = array['vigente_ate'] then
    if old.status <> 'ativo' then
      raise exception 'Vigencia cancelada nao recebe data de termino.'
        using errcode = '23514', hint = 'vigencia_cancelada_imutavel',
              detail = jsonb_build_object('vigencia', old.codigo)::text;
    end if;
    return new;
  end if;

  -- ESCRITA 2 — cancelar. `cancelado -> ativo` NUNCA: ressuscitar vigencia cancelada desfaria a
  -- correcao que a cancelou, e o historico deixaria de contar o que aconteceu.
  if v_mudou = array['status'] then
    if old.status = 'cancelado' then
      raise exception 'Vigencia cancelada nao volta a ativa.'
        using errcode = '23514', hint = 'vigencia_cancelada_imutavel',
              detail = jsonb_build_object('vigencia', old.codigo)::text;
    end if;
    if new.status <> 'cancelado' then
      raise exception 'A unica mudanca de situacao aceita e o cancelamento.'
        using errcode = '23514', hint = 'vigencia_cancelada_imutavel',
              detail = jsonb_build_object('vigencia', old.codigo)::text;
    end if;
    -- O cancelamento so passa sem lancamento que dependa dela, por QUALQUER caminho — e nao apenas
    -- pela acao "Corrigir esta vigencia" (FR-021.2).
    perform app.recusar_se_ha_lancamento(old.id, old.vigente_de, old.codigo);
    return new;
  end if;

  raise exception
    'Nenhum parametro de uma vigencia existente e alterado: mudanca e vigencia nova (RN-2027-09).'
    using errcode = '23514',
          hint = 'vigencia_imutavel',
          detail = jsonb_build_object('vigencia', old.codigo, 'colunas', v_mudou)::text;
end;
$$;

comment on function app.guardar_vigencia_de_regime() is
  'FR-020, FR-021.1: numa vigencia existente o banco aceita EXATAMENTE duas escritas — gravar '
  '`vigente_ate` (so em vigencia ativa) e passar `status` a `cancelado` (so sem lancamento). Todo o '
  'resto e recusado por coluna, com a lista no DETAIL. Cancelado nunca volta a ativo.';

revoke all on function app.guardar_vigencia_de_regime() from public, anon, authenticated;

-- ---------------------------------------------------------------- append-only: nem DELETE, nem TRUNCATE
revoke delete, truncate on public.curso_regime_historico from authenticated, anon;

create trigger trg_curso_regime_historico_sem_delete
  before delete on public.curso_regime_historico
  for each statement execute function app.bloquear_reescrita();

create trigger trg_curso_regime_historico_sem_truncate
  before truncate on public.curso_regime_historico
  for each statement execute function app.bloquear_reescrita();

-- ---------------------------------------------------------------- o encadeamento, no fim da transacao
create or replace function app.conferir_encadeamento_de_vigencias()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_orfa record;
begin
  -- ⚠️ ADIADO (`DEFERRABLE INITIALLY DEFERRED`) porque fechar a anterior e inserir a sucessora sao
  --    dois comandos: entre um e outro a anterior fica, legitimamente, com fim e sem sucessora.
  select h.codigo, h.vigente_ate
    into v_orfa
    from public.curso_regime_historico h
   where h.status = 'ativo'
     and h.vigente_ate is not null
     and not exists (
       select 1 from public.curso_regime_historico s
        where s.curso_id = h.curso_id
          and s.tipo_regime = h.tipo_regime
          and s.status = 'ativo'
          and s.vigente_de = h.vigente_ate + 1
     )
   limit 1;

  if found then
    raise exception
      'Vigencia encerrada sem sucessora: o curso ficaria sem regime a partir de %.', v_orfa.vigente_ate + 1
      using errcode = '23514',
            hint = 'vigencia_sem_sucessora',
            detail = jsonb_build_object('vigencia', v_orfa.codigo, 'sem_regime_a_partir_de', v_orfa.vigente_ate + 1)::text;
  end if;

  return null;
end;
$$;

revoke all on function app.conferir_encadeamento_de_vigencias() from public, anon, authenticated;

create constraint trigger trg_curso_regime_encadeamento
  after insert or update on public.curso_regime_historico
  deferrable initially deferred
  for each row execute function app.conferir_encadeamento_de_vigencias();

-- ---------------------------------------------------------------- unicidade so entre as ATIVAS
-- ⚠️ A restricao de hoje vale para TODA linha, e isso impede a correcao que MANTEM a data
--    (`FR-021.9`): a cancelada continua ocupando `(curso, tipo, vigente_de)`. Vira indice unico
--    PARCIAL, com o MESMO NOME — e o nome importa, porque e por ele que a recusa e traduzida.
alter table public.curso_regime_historico drop constraint regime_unico_por_inicio;
create unique index regime_unico_por_inicio
  on public.curso_regime_historico (curso_id, tipo_regime, vigente_de)
  where status = 'ativo';

comment on index public.regime_unico_por_inicio is
  'FR-021.9: duas vigencias ATIVAS do mesmo curso e tipo nao comecam no mesmo dia. Parcial de '
  'proposito: a cancelada mantem a data dela, e sem isso corrigir uma vigencia preservando o inicio '
  'seria impossivel.';

-- =================================================================================
-- PARTE B — o que trava, e a trava
-- =================================================================================

create or replace function app.lancamentos_que_travam_vigencia(p_vigencia_id uuid, p_desde date)
returns table (tipo text, data date, turma text, atividade text, total bigint, ponta_ausente text)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with v as (
    select curso_id from public.curso_regime_historico where id = p_vigencia_id
  ),
  achados (a_tipo, a_data, a_turma, a_atividade, a_ponta) as (
    -- ⚠️ A LISTA E A GARANTIA, E ELA ENVELHECE (FR-021.2). Toda tabela nova que passe a depender do
    --    regime entra AQUI, na mesma migration que a cria — senao o cancelamento continua sendo
    --    aprovado e isto vira falsa garantia, sem erro nenhum.
    select 'aula'::text, r.data, t.codigo, null::text, null::text
      from public.registros_aula r
      join v on v.curso_id = r.curso_id
      left join public.turmas t on t.id = r.turma_id
     where r.data >= p_desde
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
    union all
    -- A vista de prova e lancamento com horario proprio: ignora-la deixaria uma ponta do mesmo
    -- registro fora da protecao.
    select 'vista_de_prova', a.data_vista_prova, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_vista_prova >= p_desde
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
    union all
    -- ⚠️ ESCOPO GLOBAL, pelos TRES casos do FR-021.5 — pela JANELA, nunca pelo status da turma, que
    --    e mutavel e destravaria a vigencia ao virar `concluida`.
    select 'atividade_global', n.data, t.codigo, n.descricao, t.ponta
      from public.atividades_nao_letivas n
      cross join lateral (
        select tu.codigo,
               case when tu.data_inicio is not null and tu.data_termino is null then 'termino'
                    when tu.data_inicio is null and tu.data_termino is not null then 'inicio' end as ponta
          from public.turmas tu
          join v on v.curso_id = tu.curso_id
         where (tu.data_inicio is not null and tu.data_termino is not null
                and n.data between tu.data_inicio and tu.data_termino)
            or (tu.data_inicio is not null and tu.data_termino is null and n.data >= tu.data_inicio)
            or (tu.data_inicio is null and tu.data_termino is not null and n.data <= tu.data_termino)
         order by tu.codigo
         limit 1
      ) t
     where n.turma_id is null and n.data >= p_desde
  )
  -- ⚠️ As colunas da CTE levam prefixo `a_` porque os nomes de saida de `returns table` ficam em
  --    escopo aqui dentro, e `data` colidiria com `data`.
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$$;

comment on function app.lancamentos_que_travam_vigencia(uuid, date) is
  'FR-021.2: o primeiro lancamento do curso com data >= `p_desde`, nas TRES tabelas, e o total. '
  'Decidido pelo FATO, nao pela data da vigencia: medido em 16/09/2026, pela data seriam 0 de 29 '
  'corrigiveis; pelo fato sao 18 de 29. Escopo global alcanca pela JANELA da turma (FR-021.5).';

revoke all on function app.lancamentos_que_travam_vigencia(uuid, date) from public, anon;
grant execute on function app.lancamentos_que_travam_vigencia(uuid, date) to authenticated, service_role;

create or replace function app.recusar_se_ha_lancamento(p_vigencia_id uuid, p_desde date, p_codigo text)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v record;
begin
  select * into v from app.lancamentos_que_travam_vigencia(p_vigencia_id, p_desde);
  if found then
    raise exception
      'Esta vigencia ja tem % lancamento(s) que dependem dela.', v.total
      using errcode = '23514',
            hint = 'vigencia_com_lancamento',
            detail = jsonb_build_object(
                       'vigencia', p_codigo, 'tipo', v.tipo, 'data', v.data, 'turma', v.turma,
                       'atividade', v.atividade, 'total', v.total, 'ponta_ausente', v.ponta_ausente
                     )::text;
  end if;
end;
$$;

revoke all on function app.recusar_se_ha_lancamento(uuid, date, text) from public, anon, authenticated;

create or replace function app.travar_curso_para_correcao(p_curso_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  -- A ORDEM E DO R-7, e cada passo tem motivo:
  -- 1. as TURMAS do curso, por `id`, `FOR UPDATE` — e `FOR UPDATE` conflita com o `FOR KEY SHARE`
  --    que todo INSERT com FK tira na linha referenciada. E assim que quem lanca espera.
  for v_id in select id from public.turmas where curso_id = p_curso_id order by id loop
    perform 1 from public.turmas where id = v_id for update;
  end loop;

  -- 2. a linha do CURSO — `registros_aula` e `avaliacoes` referenciam o curso diretamente.
  perform 1 from public.cursos where id = p_curso_id for update;

  -- 3. a trava de aconselhamento COMPARTILHADA da atividade global: duas correcoes nao se
  --    bloqueiam entre si, mas qualquer uma bloqueia e e bloqueada por uma atividade global,
  --    que nao tem FK para travar.
  perform pg_advisory_xact_lock_shared(hashtext('atividade_global'));
end;
$$;

comment on function app.travar_curso_para_correcao(uuid) is
  'FR-021.3 (R-7): trava turmas -> curso -> aconselhamento compartilhado, nesta ordem. '
  'SECURITY DEFINER para travar TODAS as linhas do curso, e nao so as que a RLS deixa a pessoa ver. '
  '⚠️ Impasse (40P01) e risco declarado e aceito: um lancamento pode travar a turma antes do curso. '
  'O motor detecta e aborta uma das duas, e a Server Action traduz em "tente de novo".';

revoke all on function app.travar_curso_para_correcao(uuid) from public, anon;
grant execute on function app.travar_curso_para_correcao(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- vigencia nova nao reinterpreta
-- ⚠️ `SECURITY DEFINER` pelo mesmo motivo da funcao acima: ela chama `app.travar_curso_para_correcao()`
--    e `app.lancamentos_que_travam_vigencia()`, e quem grava nao alcanca o schema `app`.
create or replace function app.conferir_vigencia_nova()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v record;
begin
  perform app.travar_curso_para_correcao(new.curso_id);

  select * into v
    from app.lancamentos_que_travam_vigencia(new.id, new.vigente_de);

  if found then
    raise exception
      'Uma vigencia a partir de % mudaria o horario de % lancamento(s) ja gravado(s).',
      new.vigente_de, v.total
      using errcode = '23514',
            hint = 'vigencia_reinterpretaria_lancamento',
            detail = jsonb_build_object(
                       'vigente_de', new.vigente_de, 'tipo', v.tipo, 'ultimo_lancamento', v.data,
                       'turma', v.turma, 'atividade', v.atividade, 'total', v.total,
                       'ponta_ausente', v.ponta_ausente
                     )::text;
  end if;

  return new;
end;
$$;

comment on function app.conferir_vigencia_nova() is
  'FR-019.4: recusa vigencia nova cujo periodo contenha lancamento ja gravado do curso. A RN-2027-09 '
  'imposta TAMBEM no registro, e nao so na correcao: sem isto, uma vigencia com data no passado '
  'recalcula EM SILENCIO o horario de DSAs ja distribuidos. Vigencia futura nunca encontra lancamento.';

revoke all on function app.conferir_vigencia_nova() from public, anon, authenticated;

-- ⚠️ `AFTER INSERT`, e nao `BEFORE`: a funcao consulta `app.lancamentos_que_travam_vigencia(new.id, …)`,
--    que resolve o curso PELA PROPRIA LINHA — que precisa existir. `AFTER` roda antes do fim do
--    comando, e a recusa desfaz a insercao do mesmo jeito.
create trigger trg_curso_regime_vigencia_nova
  after insert on public.curso_regime_historico
  for each row execute function app.conferir_vigencia_nova();

create trigger trg_curso_regime_guardar
  before update on public.curso_regime_historico
  for each row execute function app.guardar_vigencia_de_regime();

-- ---------------------------------------------------------------- a atividade global, do outro lado
create or replace function app.travar_atividade_global()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Atividade de escopo global nao referencia turma nenhuma, entao nao tira `FOR KEY SHARE` de
  -- nada — e escaparia da trava da correcao. Aqui ela pega a MESMA chave, em modo EXCLUSIVO.
  if new.turma_id is null then
    perform pg_advisory_xact_lock(hashtext('atividade_global'));
  end if;
  return new;
end;
$$;

comment on function app.travar_atividade_global() is
  'FR-021.7 (R-7, B-4): atividade de escopo global pega a trava de aconselhamento EXCLUSIVA que a '
  'correcao de vigencia pega em modo compartilhado. Toca tabela do Epico 9 de proposito, e so isso: '
  'nenhuma regra de atividade muda.';

revoke all on function app.travar_atividade_global() from public, anon, authenticated;

create trigger trg_atividades_travar_global
  before insert on public.atividades_nao_letivas
  for each row execute function app.travar_atividade_global();

-- =================================================================================
-- PARTE C — as tres RPCs de escrita, e o curso que nao existe sem regime
-- =================================================================================

create or replace function app.conferir_curso_com_regime()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  -- ⚠️ `to_jsonb(new)`, e nao `new.curso_id`: o MESMO gatilho serve a duas tabelas, e o PL/pgSQL
  --    resolve o campo do registro na INICIALIZACAO da variavel, antes de avaliar o `case` — com
  --    `new.curso_id` a funcao quebra em toda insercao de `cursos` com *record "new" has no field*.
  --    Medido em 17/09/2026, antes de escrever o teste.
  v_curso uuid := case when tg_table_name = 'cursos'
                       then (to_jsonb(new) ->> 'id')::uuid
                       else (to_jsonb(new) ->> 'curso_id')::uuid end;
  v_codigo text;
begin
  if not exists (
    select 1 from public.curso_regime_historico
     where curso_id = v_curso and tipo_regime = 'padrao' and status = 'ativo'
  ) then
    select codigo into v_codigo from public.cursos where id = v_curso;
    raise exception 'Todo curso tem regime de horario.'
      using errcode = '23514',
            hint = 'curso_sem_regime',
            detail = jsonb_build_object('curso', v_codigo)::text;
  end if;
  return null;
end;
$$;

comment on function app.conferir_curso_com_regime() is
  'FR-019.5 [B-15]: no FIM DA TRANSACAO, todo curso tem vigencia `padrao` ativa. Adiado para que '
  'criar curso e vigencia juntos passe; alcanca tambem o CANCELAMENTO da unica padrao sem sucessora '
  'na mesma transacao. "Se e consequencia estrutural, o banco garante, nao apenas executa."';

revoke all on function app.conferir_curso_com_regime() from public, anon, authenticated;

create constraint trigger trg_cursos_com_regime
  after insert on public.cursos
  deferrable initially deferred
  for each row execute function app.conferir_curso_com_regime();

create constraint trigger trg_regime_curso_continua_com_regime
  after update of status on public.curso_regime_historico
  deferrable initially deferred
  for each row execute function app.conferir_curso_com_regime();

-- ---------------------------------------------------------------- 1. registrar vigencia nova
create or replace function public.registrar_vigencia_regime(p_curso_id uuid, p_vigencia jsonb)
returns public.curso_regime_historico
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_de date := (p_vigencia ->> 'vigente_de')::date;
  v_tipo public.tipo_regime := coalesce((p_vigencia ->> 'tipo_regime')::public.tipo_regime, 'padrao');
  v_anterior public.curso_regime_historico;
  v_nova public.curso_regime_historico;
begin
  perform app.travar_curso_para_correcao(p_curso_id);

  -- A sucessao e EXPLICITA (R-19): a anterior recebe a vespera da nova como `vigente_ate`, nesta
  -- mesma transacao. Sem isso, a `EXCLUDE` de sobreposicao recusaria a nova com `23P01` — que e o
  -- comportamento que o `040_vigencia.sql` do Epico 1 assere, e que continua valendo para quem
  -- inserir solto.
  select * into v_anterior
    from public.curso_regime_historico
   where curso_id = p_curso_id and tipo_regime = v_tipo and status = 'ativo'
     and vigente_de < v_de and (vigente_ate is null or vigente_ate >= v_de)
   order by vigente_de desc
   limit 1;

  if found then
    update public.curso_regime_historico
       set vigente_ate = v_de - 1
     where id = v_anterior.id;
  end if;

  insert into public.curso_regime_historico (
    curso_id, tipo_regime, configuracao_horario_id, regime_tempos, ta_duracao_min,
    intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde,
    limite_diario_ead_horas, vigente_de, vigente_ate, fundamento_curricular, motivo
  )
  select p_curso_id, v_tipo, (p_vigencia ->> 'configuracao_horario_id')::uuid,
         (p_vigencia ->> 'regime_tempos')::smallint, (p_vigencia ->> 'ta_duracao_min')::smallint,
         (p_vigencia ->> 'intervalo_manha_min')::smallint, (p_vigencia ->> 'intervalo_tarde_min')::smallint,
         (p_vigencia ->> 'hora_inicio_manha')::time, (p_vigencia ->> 'hora_inicio_tarde')::time,
         (p_vigencia ->> 'limite_diario_ead_horas')::numeric, v_de,
         (p_vigencia ->> 'vigente_ate')::date,
         p_vigencia ->> 'fundamento_curricular', p_vigencia ->> 'motivo'
  returning * into v_nova;

  return v_nova;
end;
$$;

comment on function public.registrar_vigencia_regime(uuid, jsonb) is
  'FR-019, FR-024 (R-19): fecha a anterior e insere a nova NUMA TRANSACAO. SECURITY INVOKER — a RLS '
  'de `horarios` e a matriz continuam decidindo. Chamadas separadas pela aplicacao nao sao uma '
  'transacao (Principio XI.5).';

revoke all on function public.registrar_vigencia_regime(uuid, jsonb) from public, anon;
grant execute on function public.registrar_vigencia_regime(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------- 2. corrigir vigencia
create or replace function public.corrigir_vigencia_regime(p_vigencia_id uuid, p_sucessora jsonb)
returns public.curso_regime_historico
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_atual public.curso_regime_historico;
  v_de date;
  v_nova public.curso_regime_historico;
begin
  select * into v_atual from public.curso_regime_historico where id = p_vigencia_id;
  if not found then
    raise exception 'Vigencia nao encontrada.' using errcode = 'P0002', hint = 'vigencia_inexistente';
  end if;

  -- 1. trava, 2. confere, 3. cancela, 4. insere — nesta ordem, numa transacao (FR-021.3).
  perform app.travar_curso_para_correcao(v_atual.curso_id);
  perform 1 from public.curso_regime_historico where id = p_vigencia_id for update;

  -- ⚠️ A MENOR entre a data antiga e a nova: a correcao pode mudar `vigente_de`, e a janela que ela
  --    de fato mexe comeca na mais antiga das duas (R-7).
  v_de := least(v_atual.vigente_de, coalesce((p_sucessora ->> 'vigente_de')::date, v_atual.vigente_de));
  perform app.recusar_se_ha_lancamento(p_vigencia_id, v_de, v_atual.codigo);

  update public.curso_regime_historico set status = 'cancelado' where id = p_vigencia_id;

  insert into public.curso_regime_historico (
    curso_id, tipo_regime, configuracao_horario_id, regime_tempos, ta_duracao_min,
    intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde,
    limite_diario_ead_horas, vigente_de, vigente_ate, fundamento_curricular, motivo
  )
  select v_atual.curso_id, v_atual.tipo_regime,
         coalesce((p_sucessora ->> 'configuracao_horario_id')::uuid, v_atual.configuracao_horario_id),
         coalesce((p_sucessora ->> 'regime_tempos')::smallint, v_atual.regime_tempos),
         coalesce((p_sucessora ->> 'ta_duracao_min')::smallint, v_atual.ta_duracao_min),
         coalesce((p_sucessora ->> 'intervalo_manha_min')::smallint, v_atual.intervalo_manha_min),
         coalesce((p_sucessora ->> 'intervalo_tarde_min')::smallint, v_atual.intervalo_tarde_min),
         coalesce((p_sucessora ->> 'hora_inicio_manha')::time, v_atual.hora_inicio_manha),
         coalesce((p_sucessora ->> 'hora_inicio_tarde')::time, v_atual.hora_inicio_tarde),
         coalesce((p_sucessora ->> 'limite_diario_ead_horas')::numeric, v_atual.limite_diario_ead_horas),
         coalesce((p_sucessora ->> 'vigente_de')::date, v_atual.vigente_de),
         v_atual.vigente_ate,
         coalesce(p_sucessora ->> 'fundamento_curricular', v_atual.fundamento_curricular),
         coalesce(p_sucessora ->> 'motivo', v_atual.motivo)
  returning * into v_nova;

  return v_nova;
end;
$$;

comment on function public.corrigir_vigencia_regime(uuid, jsonb) is
  'FR-021.1, FR-021.3: trava, confere, cancela e insere a sucessora NUMA TRANSACAO — ou as duas '
  'escritas acontecem, ou nenhuma. Para quem usa, parece edicao; para o banco, e append-only.';

revoke all on function public.corrigir_vigencia_regime(uuid, jsonb) from public, anon;
grant execute on function public.corrigir_vigencia_regime(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------- 3. criar curso com regime
create or replace function public.criar_curso_com_regime(p_curso jsonb, p_regime jsonb)
returns public.cursos
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_id    uuid := gen_random_uuid();
  v_curso public.cursos;
begin
  -- ⚠️ SEM `RETURNING`, E O MOTIVO FOI MEDIDO EM 18/09/2026 — e e o tipo de coisa que so aparece
  --    rodando. `INSERT … RETURNING` exige que a linha passe TAMBEM pela policy de LEITURA, e a de
  --    `cursos` e `app.pode('cursos','ler') AND app.alcanca_curso(id)`. `app.alcanca_curso` e
  --    `STABLE` e resolve por `app.cursos_do_usuario()`: dentro do MESMO comando, a linha recem
  --    inserida ainda nao esta no retrato que ela enxerga, entao o alcance da FALSO e o `RETURNING`
  --    e recusado com *new row violates row-level security policy* — mensagem que aponta para a
  --    ESCRITA e faz perder tempo procurando permissao de criar, que esta correta.
  --    O id e gerado aqui, a insercao nao devolve nada, e a leitura vem num comando SEPARADO, que
  --    tira retrato novo e ja enxerga o curso.
  insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, proposito,
                             limite_turmas_ano, duracao_semanas, duracao_dias)
  values (v_id, p_curso ->> 'codigo', p_curso ->> 'nome_curso',
          (p_curso ->> 'classificacao')::public.escopo_curso,
          (p_curso ->> 'modalidade')::public.modalidade_ensino,
          p_curso ->> 'proposito',
          (p_curso ->> 'limite_turmas_ano')::smallint,
          (p_curso ->> 'duracao_semanas')::numeric,
          (p_curso ->> 'duracao_dias')::integer);

  select * into v_curso from public.cursos where id = v_id;

  insert into public.curso_regime_historico (
    curso_id, tipo_regime, configuracao_horario_id, regime_tempos, ta_duracao_min,
    intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde,
    limite_diario_ead_horas, vigente_de, fundamento_curricular, motivo
  )
  values (v_id, 'padrao', (p_regime ->> 'configuracao_horario_id')::uuid,
          (p_regime ->> 'regime_tempos')::smallint, (p_regime ->> 'ta_duracao_min')::smallint,
          (p_regime ->> 'intervalo_manha_min')::smallint, (p_regime ->> 'intervalo_tarde_min')::smallint,
          (p_regime ->> 'hora_inicio_manha')::time, (p_regime ->> 'hora_inicio_tarde')::time,
          (p_regime ->> 'limite_diario_ead_horas')::numeric,
          (p_regime ->> 'vigente_de')::date,
          p_regime ->> 'fundamento_curricular', p_regime ->> 'motivo');

  return v_curso;
end;
$$;

comment on function public.criar_curso_com_regime(jsonb, jsonb) is
  'FR-019.5 [B-15]: o UNICO caminho de criacao de curso pela tela. Curso e vigencia `padrao` so '
  'existem juntos, e o gatilho adiado `trg_cursos_com_regime` recusa no COMMIT quem tentar so o curso.';

revoke all on function public.criar_curso_com_regime(jsonb, jsonb) from public, anon;
grant execute on function public.criar_curso_com_regime(jsonb, jsonb) to authenticated, service_role;

-- =================================================================================
-- PARTE D — a leitura da protecao, e o parametro do 9o TA
-- =================================================================================

create or replace function public.protecao_das_vigencias_por_atividade_global(p_curso_id uuid)
returns table (vigencia text, vigente_de date, travada_por_lancamento_proprio boolean,
               atividade text, data_atividade date, turmas text[])
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  -- ⚠️ PORTEIRO NA PROPRIA CONSULTA: `SECURITY DEFINER` aqui existe para enxergar atividade e turma
  --    que a RLS talvez nao mostre a quem edita — e nao para furar o alcance. Sem `turmas.editar` e
  --    sem alcance do curso, devolve VAZIO.
  select h.codigo, h.vigente_de,
         exists (select 1 from app.lancamentos_que_travam_vigencia(h.id, h.vigente_de) l
                  where l.tipo <> 'atividade_global') as travada_por_lancamento_proprio,
         g.descricao, g.data,
         array(select tu.codigo from public.turmas tu
                where tu.curso_id = p_curso_id
                  and ((tu.data_inicio is not null and tu.data_termino is not null
                        and g.data between tu.data_inicio and tu.data_termino)
                    or (tu.data_inicio is not null and tu.data_termino is null and g.data >= tu.data_inicio)
                    or (tu.data_inicio is null and tu.data_termino is not null and g.data <= tu.data_termino))
                order by tu.codigo)
    from public.curso_regime_historico h
    left join lateral (
      select n.descricao, n.data
        from public.atividades_nao_letivas n
       where n.turma_id is null
         and n.data >= h.vigente_de
         and exists (select 1 from public.turmas tu
                      where tu.curso_id = p_curso_id
                        and ((tu.data_inicio is not null and tu.data_termino is not null
                              and n.data between tu.data_inicio and tu.data_termino)
                          or (tu.data_inicio is not null and tu.data_termino is null and n.data >= tu.data_inicio)
                          or (tu.data_inicio is null and tu.data_termino is not null and n.data <= tu.data_termino)))
       order by n.data
       limit 1
    ) g on true
   where h.curso_id = p_curso_id
     and h.status = 'ativo'
     and g.data is not null
     and app.pode('turmas', 'editar')
     and app.alcanca_curso(p_curso_id)
   order by h.vigente_de;
$$;

comment on function public.protecao_das_vigencias_por_atividade_global(uuid) is
  'FR-021.8 [B-5, opcao C]: para cada vigencia ativa do curso travada por atividade de escopo GLOBAL, '
  'qual atividade, em que data e por quais turmas ela alcanca — e se a vigencia ja esta travada por '
  'lancamento PROPRIO, caso em que encurtar a janela nao a desprotege. Leitura: a decisao de avisar e '
  'de `lib/dominio/`, porque a janela nova so existe no formulario.';

revoke all on function public.protecao_das_vigencias_por_atividade_global(uuid) from public, anon;
grant execute on function public.protecao_das_vigencias_por_atividade_global(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- o 9o TA
-- ⚠️ NATUREZA `operacional`, e nao `normativo` (B-16, 17/09/2026): o NUMERO e decisao da Divisao; a
--    norma que ele parametriza, o `RF-HOR-03.1`, fica no fundamento. Se fosse `normativo`, o CHECK
--    `config_param_normativo_tem_fundamento` exigiria fundamento — e o fundamento seria a norma, o
--    que faria o numero parecer normativo, que e exatamente o que ele nao e.
insert into public.config_parametros (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo)
values ('regime.nono_ta_dias_por_semana_sem_aviso', '2', 'inteiro', 'dias/semana', 'operacional',
        'Ate quantos dias por semana ISO o 9o Tempo de Aula pode ser usado sem gerar aviso. '
        'Decisao de Bernardo Villas Boas, 17/09/2026. A partir do terceiro dia, aviso informativo — '
        'NUNCA bloqueio (RN-DEG-02, regra 6 do CLAUDE.md).',
        'RF-HOR-03.1 — o 9o TA e autorizacao normativa explicita nos curriculos de CAHO, C-Ap-HN e '
        'C-Ap-FR (RNF-NORM-01). Bloquea-lo contrariaria a norma que o autoriza.')
on conflict do nothing;

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 18/09/2026, numa base descartavel (T049)
--
-- CONFERIDO DEPOIS DA REVERSAO: curso solto volta a ser aceito (`REV6-SOLTO`), parametro de vigencia
-- volta a ser editavel por `UPDATE` direto, e os 23 arquivos pgTAP anteriores ficaram verdes — so o
-- `104` reprova, que e o esperado dele. A restauracao da unicidade PASSOU porque a base tinha
-- **0 pares** (curso, tipo, `vigente_de`) repetidos; num banco onde uma correcao tenha preservado a
-- data, ela FALHA — e falhar ali e o certo, ver a nota abaixo.
--
--   drop trigger if exists trg_atividades_travar_global on public.atividades_nao_letivas;
--   drop trigger if exists trg_regime_curso_continua_com_regime on public.curso_regime_historico;
--   drop trigger if exists trg_cursos_com_regime on public.cursos;
--   drop trigger if exists trg_curso_regime_guardar on public.curso_regime_historico;
--   drop trigger if exists trg_curso_regime_vigencia_nova on public.curso_regime_historico;
--   drop trigger if exists trg_curso_regime_encadeamento on public.curso_regime_historico;
--   drop trigger if exists trg_curso_regime_historico_sem_delete on public.curso_regime_historico;
--   drop trigger if exists trg_curso_regime_historico_sem_truncate on public.curso_regime_historico;
--   drop function if exists public.protecao_das_vigencias_por_atividade_global(uuid);
--   drop function if exists public.criar_curso_com_regime(jsonb, jsonb);
--   drop function if exists public.corrigir_vigencia_regime(uuid, jsonb);
--   drop function if exists public.registrar_vigencia_regime(uuid, jsonb);
--   drop function if exists app.conferir_curso_com_regime();
--   drop function if exists app.travar_atividade_global();
--   drop function if exists app.conferir_vigencia_nova();
--   drop function if exists app.travar_curso_para_correcao(uuid);
--   drop function if exists app.recusar_se_ha_lancamento(uuid, date, text);
--   drop function if exists app.lancamentos_que_travam_vigencia(uuid, date);
--   drop function if exists app.guardar_vigencia_de_regime();
--   drop function if exists app.conferir_encadeamento_de_vigencias();
--   alter table public.curso_regime_historico alter column codigo drop default;
--   drop function if exists app.proximo_codigo_vigencia_regime();
--   drop sequence if exists app.curso_regime_historico_codigo_seq;
--   update public.config_parametros set status = 'inativo'
--    where chave = 'regime.nono_ta_dias_por_semana_sem_aviso';
--
--   -- ⚠️ A UNICIDADE VOLTA A VALER PARA TODA LINHA, e isso PODE FALHAR: se a correcao tiver criado
--   --    uma sucessora com a MESMA data da cancelada (FR-021.9), as duas ocupam
--   --    (curso, tipo, vigente_de) e o `add constraint` recusa. **Falhar ali e o certo**: a reversao
--   --    para e relata quais sao os pares, e quem reverte decide — reverter nao pode apagar vigencia.
--   drop index if exists public.regime_unico_por_inicio;
--   alter table public.curso_regime_historico
--     add constraint regime_unico_por_inicio unique (curso_id, tipo_regime, vigente_de);
--
-- ⚠️ AS VIGENCIAS REGISTRADAS FICAM. Elas sao o regime real dos cursos, e apaga-las seria reverter
--    dado, nao migration. E o parametro do 9o TA vai a `inativo`, nao e apagado (regra 4).
--
-- ⚠️ REVERTER DEVOLVE O BURACO INTEIRO: parametro de vigencia volta a ser editavel por `UPDATE`
--    direto, curso volta a poder existir sem regime, e vigencia com data no passado volta a
--    recalcular DSA ja distribuido — em silencio.
-- =================================================================================
