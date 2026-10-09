# Feature Specification: Planilha de contingência do DSA

**Feature Branch**: `feat/EPICO-6-planilha-de-contingencia`

**Created**: 09/10/2026

**Status**: Draft — **clarify em 09/10/2026** (as 7 perguntas do lote, §10, respondidas por Bernardo, todas pela recomendação) · **plan e tasks aprovados em 09/10/2026**

**Input**: Pedido de Bernardo Villas Boas em 08/10/2026 — *"o DSA é usado todo dia. Se o sistema
falhar, quebrar ou tiver um defeito que impeça o DSA da semana, o operador precisa de um «estepe»:
baixar UMA PLANILHA DA TURMA (.xlsx) e fazer o DSA manualmente, com total liberdade de edição,
imprimir e publicar, até o defeito ser corrigido. É contingência, não um segundo sistema."*

> **Leia antes desta página:** `estado-atual.md` — as 7 planilhas de controle reais, medidas aba por
> aba e fórmula por fórmula, e a medição das bibliotecas da `Q-2`; e
> `specs/013-detalhe-semanal-de-aula/praticas-da-planilha.md` — a prática da operação e os defeitos
> `D-1` a `D-9`.

> ⚠️ **NUMERAÇÃO: esta é a spec 015, não a 014.** O número 014 está ocupado pelo ramo
> `docs/EPICO-8-9-estado-atual` (`specs/014-atividades-e-avaliacoes/`), que Bernardo mandou manter em
> 08/10/2026. Usar 014 aqui criaria duas "spec 014" no dia em que aquele ramo entrar.

---

## 1. O problema, em uma frase

**Hoje, se o sistema não emite o DSA da semana, a operação não tem com o que emitir.** As planilhas de
controle da v2.0 ainda existem no Drive, mas deixam de ser atualizadas na virada — e, medidas, já
trazem **2.367 fórmulas quebradas em 4 de 7** e só funcionam inteiras no Google (`estado-atual.md` §4
e §5). O estepe tem de nascer **do sistema**, com o que ele sabe da turma, e **sem** os defeitos delas.

## 2. Como esta spec se classifica — paridade ou novidade

⚠️ **É NOVIDADE, AUTORIZADA NOMINALMENTE.** O Princípio X manda que funcionalidade de negócio que não
existe na v2.0 espere a paridade. A planilha de contingência **não existia como produto** — existiam as
planilhas de operação, que eram o próprio sistema. O que a autoriza é o pedido de Bernardo de
08/10/2026, citado acima, e o Princípio IX: é processo da **CIAARA-11** (o DSA).

⚠️ **E O PRINCÍPIO IX BARRA OUTRA PLANILHA, NÃO ESTA.** O texto da constitution diz *"O Épico 13
(ROTA) é onde isso será mais testado: a tentação de «já que estamos aqui, gerar a planilha» é forte e
está explicitamente barrada"* — é sobre o ROTA, e não alcança um estepe do DSA pedido nominalmente.

---

## Clarifications

### Session 2026-10-09

*(Respostas de Bernardo Villas Boas ao lote da §10 — "TODAS como recomendado".)*

- Q: A planilha volta para o sistema? → A: **Só de ida**; cada lançamento leva o seu código na planilha, para uma volta futura não precisar adivinhar (`Q-1`, opção a).
- Q: Com que se gera o `.xlsx`? → A: **Sem pacote novo**: o arquivo é montado pelo próprio sistema, com o ZIP nativo do Node, como o repositório já faz com `.docx`; `write-excel-file` só com o aceite de Bernardo, se o plano medir custo desproporcional (`Q-2`, opção a).
- Q: A planilha cobre o ano inteiro da turma ou só as próximas semanas? → A: **O ano inteiro da turma** (`Q-3`, opção a).
- Q: Em que programas a planilha tem de funcionar? → A: **Excel e Google Planilhas**, só com funções comuns aos dois (`Q-4`, opção a).
- Q: Quais abas entram no primeiro PR? → A: **PR 1: PREENCHIMENTO, IMPRESSÃO, BD DISCIPLINAS e HORÁRIOS; PR 2: CONTROLE e CRONOS** (`Q-5`, opção a).
- Q: Na impressão, o bloco é mesclado como no papel do sistema? → A: **Sem células mescladas**: cada TA na sua célula, com o bloco **agrupado visualmente (borda/cor)**, legível e no modelo v4 (`Q-6`, opção a).
- Q: A situação da disciplina é fórmula ou retrato? → A: **CH lançada e restante por fórmula; situação por fórmula só em Aguardando início, Em andamento e Concluída; Atrasada e Conflitou como retrato da geração** (`Q-7`, opção a). *A mensagem chegou cortada depois de "Aguardando início"; vale a recomendação inteira, porque a resposta foi "TODAS como recomendado".*
- Q: Na aba IMPRESSÃO, como o operador escolhe a semana que vai imprimir? → A: **Seletor de semana**: uma célula no topo da IMPRESSÃO onde se escolhe a semana, numa lista com as semanas do ano; a aba mostra só aquela semana, em uma página (opção A, pergunta feita no clarify por ter ficado fora do lote).

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 — Baixar a planilha da turma (Priority: **P1**)

