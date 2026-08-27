---

description: "Task list for Hotfix: Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)"
---

# Tasks: Hotfix — Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)

**Input**: Design documents from `/specs/023-hotfix-pdf-impressao-ficha/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-functions.md,
contracts/server-functions.md, quickstart.md — todos completos. Sem `data-model.md` (spec não toca
nenhuma entidade de dado, FR-009).

**Tests**: Sem automatizados — os 3 bugs tocam DOM/CSS (`app/(app)/instrutores/page.tsx`, `app/globals.css`) ou
`o Supabase Storage` (`lib/acoes/instrutores.ts`), nenhum dos dois com harness de mock no projeto (mesmo achado já
documentado nas specs 020-022). Verificação manual via `quickstart.md`.

**Organization**: 3 User Stories independentes — cada uma corrige um bug isolado, confirmado por
leitura de código antes de qualquer tarefa ser escrita. US1/US2 são P1 (podem ser feitas em
qualquer ordem entre si); US3 é P2. Nenhuma dependência lógica real entre as 3, mas US1 toca o
mesmo arquivo de US3 (`app/(app)/instrutores/page.tsx`, regiões disjuntas) — não marcadas `[P]` entre si por
prudência, só entre arquivos diferentes.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (301 testes, 301
      passam, 0 falham, herdado do fechamento da spec 022) antes de qualquer mudança.

---

## Phase 2: Foundational

Nenhuma tarefa foundational necessária — as 3 User Stories corrigem bugs isolados em arquivos já
existentes, sem infraestrutura compartilhada nova.

---

## Phase 3: User Story 1 - Ver o nome do instrutor em texto puro, sem tags vazando (Priority: P1)

**Goal**: O botão da listagem diz "Ficha" (não mais "Imprimir Ficha"); o título da Ficha mostra o
nome do instrutor com negrito visual real no nome de guerra, nunca as tags HTML como texto.

**Independent Test**: `quickstart.md` Passo 1 — abrir a Ficha, confirmar o texto do botão e o
título sem vazamento de tags.

### Implementation for User Story 1

- [X] T002 [US1] Em `app/(app)/instrutores/page.tsx` (linha 399): trocar o texto do botão de
      "Imprimir Ficha" para "Ficha" — `onclick` inalterado (contracts/frontend-functions.md,
      FR-001). Depende de T001.
- [X] T003 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarModalFichaInstrutor_`
      (linha 1285): remover o wrapper `escapar(...)` ao redor de
      `formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)` — a
      chamada em si (com `isHTML=true`) permanece igual, preservando o negrito (Clarifications
      2026-08-19, contracts/frontend-functions.md, research.md §1, FR-002). Depende de T001.
- [X] T004 [US1] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo, mudança de DOM). Depende de T002, T003.

### Verificação manual (não automatizável — FR-001, FR-002)

- [ ] T005 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar texto "Ficha" no botão e negrito real (sem tags visíveis) no título da
      Ficha.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Imprimir a Ficha sem páginas em branco (Priority: P1)

**Goal**: A impressão nativa do navegador mostra só o conteúdo da Ficha (ou do DSA), sem sidebar,
navbar, backdrop do modal ou páginas em branco extras.

**Independent Test**: `quickstart.md` Passo 2 — acionar impressão na Ficha e no DSA, confirmar
ausência de página em branco nos dois casos.

### Implementation for User Story 2

- [X] T006 [P] [US2] Em `app/globals.css`, dentro do bloco `@media print` (linhas
      109-123): trocar `body * { visibility: hidden; }` e `#areaImpressao, #areaImpressao *,
      .area-impressao, .area-impressao * { visibility: visible; }` por `body * { display: none
      !important; }` e `.area-impressao, .area-impressao * { display: revert !important; }`,
      acrescentando uma regra mais específica `.area-impressao { display: block !important; ... }`
      (mantendo `position: absolute; top: 0; left: 0; width: 100%;` já existente, nessa ordem —
      depois da regra de `revert`, para vencer o empate de especificidade). Regras `@page`/`@page
      ficha-instrutor`/`.area-impressao.ficha-instrutor { page: ... }` inalteradas
      (contracts/frontend-functions.md, research.md §2, FR-004, FR-005). Arquivo diferente de
      T002/T003, paralelizável. Depende de T001.
- [X] T007 [US2] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo, mudança de CSS). Depende de T006.

### Verificação manual (não automatizável — FR-004, FR-005)

- [ ] T008 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar impressão da Ficha sem páginas em branco E confirmar que a impressão A4
      paisagem do DSA (Épico H) continua funcionando sem regressão.

**Checkpoint**: User Stories 1 e 2 completas — Ficha sem vazamento de HTML e imprimindo
corretamente.

---

## Phase 5: User Story 3 - PDF salvo com nome correto na pasta certa (Priority: P2)

**Goal**: O PDF gerado é salvo dentro da pasta "Fichas dos Instrutores" com o nome
`"Ficha - <nome de exibição formatado>"`, nunca no Supabase Storage nem com o ID cru.

