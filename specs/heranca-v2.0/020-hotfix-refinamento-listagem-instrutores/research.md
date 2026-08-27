# Research — Hotfix: Refinamento de UI e Correção do Algoritmo de Nome de Guerra

## 1. Algoritmo de destaque por palavra (correção do bug de nomes não contíguos)

**Decision**: Dentro de `formatarNomeInstrutor_` (`components/ciaara/`), o bloco `if (isHTML && nomeGuerra
...)` passa a: (a) dividir `nomeGuerra` em palavras via `.split(' ')`, descartando entradas vazias
(espaços duplicados); (b) para cada palavra, escapar caracteres especiais de regex (mesma função de
escape já usada hoje) e aplicar `new RegExp('\\b' + palavraEscapada + '\\b', 'gi')` sobre o
resultado acumulado até então; (c) encadear as substituições palavra por palavra sobre a MESMA
string em construção (não sobre `nomeBase` do zero a cada palavra), para que o destaque de uma
palavra não seja desfeito pela busca da palavra seguinte.

**Rationale**: É exatamente o algoritmo especificado no pedido do usuário (delimitador de palavra
`\b`, global e case-insensitive, por palavra). Usar `\b` em vez de busca de substring cru evita
também um efeito colateral que a versão ingênua teria (destacar "Ana" dentro de "Anacleto"); global
(`g`) garante que uma palavra repetida no nome completo tenha todas as ocorrências destacadas
(Edge Case de `spec.md`).

**Alternatives considered**:
- *Substituir `nomeBase` inteiro a cada palavra, não a string acumulada* — rejeitado: a segunda
  substituição perderia a tag `<strong>` já aplicada pela primeira, produzindo destaque só da
  última palavra processada.
- *Um único regex combinando todas as palavras com alternância (`palavra1|palavra2`)* — rejeitado:
  o pedido especifica explicitamente "para CADA palavra... utilize uma Expressão Regular", uma por
  vez; a alternância também dificultaria capturar corretamente o `$&` de cada ocorrência com a
  capitalização original quando as palavras têm tamanhos diferentes.

**Achado real durante a implementação (desvio deliberado de `\b...\b` literal)**: a primeira
implementação, com `\b` literal exatamente como pedido, falhou o caso de teste "José" (Edge Case de
palavra repetida) — `\b` em JavaScript é definido sobre `\w` (só ASCII), então a fronteira de
palavra não é reconhecida depois de um caractere acentuado, porque tanto ele quanto o espaço
seguinte são tratados como "não-palavra" (sem transição `\w`↔não-`\w`, não há `\b`). Substituído por
`(?<![\p{L}\p{N}])palavra(?![\p{L}\p{N}])` (flags `giu`) — fronteira de palavra Unicode-aware, mesmo
delimitador pedido, correto também para nomes acentuados (comuns neste domínio). Sem esta correção,
o algoritmo novo reproduziria, para nome acentuado, exatamente o mesmo tipo de falha silenciosa que
esta spec existe para resolver.

## 2. Consequência estrutural do algoritmo por palavra em nomes de guerra já contíguos

**Decision**: Para um nome de guerra de múltiplas palavras que hoje já é contíguo no nome completo
(ex.: "Nunes Guimarães" dentro de "... Antônio Ricardo Nunes Guimarães"), o novo algoritmo produz 2
marcações de negrito separadas por um espaço fora de qualquer marcação (`<strong>Nunes</strong>
<strong>Guimarães</strong>`), em vez da única marcação combinada de antes
(`<strong>Nunes Guimarães</strong>`). Aceito como comportamento correto e intencional — visualmente
idêntico (as mesmas 2 palavras aparecem em negrito, adjacentes), só a estrutura do HTML muda.

**Rationale**: É a consequência direta do algoritmo explicitamente pedido (dividir em palavras,
tratar cada uma independentemente) — não há como aplicar esse algoritmo e preservar a marcação
combinada sem adicionar lógica extra de "juntar marcações adjacentes" que o pedido não pede e que
adicionaria complexidade não solicitada (Princípio VI).

**Impacto em teste existente**: `tests/unidade/design_system.test.ts` tem 2 testes (`describe "FR-002 a
FR-010"`) que usam nome de guerra "VILAS BÔAS" (2 palavras contíguas) e esperam a marcação única
antiga — precisam ser migrados para a nova asserção de 2 marcações separadas (research.md desta
spec, não uma regressão).

## 3. Palavra do nome de guerra não encontrada no nome completo

**Decision**: Se uma palavra específica do nome de guerra não tem nenhuma correspondência no nome
completo (dado inconsistente), o `.replace` daquela palavra simplesmente não encontra nada e não
altera a string — as demais palavras que TÊM correspondência continuam sendo destacadas
normalmente.

**Rationale**: Comportamento natural do encadeamento de `.replace` por palavra (FR-004) — nenhuma
lógica condicional extra é necessária, o próprio `.replace` já degrada dessa forma quando não há
match, consistente com Princípio V.

## 4. Consolidação da coluna "Instrutor"

