# Phase 0 Research: Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

Nenhum item ficou como `NEEDS CLARIFICATION` no Technical Context — os pontos abaixo já estavam
resolvidos pela Verificação de Premissa/Clarifications de `spec.md`; a leitura de código feita
durante este `/speckit-plan` só confirmou onde cada decisão se encaixa e revelou 1 achado novo
(§7, já levado a Bernardo e integrado a `spec.md`).

## 1. Fonte de dado do Gantt (ano vigente)

**Decisão**: `getDisciplinasAnoVigente(ano)` (``lib/acoes/cronograma.ts`:561`, já existente desde spec 035/037)
— zero mudança de backend. Front-end junta com `listarDisciplinas()` (Nome_Disciplina, já buscada
por `app/(app)/disciplinas/page.tsx` do mesmo jeito) e `crudListar('instrutores')` (nomes para o filtro de
Instrutor).

**Rationale**: já resolve `resolverPeriodoEfetivo_` corretamente (achado 2 da Verificação de
Premissa) e é a mesma função que alimenta o estado inicial do Módulo de Disciplinas — fonte única
de verdade real, testada e em produção.

**Alternatives considered**: escrever uma função nova dedicada ao Gantt — rejeitado, duplicaria
lógica já correta sem nenhum ganho (Princípio VI, Mudança Cirúrgica).

## 2. Fonte de dado do Gantt (ano futuro — motor preditivo)

**Decisão**: nova função `getGanttPrevisaoAnoFuturo_(idCurso, ano)` em `lib/acoes/cronograma.ts`, que
reaproveita o mesmo filtro de `montarCronogramaDePlanejamentoAnual_` (`planejamento_anual`,
`ID_Curso===idCurso`, `Ano_Letivo===ano`, `Status_Previa==='Salvo'`, `Tipo_Linha==='Disciplina'`,
`ID_Grade` presente), mas agrega direto para `{ idGrade, nome, inicio, termino }` por `ID_Grade` em
vez de buckets semanais.

**Fórmula de agregação** (decisão de `/speckit-clarify`, Q3): agrupar linhas por `ID_Grade`,
filtrando `Tempos_Alocados > 0`; `inicio` = menor `Data_Inicio_Semana` do grupo; `termino` = maior
`Data_Inicio_Semana` do grupo **+ 6 dias** (fim daquela semana — `Data_Inicio_Semana` é sempre uma
segunda-feira, RN-2027-01/`segundaFeiraDe_`). Sem nenhuma linha `Salvo` para o curso/ano: retorna
`{ linhas: [], avisos: [mesmo texto de montarCronogramaDePlanejamentoAnual_] }` — nunca lança
exceção (RN-DEG-01, FR-012).

**Rationale**: `montarCronogramaDePlanejamentoAnual_` já resolve exatamente o filtro certo, mas seu
retorno (`buckets` alinhados a `semanas`/`granularidade`, rótulos formatados) não carrega datas ISO
cruas por linha — inadequado para as coordenadas x/y de uma barra de Gantt (`Recharts` `rangeBar`
exige `[inícioMs, términoMs]`). Reescrever `montarCronogramaDePlanejamentoAnual_` para também expor
datas cruas arriscaria a grade previsto×executado que ela já atende hoje (ainda chamada por
`getCronograma`, mesmo não sendo mais exibida pela tela) — mais seguro criar uma função nova,
pequena e paralela, reaproveitando só o filtro (não o código de bucketing).

**Alternatives considered**: (a) derivar início/término no front-end a partir do retorno de
`montarCronogramaDePlanejamentoAnual_`, usando o índice do bucket para indexar de volta em
`semanas` — rejeitado, acopla implicitamente ao array `semanas` (frágil, quebra se a ordem mudar);
(b) modificar `montarCronogramaDePlanejamentoAnual_` para também devolver `inicio`/`termino` cru por
linha — rejeitado, mudaria o contrato de uma função ainda usada por `getCronograma` (risco
desnecessário a uma função que o Épico G já valida).

## 3. Agrupamento visual (Turma vs. Curso)

**Decisão**: ano vigente → 1 `Recharts` `rangeBar` por Turma, empilhados verticalmente (decisão de
`/speckit-clarify`, Q1) — cabeçalho "Turma \<rótulo\>" acima de cada um. Ano futuro → **1 único**
Gantt por Curso, sem sub-agrupamento por Turma.

**Rationale**: achado deste `/speckit-plan` (leitura de ``lib/dominio/motor-preditivo.ts`:516`) —
`planejamento_anual` sempre grava `ID_Turma_Prevista: ''` (o motor simula no nível do Curso, nunca
cria uma turma hipotética com identidade própria). Não existe "turma" para agrupar num ano futuro;
1 Gantt por Curso é a única estrutura que o dado suporta, sem contradizer FR-011/US5 (que já falam
só em "1 barra por `ID_Grade`", nunca em sub-agrupamento por turma).

## 4. Renderização (biblioteca e helper)

**Decisão**: nova função `renderizarGanttRangeBar_(elementoId, categorias, series)` em
`components/ciaara/`, aditiva ao `renderizarGrafico_` já existente (não modificado). Reaproveita o mesmo
registro `_instanciasGraficos` (destroy+recriar por `elementoId`, já usado por
`renderizarGrafico_` desde o Hotfix Filtros/Cross-Filtering) — natural para múltiplas instâncias
simultâneas (1 por Turma), cada uma com seu próprio `elementoId` (`gantt-turma-<idTurma>`).

