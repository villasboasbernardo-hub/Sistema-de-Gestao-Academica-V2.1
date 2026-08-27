# Contrato: Funções de Frontend (`app/(app)/disciplinas/page.tsx`, estendido)

Nenhuma chamada a Server Action nova (`data-model.md`) — os 3 filtros e o gráfico consomem dado já
carregado pela tela. `aoTrocarCursoDisciplinas()`/`aoTrocarTurmaDisciplinas_()`/
`mostrarEstadoInicialDisciplinas_()` (já existentes) ganham a responsabilidade de resetar os 3
filtros novos (`filtroAtual.statusTurma/idInstrutor/statusDisciplina = ''`, FR-005), sem mudar suas
assinaturas.

## `enriquecerLinhasDisciplinaParaFiltros_(linhas, disciplinaPorGrade, chExecutadaPorGrade, statusInfoPorGrade, statusPorTurma)`

Nova, função pura. Roda 1 vez por carga/recarga de dado (nunca a cada mudança de filtro) — ver
`data-model.md` §4 para a forma exata do retorno. `statusInfoPorGrade` é `{idGrade: {statusConclusao,
ritmo}}`, populado a partir do array já retornado por `getDisciplinasDaTurmaComRitmo` (cascata) —
`statusPorTurma` é `{idTurma: status}`, derivado de `AppState.ctx.turmas` (já em memória).

## `atualizarDisponibilidadeFiltrosNovos_()`

Nova. Chamada de dentro de `aoTrocarCursoDisciplinas()`/`aoTrocarTurmaDisciplinas_()`/
`mostrarEstadoInicialDisciplinas_()` (mesmos 3 pontos do reset de `filtroAtual`, T007). Desabilita
os 3 `<select>` novos quando a visão ativa é "Curso sem Turma" (`modoExibicaoAtual === 'cascata' &&
!filtroAtual.idTurma`) — fora do escopo de FR-006, os controles não têm nenhum dado turma-aware
para filtrar — e os reabilita nos outros 2 modos (estado inicial, cascata com Turma selecionada).
Os 3 `<select>` nascem `disabled` no HTML (achado C1 do `/speckit-analyze`, Edge Case do spec.md).

## `turmaStatusPorId_(turmas)`

Nova, função pura. `{idTurma: status}` a partir de `AppState.ctx.turmas` — usada para montar
`statusPorTurma` (parâmetro acima) e para popular as opções do `<select>` de Status da Turma.

## `linhaPassaFiltros_(linhaEnriquecida, filtros)`

Nova, função pura. `filtros` é o mesmo formato de `filtroAtual` (`data-model.md` §3, só os 3 campos
novos importam aqui — `idCurso`/`idTurma` já filtram antes, na origem do dado). Regra: cada filtro
com valor vazio (`''`) sempre passa; com valor preenchido, exige igualdade (`_statusTurma`,
`_statusConclusao`) ou pertencimento (`_instrutores.includes(idInstrutor)`) — todos os filtros
preenchidos precisam bater (E lógico, FR-004).

## `opcoesInstrutorFiltro_(linhasEnriquecidas, instrutorPorId)`

Nova, função pura. Coleta `ID_Instrutor` distintos de `_instrutores` de todas as linhas (antes de
aplicar `linhaPassaFiltros_` — FR-002, o dropdown reflete o recorte de Curso/Turma/Status da Turma,
não o resultado já filtrado por Instrutor), resolve nome via `instrutorPorId`, ordena por
antiguidade via `ordenarVinculosPorAntiguidadeDisc_` (já existente, spec 036) — retorna
`[{ID_Instrutor, nome}]` (FR-002.1, RN-ANT-01).

## `dadosGraficoCargaHoraria_(disciplinasCarregadas)`

Nova, função pura. Ver `data-model.md` §7 — retorna `null` quando não há disciplina ativa com carga
horária maior que zero (FR-008), sinal para o chamador não renderizar o gráfico.

## `agregarEstatisticasDisciplinas_(linhasEnriquecidasFiltradas)`

Nova, função pura. Substitui a chamada `gs('getEstatisticasDisciplinas', filtros)` — ver
`data-model.md` §5 para o formato de retorno (idêntico ao da função backend removida, só a origem
do dado muda). `_ritmo` (não exposto na assinatura pública da linha enriquecida além de
`_statusConclusao`) precisa estar disponível para o cálculo de `kpis.atrasadas` — a função de
enriquecimento (`enriquecerLinhasDisciplinaParaFiltros_`) inclui `_ritmo` na forma retornada, mesmo
não estando listado como filtro em `linhaPassaFiltros_` (é usado só para agregação, não para
filtrar linhas).

## `carregarEstatisticasDisciplinas(filtros)` — REESCRITA, mesma assinatura

**Antes**: `gs('getEstatisticasDisciplinas', filtros).then(r => renderiza(r))`.

**Depois**: chama `enriquecerLinhasDisciplinaParaFiltros_` (se ainda não enriquecido nesta carga) →
filtra via `linhaPassaFiltros_` → `agregarEstatisticasDisciplinas_` → renderiza os mesmos 4
cartões + `graficoDisciplinasStatus` (HTML/`renderizarGrafico_` inalterados) — síncrono, sem
`.then()`/chamada de rede. Acrescenta, quando `filtroAtual.idCurso` preenchido, o gráfico de pizza
novo (`dadosGraficoCargaHoraria_` + `renderizarGrafico_(..., 'pie', ...)`) no mesmo container —
**este gráfico usa `disciplinasCarregadas` bruto (só filtrado por Curso), nunca o array já
filtrado pelos 3 filtros novos/Turma** (FR-004, exceção explícita; achado F1 do
`/speckit-analyze`).

## Selects novos (HTML, junto de `#discCursoSelecao`/`#discTurmaSelecao`)

`#discStatusTurmaSelecao`, `#discInstrutorSelecao`, `#discStatusDisciplinaSelecao` — cada um com
`onchange` atualizando a chave correspondente de `filtroAtual` e chamando
`renderizarTabelaDisciplinas_`/`atualizarEstatisticasSeVisivel_` de novo (mesmo padrão de
`aoTrocarTurmaDisciplinas_`). `#discInstrutorSelecao` é repopulado (via
`opcoesInstrutorFiltro_`) toda vez que o dado é (re)carregado, nunca a cada mudança de filtro.
