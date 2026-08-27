---

description: "Task list for Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores"
---

# Tasks: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

**Input**: Design documents from `/specs/036-disciplinas-crud-antiguidade/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos para toda função pura/nova alterada (backend e frontend) — harness de mock já
disponível (`tests/unidade/regras_de_negocio_backend.test.ts` para `.ts`, `tests/unidade/regras_ui_dados.test.ts`
para funções puras carregadas de `.html` via `vm`). Sem harness de mock para DOM/modal/renderização
real — verificado por `quickstart.md` manual (mesmo padrão de toda spec de frontend desta sessão).

**Organization**: 3 User Stories — US1/US2 (P1), US3 (P2). US2 e US3 tocam
`app/(app)/disciplinas/page.tsx`/`lib/acoes/disciplinas.ts` em pontos sobrepostos (US3 reaproveita a estrutura do
painel expandido por US2) — dependência explícita abaixo. US1 é totalmente independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos ou funções distintas, sem dependência)
- **[Story]**: US1 (ordenação por antiguidade) · US2 (edição completa) · US3 (cadastro)

## Path Conventions

Backend: `lib/acoes/disciplinas.ts` (funções nova/estendida), `lib/dominio/motor-preditivo.ts`
(função nova), `lib/acoes/crud.ts` (correção de 1 linha). Frontend:
`app/`app/(app)/disciplinas/page.tsx`` (único arquivo de UI tocado). Testes:
`tests/unidade/regras_de_negocio_backend.test.ts`, `tests/unidade/regras_ui_dados.test.ts`.

---

## Phase 1: Foundational (Bloqueante)

**Purpose**: Checagem de unicidade de Código dentro do curso (RF-DADOS-06) — usada tanto pela
edição (US2) quanto pelo cadastro (US3), construída uma vez, nunca duplicada (FR-006).

**⚠️ CRITICAL**: T007/T013 dependem desta fase.

- [X] T001 [P] Implementar `existeCodDisciplinaNoCurso_(disciplinas, idCurso, codDisciplina,
  idGradeExcluir)` em `lib/acoes/disciplinas.ts` — função pura, comparação normalizada
  (maiúsculas/sem acento, mesmo critério de `normalizarTexto_`), exclui a própria linha via
  `idGradeExcluir` (contracts/backend-functions.md)
- [X] T002 Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts`: mesmo Curso+Código (linha
  diferente) → `true`; mesmo Código, Curso diferente → `false`; mesma linha (`idGradeExcluir` bate)
  → `false`; variação de maiúsculas/espaços → ainda detecta duplicata (depends on T001)

**Checkpoint**: Unicidade pronta e testada — US2/US3 podem prosseguir.

---

## Phase 2: User Story 1 — Instrutores ordenados por precedência militar (Priority: P1) 🎯 MVP

**Goal**: A lista de checkboxes de instrutores habilitados no painel de edição aparece ordenada por
antiguidade (mais antigo primeiro), reaproveitando a escala já auditada do Módulo de Instrutores.

**Independent Test**: `quickstart.md` Passo 1 — disciplina com instrutores de postos diferentes,
CMG aparece antes de CC na lista de checkboxes.

### Implementação da User Story 1

- [X] T003 [P] [US1] Em `app/(app)/disciplinas/page.tsx`: duplicar `ORDEM_ANTIGUIDADE_POSTO`
  (mapa) e o padrão de `ordenarInstrutoresPorAntiguidade_` (``app/(app)/instrutores/page.tsx`:131-142`) —
  aplicar sobre `habilitados` dentro de `abrirEdicaoDisciplinaTurma_`, antes de montar os
  checkboxes (research.md §1). Posto fora da escala conhecida cai ao final (FR-003), sem lançar
  exceção
