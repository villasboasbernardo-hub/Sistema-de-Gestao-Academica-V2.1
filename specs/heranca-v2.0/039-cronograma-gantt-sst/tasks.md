---

description: "Task list for Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma"
---

# Tasks: Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

**Input**: Design documents from `/specs/039-cronograma-gantt-sst/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos para toda função pura/com efeito de leitura, mesmo padrão já usado em toda
spec desta sessão (`tests/unidade/regras_cronograma.test.ts` para `.ts`, `tests/unidade/regras_ui_dados.test.ts`
para funções puras de `.html`). Funções que só chamam `Recharts`/tocam o DOM
(`renderizarGanttRangeBar_`, orquestradores de renderização) não são unit-testáveis pelo harness
atual — mesmo caso já existente de `renderizarGrafico_`, sem nenhum teste na suíte — validadas
manualmente via `quickstart.md`.

**Organization**: 5 User Stories, todas P1. `app/(app)/cronograma/page.tsx` é reescrito quase por completo e
é tocado por praticamente toda tarefa de US — tarefas na mesma seção do mesmo arquivo NUNCA são
`[P]` entre si, mesmo quando logicamente independentes (evita conflito de edição sequencial).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos distintos, sem dependência)
- **[Story]**: US1 (rótulo de Turma) · US2 (Gantt ano vigente) · US3 (filtros avançados) · US4
  (Gantt substitui grade/CSV/impressão) · US5 (Gantt cobre ano futuro/motor preditivo)

## Path Conventions

Backend: `lib/acoes/cronograma.ts` (US5). Frontend: `components/ciaara/` (Foundational),
`app/`app/(app)/cronograma/page.tsx`` (US1-US5, quase por completo). Testes:
`tests/unidade/regras_cronograma.test.ts`, `tests/unidade/regras_ui_dados.test.ts`.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura de renderização de Gantt compartilhada por US2 (ano vigente) e US5
(ano futuro) — nenhuma das duas consegue desenhar nada sem isso.

**⚠️ CRITICAL**: bloqueia US2 e US5 (não bloqueia US1, que é só rótulo de dropdown)

- [ ] T001 [P] Em `components/ciaara/`, adicionar `renderizarGanttRangeBar_(elementoId,
  categorias, series)` — novo helper, aditivo, `renderizarGrafico_` intocada (research.md §4).
  `options = { chart: { type: 'rangeBar', height: 40 + categorias.length * 40 },
  plotOptions: { bar: { horizontal: true } }, series: [{ data: series }], xaxis: { type:
  'datetime' } }`; reaproveita o registro `_instanciasGraficos` já existente (destroy+recriar por
  `elementoId`, mesmo padrão de `renderizarGrafico_`) — necessário porque haverá 1 instância por
  Turma (US2) ou 1 instância por Curso (US5) simultaneamente
- [ ] T002 [P] Em `app/(app)/cronograma/page.tsx`, adicionar função pura
  `montarSerieGanttTurma_(barras)` — recebe array de `{ nome, inicio, termino }` (formato comum a
  `BarraGanttVigente`/`BarraGanttFutura`, `data-model.md` §1/§2), retorna `{ categorias:
  string[], series: Array<{x: string, y: [number, number]}> }` (`categorias` = `barras.map(b =>
  b.nome)`, `series` = `barras.map(b => ({ x: b.nome, y: [new Date(b.inicio).getTime(), new
  Date(b.termino).getTime()] }))`) — usada tanto por US2 (1 chamada por Turma) quanto por US5 (1
  chamada para o Curso inteiro)
- [ ] T003 Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para `montarSerieGanttTurma_`
  (novo `sandboxCronograma_`, mesmo padrão de `sandboxDisciplinas_`): array de 3 barras → 3
  categorias na mesma ordem, `y` bate com `Date.parse` de `inicio`/`termino`; array vazio →
  `{ categorias: [], series: [] }`, nunca exceção (depends on T002)

**Checkpoint**: `renderizarGanttRangeBar_`/`montarSerieGanttTurma_` prontos e testados — US2 e US5
podem começar.

---

## Phase 2: User Story 1 - Nomenclatura de Turma idêntica entre Cronograma e Disciplinas (Priority: P1)

**Goal**: dropdown de Turma do Cronograma mostra os mesmos rótulos de Disciplinas
("Turma \<Ano\>"/"Turma \<NN\>/\<Ano\>"), nunca o nome cru do curso.

**Independent Test**: `quickstart.md` Passo 1 — comparar rótulos do dropdown de Turma entre os 2
módulos para o mesmo Curso.

### Implementação da User Story 1

- [ ] T004 [US1] Em `app/(app)/cronograma/page.tsx`, duplicar a função pura `rotuloTurma_`
  (idêntica a ``app/(app)/disciplinas/page.tsx`:241`, gotcha de escopo entre `.html` — `spec.md` Verificação de
  Premissa item 1) — `rotuloTurma_(turmasMesmoAno, turma)`: sem `turma.anoLetivo` retorna
  `turma.nome || turma.idTurma`; 1 turma no ano retorna `"Turma ${turma.anoLetivo}"`; 2+ retorna
  `"Turma ${NN}/${turma.anoLetivo}"` (`NN` = 2 dígitos extraídos de `turma.turma`)
- [ ] T005 [US1] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` (`sandboxCronograma_`) para
  `rotuloTurma_`: 1 turma no ano → `"Turma <Ano>"`; 2+ turmas mesmo ano → `"Turma NN/Ano"` cada;
  `anoLetivo` vazio → degrada para `turma.nome`/`turma.idTurma` (depends on T004)
