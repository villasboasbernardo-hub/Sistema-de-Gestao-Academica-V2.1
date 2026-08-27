---

description: "Task list for Hotfix: Refinamento de UI e Correção do Algoritmo de Nome de Guerra"
---

# Tasks: Hotfix — Refinamento de UI e Correção do Algoritmo de Nome de Guerra

**Input**: Design documents from `/specs/020-hotfix-refinamento-listagem-instrutores/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-functions.md, quickstart.md —
todos completos. Sem `data-model.md` (spec não toca nenhuma entidade de dado).

**Tests**: Incluídos para `formatarNomeInstrutor_` (US2, lógica pura testável pelo harness já
existente de `tests/unidade/design_system.test.ts`) — **migração parcial**: 2 dos testes existentes
(`describe "FR-002 a FR-010"`, casos "Oficial sem especialidade" e "Oficial com CA", ambos usando
nome de guerra "VILAS BÔAS") quebram como consequência direta do novo algoritmo por palavra
(research.md §2) e precisam de nova asserção, não é uma regressão a evitar. US1 (consolidação de
coluna), US3 (remoção de seção) e US4 (renomeação de rótulo) manipulam `document`/DOM em
`app/(app)/instrutores/page.tsx` — sem harness disponível (mesmo achado já documentado nas specs 016 a 019),
verificação manual via `quickstart.md`.

**Organization**: 4 User Stories — US1/US2 (P1) tocam arquivos disjuntos entre si
(`app/(app)/instrutores/page.tsx` vs `components/ciaara/`) e são independentes; US3 (P2) e US4 (P3) tocam
`app/(app)/instrutores/page.tsx` também, em regiões disjuntas de US1 — nenhuma dependência lógica real entre
as 4, mas US1/US3/US4 não são marcadas `[P]` entre si por tocarem o mesmo arquivo (prudência, não
dependência).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (281 testes, 281
      passam, 0 falham, herdado do fechamento da spec 019) antes de qualquer mudança.
      **Confirmado**.

---

## Phase 2: Foundational

Nenhuma tarefa foundational necessária — as 4 User Stories tocam regiões disjuntas de arquivos já
existentes, sem infraestrutura compartilhada nova (plan.md).

---

## Phase 3: User Story 1 - Ver o instrutor como uma única coluna formatada (Priority: P1)

**Goal**: A listagem principal de instrutores exibe uma única coluna "Instrutor" (posto +
especialidade + nome, nome de guerra em destaque) em vez de 2 colunas separadas.

**Independent Test**: `quickstart.md` Passo 1 — abrir a listagem, confirmar cabeçalho com 1 coluna
"Instrutor" e o conteúdo completo formatado em cada linha.

### Implementation for User Story 1

- [X] T002 [US1] Em `app/(app)/instrutores/page.tsx`: em `renderizarListagemInstrutores_()`,
      substituir as 2 células `<td>${i.Posto_Graduacao || ''}</td><td>${formatarNomeInstrutor_('',
      '', i.Nome_Completo, i.Nome_Guerra, true)}</td>` por uma única `<td>${formatarNomeInstrutor_(
      i.Posto_Graduacao, i.Esp_Hab_Obs, i.Nome_Completo, i.Nome_Guerra, true)}</td>`; no cabeçalho
      da tabela, substituir `<th>Posto/Graduação</th><th>Nome Completo</th>` por
      `<th>Instrutor</th>`; atualizar o `colspan` da linha "Nenhum instrutor encontrado..." de `7`
      para `6` (contracts/frontend-functions.md, research.md §4). Depende de T001.
- [X] T003 [US1] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo para esta User Story — função depende de `document`, mesmo achado já documentado nas
      specs 016/017/018/019). Depende de T002. **281 testes, 281 passam, 0 falham**.

### Verificação manual (não automatizável — FR-001, FR-002)

- [ ] T004 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar coluna única "Instrutor", conteúdo completo formatado, e o `colspan`
      correto na mensagem de lista vazia.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Ver o nome de guerra destacado mesmo quando as palavras não são contíguas (Priority: P1)

**Goal**: `formatarNomeInstrutor_` destaca cada palavra do nome de guerra individualmente, mesmo
quando as palavras não são contíguas no nome completo.

**Independent Test**: Rodar `tests/unidade/design_system.test.ts` e confirmar os casos de nome de guerra
não contíguo (Guilherme Pires Black Pereira / Guilherme Black; Vanessa Santos Medeiros da Silva /
Vanessa Medeiros).

### Tests for User Story 2 ⚠️

> **Escrever/migrar estes testes PRIMEIRO, confirmar que FALHAM antes de implementar**

- [X] T005 [P] [US2] Em `tests/unidade/design_system.test.ts`, describe `"FR-002 a FR-010 -
      formatarNomeInstrutor_ (regras de círculo hierárquico + exceção CA)"`: migrar os 2 testes
      existentes que usam nome de guerra "VILAS BÔAS" ("Oficial sem especialidade" e "Oficial com
      especialidade CA") da asserção de marcação única (`<strong>VILAS BÔAS</strong>`) para a nova
      asserção de 2 marcações separadas por espaço (`<strong>VILAS</strong>
      <strong>BÔAS</strong>`, research.md §2) — comportamento visualmente idêntico, estrutura de
      HTML diferente. No describe `"RF-INSTR-15/RF-DS-05 - formatarNomeInstrutor_..."`, acrescentar
      casos novos: (a) nome completo "Guilherme Pires Black Pereira", nome de guerra "Guilherme
      Black" → "Guilherme" e "Black" destacados, "Pires"/"Pereira" intactos (exemplo do próprio
      pedido); (b) nome completo "Vanessa Santos Medeiros da Silva", nome de guerra "Vanessa
      Medeiros" → resultado exatamente `"<strong>Vanessa</strong> Santos
      <strong>Medeiros</strong> da Silva"` (exemplo literal do pedido); (c) nome de guerra com uma
      palavra que não existe no nome completo (dado inconsistente) → nenhuma marcação para essa
      palavra, nenhuma exceção lançada (FR-004); (d) nome completo com a mesma palavra repetida 2
      vezes, nome de guerra com essa palavra → as 2 ocorrências destacadas (Edge Case de spec.md);
      (e) nome de guerra em capitalização diferente do nome completo (ex.: `"guilherme black"`
      contra nome completo `"Guilherme Pires Black Pereira"`) → achado do `/speckit-analyze` C1,
      comparação continua encontrando as palavras (case-insensitive, `'gi'`) e o resultado preserva
      a capitalização ORIGINAL do nome completo (`<strong>Guilherme</strong>`, nunca
      `<strong>guilherme</strong>`) — nenhum teste existente hoje exercita case mismatch de
      verdade, apesar da flag `'gi'` já ser usada (FR-005). Depende de T001.
