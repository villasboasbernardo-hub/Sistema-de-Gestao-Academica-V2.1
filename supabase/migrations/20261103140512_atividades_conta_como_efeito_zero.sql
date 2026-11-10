-- =====================================================================================================================
-- Bloco 18 (spec 033), M2 — O «CONTA COMO» PASSA A VALER: o gatilho da categoria, a recategorização, a disciplina no
-- «TA da disciplina», a trilha e a cópia do currículo, e as views que somam a CHD e a carga — RECRIADOS COM EFEITO ZERO.
-- Data local: 03/11/2026 (o carimbo do nome é UTC; não renomear).
--
-- > "1. AUTORIZADO: coluna nova nulável com a classificação escolhida pelo operador; o gatilho app.categoria_pelo_tipo
-- > só a respeita quando preenchida. Siga com o rito SE a medição na cópia do remoto der efeito ZERO; senão, PARE."
-- > — Bernardo Villas Boas, 03/11/2026 (conferência do passo 0)
-- > "Se precisar recriar a view de ocupação/CH para o 'Conta como TA da disciplina': AUTORIZADO SE a medição na cópia do
-- > remoto der efeito ZERO hoje (nenhum lançamento antigo muda de conta); senão, PARE." — pedido do Bloco 18
--
-- ⚠️ RECRIA o que existe (regra 9.4), sob a condição de EFEITO ZERO. Tudo aqui só muda de resultado quando
--    `atividades_nao_letivas.conta_como` (nascida nula na M1) estiver preenchida — e NENHUMA linha a tem (conferido no
--    passo 0 abaixo, que PARA a migration se houver). Os predicados são `conta_como = 'CHD'` (inclusão: nulo é falso) e
--    `conta_como IS DISTINCT FROM 'CHD'` (exclusão: nulo passa) — `<> 'CHD'` tiraria TODAS as atividades da AEC/TAD/TR.
--   1. `app.categoria_pelo_tipo`: AEC/TAD/TR escolhidos viram a categoria da linha; «CHD» (TA da disciplina) e nulo
--      ficam com a do tipo. Tipo de Estudo Individual ou de Apoio Individualizado não aceita a escolha (decisão 2).
--   2. `app.recategorizar_pelo_tipo`: a linha com AEC/TAD/TR escolhidos fica com a escolha.
--   3. `ativ_disciplina_so_aec_da_turma`: a disciplina vale também no «CHD» (que a exige, M1). O COMMENT é reposto — o
--      `drop constraint` o apaga em silêncio.
--   4. `correcoes_de_curriculo_tabela_check`: a trilha da RC-6 aceita `aec_previstas_curriculo` (precedente da M5 do
--      Bloco 6, `20261021201915`).
--   5. `public.criar_curriculo`: o currículo novo copia as AEC previstas (RC-7). O corpo é o de `20261021201915`, com um
--      `insert` a mais no fim.
--   6. As views, com o corpo da última definição e UM ramo a mais (ou um filtro a mais), mesmas colunas na mesma ordem,
--      colunas novas só no FIM, `with (security_invoker = true)` repetido em cada uma (gotcha 10) e o revoke repetido:
--      `vw_ocupacao_ta` e `vw_ocupacao_do_dsa` (a disciplina do «CHD»), `vw_chd_por_fato`, `vw_carga_horaria_turma` e
--      `vw_disciplinas_execucao` (as três da P-3 do pgTAP 135, iguais entre si), `vw_instrutor_carga_anual` (a carga
--      ministrada). `vw_conformidade_tetos` segue a `vw_carga_horaria_turma` sem ser recriada.
--
-- EFEITO MEDIDO na cópia `remoto-20261103-103124.sql`, restaurada no banco local (03/11/2026): md5 das linhas ordenadas,
-- antes e depois da M1 e desta M2, de `vw_ocupacao_ta` (3.561 linhas), `vw_ocupacao_do_dsa` (3.559), `vw_chd_por_fato`
-- (2.723), `vw_carga_horaria_turma` (30), `vw_disciplinas_execucao` (230), `vw_instrutor_carga_anual` (182),
-- `vw_conformidade_tetos` (90), `chd_da_turma_ate` e `execucao_por_disciplina_ate` em 03/11/2026 e da própria tabela de
-- atividades (1.594) — IGUAIS NOS DEZ (`specs/033-bloco-18-atividades/medicao-efeito-zero.md`). As colunas novas das
-- views valem 0 em todas as linhas; `security_invoker=true` nas seis.
--
-- REVERSÃO (`specs/033-bloco-18-atividades/reversao.sql`): recriar cada objeto com o corpo da migration de origem
-- citada no cabeçalho do bloco dele, e repor os dois CHECKs como eram.
-- =====================================================================================================================

