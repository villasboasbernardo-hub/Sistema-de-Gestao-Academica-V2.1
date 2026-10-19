# Feature Specification: Bloco 2 — turmas (TA fora do DSA, situação, arquivar, painel) e o DSA no papel

**Feature Branch**: `feat/BLOCO-2-turmas-e-dsa-no-papel`

**Created**: 19/10/2026

**Status**: Draft — specify em 19/10/2026, pelo `/corrigir` (fluxo de 19/10/2026: um pedido = uma spec = um PR =
uma conferência; as dúvidas são decididas pela recomendação e conferidas por Bernardo no fim)

**Input**: o pedido de Bernardo Villas Boas de 19/10/2026 — *"Bloco 2 do plano de correções, tudo num PR só"* —
e o Bloco 2 de `docs/correcoes/plano-de-correcoes-em-blocos.md` (itens 1 a 7), com as decisões **D-COR-3**,
**D-COR-4** e **D-COR-5** (16/10/2026), a **`PEND-016-5`** (19/10/2026) e os dois itens do antigo Bloco 1B, que
passaram ao Bloco 2 em 19/10/2026.

> **Leia antes desta página:** `docs/correcoes/plano-de-correcoes-em-blocos.md` (Bloco 2 e as decisões D-COR) e
> a spec 016 (`specs/016-correcoes-bloco-1/`), que criou a base "até hoje" (M1) que este bloco estende.

> ⚠️ **ONDE CADA NÚMERO DESTA SPEC FOI MEDIDO** (regra 9.2):
> - **Código:** ramo `feat/BLOCO-2-turmas-e-dsa-no-papel` em `c1f8d65` — a `main` `a0c6809` mais o PR #71 (o
>   fluxo `/corrigir`), ainda aberto quando esta spec foi escrita. Leitura por seis leitores independentes, só de
>   leitura, com arquivo e linha (registro em `triagem.md`).
> - **Dado:** banco **local** restaurado da cópia **`remoto-20261019-024230.sql`** (19/10/2026, 02:42), o backup do
>   rito do PR #69. O remoto **não** foi lido de novo.
> - Onde um número vem de outro artefato, ele é nomeado ali.

---

## 1. O problema, em uma frase

**A turma ainda não registra o que acontece fora do DSA, não guarda por que mudou de situação, não tem como sair
de cena sem perder o histórico, e não tem um painel; e o cartão do DSA corta o instrutor quando o nome da
disciplina é longo.**

## 2. Paridade ou novidade (Princípio X)

| Natureza | Itens | Por que entra |
|---|---|---|
| **Regra nova por decisão nominal** | TA fora do DSA (D-COR-3), observação na troca (D-COR-4), arquivar (D-COR-5) | Decisões de Bernardo Villas Boas de 16/10/2026, registradas no plano de correções; o pedido de 19/10/2026 é a ordem de fazer |
| **Paridade** | Painel de turmas | Parte da **`PEND-5a-2`** (indicadores de turma da v2.0: total e por situação); o resto (iniciando em 30 dias, avisos) é o molde do painel de instrutores, pedido nominal |
| **Defeito** | Nome longo no cartão do DSA, quadro de CH fora da ordem natural, `PEND-016-5`, e o defeito achado na triagem (editar disciplina apaga técnica e local) | Correção de defeito reportado |
| **Sem objeto** | Mover de Cursos para Turmas o que é da turma (item 5) | Medido: nada que se **edita** da turma sobrou em Cursos (FR-006) |

## 3. O que é banco e o que é só tela

| Item | Banco? | Classificação pela regra 9.4 (emenda de 19/10/2026) |
|---|---|---|
| TA fora do DSA | **Sim** — tabela nova, recurso novo na matriz e um ramo novo nas três somas da CHD | **Acrescenta.** Tabela nova; as views da CHD ganham um ramo que **soma zero** enquanto a tabela estiver vazia — o resultado de nada que está em tela muda na aplicação, e isso é **provado** por impressão digital das views antes e depois, na cópia do remoto (SC-010) |
| `PEND-016-5` | **Sim** — coluna nova, no fim, na base da M1 (`vw_chd_por_fato`), dizendo se o fato tem posição na grade | **Acrescenta.** Coluna nova no fim de view; o resto da view igual |
| Observação na troca | **Sim** — trilha nova, só de acréscimo, e a função que troca e anota de uma vez | **Acrescenta.** Tabela e função novas; o gatilho que anota **não recusa nada** |
| Arquivar | **Sim** — registro novo de arquivamento, com as colunas pedidas (`arquivada_em`, `arquivada_por`, observação) | **Acrescenta**, para arquivar e desarquivar. ⚠️ **A TRAVA no banco é PORTÃO**: travar DSA, instrutor e edição no banco mexe nas policies (ou nos guardas) de tabelas que existem — **para antes do remoto e mostra o desenho** (FR-004.6). A trava da tela e do servidor vale desde o PR |
| Painel de turmas | **Sim** — um parâmetro novo (`turmas.aviso_inicio_dias`) e uma função nova que entrega a ocupação para o conflito em lote | **Acrescenta.** Linha nova de parâmetro e função nova |
| Nome no DSA | **Sim** — coluna nova, nulável, em `disciplinas`, e exposta no fim de `vw_disciplinas_execucao` | **Acrescenta** |
| Quadro de CH na ordem natural | **Não** | Só `lib/dominio/` |
| Cursos → Turmas | **Não** | Sem objeto |

