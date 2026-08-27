---

description: "Task list for Hotfix e Nova Feature: Integracao de Template SPA, Mascaras de Input e Limpeza de Formulario"
---

# Tasks: Hotfix e Nova Feature — Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

**Input**: Design documents from `/specs/025-ficha-spa-mascaras-schema/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-functions.md,
contracts/backend-migration.md, quickstart.md — todos completos.

**Tests**: US1/US2/US3 sem automatizados — tocam DOM/JS/CSS de `app/(app)/instrutores/page.tsx`/`app/globals.css`
sem harness de mock disponível (mesmo achado das specs 020-024). US4 é a exceção: as 4 funções de
máscara são puras, mesmo padrão testável de `mascaraNip_` (já coberta hoje) — ganham teste
automatizado novo.

**Organization**: 4 User Stories — US1 (P1) é o núcleo técnico (Ficha SPA + redesenho do
`@media print`, item de maior risco). US2/US3/US4 (P2/P3/P2) são independentes entre si e de US1,
exceto pela dependência comum ao script de migração (Foundational, serve US3 e US4 ao mesmo tempo —
research.md §4 trata remoção+adição como uma única unidade de migração).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (301 testes, 301
      passam, 0 falham, herdado do fechamento da spec 024) antes de qualquer mudança.

---

## Phase 2: Foundational

- [X] T002 Criar `migracao/remover_instrutor_completo_adicionar_estado.py` (mesmo padrão de
      `migracao/remover_coluna_ultima_avaliacao_desempenho.py`, spec 016) — remove a coluna
      `Instrutor_Completo` e adiciona a coluna `Endereco_Estado` (texto livre) ao cabeçalho de
      `instrutores`, com backup do `.xlsx` de trabalho antes de qualquer mudança e 2 linhas novas
      em `migracao_log` (`Acao='Remocao_Coluna'`/`'Adicao_Coluna'`), nunca reescrevendo linha
      existente (Princípio IV, contracts/backend-migration.md, data-model.md). Depende de T001.
- [X] T003 Rodar a migração de T002 contra a cópia local de trabalho (`.xlsx`) — confirmar backup
      criado, cabeçalho atualizado (sem `Instrutor_Completo`, com `Endereco_Estado`),
      `migracao_log` com as 2 linhas novas. Aplicação contra a banco de produção fica como
      pendência real (fora deste `/speckit-implement`, mesmo padrão de toda migração anterior).
      Depende de T002.

Serve como pré-requisito comum de US3 (remoção) e US4 (adição) — nenhuma tarefa de código depende
estritamente de T002/T003 terem rodado (as mudanças em `lib/acoes/crud.ts`/`app/(app)/instrutores/page.tsx` são
independentes do estado real do banco), mas documentam a mesma unidade de trabalho pedida.

---

## Phase 3: User Story 1 - Abrir e usar a Ficha do Instrutor como página inteira, sem modal (Priority: P1)

**Goal**: A Ficha vira um 3º painel SPA dentro de `tabInstrutores` (nunca mais um `.modal`), com
"Voltar"/"Salvar Ficha"/"Imprimir" funcionando corretamente — "Imprimir" volta a usar
`window.print()` com o `@media print` compartilhado redesenhado para nunca esconder ancestrais do
conteúdo impresso.

**Independent Test**: `quickstart.md` Passo 1 — abrir a Ficha como página inteira, testar os 3
botões, confirmar impressão sem página em branco (Ficha e DSA).

### Implementation for User Story 1

- [X] T004 [US1] Em `app/(app)/instrutores/page.tsx`: remover por completo o markup do modal
      (`<div id="modalFichaInstrutor" class="modal fade">...</div>`) e as funções
      `renderizarModalFichaInstrutor_`/`abrirModalFichaInstrutor_` (contracts/frontend-functions.md,
      FR-001). Depende de T001.
- [X] T005 [US1] Em `app/(app)/instrutores/page.tsx`: adicionar `<div id="painelFichaInstrutor"
      style="display:none">` como 3º painel dentro de `[data-view="tabInstrutores"]`, mais
      `mostrarPainelFichaInstrutor_()`/`fecharPainelFichaInstrutor_()`/`abrirFichaInstrutor(idInstrutor)`
      (mesmo padrão de `mostrarPainelEdicaoInstrutor_`/`fecharPainelEdicaoInstrutor_`,
      research.md §1, contracts/frontend-functions.md, FR-001). Depende de T004.
- [X] T006 [US1] Em `app/(app)/instrutores/page.tsx`: escrever `renderizarFichaInstrutor_(instrutor)`
      — adapta a grade de 12 colunas de `SIS11/modelos/Ficha de Cadastro Docente.zip` →
      `ficha-cadastro-docente-template.html` (3 seções numeradas, cabeçalho institucional de 3
      linhas maiúsculas já existente desde a spec 024) para dentro de `painelFichaInstrutor`, com
      os 3 botões no topo: "Voltar" (`onclick="fecharPainelFichaInstrutor_()"`), "Salvar Ficha no
      Supabase Storage" e "Imprimir" (`onclick="window.print()"`) (research.md §1, contracts/frontend-
      functions.md, FR-001/002). Depende de T005.
- [X] T007 [US1] Em `app/(app)/instrutores/page.tsx`: renomear `gerarPdfFichaClick` para
      `salvarFichaClick_` (mesma lógica interna) — em sucesso, mostrar um Tailwind CSS Toast
      (`Tailwind.Toast`, primeiro uso no projeto, o pacote `tailwindcss` + `shadcn/ui` já carregado desde o
      Hotfix 010) em vez de só abrir a URL numa nova aba; em erro, manter `.catch(e =>
      alert(...))` inalterado (Clarifications 2026-08-19, contracts/frontend-functions.md,
      FR-002). Atualizar o botão "Salvar Ficha" de T006 para chamar
      `salvarFichaClick_`. Depende de T006.
- [X] T008 [US1] Em `app/(app)/instrutores/page.tsx`: atualizar o `onclick` do botão "Ficha" da
      listagem (linha ~399) de `abrirModalFichaInstrutor_` para `abrirFichaInstrutor` (T005).
      Depende de T005.
- [X] T009 [P] [US1] Em `app/globals.css`, dentro do bloco `@media print` (linhas
      109-123): redesenhar de `body * { display: none !important; }` + revert seletivo para
      esconder só o chrome persistente (`nav.navbar`, `.sidebar-offcanvas`, `#overlay`) via
      `display: none`, e usar `visibility: hidden`/`visibility: visible` (não `display`) para
      isolar o conteúdo dentro da view/painel ativo — `[data-view] * { visibility: hidden
      !important; }` / `.area-impressao, .area-impressao * { visibility: visible !important; }` /
      `.area-impressao { position: absolute; top: 0; left: 0; width: 100%; }` (achado real durante
      a implementação: `[data-view] > *:not(.area-impressao)` do plano original só alcançava
      filhos diretos, não a árvore inteira — corrigido para `[data-view] *`, com `!important` nos
      dois lados para não depender de empate de especificidade/ordem de declaração). Regras
      `@page`/`@page ficha-instrutor`/`.area-impressao.ficha-instrutor { page: ... }` inalteradas
      (research.md §2, FR-003). Arquivo diferente de T004-T008, paralelizável. Depende de T001.
