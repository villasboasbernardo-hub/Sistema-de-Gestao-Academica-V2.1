---

description: "Task list for Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista"
---

# Tasks: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

**Input**: Design documents from `/specs/032-rateio-ch-multidisciplinar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos para as 2 funções de backend com lógica real (`calcularChPrevistaPorInstrutor_`,
função pura, e a extensão de `atualizarTurmaDisciplina`) — harness de mock já disponível
(`tests/unidade/regras_de_negocio_backend.test.ts`). A lógica de filtro de instrutor (frontend) segue o
mesmo padrão de toda spec de UI desta sessão: validada via `quickstart.md`, não `pnpm vitest run`.

**Organization**: 3 User Stories, todas P1 (US1/US2/US3), mais uma fase Foundational que bloqueia
só US3 (backend de rateio). US1 e US2 são independentes da fase Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos/funções distintas, sem dependência)
- **[Story]**: US1 (filtro restrito + remoção de busca), US2 (exceção multidisciplinar por curso) ou
  US3 (rateio de CH Prevista)

## Path Conventions

Backend: `lib/acoes/liq.ts` (único arquivo de backend tocado). Frontend: `app/
`app/(app)/cursos/[curso]/page.tsx``, `app/(app)/disciplinas/page.tsx`. Migração: `migracao/
adicionar_ch_prevista_turma_disciplina.py` (novo). Testes: `tests/unidade/regras_de_negocio_backend.test.ts`.

---

## Phase 1: Foundational (bloqueia US3)

**Goal**: Coluna nova em `turma_disciplina` e a matemática de rateio prontas e testadas antes de
qualquer tela chamar o 3º parâmetro novo de `atualizarTurmaDisciplina`.

- [X] T001 [P] Escrever `migracao/adicionar_ch_prevista_turma_disciplina.py` — adiciona a coluna
  `CH_Prevista_Por_Instrutor` a `turma_disciplina` (aditivo, idempotente, nasce vazia para as ~210
  linhas existentes, sem cálculo retroativo — data-model.md), mesmo padrão `fazer_backup`/
  `gravar_log` das migrações anteriores (specs 027/029)
- [X] T002 [P] Implementar `calcularChPrevistaPorInstrutor_(idsInstrutorSelecionados,
  chTotalDisciplina, dividirCargaHoraria)` em `lib/acoes/liq.ts` — função pura (contracts/
  backend-functions.md): 0 ids → `''`; 1 id ou `!dividirCargaHoraria` → CH integral por id; N ids
  com `dividirCargaHoraria` → divisão inteira, resto no último da lista
- [X] T003 Estender `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes, dividirCargaHoraria)`
  em `lib/acoes/liq.ts` — 3º parâmetro opcional retrocompatível; quando `alteracoes.ID_Instrutor`
  presente, lê `disciplinas.Carga_Horaria_Tempos` pelo `ID_Grade` da linha e grava
  `CH_Prevista_Por_Instrutor` via T002 — validação de janela (`intervaloContidoEm_`) permanece
  idêntica (contracts/backend-functions.md, depends on T002)
- [X] T004 Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts`: (a)
  `calcularChPrevistaPorInstrutor_` — 0/1/N-sem-dividir/N-dividindo-com-resto; (b)
  `atualizarTurmaDisciplina` grava `CH_Prevista_Por_Instrutor` corretamente nos 3 regimes E chamada
  com só 2 argumentos (retrocompat, spec 029) continua funcionando sem erro (depends on T002, T003)

**Checkpoint**: Backend de rateio pronto e testado — US3 pode começar. US1/US2 não dependem desta
fase e podem rodar em paralelo com ela.

---

## Phase 2: User Story 1 — Ver só os instrutores da disciplina, sem busca livre (Priority: P1)

**Goal**: Remover a busca livre de `app/(app)/disciplinas/page.tsx` — seleção só por checkboxes.

**Independent Test**: `quickstart.md` Passo 1 — editar uma disciplina comum, confirmar ausência de
campo de busca e que só os instrutores habilitados àquele `ID_Grade` aparecem (comportamento já
existente, preservado).

### Implementação da User Story 1

- [X] T005 [US1] Remover `#buscaInstrutorEdicao` (input) e `filtrarInstrutoresEdicaoDisciplina_()`
  de `app/(app)/disciplinas/page.tsx` — seleção de instrutor passa a ser só por checkboxes
  (FR-002)

**Checkpoint**: Busca livre removida — filtro restrito por disciplina continua correto sem nenhuma
outra mudança (baseline para US2).

