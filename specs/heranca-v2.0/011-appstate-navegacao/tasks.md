# Tasks: Arquitetura de Navegação com Estado Centralizado (AppState)

**Input**: Design documents from `specs/011-appstate-navegacao/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/appstate-contract.md`, `quickstart.md`

**Tests**: Solicitados para a parte testável por `pnpm vitest run` (FR-001/002, `AppState.invalidar()`/
`onChange()` — funções puras) — mesmo padrão já usado em `tests/unidade/design_system.test.ts`, que já
carrega `components/ciaara/` importadas diretamente do módulo (`export` explícito, sem carregamento dinâmico). Os pontos de
migração de flag→cache e os gatilhos de invalidação dentro de cada view (FR-003/004) envolvem
DOM/a Server Action — não testáveis por `pnpm vitest run`, verificação manual via `quickstart.md`.

**Organization**: Uma fase Foundational (infraestrutura `AppState`, bloqueia US2) + uma fase por
User Story de `spec.md`. US1 é proteção de não regressão (nada de novo para construir, só verificar
que a fase Foundational não quebrou seleção/filtro) — por isso vem depois da Foundational mas antes
de US2, mesmo sendo a prioridade mais alta: é o "checkpoint de segurança" antes de prosseguir para o
trabalho funcional novo de US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1/US2)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **181 testes, 181 passam, 0
      falham** (mesmo estado registrado em
      `implantacao/historico/2026-08-16-hotfix-010-sidebar-carrossel-estatisticas.md`) antes de
      tocar qualquer arquivo.

---

## Phase 2: Foundational — API do `AppState` (bloqueia US2)

**Purpose**: `AppState.cache`/`invalidar()`/`onChange()` (FR-001/002) e remoção do roteador morto
(FR-006) — pré-requisito de US2 (nenhuma view pode migrar sua flag para um mecanismo que ainda não
existe) e o próprio risco de regressão que US1 existe para verificar.

**⚠️ CRITICAL**: Nenhuma tarefa de US2 pode começar antes desta fase estar completa.

### Tests for Foundational ⚠️

> Escrever este teste PRIMEIRO — `AppState.cache`/`invalidar()`/`onChange()` ainda não existem, o
> teste deve falhar antes da implementação (T003).

- [X] T002 Escrever teste para `AppState.invalidar()`/`AppState.onChange()` em
      `tests/unidade/design_system.test.ts` (mesmo arquivo que já carrega `components/ciaara/` via
      importação direta do módulo, research.md §1) — casos (quickstart.md Passo 1): (a) `invalidar('chave')`
      remove só a chave informada, mantém as demais; (b) `invalidar(['a','b'])` remove as duas
      chaves informadas; (c) `invalidar('*')` remove todas as chaves em cache; (d)
      `invalidar('chave-nunca-populada')` não lança exceção (no-op seguro); (e) `onChange('chave',
      cb)` — `cb` é chamado quando `invalidar('chave')` roda, **não** é chamado quando outra chave é
      invalidada.

### Implementation for Foundational

- [X] T003 Implementar `AppState.cache` (objeto), `AppState.invalidar(chaves)`,
      `AppState.onChange(chave, callback)` e `AppState._listeners` (interno) em
      `components/ciaara/` (research.md §1: `invalidar()` sempre remove a chave do `cache` via
      `delete`, nunca marca como "suja"; `[].concat(chaves)` normaliza string única/array/`"*"`).
      Depende de T002 (teste deve existir e falhar antes).
- [X] T004 Remover `registrarRota`/`ROTAS`/`ROTAS[hash]` de `components/ciaara/` (FR-006,
      research.md §5 — confirmado código morto via `grep -rn "registrarRota\|ROTAS\[" app/*.html`
      antes da spec, só encontra a própria declaração). `irPara(hash)` não muda de assinatura nem de
      comportamento.
- [X] T005 Rodar `pnpm vitest run` — confirmar que os testes de T002 agora passam e que
      a suíte inteira continua em 0 falhas.

**Checkpoint**: `AppState.cache`/`invalidar()`/`onChange()` existem e testados; roteador morto
removido; `irPara` inalterado — pronto para US1 verificar não regressão e para US2 consumir.

---

## Phase 3: User Story 1 - Estado de seleção nunca se perde ao navegar (Priority: P1)

**Goal**: Confirmar que a Fase Foundational (edição de `components/ciaara/`) não quebrou a persistência de
seleção de curso/turma/filtro ao navegar entre telas — comportamento que já existe hoje via
`AppState.cursoSelecionado`/`turmaSelecionada`/`filtros` (nenhum desses 3 membros é tocado por esta
spec, `spec.md` Assumptions).

**Independent Test**: `quickstart.md` Passo 2 — selecionar curso/turma na Página do Curso, navegar
por 3 telas diferentes e voltar, confirmar que a seleção persiste. Não depende de US2.

### Verificação manual (não automatizável — FR-007)