- [X] T010 [US1] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo, mudança de DOM/CSS). Depende de T007, T008, T009.

### Verificação manual (não automatizável — FR-001 a FR-003)

- [ ] T011 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar Ficha em página inteira, os 3 botões, toast de sucesso, impressão da Ficha
      SEM página em branco, E impressão do DSA sem regressão (mesmo bloco CSS redesenhado serve os
      dois).

**Checkpoint**: User Story 1 completa e verificável independentemente — o item de maior risco desta
spec está resolvido.

---

## Phase 4: User Story 2 - Formulário de edição sem conteúdo fora das 3 abas (Priority: P2)

**Goal**: "Sistema" (sem sufixo) e os 2 painéis de disciplinas aparecem exclusivamente dentro da Aba
3, nunca fora da estrutura de abas.

**Independent Test**: `quickstart.md` Passo 2 — confirmar que os 3 painéis só aparecem na Aba 3.

### Implementation for User Story 2

- [X] T012 [US2] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarPainelEdicaoInstrutor_`
      (linhas 1060-1076): mover o ponto de concatenação de `blocosForaDeAbaHtml` e das chamadas de
      `disciplinasHabilitadasHtmlInstrutor_(instrutor)`/`painelAtribuicaoDisciplinasHtmlInstrutor_
      (instrutor)` de "depois de `<div class="tab-content">`" para "dentro do `tab-pane` de
      `a.aba === 'complementares'`" (research.md §3, contracts/frontend-functions.md, FR-004).
      Depende de T001.
- [X] T013 [US2] Em `app/(app)/instrutores/page.tsx`, dentro de `BLOCOS_EDICAO_INSTRUTOR`
      (linha 825): trocar o título do bloco de `'Sistema (somente leitura)'` para `'Sistema'`
      (Clarifications 2026-08-19 confirma: card avulso, não misturado aos campos de Qualificação
      Docente — FR-004). Mesmo arquivo de T012 — sequencial, não paralelo. Depende de T001.
- [X] T014 [US2] Rodar `pnpm vitest run` — confirmar 0 regressão. Depende de T012, T013.

### Verificação manual (não automatizável — FR-004)

- [ ] T015 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar que nada aparece fora da Aba 3, "Sistema" como card avulso sem sufixo no
      título.

**Checkpoint**: User Stories 1 e 2 completas.

---

## Phase 5: User Story 3 - Remover a coluna "Instrutor (Nome Completo Formatado)" (Priority: P3)

**Goal**: `Instrutor_Completo` removida por completo — schema, `lib/acoes/crud.ts`, formulário.

**Independent Test**: `quickstart.md` Passo 3 — confirmar ausência do campo no formulário e da
coluna no banco (migrada).

### Implementation for User Story 3

- [X] T016 [P] [US3] Em `lib/acoes/crud.ts` (linha 43): remover `'Instrutor_Completo'` de
      `COLUNAS_FORMULA['instrutores']` — fica só `['Carga_Horaria_Ministrada_Ano']`
      (contracts/backend-migration.md, research.md §4, FR-005). Arquivo diferente de T017,
      paralelizável. Depende de T002 (mesma unidade de migração), T001.
- [X] T017 [P] [US3] Em `app/(app)/instrutores/page.tsx`, dentro de `BLOCOS_EDICAO_INSTRUTOR`
      (bloco "Sistema", linha 827): remover a linha `{ chave: 'Instrutor_Completo', rotulo:
      'Instrutor (nome completo formatado)', tipo: 'readonly' }` (contracts/frontend-functions.md,
      research.md §4, FR-005). Arquivo diferente de T016, paralelizável — mas NÃO paralelo a
      T020/T021/T023 (US4, mesmo `BLOCOS_EDICAO_INSTRUTOR`, achado `/speckit-analyze` F1). Depende
      de T002, T001.
- [X] T018 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão; rodar `grep -rn
      "Instrutor_Completo" src/` e confirmar 0 ocorrências (achado `/speckit-analyze` F3, SC-005 —
      verificação 100% automatável, não depende de navegador). Depende de T016, T017.

### Verificação manual (não automatizável — FR-005)

- [ ] T019 [US3] Seguir `quickstart.md` Passo 3 — confirmar ausência do campo no formulário; na
      banco de produção (quando a migração for aplicada), confirmar coluna removida e
      `migracao_log` atualizado.

**Checkpoint**: User Stories 1, 2 e 3 completas.

---

## Phase 6: User Story 4 - Campo Estado e máscaras rígidas de CPF/CEP/Telefone/RETELMA (Priority: P2)

**Goal**: Estado vira `<select>` de UFs (RJ padrão); CPF/CEP/Telefone/RETELMA formatam em tempo
real; NIP/Data continuam validando como hoje.

**Independent Test**: `quickstart.md` Passo 4 — confirmar Estado pré-selecionado e as 4 máscaras
formatando ao digitar.

### Implementation for User Story 4

- [X] T020 [US4] Em `app/(app)/instrutores/page.tsx`: criar a constante `UNIDADES_FEDERATIVAS_`
      (27 UFs do Brasil) e adicionar `{ chave: 'Endereco_Estado', rotulo: 'Estado', tipo:
      'dropdown-uf' }` ao bloco "Identificação" de `BLOCOS_EDICAO_INSTRUTOR`, logo após
      `Endereco_CEP` (contracts/frontend-functions.md, data-model.md, FR-006). Depende de T002,
      T001.
- [X] T021 [US4] Em `app/(app)/instrutores/page.tsx`, dentro de
      `renderizarCampoEdicaoInstrutor_`: novo ramo `if (campo.tipo === 'dropdown-uf')` — `<select>`
      com as 27 UFs de `UNIDADES_FEDERATIVAS_`, `"RJ"` selecionado quando `!instrutor` (modo
      cadastro) ou quando `valor === 'RJ'` (contracts/frontend-functions.md, FR-006). Mesmo arquivo
      de T020 — sequencial. Depende de T020.
- [X] T022 [US4] Em `app/(app)/instrutores/page.tsx`: escrever `mascaraCpf_`, `mascaraCep_`,
      `mascaraTelefone_`, `mascaraRetelma_` (funções puras, mesmo padrão de `mascaraNip_`,
      research.md §5) — CPF `000.000.000-00`; CEP `00000-000`; Telefone `(00) 00000-0000` (11
      dígitos) ou `(00) 0000-0000` (10 dígitos); RETELMA `(00) 0000-0000` (10 dígitos) ou
      `0000-0000` (8 dígitos, sem o prefixo de 2 dígitos) — achado real durante a implementação,
      corrigido a partir do exemplo do próprio pedido original (`(00) 0000-0000` soma 10 dígitos,
      não 8) (contracts/frontend-functions.md, research.md §5, FR-007). Depende de T001.
- [X] T023 [US4] Em `app/(app)/instrutores/page.tsx`: generalizar o ramo `if (campo.tipo ===
      'texto-mascarado')` de `renderizarCampoEdicaoInstrutor_` para `'texto-mascarado-generico'`,
      recebendo a função de máscara por `campo.mascara` em vez de chamar `mascaraNip_` fixo; migrar
      o campo `NIP` para o novo tipo (`mascara: 'mascaraNip_'`, comportamento idêntico, FR-008); dar
      `tipo: 'texto-mascarado-generico'` + `mascara` correspondente aos campos `CPF`,
      `Endereco_CEP`, `Telefone`, `RETELMA` em `BLOCOS_EDICAO_INSTRUTOR`
      (contracts/frontend-functions.md, research.md §5, FR-007). Depende de T022, T020, T021.
- [X] T024 [P] [US4] Em `tests/unidade/ficha_formulario_instrutores.test.ts`: adicionar 4 casos novos
      (`mascaraCpf_`/`mascaraCep_`/`mascaraTelefone_`/`mascaraRetelma_`), mesmo padrão dos casos já
      existentes de `mascaraNip_`. Arquivo diferente de T020-T023, paralelizável. Depende de T022.
- [X] T025 [US4] Rodar `pnpm vitest run` — confirmar suíte cresce para 305 testes, 305
      passam, 0 falham (301 + 4 novos de T024), incluindo confirmação de que NIP/Data continuam
      validando sem regressão (FR-008). Depende de T023, T024.

### Verificação manual (não automatizável — FR-006)

- [ ] T026 [US4] Seguir `quickstart.md` Passo 4 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar Estado com "RJ" pré-selecionado e as 4 máscaras formatando em tempo real.

**Checkpoint**: As 4 User Stories completas e verificáveis independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `app/(app)/instrutores/page.tsx`, `app/globals.css` e `lib/acoes/crud.ts` ganham uma frase citando este
      hotfix (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T028 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor.
- [X] T029 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (305
      testes) em 0 falhas, 0 regressão.
- [ ] T030 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-4), após implantação via
      `o fluxo Git → Vercel` — confirmar as 4 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende só de Setup — serve como prerequisito comum de US3/US4 (não
  bloqueia US1/US2, que não tocam schema).
- **US1 (Phase 3)**: depende só de Setup.
- **US2 (Phase 4)**: depende só de Setup — mesmo arquivo de US1 (`app/(app)/instrutores/page.tsx`), regiões
  disjuntas (Ficha vs. formulário de edição), sem dependência lógica real entre as duas.
- **US3 (Phase 5)**: depende de Foundational (T002) + Setup.
- **US4 (Phase 6)**: depende de Foundational (T002) + Setup.
- **Polish (Phase 7)**: depende das 4 User Stories completas.

### Within Each Phase

- Foundational: T002 → T003.
- US1: T004 → T005 → T006 → T007 (mesmo arquivo, sequenciais); T008 depende só de T005; T009
  (arquivo diferente) paralelo a T004-T008; T010 (confirmar 0 regressão) depende de T007/T008/T009
  → T011 (manual).
- US2: T012 → T013 (mesmo arquivo, sequenciais) → T014 (confirmar 0 regressão) → T015 (manual).
- US3: T016 (`lib/acoes/crud.ts`) e T017 (`app/(app)/instrutores/page.tsx`) em arquivos diferentes, paralelos entre si →
  T018 (confirmar 0 regressão + grep de 0 referências, achado F3) → T019 (manual). US3 e US4 NÃO
  são paralelas entre si (achado F1) — ambas tocam `BLOCOS_EDICAO_INSTRUTOR` em
  `app/(app)/instrutores/page.tsx`, sequenciar em qualquer ordem.
- US4: T020 → T021 (mesmo trecho, sequenciais); T022 independente (novas funções) → T023 (une os
  dois); T024 (arquivo de teste, paralelo a T020-T023) → T025 (confirmar suíte) → T026 (manual).

### Parallel Opportunities

- **T009 (US1, `app/globals.css`)** paralelo a **T004-T008 (US1, `app/(app)/instrutores/page.tsx`)** — arquivos
  diferentes dentro da mesma história.
- **T016 [P] (US3, `lib/acoes/crud.ts`)** paralelo a **T017 [P] (US3, `app/(app)/instrutores/page.tsx`)**.
- **T024 (US4, `tests/unidade/ficha_formulario_instrutores.test.ts`)** paralelo a **T020-T023 (US4,
  `app/(app)/instrutores/page.tsx`)**.
- **NÃO paralelizar US3 com US4** (achado `/speckit-analyze` F1): T017 (US3) e T020/T021/T023 (US4)
  editam o mesmo array `BLOCOS_EDICAO_INSTRUTOR` em `app/(app)/instrutores/page.tsx` (regiões diferentes, mas
  o mesmo literal) — sequenciar as 2 histórias em qualquer ordem, nunca em paralelo verdadeiro.
- **T027/T028 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois do Foundational

```bash
Task: "T004-T008 [US1] Modal -> painelFichaInstrutor em `app/(app)/instrutores/page.tsx`"
Task: "T009 [US1] Redesenhar @media print em `app/globals.css`"
```

US3 (T016-T017) e US4 (T020-T023) tocam o mesmo `BLOCOS_EDICAO_INSTRUTOR` (achado F1) — rodar em
sequência, uma história de cada vez, nunca no mesmo lote paralelo do exemplo acima:

```bash
Task: "T016 [P] [US3] Remover Instrutor_Completo em `lib/acoes/crud.ts`"
Task: "T017 [P] [US3] Remover Instrutor_Completo em `app/(app)/instrutores/page.tsx`"
```

---

## Implementation Strategy

### MVP First (User Story 1)

US1 sozinha já entrega o item de maior risco/valor: Ficha SPA funcionando + impressão corrigida de
vez (Ficha e DSA). US2/US3/US4 são incrementos independentes que podem seguir em qualquer ordem
depois.

### Incremental Delivery

1. Setup → baseline confirmado (301 testes).
2. Foundational → script de migração criado e rodado contra a cópia local.
3. US1 → Ficha SPA, impressão corrigida (Ficha + DSA) → verificação manual.
4. US2 → abas sem conteúdo solto → verificação manual.
5. US3 → `Instrutor_Completo` removida → verificação manual.
6. US4 → Estado + máscaras → verificação manual.
7. Polish → suíte completa (305 testes) + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real.
- Migração de schema (T002/T003) só contra a cópia local nesta fase — aplicar contra o banco ao
  vivo exige autorização explícita de Bernardo, tratada como pendência real ao final da spec.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
