# Feature Specification: Hotfix e Refatoração UI/UX — Módulo de Instrutores

**Feature Branch**: `014-refatoracao-modulo-instrutores`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "HOTFIX e Refatoração UI/UX: Módulo de Instrutores. O módulo de
instrutores atual possui falhas graves de usabilidade e visualização de dados. Refatorar a camada
de apresentação (HTML/JS) e os endpoints de leitura (backend) deste módulo, sem quebrar as tabelas
do banco de dados. Escopo: (1) Dashboard/Estatísticas com Recharts — KPIs (Total, Capacitação
Didática, CH Total Ministrada no Ano, Taxa de Seleção Habilitados×Selecionados) e 7 gráficos
(Habilitados×Selecionados; Classificação; Posto/Graduação — PROIBIDA ordenação alfabética, ordem de
antiguidade obrigatória; OM; Escolaridade; Regime de Trabalho; Capacitação Didática); (2) Listagem e
filtros avançados (OM, Categoria, Capacitação, Regime, Escolaridade — filtro Ativo/Inativo pode ser
removido), colunas obrigatórias (Posto/Graduação, Nome Completo, Categoria, OM, Regime, CH Total no
ano), Nome Completo com negrito na palavra do Nome de Guerra quando houver; (3) Tela de edição em
painel largo/modal, ID do Instrutor e Carga Horária Ministrada estritamente readonly; (4) Vínculo de
habilitação sem IDs visíveis, texto do dropdown = "[Posto/Graduação] [Nome Completo]"."

## Contexto e achados confirmados no código e nos dados antes desta spec

Verificação direta do código (`app/(app)/instrutores/page.tsx`, `lib/acoes/instrutores.ts`,
`lib/acoes/`lib/acoes/estatisticas.ts``, `lib/acoes/crud.ts`) e do banco `instrutores` ao vivo (177
linhas, via Composio) antes de escrever qualquer requisito:

1. **O nome do instrutor está invisível em 175 dos 177 registros hoje — não é um defeito
   cosmético, é o achado mais grave desta spec.** `formatarNomeInstrutor_` (`components/ciaara/`, Épico A,
   RF-INSTR-15/RF-DS-05) monta o nome como `"P/G Esp_Hab_Obs " + <strong>Nome_Guerra</strong>` —
   mas `Nome_Guerra` está vazio em **175 de 177** instrutores da base viva (só "CAMPOS" e
   "JONATHAS" o têm preenchido). Para todos os outros, a função devolve só `"P/G Esp_Hab_Obs "`
   (ex.: `"SO -HN"`) — **nenhum nome de pessoa aparece**, em `app/(app)/instrutores/page.tsx` e também em
   `app/(app)/turmas/[turma]/dsa/page.tsx` (mesma função compartilhada). O próprio RF-INSTR-15 já documentado
   (`docs/fase-1/02-Requisitos-Funcionais.md:231`) pede o formato "P/G Especialidade/Habilitação
   **Nome Completo**, com o nome ou nomes de guerra em negrito" — `formatarNomeInstrutor_` nunca
   usou `Nome_Completo`, só `Nome_Guerra` isolado; o pedido do usuário nesta spec ("Nome Completo,
   negrito na palavra do Nome de Guerra, senão mantenha o nome completo normalmente") é a
   implementação correta de RF-INSTR-15 que nunca foi feita, não um requisito novo.
2. **`Posto_Graduacao` na base viva usa 11 códigos abreviados, não os nomes por extenso do
   pedido — mas mapeiam 1:1.** Domínio real (contagem): `2ºSG`(33), `1ºSG`(29), `3ºSG`(26),
   `1ºTen`(22), `SO`(17), `CC`(17), `CT`(14), `SC`(6), `CF`(6), `2ºTen`(5), `CMG`(2) — exatamente
   os 11 valores do pedido do usuário, na mesma ordem de antiguidade, mapeados abaixo (achado que
   evita o mesmo erro do Hotfix 013: assumir uma string de exibição sem checar o dado real).
3. **A ordem de antiguidade pedida revisa `RN-ANT-02`, não a contradiz por acaso.** O texto hoje
   registrado (`docs/fase-1/04-Regras-de-Negocio-a-Preservar.md:40`) é `CMG=1, CF=2, CC=3, CT=4,
   1°Ten=5, 2°Ten=6, SO=7, 1°SG=8, 2°SG=9, 3°SG=10, CB=11, MN=12` — sem `SC` (civil) e com `CB`/`MN`
   (Cabo/Marinheiro), que **não existem** no domínio real de `Posto_Graduacao` hoje. Isso já tinha
   sido informalmente decidido em 2026-08-14 (migração `normalizar_posto_graduacao.py`: `SC`
   reconhecido com peso 13), mas nunca formalizado de volta no texto da regra. A ordem de 11 itens
   pedida nesta spec (terminando em "Servidor Civil") formaliza exatamente essa decisão já tomada —
   fica registrado aqui como revisão de `RN-ANT-02`, a ser refletida no documento na fase de
   implementação, mesmo padrão já usado para P-14/RN-AVAL-02.
4. **`Categoria` na base viva tem exatamente os 4 valores do pedido.** `Militar da Ativa`(160),
   `TTC`(6), `SCNS`(6), `MMN`(5) — mapeiam para "Militares da Ativa", "TTC", "Civis" e "Magistério
   Militar Naval" respectivamente (achado: os 6 `SC` de Posto_Graduacao são os mesmos 6 `SCNS` de
   Categoria).