Nenhuma policy de `DELETE`. Nenhum valor novo no enum de situação da turma.

---

## 4. User Scenarios & Testing *(mandatory)*

### User Story 1 — Registrar o que a turma fez fora do DSA (Priority: **P1**)

A Encarregada da Administração Acadêmica abre a ficha de uma turma e, numa disciplina, registra 5 TA dados fora
dos tempos convencionais (ou o histórico de uma turma que nunca lançou DSA), com a observação obrigatória dizendo o
quê e por quê. A execução da turma e da disciplina passa a contar os 5, e a tela mostra separado: *"45 TA
executados · 40 no DSA · 5 fora do DSA"*.

**Why this priority**: é a decisão D-COR-3 e a dependência que a spec 016 deixou para este bloco; sem ela o
histórico de curso concluído e a aula que virou EAD ficam fora da CH executada.

**Independent Test**: registrar TA fora do DSA numa disciplina de uma turma da semente e conferir, por clique, o
`/inicio`, a lista `/turmas`, a ficha (andamento, tabela de disciplinas, card de CHT) e a situação do DSA.

**Acceptance Scenarios**:

1. **Given** uma turma com 40 TA executados no DSA, **When** o Encarregado registra 5 TA fora do DSA, com data de
   hoje e observação, numa disciplina dela, **Then** a ficha mostra *"45 TA executados · 40 no DSA · 5 fora do
   DSA"*, a disciplina mostra os 5 a mais, e o `/inicio`, a `/turmas` e o saldo contam os 45.
2. **Given** o mesmo registro, **When** se abre o DSA da semana da data dele, **Then** a *Situação por disciplina*
   conta os 5 no acumulado, e a grade **não** ganha cartão nenhum.
3. **Given** um Operador, **When** ele tenta registrar TA fora do DSA, **Then** a tela não oferece o botão e o
   banco recusa (`42501`).
4. **Given** um registro feito por engano, **When** o Encarregado o desfaz, **Then** ele sai das somas (exclusão
   lógica) e continua no histórico, marcado como desfeito.
5. **Given** a quantidade 0 ou negativa, ou sem observação, ou com data no futuro, **When** se tenta gravar,
   **Then** a recusa diz o motivo em português e nada é gravado.

---

### User Story 2 — Saber por que a turma mudou de situação (Priority: **P1**)

Quem troca a situação da turma (cancelada, concluída…) escreve, se quiser, uma observação no mesmo diálogo
*"Trocar situação"*. A ficha passa a mostrar o histórico: de qual situação para qual, quem, quando e a observação.

**Why this priority**: D-COR-4. Hoje a turma só guarda quem editou por último; o porquê de um cancelamento se perde.

**Independent Test**: trocar a situação de uma turma da semente com observação e conferir o histórico na ficha
depois de recarregar, e no banco.

**Acceptance Scenarios**:

1. **Given** uma turma ativa, **When** o Encarregado a troca para *Concluída* com a observação *"curso encerrado
   em 16/10"*, **Then** a ficha mostra *"Ativa → Concluída"*, o nome de quem trocou, a data e a observação.
2. **Given** a mesma troca **sem** observação, **When** ela é gravada, **Then** o histórico também a registra, com
   a observação vazia.
3. **Given** quem só lê a turma, **When** abre a ficha, **Then** vê o histórico e não vê o botão de trocar.

---

### User Story 3 — Arquivar uma turma sem perder nada (Priority: **P1**)

Uma turma que já não interessa ao dia a dia (concluída há tempo, cancelada, ou criada por engano) é **arquivada**:
ela sai das listas, ninguém lança nada nela, e o histórico fica inteiro. Se a turma não estiver concluída, a tela
avisa antes. Só o Administrador desarquiva.

