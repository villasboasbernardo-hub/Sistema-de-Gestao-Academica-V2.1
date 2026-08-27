# Contrato: Funções de Backend — Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

## `getGanttPrevisaoAnoFuturo_(idCurso, ano)` — NOVA (`lib/acoes/cronograma.ts`)

**Assinatura**: `function getGanttPrevisaoAnoFuturo_(idCurso, ano)`

**Permissão**: `exigirFuncao(PERFIS_TODOS)` + `exigirEscopoCurso_(usuario, idCurso)` — mesmo padrão
de `getCronograma`, único ponto de acesso a `planejamento_anual` deste módulo escopado por curso.

**Comportamento**:
1. Lê `planejamento_anual` (`lerAbaComoObjetos_`), filtra `ID_Curso===idCurso`,
   `Number(Ano_Letivo)===Number(ano)`, `Status_Previa==='Salvo'`.
2. Sem nenhuma linha após o filtro: retorna `{ idCurso, ano, linhas: [], avisos: ['Este ano ainda
   não tem planejamento oficial salvo — gere e salve uma prévia no motor preditivo, ou consulte
   outro ano.'] }` (mesmo texto de `montarCronogramaDePlanejamentoAnual_`, RN-DEG-01) — nunca lança
   exceção.
3. Das linhas restantes, mantém só `Tipo_Linha==='Disciplina'`, `ID_Grade` presente e
   `Number(Tempos_Alocados) > 0`.
4. Agrupa por `ID_Grade`; para cada grupo, `inicio` = menor `Data_Inicio_Semana` (ISO), `termino` =
   maior `Data_Inicio_Semana` + 6 dias (ISO) — `Data_Inicio_Semana` é sempre segunda-feira
   (`segundaFeiraDe_`, já garantido por quem grava `planejamento_anual`).
5. Junta `nome` via 1 leitura de `disciplinas` (mesmo padrão de
   `montarCronogramaDePlanejamentoAnual_`, nunca por linha/grupo) — fallback `ID_Grade` quando a
   disciplina não é encontrada (RN-DEG-01).
6. Retorna `{ idCurso, ano, linhas: [{ idGrade, nome, inicio, termino }, ...], avisos: [] }`.

**Contrato de não regressão**: nenhuma leitura/escrita em `turma_disciplina`/`cursos`; não
chama nem é chamada por `getCronograma`/`distribuicaoSemanalMateria_`/
`montarCronogramaDePlanejamentoAnual_` — função nova e paralela, zero acoplamento (`research.md`
§2).

**Casos de teste esperados** (`tests/unidade/regras_cronograma.test.ts`, reaproveitando
`criarPlanilhaFalsaCronograma`/`carregarCronogramaCompleto` com `planejamento_anual` adicionada ao
mock):
- Curso/ano sem nenhuma linha `Status_Previa==='Salvo'` → `linhas: []`, `avisos` preenchido, sem
  exceção.
- 1 disciplina com linhas em 3 semanas consecutivas (`Tempos_Alocados>0` em todas) → 1 barra,
  `inicio` = segunda-feira da 1ª semana, `termino` = domingo da 3ª semana (segunda + 6 dias).
- Linha com `Tempos_Alocados=0` no meio do intervalo → não desloca `inicio`/`termino` (só
  linhas com tempo alocado contam).
- Linha com `Tipo_Linha` diferente de `Disciplina` (ex. `Feriado`, `Reserva_PROENS`) misturada no
  mesmo curso/ano → ignorada, nunca vira uma barra nem contamina a agregação de outra disciplina.
- 2 versões do mesmo curso/ano, só uma com `Status_Previa==='Salvo'` (a outra `Rascunho`/
  `Arquivado`) → só a versão `Salvo` entra na agregação.
- Disciplina presente em `planejamento_anual` mas ausente de `disciplinas` (removida/renomeada
  depois da geração) → `nome` degrada para `ID_Grade`, sem exceção.
