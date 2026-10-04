# Feature Specification: Navegação recolhível e o módulo de Turmas

**Feature Branch**: `feat/EPICO-5.5-navegacao-e-turmas`

**Created**: 03/10/2026

**Status**: Draft — **clarificada em 04/10/2026**; as três dúvidas respondidas, Épico 5.5 e D-NAV-1
ratificados (ver *Clarifications*). Pronta para o plano.

**Input**: Épico de **UX e consolidação**, nascido dos testes de Bernardo em 03/10/2026, **sem regra
de negócio nova**. Quatro frentes: (1) a lateral passa a ser recolhida por padrão, com ícones, dica
ao apontar, expansão ao passar o mouse e fixação persistente; (2) nasce o módulo **Turmas**, com a
lista `/turmas` e a ficha que já existe; (3) o bloco por turma sai de `/disciplinas` e vai para a
ficha, com os endereços antigos redirecionando; (4) a ficha ganha a seção **Andamento**, com a CH
prevista, a executada e o **saldo de capacidade (TA)**.

## Por que esta fatia existe, e por que agora

Ela nasce de **uso real**, não de lacuna de requisito: Bernardo navegou o sistema e encontrou duas
coisas. A primeira é que **a turma não tem lugar** — ela só existe como **parâmetro** de outras
telas (`/cursos/[curso]?turma=`, `/disciplinas?curso=&turma=`), e a ficha `/turmas/[turma]`, que
existe desde o Épico 5 (a), **só se alcança passando pelo curso**. Quem pensa *"quero ver a turma
T2"* não tem por onde começar. A segunda é que **a lateral fixa de 224 px cobra largura de toda
tela** num sistema cujo valor é densidade de tabela.

⚠️ **E a medição do estado atual achou uma terceira coisa, que ninguém tinha pedido para olhar:**
`/inicio` **já** sinaliza *"em atraso"*, e sinaliza **o contrário** do que o `RF-INI-01` define —
ele dispara quando a turma executou **mais** do que a carga curricular, e **nunca** dispara para
quem está de fato atrasado, porque o cálculo não lê `data_termino`, `feriados` nem TA/dia. Está
medido, com o arquivo e a linha, em `estado-atual.md` §3. **É a razão pela qual esta fatia não pode
só acrescentar um número numa tela nova:** ou o cálculo passa a ser único, ou o sistema passa a dar
duas respostas opostas para a mesma palavra.

## Clarifications

### Session 2026-10-04 — as respostas às três dúvidas da rodada anterior

- Q: De onde sai o TA/dia de uma turma, para a capacidade diária seguir a modalidade real dela
  (`RN-MAT-04`)? → A: **De nenhuma das quatro opções oferecidas — o dado já existe.**
  `vw_cursos_regime_vigente` traz, por curso, `regime_padrao_tempos` e `limite_diario_ead_horas`, e a
  regra é a **mesma da v1.0** (`temposDiaDaTurma_`): turma **presencial ou semipresencial** →
  `regime_padrao_tempos` do curso; turma **EAD** → `limite_diario_ead_horas` do curso. **Quem escolhe é
  a modalidade da TURMA**, não a do curso. **Sem migration.** Curso **sem regime vigente** → capacidade
  *"sem dado"*, **sem** alerta de atraso (`RN-DEG-01`). *(decisão de Bernardo Villas Boas, 04/10/2026)*
  ⚠️ **Conferido no catálogo em 04/10/2026, antes de escrever:** a view existe, é `security_invoker`,
  resolve o regime vigente **hoje** por `app.fn_regime_vigente(curso, current_date, 'padrao')`, e o
  modelo já espera exatamente essa divisão — desde 08/09/2026 um regime EAD tem `regime_tempos = 0`
  **e** `limite_diario_ead_horas` preenchido, por `CHECK` (`20260908085000_regime_ead_sem_ta.sql`).
  Logo usar `regime_padrao_tempos` numa turma EAD daria capacidade **zero** e atraso falso, e é por
  isso que a modalidade decide a coluna. ⚠️ **A minha medição de 03/10 errou por omissão**: procurou
  TA/dia em `config_parametros` e em `horarios_tempos_aula` e **não olhou o regime do curso** — o
  registro de `estado-atual.md` §3 foi corrigido, com data e com o erro nomeado.
  ⚠️ **E as duas colunas têm UNIDADES diferentes:** `regime_padrao_tempos` é em **tempos (TA)**;
  `limite_diario_ead_horas` é em **horas**, `numeric(4,2)`. Tratar a segunda como TA/dia assume
  **1 TA = 1 h** — a convenção já fixada na spec 006 (T011: *"1 TA ≈ 1 h"*) e, segundo Bernardo, o que
  a v1.0 fazia. Registrado como premissa herdada, não como regra nova.
