# Pesquisa — Fase 0 da spec 012

> **Como esta pesquisa foi feita, e o que ela é.** Em 04/10/2026, quatro leitores em paralelo varreram
> o repositório **só por leitura** — casca, turmas, andamento e guardas —, cada um obrigado a nomear o
> artefato (arquivo:linha) de toda afirmação e a ler **código sem comentário** antes de dizer que algo
> é usado (regras 9.1.1 e 9.2). Nada foi medido no banco remoto. O que está abaixo é o que **decide o
> desenho**; os fatos brutos que não mudam decisão ficaram de fora de propósito.
>
> ✅ **AS DOZE DÚVIDAS FORAM RESPONDIDAS EM 04/10/2026 — todas na recomendação** *(Bernardo Villas
> Boas)*. As marcas *"padrão provisório"* que sobreviveram no texto abaixo descrevem **como a decisão
> nasceu**, não o estado dela: **D1 a D12 são definitivas**, como as D-NAV-1 a D-NAV-4.
>
> ⚠️ **E DUAS DELAS DEIXARAM DE SER TESTEMUNHO E PASSARAM A TER ORIGEM NOMEADA.** A **D7** (dias úteis
> inclusivos nas duas pontas) e a **D9** (feriado por data distinta, só dia útil) foram **conferidas
> por Bernardo no `Código.gs` da v1.0, na função `diasUteis_`**: o laço é `while (d <= ate)` — logo
> **inclusivo nas duas pontas** —, conta **só segunda a sexta**, e desconta feriado **por data
> distinta** com impacto dia inteiro. **É a fonte que o cabeçalho de `lib/dominio/andamento-da-turma.ts`
> cita**, e a diferença importa: antes da conferência eu tinha derivado as duas de *"lê-se assim"*, e
> a origem com `9` dias úteis contra `10` é um erro que nenhum teste pega — ele vira saldo errado, não
> exceção. ⚠️ **O arquivo continua fora deste repositório** (zero ocorrências de `getDashboardGeral`
> em `docs/` e `scripts/`): o que mudou é que a citação agora nomeia **a função**, e quem a conferiu,
> em que data.

## 1. A lateral (PR 1)

### 1.1 Onde o estado "fixada" nasce — no servidor, pelo cookie, e NÃO como o tema

**Decisão.** `app/(app)/layout.tsx` lê o cookie com `cookies()` de `next/headers` e passa `lateralFixada`
por propriedade: `CascaDoApp` → `NavegacaoLateral` → `PainelRetratil`. O HTML já chega ao navegador
no estado certo, e por isso **não há flash** — o `FR-005` fica provado por construção, e verificado
pelo mesmo instrumento de `tests/e2e/tema.spec.ts:137-165` (`addInitScript` + `MutationObserver` na
**primeira** escrita do atributo de estado).

**Razão.** Medido: o layout do grupo autenticado **já** é `async` e **já** lê a requisição
(`headers()` para o cabeçalho `x-ciaara-caminho`, `app/(app)/layout.tsx:36-42`). Ler um cookie ali é
o mesmo gesto. ⚠️ **O tema NÃO é o padrão a espelhar, embora pareça**: `next-themes` guarda em
`localStorage` e evita o flash com um **script inline** que roda antes da pintura
(`node_modules/next-themes/dist/index.mjs`) — o servidor **não sabe** o tema. Para a lateral, o
servidor **tem de saber**, porque a largura muda o layout do conteúdo inteiro e um salto depois da
hidratação é exatamente o que o `FR-005` proíbe.

**Alternativas rejeitadas.** (a) `localStorage` + script inline, como o tema — o servidor
renderizaria sempre recolhida e o script "consertaria"; é flash por desenho. (b) `useEffect` no
cliente — flash garantido.

### 1.2 Como o cookie é ESCRITO — `document.cookie` na folha de cliente *(padrão provisório, D1)*

**Decisão.** A folha de cliente escreve `document.cookie` ao fixar/recolher. Nome `ciaara-lateral`,
valor `fixada` | `recolhida`, `path=/`, `SameSite=Lax`, `Max-Age` de um ano. Sem `Secure` no local
(http), com `Secure` quando `location.protocol === "https:"`.

