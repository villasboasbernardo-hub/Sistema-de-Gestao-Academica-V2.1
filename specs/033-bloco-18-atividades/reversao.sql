-- =====================================================================================================================
-- REVERSÃO da spec 033 (Bloco 18): a M2 (`20261103140512`) primeiro, depois a M1 (`20261103140231`).
-- Gerado de `supabase/migrations/*` pelos corpos de ORIGEM (o mesmo texto que a M2 copiou, sem as trocas do «Conta como»).
-- ⚠️ Só numa base em que nenhuma linha use o Bloco 18 — o bloco 0 confere e PARA. Rodar inteiro, numa transação:
--    begin; \i reversao.sql; (conferir) commit;
-- ⚠️ As colunas novas de `vw_carga_horaria_turma` e `vw_disciplinas_execucao` (no fim) só saem com `drop view` + recriação
--    das dependentes (`vw_conformidade_tetos`), por isso estas duas são recriadas por `drop … cascade` e a dependente volta
--    com o corpo de `20261021030050`.
-- =====================================================================================================================
do $$
begin
  if exists (select 1 from public.atividades_nao_letivas
              where conta_como is not null or atividade_prevista_id is not null or apoinst_id is not null
                 or responsavel_externo_om is not null)
     or exists (select 1 from public.aec_previstas_curriculo)
     or exists (select 1 from public.apoinst_planejadas)
     or exists (select 1 from public.marcacoes_de_atividade) then
    raise exception 'Reversão do Bloco 18: há dado nas colunas ou tabelas novas. PARE e decida o que fazer com ele.';
  end if;
end;
$$;

-- ── M2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────

-- o gatilho da categoria (corpo de `20261014051835_apoio_individualizado_e_tipo_com_fk.sql`)
create or replace function app.categoria_pelo_tipo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tipo record;
begin
  -- A linha HISTÓRICA do ETL sem tipo não é tocada: nem preenchida, nem recusada (senão a inativação
  -- feita pela sincronização falharia). R-3.
  if new.tipo_atividade_id is null and new.origem_migracao_v1 is not null then
    return new;
  end if;

  -- Tipo pelo subtipo: quando vem nulo (o DSA e a sincronização de hoje mandam só o subtipo), ou
  -- quando o UPDATE mudou só o subtipo.
  if new.tipo_atividade_id is null
     or (tg_op = 'UPDATE'
         and new.subtipo is distinct from old.subtipo
         and new.tipo_atividade_id is not distinct from old.tipo_atividade_id) then
    select c.id into new.tipo_atividade_id
      from public.config_listas c
     where c.lista = 'tipos_atividade' and c.valor = new.subtipo;
  end if;

  if new.tipo_atividade_id is null then
    raise exception using errcode = '23514', message = format('O subtipo «%s» não está na lista de tipos de atividade.', new.subtipo),
      hint = 'tipo_de_atividade_inexistente';
  end if;

  select c.valor, c.metadados into v_tipo
    from public.config_listas c
   where c.id = new.tipo_atividade_id and c.lista = 'tipos_atividade';

  if not found then
    raise exception using errcode = '23514', message = 'O tipo informado não é da lista de tipos de atividade.',
      hint = 'tipo_de_atividade_inexistente';
  end if;

  if coalesce(v_tipo.metadados ->> 'uso', '') = 'aula' or (v_tipo.metadados ->> 'categoria') is null then
    raise exception using errcode = '23514', message = format('O tipo «%s» não tem categoria de atividade.', v_tipo.valor),
      hint = 'tipo_de_atividade_sem_categoria';
  end if;

  new.categoria_normativa := (v_tipo.metadados ->> 'categoria')::public.categoria_normativa;
  new.subtipo := v_tipo.valor;
  return new;
end;
$$;

revoke all on function app.categoria_pelo_tipo() from public, anon, authenticated;

-- a recategorização (corpo de `20261023161634_publicacao_do_dsa_so_o_salvo_conta.sql`)
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

alter table public.atividades_nao_letivas drop constraint ativ_disciplina_so_aec_da_turma;
alter table public.atividades_nao_letivas add constraint ativ_disciplina_so_aec_da_turma
  check (disciplina_id is null
         or (categoria_normativa = 'AEC'::public.categoria_normativa and turma_id is not null
             and coalesce(app.disciplina_e_da_turma(disciplina_id, turma_id), false)));
