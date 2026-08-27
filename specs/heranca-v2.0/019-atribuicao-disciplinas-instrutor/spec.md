# Feature Specification: Painel de Atribuição de Disciplinas do Instrutor (Multi-Select Pesquisável)

**Feature Branch**: `019-atribuicao-disciplinas-instrutor`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "HOTFIX e Nova Feature: Atribuição Dinâmica de Disciplinas na Ficha do Instrutor (Searchable Multi-Select) com Siglas. Contexto Obrigatório: A interface atual da ficha de cadastro/edição exibe as disciplinas habilitadas como um campo read-only. Precisamos de um painel interativo de múltipla escolha com barra de pesquisa. Além disso, a exibição do curso vinculado à disciplina deve usar estritamente a SIGLA, poupando espaço visual. [...] Critério de Aceite: O usuário pesquisa 'TFM', vê opções como 'TFM (CAHO)'. Marca os checkboxes, salva, e a tabela relacional é atualizada via backend apagando o histórico velho e gravando o novo."

## Achados reais (leitura de código e dados antes de escrever qualquer requisito)

- **Conflito real com a constitution (achado crítico) — resolvido nesta spec, não é pergunta de
  clarify**: o pedido original descreve, para o cenário de edição, que o backend deve "LIMPA
  (exclui) todos os vínculos antigos... e recria as linhas". Isso contraria diretamente o
  Princípio IV da constitution do projeto ("Integridade do Histórico": nenhuma operação pode
  apagar ou tornar irrecuperável um registro já lançado) e a convenção C-05 do schema (exclusão
  lógica universal — nenhuma linha é apagada fisicamente de nenhuma aba, sempre via `Status`). O
  único mecanismo de "exclusão" de todo o projeto (`crudExcluir`) nunca apaga linha, só marca
  `Status` como inativo. Esta spec implementa a **mesma experiência funcional** descrita no
  Critério de Aceite (disciplinas desmarcadas deixam de valer, disciplinas marcadas passam a
  valer) através de exclusão lógica (desativação de vínculos antigos + ativação/criação dos
  vínculos novos), nunca apagando uma linha da tabela relacional. Ver FR-009 a FR-012.
- **"Sigla" não é uma coluna nova a criar**: a tabela de cursos não tem nenhuma coluna
  "Sigla"/"Abreviação" separada — o identificador do curso (ex.: `CAHO`, `C-Ap-HN`) já É o código
  curto que deve aparecer entre parênteses. Nenhuma mudança de schema é necessária para satisfazer
  a regra de nomenclatura do rótulo do checkbox.
- **Escala real dos dados**: o catálogo de disciplinas tem ~175 registros (a grande maioria
  ativos) — uma lista com rolagem vertical é viável sem paginação nem busca no servidor. Cada
  instrutor tem hoje, em média, ~4-5 disciplinas habilitadas (máximo observado: 20) — uma
  sincronização de vínculos por salvamento é uma operação pequena, não uma operação em massa.
- **A tabela relacional de vínculos já existe e tem campos além dos citados no pedido**: além de
  instrutor/disciplina/status, ela guarda um modo de atribuição (relevante para a regra de negócio
  já existente sobre carga horária dividida entre múltiplos instrutores da mesma disciplina — RN
  preservada, não nova) e campos descritivos que, hoje, o único fluxo de criação de vínculo já
  existente também deixa em branco (nenhuma tela lê esses campos para exibição — a exibição sempre
  recalcula o texto a partir do ID da disciplina). O painel novo não piora nem resolve esse ponto,
  só mantém o comportamento já existente.
- **Nenhum precedente de sincronização em massa existe hoje** — o mecanismo de gravação de vínculo
  já existente cria um vínculo de cada vez, sem checar duplicata. Esta é a primeira vez que o
  projeto precisa de uma sincronização "conjunto desejado vs. conjunto atual" — decisão de design
  (reativar vínculo existente em vez de duplicar) documentada em FR-011 abaixo.
- **Nenhuma chamada de rede nova é necessária para exibir o painel** — a tela de instrutores já
  carrega, num único carregamento inicial, tanto o catálogo de disciplinas quanto os vínculos de
  todos os instrutores. O painel pode montar a lista completa de checkboxes e o estado pré-marcado
  inteiramente a partir de dados já disponíveis no navegador.
- **Hoje o bloco de disciplinas só aparece no modo edição** — no cadastro de um instrutor novo,
  não existe hoje nenhuma exibição de disciplinas (óbvio, pois o instrutor ainda não tem vínculos).
  O painel novo precisa existir também no cadastro (todo desmarcado), pois o pedido exige
  explicitamente a criação de vínculos logo após o cadastro do instrutor.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver e marcar disciplinas com o código do curso no rótulo (Priority: P1)

