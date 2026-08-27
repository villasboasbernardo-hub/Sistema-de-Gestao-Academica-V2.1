---

description: "Task list for Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)"
---

# Tasks: Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

**Input**: Design documents from `/specs/037-filtros-status-grafico-disciplinas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos para toda função pura/nova alterada (backend e frontend) — mesmo harness de
mock já usado nesta sessão (`tests/unidade/regras_de_negocio_backend.test.ts` para `.ts`,
`tests/unidade/regras_ui_dados.test.ts` para funções puras carregadas de `.html` via `vm`). Sem harness de
DOM/renderização real para os 3 `<select>` novos nem para o gráfico — verificado por
`quickstart.md` manual (mesmo padrão de toda spec de frontend desta sessão).

**Organization**: 4 User Stories — US1/US2/US3 (P1), US4 (P2). US1→US2→US3 estendem a **mesma**
função (`linhaPassaFiltros_`) em sequência (dependência explícita abaixo, não paralelizável entre
si) — cada extensão é, ainda assim, independentemente testável e entregável (a história anterior
continua funcionando intacta a cada extensão). US4 é totalmente independente das outras 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos ou funções distintas, sem dependência)
- **[Story]**: US1 (Status da Turma) · US2 (Instrutor) · US3 (Status da Disciplina) · US4 (Gráfico)

## Path Conventions

Backend: `lib/acoes/cronograma.ts` (função estendida), `lib/acoes/estatisticas.ts` (função
removida). Frontend: `app/(app)/disciplinas/page.tsx` (único arquivo de UI tocado). Testes:
`tests/unidade/regras_de_negocio_backend.test.ts`, `tests/unidade/regras_ui_dados.test.ts`.

---

## Phase 1: Foundational (Bloqueante)

**Purpose**: Infraestrutura compartilhada pelas 4 histórias — enriquecimento de linha (fonte única
de `_statusConclusao`/`_statusTurma`/`_instrutores`), migração da agregação de estatísticas para o
cliente (pré-requisito de FR-004/SC-001, `research.md` §1) e correção da fonte de data do "ritmo"
(achado adicional, `research.md` §2). Nenhuma história pode filtrar nada até esta fase terminar,
mas a tela continua 100% funcional ao final dela (Curso/Turma seguem filtrando normalmente, cartões
já migrados para o cliente) — checkpoint seguro antes de qualquer filtro novo existir.

**⚠️ CRITICAL**: T011-T022 (US1-US3) dependem desta fase inteira. T023-T025 (US4) só dependem de
T001 estar de fora do caminho (não tocam a mesma função), mas por simplicidade seguem depois.

- [X] T001 [P] Estender `getDisciplinasAnoVigente(ano)` em `lib/acoes/cronograma.ts` — lê
  `disciplinas` (1 leitura nova, nunca por linha/turma) e acrescenta `StatusConclusao`/`Ritmo`
  por linha, reaproveitando `resolverPeriodoEfetivo_`/`calcularRitmoDisciplina_`/
  `classificarDensidade_` já existentes (mesma fórmula de `getDisciplinasDaTurmaComRitmo`,
  `contracts/backend-functions.md`, `data-model.md` §1) — assinatura e campos já existentes
  inalterados (aditivo)
- [X] T002 Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `getDisciplinasAnoVigente` estendida: `ChExecutada=0` → `StatusConclusao='Não Iniciada'`;
  `ChExecutada>=chTotal (>0)` → `'Concluída'`; caso intermediário → `'Em Andamento'`; turma com
  `turma_disciplina.Previsao_Inicio/Termino` preenchido → `Ritmo` calculado a partir desse período,
  não da semente de `disciplinas` (prova de regressão do achado adicional); período incompleto
  → `Ritmo=null` sem lançar exceção; `disciplinas` lida exatamente 1 vez por chamada (depends
  on T001)
- [X] T003 [P] `turmaStatusPorId_(turmas)` em `app/(app)/disciplinas/page.tsx` — função pura,
  `{idTurma: status}` a partir de `AppState.ctx.turmas` (`contracts/frontend-functions.md`)
- [X] T004 Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para `turmaStatusPorId_`: mapa
  correto para 2+ turmas; turma sem `status` → chave presente com valor vazio/undefined, sem
  lançar exceção (depends on T003)
- [X] T005 `enriquecerLinhasDisciplinaParaFiltros_(linhas, disciplinaPorGrade,
  chExecutadaPorGrade, statusInfoPorGrade, statusPorTurma)` em `app/(app)/disciplinas/page.tsx`
  — função pura, forma completa de retorno (`_chTotal`/`_chExecutada`/`_statusConclusao`/
  `_statusTurma`/`_instrutores`/`_ritmo`), resolução dual-fonte de `_statusConclusao`/`_ritmo`
  (linha.`StatusConclusao`/`Ritmo` do estado inicial vs. `statusInfoPorGrade` da cascata,
  `data-model.md` §4) (depends on T001, T003)
- [X] T006 Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para
  `enriquecerLinhasDisciplinaParaFiltros_`: linha do estado inicial (usa `linha.StatusConclusao`
  direto); linha da cascata (usa `statusInfoPorGrade[ID_Grade]`); `_instrutores` a partir de CSV
  vazio/1/2+ IDs; `_statusTurma` ausente (turma não encontrada) degrada para vazio, sem lançar
  exceção (depends on T005)
- [X] T007 Em `app/(app)/disciplinas/page.tsx`: `filtroAtual` ganha `statusTurma`/`idInstrutor`/
  `statusDisciplina` (todos `''`); as 3 chaves são resetadas em `aoTrocarCursoDisciplinas()`,
  `aoTrocarTurmaDisciplinas_()` e `mostrarEstadoInicialDisciplinas_()` (FR-005, `data-model.md` §3).
  Nova função `atualizarDisponibilidadeFiltrosNovos_()`, chamada nesses mesmos 3 pontos: desabilita
  (`disabled = true`) os 3 `<select>` novos (T014/T019/T022) quando a visão ativa é "Curso sem
  Turma" (`modoExibicaoAtual === 'cascata' && !filtroAtual.idTurma`), reabilita nos outros 2 modos
  (FR-006, Edge Case "Curso selecionado sem nenhuma Turma selecionada" do spec.md) — os 3 selects
  nascem desabilitados no HTML (mesmo estado inicial de `#discTurmaSelecao`)