**Razão.** Medido: **não existe precedente** de escrita de cookie fora do cliente Supabase
(`lib/supabase/server.ts:22-43` é o único leitor/escritor; zero `document.cookie` em `app/`, `lib/`,
`components/`, `tests/`). Entre os dois caminhos sem precedente, o de `document.cookie` é o que **não
cria endpoint HTTP** para uma preferência de interface: uma Server Action para "lembrar que o menu
está aberto" seria um endpoint alcançável sem tela, do tipo que a pendência `GUARDA-ACAO` existe para
vigiar. E a casca **não pode importar `@/lib/acoes/`** (`tests/unidade/fronteira-casca.test.ts:57-67`)
— a ação teria de descer por propriedade do layout, como `aoSair`, só para gravar um cookie.
⚠️ O proxy **não toca** cookie de outro nome (`lib/supabase/middleware.ts:94-113`): o valor gravado
no cliente chega intacto ao `cookies()` do layout na navegação seguinte.

**Alternativa.** Server Action descendo por propriedade do layout — correta, mais pesada, e cria
endpoint. Se Bernardo preferir, muda uma folha e o layout; a leitura não muda.

### 1.3 Onde mora a interação — em `painel-retratil.tsx`, e `navegacao-lateral.tsx` segue servidor

**Decisão (definitiva, Q3).** Evoluir `PainelRetratil` (folha de cliente **já declarada**) e manter
`NavegacaoLateral` como Server Component. O `PainelRetratil` passa a receber `fixadaInicial` e as
entradas já renderizadas; a lista de entradas continua vindo do servidor por `children`.

**Razão.** `tests/unidade/fronteira-casca.test.ts:29-34, 101-109` tem **lista fechada** de quatro
folhas de cliente na casca, com igualdade exata, e proíbe nominalmente o marcador em
`navegacao-lateral.tsx`. A lista mesma de 17 em `fronteira-componentes.test.ts:256-294`. **Uma folha
nova exigiria entrada nas duas listas**; evoluir a existente exige só atualizar a frase de
justificativa (`"abrir e fechar o menu em tela estreita — estado efêmero de interface"`, que deixa de
ser verdade inteira). ⚠️ **O custo que isto evita está escrito no próprio arquivo**: um marcador de
cliente na casca manda **todas** as telas para o pacote do navegador.

### 1.4 Expandir ao apontar — por CSS, não por JavaScript *(padrão provisório, D11)*

**Decisão.** A expansão ao passar o mouse é **CSS puro**: o `<nav>` leva `lg:w-14` recolhido,
`lg:hover:w-56` e `lg:focus-within:w-56` para expandir, e `data-fixada="true"` força `lg:w-56`. Os
rótulos ficam no DOM sempre (para o nome acessível) e aparecem com `group-hover:`/
`group-focus-within:`/`group-data-[fixada=true]:`. O único JavaScript é o controle de fixar: alterna
`data-fixada`, grava o cookie, e nada mais.

**Razão.** (a) Zero estado de hover em JS = zero disputa entre `mouseenter`/`mouseleave` e o Playwright,
que faz **hover antes de clicar** em todo `click()` — seis arquivos de e2e clicam links do menu
(`cursos-cadastro.spec.ts:78-82`, `disciplinas.spec.ts:79-83`, `instrutores.spec.ts:69-72`,
`salas.spec.ts:69-72`, `turmas.spec.ts:129-133`, `shell.spec.ts`). (b) `focus-within` dá, de graça, o
`FR-008`: quem navega por teclado vê os rótulos ao entrar na lateral. (c) Abaixo de `lg` nenhuma dessas
classes se aplica — o `FR-006` (gaveta sem hover) sai da **ausência** de variante, não de um `if`.
⚠️ **Risco medido**: o alvo do clique muda de posição enquanto a largura anima. O Playwright espera a
caixa ficar **estável por dois quadros** antes de clicar; a transição é curta (`duration-150`) e
`motion-reduce:transition-none`. Fica registrado como risco, com a classe de instabilidade já
conhecida (`e2e-instrutores-fragil-sob-carga`).

### 1.5 Ícones — campo novo em `EntradaDeMenu`, como identificador, resolvido na folha

**Decisão.** `EntradaDeMenu` ganha `icone: NomeDeIcone` (união de strings). O mapa string → componente
`lucide-react` vive em `components/casca/icones-do-menu.tsx`, importado pela `NavegacaoLateral`
(servidor — ícones lucide renderizam no servidor sem marcador).

