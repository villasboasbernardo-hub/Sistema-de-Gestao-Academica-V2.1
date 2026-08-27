# Feature Specification: Hotfix — Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

**Feature Branch**: `015-hotfix-filtros-cross-instrutores`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "HOTFIX: Interatividade, Filtros Avançados e Terminologia no Módulo de
Instrutores. A versão 2.0 do módulo de instrutores gerou uma interface estática e com vocabulário
impreciso. Objetivo: barra de filtros dinâmicos com 8 categorias estritas (Curso, Classificação de
Curso, Status [Qualificados/Selecionados/Inativos], Posto/Graduação, Círculo Hierárquico
[Oficiais/Praças], Categoria [TTC/Magistério Militar Naval/Servidor Civil/Militar da Ativa], OM,
Capacitação Didática [C-Exp-TE/C-Esp-DID/Licenciatura/Sem capacitação didática]); motor de
cross-filtering client-side onde QUALQUER mudança de filtro re-renderiza a listagem E todos os
gráficos/KPIs simultaneamente, sem chamada adicional ao servidor; substituição de todas as
ocorrências de 'habilitado' por 'qualificado' na interface. ZERO alteração nas lógicas de gravação
do banco de dados."

## Contexto e achados confirmados no código antes desta spec

Verificação direta de `app/(app)/instrutores/page.tsx` e `lib/acoes/estatisticas.ts`/
`lib/acoes/instrutores.ts`/``app/layout.tsx` + `lib/supabase/server.ts`` antes de escrever qualquer requisito (mesmo padrão dos hotfixes
anteriores desta sessão):

1. **O painel de estatísticas hoje é genuinamente estático — a queixa do pedido é literal, não
   exagerada.** `carregarEstatisticasInstrutores()` chama `getEstatisticasInstrutores` **uma única
   vez** (na primeira vez que o usuário expande o painel, com cache em
   `AppState.cache.estatisticasInstrutores`) e nunca mais. Os 5 filtros que já existem hoje (OM,
   Categoria, Capacitação, Regime, Escolaridade) só chamam `renderizarListagemInstrutores_()` — a
   listagem reage, os 7 gráficos e os 4 KPIs nunca são recalculados nem tocados. É exatamente o
   "engine de cross-filtering" que falta, não uma percepção equivocada do usuário.
2. **A barra de filtros atual tem 5 categorias, mas nenhuma delas é "Curso", "Classificação de
   Curso", "Status" (no sentido Qualificado/Selecionado/Inativo) ou "Círculo Hierárquico" — as 4
   categorias novas exigidas por este pedido não existem hoje em nenhuma forma.** As 8 categorias
   estritas do pedido substituem a barra atual: `Regime_Trabalho` e `Nivel_Escolaridade` (hoje
   filtráveis) **não** estão na lista de 8 — ficam de fora da nova barra (continuam visíveis onde já
   estavam: `Regime_Trabalho` como coluna da listagem, achado 5 abaixo).
3. **"Curso" não é um campo direto de `instrutores`** — a ligação instrutor↔curso só existe via
   `instrutor_disciplina` (vínculo de habilitação, `ID_Grade`→disciplina→`ID_Curso`) e via
   `disciplinas.ID_Instrutor` (CSV de selecionados, achado 6 da spec 014). Nenhuma das duas está
   carregada hoje no boot da tela de Instrutores — `listarDisciplinas()` só é chamado para popular o
   dropdown do formulário de vínculo (`carregarDisciplinasParaVinculo`), sem os vínculos de
   `instrutor_disciplina`. `AppState.ctx.cursos` (``app/layout.tsx` + `lib/supabase/server.ts`:51-58`) já é carregado no boot da SPA
   inteira, com `{idCurso, nome, classificacao, status}` prontos — cobre "Classificação de Curso"
   sem nenhuma chamada nova, mas o vínculo instrutor↔curso ainda precisa ser montado a partir de
   dados hoje não carregados nesta tela.