Quem lança o DSA de uma turma baixa, da tela do DSA ou da ficha da turma, um arquivo `.xlsx` com tudo
o que o sistema sabe daquela turma: cabeçalho, catálogo, relógio, assinaturas e os lançamentos já
feitos.

**Why this priority**: sem o arquivo não há estepe. E ele tem de existir **antes** da falha: quando o
sistema cair, o botão cai junto.

**Independent Test**: com uma turma que tem lançamentos, clicar no botão e abrir o arquivo — ele traz o
cabeçalho, o catálogo, o relógio e as semanas lançadas, e o banco não muda.

**Acceptance Scenarios**:

1. **Given** um Encarregado na tela do DSA de uma turma presencial, **When** clica em *Baixar planilha
   de contingência*, **Then** o navegador baixa um `.xlsx` com o nome da turma e a data da geração.
2. **Given** um perfil sem permissão de lançar na turma, **When** abre o DSA ou a ficha, **Then** o
   botão não aparece — e o endereço da geração, chamado direto, recusa.
3. **Given** uma turma **EAD**, **When** se abre a ficha, **Then** não há botão, e o aviso de turma EAD
   continua no lugar do DSA.
4. **Given** um Operador com alcance só em alguns cursos, **When** pede a planilha de uma turma fora do
   alcance, **Then** não recebe arquivo, e a frase não confirma se a turma existe.
5. **Given** a geração terminada, **When** se confere o banco, **Then** nenhuma linha foi criada,
   alterada nem inativada.

---

### User Story 2 — Fazer o DSA da semana na planilha (Priority: **P1**)

Com o sistema indisponível, o operador abre a planilha baixada e lança a semana como sempre lançou:
duas escolhas por Tempo de Aula — o código e a unidade de ensino. Tópico, local, técnica, instrutor e
horário aparecem sozinhos, e qualquer um pode ser mudado à mão.

**Why this priority**: é o estepe em si. Se lançar na planilha custar mais que hoje, ninguém o usa.

**Independent Test**: numa semana vazia, escolher código e UE em três TA consecutivos — a impressão
mostra **um** bloco, com o horário certo, o tópico, o local, a técnica e o instrutor do catálogo.

**Acceptance Scenarios**:

1. **Given** uma semana sem lançamento, **When** o operador escolhe código e UE num TA, **Then** tópico,
   local, técnica e instrutor aparecem na linha, vindos do catálogo.
2. **Given** um valor sugerido, **When** o operador o sobrescreve na linha, **Then** a impressão usa o
   valor escrito.
3. **Given** uma linha com valor próprio, **When** alguém muda o catálogo, **Then** a linha **não** muda
   (`D-4`).
4. **Given** uma chave código+UE que o catálogo não tem, **When** o operador a digita, **Then** a linha
   e a área de conferência dizem que a chave não existe — e a impressão não mostra erro de fórmula
   (`D-6`, `D-2`).
5. **Given** dois TA consecutivos com a mesma chave, um antes e outro depois do almoço, **When** se
   olha a impressão, **Then** são dois trechos, nunca um horário contínuo atravessando o almoço (`D-3`).

---

### User Story 3 — Imprimir e publicar a semana (Priority: **P1**)

O operador imprime a semana numa página A4 paisagem, no mesmo modelo do papel do sistema, com as
assinaturas certas, sem precisar selecionar o trecho à mão.

**Why this priority**: o DSA só vale impresso e assinado.

**Independent Test**: imprimir uma semana que o sistema já tinha — o papel da planilha e o
`/print/dsa` da mesma semana têm as mesmas linhas, horários, CH e assinaturas.

**Acceptance Scenarios**:

