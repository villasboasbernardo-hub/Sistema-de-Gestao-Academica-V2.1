# Feature Specification: Bloco 3 — a página do curso em abas

**Feature Branch**: `feat/BLOCO-3-pagina-do-curso-em-abas`

**Created**: 19/10/2026

**Status**: Draft — specify em 19/10/2026, pelo `/corrigir` (um pedido = uma spec = um PR = uma conferência; as
dúvidas são decididas pela recomendação e conferidas por Bernardo no fim) · clarify em 19/10/2026: 19 decisões
adotadas por padrão (C-1 a C-19, seção Clarifications) · analyze em 19/10/2026: 5 achados de texto e cobertura
  aplicados, nenhum crítico

**Input**: o pedido de Bernardo Villas Boas de 19/10/2026 — *"Bloco 3 do plano de correções — a página do curso em
abas, tudo num PR só"* — e o Bloco 3 de `docs/correcoes/plano-de-correcoes-em-blocos.md` (itens 1 a 4), com a
resposta 6 da triagem de 16/10/2026 (*"regimes nomeados por curso, escolhidos por turma; troca por semana fica para
depois"*).

> **Leia antes desta página:** `triagem.md` (os itens, medidos) e o plano de correções (Bloco 3).

> ⚠️ **ONDE CADA NÚMERO DESTA SPEC FOI MEDIDO** (regra 9.2):
> - **Código:** a `main` `33efec0`, lida por três leitores independentes, só de leitura, com arquivo e linha.
> - **Dado:** a cópia **`remoto-20261019-165417.sql`** (19/10/2026, 16:54), lida por script fora do repositório.

---

## 1. O problema, em uma frase

**A página do curso não reúne o que é do curso — as disciplinas moram numa tela solta, o previsto de atividades
aparece misturado com o cumprido das turmas, a aba Avaliações mostra o andamento de uma turma, e o horário é um par
único por curso que nenhuma turma pode escolher.**

## 2. Paridade ou novidade (Princípio X)

| Natureza | Itens | Por que entra |
|---|---|---|
| **Reorganização por pedido nominal** | Aba Disciplinas (e a entrada que sai do menu), aba Atividades extraclasse, ordem das abas | Bloco 3 do plano de correções, pedido de 19/10/2026 |
| **Regra nova por decisão nominal** | Regimes nomeados por curso, escolhidos por turma | Resposta 6 da triagem de 16/10/2026 (*"regimes nomeados por curso, escolhidos por turma"*) |
| **Defeito** | A aba Avaliações do curso mostra o cumprido da turma; nenhuma tela cria disciplina | Divergência medida no Bloco 2 (registrada no plano); lacuna medida na triagem |

## 3. O que é banco e o que é só tela

| Item | Banco? | Classificação pela regra 9.4 (emenda de 19/10/2026) |
|---|---|---|
| Aba Disciplinas, menu, `/disciplinas` | Não | Só tela e navegação |
| Aba Atividades extraclasse | Não | Lê o que já existe (`limites_curriculo`, parâmetros, catálogo de tipos) |
| Aba Avaliações só com o previsto | Não | Só tela |
| Regimes nomeados e a escolha da turma | **Sim** — uma tabela nova (os regimes do curso) e uma coluna nova, **nulável**, na turma (o regime escolhido); e a view dos dias parados passa a preferir o regime da turma | **Acrescenta.** Tabela e coluna novas; com a coluna vazia em toda turma — que é o estado do dado hoje —, **nada do que está em tela muda**, e isso é **provado** comparando as views antes e depois sobre a cópia do remoto (SC-009) |

Nenhuma policy de `DELETE`. Nenhuma mudança na matriz de permissões (os regimes usam o recurso `horarios`, que já
existe; a escolha da turma usa `turmas.editar`).

---

## Clarifications

### Session 2026-10-19

*Fluxo `/corrigir`: cada dúvida decidida pela recomendação — **adotada por padrão, Bernardo confere no fim** — e
acumulada no lote final da entrega.*

- C-1 · Q: O que acontece com o endereço `/disciplinas`? → A: **Redireciona**: com curso, para a aba Disciplinas do
  curso, levando situação, busca e linha aberta; sem curso, para o catálogo de cursos; com turma, para a seção da
  ficha (como hoje). Alternativa: a rota servir a própria aba. *(adotada por padrão)* — FR-001.5
- C-2 · Q: A aba ganha "Nova disciplina", que hoje não existe em tela nenhuma? → A: **Ganha**, para quem tem
  `disciplinas.criar`, com o formulário e a ação que já existem — o pedido lista "criar" entre as funções. Alternativa:
  manter só o que a tela de hoje faz. *(adotada por padrão)* — FR-001.2
- C-3 · Q: Onde fica o estado da aba Disciplinas? → A: **Na URL da página do curso**: `situacao` (padrão *ativo*),
  `busca` e `aberta`, com os mesmos nomes de `/disciplinas`. *(adotada por padrão)* — FR-001.3
- C-4 · Q: A aba Avaliações ainda depende da turma escolhida na Grade? → A: **Não**: mostra só o previsto do
  currículo, e *Definir tempo* ali alcança só o curso; o ajuste por turma fica na ficha. A pré-seleção de turma passa
  a servir só à Grade. *(adotada por padrão)* — FR-002
- C-5 · Q: E o quadro "Turmas com teto excedido", que é acompanhamento de turma? → A: **Fica acima das abas**, como
  alerta do curso (`RF-CURSO-06` **[PRESERVADO]**: a página do curso sinaliza alertas); o pedido fala de *aba*. Os
  **limites** (o previsto) vão para a aba Atividades. Alternativa: tirar o alerta da página do curso. *(adotada por
  padrão)* — FR-005
- C-6 · Q: O que a aba Atividades mostra além dos limites? → A: A **referência do Estudo Individual** (informativa,
  os dois percentuais), *"o currículo não prevê"* para o Apoio Individualizado, e os **tipos de atividade do catálogo
  por categoria** (o que conta como AEC, TAD, TR). Alternativa: só os limites. *(adotada por padrão)* — FR-005.1
- C-7 · Q: Como é o regime nomeado, e como ele respeita o passado? → A: **Registro próprio do curso**, com a
  quantidade de TA e a duração **imutáveis** depois de criado (`RF-HOR-02`) e os horários e intervalos editáveis
  **só enquanto nenhuma turma que o usa tem lançamento** (`RF-HOR-05`); o relógio do catálogo é opcional.
  Alternativa: regime nomeado com vigência própria (pesado, e a troca no tempo ficou para depois). *(adotada por
  padrão)* — FR-003.1, FR-003.2
- C-8 · Q: A turma com lançamento pode trocar de regime? → A: **Não**: a escolha trava no primeiro lançamento do DSA
  da turma (aula, avaliação, sessão, vista ou atividade), recusada pelo banco. Alternativa: deixar trocar e
  reinterpretar o passado. *(adotada por padrão)* — FR-003.5
- C-9 · Q: O regime da turma substitui o padrão e a exceção do curso? → A: **Os dois**: com escolha, a turma usa o
  regime escolhido em tudo (DSA, alerta do TA excepcional, cascata, dia parado, saldo presencial); sem escolha, nada
  muda (exceção na frente do padrão no DSA, como hoje). Alternativa: só o relógio do DSA. *(adotada por padrão)* —
  FR-003.6, FR-003.7
- C-10 · Q: Quem cadastra e quem escolhe? → A: Regime nomeado pelo recurso **`horarios`** que já existe (criar,
  editar, desativar); a escolha da turma por **`turmas.editar`**. Nenhuma mudança na matriz. *(adotada por padrão)* —
  FR-003.3, FR-003.4
- C-11 · Q: Pode inativar regime em uso? → A: **Pode**: some da escolha de turma nova, e a turma que o usa continua
  com ele. Alternativa: recusar inativar em uso. *(adotada por padrão)* — FR-004.1
- C-12 · Q: O editor das vigências do curso vem para a aba Horários? → A: **Não**: a aba as mostra só para ler, com o
  caminho para *Editar curso*, onde o editor já mora. *(adotada por padrão)* — FR-004.2
- C-13 · Q: A ordem das abas fica a pedida? → A: **Fica**: *Sobre o Curso · Grade · Disciplinas · Avaliações ·
  Atividades · Horários* vai do que o currículo é (Sobre, Disciplinas, Avaliações, Atividades) ao como se opera
  (Horários), com a Grade cedo por ser a mais usada. *(adotada por padrão)* — FR-006.1
- C-14 · Q: Como se registra a saída de *Disciplinas* do menu? → A: Um registro datado **ao lado** dos de 11/09 e de
  04/10 em `specs/008-shell-e-estado-na-url/contracts/casca.md`, sem apagar os anteriores. *(adotada por padrão)* —
  FR-001.4
- C-15 · Q: A turma EAD escolhe regime? → A: **Não**: a turma EAD pura não tem DSA, e o seletor não aparece para ela;
  a semipresencial escolhe (o DSA dela vale na etapa presencial). *(adotada por padrão)* — Edge Cases
- C-16 · Q: Num regime nomeado, o que é TA excepcional? → A: O que passa da **quantidade de TA do regime** (num regime
  de 9 TA, o 10º), com a mesma regra de hoje — alerta, nunca bloqueio. *(adotada por padrão)* — FR-003.6
- C-17 · Q: A turma pode escolher regime de outro curso ou inativo? → A: **Não**: só regime **ativo do próprio
  curso**, garantido pelo banco. *(adotada por padrão)* — FR-003.4
- C-18 · Q: Onde a turma escolhe? → A: No formulário **Editar turma** da ficha, campo *Regime de horário*; a aba
  Horários mostra quantas turmas usam cada regime. *(adotada por padrão)* — FR-003.4, FR-004.1
- C-19 · Q: O papel do DSA muda? → A: **Não para as turmas de hoje** (nenhuma escolheu regime), então o merge segue a
  conferência, sem esperar a virada de semana. *(adotada por padrão)* — FR-007.1

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — As disciplinas dentro do curso (Priority: P1)

Quem cuida do currículo abre o curso, vai à aba **Disciplinas** e encontra ali tudo o que hoje está em
`/disciplinas`: a lista das disciplinas do curso com filtros, os números (quantas, CH prevista), a pizza da CH, e,
ao abrir uma linha, a edição, a situação, a exclusão, as unidades de ensino em tabela e as avaliações do currículo.
E cria disciplina nova ali. O menu lateral não tem mais *Disciplinas*: o caminho é sempre pelo curso.

**Why this priority**: é o centro do bloco — sem ele o menu continua apontando para uma tela que o pedido aposenta.

**Independent Test**: menu *Cursos* → um curso → aba *Disciplinas* → abrir uma disciplina, editar e criar; conferir
no banco.

**Acceptance Scenarios**:

1. **Given** um curso com disciplinas, **When** a pessoa clica na aba *Disciplinas*, **Then** vê a lista do curso,
   os dois números, a pizza da CH e os filtros (situação e busca), sem precisar escolher curso.
2. **Given** a aba aberta, **When** a pessoa abre uma linha, **Then** vê o detalhe com Editar, Situação, Excluir,
   as UEs em tabela e as avaliações do currículo — as mesmas funções de `/disciplinas` hoje.
3. **Given** quem pode criar disciplina, **When** clica em *Nova disciplina*, preenche e grava, **Then** a
   disciplina aparece na lista e no banco, com o código gerado.
4. **Given** qualquer pessoa, **When** abre o menu lateral, **Then** não há entrada *Disciplinas*.
5. **Given** um endereço antigo `/disciplinas?curso=X`, **When** ele é aberto, **Then** leva à aba *Disciplinas* do
   curso X (e `/disciplinas?turma=T` continua levando à seção de disciplinas da ficha de T).

---

### User Story 2 — A aba Avaliações só com o previsto do currículo (Priority: P1)

A aba **Avaliações** do curso mostra, por disciplina, o que o currículo prevê — as avaliações (instrumento, número,
UE, tempo de aplicação e de vista, a origem de cada tempo), o tempo de avaliação e o de aula, e os avisos do
previsto — **sem** nenhuma turma: nada de "x de y aplicadas", situação, projeção ou cumprido.

**Why this priority**: é defeito medido — o curso hoje mostra o andamento de uma turma, contra o que o plano define.

**Independent Test**: abrir a aba num curso com turma em andamento e conferir que nada da turma aparece.

**Acceptance Scenarios**:

1. **Given** um curso com turma em andamento e avaliações lançadas, **When** a pessoa abre a aba *Avaliações*,
   **Then** vê só o previsto do currículo; não aparece código de turma, "aplicadas", situação nem projeção.
2. **Given** quem pode arbitrar o tempo do currículo, **When** usa *Definir tempo* na aba, **Then** só pode definir
   para o **curso** (o currículo); o ajuste de uma turma fica na ficha da turma.

---

### User Story 3 — Regimes de horário nomeados, escolhidos pela turma (Priority: P1)

Na aba **Horários** do curso, quem cuida de horários cadastra os regimes do curso com nome — por exemplo *Regime A*
(8 TA de 50 min, intervalo de 10), *Regime B* (9 TA de 45 min), *Regime C* (8 TA, intervalos menores) —, com a
quantidade de TA por dia, a duração do TA, o início da manhã e da tarde e os intervalos (ou um horário do catálogo).
Na ficha de cada turma, quem edita a turma escolhe um desses regimes; quem não escolher fica com o **regime vigente do
curso**, exatamente como hoje. O DSA da turma (tela, papel e planilha), os alertas do 9º TA, a cascata de blocos, o
dia parado e o saldo de capacidade passam a usar o regime escolhido.

**Why this priority**: é a única parte do bloco que muda regra de cálculo, e é pedido nominal.

**Independent Test**: criar um regime nomeado de 9 TA num curso, escolhê-lo numa turma sem lançamento, abrir o DSA
dessa turma e ver 9 tempos com os horários do regime; outra turma do mesmo curso continua igual.

**Acceptance Scenarios**:

1. **Given** um curso, **When** a pessoa cria *Regime B — 9 TA de 45 min* na aba *Horários*, **Then** ele aparece na
   lista de regimes do curso e no banco.
2. **Given** uma turma sem lançamento no DSA, **When** quem edita a turma escolhe *Regime B* e grava, **Then** o DSA
   dela mostra 9 tempos com os horários do regime, e o saldo de capacidade passa a contar 9 TA por dia útil.
3. **Given** uma turma que não escolheu regime, **When** o DSA e o andamento dela são abertos, **Then** tudo sai
   **igual** ao de antes deste bloco.
4. **Given** uma turma que já tem lançamento no DSA, **When** alguém tenta trocar o regime dela, **Then** a gravação
   é recusada com a frase do porquê (a troca reinterpretaria o que já foi lançado; troca por semana fica para depois).
5. **Given** um regime nomeado em uso por turma que já tem lançamento, **When** alguém tenta mudar os horários dele,
   **Then** é recusado (o passado não se reinterpreta); a quantidade de TA e a duração **nunca** mudam depois de criado
   o regime (decorrem do currículo).
6. **Given** a aba *Horários*, **When** é aberta, **Then** mostra também as vigências do regime do curso (padrão e
   exceção), só para ler, com o caminho para o editor que já existe.

---

### User Story 4 — A aba Atividades extraclasse (Priority: P2)

A aba **Atividades** mostra o que o currículo prevê de atividades: o limite de AEC, TAD e TR do curso, com a origem de
cada um (o currículo, com a página, ou a norma, com o percentual), a referência do Estudo Individual (informativa) e o
que conta em cada categoria (os tipos de atividade do catálogo). Nada de turma.

**Why this priority**: o dado já existe e aparece hoje acima das abas; a aba o organiza.

**Independent Test**: abrir a aba num curso com limite declarado no currículo e noutro sem; conferir as duas origens.

**Acceptance Scenarios**:

1. **Given** um curso com limite de AEC no currículo, **When** a aba abre, **Then** mostra *"AEC — N TA (currículo,
   p. X)"*.