- [X] T004 [US1] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts`: postos em ordem embaralhada →
  ordenados do mais antigo para o mais recente; posto fora do mapa conhecido → cai ao final sem
  lançar exceção; 2 instrutores do mesmo posto → ambos presentes, sem exigir ordem determinística
  entre eles (depends on T003)

**Checkpoint**: Ordenação funcional e testável de forma independente — MVP entregável mesmo sem
US2/US3.

---

## Phase 3: User Story 2 — Edição completa da disciplina (Priority: P1)

**Goal**: O painel de edição expõe e permite alterar Código/Nome/Carga Horária/Prioridade/Modo de
Atribuição, pré-preenchidos com os valores reais atuais — incluindo Prioridade, hoje sempre em
branco.

**Independent Test**: `quickstart.md` Passo 2 — abrir uma disciplina com Prioridade já salva,
conferir que todos os campos aparecem preenchidos; editar Código para um valor já usado no mesmo
curso, conferir bloqueio; editar Código de uma disciplina vinculada a várias turmas, conferir
propagação.

### Implementação da User Story 2

- [X] T005 [P] [US2] Implementar `getPesosPrioridadeDisciplinas()` em `lib/dominio/motor-preditivo.ts`
  — wrapper público de 1 linha sobre `lerPesosPrioridadeDisciplina_` (já existente), `exigirFuncao(PERFIS_TODOS)`
  (contracts/backend-functions.md)
- [X] T006 [US2] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `getPesosPrioridadeDisciplinas`: sem nenhuma chave `PRIORIDADE_DISCIPLINA_*` → `{}`; 2 chaves
  presentes → mapa com as 2 entradas, valores numéricos (depends on T005)
- [X] T007 [US2] Estender `atualizarDisciplina(idGrade, obj)` em `lib/acoes/disciplinas.ts` —
  quando `obj.Cod_Disciplina` presente, valida unicidade via `existeCodDisciplinaNoCurso_` (T001)
  antes de `crudAtualizar`, lança erro se duplicado (FR-006); depois de `crudAtualizar` ter
  sucesso, se `Cod_Disciplina`/`Nome_Disciplina` mudaram, propaga para toda linha de
  `turma_disciplina` com o mesmo `ID_Grade` (FR-006.1, research.md §7) — mesma assinatura e
  formato de retorno (depends on T001)
- [X] T008 [US2] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `atualizarDisciplina` estendida: editar só CH (sem Código) → nenhuma checagem/propagação; Código
  duplicado no mesmo curso → erro, `crudAtualizar` nunca chamado; Código/Nome mudados com 2 turmas
  vinculadas → as 2 linhas de `turma_disciplina` atualizadas; editar só Nome → propaga só Nome,
  preserva Código de cada turma (depends on T007)
- [X] T009 [US2] Em `app/(app)/disciplinas/page.tsx`, expandir o `.modal-body` de
  `abrirEdicaoDisciplinaTurma_` com os campos Código/Nome/Carga Horária/Prioridade/Modo de
  Atribuição (grid `row g-2`, mesmo padrão do bloco Início/Término já existente), antes desse
  bloco — pré-preenchidos a partir de `disciplinaGrade` (já em memória) e do mapa de
  `getPesosPrioridadeDisciplinas` (buscado em paralelo em `mostrarEstadoInicialDisciplinas_`/
  `carregarDisciplinasView_`, mesmo padrão `Promise.all` já existente) (depends on T005)
- [X] T010 [US2] Em `salvarEdicaoDisciplinaTurma_` (mesmo arquivo), incluir os novos campos na
  chamada a `gs('atualizarDisciplina', ...)` e a `gs('definirPrioridadeDisciplina', ...)` (já
  existente); exibir a mensagem de erro de Código duplicado (T007) sem fechar o painel, para o
  usuário corrigir e tentar de novo (depends on T007, T009)

**Checkpoint**: Edição completa funcional, com unicidade e propagação — validável
independentemente de US3.

---

## Phase 4: User Story 3 — Cadastro de nova disciplina (Priority: P2)

**Goal**: Botão "Nova Disciplina" abre um formulário (reaproveitando a estrutura da US2) que cria,
numa operação, a linha de catálogo e o vínculo com a turma escolhida — com rollback automático se a
2ª gravação falhar.

**Independent Test**: `quickstart.md` Passo 3 — cadastrar uma disciplina nova com Curso+Turma,
conferir que aparece na Visão 2 da turma; tentar sem Turma, conferir bloqueio; tentar Código
duplicado, conferir bloqueio sem linha órfã.

### Implementação da User Story 3

- [X] T011 [P] [US3] Corrigir `CRUD_CONFIG['turma_disciplina'].prefixo` de `''` para `'TDI'` em
  `lib/acoes/crud.ts` (contracts/backend-functions.md, research.md §5)
- [X] T012 [US3] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts`:
  `crudCriar('turma_disciplina', {...})` sem ID explícito gera `TDI-NNNNNN`, nunca vazio; próximo
  ID é `MAX` já existente `+ 1`, não reinicia em `TDI-000001` (depends on T011)
