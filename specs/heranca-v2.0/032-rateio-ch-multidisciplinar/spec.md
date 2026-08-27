# Feature Specification: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

**Feature Branch**: `032-rateio-ch-multidisciplinar`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Motor de Atribuição de Instrutores Filtrados (Com Exceção
Multidisciplinar) e Rateio de Carga Horária. A funcionalidade de 'Editar' uma disciplina em uma
turma precisa filtrar instrutores habilitados. Atividades práticas de fim de curso são eventos
multidisciplinares — para estas disciplinas específicas, o filtro deve ser ampliado para o nível do
Curso. Checkboxes de instrutores (sem busca livre), filtro restrito para disciplinas comuns e filtro
abrangente (nível curso) para disciplinas de encerramento. Checkbox opcional 'Dividir Carga Horária
Igualmente entre os selecionados' — ao salvar, se marcado e houver mais de 1 instrutor selecionado,
divide a carga horária total da disciplina pelo número de instrutores."

## Achados reais (leitura de código e documentação de Fase 1 antes de escrever qualquer requisito)

- **A regra "LHFC/Prática de Fim de Curso" já existe no sistema, nunca implementada.**
  `disciplinas.Modo_Atribuicao_Padrao` é um ENUM `(Dividido, Simultaneo)` já cadastrado desde a
  migração (`docs/arquitetura/01-schema.md` §5.2/§6.6). `RN-MAT-05` (`docs/fase-1/04-Regras-de-
  Negocio-a-Preservar.md`, já **✅ CONFORME** — aprovada, nunca implementada em código) descreve
  exatamente isso: **modo dividido** (padrão) — instrutores repartem entre si a CH total; **modo
  simultâneo** — cada instrutor designado acumula a CH **integral**, por atuarem concomitantemente
  com grupos distintos de alunos. O modo simultâneo se aplica a **3** disciplinas de encerramento já
  semeadas com `Simultaneo` na migração — Prática de Fim de Curso, Levantamento Hidrográfico de Fim
  de Curso (LHFC) e **Prática de Manutenção de Auxílios à Navegação** (esta terceira não constava no
  pedido original) — "e qualquer outra disciplina assim marcada no cadastro". Busca em todo
  `src/backend`/`src/frontend` confirma: nenhum código lê `Modo_Atribuicao_Padrao`/`Modo_Atribuicao`
  hoje — são campos semeados, nunca consumidos.
- **Decisão confirmada em conversa direta**: a checagem de "disciplina multidisciplinar" usa
  `disciplinas.Modo_Atribuicao_Padrao === 'Simultaneo'`, nunca comparação de string no nome da
  disciplina (`nome.includes("LHFC")` etc., como o pedido original descrevia). É mais robusto (cobre
  as 3 disciplinas reais, não só 2), é a implementação direta de uma regra já aprovada (RN-MAT-05),
  e é administrável pelo cadastro sem mexer em código (constitution Princípio VII, Configuração
  sobre Constante).
- **"CH Cumprida"/"Carga Horária Ministrada" é sempre derivada de aulas realmente lançadas.**
  `somarCargaHorariaPorInstrutor_` (`lib/acoes/instrutores.ts`) soma `Tempos_Consumidos` de `registros_aula` — uma linha por aula real lançada via DSA, um único `ID_Instrutor` por linha (nunca
  CSV, confirmado em `lib/acoes/dsa.ts`). `instrutores.Carga_Horaria_Ministrada_Ano` é protegida contra
  escrita direta (`COLUNAS_FORMULA`, RN-CRUD-02). Não existe hoje nenhum campo de carga horária
  **planejada/alocada** por instrutor em nenhuma aba.
- **Decisão confirmada (correção de interpretação do pedido original, feita pelo usuário)**: o
  rateio pedido é sobre **Carga Horária Prevista** (o que foi planejado na atribuição), nunca a CH
  Cumprida/executada (o que foi de fato dado em aula) — são conceitos **diferentes** no sistema,
  cada um com sua própria fonte de verdade. Esta spec cria um campo novo,
  `turma_disciplina.CH_Prevista_Por_Instrutor`, e **nunca** toca `registros_aula` nem
  `instrutores.Carga_Horaria_Ministrada_Ano`.