- [X] T008 `agregarEstatisticasDisciplinas_(linhasEnriquecidasFiltradas)` em
  `app/(app)/disciplinas/page.tsx` — função pura, mesmo formato de retorno de
  `getEstatisticasDisciplinas` (`kpis.total/concluidas/atrasadas/semInstrutor` + `porStatus`),
  `atrasadas` via `_ritmo === 'Atrasada'` (`data-model.md` §5) (depends on T005)
- [X] T009 Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para
  `agregarEstatisticasDisciplinas_`: array vazio → todos os KPIs zerados, `porStatus=[]`; mistura
  de status → contagens corretas; `atrasadas` só conta quando `_statusConclusao !== 'Concluída'`
  (uma disciplina concluída nunca conta como atrasada mesmo com `_ritmo='Atrasada'` remanescente)
  (depends on T008)
- [X] T010 Em `app/(app)/disciplinas/page.tsx`: remover a chamada `gs('getEstatisticasDisciplinas',
  ...)` — `carregarEstatisticasDisciplinas(filtros)` passa a enriquecer (T005) + agregar (T008,
  sem nenhum filtro de US1-3 ainda aplicado nesta fase) + renderizar os mesmos 4 cartões/donut,
  síncrono, sem chamada de rede; remover `getEstatisticasDisciplinas` de
  `lib/acoes/estatisticas.ts` e seus 2 blocos de teste em `tests/regras_de_negocio_backend.
  test.js`/`tests/unidade/regras_ui_dados.test.ts` (zero consumidor, confirmado por grep,
  `contracts/backend-functions.md`) (depends on T007, T008)

**Checkpoint**: Tela segue 100% funcional (Curso/Turma filtrando, cartões/donut corretos, agora
100% client-side) — nenhuma regressão visível, nenhum filtro novo ainda aparece na UI.

---

## Phase 2: User Story 1 — Filtrar por Status da Turma (Priority: P1) 🎯 MVP

**Goal**: Filtro de Status da Turma (4 valores reais de `turmas.Status`) restringe tabela e
cartões simultaneamente.

**Independent Test**: `quickstart.md` Passo 1 — no estado inicial, selecionar "Ativa" e conferir
que só turmas `Status='Ativa'` permanecem, com cartões recalculados.

