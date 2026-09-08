-- =================================================================================
-- Os `NOT NULL` que o dado real refuta
--
-- O QUÊ  : afrouxa oito colunas declaradas `NOT NULL` no Épico 1 que a base de
--          produção da v2.0 preenche vazias — cinco porque a ausência é LEGÍTIMA e
--          permanente, três porque é ausência SÓ do histórico e ganham catraca.
--
-- PARA QUÊ: a promoção do Épico 2 é a primeira vez que o schema encontra os dados
--          reais. O Épico 1 declarou o `NOT NULL` a partir dos documentos, e os
--          documentos descrevem o caso normal. O dado tem os outros casos.
--
-- ⚠️ ESTE ARQUIVO É UM ACHADO, NÃO UMA CONVENIÊNCIA. Cada `drop not null` abaixo
--    vem com a contagem medida e a razão pela qual a ausência significa alguma
--    coisa. Nenhuma coluna foi afrouxada por "estava atrapalhando a carga": onde a
--    ausência é só do passado, o `NOT NULL` foi substituído por CATRACA, que é mais
--    forte que o `NOT NULL` original para dado novo — ela também exige a coluna
--    quando alguém EDITA a linha migrada.
--
-- Aplicado sob a autorização de 08/09/2026 ("autorizo consertar os problemas do
-- banco anterior agora mesmo"). Ratificação registrada no relatório do Épico 2.
-- =================================================================================


-- =================================================================================
-- PARTE 1 — AUSÊNCIA LEGÍTIMA E PERMANENTE
-- Aqui o `NOT NULL` estava simplesmente errado: há casos, hoje e no futuro, em que
-- a coluna não tem valor porque o fato que ela descreve não existe.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. `curso_regime_historico.hora_inicio_manha` / `hora_inicio_tarde`  (4 de 29)
--
-- As 4 linhas vazias são de cursos EAD/semipresenciais, e a própria planilha
-- explica na coluna de observação: "Curso EAD/semipresencial sem regime de TA
-- presencial". Um curso a distância não tem hora de início de turno presencial —
-- exigi-la obriga a inventar um horário que ninguém cumpre. O comentário do ENUM
-- `modalidade_ensino` já dizia isto por outras palavras: "Cursos `ead` puros (4 na
-- base) não têm regime de TA — só `limite_diario_ead_horas`". Quatro. São estes.
-- ---------------------------------------------------------------------------------
alter table public.curso_regime_historico alter column hora_inicio_manha drop not null;
alter table public.curso_regime_historico alter column hora_inicio_tarde drop not null;

comment on column public.curso_regime_historico.hora_inicio_manha is
  'Hora de inicio do turno da manha. NULA em curso EAD/semipresencial, que nao tem '
  'turno presencial — a ausencia e o dado (ver `limite_diario_ead_horas`).';
comment on column public.curso_regime_historico.hora_inicio_tarde is
  'Idem `hora_inicio_manha`.';

-- ---------------------------------------------------------------------------------
-- 2. `turmas.turma`  (19 de 29)
--
-- É o designador da turma dentro do ano — `T1`, `T2`. Só existe quando o curso abre
-- MAIS DE UMA turma no ano. `CAHO 2026` e `C-Ap-HN 2026` são turma única e a célula
-- está vazia na v2.0, corretamente: não há o que distinguir. Preencher com `T1`
-- inventaria uma numeração que a Divisão não usa, e ela apareceria impressa no DSA.
-- ---------------------------------------------------------------------------------
alter table public.turmas alter column turma drop not null;

comment on column public.turmas.turma is
  'Designador da turma no ano (T1, T2). NULO em curso de turma unica — 19 das 29 na '
  'base v2.0. Nao preencher com T1 por padrao: o valor sai impresso no DSA.';

-- ---------------------------------------------------------------------------------
-- 3. `instrutores.esp_hab_obs`  (15 de 177)
--
-- É o sufixo de especialidade/habilitação que acompanha o posto — `-EF`, `-MA`,
-- `(RM1-HN)`. Nem todo militar tem um. Exigi-lo faria a Divisão digitar traço ou
-- ponto para satisfazer o banco, que é como um `NOT NULL` mal posto vira sujeira.
-- ---------------------------------------------------------------------------------
alter table public.instrutores alter column esp_hab_obs drop not null;

comment on column public.instrutores.esp_hab_obs is
  'Sufixo de especialidade/habilitacao do posto (-EF, -MA, (RM1-HN)). NULO para quem '
  'nao tem — 15 dos 177 na base v2.0.';

-- ---------------------------------------------------------------------------------
-- 4. `avaliacoes.instrutor_responsavel_id`  (123 de 188)
--
-- 65% das avaliações da v2.0 não nomeiam instrutor responsável. Não é lacuna de
-- digitação nessa proporção: a avaliação é da DISCIPLINA, e o responsável só é
-- registrado quando difere do instrutor da disciplina. A FK continua existindo e
-- continua `restrict`; o que cai é a obrigatoriedade.
-- ---------------------------------------------------------------------------------
alter table public.avaliacoes alter column instrutor_responsavel_id drop not null;

comment on column public.avaliacoes.instrutor_responsavel_id is
  'Instrutor responsavel pela avaliacao. NULO quando coincide com o instrutor da '
  'disciplina — 123 das 188 na base v2.0. A FK permanece `restrict`.';

