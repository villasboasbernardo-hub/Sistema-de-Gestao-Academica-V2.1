# Feature Specification: Épico I — Simplificação do Módulo de Avaliações

**Feature Branch**: `003-simplificacao-avaliacoes`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Épico I do documento 06 — Simplificação do Módulo de Avaliações"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico I), `docs/fase-1/00-Visao-Geral-e-Escopo.md` (item 6.2, ponto 9), `docs/fase-1/08-Relatorio-de-Triagem-de-Comentarios.md` (Tema F, decisão D5), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (RN-AVAL-01 revisada, RN-AVAL-02 revisada v1.4, RN-EVT-03, RN-INST-01 delimitada), `docs/fase-1/02-Requisitos-Funcionais.md` (RF-AVAL-01 a 06), `docs/arquitetura/01-schema.md` (§4.4 `avaliacoes`, revisão v1.4).

## Clarifications

### Session 2026-08-14

- Q: Como o sistema decide o valor de `Status` (Pendente, Em andamento, Concluída, Atrasada ou
  Cancelada) de um lançamento na tabela `avaliacoes` — o Operador escolhe manualmente, ou o sistema
  calcula automaticamente a partir dos dados já lançados? → A: Automático (Opção B) — o sistema
  deriva a situação de execução dos dados já existentes, nunca escolhida manualmente pelo
  Operador (exceto `Cancelada`, exclusão lógica explícita). **Ver correção abaixo** — a premissa
  original desta resposta (que todo lançamento novo já nasce `Concluída`) estava errada.

- **Correção (2026-08-14, mesma sessão):** a resposta acima assumia que agendar uma avaliação já
  exige/grava `TA_Inicial`/`Tempos_Consumidos` (herdado do Épico E) — premissa incorreta. Bernardo
  esclareceu: **agendar uma avaliação (definir a data prevista) não consome tempo de aula**; o
  agendamento deve aparecer como sugestão/pré-preenchimento na prévia do Detalhe Semanal de Aula
  (DSA); o tempo de aula só é consumido quando a avaliação é **efetivamente registrada no DSA**
  (RN-AVAL-02 revisada v1.4, `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`). Isso reabre o
  mecanismo de derivação de `Status` — ver FR-007 (revisado) abaixo, e o novo `User Story 1`.
  A vista de prova **não** segue esse modelo de dois momentos — é registrada de uma vez, quando de
  fato acontece (nenhuma "agendamento de vista sem TA" foi pedida ou faz sentido no domínio: a
  vista é um evento único, revisado pelo fiscal depois da aplicação já ter ocorrido).

## Nota de escopo e dependência dos Épicos C e E

O Épico C já entregou a **camada de dado** completa desta feature: a tabela `avaliacoes` fundiu
agendamento e execução num único fato de dados (RN-AVAL-02 revisada — preenchido em dois momentos,
não simultâneo), com os campos `Status` (`Pendente`/`Em_andamento`/`Concluida`/`Atrasada`/
`Cancelada`) e `Status_Vista` (fórmula `Realizada`/`Atrasada`/`Pendente`), além de
`ID_Instrutor_Responsavel` (aplicador — exige habilitação, RN-INST-01) separado de
`ID_Fiscal`/`Nome_Fiscal_Externo` (fiscal — não exige habilitação, RN-INST-01 delimitada). O
catálogo `avaliacoes_planejadas` (118 itens) já existe como referência estática de comparação.

O Épico E já entregou um primeiro `registrarAvaliacao()` (`lib/acoes/avaliacoes.ts`), mas com
**dois problemas reais** que esta feature corrige: (1) exige `Tempos_Consumidos`/`TA_Inicial` já
na criação — contradiz RN-AVAL-02 revisada, que reserva esse consumo para o registro efetivo no
DSA; (2) **remove por completo** a checagem de habilitação do aplicador, sem distinguir aplicador
de fiscal. Esta feature corrige ambos e **acrescenta** a camada de aplicação que ainda não existe:
o mecanismo de agendamento sem consumo de TA + registro no DSA, o painel de acompanhamento por
situação de execução (RF-AVAL-02) e a sinalização automática de vista de prova atrasada
(RF-AVAL-03).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agendar avaliação sem consumir tempo de aula até ser aplicada no DSA (Priority: P1) 🎯 MVP

Como Operador, quero agendar a data prevista de uma avaliação sem que isso consuma tempo de aula,
e ver essa avaliação sugerida/pré-preenchida na prévia do Detalhe Semanal de Aula da semana
correspondente, para só confirmar o consumo de TA quando a aplicação realmente acontecer.

