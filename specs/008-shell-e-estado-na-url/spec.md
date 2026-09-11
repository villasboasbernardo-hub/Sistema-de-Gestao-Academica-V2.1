# Especificação: Épico 4, fatia (c) — shell de navegação e estado na URL

**Feature Branch**: `feat/EPICO-4c-shell-e-estado-na-url`

**Criado**: 11/09/2026

**Status**: Draft

**Épico**: 4 — Design System · **Fatia**: (c), shell e estado

**Fontes**: [documento 25 — Camada de Dados e Estado](../../docs/fase-2/25-Camada-de-Dados-e-Estado.md)
§0, §1, §3 e §9 · [`RF-NAV-01` a `RF-NAV-04`, `RF-INI-01` a `RF-INI-05`, `RF-MOD-01/03`,
`RF-AUTH-08`](../../docs/fase-1/02-Requisitos-Funcionais.md) ·
[documento 23 §3.1 e §3.2](../../docs/fase-2/23-Design-System-Tailwind-shadcn.md) ·
[documento 06, Épico 4](../../docs/fase-1/06-Backlog-de-Epicos-V2.1.md) ·
**[checklist de entrada](../007-componentes-ciaara/checklists/navegacao-e-estado.md)**, 40 itens

## Contexto

O Épico 4 foi dividido em três fatias. A **(a)** entregou tokens e tema; a **(b)** entregou o
vocabulário de componentes e está **mesclada na `main`** desde 11/09/2026 (PR #8): dez primitivos,
treze componentes CIAARA, três gráficos e as duas primeiras funções puras de `lib/dominio/`.

Esta é a **(c)**, e ela é a última do épico: **o shell e o estado de navegação**.

⚠️ **É aqui que a promessa mais antiga do projeto se cumpre ou não se cumpre.** O `RF-NAV-01` pedia
*"um único ponto de verdade para o estado de navegação"* desde a v1.0. A v2.0 entregou isso como o
objeto `AppState` — a melhor solução possível sob `HtmlService`, onde a URL é fixa. **O preço era
conhecido e aceito: sem deep-link, sem histórico, sem compartilhar link de tela, e recarregar perdia
o contexto.** Esta fatia é a que devolve os quatro.

### O que já existe, e não se refaz

| Item | Onde está |
|---|---|
| Tokens, dois temas, regra de cor bloqueante | `app/globals.css`, fatia (a) |
| Treze componentes CIAARA e três gráficos | `components/ciaara/`, `components/graficos/`, fatia (b) |
| Navegação por teclado em grade | `components/ciaara/lista-navegavel.tsx`, fatia (b) |
| Sessão, proteção de rota e `?redirect=` | `proxy.ts` e `lib/autorizacao/`, Épico 3 |
| Matriz de permissões como dado | `lib/autorizacao/matriz.ts`, Épico 3 |

### O que foi medido em 11/09/2026, e é o que molda esta spec

1. **Os componentes de shell não existem e não têm endereço.** Layout raiz autenticado,
   navegação lateral e cabeçalho **não têm linha no inventário do documento 23 §3.1** —
   que é onde cada componente recebe arquivo, base e a coluna `"use client"`. Os treze da fatia (b)
   tinham, e foi por isso que nasceram com endereço.
2. **Existe um cabeçalho provisório**, em `app/(app)/layout.tsx`: o nome do sistema, o nome do
   usuário e o perfil. **Sem um único link de navegação.** Ele também não usa token nenhum do
   vocabulário — é uma das cinco telas do Épico 3 registradas como dívida.
3. **Só a tabela densa guarda estado que o documento 25 manda para a URL.** Dos quatro componentes
   da fatia (b) com estado interno, três guardam apenas estado **efêmero de interface**, que o
   documento 25 §3 diz explicitamente que **não** pertence à URL:

   | Componente | Estado interno | Veredito |
   |---|---|---|
   | `TabelaDensa` | `ordem`, `busca` | ⚠️ **o documento 25 §1.6 põe os dois na URL** — é o que esta fatia corrige |
   | `SeletorInstrutor` | `aberto`, `busca` | ✅ correto: é a busca **dentro** do painel, e o painel aberto |
   | `FiltroAvancado` | `aberto` | ✅ correto: recolhido/expandido é preferência visual |
   | `ListaNavegavel` | `posicao` | ✅ correto: é a posição do foco do teclado |

   ⚠️ **A refatoração pedida existe, e é menor do que parecia:** um componente, dois pedaços de
   estado. Os outros três estão certos como estão, e mudá-los seria empurrar estado efêmero para a
   barra de endereço — o erro oposto, e igualmente proibido pelo documento 25 §3.3.
4. **`nuqs` não está instalado**, e nenhum gerenciador de estado efêmero está instalado.
5. **Não há brasão em `public/`**, só os desenhos padrão do arcabouço. O `RF-INI-05` o exige.

## Clarifications

### Session 2026-09-11

- Q: A tela Início entra completa nesta fatia, se o `RF-INI-01` e o `RF-INI-04` dependem de agregações que os Épicos 5 a 9 ainda não produzem? → A: **Casca navegável, com o que o dado sustenta.** A tela existe e navega; o que depende dos épicos seguintes aparece como estado vazio explicado. A pessoa deixa de cair num beco **hoje**, e a fatia não nasce carregando tela sem o que exibir.
- Q: O breadcrumb entra, se nenhum `RF-` o menciona? → A: **Fica fora, por ora.** Sem requisito de origem e sem equivalente na v2.0, ele é **novidade** — e o Princípio X a barra até haver paridade funcional. É **recusa declarada**, não esquecimento: volta quando houver paridade.
- Q: Como provar os quatro comportamentos do `RF-NAV-04`, se os critérios de aceite escritos usam rotas dos Épicos 5 a 9? → A: **Sobre as rotas que esta fatia cria.** Início, vitrine e as telas do Épico 3, com parâmetros reais. **Nada provisório** — rota provisória costuma sobreviver mais do que se planeja —, e o `RF-NAV-04` ganha dono agora em vez de ficar esperando a primeira tela de domínio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A URL é o estado, e o link funciona (Priority: P1)

Quem trabalha no sistema precisa **colar um link e cair na tela certa**, **voltar** com o botão do
navegador, **mandar o link para um colega** e **recarregar sem perder onde estava**.

**Why this priority**: são os quatro custos que a v2.0 pagava e que o `RF-NAV-04` promete eliminar.
Sem eles, a troca de plataforma não entrega o que a justificou.

**Independent Test**: colar uma URL com parâmetros numa aba nova e conferir que a tela abre naquele
exato recorte, sem passar pela tela inicial.

**Acceptance Scenarios**:

1. **Dado** uma URL com parâmetros de recorte, **quando** ela é colada numa aba nova, **então** a
   tela abre exatamente naquele recorte.
2. **Dado** uma sequência de navegações que trocaram contexto, **quando** se usa o botão voltar,
   **então** percorre-se o caminho inverso, **um passo por vez**.
3. **Dado** que se digitou numa busca, **quando** se usa o botão voltar, **então** **não** se
   percorre uma entrada por tecla digitada.
4. **Dado** qualquer tela com recorte aplicado, **quando** se recarrega, **então** o recorte
   permanece.
5. **Dado** um link com parâmetros, **quando** ele é aberto por quem **não tem escopo** para aquele
   curso, **então** o dado é negado pelo banco e a tela diz *"você não vê"*, não *"não há"*.
6. **Dado** um link direto aberto **sem sessão**, **quando** a autenticação termina, **então**
   volta-se àquela URL **com os mesmos parâmetros**, e não apenas ao mesmo caminho.

---

### User Story 2 - A tabela densa entrega o recorte a quem chama (Priority: P1)

Quem constrói tela precisa que a ordenação e o filtro da tabela **sejam da tela**, para poder
colocá-los na URL — e não precisar reabrir o componente para isso.

**Why this priority**: é o achado `CHK012` do checklist de entrada, e é a **única divergência
conhecida entre o que a fatia (b) entregou e o que o documento 25 prescreve**. Resolver agora custa
uma propriedade; resolver depois custa reabrir um componente que várias telas já usam.

**Independent Test**: montar a tabela com ordenação e filtro vindos de fora, mudar os dois pelo lado
de fora, e ver a tabela acompanhar — sem tocar em nada dentro dela.

**Acceptance Scenarios**:

1. **Dado** uma tabela que recebe ordenação e filtro por propriedade, **quando** quem chama os
   altera, **então** a tabela reflete a mudança.
2. **Dado** a mesma tabela, **quando** a pessoa clica num cabeçalho ordenável, **então** quem chama
   é **avisado** da nova ordenação, e é ele quem decide onde guardá-la.
3. **Dado** uma tela que **não** quer gerir esse estado, **quando** ela monta a tabela sem passar as
   propriedades, **então** a tabela continua funcionando por conta própria. ⚠️ **Nenhuma tela da
   fatia (b) pode quebrar**, e a vitrine é a prova disso.
4. **Dado** os outros três componentes com estado interno, **quando** esta fatia termina, **então**
   eles continuam guardando o próprio estado — porque é efêmero, e a URL não é lugar para ele.

---

### User Story 3 - O shell existe, e a pessoa sabe onde está (Priority: P2)

Quem entra no sistema precisa de **um lugar para ir**: menu, cabeçalho e a indicação de onde está.

**Why this priority**: hoje, depois de entrar, a pessoa cai numa página **sem um único link**. É
medição do Épico 3, está registrada como `CHK025` da fatia (a) desde 10/09/2026, e continua aberta.

**Independent Test**: entrar no sistema e alcançar qualquer tela existente sem digitar URL.

**Acceptance Scenarios**:

1. **Dado** uma sessão válida, **quando** a aplicação abre, **então** existe navegação visível, e
   toda tela existente é alcançável por ela.
2. **Dado** o menu, **quando** ele é percorrido, **então** as entradas são as mesmas da v2.0, com os
   mesmos nomes — a troca de mecanismo **não** autoriza reorganizar nem renomear.
3. **Dado** qualquer tela, **quando** se navega só pelo teclado, **então** existe forma de **pular
   direto ao conteúdo**, sem atravessar o menu inteiro a cada tela.
4. **Dado** uma tela em carregamento ou em erro, **quando** isso acontece, **então** o segmento tem
   retorno visual próprio, e a falha de uma região não derruba a casca.

---

### User Story 4 - A tela Início deixa de ser um beco (Priority: P2)

Quem entra precisa ver **o panorama**: progresso por turma, os alertas urgentes, e o caminho para a
tela do curso.

**Why this priority**: é o `RF-INI`, e é a tela que o backlog atribui a este épico. Ela é também o
que transforma a navegação em algo que se usa, e não apenas em algo que existe.

**Independent Test**: entrar no sistema e, sem digitar URL, ver o panorama e alcançar uma turma.

**Acceptance Scenarios**:

1. **Dado** a tela inicial, **quando** ela abre, **então** mostra o progresso de cada turma —
   previsto, executado e restante — e sinaliza as que estão em atraso.
2. **Dado** a tela inicial, **quando** se aplica um recorte por classificação ou modalidade,
   **então** o recorte vai para a URL e sobrevive ao recarregamento.
3. **Dado** um perfil com escopo restrito de curso, **quando** a tela abre, **então** ela mostra
   apenas o que o banco lhe entrega — a restrição é do banco, não da tela.
4. **Dado** os alertas urgentes, **quando** existem, **então** aparecem **sempre visíveis**, nunca
   ocultos atrás de interação.

---

### User Story 5 - Uma URL errada não quebra a tela (Priority: P3)

Quem cola um link truncado, antigo ou editado à mão precisa de uma tela que **funcione mesmo assim**.

**Why this priority**: com o `RF-NAV-01`, a barra de endereço passa a ser **entrada de usuário** — e
nenhum requisito a tratava como tal. É o achado `CHK003` do checklist de entrada.

**Independent Test**: editar a URL à mão com valores impossíveis e conferir que a tela abre.

**Acceptance Scenarios**:

1. **Dado** um parâmetro com valor fora do domínio, **quando** a tela abre, **então** ela usa o valor
   padrão daquele parâmetro e **os demais parâmetros são preservados**.
2. **Dado** um parâmetro que não pertence ao contrato daquela rota, **quando** a tela abre, **então**
   ele é ignorado e a tela não quebra.
3. **Dado** um identificador que não existe ou que a pessoa não alcança, **quando** a tela abre,
   **então** ela distingue *"não há"* de *"você não vê"*.
4. **Dado** qualquer um dos casos acima, **quando** ele acontece, **então** **nenhuma exceção não
   tratada** chega à pessoa.

### Edge Cases

- **Parâmetro sem o seu par** — recorte que exige dois valores e recebe um só: a tela usa o padrão
  para o que falta, e não abre vazia.
- **URL longa demais** — muitos valores escolhidos num filtro de escolha múltipla: o contrato precisa
  dizer o que acontece, em vez de descobrir no primeiro link que não abre.
- **Mesma tela alcançada por dois caminhos** — menu e cartão do panorama: o histórico precisa se
  comportar igual nos dois.
- **Duas abas do navegador na mesma tela, com recortes diferentes**: cada uma mantém o seu, porque o
  estado está na URL e não em memória compartilhada.
- **Voltar depois de sair e entrar de novo**: a navegação anterior à sessão não pode reaparecer.
- **Tela sem dado nenhum, por o épico que a povoa ainda não existir**: a tela diz isso, em vez de
  parecer quebrada.
- **Preferência por menos movimento**: a troca de tela não introduz animação que a pessoa pediu para
  não ver.

## Requirements *(mandatory)*

### Contrato de parâmetros da URL

- **FR-001**: O contrato de parâmetros por rota MUST ser **fechado e declarado num ponto único**, e
  toda tela MUST usá-lo. Parâmetro novo entra no contrato **ou não existe**.
  ⚠️ Hoje o mapa vive no documento 25 §1.3, que se autodenomina *"contrato único do sistema"* e que
  **nenhum requisito cita** — então uma tela nova pode inventar parâmetro sem violar requisito nenhum
  (`CHK001`).
- **FR-002**: Todo parâmetro MUST ter **tipo e valor padrão declarados**, e o parâmetro no valor
  padrão MUST **não aparecer** na URL.
- **FR-003**: O valor de um parâmetro que identifica registro MUST ser a **chave de negócio legível**
  (`TUR-000012`), nunca o identificador técnico interno.
  ⚠️ Um identificador técnico na barra de endereço não diz nada a ninguém, e a chave de negócio é
  rastreável até a v2.0.
- **FR-004**: A política de **histórico** MUST ser declarada por tipo de ação: trocar contexto
  acrescenta entrada; refinar a mesma tela substitui a entrada; digitar em busca substitui **e**
  limita frequência.
  ⚠️ O documento 25 §1.6 chama essa política de *"a única regra que se erra na prática"*, e ela não
  tem critério de aceite em requisito nenhum (`CHK005`).
- **FR-005**: A limitação de frequência da busca MUST ter **valor declarado em requisito**, e não
  apenas em exemplo de código (`CHK006`).
- **FR-006**: Parâmetro com **valor fora do domínio** MUST fazer a tela usar o valor padrão daquele
  parâmetro, **preservando os demais**, sem exceção e sem tela em branco.
- **FR-007**: Parâmetro **fora do contrato** da rota MUST ser ignorado, sem quebrar a tela.
- **FR-008**: Identificador **inexistente ou fora do escopo** do perfil MUST produzir um estado vazio
  que distingue *"não há"* de *"você não vê"* (`RN-DEG-01`, gotcha nº 4 do BRIEF).

### Estado que **não** vai para a URL

- **FR-009**: MUST ser declarado, como requisito verificável, **o que não pertence à URL**: dado do
  sistema, e estado efêmero de interface.
  ⚠️ O documento 25 §3.3 lista **seis proibições nomeadas** e nenhuma virou requisito (`CHK007`). O
  risco tem nome no próprio backlog: *"o gerenciador de estado virar o `AppState` disfarçado"*.
- **FR-010**: **Estado efêmero de interface** MUST ser definido com **exemplo e contraexemplo**, e
  não por lista de casos (`CHK008`).
- **FR-011**: Nenhum gerenciador de estado global MUST ser instalado nesta fatia **sem um consumidor
  legítimo medido**.
  ⚠️ **Decisão de contenção, e ela repete o que a fatia (b) mediu**: lá a lista de instalação encolheu
  de catorze pacotes para dois, porque o que já estava instalado cobria sete primitivos. Instalar
  antes de precisar é como o `AppState` volta.

### Os componentes da fatia (b) — estado por fora

- **FR-012**: A **tabela densa** MUST aceitar **ordenação** e **filtro textual** por propriedade, e
  MUST avisar quem chama quando eles mudam.
  ⚠️ **É o achado `CHK012`, e é a única divergência conhecida entre o entregue e o prescrito.** O
  documento 25 §1.6 trata ordenação de coluna como estado de URL; hoje a tabela a guarda por dentro
  e não a expõe.
- **FR-012.1**: As duas propriedades MUST ser **opcionais**. Sem elas, a tabela MUST continuar
  gerindo o próprio estado.
  ⚠️ **É o que impede esta fatia de quebrar a anterior.** A vitrine monta a tabela sem essas
  propriedades, e precisa continuar funcionando.
- **FR-013**: Os componentes que guardam **apenas estado efêmero** — painel aberto, busca dentro do
  painel, seção recolhida, posição do foco — MUST **permanecer como estão**.
  ⚠️ **Medido em 11/09/2026**, e é o que delimita a refatoração: são três componentes, e mudá-los
  seria empurrar estado efêmero para a barra de endereço, que é o erro oposto e igualmente proibido.
- **FR-014**: O componente de **filtro avançado** MUST ser ligado ao contrato de parâmetros **sem
  alteração no componente** — ele já recebe e devolve estado por propriedade.

### Shell de navegação

- **FR-015**: Os componentes de shell MUST receber **linha no inventário do Design System**, com
  arquivo, base e a declaração de onde há interação — como os treze da fatia (b) têm.
  ⚠️ **Medido em 11/09/2026: nenhum dos quatro tem** (`CHK015`). Componente sem endereço é componente
  que cada tela reinventa.
- **FR-016**: MUST existir **navegação visível e persistente**, a partir da qual toda tela existente
  é alcançável sem digitar URL.
- **FR-017**: As entradas do menu MUST ser **as mesmas da v2.0**, com os mesmos nomes. A mudança de
  mecanismo de estado MUST **não** autorizar reorganizar nem renomear (`RF-NAV-02`).
- **FR-017.1**: A **lista das entradas atuais** MUST ser registrada nesta fatia, como referência
  contra a qual a paridade se mede.
  ⚠️ Sem a lista escrita, o `FR-017` não é verificável — e requisito não verificável passa por
  vacuidade (`CHK017`).
- **FR-018**: O cabeçalho provisório do Épico 3 MUST ser **substituído**, não duplicado. O alternador
  de tema da vitrine MUST **sair** quando o do cabeçalho entrar (`CHK037`).
- **FR-019**: MUST existir requisito declarando **qual parte do shell** tem interação, e portanto vai
  para o navegador.
  ⚠️ O shell é o lugar mais tentador do sistema — menu que abre e fecha — e é onde o erro custa mais
  caro: ele contamina toda a subárvore de importação e **não aparece na checagem de tipos**.
- **FR-020**: Cada segmento de rota MUST ter **retorno visual de carregamento** e **contenção de
  erro** próprios, e a falha de uma região MUST **não** derrubar a casca (`RF-MOD-01`, `RN-DEG-01`).
- **FR-021**: A navegação MUST ser acessível: marco de navegação anunciado, **atalho para pular ao
  conteúdo**, e destino de foco declarado ao trocar de rota (`CHK018`).
  ⚠️ A fatia (b) fechou isso para componentes; a navegação é a parte que ela não alcançou.
- **FR-022**: As **cinco telas do Épico 3** MUST passar a consumir o vocabulário visual da fatia (a)
  (`CHK038`).

### Os quatro comportamentos do `RF-NAV-04`

- **FR-023**: **Link direto** MUST abrir a tela no recorte exato, sem passar pela tela inicial.
- **FR-024**: O **histórico do navegador** MUST percorrer o caminho inverso das trocas de contexto,
  um passo por vez.
- **FR-025**: O **link compartilhado** MUST abrir a mesma tela com o mesmo recorte para quem tem
  escopo — e MUST **não vazar informação** para quem não tem, porque o banco nega.
- **FR-026**: **Recarregar** MUST preservar todo o recorte.
- **FR-027**: O retorno após a autenticação MUST preservar **os parâmetros**, e não apenas o caminho
  (`RF-AUTH-08`, `CHK027`).
  ⚠️ O critério verificável do próprio `RF-AUTH-08` exige o parâmetro de volta — mas quem implementa
  o retorno precisa saber disso por requisito, não por leitura atenta de uma nota de rodapé.

### Tela Início

- **FR-028**: MUST existir a tela inicial como **casca navegável**, com o **progresso por turma**
  que o dado atual sustenta — previsto, executado e restante — e sinalização de turma em atraso
  (`RF-INI-01`).
  ⚠️ **Decisão de 11/09/2026.** A tela entra agora porque hoje, depois de autenticar, a pessoa cai
  numa página **sem um único link**. O que depende dos Épicos 5 a 9 entra pelo `FR-033`, como estado
  vazio explicado — e não como tela adiada.
- **FR-029**: A tela MUST permitir **recorte por classificação e por modalidade**, e o recorte MUST
  ir para a URL (`RF-INI-02`).
- **FR-030**: A tela MUST ser **ponto de entrada** para a tela de qualquer turma listada
  (`RF-INI-03`).
- **FR-031**: A tela MUST reservar a região dos **alertas mais urgentes**, sempre visível e sem
  exigir interação para aparecer (`RF-INI-04`, `RNF-USA-04`).
  ⚠️ **A região entra; os predicados, não.** O `RF-INI-04` nomeia quatro alertas — disciplina sem
  instrutor, disciplina em atraso, vista de prova vencida e mudança de regime próxima — e os quatro
  são funções puras que dependem de dado dos Épicos 5 a 9. Entram lá, **na região que nasce aqui**.
- **FR-032**: A identidade institucional MUST aparecer na tela inicial, e o arquivo MUST ter
  **procedência e licença registradas** no repositório (`RF-INI-05`).
  ⚠️ **Medido em 11/09/2026: não há brasão no repositório.** A fatia (a) resolveu isto para a
  tipografia, com a licença versionada ao lado; aqui não há requisito equivalente (`CHK025`).
- **FR-033**: O conteúdo que **depende de épicos ainda não entregues** MUST exibir estado vazio
  explicado, dizendo **qual** informação ainda não existe, e MUST **não** parecer defeito.
  ⚠️ **Decisão de 11/09/2026: a tela entra como casca navegável, não completa.** O backlog diz que o
  conteúdo *"acende conforme os épicos chegam"*, e esta linha é o que faz a tela dizer isso à pessoa
  em vez de mostrar um espaço em branco que parece erro.
  ⚠️ **E o estado vazio aqui não é o do gotcha nº 4.** Ele não é "não há" nem "você não vê": é
  **"ainda não existe no sistema"** — um terceiro caso, e o único dos três que some sozinho com o
  tempo.

### Fronteira — o que esta fatia não faz

- **FR-034**: Nenhuma **tela de domínio** dos Épicos 5 a 13 MUST ser construída aqui.
- **FR-035**: Nenhuma **rota de impressão** MUST ser construída aqui — são dos Épicos 10 e 11. O
  contrato de parâmetros MUST, porém, **reservar** que a rota de impressão herda os parâmetros da
  tela de origem, sem tradução.
- **FR-036**: Nenhuma **regra de negócio** MUST ser implementada em componente de shell.
- **FR-037**: Nenhuma cor MUST entrar fora do ponto único — a regra da fatia (a) continua valendo, e
  o shell é código novo que precisa nascer dentro dela.

### Requisitos que fecham dívida herdada

- **FR-038**: MUST ficar escrito se a rota da vitrine continua **sem sessão** depois de existir
  navegação autenticada (`CHK039`).
- **FR-039**: O módulo de design nascido na fatia (a) MUST constar da estrutura do repositório
  documentada (`CHK040` da lista anterior, `CHK022` da fatia (a)).
- **FR-040**: O **breadcrumb** MUST **não** ser construído nesta fatia.
  ⚠️ **Decisão de 11/09/2026, e ela é uma recusa declarada.** Ele aparece apenas no backlog do Épico 4
  e **nenhum `RF-` o menciona** — logo, é novidade, e o Princípio X a barra até haver paridade
  funcional com a v2.0. **Recusa declarada não é esquecimento**: ele volta quando a paridade chegar,
  e a diferença entre as duas coisas está inteiramente neste registro.
  ⚠️ **Consequência que fica:** sem breadcrumb, a indicação de "onde estou" recai sobre o menu e o
  título da tela — e o `FR-016` precisa dar conta disso sozinho.

## Key Entities

Esta fatia **não introduz entidade de dado**. Ela introduz um **contrato**: o conjunto de parâmetros
que cada rota aceita, com tipo, valor padrão e política de histórico. O contrato é dado de projeto,
não dado de negócio — ele vive no código, é lido por toda tela, e é o que o `FR-001` torna fechado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos quatro comportamentos do `RF-NAV-04` são demonstráveis por percurso
  automatizado **sobre as rotas que esta fatia entrega** — tela inicial, vitrine e as telas do Épico
  3 —, com parâmetros reais do contrato.
  ⚠️ **Decisão de 11/09/2026, e ela recusa a alternativa mais fácil.** Criar rota provisória só para
  exercitar o contrato completo pareceria mais rigoroso e provaria menos: **rota provisória costuma
  sobreviver mais do que se planeja**, e nenhuma tela do sistema a usaria. O `RF-NAV-04` ganha dono
  agora, sobre tela de verdade.
  ⚠️ **O que isso deixa em aberto, declarado:** os parâmetros das rotas dos Épicos 5 a 9 só serão
  exercitados quando aquelas telas existirem. O contrato do `FR-001` os declara desde já; a prova de
  cada um chega com a sua tela.
- **SC-002**: Depois de autenticar, a pessoa alcança **toda** tela existente **sem digitar URL**.
- **SC-003**: A contagem de telas alcançáveis apenas por digitação de URL é **zero**.
- **SC-004**: Um link com recorte, colado numa aba nova, reproduz a tela em **um** passo — sem
  passagem intermediária por outra tela.
- **SC-005**: Um link direto aberto sem sessão termina, após autenticar, **na mesma URL, com os
  mesmos parâmetros**.
- **SC-006**: A contagem de parâmetros aceitos fora do contrato declarado é **zero**.
- **SC-007**: **100%** dos parâmetros do contrato têm tipo, valor padrão e política de histórico
  declarados.
- **SC-008**: Uma URL com valores impossíveis em **todos** os parâmetros abre a tela, sem exceção não
  tratada e sem área em branco.
- **SC-009**: A tabela densa aceita ordenação e filtro por fora, **e** continua funcionando sem eles
  — as duas formas medidas.
- **SC-010**: A contagem de componentes da fatia (b) que **deixaram de funcionar** por causa desta
  fatia é **zero**.
- **SC-011**: A contagem de componentes de shell sem linha no inventário do Design System é **zero**.
- **SC-012**: A contagem de entradas de menu que mudaram de nome ou de posição em relação à v2.0 é
  **zero**, medida contra a lista que o `FR-017.1` registra.
- **SC-013**: A auditoria de contraste e a regra de cor continuam **verdes**, com o shell incluído.
- **SC-014**: Digitar uma palavra de oito letras numa busca produz **uma** entrada de histórico, não
  oito.
- **SC-015**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit.
- **SC-016**: Os **nove itens** ainda abertos no checklist da fatia (a) e os **quarenta** do checklist
  de entrada estão **fechados ou explicitamente recusados** ao fim desta fatia — recusa declarada
  conta; silêncio, não.

## Assumptions

Estas são as escolhas feitas na ausência de instrução explícita. Elas estão aqui para serem
contestadas, e não para passarem despercebidas.

- **A chave de negócio é estável o bastante para virar URL pública.** O documento 25 §9.1 registra a
  dúvida — um link favoritado quebra se a chave for reemitida. Assumimos estável, porque o ETL do
  Épico 2 preserva a chave da v2.0 verbatim e nada no sistema a reemite. ⚠️ **É premissa, não fato
  verificado.**
- **Parâmetro inválido degrada para o padrão, em silêncio para a pessoa e com registro para quem
  opera.** A alternativa — recusar a URL — transformaria um link antigo em erro, que é pior para quem
  cola o link e não sabe por quê.
- **Nenhum gerenciador de estado global entra nesta fatia.** Não há consumidor legítimo medido: os
  dois usos que o documento 25 nomeia são o rascunho de formulário longo e a seleção múltipla em
  massa, e nenhum dos dois existe antes dos Épicos 5 e 6.
- **A rota da vitrine permanece sem sessão.** Ela não exibe dado algum, e exigir autenticação para
  ver uma paleta não protegeria nada. Fica como requisito escrito, não como herança.
- **A semana de calendário continua exigindo o ano como par.** O documento 25 §9.2 deixa a alternativa
  em aberto; adotamos a forma que casa com o planejamento anual já modelado.
- **Os quatro componentes de shell nascem com entrada no inventário**, criada por esta fatia. É
  emenda a documento normativo, e por isso o `FR-015` a declara em vez de fazê-la de passagem.
- **A refatoração se limita à tabela densa.** Medido: os outros três componentes com estado interno
  guardam estado efêmero, que o documento 25 §3 mantém fora da URL de propósito.
- **Persistir rascunho de formulário no navegador fica fora.** A decisão é de Bernardo (documento 25
  §9.4), toca o recorte de PII do Épico 3, e não há formulário longo antes do Épico 5.