**Why this priority**: D-COR-5, que reabre nominalmente a TURMA-1.

**Independent Test**: arquivar uma turma da semente, conferir que ela some de `/turmas` (e volta com *Mostrar
arquivadas*), que o DSA e a ficha ficam só de leitura, e desarquivar como Admin.

**Acceptance Scenarios**:

1. **Given** uma turma ativa, **When** o Encarregado clica em *Arquivar turma*, **Then** a tela avisa que ela não
   está concluída e pede confirmação; confirmada, a turma sai de `/turmas`, do `/inicio`, da aba Grade do curso e do
   filtro de `/atividades`, e a situação dela **não muda**.
2. **Given** a turma arquivada, **When** alguém abre a ficha pelo endereço, **Then** vê *"Turma arquivada em
   DD/MM/AAAA por X — somente leitura"*, sem nenhum botão de gravar; o DSA abre só para ler e imprimir.
3. **Given** a turma arquivada, **When** qualquer gravação nela é tentada (lançar no DSA, atribuir instrutor,
   editar, trocar situação, registrar TA fora do DSA), **Then** o servidor recusa com a frase da turma arquivada.
4. **Given** um Encarregado (não Admin), **When** tenta desarquivar, **Then** a tela não oferece e o banco recusa;
   **Given** o Admin, **When** desarquiva, **Then** a turma volta às listas e à escrita como era.
5. **Given** `/turmas` com *Mostrar arquivadas* ligado, **When** a lista abre, **Then** as arquivadas aparecem
   marcadas *"Arquivada"*.

---

### User Story 4 — Um painel das turmas (Priority: **P2**)

No alto de `/turmas`, cinco números do recorte — total, em andamento, concluídas, canceladas e iniciando nos
próximos 30 dias — e um quadro de avisos do que falta: turma sem janela de datas, disciplina sem instrutor e
conflito no DSA desta semana, cada aviso levando à ficha da turma.

**Why this priority**: molde do painel de instrutores; parte da paridade `PEND-5a-2`.

**Independent Test**: abrir `/turmas` com a semente e conferir os cinco números e os três tipos de aviso contra o
que a semente plantou; filtrar e ver os números acompanharem o recorte.

**Acceptance Scenarios**:

1. **Given** o recorte inteiro, **When** `/turmas` abre, **Then** os cinco indicadores batem com as linhas da
   tabela (arquivadas fora, salvo com o filtro).
2. **Given** uma turma planejada com uma disciplina sem instrutor atribuído, **When** o painel abre, **Then** o
   aviso *"Disciplina sem instrutor"* a nomeia, com quantas, e leva à ficha dela.
3. **Given** dois lançamentos desta semana em turmas diferentes, no mesmo dia e TA, com o mesmo instrutor,
   **When** o painel abre, **Then** o aviso *"Conflito no DSA desta semana"* nomeia as duas turmas.
4. **Given** um filtro (curso, ano, situação ou busca), **When** aplicado, **Then** indicadores e avisos passam a
   ser do recorte.

---

### User Story 5 — O cartão do DSA com o nome que cabe (Priority: **P1**)

A disciplina de nome longo (*"Equipamentos e Sistemas Eletrônicos de Auxílios à Navegação"*) aparece no cartão do
DSA com o **nome no DSA** cadastrado — ou, se não houver, com uma abreviação automática e sempre igual — e o
instrutor nunca some do cartão, nem no de 1 TA. O nome inteiro continua no quadro de CH.

**Why this priority**: defeito do papel assinado (RNF-COMP-01), achado na conferência do PR #68.

**Independent Test**: imprimir uma semana com uma aula de 1 TA da disciplina de nome mais longo do catálogo real e
conferir, por caixa, que o instrutor fica dentro do cartão; cadastrar um nome no DSA e vê-lo no cartão da tela, do
papel e da planilha, com o nome inteiro no quadro de CH.

**Acceptance Scenarios**:

1. **Given** uma disciplina com *Nome no DSA* = *"Equip. e Sist. Eletr. de Aux. à Naveg."*, **When** se abre o DSA,
   o papel e a planilha, **Then** os três cartões mostram esse nome e o quadro de CH mostra o nome inteiro.
2. **Given** uma disciplina sem *Nome no DSA* e com nome acima do limite, **When** o cartão é desenhado, **Then**
   sai a abreviação automática — a mesma nas três superfícies e a cada impressão.