- Q: O PR 3 conserta o `/inicio`, ou só a ficha ganha o cálculo? → A: **Opção A — `/inicio` passa a
  consumir o módulo novo, no PR 3.** Fica **um** cálculo de *"em atraso"* no sistema, e o caso que
  discrimina vem de graça, nos dois sentidos. *(decisão de Bernardo Villas Boas, 04/10/2026)*
- Q: A lateral evolui o que existe, ou vem o componente pronto do shadcn? → A: **Opção A, DEFINITIVA —
  evoluir `PainelRetratil` e `NavegacaoLateral`, sem pacote novo.** *(decisão de Bernardo Villas Boas,
  04/10/2026, no complemento da mensagem que havia chegado truncada; até ele chegar, a resposta esteve
  registrada aqui como padrão provisório.)*
- Ratificações do mesmo complemento *(Bernardo Villas Boas, 04/10/2026)*: **o épico é o 5.5** e a
  **D-NAV-1 é a NOVA validação do menu — ela substitui a MENU-1** de 11/09/2026, e é contra ela que a
  paridade do menu passa a ser medida.

### Session 2026-10-03 — as decisões que acompanham o pedido

- **D-NAV-1 — a ordem do menu passa a ser Início · Cursos · Turmas · Disciplinas · Instrutores ·
  Cronograma · Atividades · Administração** *(decisão de Bernardo Villas Boas, 03/10/2026)*.
  ⚠️ **ELA SUPERA A MENU-1, de 11/09/2026, e isso precisa estar escrito**: a MENU-1 validou, contra
  a v2.0 em produção, a ordem *Início · Cursos · Cronograma · Atividades · Instrutores ·
  Disciplinas · Administração*, e `lib/navegacao/menu.ts` traz, no cabeçalho, *"mudar qualquer linha
  desta lista exige nova validação"* — porque o `RF-NAV-02` é **[PRESERVADO]** e diz que a troca de
  mecanismo de estado *"não autoriza reorganizar o menu nem renomear entradas"*. **A ordem nova não
  renomeia nem remove nada**: ela **insere** Turmas e **reagrupa** quatro entradas, aproximando o
  que já tem tela (Cursos, Turmas, Disciplinas, Instrutores) e afastando o que ainda não tem
  (Cronograma, Atividades). ✅ **Ratificada por Bernardo Villas Boas em 04/10/2026 como a NOVA
  validação do menu, substituindo a MENU-1.** O cabeçalho de `lib/navegacao/menu.ts` e o registro
  datado em `specs/008-shell-e-estado-na-url/contracts/casca.md` passam a apontar para esta decisão.
- **D-NAV-2 — "fixada" é estado de UI e vive em cookie, não na URL** *(decisão de Bernardo Villas
  Boas, 03/10/2026)*. É **exceção declarada** à regra *"estado de tela vai para a URL"*: o painel
  estar fixo **não pertence a link nenhum** — compartilhar um endereço não deve impor ao outro a
  largura do menu dele. É a mesma razão que já mantém o abre-e-fecha de tela estreita fora da barra
  de endereço, e a mesma do tema.
- **D-NAV-3 — o caminho de volta da ficha da turma passa a ser Turmas** *(decisão de Bernardo Villas
  Boas, 03/10/2026)*. ⚠️ **Isto EMENDA o `FR-031.6` da spec 009**, que escreve *"o caminho de volta é
  o curso"*. A ficha deixa de ser alcançada **só** pelo curso, então a volta passa a ser a lista —
  e o curso continua alcançável pelo próprio cabeçalho da ficha, que o traz como link.
- **D-NAV-4 — o indicador chama-se "Saldo de capacidade (TA)"** *(decisão de Bernardo Villas Boas,
  03/10/2026)*. A palavra *"gordura"*, que circula na conversa do dia a dia, **não é termo normativo**
  (Glossário 07) e **não entra** em código, banco nem tela. *Tempo Reserva (TR)* é outra coisa: a
  reserva de 10% da CHR, que já existe no sistema.

## User Scenarios & Testing *(mandatory)*

> **Os três PRs e as quatro histórias.** **PR 1** entrega a US1; **PR 2** entrega a US2 e a US3;
> **PR 3** entrega a US4. A divisão em quatro histórias existe porque a US2 e a US3 têm valor
> separado e **falham de maneiras diferentes**: uma é *"não acho a turma"*, a outra é *"o link que eu
> tinha salvo quebrou"*.

### User Story 1 — A tela devolve a largura, e a navegação continua ao alcance (Priority: P1)

Quem usa o sistema passa o dia em tabelas largas — 177 instrutores, 210 linhas de grade. A lateral
nasce **recolhida**, mostrando só os ícones; quem passa o mouse vê os rótulos sem clicar; quem quer
o menu aberto o tempo todo **clica e ele fica**, inclusive ao trocar de página.

