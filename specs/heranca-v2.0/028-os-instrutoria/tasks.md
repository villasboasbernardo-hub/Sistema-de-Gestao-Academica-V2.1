---

description: "Task list for Módulo Gerador de O.S. de Instrutoria (Lógica, Agrupamento e Validação)"
---

# Tasks: Módulo Gerador de O.S. de Instrutoria (Lógica, Agrupamento e Validação)

**Input**: Design documents from `/specs/028-os-instrutoria/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos para as funções puras/de agrupamento novas (`semestreParaIntervalo_`,
`calcularOsInstrutoria`) — mesmo padrão desta sessão desde a spec 014, cobrindo toda função de
agregação/ordenação nova em `tests/unidade/regras_de_negocio_backend.test.ts`.

**Organization**: 1 User Story só (P1) — o pedido original delimita um único fluxo coeso (filtrar →
calcular → exibir). Sem fase de Setup: nenhuma migração, nenhuma chave de `config_parametros`, nenhum
schema novo (FR-013) — o trabalho começa direto na Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (único)

## Path Conventions

Single project Next.js: `, `, `tests/` — conforme `plan.md` §
Project Structure.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura mínima compartilhada — o novo módulo isolado e sua aritmética de
semestre, únicas peças que não pertencem só ao fluxo de US1.

**⚠️ CRITICAL**: US1 não começa antes desta fase.

- [X] T001 [P] Criar `lib/acoes/os-instrutoria.ts` com `semestreParaIntervalo_(ano, semestre)`
  (função pura, contrato `backend-functions.md`) — reaproveita `trimestreParaIntervalo_`/
  `intervalosSeInterceptam_` de `lib/acoes/liq.ts` (spec 027, mesmo escopo global Next.js,
  sem duplicar)
- [X] T002 [P] Testes unitários de `semestreParaIntervalo_` em
  `tests/unidade/regras_de_negocio_backend.test.ts` (casos: 1º/2º semestre de um ano, limites exatos
  01/01-30/06 e 01/07-31/12)

**Checkpoint**: Aritmética de semestre pronta e testada; `lib/acoes/os-instrutoria.ts` existe como arquivo.
US1 pode começar.

---

## Phase 2: User Story 1 — Gerar minuta de O.S. de Instrutoria para conferência (Priority: P1)

**Goal**: Botão "Gerar O.S. de Instrutoria" no módulo de Instrutores abre uma tela que filtra por
curso ou por trimestre/semestre, calcula o agrupamento por instrutor (backend) e renderiza a tabela
de validação com `rowspan`, batendo exatamente com os dados reais de
`registros_aula`.

**Independent Test**: Executar `quickstart.md` Passos 1-3 — modo Curso com curso real (CAHO),
modo Período (1º trimestre 2026 vs. 1º semestre 2026, confirmando que o semestre é superconjunto do
trimestre), e caso vazio (curso/período sem aula real).

### Testes para User Story 1 ⚠️

> Escrever antes da implementação de `calcularOsInstrutoria`, confirmar que falham antes de T005.

- [X] T003 [P] [US1] Testes unitários de `calcularOsInstrutoria(filtros)` em
  `tests/unidade/regras_de_negocio_backend.test.ts` — cenários: (a) modo Curso agrupa só disciplinas do
  `ID_Curso` filtrado; (b) modo Período filtra pela `Data` do registro dentro do intervalo, não
  pela interseção do período da turma (research.md § 2 — turma que atravessa 2 trimestres só conta
  as aulas cuja `Data` cai no trimestre escolhido); (c) instrutor com múltiplas disciplinas produz
  múltiplas entradas em `disciplinas` sob o mesmo nó; (d) `Capacitacao_Didatica` vazia/só espaços
  vira `"NÃO"`, não-vazia vira `"SIM"`; (e) `inicio`/`termino` são mín/máx de `Data` por par
  instrutor+disciplina; (f) instrutor sem nenhuma aula no recorte nunca aparece (FR-008); (g) array
  de saída ordenado por `Antiguidade_Declarada` ascendente (FR-009.1, RN-ANT-01); (h) turma
  `Cancelada` excluída dos 2 modos; (i) `ID_Instrutor` sem correspondência em `instrutores` é
  descartado sem lançar exceção (RN-DEG-01)

### Implementação da User Story 1

- [X] T004 [P] [US1] Implementar `montarNoInstrutorOs_(instrutor, disciplinasAgrupadas)` em
  `lib/acoes/os-instrutoria.ts` — monta 1 nó de saída, incluindo a conversão `Capacitacao_
  Didatica` → `"SIM"`/`"NÃO"` (contrato `backend-functions.md`)
- [X] T005 [US1] Implementar `calcularOsInstrutoria(filtros)` em `lib/acoes/os-instrutoria.ts` —
  lê `registros_aula`/`instrutores`/`disciplinas`/`turmas` uma única vez
  cada, filtra por modalidade (Curso via `ID_Curso`; Período via `Data` do registro dentro do
  intervalo de `trimestreParaIntervalo_`/`semestreParaIntervalo_`), exclui turma `Cancelada`,
  agrupa por instrutor→disciplina (mín/máx `Data`), monta os nós via T004, ordena por
  `Antiguidade_Declarada` ascendente, retorna array (pode ser vazio) (depends on T001, T003, T004)
- [X] T006 [P] [US1] Adicionar botão "Gerar O.S. de Instrutoria" à barra de ações de
  `painelPrincipalInstrutores` em `app/(app)/instrutores/page.tsx`, ao lado de "Cadastrar Novo
  Instrutor"/"Estatísticas"/"LIQ" (contrato `frontend-functions.md`)
- [X] T007 [US1] Implementar painel `id="view-os-instrutoria"` +
  `abrirPainelOsInstrutoria_()`/`fecharPainelOsInstrutoria_()`/`renderizarFormularioOsInstrutoria_()`
  em `app/(app)/instrutores/page.tsx` — alterna com `painelPrincipalInstrutores` via
  `style.display`, mesmo mecanismo de `alternarPainelLiq_`/`painelFichaInstrutor` (depends on T006)
- [X] T008 [US1] Implementar `atualizarControlesRecorteOs_()` em
  `app/(app)/instrutores/page.tsx` — modalidade "Curso" mostra `<select>` de `ID_Curso` (todo
  curso, qualquer classificação); modalidade "Período" mostra Ano + Trimestre/Semestre + número do
  recorte (depends on T007)
- [X] T009 [US1] Implementar `calcularOsInstrutoriaClick_()` em `app/(app)/instrutores/page.tsx`
  — monta `filtros` dos controles visíveis, chama `gs('calcularOsInstrutoria', filtros)`, `alert()`
  no erro (depends on T005, T008)
- [X] T010 [US1] Implementar `renderizarTabelaOsInstrutoria_(nosInstrutor)` em
  `app/(app)/instrutores/page.tsx` — tabela com `rowspan` nas 4 primeiras colunas por instrutor
  (FR-010), mensagem informativa quando `nosInstrutor.length === 0` (Edge Case de spec.md)
  (depends on T009)

**Checkpoint**: User Story 1 completa — único fluxo deste épico, testável fim-a-fim via
`quickstart.md`.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Deploy bookkeeping e validação final.

- [X] T011 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `lib/acoes/os-instrutoria.ts` (backend)
  e para a mudança em `app/(app)/instrutores/page.tsx` (frontend)
- [X] T012 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  — `2026-08-20.OSINST.1`
- [X] T013 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 028
- [ ] T014 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado (modo Curso,
  modo Período com comparação trimestre/semestre, caso vazio) — ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)`
  concluído em 2026-08-20 (deployment `@50`); falta apenas a validação manual no navegador.