-- ---------------------------------------------------------------------------------
-- 5. `migracao_log.origem_tabela`  (1 de 930)
--
-- A linha `LOG-000399` registra: "aba tinha 0 linhas; 2 sementes GERAL criadas".
-- É um evento de migração que **não teve tabela de origem** — nasceu de uma decisão,
-- não de um transporte. Forçar um valor aqui obrigaria a inventar uma procedência
-- num log de auditoria, que é o pior lugar possível para inventar procedência.
-- ---------------------------------------------------------------------------------
alter table public.migracao_log alter column origem_tabela drop not null;

comment on column public.migracao_log.origem_tabela is
  'Tabela de origem do evento. NULA quando o evento nao transportou nada — semente '
  'criada por decisao, correcao sem fonte. Nao inventar procedencia neste log.';


-- =================================================================================
-- PARTE 2 — AUSÊNCIA SÓ DO HISTÓRICO: catraca, não afrouxamento
--
-- Mesmo padrão de `reg_aula_ue_so_nula_no_historico` (autorizado em 08/09/2026): a
-- coluna aceita nulo APENAS na linha vinda da v2.0 que ninguém editou. Linha nova
-- exige desde o primeiro INSERT; editar a linha migrada reativa a exigência.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 6. `registros_aula.tempos_consumidos`  (52 de 1.566)
--
-- Os 52 são, sem exceção, `conteudo_resumo = 'ESTUDO INDIVIDUAL'`. E o Estudo
-- Individual **fica fora da soma do CHT** (BRIEF §Vocabulário: "CHT = CHD + AEC +
-- TAD + TR. Estudo Individual fica fora da soma, controlado à parte"). Um registro
-- que não entra na soma não tem por que declarar tempo consumido.
--
-- ⚠️ POR QUE CATRACA E NÃO `drop not null` LIMPO: a leitura acima é boa mas é
--    INFERIDA de 52 linhas. Se ela estiver certa, a v2.1 deveria lançar Estudo
--    Individual como `atividades_nao_letivas`, não como `registros_aula` — e aí
--    nenhum registro NOVO precisará do nulo. A catraca deixa o histórico entrar sem
--    autorizar o padrão a continuar.
-- ---------------------------------------------------------------------------------
alter table public.registros_aula alter column tempos_consumidos drop not null;
alter table public.registros_aula add constraint reg_aula_tempos_so_nulo_no_historico
  check (
    tempos_consumidos is not null
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint reg_aula_tempos_so_nulo_no_historico on public.registros_aula is
  'Tempos consumidos so pode faltar na linha migrada da v2.0 ainda nao editada — sao '
  '52 lancamentos de ESTUDO INDIVIDUAL, que fica fora da soma do CHT. Registro novo '
  'exige o valor; editar a linha migrada reativa a exigencia.';

-- ---------------------------------------------------------------------------------
-- 7. `atividades_nao_letivas.tempos_consumidos`  (138 de 664)
--
-- 135 dos 138 são Estudo Individual (134 `Estudo Individual` + 1 `Monitoria`), pela
-- mesma razão do item 6. Os outros **3 não são**: 2 `TAD / Atividade
-- Administrativa` e 1 `AEC / Palestra-Colóquio`. Esses três são lacuna de digitação
-- de verdade, e entram por esta catraca junto com os 135 — mas ficam nomeados aqui e
-- listados na reconciliação, porque três lançamentos de TAD e AEC sem tempo afetam
-- o teto normativo de 5% e 10% (RN-DEG-02, que é ALERTA e não bloqueio).
-- ---------------------------------------------------------------------------------
alter table public.atividades_nao_letivas alter column tempos_consumidos drop not null;
alter table public.atividades_nao_letivas add constraint ativ_tempos_so_nulo_no_historico
  check (
    tempos_consumidos is not null
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint ativ_tempos_so_nulo_no_historico on public.atividades_nao_letivas is
  'Tempos consumidos so pode faltar na linha migrada da v2.0 ainda nao editada: 135 '
  'sao Estudo Individual (fora da soma do CHT) e 3 sao lacuna real (2 TAD, 1 AEC) — '
  'estas tres saem na reconciliacao porque afetam os tetos de 5% e 10%.';

-- ---------------------------------------------------------------------------------
-- 8. `instrutor_disciplina.disciplina_id`  (1 de 798)
--
-- `VIN-000419`, status **Inativo**. A própria v2.0 já esvaziou o `ID_Grade` e moveu
-- a referência para `ID_Grade_Legado_v1` = "40 - C-Ap-FR - XVII". Ou seja: a
-- quarentena da opção C, adotada em 08/09/2026 para `registros_aula`, **já tinha
-- sido feita à mão na v2.0** para esta linha. Descartá-la perderia o único vínculo
-- que registra que aquele instrutor um dia lecionou aquela disciplina.
-- ---------------------------------------------------------------------------------
alter table public.instrutor_disciplina alter column disciplina_id drop not null;
alter table public.instrutor_disciplina add constraint inst_disc_so_nula_no_historico
  check (
    disciplina_id is not null
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint inst_disc_so_nula_no_historico on public.instrutor_disciplina is
  'Vinculo sem disciplina so no historico migrado e nao editado: 1 linha (VIN-000419, '
  'Inativo) cuja referencia a v2.0 ja tinha movido para ID_Grade_Legado_v1. Vinculo '
  'novo exige a disciplina.';

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   alter table … alter column … set not null;   (as cinco da Parte 1)
--   alter table … drop constraint …;             (as três catracas)
--   alter table … alter column … set not null;   (as três colunas da Parte 2)
--
-- ⚠️ Depois da carga real TODAS falham, e é assim que deve ser: reverter exige antes
--    decidir o que fazer com as 313 linhas que só existem por causa delas.
-- =================================================================================
