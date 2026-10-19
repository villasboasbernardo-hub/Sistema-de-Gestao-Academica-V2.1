-- =================================================================================
-- Spec 016 · PR 3 · M2 — a JANELA da CH prevista do instrutor (item 1.13 do Bloco 1)
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisões de Bernardo Villas Boas:
--   Q-7 (17/10/2026) — corrigir a view neste bloco, pelo portão 9.4; a janela da atribuição sai, nesta ordem, do
--     período da LINHA DA TURMA (`turma_disciplina.previsao_*`), do período da DISCIPLINA (`disciplinas.previsao_*`)
--     e da JANELA DA TURMA (`turmas.data_inicio/termino`);
--   regra 9.4 — DESENHO APROVADO em 17/10/2026 (`specs/016-correcoes-bloco-1/contracts/migrations.md` §M2).
--
-- Por quê: `vw_instrutor_carga_prevista` tirava o ANO e a JANELA da atribuição só de `disciplinas.previsao_*` — o
--   período DO CURRÍCULO —, e ignorava o período por turma (spec 010) e a janela da turma. A atribuição sem período
--   na disciplina saía com `ano` nulo, e `vw_instrutor_carga_anual` a descarta (`where ano is not null`): o instrutor
--   ATRIBUÍDO não tinha CH prevista no ano (`RN-INST-04`; FR-013.1).
--
-- O que muda — e o que NÃO muda:
--   * `previsao_inicio`, `previsao_termino` e `ano` passam a ser a janela EFETIVA da atribuição, vinda INTEIRA de uma
--     fonte (research R-4): o banco permite início sem término nas três fontes, e misturar o início de uma com o
--     término de outra daria uma janela que ninguém cadastrou. Sem fonte com as duas datas, o ano sai do primeiro
--     início que existir e a janela fica sem término.
--   * NENHUMA coluna muda de nome, tipo nem ordem (medido: 0 diferenças no catálogo, com o esboço criado e desfeito),
--     e por isso a reversão é um `create or replace view` com o corpo anterior.
--   * O rateio em cinco casos (decisão A-1 da spec 010) está INTACTO, `semanas` e `media_semanal` também — a média de
--     reserva da `RN-DIST-02` é calculada na ficha, em `lib/dominio/media-semanal.ts` (research R-5).
--   * ⚠️ `with (security_invoker = true)` repetido (gotcha 10): `create or replace view` NÃO preserva as opções.
--
-- Medido (regra 9.2), com este SQL criado e desfeito no banco LOCAL restaurado da cópia `remoto-20261017-005738.sql`:
--   das 108 atribuições, a janela passa a vir da linha da turma em 103 e da turma em 5; as 8 linhas com `ano` nulo
--   (de 5 instrutores) passam a ter ano; o instrutor de código 15 vai de 114 a 271 TA de CH prevista em 2026, e o de
--   código 13 ganha 4 semanas acima da faixa (alerta, não bloqueio — `RN-DEG-02`). `tempos_previstos` não muda em
--   nenhuma das 108 (tabela em `contracts/migrations.md`).
--
-- Reversão: `create or replace view public.vw_instrutor_carga_prevista with (security_invoker = true) as …` com o
--   corpo exato de `20260926005750_ch_prevista_com_security_invoker.sql`. Provada numa base descartável pela
--   impressão digital do esquema antes e depois (DoD 6).
-- =================================================================================

create or replace view public.vw_instrutor_carga_prevista
with (security_invoker = true) as
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
         -- ⚠️ A JANELA EFETIVA (Q-7): inteira da PRIMEIRA fonte que tem as duas datas — linha da turma, disciplina,
         --    turma. Sem nenhuma, o início que existir (o ano conta) e sem término (fora do alerta semanal).
         case j.fonte
           when 'linha_da_turma' then td.previsao_inicio
           when 'disciplina'     then d.previsao_inicio
           when 'turma'          then t.data_inicio
           else coalesce(td.previsao_inicio, d.previsao_inicio, t.data_inicio)
         end                   as previsao_inicio,
         case j.fonte
           when 'linha_da_turma' then td.previsao_termino
           when 'disciplina'     then d.previsao_termino
           when 'turma'          then t.data_termino
         end                   as previsao_termino,
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
    cross join lateral (
      select case
               when td.previsao_inicio is not null and td.previsao_termino is not null then 'linha_da_turma'
               when d.previsao_inicio  is not null and d.previsao_termino  is not null then 'disciplina'
               when t.data_inicio      is not null and t.data_termino      is not null then 'turma'
             end as fonte
    ) j
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

-- ⚠️ Repetido de proposito: view recriada nasce com DELETE e TRUNCATE para `authenticated`.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_prevista from authenticated, anon;
revoke all    on public.vw_instrutor_carga_prevista from anon;
grant  select on public.vw_instrutor_carga_prevista to authenticated;