-- ---------------------------------------------------------------- 0. a condição: nenhuma linha com «Conta como»
do $$
begin
  if exists (select 1 from public.atividades_nao_letivas where conta_como is not null) then
    raise exception 'Bloco 18, M2: há atividade com conta_como preenchida — o efeito deixaria de ser zero. PARE.';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. o gatilho da categoria (corpo de `20261014051835`)
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

  -- Bloco 18 (RA-1/RA-4, decisões 1 e 2): o operador troca a classificação só entre os componentes da CHT. Tipo de Estudo
  -- Individual ou de Apoio Individualizado (Monitoria, Português, BDA, BDF) não aceita escolha.
  if new.conta_como is not null and (v_tipo.metadados ->> 'categoria') not in ('AEC', 'TAD', 'TR') then
    raise exception using errcode = '23514',
      message = format('O tipo «%s» não conta como AEC, TAD, TR nem como TA da disciplina: a classificação dele não se troca.', v_tipo.valor),
      hint = 'conta_como_fora_da_cht';
  end if;

  -- A escolha AEC/TAD/TR vira a categoria da linha; «CHD» (TA da disciplina) e nula ficam com a do tipo — o «CHD» é
  -- movido para a CHD pelas views, pela coluna `conta_como`.
  if new.conta_como in ('AEC', 'TAD', 'TR') then
    new.categoria_normativa := new.conta_como::public.categoria_normativa;
  else
    new.categoria_normativa := (v_tipo.metadados ->> 'categoria')::public.categoria_normativa;
  end if;
  new.subtipo := v_tipo.valor;
  return new;
end;
$$;
revoke all on function app.categoria_pelo_tipo() from public, anon, authenticated;

comment on function app.categoria_pelo_tipo() is
  'D-AA-3 / R-3 (spec 014), com a emenda do Bloco 18 (spec 033, RA-1): a categoria normativa da atividade DERIVA do tipo '
  '(`config_listas.metadados.categoria`), salvo quando o operador escolheu AEC, TAD ou TR em `conta_como`. Tipo pelo '
  'subtipo quando nulo; recusa tipo sem categoria ou de uso "aula", e escolha em tipo de EI ou de Apoio Individualizado. '
  'Não toca linha histórica sem tipo.';

-- ---------------------------------------------------------------- 2. a recategorização (corpo de `20261023161634`)
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
       and status = 'ativo'
       -- Bloco 18 (RA-1, decisão 1): a linha em que o OPERADOR escolheu AEC/TAD/TR fica com a escolha dele.
       and (conta_como is null or conta_como = 'CHD')
       -- ⚠️ E A DA TURMA ARQUIVADA FICA COMO ESTÁ (achado da revisão do Bloco 18; RT-8: ela conta com a situação que
       --    tinha): a trava `trg_atividades_nao_letivas_turma_arquivada` recusaria a linha, e a troca do catálogo inteira
       --    seria desfeita. Medido na cópia `remoto-20261103-103124.sql`: 21 turmas arquivadas, com Palestra, Visita
       --    Técnica, Atividade Extracurricular e Administração lançadas.
       and (turma_id is null or not coalesce(app.turma_arquivada(turma_id), false));
  end if;
  return new;
