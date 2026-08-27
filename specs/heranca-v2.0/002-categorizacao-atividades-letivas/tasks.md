---

description: "Task list template for feature implementation"
---

# Tasks: Épico E — Categorização de Atividades Letivas

**Input**: Design documents de `/specs/002-categorizacao-atividades-letivas/`

**Prerequisites**: plan.md (obrigatório), spec.md (histórias de usuário), research.md, data-model.md, contracts/server-functions.md, quickstart.md

**Tests**: `spec.md` não pede TDD explicitamente, mas `plan.md` (achado 4 de `research.md`) já decide
que toda função de **cálculo puro** ganha teste `pnpm vitest run` imediato — a única forma de cobrir
RN-EVT-01/RN-EVT-03 (Risco Alto) antes do banco V2.0 estar publicada. As tarefas de teste abaixo
não são opcionais, são parte da própria decisão de arquitetura deste plano.

**Bloqueio conhecido**: as tarefas que escrevem em `atividades_nao_letivas`/`avaliacoes` reais ou
leem o banco via o cliente Supabase só podem ser **verificadas de ponta a ponta** depois que a
banco da v2.1 for publicada como banco Supabase em produção (pendência fora do escopo deste plano, já
registrada em `spec.md`). O código pode e deve ser escrito agora; a verificação final de cada tarefa
que toca o cliente Supabase fica marcada como tal.

**Organização**: Tarefas agrupadas por história de usuário (spec.md). `lib/supabase/server.ts`/``lib/supabase/middleware.ts` + policies RLS`/`lib/acoes/crud.ts`/
`lib/dominio/regras-normativas.ts` (infraestrutura sem dono de épico único) entram na fase Foundational — nenhum
lançamento roda sem eles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: A qual história de usuário esta tarefa pertence (US1..US5, spec.md)
- Caminhos de arquivo exatos em cada descrição, relativos a `CIAARA-11-v2/`

## Path Conventions

`lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts` — convenção já em uso no projeto (não
`backend/`/`frontend/` na raiz).

---

## Phase 1: Setup