1. **Given** uma semana que o sistema conhece, **When** se compara a impressão da planilha, como
   gerada, com o `/print/dsa` da mesma semana, **Then** linhas, horários, disciplinas, CH do rodapé,
   técnicas e assinaturas são iguais.
2. **Given** qualquer semana do arquivo gerado, **When** o operador a escolhe no seletor da IMPRESSÃO e
   manda imprimir, **Then** sai uma página A4 paisagem só com aquela semana.
3. **Given** a planilha gerada, **When** se percorre a impressão de todas as semanas, **Then** não há
   erro de fórmula visível em nenhuma (`D-1`, `D-2`).
4. **Given** a tabela de CH do rodapé de uma semana, **When** há lançamento em semana posterior,
   **Then** a CH cumprida não o conta (`D-5`).

---

### User Story 4 — Acompanhar a carga horária na planilha (Priority: **P2**)

O operador vê, por disciplina, a CH prevista, a lançada e a restante, e a distribuição por semana — as
abas CONTROLE e CRONOS, como hoje.

**Why this priority**: ajuda a planejar a semana seguinte durante a contingência, mas o DSA sai sem ela.

**Independent Test**: lançar TA de uma disciplina na planilha — a CH lançada e a restante dela mudam
na CONTROLE e na CRONOS.

**Acceptance Scenarios**:

1. **Given** a CONTROLE, **When** o operador lança TA de uma disciplina numa data até a de referência,
   **Then** a CH lançada sobe e a restante desce na mesma quantidade.
2. **Given** um lançamento numa data posterior à de referência, **When** se olha a CONTROLE, **Then** ele
   não conta como lançado (`D-5`).

---

### Edge Cases

- **O sistema cai antes de alguém baixar a planilha.** O estepe só existe se foi baixado antes. A
  planilha diz, em lugar visível, quando foi gerada e com o que estava lançado até ali; o que se lançou
  depois não está nela.
- **A vigência de regime muda no meio do ano** (o relógio de junho é outro): cada semana usa o relógio
  da vigência que cobre a sua data, como o sistema (`RN-2027-09`).
- **Semana sem vigência que a cubra**: os TA saem numerados, sem horário, com aviso — a degradação do
  sistema (`RN-DEG-01`), nunca horário inventado.
- **O assinante muda no meio do ano**: cada semana leva as assinaturas vigentes na data dela.
- **Feriado de dia inteiro**: o dia vem marcado com o motivo. A planilha não recusa lançar ali — é
  liberdade de contingência —, mas a marca fica à vista.
- **Sábado**: a semana tem as linhas do sábado; o sistema lança no sábado, e a planilha também deixa.
  Numa turma sem sábado lançado no ano, a IMPRESSÃO não tem a coluna do sábado, e o que se lançar no
  sábado offline vai para a lista abaixo da grade — nunca some (`DP-3`).
- **Turma sem período cadastrado** (sem data de início ou de término): o `FR-030` não tem de onde
  contar. A planilha cobre da primeira à última semana com lançamento, mais a semana corrente, e diz
  isso no topo (`RN-DEG-01`) — nunca um ano inventado.
- **Turma semipresencial**: só as semanas da etapa presencial quando ela está cadastrada (`D-DSA-2`);
  sem a etapa cadastrada, todas as semanas, com o aviso que o sistema dá.
- **Curso por competências / disciplina sem UE**: a disciplina entra no catálogo com o item "sem UE"
  (`D-DSA-1`), e o tópico vira campo a preencher.
- **Lançamento sem posição** (o histórico do ETL sem TA): não tem onde ir na grade; vai para uma lista
  própria da semana, à vista, em vez de sumir (`RN-DEG-01`).
- **Mais de um instrutor na mesma aula**: a coluna aceita o texto livre que a operação já usa.
- **A geração falha no meio**: o operador recebe uma frase de erro, e nunca um arquivo pela metade.

## 4. Requirements *(mandatory)*

### 4.1 Acesso e geração

- **FR-001**: Na tela do DSA e na ficha da turma, quem pode **lançar** no DSA daquela turma MUST ver o
  botão *Baixar planilha de contingência*; quem não pode, MUST NOT vê-lo.
- **FR-002**: Turma **EAD puro** MUST NOT ter o botão, e o endereço da geração, chamado direto para ela,
  MUST responder com o aviso de turma EAD em vez de arquivo. Semipresencial mantém o botão.
- **FR-003**: A geração MUST ler a turma **com a sessão de quem pede**, respeitando a RLS e o alcance do
  perfil. Turma fora do alcance MUST NOT gerar arquivo, e a recusa MUST NOT confirmar que a turma
  existe.