4. **"Círculo Hierárquico" (Oficiais/Praças) não existe como campo nem como conceito derivado em
   nenhum lugar do código** — só pode ser calculado a partir de `Posto_Graduacao` usando a mesma
   escala de antiguidade de 11 postos já formalizada na spec 014
   (`ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO`): os 6 primeiros da escala (`CMG, CF, CC,
   CT, 1ºTen, 2ºTen`) são Oficiais; os 4 seguintes (`SO, 1ºSG, 2ºSG, 3ºSG`) são Praças; `SC`
   (Servidor Civil, 11º) não é nem Oficial nem Praça — não existe 3ª opção no pedido do usuário para
   esse caso (Edge Case abaixo).
5. **"Status: Qualificados / Selecionados / Inativos" descreve 3 conjuntos que já existem no
   código, mas nunca foram unificados numa única categoria de filtro — e dois deles não são
   mutuamente exclusivos, achado já documentado na spec 014 (achado 6, 10 casos reais).**
   "Qualificados" = o `contarHabilitadosDistintos_`/gráfico "Habilitados vs. Selecionados" de hoje
   (`ID_Instrutor` com vínculo `Status=Ativo` em `instrutor_disciplina`); "Selecionados" = parse do
   CSV `disciplinas.ID_Instrutor`; "Inativos" = `instrutores.Status='Inativo'` (hoje nem
   aparece na listagem — a coluna de Status foi removida da tabela pela spec 014 FR-006/009, mas o
   registro em si continua existindo e sendo devolvido por `listarInstrutoresComCargaHoraria`).
6. **O termo "habilitado"/"habilitação" aparece em 7 pontos de UI hoje** (`app/(app)/instrutores/page.tsx`):
   título "Vínculo de habilitação" (linha 76), botão "Habilitar" (linha 86), mensagem de sucesso
   "Vínculo de habilitação criado." (linha 245), rótulo de coluna "Especialidade/Habilitação"
   (linha 320, tela de edição), rótulo de KPI "Taxa de Seleção (Selecionados/Habilitados)" (linha
   282), título do gráfico "Habilitados vs. Selecionados" (linha 286) e o nome interno
   `graficoInstrutoresHabSel` (não é texto visível, fora de escopo). Nenhuma ocorrência aparece em
   `lib/acoes/*.ts` e `lib/dominio/*.ts` fora de nomes de função/variável (`criarVinculoHabilitacao`,
   `contarHabilitadosDistintos_`) — que são código, não interface, e o pedido restringe a mudança à
   interface, com "ZERO alterações nas lógicas de gravação".
7. **`Capacitacao_Didatica` vazio já é tratado como "sem capacitação" no gráfico/KPI de hoje, mas
   não é uma opção selecionável no filtro** — `popularOpcoesFiltrosInstrutores_` só lista as
   qualificações não-vazias encontradas (achado 9 da spec 014). O pedido exige "Sem capacitação
   didática" como 4ª opção explícita do filtro.
8. **`cursos.Classificacao` tem domínio fechado de 5 valores reais, com uma inconsistência de
   capitalização já corrigida uma vez (Hotfix 013, achado pós-deploy `@31`→`@33`)**: `'Curso
   Regular'`, `'Curso Especial'`, `'Curso Expedito'`, `'Curso de Aperfeiçoamento Avançado'`,
   `'Estágio de Qualificação'` (a última com variação real de capitalização — `'Estágio de
   qualificação'`, "q" minúsculo — na banco de produção). O filtro "Classificação de Curso" desta spec
   DEVE reaproveitar a mesma normalização (trim + minúsculas) que corrigiu esse bug
   (`normalizarClassificacao_`, `app/(app)/inicio/page.tsx`), nunca comparação sensível a caixa — repetir o
   erro original seria uma regressão conhecida.

## Clarifications

Nenhum ponto desta spec gerou `[NEEDS CLARIFICATION]` — as 4 ambiguidades reais que o pedido
deixava em aberto foram resolvidas por leitura direta do código/dados antes de escrever os
requisitos (achados 3, 4, 5, 8 acima), documentadas como decisões na seção Assumptions, mesmo
padrão já estabelecido nos hotfixes anteriores desta sessão (013/014). 1 dessas decisões foi
confirmada formalmente em `/speckit-clarify` (sessão abaixo) por ter o maior impacto em desenho de
teste de aceite entre as 4.