---

## Phase 3: User Story 2 — Filtro amplo por curso para disciplinas multidisciplinares (Priority: P1)

**Goal**: Disciplinas com `Modo_Atribuicao_Padrao='Simultaneo'` mostram todos os instrutores
habilitados a qualquer disciplina do curso, nas duas telas.

**Independent Test**: `quickstart.md` Passo 2 — editar LHFC (ou disciplina equivalente) em
`app/(app)/disciplinas/page.tsx` e em `app/(app)/cursos/[curso]/page.tsx`, confirmar mesma lista ampla nas duas telas.

### Implementação da User Story 2

- [X] T006 [US2] Implementar `instrutoresElegiveis_(linha, disciplinaGrade, idGradesDoCurso,
  vinculos)` em `app/(app)/disciplinas/page.tsx` — função pura (data-model.md): filtro restrito
  por `ID_Grade` quando `Modo_Atribuicao_Padrao !== 'Simultaneo'` (ou vazio, RN-DEG-01), filtro por
  todo `idGradesDoCurso` quando `'Simultaneo'`, deduplicado por `ID_Instrutor` (FR-003, FR-010)
  (depends on T005 — mesmo arquivo, evita conflito de edição simultânea no mesmo painel)
- [X] T007 [US2] Usar `instrutoresElegiveis_` (T006) dentro de `abrirEdicaoDisciplinaTurma_` no
  lugar do filtro direto por `ID_Grade` — `idGradesDoCurso` vem de `disciplinasCarregadas` (já em
  memória, spec 031, sem leitura nova) (depends on T006)
- [X] T008 [P] [US2] Estender ``app/(app)/cursos/[curso]/page.tsx`:abrirPainelPeriodoTurma_` com uma leitura nova
  (`gs('listarDisciplinas')`, filtrada por `idCurso`) e repassar o resultado para
  `renderizarPainelPeriodoTurma_` (FR-005, contracts/frontend-functions.md)
- [X] T009 [US2] Implementar `instrutoresElegiveis_` (mesma função, cópia própria do arquivo — Next.js não compartilha código entre `.html`) em `app/(app)/cursos/[curso]/page.tsx` e usar dentro de
  `checkboxesInstrutor_`/`renderizarPainelPeriodoTurma_` no lugar do filtro direto por `ID_Grade`
  (FR-003, FR-004, depends on T008)

**Checkpoint**: Filtro multidisciplinar funcional e idêntico nas 2 telas.

---

## Phase 4: User Story 3 — Rateio de carga horária prevista ao salvar (Priority: P1)

**Goal**: Checkbox "Dividir Carga Horária Igualmente" nas 2 telas, gravando `CH_Prevista_Por_
Instrutor` via `atualizarTurmaDisciplina` estendida.

**Independent Test**: `quickstart.md` Passo 3 — selecionar 4 instrutores numa disciplina de 200
tempos, marcar o checkbox, salvar, confirmar 50 tempos previstos para cada um; desmarcado, confirmar
200 (CH integral) para cada um.

### Implementação da User Story 3

- [X] T010 [US3] Em `app/(app)/disciplinas/page.tsx`, adicionar ao painel de edição: checkbox
  `#dividirChEdicaoDisciplina` ("Dividir Carga Horária Igualmente entre os selecionados", sempre
  desmarcado, FR-006) e `resumoChPrevista_(chPrevistaCsv, idInstrutor)` (função pura,
  contracts/frontend-functions.md) exibindo a CH Prevista atual ao lado de cada instrutor marcado,
  quando existir em `linha.CH_Prevista_Por_Instrutor`
- [X] T011 [US3] Ajustar `salvarEdicaoDisciplinaTurma_` em `app/(app)/disciplinas/page.tsx` — lê o checkbox de
  T010 e passa como 4º argumento de `gs('atualizarTurmaDisciplina', idTurmaDisciplina, {...},
  dividirMarcado)` (FR-007, FR-008, depends on T010, T003)
- [X] T012 [P] [US3] Em `app/(app)/cursos/[curso]/page.tsx`, adicionar por linha (dentro da célula
  `instrutoresSel_${l.ID_turma_disciplina}`): checkbox `#dividirCh_${l.ID_turma_disciplina}` (sempre
  desmarcado) e a mesma exibição de CH Prevista via `resumoChPrevista_` (mesma função, cópia própria
  do arquivo)
- [X] T013 [US3] Ajustar `salvarPeriodoTurmaClick_` em `app/(app)/cursos/[curso]/page.tsx` — lê o checkbox de T012 e
  passa como 4º argumento de `gs('atualizarTurmaDisciplina', ...)` (depends on T012, T003)

