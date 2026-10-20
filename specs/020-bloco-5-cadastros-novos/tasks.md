# Tasks: Bloco 5 — cadastros novos

## Phase 1: Setup

- [X] T001 Linha de base da `main` `a238f43` (CI e esquema) em `specs/020-bloco-5-cadastros-novos/progresso-implement.md`

## Phase 2: Domínio (vistos falhar antes)

- [X] T002 [P] `lib/dominio/capacitacao-didatica.ts` + `tests/unidade/capacitacao-didatica.test.ts` (conversão, "tem
  capacitação", ordem da lista)
- [X] T003 [P] `lib/formato/moeda.ts` + `tests/unidade/moeda.test.ts` (ler "12.345,67", escrever "R$ 12.345,67")
- [X] T004 [P] `lib/dominio/acessos-de-conta.ts` + `tests/unidade/acessos-de-conta.test.ts` (quem mais acessou, recentes)
- [X] T005 [P] `lib/dominio/curriculo-em-pdf.ts` + teste (o caminho, o limite, só PDF)

## Phase 3: Banco

- [X] T006 M1 `…_cursos_estrangeiros_custo_e_curriculo.sql` (contracts/banco.md)
- [X] T007 M2 `…_capacitacao_didatica_em_lista.sql`, com `app.converter_capacitacoes_didaticas()` e `vw_instrutores`
- [X] T008 M3 `…_acessos_de_conta.sql`
- [X] T009 `pnpm db:tipos`; pgTAP `supabase/tests/143_bloco_5.sql`; RLS `tests/invariantes/rls/bloco-5.test.ts`

## Phase 4: US1 — estrangeiros e custo

- [X] T010 [US1] `lib/validacao/curso.ts` (edição), `FormularioDeCurso.tsx`, `editar/page.tsx`, `AbaSobre.tsx`
- [X] T011 [US1] filtro `estrangeiros`: `contrato.ts`, `FiltrosDoCatalogo.tsx`, `consulta.ts`, documento 25 (§1.3)

## Phase 5: US2 — currículo em PDF

- [X] T012 [US2] `editar/EnvioDoCurriculo.tsx`, `registrarCurriculo` em `lib/acoes/curso.ts`, `curriculo/route.ts`,
  o link em `AbaSobre.tsx`; a guarda `ci-sobe-o-que-a-suite-usa`

## Phase 6: US3 — capacitação

- [X] T013 [US3] validação, formulário, ficha (aviso), lista (filtro), indicadores, gráficos, avisos e alerta pela lista

## Phase 7: US4 — acessos

- [X] T014 [US4] `registrar_acesso` em `lib/acoes/sessao.ts`; coluna e quadro em `/admin/usuarios`

## Phase 8: US5 — `PEND-019-3`

- [X] T015 [US5] `panorama-de-teste.ts` e `ta-fora-do-dsa.spec.ts` no ano de hoje; `dsa-ver.spec.ts` Q-13 pela caixa de ano

## Phase 9: Ponta a ponta, prova e entrega

- [X] T016 `tests/e2e/bloco-5.spec.ts` por clique (estrangeiros e custo, currículo, capacitação, acessos)
- [X] T017 Defeitos deliberados, em `progresso-implement.md`
- [ ] T018 `pnpm verificar` + pgTAP + RLS + ponta a ponta dos tocados; a suíte inteira no CI
- [ ] T019 Rito do remoto: backup, ensaio da conversão na cópia (`antes-depois.md`), dry-run só com M1–M3, `db push`,
  conferência só de leitura
- [ ] T020 Push, PR com o template inteiro e CI verde
- [ ] T021 `roteiro-de-conferencia.md`, pendências no plano de correções e a entrega — **sem merge**

## Dependencies

Phase 2 antes das telas; Phase 3 antes das US1–US4 (tipos); US5 independente.