- [X] T013 [US3] Implementar `cadastrarDisciplina(dados)` em `lib/acoes/disciplinas.ts` — valida
  Curso/Turma presentes (FR-010) e que a Turma pertence ao Curso; valida unicidade de Código
  (`existeCodDisciplinaNoCurso_`, T001); gera `ID_Disciplina` (`gerarProximoIdSequencial_`) e monta
  `ID_Grade` (research.md §4); `crudCriar('disciplinas', ...)`; `crudCriar('turma_disciplina',
  ...)` com `Origem_Periodo: 'Manual'` — em caso de erro nesse 2º `crudCriar`, `crudExcluir`
  (rollback, FR-013) a linha de catálogo recém-criada e relança o erro original; retorna
  `{ idGrade, idTurmaDisciplina }` (depends on T001, T011)
- [X] T014 [US3] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `cadastrarDisciplina`: cadastro válido → cria as 2 linhas, retorno com os 2 IDs; `idTurma`
  ausente → erro, nenhuma escrita; turma não pertence ao curso → erro, nenhuma escrita; Código
  duplicado → erro, nenhuma escrita; falha simulada na criação de `turma_disciplina` → catálogo
  fica marcado inativo/cancelado (não removido), erro relançado (prova do rollback, FR-013/SC-006);
  2 cadastros em cursos diferentes → `ID_Disciplina` sequencial correto, nunca reinicia por curso
  (depends on T013)
- [X] T015 [US3] Em `app/(app)/disciplinas/page.tsx`: botão "Nova Disciplina" no topo do módulo
  (visível em qualquer estado de seleção); nova função `abrirCadastroDisciplina_()` que reaproveita
  a estrutura de campos de `abrirEdicaoDisciplinaTurma_` (T009) com todos os campos vazios, mais
  seletores de Curso e Turma (cascata igual à já existente, `popularTurmasDisciplinas_`); o dropdown
  de Modo de Atribuição nasce com `Dividido` pré-selecionado (RN-MAT-05, mesmo padrão já usado para
  `Status='Ativo'` pré-selecionado no cadastro de Instrutores — achado do `/speckit-analyze`, F2:
  garante que o cadastro nunca grava `Modo_Atribuicao_Padrao` vazio, já que `crudCriar` não aplica
  nenhum default de schema sozinho) (depends on T009)
- [X] T016 [US3] Mesmo arquivo — handler de salvar do formulário de cadastro chama
  `gs('cadastrarDisciplina', ...)`; bloqueia sem Turma selecionada antes de qualquer chamada de
  rede (FR-010); ao salvar com sucesso, fecha o modal e recarrega a visão atual (mesmo padrão de
  `modoExibicaoAtual` já usado por `salvarEdicaoDisciplinaTurma_`, spec 035) (depends on T013, T015)

**Checkpoint**: Todas as 3 histórias entregues — critério de aceite completo do `spec.md`
verificável.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T017 [P] Atualizar `o histórico de deploys da Vercel` — novas entradas para `lib/acoes/disciplinas.ts`/
  `lib/dominio/motor-preditivo.ts`/`lib/acoes/crud.ts`/`app/(app)/disciplinas/page.tsx`
- [X] T018 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (protocolo padrão, documento 10 §8)
- [X] T019 [P] Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 036
- [X] T020 Rodar `pnpm vitest run` completo, confirmar 0 falhas — 426/426, 0 falhas
- [X] T021 ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (`o histórico de deploys da Vercel`) — `ECONNRESET` intermitente em
  4 tentativas anteriores (payload completo ~820KB via `o fluxo Git → Vercel` e via HTTPS puro; ~400KB completava
  normalmente), resolvido na 5ª tentativa sem nenhuma mudança de código — transitório do ambiente
  de rede desta sessão, não um limite real do endpoint. ``git push` (a Vercel publica a preview da branch)`: 33 arquivos. `o merge na `main` (a Vercel publica em produção)`:
  `AKfycbztf09jVkJJEEewAf-nB2vbAQS57Yftam6729_Vh49oFumvnz2djQcwCHjVLB0m-vqt @58`.
