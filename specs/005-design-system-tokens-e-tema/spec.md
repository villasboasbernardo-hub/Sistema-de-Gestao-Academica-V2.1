# Especificação: Épico 4, fatia (a) — Tokens, tema e configuração base

**Criado**: 09/09/2026 · **Épico**: 4 — Design System e shell de navegação · **Esforço do épico**: G
**Fontes**: [documento 23](../../docs/fase-2/23-Design-System-Tailwind-shadcn.md) ·
[BRIEF §5 e §6](../../docs/BRIEF-v2.1.md) · [documento 02](../../docs/fase-1/02-Requisitos-Funcionais.md) ·
[documento 03](../../docs/fase-1/03-Requisitos-Nao-Funcionais.md) ·
[documento 06, Épico 4](../../docs/fase-1/06-Backlog-de-Epicos-V2.1.md)

## Contexto

O Épico 4 entrega **uma linguagem visual única** e **um shell em que a URL é o estado**. Ele foi
subdividido em três fatias por decisão de Bernardo em 09/09/2026. **Esta especificação cobre apenas
a fatia (a)**; as outras duas estão registradas em *Fatias seguintes* e serão especificadas
separadamente.

Hoje o sistema tem cinco telas funcionais e **nenhum vocabulário visual**. `app/globals.css` tem 26
linhas e traz apenas o `@theme inline` que veio do gerador do Next. Não existe `components/ui/`.
Não existe `public/institucional/` nem `public/fontes/`. A dívida de estilo registrada no
`CLAUDE.md` está em **nove arquivos** sem token. Esta fatia paga **cinco**, e a lista não é a mesma:
ver o `SC-007`, que separa *cor divergente* de *ainda sem vocabulário*.

### Duas declarações que o documento 06 exige explicitamente

**1. O objeto global `UI` da v2.0 deixa de existir como objeto.** Ele vira **tokens CSS mais uma
biblioteca de componentes tipada**. O `RF-DS-01` — *"um único ponto central de onde todas as telas
obtêm cores, tipografia, espaçamento e estados"* — é **[PRESERVADO]**. O mecanismo muda, e melhora:
um token errado passa a ser **erro de build**, não uma cor divergente que ninguém notou.

**2. O `AppState` da v2.0 também deixa de existir como objeto.** O `RF-NAV-01` — *"um único ponto de
verdade para o estado de navegação"* — é **[PRESERVADO]**, e o ponto de verdade passa a ser **a
URL**. ⚠️ A realização do `RF-NAV-01` é da **fatia (c)**; a declaração fica aqui porque é o mesmo
movimento conceitual, e o documento 06 pede que os dois sejam ditos juntos.

## Clarifications

### Session 2026-09-09

- Q: Onde a pessoa troca de tema nesta fatia, se o cabeçalho só nasce na fatia (c)? → A: Numa **rota de vitrine própria**, que traz o alternador e a amostra de todos os tokens nos dois temas. O alternador definitivo entra no cabeçalho da fatia (c).
- Q: A verificação automática proíbe só valor de cor escrito à mão, ou também os utilitários da paleta padrão do Tailwind? → A: **Os dois.** Só token CIAARA vale. `app/page.tsx`, que ninguém tinha contado, entra na conta desta fatia.
- Q: Quais componentes base são copiados nesta fatia, se o documento 23 nomeia dezoito primitivos? → A: **Só o mínimo que a vitrine exercita** — botão, cartão, tabela e emblema —, com a reconciliação das variáveis de cor do shadcn com os tokens CIAARA **feita e documentada**. Os demais vêm com a fatia que os usar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A identidade visual muda num lugar só (Priority: P1)

Quem mantém o sistema precisa alterar uma cor, um tamanho de texto ou um espaçamento **editando um
único arquivo**, e ver a mudança propagar para toda tela que usa aquele papel — sem caçar valores
literais espalhados.

**Why this priority**: é o `RF-DS-01`, a razão de existir da fatia. Sem isto, as fatias (b) e (c)
nascem com a mesma dívida que o épico veio pagar, e cada tela nova a aumenta.

