# Feature Specification: Disciplinas e atribuição por turma — Épico 5, fatia (b)

**Feature Branch**: `feat/EPICO-5b-disciplinas-e-atribuicao`

**Created**: 2026-09-24

**Status**: Draft

**Input**: Épico 5 da v2.1 — fatia (b): disciplinas. Escopo tirado de `docs/fase-1/06-Backlog-de-Epicos-V2.1.md` §3 (Épico 5, linhas *Disciplinas* e *Transversal*, critérios de aceite 3, 4 e 5) e de `docs/vibe-coding/42-Prompts-por-Epico.md` (parágrafo *"Para a fatia (b) — disciplinas"*), sem acréscimo.

---

## Contexto de ramo — leia antes de qualquer coisa

⚠️ **ESTE RAMO NASCEU DA `main`, E A `main` AINDA NÃO TEM AS TELAS DA FATIA (a).** O PR 2 daquela
fatia está **aberto como rascunho** (`#18`) e espera a conferência de Bernardo. Esta spec **cita pelo
nome** o que virá de lá e **não o reimplementa**:

| O que vem do PR 2 | Para que esta fatia usa |
|---|---|
| `components/ciaara/seletor-turma.tsx` | o segundo degrau da cascata (curso → **turma** → disciplina) |
| `lib/navegacao/endereco-de-turma.ts` | o endereço de turma, numa grafia só |
| `lib/dominio/confirmacao-de-gravacao.ts` | a lista fechada de escritas que confirmam antes de salvar |
| `components/ciaara/botao-limpar-filtros.tsx` | o botão *Limpar filtros*, padrão de tela desde 23/09/2026 |
| Rotas `/cursos`, `/cursos/[curso]`, `/turmas/[turma]` | os pontos de entrada da cascata |

⚠️ **ESTE RAMO SERÁ REBASEADO SOBRE A `main` DEPOIS DO MERGE DO PR 2**, antes de qualquer
implementação. Enquanto isso não acontece, nada aqui pode **depender de arquivo que não existe na
`main`** — o que se faz agora é a spec, não o código.

---

## O que foi MEDIDO, e contra qual artefato

*(regra 9.2 do `CLAUDE.md`: todo "medido: N" nomeia o artefato. Tudo abaixo foi medido em
**24/09/2026** no **banco local recém-carregado pelo ETL** — `python -m scripts.etl.executar`,
veredito **APROVADA**, 5.394 linhas.)*

| Medida | Valor | Por que importa aqui |
|---|---|---|
| `disciplinas` | **175**, em **24** cursos | a grade do curso — o primeiro degrau do CRUD |
| `disciplinas` sem `previsao_inicio` | **86 de 175** | a sinalização de *"início em ≤ 30 dias"* não tem o que ler em metade da base |
| `turma_disciplina` | **210** | a instância por turma: período e instrutor **daquela** turma |
| … com instrutor escolhido | **79 de 210** | o resto está sem — é o estado normal, não defeito |
| … com período preenchido | **89 de 210** (`herdado_grade` 89 · `nao_informado` 121 · `manual` **0**) | **ninguém ainda editou período por turma** na v2.1 |
| … com CH rateada por instrutor | **0 de 210** | a coluna existe e **nunca foi preenchida** |
| `turma_disciplina_instrutor` | **96** atribuições | a tabela de junção, com `ch_prevista_tempos` por instrutor |
| … linhas com **mais de um** instrutor | **6** | é **só aqui** que o rateio do `RF-MATERIAS-06` muda alguma coisa |
| `instrutor_disciplina` (habilitação) | **798** | é o que filtra quem pode ser oferecido (`RF-MATERIAS-02`) |
| disciplinas sem **nenhum** instrutor, em turma nenhuma | **90 de 175** | a sinalização do `RF-MATERIAS-03` nasce com muita coisa para sinalizar |
| `modo_atribuicao_padrao = 'simultaneo'` | **0 de 175** | ⚠️ ver o achado **A-1** |
| código de disciplina duplicado **no mesmo curso** | **1** — `C-Esp-ALH` / `ALH-II`, 2 linhas, **nenhuma** com previsão | ⚠️ ver o achado **A-2** |
| `unique (curso_id, cod_disciplina)` no schema | **não existe** — há `unique(codigo)` e `unique(id, curso_id)` | ⚠️ ver o achado **A-2** |
| `unidades_ensino` | **0** | a grade fina (572 UEs) segue **não carregada**, herdada do Épico 2 |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Achar a disciplina descendo curso → turma → disciplina (Priority: P1)

