---

description: "Task list template for feature implementation"
---

# Tasks: Épico F — RBAC Ampliado e Gestão de Usuários

**Input**: Design documents de `/specs/004-rbac-ampliado-usuarios/`

**Prerequisites**: plan.md (obrigatório), spec.md (histórias de usuário), research.md, data-model.md, contracts/server-functions.md, quickstart.md

**Tests**: mesma decisão de arquitetura dos épicos anteriores: núcleo de decisão **puro**
(`cursoDentroDoEscopoOperador_`) ganha teste `pnpm vitest run` imediato. As duas regras Risco Alto que
esta feature toca de verdade (`RN-RBAC-01`, nunca testada antes; `RN-RBAC-02` ampliada) ganham
teste nomeado no harness de mock o cliente Supabase já estabelecido (`tests/unidade/regras_de_negocio_backend.test.ts`).
Wrappers finos de CRUD (`lib/acoes/usuarios.ts`/`lib/acoes/instrutores.ts`/`lib/acoes/disciplinas.ts`) seguem o padrão de
cobertura parcial já usado para `registrarAvaliacao`/`registrarVistaProva` — sem teste Node
dedicado, exceto a validação de e-mail duplicado (regra de negócio própria, não só repasse para
`crudCriar`).

**Bloqueio conhecido**: idêntico aos épicos anteriores — tarefas que tocam o cliente Supabase só são
verificáveis de ponta a ponta contra o banco V2.0 ao vivo (já publicada e implantada via
`o fluxo Git → Vercel`).

**Organização**: Tarefas agrupadas por história de usuário (spec.md, US1/US2/US3, mais **US4**
acrescentada nesta revisão — achado C1 do `/speckit-analyze`, ver Notes). A Foundational é maior
que a dos épicos anteriores porque as 4 histórias compartilham o mesmo domínio de perfis, o mesmo
motor CRUD estendido e o mesmo guard de escopo — nenhuma delas roda sem essa base.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: A qual história de usuário esta tarefa pertence (US1/US2/US3/US4, spec.md)
- Caminhos de arquivo exatos em cada descrição, relativos a `CIAARA-11-v2/`

## Path Conventions

`lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts` — convenção já em uso no projeto.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` para registrar a contagem de baseline (82 testes,
  71 passam, 11 `todo`, herdada do Épico I) antes de iniciar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: domínio de perfis, motor CRUD estendido (leitura/escrita por aba, `crudAtualizar`
genérico) e guard de escopo — nenhuma User Story roda sem isto.

**⚠️ CRITICAL**: nenhuma User Story desta feature roda sem esta fase completa.

- [X] T002 [P] Em `lib/supabase/server.ts`, acrescentar `PERFIS` (array dos 9 valores, research.md
  achado 0), `PERFIS_TODOS` (mesmo array, nome semântico para uso em `exigirFuncao`),
  `PERFIS_DIVISAO_ADMIN_ACADEMICA` (`['Encarregado_Divisao_Administracao_Academica',
  'Ajudante_Divisao_Administracao_Academica']`), `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` (idem para
  a outra divisão), e `'usuario_curso': 'usuario_curso'` — declarações estáticas, sem código
  executável de nível superior.
- [X] T003 [P] Em `lib/dominio/regras-normativas.ts`, criar
  `cursoDentroDoEscopoOperador_(escopoCurso, curso, turma)` — núcleo puro (data-model.md,
  "Mapeamento de `Escopo_Curso`"): `Geral`/vazio → `true`; `Regular`/`Expedito`/
  `Estagio_Qualificacao` → compara `curso.Classificacao`; `EAD_Semipresencial` → compara
  `turma.Modalidade`; senão `false`.
- [X] T004 [P] Em `tests/unidade/regras_normativas.test.ts`, testes `pnpm vitest run` para
  `cursoDentroDoEscopoOperador_`: `Geral` sempre autoriza; `Regular`/`Expedito`/
  `Estagio_Qualificacao` batendo/não batendo `Classificacao`; `EAD_Semipresencial` batendo/não
  batendo `Modalidade` (não `Classificacao` — confirma que são campos diferentes); curso
  `Especial`/`Aperfeiçoamento Avançado` só autorizado com escopo `Geral`. Depende de T003.
- [X] T005 Em `lib/dominio/regras-normativas.ts`, corrigir `instrutorHabilitado_` (research.md,
  achado 5): passa a exigir também `instrutores.Status = 'Ativo'`, além do
  `instrutor_disciplina.Status = 'Ativo'` que já checava. Depende de T002 (`'instrutores'`, já
  existente desde o Épico I).
- [X] T006 [P] Em `tests/unidade/regras_de_negocio_backend.test.ts`, criar
  `describe("RN-INST-01 - instrutor inativo nunca habilitado, mesmo com vinculo Ativo")` — usando
  o mock do cliente Supabase já existente. Depende de T005.
- [X] T007 Em `lib/acoes/crud.ts`, criar `crudAtualizar(nomeAba, id, obj)` genérico — portado de
  `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 694 (research.md achado 2): localiza a linha pela primeira coluna
  (`ID`), escreve só os campos presentes em `obj`, nunca sobrescreve o próprio ID nem colunas de
  `COLUNAS_FORMULA`.