**Checkpoint**: Fluxo completo — filtro restrito (US1) + exceção multidisciplinar (US2) + rateio de
CH Prevista (US3), nas 2 telas.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T014 Aplicar `migracao/adicionar_ch_prevista_turma_disciplina.py` (T001) contra o banco ao
  vivo — script rodou localmente (xlsx de trabalho + backup + `migracao_log`), e a mesma mudança
  estrutural foi replicada na banco de produção via Composio (`turma_disciplina!Q1` = header
  `CH_Prevista_Por_Instrutor`; `migracao_log` `LOG-000929`), lida de volta e conferida
- [X] T015 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `lib/acoes/liq.ts`/`app/(app)/cursos/[curso]/page.tsx`/
  `app/(app)/disciplinas/page.tsx`
- [X] T016 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
- [X] T017 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 032
- [X] T018 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-006)
- [ ] T019 Executar `quickstart.md` Passos 1 a 5 manualmente contra o deploy publicado — `o fluxo Git → Vercel
  push`/`o merge na `main` (a Vercel publica em produção)` concluído (deployment `@54`) e migração ao vivo aplicada (T014); falta só a
  validação manual no navegador

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependência externa — bloqueia só US3
- **US1 (Phase 2)**: sem dependência — pode rodar em paralelo com Foundational
- **US2 (Phase 3)**: sem dependência de Foundational — pode rodar em paralelo (mas depois de US1 no
  mesmo arquivo `app/(app)/disciplinas/page.tsx`, para evitar conflito de edição simultânea no mesmo painel)
- **US3 (Phase 4)**: depende de Foundational completa (T003) E de US2 completa (o checkbox de
  rateio vive no mesmo painel que `instrutoresElegiveis_` já modificou)
- **Polish (Phase 5)**: depende de US1, US2 e US3 completas

### Within Each User Story

- Foundational: T001 (paralelo) → T002 → T003 → T004
- US1: T005 (única tarefa)
- US2: T006 → T007 (mesmo arquivo); T008 → T009 (mesmo arquivo, paralelo ao par T006/T007)
- US3: T010 → T011 (mesmo arquivo); T012 → T013 (mesmo arquivo, paralelo ao par T010/T011)

### Parallel Opportunities

- T001 e T002 (arquivos distintos, Fase 1)
- T006/T007 (`app/(app)/disciplinas/page.tsx`) em paralelo com T008/T009 (`app/(app)/cursos/[curso]/page.tsx`) — arquivos
  diferentes, mesma função duplicada
- T010/T011 (`app/(app)/disciplinas/page.tsx`) em paralelo com T012/T013 (`app/(app)/cursos/[curso]/page.tsx`)
- T015 (Polish, arquivo de documentação distinto)

---

## Parallel Example: User Story 2

```bash
Task: "Implementar instrutoresElegiveis_ + usar em abrirEdicaoDisciplinaTurma_ (`app/(app)/disciplinas/page.tsx`)"
Task: "Estender abrirPainelPeriodoTurma_ + instrutoresElegiveis_ (`app/(app)/cursos/[curso]/page.tsx`)"
```

---

## Implementation Strategy

### MVP = as 3 histórias juntas

O Critério de Aceite do spec só fecha com as 3 juntas (filtro restrito + exceção multidisciplinar +
rateio) — mesmo padrão já observado nas specs 029/030 desta sessão, onde P1 múltiplos formam o
incremento mínimo útil.

1. Completar Fase 1 (Foundational) em paralelo com Phase 2 (US1)
2. Completar Phase 3 (US2)
3. Completar Phase 4 (US3)
4. **PARAR e VALIDAR**: `quickstart.md` Passos 1-4
5. Phase 5 (Polish)

---

## Notes

- Nenhuma tarefa cria função de backend nova além de `calcularChPrevistaPorInstrutor_` — o resto é
  extensão aditiva/retrocompatível de `atualizarTurmaDisciplina` (FR-009).
- `instrutoresElegiveis_`/`resumoChPrevista_` são duplicadas propositalmente em `app/(app)/cursos/[curso]/page.tsx` e
  `app/(app)/disciplinas/page.tsx` — Next.js não compartilha código entre arquivos `.html` distintos
  (mesmo precedente de `intervaloContidoEmClient_`, spec 030).
- Commit após Fase 1 + US1 + US2 + US3 completos, seguindo o ritmo já estabelecido nesta sessão.