- **FR-004**: Gerar a planilha MUST NOT escrever no banco — nenhuma linha criada, alterada ou inativada.
- **FR-005**: O arquivo MUST ser `.xlsx`, com nome que identifique a turma e a data da geração, e MUST
  trazer em lugar visível: data e hora da geração, quem gerou, até quando os lançamentos estão
  incluídos e o aviso de que é **contingência** e de que **o sistema continua sendo a fonte**.
- **FR-006**: A geração MUST terminar com o arquivo inteiro ou com uma frase de erro — nunca com um
  arquivo pela metade.

### 4.2 O que vem preenchido

- **FR-007**: Cada semana MUST trazer o cabeçalho do papel do sistema: sigla do curso, código da turma,
  número do DSA da semana (pela mesma regra do sistema), "semana de X a Y" e número de alunos, todos do
  cadastro (`D-8`).
- **FR-008**: O **catálogo** (BD DISCIPLINAS) MUST trazer, para cada disciplina ativa do curso, as UEs
  com a CH prevista e os valores **sugeridos** de local, técnica (sigla) e instrutor; e também os itens
  lançáveis que não são UE — avaliação, vista de prova, AEC, TAD, TR e Estudo Individual. Cada item
  MUST ter **chave única** (`D-6`).
- **FR-009**: Os **horários** MUST ser, para cada semana, o relógio da vigência que cobre a data dela —
  início e fim de cada TA, incluído o excepcional, com o intervalo do almoço —, **o mesmo** do
  `/print/dsa`. Semana sem vigência MUST sair com os TA numerados, sem horário, e aviso.
- **FR-010**: As **assinaturas** de cada semana MUST vir resolvidas pela vigência na data da semana, com
  o posto por extenso, como no `/print/dsa` (`D-7`), e MUST ser editáveis.
- **FR-011**: Os **lançamentos já feitos** no sistema MUST entrar nas semanas deles, com os valores **da
  linha** — tópico, local, técnica e instrutor do lançamento, e não os do catálogo (`D-4`) — e com o
  **código do lançamento** em coluna própria.
- **FR-012**: Para toda semana que o sistema conhece, a impressão **como gerada** MUST ter o mesmo
  conteúdo do `/print/dsa` da mesma semana: linhas, horários, disciplinas, CH do rodapé, técnicas e
  assinaturas. A **forma** do bloco é a do `FR-017` — sem mesclagem —, e por isso o que se compara
  é o conteúdo, não a geometria das células.
- **FR-013**: Lançamento **sem posição** MUST aparecer numa lista própria da semana, nunca omitido.
- **FR-014**: Turma semipresencial MUST cobrir só as semanas da etapa presencial quando a etapa está
  cadastrada; sem etapa, todas as semanas, com o aviso do sistema (`D-DSA-2`).
- **FR-030**: A planilha MUST cobrir **o ano inteiro da turma** (`Q-3`): todas as semanas do período
  cadastrado, da semana da data de início à da data de término — inclusive as já passadas e as ainda
  sem lançamento —, ressalvado o `FR-014`.

### 4.3 Preencher na planilha

- **FR-015**: A entrada (PREENCHIMENTO) MUST ter, para cada dia de cada semana (sábado incluído), uma
  linha por TA do relógio, com o horário já escrito; lançar um TA MUST exigir no máximo **duas**
  escolhas — o código (disciplina ou categoria não letiva) e a UE ou item (`P-2`).
- **FR-016**: Tópico, local, técnica e instrutor MUST aparecer sozinhos pela chave código+UE, a partir do
  catálogo; qualquer um MUST poder ser sobrescrito na linha, e o valor escrito MUST prevalecer. Mudar o
  catálogo MUST NOT mudar linha que tem valor próprio (`D-4`).
- **FR-017**: TA consecutivos com a mesma chave no mesmo período MUST formar **um** bloco na impressão,
  e o bloco MUST NOT atravessar o almoço (`D-3`). A impressão MUST NOT usar **células mescladas**
  (`Q-6`): cada TA fica na sua célula, e o bloco é **agrupado visualmente** — por borda/cor, como a
  `Q-6` respondeu; o plano decidiu pela **cor**, porque a formatação condicional do Google não faz
  borda (`FR-031`, R-7) —, legível e no modelo v4. O agrupamento MUST acompanhar o que o operador editar na entrada, sem que ele refaça
  formatação à mão.
