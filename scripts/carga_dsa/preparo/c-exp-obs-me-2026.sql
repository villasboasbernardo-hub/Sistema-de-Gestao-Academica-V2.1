-- Preparo da turma C-Exp-Obs-ME 2026 para a carga do DSA pela planilha de controle.
--
-- O QUE  : os tres passos de CADASTRO que antecedem a carga, autorizados por Bernardo Villas Boas
--          em 06/10/2026 e aplicados nos dois bancos nesse dia (local e remoto), cada bloco como
--          UMA instrucao da CLI do Supabase (db query, com -f). Todos sao idempotentes.
--
-- ⚠️ REGISTRO DO QUE FOI RODADO A MAO, nao migration: e dado de UMA turma, e a regra de direcao
--    do projeto so admite dado no remoto por excecao nominal — esta e a excecao da VIRADA-1 para
--    esta turma, e mais nenhuma.
--
-- ⚠️ NENHUM GATILHO FOI DESLIGADO. O relogio usa o caminho que o banco permite para vigencia SEM
--    lancamento: cancelar a vigencia (o gatilho guardar_vigencia_de_regime confere que nao ha
--    lancamento) e registrar a nova pela RPC da tela, na MESMA transacao.
--    Por que nao corrigir_vigencia_regime: ela herda configuracao_horario_id da vigencia anterior
--    por coalesce, e o relogio real exige catalogo NULO — com o catalogo apontado, o DSA le o
--    08:00 do CFG-A e ignora o regime (lib/dominio/dsa/horario-do-bloco.ts).
--
-- ⚠️ OS NOMES NAO ESTAO AQUI, E E DE PROPOSITO: o repositorio e publico. Na execucao, cada
--    instrutor foi conferido tambem pelo nome de guerra dentro do nome completo; neste registro
--    fica o que identifica sem expor: o codigo da v2.0 e o posto.

-- ── 1. RELOGIO ── 7x50, 08:10, intervalo de 10 min de manha e 5 a tarde, tarde 13:05, sem catalogo.
--    ANTES de qualquer lancamento: depois do primeiro, o gatilho de vigencia impede a correcao.
do $$
declare
  v_curso uuid;
  v_atual public.curso_regime_historico;
  v_nova  public.curso_regime_historico;
begin
  select id into strict v_curso from public.cursos where codigo = 'C-Exp-Obs-ME';
  select * into strict v_atual from public.curso_regime_historico
   where curso_id = v_curso and tipo_regime = 'padrao' and status = 'ativo'
     and vigente_de <= date '2026-09-14' and (vigente_ate is null or vigente_ate >= date '2026-09-14');

  if v_atual.configuracao_horario_id is null
     and v_atual.hora_inicio_manha = time '08:10' and v_atual.hora_inicio_tarde = time '13:05'
     and v_atual.intervalo_manha_min = 10 and v_atual.intervalo_tarde_min = 5
     and v_atual.regime_tempos = 7 and v_atual.ta_duracao_min = 50 then
    raise notice 'relogio ja corrigido (%), nada a fazer', v_atual.codigo;
    return;
  end if;

  if v_atual.vigente_de <> date '2026-09-14' or v_atual.vigente_ate is not null then
    raise exception 'A vigencia ativa (%) nao e a de 14/09 em aberto: pare e confira.', v_atual.codigo;
  end if;

  update public.curso_regime_historico set status = 'cancelado' where id = v_atual.id;

  v_nova := public.registrar_vigencia_regime(v_curso, jsonb_build_object(
    'tipo_regime', 'padrao', 'vigente_de', '2026-09-14',
    'regime_tempos', 7, 'ta_duracao_min', 50,
    'intervalo_manha_min', 10, 'intervalo_tarde_min', 5,
    'hora_inicio_manha', '08:10', 'hora_inicio_tarde', '13:05',
    'motivo', 'Relogio real da turma de 2026: inicio 08:10, intervalo de 10 min de manha e 5 a tarde, tarde 13:05, sem catalogo. Substitui ' || v_atual.codigo || ' (08:00, 10/10, CFG-A), cancelada sem lancamento. Decisao de Bernardo Villas Boas, 06/10/2026.'));
  raise notice 'cancelada %, registrada %', v_atual.codigo, v_nova.codigo;
end $$;