**Why this priority**: é a única frente que afeta **todas** as telas do sistema, e é a que Bernardo
levantou primeiro. Ela não depende de nada das outras três.

**Independent Test**: entra-se no sistema e navega-se entre três telas sem tocar em turma nenhuma; a
lateral se comporta igual nas três, e o estado fixado sobrevive à troca de página.

**Acceptance Scenarios**:

1. **Dado** que entro no sistema pela primeira vez num computador, **quando** a tela abre, **então** a
   lateral está recolhida, mostrando um ícone por entrada, e o conteúdo da página ocupa a largura que
   antes era do menu.
2. **Dado** que a lateral está recolhida, **quando** aponto para um ícone, **então** aparece o rótulo
   daquela entrada, e **quando** afasto o ponteiro, **então** a lateral volta a recolher — sem que eu
   tenha clicado em nada.
3. **Dado** que a lateral está recolhida, **quando** clico no controle de fixar, **então** ela fica
   expandida; **quando** navego para outra tela, **então** ela **continua** expandida; **quando** clico
   de novo, **então** ela recolhe e **permanece** recolhida na tela seguinte.
4. **Dado** que a lateral está fixada e eu recarrego a página, **quando** a tela aparece, **então** ela
   já aparece expandida — **sem** abrir recolhida e saltar depois.
5. **Dado** que estou num telefone, **quando** a tela abre, **então** vejo o botão de menu e a
   navegação chega por gaveta; **então** passar o dedo sobre um ícone **não** expande nada.
6. **Dado** que navego por teclado, **quando** percorro a página com `Tab`, **então** alcanço todas as
   entradas disponíveis e o controle de fixar, e a entrada da tela em que estou é anunciada como a
   atual **sem depender de cor**.
7. **Dado** o menu, **quando** o leio de cima para baixo, **então** a ordem é Início · Cursos · Turmas ·
   Disciplinas · Instrutores · Cronograma · Atividades · Administração, e Cronograma e Atividades
   seguem marcados *"em breve"*.

### User Story 2 — Encontrar uma turma sem saber o curso dela (Priority: P1)

Hoje a turma só se alcança por dentro do curso. Passa a existir **Turmas** no menu, com uma lista que
se filtra por curso, ano e situação, e com busca — e cada linha leva à ficha.

**Why this priority**: é o pedido que originou o épico. Sem ela, a ficha da turma — que **já
existe** — continua escondida atrás de duas telas.

**Independent Test**: do menu, chega-se à lista, filtra-se, e abre-se a ficha de uma turma, sem
passar pela página de curso nenhuma.

**Acceptance Scenarios**:

1. **Dado** que estou em qualquer tela, **quando** clico em *Turmas* no menu, **então** vejo a lista
   das turmas que o meu perfil alcança, cada uma com o rótulo legível da turma, o curso, o ano, as
   datas e a situação.
2. **Dado** a lista, **quando** filtro por curso, por ano e por situação, **então** a lista encolhe de
   acordo, **e** o endereço da página passa a carregar esses filtros — colá-lo noutra aba reproduz a
   mesma lista.
3. **Dado** que apliquei filtros, **quando** o conjunto deixa de ser o padrão, **então** aparece o botão
   *Limpar filtros*, e clicá-lo devolve a lista ao estado inicial.
4. **Dado** que escrevo na busca, **quando** o texto casa com o rótulo ou o código de uma turma,
   **então** a lista mostra as que casam.
5. **Dado** um filtro que não casa com nada, **quando** a lista fica vazia, **então** a tela diz que
   **não há turma com esse recorte** — e não deixa no ar a dúvida de eu não ter permissão de ver.
6. **Dado** a lista, **quando** clico numa linha, **então** abro a ficha daquela turma.
7. **Dado** que estou na ficha de uma turma, **quando** uso o caminho de volta, **então** volto para
   **Turmas**, e o curso continua a um clique pelo cabeçalho da ficha.

### User Story 3 — A turma tem um só lugar, e nenhum link antigo quebra (Priority: P2)

O bloco que mostra as disciplinas **de uma turma** vive hoje em `/disciplinas?turma=`. Ele passa para
a ficha da turma — **os mesmos componentes, inclusive a edição** —, e os endereços que apontavam
para o lugar antigo levam ao novo.

**Why this priority**: a consolidação é o que faz o módulo valer a pena; sem ela, a turma passa a
ter **dois** lugares em vez de um. Vem depois da US2 porque o destino precisa existir antes.

**Independent Test**: abre-se um endereço antigo, anotado antes da mudança, e confere-se que ele
chega ao lugar novo, na seção certa.

**Acceptance Scenarios**:

1. **Dado** que estou na ficha de uma turma, **quando** rolo até a seção *Disciplinas*, **então** vejo,
   por disciplina, a CH prevista, o período e os instrutores daquela turma — e consigo editar o que
   eu já editava na tela de disciplinas.