- **FR-018**: Chave que o catálogo não tem MUST virar aviso legível na linha e numa área de conferência
  — nunca erro de fórmula na impressão (`D-6`, `D-2`).
- **FR-019**: As listas de escolha de código e de UE MUST vir do catálogo da própria planilha, e não de
  valores escritos à mão na regra (`D-6`). O operador MUST poder escrever fora da lista.
- **FR-020**: Nenhuma célula MUST ser bloqueada: o operador MUST poder editar qualquer célula, inclusive
  as calculadas — é o *"total liberdade de edição"* do pedido.
- **FR-021**: As listas de categoria MUST usar o vocabulário do sistema (AEC, TAD, TR, Estudo
  Individual), e não as siglas de duas letras das planilhas de hoje, que mudam de sentido entre cursos
  (`praticas-da-planilha.md` §1.3).
- **FR-031**: Toda fórmula e toda formatação que reage ao conteúdo MUST usar só recursos que existem
  **no Excel e no Google Planilhas** (`Q-4`). Medido: as planilhas de hoje usam `TO_DATE`, que o Excel
  não tem (`estado-atual.md` §4) — e é exatamente isso que fica proibido. ⚠️ **Consequência para o
  `FR-017`:** o agrupamento do bloco que acompanha a edição MUST ficar perceptível nos dois programas;
  o plano mede se a borda condicional existe nos dois ou se a cor carrega o agrupamento sozinha.

### 4.4 Imprimir

- **FR-022**: A IMPRESSÃO MUST ter um **seletor de semana** — uma célula no topo, com a lista das
  semanas do ano da turma — e mostrar **só a semana escolhida**, em **uma** página A4 paisagem, no
  modelo v4 (dias × tempos). Imprimir MUST ser escolher a semana e mandar imprimir: sem selecionar
  trecho e sem procurar página. A semana escolhida por padrão, no arquivo gerado, MUST ser a semana
  corrente da turma (ou a primeira do período, se a corrente estiver fora dele).
- **FR-023**: O arquivo, como gerado, MUST NOT mostrar erro de fórmula (`#REF!`, `#N/A`, `#VALUE!`,
  `#DIV/0!`…) em nenhuma aba e em nenhuma semana (`D-1`, `D-2`).
- **FR-024**: O rodapé da semana MUST trazer: a tabela CÓD · DISCIPLINA · CH PREVISTA · CH CUMPRIDA só
  das disciplinas da semana, com a cumprida **acumulada até o fim daquela semana**, nunca contando
  semana posterior (`D-5`); a legenda das técnicas usadas; a nota do Estudo Individual; o número de
  alunos; o ALT, editável; e as duas assinaturas.

### 4.5 Controle e cronograma

- **FR-025**: A **CONTROLE** MUST mostrar, por disciplina, a CH prevista, a lançada até uma **data de
  referência** (por padrão, hoje; editável), a restante e a situação (`Q-7`):
  - a **CH lançada** e a **restante** MUST ser fórmula (soma), e acompanhar o que se lançar offline;
  - a situação MUST ser fórmula **só** nos três degraus que são conta — *Aguardando início* (nada
    lançado), *Em andamento* (lançou menos que a prevista) e *Concluída* (lançou a prevista ou mais) —,
    com as mesmas palavras do sistema;
  - *Atrasada* e *Conflitou* MUST ser **retrato** do sistema na geração, numa coluna própria rotulada
    com a data dela — nunca misturados na célula da situação calculada: a primeira depende das datas
    de previsão e a segunda de outras turmas, que a planilha não recalcula;
  - para o dado gerado, a fórmula MUST dar o **mesmo** veredito que o sistema, conferido por teste.
- **FR-026**: A **CRONOS** MUST mostrar, por disciplina e por semana, os TA lançados, com a CH prevista,
  a distribuída e a restante.

### 4.6 O que não acontece

- **FR-027**: Nada do que for feito na planilha MUST voltar ao sistema nesta spec — **só de ida**
  (`Q-1`). O código de cada lançamento já vai na planilha (`FR-011`), para que uma volta futura case
  pelo código em vez de adivinhar.
- **FR-028**: O arquivo MUST sair só pelo download no navegador — sem envio por e-mail nem publicação
  automática (`D-USR-1`).
- **FR-029**: O arquivo MUST NOT trazer dado pessoal além do que o DSA já imprime (nomes e postos de
  instrutor e assinantes); CPF, RG, telefone e endereço MUST ficar fora (decisão `PII-1`).

### 4.7 Key Entities