3. **Given** uma aula de 1 TA da disciplina de 81 caracteres, **When** o papel é impresso, **Then** o instrutor fica
   inteiro dentro do cartão e a folha continua com uma página.
4. **Given** o cadastro de uma disciplina com técnica sugerida e local padrão, **When** alguém edita só o nome no
   DSA e grava, **Then** a técnica e o local continuam os mesmos.

---

### User Story 6 — O quadro de CH na ordem certa (Priority: **P2**)

No quadro de CH do papel (e no da tela e no rodapé da planilha), as disciplinas saem em ordem natural: *IV, V, IX,
X*, e não *IV, IX, V, X*.

**Independent Test**: uma semana com disciplinas IV, V, IX e X e conferir a ordem nas três superfícies.

**Acceptance Scenarios**:

1. **Given** as disciplinas IV, IX, V e X na semana, **When** o papel é impresso, **Then** o quadro as lista IV, V,
   IX, X, e a planilha igual.

---

### Edge Cases

- **TA fora do DSA em disciplina já concluída**: grava; a disciplina passa da CH prevista e aparece como no DSA
  (excesso), sem bloqueio (`RN-DEG-02`).
- **TA fora do DSA com data futura**: recusado (o que é *executado* não está no futuro); a "até hoje" já o cortaria.
- **TA fora do DSA numa linha de turma inativa**: recusado; a disciplina tem de estar ativa na turma.
- **Troca de situação feita por outro caminho** (script de carga, `service_role`): fica no histórico, sem
  observação e sem autor (`criado_por` nulo, o mesmo de toda escrita sem sessão).
- **Arquivar turma já arquivada / desarquivar turma que não está**: recusado, com a frase própria.
- **Turma arquivada com link explícito** (`/turmas/<código>`, DSA, impressão): abre só para ler.
- **Turma arquivada e a disciplina nova do curso**: não nasce nela.
- **Turma arquivada no limite de turmas por ano e no veto de inativar curso**: continua contando pela situação dela
  (arquivar não muda a situação).
- **Conflito no painel sem acesso à outra turma**: o perfil recortado vê *"conflito com outra turma"* sem o código
  dela (a ocupação alheia é anônima, como no DSA).
- **Disciplina sem instrutor numa turma concluída ou cancelada**: não avisa (só planejada e ativa).
- **Nome no DSA maior que o limite**: recusado no cadastro, com o limite dito na frase.
- **Nome com espaço duplo ou com a sigla de outro curso** (medido no catálogo): a abreviação automática dá sempre o
  mesmo resultado.
- **`PEND-016-5` na base real**: medido na cópia de 19/10/2026, **0** aula ativa, **0** sessão de aplicação ativa e
  **0** avaliação viva sem `ta_inicial`; **102** vistas ativas sem `ta_inicial`, todas com **0** TA. Logo a correção
  **não muda** nenhum DSA real hoje; ela passa a valer para o TA fora do DSA e para o histórico que vier.

---

## 5. Requirements *(mandatory)*

### FR-001 — TA fora do DSA (D-COR-3)

- **Medido:** nada do recurso existe (nenhuma tabela, ação ou tela). A base "até hoje" (`vw_chd_por_fato`) já
  alimenta o `/inicio`, a ficha, a `/turmas`, a tabela de disciplinas e a aba Avaliações (spec 016, M1); o card de
  CHT da ficha lê `vw_carga_horaria_turma` e o DSA lê `vw_disciplinas_execucao`. O pgTAP 135 prova que as três somas
  batem (`PEND-016-1`).
- **FR-001.1**: Quem pode (FR-001.2) MUST poder registrar, numa **disciplina ativa da turma**, um lote de TA fora do
  DSA com: **quantidade** inteira ≥ 1 (sem ajuste negativo), **data** (obrigatória; a tela sugere hoje, no fuso de
  São Paulo; data futura é recusada), **instrutor** (opcional, escolhido pelo seletor único, em antiguidade) e
  **observação obrigatória** (pelo menos 3 caracteres úteis).
- **FR-001.2**: Registram e desfazem **só** o Administrador, o Encarregado e o Ajudante da Administração Acadêmica —
  o trio do `previsto_proens`. A recusa a qualquer outro perfil MUST vir do **banco** (`42501`). Leem os registros
  todos os que leem a turma, no alcance deles.
- **FR-001.3**: Corrigir é **desfazer** o registro (exclusão lógica, com quem e quando) e registrar de novo; não há
  edição da quantidade.