### Implementação da User Story 1

- [X] T011 [US1] `linhaPassaFiltros_(linhaEnriquecida, filtros)` em
  `app/(app)/disciplinas/page.tsx` — 1ª versão: só a condição `statusTurma` (`!filtros.
  statusTurma || linha._statusTurma === filtros.statusTurma`) — função pura nova
  (`contracts/frontend-functions.md`) (depends on T005)
- [X] T012 [US1] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para `linhaPassaFiltros_`:
  `statusTurma=''` → sempre `true`; `statusTurma` preenchido batendo/não batendo com
  `linha._statusTurma` → `true`/`false` (depends on T011)
- [X] T013 [US1] Em `app/(app)/disciplinas/page.tsx`: `renderizarTabelaDisciplinas_`/
  `carregarEstatisticasDisciplinas` passam a filtrar `linhasEnriquecidas` via `linhaPassaFiltros_`
  antes de montar as linhas da tabela e antes de chamar `agregarEstatisticasDisciplinas_` (T008) —
  mesmo array filtrado alimenta os dois, garantindo SC-002 (depends on T010, T011)
- [X] T014 [US1] Em `app/(app)/disciplinas/page.tsx`: novo `<select id="discStatusTurmaSelecao">`
  junto de `#discCursoSelecao`/`#discTurmaSelecao` (4 opções reais + "Todos"), nasce `disabled`
  (T007), `onchange` grava `filtroAtual.statusTurma` e re-executa render/estatísticas (depends on
  T007, T013)

**Checkpoint**: Filtro de Status da Turma funcional e testável de forma independente — MVP
entregável mesmo sem US2/US3/US4.

---

## Phase 3: User Story 2 — Filtrar por Instrutor (Priority: P1)

**Goal**: Filtro de Instrutor, populado só com instrutores efetivamente alocados no recorte atual,
ordenado por antiguidade (RN-ANT-01).

**Independent Test**: `quickstart.md` Passo 2 — com turma de 2+ instrutores em disciplinas
distintas, selecionar 1 e conferir que só as disciplinas dele permanecem.

### Implementação da User Story 2

- [X] T015 [P] [US2] `opcoesInstrutorFiltro_(linhasEnriquecidas, instrutorPorId)` em
  `app/(app)/disciplinas/page.tsx` — função pura, candidatos únicos de `_instrutores`,
  resolvidos e ordenados via `ordenarVinculosPorAntiguidadeDisc_` (já existente, spec 036,
  `contracts/frontend-functions.md`) (depends on T005)
- [X] T016 [US2] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para
  `opcoesInstrutorFiltro_`: instrutor em 2+ linhas aparece 1 única vez; ordem final segue
  antiguidade (não ordem de aparição); lista vazia quando nenhuma linha tem instrutor alocado
  (depends on T015)
- [X] T017 [US2] Estender `linhaPassaFiltros_` (mesmo arquivo, mesma função de T011) com a
  condição `idInstrutor` (`!filtros.idInstrutor || linha._instrutores.includes(filtros.
  idInstrutor)`) — sequencial após T011/T013, não paralelo (mesma função) (depends on T013)
- [X] T018 [US2] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para a condição `idInstrutor`
  de `linhaPassaFiltros_`: `idInstrutor=''` → sempre `true`; disciplina com 2 instrutores no CSV
  bate se qualquer um dos dois for o filtro; combinação `statusTurma`+`idInstrutor` juntos exige
  os dois baterem (E lógico, FR-004) (depends on T017)
- [X] T019 [US2] Em `app/(app)/disciplinas/page.tsx`: novo `<select id="discInstrutorSelecao">`,
  nasce `disabled` (T007), repopulado via `opcoesInstrutorFiltro_` (T015) toda vez que o dado é
  (re)carregado (nunca a cada mudança de filtro), `onchange` grava `filtroAtual.idInstrutor` e
  re-executa render/estatísticas; reset de `filtroAtual.idInstrutor` (T007) já cobre a troca de
  Curso/Turma (depends on T007, T015, T017)

**Checkpoint**: Filtro de Instrutor funcional, combinável com Status da Turma — validável
independentemente de US3/US4.

---

## Phase 4: User Story 3 — Filtrar por Status da Disciplina (Priority: P1)

