---

description: "Task list for Épico — Automação da Lista de Instrutores Qualificados (LIQ)"
---

# Tasks: Épico — Automação da Lista de Instrutores Qualificados (LIQ)

**Input**: Design documents from `/specs/027-liq-automacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
contracts/frontend-functions.md, quickstart.md

**Tests**: incluídos para as funções puras/de validação novas (`trimestreParaIntervalo_`,
`intervalosSeInterceptam_`, `validarLiq_`) — a spec exige explicitamente "Suíte `pnpm vitest run
tests/unidade/*.test.ts` sem regressão" como critério de aceite, e o padrão desta sessão desde a spec 014 é
cobrir toda regra de bloqueio nova em `tests/unidade/regras_de_negocio_backend.test.ts`.

**Organization**: Tasks agrupadas por User Story (ambas P1) para entrega/teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (período por turma) ou US2 (geração da LIQ)

## Path Conventions

Single project Next.js: `, `, `tests/`, `migracao/`, `docs/` —
conforme `plan.md` § Project Structure.

---

## Phase 1: Setup

**Purpose**: Aplicar o pré-requisito de dados (migração) e a configuração do Template — nada de
código de aplicação ainda.

- [X] T001 Aplicar `migracao/criar_turma_disciplina.py` à banco de produção, com backup prévio
  (`fazer_backup()`) e registro em `migracao_log` (`gravar_log()`), mesmo protocolo do commit
  `0af2d44` (FR-001). Aplicado 2026-08-20: 210 linhas (89 herdadas/121 em branco, batendo com a
  execução local), `migracao_log` LOG-000508 a LOG-000717. Também aplicada nesta mesma sessão de
  escrita a migração pendente da spec 025 (`remover_instrutor_completo_adicionar_estado.py`), que
  nunca tinha sido aplicada à banco de produção apesar de já estar em produção no código deployado —
  bug real corrigido por decisão explícita do usuário, fora do escopo original desta task mas
  autorizado (`LOG-000506`/`LOG-000507`).
- [X] T002 [P] Adicionar a chave `ID_TEMPLATE_LIQ` = `1XECilVycWL63dPCxXj_LUkIdbglOoAFnBsyqbltaq5w`
  em `config_parametros` (FR-013). Aplicado 2026-08-20, `config_parametros!A20`, `migracao_log`
  `LOG-000718`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura mínima compartilhada por US1 e US2.

**⚠️ CRITICAL**: Nenhuma User Story começa antes desta fase.

- [X] T003 Adicionar entrada `CRUD_CONFIG['turma_disciplina']` em `lib/acoes/crud.ts`, mesmo
  perfil de leitura/escrita de `disciplinas`, sem `COLUNAS_FORMULA` (contrato
  `backend-functions.md` § Alterações em `lib/acoes/crud.ts`)
- [X] T004 [P] Criar `lib/acoes/liq.ts` com `trimestreParaIntervalo_(ano, trimestre)` e
  `intervalosSeInterceptam_(inicioA, fimA, inicioB, fimB)` (funções puras, contrato
  `backend-functions.md`)
- [X] T005 [P] Implementar `pastaLiqInstrutores_()` em `lib/acoes/liq.ts`, espelhando
  `pastaFichasInstrutores_()` de `lib/acoes/instrutores.ts` (research.md § 7)
- [X] T006 [P] Testes unitários de `trimestreParaIntervalo_`/`intervalosSeInterceptam_` em
  `tests/unidade/regras_de_negocio_backend.test.ts` (casos: trimestre dentro do ano, turma atravessando 2
  trimestres — ex. `C-Esp-ALH` 07/09 a 04/12, achado 3 da spec)

**Checkpoint**: `turma_disciplina` acessível via CRUD genérico; aritmética de trimestre pronta e
testada; pasta de destino da LIQ pronta. US1 e US2 podem começar.

---

## Phase 3: User Story 1 — Registrar o período de cada disciplina por turma (Priority: P1)

**Goal**: O operador consegue ver e preencher `Previsao_Inicio`/`Previsao_Termino` por
turma+disciplina a partir da Página do Curso.

**Independent Test**: Abrir uma turma na Página do Curso, clicar em "Período das Disciplinas",
preencher as 2 datas de uma disciplina, salvar, recarregar a página e confirmar que o valor
persistiu (via nova leitura do painel).

### Implementação da User Story 1

- [X] T007 [US1] Adicionar botão "Período das Disciplinas" ao card de turma expandido em
  `app/(app)/cursos/[curso]/page.tsx` (contrato `frontend-functions.md` § `app/(app)/cursos/[curso]/page.tsx`)
- [X] T008 [US1] Implementar `abrirPainelPeriodoTurma_(idTurma)` em `app/(app)/cursos/[curso]/page.tsx` —
  `crudListar('turma_disciplina')` + filtro client-side por `ID_Turma` (depends on T003)
- [X] T009 [US1] Implementar `renderizarPainelPeriodoTurma_(linhas)` em
  `app/(app)/cursos/[curso]/page.tsx` — 1 linha por disciplina da turma, 2 `<input type="date">`, badge de
  `Origem_Periodo` (`Herdado da grade` / `Não informado`) (depends on T008)
- [X] T010 [US1] Implementar `salvarPeriodoTurmaClick_(idTurmaDisciplina)` em
  `app/(app)/cursos/[curso]/page.tsx` — `crudAtualizar('turma_disciplina', ...)`, atualiza o badge no
  sucesso, `alert()` no erro (depends on T009, T003)

**Checkpoint**: User Story 1 funcional e testável isoladamente — os 121 períodos em branco da
migração (T001) podem ser preenchidos pelo operador.

---

## Phase 4: User Story 2 — Gerar a minuta trimestral da LIQ, bloqueada quando os dados estão incompletos (Priority: P1)

**Goal**: Botão "LIQ" no módulo de Instrutores gera a minuta em a rota de impressão `/print/*` quando os dados estão
íntegros, e bloqueia com a lista completa de problemas quando não estão (FR-004 a FR-011).

**Independent Test**: Executar `quickstart.md` Passo 1 (3º trimestre 2026 na base atual — deve
bloquear com as mensagens nominais de períodos/instrutores faltantes) e, após corrigir os
apontamentos (via US1 e a tela de atribuição de disciplinas já existente), Passo 3 (deve gerar o
documento com as 2 tabelas preenchidas e vigência `01/07/2026 a 30/09/2026`).

### Testes para User Story 2 ⚠️

> Escrever antes da implementação de `validarLiq_`, confirmar que falham antes de T012.

- [X] T011 [P] [US2] Testes unitários de `validarLiq_(ano, trimestre)` em
  `tests/unidade/regras_de_negocio_backend.test.ts` — cenário de bloqueio por período faltante (FR-004),
  cenário de bloqueio por instrutor faltante (FR-005), cenário sem bloqueio, e confirmação de que
  **todos** os problemas retornam de uma vez (não para no primeiro) — usar o formato de dados real
  descrito no achado 3 da spec (o cliente Supabase mockado, mesmo harness de
  `tests/unidade/regras_de_negocio_backend.test.ts`)

### Implementação da User Story 2

- [X] T012 [US2] Implementar `validarLiq_(ano, trimestre)` em `lib/acoes/liq.ts` — lê
  `turmas`, `turma_disciplina`, `instrutor_disciplina`, `disciplinas` uma única vez cada;
  retorna `{podeGerar, problemas}` (depends on T004, T011)
- [X] T013 [P] [US2] Implementar `montarDadosSecao1Liq_()` em `lib/acoes/liq.ts` — instrutores
  `Status='Ativo'` com ≥1 vínculo ativo, ordenados diretamente pela coluna já persistida
  `Antiguidade_Declarada` de `instrutores` (`.sort((a,b) => a.Antiguidade_Declarada -
  b.Antiguidade_Declarada)` — **não** `ordenarInstrutoresPorAntiguidade_`/`ordenarPorAntiguidadePosto_`,
  ver research.md § 6, correção de `/speckit-analyze`), carga horária via
  `listarInstrutoresComCargaHoraria()`, `obs` sempre `''` (FR-009) (depends on T003)
- [X] T014 [P] [US2] Implementar `montarDadosSecao2Liq_(ano, trimestre)` em `lib/acoes/liq.ts` —
  por turma elegível × linha de `turma_disciplina` interceptando o trimestre, resolve curso+sufixo
  de turma (`turmas.Turma`), disciplina, período formatado, instrutor(es)+OM (depends on
  T004)
- [X] T015 [US2] Implementar `gerarLiq(ano, trimestre)` em `lib/acoes/liq.ts` — chama
  `validarLiq_` (lança `Error` se bloqueado, antes de qualquer escrita), monta dados via T013/T014,
  copia o Template (`ID_TEMPLATE_LIQ`) para `pastaLiqInstrutores_()`, `replaceText` das tags de
  documento, clonagem de linha nas 2 tabelas (Seção 1: 8 colunas `{{L1_*}}`; Seção 2: 5 colunas
  `{{L2_*}}`) com `replaceText` escopado à linha nova e remoção da linha-modelo ao final, retorna
  `{url}` (depends on T002, T005, T012, T013, T014 — FR-006, FR-011)
- [X] T016 [P] [US2] Adicionar botão "LIQ" a `painelPrincipalInstrutores` em
  `app/(app)/instrutores/page.tsx`, ao lado de "Cadastrar Novo Instrutor"/"Estatísticas"
- [X] T017 [US2] Implementar painel Ano/Trimestre + `alternarPainelLiq_()`/`renderizarPainelLiq_()`
  em `app/(app)/instrutores/page.tsx` (depends on T016) — **correção de implementação**: nenhum
  Tailwind CSS `.modal` existe em nenhum arquivo deste projeto (todo painel alterna via
  `style.display`, mesmo padrão de `alternarEstatisticasInstrutores`/`painelFichaInstrutor`); o
  "modal" da spec/contracts é implementado como painel colapsável, não `.modal` literal, por
  consistência com a convenção já estabelecida em todo o resto do arquivo
- [X] T018 [US2] Implementar `gerarLiqClick_()`/`liqGeradaComSucesso_()`/`liqFalhouGeracao_()` em
  `app/(app)/instrutores/page.tsx` — chama `gerarLiq` via Server Action, abre o documento em
  nova aba no sucesso, lista **todos** os problemas dentro do próprio painel no erro (não `alert()`)
  (depends on T015, T017)

**Checkpoint**: User Story 2 funcional e testável isoladamente (com dados de `turma_disciplina`
preenchidos manualmente no banco, mesmo sem passar pela UI de US1, já satisfaz o teste
independente).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Rastreabilidade normativa, deploy bookkeeping e validação final — depende de US1+US2
completas.

- [X] T019 [P] Registrar `RN-LIQ-01` (bloqueio por período faltante, NORMHIDRO 30-23 item 3.4/5.1),
  `RN-LIQ-02` (bloqueio por instrutor faltante, item 4.2/Anexo A 2a), `RN-LIQ-03` (ordenação por
  antiguidade na Seção 1, reaproveita RN-ANT-01) e `RN-LIQ-04` (Seção 1 Obs sempre vazia, item
  3.5/3.6 — impedimento é dado externo ao sistema) em
  `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (FR-014)
- [X] T020 [P] Atualizar `docs/arquitetura/01-schema.md` §8 — marcar LIQ-1 (`turma_disciplina`)
  como implementado; reafirmar LIQ-2 descartado, LIQ-3/LIQ-4 deferidos (achados 6/7 da spec)
- [X] T021 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`,
  mais a entrada correspondente em `o histórico de deploys da Vercel` — `2026-08-20.LIQ.1`
- [X] T022 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 027
- [ ] T023 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado (bloqueio
  real → correção via US1 → geração com sucesso) — ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` concluído em
  2026-08-20 (deployment `@49`); falta apenas a validação manual no navegador, mesma pendência real
  registrada para praticamente toda spec anterior desta sessão (`CLAUDE.md`).
- [X] T024 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC final da spec) —
  328/328 passando, 0 regressão.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode iniciar imediatamente (T002 em paralelo com T001)
- **Foundational (Phase 2)**: depende de T003 poder referenciar a tabela `turma_disciplina` já
  existente no banco — ou seja, depende de **T001** (migração aplicada); T004-T006 não
  dependem de T001
- **User Story 1 (Phase 3)**: depende de T003 (CRUD_CONFIG)
- **User Story 2 (Phase 4)**: depende de T002 (config_parametros), T004 (aritmética de trimestre),
  T005 (pasta) — **não** depende da UI de US1 (Phase 3), só dos dados de `turma_disciplina`
  existirem na aba (T001)
- **Polish (Phase 5)**: depende de US1 e US2 completas

### User Story Dependencies

- **US1 e US2 são funcionalmente independentes** (nenhuma chama código da outra), mas **US1 é o
  único meio de preencher `turma_disciplina` em produção** — sem rodar US1 primeiro (ou editar a
  planilha manualmente, só viável em teste), o bloqueio de US2 (FR-004) nunca deixa de disparar
  para dados reais. Ordem recomendada: US1 antes de validar US2 fim-a-fim com o critério de aceite
  da spec.

### Within Each User Story

- US1: T007 → T008 → T009 → T010 (sequencial, mesmo arquivo `app/(app)/cursos/[curso]/page.tsx`)
- US2: T011 (teste) → T012 → T013/T014 (paralelos entre si) → T015; T016 [P] (paralelo a
  T012-T015, arquivo `app/(app)/instrutores/page.tsx` distinto de `lib/acoes/liq.ts`) → T017 → T018

### Parallel Opportunities

- T001 e T002 (Setup)
- T004, T005, T006 (Foundational, arquivos/funções distintas dentro de `lib/acoes/liq.ts`+testes)
- T013 e T014 (US2, funções distintas em `lib/acoes/liq.ts`, sem dependência mútua)
- T016 pode começar em paralelo com T012-T015 (arquivo `app/(app)/instrutores/page.tsx` distinto de `lib/acoes/liq.ts`)
- T019 e T020 (Polish, arquivos de documentação distintos)

---

## Parallel Example: Foundational

```bash
Task: "Criar `lib/acoes/liq.ts` com trimestreParaIntervalo_/intervalosSeInterceptam_"
Task: "Implementar pastaLiqInstrutores_() em `lib/acoes/liq.ts`"
Task: "Testes unitários de trimestreParaIntervalo_/intervalosSeInterceptam_"
```

## Parallel Example: User Story 2 (montagem de dados)

```bash
Task: "Implementar montarDadosSecao1Liq_() em `lib/acoes/liq.ts`"
Task: "Implementar montarDadosSecao2Liq_(ano, trimestre) em `lib/acoes/liq.ts`"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1 (Setup) + Phase 2 (Foundational)
2. Completar Phase 3 (US1) — operador já consegue preencher os 121 períodos em branco
3. **PARAR e VALIDAR**: confirmar persistência via `crudListar('turma_disciplina')`

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → preenchimento de período possível → valor imediato mesmo sem a LIQ
3. US2 → geração da LIQ com bloqueio real → valor completo do épico
4. Polish → rastreabilidade normativa + deploy

---

## Notes

- Nenhuma tarefa desta lista cria `Instrutor_Impedimento`, `Papel_LIQ` ou `LIQ_Emitida` — LIQ-2
  descartado, LIQ-3/LIQ-4 confirmados fora de escopo (Clarifications 2026-08-20).
- T015 é a única tarefa que escreve no Supabase Storage — todas as demais de US2 são leitura/validação/UI.
- Commit após cada fase concluída (Setup, Foundational, US1, US2, Polish), seguindo o ritmo já
  estabelecido nesta sessão (commit após `/speckit-implement` + deploy, não por task individual).
