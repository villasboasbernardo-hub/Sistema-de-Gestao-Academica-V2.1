# Data Model — Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

Nenhuma coluna, aba ou entidade persistida nova (constraint do `spec.md`, Assumptions). Este
documento descreve as formas de dado **em memória** (backend, retorno estendido; frontend, dado
derivado) que os 3 filtros novos e o gráfico de pizza usam.

## 1. `getDisciplinasAnoVigente(ano)` — retorno estendido (`lib/acoes/cronograma.ts`)

Cada linha já era um `turma_disciplina` bruto + `ID_Curso`/`ChExecutada` sintéticos (spec 035).
Ganha 2 campos sintéticos novos, calculados com a mesma fórmula/fonte de `getDisciplinasDaTurmaComRitmo`:

```text
LinhaAnoVigente = turma_disciplina bruto + {
  ID_Curso: string,                          // já existia (spec 035)
  ChExecutada: number,                       // já existia (spec 035)

  StatusConclusao: 'Não Iniciada' | 'Em Andamento' | 'Concluída',
  // ChExecutada <= 0 -> 'Não Iniciada'; ChExecutada >= chTotal (chTotal > 0) -> 'Concluída';
  // senão 'Em Andamento'. chTotal = disciplinas[ID_Grade].Carga_Horaria_Tempos (leitura nova
  // desta spec, 1 vez por requisição, nunca por linha). Mesma fórmula de
  // getEstatisticasDisciplinas (removida) e getDisciplinasDaTurmaComRitmo (inalterada).

  Ritmo: 'Atrasada' | 'No Prazo' | 'Adiantada' | null,
  // calcularRitmoDisciplina_(ChExecutada, chTotal, periodo.inicio, periodo.termino, hoje), onde
  // periodo = resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade) — prefere
  // Previsao_Inicio/Termino da própria linha (já presentes no turma_disciplina bruto) sobre a
  // semente de disciplinas, mesma preferência já usada em getDisciplinasDaTurmaComRitmo desde
  // a spec 033. null quando o período (de qualquer fonte) está incompleto (RN-DEG-01).
}
```

**Não regressão**: `linhaVisao2_`/`renderizarTabelaDisciplinas_` (consumidores atuais) só leem
`ID_Grade`/`Cod_Disciplina`/`Nome_Disciplina`/`Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor`/
`ChExecutada`/`ID_Curso` — os 2 campos novos são aditivos, nenhum consumidor existente quebra.

## 2. `getEstatisticasDisciplinas` — REMOVIDA (`lib/acoes/estatisticas.ts`)

Zero consumidor após esta spec (confirmado por grep, `research.md` §1). A agregação equivalente
passa a viver inteiramente no cliente (`agregarEstatisticasDisciplinas_`, §5 abaixo).

## 3. `filtroAtual` — estendido (`app/(app)/disciplinas/page.tsx`)

```text
filtroAtual = {
  idCurso: string,          // já existia
  idTurma: string,          // já existia
  statusTurma: string,      // novo — '' | 'Planejada' | 'Ativa' | 'Concluida' | 'Cancelada'
  idInstrutor: string,      // novo — '' | ID_Instrutor
  statusDisciplina: string, // novo — '' | 'Não Iniciada' | 'Em Andamento' | 'Concluída'
}
```

Resetado (as 3 chaves novas voltam a `''`) em `aoTrocarCursoDisciplinas()`,
`aoTrocarTurmaDisciplinas_()` e `mostrarEstadoInicialDisciplinas_()` (FR-005).

## 4. Linha enriquecida (derivada, em memória, não persistida)

Produzida por `enriquecerLinhasDisciplinaParaFiltros_(linhas, disciplinaPorGrade,
chExecutadaPorGrade, statusInfoPorGrade, statusPorTurma)` — uma vez por carga/recarga de dado
(troca de Curso/Turma/reload do estado inicial), não a cada mudança de filtro (mesmo princípio da
spec 015, `research.md` §5):

```text
LinhaEnriquecida = linha de turma_disciplina (bruta ou de getDisciplinasAnoVigente) + {
  _chTotal: number,
  // disciplinaPorGrade[linha.ID_Grade].Carga_Horaria_Tempos || 0

  _chExecutada: number,
  // linha.ChExecutada (estado inicial) ?? chExecutadaPorGrade[linha.ID_Grade] (cascata) ?? 0
  // mesma resolução dual-fonte que linhaVisao2_ já faz hoje para a coluna "CH Cumprida".

  _statusConclusao: 'Não Iniciada' | 'Em Andamento' | 'Concluída',
  // linha.StatusConclusao (estado inicial, §1) ?? statusInfoPorGrade[ID_Grade].statusConclusao
  // (cascata, getDisciplinasDaTurmaComRitmo) — nunca recalculado no cliente (research.md §2).

  _statusTurma: string,
  // statusPorTurma[linha.ID_Turma] — de AppState.ctx.turmas, já em memória desde o boot.

  _instrutores: string[],
  // linha.ID_Instrutor.split(',').map(trim).filter(Boolean) — mesmo parsing de
  // resumoInstrutoresCompacto_, extraído para reuso.
}
```

## 5. Agregação de estatísticas (derivada, em memória)

`agregarEstatisticasDisciplinas_(linhasEnriquecidasFiltradas)` — pura, substitui o retorno de
`getEstatisticasDisciplinas` removida:

```text
{
  kpis: {
    total: number,
    concluidas: number,     // _statusConclusao === 'Concluída'
    atrasadas: number,      // _statusConclusao !== 'Concluída' && _ritmo === 'Atrasada'
    semInstrutor: number,   // _instrutores.length === 0
  },
  porStatus: [{ status: string, quantidade: number }],  // agrupado por _statusConclusao
}
```

Mesmo formato de retorno da função removida (`kpis.total/concluidas/atrasadas/semInstrutor` +
`porStatus`) — `carregarEstatisticasDisciplinas`/o HTML dos cartões não precisam mudar, só a origem
do dado (chamada síncrona local em vez de `gs(...)`).

## 6. Opções do filtro de Instrutor (derivada, em memória)

`opcoesInstrutorFiltro_(linhasEnriquecidas, instrutorPorId)` — candidatos únicos (`Set` de
`ID_Instrutor` de `_instrutores` de todas as linhas), resolvidos e ordenados por
`ordenarVinculosPorAntiguidadeDisc_` (já existente, spec 036, `research.md` §3) — retorna
`[{ID_Instrutor, nome}]` prontos para popular o `<select>`.

## 7. Dado do gráfico de pizza (derivada, em memória)

`dadosGraficoCargaHoraria_(disciplinasCarregadas)` — filtra `Status === 'Ativo'`, mapeia para
`{rotulo: Cod_Disciplina + ' — ' + Nome_Disciplina, tempos: Carga_Horaria_Tempos}`; retorna `null`
quando a soma de `tempos` é 0 ou a lista é vazia (FR-008, sinal para não renderizar o gráfico).
