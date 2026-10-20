# Tasks: Bloco 4 — a página de Início

**Input**: `spec.md`, `plan.md`, `research.md`, `contracts/telas.md`, `quickstart.md` desta pasta.
**Tests**: pedidos (teste visto falhar antes; e2e por clique e teclado). `pnpm db:reset:limpo` antes da ponta a ponta.

## Phase 1: Setup

- [X] T001 Linha de base: unidade sobre a `main` de partida, registrada em `specs/019-bloco-4-inicio/progresso-implement.md`

## Phase 2: Foundational — o domínio e o componente

- [X] T002 [P] Escrever primeiro, vendo falhar: `tests/unidade/carrossel.test.ts` e `lib/dominio/carrossel.ts`
- [X] T003 [P] Escrever primeiro, vendo falhar: `tests/unidade/dsa-da-semana.test.ts` e `lib/dominio/dsa-da-semana.ts`
- [X] T004 [P] Escrever primeiro, vendo falhar: `tests/unidade/submenu-da-lateral.test.ts` e `lib/dominio/submenu-da-lateral.ts`
- [X] T005 `components/ciaara/carrossel.tsx` (folha de cliente) e a sua entrada nas guardas de fronteira

## Phase 3: User Story 1 — o Início do ano (P1)

- [X] T006 [US1] `ano` no contrato de `/inicio` (`lib/navegacao/contrato.ts`) e o teste do contrato
- [X] T007 [US1] `app/(app)/inicio/page.tsx` e `panorama.ts`: o panorama do ano (`anoDoPainel`), o seletor — o `AnoDoPainel` de `/turmas`, generalizado com `rota`

## Phase 4: User Story 2 — o carrossel das turmas (P1)

- [X] T008 [US2] `app/(app)/inicio/CartaoDaTurma.tsx` com `BarraDeProgresso`, e o carrossel no Início

## Phase 5: User Story 3 — os DSA da semana (P1)

- [X] T009 [US3] A leitura da ocupação da semana e `app/(app)/inicio/ManchetesDoDsa.tsx`

## Phase 6: User Story 4 — o submenu (P2)

- [X] T010 [US4] A árvore no `app/(app)/layout.tsx`, `CascaDoApp` e `NavegacaoLateral` por propriedade
- [X] T011 [US4] `components/casca/submenu-da-lateral.tsx` (folha) e a largura em `painel-retratil.tsx` com `data-subentrada`
- [X] T012 [US4] Revalidar o layout nas cinco ações (`lib/acoes/curso.ts`, `lib/acoes/turma.ts`) (C-16)

## Phase 7: Ponta a ponta

- [X] T013 `tests/e2e/inicio-bloco-4.spec.ts` (o ano, os dois carrosséis e o submenu, num arquivo só, com uma amostra), e os arquivos do Início
  e da lateral que mudarem

## Phase 8: Polish, prova e entrega

- [X] T014 Defeitos deliberados, em `progresso-implement.md`
- [X] T015 `pnpm verificar` + pgTAP + RLS; a ponta a ponta no CI se a memória da máquina não deixar
- [X] T016 Push, PR com o template inteiro e CI verde (PR #77, CI verde sobre `eaa2793`)
- [X] T017 `roteiro-de-conferencia.md`, pendências no plano de correções e a entrega — **sem merge**

## Phase 9: Ajustes da conferência de 20/10/2026 (A-1 a A-5, no mesmo PR)

- [X] T018 Testes vistos falhar: `tests/unidade/ano-pelo-relogio.test.ts` (relógio em 31/12/2026 e 01/01/2027),
  `submenu-da-lateral.test.ts` (lista plana do ano) e `ano-sem-numero-fixo.test.ts`; e2e em `inicio-bloco-4.spec.ts`,
  `cards-levam-a-aba.spec.ts` (caso 3) e `turmas-painel.spec.ts` — 9 casos vermelhos contra o código anterior
- [X] T019 A-1: `AnoDoPainel` como caixa de seleção no cabeçalho do Início e de Turmas; *Ano* no filtro de Turmas
- [X] T020 A-2 e A-3: `lib/dominio/cartoes-do-inicio.ts`, cartão maior com o título só da turma, a frase sem turma ativa
- [X] T021 A-4: o cartão leva à ficha (`enderecoDaTurma`); `inicio.spec.ts` (FR-031.2 e FR-017.6) acompanha
- [X] T022 A-5: `arvoreDeTurmas(turmas, ano, …)` plana, `compararCodigoDeTurma`, o layout lendo só o ano de hoje
- [X] T023 Defeitos deliberados dos ajustes, `pnpm verificar`, ponta a ponta, CI, merge e encerramento

## Dependencies

Phase 2 antes das histórias; US1 antes de US2 e US3 (o Início do ano); US4 independente.
