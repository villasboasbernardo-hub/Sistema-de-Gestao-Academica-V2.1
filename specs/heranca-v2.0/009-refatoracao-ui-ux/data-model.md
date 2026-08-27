# Data Model — Refatoração UI/UX e Conformidade de Dados

Uma única alteração física de schema (DISC-1, aprovada nas Clarifications); o resto é composição de
tela e agregações em memória sobre entidades já existentes — nenhuma outra tabela nova.

## `disciplinas` — 2 colunas aditivas (DISC-1)

| Coluna | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `Tecnica_Ensino_Sugerida` | TEXTO | Não | T/E sugerida para a disciplina (rascunho §7) — texto livre, sem domínio fechado nesta rodada |
| `Local_Padrao` | TEXTO | Não | Local de instrução padrão da disciplina (rascunho §7) — texto livre |

Aditivas e opcionais (convenção C-10) — `crudCriar`/`crudAtualizar` já são *header-driven* e não
exigem nenhuma mudança de código para reconhecer as colunas novas assim que existirem fisicamente
na aba.

## Forma derivada — "turma em destaque" (FR-004), nunca persistida

Não é uma entidade nova nem uma coluna nova — é a forma do objeto que `getContextoInicial` passa a
devolver dentro de `ctx`, calculada a cada boot a partir de `turmas` já existente:

```js
ctx.turmasEmDestaque = {
  // chave = ID_Curso
  "CAHO": { idTurma: "T-2026-01", nome: "CAHO 2026", status: "Ativa", progresso: 0.42 },
  // curso sem nenhuma turma em destaque resolvível: chave ausente (nunca null/undefined explícito)
};
```

`progresso` reaproveita o mesmo cálculo de CH executada ÷ CH total já usado por
`totalizadoresDaTurma_`/`getCronograma` — não é um novo campo de dado, é o resultado de uma consulta
já existente, só anexado a este objeto de leitura.

## Forma derivada — indicador de ritmo de disciplina (FR-008), nunca persistida

Resultado de `calcularRitmoDisciplina_` (`lib/acoes/cronograma.ts`, research.md achado 4) — string
`'Atrasada'|'No Prazo'|'Adiantada'`, calculada sob demanda ao renderizar o cartão expandido de uma
disciplina, nunca gravada em nenhuma aba.

## Nenhuma outra entidade nova

Cartões, carrossel, sidebar e os 4 painéis de estatística (`lib/acoes/estatisticas.ts`) leem e agregam dados
já modelados (`cursos`, `turmas`, `disciplinas`, `registros_aula`,
`avaliacoes`, `instrutores`) — nenhum deles grava nada novo.