5. **`Carga_Horaria_Ministrada_Ano` está 100% vazio (0 de 177 linhas) e não é fórmula nativa** —
   confirmado célula a célula. `RN-INST-04` já documenta que essa grandeza "é sempre **calculada**,
   nunca digitada... somada dos registros efetivos do ano corrente". O KPI e a coluna "CH Total no
   ano" desta spec **não podem ler esse campo** — precisam ser calculados a partir de
   `registros_aula` (que já tem `ID_Instrutor`/`Tempos_Consumidos`/`Status`, mesmo
   padrão de agregação já usado em `getContextoInicial`/`lib/acoes/estatisticas.ts`), somando por
   `ID_Instrutor` as linhas `Categoria_Normativa='Aula'`, `Status≠'Cancelada'`, do ano corrente.
6. **`disciplinas.Instrutores_Selecionados` está quebrada (`#ERROR!` em toda linha
   verificada)** — confirmado ao vivo. O schema já documenta `ID_Instrutor` (lista bruta CSV) como
   "única fonte de verdade da atribuição" e `Instrutores_Selecionados` como só uma fórmula de
   exibição derivada dela — então "Selecionados" desta spec DEVE ser calculado fazendo o parse do
   CSV bruto de `disciplinas.ID_Instrutor` diretamente, nunca lendo a coluna quebrada. Contagem
   real: **131 instrutores habilitados** (`instrutor_disciplina`, vínculo `Status=Ativo`, distintos
   por `ID_Instrutor`) vs. **35 selecionados** (distintos em `disciplinas.ID_Instrutor`
   parseado) — próximo do exemplo do pedido ("177 habilitados, 33 selecionados"; o "177" do exemplo
   é, na prática dos dados, o total de instrutores, não os habilitados). **Achado adicional**: 10
   instrutores aparecem como selecionados sem ter vínculo de habilitação ativo — "Selecionados" não
   é um subconjunto estrito de "Habilitados" nos dados reais; a Taxa de Seleção deve ser apresentada
   com essa possibilidade em mente (Edge Case abaixo).
7. **`Instrutor_Completo` (coluna Z) é uma fórmula nativa real** —
   `=IFERROR(TRIM($C2&" "&$F2);"")` (Posto_Graduacao + Nome_Guerra) — e **não está protegida** em
   `COLUNAS_FORMULA['instrutores']` (`lib/acoes/crud.ts`, RN-CRUD-02): hoje nada impede
   `crudAtualizar` de sobrescrevê-la se algum payload a incluir. Junto com
   `Carga_Horaria_Ministrada_Ano` (achado 5, calculada pela aplicação, nunca nativa), são os dois
   campos que a Tela de Edição desta spec precisa bloquear — e o backend precisa reforçar essa
   proteção na camada de CRUD, não só esconder o campo na interface (RN-CRUD-02, defesa em
   profundidade).