- [X] T008 Em `lib/acoes/crud.ts`, alterar `crudListar` para chamar `exigirFuncao(cfg.leitura)`
  em vez do `['Admin', 'Operador']` hardcoded (research.md achado 1); alterar `crudExcluir` para
  gravar `cfg.statusInativo || 'Cancelada'` em vez de `'Cancelada'` fixo (preserva o comportamento
  atual de `avaliacoes`, que não define `statusInativo`).
- [X] T009 Em `lib/acoes/crud.ts`, atualizar `CRUD_CONFIG`: acrescentar `leitura: PERFIS_TODOS`
  em `atividades_nao_letivas` e `avaliacoes` (já existentes, `escrita` inalterada); acrescentar
  as 6 entradas novas — `usuarios` (`leitura: PERFIS_TODOS`, `escrita: ['Admin']`,
  `statusInativo: 'Inativo'`), `instrutores` (`leitura: PERFIS_TODOS`,
  `escrita: ['Admin','Operador'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)`,
  `statusInativo: 'Inativo'`), `instrutor_disciplina` (mesma `escrita` de `instrutores`,
  prefixo `VIN`), `usuario_curso` (`leitura: PERFIS_TODOS`, `escrita: ['Admin']`, prefixo `VIN`),
  `disciplinas` (`leitura: PERFIS_TODOS`,
  `escrita: ['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA).concat(PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA)`),
  `avaliacoes_planejadas` (`leitura: PERFIS_TODOS`,
  `escrita: ['Admin'].concat(PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA)`, prefixo `AVP`) — as duas
  últimas fecham o achado C1 do `/speckit-analyze` (FR-009, research.md achado 7). Tabela completa
  em `data-model.md`. Depende de T002 (`PERFIS_TODOS`/`PERFIS_DIVISAO_ADMIN_ACADEMICA`/
  `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA`), T008 (campos `leitura`/`statusInativo` já suportados).