**Independent Test**: `quickstart.md` Passo 3 — gerar o PDF de 2 instrutores de teste, confirmar
pasta única e nome correto para os dois.

### Implementation for User Story 3

- [X] T009 [P] [US3] Em `lib/acoes/instrutores.ts`: criar `pastaFichasInstrutores_()` (nova —
      `o Supabase Storage.getFoldersByName('Fichas dos Instrutores')`, devolve a pasta existente via
      `.next()` se houver, senão `o Supabase Storage.createFolder(...)`); estender `gerarFichaPDF` para
      receber `nomeExibicao` como segundo parâmetro, com `var nome = nomeExibicao || idInstrutor;`
      como retaguarda; usar `nome` em `makeCopy('Ficha - ' + nome)` e em
      `.setName('Ficha - ' + nome + '.pdf')`; trocar `o Supabase Storage.createFile(pdf)` por
      `pastaFichasInstrutores_().createFile(pdf)` — nenhuma mudança na lógica de mesclagem em si
      (contracts/server-functions.md, research.md §3, FR-006, FR-007, FR-008). Depende de T001.
- [X] T010 [P] [US3] Em `app/(app)/instrutores/page.tsx`, dentro de `gerarPdfFichaClick`
      (linha 1311): antes de chamar `gs(...)`, calcular `nomeExibicao =
      formatarNomeInstrutor_(instrutorFichaAtual_.Posto_Graduacao, instrutorFichaAtual_.Esp_Hab_Obs,
      instrutorFichaAtual_.Nome_Completo, instrutorFichaAtual_.Nome_Guerra, false)`; estender a
      guarda condicional para também checar `instrutorFichaAtual_`; chamar
      `gs('gerarFichaPDF', idInstrutor, nomeExibicao)` com o novo segundo argumento
      (contracts/frontend-functions.md, research.md §3, FR-003). Arquivo diferente de T009,
      paralelizável — mas mesma região de arquivo que T002 (`app/(app)/instrutores/page.tsx`), não marcado
      `[P]` em relação a T002/T003 por prudência. Depende de T001.
- [X] T011 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo — `o Supabase Storage`, sem harness de mock, mesmo achado da spec 022). Depende de T009, T010.

### Verificação manual (não automatizável — FR-003, FR-006, FR-007)

- [ ] T012 [US3] Seguir `quickstart.md` Passo 3 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — gerar PDF de 2 instrutores de teste, confirmar pasta única "Fichas dos Instrutores"
      e nome de arquivo correto (sem ID cru) para os dois.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `app/(app)/instrutores/page.tsx`, `app/globals.css` e `lib/acoes/instrutores.ts` ganham uma frase citando
      este hotfix (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T014 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor.
- [X] T015 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão.
- [ ] T016 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-3), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: vazia nesta spec.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)**: todas dependem só de Setup, sem
  dependência lógica real entre si — 3 bugs isolados e independentes.
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- US1: T002 e T003 (mesmo arquivo, sequenciais por prudência) → T004 (confirmar 0 regressão) → T005
  (manual).
- US2: T006 (único arquivo) → T007 (confirmar 0 regressão) → T008 (manual).
- US3: T009 (`lib/acoes/instrutores.ts`) e T010 (`app/(app)/instrutores/page.tsx`) em arquivos diferentes, paralelos
  entre si → T011 (confirmar 0 regressão) → T012 (manual).

### Parallel Opportunities

- **T006 (US2, `app/globals.css`)** pode rodar em paralelo com **T002/T003 (US1,
  `app/(app)/instrutores/page.tsx`)** e com **T009 (US3, `lib/acoes/instrutores.ts`)** — arquivos diferentes.
- **T009 (US3, `lib/acoes/instrutores.ts`) e T010 (US3, `app/(app)/instrutores/page.tsx`)** — arquivos diferentes.
- **T013 e T014 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois do Setup

```bash
Task: "T002/T003 [US1] Renomear botao + remover escapar() em `app/(app)/instrutores/page.tsx`"
Task: "T006 [US2] Corrigir @media print (visibility -> display) em `app/globals.css`"
Task: "T009 [US3] pastaFichasInstrutores_/gerarFichaPDF em `lib/acoes/instrutores.ts`"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

US1 e US2 (ambas P1) juntas eliminam os 2 bugs mais visíveis e constrangentes (texto de código na
tela, dezenas de páginas em branco na impressão) — podem ser implantadas e validadas isoladamente
antes de US3.

### Incremental Delivery

1. Setup → baseline confirmado (301 testes).
2. US1 → botão renomeado + título sem vazamento → verificação manual.
3. US2 → impressão corrigida (Ficha + DSA sem regressão) → verificação manual.
4. US3 → PDF com nome/pasta corretos → verificação manual.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real.
- Nenhuma tarefa desta spec toca schema/dado persistido (FR-009) — zero migração.
- O item "mesclagem do Template" do pedido original não gera nenhuma tarefa de código — já
  resolvido pela edição direta do Template (fora desta spec), confirmado nos Achados reais do
  spec.md.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