### Session 2026-08-17

- Q: Ao filtrar por "Curso", um instrutor deve aparecer se tiver qualificação ativa OU seleção para
  alguma disciplina daquele curso (união), ou só uma das duas relações deve contar? → A: União —
  qualificação ativa OU seleção contam como vínculo ao curso, confirmando a decisão já assumida em
  FR-005/Assumptions.
- Q: O formulário de vínculo de qualificação e o formulário de cadastro de instrutor devem também
  respeitar a barra de filtros (mostrando só o subconjunto filtrado), ou permanecem independentes,
  sempre listando todos os instrutores/cursos? → A: Permanecem independentes — os filtros da barra
  afetam só listagem, KPIs e gráficos (escopo explícito do pedido original), nunca os dois
  formulários abaixo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver listagem, gráficos e KPIs mudarem juntos ao aplicar um filtro (Priority: P1)

Um usuário abre o painel de Instrutores, expande as estatísticas e seleciona uma opção em qualquer
um dos filtros da barra (por exemplo, "Oficiais" em Círculo Hierárquico). A listagem de instrutores,
os 4 KPIs e os 7 gráficos mudam imediatamente para refletir só o subconjunto filtrado — sem
recarregar a página, sem esperar uma resposta do servidor e sem qualquer parte da tela continuar
mostrando o conjunto completo não filtrado.

**Why this priority**: É o item que o próprio pedido classifica como "o mais crítico" — hoje é o
único ponto genuinamente quebrado (achado 1): a listagem já reage a filtro desde a spec 014, mas
estatísticas nunca reagiram a filtro nenhum, mesmo com o painel aberto.

**Independent Test**: Com o painel de estatísticas expandido, escolher qualquer valor em qualquer
filtro da barra e confirmar visualmente que os 4 KPIs, os 7 gráficos e a tabela mudam juntos, no
mesmo instante, sem nenhuma requisição de rede nova (verificável pela ausência de indicador de
carregamento/espera).

**Acceptance Scenarios**:

1. **Given** o painel de estatísticas expandido mostrando o total de todos os instrutores, **When**
   o usuário seleciona "Oficiais" no filtro Círculo Hierárquico, **Then** o KPI "Total de
   Instrutores", a listagem e os 7 gráficos (incluindo os de OM e Capacitação Didática) atualizam
   simultaneamente para refletir só os instrutores com Posto/Graduação de oficial.
2. **Given** qualquer filtro já aplicado, **When** o usuário troca esse filtro para outro valor ou
   limpa a seleção, **Then** listagem, KPIs e gráficos voltam a refletir o novo filtro (ou o conjunto
   completo, se limpo) sem exigir reabrir ou re-expandir o painel de estatísticas.
3. **Given** o painel de estatísticas ainda **não** expandido (nunca carregado), **When** o usuário
   aplica um filtro e só depois expande as estatísticas, **Then** o painel já nasce mostrando os
   dados filtrados correspondentes ao filtro ativo no momento, nunca o conjunto completo seguido de
   uma correção posterior.
4. **Given** dois ou mais filtros da barra preenchidos ao mesmo tempo (ex.: OM + Categoria +
   Capacitação Didática), **When** a tela re-renderiza, **Then** listagem, KPIs e gráficos refletem
   a interseção (E lógico) de todos os filtros ativos simultaneamente — nunca a união.

---

### User Story 2 - Filtrar instrutores pelas 8 categorias exigidas (Priority: P1)

Um usuário precisa localizar instrutores por Curso, Classificação de Curso, Status (Qualificados/
Selecionados/Inativos), Posto/Graduação, Círculo Hierárquico, Categoria, OM ou Capacitação Didática
— as 8 categorias exigidas pelo pedido, disponíveis como caixas de seleção na barra de filtros,
substituindo a barra atual de 5 categorias.

**Why this priority**: Sem essas 8 categorias existirem como filtro, a User Story 1 (cross-filtering)
não tem o que filtrar — mas a existência da barra é testável de forma independente da reatividade
dos gráficos (uma pode existir sem a outra funcionar corretamente).

