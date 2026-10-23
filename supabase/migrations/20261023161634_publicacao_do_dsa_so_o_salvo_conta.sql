-- =================================================================================
-- Spec 024 · Bloco 9 — M2: SÓ O SALVO CONTA (RP-8) — pelo PORTÃO AUTORIZADO
-- Data local: 23/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- ⚠️ ALTERA (regra 9.4), com o portão AUTORIZADO por Bernardo Villas Boas em 22/10/2026: *"o rascunho exige mudar as
--    views e funções que somam ou cruzam lançamentos (RP-8). Prova na cópia do remoto: tudo o que existe hoje nasce
--    SALVO, e andamento, saldo, DSA, papel, planilha e páginas das 29 turmas ficam IDÊNTICOS."*
--
-- Cada objeto abaixo é a ÚLTIMA definição dele (o arquivo de origem está antes de cada um), com UMA mudança: o filtro
-- `salvo` em cada tabela de lançamento que ele lê. Mesmas colunas, mesma ordem, `security_invoker` redeclarado (gotcha
-- 10). Com tudo o que existe `salvo = true` (o padrão da M1), o resultado é o mesmo; a prova está em
-- `specs/024-bloco-9-publicacao-do-dsa/antes-depois.md`.
--
--   · as somas: vw_carga_horaria_turma, vw_disciplinas_execucao, vw_chd_por_fato (e por ela chd_da_turma_ate e
--     execucao_por_disciplina_ate), vw_unidades_ensino_execucao, vw_instrutor_carga_anual, vw_avaliacoes_situacao;
--   · o cruzamento: vw_ocupacao_ta (e por ela conflitos_da_semana e ocupacao_para_conflitos);
--   · as travas: app.lancamentos_que_travam_vigencia, app.turma_tem_lancamento_no_dsa;
--   · a situação da vista: app.fn_status_vista;
--   · as conferências de data das sessões não correm no rascunho (D-5): correm no Salvar, sobre o salvo;
--   · o número da sessão passa a ser único só entre as salvas (a sombra repete o número do salvo).
--
-- Reversão: `specs/024-bloco-9-publicacao-do-dsa/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- de `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql`
create or replace view public.vw_ocupacao_ta with (security_invoker = true) as
 SELECT r.turma_id,
    r.data,
    r.ta_inicial,
    r.ta_final,
    r.tempos_consumidos,
    'aula'::text AS origem,
    r.id AS fato_id,
    COALESCE(ue.disciplina_id, r.disciplina_id) AS disciplina_id,
    r.instrutor_id,
    NULL::uuid AS fiscal_id,
    r.local,
    r.origem_migracao_v1 IS NOT NULL AND r.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM registros_aula r
     LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
  WHERE r.status = 'ativo'::status_registro AND r.salvo AND r.ta_inicial IS NOT NULL
UNION ALL
 SELECT a.turma_id,
    a.data_avaliacao AS data,
    a.ta_inicial,
    a.ta_final,
    a.tempos_consumidos,
    'avaliacao'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    a.instrutor_responsavel_id AS instrutor_id,
    a.fiscal_id,
    a.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM avaliacoes a
  WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
    AND a.salvo AND a.ta_inicial IS NOT NULL
UNION ALL
 -- RN-AV-12: a sessão 2..N da aplicação — o mesmo aplicador e o mesmo fiscal da avaliação.
 SELECT a.turma_id,
    p.data,
    p.ta_inicial,
    p.ta_final,
    p.tempos_consumidos,
    'sessao_aplicacao'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    a.instrutor_responsavel_id AS instrutor_id,
    a.fiscal_id,
    p.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    p.id AS sessao_id,
    p.numero AS numero_sessao
   FROM sessoes_de_aplicacao p
     JOIN avaliacoes a ON a.id = p.avaliacao_id
  WHERE p.status = 'ativo'::status_registro AND p.salvo AND a.salvo AND p.ta_inicial IS NOT NULL
    AND a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
UNION ALL
 SELECT a.turma_id,
    s.data,
    s.ta_inicial,
    s.ta_final,
    s.tempos_consumidos,
    'vista_prova'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    COALESCE(s.conduz_instrutor_id, a.instrutor_responsavel_id) AS instrutor_id,
    a.fiscal_id,
    s.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    s.id AS sessao_id,
    s.numero AS numero_sessao
   FROM vistas_de_avaliacao s
     JOIN avaliacoes a ON a.id = s.avaliacao_id
  WHERE s.status = 'ativo'::status_registro AND s.salvo AND a.salvo AND s.ta_inicial IS NOT NULL
    AND a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
UNION ALL
 SELECT n.turma_id,
    n.data,
    n.ta_inicial,
    n.ta_final,
    n.tempos_consumidos,
    'atividade_nao_letiva'::text AS origem,
    n.id AS fato_id,
    NULL::uuid AS disciplina_id,
    n.instrutor_id,
    NULL::uuid AS fiscal_id,
    n.local,
    n.origem_migracao_v1 IS NOT NULL AND n.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM atividades_nao_letivas n
  WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.ta_inicial IS NOT NULL;

-- ---------------------------------------------------------------- de `20261021030050_curriculo_versionado_ligacao.sql`
create or replace view public.vw_carga_horaria_turma with (security_invoker = true) as
WITH aulas AS (
         SELECT r.turma_id,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'aula'::categoria_registro_aula) AS ta_aula,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'atividade_extraclasse'::categoria_registro_aula) AS ta_extraclasse
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro AND r.salvo
          GROUP BY r.turma_id
        ), vivas AS (
         SELECT a.id,
            a.turma_id,
            a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao, 'concluida'::status_avaliacao, 'atrasada'::status_avaliacao]) AND a.salvo
        ), provas AS (
         SELECT v.turma_id,
            (sum(COALESCE(v.tempos_consumidos::integer, 0))::numeric + sum(( SELECT COALESCE(sum(p.tempos_consumidos), 0::bigint) AS "coalesce"
                   FROM sessoes_de_aplicacao p
                  WHERE p.avaliacao_id = v.id AND p.status = 'ativo'::status_registro AND p.salvo)))::bigint AS ta_aplicacao,
            sum(( SELECT COALESCE(sum(s.tempos_consumidos), 0::bigint) AS "coalesce"
                   FROM vistas_de_avaliacao s
                  WHERE s.avaliacao_id = v.id AND s.status = 'ativo'::status_registro AND s.salvo))::bigint AS ta_vista
           FROM vivas v
          GROUP BY v.turma_id
        ), linhas_nao_letivas AS (
         SELECT n.turma_id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.turma_id IS NOT NULL
        UNION ALL
         SELECT t_1.id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
             CROSS JOIN turmas t_1
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.turma_id IS NULL AND app.turma_tem_dsa_na_data(t_1.id, n.data)
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
         SELECT p.turma_id,
            sum(p.tempos) AS ta_dias_parados
           FROM vw_dias_parados_turma p
          GROUP BY p.turma_id
        ), fora AS (
         SELECT f.turma_id,
            sum(f.tempos) AS ta_fora_do_dsa
           FROM ta_fora_do_dsa f
          WHERE f.status = 'ativo'::status_registro
          GROUP BY f.turma_id
        ), curricular AS (
         SELECT t_1.id AS turma_id,
            sum(d.carga_horaria_tempos) AS chr_curricular
           FROM turmas t_1
             JOIN disciplinas d ON d.curriculo_id = t_1.curriculo_id AND d.status = 'ativo'::status_registro
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
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) AS chd_executada,
    COALESCE(nl.ta_aec, 0::bigint) AS ta_aec,
    COALESCE(nl.ta_tad, 0::bigint) AS ta_tad,
    COALESCE(nl.ta_tr, 0::bigint) AS ta_tr,
    COALESCE(nl.ta_estudo_individual, 0::bigint) AS ta_estudo_individual,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) + COALESCE(nl.ta_aec, 0::bigint) + COALESCE(nl.ta_tad, 0::bigint) + COALESCE(nl.ta_tr, 0::bigint) AS cht_executada,
    COALESCE(nl.ta_apoio_individualizado, 0::bigint) AS ta_apoio_individualizado,
    COALESCE(pa.ta_dias_parados, 0::bigint::numeric) AS ta_dias_parados,
    COALESCE(fo.ta_fora_do_dsa, 0::bigint) AS ta_fora_do_dsa
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id
     LEFT JOIN fora fo ON fo.turma_id = t.id;

-- ---------------------------------------------------------------- de `20261021030050_curriculo_versionado_ligacao.sql`
create or replace view public.vw_disciplinas_execucao with (security_invoker = true) as
WITH aulas AS (
         SELECT COALESCE(ue.disciplina_id, r.disciplina_id) AS disciplina_id,
            r.turma_id,
            min(r.data) AS primeira_data,
            max(r.data) AS ultima_data,
            sum(r.tempos_consumidos) AS ta
           FROM registros_aula r
             LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
          WHERE r.status = 'ativo'::status_registro AND r.salvo AND COALESCE(ue.disciplina_id, r.disciplina_id) IS NOT NULL
          GROUP BY (COALESCE(ue.disciplina_id, r.disciplina_id)), r.turma_id
        ), sessoes AS (
         SELECT s.avaliacao_id,
            max(s.data) AS ultima_vista,
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS ta_vista
           FROM vistas_de_avaliacao s
          WHERE s.status = 'ativo'::status_registro AND s.salvo
          GROUP BY s.avaliacao_id
        ), aplicacoes AS (
         SELECT p.avaliacao_id,
            max(p.data) AS ultima_sessao,
            sum(COALESCE(p.tempos_consumidos::integer, 0)) AS ta_sessoes
           FROM sessoes_de_aplicacao p
          WHERE p.status = 'ativo'::status_registro AND p.salvo
          GROUP BY p.avaliacao_id
        ), provas AS (
         SELECT a.disciplina_id,
            a.turma_id,
            min(a.data_avaliacao) AS primeira_data,
            GREATEST(max(a.data_avaliacao), max(se.ultima_vista), max(ap.ultima_sessao)) AS ultima_data,
            sum(COALESCE(a.tempos_consumidos::integer, 0) + COALESCE(ap.ta_sessoes, 0::bigint) + COALESCE(se.ta_vista, 0::bigint))::bigint AS ta
           FROM avaliacoes a
             LEFT JOIN sessoes se ON se.avaliacao_id = a.id
             LEFT JOIN aplicacoes ap ON ap.avaliacao_id = a.id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao, 'concluida'::status_avaliacao, 'atrasada'::status_avaliacao]) AND a.salvo
          GROUP BY a.disciplina_id, a.turma_id
        ), fora AS (
         SELECT f.disciplina_id,
            f.turma_id,
            min(f.data) AS primeira_data,
            max(f.data) AS ultima_data,
            sum(f.tempos) AS ta
           FROM ta_fora_do_dsa f
          WHERE f.status = 'ativo'::status_registro
          GROUP BY f.disciplina_id, f.turma_id
        )
 SELECT d.id AS disciplina_id,
    d.codigo AS disciplina_codigo,
    d.curso_id,
    d.cod_disciplina,
    d.nome_disciplina,
    d.carga_horaria_tempos,
    t.id AS turma_id,
    t.codigo AS turma_codigo,
    t.ano_letivo,
    COALESCE(td.previsao_inicio, d.previsao_inicio) AS previsao_inicio_efetiva,
    COALESCE(td.previsao_termino, d.previsao_termino) AS previsao_termino_efetiva,
    td.origem_periodo,
    LEAST(au.primeira_data, pr.primeira_data, fo.primeira_data) AS data_real_inicio,
    GREATEST(au.ultima_data, pr.ultima_data, fo.ultima_data) AS data_real_termino,
    COALESCE(au.ta, 0::bigint) AS ta_aula_executados,
    COALESCE(pr.ta, 0::bigint) AS ta_avaliacao_executados,
    COALESCE(au.ta, 0::bigint) + COALESCE(pr.ta, 0::bigint) + COALESCE(fo.ta, 0::bigint) AS ta_executados,
    d.carga_horaria_tempos - COALESCE(au.ta, 0::bigint) - COALESCE(pr.ta, 0::bigint) - COALESCE(fo.ta, 0::bigint) AS ta_saldo,
    COALESCE(fo.ta, 0::bigint) AS ta_fora_do_dsa,
    d.nome_no_dsa
   FROM disciplinas d
     JOIN turmas t ON t.curriculo_id = d.curriculo_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
     LEFT JOIN fora fo ON fo.disciplina_id = d.id AND fo.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;

-- ---------------------------------------------------------------- de `20261019114024_ta_fora_do_dsa_e_execucao.sql`
create or replace view public.vw_chd_por_fato with (security_invoker = true) as
with vivas as (
  select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos, a.ta_inicial
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and a.salvo
)
select r.turma_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
       r.data,
       r.tempos_consumidos::bigint as tempos,
       'aula'::text as origem,
       r.ta_inicial is null as sem_posicao
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo' and r.salvo
union all
select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos, 0)::bigint, 'aplicacao',
       v.ta_inicial is null
  from vivas v
union all
select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos, 0)::bigint, 'sessao_de_aplicacao',
       p.ta_inicial is null
  from public.sessoes_de_aplicacao p
  join vivas v on v.id = p.avaliacao_id
 where p.status = 'ativo' and p.salvo
union all
select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos, 0)::bigint, 'vista',
       s.ta_inicial is null
  from public.vistas_de_avaliacao s
  join vivas v on v.id = s.avaliacao_id
 where s.status = 'ativo' and s.salvo
union all
select f.turma_id, f.disciplina_id, f.data, f.tempos::bigint, 'fora_do_dsa', true
  from public.ta_fora_do_dsa f
 where f.status = 'ativo';

-- ---------------------------------------------------------------- de `20260829235731_derivados_e_funcoes_de_dominio.sql`
create or replace view public.vw_unidades_ensino_execucao
with (security_invoker = true) as
select
  ue.id                        as unidade_ensino_id,
  ue.codigo                    as unidade_codigo,
  ue.disciplina_id,
  ue.curso_id,
  ue.numero_ue,
  ue.topico,
  ue.ch_prevista_tempos,
  r.turma_id,
  count(r.id)                  as lancamentos,
  coalesce(sum(r.tempos_consumidos), 0)                         as ta_executados,
  ue.ch_prevista_tempos - coalesce(sum(r.tempos_consumidos), 0) as ta_saldo,
  min(r.data)                  as data_real_inicio,
  max(r.data)                  as data_real_termino
from public.unidades_ensino ue
left join public.registros_aula r
       on r.unidade_ensino_id = ue.id and r.status = 'ativo' and r.salvo
where ue.status = 'ativo'
group by ue.id, ue.codigo, ue.disciplina_id, ue.curso_id, ue.numero_ue, ue.topico,
         ue.ch_prevista_tempos, r.turma_id;

-- ---------------------------------------------------------------- de `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql`
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

-- ---------------------------------------------------------------- de `20261014151554_situacao_calculada_e_vista_pelas_sessoes.sql`
create or replace view public.vw_avaliacoes_situacao with (security_invoker = true) as
select a.id, a.codigo, a.turma_id, a.disciplina_id, a.curso_id, a.avaliacao_curriculo_id, a.tipo_avaliacao,
       a.data_avaliacao, a.local, a.ta_inicial, a.tempos_consumidos, a.ta_final,
       a.instrutor_responsavel_id, a.fiscal_id, a.nome_fiscal_externo, a.status, a.status_anterior,
       a.item_planejado_id, a.conteudo_resumo, a.metodologia, a.observacoes, a.origem_migracao_v1,
       a.criado_por, a.criado_em, a.editado_por, a.editado_em,
       app.fn_status_vista(a.id, current_date) as situacao,
       t.codigo as turma_codigo, d.cod_disciplina, d.nome_disciplina
  from public.avaliacoes a
  join public.turmas t on t.id = a.turma_id
  join public.disciplinas d on d.id = a.disciplina_id
 where a.salvo;

-- ---------------------------------------------------------------- de `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql`
create or replace function app.lancamentos_que_travam_vigencia(p_vigencia_id uuid, p_desde date)
returns table(tipo text, data date, turma text, atividade text, total bigint, ponta_ausente text)
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  with v as (
    select curso_id from public.curso_regime_historico where id = p_vigencia_id
  ),
  achados (a_tipo, a_data, a_turma, a_atividade, a_ponta) as (
    -- ⚠️ A LISTA E A GARANTIA, E ELA ENVELHECE (FR-021.2). Toda tabela nova que passe a depender do
    --    regime entra AQUI, na mesma migration que a cria.
    -- ⚠️ SO O LANCAMENTO ATIVO TRAVA (emenda de 06/10/2026); a avaliacao viva pela LISTA POSITIVA (spec 014).
    select 'aula'::text, r.data, t.codigo, null::text, null::text
      from public.registros_aula r
      join v on v.curso_id = r.curso_id
      left join public.turmas t on t.id = r.turma_id
     where r.data >= p_desde
       and r.status = 'ativo' and r.salvo
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and a.salvo
    union all
    -- Spec 014 (RN-AV-12, 16/10/2026): a sessao 2..N da aplicacao, com horario proprio.
    select 'sessao_de_aplicacao', p.data, t.codigo, null, null
      from public.sessoes_de_aplicacao p
      join public.avaliacoes a on a.id = p.avaliacao_id
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where p.data >= p_desde
       and p.status = 'ativo' and p.salvo
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    -- Spec 014 (R-5): a vista pelas SESSOES, cada uma com horario proprio.
    select 'vista_de_prova', s.data, t.codigo, null, null
      from public.vistas_de_avaliacao s
      join public.avaliacoes a on a.id = s.avaliacao_id
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where s.data >= p_desde
       and s.status = 'ativo' and s.salvo
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
       and n.status = 'ativo' and n.salvo
    union all
    select 'atividade_global', n.data, t.codigo, n.descricao, t.ponta
      from public.atividades_nao_letivas n
      cross join lateral (
        select tu.codigo,
               case when tu.data_inicio is not null and tu.data_termino is null then 'termino'
                    when tu.data_inicio is null and tu.data_termino is not null then 'inicio' end as ponta
          from public.turmas tu
          join v on v.curso_id = tu.curso_id
         where (tu.data_inicio is not null and tu.data_termino is not null
                and n.data between tu.data_inicio and tu.data_termino)
            or (tu.data_inicio is not null and tu.data_termino is null and n.data >= tu.data_inicio)
            or (tu.data_inicio is null and tu.data_termino is not null and n.data <= tu.data_termino)
         order by tu.codigo
         limit 1
      ) t
     where n.turma_id is null and n.data >= p_desde
       and n.status = 'ativo' and n.salvo
  )
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$$;

-- ---------------------------------------------------------------- de `20261020025815_regimes_nomeados_por_curso.sql`
create or replace function app.turma_tem_lancamento_no_dsa(p_turma uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.registros_aula r where r.turma_id = p_turma and r.status = 'ativo' and r.salvo)
      or exists (select 1 from public.avaliacoes a
                  where a.turma_id = p_turma and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and a.salvo)
      or exists (select 1 from public.atividades_nao_letivas n where n.turma_id = p_turma and n.status = 'ativo' and n.salvo)
      or exists (select 1 from public.atividades_nao_letivas n
                   join public.turmas t on t.id = p_turma
                  where n.turma_id is null and n.status = 'ativo' and n.salvo
                    and t.data_inicio is not null and t.data_termino is not null
                    and n.data between t.data_inicio and t.data_termino)
      or exists (select 1 from public.dias_parados d where d.turma_id = p_turma and d.status = 'ativo')
      or exists (select 1 from public.dias_parados d
                   join public.turmas t on t.id = p_turma
                  where d.turma_id is null and d.status = 'ativo'
                    and t.data_inicio is not null and t.data_termino is not null
                    and d.data between t.data_inicio and t.data_termino);
$$;

-- ---------------------------------------------------------------- de `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql`
create or replace function app.fn_status_vista(p_avaliacao_id uuid, p_hoje date default current_date,
                                               p_prazo_dias integer default null)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  with a as (
    select av.id, av.status, av.data_avaliacao,
           -- A prova termina na ÚLTIMA sessão de aplicação (RN-AV-12): o prazo da vista conta dela.
           greatest(av.data_avaliacao,
                    (select max(s.data) from public.sessoes_de_aplicacao s
                      where s.avaliacao_id = av.id and s.status = 'ativo' and s.salvo)) as fim_da_aplicacao,
           -- RN-AV-13 (PM, PO e PE desde 16/10/2026): a obrigação é do INSTRUMENTO — o do item; sem item, o da
           -- própria prova. Instrumento desconhecido: exige, como antes da emenda.
           (select coalesce((l.metadados ->> 'vista_obrigatoria')::boolean, false)
              from public.config_listas l
             where l.id = coalesce((select c.instrumento_id from public.avaliacoes_curriculo c
                                     where c.id = av.avaliacao_curriculo_id),
                                   av.instrumento_id)) as vista_obrigatoria,
           exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = av.id and v.status = 'ativo' and v.salvo) as tem_sessao
      from public.avaliacoes av
     where av.id = p_avaliacao_id
  )
  select case
    when a.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then null
    when a.data_avaliacao is null or a.data_avaliacao > p_hoje then 'pendente'
    when not coalesce(a.vista_obrigatoria, true) or a.tem_sessao then 'concluida'
    when p_hoje - a.fim_da_aplicacao
         > coalesce(p_prazo_dias, app.fn_parametro_numerico('avaliacao.prazo_vista_dias')::integer, 7) then 'atrasada'
    else 'em_andamento'
  end
  from a;
$$;

-- ---------------------------------------------------------------- de `20261014151553_avaliacoes_do_curriculo_e_sessoes_de_vista.sql`
create or replace function app.vista_apos_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_aplicacao date;
begin
  select a.data_avaliacao into v_aplicacao from public.avaliacoes a where a.id = new.avaliacao_id;
  if new.status = 'ativo' and new.salvo and v_aplicacao is not null and new.data < v_aplicacao then
    raise exception 'A sessão de vista (%) não pode ser antes da aplicação da prova (%).', new.data, v_aplicacao
      using errcode = '23514', hint = 'vista_antes_da_aplicacao';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- de `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql`
create or replace function app.sessao_apos_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_aplicacao date;
begin
  select a.data_avaliacao into v_aplicacao from public.avaliacoes a where a.id = new.avaliacao_id;
  if new.status = 'ativo' and new.salvo and v_aplicacao is not null and new.data < v_aplicacao then
    raise exception 'A sessão de aplicação (%) não pode ser antes da 1ª aplicação da prova (%).', new.data, v_aplicacao
      using errcode = '23514', hint = 'sessao_antes_da_aplicacao';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- de `20261016153228_aplicacao_antes_das_sessoes_e_nucleo_de_juntar.sql`
create or replace function app.aplicacao_antes_das_sessoes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data   date;
  v_status text;
  v_sessao date;
  v_salvo  boolean;
begin
  -- Adiado: lê o estado FINAL da linha, e não o NEW do comando que disparou.
  select a.data_avaliacao, a.status::text, a.salvo into v_data, v_status, v_salvo from public.avaliacoes a where a.id = new.id;
  if v_data is null or not v_salvo or v_status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then
    return null;
  end if;
  select min(s.data) into v_sessao
    from public.sessoes_de_aplicacao s where s.avaliacao_id = new.id and s.status = 'ativo' and s.salvo;
  if v_sessao is not null and v_data > v_sessao then
    raise exception 'A 1ª aplicação da prova (%) não pode ficar depois da sessão de aplicação de % — as sessões são a 2ª, 3ª… da mesma prova.',
      v_data, v_sessao
      using errcode = '23514', hint = 'aplicacao_depois_das_sessoes';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------- os privilégios das views recriadas
-- ⚠️ NENHUM GRANT/REVOKE AQUI: `create or replace view` PRESERVA os privilégios, e as sete continuam com os de antes
--    (inclusive o resto inerte da R-8 em `vw_unidades_ensino_execucao`). Mexer neles seria mudar permissão, fora do portão.

-- ---------------------------------------------------------------- o número da sessão: único entre as salvas
drop index public.vst_numero_unico;
create unique index vst_numero_unico on public.vistas_de_avaliacao (avaliacao_id, numero)
  where status = 'ativo' and salvo;
drop index public.sap_numero_unico;
create unique index sap_numero_unico on public.sessoes_de_aplicacao (avaliacao_id, numero)
  where status = 'ativo' and salvo;

-- ---------------------------------------------------------------- item 2: a CHD na etapa presencial (função nova)
-- A CHD lançada NA ETAPA PRESENCIAL até uma data, só das turmas com a etapa cadastrada — a mesma base de
-- `chd_da_turma_ate` (`vw_chd_por_fato`, só o salvo); sem valor padrão e sem relógio do servidor, como ela.
create or replace function public.chd_da_turma_na_etapa_ate(p_ate date)
returns table (turma_id uuid, chd_executada bigint)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select f.turma_id, coalesce(sum(f.tempos), 0)::bigint
    from public.vw_chd_por_fato f
    join public.turmas t on t.id = f.turma_id
   where t.inicio_etapa_presencial is not null and t.termino_etapa_presencial is not null
     and f.data between t.inicio_etapa_presencial and least(t.termino_etapa_presencial, p_ate)
   group by f.turma_id;
$$;
revoke all on function public.chd_da_turma_na_etapa_ate(date) from public, anon;
grant execute on function public.chd_da_turma_na_etapa_ate(date) to authenticated;

-- ---------------------------------------------------------------- a guarda da escrita (RP-0, RP-1, RP-5)
/*
 * Com SESSÃO, toda inserção nas tabelas de lançamento nasce rascunho, e o registro SALVO só muda pelo Salvar (a marca
 * `app.dsa_salvando`, posta por `app.aplicar_rascunhos_da_semana`). Sem isto, quem lança gravaria direto pela interface de
 * dados — pulando o rascunho e a trava da semana publicada. Fora da guarda: o script sem sessão (RP-5: migration, ETL,
 * sincronização), a PARADA do dia (D-2: o TR bloqueante e o desfazer dele) e a atividade de TODAS as turmas (D-14),
 * que gravam na hora, como antes.
 */
create or replace function app.guardar_rascunho_do_dsa()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.dsa_salvando', true), '') = 'sim'
     or coalesce(current_setting('app.escrita_fora_do_dsa', true), '') = 'sim' then
    return new;
  end if;
  -- `bloqueia_aula` só existe na atividade: o `if` aninhado, porque o PL/pgSQL não garante curto-circuito no `and`.
  if tg_table_name = 'atividades_nao_letivas' then
    -- D-2 e D-14: a parada (TR bloqueante) e a atividade de TODAS as turmas gravam na hora.
    if new.bloqueia_aula or new.turma_id is null then
      return new;
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.salvo := false;
    return new;
  end if;
  if old.salvo then
    raise exception 'O lançamento salvo só muda pelo «Salvar» do DSA.'
      using errcode = '42501', hint = 'lancamento_salvo_so_pelo_salvar';
  end if;
  if new.salvo then
    raise exception 'Só o «Salvar» do DSA torna um rascunho salvo.'
      using errcode = '42501', hint = 'lancamento_salvo_so_pelo_salvar';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_rascunho_do_dsa() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'vistas_de_avaliacao',
                           'sessoes_de_aplicacao'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function app.guardar_rascunho_do_dsa()',
                   'trg_' || t || '_rascunho_do_dsa', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- D-15: as escritas fora do DSA
-- «Juntar como sessão» (Admin e Encarregado, na aba Avaliações) e a recategorização pelo tipo (a lista de tipos de
-- atividade) escrevem em lançamento SALVO com sessão, fora do DSA, e valem na hora, como antes do Bloco 9. A marca de
-- transação `app.escrita_fora_do_dsa` as deixa passar pela guarda; o corpo das duas é o de antes, mais a marca.
-- ⚠️ A marca não é alcançável por quem usa a interface de dados: `set_config` não é exposta pelo PostgREST.
CREATE OR REPLACE FUNCTION app.recategorizar_pelo_tipo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  -- Spec 024 (D-15): escrita FORA do DSA, que vale na hora (como antes) — a guarda do rascunho não a converte.
  perform set_config('app.escrita_fora_do_dsa', 'sim', true);
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
$function$;

CREATE OR REPLACE FUNCTION app.juntar_como_sessao_nucleo(p_prova_id uuid, p_avaliacao_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_prova  public.avaliacoes;
  v_outra  public.avaliacoes;
  v_numero smallint;
  v_id     uuid := gen_random_uuid();
  v_vistas jsonb;
begin
  -- Spec 024 (D-15): escrita FORA do DSA, que vale na hora (como antes) — a guarda do rascunho não a converte.
  perform set_config('app.escrita_fora_do_dsa', 'sim', true);
  if p_prova_id is null or p_avaliacao_id is null or p_prova_id = p_avaliacao_id then
    raise exception 'Escolha duas avaliações diferentes: a prova e a que vira sessão dela.'
      using errcode = '22023', hint = 'juntar_a_si_mesma';
  end if;

  -- SECURITY INVOKER: a RLS de `avaliacoes` decide o que se alcança; o que não se alcança chega como «não achou».
  select * into v_prova from public.avaliacoes where id = p_prova_id for update;
  select * into v_outra from public.avaliacoes where id = p_avaliacao_id for update;
  if v_prova.id is null or v_outra.id is null then
    raise exception 'Avaliação fora do alcance de quem junta.' using errcode = '42501', hint = 'juntar_fora_do_alcance';
  end if;
  if v_prova.turma_id is distinct from v_outra.turma_id or v_prova.disciplina_id is distinct from v_outra.disciplina_id then
    raise exception 'Só se junta avaliação da mesma turma e da mesma disciplina.'
      using errcode = '23514', hint = 'juntar_outra_disciplina';
  end if;
  if v_prova.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada')
     or v_outra.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then
    raise exception 'Só se junta avaliação viva (nem cancelada, nem substituída pela planilha).'
      using errcode = '23514', hint = 'juntar_avaliacao_nao_viva';
  end if;
  if v_outra.data_avaliacao is null or v_prova.data_avaliacao is null or v_outra.data_avaliacao < v_prova.data_avaliacao then
    raise exception 'A avaliação que vira sessão tem de ser aplicada no dia da prova ou depois dele.'
      using errcode = '23514', hint = 'juntar_anterior_a_prova';
  end if;
  if exists (select 1 from public.sessoes_de_aplicacao s where s.avaliacao_id = v_outra.id and s.status = 'ativo') then
    raise exception 'A avaliação escolhida já tem sessões de aplicação: junte a prova a ela, ou desfaça as sessões antes.'
      using errcode = '23514', hint = 'juntar_prova_com_sessoes';
  end if;

  select coalesce(max(s.numero), 1) + 1 into v_numero
    from public.sessoes_de_aplicacao s where s.avaliacao_id = v_prova.id and s.status = 'ativo';
  select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'codigo', v.codigo, 'numero', v.numero) order by v.numero), '[]')
    into v_vistas
    from public.vistas_de_avaliacao v where v.avaliacao_id = v_outra.id and v.status = 'ativo';

  -- Gotcha 4.1: o id é gerado antes e o INSERT vai SEM `returning`.
  insert into public.sessoes_de_aplicacao
    (id, avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local,
     juntada_de_avaliacao_id, juntada_em, avaliacao_juntada_antes)
  values (v_id, v_prova.id, v_numero, v_outra.data_avaliacao, v_outra.ta_inicial, v_outra.tempos_consumidos,
          v_outra.local, v_outra.id, now(), to_jsonb(v_outra) || jsonb_build_object('vistas_movidas', v_vistas));

  -- A vista é da PROVA: as sessões de vista da juntada passam para ela, depois das que ela já tem.
  with novas as (
    select v.id, (select coalesce(max(x.numero), 0) from public.vistas_de_avaliacao x
                   where x.avaliacao_id = v_prova.id and x.status = 'ativo')
                 + row_number() over (order by v.data, v.ta_inicial, v.numero) as numero
      from public.vistas_de_avaliacao v
     where v.avaliacao_id = v_outra.id and v.status = 'ativo'
  )
  update public.vistas_de_avaliacao v set avaliacao_id = v_prova.id, numero = n.numero::smallint
    from novas n where n.id = v.id;

  update public.avaliacoes
     set status = 'cancelada',
         observacoes = concat_ws(' ', '[JUNTADA COMO SESSAO ' || v_numero || ' DE ' || v_prova.codigo || ']', observacoes)
   where id = v_outra.id;

  return v_id;
end;
$function$;
