# Feature Specification: Hotfix — Refinamento de UI e Correção do Algoritmo de Nome de Guerra

**Feature Branch**: `020-hotfix-refinamento-listagem-instrutores`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "HOTFIX: Refinamento de UI e Correção do Algoritmo de Nome de Guerra. Contexto Obrigatório: O layout da listagem precisa ser otimizado unificando colunas. Além disso, o algoritmo atual de destaque do Nome de Guerra falha silenciosamente quando o nome de guerra é composto por palavras não contíguas no nome completo. Telas legadas precisam ser removidas. [...] Critério de Aceite: A tabela exibe apenas uma coluna 'Instrutor' formatada. Nomes de guerra separados por outras palavras recebem o negrito corretamente em cada fragmento. A seção legada desapareceu."

## Achados reais (leitura de código e dados antes de escrever qualquer requisito)

- **A função utilitária citada no pedido (`formatarNomeInstrutor`) é a já existente
  `formatarNomeInstrutor_`** (com underscore final, convenção já estabelecida no projeto para
  funções internas do frontend), reescrita pelo hotfix de nomenclatura militar do dia anterior —
  não é uma função nova a criar.
- **Bug confirmado por leitura direta do código**: o algoritmo atual exige que o nome de guerra
  seja um substring contíguo do nome completo (`nomeBase.toUpperCase().includes(nomeGuerra.toUpperCase())`).
  Para um nome de guerra como "Guilherme Black" dentro de "Guilherme Pires Black Pereira" (palavras
  intercaladas por outro nome), a condição inteira é falsa e a função cai no fallback silencioso —
  nenhum negrito, nenhum erro. Comportamento real confirmado, não hipotético.
- **Dado real da banco de produção**: hoje só 2 instrutores têm nome de guerra preenchido, e nenhum
  dos 2 é um caso de palavras não contíguas — esta correção é preventiva para dado futuro, não
  corrige nenhum caso visivelmente quebrado na tela hoje (mesmo padrão da exceção "CA" do hotfix
  anterior).
- **A listagem principal já tem exatamente as 2 colunas separadas descritas no pedido**
  ("Posto/Graduação" e "Nome Completo") — a célula de "Nome Completo" já chama a função de
  formatação com HTML habilitado, mas propositalmente sem passar posto/especialidade (para não
  duplicar a coluna de Posto separada). A consolidação é: passar posto/especialidade reais nessa
  mesma chamada e remover a coluna de Posto.