- **FR-001.4**: Os TA fora do DSA MUST somar na CH executada **da turma** e **da disciplina**, nas três somas da CHD
  (a base da M1 e as duas views), e por isso no `/inicio`, na `/turmas` (progresso e saldo), na ficha (andamento,
  tabela de disciplinas, card de CHT), na aba Avaliações e no DSA. Fora do DSA e da planilha, valem **até hoje**,
  pela data do registro (D-COR-2).
- **FR-001.5**: A ficha MUST mostrar a execução separada quando houver TA fora do DSA: *"N TA executados · X no DSA ·
  Y fora do DSA"* no andamento, e *"· Y fora do DSA"* na linha da disciplina. A ficha MUST listar os registros da
  disciplina (data, quantidade, instrutor, observação, quem registrou, e se foi desfeito).
- **FR-001.6**: O TA fora do DSA **não ocupa** tempo na grade do DSA: não vira cartão, não entra na ocupação, não
  dispara conflito nem conta no teto de TA do dia ou da semana.
- **FR-001.7**: *"Marcar a disciplina como concluída"* é registrar os TA que faltam: a disciplina conclui pelos
  critérios que já existem; **não** há marca gravada nova.
- **FR-001.8**: O TA fora do DSA **não** entra na carga do instrutor (`vw_instrutor_carga_anual`) neste bloco —
  adotado por padrão, ver Clarifications.

### FR-002 — `PEND-016-5`: o DSA soma o que não tem posição

- **Medido:** a *Situação por disciplina* e o quadro de CH do papel acumulam pela ocupação da grade
  (`vw_ocupacao_ta`, que exige `ta_inicial`); a cascata por UE do mesmo painel já conta o sem posição. Na base real
  (cópia de 19/10/2026) não há fato de CHD ativo sem posição que some TA (ver Edge Cases).
- **FR-002.1**: O acumulado da *Situação por disciplina*, o do quadro de CH do papel e o da aba CONTROLE da planilha
  MUST somar, até o último dia da semana mostrada, **também** os fatos de CHD sem posição na grade e os TA fora do
  DSA, pela data deles.
- **FR-002.2**: O caso que discrimina é o da semente do e2e da spec 016: 10 TA históricos sem `ta_inicial` mais 8
  futuros com posição, numa disciplina de 100 → a situação da semana do lançamento futuro passa de **8 %** para
  **18 %**.

### FR-003 — Observação em toda troca de situação (D-COR-4)

- **Medido:** a troca existe desde o PR #67 (`TrocarSituacao.tsx`, Server Action com `update` direto em `turmas`);
  não há observação nem histórico (só `editado_por`/`editado_em`); a situação nasce na criação.
- **FR-003.1**: O diálogo *"Trocar situação"* MUST ganhar o campo **Observação**, **opcional** (decisão 13 da
  triagem de 16/10/2026: *"Observação ao cancelar/concluir: opcional"*), até 500 caracteres.
- **FR-003.2**: **Toda** troca de situação gravada MUST deixar no histórico: a situação anterior, a nova, a
  observação (ou vazia), quem e quando — por qualquer caminho que mude a situação, inclusive o que não passa pela
  tela. A troca e a anotação MUST ser **uma gravação só** (tudo ou nada).
- **FR-003.3**: O histórico é **só de acréscimo**: nem a `service_role` reescreve ou apaga.
- **FR-003.4**: A ficha MUST mostrar o histórico da situação e do arquivamento (mais recente primeiro), para todos
  que leem a turma.
- **FR-003.5**: A criação da turma não gera linha no histórico (a situação inicial é a do cadastro).

### FR-004 — Arquivar turma em qualquer estado (D-COR-5)

- **Medido:** não existe coluna, view ou filtro de arquivamento (a *"VIEW sobre turmas concluídas"* da TURMA-1
  nunca foi criada). O projeto já trava escrita por estado no banco para **curso inativo** (as funções
  `*_em_oferta` nas policies de 22 tabelas, provadas por enumeração no pgTAP 105). As listas de turma leem `turmas`
  sem filtro de estado em `/turmas`, `/inicio`, aba Grade do curso, `/atividades` e outras.
- **FR-004.1**: Quem pode editar a turma (`turmas.editar`) MUST poder **arquivá-la em qualquer situação**, pela
  ficha, com observação opcional; se a turma não estiver **concluída**, a tela MUST avisar antes e pedir
  confirmação.
- **FR-004.2**: Arquivar **não** é situação: o enum continua com os quatro valores; o arquivamento é **registro
  próprio** com `arquivada_em`, `arquivada_por` e a observação, e a situação da turma não muda.
