-- Preparo da turma C-Exp-Obs-ME T1 2026 para a sincronizacao pela planilha de controle «C-Exp-OBS-ME-PR T01/26»
-- (02/02 a 27/02/2026, fora da pasta-fonte).
--
-- O QUE  : o cadastro que antecede a carga, pela decisao D3 de Bernardo Villas Boas (26/10/2026): «cadastre a turma pelo
--          caminho de preparo usado na BATI T1 e na Ag-Mag T1 — curso casado pelo catalogo da BD DISCIPLINAS; periodo,
--          alunos e sala tirados da planilha; curriculo vigente em 02/02; atribuicao por disciplina». Aplicado nos dois
--          bancos (local e remoto) como UM bloco `DO`. Idempotente.
--
-- ⚠️ A TURMA JA EXISTIA, e por isso este preparo NAO A CRIA: ela foi criada pela tela em 22/10/2026 (USR-ADMIN-001), com
--    o periodo, a sala, a situacao e o curriculo que a planilha diz (02/02 a 27/02, Sala 06, concluida, CRV-000016) e
--    sem alunos nem atribuicao. O bloco 0 confere isso e PARA se a turma nao estiver assim; os blocos seguintes so
--    COMPLETAM o que falta, e nunca sobrescrevem um valor que alguem ja tenha posto.
--
-- O CURSO, casado pelo catalogo (nunca pela sigla do cabecalho, «C-Exp-OBS-ME-PR T/01»): as duas disciplinas da BD
--    DISCIPLINAS — OBS. METEOROLOGICA I (50 TA, UEs 1 a 5) e II (65 TA, UEs 1 a 4) — tem os mesmos nomes de UE do
--    curriculo CRV-000016 da C-Exp-Obs-ME, vigente desde 01/01/2026; nenhum outro curriculo do banco casa.
--
-- ⚠️ OS NOMES NAO ESTAO AQUI, E E DE PROPOSITO: o repositorio e publico. Instrutor pelo codigo da v2.0 e pelo posto.
do $$
declare
  v_curso uuid;
  v_turma public.turmas;
  v_regime public.regimes_de_horario;
  v_td1 uuid; v_td2 uuid;
  v_47 uuid; v_15 uuid;
  v_ja text;
