# Feature Specification: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

**Feature Branch**: `031-disciplinas-cascata-expansao`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Refatoração de UI/UX do Módulo de Disciplinas (Cascata e
Expansão de Dados). Remover a divisão lateral entre Disciplinas e Avaliações Planejadas (Avaliações
move para o final do arquivo, oculta com `d-none`). Estatísticas do topo reativas aos filtros Curso/
Turma. Dois selects em cascata (Curso → Turma), com regra de nomenclatura de turma: 1 turma no ano
= 'Turma [Ano]'; mais de uma = 'Turma [Número]/[Ano]' — proibido repetir o nome do curso no label.
Tabela com expansão condicional: só Curso selecionado mostra Código/Nome/Carga Horária/Prioridade
(removendo definitivamente Técnica de Ensino Sugerida e Local Padrão); Curso+Turma selecionados
expande a mesma tabela com Data de Início/Término, Instrutores Selecionados, CH Cumprida e Ações."

## Achados reais (leitura de código antes de escrever qualquer requisito)

- **`disciplinas.Cod_Disciplina` já existe** (confirmado em `docs/arquitetura/01-schema.md`,
  seção de duplicatas — `ID_Curso`+`Cod_Disciplina`) — a coluna "Código" pedida mapeia direto para
  um campo já cadastrado, sem mudança de schema.
- **`turmas` já tem os campos crus `Turma` (ex. `"T1"`/`"T2"`/vazio) e `Ano_Letivo` (ex.
  `"2026"`)** (`baseline/v1-snapshot/turmas.json`, headers) — exatamente o que a regra de
  nomenclatura precisa. Porém ``app/layout.tsx` + `lib/supabase/server.ts`` (`AppState.ctx.turmas`, linhas ~73-86) hoje só expõe
  `idTurma, idCurso, nome (Nome_Completo_Curso), status, dataInicio, dataTermino` — **não** expõe
  `turma`/`anoLetivo` crus. É necessária uma pequena mudança aditiva em ``app/layout.tsx` + `lib/supabase/server.ts`` para passar
  esses 2 campos adiante — **1 dos 2 pontos de backend tocados por esta spec** (o outro é
  `lib/acoes/estatisticas.ts`, achado seguinte).
- **`getEstatisticasDisciplinas()` (`lib/acoes/estatisticas.ts`) hoje não aceita filtro nenhum** — sempre
  global (`disciplinas` inteira). Tornar os cartões "reativos aos filtros" tem 2 caminhos: nova
  função de backend parametrizada, ou recálculo 100% client-side a partir dos dados já carregados
  pela cascata. O segundo caminho tem precedente direto e recente (Hotfix Filtros/Cross-Filtering,
  spec 015, que reimplementou as estatísticas de Instrutores inteiramente client-side), mas **foi
  descartado no plano técnico** desta spec: a "CH Cumprida" por curso exige somar `registros_aula` (1.753 linhas) por `ID_Grade`, dado que não é carregado no cliente em nenhum ponto
  do fluxo atual — baixar a aba inteira a cada abertura da tela seria mais caro que 1 chamada
  filtrada. **Decisão final**: `getEstatisticasDisciplinas(filtros)` ganha um parâmetro opcional e
  retrocompatível (`{idCurso, idTurma}`), chamado via Server Action a cada troca de seleção — mesmo padrão
  de 1-chamada-por-seleção já usado pelo resto da cascata (`carregarDisciplinas`,
  `popularTurmasDisciplinas_`). Ver research.md §1 para o raciocínio completo. Esta é a **segunda**
  (e última) mudança de backend desta spec, ao lado de ``app/layout.tsx` + `lib/supabase/server.ts`` (achado seguinte).
- **``lib/acoes/cronograma.ts`:getDisciplinasDaTurmaComRitmo(idTurma)` (função já existente, Épico 009 FR-008)**
  já devolve `chExecutada`/`chTotal` por `idGrade` para uma turma, filtrando
  `registros_aula` por `ID_Turma` + `Categoria_Normativa==='Aula'` + não cancelada — é
  a fonte pronta para a coluna "CH Cumprida" da Visão 2, sem precisar de função de backend nova.
