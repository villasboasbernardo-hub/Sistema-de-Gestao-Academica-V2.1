# Data Model — Arquitetura de Navegação com Estado Centralizado (AppState)

Nenhuma entidade de domínio nova, nenhuma mudança de schema físico
(`docs/arquitetura/01-schema.md` permanece inalterado). Toda esta spec é estado de front-end, em
memória do navegador — não persiste em nenhuma aba.

## `AppState.cache` (novo)

Objeto simples `{chave: dado}`, existente só durante a sessão do navegador (research.md §1).

| Chave | Tipo do valor | Populada por | Consumida por |
|---|---|---|---|
| `estatisticasCursoTurma` | `{ cursos: <retorno de getEstatisticasCursos()>, turmas: <retorno de getEstatisticasTurmas()> }` | `carregarEstatisticasCursoTurma()` (`app/(app)/cursos/[curso]/page.tsx`) | `alternarEstatisticasCurso()` (mesmo arquivo) |
| `estatisticasDisciplinas` | retorno de `getEstatisticasDisciplinas()` | `carregarEstatisticasDisciplinas()` (`app/(app)/disciplinas/page.tsx`) | `alternarEstatisticasDisciplinas()` (mesmo arquivo) |
| `estatisticasInstrutores` | retorno de `getEstatisticasInstrutores()` | `carregarEstatisticasInstrutores()` (`app/(app)/instrutores/page.tsx`) | `alternarEstatisticasInstrutores()` (mesmo arquivo) |

Nenhum campo dessas três chaves muda de forma — são exatamente os mesmos objetos que
`getEstatisticasCursos`/`getEstatisticasTurmas`/`getEstatisticasDisciplinas`/
`getEstatisticasInstrutores` (`lib/acoes/estatisticas.ts`, Épico 009) já retornam hoje. Esta spec
só muda *onde* o resultado fica guardado entre uma abertura e outra do painel (antes: variável local
+ flag booleana da própria view; agora: `AppState.cache`).

## Gatilhos de invalidação (FR-004, research.md §4)

| Chave invalidada | Disparada por | Arquivo |
|---|---|---|
| `estatisticasCursoTurma` | (nenhum gatilho real hoje — `cursos`/`turmas` não têm escrita em app, spec.md FR-004) | — |
| `estatisticasDisciplinas` | sucesso de `atualizarDisciplina`, `definirPrioridadeDisciplina` | `app/(app)/disciplinas/page.tsx` |
| `estatisticasDisciplinas` | sucesso de `salvarLancarAula` (sempre `Aula`), `excluirBlocoDsa` (qualquer bloco não-`AVA-`/`EXT-`) | `app/(app)/turmas/[turma]/dsa/page.tsx` (cross-file — achado do `/speckit-clarify`) |
| `estatisticasInstrutores` | sucesso de `cadastrarInstrutor`, `atualizarInstrutor`, `desativarInstrutor` | `app/(app)/instrutores/page.tsx` |

## `AppState._listeners` (novo, interno a `onChange()`)

Objeto `{chave: [callback, ...]}` — nunca lido/escrito fora de `invalidar()`/`onChange()` em si.
Sem consumidor real nesta spec (research.md §1) — infraestrutura pronta, testada isoladamente.
