---

description: "Task list for Hotfix: Titulo/Cabecalho da Ficha do Instrutor, Novo Fluxo de Impressao via PDF do Supabase Storage e Completar Tags do Template"
---

# Tasks: Hotfix — Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template

**Input**: Design documents from `/specs/024-hotfix-impressao-pdf-ficha/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/frontend-functions.md,
contracts/template-tags.md, quickstart.md — todos completos. Sem `data-model.md` (spec não toca
nenhuma entidade de dado, FR-008).

**Tests**: Sem automatizados — US1/US2 tocam DOM/JS de `app/(app)/instrutores/page.tsx`, sem harness de mock
no projeto (mesmo achado das specs 020-023); US3 (template da rota `/print/ficha-instrutor`) não é testável por
`pnpm vitest run` de forma alguma — artefato externo ao Supabase Storage. Verificação por leitura de volta da API
(US3) e manual via `quickstart.md` (US1/US2/US3).

**Organization**: 3 User Stories independentes — cada uma corrige um problema isolado, confirmado
por leitura de código/dado ao vivo antes de qualquer tarefa ser escrita. US1/US2 são P1 (podem ser
feitas em qualquer ordem entre si); US3 é P2, sem dependência de código nenhuma das outras duas
(só toca o Template do Supabase Storage).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (301 testes, 301
      passam, 0 falham, herdado do fechamento da spec 023) antes de qualquer mudança.

---

## Phase 2: Foundational

Nenhuma tarefa foundational necessária — as 3 User Stories corrigem problemas isolados em um único
arquivo de código já existente (mais o Template externo em US3), sem infraestrutura compartilhada
nova.

---

## Phase 3: User Story 1 - Ver o título e o cabeçalho da Ficha corretos (Priority: P1)

**Goal**: O título da Ficha mostra posto/graduação e especialidade junto do nome (RF-INSTR-15); o
cabeçalho on-screen mostra as 3 linhas institucionais em TUDO MAIÚSCULO, na ordem certa.

**Independent Test**: `quickstart.md` Passo 1 — abrir a Ficha, confirmar título e cabeçalho.

### Implementation for User Story 1

- [X] T002 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarModalFichaInstrutor_`
      (linha 1285): trocar os dois primeiros argumentos vazios de `formatarNomeInstrutor_` por
      `instrutor.Posto_Graduacao`/`instrutor.Esp_Hab_Obs` — `Nome_Completo`/`Nome_Guerra`/
      `isHTML=true` inalterados (contracts/frontend-functions.md, research.md §1, FR-001). Depende
      de T001.
- [X] T003 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `renderizarModalFichaInstrutor_`
      (linhas 1281-1284): reescrever o bloco de cabeçalho fixo para 3 linhas institucionais em
      TUDO MAIÚSCULO — "MARINHA DO BRASIL" / "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER
      DE AQUINO" / "DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA" — seguidas de "Ficha do Instrutor" como
      subtítulo (texto normal, não maiúsculo) (Clarifications 2026-08-19,
      contracts/frontend-functions.md, research.md §1, FR-002). Mesma função de T002 — sequencial,
      não paralelo. Depende de T001.
- [X] T004 [US1] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo, mudança de DOM). Depende de T002, T003.

### Verificação manual (não automatizável — FR-001, FR-002)

- [ ] T005 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar título com posto/especialidade e cabeçalho de 3 linhas em maiúsculo.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Imprimir a Ficha via PDF, sem página em branco (Priority: P1)

**Goal**: O botão "Imprimir" abre o PDF gerado numa nova aba (nunca `window.print()` sobre o
modal); o botão "Gerar PDF" passa a se chamar "Salvar Ficha".

**Independent Test**: `quickstart.md` Passo 2 — clicar em "Imprimir", confirmar nova aba com PDF
sem página em branco; confirmar regressão do DSA.

### Implementation for User Story 2

- [X] T006 [US2] Em `app/(app)/instrutores/page.tsx` (linha 49): trocar o texto do botão de
      "Gerar PDF" para "Salvar Ficha" — `onclick`/`gerarPdfFichaClick` inalterados
      (contracts/frontend-functions.md, research.md §2, FR-003). Depende de T001.
- [X] T007 [US2] Em `app/(app)/instrutores/page.tsx` (linha 50): trocar o `onclick` do botão
      "Imprimir" de `window.print()` para
      `gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)` — mesmo
      `onclick` do botão "Salvar Ficha"; texto do botão ("Imprimir") inalterado
      (contracts/frontend-functions.md, research.md §2, FR-004). Mesmo bloco de T006 — sequencial,
      não paralelo. Depende de T001.
- [X] T008 [US2] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso automatizado
      novo, mudança de `onclick`). Depende de T006, T007.

### Verificação manual (não automatizável — FR-003, FR-004, FR-005)

- [ ] T009 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar botão "Salvar Ficha", "Imprimir" abrindo PDF em nova aba sem
      página em branco, E confirmar que a impressão A4 paisagem do DSA (Épico H) continua
      funcionando sem regressão (`app/globals.css` da spec 023 permanece intocado).

**Checkpoint**: User Stories 1 e 2 completas — título/cabeçalho corretos e impressão via PDF sem
página em branco.

---

## Phase 5: User Story 3 - PDF da Ficha com todos os campos cadastrados preenchidos (Priority: P2)

**Goal**: As 14 tags de `MAPA_TAGS_FICHA_PDF` ainda sem `{{TAG}}` no Template são inseridas —
34 tags no total substituídas por dado real ou vazias, nunca a tag literal visível.

