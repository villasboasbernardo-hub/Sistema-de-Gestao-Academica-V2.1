---

description: "Task list for Painel de Atribuição de Disciplinas do Instrutor (Multi-Select Pesquisável)"
---

# Tasks: Painel de Atribuição de Disciplinas do Instrutor (Multi-Select Pesquisável)

**Input**: Design documents from `/specs/019-atribuicao-disciplinas-instrutor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/server-functions.md, quickstart.md — todos completos.

**Tests**: Incluídos onde há harness automatizado disponível. Backend (`sincronizarDisciplinasInstrutor`)
usa o harness já existente de `tests/unidade/regras_de_negocio_backend.test.ts` (`vm` + o cliente Supabase
mockado, carregando `lib/supabase/server.ts`/``lib/supabase/middleware.ts` + policies RLS`/`lib/acoes/crud.ts`/`lib/acoes/instrutores.ts`). Frontend puro
(`painelAtribuicaoDisciplinasHtmlInstrutor_`, que só monta uma string HTML a partir de dados já em
memória, sem tocar `document`) usa o harness já existente de `tests/unidade/ficha_formulario_instrutores.test.ts`
(extração de `<script>` + importação direta do módulo, mesmo padrão de `disciplinasHabilitadasHtmlInstrutor_`).
As 2 funções que manipulam o DOM diretamente (`filtrarPainelDisciplinasInstrutor_`,
`coletarDisciplinasSelecionadasInstrutor_`) **não** têm harness disponível (sandbox sem `document`,
mesmo achado já documentado nas specs 016/017/018) — verificação manual via `quickstart.md`.

**Organization**: 3 User Stories, todas Priority: P1. US2 e a parte frontend de US3 dependem do
markup renderizado por US1 (atributos `data-busca-disciplina` e classe `.chk-disciplina-instrutor`
só existem depois que US1 está implementada); a parte backend de US3
(`sincronizarDisciplinasInstrutor`) é totalmente independente e pode ser feita em paralelo com
US1/US2 — mesmo padrão de US3 "desacoplada" já usado na spec 018.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (270 testes, 270
      passam, 0 falham, herdado do fechamento da spec 018) antes de qualquer mudança.
      **Confirmado**.

---

## Phase 2: Foundational

Nenhuma tarefa foundational necessária — o motor CRUD genérico (`crudCriar`/`crudAtualizar`/
`crudExcluir`) e os 3 conjuntos de dados já carregados no boot (`disciplinasCarregadas_`/
`vinculosCarregados_`/`AppState.ctx.cursos`) já existem e não precisam de nenhuma mudança prévia
(research.md §1, §6). As 3 User Stories partem direto de infraestrutura já pronta.

---

## Phase 3: User Story 1 - Ver e marcar disciplinas com o código do curso no rótulo (Priority: P1)

**Goal**: O painel exibe todas as disciplinas ativas do catálogo como "Nome (Código do Curso)",
pré-marcadas conforme os vínculos ativos reais do instrutor em edição (ou tudo desmarcado em
cadastro).

**Independent Test**: `quickstart.md` Passos 1 (rótulo) e 2 (pré-marcação) — abrir a ficha de um
instrutor com disciplinas conhecidas, confirmar que exatamente essas aparecem marcadas com rótulo
"Nome (Código)".

### Tests for User Story 1 ⚠️

> **Escrever estes testes PRIMEIRO, confirmar que FALHAM antes de implementar**

- [X] T002 [P] [US1] Em `tests/unidade/ficha_formulario_instrutores.test.ts`: adicionar testes para
      `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` cobrindo (a) rótulo no formato exato
      `"${Nome_Disciplina} (${ID_Curso})"` para uma disciplina de exemplo; (b) `instrutor = null`
      (modo cadastro) → nenhum item com `checked` no HTML gerado; (c) instrutor com 2 vínculos
      `Status='Ativo'` conhecidos → exatamente esses 2 `ID_Grade` aparecem com `checked`, nenhum
      outro; (d) uma disciplina com `Status` diferente de `'Ativo'` no catálogo de teste nunca
      aparece na lista, mesmo que exista vínculo ativo referenciando seu `ID_Grade` (FR-013).
      Depende de T001.
- [X] T003 [US1] Rodar `pnpm vitest run tests/ficha_formulario_instrutores.test.ts` — confirmar que os
      casos de T002 falham (função ainda não existe). Depende de T002. **Confirmado**: 4/4 casos
      novos falham com `TypeError: painelAtribuicaoDisciplinasHtmlInstrutor_ is not a function`.

### Implementation for User Story 1

- [X] T004 [US1] Em `app/(app)/instrutores/page.tsx`: implementar
      `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` — função pura, sem tocar `document`,
      que monta o HTML do painel (campo de busca `#buscaDisciplinasInstrutor` + container rolável
      `#listaDisciplinasInstrutor`, `max-height:250px; overflow-y:auto;`) a partir de
      `disciplinasCarregadas_` filtrado por `Status === 'Ativo'`, um `<div class="form-check">` por
      disciplina com `data-busca-disciplina="<rótulo em minúsculo>"`, checkbox
      `class="chk-disciplina-instrutor"` `value="${ID_Grade}"`, `checked` quando existe vínculo
      `Status === 'Ativo'` do `instrutor` para aquele `ID_Grade` em `vinculosCarregados_` —
      implementada inteiramente sobre dados já em memória, nenhuma chamada `gs(...)` nova (FR-014,
      contracts/server-functions.md, research.md §4, §6, §7). Depende de T003 (teste deve existir e
      falhar antes).