2. **Dado** um endereço antigo `/disciplinas?curso=X&turma=Y`, **quando** o abro, **então** chego à
   ficha da turma Y, posicionado na seção de disciplinas.
3. **Dado** um endereço `/cursos/X?turma=Y`, **quando** o abro, **então** ele continua funcionando.
4. **Dado** que estou em `/disciplinas` **sem** turma escolhida, **quando** uso a tela, **então** ela
   segue entregando a grade por curso, como antes — o que saiu é o recorte **por turma**.
5. **Dado** que estou na página de um curso, **quando** olho a aba das turmas dele, **então** cada
   linha leva à ficha e há um caminho para *ver todas*, que abre a lista já filtrada por esse curso.

### User Story 4 — Saber se a turma cabe no tempo que resta (Priority: P2)

A ficha passa a dizer quanto da carga já foi dado, quanto falta, e **se o que falta ainda cabe** nos
dias úteis até o término — o *saldo de capacidade (TA)*.

**Why this priority**: é a pergunta que o `RF-INI-01` manda responder, e hoje **nenhuma tela a
responde certo**. Vem por último porque depende de a ficha já ter as outras seções.

**Independent Test**: escolhe-se uma turma com lançamentos reais, calcula-se o saldo **à mão** a
partir dos dados, e confere-se número por número com o que a tela mostra.

**Acceptance Scenarios**:

1. **Dado** que abro a ficha de uma turma com lançamentos, **quando** olho a seção *Andamento*,
   **então** vejo a CH prevista, a executada, o percentual, uma barra de progresso e o **saldo de
   capacidade** expresso em TA **e** em dias.
2. **Dado** uma turma em andamento cujo saldo de capacidade é negativo, **quando** abro a ficha,
   **então** a tela a sinaliza **em atraso**, dizendo quantos TA faltam de capacidade.
3. **Dado** uma turma **concluída** que executou mais do que o previsto, **quando** abro a ficha,
   **então** ela **não** é sinalizada em atraso.
4. **Dado** uma turma em andamento que já executou mais do que o previsto e tem semanas pela frente,
   **quando** abro a ficha, **então** ela **não** é sinalizada em atraso.
5. **Dado** uma turma **sem nenhum lançamento**, **quando** abro a ficha, **então** a seção diz *"ainda
   sem lançamentos"* — e não mostra 0%, que se leria como *"nada foi feito"* quando o fato é *"nada
   foi registrado"*.
6. **Dado** que há feriado de **dia inteiro** no período que resta, **quando** o saldo é calculado,
   **então** aquele dia **não** conta como capacidade; **dado** um feriado **parcial** ou
   **informativo**, **então** o dia **continua** contando.
7. **Dado** a seção *Disciplinas* da ficha, **quando** a leio, **então** cada disciplina mostra a CH
   prevista, a executada e o percentual dela — e as somas das disciplinas reconciliam com o total da
   seção *Andamento*.
8. **Dado** a tela de Início, **quando** olho a região de alertas, **então** as turmas sinalizadas *em
   atraso* são **as mesmas** que a ficha sinaliza — a turma ativa em excesso com dias à frente **não**
   aparece ali, e a turma ativa sem dias úteis com carga restante **aparece**.
9. **Dado** uma turma cujo curso não tem regime vigente, **quando** abro a ficha, **então** a
   capacidade aparece como *"sem dado"*, sem alerta de atraso, e a CH prevista, a executada e o
   percentual continuam visíveis.

### Edge Cases

- **Turma sem `data_termino`.** O saldo de capacidade **não é calculável**: a tela mostra a CH
  prevista, a executada e o percentual, e diz, no lugar do saldo, que falta a data de término —
  nunca um número inventado nem um zero que se leia como *"não cabe"* (`RN-DEG-01`).
- **Turma cujo término já passou.** Não há dias úteis à frente: a capacidade é zero, e qualquer carga
  restante deixa o saldo negativo. Se a turma estiver **ativa**, é atraso de verdade; se estiver
  concluída ou cancelada, não é.
- **Turma com CH prevista zero** (currículo por competências — há **dois** cursos assim, medido no
  Catálogo). O percentual não se calcula: a tela diz que o curso não tem carga curricular lançada em
  disciplinas, em vez de exibir `0%` ou dividir por zero.
- **Curso sem regime vigente hoje.** Não há TA/dia: a capacidade aparece como *"sem dado"*, a turma
  **não** é sinalizada em atraso, e o resto da seção — prevista, executada, percentual — segue normal
  (`RN-DEG-01`, FR-026.1). O caminho para resolver é a edição do curso, que já existe.