- **Decisão confirmada**: a regra de exceção multidisciplinar (filtro) e o rateio de CH Prevista
  valem para **as duas telas** que hoje editam seleção de instrutor por turma+disciplina —
  `app/(app)/cursos/[curso]/page.tsx` (painel "Período das Disciplinas", `checkboxesInstrutor_`, specs 027/029 — nunca
  teve busca livre, nada a remover ali) e `app/(app)/disciplinas/page.tsx` (painel "Editar",
  `abrirEdicaoDisciplinaTurma_`, specs 030/031 — tem busca livre, `filtrarInstrutoresEdicaoDisciplina_`/
  `buscaInstrutorEdicao`, a ser removida). Ambas hoje filtram habilitados só por `v.ID_Grade ===
  l.ID_Grade` (mesmo gap nas duas) e ambas chamam `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) para gravar
  — aplicar a regra só numa tela deixaria a outra como um contorno da "Regra de Negócio Crítica".
- **Decisão confirmada**: o checkbox "Dividir Carga Horária Igualmente" sempre nasce **desmarcado**
  ao abrir o painel de edição — não é dinâmico por `Modo_Atribuicao_Padrao` da disciplina (opção
  mais simples, escolhida pelo usuário em vez da sugestão original do assistente de um estado
  inicial dinâmico).
- **``app/(app)/cursos/[curso]/page.tsx`:abrirPainelPeriodoTurma_` hoje não carrega `disciplinas`** (só `turma_disciplina`/`instrutor_disciplina`/`instrutores`) — precisa ganhar 1 leitura nova para resolver
  `Modo_Atribuicao_Padrao` por `ID_Grade`. `app/(app)/disciplinas/page.tsx` já carrega `disciplinas` do
  curso (`disciplinasCarregadas`, spec 031) — sem leitura nova ali.
- **Fora de escopo, explicitamente**: `instrutor_disciplina.Modo_Atribuicao` (override por vínculo
  individual, ENUM `Herdar/Dividido/Simultaneo`) — esta spec usa só o campo de nível disciplina
  (`disciplinas.Modo_Atribuicao_Padrao`), nunca o override por vínculo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver só os instrutores da disciplina, sem busca livre (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, ao editar uma disciplina comum (ex.
"Navegação"), quero ver só os instrutores habilitados àquela disciplina específica, direto numa
lista de checkboxes — sem precisar digitar nada numa busca para encontrá-los.

**Why this priority**: É o comportamento base — a exceção multidisciplinar (User Story 2) só faz
sentido em contraste com este filtro restrito continuando correto para o caso comum.

**Independent Test**: Editar uma disciplina comum e confirmar que só os instrutores com vínculo
Ativo para aquele `ID_Grade` aparecem, sem nenhum campo de busca no painel.

**Acceptance Scenarios**:

1. **Given** uma disciplina comum (`Modo_Atribuicao_Padrao` = `Dividido` ou vazio), **When** o
   painel de edição abre, **Then** só os instrutores com vínculo Ativo para aquele `ID_Grade`
   aparecem como checkboxes.
2. **Given** o painel de edição de `app/(app)/disciplinas/page.tsx` aberto, **When** o usuário observa a
   tela, **Then** não existe nenhum campo de busca de instrutor.

---

### User Story 2 - Filtro amplo por curso para disciplinas multidisciplinares (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, ao editar uma disciplina de encerramento
multidisciplinar (Prática de Fim de Curso, LHFC, Prática de Manutenção de Auxílios à Navegação, ou
qualquer outra assim marcada no cadastro), quero ver **todos** os instrutores habilitados a
**qualquer** disciplina daquele curso — porque esses eventos são conduzidos por vários instrutores
de especialidades distintas ao mesmo tempo, não só pelos habilitados nominalmente a essa disciplina.

**Why this priority**: É a "Regra de Negócio Crítica" citada no pedido original — sem ela, a
atribuição da equipe completa de um evento prático fica bloqueada pelo filtro restrito.

**Independent Test**: Editar a disciplina "LHFC" (ou outra com `Modo_Atribuicao_Padrao=Simultaneo`)
num curso onde vários instrutores têm habilitações diferentes, e confirmar que todos aparecem —
inclusive um instrutor habilitado só a uma disciplina completamente diferente do mesmo curso.

**Acceptance Scenarios**:

1. **Given** uma disciplina com `disciplinas.Modo_Atribuicao_Padrao = 'Simultaneo'`, **When** o
   painel de edição abre (em qualquer uma das duas telas), **Then** lista todos os instrutores com
   vínculo Ativo para qualquer `ID_Grade` do mesmo `ID_Curso` da turma — não só os habilitados a
   esta disciplina específica.
2. **Given** a mesma disciplina/turma, **When** o painel é aberto em `app/(app)/cursos/[curso]/page.tsx` e depois em
   `app/(app)/disciplinas/page.tsx`, **Then** a lista de instrutores exibida é idêntica nas duas telas.
3. **Given** uma disciplina sem `Modo_Atribuicao_Padrao` preenchido, **When** o painel de edição
   abre, **Then** o sistema trata como `Dividido` (filtro restrito, User Story 1) — nunca como
   `Simultaneo` por omissão.

---

### User Story 3 - Rateio de carga horária prevista ao salvar (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, ao selecionar mais de um instrutor para uma
disciplina, quero poder marcar "Dividir Carga Horária Igualmente" para que o sistema calcule
automaticamente quantos tempos cada instrutor tem previstos — sem precisar fazer a conta manualmente
nem arriscar um total que não bate com a carga horária real da disciplina.

**Why this priority**: É a segunda metade do "Critério de Aceite" do pedido original — sem ela, a
seleção multidisciplinar (User Story 2) não tem como registrar quanto cada instrutor ficou
responsável.

**Independent Test**: Selecionar 4 instrutores numa disciplina de 200 tempos, marcar "Dividir Carga
Horária Igualmente", salvar, e confirmar que cada um fica com 50 tempos previstos — a soma bate
exatamente com 200.

**Acceptance Scenarios**:

1. **Given** o painel de edição aberto, **When** o usuário observa a tela, **Then** existe um
   checkbox "Dividir Carga Horária Igualmente entre os selecionados", sempre desmarcado por padrão.
2. **Given** exatamente 1 instrutor selecionado, **When** o usuário salva (checkbox marcado ou não),
   **Then** aquele instrutor recebe a CH integral da disciplina como CH Prevista — o checkbox não
   tem efeito com só 1 selecionado.
3. **Given** mais de 1 instrutor selecionado e o checkbox **desmarcado**, **When** o usuário salva,
   **Then** cada instrutor selecionado recebe a CH **integral** da disciplina como CH Prevista (modo
   simultâneo, generalizado a qualquer seleção quando o usuário opta por não dividir).
4. **Given** mais de 1 instrutor selecionado e o checkbox **marcado**, **When** o usuário salva,
   **Then** a CH total da disciplina é dividida igualmente entre os selecionados (divisão inteira); se
   a divisão não for exata, a diferença é absorvida pelo último instrutor da lista de selecionados —
   a soma das CH Previstas bate exatamente com a CH total da disciplina.
5. **Given** uma seleção salva anteriormente, **When** o usuário reabre o painel e desmarca um
   instrutor antes de salvar de novo, **Then** a CH Prevista daquele instrutor desaparece do
   registro — o campo é sempre regravado por completo, nunca incrementalmente.

---

### Edge Cases

- Disciplina sem `Modo_Atribuicao_Padrao` preenchido: degrada para `Dividido` (filtro restrito),
  nunca `Simultaneo` por omissão (RN-DEG-01).
- Curso multidisciplinar sem nenhum instrutor habilitado a nenhuma disciplina: lista vazia com
  mensagem informativa, nunca erro.
- Nenhum instrutor selecionado ao salvar: `CH_Prevista_Por_Instrutor` grava vazio, sem erro.
- CH da disciplina não divisível igualmente entre os selecionados (ex. 100 tempos / 3 instrutores):
  divisão inteira, resto absorvido pelo último instrutor da lista de selecionados — comportamento
  determinístico, documentado, não é caso de degradação silenciosa (é 100% verificável, mesma
  classificação que `intervaloContidoEm_`/`atualizarTurmaDisciplina` da spec 029, nunca RN-DEG-02).
- Linhas de `turma_disciplina` já existentes (migração desta spec): `CH_Prevista_Por_Instrutor`
  nasce vazio — nenhum rateio retroativo é calculado, só passa a ser preenchido a partir do próximo
  salvamento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Para disciplinas com `disciplinas.Modo_Atribuicao_Padrao` igual a `Dividido` ou
  vazio/ausente, o painel de edição de instrutor MUST listar somente os instrutores com vínculo
  Ativo em `instrutor_disciplina` para o `ID_Grade` daquela disciplina específica (comportamento já
  existente, preservado).
- **FR-002**: O campo de busca livre de instrutor (`buscaInstrutorEdicao`/
  `filtrarInstrutoresEdicaoDisciplina_`) MUST ser removido de `app/(app)/disciplinas/page.tsx` — seleção
  somente por checkboxes.
- **FR-003**: Para disciplinas com `disciplinas.Modo_Atribuicao_Padrao = 'Simultaneo'` (RN-MAT-05
  — Prática de Fim de Curso, LHFC, Prática de Manutenção de Auxílios à Navegação, e qualquer outra
  disciplina assim marcada no cadastro), o painel de edição MUST listar todos os instrutores com
  vínculo Ativo em `instrutor_disciplina` para **qualquer** `ID_Grade` pertencente ao mesmo
  `ID_Curso` da turma — nunca restrito a uma única disciplina.
- **FR-004**: A regra de FR-001/FR-003 MUST valer igualmente em `app/(app)/cursos/[curso]/page.tsx` (painel "Período
  das Disciplinas") e `app/(app)/disciplinas/page.tsx` (painel "Editar") — mesma checagem, mesmo resultado nas
  duas telas para a mesma disciplina/turma.
- **FR-005**: ``app/(app)/cursos/[curso]/page.tsx`:abrirPainelPeriodoTurma_` MUST passar a carregar `disciplinas` do
  curso da turma (leitura nova) para resolver `Modo_Atribuicao_Padrao` por `ID_Grade` —
  `app/(app)/disciplinas/page.tsx` já tem esse dado carregado (spec 031), sem leitura nova.
- **FR-006**: O painel de edição MUST exibir um checkbox opcional "Dividir Carga Horária Igualmente
  entre os selecionados", sempre desmarcado ao abrir — independente do `Modo_Atribuicao_Padrao` da
  disciplina.
- **FR-007**: Ao salvar, o backend MUST calcular a CH Prevista de cada instrutor selecionado: 1
  instrutor selecionado → CH integral da disciplina, sempre; mais de 1 instrutor com o checkbox
  desmarcado → cada um recebe a CH integral; mais de 1 instrutor com o checkbox marcado → a CH total
  é dividida igualmente por divisão inteira, com o resto (se houver) absorvido pelo último instrutor
  da lista de selecionados.
- **FR-008**: O resultado de FR-007 MUST ser gravado em `turma_disciplina.CH_Prevista_Por_Instrutor`
  (campo novo, formato `"ID_Instrutor:valor"` separados por vírgula), sempre regravado por completo
  a cada salvamento — esta spec MUST NUNCA gravar em `registros_aula` nem em `instrutores.Carga_Horaria_Ministrada_Ano` (CH Cumprida real, protegida contra escrita direta,
  RN-CRUD-02).
- **FR-009**: Esta spec MUST reaproveitar `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) como único ponto de
  gravação — estendido para calcular/gravar `CH_Prevista_Por_Instrutor` quando `ID_Instrutor` for
  alterado, chamado a partir das duas telas (FR-004).
