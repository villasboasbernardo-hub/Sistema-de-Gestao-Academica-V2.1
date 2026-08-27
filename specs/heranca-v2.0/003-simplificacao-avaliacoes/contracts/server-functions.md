# Contrato — Funções de servidor expostas ao frontend (Épico I)

Mesma convenção do Épico E: toda função chamada via Server Action (chamada direta, tipada) é síncrona
do ponto de vista do chamador, lança `Error` com mensagem amigável em validação falha (RN-DEG-01),
e recebe um único objeto de entrada.

## `registrarAvaliacao(obj)` — ALTERADA (contrato mudou: agendamento, sem consumo de TA)

**Arquivo**: `lib/acoes/avaliacoes.ts`

**Entrada**:
```text
{
  ID_Turma: string, ID_Grade: string, Tipo_Avaliacao: string, Data_Avaliacao: string (ISO),
  ID_Instrutor_Responsavel: string,  // obrigatório — exige habilitação (ver Erros)
  Local: string, Observacoes: string,
  // Tempos_Consumidos e TA_Inicial NÃO são mais aceitos aqui (research.md, achado 0) —
  // pertencem a aplicarAvaliacaoNoDsa.
}
```

**Saída**: `{ registro: { ID_Avaliacao: string, ...campos gravados } }` — **sem** `chdAtualizada`
(agendar não altera CHD, FR-001).

**Erros**: `"Preencha turma, matéria, tipo e data da avaliação."`, `"Turma não encontrada"`,
`"Matéria não encontrada"`, `"A matéria não pertence ao curso da turma"`, `"Informe o instrutor
responsável."`, `"O instrutor responsável não está habilitado nesta disciplina."` (restaura a
validação de V1.0 que o Épico E removeu por engano, research.md achado 1).

**RN/FR**: RN-INST-01, RN-AVAL-02 revisada, FR-001, FR-013.

---

## `aplicarAvaliacaoNoDsa(obj)` — NOVA

**Arquivo**: `lib/acoes/avaliacoes.ts`

**Entrada**:
```text
{
  ID_Avaliacao: string,        // obrigatório — identifica o lançamento a atualizar
  TA_Inicial: number, Tempos_Consumidos: number,  // obrigatórios, > 0
  Local: string,                // opcional
}
```

**Saída**:
```text
{ registro: { ID_Avaliacao: string, ...campos gravados, Status: "Concluida" }, chdAtualizada: number }
```

**Erros**: `"Avaliação não encontrada: {id}"`, `"Informe quantos tempos (TAs) esta avaliação
consumiu."`, `"Informe o TA inicial da avaliação."`. Sem checagem de habilitação (já feita no
agendamento).

**RN/FR**: RN-AVAL-02 revisada, RN-EVT-03, FR-002, FR-003, FR-007.

---

## `registrarVistaProva(obj)` — NOVA (inalterada em relação à versão anterior deste contrato)

**Arquivo**: `lib/acoes/avaliacoes.ts`

**Entrada**:
```text
{
  ID_Avaliacao: string,          // obrigatório — identifica o lançamento a atualizar
  Data_Vista_Prova: string (ISO), TA_Inicial_Vista: number, Tempos_Consumidos_Vista: number,  // obrigatórios
  Local_Vista: string,           // opcional
  ID_Fiscal: string,             // opcional — instrutor cadastrado, SEM exigência de habilitação
  Nome_Fiscal_Externo: string,   // opcional — pessoa fora do cadastro de instrutores
  // ID_Fiscal e Nome_Fiscal_Externo são mutuamente exclusivos
}
```

**Saída**:
```text
{ registro: { ID_Avaliacao: string, ...campos de vista gravados }, chdAtualizada: number }
```

**Erros**: `"Avaliação não encontrada: {id}"`, `"Esta avaliação ainda não foi aplicada no DSA."`
(se `TA_Inicial` vazio — FR-014 exige a aplicação já ter acontecido), `"Informe a data, o TA
inicial e os tempos consumidos pela vista."`, `"Informe o fiscal (cadastrado ou externo)."`,
`"Informe apenas um fiscal — cadastrado OU externo, não os dois."`. **Nunca** valida habilitação
do fiscal (RN-INST-01 delimitada).

**RN/FR**: RN-INST-01 delimitada, RN-EVT-03, FR-011, FR-012, FR-014.

---

## `getPainelavaliacoesCurso(idCurso)` — NOVA

**Arquivo**: `lib/acoes/avaliacoes.ts` (núcleo puro `painelavaliacoesCurso_` + wrapper de I/O)

**Entrada**: `idCurso: string`

**Saída**: formato "Resultado agregado" em `data-model.md`.

**RN/FR**: RN-AVAL-01 revisada, RN-AVAL-02 revisada, FR-004, FR-005, FR-006, FR-007, FR-009, FR-010.

---

## `cancelarAvaliacao(idAvaliacao)` — NOVA

**Arquivo**: `lib/acoes/avaliacoes.ts` (usa `crudExcluir` de `lib/acoes/crud.ts`)

**Entrada**: `idAvaliacao: string`

**Saída**: `{ ok: true }`

**Erros**: `"Avaliação não encontrada: {id}"`.

**RN/FR**: C-05 (exclusão lógica, nunca física), FR-007.

---

## `getDsaSemanal(idTurma, semana)` — ALTERADA

**Arquivo**: `lib/acoes/dsa.ts`

**Saída (acrescenta)**: campo `avaliacoesAgendadasNaSemana` — formato em `data-model.md`, "Sugestão
de aplicação na prévia do DSA". Nenhuma mudança nos campos já existentes (`lancamentosDaSemana`,
`totalizadores`).

**RN/FR**: RN-AVAL-02 revisada, FR-002.

---

## `crudExcluir(nomeAba, idColuna, idValor)` — NOVA (genérica)

**Arquivo**: `lib/acoes/crud.ts`

Localiza a linha em `nomeAba` cujo valor de `idColuna` é `idValor` e grava `Status = 'Cancelada'`
(mais `Editado_Por`/`Timestamp_Edicao`, se as colunas existirem). Nunca remove a linha. Usada por
`cancelarAvaliacao` nesta feature; disponível para épicos futuros que precisem do mesmo padrão de
exclusão lógica em outras abas.

**Erros**: `"Aba não autorizada: {nomeAba}"` (mesmo `CRUD_CONFIG` de `crudCriar`), `"Registro não
encontrado: {idValor}"`.

**RN/FR**: C-05.
