# Feature Specification: Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

**Feature Branch**: `037-filtros-status-grafico-disciplinas`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Filtros Avançados e Gráfico Proporcional (Módulo Disciplinas). Contexto Obrigatório: O módulo atual só filtra por Curso e Turma. Precisamos expandir os filtros para Instrutor e Status, além de enriquecer o dashboard de dados estatísticos com recursos visuais. Objetivo: Adicionar novos filtros em cascata, implementar a lógica dinâmica de Status da Disciplina e renderizar um gráfico de pizza da carga horária do curso. Escopo OBRIGATÓRIO de correção: (1) 3 novos selects — Instrutor (populado pelos instrutores alocados nas turmas filtradas), Status do Curso (Ativo/Cancelado/Planejado), Status da Disciplina (Não Iniciada/Em Andamento/Concluída) — cartões estatísticos reagem à combinação de todos; (2) lógica de Status da Disciplina calculada por data (Data Início/Término vs. hoje); (3) gráfico de pizza ( Charts/Recharts) da Carga Horária Prevista de cada disciplina em relação à Carga Horária Total do Curso, renderizado só quando um Curso é selecionado."

## Verificação de premissa (antes de qualquer requisito)

Confirmado por leitura direta de `app/(app)/disciplinas/page.tsx`, `lib/acoes/estatisticas.ts`,
`lib/acoes/`app/layout.tsx` + `lib/supabase/server.ts``, `lib/acoes/cronograma.ts`, `docs/arquitetura/01-schema.md` e do
`components/ciaara/`/`app/globals.css` antes de escrever este documento — o pedido original tinha 2 gaps
reais, mas 3 premissas erradas, discutidas diretamente com Bernardo antes de qualquer requisito:

1. **"Status do Curso" não bate com o schema real.** `cursos.Status` é binário
   (`Ativo`/`Inativo`) — não existe `Cancelado`/`Planejado` nesse campo. Os 3 valores do pedido
   batem, na verdade, com `turmas.Status`, só que esse campo tem **4** valores reais, com
   grafia diferente da pedida: `Planejada`, `Ativa`, `Concluida`, `Cancelada` (confirmado em
   `01-schema.md` linha 54 e já consumido por `getDisciplinasAnoVigente`, spec 035). **Decisão de
   Bernardo**: o filtro é de **Status da Turma** (não do Curso), sobre o domínio real de 4 valores.
   `AppState.ctx.turmas` já expõe `status` por turma desde o Épico 009 (``app/layout.tsx` + `lib/supabase/server.ts``) — sem
   nenhuma chamada nova ao backend.
2. **"Status da Disciplina" colide com um status que já existe.** `getEstatisticasDisciplinas`
   (`lib/acoes/estatisticas.ts`) e `getDisciplinasDaTurmaComRitmo`/`getDisciplinasAnoVigente`
   (`lib/acoes/cronograma.ts`) já calculam e exibem — no mesmo painel, no gráfico de rosca
   `graficoDisciplinasStatus` — um status com os **mesmos 3 rótulos** pedidos
   (`Não Iniciada`/`Em Andamento`/`Concluída`), só que **baseado em execução** (tempos
   efetivamente lançados em `registros_aula` contra a Carga Horária Total), não em
   comparação de datas contra hoje, como o pedido original descrevia. Implementar a lógica nova
   por data criaria 2 definições divergentes de "Concluída" na mesma tela (uma pelo filtro, outra
   pelo gráfico já existente), podendo mostrar contagens contraditórias para a mesma disciplina.
   **Decisão de Bernardo**: manter **apenas** a lógica já existente (execução), descartando por
   completo a proposta de cálculo por data do pedido original — nenhuma lógica nova de status é
   criada nesta spec.
3. **A biblioteca de gráficos pedida ( Charts/Recharts) já existe no projeto sob outro
   nome.** `Recharts` é a única biblioteca de gráficos do sistema desde o Épico 009
   (`app/globals.css`, CDN), com um helper único reaproveitado por todos os 4 painéis de
   estatística (`renderizarGrafico_`, `components/ciaara/`) que já suporta `tipo: 'pie'`/`'donut'`
   (usado, por exemplo, no gráfico "Índice de Capacitação Geral" do Módulo de Instrutores).
   Introduzir uma segunda biblioteca de gráficos duplicaria uma dependência já aprovada e
   testada. Esta spec usa `renderizarGrafico_(..., 'pie', ...)`, nunca uma biblioteca nova.