Ao abrir a ficha de edição de um instrutor, o usuário vê um painel com uma lista de todas as
disciplinas do sistema, cada uma mostrada como "Nome da Disciplina (CÓDIGO_DO_CURSO)" — nunca o
nome completo do curso. As disciplinas que o instrutor já está habilitado a ministrar aparecem
pré-marcadas; as demais, desmarcadas. Ao abrir a ficha de cadastro de um instrutor novo, o mesmo
painel aparece, mas com tudo desmarcado (o instrutor ainda não existe, logo não tem vínculos).

**Why this priority**: Sem essa visualização correta e pré-marcada, nenhuma das outras histórias
tem valor — é o pré-requisito visual de todo o resto da feature.

**Independent Test**: Abrir a ficha de um instrutor com disciplinas conhecidas e conferir que
exatamente essas aparecem marcadas, com o rótulo no formato "Nome (Código)"; abrir o cadastro de
um instrutor novo e conferir que a lista aparece completa e toda desmarcada.

**Acceptance Scenarios**:

1. **Given** um instrutor com 3 disciplinas habilitadas ativas, **When** o usuário abre a ficha de
   edição desse instrutor, **Then** exatamente essas 3 disciplinas aparecem marcadas na lista, e
   nenhuma outra.
2. **Given** o catálogo de disciplinas do sistema, **When** o painel é renderizado, **Then** cada
   item mostra o nome da disciplina seguido do código do curso entre parênteses, nunca o nome
   completo do curso.
3. **Given** o formulário de cadastro de um novo instrutor (ainda sem `ID`), **When** o usuário
   abre esse formulário, **Then** o painel de disciplinas aparece com a lista completa, toda
   desmarcada.

---

### User Story 2 - Encontrar uma disciplina digitando parte do nome ou do código do curso (Priority: P1)

Com o catálogo tendo ~175 disciplinas, o usuário precisa localizar rapidamente as que procura.
Ele digita um trecho de texto (nome da disciplina ou código do curso, ex.: "TFM") num campo de
busca acima da lista, e a lista se reduz instantaneamente às disciplinas cujo nome OU cujo código
de curso contém o texto digitado — sem diferenciar maiúsculas/minúsculas.

**Why this priority**: Sem busca, localizar uma disciplina específica numa lista de ~175 itens
role-e-procure é impraticável o suficiente para inviabilizar o uso real do painel — por isso tem a
mesma prioridade da própria exibição.

**Independent Test**: Digitar "TFM" no campo de busca e conferir que só sobram na lista visível as
disciplinas cujo nome ou código de curso contém "tfm" (em qualquer capitalização); limpar a busca
e conferir que a lista completa volta a aparecer.

**Acceptance Scenarios**:

1. **Given** o painel de disciplinas com a lista completa visível, **When** o usuário digita
   "tfm" (minúsculo) no campo de busca, **Then** só permanecem visíveis as disciplinas cujo nome
   ou cujo código de curso contém "TFM" em qualquer capitalização.
2. **Given** uma busca ativa que já filtrou a lista, **When** o usuário apaga o texto digitado,
   **Then** a lista completa volta a ficar visível, preservando o estado marcado/desmarcado de
   cada item.
3. **Given** um texto de busca que não corresponde a nenhuma disciplina, **When** o usuário
   termina de digitar, **Then** a lista fica vazia (nenhum item visível), sem erro.

---

### User Story 3 - Salvar as disciplinas marcadas sem perder histórico (Priority: P1)

Ao clicar em "Salvar" na ficha do instrutor (seja cadastro ou edição), o conjunto de disciplinas
marcadas no painel passa a ser o conjunto de disciplinas habilitadas do instrutor: as que foram
marcadas e ainda não eram vínculo passam a valer; as que estavam marcadas e foram desmarcadas
deixam de valer; nenhum registro de vínculo é fisicamente apagado do sistema — apenas desativado,
preservando o histórico de acordo com a regra do projeto de nunca apagar dados já lançados.

**Why this priority**: É o desfecho funcional de toda a feature — sem gravação correta, os
critérios de aceite do pedido original não são atendidos, e um salvamento que perdesse histórico
violaria uma regra não-negociável do projeto.

**Independent Test**: Num instrutor existente, desmarcar uma disciplina habilitada e marcar uma
nova, salvar, reabrir a ficha e conferir que o novo conjunto marcado reflete exatamente a mudança;
conferir que o vínculo antigo desmarcado continua existindo no sistema (apenas inativo), não foi
apagado. No cadastro de um instrutor novo, marcar disciplinas, salvar, e conferir que o instrutor
recém-criado aparece com exatamente essas disciplinas habilitadas ao reabrir sua ficha.

