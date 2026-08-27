---

description: "Task list template for feature implementation"
---

# Tasks: Épico I — Simplificação do Módulo de Avaliações

**Input**: Design documents de `/specs/003-simplificacao-avaliacoes/`

**Prerequisites**: plan.md (obrigatório), spec.md (histórias de usuário), research.md, data-model.md, contracts/server-functions.md, quickstart.md

**Tests**: mesma decisão de arquitetura do Épico E (`plan.md`, Technical Context): o núcleo de
**cálculo/classificação puro** (`painelavaliacoesCurso_`) ganha teste `pnpm vitest run` imediato.
Diferente da primeira versão deste `tasks.md`: RN-INST-01 e RN-AVAL-02 (ambas Risco Alto,
documento 04) também ganham teste nomeado nesta rodada, usando o harness de mock o cliente Supabase
já estabelecido em `tests/unidade/regras_de_negocio_backend.test.ts` (RN-CRUD-02) — fecha os achados C1/E1
do `/speckit-analyze`, que apontou a ausência desses testes como violação do Princípio VIII da
constitution.

**Bloqueio conhecido**: idêntico ao Épico E — tarefas que escrevem/leem via o cliente Supabase só são
verificáveis de ponta a ponta contra o banco V2.0 ao vivo (já publicada e implantada via
`o fluxo Git → Vercel`).