- [X] T006 [US2] Rodar `pnpm vitest run tests/design_system.test.ts` — confirmar que os 2 testes
      migrados e os 4 casos novos de T005 falham contra a implementação atual (algoritmo de
      substring contíguo). Depende de T005. **Confirmado**: 7/7 casos novos/migrados falham (29
      testes no arquivo, 22 passam, 7 falham).

### Implementation for User Story 2

- [X] T007 [US2] Em `components/ciaara/`: dentro de `formatarNomeInstrutor_`, no bloco `if
      (isHTML && nomeGuerra ...)`, substituir a lógica de substring único por: dividir `nomeGuerra`
      em palavras via `.split(' ')` (descartando entradas vazias), e para cada palavra — escapada
      da mesma forma que hoje — aplicar um `.replace` por palavra, encadeando as substituições
      sobre a MESMA string em construção (nunca reiniciando de `nomeBase` a cada palavra,
      research.md §1) (contracts/frontend-functions.md). Depende de T006 (testes devem existir e
      falhar antes).

      **Achado real durante a implementação (desvio deliberado do `\b...\b` literal do pedido)**:
      a primeira tentativa de T007, com `\b` literal exatamente como pedido, foi implementada e
      rodada contra T005 — o caso "José" (Edge Case de palavra repetida, `spec.md`) falhou
      (`'José Silva José Santos'` saiu sem nenhuma marcação). Causa raiz confirmada: `\b` em
      JavaScript é definido sobre `\w` (só ASCII) — a fronteira de palavra não é reconhecida depois
      de um caractere acentuado como "é", porque tanto ele quanto o espaço seguinte são tratados
      como "não-palavra" pelo motor de regex (sem transição \w↔não-\w, não há `\b`). Substituído
      por `(?<![\p{L}\p{N}])palavra(?![\p{L}\p{N}])` com flags `giu` (fronteira de palavra
      Unicode-aware) — mesmo delimitador de palavra pedido, correto também para nomes acentuados,
      comuns neste domínio. Sem essa correção, o algoritmo novo reproduziria, para nome acentuado,
      o mesmo tipo de falha silenciosa que esta spec existe para resolver.