- [X] T005 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarPainelEdicaoInstrutor_`:
      inserir a chamada a `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` no HTML montado,
      logo após o bloco já existente `disciplinasHabilitadasHtmlInstrutor_(instrutor)` (inalterado)
      e antes do botão "Salvar" (research.md §8). Depende de T004.
- [X] T006 [US1] Rodar `pnpm vitest run` — confirmar que os casos de T002 passam e a
      suíte inteira continua em 0 falhas. Depende de T005. **274 testes, 274 passam, 0 falham**
      (270 baseline + 4 novos de T002).

### Verificação manual (não automatizável — FR-001, FR-002, FR-004 a FR-006, FR-014)

- [ ] T007 [US1] Seguir `quickstart.md` Passos 1 e 2 no navegador (implantação via `o fluxo Git → Vercel`
      necessária antes) — confirmar rótulo "Nome (Código)" em itens ao acaso, coexistência com o
      bloco "Disciplinas Habilitadas (calculado)" já existente, pré-marcação correta em modo
      edição/tudo desmarcado em modo cadastro, e (FR-014, quickstart.md Passo 1 item 6) que abrir o
      painel não dispara nenhuma chamada de rede nova visível na aba Network do navegador.

**Checkpoint**: User Story 1 completa e verificável independentemente — o painel aparece corretamente
em ambos os modos, mesmo sem busca funcional nem salvamento ainda.

---

## Phase 4: User Story 2 - Encontrar uma disciplina digitando parte do nome ou do código do curso (Priority: P1)

**Goal**: O campo de busca filtra a lista em tempo real, por nome da disciplina OU código do curso,
sem diferenciar maiúsculas/minúsculas.

**Independent Test**: `quickstart.md` Passo 1 (itens 4-5) — digitar "TFM", confirmar que só restam
visíveis as disciplinas cujo nome ou código contém "TFM" em qualquer capitalização; limpar a busca,
confirmar que a lista completa volta.

### Implementation for User Story 2

- [X] T008 [US2] Em `app/(app)/instrutores/page.tsx`: implementar
      `filtrarPainelDisciplinasInstrutor_()` — lê `#buscaDisciplinasInstrutor.value` em minúsculo,
      itera `#listaDisciplinasInstrutor [data-busca-disciplina]`, alterna `style.display` entre
      `''` e `'none'` conforme `String.includes` (research.md §7, contracts/server-functions.md).
      Depende de T005 (precisa do markup de US1 já existir).
