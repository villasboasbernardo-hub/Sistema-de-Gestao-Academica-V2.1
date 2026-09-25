-- =================================================================================
-- M5 da fatia (b) do Epico 5 — o RATEIO da CH da disciplina entre os instrutores
-- daquela turma, nos CINCO casos, e a CH prevista do instrutor derivada deles.
--
-- ORIGEM : decisao A-1 de Bernardo Villas Boas, 25/09/2026:
--          "a parcela da disciplina entre os instrutores E digitavel. O criterio 9 e o
--           RF-INSTR-13 continuam valendo para a CH TOTAL do instrutor, que segue sempre
--           calculada a partir das parcelas. Por turma (turma_disciplina):
--            1. Um instrutor so: CH integral e todas as UEs.
--            2. Simultaneo: cada instrutor recebe a CH integral.
--            3. Dividido sem definicao (padrao): divisao igual em TA INTEIROS, resto aos
--               mais antigos pela antiguidade do sistema (Q-03). Ex.: 10 TA / 3 = 4+3+3.
--            4. Dividido por TA: o usuario digita TA inteiros por instrutor; o banco
--               RECUSA se a soma diferir da CH da disciplina.
--            5. Dividido por UE: o usuario atribui UEs a instrutores; a CH de cada um e a
--               soma da CH das suas UEs pelo curriculo. Cada UE com exatamente um
--               instrutor, todas atribuidas. So para disciplina com UE.
--           Parcela sempre inteira."
--          `FR-041` a `FR-041.7`, `FR-043` da spec 010; `RN-MAT-05` do documento 04.
--
-- ⚠️ MEDIDO ANTES DE ESCREVER A REGRA (25/09/2026): `ch_prevista_tempos` e
--    `numeric(6,2)` e esta preenchida em ZERO das 96 linhas — NENHUM valor fracionario a
--    relatar. A coluna NAO muda de tipo: `numeric(6,2)` e o padrao de CH do schema, e
--    trocar tipo de coluna com historico nao se faz. Quem garante o inteiro e o `CHECK`.
--
-- ⚠️ QUAL CASO VALE SE LE DO DADO, SEM COLUNA DE MODO (FR-041.6): linha em
--    `turma_disciplina_unidade` -> caso 5; `ch_prevista_tempos` preenchida -> caso 4;
--    nenhum dos dois -> caso 3 (ou 1, com um instrutor so); `simultaneo` na disciplina ->
--    caso 2. Os casos 4 e 5 NAO coexistem, e o gatilho recusa. A razao de nao haver
--    coluna de modo e a de sempre: ela seria uma SEGUNDA FONTE DE VERDADE sobre um fato
--    que o proprio dado ja diz.
--
-- ⚠️ A CONFERENCIA E POR STATEMENT ADIADO (`constraint trigger deferrable initially
--    deferred`), nao por linha: uma gravacao mexe em varias linhas, e um gatilho por
--    linha veria estados intermediarios que nao somam — e reprovaria gravacao correta.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop trigger  if exists trg_tdi_soma_do_rateio on public.turma_disciplina_instrutor;
--    drop trigger  if exists trg_tdu_soma_do_rateio on public.turma_disciplina_unidade;
--    drop function if exists app.trg_soma_do_rateio();
--    drop function if exists public.definir_instrutores_da_turma(uuid, jsonb, jsonb);
--    drop function if exists app.definir_instrutores_da_turma(uuid, jsonb, jsonb);
--    alter table public.turma_disciplina_instrutor drop constraint tdi_ch_prevista_inteira;
--    drop table if exists public.turma_disciplina_unidade;   -- so se vazia (regra 4)
--    drop function if exists app.proximo_codigo_turma_disciplina_unidade();
--    drop sequence if exists app.turma_disciplina_unidade_codigo_seq;
--    alter table public.turma_disciplina drop constraint td_id_disciplina;
--    alter table public.unidades_ensino  drop constraint ue_id_disciplina;
--    e recriar `vw_instrutor_carga_prevista` como estava (a definicao anterior esta em
--    `20260915084854_carga_prevista_por_instrutor.sql`).
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — as uniques que tornam a coerencia declarativa (RN-MAT-01)
--
-- ⚠️ Sao o que permite as FKs COMPOSTAS da tabela nova: sem elas, "a UE e da disciplina
--    daquela turma" viraria gatilho — e a preferencia do projeto e sempre a constraint,
--    porque ela e verificavel no catalogo e nao depende de estar habilitada.
-- ---------------------------------------------------------------------------------
alter table public.turma_disciplina
  add constraint td_id_disciplina unique (id, disciplina_id);

