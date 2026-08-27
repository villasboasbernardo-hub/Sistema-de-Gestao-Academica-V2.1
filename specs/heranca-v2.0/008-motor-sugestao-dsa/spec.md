# Feature Specification: Épico H — Motor de Sugestão Automática do Detalhe Semanal de Aula

**Feature Branch**: `008-motor-sugestao-dsa`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Épico H do documento 06 — Motor de Sugestão Automática do DSA"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico H), `docs/fase-1/02-Requisitos-Funcionais.md`
(RF-DSA-01 a 08.1, RF-INSTR-06/06.1, RF-HOR-06), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
(RN-DIST-01 a 03, RN-CONF-01, RN-2027-05), `docs/fase-1/09-Relatorio-de-Auditoria-Fase-1.md`
(achado sobre restrições de técnica de ensino, A-7, rejeitado), `docs/arquitetura/01-schema.md`
(§4.3 `horarios_tempos_aula`, §4.6 `responsaveis_curso`, §6.1), `lib/acoes/dsa.ts`,
`lib/acoes/`lib/acoes/cronograma.ts`` (`distribuicaoSemanalMateria_`), `lib/dominio/motor-preditivo.ts`
(`escolherInstrutor_`, `lerPesosPrioridadeDisciplina_`), `tests/unidade/pendentes.test.ts`
(stub "Pendentes - Epico C/DSA"), `.specify/memory/constitution.md`.

## Clarifications

### Session 2026-08-15

- Q: Quando um lançamento manual ou movido por arrastar-e-soltar de uma disciplina de TFM
  ultrapassaria o teto de 6 tempos/semana, o sistema deve recusar a gravação ou só sinalizar
  visualmente? → A: Opção A — bloqueio rígido: a gravação é recusada com mensagem de erro clara
  quando ultrapassaria o teto de TFM naquela semana; distingue-se do padrão "Aviso Nível 2"
  (nunca bloqueia) usado pelos demais tetos normativos do sistema, porque RN-DIST-03 já marca o
  teto de TFM como "rígido" — nunca ultrapassável — em contraste explícito com o teto "recomendado"
  das demais disciplinas.

## Nota de escopo — decisão de 2026-08-15 e o que já existe vs. o que falta construir

Verificado antes de escrever esta spec, para não repetir trabalho já feito nem inventar escopo que
não existe:

1. **Decisão de escopo confirmada com Bernardo (2026-08-15).** O texto do Épico H no documento 06
   descreve só o motor de sugestão (RF-DSA-08/08.1). Mas comentários já deixados no código durante
   os Épicos E/I (`lib/acoes/dsa.ts`, `app/(app)/turmas/[turma]/dsa/page.tsx`) prometem explicitamente a este épico, pelo nome, três
   outras entregas que nenhum outro épico do documento 06 reivindica: a grade semanal completa por
   Tempo de Aula — RF-DSA-03 —, a detecção de conflito — RF-DSA-04/RN-CONF-01, **Risco Alto**,
   `test.todo` aberto desde o Épico C — e a impressão do DSA — RF-DSA-06. Bernardo confirmou incluir
   as quatro entregas (RF-DSA-03/04/06/07 + RF-DSA-08/08.1) neste único épico, em vez de deixar
   RF-DSA-03/04/06/07 como lacuna para um épico futuro ainda não sequenciado.
2. **`lib/acoes/dsa.ts` hoje só devolve totalizadores e a sugestão de avaliações pendentes** — `getDsaSemanal`
   é explicitamente "a versão parcial desta feature" (comentário do próprio arquivo). Não existe
   grade posicional por TA, não existe verificação de conflito, não existe impressão. É todo o
   trabalho real deste épico.
3. **Achado novo, descoberto ao redigir esta spec: não existe hoje nenhuma função de lançamento
   manual de "Aula"** (a categoria normativa que compõe a CHD vinculada a disciplina/instrutor —
   RF-DSA-01). `lib/acoes/aulas.ts` só cobre AEC/TAD/TR/Estudo Individual (`registrarEventoExtracurricular`);
   `lib/acoes/avaliacoes.ts` cobre a categoria Avaliação/Vista de Prova. `registros_aula` já é
   **lido** por `lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts` (`Categoria_Normativa='Aula'`), mas nenhum arquivo o
   **escreve**. Este épico precisa criar essa função — sem ela, a grade semanal (US1) não tem como
   registrar um bloco de Aula, manual ou aceito a partir da sugestão.