8. **O vínculo de habilitação já esconde o ID da disciplina, mas não o formato pedido do
   instrutor.** `carregarDisciplinasParaVinculo` (`app/(app)/instrutores/page.tsx`) já popula `vincGrade` com
   nome da disciplina + curso, nunca o ID cru (Épico 009, FR-012) — nada a corrigir aí. `vincInstrutor`
   já não expõe o ID como texto visível, mas mostra só `Nome_Guerra` (`i.Nome_Guerra || i.ID_Instrutor`)
   — como `Nome_Guerra` está vazio em 98,9% dos casos (achado 1), o dropdown hoje mostra o
   `ID_Instrutor` cru como texto na prática, para quase todo mundo. Precisa virar
   `"[Posto_Graduacao] [Nome_Completo]"`, exatamente como pedido.
9. **`Capacitacao_Didatica` é um campo multivalorado (CSV), não booleano.** Valores reais:
   vazio(148), `C-Exp-TE`(10), `C-Esp-DID`(9), `Licenciatura`(6), e 3 combinações (`C-Exp-TE,
   C-Esp-DID` etc.). O KPI "Instrutores com Capacitação Didática" conta instrutores com o campo
   não-vazio; o gráfico (g) precisa separar por qualificação individual (um instrutor com duas
   qualificações contribui para as duas barras), não pelas 7 combinações brutas.

## Clarifications

Dos 4 pontos que teriam gerado `[NEEDS CLARIFICATION]` (mapeamento de Posto/Graduação, domínio de
Categoria, fonte de CH Ministrada, fonte de Habilitados/Selecionados), todos foram resolvidos por
leitura direta do código e da banco de produção antes de escrever os requisitos (achados 2, 4, 5, 6
acima) — o mesmo padrão já estabelecido nos hotfixes anteriores desta sessão. Restou 1 ambiguidade
real, deixada em aberto pelo próprio pedido original ("nova aba **ou** modal largo"), resolvida em
`/speckit-clarify`:

### Session 2026-08-17

- Q: A tela de edição do instrutor deve abrir como modal (largo, sobreposto à página atual) ou como
  uma nova aba do navegador de fato, considerando que o aplicação Next.js roda dentro de um página isolado do
  a URL do projeto na Vercel? → A: nova aba do navegador — o aplicação Next.js precisa de uma rota/deep-link nova
  (parâmetro de URL lido em `app/layout.tsx` (layout raiz), resolvido no boot da SPA) para abrir direto na tela de
  edição daquele instrutor. Diferente do achado de risco já documentado do Épico E (mutar
  `window.location.hash` da própria página carregada quebra o `postMessage` com o wrapper) — abrir
  uma nova aba com `window.open()`/`target="_blank"` carrega uma instância nova e independente do
  aplicação Next.js, sem mutar o hash da aba original, então não esbarra nesse risco específico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard de instrutores com dados corretos e antiguidade real (Priority: P1)

Um usuário abre o painel de estatísticas de Instrutores e precisa ver, de forma confiável, quantos
instrutores existem, quantos têm capacitação didática, quanta carga horária foi ministrada no ano, e
a taxa de habilitados-vs-selecionados — além de 7 gráficos, com o de Posto/Graduação **sempre** na
ordem de antiguidade (nunca alfabética), refletindo os dados reais de uma base com centenas de
instrutores.

**Why this priority**: É o achado de maior impacto de negócio: hoje o painel de estatísticas de
Instrutores só tem 3 KPIs (Total/Ativos/Inativos) e 1 gráfico (Posto/Graduação, ordenado
implicitamente pela ordem de leitura do banco, não por antiguidade) — quem usa o painel para
decisão (quantos instrutores capacitados existem, qual a taxa de aproveitamento dos habilitados) não
tem hoje nenhum desses números.

**Independent Test**: Abrir o painel de estatísticas de Instrutores com a banco de produção e conferir
os 4 KPIs e os 7 gráficos contra uma contagem manual no banco — em especial, confirmar que o
gráfico de Posto/Graduação aparece na ordem CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC,
mesmo que os dados cheguem do backend em outra ordem.

**Acceptance Scenarios**:

1. **Given** o banco `instrutores` com instrutores de todos os 11 postos/graduações, **When**
   o gráfico de Posto/Graduação renderiza, **Then** as barras aparecem na ordem de antiguidade
   (Capitão de Mar e Guerra primeiro, Servidor Civil por último), nunca em ordem alfabética nem na
   ordem de leitura do banco.
2. **Given** um instrutor com `Capacitacao_Didatica` preenchido com mais de uma qualificação (ex.:
   `"C-Exp-TE, C-Esp-DID"`), **When** o gráfico de Capacitação Didática renderiza, **Then** esse
   instrutor é contado em cada uma das barras das qualificações que possui, não em uma barra
   combinada.