alter table public.unidades_ensino
  add constraint ue_id_disciplina unique (id, disciplina_id);

comment on constraint td_id_disciplina on public.turma_disciplina is
  'Redundante com a PK de proposito: e o alvo da FK composta de `turma_disciplina_unidade`, '
  'que garante pelo motor que a UE atribuida e da disciplina daquela turma (FR-041.5).';

comment on constraint ue_id_disciplina on public.unidades_ensino is
  'Mesma razao da anterior, do lado da UE. Espelha `ue_id_curso`, que o Epico 1 criou '
  'para a FK composta de `registros_aula`.';

-- ---------------------------------------------------------------------------------
-- PARTE B — a parcela e sempre INTEIRA (A-1)
-- ---------------------------------------------------------------------------------
alter table public.turma_disciplina_instrutor
  add constraint tdi_ch_prevista_inteira
  check (ch_prevista_tempos is null or ch_prevista_tempos = trunc(ch_prevista_tempos));

comment on constraint tdi_ch_prevista_inteira on public.turma_disciplina_instrutor is
  'Parcela do rateio sempre em TA INTEIROS (A-1, Bernardo Villas Boas, 25/09/2026). A '
  'coluna segue `numeric(6,2)` — e o tipo de CH do schema inteiro, e trocar tipo de coluna '
  'com historico nao se faz. Medido em 25/09/2026: 0 de 96 preenchidas, nenhuma fracionaria.';

-- ---------------------------------------------------------------------------------
-- PARTE C — a tabela nova: quem ministra cada UE naquela turma (caso 5)
-- ---------------------------------------------------------------------------------
create sequence if not exists app.turma_disciplina_unidade_codigo_seq as bigint start 1 increment 1;

create or replace function app.proximo_codigo_turma_disciplina_unidade()
returns text
language sql
volatile
set search_path = pg_catalog, public
as $$
  select 'TDU-' || lpad(nextval('app.turma_disciplina_unidade_codigo_seq')::text, 6, '0');
$$;

revoke all on function app.proximo_codigo_turma_disciplina_unidade() from public, anon;
grant execute on function app.proximo_codigo_turma_disciplina_unidade() to authenticated, service_role;
grant usage on sequence app.turma_disciplina_unidade_codigo_seq to authenticated, service_role;

create table if not exists public.turma_disciplina_unidade (
  id                  uuid        primary key default gen_random_uuid(),
  codigo              text        not null unique
                                  default app.proximo_codigo_turma_disciplina_unidade(),
  turma_disciplina_id uuid        not null,
  disciplina_id       uuid        not null,
  unidade_ensino_id   uuid        not null,
  instrutor_id        uuid        not null,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  -- Cada UE com EXATAMENTE UM instrutor naquela turma (FR-041.5).
  constraint tdu_ue_unica_na_turma unique (turma_disciplina_id, unidade_ensino_id),

  -- A linha de turma existe, e a disciplina dela e esta.
  constraint tdu_da_turma_disciplina
    foreign key (turma_disciplina_id, disciplina_id)
    references public.turma_disciplina (id, disciplina_id) on delete restrict,

  -- A UE existe, e e da MESMA disciplina. As duas FKs juntas dizem, pelo motor, que a UE
  -- atribuida pertence a disciplina daquela turma — sem gatilho nenhum.
  constraint tdu_da_unidade_ensino
    foreign key (unidade_ensino_id, disciplina_id)
    references public.unidades_ensino (id, disciplina_id) on delete restrict,

  -- So instrutor JA ATRIBUIDO aquela turma recebe UE. `tdi_par_unico` ja existia.
  constraint tdu_do_instrutor_atribuido
    foreign key (turma_disciplina_id, instrutor_id)
    references public.turma_disciplina_instrutor (turma_disciplina_id, instrutor_id)
    on delete restrict
);