4. **A base de horários (`horarios_tempos_aula`) já foi reconstruída no Épico C** — não é escopo
   desta spec. `01-schema.md` §4.3/§6.1 documenta a reconstrução completa (despivotada, chaves
   órfãs `D`/`E` corrigidas, intervalos corrompidos normalizados, horários de relógio recalculados)
   e afirma textualmente: "a correção não altera nenhum número histórico; ela apenas passa a tornar
   o DSA capaz de exibir horários reais (RF-HOR-06)" — ou seja, a leitura desses horários por este
   épico é trabalho novo, mas os dados já existem corretos na banco de produção.
5. **A distribuição semanal de carga horária é uma função única já existente** —
   `distribuicaoSemanalMateria_` (`lib/acoes/cronograma.ts`, RN-DIST-01/02/03) — e o motor de sugestão deste
   épico DEVE reaproveitá-la para saber quanto de cada disciplina falta alocar, nunca duplicar esse
   cálculo (mesma regra que impediu o Épico G de reimplementá-la; a Assumption do Épico G já previa
   este consumidor: "ex.: prévia semanal do DSA, Épico H").
6. **A escolha de instrutor entre habilitados por carga/regime também é lógica já existente** —
   `escolherInstrutor_`/`faixaRegimeInstrutor_` (`lib/dominio/motor-preditivo.ts`, RN-2027-06) resolve o mesmo
   problema (menor carga já alocada, respeitando a faixa do regime) para o motor preditivo anual;
   este épico adapta o mesmo critério para a granularidade semanal real, sem duplicar a lógica de
   faixa de regime.