- **Planilha de contingência**: o arquivo gerado para **uma** turma — com a data e hora da geração,
  quem gerou, as semanas que cobre e até quando os lançamentos estão incluídos.
- **Semana da planilha**: cabeçalho, linhas de TA por dia, lista de sem posição, rodapé e assinaturas
  daquela semana — na entrada, todas empilhadas; na IMPRESSÃO, **uma de cada vez**, pela semana escolhida
  no seletor.
- **Linha de TA**: dia, número do TA, horário, chave código+UE, valores sugeridos e valores escritos,
  código do lançamento quando veio do sistema.
- **Item do catálogo**: chave única, disciplina, UE ou item não-UE, CH prevista, local, técnica e
  instrutor sugeridos.
- **Relógio por vigência**: período de validade, início e fim de cada TA, o excepcional e o almoço.
- **Assinatura por vigência**: papel (Auxiliar ou Encarregado), período, nome, posto por extenso e
  função.

## 5. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem pode lançar baixa a planilha de uma turma com **um** clique a partir do DSA ou da
  ficha, e o arquivo chega em até **30 segundos** para a turma mais longa — **50 semanas**, medido no
  retrato `remoto-20261008-212706.sql` em 09/10/2026 *(o "46" escrito antes era o maior bloco das
  planilhas de referência, não o maior período de turma)*.
- **SC-002**: O arquivo gerado abre com **zero** erros de fórmula visíveis, em todas as abas, **nas
  turmas da semente sintética** *(emenda de 09/10/2026, decisão de Bernardo Villas Boas no analyze: o
  texto anterior dizia "todas as turmas ativas", e medir isso exigiria copiar o remoto para o local e
  gerar planilha com dado real — nenhuma das duas coisas acontece; as turmas reais ficam para a
  conferência de Bernardo no preview)*.
- **SC-003**: Em semanas que o sistema conhece, a impressão da planilha e o `/print/dsa` coincidem em
  **100%** das linhas, horários, CH e assinaturas, conferido em ao menos 3 turmas e 3 semanas cada.
- **SC-004**: Lançar um bloco numa semana vazia exige no máximo **2** escolhas por TA, e tópico, local,
  técnica, instrutor e horário aparecem sem digitar **quando o cadastro da turma os tem** — sem cadastro,
  a célula fica vazia, nunca com valor inventado (R-9).
- **SC-005**: Escolher qualquer semana no seletor e mandar imprimir produz **1** página, só com aquela
  semana — **zero** seleções de trecho e **zero** páginas a procurar.
- **SC-006**: Mudar o catálogo altera **zero** linhas que já têm valor próprio.
- **SC-007**: O arquivo abre e **recalcula** sem perder fórmula **no Excel e no Google Planilhas**
  (`Q-4`): editar uma linha da entrada muda a impressão nos dois.
- **SC-008**: Turma EAD: **zero** botões em todas as telas; perfil sem permissão de lançar: **zero**
  botões, e o endereço direto recusa.
- **SC-009**: Gerar a planilha altera **zero** linhas no banco.

## 6. Assumptions

- **O sistema continua sendo a fonte.** A planilha é retrato do que o sistema sabia mais rascunho do
  que se fizer nela; quando o sistema voltar, o que foi feito offline é relançado na tela (até existir
  a volta da `Q-1`).
- **O estepe é baixado ANTES da falha.** A operação baixa a planilha regularmente — a recomendação
  escrita na própria planilha é *no início de cada semana* —, porque com o sistema fora do ar o botão
  também está.
- **Quem pode baixar é quem pode lançar** — a mesma permissão do DSA (`registros_aula.criar`), com o
  mesmo alcance de curso.
- **O vocabulário de entrada é o do sistema** (códigos das disciplinas da turma e as quatro categorias
  não letivas), não as siglas de duas letras das planilhas atuais.
- **O ALT** fica como campo editável por semana, vazio por padrão.
- **O DSA de reposição** (`P-5` da spec 013) fica fora: não é o DSA da semana.
- **Os nomes impressos** são os que o DSA já imprime; o arquivo circula como o DSA impresso circula.

## 7. Restrições dadas por Bernardo — para o plano

Registradas como vieram, porque decidem o desenho e não são deste documento resolver:

- A geração é **no servidor**, a partir do **mesmo domínio do DSA** — horário, grade, documento,
  assinaturas, número e situação saem das funções que o `/print/dsa` já usa (`estado-atual.md` §6), sem
  segunda implementação delas no gerador.
