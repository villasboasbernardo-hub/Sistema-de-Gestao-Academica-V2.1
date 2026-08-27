---

description: "Task list for Seleção de Instrutor por Turma e Validação de Janela em turma_disciplina"
---

# Tasks: Seleção de Instrutor por Turma e Validação de Janela em `turma_disciplina`

**Input**: Design documents from `/specs/029-turma-disciplina-instrutor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos para `intervaloContidoEm_`/`atualizarTurmaDisciplina` — mesmo padrão desta
sessão desde a spec 014.

**Organization**: 2 User Stories (ambas P1), fortemente acopladas — o mesmo botão "Salvar" de uma
única linha do painel de período aciona os 2 comportamentos (seleção de instrutor + validação de
janela). O backend compartilhado (`atualizarTurmaDisciplina`) fica na Foundational, já que nenhuma
das 2 histórias o "possui" sozinha; cada história fica só com a peça de frontend que define seu
comportamento visível.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (seleção de instrutor) ou US2 (bloqueio de janela)

## Path Conventions

Single project Next.js: `, `, `tests/`, `migracao/` — conforme
`plan.md` § Project Structure.

---

## Phase 1: Setup

- [X] T001a Escrever `migracao/adicionar_instrutor_turma_disciplina.py` — **NOVO** (achado de
  `/speckit-analyze`, C1: diferente da spec 027, este script ainda não existe), seguindo
  exatamente o padrão já descrito em `research.md` § 4 (mesma lógica de `remover_instrutor_
  completo_adicionar_estado.py` — adicionar 1 coluna — combinada com `criar_turma_disciplina.py` —
  iterar linhas de `turma_disciplina`, resolver `ID_Grade` → `disciplinas.ID_Instrutor`,
  escrever por linha), idempotente (no-op se a coluna já existir), `fazer_backup`/`gravar_log`
- [X] T001b Aplicar `migracao/adicionar_instrutor_turma_disciplina.py` (T001a) à banco de produção —
  coluna `ID_Instrutor` em `turma_disciplina`, semeada de `disciplinas.ID_Instrutor` por
  `ID_Grade`, com backup prévio e registro em `migracao_log` (FR-001/FR-002) (depends on T001a).
  Aplicado 2026-08-20: **divergência real detectada e resolvida** — o script local (xlsx de
  trabalho) produziu 85 semeadas/125 em branco, mas os dados já na banco de produção davam 89/121
  (4 disciplinas com `disciplinas.ID_Instrutor` preenchido ao vivo que o xlsx local não tinha).
  Por decisão do usuário, a banco de produção foi tratada como fonte de verdade — semeadura aplicada
  com 89 semeadas/121 em branco, `migracao_log` `LOG-000719` a `LOG-000928`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend compartilhado pelas 2 histórias — nenhuma delas o possui sozinha.

**⚠️ CRITICAL**: Nenhuma User Story começa antes desta fase.

- [X] T002 [P] Implementar `intervaloContidoEm_(inicioA, fimA, inicioB, fimB)` em
  `lib/acoes/liq.ts` (função pura, contenção total — não interseção, contrato
  `backend-functions.md`)
- [X] T003 [P] Testes unitários de `intervaloContidoEm_` em `tests/regras_de_negocio_backend.
  test.js` (contido/não-contido/parcialmente sobreposto mas não contido/janela ausente degrada
  para `true`/período interno ausente degrada para `true`)
- [X] T004 Testes unitários de `atualizarTurmaDisciplina` em `tests/regras_de_negocio_backend.
  test.js` — cenários: (a) grava `ID_Instrutor` corretamente sem mexer em `Previsao_Inicio`/
  `Termino`; (b) bloqueia quando o período efetivo pós-alteração fica fora da janela da turma,
  mensagem cita os limites reais; (c) aceita quando dentro da janela; (d) degrada (aceita) quando a
  turma não tem `Data_Inicio`/`Data_Termino`; (e) valida o período **efetivo** (mistura do valor já
  gravado com o que está em `alteracoes`), não só o que veio em `alteracoes`; (f)
  `ID_turma_disciplina` inexistente lança erro claro (escrever antes de T005)
- [X] T005 Implementar `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes)` em
  `lib/acoes/liq.ts` — lê a linha atual, resolve a turma, calcula período efetivo, valida via
  `intervaloContidoEm_`, grava via `crudAtualizar` se passar (contrato `backend-functions.md`)
  (depends on T002, T004)

**Checkpoint**: Backend completo e testado. US1 e US2 podem começar (cada uma só com a peça de
frontend que falta).

---

## Phase 3: User Story 1 — Selecionar o instrutor responsável por cada disciplina, por turma (Priority: P1)

**Goal**: O painel "Período das Disciplinas" mostra, por linha, checkboxes dos instrutores
habilitados para aquela disciplina, permitindo selecionar quem efetivamente ministra naquela turma
específica.

**Independent Test**: `quickstart.md` Passo 1 — curso com 2 turmas no mesmo ano, seleção de
instrutores diferentes em cada turma, confirmando persistência independente por turma.

### Implementação da User Story 1

- [X] T006 [US1] Estender `abrirPainelPeriodoTurma_(idCurso)` em `app/(app)/cursos/[curso]/page.tsx`
  para também carregar `crudListar('instrutor_disciplina')` (filtrado `Status='Ativo'`) e
  `crudListar('instrutores')`, além de `turma_disciplina` já carregada (spec 027)
- [X] T007 [US1] Estender `renderizarPainelPeriodoTurma_(...)` em `app/(app)/cursos/[curso]/page.tsx`
  com checkboxes de instrutor habilitado por linha de disciplina (rotulado `Posto_Graduacao +
  Nome_Completo`, sem `formatarNomeInstrutor_`), pré-marcados conforme `linha.ID_Instrutor`;
  mensagem informativa quando a disciplina não tem nenhum instrutor habilitado (FR-009) (depends
  on T006)

**Checkpoint**: Checkboxes visíveis e pré-marcados corretamente — falta só o botão "Salvar" gravar
(US2).

---

## Phase 4: User Story 2 — Bloquear período de disciplina fora da janela da turma (Priority: P1)

**Goal**: O botão "Salvar" do painel grava período + instrutor selecionado numa única operação
validada, bloqueando quando o período sair da janela real da turma.

**Independent Test**: `quickstart.md` Passo 2 — tentar salvar um período fora da janela da turma,
confirmar bloqueio com mensagem citando os limites reais; corrigir e confirmar que aceita.

### Implementação da User Story 2

- [X] T008 [US2] Estender `salvarPeriodoTurmaClick_(idTurmaDisciplina)` em `app/
  `app/(app)/cursos/[curso]/page.tsx`` — coleta os checkboxes marcados (US1, T007) em `ID_Instrutor` (CSV), chama
  `gs('atualizarTurmaDisciplina', idTurmaDisciplina, { Previsao_Inicio, Previsao_Termino,
  ID_Instrutor })` no lugar do `crudAtualizar` direto (spec 027), `alert(erro.message)` no erro —
  inclui agora o caso de bloqueio de janela (depends on T005, T007)

**Checkpoint**: Fluxo completo — checkbox de instrutor (US1) + validação de janela (US2) no mesmo
clique de "Salvar".

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `lib/acoes/liq.ts` e
  `app/(app)/cursos/[curso]/page.tsx`
- [X] T010 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
- [X] T011 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 029
- [ ] T012 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado — `o fluxo Git → Vercel
  push`/`o merge na `main` (a Vercel publica em produção)` concluído em 2026-08-20 (deployment `@51`); migração já aplicada (T001b);
  falta apenas a validação manual no navegador.
- [X] T013 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-005 da spec) —
  354/354 passando, 0 regressão.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: sem dependências de Setup (T002-T004 não dependem da coluna já
  existir na banco de produção — só de testes/lógica); T005 pode ser implementado e testado com
  o cliente Supabase mockado independente de T001a/T001b já terem rodado
- **US1 (Phase 3)**: depende de Foundational completa (T002-T005) só indiretamente — T006/T007 não
  chamam `atualizarTurmaDisciplina` diretamente, só preparam os dados/checkboxes
- **US2 (Phase 4)**: depende de T005 (Foundational) e T007 (US1) — é o único ponto onde as 2
  histórias se encontram (o mesmo clique de "Salvar")
- **Polish (Phase 5)**: depende de US1 e US2 completas

### Within Foundational

T002/T003 (paralelos) → T004 (teste, antes de T005) → T005

### Parallel Opportunities

- T002 e T003 (Foundational)
- T006 pode começar em paralelo com T002-T005 (arquivo `app/(app)/cursos/[curso]/page.tsx`, distinto de `lib/acoes/liq.ts`)
- T009 (Polish, arquivo de documentação distinto)

---

## Parallel Example: Foundational

```bash
Task: "Implementar intervaloContidoEm_ em `lib/acoes/liq.ts`"
Task: "Testes unitários de intervaloContidoEm_"
```

---

## Implementation Strategy

### MVP = as 2 histórias juntas (não são divisíveis em MVP parcial)

Diferente de specs anteriores, US1 sozinha (checkboxes visíveis mas sem gravação validada) não
entrega valor real sem US2 (o "Salvar" que efetivamente grava). Completar Foundational + US1 + US2
juntas é o menor incremento útil.

1. Completar Phase 1 (Setup) + Phase 2 (Foundational)
2. Completar Phase 3 (US1) + Phase 4 (US2) — nesta ordem, já que US2 depende de US1 (T007)
3. **PARAR e VALIDAR**: `quickstart.md` Passos 1-3
4. Phase 5 (Polish)

---

## Notes

- Nenhuma tarefa desta lista toca `cursos`, `turmas`, `disciplinas` ou
  `instrutor_disciplina` (FR-007/FR-010) — só leitura delas.
- Commit após Foundational + US1 + US2 completos, seguindo o ritmo já estabelecido nesta sessão.
