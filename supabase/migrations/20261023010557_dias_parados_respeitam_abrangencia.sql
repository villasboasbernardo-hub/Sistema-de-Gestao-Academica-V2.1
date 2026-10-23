-- =================================================================================
-- Spec 023 · Bloco 8 — M2: `vw_dias_parados_turma` respeita a abrangência e o tipo da linha do calendário
-- Data local: 22/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O mesmo corpo de `20261020025815` (§8), com duas diferenças, as duas só no ramo do FERIADO:
--   1. o TIPO: `feriados.tipo_parada_id` (M1), senão a sigla do prefixo «<sigla> — » do nome, senão FR — o de hoje;
--   2. a ABRANGÊNCIA (D-3/D-4): linha sem turma escolhida ativa vale para todas as turmas; com, só para elas.
--
-- ⚠️ RECRIA VIEW SEM MUDAR O RESULTADO DE NADA EM TELA (regra 9.4, emenda de 19/10/2026): `feriado_turma` nasce vazia e
--    `tipo_parada_id` nulo em toda linha, e os dois ramos novos caem exatamente no de hoje. Provado sobre a cópia do
--    remoto: a saída inteira da view tem o mesmo md5 antes e depois (`specs/023-…/antes-depois.md`, medida 1).
-- ⚠️ `with (security_invoker = true)` redeclarado (gotcha 10); mesmas colunas, mesma ordem.
--
-- Reversão: `specs/023-bloco-8-calendario/reversao.sql` (recria pelo corpo de `20261020025815`).
-- =================================================================================

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
  -- feriado de dia inteiro do calendário, em cada turma com DSA na data que ele ALCANÇA (spec 023). O TIPO vem da
  -- coluna da linha; sem ela, da sigla do prefixo "<sigla> — " da descrição; senão, FR (histórico).
  select t.id, f.data,
         coalesce((select tp.valor from public.config_listas tp where tp.id = f.tipo_parada_id),
                  (select tp.valor from public.config_listas tp
                    where tp.lista = 'tipos_parada'
                      and f.descricao like tp.valor || ' — %'), 'FR'),
         null::smallint
    from public.feriados f
    cross join public.turmas t
   where f.status = 'ativo' and f.impacto = 'dia_inteiro'
     and app.turma_tem_dsa_na_data(t.id, f.data)
     and (not exists (select 1 from public.feriado_turma ft
                       where ft.feriado_id = f.id and ft.status = 'ativo')
          or exists (select 1 from public.feriado_turma ft
                      where ft.feriado_id = f.id and ft.turma_id = t.id and ft.status = 'ativo'))
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