comment on table public.turma_disciplina_unidade is
  'Quem ministra CADA UNIDADE DE ENSINO de uma disciplina NAQUELA TURMA. E o caso 5 do '
  'rateio (A-1, Bernardo Villas Boas, 25/09/2026): a parcela do instrutor passa a ser a '
  'SOMA DA CH DAS UEs DELE, derivada — nunca gravada. As tres FKs compostas garantem, pelo '
  'motor, que a UE e da disciplina daquela turma e que o instrutor ja esta atribuido a ela.';

comment on column public.turma_disciplina_unidade.disciplina_id is
  'Redundante com `turma_disciplina` e `unidades_ensino` DE PROPOSITO: e o que permite as '
  'duas FKs compostas. Mesmo padrao de `curso_id` em `unidades_ensino` e `registros_aula` '
  '(spec 002). NAO e segunda fonte de verdade: e a chave que amarra as duas pontas.';

create index if not exists ix_tdu_instrutor
  on public.turma_disciplina_unidade (instrutor_id) where status = 'ativo';
create index if not exists ix_tdu_unidade
  on public.turma_disciplina_unidade (unidade_ensino_id);

drop trigger if exists trg_tdu_auditoria on public.turma_disciplina_unidade;
create trigger trg_tdu_auditoria
  before insert or update on public.turma_disciplina_unidade
  for each row execute function app.set_auditoria();

alter table public.turma_disciplina_unidade enable row level security;

-- As policies espelham `turma_disciplina_instrutor` (Q-10: `disciplinas.editar`, com o
-- Operador incluido; alcance da turma; turma em oferta).
drop policy if exists tdu_ler on public.turma_disciplina_unidade;
create policy tdu_ler on public.turma_disciplina_unidade
  for select using (
    app.pode('disciplinas', 'ler')
    and exists (select 1 from public.turma_disciplina td
                 where td.id = turma_disciplina_unidade.turma_disciplina_id
                   and app.alcanca_turma(td.turma_id)));

drop policy if exists tdu_criar on public.turma_disciplina_unidade;
create policy tdu_criar on public.turma_disciplina_unidade
  for insert with check (
    app.pode('disciplinas', 'editar')
    and exists (select 1 from public.turma_disciplina td
                 where td.id = turma_disciplina_unidade.turma_disciplina_id
                   and app.alcanca_turma(td.turma_id)
                   and app.turma_em_oferta(td.turma_id)));

drop policy if exists tdu_editar on public.turma_disciplina_unidade;
create policy tdu_editar on public.turma_disciplina_unidade
  for update using (
    app.pode('disciplinas', 'editar')
    and exists (select 1 from public.turma_disciplina td
                 where td.id = turma_disciplina_unidade.turma_disciplina_id
                   and app.alcanca_turma(td.turma_id)
                   and app.turma_em_oferta(td.turma_id)))
  with check (
    app.pode('disciplinas', 'editar')
    and exists (select 1 from public.turma_disciplina td
                 where td.id = turma_disciplina_unidade.turma_disciplina_id
                   and app.alcanca_turma(td.turma_id)
                   and app.turma_em_oferta(td.turma_id)));

-- ⚠️ Tabela nova nasce com `ALL` para `authenticated` no Supabase: o `revoke` do Epico 1
--    foi uma foto do momento, nao regra permanente. Toda migration que cria tabela repete.
revoke delete, truncate on public.turma_disciplina_unidade from authenticated, anon;
grant select, insert, update on public.turma_disciplina_unidade to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE D — a conferencia dos cinco casos, adiada para o fim da transacao (FR-043)
-- ---------------------------------------------------------------------------------
create or replace function app.trg_soma_do_rateio()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_td_id      uuid;
  v_ch         numeric;
  v_modo       public.modo_atribuicao;
  v_n          integer;
  v_com_valor  integer;
  v_soma       numeric;
  v_com_ue     integer;
  v_ues        integer;
  v_atribuidas integer;