**Why this priority**: é a correção estrutural da qual todo o resto do épico depende — sem ela, o
próprio painel de situação de execução (User Story 2) não tem uma base de dados coerente para
classificar, porque hoje toda avaliação agendada já aparece como "aplicada" mesmo antes de
acontecer (RN-AVAL-02 revisada, corrige uma leitura errada do Épico E).

**Independent Test**: agendar uma avaliação para uma data futura e confirmar que nenhuma CHD sobe
e que ela aparece como sugestão na prévia do DSA daquela semana; depois, registrar a aplicação no
DSA (informando TA inicial e tempos consumidos) e confirmar que só a partir desse momento a CHD da
disciplina sobe.

**Acceptance Scenarios**:

1. **Given** uma disciplina de uma turma, **When** o Operador agenda uma avaliação informando só
   turma, disciplina, tipo e data prevista, **Then** o lançamento é criado sem exigir TA inicial
   nem tempos consumidos, e a CHD da disciplina não se altera.
2. **Given** uma avaliação agendada para uma data dentro da semana consultada, **When** o Operador
   abre a prévia do DSA daquela semana/turma, **Then** a avaliação aparece listada como sugestão
   de lançamento naquela data, sem ocupar nenhum TA específico ainda.
3. **Given** uma avaliação agendada, **When** o Operador registra a aplicação efetiva no DSA
   (informando TA inicial e tempos consumidos), **Then** a mesma linha já criada no agendamento é
   atualizada (nunca um segundo cadastro) e a CHD da disciplina sobe no mesmo ato.
4. **Given** uma vista de prova, **When** o Operador a registra, **Then** ela continua exigindo
   data, TA inicial e tempos consumidos de uma vez (não passa por uma fase de agendamento sem TA
   — diferente da aplicação da avaliação).

---

### User Story 2 - Acompanhar avaliações só pela situação de execução (Priority: P2)

Como Operador, quero acompanhar cada avaliação planejada apenas pela sua situação de execução
(Concluída, Em andamento, Pendente, Atrasada ou Sem correspondência), sem preencher ou depender
de uma fórmula de nota (`Formula_MF`) ou caráter eliminatório (`Carater`).

**Why this priority**: é a mudança central do épico do ponto de vista do usuário — sem ela, o
módulo de Avaliações continua modelando uma fórmula que "está numa lógica deturpada" (palavras do
responsável, documento 08, Tema F) e que nenhuma outra tela do sistema usa para decidir nada.
Depende da User Story 1 já existir, porque a situação de execução é derivada exatamente do
mecanismo de agendamento/aplicação que ela entrega.

**Independent Test**: Abrir o painel de avaliações de um curso com pelo menos uma avaliação
planejada sem lançamento correspondente, uma agendada para o futuro, uma agendada para uma data já
passada sem aplicação registrada, e uma já aplicada no DSA; confirmar que cada uma aparece com a
situação correta e que nenhum campo de nota ou caráter eliminatório é exibido ou exigido em
nenhuma etapa.

**Acceptance Scenarios**:

1. **Given** o catálogo `avaliacoes_planejadas` de um curso, **When** o Operador abre o painel de
   acompanhamento, **Then** cada item planejado aparece com exatamente uma situação de execução
   entre Concluída, Em andamento, Pendente, Atrasada ou Sem correspondência.
2. **Given** uma avaliação planejada sem nenhum lançamento cujo nome normalizado corresponda a
   ela, **When** o painel é montado, **Then** ela aparece marcada como "Sem correspondência",
   nunca oculta ou descartada da lista.
3. **Given** uma avaliação já lançada, **When** o Operador exclui (logicamente) o agendamento,
   **Then** a mudança é refletida no painel sem exigir preenchimento de `Formula_MF` ou `Carater`
   em nenhum momento do fluxo — a situação de execução em si nunca é escolhida manualmente,
   apenas derivada pelo sistema (ver Clarifications).
4. **Given** qualquer tela do módulo de Avaliações, **When** o Operador a percorre inteira,
   **Then** não há campo, coluna ou validação relacionada a fórmula de média final ou caráter
   eliminatório.

---

### User Story 3 - Sinalizar automaticamente vista de prova atrasada (Priority: P3)

Como Operador, quero que o sistema sinalize automaticamente quando uma vista de prova ultrapassar
7 dias corridos sem ter sido registrada como realizada, para identificar pendências sem precisar
calcular prazos manualmente turma a turma.