**Razão.** Medido: `lib/navegacao/menu.ts` é importado por testes de unidade e pelo e2e
`shell.spec.ts:11` **sem DOM** — pôr um componente React nele quebraria essas importações. Medido:
`lucide-react` 1.43.0 já está instalado e o padrão de import é nomeado com sufixo `Icon`
(`painel-retratil.tsx:19`, `seletor-instrutor.tsx:32`); `fronteira-componentes` proíbe ícone à mão
(`<path`, `d="M`) — o mapa usa só lucide. **Os oito ícones são escolha de desenho** e estão no lote
(D2) com uma proposta.

### 1.6 Dica ao apontar — redundante com a expansão; fica só no controle de fixar *(padrão provisório, D3)*

**Decisão.** Nenhum `Tooltip` por entrada: apontar para a lateral **já expande** e mostra o rótulo.
`Tooltip` só no controle de fixar, cujo rótulo é um ícone. O nome acessível de toda entrada é o rótulo
**sempre**, por texto no DOM (visível expandido, `sr-only` recolhido).

**Razão.** A spec pede *"só ícones + dica ao apontar"* **e** *"expande ao passar o mouse"* — as duas
não convivem: no instante em que a dica apareceria, a lateral já abriu e o rótulo está ao lado do
ícone. Medido: `components/ui/tooltip.tsx` embute um `TooltipProvider` por raiz (linha 28-34) — oito
dicas seriam oito provedores, e o `TooltipContent` vai por `Portal`, fora do `<nav>`. É a Q3 do
lote; a alternativa (dica em cada entrada, com atraso, aparecendo só se a expansão não acontecer)
custa estado e não ganha informação.

### 1.7 O que o e2e exige da lateral recolhida, medido

| Exigência | Onde | Consequência no desenho |
|---|---|---|
| `<nav aria-label="Navegação principal">` **visível** logo após `entrar()` | `tests/e2e/conta-de-teste.ts:247-250` | Recolhida ≠ `display:none`. Largura `w-14`, nunca `hidden` acima de `lg` |
| **Um** `<li>` por entrada, `toHaveCount(MENU.length)` | `shell.spec.ts:29` | Uma lista só; sem duplicar para os dois estados |
| **Um** `[aria-current="page"]` com `data-entrada` | `shell.spec.ts:48-50` | `aria-current` no `<a>`, ícone e rótulo **dentro** dele |
| `getByRole("link", { name: "Cursos", exact: true })` | seis arquivos | Nome acessível = rótulo exato; o `sr-only` entra no nome, o ícone com `aria-hidden` não |
| Primeira parada de `Tab` é o atalho *"Pular para o conteúdo"* | `acessibilidade.spec.ts:185-194` | O controle de fixar fica **dentro** do `<nav>`, depois do atalho na ordem do DOM |
| Exatamente um `role=navigation` com esse nome | `acessibilidade.spec.ts:226` | A gaveta de tela estreita e a lateral são **o mesmo** `<nav>` |
| Nenhum teste assere largura | grep `w-56\|lg:w` em `tests/`: zero | Mudar a largura não quebra asserção nenhuma |
| Não há projeto de celular | `playwright.config.ts:107` | A gaveta se prova com `page.setViewportSize({ width: 800, height: 900 })`, como `teclado.spec.ts:230` |

### 1.8 D-NAV-1 — a guarda de ausência que o PR 2 derruba, e o registro que o PR 1 atualiza

Medido: **nenhum teste assere a ordem literal do menu** — `shell.spec.ts` deriva tudo de `MENU`. O que
cita a MENU-1 é o bloco `FR-031.7` de `tests/unidade/contrato-de-parametros.test.ts:407-438`, que
exige a **ausência** de `/turmas` (três asserções) — é do PR 2 (§2.1). No PR 1, a ordem nova entra
em `menu.ts` com o cabeçalho reescrito (a frase *"mudar qualquer linha exige nova validação"* passa a
apontar para a D-NAV-1) e o registro datado em
`specs/008-shell-e-estado-na-url/contracts/casca.md` ganha a sessão de 04/10/2026 **ao lado** da de
11/09, não no lugar dela.

## 2. O módulo de Turmas (PR 2)

### 2.1 A guarda de ausência vira guarda de presença — revertida, não excepcionada

**Decisão.** O `describe` `FR-031.7` de `contrato-de-parametros.test.ts:407-438` é **reescrito** com o
sinal invertido: `/turmas` **existe** no contrato com exatamente `curso`, `ano`, `situacao`, `busca`;
`menu.ts` **tem** `rotulo: "Turmas"` com `disponivel: true`; `app/(app)/turmas/page.tsx` **existe**. A
mensagem cita a **D-NAV-1 (04/10/2026) substituindo a MENU-1 (11/09/2026)**.