begin
  v_td_id := coalesce(new.turma_disciplina_id, old.turma_disciplina_id);

  select d.carga_horaria_tempos, d.modo_atribuicao_padrao
    into v_ch, v_modo
    from public.turma_disciplina td
    join public.disciplinas d on d.id = td.disciplina_id
   where td.id = v_td_id;

  if not found then
    return null;   -- a linha de turma foi embora na mesma transacao; nada a conferir
  end if;

  select count(*), count(*) filter (where ch_prevista_tempos is not null),
         coalesce(sum(ch_prevista_tempos), 0)
    into v_n, v_com_valor, v_soma
    from public.turma_disciplina_instrutor
   where turma_disciplina_id = v_td_id and status = 'ativo';

  select count(*) into v_com_ue
    from public.turma_disciplina_unidade
   where turma_disciplina_id = v_td_id and status = 'ativo';

  if v_n = 0 then
    -- Sem instrutor ativo nao ha rateio a conferir; e estado legitimo (90 de 175
    -- disciplinas estao assim hoje), e a tela sinaliza "sem instrutor" (RF-MATERIAS-03).
    if v_com_ue > 0 then
      raise exception 'ha UE atribuida sem instrutor ativo na turma'
        using errcode = '23514', hint = 'ue_sem_instrutor_ativo';
    end if;
    return null;
  end if;

  -- Casos 4 e 5 NAO coexistem (FR-041.6).
  if v_com_ue > 0 and v_com_valor > 0 then
    raise exception 'rateio por UE e por TA ao mesmo tempo'
      using errcode = '23514',
            hint = 'rateio_por_ue_com_ta',
            detail = 'No caso 5 a parcela e derivada da soma das UEs e ch_prevista_tempos '
                     'fica NULL. Escolha um dos dois.';
  end if;

  -- CASO 5 — por UE: toda UE ATIVA da disciplina precisa estar atribuida.
  if v_com_ue > 0 then
    select count(*) into v_ues
      from public.unidades_ensino u
      join public.turma_disciplina td on td.disciplina_id = u.disciplina_id
     where td.id = v_td_id and u.status = 'ativo';

    select count(*) into v_atribuidas
      from public.turma_disciplina_unidade tdu
      join public.unidades_ensino u on u.id = tdu.unidade_ensino_id
     where tdu.turma_disciplina_id = v_td_id and tdu.status = 'ativo' and u.status = 'ativo';

    if v_atribuidas <> v_ues then
      raise exception 'rateio por UE incompleto: % de % unidades atribuidas', v_atribuidas, v_ues
        using errcode = '23514',
              hint = 'ue_sem_instrutor',
              detail = jsonb_build_object('atribuidas', v_atribuidas, 'unidades', v_ues)::text;
    end if;
    return null;
  end if;

  -- Nenhuma parcela preenchida: caso 1, 2 ou 3 — a leitura deriva, nada a conferir.
  if v_com_valor = 0 then
    return null;
  end if;

  -- Mistura de preenchida com vazia: nao e caso nenhum.
  if v_com_valor <> v_n then
    raise exception 'rateio incompleto: % de % instrutores com parcela', v_com_valor, v_n
      using errcode = '23514',
            hint = 'rateio_incompleto',
            detail = 'Preencha a parcela de todos os instrutores ou de nenhum.';
  end if;

  -- CASO 2 — simultaneo: cada um recebe a CH integral.
  if v_modo = 'simultaneo' then
    if exists (select 1 from public.turma_disciplina_instrutor
                where turma_disciplina_id = v_td_id and status = 'ativo'
                  and ch_prevista_tempos <> v_ch) then
      raise exception 'no modo simultaneo cada instrutor recebe a CH integral (%)', v_ch
        using errcode = '23514',
              hint = 'rateio_nao_fecha',
              detail = jsonb_build_object('modo', 'simultaneo',
                                          'carga_horaria_tempos', v_ch)::text;
    end if;
    return null;
  end if;

  -- CASO 4 — por TA: a soma tem de fechar com a CH da disciplina.
  if v_soma <> v_ch then
    raise exception 'as parcelas somam % tempos; a disciplina tem %', v_soma, v_ch
      using errcode = '23514',
            hint = 'rateio_nao_fecha',
            detail = jsonb_build_object('soma', v_soma, 'carga_horaria_tempos', v_ch,
                                        'modo', 'dividido')::text;
  end if;

  return null;