- [X] T010 Em `lib/supabase/middleware.ts` + policies RLS`, criar `exigirEscopoCurso_(usuario, idCurso)` e
  `exigirEscopoTurma_(usuario, idTurma)` — bloqueiam com `"Você não tem acesso a este curso."`
  quando: `usuario.perfil === 'Encarregado_Curso'` e o curso não está em `usuario_curso` para esse
  usuário; ou `usuario.perfil === 'Operador'` e `cursoDentroDoEscopoOperador_` (T003) devolve
  `false`. Qualquer outro perfil passa sempre (leitura total, `data-model.md`).
  `exigirEscopoTurma_` resolve `idCurso` via `turmas` e delega para a mesma lógica. Depende
  de T002, T003.
- [X] T011 [P] Em `tests/unidade/regras_de_negocio_backend.test.ts`, criar
  `describe("RN-RBAC-01 - email nao cadastrado ou inativo nunca executa nada")` — converte o stub
  `test.todo` de `tests/unidade/pendentes.test.ts` (primeira vez que esta regra Risco Alto ganha teste
  real na suíte). Remove o `test.todo` correspondente de `tests/unidade/pendentes.test.ts`.
- [X] T012 [P] Em `tests/unidade/regras_de_negocio_backend.test.ts`, criar
  `describe("RN-RBAC-02 - permissao de escrita por area de dado")` — confirma, para cada área
  nova de `CRUD_CONFIG` (T009): `instrutores`/`instrutor_disciplina` aceitam
  `Operador`/`PERFIS_DIVISAO_ADMIN_ACADEMICA` e bloqueiam `Visualizacao`/`Encarregado_Curso`;
  `disciplinas` aceita `PERFIS_DIVISAO_ADMIN_ACADEMICA` **e**
  `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA`; `avaliacoes_planejadas` aceita só
  `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` (bloqueia `Operador` e
  `PERFIS_DIVISAO_ADMIN_ACADEMICA`, confirmando a leitura do research.md achado 7). Depende de
  T009.

**Checkpoint**: infraestrutura pronta — as 4 User Stories podem começar.

---

## Phase 3: User Story 1 - Cada perfil vê e edita exatamente o que a matriz autoriza (Priority: P1) 🎯 MVP

**Goal**: os 9 perfis conseguem carregar o sistema e ler o que o documento 01 autoriza; escrita
continua restrita a quem já podia; nenhum perfil recém-desbloqueado vê um botão que não pode usar.

**Independent Test**: cadastrar um usuário de cada perfil (via edição direta do banco, já que
`app/(app)/admin/usuarios/page.tsx` só existe na User Story 2) e confirmar que cada um carrega o contexto inicial
com os dados corretos, que um Operador/Encarregado de Curso fora de escopo é bloqueado ao pedir um
curso que não é dele, e que nenhum botão de escrita aparece para quem não pode usá-lo (`spec.md`,
US1 Independent Test).

### Implementation for User Story 1

- [X] T013 [US1] Em `app/layout.tsx` + `lib/supabase/server.ts``, `getContextoInicial` passa a chamar
  `exigirFuncao(PERFIS_TODOS)` em vez de `['Admin', 'Operador']`, e filtra `cursos`/`turmas` pelo
  escopo do usuário autenticado (`cursoDentroDoEscopoOperador_` para `Operador`,
  `usuario_curso` para `Encarregado_Curso`, sem filtro para os demais perfis). Depende de T002,
  T003, T010.
- [X] T014 [US1] Em `lib/acoes/avaliacoes.ts`, `getPainelavaliacoesCurso` passa a chamar
  `exigirFuncao(PERFIS_TODOS)` seguido de `exigirEscopoCurso_(usuario, idCurso)`. Depende de T010.
- [X] T015 [P] [US1] Em `lib/acoes/cronograma.ts`, `getCronos` passa a chamar
  `exigirFuncao(PERFIS_TODOS)` seguido de `exigirEscopoTurma_(usuario, idTurma)`. Depende de T010.
- [X] T016 [P] [US1] Em `lib/acoes/dsa.ts`, `getDsaSemanal` passa a chamar
  `exigirFuncao(PERFIS_TODOS)` seguido de `exigirEscopoTurma_(usuario, idTurma)`. Depende de T010.
- [X] T017 [P] [US1] Em `lib/acoes/relatorio.ts`, `getRelatorio` passa a chamar
  `exigirFuncao(PERFIS_TODOS)` seguido de `exigirEscopoCurso_(usuario, idCurso)`. Depende de T010.
- [X] T018 [US1] Em `components/ciaara/`, confirmar que `AppState.ctx.usuario.perfil` fica
  disponível para qualquer view decidir o que mostrar (já é gravado por `getContextoInicial`, T013
  — esta tarefa acrescenta um helper `perfilEm_(lista)` de conveniência, usado por T019 abaixo e
  pelas rotas novas das User Stories 2/3/4).
- [X] T019 [US1] Em `app/(app)/atividades/page.tsx`, `app/(app)/cursos/[curso]/page.tsx` e
  `app/(app)/turmas/[turma]/dsa/page.tsx`, esconder (usando `perfilEm_`, T018) todo botão de escrita
  (agendar, lançar AEC/TAD/TR, aplicar no DSA, cancelar, registrar vista) quando
  `AppState.ctx.usuario.perfil` não está em `['Admin', 'Operador']` — fecha o achado H1 do
  `/speckit-analyze` (RF-AUTH-04): antes desta feature, nenhum perfil além desses dois alcançava
  essas telas; depois de T013–T017, alcançam, e sem esta tarefa veriam botões que FR-012 bloqueia
  só no clique. Depende de T013, T018.

**Checkpoint**: qualquer um dos 9 perfis carrega o sistema, lê exatamente o que a matriz autoriza,
e nunca vê um botão de escrita que não pode usar — verificável de ponta a ponta (banco da v2.1 já
publicada).

---

## Phase 4: User Story 2 - Admin gerencia usuários numa tela dedicada (Priority: P1)

**Goal**: Admin cadastra, edita perfil/escopo/vínculo de curso e desativa usuários sem editar a
planilha.