- **A seção legada existe exatamente como descrita, com um heading ligeiramente diferente do
  citado no pedido** ("Vínculo de qualificação", não "Vínculo de Qualificação Instrutor e
  Disciplina" literalmente) — é a mesma seção: um formulário isolado no final da página principal
  para criar um vínculo de qualificação instrutor↔disciplina de cada vez. Toda a lógica associada a
  essa seção só é usada por ela mesma, em nenhum outro lugar do sistema — a remoção é autocontida.
- **A "migração para o modal" citada no pedido é real, mas o destino não é literalmente um modal**
  — é o painel de edição/cadastro de instrutor, que ganhou no dia anterior um painel interativo de
  múltipla escolha de disciplinas que já cobre o mesmo caso de uso de forma mais completa (várias
  disciplinas de uma vez, por instrutor, com busca). O único modal de verdade desta tela é a Ficha
  imprimível, sem relação com vínculos — terminologia ajustada nesta spec para "o painel de
  edição/cadastro de instrutor", mantendo o mesmo sentido do pedido.
- **Achado colateral real, não pedido explicitamente**: depois de remover a seção legada, a função
  de backend que ela usava para criar vínculo fica sem nenhum consumidor em todo o projeto — vira
  código morto acessível via chamada remota, o tipo de resíduo que este projeto já demonstrou
  evitar ativamente. Removê-la junto é tratado como parte da mesma limpeza pedida, não como escopo
  adicional não relacionado.
- **Achado colateral real (tratamento de erro)**: a função que carrega toda a listagem principal de
  instrutores (não só o formulário legado) hoje reporta qualquer erro de carregamento através de um
  contêiner de aviso que pertence à seção sendo removida. Sem um substituto, um erro real de
  carregamento da tela inteira passaria a ser escondido silenciosamente em vez de avisado ao
  usuário — precisa de um contêiner de aviso de nível de página no lugar.
- **2 testes automatizados existentes quebram como consequência direta e correta do algoritmo
  pedido, não por acidente**: hoje existem 2 testes que usam um nome de guerra de 2 palavras já
  contíguas e esperam uma única marcação de negrito envolvendo as 2 palavras juntas. O algoritmo
  novo (separar em palavras, aplicar a busca por palavra) produz, para esse mesmo caso contíguo,
  2 marcações de negrito separadas por um espaço sem marcação — visualmente idêntico (as mesmas 2
  palavras continuam em destaque), mas estruturalmente diferente. Esses 2 testes precisam ser
  migrados para a nova asserção.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o instrutor como uma única coluna formatada (Priority: P1)

Ao abrir a listagem principal de instrutores, o usuário vê uma única coluna "Instrutor" com o
posto/graduação, a especialidade (quando aplicável) e o nome completo, com o nome de guerra em
destaque — em vez de ter que olhar duas colunas separadas (Posto/Graduação e Nome Completo) para
montar mentalmente a mesma informação.

**Why this priority**: É o refinamento de layout central do pedido — reduz redundância visual e
aproxima a listagem do mesmo formato já usado em outras partes do sistema (dropdown de vínculo,
grade do DSA).

**Independent Test**: Abrir a listagem de instrutores e conferir que existe uma única coluna
"Instrutor" (não mais duas), com o conteúdo completo (posto + especialidade quando houver + nome,
nome de guerra em destaque) em cada linha.

**Acceptance Scenarios**:

1. **Given** a listagem de instrutores carregada, **When** o usuário observa o cabeçalho da
   tabela, **Then** existe uma única coluna "Instrutor", sem colunas separadas de "Posto/Graduação"
   ou "Nome Completo".
2. **Given** um instrutor com posto, especialidade e nome de guerra preenchidos, **When** sua linha
   é exibida, **Then** a célula "Instrutor" mostra posto + especialidade (quando aplicável pelas
   regras de círculo hierárquico já existentes) + nome completo, com o nome de guerra em destaque.
3. **Given** a listagem sem nenhum instrutor correspondente aos filtros ativos, **When** a mensagem
   de "nenhum instrutor encontrado" é exibida, **Then** ela ocupa corretamente a largura da nova
   tabela de colunas reduzidas, sem célula sobrando nem faltando.

---

### User Story 2 - Ver o nome de guerra destacado mesmo quando as palavras não são contíguas (Priority: P1)

Quando o nome de guerra de um instrutor é formado por palavras que não aparecem juntas no nome
completo (ex.: nome completo "Guilherme Pires Black Pereira", nome de guerra "Guilherme Black"), o
usuário ainda vê cada palavra do nome de guerra destacada em negrito no lugar correto dentro do
nome completo — em vez de ver o nome inteiro sem nenhum destaque.

**Why this priority**: É a correção de um bug real de formatação (falha silenciosa) — mesma
prioridade da User Story 1 porque afeta a mesma célula/coluna consolidada.

**Independent Test**: Formatar um nome com nome de guerra de palavras não contíguas e confirmar que
cada palavra aparece destacada individualmente no nome completo, na posição onde realmente ocorre.

**Acceptance Scenarios**:

1. **Given** nome completo "Guilherme Pires Black Pereira" e nome de guerra "Guilherme Black",
   **When** o nome é formatado com destaque habilitado, **Then** tanto "Guilherme" quanto "Black"
   aparecem destacados, cada um em sua posição original, e "Pires"/"Pereira" permanecem sem
   destaque.
2. **Given** nome completo "Vanessa Santos Medeiros da Silva" e nome de guerra "Vanessa Medeiros",
   **When** o nome é formatado, **Then** o resultado tem exatamente "Vanessa" e "Medeiros"
   destacados, nada mais.
3. **Given** um nome de guerra cujas palavras não aparecem no nome completo (dado inconsistente),
   **When** o nome é formatado, **Then** o nome completo é exibido sem destaque em nenhuma palavra,
   sem lançar erro.
4. **Given** um nome de guerra com uma única palavra que já é contígua no nome completo (caso mais
   comum), **When** o nome é formatado, **Then** essa palavra continua destacada normalmente —
   nenhuma regressão para o caso simples já existente.

---

### User Story 3 - Não ver mais a seção legada de vínculo isolado (Priority: P2)

Ao abrir a página principal de instrutores, o usuário não vê mais o formulário isolado de "criar um
vínculo de qualificação de cada vez" no final da página — essa função já está disponível, de forma
mais completa, dentro da edição de cada instrutor.

**Why this priority**: Limpeza de interface — reduz redundância e confusão sobre "qual dos dois
lugares eu uso para qualificar um instrutor", mas não corrige nenhum bug nem impede nenhum fluxo
(a funcionalidade equivalente já existe em outro lugar).

**Independent Test**: Abrir a página principal de instrutores e confirmar que a seção de vínculo
isolado não existe mais em nenhum ponto da página.

**Acceptance Scenarios**:

1. **Given** a página principal de instrutores carregada, **When** o usuário rola até o final da
   página, **Then** a seção antes usada para criar um vínculo de qualificação isolado não existe
   mais.
2. **Given** um erro ao carregar a listagem principal de instrutores, **When** esse erro ocorre,
   **Then** ele continua visível ao usuário através de um aviso na própria página, mesmo com a
   seção legada removida.

---

### User Story 4 - Ver o rótulo correto no painel de qualificação (Priority: P3)

Ao abrir a ficha de cadastro/edição de um instrutor, o usuário vê o painel de seleção de
disciplinas rotulado como "Qualificação do Instrutor", alinhado com o vocabulário já usado no resto
do sistema, em vez do rótulo genérico anterior.

**Why this priority**: Ajuste puramente textual, sem nenhum impacto funcional.

**Independent Test**: Abrir a ficha de edição de um instrutor e conferir o texto do rótulo do
painel de disciplinas.

**Acceptance Scenarios**:

1. **Given** a ficha de cadastro ou edição de um instrutor aberta, **When** o usuário localiza o
   painel de seleção de disciplinas, **Then** seu rótulo é exatamente "Qualificação do Instrutor".

---

### Edge Cases

- Nome de guerra com palavra repetida no nome completo (ex.: nome completo "José Silva José
  Santos", nome de guerra "José") — todas as ocorrências da palavra devem ficar destacadas, não só
  a primeira (comportamento já coberto por uma busca global por palavra).
- Nome de guerra vazio — nenhuma marcação de destaque, nome completo exibido normalmente
  (comportamento já existente, preservado).
- Nome completo ausente mas nome de guerra presente — o nome de guerra assume o papel de base do
  nome exibido (comportamento já existente, preservado); se tiver mais de uma palavra, cada palavra
  se autodestaca dentro dele.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A listagem principal de instrutores DEVE exibir uma única coluna "Instrutor" no lugar
  das colunas separadas "Posto/Graduação" e "Nome Completo".
- **FR-002**: O conteúdo da coluna "Instrutor" DEVE ser produzido pela mesma função de formatação
  de nome já usada em outras partes do sistema, com o destaque de nome de guerra habilitado,
  recebendo o posto e a especialidade reais do instrutor (não mais valores vazios).
- **FR-003**: A função de formatação de nome DEVE destacar cada palavra do nome de guerra
  individualmente dentro do nome completo, mesmo quando as palavras do nome de guerra não são
  contíguas entre si no nome completo.
- **FR-004**: Quando uma palavra do nome de guerra não é encontrada em nenhum lugar do nome
  completo, essa palavra específica simplesmente não recebe destaque — o restante do nome de guerra
  que for encontrado continua sendo destacado normalmente, sem erro interrompendo a formatação.
- **FR-005**: A comparação entre cada palavra do nome de guerra e o nome completo NÃO deve
  diferenciar maiúsculas de minúsculas, e deve preservar a capitalização original do nome completo
  no resultado exibido.
- **FR-006**: A seção isolada de criação de vínculo de qualificação instrutor↔disciplina DEVE ser
  completamente removida da página principal de instrutores, incluindo todo elemento de interface e
  toda lógica de carregamento/salvamento exclusiva dela.
- **FR-007**: Um erro ao carregar a listagem principal de instrutores DEVE continuar visível ao
  usuário através de um aviso na página, mesmo após a remoção da seção do FR-006.
- **FR-008**: O painel de seleção de disciplinas dentro da ficha de cadastro/edição de instrutor
  DEVE ter seu rótulo alterado para "Qualificação do Instrutor".
- **FR-009**: Nenhuma das mudanças desta funcionalidade deve alterar o formato ou o conteúdo de
  dados persistidos — é uma mudança estritamente de interface e de uma função de formatação de
  texto.

### Key Entities *(include if feature involves data)*

Nenhuma entidade de dado nova ou alterada — a funcionalidade toca apenas exibição (listagem,
rótulo) e uma função de formatação de texto sobre campos já existentes (posto, especialidade, nome
completo, nome de guerra).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das linhas da listagem principal de instrutores exibem exatamente uma coluna
  "Instrutor" com posto, especialidade (quando aplicável) e nome, sem nenhuma coluna redundante de
  posto ou nome separada.
- **SC-002**: Para um nome de guerra de múltiplas palavras não contíguas no nome completo, 100% das
  palavras do nome de guerra que existem no nome completo aparecem destacadas, cada uma em sua
  posição correta.
- **SC-003**: A seção legada de vínculo isolado não aparece em nenhuma carga da página principal de
  instrutores, para nenhum perfil de usuário que antes a via.
- **SC-004**: Um usuário consegue identificar o painel de qualificação de disciplinas pelo rótulo
  "Qualificação do Instrutor" em 100% das aberturas da ficha de instrutor.

## Assumptions

- "Modal" no pedido original é entendido como o painel de edição/cadastro de instrutor (destino
  real da funcionalidade equivalente), não um componente modal Tailwind CSS literal — documentado nos
  Achados reais acima.
- A remoção da seção legada inclui, por extensão natural da "limpeza de componentes obsoletos"
  pedida, a função de backend que só ela consumia — evitando deixar código sem nenhum consumidor
  acessível por chamada remota, consistente com a prática já demonstrada neste projeto de não
  acumular esse tipo de resíduo.
- O rótulo textual "Qualificação do Instrutor" (FR-008) não afeta nenhum identificador técnico
  (nomes de função, de campo ou de elemento) usado internamente — é puramente o texto visível ao
  usuário.
- A migração dos 2 testes automatizados existentes que dependem do formato antigo de destaque
  (marcação única para nome de guerra de múltiplas palavras contíguas) é tratada como parte
  necessária desta mudança, não como uma regressão a ser evitada.