- **FR-004.3**: A turma arquivada MUST sumir de `/turmas` (salvo com o filtro novo *Mostrar arquivadas*), do
  `/inicio` (panorama e alertas), da aba Grade do curso (lista e seletor) e do filtro de turma de `/atividades`. Por
  endereço direto, a ficha, o DSA, a impressão e a planilha **abrem só para ler**.
- **FR-004.4**: Na turma arquivada a tela MUST mostrar *"Turma arquivada em DD/MM/AAAA por X — somente leitura"* e
  esconder todo botão de gravar, e o **servidor** MUST recusar toda gravação nela: DSA (lançar, editar, mover,
  excluir, parar dia, estudo individual), atribuição de instrutor, período por disciplina, edição da turma, troca de
  situação, TA fora do DSA, avaliações do currículo da turma e previsto PROENS.
- **FR-004.5**: **Só o Administrador** MUST poder desarquivar, e a recusa a qualquer outro perfil vem do **banco**.
  Arquivar e desarquivar ficam no histórico (FR-003.4).
- **FR-004.6**: ⚠️ **PORTÃO (regra 9.4)**: a trava das gravações também no **banco**, no molde do curso inativo
  (policies das tabelas da turma e um guarda por valor em `turmas`), é migration que **altera** o que existe. Ela é
  escrita e provada neste PR, mas **não vai ao remoto** antes de Bernardo ver o desenho. Disciplina nova do curso
  MUST não nascer em turma arquivada.
- **FR-004.7**: A turma arquivada continua contando no limite de turmas por ano e no veto de inativar curso pela
  situação dela — adotado por padrão, ver Clarifications.

### FR-005 — Painel de turmas (molde do painel de instrutores)

- **Medido (código):** o painel de instrutores vive na própria lista, com indicadores, gráficos e quadro de avisos
  calculados sobre as mesmas linhas do recorte. `/turmas` hoje tem só a contagem. Já existem, por turma: o aviso
  *sem janela* (`avisosDaTurma`), o sinal de disciplina sem instrutor (`sinaisDaDisciplina`) e o conflito
  `RN-CONF-01` do DSA (`detectarConflitos`, só na semana aberta do DSA). *"Em andamento"* no `/inicio` é situação
  *ativa*.
- **Medido (dado, cópia de 19/10/2026):** 29 turmas — 8 ativas, 4 planejadas, 12 concluídas, 5 canceladas; **10**
  planejadas ou ativas com disciplina ativa sem atribuição ativa; **1** planejada ou ativa sem janela de datas;
  **0** com início entre 19/10 e 18/11/2026.
- **FR-005.1**: `/turmas` MUST mostrar cinco indicadores do recorte: **Total**, **Em andamento** (situação ativa,
  como no `/inicio`), **Concluídas**, **Canceladas** e **Iniciando em até N dias** (início entre hoje e hoje + N,
  não cancelada), com N no parâmetro operacional novo `turmas.aviso_inicio_dias` = **30**.
- **FR-005.2**: `/turmas` MUST mostrar um quadro de avisos, com a contagem por tipo sempre à vista e a lista
  recolhível, de três tipos: **Sem janela de datas**, **Disciplina sem instrutor** (turma planejada ou ativa com ao
  menos uma disciplina ativa sem atribuição ativa; diz quantas) e **Conflito no DSA desta semana** (`RN-CONF-01`,
  pela função canônica, na semana corrente de segunda a sábado). Cada aviso leva à ficha da turma.
- **FR-005.3**: Indicadores e avisos saem das **mesmas linhas** da tabela (o recorte), sem as arquivadas salvo com o
  filtro.
- **FR-005.4**: Sem permissão para ler o que o aviso precisa, o quadro MUST dizer que não pôde ler, e não *"nenhum
  aviso"* (gotcha 4).

### FR-006 — O que sobrou em Cursos e é da turma

- **Medido:** em Cursos não se **edita** nada da turma: instrutor por disciplina da turma e período por disciplina
  já vivem só na ficha (spec 012, FR-018); a aba Grade do curso mostra, só para ler, a situação, a janela, a sala e
  o efetivo da turma selecionada e a lista das turmas do curso, que o FR-017 da spec 012 manda manter.
- **FR-006.1**: **Sem objeto** neste bloco. A limpeza do acompanhamento de turma nas abas do curso é o item 4 do
  Bloco 3. A única mudança em Cursos é a do FR-004.3 (a arquivada sai da aba Grade).

### FR-007 — O nome da disciplina no cartão do DSA

