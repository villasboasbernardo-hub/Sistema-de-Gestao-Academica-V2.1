# Especificação: Épico 5, fatia (c) — Cadastro de instrutores

**Criado**: 10/09/2026 · **Épico**: 5 — Cadastros · **Fatia**: (c), instrutores
**Fontes**: [documento 02](../../docs/fase-1/02-Requisitos-Funcionais.md) `RF-INSTR-01` a `RF-INSTR-16`,
`RF-CRUD-01` a `RF-CRUD-04` · [documento 04](../../docs/fase-1/04-Regras-de-Negocio-a-Preservar.md)
`RN-ANT-01/02`, `RN-CRUD-01/02/03`, `RN-INST-01` a `RN-INST-05` ·
[documento 06, Épico 5 e tabela §4](../../docs/fase-1/06-Backlog-de-Epicos-V2.1.md) ·
[documento 23](../../docs/fase-2/23-Design-System-Tailwind-shadcn.md) ·
[documento 25](../../docs/fase-2/25-Camada-de-Dados-e-Estado.md)

## Contexto

O Épico 5 entrega os quatro cadastros estruturantes. Ele foi subdividido em três fatias; esta é a
**(c), instrutores** — **a maior massa de funcionalidade da v2.0 e a que Bernardo mais usou e
refinou**. As fatias (a), cursos e turmas, e (b), disciplinas, seguem o mesmo molde e ficam
registradas ao final.

⚠️ **Esta fatia é PORTE, não invenção.** Ela reconstrói o que a v2.0 acumulou ao longo de **oito
specs** — 014, 015, 016, 019, 020, 025, 036 e 038 —, cada uma um refinamento que alguém pediu depois
de usar. **O risco dominante não é errar: é perder um refinamento** que ninguém lembra de cobrar
até fazer falta.

### O inventário é a tabela §4 do documento 06, e ele vem antes do código

| Spec da v2.0 | O que ela entregou |
|---|---|
| `014-refatoracao-modulo-instrutores` | O módulo |
| `015-hotfix-filtros-cross-instrutores` | Filtros e *cross-filtering* |
| `016-ficha-formulario-instrutores` | Ficha e formulário avançado |
| `019-atribuicao-disciplinas-instrutor` | Painel de atribuição de disciplinas |
| `020-hotfix-refinamento-listagem-instrutores` | Listagem e algoritmo de nome de guerra |
| `025-ficha-spa-mascaras-schema` | Máscaras de entrada e schema |
| `036-disciplinas-crud-antiguidade` | Ordenação hierárquica por antiguidade |
| `038-hotfix-edicao-inline-datas-admin` | **Remoção** da edição em linha; persistência de datas |

⚠️ **A 038 removeu comportamento.** Reintroduzir edição em linha "para agilizar" desfaz uma correção
que já foi feita uma vez.

## Clarifications

### Session 2026-09-10

- Q: Quem pode **escrever** CPF, RG, telefone e endereço, já que o recorte do Épico 3 governa apenas a leitura? → A: **Espelhar a leitura.** Os mesmos três perfis que leem identificação civil e residência são os únicos que a escrevem. Quem não vê, não escreve.
- Q: Como os civis entram na ordenação, se a escala do documento 04 vai de `CMG=1` a `MN=12`? → A: **Peso 13 para `SC` e `SCNS`**, como o schema já faz. Civis depois de todos os militares, com a antiguidade declarada como desempate entre eles.
- Q: O que acontece com a conta de acesso quando o instrutor vinculado é desativado? → A: **Nada.** Os dois ciclos de vida são independentes, e a tela de usuários mostra que o instrutor vinculado está inativo.
- Q: Quais indicadores e gráficos a tela precisa ter, já que o requisito diz "entre outros pertinentes"? → A: **Fechar a lista extraindo das specs 014 e 015 da v2.0.** Extraído em 10/09/2026: **4 indicadores e 7 gráficos**, mais os filtros, as colunas obrigatórias da listagem e três refinamentos que "entre outros pertinentes" teria engolido.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A ordem é sempre a da antiguidade (Priority: P1)

Quem escolhe um instrutor — em lista, em seletor, em filtro, em qualquer tela — precisa vê-los
**sempre na mesma ordem**, a da antiguidade, porque é assim que a instituição os enxerga e é assim
que a LIQ os imprime.

