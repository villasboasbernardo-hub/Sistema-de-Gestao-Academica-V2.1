# Research — Hotfix e Refatoração UI/UX: Módulo de Instrutores

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — a única ambiguidade real desta spec (nova aba vs.
modal) já foi resolvida em `/speckit-clarify`. Este documento registra as 7 decisões técnicas de
implementação, cada uma correspondente a achados/FRs de `spec.md`.

## 1. Deep-link de edição via `app/layout.tsx` (layout raiz) (FR-010/010.1)

**Decisão**: `app/layout.tsx` passa a `app/layout.tsx` (layout raiz). Quando `e.parameter.editarInstrutor` está presente e
não-vazio, o valor é atribuído a uma propriedade do template (`template.deepLinkEditarInstrutor =
e.parameter.editarInstrutor`) antes de `.evaluate()`. `app/layout.tsx` injeta esse valor num `<script>`
via o mesmo mecanismo de scriptlet `<?!= ?>` já usado por a importação de componentes:
```html
<script>const DEEP_LINK_EDITAR_INSTRUTOR = '<?!= deepLinkEditarInstrutor ?>';</script>
```
No boot (`contexto-pronto`), `app/(app)/instrutores/page.tsx` verifica essa constante: se não-vazia, chama
`irPara('tabInstrutores')` e abre o painel de edição já focado naquele `ID_Instrutor` (mesmo dado já
carregado por `carregarInstrutores()` — nenhuma chamada de backend nova para isso).

**Rationale**: Reaproveita 100% do mecanismo de template já existente (`app/layout.tsx` já usa `<?!=
include(...) ?>`), sem introduzir nenhum roteamento novo — é literalmente a primeira vez que
`app/layout.tsx` lê `e`, mas o padrão (template com propriedade customizada antes de `evaluate()`) é nativo
do `o App Router` e não exige nenhuma dependência ou mudança de arquitetura.

**Alternatives considered**:
- Rota client-side via `window.location.search` lido direto pelo JS do navegador (sem passar por
  `app/layout.tsx`): rejeitado — o aplicação Next.js do Next.js é servido dentro de um página do
  a URL do projeto na Vercel (achado documentado desde o Épico E); não há garantia de que a query string da
  URL de nível superior chegue sem alteração ao `window.location` do página. Ler o parâmetro no
  servidor (`app/layout.tsx` (layout raiz)), onde a aplicação Next.js em si recebe a requisição HTTP diretamente, é a fonte mais
  confiável.
- Um novo `app/layout.tsx` "modo API" que devolve só o JSON de um instrutor: rejeitado — duplicaria o boot
  inteiro da SPA só para uma tela, e a nova aba já precisa do boot completo (`AppState`, `_Comum`,
  todas as views) para funcionar como o resto do sistema; nenhum ganho em servir menos.

## 2. Construção da URL da nova aba (FR-010)

**Decisão**: O backend expõe a URL de implantação da própria aplicação Next.js (`o runtime do Next.js.getService().
getUrl()`) uma vez, dentro de `getContextoInicial()` (campo novo `urlWebApp` no retorno). O botão
"Editar" da listagem constrói `${urlWebApp}?editarInstrutor=${idInstrutor}` e chama
`window.open(url, '_blank')`.

**Rationale**: `o runtime do Next.js.getService().getUrl()` é a forma nativa e documentada do Next.js de
obter a própria URL de implantação — sempre correta, independente de qual domínio/wrapper o
navegador está mostrando no momento (evita depender de `window.location.href` do lado do cliente,
que dentro do a página servida pela Vercel pode não refletir a URL real de implantação, mesmo
risco já identificado na decisão 1). `window.open()` (não mutação de `window.location`/`hash`) não
esbarra no achado de risco do Épico E (mutar o hash da página carregada quebra o `postMessage` com o
wrapper) — abre uma instância nova e independente.

**Alternatives considered**:
- Montar a URL no cliente a partir de `window.location.href`: rejeitado pelo motivo acima (não
  confiável dentro do página/wrapper do a URL do projeto na Vercel).
- Guardar a URL como constante hardcoded no front-end (mesmo valor do `o histórico de deploys da Vercel`): rejeitado —
  duplicaria uma fonte de verdade que já existe nativamente via `o runtime do Next.js`, e quebraria
  silenciosamente se a implantação um dia mudar de ID.

## 3. Ordenação por antiguidade de Posto/Graduação (FR-003, achados 2/3)

