# Feature Specification: Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

**Feature Branch**: `039-cronograma-gantt-sst`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Refatoração do Módulo de Cronograma (Gantt Chart e Single Source of Truth). Contexto: o Cronograma lê dados de fontes defasadas e usa filtros de turma divergentes do Módulo de Disciplinas. Objetivo: padronizar os filtros de Turma/Curso para espelharem o Módulo de Disciplinas, buscar as datas na tabela correta de execução e renderizar as disciplinas em um Gráfico de Gantt agrupado por Curso/Turma. Escopo: (1) unificação de dados — reusar as mesmas funções que populam Curso/Turma no Módulo de Disciplinas, nomenclatura de turma idêntica; (2) extração de datas da tabela de alocação correta (Data Início/Término/Instrutores); (3) renderizar Gráfico de Gantt ( Charts, pacote gantt/timeline), eixo Y = Nome da Disciplina, barras = Início/Término, agrupado por Curso/Turma; (4) preservar/conectar filtros avançados (Status, Instrutor) ao Gantt, com redesenho instantâneo ao mudar filtro."

## Verificação de premissa (antes de qualquer requisito)

Confirmado por leitura direta de `app/(app)/cronograma/page.tsx`, `app/(app)/disciplinas/page.tsx`,
`lib/acoes/`lib/acoes/cronograma.ts`` (`getCronograma`, `distribuicaoSemanalMateria_`, `getDisciplinasAnoVigente`)
e `components/ciaara/`/`app/globals.css`` antes de escrever este documento — 2 dos 4 itens do
pedido são reais, 2 têm a premissa corrigida:

1. **"Filtros de turma divergentes" — parcialmente real.** O select de Curso do Cronograma
   (`popularSeletoresCronograma`) já usa exatamente a mesma fonte que o de Disciplinas
   (`AppState.ctx.cursos`, mesmo código). O select de Turma (`popularTurmasDoCursoCronograma`)
   também já usa a mesma fonte de dados (`AppState.ctx.turmas`, nunca uma busca isolada/hardcoded
   — não existe o "script isolado de busca de turmas" que o pedido presume) — a divergência real é
   só de **rótulo**: Cronograma mostra `t.nome` (o `Nome_Completo_Curso` cru, ex. "CAHO 2026"),
   enquanto Disciplinas mostra o rótulo formatado por `rotuloTurma_` (spec 031 — "Turma 2026" ou
   "Turma 01/2026", nunca repete o nome do curso), exatamente os 2 exemplos citados no pedido
   original. Correção: reaproveitar `rotuloTurma_` no Cronograma (duplicada, Next.js não
   compartilha `.html` entre módulos — mesmo padrão já usado para `formatarNomeInstrutor_`/
   `ordenarVinculosPorAntiguidadeDisc_` em specs anteriores).
2. **"Datas de fontes defasadas" — real, mas só para a nova feature, não para o motor preditivo
   existente.** `getCronograma` (grade previsto×executado, motor preditivo) usa
   `distribuicaoSemanalMateria_`, que lê `disciplinas.Previsao_Inicio/Termino` (semente de
   grade) diretamente — nunca `resolverPeriodoEfetivo_` (spec 033), que prefere o período real de
   `turma_disciplina` quando existe. Corrigir isso dentro de `distribuicaoSemanalMateria_`
   arriscaria o motor preditivo de anos futuros (Épico G, RN-2027-05/RN-DIST-03), que
   deliberadamente usa a semente de grade porque, para um ano futuro, `turma_disciplina` real ainda
   não existe — a mesma função atende os 2 casos. **Decisão**: o Gráfico de Gantt novo não reaproveita
   `getCronograma`/`distribuicaoSemanalMateria_` — usa `getDisciplinasAnoVigente` (`lib/acoes/cronograma.ts`,
   já existente desde a spec 035/037), que já resolve `StatusConclusao`/`Ritmo` via
   `resolverPeriodoEfetivo_` e já é a mesma função que alimenta o estado inicial do Módulo de
   Disciplinas — fonte única de verdade real, sem tocar no motor preditivo existente. A função
   `getCronograma`/`distribuicaoSemanalMateria_` em si não é modificada por esta spec (evita risco
   às regras RN-2027-05/RN-DIST-03 do Épico G) — mas, por decisão de `/speckit-clarify` (ver seção
   Clarifications), a TELA que a exibia deixa de chamá-la: o Gantt passa a ser a única
   visualização, inclusive para ano futuro (via `planejamento_anual` diretamente, mesma regra de
   agregação de `montarCronogramaDePlanejamentoAnual_`).
3. **Biblioteca de gráficos —  Charts não é necessário, o projeto já tem uma.** Mesma decisão
   já tomada na spec 037 (rejeitando Recharts pelo mesmo motivo): Recharts é a única biblioteca de
   gráficos do sistema desde o Épico 009, com helper único (`renderizarGrafico_`, `components/ciaara/`).
   Recharts suporta Gantt/timeline nativamente via `type: 'rangeBar'` com `plotOptions.bar.
   horizontal: true` — categorias no eixo Y, cada série `{x: rótulo, y: [inícioMs, términoMs]}` —
   exatamente a forma de gráfico pedida, sem introduzir uma segunda biblioteca.
4. **"Preservar e conectar filtros avançados" — não existem no Cronograma hoje, para preservar.**
   Os filtros de Status da Turma/Instrutor/Status da Disciplina são exclusivos do Módulo de
   Disciplinas (spec 037) — o Cronograma nunca teve nenhum deles (só um campo de texto livre
   `cronoFiltro`, filtro simples por nome). Não há nada para "preservar" — são construídos pela
   primeira vez aqui, reaproveitando as mesmas funções puras da spec 037
   (`linhaPassaFiltros_`/`enriquecerLinhasDisciplinaParaFiltros_`/`opcoesInstrutorFiltro_`/
   `turmaStatusPorId_`), duplicadas em `app/(app)/cronograma/page.tsx` pelo mesmo motivo de sempre (Next.js não compartilha `.html` entre módulos).

## Clarifications

As 4 correções de premissa da seção acima têm decisão direta e defensável a partir do código já
existente (reaproveitar função já correta, reaproveitar biblioteca já aprovada, escopo que evita
risco ao motor preditivo) — não precisaram ser levadas a Bernardo. As perguntas abaixo cobrem 3
decisões de arquitetura genuinamente em aberto (sem default único e razoável a partir do código
existente).

### Session 2026-08-25

- Q: Quando um Curso é selecionado sem Turma específica e várias turmas aparecem juntas, como o
  Gantt deve separar visualmente as disciplinas de uma turma das de outra, já que `Recharts`
  `rangeBar` não tem painéis agrupados nativos? → A: Um Gantt por Turma, empilhados verticalmente,
  cada um com um cabeçalho "Turma \<rótulo\>" acima.
- Q: Onde o Gantt deve viver em relação ao dropdown "Visão" (Por disciplina/Por instrutor) e à
  grade previsto×executado que já existe hoje? → A: O Gantt substitui totalmente o dropdown
  "Visão" — os 2 modos de grade (Por disciplina, Por instrutor) deixam de existir; "Instrutor"
  passa a ser só mais um dos 3 filtros aplicados ao Gantt (já previsto na US3), nunca mais um
  layout de linhas próprio; a exportação CSV é repensada para exportar as linhas do Gantt em vez
  da matriz previsto×executado por semana; "Imprimir" passa a imprimir o Gantt.
- Q: Com a grade removida, o que acontece ao selecionar um ano futuro (fluxo do motor preditivo —
  gerar prévia, lançar evento manual, salvar)? → A: O próprio Gantt é estendido para também
  renderizar a prévia do motor preditivo de anos futuros — reaproveitando a mesma regra de
  agregação já usada por `montarCronogramaDePlanejamentoAnual_` (`lib/acoes/cronograma.ts`): linhas de
  `planejamento_anual` do curso/ano com `Status_Previa === 'Salvo'` e `Tipo_Linha === 'Disciplina'`,
  agrupadas por `ID_Grade`; a barra do Gantt vai da semana mais cedo à semana mais tarde com
  `Tempos_Alocados > 0` para aquele `ID_Grade`. Sem nenhuma versão Salvo para o curso/ano, o Gantt
  degrada com aviso explícito (mesmo padrão RN-DEG-01 já usado por
  `montarCronogramaDePlanejamentoAnual_`), nunca lança exceção nem trava a tela.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nomenclatura de Turma idêntica entre Cronograma e Disciplinas (Priority: P1)

Ao abrir o Módulo de Cronograma, o dropdown de Turma mostra os mesmos rótulos que o Módulo de
Disciplinas para a mesma turma (ex. "Turma 2026" ou "Turma 01/2026"), nunca o nome completo cru do
curso.

**Why this priority**: item obrigatório do pedido; correção isolada e de baixo risco.

**Independent Test**: selecionar o mesmo Curso nos 2 módulos e comparar os rótulos do dropdown de
Turma — devem ser idênticos, turma a turma.

**Acceptance Scenarios**:

1. **Given** um Curso com 1 turma no ano, **When** o dropdown de Turma do Cronograma é populado,
   **Then** o rótulo é "Turma \<Ano\>", igual ao Módulo de Disciplinas.
2. **Given** um Curso com 2+ turmas no mesmo ano, **When** o dropdown é populado, **Then** o rótulo
   é "Turma \<NN\>/\<Ano\>" para cada uma, igual ao Módulo de Disciplinas.

---

### User Story 2 - Gráfico de Gantt da linha do tempo das disciplinas (Priority: P1)

Ao selecionar um Curso (com ou sem Turma) no Módulo de Cronograma, o usuário vê um Gráfico de Gantt
com uma barra por disciplina/turma, mostrando visualmente o período real de Início a Término
cadastrado — a mesma fonte de dados do Módulo de Disciplinas, nunca uma data desatualizada.

**Why this priority**: item obrigatório do pedido, o entregável central do épico.

**Independent Test**: selecionar uma Turma com 3+ disciplinas com datas diferentes e conferir que o
Gantt mostra 3+ barras, cada uma começando/terminando exatamente nas datas cadastradas no painel
"Editar" do Módulo de Disciplinas para aquela mesma turma.

**Acceptance Scenarios**:

1. **Given** uma Turma selecionada, **When** o Gantt é renderizado, **Then** cada disciplina da
   turma aparece como 1 barra no eixo Y (rotulada pelo nome da disciplina), com início/término
   batendo exatamente com o painel "Editar" de Disciplinas para a mesma turma.
2. **Given** um Curso selecionado sem Turma específica (todas as turmas do curso, mesmo padrão do
   estado inicial de Disciplinas), **When** o Gantt é renderizado, **Then** aparece 1 Gantt
   separado por Turma, empilhados verticalmente, cada um com um cabeçalho "Turma \<rótulo\>" acima
   (decisão de `/speckit-clarify` — `Recharts` `rangeBar` não tem painéis agrupados nativos).
3. **Given** uma disciplina sem Data de Início ou sem Data de Término cadastrada, **When** o Gantt é
   montado, **Then** essa disciplina fica de fora do Gantt (sem barra quebrada/infinita), sem
   interromper a renderização das demais.
4. **Given** nenhum Curso selecionado, **When** a tela carrega, **Then** o Gantt não aparece (mesmo
   padrão de "nada selecionado" já usado no restante do sistema).

---

### User Story 3 - Filtros avançados conectados ao Gantt, com redesenho instantâneo (Priority: P1)

O usuário filtra o Gantt por Status da Turma, Instrutor e Status da Disciplina — os mesmos 3
filtros já existentes no Módulo de Disciplinas — e o gráfico é redesenhado imediatamente a cada
mudança, sem recarregar a página nem chamar o servidor de novo.

**Why this priority**: item obrigatório do pedido; sem os filtros, o Gantt de um curso grande fica
sobrecarregado de barras.

**Independent Test**: com o Gantt de uma turma aberto, aplicar o filtro de Instrutor e conferir que
só as barras das disciplinas daquele instrutor permanecem, instantaneamente, sem nenhuma chamada de
rede nova.

**Acceptance Scenarios**:

1. **Given** o Gantt de uma turma renderizado, **When** o usuário seleciona um valor em qualquer um
   dos 3 filtros, **Then** o Gantt é redesenhado imediatamente mostrando só as barras que passam no
   filtro, sem chamada a Server Action nova.
2. **Given** 2+ filtros aplicados simultaneamente, **When** o Gantt é redesenhado, **Then** só as
   barras que batem com **todos** os filtros ativos aparecem (E lógico, mesmo comportamento da
   spec 037).
3. **Given** uma combinação de filtros sem nenhuma disciplina correspondente, **When** o Gantt é
   redesenhado, **Then** aparece uma mensagem "nenhuma disciplina" em vez de um gráfico vazio ou
   quebrado.

---

### User Story 4 - Gantt substitui a grade previsto×executado (visão atual, CSV e impressão) (Priority: P1)

Ao abrir o Módulo de Cronograma, o dropdown "Visão" (Por disciplina/Por instrutor) não existe mais
— o Gantt é a única visualização, para qualquer ano. Exportar CSV e Imprimir passam a operar sobre
o Gantt em vez da grade antiga.

**Why this priority**: decisão de `/speckit-clarify` (Q2) — sem essa migração, o sistema ficaria
com 2 telas concorrentes mostrando o mesmo dado de formas diferentes.

**Independent Test**: abrir o Cronograma e confirmar que não existe mais nenhum dropdown "Visão"
nem nenhuma tabela previsto×executado — só o Gantt (e, para ano futuro, o Gantt de prévia da
US5); acionar "Exportar CSV" e conferir que o arquivo contém as linhas do Gantt (disciplina,
turma, início, término, instrutor), nunca a matriz semanal antiga; acionar "Imprimir" e conferir
que a área impressa é o Gantt.

**Acceptance Scenarios**:

1. **Given** o Módulo de Cronograma aberto, **When** a tela carrega, **Then** não há dropdown
   "Visão" nem os modos "Por disciplina"/"Por instrutor" — o filtro de Instrutor (US3) é o único
   lugar onde o instrutor aparece.
2. **Given** um Gantt renderizado (ano vigente ou futuro), **When** o usuário aciona "Exportar
   CSV", **Then** o arquivo gerado contém 1 linha por barra do Gantt atualmente visível (respeitando
   os filtros ativos), nunca a matriz previsto×executado por semana do formato antigo.
3. **Given** um Gantt renderizado, **When** o usuário aciona "Imprimir", **Then** a área impressa é
   o Gantt (todos os sub-Gantts de Turma visíveis), no lugar da tabela antiga.

---

### User Story 5 - Gantt também mostra a prévia do motor preditivo em anos futuros (Priority: P1)

Ao selecionar um ano futuro (fluxo do motor preditivo — gerar prévia, lançar evento manual,
salvar), o mesmo Gantt usado para o ano vigente passa a mostrar a prévia salva
(`planejamento_anual`, `Status_Previa === 'Salvo'`), com 1 barra por disciplina cobrindo da semana
mais cedo à mais tarde com tempo alocado.

**Why this priority**: decisão de `/speckit-clarify` (Q3) — com a grade removida (US4), um ano
futuro sem visualização pareceria quebrado; o motor preditivo (Épico G) continua funcionando sem
nenhuma mudança de comportamento no motor em si, só a exibição muda.

**Independent Test**: gerar e salvar uma prévia para um ano futuro no motor preditivo, abrir o
Cronograma para esse ano e conferir que o Gantt mostra 1 barra por disciplina com tempo alocado na
prévia salva, início/término batendo com a semana mais cedo/mais tarde com `Tempos_Alocados > 0`
para aquele `ID_Grade`; sem nenhuma prévia salva, conferir a mensagem de degradação em vez de tela
quebrada ou vazia sem explicação.

**Acceptance Scenarios**:

1. **Given** um ano futuro com uma prévia `Salvo` no motor preditivo, **When** o Gantt é
   renderizado para esse ano, **Then** cada disciplina com tempo alocado na prévia aparece como 1
   barra, do início da semana mais cedo ao fim da semana mais tarde com `Tempos_Alocados > 0`
   (mesma regra de agregação de `montarCronogramaDePlanejamentoAnual_`).
2. **Given** um ano futuro sem nenhuma prévia `Salvo` para o curso, **When** o Gantt é renderizado,
   **Then** aparece o aviso "Este ano ainda não tem planejamento oficial salvo..." (mesmo texto já
   usado por `montarCronogramaDePlanejamentoAnual_`, RN-DEG-01), sem exceção nem tela quebrada.
3. **Given** o motor preditivo gera/edita/salva uma nova versão da prévia, **When** o usuário volta
   ao Gantt do mesmo ano, **Then** o Gantt reflete a versão `Salvo` mais recente (mesmo
   comportamento de busca de `montarCronogramaDePlanejamentoAnual_` hoje — sempre a versão `Salvo`
   vigente, sem versão histórica).
4. **Given** um ano futuro, **When** os 3 filtros avançados (US3) são aplicados, **Then** os mesmos
   3 controles ficam visíveis e reativos (mesmo comportamento, sem chamada de rede nova); Status da
   Turma e Instrutor naturalmente não têm nenhuma opção para selecionar (a prévia não tem turma
   real nem instrutor estruturado por linha — achado do `/speckit-plan`, ver Assumptions), e Status
   da Disciplina sempre resolve para "Não Iniciada" (nada foi executado ainda num ano futuro) — os 3
   controles nunca lançam erro nem quebram a tela, mesma degradação segura já usada em outros
   pontos (RN-DEG-01).

---

### Edge Cases

- Curso/Turma sem nenhuma disciplina com datas completas: Gantt não renderiza, mensagem informativa
  (mesmo padrão do Edge Case da US2, item 3, mas para o caso de zero disciplinas restantes).
- Trocar de Curso/Turma com filtros já aplicados: os 3 filtros reiniciam (mesmo padrão de FR-005 da
  spec 037), evitando filtro "fantasma" sobre dado novo.
- Disciplina com Início posterior ao Término (dado inconsistente): fica de fora do Gantt, mesmo
  tratamento do Edge Case "sem datas completas" (nunca uma barra invertida/negativa).
- Ano futuro sem nenhuma prévia `Salvo` no motor preditivo: Gantt degrada com o mesmo aviso
  explícito já usado por `montarCronogramaDePlanejamentoAnual_` (RN-DEG-01), nunca lança exceção
  nem mostra tela vazia sem explicação (US5).
- Ano futuro com prévia `Salvo`, mas alguma linha de `planejamento_anual` sem `ID_Grade` (ex.
  `Tipo_Linha` = `Reserva_PROENS`/`Licenca_Pagamento`/`Feriado`/`Evento_Manual`): essas linhas ficam
  de fora das barras do Gantt (não são disciplina), mesma filtragem já usada por
  `montarCronogramaDePlanejamentoAnual_`.
- Exportar CSV ou Imprimir sem nenhuma barra visível (filtros ativos zeram o resultado): CSV sai
  vazio (só cabeçalho) e impressão mostra a mesma mensagem "nenhuma disciplina" da US3, nunca um
  arquivo/impressão quebrados.
- Motor preditivo (`gerarPlanejamento`/`editarLinhaPlanejamento`/`lancarEventoManualPlanejamento`/
  `salvarPlanejamento`) continua funcionando exatamente como hoje — nenhuma dessas funções muda de
  comportamento; só a tela que exibe o resultado (o Gantt, em vez da grade antiga) muda.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O dropdown de Turma do Módulo de Cronograma DEVE usar o mesmo formato de rótulo do
  Módulo de Disciplinas ("Turma \<Ano\>" ou "Turma \<NN\>/\<Ano\>"), nunca o nome completo cru do
  curso.
- **FR-002**: O sistema DEVE renderizar um Gráfico de Gantt com 1 barra por disciplina/turma,
  posicionada entre a Data de Início e a Data de Término cadastradas no Módulo de Disciplinas para
  aquela turma — mesma fonte de dado, nunca uma data recalculada ou de outra tabela.
- **FR-003**: O Gantt DEVE usar o nome da disciplina no eixo Y. Quando mais de uma turma estiver
  representada, o sistema DEVE renderizar 1 Gantt por Turma, empilhados verticalmente, cada um com
  um cabeçalho "Turma \<rótulo\>" acima (decisão de `/speckit-clarify` — `Recharts` `rangeBar` não
  tem painéis agrupados nativos).
- **FR-004**: Disciplinas sem Data de Início e/ou Término completas DEVEM ficar fora do Gantt, sem
  interromper a renderização das demais (degradação segura, RN-DEG-01).
- **FR-005**: O sistema DEVE adicionar os 3 filtros já existentes no Módulo de Disciplinas (Status
  da Turma, Instrutor, Status da Disciplina) ao Módulo de Cronograma, operando sobre o mesmo
  conjunto de dados do Gantt.
- **FR-006**: Qualquer mudança nos 3 filtros DEVE redesenhar o Gantt imediatamente, sem nenhuma
  chamada de rede nova.
- **FR-007**: O Gantt DEVE usar a mesma biblioteca de gráficos já usada pelo resto do sistema
  (Recharts), nunca uma segunda biblioteca.
- **FR-008**: O dropdown "Visão" (Por disciplina/Por instrutor) e a grade previsto×executado
  existentes DEVEM deixar de existir na tela do Cronograma — o Gantt é a única visualização, para
  qualquer ano (decisão de `/speckit-clarify`, Q2).
- **FR-009**: "Exportar CSV" DEVE exportar 1 linha por barra do Gantt atualmente visível
  (respeitando os filtros ativos — disciplina, turma, início, término, instrutor), nunca a matriz
  previsto×executado por semana do formato antigo.
- **FR-010**: "Imprimir" DEVE imprimir o Gantt atualmente renderizado (todos os sub-Gantts de Turma
  visíveis), no lugar da tabela antiga.
- **FR-011**: Para um ano futuro, o sistema DEVE renderizar o Gantt a partir da prévia `Salvo` mais
  recente do motor preditivo (`planejamento_anual`, mesmo filtro `Status_Previa === 'Salvo'` e
  `Tipo_Linha === 'Disciplina'` já usado por `montarCronogramaDePlanejamentoAnual_`), com 1 barra
  por `ID_Grade` cobrindo da semana mais cedo à mais tarde com `Tempos_Alocados > 0` (decisão de
  `/speckit-clarify`, Q3).
- **FR-012**: Um ano futuro sem nenhuma prévia `Salvo` para o curso DEVE degradar com aviso
  explícito (mesmo texto/padrão RN-DEG-01 já usado por `montarCronogramaDePlanejamentoAnual_`),
  nunca lançar exceção nem deixar a tela vazia sem explicação.
- **FR-013**: As funções do motor preditivo (`gerarPlanejamento`, `editarLinhaPlanejamento`,
  `lancarEventoManualPlanejamento`, `salvarPlanejamento`) DEVEM continuar funcionando sem nenhuma
  mudança de comportamento — só a visualização do resultado (Gantt em vez da grade antiga) muda.

### Key Entities

- **Barra do Gantt (ano vigente)**: 1 disciplina numa turma específica — rótulo (nome da
  disciplina), início, término, turma/curso de origem (para agrupamento visual) — derivada de
  `turma_disciplina`, nenhum dado novo.
- **Barra do Gantt (prévia de ano futuro)**: 1 disciplina (`ID_Grade`) dentro de um curso/ano
  futuro — rótulo (nome da disciplina), início (semana mais cedo com `Tempos_Alocados > 0`),
  término (semana mais tarde com `Tempos_Alocados > 0`) — derivada de `planejamento_anual`
  (`Status_Previa === 'Salvo'`, `Tipo_Linha === 'Disciplina'`), nenhum dado novo, mesma regra de
  agregação de `montarCronogramaDePlanejamentoAnual_`.
- **Filtros do Cronograma**: mesmos 3 filtros do Módulo de Disciplinas (Status da Turma, Instrutor,
  Status da Disciplina), aplicados ao mesmo conjunto de linhas que alimenta o Gantt, tanto para o
  ano vigente quanto para a prévia de ano futuro.
- **Linha de exportação CSV**: 1 linha por barra do Gantt atualmente visível (disciplina, turma,
  início, término, instrutor), substitui a matriz previsto×executado por semana do formato antigo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O rótulo de cada turma no Cronograma é idêntico, caractere a caractere, ao rótulo da
  mesma turma no Módulo de Disciplinas.
- **SC-002**: As datas de cada barra do Gantt batem exatamente com as datas cadastradas no painel
  "Editar" do Módulo de Disciplinas para a mesma disciplina/turma, 100% das vezes.
- **SC-003**: Uma mudança em qualquer um dos 3 filtros redesenha o Gantt em menos de 1 segundo, sem
  nenhuma chamada de rede adicional.
- **SC-004**: O dropdown "Visão" e a grade previsto×executado deixam de existir na tela — o Gantt é
  a única visualização, para ano vigente e para ano futuro, sem nenhuma tela concorrente mostrando
  o mesmo dado de forma diferente.
- **SC-005**: Para um ano futuro com prévia `Salvo`, o início/término de cada barra do Gantt bate
  exatamente com a semana mais cedo/mais tarde com `Tempos_Alocados > 0` para aquele `ID_Grade` em
  `planejamento_anual`, 100% das vezes.
- **SC-006**: O motor preditivo (gerar prévia, lançar evento manual, salvar) continua funcionando
  exatamente como antes desta spec, sem nenhuma regressão de comportamento — só a visualização do
  resultado muda.

## Assumptions

- O Gantt do ano vigente reflete dado real (mesma fonte que o estado inicial do Módulo de
  Disciplinas, `getDisciplinasAnoVigente`); o Gantt de ano futuro reflete a prévia `Salvo` mais
  recente do motor preditivo (`planejamento_anual`) — 2 fontes de dado diferentes, escolhidas
  automaticamente conforme o ano selecionado (vigente vs. futuro), sem nenhuma ação extra do
  usuário além de escolher o ano (decisão de `/speckit-clarify`, Q3).
- A correção da fonte de datas (achado 2 da Verificação de Premissa) fica restrita ao Gantt do ano
  vigente — `distribuicaoSemanalMateria_` (usada só internamente por `getCronograma` e por
  `montarCronogramaDePlanejamentoAnual_` para o motor preditivo em si) permanece intocada, por
  risco de regressão nas regras RN-2027-05/RN-DIST-03 do Épico G. Só a agregação já existente em
  `montarCronogramaDePlanejamentoAnual_` (`Status_Previa === 'Salvo'`, `Tipo_Linha === 'Disciplina'`
  por semana) é reaproveitada como fonte do Gantt de ano futuro — nenhuma lógica nova de cálculo de
  período previsto.
- `getCronograma`/`montarCronogramaDePlanejamentoAnual_` deixam de ser chamadas pela tela do
  Cronograma (a grade que as exibia é removida, FR-008) mas o código em si não é obrigatoriamente
  apagado nesta spec — decisão de remover ou manter como código morto fica para o `/speckit-plan`,
  fora do escopo de comportamento desta spec.
- Achado do `/speckit-plan` (confirmado por leitura de `lib/dominio/motor-preditivo.ts`): `planejamento_anual`
  não tem coluna `ID_Instrutor` estruturada (o instrutor de um bloco só existe como texto livre
  dentro de `Descricao`, ex. "Aula — João") nem `ID_Turma_Prevista` real (sempre gravado vazio pelo
  motor). Por decisão de Bernardo (confirmação da recomendação do `/speckit-plan`), os filtros de
  Status da Turma e Instrutor permanecem visíveis e reativos para o Gantt de ano futuro (US5 AS4),
  mas naturalmente sem nenhuma opção para selecionar — nenhuma lógica nova de extração de instrutor
  a partir de texto livre é criada por esta spec.
- Nenhuma coluna, aba ou migração de schema nova — todo dado já existe em `turma_disciplina`/
  `turmas`/`instrutores`/`planejamento_anual`.
