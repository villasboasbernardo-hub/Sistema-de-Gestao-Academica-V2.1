# Feature Specification: Refatoração UI/UX e Conformidade de Dados (Correção de Dívida Técnica)

**Feature Branch**: `009-refatoracao-ui-ux`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Épico de Refatoração UI/UX e Conformidade de Dados (Correção de Dívida
Técnica). Contexto: Versão 2.0/Fase 2 - Arquitetura/Rascunho de funcionalidades.txt, seções 1-8.
Objetivo: identidade visual (fonte/cores/brasões/sidebar), navegação por carrossel + cartões
expansíveis (Início/Cursos/Turmas/Disciplinas), ocultar IDs e usar dropdowns nos formulários CRUD,
dashboards com Recharts. Zero alteração nas lógicas de cálculo de backend."

**Fontes primárias**: `Versão 2.0/Fase 2 - Arquitetura/Rascunho de funcionalidades.txt` (seções
1-8, citado pelo usuário), `docs/arquitetura/03-design-system.md` (decisões já tomadas em
2026-08-11/14 sobre este mesmo rascunho), `docs/arquitetura/04-appstate.md`,
`docs/arquitetura/01-schema.md` §7 (achados UE-1/TURMA-1/DISC-1, resolvidos nesta rodada — ver
Clarifications), `docs/fase-1/02-Requisitos-Funcionais.md` (RF-INI-01..05, RF-CURSO-01..06,
RF-CURSOS-01..03, RF-MATERIAS-01..06, RF-DS-01..05, RF-NAV-01..03), `.specify/memory/constitution.md`.

## Clarifications

### Session 2026-08-15

- Q: Quando a disciplina é comparada entre ritmo real e esperado, qual banda de tolerância decide
  "No Prazo" contra "Atrasada"/"Adiantada"? → A: reaproveitar a mesma banda de 90%–110% já usada e
  testada em `classificarDensidade_` (`lib/acoes/cronograma.ts`, Épico G) — abaixo de 90% do esperado até
  hoje é `Atrasada`; 90%–110% é `No Prazo`; acima de 110% é `Adiantada`. Mesmo critério do resto do
  sistema, em vez de um segundo threshold para um conceito visualmente parecido.
- Q: Os dashboards Recharts (US5) devem cobrir só Cursos e Disciplinas, ou também Instrutores e
  Turmas? → A: Também Instrutores e Turmas — os 4 módulos que `03-design-system.md` §4 já cita como
  alvo ("todo módulo com cadastro"), não só os dois com pedido textual mais direto em doc 02.
- Q: Para a tabela de Unidade de Ensino (UE-1) dentro do "Diário de Classe Detalhado" — implementar
  agora ou deixar de fora nesta rodada? → A: Deixar de fora agora — a visão expandida da disciplina
  usa só o que já não está bloqueado (cronograma previsto×real via `FORMULA`, painel de
  avaliações); UE fica para uma decisão futura dedicada (mesmo tratamento que itens bloqueados
  receberam no Épico A).
- Q: Adicionar o status "Arquivada" ao domínio de turma (TURMA-1) para os filtros do módulo de
  cursos? → A: Não adicionar agora — o filtro de turmas usa os 4 status reais já existentes
  (`Planejada`/`Ativa`/`Concluida`/`Cancelada`).
- Q: Adicionar os dois campos novos em `disciplinas` (DISC-1: `Tecnica_Ensino_Sugerida`,
  `Local_Padrao`) nesta rodada? → A: Sim — aditivo, baixo risco (convenção C-10), incluído no
  cadastro de disciplina deste épico.

## Nota de escopo — o que já existia, o que este épico realmente cobre

Verificado antes de escrever esta spec, para não repetir trabalho já feito, não reabrir decisões já
tomadas e não expandir silenciosamente além do que foi pedido:

1. **Este NÃO é um épico novo do zero — é a continuação de decisões já registradas em
   2026-08-11/14.** `docs/arquitetura/03-design-system.md`/`04-appstate.md` já leram o mesmo
   `Rascunho de funcionalidades.txt` citado nesta ordem, formalizaram a maior parte em decisão
   escrita, e deixaram registrado explicitamente o que ficou pendente para uma implementação
   posterior (seção 8 de `03-design-system.md`: "detalhes de implementação... ficam para o
   `/speckit.plan` do Épico A"). Este épico é essa implementação posterior — não uma leitura nova
   do rascunho do zero.
2. **RF-INI (Painel Início) e RF-CURSO (Página do Curso) existem em `docs/fase-1/02-Requisitos-
   Funcionais.md` desde a Fase 1, mas nunca foram atribuídos a uma letra do backlog de épicos
   (`docs/fase-1/06-Backlog-de-Epicos-V2.md`, Épicos A–J)** — só RF-NAV (Épico D, AppState) tem
   dono explícito. `03-design-system.md` já havia absorvido RF-INI/RF-CURSO como extensão natural
   do Épico A (consumidores do Design System), e é assim que este épico também os trata.
3. **Escopo desta spec = os 4 itens do pedido do usuário nesta sessão, não as 10 seções inteiras do
   rascunho.** O rascunho e os dois documentos de arquitetura são citados como fonte de decisão já
   tomada, não como uma lista de tarefas a esgotar — mesmo critério já usado no Épico A
   (`03-design-system.md` era "mais amplo que o texto do Épico A no documento 06... o excesso
   ficou fora do escopo porque nenhuma história... pedia", `historico/2026-08-14...`). Aqui o
   critério equivalente é o próprio pedido do usuário nesta sessão. Ficam **explicitamente fora**:
   - Seções 9/10 do rascunho (central de notificações/sino, propagação cruzada de alertas,
     gatilhos *time-driven*/cron) — excluídas pelo próprio usuário ("foco... seções 1 a 8").
   - `IND-01/02/03`/paginação/`dirty checking`/hard-delete-com-confirmação-digitada (seção 6 do
     rascunho) além do que o item 3 do pedido cobre (ocultar IDs, usar dropdowns) — o pedido do
     usuário cita "Seção 6" só para justificar o item 3, não para importar o padrão de CRUD
     inteiro. Hard delete, em particular, **já foi decidido contra** em `03-design-system.md` §6
     (convenção C-05 prevalece — nenhuma tela tem exclusão física, nem Admin); não é reaberto aqui.
   - `DYN-01/02/03` (filtros em cascata, drill-down por clique, menu de contexto por gráfico —
     seção 8 do rascunho) além do que o item 4 do pedido cobre ("gráficos dinâmicos baseados no
     esquema de dados"). O item 4 pede a biblioteca e os gráficos, não a interatividade completa de
     cross-filtering — fica registrado como Assumption, candidato a uma iteração futura.
   - `RF-INI-04` (alertas consolidados no painel Início) — existe em doc 02, mas o item 2 do pedido
     do usuário não cita alertas, e o sistema de alertas/notificações (seções 9/10) está fora por
     instrução direta. Fica fora desta spec.
4. **Três achados que bloqueavam parte do rascunho (`01-schema.md` §7) foram resolvidos nesta
   sessão** (ver Clarifications): UE-1 fica fora (Diário de Classe Detalhado sem a tabela de
   Unidade de Ensino); TURMA-1 fica fora (sem status "Arquivada"); DISC-1 entra (dois campos novos
   em `disciplinas`).
5. **Nenhum asset de imagem existe no repositório** para os brasões (CIAARA, Marinha do Brasil,
   mascote da DHN) — confirmado por busca no repositório inteiro. Mesmo padrão de degradação
   graciosa já usado no Épico A para o brasão do CIAARA (slot sem `src`, invisível até Bernardo
   fornecer o arquivo) se aplica aos 3 slots agora, não só 1.
6. **Achados reais de dívida técnica já identificados, concretos, não hipotéticos** — grep no
   código confirma exatamente o problema que o item 3 do pedido descreve: `app/(app)/turmas/[turma]/dsa/page.tsx`
   (`abrirLancarAula`, Épico H) usa `prompt('ID da disciplina (ID_Grade):')` e `prompt('ID do
   instrutor:')` — texto livre de ID, exatamente o padrão proibido. É o alvo concreto mais direto
   do item 3, junto com uma auditoria das demais telas.
7. **"Sidebar retrátil" é trabalho genuinamente novo** — `app/layout.tsx` hoje tem uma `navbar`
   horizontal simples (`<nav class="navbar navbar-dark bg-dark">`), sem menu lateral retrátil.
   Decisão de implementação (não de escopo): usar o componente **Offcanvas nativo do Tailwind CSS
   5.3** (já pinado como dependência versionada no `package.json` desde sempre) em vez de construir um do zero — mesmo raciocínio que já
   levou o Épico A a adotar `data-bs-theme` nativo em vez de um mecanismo customizado.
8. **Cartões expansíveis de Curso/Turma/Disciplina são trabalho genuinamente novo** —
   `app/(app)/cursos/[curso]/page.tsx` hoje é só um `<select>` de curso + blocos de teto/indicador, sem nenhum cartão.
   O "resumo → expande ao clicar" não existe em nenhuma tela do V2.0 hoje (`app/(app)/cronograma/page.tsx` e
   `app/(app)/turmas/[turma]/dsa/page.tsx` são grades, não cartões).
9. **Indicador de ritmo/desvio da disciplina (Atrasada/No Prazo/Adiantada) é cálculo novo, mas sem
   coluna nova** — já registrado em `03-design-system.md` §3.2.A: compara CH executada até hoje
   contra a CH que deveria estar executada nesta altura do calendário previsto
   (`Previsao_Inicio`/`Previsao_Termino`), usando dados já modelados. Candidato a `RN-DISC-0X`
   quando formalizado no documento 04 — ainda não nomeado; este épico implementa o cálculo como
   função pura, citável depois.
10. **Recharts como dependência versionada no `package.json` já está pré-aprovado** (`03-design-system.md`, UI-06: "Confirmado,
    substituindo o Recharts usado pontualmente na V1.0") — não é uma nova exceção à constitution
    Princípio III a ser negociada aqui, é a aplicação de uma decisão já tomada.
11. **Zero alteração de lógica de cálculo de backend, confirmado pelo próprio pedido** — todo FR
    desta spec é aditivo (dropdowns lendo dados já existentes, cartões exibindo dados já calculados
    por `getCronograma`/`totalizadoresDaTurma_`/`calcularTetosDoCurso`, novo cálculo de ritmo que
    não substitui nenhum existente) ou puramente de apresentação. Nenhuma regra `RN-` é alterada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identidade visual completa e navegação por sidebar (Priority: P1) 🎯 MVP

Como qualquer usuário do sistema, quero ver a identidade institucional completa (brasão do CIAARA,
brasão da Marinha, mascote da DHN) e navegar pelo sistema através de um menu lateral retrátil, em
vez do menu horizontal atual, para que a interface siga o padrão visual institucional exigido e
libere espaço de tela em telas com muito conteúdo (grades, cartões, gráficos).

**Why this priority**: é a fundação estrutural sobre a qual as demais User Stories (cartões,
carrossel, dashboards) são construídas — mudar a casca de navegação depois de construir conteúdo
por cima geraria retrabalho.

**Independent Test**: abrir o sistema, confirmar fonte Rawline aplicada, cor primária `#003366` no
header/sidebar, os 3 slots de brasão presentes (mesmo que ainda sem imagem — Bernardo não forneceu
os arquivos), abrir/fechar a sidebar retrátil e confirmar que todos os itens de menu de hoje
continuam navegáveis a partir dela.

**Acceptance Scenarios**:

1. **Given** o sistema carregado, **When** a página renderiza, **Then** a fonte Rawline é aplicada
   (já confirmado desde o Épico A) e a cor primária `#003366` aparece no header/sidebar.
2. **Given** a tela inicial, **When** o usuário observa o cabeçalho, **Then** os 3 slots de
   identidade institucional (brasão CIAARA, brasão Marinha, mascote DHN) estão presentes na
   estrutura da página — visíveis se um arquivo de imagem existir, ou invisíveis sem disparar
   nenhuma requisição de rede se não existir (RN-DEG-01, mesmo padrão do Épico A).
3. **Given** a sidebar retrátil, **When** o usuário clica no botão de alternar, **Then** ela
   expande/retrai sem recarregar a página, e todos os itens de menu hoje navegáveis (mesmos
   RF-NAV-02: Atividades Extraclasse, Página do Curso, Avaliações, DSA, Relatório, Cronograma,
   Usuários/Instrutores/Disciplinas conforme perfil) continuam acessíveis a partir dela.
4. **Given** um perfil sem acesso a uma tela restrita (ex.: Usuários), **When** a sidebar é
   renderizada, **Then** o item correspondente continua oculto (RF-AUTH-04, comportamento
   preservado, não uma regra nova).

---

### User Story 2 - Painel Início com carrossel de turmas por modalidade (Priority: P1)

Como qualquer usuário do sistema, quero ver, ao abrir o sistema, um carrossel de cartões de turma
para cada classificação de curso (Regular, Especial, Expedito, Estágio de Qualificação,
Aperfeiçoamento Avançado), com a turma em destaque de cada curso, seu status e progresso, para ter
uma visão geral do sistema sem precisar navegar tela por tela.

**Why this priority**: é RF-INI-01/02/03/05 (Fase 1) — hoje o sistema não tem painel Início algum;
é o ponto de entrada natural do sistema, mesma prioridade da fundação estrutural (US1).

**Independent Test**: abrir o sistema, confirmar um carrossel por classificação com rolagem
horizontal, cada card mostrando curso/turma abreviada/status/barra de progresso, e clicar num card
navega para a Página do Curso correspondente (US3).

**Acceptance Scenarios**:

1. **Given** o painel Início carregado, **When** o usuário observa a tela, **Then** vê um carrossel
   de rolagem horizontal por classificação de curso (Regular/Especial/Expedito/Estágio de
   Qualificação/Aperfeiçoamento Avançado — mesmos valores de `cursos.Classificacao` já usados
   em `cursoDentroDoEscopoOperador_`), cada um só com os cursos daquela classificação.
2. **Given** um curso com mais de uma turma em `Status = Ativa` simultaneamente (ex.: uma turma
   "atrasada" para o ano seguinte), **When** o card do carrossel é montado, **Then** mostra a turma
   `Ativa` cuja janela `Data_Inicio`–`Data_Termino` contém a data corrente; havendo mais de uma
   candidata, a de `Data_Inicio` mais recente prevalece — resolvido no backend
   (`getContextoInicial`/função equivalente), nunca escolhido no front-end (04-appstate.md).
3. **Given** um card de turma, **When** exibido, **Then** mostra nome completo do curso, nome
   abreviado da turma (ex.: "CAHO 2026"), status da turma, e barra de progresso (CH executada ÷ CH
   total da turma, reaproveitando o mesmo cálculo já usado pelo Cronograma/DSA — nenhuma segunda
   implementação).
4. **Given** um card de turma no carrossel, **When** o usuário clica, **Then** o sistema navega
   para a Página do Curso correspondente (US3), preservando o contexto de turma selecionada
   (RF-NAV-01/03).
5. **Given** um usuário com escopo de curso restrito (RN-RBAC-02), **When** o painel Início
   carrega, **Then** só os cursos dentro do escopo do usuário aparecem nos carrosséis — mesma regra
   de escopo já aplicada em `getContextoInicial`, não uma regra nova.

---

### User Story 3 - Cartões expansíveis de Curso, Turma e Disciplina (Priority: P1)

Como qualquer usuário do sistema, quero ver Cursos, Turmas e Disciplinas como cartões que expandem
ao clicar, mostrando resumo por padrão e informação completa sob demanda, para não precisar abrir
telas separadas para cada nível de detalhe.

**Why this priority**: é o item 2 do pedido, a mudança de maior volume de tela — mas depende da
navegação da US1 já existir e alimenta diretamente o destino dos cliques da US2.

**Independent Test**: abrir a Página do Curso, ver os cursos como cartões resumidos; clicar num
curso, ver expandir com informação completa; dentro do curso, ver as turmas/disciplinas como
cartões com barra de progresso e status; clicar numa disciplina, ver expandir para o Diário de
Classe Detalhado (sem tabela de UE, por decisão desta rodada).

**Acceptance Scenarios**:

1. **Given** a Página do Curso (módulo de cursos), **When** carregada, **Then** exibe cursos como
   cartões agrupados por classificação (RF-CURSOS-02), cada um com informação básica (nome,
   classificação, duração).
2. **Given** um cartão de curso resumido, **When** o usuário clica, **Then** o cartão expande
   exibindo todas as informações do curso (RF-CURSO-04: grade curricular/currículo e demais campos
   descritivos), sem navegar para outra URL/tela.
3. **Given** um curso expandido, **When** o usuário acessa o módulo de turmas daquele curso,
   **Then** vê as turmas filtráveis pelos 4 status reais (`Planejada`/`Ativa`/`Concluida`/
   `Cancelada` — Clarifications desta rodada, sem "Arquivada").
4. **Given** uma turma selecionada, **When** a lista de disciplinas é exibida, **Then** cada
   disciplina aparece como cartão com: código+nome, barra de progresso (CH concluída ÷ CH total),
   status de conclusão (Não Iniciada/Em Andamento/Concluída) e indicador de ritmo (Atrasada/No
   Prazo/Adiantada — cálculo novo, comparando execução até hoje contra o esperado pelo calendário
   previsto).
5. **Given** um cartão de disciplina, **When** o usuário clica, **Then** expande para o "Diário de
   Classe Detalhado": cronograma global (datas previstas × reais, reais via `FORMULA` de
   min/máx de `Data` em `registros_aula`) e painel de avaliações da disciplina (tipo,
   data prevista, data realizada, data de vista de prova) — **sem** tabela de Unidade de Ensino
   (Clarifications desta rodada, UE-1 fora de escopo).
6. **Given** uma disciplina sem nenhum registro de execução ainda, **When** o cartão expande,
   **Then** o cronograma global mostra "sem execução registrada ainda" em vez de uma data
   inválida/quebrada (RN-DEG-01).

---

### User Story 4 - Ocultar IDs de banco e usar dropdowns em todo formulário de relacionamento (Priority: P1)

Como qualquer usuário do sistema, quero que listagens mostrem nomes em vez de IDs de banco de dados,
e que formulários que referenciam outra entidade (disciplina, instrutor, curso, turma) sempre
ofereçam uma caixa de seleção pré-carregada, nunca um campo de texto livre, para não precisar saber
ou digitar um identificador técnico.

**Why this priority**: é o item 3 do pedido — a correção de dívida técnica mais concreta e menos
arriscada desta spec (troca de campo de entrada, não de arquitetura), incluindo um caso já
introduzido no próprio Épico H anterior a este.

**Independent Test**: abrir o lançamento manual de Aula (DSA) e confirmar que disciplina e
instrutor são selecionados por dropdown (nome visível, não texto livre de ID); auditar as demais
telas de listagem confirmando que nenhuma coluna exibe um `ID_` cru quando existe um nome
correspondente para o lookup.

**Acceptance Scenarios**:

1. **Given** o formulário de lançamento manual de Aula (`app/(app)/turmas/[turma]/dsa/page.tsx`), **When** o usuário abre o
   formulário, **Then** disciplina e instrutor são selecionados por `<select>` pré-carregado com
   nome (não `ID_Grade`/`ID_Instrutor` como texto livre) — substitui os dois `prompt()` de ID hoje
   existentes (achado desta spec, item 6 da Nota de escopo).
2. **Given** qualquer listagem do sistema que hoje relaciona um registro a outra entidade (ex.:
   instrutor de uma aula, disciplina de uma avaliação), **When** exibida, **Then** mostra o nome
   correspondente via lookup, nunca o ID cru — auditoria cobre pelo menos DSA, Avaliações,
   Cronograma, Disciplinas, Instrutores.
3. **Given** um formulário de cadastro/edição que referencia outra entidade, **When** aberto,
   **Then** o campo de relacionamento é uma caixa de pré-seleção inicializada com os dados do banco
   (via `AppState.ctx` já carregado, ou uma nova chamada de leitura quando a lista não estiver no
   contexto de boot), nunca um campo de texto livre para digitar um ID.
4. **Given** o cadastro de disciplina, **When** aberto, **Then** inclui os dois campos novos
   aprovados nesta rodada (`Tecnica_Ensino_Sugerida`, `Local_Padrao`), como campos de texto simples
   (não são relacionamento com outra entidade, não exigem dropdown).

---

### User Story 5 - Dashboards com Recharts (Priority: P2)

Como qualquer usuário do sistema, quero ver painéis de estatísticas com gráficos dinâmicos
(Recharts) baseados nos dados já existentes, para entender o panorama de Cursos, Disciplinas,
Instrutores e Turmas sem precisar somar manualmente.

**Why this priority**: entrega valor visual real, mas nenhuma outra User Story depende dela — pode
ser adicionada por cima da estrutura de cartões (US3) já pronta, sem bloquear nada.

**Independent Test**: abrir o painel de estatísticas de cada um dos 4 módulos (Cursos, Disciplinas,
Instrutores, Turmas), confirmar KPIs numéricos no topo, pelo menos um gráfico categórico e um
numérico/temporal por módulo, renderizados via Recharts.

**Acceptance Scenarios**:

1. **Given** o painel de estatísticas de Cursos, **When** carregado, **Then** exibe KPIs (total de
   cursos, total de turmas ativas) no topo, seguidos de pelo menos um gráfico categórico (cursos
   por classificação, pizza/donut ou barras horizontais) e um numérico (duração média por
   classificação, barras verticais) via Recharts.
2. **Given** o painel de estatísticas de Disciplinas, **When** carregado, **Then** exibe KPIs
   (total de disciplinas, concluídas, atrasadas, sem instrutor — já pedido por RF-MATERIAS-04) e
   pelo menos um gráfico correspondente.
3. **Given** o painel de estatísticas de Instrutores, **When** carregado, **Then** exibe KPIs
   (total de instrutores, ativos vs. inativos) e pelo menos um gráfico categórico (ex.: distribuição
   por Posto/Graduação ou por regime de trabalho).
4. **Given** o painel de estatísticas de Turmas, **When** carregado, **Then** exibe KPIs (total de
   turmas, por status) e pelo menos um gráfico categórico (turmas por status) e um numérico/
   temporal (ex.: turmas iniciadas por ano).
5. **Given** um volume de dados que ultrapasse ~2.000 linhas na aba de origem, **When** um painel
   calcula as estatísticas, **Then** a agregação roda no backend (Next.js), nunca baixando a
   aba inteira para o front-end calcular localmente.
6. **Given** qualquer um dos 4 painéis de estatísticas, **When** exibido, **Then** não exige
   filtros em cascata nem drill-down por clique (`DYN-01/02/03` fora de escopo desta spec,
   Assumption) — os gráficos são estáticos por módulo, recarregando só quando o usuário troca de
   tela/curso selecionado.

---

### Edge Cases

- Curso sem nenhuma turma ativa: não aparece nos carrosséis da Início (só cursos com turma em
  destaque resolvível), mas continua acessível pela Página do Curso/módulo de cursos diretamente.
- Turma sem nenhuma disciplina cadastrada: cartão de turma aparece, lista de disciplinas mostra
  aviso "nenhuma disciplina cadastrada" em vez de lista vazia sem explicação (RN-DEG-01).
- Disciplina com `Carga_Horaria_Tempos` zerada ou ausente: indicador de ritmo/progresso degrada
  para "sem base de cálculo" em vez de divisão por zero (mesmo padrão já usado em
  `calcularTeto_`/`acompanharEstudoIndividual_`).
- Sidebar retrátil em tela pequena (mobile): usa o comportamento responsivo nativo do Offcanvas do
  Tailwind CSS (overlay em vez de empurrar conteúdo), sem CSS customizado adicional (RF-DS-01/UI-01).
- Brasão/mascote sem arquivo de imagem fornecido: slot invisível, sem requisição de rede,
  documentado para Bernardo preencher depois (mesmo padrão do Épico A, agora 3 slots).
- Prompt de lançamento manual de Aula sem nenhum instrutor habilitado na disciplina escolhida: o
  dropdown de instrutor aparece vazio com aviso explícito, não trava o restante do formulário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE apresentar os 3 slots de identidade institucional (brasão do CIAARA,
  brasão da Marinha do Brasil, mascote da DHN) no cabeçalho, com degradação graciosa (sem `src`,
  invisível, sem requisição de rede) quando o arquivo de imagem não existir (RF-INI-05, mesmo
  padrão do Épico A).
- **FR-002**: O sistema DEVE substituir a navbar horizontal atual por uma sidebar retrátil
  (esquerda), preservando todos os pontos de entrada de navegação hoje existentes e a visibilidade
  condicionada por perfil já implementada (RF-DS-01/UI-05, RF-NAV-02, RF-AUTH-04).
- **FR-003**: O sistema DEVE apresentar um Painel Início com um carrossel de rolagem horizontal por
  classificação de curso (Regular/Especial/Expedito/Estágio de Qualificação/Aperfeiçoamento
  Avançado), com cards da turma em destaque de cada curso (RF-INI-01/02/03).
- **FR-004**: A resolução de qual turma é "a turma em destaque" de um curso com múltiplas turmas
  `Ativa` simultâneas DEVE acontecer no backend (mesma janela `Data_Inicio`–`Data_Termino` contendo
  a data corrente; empate resolvido pela `Data_Inicio` mais recente), nunca no front-end
  (04-appstate.md, regra candidata a `RN-TURMA-01`).
- **FR-005**: Cada card de turma no carrossel DEVE mostrar nome completo do curso, nome abreviado
  da turma, status e barra de progresso (CH executada ÷ CH total), reaproveitando o cálculo já
  usado pelo Cronograma/DSA — nenhuma segunda implementação desse cálculo.
- **FR-006**: Clicar num card de turma DEVE navegar para a Página do Curso correspondente,
  preservando o contexto de turma selecionada (RF-INI-03, RF-NAV-01/03).
- **FR-007**: O sistema DEVE apresentar Cursos como cartões agrupados por classificação, com
  informação básica por padrão, expandindo ao clicar para exibir todas as informações do curso
  (nome, classificação, duração, grade curricular) sem navegar para outra tela (RF-CURSOS-02,
  RF-CURSO-04).
- **FR-008**: Dentro de um curso, o sistema DEVE apresentar as disciplinas da turma selecionada
  como cartões com barra de progresso, status de conclusão (Não Iniciada/Em Andamento/Concluída) e
  indicador de ritmo (Atrasada/No Prazo/Adiantada) — compara CH executada até hoje contra a CH
  esperada até hoje pelo calendário previsto (`Previsao_Inicio`/`Previsao_Termino`), usando a mesma
  banda de tolerância de `classificarDensidade_` (`lib/acoes/cronograma.ts`, Épico G, Clarifications
  2026-08-15): abaixo de 90% do esperado = `Atrasada`; 90%–110% = `No Prazo`; acima de 110% =
  `Adiantada`. Cálculo novo, sem exigir coluna nova.
- **FR-009**: Clicar num cartão de disciplina DEVE expandir para o Diário de Classe Detalhado:
  cronograma global (datas previstas × reais, reais via `FORMULA` de min/máx de `Data` em
  `registros_aula`) e painel de avaliações da disciplina — **sem** tabela de Unidade
  de Ensino (Clarifications 2026-08-15, UE-1 fora de escopo).
- **FR-010**: O módulo de turmas DEVE filtrar pelos 4 status reais já existentes
  (`Planejada`/`Ativa`/`Concluida`/`Cancelada`) — sem o status "Arquivada" (Clarifications
  2026-08-15, TURMA-1 fora de escopo).
- **FR-011**: Nenhuma listagem do sistema DEVE exibir um identificador de banco de dados
  (`ID_Grade`, `ID_Instrutor`, `ID_Curso`, `ID_Turma` etc.) quando existir um nome correspondente
  para lookup — a listagem exibe o nome, nunca o ID cru.
- **FR-012**: Todo campo de formulário que referencia outra entidade (disciplina, instrutor, curso,
  turma) DEVE ser obrigatoriamente uma caixa de pré-seleção (`<select>`) inicializada com os dados
  do banco, nunca um campo de texto livre — inclui a correção do lançamento manual de Aula
  (`app/(app)/turmas/[turma]/dsa/page.tsx`, achado desta spec: hoje usa `prompt()` de texto livre para `ID_Grade`/
  `ID_Instrutor`).
- **FR-013**: O cadastro de disciplina DEVE incluir dois novos campos de texto simples,
  `Tecnica_Ensino_Sugerida` e `Local_Padrao` (Clarifications 2026-08-15, DISC-1 aprovado) —
  aditivos, sem impacto em nenhum cálculo existente.
- **FR-014**: O sistema DEVE apresentar painéis de estatísticas para os 4 módulos com cadastro
  (Cursos, Disciplinas, Instrutores, Turmas — Clarifications 2026-08-15, `03-design-system.md` §4),
  cada um com KPIs numéricos no topo, pelo menos um gráfico categórico (ENUM → pizza/donut ou
  barras horizontais) e um gráfico numérico/temporal (barras verticais, linha ou área), renderizados
  com **Recharts** como dependência versionada no `package.json` (UI-06, já pré-aprovado em `03-design-system.md`).
- **FR-015**: Quando o volume de dados de origem de uma estatística ultrapassar ~2.000 linhas, a
  agregação (contagem, soma, agrupamento) DEVE rodar no backend (Next.js) — o front-end nunca
  baixa a aba inteira para calcular localmente.
- **FR-016**: Nenhuma lógica de cálculo de backend já existente (CHD, tetos normativos, Cronograma,
  motor preditivo, motor de sugestão do DSA, RN- de qualquer risco) DEVE ser alterada por este
  épico — toda mudança é aditiva (novo cálculo de ritmo, novos campos de disciplina) ou de
  apresentação (cartões, dropdowns, gráficos sobre dados já calculados).

### Key Entities

- **`disciplinas`**: ganha dois campos aditivos, `Tecnica_Ensino_Sugerida` (TEXTO) e
  `Local_Padrao` (TEXTO) — DISC-1, aprovado nesta rodada.
- **Nenhuma outra entidade nova** — cartões, carrossel, sidebar e dashboards são composição de tela
  sobre dados já modelados (`cursos`, `turmas`, `disciplinas`,
  `registros_aula`, `avaliacoes`, `instrutores`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário abre o sistema e navega por todos os módulos hoje existentes usando
  exclusivamente a sidebar retrátil, sem perder nenhum ponto de entrada de navegação de antes.
- **SC-002**: O Painel Início mostra pelo menos um carrossel por classificação de curso com turma
  em destaque resolvida corretamente (inclusive no caso de curso com múltiplas turmas `Ativa`), e
  clicar num card leva à Página do Curso correta.
- **SC-003**: Cursos, Turmas e Disciplinas são navegáveis como cartões que expandem ao clicar, sem
  nenhuma navegação de página inteira para ver o detalhe.
- **SC-004**: Nenhuma tela do sistema exibe um `ID_` cru quando existe nome correspondente; todo
  formulário de relacionamento usa dropdown, comprovado inclusive no lançamento manual de Aula
  (achado concreto corrigido).
- **SC-005**: Os painéis de estatísticas dos 4 módulos (Cursos, Disciplinas, Instrutores, Turmas)
  renderizam KPIs e pelo menos dois gráficos cada via Recharts, com agregação de grandes volumes
  resolvida no backend.
- **SC-006**: A suíte de invariantes estruturais (`tests/`) não registra nenhuma regressão de
  cálculo — confirma FR-016 (zero alteração de lógica de backend).

## Assumptions

- Escopo desta spec = os 4 itens do pedido do usuário nesta sessão + os achados abertos resolvidos
  nas Clarifications — não as 10 seções inteiras do rascunho (Nota de escopo, itens 3-4).
- `RF-INI-04` (alertas consolidados no Painel Início) e as seções 9/10 do rascunho (central de
  notificações, propagação cruzada, gatilhos time-driven/cron) ficam fora desta spec, por
  instrução direta do usuário — candidatas a um épico futuro dedicado a alertas/notificações.
- `DYN-01/02/03` (filtros em cascata, drill-down por clique, menu de contexto por gráfico) ficam
  fora desta spec — o item 4 do pedido pede a biblioteca e os gráficos, não a interatividade
  completa de cross-filtering. Candidato a iteração futura sobre os dashboards desta spec.
- Paginação, `dirty checking` e hard-delete-com-confirmação-digitada (seção 6 do rascunho, além do
  item 3 do pedido) ficam fora — hard delete, em particular, contraria a convenção C-05 já decidida
  (`03-design-system.md` §6) e não é reaberto.
- UE-1 (tabela de Unidade de Ensino) e TURMA-1 (status "Arquivada") ficam fora desta rodada
  (Clarifications 2026-08-15) — ambos permanecem como achados abertos em `01-schema.md` §7 para
  decisão futura, não removidos do documento.
- Sidebar retrátil é implementada com o componente **Offcanvas nativo do Tailwind CSS + shadcn/ui** (já
  pinado como dependência versionada no `package.json`) — decisão de implementação equivalente à adoção de `data-bs-theme` no Épico A,
  não uma dependência nova.
- "Símbolo de cada curso" (rascunho §3) é um ícone lucide-react por classificação/curso, não uma
  imagem/brasão dedicada por curso — não há arquivo de símbolo por curso no repositório, e o
  rascunho não especifica a fonte desses símbolos.