**Razão.** Apagar as três asserções deixaria o repositório sem dizer *por que* a lista existe; mantê-las
é impossível. Inverter preserva o registro e passa a proteger o estado novo — é o mesmo gesto que
`toda-tela-tem-caminho` faz com `FORA_DO_MENU`. ⚠️ Os cabeçalhos de `lib/navegacao/contrato.ts:473-479`
e de `app/(app)/turmas/[turma]/page.tsx:8` afirmam *"a turma se alcança pelo curso"* e *"o caminho de
volta é o curso"* — ficam **vencidos** e são emendados com data (D-NAV-3), para não repetir o modo de
falha da anotação que envelhece.

### 2.2 O contrato de `/turmas`

**Decisão.** Entrada nova em `CONTRATO`, `origem: "RF-CURSO-01"` (a mesma de `/turmas/[turma]`, que o
teste já valida contra o documento 02), com quatro parâmetros, todos `substitui` e
`avisaServidor: true`: `curso` (texto, `""`), `ano` (texto, `""`), `situacao` (escolha, `""`, opções
`SITUACOES_DE_TURMA = Constants.public.Enums.status_turma`) e `busca` (texto, `""`,
`limiteDeFrequenciaMs`). **Padrão de `situacao` é "todas"** *(padrão provisório, D4)*.

**Razão.** Medido: não existe constante de contrato para `status_turma` — `SITUACOES_DE_CADASTRO` é
`status_registro` (`ativo|inativo`) e **não serve**. Os nomes de tela já existem em **um** lugar,
`ROTULO_DO_STATUS_DE_TURMA` (`lib/dominio/seletor-de-turma.ts:41`). `ano` é texto como `curso` é
texto em `/instrutores` (*"o domínio é o dado"*); `inteiro` exigiria mínimo e máximo inventados.
⚠️ `/cursos` e `/instrutores` abrem com `situacao = ativo`; uma lista de **turmas** é catálogo de vários
anos, e abrir filtrada esconderia planejadas e concluídas sem a pessoa ter escolhido — por isso o
padrão proposto é todas, com `ano` como recorte natural. É a D4.

### 2.3 Uma consulta, uma folha de filtros, uma folha de tabela — o molde de `/instrutores`

**Decisão.** `app/(app)/turmas/page.tsx` (servidor) + `consulta.ts` com `montarConsultaDeTurmas<C>`
pura sobre o mesmo `Encadeavel` de `app/(app)/instrutores/consulta.ts:33-40` + `FiltrosDeTurmas.tsx`
(folha: `FiltroAvancado` + `BotaoLimparFiltros`) + `TabelaDeTurmas.tsx` (folha: `TabelaDensa`,
`aoAtivarLinha` → `router.push(enderecoDaTurma(codigo))`). A consulta é **uma** por tela:
`turmas` com embed `cursos!inner(codigo, nome_curso)`, mais `cursos` para as opções do filtro, em
`Promise.all`. As duas folhas entram em `FOLHAS_DE_CLIENTE` de `fronteira-das-telas.test.ts:30-90`.

**Razão.** É o desenho já validado três vezes (instrutores, cursos, disciplinas). ⚠️ **A guarda
`SC-004` NÃO reprova esta lista, e isso foi medido, não suposto** (`seletor-turma-unico.test.ts:52-53`):
o padrão exige `turmas.map(…<option|SelectItem)`; `FiltrosDeTurmas` mapeia **cursos** e **situações** e
delega a construção ao `FiltroAvancado`, sem `<select` próprio. O estado vazio distingue *não há* de
*você não vê* por `alcanceDoPerfil` (`app/(app)/cursos/consulta.ts`), como `AbaGrade` já faz com
`motivoDoVazio`.

### 2.4 Endereços — três funções novas no módulo único, e por quê

**Decisão.** `lib/navegacao/endereco-de-turma.ts` ganha: `enderecoDasTurmas(sigla?)` →
`/turmas` ou `/turmas?curso=<nuqs>`; `enderecoDaSecaoDeDisciplinas(codigo)` →
`${enderecoDaTurma(codigo)}#disciplinas`; e a constante exportada `ROTA_DA_FICHA_DA_TURMA =
"/turmas/[turma]"`, para `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`.

