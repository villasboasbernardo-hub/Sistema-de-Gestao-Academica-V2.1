-- =================================================================================
-- Reversão das migrations do Bloco 6 (spec 021) — `20261021030050` (M2) e depois `20261021030049` (M1).
--
-- Só com UMA versão por curso (nenhuma versão 2 criada): com versão 2, reverter apagaria currículo cadastrado — e a
-- decisão passa a ser de Bernardo (regra 4). As definições anteriores são as EXATAS das migrations de origem:
--   public.vw_carga_horaria_turma: 20261019114024_ta_fora_do_dsa_e_execucao.sql
--   public.vw_disciplinas_execucao: 20261019114024_ta_fora_do_dsa_e_execucao.sql
--   public.vw_conformidade_tetos: 20261014060055_previsto_proens_por_turma.sql
--   app.validar_unicidade_disciplina: 20260829233423_cadastro_e_unidades_ensino.sql
--   app.fazer_nascer_disciplinas_da_turma: 20260918013345_turma_disciplina_nasce.sql
--   app.nascer_disciplina_nas_turmas: 20261019130941_trava_da_turma_arquivada.sql
--   app.disciplina_e_da_turma: 20261008164612_dsa_ue_opcional_aec_com_disciplina_e_etapa_presencial.sql
--   app.criar_disciplina: 20260925135051_periodo_e_rpc_disciplina.sql
-- Provada numa transação desfeita sobre a cópia do remoto: a impressão digital do esquema volta à da `main`.
-- =================================================================================
begin;

-- ---------------------------------------------------------------- M2
drop trigger trg_curriculos_situacao on public.curriculos;
drop trigger trg_disciplinas_curriculo_em_uso on public.disciplinas;
drop trigger trg_unidades_ensino_curriculo_em_uso on public.unidades_ensino;
drop trigger trg_avaliacoes_curriculo_em_uso on public.avaliacoes_curriculo;
drop trigger trg_limites_curriculo_em_uso on public.limites_curriculo;
drop trigger trg_turma_disciplina_versao on public.turma_disciplina;
drop trigger trg_registros_aula_versao on public.registros_aula;
drop trigger trg_avaliacoes_versao on public.avaliacoes;
drop trigger trg_avaliacoes_curriculo_turma_versao on public.avaliacoes_curriculo_turma;
drop trigger trg_turmas_trocar_linhas_da_versao on public.turmas;
drop trigger trg_turmas_curriculo on public.turmas;
drop trigger trg_disciplinas_versao on public.disciplinas;
drop trigger trg_limites_curriculo_versao on public.limites_curriculo;
drop trigger trg_cursos_versao_1 on public.cursos;
drop function app.guardar_situacao_da_versao();
drop function app.guardar_curriculo_em_uso();
drop function app.conferir_versao_da_turma();
drop function app.trocar_linhas_da_versao();
drop function app.guardar_curriculo_da_turma();
drop function app.versao_unica_do_curso();
drop function app.criar_versao_1_do_curso();