**Why this priority**: é o `RN-ANT-01`, **Risco: Alto**, e é a única regra deste sistema que é
transversal a praticamente toda a interface. Errar aqui não quebra uma tela: quebra todas, mais a
seção 1 da LIQ.

**Independent Test**: enumerar **todas** as ocorrências de lista, seletor e filtro de instrutor no
sistema e conferir a ordem em cada uma — não por amostragem.

**Acceptance Scenarios**:

1. **Dado** instrutores de postos diferentes, **quando** qualquer lista os apresenta, **então** eles
   aparecem em ordem crescente de antiguidade, **derivada do posto/graduação**.
2. **Dado** dois instrutores de **mesmo posto**, **quando** a lista os apresenta, **então** o
   desempate é a antiguidade declarada, e apenas ela.
2.1. **Dado** um instrutor civil e um militar, **quando** a lista os apresenta, **então** o civil
   vem **depois** de todos os militares — e o desempate entre dois civis é o mesmo.
3. **Dado** uma tela nova qualquer, **quando** ela exibe instrutores, **então** ela já nasce
   ordenada — sem que o autor precise lembrar.

---

### User Story 2 - O cadastro não aceita ficar pela metade (Priority: P1)

Quem cadastra um instrutor precisa ser **impedido** de salvar sem posto, especialidade, nome,
categoria e organização militar — porque cadastro incompleto vira lançamento impossível meses
depois, quando ninguém lembra quem era a pessoa.

**Why this priority**: é o `RN-INST-03`, e é o que separa base de dados de rascunho.

**Independent Test**: tentar salvar sem cada um dos cinco campos, e por caminho que não seja a tela.

**Acceptance Scenarios**:

1. **Dado** um dos cinco campos vazio, **quando** se tenta salvar, **então** a operação é recusada
   e a mensagem diz **qual** campo falta.
2. **Dado** um dos cinco campos preenchido **só com espaços**, **quando** se tenta salvar, **então**
   é recusado igual. ⚠️ Texto em branco é ausência disfarçada.
3. **Dado** a recusa, **quando** ela acontece, **então** nada é salvo pela metade.

---

### User Story 3 - A carga horária é lida, nunca digitada (Priority: P1)

Quem administra precisa ver **duas grandezas de carga horária** — a ministrada no ano e a prevista —
e precisa que elas sejam **sempre o reflexo do que está lançado**, não um número que alguém
escreveu e esqueceu de atualizar.

**Why this priority**: é o `RN-INST-04`, **[AMPLIADA]**. Um número de CH digitado à mão é a origem
de toda divergência entre o sistema e a realidade.

**Independent Test**: procurar campo de CH editável em **qualquer** formulário do sistema; não deve
existir nenhum.

**Acceptance Scenarios**:

1. **Dado** qualquer formulário de instrutor, **quando** ele é exibido, **então** **não existe**
   campo de carga horária digitável.
2. **Dado** um lançamento novo do instrutor, **quando** ele é salvo, **então** a CH ministrada
   reflete o novo total sem nenhuma ação adicional.
3. **Dado** uma tentativa de escrever CH por fora da tela, **quando** ela ocorre, **então** é
   recusada.

---

### User Story 4 - O sistema avisa, e não impede (Priority: P2)

Quem administra precisa **ver** quando a carga semanal prevista de alguém sai da faixa do regime, e
quando alguém leciona há mais de um ano sem capacitação didática — **sem que o sistema o proíba de
trabalhar**.

**Why this priority**: é o `RF-INSTR-14` e o `RF-INSTR-16`, sob o `RN-DEG-02`: **regra normativa
vira alerta, nunca bloqueio**. Transformar em bloqueio muda a regra de negócio.

**Independent Test**: pôr um instrutor fora da faixa e conferir que o aviso aparece **e** que tudo
continua funcionando.

**Acceptance Scenarios**:

1. **Dado** um instrutor de regime 20h com previsão de 14h, **quando** a ficha é exibida, **então**
   há aviso de fora da faixa 8–12h — e nada é impedido.