2. **Given** um curso sem limite declarado e com CH curricular, **When** a aba abre, **Then** mostra o limite pela
   norma (*"N TA (norma: P % de CH)"*).
3. **Given** a aba aberta, **When** a pessoa procura por turma, **Then** não encontra nenhuma: nem cumprido, nem
   previsto PROENS da turma.

---

### User Story 5 — A ordem das abas (Priority: P3)

As abas aparecem na ordem **Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades · Horários**, todas
alcançáveis por clique e pelo endereço (`?aba=`).

**Acceptance Scenarios**:

1. **Given** a página de um curso, **When** abre, **Then** as seis abas aparecem nessa ordem, e *Sobre o Curso* é a
   que abre por padrão.

---

### Edge Cases

- **Curso EAD** (0 TA no regime): a aba *Horários* mostra que o curso não tem tempos presenciais e não oferece
  regime nomeado para turma EAD pura (ela não tem DSA); a turma semipresencial pode escolher.
- **Regime nomeado inativado**: some da escolha de turma nova; a turma que já o usa continua com ele.
- **Turma arquivada**: a escolha de regime fica travada como toda edição (Bloco 2).
- **Curso inativo**: não se cria nem se edita regime (o curso está fora de oferta), como as vigências.
- **Disciplina sem permissão de criar**: o botão *Nova disciplina* não aparece; o banco recusa de qualquer forma.
- **Endereço `/disciplinas` sem curso**: leva ao catálogo de cursos.
- **Regime com horário do catálogo**: o relógio vem do catálogo (como hoje nas vigências); os campos de início e
  intervalo ficam como referência.