7. **O peso manual de prioridade por disciplina já existe** (`config_parametros`, chave
   `PRIORIDADE_DISCIPLINA_{ID_Grade}`, `lerPesosPrioridadeDisciplina_`, entregue no Épico G/RF-CRONOS-08)
   e é o mesmo mecanismo citado pela história de alto nível do Épico H ("considerando prioridade de
   matéria") — este épico reaproveita esse dado, não cria um segundo cadastro de prioridade.
8. **Fatiamento obrigatório do motor de sugestão preservado do documento 02, RF-DSA-08.1**: (i)
   primeira versão simples e determinística, respeitando só os limites rígidos já existentes
   (RN-DIST-03) e o critério de prioridade automático/manual já existente (RN-2027-05 + peso
   manual); (ii) validação obrigatória contra pelo menos uma semana real já lançada manualmente
   (referência: CAHO, citação explícita do próprio RF-DSA-08.1 — uma comparação pontual de um caso
   real, **não** o "golden master" descartado na decisão de 2026-08-10 sobre não regressão
   sistêmica); (iii) qualquer sofisticação adicional (preferência semanal de instrutor,
   priorização configurável além do peso já existente) só prossegue **depois** que a taxa de
   aproveitamento da sugestão simples for medida e considerada satisfatória — **fora do escopo
   desta spec**, é trabalho futuro condicionado ao resultado da validação.
9. **Restrições de sequenciamento de técnica de ensino (achado A-7, documento 09) permanecem
   explicitamente rejeitadas** — não entram em nenhuma parte desta spec, mesmo que o campo
   `Metodologia` já exista e esteja sem uso (achado citado na auditoria como oportunidade não
   aproveitada). Bernardo rejeitou essa restrição; não é reaberta aqui.
10. **A grade de preferência/restrição de instrutor por dia×período (RF-INSTR-06/06.1) não existe
    em nenhum lugar do schema ou do código V2.0** — não foi construída em nenhum épico anterior
    (F entregou cadastro mínimo de instrutor + vínculo de habilitação, sem grade de horário). Como
    o item 8(i) acima já limita a primeira versão do motor aos limites rígidos (RN-DIST-03), sem
    exigir preferência de instrutor, essa lacuna **não bloqueia** este épico — fica registrada como
    Assumption, pré-requisito de uma sofisticação futura condicionada (item 8(iii)), não deste.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a semana inteira numa grade por Tempo de Aula (Priority: P1) 🎯 MVP

Como qualquer usuário autorizado, quero ver o Detalhe Semanal de Aula de uma turma como uma grade
por dia × Tempo de Aula, com o horário de início/término de cada TA, a disciplina/atividade e o
instrutor de cada bloco lançado (Aula, Avaliação/Vista de Prova, AEC/TAD/TR/Estudo Individual), e a
sala indicada uma vez por cabeçalho de dia — em vez de só uma lista de totalizadores sem posição no
tempo.

**Why this priority**: é o alicerce de tudo que este épico entrega — a sugestão (US3) não tem onde
se posicionar, a detecção de conflito (US2) não tem o que comparar, e a impressão (US5) não tem o
que imprimir, sem esta grade existir primeiro.

**Independent Test**: abrir o DSA de uma turma com lançamentos reais na semana, confirmar que cada
bloco aparece na célula certa (dia × TA), com horário de início/término reais (não um TA genérico
sem hora), e que um lançamento sem `TA_Inicial` (histórico migrado) aparece numa faixa de rodapé do
dia em vez de quebrar a grade (RN-DEG-01).

**Acceptance Scenarios**:

1. **Given** uma turma com aulas, avaliações e eventos extraclasse lançados numa semana, **When** o
   usuário abre o DSA daquela semana, **Then** cada lançamento aparece na célula dia×TA
   correspondente, com o horário real de início/término do TA (via `horarios_tempos_aula`) e o nome
   do instrutor.
2. **Given** uma turma cujo curso não tem `ID_Config_Horario` (curso EAD puro), **When** o usuário
   abre o DSA, **Then** o sistema degrada para uma lista sem coluna de horário de TA, nunca falha
   (RN-DEG-01).
3. **Given** a grade aberta, **When** o usuário lança manualmente um bloco de Aula (disciplina,
   instrutor habilitado, TA inicial, tempos consumidos, metodologia, conteúdo — RF-DSA-01), **Then**
   o bloco é gravado em `registros_aula` com `Categoria_Normativa='Aula'` e aparece
   imediatamente na célula correta da grade, compondo a CHD da disciplina.
4. **Given** um lançamento histórico migrado sem `TA_Inicial`/`Local`, **When** a grade é montada,
   **Then** ele aparece numa faixa de rodapé do dia, sem posição de TA definida, sem quebrar a
   exibição dos demais blocos.
5. **Given** a grade de uma semana, **When** o usuário navega para a semana anterior/próxima,
   **Then** a grade recarrega para a nova semana mantendo a mesma turma selecionada.

---

### User Story 2 - Sinalizar conflito de instrutor/sala em qualquer turma do sistema (Priority: P1)

Como qualquer usuário autorizado, quero que a grade sinalize automaticamente quando o mesmo
instrutor estiver alocado, no mesmo dia e em Tempos de Aula sobrepostos, em **qualquer turma do
sistema** — não só na turma que estou vendo — para não descobrir um choque de agenda tarde demais.

**Why this priority**: RN-CONF-01 é Risco Alto e está sem nenhuma cobertura de teste desde o Épico
C (`test.todo` nomeado, ainda aberto) — é a regra de maior risco isolado que este épico fecha.

**Independent Test**: lançar o mesmo instrutor em TAs sobrepostos em duas turmas diferentes no mesmo
dia, abrir a grade de qualquer uma das duas turmas, e confirmar que o conflito aparece sinalizado
como alerta primário; repetir o cenário só com sala repetida (instrutores diferentes) e confirmar que
aparece como alerta secundário.

**Acceptance Scenarios**:

1. **Given** um instrutor lançado em TAs sobrepostos no mesmo dia em duas turmas diferentes,
   **When** a grade de qualquer uma das turmas é aberta, **Then** ambos os blocos aparecem
   sinalizados como conflito de instrutor — alerta primário — mesmo que a turma aberta só contenha
   um dos dois lançamentos.
2. **Given** duas turmas de cursos diferentes usando a mesma sala no mesmo dia/TA, com instrutores
   diferentes, **When** a grade é aberta, **Then** o conflito de sala aparece sinalizado como alerta
   secundário, distinto visualmente do conflito de instrutor.
3. **Given** dois blocos do mesmo instrutor no mesmo dia mas em TAs que não se sobrepõem, **When** a
   grade é montada, **Then** nenhum conflito é sinalizado.
4. **Given** um conflito de instrutor detectado, **When** o usuário consulta a grade, **Then** a
   verificação é feita em memória a partir dos lançamentos existentes, nunca por uma tabela de
   conflitos persistida (preserva o comportamento já documentado em RN-CONF-01).

---

### User Story 3 - Prévia semanal simples e determinística do DSA (Priority: P1)

Como Operador, quero que o sistema me proponha uma prévia semanal do DSA, preenchendo os espaços
livres da grade com as disciplinas mais "apertadas" (maior carga restante por dia útil restante),
respeitando os limites diário/semanal já existentes, para reduzir o esforço de montar a semana do
zero — sem que a sugestão nunca me impeça de lançar manualmente algo diferente.

**Why this priority**: é o problema original que o Épico H existe para resolver (documento 06) — o
lançamento semanal hoje é inteiramente manual, sem nenhuma prévia.

**Independent Test**: gerar a prévia de uma semana de uma turma real com disciplinas em andamento,
confirmar que os espaços livres são preenchidos respeitando o teto rígido de TFM (6/semana), o
máximo de 4 disciplinas distintas por dia e 4 tempos da mesma disciplina por dia (RN-2027-05),
aceitar um bloco sugerido (vira lançamento real) e confirmar que lançar manualmente algo diferente
do sugerido continua funcionando sem nenhuma trava.

**Acceptance Scenarios**:

1. **Given** uma turma com disciplinas ativas e espaços livres na semana corrente, **When** o
   Operador solicita a prévia, **Then** o sistema propõe blocos para os espaços livres, priorizando
   a disciplina com maior carga restante por dia útil restante (RN-2027-05), ajustada pelo peso
   manual de prioridade quando configurado (`PRIORIDADE_DISCIPLINA_{ID_Grade}`, já existente do
   Épico G) — reaproveitando `distribuicaoSemanalMateria_` para saber quanto falta de cada
   disciplina, nunca recalculando isso de outra forma.
2. **Given** uma disciplina de TFM, **When** a prévia é gerada, **Then** nunca ultrapassa 6 tempos
   na semana; **given** uma disciplina de fim de curso (LHFC/"fim de curso"), **When** a prévia é
   gerada, **Then** não tem teto; **given** as demais disciplinas, **When** a prévia é gerada,
   **Then** respeita 25 tempos/semana como recomendação, podendo ultrapassar só quando a janela for
   curta demais (RN-DIST-03).
3. **Given** uma prévia gerada, **When** o Operador aceita um bloco sugerido, **Then** o sistema
   grava o lançamento real usando a mesma função de gravação do lançamento manual de Aula (US1),
   nunca um caminho de escrita paralelo.
4. **Given** uma prévia gerada, **When** o Operador ignora a sugestão e lança manualmente algo
   diferente na mesma célula, **Then** o lançamento manual é aceito normalmente, sem nenhum bloqueio
   por divergir da sugestão — a sugestão é uma ajuda, nunca uma trava (documento 06).
5. **Given** a escolha de instrutor para um bloco sugerido, **When** o motor decide, **Then**
   prioriza, entre habilitados/atribuídos, o de menor carga já alocada na semana, respeitando a
   faixa de horas do regime dele — mesmo critério de `escolherInstrutor_`/`faixaRegimeInstrutor_`
   (Épico G), adaptado à semana real em vez do ano simulado.
6. **Given** a geração da prévia, **When** nenhuma restrição de sequenciamento de técnica de ensino
   é avaliada, **Then** o comportamento é o esperado — essa restrição foi explicitamente rejeitada
   (achado A-7) e não faz parte desta versão.

---

### User Story 4 - Validar a sugestão simples contra uma semana real já lançada (Priority: P1)

Como Encarregado/Ajudante da Divisão de Administração Acadêmica, quero comparar o que o motor de
sugestão simples teria proposto contra o que o Operador de fato lançou manualmente numa semana real
já concluída de um curso, antes de qualquer investimento em sofisticação adicional do motor.

**Why this priority**: é um gate obrigatório do próprio RF-DSA-08.1 (revisão v1.3, recomendação
R-5) — a entrega da User Story 3 é considerada incompleta sem esta validação; não é um "extra"
opcional, é parte do mesmo fatiamento.

**Independent Test**: escolher uma semana já concluída de uma turma real com lançamentos manuais
existentes (referência sugerida: CAHO, citada pelo próprio RF-DSA-08.1), rodar a sugestão simples
para essa mesma semana ignorando os lançamentos reais, e produzir um relatório comparando bloco a
bloco o que foi sugerido contra o que foi de fato lançado.

**Acceptance Scenarios**:

1. **Given** uma turma e semana reais já com lançamentos manuais concluídos, **When** o Encarregado/
   Ajudante solicita a validação, **Then** o sistema gera a sugestão simples para aquela mesma
   semana (sem considerar os lançamentos reais como entrada) e apresenta lado a lado o sugerido e o
   realmente lançado, por dia e TA.
2. **Given** o relatório de comparação gerado, **When** ele é exibido, **Then** mostra quantos
   blocos coincidiram exatamente, quantos divergiram e em quê (disciplina diferente, instrutor
   diferente, TA diferente), sem calcular ou impor nenhuma taxa de aprovação/reprovação automática
   — a decisão de "satisfatório o suficiente" para prosseguir com sofisticação adicional é humana,
   feita por Bernardo fora desta spec (item 8(iii) da Nota de escopo).
3. **Given** a validação rodada para uma semana sem nenhum lançamento manual real (turma nunca
   iniciada), **When** o Encarregado/Ajudante tenta gerar o relatório, **Then** o sistema recusa com
   mensagem clara, em vez de comparar contra uma lista vazia como se fosse 100% de divergência.

---

### User Story 5 - Impressão do DSA em página única A4 paisagem (Priority: P2)

Como Operador, quero gerar uma versão para impressão do Detalhe Semanal de Aula de uma turma/semana
em uma única página A4 (paisagem), com cabeçalho, corpo e assinaturas dos responsáveis, para manter
o registro físico assinado semanalmente exigido pela rotina do CIAARA.

**Why this priority**: é uma saída derivada da grade (US1) — só é possível depois que a grade existe
— e não bloqueia o motor de sugestão (US3/US4), por isso prioridade menor que as três primeiras.

**Independent Test**: abrir a impressão de uma semana com lançamentos variados (aulas, avaliação,
AEC/TAD/TR, feriado) e confirmar que cabeçalho (curso, número da semana, período, efetivo), corpo
completo e as duas assinaturas (Encarregado da Divisão de Administração Acadêmica e Operador
responsável, via `responsaveis_curso`, já populada desde o Épico C) aparecem numa única página.

**Acceptance Scenarios**:

1. **Given** uma semana com lançamentos completos, **When** o usuário solicita a impressão, **Then**
   o layout renderiza em uma única página A4 paisagem, com todo o conteúdo hoje exigido: cabeçalho,
   corpo (data, disciplinas com horário, intervalos, almoço, atividades da semana, instrutores, tipo
   e método de avaliação quando houver), campo de observação e as duas assinaturas.
2. **Given** `responsaveis_curso` sem nenhum responsável vigente para a data da semana impressa,
   **When** a impressão é gerada, **Then** o campo de assinatura correspondente aparece em branco
   para preenchimento manual, sem falhar a impressão inteira (RN-DEG-01).

---

### User Story 6 - Excluir e reordenar lançamento diretamente na grade (Priority: P2)

Como Operador, quero excluir um lançamento diretamente pela grade semanal e mover um lançamento
entre horários ou entre dias por arrastar-e-soltar, sem precisar excluir e recriar o registro.

**Why this priority**: é uma melhoria de fluxo de edição sobre a grade já existente (US1) — reduz
esforço manual, mas o DSA já é operável sem ela (lançamento/edição direta continuam possíveis).

**Independent Test**: excluir um bloco pela grade e confirmar que ele some da grade e não conta mais
nos totalizadores; arrastar um bloco existente para outro TA/dia e confirmar que o mesmo registro é
atualizado (não duplicado), com os totalizadores recalculados.

**Acceptance Scenarios**:

1. **Given** um bloco lançado na grade, **When** o usuário aciona excluir diretamente na célula,
   **Then** o registro é removido (exclusão lógica, C-05) e a grade/totalizadores refletem a remoção
   imediatamente.
2. **Given** um bloco lançado na grade, **When** o usuário arrasta o bloco para outro TA ou outro
   dia, **Then** o mesmo `ID_Registro` é atualizado com a nova posição, nunca duplicado, e a
   verificação de conflito (US2) é reavaliada para a nova posição.

---

### Edge Cases

- Duas disciplinas concorrendo pelo mesmo espaço livre com o mesmo peso manual de prioridade (ou
  sem peso configurado): o critério automático (RN-2027-05) decide o desempate, mesmo comportamento
  já usado no motor preditivo anual.
- Semana sem nenhum espaço livre (grade já cheia por lançamentos manuais): a prévia não tem nada a
  sugerir para aquela semana — retorna vazio, nunca erro.
- Instrutor sem nenhum habilitado/atribuído disponível para uma disciplina no espaço livre: a
  sugestão sinaliza alerta explícito no bloco, nunca deixa de sugerir a disciplina por causa disso
  (mesmo padrão de `escolherInstrutor_`, que nunca deixa um bloco sem instrutor).
- Grade de uma turma cujo curso está no meio de uma mudança de regime de horário vigente (Épico G,
  `curso_regime_historico`): a grade e a sugestão usam o regime vigente na data de cada semana,
  nunca um regime fixo por curso.
- Lançamento de Aula sem instrutor habilitado na disciplina: bloqueado na gravação (RN-INST-01,
  preservada), diferente de Avaliação/Vista de Prova, cujo aplicador pode ser qualquer fiscal
  (RN-INST-01 delimitada, já entregue no Épico I) — Aula continua exigindo habilitação.
- Lançamento ou movimentação (arrastar-e-soltar) de um bloco de TFM que ultrapassaria 6 tempos na
  semana: gravação recusada com mensagem de erro clara, único teto normativo deste épico com
  bloqueio rígido em vez de aviso (Clarifications 2026-08-15, RN-DIST-03).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE apresentar o Detalhe Semanal de Aula de uma turma/semana como uma
  grade por dia × Tempo de Aula, mostrando disciplina (quando houver), conteúdo, instrutor e o
  horário real de início/término de cada TA (lido de `horarios_tempos_aula` via `ID_Config_Horario`
  do curso), com a sala indicada uma vez por cabeçalho de dia/semana, não repetida em cada bloco
  (RF-DSA-03).
- **FR-002**: O sistema DEVE prover uma função de lançamento manual de Aula (disciplina, instrutor
  habilitado — RN-INST-01 —, TA inicial, tempos consumidos, metodologia, conteúdo/resumo,
  observações), gravando em `registros_aula` com `Categoria_Normativa='Aula'` — função
  hoje inexistente em qualquer arquivo do backend V2.0 (RF-DSA-01, achado desta spec). Quando o
  lançamento pertencer a uma disciplina de TFM e ultrapassar o teto rígido de 6 tempos na semana
  (RN-DIST-03), a gravação DEVE ser recusada com mensagem de erro clara — diferente do padrão
  "Aviso Nível 2" (nunca bloqueia) usado pelos demais tetos normativos do sistema (Clarifications
  2026-08-15).
- **FR-003**: Quando um lançamento (histórico ou novo) não tiver `TA_Inicial`/`Local` definidos, o
  sistema DEVE exibi-lo numa faixa de rodapé do dia, sem posição de TA, nunca falhar a montagem da
  grade (RN-DEG-01).
- **FR-004**: O sistema DEVE sinalizar conflito de instrutor sempre que o mesmo instrutor estiver
  alocado, no mesmo dia e com Tempos de Aula sobrepostos, em **qualquer turma do sistema** — não só
  na turma sendo visualizada — como alerta primário; conflito de sala (duas turmas diferentes na
  mesma sala no mesmo horário) DEVE ser sinalizado como alerta secundário. O cálculo é feito em
  memória a partir dos lançamentos existentes, nunca por tabela de conflitos persistida (RF-DSA-04,
  RN-CONF-01, Risco Alto).
- **FR-005**: O sistema DEVE gerar uma prévia semanal simples e determinística do DSA de uma turma,
  preenchendo espaços livres da grade priorizando a disciplina com maior carga restante por dia útil
  restante (RN-2027-05), ajustada pelo peso manual de prioridade por disciplina quando configurado
  (`config_parametros`, chave `PRIORIDADE_DISCIPLINA_{ID_Grade}`, já existente), respeitando os
  limites diário/semanal já existentes: teto rígido de TFM (6 TA/semana), sem teto para disciplinas
  de fim de curso, 25 TA/semana recomendado para as demais, máximo de 4 disciplinas distintas por
  dia e máximo de 4 tempos da mesma disciplina por dia (RF-DSA-08, RF-DSA-08.1(i), RN-DIST-03,
  RN-2027-05).
- **FR-006**: A geração da prévia DEVE reaproveitar `distribuicaoSemanalMateria_` (RN-DIST-01) para
  determinar quanto de carga horária resta a cada disciplina, e a mesma lógica de escolha de
  instrutor por menor carga/faixa de regime já usada pelo motor preditivo anual (`escolherInstrutor_`/
  `faixaRegimeInstrutor_`, RN-2027-06, adaptada à semana real) — nenhuma segunda implementação
  desses dois cálculos pode existir em paralelo.
- **FR-007**: A prévia NUNCA DEVE impedir um lançamento manual divergente da sugestão — aceitar um
  bloco sugerido DEVE gravar o lançamento usando a mesma função do lançamento manual (FR-002), nunca
  um caminho de escrita paralelo (RF-DSA-08).
- **FR-008**: Nenhuma restrição de sequenciamento de técnica de ensino (intervalo obrigatório entre
  TA geminados, limite de TA consecutivos com a mesma técnica, mínimo de técnicas distintas em blocos
  longos) DEVE ser implementada nesta versão — explicitamente rejeitada (documento 09, achado A-7).
- **FR-009**: O sistema DEVE permitir validar a prévia simples contra pelo menos uma semana real já
  lançada manualmente de uma turma existente, gerando um relatório de comparação bloco a bloco
  (coincidência/divergência de disciplina, instrutor, TA), sem calcular nenhuma taxa de
  aprovação/reprovação automática — a decisão sobre prosseguir com sofisticação adicional do motor é
  humana e fica fora desta spec (RF-DSA-08.1(ii)/(iii)).
- **FR-010**: O sistema DEVE recusar a validação (FR-009) quando a turma/semana escolhida não tiver
  nenhum lançamento manual real, com mensagem clara, em vez de comparar contra uma lista vazia.
- **FR-011**: O sistema DEVE gerar uma versão para impressão do DSA em uma única página A4
  (paisagem), com cabeçalho (curso, número sequencial da semana, período, efetivo), corpo completo
  (data, disciplinas com horário, intervalos, almoço, atividades da semana, instrutores, tipo/método
  de avaliação quando houver), campo de observação e as assinaturas dos responsáveis do curso
  (`responsaveis_curso`, já populada desde o Épico C) — degradando para assinatura em branco quando
  não houver responsável vigente para a data, nunca falhando a impressão inteira (RF-DSA-06).
- **FR-012**: O sistema DEVE permitir excluir um lançamento diretamente pela grade semanal (exclusão
  lógica, C-05) e mover um lançamento entre horários/dias por arrastar-e-soltar, atualizando o mesmo
  registro em vez de duplicá-lo, reavaliando a detecção de conflito (FR-004) para a nova posição
  (RF-DSA-07). Mover um bloco de TFM para um dia/semana que ultrapassaria o teto rígido de 6
  tempos/semana DEVE ser recusado pelo mesmo motivo de FR-002 (RN-DIST-03, Clarifications
  2026-08-15).
- **FR-013**: A verificação de não regressão de qualquer função nova ou reaproveitada por este épico
  DEVE ser feita pela suíte de invariantes estruturais (`tests/`), incluindo a conversão do stub
  `test.todo` de RN-CONF-01 ("Pendentes - Epico C/DSA") em teste real — nunca por comparação de
  saída contra o curso CAHO 2026 como golden master (constitution, Princípio VI).

### Key Entities

- **`registros_aula`**: já existe (Épico C); ganha, neste épico, sua primeira função de
  escrita (`Categoria_Normativa='Aula'`) — hoje só lido por `lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`.
- **`horarios_tempos_aula`**: já existe e já foi reconstruída (Épico C); ganha, neste épico, sua
  primeira função de leitura em qualquer módulo do backend V2.0.
- **`responsaveis_curso`**: já existe e já está populada (Épico C); ganha, neste épico, sua primeira
  função de leitura para resolver as assinaturas da impressão.
- **`avaliacoes`**, **`atividades_nao_letivas`**: já existem e já são lidas pelo DSA parcial
  atual (Épicos E/I); passam a ser posicionadas na grade por TA (via `TA_Inicial`/`Local`, já
  existentes) e a entrar na verificação de conflito (FR-004).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário vê a semana inteira de uma turma numa única grade por dia×TA, com horário
  real de início/término de cada TA, em vez de uma lista de totalizadores sem posição no tempo.
- **SC-002**: A regra RN-CONF-01 (Risco Alto), sem cobertura de teste desde o Épico C, passa a ter
  teste real na suíte de invariantes, sem nenhuma regressão nos demais testes já existentes.
- **SC-003**: Uma prévia semanal gerada para uma turma real preenche os espaços livres respeitando
  os limites rígidos (TFM 6/semana, 4 disciplinas/dia, 4 tempos da mesma disciplina/dia), e um
  lançamento manual divergente da sugestão continua sendo aceito sem nenhum bloqueio.
- **SC-004**: A sugestão simples é validada contra pelo menos uma semana real já lançada
  manualmente, com um relatório de comparação bloco a bloco disponível para decisão humana sobre
  sofisticação futura.
- **SC-005**: O DSA de uma semana com lançamentos completos é impresso em uma única página A4
  paisagem, com as duas assinaturas resolvidas a partir de `responsaveis_curso`.

## Assumptions

- Decisão de escopo de 2026-08-15 (Bernardo, opção A): este épico inclui RF-DSA-03/04/06/07 além do
  motor de sugestão RF-DSA-08/08.1, por serem lacunas homônimas já prometidas ao "Épico H" pelo
  próprio código, sem nenhum outro épico do documento 06 reivindicá-las.
- A grade de preferência/restrição de instrutor por dia×período (RF-INSTR-06/06.1) **não existe**
  em nenhum lugar do schema ou código V2.0 e **não é construída nesta spec** — a primeira versão do
  motor de sugestão (RF-DSA-08.1(i)) usa só os limites rígidos já existentes (RN-DIST-03), sem
  depender de preferência de instrutor. Fica registrada como pré-requisito de uma sofisticação
  futura condicionada ao resultado de US4, não deste épico.
- A exceção pontual de preferência de instrutor válida só para uma semana (história de alto nível do
  documento 06) depende da grade de preferência acima existir primeiro — fica fora do escopo desta
  spec pelo mesmo motivo.
- Restrições de sequenciamento de técnica de ensino permanecem rejeitadas (achado A-7) — não
  reabertas por esta spec, mesmo que o campo `Metodologia` já exista sem uso.
- A validação da User Story 4 é uma comparação pontual contra um caso real (RF-DSA-08.1(ii)), não o
  "golden master" descartado na decisão de 2026-08-10 (`docs/arquitetura/01-schema.md` §6.7) — essa
  decisão continua valendo para não regressão sistêmica; esta é uma verificação dirigida, específica
  do motor de sugestão.
- O motor de sugestão deste épico opera sobre a semana real de uma turma existente, gravando
  diretamente em `registros_aula` quando um bloco é aceito — é conceitualmente distinto
  do motor preditivo anual do Épico G (`planejamento_anual`, versionado, ano futuro simulado), ainda
  que reaproveite parte da mesma lógica (FR-006).
