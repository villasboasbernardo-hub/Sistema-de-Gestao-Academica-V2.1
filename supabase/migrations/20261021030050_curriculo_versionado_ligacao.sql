-- =================================================================================
-- Spec 021 · Bloco 6 — o CURRÍCULO VERSIONADO, M2: a LIGAÇÃO (o PORTÃO da regra 9.4)
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- ⚠️ ESTA MIGRATION ALTERA O QUE EXISTE, e por isso é PORTÃO (regra 9.4, emenda de 19/10/2026): preenche colunas em
--    linhas existentes, troca dois índices únicos, recria três views e cinco funções, e acrescenta gatilhos que recusam
--    escrita hoje aceita. O desenho e a medição estão em `specs/021-bloco-6-curriculo-versionado/contracts/banco.md`.
--
-- O que faz:
--   1. A VERSÃO 1 de cada curso (vigente desde 01/01/2020) e TODA a estrutura de hoje ligada a ela: as disciplinas
--      (e por elas as UEs e as avaliações do currículo), os limites de AEC/TAD/TR e as turmas. A linhagem de cada
--      disciplina, UE e avaliação é o próprio id.
--   2. As colunas ficam NOT NULL, com FK composta para a versão ser do mesmo curso.
--   3. A unicidade passa a ser POR VERSÃO: o código da disciplina (RF-DADOS-06) e a categoria do limite.
--   4. Tudo o que juntava o currículo PELO CURSO passa a juntar PELA VERSÃO DA TURMA: o nascimento das linhas da turma
--      e da disciplina nova, a disciplina "é da turma" (RN-MAT-01), a CH curricular, a execução por disciplina e o
--      limite declarado.
--   5. Os gatilhos: versão padrão de quem nasce sem ela; a troca de versão da turma (trava no 1º lançamento, leva o que
--      tem correspondência); a coerência linha/lançamento × versão da turma; e a TRAVA da versão em uso por turma com
--      lançamento (RF-HOR-05: nada reinterpreta o passado), só para escrita com sessão.
--
-- ⚠️ COM UMA VERSÃO SÓ POR CURSO, NADA MUDA DE NÚMERO: as junções pela versão dão exatamente as linhas que as junções
--    pelo curso davam. Provado na cópia do remoto `remoto-20261020-235051.sql`: impressão digital do que o currículo
--    alimenta (`scripts/provas/impressao_digital_do_curriculo.sql`, 24 objetos) e o retrato das telas
--    (`tests/invariantes/retrato-das-telas.test.ts`: planilha, `.xlsx` e DSA de 212 semanas das 29 turmas), antes ×
--    depois: [pendente — medição].
-- ⚠️ O PREENCHIMENTO NÃO PASSA PELOS GATILHOS DE NEGÓCIO (auditoria, trilha do arbitrado, turma arquivada): não é edição
--    de ninguém. `editado_em`/`editado_por` ficam como estavam.
-- ⚠️ Nada aqui lê data do servidor (D20).
--
-- Reversão: `specs/021-bloco-6-curriculo-versionado/reversao.sql` — recria as três views e as cinco funções com os
--   corpos anteriores, devolve os dois índices antigos, tira os gatilhos novos e as FKs, e volta as colunas a nulas;
--   só depois a M1. Provada numa base descartável (a impressão digital do esquema volta): [pendente].
-- =================================================================================

-- ================================================================ 1. a versão 1 e a ligação
insert into public.curriculos (curso_id, versao, vigente_de, descricao)
select c.id, 1, date '2020-01-01',
       'O currículo em vigor quando o sistema passou a ter versões de currículo (21/10/2026).'
  from public.cursos c
 order by c.codigo;

-- ⚠️ SEM OS GATILHOS DE NEGÓCIO: o preenchimento é estrutural. Os internos (FK) seguem ligados.
alter table public.disciplinas disable trigger user;
alter table public.unidades_ensino disable trigger user;
alter table public.avaliacoes_curriculo disable trigger user;
alter table public.limites_curriculo disable trigger user;
alter table public.turmas disable trigger user;