- **Medido:** o cartão das três superfícies usa o **mesmo** nome do quadro de CH (`vw_disciplinas_execucao`). Na
  tela o nome não tem limite, o tópico tem 3 linhas e o instrutor 1; no papel **nada** corta (o cartão transborda);
  na planilha a linha de 1 TA tem 34 pt e o instrutor é o último. No catálogo real (cópia de 19/10/2026): **172**
  disciplinas ativas; nomes com mais de 30 caracteres **61**, mais de 40 **31**, mais de 50 **20**, mais de 60
  **9**; o maior tem **81**.
- **FR-007.1**: O cadastro da disciplina MUST ganhar o campo **"Nome no DSA"** (opcional, até `[pendente: limite
  medido no plan]` caracteres), com a prévia do que o cartão vai mostrar.
- **FR-007.2**: Sem *Nome no DSA*, o cartão MUST usar uma **abreviação automática reproduzível**, aplicada só ao
  nome que passa do limite — o mesmo resultado nas três superfícies e a cada impressão.
- **FR-007.3**: O nome no DSA vale **só no cartão** (tela, papel e planilha; e na lista sem relógio); o **quadro de
  CH**, o rótulo acessível do cartão e o resto do sistema mantêm o nome inteiro.
- **FR-007.4**: **Nenhum cartão corta o instrutor**: no papel e na tela, o instrutor fica inteiro dentro do cartão,
  inclusive no de 1 TA e no modo compacto; quem cede espaço é o tópico. A folha continua com uma página.
- **FR-007.5**: Editar a disciplina MUST preservar a técnica sugerida, o local padrão e o nome no DSA que não foram
  mexidos (defeito achado na triagem: hoje a edição grava nulo em técnica e local).

### FR-008 — O quadro de CH na ordem natural

- **Medido:** `tabelaDeCh` ordena por texto (`localeCompare`), e o espelho da planilha copia a ordem; a função única
  `emOrdemNaturalDoCodigo` já existe e é usada pelo painel do DSA e pela CONTROLE.
- **FR-008.1**: O quadro de CH do papel, o do documento na tela e o rodapé da planilha MUST ordenar pela função única
  de ordem natural (o romano pelo valor).

### FR-009 — Entrega

- **FR-009.1**: Um PR só. Como ele muda o papel do DSA, o **merge só entre semanas** (sexta à noite a domingo), para
  nenhum DSA da mesma semana sair com dois desenhos.
- **FR-009.2**: Todo caminho novo de tela é alcançável **por clique** e provado por e2e que chega por clique.

### 5.1 Key Entities

- **TA fora do DSA**: turma, disciplina da turma, data, quantidade, instrutor (opcional), observação, situação
  (ativo/desfeito), auditoria.
- **Troca de situação**: turma, situação anterior, situação nova, observação, autor, quando. Só de acréscimo.
- **Arquivamento**: turma, ação (arquivar/desarquivar), observação, autor, quando; o estado atual da turma
  (`arquivada_em`, `arquivada_por`, observação) é o último arquivamento sem desarquivamento depois.
- **Nome no DSA**: atributo opcional da disciplina.
- **Parâmetro `turmas.aviso_inicio_dias`**: operacional, 30.

## 6. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Registrar 5 TA fora do DSA numa disciplina soma **5** na execução da turma no `/inicio`, na `/turmas`,
  na ficha (andamento, tabela e card de CHT) e no DSA, e a ficha mostra o *"· 5 fora do DSA"* — conferido por clique
  e no banco.
- **SC-002**: Nenhum perfil fora do trio grava TA fora do DSA, e nenhum perfil além do Admin desarquiva: a recusa vem
  do banco, com `42501`, provada com sessão real.
- **SC-003**: 100 % das trocas de situação gravadas aparecem no histórico da ficha, inclusive as sem observação e as
  feitas fora da tela.
- **SC-004**: A turma arquivada some das quatro listas (FR-004.3), aparece com o filtro, e **zero** gravação passa
  pelo servidor enquanto arquivada; desarquivada pelo Admin, volta como era.
- **SC-005**: Os cinco indicadores e os três avisos do painel batem com as linhas da tabela, inclusive filtrada.
- **SC-006**: **Zero** cartão do papel corta o instrutor, medido por caixa num DSA com aulas de 1 TA das disciplinas
  de nome mais longo do catálogo; a folha sai com **1** página.
- **SC-007**: O quadro de CH lista IV, V, IX, X nas três superfícies.
- **SC-008**: A abreviação automática dá nome dentro do limite para **172 de 172** disciplinas ativas do catálogo
  real, e o mesmo nome em duas execuções.
