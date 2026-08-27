---

description: "Task list for Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)"
---

# Tasks: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

**Input**: Design documents from `/specs/035-refinamento-ui-disciplinas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos para toda função pura nova/alterada (backend e frontend) — harness de mock já
disponível (`tests/unidade/regras_de_negocio_backend.test.ts` para `.ts`, `tests/unidade/regras_ui_dados.test.ts`
para funções puras carregadas de `.html` via `vm`). Sem harness de mock para DOM/modal/renderização
real — verificado por `quickstart.md` manual (mesmo padrão de toda spec de frontend desta sessão).

**Organization**: 4 User Stories — US1/US2 (P1), US3/US4 (P2). Todas tocam `app/(app)/disciplinas/page.tsx`,
então há sobreposição real de arquivo (não de função) entre elas — dependências explícitas abaixo em
vez de paralelismo forçado onde o arquivo é compartilhado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos ou funções distintas, sem dependência)
- **[Story]**: US1 (estado inicial) · US2 (datas dd/mm/aaaa) · US3 (modal centralizado) ·
  US4 (nome do instrutor)

## Path Conventions

Backend: `lib/acoes/cronograma.ts` (função nova), `lib/supabase/server.ts` (função estendida).
Frontend: `app/(app)/disciplinas/page.tsx` (único arquivo de UI tocado). Testes:
`tests/unidade/regras_de_negocio_backend.test.ts`, `tests/unidade/regras_ui_dados.test.ts`.

---

## Phase 1: Foundational (Bloqueante)

**Purpose**: Utilitários puros de data consumidos por US1 (exibição), US2 (entrada+validação+
gravação) e US3 (o mesmo painel de edição que passa a virar modal) — construir uma vez, reaproveitar
nos 3 lugares, nunca duplicar (mesmo espírito de FR-012 aplicado a datas).

**⚠️ CRITICAL**: T003/T005/T009/T011 dependem desta fase.

- [X] T001 [P] Implementar `mascaraDataBr_(valorDigitado)`, `dataBrParaIso_(dataBr)` (valida dia/mês
  calendaricamente, ex.: rejeita `31/02`) e `isoParaDataBr_(iso)` em
  `app/(app)/disciplinas/page.tsx` — funções puras, mesmo padrão de `mascaraCpf_`/`mascaraCep_`
  (``app/(app)/instrutores/page.tsx`:816-841`, research.md §4)
- [X] T002 Adicionar casos em `tests/unidade/regras_ui_dados.test.ts`: `mascaraDataBr_` formata dígitos
  parciais sem lançar exceção; `dataBrParaIso_` aceita `dd/mm/aaaa` válido e rejeita
  `31/02/2026`/formato incompleto/vazio; `isoParaDataBr_` faz o caminho inverso; round-trip
  `isoParaDataBr_(dataBrParaIso_(x)) === x` para datas válidas (depends on T001)

**Checkpoint**: Utilitários de data prontos e testados — US1/US2/US3 podem prosseguir.

---

## Phase 2: User Story 1 — Estado inicial com disciplinas do ano vigente (Priority: P1) 🎯 MVP

**Goal**: Ao abrir a aba Disciplinas, a tabela já mostra as disciplinas de todos os cursos, turmas do
ano vigente (`Planejada`/`Ativa`/`Concluida`, nunca `Cancelada`), sem nenhum clique.

**Independent Test**: `quickstart.md` Passo 1 — sessão nova, aba Disciplinas, tabela já preenchida
sem seleção prévia de Curso/Turma.

### Implementação da User Story 1

- [X] T003 [P] [US1] Implementar `getDisciplinasAnoVigente(ano)` em `lib/acoes/cronograma.ts` —
  3 leituras de aba (`turmas`/`turma_disciplina`/`registros_aula`), cada uma
  exatamente 1 vez, agregação de CH Cumprida por chave composta `ID_Turma`+`ID_Grade`; retorno no
  mesmo shape cru de `turma_disciplina` + `ID_Curso`/`ChExecutada` sintéticos, para reaproveitar
  `linhaVisao2_` no frontend sem função de renderização paralela (contracts/backend-functions.md,
  FR-004.1 — desvio de implementação registrado no próprio contrato)
- [X] T004 [US1] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `getDisciplinasAnoVigente`: ano sem turma → `[]`; turma `Cancelada` excluída, `Planejada`/`Ativa`/
  `Concluida` incluídas; 2 turmas com a mesma `ID_Grade` → `chExecutada` independente por turma
  (prova da chave composta); disciplina sem registro em `registros_aula` →
  `chExecutada = 0`; número de leituras de `registros_aula` não escala com o número de
  turmas (mesmo tipo de teste de regressão da spec 017) (depends on T003)
- [X] T005 [US1] Em `app/(app)/disciplinas/page.tsx`: extrair a chamada a
  `gs('getDisciplinasAnoVigente', ano)` + renderização para uma função `mostrarEstadoInicialDisciplinas_()`
  reaproveitando as colunas/ações da Visão 2 + uma coluna "Curso" nova (FR-003, data-model.md); usar
  `isoParaDataBr_` (T001) para Início/Término; chamar essa função tanto no listener `contexto-pronto`
  quanto — no lugar do prompt "Selecione um curso primeiro…" atual — dentro de
  `resetarTudoDisciplinas_()`/`aoTrocarCursoDisciplinas()` sempre que `idCurso` estiver vazio
  (FR-001.1, achado do `/speckit-analyze` F2: "nada selecionado" é sempre o mesmo estado, não só no
  primeiro carregamento) (depends on T001, T003)
- [X] T006 [US1] Mesmo arquivo/função de T005 — mensagem de estado vazio ("nenhuma disciplina no ano
  vigente") quando `getDisciplinasAnoVigente` devolve `[]`, nunca erro nem tabela em branco sem
  explicação (edge case do spec.md) (depends on T005)

**Checkpoint**: Estado inicial funcional e testável de forma independente — MVP entregável mesmo sem
US2/US3/US4 (datas aparecem em ISO até a US2 rodar, mas a tabela já popula sozinha).

---

## Phase 3: User Story 2 — Padronização rígida de datas em dd/mm/aaaa (Priority: P1)

**Goal**: Toda data exibida ou editada no módulo aparece e é gravada em dd/mm/aaaa, sem inversão de
fuso na gravação.

**Independent Test**: `quickstart.md` Passo 2 — editar uma data, salvar, recarregar, conferir que o
mesmo dia/mês/ano volta.

### Implementação da User Story 2

- [X] T007 [P] [US2] Estender `ehColunaData_(h)` em `lib/supabase/server.ts` para reconhecer
  `Previsao_Inicio`/`Previsao_Termino` por nome literal (allowlist, não regex mais permissivo —
  contracts/backend-functions.md, research.md §3)
- [X] T008 [US2] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts`:
  `ehColunaData_('Previsao_Inicio')`/`('Previsao_Termino')` → `true`;
  `ehColunaData_('Previsao_Curso')` (nome parecido) → `false`; colunas `Data*`/`*_Data*` já
  cobertas continuam `true`; `crudAtualizar('turma_disciplina', id, { Previsao_Inicio: ... })`
  grava e lê de volta o mesmo valor exato (prova end-to-end do bug corrigido) (depends on T007)