Quem administra abre um curso, escolhe a turma e vê as disciplinas **daquela turma** — com o período
e o instrutor que valem ali, e não os da grade do curso. Uma linha se expande e mostra o detalhe sem
trocar de tela.

**Why this priority**: é o caminho de entrada de todo o resto. Sem a cascata, as três outras
histórias não têm de onde partir; com ela, já se enxerga o que hoje só existe em planilha.

**Independent Test**: abrir um curso com turma e conferir que a lista muda ao trocar de turma, e que
a linha expandida mostra o período e o instrutor daquela turma.

**Acceptance Scenarios**:

1. **Given** um curso com duas turmas no mesmo ano, **When** a pessoa troca a turma no seletor,
   **Then** a lista de disciplinas passa a mostrar o período e o instrutor **daquela** turma, e o
   endereço da página registra a escolha.
2. **Given** uma disciplina sem instrutor em nenhuma turma, **When** a lista é desenhada, **Then**
   ela aparece **sinalizada**, e a sinalização distingue *"sem instrutor"* de *"início próximo"*.
3. **Given** um curso **sem turma nenhuma**, **When** a pessoa entra na cascata, **Then** a tela diz
   que não há turma — e **não** mostra indicadores zerados como se fossem medição.

---

### User Story 2 - Cadastrar e editar a disciplina do curso (Priority: P1)

Quem administra cadastra a disciplina na grade do curso: código, nome, carga horária, previsão e
situação. Código repetido **no mesmo curso** é recusado, e a tela diz qual disciplina já o ocupa.

**Why this priority**: é o CRUD que o `RF-MATERIAS-01` exige, e a recusa de duplicata é o critério de
aceite 3 do Épico 5.

**Independent Test**: cadastrar duas disciplinas com o mesmo código no mesmo curso e ver a segunda
ser recusada; cadastrar o mesmo código em **outro** curso e ver passar.

**Acceptance Scenarios**:

1. **Given** um curso que já tem a disciplina de código `X`, **When** alguém tenta cadastrar outra
   com o código `X` **no mesmo curso**, **Then** a gravação é recusada **pelo banco**, e a tela diz
   em português qual disciplina ocupa o código — **nunca** o texto cru da restrição.
2. **Given** dois cursos diferentes, **When** o mesmo código é usado em cada um, **Then** as duas
   gravações passam: a unicidade é por **curso**, não global.
3. **Given** uma disciplina com histórico lançado, **When** alguém a desativa, **Then** ela sai das
   listas de nova atribuição e **permanece** em todo o histórico já lançado.

---

### User Story 3 - Definir período e instrutor por turma (Priority: P1)

Na turma escolhida, quem administra define o período previsto da disciplina e escolhe o instrutor
entre os **habilitados** para ela — e o que se define numa turma não mexe em nenhuma outra.

**Why this priority**: é o coração da fatia e o critério de aceite 4. Hoje **0 de 210** linhas têm
período editado por turma: a função não existe na v2.1.

**Independent Test**: editar o período da disciplina na turma `T2` e conferir, na `T1` do mesmo
curso, que nada mudou.

**Acceptance Scenarios**:

1. **Given** a mesma disciplina em duas turmas do mesmo curso, **When** o período é editado na `T2`,
   **Then** o período da `T1` **continua exatamente como estava**.
2. **Given** uma disciplina com habilitados, **When** a pessoa abre a escolha de instrutor,
   **Then** só aparecem os **habilitados** para aquela disciplina, **ordenados por antiguidade**.
