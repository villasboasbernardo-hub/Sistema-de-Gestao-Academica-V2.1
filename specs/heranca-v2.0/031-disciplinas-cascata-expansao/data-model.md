# Data Model: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

Nenhuma entidade nova, nenhuma coluna nova em nenhuma aba. Esta spec só amplia o que já é lido/
exposto sobre entidades existentes.

## Entidades existentes envolvidas (somente leitura, exceto onde indicado)

### `disciplinas` (leitura + escrita já existente)
Campos usados por esta spec: `ID_Grade`, `ID_Curso`, `Cod_Disciplina` (novo NA UI, já existe na
aba), `Nome_Disciplina`, `Carga_Horaria_Tempos`, `Status`, `ID_Instrutor` (legado — ver research.md
§2). Escrita inalterada: `atualizarDisciplina`/`definirPrioridadeDisciplina`.

### `turmas` (leitura)
Campos usados: `ID_Turma`, `ID_Curso`, `Nome_Completo_Curso` (fallback de degradação), `Turma`
(cru — **novo consumidor**, já existe na aba), `Ano_Letivo` (cru — **novo consumidor**, já existe
na aba), `Data_Inicio`, `Data_Termino`, `Status`.

### `turma_disciplina` (leitura + escrita já existente, spec 027/029)
Campos usados: `ID_turma_disciplina`, `ID_Turma`, `ID_Grade`, `Nome_Disciplina`, `Previsao_Inicio`,
`Previsao_Termino`, `ID_Instrutor` (seleção real por turma — fonte de verdade, ver research.md §2).
Escrita inalterada: `atualizarTurmaDisciplina`.

### `instrutor_disciplina` / `instrutores` (leitura já existente)
Sem mudança — mesmo uso já feito pela spec 030 (habilitação + dados cadastrais para o painel de
edição e o resumo compacto de instrutores).

### `registros_aula` (leitura já existente)
Sem coluna nova consumida — mesma agregação por `Tempos_Consumidos`/`ID_Grade`/`ID_Turma` já usada
por `getDisciplinasDaTurmaComRitmo` (CH Cumprida) e, agora, também por
`getEstatisticasDisciplinas(filtros)` quando `filtros.idTurma` está presente (research.md §1/§5).

## Estruturas de transporte (novas, só em memória — nenhum schema de planilha)

### `AppState.ctx.turmas[i]` (`app/layout.tsx` + `lib/supabase/server.ts`) — ALTERADA (aditiva)

| Campo | Tipo | Novo? | Origem |
|---|---|---|---|
| `idTurma` | string | não | `turmas.ID_Turma` |
| `idCurso` | string | não | `turmas.ID_Curso` |
| `nome` | string | não | `turmas.Nome_Completo_Curso` (fallback de degradação) |
| `status` | string | não | `turmas.Status` |
| `dataInicio` | string (ISO) | não | `turmas.Data_Inicio` |
| `dataTermino` | string (ISO) | não | `turmas.Data_Termino` |
| `turma` | string | **sim** | `turmas.Turma` (`"T1"`/`"T2"`/`""`) |
| `anoLetivo` | string | **sim** | `turmas.Ano_Letivo` (ex. `"2026"`) |

### `getEstatisticasDisciplinas(filtros)` — parâmetro novo (retrocompatível)

| Campo de `filtros` | Tipo | Obrigatório | Efeito |
|---|---|---|---|
| `idCurso` | string | não | Restringe `disciplinas` a esse `ID_Curso` antes de agregar |
| `idTurma` | string | não | Restringe `registros_aula` a esse `ID_Turma` (CH Cumprida/status/ritmo) e troca a fonte de `semInstrutor` para `turma_disciplina.ID_Instrutor` (research.md §2) |

Retorno: mesma forma já existente (`{ kpis: {total, concluidas, atrasadas, semInstrutor}, porStatus:
[{status, quantidade}] }`) — nenhum campo novo no retorno, só o escopo dos dados agregados muda.

## Regra pura nova (frontend, sem estado de rede)

### `rotuloTurma_(turmasDoMesmoAnoLetivo, turma)`

Entrada: array de turmas do mesmo `idCurso`+`anoLetivo` (já filtrado) e a turma-alvo. Saída: string
do label do `<option>`.

```
se turmasDoMesmoAnoLetivo.length === 1: "Turma " + anoLetivo
senão: "Turma " + NN + "/" + anoLetivo, onde NN = dígitos de `turma.turma` com padStart(2,'0')
se anoLetivo vazio: retorna turma.nome (degradação, RN-DEG-01)
```
