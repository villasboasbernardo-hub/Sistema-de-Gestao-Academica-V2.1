---

description: "Task list for Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma"
---

# Tasks: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

**Input**: Design documents from `/specs/034-hotfix-validacao-instrutor-liq/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos — a fixture existente de `validarLiq_` (`tests/regras_de_negocio_backend.
test.js`, describe "Epico LIQ - validarLiq_") depende do comportamento antigo e precisa de
atualização; `montarDadosSecao2Liq_` nunca teve teste, ganha um describe block novo.

**Organization**: 2 User Stories, ambas P1, mesmo arquivo (`lib/acoes/liq.ts`) — sem fase Foundational,
nenhuma pré-requisito compartilhado além do próprio arquivo já existir.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (funções distintas, sem dependência) — usar com cautela aqui, as
  2 histórias tocam o mesmo arquivo
- **[Story]**: US1 (`validarLiq_` reconhece seleção real) ou US2 (Seção 2 do documento lista quem
  foi de fato selecionado)

## Path Conventions

Backend: `lib/acoes/liq.ts` (único arquivo tocado). Testes: `tests/
regras_de_negocio_backend.test.ts`. Nenhum arquivo de frontend, nenhuma migração.

---

## Phase 1: User Story 1 — LIQ não bloqueia mais por falso positivo (Priority: P1)

**Goal**: `validarLiq_` passa a considerar `turma_disciplina.ID_Instrutor` (presença) como sinal de
instrutor atribuído, corrigindo os 27 falsos positivos confirmados nos 4 trimestres de 2026.

**Independent Test**: `quickstart.md` Passos 1-2 — trimestre com disciplina LHFC (instrutor
selecionado, sem vínculo de qualificação para aquele grade) deixa de bloquear; disciplina
genuinamente sem seleção continua bloqueando.

### Implementação da User Story 1

- [X] T001 [US1] Ajustar `validarLiq_` em `lib/acoes/liq.ts` — remove a leitura de
  `'instrutor_disciplina'`; a checagem FR-005 legado passa a ser
  `String(td['ID_Instrutor'] || '').trim().length > 0` em vez de `vinculos.some(...)` (FR-001,
  contracts/backend-functions.md) — FR-004, mensagens de erro e exclusão de turma Cancelada
  permanecem idênticos
- [X] T002 [US1] Atualizar a fixture de `tests/unidade/regras_de_negocio_backend.test.ts` (describe "Epico
  LIQ - validarLiq_"): adicionar coluna `ID_Instrutor` ao cabeçalho de `turma_disciplina` (linhas
  existentes recebem `""`, preservando os resultados já esperados pelos testes atuais); remover o
  mock de `instrutor_disciplina` (não é mais lido); adicionar 1 turma+disciplina nova com
  `ID_Instrutor` preenchido e zero vínculos de qualificação — provando que ela NÃO bloqueia mais
  (o bug real reproduzido e corrigido) (depends on T001)

**Checkpoint**: `validarLiq_` corrigida e testada isoladamente.

---

## Phase 2: User Story 2 — Seção 2 do documento lista quem foi realmente selecionado (Priority: P1)

**Goal**: `montarDadosSecao2Liq_` monta a lista de instrutores de cada disciplina a partir de
`turma_disciplina.ID_Instrutor`, nunca mais de `instrutor_disciplina`.

**Independent Test**: `quickstart.md` Passo 3 — disciplina com instrutor selecionado diferente de
outro apenas habilitado mostra o selecionado na Seção 2.

### Implementação da User Story 2

- [X] T003 [US2] Ajustar `montarDadosSecao2Liq_` em `lib/acoes/liq.ts` — remove
  `vinculosAtivos`/`vinculosPorGrade` (`'instrutor_disciplina'`); a lista de instrutores por
  disciplina passa a vir de `String(td['ID_Instrutor'] || '').split(',').map(trim).filter(Boolean)`
  resolvido via `instrutores` (mesmo `instrutorPorId` já existente) — ID órfão sem
  `instrutores` correspondente é omitido silenciosamente (FR-003/FR-005, contracts/
  backend-functions.md) (depends on T002 — mesmo arquivo, evita conflito de edição simultânea)
- [X] T004 [US2] Adicionar describe block novo em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `montarDadosSecao2Liq_`: (a) disciplina com `ID_Instrutor` de 1 ou mais instrutores reais aparece
  com os nomes corretos, separados por "; "; (b) `ID_Instrutor` órfão (sem `instrutores`
  correspondente) é omitido sem lançar erro; (c) adicionar 1 teste novo (não existe hoje nenhum
  teste para `montarDadosSecao1Liq_`) confirmando que ela continua correta, baseada em
  `instrutor_disciplina` — prova positiva de que a Seção 1 é intocada, não uma comparação
  antes/depois (depends on T003)

**Checkpoint**: Fluxo completo — `validarLiq_` (US1) + `montarDadosSecao2Liq_` (US2) corrigidas e
testadas, Seção 1 comprovadamente intocada.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T005 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `lib/acoes/liq.ts`
- [X] T006 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
- [X] T007 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 034
- [X] T008 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-005)
- [ ] T009 Executar `quickstart.md` Passos 1 a 4 manualmente contra o deploy publicado

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)** e **US2 (Phase 2)**: independentes em termos de lógica de negócio, mas tocam o
  mesmo arquivo (`lib/acoes/liq.ts`) — executar em sequência (US1 → US2) para evitar conflito de edição
  simultânea, mesmo padrão já adotado em specs anteriores desta sessão para o mesmo caso
- **Polish (Phase 3)**: depende de US1 e US2 completas

### Within Each User Story

- US1: T001 → T002
- US2: T003 → T004

### Parallel Opportunities

- T005 (Polish, arquivo de documentação distinto) pode começar assim que US1/US2 terminarem
- Nenhuma outra oportunidade real de paralelismo — spec pequena, 1 arquivo, execução sequencial é
  mais simples que coordenar 2 agentes no mesmo arquivo

---

## Implementation Strategy

### MVP = as 2 histórias juntas

O Critério de Aceite do spec (LIQ reconhece instrutores do módulo de disciplinas) só fecha com as
2 juntas — US1 desbloqueia a geração, US2 garante que o documento gerado está correto.

1. Completar Phase 1 (US1)
2. Completar Phase 2 (US2)
3. **PARAR e VALIDAR**: `quickstart.md` Passos 1-3
4. Phase 3 (Polish)

---

## Notes

- Nenhuma tarefa cria função de backend nova, nenhuma migração, nenhum arquivo de frontend tocado —
  o hotfix mais cirúrgico desta sessão (research.md §2).
- `montarDadosSecao1Liq_` nunca é tocada por nenhuma tarefa — verificado por omissão, mais o teste
  explícito de T004(c).
- Commit após US1 + US2 completas, seguindo o ritmo já estabelecido nesta sessão.