- [ ] T006 [US1] Em `app/(app)/cronograma/page.tsx`, reescrever `popularTurmasDoCursoCronograma`
  — agrupar `AppState.ctx.turmas` filtradas por `idCurso` por `anoLetivo` (mesmo padrão de
  `popularTurmasDisciplinas_`, ``app/(app)/disciplinas/page.tsx`:286`), usar `rotuloTurma_(grupoMesmoAno, t)` no
  texto de cada `<option>` em vez de `t.nome || t.idTurma` (depends on T004)

**Checkpoint**: rótulos de Turma idênticos entre os 2 módulos — testável e entregável isoladamente
(a grade antiga ainda funciona normalmente neste ponto, US4 ainda não a removeu).

---

## Phase 3: User Story 2 - Gráfico de Gantt da linha do tempo das disciplinas (Priority: P1)

**Goal**: selecionar um Curso (com ou sem Turma) no ano vigente desenha 1 Gantt por Turma
(empilhados), 1 barra por disciplina, início/término batendo com o Módulo de Disciplinas.

**Independent Test**: `quickstart.md` Passo 2 — Turma com 3+ disciplinas com datas diferentes → 3+
barras corretas; Curso sem Turma → 1 Gantt por Turma.

### Implementação da User Story 2

- [ ] T007 [US2] Em `app/(app)/cronograma/page.tsx`, adicionar função pura
  `montarBarrasGanttVigente_(linhasAnoVigente, disciplinaPorGrade)` — recebe o retorno de
  `gs('getDisciplinasAnoVigente', ano)` (já existente, zero mudança de backend) e um mapa
  `ID_Grade → linha de disciplinas` (de `gs('listarDisciplinas')`, mesmo padrão de
  ``app/(app)/disciplinas/page.tsx`:212-214`); retorna array de `BarraGanttVigente` (`data-model.md` §1) —
  `nome` = `disciplinaPorGrade[l.ID_Grade].Nome_Disciplina` (fallback `l.ID_Grade`), `inicio`/
  `termino` = `l.Previsao_Inicio`/`l.Previsao_Termino`; **exclui** (FR-004) linhas sem `inicio` OU
  sem `termino` OU com `inicio > termino` (comparação de string ISO `yyyy-MM-dd`, comparável
  lexicograficamente)
