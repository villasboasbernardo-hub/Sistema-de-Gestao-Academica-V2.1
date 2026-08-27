# Contrato — Funções de Frontend (`app/(app)/disciplinas/page.tsx`, reescrito)

Convenção: `_` no final = função interna do arquivo (mesmo padrão de toda a sessão). Nenhuma função
de backend nova é chamada além de `getEstatisticasDisciplinas(filtros)` (ver
`contracts/backend-functions.md`) e `getDisciplinasDaTurmaComRitmo` (já existente, agora consumida
por este arquivo).

## Retiradas (estrutura da spec 030, substituída por FR-011)

- HTML: `#discSecaoTurma`, `#discTabelaTurmaContainer`, `#corpoTabelaDisciplinasTurma` e a tabela
  antiga `#corpoTabelaDisciplinas` de 2 colunas — viram uma única tabela (`#corpoTabelaDisciplinas`,
  reaproveitando o `id`, agora com colunas dinâmicas).
- JS: `carregarDisciplinas(idCurso)`, `carregarDisciplinasDaTurma_(idTurma)`,
  `renderizarTabelaDisciplinasTurma_`, `resetarSecaoTurmaDisciplinas_`, `popularTurmasDisciplinas_`
  (versão antiga, sem nomenclatura) — substituídas pelas funções abaixo.

## Mantidas sem nenhuma mudança de corpo (reuso literal, decisão do `/speckit-clarify`)

- `resumoInstrutoresCompacto_(idInstrutorCsv, instrutorPorId)`
- `abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)`
- `filtrarInstrutoresEdicaoDisciplina_()`
- `intervaloContidoEmClient_(inicioA, fimA, inicioB, fimB)`
- `podeEditarPrioridadeMotor()`
- `listaravaliacoesPlanejadas`/`atualizarAvaliacaoPlanejada` (backend, intocadas) e
  `carregaravaliacoesPlanejadas`/`salvarAvaliacaoPlanejada` (frontend, definidas mas **não**
  chamadas automaticamente — seção `d-none`, FR-002; reativação futura só remove o `d-none` e
  religa a chamada).
- `turmasDisciplinaCarregadas`, `vinculosInstrutorCarregados`, `instrutoresCadastroCarregados`
  (variáveis de módulo) — continuam existindo com os mesmos nomes, agora populadas por
  `carregarDisciplinasView_` em vez de `carregarDisciplinasDaTurma_`, para que
  `abrirEdicaoDisciplinaTurma_`/`salvarEdicaoDisciplinaTurma_` não precisem de nenhuma mudança de
  corpo.

## Ajustadas (mesmo nome, corpo trocado)

### `aoTrocarCursoDisciplinas()`
Continua o `onchange` de `#discCursoSelecao`. Novo corpo: atualiza `filtroAtual.idCurso`, zera
`filtroAtual.idTurma`; se `!idCurso`, reseta tudo (tabela vazia, seletor de Turma desabilitado) e
retorna; senão chama `popularTurmasDisciplinas_(idCurso)` (nomenclatura), `carregarDisciplinasView_
(idCurso, '')` (Visão 1) e `atualizarEstatisticasSeVisivel_()`. **Não** chama mais
`carregaravaliacoesPlanejadas` (FR-002).

### `salvarDisciplina(idGrade)`
Remove a leitura dos campos `tecnica_${idGrade}`/`local_${idGrade}` (removidos da UI, FR-006) —
mantém CH e Prioridade exatamente como hoje.

### `alternarEstatisticasDisciplinas()`
Ao abrir (deixar de estar `display:none`), sempre chama `carregarEstatisticasDisciplinas
(filtroAtual)` — não depende mais de um cache "carregar só uma vez" (`AppState.cache.
estatisticasDisciplinas`), porque o resultado agora varia por filtro.

### `carregarEstatisticasDisciplinas(filtros)`
Corpo trocado: `gs('getEstatisticasDisciplinas', filtros)` em vez de `gs('getEstatisticasDisciplinas')`
sem argumento. Renderização dos cards/gráfico idêntica à de hoje.

