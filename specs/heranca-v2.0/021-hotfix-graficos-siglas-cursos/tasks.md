---

description: "Task list for Hotfix: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos"
---

# Tasks: Hotfix — Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos

**Input**: Design documents from `/specs/021-hotfix-graficos-siglas-cursos/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-functions.md,
contracts/server-functions.md, quickstart.md — todos completos. Sem `data-model.md` (spec não cria
nem altera nenhuma entidade de dado persistida, mesmo padrão da spec 020).

**Tests**: Incluídos para as 3 funções puras alteradas/novas em `app/(app)/instrutores/page.tsx`
(`ordenarPorAntiguidadePostoClient_`, `agregarEstatisticasInstrutores_`,
`disciplinasHabilitadasDoInstrutor_`) — mesmo harness `vm` já usado por
`tests/unidade/filtros_cross_instrutores.test.ts`/`tests/unidade/ficha_formulario_instrutores.test.ts`. Sem teste
automatizado para `reativarInstrutor` (backend depende do cliente Supabase, sem harness de mock no
projeto — mesmo achado já documentado para `desativarInstrutor`, nenhum teste existe para ele
também) nem para os 4 dropdowns/botão condicional (manipulam `document`, sem harness disponível,
mesmo achado das specs 016-020) — verificação manual via `quickstart.md`.

**Organization**: 3 User Stories. US1 (P1, gráficos) e US2 (P2, Reativar) tocam arquivos/regiões
disjuntas o suficiente para paralelismo real dentro de si; US3 (P3, siglas) tem uma sub-cadeia TDD
(`disciplinasHabilitadasDoInstrutor_`) seguida de 4 edições de dropdown em arquivos diferentes,
paralelizáveis entre si. Nenhuma dependência lógica entre as 3 User Stories — todas partem só do
estado pós-spec-020 confirmado no Setup.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (286 testes, 286 passam,
      0 falham, herdado do fechamento da spec 020) antes de qualquer mudança. **Confirmado**.

---

## Phase 2: Foundational

Nenhuma tarefa foundational necessária — as 3 User Stories tocam regiões/arquivos já existentes, sem
infraestrutura compartilhada nova (`renderizarGrafico_` já suporta `tipo === 'pie'`, `crudAtualizar`
já existe — plan.md/research.md).

---

## Phase 3: User Story 1 - Gráficos de Instrutores mais diretos e compactos (Priority: P1)

**Goal**: O painel de estatísticas de Instrutores mostra o título "Status de Seleção" (sem "vs."),
o gráfico "Posto/Graduação" só com siglas, e um novo gráfico de pizza binário de capacitação
didática, todos recalculando junto com os 8 filtros já existentes.

**Independent Test**: `quickstart.md` Passo 1 — abrir o painel de estatísticas, conferir os 3
elementos visualmente e confirmar que um filtro aplicado recalcula os 3 sem chamada de rede nova.

### Tests for User Story 1 ⚠️

> **Escrever estes testes PRIMEIRO, confirmar que FALHAM antes de implementar**

- [X] T002 [P] [US1] Em `tests/unidade/filtros_cross_instrutores.test.ts`, novo `describe` "FR-002/FR-003 -
      ordenarPorAntiguidadePostoClient_ (siglas, sem tradução para nome extenso)": casos cobrindo (a)
      um posto conhecido (ex.: `CMG`) entra e sai como a própria sigla, nunca como
      `"Capitão de Mar e Guerra"`; (b) a ordenação por antiguidade (`ordemAntiguidadePosto_`)
      continua correta com as siglas na entrada/saída, usando pelo menos 3 postos fora de ordem
      (contracts/frontend-functions.md, research.md §1). Depende de T001.
      **Achado real durante a implementação**: o `describe "FR-001 a FR-018 -
      agregarEstatisticasInstrutores_"` já existente tinha um teste ("Posto/Graduacao ordenado por
      antiguidade, nunca alfabetico") que travava exatamente o comportamento antigo/errado (nomes por
      extenso), porque `agregarEstatisticasInstrutores_` chama `ordenarPorAntiguidadePostoClient_`
      internamente — migrado para siglas na mesma tarefa, não deixado para quebrar em T017/T022 sem
      relação aparente.