3. **Given** uma turma cujo instrutor já atribuído **perdeu** a habilitação ou foi desativado,
   **When** a pessoa abre a edição, **Then** ele **continua** na escolha e continua selecionado — a
   edição não o remove por efeito colateral.

---

### User Story 4 - Ratear a CH prevista entre instrutores (Priority: P2)

Quando a disciplina tem mais de um instrutor na turma, o sistema distribui a carga horária prevista
conforme o **modo de atribuição**: no modo **dividido**, a soma das partes fecha exatamente a CH da
disciplina; no **simultâneo**, cada um recebe a CH integral.

**Why this priority**: é o critério de aceite 5 e alimenta a CH **prevista** do instrutor
(`RF-INSTR-13`). Vem depois da P1 porque só muda algo em **6 das 210** linhas de hoje — mas é onde um
erro vira número errado em ficha de docente.

**Independent Test**: pôr dois e três instrutores numa disciplina em cada modo e conferir a soma.

**Acceptance Scenarios**:

1. **Given** uma disciplina de CH conhecida com 3 instrutores em modo **dividido**, **When** o rateio
   é calculado, **Then** a soma das partes é **exatamente** a CH da disciplina — sem sobra nem falta.
2. **Given** a mesma disciplina em modo **simultâneo**, **When** o rateio é calculado, **Then**
   **cada** instrutor recebe a CH **integral**, e a soma é maior que a CH da disciplina — de
   propósito.
3. **Given** uma CH que não divide igualmente pelo número de instrutores, **When** o rateio é
   calculado, **Then** a diferença é distribuída de forma declarada e estável, e a soma **continua**
   fechando (⚠️ **a regra de arredondamento é pergunta do clarify — ver Q-03**).
4. **Given** qualquer modo, **When** alguém tenta **digitar** a CH cumprida, **Then** não há campo:
   a CH cumprida vem só dos registros reais.

---

### User Story 5 - Ver o quadro da grade: indicadores, filtros e proporção (Priority: P3)

Quem administra filtra por instrutor e por situação, vê os indicadores agregados da grade e um
gráfico com a proporção — e o recorte fica no endereço da página, para ser compartilhado.

**Why this priority**: é leitura sobre o que as histórias anteriores gravam. Entrega valor sozinha,
mas não faz sentido antes de haver o que filtrar.

**Independent Test**: aplicar um filtro, conferir os indicadores, clicar em *Limpar filtros* e ver a
lista voltar completa com o endereço limpo.

**Acceptance Scenarios**:

1. **Given** uma grade com disciplinas em situações diferentes, **When** a pessoa filtra por
   instrutor, **Then** indicadores, lista e gráfico passam a falar **do mesmo recorte**.
2. **Given** um curso **sem turma**, **When** a visão de catálogo é aberta, **Then** os indicadores
   que dependem de turma **degradam com aviso** em vez de mostrar zero (`RN-DEG-01`).
3. **Given** um filtro aplicado, **When** a pessoa clica em *Limpar filtros*, **Then** o endereço
   fica sem os parâmetros de filtro e a lista volta completa.

---

### Edge Cases

- **Duplicata que já existe na base.** `C-Esp-ALH` / `ALH-II` tem **2** linhas hoje. Criar a
  unicidade sem resolver isso faz a migration **falhar na aplicação** — e resolver é decisão de
  dado, não de código (**Q-01**).
- **Disciplina sem previsão de início** (86 de 175): a sinalização de *"início em ≤ 30 dias"* não
  tem o que comparar. Ausência **não** pode virar "início distante" nem "atrasada".
- **Turma sem janela de datas.** O período da disciplina pode cair fora da janela da turma, ou a
  turma pode não ter janela — o sistema **avisa**, nunca bloqueia (`RN-DEG-02`).
- **Disciplina com instrutor que perdeu habilitação**: continua atribuída e continua aparecendo
  (`RF-MATERIAS-02`, segunda metade).
- **Turma com uma disciplina só e nenhum instrutor**: a sinalização do `RF-MATERIAS-03` precisa
  distinguir *"sem instrutor"* de *"início próximo"* — são destaques diferentes, e uma linha pode ter
  os dois.