end;
$$;

comment on function app.trg_soma_do_rateio() is
  'Confere os cinco casos do rateio (A-1, FR-041 a FR-043) ao FIM da transacao. Adiado de '
  'proposito: uma gravacao mexe em varias linhas, e conferir por linha reprovaria gravacao '
  'correta no meio do caminho. Parcelas todas NULL sao aceitas — sao as 96 migradas, e a '
  'leitura divide igualmente com aviso (Q-03, RN-DEG-01).';

revoke all on function app.trg_soma_do_rateio() from public, anon, authenticated;

drop trigger if exists trg_tdi_soma_do_rateio on public.turma_disciplina_instrutor;
create constraint trigger trg_tdi_soma_do_rateio
  after insert or update on public.turma_disciplina_instrutor
  deferrable initially deferred
  for each row execute function app.trg_soma_do_rateio();

drop trigger if exists trg_tdu_soma_do_rateio on public.turma_disciplina_unidade;
create constraint trigger trg_tdu_soma_do_rateio
  after insert or update or delete on public.turma_disciplina_unidade
  deferrable initially deferred
  for each row execute function app.trg_soma_do_rateio();

-- ---------------------------------------------------------------------------------
-- PARTE E — a RPC que regrava a atribuicao da turma, numa transacao (FR-031)
-- ---------------------------------------------------------------------------------
create or replace function app.definir_instrutores_da_turma(
  p_turma_disciplina_id uuid,
  p_instrutores         jsonb,
  p_unidades            jsonb default null)
returns setof public.turma_disciplina_instrutor
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_instrutores uuid[];
begin
  select coalesce(array_agg((x ->> 'instrutor_id')::uuid), array[]::uuid[])
    into v_instrutores
    from jsonb_array_elements(coalesce(p_instrutores, '[]'::jsonb)) x;

  -- ⚠️ Quem saiu e DESATIVADO, nunca apagado (regra 4): o historico de quem ministrou
  --    fica, e a atribuicao some das listas de nova escolha.
  update public.turma_disciplina_instrutor
     set status = 'inativo'
   where turma_disciplina_id = p_turma_disciplina_id
     and status = 'ativo'
     and not (instrutor_id = any (v_instrutores));

  -- A atribuicao por UE some junto com o instrutor que saiu.
  update public.turma_disciplina_unidade
     set status = 'inativo'
   where turma_disciplina_id = p_turma_disciplina_id
     and status = 'ativo'
     and not (instrutor_id = any (v_instrutores));

  -- Quem entrou ou voltou, com a parcela (caso 4) ou sem ela (casos 1, 2, 3 e 5).
  -- ⚠️ `codigo` de `turma_disciplina_instrutor` e COMPOSTO, nao sequencial: o ETL o monta
  --    como `<codigo da turma_disciplina>#<codigo do instrutor>` (`promover.py`), e a
  --    coluna e `NOT NULL` sem `DEFAULT` — um `DEFAULT` nao poderia ve-los, porque nao
  --    enxerga outra coluna da linha. A RPC repete a MESMA convencao, para que o codigo de
  --    uma atribuicao criada na tela seja indistinguivel do de uma migrada.
  insert into public.turma_disciplina_instrutor
    (codigo, turma_disciplina_id, instrutor_id, ch_prevista_tempos, status)
  select td.codigo || '#' || i.codigo, p_turma_disciplina_id, i.id,
         (x ->> 'ch_prevista_tempos')::numeric, 'ativo'
    from jsonb_array_elements(coalesce(p_instrutores, '[]'::jsonb)) x
    join public.instrutores i on i.id = (x ->> 'instrutor_id')::uuid
    join public.turma_disciplina td on td.id = p_turma_disciplina_id
  on conflict (turma_disciplina_id, instrutor_id) do update
    set ch_prevista_tempos = excluded.ch_prevista_tempos,
        status = 'ativo';

  -- Caso 5: a atribuicao de UE e regravada por completo quando vier.
  if p_unidades is not null then
    update public.turma_disciplina_unidade
       set status = 'inativo'
     where turma_disciplina_id = p_turma_disciplina_id and status = 'ativo';

    insert into public.turma_disciplina_unidade
      (turma_disciplina_id, disciplina_id, unidade_ensino_id, instrutor_id, status)
    select p_turma_disciplina_id, td.disciplina_id,
           (x ->> 'unidade_ensino_id')::uuid, (x ->> 'instrutor_id')::uuid, 'ativo'
      from jsonb_array_elements(p_unidades) x
      join public.turma_disciplina td on td.id = p_turma_disciplina_id
    on conflict (turma_disciplina_id, unidade_ensino_id) do update
      set instrutor_id = excluded.instrutor_id,
          status = 'ativo';
  end if;

  return query
    select * from public.turma_disciplina_instrutor
     where turma_disciplina_id = p_turma_disciplina_id and status = 'ativo';