- [X] T009 [US2] Em `app/(app)/disciplinas/page.tsx`, função de renderização do painel de edição
  (hoje ~linha 385-441): trocar os 2 `<input type="date">` por `<input type="text">` com
  `oninput="this.value = mascaraDataBr_(this.value)"` (T001); ao salvar, converter via
  `dataBrParaIso_` antes de `gs('atualizarTurmaDisciplina', ...)`, bloqueando o envio se a conversão
  falhar (data inválida) (depends on T001, T005 — mesmo arquivo, função de edição distinta da
  tabela)
- [X] T010 [US2] Mesmo bloco de T009 — sinalização visual do campo quando a data for inválida/
  incompleta (classe `is-invalid` do Tailwind CSS, já usado em outros formulários do projeto), sem
  disparar nenhuma chamada de rede até a correção (depends on T009)

**Checkpoint**: Datas corretas em toda a tela (estado inicial, Visão 2, painel de edição) e gravação
sem inversão de fuso — validável independentemente das US3/US4.

---

## Phase 4: User Story 3 — Painel de edição como modal centralizado (Priority: P2)

**Goal**: O painel de edição aparece centralizado na tela, com fundo escurecido bloqueando o resto
da página, em vez de no final do fluxo normal.

**Independent Test**: `quickstart.md` Passo 3 — clicar em "Editar" em qualquer ponto de rolagem,
painel centralizado aparece sem precisar rolar.

