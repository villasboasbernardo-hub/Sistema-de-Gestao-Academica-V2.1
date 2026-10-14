-- =================================================================================
-- Spec 014, PR 4 — plano de REVERSÃO das migrations E-4, E-5, D-5, D-6, D-4 e D-7 (T154)
--
-- Ordem inversa da aplicação: D-7 → D-4 → D-6 → D-5 → E-5 → E-4.
-- ⚠️ No REMOTO, nada é apagado (regra 4): dado volta por UPDATE, item vira `inativo`, tabela fica. Os blocos
--    marcados «SÓ NA BASE DESCARTÁVEL» desfazem estrutura e servem para provar que a impressão digital volta.
-- ⚠️ O valor de enum `substituida_pela_planilha` NÃO se desfaz (o PostgreSQL não tem `drop value`): depois
--    da D-7 desfeita ele fica sem uso, e a impressão digital mostra exatamente essa diferença.
-- =================================================================================

begin;

-- ---------------------------------------------------------------- D-7 (três blocos)
-- D-8: o texto volta para observacoes, lido do migracao_log
update public.registros_aula r
   set observacoes = l.valor_antes, outros_instrutores = '{}'
  from public.migracao_log l
 where l.codigo like 'MLOG-014-D8-%' and l.destino_chave = r.codigo;
-- D-7b: as sessões criadas pela migration ficam inativas (a do espelho, criada depois, fica)
update public.vistas_de_avaliacao set status = 'inativo'
 where numero = 1 and status = 'ativo'
   and origem_migracao_v1 = 'spec014-D7b';
-- D-7: a substituída volta a cancelada
update public.avaliacoes set status = 'cancelada', status_anterior = null where status = 'substituida_pela_planilha';

-- ---------------------------------------------------------------- D-4
update public.avaliacoes_curriculo set status = 'inativo' where origem_migracao_v1 like 'spec014-D4:%';

-- ---------------------------------------------------------------- D-6 (o mapa de volta)
-- O mapa está em migracao_log (`MLOG-014-D6-…-<curso>`: origem_chave = a extra, destino_chave = a unificada,
-- e as contagens). A volta, por par:
--   update public.disciplinas set status = 'ativo' where id = <extra>;
--   update public.disciplinas set cod_disciplina = <cod antigo>, nome_disciplina = <nome antigo>,
--          carga_horaria_tempos = <ch antiga> where id = <unificada>;
--   as UEs de numeração da extra (I-I: UE 7; FIS: UE 2) voltam a ela;
--   aulas, avaliações e atividades cujos códigos o antes/depois lista voltam à extra;
--   a turma_disciplina extra volta a `ativo`, e as linhas `turma_disciplina_instrutor` com
--   origem `spec014-D6` ficam `inativo`.
-- ⚠️ Escrito por par e não genérico de propósito: a volta precisa da lista de lançamentos que o
--    antes/depois mediu (`antes-depois/unificar_hn2101_e_matfis.md`), não de uma regra que adivinhe.

-- ---------------------------------------------------------------- D-5 (os valores antigos, do migracao_log)
-- Cada caso B-n tem `valor_antes` («cod=…; nome=…; ch=…; status=…») em `MLOG-014-D5-…`; a volta é o UPDATE
-- desses quatro campos na disciplina do `origem_chave`.

-- =================================================================================
-- (A) SÓ NA BASE DESCARTÁVEL — a estrutura de volta ao estado da `main` antes do PR 4.
--     As definições abaixo foram EXTRAÍDAS do catálogo da `main` (`91ed061`, impressão `9acfa39d…`, 1.760 objetos),
--     com os privilégios de antes, por `pg_get_viewdef`/`pg_get_functiondef` — não reescritas à mão.
--     ⚠️ O valor de enum `substituida_pela_planilha` NÃO se desfaz (o PostgreSQL não tem `drop value`); a impressão
--     digital não lê rótulo de enum, e por isso volta igual.
-- =================================================================================

-- ---------------------------------------------------------------- E-5
drop trigger trg_avaliacoes_espelhar_vista on public.avaliacoes;
drop function app.espelhar_vista_na_sessao_1();
drop function public.situacao_da_avaliacao(uuid, date);
drop view public.vw_avaliacoes_situacao;
drop function app.fn_status_vista(uuid, date, integer);