end;
$function$;

-- ---------------------------------------------------------------- 3. a disciplina no «TA da disciplina» (`20261008164612`)
-- ⚠️ `coalesce(conta_como = 'CHD', false)`: um CHECK PASSA com NULO — `categoria = 'TAD' or conta_como = 'CHD'` com a
--    coluna nula daria NULO e aceitaria a TAD com disciplina, que o pgTAP 121 recusa.
alter table public.atividades_nao_letivas drop constraint ativ_disciplina_so_aec_da_turma;
alter table public.atividades_nao_letivas add constraint ativ_disciplina_so_aec_da_turma
  check (disciplina_id is null
         or ((categoria_normativa = 'AEC'::public.categoria_normativa or coalesce(conta_como = 'CHD', false))
             and turma_id is not null
             and coalesce(app.disciplina_e_da_turma(disciplina_id, turma_id), false)));
comment on constraint ativ_disciplina_so_aec_da_turma on public.atividades_nao_letivas is
  'Disciplina so em AEC, so em atividade de TURMA (a global vale para todas e nao pertence a curso '
  'nenhum), e so disciplina do curso da turma. Sem disciplina, qualquer atividade continua aceita. '
  'Bloco 18 (spec 033, RA-4): tambem na atividade que CONTA COMO TA DA DISCIPLINA (conta_como = CHD), que a exige.';

-- ---------------------------------------------------------------- 4. a trilha da RC-6 aceita as AEC previstas
alter table public.correcoes_de_curriculo drop constraint correcoes_de_curriculo_tabela_check;
alter table public.correcoes_de_curriculo add constraint correcoes_de_curriculo_tabela_check
  check (tabela in ('curriculos', 'disciplinas', 'unidades_ensino', 'avaliacoes_curriculo', 'limites_curriculo',
                    'avaliacoes_planejadas', 'regimes_de_horario', 'aec_previstas_curriculo'));

-- ---------------------------------------------------------------- 5. a cópia do currículo (corpo de `20261021201915`)
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

  -- Bloco 18 (RA-2): as AEC PREVISTAS ativas, com a linhagem do original; a disciplina pela correspondente.
  insert into public.aec_previstas_curriculo (curso_id, curriculo_id, linhagem_id, nome, tipo_atividade_id,
                                              ta_previstos, disciplina_id, obrigatoria, ordem, fonte_arquivo,
                                              fonte_pagina, observacao)
  select p.curso_id, v_nova, p.linhagem_id, p.nome, p.tipo_atividade_id, p.ta_previstos, m.nova, p.obrigatoria,
         p.ordem, p.fonte_arquivo, p.fonte_pagina, p.observacao
    from public.aec_previstas_curriculo p
    left join _mapa_disciplina m on m.antiga = p.disciplina_id
   where p.curriculo_id = v_origem and p.status = 'ativo';

  return v_nova;
end;
$$;
revoke all on function public.criar_curriculo(uuid, date, text, date) from public, anon;
grant execute on function public.criar_curriculo(uuid, date, text, date) to authenticated;
comment on function public.criar_curriculo(uuid, date, text, date) is
  'Bloco 6 (spec 021, RC-7 e RC-2): cria o currículo N+1 do curso como cópia do vigente em `p_hoje` — o conteúdo da '
  'RC-1, disciplinas, UEs, avaliações do currículo, limites, regras de avaliação, habilitações, regimes de horário e, '
  'desde o Bloco 18, as AEC previstas ativas, com a linhagem '
  'da original. Começa depois do mais novo; não cria um segundo futuro. Porteiro: cursos.editar, alcance e oferta.';

-- ---------------------------------------------------------------- 6.1 a ocupação (corpo de `20261023161634`)
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
    -- Bloco 18 (RA-4): a atividade que CONTA COMO TA DA DISCIPLINA ocupa como aula, com a disciplina.
    CASE WHEN n.conta_como = 'CHD'::text THEN n.disciplina_id END AS disciplina_id,
    n.instrutor_id,
    NULL::uuid AS fiscal_id,
    n.local,
    n.origem_migracao_v1 IS NOT NULL AND n.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM atividades_nao_letivas n
  WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.ta_inicial IS NOT NULL;
