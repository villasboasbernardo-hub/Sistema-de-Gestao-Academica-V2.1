# Phase 1 Data Model: Seleção de Instrutor por Turma e Validação de Janela

Nenhuma entidade nova. Uma coluna aditiva numa entidade já existente (`turma_disciplina`, spec
027). `cursos`, `turmas`, `disciplinas`, `instrutor_disciplina` permanecem
inalteradas (FR-007/FR-010).

## `turma_disciplina` — coluna nova

| Coluna | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `ID_Instrutor` | TEXTO (CSV de `ID_Instrutor`) | Não | **Nova.** Instrutor(es) efetivamente selecionado(s) para ministrar esta disciplina **nesta turma específica** — distinto de `instrutor_disciplina` (qualificação). Semeado da grade (`disciplinas.ID_Instrutor` correspondente ao mesmo `ID_Grade`) na migração; editável depois pelo painel de período. Mesma convenção de `disciplinas.ID_Instrutor` (texto separado por vírgula). |

Nenhuma outra coluna de `turma_disciplina` muda (`ID_turma_disciplina, ID_Turma, ID_Curso, ID_Grade,
Cod_Disciplina, Nome_Disciplina, Previsao_Inicio, Previsao_Termino, Origem_Periodo, Status,
Registrado_Por, Timestamp_Registro, Editado_Por, Timestamp_Edicao, Origem_Migracao_v1`).

## Regra de validação (não é entidade, é comportamento de `atualizarTurmaDisciplina`)

Antes de gravar `Previsao_Inicio`/`Previsao_Termino` de uma linha de `turma_disciplina`:

```text
turma = turmas onde ID_Turma == linha.ID_Turma
efetivoInicio = alteracoes.Previsao_Inicio ?? linha.Previsao_Inicio (atual)
efetivoTermino = alteracoes.Previsao_Termino ?? linha.Previsao_Termino (atual)

SE intervaloContidoEm_(efetivoInicio, efetivoTermino, turma.Data_Inicio, turma.Data_Termino) == false:
  BLOQUEIA — Error citando turma.Data_Inicio/Data_Termino reais
SENÃO:
  grava via crudAtualizar('turma_disciplina', id, alteracoes)
```

`intervaloContidoEm_` degrada para `true` (permite gravar) quando qualquer um dos 2 intervalos está
incompleto — nunca bloqueia por dado ausente em outra aba (RN-DEG-01, FR-006).

## Entidades existentes referenciadas (sem alteração)

| Entidade | Campos usados | Uso |
|---|---|---|
| `instrutor_disciplina` | `ID_Grade`, `ID_Instrutor`, `Status` | Fonte da lista de instrutores **habilitados** exibida como checkbox no painel (FR-003) — só `Status='Ativo'`. |
| `instrutores` | `ID_Instrutor`, `Nome_Completo` (ou nome formatado no cliente) | Rótulo de cada checkbox. |
| `disciplinas` | `ID_Grade`, `ID_Instrutor` | Semente da migração (FR-002) — nunca mais lida em tempo de execução para este propósito depois da migração. |
| `turmas` | `ID_Turma`, `Data_Inicio`, `Data_Termino` | Janela contra a qual `intervaloContidoEm_` valida (FR-005/FR-006). |