**Independent Test**: `quickstart.md` Passo 3 — gerar o PDF de 2 instrutores de teste (um com os 14
campos novos preenchidos, outro com um deles vazio), confirmar substituição correta nos dois casos.

### Implementation for User Story 3

- [X] T010 [US3] Criar um backup do template da rota `/print/ficha-instrutor`
      (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`) antes de qualquer edição — mesmo padrão já
      usado nas specs 022/023 (contracts/template-tags.md, research.md §3, FR-006). Sem dependência
      de T001 (não toca código).
- [X] T011 [US3] Inserir as 14 tags nas posições e formato exatos de `contracts/template-tags.md`
      num único `batchUpdate` da API do a rota de impressão `/print/*`, em ordem decrescente de índice (para não
      sofrer drift entre requisições do mesmo lote) — `CATEGORIA`, `ANTIGUIDADE_DECLARADA`,
      `DEP_DIVISAO`, `DATA_ASSUNCAO_SETOR`, `RETELMA`, `REGIME_TRABALHO`, `NIVEL_ESCOLARIDADE`,
      `CAPACITACAO_DIDATICA`, `DATA_AVALIACAO`, `DISCIPLINAS_MINISTRADAS` (achado
      `/speckit-analyze` F2 — mecanismo diferente das outras 13: `deleteContentRange` + `insertText`
      no intervalo dos sublinhados, não `insertText` puro), `DATA_INICIO_DOCENCIA_MB`,
      `DATA_INICIO_DOCENCIA_CIAARA`, `PREFERENCIA`, `ID_INSTRUTOR` (research.md §3,
      contracts/template-tags.md, FR-006). Depende de T010.
- [X] T012 [US3] Depois que o `batchUpdate` de T011 commitar, ler o texto completo do documento de
      volta (plaintext) numa única verificação combinada (achado `/speckit-analyze` F1 — não 14
      leituras separadas) e confirmar: (a) as 14 tags novas caíram no lugar certo, (b) nenhum texto
      vizinho foi corrompido/duplicado (checagem especial para `DISCIPLINAS_MINISTRADAS`, a única
      requisição que remove texto), (c) as 20 tags já existentes não foram afetadas, (d) as 34 tags
      de `MAPA_TAGS_FICHA_PDF` estão todas presentes simultaneamente no documento
      (contracts/template-tags.md). Depende de T011.

### Verificação manual (não automatizável — FR-006, FR-007)

- [ ] T013 [US3] Seguir `quickstart.md` Passo 3 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — gerar PDF de 2 instrutores de teste, confirmar as 34 tags substituídas corretamente
      (dado real ou vazio, nunca `{{...}}` literal) nos dois casos.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linha de `app/(app)/instrutores/page.tsx` ganha uma frase citando este hotfix (mesmo padrão de "última
      alteração" já usado para todo épico/hotfix anterior).
- [X] T015 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor.
- [X] T016 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão.
- [ ] T017 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-3), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro (bloqueia só as tarefas de código, T002/
  T003/T006/T007; T010 não depende dela).
- **Foundational (Phase 2)**: vazia nesta spec.
- **US1 (Phase 3)** e **US2 (Phase 4)**: dependem só de Setup, sem dependência lógica real entre si
  — 2 correções isoladas no mesmo arquivo, regiões disjuntas.
- **US3 (Phase 5)**: sem dependência de código nenhuma das outras duas — só toca o Template do
  Supabase Storage, pode rodar em paralelo com US1/US2 desde o início.
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- US1: T002 e T003 (mesma função, sequenciais) → T004 (confirmar 0 regressão) → T005 (manual).
- US2: T006 e T007 (mesmo bloco, sequenciais) → T008 (confirmar 0 regressão) → T009 (manual).
- US3: T010 (backup) → T011 (inserir tags) → T012 (verificar por leitura de volta) → T013 (manual).

### Parallel Opportunities

- **US3 (T010-T012, Template do Supabase Storage)** pode rodar inteiramente em paralelo com **US1 (T002-T004,
  `app/(app)/instrutores/page.tsx`)** e **US2 (T006-T008, `app/(app)/instrutores/page.tsx`)** — artefatos
  completamente diferentes (documento externo vs. código).
- **T014 e T015 (Polish)** podem rodar em paralelo entre si.
- T002/T003 e T006/T007 tocam o mesmo arquivo em regiões diferentes (linhas 1281-1285 vs. 49-50) —
  não marcados `[P]` entre si por prudência, mesmo padrão da spec 023.

---

## Parallel Example: Depois do Setup

```bash
Task: "T002/T003 [US1] Corrigir titulo + cabecalho em renderizarModalFichaInstrutor_"
Task: "T006/T007 [US2] Renomear botao + trocar onclick de Imprimir"
Task: "T010 [US3] Backup do Template antes de editar"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

US1 e US2 (ambas P1) juntas corrigem os 2 problemas mais visíveis (título incompleto, impressão
ainda quebrada dentro do modal) — podem ser implantadas e validadas isoladamente antes de US3.

### Incremental Delivery

1. Setup → baseline confirmado (301 testes).
2. US1 → título e cabeçalho corretos → verificação manual.
3. US2 → "Imprimir" abre PDF sem página em branco, DSA sem regressão → verificação manual.
4. US3 → Template com as 34 tags completas → verificação manual.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = artefatos diferentes, sem dependência real.
- Nenhuma tarefa desta spec toca schema/dado persistido (FR-008) — zero migração, zero `.ts`
  tocado.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