Achado adicional, sem relação com nenhuma das 3 correções acima (não fazia parte do pedido
original, mas passou a ser inevitável ao planejar a User Story 4 abaixo): `getEstatisticasDisciplinas`
(`lib/acoes/estatisticas.ts`) usa as datas cruas de `disciplinas` para o cálculo de **ritmo**
(`No Prazo`/`Atrasada`/`Adiantada`, conceito diferente de "status", não tocado pelos 3 filtros) em
vez do período efetivo por turma (`resolverPeriodoEfetivo_`, já usado em `lib/acoes/cronograma.ts` desde a
spec 033) — mesma classe de bug já corrigida em outro lugar, mas nunca aqui. Como os cartões
estatísticos precisam reagir aos novos filtros sem chamada de rede nova (FR-004), o cálculo migra
para o cliente durante o `/speckit-plan` — e nesse ponto, corrigir a fonte da data custa a mesma
linha de código que preservar o bug, então a correção entra como efeito colateral da migração (ver
`plan.md`/`research.md`), não como uma tarefa nova negociada à parte.

## Clarifications

### Session 2026-08-24

- Q: "Status do Curso (Ativo/Cancelado/Planejado)" não corresponde a nenhum campo real —
  `cursos.Status` é binário. O domínio de 3 valores citado bate com `turmas.Status`
  (4 valores reais: Planejada/Ativa/Concluida/Cancelada). O filtro deve ser sobre Status da Turma
  (domínio real de 4 valores) em vez de Status do Curso? → A: Sim — "status da turma", confirmado.
- Q: "Status da Disciplina" calculado por data colide com o status por execução já exibido no
  gráfico de rosca existente da mesma tela (mesmos 3 rótulos, definição diferente). Substituir a
  lógica existente pela nova (por data), manter as duas com nomes distintos, ou descartar a
  proposta de cálculo por data e reaproveitar só a lógica já existente? → A: Manter apenas a
  lógica atual que já existe — nenhum cálculo por data é implementado nesta spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filtrar por Status da Turma (Priority: P1)

Ao consultar a lista de disciplinas (estado inicial do ano vigente ou uma turma específica dentro
da cascata Curso→Turma), o usuário restringe a lista e os cartões estatísticos a turmas com um
status específico (Planejada, Ativa, Concluída ou Cancelada) — por exemplo, para ver só o que está
efetivamente em andamento, ignorando turmas já concluídas ou canceladas.

**Why this priority**: item obrigatório do pedido; filtro isolado, de baixo risco, sem depender de
nenhum outro filtro novo.

**Independent Test**: no estado inicial (nenhum Curso selecionado, disciplinas do ano vigente de
todos os cursos), selecionar "Ativa" no filtro de Status da Turma e conferir que só linhas de
turmas com `Status='Ativa'` permanecem visíveis, com os cartões estatísticos recalculados para
esse subconjunto.

**Acceptance Scenarios**:

1. **Given** a lista mostrando turmas de status variados, **When** o usuário seleciona um valor no
   filtro de Status da Turma, **Then** só as linhas de turmas com aquele status permanecem
   visíveis e os cartões estatísticos recalculam para o subconjunto filtrado.
2. **Given** um filtro de Status da Turma já aplicado, **When** o usuário limpa o filtro (opção
   "Todos"), **Then** a lista volta a mostrar turmas de qualquer status, respeitando a mesma regra
   de exclusão de `Cancelada` do estado inicial já existente (spec 035), a menos que o próprio
   filtro esteja explicitamente em "Cancelada".
3. **Given** nenhuma linha bate com o status selecionado, **When** o filtro é aplicado, **Then** a
   tabela mostra uma mensagem de "nenhuma disciplina" (mesmo padrão das mensagens de vazio já
   existentes), nunca uma tela quebrada ou em branco sem explicação.

---

### User Story 2 - Filtrar por Instrutor (Priority: P1)

O usuário filtra a lista de disciplinas por um instrutor específico, vendo só as disciplinas/turmas
às quais aquele instrutor está efetivamente alocado (`turma_disciplina.ID_Instrutor`) — útil para
conferir a carga de um instrutor específico sem precisar abrir o Módulo de Instrutores.