### Implementação da User Story 3

- [X] T011 [US3] Em `app/(app)/disciplinas/page.tsx`, reestruturar o HTML de
  `painelEdicaoDisciplinaTurma` para o padrão Tailwind CSS `.modal` + `.modal-dialog-centered` +
  `.modal-content` (research.md §5); trocar `style.display='none'/'block'` por
  `new Tailwind.Modal(elemento).show()`/`.hide()` em `abrirEdicaoDisciplinaTurma_`/no fechamento
  (depends on T009 — mesmo bloco HTML que a US2 acabou de alterar)
- [X] T012 [US3] Mesmo bloco de T011 — conferir que o botão "Cancelar" e o clique no backdrop (
  comportamento padrão do componente Tailwind CSS) fecham sem salvar e sem alterar a seleção de
  Curso/Turma (ou a tabela de estado inicial) vigente (depends on T011)

**Checkpoint**: Modal centralizado funcional, sem regressão nos campos de data (US2) nem na leitura
inicial (US1).

---

## Phase 5: User Story 4 — Formatação padronizada do nome do instrutor (Priority: P2)

**Goal**: Todo nome de instrutor exibido no módulo de Disciplinas usa `formatarNomeInstrutor_`
(`components/ciaara/`), idêntico ao Módulo de Instrutores.

**Independent Test**: `quickstart.md` Passo 4 — comparar o texto de um mesmo instrutor entre os dois
módulos.

### Implementação da User Story 4

- [X] T013 [P] [US4] Em `app/(app)/disciplinas/page.tsx`, substituir a montagem manual de nome em
  `resumoInstrutoresCompacto_` por `formatarNomeInstrutor_(inst.Posto_Graduacao, inst.Esp_Hab_Obs,
  inst.Nome_Completo, inst.Nome_Guerra, true)` — preserva a degradação para ID cru quando o
  instrutor é órfão (FR-013) (depends on T005 — mesma tabela)
- [X] T014 [US4] Mesmo arquivo, lista de checkboxes de instrutores habilitados no painel de edição
  (hoje ~linha 379-380): trocar `inst.Nome_Completo` cru por `formatarNomeInstrutor_(...,
  isHTML=true)` dentro do `<label>` (depends on T011 — mesmo bloco do modal)
- [X] T015 [US4] Adicionar/estender casos em `tests/unidade/regras_ui_dados.test.ts` provando que
  `app/(app)/disciplinas/page.tsx` usa `formatarNomeInstrutor_` (mesmo texto de saída que
  `tests/unidade/design_system.test.ts` já espera para o mesmo instrutor sintético) e que um `ID_Instrutor`
  órfão degrada para o ID cru em ambos os pontos (T013, T014) (depends on T013, T014)

**Checkpoint**: Todas as 4 histórias entregues — critério de aceite completo do `spec.md` verificável.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Atualizar `o histórico de deploys da Vercel` — novas entradas para `lib/acoes/cronograma.ts`/`lib/supabase/server.ts`/
  `app/(app)/disciplinas/page.tsx`
- [X] T017 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (protocolo padrão, documento 10 §8) — `2026-08-21.DISCUX.1`
- [X] T018 [P] Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 035
- [X] T019 Rodar `pnpm vitest run` completo, confirmar 0 falhas — **405/405, 0 falhas**
  (baseline 382 + 23 casos novos desta spec)
