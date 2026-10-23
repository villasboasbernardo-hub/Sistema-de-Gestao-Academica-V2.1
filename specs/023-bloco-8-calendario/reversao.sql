-- =================================================================================
-- Reversão da spec 023 (Bloco 8): M2 e M1, nesta ordem. Vale ANTES de uso real das turmas escolhidas: depois dele,
-- apagar `feriado_turma` faria os feriados restritos voltarem a valer para TODAS as turmas — decisão de Bernardo.
-- Provada numa base descartável, com a impressão digital do esquema voltando à de antes (antes-depois.md).
-- =================================================================================
begin;

-- M2: a view volta ao corpo de `20261020025815` (§8).
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
revoke all on public.vw_dias_parados_turma from anon;
revoke insert, update, delete, truncate on public.vw_dias_parados_turma from authenticated;
grant select on public.vw_dias_parados_turma to authenticated;

-- M1: a tabela, a sequência, as funções, o gatilho e a coluna.
drop table public.feriado_turma;
drop function app.proximo_codigo_feriado_turma();
drop sequence app.feriado_turma_codigo_seq;
drop trigger trg_feriados_tipo on public.feriados;
drop function app.conferir_tipo_do_feriado();
drop index public.idx_feriados_tipo_parada;
alter table public.feriados drop column tipo_parada_id;

delete from supabase_migrations.schema_migrations where version in ('20261023010547', '20261023010557');
commit;