**Independent Test**: Abrir o módulo de Instrutores e confirmar, sem aplicar nenhum filtro, que a
barra contém exatamente 8 caixas de seleção com os rótulos e a cobertura de valores exigidos —
inclusive testando cada uma isoladamente contra a listagem.

**Acceptance Scenarios**:

1. **Given** a tela de Instrutores carregada, **When** o usuário observa a barra de filtros, **Then**
   existem exatamente 8 caixas de seleção: Curso, Classificação de Curso, Status, Posto/Graduação,
   Círculo Hierárquico, Categoria, OM e Capacitação Didática.
2. **Given** o filtro Status, **When** o usuário abre suas opções, **Then** as opções disponíveis
   são "Qualificados", "Selecionados" e "Inativos" (achado 5) — nenhuma outra.
3. **Given** o filtro Círculo Hierárquico, **When** o usuário abre suas opções, **Then** as opções
   disponíveis são "Oficiais" e "Praças" (achado 4).
4. **Given** o filtro Capacitação Didática, **When** o usuário abre suas opções, **Then** as opções
   disponíveis incluem "C-Exp-TE", "C-Esp-DID", "Licenciatura" (as 3 qualificações reais hoje,
   achado 9 da spec 014) e "Sem capacitação didática" (achado 7) — cada uma delas filtrando
   corretamente mesmo para instrutores com múltiplas qualificações no mesmo campo.
5. **Given** o filtro Curso, **When** o usuário seleciona um curso específico, **Then** só aparecem
   instrutores com algum vínculo (qualificação ou seleção, achado 3) a alguma disciplina daquele
   curso.
6. **Given** o filtro Classificação de Curso, **When** o usuário seleciona uma das 5 classificações
   reais (achado 8), **Then** só aparecem instrutores vinculados a cursos daquela classificação —
   comparação insensível a maiúsculas/minúsculas e a espaços (mesma robustez do Hotfix 013).

---

### User Story 3 - Ver "qualificado" em vez de "habilitado" em toda a interface (Priority: P2)

Um usuário navega pelo módulo de Instrutores e não encontra mais nenhuma ocorrência da palavra
"habilitado" (ou variações) em tabelas, gráficos, modais, botões ou alertas — o vocabulário
acadêmico correto, "qualificado", aparece em todos esses lugares.

**Why this priority**: É uma correção de vocabulário, sem impacto funcional — pode ser entregue e
verificada independentemente dos filtros (US1/US2), embora compartilhe os mesmos pontos de tela
(KPI e gráfico "Habilitados vs. Selecionados" também mudam de rótulo nesta spec).

**Independent Test**: Inspecionar visualmente cada um dos 7 pontos de UI do achado 6 (título da
seção de vínculo, texto do botão, mensagem de sucesso, rótulo de coluna, rótulo de KPI, título de
gráfico) e confirmar que nenhum contém mais a palavra "habilitado"/"habilitação"/"habilitar".

**Acceptance Scenarios**:

1. **Given** a seção de criação de vínculo instrutor-disciplina, **When** ela renderiza, **Then** o
   título é "Vínculo de qualificação" e o botão de envio é "Qualificar" (não "Vínculo de
   habilitação"/"Habilitar").
2. **Given** um vínculo criado com sucesso, **When** a mensagem de confirmação aparece, **Then** o
   texto é "Vínculo de qualificação criado." (não "Vínculo de habilitação criado.").
3. **Given** o painel de estatísticas, **When** ele renderiza, **Then** o KPI de taxa de seleção e o
   gráfico correspondente usam "Qualificados" no lugar de "Habilitados" (ex.: "Taxa de Seleção
   (Selecionados/Qualificados)", "Qualificados vs. Selecionados") — os valores numéricos permanecem
   exatamente os mesmos de hoje (achado 6: é troca de rótulo, não de cálculo).
4. **Given** a tela de edição de um instrutor, **When** ela renderiza, **Then** o rótulo do campo
   `Esp_Hab_Obs` é "Especialidade/Qualificação" (não "Especialidade/Habilitação").

---

### Edge Cases

- Instrutor sem nenhum vínculo a disciplina alguma (nem qualificado, nem selecionado): ao filtrar
  por qualquer "Curso" ou "Classificação de Curso" específicos, esse instrutor não aparece em
  nenhuma seleção — comportamento esperado, não é erro. Ao deixar o filtro Curso vazio ("Todos"),
  ele continua aparecendo normalmente.
- Instrutor com `Posto_Graduacao = 'SC'` (Servidor Civil) e o filtro Círculo Hierárquico: não é
  "Oficial" nem "Praça" — não aparece quando qualquer uma das duas opções é selecionada, mas
  continua aparecendo com o filtro vazio ("Todos"). Não existe uma 3ª opção "Civis" nesta barra
  (fora do pedido explícito do usuário, que definiu só 2 valores para esta categoria).
- Instrutor "Selecionado" sem qualificação ativa (achado 5, 10 casos reais hoje): aparece ao
  filtrar Status="Selecionados", mas não aparece ao filtrar Status="Qualificados" — os dois filtros
  não são mutuamente exclusivos por definição de dado (mesmo achado já documentado na spec 014),
  então um mesmo instrutor pode ou não aparecer dependendo de qual das 3 opções de Status está
  selecionada, nunca as duas ao mesmo tempo (o filtro Status é seleção única, não múltipla).
- Curso com `Classificacao` fora do domínio fechado de 5 valores conhecidos (dado malformado
  futuro, mesmo Edge Case do Hotfix 013): não quebra o filtro — o curso simplesmente não aparece
  em nenhuma das 5 opções da caixa de seleção "Classificação de Curso", mas continua aparecendo
  normalmente na caixa "Curso" (que lista cursos, não classificações).
- Combinação de filtros que não retorna nenhum instrutor: a listagem mostra a mensagem já existente
  "Nenhum instrutor encontrado com esses filtros" (padrão já usado hoje); os 7 gráficos e os 4 KPIs
  também precisam de um estado vazio claro (ex.: "0" nos KPIs, gráfico sem barras/fatias em vez de
  travar ou continuar mostrando o último dado não vazio) — nunca uma tela em branco nem um erro de
  script.
- Usuário aplica um filtro restritivo (ex.: OM específica) e em seguida abre o formulário de
  "Vínculo de qualificação" ou "Cadastrar instrutor": os dois formulários continuam mostrando todos
  os instrutores/disciplinas, não só o subconjunto filtrado (Clarifications 2026-08-17, FR-019) —
  não é um bug, é o comportamento esperado, para não esconder um instrutor que o usuário precise
  qualificar ou cadastrar justamente por causa de um filtro deixado ativo na tela.
- Usuário alterna filtros rapidamente em sequência (várias mudanças antes da re-renderização
  anterior "assentar" visualmente): como todo o cálculo é local (sem chamada de rede), cada mudança
  processa e renderiza o resultado final correto — não há condição de corrida com respostas de
  servidor chegando fora de ordem, porque nenhuma chamada de servidor acontece após a carga inicial.

## Requirements *(mandatory)*

### Functional Requirements

**Terminologia**

- **FR-001**: O sistema DEVE substituir toda ocorrência visível de "habilitado"/"habilitados"/
  "habilitação"/"habilitar" (qualquer variação gramatical da raiz "habilita-") por "qualificado"/
  "qualificados"/"qualificação"/"qualificar" (raiz "qualifica-" correspondente) em todo texto de
  interface do módulo de Instrutores — tabelas, gráficos, modais, botões e alertas (achado 6) —
  incluindo, no mínimo, os 6 pontos de texto visível já inventariados: título da seção de vínculo,
  texto do botão de vínculo, mensagem de sucesso do vínculo, rótulo de coluna
  `Esp_Hab_Obs`/"Especialidade/Habilitação", rótulo do KPI de taxa de seleção e título do gráfico
  "Habilitados vs. Selecionados".
- **FR-002**: A substituição de terminologia DEVE ser exclusiva de texto de interface — nomes de
  função, de variável, de campo de planilha (`instrutor_disciplina`, `criarVinculoHabilitacao`) e o
  vocabulário normativo dos documentos de referência (`RN-MAT-05`, glossário DEnsM) permanecem
  inalterados (constraint explícita do pedido: "ZERO alterações nas lógicas de gravação do banco de
  dados").
- **FR-003**: A substituição de terminologia NÃO DEVE alterar nenhum valor numérico, cálculo ou
  fonte de dado já existente (ex.: o cálculo de "Qualificados" continua sendo exatamente o mesmo
  cálculo de "Habilitados" de hoje — `ID_Instrutor` distintos com vínculo `Status=Ativo` em
  `instrutor_disciplina`) — é troca de rótulo, não de lógica.

**Barra de Filtros Avançados**

- **FR-004**: O sistema DEVE exibir uma barra de filtros com exatamente 8 caixas de seleção: Curso,
  Classificação de Curso, Status, Posto/Graduação, Círculo Hierárquico, Categoria, OM e Capacitação
  Didática — substituindo a barra atual de 5 filtros (OM, Categoria, Capacitação, Regime,
  Escolaridade); `Regime_Trabalho`/`Nivel_Escolaridade` deixam de ser filtráveis nesta tela
  (`Regime_Trabalho` continua visível como coluna da listagem, achado 2).
- **FR-005**: O filtro Curso DEVE listar todos os cursos cadastrados (mesma fonte já carregada em
  `AppState.ctx.cursos`, achado 3) e, ao ser selecionado, restringir o resultado a instrutores com
  pelo menos um vínculo (qualificação ativa OU seleção, achado 3/União) a alguma disciplina daquele
  curso.
- **FR-006**: O filtro Classificação de Curso DEVE oferecer as 5 classificações reais do domínio
  fechado (achado 8: Curso Regular, Curso Especial, Curso Expedito, Curso de Aperfeiçoamento
  Avançado, Estágio de Qualificação), comparando de forma insensível a maiúsculas/minúsculas e a
  espaços — nunca comparação sensível a caixa (regressão conhecida do Hotfix 013 a não repetir).
- **FR-007**: O filtro Status DEVE oferecer exatamente 3 opções — "Qualificados" (`ID_Instrutor`
  distintos com vínculo `Status=Ativo` em `instrutor_disciplina`), "Selecionados" (`ID_Instrutor`
  distintos do parse do CSV `disciplinas.ID_Instrutor`) e "Inativos"
  (`instrutores.Status='Inativo'`) — seleção única; as 3 opções não são mutuamente exclusivas nos
  dados reais (achado 5) e o filtro DEVE respeitar isso, sem forçar exclusividade artificial.
- **FR-008**: O filtro Posto/Graduação DEVE listar os postos/graduações reais presentes na base,
  ordenados pela mesma escala de antiguidade já formalizada (RN-ANT-01, spec 014) — nunca ordem
  alfabética.
- **FR-009**: O filtro Círculo Hierárquico DEVE oferecer exatamente 2 opções — "Oficiais" (postos
  `CMG, CF, CC, CT, 1ºTen, 2ºTen`) e "Praças" (postos `SO, 1ºSG, 2ºSG, 3ºSG`) — derivadas do mesmo
  mapeamento de `Posto_Graduacao` já existente (achado 4); instrutores com `Posto_Graduacao='SC'`
  não pertencem a nenhuma das 2 opções (Edge Case).
- **FR-010**: O filtro Categoria DEVE oferecer as 4 opções do domínio real de `instrutores.
  Categoria` (spec 014, achado 4), rotuladas exatamente como no pedido: "TTC", "Magistério Militar
  Naval" (valor bruto `MMN`), "Servidor Civil" (valor bruto `SCNS`) e "Militar da Ativa".
- **FR-011**: O filtro OM DEVE listar as organizações militares distintas presentes na base (mesmo
  comportamento já existente hoje).
- **FR-012**: O filtro Capacitação Didática DEVE oferecer as qualificações individuais distintas já
  presentes na base (`C-Exp-TE`, `C-Esp-DID`, `Licenciatura`, achado 9 da spec 014) mais a opção
  "Sem capacitação didática" (achado 7), cobrindo instrutores com o campo vazio — que hoje não tem
  nenhuma opção de filtro correspondente.
- **FR-013**: Todos os filtros ativos DEVEM ser combinados com E lógico (interseção), mesmo
  comportamento já usado pela barra de 5 filtros atual (achado 1).

**Motor de Cross-Filtering**

- **FR-014**: O sistema DEVE manter, no lado do cliente, o conjunto completo de instrutores
  carregado na inicialização da tela — nenhuma mudança de filtro (nenhuma das 8 categorias) DEVE
  disparar uma nova chamada ao backend (a Server Action/`gs(...)`).
- **FR-015**: Ao mudar qualquer um dos 8 filtros, o sistema DEVE re-renderizar a listagem de
  instrutores imediatamente, aplicando a interseção de todos os filtros ativos (comportamento já
  existente hoje, achado 1, estendido às 8 novas categorias).
- **FR-016**: Ao mudar qualquer um dos 8 filtros, o sistema DEVE recalcular e re-renderizar,
  simultaneamente com a listagem, os 4 KPIs e os 7 gráficos do painel de estatísticas — usando
  exatamente o mesmo subconjunto filtrado da listagem, mesmo que o painel de estatísticas não esteja
  visível no momento da mudança (achado 1: comportamento que hoje não existe para nenhum filtro).
- **FR-017**: Se o painel de estatísticas for expandido pela primeira vez com algum filtro já ativo,
  o sistema DEVE exibir diretamente os dados já filtrados — nunca o conjunto completo seguido de uma
  correção posterior perceptível pelo usuário.
- **FR-018**: Uma combinação de filtros sem nenhum instrutor correspondente DEVE resultar em um
  estado vazio claro tanto na listagem (mensagem já existente) quanto nos KPIs (valor zero) e nos
  gráficos (sem dado, não travado nem com o último resultado não vazio).
- **FR-019**: A barra de filtros NÃO DEVE afetar o formulário de "Vínculo de qualificação" (dropdown
  de instrutor/disciplina) nem o formulário de "Cadastrar instrutor" — ambos continuam sempre
  listando o conjunto completo de instrutores/disciplinas, independentemente de qualquer filtro
  ativo na barra (Clarifications 2026-08-17, escopo explícito do pedido original: só listagem, KPIs
  e gráficos reagem aos filtros).

### Key Entities

- **Instrutor** (`instrutores`): nenhuma mudança de estrutura. Esta spec só adiciona atributos
  derivados de exibição/filtragem (cursos vinculados, círculo hierárquico, status
  Qualificado/Selecionado/Inativo) calculados a partir de campos e relações já existentes.
- **Vínculo Curso↔Instrutor** (derivado, não persistido): união de duas relações já existentes —
  qualificação ativa (`instrutor_disciplina.Status='Ativo'` → `disciplinas.ID_Grade` →
  `ID_Curso`) e seleção (`disciplinas.ID_Instrutor`, CSV, → `ID_Curso` da própria disciplina).
- **Círculo Hierárquico** (derivado, não persistido): Oficiais/Praças, calculado a partir de
  `Posto_Graduacao` pela mesma escala de antiguidade de 11 postos já formalizada na spec 014.
- **Status de filtro** (derivado, não persistido, distinto de `instrutores.Status`):
  Qualificado/Selecionado/Inativo — os 3 já existentes como conceitos separados no código, nunca
  antes unificados numa única categoria de filtro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma ocorrência visível da raiz "habilita-" permanece em nenhum texto de interface
  do módulo de Instrutores (tabelas, gráficos, modais, botões, alertas) — verificável por inspeção
  visual completa da tela, incluindo painel de estatísticas e tela de edição.
- **SC-002**: A barra de filtros do módulo de Instrutores contém exatamente 8 caixas de seleção,
  cobrindo exatamente as categorias e o domínio de valores exigidos (Curso, Classificação de Curso,
  Status, Posto/Graduação, Círculo Hierárquico, Categoria, OM, Capacitação Didática).
- **SC-003**: Selecionar qualquer valor em qualquer um dos 8 filtros atualiza a listagem, os 4 KPIs
  e os 7 gráficos simultaneamente, em uma única interação do usuário, sem qualquer indicador de
  carregamento de rede — 100% das combinações de filtro testadas.
- **SC-004**: Selecionar "Oficiais" no filtro Círculo Hierárquico altera, no mesmo instante, tanto a
  listagem quanto os gráficos de OM e Capacitação Didática para refletir apenas instrutores com
  posto de oficial — verificável por contagem manual contra a banco de produção (critério de aceite
  literal do pedido).
- **SC-005**: Zero chamadas adicionais ao backend ocorrem entre o carregamento inicial da tela de
  Instrutores e qualquer sequência de mudanças de filtro.
- **SC-006**: Uma combinação de filtros sem nenhum resultado exibe estado vazio claro em 100% dos 3
  componentes afetados (listagem, KPIs, gráficos) — nunca uma tela em branco, travamento ou erro de
  script visível ao usuário.

## Assumptions

- **Escopo da substituição terminológica (FR-001/002/003)**: interpretado como troca de raiz
  ("habilita-"→"qualifica-") em todo texto visível de interface — não literal só da palavra exata
  "habilitado" citada no pedido — porque o próprio critério de aceite do pedido ("o termo
  'qualificado' domina a interface") e a lista de superfícies afetadas ("tabelas, gráficos, modais,
  botões e alertas") não fazem sentido aplicados só ao particípio isolado, deixando "Habilitar"
  (botão) e "Vínculo de habilitação" (título) incoerentes com o resto da tela. Nomes de
  função/variável de backend e o vocabulário normativo dos documentos de referência ficam de fora
  (achado 6, FR-002) — não são "interface".
- **Vínculo Curso↔Instrutor para os filtros "Curso"/"Classificação de Curso" (FR-005)**: definido
  como união (OR) de qualificação ativa e seleção, não interseção nem só um dos dois — confirmado em
  `/speckit-clarify` (Clarifications, sessão 2026-08-17), não só assumido. É o critério mais
  inclusivo e o que corresponde à leitura natural de "este instrutor está associado a este curso",
  já que qualificação e seleção são, nos dados reais, conjuntos parcialmente sobrepostos e não um
  subconjunto estrito um do outro (achado 5/6 da spec 014). Uma implementação que quisesse
  diferenciar "instrutor curte este curso via qualificação" de "via seleção" exigiria 2 filtros
  separados, fora do escopo estrito de 8 categorias pedido.
- **Remoção dos filtros `Regime_Trabalho`/`Nivel_Escolaridade` da barra (FR-004)**: assumida como
  intencional, já que o pedido qualifica as 8 categorias como "estritas" — os dois campos continuam
  existindo e visíveis (um deles, `Regime_Trabalho`, já é coluna da listagem desde a spec 014); só
  deixam de ter caixa de seleção própria na barra de filtros.
- **Domínio de "Categoria" com os rótulos literais do pedido (FR-010)**: usa "Servidor Civil" e
  "Militar da Ativa" exatamente como o pedido especifica, em vez do rótulo "Civis"/"Militares da
  Ativa" já usado no gráfico "Classificação" existente (spec 014) — essa pequena divergência de
  rótulo entre o filtro (novo, texto do pedido) e o gráfico "Classificação" (já existente, fora do
  escopo desta spec) é aceita como está; harmonizar os dois rótulos, se desejado, fica para uma
  revisão futura, não bloqueia esta spec.
- **Nenhuma mudança de schema físico**: como em todos os hotfixes anteriores do módulo de
  Instrutores, esta spec não adiciona, remove nem renomeia nenhuma coluna de `instrutores`,
  `instrutor_disciplina` ou `disciplinas` — cumpre a restrição explícita do pedido ("ZERO
  alterações nas lógicas de gravação do banco de dados"); todos os atributos novos (Curso vinculado,
  Círculo Hierárquico, Status de filtro) são calculados em tempo de exibição, nunca persistidos.