**Why this priority**: item obrigatório do pedido, mesmo nível de prioridade do filtro de status.

**Independent Test**: com uma turma selecionada com pelo menos 2 instrutores diferentes alocados em
disciplinas distintas, escolher um deles no filtro de Instrutor e conferir que só as disciplinas
com aquele instrutor alocado permanecem visíveis.

**Acceptance Scenarios**:

1. **Given** a lista atual (estado inicial ou turma selecionada), **When** o painel carrega,
   **Then** o dropdown de Instrutor lista apenas instrutores efetivamente alocados
   (`ID_Instrutor`) em alguma das linhas visíveis no momento — nunca o catálogo completo de
   instrutores do sistema.
2. **Given** o filtro de Instrutor com um valor selecionado, **When** o usuário troca de Curso ou
   Turma, **Then** o filtro de Instrutor é reiniciado (lista de opções depende do novo conjunto de
   linhas, um instrutor válido antes pode não estar mais alocado no novo recorte).
3. **Given** uma disciplina com mais de um instrutor alocado (CSV), **When** o filtro de Instrutor
   está ativo, **Then** a disciplina aparece se **qualquer um** dos instrutores alocados bater com
   o filtro, não exige que seja o único.

---

### User Story 3 - Filtrar por Status da Disciplina (Priority: P1)

O usuário filtra a lista pelo mesmo status de execução (Não Iniciada, Em Andamento, Concluída) já
calculado e exibido no gráfico de estatísticas da tela — nunca uma segunda definição de status.

**Why this priority**: item obrigatório do pedido (rescopado pela Clarification acima); reaproveita
cálculo já existente, risco mínimo de regressão.

**Independent Test**: com uma turma selecionada contendo disciplinas em pelo menos 2 dos 3 status
de execução, selecionar "Concluída" no filtro e conferir que só disciplinas com Carga Horária
Cumprida ≥ Carga Horária Total (a mesma regra já usada pelo gráfico de rosca existente) permanecem
visíveis — e que o gráfico de rosca, se aberto, mostra a mesma contagem usada para filtrar.

**Acceptance Scenarios**:

1. **Given** disciplinas em diferentes estágios de execução, **When** o usuário seleciona um valor
   no filtro de Status da Disciplina, **Then** só disciplinas cujo status calculado (idêntico à
   fórmula de status de execução já usada hoje pelo painel estatístico do módulo) bate com o valor
   escolhido permanecem visíveis.
2. **Given** o filtro de Status da Disciplina ativo, **When** o usuário consulta o gráfico de
   rosca "Status" do painel estatístico, **Then** os números do gráfico refletem o mesmo
   subconjunto filtrado (Curso+Turma+Instrutor+Status da Turma), não o total irrestrito.

---

### User Story 4 - Gráfico de pizza da Carga Horária do Curso (Priority: P2)

Ao selecionar um Curso (com ou sem Turma selecionada), o usuário vê um gráfico de pizza mostrando a
fatia proporcional de Carga Horária Prevista de cada disciplina ativa do curso em relação à Carga
Horária Total do curso — visão rápida de quais disciplinas pesam mais na grade.

**Why this priority**: item obrigatório do pedido, mas de menor risco/urgência que os 3 filtros —
visual novo aditivo, não bloqueia nenhum outro item.

**Independent Test**: selecionar o CAHO no filtro de Curso, abrir o painel de estatísticas e
conferir que aparece um gráfico de pizza com uma fatia por disciplina ativa do curso, cujos
percentuais somam ~100% da Carga Horária Total (`Carga_Horaria_Tempos`) do curso.

**Acceptance Scenarios**:

1. **Given** nenhum Curso selecionado (estado inicial), **When** o painel de estatísticas está
   aberto, **Then** o gráfico de pizza não aparece (só os gráficos/cartões já existentes, que
   continuam agregando todos os cursos do ano vigente).
2. **Given** um Curso selecionado, **When** o painel de estatísticas está aberto, **Then** o
   gráfico de pizza aparece com uma fatia por disciplina `Ativo` do curso, rotulada pelo
   Código/Nome da disciplina, proporcional à sua `Carga_Horaria_Tempos` sobre o total do curso.
