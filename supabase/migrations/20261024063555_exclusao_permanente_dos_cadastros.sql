-- =================================================================================
-- Bloco 10 (spec 025) — a EXCLUSAO PERMANENTE dos cadastros sem registro: turma e
-- linha do calendario (D-COR-6), regime de horario, item de avaliacao do curriculo e
-- sala (D-30), e a correcao dos impedimentos antigos de instrutor, disciplina e UE
-- (D-32), com uma rede de seguranca lida no catalogo.
--
-- ORIGEM : pedido de Bernardo Villas Boas, 24/10/2026 — RT-2 ("tudo que se cadastra
--          tem Editar, Desativar/Reativar e Excluir (permanente, com alerta)") e
--          D-COR-6 ("Excluir turma e Excluir feriado so habilitados sem semana
--          salva/publicada ligada; com registros, icone desabilitado com dica 'tem
--          registros: use Arquivar/Desativar'"). Spec 025, §6 e D-9 a D-13, D-30, D-32.
--
-- ⚠️ PORTAO 9.4: esta migration MUDA A REGRA 4 do CLAUDE.md (a RN-INST-05
--    generalizada, "nada e apagado") e passa a apagar dado quando chamada. Ela fica
--    pronta e testada no PR; o remoto ESPERA BERNARDO VER O DESENHO (spec 025, §6).
--
-- ⚠️ O MOLDE E O DE 20260925135044 (disciplina e UE): par `app.*` DEFINER + espelho
--    `public.*` INVOKER, porteiro por `app.pode(...)` (devolve false explicito — gotcha
--    15), alcance do curso, CODIGO DIGITADO conferido no banco, `23503` com a lista do
--    que prende, e o RASTRO em `exclusoes_registradas` gravado ANTES do DELETE.
--
-- ⚠️ CONTINUA SEM POLICY E SEM PRIVILEGIO DE DELETE para `authenticated` (a asserção
--    que conta `pg_policy.polcmd = 'd'` segue em zero): quem apaga sao as funcoes
--    SECURITY DEFINER, e so o registro SEM HISTORICO.
--
-- ⚠️ O ALCANCE REAL, declarado como na emenda de 03/10/2026 da regra 4: alem das
--    tabelas do registro (`turmas`, `feriados`, `regimes_de_horario`,
--    `avaliacoes_curriculo`, `config_listas` com `lista = 'salas'`), a exclusao da
--    turma apaga a ESTRUTURA dela — `turma_disciplina` (nasce com a turma),
--    `turma_disciplina_instrutor`, `turma_disciplina_unidade` e as ligacoes INATIVAS de
--    `feriado_turma` —, e a do feriado apaga a abrangencia dele (`feriado_turma`). Tudo
--    vai no RETRATO do rastro.
--
-- REVERSAO — `specs/025-bloco-10-padroes-de-tela/reversao.sql`, PROVADA em 24/10/2026 numa
--    transacao desfeita no banco local: a impressao digital do esquema
--    (`scripts/provas/impressao_digital_do_esquema.sql`) vai de 2.637 objetos `5ab2b13b...`
--    (com esta migration) a 2.573 objetos `80345112...` — a mesma do remoto depois do
--    Bloco 9. Em resumo:
--    drop function public.excluir_turma(uuid, text), public.excluir_feriado(uuid, text),
--      public.excluir_regime_de_horario(uuid, text),
--      public.excluir_item_de_avaliacao_do_curriculo(uuid, text),
--      public.excluir_sala(uuid, text), e os `public.impedimentos_*` novos;
--    drop function app.excluir_*, app.impedimentos_de_exclusao_* novos,
--      app.registros_da_turma, app.registros_do_feriado, app.registros_do_regime,
--      app.registros_do_item, app.registros_da_sala, app.referencias_por_fk;
--    os tres impedimentos antigos voltam ao corpo de 20260915140100 e 20260925135044;
--    a restricao `exclusoes_tabela_permitida` volta a lista de tres — SO se nenhuma
--    exclusao das tabelas novas tiver acontecido: com linha, o rastro FICA e a
--    restricao continua aceitando-a (apagar rastro e o que a regra 4 existe para
--    impedir).
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o rastro aceita as tabelas novas
-- ---------------------------------------------------------------------------------
alter table public.exclusoes_registradas drop constraint exclusoes_tabela_permitida;
alter table public.exclusoes_registradas add constraint exclusoes_tabela_permitida
  check (tabela in ('instrutores', 'disciplinas', 'unidades_ensino', 'turmas', 'feriados',
                    'regimes_de_horario', 'avaliacoes_curriculo', 'config_listas'));

comment on column public.exclusoes_registradas.tabela is
  'A lista e a da regra 4 emendada (24/09/2026, D-B1; 24/10/2026, D-COR-6 e D-30 da spec '
  '025), e o CHECK e o que impede a tabela de virar deposito de exclusao de qualquer coisa. '
  '`config_listas` so recebe a sala (codigo `salas:<nome>`).';

-- ---------------------------------------------------------------------------------
-- PARTE B — a rede de seguranca: toda FK que aponta para o registro prende
--
-- ⚠️ NASCEU DO DEFEITO DA §3.1 DA SPEC 025: os impedimentos de instrutor, disciplina e
--    UE foram escritos antes de FKs que hoje os prendem, e a funcao dizia "sem
--    impedimento" — o DELETE esbarrava na FK e a tela dizia a frase errada. Lida no
--    CATALOGO, a rede pega tambem a FK que nascer depois. Ela vem DEPOIS das
--    conferencias nomeadas, e so diz o que nenhuma nomeou (`p_ignorar`), pelo nome da
--    tabela.
-- ⚠️ FK COMPOSTA ENTRA: o par de colunas cujo alvo e `id` e o que se confere.
-- ---------------------------------------------------------------------------------
create or replace function app.referencias_por_fk(
  p_tabela  regclass,
  p_ids     uuid[],
  p_ignorar text[] default array[]::text[]
)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  r        record;
  v_ha     boolean;
  v_achou  text[] := array[]::text[];
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return v_achou;
  end if;

  for r in
    select distinct c.conrelid::regclass::text as tabela, a.attname::text as coluna
      from pg_constraint c
      cross join lateral unnest(c.conkey, c.confkey) as k(local, alvo)
      join pg_attribute alvo on alvo.attrelid = c.confrelid and alvo.attnum = k.alvo
      join pg_attribute a    on a.attrelid    = c.conrelid  and a.attnum    = k.local
     where c.contype = 'f'
       and c.confrelid = p_tabela
       and alvo.attname = 'id'
       and not (c.conrelid::regclass::text = any (coalesce(p_ignorar, array[]::text[])))
     order by 1, 2
  loop
    if r.tabela = any (v_achou) then
      continue;
    end if;
    execute format('select exists (select 1 from %s where %I = any ($1))', r.tabela, r.coluna)
      into v_ha using p_ids;
    if v_ha then
      v_achou := array_append(v_achou, r.tabela);
    end if;
  end loop;

  return v_achou;
end;
$$;

comment on function app.referencias_por_fk(regclass, uuid[], text[]) is
  'Bloco 10 (spec 025, D-32): as tabelas que tem linha apontando, por FK, para algum dos '
  '`id`s — lidas no catalogo, para que a FK que nascer depois tambem prenda a exclusao. '
  'Interna: chamada so pelas funcoes de impedimento, que sao SECURITY DEFINER.';

revoke all on function app.referencias_por_fk(regclass, uuid[], text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE C — a TURMA (D-COR-6; D-9, D-10)
--
-- ⚠️ "REGISTRO" (impede): lancamento, a trilha do DSA, as trocas de situacao, os
--    arquivamentos, o previsto do PROENS (e a trilha dele), o planejamento anual, as
--    avaliacoes do curriculo da turma (e as arbitragens), a abrangencia de feriado de
--    turmas escolhidas — apagar essa linha ALARGARIA o feriado para todas as turmas — e
--    o arquivo de avaliacoes da v2.0 pelo codigo. A ESTRUTURA (as linhas da grade, que
--    nascem com a turma, as atribuicoes e o rateio) sai junto e nao e impedimento.
-- ⚠️ AS TRILHAS SEM FK (`turma_trocas_de_situacao`, `turma_arquivamentos`,
--    `previstos_proens_alteracoes`, `avaliacoes_curriculo_arbitragens`) sao conferidas
--    pelo nome: a rede, que le FK, nao as veria.
-- ---------------------------------------------------------------------------------
create or replace function app.registros_da_turma(p_turma_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo  text;
  v_linhas  uuid[];
  v_atrib   uuid[];
  v         text[] := array[]::text[];
begin
  select t.codigo into v_codigo from public.turmas t where t.id = p_turma_id;

  if exists (select 1 from public.registros_aula r where r.turma_id = p_turma_id) then
    v := array_append(v, 'aula_lancada');
  end if;
  if exists (select 1 from public.avaliacoes a where a.turma_id = p_turma_id) then
    v := array_append(v, 'avaliacao');
  end if;
  if exists (select 1 from public.atividades_nao_letivas a where a.turma_id = p_turma_id) then
    v := array_append(v, 'atividade');
  end if;
  if exists (select 1 from public.dias_parados d where d.turma_id = p_turma_id) then
    v := array_append(v, 'dia_parado');
  end if;
  if exists (select 1 from public.ta_fora_do_dsa f where f.turma_id = p_turma_id) then
    v := array_append(v, 'ta_fora_do_dsa');
  end if;
  if exists (select 1 from public.dsa_eventos_da_semana e where e.turma_id = p_turma_id) then
    v := array_append(v, 'semana_do_dsa');
  end if;
  if exists (select 1 from public.turma_trocas_de_situacao s where s.turma_id = p_turma_id) then
    v := array_append(v, 'troca_de_situacao');
  end if;
  if exists (select 1 from public.turma_arquivamentos a where a.turma_id = p_turma_id) then
    v := array_append(v, 'arquivamento');
  end if;
  if exists (select 1 from public.previstos_proens_turma p where p.turma_id = p_turma_id)
     or exists (select 1 from public.previstos_proens_alteracoes p where p.turma_id = p_turma_id) then
    v := array_append(v, 'previsto');
  end if;
  if exists (select 1 from public.planejamento_anual p where p.turma_prevista_id = p_turma_id) then
    v := array_append(v, 'planejamento');
  end if;
  if exists (select 1 from public.avaliacoes_curriculo_turma a where a.turma_id = p_turma_id)
     or exists (select 1 from public.avaliacoes_curriculo_arbitragens a where a.turma_id = p_turma_id) then
    v := array_append(v, 'avaliacao_da_turma');
  end if;
  -- So a ligacao ATIVA define a abrangencia (`turmasEscolhidas`): a inativa sai junto com a turma.
  if exists (select 1 from public.feriado_turma f where f.turma_id = p_turma_id and f.status = 'ativo') then
    v := array_append(v, 'feriado_da_turma');
  end if;
  if v_codigo is not null
     and exists (select 1 from public.arquivo_avaliacoes_v1 a where a.turma_codigo_v1 = v_codigo) then
    v := array_append(v, 'arquivo_v1');
  end if;

  -- A rede: o que aponta para a turma, para as linhas da grade e para as atribuicoes, fora
  -- o que ja foi nomeado e a propria estrutura que sai junto.
  v := v || app.referencias_por_fk('public.turmas', array[p_turma_id], array[
    'turma_disciplina', 'registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'dias_parados',
    'ta_fora_do_dsa', 'dsa_eventos_da_semana', 'previstos_proens_turma', 'planejamento_anual',
    'avaliacoes_curriculo_turma', 'feriado_turma']);

  select array_agg(td.id) into v_linhas from public.turma_disciplina td where td.turma_id = p_turma_id;
  v := v || app.referencias_por_fk('public.turma_disciplina', v_linhas,
    array['turma_disciplina_instrutor', 'turma_disciplina_unidade', 'ta_fora_do_dsa']);

  select array_agg(tdi.id) into v_atrib
    from public.turma_disciplina_instrutor tdi where tdi.turma_disciplina_id = any (v_linhas);
  v := v || app.referencias_por_fk('public.turma_disciplina_instrutor', v_atrib,
    array['turma_disciplina_unidade']);

  return v;
end;
$$;

comment on function app.registros_da_turma(uuid) is
  'Bloco 10 (spec 025, D-10): o que prende a turma. Vazio = turma sem registro. Interna — '
  'sem porteiro; quem a chama e que confere a permissao.';

revoke all on function app.registros_da_turma(uuid) from public, anon, authenticated;

create or replace function app.impedimentos_de_exclusao_da_turma(p_turma_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curso_id uuid;
begin
  if not coalesce(app.pode('turmas', 'criar'), false) then
    raise exception 'exclusao de turma restrita a quem pode criar turma' using errcode = '42501';
  end if;

  select t.curso_id into v_curso_id from public.turmas t where t.id = p_turma_id;
  if not found then
    raise exception 'turma inexistente' using errcode = 'P0002';
  end if;
  if not coalesce(app.alcanca_curso(v_curso_id), false) then
    raise exception 'turma fora do escopo' using errcode = '42501';
  end if;

  return app.registros_da_turma(p_turma_id);
end;
$$;

comment on function app.impedimentos_de_exclusao_da_turma(uuid) is
  'Bloco 10 (D-COR-6): o que prende a turma. Porteiro: `turmas.criar` + alcance do curso (D-9).';

revoke all on function app.impedimentos_de_exclusao_da_turma(uuid) from public, anon;
grant execute on function app.impedimentos_de_exclusao_da_turma(uuid) to authenticated;

create or replace function app.impedimentos_de_exclusao_das_turmas(p_turmas uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('turmas', 'criar'), false) then
    raise exception 'exclusao de turma restrita a quem pode criar turma' using errcode = '42501';
  end if;

  return query
    select t.id, app.registros_da_turma(t.id)
      from public.turmas t
     where t.id = any (p_turmas)
       and coalesce(app.alcanca_curso(t.curso_id), false);
end;
$$;

comment on function app.impedimentos_de_exclusao_das_turmas(uuid[]) is
  'Bloco 10 (D-COR-6): os impedimentos de uma lista de turmas numa ida ao banco (a aba Turmas '
  'do curso). A turma fora do alcance nao volta.';

revoke all on function app.impedimentos_de_exclusao_das_turmas(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_das_turmas(uuid[]) to authenticated;

create or replace function app.excluir_turma(p_turma_id uuid, p_codigo_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_curso_id     uuid;
  v_turma        jsonb;
  v_impedimentos text[];
  v_linhas       uuid[];
  v_retrato      jsonb;
  v_quem         uuid := auth.uid();
  v_apagadas     integer;
begin
  if not coalesce(app.pode('turmas', 'criar'), false) then
    raise exception 'exclusao de turma restrita a quem pode criar turma' using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select t.codigo, t.curso_id, to_jsonb(t) into v_codigo, v_curso_id, v_turma
    from public.turmas t where t.id = p_turma_id
     for update;
  if not found then
    raise exception 'turma inexistente' using errcode = 'P0002';
  end if;
  if not coalesce(app.alcanca_curso(v_curso_id), false) then
    raise exception 'turma fora do escopo' using errcode = '42501';
  end if;
  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o da turma'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.registros_da_turma(p_turma_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'turma_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  select array_agg(td.id) into v_linhas from public.turma_disciplina td where td.turma_id = p_turma_id;

  -- ⚠️ O retrato leva a turma E a estrutura que sai com ela: sem as linhas da grade, as
  --    atribuicoes e o rateio, reconstituir a turma dependeria da memoria de alguem.
  v_retrato := jsonb_build_object(
    'turma', v_turma,
    'linhas_da_grade', coalesce((select jsonb_agg(to_jsonb(td) order by td.codigo)
                                   from public.turma_disciplina td where td.turma_id = p_turma_id),
                                '[]'::jsonb),
    'atribuicoes', coalesce((select jsonb_agg(to_jsonb(tdi) order by tdi.codigo)
                               from public.turma_disciplina_instrutor tdi
                              where tdi.turma_disciplina_id = any (v_linhas)), '[]'::jsonb),
    'rateio', coalesce((select jsonb_agg(to_jsonb(tdu) order by tdu.codigo)
                          from public.turma_disciplina_unidade tdu
                         where tdu.turma_disciplina_id = any (v_linhas)), '[]'::jsonb),
    'ligacoes_inativas_de_feriado', coalesce((select jsonb_agg(to_jsonb(ft) order by ft.feriado_id)
                                                from public.feriado_turma ft
                                               where ft.turma_id = p_turma_id), '[]'::jsonb));

  -- ⚠️ O rastro vai ANTES do DELETE, na mesma transacao: num rollback os dois somem juntos.
  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('turmas', p_turma_id, v_codigo, v_retrato, v_quem);

  delete from public.turma_disciplina_unidade tdu where tdu.turma_disciplina_id = any (v_linhas);
  delete from public.turma_disciplina_instrutor tdi where tdi.turma_disciplina_id = any (v_linhas);
  delete from public.turma_disciplina td where td.turma_id = p_turma_id;
  -- So as inativas: a ativa e impedimento (alargaria o feriado para todas as turmas).
  delete from public.feriado_turma ft where ft.turma_id = p_turma_id and ft.status <> 'ativo';
  delete from public.turmas t where t.id = p_turma_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou a turma' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_turma_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

comment on function app.excluir_turma(uuid, text) is
  'Exclusao permanente de turma SEM REGISTRO — excecao da regra 4 emendada em 24/10/2026 '
  '(D-COR-6). Exige `turmas.criar`, alcance do curso, o codigo digitado e zero impedimentos; '
  'apaga a turma e a estrutura dela (linhas da grade, atribuicoes, rateio) e grava o rastro '
  'ANTES. Continua sem policy e sem privilegio de DELETE para authenticated.';

revoke all on function app.excluir_turma(uuid, text) from public, anon;
grant execute on function app.excluir_turma(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE D — a LINHA DO CALENDARIO (feriado) (D-COR-6; D-11)
--
-- ⚠️ "SEMANA SALVA OU PUBLICADA LIGADA": na semana ISO da data, alguma turma que o feriado
--    alcanca (as escolhidas ATIVAS em `feriado_turma`; sem nenhuma, todas) tem (a) o evento
--    `salvo`, `publicado` ou `alteracao_publicada` na trilha do DSA, ou (b) LANCAMENTO SALVO
--    vivo — aula, atividade (a global alcanca todas), a prova (a 1a aplicacao, as sessoes e
--    a vista).
-- ⚠️ O (b) NASCEU DA MEDICAO NA COPIA DO REMOTO (24/10/2026): so com o evento, NENHUMA das 32
--    linhas do calendario ficaria protegida — o que existia antes do Bloco 9 nasce salvo
--    (RP-8) e nao tem evento. Com o (b), 29 das 32. A semana *registrada* VAZIA (D-18 da
--    spec 024) continua nao contando: por ela, toda semana contaria.
-- ---------------------------------------------------------------------------------
create or replace function app.registros_do_feriado(p_feriado_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data    date;
  v_ano     smallint;
  v_semana  smallint;
  v_de      date;
  v_ate     date;
  v_todas   boolean;
  v         text[] := array[]::text[];
begin
  select f.data into v_data from public.feriados f where f.id = p_feriado_id;
  if v_data is null then
    return v;
  end if;
  select s.ano, s.semana into v_ano, v_semana from app.semana_iso(v_data) s;
  -- A semana ISO de segunda a domingo: a data menos o dia da semana ISO (1 = segunda).
  v_de := v_data - (extract(isodow from v_data)::int - 1);
  v_ate := v_de + 6;
  -- As turmas escolhidas ATIVAS; sem nenhuma, todas (`turmasEscolhidas`, spec 023).
  v_todas := not exists (select 1 from public.feriado_turma ft
                          where ft.feriado_id = p_feriado_id and ft.status = 'ativo');

  if exists (
    select 1
      from public.dsa_eventos_da_semana e
     where e.ano = v_ano
       and e.semana = v_semana
       and e.tipo in ('salvo', 'publicado', 'alteracao_publicada')
       and (v_todas or e.turma_id in (select ft.turma_id from public.feriado_turma ft
                                       where ft.feriado_id = p_feriado_id and ft.status = 'ativo'))
  ) or exists (
    select 1 from public.registros_aula r
     where r.data between v_de and v_ate and r.salvo and r.status = 'ativo'
       and (v_todas or r.turma_id in (select ft.turma_id from public.feriado_turma ft
                                       where ft.feriado_id = p_feriado_id and ft.status = 'ativo'))
  ) or exists (
    select 1 from public.atividades_nao_letivas a
     where a.data between v_de and v_ate and a.salvo and a.status = 'ativo'
       and (v_todas or a.turma_id is null
            or a.turma_id in (select ft.turma_id from public.feriado_turma ft
                               where ft.feriado_id = p_feriado_id and ft.status = 'ativo'))
  ) or exists (
    select 1
      -- A 1a aplicacao e a propria linha de `avaliacoes` (`data_avaliacao`, RN-AV-12); as sessoes guardam
      -- da 2a em diante. A prova "viva" e a mesma lista de `vw_ocupacao_ta` (achado da revisao do PR #90).
      from (select a1.id as avaliacao_id, a1.data_avaliacao as data from public.avaliacoes a1
             where a1.salvo and a1.data_avaliacao is not null
            union all
            select s.avaliacao_id, s.data from public.sessoes_de_aplicacao s
             where s.salvo and s.status = 'ativo'
            union all
            select w.avaliacao_id, w.data from public.vistas_de_avaliacao w
             where w.salvo and w.status = 'ativo') x
      join public.avaliacoes av on av.id = x.avaliacao_id
       and av.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
     where x.data between v_de and v_ate
       and (v_todas or av.turma_id in (select ft.turma_id from public.feriado_turma ft
                                        where ft.feriado_id = p_feriado_id and ft.status = 'ativo'))
  ) then
    v := array_append(v, 'semana_do_dsa_salva_ou_publicada');
  end if;

  v := v || app.referencias_por_fk('public.feriados', array[p_feriado_id], array['feriado_turma']);
  return v;
end;
$$;

comment on function app.registros_do_feriado(uuid) is
  'Bloco 10 (spec 025, D-11): o que prende a linha do calendario. Interna, sem porteiro.';

revoke all on function app.registros_do_feriado(uuid) from public, anon, authenticated;

create or replace function app.impedimentos_de_exclusao_do_feriado(p_feriado_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('calendario', 'criar'), false) then
    raise exception 'exclusao no calendario restrita a quem cadastra no calendario'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.feriados f where f.id = p_feriado_id) then
    raise exception 'linha do calendario inexistente' using errcode = 'P0002';
  end if;
  return app.registros_do_feriado(p_feriado_id);
end;
$$;

revoke all on function app.impedimentos_de_exclusao_do_feriado(uuid) from public, anon;
grant execute on function app.impedimentos_de_exclusao_do_feriado(uuid) to authenticated;

create or replace function app.impedimentos_de_exclusao_dos_feriados(p_feriados uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('calendario', 'criar'), false) then
    raise exception 'exclusao no calendario restrita a quem cadastra no calendario'
      using errcode = '42501';
  end if;
  return query
    select f.id, app.registros_do_feriado(f.id) from public.feriados f where f.id = any (p_feriados);
end;
$$;

revoke all on function app.impedimentos_de_exclusao_dos_feriados(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_dos_feriados(uuid[]) to authenticated;

create or replace function app.excluir_feriado(p_feriado_id uuid, p_codigo_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_feriado      jsonb;
  v_impedimentos text[];
  v_retrato      jsonb;
  v_quem         uuid := auth.uid();
  v_apagadas     integer;
begin
  if not coalesce(app.pode('calendario', 'criar'), false) then
    raise exception 'exclusao no calendario restrita a quem cadastra no calendario'
      using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select f.codigo, to_jsonb(f) into v_codigo, v_feriado
    from public.feriados f where f.id = p_feriado_id
     for update;
  if not found then
    raise exception 'linha do calendario inexistente' using errcode = 'P0002';
  end if;
  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o da linha do calendario'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.registros_do_feriado(p_feriado_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'feriado_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  v_retrato := jsonb_build_object(
    'feriado', v_feriado,
    'turmas', coalesce((select jsonb_agg(to_jsonb(ft) order by ft.turma_id)
                          from public.feriado_turma ft where ft.feriado_id = p_feriado_id),
                       '[]'::jsonb));

  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('feriados', p_feriado_id, v_codigo, v_retrato, v_quem);

  delete from public.feriado_turma ft where ft.feriado_id = p_feriado_id;
  delete from public.feriados f where f.id = p_feriado_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou a linha do calendario' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_feriado_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

comment on function app.excluir_feriado(uuid, text) is
  'Exclusao permanente de linha do calendario SEM SEMANA DO DSA SALVA OU PUBLICADA LIGADA '
  '(D-COR-6, 24/10/2026). Exige `calendario.criar`, o codigo digitado e zero impedimentos; '
  'apaga a abrangencia (`feriado_turma`) e a linha, com o rastro gravado ANTES.';

revoke all on function app.excluir_feriado(uuid, text) from public, anon;
grant execute on function app.excluir_feriado(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE E — o REGIME DE HORARIO (D-30)
--
-- ⚠️ `curriculo_em_uso`: o regime pertence a um curriculo, e apagar parte de curriculo com
--    lancamento mudaria em silencio o que a RC-6 (spec 021) manda corrigir com
--    justificativa. Ai o caminho e Desativar.
-- ---------------------------------------------------------------------------------
create or replace function app.registros_do_regime(p_regime_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curriculo uuid;
  v           text[] := array[]::text[];
begin
  select r.curriculo_id into v_curriculo from public.regimes_de_horario r where r.id = p_regime_id;

  if exists (select 1 from public.turmas t where t.regime_de_horario_id = p_regime_id) then
    v := array_append(v, 'turma_usa');
  end if;
  if v_curriculo is not null and coalesce(app.curriculo_em_uso_com_lancamento(v_curriculo), false) then
    v := array_append(v, 'curriculo_em_uso');
  end if;
  if exists (select 1 from public.correcoes_de_curriculo c
              where c.tabela = 'regimes_de_horario' and c.registro_id = p_regime_id) then
    v := array_append(v, 'correcao_registrada');
  end if;

  v := v || app.referencias_por_fk('public.regimes_de_horario', array[p_regime_id], array['turmas']);
  return v;
end;
$$;

revoke all on function app.registros_do_regime(uuid) from public, anon, authenticated;

create or replace function app.impedimentos_de_exclusao_dos_regimes(p_regimes uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('horarios', 'criar'), false) then
    raise exception 'exclusao de regime restrita a quem cadastra horario' using errcode = '42501';
  end if;
  return query
    select r.id, app.registros_do_regime(r.id)
      from public.regimes_de_horario r
     where r.id = any (p_regimes)
       and coalesce(app.alcanca_curso(r.curso_id), false);
end;
$$;

revoke all on function app.impedimentos_de_exclusao_dos_regimes(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_dos_regimes(uuid[]) to authenticated;

create or replace function app.excluir_regime_de_horario(p_regime_id uuid, p_codigo_confirmacao text)
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
  if not coalesce(app.pode('horarios', 'criar'), false) then
    raise exception 'exclusao de regime restrita a quem cadastra horario' using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select r.codigo, r.curso_id, to_jsonb(r) into v_codigo, v_curso_id, v_retrato
    from public.regimes_de_horario r where r.id = p_regime_id
     for update;
  if not found then
    raise exception 'regime de horario inexistente' using errcode = 'P0002';
  end if;
  if not coalesce(app.alcanca_curso(v_curso_id), false) then
    raise exception 'regime fora do escopo' using errcode = '42501';
  end if;
  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o do regime'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.registros_do_regime(p_regime_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'regime_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('regimes_de_horario', p_regime_id, v_codigo, v_retrato, v_quem);

  delete from public.regimes_de_horario r where r.id = p_regime_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou o regime' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_regime_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

revoke all on function app.excluir_regime_de_horario(uuid, text) from public, anon;
grant execute on function app.excluir_regime_de_horario(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE F — o ITEM DE AVALIACAO DO CURRICULO (D-30)
-- ---------------------------------------------------------------------------------
create or replace function app.registros_do_item(p_item_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curriculo uuid;
  v           text[] := array[]::text[];
begin
  select d.curriculo_id into v_curriculo
    from public.avaliacoes_curriculo i
    join public.disciplinas d on d.id = i.disciplina_id
   where i.id = p_item_id;

  if exists (select 1 from public.avaliacoes a where a.avaliacao_curriculo_id = p_item_id) then
    v := array_append(v, 'avaliacao_lancada');
  end if;
  if exists (select 1 from public.avaliacoes_curriculo_turma a where a.avaliacao_curriculo_id = p_item_id)
     or exists (select 1 from public.avaliacoes_curriculo_arbitragens a
                 where a.avaliacao_curriculo_id = p_item_id) then
    v := array_append(v, 'arbitragem');
  end if;
  if exists (select 1 from public.correcoes_de_curriculo c
              where c.tabela = 'avaliacoes_curriculo' and c.registro_id = p_item_id) then
    v := array_append(v, 'correcao_registrada');
  end if;
  if v_curriculo is not null and coalesce(app.curriculo_em_uso_com_lancamento(v_curriculo), false) then
    v := array_append(v, 'curriculo_em_uso');
  end if;

  v := v || app.referencias_por_fk('public.avaliacoes_curriculo', array[p_item_id],
    array['avaliacoes', 'avaliacoes_curriculo_turma']);
  return v;
end;
$$;

revoke all on function app.registros_do_item(uuid) from public, anon, authenticated;

create or replace function app.impedimentos_de_exclusao_dos_itens(p_itens uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('disciplinas', 'criar'), false) then
    raise exception 'exclusao de item restrita a quem pode criar disciplina' using errcode = '42501';
  end if;
  return query
    select i.id, app.registros_do_item(i.id)
      from public.avaliacoes_curriculo i
     where i.id = any (p_itens)
       and coalesce(app.alcanca_curso(i.curso_id), false);
end;
$$;

revoke all on function app.impedimentos_de_exclusao_dos_itens(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_dos_itens(uuid[]) to authenticated;

create or replace function app.excluir_item_de_avaliacao_do_curriculo(p_item_id uuid, p_codigo_confirmacao text)
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
  if not coalesce(app.pode('disciplinas', 'criar'), false) then
    raise exception 'exclusao de item restrita a quem pode criar disciplina' using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select i.codigo, i.curso_id, to_jsonb(i) into v_codigo, v_curso_id, v_retrato
    from public.avaliacoes_curriculo i where i.id = p_item_id
     for update;
  if not found then
    raise exception 'item de avaliacao inexistente' using errcode = 'P0002';
  end if;
  if not coalesce(app.alcanca_curso(v_curso_id), false) then
    raise exception 'item fora do escopo' using errcode = '42501';
  end if;
  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o do item'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.registros_do_item(p_item_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'item_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('avaliacoes_curriculo', p_item_id, v_codigo, v_retrato, v_quem);

  delete from public.avaliacoes_curriculo i where i.id = p_item_id;
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou o item' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_item_id, 'codigo', v_codigo, 'excluido_em', now());
end;
$$;

revoke all on function app.excluir_item_de_avaliacao_do_curriculo(uuid, text) from public, anon;
grant execute on function app.excluir_item_de_avaliacao_do_curriculo(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE G — a SALA (D-30)
--
-- ⚠️ A SALA E TEXTO NA TURMA (`turmas.sala_alocada`, sem FK): a conferencia e pelo nome, e
--    vale a turma de QUALQUER situacao — a desativada continua nomeando as turmas que a
--    usaram (FR-029.4 da spec 009). O confirmacao e o proprio nome.
-- ---------------------------------------------------------------------------------
create or replace function app.registros_da_sala(p_sala_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nome text;
  v      text[] := array[]::text[];
begin
  select c.valor into v_nome from public.config_listas c where c.id = p_sala_id and c.lista = 'salas';
  if v_nome is not null and exists (select 1 from public.turmas t where t.sala_alocada = v_nome) then
    v := array_append(v, 'turma_usa');
  end if;
  v := v || app.referencias_por_fk('public.config_listas', array[p_sala_id]);
  return v;
end;
$$;

revoke all on function app.registros_da_sala(uuid) from public, anon, authenticated;

create or replace function app.impedimentos_de_exclusao_das_salas(p_salas uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('parametros', 'criar'), false) then
    raise exception 'exclusao de sala restrita a quem cadastra sala' using errcode = '42501';
  end if;
  return query
    select c.id, app.registros_da_sala(c.id)
      from public.config_listas c
     where c.id = any (p_salas) and c.lista = 'salas';
end;
$$;

revoke all on function app.impedimentos_de_exclusao_das_salas(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_das_salas(uuid[]) to authenticated;

create or replace function app.excluir_sala(p_sala_id uuid, p_nome_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nome         text;
  v_retrato      jsonb;
  v_impedimentos text[];
  v_quem         uuid := auth.uid();
  v_apagadas     integer;
begin
  if not coalesce(app.pode('parametros', 'criar'), false) then
    raise exception 'exclusao de sala restrita a quem cadastra sala' using errcode = '42501';
  end if;
  if v_quem is null then
    raise exception 'exclusao exige sessao' using errcode = '42501';
  end if;

  select c.valor, to_jsonb(c) into v_nome, v_retrato
    from public.config_listas c where c.id = p_sala_id and c.lista = 'salas'
     for update;
  if not found then
    raise exception 'sala inexistente' using errcode = 'P0002';
  end if;
  if p_nome_confirmacao is null or btrim(p_nome_confirmacao) <> v_nome then
    raise exception 'o nome digitado nao confere com o da sala'
      using errcode = '22023', hint = 'codigo_nao_confere';
  end if;

  v_impedimentos := app.registros_da_sala(p_sala_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'sala_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            hint = 'registro_com_historico',
            detail = jsonb_build_object('impedimentos', to_jsonb(v_impedimentos))::text;
  end if;

  insert into public.exclusoes_registradas (tabela, registro_id, registro_codigo, retrato, excluido_por)
  values ('config_listas', p_sala_id, 'salas:' || v_nome, v_retrato, v_quem);

  delete from public.config_listas c where c.id = p_sala_id and c.lista = 'salas';
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou a sala' using errcode = '42501';
  end if;

  return jsonb_build_object('id', p_sala_id, 'codigo', v_nome, 'excluido_em', now());
end;
$$;

revoke all on function app.excluir_sala(uuid, text) from public, anon;
grant execute on function app.excluir_sala(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE H — os impedimentos ANTIGOS, com as FKs que faltavam e a rede (D-32)
--
-- ⚠️ AS CHAVES DE ANTES FICAM IGUAIS (a tela e os testes as leem); entram as que faltavam
--    — instrutor: `atividade` (atividades_nao_letivas), `avaliacao` tambem pela vista
--    conduzida, `ta_fora_do_dsa`; disciplina: `aula_lancada` tambem pela coluna direta
--    (D-DSA-1), `atividade`, `avaliacao_do_curriculo`, `ta_fora_do_dsa`; UE: `rateio`,
--    `avaliacao_do_curriculo` — e, depois delas, a rede pelo catalogo.
-- ---------------------------------------------------------------------------------
create or replace function app.impedimentos_de_exclusao_do_instrutor(p_instrutor_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_impedimentos text[] := array[]::text[];
begin
  if not coalesce(app.pode('instrutores', 'criar'), false) then
    raise exception 'exclusao de instrutor restrita a quem pode criar instrutor'
      using errcode = '42501';
  end if;

  select i.codigo into v_codigo from public.instrutores i where i.id = p_instrutor_id;
  if not found then
    raise exception 'instrutor inexistente' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.registros_aula r where r.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  if exists (select 1 from public.turma_disciplina_instrutor t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.turma_disciplina t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.disciplinas d where p_instrutor_id = any (d.instrutores_atribuidos)) then
    v_impedimentos := array_append(v_impedimentos, 'atribuicao');
  end if;

  if exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'vinculo_de_habilitacao');
  end if;

  if exists (select 1 from public.usuarios u where u.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'conta_de_acesso');
  end if;

  if exists (select 1 from public.avaliacoes a
              where a.instrutor_responsavel_id = p_instrutor_id or a.fiscal_id = p_instrutor_id)
     or exists (select 1 from public.vistas_de_avaliacao va where va.conduz_instrutor_id = p_instrutor_id)
     or exists (select 1 from public.arquivo_avaliacoes_v1 a where a.instrutor_codigo_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao');
  end if;

  if exists (select 1 from public.responsaveis_curso rc where rc.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'responsavel_de_curso');
  end if;

  if exists (select 1 from public.atividades_nao_letivas a where a.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'atividade');
  end if;

  if exists (select 1 from public.ta_fora_do_dsa f where f.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'ta_fora_do_dsa');
  end if;

  v_impedimentos := v_impedimentos || app.referencias_por_fk('public.instrutores', array[p_instrutor_id], array[
    'registros_aula', 'turma_disciplina_instrutor', 'turma_disciplina', 'instrutor_disciplina', 'usuarios',
    'avaliacoes', 'vistas_de_avaliacao', 'responsaveis_curso', 'atividades_nao_letivas', 'ta_fora_do_dsa']);

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_do_instrutor(uuid) is
  'O que prende o instrutor (excecao de 15/09/2026). Bloco 10 (D-32): as FKs criadas depois '
  '(atividade, vista conduzida, TA fora do DSA) e a rede pelo catalogo.';

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
  if not coalesce(app.pode('disciplinas', 'criar'), false) then
    raise exception 'exclusao de disciplina restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select d.codigo, d.curso_id into v_codigo, v_curso_id
    from public.disciplinas d where d.id = p_disciplina_id;
  if not found then
    raise exception 'disciplina inexistente' using errcode = 'P0002';
  end if;

  if not coalesce(app.alcanca_curso(v_curso_id), false) then
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
     or exists (select 1 from public.registros_aula r where r.disciplina_id = p_disciplina_id)
     or exists (select 1 from public.registros_aula r
                 where r.disciplina_codigo_legado_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  if exists (select 1 from public.atividades_nao_letivas a where a.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'atividade');
  end if;

  if exists (select 1 from public.avaliacoes_curriculo i where i.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao_do_curriculo');
  end if;

  if exists (select 1 from public.ta_fora_do_dsa f where f.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'ta_fora_do_dsa');
  end if;

  v_impedimentos := v_impedimentos || app.referencias_por_fk('public.disciplinas', array[p_disciplina_id], array[
    'turma_disciplina', 'instrutor_disciplina', 'avaliacoes', 'planejamento_anual', 'unidades_ensino',
    'registros_aula', 'atividades_nao_letivas', 'avaliacoes_curriculo', 'ta_fora_do_dsa']);

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_disciplina(uuid) is
  'O que prende a disciplina. Vazio = registro sem historico. Porteiro: '
  '`app.pode(disciplinas, criar)` + alcance do curso (FR-021). Bloco 10 (D-32): a aula pela '
  'coluna direta (D-DSA-1), a atividade, o item do curriculo, o TA fora do DSA e a rede.';

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
  if not coalesce(app.pode('disciplinas', 'criar'), false) then
    raise exception 'exclusao de unidade de ensino restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select u.curso_id into v_curso_id from public.unidades_ensino u where u.id = p_unidade_id;
  if not found then
    raise exception 'unidade de ensino inexistente' using errcode = 'P0002';
  end if;

  if not coalesce(app.alcanca_curso(v_curso_id), false) then
    raise exception 'unidade de ensino fora do escopo' using errcode = '42501';
  end if;

  if exists (select 1 from public.registros_aula r where r.unidade_ensino_id = p_unidade_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  if exists (select 1 from public.turma_disciplina_unidade t where t.unidade_ensino_id = p_unidade_id) then
    v_impedimentos := array_append(v_impedimentos, 'rateio');
  end if;

  if exists (select 1 from public.avaliacoes_curriculo i where i.unidade_ensino_id = p_unidade_id) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao_do_curriculo');
  end if;

  v_impedimentos := v_impedimentos || app.referencias_por_fk('public.unidades_ensino', array[p_unidade_id],
    array['registros_aula', 'turma_disciplina_unidade', 'avaliacoes_curriculo']);

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_unidade_ensino(uuid) is
  'O que prende a UE. UE com aula NUNCA e excluida, so desativada (decisao UE-1). Bloco 10 '
  '(D-32): o rateio, o item do curriculo e a rede pelo catalogo.';

-- Lista das UEs de uma disciplina numa ida ao banco (a pagina da disciplina, D-32).
create or replace function app.impedimentos_de_exclusao_das_unidades(p_unidades uuid[])
returns table (registro_id uuid, impedimentos text[])
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not coalesce(app.pode('disciplinas', 'criar'), false) then
    raise exception 'exclusao de unidade de ensino restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;
  return query
    select u.id, app.impedimentos_de_exclusao_da_unidade_ensino(u.id)
      from public.unidades_ensino u
     where u.id = any (p_unidades)
       and coalesce(app.alcanca_curso(u.curso_id), false);
end;
$$;

revoke all on function app.impedimentos_de_exclusao_das_unidades(uuid[]) from public, anon;
grant execute on function app.impedimentos_de_exclusao_das_unidades(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE I — os espelhos `public.*`, SECURITY INVOKER (o PostgREST nao expoe `app`)
-- ---------------------------------------------------------------------------------
create or replace function public.impedimentos_de_exclusao_da_turma(p_turma_id uuid)
returns text[] language sql stable security invoker set search_path = pg_catalog, public
as $$ select app.impedimentos_de_exclusao_da_turma(p_turma_id); $$;

create or replace function public.impedimentos_de_exclusao_das_turmas(p_turmas uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_das_turmas(p_turmas); $$;

create or replace function public.excluir_turma(p_turma_id uuid, p_codigo_confirmacao text)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_turma(p_turma_id, p_codigo_confirmacao); $$;

create or replace function public.impedimentos_de_exclusao_do_feriado(p_feriado_id uuid)
returns text[] language sql stable security invoker set search_path = pg_catalog, public
as $$ select app.impedimentos_de_exclusao_do_feriado(p_feriado_id); $$;

create or replace function public.impedimentos_de_exclusao_dos_feriados(p_feriados uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_dos_feriados(p_feriados); $$;

create or replace function public.excluir_feriado(p_feriado_id uuid, p_codigo_confirmacao text)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_feriado(p_feriado_id, p_codigo_confirmacao); $$;

create or replace function public.impedimentos_de_exclusao_dos_regimes(p_regimes uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_dos_regimes(p_regimes); $$;

create or replace function public.excluir_regime_de_horario(p_regime_id uuid, p_codigo_confirmacao text)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_regime_de_horario(p_regime_id, p_codigo_confirmacao); $$;

create or replace function public.impedimentos_de_exclusao_dos_itens(p_itens uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_dos_itens(p_itens); $$;

create or replace function public.excluir_item_de_avaliacao_do_curriculo(p_item_id uuid, p_codigo_confirmacao text)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_item_de_avaliacao_do_curriculo(p_item_id, p_codigo_confirmacao); $$;

create or replace function public.impedimentos_de_exclusao_das_salas(p_salas uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_das_salas(p_salas); $$;

create or replace function public.excluir_sala(p_sala_id uuid, p_nome_confirmacao text)
returns jsonb language sql security invoker set search_path = pg_catalog, public
as $$ select app.excluir_sala(p_sala_id, p_nome_confirmacao); $$;

create or replace function public.impedimentos_de_exclusao_das_unidades(p_unidades uuid[])
returns table (registro_id uuid, impedimentos text[])
language sql stable security invoker set search_path = pg_catalog, public
as $$ select * from app.impedimentos_de_exclusao_das_unidades(p_unidades); $$;

revoke all on function public.impedimentos_de_exclusao_da_turma(uuid) from public, anon;
revoke all on function public.impedimentos_de_exclusao_das_turmas(uuid[]) from public, anon;
revoke all on function public.excluir_turma(uuid, text) from public, anon;
revoke all on function public.impedimentos_de_exclusao_do_feriado(uuid) from public, anon;
revoke all on function public.impedimentos_de_exclusao_dos_feriados(uuid[]) from public, anon;
revoke all on function public.excluir_feriado(uuid, text) from public, anon;
revoke all on function public.impedimentos_de_exclusao_dos_regimes(uuid[]) from public, anon;
revoke all on function public.excluir_regime_de_horario(uuid, text) from public, anon;
revoke all on function public.impedimentos_de_exclusao_dos_itens(uuid[]) from public, anon;
revoke all on function public.excluir_item_de_avaliacao_do_curriculo(uuid, text) from public, anon;
revoke all on function public.impedimentos_de_exclusao_das_salas(uuid[]) from public, anon;
revoke all on function public.excluir_sala(uuid, text) from public, anon;
revoke all on function public.impedimentos_de_exclusao_das_unidades(uuid[]) from public, anon;

grant execute on function public.impedimentos_de_exclusao_da_turma(uuid) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_das_turmas(uuid[]) to authenticated, service_role;
grant execute on function public.excluir_turma(uuid, text) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_do_feriado(uuid) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_dos_feriados(uuid[]) to authenticated, service_role;
grant execute on function public.excluir_feriado(uuid, text) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_dos_regimes(uuid[]) to authenticated, service_role;
grant execute on function public.excluir_regime_de_horario(uuid, text) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_dos_itens(uuid[]) to authenticated, service_role;
grant execute on function public.excluir_item_de_avaliacao_do_curriculo(uuid, text) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_das_salas(uuid[]) to authenticated, service_role;
grant execute on function public.excluir_sala(uuid, text) to authenticated, service_role;
grant execute on function public.impedimentos_de_exclusao_das_unidades(uuid[]) to authenticated, service_role;