**Independent Test**: acrescentar uma cor semântica nova ao ponto único e observar, na rota de
vitrine, que ela passa a valer sem edição em nenhum outro arquivo.

**Acceptance Scenarios**:

1. **Dado** o vocabulário visual instalado, **quando** uma cor semântica nova é acrescentada ao
   ponto único, **então** ela fica disponível a toda tela sem nenhuma outra edição.
2. **Dado** um valor de cor escrito literalmente fora do ponto único, **quando** a verificação roda,
   **então** ela **reprova** e nomeia o arquivo e a linha.
3. **Dado** o vocabulário instalado, **quando** alguém procura por qualquer cor do sistema,
   **então** todas estão no mesmo arquivo, e nenhuma está em outro lugar.

---

### User Story 2 - Tema claro e noturno, escolhidos e lembrados (Priority: P1)

Quem trabalha em sala clara e quem trabalha à noite precisam escolher o tema, e **não perder a
escolha** ao recarregar nem ao abrir outra aba. E ninguém pode ver a página piscar no tema errado
antes de assentar no escolhido.

**Why this priority**: é o `RF-DS-03` mais o `RF-DS-03.1`, e o flash de tema errado é o defeito que
a v1.0 tinha e que este épico existe para não reintroduzir.

**Independent Test**: na rota de vitrine, alternar o tema, recarregar, abrir outra aba e conferir
que a escolha sobreviveu e que nenhum quadro intermediário mostrou o tema anterior.

⚠️ **A rota de vitrine existe porque sem ela esta história não é testável.** Até a fatia (c) não há
cabeçalho nem navegação, e portanto não haveria onde clicar para trocar de tema — o requisito
sairia da fatia sem que ninguém, nem pessoa nem teste, pudesse exercitá-lo.

**Acceptance Scenarios**:

1. **Dado** o tema noturno escolhido, **quando** a página é recarregada, **então** ela abre no
   noturno, **sem** exibir o claro em nenhum momento.
2. **Dado** nenhuma escolha manual feita, **quando** a pessoa abre o sistema, **então** ele
   acompanha a preferência do sistema operacional.
3. **Dado** uma escolha manual feita, **quando** a preferência do sistema operacional muda,
   **então** a escolha manual prevalece.
4. **Dado** o tema alternado, **quando** a troca acontece, **então** não há transição arrastada de
   cor pela página inteira.

---

### User Story 3 - Dá para ler nos dois temas (Priority: P2)

Qualquer pessoa, inclusive com baixa visão, precisa distinguir texto de fundo e **identificar o
significado de um status pela cor** em qualquer um dos dois temas.

**Why this priority**: é `RNF-USA-01` a `RNF-USA-05` e o critério 7 do documento 06. Um par de cores
que reprova em contraste só aparece quando alguém tenta ler, e aí já está em produção.

**Independent Test**: medir a razão de contraste de cada par texto-sobre-fundo do vocabulário, nos
dois temas, contra o limite AA.

**Acceptance Scenarios**:

1. **Dado** o vocabulário completo, **quando** a auditoria de contraste roda, **então** todo par de
   texto sobre fundo atinge no mínimo **4,5:1**, e todo limite de componente atinge **3:1**.
2. **Dado** um par que reprova, **quando** a auditoria roda, **então** ela **falha** nomeando o par
   e a razão medida — não apenas "reprovou".
3. **Dado** o modo noturno, **quando** um status é exibido, **então** o fundo é escuro e pouco
   saturado e a tinta é clara. ⚠️ **Nunca** se reaproveita o pastel do tema claro: é exatamente o
   defeito que o `RF-DS-03` registra sobre a v1.0.

---

### User Story 4 - A tipografia institucional é servida pelo próprio sistema (Priority: P3)

O sistema precisa usar a tipografia institucional **sem depender de requisição a terceiro**, para
que ela esteja correta também onde não há rede no momento do uso.