## Requirements *(mandatory)*

### FR-001 — A aba Disciplinas

- **FR-001.1**: A página do curso MUST ter a aba **Disciplinas** com a lista das disciplinas **do curso** (sem
  escolha de curso), os filtros de situação e busca, os números (disciplinas e CH prevista), a pizza da CH e a linha
  expansível com o detalhe — as mesmas funções de `/disciplinas` hoje (editar, situação, excluir, UEs em tabela,
  avaliações do currículo).
- **FR-001.2**: A aba MUST oferecer **Nova disciplina** a quem pode criar disciplina (`disciplinas.criar`), com o
  mesmo formulário da edição e a mesma ação do servidor.
- **FR-001.3**: O estado da aba (situação, busca, linha aberta) MUST ficar na URL da página do curso.
- **FR-001.4**: A entrada **Disciplinas** MUST sair do menu lateral; todo caminho por clique até as disciplinas passa
  pelo curso. O registro do menu (D-NAV) MUST ganhar a data e o motivo da mudança.
- **FR-001.5**: `/disciplinas?curso=X` MUST redirecionar para a aba Disciplinas do curso X, levando situação, busca e
  linha aberta; `/disciplinas` sem curso MUST levar ao catálogo de cursos; `/disciplinas?turma=T` MUST continuar
  levando à seção de disciplinas da ficha de T.
