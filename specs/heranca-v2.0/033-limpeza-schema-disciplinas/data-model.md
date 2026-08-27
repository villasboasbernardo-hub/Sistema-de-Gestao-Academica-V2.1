# Data Model: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

## Entidades existentes envolvidas

### `disciplinas` — ALTERADA (remoção, nunca aditiva)

Perde 3 colunas, todas confirmadas sem consumidor real (Achados reais, spec.md):

| Coluna removida | Motivo |
|---|---|
| `Instrutores_Selecionados` | FORMULA quebrada (`#ERROR!` na banco de produção); `contarSelecionadosDistintos_` (`lib/acoes/instrutores.ts`) já lê exclusivamente `ID_Instrutor`, nunca esta coluna |
| `Tecnica_Ensino_Sugerida` | Órfã desde a spec 031 — nenhuma UI edita, nenhum leitor restante em `src/` |
| `Local_Padrao` | Mesma situação de `Tecnica_Ensino_Sugerida` |

Permanecem **intocadas** (fora de escopo, FR-006): `ID_Grade`, `ID_Curso`, `ID_Disciplina`,
`Cod_Disciplina`, `Nome_Disciplina`, `ID_Instrutor`, `Carga_Horaria_Tempos`, `Ordem_Sugerida`,
`Previsao_Inicio`, `Previsao_Termino`, `CH_Semanal`, `Semanas`, `Status`, `Modo_Atribuicao_Padrao`.

### `turma_disciplina` — sem mudança de schema

Passa a ser **efetivamente consultada** (não só semeada a partir de) por
`getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina`. Campos usados: `ID_Turma`,
`ID_Grade`, `Previsao_Inicio`, `Previsao_Termino` (já existentes desde a spec 027).

## Função pura nova

### `resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade)`

Entrada: a linha de `turma_disciplina` correspondente (ou `undefined`/`null` se não existir) e a
linha de `disciplinas` da mesma disciplina. Saída: `{ inicio, termino }`.

```
se linhaTurmaDisciplina existe E tem Previsao_Inicio E Previsao_Termino preenchidos:
  retorna { inicio: linhaTurmaDisciplina.Previsao_Inicio, termino: linhaTurmaDisciplina.Previsao_Termino }
senão:
  retorna { inicio: disciplinaGrade?.Previsao_Inicio || null, termino: disciplinaGrade?.Previsao_Termino || null }
```

Par tratado atomicamente — nunca mistura início de uma fonte com término de outra (research.md §2).

## Funções ajustadas (mesma assinatura e formato de retorno, só a origem do dado de período muda)

### `getDisciplinasDaTurmaComRitmo(idTurma)`
Ganha 1 leitura adicional (`turma_disciplina` filtrada por `idTurma`, indexada por `ID_Grade`) e usa
`resolverPeriodoEfetivo_` para alimentar `calcularRitmoDisciplina_` em vez de ler
`disciplinas.Previsao_Inicio/Termino` diretamente.

### `getCronogramaGlobalDisciplina(idGrade, idTurma)`
Ganha 1 leitura adicional (`turma_disciplina` filtrada por `ID_Grade`+`ID_Turma`, no máximo 1 linha)
e usa `resolverPeriodoEfetivo_` para `previsaoInicio`/`previsaoTermino` do retorno, em vez de ler
`disciplinas.Previsao_Inicio/Termino` diretamente.