begin
  select id into strict v_curso from public.cursos where codigo = 'C-Exp-Obs-ME';
  select * into strict v_turma from public.turmas where codigo = 'C-Exp-Obs-ME T1 2026' and curso_id = v_curso;

  -- ── 0. A TURMA, como a planilha diz ── periodo 02/02 a 27/02, Sala 06 (o local de toda linha da BD DISCIPLINAS),
  --    concluida, curriculo vigente em 02/02 (CRV-000016). Nao arquivada (D-COR-5: arquivada e somente leitura).
  if v_turma.data_inicio is distinct from date '2026-02-02' or v_turma.data_termino is distinct from date '2026-02-27'
     or v_turma.sala_alocada is distinct from 'Sala 06' or v_turma.status <> 'concluida'
     or v_turma.curriculo_id <> (select id from public.curriculos where codigo = 'CRV-000016' and curso_id = v_curso) then
    raise exception 'A turma C-Exp-Obs-ME T1 2026 nao esta como a planilha diz (02/02 a 27/02, Sala 06, concluida, CRV-000016): pare e confira.';
  end if;
  if app.turma_arquivada(v_turma.id) then
    raise exception 'A turma C-Exp-Obs-ME T1 2026 esta arquivada: somente leitura (D-COR-5).';
  end if;

  -- ── 1. RELOGIO ── da aba HORARIOS (decisao de 06/10/2026, item 3 do lote da onda 1): 9 tempos de 45 min, 07:50,
  --    intervalo de 5 min de manha e a tarde, tarde 13:05, sem catalogo — o mesmo da C-Exp-BATI T1 (REG-000034).
  --    ⚠️ PELO REGIME DA TURMA, e nao por vigencia do curso: o curso so tem vigencia a partir de 14/09/2026 (a da T2), e
  --       uma vigencia de 02/02 a 13/09 e RECUSADA pelo gatilho `app.conferir_vigencia_nova` — ele conta os lancamentos
  --       de `vigente_de` em diante sem olhar `vigente_ate` (`app.lancamentos_que_travam_vigencia`), e a T2 tem 61.
  --       Medido no banco local em 26/10/2026. Mudar a guarda seria migration; o regime NOMEADO do curso, escolhido pela
  --       turma (Bloco 3, spec 018 — o campo de *Editar turma*), e o caminho da tela, so acrescenta e so vale para ela.
  --    Antes de qualquer lancamento da turma: depois do primeiro, o regime dela trava (RF-HOR-05).
  select * into v_regime from public.regimes_de_horario
   where curso_id = v_curso and status = 'ativo' and lower(btrim(nome)) = lower('9 TA de 45 min — 07:50');
  if not found then
    insert into public.regimes_de_horario (curso_id, nome, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min,
                                           hora_inicio_manha, hora_inicio_tarde, observacao)
    values (v_curso, '9 TA de 45 min — 07:50', 9, 45, 5, 5, time '07:50', time '13:05',
            'Relogio da turma C-Exp-Obs-ME T1 2026, lido da aba HORARIOS da planilha de controle «C-Exp-OBS-ME-PR T01/26». '
            || 'Decisao D3 de Bernardo Villas Boas, 26/10/2026.')
    returning * into v_regime;
    raise notice 'regime % criado', v_regime.codigo;
  elsif v_regime.regime_tempos <> 9 or v_regime.ta_duracao_min <> 45 or v_regime.hora_inicio_manha <> time '07:50'
        or v_regime.hora_inicio_tarde <> time '13:05' or v_regime.intervalo_manha_min <> 5 or v_regime.intervalo_tarde_min <> 5
        or v_regime.configuracao_horario_id is not null then
    raise exception 'O regime % («%») nao e o relogio da planilha: pare e confira.', v_regime.codigo, v_regime.nome;
  end if;
  if v_turma.regime_de_horario_id is null then
    update public.turmas set regime_de_horario_id = v_regime.id where id = v_turma.id;
    raise notice 'turma no regime %', v_regime.codigo;
  elsif v_turma.regime_de_horario_id <> v_regime.id then
    raise exception 'A turma ja escolheu outro regime de horario: pare e confira.';
  end if;

  -- ── 2. ALUNOS ── 19, o que a planilha traz (PREENCHIMENTO!B2). So preenche o vazio.
  if v_turma.alunos is null then
    update public.turmas set alunos = 19 where id = v_turma.id;
    raise notice 'alunos: 19';
  elsif v_turma.alunos <> 19 then
    raise exception 'A turma ja tem % alunos, e a planilha diz 19: pare e confira.', v_turma.alunos;
  end if;

  -- ── 3. ATRIBUICAO ── por disciplina, pela MESMA RPC da tela (definir_instrutores_da_turma), um instrutor em cada:
  --    I = instrutor 47 (CC), II = instrutor 15 (SO) — os que a BD DISCIPLINAS nomeia em toda linha da disciplina. Os
  --    dois ja sao habilitados nelas (a I desde o preparo da T2, 06/10/2026). Com um instrutor so, a CH prevista e a
  --    da disciplina inteira (caso 1 do rateio). So atribui a disciplina que ainda nao tem ninguem.
  select id into strict v_td1 from public.turma_disciplina
   where turma_id = v_turma.id and status = 'ativo'
     and disciplina_id = (select id from public.disciplinas where curriculo_id = v_turma.curriculo_id and cod_disciplina = 'I' and status = 'ativo');
  select id into strict v_td2 from public.turma_disciplina
   where turma_id = v_turma.id and status = 'ativo'
     and disciplina_id = (select id from public.disciplinas where curriculo_id = v_turma.curriculo_id and cod_disciplina = 'II' and status = 'ativo');
  select id into strict v_47 from public.instrutores where codigo = '47' and posto_graduacao = 'CC' and status = 'ativo';
  select id into strict v_15 from public.instrutores where codigo = '15' and posto_graduacao = 'SO' and status = 'ativo';

  select string_agg(i.codigo, ',' order by i.codigo) into v_ja
    from public.turma_disciplina_instrutor x join public.instrutores i on i.id = x.instrutor_id
   where x.turma_disciplina_id = v_td1 and x.status = 'ativo';
  if v_ja is null then
    perform public.definir_instrutores_da_turma(v_td1, jsonb_build_array(jsonb_build_object('instrutor_id', v_47, 'ch_prevista_tempos', null)), null);
    raise notice 'I: instrutor 47';
  elsif v_ja <> '47' then
    raise exception 'A disciplina I ja tem instrutor(es) % e a planilha diz 47: pare e confira.', v_ja;
  end if;

  select string_agg(i.codigo, ',' order by i.codigo) into v_ja
    from public.turma_disciplina_instrutor x join public.instrutores i on i.id = x.instrutor_id
   where x.turma_disciplina_id = v_td2 and x.status = 'ativo';
  if v_ja is null then
    perform public.definir_instrutores_da_turma(v_td2, jsonb_build_array(jsonb_build_object('instrutor_id', v_15, 'ch_prevista_tempos', null)), null);
    raise notice 'II: instrutor 15';
  elsif v_ja <> '15' then
    raise exception 'A disciplina II ja tem instrutor(es) % e a planilha diz 15: pare e confira.', v_ja;
  end if;
end $$;
