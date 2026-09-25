-- =================================================================================
-- M3 da fatia (b) do Epico 5 — a atribuicao de instrutor por turma passa a ter UMA
-- fonte de verdade, e as tres colunas que a duplicavam sao APOSENTADAS.
--
-- ORIGEM : Q-01 (Bernardo Villas Boas, 24/09/2026) — "aposentar. A fonte da verdade da
--          atribuicao por turma e `turma_disciplina_instrutor`. Antes de aposentar,
--          prove que os 79 valores preenchidos ja estao na juncao (ou migre-os para la),
--          sem perder nenhum; depois a coluna para de ser escrita. O mesmo destino para
--          `disciplinas.instrutores_atribuidos`. Nenhum quinto lugar."
--          E Q-02 — as tres disciplinas que comecam em modo `simultaneo`.
--          `FR-032`, `FR-032.1` e `FR-040` da spec 010.
--
-- ⚠️ A PROVA VEM ANTES DA APOSENTADORIA, E ABORTA A MIGRATION SE FALHAR. Medido em
--    24/09/2026 na base copiada do remoto: 79 de 79 `turma_disciplina.instrutor_id` nao
--    nulos ja tem linha ATIVA na juncao com o MESMO instrutor; `ch_prevista_por_instrutor`
--    e `instrutores_atribuidos` estao vazias (0 e 0 de 175). Logo nao ha o que migrar —
--    mas o bloco migra o que faltar, porque a migration tambem roda em base que nao e
--    esta, e "nao ha o que migrar" e uma medicao de hoje, nao uma propriedade do schema.
--
-- ⚠️ NENHUM `drop column`: a regra do `CLAUDE.md` e explicita — coluna sem uso vira
--    comentario `[APOSENTADA — v2.1]` e fica. O que muda e QUEM ESCREVE: a partir daqui,
--    ninguem. A LIQ do Epico 11 le a juncao.
--
-- ⚠️ AS TRES LINHAS `simultaneo` SAO NOMEADAS, UMA A UMA. A `RN-MAT-05` nomeia tres
--    praticas de fim de curso e PROIBE inferir pelo nome; o ETL nunca as marcou (0 de 175,
--    medido). Marcar aqui e decisao de Bernardo sobre linhas identificadas (Q-02), nao
--    inferencia em tempo de execucao — e por isso o `where` e pelo `codigo`, nao pelo nome.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    update public.disciplinas set modo_atribuicao_padrao = 'dividido'
--     where codigo in ('53 - C-Ap-FR - XIII', '41 - C-Ap-HN - XVIII', '20 - CAHO - XVIII');
--    insert into public.migracao_log (…) values (… 'reversao da marcacao simultaneo' …);
--    e restaurar os tres comentarios anteriores (o texto esta no corpo desta migration).
--    O evento de `migracao_log` da ida NAO e apagado — corrigir e logar evento novo.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a prova, antes de qualquer outra coisa (FR-032.1)
-- ---------------------------------------------------------------------------------
do $$
declare
  v_sem_par     integer;
  v_migradas    integer := 0;
  v_ch_na_linha integer;
  v_array       integer;
begin
  -- Quantos `instrutor_id` nao tem par ATIVO na juncao, com o MESMO instrutor?
  select count(*) into v_sem_par
    from public.turma_disciplina td
   where td.instrutor_id is not null
     and not exists (select 1 from public.turma_disciplina_instrutor i
                      where i.turma_disciplina_id = td.id
                        and i.instrutor_id = td.instrutor_id
                        and i.status = 'ativo');

  if v_sem_par > 0 then
    -- ⚠️ Migra para a juncao ANTES de aposentar — "sem perder nenhum" (Q-01). O codigo
    --    vem do DEFAULT da propria coluna; `on conflict` cobre o par que existe inativo.
    insert into public.turma_disciplina_instrutor (turma_disciplina_id, instrutor_id, status)
    select td.id, td.instrutor_id, 'ativo'
      from public.turma_disciplina td
     where td.instrutor_id is not null
       and not exists (select 1 from public.turma_disciplina_instrutor i
                        where i.turma_disciplina_id = td.id
                          and i.instrutor_id = td.instrutor_id)
    on conflict (turma_disciplina_id, instrutor_id) do nothing;
    get diagnostics v_migradas = row_count;

    update public.turma_disciplina_instrutor i
       set status = 'ativo'
      from public.turma_disciplina td
     where i.turma_disciplina_id = td.id
       and i.instrutor_id = td.instrutor_id
       and td.instrutor_id is not null
       and i.status <> 'ativo';

    -- Reconfere: depois de migrar, nao pode sobrar nenhum.
    select count(*) into v_sem_par
      from public.turma_disciplina td
     where td.instrutor_id is not null
       and not exists (select 1 from public.turma_disciplina_instrutor i
                        where i.turma_disciplina_id = td.id
                          and i.instrutor_id = td.instrutor_id
                          and i.status = 'ativo');

    if v_sem_par > 0 then
      raise exception 'FR-032.1: % atribuicoes de `turma_disciplina.instrutor_id` continuam '
                      'sem par ativo na juncao depois da migracao. A coluna NAO e aposentada '
                      'enquanto houver dado que so existe nela.', v_sem_par;
    end if;

    raise notice 'FR-032.1: % atribuicao(oes) migrada(s) de `instrutor_id` para a juncao.', v_migradas;
  else
    raise notice 'FR-032.1: nada a migrar — todo `instrutor_id` ja tem par ativo na juncao.';
  end if;

  -- As outras duas colunas: se tiverem dado, a aposentadoria perderia informacao.
  select count(*) into v_ch_na_linha
    from public.turma_disciplina where ch_prevista_por_instrutor is not null;
  select count(*) into v_array
    from public.disciplinas where cardinality(instrutores_atribuidos) > 0;

  if v_ch_na_linha > 0 or v_array > 0 then
    raise exception 'FR-032.1: `ch_prevista_por_instrutor` tem % linha(s) e '
                    '`instrutores_atribuidos` tem % — as duas seriam aposentadas COM dado. '
                    'Medido em 24/09/2026: 0 e 0. Parar e decidir antes de seguir.',
                    v_ch_na_linha, v_array;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------