### `salvarEdicaoDisciplinaTurma_(idTurmaDisciplina)`
Mesmo corpo, só troca a chamada de recarregamento no `.then()` de sucesso: em vez de
`carregarDisciplinasDaTurma_(linha.ID_Turma)`, chama `carregarDisciplinasView_(filtroAtual.idCurso,
linha.ID_Turma)`.

## Novas

### `filtroAtual` (variável de módulo)
`{ idCurso: '', idTurma: '' }` — estado do par de seletores, usado para saber o que recarregar nas
estatísticas e nas ações de salvar.

### `popularTurmasDisciplinas_(idCurso)` (corpo novo)
Filtra `AppState.ctx.turmas` por `idCurso` (sem a Server Action novo — mesmo research.md §3 do FR-001 da
spec 030), agrupa por `anoLetivo`, e para cada turma calcula o label via `rotuloTurma_`. Habilita o
`<select>` de Turma (antes desabilitado) só quando há pelo menos 1 turma.

### `rotuloTurma_(turmasMesmoAno, turma)` — função pura (contrato em `data-model.md`)
Sem chamada de rede, sem efeito colateral — testável isoladamente com `pnpm vitest run` via extração
por regex do bloco `<script>` (mesmo padrão já usado para outras funções puras desta sessão, ex.
`semestreParaIntervalo_`).

### `carregarDisciplinasView_(idCurso, idTurma)`
Substitui `carregarDisciplinas`+`carregarDisciplinasDaTurma_`. Sempre chama `gs('listarDisciplinas')`
filtrado por `idCurso` (Visão 1, base para Código/Nome/CH/Prioridade em ambas as visões). Se
`idTurma`, adicionalmente `Promise.all([crudListar('turma_disciplina'), crudListar
('instrutor_disciplina'), crudListar('instrutores'), gs('getDisciplinasDaTurmaComRitmo', idTurma)])`
— popula `turmasDisciplinaCarregadas`/`vinculosInstrutorCarregados`/`instrutoresCadastroCarregados`
e um mapa `chExecutadaPorGrade` a partir do retorno de `getDisciplinasDaTurmaComRitmo`. Chama
`renderizarTabelaDisciplinas_` ao final (Visão 1 se `!idTurma`, Visão 2 se `idTurma`).

### `renderizarTabelaDisciplinas_(visao2, disciplinasCurso, turmaDisciplinaLinhas, chExecutadaPorGrade, vinculos, instrutores)`
Renderiza `<thead>` e `<tbody>` de `#corpoTabelaDisciplinas` conforme a visão:
- **Visão 1** (`visao2 === false`): itera `disciplinasCurso` (`disciplinas` filtrado por
  curso) — colunas Código (`Cod_Disciplina`), Nome, CH (input editável), Prioridade (input editável,
  só se `podeEditarPrioridadeMotor()`), Ações (botão "Salvar" → `salvarDisciplina`).
- **Visão 2** (`visao2 === true`): itera `turmaDisciplinaLinhas` (`turma_disciplina` filtrado pela
  turma) — para cada linha, resolve a disciplina correspondente em `disciplinasCurso` via `ID_Grade`
  para Código/CH/Prioridade; acrescenta Início, Término, Instrutores Selecionados
  (`resumoInstrutoresCompacto_`), CH Cumprida (`chExecutadaPorGrade[ID_Grade] || 0`) e Ações
  (inputs de CH/Prioridade + "Salvar", MAIS botão "Editar" → `abrirEdicaoDisciplinaTurma_`,
  decisão do `/speckit-clarify`, dois controles separados).

### `atualizarEstatisticasSeVisivel_()`
Se o painel de estatísticas está visível (`style.display !== 'none'`), chama
`carregarEstatisticasDisciplinas(filtroAtual)` — chamada a partir de `aoTrocarCursoDisciplinas`/
`aoTrocarTurmaDisciplinas_` para satisfazer FR-010 sem exigir reabrir o painel manualmente.

## Ajustada (cascata de turma)

### `aoTrocarTurmaDisciplinas_()`
`onchange` de `#discTurmaSelecao`. Atualiza `filtroAtual.idTurma`; chama `carregarDisciplinasView_
(filtroAtual.idCurso, idTurma)` (`idTurma === ''` volta para Visão 1) e
`atualizarEstatisticasSeVisivel_()`.