**Razão.** Medido: a guarda T070 (`tests/unidade/endereco-de-turma-unico.test.ts:53-54, 84-106`)
reprova **qualquer** string `"/turmas/…"` ou `?turma=` fora do módulo — inclusive um
`redirect(`/turmas/${…}#disciplinas`)` e um `revalidatePath("/turmas/[turma]")`. E `?curso=` precisa
da grafia do `nuqs` (`comoAConsultaEscreve`, linhas 61-73) para que o link e a URL que o filtro escreve
sejam **a mesma cadeia** (FR-031.1 da spec 009). ⚠️ `"/turmas"` sem barra final **não** reprova
(é como `menu.ts` passa), mas o link *ver todas* carrega `?curso=`, então nasce no módulo.

### 2.5 O redirecionamento — `redirect()` na página, antes de qualquer consulta

**Decisão.** Em `app/(app)/disciplinas/page.tsx`, logo após `lerParametros`: se `valores.turma !== ""`,
`redirect(enderecoDaSecaoDeDisciplinas(valores.turma))`. O parâmetro `turma` **fica** no contrato de
`/disciplinas` com o papel único de endereço antigo; `situacao_turma` e `instrutor` **saem** *(padrão
provisório, D5)*.

**Razão.** Medido: `redirect` de `next/navigation` já é o padrão em três lugares
(`app/(app)/layout.tsx:31`, `perfil/page.tsx:26`, `perfil/senha/page.tsx:21`), sempre antes de
consultar. Medido: `situacao_turma` e `instrutor` só têm efeito com `porTurma`
(`GradeDeDisciplinas.tsx:204-224`) — sem o bloco, são parâmetros mortos no contrato, e parâmetro
morto é o que o `FR-001` da spec 008 existe para impedir. Remover `turma` do contrato impediria ler o
endereço antigo (`lerParametros` descarta o que não está declarado). ⚠️ O destino carrega `#disciplinas`
no `Location`; o navegador rola até a âncora. Turma inexistente cai no *"não encontrada"* que a ficha
já tem.

### 2.6 Mover o bloco por turma — os painéis ficam onde estão, a ficha os importa

**Decisão.** `PainelDePeriodo` e `PainelDeInstrutores` **permanecem** em
`app/(app)/disciplinas/paineis/` e passam a ser importados por uma folha nova,
`app/(app)/turmas/[turma]/DisciplinasDaTurma.tsx` (`TabelaDensa` com `detalhe`, `abertas` ligado a
`?aberta=`). O dado vem de **`lerGradeDeDisciplinas({ cursoCodigo, turmaCodigo })`**, a mesma função de
`app/(app)/disciplinas/consulta.ts`. `GradeDeDisciplinas.tsx` perde os ramos `porTurma`.

**Razão.** (a) Os painéis importam Server Actions (`@/lib/acoes/disciplina`, `@/lib/acoes/atribuicao`)
— **não podem** ir para `components/` (`fronteira-componentes.test.ts:59-70` proíbe `@/lib/acoes/`, e
exigiria amostra na vitrine). (b) Reusar `lerGradeDeDisciplinas` preserva de graça o
`.order("ordem_antiguidade")` que `tests/unidade/ordenacao-de-instrutor.test.ts` cobra de **toda**
leitura de instrutor — reescrever a consulta na ficha seria reescrever a guarda. (c) `useParametro` é
tipado por rota (`ParametroDe<R>`), e `GradeDeDisciplinas` está presa a `const ROTA = "/disciplinas"`
(linha 54): a folha nova usa `useParametro("/turmas/[turma]", "aberta")`, o que exige **declarar
`aberta`** no contrato de `/turmas/[turma]` — hoje `parametros: {}`, com asserção de que nenhuma
rota de formulário declara parâmetro (`contrato-de-parametros.test.ts:400-404`), a ser emendada.

### 2.7 Revalidação — as ações por turma passam a revalidar a ficha

**Decisão.** `definirPeriodoDaTurma` (`lib/acoes/disciplina.ts:54`) e `definirInstrutoresDaTurma`
(`lib/acoes/atribuicao.ts:64`) acrescentam `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`.

**Razão.** Medido: hoje revalidam só `/disciplinas` (e `/cursos`, `/instrutores`). Com os painéis na
ficha, gravar período ou instrutores **deixaria a ficha com dado velho, sem erro** — gotcha 4 na
forma de cache. Revalidar o padrão de rota dispensa descobrir o código da turma a partir de
`turmaDisciplinaId`. *(padrão provisório, D12 — a alternativa é a ação receber o código e revalidar
`enderecoDaTurma(codigo)`, como `lib/acoes/turma.ts:115` faz.)*

