---

description: "Task list for Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível"
---

# Tasks: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

**Input**: Design documents from `/specs/031-disciplinas-cascata-expansao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos só para a extensão de backend (`getEstatisticasDisciplinas(filtros)`), que tem
lógica de branch real (retrocompat/filtro curso/filtro turma/troca de fonte do `semInstrutor`) e
harness de mock disponível (`tests/unidade/regras_de_negocio_backend.test.ts`). A reescrita de UI em
`.html` segue o mesmo padrão já usado em toda spec de frontend desta sessão (ex. specs 026/030):
validada via `quickstart.md`, não `pnpm vitest run`.

**Organization**: 3 User Stories (US1/US2 P1, US3 P2), mais uma fase Foundational para os 2 pontos
de backend (bloqueiam US2 e US3 respectivamente).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (funções/arquivos distintos, sem dependência)
- **[Story]**: US1 (layout + Visão 1), US2 (turma: nomenclatura + Visão 2) ou US3 (estatísticas
  reativas)

## Path Conventions

Backend: `app/layout.tsx` + `lib/supabase/server.ts``, `lib/acoes/estatisticas.ts` (ambos alterados de forma
aditiva/retrocompatível — FR-013). Frontend: `app/(app)/disciplinas/page.tsx` (reescrito).
Testes: `tests/unidade/regras_de_negocio_backend.test.ts`.

---

## Phase 1: Foundational (bloqueia US2 e US3)

**Goal**: Os 2 únicos pontos de backend tocados por esta spec — aditivos e retrocompatíveis
(constitution Princípio II) — prontos antes de qualquer consumo pelo frontend.

