-- =================================================================================
-- Spec 014, PR 1 · migration E-1 — Apoio Individualizado no enum e o tipo da atividade com FK
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (plan §3, data-model §2.2 [E-1] e §2.3; FR-010, FR-012, FR-018, FR-025.1; R-3):
--   1. `Apoio_Individualizado` entra no enum `categoria_normativa` (5ª categoria, D-AA-12, Q-3).
--   2. `atividades_nao_letivas` ganha `tipo_atividade_id` (FK para `config_listas`), `bloqueia_aula`,
--      `tipo_parada_id` (FK para `config_listas`, lista `tipos_parada`), `quantidade_alunos` e
--      `outros_instrutores`.
--   3. O tipo é PREENCHIDO pelo `subtipo` só nas linhas SEM `origem_migracao_v1` (DSAP- e as da tela).
--      Medido na cópia `remoto-20261014-021627.sql`: 795 linhas sem procedência, 0 com subtipo que
--      não casa; as 664 históricas do ETL estão todas `inativo` e ficam sem tipo, como a catraca admite.
--   4. Catraca `ativ_tipo_obrigatorio` e `ativ_bloqueio_so_tr`.
--   5. Três gatilhos: o tipo deriva a categoria; `config_listas` valida o tipo; trocar a categoria de
--      um tipo recategoriza as linhas ativas que o apontam (cenário 4 da US2).
--   6. A policy de escrita: TR global bloqueante exige `calendario.criar` (Q-8).
--
-- ⚠️ R-7: NADA aqui usa o valor novo do enum fora de corpo de função. A expressão de `compoe_cht` e a
--    `CHECK` que cita `Apoio_Individualizado` ficam na E-2 (arquivo seguinte).
--
-- Reversão (specs/014-atividades-e-avaliacoes/reversao-pr1.sql): o enum NÃO perde valor (o Postgres não
-- remove valor de enum); derrubar os três gatilhos e as funções; devolver a policy anterior; as colunas
-- novas ficam, comentadas `[APOSENTADA — v2.1]`, e a catraca e `ativ_bloqueio_so_tr` saem.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o valor novo do enum
alter type public.categoria_normativa add value if not exists 'Apoio_Individualizado';

-- ---------------------------------------------------------------- 2. as colunas
alter table public.atividades_nao_letivas
  add column tipo_atividade_id  uuid references public.config_listas(id) on delete restrict,
  add column bloqueia_aula      boolean not null default false,
  add column tipo_parada_id     uuid references public.config_listas(id) on delete restrict,
  add column quantidade_alunos  smallint,
  add column outros_instrutores text[] not null default '{}';

alter table public.atividades_nao_letivas
  add constraint ativ_quantidade_alunos_positiva check (quantidade_alunos is null or quantidade_alunos > 0);

create index atividades_nao_letivas_tipo_idx on public.atividades_nao_letivas (tipo_atividade_id);

comment on column public.atividades_nao_letivas.tipo_atividade_id is
  'FR-010/FR-012 (spec 014): o TIPO da atividade, FK para `config_listas` (lista `tipos_atividade`). '
  'A categoria normativa DERIVA dele, por gatilho (`app.categoria_pelo_tipo`). Nula só na linha '
  'histórica do ETL (catraca `ativ_tipo_obrigatorio`).';
comment on column public.atividades_nao_letivas.bloqueia_aula is
  'FR-025.1 (spec 014): TR por licença NÃO prevista marcada "consome Tempo Reserva" — bloqueia aula '
  'nos tempos dela (RN-EVT-04 estendida). Só em TR com tipo de parada (`ativ_bloqueio_so_tr`).';
comment on column public.atividades_nao_letivas.tipo_parada_id is
  'FR-023 (spec 014): o tipo de parada (FR, LA, LP, NT…) do TR bloqueante, FK para `config_listas` '
  '(lista `tipos_parada`).';