**Why this priority**: é a metade do `RF-INI-05` que cabe nesta fatia. Vale menos que as três
primeiras porque não bloqueia tela nenhuma, mas a dependência externa quebraria a impressão, que
não pode depender de rede na hora em que alguém manda imprimir.

⚠️ **A marca institucional saiu desta fatia** por decisão de Bernardo em 09/09/2026 — vai para a
fatia (c), que é quando o cabeçalho existe e a marca de fato aparece. A fatia (a) fica **puramente
vocabulário e tema**.

**Independent Test**: carregar o sistema com o acesso a domínios externos bloqueado e conferir que
a tipografia continua correta.

**Acceptance Scenarios**:

1. **Dado** o sistema carregado, **quando** a página aparece, **então** a tipografia institucional
   está em uso, **servida pelo próprio sistema** e não por terceiro.
2. **Dado** o sistema carregado sem rede externa, **quando** a página aparece, **então** a
   tipografia continua correta — inclusive nas rotas de impressão da fatia futura.
3. **Dado** os quatro pesos declarados, **quando** qualquer um é solicitado, **então** ele existe no
   repositório e carrega sem requisição externa.

---

### Edge Cases

- **Primeira visita, sem escolha registrada**: o sistema acompanha a preferência do sistema
  operacional. Não há tema "padrão" imposto por decreto.
- **Armazenamento local indisponível** (janela anônima, política do navegador): a escolha não
  persiste entre sessões, e isso é aceitável. O que **não** é aceitável é a página quebrar ou
  piscar por causa disso.
- **Impressão**: o papel é branco em qualquer tema. A escolha de tema **não pode** vazar para a
  impressão. ⚠️ As rotas de impressão são dos épicos 10 e 11, mas o vocabulário nasce aqui, e é aqui
  que essa separação precisa estar prevista.
- **Alto contraste / preferência por menos movimento** declarada no sistema operacional: a troca de
  tema não pode introduzir animação que a pessoa pediu para não ver.
- **Cor como único portador de significado**: um status nunca é comunicado **só** pela cor. Há
  rótulo textual junto. Quem não distingue as cores continua lendo o sistema.
- **Valor literal de cor herdado**: os nove arquivos que hoje têm cor fora do vocabulário. Ver
  *Escopo* e a pergunta em aberto **Q4a.c**.

## Requirements *(mandatory)*

### Functional Requirements

#### Vocabulário visual

- **FR-001**: MUST existir **um único arquivo** que declare toda cor, tipografia, espaçamento, raio
  e sombra do sistema. Fora dele MUST **não** existir:
  1. **valor de cor escrito à mão** — `#003366`, `rgb(…)`, `hsl(…)`, nome de cor CSS; **nem**
  2. **utilitário da paleta padrão** do motor de estilo — `text-gray-500`, `bg-slate-100` e afins.
  ⚠️ **Os dois, e o segundo é o que costuma escapar.** `text-gray-500` é uma cor que **não vem do
  ponto único**, e o `RF-DS-01` diz que todas as telas obtêm cores de um único lugar. Permitir a
  paleta padrão mantém aberta exatamente a porta pela qual a divergência entra.
- **FR-002**: O vocabulário MUST separar **o que não muda com o tema** — a rampa institucional e as
  escalas — **do que é papel** — fundo, superfície, texto, borda, tom de status. ⚠️ Papel declarado
  como valor estático congela no tema claro, e o modo noturno sai com campos claros demais. É o
  defeito que o `RF-DS-03` registra sobre a v1.0, e ele é **erro de sintaxe**, não de gosto.
- **FR-003**: Toda cor de status MUST ser nomeada **pelo vocabulário do domínio**, não pelo nome da
  cor nem por rótulo genérico. `executado`, `atrasado`, `conflito`, `conformidade`, `nao-letivo`,
  `planejado`, `adiantado`, `reserva`, `inativo`. ⚠️ Quem lê `executado` sabe o que significa; quem
  lia `success` precisava saber o que "success" queria dizer naquele módulo.