- A leitura respeita a **RLS** e o **escopo do perfil**.
- **Sem pacote novo** (`Q-2`): o `.xlsx` é montado pelo próprio sistema, com o ZIP nativo do Node, como
  o repositório já faz com `.docx` (`scripts/manutencao/md_para_docx.py`). Se o plano **medir** custo
  desproporcional, a alternativa é `write-excel-file`, e **só com o aceite de Bernardo**.
- **Dois PRs** (`Q-5`): o **PR 1** entrega PREENCHIMENTO, IMPRESSÃO, BD DISCIPLINAS e HORÁRIOS — o que
  basta para lançar e imprimir um DSA (User Stories 1, 2 e 3); o **PR 2**, CONTROLE e CRONOS (User
  Story 4, `FR-025` e `FR-026`).
- **Não importar dado de volta para o banco. Não tocar o remoto** durante a especificação.

## 8. O que NÃO entra nesta spec

- A **volta**: importar para o sistema o que foi feito na planilha (`Q-1`).
- O DSA de reposição (`P-5`).
- Envio por e-mail, publicação no Drive ou qualquer integração externa **do produto** — a conferência
  da `DP-4` no Google Drive é procedimento de teste, com arquivo sintético, numa pasta apagada no fim.
- Gerar a planilha de várias turmas de uma vez.
- Qualquer mudança no DSA do sistema, **com as duas ressalvas decididas por Bernardo em 09/10/2026**: a
  leitura do DSA é refatorada **sem mudar comportamento** (R-2) e passa a ler **em páginas até acabar**
  (`DP-5`). **A tela do DSA não muda**: o formulário passar a usar `preencherLancamento` para sugerir
  instrutor e técnica é a pendência **`PEND-DSA-SUGESTAO`**, para um PR pequeno logo depois do merge
  desta spec.

## 9. Divergências encontradas — listadas, não corrigidas

- **O documento ainda se chama "QSA" na entrada das planilhas atuais** (`QSA Nº`, `ESPELHO DO QSA
  IMPRESSO`) e "DSA" no papel (`estado-atual.md` §1.1). A planilha nova usa **DSA** nos dois lados.
- **As planilhas atuais só funcionam inteiras no Google** — a ESPELHO usa `TO_DATE` nas 7
  (`estado-atual.md` §4). Isso não foi anotado no levantamento de 05/10/2026.

## 10. As perguntas — ✅ **AS 7 RESPONDIDAS em 09/10/2026, todas pela recomendação**

As opções ficam registradas como foram consideradas; a resposta está em *Clarifications* e já foi
aplicada aos requisitos. A numeração das cinco primeiras é a do pedido; a `Q-6` e a `Q-7` são da medição.

### Q-1 — A planilha volta para o sistema? · ✅ **RESPONDIDA: opção (a)**

| Opção | O que significa |
|---|---|
| **(a)** Só de ida, e a planilha já leva o **código de cada lançamento** em coluna própria | A volta, se vier numa spec futura, casa pelo código — como a carga da VIRADA-1 já faz — em vez de adivinhar |
| (b) Só de ida, sem preparar a volta | Mais simples hoje; a volta futura teria de casar por dia, TA e disciplina |
| (c) Ida e volta nesta spec | Dobra a spec: conferência, conflito com o que foi lançado na tela, e o "planilha manda × sistema manda" da VIRADA-1 de novo |

**Recomendação: (a).** É a recomendação do pedido, com um acréscimo de custo zero que não fecha porta.

### Q-2 — Com que se gera o `.xlsx`? · ✅ **RESPONDIDA: opção (a)**

Medido em 09/10/2026 (`estado-atual.md` §7):

| Opção | O que significa |
|---|---|
| **(a)** **Nenhum pacote**: o próprio código escreve o OOXML e o ZIP | Zero dependência; precedente no repositório (`scripts/manutencao/md_para_docx.py`); o Node em uso tem `zlib.crc32` e `deflateRawSync`. Custo: escrever e testar o gerador |
| (b) `exceljs` 4.4.0 | Completo, mas 21 MB, 9 dependências, versão de 19/10/2023 |
| (c) `write-excel-file` 4.1.1 | Leve (1,7 MB), recente, sem aviso de segurança; o plano teria de medir se cobre fórmula, mescla, validação e página |
| (d) `xlsx` (SheetJS) do npm | **Descartada pela medição:** 2 avisos ALTOS sem correção no npm |

