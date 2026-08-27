# Contrato — Funções de frontend (Hotfix: Refinamento de UI e Correção do Algoritmo de Nome de Guerra)

## `components/ciaara/`

### `formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML)` (assinatura preservada — comportamento estendido)

- **Mudança**: quando `isHTML === true` e `nomeGuerra` está preenchido, o destaque deixa de exigir
  que `nomeGuerra` seja um substring contíguo de `nomeCompleto`. `nomeGuerra` é dividido em
  palavras (`.split(' ')`, entradas vazias descartadas); cada palavra é escapada e buscada via
  `new RegExp('(?<![\\p{L}\\p{N}])' + palavraEscapada + '(?![\\p{L}\\p{N}])', 'giu')` (fronteira de
  palavra Unicode-aware — desvio deliberado do `\b...\b` ASCII-only literal do pedido original,
  research.md §1, achado real: `\b` falha para nomes acentuados como "José"), encadeando as
  substituições sobre a mesma string em construção. Prefixo de posto/especialidade (regras de
  círculo hierárquico) e o modo `isHTML=false` permanecem inalterados.
- **Efeito colateral aceito**: um nome de guerra de múltiplas palavras já contíguo no nome completo
  passa a gerar 2+ marcações de negrito separadas por espaço, em vez de 1 marcação combinada
  (research.md §2) — visualmente idêntico.
- **Regras**: FR-003, FR-004, FR-005; research.md §1 a §3.

## `app/(app)/instrutores/page.tsx`

### `renderizarListagemInstrutores_()` (existente — comportamento estendido)

- **Mudança**: a célula que hoje separa Posto/Graduação e Nome Completo em 2 `<td>` vira uma única
  `<td>` chamando `formatarNomeInstrutor_(i.Posto_Graduacao, i.Esp_Hab_Obs, i.Nome_Completo,
  i.Nome_Guerra, true)`. `colspan` da linha de "nenhum instrutor encontrado" muda de `7` para `6`.
- **Regras**: FR-001, FR-002; research.md §4.

### Cabeçalho da tabela de listagem (HTML estático, não função)

- **Mudança**: `<th>Posto/Graduação</th><th>Nome Completo</th>` vira `<th>Instrutor</th>`.
- **Regras**: FR-001.

### Seção "Vínculo de qualificação" + funções associadas (REMOVIDAS)

- **Removidos**: o bloco HTML da seção (`#formVinculo`, `#vincInstrutor`, `#vincGrade`,
  `#avisoVinculo`, botão "Qualificar"); as funções `carregarDisciplinasParaVinculo()` e
  `salvarVinculoHabilitacao()`; as 2 chamadas em `carregarInstrutores()`/boot que só existiam para
  alimentar essa seção.
- **Regras**: FR-006; research.md §5.

### `carregarInstrutores()` (existente — comportamento estendido)

- **Mudança**: o alvo do `.catch()` de erro de carregamento muda de `mostrarAvisoNivel2('avisoVinculo',
  ...)` (removido) para `mostrarAvisoNivel2('avisoListagemInstrutores', ...)` — novo contêiner de
  nível de página.
- **Regras**: FR-007; research.md §6.

### `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` (existente, spec 019 — comportamento estendido)

- **Mudança**: o texto do `<label>` do painel muda de "Atribuição de Disciplinas" para
  "Qualificação do Instrutor". Nenhum `id`/classe/seletor é alterado.
- **Regras**: FR-008; research.md §7.

## `lib/acoes/instrutores.ts`

### `criarVinculoHabilitacao(obj)` (REMOVIDA)

- **Removida**: zero chamador em ` ou `tests/` após a remoção do frontend correspondente
  (research.md §5) — código morto acessível via Server Action sem esta remoção.
- **Regras**: FR-006 (extensão natural da limpeza pedida); research.md §5.
