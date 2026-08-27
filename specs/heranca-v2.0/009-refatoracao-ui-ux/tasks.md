---

description: "Task list template for feature implementation"
---

# Tasks: Refatoração UI/UX e Conformidade de Dados (Correção de Dívida Técnica)

**Input**: Design documents from `specs/009-refatoracao-ui-ux/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-functions.md,
quickstart.md

**Tests**: Esta spec tem 2 alvos de teste objetivos e novos (nenhum stub `test.todo` pré-existente
— o projeto está com 0 desde o Épico H): `calcularRitmoDisciplina_`/`resolverTurmaEmDestaque_`
(funções puras, casos sintéticos) e as 4 agregações de `lib/acoes/estatisticas.ts` (casos sintéticos de
contagem/agrupamento). Componentes puramente visuais (sidebar abre/fecha, carrossel rola, cartão
expande, dropdown popula, gráfico renderiza) não são testáveis por `pnpm vitest run` — ficam para o
teste de aceite ao vivo em `quickstart.md`, mesmo critério de todo épico de frontend anterior desta
sessão (A, B, G, H).

**Organization**: Tarefas agrupadas pelas 5 User Stories do spec.md, em ordem de prioridade (US1-4
são P1, US5 é P2). US1 é a fundação estrutural (sidebar) sobre a qual as demais são construídas —
mesmo raciocínio já registrado na spec ("Why this priority" de US1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo com outras tarefas `[P]` da mesma fase (arquivos diferentes)
- **[Story]**: A qual User Story a tarefa pertence (US1..US5)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js: `lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts`,
`docs/arquitetura/*.md`.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e registrar a contagem atual de pass/fail/todo como
      baseline (esperado: 163 tests, 163 pass, 0 fail, 0 todo — herdado do Épico H).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o único dado que duas User Stories (US2 e US3) precisam igualmente — construído uma
vez, nunca duplicado.

- [X] T002 Em `app/layout.tsx` + `lib/supabase/server.ts`` (`getContextoInicial`): cada item de `ctx.cursos` ganha
      `classificacao` (`cursos.Classificacao`) e `status` (`cursos.Status`) — leitura
      direta, sem cálculo (research.md achado 3). Usado por US2 (agrupamento do carrossel) e US3
      (cartões de curso agrupados por classificação, RF-CURSOS-02).

**Checkpoint**: `ctx.cursos` já carrega classificação/status — US2 e US3 podem começar.

---

## Phase 3: User Story 1 - Identidade visual completa e navegação por sidebar (Priority: P1) 🎯 MVP

**Goal**: sidebar retrátil (Offcanvas Tailwind CSS) substituindo a navbar horizontal, com os 3 slots
de identidade institucional — fundação estrutural para as demais User Stories.

**Independent Test**: quickstart.md, passo 1 — abrir/fechar a sidebar, navegar por todos os itens
de menu hoje existentes, confirmar visibilidade por perfil preservada.

### Implementação da User Story 1

- [X] T003 [US1] Em `app/globals.css`: componente `.sidebar-offcanvas` (ajustes visuais
      sobre o `.offcanvas` nativo do Tailwind CSS — cor primária `#003366` no cabeçalho da sidebar,
      largura, nada que o Tailwind CSS não resolva sozinho via classe utilitária — RF-DS-01/UI-01).
- [X] T004 [US1] Em `app/layout.tsx`: substituir a `<nav class="navbar">` atual por um
      botão de alternância (`data-bs-toggle="offcanvas"`) + `<div class="offcanvas offcanvas-start"
      id="sidebarPrincipal">` contendo a mesma `<ul class="nav">` de hoje (mesmos `onclick="irPara(...)
      "`, mesmos itens condicionados por perfil via `aplicarVisibilidadeMenuPorPerfil`) — nenhuma
      mudança de `irPara`/roteamento (RF-NAV-02, fora de escopo o Router do Épico D).
- [X] T005 [US1] Em `app/layout.tsx` (mesmo arquivo de T004): expandir o slot único de
      brasão (`#brasaoCiaara`) para 3 slots — CIAARA, Marinha do Brasil, mascote da DHN — mesmo
      padrão de degradação graciosa do Épico A (sem `src`, `style="display:none"`, comentário para
      Bernardo preencher os 3 arquivos) — RF-INI-05.
- [X] T006 [US1] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 1 de `quickstart.md`.

**Checkpoint**: sidebar retrátil funcionando com todos os pontos de entrada de hoje preservados —
fundação pronta para US2/US3 navegarem através dela.

---

## Phase 4: User Story 2 - Painel Início com carrossel de turmas por modalidade (Priority: P1)

**Goal**: Painel Início novo, com um carrossel por classificação de curso e a turma em destaque de
cada curso resolvida no backend.

**Independent Test**: quickstart.md, passo 2 — carrossel por classificação, turma em destaque
correta (inclusive caso de múltiplas turmas `Ativa`), clique navega para a Página do Curso.

### Implementação da User Story 2

- [X] T007 [US2] Em `app/layout.tsx` + `lib/supabase/server.ts``: `resolverTurmaEmDestaque_(turmasDoCurso, hoje)` —
      função pura (research.md achado 3): turma `Status=Ativa` cuja janela `Data_Inicio`–
      `Data_Termino` contém `hoje`; empate resolvido pela `Data_Inicio` mais recente; `null` se
      nenhuma (FR-004).
- [X] T008 [US2] Em `app/layout.tsx` + `lib/supabase/server.ts`` (`getContextoInicial`): para cada curso, chamar
      `resolverTurmaEmDestaque_` e montar `ctx.turmasEmDestaque = {idCurso: {idTurma, nome, status,
      progresso}}`. **Achado do `/speckit-analyze` (2026-08-16, H1)**: `totalizadoresDaTurma_`/
      `getCronograma` cada um faz sua própria leitura completa de `registros_aula`
      (1.500+ linhas) — chamar qualquer um deles uma vez por curso dentro de `getContextoInicial`
      (rodado a cada boot de cada sessão) multiplicaria essa leitura por N cursos. Em vez disso: ler
      `registros_aula` **uma única vez** aqui, e calcular `progresso` (CH executada ÷
      CH total das disciplinas do curso) de todas as turmas em destaque a partir desse único array
      em memória — mesma fórmula de `totalizadoresDaTurma_`, sem reimplementar o cálculo, só sem
      repetir a leitura da aba (FR-004/005).
- [X] T009 [P] [US2] Criar `app/(app)/inicio/page.tsx`: carrossel de rolagem horizontal
      (scroll-snap, `UI-05`) por classificação de curso (Regular/Especial/Expedito/Estágio de
      Qualificação/Aperfeiçoamento Avançado), cards de `ctx.turmasEmDestaque` com nome do curso,
      turma abreviada, status e barra de progresso (RF-INI-01/02/03).
- [X] T010 [US2] Em `app/(app)/inicio/page.tsx` (mesmo arquivo de T009): clique no card navega
      para `tabCurso` com a turma já selecionada em `AppState` (RF-INI-03, RF-NAV-01/03).
- [X] T011 [US2] Em `app/layout.tsx`: item de menu "Início" (`onclick="irPara('tabInicio')
      "`) + `<div data-view="tabInicio"><?!= include('ViewInicio'); ?></div>`; rota padrão do boot
      passa de `'tabExtra'` para `'tabInicio'` (linha do `DOMContentLoaded`/`irPara(window.location.
      hash... || 'tabInicio')`).
- [X] T012 [US2] Criar `tests/unidade/regras_ui_dados.test.ts`: testes de `resolverTurmaEmDestaque_` —
      turma única ativa, duas turmas ativas simultâneas (empate por `Data_Inicio` mais recente),
      nenhuma turma ativa (retorna `null`), turma ativa fora da janela corrente (não é escolhida).
- [X] T013 [US2] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 2 de `quickstart.md`.

**Checkpoint**: Painel Início funcionando como novo ponto de entrada padrão do sistema.

---

## Phase 5: User Story 3 - Cartões expansíveis de Curso, Turma e Disciplina (Priority: P1)

**Goal**: `app/(app)/cursos/[curso]/page.tsx` reconstruída como cartões que expandem, com o indicador de ritmo novo e
o Diário de Classe Detalhado (sem tabela de UE).

**Independent Test**: quickstart.md, passo 3 — cursos como cartões que expandem, turmas filtráveis
pelos 4 status reais, disciplinas com barra de progresso/status/ritmo, cartão de disciplina expande
para cronograma global + painel de avaliações.

### Implementação da User Story 3

- [X] T014 [US3] Em `lib/acoes/cronograma.ts`: `calcularRitmoDisciplina_(chExecutada, chTotal,
      previsaoInicio, previsaoTermino, hoje)` — função pura (research.md achado 4): calcula
      `esperadoAteHoje = chTotal × (dias decorridos ÷ dias totais da janela)`, clampado a
      `[0, chTotal]`, delega a `classificarDensidade_` já existente (banda 90%–110%, Clarifications
      2026-08-15) — nunca duplica a banda (FR-008). **Achado do `/speckit-analyze` (2026-08-16,
      M2)**: além de `chTotal` zerado/ausente (já previsto, RN-DEG-01), a janela também pode ser
      inválida (`previsaoTermino <= previsaoInicio`, dados nunca preenchidos ou invertidos) — nesse
      caso, "dias totais da janela" seria zero/negativo; degradar para "sem base de cálculo" (mesmo
      padrão de `calcularTeto_`), nunca `NaN`/`Infinity`.
- [X] T015 [US3] Em `lib/acoes/cronograma.ts`: `getDisciplinasDaTurmaComRitmo(idTurma)` — para
      cada disciplina da turma, `chExecutada`/`chTotal`/`statusConclusao` (Não Iniciada/Em
      Andamento/Concluída) + `ritmo` (via T014) — reaproveita a mesma agregação de execução já
      usada por `getCronograma` (FR-008, RF-CURSO-03).
- [X] T016 [US3] Em `lib/acoes/cronograma.ts`: `getCronogramaGlobalDisciplina(idGrade, idTurma)`
      — `{previsaoInicio, previsaoTermino, dataRealInicio, dataRealTermino}`, as duas últimas via
      `FORMULA` de leitura (mín./máx. de `Data` em `registros_aula` filtrado por
      `ID_Grade`+`ID_Turma`, mesmo princípio de `avaliacoes.Status_Vista`, DISC-2) — `null` quando
      não houver execução ainda (RN-DEG-01) (FR-009).
- [X] T017 [US3] Em `app/(app)/cursos/[curso]/page.tsx`: reconstruir como cartões de curso agrupados por
      `classificacao` (`ctx.cursos`, T002), resumo por padrão, expandindo ao clicar para exibir
      grade curricular/informações completas (RF-CURSOS-02, RF-CURSO-04) — mantém os blocos de
      teto/Estudo Individual já existentes (Épicos E/I) dentro do curso expandido, sem removê-los.
- [X] T018 [US3] Em `app/(app)/cursos/[curso]/page.tsx` (mesmo arquivo de T017): dentro do curso
      expandido, módulo de turmas filtrável pelos 4 status reais (`Planejada`/`Ativa`/`Concluida`/
      `Cancelada`, Clarifications 2026-08-15 — sem "Arquivada").
- [X] T019 [US3] Em `app/(app)/cursos/[curso]/page.tsx` (mesmo arquivo): ao selecionar uma turma, cartões
      de disciplina (`getDisciplinasDaTurmaComRitmo`, T015) com barra de progresso, status de
      conclusão e badge de ritmo (Atrasada/No Prazo/Adiantada).
- [X] T020 [US3] Em `app/(app)/cursos/[curso]/page.tsx` (mesmo arquivo): clique no cartão de disciplina
      expande para o Diário de Classe Detalhado — cronograma global (`getCronogramaGlobalDisciplina`,
      T016, "sem execução registrada ainda" quando `null`) + painel de avaliações da disciplina
      (reaproveita dado já exposto por `app/(app)/avaliacoes/page.tsx`/`getPainelavaliacoesCurso`, sem tabela
      de Unidade de Ensino — Clarifications 2026-08-15, UE-1 fora de escopo).
- [X] T021 [US3] Em `tests/unidade/regras_ui_dados.test.ts`: testes de `calcularRitmoDisciplina_` — 3 casos
      (Atrasada/No Prazo/Adiantada) cobrindo a banda 90%–110%; caso de `chTotal` zerado/ausente
      degradando para "sem base de cálculo" (RN-DEG-01); e caso de janela inválida
      (`previsaoTermino <= previsaoInicio`) também degradando para "sem base de cálculo", nunca
      `NaN`/`Infinity` (achado do `/speckit-analyze` 2026-08-16, M2).
- [X] T022 [US3] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 3 de `quickstart.md`.

**Checkpoint**: Cursos/Turmas/Disciplinas navegáveis como cartões, com ritmo e Diário de Classe
funcionando.

---

## Phase 6: User Story 4 - Ocultar IDs de banco e usar dropdowns em todo formulário de relacionamento (Priority: P1)

**Goal**: fechar os 3 achados concretos de dívida técnica (2 em `app/(app)/instrutores/page.tsx`, 1 em
`app/(app)/turmas/[turma]/dsa/page.tsx`) + DISC-1.

**Independent Test**: quickstart.md, passo 4 — lançamento manual de Aula com dropdowns, tabela de
Instrutores sem coluna de ID, vínculo de habilitação com dropdown de disciplina, cadastro de
disciplina com os 2 campos novos.

### Implementação da User Story 4

- [X] T023 [US4] Em `app/(app)/turmas/[turma]/dsa/page.tsx` (`abrirLancarAula`): substituir os `prompt()` de
      `ID_Grade`/`ID_Instrutor` por dois `<select>` — disciplinas do curso da turma selecionada
      (via `listarDisciplinas()`, já existe) e instrutores habilitados na disciplina escolhida (via
      `listarInstrutores()` + `instrutor_disciplina`, ou reaproveitando o mesmo padrão de filtro já
      usado em `app/(app)/instrutores/page.tsx`) — nenhuma mudança na assinatura de `lancarAula` (research.md
      achado 1, FR-012).
- [X] T024 [P] [US4] Em `app/(app)/instrutores/page.tsx`: remover a coluna `ID_Instrutor` da
      tabela de instrutores (linha hoje com `<td>${i.ID_Instrutor}</td>`) — mantém só nome/status/
      ações (FR-011, research.md achado 1).
- [X] T025 [US4] Em `app/(app)/instrutores/page.tsx` (mesmo arquivo): trocar o campo de texto
      livre `vincGrade` (vínculo de habilitação) por `<select>` populado por `listarDisciplinas()`
      — nenhuma mudança em `criarVinculoHabilitacao` (já valida `ID_Grade` server-side, research.md
      achado 2, FR-012).
- [X] T026 [P] [US4] Auditar `app/(app)/avaliacoes/page.tsx`, `app/(app)/cronograma/page.tsx`, `app/(app)/disciplinas/page.tsx`
      quanto a colunas de ID cru em listagem — corrigir qualquer achado adicional (FR-011); nenhum
      achado conhecido de antemão nestes três, é varredura confirmatória.
- [X] T027 [US4] Em `app/(app)/disciplinas/page.tsx`: acrescentar os 2 campos novos aprovados
      (DISC-1, Clarifications 2026-08-15) — `Tecnica_Ensino_Sugerida` e `Local_Padrao`, texto
      simples, sem `<select>` (não são relacionamento com outra entidade) (FR-013).
- [X] T028 [US4] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 4 de `quickstart.md`.

**Checkpoint**: os 3 achados concretos de dívida técnica fechados; DISC-1 disponível no cadastro de
disciplina.

---

## Phase 7: User Story 5 - Dashboards com Recharts (Priority: P2)

**Goal**: 4 painéis de estatística (Cursos/Disciplinas/Instrutores/Turmas) com KPIs + gráficos via
Recharts, agregação no backend.

**Independent Test**: quickstart.md, passo 5 — cada um dos 4 painéis com KPIs + pelo menos 2
gráficos, nenhum baixando a aba inteira para o front-end.

### Implementação da User Story 5

- [X] T029 [US5] Em `app/globals.css`: incluir Recharts como dependência versionada no `package.json`
      (`https://cdn.jsdelivr.net/npm/apexcharts`) — única dependência nova do projeto, já
      pré-aprovada (UI-06, `03-design-system.md`).
- [X] T030 [US5] Em `components/ciaara/`: `renderizarGrafico_(elementoId, tipo, categorias,
      series)` — helper único de inicialização do Recharts, reutilizado pelos 4 painéis
      (research.md achado 6, nenhuma duplicação de opções entre módulos).
- [X] T031 [P] [US5] Criar `lib/acoes/estatisticas.ts`: `getEstatisticasCursos()` —
      `{kpis: {totalCursos, totalTurmasAtivas}, porClassificacao: [...], duracaoMediaPorClassificacao:
      [...]}`, agregação em memória sobre `cursos`/`turmas` (RF-CURSOS-02, FR-014/015).
- [X] T032 [US5] Em `lib/acoes/estatisticas.ts` (mesmo arquivo de T031): `getEstatisticasDisciplinas()`
      — `{kpis: {total, concluidas, atrasadas, semInstrutor}, porStatus: [...]}` (RF-MATERIAS-04,
      FR-014/015).
- [X] T033 [US5] Em `lib/acoes/estatisticas.ts` (mesmo arquivo): `getEstatisticasInstrutores()` —
      `{kpis: {total, ativos, inativos}, porPostoGraduacao: [...]}` (FR-014/015).
- [X] T034 [US5] Em `lib/acoes/estatisticas.ts` (mesmo arquivo): `getEstatisticasTurmas()` —
      `{kpis: {total, ativas}, porStatus: [...], porAnoInicio: [...]}` (FR-014/015).
- [X] T035 [P] [US5] Em `app/(app)/cursos/[curso]/page.tsx`: painel de estatísticas de Cursos (KPIs +
      gráfico categórico "cursos por classificação" + numérico "duração média por classificação",
      via `renderizarGrafico_`) — aba/bloco superior dedicado, não substitui os cartões de curso já
      existentes (T017-T020).
- [X] T036 [P] [US5] Em `app/(app)/disciplinas/page.tsx`: painel de estatísticas de Disciplinas
      (KPIs + gráfico correspondente).
- [X] T037 [P] [US5] Em `app/(app)/instrutores/page.tsx`: painel de estatísticas de Instrutores
      (KPIs + gráfico de distribuição por Posto/Graduação).
- [X] T038 [P] [US5] Em `app/(app)/cursos/[curso]/page.tsx`: bloco de estatísticas de Turmas, junto ao
      módulo de turmas de T018 (mesmo arquivo — achado do `/speckit-analyze` 2026-08-16, M1: local
      único decidido agora, não deixado em aberto para a implementação) — KPIs + gráfico por status
      + numérico/temporal por ano de início.
- [X] T039 [US5] Em `tests/unidade/regras_ui_dados.test.ts`: testes sintéticos das 4 agregações de
      `lib/acoes/estatisticas.ts` (contagem por classificação/status/posto, cálculo de duração média) — casos
      sintéticos, sem mock de planilha (mesmo padrão de `lib/dominio/regras-normativas.ts`).
- [X] T040 [US5] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 5 de `quickstart.md`.

**Checkpoint**: todas as 5 User Stories completas e independentemente funcionais.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T041 [P] Bump de `o SHA do commit` para `'2026-08-16.REFUX.1'` em `lib/supabase/server.ts` e
      `app/layout.tsx` — tarefa explícita (mesmo padrão adotado desde o Épico H).
- [X] T042 Rodar `pnpm vitest run` (suíte completa) uma última vez e confirmar zero
      regressão de cálculo (FR-016) — só os testes novos desta spec aparecem como passe adicional.
      **Confirmado: baseline 163 testes/163 passam → final 176 testes, 176 passam, 0 falham, 0
      todo.**
- [X] T043 Rodar `quickstart.md` do passo 1 ao 6 em sequência, como checagem final combinada.
      **Alvos testáveis por `pnpm vitest run` (resolverTurmaEmDestaque_, calcularRitmoDisciplina_,
      `lib/acoes/estatisticas.ts`) confirmados estaticamente; os demais passos (sidebar, carrossel, cartões
      expansíveis, dropdowns, gráficos Recharts no navegador) ficam para o teste de aceite ao
      vivo, mesmo protocolo de todo épico de frontend anterior desta sessão.**
- [X] T044 Atualizar `docs/arquitetura/02-modularizacao.md`: marcar `lib/acoes/estatisticas.ts` (novo) e
      `app/(app)/inicio/page.tsx` (novo) como construídos; ``app/layout.tsx` + `lib/supabase/server.ts`/`lib/acoes/cronograma.ts`/`app/(app)/cursos/[curso]/page.tsx``/
      `app/(app)/instrutores/page.tsx`/`app/(app)/disciplinas/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` como estendidos/ajustados nesta
      rodada, com a última alteração citando este épico.
- [X] T045 Atualizar `docs/arquitetura/01-schema.md` §7: marcar DISC-1 como aprovado e implementado
      (Clarifications 2026-08-15); UE-1 e TURMA-1 permanecem como achados abertos, sem alteração de
      status — não foram aprovados nesta rodada.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. **Bloqueia US2 e US3** — ambas leem
  `ctx.cursos[].classificacao` (T002).
- **User Story 1 (Phase 3)**: depende só do Setup — não depende de T002 (sidebar é estrutura de
  navegação, não consome classificação de curso). **Estrutural para as demais**: US2-US5 navegam
  através da sidebar construída aqui, mas nenhuma delas tem dependência de *código* bloqueante — só
  de fluxo de uso/teste manual.
- **User Story 2 (Phase 4)**: depende do Foundational (T002) e, para o teste manual completo (clique
  no card leva à Página do Curso), de US1 já existir como navegação — mas o código de T007-T012 não
  depende de nenhum arquivo de US1.
- **User Story 3 (Phase 5)**: depende do Foundational (T002, `classificacao` para agrupar cartões de
  curso). Não depende de US2.
- **User Story 4 (Phase 6)**: independente de US2/US3 — toca arquivos diferentes
  (`app/(app)/turmas/[turma]/dsa/page.tsx`/`app/(app)/instrutores/page.tsx`/`app/(app)/disciplinas/page.tsx`).
- **User Story 5 (Phase 7)**: depende de US3 (T017, `app/(app)/cursos/[curso]/page.tsx` já reconstruída como cartões)
  para T035/T038 terem onde inserir o painel de estatísticas de Cursos/Turmas sem conflito de
  merge; T036/T037 (Disciplinas/Instrutores) são independentes de US3.
- **Polish (Phase 8)**: depende de todas as User Stories completas.

### Parallel Opportunities

- Foundational: T002 é tarefa única, sem paralelismo interno.
- US1: T003 (`app/globals.css`) pode começar em paralelo com T004/T005 (`app/layout.tsx`), unindo no
  final; T004 e T005 tocam o mesmo arquivo — rodar em série se feito por uma única pessoa/agente.
- US2: T009 (`app/(app)/inicio/page.tsx`) depois que T007/T008 definirem a forma de `ctx.turmasEmDestaque`.
- US3: T017-T020 tocam o mesmo arquivo (`app/(app)/cursos/[curso]/page.tsx`) — rodar em série; T014-T016 (backend,
  `lib/acoes/cronograma.ts`) podem ser feitas em paralelo entre si antes disso.
- US4: T023 (`app/(app)/turmas/[turma]/dsa/page.tsx`), T024/T025 (`app/(app)/instrutores/page.tsx`, mesmo arquivo — série entre si),
  T026 (arquivos de auditoria) e T027 (`app/(app)/disciplinas/page.tsx`) — todos em arquivos diferentes entre
  grupos, paralelizáveis entre si.
- US5: T031-T034 (mesmo arquivo `lib/acoes/estatisticas.ts` — série entre si); T035-T038 (4 arquivos/blocos
  de frontend diferentes) paralelizáveis entre si, depois que T029/T030 (infra Recharts) e as
  funções de backend correspondentes existirem. **Risco de merge**: T035/T038 tocam
  `app/(app)/cursos/[curso]/page.tsx`, o mesmo arquivo de T017-T020 (US3) — rodar depois que US3 estiver completo,
  mesmo achado de risco já registrado nos Épicos A/H para arquivos compartilhados entre User
  Stories.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational (T001-T002).
2. User Story 1 (T003-T006) — sidebar retrátil funcionando, identidade visual completa.
3. **PARAR E VALIDAR**: `quickstart.md` passo 1.
4. Deploy via `o fluxo Git → Vercel` se aprovado — já é valor real (navegação padronizada + identidade
   institucional), mesmo sem carrossel/cartões/dropdowns/dashboards ainda.

### Entrega Incremental

1. Setup + Foundational → base compartilhada pronta (classificação de curso em `ctx`).
2. US1 (sidebar + identidade, MVP) → validar → deploy/demo.
3. US2 (Painel Início + carrossel) → validar → deploy/demo.
4. US3 (cartões de Curso/Turma/Disciplina + ritmo + Diário de Classe) → validar → deploy/demo.
5. US4 (dropdowns + ocultar IDs — pode rodar em paralelo com US2/US3 por tocar arquivos
   diferentes, se houver mais de um agente/pessoa) → validar → deploy/demo.
6. US5 (dashboards Recharts, depende de US3 para 2 dos 4 painéis) → validar → deploy final.
7. Polish (o SHA do commit, checagem combinada, reconciliação do mapa de arquitetura e do achado DISC-1).

---

## Notes

- `[P]` = arquivos diferentes ou funções independentes no mesmo arquivo, sem conflito de merge real.
- `[Story]` mapeia cada tarefa a uma User Story do spec.md para rastreabilidade.
- Única alteração física de schema: `disciplinas` +2 colunas aditivas (DISC-1, T027) — ação de
  Bernardo na banco de produção antes de T027 poder gravar os campos novos (mesmo protocolo de toda
  coluna aditiva anterior: header-driven, sem migração de código).
- Única dependência nova do projeto: Recharts como dependência versionada no `package.json` (T029) — já pré-aprovada, não uma exceção a
  negociar durante a implementação.
- Zero alteração de lógica de cálculo já existente (FR-016) — todo cálculo novo desta spec
  (`calcularRitmoDisciplina_`, `resolverTurmaEmDestaque_`, agregações de `lib/acoes/estatisticas.ts`) é
  aditivo, nunca substitui uma função já testada.
- Rodar `pnpm vitest run` depois de cada fase concluída, não só nos checkpoints
  explicitamente listados.
- Commit por tarefa ou grupo lógico de tarefas da mesma User Story (constitution, Princípio VI);
  cada commit cita `RF-INI-0x`/`RF-CURSO-0x`/`RF-DS-0x`/etc. (constitution, Princípio VIII).
