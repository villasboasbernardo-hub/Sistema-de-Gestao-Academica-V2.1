# Research — Hotfix Sidebar/Carrossel/Estatísticas

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — as duas ambiguidades reais desta spec já foram
resolvidas em `/speckit-clarify` (dedup tie-break, ordem secundária). Este documento registra as 4
decisões técnicas de implementação, cada uma correspondente a um FR de `spec.md`.

## 1. Onde declarar o JS do Tailwind CSS (FR-001)

**Decisão**: Adicionar `<script src="https://cdn.jsdelivr.net/npm/Tailwind@5.3.3/dist/js/o pacote `tailwindcss` + `shadcn/ui`"></script>`
em `app/globals.css`, mesma versão (`5.3.3`) já fixada na tag do CSS na mesma linha do arquivo.

**Rationale**: `app/globals.css` é incluído uma única vez, no `<head>` de `app/layout.tsx`
(`<?!= include('_Estilos'); ?>`), antes de qualquer script inline do resto da aplicação. O bundle do
Tailwind CSS não depende de nenhum elemento do DOM para ser carregado (só para ser *usado*, quando um
elemento com `data-bs-toggle` é clicado depois que a página já renderizou) — carregá-lo no `<head>`
funciona sem alterar a ordem de carregamento de nenhum outro script. Manter a mesma versão do CSS
evita divergência de versão entre CSS/JS do Tailwind CSS (risco real: comportamento de componente
inconsistente entre uma versão e outra).

**Alternatives considered**:
- Carregar no fim do `<body>` (padrão comum de performance para não bloquear renderização): rejeitado
  porque o app não usa nenhum bundler/minificador que se beneficiaria disso, e o próprio `components/ciaara/`
  (com toda a lógica de `AppState`/`irPara`) já é incluído no fim do `<body>` hoje — carregar o
  Tailwind CSS JS ali também funcionaria, mas colocá-lo junto do CSS em `app/globals.css` é mais coerente
  com "um arquivo, uma responsabilidade" (CSS+deps visuais em um lugar) e evita esquecer de incluir em
  alguma view futura que porventura não inclua `components/ciaara/` da mesma forma.
- `Tailwind.min.js` (sem `.bundle`): rejeitado — a versão não-bundle não inclui Popper.js, exigido
  por alguns componentes Tailwind CSS (não pelo offcanvas em si, mas por outros componentes já usados no
  projeto, como dropdowns eventuais); usar a versão bundle evita um segundo `<script>` de dependência.

## 2. Onde extrair a lógica de agrupamento/ordenação de cursos (FR-003/004)

**Decisão**: Função pura `agruparCursosParaPagina_(cursos, turmasEmDestaque)` dentro do próprio
`<script>` de `app/(app)/cursos/[curso]/page.tsx`, chamada por `popularCursos()`. Recebe os arrays já carregados em
`AppState.ctx` e devolve, por classificação, os cursos já divididos em "com destaque" (ordem natural)
seguidos de "sem destaque" (ordem natural) — sem tocar o DOM.

**Rationale**: Mesmo padrão já estabelecido no Épico 009 para `resolverTurmaEmDestaque_` (função pura,
testável por `pnpm vitest run` via os harnesses de sandbox `vm` já usados em `tests/unidade/regras_ui_dados.test.ts`)
— só que aqui a função vive no front-end porque a divisão em subgrupos é puramente de apresentação
(a mesma lista de `AppState.ctx.cursos`/`turmasEmDestaque` já chega pronta do backend desde o Épico
009; não há nova leitura de planilha nem novo cálculo de negócio). Manter a função pura e separada de
`popularCursos()` (que segue fazendo só a parte de `innerHTML`) permite testá-la sem `jsdom`/DOM real,
mesmo mecanismo de teste de função pura de front-end já usado no projeto.

**Achado do `/speckit-analyze` (F1, corrigido aqui)**: `app/(app)/cursos/[curso]/page.tsx`, diferente de `components/ciaara/`
(o único arquivo até hoje carregado por importação direta do módulo num teste), tem uma linha executável de
nível superior — `document.addEventListener('contexto-pronto', popularCursos);` (fora de qualquer
função). O padrão de `tests/unidade/design_system.test.ts` só funciona porque o arquivo carregado "só DEFINE
funções, nunca executa corpo no carregamento" (comentário do próprio arquivo de teste); carregar
`app/(app)/cursos/[curso]/page.tsx` daquele mesmo jeito lançaria `ReferenceError: document is not defined` no sandbox
vazio. O teste desta spec (T004) precisa remover/neutralizar essa linha antes de importação direta do módulo —
ou stripando-a com regex (mesma técnica já usada para a tag `<script>`), ou fornecendo um
`sandbox.document = { addEventListener: () => {} }` antes de rodar. Nenhuma mudança em
`app/(app)/cursos/[curso]/page.tsx` é necessária — o ajuste é só na forma como o teste carrega o arquivo.