- [ ] T006 [US1] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — selecionar curso/turma na Página do Curso, navegar para Avaliações → DSA →
      Cronograma → voltar para a Página do Curso, confirmar que o mesmo curso/turma continuam
      selecionados; repetir com um filtro ativo (ex.: filtro de status de turma) em vez de
      curso/turma.

**Checkpoint**: nenhuma regressão de RF-NAV-03 introduzida pela Fase Foundational — seguro
prosseguir para o trabalho funcional novo de US2.

---

## Phase 4: User Story 2 - Painel de estatísticas nunca mostra dado desatualizado (Priority: P1)

**Goal**: Migrar as 3 flags de cache ad hoc (`estatisticasCursoCarregadas`/
`estatisticasDisciplinasCarregadas`/`estatisticasInstrutoresCarregadas`) para `AppState.cache`
(FR-003) e disparar `AppState.invalidar(...)` no conjunto completo de escritas que cada painel
realmente agrega, incluindo o ponto cross-file em `app/(app)/turmas/[turma]/dsa/page.tsx` (FR-004, achado do
`/speckit-clarify`).

**Independent Test**: `quickstart.md` Passos 3-5 — editar uma disciplina (ou lançar uma aula pelo
DSA) e confirmar que o painel de Disciplinas reflete a mudança sem recarregar a página; idem para
Instrutores; confirmar que reabrir sem escrita relevante não gera chamada de rede nova.

### Implementation for User Story 2

- [X] T007 [P] [US2] Migrar `estatisticasCursoCarregadas` para `AppState.cache['estatisticasCursoTurma']`
      em `app/(app)/cursos/[curso]/page.tsx` — `alternarEstatisticasCurso`/`carregarEstatisticasCursoTurma`
      passam a checar `AppState.cache['estatisticasCursoTurma']` antes de buscar, e gravar
      `{ cursos, turmas }` lá após buscar (data-model.md §1, FR-003). Nenhum ponto de invalidação
      nesta tarefa — achado do clarify: `cursos`/`turmas` não têm hoje escrita em app.
- [X] T008 [P] [US2] Migrar `estatisticasDisciplinasCarregadas` para
      `AppState.cache['estatisticasDisciplinas']` em `app/(app)/disciplinas/page.tsx` —
      `alternarEstatisticasDisciplinas`/`carregarEstatisticasDisciplinas` passam a checar/gravar o
      cache (FR-003).