- **FR-010**: Quando `disciplinas.Modo_Atribuicao_Padrao` estiver vazio/ausente, o sistema MUST
  degradar para o comportamento padrão normativo (`Dividido` — filtro restrito por disciplina),
  nunca tratar como `Simultaneo` por omissão (RN-DEG-01).
- **FR-011**: Esta spec MUST NUNCA alterar o cálculo de CH Cumprida/Carga Horária Ministrada
  (`somarCargaHorariaPorInstrutor_`, `lib/acoes/cronograma.ts`, `lib/acoes/estatisticas.ts`) — permanece exclusivamente
  derivado de `registros_aula`, sem nenhuma influência da CH Prevista desta spec.

### Key Entities

- **`turma_disciplina`** (já existente) — ganha `CH_Prevista_Por_Instrutor` (TEXTO, novo): pares
  `ID_Instrutor:valor` separados por vírgula, um por instrutor selecionado em `ID_Instrutor`.
- **`disciplinas.Modo_Atribuicao_Padrao`** (já existente, ENUM `Dividido`/`Simultaneo`) — primeiro
  consumidor real desta spec; RN-MAT-05.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Editar uma disciplina comum mostra somente os instrutores habilitados àquela
  disciplina específica — 0% de instrutores de outras disciplinas aparecendo.
