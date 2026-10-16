-- =================================================================================
-- Reversão das migrations da emenda de 15/10/2026 (desenho aprovado em 16/10/2026):
--   E-6 `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova` e D-9 `20261016092315_vista_obrigatoria_e_janela_de_sessoes`.
--
-- ⚠️ A PARTE 1 vale para qualquer base: devolve as leituras, `fn_status_vista`, `lancamentos_que_travam_vigencia` e
--    `gravar_lancamentos_em_transacao` ao corpo de `20261014151554` (o texto abaixo é COPIADO de lá, não reescrito),
--    e tira a função de juntar e os gatilhos novos.
-- ⚠️ A PARTE 2 é SÓ EM BASE DESCARTÁVEL: `drop` da tabela, da coluna, das funções, da sequência e do recurso. No
--    remoto, com dado, a tabela e a coluna FICAM, comentadas `[APOSENTADA]` (regra: nunca `drop` com histórico), e a
--    marca e o parâmetro da D-9 saem por `metadados - 'vista_obrigatoria'` e `status = 'inativo'`.
-- Prova (DoD 6): numa base descartável, a impressão digital do esquema depois desta reversão é a de antes da E-6.
-- =================================================================================
begin;

-- ======================== PARTE 1 — o comportamento de antes
drop function public.juntar_como_sessao(uuid, uuid);
drop trigger trg_avaliacoes_instrumento on public.avaliacoes;
drop function app.instrumento_da_avaliacao();

create or replace function app.fn_status_vista(p_avaliacao_id uuid, p_hoje date default current_date,
                                               p_prazo_dias integer default null)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  with a as (
    select av.id, av.status, av.data_avaliacao,
           -- Tem item de vista: o do currículo diz se há tempo de vista; sem item ligado (histórico), sim.
           case when av.avaliacao_curriculo_id is null then true
                else (select c.ta_vista is not null and c.ta_vista > 0
                        from public.avaliacoes_curriculo c where c.id = av.avaliacao_curriculo_id) end as tem_item_de_vista,
           exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = av.id and v.status = 'ativo') as tem_sessao
      from public.avaliacoes av
     where av.id = p_avaliacao_id
  )
  select case
    when a.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then null
    when a.data_avaliacao is null or a.data_avaliacao > p_hoje then 'pendente'
    when not coalesce(a.tem_item_de_vista, true) or a.tem_sessao then 'concluida'
    when p_hoje - a.data_avaliacao
         > coalesce(p_prazo_dias, app.fn_parametro_numerico('avaliacao.prazo_vista_dias')::integer, 7) then 'atrasada'
    else 'em_andamento'
  end
  from a;
$$;

comment on function app.fn_status_vista(uuid, date, integer) is
  'Spec 014, R-8: a situação de PROVA e TRABALHO (pendente, em_andamento, concluida, atrasada), calculada na '
  'leitura pelas SESSÕES de vista. ESPELHO de `situacaoDaAvaliacao` (lib/dominio/avaliacoes/situacao.ts), que é '
  'quem decide; a OD e o «sem correspondência» de item sem lançamento vivem só lá. Chamar com `p_hoje` '
  'explícito (D20: a data do banco é UTC). Devolve nulo para a avaliação cancelada ou substituída.';


