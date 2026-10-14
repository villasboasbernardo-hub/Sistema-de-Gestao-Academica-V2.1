-- =================================================================================
-- Spec 014, PR 4 · migration E-5 — a situação calculada e a vista lida pelas SESSÕES
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-035, FR-041, FR-048, FR-050, R-5, R-7, R-8; data-model §3.7 e §5):
--   1. `app.fn_status_vista` com assinatura NOVA — `(p_avaliacao_id, p_hoje, p_prazo_dias) returns text`, com
--      o domínio das situações de prova e trabalho —, ESPELHO de `situacaoDaAvaliacao` (TS), que é quem decide
--      (R-8). `vw_avaliacoes_situacao` recriada com ela, `security_invoker`.
--   2. O gatilho de compatibilidade `app.espelhar_vista_na_sessao_1()`: enquanto o DSA (até o PR 5.1) e a
--      sincronização (até o PR 6) escrevem as colunas de vista única de `avaliacoes`, a sessão 1 fica igual a
--      elas — insere, atualiza e inativa. Reage SÓ às quatro colunas e só quando alguma muda; NÃO reage a
--      `status`, porque todo leitor filtra a mãe pela lista POSITIVA de avaliação viva.
--   3. TODO LEITOR DE VISTA LÊ AS SESSÕES (T132): `vw_carga_horaria_turma`, `vw_ocupacao_ta` (com `sessao_id` e
--      `numero_sessao`, que o PR 5.1 adota), `vw_disciplinas_execucao`, `vw_instrutor_carga_anual` e
--      `app.lancamentos_que_travam_vigencia`. Toda view com `security_invoker` (gotcha 10) e o `revoke`.
--   4. A avaliação viva por LISTA POSITIVA (`pendente`, `em_andamento`, `concluida`, `atrasada` — a mesma de
--      `STATUS_DE_AVALIACAO_VIVA` no TS): a substituída pela planilha sai de toda conta sem que nenhum leitor
--      precise citá-la.
--   5. `aval_ta_coerente` aceita a substituída histórica incoerente, como já aceitava a cancelada.
--   6. `gravar_lancamentos_em_transacao` aceita `vistas_de_avaliacao`.
--   7. As colunas de vista única de `avaliacoes` ficam `[APOSENTADA — v2.1]` no comentário (R-5): continuam
--      existindo, escritas pelos escritores antigos e espelhadas na sessão 1.
--
-- ⚠️ ANDA JUNTO DA D-7b (as vistas que já existem viram sessão 1): sem ela, assim que esta migration roda, as
--    vistas existentes saem da CHD, porque toda leitura passa a ser pelas sessões. Recusada a D-7b, esta sai
--    do `db push` com a D-7.
--
-- Reversão (reversao-pr4.sql): a função, as views e o comentário anteriores, sem o espelho.
-- =================================================================================

-- ---------------------------------------------------------------- 1. a situação, espelho do TS
drop view public.vw_avaliacoes_situacao;
drop function app.fn_status_vista(date, date, public.status_avaliacao, integer);

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

revoke all on function app.fn_status_vista(uuid, date, integer) from public, anon;
grant execute on function app.fn_status_vista(uuid, date, integer) to authenticated, service_role;

-- A porta de leitura da situação pela interface de dados (o PostgREST não expõe `app`): repassa à função do `app`
-- com os direitos de QUEM CHAMA (`security invoker`), e por isso só alcança a avaliação que a RLS deixa ler. É ela
-- que a prova cruzada SQL × TS (`tests/invariantes/situacao-sql-igual-ts.test.ts`) chama, com `p_hoje` explícito.
create or replace function public.situacao_da_avaliacao(p_avaliacao_id uuid, p_hoje date)
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select app.fn_status_vista(a.id, p_hoje) from public.avaliacoes a where a.id = p_avaliacao_id;
$$;

comment on function public.situacao_da_avaliacao(uuid, date) is
  'Spec 014, R-8: a situação de uma avaliação que a sessão alcança, pela função espelho `app.fn_status_vista`. '
  'SECURITY INVOKER: a RLS de `avaliacoes` decide o que se lê.';

revoke all on function public.situacao_da_avaliacao(uuid, date) from public, anon;
grant execute on function public.situacao_da_avaliacao(uuid, date) to authenticated, service_role;

create view public.vw_avaliacoes_situacao with (security_invoker = true) as
select a.id, a.codigo, a.turma_id, a.disciplina_id, a.curso_id, a.avaliacao_curriculo_id, a.tipo_avaliacao,
       a.data_avaliacao, a.local, a.ta_inicial, a.tempos_consumidos, a.ta_final,
       a.instrutor_responsavel_id, a.fiscal_id, a.nome_fiscal_externo, a.status, a.status_anterior,
       a.item_planejado_id, a.conteudo_resumo, a.metodologia, a.observacoes, a.origem_migracao_v1,
       a.criado_por, a.criado_em, a.editado_por, a.editado_em,
       app.fn_status_vista(a.id, current_date) as situacao,
       t.codigo as turma_codigo, d.cod_disciplina, d.nome_disciplina
  from public.avaliacoes a
  join public.turmas t on t.id = a.turma_id
  join public.disciplinas d on d.id = a.disciplina_id;