**Alternatives considered**:
- Resolver a ordenação no backend (`getContextoInicial`, ``app/layout.tsx` + `lib/supabase/server.ts``): rejeitado — os dados
  (`cursos`, `turmasEmDestaque`) já chegam ao front-end integralmente; ordenar de novo no backend só
  para entregar uma lista pré-ordenada duplicaria a decisão de "o que é destaque" (que já mora em
  `resolverTurmaEmDestaque_`) sem nenhum ganho, e tornaria `ctx.cursos` dependente de uma tela
  específica (Página do Curso) dentro de um contexto que é compartilhado por todas as views.
- Ordenar inline dentro do `.map()`/`.sort()` de `popularCursos()`, sem extrair função: rejeitado —
  não seria testável isoladamente por `pnpm vitest run` (a spec pede este comportamento como parte do
  critério de aceite, FR-004/SC-003).

## 3. Reuso do componente de carrossel (FR-005)

**Decisão**: Trocar `<div class="row g-3">...</div>` por `<div class="carrossel-scroll-snap">...</div>`
em `popularCursos()`, reaproveitando a classe CSS já definida em `app/globals.css` (linha ~135,
`.carrossel-scroll-snap`) e já em uso por `app/(app)/inicio/page.tsx`. Nenhuma mudança de CSS.

**Rationale**: A classe já existe, já é testada visualmente (Painel Início, Épico 009) e já cumpre
exatamente o requisito (scroll-snap nativo, sem biblioteca). Reaproveitar em vez de criar uma segunda
classe evita duas implementações do mesmo padrão visual divergindo ao longo do tempo.

**Alternatives considered**:
- Nova classe dedicada para a Página do Curso (ex.: `.carrossel-cursos`): rejeitado — não há diferença
  de comportamento entre os dois usos que justifique uma segunda classe; violaria a mesma lógica que
  já levou `.area-impressao` a ser um componente genérico reaproveitado (Épico H) em vez de uma classe
  por tela.

## 4. Deduplicação de `getEstatisticasCursos()` (FR-006)

**Decisão**: Antes de qualquer contagem, reduzir `cursos` (array bruto de `lerAbaComoObjetos_('cursos')`)
a uma lista deduplicada — mapa `ID_Curso → primeira linha encontrada` (`Object` simples, só grava se a
chave ainda não existir) **só quando `ID_Curso` é um valor não-vazio**; linhas com `ID_Curso` vazio/nulo
nunca entram nesse mapa e são todas mantidas individualmente na lista final (append direto, sem chave)
— satisfaz o Edge Case de `spec.md` ("cada linha sem `ID_Curso` continua sendo contada
individualmente"). Usar essa lista (mapa deduplicado + linhas sem `ID_Curso` preservadas) como entrada
para `porClassificacao`, `duracaoMediaPorClassificacao` e `kpis.totalCursos` — mesmo padrão de
"primeira ocorrência vence" já decidido em `/speckit-clarify`, agora com a guarda de chave vazia.

**Achado do `/speckit-analyze` (C1, corrigido aqui)**: a versão original desta decisão usava
`ID_Curso` cru como chave de um `Object`, sem tratar chave vazia — duas linhas com `ID_Curso: ''`
colidiriam no mesmo slot do mapa e a segunda seria descartada, violando o Edge Case acima (que exige
o oposto: linhas sem `ID_Curso` nunca são tratadas como a mesma linha umas das outras). O próprio
`contarPorChave_` já teria esse cuidado para fins de *contagem* (`chave || '(sem valor)'`), mas aqui o
problema é diferente — é *seleção de linha* (dedup), não contagem por chave — por isso a guarda
precisa ser explícita nesta função, não herdada de `contarPorChave_`.

**Rationale**: `contarPorChave_` (helper já existente, reaproveitado pelas outras 3 funções de
`lib/acoes/estatisticas.ts`) já agrupa por uma chave — mas aqui a deduplicação acontece **antes** dele, sobre o
próprio curso, não dentro dele (senão a contagem por classificação usaria a classificação da última
linha lida, não da primeira — inconsistente com a decisão de clarify). Um único array deduplicado
alimenta os três cálculos, garantindo que "Total de cursos" e a soma de `porClassificacao` sempre
batem entre si (mesma garantia que SC-005 exige).

**Alternatives considered**:
- `Set` de `ID_Curso` só para o KPI `totalCursos`, mantendo `porClassificacao`/`duracaoMedia` sem
  dedup: rejeitado — deixaria o gráfico por classificação com o mesmo bug que motivou o hotfix, só
  escondido atrás de um KPI correto.
- Deduplicar dentro de `contarPorChave_` (helper genérico): rejeitado — `contarPorChave_` é usado
  pelas outras 3 funções de estatística (Disciplinas/Instrutores/Turmas) com chaves que não são
  `ID_Curso`; adicionar uma dedup genérica ali mudaria comportamento de funções fora do escopo deste
  hotfix (violaria Princípio IX).