- **FR-004**: A regra do FR-001 MUST ser **imposta por verificação automática bloqueante** ao fim
  desta fatia — não em modo de aviso, não em revisão de PR. ⚠️ Regra de estilo que só existe em
  documento é a mesma classe de defeito do mínimo de senha que vivia só no navegador (`FR-006` da
  spec 004). ⚠️ **Ela pode ser bloqueante já, e isso foi medido**: depois de pagos os cinco arquivos
  do `SC-007`, não sobra nenhuma violação no repositório.
- **FR-005**: A escala tipográfica MUST partir de um corpo **menor** que o de aplicação web típica.
  É sistema de gestão com tabelas grandes: **densidade vence estética**.

#### Tema

- **FR-006**: MUST existir tema **claro** e tema **noturno**, alternáveis pela pessoa.
- **FR-007**: A escolha MUST persistir entre recarregamentos e entre abas do mesmo navegador.
- **FR-008**: Na ausência de escolha manual, o sistema MUST acompanhar a preferência do sistema
  operacional. Havendo escolha manual, ela MUST prevalecer sobre o sistema operacional.
- **FR-009**: O carregamento MUST **não** exibir o tema errado em nenhum quadro intermediário.
  ⚠️ Este é o requisito mais fácil de declarar cumprido sem estar: o flash dura milissegundos e não
  aparece em captura estática. A verificação precisa medir o estado **antes** da hidratação.
- **FR-010**: A troca de tema MUST **não** produzir transição de cor arrastada pela página.

#### Contraste e legibilidade

- **FR-011**: Todo par de **texto sobre fundo** do vocabulário MUST atingir no mínimo **4,5:1** nos
  **dois** temas. Todo **limite de componente** MUST atingir no mínimo **3:1**.
- **FR-012**: A conformidade do FR-011 MUST ser **medida por verificação automática** sobre os pares
  declarados, e a falha MUST nomear o par e a razão observada.
- **FR-013**: No modo noturno, o fundo de status MUST ser escuro e pouco saturado, e a tinta MUST
  ser a cor clara. O pastel do tema claro MUST **não** ser reaproveitado.
- **FR-014**: Nenhum significado MUST ser comunicado **apenas** por cor.

#### Identidade institucional

- **FR-015**: A tipografia institucional MUST ser **servida pelo próprio sistema**, sem depender de
  requisição a terceiro, em **quatro pesos** — regular, médio, seminegrito e negrito.
  ⚠️ A dependência externa quebraria a impressão, que não pode depender de rede no momento em que
  alguém manda imprimir. ⚠️ E ela já quebrou uma vez: na v2.0 a fonte vinha por CDN.
- **FR-016**: ~~A marca institucional do CIAARA~~ — **movido para a fatia (c)** por decisão de
  Bernardo em 09/09/2026. O número fica reservado e vazio de propósito, para que a renumeração não
  desalinhe as referências já escritas.

#### Vitrine do vocabulário

- **FR-020**: MUST existir uma **rota de vitrine** que exiba o vocabulário inteiro — toda cor de
  papel, toda cor de status, a escala tipográfica, os espaçamentos, os raios e as sombras — e que
  traga o **alternador de tema**.
  ⚠️ **Ela não é enfeite: é o único lugar onde esta fatia pode ser conferida.** Sem cabeçalho e sem
  navegação, que só nascem na fatia (c), não haveria onde trocar de tema nem onde ver um token
  aplicado. É a vitrine que torna as histórias 1, 2 e 3 verificáveis, por pessoa e por teste.
- **FR-021**: A vitrine MUST exibir, ao lado de cada par de cor, a **razão de contraste medida**.
  ⚠️ Um número visível ao lado da cor é o que impede a auditoria automática de virar carimbo: quem
  olha a tela vê a mesma medida que o teste afere.
- **FR-022**: O **alternador de tema** da vitrine é **provisório desta fatia**. Ele MUST ser
  substituído pelo alternador do cabeçalho na fatia (c). A vitrine em si **permanece**, porque
  continua sendo onde se confere o vocabulário quando ele mudar.

#### Base de componentes