**Acceptance Scenarios**:

1. **Given** um instrutor existente com a disciplina "TFM" habilitada, **When** o usuário
   desmarca "TFM", marca "Oceanografia" e salva, **Then** ao reabrir a ficha desse instrutor,
   "Oceanografia" aparece marcada e "TFM" aparece desmarcada.
2. **Given** o salvamento do cenário anterior, **When** se consulta o histórico de vínculos desse
   instrutor por qualquer meio administrativo, **Then** o vínculo de "TFM" ainda existe no
   sistema, apenas marcado como inativo — não foi excluído.
3. **Given** o cadastro de um instrutor novo, **When** o usuário preenche os dados obrigatórios,
   marca 2 disciplinas no painel e salva, **Then** o instrutor é criado com sucesso e, ao reabrir
   sua ficha, exatamente essas 2 disciplinas aparecem marcadas.
4. **Given** um instrutor cujo cadastro falha na gravação (ex.: dado obrigatório inválido),
   **When** o usuário tenta salvar com disciplinas marcadas, **Then** nenhum vínculo de disciplina
   é criado (o instrutor não existe, não pode haver vínculo órfão).
5. **Given** um instrutor com uma disciplina previamente desmarcada e salva (vínculo inativo),
   **When** o usuário marca essa mesma disciplina novamente numa edição futura e salva, **Then**
   o sistema reativa o vínculo existente em vez de criar um segundo vínculo duplicado para o mesmo
   par instrutor/disciplina.

---

### Edge Cases

- O que acontece se o usuário não marcar nenhuma disciplina e salvar? Deve ser permitido — todas
  as disciplinas antes habilitadas ficam inativas, o instrutor fica temporariamente sem nenhuma
  disciplina habilitada (estado válido, ex.: instrutor recém-cadastrado ainda não alocado).
- O que acontece se duas pessoas editarem o mesmo instrutor ao mesmo tempo e salvarem versões
  diferentes do painel? A última gravação prevalece (mesmo comportamento de concorrência já
  existente em todo o resto do formulário do instrutor — sem bloqueio otimista).
- O que acontece se uma disciplina do catálogo estiver inativa/descontinuada? Ela não aparece na
  lista de opções do painel (mesma convenção usada em outras listas do sistema, que só mostram
  registros ativos por padrão) — mas, se um instrutor já tiver um vínculo ativo com uma disciplina
  que foi descontinuada depois, esse vínculo continua existindo e não é alterado por este painel
  a menos que o usuário interaja com ele explicitamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir, ao final do formulário de cadastro e do formulário de edição
  de instrutor, um painel de atribuição de disciplinas contendo um campo de busca e uma lista
  rolável de todas as disciplinas ativas do catálogo, cada uma como um item marcável
  (checkbox).
- **FR-002**: O rótulo de cada item da lista DEVE exibir o nome da disciplina seguido do código do
  curso ao qual ela pertence, entre parênteses (ex.: "TFM (CAHO)"). O nome completo do curso NUNCA
  deve ser exibido no rótulo.
- **FR-003**: O campo de busca DEVE filtrar a lista em tempo real (a cada caractere digitado),
  comparando o texto digitado, sem diferenciar maiúsculas/minúsculas, contra o nome da disciplina
  e contra o código do curso, ocultando os itens que não contêm o texto em nenhum dos dois campos.
- **FR-004**: Ao carregar a ficha de edição de um instrutor existente, o painel DEVE apresentar
  pré-marcadas exatamente as disciplinas para as quais esse instrutor possui um vínculo ativo, e
  nenhuma outra.
- **FR-005**: Ao carregar a ficha de cadastro de um instrutor novo, o painel DEVE apresentar todos
  os itens desmarcados.
- **FR-006**: O painel de disciplinas marcáveis DEVE coexistir com os campos de texto de
  disciplinas já existentes na ficha (histórico de disciplinas ministradas e resumo calculado de
  disciplinas habilitadas) — não os substitui nem os remove.
- **FR-007**: Ao salvar o cadastro de um instrutor novo, o sistema DEVE primeiro gravar o
  instrutor e obter seu identificador, e só então gravar os vínculos das disciplinas marcadas no
  painel para esse identificador. Se a gravação do instrutor falhar, nenhum vínculo de disciplina
  deve ser criado.
- **FR-008**: Ao salvar a edição de um instrutor existente, o sistema DEVE sincronizar os vínculos
  de disciplina desse instrutor para refletir exatamente o conjunto marcado no painel no momento
  do salvamento.