2. **Dado** um instrutor de regime 40h com previsão de 20h, **quando** a ficha é exibida, **então**
   **não** há aviso: 20h está dentro de 16–24h. ⚠️ **O teto é a FAIXA, jamais o número do regime.**
3. **Dado** docência iniciada há mais de um ano sem capacitação didática registrada, **quando** a
   ficha é exibida, **então** há aviso — e nada é impedido.

---

### User Story 5 - Desativar preserva o passado (Priority: P2)

Quem administra precisa tirar um instrutor das atribuições **futuras** sem apagar nada do que ele já
fez — porque o histórico já lançado tem o nome dele, e ele continua tendo dado aquelas aulas.

**Why this priority**: é o `RN-INST-02` e a regra 4 do projeto: **nada é apagado**.

**Independent Test**: desativar alguém com histórico e conferir os dois lados — sumiu das listas de
nova atribuição, permaneceu em tudo o que já estava lançado.

**Acceptance Scenarios**:

1. **Dado** um instrutor ativo com aulas lançadas, **quando** ele é desativado, **então** ele
   **deixa de aparecer** em listas de nova atribuição.
2. **Dado** o mesmo instrutor, **quando** o histórico é consultado, **então** ele **continua lá**,
   com nome e vínculos.
3. **Dado** um instrutor desativado, **quando** ele é reativado, **então** volta às listas sem
   perder nada.
4. **Dado** um instrutor que também tem conta de acesso, **quando** ele é desativado, **então** a
   conta **continua ativa** — e a tela de usuários mostra que o instrutor vinculado está inativo.

---

### User Story 6 - A ficha mostra o que a v2.0 mostrava (Priority: P2)

Quem usa o módulo diariamente precisa reencontrar o que já existia: ficha e formulário avançado,
máscaras de entrada, filtros cruzados, indicadores, gráficos e o quadro de avisos de qualidade de
cadastro.

**Why this priority**: é a **paridade**, e é o que o Épico 5 existe para entregar. Sem ela a v2.1
não substitui a v2.0.

**Independent Test**: percorrer a tabela §4 do documento 06, item a item, e apontar onde cada
refinamento reaparece.

**Acceptance Scenarios**:

1. **Dado** o módulo pronto, **quando** se compara com o inventário das oito specs, **então** cada
   refinamento tem endereço na v2.1.
2. **Dado** um campo com formato conhecido, **quando** é digitado, **então** a máscara o assiste.
3. **Dado** um filtro aplicado, **quando** outro é aplicado junto, **então** o segundo opera sobre
   o resultado do primeiro.
4. **Dado** a listagem, **quando** ela é exibida, **então** **não há edição em linha** — a 038 a
   removeu, e ela não volta.

## Requirements *(mandatory)*

### Functional Requirements

#### Antiguidade — a regra transversal

- **FR-001**: Toda lista, seletor e filtro de instrutores MUST ser ordenado por **antiguidade
  crescente**, sem exceção, em qualquer tela (`RN-ANT-01`, `RF-INSTR-05`).
- **FR-002**: A antiguidade MUST ser derivada do **posto/graduação**, pela escala fixa em que peso
  menor é mais antigo, de `CMG` a `MN`. As categorias **civis** `SC` e `SCNS` MUST receber o peso
  **imediatamente posterior ao último posto militar**, de modo que apareçam **depois** de todos os
  militares. A **antiguidade declarada** MUST ser usada **apenas como desempate** entre instrutores
  de mesmo peso — militares ou civis (`RN-ANT-02`).
  ⚠️ **A parte civil é decisão de 10/09/2026, e ela documenta o que já existia.** A escala do
  documento 04 termina em `MN` e **não cobre civis**; o schema já resolvia por peso 13, citando um
  achado da própria v2.0. Sem isto escrito, cada tela ordenaria os civis de um jeito — e a
  ordenação que precisa ser idêntica em todo lugar deixaria de ser.
  ⚠️ **Inverter os dois quebra a ordenação do sistema inteiro e a seção 1 da LIQ.** A antiguidade
  declarada é campo legado preservado por decisão, não critério primário.
- **FR-003**: A escala de posto/graduação MUST ser **dado administrável**, não constante em código
  (`RNF-NORM-08`, Princípio VII).