### 2.8 `disciplinasAtivas: 1` — o aviso que estava silenciado *(padrão provisório, D6)*

Medido: `app/(app)/turmas/[turma]/page.tsx:122` e `cursos/[curso]/page.tsx:129` passam
`disciplinasAtivas: 1` **fixo** a `avisosDaTurma`, silenciando o aviso `sem_disciplina` porque *"a
grade da turma é do Épico 6"*. Com a ficha lendo `turma_disciplina` (§2.6), o valor real fica
disponível. **Decisão provisória:** a **ficha** passa a usar a contagem real; a aba Grade do curso
mantém `1`, porque o `FR-012` da spec 009 proíbe consulta por turma ali. É mudança **visível** — turma
sem grade passa a mostrar o aviso — e por isso está no lote.

### 2.9 `hoje` em `/disciplinas` é UTC; o resto é São Paulo

Medido: `app/(app)/disciplinas/page.tsx:78` usa `new Date().toISOString().slice(0, 10)` — diverge das
outras telas entre 21h e meia-noite. `lib/formato/ano-corrente.ts:16` já exporta `hojeNaCiaara()`.
**Decisão:** o PR 2, que toca essa página, troca por `hojeNaCiaara()`; e a ficha e o Início usam a
mesma função no PR 3, retirando as duas cópias locais de `hojeEmSaoPaulo()`.

## 3. O andamento (PR 3)

### 3.1 O módulo puro — assinatura e o que entra por parâmetro

**Decisão.** `lib/dominio/andamento-da-turma.ts` exporta `diasUteisEntre`, `capacidadeDiaria` e
`andamentoDaTurma`, **tudo por parâmetro**: `hoje` (string `yyyy-mm-dd`, como todo módulo da pasta),
a lista de datas de feriado de dia inteiro, o regime (`regimePadraoTempos`, `limiteDiarioEadHoras`), a
modalidade e o status da turma, a prevista e a executada. Devolve um objeto com cada grandeza e com a
**situação da capacidade** (`calculada` | `sem_regime` | `sem_termino`), além de `emAtraso`.

**Razão.** Medido: a convenção de `lib/dominio/` é `hoje: string` comparado lexicograficamente
(`avisos-da-turma.ts:48`, `indicadores-da-grade.ts:42`, `vigencia-de-regime.ts:109`), e a pureza é
imposta por ESLint (`eslint.config.mjs:95-116`). O único auxiliar de data existente é
`diasAte(data, hoje)` em `sinalizacao-de-disciplina.ts:45-53` — dias **civis**, sem fim de semana; o
laço de dias úteis nasce aqui. ⚠️ **A fórmula da v1.0 entra como testemunho datado** de Bernardo
(04/10/2026, citando `Código.gs`/`temposDiaDaTurma_`): `getDashboardGeral` **não está no repositório**
(zero ocorrências em `docs/` e `scripts/`), e o cabeçalho do módulo diz isso com todas as letras.

### 3.2 Dias úteis — segunda a sexta, datas distintas, extremos inclusivos *(padrão provisório, D7 e D9)*

**Decisão.** `diasUteisEntre(hoje, termino, feriados)`: conta os dias de segunda a sexta de `hoje` a
`termino`, **ambos inclusivos**, e subtrai os feriados de impacto `dia_inteiro` cuja data é dia de
semana — por **data distinta**. `termino < hoje` → 0.

**Razão.** *"De hoje até a data de término"* lê-se inclusivo nas duas pontas, e hoje é dia em que
ainda se pode dar aula. Medido na origem (`scripts/etl/dados/bruto/v20/Calendario_Feriados.csv`): há
**data duplicada** (16/02 em `FER-000003` e `FER-000022`) — contar por linha descontaria duas vezes;
e feriado em fim de semana não tira capacidade de ninguém. Os dois pontos são fidelidade à v1.0 que só
Bernardo pode confirmar, por isso D7 e D9.

### 3.3 Capacidade diária — a modalidade da turma escolhe a coluna; sem dado é sem dado *(D8)*

**Decisão.** `capacidadeDiaria(modalidade, regime)`: `ead` → `limiteDiarioEadHoras` (1 TA = 1 h);
`presencial`/`semipresencial` → `regimePadraoTempos`. Valor **nulo ou ≤ 0 → `null`** (sem dado), sem
fallback para a outra coluna.