- **Curso inativo**: a grade continua legível; escrita nova é recusada pelas policies do PR 1.

---

## Requirements *(mandatory)*

### Functional Requirements

#### A cascata e a leitura

- **FR-001**: O sistema MUST permitir chegar à disciplina descendo **curso → turma → disciplina**, e
  o degrau da turma MUST usar o **mesmo** seletor de turma do resto do sistema
  (`components/ciaara/seletor-turma.tsx`), sem cópia por tela.
- **FR-002**: A lista de disciplinas da turma MUST mostrar, **por turma**, o período previsto e o
  instrutor daquela turma — nunca os da grade do curso.
- **FR-003**: A linha da lista MUST poder ser **expandida** para mostrar o detalhe sem trocar de
  tela, e o que está expandido MUST NOT ir para o endereço da página (é estado efêmero).
- **FR-004**: O recorte — curso, turma, instrutor, situação — MUST viver no **endereço da página**,
  e a página MUST nascer com o botão **Limpar filtros** (padrão de tela de 23/09/2026).
- **FR-005**: O sistema MUST sinalizar visualmente a disciplina **sem instrutor** e a disciplina com
  **início em 30 dias ou menos**, com destaques **diferentes** conforme já tenha ou não instrutor
  (`RF-MATERIAS-03`). O limiar MUST ser **parâmetro em `config_parametros`**, nunca constante.
- **FR-006**: Disciplina **sem previsão de início** MUST NOT ser sinalizada como "início próximo" nem
  como "atrasada" — ausência é ausência.

#### O CRUD e a unicidade

- **FR-007**: O sistema MUST manter o cadastro de disciplina do curso com código, nome, carga
  horária, previsão de início e término e situação (`RF-MATERIAS-01`).
- **FR-008**: O banco MUST recusar **código de disciplina repetido dentro do mesmo curso**, por
  restrição declarativa e **genérica** — para qualquer curso, presente ou futuro (`RF-DADOS-06`,
  `RN-MAT-02`). A tela MUST traduzir a recusa para português e **nomear** a disciplina que ocupa o
  código; o texto cru da restrição MUST NOT chegar à tela.
- **FR-009**: O identificador da disciplina MUST ser **gerado pelo banco**, no padrão de prefixo +
  sequencial (`RN-CRUD-03`), e MUST NOT ser campo digitável.
- **FR-010**: Exclusão MUST ser **lógica** (`status`), e a disciplina desativada MUST sair das listas
  de **nova** atribuição e **permanecer** em todo o histórico já lançado.
- **FR-011**: Coluna calculada MUST NOT ser gravável por caminho nenhum (`RN-CRUD-02`) — a proteção é
  do motor, não uma lista de colunas mantida à mão.

#### O período e o instrutor por turma

- **FR-012**: O período previsto e o instrutor MUST ser gravados **por turma**, e a escrita numa
  turma MUST NOT alterar nenhuma outra turma do mesmo curso.
- **FR-013**: A escolha de instrutor MUST oferecer **apenas os habilitados** para aquela disciplina,
  e MUST **preservar** o instrutor já atribuído mesmo que ele tenha perdido a habilitação ou sido
  desativado (`RF-MATERIAS-02`).
- **FR-014**: Toda lista, todo seletor e todo filtro de instrutor MUST ser ordenado por
  **antiguidade**, derivada do posto/graduação, com `antiguidade_declarada` apenas como **desempate**
  (`RN-ANT-01`, `RN-ANT-02`) — **em todas as ocorrências**, verificado por teste, não por amostragem.
- **FR-015**: O nome do instrutor MUST aparecer no formato padronizado, pelo componente único já
  existente.

#### O rateio da CH prevista

- **FR-016**: O sistema MUST distinguir **modo dividido** (padrão) e **modo simultâneo**
  (`RF-MATERIAS-06`, `RN-MAT-05`), e o modo MUST ser **dado marcado no cadastro** — MUST NOT ser
  inferido do nome da disciplina.
