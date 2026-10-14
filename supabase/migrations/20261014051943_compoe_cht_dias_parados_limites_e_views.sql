-- =================================================================================
-- Spec 014, PR 1 · migration E-2 — compoe_cht recriada, dias parados, limites do currículo e as views
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (plan §3, data-model §2.2 [E-2], §2.4, §2.5, §2.7; FR-001.1, FR-013, FR-018, FR-024 a
-- FR-025.4; R-1, R-2, R-11):
--   1. RECRIA a coluna gerada `compoe_cht` com a expressão nova (EI e Apoio fora da CHT). Exceção
--      nominal à regra "nunca drop column", aceita por Bernardo em 13/10/2026 (decisão D-1 do plan):
--      a coluna é derivada. Medido no catálogo local em 14/10/2026: NENHUMA view nem função lê a
--      coluna — não há dependente a recriar. A contagem de `true` por categoria é conferida antes e
--      depois, dentro desta migration.
--   2. `ativ_alunos_so_apoio`; EI e Apoio só de turma.
--   3. `dias_parados` (R-1) e `limites_curriculo` (R-11), com RLS, policies, auditoria e revoke.
--   4. Sequências `DPA-` e `FER-` (esta, com setval no maior código já gravado em `feriados`: o remoto
--      tem FER- do ETL e da sincronização, gotcha 9), e `feriados.codigo` com DEFAULT.
--   5. `vw_carga_horaria_turma`: globais em cada turma com DSA na data (FR-013, A-1); Apoio e dias
--      parados em colunas próprias, fora da CHT. Colunas novas NO FIM (`vw_conformidade_tetos` depende).
--   6. `vw_dias_parados_turma` (FR-025.4).
--
-- Reversão (reversao-pr1.sql): `compoe_cht` com a expressão antiga e o comentário antigo; as views
-- anteriores (texto guardado no reversao-pr1.sql); `drop` das tabelas novas SÓ em base descartável — no
-- remoto, `status = 'inativo'`; o DEFAULT de `feriados.codigo` retirado.
-- =================================================================================

-- ---------------------------------------------------------------- 1. compoe_cht recriada (decisão D-1)
create temporary table _cht_antes on commit drop as
  select categoria_normativa::text as categoria, count(*) filter (where compoe_cht) as em_cht, count(*) as total
    from public.atividades_nao_letivas group by 1;

alter table public.atividades_nao_letivas drop column compoe_cht;
alter table public.atividades_nao_letivas add column compoe_cht boolean
  generated always as (categoria_normativa not in ('Estudo_Individual', 'Apoio_Individualizado')) stored;

comment on column public.atividades_nao_letivas.compoe_cht is
  'Coluna GERADA — materializa CHT = CHD + AEC + TAD + TR mantendo Estudo Individual e Apoio '
  'Individualizado FORA da soma (RN-EVT-01; 5ª categoria pela spec 014, D-AA-12). Recriada em '
  '14/10/2026 (decisão D-1 do plan da spec 014): coluna derivada, nada a perder.';

do $$
declare
  v_diferentes integer;
begin
  select count(*) into v_diferentes
    from _cht_antes a
    full join (select categoria_normativa::text as categoria, count(*) filter (where compoe_cht) as em_cht, count(*) as total
                 from public.atividades_nao_letivas group by 1) d using (categoria)
   where a.em_cht is distinct from d.em_cht or a.total is distinct from d.total;
  if v_diferentes > 0 then
    raise exception 'decisao D-1: compoe_cht mudou de resultado em % categoria(s) ao ser recriada', v_diferentes;
  end if;
end;
$$;

-- ---------------------------------------------------------------- 2. as CHECK que citam o valor novo
alter table public.atividades_nao_letivas add constraint ativ_alunos_so_apoio check (
  quantidade_alunos is null or categoria_normativa = 'Apoio_Individualizado'
);
alter table public.atividades_nao_letivas drop constraint ativ_estudo_individual_de_turma;
alter table public.atividades_nao_letivas add constraint ativ_estudo_individual_de_turma check (
  categoria_normativa not in ('Estudo_Individual', 'Apoio_Individualizado') or escopo = 'turma'
);
comment on constraint ativ_estudo_individual_de_turma on public.atividades_nao_letivas is
  'RF-EXTRA-02: Estudo Individual é sempre de turma; o Apoio Individualizado também (alunos específicos de '
  'uma turma, spec 014).';

