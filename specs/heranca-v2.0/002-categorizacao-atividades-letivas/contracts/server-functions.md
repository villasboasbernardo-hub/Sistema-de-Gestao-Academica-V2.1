# Contrato — Funções de servidor expostas ao frontend (Épico E)

Convenção do projeto: toda função chamada pelo frontend via Server Action (chamada direta, tipada) é síncrona do ponto de vista do chamador, lança `Error` com mensagem amigável em
caso de validação falha (nunca retorna `null`/`undefined` silenciosamente — RN-DEG-01), e todo
parâmetro de entrada é um único objeto (não múltiplos argumentos posicionais), mesmo padrão já
usado em `registrarAula`/`registrarAvaliacao` da V1.0.

## `registrarEventoExtracurricular(obj)`

**Arquivo**: `lib/acoes/aulas.ts`

**Entrada**:
```text
{
  Categoria_Normativa: "AEC" | "TAD" | "TR" | "Estudo_Individual",  // obrigatório
  Subtipo: string,             // opcional
  Escopo: "Global" | "Turma",  // obrigatório
  ID_Turma: string,            // obrigatório se Escopo="Turma"
  Data: string (ISO),          // obrigatório
  Tempos_Consumidos: number,   // obrigatório, > 0
  Descricao: string,           // obrigatório
  Observacoes: string,         // opcional
}
```

**Saída**:
```text
{
  registro: { ID_Evento: string, ...campos gravados },
  teto: null | ResultadoTeto,  // null se Categoria_Normativa = Estudo_Individual ou TAD/TR sem curso
                                 // resolvível; ResultadoTeto (ver data-model.md) se AEC/TAD/TR
}
```

**Erros**: `"Selecione a categoria."`, `"Estudo Individual não pode ter escopo Global."`,
`"Selecione a turma."` (quando `Escopo=Turma` sem `ID_Turma`), `"Informe quantos tempos (TAs) este
lançamento consumiu."`, `"Turma não encontrada: {id}"`.

**RN/FR**: RN-EVT-01, FR-001 a FR-011.

---

## `registrarAvaliacao(obj)`

**Arquivo**: `lib/acoes/avaliacoes.ts`

**Entrada**:
```text
{
  ID_Turma: string, ID_Grade: string, Tipo_Avaliacao: string, Data_Avaliacao: string (ISO),
  Tempos_Consumidos: number, TA_Inicial: number,   // NOVO nesta feature
  ID_Instrutor_Responsavel: string,  // opcional, sem exigência de habilitação (RN-INST-01 delimitada)
  ID_Fiscal: string, Nome_Fiscal_Externo: string,  // mutuamente exclusivos, opcionais
  Local: string, Observacoes: string,
}
```

**Saída**:
```text
{ registro: { ID_Avaliacao: string, ...campos gravados }, chdAtualizada: number }
```

**Erros**: mesmos de V1.0 (`"Preencha turma, matéria, tipo e data da avaliação."`, `"Turma não
encontrada"`, `"Matéria não encontrada"`, `"A matéria não pertence ao curso da turma"`) — a
checagem de habilitação do instrutor responsável (`instrutorHabilitado_`) é **removida** desta
função (RN-INST-01 delimitada: não se aplica ao aplicador de avaliação).

**RN/FR**: RN-EVT-03, RN-INST-01 delimitada, FR-012, FR-013.

---

## `calcularTetosDoCurso(idCurso)`

**Arquivo**: `lib/dominio/regras-normativas.ts` — função pura por trás (`calcularTetoAEC_` etc.),
wrapper fino de leitura aqui.

**Entrada**: `idCurso: string`

**Saída**: `{ aec: ResultadoTeto, tad: ResultadoTeto, tr: ResultadoTeto }` (formato `ResultadoTeto`
em `data-model.md`).

**RN/FR**: RF-EXTRA-04, RNF-NORM-02, RNF-NORM-08. Chamada pela `app/(app)/cursos/[curso]/page.tsx` ao carregar a
página do curso, e internamente por `registrarEventoExtracurricular` após um novo lançamento
AEC/TAD/TR.

---

## `getCronos(idTurma)` / `getDsaSemanal(idTurma, semana)` / `getRelatorio(idCurso)`

**Arquivos**: `lib/acoes/cronograma.ts`, `lib/acoes/dsa.ts`, `lib/acoes/relatorio.ts`` (assinaturas preservadas de
V1.0 — RF-MOD-02; só o corpo muda para incluir o totalizador de 5 categorias).

**Saída (acrescenta a cada uma)**: um bloco `totalizadores` no formato descrito em `data-model.md`
("Totalizador de 5 categorias"), além dos campos que cada função já devolve hoje.

**RN/FR**: RF-CRONOS-04, FR-014, FR-015, FR-016.