- [X] T003 [P] [US1] Em `tests/unidade/filtros_cross_instrutores.test.ts`, no `describe` existente "FR-001 a
      FR-018 - agregarEstatisticasInstrutores_", acrescentar caso(s) cobrindo `kpis.semCapacitacaoDidatica
      = total - comCapacitacaoDidatica`, incluindo o caso extremo `instrutoresFiltrados = []` (ambos
      os KPIs = 0, sem exceção) (contracts/frontend-functions.md, research.md §2). Depende de T001.
- [X] T004 [US1] Rodar `pnpm vitest run tests/filtros_cross_instrutores.test.ts` — confirmar que os
      casos novos de T002/T003 falham contra a implementação atual. Depende de T002, T003.
      **Confirmado**: 24 testes, 19 passam, 5 falham (as 2 asserções novas de `ordenarPorAntiguidadePostoClient_`,
      o teste migrado de Posto/Graduação, e os 2 casos novos de `semCapacitacaoDidatica`).

### Implementation for User Story 1

- [X] T005 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `ordenarPorAntiguidadePostoClient_`
      (linhas 501-510): remover o mapeamento `NOMES_POSTO_POR_CODIGO[item.posto] || item.posto`,
      devolvendo `item.posto` (a sigla) direto; ordenação por `ordemAntiguidadePosto_` inalterada
      (contracts/frontend-functions.md, research.md §1). Depende de T004.
- [X] T006 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `agregarEstatisticasInstrutores_`
      (linha 446+): acrescentar `semCapacitacaoDidatica: total - comCapacitacaoDidatica` ao objeto
      `kpis` retornado, ao lado de `comCapacitacaoDidatica` já existente (contracts/frontend-functions.md,
      research.md §2). Depende de T004.
- [X] T007 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarEstatisticasInstrutores_`
      (linhas 540-581): trocar o texto `<h6>Qualificados vs. Selecionados</h6>` por
      `<h6>Status de Seleção</h6>` (Clarifications 2026-08-18); acrescentar
      `<div class="col-md-6"><h6>Índice de Capacitação Geral</h6><div
      id="graficoInstrutoresCapacitacaoGeral"></div></div>` ao `.row.g-3` existente, ao lado (não no
      lugar) do card "Capacitação Didática"; acrescentar a chamada
      `renderizarGrafico_('graficoInstrutoresCapacitacaoGeral', 'pie', ['Com Capacitação Didática',
      'Sem Capacitação Didática'], [r.kpis.comCapacitacaoDidatica, r.kpis.semCapacitacaoDidatica])`
      ao lado das demais chamadas de `renderizarGrafico_` (contracts/frontend-functions.md,
      research.md §2). Depende de T005, T006.
- [X] T008 [US1] Rodar `pnpm vitest run` — confirmar que os casos de T002/T003 passam e
      a suíte inteira continua em 0 falhas. Depende de T007. **291 testes, 291 passam, 0 falham**
      (286 baseline + 5 líquidos novos: 2 migrados + 3 novos).

### Verificação manual (não automatizável — FR-001, FR-004, FR-006)

- [ ] T009 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar título "Status de Seleção", siglas no gráfico de Posto/Graduação, o novo
      gráfico de pizza somando corretamente, e recálculo dos 3 ao aplicar um filtro, sem chamada de
      rede nova. Confirmar também que a Ficha impressa (Passo 1, item 6) continua mostrando
      "SIGLA — Nome por extenso" no posto (FR-003, sem regressão).

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Reativar instrutor desativado direto da listagem (Priority: P2)

**Goal**: Um instrutor com `Status = Inativo` mostra um botão "Reativar" na própria linha da
listagem, que grava `Status = 'Ativo'` após confirmação, do mesmo jeito que "Desativar" já funciona
hoje.

**Independent Test**: `quickstart.md` Passo 2 — desativar um instrutor de teste, confirmar a troca
de botão, reativar, e confirmar a gravação direto na banco de produção.

### Implementation for User Story 2