- **FR-001.6**: O botão *Disciplinas* da aba Grade MUST levar à aba Disciplinas do curso (sem turma escolhida) ou à
  seção da ficha (com turma escolhida), como hoje leva à tela solta.
- **FR-001.7**: Gravar disciplina, UE ou avaliação do currículo MUST atualizar a página do curso.

### FR-002 — A aba Avaliações só com o previsto

- **FR-002.1**: A aba **Avaliações** MUST mostrar, por disciplina do curso, só o previsto do currículo: os itens
  (instrumento, número, UE, tempo de aplicação e de vista, origem de cada tempo), o tempo de avaliação e o de aula, e
  os avisos do previsto.
- **FR-002.2**: A aba MUST NOT mostrar nada de turma: nem cabeçalho de turma, nem "aplicadas", situação, lançadas,
  projeção ou cumprido; e MUST NOT depender da turma escolhida na Grade.
- **FR-002.3**: *Definir tempo* na aba MUST alcançar só o **curso** (o currículo); o ajuste por turma continua na
  ficha da turma.

### FR-003 — Regimes nomeados e a escolha da turma

- **FR-003.1**: O curso MUST poder ter **regimes de horário nomeados**: nome (único entre os ativos do curso),
  quantidade de TA por dia, duração do TA (45 ou 50 min), início da manhã e da tarde, intervalos da manhã e da tarde,
  e, opcional, um horário do catálogo como relógio.
