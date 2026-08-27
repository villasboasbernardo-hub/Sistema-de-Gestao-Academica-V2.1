---

description: "Task list template for feature implementation"
---

# Tasks: Épico B — Modularização do Frontend e do Backend

**Input**: Design documents from `specs/005-modularizacao-frontend-backend/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-view-contract.md, quickstart.md
(sem data-model.md — nenhuma entidade de dados envolvida, ver plan.md)

**Tests**: Não há tarefas de escrita de teste novo nesta spec — nenhuma função de backend muda
(research.md achado 4), então a suíte de invariantes estruturais já existente (`tests/unidade/*.test.ts`)
serve como guarda-corpo de não regressão (FR-007/SC-003), rodada nos checkpoints de cada fase, sem
precisar de teste novo escrito para este épico.

**Organization**: Tarefas agrupadas pelas 4 User Stories do spec.md, sequenciadas pela ordem real
de dependência entre elas (não pela ordem de prioridade P1/P2 do spec.md — ver nota abaixo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo com outras tarefas `[P]` da mesma fase (arquivos diferentes)
- **[Story]**: A qual User Story a tarefa pertence (US1..US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js: `lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts`,
`docs/arquitetura/*.md` — nenhuma estrutura nova (ver plan.md, Project Structure).

---

## Phase 1: Setup

**Purpose**: Registrar o estado da suíte antes de qualquer alteração, para comparação em cada
checkpoint.

- [X] T001 Rodar `pnpm vitest run` a partir da raiz do projeto e registrar a contagem
      atual de pass/fail/todo como baseline — nenhuma mudança de resultado é esperada em nenhum
      ponto deste épico, já que nenhuma função de backend é tocada (research.md achado 4).
      **Baseline (2026-08-15): 95 tests, 85 pass, 0 fail, 10 todo.**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Nenhuma tarefa foundational nesta spec.** As 4 User Stories são independentes entre si na
implementação — nenhuma extração de US1 é pré-requisito técnico de US3/US4. A única dependência
real entre stories é de **ordem de execução** (US2 precisa que US1 e US3 já tenham rodado, para
documentar o estado final de arquivos corretamente) — por isso a numeração das fases abaixo
sequencia US1 → US3 → US2 → US4, não a ordem de prioridade P1/P2 do spec.md (ver
`/speckit-analyze`, achado F1, 2026-08-15: a ordem original — US2 na Phase 4, antes de US3 na
Phase 5 — contradizia essa dependência real; corrigida aqui).

**Checkpoint**: Nenhum — pode-se seguir direto para a Phase 3.

---

## Phase 3: User Story 1 - Editar a tela de Avaliações sem navegar por outras telas (Priority: P1) 🎯 MVP

**Goal**: Tudo relacionado a Avaliações (agendar, painel de situação de execução, registrar vista
de prova) vive em `app/(app)/avaliacoes/page.tsx`, um arquivo novo e dedicado; `app/(app)/atividades/page.tsx`
volta a conter só AEC/TAD/TR/Estudo Individual (FR-001/FR-001a, Clarifications 2026-08-15).

**Independent Test**: quickstart.md, passos 2 a 5 — abrir Atividades Extraclasse (só lançamento
AEC/TAD/TR/EI), abrir Página do Curso (tetos/EI normais, sem painel/vista), abrir a nova aba
Avaliações (agendar, painel, vista, cancelar — tudo funcionando como antes da extração).

### Implementação da User Story 1

- [X] T002 [US1] Criar `app/(app)/avaliacoes/page.tsx` com o formulário "Agendar avaliação"
      (`#formAvaliacao`, `salvarAvaliacao()`) movido de `app/(app)/atividades/page.tsx`;
      adicionar `#avalTurma`/`popularTurmasavaliacoes()` (novo, só popula esse select, registrado
      em `contexto-pronto` — research.md achado 3) e `aplicarVisibilidadePorPerfilavaliacoes()`
      (novo, gate `Admin`/`Operador` cobrindo só o formulário de agendar — research.md achado 2).
- [X] T003 [US1] Em `app/(app)/avaliacoes/page.tsx` (mesmo arquivo de T002), mover de
      `app/(app)/cursos/[curso]/page.tsx` o painel de situação de execução (`#painelavaliacoes`,
      `carregarPainelavaliacoes()`, `cancelarLancamentoAvaliacao()`) e o registro de vista de
      prova (`#blocoVistaProva`, `popularSelectVistaProva()`, `salvarVistaProva()`) — contrato de
      arquivo completo em `contracts/frontend-view-contract.md`.
- [X] T004 [P] [US1] Em `app/(app)/atividades/page.tsx`: remover o bloco "Agendar
      avaliação" movido em T002; reduzir `popularTurmasExtra()` para popular só `#extraTurma`; e
      `aplicarVisibilidadePorPerfilExtra()` para cobrir só `#rowLancamentosExtra`/
      `#avisoSomenteLeituraExtra` (FR-001a — nenhum campo/função com "aval"/"avaliac" deve
      sobrar neste arquivo).
- [X] T005 [P] [US1] Em `app/(app)/cursos/[curso]/page.tsx`: remover o painel/vista movidos em T003;
      trocar a chamada direta em `aoTrocarCurso()` pela guarda
      `if (typeof carregarPainelavaliacoes === 'function') carregarPainelavaliacoes(idCurso);`
      (research.md achado 1 — único ponto de acoplamento permitido entre as duas views).
- [X] T006 [P] [US1] Em `app/layout.tsx`: adicionar item de menu "Avaliações"
      (`onclick="irPara('tabavaliacoes')"`) e `<div data-view="tabavaliacoes"><?!= include('Viewavaliacoes'); ?></div>`.
- [X] T007 [US1] Rodar `pnpm vitest run` e confirmar contagem idêntica ao baseline
      (T001); validar manualmente os passos 2 a 5 de `quickstart.md` (Acceptance Scenarios 1-4 do
      spec.md). **95/85/0/10, idêntico ao baseline. Verificação estática dos passos 2/4 (grep)
      confirmada; passos 3/5 (paridade visual no navegador) ficam para o teste de aceite ao vivo,
      igual ao protocolo de todos os épicos anteriores.**

**Checkpoint**: User Story 1 completa e testável isoladamente — `app/(app)/avaliacoes/page.tsx` existe e
funciona; `app/(app)/atividades/page.tsx` e `app/(app)/cursos/[curso]/page.tsx` continuam funcionando sem os blocos
movidos.

---

## Phase 4: User Story 3 - Totalizadores/Relatório em seu próprio arquivo de view (Priority: P2)

**Goal**: O bloco de totalizadores por curso vive em `app/(app)/relatorio/page.tsx`, um arquivo novo e
dedicado, deixando de inflar `app/(app)/cursos/[curso]/page.tsx` (FR-002).

**Independent Test**: quickstart.md, passo 6 — Página do Curso não mostra mais o bloco de
totalizadores diretamente; nova aba Relatório mostra os mesmos valores de antes da extração.

**Por que antes da User Story 2 nesta lista** (embora P2 > P1 no spec.md): a User Story 2 (Phase 5)
precisa listar `app/(app)/relatorio/page.tsx` como já existente para produzir uma tabela de arquitetura
correta — rodar esta fase antes evita reabrir a Phase 5 depois (`/speckit-analyze`, achado F1).

### Implementação da User Story 3

- [X] T008 [US3] Criar `app/(app)/relatorio/page.tsx` com o bloco de totalizadores
      (`#totalizadoresCurso`, `carregarTotalizadoresCurso()`) movido de
      `app/(app)/cursos/[curso]/page.tsx`.
- [X] T009 [US3] Em `app/(app)/cursos/[curso]/page.tsx`: remover o bloco de totalizadores movido em
      T008; confirmar que `aoTrocarCurso()` continua chamando
      `if (typeof carregarTotalizadoresCurso === 'function') carregarTotalizadoresCurso(idCurso);`
      (já existia antes da extração, ``app/(app)/cursos/[curso]/page.tsx`:127` — research.md achado 1; só remover a
      função duplicada do próprio arquivo, a guarda já está certa).
- [X] T010 [P] [US3] Em `app/layout.tsx`: adicionar item de menu "Relatório"
      (`onclick="irPara('tabRelatorio')"`) e `<div data-view="tabRelatorio"><?!= include('ViewRelatorio'); ?></div>`.
- [X] T011 [US3] Rodar `pnpm vitest run` e confirmar contagem idêntica ao baseline
      (T001); validar manualmente o passo 6 de `quickstart.md`. **95/85/0/10, idêntico ao
      baseline. Paridade visual no navegador fica para o teste de aceite ao vivo.**

**Checkpoint**: User Story 3 completa e testável isoladamente — totalizadores idênticos aos de
antes, agora em `app/(app)/relatorio/page.tsx`.

---

## Phase 5: User Story 2 - Documento de arquitetura reflete a estrutura real de arquivos (Priority: P1)

**Goal**: `docs/arquitetura/02-modularizacao.md` lista exatamente os arquivos backend/frontend que
existem no projeto, incluindo os criados organicamente (Épicos E/I/F) e os desta spec
(`app/(app)/avaliacoes/page.tsx`, `app/(app)/relatorio/page.tsx`), e marca explicitamente os módulos ainda não
construídos (FR-004/FR-005).

**Independent Test**: quickstart.md, passo 7 — toda linha da tabela corresponde a um arquivo real;
todo arquivo real aparece em alguma linha (ou está marcado "não construído ainda").

**Pré-requisito de ordem**: Phase 3 (US1) e Phase 4 (US3) já completas — T013 precisa listar
`app/(app)/avaliacoes/page.tsx`/`app/(app)/relatorio/page.tsx` com conteúdo real, não como "previsto".

### Implementação da User Story 2

- [X] T012 [US2] Reescrever a tabela "Backend — arquivos `.ts` por domínio" em
      `docs/arquitetura/02-modularizacao.md` com os 13 arquivos reais de `lib/acoes/*.ts` e `lib/dominio/*.ts`
      (research.md achado 5) — inclui `lib/dominio/regras-normativas.ts`, `lib/acoes/disciplinas.ts`, `lib/acoes/usuarios.ts`,
      corrige a lista de funções de `lib/acoes/instrutores.ts`; marca `lib/dominio/regime-curso.ts`, `lib/acoes/dashboards.ts`,
      `lib/dominio/motor-preditivo.ts` como "não construído — Épico G/H/nenhum épico sequenciado ainda"
      (não remove as linhas, FR-005).
- [X] T013 [US2] Reescrever a tabela "Frontend — arquivos incluídos via a importação de componentes" em
      `docs/arquitetura/02-modularizacao.md` com os 9 arquivos reais de `app/**/page.tsx` e `components/**/*.tsx`
      (`app/(app)/avaliacoes/page.tsx`, `app/(app)/relatorio/page.tsx` incluídos com conteúdo real, produzidos nas
      Phases 3/4); marca `app/(app)/inicio/page.tsx`, `app/(app)/cronograma/page.tsx`, `app/(app)/cursos/page.tsx`,
      `app/(app)/admin/calendario/page.tsx`, os 3 `Modal*.html` como "não construído ainda" (FR-005).
- [X] T014 [US2] Validar manualmente o passo 7 de `quickstart.md` (script `node -e` de listagem +
      comparação linha a linha contra as duas tabelas reescritas). **13 arquivos backend, 11
      frontend — toda linha "Construído" bate com um arquivo real, todo arquivo real aparece em
      alguma linha (construída ou marcada "não construído ainda" para módulos previstos).**

**Checkpoint**: Mapa de arquitetura 100% reconciliado com o projeto real — nenhuma linha aponta
para um arquivo inexistente sem estar marcada, nenhum arquivo real fica de fora.

---

## Phase 6: User Story 4 - Aviso de implantação parcial continua confiável com mais arquivos (Priority: P2)

**Goal**: A detecção de `o SHA do commit` (backend × frontend) continua funcionando corretamente com o
número atual de arquivos (FR-006).

**Independent Test**: quickstart.md, passo 8 — publicar deliberadamente backend/frontend
dessincronizados num ambiente de teste e confirmar que o banner de implantação parcial aparece.

### Implementação da User Story 4

- [X] T015 [US4] Incrementar `o SHA do commit` em `lib/supabase/server.ts` e `o SHA do commit_FRONTEND` em
      `app/layout.tsx` para o próximo sequencial (`2026-08-15.B.1`), nos dois lugares,
      igual (RF-MOD-04).
- [X] T016 [US4] Validar manualmente o passo 8 de `quickstart.md`: publicar uma versão de teste
      com `o SHA do commit` dessincronizado, confirmar o banner de implantação parcial, reverter antes do
      deploy real. **Mecanismo revisado por leitura de código (`app/layout.tsx`:78-84 continua
      comparando getBuildId() vs o SHA do commit_FRONTEND sem depender do número de arquivos) — a
      verificação ao vivo (publicar de fato um par dessincronizado) fica para o teste de aceite
      contra o banco real, mesmo protocolo de todos os épicos anteriores.**

**Checkpoint**: Todas as 4 User Stories completas e independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final de não regressão de todo o épico junto.

- [X] T017 [P] Rodar `pnpm vitest run` (suíte completa) uma última vez e confirmar
      contagem idêntica ao baseline registrado em T001 (SC-003). **95/85/0/10, idêntico em toda
      fase do épico — zero regressão do início ao fim.**
- [X] T018 Rodar `quickstart.md` do passo 1 ao 8 em sequência, como checagem final combinada de
      todas as User Stories antes do deploy via `o fluxo Git → Vercel` (deploy em si só acontece quando
      solicitado explicitamente, fora do escopo desta lista de tarefas). **Passos 1/2/4/7/8
      verificados estaticamente (suíte + grep + listagem real de arquivos, todos batendo); passos
      3/5/6 (paridade visual no navegador) ficam para o teste de aceite ao vivo contra o banco
      real, mesmo protocolo de todos os épicos anteriores desta sessão.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — roda primeiro.
- **Foundational (Phase 2)**: Vazia — nenhuma tarefa, nenhum bloqueio.
- **User Story 1 (Phase 3)**: Depende só do Setup. Nenhuma dependência de outra User Story.
- **User Story 3 (Phase 4)**: Depende só do Setup. Nenhuma dependência de US1 (arquivo/bloco
  diferente) — sequenciada antes de US2 só por conveniência de documentação (ver nota da Phase 4).
- **User Story 2 (Phase 5)**: T012 (tabela de backend) depende só do Setup. **T013 (tabela de
  frontend) depende de Phase 3 (US1) e Phase 4 (US3) completas** — única dependência real de
  ordem entre User Stories nesta spec, e o motivo da sequência de fases desta versão do documento.
- **User Story 4 (Phase 6)**: Depende só do Setup. Sequenciada por último por fazer mais sentido
  bumped no `o SHA do commit` depois que todo arquivo novo já existe (US1+US3), para o `o SHA do commit`
  refletir a versão final publicada — não é uma dependência técnica dura.
- **Polish (Phase 7)**: Depende de todas as User Stories desejadas estarem completas.

### Parallel Opportunities

- Dentro da Phase 3: T004, T005, T006 podem rodar em paralelo entre si (arquivos diferentes),
  desde que T002/T003 (conteúdo de `app/(app)/avaliacoes/page.tsx`) já tenham sido escritos primeiro.
- Dentro da Phase 4: T010 pode rodar em paralelo com T009 (arquivos diferentes), desde que T008
  já exista.
- **Entre User Stories**: Phase 3 (US1) inteira pode rodar em paralelo com a Phase 4 (US3) inteira
  — nenhum arquivo em comum além de `app/layout.tsx` (T006 vs. T010, linhas diferentes, sem conflito
  real de merge). Phase 5 (US2) só pode começar (T013) depois que as duas anteriores terminarem.

---

## Parallel Example: User Story 1

```bash
# Depois de T002/T003 (`app/(app)/avaliacoes/page.tsx` pronto), rodar em paralelo:
Task: "Remover o bloco de avaliação de `app/(app)/atividades/page.tsx` (T004)"
Task: "Remover painel/vista de `app/(app)/cursos/[curso]/page.tsx` (T005)"
Task: "Registrar #tabavaliacoes em `app/layout.tsx` (T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (User Story 1) — `app/(app)/avaliacoes/page.tsx` funcionando, é o único caso realmente
   confuso hoje (seis assuntos misturados em dois arquivos).