- [X] T008 [US2] Rodar `pnpm vitest run` — confirmar que todos os casos de T005 passam
      e a suíte inteira continua em 0 falhas. Depende de T007. **286 testes, 286 passam, 0
      falham** (281 baseline + 5 líquidos novos: 7 casos novos/migrados de T005 - 2 que já
      existiam e foram só reescritos).

**Checkpoint**: User Stories 1 e 2 completas — a coluna consolidada exibe o destaque corrigido.

---

## Phase 5: User Story 3 - Não ver mais a seção legada de vínculo isolado (Priority: P2)

**Goal**: A seção "Vínculo de qualificação" desaparece completamente da página principal de
instrutores, sem deixar código morto nem esconder erros de carregamento.

**Independent Test**: `quickstart.md` Passo 3 — confirmar ausência da seção e que um erro de
carregamento ainda aparece em algum lugar visível.

### Implementation for User Story 3

- [X] T009 [US3] Em `app/(app)/instrutores/page.tsx`: remover o bloco HTML da seção "Vínculo de
      qualificação" (`#formVinculo` e todo o seu conteúdo — dropdowns `#vincInstrutor`/`#vincGrade`,
      botão "Qualificar", `#avisoVinculo`); remover as funções `carregarDisciplinasParaVinculo()` e
      `salvarVinculoHabilitacao()`; remover, de `carregarInstrutores()`, a atribuição de
      `document.getElementById('vincInstrutor').innerHTML = ...` e, do listener de
      `contexto-pronto`, a chamada a `carregarDisciplinasParaVinculo()`; adicionar
      `<div id="avisoListagemInstrutores" class="mb-2"></div>` dentro de
      `#painelPrincipalInstrutores`, antes da barra de filtros, e trocar o alvo do `.catch()` de
      `carregarInstrutores()` de `'avisoVinculo'` para `'avisoListagemInstrutores'`
      (contracts/frontend-functions.md, research.md §5/§6). Depende de T001.