**Razão.** Medido: o `CHECK regime_tempos_valido` (`20260908085000:34-37`) garante que regime EAD
tem `regime_tempos = 0` **e** o limite preenchido — mas **não amarra o regime à modalidade do curso**,
e nada amarra a modalidade do curso à da turma. A semente do e2e (`panorama-de-teste.ts:88-97`) já
tem um curso `ead` com `regime_tempos: 8` e limite nulo. Um fallback (usar tempos quando o limite
falta) daria capacidade **8 TA/dia a uma turma EAD** — o atraso falso que a Q1 foi respondida para
evitar. Zero tempos numa turma presencial daria capacidade zero e atraso em todas. "Sem dado" é a
degradação honesta (`RN-DEG-01`); é a D8.

### 3.4 O que a tela lê, e em quantas consultas

| Dado | De onde | Ficha | Início |
|---|---|---|---|
| prevista, executada | `vw_carga_horaria_turma` (`chr_curricular`, `chd_executada`) — soma `registros_aula` com `status='ativo'` (`20260829235731:608`) | 1 linha | já lê |
| `data_termino`, `modalidade`, `status` | `turmas` — a view **não** os expõe | já lê | **leitura nova** (`id, data_termino, modalidade`) |
| TA/dia | `vw_cursos_regime_vigente` (`curso_id, regime_padrao_tempos, limite_diario_ead_horas`) | 1 linha | **leitura nova**, todos os cursos do recorte |
| feriados | `feriados` com `impacto='dia_inteiro'`, `status='ativo'`, `data` entre hoje e o término (no Início, até o maior término) | 1 consulta | **leitura nova**, 1 consulta |
| por disciplina | `lerGradeDeDisciplinas` (§2.6) — `temposExecutados` por disciplina já vem de `vw_disciplinas_execucao` | reaproveita | — |

Tudo em `Promise.all`; nenhuma consulta por linha (`FR-012` da spec 009 e `SC-008` desta).
⚠️ **RLS, medida:** `feriados_ler` é ampla (`app.usuario_atual() is not null`,
`20260830000111:904-905`); `curso_regime_historico_ler` exige `cursos.ler` **e** alcance do curso
(`:628-630`) — e `cursos.ler` é verdadeiro para os **nove** perfis na matriz. Quem abre a ficha de
uma turma **alcança** o curso dela (a policy de `turmas` usa o mesmo `alcanca_curso`), logo o regime
nulo na ficha significa **ausência de vigência**, não permissão. É o que torna *"sem dado"* honesto.

### 3.5 `/inicio` consome o módulo — o veredito muda, o painel não

**Decisão (definitiva, Q2).** `montarPanorama` passa a receber, por turma, `dataTermino`, `modalidade`,
o regime do curso e os feriados, e delega `emAtraso` (e `percentual`) a `andamentoDaTurma`. Textos,
`AlertaConformidade`, `BadgeStatus tom="atrasado"` e a lista **não mudam** (`FR-031.2`). O cabeçalho
de `panorama.ts`, que afirma *"aqui não há regra de domínio"*, é reescrito: há, e ela mora em
`lib/dominio/`.

**O caso que discrimina, medido na semente:** `tests/e2e/panorama-de-teste.ts:117-146, 224-234` planta
12 TA executados sobre 10 previstos na `turmaAtrasada` — **excesso** — e `inicio.spec.ts:85-98`
assere *"em atraso"* nela. Com a regra certa esse caso **vira**: a turma em excesso deixa de ser
acusada. Para o outro sentido, a semente ganha `data_termino` nas duas turmas, `limite_diario_ead_horas`
no curso EAD, e uma turma com carga restante maior que a capacidade até o término — que **passa** a ser
acusada. ⚠️ A semente é compartilhada por `cursos-de-teste.ts`, `instrutores-de-teste.ts` e
`url-degradada.spec.ts`: a mudança é conferida nos quatro.

### 3.6 Barra de progresso — componente CIAARA novo, com amostra na vitrine *(D10)*

Medido: não existe `role="progressbar"` em `components/` nem em `app/`. **Decisão:**
`components/ciaara/barra-de-progresso.tsx` (servidor, `role="progressbar"`, `aria-valuenow/min/max`,
tons por token), com amostra em `/estilo` — `fronteira-componentes.test.ts:198-216` exige que todo
componente da pasta seja alcançável pela vitrine. A alternativa (marcação inline na ficha) evita a
amostra e cria o segundo lugar a divergir quando o Início quiser a mesma barra.

