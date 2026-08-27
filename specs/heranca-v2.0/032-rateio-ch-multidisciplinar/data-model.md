# Data Model: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

## Entidades existentes envolvidas

### `turma_disciplina` — ALTERADA (aditiva)

Ganha `CH_Prevista_Por_Instrutor` (TEXTO, novo): pares `"ID_Instrutor:valor"` separados por
`", "`, um por instrutor presente em `ID_Instrutor` no momento do salvamento. Nasce vazio para as
~210 linhas já existentes (sem migração retroativa de valor). Sempre regravado por completo a cada
chamada de `atualizarTurmaDisciplina` que altere `ID_Instrutor` — nunca mesclado incrementalmente
com o valor anterior.

Campos já existentes reaproveitados sem mudança: `ID_turma_disciplina`, `ID_Turma`, `ID_Grade`,
`Previsao_Inicio`, `Previsao_Termino`, `ID_Instrutor`.

### `disciplinas` — leitura (primeiro consumidor real de 2 campos já existentes)

- `Modo_Atribuicao_Padrao` (ENUM `Dividido`/`Simultaneo`, já existente desde a migração, RN-MAT-05)
  — gatilho do filtro multidisciplinar (research.md §1).
- `Carga_Horaria_Tempos` (já existente) — base do cálculo de rateio (research.md §2).

### `instrutor_disciplina` — leitura (mesmo uso já existente, escopo de filtragem ampliado)

Sem coluna nova. O que muda é o critério de filtragem client-side: em vez de sempre `ID_Grade ===
<disciplina atual>`, passa a ser `ID_Grade ∈ <ID_Grades elegíveis>` — 1 elemento (disciplina atual)
no caso comum, todos os `ID_Grade` do curso no caso `Simultaneo`.

## Estrutura de transporte nova (só em memória)

### Parâmetro novo de `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes, dividirCargaHoraria)`

| Parâmetro | Tipo | Obrigatório | Efeito |
|---|---|---|---|
| `dividirCargaHoraria` | boolean | não (default falsy) | Quando `alteracoes.ID_Instrutor` está presente: `true` → divide `Carga_Horaria_Tempos` igualmente entre os instrutores de `ID_Instrutor` (resto no último); `false`/ausente → cada instrutor recebe a CH integral |

Retrocompatibilidade: chamada com 2 argumentos (assinatura anterior, spec 029) continua funcionando
— `dividirCargaHoraria` vira `undefined` → tratado como `false`, e se `alteracoes.ID_Instrutor`
também estiver ausente (ex. uma futura chamada que só altera período), `CH_Prevista_Por_Instrutor`
nem é recalculado.

## Função pura nova

### `calcularChPrevistaPorInstrutor_(idsInstrutorSelecionados, chTotalDisciplina, dividirCargaHoraria)`

Entrada: array de `ID_Instrutor` (na ordem selecionada), a CH total da disciplina (`Number`), e o
flag de divisão. Saída: string no formato de `turma_disciplina.CH_Prevista_Por_Instrutor`.

```
ids = idsInstrutorSelecionados (trim, sem vazios)
se ids.length === 0: retorna ''
se ids.length === 1 OU !dividirCargaHoraria: cada id recebe chTotal (CH integral)
senão (ids.length > 1 E dividirCargaHoraria):
  base = floor(chTotal / ids.length)
  resto = chTotal - base * ids.length
  os primeiros (length-1) ids recebem base; o último recebe base + resto
```

## Regra pura nova (frontend, sem estado de rede) — duplicada em 2 arquivos, mesmo padrão de `intervaloContidoEmClient_`

### `instrutoresElegiveis_(idGradeDisciplinaAtual, modoAtribuicaoPadrao, idGradesDoCurso, vinculosHabilitados)`

```
se modoAtribuicaoPadrao !== 'Simultaneo':
  candidatos = vinculosHabilitados filtrados por ID_Grade === idGradeDisciplinaAtual
senão:
  candidatos = vinculosHabilitados filtrados por ID_Grade ∈ idGradesDoCurso
retorna candidatos deduplicados por ID_Instrutor (1 checkbox por instrutor, mesmo habilitado a
  mais de 1 disciplina do curso)
```
