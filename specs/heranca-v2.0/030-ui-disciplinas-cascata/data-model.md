# Phase 1 Data Model: Módulo de Disciplinas — Cascata e Edição por Turma

Nenhuma entidade nova, nenhuma mudança de schema (FR-009). Esta spec é leitura/escrita pura sobre
entidades já existentes, via funções já existentes. Este documento descreve só a forma do
**estado local em memória** (variáveis JS), não uma tabela.

## Estado local — `app/(app)/disciplinas/page.tsx`

| Variável | Forma | Origem |
|---|---|---|
| `turmasDisciplinaCarregadas` | array de linhas de `turma_disciplina` filtradas por `ID_Turma` selecionado | `gs('crudListar', 'turma_disciplina')` |
| `vinculosInstrutorCarregados` | array de `instrutor_disciplina` filtrado `Status='Ativo'` | `gs('crudListar', 'instrutor_disciplina')` |
| `instrutoresCadastroCarregados` | array de `instrutores` | `gs('crudListar', 'instrutores')` |
| janela da turma selecionada | `{ dataInicio, dataTermino }` | `AppState.ctx.turmas` (já em memória, ``app/layout.tsx` + `lib/supabase/server.ts``) — nenhuma leitura nova |

## Entidades existentes referenciadas (sem alteração)

| Entidade | Campos usados | Uso |
|---|---|---|
| `turma_disciplina` (spec 027/029) | `ID_turma_disciplina`, `ID_Turma`, `ID_Grade`, `Nome_Disciplina`, `Previsao_Inicio`, `Previsao_Termino`, `ID_Instrutor` | Fonte da tabela por turma (FR-002) e do painel de edição (FR-004). |
| `instrutor_disciplina` | `ID_Grade`, `ID_Instrutor`, `Status` | Fonte dos checkboxes de instrutor **habilitado** (FR-004). |
| `instrutores` | `ID_Instrutor`, `Posto_Graduacao`, `Nome_Completo` | Rótulo de cada checkbox + resumo compacto da tabela (FR-003). |
| `AppState.ctx.turmas` (contexto já carregado) | `idTurma`, `idCurso`, `nome`, `dataInicio`, `dataTermino` | Popula o seletor de Turma (FR-001) e fornece a janela para a validação client-side (FR-006/007) — sem chamada nova. |

## Contrato reaproveitado (sem mudança) — `atualizarTurmaDisciplina`

Ver `specs/029-turma-disciplina-instrutor/contracts/backend-functions.md` — chamado como
`gs('atualizarTurmaDisciplina', idTurmaDisciplina, { Previsao_Inicio, Previsao_Termino,
ID_Instrutor })`, mesma assinatura, nenhuma mudança nesta spec.