- [ ] T008 [US2] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` (`sandboxCronograma_`) para
  `montarBarrasGanttVigente_`: linha com as 2 datas presentes e `inicio<termino` → 1 barra, `nome`
  do join; linha sem `Previsao_Termino` → excluída; linha com `Previsao_Inicio > Previsao_Termino`
  → excluída; `ID_Grade` ausente de `disciplinaPorGrade` → `nome` degrada para `ID_Grade` (depends
  on T007)
- [ ] T009 [US2] Em `app/(app)/cronograma/page.tsx`, adicionar `carregarGanttVigente_(idCurso,
  idTurma, ano)` — `Promise.all([gs('getDisciplinasAnoVigente', ano), gs('listarDisciplinas')])`,
  filtra as linhas por `idCurso` (e por `idTurma` quando informado), monta `disciplinaPorGrade`,
  chama `montarBarrasGanttVigente_` (T007), retorna as `BarraGanttVigente` resultantes (depends on
  T007)
- [ ] T010 [US2] Em `app/(app)/cronograma/page.tsx`, adicionar `renderizarGanttPorTurma_(barras)`
  — agrupa `barras` por `idTurma`; para cada grupo, resolve o rótulo via `rotuloTurma_` (T004,
  turmas do mesmo ano vindas de `AppState.ctx.turmas`), cria/atualiza 1 `<div>` com cabeçalho
  "Turma \<rótulo\>" + 1 container `id="gantt-turma-${idTurma}"`, chama
  `montarSerieGanttTurma_(grupo)` (T002) e `renderizarGanttRangeBar_('gantt-turma-' + idTurma,
  categorias, series)` (T001); sem nenhuma barra → mensagem "nenhuma disciplina" (mesma classe de
  aviso já usada no restante do sistema) (depends on T001, T002, T004, T009)
- [ ] T011 [US2] Em `app/(app)/cronograma/page.tsx`, atualizar o HTML do módulo — remover a
  `<div id="tabelaCronograma">` antiga (US4 finaliza a remoção da grade em si; aqui só o container
  do Gantt entra) e adicionar `<div id="containerGanttCronograma">` como alvo de
  `renderizarGanttPorTurma_`
- [ ] T012 [US2] Reescrever `aoMudarCronograma()` — sem Curso selecionado, limpa
  `containerGanttCronograma` e não chama nada (FR, "nada selecionado"); com Curso selecionado e
  `ano <= new Date().getFullYear()` (ano vigente ou passado), chama `carregarGanttVigente_` (T009)
  seguido de `renderizarGanttPorTurma_` (T010) — o branch para `ano >
  new Date().getFullYear()` (ano futuro) é adicionado por US5 (T026) (depends on T009, T010)

**Checkpoint**: Gantt do ano vigente funcional, agrupado por Turma — testável e entregável
isoladamente (a grade antiga e o dropdown "Visão" continuam presentes até US4).

---

## Phase 4: User Story 3 - Filtros avançados conectados ao Gantt, com redesenho instantâneo (Priority: P1)

**Goal**: os 3 filtros de Disciplinas (Status da Turma, Instrutor, Status da Disciplina) operam
sobre o Gantt, redesenhando instantaneamente sem chamada de rede nova.

**Independent Test**: `quickstart.md` Passo 3 — filtro de Instrutor isola as barras daquele
instrutor, sem nenhuma chamada a Server Action nova.

### Implementação da User Story 3

- [ ] T013 [US3] Em `app/(app)/cronograma/page.tsx`, duplicar as 4 funções puras da spec 037
  (idênticas a ``app/(app)/disciplinas/page.tsx`:320-392`, gotcha de escopo entre `.html` — `spec.md`
  Verificação de Premissa item 4): `turmaStatusPorId_(turmas)`,
  `enriquecerLinhasDisciplinaParaFiltros_(linhas, disciplinaPorGrade, chExecutadaPorGrade,
  statusInfoPorGrade, statusPorTurma)`, `linhaPassaFiltros_(linha, filtros)`,
  `opcoesInstrutorFiltro_(linhas, instrutorPorId)`
- [ ] T014 [US3] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` (`sandboxCronograma_`) para as
  4 funções de T013 — mesmos casos já cobertos para `app/(app)/disciplinas/page.tsx` na spec 037
  (`linhaPassaFiltros_`: cada filtro vazio sempre passa, E lógico entre filtros preenchidos;
  `enriquecerLinhasDisciplinaParaFiltros_`: `_statusTurma`/`_instrutores` resolvidos corretamente,
  incluindo quando `linha.ID_Turma`/`linha.ID_Instrutor` estão ausentes — caso do ano futuro, US5;
  `opcoesInstrutorFiltro_`: únicos, ordenados por antiguidade) (depends on T013)