**Organização**: Tarefas agrupadas por história de usuário (spec.md, US1–US4). **A correção de
`registrarAvaliacao()`** (habilitação do aplicador + remoção da exigência de TA/tempos) entra na
fase Foundational porque as 4 User Stories dependem dela: sem a correção, nem o agendamento é
"sem TA" (US1), nem o painel tem uma base de dados coerente para classificar (US2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: A qual história de usuário esta tarefa pertence (US1/US2/US3/US4, spec.md)
- Caminhos de arquivo exatos em cada descrição, relativos a `CIAARA-11-v2/`

## Path Conventions

`lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts` — convenção já em uso no projeto.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` para registrar a contagem de baseline (69 testes, 58
  passam, 11 `todo`, herdada do Épico E) antes de iniciar — nenhuma infraestrutura nova a criar,
  `lib/supabase/server.ts`/``lib/supabase/middleware.ts` + policies RLS`/`lib/acoes/crud.ts`/``app/layout.tsx` + `lib/supabase/server.ts`` já existem.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `registrarAvaliacao()` corrigida — sem ela, nenhuma das 4 User Stories tem uma base
coerente (research.md, achado 0 e achado 1).

**⚠️ CRITICAL**: nenhuma User Story desta feature roda sem esta fase completa.

- [X] T002 [P] Em `lib/supabase/server.ts`, acrescentar ao objeto `TABELAS`: `INSTRUTORES: 'instrutores'`
  e `INSTRUTOR_DISCIPLINA: 'instrutor_disciplina'` — declaração estática, sem código executável de
  nível superior (gotcha crítico do `CLAUDE.md`).
- [X] T003 Em `lib/dominio/regras-normativas.ts`, criar `instrutorHabilitado_(idInstrutor, idGrade)`
  — portada de `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 751, adaptada a `instrutor_disciplina` (`ID_Instrutor`,
  `ID_Grade`, filtra `Status = 'Ativo'`). Depende de T002.
- [X] T004 Em `lib/acoes/avaliacoes.ts`, corrigir `registrarAvaliacao(obj)` (research.md, achados
  0 e 1; data-model.md, seção "avaliacoes (registrarAvaliacao, ALTERADA)"): (a)
  `ID_Instrutor_Responsavel` passa a obrigatório e validado por `instrutorHabilitado_` (T003) —
  bloqueia com `"O instrutor responsável não está habilitado nesta disciplina."` se não habilitado
  (FR-013); (b) **remove** a exigência/aceitação de `Tempos_Consumidos`/`TA_Inicial` — a função
  vira agendamento puro (FR-001), não grava nenhum valor de `Status` na criação (deixa em branco —
  será calculado dinamicamente pelo painel, nunca escrito literalmente nesse estado); (c) a saída
  deixa de incluir `chdAtualizada` (agendar não altera CHD). Depende de T003.
- [X] T005 [P] Em `tests/unidade/regras_de_negocio_backend.test.ts`, criar
  `describe("RN-INST-01 - aplicador de avaliacao exige habilitacao, fiscal nao")` — usando o mesmo
  mock do cliente Supabase/`a transação do PostgreSQL` já existente no arquivo: (a) `registrarAvaliacao` bloqueia
  quando `ID_Instrutor_Responsavel` não tem vínculo em `instrutor_disciplina`; (b) aceita quando
  tem. Fecha o achado C1 do `/speckit-analyze` (RN-INST-01, Risco Alto, sem teste nomeado). Depende
  de T004.

**Checkpoint**: infraestrutura pronta — as 4 User Stories podem começar.

---

## Phase 3: User Story 1 - Agendar avaliação sem consumir tempo de aula até ser aplicada no DSA (Priority: P1) 🎯 MVP

**Goal**: agendar só grava a data prevista (sem CHD); a aplicação efetiva no DSA é que consome TA;
a avaliação agendada aparece como sugestão na prévia do DSA da semana.

**Independent Test**: agendar uma avaliação para uma data futura e confirmar que a CHD não muda e
que ela aparece na prévia do DSA; aplicá-la no DSA e confirmar que só aí a CHD sobe (`spec.md`, US1
Independent Test).

### Implementation for User Story 1

- [X] T006 [US1] Em `lib/acoes/avaliacoes.ts`, criar `aplicarAvaliacaoNoDsa(obj)` — localiza a
  linha existente por `ID_Avaliacao`, grava `TA_Inicial`/`Tempos_Consumidos` (obrigatórios, > 0) e
  `Status = 'Concluida'` (mesmo mecanismo de update-não-create de `registrarVistaProva`,
  research.md achado 2). Contrato em `contracts/server-functions.md`.
- [X] T007 [P] [US1] Em `tests/unidade/regras_de_negocio_backend.test.ts`, criar
  `describe("RN-AVAL-02 - agendamento e aplicacao sao o mesmo lancamento")` — confirma que
  `aplicarAvaliacaoNoDsa` **atualiza** a linha criada por `registrarAvaliacao` (mesmo
  `ID_Avaliacao`, mesma posição no banco), nunca cria uma segunda linha. Fecha o achado E1 do
  `/speckit-analyze` (RN-AVAL-02, Risco Alto, sem teste nomeado). Depende de T006.
- [X] T008 [US1] Em `lib/acoes/dsa.ts`, `getDsaSemanal(idTurma, semana)` acrescenta o campo
  `avaliacoesAgendadasNaSemana` — avaliações da turma com `TA_Inicial` vazio; filtra por semana
  quando `semana` é informado, devolve todas as pendentes/atrasadas da turma quando `semana` é
  `null` (mesmo padrão do chamador atual em `app/(app)/turmas/[turma]/dsa/page.tsx`, que hoje sempre passa `null` — research.md achado 6). Depende de T004.
- [X] T009 [US1] Em `app/(app)/atividades/page.tsx`, simplificar `formAvaliacao`/
  `salvarAvaliacao()`: remove os campos "TA inicial"/"Tempos consumidos" (não existem mais em
  `registrarAvaliacao`) e a mensagem de sucesso não cita mais `chdAtualizada`. Depende de T004.
- [X] T010 [US1] Em `app/(app)/turmas/[turma]/dsa/page.tsx`, exibir `avaliacoesAgendadasNaSemana` (T008) como
  lista de sugestão, com botão "Aplicar no DSA" por item — abre um formulário pequeno (TA inicial,
  tempos consumidos) que chama `aplicarAvaliacaoNoDsa` (T006). Depende de T006, T008.

**Checkpoint**: agendar nunca altera CHD; aplicar no DSA altera; a prévia do DSA sugere as
avaliações agendadas da semana — verificável de ponta a ponta (banco da v2.1 já publicada).

---

## Phase 4: User Story 2 - Acompanhar avaliações só pela situação de execução (Priority: P2)

**Goal**: painel por curso que classifica cada item de `avaliacoes_planejadas` por situação de
execução (derivada de `TA_Inicial` + data, não mais de um `Status` sempre `Concluída`), sem nenhum
campo de `Formula_MF`/`Carater`.

**Independent Test**: abrir o painel de um curso com um item sem lançamento, um agendado para o
futuro, um agendado com data já passada sem aplicação, e um já aplicado; confirmar a situação de
cada um e que nenhum campo de nota/caráter eliminatório aparece (`spec.md`, US2 Independent Test).

### Implementation for User Story 2

- [X] T011 [US2] Em `lib/acoes/avaliacoes.ts`, criar o núcleo puro
  `painelavaliacoesCurso_(planejadas, disciplinasCurso, avaliacoesReais, hoje)` — adaptado de
  `getDashboardavaliacoes` (`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 952, research.md achado 4): casamento por
  nome normalizado (RN-AVAL-01); classifica cada lançamento por `TA_Inicial` preenchido →
  `Concluída`, vazio e `Data_Avaliacao` = `hoje` → `Em andamento`, vazio e no passado → `Atrasada`,
  vazio e no futuro → `Pendente`, `Status = Cancelada` → `Cancelada` (checado primeiro); devolve o
  formato "Item do painel" de `data-model.md`. Recebe `hoje` como parâmetro (determinístico,
  testável). **Nunca** inclui `Formula_MF`/`Carater` no retorno (FR-008).
- [X] T012 [P] [US2] Em `tests/unidade/regras_normativas.test.ts`, testes `pnpm vitest run` para
  `painelavaliacoesCurso_`: item sem lançamento → `Sem correspondência`; lançamento com `TA_Inicial`
  → `Concluída`; sem `TA_Inicial` e data = hoje → `Em andamento`; sem `TA_Inicial` e data passada →
  `Atrasada`; sem `TA_Inicial` e data futura → `Pendente`; `Cancelada` não conta como Pendente nem
  Atrasada; múltiplos lançamentos casados (edge case reaplicação/recuperação). Depende de T011.
- [X] T013 [US2] Em `lib/acoes/avaliacoes.ts`, criar o wrapper de I/O
  `getPainelavaliacoesCurso(idCurso)` — lê `avaliacoes_planejadas`/`disciplinas`/`avaliacoes`
  filtrados pelo curso, chama `painelavaliacoesCurso_` (T011) com `hoje = new Date()`. Contrato em
  `contracts/server-functions.md`. Depende de T011.
- [X] T014 [P] [US2] Em `lib/acoes/crud.ts`, criar `crudExcluir(nomeAba, idColuna, idValor)`
  genérico — localiza a linha pelo valor de `idColuna`, grava `Status = 'Cancelada'` (mais
  `Editado_Por`/`Timestamp_Edicao` quando as colunas existirem), nunca `deleteRow` (C-05).
- [X] T015 [US2] Em `lib/acoes/avaliacoes.ts`, criar `cancelarAvaliacao(idAvaliacao)` — usa
  `crudExcluir` (T014) sobre a tabela `avaliacoes`. Contrato em `contracts/server-functions.md`.
  Depende de T014.
- [X] T016 [US2] Em `app/(app)/cursos/[curso]/page.tsx`, acrescentar o bloco "Avaliações": tabela por
  item planejado (disciplina, situação como badge, lançamentos casados) e botão de cancelar por
  lançamento — consome `getPainelavaliacoesCurso` (T013) e `cancelarAvaliacao` (T015), no mesmo
  padrão condicional dos blocos de teto já existentes. Confirma visualmente que nenhum campo de
  `Formula_MF`/`Carater` aparece (FR-008).

**Checkpoint**: o painel mostra a situação de execução correta (Pendente/Em andamento/Atrasada
antes de aplicar; Concluída depois) de qualquer curso consultado.

---

## Phase 5: User Story 3 - Sinalizar automaticamente vista de prova atrasada (Priority: P3)

**Goal**: cada lançamento aplicado mostra a lateness da vista sem nenhum cálculo novo no backend —
`Status_Vista` já é `FORMULA` nativa do banco (research.md, achado 3).

**Independent Test**: com uma avaliação aplicada há mais de 7 dias corridos sem vista registrada,
confirmar que ela aparece como `Atrasada` no painel sem nenhuma ação manual (`spec.md`, US3
Independent Test).

### Implementation for User Story 3

- [X] T017 [US3] No bloco "Avaliações" de `app/(app)/cursos/[curso]/page.tsx` (T016), exibir
  `statusVista` de cada lançamento aplicado (já incluído no retorno de `getPainelavaliacoesCurso`,
  T013) como badge separado (`Realizada`/`Atrasada`/`Pendente`) ao lado da situação de execução —
  nenhuma chamada nova ao backend. Depende de T016.

**Checkpoint**: vista atrasada aparece sinalizada automaticamente para qualquer curso consultado.

---

## Phase 6: User Story 4 - Registrar qualquer pessoa como fiscal da vista de prova (Priority: P4)

**Goal**: qualquer pessoa — instrutor habilitado, instrutor não habilitado ou pessoa sem cadastro —
pode ser registrada como fiscal da vista, sem exigência de habilitação (que continua valendo só
para o aplicador, já restaurada em T004).

**Independent Test**: registrar a vista de uma avaliação já aplicada usando um instrutor não
habilitado e, depois, uma pessoa sem cadastro de instrutor como fiscal; confirmar que ambos são
aceitos sem erro de habilitação (`spec.md`, US4 Independent Test).

### Implementation for User Story 4

- [X] T018 [US4] Em `lib/acoes/avaliacoes.ts`, criar `registrarVistaProva(obj)` — localiza a
  linha existente por `ID_Avaliacao` (erro se `TA_Inicial` ainda vazio — FR-014 exige a aplicação
  já ter acontecido); grava `Data_Vista_Prova`/`TA_Inicial_Vista`/`Tempos_Consumidos_Vista`/
  `Local_Vista`/`ID_Fiscal` ou `Nome_Fiscal_Externo` (mutuamente exclusivos, valida que exatamente
  um dos dois foi informado). **Nunca** chama `instrutorHabilitado_` para o fiscal (RN-INST-01
  delimitada). Contrato em `contracts/server-functions.md`.
- [X] T019 [US4] No bloco "Avaliações" de `app/(app)/cursos/[curso]/page.tsx` (T016), acrescentar o
  formulário de registro de vista: seleciona um lançamento **já aplicado** (`Concluída`) da lista
  já carregada, campos de data/TA inicial/tempos consumidos/local, e fiscal (select de instrutor
  **ou** campo de texto livre para pessoa externa, mutuamente exclusivos no form) — consome
  `registrarVistaProva` (T018). Depende de T016 e T018.

**Checkpoint**: todas as 4 User Stories funcionam de ponta a ponta, independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T020 [P] Rodar `pnpm vitest run` de novo e comparar com a contagem de baseline de
  T001 — confirmar zero regressão e os novos casos de T005/T007/T012 passando (ver `quickstart.md`).
- [X] T021 [P] Atualizar `o histórico de deploys da Vercel` (novo `o SHA do commit`, arquivos alterados) e criar o
  registro em `implantacao/historico/` para este épico, mesmo padrão do Épico E.
- [X] T022 Atualizar `CLAUDE.md` com o estado do Épico I (implementado, aguardando implantação via
  `o fluxo Git → Vercel` e teste de aceite conforme `quickstart.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — **bloqueia** todas as User Stories. T002 bloqueia
  T003; T003 bloqueia T004; T004 bloqueia T005.
- **User Stories (Phase 3–6)**: todas dependem da Foundational completa (T004). Entre si:
  - US1 (T006–T010) depende só de T004.
  - US2 (T011–T016) depende **estruturalmente** de US1 no sentido conceitual (a classificação de
    situação só faz sentido com o mecanismo de agendar/aplicar já existindo), mas no código só
    depende de T004 — pode ser escrita em paralelo a US1 se o dado de teste já simular linhas com
    e sem `TA_Inicial`.
  - US3 (T017) depende **estruturalmente** de US2 — mesmo bloco de `app/(app)/cursos/[curso]/page.tsx` (T016).
  - US4 (T018–T019) é independente de US1/US2/US3 no backend, mas T019 (frontend) reaproveita a
    lista já carregada por T016 — mesmo arquivo, roda depois. Essa dependência é reconhecida
    explicitamente em `spec.md`, US4 ("Why this priority": "só reaproveita a mesma tela no
    frontend por conveniência") — fecha o achado F2 do `/speckit-analyze`.
- **Polish (Phase 7)**: depende de todas as User Stories desejadas estarem completas.

### Parallel Opportunities

- T002 (Foundational) não tem dependência — pode começar imediatamente.
- T005 (teste RN-INST-01) em paralelo a T006–T010 (US1) — depende só de T004.
- T007 (teste RN-AVAL-02) em paralelo a T008–T010 — depende só de T006.
- T012 (teste painel) em paralelo a T013–T016 — depende só de T011.
- T014 (`crudExcluir`, arquivo `lib/acoes/crud.ts`) em paralelo a T011/T013 (`lib/acoes/avaliacoes.ts`).
- T018 (backend de US4) pode ser escrita em paralelo a T006–T017 — arquivo `lib/acoes/avaliacoes.ts`
  compartilhado, mas função independente; só a integração de frontend (T019, depois de T016)
  precisa ser sequencial.
- T020, T021, T022 (Polish) são arquivos/ações independentes entre si.

---

## Parallel Example: Foundational → User Story 1

```bash
# T002 primeiro (`lib/supabase/server.ts`); depois T003 (`lib/dominio/regras-normativas.ts`) e, só então, T004 (`lib/acoes/avaliacoes.ts`).
# Com T004 pronto, em paralelo:
Task: "T005 - teste RN-INST-01 em tests/regras_de_negocio_backend.test.ts"
Task: "T006 - aplicarAvaliacaoNoDsa em `lib/acoes/avaliacoes.ts` (User Story 1)"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (T002–T005) — bloqueia tudo.
3. Completar Phase 3: User Story 1 (agendar sem consumir TA + aplicar no DSA + sugestão).
4. **Parar e validar**: rodar os testes Node; agendar e depois aplicar uma avaliação real,
   conferindo que a CHD só sobe no segundo passo.

### Entrega incremental

1. Setup + Foundational → `registrarAvaliacao` corrigida (agendamento puro + habilitação).
2. US1 → agendar/aplicar funcionando, sugestão no DSA → validar → commit.
3. US2 → painel com a situação correta em cada etapa → validar → commit.
4. US3 → vista atrasada sinalizada → validar → commit (mudança pequena, mesmo bloco de US2).
5. US4 → vista de prova registrável por qualquer fiscal → validar → commit.
6. Polish → suíte verde, `o SHA do commit`/`o histórico de deploys da Vercel`/`CLAUDE.md` prontos para implantação via `o fluxo Git → Vercel`.

### Estratégia de commit (Princípio VI)

Um commit por tarefa ou por grupo pequeno e coerente (ex.: T002+T003+T004+T005 juntas, por serem
uma única correção lógica de `registrarAvaliacao` com o teste que a acompanha) — não um commit
único "implementa Épico I".

---

## Notes

- [P] = arquivos diferentes, sem dependência de autoria.
- [Story] mapeia cada tarefa à história de usuário correspondente em `spec.md`.
- T004 é a tarefa mais sensível desta feature: corrige duas regressões reais (habilitação do
  aplicador, e a exigência indevida de TA/tempos no agendamento) — merece revisão cuidadosa antes
  do commit, não só rodar os testes.
- T005/T007 são novas em relação à primeira versão deste `tasks.md` — fecham os achados C1/E1 do
  relatório de `/speckit-analyze` (RN-INST-01 e RN-AVAL-02, ambas Risco Alto, sem teste nomeado
  antes desta feature).
- Nenhuma tarefa desta feature toca `avaliacoes_planejadas` em modo de escrita — o catálogo
  continua estático (`quickstart.md`, "O que NÃO esperar desta feature").
- A prévia do DSA entregue (T008/T010) é uma lista de sugestões, não a grade posicional por TA —
  limite de escopo explícito, research.md achado 6.