- **FR-004**: MUST existir **um único ponto de construção** de seletor de instrutor na aplicação.
  ⚠️ É o que faz "esquecer numa tela nova" deixar de ser possível, em vez de depender de disciplina.

#### Cadastro e ciclo de vida

- **FR-005**: O sistema MUST recusar salvar cadastro sem **posto/graduação, especialidade,
  nome completo, categoria e organização militar** — inclusive quando preenchidos só com espaços
  (`RN-INST-03`, `RF-INSTR-02`).
- **FR-006**: A recusa MUST valer **por qualquer caminho**, não apenas pela tela.
- **FR-007**: O identificador de instrutor MUST ser gerado automaticamente e MUST ser **inteiro
  simples, sem prefixo** (`RN-CRUD-03`, exceção documentada).
  ⚠️ **Unificar com o padrão prefixado quebra referências existentes.** Todo o restante do sistema
  já interpreta o identificador de instrutor como número.
- **FR-008**: A exclusão MUST ser **lógica**, por status explícito, nunca física (`RN-INST-02`,
  `RN-INST-05`). O status MUST ser explícito, **nunca inferido de ausência**.
- **FR-009**: Instrutor desativado MUST sair das listas de **nova** atribuição e MUST **permanecer**
  em todo histórico já lançado (`RF-INSTR-07`).
- **FR-010**: MUST ser possível **reativar** um instrutor desativado, sem perda.
- **FR-010.1**: Desativar um instrutor MUST **não** alterar a conta de acesso da pessoa, quando
  existir vínculo entre as duas. A tela de usuários MUST **mostrar** que o instrutor vinculado está
  inativo.
  ⚠️ **São dois cadastros com ciclos de vida diferentes, e o Épico 3 já decidiu isto na direção
  inversa**: usuário ligado a instrutor inativo mantém o vínculo, e a tela mostra a situação.
  Desativar o docente diz que ele **não recebe aula nova** — não que perdeu o acesso. Quem
  administra o sistema continua administrando.
  ⚠️ **As duas escolhas erradas são ruins de jeitos opostos**: desativar em cascata tira o acesso
  de alguém por um ato que não era sobre isso; ignorar o vínculo esconde de quem administra que
  existe conta ativa ligada a docente inativo.
- **FR-011**: O salvamento de cadastro novo ou edição MUST pedir **confirmação** (`RF-INSTR-11`).
- **FR-012**: Ao editar, todos os campos MUST vir carregados com os valores salvos, **nenhum em
  branco por engano** (`RF-INSTR-04`).
- **FR-013**: A listagem MUST **não** ter edição em linha (spec 038 da v2.0, que a removeu).

#### Carga horária — calculada, nunca digitada

- **FR-014**: MUST existir **duas grandezas de carga horária distintas, ambas calculadas**: a
  **ministrada no ano** e a **prevista** (`RN-INST-04`, `RF-INSTR-13`).
- **FR-015**: **Não MUST existir campo de carga horária digitável** em formulário algum, e a
  escrita por fora da tela MUST ser recusada.
  ⚠️ **"Permitir ajuste manual" é proibido.** É grandeza derivada; um número digitado é a origem de
  toda divergência entre o sistema e a realidade.

#### Alertas normativos — avisam, não bloqueiam

- **FR-016**: A carga semanal prevista MUST ser comparada contra a **faixa** do regime:
  **20h → 8–12h · 40h → 16–24h · Dedicação Exclusiva → 16–30h** (`RN-2027-06`, `RF-INSTR-14`).
  ⚠️ **O teto é a FAIXA, jamais o número do regime.** Um instrutor de 40h com 20h previstas está
  **dentro**, não no limite.
- **FR-017**: MUST ser sinalizado o instrutor em docência há **mais de um ano sem capacitação
  didática** (`RF-INSTR-16`).
- **FR-018**: Os alertas dos `FR-016` e `FR-017` MUST ser **avisos, nunca bloqueios** (`RN-DEG-02`).
  ⚠️ Transformá-los em impedimento **muda a regra de negócio** e exige autorização nominal.

#### Nome e apresentação

- **FR-019**: O nome MUST aparecer no formato **`P/G Especialidade Nome de Guerra`** em toda tela
  (`RF-INSTR-15`, `RF-DS-05`).