**Independent Test**: como Admin, cadastrar um usuário, confirmar login bem-sucedido; editar o
perfil; desativar e confirmar acesso negado no próximo acesso; tentar cadastrar um e-mail
duplicado e confirmar a rejeição (`spec.md`, US2 Independent Test).

### Implementation for User Story 2

- [X] T020 [US2] Criar `lib/acoes/usuarios.ts` com `listarusuarios()`, `cadastrarUsuario(obj)`
  (valida `Email`/`Perfil` obrigatórios, `Perfil` no domínio de `PERFIS`, e-mail não duplicado —
  case-insensitive, edge case do `spec.md`), `atualizarUsuario(idUsuario, obj)`,
  `desativarUsuario(idUsuario)` — wrappers finos sobre `crudListar`/`crudCriar`/`crudAtualizar`/
  `crudExcluir` (T007, T008, T009). Contrato em `contracts/server-functions.md`.
- [X] T021 [US2] Em `lib/acoes/usuarios.ts`, criar `vincularUsuarioACurso(idUsuario, idCurso)` e
  `desvincularUsuarioDeCurso(idVinculo)` — valida que `usuarios[idUsuario].Perfil ===
  'Encarregado_Curso'` antes de gravar em `usuario_curso` (`crudCriar`/`crudExcluir`). Depende de
  T020, T009.
- [X] T022 [P] [US2] Em `tests/unidade/regras_de_negocio_backend.test.ts`, teste para `cadastrarUsuario`
  rejeitando e-mail já cadastrado (case-insensitive). Depende de T020.
- [X] T023 [US2] Criar `app/(app)/admin/usuarios/page.tsx`: tabela de usuários (`listarusuarios`),
  formulário de cadastro/edição (e-mail, nome, perfil, escopo de curso quando `Perfil=Operador`),
  botão de desativar, e um bloco condicional (visível só quando `Perfil=Encarregado_Curso`) para
  vincular/desvincular cursos. Depende de T020, T021.
- [X] T024 [US2] Em `app/layout.tsx`, acrescentar a rota `#tabusuarios` (link de menu
  visível só para `Perfil='Admin'`, usando `AppState.ctx.usuario.perfil` — RF-AUTH-04). Depende de
  T023, T018.

**Checkpoint**: Admin gerencia usuários inteiramente pela tela dedicada.

---

## Phase 5: User Story 3 - Operador e Divisão de Administração Acadêmica cadastram instrutor e habilitação (Priority: P2)

**Goal**: cadastro/edição/desativação de instrutor e criação de vínculo de habilitação sem
depender de Admin.

**Independent Test**: como Operador, cadastrar um instrutor, criar seu vínculo de habilitação,
desativá-lo; confirmar que `Visualizacao`/`Encarregado_Curso` são bloqueados na mesma ação
(`spec.md`, US3 Independent Test).

### Implementation for User Story 3

- [X] T025 [US3] Criar `lib/acoes/instrutores.ts` com `listarInstrutores()`,
  `cadastrarInstrutor(obj)`, `atualizarInstrutor(idInstrutor, obj)`, `desativarInstrutor(idInstrutor)`
  — wrappers finos sobre `crudListar`/`crudCriar`/`crudAtualizar`/`crudExcluir` (T007, T008, T009).
  Contrato em `contracts/server-functions.md`.
- [X] T026 [US3] Em `lib/acoes/instrutores.ts`, criar `criarVinculoHabilitacao(obj)` — valida
  `ID_Instrutor` existente e `Ativo`, `ID_Grade` existente em `disciplinas`; grava em
  `instrutor_disciplina` via `crudCriar`. Depende de T025, T009.
- [X] T027 [US3] Criar `app/(app)/instrutores/page.tsx`: tabela de instrutores
  (`listarInstrutores`), formulário de cadastro/edição, botão de desativar, e formulário de
  vínculo de habilitação (seleciona instrutor + disciplina). Depende de T025, T026.
- [X] T028 [US3] Em `app/layout.tsx`, acrescentar a rota `#tabInstrutores` (link de menu
  visível para `Admin`/`Operador`/`PERFIS_DIVISAO_ADMIN_ACADEMICA` — RF-AUTH-04). Depende de T027,
  T018.

**Checkpoint**: instrutor e vínculo de habilitação cadastráveis sem Admin.

---

## Phase 6: User Story 4 - Divisão de Orientação Pedagógica edita disciplinas e avaliações planejadas (Priority: P2)