update public.disciplinas d
   set curriculo_id = c.id, linhagem_id = d.id
  from public.curriculos c
 where c.curso_id = d.curso_id and c.versao = 1;
update public.unidades_ensino set linhagem_id = id;
update public.avaliacoes_curriculo set linhagem_id = id;
update public.limites_curriculo l
   set curriculo_id = c.id
  from public.curriculos c
 where c.curso_id = l.curso_id and c.versao = 1;
update public.turmas t
   set curriculo_id = c.id
  from public.curriculos c
 where c.curso_id = t.curso_id and c.versao = 1;

alter table public.disciplinas enable trigger user;
alter table public.unidades_ensino enable trigger user;
alter table public.avaliacoes_curriculo enable trigger user;
alter table public.limites_curriculo enable trigger user;
alter table public.turmas enable trigger user;

-- ================================================================ 2. as amarras
alter table public.disciplinas
  alter column curriculo_id set not null,
  alter column linhagem_id set not null,
  alter column linhagem_id set default gen_random_uuid(),
  add constraint disciplinas_curriculo_do_proprio_curso_fk
    foreign key (curriculo_id, curso_id) references public.curriculos (id, curso_id) on delete restrict;
create index disciplinas_curriculo_idx on public.disciplinas (curriculo_id);
create index disciplinas_linhagem_idx on public.disciplinas (linhagem_id);

alter table public.unidades_ensino
  alter column linhagem_id set not null,
  alter column linhagem_id set default gen_random_uuid();
create index unidades_ensino_linhagem_idx on public.unidades_ensino (linhagem_id);

alter table public.avaliacoes_curriculo
  alter column linhagem_id set not null,
  alter column linhagem_id set default gen_random_uuid();
create index avaliacoes_curriculo_linhagem_idx on public.avaliacoes_curriculo (linhagem_id);

alter table public.limites_curriculo
  alter column curriculo_id set not null,
  add constraint limites_curriculo_da_versao_do_curso_fk
    foreign key (curriculo_id, curso_id) references public.curriculos (id, curso_id) on delete restrict;

alter table public.turmas
  alter column curriculo_id set not null,
  add constraint turmas_curriculo_do_proprio_curso_fk
    foreign key (curriculo_id, curso_id) references public.curriculos (id, curso_id) on delete restrict;
create index turmas_curriculo_idx on public.turmas (curriculo_id);

-- ================================================================ 3. a unicidade passa a ser por versão
-- RF-DADOS-06: o código da disciplina é único entre as ATIVAS da VERSÃO (era: do curso). Emenda ao documento 02.
drop index public.uq_disciplinas_curso_cod_ativo;
create unique index uq_disciplinas_curriculo_cod_ativo
  on public.disciplinas (curriculo_id, cod_disciplina) where status = 'ativo';
-- Um limite por categoria e VERSÃO (era: por curso).
drop index public.limite_unico;
create unique index limite_unico_na_versao
  on public.limites_curriculo (curriculo_id, categoria) where status = 'ativo';

create or replace function app.validar_unicidade_disciplina()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_conflito text;
begin
  if new.status <> 'ativo' then
    return new;
  end if;
  select d.codigo into v_conflito
    from public.disciplinas d
   where d.curriculo_id   = new.curriculo_id
     and d.cod_disciplina = new.cod_disciplina
     and d.status         = 'ativo'
     and d.id            <> new.id
   limit 1;
  if v_conflito is not null then
    raise exception
      'Já existe uma disciplina ativa com o código "%" nesta versão do currículo (registro %).',
      new.cod_disciplina, v_conflito
      using errcode = '23505',
            hint = 'Cada código de disciplina é único dentro de uma versão do currículo do curso. Desative a disciplina existente antes de recriá-la. Origem: RF-DADOS-06 (emendado no Bloco 6), achado (a).';
  end if;
  return new;
end;
$$;