- **Esta spec substitui a decisão da spec 030 (FR-002.1)**: lá, a tabela de grade (Carga Horária/
  Técnica de Ensino/Local Padrão, curso-scoped) e a tabela por turma (Início/Término/Instrutores,
  turma-scoped) foram deliberadamente mantidas **separadas** — a segunda como seção aditiva, a
  primeira "exatamente como está hoje". Esta spec reverte essa decisão: as duas tabelas MUST virar
  **uma única tabela expansível**, substituindo a estrutura HTML/JS entregue na spec 030
  (`discSecaoTurma`, `corpoTabelaDisciplinasTurma`, e a tabela antiga `corpoTabelaDisciplinas`) por
  uma estrutura unificada. Não é trabalho aditivo desta vez — é reestruturação deliberada.
- **Toda a escrita necessária já existe**: `atualizarDisciplina` (CH), `definirPrioridadeDisciplina`
  (prioridade), `atualizarTurmaDisciplina` (período/instrutor, spec 029, com bloqueio server-side já
  ativo) — nenhuma função de escrita nova é necessária.
- **`listaravaliacoesPlanejadas`/`atualizarAvaliacaoPlanejada` permanecem intocadas** — o pedido é
  ocultar a seção na UI (`d-none`), não remover a funcionalidade ou o dado.

## Clarifications

### Session 2026-08-20

- Q: Na Visão 2 (curso+turma selecionados), a célula "Ações" deve ter dois controles separados
  (inputs inline de CH/Prioridade + "Salvar", mais um botão "Editar" à parte para período/
  instrutor) ou um único botão "Editar" que abre um painel unificado com os 4 campos? → A: Opção A
  — dois controles separados. O painel de período/instrutor herdado da spec 030 permanece
  exatamente como está, sem nenhum campo novo; CH/Prioridade continuam editáveis inline com
  "Salvar", igual já funciona hoje.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a grade do curso numa tabela enxuta, sem divisão lateral (Priority: P1)

Como Divisão de Administração Acadêmica ou Divisão de Orientação Educacional e Pedagógica, ao
escolher um curso quero ver só as informações essenciais da ementa (Código, Nome, Carga Horária,
Prioridade) numa única tabela de largura total — sem a coluna lateral de Avaliações Planejadas
disputando espaço, e sem colunas que não uso mais (Técnica de Ensino Sugerida, Local Padrão).

**Why this priority**: É a visão base — toda navegação (inclusive a Visão 2) parte daqui.

**Independent Test**: Abrir o Módulo de Disciplinas, escolher um curso (ex. CAHO) e confirmar que a
tabela ocupa a largura toda, mostra exatamente 4 colunas de dado (Código/Nome/Carga Horária/
Prioridade) mais Ações, e que não há nenhuma tabela de Avaliações Planejadas visível ao lado.

**Acceptance Scenarios**:

1. **Given** o Módulo de Disciplinas recém-aberto, **When** a página carrega, **Then** não existe
   divisão lateral (`col-lg-6`/`col-lg-6`) entre Disciplinas e Avaliações Planejadas — a tabela de
   Disciplinas ocupa a largura total disponível.
2. **Given** um curso selecionado, **When** a tabela renderiza, **Then** as colunas exibidas são
   exatamente Código, Nome da Disciplina, Carga Horária e Prioridade (quando o perfil pode editá-
   la) mais Ações — as colunas Técnica de Ensino Sugerida e Local Padrão nunca aparecem.
3. **Given** qualquer estado da tela, **When** o usuário rola até o final da página, **Then** a
   seção de Avaliações Planejadas está presente no HTML mas oculta (classe `d-none`) — não visível
   nem ocupando espaço de layout.
4. **Given** nenhum curso selecionado, **When** a página carrega, **Then** a tabela de disciplinas
   está vazia e o seletor de Turma está desabilitado/vazio.

---

### User Story 2 - Selecionar turma e ver a tabela expandir com dados de execução (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, depois de escolher o curso quero escolher uma
turma específica (com um nome claro, sem repetir o nome do curso) e ver a mesma tabela crescer
lateralmente para mostrar datas previstas, instrutores selecionados e carga horária cumprida de
cada disciplina — sem precisar abrir uma tela separada.

**Why this priority**: Mesma prioridade da User Story 1 — juntas formam o fluxo completo de
consulta (grade básica → detalhe de execução por turma).

