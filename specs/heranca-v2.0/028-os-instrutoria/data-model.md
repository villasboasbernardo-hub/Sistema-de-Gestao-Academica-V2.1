# Phase 1 Data Model: Módulo Gerador de O.S. de Instrutoria

Nenhuma entidade de schema nova (FR-013) — leitura pura sobre entidades já existentes. Este
documento descreve a estrutura de **saída em memória** de `calcularOsInstrutoria`, não uma tabela.

## Entrada — `filtros`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `modalidade` | `'Curso'` \| `'Periodo'` | Sim | Qual dos 2 modos de filtro está ativo. |
| `idCurso` | TEXTO | Só se `modalidade === 'Curso'` | `ID_Curso` selecionado (achado real: é a própria sigla). |
| `ano` | INTEIRO | Só se `modalidade === 'Periodo'` | Ano do recorte. |
| `tipoRecorte` | `'Trimestre'` \| `'Semestre'` | Só se `modalidade === 'Periodo'` | Qual granularidade de período. |
| `numeroRecorte` | INTEIRO (1-4 se Trimestre, 1-2 se Semestre) | Só se `modalidade === 'Periodo'` | Qual trimestre/semestre. |

## Saída — array de nós de instrutor

```text
[
  {
    idInstrutor: string,
    postoGraduacao: string,       // instrutores.Posto_Graduacao, cru
    nip: string,                  // instrutores.NIP
    nomeCompleto: string,         // instrutores.Nome_Completo, cru — sem formatarNomeInstrutor_
    tecnicoEnsino: 'SIM' | 'NÃO', // Capacitacao_Didatica não-vazia (trim) => SIM
    disciplinas: [
      {
        idGrade: string,
        disciplina: string,       // disciplinas.Nome_Disciplina
        curso: string,            // disciplinas.ID_Curso (= sigla, achado real)
        inicio: string,           // 'YYYY-MM-DD', menor Data no recorte para (idInstrutor, idGrade)
        termino: string,          // 'YYYY-MM-DD', maior Data no recorte para (idInstrutor, idGrade)
      },
      ...
    ],
  },
  ...
]
```

**Ordenação**: array de instrutor ordenado por `Antiguidade_Declarada` ascendente (RN-ANT-01,
research.md § 5). Array `disciplinas` de cada instrutor: ordem de primeira ocorrência nos registros
lidos (sem critério adicional pedido).

**Invariantes**:
- Todo instrutor no array tem `disciplinas.length >= 1` (FR-008 — instrutor sem aula realizada no
  recorte nunca aparece).
- `inicio <= termino` sempre, por construção (mín/máx do mesmo conjunto de datas).
- Nenhum campo é `undefined`/`null` no nível do nó de instrutor — `nip`/`postoGraduacao` degradam
  para string vazia se ausentes em `instrutores` (RN-DEG-01), nunca lançam exceção.

## Entidades existentes referenciadas (sem alteração)

| Entidade | Campos usados | Uso |
|---|---|---|
| `registros_aula` | `Data`, `ID_Turma`, `ID_Grade`, `ID_Instrutor`, `Categoria_Normativa` | Fonte de aula realizada (filtro `Categoria_Normativa==='Aula'`). |
| `instrutores` | `ID_Instrutor`, `Posto_Graduacao`, `NIP`, `Nome_Completo`, `Capacitacao_Didatica`, `Antiguidade_Declarada` | Dados cadastrais do nó pai + ordenação. |
| `disciplinas` | `ID_Grade`, `ID_Curso`, `Nome_Disciplina` | Resolve nome da disciplina + curso a partir de `ID_Grade`. |
| `turmas` | `ID_Turma`, `Status` | Exclui turma `Cancelada` dos 2 modos. |