- [X] T009 [US2] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarPainelEdicaoInstrutor_`:
      registrar `document.getElementById('buscaDisciplinasInstrutor').addEventListener('input',
      filtrarPainelDisciplinasInstrutor_)` — mesmo padrão já usado nessa função para os listeners de
      `edit_Posto_Graduacao`/`edit_Data_Assuncao_Setor` (linhas ~1053-1056). Depende de T008.
- [X] T010 [US2] Rodar `pnpm vitest run` — confirmar 0 regressão (nenhum caso novo
      automatizável para esta User Story — função depende de `document`, mesmo achado já
      documentado nas specs 016/017/018 para código de manipulação de DOM). Depende de T009.
      **274 testes, 274 passam, 0 falham**.

### Verificação manual (não automatizável — FR-003)

- [ ] T011 [US2] Seguir `quickstart.md` Passo 1 (itens 4-5) no navegador — confirmar filtragem por
      nome e por código do curso, case-insensitive, e que limpar a busca restaura a lista completa
      preservando o estado marcado/desmarcado de cada item.

**Checkpoint**: User Stories 1 e 2 completas — o painel é totalmente navegável, ainda sem persistir
nenhuma mudança.

---

## Phase 5: User Story 3 - Salvar as disciplinas marcadas sem perder histórico (Priority: P1)

**Goal**: Salvar a ficha (cadastro ou edição) sincroniza os vínculos reais do instrutor com o
conjunto marcado no painel, sem nunca apagar fisicamente uma linha de `instrutor_disciplina`.

**Independent Test**: `quickstart.md` Passos 3, 4 e 5 — desmarcar/marcar disciplinas de um
instrutor existente, salvar, reabrir e confirmar o novo conjunto refletido; confirmar que o vínculo
desmarcado continua existindo (só inativo); cadastrar um instrutor novo já com disciplinas
marcadas; confirmar que uma falha no cadastro não cria vínculo órfão.

### Tests for User Story 3 (backend) ⚠️

> **Escrever estes testes PRIMEIRO, confirmar que FALHAM antes de implementar**

- [X] T012 [P] [US3] Em `tests/unidade/regras_de_negocio_backend.test.ts`: adicionar `describe` para
      `sincronizarDisciplinasInstrutor(idInstrutor, idsGrade)`, carregando adicionalmente
      `lib/acoes/instrutores.ts` no harness já existente (`carregarBackend`), com planilha falsa contendo
      `instrutores`, `disciplinas` (incluindo uma disciplina com `Modo_Atribuicao_Padrao`
      definido) e `instrutor_disciplina` com vínculos de exemplo em ambos os status. Cobrir os 5
      ramos da tabela de decisão de research.md §1: (a) `ID_Grade` sem vínculo prévio, marcado →
      `crudCriar` chamado, `Status: 'Ativo'`, `Modo_Atribuicao` = `Modo_Atribuicao_Padrao` da
      disciplina; (b) vínculo existente inativo, marcado → `crudAtualizar` no mesmo `ID_Vinculo`,
      `Status` volta a `'Ativo'`, nenhuma linha nova criada; (c) vínculo existente ativo, marcado →
      nenhuma escrita (FR-012); (d) vínculo existente ativo, NÃO marcado → `crudExcluir` desativa
      (nunca `deleteRow`); (e) vínculo existente inativo, NÃO marcado → nenhuma escrita. Mais o
      achado de research.md §3: `ID_Grade` que não existe em `disciplinas` é ignorado
      silenciosamente, sem lançar exceção, sem impedir a sincronização dos demais itens válidos da
      mesma chamada. Depende de T001.
- [X] T013 [US3] Rodar `pnpm vitest run tests/regras_de_negocio_backend.test.ts` — confirmar que os
      casos de T012 falham (função ainda não existe). Depende de T012. **Confirmado**: 7/7 casos
      novos falham com `TypeError: sandbox.sincronizarDisciplinasInstrutor is not a function`.

### Implementation for User Story 3 (backend)

- [X] T014 [US3] Em `lib/acoes/instrutores.ts`: implementar
      `sincronizarDisciplinasInstrutor(idInstrutor, idsGrade)` — lê vínculos existentes do
      instrutor e o catálogo de disciplinas, calcula o diff, resolve cada `ID_Grade` válido para
      criar/reativar/nenhuma-ação/desativar via `crudCriar`/`crudAtualizar`/`crudExcluir`
      (nunca escrita direta no banco), ignora `ID_Grade` inválido silenciosamente, devolve
      `{ok: true, criados, reativados, desativados}` (contracts/server-functions.md, research.md
      §1 a §5). Depende de T013 (teste deve existir e falhar antes).
- [X] T015 [US3] Rodar `pnpm vitest run` — confirmar que os casos de T012 passam e a
      suíte inteira continua em 0 falhas. Depende de T014. **281 testes, 281 passam, 0 falham**
      (274 baseline pós-US2 + 7 novos de T012).

### Implementation for User Story 3 (frontend — orquestração do salvamento)

- [X] T016 [US3] Em `app/(app)/instrutores/page.tsx`: implementar
      `coletarDisciplinasSelecionadasInstrutor_()` — devolve o array de `value` de todo
      `.chk-disciplina-instrutor` marcado no DOM (contracts/server-functions.md, research.md §9).
      Depende de T005 (precisa do markup de US1 já existir).
- [X] T017 [US3] Em `app/(app)/instrutores/page.tsx`, dentro de `salvarEdicaoInstrutor_(idInstrutor)`:
      coletar `idsGrade = coletarDisciplinasSelecionadasInstrutor_()` junto com `valores`; encadear,
      via `.then()`, a chamada já existente a `cadastrarInstrutor`/`atualizarInstrutor` com uma nova
      chamada a `gs('sincronizarDisciplinasInstrutor', idInstrutorResolvido, idsGrade)` — em modo
      cadastro, `idInstrutorResolvido` vem do `id` retornado por `cadastrarInstrutor`; em modo
      edição, é o `idInstrutor` já conhecido. A sincronização só dispara se a primeira chamada
      resolver com sucesso (FR-007, research.md §9). Depende de T016 e de T014 (backend já deve
      existir para a chamada ter o que invocar).
- [X] T018 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão (a orquestração em si
      não é automatizável — depende de `document` e da Server Action, mesmo achado já
      documentado nas specs 016/017/018 para este tipo de código). Depende de T017. **281 testes,
      281 passam, 0 falham**.

### Verificação manual (não automatizável — FR-007 a FR-012)

- [ ] T019 [US3] Seguir `quickstart.md` Passos 3, 4 e 5 no navegador — confirmar sincronização
      correta em edição (incluindo reativação sem duplicata, Passo 3 item 6), criação de vínculos
      junto com o cadastro de um instrutor novo (Passo 4), e ausência de vínculo órfão quando o
      cadastro falha (Passo 5). Verificar diretamente no banco que nenhuma linha de
      `instrutor_disciplina` foi fisicamente removida em nenhum dos passos.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente — painel exibido,
pesquisável e persistindo corretamente, sem perda de histórico.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `lib/acoes/instrutores.ts` e `app/(app)/instrutores/page.tsx` ganham uma frase citando esta feature
      (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T021 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04). `implantacao/
      o histórico de deploys da Vercel` também atualizado. Novo valor: `2026-08-17.DISC019.1`.
- [X] T022 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão. **281 testes, 281 passam, 0 falham** (270 baseline + 11 líquidos novos:
      4 de US1 + 7 de US3-backend).
- [ ] T023 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-5), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: vazia nesta spec — nada bloqueia o início das User Stories além do
  Setup.
- **US1 (Phase 3)**: depende só de Setup. Base de que US2 e a parte frontend de US3 dependem (o
  markup com `data-busca-disciplina`/`.chk-disciplina-instrutor` só existe depois de T005).
- **US2 (Phase 4)**: depende de US1 (T005) para o markup existir — não pode ser feita antes.
- **US3 backend (T012-T015)**: totalmente independente — pode ser feita em paralelo com US1/US2,
  mesmo padrão de "story desacoplada" já usado na spec 018 (lá era US3 do dropdown de Especialidade;
  aqui é a metade backend desta US3).
- **US3 frontend (T016-T018)**: depende de US1 (T005, markup) e de US3 backend (T014, a função que
  a chamada nova vai invocar).
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- US1: T002 (testes) antes de T003 (confirmar falha) antes de T004 (implementar) antes de T005
  (integrar) antes de T006 (confirmar sucesso) — TDD, mesmo padrão de toda spec desta sessão.
- US3 backend: T012 antes de T013 antes de T014 antes de T015 — mesmo padrão TDD.
- US3 frontend: T016 e T017 sequenciais (T017 depende diretamente do que T016 devolve).

### Parallel Opportunities

- **T012-T015 (US3 backend)** podem rodar em paralelo com toda a Phase 3 (US1) e Phase 4 (US2) —
  arquivo (`lib/acoes/instrutores.ts`) e harness de teste (`regras_de_negocio_backend.test.ts`)
  completamente disjuntos do que US1/US2 tocam (`app/(app)/instrutores/page.tsx`,
  `ficha_formulario_instrutores.test.ts`).
- **T002 (US1)** e **T012 (US3 backend)** podem ser escritos em paralelo — arquivos de teste
  diferentes.
- **T020/T021 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois do Setup

```bash
Task: "T002 [US1] Testes de painelAtribuicaoDisciplinasHtmlInstrutor_ em tests/ficha_formulario_instrutores.test.ts"
Task: "T012 [US3] Testes de sincronizarDisciplinasInstrutor em tests/regras_de_negocio_backend.test.ts"
```

---

## Implementation Strategy

### MVP First

As 3 User Stories são igualmente P1 e mutuamente necessárias para o critério de aceite completo do
pedido original — não há um MVP menor que "as 3 juntas" que entregue valor real (um painel visível
sem busca é impraticável com ~175 itens; um painel pesquisável que não salva não atende ao pedido).
Ainda assim, cada uma é implementável e checkpointável de forma independente, na ordem US1 → US2 →
US3, com US3-backend podendo adiantar-se em paralelo desde o início.

### Incremental Delivery

1. Setup → baseline confirmado.
2. US1 → painel visível e corretamente pré-marcado → verificação manual.
3. US2 → busca funcional → verificação manual.
4. US3 → salvamento sincronizado sem perda de histórico → verificação manual.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos/harness de teste diferentes, sem dependência real.
- Nenhuma tarefa desta spec apaga fisicamente uma linha de planilha — toda escrita em
  `instrutor_disciplina` passa pelo motor CRUD genérico já existente (Princípio IV).
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