3. **Given** um Curso sem nenhuma disciplina ativa cadastrada, **When** o painel de estatísticas é
   aberto, **Then** o gráfico de pizza não é renderizado (em vez de um gráfico vazio ou quebrado),
   com uma mensagem indicando ausência de dado.

---

### Edge Cases

- Curso selecionado mas todas as disciplinas têm `Carga_Horaria_Tempos = 0`: o gráfico de pizza não
  é renderizado (divisão por zero), mesma mensagem do curso sem disciplina ativa.
- Combinação de filtros que não bate com nenhuma linha (ex.: Status da Turma "Cancelada" + Status
  da Disciplina "Concluída" + Instrutor que só está alocado em turma "Ativa"): lista e cartões
  mostram zero/vazio, nunca erro.
- Trocar de Curso ou Turma com um filtro de Instrutor/Status já aplicado: os filtros de
  Instrutor/Status da Disciplina/Status da Turma são reiniciados junto (mesmo padrão de
  `resetarTudoDisciplinas_` já existente para o restante do estado da tela) — evita filtro
  "fantasma" de um recorte anterior aplicado silenciosamente sobre dados novos.
- Instrutor filtrado que deixa de estar alocado em qualquer linha (porque outro filtro reduziu o
  conjunto antes) já é resolvido pelo Edge Case acima — o dropdown de Instrutor sempre reflete o
  conjunto atualmente visível antes dos filtros de Instrutor/Status serem aplicados.
- Curso selecionado sem nenhuma Turma selecionada (catálogo puro, fora do escopo dos 3 filtros
  novos, FR-006): os 3 controles (Status da Turma, Instrutor, Status da Disciplina) ficam
  desabilitados/ocultos nessa visão, nunca visíveis e clicáveis sem produzir nenhum efeito — evita
  a impressão de um controle quebrado. Voltam a ficar disponíveis assim que uma Turma é
  selecionada ou a tela volta ao estado inicial.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE adicionar um filtro de "Status da Turma" com as 4 opções reais de
  `turmas.Status` (Planejada/Ativa/Concluida/Cancelada) mais uma opção "Todos", visível
  junto aos filtros de Curso/Turma já existentes.
- **FR-002**: O sistema DEVE adicionar um filtro de "Instrutor", cujas opções são populadas
  dinamicamente pelos instrutores efetivamente alocados (`turma_disciplina.ID_Instrutor`) nas
  linhas atualmente visíveis (antes da aplicação dos próprios filtros de Instrutor/Status), nunca
  o catálogo completo de instrutores do sistema.
- **FR-002.1**: A lista de opções do filtro de Instrutor DEVE aparecer ordenada por precedência
  militar (mais antigo primeiro) — RN-ANT-01 (Risco Alto), regra transversal já aplicada a todo
  seletor/lista de instrutores do sistema desde os Épicos H/028, sem exceção, mesmo sem o pedido
  original mencionar ordenação.
- **FR-003**: O sistema DEVE adicionar um filtro de "Status da Disciplina" com as 3 opções já
  usadas pelo cálculo de execução existente (Não Iniciada/Em Andamento/Concluída) mais uma opção
  "Todos" — reaproveitando a mesma fórmula de status de execução já usada hoje pelo painel
  estatístico do módulo (independentemente de onde essa fórmula passe a viver após a
  implementação — ver `plan.md`/`research.md`), nunca uma fórmula nova baseada em data.
- **FR-004**: Os 3 filtros novos (Status da Turma, Instrutor, Status da Disciplina) DEVEM operar em
  conjunto entre si e com os filtros de Curso/Turma já existentes — a lista de disciplinas, os 4
  cartões de KPI e o gráfico de rosca de status (`graficoDisciplinasStatus`) DEVEM refletir a
  interseção de todos os filtros ativos. **Exceção explícita**: o gráfico de pizza da User Story 4
  não é afetado pelos 3 filtros novos nem pelo filtro de Turma — é sempre uma agregação por Curso
  inteiro (todas as disciplinas ativas do curso selecionado), não do subconjunto filtrado (ver
  FR-007/FR-008 e User Story 4).
- **FR-005**: Trocar o Curso ou a Turma selecionada DEVE reiniciar os 3 filtros novos (Status da
  Turma, Instrutor, Status da Disciplina) para o estado "Todos"/vazio.