- **FR-020**: A montagem do nome MUST vir de **função pura de domínio**, e MUST ser exibida por
  **um único componente** — não remontada em cada tela.

#### Habilitação e atribuição

- **FR-021**: Um instrutor só MUST poder ser escolhido para **ministrar** ou ser **responsável** por
  uma disciplina se existir vínculo de habilitação explícito (`RN-INST-01`).
  ⚠️ **A regra é delimitada**: avaliação e vista de prova **não** exigem habilitação.
- **FR-022**: MUST existir **painel de atribuição de disciplinas** ao instrutor (spec 019 da v2.0).

#### Refinamentos da v2.0 que MUST reaparecer

- **FR-023**: Ficha individual e **formulário avançado** (specs 016 e 025).
- **FR-024**: **Máscaras de entrada** nos campos de formato conhecido (spec 025).
- **FR-025**: **Filtros avançados e cross-filtering** — filtro aplicado sobre o resultado do
  anterior (spec 015). Os filtros MUST ser, no mínimo: **OM, categoria, capacitação, regime e
  escolaridade**.
- **FR-026**: MUST existir **quatro indicadores**, e são estes — a lista é **fechada**, extraída da
  spec 014 em 10/09/2026, e "entre outros pertinentes" do `RF-INSTR-08` deixa de ser aceitável como
  redação:
  1. **Total de instrutores**;
  2. **Instrutores com capacitação didática** — conta quem tem o campo **não vazio**;
  3. **CH total ministrada no ano**;
  4. **Taxa de seleção, habilitados × selecionados**.
- **FR-026.1**: A taxa de seleção MUST exibir **os dois valores absolutos sempre**, e o percentual
  apenas como informação secundária.
  ⚠️ **Selecionados NÃO é subconjunto de habilitados.** A v2.0 mediu **10 casos reais** de instrutor
  selecionado sem vínculo de habilitação ativo. Forçar o menor dos dois, ou esconder um percentual
  acima de 100%, apagaria justamente a inconsistência que o número existe para revelar.
- **FR-026.2**: MUST existir **sete gráficos**, e o de **posto/graduação** MUST vir **sempre em
  primeiro** e **sempre em ordem de antiguidade**: habilitados × selecionados, classificação,
  **posto/graduação**, OM, escolaridade, regime de trabalho e capacitação didática.
  ⚠️ **Ordenação alfabética é PROIBIDA** nesse gráfico — está escrito assim na spec 014.
- **FR-026.3**: Posto/graduação fora do domínio conhecido MUST aparecer numa faixa **"Outros"** ao
  final da ordenação, **nunca ser omitido em silêncio** (Princípio V, degradação segura).
- **FR-026.4**: No gráfico de capacitação didática, um instrutor com **duas** qualificações MUST
  contar em **ambas** as barras; quem tem o campo vazio MUST **não** contar em nenhuma.
- **FR-027**: **Quadro de avisos de qualidade de cadastro** (`RF-INSTR-09`).
- **FR-027.1**: A listagem MUST trazer, no mínimo, as colunas **posto/graduação, nome completo,
  categoria, OM, regime e CH total no ano** (spec 014).
- **FR-027.2**: No nome completo, a palavra correspondente ao **nome de guerra** MUST aparecer em
  negrito, quando houver (spec 014).
- **FR-027.3**: Nenhum seletor de instrutor MUST exibir identificador técnico ao usuário (spec 014).
- **FR-027.4**: Filtro combinado que não retorna ninguém MUST mostrar mensagem clara — e MUST
  distinguir *"não há"* de *"você não tem permissão de ver"* (`RN-DEG-01`, e é o gotcha nº 4 do
  BRIEF).
- **FR-028**: O estado de tela — filtro aplicado, instrutor selecionado — MUST viver **na URL**, de
  modo que recarregar ou compartilhar o endereço reproduza a mesma tela (`RF-NAV-01`).
- **FR-029**: Toda escrita MUST ser registrada com autoria e momento (`RF-INSTR-12`).

#### Dado pessoal — a metade da escrita, que estava aberta

