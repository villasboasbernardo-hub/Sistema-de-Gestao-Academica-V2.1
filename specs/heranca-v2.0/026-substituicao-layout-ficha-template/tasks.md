---

description: "Task list for Hotfix: Substituicao Estrita do Layout da Ficha pelo Template Local"
---

# Tasks: Hotfix — Substituição Estrita do Layout da Ficha pelo Template Local

**Input**: Design documents from `/specs/026-substituicao-layout-ficha-template/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-functions.md, quickstart.md —
todos completos. Sem `data-model.md` (spec não toca nenhuma entidade de dado, FR-009).

**Tests**: Sem automatizados — a mudança é DOM/CSS puro (troca de HTML gerado por
`renderizarFichaInstrutor_`), sem harness de mock disponível (mesmo achado das specs 020-025) e
sem lógica condicional nova que justifique caso de teste dedicado. Verificação por leitura de
texto (grep, T006) + manual via `quickstart.md`.

**Organization**: 2 User Stories, ambas P1 — US1 é a substituição de layout propriamente dita; US2
é a garantia de não regressão dos botões/impressão (restrição explícita do pedido original,
"ZERO alterações nas lógicas de botões"). US2 depende logicamente de US1 estar pronta para
verificar (mesmo arquivo/função), mas sua verificação é sobre o que NÃO muda, não uma
implementação nova.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (315 testes, 315
      passam, 0 falham, herdado do fechamento da spec 025) antes de qualquer mudança.

---

## Phase 2: Foundational

- [X] T002 Escrever e rodar um script one-off (Node ou Python, não versionado) que: (a) extrai o
      `<style>` de `SIS11/modelos/Ficha de cadastro/FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` e
      prefixa cada seletor com `#fichaInstrutorConteudo ` (research.md §1); (b) extrai o `<body>`
      do mesmo arquivo, remove o `<hr style="page-break-before:always;...">` (Clarifications
      2026-08-19) e troca cada `{{TAG}}` por `${...}` de interpolação JS conforme a tabela de
      research.md §3; (c) converte `images/image1.png` e `images/image2.png` para
      `data:image/png;base64,...` e substitui os `src="images/imageN.png"` correspondentes,
      preservando as dimensões/margens de recorte originais (research.md §2). Saída: o texto HTML/
      CSS/JS final pronto para colar em `renderizarFichaInstrutor_` (T003). Depende de T001.

---

## Phase 3: User Story 1 - Ver a Ficha com o layout oficial exato, imagens incluídas (Priority: P1)

**Goal**: A Ficha mostra a estrutura exata do arquivo HTML local (3 seções numeradas, cabeçalho
com as 2 imagens em Base64, texto em Título/Frase normal), com cada `{{TAG}}` preenchida pelo
dado real do instrutor.

**Independent Test**: `quickstart.md` Passo 1 — abrir a Ficha, comparar visualmente com o arquivo
local, confirmar imagens instantâneas e campos preenchidos.

### Implementation for User Story 1