CREATE OR REPLACE FUNCTION app.fn_status_vista(p_data_avaliacao date, p_data_vista date, p_status status_avaliacao, p_prazo_dias integer DEFAULT NULL::integer)
 RETURNS status_vista
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select case
    -- Vista registrada e avaliação concluída: realizada.
    when p_data_vista is not null and p_status = 'concluida' then 'realizada'::public.status_vista
    -- Passou do prazo sem vista registrada: atrasada (RF-AVAL-03, 7 dias corridos).
    when p_data_vista is null
     and p_status not in ('cancelada')
     and current_date - p_data_avaliacao
         > coalesce(p_prazo_dias, app.fn_parametro_numerico('avaliacao.prazo_vista_dias')::integer, 7)
    then 'atrasada'::public.status_vista
    else 'pendente'::public.status_vista
  end;
$function$
;
comment on function app.fn_status_vista(date,date,public.status_avaliacao,integer) is 'Situação da vista de prova. Porta a FORMULA `Status_Vista` da v2.0 §4.4. É FUNÇÃO e não coluna gerada porque depende de CURRENT_DATE — gravá-la em disco criaria uma segunda fonte de verdade que envelhece sozinha. Prazo lido de `config_parametros`. Origem: RF-AVAL-03.';
create view public.vw_avaliacoes_situacao with (security_invoker = true) as
 SELECT a.id,
    a.codigo,
    a.turma_id,
    a.disciplina_id,
    a.curso_id,
    a.tipo_avaliacao,
    a.data_avaliacao,
    a.local,
    a.ta_inicial,
    a.tempos_consumidos,
    a.ta_final,
    a.data_vista_prova,
    a.ta_inicial_vista,
    a.tempos_consumidos_vista,
    a.local_vista,
    a.ta_final_vista,
    a.instrutor_responsavel_id,
    a.fiscal_id,
    a.nome_fiscal_externo,
    a.status,
    a.item_planejado_id,
    a.conteudo_resumo,
    a.metodologia,
    a.observacoes,
    a.origem_migracao_v1,
    a.origem_execucao_v1,
    a.conciliacao_migracao,
    a.criado_por,
    a.criado_em,
    a.editado_por,
    a.editado_em,
    app.fn_status_vista(a.data_avaliacao, a.data_vista_prova, a.status) AS situacao_vista,
    t.codigo AS turma_codigo,
    d.cod_disciplina,
    d.nome_disciplina
   FROM avaliacoes a
     JOIN turmas t ON t.id = a.turma_id
     JOIN disciplinas d ON d.id = a.disciplina_id;