-- ---------------------------------------------------------------- 3a. sequência e código DPA-
create sequence app.dias_parados_codigo_seq as bigint;
select setval('app.dias_parados_codigo_seq', 1, false);

create or replace function app.proximo_codigo_dia_parado()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'DPA-' || lpad(nextval('app.dias_parados_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_dia_parado() from public, anon;
grant execute on function app.proximo_codigo_dia_parado() to authenticated, service_role;

-- ---------------------------------------------------------------- 3b. dias_parados (R-1)
create table public.dias_parados (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique default app.proximo_codigo_dia_parado(),
  turma_id           uuid references public.turmas(id) on delete restrict,
  data               date not null,
  ta_inicial         smallint check (ta_inicial is null or ta_inicial between 1 and 12),
  tempos             smallint check (tempos is null or tempos between 1 and 12),
  tipo_parada_id     uuid not null references public.config_listas(id) on delete restrict,
  motivo             text not null check (length(btrim(motivo)) >= 3),
  prevista           boolean not null default true,
  status             public.status_registro not null default 'ativo',
  origem_migracao_v1 text,
  criado_por         uuid,
  criado_em          timestamptz not null default now(),
  editado_por        uuid,
  editado_em         timestamptz,
  constraint dpa_tempos_coerentes check ((ta_inicial is null) = (tempos is null)),
  constraint dpa_global_so_parte_do_dia check (turma_id is not null or ta_inicial is not null)
);

comment on table public.dias_parados is
  'Spec 014, R-1 e Q-14: o DIA PARADO — feriado ou licença previstos, só da turma ou de todas em parte do '
  'dia —, fora da CHT, dos tetos, do EI e do Apoio Individualizado. Bloqueia aula (RN-EVT-04 estendida). '
  'Global de dia inteiro é `feriados`, não esta tabela. Nada é apagado: desfazer é status = inativo.';
comment on column public.dias_parados.turma_id is 'Nulo = todas as turmas com DSA na data (parada global de parte do dia).';
comment on column public.dias_parados.ta_inicial is 'Nulo junto com `tempos` = dia inteiro.';

create index dias_parados_data_idx on public.dias_parados (data);
create index dias_parados_turma_data_idx on public.dias_parados (turma_id, data);

create trigger trg_dias_parados_auditoria before insert or update on public.dias_parados
  for each row execute function app.set_auditoria();

alter table public.dias_parados enable row level security;

create policy dias_parados_ler on public.dias_parados
  for select to authenticated
  using (app.pode('atividades_nao_letivas', 'ler') and app.alcanca_turma(turma_id));

create policy dias_parados_criar on public.dias_parados
  for insert to authenticated
  with check (
    case when turma_id is null
      then coalesce(app.pode('calendario', 'criar'), false)
      else app.pode('atividades_nao_letivas', 'criar') and app.alcanca_turma(turma_id)
           and app.turma_em_oferta(turma_id)  -- FR-017.5 (spec 009): curso fora de oferta não recebe escrita
    end
  );

create policy dias_parados_editar on public.dias_parados
  for update to authenticated
  using (
    case when turma_id is null
      then coalesce(app.pode('calendario', 'editar'), false)
      else app.pode('atividades_nao_letivas', 'editar') and app.alcanca_turma(turma_id)
           and app.turma_em_oferta(turma_id)
    end
  )
  with check (
    case when turma_id is null
      then coalesce(app.pode('calendario', 'editar'), false)
      else app.pode('atividades_nao_letivas', 'editar') and app.alcanca_turma(turma_id)
           and app.turma_em_oferta(turma_id)
    end
  );

revoke delete, truncate on public.dias_parados from authenticated, anon;

-- ---------------------------------------------------------------- 3c. limites_curriculo (R-11)
create table public.limites_curriculo (
  id                 uuid primary key default gen_random_uuid(),
  curso_id           uuid not null references public.cursos(id) on delete restrict,
  categoria          public.categoria_normativa not null check (categoria in ('AEC', 'TAD', 'TR')),
  tempos             integer not null check (tempos >= 0),
  fonte_arquivo      text not null,
  fonte_pagina       smallint not null check (fonte_pagina > 0),
  status             public.status_registro not null default 'ativo',
  origem_migracao_v1 text,
  criado_por         uuid,
  criado_em          timestamptz not null default now(),
  editado_por        uuid,
  editado_em         timestamptz
);

comment on table public.limites_curriculo is
  'Spec 014, FR-001.1 e Q-16: o LIMITE MÁXIMO de AEC, TAD e TR que o quadro final do currículo do curso '
  'declara, em TA (1 h = 1 TA, premissa A-10), com arquivo e página. Curso sem linha cai no percentual '
  'da norma. Só informativo (regra 6): nunca vira CHECK de lançamento.';

create unique index limite_unico on public.limites_curriculo (curso_id, categoria) where status = 'ativo';

create trigger trg_limites_curriculo_auditoria before insert or update on public.limites_curriculo
  for each row execute function app.set_auditoria();

alter table public.limites_curriculo enable row level security;

create policy limites_curriculo_ler on public.limites_curriculo
  for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));
