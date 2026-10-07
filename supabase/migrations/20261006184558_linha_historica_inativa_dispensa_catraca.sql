-- ════════════════════════════════════════════════════════════════════════════════════════════
-- A LINHA HISTÓRICA **INATIVA** FICA DISPENSADA DAS CATRACAS — VIRADA-1
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- O QUÊ  : cinco `CHECK` ganham uma saída — `status = 'inativo'` em linha com procedência de ETL.
--          Quatro em `registros_aula` e uma em `atividades_nao_letivas`.
--
-- PARA QUÊ: a VIRADA-1 passou a ser a carga das PLANILHAS DE CONTROLE, turma a turma *(decisão de
--          Bernardo Villas Boas, 06/10/2026)*, e a regra é SUBSTITUIR, NÃO SOMAR: os lançamentos do
--          ETL da turma saem por **exclusão lógica** e a planilha entra inteira. Nada é apagado
--          (regra 4).
--
-- ⚠️ POR QUE É PRECISO MEXER EM `CHECK` PARA INATIVAR — medido no banco LOCAL (cópia do remoto de
--    06/10/2026), numa transação desfeita: `update registros_aula set status = 'inativo'` numa
--    linha do ETL é RECUSADO com `23514`. A catraca funciona assim: a linha migrada só escapa da
--    exigência enquanto `editado_em is null`, e **qualquer** `UPDATE` carimba `editado_em` — inclusive
--    o que só troca o `status`. Inativar é editar, e editar reativa a exigência.
--
-- ⚠️ A EMENDA PEDIDA ERA UMA, E A MEDIÇÃO MOSTROU CINCO. O pedido previa
--    `reg_aula_ue_so_nula_no_historico`; a primeira recusa veio de `reg_aula_instrutor_obrigatorio`,
--    e as outras esperam atrás dela. Contra as 1.566 linhas de aula do ETL (banco local, cópia do
--    remoto de 06/10/2026):
--      · sem unidade de ensino ........ 1.566 (todas)  → `reg_aula_ue_so_nula_no_historico`
--                                                        e `reg_aula_ue_ou_disciplina`
--      · sem instrutor ................   173           → `reg_aula_instrutor_obrigatorio`
--      · sem tempos consumidos ........    52           → `reg_aula_tempos_so_nulo_no_historico`
--    e, em `atividades_nao_letivas`, 138 sem tempos    → `ativ_tempos_so_nulo_no_historico`.
--    Emendar só a primeira deixaria a substituição parar na segunda.
--
-- ⚠️ O QUE A EMENDA **NÃO** AFROUXA — e o pgTAP `117` tem o caso de cada uma:
--    1. linha ATIVA continua obrigada a tudo: reativar (`inativo` → `ativo`) uma linha histórica
--       sem UE é recusado, porque ela já foi editada e a saída só vale enquanto inativa;
--    2. linha NOVA não escapa: a saída exige `origem_migracao_v1 is not null`, então ninguém cria
--       um lançamento inativo sem UE para reativá-lo depois;
--    3. as avaliações não entram: `avaliacoes` não tem `status` ativo/inativo, e a forma proposta
--       para elas (`cancelada`, com a marca e o status anterior em `observacoes`) não precisa de
--       migration — medido: o `UPDATE` passa.
--
-- ⚠️ `DROP CONSTRAINT` + `ADD CONSTRAINT` DESCARTA O `COMMENT ON CONSTRAINT` EM SILÊNCIO (medido na
--    migration `20261005181116`). Os quatro comentários que existiam são reescritos abaixo, com a
--    emenda acrescentada; `reg_aula_ue_ou_disciplina` não tinha comentário e ganha um.
--
-- REVERSÃO: recriar os cinco `CHECK` sem a última alternativa. ⚠️ Ela só passa enquanto NÃO houver
--    linha histórica inativa que dependa da saída — depois da primeira substituição, reverter
--    exige aceitar a restrição `NOT VALID` ou reativar as linhas (o que a catraca recusa). Por isso
--    a reversão é para ANTES da primeira carga no remoto, não para depois.
--
--   alter table public.registros_aula drop constraint reg_aula_instrutor_obrigatorio;
--   alter table public.registros_aula add constraint reg_aula_instrutor_obrigatorio check (
--     categoria_normativa <> 'aula' or instrutor_id is not null
--     or (origem_migracao_v1 is not null and editado_em is null));
--   (idem para as outras quatro, com o texto de antes desta migration)
-- ════════════════════════════════════════════════════════════════════════════════════════════