comment on column public.atividades_nao_letivas.quantidade_alunos is
  'FR-020 (spec 014): quantos alunos, opcional, só no Apoio Individualizado. Sem nome de aluno (A-4).';
comment on column public.atividades_nao_letivas.outros_instrutores is
  'FR-046 (spec 014): os demais instrutores, como vieram ("A / B"). A junção com rateio é a PEND-014-1.';

-- ---------------------------------------------------------------- 3. o preenchimento (antes dos gatilhos)
update public.atividades_nao_letivas a
   set tipo_atividade_id = c.id
  from public.config_listas c
 where c.lista = 'tipos_atividade'
   and c.valor = a.subtipo
   and a.tipo_atividade_id is null
   and a.origem_migracao_v1 is null;

-- ---------------------------------------------------------------- 4. as catracas
alter table public.atividades_nao_letivas add constraint ativ_tipo_obrigatorio check (
  tipo_atividade_id is not null or origem_migracao_v1 is not null
);
comment on constraint ativ_tipo_obrigatorio on public.atividades_nao_letivas is
  'FR-012 (spec 014): linha nova exige o tipo. A histórica do ETL sem tipo fica como está (catraca).';

alter table public.atividades_nao_letivas add constraint ativ_bloqueio_so_tr check (
  not bloqueia_aula or (categoria_normativa = 'TR' and tipo_parada_id is not null)
);
comment on constraint ativ_bloqueio_so_tr on public.atividades_nao_letivas is
  'FR-025.1 (spec 014): só o TR por licença não prevista bloqueia aula, e sempre com o tipo de parada.';

-- ---------------------------------------------------------------- 5a. o tipo deriva a categoria
create or replace function app.categoria_pelo_tipo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tipo record;
begin
  -- A linha HISTÓRICA do ETL sem tipo não é tocada: nem preenchida, nem recusada (senão a inativação
  -- feita pela sincronização falharia). R-3.
  if new.tipo_atividade_id is null and new.origem_migracao_v1 is not null then
    return new;
  end if;

  -- Tipo pelo subtipo: quando vem nulo (o DSA e a sincronização de hoje mandam só o subtipo), ou
  -- quando o UPDATE mudou só o subtipo.
  if new.tipo_atividade_id is null
     or (tg_op = 'UPDATE'
         and new.subtipo is distinct from old.subtipo
         and new.tipo_atividade_id is not distinct from old.tipo_atividade_id) then
    select c.id into new.tipo_atividade_id
      from public.config_listas c
     where c.lista = 'tipos_atividade' and c.valor = new.subtipo;
  end if;

  if new.tipo_atividade_id is null then
    raise exception using errcode = '23514', message = format('O subtipo «%s» não está na lista de tipos de atividade.', new.subtipo),
      hint = 'tipo_de_atividade_inexistente';
  end if;

  select c.valor, c.metadados into v_tipo
    from public.config_listas c
   where c.id = new.tipo_atividade_id and c.lista = 'tipos_atividade';

  if not found then
    raise exception using errcode = '23514', message = 'O tipo informado não é da lista de tipos de atividade.',
      hint = 'tipo_de_atividade_inexistente';
  end if;

  if coalesce(v_tipo.metadados ->> 'uso', '') = 'aula' or (v_tipo.metadados ->> 'categoria') is null then
    raise exception using errcode = '23514', message = format('O tipo «%s» não tem categoria de atividade.', v_tipo.valor),
      hint = 'tipo_de_atividade_sem_categoria';
  end if;

  new.categoria_normativa := (v_tipo.metadados ->> 'categoria')::public.categoria_normativa;
  new.subtipo := v_tipo.valor;
  return new;
end;
$$;

revoke all on function app.categoria_pelo_tipo() from public, anon, authenticated;

comment on function app.categoria_pelo_tipo() is
  'D-AA-3 / R-3 (spec 014): a categoria normativa da atividade DERIVA do tipo (`config_listas.metadados.categoria`). '
  'Tipo pelo subtipo quando nulo; recusa tipo sem categoria ou de uso "aula". Não toca linha histórica sem tipo.';