- **Primeiro acesso num navegador sem o cookie.** Vale o padrão: recolhida.
- **Cookie com valor corrompido ou desconhecido.** Vale o padrão, sem erro na tela.
- **A pessoa tem o cookie "fixada" e abre no telefone.** Em tela estreita o estado **não tem efeito**:
  manda a gaveta, como hoje.
- **A pessoa navega só por teclado.** Nunca fica sem acesso às entradas: recolher é visual, não é
  remover da ordem de tabulação.
- **A pessoa chega por um endereço antigo que já estava errado** (turma que não existe, ou turma de
  outro curso). O destino decide: *turma não encontrada*, com caminho para a lista — o mesmo que a
  ficha já faz hoje.
- **Perfil que alcança só alguns cursos.** A lista mostra as turmas **que ele alcança**, e o estado
  vazio distingue *"não há"* de *"você não vê"* (gotcha 4).

## Requirements *(mandatory)*

### A lateral recolhível (PR 1)

- **FR-001**: A lateral MUST aparecer em **todas** as telas da aplicação e MUST nascer **recolhida**,
  exibindo um ícone por entrada.
- **FR-002**: Cada entrada MUST ter **nome acessível em todo estado** e, quando recolhida, MUST
  mostrar o rótulo numa dica ao apontar. ⚠️ **Ícone sozinho não é rótulo** — a fatia (b) do Épico 4
  fixou que *"o ícone acompanha o rótulo, nunca o substitui"*, e a lateral recolhida é a primeira
  exceção visual a isso; ela só é aceitável porque o nome continua existindo para quem usa leitor de
  tela e para quem aponta.
- **FR-003**: Apontar para a lateral MUST expandi-la; afastar o ponteiro MUST recolhê-la — **sem
  clique e sem navegação**.
- **FR-004**: MUST haver um controle que **fixa** a lateral expandida, e acioná-lo de novo MUST
  recolhê-la. O controle MUST ser alcançável e operável por teclado, e MUST anunciar o estado.
- **FR-005**: O estado **fixada** MUST persistir entre páginas e entre sessões do navegador, por
  cookie, e MUST ser aplicado **antes da primeira pintura** — a tela MUST NOT abrir recolhida e
  saltar para expandida.
- **FR-006**: Em tela estreita, a navegação MUST continuar chegando por **gaveta com botão**, como
  hoje, e as regras de apontar e fixar MUST NOT se aplicar ali.
- **FR-007**: A entrada ativa MUST continuar comunicada **além da cor** — nome acessível de página
  atual, marca visual e peso —, preservando o `FR-021` da spec 008.
- **FR-008**: Recolher MUST ser **visual**: toda entrada disponível MUST permanecer alcançável por
  teclado nos dois estados.
- **FR-009**: A ordem do menu MUST ser Início · Cursos · **Turmas** · Disciplinas · Instrutores ·
  Cronograma · Atividades · Administração (**D-NAV-1**), e as entradas sem tela MUST continuar
  marcadas *"em breve"*, preservando a decisão MENU-2.
- **FR-010**: O estado da lateral MUST NOT entrar no contrato de parâmetros da URL (**D-NAV-2**), e
  essa exceção MUST estar escrita onde a regra da URL é declarada — não deduzida da ausência.
- **FR-011**: A casca MUST continuar sendo servida do servidor: o comportamento de navegador MUST
  ficar confinado a uma folha pequena, e a lista de entradas MUST chegar a ela **por propriedade**.
  ⚠️ Um marcador de cliente na casca manda **todas** as telas para o pacote do navegador, e isso
  **não aparece na checagem de tipos**.

### O módulo de Turmas (PR 2)

- **FR-012**: MUST existir a rota `/turmas`, listando as turmas que o perfil alcança, com o rótulo
  produzido pelo construtor **único** de rótulo de turma — que **nunca** sai vazio.
- **FR-013**: A lista MUST filtrar por **curso**, **ano**, **situação** e **busca**, e os quatro MUST
  viver na URL, declarados no contrato de parâmetros. ⚠️ Parâmetro fora do contrato **não compila**.
- **FR-014**: A lista MUST ter o botão *Limpar filtros*, pelo componente **único** que já existe, e
  ele MUST aparecer só quando houver filtro fora do padrão.
- **FR-015**: *Turmas* MUST entrar no menu como **disponível no mesmo commit** em que a página nasce.
  ⚠️ A guarda do menu reprova **nos dois sentidos**, e já reprovou no CI quando `/cursos` nasceu e o
  menu ficou dizendo *"em breve"*.
- **FR-016**: Cada linha da lista MUST levar à ficha da turma, por **endereço montado pelo módulo
  único de endereço de turma**. ⚠️ O código da turma **contém espaços**; endereço montado à mão falha
  **em silêncio**.