3. **Given** a banco de produção, **When** o KPI "Carga Horária Total Ministrada no Ano" carrega,
   **Then** o valor exibido é a soma de `Tempos_Consumidos` de `registros_aula`
   (`Categoria_Normativa='Aula'`, `Status≠'Cancelada'`, ano corrente) por instrutor, nunca o campo
   `instrutores.Carga_Horaria_Ministrada_Ano` (sempre vazio hoje).
4. **Given** a banco de produção, **When** o KPI/gráfico "Habilitados vs. Selecionados" carrega,
   **Then** "Habilitados" conta `ID_Instrutor` distintos com vínculo `Status=Ativo` em
   `instrutor_disciplina`, e "Selecionados" conta `ID_Instrutor` distintos obtidos fazendo o parse
   do CSV bruto de `disciplinas.ID_Instrutor` — nunca lendo `Instrutores_Selecionados`
   (fórmula quebrada, achado 6).

---

### User Story 2 - Listar instrutores com nome legível e filtros avançados (Priority: P1)

Um usuário navega pela lista de instrutores e precisa identificar cada um pelo nome — hoje, para 175
dos 177 instrutores cadastrados, nenhum nome de pessoa aparece na tela, só o posto e a especialidade
— além de poder filtrar por OM, Categoria, Capacitação, Regime e Escolaridade, e ver Posto/Graduação,
Categoria, OM, Regime e Carga Horária Total no ano em colunas dedicadas.

**Why this priority**: É a mesma severidade da User Story 1 — sem nome visível, a lista de
instrutores não cumpre sua função básica de identificação para 98,9% dos registros reais.

**Independent Test**: Abrir a lista de instrutores com a banco de produção (que tem `Nome_Guerra`
vazio na grande maioria das linhas) e confirmar que todo instrutor mostra seu `Nome_Completo`
legível — com a palavra do `Nome_Guerra` em negrito só quando esse campo está preenchido.

**Acceptance Scenarios**:

1. **Given** um instrutor com `Nome_Guerra` vazio (caso mais comum: 175 de 177 hoje), **When** a
   lista renderiza, **Then** o campo Nome Completo exibe o `Nome_Completo` inteiro, sem nenhuma
   palavra em negrito.