- **FR-017**: A biblioteca de componentes base MUST ser inicializada e seus componentes MUST ser
  **copiados para dentro do repositório e versionados**, não consumidos como dependência opaca.
  Nesta fatia MUST ser copiado **apenas o mínimo que a vitrine exercita** — botão, cartão, tabela e
  emblema. Os demais primitivos que o documento 23 §3.1 nomeia entram **com a fatia que os usar**.
  ⚠️ **Copiar os dezoito de uma vez multiplicaria por dezoito um problema ainda não resolvido uma
  vez** — ver o FR-018 —, e código copiado que ninguém usa também não é revisado por ninguém.
- **FR-018**: A reconciliação entre as **variáveis de cor próprias** dos componentes base e os
  **tokens CIAARA** MUST ser feita nesta fatia e MUST ficar **escrita**, com o de-para de cada
  variável.
  ⚠️ **É o trabalho real escondido atrás de "copiar componente".** O shadcn traz o próprio
  vocabulário de papéis. Se ele conviver com o do CIAARA sem casamento explícito, passam a existir
  **dois** pontos únicos de verdade — que é a negação do `RF-DS-01`, com a agravante de parecer
  cumprido.
- **FR-019**: Nenhuma biblioteca de componentes **além** da já decidida MUST ser instalada. É
  proibição do BRIEF §1, sem discussão.

### Key Entities

Esta fatia não introduz entidade de dado. O vocabulário visual é configuração, não domínio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma cor semântica nova é acrescentada em **um** lugar e passa a valer em toda tela que
  a declara, com **zero** edições em qualquer outro arquivo.
- **SC-002**: A contagem de **violações** do FR-001 no repositório é **zero** — somando cor escrita
  à mão e utilitário da paleta padrão —, medida por verificação bloqueante.
- **SC-003**: A escolha de tema sobrevive a **100%** dos recarregamentos e das aberturas de nova
  aba, na mesma sessão de navegador.
- **SC-004**: **Nenhum** quadro intermediário exibe o tema não escolhido durante o carregamento,
  medido antes da hidratação.
- **SC-005**: **100%** dos pares de texto sobre fundo do vocabulário atingem 4,5:1, e **100%** dos
  limites de componente atingem 3:1, **nos dois temas**, com o valor de cada par registrado.
- **SC-006**: A tipografia institucional carrega **sem nenhuma requisição a domínio externo**,
  verificável com a rede de terceiros bloqueada.
- **SC-007**: **Cinco arquivos** são pagos nesta fatia, e a lista é nominal porque contagem sem
  nome não se confere:

  | Arquivo | O que tem hoje |
  |---|---|
  | `app/error.tsx` | cor literal em atributo de estilo |
  | `app/loading.tsx` | cor literal em atributo de estilo |
  | `app/not-found.tsx` | cor literal em atributo de estilo |
  | `components/faixa-de-ambiente.tsx` | cor literal em atributo de estilo |
  | `app/page.tsx` | **10 utilitários da paleta padrão** — não estava em lista nenhuma até 09/09/2026 |

  ⚠️ **O `CLAUDE.md` fala em nove arquivos, e o número mistura duas coisas diferentes.** São quatro
  com cor literal mais cinco telas do Épico 3. As cinco telas **não violam o FR-001**: medido em
  09/09/2026, elas não usam cor nenhuma — nasceram sóbrias, com utilitário de forma e tamanho, sem
  utilitário de cor. Elas ficam para a fatia (c) por não usarem **ainda** o vocabulário, o que é
  outra coisa que não ter cor divergente. **Ao fim desta fatia a verificação passa com zero
  violações mesmo com as cinco telas intactas.**

- **SC-008**: `pnpm verificar` e o CI dão **veredito idêntico** sobre o mesmo commit.
- **SC-009**: A vitrine exibe **100%** dos tokens do vocabulário — nenhum token existe sem aparecer
  ali. É o que impede um token de nascer morto, declarado e nunca visto por ninguém.
- **SC-010**: **Zero** variáveis de cor dos componentes base ficam sem par declarado com um token
  CIAARA. Duas fontes de verdade para a mesma cor é a negação do objetivo, com a agravante de
  parecer cumprido.