- **FR-003.2**: A **quantidade de TA por dia e a duração do TA** MUST ser imutáveis depois de criado o regime
  (`RF-HOR-02`: decorrem do currículo); os horários e intervalos MUST ser editáveis **enquanto nenhuma turma que o
  usa tiver lançamento no DSA** (`RF-HOR-05`: nenhuma edição reinterpreta o passado). A recusa MUST vir do banco, com
  frase própria.
- **FR-003.3**: Quem cria e edita regime nomeado MUST ser quem tem `horarios.criar`/`horarios.editar`; inativar MUST
  exigir `horarios.desativar`. O curso fora de oferta não aceita regime novo nem edição. Nenhum regime é apagado.
- **FR-003.4**: A turma MUST poder escolher um regime **ativo do próprio curso**, por quem edita a turma; sem escolha,
  vale o **regime vigente do curso**, exatamente como antes deste bloco.
- **FR-003.5**: A escolha MUST ser recusada pelo banco quando a turma já tiver **lançamento no DSA** (aula, avaliação,
  sessão, vista ou atividade); trocar por semana fica para depois.
- **FR-003.6**: Com regime escolhido, a turma MUST usar esse regime no **DSA** (os tempos e horários da tela, do papel
  e da planilha), no **alerta do TA excepcional** (além dos tempos do regime), na **cascata** de blocos (o último tempo
  do dia), no **dia parado** (os TA do dia) e no **saldo de capacidade** (os TA por dia útil da turma presencial ou
  semipresencial; a turma EAD segue no limite EAD do curso, `RN-MAT-04`).
