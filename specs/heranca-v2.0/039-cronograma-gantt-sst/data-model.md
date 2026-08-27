# Data Model — Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

Nenhuma coluna, aba ou entidade persistida nova (Assumptions, `spec.md`). Este documento descreve
as formas de dado em memória (nunca gravadas) que o Gantt introduz.

## 1. Barra do Gantt — ano vigente

Derivada de `getDisciplinasAnoVigente(ano)` (já existente, não modificada) + `listarDisciplinas()`
(join de `Nome_Disciplina`) + `instrutores` (nomes para exibição/filtro):

```text
BarraGanttVigente = {
  idGrade: string,       // turma_disciplina.ID_Grade
  idTurma: string,       // turma_disciplina.ID_Turma
  idCurso: string,       // getDisciplinasAnoVigente já injeta (ID_Curso)
  nome: string,          // disciplinas.Nome_Disciplina (join por idGrade), fallback idGrade
  inicio: string|null,   // ISO 'yyyy-MM-dd', resolverPeriodoEfetivo_ (já embutido em Previsao_Inicio)
  termino: string|null,  // ISO 'yyyy-MM-dd', idem (Previsao_Termino)
  idInstrutor: string,   // turma_disciplina.ID_Instrutor, string separada por vírgula (0+ ids)
  statusConclusao: string,  // getDisciplinasAnoVigente.StatusConclusao ('Não Iniciada'|'Em Andamento'|'Concluída')
}
```

**Regra de exclusão** (FR-004): linhas com `inicio` ou `termino` vazio/nulo, OU `inicio > termino`,
ficam de fora do array de barras antes de chegar ao Gantt — nunca geram uma barra quebrada.

**Agrupamento**: `Object.groupBy`-equivalente por `idTurma` (1 array de `BarraGanttVigente` por
Turma) — cada grupo vira 1 instância `Recharts` `rangeBar` separada (decisão de `/speckit-clarify`
Q1, `research.md` §3).

## 2. Barra do Gantt — prévia de ano futuro

Retorno da nova função `getGanttPrevisaoAnoFuturo_(idCurso, ano)` (`lib/acoes/cronograma.ts`):

```text
getGanttPrevisaoAnoFuturo_(idCurso, ano) → {
  idCurso: string,
  ano: number,
  linhas: Array<{
    idGrade: string,      // planejamento_anual.ID_Grade
    nome: string,         // disciplinas.Nome_Disciplina (join por idGrade), fallback idGrade
    inicio: string,       // ISO 'yyyy-MM-dd' — MIN(Data_Inicio_Semana) do grupo
    termino: string,      // ISO 'yyyy-MM-dd' — MAX(Data_Inicio_Semana) do grupo + 6 dias
  }>,
  avisos: string[],       // ['Este ano ainda não tem planejamento oficial salvo...'] quando linhas=[]
}
```

**Regra de agregação** (`/speckit-clarify` Q3, `research.md` §2): filtrar
`planejamento_anual` por `ID_Curso===idCurso`, `Ano_Letivo===ano`, `Status_Previa==='Salvo'`,
`Tipo_Linha==='Disciplina'`, `ID_Grade` presente e `Tempos_Alocados>0`; agrupar por `ID_Grade`;
`inicio` = menor `Data_Inicio_Semana` do grupo; `termino` = maior `Data_Inicio_Semana` do grupo + 6
dias. Sem nenhuma linha após o filtro: `linhas: []`, `avisos` preenchido, nunca lança exceção
(RN-DEG-01, FR-012).

**Agrupamento**: nenhum — sempre 1 único Gantt por Curso (`research.md` §3, `planejamento_anual`
nunca tem `ID_Turma_Prevista` real).

**Diferença estrutural vs. Barra do Gantt (ano vigente)**: não tem `idTurma`, `idInstrutor` nem
`statusConclusao` reais — ver §3 (Linha enriquecida para filtros) para como isso afeta os 3 filtros
avançados.

## 3. Linha enriquecida para filtros (`enriquecerLinhasDisciplinaParaFiltros_`, duplicada)

Mesma forma da spec 037 (`app/(app)/disciplinas/page.tsx`), duplicada em `app/(app)/cronograma/page.tsx`:

```text
LinhaEnriquecida = BarraGantt (vigente ou futura) + {
  _statusTurma: string,     // turmaStatusPorId_[idTurma] — '' quando não há idTurma real (ano futuro)
  _instrutores: string[],   // idInstrutor.split(',').trim() — [] quando não há idInstrutor real (ano futuro)
  _statusConclusao: string, // statusConclusao — sempre 'Não Iniciada' em ano futuro (nada executado ainda)
}
```

**Degradação em ano futuro** (decisão desta sessão, `/speckit-plan`, `research.md` §5/§7): como
`_statusTurma`/`_instrutores` ficam vazios para toda linha de `BarraGanttFutura`,
`opcoesInstrutorFiltro_`/o `<select>` de Status da Turma naturalmente não têm nenhuma opção além de
"Todos" — os 3 controles de filtro continuam visíveis e reativos (nenhuma lógica condicional nova
de esconder/desabilitar), só sem nenhum candidato para selecionar além do vazio. `linhaPassaFiltros_`
já trata filtro vazio como "sempre passa" — nenhuma mudança nessa função.

## 4. Linha de exportação CSV

Construída direto do array de `LinhaEnriquecida` **atualmente filtrado e visível** (FR-009),
substituindo a raspagem de `<table>` do formato antigo:

```text
LinhaCsv = [Curso, Turma, Disciplina, Início (dd/mm/aaaa), Término (dd/mm/aaaa), Instrutor(es)]
```

`Turma` = `rotuloTurma_` da barra (ano vigente) ou `'—'` (ano futuro, sem turma real); `Instrutor(es)`
= nomes resolvidos via `instrutores` (mesmo helper `formatarNomeInstrutor_`/lista separada por
vírgula já usado em `app/(app)/disciplinas/page.tsx`), ou `'—'` quando `_instrutores` vazio.