revoke insert, update, delete, truncate on public.vw_ocupacao_ta from authenticated, anon;
revoke all    on public.vw_ocupacao_ta from anon;
grant  select on public.vw_ocupacao_ta to authenticated;

-- ---------------------------------------------------------------- 6.2 a ocupação com o rascunho (corpo de `20261023161631`)
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
select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos, 'atividade_nao_letiva', n.id,
       case when n.conta_como = 'CHD' then n.disciplina_id end,
       n.instrutor_id, null::uuid, n.local, n.origem_migracao_v1 is not null and n.editado_em is null,
       null::uuid, null::smallint, not n.salvo, n.rascunho_de
  from public.atividades_nao_letivas n
 where n.status = 'ativo' and n.ta_inicial is not null and not n.rascunho_exclui
   and (not n.salvo or not exists (select 1 from public.atividades_nao_letivas s
                                    where s.rascunho_de = n.id and not s.salvo and s.status = 'ativo'));
revoke all on public.vw_ocupacao_do_dsa from anon;
revoke insert, update, delete, truncate on public.vw_ocupacao_do_dsa from authenticated;
grant select on public.vw_ocupacao_do_dsa to authenticated;

-- ---------------------------------------------------------------- 6.3 a CHD por fato (corpo de `20261023161634`)
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
 where f.status = 'ativo'
union all
-- Bloco 18 (RA-4): a atividade que CONTA COMO TA DA DISCIPLINA é fato da CHD, como a aula.
select n.turma_id, n.disciplina_id, n.data, n.tempos_consumidos::bigint, 'atividade_na_disciplina',
       n.ta_inicial is null
  from public.atividades_nao_letivas n
 where n.status = 'ativo' and n.salvo and n.conta_como = 'CHD';
revoke insert, update, delete, truncate on public.vw_chd_por_fato from authenticated, anon;
revoke all    on public.vw_chd_por_fato from anon;
grant  select on public.vw_chd_por_fato to authenticated;

-- ---------------------------------------------------------------- 6.4 a carga da turma (corpo de `20261023161634`)
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
            n.tempos_consumidos,
            n.conta_como
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.turma_id IS NOT NULL
        UNION ALL
         SELECT t_1.id,
            n.categoria_normativa,
            n.tempos_consumidos,
            n.conta_como
           FROM atividades_nao_letivas n
             CROSS JOIN turmas t_1
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.turma_id IS NULL AND app.turma_tem_dsa_na_data(t_1.id, n.data)
        ), nao_letivas AS (
         SELECT l.turma_id,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'AEC'::categoria_normativa AND l.conta_como IS DISTINCT FROM 'CHD'::text) AS ta_aec,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TAD'::categoria_normativa AND l.conta_como IS DISTINCT FROM 'CHD'::text) AS ta_tad,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TR'::categoria_normativa AND l.conta_como IS DISTINCT FROM 'CHD'::text) AS ta_tr,
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
        ), na_disciplina AS (
         -- Bloco 18 (RA-4): «Conta como TA da disciplina» soma na CHD da turma, como aula, e sai da AEC/TAD/TR.
         SELECT n.turma_id,
            sum(n.tempos_consumidos) AS ta
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.turma_id IS NOT NULL AND n.conta_como = 'CHD'::text
          GROUP BY n.turma_id
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
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) + COALESCE(nd.ta, 0::bigint) AS chd_executada,
    COALESCE(nl.ta_aec, 0::bigint) AS ta_aec,
    COALESCE(nl.ta_tad, 0::bigint) AS ta_tad,
    COALESCE(nl.ta_tr, 0::bigint) AS ta_tr,
    COALESCE(nl.ta_estudo_individual, 0::bigint) AS ta_estudo_individual,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) + COALESCE(nd.ta, 0::bigint) + COALESCE(nl.ta_aec, 0::bigint) + COALESCE(nl.ta_tad, 0::bigint) + COALESCE(nl.ta_tr, 0::bigint) AS cht_executada,
    COALESCE(nl.ta_apoio_individualizado, 0::bigint) AS ta_apoio_individualizado,
    COALESCE(pa.ta_dias_parados, 0::bigint::numeric) AS ta_dias_parados,
    COALESCE(fo.ta_fora_do_dsa, 0::bigint) AS ta_fora_do_dsa,
    COALESCE(nd.ta, 0::bigint) AS ta_atividade_na_disciplina
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id
     LEFT JOIN fora fo ON fo.turma_id = t.id
     LEFT JOIN na_disciplina nd ON nd.turma_id = t.id;
revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated, anon;
revoke all    on public.vw_carga_horaria_turma from anon;
grant  select on public.vw_carga_horaria_turma to authenticated;

-- ---------------------------------------------------------------- 6.5 a execução da disciplina (corpo de `20261023161634`)
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
        ), atividades AS (
         -- Bloco 18 (RA-4): «Conta como TA da disciplina» soma na execução da disciplina, como aula.
         SELECT n.disciplina_id,
            n.turma_id,
            min(n.data) AS primeira_data,
            max(n.data) AS ultima_data,
            sum(n.tempos_consumidos) AS ta
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.conta_como = 'CHD'::text AND n.disciplina_id IS NOT NULL
          GROUP BY n.disciplina_id, n.turma_id
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
    LEAST(au.primeira_data, pr.primeira_data, fo.primeira_data, atv.primeira_data) AS data_real_inicio,
    GREATEST(au.ultima_data, pr.ultima_data, fo.ultima_data, atv.ultima_data) AS data_real_termino,
    COALESCE(au.ta, 0::bigint) AS ta_aula_executados,
    COALESCE(pr.ta, 0::bigint) AS ta_avaliacao_executados,
    COALESCE(au.ta, 0::bigint) + COALESCE(pr.ta, 0::bigint) + COALESCE(fo.ta, 0::bigint) + COALESCE(atv.ta, 0::bigint) AS ta_executados,
    d.carga_horaria_tempos - COALESCE(au.ta, 0::bigint) - COALESCE(pr.ta, 0::bigint) - COALESCE(fo.ta, 0::bigint) - COALESCE(atv.ta, 0::bigint) AS ta_saldo,
    COALESCE(fo.ta, 0::bigint) AS ta_fora_do_dsa,
    d.nome_no_dsa,
    COALESCE(atv.ta, 0::bigint) AS ta_atividade_executados
   FROM disciplinas d
     JOIN turmas t ON t.curriculo_id = d.curriculo_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
     LEFT JOIN fora fo ON fo.disciplina_id = d.id AND fo.turma_id = t.id
     LEFT JOIN atividades atv ON atv.disciplina_id = d.id AND atv.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;
revoke insert, update, delete, truncate on public.vw_disciplinas_execucao from authenticated, anon;
revoke all    on public.vw_disciplinas_execucao from anon;
grant  select on public.vw_disciplinas_execucao to authenticated;

-- ---------------------------------------------------------------- 6.6 a carga do instrutor (corpo de `20261030224204`)
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
         -- Bloco 18 (RA-4): a atividade que CONTA COMO TA DA DISCIPLINA leva os TA ao instrutor do cadastro,
         -- como aula, no ano da turma (RT-6).
         SELECT n.instrutor_id,
            t.ano_letivo AS ano,
            sum(n.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM atividades_nao_letivas n
             JOIN turmas t ON t.id = n.turma_id
          WHERE n.status = 'ativo'::status_registro AND n.salvo AND n.conta_como = 'CHD'::text AND n.instrutor_id IS NOT NULL
          GROUP BY n.instrutor_id, t.ano_letivo
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