comment on constraint ativ_disciplina_so_aec_da_turma on public.atividades_nao_letivas is
  'Disciplina so em AEC, so em atividade de TURMA (a global vale para todas e nao pertence a curso '
  'nenhum), e so disciplina do curso da turma. Sem disciplina, qualquer atividade continua aceita.';
alter table public.correcoes_de_curriculo drop constraint correcoes_de_curriculo_tabela_check;
alter table public.correcoes_de_curriculo add constraint correcoes_de_curriculo_tabela_check
  check (tabela in ('curriculos', 'disciplinas', 'unidades_ensino', 'avaliacoes_curriculo', 'limites_curriculo',
                    'avaliacoes_planejadas', 'regimes_de_horario'));

-- a cópia do currículo (corpo de `20261021201915_horarios_do_curriculo.sql`)
create or replace function public.criar_curriculo(
  p_curso_id uuid,
  p_vigente_de date,
  p_descricao text,
  p_hoje date
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_origem    uuid;
  v_nova      uuid := gen_random_uuid();
  v_versao    smallint;
  v_mais_novo date;
begin
  if coalesce(app.pode('cursos', 'editar'), false) is not true
     or coalesce(app.alcanca_curso(p_curso_id), false) is not true
     or coalesce(app.curso_em_oferta(p_curso_id), false) is not true then
    raise exception 'O seu perfil não cria currículo neste curso.'
      using errcode = '42501', hint = 'curriculo_sem_permissao';
  end if;
  if p_vigente_de is null or p_hoje is null then
    raise exception 'Informe a partir de quando o currículo novo vale.'
      using errcode = '23502', hint = 'curriculo_sem_vigencia';
  end if;

  select max(c.vigente_de) into v_mais_novo
    from public.curriculos c where c.curso_id = p_curso_id and c.status = 'ativo';
  if v_mais_novo is not null and v_mais_novo > p_hoje then
    raise exception 'O curso já tem um currículo futuro (a partir de %): edite-o em vez de criar outro.',
                    to_char(v_mais_novo, 'DD/MM/YYYY')
      using errcode = '23514', hint = 'ja_ha_curriculo_futuro';
  end if;
  if v_mais_novo is not null and p_vigente_de <= v_mais_novo then
    raise exception 'O currículo novo tem de começar depois do mais novo que o curso já tem (a partir de %).',
                    to_char(v_mais_novo, 'DD/MM/YYYY')
      using errcode = '23514', hint = 'curriculo_antes_do_mais_novo';
  end if;

  v_origem := app.curriculo_vigente(p_curso_id, p_hoje);
  if v_origem is null then
    raise exception 'O curso não tem currículo vigente para copiar.'
      using errcode = '23514', hint = 'curriculo_sem_vigente';
  end if;

  select coalesce(max(c.versao), 0) + 1 into v_versao from public.curriculos c where c.curso_id = p_curso_id;

  insert into public.curriculos (id, curso_id, versao, vigente_de, descricao, proposito, duracao_semanas, duracao_dias,
                                 curriculo_modelo, copiada_de)
  select v_nova, p_curso_id, v_versao, p_vigente_de, nullif(btrim(p_descricao), ''), o.proposito, o.duracao_semanas,
         o.duracao_dias, o.curriculo_modelo, o.id
    from public.curriculos o where o.id = v_origem;

  drop table if exists pg_temp._mapa_disciplina, pg_temp._mapa_ue;
  create temporary table _mapa_disciplina on commit drop as
    select d.id as antiga, gen_random_uuid() as nova
      from public.disciplinas d
     where d.curriculo_id = v_origem and d.status = 'ativo';

  -- `semanas`, `ch_semanal` e `nome_normalizado` são GERADAS: vêm junto, sem ser copiadas.
  insert into public.disciplinas (
    id, curso_id, curriculo_id, linhagem_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, ordem_sugerida,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino, modo_atribuicao_padrao, tecnica_ensino_sugerida,
    local_padrao, sem_unidades_ensino, nome_no_dsa)
  select m.nova, d.curso_id, v_nova, d.linhagem_id, d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos,
         d.ordem_sugerida, d.prioridade_alocacao_peso, d.previsao_inicio, d.previsao_termino,
         d.modo_atribuicao_padrao, d.tecnica_ensino_sugerida, d.local_padrao, d.sem_unidades_ensino, d.nome_no_dsa
    from _mapa_disciplina m join public.disciplinas d on d.id = m.antiga;

  create temporary table _mapa_ue on commit drop as
    select u.id as antiga, gen_random_uuid() as nova, m.nova as disciplina_nova
      from public.unidades_ensino u join _mapa_disciplina m on m.antiga = u.disciplina_id
     where u.status = 'ativo';

  insert into public.unidades_ensino (
    id, disciplina_id, curso_id, linhagem_id, numero_ue, topico, ch_prevista_tempos, tecnica_ensino_sugerida,
    fundamento_normativo)
  select mu.nova, mu.disciplina_nova, u.curso_id, u.linhagem_id, u.numero_ue, u.topico, u.ch_prevista_tempos,
         u.tecnica_ensino_sugerida, u.fundamento_normativo
    from _mapa_ue mu join public.unidades_ensino u on u.id = mu.antiga;

  insert into public.avaliacoes_curriculo (
    disciplina_id, curso_id, linhagem_id, ordem, instrumento_id, numero, unidade_ensino_id, origem_ue, ue_decidida_em,
    ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista, origem_item, fonte_arquivo,
    fonte_pagina)
  select m.nova, a.curso_id, a.linhagem_id, a.ordem, a.instrumento_id, a.numero, mu.nova, a.origem_ue,
         a.ue_decidida_em, a.ues_abordadas, a.ta_aplicacao, a.origem_ta_aplicacao, a.ta_vista, a.origem_ta_vista,
         a.origem_item, a.fonte_arquivo, a.fonte_pagina
    from public.avaliacoes_curriculo a
    join _mapa_disciplina m on m.antiga = a.disciplina_id
    left join _mapa_ue mu on mu.antiga = a.unidade_ensino_id
   where a.status = 'ativo';

  insert into public.limites_curriculo (curso_id, curriculo_id, categoria, tempos, fonte_arquivo, fonte_pagina)
  select l.curso_id, v_nova, l.categoria, l.tempos, l.fonte_arquivo, l.fonte_pagina
    from public.limites_curriculo l
   where l.curriculo_id = v_origem and l.status = 'ativo';

  insert into public.avaliacoes_planejadas (codigo, curso_id, curriculo_id, nome_disciplina, descricao_instrumentos,
                                            formula_mf, carater, observacoes)
  select a.codigo || '#C' || v_versao, a.curso_id, v_nova, a.nome_disciplina, a.descricao_instrumentos, a.formula_mf,
         a.carater, a.observacoes
    from public.avaliacoes_planejadas a
   where a.curriculo_id = v_origem and a.status = 'ativo';

  insert into public.instrutor_disciplina (instrutor_id, disciplina_id, modo_atribuicao)
  select v.instrutor_id, m.nova, v.modo_atribuicao
    from public.instrutor_disciplina v join _mapa_disciplina m on m.antiga = v.disciplina_id
   where v.status = 'ativo';

  -- Emenda de 21/10/2026 à RC-1: os HORÁRIOS são do currículo — os regimes nomeados ativos, com a linhagem do original
  -- (a troca de currículo da turma leva o regime dela pelo correspondente).
  insert into public.regimes_de_horario (curso_id, curriculo_id, linhagem_id, nome, regime_tempos, ta_duracao_min,
                                         intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde,
                                         configuracao_horario_id, observacao)
  select r.curso_id, v_nova, r.linhagem_id, r.nome, r.regime_tempos, r.ta_duracao_min, r.intervalo_manha_min,
         r.intervalo_tarde_min, r.hora_inicio_manha, r.hora_inicio_tarde, r.configuracao_horario_id, r.observacao
    from public.regimes_de_horario r
   where r.curriculo_id = v_origem and r.status = 'ativo';

  return v_nova;
end;
$$;

-- vw_ocupacao_ta (corpo de `20261023161634_publicacao_do_dsa_so_o_salvo_conta.sql`)
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

revoke insert, update, delete, truncate on public.vw_ocupacao_ta from authenticated, anon;
revoke all on public.vw_ocupacao_ta from anon;
grant select on public.vw_ocupacao_ta to authenticated;

-- vw_ocupacao_do_dsa (corpo de `20261023161631_publicacao_do_dsa_estrutura.sql`)
create or replace view public.vw_ocupacao_do_dsa with (security_invoker = true) as
with av as (
  -- A avaliação viva, com a marca de que há uma sombra viva dela.
  select a.*,
         exists (select 1 from public.avaliacoes s
                  where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada') as sombreada
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos, 'aula'::text as origem, r.id as fato_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id, r.instrutor_id, null::uuid as fiscal_id, r.local,
       r.origem_migracao_v1 is not null and r.editado_em is null as herdado, null::uuid as sessao_id,
       null::smallint as numero_sessao, not r.salvo as rascunho, r.rascunho_de
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo' and r.ta_inicial is not null and not r.rascunho_exclui
   and (not r.salvo or not exists (select 1 from public.registros_aula s
                                    where s.rascunho_de = r.id and not s.salvo and s.status = 'ativo'))
union all
select a.turma_id, a.data_avaliacao, a.ta_inicial, a.ta_final, a.tempos_consumidos, 'avaliacao', a.id, a.disciplina_id,
       a.instrutor_responsavel_id, a.fiscal_id, a.local, a.origem_migracao_v1 is not null and a.editado_em is null,
       null::uuid, null::smallint, not a.salvo, a.rascunho_de
  from av a
 where a.ta_inicial is not null and not a.rascunho_exclui and (not a.salvo or not a.sombreada)
union all
select coalesce(sh.turma_id, a.turma_id), p.data, p.ta_inicial, p.ta_final, p.tempos_consumidos, 'sessao_aplicacao',
       coalesce(sh.id, a.id), coalesce(sh.disciplina_id, a.disciplina_id),
       coalesce(sh.instrutor_responsavel_id, a.instrutor_responsavel_id), coalesce(sh.fiscal_id, a.fiscal_id), p.local,
       a.origem_migracao_v1 is not null and a.editado_em is null, p.id, p.numero, not p.salvo, p.rascunho_de
  from public.sessoes_de_aplicacao p
  join av a on a.id = p.avaliacao_id and not a.rascunho_exclui
  left join lateral (select s.* from public.avaliacoes s
                      where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada' limit 1) sh on true
 where p.status = 'ativo' and p.ta_inicial is not null and not p.rascunho_exclui
   and not coalesce(sh.rascunho_exclui, false)
   and (not p.salvo or not exists (select 1 from public.sessoes_de_aplicacao s
                                    where s.rascunho_de = p.id and not s.salvo and s.status = 'ativo'))
union all
select coalesce(sh.turma_id, a.turma_id), v.data, v.ta_inicial, v.ta_final, v.tempos_consumidos, 'vista_prova',
       coalesce(sh.id, a.id), coalesce(sh.disciplina_id, a.disciplina_id),
       coalesce(v.conduz_instrutor_id, sh.instrutor_responsavel_id, a.instrutor_responsavel_id),
       coalesce(sh.fiscal_id, a.fiscal_id), v.local,
       a.origem_migracao_v1 is not null and a.editado_em is null, v.id, v.numero, not v.salvo, v.rascunho_de
  from public.vistas_de_avaliacao v
  join av a on a.id = v.avaliacao_id and not a.rascunho_exclui
  left join lateral (select s.* from public.avaliacoes s
                      where s.rascunho_de = a.id and not s.salvo and s.status::text <> 'cancelada' limit 1) sh on true
 where v.status = 'ativo' and v.ta_inicial is not null and not v.rascunho_exclui
   and not coalesce(sh.rascunho_exclui, false)
   and (not v.salvo or not exists (select 1 from public.vistas_de_avaliacao s
                                    where s.rascunho_de = v.id and not s.salvo and s.status = 'ativo'))
union all
select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos, 'atividade_nao_letiva', n.id, null::uuid,
       n.instrutor_id, null::uuid, n.local, n.origem_migracao_v1 is not null and n.editado_em is null,
       null::uuid, null::smallint, not n.salvo, n.rascunho_de
  from public.atividades_nao_letivas n
 where n.status = 'ativo' and n.ta_inicial is not null and not n.rascunho_exclui
   and (not n.salvo or not exists (select 1 from public.atividades_nao_letivas s
                                    where s.rascunho_de = n.id and not s.salvo and s.status = 'ativo'));

revoke insert, update, delete, truncate on public.vw_ocupacao_do_dsa from authenticated, anon;
revoke all on public.vw_ocupacao_do_dsa from anon;
grant select on public.vw_ocupacao_do_dsa to authenticated;

-- vw_chd_por_fato (corpo de `20261023161634_publicacao_do_dsa_so_o_salvo_conta.sql`)
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

revoke insert, update, delete, truncate on public.vw_chd_por_fato from authenticated, anon;
revoke all on public.vw_chd_por_fato from anon;
grant select on public.vw_chd_por_fato to authenticated;

drop view public.vw_disciplinas_execucao;

-- vw_disciplinas_execucao (corpo de `20261023161634_publicacao_do_dsa_so_o_salvo_conta.sql`)
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

revoke insert, update, delete, truncate on public.vw_disciplinas_execucao from authenticated, anon;
revoke all on public.vw_disciplinas_execucao from anon;
grant select on public.vw_disciplinas_execucao to authenticated;

-- vw_instrutor_carga_anual (corpo de `20261030224204_instrutores_adicionais_da_aula.sql`)
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
         -- Bloco 16 (RD-9, emenda da RN-INST-04): cada INSTRUTOR ADICIONAL da aula leva os TA inteiros dela.
         SELECT ad.instrutor_id,
            t.ano_letivo AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
             JOIN turmas t ON t.id = r.turma_id
             CROSS JOIN LATERAL unnest(r.instrutores_adicionais) ad(instrutor_id)
          WHERE r.status = 'ativo'::status_registro AND r.salvo
          GROUP BY ad.instrutor_id, t.ano_letivo
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

revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated, anon;
revoke all on public.vw_instrutor_carga_anual from anon;
grant select on public.vw_instrutor_carga_anual to authenticated;

drop view public.vw_carga_horaria_turma cascade;

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

revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated, anon;
revoke all on public.vw_carga_horaria_turma from anon;
grant select on public.vw_carga_horaria_turma to authenticated;

-- a dependente (corpo de `20261021030050`)
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

revoke insert, update, delete, truncate on public.vw_conformidade_tetos from authenticated, anon;
revoke all on public.vw_conformidade_tetos from anon;
grant select on public.vw_conformidade_tetos to authenticated;

-- ── M1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
drop trigger trg_atividades_vinculo on public.atividades_nao_letivas;
drop function app.conferir_vinculo_da_atividade();
alter table public.atividades_nao_letivas
  drop constraint ativ_conta_como_valido, drop constraint ativ_conta_como_chd_com_disciplina,
  drop constraint ativ_conta_como_sem_bloqueio, drop constraint ativ_conta_como_com_tipo,
  drop constraint ativ_um_vinculo, drop constraint ativ_vinculo_so_de_turma, drop constraint ativ_om_so_do_externo;
drop index public.idx_ativ_atividade_prevista;
drop index public.idx_ativ_apoinst;
-- colunas NASCIDAS na M1, vazias (o bloco 0 conferiu)
alter table public.atividades_nao_letivas
  drop column conta_como, drop column atividade_prevista_id, drop column apoinst_id, drop column responsavel_externo_om;
drop table public.marcacoes_de_atividade;
drop table public.apoinst_planejadas;
drop table public.aec_previstas_curriculo;
drop function app.guardar_marcacao_de_atividade();
drop function app.guardar_apoinst_planejada();
drop function app.guardar_aec_prevista();
drop function app.proximo_codigo_marcacao_de_atividade();
drop function app.proximo_codigo_apoinst();
drop function app.proximo_codigo_aec_prevista();
drop sequence app.marcacoes_de_atividade_codigo_seq;
drop sequence app.apoinst_planejadas_codigo_seq;
drop sequence app.aec_previstas_curriculo_codigo_seq;
delete from public.perfil_permissao where recurso = 'planejamento_de_atividades';
delete from public.config_parametros where chave in ('apoinst.ano_inicial', 'atividades.aviso_aec_semanas');
-- os quatro tipos, só se nenhum lançamento os usar (o delete recusa por FK se usar)
delete from public.config_listas where lista = 'tipos_atividade' and valor in ('Desportiva', 'DeCAT', 'Reforço', 'Outra');
update public.config_listas set rotulo_exibicao = 'Atividade Extracurricular'
 where lista = 'tipos_atividade' and valor = 'Atividade Extracurricular';