-- ---------------------------------------------------------------- 3. leitores: CH da turma
create or replace view public.vw_carga_horaria_turma with (security_invoker = true) as
 WITH aulas AS (
         SELECT r.turma_id,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'aula'::categoria_registro_aula) AS ta_aula,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'atividade_extraclasse'::categoria_registro_aula) AS ta_extraclasse
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro
          GROUP BY r.turma_id
        ), vivas AS (
         SELECT a.id, a.turma_id, a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
        ), provas AS (
         SELECT v.turma_id,
            sum(COALESCE(v.tempos_consumidos::integer, 0)) AS ta_aplicacao,
            sum((SELECT COALESCE(sum(s.tempos_consumidos), 0) FROM vistas_de_avaliacao s
                  WHERE s.avaliacao_id = v.id AND s.status = 'ativo'::status_registro))::bigint AS ta_vista
           FROM vivas v
          GROUP BY v.turma_id
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

revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated;

-- ---------------------------------------------------------------- 4. leitores: ocupação do TA
-- `create or replace` acrescenta `sessao_id` e `numero_sessao` NO FIM; o `with (security_invoker)` é
-- obrigatório aqui (gotcha 10: sem ele, a opção cai em silêncio).
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
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM avaliacoes a
  WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
    AND a.ta_inicial IS NOT NULL
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
  WHERE s.status = 'ativo'::status_registro AND s.ta_inicial IS NOT NULL
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
  WHERE n.status = 'ativo'::status_registro AND n.ta_inicial IS NOT NULL;

revoke insert, update, delete, truncate on public.vw_ocupacao_ta from authenticated;

-- ---------------------------------------------------------------- 5. leitores: execução da disciplina
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
        ), sessoes AS (
         SELECT s.avaliacao_id, max(s.data) AS ultima_vista, sum(COALESCE(s.tempos_consumidos::integer, 0)) AS ta_vista
           FROM vistas_de_avaliacao s
          WHERE s.status = 'ativo'::status_registro
          GROUP BY s.avaliacao_id
        ), provas AS (
         SELECT a.disciplina_id,
            a.turma_id,
            min(a.data_avaliacao) AS primeira_data,
            GREATEST(max(a.data_avaliacao), max(se.ultima_vista)) AS ultima_data,
            sum(COALESCE(a.tempos_consumidos::integer, 0) + COALESCE(se.ta_vista, 0))::bigint AS ta
           FROM avaliacoes a
             LEFT JOIN sessoes se ON se.avaliacao_id = a.id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
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

revoke insert, update, delete, truncate on public.vw_disciplinas_execucao from authenticated;

-- ---------------------------------------------------------------- 6. leitores: carga anual do instrutor
create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH vivas AS (
         SELECT a.id, a.instrutor_responsavel_id, a.fiscal_id, a.data_avaliacao, a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
        ), fatos AS (
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
            sum(COALESCE(a_1.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vivas a_1
          GROUP BY a_1.instrutor_responsavel_id, (EXTRACT(year FROM a_1.data_avaliacao)::smallint)
        UNION ALL
         -- A vista conta para quem a CONDUZ; sem condutor registrado, para o responsável da avaliação.
         SELECT COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id),
            EXTRACT(year FROM s.data)::smallint AS "extract",
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vistas_de_avaliacao s
             JOIN vivas a_1 ON a_1.id = s.avaliacao_id
          WHERE s.status = 'ativo'::status_registro
          GROUP BY (COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id)), (EXTRACT(year FROM s.data)::smallint)
        UNION ALL
         SELECT a_1.fiscal_id,
            EXTRACT(year FROM a_1.data_avaliacao)::smallint AS "extract",
            0,
            sum(COALESCE(a_1.tempos_consumidos::integer, 0)) AS sum
           FROM vivas a_1
          WHERE a_1.fiscal_id IS NOT NULL
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

revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated;

-- ---------------------------------------------------------------- 7. o que trava a vigência
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
       and r.status = 'ativo'
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    -- Spec 014 (R-5): a vista pelas SESSOES, cada uma com horario proprio.
    select 'vista_de_prova', s.data, t.codigo, null, null
      from public.vistas_de_avaliacao s
      join public.avaliacoes a on a.id = s.avaliacao_id
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where s.data >= p_desde
       and s.status = 'ativo'
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
       and n.status = 'ativo'
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
       and n.status = 'ativo'
  )
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$$;


-- ---------------------------------------------------------------- 9. a gravação em transação aceita sessões
create or replace function public.gravar_lancamentos_em_transacao(p_operacoes jsonb)
returns integer
language plpgsql
set search_path = pg_catalog, public
as $$
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

    -- Spec 014 (E-5): `vistas_de_avaliacao` entra na lista — as sessões de vista andam na mesma transação.
    if v_tabela is null
       or v_tabela not in ('registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'vistas_de_avaliacao') then
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
$$;


-- ======================== PARTE 2 — SÓ EM BASE DESCARTÁVEL
drop trigger trg_sessoes_de_aplicacao_trilha on public.sessoes_de_aplicacao;
drop trigger trg_sessoes_de_aplicacao_apos_aplicacao on public.sessoes_de_aplicacao;
drop function app.proteger_trilha_da_juntada();
drop function app.sessao_apos_aplicacao();
drop table public.sessoes_de_aplicacao;
drop function app.proximo_codigo_sessao_de_aplicacao();
drop sequence app.sessoes_de_aplicacao_codigo_seq;
drop index public.avaliacoes_instrumento_idx;
alter table public.avaliacoes drop column instrumento_id;
delete from public.perfil_permissao where recurso = 'avaliacoes_juntar_sessao';
update public.config_listas set metadados = metadados - 'vista_obrigatoria' where lista = 'instrumentos_avaliacao';
delete from public.config_parametros where chave = 'avaliacao.janela_sessoes_dias';

commit;