create policy limites_curriculo_criar on public.limites_curriculo
  for insert to authenticated
  with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
create policy limites_curriculo_editar on public.limites_curriculo
  for update to authenticated
  using (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

revoke delete, truncate on public.limites_curriculo from authenticated, anon;

-- ---------------------------------------------------------------- 4. sequência FER- (gotcha 9)
create sequence app.feriados_codigo_seq as bigint;

do $$
declare
  v_maior bigint;
begin
  select coalesce(max(substring(codigo from '^FER-([0-9]+)$')::bigint), 0) into v_maior
    from public.feriados where codigo ~ '^FER-[0-9]+$';
  if v_maior = 0 then
    perform setval('app.feriados_codigo_seq', 1, false);
  else
    perform setval('app.feriados_codigo_seq', v_maior, true);
  end if;
  raise notice 'spec 014 · sequencia FER- posicionada em %, a partir do maior codigo gravado.', v_maior;
end;
$$;

create or replace function app.proximo_codigo_feriado()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'FER-' || lpad(nextval('app.feriados_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_feriado() from public, anon;
grant execute on function app.proximo_codigo_feriado() to authenticated, service_role;

alter table public.feriados alter column codigo set default app.proximo_codigo_feriado();

-- ---------------------------------------------------------------- 5. turma com DSA na data (A-1)
create or replace function app.turma_tem_dsa_na_data(p_turma_id uuid, p_data date)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.turmas t
     where t.id = p_turma_id
       and t.status = 'ativa'
       and t.modalidade <> 'ead'
       and p_data between t.data_inicio and t.data_termino
       and (t.modalidade <> 'semipresencial'
            or t.inicio_etapa_presencial is null
            or t.termino_etapa_presencial is null
            or p_data between t.inicio_etapa_presencial and t.termino_etapa_presencial)
  );
$$;
comment on function app.turma_tem_dsa_na_data(uuid, date) is
  'A-1 / FR-013 (spec 014): a turma tem DSA na data — ativa, não EAD, dentro do período e, se '
  'semipresencial, dentro da etapa presencial (D-DSA-2; sem etapa cadastrada, vale o período).';
revoke all on function app.turma_tem_dsa_na_data(uuid, date) from public, anon;
grant execute on function app.turma_tem_dsa_na_data(uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------- 6. vw_dias_parados_turma (FR-025.4)
create view public.vw_dias_parados_turma with (security_invoker = true) as
with regime as (
  select t.id as turma_id, coalesce(r.regime_padrao_tempos, 8) as tempos_do_dia
    from public.turmas t
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

comment on view public.vw_dias_parados_turma is
  'FR-025.4 (spec 014): a linha informativa "dias parados" da turma, por tipo, em dias e em tempos — o '
  'feriado de dia inteiro do calendário em dia com DSA, o dia parado global e o da turma. Fora da CHT, sem '
  'teto e sem alerta (Q-14). Dia inteiro conta os tempos do regime vigente do curso.';

revoke all on public.vw_dias_parados_turma from anon;
revoke insert, update, delete, truncate on public.vw_dias_parados_turma from authenticated;
grant select on public.vw_dias_parados_turma to authenticated;

-- ---------------------------------------------------------------- 7. vw_carga_horaria_turma (FR-013, Q-14)
create or replace view public.vw_carga_horaria_turma with (security_invoker = true) as
 WITH aulas AS (
         SELECT r.turma_id,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'aula'::categoria_registro_aula) AS ta_aula,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'atividade_extraclasse'::categoria_registro_aula) AS ta_extraclasse
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro
          GROUP BY r.turma_id
        ), provas AS (
         SELECT a.turma_id,
            sum(COALESCE(a.tempos_consumidos::integer, 0)) AS ta_aplicacao,
            sum(COALESCE(a.tempos_consumidos_vista::integer, 0)) AS ta_vista
           FROM avaliacoes a
          WHERE a.status <> 'cancelada'::status_avaliacao
          GROUP BY a.turma_id
        ), linhas_nao_letivas AS (
         -- da turma
         SELECT n.turma_id, n.categoria_normativa, n.tempos_consumidos
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NOT NULL
         UNION ALL
         -- global: soma em cada turma que tem DSA na data (FR-013, A-1)
         SELECT t.id, n.categoria_normativa, n.tempos_consumidos
           FROM atividades_nao_letivas n
           CROSS JOIN turmas t
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NULL
            AND app.turma_tem_dsa_na_data(t.id, n.data)
        ), nao_letivas AS (
         SELECT l.turma_id,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'AEC'::categoria_normativa) AS ta_aec,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TAD'::categoria_normativa) AS ta_tad,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TR'::categoria_normativa) AS ta_tr,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'Estudo_Individual'::categoria_normativa) AS ta_estudo_individual,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'Apoio_Individualizado'::categoria_normativa) AS ta_apoio_individualizado
           FROM linhas_nao_letivas l
          GROUP BY l.turma_id
        ), parados AS (
         SELECT p.turma_id, sum(p.tempos) AS ta_dias_parados
           FROM vw_dias_parados_turma p
          GROUP BY p.turma_id
        ), curricular AS (
         SELECT t_1.id AS turma_id,
            sum(d.carga_horaria_tempos) AS chr_curricular
           FROM turmas t_1
             JOIN disciplinas d ON d.curso_id = t_1.curso_id AND d.status = 'ativo'::status_registro
          GROUP BY t_1.id
        )
 SELECT t.id AS turma_id,
    t.codigo AS turma_codigo,
    t.curso_id,
    c.codigo AS curso_codigo,
    c.nome_curso,
    t.ano_letivo,
    t.status AS status_turma,
    COALESCE(cu.chr_curricular, 0::bigint) AS chr_curricular,
    COALESCE(au.ta_aula, 0::bigint) AS ta_aula,
    COALESCE(au.ta_extraclasse, 0::bigint) AS ta_extraclasse,
    COALESCE(pr.ta_aplicacao, 0::bigint) AS ta_avaliacao,
    COALESCE(pr.ta_vista, 0::bigint) AS ta_vista_prova,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) AS chd_executada,
    COALESCE(nl.ta_aec, 0::bigint) AS ta_aec,
    COALESCE(nl.ta_tad, 0::bigint) AS ta_tad,
    COALESCE(nl.ta_tr, 0::bigint) AS ta_tr,
    COALESCE(nl.ta_estudo_individual, 0::bigint) AS ta_estudo_individual,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(nl.ta_aec, 0::bigint) + COALESCE(nl.ta_tad, 0::bigint) + COALESCE(nl.ta_tr, 0::bigint) AS cht_executada,
    COALESCE(nl.ta_apoio_individualizado, 0::bigint) AS ta_apoio_individualizado,
    COALESCE(pa.ta_dias_parados, 0::bigint) AS ta_dias_parados
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id;

revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated;