- [ ] T022 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sem dependências — bloqueia T007/T013 (qualquer tarefa que valide
  unicidade de Código)
- **US1 (Phase 2)**: independente — não depende de Foundational nem de US2/US3, pode rodar em
  paralelo com qualquer uma das duas (arquivo compartilhado, função distinta)
- **US2 (Phase 3)**: depende de Foundational (T001); T009 é o ponto de contato com
  `app/(app)/disciplinas/page.tsx` que a US3 reaproveita depois
- **US3 (Phase 4)**: depende de Foundational (T001) e de T009/T011 (estrutura do painel + correção
  do prefixo)
- **Polish (Phase 5)**: depende de US1+US2+US3 completas

### Parallel Opportunities

- T001 (Foundational) e T003 (US1, `app/(app)/disciplinas/page.tsx`, função distinta) — sem dependência entre
  si
- T005 (US2, `lib/dominio/motor-preditivo.ts`) e T011 (US3, `lib/acoes/crud.ts`) — arquivos distintos, sem dependência
  entre si, podem rodar a qualquer momento após Foundational
- T017/T019 (Polish, arquivos de documentação distintos)
- **Não paralelo**: T003 (US1) e T009 (US2) editam a **mesma função** (`abrirEdicaoDisciplinaTurma_`)
  — T003 acrescenta a ordenação por antiguidade, T009 acrescenta o bloco de campos novos, ambos no
  mesmo corpo de função. Mesmo pertencendo a histórias formalmente independentes, são sequenciais
  para um único agente (achado do `/speckit-analyze`, F1 — corrige uma contradição anterior deste
  documento, que chamava as duas edições de "funções diferentes" e "no mesmo lugar" na mesma frase)

---

## Parallel Example: Foundational + US1 + backends de US2/US3

```bash
Task: "Implementar existeCodDisciplinaNoCurso_ em `lib/acoes/disciplinas.ts` (T001)"
Task: "Duplicar ordenacao por antiguidade em `app/(app)/disciplinas/page.tsx` (T003)"
Task: "Implementar getPesosPrioridadeDisciplinas em `lib/dominio/motor-preditivo.ts` (T005)"
Task: "Corrigir CRUD_CONFIG['turma_disciplina'].prefixo em `lib/acoes/crud.ts` (T011)"
```

Estas 4 tarefas tocam 3 arquivos diferentes (T003 é o único de frontend) e não têm dependência
entre si — só T007/T009/T013/T015/T016 (que escrevem na mesma função/arquivo compartilhado)
precisam ser sequenciais.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Foundational)
2. Completar Phase 2 (US1) — ordenação por antiguidade já funcional
3. **PARAR e VALIDAR**: `quickstart.md` Passo 1
4. Deploy/demo se desejado

### Incremental Delivery

1. Foundational → US1 (MVP: ordenação) → validar
2. US2 (edição completa, unicidade, propagação) → validar
3. US3 (cadastro, com rollback) → validar
4. Polish (commit, PR, preview da Vercel, quickstart completo)

---

## Notes

- US2 e US3 tocam `app/(app)/disciplinas/page.tsx`/`lib/acoes/disciplinas.ts` em pontos sobrepostos — US3 reaproveita
  literalmente a estrutura de campos que US2 constrói (T009), então T015/T016 (US3) só fazem
  sentido depois de T009/T007 (US2) estarem prontos, mesmo ambos sendo P1/P2 formalmente
  independentes em valor de entrega.
- Nenhuma migração de schema, nenhuma coluna nova — `CRUD_CONFIG['turma_disciplina'].prefixo` (T011)
  é a única mudança de configuração de backend fora de funções novas/estendidas isoladas.
- `ORDEM_ANTIGUIDADE_POSTO` (US1) não é criada nesta spec — já existe em `app/(app)/instrutores/page.tsx`
  desde a spec 014; só duplicada em `app/(app)/disciplinas/page.tsx` seguindo o mesmo padrão já aceito no
  projeto para constantes de ordenação por view.
- Commit após cada história completa (Foundational+US1, depois US2, depois US3), seguindo o ritmo
  já estabelecido nesta sessão.