**Goal**: Encarregado/Ajudante da Divisão de Orientação Educacional e Pedagógica editam
disciplinas e o catálogo de avaliações planejadas, sem depender de Admin — fecha o achado C1 do
`/speckit-analyze` (FR-009 não tinha nenhuma tarefa na primeira versão deste documento, apesar de
fazer parte do cenário 5 da User Story 1).

**Independent Test**: como Encarregado da Divisão de Orientação Educacional e Pedagógica, editar
uma disciplina e um item do catálogo de avaliações planejadas; confirmar que um Operador ou a
Divisão de Administração Acadêmica **não** conseguem editar `avaliacoes_planejadas` (só
`disciplinas`, que ambas as divisões compartilham); confirmar que `Visualizacao` é bloqueada
em ambas.

### Implementation for User Story 4

- [X] T029 [US4] Criar `lib/acoes/disciplinas.ts` com `listarDisciplinas()`,
  `atualizarDisciplina(idGrade, obj)` — wrappers finos sobre `crudListar`/`crudAtualizar` (T007,
  T008, T009) sobre `disciplinas`. Contrato em `contracts/server-functions.md`.
- [X] T030 [US4] Em `lib/acoes/disciplinas.ts`, criar `listaravaliacoesPlanejadas(idCurso)`,
  `atualizarAvaliacaoPlanejada(idItem, obj)` — wrappers finos sobre `crudListar`/`crudAtualizar`
  sobre `avaliacoes_planejadas`. Depende de T009.
- [X] T031 [US4] Criar `app/(app)/disciplinas/page.tsx`: tabela de disciplinas do curso
  selecionado (`listarDisciplinas`) com formulário de edição; tabela do catálogo de avaliações
  planejadas (`listaravaliacoesPlanejadas`) com formulário de edição — visível só para quem tem
  pelo menos uma das duas permissões (`perfilEm_`, T018). Depende de T029, T030.
- [X] T032 [US4] Em `app/layout.tsx`, acrescentar a rota `#tabDisciplinas` (link de menu
  visível para `Admin`/`PERFIS_DIVISAO_ADMIN_ACADEMICA`/`PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` —
  RF-AUTH-04). Depende de T031, T018.

**Checkpoint**: todas as 4 User Stories funcionam de ponta a ponta, independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T033 [P] Rodar `pnpm vitest run` de novo e comparar com a contagem de baseline de
  T001 — confirmar zero regressão e os novos casos de T004/T006/T011/T012/T022 passando (ver
  `quickstart.md`).
- [X] T034 [P] Atualizar `o histórico de deploys da Vercel` (novo `o SHA do commit`, arquivos alterados) e criar o
  registro em `implantacao/historico/`, mesmo padrão dos épicos anteriores.