- **FR-017**: No modo **dividido**, a soma das CH previstas dos instrutores da disciplina na turma
  MUST ser **exatamente** a CH prevista da disciplina — sem sobra nem falta.
- **FR-018**: No modo **simultâneo**, **cada** instrutor MUST receber a CH **integral** da
  disciplina.
- **FR-019**: A CH **prevista** MUST ser rateada; a CH **cumprida** MUST NOT — ela vem
  exclusivamente dos registros reais (`RF-MATERIAS-06`, última frase).
- **FR-020**: MUST NOT existir campo digitável de carga horária de instrutor em formulário nenhum
  desta fatia.

#### Os indicadores e o gráfico

- **FR-021**: O sistema MUST apresentar indicadores agregados da grade — total, concluídas,
  atrasadas e sem instrutor — e permitir filtrar por curso e por classificação do curso
  (`RF-MATERIAS-04`).
- **FR-022**: Em curso **sem turma**, o indicador que depende de turma MUST **degradar com aviso**
  (`RN-DEG-01`) — mostrar zero ali seria regressão medida da v2.0 (achado da spec 037).
- **FR-023**: O gráfico MUST mostrar a **proporção** e MUST obedecer ao mesmo recorte dos
  indicadores e da lista.

#### Confirmação e alcance

- **FR-024**: Gravação que alcance o que já foi lançado MUST **confirmar antes de salvar**, pela
  lista fechada de `lib/dominio/confirmacao-de-gravacao.ts` — acrescentar uma escrita à lista sem
  decidir se ela confirma MUST NOT compilar.
- **FR-025**: Quem pode ler e escrever MUST ser decidido pelo banco (matriz `perfil_permissao` +
  RLS); a tela **esconde** o que a pessoa não pode fazer, e esconder MUST NOT ser a proteção.

### Key Entities

- **Disciplina**: a matéria na **grade do curso** — código (único no curso), nome, carga horária,
  previsão, situação e o **modo de atribuição padrão**. Pertence a **um** curso.
- **Disciplina da turma** (`turma_disciplina`): a **instância** da disciplina numa turma — período
  previsto, origem do período, instrutor escolhido e CH prevista rateada. É a fonte de verdade do que
  vale **naquela** turma.
- **Atribuição** (`turma_disciplina_instrutor`): a junção quando há **mais de um** instrutor, com a
  CH prevista de cada um.
- **Habilitação** (`instrutor_disciplina`): quem **pode** ser oferecido para a disciplina. Não é
  atribuição: habilitar não aloca.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem administra chega de um curso à disciplina de uma turma em **no máximo três
  escolhas**, sem digitar endereço.
- **SC-002**: Cadastrar disciplina com código já usado **no mesmo curso** é recusado em **100%** das
  tentativas, por qualquer caminho de escrita — e a mensagem **nomeia** a disciplina que ocupa o
  código.
- **SC-003**: O mesmo código em cursos diferentes é aceito em **100%** das tentativas.
- **SC-004**: Editar o período na turma `T2` altera **exatamente 0** linhas de qualquer outra turma.
- **SC-005**: No modo dividido, a soma das CH rateadas fecha com a CH da disciplina em **100%** dos
  casos, para 2, 3 e 4 instrutores, inclusive quando a divisão não é exata.
- **SC-006**: No modo simultâneo, **cada** instrutor recebe **100%** da CH da disciplina.
- **SC-007**: **Zero** campos digitáveis de carga horária de instrutor nas telas desta fatia.
- **SC-008**: **100%** das listas, seletores e filtros de instrutor desta fatia saem ordenados por
  antiguidade — contados por teste sobre **todas** as ocorrências, e não por amostragem.
- **SC-009**: A disciplina sem instrutor e a de início próximo são distinguíveis à vista, e uma linha
  que tenha os dois estados mostra **os dois**.
- **SC-010**: Em curso sem turma, **nenhum** indicador que dependa de turma mostra zero: todos
  mostram o aviso de degradação.
- **SC-011**: Aplicar um filtro e clicar em *Limpar filtros* devolve a lista completa e deixa o
  endereço **sem** os parâmetros de filtro.