- [X] T010 [P] [US2] Em `lib/acoes/instrutores.ts`, ao lado de `desativarInstrutor` (linhas
      160-162): criar `function reativarInstrutor(idInstrutor) { return
      crudAtualizar('instrutores', idInstrutor, {Status: 'Ativo'}); }` — extensão simétrica de
      RF-INSTR-12 (contracts/server-functions.md, research.md §3). Depende de T001.
- [X] T011 [P] [US2] Em `app/(app)/instrutores/page.tsx`: dentro de `renderizarListagemInstrutores_`
      (linhas 381-400), trocar a expressão condicional do botão de ação — quando
      `i.Status === 'Inativo'`, renderizar `<button class="btn btn-sm btn-outline-success"
      onclick="reativarInstrutorClick('${i.ID_Instrutor}')">Reativar</button>` no lugar do vazio
      atual; caso contrário, manter o botão "Desativar" (`btn-outline-danger`) como está hoje; criar
      `reativarInstrutorClick(idInstrutor)` (nova, ao lado de `desativarInstrutorClick`, linhas
      404-408), espelhando o mesmo padrão: `confirm('Reativar este instrutor? Ele voltará a poder
      ser selecionado em novos lançamentos.')` (Clarifications 2026-08-18) antes de
      `gs('reativarInstrutor', idInstrutor).then(() => carregarInstrutores()).catch(e => alert(e &&
      e.message ? e.message : e))` — RF-INSTR-12 (contracts/frontend-functions.md, research.md §3).
      Depende de T001.
- [X] T012 [US2] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo — escrita em o cliente Supabase e DOM, mesmo achado de T004/T008 desta spec e de toda spec
      anterior para `desativarInstrutor`). Depende de T010, T011. **291 testes, 291 passam, 0
      falham**.

### Verificação manual (não automatizável — FR-007 a FR-010)

- [ ] T013 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — desativar um instrutor de teste, confirmar troca de botão, clicar "Reativar",
      confirmar a caixa de diálogo, confirmar a reativação, e confirmar diretamente na aba
      `instrutores` da banco de produção que só `Status` mudou.

**Checkpoint**: User Story 2 completa — instrutores inativos têm ação de reativação simétrica a
"Desativar".

---

## Phase 5: User Story 3 - Siglas de curso em vez de nomes completos em toda a interface (Priority: P3)

**Goal**: Os 6 pontos mapeados de exibição de curso (4 dropdowns + 1 lista de vínculos + o texto de
disciplinas habilitadas/Ficha do instrutor) mostram a sigla (`ID_Curso`) em vez do nome completo,
preservando as 2 exceções (Painel Início, título do cartão de curso na Página do Curso) e o nome de
Turma (fora de escopo).

**Independent Test**: `quickstart.md` Passos 3-5 — navegar pelos 6 pontos mapeados confirmando
sigla, e pelos 3 pontos de exceção confirmando ausência de mudança.

### Tests for User Story 3 (função pura `disciplinasHabilitadasDoInstrutor_`) ⚠️

> **Migrar estes testes PRIMEIRO, confirmar que FALHAM antes de implementar**

- [X] T014 [US3] Em `tests/unidade/ficha_formulario_instrutores.test.ts`, no `describe` "data-model.md §4 -
      disciplinasHabilitadasDoInstrutor_" (linhas 145-172): migrar os 3 testes existentes para a
      nova assinatura de 3 argumentos (`idInstrutor, vinculos, disciplinas`, sem `cursosPorId`) e o
      novo formato `"<Nome da Disciplina> (<Sigla do Curso>)"` — o primeiro teste passa a esperar
      `["Navegação (C1)", "Hidrografia (C2)"]` no lugar de `["CAHO — Navegação", "C-Ap-HN —
      Hidrografia"]` (o fixture `cursosPorId` deixa de ser passado); os outros 2 (array vazio,
      vínculo `Status != Ativo` filtrado) mantêm a mesma intenção, só sem o 4º argumento
      (contracts/frontend-functions.md, research.md §5). Depende de T001.
