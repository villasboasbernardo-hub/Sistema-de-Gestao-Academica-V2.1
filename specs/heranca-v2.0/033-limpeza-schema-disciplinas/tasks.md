---

description: "Task list for Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma"
---

# Tasks: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

**Input**: Design documents from `/specs/033-limpeza-schema-disciplinas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos para a lógica de backend real desta spec (`resolverPeriodoEfetivo_` e as 2
funções que passam a usá-la) — harness de mock já disponível
(`tests/unidade/regras_de_negocio_backend.test.ts`). Sem tarefa de teste para a migração em si (script
Python de remoção de coluna, mesmo padrão de todas as migrações anteriores — validada por execução
real + `migracao_log`, não `pnpm vitest run`).

**Organization**: 2 User Stories, ambas P1 e **independentes entre si** (US1 = migração de schema,
US2 = correção de coerência em `lib/acoes/cronograma.ts`) — sem fase Foundational, nenhuma compartilha
pré-requisito com a outra.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos/funções distintas, sem dependência)
- **[Story]**: US1 (remoção de colunas mortas) ou US2 (turma_disciplina preferida sobre a semente)

## Path Conventions

Backend: `lib/acoes/cronograma.ts` (único arquivo `.ts` tocado). Migração: `migracao/
remover_colunas_mortas_cad_disciplinas.py` (novo). Testes: `tests/unidade/regras_de_negocio_backend.test.ts`.
Nenhum arquivo de frontend é tocado (plan.md, achado da spec).

---

## Phase 1: User Story 1 — Remover colunas mortas/quebradas do Catálogo de Disciplinas (Priority: P1)

**Goal**: `disciplinas` perde `Instrutores_Selecionados`/`Tecnica_Ensino_Sugerida`/
`Local_Padrao`, sem quebrar nenhuma tela.

**Independent Test**: `quickstart.md` Passo 1 — rodar a migração, confirmar as 3 colunas ausentes
no cabeçalho e nenhuma tela quebrada.

### Implementação da User Story 1

- [X] T001 [P] [US1] Confirmar por busca em `lib/acoes/*.ts` e `lib/dominio/*.ts` e `app/**/page.tsx` e `components/**/*.tsx` que não
  existe nenhuma referência real a `Instrutores_Selecionados`, `Tecnica_Ensino_Sugerida` ou
  `Local_Padrao` além de comentários históricos (sanity check antes de remover — Achados reais já
  confirmou isso na investigação de premissa, esta tarefa é a reconfirmação formal antes do código)
- [X] T002 [US1] Escrever `migracao/remover_colunas_mortas_cad_disciplinas.py` e rodar localmente —
  remove as 3 colunas de `disciplinas` em ordem decrescente de índice (research.md §1), backup
  + `migracao_log`, idempotente (mesmo padrão de `remover_instrutor_completo_adicionar_estado.py`)
  (depends on T001)

**Checkpoint**: `disciplinas` limpa localmente — falta só aplicar na banco de produção (Polish).

---

## Phase 2: User Story 2 — Preferir a data real da turma sobre a semente de grade (Priority: P1)

**Goal**: `getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina` usam
`turma_disciplina.Previsao_Inicio/Termino` quando existir, com a mesma assinatura/retorno de hoje.

**Independent Test**: `quickstart.md` Passo 2 — numa turma com período editado, confirmar que as 2
funções refletem a data da turma; numa turma sem edição, confirmar que o comportamento é idêntico
ao de antes desta spec.

### Implementação da User Story 2

- [X] T003 [P] [US2] Implementar `resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade)`
  em `lib/acoes/cronograma.ts` — função pura (contracts/backend-functions.md): par início+término
  tratado atomicamente, nunca misturado entre fontes (research.md §2)
- [X] T004 [US2] Ajustar `getDisciplinasDaTurmaComRitmo(idTurma)` em `lib/acoes/cronograma.ts` — lê `turma_disciplina` filtrada por `idTurma` (indexada por `ID_Grade`) e usa `resolverPeriodoEfetivo_` no
  lugar da leitura direta de `disciplinas.Previsao_Inicio/Termino`; mesma assinatura e formato
  de retorno (depends on T003)
- [X] T005 [US2] Ajustar `getCronogramaGlobalDisciplina(idGrade, idTurma)` em `lib/acoes/cronograma.ts` — lê
  a linha de `turma_disciplina` correspondente (`ID_Grade`+`ID_Turma`) e usa
  `resolverPeriodoEfetivo_` para `previsaoInicio`/`previsaoTermino` do retorno; mesma assinatura e
  formato de retorno (depends on T003)
- [X] T006 Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts`: (a)
  `resolverPeriodoEfetivo_` — turma com par completo prevalece, turma ausente/incompleta degrada
  para a grade, grade também ausente devolve `null`/`null`; (b) `getDisciplinasDaTurmaComRitmo`/
  `getCronogramaGlobalDisciplina` refletem a data da turma quando ela existe e a da grade quando não
  (depends on T004, T005)