- **SC-012**: **Zero** violações das varreduras que já existem: marcador de cliente em página,
  `await` em laço, cor fora do ponto único, e campo de carga horária digitável.

---

## Assumptions

- **A grade fina (Unidade de Ensino) fica fora.** `unidades_ensino` mede **0** linhas, e a carga das
  572 UEs é pendência herdada do Épico 2. Esta fatia trabalha no grão da **disciplina**.
- **O regime de horário só é LIDO aqui.** O registro de vigência ficou inteiro na fatia (a), por
  decisão de Bernardo de 16/09/2026 (T-1 da spec 009) — ver a divergência **D-1** abaixo.
- **O que a fatia (a) entrega é reusado, não reescrito**: seletor de turma, endereço de turma,
  confirmação de gravação e botão de limpar filtros.
- **A autorização já existe.** As permissões de `disciplinas` e `horarios` vieram na matriz do PR 1;
  esta fatia consome, não redefine.
- **A ordenação por antiguidade já tem domínio pronto** (`lib/dominio/antiguidade.ts`, Épico 5 (c)) —
  o que falta é **aplicá-la em todas as ocorrências novas** e contá-las.

---

## Achados — medidos, não corrigidos aqui

⚠️ **A-1. O modo `simultaneo` não existe em nenhuma das 175 disciplinas, e o motivo é o NOME.**
A `RN-MAT-05` diz que o ETL marcaria `simultaneo` nas três práticas de fim de curso. Medido em
24/09/2026: **0 de 175**. A causa está no dado — **6 disciplinas perderam a palavra "FIM"** na
origem, e o nome chegou como `LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO` (dois espaços). Marcar por
nome não casa, e **a própria regra proíbe inferir por nome**. Consequência para esta fatia: o modo
tem de ser **marcável no cadastro**, e **quais disciplinas marcar é decisão de quem conhece o
currículo** — está em **Q-02**.

⚠️ **A-2. A unicidade `(curso_id, cod_disciplina)` que o `RF-DADOS-06` exige NÃO EXISTE no schema, e
a base tem 1 duplicata.** Medido: há `unique(codigo)` e `unique(id, curso_id)`, e **não** a
composta; e `C-Esp-ALH` / `ALH-II` tem **2** linhas, **nenhuma** com previsão preenchida — o caso
que a auditoria de 31/07/2026 encontrou. Criar a restrição **falha** enquanto a duplicata existir.
O saneamento é decisão de dado — **Q-01**.

⚠️ **A-3. O contorno da `RN-MAT-02` para o `C-Ap-FR` parece ter deixado de ser necessário.** A regra
descreve pares duplicados naquele curso e manda descartar a duplicata incompleta em toda leitura de
cálculo. Medido hoje: **zero** duplicatas em `C-Ap-FR` — a única é a do `C-Esp-ALH`. A própria regra
se declara **transitória**, *"válida apenas até a migração ser concluída"*. **Não foi corrigida nem
descartada aqui**: confirmar que ela pode ser aposentada é **Q-04**.

⚠️ **A-4. A CH rateada por instrutor está vazia em 210 de 210 linhas.** A coluna existe desde o PR 1
e nunca foi preenchida. Não é defeito: é a função que esta fatia vem criar. Fica registrado para que
ninguém leia o zero como perda de dado.

---

## Divergências reportadas, não corrigidas

**D-1. O documento 42 põe o critério de aceite 7 nesta fatia; a spec 009 o resolveu na fatia (a).**
O critério 7 do Épico 5 é *"registrar mudança de regime com data de vigência futura preserva o
cálculo dos lançamentos anteriores"*. O parágrafo *"Para a fatia (b)"* do documento 42 o lista aqui,
mas a decisão T-1 de Bernardo (16/09/2026) levou **todo** o registro de regime para a fatia (a), onde
foi implementado e testado. **Esta fatia apenas lê o regime vigente.** Registrado conforme a regra 1
do `CLAUDE.md` — reportar, não corrigir; o documento 42 **não foi alterado**.