**Rationale**: `renderizarGrafico_` só aceita 1 série numérica simples por categoria
(`series: [{ data: series }]`) — incompatível com o formato `{x, y: [inícioMs, términoMs]}` que
`rangeBar` exige por ponto. Estender a assinatura existente arriscaria os 4 painéis de estatística
que já dependem dela (Cursos/Disciplinas/Turmas + 1 painel adicional). Uma função nova e paralela,
reaproveitando só o registro de instâncias, é a mudança cirúrgica (Princípio VI): aditiva, isolada,
testável sem tocar o consumidor já existente.

**Alternatives considered**: introduzir  Charts (pedido original) — rejeitado desde a
Verificação de Premissa de `spec.md` (Recharts já suporta `rangeBar` nativamente, 2ª biblioteca
violaria Princípio III).

## 5. Filtros avançados (duplicação e degradação em ano futuro)

**Decisão**: duplicar as 4 funções puras da spec 037
(`linhaPassaFiltros_`/`enriquecerLinhasDisciplinaParaFiltros_`/`opcoesInstrutorFiltro_`/
`turmaStatusPorId_`) em `app/(app)/cronograma/page.tsx`, junto com `rotuloTurma_` (spec 031). Para o ano
futuro, os 3 controles (Status da Turma, Instrutor, Status da Disciplina) permanecem sempre
visíveis e reativos; `_statusTurma`/`_instrutores` simplesmente ficam vazios nas linhas enriquecidas
(nenhuma turma real, nenhum `ID_Instrutor` estruturado em `planejamento_anual`), fazendo com que
`opcoesInstrutorFiltro_`/o `<select>` de Status da Turma naturalmente não tenham nenhuma opção além
de "Todos" — mesma degradação seguro-e-vazio (RN-DEG-01) que o resto do sistema já usa, sem
nenhuma lógica condicional nova de esconder/desabilitar filtro.

**Rationale**: decisão confirmada por Bernardo nesta sessão (`/speckit-plan`), depois do achado de
que `planejamento_anual` não tem `ID_Instrutor` estruturado (só texto livre dentro de `Descricao`)
nem `ID_Turma_Prevista` real. Extrair instrutor de texto livre foi rejeitado por fragilidade
(correspondência de nome ambígua) e por escopo (nenhuma lógica de parsing nova pedida pela spec).

**Alternatives considered**: esconder/desabilitar Status da Turma e Instrutor condicionalmente
quando ano futuro está selecionado — rejeitado (opção B da pergunta desta sessão), por adicionar
estado de UI condicional novo sem necessidade, quando a degradação natural já resolve com zero
lógica nova.

## 6. Exportar CSV e Imprimir

**Decisão**: `exportarCronogramaCsv` deixa de raspar o DOM de uma `<table>` (a Gantt não é uma
tabela) e passa a montar o CSV direto do array de barras em memória (a mesma fonte que alimenta o(s)
Gantt(s) visível(is), já filtrada — FR-009). Impressão (FR-010) envolve o(s) Gantt(s) visível(is)
com a classe `.area-impressao` já existente (`app/globals.css`, RF-DSA-06 — DSA e Ficha do Instrutor
já usam o mesmo padrão), sem nenhum CSS novo de `@media print`.

**Rationale**: reaproveita um componente de Design System já testado em produção (RF-DSA-06) em vez
de reinventar impressão de página única; CSV construído a partir do dado em memória evita depender
da estrutura de DOM de um gráfico SVG (que não tem `<tr>`/`<td>` como a tabela antiga tinha).

## 7. Achado novo (levado a Bernardo nesta sessão): filtros sem dado real em ano futuro

Já registrado na Decisão #5 acima e integrado em `spec.md` (US5 AS4, Assumptions) — citado aqui só
para rastreabilidade do processo: identificado durante a extração de Technical Context deste
`/speckit-plan` (leitura de `lib/dominio/motor-preditivo.ts`), não durante o `/speckit-clarify` anterior, porque
só a leitura do schema real de `planejamento_anual` (não só a assinatura de
`montarCronogramaDePlanejamentoAnual_`) revelou a ausência de `ID_Instrutor`/`ID_Turma_Prevista`
estruturados. Resolvido via pergunta direta a Bernardo (Princípio I), não inferido silenciosamente.

## 8. Código morto (`getCronograma` e afins)

**Decisão**: `getCronograma`/`distribuicaoSemanalMateria_`/`montarCronogramaDePlanejamentoAnual_`
permanecem em `lib/acoes/cronograma.ts`, intocadas, mesmo deixando de ser chamadas pela tela (FR-008). Não são
removidas por esta spec.

**Rationale**: já documentado em `spec.md` Assumptions — decisão de remover código morto é
separada da decisão de comportamento de tela; removê-las agora arriscaria sem necessidade uma
função que o Épico G (RN-2027-05/RN-DIST-03) já valida, por um ganho puramente cosmético. Fica
como nota para uma limpeza futura, fora do escopo desta spec (Princípio IX).