- **FR-017**: `/cursos/[curso]` MUST manter a seção das turmas do curso, cada linha levando à ficha, e
  MUST oferecer um caminho para **ver todas**, que abre `/turmas` já filtrada por aquele curso.
- **FR-018**: O recorte **por turma** MUST sair de `/disciplinas` e MUST passar para a ficha da turma,
  **com os mesmos componentes, inclusive a edição** — nenhum construtor paralelo.
- **FR-019**: O endereço `/disciplinas?curso=X&turma=Y` MUST levar à ficha da turma Y, posicionado na
  seção de disciplinas; `/cursos/X?turma=Y` MUST continuar funcionando. **Nenhum endereço que existia
  MUST deixar de levar a algum lugar correto.**
- **FR-020**: O caminho de volta da ficha MUST ser **Turmas** (**D-NAV-3**), emendando o `FR-031.6` da
  spec 009, e o curso MUST continuar a um clique pelo cabeçalho da ficha.
- **FR-021**: A ficha MUST ter cabeçalho com rótulo, curso (como link), início, término, situação,
  alunos e modalidade.
- **FR-022**: `/turmas` MUST ser alcançável **por clique** a partir de outra tela, e isso MUST ser
  verificado pela guarda que varre as rotas — **tela sem caminho clicável é tela não entregue**.

### O andamento da turma (PR 3)

- **FR-023**: A ficha MUST ter a seção **Andamento**, com CH prevista, CH executada, percentual, barra
  de progresso e **saldo de capacidade** em TA **e** em dias.
- **FR-024**: As fórmulas MUST viver num módulo de domínio puro, e cada função MUST citar a fórmula
  da v1.0 e o `RF-`/`RN-` que a sustenta.
- **FR-025**: A CH **executada** MUST vir de **lançamento registrado**, nunca de planejamento
  (`RN-CRONOS-01`). ⚠️ Já é o caso da view que o sistema usa, e esta spec **não** reimplementa a soma:
  ela a consome.
- **FR-026**: A **capacidade diária** MUST ser a da **modalidade real da turma** (`RN-MAT-04`), lida
  do **regime vigente do curso** e escolhida pela modalidade da **turma**: presencial e
  semipresencial → os **tempos por dia** do regime padrão; EAD → o **limite diário EAD em horas**,
  contado como 1 TA por hora. MUST NOT haver migration para isso — o dado já existe (decisão de
  04/10/2026).
- **FR-026.1**: Turma cujo curso **não tem regime vigente** MUST exibir a capacidade como *"sem dado"*,
  MUST NOT ser sinalizada em atraso, e MUST continuar mostrando CH prevista, executada e percentual
  (`RN-DEG-01`). ⚠️ Um zero inventado se leria como *"não cabe"*.
- **FR-026.2**: Turma EAD MUST usar o limite em horas **mesmo quando o regime traz tempos** — desde
  08/09/2026 o regime EAD tem `regime_tempos = 0` por construção, e usar esse zero daria capacidade
  nula e atraso falso em toda turma EAD.
- **FR-027**: Feriado MUST descontar capacidade **somente** quando o impacto for **dia inteiro**
  (`RN-EVT-02`); parcial e informativo MUST NOT descontar.
- **FR-028**: *Em atraso* MUST significar **turma em andamento com saldo de capacidade negativo**
  (`RF-INI-01`) — e MUST NOT significar execução acima do previsto.
- **FR-029**: Turma **sem lançamento** MUST exibir *"ainda sem lançamentos"*, distinguindo *"não há"*
  de *"você não vê"*.
- **FR-030**: A seção **Disciplinas** MUST mostrar, por disciplina da turma, a CH prevista, a
  executada, o percentual, o período e os instrutores.
- **FR-031**: MUST existir **um só** cálculo de *"em atraso"* no sistema, e `/inicio` MUST passar a
  consumi-lo **no PR 3** (decisão de 04/10/2026). ⚠️ O cálculo que `/inicio` tem hoje está
  **invertido** (medido em `estado-atual.md` §3): dispara no excesso e nunca no atraso.
- **FR-031.1**: A troca em `/inicio` MUST trazer o **caso que discrimina** (DoD 8), nos dois sentidos:
  uma turma ativa com execução **acima** do previsto e dias à frente **deixa** de ser acusada; uma
  turma ativa com carga restante e **sem** dias úteis **passa** a ser acusada. Teste que dá o mesmo
  veredito antes e depois não testa a troca.
- **FR-031.2**: A mudança em `/inicio` MUST limitar-se ao veredito de *em atraso* e ao que ele exige
  — a capacidade. Prevista, executada, percentual, totais por soma e o desenho do painel MUST NOT
  mudar: esta fatia **não** redesenha o Início.
- **FR-032**: O indicador MUST se chamar **"Saldo de capacidade (TA)"**, e a palavra *"gordura"* MUST
  NOT aparecer em código, banco, tela, spec ou commit (**D-NAV-4**). Medido em 03/10/2026: **zero**
  ocorrências hoje, e isso MUST continuar verdadeiro **por guarda**, não por lembrança.