- [ ] T015 [US3] Em `app/(app)/cronograma/page.tsx`, adicionar os 3 `<select>` de filtro (Status
  da Turma, Instrutor, Status da Disciplina — mesmos rótulos/valores de `app/(app)/disciplinas/page.tsx`) ao
  markup do módulo, abaixo do container do Gantt (T011)
- [ ] T016 [US3] Em `app/(app)/cronograma/page.tsx`, adicionar `prepararLinhasFiltraveis_()` —
  roda 1 vez por carga/recarga de dado (chamada no fim de `carregarGanttVigente_`/T009 e da rotina
  equivalente de US5/T026), monta `linhasEnriquecidas` global via
  `enriquecerLinhasDisciplinaParaFiltros_` (T013) e repopula o `<select>` de Instrutor via
  `opcoesInstrutorFiltro_` (mesmo padrão de `popularFiltroInstrutorDisciplinas_`,
  ``app/(app)/disciplinas/page.tsx`:397`) (depends on T013, T009)
- [ ] T017 [US3] Em `app/(app)/cronograma/page.tsx`, adicionar `aoTrocarFiltroCronograma_()` —
  onchange dos 3 `<select>`, filtra `linhasEnriquecidas` via `linhaPassaFiltros_` (T013) e chama
  `renderizarGanttPorTurma_` (T010) só com as linhas que passam — nenhuma chamada a Server Action nova
  (SC-003); reinicia os 3 filtros ao trocar de Curso/Turma (mesmo padrão de FR-005 da spec 037)
  (depends on T013, T010)

**Checkpoint**: filtros avançados funcionais sobre o Gantt do ano vigente — testável e entregável
isoladamente.

---

## Phase 5: User Story 4 - Gantt substitui a grade previsto×executado (visão atual, CSV e impressão) (Priority: P1)

**Goal**: dropdown "Visão" e a grade antiga saem de vez; Exportar CSV e Imprimir passam a operar
sobre o Gantt.

**Independent Test**: `quickstart.md` Passo 4 — nenhum dropdown "Visão"/tabela antiga; CSV com 1
linha por barra visível; impressão mostra o Gantt.

### Implementação da User Story 4

- [ ] T018 [US4] Em `app/(app)/cronograma/page.tsx`, remover do HTML: `<select id="cronoVisao">`
  (Por disciplina/Por instrutor), `<select id="cronoGranularidade">` (parâmetro exclusivo da grade
  em buckets semanais — sem consumidor depois que a grade sai) e `<input id="cronoFiltro">` (filtro
  de texto livre antigo, substituído pelos 3 filtros estruturados de US3); remover do `<script>`:
  `renderizarCronograma()`, `garantirNomesInstrutores_()`/`nomeInstrutorPorId_` (só usados pela
  visão "por instrutor" removida) e a leitura de `cronogramaAtual`/chamada a `gs('getCronograma',
  ...)` em `aoMudarCronograma()` (substituída por T012 na US2)