2. **Given** um instrutor com `Nome_Guerra` preenchido (ex.: "CAMPOS", dentro de "DANIEL DE
   OLIVEIRA CAMPOS BORGES"), **When** a lista renderiza, **Then** só a palavra "CAMPOS" aparece em
   negrito dentro do nome completo — o resto do nome permanece em texto normal.
3. **Given** a barra de filtros avançados, **When** o usuário seleciona uma combinação de OM +
   Categoria + Capacitação Didática, **Then** a lista mostra só os instrutores que atendem a todos
   os filtros selecionados simultaneamente (E lógico entre filtros).
4. **Given** a listagem, **When** ela renderiza, **Then** as colunas visíveis são exatamente
   Posto/Graduação, Nome Completo, Categoria, OM, Regime e Carga Horária Total no ano — sem coluna
   de Status/Ativo-Inativo e sem `ID_Instrutor` cru visível.

---

### User Story 3 - Editar cadastro sem risco de alterar dado calculado (Priority: P2)

Um usuário clica para editar um instrutor e o sistema abre uma **nova aba do navegador** (Clarifications
2026-08-17), já carregada direto na tela de edição daquele instrutor, com as informações organizadas
em blocos visuais; os campos `ID_Instrutor` e `Carga_Horaria_Ministrada_Ano` aparecem como texto,
nunca como campo de formulário editável, e só os campos cadastrais pertinentes ficam abertos para
edição.

**Why this priority**: É uma proteção de integridade de dado (RN-CRUD-02/RN-INST-04), não um bloqueio
de uso diário — o cadastro já funciona hoje, só não impede tecnicamente a alteração acidental de um
campo calculado.

**Independent Test**: Clicar em "Editar" num instrutor, confirmar que uma nova aba abre já na tela
de edição daquele instrutor (sem navegação manual adicional), e que `ID_Instrutor` e
`Carga_Horaria_Ministrada_Ano` aparecem como texto simples (não `<input>`); tentar enviar um payload
de atualização contendo esses dois campos não altera seus valores no banco.

**Acceptance Scenarios**:

1. **Given** a lista de instrutores, **When** o usuário clica em "Editar" num instrutor, **Then**
   uma nova aba do navegador abre, já carregada na tela de edição daquele instrutor específico, sem
   exigir nenhuma navegação manual adicional (FR-010.1).
2. **Given** o painel de edição de um instrutor, **When** ele renderiza, **Then**
   `ID_Instrutor` e `Carga_Horaria_Ministrada_Ano` aparecem como texto somente-leitura, nunca dentro
   de um elemento `<input>`/`<select>`/`<textarea>` editável.
3. **Given** uma tentativa de gravação (legítima ou não) que inclua `Instrutor_Completo` ou
   `Carga_Horaria_Ministrada_Ano` no payload de atualização, **When** o backend processa a
   requisição, **Then** esses dois campos são ignorados na escrita — o restante dos campos válidos
   do payload é gravado normalmente.
4. **Given** o painel de edição, **When** ele renderiza, **Then** as informações aparecem
   organizadas em blocos visuais distintos (ex.: identificação, vínculo institucional, qualificação
   docente), não como uma lista única de campos.

---

### User Story 4 - Vincular habilitação sem precisar decorar IDs (Priority: P2)

Um usuário cria um vínculo de habilitação instrutor↔disciplina e escolhe o instrutor em um dropdown
cujo texto visível é sempre "[Posto/Graduação] [Nome Completo]" — nunca um ID cru nem só um
Nome_Guerra que pode estar vazio.

**Why this priority**: A disciplina do mesmo formulário já não expõe ID (achado 8) — falta só
corrigir o formato de exibição do instrutor, um ajuste menor e isolado.

**Independent Test**: Abrir o formulário de vínculo de habilitação e confirmar que toda opção do
dropdown de instrutor mostra "[Posto/Graduação] [Nome Completo]", nunca um ID numérico cru nem uma
opção em branco (para instrutores sem Nome_Guerra).

**Acceptance Scenarios**:

1. **Given** o dropdown de instrutor no formulário de vínculo, **When** ele é populado, **Then**
   cada opção exibe o texto "[Posto/Graduação] [Nome Completo]" (ex.: "SO ROSILVALDO FIGUEIRÓ
   PEREIRA"), e o `value` do `<option>` continua sendo o `ID_Instrutor` (usado internamente pelo
   backend, nunca mostrado ao usuário).

---

### Edge Cases

- Instrutor com `Nome_Guerra` preenchido mas que, por algum erro de digitação futuro, não seja uma
  substring de `Nome_Completo`: o sistema exibe o nome completo sem negrito nenhum, em vez de
  travar ou aplicar negrito no lugar errado (dado real de hoje: 0 dessas divergências existem, mas
  a função não deve presumir que a substring sempre bate).
- Instrutor selecionado (aparece em `disciplinas.ID_Instrutor`) sem vínculo de habilitação ativo
  (achado 6, 10 casos reais hoje): a Taxa de Seleção não trata "Selecionados" como subconjunto de
  "Habilitados" — os dois números são contados independentemente, sem forçar `min(selecionados,
  habilitados)` nem gerar percentual acima de 100% sem contexto (exibir os dois valores absolutos
  sempre, percentual como informação secundária).
- Instrutor com `Posto_Graduacao` fora do domínio fechado de 11 valores conhecidos (dado malformado
  futuro): não quebra o gráfico — aparece ao final da ordenação, numa faixa "Outros" separada, em
  vez de ser omitido silenciosamente (Princípio V da constitution, degradação segura).
- Instrutor com `Capacitacao_Didatica` vazio: não conta para o KPI nem para nenhuma barra do
  gráfico (g) — só os 29 com pelo menos uma qualificação contam.
- Filtros avançados combinados que não retornam nenhum instrutor: a lista mostra uma mensagem clara
  de "nenhum instrutor encontrado com esses filtros", nunca uma tela em branco sem explicação.
- Nova aba de edição aberta com um `ID_Instrutor` inválido, inexistente, ou de um instrutor fora do
  escopo de acesso do usuário logado (deep-link manipulado ou desatualizado, Clarifications
  2026-08-17): a nova aba exibe uma mensagem de erro clara, nunca uma tela em branco nem os dados de
  outro instrutor por engano — mesmo padrão de degradação segura de todo endpoint de leitura já
  existente no projeto (Hotfix 012).

## Requirements *(mandatory)*

### Functional Requirements

**Dashboard e Estatísticas**

- **FR-001**: O sistema DEVE exibir 4 KPIs no topo do painel de Instrutores: Total de Instrutores,
  Instrutores com Capacitação Didática (campo não-vazio), Carga Horária Total Ministrada no Ano
  (calculada de `registros_aula`, achado 5) e Taxa de Seleção (Habilitados vs.
  Selecionados, achado 6).
- **FR-002**: O sistema DEVE exibir 7 gráficos: Habilitados vs. Selecionados; Classificação
  (Categoria, achado 4); Posto/Graduação (achados 2/3); Organização Militar (OM); Escolaridade
  (`Nivel_Escolaridade`); Regime de Trabalho (`Regime_Trabalho`); Capacitação Didática (achado 9).
- **FR-003**: O gráfico de Posto/Graduação DEVE ordenar as barras estritamente pela escala de
  antiguidade de 11 postos — Capitão de Mar e Guerra, Capitão de Fragata, Capitão de Corveta,
  Capitão-Tenente, Primeiro-Tenente, Segundo-Tenente, Suboficial, Primeiro-Sargento,
  Segundo-Sargento, Terceiro-Sargento, Servidor Civil (nesta ordem) — mapeada aos códigos reais
  `CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC` (achado 2) — jamais ordem alfabética
  nem a ordem de leitura do banco.
- **FR-004**: "Habilitados" (FR-001/002) DEVE ser calculado como `ID_Instrutor` distintos com
  vínculo `Status=Ativo` em `instrutor_disciplina`; "Selecionados" DEVE ser calculado como
  `ID_Instrutor` distintos obtidos do parse do CSV bruto `disciplinas.ID_Instrutor` — nunca
  lendo `disciplinas.Instrutores_Selecionados` (fórmula quebrada, achado 6).
- **FR-005**: O gráfico de Capacitação Didática DEVE contar cada qualificação individual (ex.:
  `C-Exp-TE`, `C-Esp-DID`, `Licenciatura`) separadamente — um instrutor com múltiplas qualificações
  no mesmo campo CSV contribui para cada barra correspondente (achado 9).

**Listagem e Filtros**

- **FR-006**: A listagem de instrutores DEVE exibir, por padrão, exatamente estas colunas:
  Posto/Graduação, Nome Completo, Categoria, OM, Regime e Carga Horária Total no ano — sem coluna
  de status Ativo/Inativo e sem `ID_Instrutor` cru visível.
- **FR-007**: O campo Nome Completo DEVE exibir `Nome_Completo` do instrutor; quando
  `Nome_Guerra` estiver preenchido e for uma substring de `Nome_Completo`, essa palavra/trecho DEVE
  aparecer em negrito dentro do nome — quando `Nome_Guerra` estiver vazio (caso de 175 dos 177
  instrutores hoje), o nome completo aparece inteiro, sem nenhuma palavra em negrito.
- **FR-008**: O sistema DEVE oferecer filtros combináveis por OM, Categoria, Capacitação Didática,
  Regime de Trabalho e Escolaridade, aplicados em conjunto (E lógico) sobre a listagem.
- **FR-009**: O filtro de status Ativo/Inativo, se existir hoje na interface, PODE ser removido —
  não é um requisito de preservação desta spec.

**Tela de Edição**

- **FR-010**: Ao editar um instrutor, o sistema DEVE abrir uma nova aba do navegador (não um modal
  sobreposto à página atual) com um painel detalhado, informações organizadas em blocos visuais
  distintos, não como uma lista única de campos (Clarifications 2026-08-17).
- **FR-010.1**: A nova aba DEVE carregar diretamente na tela de edição do instrutor selecionado —
  via parâmetro de URL/deep-link resolvido no boot do aplicação Next.js (`app/layout.tsx` (layout raiz)) — sem exigir que o
  usuário navegue manualmente até o instrutor depois de abrir a aba (Clarifications 2026-08-17).
- **FR-011**: `ID_Instrutor` e `Carga_Horaria_Ministrada_Ano` DEVEM ser exibidos como texto
  somente-leitura na tela de edição — nunca dentro de um elemento de formulário editável.
- **FR-012**: O backend DEVE recusar-se a gravar `Instrutor_Completo` e
  `Carga_Horaria_Ministrada_Ano` mesmo que estejam presentes em um payload de atualização (RN-CRUD-02,
  achado 7) — defesa em profundidade além do bloqueio de interface de FR-011.
- **FR-013**: Apenas campos cadastrais pertinentes (identificação, vínculo institucional,
  qualificação docente — RN-INST-01/03) DEVEM ter campo de entrada liberado para edição na tela de
  edição. `Status` NÃO é um desses campos (achado do `/speckit-analyze`, F1/F5) — continua
  controlado exclusivamente pela ação dedicada já existente de ativar/desativar (RN-INST-02, Risco
  Alto, com o mesmo diálogo de confirmação de hoje), nunca por um `<select>` comum nesta tela; os 3
  campos de trilha de auditoria (`Editado_Por`, `Timestamp_Edicao`, `Origem_Migracao_v1`) também
  nunca são campos de formulário.

**Vínculo de Habilitação**

- **FR-014**: O dropdown de seleção de instrutor no formulário de vínculo de habilitação DEVE usar
  `ID_Instrutor` como `value` do `<option>`, mas o texto visível DEVE ser sempre
  "[Posto/Graduação] [Nome Completo]" — nunca um ID cru nem depender de `Nome_Guerra` (que está
  vazio na maioria dos registros, achado 8).
- **FR-015**: O dropdown de seleção de disciplina no mesmo formulário permanece inalterado (já
  oculta o `ID_Grade`, achado 8, Épico 009 FR-012) — fora de escopo desta spec.

### Key Entities

- **Instrutor** (`instrutores`): já existente, nenhum campo novo. Esta spec só muda como os
  campos já existentes (`Nome_Completo`, `Categoria`, `OM`, `Regime_Trabalho`, `Nivel_Escolaridade`,
  `Capacitacao_Didatica`, `Posto_Graduacao`) são lidos, agrupados, ordenados e exibidos — nenhuma
  mudança na estrutura da aba (constraint do pedido: "sem quebrar as tabelas do banco de dados").
- **Mapeamento Posto/Graduação → antiguidade/nome por extenso** (novo, só de exibição/ordenação):
  `CMG`→1/"Capitão de Mar e Guerra", `CF`→2/"Capitão de Fragata", `CC`→3/"Capitão de Corveta",
  `CT`→4/"Capitão-Tenente", `1ºTen`→5/"Primeiro-Tenente", `2ºTen`→6/"Segundo-Tenente",
  `SO`→7/"Suboficial", `1ºSG`→8/"Primeiro-Sargento", `2ºSG`→9/"Segundo-Sargento",
  `3ºSG`→10/"Terceiro-Sargento", `SC`→11/"Servidor Civil" — formaliza a revisão de `RN-ANT-02`
  descrita no achado 3.
- **Mapeamento Categoria → rótulo de exibição** (novo, só de exibição): `Militar da Ativa`→"Militares
  da Ativa", `TTC`→"TTC", `SCNS`→"Civis", `MMN`→"Magistério Militar Naval" (achado 4).
- **Habilitação** (`instrutor_disciplina`) e **Seleção/Atribuição** (`disciplinas.ID_Instrutor`):
  já existentes, nenhuma mudança de estrutura — só passam a alimentar o KPI/gráfico de
  Habilitados×Selecionados (achado 6).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O gráfico de Posto/Graduação aparece na ordem de antiguidade exata (11 postos) em
  100% dos carregamentos do painel, independentemente da ordem dos dados no banco.
- **SC-002**: O campo Nome Completo exibe um nome de pessoa legível para 100% dos instrutores
  cadastrados — hoje esse número é 2 de 177 (1,1%).
- **SC-003**: Os 4 KPIs e os 7 gráficos do painel de estatísticas batem exatamente com uma
  contagem/soma manual feita diretamente na banco de produção, incluindo a Carga Horária Total
  Ministrada no Ano (hoje sempre zero/vazia se lida do campo errado).
- **SC-004**: A tela de edição nunca permite alterar `ID_Instrutor` ou
  `Carga_Horaria_Ministrada_Ano` — verificável tanto pela ausência de campo editável na interface
  quanto por uma tentativa direta de gravação desses campos via backend não ter efeito.
- **SC-005**: Nenhum `ID_Instrutor` ou `ID_Grade` cru aparece como texto visível em nenhum dropdown
  do módulo de Instrutores.
- **SC-006**: Clicar em "Editar" em qualquer instrutor abre uma nova aba já carregada na tela de
  edição daquele instrutor específico, em 100% das tentativas, sem exigir navegação manual adicional
  (Clarifications 2026-08-17).

## Assumptions

- "Carga Horária Total Ministrada no Ano" (KPI e coluna) soma só `Categoria_Normativa='Aula'` de
  `registros_aula` no ano corrente — RN-INST-04 também menciona "avaliações
  fiscalizadas e atividades sob responsabilidade do instrutor" (via `avaliacoes.ID_Instrutor_
  Responsavel`/`ID_Fiscal`), mas incluir essas duas fontes adicionais é tratado como possível
  ampliação futura, não desta spec — mantém o escopo cirúrgico (Princípio IX) e usa exatamente o
  mesmo padrão de agregação já existente em `getContextoInicial` (achado 5).
- A revisão de `RN-ANT-02` (achado 3, formalizando `SC`=civil como o 11º posto/graduação, e
  removendo `CB`/`MN` da ordenação ativa por não existirem no domínio real de dados) é assumida como
  aprovada por já ter sido decidida informalmente em 2026-08-14 (migração
  `normalizar_posto_graduacao.py`) e por ser o próprio usuário, responsável do projeto, quem
  ditou a ordem de 11 itens nesta spec — a atualização formal do texto em
  `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` fica para a fase de implementação.
- `Instrutor_Completo` e `Carga_Horaria_Ministrada_Ano` sendo adicionados a
  `COLUNAS_FORMULA['instrutores']` (FR-012) é a forma de implementação assumida para "backend
  nunca escreve nesses campos" — mesmo mecanismo já usado para `atividades_nao_letivas.
  Compoe_CHT`/`avaliacoes.Status_Vista` (RN-CRUD-02), sem inventar um mecanismo novo.
- Esta spec não adiciona, remove nem renomeia nenhuma coluna física de `instrutores`,
  `instrutor_disciplina` ou `disciplinas` — cumpre a restrição explícita do pedido ("sem
  quebrar as tabelas do banco de dados"). A fórmula quebrada `disciplinas.Instrutores_
  Selecionados` (achado 6) não é corrigida nesta spec — contorná-la lendo `ID_Instrutor` diretamente
  é suficiente para o escopo pedido, e corrigi-la é uma mudança em `disciplinas`, fora do
  módulo de Instrutores.
- **Enumeração exata de campos editáveis na tela de edição (FR-013), fechada após o
  `/speckit-analyze`**: todo campo de `instrutores` é editável, **exceto** `ID_Instrutor`
  (FR-011), `Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano` (FR-011/012), `Status` (achado F1 —
  permanece exclusivo da ação dedicada de ativar/desativar já existente, RN-INST-02) e os 3 campos
  de trilha de auditoria `Editado_Por`/`Timestamp_Edicao`/`Origem_Migracao_v1` (nunca foram, em
  nenhuma tela deste projeto, campos de formulário). Fecha a ambiguidade que a spec original deixava
  em aberto só com "campos cadastrais pertinentes".
- **Achados reais descobertos durante a implementação (não previstos em `plan.md`/`research.md`)**:
  (a) `RN-ANT-01` (Risco Alto, `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`) exige que toda
  lista/seletor de instrutores — não só o gráfico de Posto/Graduação de FR-003 — seja ordenada por
  antiguidade crescente; aplicado tanto na listagem principal (FR-006) quanto no dropdown de
  vínculo de habilitação (FR-014), via uma função nova (`ordenarInstrutoresPorAntiguidade_`) que
  duplica no front-end o mesmo mapa de antiguidade do backend (`ESCALA_ANTIGUIDADE_POSTO`), mesmo
  padrão já usado no projeto para outras constantes de ordenação por view. (b)
  `Antiguidade_Declarada` (RN-ANT-02) nunca deve ser campo de formulário na tela de edição (FR-013)
  — já era uma decisão deliberada desde a Spec V4 ("ocultar o campo do formulário"), reafirmada
  aqui em vez de reintroduzida por engano.
- `formatarNomeInstrutor_` (`components/ciaara/`) é corrigida uma única vez, no componente compartilhado
  (RF-DS-05: "componente único e reutilizável, sem reimplementação por módulo") — o mesmo arquivo já
  é consumido por `app/(app)/turmas/[turma]/dsa/page.tsx`, que herda a correção como efeito colateral positivo, verificado
  como não-regressão (não como escopo novo desta spec).
