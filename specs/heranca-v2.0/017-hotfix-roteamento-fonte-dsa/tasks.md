---

description: "Task list for Hotfix: Roteamento SPA, Fonte Rawline e Performance do DSA"
---

# Tasks: Hotfix — Roteamento SPA, Fonte Rawline e Performance do DSA

**Input**: Design documents from `/specs/017-hotfix-roteamento-fonte-dsa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-functions.md,
quickstart.md — todos completos.

**Tests**: Incluídos onde a técnica de harness já existente do projeto se aplica (US2, backend puro).
US1 (roteamento) é 100% manipulação de DOM sem stub de `document` disponível no harness — achado
documentado em `plan.md` ("Testing") — fica só como verificação manual (`quickstart.md`).

**Organization**: 3 User Stories independentes (arquivos disjuntos) — nenhuma depende de outra.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (260 testes, 260 passam,
      0 falham, herdado do fechamento da spec 016) antes de qualquer mudança. **Confirmado**.

---

## Phase 2: User Story 1 - Cadastrar/editar instrutor sem sair da tela (Priority: P1)

**Goal**: Clique em "Cadastrar Novo Instrutor"/"Editar" e carregamento via deep-link URL abrem o
formulário de instrutor na mesma aba/janela do navegador, sem `window.open`, sem a tela inicial
aparecer no meio do caminho.

**Independent Test**: `quickstart.md` Passos 1 e 2 — clicar em "Cadastrar Novo Instrutor"/"Editar" e
confirmar que o formulário aparece na mesma aba; carregar `?editarInstrutor=<ID>`/`?novoInstrutor=1`
diretamente por URL e confirmar que resolve direto no formulário, sem passar pela tela inicial.

### Implementation for User Story 1

- [X] T002 [US1] [P] Em `app/layout.tsx`: o boot (`DOMContentLoaded`) passa a calcular
      `destinoInicial` priorizando `'tabInstrutores'` quando `DEEP_LINK_EDITAR_INSTRUTOR` ou
      `DEEP_LINK_NOVO_INSTRUTOR` estiver presente, chamando `irPara(destinoInicial)` em vez do atual
      `irPara(window.location.hash.replace('#', '') || 'tabInicio')` incondicional (research.md §1,
      contracts/server-functions.md).
- [X] T003 [US1] [P] Em `app/(app)/instrutores/page.tsx`: extrair `abrirPainelEdicaoInstrutor_
      (instrutor)` (chama `irPara('tabInstrutores')`, alterna `#painelPrincipalInstrutores`/
      `#painelEdicaoInstrutor`, chama `renderizarPainelEdicaoInstrutor_(instrutor)`) e
      `fecharPainelEdicaoInstrutor_()` (research.md §2); `abrirCadastroInstrutor()`/
      `abrirEdicaoInstrutor(idInstrutor)` passam a chamar `abrirPainelEdicaoInstrutor_` em vez de
      `window.open(url, '_blank')`; `verificarDeepLinksInstrutor_()` passa a chamar o mesmo helper em
      vez de duplicar o toggle de painel inline; o botão "Fechar aba"
      (`onclick="window.close(); return false;"`) vira "Voltar"
      (`onclick="fecharPainelEdicaoInstrutor_(); return false;"`). **Sem dependência real de T002**
      (achado do `/speckit-analyze` F1): T002 corrige a entrada por URL (carregamento com deep-link),
      T003 corrige a entrada por clique — `irPara('tabInstrutores')` chamado a partir de um handler de
      clique funciona independentemente do boot já ter rodado; as duas convergem em
      `renderizarPainelEdicaoInstrutor_`, mas nenhuma delas precisa da outra pronta primeiro. Pode ser
      feita em paralelo com T002.
- [X] T004 Rodar `pnpm vitest run` — confirmar 0 regressão nos testes já existentes que
      carregam `app/(app)/instrutores/page.tsx` (`tests/unidade/ficha_formulario_instrutores.test.ts`,
      `tests/unidade/filtros_cross_instrutores.test.ts`) — nenhum caso novo esperado para esta User Story
      (achado de `plan.md`: roteamento é manipulação de DOM, fora do alcance do harness atual).
      **260 testes, 260 passam, 0 falham** — 0 regressão.

### Verificação manual (não automatizável — FR-001 a FR-004)

- [ ] T005 [US1] Seguir `quickstart.md` Passos 1 e 2 no navegador (implantação via `o fluxo Git → Vercel`
      necessária antes) — confirmar que o clique em "Cadastrar Novo Instrutor"/"Editar" abre o
      formulário na mesma aba sem nova janela/aba nem tela inicial piscando; confirmar que
      `?editarInstrutor=<ID>`/`?novoInstrutor=1` carregam direto no formulário certo.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 3: User Story 2 - Consultar o DSA de um curso com várias turmas sem timeout (Priority: P1)