**Decision**: Em `renderizarListagemInstrutores_` (`app/(app)/instrutores/page.tsx`), a célula que hoje é
`<td>${i.Posto_Graduacao || ''}</td><td>${formatarNomeInstrutor_('', '', i.Nome_Completo,
i.Nome_Guerra, true)}</td>` vira uma única `<td>${formatarNomeInstrutor_(i.Posto_Graduacao,
i.Esp_Hab_Obs, i.Nome_Completo, i.Nome_Guerra, true)}</td>`. O `<th>` correspondente no cabeçalho
muda de `<th>Posto/Graduação</th><th>Nome Completo</th>` (2 colunas) para `<th>Instrutor</th>` (1
coluna); o `colspan` da linha "nenhum instrutor encontrado" muda de `7` para `6`.

**Rationale**: `formatarNomeInstrutor_` já aplica exatamente as regras de círculo hierárquico
(posto + especialidade condicionalmente) documentadas no hotfix de nomenclatura militar — passar
os valores reais em vez de `''`/`''` é a única mudança necessária para obter o formato pedido
("CMG (RM1) Antônio Ricardo **Nunes Guimarães**"), sem nenhuma lógica de formatação nova.

## 5. Remoção da seção legada e da função de backend órfã

**Decision**: Remover de `app/(app)/instrutores/page.tsx`: o bloco HTML da seção "Vínculo de qualificação"
(`#formVinculo` e todo o seu conteúdo), as funções `carregarDisciplinasParaVinculo()` e
`salvarVinculoHabilitacao()`, e as 2 linhas de `carregarInstrutores()`/boot que só existiam para
alimentar essa seção (popular `#vincInstrutor`, chamar `carregarDisciplinasParaVinculo()`). Remover
de `lib/acoes/instrutores.ts` a função `criarVinculoHabilitacao` (grep confirmado: zero chamadores em `src/`
ou `tests/` após a remoção do frontend).

**Rationale**: Autocontido — nenhum outro arquivo referencia qualquer um desses símbolos (achado
real de `spec.md`). Deixar `criarVinculoHabilitacao` para trás criaria uma função de backend
acessível via Server Action sem nenhum caminho de UI que a alcance, o tipo de resíduo que
este projeto já demonstrou evitar ativamente (nota sobre utilitários de migração órfãos em
`docs/arquitetura/02-modularizacao.md`).

## 6. Contêiner de aviso de página para `carregarInstrutores()`

**Decision**: Adicionar um novo `<div id="avisoListagemInstrutores" class="mb-2"></div>` dentro de
`#painelPrincipalInstrutores`, antes da barra de filtros, e trocar o alvo do `.catch()` de
`carregarInstrutores()` de `'avisoVinculo'` (removido) para `'avisoListagemInstrutores'`.

**Rationale**: FR-007 — `mostrarAvisoNivel2` degrada silenciosamente quando o contêiner não existe
(`if (!el) return;`, Princípio V); sem um substituto, um erro real de carregamento da listagem
inteira ficaria invisível ao usuário. Um contêiner de nível de página (não mais atrelado a um
formulário específico) é semanticamente mais correto, já que `carregarInstrutores()` carrega dados
para a tela inteira, não só para o formulário que estava sendo removido.

## 7. Renomeação do rótulo do painel de disciplinas

**Decision**: Em `painelAtribuicaoDisciplinasHtmlInstrutor_` (`app/(app)/instrutores/page.tsx`, spec 019), o
texto `<label ...>Atribuição de Disciplinas</label>` muda para `<label ...>Qualificação do
Instrutor</label>`. Nenhum outro identificador (nome de função, `id` de elemento, classe CSS) é
tocado.

**Rationale**: FR-008 — mudança puramente textual, sem impacto em nenhum seletor usado por
`filtrarPainelDisciplinasInstrutor_`/`coletarDisciplinasSelecionadasInstrutor_` (que usam `id`s
como `buscaDisciplinasInstrutor`/`.chk-disciplina-instrutor`, não o texto do `<label>`).

## 8. Cobertura de testes

**Decision**: `tests/unidade/design_system.test.ts` ganha: (a) migração das 2 asserções existentes que
esperavam marcação única para nome de guerra contíguo de 2 palavras (research.md §2); (b) casos
novos cobrindo nome de guerra de palavras não contíguas (os 2 exemplos do próprio pedido do
usuário: "Guilherme Pires Black Pereira"/"Guilherme Black" e "Vanessa Santos Medeiros da
Silva"/"Vanessa Medeiros"), palavra repetida no nome completo (Edge Case), e palavra do nome de
guerra sem nenhuma correspondência (FR-004). A consolidação de coluna (US1), a remoção de seção
(US3) e a renomeação de rótulo (US4) tocam exclusivamente `document`/DOM em `app/(app)/instrutores/page.tsx`
— sem harness disponível (mesmo achado documentado desde a spec 016), cobertas só por
`quickstart.md`.

**Rationale**: Reaproveita o harness já existente de `tests/unidade/design_system.test.ts` para
`formatarNomeInstrutor_` (extração de `<script>` de `components/ciaara/` + importação direta do módulo) — nenhum
harness novo necessário.