**Recomendação: (a).** Não pede exceção à regra de pacote novo, e o formato é texto que se testa linha a
linha. Se o plano medir que o custo de (a) é desproporcional, (c) é a segunda — e aí, sim, com o aceite
de Bernardo.

### Q-3 — A planilha cobre o ano inteiro da turma ou só as próximas semanas? · ✅ **RESPONDIDA: opção (a)**

| Opção | O que significa |
|---|---|
| **(a)** O ano inteiro da turma, como as planilhas de hoje (60 linhas por semana, todas as semanas) | Uma cópia baixada há duas semanas ainda serve quando o sistema cair. Custo: a geração lê todas as semanas (21 a 46) |
| (b) A semana atual e as N seguintes | Arquivo menor e mais rápido, mas o estepe envelhece depressa |
| (c) O operador escolhe o intervalo | Flexível, mais uma decisão na hora do aperto |

**Recomendação: (a).** O estepe é baixado **antes** da falha; quanto mais ele cobre, mais tempo dura.

### Q-4 — Em que programas a planilha tem de funcionar? · ✅ **RESPONDIDA: opção (a)**

| Opção | O que significa |
|---|---|
| **(a)** **Excel e Google Planilhas** | Só funções comuns aos dois. Medido: as planilhas de hoje usam `TO_DATE`, que o Excel não tem |
| (b) Só Google Planilhas, como hoje | Libera funções do Google; quem abrir no Excel vê a planilha congelada |
| (c) Excel, Google Planilhas e LibreOffice | O mesmo conjunto comum, mais a conferência num terceiro programa |

**Recomendação: (a).** Contingência não pode depender de qual programa a máquina tem.

### Q-5 — Quais abas entram no primeiro PR? · ✅ **RESPONDIDA: opção (a)**

| Opção | O que significa |
|---|---|
| **(a)** PREENCHIMENTO, IMPRESSÃO, BD DISCIPLINAS e HORÁRIOS; CONTROLE e CRONOS no segundo | As quatro que bastam para lançar e imprimir um DSA chegam primeiro |
| (b) As seis de uma vez | Um PR maior, uma conferência só |
| (c) Só IMPRESSÃO e PREENCHIMENTO, com catálogo e relógio dentro delas | Menos abas, mas foge do desenho que a operação conhece |

**Recomendação: (a).** Imprimir o DSA é o que a contingência tem de garantir primeiro.

### Q-6 — Na impressão, o bloco é mesclado como no papel do sistema? *(levantada pela medição)* · ✅ **RESPONDIDA: opção (a), com o agrupamento por borda/cor**

O papel v4 desenha o bloco como **uma** célula que ocupa os TA dele. Numa planilha, a mesclagem é
**fixa**: não acompanha o que o operador mudar na entrada.

| Opção | O que significa |
|---|---|
| **(a)** **Viva**: cada TA na sua célula, o bloco mostrado por continuidade, sem mesclar | Acompanha qualquer edição; o desenho é o do v4, sem a mesclagem |
| (b) **Fiel**: mesclada como o `/print/dsa`, nas semanas que o sistema conhecia | Igual ao papel do sistema; editar o bloco exige refazer a mesclagem à mão |
| (c) As duas: semanas já lançadas fiéis, semanas vazias vivas | Igual onde já havia lançamento; a semana nova se edita livre |

**Recomendação: (a).** A planilha só serve como estepe se o que se edita na entrada aparece no papel.

### Q-7 — A situação da disciplina é fórmula ou retrato? *(levantada pela medição)* · ✅ **RESPONDIDA: opção (a)**

O pedido quer *"fórmulas que ajudam (…) situação"* e, na restrição, *"sem segunda implementação de
(…) situação"*. Fórmula que calcula situação **é** uma segunda implementação, e duas implementações da
mesma regra divergem — é o `D-1`.

| Opção | O que significa |
|---|---|
| **(a)** CH lançada e restante por **soma**; situação por fórmula **só nos três degraus aritméticos** (aguardando início, em andamento, concluída), e "atrasada" e "conflitou" como **retrato** da geração | O que é conta fica vivo; o que depende de dado que a planilha não tem (outras turmas, previsão) não é reinventado. Um teste confere que a fórmula e o sistema dão o mesmo veredito para o dado gerado |
| (b) Situação inteira como retrato, sem fórmula | Zero segunda implementação, mas não acompanha o que se lançar offline |
| (c) Sem situação na planilha | Só CH prevista, lançada e restante |

**Recomendação: (a).** Atende o pedido sem reescrever, em fórmula, as partes da regra que precisam de dado de fora da turma.