- [X] T010 [P] [US3] Em `lib/acoes/instrutores.ts`: remover a função `criarVinculoHabilitacao`
      (research.md §5, contracts/frontend-functions.md — zero chamador em `/`tests/` após
      T009). Arquivo diferente de T009, sem dependência real entre as duas. Depende de T001.
- [X] T011 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo — DOM/remoção de função sem consumidor, mesmo achado de T003; a suíte já confirma que
      nenhum teste existente dependia de `criarVinculoHabilitacao`). Depende de T009, T010.
      **286 testes, 286 passam, 0 falham**.

### Verificação manual (não automatizável — FR-006, FR-007)

- [ ] T012 [US3] Seguir `quickstart.md` Passo 3 no navegador — confirmar ausência total da seção
      legada e que um erro de carregamento forçado ainda aparece visivelmente na página.

**Checkpoint**: User Story 3 completa — a seção legada e seu código de suporte desapareceram sem
deixar erro de carregamento invisível.

---

## Phase 6: User Story 4 - Ver o rótulo correto no painel de qualificação (Priority: P3)

**Goal**: O painel de seleção de disciplinas exibe o rótulo "Qualificação do Instrutor".

**Independent Test**: `quickstart.md` Passo 4 — abrir a ficha de um instrutor, conferir o texto do
rótulo.

### Implementation for User Story 4

- [X] T013 [US4] Em `app/(app)/instrutores/page.tsx`, dentro de
      `painelAtribuicaoDisciplinasHtmlInstrutor_`: trocar o texto do `<label>` de "Atribuição de
      Disciplinas" para "Qualificação do Instrutor" — nenhum `id`/classe/seletor tocado
      (contracts/frontend-functions.md, research.md §7). Depende de T001.
- [X] T014 [US4] Rodar `pnpm vitest run` — confirmar 0 regressão (mudança puramente
      textual, sem asserção de teste dependente deste texto). Depende de T013. **286 testes, 286
      passam, 0 falham**.

### Verificação manual (não automatizável — FR-008)

- [ ] T015 [US4] Seguir `quickstart.md` Passo 4 no navegador — confirmar rótulo exato e que o
      painel continua funcionando normalmente (busca, marcar/desmarcar, salvar).

**Checkpoint**: As 4 User Stories completas e verificáveis independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T016 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `components/ciaara/`, `app/(app)/instrutores/page.tsx` e `lib/acoes/instrutores.ts` ganham uma frase citando
      este hotfix (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T017 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado. Novo valor: `2026-08-18.REFUI020.1`.
- [X] T018 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão. **286 testes, 286 passam, 0 falham** (281 baseline + 5 líquidos
      novos de US2).
- [ ] T019 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-4), após implantação via
      `o fluxo Git → Vercel` — confirmar as 4 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: vazia nesta spec.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)**, **US4 (Phase 6)**: todas dependem só de
  Setup. US2 (`components/ciaara/`) é totalmente independente das demais (arquivo disjunto). US1/US3/US4
  tocam `app/(app)/instrutores/page.tsx` em regiões disjuntas entre si (célula/cabeçalho da listagem vs.
  seção de vínculo + aviso de página vs. rótulo do painel de disciplinas) — sem dependência lógica
  real, mas não marcadas `[P]` entre si por tocarem o mesmo arquivo.
- **Polish (Phase 7)**: depende das 4 User Stories completas.

### Within Each Phase

- US2: T005 (testes) antes de T006 (confirmar falha) antes de T007 (implementar) antes de T008
  (confirmar sucesso) — TDD, mesmo padrão de toda spec desta sessão.
- US3: T009/T010 podem ser feitas em paralelo (arquivos diferentes); T011 depois das duas.

### Parallel Opportunities

- **T005 (US2)** pode ser escrito em paralelo com **T002 (US1)** — arquivos de teste/implementação
  completamente disjuntos (`components/ciaara/`/`design_system.test.ts` vs `app/(app)/instrutores/page.tsx`).
- **T009+T010 (US3)** podem rodar em paralelo entre si — `app/(app)/instrutores/page.tsx` vs
  `lib/acoes/instrutores.ts`.
- **T016/T017 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois do Setup

```bash
Task: "T002 [US1] Consolidar coluna Instrutor em `app/(app)/instrutores/page.tsx`"
Task: "T005 [US2] Testes de formatarNomeInstrutor_ (palavras nao contiguas) em design_system.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

US1 e US2 (ambas P1) juntas entregam o critério de aceite central do pedido — coluna consolidada
com o negrito corrigido. US3 (P2) e US4 (P3) são limpeza/renomeação sem risco de regressão
funcional, entregáveis depois, cada uma isoladamente.

### Incremental Delivery

1. Setup → baseline confirmado.
2. US1 → coluna consolidada → verificação manual.
3. US2 → algoritmo corrigido → suíte automatizada confirma.
4. US3 → seção legada removida → verificação manual.
5. US4 → rótulo renomeado → verificação manual.
6. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real.
- Nenhuma tarefa desta spec toca schema/dado persistido — zero migração (FR-009).
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
