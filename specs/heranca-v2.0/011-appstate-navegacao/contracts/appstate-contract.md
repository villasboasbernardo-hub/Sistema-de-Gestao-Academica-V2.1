# Contrato — API pública do `AppState` (Épico D)

Não há contrato de função de backend nesta spec (nenhum arquivo `.ts` é tocado — FR-004 só adiciona
chamadas de `AppState.invalidar(...)` no front-end, depois que uma função de backend já existente
resolve com sucesso). O contrato real é a API pública de `AppState`, em `components/ciaara/`, e os pontos
onde cada view a consome.

## `AppState` — membros novos (assinatura, `components/ciaara/`)

### `AppState.cache` (objeto, não função)

Leitura direta: `AppState.cache['<chave>']` — `undefined` significa "nunca buscado ou invalidado
desde a última busca", qualquer outro valor é o dado já buscado (data-model.md, FR-001).

### `AppState.invalidar(chaves)`

- **Parâmetro**: `chaves` — string (uma chave), array de strings (várias chaves), ou o literal
  `"*"` (todas as chaves atualmente em cache).
- **Retorno**: nenhum (efeito colateral: remove a(s) chave(s) de `AppState.cache`, dispara
  `onChange` registrados).
- **Regras**: FR-001. Invalidar uma chave nunca populada é no-op seguro (não lança exceção).

### `AppState.onChange(chave, callback)`

- **Parâmetros**: `chave` — string; `callback` — função sem argumentos, chamada toda vez que
  `invalidar()` remover aquela chave.
- **Retorno**: nenhum.
- **Regras**: FR-002. Múltiplos `onChange` na mesma chave se acumulam (todos são chamados, nenhum
  substitui o anterior). Sem consumidor real nesta spec (research.md §1) — testado isoladamente.

## `AppState` — membro removido

`registrarRota`/`ROTAS`/`ROTAS[hash]` saem de `components/ciaara/` por completo (FR-006). `irPara(hash)`
não muda de assinatura nem de comportamento.

## Views — pontos de consumo (leitura/escrita de `AppState.cache`)

| View | Função que lê/escreve `AppState.cache` | Chave | Gatilho de invalidação (mesma view, salvo indicado) |
|---|---|---|---|
| `app/(app)/cursos/[curso]/page.tsx` | `alternarEstatisticasCurso`/`carregarEstatisticasCursoTurma` | `estatisticasCursoTurma` | nenhum hoje (spec.md FR-004, achado) |
| `app/(app)/disciplinas/page.tsx` | `alternarEstatisticasDisciplinas`/`carregarEstatisticasDisciplinas` | `estatisticasDisciplinas` | `atualizarDisciplina`, `definirPrioridadeDisciplina` (mesma view); `salvarLancarAula`, `excluirBlocoDsa` (`app/(app)/turmas/[turma]/dsa/page.tsx`, cross-file) |
| `app/(app)/instrutores/page.tsx` | `alternarEstatisticasInstrutores`/`carregarEstatisticasInstrutores` | `estatisticasInstrutores` | `cadastrarInstrutor`, `atualizarInstrutor`, `desativarInstrutor` (mesma view) |

Nenhuma função de backend (`lib/acoes/estatisticas.ts`, `lib/acoes/disciplinas.ts`, `lib/acoes/instrutores.ts`, `lib/acoes/dsa.ts`) muda de
assinatura ou de comportamento — o único ponto novo em cada uma dessas views/funções é a chamada a
`AppState.invalidar('<chave>')` dentro do `.then(...)` de sucesso, sem alterar o que já é enviado ao
backend.
