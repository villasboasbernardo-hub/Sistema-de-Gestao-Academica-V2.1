# Feature Specification: Hotfix — Regras Estritas de Nomenclatura Militar e Formatação

**Feature Branch**: `018-hotfix-nomenclatura-militar`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "HOTFIX: Regras Estritas de Nomenclatura Militar e Formatação (Módulo
de Instrutores). A formatação do nome de exibição dos instrutores requer precisão absoluta nas
regras da Marinha — ajustar a concatenação para exibir o Nome Completo (com o Nome de Guerra em
negrito) e tratar exceções específicas para o Corpo da Armada (CA). ZERO alterações na estrutura
das colunas do banco de dados. Dropdown de Especialidade/Habilitação/Observação (`Esp_Hab_Obs`)
passa a mostrar 'SIGLA - Nome' (valor gravado continua só a sigla)."

## Achados reais confirmados por leitura de código e dados (antes de qualquer requisito ser escrito)

Mesmo protocolo de todo hotfix anterior desta sessão — verificado contra o código publicado em
produção (`@38`, `o SHA do commit` `2026-08-17.HOTFIX017.1`) e a cópia local de trabalho do banco antes
de escrever qualquer requisito.

1. **`formatarNomeInstrutor_` hoje (`components/ciaara/`:82-94`)**: recebe um único objeto
   (não argumentos posicionais), **sempre** devolve HTML (não tem parâmetro `isHTML`), concatena só
   `[Posto] [Esp]` sem parênteses/hífen por círculo e sem exceção de `CA`. Precisa virar a nova
   assinatura posicional (`posto, esp, nomeCompleto, nomeGuerra, isHTML`).
2. **Inventário completo dos 6 pontos onde instrutor é exibido** (grep confirmado — "aplicação
   global" do pedido é exatamente estes pontos, nenhum outro "cartão" existe no projeto):
   - ``app/(app)/turmas/[turma]/dsa/page.tsx`:177` — célula da grade do DSA: já concatena Posto+Esp+Nome com negrito.
   - ``app/(app)/turmas/[turma]/dsa/page.tsx`:262` — dropdown de instrutor habilitado ao lançar Aula manual: já usa
     `.replace(/<[^>]+>/g, '')` para arrancar as tags `<strong>` do resultado antes de colocar
     dentro de `<option>` — a gambiarra que confirma exatamente o problema que `isHTML=false`
     resolve de verdade.
   - ``app/(app)/instrutores/page.tsx`:418` — coluna "Nome Completo" da tabela de listagem: chama só com
     `{Nome_Completo, Nome_Guerra}` (sem Posto/Esp), porque a tabela já tem uma coluna
     "Posto/Graduação" separada (FR-006 da spec 014, 6 colunas exatas).
   - ``app/(app)/instrutores/page.tsx`:1174` — cabeçalho da Ficha do Instrutor (spec 016): mesma chamada
     só-nome — o Posto/Graduação já aparece como linha própria na tabela da Ficha logo abaixo.
   - ``app/(app)/instrutores/page.tsx`:285-290` (`vincInstrutor`, dropdown de vínculo de qualificação): **hoje
     não usa `formatarNomeInstrutor_` nenhuma** — tem sua própria concatenação ad-hoc inline
     `${Posto_Graduacao} ${Nome_Completo}`, decisão deliberada da spec 014 (FR-014, "texto =
     [Posto/Graduação] [Nome Completo]", sem `Esp_Hab_Obs`).
3. **Dropdown de `Esp_Hab_Obs`** (`app/(app)/instrutores/page.tsx`, tipo `dropdown-fechado-sigla`): hoje
   mostra só o nome completo do catálogo como texto da `<option>`
   (`${CATALOGO_ESP_HAB_OBS[sigla]}`), não "SIGLA - Nome". O `value` já é só a sigla — nenhuma
   mudança necessária aí.
4. **Círculos hierárquicos**: os 2 arrays do pedido (Oficiais: `AE/VA/CA/CMG/CF/CC/CT/1ºTen/2ºTen`;
   Praças: `SO/1ºSG/2ºSG/3ºSG`) batem exatamente com o mapa já existente
   `CIRCULO_HIERARQUICO_POR_POSTO` (`app/(app)/instrutores/page.tsx`, spec 015). `SC` (Civil) hoje **não**
   está nesse mapa (cai em `''` para fins de filtro — Edge Case documentado na spec 015, "SC não
   pertence a nenhum círculo"; esse comportamento de filtro fica intocado). A classificação
   Oficial/Praça/Civil para formatação de nome é um conceito relacionado mas separado (só decide
   parênteses/hífen), e precisa de lógica própria dentro de `components/ciaara/` — esse arquivo é
   carregado por todas as views (inclusive `app/(app)/turmas/[turma]/dsa/page.tsx`, que não tem
   `CIRCULO_HIERARQUICO_POR_POSTO` definido), então não pode depender da constante de
   `app/(app)/instrutores/page.tsx`.
5. **Achado crítico de dado real**: `Esp_Hab_Obs` bruto tem artefatos de formatação legados
   conhecidos desde a spec 016 (achado 7) — confirmados agora na base real: `"-HN"` (Praça `SO`) e
   `"(T)"` (Oficial `CT`). Aplicar o hífen/parênteses estritos do pedido **sem normalizar esses
   artefatos primeiro** produziria `"SO--HN Nome"` (hífen duplicado) ou `"CT ((T)) Nome"`
   (parênteses duplicados) — um bug novo e concreto que a própria mudança pedida introduziria em
   dado já existente. A normalização (`normalizarEspHabObs_`, já existe em `app/(app)/instrutores/page.tsx`
   desde a spec 016 — só remove hífen/parênteses nas pontas) precisa ser aplicada à especialidade
   antes de montar o parênteses/hífen; como essa função também só existe em `app/(app)/instrutores/page.tsx`,
   a nova função em `components/ciaara/` precisa da própria cópia mínima dela.
6. **Zero registros reais têm `Esp_Hab_Obs="CA"` hoje** (confirmado via `openpyxl` contra a cópia
   local de trabalho) — a exceção de `CA` para Oficiais é preventiva para dado futuro, não
   corrige nada visivelmente quebrado hoje. `Posto_Graduacao` real da base: `1ºSG, 1ºTen, 2ºSG,
   2ºTen, 3ºSG, CC, CF, CMG, CT, SC, SO` — nenhum `AE/VA/CA` real ainda (domínio ampliado na spec
   016, sem uso real ainda).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o posto/especialidade/nome de um instrutor formatado corretamente (Priority: P1)

Um usuário vê, em qualquer tabela, grade ou ficha do sistema, o nome de um instrutor formatado
segundo as regras estritas da Marinha: posto, especialidade entre parênteses ou após hífen
(conforme o círculo hierárquico), e o nome completo com o nome de guerra em negrito — exceto para
Oficiais do Corpo da Armada, cuja sigla de especialidade nunca aparece ao lado do posto.

**Why this priority**: É o critério de aceite central do pedido — a regra de negócio de
nomenclatura militar em si. Sem isso, nenhuma das outras mudanças tem efeito visível correto.

**Independent Test**: Com instrutores de teste em cada círculo (Oficial com/sem especialidade,
Oficial com especialidade `CA`, Praça com especialidade `CA`, Civil), confirmar que o texto exibido
em qualquer tela segue exatamente as 4 regras de formato abaixo.

**Acceptance Scenarios**:

1. **Given** um Oficial com `Esp_Hab_Obs` vazio ou igual a `CA`, **When** seu nome é exibido em
   qualquer tela, **Then** o texto é `[Posto] [Nome Completo]` — a sigla `CA` nunca aparece ao lado
   do posto.
2. **Given** um Oficial com qualquer outra especialidade preenchida, **When** seu nome é exibido,
   **Then** o texto é `[Posto] ([Esp]) [Nome Completo]`.
3. **Given** uma Praça com qualquer especialidade preenchida, incluindo `CA` (Controle Aéreo),
   **When** seu nome é exibido, **Then** o texto é `[Posto]-[Esp] [Nome Completo]` — a exceção do
   Oficial nunca se aplica a Praças.
4. **Given** um Civil (`SC`), **When** seu nome é exibido, **Then** o texto é
   `[Posto] [Nome Completo]`, independentemente de `Esp_Hab_Obs`.
5. **Given** um instrutor com `Nome_Guerra` preenchido e presente dentro de `Nome_Completo`,
   **When** exibido numa tela que usa negrito (tabela, grade, ficha), **Then** só a parte
   correspondente ao nome de guerra aparece em negrito, o resto do nome completo permanece normal.
6. **Given** um instrutor sem `Nome_Guerra` preenchido, **When** exibido, **Then** o nome completo
   aparece sem nenhum negrito, sem erro.

---

### User Story 2 - Selecionar um instrutor num dropdown de alocação sem tags HTML (Priority: P2)

Um usuário abre um dropdown de seleção de instrutor (lançamento manual de Aula no DSA, vínculo de
qualificação) e vê o texto de cada opção com posto/especialidade/nome, sem nenhuma tag HTML
visível ou quebrando a exibição do navegador.

**Why this priority**: Já existe hoje uma solução paliativa (regex que arranca tags HTML) para um
dos dois dropdowns — funciona, mas é frágil. O segundo dropdown (vínculo) nem usa a formatação
padrão. Prioridade abaixo da User Story 1 porque não é um defeito visível hoje, é uma correção de
robustez e consistência.

**Independent Test**: Abrir o dropdown de instrutor ao lançar uma Aula manual no DSA e o dropdown
de instrutor ao criar um vínculo de qualificação; confirmar que o texto de cada opção seguen as
mesmas 4 regras de formato da User Story 1, sem nenhuma tag `<strong>` (nem visível, nem no HTML
gerado).

**Acceptance Scenarios**:

1. **Given** o dropdown de instrutor habilitado ao lançar uma Aula manual no DSA, **When** as
   opções são geradas, **Then** o texto de cada `<option>` é gerado sem nenhuma tag HTML (não
   depende mais de remover tags depois de gerar o texto).
2. **Given** o dropdown de instrutor ao criar um vínculo de qualificação, **When** as opções são
   geradas, **Then** o texto de cada `<option>` segue as mesmas 4 regras de formato da User Story 1
   (incluindo especialidade entre parênteses/após hífen conforme o círculo) — revisão deliberada da
   spec 014 (FR-014), que mostrava só `[Posto] [Nome]`, sem especialidade.

---

### User Story 3 - Ver a sigla junto ao nome da especialidade ao escolher no formulário (Priority: P3)

Um usuário no formulário de cadastro/edição de instrutor abre o dropdown de
Especialidade/Habilitação/Observação e vê, em cada opção, a sigla junto do nome por extenso.

**Why this priority**: Melhoria de usabilidade do formulário — mais fácil reconhecer a sigla que
será de fato gravada. Menor prioridade porque não afeta nenhuma regra de negócio, só a legibilidade
do próprio formulário de edição.

**Independent Test**: Abrir o formulário de cadastro/edição de instrutor, abrir o dropdown de
Especialidade/Habilitação/Observação, confirmar que cada opção mostra "SIGLA - Nome" e que salvar
grava só a sigla.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro/edição de instrutor aberto, **When** o dropdown de
   Especialidade/Habilitação/Observação é aberto, **Then** cada opção mostra o texto no formato
   "SIGLA - Nome da Especialidade" (ex.: "AM - Armamento").
2. **Given** uma opção selecionada nesse dropdown, **When** o formulário é salvo, **Then** o valor
   gravado em `Esp_Hab_Obs` continua sendo só a sigla, nunca o texto combinado.

---

### Edge Cases

- Instrutor sem `Nome_Guerra` preenchido (caso real comum na base) — nome completo exibido sem
  negrito, nunca um erro nem um `<strong>` vazio.
- `Esp_Hab_Obs` vazio ou não preenchido — nenhum parênteses/hífen aparece, formato vira
  `[Posto] [Nome Completo]` para qualquer círculo.
- `Esp_Hab_Obs` legado com artefato de formatação (`"-HN"`, `"(T)"`, achado 7 da spec 016) — a
  sigla é normalizada (traço/parênteses removidos das pontas) antes de montar o parênteses/hífen da
  regra de círculo, nunca duplicando o separador.
- `Posto_Graduacao` fora dos 3 círculos conhecidos (não deveria acontecer, domínio fechado desde a
  spec 016, mas degradação seguindo o Princípio V) — tratado como o círculo Civil: só
  `[Posto] [Nome Completo]`, nunca uma exceção não tratada.
- Praça com `Esp_Hab_Obs="CA"` — a sigla aparece normalmente (`[Posto]-CA [Nome]`); a exceção do
  Oficial nunca se aplica a Praças, mesmo com a mesma sigla.

## Requirements *(mandatory)*

### Functional Requirements

**Motor de formatação (US1)**

- **FR-001**: O sistema DEVE ter uma função de formatação de nome de instrutor que recebe posto,
  especialidade, nome completo, nome de guerra e uma opção de saída em HTML ou texto puro,
  separadamente (não um único objeto de instrutor).
- **FR-002**: Para um Oficial (`AE, VA, CA, CMG, CF, CC, CT, 1ºTen, 2ºTen`) sem especialidade ou com
  especialidade igual a `CA`, o formato DEVE ser `[Posto] [Nome Completo]` — a sigla `CA` nunca
  aparece ao lado do posto de um Oficial.
- **FR-003**: Para um Oficial com qualquer outra especialidade preenchida, o formato DEVE ser
  `[Posto] ([Especialidade]) [Nome Completo]`.
- **FR-004**: Para uma Praça (`SO, 1ºSG, 2ºSG, 3ºSG`) com especialidade preenchida, o formato DEVE
  ser `[Posto]-[Especialidade] [Nome Completo]` — incluindo quando a especialidade é `CA`
  (Controle Aéreo); a exceção de FR-002 nunca se aplica a Praças.
- **FR-005**: Para uma Praça sem especialidade preenchida, o formato DEVE ser
  `[Posto] [Nome Completo]`.
- **FR-006**: Para um Civil (`SC`) ou qualquer posto fora dos círculos conhecidos, o formato DEVE
  ser `[Posto] [Nome Completo]`, independentemente da especialidade.
- **FR-007**: A especialidade usada na formatação DEVE ser normalizada (removendo artefatos de
  formatação legados como hífen/parênteses nas pontas) antes de ser combinada com o
  parênteses/hífen da regra de círculo, para nunca duplicar o separador em dado legado.
- **FR-008**: Quando a saída é HTML, a função DEVE destacar em negrito a parte do nome completo
  correspondente ao nome de guerra, quando presente e localizável dentro do nome completo — sem
  exigir capitalização idêntica entre os dois campos.
- **FR-009**: Quando a saída é texto puro, o resultado DEVE ser idêntico ao HTML exceto pela
  ausência de qualquer marcação de negrito.
- **FR-010**: Um instrutor sem nome de guerra preenchido DEVE ser exibido com o nome completo sem
  nenhum destaque, nunca um erro.

**Aplicação global (US1/US2)**

- **FR-011**: Toda tela que exibe instrutores em formato de leitura (tabela de listagem, grade do
  DSA, Ficha do Instrutor) DEVE usar a saída em HTML da função de formatação.
- **FR-012**: Todo dropdown de seleção de instrutor para alocação (lançamento manual de Aula no
  DSA, vínculo de qualificação) DEVE usar a saída em texto puro da função de formatação — nenhuma
  tag HTML pode aparecer dentro de uma `<option>`.
- **FR-013**: O dropdown de vínculo de qualificação DEVE passar a exibir a especialidade do
  instrutor (quando aplicável, seguindo as regras de FR-002 a FR-006), revisando o formato anterior
  que mostrava só posto e nome.

**Dropdown de Especialidade/Habilitação/Observação (US3)**

- **FR-014**: O dropdown de Especialidade/Habilitação/Observação no formulário de cadastro/edição
  DEVE exibir cada opção no formato "SIGLA - Nome da Especialidade".
- **FR-015**: O valor gravado ao salvar o formulário DEVE continuar sendo só a sigla, nunca o texto
  combinado exibido na opção.

### Key Entities

Nenhuma entidade de dado nova ou alterada — hotfix de formatação de exibição, zero mudança de
schema (confirmado: "ZERO alterações na estrutura das colunas do banco de dados").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos Oficiais com especialidade `CA` são exibidos sem a sigla `CA` ao lado do
  posto, em qualquer tela do sistema.
- **SC-002**: 100% das Praças com especialidade `CA` continuam exibindo `-CA` ao lado do posto,
  sem serem afetadas pela exceção do Oficial.
- **SC-003**: 100% dos nomes exibidos em tabelas, grade do DSA e Ficha do Instrutor mostram o nome
  de guerra em negrito quando presente no cadastro.
- **SC-004**: 0 tags HTML aparecem no texto ou no código-fonte de qualquer `<option>` de dropdown
  de seleção de instrutor.
- **SC-005**: 100% das opções do dropdown de Especialidade/Habilitação/Observação mostram o formato
  "SIGLA - Nome", com o valor salvo permanecendo só a sigla.

## Assumptions

- A função de formatação mantém o sufixo `_` já usado por toda função JavaScript privada do
  projeto (`mascaraNip_`, `calcularAntiguidadeDeclarada_` etc.) — o pedido original escreveu o nome
  sem esse sufixo, tratado como imprecisão do pedido, não uma intenção deliberada de quebrar a
  convenção estabelecida.
- A comparação entre nome completo e nome de guerra para aplicar o negrito continua
  case-insensitive e com escape seguro de caracteres especiais (comportamento já existente,
  validado desde o Hotfix Módulo de Instrutores) — mais robusta que uma substituição literal
  ingênua, sem mudar nenhum resultado visível correto para os registros reais de hoje.
- A coluna "Posto/Graduação" separada na tabela de listagem e a linha própria de posto na Ficha do
  Instrutor permanecem como estão — a nova formatação de posto/especialidade não é duplicada dentro
  da célula/cabeçalho de nome nesses 2 lugares, evitando repetir a mesma informação duas vezes na
  mesma tela.
- O prefixo de posto/especialidade usa sempre a sigla (normalizada), nunca o nome por extenso do
  catálogo — consistente com os próprios exemplos do pedido (`(RM2-T)`, `-CA`) e com o
  comportamento já existente da função atual.