-- ── 2. TURMA ── 6 alunos, Sala 02.
update public.turmas set alunos = 6, sala_alocada = 'Sala 02'
 where codigo = 'C-Exp-Obs-ME 2026' and curso_id = (select id from public.cursos where codigo = 'C-Exp-Obs-ME')
   and (alunos is distinct from 6 or sala_alocada is distinct from 'Sala 02')
returning codigo, alunos, sala_alocada;

-- ── 3. ATRIBUICAO ── pela MESMA RPC da tela (definir_instrutores_da_turma).
--    I  = instrutor 47 (28 TA) + instrutor 127 (22 TA), modo dividido, por TA.
--    II = instrutor 15, por unidade de ensino (a parcela e derivada: 65 TA).
--    ⚠️ Em I NAO ha instrutor por UE: o gatilho trg_soma_do_rateio recusa rateio por UE e por TA
--       ao mesmo tempo (rateio_por_ue_com_ta), e por UE a parcela seria derivada do catalogo do
--       banco — 31 e 19 —, que embute os tempos de prova na UE. Os 28 e 22 sao o que a planilha
--       registra (aulas + provas + vistas de cada um).
do $$
declare
  v_turma uuid; v_curso uuid;
  v_td1 uuid; v_td2 uuid; v_d1 uuid; v_d2 uuid;
  v_47 uuid; v_127 uuid; v_15 uuid;
begin
  select id into strict v_curso from public.cursos where codigo = 'C-Exp-Obs-ME';
  select id into strict v_turma from public.turmas where curso_id = v_curso and codigo = 'C-Exp-Obs-ME 2026';
  select id into strict v_d1 from public.disciplinas where curso_id = v_curso and cod_disciplina = 'I'  and status = 'ativo';
  select id into strict v_d2 from public.disciplinas where curso_id = v_curso and cod_disciplina = 'II' and status = 'ativo';
  select id into strict v_td1 from public.turma_disciplina where turma_id = v_turma and disciplina_id = v_d1 and status = 'ativo';
  select id into strict v_td2 from public.turma_disciplina where turma_id = v_turma and disciplina_id = v_d2 and status = 'ativo';
  -- instrutor casado por CODIGO da v2.0 E por posto
  select id into strict v_47  from public.instrutores where codigo = '47'  and posto_graduacao = 'CC';
  select id into strict v_127 from public.instrutores where codigo = '127' and posto_graduacao = '1ºTen';
  select id into strict v_15  from public.instrutores where codigo = '15'  and posto_graduacao = 'SO';

  -- (c) atribuicao, pela MESMA RPC da tela, com instrutor por UE
  perform public.definir_instrutores_da_turma(v_td1,
    jsonb_build_array(jsonb_build_object('instrutor_id', v_47,  'ch_prevista_tempos', 28),
                      jsonb_build_object('instrutor_id', v_127, 'ch_prevista_tempos', 22)),
    null);
  perform public.definir_instrutores_da_turma(v_td2,
    jsonb_build_array(jsonb_build_object('instrutor_id', v_15, 'ch_prevista_tempos', null)),
    (select jsonb_agg(jsonb_build_object('unidade_ensino_id', u.id, 'instrutor_id', v_15) order by u.numero_ue)
       from public.unidades_ensino u where u.disciplina_id = v_d2 and u.status = 'ativo'));
end $$;

-- ── 4. HABILITACAO E NOME DE GUERRA ── autorizados por Bernardo Villas Boas em 06/10/2026, depois
--    do primeiro ensaio: quem nao tinha habilitacao em Observacao Meteorologica I era o instrutor
--    47 (a 127 ja tinha), e sem ela a RN-INST-01 recusava 9 blocos, 28 TA.
--    ⚠️ O NOME DE GUERRA dos instrutores 47, 127 e 15 tambem foi preenchido, nos dois bancos, por
--       `update` conferido por codigo + posto + nome. Os VALORES NAO ESTAO AQUI: nome de pessoa nao
--       entra neste repositorio, que e publico.
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
select i.id, d.id
  from public.instrutores i, public.disciplinas d
 where i.codigo = '47' and i.posto_graduacao = 'CC'
   and d.cod_disciplina = 'I' and d.status = 'ativo'
   and d.curso_id = (select id from public.cursos where codigo = 'C-Exp-Obs-ME')
   and not exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = i.id and v.disciplina_id = d.id);