### 3.7 Duas guardas novas — "gordura" e o cálculo único

- `tests/unidade/vocabulario-proibido.test.ts`, no molde de `sem-convite-nem-envio-de-email.test.ts`
  (varredura sem comentário em `app`, `lib`, `components`, `supabase`, `tests`; lista `PROIBIDOS` com
  motivo; controle positivo exigindo *"Saldo de capacidade"* na ficha). Medido: `vocabulario.test.ts` é
  o vocabulário **visual**, não serve.
- `tests/unidade/andamento-unico.test.ts`: `emAtraso` só se **calcula** em
  `lib/dominio/andamento-da-turma.ts`; `panorama.ts` e a ficha o **importam**. É o `SC-006`.

### 3.8 O caso calculado à mão (`SC-005`) — onde ele vive

O e2e roda sobre `db:reset:limpo` (base vazia): *"dado real do ETL"* não existe ali. O caso à mão
nasce em dois lugares: (a) **unidade**, com uma turma real copiada por valor (código, prevista,
executada, término, modalidade, regime e feriados do período, lidos no banco **local** carregado pelo
ETL) e o resultado conferido número a número; (b) o **roteiro de conferência** de Bernardo no preview,
sobre a mesma turma, com a conta escrita ao lado da tela. ⚠️ O banco remoto não é consultado para isso.

## 4. O que a pesquisa descartou, e por quê

| Caminho | Por que não |
|---|---|
| `sidebar` do shadcn | Q3, definitiva: evoluir o que existe, sem pacote novo |
| Parâmetro novo de TA/dia ou `8` fixo | Proibido pelo pedido; o dado existe no regime vigente |
| Mover os painéis por turma para `components/` | Importam Server Actions — proibido por `fronteira-componentes`; exigiriam vitrine |
| Reescrever a consulta de instrutores na ficha | Reescreveria a guarda `SC-001`; `lerGradeDeDisciplinas` já a satisfaz |
| `Tooltip` em cada entrada | Redundante com a expansão por hover (D3) |
| Projeto Playwright de celular | `setViewportSize` por caso já é o precedente; um projeto dobraria a suíte |
| Migration | Nenhuma estrutura muda; o TA/dia já existe |

## 5. Índice dos artefatos medidos

`app/(app)/layout.tsx` · `components/casca/{casca-do-app,navegacao-lateral,painel-retratil,foco-ao-trocar-de-rota}.tsx` ·
`components/ui/tooltip.tsx` · `lib/navegacao/{menu,contrato,endereco-de-turma,esquema,usar-parametro}.ts` ·
`lib/supabase/{server,middleware}.ts` · `app/(app)/instrutores/{page.tsx,consulta.ts,FiltrosDeInstrutores.tsx,TabelaDeInstrutores.tsx}` ·
`app/(app)/disciplinas/{page.tsx,consulta.ts,GradeDeDisciplinas.tsx,CascataDeCursoETurma.tsx,paineis/*}` ·
`app/(app)/turmas/[turma]/{page.tsx,consulta.ts,QuadroDeAvisosDaTurma.tsx}` · `app/(app)/cursos/[curso]/{page.tsx,consulta.ts,AbaGrade.tsx}` ·
`app/(app)/inicio/{page.tsx,panorama.ts}` · `lib/dominio/{seletor-de-turma,pre-selecao-de-turma,avisos-da-turma,sinalizacao-de-disciplina,indicadores-da-grade}.ts` ·
`lib/acoes/{disciplina,atribuicao,turma}.ts` · `lib/formato/ano-corrente.ts` ·
`supabase/migrations/{20260829235731,20260830000111,20260908085000,20260918041449}*.sql` ·
`tests/unidade/{fronteira-casca,fronteira-componentes,fronteira-das-telas,toda-tela-tem-caminho,contrato-de-parametros,endereco-de-turma-unico,seletor-turma-unico,ordenacao-de-instrutor,texto-tenue,sem-convite-nem-envio-de-email}.test.ts` ·
`tests/e2e/{shell,acessibilidade,tema,teclado,inicio,turmas,disciplinas,curso-pagina}.spec.ts` · `tests/e2e/{conta-de-teste,panorama-de-teste}.ts` ·
`playwright.config.ts` · `eslint.config.mjs` · `scripts/etl/dados/bruto/v20/Calendario_Feriados.csv`.