**Goal**: Filtro de Status da Disciplina reaproveitando exatamente o cálculo de execução já usado
pelo gráfico de rosca existente — nenhuma lógica de status nova.

**Independent Test**: `quickstart.md` Passo 3 — selecionar "Concluída" e conferir que a contagem
bate com o gráfico de rosca do painel estatístico.

### Implementação da User Story 3

- [X] T020 [US3] Estender `linhaPassaFiltros_` (mesma função de T011/T017) com a condição
  `statusDisciplina` (`!filtros.statusDisciplina || linha._statusConclusao === filtros.
  statusDisciplina`) — sequencial após T017, não paralelo (mesma função) (depends on T017)
- [X] T021 [US3] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para a condição
  `statusDisciplina` de `linhaPassaFiltros_`: `statusDisciplina=''` → sempre `true`; valor batendo/
  não batendo com `linha._statusConclusao` → `true`/`false`; combinação simultânea dos 3 filtros
  (`statusTurma`+`idInstrutor`+`statusDisciplina` todos preenchidos ao mesmo tempo) → só a linha
  que bate com os 3 ao mesmo tempo passa, prova do E lógico completo (FR-004, achado C2 do
  `/speckit-analyze`); teste de integração local provando que `agregarEstatisticasDisciplinas_`
  (T008) sobre o array filtrado por `statusDisciplina='Concluída'` produz `porStatus` com uma
  única entrada 'Concluída' cuja quantidade bate com o total de linhas filtradas (fecha o
  Acceptance Scenario 2 do spec.md) (depends on T020)
- [X] T022 [US3] Em `app/(app)/disciplinas/page.tsx`: novo
  `<select id="discStatusDisciplinaSelecao">` (3 valores fixos — Não Iniciada/Em Andamento/
  Concluída — + "Todos"), nasce `disabled` (T007), `onchange` grava `filtroAtual.statusDisciplina`
  e re-executa render/estatísticas (depends on T007, T020)

**Checkpoint**: Os 3 filtros (US1+US2+US3) operam em conjunto — critério de aceite dos 3 primeiros
itens do `spec.md` verificável.

---

## Phase 5: User Story 4 — Gráfico de pizza da Carga Horária do Curso (Priority: P2)

**Goal**: Gráfico de pizza da Carga Horária Prevista por disciplina, visível só com um Curso
selecionado.

**Independent Test**: `quickstart.md` Passo 5 — selecionar o CAHO e conferir o gráfico com fatias
somando a Carga Horária Total do curso.

### Implementação da User Story 4

- [X] T023 [P] [US4] `dadosGraficoCargaHoraria_(disciplinasCarregadas)` em
  `app/(app)/disciplinas/page.tsx` — função pura, filtra `Status='Ativo'`, mapeia para
  `{rotulo, tempos}`, retorna `null` quando soma de `tempos` é 0 ou lista vazia (`data-model.md`
  §7) — independente de T001-T022 (não usa nenhum dado enriquecido)
- [X] T024 [US4] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para
  `dadosGraficoCargaHoraria_`: disciplinas ativas com carga > 0 → array de fatias correto, com
  asserção explícita de que `rotulo` é o Código/Nome da disciplina, nunca o `ID_Grade` cru
  (FR-009, achado T2 do `/speckit-analyze`); `Carga_Horaria_Tempos` somando 0 → `null`; lista vazia
  → `null`; disciplina `Status≠'Ativo'` nunca aparece (depends on T023)
- [X] T025 [US4] Em `carregarEstatisticasDisciplinas` (`app/(app)/disciplinas/page.tsx`):
  quando `filtroAtual.idCurso` preenchido e `dadosGraficoCargaHoraria_(disciplinasCarregadas)`
  não-nulo, renderiza um `<div>` novo dentro de `#estatisticasDisciplinas` via
  `renderizarGrafico_(elementoId, 'pie', categorias, series)` (`components/ciaara/`, já existente);
  ausente (sem `<div>`/gráfico anterior) quando `idCurso` vazio ou dado nulo (FR-008) (depends on
  T023)

**Checkpoint**: Todas as 4 histórias entregues — critério de aceite completo do `spec.md`
verificável.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Atualizar `o histórico de deploys da Vercel` — novas entradas para `lib/acoes/cronograma.ts`/
  `lib/acoes/estatisticas.ts`/`app/(app)/disciplinas/page.tsx`