- **FR-033**: Nenhum indicador desta fatia MUST bloquear ação: *em atraso* é **alerta**
  (`RN-DEG-02`), e dependência ausente MUST devolver vazio ou neutro com aviso (`RN-DEG-01`).

### Key Entities

- **Turma** — o que a lista mostra e a ficha detalha: rótulo, curso, ano letivo, modalidade, datas de
  início e término, situação, alunos, sala.
- **Carga horária da turma** — a prevista (curricular do curso) e a executada (lançamentos), já
  disponíveis por consulta derivada existente.
- **Execução por disciplina** — por turma e disciplina: CH prevista, TA executados, saldo, período
  real e previsto.
- **Feriado** — data, abrangência e **impacto**, que é o que decide se o dia conta como capacidade.
- **Capacidade diária (TA/dia)** — quantos TA a turma consegue consumir por dia útil. Vem do **regime
  vigente do curso**, e a **modalidade da turma** escolhe a coluna: tempos por dia (presencial,
  semipresencial) ou limite diário EAD em horas (EAD). Pode **não existir** — curso sem regime
  vigente —, e a ausência é um estado da tela, não um zero.
- **Regime vigente do curso** — a vigência de regime válida **hoje**, já exposta por consulta derivada
  existente; é de onde saem os tempos por dia e o limite EAD. ⚠️ **Vigente hoje**: a capacidade de
  todo o período restante usa o regime de hoje, como a v1.0 fazia — vigência futura não é
  antecipada.
- **Estado da lateral** — recolhida ou fixada, por pessoa e por navegador. Não é dado de negócio e
  não vive no banco.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em toda tela da aplicação, a área útil de conteúdo com a lateral recolhida é **maior**
  do que era com a lateral fixa — medido na mesma tela, antes e depois.
- **SC-002**: A partir de qualquer tela, chega-se à ficha de uma turma escolhida em **no máximo três
  cliques**, sem passar por página de curso.
- **SC-003**: O estado fixado da lateral sobrevive a **três** navegações consecutivas e a uma
  recarga, e a tela recarregada **não** muda de estado depois de aparecer.
- **SC-004**: **100%** dos endereços que levavam a um recorte por turma antes desta fatia continuam
  levando a um lugar correto depois dela — a lista é finita e está nomeada no plano.
- **SC-005**: Para **uma** turma com lançamentos reais, o saldo de capacidade calculado à mão a
  partir dos dados coincide, **número a número**, com o que a tela mostra — e a conta à mão fica
  registrada no roteiro de conferência.
- **SC-006**: Existe **um** cálculo de *"em atraso"* alcançável no repositório, verificado por
  varredura, e as telas que exibem o indicador o consomem dele.
- **SC-007**: *"gordura"* tem **zero** ocorrências em código, banco, tela e documentação da fatia,
  verificado por varredura que lê **código sem comentário**.
- **SC-008**: A lista `/turmas` abre com **uma** consulta por tela, sem consulta por linha.
- **SC-009**: Toda entrada do menu com tela existente está marcada disponível, e toda entrada marcada
  *"em breve"* **não** tem tela — verificado nos dois sentidos.
- **SC-010**: Navegando **só por teclado**, alcança-se toda entrada disponível da lateral e o controle
  de fixar, nos dois estados.
- **SC-011**: `pnpm verificar:tudo` sai **0**, e o CI dá o **mesmo veredito, contagem a contagem**,
  sobre o **mesmo commit**.

## Assumptions

- **O número do épico é 5.5.** ⚠️ **O pedido fala em *"próximo número de épico livre"*, e ele não
  existe: medido no documento 06 em 03/10/2026, os Épicos 0 a 13 estão todos com assunto**, e o 6 é o
  Detalhe Semanal de Aula. **5.5** insere esta fatia entre os cadastros (5) e o lançamento (6) **sem
  renumerar nada** — e é honesto quanto à ordem, porque ela consolida telas do Épico 5 e a casca do
  Épico 4. ✅ **Ratificado por Bernardo Villas Boas em 04/10/2026.**
- **Nenhuma dependência nova.** Medido antes de escrever: ícones (`lucide-react`) e dica ao apontar
  (`components/ui/tooltip.tsx`) **já estão no repositório**; a gaveta de tela estreita **já funciona**.
  Se o plano concluir que algum componente novo exige pacote **peer obrigatório**, isso para e é
  avisado.
- **A lateral evolui o que existe**, em vez de trazer o componente de barra lateral pronto do shadcn.
  Razão: o pronto traz convenção própria de cookie, atalho de teclado e contexto, e **a casca já tem
  um desenho medido** de folha de cliente pequena com o servidor mandando a lista. ✅ **Definitiva
  desde 04/10/2026** (Q3, decisão de Bernardo Villas Boas): sem pacote novo.
