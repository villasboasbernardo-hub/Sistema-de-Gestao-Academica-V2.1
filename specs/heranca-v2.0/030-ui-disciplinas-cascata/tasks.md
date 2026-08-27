---

description: "Task list for Módulo de Disciplinas — Navegação em Cascata e Edição de Período/Instrutor por Turma"
---

# Tasks: Módulo de Disciplinas — Navegação em Cascata e Edição de Período/Instrutor por Turma

**Input**: Design documents from `/specs/030-ui-disciplinas-cascata/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-functions.md,
quickstart.md

**Tests**: não incluídos — mudança de DOM/UI puro em `.html`, sem harness de mock disponível
(mesmo padrão de toda spec de frontend-only desta sessão, ex. spec 026); validado via
`quickstart.md`, não `pnpm vitest run`.

**Organization**: 2 User Stories (ambas P1). Sem fase de Setup/Foundational — nenhuma
infraestrutura compartilhada além do que já existe (backend 100% reaproveitado, `AppState.ctx.
turmas` já em memória) — o trabalho começa direto em US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (funções distintas, sem dependência)
- **[Story]**: US1 (cascata + tabela) ou US2 (edição com busca e bloqueio client-side)

## Path Conventions

Single arquivo de frontend: `app/(app)/disciplinas/page.tsx` — conforme `plan.md` § Project
Structure. Nenhum arquivo de backend tocado (FR-009).

---

## Phase 1: User Story 1 — Navegar em cascata Curso → Turma e ver a grade daquela turma (Priority: P1)

**Goal**: Seletor de Turma populado dinamicamente (sem chamada de rede nova) + tabela de
disciplinas da turma selecionada, com resumo compacto de instrutores — tudo aditivo, sem tocar a
edição de grade já existente (FR-002.1).

**Independent Test**: `quickstart.md` Passo 1 — curso com 2 turmas, trocar de turma e confirmar
que a tabela muda de conteúdo, sem afetar a edição de grade acima.

### Implementação da User Story 1

- [X] T001 [US1] Adicionar HTML da seção nova em `app/(app)/disciplinas/page.tsx` — seletor de
  Turma (`#discTurmaSelecao`), container da tabela (`#discTabelaTurmaContainer`,
  `#corpoTabelaDisciplinasTurma`) e container do painel de edição
  (`#painelEdicaoDisciplinaTurma`), todos abaixo do bloco `row mb-4` já existente, inicialmente
  ocultos (`style="display:none"`) — aditivo, nunca substitui nada (FR-002.1)
- [X] T002 [US1] Estender `aoTrocarCursoDisciplinas()` em `app/(app)/disciplinas/page.tsx` em 2
  pontos (achado de `/speckit-analyze`, C1): (a) no `return` antecipado do `if (!idCurso)` — junto
  da limpeza já existente das 2 tabelas antigas, também esconder/resetar o seletor de Turma, a
  tabela por turma e o painel de edição desta spec (senão ficam visíveis com dado do curso
  anterior ao deselecionar o curso); (b) ao final do corpo já existente, chamar
  `popularTurmasDisciplinas_(idCurso)`. Nenhuma mudança no comportamento já existente das 2 tabelas
  antigas (FR-002.1) (depends on T001)
- [X] T003 [P] [US1] Implementar `popularTurmasDisciplinas_(idCurso)` em `app/
  `app/(app)/disciplinas/page.tsx`` — filtra `AppState.ctx.turmas` por `idCurso` (sem a Server Action novo, research.md
  § 1), popula `#discTurmaSelecao`, mensagem informativa se vazio, reseta tabela/painel
- [X] T004 [US1] Implementar `aoTrocarTurmaDisciplinas_()` em `app/(app)/disciplinas/page.tsx`
  (depends on T003)
- [X] T005 [US1] Implementar `carregarDisciplinasDaTurma_(idTurma)` em `app/
  `app/(app)/disciplinas/page.tsx`` — `Promise.all` de `crudListar('turma_disciplina')`/`('instrutor_disciplina')`/`('instrutores')`, filtra por `ID_Turma`/`Status='Ativo'` (depends on T004)
- [X] T006 [P] [US1] Implementar `resumoInstrutoresCompacto_(idInstrutorCsv, instrutorPorId)` em
  `app/(app)/disciplinas/page.tsx` (função pura, contrato `frontend-functions.md`)
- [X] T007 [US1] Implementar `renderizarTabelaDisciplinasTurma_(linhas, vinculos, instrutores)` em
  `app/(app)/disciplinas/page.tsx` — colunas Nome/Início/Término/Instrutores Selecionados
  (via T006)/Ações, mensagem quando vazio (depends on T005, T006)