**Why this priority**: É a regra normativa mais citada pelo responsável neste tema (documento 08,
Tema F) e a única com um limite objetivo e verificável a partir dos próprios dados do sistema —
mas depende do painel da User Story 2 já existir para ter onde aparecer.

**Independent Test**: Lançar uma avaliação aplicada no DSA há mais de 7 dias corridos e sem
`Data_Vista_Prova` preenchida; confirmar que ela aparece sinalizada como Atrasada no painel sem
nenhuma ação manual do usuário, e que uma vista registrada dentro do prazo nunca aparece assim
sinalizada.

**Acceptance Scenarios**:

1. **Given** uma avaliação aplicada há mais de 7 dias corridos sem `Data_Vista_Prova`
   preenchida, **When** o painel é aberto, **Then** ela aparece com situação "Atrasada", sem
   exigir que algum usuário a marque manualmente.
2. **Given** uma avaliação aplicada há 7 dias corridos ou menos, **When** o painel é aberto,
   **Then** ela não aparece como Atrasada, mesmo sem `Data_Vista_Prova` preenchida ainda.
3. **Given** uma vista de prova registrada como realizada (com `Data_Vista_Prova` preenchida),
   **When** o painel é reaberto em qualquer data posterior, **Then** ela nunca volta a aparecer
   como Atrasada.
4. **Given** o mesmo curso consultado em duas datas diferentes sem nenhum lançamento novo,
   **When** o painel é reaberto na segunda data, **Then** a sinalização de atraso reflete a
   contagem de dias corridos até a data atual (recalculada, não um valor congelado no primeiro
   acesso).

---

### User Story 4 - Registrar qualquer pessoa como fiscal da vista de prova (Priority: P4)

Como Operador, quero que qualquer fiscal — não apenas um instrutor habilitado na disciplina —
possa ser registrado como responsável pela vista de prova, porque o Oficial Fiscal é designado
pela OM e não precisa ser docente nem habilitado na disciplina (RN-INST-01 delimitada).

**Why this priority**: É a história de menor risco e menor volume de uso das quatro — corrige uma
trava indevida, mas não bloqueia nenhuma operação hoje se ficar para o final. Independente das
demais no backend; só reaproveita a mesma tela no frontend por conveniência.

**Independent Test**: Registrar a vista de prova de uma avaliação já aplicada usando (a) um
instrutor habilitado na disciplina, (b) um instrutor cadastrado mas **não** habilitado na
disciplina, e (c) uma pessoa sem nenhum cadastro de instrutor; confirmar que as três são aceitas
sem erro de habilitação, e que tentar o mesmo instrutor não habilitado como **aplicador** (não
como fiscal) continua sendo bloqueado.

**Acceptance Scenarios**:

1. **Given** um instrutor cadastrado mas sem vínculo de habilitação na disciplina da avaliação,
   **When** o Operador o registra como fiscal da vista de prova, **Then** o registro é aceito sem
   nenhuma mensagem de erro de habilitação.
2. **Given** uma pessoa sem nenhum cadastro na aba de instrutores, **When** o Operador informa seu
   nome como fiscal da vista, **Then** o registro é aceito normalmente.
3. **Given** um instrutor sem vínculo de habilitação na disciplina, **When** o Operador tenta
   registrá-lo como **instrutor responsável pela aplicação** (não como fiscal) da avaliação,
   **Then** o sistema bloqueia com a mensagem de erro específica de habilitação (RN-INST-01).

---

### Edge Cases

- Avaliação planejada com múltiplos lançamentos cujo nome normalizado corresponde a ela (ex.:
  reaplicação/recuperação): cada lançamento é avaliado e exibido individualmente; a planejada não
  "trava" em Sem correspondência se ao menos um lançamento casar.
- Vista de prova registrada numa data anterior à data de aplicação da avaliação: tratada como
  inconsistência de lançamento, não como cálculo de prazo — fora do escopo desta feature validar
  ordem cronológica entre os dois campos.
- Fiscal informado como pessoa externa (`Nome_Fiscal_Externo`) e como instrutor cadastrado
  (`ID_Fiscal`) ao mesmo tempo: os dois campos são mutuamente exclusivos (já assim no schema);
  o sistema aceita apenas um dos dois por lançamento.
- Curso sem nenhuma avaliação planejada no catálogo: o painel abre vazio, sem erro, seguindo o
  princípio geral de degradação segura (RN-DEG-01).
- Avaliação cancelada (`Status = Cancelada`): não conta como Pendente nem Atrasada; aparece
  identificada separadamente no painel, sem gerar sinalização de atraso.