- [X] T009 [US2] Em `salvarDisciplina(idGrade)` (`app/(app)/disciplinas/page.tsx`:95-107`), **criar**
      um `.then(() => AppState.invalidar('estatisticasDisciplinas'))` em cada um dos 2 a Server Action
      independentes que a função já dispara (`gs('atualizarDisciplina', ...)`, sempre disparado; e
      `gs('definirPrioridadeDisciplina', ...)`, condicional) — **achado do `/speckit-analyze` (F1)**:
      hoje nenhum dos dois tem `.then()` nenhum, só `.catch(e => alert(...))` — não é "adicionar a um
      handler existente", é criar um novo em cada chamada (invalidar duas vezes se as duas tiverem
      sucesso é um no-op inofensivo, mesmo espírito conservador de research.md §4). Depende de T008
      (a chave só existe depois da migração).
- [X] T010 [P] [US2] Migrar `estatisticasInstrutoresCarregadas` para
      `AppState.cache['estatisticasInstrutores']` em `app/(app)/instrutores/page.tsx` —
      `alternarEstatisticasInstrutores`/`carregarEstatisticasInstrutores` passam a checar/gravar o
      cache (FR-003).
- [X] T011 [US2] Adicionar `AppState.invalidar('estatisticasInstrutores')` no `.then(...)` de sucesso
      de `cadastrarInstrutor`, `atualizarInstrutor` e `desativarInstrutor` em
      `app/(app)/instrutores/page.tsx` (FR-004). Depende de T010.
- [X] T012 [US2] Adicionar `AppState.invalidar('estatisticasDisciplinas')` no `.then(...)` de sucesso
      de `salvarLancarAula` (sempre invalida — cria uma linha `Aula`) e de `excluirBlocoDsa` (invalida
      para qualquer bloco excluído que não seja `AVA-`/`EXT-` — estratégia conservadora, research.md
      §4: mais seguro invalidar de mais do que de menos) em `app/(app)/turmas/[turma]/dsa/page.tsx`. **Não**
      adicionar invalidação em `aoDropBlocoDsa`/`moverLancamentoDsa` — só muda data/TA, nunca a carga
      horária executada (research.md §4). Cross-file: depende de T008 (a chave é definida em
      `app/(app)/disciplinas/page.tsx`, mas invalidada por uma escrita de outro arquivo).
- [ ] T013 [US2] Seguir `quickstart.md` Passo 3 no navegador — editar uma disciplina (ou lançar uma
      aula pelo DSA até completar a carga horária), reabrir o painel de estatísticas de Disciplinas
      sem recarregar a página, confirmar que o número de "Concluídas" reflete a mudança.
- [ ] T014 [US2] Seguir `quickstart.md` Passo 4 no navegador — cadastrar um instrutor novo, reabrir o
      painel de estatísticas de Instrutores sem recarregar a página, confirmar que o novo instrutor
      já está contado.
- [ ] T015 [US2] Seguir `quickstart.md` Passo 5 no navegador (aba de rede aberta) — reabrir um painel
      de estatísticas sem nenhuma escrita relevante desde a última abertura, confirmar que nenhuma
      nova chamada da Server Action aparece (FR-005/SC-002).

**Checkpoint**: as 3 flags substituídas por `AppState.cache`; invalidação cobrindo o conjunto
completo definido no `/speckit-clarify` (não só as 3 escritas "primárias").

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, `o SHA do commit`, documentação.

- [X] T016 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline +
      os testes novos de T002) em 0 falhas, 0 regressão.
- [X] T017 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e
      `const o SHA do commit_FRONTEND` em `app/layout.tsx` — sugestão `2026-08-16.D.1` (letra do
      épico no documento 06, mesmo padrão de todo épico lettered anterior nesta sessão).
- [X] T018 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linhas de `components/ciaara/` (ganha
      `AppState.cache`/`invalidar()`/`onChange()`, perde `registrarRota`/`ROTAS`) e das 4 views
      tocadas (`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx`/`app/(app)/instrutores/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx`). **Não
      tocar** `docs/arquitetura/04-appstate.md`/`03-design-system.md` — permanecem com edições
      locais não commitadas de uma sessão anterior, fora do escopo de qualquer épico desta sessão
      (instrução permanente).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEIA US1 e US2** — nenhuma das duas pode
  começar antes de `AppState.cache`/`invalidar()`/`onChange()` existirem.
- **US1 (Phase 3)**: depende só da Foundational — é a verificação de que a Foundational não quebrou
  nada, não depende de US2.
- **US2 (Phase 4)**: depende só da Foundational (não de US1 — US1 é verificação, não implementação).
  T007/T008/T010 (as 3 migrações de flag→cache) são paralelas entre si (arquivos diferentes);
  T009/T011/T012 (invalidação) dependem cada uma da migração da chave correspondente já ter
  acontecido.
- **Polish (Phase 5)**: depende de US1 e US2 completas.

### Within User Story 2

- Migração de flag→cache (T007/T008/T010) antes de qualquer invalidação daquela chave
  (T009/T011/T012) — não é possível invalidar uma chave que a view ainda não usa.
- T012 (invalidação cross-file em `app/(app)/turmas/[turma]/dsa/page.tsx`) convém vir depois de T008 só por ordem de revisão
  — `AppState.invalidar('estatisticasDisciplinas')` é uma chamada a uma chave string num objeto
  global compartilhado, não uma dependência técnica real: escrever T012 antes de T008 não quebra
  nada (seria só um no-op invalidando uma chave que `app/(app)/disciplinas/page.tsx` ainda não consome —
  achado do `/speckit-analyze`, L1). Não depende de T009 (a invalidação dentro do próprio
  `app/(app)/disciplinas/page.tsx` é independente da de `app/(app)/turmas/[turma]/dsa/page.tsx`).

### Parallel Opportunities

- T007/T008/T010 (as 3 migrações de flag→cache) podem rodar em paralelo entre si — 3 arquivos
  diferentes, nenhuma dependência cruzada.
- T017/T018 (Polish) podem rodar em paralelo entre si — arquivos diferentes.

---

## Parallel Example: as 3 migrações de flag→cache (US2)

```bash
Task: "T007 [P] [US2] Migrar estatisticasCursoCarregadas em `app/(app)/cursos/[curso]/page.tsx`"
Task: "T008 [P] [US2] Migrar estatisticasDisciplinasCarregadas em `app/(app)/disciplinas/page.tsx`"
Task: "T010 [P] [US2] Migrar estatisticasInstrutoresCarregadas em `app/(app)/instrutores/page.tsx`"
```

---

## Implementation Strategy

### MVP First (Foundational + US1)

1. Completar Phase 1 (Setup).
2. Completar Phase 2 (Foundational — `AppState.cache`/`invalidar()`/`onChange()`, remoção do
   roteador morto).
3. Completar Phase 3 (US1 — verificar não regressão).
4. **PARAR E VALIDAR**: a Foundational sozinha já é implantável — `AppState` ganha a API completa
   sem nenhuma view consumindo ainda, zero risco de regressão em painel de estatística (que continua
   com a flag antiga até US2).

### Incremental Delivery

1. Setup → Foundational → US1 (verificação) → implantável isoladamente, sem risco.
2. US2 (as 3 migrações + invalidação cross-file) → implantável junto, mesmo `o SHA do commit`.
3. Polish → implantar tudo junto via `o fluxo Git → Vercel`.

---

## Notes

- Nenhuma tarefa deste épico cria arquivo novo — as mudanças entram inteiramente nos 5 arquivos já
  existentes citados em `plan.md`.
- Commit por fase concluída (Foundational, US1, US2, Polish) — 4 commits esperados na implementação.