- **1 TA = 1 h ao ler o limite diário EAD.** A coluna é em horas e a conta é em TA; a equivalência é
  a já fixada na spec 006 (T011) e a que a v1.0 usava, segundo Bernardo. **Não é regra nova** — é a
  premissa herdada, escrita onde se pode conferir.
- **Sem migration.** Nada de estrutura nem de dado muda — confirmado pela resposta à Q1 em
  04/10/2026: o TA/dia já está no regime vigente do curso. Se o plano descobrir necessidade de
  migration, isso para e segue o rito completo: backup, dry-run só com ela e conferência só de
  leitura.
- **A CH prevista é a curricular e a executada é a CHD**, como a tela de Início já faz. Não são a
  mesma grandeza por acidente de nome: a CHD soma aula, extraclasse, avaliação e vista (`RN-EVT-03`),
  e o Estudo Individual fica **fora** por decisão normativa (`RN-EVT-01`).
- **As fórmulas da v1.0 são as que Bernardo transcreveu em 03/10/2026**, citando `Código.gs`
  (`getDashboardGeral`). ⚠️ **Esse arquivo NÃO está neste repositório** — varrido em `docs/` e
  `scripts/` nesta data, zero ocorrências de `getDashboardGeral`. Logo a fórmula entra como
  **testemunho datado do responsável**, não como medição reexecutável, e é assim que ela MUST ser
  citada no código (regra 9.2: o artefato é nomeado, e o que ele é fica claro).
- **A lista de turmas respeita o alcance do perfil**, pelo mesmo mecanismo que as outras listas —
  quem nega é o banco, e a tela só distingue *"não há"* de *"você não vê"*.
- **Dias úteis** são de segunda a sexta, descontados os feriados de impacto dia inteiro. Sábado,
  domingo e recesso não são tratados como exceção nova nesta fatia.

## Out of Scope

- **Lançamento, avaliação e atividade** — Épicos 6, 8 e 9. Esta fatia **lê** lançamento; não cria,
  não edita e não apaga nenhum.
- **Qualquer edição nova.** A ficha continua editando **o que já edita hoje**, e o bloco de
  disciplinas por turma se move **com** a edição que já tem.
- **Carga de dado** — a VIRADA-1 é outra tarefa, com pré-requisitos próprios.
- **Regra de negócio nova** e "melhoria" de `RN-` da v2.0: portar é preservar comportamento,
  inclusive o que parecer errado (regra 1). ⚠️ **O conserto do indicador de `/inicio` NÃO é regra
  nova** — é fazer o código dizer o que o `RF-INI-01` já dizia.
- **O motor preditivo de cronograma** (Épico 7). O saldo de capacidade é aritmética de hoje até o
  término, não previsão de alocação.
- **Separar preview de Production** no Supabase — segue a AMBIENTE-1, com a separação agendada para a
  virada.

## Dúvidas que travavam o plano — respondidas em 04/10/2026

As três estão em *Clarifications*, sessão de 04/10/2026, com a resposta, a autoria e a conferência
de catálogo que cada uma pediu. **Nenhuma trava o plano, e nenhuma é provisória**: o complemento de
04/10 fechou a Q3 como definitiva e ratificou o Épico 5.5 e a D-NAV-1.

## Divergências reportadas, não corrigidas

- **O documento 10 §2.8 escreve `/speckit.specify`, com ponto.** A versão 0.16.0 usa **hífen**. Já
  registrado como armadilha paga no `CLAUDE.md`; o documento continua divergente, porque emendá-lo é
  decisão à parte.
- **`vw_carga_horaria_turma` não expõe `data_termino` nem `modalidade`**, que são exatamente o que o
  saldo de capacidade precisa. Não é defeito — a view responde outra pergunta. A junção com `turmas`
  resolve, e **nenhuma view é alterada nesta fatia**.
- **O regime é do curso; a modalidade que escolhe a coluna é da turma.** `vw_cursos_regime_vigente` é
  por **curso**, e a `RN-MAT-04` manda seguir a modalidade da **turma**. As duas tabelas têm
  `modalidade` própria, e esta rodada **não mediu** se algo as amarra; se uma turma EAD puder viver
  num curso cujo regime não tem o limite EAD preenchido, ela cai em *"sem dado"* pelo FR-026.1 —
  degradação, não erro. Reportado; conciliar os dois cadastros é regra nova.
- **`limite_diario_ead_horas` é em horas; o saldo é em TA.** A equivalência 1 TA = 1 h é premissa
  herdada da spec 006, não regra desta. Se um dia o regime EAD ganhar duração de TA própria, esta
  conta muda — e é aqui que isso está escrito.