- [X] T015 [US3] Rodar `pnpm vitest run tests/ficha_formulario_instrutores.test.ts` — confirmar que o
      teste migrado do formato novo falha contra a implementação atual (formato antigo). Depende de
      T014. **Confirmado**: `["C1 — Navegação","C2 — Hidrografia"]` (atual) != `["Navegação
      (C1)","Hidrografia (C2)"]` (esperado).

### Implementation for User Story 3

- [X] T016 [US3] Em `app/(app)/instrutores/page.tsx`: em `disciplinasHabilitadasDoInstrutor_`
      (linhas 678-694), remover o parâmetro `cursosPorId` e a variável local `nomeCurso`; trocar
      `resultado.push(nomeCurso + ' — ' + (d.Nome_Disciplina || d.ID_Grade))` por
      `resultado.push((d.Nome_Disciplina || d.ID_Grade) + ' (' + d.ID_Curso + ')')`; nos 2
      chamadores (`disciplinasHabilitadasHtmlInstrutor_`, linha 952, e o bloco correspondente da
      Ficha, linha 1193), remover a construção de `nomeCursoPorId` (o `forEach` sobre
      `AppState.ctx.cursos`) e o 4º argumento na chamada (contracts/frontend-functions.md,
      research.md §5). Depende de T015.
- [X] T017 [US3] Rodar `pnpm vitest run` — confirmar que os testes de T014 passam e a
      suíte inteira continua em 0 falhas. Depende de T016. **291 testes, 291 passam, 0 falham**.
- [X] T018 [P] [US3] Em `app/(app)/instrutores/page.tsx`, dentro de `popularOpcoesFiltrosInstrutores_`
      (linhas 305-328): trocar `.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))` por
      `.sort((a, b) => (a.idCurso || '').localeCompare(b.idCurso || ''))`; trocar a opção montada de
      `[c.idCurso, c.nome || c.idCurso]` para `[c.idCurso, c.idCurso]` (contracts/frontend-functions.md,
      research.md §4). Depende de T001.
- [X] T019 [P] [US3] Em `app/(app)/cronograma/page.tsx` (linha 77): trocar
      `` `<option value="${c.idCurso}">${c.nome || c.idCurso}</option>` `` por
      `` `<option value="${c.idCurso}">${c.idCurso}</option>` `` na montagem de `#cronoCurso`
      (contracts/frontend-functions.md, research.md §4). Depende de T001.
- [X] T020 [P] [US3] Em `app/(app)/disciplinas/page.tsx` (linha 66): mesma troca de T019, na
      montagem de `#discCursoSelecao` (contracts/frontend-functions.md, research.md §4). Depende de
      T001.
- [X] T021 [P] [US3] Em `app/(app)/admin/usuarios/page.tsx`: linha 105, mesma troca de T019 na montagem
      de `#usrCursoParaVincular`; linhas 164-165, trocar `curso ? curso.nome : v.ID_Curso` por
      `curso ? curso.idCurso : v.ID_Curso` na lista de cursos já vinculados
      (contracts/frontend-functions.md, research.md §4). Depende de T001.
- [X] T022 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão após T018-T021 (mudanças
      de `<option>`/DOM, sem caso automatizado novo). Depende de T018, T019, T020, T021. **291
      testes, 291 passam, 0 falham**.

### Verificação manual (não automatizável — FR-011 a FR-014)