- **FR-003.7**: Sem regime escolhido, todas essas contas MUST dar o **mesmo** resultado de antes do bloco.

### FR-004 — A aba Horários

- **FR-004.1**: A aba **Horários** MUST listar os regimes nomeados do curso (ativos e inativos, com os campos e a
  situação), com *Novo regime*, *Editar* e *Inativar*/*Reativar* para quem pode, e quantas turmas usam cada um.
- **FR-004.2**: A aba MUST mostrar também as **vigências do regime do curso** (padrão e exceção), só para ler, com o
  caminho para o editor que já existe.

### FR-005 — A aba Atividades extraclasse

- **FR-005.1**: A aba **Atividades** MUST mostrar o limite de AEC, TAD e TR do curso, com a origem (currículo e
  página, ou norma e percentual, ou o motivo de não haver número), a referência do Estudo Individual como informativa,
  e os tipos de atividade do catálogo agrupados pela categoria em que contam.
- **FR-005.2**: A aba MUST NOT mostrar nada de turma.

### FR-006 — A ordem das abas

- **FR-006.1**: As abas MUST seguir a ordem **Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades ·
  Horários**, com *Sobre o Curso* por padrão; a aba fica na URL (`?aba=`).

### FR-007 — O DSA no papel

- **FR-007.1**: Para turma **sem** regime escolhido — todas as de hoje —, o papel e a numeração do DSA MUST sair
  idênticos; o merge, por isso, não precisa esperar a virada de semana (o pedido só a exige quando o papel ou a
  numeração mudam).

### Key Entities

- **Regime de horário do curso** (novo): pertence a um curso; nome; TA por dia; duração do TA; início da manhã e da
  tarde; intervalos; horário do catálogo (opcional); situação (ativo/inativo). Imutável na quantidade e na duração.
- **Turma** (existente): ganha o **regime escolhido** (opcional), que é um regime ativo do próprio curso.
- **Vigência do regime do curso** (existente, `curso_regime_historico`): continua sendo o padrão de toda turma sem
  escolha.

## Success Criteria *(mandatory)*

- **SC-001**: As seis abas aparecem na ordem pedida, e cada uma se alcança por clique a partir do menu *Cursos*.
- **SC-002**: O menu lateral não tem *Disciplinas*, e **toda** função de `/disciplinas` é alcançável pela aba do
  curso — inclusive criar disciplina, que antes não era alcançável por tela nenhuma.
- **SC-003**: Na aba Avaliações de um curso com turma em andamento, **zero** elementos de acompanhamento de turma.
- **SC-004**: Uma turma que escolhe um regime de 9 TA vê 9 tempos no DSA (tela e papel) com os horários do regime, e
  o saldo de capacidade conta 9 TA por dia útil; outra turma do mesmo curso, sem escolha, não muda.
- **SC-005**: Trocar o regime de turma com lançamento e mudar o horário de regime em uso por turma com lançamento são
  **recusados pelo banco**; mudar a quantidade de TA ou a duração de um regime é recusado sempre.
- **SC-006**: Só quem tem a permissão de horários cria, edita e inativa regime; o banco recusa os demais (`42501`).
- **SC-007**: A aba Atividades mostra o limite das três categorias para os 24 cursos, com a origem certa de cada um.
- **SC-008**: `/disciplinas?curso=X` abre a aba Disciplinas do curso X com os mesmos filtros.
- **SC-009**: Sobre a cópia do remoto, com as migrations deste bloco, as views que o regime da turma toca dão o
  **mesmo** resultado de antes (nenhuma turma tem regime escolhido) — provado por impressão digital antes e depois.

## Assumptions

- O catálogo de horários (`configuracoes_horario`) continua sem tela; o regime nomeado só o **escolhe**.
- O padrão de toda turma continua sendo a vigência do curso (padrão e exceção, a exceção na frente no DSA, como hoje).
- O 9º TA continua alerta, nunca bloqueio (`RF-HOR-03.1`, `RN-DEG-02`).

## Out of scope

- Troca de regime por semana, ou regime com vigência dentro da turma.
- Editar o catálogo de horários.
- Mudar o editor das vigências do curso (fica em *Editar curso*).
- O acompanhamento da turma (fica na ficha da turma).