- **SC-009**: O caso que discrimina da `PEND-016-5` vira de 8 % para 18 % (FR-002.2).
- **SC-010**: Aplicadas as migrations que **acrescentam**, **nada que está em tela muda**: a impressão digital do
  conteúdo de `vw_chd_por_fato` (colunas antigas), `vw_carga_horaria_turma` e `vw_disciplinas_execucao` (colunas
  antigas) é **igual** antes e depois, medida na cópia do remoto.

## 7. Assumptions

- "Hoje" é sempre o de São Paulo (`hojeNaCiaara()`), passado por quem chama; nenhuma função nova usa o relógio do
  servidor (D20).
- "Ajudantes" no D-COR-3 é o **Ajudante da Administração Acadêmica** (CIAARA-11), não o da Orientação Pedagógica:
  a decisão fala da Divisão, e o trio já existe na matriz (`previsto_proens`).
- "Em andamento" no painel é a situação *ativa*, igual ao KPI do `/inicio`, para os dois não discordarem.
- A semana do conflito no painel é a semana corrente (segunda a sábado), a mesma régua do DSA.
- O limite de caracteres do nome no cartão sai da medição do cartão real no papel (plan), não de um número escolhido.
- As sessões de outras turmas que a pessoa não alcança entram no conflito como ocupação **anônima**, do jeito que o
  DSA já faz (`conflitos_da_semana`).

## 8. O que NÃO entra nesta spec

- Os Blocos 3 a 6 (abas do curso, Início, cadastros novos, currículo versionado).
- A unificação das três somas da CHD (`PEND-016-1`): o TA fora do DSA entra nas três, e a guarda do pgTAP 135 segue
  provando que batem.
- Gráficos no painel de turmas (só os indicadores e os avisos pedidos).
- TA fora do DSA na carga do instrutor.
- Renomear a aba *Grade* do curso (Bloco 3).
- Escrever dado no remoto.

## 9. Regras e decisões anteriores que este bloco muda

| Regra ou decisão | O que muda | Com qual decisão |
|---|---|---|
| **TURMA-1** (28/08/2026): *"Arquivada é VIEW, não valor novo"* | Arquivar passa a ser **registro próprio** com `arquivada_em`/`arquivada_por`/observação; continua **não** sendo valor de situação. A view sobre turmas concluídas nunca existiu | D-COR-5 (16/10/2026), reaberta nominalmente |
| **FR-008.2 da spec 016** (Q-12): *"o papel e a planilha não mudam"* com o cartão novo | O **nome** do cartão (FR-007) e a garantia do instrutor (FR-007.4) passam a valer na tela, no papel e na planilha | Pedido de 19/10/2026 ("vale só no DSA: tela, papel, planilha") |
| **`consulta.ts`** — a ordem natural *"só do painel; ordenar aqui mudaria o papel em silêncio"* | O quadro de CH passa à ordem natural nas três superfícies | Item 7 do Bloco 2 (antigo 1B.2) |
| **`PEND-016-5`** | O DSA passa a somar o que não tem posição | Decisão de 19/10/2026 |

## 10. Divergências encontradas — listadas, não corrigidas (salvo onde dito)

1. **Editar disciplina apaga técnica sugerida e local padrão** (`FormularioDeDisciplina.tsx` sem valor inicial nos
   dois campos; `editarDisciplina` manda nulo). **Corrigido neste bloco** (FR-007.5), porque o campo novo mora no
   mesmo formulário e seria apagado do mesmo jeito.
2. **Três critérios de "disciplina concluída"** (DSA, tabela da ficha e aba Avaliações) dão resultados diferentes
   quando a CH prevista é 0. Não corrigido; registrado como pendência.
3. **O plano de correções** diz que a aba Avaliações do curso tem *"só o previsto no currículo"*; o código mostra o
   cumprido da turma escolhida. Não corrigido (é do Bloco 3, item 4).
4. **Comentário vencido** em `lib/acoes/turma.ts` e `lib/navegacao/contrato.ts`: dizem que mudar ano ou rótulo regera
   o código da turma; o gatilho recusa e não regera. Não corrigido.
5. **`sessoes_de_aplicacao_codigo_key`** (`SAP-`) não está na tradução de recusa de numeração interna, embora esteja
   na lista de sequências. **Corrigido neste bloco**, porque a sequência nova entra na mesma lista.
6. **O diálogo *Trocar situação* escreve as quatro situações à mão**, em vez de lê-las do enum gerado. Corrigido junto
   do FR-003.1, que mexe no mesmo componente.