- **FR-032**: A **escrita** das colunas de identificação civil e residência MUST ser restrita aos
  **mesmos três perfis** que hoje as leem, e a restrição MUST ser **por coluna**, imposta pelo
  banco.
  ⚠️ **Medido em 10/09/2026, e é o motivo deste requisito existir**: `authenticated` tem `SELECT`
  em 33 colunas de `instrutores` e `UPDATE` em **45**. O mesmo perfil que **não consegue ler** o
  CPF **consegue gravá-lo**. O recorte do Épico 3 revogou apenas o `select`.
  ⚠️ **A regra fica dizível numa frase: quem não vê, não escreve.** Qualquer recorte diferente
  exigiria explicar por que alguém edita às cegas um campo que não pode conferir — e edição às
  cegas de CPF é como um dado se apaga sem ninguém notar.
- **FR-033**: MUST existir **teste negativo por perfil** para a escrita, como já existe para a
  leitura. ⚠️ Provar só o caminho autorizado não prova nada sobre o recorte.

#### Preferências e ficha

- **FR-030**: MUST ser possível registrar **preferências e restrições gerais** do instrutor
  (`RF-INSTR-06`). As preferências **por turma e por disciplina** do `RF-INSTR-06.1` ficam para
  **depois da fatia (b)**.
  ⚠️ **Decisão de 10/09/2026**: antecipá-las exigiria inventar a estrutura de disciplina por turma,
  que é justamente o que a fatia (b) constrói. Preferência presa a uma disciplina que ainda não
  existe por turma é dado sem onde morar.
- **FR-031**: MUST existir **ficha individual do instrutor em tela** (`RF-INSTR-10`). A **saída em
  PDF e a rota de impressão** ficam para o **Épico 11**.
  ⚠️ **Decisão de 10/09/2026**: adiar a ficha inteira quebraria a paridade com a v2.0 num ponto que
  Bernardo usa; e o `FR-023` já a pressupõe. O que fica para o Épico 11 é o **documento**, não a
  leitura.

### Key Entities

- **Instrutor** — o docente. Identificado por inteiro simples. Cinco campos obrigatórios. Status
  explícito. Antiguidade derivada do posto, com desempate declarado.
- **Vínculo instrutor↔disciplina** — a habilitação. Sem ele não há atribuição de aula.
- **Carga horária do instrutor** — **duas grandezas derivadas**, nunca armazenadas como entrada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** das ocorrências de lista, seletor e filtro de instrutor no sistema estão
  ordenadas por antiguidade — contadas e verificadas **uma a uma**, não por amostragem.
- **SC-002**: A contagem de campos de carga horária digitáveis em todo o sistema é **zero**.
- **SC-003**: Cadastro sem qualquer um dos cinco campos obrigatórios é recusado em **100%** das
  tentativas, inclusive fora da tela.
- **SC-004**: Instrutor desativado desaparece de **100%** das listas de nova atribuição e permanece
  em **100%** dos registros históricos já lançados.
- **SC-005**: O nome aparece no formato padronizado em **100%** das telas que o exibem.
- **SC-006**: Um instrutor de 40h com 20h previstas **não** gera alerta; um de 20h com 14h **gera**.
  Nenhum dos dois é impedido de nada.
- **SC-007**: Cada um dos refinamentos das **oito specs** do inventário tem endereço apontado na
  v2.1 — a lista é percorrida item a item e **nenhum fica sem resposta**.
- **SC-007.1**: São exibidos **4 indicadores** e **7 gráficos**, e o de posto/graduação está em
  primeiro, em ordem de antiguidade. Contagem exata, não "aproximadamente".
- **SC-008**: Recarregar a página com filtros aplicados reproduz **exatamente** a mesma tela.
- **SC-010**: O número de perfis que **escrevem** identificação civil e residência é **igual** ao
  número que as **lê** — três —, e a diferença entre colunas com `SELECT` e colunas com `UPDATE`
  para o papel autenticado é **zero**. Hoje ela é **12**.
- **SC-009**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit.

## Decisões de Bernardo — 10/09/2026

| # | Decisão | Consequência |
|---|---|---|
| **Q5c.a** | **Esperar as fatias (b) e (c) do Épico 4.** O Design System entra todo junto | ⚠️ **Esta fatia fica BLOQUEADA até lá.** A ordem passa a ser Épico 4 (b) → Épico 4 (c) → Épico 5 (c) |
| **Q5c.b** | **Só as preferências gerais agora.** As por turma e disciplina esperam a fatia (b) | Antecipar seria inventar dado que não tem onde morar |
| **Q5c.c** | **Ficha em tela aqui; PDF no Épico 11** | A paridade com a v2.0 se mantém no que se usa diariamente |