**Independent Test**: Escolher um curso com mais de uma turma no mesmo ano (ex.
`C-ApA-AuxNav-PR-SP`), confirmar que o seletor de Turma mostra "Turma 01/2026"/"Turma 02/2026" (sem
repetir o nome do curso), e que ao selecionar uma delas a MESMA tabela ganha as colunas de datas/
instrutores/CH cumprida/ações, sem uma segunda tabela aparecer.

**Acceptance Scenarios**:

1. **Given** um curso selecionado, **When** o seletor de Turma é populado, **Then** contém
   exclusivamente as turmas daquele curso, com o label seguindo a regra: 1 turma no ano →
   `"Turma <Ano_Letivo>"`; mais de uma turma no mesmo ano → `"Turma <NN>/<Ano_Letivo>"` (`NN` com 2
   dígitos, derivado do campo cru `Turma`, ex. `T1`→`01`) — o nome do curso nunca aparece dentro do
   label da turma.
2. **Given** curso e turma selecionados, **When** a tabela renderiza, **Then** exibe as mesmas
   colunas da Visão 1 (Código, Nome, Carga Horária, Prioridade) MAIS Data de Início, Data de
   Término, Instrutores Selecionados (resumo compacto) e CH Cumprida, na mesma tabela — nunca uma
   tabela adicional separada.
3. **Given** a tabela expandida (Visão 2), **When** o usuário clica em "Editar" numa linha, **Then**
   abre o mesmo painel de edição de período/instrutor já existente (data + checkboxes de instrutor
   com busca), sem nenhuma mudança de comportamento em relação ao que já funciona hoje.
4. **Given** turma selecionada, **When** o usuário desmarca a turma (volta para "Selecione…") mas
   mantém o curso, **Then** a tabela retorna à Visão 1 (sem as colunas de execução), sem perder o
   curso selecionado.
5. **Given** um curso sem nenhuma turma, **When** o curso é selecionado, **Then** o seletor de Turma
   fica vazio/desabilitado com mensagem informativa, e a tabela permanece na Visão 1.

---

### User Story 3 - Ver as estatísticas do topo refletirem o filtro atual (Priority: P2)

Como qualquer perfil com acesso a este módulo, quero que os cartões de estatística no topo mudem de
valor conforme eu troco de curso ou de turma, sem precisar clicar em nenhum botão de atualizar.

**Why this priority**: Complementa as duas primeiras (que já entregam a navegação e os dados
essenciais); as estatísticas reativas são um refinamento sobre uma base já funcional.

**Independent Test**: Com os cartões de estatística visíveis, trocar de curso e depois de turma, e
confirmar que os números mudam a cada troca, refletindo só o recorte selecionado.

**Acceptance Scenarios**:

1. **Given** nenhum curso selecionado, **When** os cartões estão visíveis, **Then** mostram os
   totais globais (mesmo comportamento atual).
2. **Given** um curso selecionado (sem turma), **When** os cartões atualizam, **Then** refletem
   somente as disciplinas daquele curso.
3. **Given** curso e turma selecionados, **When** os cartões atualizam, **Then** refletem somente as
   disciplinas daquela turma (Visão 2) — incluindo a CH cumprida real da turma, não a global.
4. **Given** os cartões já abertos e visíveis, **When** o usuário troca de filtro, **Then** os
   valores atualizam automaticamente, sem exigir reabrir o painel de estatísticas.

---

### Edge Cases

- Curso com turmas em anos diferentes, uma por ano (ex. 1 turma em 2026, 1 em 2027): cada uma é
  avaliada isoladamente por `Curso+Ano_Letivo` — ambas exibem `"Turma <Ano>"`, nunca `"Turma
  01/<Ano>"`, porque dentro de cada ano há só 1 turma.
- Turma sem nenhuma disciplina em `turma_disciplina`: tabela (Visão 2) vazia com mensagem
  informativa, nunca erro.
- Disciplina sem nenhum instrutor selecionado: coluna "Instrutores Selecionados" mostra "—", nunca
  célula quebrada/vazia sem explicação (mesmo padrão já usado hoje).
- Disciplina sem nenhuma aula lançada ainda: "CH Cumprida" mostra `0` (ou "—"), nunca erro nem
  célula em branco sem explicação.