## Assumptions

1. **A paleta não é inventada aqui.** O documento 23 §1.3 já traz o vocabulário completo, com os dois
   temas, as razões de contraste anotadas por par e a âncora institucional `#003366` marcada como
   *"não alterar sem decisão formal"*. Esta fatia **transcreve e verifica**, não redesenha. É o que
   fecha a armadilha da deriva visual: o padrão da v2.0 já foi capturado, no documento 23 §1.2, que
   mapeia cada valor da v2.0 ao seu destino.
2. **O `RF-DS-03` manda reformular, não preservar, o tema claro.** O documento 23 registra que o
   claro pastel da v1.0 tinha legibilidade ruim. Divergir da v2.0 **neste ponto** é o requisito, não
   deriva — e é a única divergência autorizada.
3. **`"use client"` só em folha.** O alternador de tema é interativo e portanto é folha. Nem
   `page.tsx` nem `layout.tsx` recebem o marcador. O provedor de tema é a exceção conhecida e fica
   isolado num componente próprio.
4. **A auditoria de contraste é automática**, não conferência humana. O projeto já recusou uma vez a
   conferência que registra sem medir (`CHK008`, spec 004).
5. **A verificação do FR-001 é lint**, não revisão de PR. O documento 23 §9.3 já a prevê.
6. **Estado de UI efêmero não entra nesta fatia.** Não há formulário longo nem seleção em massa
   ainda. A distinção entre estado efêmero e contexto de tela é da fatia (c).
7. **Nenhuma tela de domínio é criada ou alterada.** As cinco telas do Épico 3 permanecem como
   estão, salvo a decisão da Q4a.c.

## Dependências

| Depende de | Estado |
|---|---|
| Épico 0 — Tailwind v4 funcionando, `pnpm`, CI | ✅ concluído |
| Documento 23 §1 e §2 — o vocabulário e o mecanismo de tema | ✅ escrito e completo |
| Arquivos da tipografia institucional (Rawline, 4 pesos) | ⬜ **entram nesta fatia** — baixar e versionar (Q4a.a) |
| Marca institucional do CIAARA | ➡️ **movida para a fatia (c)** (Q4a.b) |
| Épicos 1, 2 e 3 | ⟂ independentes. Esta fatia não toca banco nem dado |

## Fatias seguintes — registradas, não especificadas aqui

| Fatia | Conteúdo | Estado |
|---|---|---|
| **(b) Componentes CIAARA** | `CardKpi`, `BadgeStatus`, `GradeAlocacao`, `FiltroAvancado`, `AlertaConformidade`, `TabelaDensa`, `SeletorTurma`, `NomeInstrutor`; gráficos com Recharts | ⬜ a especificar |
| **(c) Shell e tela Início** | Layout raiz, navegação lateral, cabeçalho, breadcrumb, `loading.tsx` e `error.tsx` por segmento, estado de tela na URL, e `/inicio`. **Mais a marca institucional** (Q4a.b) e as **cinco telas do Épico 3** sem token (Q4a.c) | ⬜ a especificar |

⚠️ **A fatia (c) resolve um problema já medido em 09/09/2026**: depois de entrar no sistema, a
pessoa cai numa página **sem um único link**. Não há como chegar a nenhuma tela sem digitar o
endereço à mão. Fica registrado aqui para não ser redescoberto lá.

## Fora de escopo

- **Telas de domínio** — épicos 5 a 13.
- **Rotas de impressão** — épicos 10 e 11. O vocabulário nasce aqui **prevendo** que o papel é
  branco em qualquer tema; as rotas, não.
- **Componentes CIAARA e shell** — fatias (b) e (c) deste mesmo épico.
- **A marca institucional** — fatia (c), por decisão de 09/09/2026. A **tipografia** fica.
- **As cinco telas do Épico 3 sem token** — fatia (c), por decisão de 09/09/2026.
- **Gráficos** — fatia (b).
- **Ícones de interface** — o documento 23 §11.2 registra a pendência. Não se decide aqui.
- **Estado de navegação na URL** — fatia (c). A **declaração** sobre o `AppState` fica nesta spec
  por exigência do documento 06; a **realização** não.