## Assumptions

1. **O schema já existe e muda pouco — mas muda.** As 177 linhas estão migradas desde o Épico 2,
   com os cinco `NOT NULL`, o status explícito e as duas colunas de antiguidade. Esta fatia
   **consome** o banco do Épico 1 e **não o redesenha**.
   ⚠️ **Correção de 10/09/2026**: a premissa dizia "não muda", e o `FR-032` a desmente. Fechar o
   recorte de escrita é `grant update` por coluna, e portanto **esta fatia tem migration** — com
   plano de reversão, teste negativo por perfil e tudo o que a Definition of Done exige de quem
   toca o banco.
2. **A RLS do Épico 1 governa quem vê o quê**, e o recorte de dado pessoal do Épico 3 continua
   valendo: identificação civil e residência são legíveis por três perfis.
3. **Nenhuma regra `RN-` é alterada.** Esta fatia é porte: reescreve na sintaxe nova preservando o
   comportamento, inclusive o que parecer estranho.
4. **A ordenação canônica é servida pelo banco**, e a função de domínio é pura e testável sem banco.
5. **Gráficos e componentes densos vêm do Épico 4.** Ver *Dependências* — é o ponto que mais pode
   atrasar esta fatia.

## Dependências

| Depende de | Estado |
|---|---|
| Épico 1 — schema, RLS, `instrutores` com os cinco `NOT NULL` | ✅ concluído |
| Épico 2 — as 177 linhas migradas | ✅ concluído |
| Épico 3 — sessão, perfil e recorte de PII | ✅ na `main` |
| Épico 4, fatia (a) — tokens e tema | ✅ na `main` |
| **Épico 4, fatia (b)** — `TabelaDensa`, `FiltroAvancado`, `BadgeStatus`, `NomeInstrutor`, `SeletorInstrutor`, gráficos | ⬜ **NÃO EXISTE** — Q5c.a |
| **Épico 4, fatia (c)** — shell, navegação e **estado na URL** | ⬜ **NÃO EXISTE** — Q5c.a |

⚠️ **Medido em 10/09/2026**: `components/ciaara/` tem quatro arquivos, nenhum deles de domínio; a
biblioteca de gráficos e a de estado na URL **não estão instaladas**. O `FR-025`, o `FR-026` e o
`FR-028` dependem disso.

**Q5c.a — ✅ RESOLVIDA em 10/09/2026: esta fatia ESPERA as fatias (b) e (c) do Épico 4.**

⚠️ **Isso a torna BLOQUEADA, e a consequência é de sequência do projeto, não de escopo desta spec.**
O Design System entra inteiro antes: componentes densos, gráficos e estado na URL. Construir aqui
"só o que instrutores usa" faria o componente nascer moldado a uma tela só, e a fatia (b) do Épico 4
o reescreveria — retrabalho com a aparência de progresso.

**A ordem que fica valendo:** Épico 4 (b) → Épico 4 (c) → **Épico 5 (c)**.

## Fatias seguintes — registradas, não especificadas aqui

| Fatia | Conteúdo |
|---|---|
| **(a) Cursos e turmas** | CRUD; cartões por classificação; aba "Sobre o Curso" com grade curricular; regime de horário com **data de vigência** e histórico imutável; alertas do curso; janela real, sala e status de turma; seletor de turma reutilizável |
| **(b) Disciplinas** | CRUD com **navegação em cascata** curso → turma → disciplina, com tabela expansível; **período e instrutor por turma**; **rateio de CH prevista** em atribuição multidisciplinar, modo Dividido/Simultâneo, **soma exata sem sobra nem falta**; unicidade de código recusada **pelo banco**; sinalização de disciplina sem instrutor e de início em ≤ 30 dias |

⚠️ **Critério crítico da fatia (b)**: editar o período da disciplina na turma **T2 não altera** o da
**T1** do mesmo curso. É o defeito que a estrutura por turma existe para impedir.

## Fora de escopo