-- as definições anteriores
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
         -- RN-AV-12: a aplicação é a 1ª sessão (a avaliação) MAIS as sessões 2..N.
         SELECT v.turma_id,
            (sum(COALESCE(v.tempos_consumidos::integer, 0))
             + sum((SELECT COALESCE(sum(p.tempos_consumidos), 0) FROM sessoes_de_aplicacao p
                     WHERE p.avaliacao_id = v.id AND p.status = 'ativo'::status_registro)))::bigint AS ta_aplicacao,
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
        ), fora AS (
         -- Bloco 2 (D-COR-3): os TA fora do DSA, somados na CHD da turma.
         SELECT f.turma_id, sum(f.tempos)::bigint AS ta_fora_do_dsa
           FROM ta_fora_do_dsa f
          WHERE f.status = 'ativo'::status_registro
          GROUP BY f.turma_id
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
        ), aplicacoes AS (
         -- RN-AV-12: as sessões 2..N da aplicação.
         SELECT p.avaliacao_id, max(p.data) AS ultima_sessao, sum(COALESCE(p.tempos_consumidos::integer, 0)) AS ta_sessoes
           FROM sessoes_de_aplicacao p
          WHERE p.status = 'ativo'::status_registro
          GROUP BY p.avaliacao_id
        ), provas AS (
         SELECT a.disciplina_id,
            a.turma_id,
            min(a.data_avaliacao) AS primeira_data,
            GREATEST(max(a.data_avaliacao), max(se.ultima_vista), max(ap.ultima_sessao)) AS ultima_data,
            sum(COALESCE(a.tempos_consumidos::integer, 0) + COALESCE(ap.ta_sessoes, 0) + COALESCE(se.ta_vista, 0))::bigint AS ta
           FROM avaliacoes a
             LEFT JOIN sessoes se ON se.avaliacao_id = a.id
             LEFT JOIN aplicacoes ap ON ap.avaliacao_id = a.id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
          GROUP BY a.disciplina_id, a.turma_id
        ), fora AS (
         -- Bloco 2 (D-COR-3): os TA fora do DSA da disciplina na turma.
         SELECT f.disciplina_id, f.turma_id, min(f.data) AS primeira_data, max(f.data) AS ultima_data,
            sum(f.tempos)::bigint AS ta
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
     JOIN turmas t ON t.curso_id = d.curso_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
     LEFT JOIN fora fo ON fo.disciplina_id = d.id AND fo.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;

create or replace view public.vw_conformidade_tetos with (security_invoker = true) as
select v.turma_id,
       v.turma_codigo,
       v.curso_id,
       v.curso_codigo,
       v.nome_curso,
       v.ano_letivo,
       c.categoria,
       case c.categoria when 'AEC' then v.ta_aec when 'TAD' then v.ta_tad else v.ta_tr end as cumprido,
       (select p.tempos_previstos from public.previstos_proens_turma p
         where p.turma_id = v.turma_id and p.categoria::text = c.categoria and p.status = 'ativo') as previsto,
       (select l.tempos from public.limites_curriculo l
         where l.curso_id = v.curso_id and l.categoria::text = c.categoria and l.status = 'ativo') as limite_declarado,
       v.chr_curricular as ch_curricular,
       app.fn_parametro_numerico(c.chave, v.ano_letivo) as percentual_norma
  from public.vw_carga_horaria_turma v
 cross join (values ('AEC', 'teto.aec_percentual_chr'),
                    ('TAD', 'teto.tad_percentual_chr'),
                    ('TR',  'teto.tr_percentual_chr')) as c(categoria, chave);

create or replace function app.validar_unicidade_disciplina()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_conflito text;
begin
  -- Só linhas ATIVAS competem por unicidade: a duplicata saneada guarda uma irmã inativa.
  if new.status <> 'ativo' then
    return new;
  end if;

  select d.codigo into v_conflito
    from public.disciplinas d
   where d.curso_id       = new.curso_id
     and d.cod_disciplina = new.cod_disciplina
     and d.status         = 'ativo'
     and d.id            <> new.id
   limit 1;

  if v_conflito is not null then
    raise exception
      'Já existe uma disciplina ativa com o código "%" neste curso (registro %).',
      new.cod_disciplina, v_conflito
      using errcode = '23505',
            hint = 'Cada código de disciplina é único dentro de um curso. Desative a disciplina existente antes de recriá-la. Origem: RF-DADOS-06, RN-MAT-02, achado (a).';
  end if;

  return new;
end;
$$;

create or replace function app.fazer_nascer_disciplinas_da_turma()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.turma_disciplina (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
  select
    new.id,
    g.id,
    case when g.herda then g.previsao_inicio  end,
    case when g.herda then g.previsao_termino end,
    case when g.herda then 'herdado_grade'::origem_periodo else 'nao_informado'::origem_periodo end
  from (
    select
      d.id,
      d.previsao_inicio,
      d.previsao_termino,
      -- A condicao da v2.0, verbatim: previsao de inicio na grade, janela COMPLETA da turma, e a
      -- previsao caindo dentro dela, pontas incluidas.
      (    d.previsao_inicio is not null
       and new.data_inicio   is not null
       and new.data_termino  is not null
       and new.data_inicio  <= d.previsao_inicio
       and d.previsao_inicio <= new.data_termino) as herda
    from public.disciplinas d
    where d.curso_id = new.curso_id
      and d.status   = 'ativo'
  ) g;

  return null;
end;
$$;

create or replace function app.nascer_disciplina_nas_turmas(p_disciplina_id uuid, p_curso_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_criadas integer;
begin
  -- ⚠️ `planejada` e `ativa` apenas (N-4, 24/09/2026): turma cancelada nao tera
  --    lancamento, e linha nova nela e ruido na LIQ; turma concluida ja fechou.
  -- ⚠️ E NAO na ARQUIVADA (spec 017, M4): ela e somente leitura, e o gatilho da
  --    `turma_disciplina` recusaria a linha — derrubando a criacao da disciplina inteira.
  -- ⚠️ `not exists` em vez de `on conflict`, e a razao foi MEDIDA: a unicidade
  --    `uq_turma_disciplina_ativo` e PARCIAL (`where status = 'ativo'`), e `on conflict`
  --    sobre indice parcial exige repetir o predicado — o que faria a linha INATIVA ser
  --    duplicada em vez de respeitada. Aqui, linha existente em qualquer status conta
  --    como existente, e a chamada fica idempotente de verdade (A-2b).
  insert into public.turma_disciplina (turma_id, disciplina_id, origem_periodo)
  select t.id, p_disciplina_id, 'nao_informado'
    from public.turmas t
   where t.curso_id = p_curso_id
     and t.status in ('planejada', 'ativa')
     and not app.turma_arquivada(t.id)
     and not exists (select 1 from public.turma_disciplina td
                      where td.turma_id = t.id and td.disciplina_id = p_disciplina_id);

  get diagnostics v_criadas = row_count;
  return v_criadas;
end;
$$;

create or replace function app.disciplina_e_da_turma(p_disciplina_id uuid, p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.disciplinas d
      join public.turmas t on t.curso_id = d.curso_id
     where d.id = p_disciplina_id
       and t.id = p_turma_id
  )
$$;

create or replace function app.criar_disciplina(p_disciplina jsonb)
returns public.disciplinas
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_id         uuid := gen_random_uuid();
  v_curso_id   uuid := (p_disciplina ->> 'curso_id')::uuid;
  v_disciplina public.disciplinas;
begin
  -- ⚠️ `INSERT` SEM `RETURNING`, e a leitura em comando separado: com alcance resolvido
  --    por funcao STABLE, o `RETURNING` nao enxerga a linha recem-inserida e a recusa
  --    chega como "new row violates row-level security policy" (gotcha 4.1). O `id` e
  --    gerado antes de proposito.
  insert into public.disciplinas (
    id, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
    ordem_sugerida, modo_atribuicao_padrao, tecnica_ensino_sugerida, local_padrao,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino)
  -- ⚠️ `semanas`, `ch_semanal` e `nome_normalizado` sao GENERATED ALWAYS e NAO entram: o
  --    PostgreSQL recusa `INSERT` sobre coluna gerada, que e exatamente a garantia do
  --    `RN-CRUD-02` — a lista de "colunas que nao se escrevem" deixou de ser lista e virou
  --    propriedade da coluna.
  values (
    v_id, v_curso_id,
    p_disciplina ->> 'cod_disciplina',
    p_disciplina ->> 'nome_disciplina',
    (p_disciplina ->> 'carga_horaria_tempos')::integer,
    (p_disciplina ->> 'ordem_sugerida')::integer,
    coalesce((p_disciplina ->> 'modo_atribuicao_padrao')::public.modo_atribuicao, 'dividido'),
    p_disciplina ->> 'tecnica_ensino_sugerida',
    p_disciplina ->> 'local_padrao',
    (p_disciplina ->> 'prioridade_alocacao_peso')::integer,
    (p_disciplina ->> 'previsao_inicio')::date,
    (p_disciplina ->> 'previsao_termino')::date);

  perform app.nascer_disciplina_nas_turmas(v_id, v_curso_id);

  select * into v_disciplina from public.disciplinas where id = v_id;
  return v_disciplina;
end;
$$;

drop index public.limite_unico_na_versao;
create unique index limite_unico on public.limites_curriculo (curso_id, categoria) where status = 'ativo';
drop index public.uq_disciplinas_curriculo_cod_ativo;
create unique index uq_disciplinas_curso_cod_ativo on public.disciplinas (curso_id, cod_disciplina) where status = 'ativo';

alter table public.turmas drop constraint turmas_curriculo_do_proprio_curso_fk;
drop index public.turmas_curriculo_idx;
alter table public.limites_curriculo drop constraint limites_curriculo_da_versao_do_curso_fk;
drop index public.avaliacoes_curriculo_linhagem_idx;
drop index public.unidades_ensino_linhagem_idx;
alter table public.disciplinas drop constraint disciplinas_curriculo_do_proprio_curso_fk;
drop index public.disciplinas_linhagem_idx;
drop index public.disciplinas_curriculo_idx;

-- ---------------------------------------------------------------- M1
drop function public.curriculo_padrao_da_turma(uuid, date, integer);
drop function app.curriculo_em_uso_com_lancamento(uuid);
drop function app.curriculo_vigente(uuid, date);
alter table public.turmas drop column curriculo_id;
alter table public.limites_curriculo drop column curriculo_id;
alter table public.avaliacoes_curriculo drop column linhagem_id;
alter table public.unidades_ensino drop column linhagem_id;
alter table public.disciplinas drop column linhagem_id;
alter table public.disciplinas drop column curriculo_id;
drop table public.curriculos;
drop function app.proximo_codigo_curriculo();
drop sequence app.curriculos_codigo_seq;

commit;
