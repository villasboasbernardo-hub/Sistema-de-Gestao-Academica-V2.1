-- =================================================================================
-- Medição do efeito da M1 e da M2 (spec 016, PR 3) — SÓ LEITURA. T088 e T107 da spec 016.
--
-- USO — o mesmo arquivo nos dois bancos, porque é UMA instrução `with … select`:
--   local : docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -t -A < este_arquivo > dados.json
--   remoto: python -X utf8 -m scripts.provas.medir_no_remoto scripts/provas/medir_bloco_1.sql remoto > dados.json
-- e depois o cálculo, com as funções REAIS de `lib/dominio/` (andamento, faixa semanal, média de reserva):
--   DADOS_DA_MEDICAO=dados.json pnpm exec vitest run --config scripts/provas/medir_bloco_1/vitest.config.mjs --silent=false
--
-- O que sai, num JSON só:
--   * `turmas`      — por turma: a CHD executada ANTES (`vw_carga_horaria_turma.chd_executada`, que soma tudo) e
--                     DEPOIS (`chd_da_turma_ate(hoje)`), a CH prevista, o término, a modalidade e o regime vigente;
--   * `disciplinas` — por turma × disciplina com execução: `vw_disciplinas_execucao.ta_executados` (antes) ×
--                     `execucao_por_disciplina_ate(hoje, turma)` (depois);
--   * `atribuicoes` — por atribuição de instrutor: a janela ANTES (a regra antiga: só `disciplinas.previsao_*`) e
--                     DEPOIS (`vw_instrutor_carga_prevista`, a M2), a fonte da janela nova e os tempos previstos;
--   * `faixas`      — a faixa semanal de cada instrutor no ano de hoje (`config_parametros`, pelo regime dele);
--   * `feriados`    — os feriados de dia inteiro e ativos a partir de hoje (`RN-EVT-02`).
--
-- ⚠️ "HOJE" É O DIA DE SÃO PAULO (FR-014.3), calculado aqui por ser MEDIÇÃO, e não código de produção — as funções
--    da M1 não têm valor padrão de propósito. Para reproduzir a medição de 17/10/2026 sobre a cópia
--    `remoto-20261017-005738.sql`, troque a linha do `hoje` por `select date '2026-10-17' as hoje`.
-- ⚠️ Precisa da M1 e da M2 no banco medido (as funções e a view nova).
-- =================================================================================
with param as (
  select (now() at time zone 'America/Sao_Paulo')::date as hoje
),
turmas as (
  select coalesce(json_agg(json_build_object(
           'codigo', v.turma_codigo,
           'status', v.status_turma,
           'modalidade', t.modalidade,
           'data_termino', t.data_termino,
           'prevista', v.chr_curricular,
           'total', v.chd_executada,
           'ate_hoje', coalesce(f.chd_executada, 0),
           'regime_padrao_tempos', r.regime_padrao_tempos,
           'limite_diario_ead_horas', r.limite_diario_ead_horas
         ) order by v.turma_codigo), '[]'::json) as lista
    from public.vw_carga_horaria_turma v
    join public.turmas t on t.id = v.turma_id
    left join public.chd_da_turma_ate((select hoje from param)) f on f.turma_id = v.turma_id
    left join public.vw_cursos_regime_vigente r on r.curso_id = v.curso_id
),
disciplinas as (
  select coalesce(json_agg(json_build_object(
           'turma_codigo', v.turma_codigo,
           'cod_disciplina', v.cod_disciplina,
           'ch', v.carga_horaria_tempos,
           'total', coalesce(v.ta_executados, 0),
           'ate_hoje', coalesce(f.ta_executados, 0)
         ) order by v.turma_codigo, v.cod_disciplina), '[]'::json) as lista
    from public.vw_disciplinas_execucao v
    left join lateral public.execucao_por_disciplina_ate((select hoje from param), v.turma_id) f
      on f.disciplina_id = v.disciplina_id
   where coalesce(v.ta_executados, 0) > 0 or coalesce(f.ta_executados, 0) > 0
),
atribuicoes as (
  select coalesce(json_agg(json_build_object(
           'instrutor', i.codigo,
           'turma_codigo', p.turma_codigo,
           'tempos', p.tempos_previstos,
           'media', p.media_semanal,
           'antes_ano', extract(year from d.previsao_inicio)::int,
           'antes_ini', d.previsao_inicio,
           'antes_fim', d.previsao_termino,
           'depois_ini', p.previsao_inicio,
           'depois_fim', p.previsao_termino,
           'origem', case
                       when td.previsao_inicio is not null and td.previsao_termino is not null then 'linha_da_turma'
                       when d.previsao_inicio is not null and d.previsao_termino is not null then 'disciplina'
                       when t.data_inicio is not null and t.data_termino is not null then 'turma'
                     end
         ) order by i.codigo, p.turma_codigo, p.disciplina_id), '[]'::json) as lista
    from public.vw_instrutor_carga_prevista p
    join public.instrutores i on i.id = p.instrutor_id
    join public.turma_disciplina td on td.id = p.turma_disciplina_id
    join public.disciplinas d on d.id = p.disciplina_id
    join public.turmas t on t.id = p.turma_id
),
faixas as (
  select coalesce(json_agg(json_build_object(
           'instrutor_codigo', i.codigo,
           'minimo', app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.min',
                                               extract(year from (select hoje from param))::smallint),
           'maximo', app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.max',
                                               extract(year from (select hoje from param))::smallint)
         ) order by i.codigo), '[]'::json) as lista
    from public.instrutores i
   where i.regime_trabalho is not null
),
feriados as (
  select coalesce(json_agg(distinct f.data order by f.data), '[]'::json) as lista
    from public.feriados f
   where f.impacto = 'dia_inteiro' and f.status = 'ativo' and f.data >= (select hoje from param)
)
select json_build_object(
         'hoje', (select hoje from param),
         'turmas', (select lista from turmas),
         'disciplinas', (select lista from disciplinas),
         'atribuicoes', (select lista from atribuicoes),
         'faixas', (select lista from faixas),
         'feriados', (select lista from feriados)
       )::text as medicao;