- **Ficha em PDF, rota de impressão e documentos oficiais** — Épico 11. **A ficha em tela entra
  aqui** (`FR-031`, decisão de 10/09/2026).
- **Preferências e restrições por turma e por disciplina** (`RF-INSTR-06.1`) — depois da fatia (b)
  (decisão de 10/09/2026). As **gerais** entram aqui.
- **Lançamento de aula** — Épico 6.
- **Cronograma** — Épico 7.
- **Papel titular/reserva** — decisão **LIQ-3** pendente. Não se decide aqui.
- **Cursos, turmas e disciplinas** — fatias (a) e (b) deste mesmo épico.
- **Alteração de qualquer regra `RN-`** — porte preserva comportamento.

## Regras que pareceram estranhas — listadas, não corrigidas

Conforme o pedido, e conforme a regra 1 do `CLAUDE.md`.

1. **A escala de antiguidade do documento 04 não cobre civis.** O `RN-ANT-02` vai de `CMG=1` a
   `MN=12` e para aí. O schema, porém, comenta que as categorias civis `SC` e `SCNS` recebem
   **peso 13**, citando um "achado residual da v2.0 §6.8". **O peso 13 não está no documento 04.**
   A regra escrita e a implementada divergem, e a implementada é mais completa — o que sugere que o
   documento é que está incompleto.
   ✅ **Resolvido para esta fatia em 10/09/2026**, no `FR-002`: os civis vêm depois de todos os
   militares. ⚠️ **O documento 04 continua sem essa linha**, e emendá-lo é decisão à parte.
2. **O `RN-ANT-02` diz que a coluna de antiguidade da v2.0 "não é migrada como campo funcional",
   e ela foi.** O texto afirma que ela fica só em `origem_migracao_v1` para rastreabilidade
   histórica. O schema tem `antiguidade_declarada` como coluna viva, com leitura numérica gerada
   ao lado, e o comentário registra a decisão de reaproveitá-la como **desempate**. Os dois podem
   ser conciliados — deixou de ser critério **primário** —, mas a frase do documento 04, lida ao
   pé da letra, contradiz o schema.
3. **A spec 014 da v2.0 e o `RN-ANT-02` descrevem escalas de tamanhos diferentes.** A spec 014 fala
   em *"domínio fechado de 11 valores conhecidos"* e lista `CMG, CF, CC, CT, 1ºTen, 2ºTen, SO,
   1ºSG, 2ºSG, 3ºSG, SC` — **sem `CB` e sem `MN`**, e com o civil em décimo primeiro. O `RN-ANT-02`
   lista **12**, terminando em `MN`, **sem civis**. A leitura que concilia é que os 11 da spec 014
   são os valores **observados na base**, não a escala normativa. **Não é contradição com o
   `FR-002`** — o civil continua vindo depois de todo militar presente —, mas quem ler a spec 014
   isolada vai achar que a escala tem 11 posições.
4. **O texto do seletor de habilitação diverge do formato padronizado de nome.** A spec 014 fixa
   `[Posto/Graduação] [Nome Completo]` para o menu de habilitação; o `RF-INSTR-15` fixa
   `P/G Especialidade Nome de Guerra` para **toda tela**. O `RF-INSTR-15` é posterior e mais
   abrangente, então **adotei o formato padronizado** e mantive da spec 014 apenas a regra de não
   exibir identificador técnico (`FR-027.3`). Registro porque é uma escolha entre dois textos
   escritos, não uma dedução.
5. **O `RF-CRUD-02` foi `[ABSORVIDO PELA PLATAFORMA]` e isso muda o que se pode prometer.** Na v2.0
   uma coluna nova aparecia sozinha porque o cabeçalho era dinâmico. Aqui, coluna nova é migration
   mais tipo regenerado. O requisito continua na lista de cobertura do Épico 5, e **não é mais
   verificável como estava escrito**.
6. **O critério 9 do documento 06 não existe na numeração original.** O pedido cita "8" e "9" —
   cadastro incompleto recusado e CH nunca digitável —, e o documento 06 lista **sete** critérios
   para o Épico 5. Os dois são regra real (`RN-INST-03` e `RN-INST-04`); o que não existe é a
   numeração. Adotei-os como critério desta fatia e registro a divergência.