comment on view public.vw_avaliacoes_situacao is
  'Spec 014: a avaliação com a SITUAÇÃO calculada (`app.fn_status_vista`, hoje pelo relógio do banco). A tela lê '
  'a situação pela função TS, com `hojeNaCiaara()`; esta view serve à conferência e ao pgTAP.';

revoke all on public.vw_avaliacoes_situacao from anon;
revoke insert, update, delete, truncate on public.vw_avaliacoes_situacao from authenticated;
grant select on public.vw_avaliacoes_situacao to authenticated;

-- ---------------------------------------------------------------- 2. o espelho da sessão 1
create or replace function app.espelhar_vista_na_sessao_1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sessao uuid;
begin
  if tg_op = 'UPDATE'
     and new.data_vista_prova is not distinct from old.data_vista_prova
     and new.ta_inicial_vista is not distinct from old.ta_inicial_vista
     and new.tempos_consumidos_vista is not distinct from old.tempos_consumidos_vista
     and new.local_vista is not distinct from old.local_vista then
    return null;
  end if;

  select id into v_sessao from public.vistas_de_avaliacao
   where avaliacao_id = new.id and numero = 1 and status = 'ativo';

  if new.data_vista_prova is null then
    if v_sessao is not null then
      update public.vistas_de_avaliacao set status = 'inativo' where id = v_sessao;
    end if;
  elsif v_sessao is null then
    insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local,
                                            origem_migracao_v1, criado_por)
    values (new.id, 1, new.data_vista_prova, new.ta_inicial_vista, new.tempos_consumidos_vista, new.local_vista,
            new.origem_migracao_v1, coalesce(new.editado_por, new.criado_por));
  else
    update public.vistas_de_avaliacao
       set data = new.data_vista_prova, ta_inicial = new.ta_inicial_vista,
           tempos_consumidos = new.tempos_consumidos_vista, local = new.local_vista
     where id = v_sessao;
  end if;
  return null;
end;
$$;

comment on function app.espelhar_vista_na_sessao_1() is
  'Spec 014, R-5 (transição): mantém a sessão 1 de `vistas_de_avaliacao` igual às colunas de vista única de '
  '`avaliacoes` — insere, atualiza e inativa quando são anuladas — enquanto houver escritor delas (o DSA até o '
  'PR 5.1, a sincronização até o PR 6). Reage SÓ às quatro colunas e só quando alguma muda; nunca a `status`.';

revoke all on function app.espelhar_vista_na_sessao_1() from public, anon, authenticated;

create trigger trg_avaliacoes_espelhar_vista
  after insert or update of data_vista_prova, ta_inicial_vista, tempos_consumidos_vista, local_vista
  on public.avaliacoes
  for each row execute function app.espelhar_vista_na_sessao_1();

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

-- ---------------------------------------------------------------- 8. a catraca da avaliação histórica
alter table public.avaliacoes drop constraint aval_ta_coerente;
alter table public.avaliacoes add constraint aval_ta_coerente check (
  ((ta_inicial is null) = (tempos_consumidos is null))
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status in ('cancelada', 'substituida_pela_planilha'))
);

comment on constraint aval_ta_coerente on public.avaliacoes is
  'TA e tempos andam juntos. Catraca: a linha HISTÓRICA (com origem) escapa enquanto não editada, e a histórica '
  'CANCELADA ou SUBSTITUÍDA PELA PLANILHA escapa sempre — ela saiu de toda conta e não volta a ser lida '
  '(emenda de 06/10/2026; a substituída, spec 014, FR-047). Reativá-la devolve a exigência.';

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

-- ---------------------------------------------------------------- 10. as colunas de vista única, aposentadas
comment on column public.avaliacoes.data_vista_prova is
  '[APOSENTADA — v2.1] Spec 014, R-5: a vista vive em `vistas_de_avaliacao` (N sessões). Esta coluna continua '
  'escrita pelo DSA (até o PR 5.1) e pela sincronização (até o PR 6), e é espelhada na sessão 1 por gatilho; '
  'nenhum leitor a lê.';
comment on column public.avaliacoes.ta_inicial_vista is '[APOSENTADA — v2.1] Ver `data_vista_prova`.';
comment on column public.avaliacoes.tempos_consumidos_vista is '[APOSENTADA — v2.1] Ver `data_vista_prova`.';
comment on column public.avaliacoes.local_vista is '[APOSENTADA — v2.1] Ver `data_vista_prova`.';