- [ ] T019 [US4] Em `app/(app)/cronograma/page.tsx`, envolver
  `<div id="containerGanttCronograma">` (T011) com a classe `.area-impressao` já existente
  (`app/globals.css`, RF-DSA-06 — mesmo componente do DSA/Ficha do Instrutor); botão "Imprimir"
  mantém `onclick="window.print()"`, sem CSS novo de `@media print`
- [ ] T020 [US4] Em `app/(app)/cronograma/page.tsx`, adicionar função pura
  `montarLinhasCsvGantt_(barrasVisiveis, rotuloTurmaPorIdTurma, nomeInstrutorPorId)` — 1 linha por
  barra (`data-model.md` §4): `[idCurso, rotuloTurmaPorIdTurma[b.idTurma] || '—',
  b.nome, isoParaDataBr_(b.inicio), isoParaDataBr_(b.termino), (b.idInstrutor ?
  b.idInstrutor.split(',').map(id => nomeInstrutorPorId[id.trim()] || id.trim()).join('; ') :
  '—')]`
- [ ] T021 [US4] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` (`sandboxCronograma_`) para
  `montarLinhasCsvGantt_`: barra do ano vigente (com `idTurma`/`idInstrutor`) → linha com Turma e
  Instrutor resolvidos; barra sem `idTurma`/`idInstrutor` (caso do ano futuro, US5) → `'—'` nas 2
  colunas, nunca exceção (depends on T020)
- [ ] T022 [US4] Em `app/(app)/cronograma/page.tsx`, reescrever `exportarCronogramaCsv` — monta
  as linhas via `montarLinhasCsvGantt_` (T020) a partir do array de barras **atualmente filtrado e
  renderizado** (o mesmo usado por `renderizarGanttPorTurma_`/T010, nunca uma raspagem de DOM),
  serializa em CSV (mesma lógica de escaping de aspas já existente) e baixa o arquivo (mesmo padrão
  de `Blob`/`URL.createObjectURL` já existente) (depends on T020)

**Checkpoint**: tela do Cronograma só com o Gantt — testável e entregável isoladamente (US1-US3 já
garantiram que o Gantt em si funciona; esta história só remove o que sobrou da grade antiga e
redireciona CSV/impressão).

---

## Phase 6: User Story 5 - Gantt também mostra a prévia do motor preditivo em anos futuros (Priority: P1)

**Goal**: selecionar um ano futuro desenha 1 Gantt único por Curso a partir da prévia `Salvo` mais
recente (`planejamento_anual`), com os mesmos 3 filtros (naturalmente sem opção quando não há dado
real) — sem tocar o motor preditivo em si.

**Independent Test**: `quickstart.md` Passo 5 — gerar/salvar prévia para ano futuro, conferir 1
barra por disciplina com tempo alocado, início/término batendo com a semana mais cedo/mais tarde
com `Tempos_Alocados > 0`.

### Implementação da User Story 5

- [ ] T023 [US5] Em `lib/acoes/cronograma.ts`, implementar `getGanttPrevisaoAnoFuturo_(idCurso,
  ano)` — `exigirFuncao(PERFIS_TODOS)` + `exigirEscopoCurso_(usuario, idCurso)`; filtra
  `planejamento_anual` por `ID_Curso===idCurso`, `Number(Ano_Letivo)===Number(ano)`,
  `Status_Previa==='Salvo'`; sem nenhuma linha, retorna `{ idCurso, ano, linhas: [], avisos:
  ['Este ano ainda não tem planejamento oficial salvo — gere e salve uma prévia no motor
  preditivo, ou consulte outro ano.'] }`; das linhas restantes mantém só `Tipo_Linha==='Disciplina'`
  com `ID_Grade` presente e `Number(Tempos_Alocados) > 0`, agrupa por `ID_Grade` (`inicio` = menor
  `Data_Inicio_Semana`, `termino` = maior `Data_Inicio_Semana` + 6 dias), junta `nome` via 1
  leitura de `disciplinas` (fallback `ID_Grade`); retorna `{ idCurso, ano, linhas: [{ idGrade,
  nome, inicio, termino }], avisos: [] }` (`contracts/backend-functions.md`, `data-model.md` §2)
- [ ] T024 [US5] Adicionar `planejamento_anual` a `criarPlanilhaFalsaCronograma` e casos em
  `tests/unidade/regras_cronograma.test.ts` para `getGanttPrevisaoAnoFuturo_` (6 casos de
  `contracts/backend-functions.md`): sem versão `Salvo` → `linhas: []` + aviso, sem exceção; 1
  disciplina em 3 semanas consecutivas com tempo alocado → 1 barra, início/término corretos
  (segunda da 1ª semana até domingo da 3ª); linha com `Tempos_Alocados=0` no meio → não desloca a
  barra; `Tipo_Linha` não-Disciplina misturada → ignorada; 2 versões (`Rascunho`+`Salvo`) → só
  `Salvo` agregada; `ID_Grade` ausente de `disciplinas` → `nome` degrada para `ID_Grade`
  (depends on T023)
- [ ] T025 [US5] Em `app/(app)/cronograma/page.tsx`, adicionar `carregarGanttFuturo_(idCurso,
  ano)` — `gs('getGanttPrevisaoAnoFuturo_', idCurso, ano)`, exibe `avisos` (quando presentes) no
  mesmo container de aviso já usado pelo restante do módulo, retorna `resultado.linhas` como
  `BarraGanttFutura[]` (sem `idTurma`/`idInstrutor`/`statusConclusao` — `data-model.md` §2)
- [ ] T026 [US5] Em `app/(app)/cronograma/page.tsx`, completar o branch de `aoMudarCronograma()`
  deixado em aberto por T012 — para `ano > new Date().getFullYear()`, chama `carregarGanttFuturo_`
  (T025) e renderiza **1 único** Gantt para o Curso inteiro (sem agrupar por Turma — achado do
  `/speckit-plan`, `research.md` §3: `planejamento_anual` nunca tem `ID_Turma_Prevista` real) via
  `montarSerieGanttTurma_` (T002) + `renderizarGanttRangeBar_` (T001) num único container fixo
  (ex. `id="gantt-curso-futuro"`); chama `prepararLinhasFiltraveis_` (T016) com as `linhas` do ano
  futuro para manter os 3 filtros (US3) funcionando (depends on T001, T002, T012, T016, T025)

**Checkpoint**: todas as 5 histórias entregues — Gantt cobre ano vigente e ano futuro, filtros e
CSV/impressão funcionam para os 2 casos, motor preditivo (`gerarPlanejamento`/
`editarLinhaPlanejamento`/`lancarEventoManualPlanejamento`/`salvarPlanejamento`) permanece intocado.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Atualizar `o histórico de deploys da Vercel` — novas entradas para `lib/acoes/cronograma.ts`/
  `components/ciaara/`/`app/(app)/cronograma/page.tsx`
- [ ] T028 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (protocolo padrão, documento 10 §8)
- [ ] T029 [P] Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 039
- [ ] T030 Rodar `pnpm vitest run` completo, confirmar 0 falhas
- [ ] T031 ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (`o histórico de deploys da Vercel`)
- [ ] T032 Executar `quickstart.md` Passos 1 a 6 manualmente contra o deploy publicado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências — bloqueia US2 e US5 (não bloqueia US1)
- **US1 (Phase 2)**: sem dependência de Foundational nem de outra história — pode começar em
  paralelo com Phase 1
- **US2 (Phase 3)**: depende de Foundational (T001, T002) e de US1 (T004, `rotuloTurma_` para os
  cabeçalhos "Turma \<rótulo\>")
- **US3 (Phase 4)**: depende de US2 (T009/T010 — precisa do pipeline de carga/renderização do
  Gantt para filtrar)
- **US4 (Phase 5)**: depende de US2 (T010/T011 — o Gantt precisa existir antes de remover o que o
  substitui)
- **US5 (Phase 6)**: depende de Foundational (T001, T002), de US2 (T012, branch de
  `aoMudarCronograma`) e de US3 (T016, para os filtros funcionarem também no ano futuro)
- **Polish (Phase 7)**: depende de US1-US5 completas

### Parallel Opportunities

- T001 (`components/ciaara/`) e T002 (`app/(app)/cronograma/page.tsx`) — arquivos diferentes, zero dependência entre
  si, podem ser feitas em paralelo
- T004 (US1) pode começar em paralelo com T001/T002 (Foundational) — arquivos/funções
  independentes dentro do mesmo `app/(app)/cronograma/page.tsx`, mas como é o mesmo arquivo em edição
  simultânea, a execução real deve ser sequencial mesmo sem dependência lógica (nota de segurança,
  não uma regra do formato)
- T023 (`lib/acoes/cronograma.ts`) pode começar a qualquer momento em paralelo com qualquer tarefa de
  `app/(app)/cronograma/page.tsx`/`components/ciaara/` — arquivo diferente
- T027/T029 (Polish, arquivos de documentação distintos)
- Dentro de cada história, cada tarefa de teste depende só da tarefa de implementação
  correspondente (T005←T004, T008←T007, T014←T013, T021←T020, T024←T023)

---

## Parallel Example: Foundational + US5 backend

```bash
Task: "Adicionar renderizarGanttRangeBar_ em `components/ciaara/` (T001)"
Task: "Adicionar montarSerieGanttTurma_ em `app/(app)/cronograma/page.tsx` (T002)"
Task: "Implementar getGanttPrevisaoAnoFuturo_ em `lib/acoes/cronograma.ts` (T023)"
```

3 arquivos diferentes, zero dependência entre si — podem ser implementadas simultaneamente mesmo
antes de US1-US4 estarem prontas (T023 só precisa existir antes de T025/T026, na Phase 6).

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Completar Phase 1 (Foundational) + Phase 2 (US1) — rótulos de Turma corretos
2. Completar Phase 3 (US2) — Gantt do ano vigente funcional (a grade antiga ainda coexiste)
3. **PARAR e VALIDAR**: `quickstart.md` Passos 1 e 2
4. Deploy/demo se desejado (US3-US5 ainda não implementadas — Gantt sem filtro, grade antiga ainda
   visível ao lado)

### Incremental Delivery

1. Foundational + US1 → validar rótulos
2. US2 → validar Gantt do ano vigente
3. US3 → validar filtros
4. US4 → validar remoção da grade antiga + CSV/impressão
5. US5 → validar Gantt de ano futuro (motor preditivo)
6. Polish (commit, PR, preview da Vercel, quickstart completo)

Como as 5 histórias têm dependências reais entre si (ver Phase Dependencies acima, diferente do
hotfix 038), a ordem acima não é só uma sugestão — é a ordem mínima que mantém cada checkpoint
funcional (nunca remover a grade antiga, US4, antes do Gantt que a substitui, US2, existir).

---

## Notes

- Nenhuma migração de schema, nenhuma coluna nova.
- `getCronograma`/`distribuicaoSemanalMateria_`/`montarCronogramaDePlanejamentoAnual_`
  (`lib/acoes/cronograma.ts`) não são tocadas por nenhuma tarefa — só deixam de ser chamadas pela tela
  reescrita (FR-008, decisão da Verificação de Premissa/Assumptions do `spec.md`).
- `renderizarGrafico_` (`components/ciaara/`) não é tocada por nenhuma tarefa — `renderizarGanttRangeBar_`
  (T001) é aditiva, nunca uma alteração de assinatura.
- Commit após cada história completa, seguindo o ritmo já estabelecido nesta sessão.