- [X] T001 Criar os diretórios ` e `app/` (hoje vazios) e o arquivo vazio
  `tests/unidade/regras_normativas.test.ts`, conforme a estrutura de `plan.md`.
- [X] T002 Confirmar que `pnpm vitest run` roda no ambiente (sem dependência nova a instalar — mesmo
  runtime já usado por `tests/unidade/*.test.ts` do Épico C).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura genérica sem dono de épico único (`research.md`, achado 1) — nenhuma
User Story desta feature roda sem isto.

- [X] T003 Criar `lib/supabase/server.ts` com `ss_`, `tz_`, `lerAbaComoObjetos_`, `isoParaDate_`,
  `gerarProximoId_` (formato `PREFIXO-NNNNNN`, 6 dígitos — C-04), `normalizarTexto_`, portadas de
  `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`. `lerAbaComoObjetos_` degrada com retorno vazio + aviso quando a aba não
  existe (RN-DEG-01), nunca lança exceção não tratada.
- [X] T004 [P] Criar `lib/supabase/middleware.ts` + policies RLS` com `getUsuarioAtual` (via `supabase.auth.getUser()`,
  RN-RBAC-01) e `exigirFuncao` (Admin/Operador — mínimo necessário para esta feature; perfis
  ampliados ficam para o Épico F). Depende de T003 (`lerAbaComoObjetos_` para ler `usuarios`).
- [X] T005 [P] Criar `lib/acoes/crud.ts` com `crudCriar` e `crudListar` — só o mínimo que
  `lib/acoes/aulas.ts`/`lib/acoes/avaliacoes.ts` desta feature chamam (`crudAtualizar`/`crudExcluir` ficam para o épico
  que primeiro precisar deles). `crudCriar` nunca sobrescreve coluna alimentada por fórmula nativa
  (RN-CRUD-02). Depende de T003.
- [X] T006 [P] Criar `lib/dominio/regras-normativas.ts` com `lerConfigParametros_` (lê
  `config_parametros`) e `calcularTetoAEC_`/`calcularTetoTAD_`/`calcularTetoTR_` — funções puras
  (recebem dado já carregado, devolvem `ResultadoTeto` per `data-model.md`), CHD/CHR como total
  curricular (`research.md`, achado 3), `semBaseDeCalculo=true` quando o denominador é zero.
- [X] T007 [P] Criar `tests/unidade/regras_normativas.test.ts`: testes `pnpm vitest run` para
  `calcularTetoAEC_/TAD_/TR_` com fixtures sintéticas (curso com/sem CHD cadastrada, teto
  ultrapassado/dentro do limite) — RF-EXTRA-04. Depende de T006, não de T003–T005.
- [X] T008 Criar `app/layout.tsx` + `lib/supabase/server.ts`` com `app/layout.tsx`, `include`, `getContextoInicial` (mínimo:
  usuário logado + perfil, sem o `ctx` completo do Épico D). Depende de T003, T004.
- [X] T009 Criar a casca mínima do frontend: `app/layout.tsx` (host das views),
  `app/globals.css` (badge de categoria + banner de Aviso Nível 2, não o Design System
  completo — `research.md`, achado 2) e `components/ciaara/` (a Server Action wrapper +
  `AppState` mínimo: `cursoSelecionado`/`turmaSelecionada`/`filtros`, sem cache/observer completo do
  Épico D). Depende de T008.
- [X] T010 Converter os stubs `RN-CRUD-02` e `RN-DEG-01` de `tests/unidade/pendentes.test.ts` (hoje sob
  "Pendentes - Epico C (migracao/backend generico)") em testes reais, agora que `lib/supabase/server.ts`/`lib/acoes/crud.ts`
  existem (T003, T005) — mover para `tests/unidade/regras_de_negocio.test.ts` ou um novo arquivo dedicado,
  removendo o `test.todo` correspondente.

**Checkpoint**: infraestrutura mínima pronta — as 5 User Stories podem começar.

---

## Phase 3: User Story 1 - Lançar AEC/TAD/TR com escopo Global ou Turma (Priority: P1) 🎯 MVP

**Goal**: Substituir o formulário único de "evento extracurricular" por lançamento nas categorias
AEC/TAD/TR com escopo correto.

**Independent Test**: Lançar uma atividade de cada categoria (AEC, TAD, TR) com escopo Turma e uma
com escopo Global; confirmar que cada uma aparece com a categoria certa e que a Global se aplica a
todas as turmas ativas na data (`spec.md`, US1 Independent Test).

### Implementation for User Story 1

- [X] T011 [US1] Implementar `registrarEventoExtracurricular(obj)` em `lib/acoes/aulas.ts`,
  adaptado de `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 1006 (`research.md`, achado 5): valida
  `Categoria_Normativa` (obrigatório, domínio fechado), `Escopo` (`Global`/`Turma`), `ID_Turma`
  condicional a `Escopo=Turma` (se `Global`, resolve todas as turmas ativas na data em vez de
  exigir uma turma), `Data`/`Tempos_Consumidos`/`Descricao` obrigatórios; chama
  `calcularTetoAEC_/TAD_/TR_` (T006) após criar e devolve o resultado junto com o registro
  (contrato em `contracts/server-functions.md`).
- [X] T012 [US1] Criar `app/(app)/atividades/page.tsx`: formulário de lançamento
  (categoria, escopo, turma — visível só se escopo=Turma —, data, tempos consumidos, descrição,
  observações), com validação client-side espelhando T011 (IND-01, asterisco em obrigatório).
- [X] T013 [US1] Registrar a rota `#tabExtra` no roteador mínimo de `components/ciaara/`,
  ligando ao menu lateral.
- [X] T013a [US1] Acrescentar o ponto de entrada de lançamento a partir do próprio DSA em
  `app/(app)/turmas/[turma]/dsa/page.tsx` (botão/atalho na grade semanal, reaproveitando o mesmo formulário e
  validação de T011/T012) — FR-004 exige lançamento tanto pelo DSA quanto por módulo dedicado; sem
  esta tarefa só o módulo dedicado (T012) existiria (achado G1 do `/speckit-analyze`).

**Checkpoint**: Operador consegue lançar AEC/TAD/TR com escopo correto — verificável de ponta a
ponta só depois do banco V2.0 estar publicada (T011 usa o cliente Supabase).

---

## Phase 4: User Story 2 - Sinalização automática dos tetos de AEC/TAD/TR (Priority: P2)

**Goal**: Mostrar, por curso, o percentual atual de cada teto frente ao limite, com Aviso Nível 2
quando ultrapassado — nunca bloqueio.

**Independent Test**: Lançar atividades AEC até ultrapassar 10% da CHD de um curso de teste;
confirmar o banner de Aviso Nível 2 e que o lançamento continua sendo aceito.

### Implementation for User Story 2

- [X] T014 [US2] Implementar `calcularTetosDoCurso(idCurso)` em `lib/dominio/regras-normativas.ts`
  — wrapper fino sobre `calcularTetoAEC_/TAD_/TR_` (T006), lendo o dado real do curso via
  `lerAbaComoObjetos_` (T003). Contrato em `contracts/server-functions.md`.
- [X] T015 [US2] Widget de tetos (3 indicadores — AEC/TAD/TR, percentual atual vs. limite) em
  `app/(app)/cursos/[curso]/page.tsx`, consumindo `calcularTetosDoCurso` ao carregar a página do curso.
- [X] T016 [US2] Banner de Aviso Nível 2 (`app/globals.css`, componente já criado em
  T009) acionado quando `ultrapassado=true` — banner amarelo, dispensável (botão "Ciente/Ignorar"),
  nunca bloqueia o formulário de T012.

**Checkpoint**: os 3 tetos aparecem calculados e sinalizados para qualquer curso consultado.

---

## Phase 5: User Story 3 - Lançar e acompanhar Estudo Individual em categoria própria (Priority: P3)

**Goal**: Estudo Individual lançado separadamente, sempre de Turma, acompanhado informativamente
contra 10% (CIAARA sem regime de Estudo Obrigatório — `spec.md`, Clarifications), nunca somado aos
3 tetos.

**Independent Test**: Lançar Estudo Individual e confirmar que (a) não afeta o cálculo dos 3 tetos,
e (b) aparece acompanhado, separadamente, contra a referência de 10%; confirmar que escopo Global é
rejeitado para esta categoria.

### Implementation for User Story 3

- [X] T017 [US3] Em `lib/acoes/aulas.ts` (`registrarEventoExtracurricular`, T011), acrescentar a
  validação: se `Categoria_Normativa=Estudo_Individual`, rejeitar `Escopo=Global` com erro explícito
  (`"Estudo Individual não pode ter escopo Global."` — contrato em `contracts/server-functions.md`).
- [X] T018 [US3] Acompanhamento informativo de Estudo Individual (percentual lançado vs. referência
  de 10% das horas-aula diárias) em `app/(app)/cursos/[curso]/page.tsx` ou `app/(app)/atividades/page.tsx``
  — cálculo separado de `calcularTetosDoCurso` (T014), sem alerta de ultrapassagem em nenhuma
  circunstância (FR-011).

**Checkpoint**: Estudo Individual nunca aparece somado a AEC/TAD/TR em nenhum cálculo.

---

## Phase 6: User Story 4 - Lançar Avaliação/Vista de Prova computando CHD automaticamente (Priority: P4)

**Goal**: Avaliação/Vista de Prova soma à CHD da disciplina no mesmo ato do lançamento.

**Independent Test**: Lançar uma avaliação vinculada a uma disciplina de turma de teste e confirmar
que a CHD sobe no mesmo lançamento, sem segunda tela.

### Implementation for User Story 4

- [X] T019 [US4] Implementar `registrarAvaliacao(obj)` em `lib/acoes/avaliacoes.ts`, adaptado de
  `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 914 (`research.md`, achado 5): preserva validação de
  turma/matéria/instrutor já existente; acrescenta `Tempos_Consumidos`/`TA_Inicial` como
  obrigatórios (cômputo automático de CHD, RN-EVT-03); **remove** a checagem de habilitação do
  instrutor responsável (`instrutorHabilitado_`) — não se aplica ao aplicador de avaliação
  (RN-INST-01 delimitada).
- [X] T020 [US4] Formulário mínimo de lançamento de Avaliação/Vista de Prova (turma, disciplina,
  tipo, data, tempos consumidos, instrutor responsável, fiscal) — reaproveitando
  `app/(app)/atividades/page.tsx` (T012) como um segundo modo, ou um formulário simples dedicado; o
  dashboard de situação de execução fica para o Épico I (fora de escopo aqui — `spec.md`,
  Assumptions).

**Checkpoint**: toda Avaliação/Vista lançada soma à CHD no mesmo ato, sem segundo lançamento.

---

## Phase 7: User Story 5 - Ver as cinco categorias totalizadas separadamente (Priority: P5)

**Goal**: Cronograma, DSA e Relatório totalizam Aula/CHD, Avaliação/Vista, AEC, TAD, TR e Estudo
Individual separadamente.

**Independent Test**: Abrir Cronograma, DSA e Relatório de uma turma de teste com lançamentos nas
cinco categorias e confirmar que cada tela totaliza as cinco separadamente, sem soma cruzada.

### Implementation for User Story 5

- [X] T021 [US5] `getCronos(idTurma)` em `lib/acoes/cronograma.ts` (assinatura preservada de
  V1.0, RF-MOD-02) acrescenta o bloco `totalizadores` (formato em `data-model.md`) — AEC/TAD/TR
  nunca somados entre si nem à execução de disciplina específica (RN-CRONOS-02/RF-CRONOS-04).
- [X] T022 [US5] `getDsaSemanal(idTurma, semana)` em `lib/acoes/dsa.ts` reflete automaticamente
  todo lançamento AEC/TAD/TR/Estudo Individual da semana na grade (RF-EXTRA-03), sem exigir
  sincronização manual.
- [X] T023 [US5] `getRelatorio(idCurso)` em `lib/acoes/relatorio.ts` acrescenta o bloco
  `totalizadores`: Aula e Avaliação/Vista sempre na CHD da disciplina, nunca no agrupamento não
  letivo (FR-016).
- [X] T024 [US5] Exibir os totalizadores separados em `app/(app)/cursos/[curso]/page.tsx` e
  `app/(app)/turmas/[turma]/dsa/page.tsx` (view de DSA mínima, só a grade semanal necessária para esta feature
  — impressão completa fica fora de escopo se não for exigida por nenhuma FR desta feature).

**Checkpoint**: as cinco categorias aparecem totalizadas separadamente em Cronograma/DSA/Relatório.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T025 [P] Rodar `pnpm vitest run tests/regras_normativas.test.ts` (e o restante de `tests/unidade/*.test.ts`
  já existente do Épico C, para confirmar zero regressão) — ver `quickstart.md`.
- [X] T026 [P] Preparar `o histórico de deploys da Vercel` e o primeiro `o SHA do commit` (`docs/fase-1/10`, §8),
  para quando o banco V2.0 estiver publicada e a implantação puder ocorrer.
- [X] T027 Atualizar `CLAUDE.md` com o estado do Épico E (o que foi implementado, o que depende da
  banco de produção para verificação final).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — **bloqueia** todas as User Stories. T003 bloqueia
  T004/T005/T006/T008; T006 bloqueia T007; T008 depende de T003+T004; T009 depende de T008; T010
  depende de T003+T005.
- **User Stories (Phase 3–7)**: todas dependem da Foundational completa. Entre si:
  - US1 (T011–T013a) depende de T006 (calcularTeto\*\_) para o retorno de
    `registrarEventoExtracurricular`. T013a e T024 (US5) tocam o mesmo arquivo `app/(app)/turmas/[turma]/dsa/page.tsx` —
    T013a cria a view mínima (botão de lançamento), T024 acrescenta os totalizadores por cima dela;
    não rodam em paralelo.
  - US2 (T014–T016) depende de US1 só estruturalmente (mesmo arquivo `lib/acoes/aulas.ts`/`app/globals.css`),
    mas é conceitualmente independente — pode ser implementada e testada isoladamente uma vez que
    T006 exista.
  - US3 (T017–T018) depende de T011 (US1) — é um ajuste sobre a mesma função.
  - US4 (T019–T020) é independente de US1/US2/US3 (arquivo `lib/acoes/avaliacoes.ts` diferente).
  - US5 (T021–T024) depende de US1/US3/US4 terem gravado dado nas categorias corretas para os
    totalizadores terem o que somar, mas o código em si (`lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`/`lib/acoes/relatorio.ts`)
    pode ser escrito em paralelo.
- **Polish (Phase 8)**: depende de todas as fases de implementação desejadas estarem completas.

### Parallel Opportunities

- T004, T005, T006 (Foundational) podem ser escritos em paralelo depois de T003 — arquivos
  diferentes, sem dependência entre si.
- T007 (teste) em paralelo a T004/T005/T008/T009 — só depende de T006.
- US4 (T019–T020) pode ser implementada em paralelo a US1/US2/US3 — arquivo `lib/acoes/avaliacoes.ts`
  diferente de `lib/acoes/aulas.ts`.
- T025, T026, T027 (Polish) são arquivos/ações independentes entre si.

---

## Parallel Example: Foundational

```bash
# Depois de T003 (`lib/supabase/server.ts`) pronto, três tarefas em paralelo:
Task: "Criar `lib/supabase/middleware.ts` + policies RLS (T004)"
Task: "Criar `lib/acoes/crud.ts` (T005)"
Task: "Criar `lib/dominio/regras-normativas.ts` (T006)"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (`lib/supabase/server.ts`/``lib/supabase/middleware.ts` + policies RLS`/`lib/acoes/crud.ts`/`lib/dominio/regras-normativas.ts`/``app/layout.tsx` + `lib/supabase/server.ts``
   + casca de frontend) — bloqueia tudo.
3. Completar Phase 3: User Story 1 (lançamento AEC/TAD/TR).
4. **Parar e validar**: rodar `tests/unidade/regras_normativas.test.ts`; quando o banco V2.0 estiver
   publicada, lançar uma atividade de cada categoria manualmente.

### Entrega incremental

1. Setup + Foundational → infraestrutura mínima pronta.
2. US1 → lançamento funcionando → validar → commit.
3. US2 → tetos sinalizados → validar → commit.
4. US3 → Estudo Individual separado → validar → commit.
5. US4 → Avaliação computando CHD → validar → commit (independente de US1/US2/US3).
6. US5 → totalizadores nas 3 telas → validar → commit.
7. Polish → suíte de cálculo puro verde, `o SHA do commit`/`o histórico de deploys da Vercel` prontos para quando o banco
   ao vivo existir.

### Estratégia de commit (Princípio VI)

Um commit por arquivo `.ts`/`.tsx` novo ou por User Story fechada — não um commit único
"implementa Épico E".

---

## Notes

- [P] = arquivos diferentes, sem dependência de autoria.
- [Story] mapeia cada tarefa à história de usuário correspondente em `spec.md`.
- Tarefas que chamam o cliente Supabase (T011, T014, T019, T021–T023, e as tarefas de frontend que
  dependem delas) têm o código escrito e testável na lógica pura associada, mas a verificação de
  ponta a ponta fica bloqueada até o banco V2.0 ser publicada como banco Supabase em produção — não é
  uma lacuna deste `tasks.md`, é a mesma pendência já registrada em `spec.md` e `plan.md`.
- T010 (converter stubs de `tests/unidade/pendentes.test.ts`) é a primeira vez que RN-CRUD-02/RN-DEG-01
  saem de `test.todo` para teste real — natural, já que esta é a primeira feature a escrever
  `lib/supabase/server.ts`/`lib/acoes/crud.ts`.