- **FR-009**: A sincronização de vínculos NUNCA deve apagar fisicamente um registro de vínculo. Um
  vínculo que deixa de estar marcado no painel DEVE ser desativado (marcado como inativo),
  permanecendo recuperável no sistema — nunca removido.
- **FR-010**: Um vínculo marcado no painel que ainda não existe para o instrutor DEVE ser criado
  como um vínculo ativo.
- **FR-011**: Um vínculo marcado no painel que já existe para o instrutor, mas está inativo (foi
  desmarcado e salvo anteriormente), DEVE ser reativado em vez de duplicado — nunca deve existir
  mais de um vínculo ativo simultâneo para o mesmo par instrutor/disciplina.
- **FR-012**: Um vínculo marcado no painel que já existe e já está ativo para o instrutor NÃO deve
  sofrer nenhuma alteração desnecessária (não deve gerar um novo registro nem re-gravar um já
  correto).
- **FR-013**: A lista de disciplinas do painel DEVE excluir disciplinas inativas/descontinuadas do
  catálogo. Vínculos ativos pré-existentes com uma disciplina posteriormente descontinuada
  permanecem inalterados até que o usuário interaja explicitamente com esse vínculo.
- **FR-014**: A exibição do painel (lista completa de disciplinas, rótulos com código do curso, e
  estado pré-marcado em modo edição) NÃO deve depender de nenhuma nova chamada ao servidor além
  das já realizadas hoje ao abrir a tela de instrutores.

### Key Entities *(include if feature involves data)*

- **Disciplina**: item do catálogo de disciplinas do sistema; pertence a um curso; tem um estado
  ativo/inativo que determina se aparece como opção no painel.
- **Curso**: agrupador ao qual uma disciplina pertence; possui um código curto (já existente,
  reaproveitado como "sigla" para o rótulo do checkbox) e um nome completo (não exibido no
  painel).
- **Vínculo de Habilitação (Instrutor × Disciplina)**: registro relacional que representa a
  habilitação de um instrutor para ministrar uma disciplina específica; possui um estado
  ativo/inativo (nunca é fisicamente removido); um mesmo par instrutor/disciplina nunca deve ter
  mais de um vínculo ativo simultâneo, podendo ter, ao longo do tempo, um histórico de vínculos
  ativados/desativados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue localizar uma disciplina específica entre as ~175 do catálogo em
  menos de 5 segundos digitando parte do nome ou do código do curso.
- **SC-002**: 100% dos rótulos exibidos no painel seguem o formato "Nome da Disciplina (Código do
  Curso)", sem nenhuma ocorrência do nome completo do curso.
- **SC-003**: Ao reabrir a ficha de um instrutor imediatamente após salvar uma alteração nas
  disciplinas marcadas, o painel reflete exatamente o conjunto salvo, sem exceção.
- **SC-004**: Nenhuma alteração de disciplinas habilitadas, em nenhum cenário de uso, resulta na
  perda irreversível de um registro de vínculo já existente.
- **SC-005**: Um usuário consegue cadastrar um instrutor novo já com suas disciplinas habilitadas
  atribuídas em um único fluxo de salvamento, sem precisar de um segundo passo separado.

## Assumptions

- "Sigla do curso", conforme pedido pelo usuário, corresponde ao código curto já usado hoje como
  identificador do curso no sistema — não é uma nova coluna de dado a ser criada.
- A ordem de exibição das disciplinas na lista do painel segue a ordem já usada pelo catálogo
  (sem necessidade de uma nova ordenação alfabética ou por curso, não especificada no pedido).
- O modo de atribuição gravado para um vínculo novo criado por este painel herda o padrão já
  definido para a disciplina no catálogo, mantendo compatibilidade com a regra de negócio
  existente sobre divisão de carga horária entre múltiplos instrutores — o painel não introduz
  nenhuma nova forma de o usuário escolher esse modo manualmente (fora do escopo deste pedido).
- "Apagar o histórico velho e gravar o novo", conforme a redação literal do critério de aceite do
  pedido original, é entendido como uma descrição do resultado funcional observável pelo usuário
  (disciplinas antigas deixam de valer, novas passam a valer) — não como uma instrução técnica
  literal de exclusão física de registros, que este projeto proíbe de forma não-negociável. Esse
  desvio de redação está documentado nos Achados reais acima.
- Concorrência entre duas edições simultâneas do mesmo instrutor segue o mesmo comportamento já
  existente no restante do formulário (a última gravação prevalece) — nenhum mecanismo de bloqueio
  otimista é introduzido por esta feature.