**Goal**: `getDsaSemanal` responde em menos de 3 segundos, com o mesmo resultado de sempre, para
qualquer turma/semana — eliminando a releitura redundante de `registros_aula`/
`avaliacoes`/`atividades_nao_letivas` a cada combinação dia×turma.

**Independent Test**: `quickstart.md` Passo 4 — abrir o DSA de uma turma real e cronometrar a
resposta; comparar blocos/conflitos exibidos com o comportamento anterior (idênticos).

### Tests for User Story 2 ⚠️

> **Escrever este teste PRIMEIRO, confirmar que FALHA antes de implementar (research.md §3)**

- [X] T006 [P] [US2] Estender `tests/unidade/regras_dsa.test.ts`: instrumentar `criarPlanilhaFalsaDsa` para
      contar, por nome de aba, quantas vezes `getDataRange()` é chamado (novo campo `leituras` no
      retorno); escrever um teste com pelo menos 3 turmas ativas cruzando a mesma semana, chamar
      `sandbox.getDsaSemanal(...)`, e afirmar que `leituras['registros_aula']`,
      `leituras['avaliacoes']`, `leituras['atividades_nao_letivas']` e `leituras['turmas']`
      valem no máximo 1 cada — deve FALHAR contra o código atual (hoje: até 5× por turma, por dia).
      **Confirmado FALHA** (`turmas lida 8x, esperado no máximo 1x`).

### Implementation for User Story 2

- [X] T007 [US2] Em `lib/acoes/dsa.ts`: implementar `dadosBrutosDsaSemana_()` (nova, função pura,
      lê `turmas`/`registros_aula`/`avaliacoes`/`atividades_nao_letivas` uma
      única vez); `blocosBrutosDoDia_(idTurma, dataIso, dados)` e
      `detectarConflitosDsa_(dataIso, dados)` ganham o parâmetro `dados` e passam a filtrar os
      arrays já carregados em vez de chamar `lerAbaComoObjetos_` elas mesmas;
      `getDsaSemanal` chama `dadosBrutosDsaSemana_()` uma vez no topo e repassa `dados` para cada
      uma das 5 chamadas de `detectarConflitosDsa_` dentro do loop de dias, e também reaproveita
      `dados.turmas`/`dados.eventos` no lugar das 2 leituras próprias que `getDsaSemanal` já fazia
      (busca da turma no topo; `lancamentosDaSemana` no retorno) — achado durante a implementação,
      não estava em `research.md`/`contracts.md` mas é a mesma releitura redundante do mesmo tipo
      (research.md §3, contracts/server-functions.md). Depende de T006 (teste deve existir e falhar
      antes). **Achado real durante a implementação**: mesmo após a correção, `turmas`/
      `registros_aula`/`avaliacoes` continuam sendo lidas mais de 1× por requisição —
      não pela redundância dia×turma corrigida aqui, mas por 3 helpers compartilhados fora do
      escopo deste hotfix (`exigirEscopoTurma_` em ``lib/supabase/middleware.ts` + policies RLS`; `totalizadoresDaTurma_`/
      `avaliacoesAgendadasNaSemana_`, também usados por `lib/acoes/cronograma.ts`/`lib/acoes/relatorio.ts`), cada um
      fazendo 1 leitura própria de escopo único, nunca multiplicada por dia nem por turma.
      Refatorá-los também mudaria a assinatura de funções compartilhadas com outros módulos —
      escopo maior que o necessário para este hotfix (Princípio VI/IX). T006 foi ajustado para
      travar a propriedade real (leituras constantes, independentes do número de turmas), não um
      "1×" literal que essas 3 leituras legítimas sempre impediriam.
- [X] T008 Rodar `pnpm vitest run` — confirmar que o teste de T006 passa e que os
      testes já existentes de RN-CONF-01/`getDsaSemanal` em `tests/unidade/regras_dsa.test.ts` continuam
      passando sem nenhuma asserção alterada (FR-007/FR-008: resultado byte-a-byte idêntico).
      **262 testes, 262 passam, 0 falham** (260 baseline + 2 novos de T006 — o teste de T006 foi
      redesenhado durante T007 para 2 casos: contagem constante independente do número de turmas, e
      teto pequeno e constante — ver achado em T007).

### Verificação manual (não automatizável — SC-003)

- [ ] T009 [US2] Seguir `quickstart.md` Passo 4 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar resposta em menos de 3 segundos para uma turma real, sem erro
      `[gs:getDsaSemanal] timeout` no console.

**Checkpoint**: User Stories 1 e 2 completas — os 2 defeitos de prioridade P1 corrigidos.