- [X] T003 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarFichaInstrutor_`:
      substituir o HTML gerado a partir de `BLOCOS_EDICAO_INSTRUTOR` (tabela genérica rótulo/
      valor, spec 025) pelo conteúdo produzido em T002 — `<style>` escopado + miolo do `<body>`
      com tags interpoladas + imagens em Base64 — dentro do wrapper já existente
      `id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor"` (mantido). `DISCIPLINAS_
      HABILITADAS` via `disciplinasHabilitadasDoInstrutor_(...)`; `DATA_GERACAO` via
      `new Date().toLocaleDateString('pt-BR')` (research.md §3, FR-007); `ANTIGUIDADE_DECLARADA`
      MUST NUNCA aparecer (FR-008, achado real). Assinatura da função inalterada
      (contracts/frontend-functions.md, FR-001 a FR-004/007/008). Depende de T002.
- [X] T004 [US1] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso
      automatizado novo, mudança de DOM/CSS). Depende de T003.

### Verificação manual (não automatizável — FR-001 a FR-004/007/008)

- [ ] T005 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — comparar visualmente com o arquivo local, confirmar as 2 imagens carregando sem
      requisição de rede (aba Rede do DevTools), confirmar campos preenchidos sem nenhuma tag
      `{{...}}` literal visível.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Botões e impressão continuam funcionando sem nenhuma mudança de lógica (Priority: P1)

**Goal**: Os 3 botões (Voltar/Salvar Ficha/Imprimir) e a impressão sem página em branco
continuam funcionando exatamente como na spec 025 — nenhuma lógica de botão/backend tocada.

**Independent Test**: `quickstart.md` Passo 2 — clicar nos 3 botões, confirmar impressão sem
página em branco (Ficha e DSA), confirmar que nenhuma outra tela do sistema mudou.

### Implementation for User Story 2

- [X] T006 [US2] Em `app/(app)/instrutores/page.tsx`: conferir por leitura de texto (grep) que,
      depois de T003, os 3 `onclick` (`fecharPainelFichaInstrutor_()`,
      `salvarFichaClick_(...)`, `window.print()`), o markup de
      `#toastFichaInstrutor` e o wrapper `id="fichaInstrutorConteudo" class="area-impressao
      ficha-instrutor"` permanecem byte-idênticos ao estado da spec 025 (FR-005/006, restrição
      "ZERO alterações nas lógicas de botões" do pedido original) — verificação 100% automatável,
      não depende de navegador. Depende de T003.

### Verificação manual (não automatizável — FR-005/006, SC-004)

- [ ] T007 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar os 3 botões funcionando, impressão da Ficha e do DSA sem página em
      branco, e nenhuma outra view/tela do sistema com aparência alterada (CSS contido à Ficha).

**Checkpoint**: As 2 User Stories completas e verificáveis independentemente.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T008 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linha de `app/(app)/instrutores/page.tsx` ganha uma frase citando este hotfix (mesmo padrão de "última
      alteração" já usado para todo épico/hotfix anterior).
- [X] T009 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor.
- [X] T010 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (315
      testes) em 0 falhas, 0 regressão.
- [ ] T011 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-2), após implantação via
      `o fluxo Git → Vercel` — confirmar as 2 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende só de Setup — T002 gera o conteúdo que T003 (US1) consome.
- **US1 (Phase 3)**: depende de Foundational (T002).
- **US2 (Phase 4)**: depende de US1 (T003) — verifica o que NÃO mudou depois da edição de T003,
  não pode rodar antes dela.
- **Polish (Phase 5)**: depende das 2 User Stories completas.

### Within Each Phase

- Foundational: só T002.
- US1: T003 → T004 (confirmar 0 regressão) → T005 (manual).
- US2: T006 (grep de não-regressão) → T007 (manual).

### Parallel Opportunities

- Nenhuma real dentro do fluxo principal — é uma única função (`renderizarFichaInstrutor_`) num
  único arquivo, editada uma vez (T003), depois só verificada (T004/T006/T005/T007).
- **T008/T009 (Polish)** podem rodar em paralelo entre si.

---

## Implementation Strategy

### MVP First (User Story 1)

US1 sozinha já entrega o núcleo do pedido — o layout correto visível na tela. US2 é garantia de
não regressão da mesma mudança, não um incremento de valor novo.

### Incremental Delivery

1. Setup → baseline confirmado (315 testes).
2. Foundational → conteúdo transformado (HTML/CSS/imagens) pronto para colar.
3. US1 → layout substituído → verificação manual.
4. US2 → botões/impressão confirmados sem regressão (automatizável + manual).
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real (só se aplica ao Polish nesta spec).
- Nenhuma tarefa desta spec toca schema/dado persistido nem `.ts` (FR-009) — zero migração, zero
  mudança de backend.
- O script de T002 não é um artefato versionado do repositório (diferente de `migracao/*.py`) —
  gera texto para colar em T003, não fica como ferramenta reexecutável permanente.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