- [X] T035 Atualizar `CLAUDE.md` com o estado do Épico F (implementado, aguardando implantação via
  `o fluxo Git → Vercel` e teste de aceite conforme `quickstart.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — **bloqueia** todas as User Stories. T002/T003
  não têm dependência entre si (arquivos diferentes); T004 depende de T003; T005 depende de T002;
  T006 depende de T005; T007/T008 são edições sequenciais do mesmo arquivo (`lib/acoes/crud.ts`), T009
  depende de T002 e T008; T010 depende de T002 e T003; T011 é independente (só ``lib/supabase/middleware.ts` + policies RLS`, já
  existente); T012 depende de T009.
- **User Stories (Phase 3–6)**: todas dependem da Foundational completa. Entre si:
  - US1 (T013–T019) depende só da Foundational.
  - US2 (T020–T024) depende da Foundational (T007–T009) e de T018 (helper de perfil) — não
    depende do restante de US1.
  - US3 (T025–T028) depende da Foundational (T007–T009) e de T018 — independente de US1/US2/US4
    no backend.
  - US4 (T029–T032) depende da Foundational (T007–T009, especialmente as entradas de
    `disciplinas`/`avaliacoes_planejadas`) e de T018 — independente de US1/US2/US3 no backend.
- **Polish (Phase 7)**: depende de todas as User Stories desejadas estarem completas.

### Parallel Opportunities

- T002 e T003 (Foundational) podem começar em paralelo — arquivos diferentes, sem dependência.
- T004, T006, T011, T012 (testes) podem ser escritos em paralelo entre si, cada um só dependendo
  da tarefa de implementação correspondente.
- T015, T016, T017 (US1 — `lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`/`lib/acoes/relatorio.ts`) são arquivos diferentes, podem
  rodar em paralelo entre si e com T014 (`lib/acoes/avaliacoes.ts`).
- US2 (T020–T024), US3 (T025–T028) e US4 (T029–T032) podem ser implementadas em paralelo —
  arquivos backend diferentes (`lib/acoes/usuarios.ts`/`lib/acoes/instrutores.ts`/`lib/acoes/disciplinas.ts`), frontend
  diferente (`app/(app)/admin/usuarios/page.tsx`/`app/(app)/instrutores/page.tsx`/`app/(app)/disciplinas/page.tsx`); só a edição de
  `app/layout.tsx` (T024, T028, T032) precisa ser sequencial (mesmo arquivo).
- T033, T034, T035 (Polish) são arquivos/ações independentes entre si.

---

## Parallel Example: Foundational

```bash
# T002 (`lib/supabase/server.ts`) e T003 (`lib/dominio/regras-normativas.ts`) em paralelo:
Task: "PERFIS + agrupamentos + 'usuario_curso' em `lib/supabase/server.ts` (T002)"
Task: "cursoDentroDoEscopoOperador_ em `lib/dominio/regras-normativas.ts` (T003)"
# Depois de T002/T003 prontos, em paralelo:
Task: "teste cursoDentroDoEscopoOperador_ (T004)"
Task: "exigirEscopoCurso_/exigirEscopoTurma_ em `lib/supabase/middleware.ts` + policies RLS (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (T002–T012) — bloqueia tudo, é o grosso do trabalho novo desta
   feature.
3. Completar Phase 3: User Story 1 (matriz de perfis aplicada às 5 funções de leitura já
   existentes, botões de escrita escondidos para quem não pode usá-los).
4. **Parar e validar**: rodar a suíte Node; cadastrar manualmente (vio banco) um usuário de
   cada perfil e confirmar login/leitura corretos, e que nenhum botão de escrita indevido aparece.

### Entrega incremental

1. Setup + Foundational → domínio de perfis, motor CRUD estendido, guard de escopo prontos.
2. US1 → 9 perfis conseguem ler o que já existe, sem ver botões que não podem usar → validar →
   commit.
3. US2 → Admin gerencia usuários pela tela → validar → commit (paralelo a US3/US4 se houver
   capacidade).
4. US3 → Operador/Divisão de Administração Acadêmica cadastram instrutor e habilitação → validar
   → commit.
5. US4 → Divisão de Orientação Pedagógica edita disciplinas/avaliações planejadas → validar →
   commit.
6. Polish → suíte verde, `o SHA do commit`/`o histórico de deploys da Vercel`/`CLAUDE.md` prontos para implantação via
   `o fluxo Git → Vercel`.

### Estratégia de commit (Princípio VI)

Um commit por tarefa ou por grupo pequeno e coerente (ex.: T007+T008+T009, por serem a mesma
extensão lógica do motor `lib/acoes/crud.ts`) — não um commit único "implementa Épico F".

---

## Notes

- [P] = arquivos diferentes, sem dependência de autoria.
- [Story] mapeia cada tarefa à história de usuário correspondente em `spec.md`.
- T009 é a tarefa mais sensível desta feature: qualquer erro na tabela de `CRUD_CONFIG` abre ou
  fecha acesso de escrita incorretamente para um perfil inteiro — conferir contra a tabela de
  `data-model.md` linha a linha antes do commit.
- **User Story 4 e T019 foram acrescentadas nesta revisão**, fechando os achados C1 (CRITICAL) e
  H1 (HIGH) de uma rodada de `/speckit-analyze`: a primeira versão deste `tasks.md` não tinha
  nenhuma tarefa para FR-009 (escrita da Divisão de Orientação Pedagógica — parte do próprio
  cenário 5 da User Story 1, P1/MVP) e não escondia os botões de escrita das 3 telas herdadas dos
  Épicos E/I para os perfis recém-desbloqueados por US1.
- RF-AUTH-04 (ocultar elemento restrito) é aplicado incrementalmente pelas telas que cada User
  Story cria/toca (T018/T019/T024/T028/T032) — não é um retrofit de todo botão já existente em
  módulos que nenhuma história desta feature toca (ex.: futuros módulos do Épico G).
- Nenhuma tarefa desta feature cria uma tela de autoatendimento para o perfil Instrutor — fora de
  escopo (documento 01, Tema S, adiado para v3.0).