comment on view public.vw_avaliacoes_situacao is 'Avaliações com `situacao_vista` calculada na leitura (RF-AVAL-03, regra dos 7 dias). Porta a FORMULA `Status_Vista` da v2.0 §4.4 sem gravar em disco um estado que envelhece sozinho.';;
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
         SELECT n.turma_id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NOT NULL
        UNION ALL
         SELECT t_1.id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
             CROSS JOIN turmas t_1
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NULL AND app.turma_tem_dsa_na_data(t_1.id, n.data)
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
    COALESCE(pa.ta_dias_parados, 0::bigint::numeric) AS ta_dias_parados
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id;
create or replace view public.vw_disciplinas_execucao with (security_invoker = true) as
 WITH aulas AS (
         SELECT COALESCE(ue.disciplina_id, r.disciplina_id) AS disciplina_id,
            r.turma_id,
            min(r.data) AS primeira_data,
            max(r.data) AS ultima_data,
            sum(r.tempos_consumidos) AS ta
           FROM registros_aula r
             LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
          WHERE r.status = 'ativo'::status_registro AND COALESCE(ue.disciplina_id, r.disciplina_id) IS NOT NULL
          GROUP BY (COALESCE(ue.disciplina_id, r.disciplina_id)), r.turma_id
        ), provas AS (
         SELECT a.disciplina_id,
            a.turma_id,
            min(a.data_avaliacao) AS primeira_data,
            GREATEST(max(a.data_avaliacao), max(a.data_vista_prova)) AS ultima_data,
            sum(COALESCE(a.tempos_consumidos::integer, 0) + COALESCE(a.tempos_consumidos_vista::integer, 0)) AS ta
           FROM avaliacoes a
          WHERE a.status <> 'cancelada'::status_avaliacao
          GROUP BY a.disciplina_id, a.turma_id
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
    LEAST(au.primeira_data, pr.primeira_data) AS data_real_inicio,
    GREATEST(au.ultima_data, pr.ultima_data) AS data_real_termino,
    COALESCE(au.ta, 0::bigint) AS ta_aula_executados,
    COALESCE(pr.ta, 0::bigint) AS ta_avaliacao_executados,
    COALESCE(au.ta, 0::bigint) + COALESCE(pr.ta, 0::bigint) AS ta_executados,
    d.carga_horaria_tempos - COALESCE(au.ta, 0::bigint) - COALESCE(pr.ta, 0::bigint) AS ta_saldo
   FROM disciplinas d
     JOIN turmas t ON t.curso_id = d.curso_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;
create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH fatos AS (
         SELECT r.instrutor_id,
            EXTRACT(year FROM r.data)::smallint AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro AND r.instrutor_id IS NOT NULL
          GROUP BY r.instrutor_id, (EXTRACT(year FROM r.data)::smallint)
        UNION ALL
         SELECT a_1.instrutor_responsavel_id,
            EXTRACT(year FROM a_1.data_avaliacao)::smallint AS "extract",
            sum(COALESCE(a_1.tempos_consumidos::integer, 0) + COALESCE(a_1.tempos_consumidos_vista::integer, 0)) AS sum,
            0
           FROM avaliacoes a_1
          WHERE a_1.status <> 'cancelada'::status_avaliacao
          GROUP BY a_1.instrutor_responsavel_id, (EXTRACT(year FROM a_1.data_avaliacao)::smallint)
        UNION ALL
         SELECT a_1.fiscal_id,
            EXTRACT(year FROM a_1.data_avaliacao)::smallint AS "extract",
            0,
            sum(COALESCE(a_1.tempos_consumidos::integer, 0)) AS sum
           FROM avaliacoes a_1
          WHERE a_1.status <> 'cancelada'::status_avaliacao AND a_1.fiscal_id IS NOT NULL
          GROUP BY a_1.fiscal_id, (EXTRACT(year FROM a_1.data_avaliacao)::smallint)
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
drop view public.vw_ocupacao_ta;
create view public.vw_ocupacao_ta with (security_invoker = true) as
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
    r.origem_migracao_v1 IS NOT NULL AND r.editado_em IS NULL AS herdado
   FROM registros_aula r
     LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
  WHERE r.status = 'ativo'::status_registro AND r.ta_inicial IS NOT NULL
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
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado
   FROM avaliacoes a
  WHERE a.status <> 'cancelada'::status_avaliacao AND a.ta_inicial IS NOT NULL
UNION ALL
 SELECT a.turma_id,
    a.data_vista_prova AS data,
    a.ta_inicial_vista AS ta_inicial,
    a.ta_final_vista AS ta_final,
    a.tempos_consumidos_vista AS tempos_consumidos,
    'vista_prova'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    a.instrutor_responsavel_id AS instrutor_id,
    a.fiscal_id,
    a.local_vista AS local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado
   FROM avaliacoes a
  WHERE a.status <> 'cancelada'::status_avaliacao AND a.ta_inicial_vista IS NOT NULL
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
    n.origem_migracao_v1 IS NOT NULL AND n.editado_em IS NULL AS herdado
   FROM atividades_nao_letivas n
  WHERE n.status = 'ativo'::status_registro AND n.ta_inicial IS NOT NULL;
comment on view public.vw_ocupacao_ta is 'Quem ocupa cada Tempo de Aula, nas quatro origens. ⚠️ `turma_id` NULO e atividade de escopo global, que vale para toda turma ativa (V-7 da spec 013). ⚠️ `herdado` marca a linha que veio do ETL e nunca foi editada — o dominio a usa para tratar a posicao sentinela das avaliacoes migradas como SEM POSICAO (Q-12).';
CREATE OR REPLACE FUNCTION app.lancamentos_que_travam_vigencia(p_vigencia_id uuid, p_desde date)
 RETURNS TABLE(tipo text, data date, turma text, atividade text, total bigint, ponta_ausente text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with v as (
    select curso_id from public.curso_regime_historico where id = p_vigencia_id
  ),
  achados (a_tipo, a_data, a_turma, a_atividade, a_ponta) as (
    -- ⚠️ A LISTA E A GARANTIA, E ELA ENVELHECE (FR-021.2). Toda tabela nova que passe a depender do
    --    regime entra AQUI, na mesma migration que a cria — senao o cancelamento continua sendo
    --    aprovado e isto vira falsa garantia, sem erro nenhum.
    -- ⚠️ SO O LANCAMENTO ATIVO TRAVA (emenda de 06/10/2026): a linha excluida logicamente nao e
    --    registro do curso — e a mesma regra que a tira do DSA e da CH.
    select 'aula'::text, r.data, t.codigo, null::text, null::text
      from public.registros_aula r
      join v on v.curso_id = r.curso_id
      left join public.turmas t on t.id = r.turma_id
     where r.data >= p_desde
       and r.status = 'ativo'
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
       and a.status <> 'cancelada'
    union all
    -- A vista de prova e lancamento com horario proprio: ignora-la deixaria uma ponta do mesmo
    -- registro fora da protecao.
    select 'vista_de_prova', a.data_vista_prova, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_vista_prova >= p_desde
       and a.status <> 'cancelada'
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
       and n.status = 'ativo'
    union all
    -- ⚠️ ESCOPO GLOBAL, pelos TRES casos do FR-021.5 — pela JANELA, nunca pelo status da turma, que
    --    e mutavel e destravaria a vigencia ao virar `concluida`.
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
       and n.status = 'ativo'
  )
  -- ⚠️ As colunas da CTE levam prefixo `a_` porque os nomes de saida de `returns table` ficam em
  --    escopo aqui dentro, e `data` colidiria com `data`.
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.gravar_lancamentos_em_transacao(p_operacoes jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_op       jsonb;
  v_acao     text;
  v_tabela   text;
  v_campos   jsonb;
  v_id       uuid;
  v_colunas  text;
  v_qtd      integer;
  v_chaves   integer;
  v_linhas   integer;
  v_total    integer := 0;
begin
  if jsonb_typeof(p_operacoes) is distinct from 'array' or jsonb_array_length(p_operacoes) = 0 then
    raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
  end if;

  for v_op in select o from jsonb_array_elements(p_operacoes) as o loop
    v_acao   := v_op ->> 'acao';
    v_tabela := v_op ->> 'tabela';
    v_campos := v_op -> 'campos';

    if v_tabela is null
       or v_tabela not in ('registros_aula', 'avaliacoes', 'atividades_nao_letivas') then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;
    if jsonb_typeof(v_campos) is distinct from 'object' then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position), count(*)
      into v_colunas, v_qtd
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = v_tabela
       and c.is_generated = 'NEVER'
       and c.column_name not in ('criado_por', 'criado_em', 'editado_por', 'editado_em')
       and v_campos ? c.column_name;

    select count(*) into v_chaves from jsonb_object_keys(v_campos);
    if v_qtd = 0 or v_qtd <> v_chaves then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    if v_acao = 'inserir' then
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos;
    elsif v_acao = 'atualizar' then
      v_id := (v_op ->> 'id')::uuid;
      if v_id is null then
        raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
      end if;
      execute format(
        'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos, v_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then
        raise exception 'Lancamento fora do alcance de quem grava' using errcode = '42501', hint = 'lancamento_fora_do_alcance';
      end if;
    else
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end
$function$
;
alter table public.avaliacoes drop constraint aval_ta_coerente;
alter table public.avaliacoes add constraint aval_ta_coerente CHECK ((((ta_inicial IS NULL) = (tempos_consumidos IS NULL)) OR ((origem_migracao_v1 IS NOT NULL) AND (editado_em IS NULL)) OR ((origem_migracao_v1 IS NOT NULL) AND (status = 'cancelada'::status_avaliacao))));
comment on constraint aval_ta_coerente on public.avaliacoes is 'TA inicial e tempos consumidos vem juntos ou faltam juntos. EXCECAO: 1 linha migrada da v2.0 com TA e sem tempos, ainda nao editada — e, desde 06/10/2026 (VIRADA-1), a linha migrada CANCELADA, que e como a carga da planilha de controle a substitui.';
create policy avaliacoes_planejadas_criar on public.avaliacoes_planejadas for insert to authenticated with check ((app.pode('avaliacoes'::text, 'editar'::text) AND app.alcanca_curso(curso_id) AND app.curso_em_oferta(curso_id)));
create policy avaliacoes_planejadas_editar on public.avaliacoes_planejadas for update to authenticated using ((app.pode('avaliacoes'::text, 'editar'::text) AND app.alcanca_curso(curso_id) AND app.curso_em_oferta(curso_id))) with check ((app.pode('avaliacoes'::text, 'editar'::text) AND app.alcanca_curso(curso_id) AND app.curso_em_oferta(curso_id)));
revoke all on public.vw_avaliacoes_situacao from anon, authenticated, service_role;
revoke all on public.vw_ocupacao_ta from anon, authenticated, service_role;
revoke all on public.vw_carga_horaria_turma from anon, authenticated, service_role;
revoke all on public.vw_disciplinas_execucao from anon, authenticated, service_role;
revoke all on public.vw_instrutor_carga_anual from anon, authenticated, service_role;
revoke all on public.avaliacoes_planejadas from anon, authenticated, service_role;
grant INSERT, SELECT, UPDATE, REFERENCES, TRIGGER on public.avaliacoes_planejadas to authenticated;
grant INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on public.avaliacoes_planejadas to service_role;
grant SELECT, TRIGGER, REFERENCES, UPDATE, INSERT on public.vw_avaliacoes_situacao to authenticated;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES on public.vw_avaliacoes_situacao to service_role;
grant TRIGGER, REFERENCES, SELECT on public.vw_carga_horaria_turma to authenticated;
grant REFERENCES, TRIGGER, UPDATE, INSERT, SELECT, DELETE, TRUNCATE on public.vw_carga_horaria_turma to service_role;
grant SELECT, TRIGGER, REFERENCES, UPDATE, INSERT on public.vw_disciplinas_execucao to authenticated;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES on public.vw_disciplinas_execucao to service_role;
grant SELECT, REFERENCES, TRIGGER on public.vw_instrutor_carga_anual to authenticated;
grant INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on public.vw_instrutor_carga_anual to service_role;
grant TRIGGER, REFERENCES, UPDATE, SELECT, INSERT on public.vw_ocupacao_ta to authenticated;
grant TRIGGER, SELECT, UPDATE, INSERT, DELETE, TRUNCATE, REFERENCES on public.vw_ocupacao_ta to service_role;
revoke all on function app.fn_status_vista(date,date,public.status_avaliacao,integer) from public, anon, authenticated, service_role;
grant execute on function app.fn_status_vista(date,date,public.status_avaliacao,integer) to anon;
grant execute on function app.fn_status_vista(date,date,public.status_avaliacao,integer) to authenticated;
grant execute on function app.fn_status_vista(date,date,public.status_avaliacao,integer) to service_role;
comment on column public.avaliacoes.data_vista_prova is NULL;
comment on column public.avaliacoes.ta_inicial_vista is NULL;
comment on column public.avaliacoes.tempos_consumidos_vista is 'TA consumidos pela VISTA/COMENTÁRIO DE PROVA. TAMBÉM compõe a CHD (RN-EVT-03) — exigência normativa direta do Glossário DEnsM §2.';
comment on column public.avaliacoes.local_vista is NULL;
comment on type public.status_avaliacao is 'Situação de execução da avaliação. Migração da v1.0: `Planejada`→pendente, `Aplicada`→em_andamento, `Vista Realizada`→concluida. Origem: RN-AVAL-01 revisada.';
comment on table public.avaliacoes_planejadas is 'Catálogo do "dever-ser" de avaliação por disciplina/curso (118 linhas). Vincula-se a `disciplinas` por CASAMENTO DE NOME NORMALIZADO, NÃO por FK — decisão de domínio preservada (RN-AVAL-01). v2.0: `Avaliacoes_Planejadas`.';


-- ---------------------------------------------------------------- E-4
drop table public.vistas_de_avaliacao;
drop table public.avaliacoes_curriculo_turma;
alter table public.avaliacoes drop constraint avaliacoes_item_da_disciplina;
alter table public.avaliacoes drop column avaliacao_curriculo_id, drop column ues_abordadas,
  drop column outros_instrutores, drop column status_anterior;
drop table public.avaliacoes_curriculo;
alter table public.registros_aula drop column outros_instrutores;
drop function app.proteger_arbitrado();
drop function app.vista_apos_aplicacao();
drop function app.proximo_codigo_avaliacao_curriculo();
drop function app.proximo_codigo_vista();
drop sequence app.avaliacoes_curriculo_codigo_seq;
drop sequence app.vistas_de_avaliacao_codigo_seq;
delete from public.perfil_permissao where recurso = 'avaliacoes_curriculo_arbitrado';

commit;