- [X] T001 [P] Estender `app/layout.tsx` + `lib/supabase/server.ts`` — `AppState.ctx.turmas` passa a expor também
  `turma: t['Turma'] || ''` e `anoLetivo: t['Ano_Letivo'] || ''` (campos crus já existentes em
  `turmas`, contracts/backend-functions.md), sem remover nem renomear nenhum campo existente
  (FR-012)
- [X] T002 [P] Estender `lib/acoes/estatisticas.ts` — `getEstatisticasDisciplinas(filtros)` com
  `filtros` opcional (`{idCurso, idTurma}`), retrocompatível; quando `idTurma` presente, chama
  `exigirEscopoTurma_` e troca a fonte de `semInstrutor` para `turma_disciplina.ID_Instrutor`;
  quando só `idCurso`, chama `exigirEscopoCurso_` (research.md §1/§2/§5, contracts/
  backend-functions.md)
- [X] T003 Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `getEstatisticasDisciplinas(filtros)`: (a) chamada sem argumento reproduz exatamente o resultado
  global de hoje; (b) `filtros.idCurso` restringe `disciplinas`/execução às disciplinas daquele
  curso; (c) `filtros.idTurma` restringe execução àquela turma E troca `semInstrutor` para usar
  `turma_disciplina.ID_Instrutor` em vez do campo legado de `disciplinas` (depends on T002)

**Checkpoint**: Backend pronto e testado — US1 pode começar em paralelo com esta fase (não depende
dela); US2/US3 dependem dela estar completa.

---

## Phase 2: User Story 1 — Ver a grade do curso numa tabela enxuta, sem divisão lateral (Priority: P1)

**Goal**: Layout limpo (sem coluna lateral de Avaliações), Visão 1 com exatamente as 4 colunas
pedidas, sem as colunas obsoletas.

**Independent Test**: `quickstart.md` Passo 1 — selecionar um curso e confirmar tabela full-width
com Código/Nome/Carga Horária/Prioridade, e Avaliações Planejadas ausente da tela.

### Implementação da User Story 1

- [X] T004 [US1] Em `app/(app)/disciplinas/page.tsx`, remover a divisão `col-lg-6`/`col-lg-6`
  entre Disciplinas e Avaliações Planejadas — tabela de Disciplinas passa a ocupar a largura total
  (FR-001)
- [X] T005 [US1] Mover a seção de Avaliações Planejadas para o final do arquivo HTML, com a classe
  `d-none`; remover a chamada automática de `carregaravaliacoesPlanejadas` de dentro de
  `aoTrocarCursoDisciplinas()` — as funções `carregaravaliacoesPlanejadas`/
  `salvarAvaliacaoPlanejada` permanecem definidas, só deixam de ser chamadas (FR-002)
- [X] T006 [US1] Adicionar variável de módulo `filtroAtual = {idCurso:'', idTurma:''}` e reescrever
  `aoTrocarCursoDisciplinas()`: atualiza `filtroAtual`, reseta tudo se `!idCurso`, senão chama
  `popularTurmasDisciplinas_(idCurso)` (T011), `carregarDisciplinasView_(idCurso, '')` (T007) e
  `atualizarEstatisticasSeVisivel_()` (T016) (contracts/frontend-functions.md)
- [X] T007 [US1] Implementar `carregarDisciplinasView_(idCurso, idTurma)` — parte Visão 1: sempre
  `gs('listarDisciplinas')` filtrado por `idCurso`, chama `renderizarTabelaDisciplinas_(false, ...)`
  quando `!idTurma` (contracts/frontend-functions.md)
- [X] T008 [US1] Implementar `renderizarTabelaDisciplinas_(visao2, ...)` — parte Visão 1: colunas
  Código (`Cod_Disciplina`), Nome, Carga Horária (input editável), Prioridade (input editável, só
  se `podeEditarPrioridadeMotor()`), Ações ("Salvar") — nunca Técnica de Ensino Sugerida/Local
  Padrão (FR-005, FR-006)
- [X] T009 [US1] Ajustar `salvarDisciplina(idGrade)` — remover a leitura dos campos
  `tecnica_${idGrade}`/`local_${idGrade}` (removidos da UI); mantém CH e Prioridade inalterados
  (FR-006)

**Checkpoint**: Visão 1 completa e testável isoladamente — só falta a cascata de Turma (US2).

---

## Phase 3: User Story 2 — Selecionar turma e ver a tabela expandir (Priority: P1)

**Goal**: Seletor de Turma com nomenclatura correta, e a mesma tabela da US1 expandindo para a
Visão 2 quando uma turma é escolhida.

**Independent Test**: `quickstart.md` Passo 2 — curso com 2 turmas no mesmo ano mostra "Turma
01/2026"/"Turma 02/2026"; selecionar uma expande a mesma tabela com datas/instrutores/CH cumprida.

### Implementação da User Story 2

- [X] T010 [P] [US2] Implementar `rotuloTurma_(turmasMesmoAno, turma)` em `app/
  `app/(app)/disciplinas/page.tsx`` — função pura (data-model.md): 1 turma no ano → `"Turma <Ano>"`; mais de
  uma → `"Turma <NN>/<Ano>"` (`NN` de 2 dígitos extraído de `turma.turma`); `anoLetivo` vazio
  degrada para `turma.nome` (RN-DEG-01) (FR-004)
- [X] T011 [US2] Reescrever `popularTurmasDisciplinas_(idCurso)` — filtra `AppState.ctx.turmas` por
  `idCurso` (sem a Server Action novo), agrupa por `anoLetivo`, usa `rotuloTurma_` (T010) para cada `<option>`,
  habilita o seletor de Turma só quando há pelo menos 1 turma (FR-003, FR-004) (depends on T010)
- [X] T012 [US2] Implementar `aoTrocarTurmaDisciplinas_()` — atualiza `filtroAtual.idTurma`, chama
  `carregarDisciplinasView_(filtroAtual.idCurso, idTurma)` e `atualizarEstatisticasSeVisivel_()`
  (`idTurma === ''` volta para Visão 1) (depends on T006, T007)
- [X] T013 [US2] Estender `carregarDisciplinasView_(idCurso, idTurma)` — parte Visão 2: quando
  `idTurma`, `Promise.all([crudListar('turma_disciplina'), crudListar('instrutor_disciplina'),
  crudListar('instrutores'), gs('getDisciplinasDaTurmaComRitmo', idTurma)])`, popula
  `turmasDisciplinaCarregadas`/`vinculosInstrutorCarregados`/`instrutoresCadastroCarregados` e um
  mapa `chExecutadaPorGrade`, chama `renderizarTabelaDisciplinas_(true, ...)` (contracts/
  frontend-functions.md, depends on T001, T007)
- [X] T014 [US2] Estender `renderizarTabelaDisciplinas_` — parte Visão 2: itera `turma_disciplina`
  da turma, junta com `disciplinas` via `ID_Grade` para Código/CH/Prioridade, acrescenta Início,
  Término, Instrutores Selecionados (`resumoInstrutoresCompacto_`, reuso literal), CH Cumprida
  (`chExecutadaPorGrade`), e Ações com **dois controles separados**: inputs de CH/Prioridade +
  "Salvar" (como na Visão 1) MAIS um botão "Editar" que chama `abrirEdicaoDisciplinaTurma_` sem
  nenhuma mudança nesse painel [Clarifications 2026-08-20, Opção A] (FR-007, FR-008, FR-009,
  FR-011) (depends on T008, T013)
- [X] T015 [P] [US2] Ajustar `salvarEdicaoDisciplinaTurma_` — trocar o recarregamento de sucesso de
  `carregarDisciplinasDaTurma_(linha.ID_Turma)` para `carregarDisciplinasView_(filtroAtual.idCurso,
  linha.ID_Turma)` (depends on T013)

**Checkpoint**: Cascata completa — Visão 1 + Visão 2 na mesma tabela, painel de edição reaproveitado
sem mudança.

---

## Phase 4: User Story 3 — Estatísticas do topo refletem o filtro atual (Priority: P2)

**Goal**: Cards de estatística recalculam automaticamente a cada troca de Curso/Turma.

**Independent Test**: `quickstart.md` Passo 3 — trocar de curso e depois de turma com o painel de
estatísticas aberto, confirmar que os valores mudam a cada troca.

### Implementação da User Story 3

- [X] T016 [US3] Implementar `atualizarEstatisticasSeVisivel_()` em `app/
  `app/(app)/disciplinas/page.tsx`` — se `#estatisticasDisciplinas` está visível, chama
  `carregarEstatisticasDisciplinas(filtroAtual)` (depends on T006)