- [X] T027 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (protocolo padrão, documento 10 §8)
- [X] T028 [P] Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 037
- [X] T029 Rodar `pnpm vitest run` completo, confirmar 0 falhas — 452/452, 0 falhas
- [X] T030 ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (`o histórico de deploys da Vercel`) — ``git push` (a Vercel publica a preview da branch)`: 33 arquivos.
  `o merge na `main` (a Vercel publica em produção)`: `AKfycbztf09jVkJJEEewAf-nB2vbAQS57Yftam6729_Vh49oFumvnz2djQcwCHjVLB0m-vqt @59`.
- [ ] T031 Executar `quickstart.md` Passos 1 a 7 manualmente contra o deploy publicado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências externas — bloqueia todas as 4 histórias
- **US1 (Phase 2)**: depende de Foundational completo (T001-T010); introduz `linhaPassaFiltros_`
- **US2 (Phase 3)**: depende de Foundational **e** de US1 (T011/T013 — estende a mesma função)
- **US3 (Phase 4)**: depende de Foundational **e** de US2 (T017/T020 — estende a mesma função)
- **US4 (Phase 5)**: depende só de Foundational (T001 estar fora do caminho não é nem necessário —
  usa `disciplinasCarregadas` direto); pode ser feita a qualquer momento após a Foundational,
  inclusive em paralelo com US1/US2/US3
- **Polish (Phase 6)**: depende de US1+US2+US3+US4 completas

### Parallel Opportunities

- T001 (Foundational, `lib/acoes/cronograma.ts`) e T003 (Foundational, `app/(app)/disciplinas/page.tsx`, função
  distinta) — sem dependência entre si
- T015/T023 (US2/US4, funções novas e independentes) podem rodar a qualquer momento após a
  Foundational, inclusive em paralelo entre si e com US1
- T026/T028 (Polish, arquivos de documentação distintos)
- **Não paralelo**: T011 (US1) → T017 (US2) → T020 (US3) editam a **mesma função**
  (`linhaPassaFiltros_`), cada uma acrescentando 1 condição nova — estritamente sequencial para um
  único agente, mesmo as 3 histórias sendo formalmente independentes em valor de entrega (mesmo
  padrão já usado na spec 036 para `abrirEdicaoDisciplinaTurma_`)

---

## Parallel Example: Foundational

```bash
Task: "Estender getDisciplinasAnoVigente em `lib/acoes/cronograma.ts` (T001)"
Task: "Implementar turmaStatusPorId_ em `app/(app)/disciplinas/page.tsx` (T003)"
```

Essas 2 tarefas tocam arquivos diferentes e não têm dependência entre si — o resto da Foundational
(T005 em diante) depende de ambas.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Foundational)
2. Completar Phase 2 (US1) — filtro de Status da Turma já funcional
3. **PARAR e VALIDAR**: `quickstart.md` Passo 1
4. Deploy/demo se desejado

### Incremental Delivery

1. Foundational → US1 (MVP: Status da Turma) → validar
2. US2 (Instrutor, estende `linhaPassaFiltros_`) → validar
3. US3 (Status da Disciplina, estende `linhaPassaFiltros_`) → validar
4. US4 (gráfico de pizza, independente — pode entrar em qualquer ponto após Foundational)
5. Polish (commit, PR, preview da Vercel, quickstart completo)

---

## Notes

- US1→US2→US3 tocam `linhaPassaFiltros_` em pontos sobrepostos (cada uma acrescenta 1 condição) —
  sequenciais para um único agente, mesmo formalmente independentes em valor de entrega.
- Nenhuma migração de schema, nenhuma coluna nova — a única mudança de configuração/schema é
  conceitual (nenhuma, na verdade: `getDisciplinasAnoVigente` só ganha campos sintéticos novos,
  não colunas persistidas).
- `ordenarVinculosPorAntiguidadeDisc_`/`ORDEM_ANTIGUIDADE_POSTO_DISC_` (US2) não são criadas nesta
  spec — já existem em `app/(app)/disciplinas/page.tsx` desde a spec 036; só reaproveitadas.
- Commit após cada história completa (Foundational+US1, depois US2, depois US3, depois US4),
  seguindo o ritmo já estabelecido nesta sessão.
