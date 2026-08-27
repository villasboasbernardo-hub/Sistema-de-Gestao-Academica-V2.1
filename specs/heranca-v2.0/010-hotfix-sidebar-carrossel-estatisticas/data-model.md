# Data Model — Hotfix Sidebar/Carrossel/Estatísticas

Nenhuma entidade nova, nenhuma coluna nova, nenhuma mudança de schema físico
(`docs/arquitetura/01-schema.md` permanece inalterado por este hotfix).

## Entidade existente tocada (só leitura, sem alteração de estrutura)

### `Curso` (`cursos`)

Já documentada em `01-schema.md` §5.1 e consumida por `getContextoInicial`/`getEstatisticasCursos`
desde o Épico 009. Este hotfix não adiciona nem remove nenhum campo — só muda **como** as linhas são
agrupadas/ordenadas/deduplicadas antes de chegar ao front-end ou ao painel de estatísticas:

| Campo usado por este hotfix | Uso |
|---|---|
| `ID_Curso` | Chave de deduplicação (FR-006) — "primeira linha encontrada" na ordem de leitura do banco vence quando o mesmo `ID_Curso` aparece mais de uma vez. |
| `Classificacao` | Agrupamento já existente (Épico 009), inalterado. |
| (nenhum campo novo) | — |

## Estrutura em memória (front-end, não persistida)

`agruparCursosParaPagina_(cursos, turmasEmDestaque)` (nova função pura, `app/(app)/cursos/[curso]/page.tsx`) — recebe os
dois arrays já existentes em `AppState.ctx` (`cursos`, `turmasEmDestaque`, ambos inalterados por este
hotfix) e devolve, por classificação:

```
{
  [classificacao]: {
    comDestaque: [curso, ...],   // ordem natural do array de entrada
    semDestaque: [curso, ...],   // ordem natural do array de entrada
  },
  ...
}
```

Não é persistido em nenhuma aba — só uma forma intermediária usada por `popularCursos()` para renderizar
os dois subgrupos dentro do carrossel de cada classificação (FR-003/004).