- Curso deselecionado depois de já ter escolhido turma: seletor de Turma, tabela e painel de edição
  MUST resetar/esconder junto — nunca permanecer visível com dado do curso anterior (mesmo achado já
  corrigido na spec 030, C1 do `/speckit-analyze`).
- Muitos instrutores selecionados numa disciplina: o resumo compacto da coluna trunca/agrega (ex.
  "Fulano, Beltrano +2"), nunca estoura o layout da coluna (comportamento já existente, reaproveitado).
- Perfil sem permissão de editar prioridade: a coluna "Prioridade" permanece oculta (mesmo
  comportamento já existente via `podeEditarPrioridadeMotor()`), sem quebrar a expansão da Visão 2.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela MUST remover a divisão lateral (`col-lg-6`/`col-lg-6`) entre Disciplinas e
  Avaliações Planejadas — a tabela de Disciplinas passa a ocupar a largura total.
- **FR-002**: A seção de Avaliações Planejadas MUST ser movida para o final do arquivo HTML e
  receber a classe `d-none` (oculta nesta versão) — sem remover a função/dado subjacente
  (`listaravaliacoesPlanejadas`/`atualizarAvaliacaoPlanejada` continuam intocadas e disponíveis para
  reativação futura).
- **FR-003**: A tela MUST ter dois seletores no topo — Curso e Turma. O seletor de Turma MUST
  permanecer desabilitado/vazio até um Curso ser selecionado, e populado só com as turmas daquele
  curso (`turmas` filtrado por `ID_Curso`).
- **FR-004**: O label de cada opção do seletor de Turma MUST seguir a regra: se o curso tem
  exatamente 1 turma naquele `Ano_Letivo`, exibir `"Turma <Ano_Letivo>"`; se tem mais de uma turma
  no mesmo `Ano_Letivo`, exibir `"Turma <NN>/<Ano_Letivo>"`, com `NN` de 2 dígitos derivado do campo
  cru `Turma` da linha (ex. `T1`→`01`, `T2`→`02`). O nome do curso MUST NUNCA aparecer dentro do
  label da turma.
- **FR-005**: Com apenas o Curso selecionado (Visão 1), a tabela MUST exibir exatamente as colunas
  Código, Nome da Disciplina, Carga Horária e Prioridade (editável, só para perfis autorizados) mais
  Ações — reaproveitando `Cod_Disciplina`, `Nome_Disciplina`, `Carga_Horaria_Tempos` de
  `disciplinas`.
- **FR-006**: As colunas "Técnica de Ensino Sugerida" e "Local Padrão" MUST ser removidas
  definitivamente da UI (não aparecem em nenhuma das duas visões) — os campos correspondentes na
  planilha (`Tecnica_Ensino_Sugerida`/`Local_Padrao`) permanecem intocados, só deixam de ser
  editáveis por esta tela.
- **FR-007**: Com Curso e Turma selecionados (Visão 2), a MESMA tabela MUST se expandir mantendo as
  colunas da Visão 1 e adicionando Data de Início, Data de Término, Instrutores Selecionados (resumo
  compacto), CH Cumprida e Ações (Editar) — nunca uma segunda tabela separada.
- **FR-008** [Clarifications 2026-08-20]: A célula "Ações" da Visão 2 MUST manter dois controles
  separados, nunca fundidos num único painel: (a) os inputs inline de Carga Horária/Prioridade com
  botão "Salvar", exatamente como já funciona hoje; e (b) um botão "Editar" à parte que abre o mesmo
  painel de edição de período/instrutor já existente (data de início/término + checkboxes de
  instrutor habilitado com busca, validação client-side de janela da turma) — sem nenhum campo novo
  nesse painel e sem nenhuma mudança de comportamento em relação ao que já está em produção (spec
  030).
- **FR-009**: A coluna "CH Cumprida" da Visão 2 MUST refletir a carga horária já executada daquela
  disciplina **naquela turma específica** (`registros_aula` filtrado por `ID_Turma` +
  `ID_Grade`), nunca a carga executada global da disciplina em todas as turmas.
- **FR-010**: Os cartões de estatística do topo MUST recalcular automaticamente sempre que o filtro
  de Curso ou Turma mudar, refletindo somente o recorte selecionado (curso inteiro, ou turma
  específica quando ambos selecionados) — sem exigir ação manual de atualizar.