- **SC-002**: Editar uma disciplina marcada `Simultaneo` (as 3 disciplinas de encerramento ou
  qualquer outra assim marcada) mostra 100% dos instrutores habilitados a qualquer disciplina
  daquele curso.
- **SC-003**: Marcar "Dividir Carga Horária" com N instrutores selecionados grava CH Prevista cuja
  soma bate exatamente com a CH total da disciplina, para qualquer N.
- **SC-004**: A mesma disciplina/turma produz a mesma lista de instrutores em `app/(app)/cursos/[curso]/page.tsx` e
  `app/(app)/disciplinas/page.tsx`, 100% das vezes.
- **SC-005**: A CH Cumprida real (derivada de aulas lançadas) permanece idêntica antes e depois desta
  spec — 0% de mudança de comportamento nesse cálculo.
- **SC-006**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- O checkbox "Dividir Carga Horária Igualmente" sempre nasce desmarcado — decisão explícita do
  usuário, não dinâmico por `Modo_Atribuicao_Padrao`.
- `instrutor_disciplina.Modo_Atribuicao` (override por vínculo individual) está fora de escopo —
  usa-se somente `disciplinas.Modo_Atribuicao_Padrao` (nível disciplina).
- A CH Prevista por instrutor é exibida no próprio painel de edição (ao lado de cada instrutor
  selecionado, após salvar/reabrir) — nenhum dashboard ou relatório novo é exigido por esta spec.
- Migração aditiva: `CH_Prevista_Por_Instrutor` nasce vazio para as linhas já existentes de `turma_disciplina` — sem cálculo retroativo.
- A ordem "último instrutor da lista" para absorver o resto da divisão inteira é a ordem em que os
  instrutores aparecem marcados no DOM (mesma ordem de `ID_Instrutor`, já usada para outras
  finalidades no projeto).