- Avaliação agendada cuja data prevista já passou sem registro de aplicação no DSA: aparece como
  "Atrasada" no painel (situação da própria avaliação, distinta da "Atrasada" de vista de prova,
  que só se aplica depois que a avaliação já foi aplicada) — nenhuma ação automática além da
  sinalização, o lançamento continua podendo ser aplicado a qualquer momento.
- Avaliação agendada cuja data prevista é hoje, ainda sem aplicação no DSA: situação "Em
  andamento".
- Lançamento migrado com dado de aplicação incompleto (`Conciliacao_Migracao = Sem_Execucao`):
  tratado exatamente como uma avaliação agendada e não aplicada — mesma classificação por data,
  sem tratamento especial adicional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Agendar uma avaliação DEVE gravar apenas turma, disciplina, tipo e data prevista de
  aplicação — sem exigir nem gravar tempos de aula consumidos (RN-AVAL-02 revisada).
- **FR-002**: Uma avaliação agendada DEVE aparecer como sugestão/pré-preenchimento na prévia do
  Detalhe Semanal de Aula (DSA) da turma e semana correspondentes à sua data prevista, antes de
  qualquer TA ser efetivamente atribuído a ela.
- **FR-003**: Registrar a aplicação efetiva de uma avaliação no DSA (TA inicial e tempos
  consumidos) DEVE atualizar o mesmo lançamento já criado no agendamento — nunca criar um segundo
  cadastro (RN-AVAL-02 revisada) — e é o único momento em que a avaliação passa a consumir tempo
  de aula e contar para a CHD da disciplina (RN-EVT-03).
- **FR-004**: O sistema DEVE apresentar, por curso, um painel comparando as avaliações planejadas
  do catálogo oficial (`avaliacoes_planejadas`) contra as avaliações efetivamente
  agendadas/aplicadas, classificando cada item por situação de execução: Concluída, Em
  andamento, Pendente, Atrasada ou Sem correspondência.
- **FR-005**: O casamento entre avaliação planejada e avaliação agendada DEVE ocorrer por nome
  normalizado (maiúsculas, sem acento, tolerante a abreviação em qualquer direção), nunca por um
  identificador rígido 1:1.
- **FR-006**: Uma avaliação planejada sem lançamento correspondente encontrado DEVE aparecer no
  painel como "Sem correspondência", nunca oculta ou descartada.
- **FR-007**: A situação de execução de um lançamento DEVE ser derivada automaticamente pelo
  sistema, nunca escolhida manualmente pelo Operador — exceto `Cancelada`, ação manual explícita
  que funciona como exclusão lógica do agendamento. Derivação: TA inicial/tempos consumidos
  preenchidos (aplicada no DSA, FR-003) → `Concluída`; ainda não aplicada e a data prevista é hoje
  → `Em andamento`; ainda não aplicada e a data prevista já passou → `Atrasada`; ainda não
  aplicada e a data prevista está no futuro → `Pendente`.
- **FR-008**: Nenhuma tela do sistema DEVE exibir, calcular ou exigir preenchimento de
  `Formula_MF` (fórmula de média final) ou `Carater` (caráter eliminatório).
- **FR-009**: O sistema DEVE sinalizar automaticamente como "Atrasada" qualquer vista de prova que
  ultrapasse 7 dias corridos após a data de aplicação da avaliação sem ter sido registrada como
  realizada, sem exigir nenhuma ação manual do usuário para essa sinalização.
- **FR-010**: A sinalização de atraso de vista DEVE ser recalculada a cada consulta com base na
  data atual, nunca um valor congelado no momento do lançamento.
- **FR-011**: O sistema DEVE permitir registrar qualquer pessoa como fiscal responsável pela vista
  de prova de uma avaliação, incluindo alguém que não conste do cadastro de instrutores.
- **FR-012**: O sistema NÃO DEVE exigir vínculo de habilitação instrutor↔disciplina para o papel
  de fiscal da vista de prova, mesmo quando o fiscal escolhido é um instrutor cadastrado.
- **FR-013**: O sistema DEVE continuar exigindo vínculo de habilitação instrutor↔disciplina para o
  instrutor responsável pela **aplicação** da avaliação — papel distinto do fiscal (RN-INST-01).
- **FR-014**: A vista de prova, ao ser registrada, DEVE gravar data, TA inicial, tempos consumidos
  e fiscal de uma vez só — não passa por uma fase de agendamento sem consumo de TA como a
  aplicação da avaliação (FR-001/FR-003); consome tempo de aula e conta para a CHD no mesmo ato do
  registro.

### Key Entities

