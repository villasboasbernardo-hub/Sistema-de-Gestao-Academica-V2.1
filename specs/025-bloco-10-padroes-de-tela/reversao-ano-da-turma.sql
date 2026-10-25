-- Reversao da migration `20261024213231_ano_da_turma_na_carga_do_instrutor.sql` (spec 025, Bloco 10, RT-6).
-- Devolve as duas views com o corpo EXATO das migrations anteriores, na mesma ordem:
--   * `vw_instrutor_carga_prevista` — de `20261019035110_janela_da_ch_prevista.sql` (linhas 38 a 140);
--   * `vw_instrutor_carga_anual`    — de `20261023161634_publicacao_do_dsa_so_o_salvo_conta.sql` (linhas 354 a 461).
-- Gerado por script a partir do texto das migrations; nao editar a mao.

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

create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH vivas AS (
         SELECT a.id, a.instrutor_responsavel_id, a.fiscal_id, a.data_avaliacao, a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao]) AND a.salvo
        ), aplicacoes AS (
         -- RN-AV-12: cada sessão de aplicação, no ano DELA, para o aplicador e o fiscal da avaliação.
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, p.data, p.tempos_consumidos
           FROM sessoes_de_aplicacao p
             JOIN vivas a_1 ON a_1.id = p.avaliacao_id
          WHERE p.status = 'ativo'::status_registro AND p.salvo
        UNION ALL
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.data_avaliacao, a_1.tempos_consumidos
           FROM vivas a_1
        ), fatos AS (
         SELECT r.instrutor_id,
            EXTRACT(year FROM r.data)::smallint AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro AND r.salvo AND r.instrutor_id IS NOT NULL
          GROUP BY r.instrutor_id, (EXTRACT(year FROM r.data)::smallint)
        UNION ALL
         SELECT ap.instrutor_responsavel_id,
            EXTRACT(year FROM ap.data)::smallint AS "extract",
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM aplicacoes ap
          GROUP BY ap.instrutor_responsavel_id, (EXTRACT(year FROM ap.data)::smallint)
        UNION ALL
         -- A vista conta para quem a CONDUZ; sem condutor registrado, para o responsável da avaliação.
         SELECT COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id),
            EXTRACT(year FROM s.data)::smallint AS "extract",
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vistas_de_avaliacao s
             JOIN vivas a_1 ON a_1.id = s.avaliacao_id
          WHERE s.status = 'ativo'::status_registro AND s.salvo
          GROUP BY (COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id)), (EXTRACT(year FROM s.data)::smallint)
        UNION ALL
         SELECT ap.fiscal_id,
            EXTRACT(year FROM ap.data)::smallint AS "extract",
            0,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum
           FROM aplicacoes ap
          WHERE ap.fiscal_id IS NOT NULL
          GROUP BY ap.fiscal_id, (EXTRACT(year FROM ap.data)::smallint)
        ), consolidado AS (
         SELECT fatos.instrutor_id,
            fatos.ano,
            sum(fatos.ta) AS ta_ministrado,
            sum(fatos.ta_fiscal) AS ta_fiscalizado
           FROM fatos
          WHERE fatos.instrutor_id IS NOT NULL
          GROUP BY fatos.instrutor_id, fatos.ano
        ), previstos AS (
         SELECT vw_instrutor_carga_prevista.instrutor_id,
            vw_instrutor_carga_prevista.ano,
            sum(vw_instrutor_carga_prevista.tempos_previstos) AS ta_previsto
           FROM vw_instrutor_carga_prevista
          WHERE vw_instrutor_carga_prevista.ano IS NOT NULL
          GROUP BY vw_instrutor_carga_prevista.instrutor_id, vw_instrutor_carga_prevista.ano
        ), janelas AS (
         SELECT p_1.instrutor_id,
            generate_series(EXTRACT(year FROM p_1.previsao_inicio - 3)::integer, EXTRACT(year FROM p_1.previsao_termino + 3)::integer)::smallint AS ano
           FROM vw_instrutor_carga_prevista p_1
          WHERE p_1.previsao_inicio IS NOT NULL AND p_1.previsao_termino IS NOT NULL AND p_1.previsao_termino >= p_1.previsao_inicio
        ), anos AS (
         SELECT consolidado.instrutor_id,
            consolidado.ano
           FROM consolidado
        UNION
         SELECT previstos.instrutor_id,
            previstos.ano
           FROM previstos
        UNION
         SELECT janelas.instrutor_id,
            janelas.ano
           FROM janelas
        )
 SELECT i.id AS instrutor_id,
    i.codigo AS instrutor_codigo,
    i.posto_graduacao,
    COALESCE(i.nome_guerra, i.nome_completo) AS nome_exibicao,
    i.nome_completo,
    i.om,
    i.dep_divisao,
    i.regime_trabalho,
    i.status,
    app.fn_antiguidade_ordem(i.id) AS ordem_antiguidade,
    a.ano,
    COALESCE(co.ta_ministrado, 0::numeric) AS ta_ministrado_ano,
    COALESCE(co.ta_fiscalizado, 0::numeric) AS ta_fiscalizado_ano,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.min'::text, a.ano) AS faixa_semanal_min,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.max'::text, a.ano) AS faixa_semanal_max,
        CASE
            WHEN i.data_assuncao_setor IS NOT NULL THEN floor((CURRENT_DATE - i.data_assuncao_setor)::numeric / 365.25)::integer
            ELSE NULL::integer
        END AS tempo_setor_anos,
    ( SELECT count(*) AS count
           FROM instrutor_disciplina v
          WHERE v.instrutor_id = i.id AND v.status = 'ativo'::status_registro) AS qtd_disciplinas_habilitadas,
    COALESCE(p.ta_previsto, 0::numeric) AS ta_previsto_ano
   FROM instrutores i
     LEFT JOIN anos a ON a.instrutor_id = i.id
     LEFT JOIN consolidado co ON co.instrutor_id = i.id AND co.ano = a.ano
     LEFT JOIN previstos p ON p.instrutor_id = i.id AND p.ano = a.ano;

-- ⚠️ Repetido de proposito, como na migration que se desfaz.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated, anon;
revoke all    on public.vw_instrutor_carga_anual from anon;
grant  select on public.vw_instrutor_carga_anual to authenticated;