## Decisões de Bernardo — 09/09/2026

- **Q4a.a · Tipografia institucional — ✅ RESOLVIDA, opção A.** É a **Rawline**, do padrão gov.br,
  de licença aberta. Os arquivos são **baixados e versionados** no repositório, em quatro pesos, e
  a fonte é servida pelo próprio sistema. É a mesma fonte da v2.0; muda a entrega, que deixa de ser
  por CDN.

  **Procedência, medida em 09/09/2026 e registrada aqui porque licença de fonte não se presume:**

  | Item | Valor |
  |---|---|
  | Origem | pacote `rawline-webfont@5.2.0`, subconjunto **latino**, pesos 400/500/600/700 |
  | Licença | **OFL-1.1** — permite auto-hospedar e redistribuir |
  | Autoria | Rawline, de Henrique Ibaldo (2016), derivada da Raleway |
  | Destino | `public/fontes/rawline-{400,500,600,700}.woff2`, ~24 a 25 KB cada |
  | Conferido | assinatura `wOF2` nos quatro arquivos, e o texto da licença versionado ao lado |

  ⚠️ **A origem oficial do gov.br não serviu.** Tanto o caminho de fonte do CDN do Serpro quanto o
  pacote `@govbr-ds/core` foram consultados e **nenhum dos dois publica os arquivos da Rawline**:
  o primeiro devolve 404, o segundo não contém arquivo algum com esse nome. O empacotamento usado
  é de terceiro; **a licença OFL-1.1 é da fonte, não do empacotador**, e é ela que autoriza a
  redistribuição. Fica registrado para que ninguém reabra a pergunta achando que houve descuido.
- **Q4a.b · Marca institucional — ✅ RESOLVIDA, opção C: adiada para a fatia (c).** A fatia (a) fica
  **puramente vocabulário e tema**. A marca entra quando o cabeçalho for construído, que é onde ela
  de fato aparece. O `FR-016` fica reservado e vazio.
- **Q4a.c · Dívida de estilo — ✅ RESOLVIDA, opção B.** Os **quatro** arquivos que cravam cor
  literal em atributo de estilo são pagos **agora**. As **cinco** telas do Épico 3 ficam para a
  fatia (c), que as retrabalha de qualquer maneira e não deve inchar esta.

## Regras que pareceram estranhas — listadas, não corrigidas

Conforme o pedido, e conforme a regra 1 do `CLAUDE.md`.

1. **O critério de aceite 3 do documento 06 não é verificável nesta fatia.** Ele cita
   `/cursos/[curso]?turma=T2&semana=34`, e nem a rota de cursos nem o estado de tela na URL existem
   antes da fatia (c). O mesmo vale para o critério 4, sobre voltar e avançar do navegador. **Não
   são critérios da fatia (a)** — ficam com a (c). Registrado para que ninguém os cobre aqui.
2. **O critério de aceite 6 também não é desta fatia.** Ele exige que toda tabela densa seja
   navegável por teclado, e a `TabelaDensa` é da fatia (b).
3. **O critério de aceite 8 é o mais difícil de provar e o documento não diz como.** *"Nenhuma tela
   existente na v2.0 perde informação, cor semântica ou estado visual"* — a v2.0 tem dezenas de
   telas e a v2.1 ainda tem cinco. O critério só pode ser medido **tela a tela, à medida que cada
   uma for reconstruída** nos épicos 5 a 13. Nesta fatia ele é vacuamente verdadeiro, e declarar que
   "passou" seria cobertura fingida.
4. **O `RF-DS-03.1` mudou de natureza sem mudar de número.** O documento 23 §2.1 anota que ele
   *"deixa de ser 'avaliar a viabilidade' e vira requisito confirmado"*. Um requisito que troca de
   verbo deveria trocar de identificador, ou trazer a data da mudança no próprio texto do documento
   02. Não corrigi.