-- ================================================================ 4. o que juntava pelo curso passa a juntar pela versão
-- A turma nasce com as disciplinas ativas da VERSÃO dela (era: do curso).
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
    case when g.herda then 'herdado_grade'::public.origem_periodo else 'nao_informado'::public.origem_periodo end
  from (
    select
      d.id,
      d.previsao_inicio,
      d.previsao_termino,
      (    d.previsao_inicio is not null
       and new.data_inicio   is not null
       and new.data_termino  is not null
       and new.data_inicio  <= d.previsao_inicio
       and d.previsao_inicio <= new.data_termino) as herda
    from public.disciplinas d
    where d.curriculo_id = new.curriculo_id
      and d.status       = 'ativo'
  ) g;
  return null;
end;
$$;

-- A disciplina criada ou reativada nasce nas turmas planejadas e ativas QUE SEGUEM A VERSÃO DELA (era: do curso).
create or replace function app.nascer_disciplina_nas_turmas(p_disciplina_id uuid, p_curso_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_criadas integer;
begin
  insert into public.turma_disciplina (turma_id, disciplina_id, origem_periodo)
  select t.id, p_disciplina_id, 'nao_informado'
    from public.turmas t
    join public.disciplinas d on d.id = p_disciplina_id
   where t.curso_id = p_curso_id
     and t.curriculo_id = d.curriculo_id
     and t.status in ('planejada', 'ativa')
     and not app.turma_arquivada(t.id)
     and not exists (select 1 from public.turma_disciplina td
                      where td.turma_id = t.id and td.disciplina_id = p_disciplina_id);
  get diagnostics v_criadas = row_count;
  return v_criadas;
end;
$$;

-- RN-MAT-01, com a versão: a disciplina é da turma quando é da VERSÃO da turma (o que implica o mesmo curso).
create or replace function app.disciplina_e_da_turma(p_disciplina_id uuid, p_turma_id uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.disciplinas d
      join public.turmas t on t.curriculo_id = d.curriculo_id
     where d.id = p_disciplina_id
       and t.id = p_turma_id
  )
$$;

-- `criar_disciplina` passa a aceitar `curriculo_id` no corpo; sem ele, o gatilho de padrão decide (só há uma versão).
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
  insert into public.disciplinas (
    id, curso_id, curriculo_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
    ordem_sugerida, modo_atribuicao_padrao, tecnica_ensino_sugerida, local_padrao,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino)
  values (
    v_id, v_curso_id,
    (p_disciplina ->> 'curriculo_id')::uuid,
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

-- ---------------------------------------------------------------- as três views (gotcha 10: o `with` vai junto)
-- A CH curricular da turma é a soma das disciplinas ativas da VERSÃO dela (era: do curso).
create or replace view public.vw_carga_horaria_turma with (security_invoker = true) as
WITH aulas AS (
         SELECT r.turma_id,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'aula'::categoria_registro_aula) AS ta_aula,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'atividade_extraclasse'::categoria_registro_aula) AS ta_extraclasse
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro
          GROUP BY r.turma_id
        ), vivas AS (
         SELECT a.id,
            a.turma_id,
            a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao, 'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
        ), provas AS (
         SELECT v.turma_id,
            (sum(COALESCE(v.tempos_consumidos::integer, 0))::numeric + sum(( SELECT COALESCE(sum(p.tempos_consumidos), 0::bigint) AS "coalesce"
                   FROM sessoes_de_aplicacao p
                  WHERE p.avaliacao_id = v.id AND p.status = 'ativo'::status_registro)))::bigint AS ta_aplicacao,
            sum(( SELECT COALESCE(sum(s.tempos_consumidos), 0::bigint) AS "coalesce"
                   FROM vistas_de_avaliacao s
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

-- A execução por disciplina × turma junta as disciplinas da VERSÃO da turma (era: do curso).
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
         SELECT s.avaliacao_id,
            max(s.data) AS ultima_vista,
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS ta_vista
           FROM vistas_de_avaliacao s
          WHERE s.status = 'ativo'::status_registro
          GROUP BY s.avaliacao_id
        ), aplicacoes AS (
         SELECT p.avaliacao_id,
            max(p.data) AS ultima_sessao,
            sum(COALESCE(p.tempos_consumidos::integer, 0)) AS ta_sessoes
           FROM sessoes_de_aplicacao p
          WHERE p.status = 'ativo'::status_registro
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
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao, 'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
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

-- O limite declarado é o da VERSÃO da turma (era: do curso).
create or replace view public.vw_conformidade_tetos with (security_invoker = true) as
 SELECT v.turma_id,
    v.turma_codigo,
    v.curso_id,
    v.curso_codigo,
    v.nome_curso,
    v.ano_letivo,
    c.categoria,
        CASE c.categoria
            WHEN 'AEC'::text THEN v.ta_aec
            WHEN 'TAD'::text THEN v.ta_tad
            ELSE v.ta_tr
        END AS cumprido,
    ( SELECT p.tempos_previstos
           FROM previstos_proens_turma p
          WHERE p.turma_id = v.turma_id AND p.categoria::text = c.categoria AND p.status = 'ativo'::status_registro) AS previsto,
    ( SELECT l.tempos
           FROM limites_curriculo l
             JOIN turmas t ON t.curriculo_id = l.curriculo_id
          WHERE t.id = v.turma_id AND l.categoria::text = c.categoria AND l.status = 'ativo'::status_registro) AS limite_declarado,
    v.chr_curricular AS ch_curricular,
    app.fn_parametro_numerico(c.chave, v.ano_letivo) AS percentual_norma
   FROM vw_carga_horaria_turma v
     CROSS JOIN ( VALUES ('AEC'::text,'teto.aec_percentual_chr'::text), ('TAD'::text,'teto.tad_percentual_chr'::text), ('TR'::text,'teto.tr_percentual_chr'::text)) c(categoria, chave);

-- ================================================================ 5. os gatilhos
-- ---------------------------------------------------------------- 5.1 o curso novo nasce com a versão 1
create or replace function app.criar_versao_1_do_curso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.curriculos (curso_id, versao, vigente_de) values (new.id, 1, date '2020-01-01');
  return null;
end;
$$;
revoke all on function app.criar_versao_1_do_curso() from public, anon, authenticated;
create trigger trg_cursos_versao_1 after insert on public.cursos
  for each row execute function app.criar_versao_1_do_curso();

-- ---------------------------------------------------------------- 5.2 a disciplina e o limite sem versão
-- Sem `curriculo_id`, vai para a ÚNICA versão ativa do curso; com mais de uma, quem grava tem de dizer qual — o
-- banco não adivinha (Princípio I). Atende o ETL, as migrations de dado e as amostras de teste, que só conhecem a 1.
create or replace function app.versao_unica_do_curso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versoes uuid[];
begin
  if new.curriculo_id is not null then
    return new;
  end if;
  select array_agg(c.id) into v_versoes
    from public.curriculos c where c.curso_id = new.curso_id and c.status = 'ativo';
  if coalesce(cardinality(v_versoes), 0) <> 1 then
    raise exception 'Informe a versão do currículo: o curso tem % versões ativas.', coalesce(cardinality(v_versoes), 0)
      using errcode = '23502', hint = 'versao_obrigatoria';
  end if;
  new.curriculo_id := v_versoes[1];
  return new;
end;
$$;
revoke all on function app.versao_unica_do_curso() from public, anon, authenticated;
create trigger trg_disciplinas_versao before insert on public.disciplinas
  for each row execute function app.versao_unica_do_curso();
create trigger trg_limites_curriculo_versao before insert on public.limites_curriculo
  for each row execute function app.versao_unica_do_curso();

-- ---------------------------------------------------------------- 5.3 a versão da turma
create or replace function app.versao_ativa_do_curso(p_curriculo_id uuid, p_curso_id uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.curriculos c
                  where c.id = p_curriculo_id and c.curso_id = p_curso_id and c.status = 'ativo');
$$;
revoke all on function app.versao_ativa_do_curso(uuid, uuid) from public, anon, authenticated;

-- Ao nascer sem versão: a vigente na data de início (sem data, em 1º de janeiro do ano letivo). Ao trocar: só sem
-- lançamento (RF-HOR-05, a mesma régua do regime de horário) e só para versão ATIVA do curso.
-- ⚠️ A TURMA QUE MUDA DE CURSO (FR-026, caminho 4 — só sem lançamento, porque com ele as FKs compostas já recusam) e
--    não diz a versão vai para a vigente do curso NOVO: a versão é sempre de um curso só.
-- ⚠️ A situação da VERSÃO é conferida por `app.versao_ativa_do_curso`, e não aqui: nenhum gatilho de `turmas` decide
--    pela palavra "status" (guarda de ausência do `101`).
create or replace function app.guardar_curriculo_da_turma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.curriculo_id is null then
    new.curriculo_id := app.curriculo_vigente(new.curso_id, coalesce(new.data_inicio, make_date(new.ano_letivo, 1, 1)));
    return new;
  end if;
  if tg_op = 'UPDATE' and new.curso_id is distinct from old.curso_id
     and new.curriculo_id is not distinct from old.curriculo_id then
    new.curriculo_id := app.curriculo_vigente(new.curso_id, coalesce(new.data_inicio, make_date(new.ano_letivo, 1, 1)));
  end if;
  if tg_op = 'UPDATE' and new.curriculo_id is not distinct from old.curriculo_id then
    return new;
  end if;
  if tg_op = 'UPDATE' and app.turma_tem_lancamento_no_dsa(new.id) then
    raise exception 'A versão do currículo desta turma não pode mais mudar: ela já tem lançamento no DSA (RF-HOR-05).'
      using errcode = '23514', hint = 'curriculo_da_turma_travado';
  end if;
  if not app.versao_ativa_do_curso(new.curriculo_id, new.curso_id) then
    raise exception 'A versão do currículo escolhida não é uma versão ativa do curso da turma.'
      using errcode = '23514', hint = 'versao_inativa';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_curriculo_da_turma() from public, anon, authenticated;
create trigger trg_turmas_curriculo before insert or update of curriculo_id, curso_id on public.turmas
  for each row execute function app.guardar_curriculo_da_turma();

-- A TROCA DE VERSÃO de uma turma sem lançamento: as linhas da versão antiga saem (inativas, nunca apagadas) e nascem
-- as da versão nova. O que tem CORRESPONDÊNCIA (a mesma linhagem) leva junto: o período da linha, as atribuições de
-- instrutor, o rateio por UE e os ajustes de avaliação do currículo da turma. O resto nasce como numa turma nova.
create or replace function app.trocar_linhas_da_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.curriculo_id is not distinct from old.curriculo_id then
    return null;
  end if;

  -- O MAPA, tirado ANTES de qualquer mudança: a linha velha ativa e a disciplina da versão nova com a mesma linhagem.
  -- ⚠️ A mesma transação pode trocar a versão de mais de uma turma: as tabelas da troca anterior saem antes.
  if to_regclass('pg_temp._troca') is not null then
    drop table pg_temp._troca, pg_temp._levar_tdi, pg_temp._levar_tdu, pg_temp._levar_avct;
  end if;
  create temporary table _troca on commit drop as
    select td_velha.id as linha_velha, td_velha.previsao_inicio, td_velha.previsao_termino, td_velha.origem_periodo,
           d_nova.id as disciplina_nova, gen_random_uuid() as linha_nova
      from public.turma_disciplina td_velha
      join public.disciplinas d_velha on d_velha.id = td_velha.disciplina_id
      join public.disciplinas d_nova on d_nova.linhagem_id = d_velha.linhagem_id
                                    and d_nova.curriculo_id = new.curriculo_id and d_nova.status = 'ativo'
     where td_velha.turma_id = new.id and td_velha.status = 'ativo';
  create temporary table _levar_tdi on commit drop as
    select x.linha_nova, tdi.instrutor_id, tdi.ch_prevista_tempos, tdi.papel, tdi.observacao
      from _troca x join public.turma_disciplina_instrutor tdi
        on tdi.turma_disciplina_id = x.linha_velha and tdi.status = 'ativo';
  create temporary table _levar_tdu on commit drop as
    select x.linha_nova, x.disciplina_nova, u_nova.id as unidade_nova, tdu.instrutor_id
      from _troca x
      join public.turma_disciplina_unidade tdu on tdu.turma_disciplina_id = x.linha_velha and tdu.status = 'ativo'
      join public.unidades_ensino u_velha on u_velha.id = tdu.unidade_ensino_id
      join public.unidades_ensino u_nova on u_nova.linhagem_id = u_velha.linhagem_id
                                        and u_nova.disciplina_id = x.disciplina_nova and u_nova.status = 'ativo';
  create temporary table _levar_avct on commit drop as
    select a_nova.id as avaliacao_nova, act.ta_aplicacao, act.ta_vista, act.origem, act.confirmado_em
      from public.avaliacoes_curriculo_turma act
      join public.avaliacoes_curriculo a_velha on a_velha.id = act.avaliacao_curriculo_id
      join public.avaliacoes_curriculo a_nova on a_nova.linhagem_id = a_velha.linhagem_id and a_nova.status = 'ativo'
      join public.disciplinas d_nova on d_nova.id = a_nova.disciplina_id and d_nova.curriculo_id = new.curriculo_id
     where act.turma_id = new.id and act.status = 'ativo';

  -- 1. o que é da versão velha sai (inativo — regra 4), as linhas por último
  update public.avaliacoes_curriculo_turma set status = 'inativo' where turma_id = new.id and status = 'ativo';
  update public.turma_disciplina_unidade set status = 'inativo'
   where status = 'ativo'
     and turma_disciplina_id in (select id from public.turma_disciplina where turma_id = new.id and status = 'ativo');
  update public.turma_disciplina_instrutor set status = 'inativo'
   where status = 'ativo'
     and turma_disciplina_id in (select id from public.turma_disciplina where turma_id = new.id and status = 'ativo');
  update public.turma_disciplina set status = 'inativo' where turma_id = new.id and status = 'ativo';

  -- 2. as linhas da versão nova: com correspondência, o período da velha; sem, o da grade (como no nascimento)
  insert into public.turma_disciplina (id, turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
  select x.linha_nova, new.id, x.disciplina_nova, x.previsao_inicio, x.previsao_termino, x.origem_periodo
    from _troca x;
  insert into public.turma_disciplina (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
  select new.id, g.id,
         case when g.herda then g.previsao_inicio end,
         case when g.herda then g.previsao_termino end,
         case when g.herda then 'herdado_grade'::public.origem_periodo else 'nao_informado'::public.origem_periodo end
    from (select d.id, d.previsao_inicio, d.previsao_termino,
                 (    d.previsao_inicio is not null and new.data_inicio is not null and new.data_termino is not null
                  and new.data_inicio <= d.previsao_inicio and d.previsao_inicio <= new.data_termino) as herda
            from public.disciplinas d
           where d.curriculo_id = new.curriculo_id and d.status = 'ativo'
             and not exists (select 1 from _troca x where x.disciplina_nova = d.id)) g;

  -- 3. o que foi levado: atribuições (código `<linha>#<instrutor>`, como o da carga), rateio por UE e ajustes
  insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, ch_prevista_tempos, papel,
                                                 observacao)
  select nova.codigo || '#' || i.codigo, l.linha_nova, l.instrutor_id, l.ch_prevista_tempos, l.papel, l.observacao
    from _levar_tdi l
    join public.turma_disciplina nova on nova.id = l.linha_nova
    join public.instrutores i on i.id = l.instrutor_id;
  insert into public.turma_disciplina_unidade (turma_disciplina_id, disciplina_id, unidade_ensino_id, instrutor_id)
  select l.linha_nova, l.disciplina_nova, l.unidade_nova, l.instrutor_id from _levar_tdu l;
  insert into public.avaliacoes_curriculo_turma (avaliacao_curriculo_id, turma_id, ta_aplicacao, ta_vista, origem,
                                                 confirmado_em)
  select l.avaliacao_nova, new.id, l.ta_aplicacao, l.ta_vista, l.origem, l.confirmado_em from _levar_avct l;
  return null;
end;
$$;
revoke all on function app.trocar_linhas_da_versao() from public, anon, authenticated;
-- ⚠️ `after update` SEM lista de colunas: a versão também muda pelo gatilho de antes (turma que muda de curso), e
--    `update of` só olha a lista do comando.
create trigger trg_turmas_trocar_linhas_da_versao after update on public.turmas
  for each row execute function app.trocar_linhas_da_versao();

-- ---------------------------------------------------------------- 5.4 a coerência com a versão da turma
-- A linha ativa da turma, o lançamento e o ajuste de avaliação só apontam disciplina, UE ou avaliação da VERSÃO da
-- turma (RN-MAT-01 com a versão). Com uma versão por curso, é o que já vale; com duas, é o que impede misturar.
create or replace function app.conferir_versao_da_turma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_da_turma      uuid;
  v_curso_turma   uuid;
  v_do_item       uuid;
  v_curso_item    uuid;
  v_linha         jsonb := to_jsonb(new);
begin
  -- ⚠️ PELO `jsonb`: `new.status <> 'ativo'` seria compilado também para `avaliacoes`, onde `status` é outro tipo.
  if tg_table_name in ('turma_disciplina', 'avaliacoes_curriculo_turma')
     and (v_linha ->> 'status') is distinct from 'ativo' then
    return new;
  end if;
  select t.curriculo_id, t.curso_id into v_da_turma, v_curso_turma
    from public.turmas t where t.id = (v_linha ->> 'turma_id')::uuid;
  if tg_table_name = 'avaliacoes_curriculo_turma' then
    select d.curriculo_id, d.curso_id into v_do_item, v_curso_item
      from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id
     where a.id = (v_linha ->> 'avaliacao_curriculo_id')::uuid;
  else
    select d.curriculo_id, d.curso_id into v_do_item, v_curso_item
      from public.disciplinas d where d.id = (v_linha ->> 'disciplina_id')::uuid;
    if v_do_item is null and v_linha ? 'unidade_ensino_id' then
      select d.curriculo_id, d.curso_id into v_do_item, v_curso_item
        from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
       where u.id = (v_linha ->> 'unidade_ensino_id')::uuid;
    end if;
  end if;
  -- Entre cursos diferentes quem recusa é a FK composta, com o código dela (RN-MAT-01): aqui só a versão.
  if v_do_item is not null and v_da_turma is not null and v_curso_item = v_curso_turma
     and v_do_item <> v_da_turma then
    raise exception 'A disciplina, a UE ou a avaliação escolhida é de outra versão do currículo, e não da que rege esta turma.'
      using errcode = '23514', hint = 'disciplina_de_outra_versao';
  end if;
  return new;
end;
$$;
revoke all on function app.conferir_versao_da_turma() from public, anon, authenticated;
create trigger trg_turma_disciplina_versao before insert or update of turma_id, disciplina_id, status
  on public.turma_disciplina for each row execute function app.conferir_versao_da_turma();
create trigger trg_registros_aula_versao before insert or update of turma_id, disciplina_id, unidade_ensino_id
  on public.registros_aula for each row execute function app.conferir_versao_da_turma();
create trigger trg_avaliacoes_versao before insert or update of turma_id, disciplina_id
  on public.avaliacoes for each row execute function app.conferir_versao_da_turma();
create trigger trg_avaliacoes_curriculo_turma_versao before insert or update of turma_id, avaliacao_curriculo_id, status
  on public.avaliacoes_curriculo_turma for each row execute function app.conferir_versao_da_turma();

-- ---------------------------------------------------------------- 5.5 a TRAVA da versão em uso (RF-HOR-05)
-- Na versão seguida por turma com lançamento, nada que MUDE NÚMERO se escreve pela tela: incluir, inativar ou
-- reativar disciplina, UE, avaliação do currículo ou limite; a CH, o código e o período da disciplina (dele saem as
-- semanas e a média semanal do instrutor) e o modo de atribuição; a CH e o número da UE; o instrumento, o número, os
-- TA e a UE da avaliação do currículo; os TA do limite. Os TEXTOS seguem livres (nome, nome no DSA, tópico, técnica,
-- local, fundamento, ordem).
-- ⚠️ SÓ COM SESSÃO (`auth.uid()` não nulo): migration, ETL e script de manutenção passam — são atos revistos (portão,
--    rito do remoto), e o ETL corrige `modo_atribuicao_padrao` depois da carga (`correcoes-de-origem.md`).
create or replace function app.guardar_curriculo_em_uso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curriculo uuid;
  v_muda      boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  -- ⚠️ No INSERT não há `old`: tudo o que entra numa versão em uso é mudança.
  v_muda := tg_op = 'INSERT';
  if tg_table_name = 'disciplinas' then
    v_curriculo := new.curriculo_id;
    if tg_op = 'UPDATE' then
      v_muda := row(old.status, old.carga_horaria_tempos, old.cod_disciplina, old.previsao_inicio, old.previsao_termino,
                    old.modo_atribuicao_padrao, old.curriculo_id, old.curso_id)
                is distinct from
                row(new.status, new.carga_horaria_tempos, new.cod_disciplina, new.previsao_inicio, new.previsao_termino,
                    new.modo_atribuicao_padrao, new.curriculo_id, new.curso_id);
    end if;
  elsif tg_table_name = 'unidades_ensino' then
    select d.curriculo_id into v_curriculo from public.disciplinas d where d.id = new.disciplina_id;
    if tg_op = 'UPDATE' then
      v_muda := row(old.status, old.ch_prevista_tempos, old.numero_ue, old.disciplina_id)
                is distinct from row(new.status, new.ch_prevista_tempos, new.numero_ue, new.disciplina_id);
    end if;
  elsif tg_table_name = 'avaliacoes_curriculo' then
    select d.curriculo_id into v_curriculo from public.disciplinas d where d.id = new.disciplina_id;
    if tg_op = 'UPDATE' then
      v_muda := row(old.status, old.instrumento_id, old.numero, old.ta_aplicacao, old.ta_vista, old.unidade_ensino_id,
                    old.disciplina_id)
                is distinct from
                row(new.status, new.instrumento_id, new.numero, new.ta_aplicacao, new.ta_vista, new.unidade_ensino_id,
                    new.disciplina_id);
    end if;
  else
    v_curriculo := new.curriculo_id;
    if tg_op = 'UPDATE' then
      v_muda := row(old.status, old.tempos, old.categoria, old.curriculo_id)
                is distinct from row(new.status, new.tempos, new.categoria, new.curriculo_id);
    end if;
  end if;

  if v_muda and app.curriculo_em_uso_com_lancamento(v_curriculo) then
    raise exception 'Esta versão do currículo rege turma que já tem lançamento: carga horária, códigos, períodos, UEs, '
                    'avaliações e limites dela não mudam mais (RF-HOR-05). Para um currículo diferente, crie uma '
                    'versão nova.'
      using errcode = '23514', hint = 'curriculo_em_uso';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_curriculo_em_uso() from public, anon, authenticated;
create trigger trg_disciplinas_curriculo_em_uso before insert or update on public.disciplinas
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_unidades_ensino_curriculo_em_uso before insert or update on public.unidades_ensino
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_avaliacoes_curriculo_em_uso before insert or update on public.avaliacoes_curriculo
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_limites_curriculo_em_uso before insert or update on public.limites_curriculo
  for each row execute function app.guardar_curriculo_em_uso();

-- A versão seguida por alguma turma não se inativa (a turma ficaria sem currículo vigente para ela).
create or replace function app.guardar_situacao_da_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'inativo' and old.status = 'ativo'
     and exists (select 1 from public.turmas t where t.curriculo_id = new.id) then
    raise exception 'Esta versão do currículo é seguida por turma; ela não se inativa.'
      using errcode = '23514', hint = 'versao_em_uso';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_situacao_da_versao() from public, anon, authenticated;
create trigger trg_curriculos_situacao before update of status on public.curriculos
  for each row execute function app.guardar_situacao_da_versao();