**Decisão**: Nova função pura `ordenarPorAntiguidadePosto_(itensPorPosto)` em `lib/acoes/instrutores.ts`,
construída sobre um mapa fechado de 11 entradas:
```js
var ESCALA_ANTIGUIDADE_POSTO = {
  CMG: { ordem: 1, nome: 'Capitão de Mar e Guerra' },
  CF:  { ordem: 2, nome: 'Capitão de Fragata' },
  CC:  { ordem: 3, nome: 'Capitão de Corveta' },
  CT:  { ordem: 4, nome: 'Capitão-Tenente' },
  '1ºTen': { ordem: 5, nome: 'Primeiro-Tenente' },
  '2ºTen': { ordem: 6, nome: 'Segundo-Tenente' },
  SO:  { ordem: 7, nome: 'Suboficial' },
  '1ºSG': { ordem: 8, nome: 'Primeiro-Sargento' },
  '2ºSG': { ordem: 9, nome: 'Segundo-Sargento' },
  '3ºSG': { ordem: 10, nome: 'Terceiro-Sargento' },
  SC:  { ordem: 11, nome: 'Servidor Civil' },
};
```
Códigos fora do mapa recebem `ordem: 999` e `nome` igual ao próprio código bruto, caindo ao final da
lista numa faixa "Outros" (Edge Case de `spec.md`, Princípio V) — nunca lançam exceção nem somem.

**Rationale**: Os 11 códigos são exatamente os valores reais confirmados na banco de produção (achado
2) e formalizam a revisão de `RN-ANT-02` (achado 3, decisão já tomada informalmente em 2026-08-14).
Função pura e testável por `pnpm vitest run`, mesmo padrão de `resolverTurmaEmDestaque_`/
`calcularRitmoDisciplina_`.

**Alternatives considered**:
- Reaproveitar a coluna física `Antiguidade_Declarada`: rejeitado — o próprio `RN-ANT-02` documenta
  que essa coluna é "resquício histórico" e não deve mais ser usada (decisão deliberada da Spec V4).
- Calcular a ordem via `indexOf` num array simples (em vez de um mapa `{ordem, nome}`): rejeitado —
  precisaríamos de duas estruturas (array para ordem, mapa para nome por extenso); um único mapa com
  os dois campos evita duas fontes de verdade divergindo.

## 4. Fonte de dados de Habilitados/Selecionados/CH Ministrada (FR-001/004, achados 5/6)

**Decisão**: 3 funções puras novas (uma por métrica), todas recebendo os arrays já lidos das
respectivas abas (nunca chamando o cliente Supabase diretamente, mesmo padrão de todo o projeto):
- `contarHabilitadosDistintos_(vinculos)` — filtra `Status==='Ativo'`, `Set` de `ID_Instrutor`.
- `contarSelecionadosDistintos_(disciplinas)` — para cada `ID_Instrutor` (CSV) de cada disciplina,
  faz `.split(',').map(trim)`, acumula num `Set`.
- `somarCargaHorariaPorInstrutor_(registros, anoCorrente)` — filtra
  `Categoria_Normativa==='Aula'`, `Status!=='Cancelada'`, ano de `Data` igual a `anoCorrente`, soma
  `Tempos_Consumidos` agrupado por `ID_Instrutor`.

**Rationale**: Isola exatamente a correção dos achados 5/6 de `spec.md` (nunca ler
`Carga_Horaria_Ministrada_Ano`/`Instrutores_Selecionados` diretamente) em funções pequenas,
testáveis isoladamente com dado sintético — sem precisar mockar o cliente Supabase para validar a
lógica de agregação em si (só a leitura das abas, já coberta pelo padrão existente de
`lerAbaComoObjetos_`).

**Alternatives considered**:
- Uma única função grande "getEstatisticasInstrutoresCompletas" sem separar as 3 métricas: rejeitado
  — dificultaria testar cada achado (5, 6) isoladamente e tornaria o `describe` de teste menos
  rastreável ao achado que motivou cada correção.

## 5. `Nome_Completo` com negrito de `Nome_Guerra` (FR-007, achado 1)

**Decisão**: `formatarNomeInstrutor_` (`components/ciaara/`) reescrita para:
```js
function formatarNomeInstrutor_(instrutor) {
  if (!instrutor) return '';
  const partes = [instrutor.Posto_Graduacao, instrutor.Esp_Hab_Obs].filter(Boolean);
  const prefixo = partes.length ? partes.join(' ') + ' ' : '';
  const nomeCompleto = instrutor.Nome_Completo || instrutor.Nome_Guerra || instrutor.ID_Instrutor || '';
  const guerra = instrutor.Nome_Guerra;
  const nomeFormatado = (guerra && nomeCompleto.toUpperCase().includes(guerra.toUpperCase()))
    ? nomeCompleto.replace(new RegExp(guerra, 'i'), m => `<strong>${m}</strong>`)
    : nomeCompleto;
  return (prefixo + nomeFormatado).trim();
}
```
Mantém a assinatura e o prefixo `Posto_Graduacao`/`Esp_Hab_Obs` (RF-INSTR-15 pede os dois antes do
nome) — só a parte do nome em si passa a usar `Nome_Completo` com negrito seletivo, em vez de
`Nome_Guerra` isolado.