**D-2. O `RF-MATERIAS-05` fala em "instrutores designados da disciplina"; a fonte de verdade é por
turma.** O próprio requisito já anota que *"a seleção efetiva é por turma (`turma_disciplina.instrutor_id`),
não por grade de curso"*. A coluna `disciplinas.instrutores_atribuidos` continua existindo como
resquício. **Não foi tocada**; o que esta spec fixa é que a escrita é por turma.

---

## Perguntas para o `/speckit.clarify` — nenhuma respondida aqui

*(⚠️ Por decisão de Bernardo em 24/09/2026, o `specify` para aqui: estas perguntas ficam **listadas
e abertas**. Nenhuma foi decidida por suposição, e nenhuma deve ser.)*

| # | Pergunta | Por que bloqueia | O que depende dela |
|---|---|---|---|
| **Q-01** | O que fazer com a duplicata `C-Esp-ALH` / `ALH-II` — 2 linhas, nenhuma com previsão — para que a unicidade `(curso_id, cod_disciplina)` possa ser criada? Renomear uma? Desativar a incompleta? Corrigir na origem antes da próxima carga? | A restrição **não aplica** enquanto houver duplicata; e apagar linha contraria a regra 4 | `FR-008`, `SC-002`, a migration da fatia |
| **Q-02** | Quais disciplinas devem ficar em **modo simultâneo**? A regra nomeia três práticas de fim de curso, mas o nome na base perdeu a palavra "FIM" em **6** disciplinas, e a regra proíbe inferir por nome | Sem a lista, o rateio sai errado onde mais importa — na ficha de docente | `FR-016`, `FR-018`, `SC-006` |
| **Q-03** | No modo dividido com CH que **não divide igualmente** (ex.: 10 tempos entre 3 instrutores), como distribuir o resto — o primeiro da ordem de antiguidade recebe a sobra? distribui-se um a um? arredonda-se para meio tempo? | A soma **tem** de fechar (`SC-005`), e há mais de uma forma de fechar | `FR-017`, `SC-005` |
| **Q-04** | O contorno de leitura da `RN-MAT-02` para o `C-Ap-FR` pode ser **aposentado**, já que a migração foi concluída e a medição de hoje mostra zero duplicatas naquele curso? | A regra se declara transitória, mas aposentá-la é alterar regra do documento 04 — exige autorização nominal | toda leitura de cálculo que hoje a cita |
| **Q-05** | O período da disciplina na turma pode ficar **fora da janela da turma**? É aviso ou recusa? | O `RN-DEG-02` sugere aviso, mas o caso não está escrito em requisito nenhum | `FR-012`, casos de borda |
| **Q-06** | *"Concluídas"* e *"atrasadas"* do `RF-MATERIAS-04` são derivadas de quê — da previsão de término contra hoje, do que foi lançado, ou da situação gravada? | Três leituras plausíveis, e os indicadores mudam de valor conforme a escolha | `FR-021`, `SC-010` |
| **Q-07** | Quem pode editar período e instrutor por turma: o mesmo conjunto de perfis que edita a grade do curso, ou um recorte diferente? | A matriz do PR 1 tem `disciplinas` e `horarios` como recursos distintos, e a fatia (a) já mostrou que os dois não andam juntos | `FR-025` |
| **Q-08** | A tabela expansível deve permitir **edição em linha** (como a spec 038 da v2.0 fazia para datas) ou a edição abre formulário? | Muda a tela inteira, e a spec 038 era um *hotfix* de edição inline — paridade pode exigi-la | `FR-003`, `FR-012` |

---

## Fora de escopo — declarado, não esquecido

- **Ficha em PDF e documentos oficiais** — Épico 11.
- **Lançamento de aula (DSA)** — Épico 6.
- **Cronograma** — Épico 7.
- **Papel titular/reserva na atribuição** — `LIQ-3`, enquanto a decisão de Bernardo não vier.
- **Registro de mudança de regime de horário** — ficou na fatia (a) (ver **D-1**). Aqui só se **lê** o
  regime vigente.
- **Carga das 572 Unidades de Ensino** — pendência herdada do Épico 2; esta fatia não a resolve nem
  depende dela.