- [X] T015 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-005 da spec) —
  342/342 passando, 0 regressão.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências — pode iniciar imediatamente (T001/T002 em paralelo)
- **User Story 1 (Phase 2)**: depende de T001 (aritmética de semestre) e T003 (testes escritos
  antes de T005, TDD)
- **Polish (Phase 3)**: depende de US1 completa

### Within User Story 1

- T003 (teste) → T004/T005 (T004 antes de T005, já que T005 chama `montarNoInstrutorOs_`) → T006
  (paralelo a T004/T005, arquivo distinto) → T007 → T008 → T009 → T010

### Parallel Opportunities

- T001 e T002 (Foundational)
- T004 e T006 (arquivos/funções distintas — `lib/acoes/os-instrutoria.ts` vs. `app/(app)/instrutores/page.tsx`)
- T011 (Polish, arquivo de documentação distinto dos demais)

---

## Parallel Example: Foundational

```bash
Task: "Criar `lib/acoes/os-instrutoria.ts` com semestreParaIntervalo_"
Task: "Testes unitários de semestreParaIntervalo_"
```

---

## Implementation Strategy

### MVP = User Story 1 completa (única história)

1. Completar Phase 1 (Foundational)
2. Completar Phase 2 (US1) — entrega o épico inteiro, já que há só 1 história
3. **PARAR e VALIDAR**: `quickstart.md` Passos 1-3
4. Phase 3 (Polish) — deploy bookkeeping

---

## Notes

- Nenhuma tarefa desta lista escreve em PostgreSQL/Supabase Storage/Docs — leitura pura (FR-012/013).
- Commit após Foundational + US1 completos, seguindo o ritmo já estabelecido nesta sessão (commit
  após `/speckit-implement` + deploy, não por task individual).