- **FR-006**: Os 3 filtros novos DEVEM estar disponíveis nas duas visões que já carregam dado por
  turma (estado inicial "ano vigente" da spec 035, e a cascata Curso+Turma) — a visão de catálogo
  puro por Curso sem Turma selecionada (sem dado de execução/instrutor por turma) fica fora do
  escopo destes 3 filtros. Nessa visão, os 3 controles DEVEM ficar indisponíveis (desabilitados ou
  ocultos) em vez de visíveis e sem efeito — nunca um controle interativo que não faz nada
  visivelmente ao ser usado (Edge Case abaixo).
- **FR-007**: O sistema DEVE renderizar um gráfico de pizza da Carga Horária Prevista por
  disciplina (`Carga_Horaria_Tempos`, disciplinas `Status='Ativo'`) sobre a Carga Horária Total do
  Curso, usando a mesma biblioteca de gráficos (Recharts) e o mesmo helper (`renderizarGrafico_`)
  já usados pelos demais gráficos do sistema.
- **FR-008**: O gráfico de pizza DEVE aparecer somente quando um Curso está selecionado (com ou sem
  Turma), e DEVE ficar ausente (não um gráfico vazio) quando nenhum Curso está selecionado, ou
  quando o curso selecionado não tem nenhuma disciplina ativa com Carga Horária maior que zero.
- **FR-009**: Cada fatia do gráfico de pizza DEVE ser rotulada pelo Código e/ou Nome da disciplina,
  nunca pelo `ID_Grade` cru.

### Key Entities

- **Filtro de Status da Turma**: seleção sobre `turmas.Status` (4 valores reais), aplicada
  sobre as linhas de disciplina/turma já carregadas — não introduz nenhuma coluna nova.
- **Filtro de Instrutor**: seleção sobre `turma_disciplina.ID_Instrutor` (lista CSV por linha) —
  disciplina aparece se qualquer instrutor alocado bater com o filtro.
- **Filtro de Status da Disciplina**: seleção sobre o status de execução já calculado
  (Não Iniciada/Em Andamento/Concluída), fórmula existente, não uma entidade nova.
- **Gráfico de Carga Horária do Curso**: agregação client-side de `disciplinas.Carga_Horaria_
  Tempos` (disciplinas `Ativo` do curso selecionado) — nenhuma escrita, nenhuma tabela nova.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue restringir a lista de disciplinas por Status da Turma, Instrutor
  e Status da Disciplina — isoladamente ou em qualquer combinação entre si e com Curso/Turma — sem
  recarregar a página e sem nenhuma chamada de rede adicional além das já existentes na tela.
- **SC-002**: Os cartões/gráficos estatísticos sempre refletem exatamente o mesmo subconjunto de
  linhas visível na tabela, para qualquer combinação de filtros.
- **SC-003**: Ao selecionar um Curso com disciplinas cadastradas, o gráfico de pizza aparece em até
  1 segundo (sem chamada de rede nova) e suas fatias somam a Carga Horária Total do curso.
- **SC-004**: Nenhuma combinação de filtros produz erro visível ao usuário — resultado vazio sempre
  vira mensagem de "nenhuma disciplina", nunca tela em branco ou exceção no console.

## Assumptions

- Os 3 filtros novos operam sobre dados já carregados em memória pela tela (sem nenhuma chamada
  nova a Server Action) — tanto o Status da Turma (`AppState.ctx.turmas`, já em memória
  desde o boot) quanto o Instrutor/Status da Disciplina (campos já presentes nas linhas retornadas
  por `getDisciplinasAnoVigente`/`getDisciplinasDaTurmaComRitmo`, já carregadas pela tela).
- O gráfico de pizza usa a Carga Horária Prevista de catálogo (`disciplinas.Carga_Horaria_
  Tempos`), não a Carga Horária Cumprida real — é uma visão do **planejamento** da grade do curso,
  não da execução (RF-011, mesmo espírito que distingue CH Prevista de CH Cumprida em todo o
  restante do sistema, specs 027/032).
- "Status do Curso" citado no pedido original é, na prática, Status da Turma (`turmas.
  Status`) — decisão confirmada por Bernardo, `cursos.Status` (binário Ativo/Inativo)
  permanece fora do escopo desta spec.
- Nenhuma coluna nova, nenhuma migração de schema — todos os 3 filtros e o gráfico são derivados de
  dado já existente e já lido pela tela.