- **Avaliação planejada**: item do catálogo estático `avaliacoes_planejadas`, usado apenas como
  referência de comparação — nunca a fonte de execução real.
- **Avaliação (lançamento)**: fato único de agendamento e aplicação na tabela `avaliacoes`,
  preenchido em dois momentos possíveis — agendamento (turma, disciplina, tipo, data prevista) e
  aplicação no DSA (TA inicial, tempos consumidos, instrutor responsável) —, mais um bloco de
  vista de prova (data, TA inicial, tempos consumidos, fiscal), registrado de uma vez quando
  acontece.
- **Situação de execução**: atributo central desta feature — Concluída, Em andamento, Pendente,
  Atrasada ou Sem correspondência — substitui `Formula_MF`/`Carater` como sinal de
  acompanhamento de uma avaliação. Sempre derivada automaticamente pelo sistema a partir da
  presença de TA inicial/tempos consumidos e da comparação entre a data prevista e a data atual
  (FR-007); `Sem correspondência` é um estado do painel (item planejado sem lançamento), não um
  valor da coluna `Status`; `Cancelada` é a única transição manual (exclusão lógica).
- **Fiscal da vista de prova**: pessoa responsável pela vista, podendo ser um instrutor
  habilitado, um instrutor cadastrado mas não habilitado na disciplina, ou alguém sem nenhum
  cadastro de instrutor — papel distinto do instrutor responsável pela aplicação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agendar uma avaliação nunca altera a CHD de nenhuma disciplina; a CHD só sobe quando
  a aplicação é registrada no DSA.
- **SC-002**: Toda avaliação agendada para uma semana aparece como sugestão na prévia do DSA
  daquela semana antes de ser aplicada.
- **SC-003**: O Operador consegue ver a situação de execução de qualquer avaliação planejada de
  um curso numa única tela, sem preencher nenhum campo de fórmula de nota.
- **SC-004**: 100% das vistas de prova que ultrapassam 7 dias corridos sem registro de realização
  aparecem sinalizadas como Atrasada automaticamente, sem qualquer ação manual do usuário.
- **SC-005**: Uma pessoa sem cadastro de instrutor pode ser registrada como fiscal responsável
  pela vista de prova em 100% das tentativas, sem nenhuma mensagem de erro de habilitação.
- **SC-006**: Nenhuma tela do módulo de Avaliações exibe ou exige preenchimento de fórmula de
  média final ou caráter eliminatório.

## Assumptions

- A camada de dado (schema `avaliacoes` com `Status`, `Status_Vista`, `ID_Instrutor_Responsavel`,
  `ID_Fiscal`, `Nome_Fiscal_Externo`, e o catálogo `avaliacoes_planejadas`) já foi entregue pelo
  Épico C — esta feature entrega a camada de aplicação sobre esse dado, como o Épico E fez para
  atividades extraclasse.
- `Formula_MF`/`Carater` permanecem fisicamente no schema como legado informativo (achado k,
  Épico C, `docs/arquitetura/01-schema.md` §6.7) — esta feature garante apenas que nenhuma tela os
  interprete funcionalmente, não que sejam removidos do schema.
- O prazo de 7 dias corridos da vista de prova é contado a partir de `Data_Avaliacao` (data de
  aplicação), não da data em que o registro foi lançado no sistema.
- A sinalização "Atrasada" da avaliação em si (FR-007, distinta da vista) não tem prazo de graça —
  qualquer dia após a data prevista sem aplicação registrada já classifica como Atrasada. Decisão
  tomada durante o planejamento (não coletada via `/speckit-clarify` formal) por não haver
  referência normativa de um prazo de graça para a aplicação em si, ao contrário da vista de prova
  (que tem os 7 dias corridos explícitos em RN-AVAL-01); ajustável sem custo caso o responsável
  prefira outro critério.
- A prévia do DSA entregue por esta feature é uma lista de sugestões (avaliações agendadas na
  semana, ainda sem TA), não a grade completa por TA com posicionamento visual — essa grade e
  qualquer motor de sugestão automática de posicionamento continuam sendo escopo do Épico H,
  mesmo limite já registrado em `lib/acoes/dsa.ts` pelo Épico E.
- `registrarAvaliacao()` do Épico E (`lib/acoes/avaliacoes.ts`) é estendida, não reescrita do
  zero, mas seu contrato muda: `Tempos_Consumidos`/`TA_Inicial` deixam de ser aceitos/exigidos
  nela (passam a pertencer à nova função de aplicação no DSA); a validação de habilitação e os
  campos de fiscal são corrigidos/adicionados em funções separadas.