3. **PARAR E VALIDAR**: rodar `quickstart.md` passos 1-5.
4. Deploy via `o fluxo Git → Vercel` se aprovado — mesmo com US3/US2/US4 ainda pendentes (cada User Story é um
   incremento independente, RF-001 não depende de RF-002/004/006).

### Entrega Incremental

1. Setup → US1 (MVP: tela de Avaliações consolidada) → validar → deploy/demo.
2. US3 (Relatório em arquivo próprio) → validar → deploy/demo.
3. US2 (mapa de arquitetura reconciliado, depois de US1+US3 para ficar preciso) → validar.
4. US4 (`o SHA do commit` bump, confirma detecção de implantação parcial) → validar → deploy final.
5. Polish (checagem combinada final).

---

## Notes

- `[P]` = arquivos diferentes, sem conflito de merge entre si (pode ainda depender de uma tarefa
  anterior não-`[P]` da mesma fase).
- `[Story]` mapeia cada tarefa a uma User Story do spec.md para rastreabilidade.
- Nenhuma tarefa de backend nesta lista — confirmado por research.md achado 4 (nenhuma função
  precisa mudar de arquivo).
- Rodar `pnpm vitest run` depois de cada fase concluída (convenção já usada em todos
  os épicos anteriores desta sessão), não só nos checkpoints explicitamente listados acima.
- Commit por tarefa ou grupo lógico de tarefas da mesma User Story (constitution, Princípio VI);
  cada commit cita `RF-MOD-0x` (constitution, Princípio VIII — Rastreabilidade), igual ao padrão
  já usado em todos os épicos anteriores desta sessão.