end;
$$;

comment on function app.definir_instrutores_da_turma(uuid, jsonb, jsonb) is
  'Regrava POR COMPLETO a atribuicao de instrutores de uma disciplina naquela turma, numa '
  'transacao (FR-031). Quem sai e desativado, nunca apagado. `p_unidades` traz a atribuicao '
  'por UE do caso 5; ausente, o rateio e por TA (caso 4) ou derivado (1, 2, 3). INVOKER: '
  'quem decide sao as policies de `turma_disciplina_instrutor` e `turma_disciplina_unidade`.';

revoke all on function app.definir_instrutores_da_turma(uuid, jsonb, jsonb) from public, anon;
grant execute on function app.definir_instrutores_da_turma(uuid, jsonb, jsonb) to authenticated;

create or replace function public.definir_instrutores_da_turma(
  p_turma_disciplina_id uuid,
  p_instrutores         jsonb,
  p_unidades            jsonb default null)
returns setof public.turma_disciplina_instrutor
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select * from app.definir_instrutores_da_turma(p_turma_disciplina_id, p_instrutores, p_unidades);
$$;

revoke all on function public.definir_instrutores_da_turma(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.definir_instrutores_da_turma(uuid, jsonb, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- PARTE F — a view da CH prevista, reescrita nos cinco casos (FR-041.7)
--
-- ⚠️ O QUE ESTAVA ERRADO: a versao anterior fazia `carga_horaria_tempos /
--    instrutores_designados` e arredondava a 2 casas — ou seja, 10 TA entre 3 devolvia
--    3.33 tres vezes, somando 9.99. Com a A-1, a divisao e INTEIRA e o resto vai aos mais
--    antigos: 4 + 3 + 3 = 10. A fracao nao era so feia: ela nunca fechava com a CH.
--
-- ⚠️ A ORDEM DE ANTIGUIDADE VEM DE `app.fn_antiguidade_ordem`, que ja existia — nenhuma
--    segunda escala. `RN-ANT-02`.
-- ---------------------------------------------------------------------------------
create or replace view public.vw_instrutor_carga_prevista as
with atribuicoes as (
  select tdi.id                as atribuicao_id,
         tdi.instrutor_id,
         tdi.turma_disciplina_id,
         td.turma_id,
         d.id                  as disciplina_id,
         d.curso_id,
         d.nome_disciplina,
         c.codigo              as curso_codigo,
         t.codigo              as turma_codigo,
         d.carga_horaria_tempos,
         d.previsao_inicio,
         d.previsao_termino,
         d.semanas,
         tdi.ch_prevista_tempos,
         coalesce(nullif(v.modo_atribuicao, 'herdar'::public.modo_atribuicao),
                  d.modo_atribuicao_padrao) as modo,
         count(*) over (partition by tdi.turma_disciplina_id) as instrutores_designados,
         row_number() over (partition by tdi.turma_disciplina_id
                            order by app.fn_antiguidade_ordem(tdi.instrutor_id),
                                     tdi.instrutor_id)        as ordem_antiguidade,
         (select coalesce(sum(u.ch_prevista_tempos), 0)
            from public.turma_disciplina_unidade tdu
            join public.unidades_ensino u on u.id = tdu.unidade_ensino_id
           where tdu.turma_disciplina_id = tdi.turma_disciplina_id
             and tdu.instrutor_id = tdi.instrutor_id
             and tdu.status = 'ativo')                        as ch_das_unidades,
         exists (select 1 from public.turma_disciplina_unidade tdu
                  where tdu.turma_disciplina_id = tdi.turma_disciplina_id
                    and tdu.status = 'ativo')                 as rateio_por_ue
    from public.turma_disciplina_instrutor tdi
    join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
    join public.disciplinas d on d.id = td.disciplina_id
    join public.cursos c on c.id = d.curso_id
    join public.turmas t on t.id = td.turma_id
    left join public.instrutor_disciplina v
      on v.instrutor_id = tdi.instrutor_id
     and v.disciplina_id = d.id
     and v.status = 'ativo'::public.status_registro
   where tdi.status = 'ativo'::public.status_registro
     and td.status  = 'ativo'::public.status_registro
), rateadas as (
  select a.*,
         case
           -- Caso 5 — por UE: a soma da CH das UEs do instrutor.
           when a.rateio_por_ue then a.ch_das_unidades::numeric
           -- Caso 4 — por TA: o que foi digitado.
           when a.ch_prevista_tempos is not null then a.ch_prevista_tempos::numeric
           -- Caso 2 — simultaneo: a CH integral para cada um.
           when a.modo = 'simultaneo'::public.modo_atribuicao then a.carga_horaria_tempos::numeric
           -- Casos 1 e 3 — divisao INTEIRA, resto aos mais antigos (Q-03, A-1).
           else (a.carga_horaria_tempos / a.instrutores_designados)
                + case when a.ordem_antiguidade
                            <= (a.carga_horaria_tempos % a.instrutores_designados)
                       then 1 else 0 end
         end as tempos_previstos
    from atribuicoes a
)
select atribuicao_id,
       instrutor_id,
       turma_disciplina_id,
       turma_id,
       disciplina_id,
       curso_id,
       nome_disciplina,
       curso_codigo,
       turma_codigo,
       extract(year from previsao_inicio)::smallint as ano,
       previsao_inicio,
       previsao_termino,
       modo,
       instrutores_designados,
       tempos_previstos,
       semanas,
       case when semanas is not null and semanas > 0
            then round(tempos_previstos / semanas::numeric, 2)
            else null::numeric end as media_semanal
  from rateadas r;

comment on view public.vw_instrutor_carga_prevista is
  'CH PREVISTA por instrutor, nos cinco casos do rateio (A-1, Bernardo Villas Boas, '
  '25/09/2026; FR-041.7). ⚠️ A versao anterior dividia a CH pelo numero de instrutores e '
  'arredondava: 10 TA entre 3 davam 3.33 cada, somando 9.99. Agora a divisao e inteira e o '
  'resto vai AOS MAIS ANTIGOS (`app.fn_antiguidade_ordem`, RN-ANT-02): 4 + 3 + 3. A funcao '
  'pura `lib/dominio/rateio-de-carga.ts` e a referencia, e esta view e testada contra ela.';

-- ⚠️ View nova (ou recriada) nasce com DELETE e TRUNCATE para `authenticated`: o revoke do
--    Epico 1 e uma foto do momento. Repetir e obrigatorio.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_prevista from authenticated, anon;
grant select on public.vw_instrutor_carga_prevista to authenticated;
