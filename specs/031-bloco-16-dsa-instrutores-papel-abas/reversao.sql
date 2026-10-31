-- Reversão da migration 20261030224204_instrutores_adicionais_da_aula.sql (spec 031, Bloco 16).
-- ⚠️ Antes de rodar: conferir que NENHUMA aula tem adicional gravado — a coluna sai, e com ela o dado.
--    select count(*) from public.registros_aula where cardinality(instrutores_adicionais) > 0;  -- tem de dar 0
begin;

do $$
begin
  if exists (select 1 from public.registros_aula where cardinality(instrutores_adicionais) > 0) then
    raise exception 'ha instrutor adicional gravado: a reversao apagaria dado';
  end if;
end $$;

-- A view com o corpo exato de 20261024213231 (sem o ramo dos adicionais), antes de a coluna sair.
create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH vivas AS (
         -- RT-6 (24/10/2026): a avaliação leva o ano da TURMA dela, e é ele que vale para a aplicação, a sessão e a vista.
         SELECT a.id, a.instrutor_responsavel_id, a.fiscal_id, a.data_avaliacao, a.tempos_consumidos,
                t.ano_letivo AS ano_da_turma
           FROM avaliacoes a
             JOIN turmas t ON t.id = a.turma_id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao]) AND a.salvo
        ), aplicacoes AS (
         -- RN-AV-12: cada sessão de aplicação, para o aplicador e o fiscal da avaliação — no ano da turma.
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.ano_da_turma, p.tempos_consumidos
           FROM sessoes_de_aplicacao p
             JOIN vivas a_1 ON a_1.id = p.avaliacao_id
          WHERE p.status = 'ativo'::status_registro AND p.salvo
        UNION ALL
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.ano_da_turma, a_1.tempos_consumidos
           FROM vivas a_1
        ), fatos AS (
         SELECT r.instrutor_id,
            t.ano_letivo AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
             JOIN turmas t ON t.id = r.turma_id
          WHERE r.status = 'ativo'::status_registro AND r.salvo AND r.instrutor_id IS NOT NULL
          GROUP BY r.instrutor_id, t.ano_letivo
        UNION ALL
         SELECT ap.instrutor_responsavel_id,
            ap.ano_da_turma,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM aplicacoes ap
          GROUP BY ap.instrutor_responsavel_id, ap.ano_da_turma
        UNION ALL
         -- A vista conta para quem a CONDUZ; sem condutor registrado, para o responsável da avaliação.
         SELECT COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id),
            a_1.ano_da_turma,
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vistas_de_avaliacao s
             JOIN vivas a_1 ON a_1.id = s.avaliacao_id
          WHERE s.status = 'ativo'::status_registro AND s.salvo
          GROUP BY (COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id)), a_1.ano_da_turma
        UNION ALL
         SELECT ap.fiscal_id,
            ap.ano_da_turma,
            0,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum
           FROM aplicacoes ap
          WHERE ap.fiscal_id IS NOT NULL
          GROUP BY ap.fiscal_id, ap.ano_da_turma
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

-- ⚠️ Repetido de proposito: view recriada nasce com DELETE e TRUNCATE para `authenticated`.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated, anon;
revoke all    on public.vw_instrutor_carga_anual from anon;
grant  select on public.vw_instrutor_carga_anual to authenticated;

drop trigger trg_registros_aula_instrutores_adicionais on public.registros_aula;
drop function app.conferir_instrutores_adicionais();
alter table public.registros_aula drop column instrutores_adicionais;

commit;