alter table public.registros_aula drop constraint reg_aula_instrutor_obrigatorio;
alter table public.registros_aula add constraint reg_aula_instrutor_obrigatorio check (
  categoria_normativa <> 'aula'
  or instrutor_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'inativo')
);
comment on constraint reg_aula_instrutor_obrigatorio on public.registros_aula is
  'Aula exige instrutor. EXCECAO: linha migrada da v2.0 ainda nao editada — 173 das 1.566, todas '
  'Aula Teorica. Sao pendencia da Divisao, listadas na reconciliacao; editar a linha reativa a '
  'exigencia e lancamento novo nunca escapa dela. EMENDA DE 06/10/2026 (VIRADA-1, decisao de '
  'Bernardo Villas Boas): a linha migrada INATIVA tambem fica dispensada — inativar e editar, e sem '
  'isto a substituicao pela planilha de controle seria recusada. Reativa-la devolve a exigencia.';

alter table public.registros_aula drop constraint reg_aula_tempos_so_nulo_no_historico;
alter table public.registros_aula add constraint reg_aula_tempos_so_nulo_no_historico check (
  tempos_consumidos is not null
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'inativo')
);
comment on constraint reg_aula_tempos_so_nulo_no_historico on public.registros_aula is
  'Tempos consumidos so pode faltar na linha migrada da v2.0 ainda nao editada — sao 52 lancamentos '
  'de ESTUDO INDIVIDUAL, que fica fora da soma do CHT. Registro novo exige o valor; editar a linha '
  'migrada reativa a exigencia. EMENDA DE 06/10/2026 (VIRADA-1): a linha migrada INATIVA tambem '
  'fica dispensada; reativa-la devolve a exigencia.';

alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
  unidade_ensino_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)
  or (disciplina_id is not null and coalesce(app.disciplina_sem_ue(disciplina_id), false))
  or (origem_migracao_v1 is not null and status = 'inativo')
);
comment on constraint reg_aula_ue_so_nula_no_historico on public.registros_aula is
  'A Unidade de Ensino so pode ser nula em linha MIGRADA e NUNCA EDITADA, ou em disciplina ISENTA '
  'de UE. Dado novo continua obrigado a declarar a UE — a decisao UE-1 de 26/08/2026 segue valendo '
  'onde importa. Editar uma linha historica passa a exigir a UE: e uma catraca. Residual conhecido: '
  'um INSERT novo com origem_migracao_v1 preenchido escapa; fecha-lo exige gatilho de sessao, Epico '
  '3 (ver CHK023). ISENCAO ACRESCENTADA EM 05/10/2026 (Q-1 da spec 013, decisao de Bernardo Villas '
  'Boas): curso `curriculo_modelo = ''competencias''` (2 de 24) ou disciplina `sem_unidades_ensino` '
  '(6 de 175), por `app.disciplina_sem_ue`, SEMPRE com `disciplina_id` preenchido e topico em '
  '`conteudo_resumo` (`reg_aula_ue_ou_disciplina`). A catraca NAO foi afrouxada em geral: '
  'disciplina fora da isencao segue recusada, e o `116` tem o caso que discrimina. EMENDA DE '
  '06/10/2026 (VIRADA-1, decisao de Bernardo Villas Boas): a linha migrada INATIVA fica dispensada '
  '— e so ela: a substituicao pela planilha de controle inativa as 1.566 linhas do ETL, todas sem '
  'UE, e inativar e editar. Reativar a linha devolve a exigencia; o `117` tem os dois casos.';

alter table public.registros_aula drop constraint reg_aula_ue_ou_disciplina;
alter table public.registros_aula add constraint reg_aula_ue_ou_disciplina check (
  unidade_ensino_id is not null
  or (
    disciplina_id is not null
    and coalesce(app.disciplina_sem_ue(disciplina_id), false)
    and length(btrim(coalesce(conteudo_resumo, ''))) > 0
  )
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'inativo')
);
comment on constraint reg_aula_ue_ou_disciplina on public.registros_aula is
  'A aula aponta UE; ou, em disciplina isenta (`app.disciplina_sem_ue`), aponta a disciplina e traz '
  'o topico em `conteudo_resumo`; ou e linha migrada nunca editada. EMENDA DE 06/10/2026 '
  '(VIRADA-1): a linha migrada INATIVA tambem fica dispensada; reativa-la devolve a exigencia.';

alter table public.atividades_nao_letivas drop constraint ativ_tempos_so_nulo_no_historico;
alter table public.atividades_nao_letivas add constraint ativ_tempos_so_nulo_no_historico check (
  tempos_consumidos is not null
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'inativo')
);
comment on constraint ativ_tempos_so_nulo_no_historico on public.atividades_nao_letivas is
  'Tempos consumidos so pode faltar na linha migrada da v2.0 ainda nao editada: 135 sao Estudo '
  'Individual (fora da soma do CHT) e 3 sao lacuna real (2 TAD, 1 AEC) — estas tres saem na '
  'reconciliacao porque afetam os tetos de 5% e 10%. EMENDA DE 06/10/2026 (VIRADA-1): a linha '
  'migrada INATIVA tambem fica dispensada; reativa-la devolve a exigencia.';