- **FR-011** [substitui a decisão da spec 030, FR-002.1]: A tabela de grade (Visão 1) e a tabela por
  turma (Visão 2) da spec 030 MUST ser mescladas em uma única tabela expansível — a estrutura
  separada entregue na spec 030 (`discSecaoTurma`, `corpoTabelaDisciplinasTurma`, tabela antiga
  `corpoTabelaDisciplinas`) é substituída por esta spec, não preservada em paralelo.
- **FR-012**: ``app/layout.tsx` + `lib/supabase/server.ts`` (`AppState.ctx.turmas`) MUST passar a expor também os campos crus
  `Turma` e `Ano_Letivo` de `turmas` (hoje ausentes), necessários para a regra de
  nomenclatura de FR-004 — 1 das 2 mudanças de backend desta spec (a outra é a extensão de
  `getEstatisticasDisciplinas`, FR-010, ver Achados reais).
- **FR-013**: Esta spec MUST reaproveitar 100% das funções de escrita já existentes
  (`atualizarDisciplina`, `definirPrioridadeDisciplina`, `atualizarTurmaDisciplina`) e da fonte de
  CH cumprida por turma (`getDisciplinasDaTurmaComRitmo`) — nenhuma função de escrita nova. Do lado
  de leitura, no máximo 2 extensões aditivas e retrocompatíveis: `AppState.ctx.turmas` (FR-012) e
  `getEstatisticasDisciplinas(filtros)` (FR-010) — nenhuma outra função de backend é criada ou
  alterada.

### Key Entities

Nenhuma entidade nova — leitura sobre `disciplinas`, `turmas`, `turma_disciplina`,
`instrutor_disciplina`, `instrutores` e `registros_aula` (todas já existentes);
escrita sobre `disciplinas` (CH/prioridade) e `turma_disciplina` (período/instrutor), ambas já
existentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com apenas um curso selecionado, a tabela mostra exatamente as colunas Código, Nome,
  Carga Horária e Prioridade (+ Ações) — 0% de ocorrência das colunas Técnica de Ensino Sugerida ou
  Local Padrão.
- **SC-002**: Com curso e turma selecionados, a mesma tabela (não uma segunda) passa a exibir também
  Data de Início, Data de Término, Instrutores Selecionados e CH Cumprida, para 100% das disciplinas
  daquela turma.
- **SC-003**: 100% dos labels do seletor de Turma seguem a regra de nomenclatura (sem repetir o nome
  do curso), verificável em pelo menos um curso com 1 turma no ano e um curso com múltiplas turmas
  no mesmo ano.
- **SC-004**: Trocar o filtro de Curso ou Turma atualiza os cartões de estatística do topo sem
  nenhuma ação manual adicional do usuário.
- **SC-005**: A seção de Avaliações Planejadas está presente no HTML mas nunca visível nesta versão.
- **SC-006**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- O número usado em `"Turma NN/Ano"` é derivado do campo cru `Turma` já existente por linha (`T1`→
  `01`, `T2`→`02`, ...), nunca uma sequência nova inventada pelo frontend.
- A avaliação "1 turma no ano" vs. "mais de uma" é feita por combinação `Curso+Ano_Letivo` — um
  curso com 1 turma em 2026 e 1 em 2027 mostra `"Turma 2026"` e `"Turma 2027"`, não
  `"Turma 01/2026"`.
- As estatísticas reativas (FR-010) são recalculadas via `getEstatisticasDisciplinas(filtros)`
  (endpoint parametrizado e retrocompatível), chamado a cada troca de Curso/Turma — decisão final do
  plano técnico (research.md §1), que descartou o recálculo 100% client-side (precedente da Hotfix
  Filtros/Cross-Filtering, spec 015) por exigir dado de execução não carregado no cliente hoje. Não
  altera o comportamento observável pelo usuário (FR-010 continua satisfeito: atualização automática
  sem ação manual).
- Ocultar (não remover) a seção de Avaliações Planejadas é reversível numa versão futura — o dado e
  a função de backend nunca são tocados por esta spec.
- A tela de edição de grade que a spec 030 mantinha separada e intocada (FR-002.1 daquela spec) deixa
  de existir como seção separada — passa a ser a Visão 1 da tabela única desta spec. Esta é uma
  decisão explícita desta spec, não um efeito colateral.