create trigger trg_atividades_categoria_pelo_tipo
  before insert or update on public.atividades_nao_letivas
  for each row execute function app.categoria_pelo_tipo();

-- ---------------------------------------------------------------- 5b. a lista valida o tipo
create or replace function app.validar_tipo_de_atividade()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.lista <> 'tipos_atividade' then
    return new;
  end if;
  -- Tipo SEM categoria é aceito (o ETL e `semear_vocabulario_usado` gravam tipos de aula assim);
  -- a recusa de tipo sem categoria mora no gatilho da atividade e no filtro de oferta (FR-010).
  if (new.metadados ? 'categoria')
     and (new.metadados ->> 'categoria') not in (select unnest(enum_range(null::public.categoria_normativa))::text) then
    raise exception using errcode = '23514', message = format('A categoria «%s» não é categoria normativa.', new.metadados ->> 'categoria'),
      hint = 'categoria_de_tipo_invalida';
  end if;
  if (new.metadados ? 'uso') and (new.metadados ->> 'uso') <> 'aula' then
    raise exception using errcode = '23514', message = format('O uso «%s» não é reconhecido; o único é «aula».', new.metadados ->> 'uso'),
      hint = 'uso_de_tipo_invalido';
  end if;
  return new;
end;
$$;

revoke all on function app.validar_tipo_de_atividade() from public, anon, authenticated;

create trigger trg_config_listas_validar_tipo
  before insert or update on public.config_listas
  for each row execute function app.validar_tipo_de_atividade();

-- ---------------------------------------------------------------- 5c. trocar a categoria recategoriza
create or replace function app.recategorizar_pelo_tipo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.lista = 'tipos_atividade'
     and (new.metadados ->> 'categoria') is distinct from (old.metadados ->> 'categoria')
     and (new.metadados ->> 'categoria') is not null then
    -- Só as linhas ATIVAS que apontam o tipo; as históricas sem tipo nunca (catracas). O rastro é a
    -- auditoria das linhas (`editado_por`/`editado_em`) e a da própria lista.
    update public.atividades_nao_letivas
       set categoria_normativa = (new.metadados ->> 'categoria')::public.categoria_normativa
     where tipo_atividade_id = new.id
       and status = 'ativo';
  end if;
  return new;
end;
$$;

revoke all on function app.recategorizar_pelo_tipo() from public, anon, authenticated;

comment on function app.recategorizar_pelo_tipo() is
  'Cenário 4 da US2 (spec 014): quando a categoria de um tipo muda, as atividades ATIVAS daquele tipo '
  'passam a contar na categoria nova na próxima leitura; `compoe_cht`, gerada da coluna, acompanha.';

create trigger trg_config_listas_recategorizar
  after update of metadados on public.config_listas
  for each row execute function app.recategorizar_pelo_tipo();

-- ---------------------------------------------------------------- 6. a policy: TR global bloqueante é calendário
drop policy atividades_nao_letivas_criar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_criar on public.atividades_nao_letivas
  for insert to authenticated
  with check (
    app.pode('atividades_nao_letivas', 'criar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
    and (turma_id is not null or not bloqueia_aula or coalesce(app.pode('calendario', 'criar'), false))
    and app.turma_em_oferta(turma_id)
  );

drop policy atividades_nao_letivas_editar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_editar on public.atividades_nao_letivas
  for update to authenticated
  using (
    app.pode('atividades_nao_letivas', 'editar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
    and (turma_id is not null or not bloqueia_aula or coalesce(app.pode('calendario', 'editar'), false))
    and app.turma_em_oferta(turma_id)
  )
  with check (
    app.pode('atividades_nao_letivas', 'editar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
    and (turma_id is not null or not bloqueia_aula or coalesce(app.pode('calendario', 'editar'), false))
    and app.turma_em_oferta(turma_id)
  );