- [X] T020 ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (`o histórico de deploys da Vercel`) — ``git push` (a Vercel publica a preview da branch)` (33 arquivos) +
  `o merge na `main` (a Vercel publica em produção)` no `deploymentId` fixo do projeto, **deployment `@57`**
- [ ] T021 Executar `quickstart.md` Passos 1 a 4 manualmente contra o deploy publicado —
  **pendência real**: requer login /navegador, fora do alcance desta sessão automatizada

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências — bloqueia T003/T005/T009/T011 (qualquer tarefa que
  toque data)
- **US1 (Phase 2)**: depende de Foundational; independente de US2/US3/US4 no plano de dados (backend
  novo isolado), mas T005 é o primeiro ponto de contato com `app/(app)/disciplinas/page.tsx` que as demais
  histórias vão editar depois
- **US2 (Phase 3)**: depende de Foundational; T009 depende de T005 (mesmo arquivo)
- **US3 (Phase 4)**: depende de T009 (mesmo bloco HTML do painel de edição)
- **US4 (Phase 5)**: T013 depende de T005 (tabela); T014 depende de T011 (painel já modal)
- **Polish (Phase 6)**: depende de US1+US2+US3+US4 completas

### Parallel Opportunities

- T001 (Foundational) e T003 (US1, `lib/acoes/cronograma.ts`) — arquivos distintos, sem dependência entre si
- T007 (US2, `lib/supabase/server.ts`) pode rodar a qualquer momento após Foundational — arquivo distinto de
  `app/(app)/disciplinas/page.tsx`, sem dependência de T003/T005
- T013 (US4) — arquivo compartilhado, mas função (`resumoInstrutoresCompacto_`) distinta de
  T009/T011; ainda assim, um único agente sequencial deve tratar `app/(app)/disciplinas/page.tsx` como um
  recurso compartilhado (mesmo caveat da spec 033 para tarefas no mesmo arquivo)
- T016/T018 (Polish, arquivos de documentação distintos)

---

## Parallel Example: Foundational + US1(backend) + US2(backend)

```bash
Task: "Implementar mascaraDataBr_/dataBrParaIso_/isoParaDataBr_ em `app/(app)/disciplinas/page.tsx` (T001)"
Task: "Implementar getDisciplinasAnoVigente(ano) em `lib/acoes/cronograma.ts` (T003)"
Task: "Estender ehColunaData_ em `lib/supabase/server.ts` (T007)"
```

Estas 3 tarefas tocam 3 arquivos diferentes e não têm dependência entre si — só as tarefas de
frontend subsequentes (T005/T009/T011/T013/T014) precisam ser sequenciais, por tocarem o mesmo
`app/(app)/disciplinas/page.tsx`.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Foundational)
2. Completar Phase 2 (US1) — tabela de estado inicial já funcional, mesmo com datas ainda em ISO
3. **PARAR e VALIDAR**: `quickstart.md` Passo 1
4. Deploy/demo se desejado

### Incremental Delivery

1. Foundational → US1 (MVP: tabela sem clique) → validar
2. US2 (datas corretas em toda a tela + gravação sem inversão) → validar
3. US3 (modal centralizado) → validar
4. US4 (nome do instrutor padronizado) → validar
5. Polish (commit, PR, preview da Vercel, quickstart completo)

---

## Notes

- Todas as 4 histórias tocam `app/(app)/disciplinas/page.tsx` — nenhuma é 100% paralelizável com
  as demais no frontend, mesmo quando marcadas `[P]` para o backend correspondente.
- Nenhuma migração de schema, nenhuma coluna nova — `ehColunaData_` (T007) é a única mudança de
  comportamento de backend fora de uma função nova isolada.
- `formatarNomeInstrutor_` (US4) não é criada nesta spec — já existe em `components/ciaara/` desde a spec
  018; só os 2 call-sites de `app/(app)/disciplinas/page.tsx` mudam.
- Commit após cada história completa (US1, depois US2, depois US3, depois US4), seguindo o ritmo já
  estabelecido nesta sessão.