**Checkpoint**: Cascata + tabela funcionais e testáveis isoladamente — falta só o botão "Editar"
abrir algo (US2).

---

## Phase 2: User Story 2 — Editar período e instrutores de uma disciplina, com validação instantânea (Priority: P1)

**Goal**: Painel de edição com busca de instrutor e bloqueio client-side de período fora da janela
da turma, salvando via `atualizarTurmaDisciplina` já existente.

**Independent Test**: `quickstart.md` Passo 2 — editar uma disciplina, tentar salvar data fora da
janela (bloqueado sem chamada de rede), corrigir e salvar (aceito, tabela atualizada).

### Implementação da User Story 2

- [X] T008 [P] [US2] Implementar `intervaloContidoEmClient_(inicioA, fimA, inicioB, fimB)` em
  `app/(app)/disciplinas/page.tsx` (função pura, cópia funcional exata de `intervaloContidoEm_`,
  `lib/acoes/liq.ts`, research.md § 4)
- [X] T009 [US2] Implementar `abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)` em `app/
  `app/(app)/disciplinas/page.tsx`` — painel `style.display` (nenhum `.modal` Tailwind CSS, achado real), campos
  de data pré-preenchidos, checkboxes de instrutor habilitado com campo de busca, pré-marcados
  conforme `ID_Instrutor` atual, mensagem se não houver habilitados (depends on T007)
- [X] T010 [US2] Implementar `filtrarInstrutoresEdicaoDisciplina_()` em `app/
  `app/(app)/disciplinas/page.tsx`` — filtra os checkboxes já renderizados em tempo real, sem chamada de rede
  (mesmo padrão de UX de `filtrarPainelDisciplinasInstrutor_`, spec 019) (depends on T009)
- [X] T011 [US2] Implementar `salvarEdicaoDisciplinaTurma_(idTurmaDisciplina)` em `app/
  `app/(app)/disciplinas/page.tsx`` — lê datas + checkboxes marcados, valida via T008 contra a janela da turma
  (`AppState.ctx.turmas`); bloqueia com `alert()` sem chamar o backend se inválido; senão chama
  `gs('atualizarTurmaDisciplina', ...)`, atualiza a linha da tabela e fecha o painel no sucesso
  (depends on T008, T009)

**Checkpoint**: Fluxo completo — cascata (US1) + edição validada (US2).

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T012 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `app/(app)/disciplinas/page.tsx`
- [X] T013 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  — `2026-08-20.UIDISC.1`
- [X] T014 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 030
- [ ] T015 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado — `o fluxo Git → Vercel
  push`/`o merge na `main` (a Vercel publica em produção)` concluído em 2026-08-20 (deployment `@52`); falta apenas a validação manual
  no navegador.
- [X] T016 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-005 da spec —
  nenhum caso novo, só confirma ausência de regressão) — 354/354 passando.

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**: sem dependências externas — todo o backend/dado já existe
- **US2 (Phase 2)**: depende de T007 (US1) — o botão "Editar" só existe depois da tabela renderizar
- **Polish (Phase 3)**: depende de US1 e US2 completas

### Within Each User Story

- US1: T001 → T002 → T003 → T004 → T005 → T007 (T006 em paralelo, função pura sem dependência de
  DOM)
- US2: T008 (paralelo a T001-T007) → T009 → T010 → T011

### Parallel Opportunities

- T003 e T006 (funções puras/independentes, sem dependência de DOM entre si)
- T008 pode começar a qualquer momento (função pura, sem dependência de nenhuma outra task)
- T012 (Polish, arquivo de documentação distinto)

---

## Parallel Example: User Story 1

```bash
Task: "Implementar popularTurmasDisciplinas_(idCurso) em `app/(app)/disciplinas/page.tsx`"
Task: "Implementar resumoInstrutoresCompacto_(idInstrutorCsv, instrutorPorId) em `app/(app)/disciplinas/page.tsx`"
```

---

## Implementation Strategy

### MVP = as 2 histórias juntas

Como em US1 sozinha o botão "Editar" não faria nada (US2 ainda não existe), o menor incremento
útil é as 2 histórias completas — mesmo padrão já observado na spec 029.

1. Completar Phase 1 (US1)
2. Completar Phase 2 (US2)
3. **PARAR e VALIDAR**: `quickstart.md` Passos 1-3
4. Phase 3 (Polish)

---

## Notes

- Nenhuma tarefa desta lista toca `lib/acoes/*.ts` e `lib/dominio/*.ts` nem `app/(app)/cursos/[curso]/page.tsx` (FR-009/
  FR-010) — só `app/(app)/disciplinas/page.tsx`.
- Commit após US1 + US2 completos, seguindo o ritmo já estabelecido nesta sessão.
