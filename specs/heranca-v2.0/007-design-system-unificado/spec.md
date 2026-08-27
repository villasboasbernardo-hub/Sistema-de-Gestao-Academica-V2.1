# Feature Specification: Épico A — Design System Unificado

**Feature Branch**: `007-design-system-unificado`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Épico A do documento 06 — Design System Unificado"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico A), `docs/fase-1/02-Requisitos-Funcionais.md`
(RF-DS-01 a 05, RF-INI-05, RF-INSTR-15), `docs/arquitetura/03-design-system.md` (documento
transversal #3, já escrito na Fase 2 — decisões de paleta/tema/componentes), `.specify/memory/constitution.md`.

## Clarifications

### Session 2026-08-15

- Q: O sistema deve detectar automaticamente a preferência de tema claro/escuro do navegador/SO no
  primeiro carregamento, ou sempre começar no tema claro até escolha manual? (RF-DS-03.1) → A:
  Opção A — detectar automaticamente via `prefers-color-scheme` no primeiro carregamento (sem
  escolha manual salva ainda); o toggle manual continua sempre disponível, prevalece e persiste
  assim que usado. Custo de implementação baixo (media query CSS + `window.matchMedia`, sem
  biblioteca nova) — a cláusula de descarte de RF-DS-03.1 (custo desproporcional) não se aplica.

## Nota de escopo — o que `03-design-system.md` já decidiu vs. o que o documento 06 pede deste épico

Verificado antes de escrever esta spec, para não inventar escopo nem repetir decisão já tomada:

1. **`docs/arquitetura/03-design-system.md` já existe, é extenso (276 linhas) e já toma a maior
   parte das decisões de design** (paleta, temas, componentes, padrões de CRUD/alerta) — este
   documento é tratado aqui como fonte primária de decisão, o mesmo papel que `01-schema.md` teve
   para o Épico C e `02-modularizacao.md` para o Épico B. Esta spec **não redecide** o que já está
   lá — traduz em User Stories/Requisitos o que o documento 06 efetivamente pede **deste épico**.
2. **`03-design-system.md` é mais amplo do que o Épico A do documento 06 pede.** O documento
   incorpora também as seções 3 (Painel Início completo: KPIs, carrosséis por modalidade, alertas
   consolidados), 3.1 (Página do Curso: cards expansíveis, estatísticas dinâmicas por curso),
   3.2 (Módulo de Turmas — Diário de Classe, parcialmente bloqueado pelo achado UE-1) e 4 (padrão
   de estatísticas interativas aplicado a todo módulo de cadastro) — todo esse conteúdo é
   **construção de funcionalidade nova em telas que ainda não existem** (`app/(app)/inicio/page.tsx` não
   existe — `docs/arquitetura/02-modularizacao.md` o lista como "nenhum épico sequenciado ainda"),
   não "modularização/consolidação visual". As 5 "Histórias de alto nível" do Épico A no
   documento 06 pedem especificamente: objeto `UI` único (RF-DS-01), componentes reutilizáveis
   para o que **já está duplicado** (RF-DS-02), troca de tema sem perda de funcionalidade
   (RF-DS-03), e identidade visual "mais convidativa" — só citam RF-INI-05 (brasão), nunca o
   Painel Início inteiro. **Esta spec segue o documento 06**: constrói o Design System e aplica a
   identidade institucional onde ela já existe hoje (a navbar de `app/layout.tsx`), sem construir
   `app/(app)/inicio/page.tsx`/Diário de Classe/estatísticas interativas do zero — isso pertence a um épico
   próprio, ainda não sequenciado (mesmo critério de contenção de escopo já usado nas specs dos
   Épicos B e G, constitution Princípio IX).
3. **Verificado arquivo a arquivo o que já existe hoje** (`app/globals.css`, 24 linhas):
   só Tailwind CSS + shadcn/ui + lucide-react como dependência versionada no `package.json`, `#overlay`, 5 cores de `badge-categoria` fixas, e a
   regra `[data-view] { display: none; }`. Nenhum objeto `UI`, nenhuma fonte `Rawline`, nenhum tema
   escuro, nenhum componente de KPI/nome de instrutor/grade semanal reutilizável — tudo isso é
   trabalho real deste épico, não decoração sobre algo que já existe.
4. **Quadro de avisos de qualidade de dados (RF-INSTR-09/RF-MATERIAS-03, citado em
   `03-design-system.md` §7 como componente a consolidar) não existe em nenhuma tela hoje** —
   confirmado por busca em `app/`. RF-DS-02 pede consolidar o que **já está duplicado**;
   como este componente nunca foi construído nem uma vez, construí-lo do zero é funcionalidade
   nova (RF-INSTR-09/RF-MATERIAS-03), não Design System — fica fora desta spec, registrado como
   Assumption.
5. **O critério de aceite original do documento 06** que cita paridade não é aplicável aqui da
   mesma forma que em épicos anteriores (não há "saída numérica" a comparar) — mas o mesmo
   princípio vale: nenhuma tela existente pode perder informação/comportamento após migrar para o
   Design System (constitution, Princípio VI — verificado pela suíte de invariantes onde aplicável,
   e por inspeção visual manual no teste de aceite, já que a maior parte desta spec é puramente
   visual e não tem saída numérica testável).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Um único lugar define cor, tipografia e estado visual (Priority: P1) 🎯 MVP

Como desenvolvedor, quero um objeto `UI` único (`app/globals.css` + `components/ciaara/`) do qual toda tela
obtém cores semânticas (sucesso, atenção, alerta, neutro), tipografia e espaçamento, em vez de
redefinir classes CSS a cada novo módulo — para que uma cor ou estado visual novo seja adicionado
em um único lugar e se propague para todos os módulos que o usam.

**Why this priority**: é o pré-requisito de tudo mais no épico (RF-DS-01) — sem o objeto `UI`, os
componentes reutilizáveis (User Story 3) e os temas (User Story 2) não têm onde viver.

**Independent Test**: adicionar uma cor semântica nova ao objeto `UI` e confirmar que ela fica
disponível para qualquer view sem precisar editar CSS em mais de um lugar; confirmar que as 5 cores
de `badge-categoria` já existentes continuam funcionando exatamente como antes, agora servidas pelo
objeto `UI`.

**Acceptance Scenarios**:

1. **Given** o objeto `UI` implementado, **When** um desenvolvedor precisa de uma cor semântica
   (sucesso/atenção/alerta/neutro) numa view nova, **Then** ele a obtém do objeto `UI`, nunca
   definindo uma classe CSS nova específica daquela página.
2. **Given** as 5 categorias normativas (`badge-categoria-*`) já em uso em 4 views, **When** o
   objeto `UI` é introduzido, **Then** essas 5 cores continuam exatamente as mesmas, sem nenhuma
   tela perder a sinalização visual que já tinha.
3. **Given** a fonte `Rawline` (RF-DS-01, decisão em `03-design-system.md` §1) configurada como
   fonte principal, **When** ela falha ao carregar, **Then** o sistema cai para o fallback
   `system-ui` do Tailwind CSS, sem tela quebrada nem texto ilegível.

---

### User Story 2 - Trocar de tema sem perder nenhuma tela ou funcionalidade (Priority: P1)

Como usuário do sistema, quero continuar podendo alternar entre tema claro e modo noturno, agora
com os dois **redesenhados** (contraste corrigido — `03-design-system.md` §2, RF-DS-03) e com a
escolha persistida entre sessões, sem perder nenhuma tela ou funcionalidade que já funciona hoje.

**Why this priority**: RF-DS-03 é explícito que os temas atuais (V1.0) têm legibilidade ruim —
reformular é o critério de aceite de alto nível do próprio documento 06 ("nenhuma tela existente
perde informação, cor semântica ou comportamento de impressão após a migração").

**Independent Test**: alternar entre tema claro e escuro em qualquer tela já existente do sistema
(Cronograma, Avaliações, Usuários etc.), confirmar contraste adequado nos dois, confirmar que a
escolha persiste ao recarregar a página, e confirmar ausência de "flash" de tema errado no
carregamento.

**Acceptance Scenarios**:

1. **Given** o sistema carregado pela primeira vez num navegador, **When** a página termina de
   carregar, **Then** o tema (claro ou escuro) é aplicado sem um "flash" visível do tema errado
   antes da correção.
2. **Given** um usuário que já escolheu um tema numa sessão anterior, **When** ele reabre o
   sistema, **Then** o mesmo tema é aplicado automaticamente, sem precisar escolher de novo.
3. **Given** qualquer tela já existente do sistema, **When** o usuário alterna para o tema escuro,
   **Then** todo texto/indicador continua legível (contraste adequado — RF-DS-03), sem nenhum
   campo "claro demais" como no modo noturno da V1.0.
4. **Given** um usuário que nunca escolheu um tema manualmente, **When** ele abre o sistema pela
   primeira vez, **Then** o tema inicial segue a preferência `prefers-color-scheme` do navegador/SO
   (RF-DS-03.1, Clarifications 2026-08-15); assim que ele usar o toggle manual, essa escolha
   prevalece e passa a persistir, mesmo que a preferência do SO mude depois.

---

### User Story 3 - Componentes visuais duplicados viram um componente único (Priority: P2)

Como desenvolvedor, quero que os padrões visuais hoje duplicados entre módulos — card de
indicador/KPI, badge de status, grade de alocação semanal (hoje só em `app/(app)/cronograma/page.tsx`,
Épico G) e o nome padronizado de instrutor (RF-INSTR-15/RF-DS-05) — virem componentes únicos em
`app/globals.css`/`components/ciaara/`, para não reimplementar o mesmo padrão a cada novo módulo.

**Why this priority**: é consolidação do que já existe (RF-DS-02), não construção de tela nova —
menor risco que User Stories 1/2, mas ainda real trabalho de padronização.

**Independent Test**: trocar a formatação de nome de instrutor em `app/(app)/instrutores/page.tsx` para usar
o novo componente único, confirmar que o resultado é "P/G Especialidade/Habilitação **Nome de
Guerra**" (nome de guerra em negrito); confirmar que `app/(app)/cronograma/page.tsx` e qualquer tela futura
que precise de grade semanal usam o mesmo componente de estilo, não CSS duplicado.

**Acceptance Scenarios**:

1. **Given** o componente de nome de instrutor implementado, **When** qualquer view exibe um
   instrutor, **Then** o formato é sempre "P/G Especialidade/Habilitação **Nome de Guerra**"
   (RF-INSTR-15), nunca `Nome_Guerra` cru como hoje em `app/(app)/instrutores/page.tsx`.
2. **Given** o componente de card de KPI implementado, **When** uma tela precisa mostrar um número
   totalizador com ícone e rótulo, **Then** usa o componente único, sem CSS específico daquela
   página (RF-DS-04).
3. **Given** a estilização de grade semanal já construída para `app/(app)/cronograma/page.tsx` (Épico G),
   **When** ela é extraída para um componente reutilizável, **Then** `app/(app)/cronograma/page.tsx` continua
   funcionando exatamente como antes (constitution, Princípio VI).

---

### User Story 4 - Identidade institucional na navbar (Priority: P2)

Como usuário do sistema, quero que a identidade visual do sistema incorpore o brasão/identidade
institucional do CIAARA (RF-INI-05), tornando o topo do sistema mais representativo da instituição,
sem depender da construção completa do Painel Início (fora de escopo — Nota de escopo item 2).

**Why this priority**: é o único pedaço de RF-INI que o Épico A do documento 06 realmente pede;
menor escopo que construir uma tela inteira, aplicável imediatamente à navbar que já existe.

**Independent Test**: abrir o sistema e confirmar que a navbar (`app/layout.tsx`) exibe o brasão do
CIAARA e o título de exibição do sistema, mantendo todas as rotas/menus existentes funcionando sem
mudança de comportamento.

**Acceptance Scenarios**:

1. **Given** a navbar atual (`app/layout.tsx`, só texto "CIAARA-11 — Gestão Acadêmica"), **When** a
   identidade institucional é aplicada, **Then** o brasão do CIAARA aparece ao lado do título de
   exibição ("Sistema de Gestão Acadêmica" — `03-design-system.md` §3), sem remover nenhum item de
   menu existente.

---

### Edge Cases

- Uma view ainda não migrada para o objeto `UI` (durante a transição) não pode quebrar — degrada
  para o CSS que já tinha, nunca lança erro (RN-DEG-01).
- Alternar tema com uma tabela grande renderizada (ex.: Cronograma) não pode perder o estado de
  filtro/seleção já aplicado pelo usuário.
- Fonte `Rawline` falhando ao carregar (rede lenta/CDN indisponível) não pode deixar nenhum texto
  ilegível — fallback `system-ui` sempre disponível (User Story 1, Acceptance Scenario 3).
- Componentes reutilizáveis (User Story 3) não podem alterar nenhum dado nem comportamento das
  telas que já os usavam de forma ad hoc — é reorganização visual, não mudança funcional
  (RF-MOD-03, mesmo princípio já usado no Épico B).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE expor um único ponto central (objeto `UI`, em `app/globals.css`/
  `components/ciaara/`) do qual todas as telas obtêm cores semânticas (sucesso, atenção, alerta, neutro),
  tipografia e espaçamento — nenhuma view pode definir cor fora dele (RF-DS-01).
- **FR-002**: A paleta de cores DEVE seguir a decisão já registrada em `03-design-system.md` §2
  (primária `#003366`, sucesso/atenção/crítico mapeados às classes semânticas do Tailwind CSS), sem
  redecidir valores já fixados.
- **FR-003**: A fonte principal DEVE ser `Rawline`, com fallback `system-ui` do Tailwind CSS se o
  carregamento falhar (RF-DS-01, `03-design-system.md` §1, UI-04).
- **FR-004**: O sistema DEVE oferecer dois temas **redesenhados** (claro e escuro, nunca os da
  V1.0 preservados) com contraste adequado, com a escolha do usuário persistida entre sessões e
  sem "flash" de tema errado no carregamento (RF-DS-03).
- **FR-005**: O sistema DEVE detectar automaticamente a preferência de tema claro/escuro do
  navegador/SO (`prefers-color-scheme`) no primeiro carregamento, quando o usuário ainda não tiver
  escolhido manualmente; o toggle manual DEVE continuar sempre disponível, prevalecer sobre a
  detecção automática assim que usado, e persistir a partir daí (RF-DS-03.1, Clarifications
  2026-08-15 — implementada, não descartada: custo de implementação baixo).
- **FR-006**: Os componentes visuais hoje duplicados/ad hoc — badge de categoria/status, card de
  indicador numérico (KPI), grade de alocação semanal (`app/(app)/cronograma/page.tsx`, Épico G) — DEVEM
  virar componentes únicos reutilizáveis em `app/globals.css`/`components/ciaara/`, sem alterar o
  comportamento das telas que já os usam (RF-DS-02).
- **FR-007**: O nome de um instrutor DEVE ser apresentado, em toda tela que o exibir, no formato
  padronizado "P/G Especialidade/Habilitação **Nome de Guerra**" (nome de guerra em negrito),
  através de uma única função de formatação reutilizável — nunca reimplementada por módulo
  (RF-INSTR-15/RF-DS-05).
- **FR-008**: Toda nova tela ou componente construído sobre o Design System DEVE alcançar o mesmo
  padrão visual das telas existentes sem exigir CSS específico daquela página (RF-DS-04).
- **FR-009**: A navbar (`app/layout.tsx`) DEVE incorporar o brasão/identidade institucional do CIAARA e
  o título de exibição "Sistema de Gestão Acadêmica" (`03-design-system.md` §3), sem remover nenhum
  item de menu existente (RF-INI-05, delimitado à navbar — não à construção do Painel Início
  completo, Nota de escopo item 2).
- **FR-010**: Nenhuma migração de tela existente para o Design System pode alterar o comportamento
  observável dessa tela (dado exibido, ação disponível, comportamento de impressão) — verificado
  pela suíte de invariantes estruturais onde há saída testável, e por inspeção manual onde a
  mudança é puramente visual (constitution, Princípio VI).

### Key Entities

Nenhuma entidade de dados nova — este épico é puramente de apresentação (frontend). Nenhuma coluna/
tabela do schema é criada, lida de forma nova ou alterada.

- **Objeto `UI`**: ponto central de tema/cor/tipografia/espaçamento, vive em
  `app/globals.css`/`components/ciaara/`.
- **Componente de nome de instrutor**: função de formatação pura, consome `instrutores`
  (`Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Guerra`, já existentes), não persiste nada novo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma cor semântica nova pode ser adicionada em um único lugar (objeto `UI`) e propagar
  para todos os módulos que a usam, sem editar CSS em mais de um arquivo.
- **SC-002**: Nenhuma tela existente perde informação, cor semântica ou comportamento de impressão
  após a migração para o Design System (critério de aceite do documento 06, verificado por
  inspeção manual + suíte de invariantes onde aplicável).
- **SC-003**: Tema claro/escuro persiste corretamente entre sessões e não produz nenhum "flash" de
  tema errado perceptível ao usuário no carregamento.
- **SC-004**: Nome de instrutor aparece no formato padronizado RF-INSTR-15 em toda tela que o
  exibir, sem nenhuma reimplementação módulo a módulo.
- **SC-005**: A navbar exibe a identidade institucional (brasão + título de exibição) sem remover
  nenhuma rota/menu existente.

## Assumptions

- **Fora de escopo desta spec** (Nota de escopo item 2): construção completa do Painel Início
  (`app/(app)/inicio/page.tsx` — KPIs, carrosséis por modalidade, alertas consolidados, RF-INI-01..04), da
  visão expandida de Página do Curso (cards expansíveis, estatísticas dinâmicas), do Diário de
  Classe (Módulo de Turmas, parcialmente bloqueado pelo achado UE-1) e do padrão de estatísticas
  interativas aplicado a módulos de cadastro (`03-design-system.md` §3/3.1/3.2/4) — nenhum desses
  itens está pedido pelas Histórias de alto nível do Épico A no documento 06; ficam registrados em
  `03-design-system.md` como decisão de arquitetura para quando um épico próprio os sequenciar.
- **Fora de escopo**: quadro de avisos de qualidade de dados (RF-INSTR-09/RF-MATERIAS-03,
  `03-design-system.md` §7) — não existe em nenhuma tela hoje, então não há duplicação para
  consolidar (RF-DS-02 pede consolidação do que já existe, não construção nova).
- **Fora de escopo**: sistema completo de alertas de 3 níveis com gatilhos event-driven/time-driven
  (`03-design-system.md` §5) — nenhuma tela hoje implementa esse sistema; o Aviso Nível 2 (banner
  amarelo dispensável) já existe e continua funcionando como está, sem generalização para os 3
  níveis nesta spec.
- Bloco de "Filtros Avançados" (RF-DS-02) — hoje só existe como filtro simples ad hoc em
  `app/(app)/cronograma/page.tsx` (Épico G); vira componente reutilizável dentro desta spec só na forma que
  já existe (filtro de texto simples), sem adicionar filtro em cascata/drill-down
  (`03-design-system.md` §4, fora de escopo junto com estatísticas interativas).
- `UI-03`/`UI-06` (lucide-react, Recharts) — lucide-react já está em uso (`app/globals.css`);
  Recharts não é necessário nesta spec, já que nenhum gráfico está em escopo (estatísticas
  interativas ficaram de fora).
