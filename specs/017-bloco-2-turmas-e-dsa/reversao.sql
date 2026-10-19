-- =================================================================================
-- Reversão das migrations da spec 017 (Bloco 2): M4, M3, M2 e M1, nesta ordem — `plano-de-aplicacao-no-remoto.md`.
--
-- ⚠️ GERADO por um script a partir dos corpos ORIGINAIS das migrations (nada transcrito à mão):
--    `vw_chd_por_fato` de `20261019035107`; `vw_carga_horaria_turma` e `vw_disciplinas_execucao` de
--    `20261016092307`; `vw_conformidade_tetos` de `20261014060055`; `app.nascer_disciplina_nas_turmas` de
--    `20260925135051`.
-- ⚠️ SÓ COM AS TABELAS NOVAS VAZIAS: com registro, apagá-las é decisão de Bernardo (regra 4). E `nome_no_dsa` só sai
--    se estiver nula em todas as linhas — senão a coluna fica (`-- [APOSENTADA — v2.1]`) e o script PARA.
-- ⚠️ ANTES DE RODAR NO REMOTO: o código que lê o que as migrations criaram tem de sair da `main`.
-- ⚠️ Os PRIVILÉGIOS das views recriadas são guardados antes do `drop` e repostos depois (o `drop` os perde, e o
--    padrão do Supabase daria `ALL` a todo papel).
-- ⚠️ Provada numa base descartável (DoD 6): a impressão digital do esquema volta à de `c1f8d65`
--    (`cbd61b2b23ad95e0502e09f287b5f921`, 2.012 objetos) — registro em `progresso-implement.md`.
-- ⚠️ RODAR POR `psql -v ON_ERROR_STOP=1 < reversao.sql`: `supabase db query -f` manda o arquivo como UM comando
--    preparado e recusa vários. E no remoto, depois, o histórico: `supabase migration repair --status reverted` das
--    quatro (só as que tiverem sido aplicadas), senão o próximo `db push` as dá por aplicadas.
-- =================================================================================
begin;

-- ---------------------------------------------------------------- M4 (se aplicada)
do $$
declare v text;
begin
  foreach v in array array['registros_aula', 'avaliacoes', 'sessoes_de_aplicacao', 'vistas_de_avaliacao',
    'atividades_nao_letivas', 'dias_parados', 'turma_disciplina', 'turma_disciplina_instrutor',
    'turma_disciplina_unidade', 'ta_fora_do_dsa', 'previstos_proens_turma', 'avaliacoes_curriculo_turma'] loop
    execute format('drop trigger if exists trg_%1$s_turma_arquivada on public.%1$I', v);
  end loop;
end $$;
drop trigger if exists trg_turmas_arquivada_so_le on public.turmas;
drop function if exists app.recusar_se_turma_arquivada();
drop function if exists app.turma_arquivada_so_le();
drop function if exists app.turma_da_linha(text, jsonb);
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
     and not exists (select 1 from public.turma_disciplina td
                      where td.turma_id = t.id and td.disciplina_id = p_disciplina_id);

  get diagnostics v_criadas = row_count;
  return v_criadas;
end;
$$;

-- ---------------------------------------------------------------- M3
drop function if exists public.ocupacao_para_conflitos(date, date);
update public.config_parametros set status = 'inativo'
 where chave = 'turmas.aviso_inicio_dias' and status = 'ativo';

-- ---------------------------------------------------------------- M2
do $$
begin
  if exists (select 1 from public.turma_trocas_de_situacao) or exists (select 1 from public.turma_arquivamentos) then
    raise exception 'A trilha ou o arquivamento tem registro: apagar e decisao de Bernardo (regra 4).';
  end if;
end $$;
drop view if exists public.vw_turmas_arquivadas;
drop trigger if exists trg_turmas_anotar_troca on public.turmas;
drop function if exists public.trocar_situacao_da_turma(text, public.status_turma, text);
drop table if exists public.turma_arquivamentos;
drop table if exists public.turma_trocas_de_situacao;
drop function if exists app.carimbar_arquivamento();
drop function if exists app.anotar_troca_de_situacao();
drop function if exists app.turma_arquivada(uuid);
drop function if exists app.trilha_da_turma_imutavel();

-- ---------------------------------------------------------------- M1
do $$
begin
  if exists (select 1 from public.ta_fora_do_dsa) then
    raise exception 'ta_fora_do_dsa tem registro: apagar e decisao de Bernardo (regra 4).';
  end if;
  if exists (select 1 from public.disciplinas where nome_no_dsa is not null) then
    raise exception 'nome_no_dsa tem dado: a coluna fica como APOSENTADA e a decisao e de Bernardo.';
  end if;
end $$;

-- os privilégios das quatro views, guardados antes do drop
create temporary table _privilegios_das_views on commit drop as
  select table_name::text as visao, grantee::text as papel, privilege_type::text as privilegio
    from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name in ('vw_conformidade_tetos', 'vw_carga_horaria_turma', 'vw_disciplinas_execucao', 'vw_chd_por_fato')
     and grantee in ('anon', 'authenticated', 'service_role');

drop view public.vw_conformidade_tetos;
drop view public.vw_carga_horaria_turma;
drop view public.vw_disciplinas_execucao;
drop view public.vw_chd_por_fato;

create view public.vw_chd_por_fato with (security_invoker = true) as
with vivas as (
  select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
       r.data,
       r.tempos_consumidos::bigint as tempos,
       'aula'::text as origem
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos, 0)::bigint, 'aplicacao'
  from vivas v
union all
select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos, 0)::bigint, 'sessao_de_aplicacao'
  from public.sessoes_de_aplicacao p
  join vivas v on v.id = p.avaliacao_id
 where p.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos, 0)::bigint, 'vista'
  from public.vistas_de_avaliacao s
  join vivas v on v.id = s.avaliacao_id
 where s.status = 'ativo';

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

create view public.vw_conformidade_tetos with (security_invoker = true) as
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

do $$
declare v text; p record;
begin
  foreach v in array array['vw_conformidade_tetos', 'vw_carga_horaria_turma', 'vw_disciplinas_execucao', 'vw_chd_por_fato'] loop
    execute format('revoke all on public.%I from anon, authenticated, service_role', v);
  end loop;
  for p in select * from _privilegios_das_views loop
    execute format('grant %s on public.%I to %I', p.privilegio, p.visao, p.papel);
  end loop;
end $$;

alter table public.disciplinas drop column nome_no_dsa;
update public.perfil_permissao set permitido = false where recurso = 'ta_fora_do_dsa';
drop table public.ta_fora_do_dsa;
drop function app.guardar_ta_fora_do_dsa();
drop function app.proximo_codigo_ta_fora_do_dsa();
drop sequence app.ta_fora_do_dsa_codigo_seq;

commit;