- [ ] T023 [US3] Seguir `quickstart.md` Passos 3, 4 e 5 no navegador (implantação via `o fluxo Git → Vercel`
      necessária antes) — confirmar sigla nos 4 dropdowns + lista de vínculos, formato
      "Disciplina (Sigla)" na Ficha/"Disciplinas Habilitadas", e ausência de qualquer mudança nos 3
      pontos de exceção (Painel Início, título do cartão de curso, nome de Turma).

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `app/(app)/instrutores/page.tsx`, `lib/acoes/instrutores.ts`, `app/(app)/cronograma/page.tsx`,
      `app/(app)/disciplinas/page.tsx` e `app/(app)/admin/usuarios/page.tsx` ganham uma frase citando este hotfix (mesmo
      padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T025 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor. Novo valor:
      `2026-08-18.GRAFSIGLAS021.1`.
- [X] T026 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão. **291 testes, 291 passam, 0 falham**.
- [ ] T027 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-5), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: vazia nesta spec.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)**: todas dependem só de Setup. US1 toca
  `app/(app)/instrutores/page.tsx` (3 funções: `ordenarPorAntiguidadePostoClient_`,
  `agregarEstatisticasInstrutores_`, `renderizarEstatisticasInstrutores_`) em região disjunta das
  funções tocadas por US2 (`renderizarListagemInstrutores_`, `reativarInstrutorClick`) e por US3
  (`disciplinasHabilitadasDoInstrutor_`, `popularOpcoesFiltrosInstrutores_`) no mesmo arquivo — sem
  dependência lógica real entre as 3, mas as tarefas que tocam `app/(app)/instrutores/page.tsx` não são
  marcadas `[P]` entre si por prudência (mesmo arquivo), só entre arquivos diferentes.
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- US1: T002/T003 (testes) → T004 (confirmar falha) → T005/T006 (implementação, paralelizável entre
  si só logicamente — mesmo arquivo, feitas em sequência por prudência) → T007 (depende de ambas) →
  T008 (confirmar sucesso) → T009 (manual).
- US2: T010 (backend) e T011 (frontend) em paralelo (arquivos diferentes) → T012 (confirmar 0
  regressão) → T013 (manual).
- US3: T014 (migrar testes) → T015 (confirmar falha) → T016 (implementar) → T017 (confirmar
  sucesso) → T018-T021 (4 arquivos diferentes, paralelos entre si) → T022 (confirmar 0 regressão) →
  T023 (manual).

### Parallel Opportunities

- **T002 e T003 (US1)** — mesmo arquivo de teste, mas `describe` blocks independentes; paralelizável
  na prática de escrita, não estritamente necessário.
- **T010 (US2, `lib/acoes/instrutores.ts`) e T011 (US2, `app/(app)/instrutores/page.tsx`)** — arquivos diferentes.
- **T018 (US3, `app/(app)/instrutores/page.tsx`), T019 (`app/(app)/cronograma/page.tsx`), T020 (`app/(app)/disciplinas/page.tsx`),
  T021 (`app/(app)/admin/usuarios/page.tsx`)** — 4 arquivos diferentes, sem dependência real entre si.
- **T024 e T025 (Polish)** podem rodar em paralelo entre si.
- US1, US2 e US3 podem ser trabalhadas em paralelo por pessoas diferentes depois do Setup — cada
  uma toca um subconjunto de arquivos que não colide com as outras 2 (exceto `app/(app)/instrutores/page.tsx`,
  compartilhado pelas 3, em funções sempre disjuntas).

---

## Parallel Example: Depois do Setup

```bash
Task: "T002 [US1] Teste de ordenarPorAntiguidadePostoClient_ (sigla, sem tradução) em filtros_cross_instrutores.test.ts"
Task: "T010 [US2] reativarInstrutor em `lib/acoes/instrutores.ts`"
Task: "T019 [US3] Dropdown de curso com sigla em `app/(app)/cronograma/page.tsx`"
```

---

## Implementation Strategy

### MVP First (User Story 1)

US1 (P1) sozinha já entrega os 3 critérios de aceite mais concretos do pedido original (título sem
"vs.", siglas no gráfico de Posto/Graduação, novo gráfico de pizza) — pode ser implantada e validada
isoladamente antes de US2/US3.

### Incremental Delivery

1. Setup → baseline confirmado (286 testes).
2. US1 → gráficos corrigidos/novo → suíte automatizada + verificação manual.
3. US2 → botão "Reativar" → verificação manual (inclui checagem na banco de produção).
4. US3 → siglas de curso nos 6 pontos mapeados → suíte automatizada (`disciplinasHabilitadasDoInstrutor_`)
   + verificação manual.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real.
- Nenhuma tarefa desta spec toca schema/dado persistido além de uma coluna já existente
  (`instrutores.Status`, via `crudAtualizar`) — zero migração (FR-015).
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
