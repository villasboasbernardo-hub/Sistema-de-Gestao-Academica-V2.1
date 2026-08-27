---

description: "Task list template for feature implementation"
---

# Tasks: Épico A — Design System Unificado

**Input**: Design documents from `specs/007-design-system-unificado/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/ui-component-contract.md, quickstart.md
(sem data-model.md — nenhuma entidade de dados envolvida, épico puramente de frontend)

**Tests**: Só há uma peça de lógica não-trivial testável em Node — `formatarNomeInstrutor_`
(função pura, sem dependência do cliente Supabase). O resto desta spec é CSS/HTML/interação de UI,
validado por inspeção visual manual (quickstart.md) — sem saída numérica para testar
automaticamente, mesmo tratamento de qualquer mudança puramente visual nos épicos anteriores.

**Organization**: Tarefas agrupadas pelas 4 User Stories do spec.md, em ordem de prioridade
(US1/US2 = P1, US3/US4 = P2). US1 é o pré-requisito técnico de US2/US3 (as CSS Custom Properties
que ela cria são a base que os temas e os componentes reutilizáveis redefinem/consomem).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo com outras tarefas `[P]` da mesma fase (arquivos diferentes)
- **[Story]**: A qual User Story a tarefa pertence (US1..US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js, só frontend nesta spec: `app/**/page.tsx` e `components/**/*.tsx`,
`tests/unidade/*.test.ts`. Nenhum arquivo `.ts` é tocado.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e registrar a contagem atual de pass/fail/todo como
      baseline. **Baseline (2026-08-15): 132 tests, 131 pass, 0 fail, 1 todo.**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Nenhuma tarefa foundational nesta spec.** User Story 1 já cumpre esse papel — as CSS Custom
Properties que ela cria são a base técnica que User Story 2 (temas) e User Story 3 (componentes)
consomem, mas User Story 1 tem valor e teste independentes próprios (spec.md), por isso continua
listada como User Story, não como Foundational vazio de novo.

**Checkpoint**: Nenhum — pode-se seguir direto para a Phase 3.

---

## Phase 3: User Story 1 - Um único lugar define cor, tipografia e estado visual (Priority: P1) 🎯 MVP

**Goal**: objeto `UI` (CSS Custom Properties + espelho JS) como ponto único de cor semântica,
tipografia e espaçamento — as 5 cores de `badge-categoria` já existentes migradas para referenciá-lo
sem mudar nenhum valor real.

**Independent Test**: quickstart.md, passo 2 — adicionar uma cor de teste num único lugar e
confirmar propagação; confirmar que as 5 cores de `badge-categoria` continuam idênticas.

### Implementação da User Story 1

- [X] T002 [US1] Em `app/globals.css`: definir CSS Custom Properties em `:root`
      (`--cor-primaria`, `--cor-sucesso`, `--cor-atencao`, `--cor-critico`, `--cor-neutro`,
      `--fonte-principal`) com os valores já decididos em `03-design-system.md` §1/§2
      (contracts/ui-component-contract.md); fonte `Rawline` como dependência versionada no `package.json` com fallback `system-ui` se
      falhar (FR-003, spec Edge Cases).
- [X] T003 [US1] Em `app/globals.css`: migrar as 5 declarações de `badge-categoria-*`
      para referenciar `var(--cor-*)` em vez de hex literal — **sem mudar nenhum valor de cor
      real** (research.md achado 3, FR-006).
- [X] T004 [P] [US1] Em `components/ciaara/`: objeto `UI` (JS) com `UI.cor(nome)`, lendo via
      `getComputedStyle(document.documentElement)` — nunca hardcoded duas vezes (contracts/ui-component-contract.md).
- [X] T005 [US1] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 2 de `quickstart.md`. **132/131/0/1, idêntico ao baseline (esperado,
      backend intocado). Achado real corrigido antes de commitar: a primeira tentativa mapeou
      `.badge-categoria-TR` para `var(--cor-atencao)` (#ffc107), diferente do hex real
      (#fd7e14) — corrigido para manter o literal, junto com AEC/TAD (paleta categórica, não
      semântica). Paridade visual completa no navegador fica para o teste de aceite ao vivo.**

**Checkpoint**: objeto `UI` funcionando — MVP entregável (dev consegue adicionar cor semântica num
único lugar).

---

## Phase 4: User Story 2 - Trocar de tema sem perder nenhuma tela ou funcionalidade (Priority: P1)

**Goal**: dois temas redesenhados (claro/escuro) com detecção automática de
`prefers-color-scheme` no primeiro carregamento (RF-DS-03.1, Clarifications 2026-08-15), toggle
manual persistente, e sem "flash" de tema errado.

**Independent Test**: quickstart.md, passo 3 — primeiro acesso segue a preferência do SO; toggle
manual prevalece e persiste; contraste adequado nos dois temas em telas já existentes.

**Depende de**: User Story 1 (T002) — as variáveis que os temas redefinem.

### Implementação da User Story 2

- [X] T006 [US2] Em `app/globals.css`: bloco `[data-bs-theme="dark"]` redefinindo as
      mesmas variáveis de T002 com contraste corrigido (RF-DS-03). **Desvio deliberado da
      descrição original**: usa o atributo `data-bs-theme` **nativo do Tailwind CSS + shadcn/ui** (já pinado
      neste projeto), não um `[data-theme="escuro"]` customizado — Tailwind CSS já restiliza
      automaticamente seus próprios componentes (cards/tabelas/navbar/formulários) com contraste
      testado; reinventar isso manualmente seria exatamente o risco que causou "campos claros
      demais" no modo noturno da V1.0. Só os badges customizados (AEC/TAD/TR, fora do Tailwind CSS
      nativo) ganham override próprio.
- [X] T007 [US2] Em `app/layout.tsx` (`<head>`, script inline, antes do `<body>`
      renderizar): detecta `localStorage['tema']`; na ausência, usa `window.matchMedia
      ('(prefers-color-scheme: dark)').matches`; aplica `data-bs-theme` (`'dark'`/`'light'`) no
      `<html>` **antes de qualquer pintura visível** (research.md achado 1, SC-003 — nunca
      depender de `components/ciaara/`, incluído no fim do `<body>`).
- [X] T008 [US2] Em `components/ciaara/`: `alternarTema()` — inverte `data-bs-theme` atual,
      grava em `localStorage['tema']`; a partir daí prevalece sobre a detecção automática
      (Clarifications 2026-08-15).
- [X] T009 [P] [US2] Em `app/layout.tsx` (navbar): botão de toggle de tema, chamando
      `alternarTema()`.
- [X] T010 [US2] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 3 de `quickstart.md`. **132/131/0/1, idêntico ao baseline (esperado,
      backend intocado). Lógica do script anti-flash verificada isoladamente em Node (mock de
      `localStorage`/`matchMedia`). FOUC/contraste/persistência reais ficam para o teste de
      aceite no navegador.**

**Checkpoint**: temas funcionando em qualquer tela já existente, sem flash, com persistência
correta.

---

## Phase 5: User Story 3 - Componentes visuais duplicados viram um componente único (Priority: P2)

**Goal**: card de KPI, formatação de nome de instrutor (RF-INSTR-15) e estilo de grade semanal
(já construído em `app/(app)/cronograma/page.tsx`, Épico G) viram componentes únicos reutilizáveis.

**Independent Test**: quickstart.md, passo 4 — `app/(app)/instrutores/page.tsx` mostra o nome no formato
padronizado; `app/(app)/cronograma/page.tsx` continua funcionando exatamente como antes da extração.

**Depende de**: User Story 1 (T002) — os componentes referenciam as mesmas CSS Custom Properties.

### Implementação da User Story 3

- [X] T011 [US3] Em `components/ciaara/`: `formatarNomeInstrutor_(instrutor)` — função pura,
      monta `"{Posto_Graduacao} {Esp_Hab_Obs} <strong>{Nome_Guerra}</strong>"` (RF-INSTR-15),
      sem espaços duplos/`"undefined"` para campos vazios (research.md achado 5).
- [X] T012 [P] [US3] Criar `tests/unidade/design_system.test.ts`: testes de `formatarNomeInstrutor_`
      (todos os campos presentes; campos vazios/ausentes; negrito no nome de guerra).
- [X] T013 [US3] Em `app/(app)/instrutores/page.tsx`: migrar a exibição de nome de instrutor
      (hoje `Nome_Guerra` cru) para `formatarNomeInstrutor_` (FR-007).
- [X] T014 [P] [US3] Em `app/globals.css`: componente `.card-kpi` (número + ícone Font
      Awesome + rótulo, `03-design-system.md` §7) — sem consumidor obrigatório nesta spec, fica
      pronto para a próxima tela que precisar (RF-DS-04).
- [X] T015 [US3] Em `app/globals.css`: extrair o estilo de grade semanal já usado em
      `app/(app)/cronograma/page.tsx` (Épico G) para a classe reutilizável `.grade-semanal`.
- [X] T016 [US3] Em `app/(app)/cronograma/page.tsx`: aplicar `.grade-semanal` no lugar do estilo
      inline — **sem alterar nenhum comportamento** (constitution, Princípio VI; Épico G continua
      funcionando).
- [X] T017 [US3] Rodar `pnpm vitest run` e confirmar zero regressão (incluindo os
      testes novos de T012); validar manualmente o passo 4 de `quickstart.md`. **139 testes, 138
      passam, 0 falham, 1 todo (+7 desde User Story 2, os testes novos de `formatarNomeInstrutor_`).
      `.grade-semanal` reproduz o efeito visual de `table-sm table-bordered` via CSS proprio, não
      pixel-idêntico garantido — paridade visual real no navegador fica para o teste de aceite.**

**Checkpoint**: nome de instrutor padronizado em produção; grade semanal como componente
reutilizável, sem regressão no Cronograma.

---

## Phase 6: User Story 4 - Identidade institucional na navbar (Priority: P2)

**Goal**: navbar com título de exibição "Sistema de Gestão Acadêmica" + slot de brasão do CIAARA
que degrada graciosamente enquanto o asset real não for fornecido (RF-INI-05, research.md
achado 4).

**Independent Test**: quickstart.md, passo 5 — navbar mostra o título de exibição; slot de brasão
não quebra a tela na ausência do asset; nenhum item de menu existente para de funcionar.

### Implementação da User Story 4

- [X] T018 [US4] Em `app/layout.tsx` (navbar): trocar o texto "CIAARA-11 — Gestão
      Acadêmica" pelo título de exibição "Sistema de Gestão Acadêmica" (`03-design-system.md` §3)
      + `<img id="brasaoCiaara">`. **Ajuste em relação à descrição original**: sem `src`
      (`style="display:none"` por padrão) em vez de `src="" onerror="..."` — `src=""` dispara uma
      requisição para a própria página no navegador (quirk conhecido), nunca um "sem imagem"
      limpo. Comentário no HTML orienta Bernardo a preencher `src` quando o asset existir
      (research.md achado 4, RN-DEG-01).
- [X] T019 [US4] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 5 de `quickstart.md`. **139/138/0/1, idêntico ao checkpoint anterior.**

**Checkpoint**: todas as 4 User Stories completas e independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T020 [P] Rodar `pnpm vitest run` (suíte completa) uma última vez e confirmar zero
      regressão. **139 testes, 138 passam, 0 falham, 1 todo (RN-CONF-01, de outro épico) —
      idêntico do início ao fim do épico. `app/layout.tsx` revisado de ponta a ponta, sem erro de
      sintaxe visível.**
- [X] T021 Rodar `quickstart.md` do passo 1 ao 6 em sequência, como checagem final combinada de
      todas as User Stories antes do deploy via `o fluxo Git → Vercel`. **Lógica testável (formatação de nome,
      script anti-flash) verificada estaticamente. Paridade visual, contraste dos dois temas, e o
      slot de brasão ficam para o teste de aceite ao vivo — mesmo protocolo de todos os épicos
      anteriores desta sessão.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: vazia — nenhuma tarefa, nenhum bloqueio.
- **User Story 1 (Phase 3)**: depende só do Setup.
- **User Story 2 (Phase 4)**: depende de User Story 1 (T002 cria as variáveis que os temas
  redefinem em T006).
- **User Story 3 (Phase 5)**: depende de User Story 1 (T002) — mesma razão. Não depende de User
  Story 2.
- **User Story 4 (Phase 6)**: depende só do Setup — nenhuma dependência técnica de US1/US2/US3
  (é só HTML/navbar). **Ressalva de merge** (`/speckit-analyze`, achado M1, 2026-08-15): T018
  (US4) e T009 (US2) editam a **mesma navbar** de `app/layout.tsx` (T009 acrescenta o botão de toggle;
  T018 troca o texto da marca e acrescenta o slot de brasão) — não são "pontos diferentes" do
  arquivo. Rodar as duas em paralelo por pessoas/agentes diferentes arrisca conflito de merge real;
  sequenciar (uma completa antes da outra começar) ou coordenar explicitamente quem edita a navbar
  primeiro.
- **Polish (Phase 7)**: depende de todas as User Stories desejadas completas.

### Parallel Opportunities

- Dentro de US1: T004 (`components/ciaara/`) em paralelo com T002/T003 (`app/globals.css`) — arquivos
  diferentes.
- Dentro de US2: T009 (navbar) em paralelo com T006/T007 (CSS/`<head>`), desde que T002 (US1) já
  exista — mas não em paralelo com T018 (US4, ver ressalva acima).
- Dentro de US3: T012 (testes) em paralelo com T011 (mesma funcionalidade, arquivos diferentes);
  T014 (`.card-kpi`) em paralelo com T011/T015/T016 (sem consumidor nesta spec, isolado).
- **Entre User Stories**: User Story 3 (Phase 5) inteira pode rodar em paralelo com User Story 2
  (Phase 4) — nenhum arquivo em comum real (`components/ciaara/`/`app/(app)/instrutores/page.tsx`/
  `app/(app)/cronograma/page.tsx` vs. `app/globals.css`/`app/layout.tsx`). User Story 4 (Phase 6) só pode rodar em
  paralelo com a parte de US2 que **não** toca a navbar (T006-T008) — T018 e T009 devem ser
  sequenciados entre si, não paralelizados (achado M1).

---

## Parallel Example: User Story 1

```bash
Task: "CSS Custom Properties + badges migrados em `app/globals.css` (T002/T003)"
Task: "Objeto UI em `components/ciaara/` (T004)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup (T001).
2. User Story 1 (T002-T005) — objeto `UI` funcionando.
3. **PARAR E VALIDAR**: `quickstart.md` passo 2.
4. Deploy via `o fluxo Git → Vercel` se aprovado — já reduz risco de dessincronia de cor em módulos futuros,
   mesmo sem temas/componentes/navbar ainda.

### Entrega Incremental

1. Setup → User Story 1 (MVP: objeto `UI`) → validar → deploy/demo.
2. User Story 2 (temas claro/escuro) → validar → deploy/demo.
3. User Story 3 (componentes reutilizáveis) → validar → deploy/demo.
4. User Story 4 (identidade institucional) → validar → deploy final.
5. Polish (checagem combinada final).

---

## Notes

- `[P]` = arquivos diferentes, sem conflito de merge entre si.
- `[Story]` mapeia cada tarefa a uma User Story do spec.md para rastreabilidade.
- Nenhum arquivo de backend (`.ts`) nesta lista — confirmado no plan.md, primeiro épico puramente
  de frontend da sessão.
- **FR-008 (RF-DS-04) não tem tarefa própria** (`/speckit-analyze`, achado L1, 2026-08-15) — é uma
  diretriz para telas construídas *depois* deste épico ("toda nova tela... deve alcançar o mesmo
  padrão sem CSS específico"), satisfeita por precedente (T002-T017 estabelecem os componentes que
  tornam isso possível), não por uma entrega própria dentro desta lista.
- O asset real do brasão do CIAARA (User Story 4) precisa ser fornecido por Bernardo — nenhuma
  tarefa desta lista inclui gerar ou obter essa imagem (research.md achado 4). O slot fica pronto
  para recebê-lo; até lá, a navbar degrada para só texto.
- Rodar `pnpm vitest run` depois de cada fase concluída, não só nos checkpoints
  explicitamente listados.
- Commit por tarefa ou grupo lógico de tarefas da mesma User Story (constitution, Princípio VI);
  cada commit cita `RF-DS-0x`/`RF-INI-05`/`RF-INSTR-15` (constitution, Princípio VIII).
