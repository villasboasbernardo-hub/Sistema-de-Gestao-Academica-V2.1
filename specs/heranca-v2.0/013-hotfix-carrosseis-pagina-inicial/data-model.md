# Data Model — Hotfix Carrosséis Fixos da Página Inicial

Nenhuma entidade nova, nenhuma coluna nova, nenhuma mudança de schema físico
(`docs/arquitetura/01-schema.md` permanece inalterado por este hotfix).

## Entidades existentes tocadas (só leitura, sem alteração de estrutura)

### `Curso` (`cursos`, via `AppState.ctx.cursos`)

Já documentada em `01-schema.md` §5.1 e consumida por `getContextoInicial` desde o Épico 009. Este
hotfix não adiciona nem remove nenhum campo — só muda **quais** cursos a Página Inicial exibe (todos,
não só os com turma em destaque) e **como** agrupa/ordena/renderiza.

| Campo usado por este hotfix | Uso |
|---|---|
| `idCurso` | Chave de agrupamento (já usada) e de navegação no clique (já usada, inalterada). |
| `classificacao` | Chave de mapeamento para uma das 5 categorias fixas (FR-003) — cursos com valor fora do domínio fechado de 5 (achado 5 de `spec.md`) não entram em nenhuma das 5 seções (Edge Case). |
| `nome`, `duracaoSemanas` | Já usados no cartão hoje; continuam sendo os únicos campos exibidos quando não há turma em destaque (FR-006), mesmo conjunto que `app/(app)/cursos/[curso]/page.tsx` já usa. |

### `Turma em destaque` (`AppState.ctx.turmasEmDestaque`, resolvida por `resolverTurmaEmDestaque_`)

Já existente, nenhuma mudança na lógica de resolução (fora de escopo, ver `spec.md`). Passa a ser
tratada como informação **opcional** do cartão (nome da turma, status, progresso) — nunca mais como
pré-condição para o curso aparecer.

## Estrutura em memória nova (front-end, não persistida)

`CATEGORIAS_PAINEL_INICIO` (constante, `app/(app)/inicio/page.tsx`) — as 5 categorias fixas, na ordem exigida
por FR-003:

```js
[
  { classificacao: 'Regular', titulo: 'Cursos Regulares' },
  { classificacao: 'Especial', titulo: 'Cursos Especiais' },
  { classificacao: 'Expedito', titulo: 'Cursos Expeditos' },
  { classificacao: 'Aperfeiçoamento Avançado', titulo: 'Cursos de Aperfeiçoamento Avançado' },
  { classificacao: 'Estágio de Qualificação', titulo: 'Estágios de Qualificação' },
]
```

`montarCarrosseisPainelInicio_(cursos, turmasEmDestaque)` (nova função pura, `app/(app)/inicio/page.tsx`) —
recebe os dois arrays/objeto já existentes em `AppState.ctx` (inalterados por este hotfix) e devolve
sempre um array de 5 elementos, um por categoria fixa, nesta forma:

```js
[
  {
    classificacao: 'Regular',
    titulo: 'Cursos Regulares',
    comDestaque: [ { curso, destaque }, ... ],  // ordem natural do array de entrada
    semDestaque: [ { curso }, ... ],            // ordem natural do array de entrada
  },
  // ... as outras 4 categorias, mesma forma, arrays vazios quando não há curso
]
```

Não é persistido em nenhuma aba — é a forma intermediária que `renderizarPainelInicio()` consome para
decidir, por seção: renderizar os cartões (`comDestaque` seguido de `semDestaque`, FR-008) ou a
mensagem de vazio "Nenhum curso cadastrado nesta modalidade" quando as duas listas estão vazias
(FR-004).