-- PARTE B — as tres colunas aposentadas (sem `drop`)
-- ---------------------------------------------------------------------------------
comment on column public.turma_disciplina.instrutor_id is
  '[APOSENTADA — v2.1] Instrutor da disciplina naquela turma. A FONTE DA VERDADE PASSOU A '
  'SER `turma_disciplina_instrutor` (Q-01, Bernardo Villas Boas, 24/09/2026): la cabem '
  'varios instrutores, a CH rateada de cada um e, quando LIQ-3 vier, o papel. ⚠️ O texto '
  'anterior dizia que a LIQ do Epico 11 le DESTA coluna; ela passa a ler da juncao. '
  'Ninguem escreve aqui a partir da fatia (b). Provado antes de aposentar (FR-032.1): todo '
  'valor nao nulo tem par ativo na juncao — 79 de 79 em 24/09/2026. Nao ha `drop`: coluna '
  'com historico fica (convencao de banco do CLAUDE.md).';

comment on column public.turma_disciplina.ch_prevista_por_instrutor is
  '[APOSENTADA — v2.1] CH rateada por instrutor, na linha da turma. Nunca foi preenchida '
  '(0 de 210, medido em 24/09/2026). A CH rateada vive em '
  '`turma_disciplina_instrutor.ch_prevista_tempos`, uma linha por instrutor — duas colunas '
  'para o mesmo fato e a segunda fonte de verdade que o BRIEF §2 proibe (Q-01, achado D-7).';

comment on column public.disciplinas.instrutores_atribuidos is
  '[APOSENTADA — v2.1] Atribuicao de PLANEJAMENTO (RN-CRONOS-01), como `uuid[]`. Vazia nas '
  '175 linhas (medido em 24/09/2026) e sem nenhum escritor. A atribuicao real e por TURMA, '
  'em `turma_disciplina_instrutor` (Q-01). O gatilho `trg_disciplinas_instrutores_fk` fica '
  'no lugar, inerte, porque remove-lo nao acrescenta garantia nenhuma. ⚠️ A RPC '
  '`app.excluir_instrutor` continua lendo esta coluna como impedimento `atribuicao` — e '
  'correto: impedimento a mais nunca apaga historico por engano.';

-- ---------------------------------------------------------------------------------
-- PARTE C — as tres disciplinas em modo `simultaneo` (Q-02)
-- ---------------------------------------------------------------------------------
do $$
declare
  v_codigos text[] := array[
    '53 - C-Ap-FR - XIII',   -- PRATICA DE  DE CURSO EM MANUTENCAO DE AUXILIOS A NAVEGACAO
    '41 - C-Ap-HN - XVIII',  -- LEVANTAMENTO HIDROGRAFICO DE  DE CURSO  (LHFC)
    '20 - CAHO - XVIII'      -- LEVANTAMENTO HIDROGRAFICO DE  DE CURSO  (LHFC)
  ];
  v_codigo  text;
  v_mudadas integer;
begin
  foreach v_codigo in array v_codigos loop
    update public.disciplinas
       set modo_atribuicao_padrao = 'simultaneo'
     where codigo = v_codigo
       and modo_atribuicao_padrao <> 'simultaneo';
    get diagnostics v_mudadas = row_count;

    if v_mudadas > 0 then
      -- ⚠️ Evento NOVO em `migracao_log`; nunca reescrita de linha (regra 5).
      insert into public.migracao_log
        (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
         acao, regra_aplicada, valor_antes, valor_depois, observacao)
      values ('MLOG-5B-MODO-' || upper(regexp_replace(v_codigo, '[^0-9A-Za-z]+', '', 'g')),
              'disciplinas', v_codigo, 'disciplinas', v_codigo,
              'corrigido', 'RN-MAT-05 / FR-040', 'dividido', 'simultaneo',
              'Q-02 (Bernardo Villas Boas, 24/09/2026): uma das tres praticas nomeadas pela '
              'RN-MAT-05, identificada PELO CODIGO — a regra proibe inferir pelo nome, e o '
              'nome desta linha perdeu a palavra "FIM" na origem. O ETL nunca marcou '
              'nenhuma (0 de 175, medido em 24/09/2026).');
    end if;
  end loop;
end;
$$;