---

## Phase 4: User Story 3 - Interface sem aviso de MIME type no console (Priority: P3)

**Goal**: A folha de estilo da fonte Rawline carrega de uma origem que serve o tipo MIME correto.

**Independent Test**: `quickstart.md` Passo 3 — abrir qualquer tela com o console aberto e confirmar
ausência do erro de MIME type.

### Implementation for User Story 3

- [X] T010 [US3] Em `app/globals.css`: trocar o `href` do `<link rel="stylesheet">` da
      fonte Rawline de `https://cdn.jsdelivr.net/npm/@govbr-ds/core@latest/dist/fonts/rawline/
      rawline.css` para `https://fonts.cdnfonts.com/css/rawline` (research.md §4).

### Verificação manual (não automatizável — FR-005/SC-004)

- [ ] T011 [US3] Seguir `quickstart.md` Passo 3 no navegador — confirmar ausência de erro de tipo
      MIME relacionado à fonte Rawline no console.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `lib/acoes/dsa.ts`, `app/layout.tsx`, `app/(app)/instrutores/page.tsx` e `app/globals.css` ganham uma frase
      citando este hotfix (mesmo padrão de "última alteração" já usado para todo épico/hotfix
      anterior).
- [X] T013 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04). Novo valor:
      `2026-08-17.HOTFIX017.1`. `o histórico de deploys da Vercel` também atualizado ("`o SHA do commit` atual").
- [X] T014 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline
      260 + 1 caso novo de T006) em 0 falhas, 0 regressão. **262 testes, 262 passam, 0 falham**
      (260 baseline + 2 de T006, ver achado em T007/T008).
- [ ] T015 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-5), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **US1 (Phase 2)**, **US2 (Phase 3)**, **US3 (Phase 4)**: as 3 dependem só de Setup — **tocam
  arquivos completamente disjuntos** (`app/layout.tsx`+`app/(app)/instrutores/page.tsx` / `lib/acoes/dsa.ts` /
  `app/globals.css`) e podem ser feitas em qualquer ordem ou em paralelo, sem nenhuma dependência
  cruzada entre elas.
- **Polish (Phase 5)**: depende das 3 User Stories completas.

### Within Each User Story

- US1: T002 e T003 **sem dependência real entre si** (achado do `/speckit-analyze` F1, corrigido) —
  T002 corrige a entrada por URL (deep-link no boot), T003 corrige a entrada por clique
  (`abrirPainelEdicaoInstrutor_`); nenhuma precisa da outra pronta. Só a verificação manual (T005)
  depende das duas completas.
- US2: T006 (teste) antes de T007 (implementação) — TDD, mesmo padrão já usado em toda spec desta
  sessão para lógica de backend testável. **Não** paralelizável entre si (T007 implementa o que T006
  exige que já exista e falhe antes).
- US3: T010 antes de T011 (verificação depende da mudança existir).

### Parallel Opportunities

- **T002 + T003 (US1)** podem rodar em paralelo entre si — arquivos disjuntos
  (`app/layout.tsx`/`app/(app)/instrutores/page.tsx`), sem dependência real (achado do `/speckit-analyze` F1).
- **T006 (US2, teste) e T010 (US3)** podem rodar em paralelo com T002/T003 (US1) — arquivos
  disjuntos entre as 3 User Stories. T007 (US2, implementação) só começa depois de T006 existir e
  falhar — não entra nesse grupo paralelo.
- **T012/T013 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: As 3 User Stories

```bash
Task: "T002 [US1] Roteamento (boot) em `app/layout.tsx`"
Task: "T003 [US1] Roteamento (clique) em `app/(app)/instrutores/page.tsx`"
Task: "T006 [US2] Teste de contagem de leituras em regras_dsa.test.ts"
Task: "T010 [US3] Fonte em `app/globals.css`"
# T007 (US2) so comeca depois de T006 existir e falhar - nao entra neste grupo paralelo
```

---

## Implementation Strategy

### MVP First

As 2 User Stories P1 (US1 roteamento, US2 performance) são o MVP deste hotfix — ambas bloqueiam uso
real do sistema hoje (formulário de instrutor inacessível; DSA de curso com várias turmas
inutilizável). US3 (fonte) é cosmética e pode ser entregue junto sem custo adicional, já que é uma
troca de 1 linha independente.

### Incremental Delivery

1. Setup → baseline confirmado.
2. US1 → verificação manual → (opcionalmente) deploy.
3. US2 → testes + verificação manual → (opcionalmente) deploy.
4. US3 → verificação manual → deploy final com as 3 juntas.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência.
- Nenhuma tarefa desta spec toca schema/dado persistido — zero migração.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
