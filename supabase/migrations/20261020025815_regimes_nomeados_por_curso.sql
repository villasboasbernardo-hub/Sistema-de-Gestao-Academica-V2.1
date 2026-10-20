-- =================================================================================
-- Spec 018 · Bloco 3 — os REGIMES DE HORÁRIO NOMEADOS por curso, e a escolha da turma
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas, 19/10/2026: *"regimes de horário NOMEADOS por curso (ex.: Regime A com 8 TA,
--   Regime B com 9 TA, Regime C com 8 TA e intervalos menores), cadastrados e editados ali. Cada TURMA escolhe o seu
--   regime (padrão: o regime vigente do curso, para nada mudar em turma que não escolher), e o DSA dela usa esse
--   regime."*
-- Regra 9.4 (emenda de 19/10/2026): esta migration SÓ ACRESCENTA — tabela nova, coluna nova NULÁVEL, funções novas — e
--   recria `vw_dias_parados_turma` preferindo o regime da turma; com a coluna nula em toda turma (o dado de hoje), o
--   resultado é o mesmo, provado pela impressão digital do conteúdo antes × depois sobre a cópia do remoto (SC-009):
--   [pendente: medição do rito].
--
-- O que faz:
--   1. `public.regimes_de_horario` — o regime nomeado do curso: nome, TA por dia e duração (IMUTÁVEIS, `RF-HOR-02`),
--      início da manhã e da tarde, intervalos e o relógio do catálogo (editáveis só enquanto nenhuma turma que o usa
--      tiver lançamento, `RF-HOR-05`). Código `RGH-NNNNNN`. Inativar, nunca apagar (regra 4).
--   2. `public.turmas.regime_de_horario_id` — a escolha da turma, NULA = o regime vigente do curso (como hoje). FK
--      composta com o curso: o banco garante que o regime é do curso da turma. A escolha trava no primeiro lançamento.
--   3. As funções de apoio (a lista do que é lançamento é UMA) e duas leituras públicas para a tela.
--   4. `vw_dias_parados_turma`: o TA do dia passa a ser o do regime da turma, senão o do curso, senão 8.
--   ⚠️ Nada aqui lê data do servidor: as travas olham EXISTÊNCIA de lançamento. A view continua lendo
--      `vw_cursos_regime_vigente`, que resolve a vigência por `current_date` (o D20 residual, já registrado).
--
-- Reversão (só com `regimes_de_horario` vazia e nenhuma turma com regime; com dado, é decisão de Bernardo — regra 4):
--   recriar `vw_dias_parados_turma` com o corpo de `20261014051943`; `drop trigger trg_turmas_regime_de_horario`;
--   `alter table public.turmas drop constraint turmas_regime_do_proprio_curso_fk`, `drop column regime_de_horario_id`;
--   `drop table public.regimes_de_horario`; as funções e a sequência. O roteiro executável e provado é
--   `specs/018-bloco-3-pagina-do-curso-em-abas/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o código RGH-
-- Gotcha 5.1: o DEFAULT roda com os direitos de quem insere.
create sequence app.regimes_de_horario_codigo_seq as bigint;
select setval('app.regimes_de_horario_codigo_seq', 1, false);

create or replace function app.proximo_codigo_regime_de_horario()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'RGH-' || lpad(nextval('app.regimes_de_horario_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_regime_de_horario() from public, anon;
grant execute on function app.proximo_codigo_regime_de_horario() to authenticated, service_role;

-- ---------------------------------------------------------------- 2. a tabela
create table public.regimes_de_horario (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique default app.proximo_codigo_regime_de_horario(),
  curso_id                 uuid not null references public.cursos(id) on delete restrict,
  nome                     text not null check (length(btrim(nome)) between 1 and 60),

  -- IMUTÁVEIS (RF-HOR-02): decorrem do currículo.
  regime_tempos            smallint not null check (regime_tempos between 1 and 12),
  ta_duracao_min           smallint not null check (ta_duracao_min in (45, 50)),

  -- EDITÁVEIS enquanto nenhuma turma que usa o regime tiver lançamento (RF-HOR-05).
  intervalo_manha_min      smallint not null check (intervalo_manha_min between 0 and 120),
  intervalo_tarde_min      smallint not null check (intervalo_tarde_min between 0 and 120),
  hora_inicio_manha        time not null,
  hora_inicio_tarde        time not null,
  configuracao_horario_id  uuid references public.configuracoes_horario(id) on delete restrict,

  observacao               text check (observacao is null or length(observacao) <= 500),
  status                   public.status_registro not null default 'ativo',
  origem_migracao_v1       text,
  criado_por               uuid,
  criado_em                timestamptz not null default now(),
  editado_por              uuid,
  editado_em               timestamptz,

  constraint regimes_de_horario_tarde_depois_da_manha check (hora_inicio_tarde > hora_inicio_manha),
  -- O alvo da FK composta da turma: o regime e o curso dele.
  constraint regimes_de_horario_id_curso_key unique (id, curso_id)
);

comment on table public.regimes_de_horario is
  'Bloco 3 (spec 018): os regimes de horário NOMEADOS do curso (Regime A com 8 TA, Regime B com 9 TA…). A turma '
  'escolhe um (`turmas.regime_de_horario_id`); a que não escolhe fica no regime vigente do curso '
  '(`curso_regime_historico`). TA por dia e duração imutáveis (RF-HOR-02); o relógio só muda sem lançamento nas '
  'turmas que o usam (RF-HOR-05). Inativar, nunca apagar.';
comment on column public.regimes_de_horario.configuracao_horario_id is
  'Opcional: quando dado, o relógio do DSA vem do catálogo `horarios_tempos_aula` dessa configuração, como na vigência '
  'do curso.';

create unique index regimes_de_horario_nome_ativo_uq
  on public.regimes_de_horario (curso_id, lower(btrim(nome))) where status = 'ativo';
create index regimes_de_horario_curso_idx on public.regimes_de_horario (curso_id);

create trigger trg_regimes_de_horario_auditoria before insert or update on public.regimes_de_horario
  for each row execute function app.set_auditoria();

-- ---------------------------------------------------------------- 3. a escolha da turma
alter table public.turmas add column regime_de_horario_id uuid;
alter table public.turmas add constraint turmas_regime_do_proprio_curso_fk
  foreign key (regime_de_horario_id, curso_id) references public.regimes_de_horario (id, curso_id)
  on delete restrict;
create index turmas_regime_de_horario_idx on public.turmas (regime_de_horario_id);

comment on column public.turmas.regime_de_horario_id is
  'Bloco 3 (spec 018): o regime nomeado do curso que esta turma usa no DSA, nos alertas, na cascata, no dia parado e '
  'no saldo. NULO = o regime vigente do curso (como antes). Trava no primeiro lançamento da turma (RF-HOR-05).';

-- ---------------------------------------------------------------- 4. as funções de apoio
-- ⚠️ A LISTA DO QUE É LANÇAMENTO É UMA SÓ, e é a de `app.lancamentos_que_travam_vigencia` (20261016092307) restrita à
--    turma, mais o dia parado (que consome os TA do dia pelo regime). A sessão de aplicação e a vista não entram em
--    separado: elas exigem a avaliação viva, que já conta. O TA fora do DSA não ocupa tempo da grade e não entra.
create or replace function app.turma_tem_lancamento_no_dsa(p_turma uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.registros_aula r where r.turma_id = p_turma and r.status = 'ativo')
      or exists (select 1 from public.avaliacoes a
                  where a.turma_id = p_turma and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada'))
      or exists (select 1 from public.atividades_nao_letivas n where n.turma_id = p_turma and n.status = 'ativo')
      or exists (select 1 from public.atividades_nao_letivas n
                   join public.turmas t on t.id = p_turma
                  where n.turma_id is null and n.status = 'ativo'
                    and t.data_inicio is not null and t.data_termino is not null
                    and n.data between t.data_inicio and t.data_termino)
      or exists (select 1 from public.dias_parados d where d.turma_id = p_turma and d.status = 'ativo')
      or exists (select 1 from public.dias_parados d
                   join public.turmas t on t.id = p_turma
                  where d.turma_id is null and d.status = 'ativo'
                    and t.data_inicio is not null and t.data_termino is not null
                    and d.data between t.data_inicio and t.data_termino);
$$;
revoke all on function app.turma_tem_lancamento_no_dsa(uuid) from public, anon, authenticated;

create or replace function app.regime_escolhivel(p_regime uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce((select r.status = 'ativo' from public.regimes_de_horario r where r.id = p_regime), false);
$$;
revoke all on function app.regime_escolhivel(uuid) from public, anon, authenticated;

create or replace function app.regime_em_uso_com_lancamento(p_regime uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.turmas t
                  where t.regime_de_horario_id = p_regime
                    and app.turma_tem_lancamento_no_dsa(t.id));
$$;
revoke all on function app.regime_em_uso_com_lancamento(uuid) from public, anon, authenticated;

-- As duas leituras da TELA (o campo travado na ficha, o relógio travado no formulário do regime). O PostgREST não
-- expõe `app` (PGRST202), por isso moram em `public`; devolvem FALSO para quem não alcança a turma ou o curso.
create or replace function public.regime_da_turma_travado(p_turma uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(app.alcanca_turma(p_turma), false) and app.turma_tem_lancamento_no_dsa(p_turma);
$$;
revoke all on function public.regime_da_turma_travado(uuid) from public, anon;
grant execute on function public.regime_da_turma_travado(uuid) to authenticated;

create or replace function public.regime_de_horario_em_uso(p_regime uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce((select app.alcanca_curso(r.curso_id) from public.regimes_de_horario r where r.id = p_regime), false)
     and app.regime_em_uso_com_lancamento(p_regime);
$$;
revoke all on function public.regime_de_horario_em_uso(uuid) from public, anon;
grant execute on function public.regime_de_horario_em_uso(uuid) to authenticated;

-- ---------------------------------------------------------------- 5. o guarda do regime
create or replace function app.guardar_regime_de_horario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.curso_id is distinct from old.curso_id
     or new.codigo is distinct from old.codigo
     or new.regime_tempos is distinct from old.regime_tempos
     or new.ta_duracao_min is distinct from old.ta_duracao_min then
    raise exception 'A quantidade de TA por dia e a duracao do TA decorrem do curriculo e nao mudam (RF-HOR-02).'
      using errcode = '23514', hint = 'regime_curricular_imutavel';
  end if;

  if (new.hora_inicio_manha, new.hora_inicio_tarde, new.intervalo_manha_min, new.intervalo_tarde_min,
      new.configuracao_horario_id)
     is distinct from
     (old.hora_inicio_manha, old.hora_inicio_tarde, old.intervalo_manha_min, old.intervalo_tarde_min,
      old.configuracao_horario_id)
     and app.regime_em_uso_com_lancamento(old.id) then
    raise exception 'O horario deste regime nao muda: uma turma que o usa ja tem lancamento (RF-HOR-05).'
      using errcode = '23514', hint = 'regime_em_uso_com_lancamento';
  end if;

  -- ⚠️ A policy não vê OLD (gotcha 4): inativar e reativar exigem `horarios.desativar`, conferido aqui. Gotcha 15.
  if new.status is distinct from old.status
     and coalesce(app.pode('horarios', 'desativar'), false) is not true then
    raise exception 'Inativar ou reativar regime de horario exige a permissao de desativar horarios.'
      using errcode = '42501', hint = 'sem_permissao_de_desativar';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_regime_de_horario() from public, anon, authenticated;

create trigger trg_regimes_de_horario_guarda before update on public.regimes_de_horario
  for each row execute function app.guardar_regime_de_horario();

-- ---------------------------------------------------------------- 6. o guarda da escolha da turma
-- ⚠️ O CORPO NÃO TEM A PALAVRA DA SITUAÇÃO DA TURMA (pgTAP 101 e 138: nenhum gatilho de turmas recusa por situação):
--    a lógica mora nas funções de apoio.
create or replace function app.guardar_regime_da_turma()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.regime_de_horario_id is not distinct from old.regime_de_horario_id then
    return new;
  end if;
  if tg_op = 'UPDATE' and app.turma_tem_lancamento_no_dsa(new.id) then
    raise exception 'O regime de horario desta turma nao pode mais mudar: ela ja tem lancamento no DSA (RF-HOR-05).'
      using errcode = '23514', hint = 'regime_da_turma_travado';
  end if;
  if new.regime_de_horario_id is not null and not app.regime_escolhivel(new.regime_de_horario_id) then
    raise exception 'O regime de horario escolhido esta inativo.'
      using errcode = '23514', hint = 'regime_inativo';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_regime_da_turma() from public, anon, authenticated;

create trigger trg_turmas_regime_de_horario before insert or update of regime_de_horario_id on public.turmas
  for each row execute function app.guardar_regime_da_turma();

-- ---------------------------------------------------------------- 7. RLS
alter table public.regimes_de_horario enable row level security;

-- A mesma régua de `curso_regime_historico` (ler) e das vigências (escrever).
create policy regimes_de_horario_ler on public.regimes_de_horario
  for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));

create policy regimes_de_horario_criar on public.regimes_de_horario
  for insert to authenticated
  with check (coalesce(app.pode('horarios', 'criar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

create policy regimes_de_horario_editar on public.regimes_de_horario
  for update to authenticated
  using      (coalesce(app.pode('horarios', 'editar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (coalesce(app.pode('horarios', 'editar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

revoke delete, truncate on public.regimes_de_horario from authenticated, anon;

-- ---------------------------------------------------------------- 8. a view dos dias parados
-- O mesmo corpo de `20261014051943`, com UMA diferença: o TA do dia prefere o regime da turma. Mesmas colunas, mesma
-- ordem, `security_invoker` (gotcha 10).
create or replace view public.vw_dias_parados_turma with (security_invoker = true) as
with regime as (
  select t.id as turma_id, coalesce(rh.regime_tempos, r.regime_padrao_tempos, 8) as tempos_do_dia
    from public.turmas t
    left join public.regimes_de_horario rh on rh.id = t.regime_de_horario_id
    left join public.vw_cursos_regime_vigente r on r.curso_id = t.curso_id
),
paradas as (
  -- da turma
  select d.turma_id, d.data, tp.valor as tipo, d.tempos
    from public.dias_parados d
    join public.config_listas tp on tp.id = d.tipo_parada_id
   where d.status = 'ativo' and d.turma_id is not null
  union all
  -- global de parte do dia, em cada turma com DSA na data
  select t.id, d.data, tp.valor, d.tempos
    from public.dias_parados d
    join public.config_listas tp on tp.id = d.tipo_parada_id
    cross join public.turmas t
   where d.status = 'ativo' and d.turma_id is null
     and app.turma_tem_dsa_na_data(t.id, d.data)
  union all
  -- feriado de dia inteiro do calendário, em cada turma com DSA na data. O TIPO vem da sigla do
  -- prefixo "<sigla> — " da descrição quando ela casa com `tipos_parada`; senão, FR (histórico).
  select t.id, f.data,
         coalesce((select tp.valor from public.config_listas tp
                    where tp.lista = 'tipos_parada'
                      and f.descricao like tp.valor || ' — %'), 'FR'),
         null::smallint
    from public.feriados f
    cross join public.turmas t
   where f.status = 'ativo' and f.impacto = 'dia_inteiro'
     and app.turma_tem_dsa_na_data(t.id, f.data)
)
select p.turma_id,
       p.tipo,
       count(distinct p.data)                                as dias,
       sum(coalesce(p.tempos, rg.tempos_do_dia))::bigint      as tempos
  from paradas p
  join regime rg on rg.turma_id = p.turma_id
 group by p.turma_id, p.tipo;