- [X] T017 [US3] Ajustar `carregarEstatisticasDisciplinas(filtros)` — `gs('getEstatisticasDisciplinas',
  filtros)` em vez de sem argumento; renderização dos cards/gráfico idêntica à de hoje (FR-010)
  (depends on T002, T016)
- [X] T018 [US3] Ajustar `alternarEstatisticasDisciplinas()` — ao abrir, sempre chama
  `carregarEstatisticasDisciplinas(filtroAtual)` (remove o cache singleton
  `AppState.cache.estatisticasDisciplinas` de "carregar só uma vez", pois o resultado agora varia
  por filtro) (depends on T017)

**Checkpoint**: Fluxo completo — layout limpo (US1) + cascata de turma (US2) + estatísticas reativas
(US3).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T019 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `app/(app)/disciplinas/page.tsx`/
  ``app/layout.tsx` + `lib/supabase/server.ts`/`lib/acoes/estatisticas.ts``
- [X] T020 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
- [X] T021 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 031
- [X] T022 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-006)
- [ ] T023 Executar `quickstart.md` Passos 1 a 4 manualmente contra o deploy publicado — `o fluxo Git → Vercel
  push`/`o merge na `main` (a Vercel publica em produção)` concluído em 2026-08-20 (deployment `@53`); falta apenas a validação manual
  no navegador

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências externas — pode rodar em paralelo com US1
- **US1 (Phase 2)**: sem dependência da Fase 1 (Visão 1 não usa `turma`/`anoLetivo` nem
  `getEstatisticasDisciplinas(filtros)`)
- **US2 (Phase 3)**: depende da Fase 1 completa (T001) E de T006/T007/T008 (US1) — a Visão 2 estende
  a mesma tabela e o mesmo `filtroAtual` que a US1 cria
- **US3 (Phase 4)**: depende da Fase 1 completa (T002) E de T006 (US1)
- **Polish (Phase 5)**: depende de US1, US2 e US3 completas

### Within Each User Story

- US1: T004 → T005 → T006 → T007 → T008 → T009
- US2: T010 → T011 (paralelo a T012-T015 dentro da própria história, T012 depende de T006/T007) →
  T013 → T014 → T015
- US3: T016 → T017 → T018

### Parallel Opportunities

- T001 e T002 (arquivos de backend distintos, Fase 1)
- T010 (função pura, sem dependência de DOM) pode começar assim que a Fase 1 iniciar
- T015 (arquivo/função isolada) em paralelo com T014, ambos após T013
- T019 (Polish, arquivo de documentação distinto)

---

## Parallel Example: Foundational

```bash
Task: "Estender `app/layout.tsx` + `lib/supabase/server.ts` — turma/anoLetivo em AppState.ctx.turmas"
Task: "Estender `lib/acoes/estatisticas.ts` — getEstatisticasDisciplinas(filtros)"
```

---

## Implementation Strategy

### MVP = US1 + US2 juntas

Como no pedido original a Visão 1 sozinha já é útil (grade limpa), mas o critério de aceite
("Turma 2026 do CAHO... tabela cresce lateralmente") só fecha com US2, o menor incremento que
cumpre o Critério de Aceite completo do spec é US1+US2. US3 (estatísticas reativas) é um refinamento
que pode ser entregue depois, sem bloquear a navegação/edição.

1. Completar Fase 1 (Foundational) — pode rodar em paralelo com o início de US1
2. Completar Phase 2 (US1)
3. Completar Phase 3 (US2)
4. **PARAR e VALIDAR**: `quickstart.md` Passos 1-2
5. Completar Phase 4 (US3)
6. **VALIDAR**: `quickstart.md` Passo 3
7. Phase 5 (Polish)

---

## Notes

- Nenhuma tarefa desta lista cria função de backend nova — só estende 2 já existentes de forma
  aditiva/retrocompatível (FR-013).
- A estrutura HTML/JS entregue na spec 030 (`discSecaoTurma`, `corpoTabelaDisciplinasTurma`, tabela
  antiga de 2 colunas) é substituída, não preservada em paralelo (FR-011) — ver "Retiradas" em
  contracts/frontend-functions.md.
- Commit após Fase 1 + US1 + US2 + US3 completos, seguindo o ritmo já estabelecido nesta sessão.
