# Data Model — Hotfix Tratamento de Erro em Leituras

Nenhuma entidade de dados nova ou alterada — esta spec é inteiramente sobre tratamento de erro no
front-end (spec.md, Key Entities: "Não aplicável"). Este documento registra o único mapeamento
relevante: função afetada → mecanismo de aviso → destino.

## US1 — 11 funções, `alert()`

**Correção (achada durante `/speckit-implement`)**: esta tabela tinha só 10 linhas — faltava
`carregarCursosVinculados`, que já estava na tabela de `spec.md` §"Contexto e achados" desde o
`/speckit.specify` (15 funções ali, não 14) mas foi derrubada por engano ao transcrever para este
documento. Corrigida aqui; `tasks.md` (T006b) e `spec.md` também corrigidos.

| Arquivo | Função |
|---|---|
| `app/(app)/avaliacoes/page.tsx` | `aoTrocarTurmaAvaliacao` |
| `app/(app)/avaliacoes/page.tsx` | `carregarPainelavaliacoes` |
| `app/(app)/cronograma/page.tsx` | `garantirNomesInstrutores_` |
| `app/(app)/cursos/[curso]/page.tsx` | `renderizarDetalheCurso` |
| `app/(app)/cursos/[curso]/page.tsx` | `aoTrocarTurmaCurso` |
| `app/(app)/cursos/[curso]/page.tsx` | `aoClicarCardDisciplina` |
| `app/(app)/cursos/[curso]/page.tsx` | `aoTrocarTurmaEstudoIndividual` |
| `app/(app)/disciplinas/page.tsx` | `carregarDisciplinas` |
| `app/(app)/disciplinas/page.tsx` | `carregaravaliacoesPlanejadas` |
| `app/(app)/relatorio/page.tsx` | `carregarTotalizadoresCurso` |
| `app/(app)/admin/usuarios/page.tsx` | `carregarCursosVinculados` |

## US2 — 4 funções, `mostrarAvisoNivel2(containerId, mensagem)`

| Arquivo | Função | `containerId` |
|---|---|---|
| `app/(app)/avaliacoes/page.tsx` | `popularFiscalVistaProva` | `avisoVistaProva` |
| `app/(app)/instrutores/page.tsx` | `carregarInstrutores` | `avisoInstrutor` |
| `app/(app)/instrutores/page.tsx` | `carregarDisciplinasParaVinculo` | `avisoVinculo` |
| `app/(app)/admin/usuarios/page.tsx` | `carregarusuarios` | `avisoUsuario` |

Mensagem em todos os 4: mesmo texto de erro já usado no padrão `alert()` do projeto —
`e && e.message ? e.message : e` — só o mecanismo de exibição muda (banner em vez de modal),
research.md §2.