**Checkpoint**: Coerência corrigida nas 2 funções, sem nenhuma mudança de assinatura/retorno.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T007 Aplicar `migracao/remover_colunas_mortas_cad_disciplinas.py` (T002) contra o banco ao
  vivo — mesma replicação estrutural via Composio já usada nas specs 027/029/032. **Achado real**:
  `Tecnica_Ensino_Sugerida`/`Local_Padrao` não existiam como colunas reais nem localmente nem ao
  vivo (a leitura ao vivo do cabeçalho confirmou apenas 18 colunas, sem essas 2) — só
  `Instrutores_Selecionados` precisou ser removida de fato (`GOOGLESHEETS_DELETE_DIMENSION`,
  coluna G); `migracao_log` `LOG-001060` (renumerado após colidir com um `LOG-000930`
  pré-existente de ~130 linhas gravadas por outra sessão de trabalho, já encerrada, entre o boot
  desta spec e sua aplicação — achado adicional, sem relação com o escopo desta spec, resolvido
  sem perda de dado)
- [X] T008 [P] Atualizar `o histórico de deploys da Vercel` — nova entrada para `lib/acoes/cronograma.ts`
- [X] T009 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (mesmo `o SHA do commit` nos 2 lugares mesmo sem nenhuma mudança de frontend, protocolo padrão do
  projeto, documento 10 §8)
- [X] T010 Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 033
- [X] T011 Rodar `pnpm vitest run` completo, confirmar 0 falhas (SC-004)
- [ ] T012 Executar `quickstart.md` Passos 1 a 4 manualmente contra o deploy publicado — `o fluxo Git → Vercel
  push`/`o merge na `main` (a Vercel publica em produção)` concluído (deployment `@55`); falta só a validação manual no navegador

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)** e **US2 (Phase 2)**: totalmente independentes — nenhuma depende da outra, podem
  rodar em paralelo
- **Polish (Phase 3)**: depende de US1 e US2 completas

### Within Each User Story

- US1: T001 → T002
- US2: T003 → T004 → T006 (T005 em paralelo com T004, mesma dependência de T003, mesmo arquivo)

### Parallel Opportunities

- T001 (US1) e T003 (US2) — histórias independentes, podem começar juntas
- T004 e T005 (mesmo arquivo `lib/acoes/cronograma.ts`, funções distintas, ambas dependem só de T003) —
  paralelizável entre 2 agentes, mas cuidado com edição simultânea do mesmo arquivo num único agente
  sequencial
- T008 (Polish, arquivo de documentação distinto)

---

## Parallel Example: US1 + US2 simultâneas

```bash
Task: "Confirmar ausencia de referencia as 3 colunas mortas + escrever/rodar a migracao (US1)"
Task: "Implementar resolverPeriodoEfetivo_ + ajustar as 2 funcoes de `lib/acoes/cronograma.ts` (US2)"
```

---

## Implementation Strategy

### MVP = as 2 histórias juntas

O Critério de Aceite do spec cobre os dois problemas reais encontrados na auditoria — nenhuma das
2 histórias sozinha entrega o "Data Cleanup" completo pedido.

1. Completar Phase 1 (US1) e Phase 2 (US2) — podem ser feitas em qualquer ordem ou em paralelo
2. **PARAR e VALIDAR**: `quickstart.md` Passos 1-3
3. Phase 3 (Polish)

---

## Notes

- Nenhuma tarefa desta lista toca `app/**/page.tsx` e `components/**/*.tsx` — primeira spec desde a 027 100% backend +
  migração (achado da spec: nenhuma das 2 correções tem consumidor de UI).
- `disciplinas.Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor` nunca são tocadas por nenhuma
  tarefa (FR-006) — só as 3 colunas mortas listadas em T002.
- Commit após US1 + US2 completas, seguindo o ritmo já estabelecido nesta sessão.