**Rationale**: É a implementação fiel de RF-INSTR-15 ("P/G Especialidade/Habilitação **Nome
Completo**, com o nome ou nomes de guerra em negrito") — nunca feita corretamente (achado 1). Mantém
a mesma função/assinatura já consumida por `app/(app)/instrutores/page.tsx` e `app/(app)/turmas/[turma]/dsa/page.tsx` (RF-DS-05,
"componente único, sem reimplementação por módulo") — as duas telas herdam a correção.

**Alternatives considered**:
- Criar uma função nova só para a listagem de Instrutores, deixando `formatarNomeInstrutor_`
  (usada por `app/(app)/turmas/[turma]/dsa/page.tsx`) como está: rejeitado — perpetuaria o bug em `app/(app)/turmas/[turma]/dsa/page.tsx` e duplicaria
  a mesma lógica dita "única e reutilizável" por RF-DS-05, sem nenhum motivo técnico para a
  duplicação (o próprio pedido do usuário é a correção certa do requisito já existente).
- Usar `String.prototype.replace` sem escapar caracteres especiais de regex em `Nome_Guerra`:
  identificado como risco (nomes de guerra reais no dado são só letras, mas um valor futuro com
  caractere especial de regex, ex. parênteses, quebraria o `replace`) — a implementação final deve
  escapar `guerra` antes de construir o `RegExp` (`guerra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`),
  tarefa a detalhar em `tasks.md`.

## 6. Proteção de campos calculados no CRUD (FR-011/012, achado 7)

**Decisão**: `lib/acoes/crud.ts`: `COLUNAS_FORMULA['instrutores'] = ['Instrutor_Completo',
'Carga_Horaria_Ministrada_Ano']`. Na tela de edição, os dois campos renderizam como texto simples
(`<span>`/`<dl>`), nunca dentro de um elemento de formulário — nem mesmo `<input disabled>` (que
ainda pode, por engano futuro, ser reabilitado ou incluído em `FormData`).

**Rationale**: `Instrutor_Completo` é confirmadamente uma fórmula nativa
(`=IFERROR(TRIM($C2&" "&$F2);"")`, achado 7) — pertence exatamente à categoria que
`COLUNAS_FORMULA` já protege (`RN-CRUD-02`). `Carga_Horaria_Ministrada_Ano` não é uma fórmula nativa
de planilha, mas é uma grandeza "sempre calculada, nunca digitada" por `RN-INST-04` — adicioná-la ao
mesmo array reaproveita o mecanismo de proteção já existente em `crudAtualizar` em vez de inventar um
segundo mecanismo só para ela.

**Alternatives considered**:
- Proteger só na interface (nunca no backend): rejeitado — viola RN-CRUD-02 ("toda função de escrita
  deve validar essa permissão no servidor... independentemente do que a interface mostra", mesmo
  espírito já usado para permissões em RN-RBAC-02).

## 7. Filtros avançados combinados (FR-008)

**Decisão**: Filtros client-side, em memória, sobre a lista já carregada por `carregarInstrutores()`
— 5 `<select>` nativos (OM, Categoria, Capacitação Didática, Regime, Escolaridade) populados a
partir dos valores distintos já presentes nos 177 registros carregados; cada mudança de filtro
re-renderiza a lista com um `.filter()` combinando todos os selects ativos (E lógico).

**Rationale**: 177 registros cabem inteiros em memória sem custo perceptível — mesmo padrão já usado
em toda listagem deste projeto (`app/(app)/cursos/[curso]/page.tsx`, `app/(app)/disciplinas/page.tsx`) que nunca pagina nem filtra
no servidor. Criar um endpoint de backend parametrizado por filtro seria complexidade sem benefício
mensurável nesta escala (Princípio IX).

**Alternatives considered**:
- Filtro no backend (`listarInstrutoresComFiltro(filtros)`): rejeitado — nenhum ganho de performance
  em 177 linhas, e obrigaria uma chamada de rede por combinação de filtro trocada, pior experiência
  que filtrar em memória.
