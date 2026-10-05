# Feature Specification: Detalhe Semanal de Aula (DSA) — lançamento, grade e impressão

**Feature Branch**: `feat/EPICO-6-detalhe-semanal-de-aula`

**Created**: 05/10/2026

**Status**: Draft — **aguardando o `/speckit-clarify`** (**18** perguntas em lote, §9: as 16 do pedido e duas que a medição levantou)

**Input**: Épico 6 da v2.1, pedido de Bernardo Villas Boas em 05/10/2026. Uma spec para o épico
inteiro, entregue em **oito PRs** (§9) — um deles, o **PR B**, é o único de banco.

> **Leia antes desta página:**
> `estado-atual.md` — o que existe, medido no banco local (estrutura) e no remoto (dado), com
> arquivo e linha; e `praticas-da-planilha.md` — o que a operação faz hoje, que é a única descrição
> que o repositório terá disso depois do corte.
>
> ⚠️ **TRÊS COISAS QUE A MEDIÇÃO CONTRARIOU, e que mudam o escopo antes de a primeira linha ser
> escrita:**
> 1. **As 188 avaliações do remoto têm `ta_inicial = 1`, todas elas** — posição **falsa**, não
>    ausente. O briefing (`E-1`) as dava como sem posição. Elas **não** caem na faixa "Sem posição":
>    caem empilhadas no 1º TA, com cara de dado certo.
> 2. **`avaliacoes` já tem `nome_fiscal_externo` e posição própria para a vista** — a `RF-AVAL-06`
>    está atendida **estruturalmente**, sem migration.
> 3. **`turma_disciplina_unidade` tem 0 linhas** — o instrutor **por UE** não existe como dado, e o
>    pré-preenchimento da `H2` cai no degrau seguinte (`turma_disciplina_instrutor`, 99 linhas).

---

## 1. O problema, em uma frase

O DSA é o produto diário da CIAARA-11 e hoje sai de **uma planilha por turma** com **11.918 erros de
fórmula** medidos num curso e **erro visível no documento assinado** em 10 de 15 planilhas. Esta
fatia o substitui por uma grade e um documento que **não têm fórmula para quebrar**, com o **mesmo
esforço de lançamento ou menos** — duas escolhas por bloco, hoje; no máximo quatro, aqui.

---

## Clarifications

### Session 2026-10-05

*(decisões de **Bernardo Villas Boas**, 05/10/2026, em lote. Elas **prevalecem** sobre as
recomendações que esta spec trazia em §9, e onde divergem está dito qual era a minha.)*

- Q: Como lançar aula em curso por competências e nas 6 disciplinas sem UE? → **A: lançamento por disciplina, SEM UE, nesses casos, com tópico obrigatório** — a opção **(a)**. ⚠️ *Minha recomendação era a (b) (cadastrar UE operacionais); a decisão é a (a) e **ela custa um PR de banco**, medido em §2.1 abaixo.*
- Q: Número do DSA e ALT entram no núcleo? → **A: não — ficam no PR 6**, fora do núcleo.
- Q: Sábado entra? → **A: sim, no núcleo, adicionado por AÇÃO DO OPERADOR, com 5 TA.**
- Q: DSA de Reposição entra? → **A: não — fica no PR 6**, junto com ALT.
- Q: Corrigir o relógio (G45/G50) nesta feature? → **A: sim, como DADO — nova vigência —, ANTES do PR de impressão.**
- Q: Estudo Individual diário, um a um? → **A: não — "lançar o Estudo Individual padrão da semana" em UM clique.**
- Q: Responsável de atividade não letiva? → **A: sim, campo de TEXTO LIVRE** (além do instrutor opcional).
- Q: Mais de um instrutor na mesma aula? → **A: fica para depois** (pendência nomeada).
- Q: Técnica de ensino com sigla? → **A: sim, a sigla vive em `config_listas`.**
- Q: Local na tela e no papel? → **A: sala no CABEÇALHO da tela; coluna LOCAL POR LINHA na impressão.**
- Q: Histórico sem TA, e a posição falsa das avaliações? → **A: a grade DEGRADA para "Sem posição", e as avaliações migradas com `ta_inicial = 1` são tratadas como SEM POSIÇÃO.**
- Q: O DSA se aplica a EAD puro? → **A: não se aplica.**
- Q: Encarregado e Ajudante lançam no DSA? → **A: sim, lançam** — confirma o que a matriz já permite.
- Q: Feriado e licenças vêm do calendário? → **A: sim, os dois vêm do calendário** (`feriados`), sem lançamento TA a TA.
- Q: Como ver conflito em turma que o perfil não alcança? → **A: função `SECURITY DEFINER` que devolve o conflito SEM o dado alheio** — a opção **(a)**.
- Q: O DSA ganha entrada no menu? → **A: não — sem entrada nova no menu.**
- Q: Lançamento com data futura conta como executado nos indicadores? → **A: CONTA tudo o que está lançado — leitura literal da `RN-CRONOS-01` — E A TELA DISTINGUE** o executado do lançado-à-frente. A opção **(c)**, a recomendada.
- Q: Quem assina à esquerda do DSA? → **A: DINÂMICO como padrão, com linha FIXA POR CURSO prevalecendo quando existir** — a resolução busca o curso e cai no GERAL. ⚠️ *A spec recomendava "só o dinâmico"; a recomendação mudou depois de medir que `responsaveis_curso.curso_id` é **nulável**, logo o fallback já está no schema e sai de graça.*

### As divergências V-1 a V-8 são BACKLOG, com duas exceções

*(decisão de Bernardo, 05/10/2026)* **Nenhum documento é corrigido agora.** As oito ficam como
pendência nomeada em `estado-atual.md` §8 — **exceto o que a `V-5` e a `V-7` exigirem para o
COMPORTAMENTO**, que entra no PR de banco:

- **`V-5`** → nasce o `CHECK` que a `RF-EXTRA-02` afirma e que **não existe**: *Estudo Individual é
  sempre de escopo de Turma*. É comportamento, não texto.
- **`V-7`** → `vw_ocupacao_ta` passa a **incluir atividade de escopo `global`**, para que a
  `RF-EXTRA-03` valha como escrita (*"todo lançamento AEC/TAD/TR/EI deve refletir automaticamente no
  DSA da(s) turma(s) afetada(s)"*). Hoje o ramo filtra `turma_id IS NOT NULL` e a global não chega a
  DSA nenhum. **Medido: 0 atividades globais no remoto** — então a correção não muda número algum
  hoje, e é por isso que ela é barata **agora** e caríssima depois da primeira.

As demais — `V-1` (onde mora a regra de conflito), `V-2` (nome das views), `V-3` (`lib/estado/` que
não existe), `V-4` (código de turma nos exemplos), `V-6` (a FK de `subtipo`) e `V-8` (*"Operador"* ×
*"Auxiliar"* × `elaborador`) — **ficam como estão**, e a spec segue a leitura declarada em §5.

---

## 2. O que as respostas mudaram nesta spec

### 2.1 ⚠️ A Q-1 custa um PR DE BANCO, e ele entra ANTES de ver a semana

A decisão *"lançar por disciplina, sem UE"* parece de tela e **não é**. Medido em 05/10/2026, nesta
ordem:

| # | O obstáculo medido | Por que ele impede a decisão |
|---|---|---|
| 1 | **`registros_aula` NÃO TEM `disciplina_id`** — a varredura de `information_schema.columns` devolve **uma** coluna com "disciplina" no nome, e ela é `disciplina_codigo_legado_v1` (`text`, legado) | hoje a disciplina de uma aula é alcançada **só** por `unidade_ensino_id → unidades_ensino.disciplina_id`. **Sem UE, não há onde dizer de que disciplina a aula é** |
| 2 | `CHECK reg_aula_ue_so_nula_no_historico` | exige UE em dado novo. A isenção vale só para linha **com procedência e nunca editada** |
| 3 | **`vw_ocupacao_ta` faz `JOIN unidades_ensino` — junção INTERNA** | o lançamento sem UE **desapareceria da grade** |
| 4 | **`vw_disciplinas_execucao` faz o mesmo `JOIN`** (linhas 7-8 da definição) | a **CH executada por disciplina** de `C-Espc-HN` e `C-Espc-FR` ficaria **em zero para sempre** — e são dois dos cinco cursos que mais lançam |
| 5 | as duas views são `security_invoker=true` | recriá-las **sem repetir o `with (…)`** desliga a RLS em silêncio — **gotcha 10**, que esta base já pagou em 25/09/2026 |

⚠️ **E uma boa notícia medida, que delimita o estrago:** **`vw_carga_horaria_turma` NÃO passa pela
UE** — ela lê `FROM registros_aula` direto. Logo o **andamento da turma** e o painel do `/inicio`,
entregues pelo Épico 5.5, **continuam corretos** sem tocar nela. E
**`vw_unidades_ensino_execucao`** parte **da UE** com `LEFT JOIN registros_aula`, então um lançamento
sem UE simplesmente não é execução de UE nenhuma — **o que está certo**, e ela também não muda.

**O PR de banco, portanto, é este — e é o PR B, entre o PR 0 e o PR 1:**

1. `registros_aula.disciplina_id uuid` **nulável**, com **FK composta** `(disciplina_id, curso_id) → disciplinas(id, curso_id)`, espelhando a `reg_aula_ue_do_curso` que já existe para a UE;
2. `CHECK` novo: **ou** a UE está presente, **ou** a disciplina está presente **e** o `conteudo_resumo` não está vazio — é o *"tópico obrigatório"* da decisão, virado restrição em vez de promessa de tela;
3. **emenda** ao `reg_aula_ue_so_nula_no_historico`, delimitada: UE pode faltar **em dado novo** quando o curso é `curriculo_modelo = 'competencias'` **ou** a disciplina é `sem_unidades_ensino` — ⚠️ **a catraca não é afrouxada em geral, e isso é o ponto**: ela passa a ter uma segunda isenção **nominal**, do mesmo jeito que a `R-05` ganhou a dela em 24/09/2026;
4. `vw_ocupacao_ta` — junção com UE vira **`LEFT`**, a disciplina sai de `coalesce(ue.disciplina_id, r.disciplina_id)`, o ramo de atividade perde o filtro `turma_id IS NOT NULL` (**`V-7`**), e o `with (security_invoker = true)` é **repetido**;
5. `vw_disciplinas_execucao` — o mesmo tratamento, com o `security_invoker` repetido;
6. o `CHECK` do Estudo Individual sempre de turma (**`V-5`**);
7. `atividades_nao_letivas.responsavel_externo text` (**Q-8**), com `CHECK` de exclusividade contra o instrutor, no desenho que `avaliacoes` já usa para `fiscal_id` × `nome_fiscal_externo`;
8. a função **`SECURITY DEFINER`** do conflito entre turmas (**Q-17**), com porteiro, devolvendo dia, TA e instrutor e **nada** da outra turma.

⚠️ **A ORDEM MUDOU POR CAUSA DO ITEM 4:** o PR 1 (*ver a semana*) **lê `vw_ocupacao_ta`**. Construí-lo
antes do PR B o faria nascer cego para o lançamento sem UE e para a atividade global — e consertar
depois é reescrever a consulta da grade. **O PR B vem antes do PR 1.**

⚠️ **E ele exige o rito completo do remoto**, porque preview e Production são o mesmo projeto:
backup com `--somente-copia`, *dry-run* listando só estas migrations, aplicação depois do CI verde, e
conferência só por leitura — com **prova de reversão**, que é onde o `security_invoker` dos itens 4 e
5 se pega (foi exatamente assim que o gotcha 10 apareceu).

### 2.2 O que as outras respostas mudaram, em uma linha cada

| Resposta | Efeito na spec |
|---|---|
| **Q-2 conta, e a tela distingue** | nasce o `FR-028.1`: **nenhum corte por data** no cálculo — então `chd_executada`, o andamento da turma e as 6 turmas do `/inicio` **não mudam de valor** —, e o lançado-à-frente ganha marca visual na grade, no quadro de CH e no rodapé |
| **Q-3 e Q-5 no PR 6** | a `H8` sai do núcleo e o rodapé impresso **não** traz `ALT <n>` até o PR 6. ⚠️ **O número do DSA, porém, está no CABEÇALHO do documento oficial** — ver a pergunta de borda em §2.3 |
| **Q-4 sábado por ação do operador, 5 TA** | a grade tem **seis** colunas possíveis; o sábado nasce fechado. ⚠️ **Os 5 TA vão para `config_parametros`**, não para o código — Princípio VII, parâmetro normativo é dado |
| **Q-6 relógio como dado, antes do PR 3** | confirma a ordem já escrita em §8 e **amarra**: a vigência nova por curso corrige os **quatro** eixos medidos (início, TA de manhã, intervalo, retomada) |
| **Q-7 Estudo Individual num clique** | um clique gera **um lançamento por dia útil da semana**, respeitando feriado de dia inteiro; a nota do rodapé é **fixa** |
| **Q-9 multi-instrutor depois** | a coluna do papel sai com **um** nome; os 34 itens do `C-Espc-FR` ficam como pendência nomeada |
| **Q-10 sigla em `config_listas`** | **sem migration de schema** — a sigla cabe em `metadados jsonb`, que já existe. A FK de `metodologia` continua sendo a `V-6`, backlog |
| **Q-11 sala no cabeçalho, LOCAL por linha** | `FR-006` (tela) e `FR-034` (papel) ficam como escritos — não se contradizem, são superfícies diferentes |
| **Q-12 degradar, e `ta_inicial = 1` como sem posição** | nasce uma regra **delimitada**, em §2.3 |
| **Q-13 não se aplica a EAD puro** | a rota responde com a frase que diz por quê, em vez de grade vazia |
| **Q-14 dinâmico, com o curso prevalecendo** | nasce o `FR-036.1`: a resolução procura a linha **do curso** e cai no **GERAL**. ⚠️ **Zero cadastro hoje** (as 2 linhas GERAL servem todos os cursos) e zero código amanhã, quando a divisão cadastrar o Auxiliar do CAHO. ⚠️ **E isto fecha o crítério 3**: é a segunda vigência que o teste precisa semear, e agora ela tem onde morar |
| **Q-15 Encarregado e Ajudante lançam** | **zero** trabalho: confirma `permitido = true` nas 12 linhas medidas. As asserções negativas do `SC-016` cobrem os **cinco** perfis de leitura, não estes dois |
| **Q-16 feriado e licenças do calendário** | ⚠️ **consequência declarada:** `feriados` **não tem coluna de tipo** — a distinção entre feriado e licença fica na `descricao`, e quem decide o desconto de capacidade é o `impacto`. **É dado, não schema** |
| **Q-17 função com porteiro** | entra no PR B (item 8) |
| **Q-18 sem entrada no menu** | `FR-011` fica como está: ficha da turma, lista `/turmas` e `/inicio` |

### 2.3 Duas regras que as respostas obrigam a escrever com precisão

**A regra da posição herdada (`Q-12`), delimitada:** uma avaliação é tratada como **sem posição**
quando tem **procedência de ETL**, **nunca foi editada** e `ta_inicial = 1`. ⚠️ **As três condições
juntas, e não só a terceira** — senão uma avaliação **nova**, legitimamente posicionada no 1º TA,
desapareceria da grade. A regra é segura **porque foi medida**: as **188** linhas do remoto têm
procedência, `editado_em` nulo e `ta_inicial = 1` **todas elas**, então não há caso legítimo a
perder hoje; e ela deixa de alcançar qualquer linha no instante em que alguém a edita.

**O número do DSA sem a emissão (`Q-3` fora do núcleo):** o cabeçalho do documento oficial traz
`DETALHE SEMANAL DE AULAS Nº <n>`. Sem a tabela de emissão, esse número **é derivado** da ordem das
semanas da turma — e, pela convenção da aba CRONOS, **semana sem aula não consome número**. Isso
basta para o papel sair completo no PR 3; o que falta até o PR 6 é o `ALT <n>`, que **não aparece**
em vez de aparecer errado.

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 — Ver a semana (Priority: **P1**)

Quem tem permissão de leitura abre `/turmas/<código>/dsa` e vê a semana da turma numa grade
**dia × Tempo de Aula**, com o horário de início e fim de cada TA, os intervalos e a janela de
almoço visíveis, no **regime vigente na data daquela semana**. Navega para a semana anterior, a
próxima e a corrente, e o **botão voltar do navegador** retorna à semana anterior.

**Why this priority**: sem ela não há nada para lançar nem para imprimir, e ela já entrega valor
sozinha — hoje ninguém consegue ver a semana de uma turma sem abrir a planilha dela.

**Acceptance Scenarios**

1. **Dado** um curso com regime vigente e catálogo de horários, **quando** abro a semana, **então** cada TA mostra `HH:MM–HH:MM`, o intervalo aparece entre os TA e a janela de almoço separa manhã de tarde. *(`RF-HOR-06`, `RF-DSA-03`)*
2. **Dado** que o regime do curso mudou em 1º de junho, **quando** abro a semana de maio, **então** a grade usa o regime de **maio**. *(`RN-2027-09`, critério **4**)*
3. **Dado** um feriado de impacto `dia_inteiro` na quarta, **quando** abro a semana, **então** a quarta aparece **bloqueada** com a descrição do feriado; **dado** impacto `parcial` ou `informativo`, **então** aparece **aviso** e o dia **não** bloqueia. *(`RN-EVT-02`, `RF-EVT-02`, critério **6**)*
4. **Dado** um lançamento sem `ta_inicial`, **quando** abro a semana, **então** ele aparece na faixa **"Sem posição"** do seu dia, com o motivo escrito. *(`RN-DEG-01`)*
5. **Dado** um curso **sem** regime vigente, **quando** abro a semana, **então** vejo a grade **sem relógio** e um aviso que diz onde se cadastra o regime — **nunca** uma tela de erro. *(`RN-DEG-01`)*
6. **Dado** que cheguei pelo clique na ficha da turma, **quando** aperto voltar, **então** retorno à ficha; **quando** aperto voltar depois de navegar duas semanas, **então** retorno à semana anterior. *(`RF-DSA-02`, `RF-NAV-04`)*

---

### User Story 2 — Lançar aula em bloco, com o esforço da planilha ou menos (Priority: **P1**)

O operador escolhe **onde** (dia + TA inicial) na grade, a **disciplina** da turma, a **Unidade de
Ensino** e **quantos TA**. Instrutor, técnica de ensino e local **chegam preenchidos**; o conteúdo
nasce do tópico da UE. Qualquer um deles pode ser trocado **naquele lançamento**, sem alterar
cadastro nenhum.

**Why this priority**: é a tela mais usada do sistema. Se lançar custar mais do que na planilha, a
substituição não acontece — por isso o esforço é **critério de aceite** (`SC-009`), não desejo.

**Acceptance Scenarios**

1. **Dado** que escolhi dia, TA inicial, disciplina, UE e 2 TA, **quando** abro o formulário, **então** instrutor, técnica e local já estão preenchidos e o conteúdo traz o tópico da UE. *(`SC-009`)*
2. **Dado** que a lista de UE está aberta, **então** cada UE mostra **CH prevista, já lançada e restante**. *(`P-3` da planilha; `vw_unidades_ensino_execucao`)*
3. **Dado** um bloco de 4 TA começando no 3º tempo da **G45**, **quando** gravo, **então** a tela e o papel mostram **"09:30 às 11:55"** e **"13:05 às 13:50"** — **nunca** "09:30 às 13:50". *(`SC-011`, corrige `D-3`)*
4. **Dado** um instrutor **não habilitado** na disciplina, **quando** tento gravar, **então** a gravação é **recusada** com mensagem que nomeia a habilitação que falta. *(`RN-INST-01`)*
5. **Dado** um instrutor **inativo**, **então** ele **não aparece** no seletor; e o seletor vem **em antiguidade**. *(`RN-INST-02`, `RN-ANT-01`)*
6. **Dado** que troquei o instrutor **deste** lançamento, **quando** gravo, **então** nenhum outro lançamento muda e o cadastro da UE **não** muda. *(`SC-012`, corrige `D-4`)*
7. **Dado** uma disciplina **de outro curso**, **então** ela **não** aparece na lista, e a tentativa por via direta é recusada pelo banco. *(`RN-MAT-01`, FK composta `reg_aula_ue_do_curso`)*
8. **Dado** que a disciplina **não tem instrutor atribuído** nesta turma, **então** o campo abre vazio com a frase que diz onde se atribui — e a gravação é recusada, porque instrutor é obrigatório para categoria `aula`. *(`CHECK reg_aula_instrutor_obrigatorio`)*

---

### User Story 3 — Lançar na mesma grade o que não é aula (Priority: **P1**)

Na mesma grade entram **Avaliação** e **Vista de Prova** (um único fato, com tipo, disciplina,
instrutor responsável e **fiscal que pode ser pessoa fora do cadastro**) e as atividades **AEC**,
**TAD**, **TR** e **Estudo Individual**, com **categoria normativa fechada** e subtipo de lista
administrável.

**Why this priority**: as avaliações **contam CHD** (`RN-EVT-03`) e o Estudo Individual é **linha
fixa do documento impresso**. Sem elas o DSA não fecha nem na carga nem no papel.

**Acceptance Scenarios**

1. **Dado** que agendo uma avaliação com TA, **então** o consumo de tempos existe no **mesmo fato**, sem segundo lançamento, e a CHD da disciplina cresce. *(`RN-AVAL-02`, `RN-EVT-03`, `RF-AVAL-04/05`)*
2. **Dado** um fiscal **que não está no cadastro de instrutores**, **quando** gravo o nome dele, **então** a gravação é aceita e a habilitação **não** é cobrada. *(`RF-AVAL-06`, coluna `nome_fiscal_externo`)*
3. **Dado** uma avaliação já agendada **sem TA**, **quando** abro a semana da data dela, **então** ela aparece **listada com a ação de posicioná-la**. *(paridade com o "aplicar no DSA" da v2.0)*
4. **Dado** que escolho a categoria, **então** as opções são **exatamente** AEC, TAD, TR e Estudo Individual, e o **subtipo** vem de lista administrável — **nunca** sigla digitada. *(`RN-EVT-01`, `RF-EXTRA-01`, e a proibição das siglas de duas letras)*
5. **Dado** uma vista de prova, **então** ela tem **data e TA próprios**, posteriores à aplicação. *(`CHECK aval_vista_apos_aplicacao`)*

---

### User Story 4 — Imprimir (Priority: **P1**)

`/print/dsa?turma=&semana=&ano=` entrega **uma página A4 paisagem** para uma semana cheia, sem a
casca da aplicação, com todo o conteúdo do documento oficial e as **assinaturas resolvidas pela
vigência na data da semana**.

**Why this priority**: o DSA assinado **é** a entrega da divisão. A `RNF-COMP-01` chama a paridade
de impressão de inegociável, e o `RF-PDF-01` diz que **caber em uma página é asserção, não
recomendação**.

**Acceptance Scenarios**

1. **Dado** uma semana cheia de uma turma com 9 TA por dia, **quando** imprimo, **então** o resultado ocupa **uma** página A4 paisagem. *(critério **1**, `SC-001`)*
2. **Dado** o rodapé, **então** as duas assinaturas saem **preenchidas** com nome completo, posto e função. *(critério **2**)*
3. **Dado** que reimprimo hoje a semana de março, **então** aparece **quem assinava em março**. *(critério **3**)*
4. **Dado** que não há responsável vigente para o papel, **então** a linha sai **em branco para assinar à mão** — nunca erro, nunca texto técnico. *(`RN-DEG-01`)*
5. **Dado** o rodapé, **então** a tabela de CH e a legenda de técnicas listam **só o que aparece naquela semana**. *(`SC-014`, §1.2 da prática)*
6. **Dado** qualquer percurso, **então** nenhuma cadeia de erro técnico chega ao papel; dado faltante vira **aviso na tela, antes de imprimir**. *(`SC-013`, corrige `D-2`)*

---

### User Story 5 — Editar, mover e excluir pela grade (Priority: **P2**)

Editar um lançamento; movê-lo entre TA e entre dias **por arrastar-e-soltar e também por teclado ou
menu**; excluí-lo com confirmação que **descreve o efeito**. Mover é um `UPDATE` do mesmo registro,
numa transação, **preservando a auditoria**. Vale para as três origens da grade.

**Why this priority**: a semana muda — a medição mostra **ALT diferente de zero na maioria das
semanas** de vários cursos. Mas ela é P2 porque lançar e imprimir já entregam a substituição; mover
ainda pode ser feito excluindo e relançando.

**Acceptance Scenarios**

1. **Dado** que movo um lançamento de terça para quinta, **então** o registro é **o mesmo** (mesmo `id`, `criado_por` intacto) e `editado_por`/`editado_em` são carimbados. *(critério **7**, `SC-007`)*
2. **Dado** que uso **só o teclado**, **então** consigo mover o lançamento sem arrastar. *(`RF-DSA-07`)*
3. **Dado** que peço para excluir, **então** a confirmação diz **o que vai acontecer** e, confirmada, o lançamento sai da grade **sem ser apagado** do banco. *(`RNF-USA-03`, regra 4: exclusão lógica)*
4. **Dado** um lançamento de **curso fora de oferta**, **quando** tento mover ou editar, **então** a tela explica em português que a semana está fechada para alteração — e **não** deixa o `42501` da policy chegar cru. *(policy `registros_aula_editar`, medida)*

---

### User Story 6 — Conflitos e alertas (Priority: **P2**)

O mesmo instrutor — ou fiscal — com TA sobrepostos no mesmo dia **em qualquer turma do sistema** é
**conflito**; a mesma sala é **alerta secundário**. Tudo calculado em memória, **sempre sinalização,
nunca bloqueio**. O **único** bloqueio é o teto rígido de **6 TA semanais de TFM**.

**Why this priority**: é o que a planilha não faz e o que custa cara quando falha — instrutor
escalado em duas turmas ao mesmo tempo. P2 porque a grade e a impressão funcionam sem ele.

**Acceptance Scenarios**

1. **Dado** dois lançamentos do mesmo instrutor com TA sobrepostos no mesmo dia **em turmas diferentes**, **então** os dois são sinalizados como conflito, e a gravação **não** é impedida. *(critério **5**, `RN-CONF-01`, `RN-DEG-02`)*
2. **Dado** duas turmas na mesma sala no mesmo horário, **então** há **alerta secundário**, visualmente distinto do conflito de instrutor. *(`RN-CONF-01`)*
3. **Dado** 7 TA de TFM na semana, **quando** gravo o 7º, **então** a gravação é **recusada** — no lançar **e** no mover. *(`RN-DIST-03` (a))*
4. **Dado** que ultrapasso os TA do regime no dia, uso o TA **excepcional**, ou lanço acima da CH da UE, **então** recebo **alerta** e a gravação **acontece**. *(`RN-DEG-02`; o "PASSOU" da planilha)*
5. **Dado** uma disciplina cujo nome contém "LHFC" ou "fim de curso", **então** **nenhum** teto semanal é cobrado, nem recomendado. *(`RN-DIST-03` (b))*

---

### User Story 7 — Situação e quadro de CH (Priority: **P2**)

Por disciplina: **Aguardando Início, Em andamento, Concluída, Conflitou**, e a CH **acumulada até a
semana selecionada**. Por UE: prevista, lançada, restante.

**Why this priority**: é o que diz ao operador se a turma está no rumo. P2 porque depende de haver
lançamento, e porque a comparação semanal depende da função única de distribuição.

**Acceptance Scenarios**

1. **Dado** a semana 20 selecionada, **então** a CH acumulada mostrada é **até a semana 20**, não o total do curso. *(`RF-DSA-05`, `RN-CRONOS-03`)*
2. **Dado** uma disciplina sem lançamento, **então** a situação é **Aguardando Início**.
3. **Dado** uma UE, **então** vejo prevista, lançada e restante. *(`vw_unidades_ensino_execucao`)*
4. **Dado** o previsto da semana, **então** ele vem da **função única** de distribuição — e **não** existe uma segunda implementação dela no repositório. *(`RN-DIST-01`, com guarda de ponto único)*

---

### User Story 8 — Número do DSA, ALT, sábado e reposição (Priority: **P3** — NOVIDADE)

⚠️ **Esta história só entra se for ratificada no clarify.** Ela cobre o **número sequencial** do
DSA, a **ALT** que sobe quando a semana muda depois de emitida, o **sábado** e o **DSA de
Reposição**. Todos os quatro são **medidos na operação** e **não têm requisito de origem**: o
`Dsa.gs` da v2.0 só conhece segunda a sexta e não registra emissão.

**Why this priority**: P3 e condicional porque é **novidade** (Princípio X) e porque a regra 3 do
`CLAUDE.md` — *paridade antes de novidade* — manda perguntar antes. Ver `Q-3`, `Q-4`, `Q-5`.

---

### Edge Cases

- **Semana histórica inteira sem posição.** Medido: **1.566** aulas e **664** atividades com `ta_inicial` nulo. A semana abre, mostra tudo em "Sem posição" e imprime **com aviso** — não quebra. *(`SC-015`)*
- **Avaliação com posição falsa.** Medido: **188** com `ta_inicial = 1`. Ela **não** cai em "Sem posição" — cai no 1º TA. A tela precisa distinguir *"posicionado"* de *"posicionado pelo ETL em 1"*, ou a grade mente. **É a segunda metade da `Q-12`.**
- **Mover ou editar linha histórica sem UE.** A catraca `reg_aula_ue_so_nula_no_historico` recusa o `UPDATE` que carimba `editado_em` sem dar UE. A tela tem de **pedir a UE no mesmo ato**, ou recusar com frase própria. **Depende da `Q-1`; afrouxar a catraca está proibido.**
- **Bloco que atravessa o almoço.** Um lançamento, **dois trechos** de horário. *(`SC-011`)*
- **Bloco que passa do último TA do dia.** `ta_final` é coluna **gerada**; `ta_inicial` é limitado a **1..12** por CHECK. Passar do último TA do regime é **alerta**, não erro de banco — e a tela precisa dizer qual é o último.
- **Turma sem sala alocada.** `turmas.sala_alocada` é nulável: o local abre vazio e a coluna LOCAL do papel sai vazia, sem inventar sala.
- **Atividade de escopo global.** Medido: **0** no remoto hoje; e `vw_ocupacao_ta` **exclui** `turma_id IS NULL`. Quando a primeira existir, ela **não aparece** em DSA nenhum — ver a divergência **V-7**.
- **Curso sem catálogo de horários apontado.** Duas fontes de relógio (§4 do `estado-atual.md`) e precedência a declarar.
- **Perfil de alcance estreito e conflito em turma que ele não alcança.** A RLS esconde a outra turma e o conflito **não** aparece. Ver `FR-021` e `Q-17`.

---

## 4. Requirements *(mandatory)*

> Cada requisito cita a **origem**. Origem `—` significa **NOVIDADE** e está marcada como tal
> (Princípio X), com a pergunta correspondente em §9.

### 4.1 Ver a semana

- **FR-001**: O sistema MUST servir a rota `/turmas/[turma]/dsa`, com a turma pelo **código** no caminho e `semana` e `ano` na **URL**, entrando no contrato de parâmetros de `lib/navegacao/`. *(Origem: `RF-DSA-01`, `RF-DSA-02`; doc 25 linha 98)*
- **FR-002**: O endereço da rota MUST ser montado por `lib/navegacao/endereco-de-turma.ts`, porque `turmas.codigo` **contém espaços**. *(Origem: gotcha 12 do `CLAUDE.md`)*
- **FR-003**: A grade MUST apresentar **dia × TA** com disciplina, conteúdo, técnica de ensino, instrutor e o bloco de cada lançamento, incluindo atividades extraclasse do período. *(Origem: `RF-DSA-03`)*
- **FR-004**: Cada TA MUST exibir **hora de início e de término**, com indicação visual dos **intervalos** e da **janela de almoço**. *(Origem: `RF-HOR-06`, `RF-HOR-04`)*
- **FR-005**: O relógio e a contagem de TA MUST vir do **regime vigente na data da semana**, nunca do regime corrente. *(Origem: `RN-2027-09`, `RF-HOR-05`)*
- **FR-006**: A **sala** MUST aparecer **uma vez no cabeçalho** do dia ou da semana, e **só o bloco que difere** dela MUST ser destacado. *(Origem: `RF-DSA-03`, literal)*
- **FR-007**: Feriado de impacto `dia_inteiro` MUST bloquear o dia com a descrição; impacto `parcial` ou `informativo` MUST aparecer como aviso **sem** bloquear e **sem** descontar capacidade. *(Origem: `RN-EVT-02`, `RF-EVT-02`)*
- **FR-008**: Lançamento sem `ta_inicial` MUST aparecer numa faixa **"Sem posição"** do seu dia, com o motivo escrito. *(Origem: `RN-DEG-01`)*
- **FR-009**: Curso sem regime vigente ou sem catálogo de horários MUST render a grade **sem relógio**, com aviso que nomeia onde se corrige. *(Origem: `RN-DEG-01`)*
- **FR-010**: A navegação entre semanas MUST alimentar o **histórico do navegador**. *(Origem: `RF-DSA-02`, `RF-NAV-04`)*
- **FR-011**: MUST existir ao menos **três caminhos clicáveis** até a rota: a ficha da turma, a lista `/turmas` e o `/inicio`. *(Origem: regra "tela sem caminho clicável é tela não entregue")*

### 4.2 Lançar

- **FR-012**: O sistema MUST permitir lançar, num dia e TA inicial da turma, um registro de categoria **Aula** (disciplina + UE + instrutor habilitado), **Avaliação/Vista de Prova**, **AEC**, **TAD**, **TR** ou **Estudo Individual**, informando TA consumidos, conteúdo e observações. *(Origem: `RF-DSA-01`, `RN-EVT-01`)*
- **FR-013**: Lançar um bloco de aula MUST exigir **no máximo quatro** decisões — onde, disciplina, UE, quantos TA; instrutor, técnica e local MUST chegar **preenchidos** e MUST ser editáveis **naquele lançamento**. *(Origem: `P-2` da prática; `SC-009`)*
- **FR-014**: O pré-preenchimento do instrutor MUST seguir a cascata **UE da turma → disciplina da turma → vazio com aviso**, e MUST NOT inventar instrutor. *(Origem: `RN-CRONOS-01`, `RN-DEG-01`; medição de `turma_disciplina_unidade` = 0 linhas)*
- **FR-015**: Trocar instrutor, local, técnica ou conteúdo de **um** lançamento MUST NOT alterar outro lançamento nem cadastro algum. *(Origem: `D-4`; `SC-012`)*
- **FR-016**: A disciplina ofertada MUST ser **do curso da turma**; a UE MUST ser **da disciplina**. *(Origem: `RN-MAT-01`, FKs compostas medidas)*
- **FR-017**: Instrutor **não habilitado** na disciplina MUST ser recusado com mensagem específica; instrutor **inativo** MUST NOT aparecer; todo seletor de instrutor MUST vir **em antiguidade**, pelo componente único. *(Origem: `RN-INST-01`, `RN-INST-02`, `RN-ANT-01`)*
- **FR-018**: A lista de UE MUST mostrar, por UE, **CH prevista, lançada e restante**. *(Origem: `P-3`; `vw_unidades_ensino_execucao`)*
- **FR-019**: Avaliação e vista MUST ser **um único fato**, com TA próprios para cada uma, e o fiscal MUST poder ser **pessoa fora do cadastro**. *(Origem: `RN-AVAL-02`, `RN-EVT-03`, `RF-AVAL-04/05/06`)*
- **FR-020**: Categoria de atividade não letiva MUST vir do domínio **fechado** (AEC, TAD, TR, Estudo Individual) e o **subtipo** de lista administrável; sigla de duas letras MUST NOT ser entrada do operador. *(Origem: `RN-EVT-01`, `RF-EXTRA-01`, `RNF-NORM-08`)*

### 4.3 Conflito, teto e situação

- **FR-021**: O conflito de **instrutor** MUST considerar **todas as turmas do sistema** no mesmo dia com TA sobrepostos, e MUST NOT vazar dado da outra turma para quem não a alcança. *(Origem: `RN-CONF-01` **[REVISADA]**, `RF-DSA-04`; e a colisão com a RLS medida em `estado-atual.md` §6.2 — ver `Q-17`)*
- **FR-022**: O conflito de **sala** MUST ser sinalizado como **alerta secundário**, visualmente distinto. *(Origem: `RN-CONF-01`)*
- **FR-023**: O conflito MUST ser calculado **em memória**; MUST NOT existir tabela de conflitos, `EXCLUDE` constraint nem bloqueio por conflito. *(Origem: `RN-CONF-01`, `RN-DEG-02`)*
- **FR-024**: **TFM acima de 6 TA na semana** MUST ser **recusado**, no lançar e no mover. Disciplina de **fim de curso** (nome contendo "LHFC" ou "fim de curso") MUST NOT ter teto. As demais têm teto de **25 TA** apenas **recomendado**. *(Origem: `RN-DIST-03`)*
- **FR-025**: Exceder os TA do regime no dia, usar o TA **excepcional** ou lançar acima da CH da UE MUST ser **alerta**, nunca `CHECK` nem bloqueio. *(Origem: `RN-DEG-02`)*
- **FR-026**: A situação por disciplina MUST ser **Aguardando Início, Em andamento, Concluída, Conflitou**, com a CH **acumulada até a semana selecionada**. *(Origem: `RF-DSA-05`, `RN-CRONOS-03`)*
- **FR-027**: O previsto da semana MUST vir de **uma única** função de distribuição, compartilhada com o Diagrama de Alocação e com o Cronos; MUST NOT existir segunda implementação. *(Origem: `RN-DIST-01`, *Risco: Alto*)*
- **FR-028**: A execução MUST ser a soma dos **lançamentos**, nunca da atribuição de instrutor. *(Origem: `RN-CRONOS-01`)*
- **FR-028.1**: Lançamento com data **posterior a hoje** MUST contar nos indicadores — a regra fala de *"lançado"* — e MUST ser **visualmente distinguível** do já executado, na grade, no quadro de CH e no rodapé impresso. MUST NOT existir corte por data no cálculo. *(Origem: `Q-2`; corrige o `D-5` sem reinterpretar a `RN-CRONOS-01`)*

### 4.4 Editar, mover, excluir

- **FR-029**: MUST ser possível **editar** um lançamento, **mover** entre TA e entre dias por **arrastar-e-soltar e por teclado/menu**, e **excluir** com confirmação que descreve o efeito. *(Origem: `RF-DSA-07`, `RNF-USA-03`)*
- **FR-030**: Mover MUST ser `UPDATE` do **mesmo** registro, em transação, preservando `id` e `criado_por`. *(Origem: `RF-DSA-07`, critério **7**)*
- **FR-031**: Exclusão MUST ser **lógica** (`status`); MUST NOT existir policy de `DELETE`. *(Origem: regra 4 do `CLAUDE.md`)*
- **FR-032**: Recusa do banco MUST chegar à tela em **português, nomeando a causa** — em especial a de **curso fora de oferta** e a da **catraca de UE**. *(Origem: `RN-DEG-01`; policies medidas)*

### 4.5 Imprimir

- **FR-033**: `/print/dsa?turma=&semana=&ano=` MUST render **uma** página A4 paisagem, **sem a casca**, em servidor puro, para uma semana cheia. *(Origem: `RF-PDF-01`, `RF-DSA-06`, `RNF-COMP-01`)*
- **FR-034**: O documento MUST conter **todo** o conteúdo da §1.2 da prática: cabeçalho da OM e do curso, número, período; colunas DIA, HORÁRIO, DISCIPLINA, `<n>` TA, UNIDADES DE ENSINO E TÓPICOS, **LOCAL por linha**, T/E e INSTRUTOR; a linha fixa de **ESTUDO INDIVIDUAL** por dia; e o rodapé com `Gerado em`, a nota do estudo individual, `<n> ALUNOS`, a tabela de CH e a legenda de técnicas. *(Origem: `RF-PDF-01`, `RNF-COMP-01`)*
- **FR-035**: O nome do instrutor MUST sair no formato **P/G Especialidade/Habilitação Nome Completo**, pelo componente **único**. *(Origem: `RF-INSTR-15`)*
- **FR-036**: As assinaturas MUST ser resolvidas de `responsaveis_curso` pela vigência **na data da semana**, nos modos **fixo** e **dinâmico**; sem responsável vigente, a linha MUST sair **em branco**. *(Origem: critérios **2** e **3**; `papel_assinatura` e `modo_preenchimento_assinatura` medidos)*
- **FR-036.1**: A resolução MUST procurar, por papel, a linha **do curso** e, não a achando, cair na linha **GERAL** (`curso_id` nulo) — a linha do curso **prevalece**. *(Origem: `Q-14`; `curso_id` nulável, medido)*
- **FR-037**: A tabela de CH e a legenda de técnicas MUST listar **só** o que aparece naquela semana. *(Origem: §1.2 da prática; `SC-014`)*
- **FR-038**: Em avaliação, o instrutor MUST sair seguido de **"(FISCAL)"** e a coluna T/E MUST trazer o **tipo**. *(Origem: §1.2 da prática)*
- **FR-039**: Nenhum texto de erro técnico MUST chegar ao papel; dado faltante MUST virar **aviso na tela, antes de imprimir**. *(Origem: `D-2`; `SC-013`)*

### 4.6 Contrato para o Épico 12 — e nada além dele

- **FR-040**: O lançamento MUST ser descrito como um **dado** — `{ turma, data, taInicial, tempos, tipo, disciplina, unidadeEnsino, instrutor, tecnica, local, conteudo }` — que **uma função pura consegue produzir** e que a **mesma Server Action** do lançamento manual consegue gravar. *(Origem: Épico 12; contrato pedido)*
- **FR-041**: MUST NOT entrar nesta fatia: sugestão automática, cópia de semana, preferência de instrutor ou restrição de sequenciamento pedagógico — nem "preparados". *(Origem: Épico 12; `RNF-NORM-04` **rejeitado**)*

### 4.7 Key Entities

| Entidade | O que é, e o que esta fatia faz com ela |
|---|---|
| **Lançamento de aula** (`registros_aula`) | o bloco da grade: dia, TA inicial, tempos, UE, instrutor, técnica, local, conteúdo. `ta_final` é **gerada**. Nada a criar |
| **Avaliação / Vista** (`avaliacoes`) | **um fato** com duas posições (aplicação e vista), fiscal interno **ou** externo. Nada a criar |
| **Atividade não letiva** (`atividades_nao_letivas`) | categoria normativa fechada + subtipo; `compoe_cht` **gerada**. Falta responsável/palestrante (`Q-8`) |
| **Bloco** (novo, só em memória) | TA consecutivos do mesmo lançamento, com **um ou dois** trechos de horário quando atravessa o almoço. **Não é tabela** |
| **Relógio da semana** (`configuracoes_horario` + `horarios_tempos_aula`, e `vw_cursos_regime_vigente`) | **duas fontes**, precedência a declarar (`Q-6`) |
| **Assinatura** (`responsaveis_curso`) | papel, modo fixo/dinâmico, vigência, `exibir_no_dsa`. **2 linhas** hoje, as duas GERAL |
| **Feriado** (`feriados`) | `impacto` decide se desconta capacidade. **26** em 2026, **24** de dia inteiro |

---

## 5. Success Criteria *(mandatory)*

### 5.1 Os oito do documento 06 — numeração mantida

- **SC-001**: A impressão cabe em **uma** página A4 paisagem para uma semana cheia, com paridade de conteúdo contra a §1.2 de `praticas-da-planilha.md`. *(critério 1)*
- **SC-002**: O rodapé impresso sai com as assinaturas **preenchidas**. *(critério 2)*
- **SC-003**: Reimprimir hoje o DSA de uma semana de março traz **quem assinava em março**. *(critério 3)* ⚠️ **Exige semear uma segunda vigência no banco local** — medido: há **uma só** vigência por papel no remoto, e nenhuma por curso.
- **SC-004**: A semana anterior a uma mudança de regime é renderizada com o regime **daquela** data. *(critério 4)*
- **SC-005**: Dois lançamentos do mesmo instrutor com TA sobrepostos no mesmo dia, **em turmas diferentes**, são sinalizados como conflito. *(critério 5)*
- **SC-006**: Feriado de dia inteiro desconta capacidade da semana; parcial e informativo **não** descontam. *(critério 6)*
- **SC-007**: Mover um lançamento entre dias preserva a auditoria — **mesmo `id`, `criado_por` intacto**. *(critério 7)*
- **SC-008**: O e2e cobre **lançar → visualizar → imprimir**, **chegando por clique** e com dado realista. *(critério 8)*

### 5.2 Os oito acrescentados pela medição

- **SC-009**: Lançar um bloco de aula exige **no máximo quatro** decisões do operador; instrutor, técnica e local chegam preenchidos. **Medido contando os campos que o operador toca** no caso de ponta a ponta.
- **SC-010**: Uma semana cheia de uma turma do **C-Ap-HN** — **45 TA** — é lançada pela tela **sem erro e sem recarregar**.
- **SC-011**: Um bloco de 4 TA começando no **3º tempo da G45** exibe e imprime **"09:30 às 11:55"** e **"13:05 às 13:50"** — nunca "09:30 às 13:50".
- **SC-012**: Trocar o instrutor de **um** lançamento não altera nenhum outro lançamento nem o cadastro. Medido **pelo valor no banco** antes e depois.
- **SC-013**: Nenhuma cadeia de erro técnico — `#REF!`, `undefined`, `null`, código de erro — aparece na tela ou no papel em **nenhum** percurso do e2e; a ausência de dado tem **frase própria**.
- **SC-014**: A legenda de técnicas e a tabela de CH do rodapé listam **só** o que aparece naquela semana.
- **SC-015**: Semana histórica **sem TA** abre, mostra tudo em **"Sem posição"** e imprime **com aviso** — não quebra. Medido contra as **1.566** aulas e **664** atividades reais.
- **SC-016**: Para **cada** perfil sem permissão de escrita há um teste que tenta **lançar, mover e excluir** e prova, **pelo valor no banco**, que nada mudou — com o código de recusa conferido (`42501`).

### 5.3 Dois acrescentados por esta spec, da medição do remoto

- **SC-017** *(NOVIDADE)*: As **188** avaliações com `ta_inicial = 1` de procedência do ETL são distinguíveis, na grade, de uma avaliação **realmente** posicionada no 1º TA — ou a tela declara, por escrito e no lugar, que a posição é herdada. **Nenhuma** delas aparece como se o operador a tivesse posicionado. *(Origem: — · medição de 05/10/2026 · ver `Q-12`)*
- **SC-018**: `lib/dominio/dsa/` não importa `supabase`, `next` nem `react`, e a **primeira subpasta** de `lib/dominio/` é alcançada pelas guardas existentes — provado por defeito deliberado dentro dela. *(Origem: `R-1`; Princípio II; medição de `eslint.config.mjs:95` e do caminhador recursivo)*

---

## 6. Assumptions

Adotadas por leitura do normativo e da medição, **não** por suposição. Cada uma tem a pergunta
correspondente em §9 quando é decisão de Bernardo.

1. **`lib/dominio/dsa/` é o lugar** — `conflitos.ts`, `grade.ts`, `horario-do-bloco.ts`, `tetos.ts`, `situacao.ts`, `assinaturas.ts` —, porque o **documento 24, linha 262** o declara e a `R-1` do pedido o repete. Os nomes planos dos documentos 02 e 04 são a divergência **V-1**, listada, não corrigida.
2. **`distribuicao-semanal.ts` nasce FORA de `dsa/`**, em `lib/dominio/`, porque a `RN-DIST-01` a declara compartilhada por **três** módulos e proíbe segunda implementação. Pô-la sob `dsa/` convidaria o Épico 7 a escrever a dele.
3. **Os parâmetros ficam em `lib/navegacao/`**, não em `lib/estado/` — que **não existe** no repositório (divergência **V-3**).
4. **Precedência do relógio**: manda o **catálogo** quando `config_horario_padrao` aponta para uma configuração; manda o **regime** quando não aponta. Declarada e testada nos dois sentidos — ver `Q-6`.
5. **Nenhum pacote novo.** Impressão é CSS `@media print` + rota `/print/*`; arrastar-e-soltar é API nativa, com o caminho de teclado como primário. Medido: **zero** biblioteca de DnD, PDF, calendário ou data entre as 13 dependências.
6. **A tela do DSA não ganha entrada própria no menu.** A `D-NAV-1` fixou oito entradas em 04/10/2026 e o pedido proíbe reorganizar sem perguntar: o DSA é alcançado pela **ficha da turma**, pela **lista `/turmas`** e pelo **`/inicio`**. Ver `Q-18`.
7. **A exclusão anda na permissão `editar`**, porque **não existe** ação `desativar` para os três recursos na matriz medida. Nenhum portão novo é inventado.
8. **A tela do DSA é Server Component**; o cliente é a **folha** do arrastar-e-soltar, exceção declarada em `fronteira-das-telas.test.ts`, como as de 012.

---

## 7. Divergências encontradas — listadas, não corrigidas

São **oito**, cada uma com o arquivo e a linha dos dois lados, em
**[`estado-atual.md` §8](./estado-atual.md)**: **V-1** onde mora a regra de conflito · **V-2** nome
das views · **V-3** onde moram os parâmetros da URL · **V-4** formato do código de turma nos
exemplos · **V-5** o `CHECK` do Estudo Individual que a `RF-EXTRA-02` afirma e **não existe** ·
**V-6** a FK dos tipos de atividade que a `RF-EXTRA-01` declara e **não existe** · **V-7** atividade
de escopo **global** que a `RF-EXTRA-03` manda refletir no DSA e que `vw_ocupacao_ta` **exclui** ·
**V-8** *"Operador responsável pelo lançamento"* nos requisitos contra *"Auxiliar"* nos PDFs e
`elaborador` no ENUM.

⚠️ **A `V-5` e a `V-7` são as que podem morder esta fatia**, porque são requisito escrito e não
implementado — não conserto nenhuma por conta própria (regra 1 e o pedido).

---

## 8. O que NÃO entra nesta fatia

Sugestão automática, cópia de semana, preferência de instrutor e sequenciamento pedagógico (Épico
12; `RNF-NORM-04` **rejeitado**) · painel de avaliações planejadas × reais e controle de prazo de
vista (Épico 8) · Cronograma (Épico 7) · Relatório do curso (Épico 10) · nota, média e aprovação
(`RNF-NORM-06`) · reimportar posição de TA das planilhas e qualquer carga contra o remoto
(`VIRADA-1`, `AMBIENTE-2`) · policy de `DELETE` (regra 4) · reserva de salas como recurso
(`RF-CRONOS-10`).

---

## 9. A divisão em PRs — uma fatia, um PR

> A `R-9` manda separar **banco** de **tela**. Nenhum PR de tela carrega migration, e nenhum PR de
> banco carrega tela — e o de banco só nasce se a resposta de uma pergunta o exigir.

| PR | Fatia | Histórias | Migration | Depende de |
|---|---|---|---|---|
| **PR 0** | **O domínio puro, antes de qualquer componente** — `lib/dominio/dsa/` com horário do bloco (quebra no almoço), montagem da grade, conflito, tetos, capacidade da semana, situação por disciplina e por UE, resolução de assinatura por data; e `distribuicao-semanal.ts`. Vitest ao lado de cada uma, com as grades **reais** G45 e G50 e as **cinco** configurações | — | **nenhuma** | nada |
| **PR B** | **O banco, inteiro e de uma vez** — `registros_aula.disciplina_id` + FK composta; o `CHECK` de "UE **ou** disciplina com tópico"; a emenda **nominal** à catraca da UE; `vw_ocupacao_ta` e `vw_disciplinas_execucao` com junção **`LEFT`** e `security_invoker` **repetido**; a atividade **global** na grade (`V-7`); o `CHECK` do Estudo Individual (`V-5`); `atividades_nao_letivas.responsavel_externo` (`Q-8`); a função `SECURITY DEFINER` do conflito (`Q-17`) | — | **SIM — e é o único PR que tem** | PR 0 |
| **PR 1** | **Ver a semana** — rota, `semana`/`ano` no contrato, `GradeAlocacao` + `GradeDsa`, feriado, "Sem posição", degradação sem relógio, os três caminhos clicáveis | H1 | **nenhuma** | **PR B** |
| **PR 2** | **Lançar** — aula em bloco com pré-preenchimento; aula **sem UE** nos cursos por competências; avaliação/vista; AEC/TAD/TR/EI; o Estudo Individual da semana num clique; Server Actions com Zod no mesmo esquema dos dois lados | H2, H3 | **nenhuma** — foi toda para o PR B | PR B, PR 1 |
| **PR 3** | **Imprimir** — `/print/dsa`, A4 paisagem, assinaturas por vigência, rodapé completo | H4 | **nenhuma** | PR 2 |
| **PR 4** | **Editar, mover, excluir · conflitos e alertas** · posicionar o que está em "Sem posição" | H5, H6 | **nenhuma** — foi toda para o PR B | PR 2 |
| **PR 5** | **Situação e quadro de CH** | H7 | **nenhuma** | PR 0, PR 2 |
| **PR 6** | **ALT e DSA de Reposição** — ⚠️ o **sábado saiu daqui**: ele entra no **núcleo** (`Q-4`), e o **número** do DSA é derivado já no PR 3 | H8 | **sim** | PR 3 |

⚠️ **PR 0 NÃO É CERIMÔNIA: ele é a ordem de implementação do `CLAUDE.md`** — *de dentro para fora:
`lib/dominio/` → `lib/validacao/` → `lib/acoes/` → `app/` → `components/`* — e é o único jeito de a
`R-2` ser verificável antes de existir tela para esconder o erro de minuto.

⚠️ **E A ORDEM NÃO É NEGOCIÁVEL, porque a `Q-6` FOI DECIDIDA:** a correção do relógio é **dado**
(vigência nova por curso) e a medição mostra divergência em **quatro** eixos — início, contagem da
manhã, intervalo e retomada. Conferir a impressão contra o PDF assinado **antes** dessa correção
compararia o documento certo com o relógio errado.

---

## 10. As perguntas, e as opções que foram consideradas — ✅ **AS 18 ESTÃO RESPONDIDAS**

> ⚠️ **ESTA SEÇÃO FICA, e não é redundante com as Clarifications.** O que vale é a decisão, gravada
> em §Clarifications com data e autoria; o que esta seção guarda é **o que foi pesado para chegar
> nela** — as opções recusadas e a implicação de cada uma. Apagá-la deixaria a decisão sem o
> porquê, e é o porquê que impede alguém de "consertar" a escolha seis meses depois.
> ⚠️ **Onde a minha recomendação foi recusada, está dito:** a `Q-1` (adotada a (a), eu recomendava a
> (b)) e a `Q-14` (eu mudei de recomendação depois de medir).

> **Em lote, como pedido.** Cada uma traz opções, implicação e **recomendação**. Nenhuma foi
> respondida por suposição. As três marcadas no corpo são `Q-1`, `Q-2` e `Q-3`.

### Q-1 — Curso por competências e disciplina sem UE · ✅ **RESPONDIDA: opção (a)**

Medido: **C-Espc-HN** e **C-Espc-FR** são `curriculo_modelo = 'competencias'` e **seis** disciplinas
estão marcadas `sem_unidades_ensino` — e são **dois dos cinco cursos regulares que mais lançam**. O
`CHECK reg_aula_ue_so_nula_no_historico` exige UE em dado novo.

| Opção | Implicação |
|---|---|
| **(a)** lançamento **por disciplina, sem UE**, só nesses casos, com **tópico obrigatório** | exige **afrouxar a catraca** por condição nova (curso por competências), **e** mudar `vw_ocupacao_ta`, cuja junção com `unidades_ensino` é **interna** — sem isso o lançamento fica **invisível na grade** |
| **(b)** cadastrar as **"UE operacionais"** que as planilhas desses cursos já usam | nada muda no banco; o catálogo da DEnsM ganha linhas que **não vêm da DEnsM**, e isso precisa de marca de procedência para não virar currículo inventado |
| **(c)** outra |  |

**E a segunda metade da pergunta:** **o que a tela faz ao mover ou editar linha histórica sem UE?**
A catraca recusa o `UPDATE` que carimba `editado_em` sem UE — então as saídas são **pedir a UE no
mesmo ato** ou **recusar com frase própria**.

**Recomendação: (b)**, com `origem_migracao_v1` marcando que a UE é operacional e não normativa — ela
não afrouxa restrição nenhuma, não altera view e mantém o grão de UE que a `UE-1` decidiu em
26/08/2026. E, para o histórico, **pedir a UE no mesmo ato**, porque recusar deixaria 1.566 linhas
permanentemente imóveis.

### Q-2 — Lançamento futuro conta como executado? · ✅ **RESPONDIDA: opção (c)**

Medido: em 05/10/2026 todas as planilhas ativas estavam preenchidas até 09 ou 10/10. O defeito `D-5`
da planilha é exatamente contar semana futura como cumprida. A `RN-CRONOS-01` diz que execução é
*"a soma dos registros de aula efetivamente lançados"* — e **o pedido proíbe reinterpretá-la**.

| Opção | Implicação |
|---|---|
| **(a)** conta **tudo o que está lançado**, futuro incluído | é a leitura literal da `RN-CRONOS-01`; reproduz o `D-5` |
| **(b)** conta só até **hoje**; o futuro aparece como **"planejado"** | corrige o `D-5`; exige um corte por data em **três** lugares (andamento da turma, CH cumprida do rodapé, situação da disciplina) e muda número que o Épico 5.5 já publica |
| **(c)** conta tudo, e a tela **distingue** executado de lançado-à-frente | não reinterpreta a regra e não mente na tela |

**Recomendação: (c)** — a regra fala de *"lançado"* e não de *"passado"*, então (b) seria
reinterpretação; e (a) sem distinção visual é o `D-5`. ⚠️ **E isto tem consequência fora desta spec:**
o `/inicio` e a ficha da turma já somam `chd_executada` pela view, sem corte de data.

### Q-3 — Número do DSA e ALT · ✅ **RESPONDIDA: fora do núcleo, no PR 6**

Medido: o número é **sequencial por turma** (C-Ap-HN no **13** em 06/07/2026); **"ALT Nº"** vai de 0
a 4 e é diferente de zero na **maioria** das semanas de vários cursos; **210 PDFs**, **94** com
"ALT" no nome; e as abas CRONOS e PREENCHIMENTO **divergem** na contagem porque uma pula semana sem
aula e a outra não.

| Opção | Implicação |
|---|---|
| **(a)** **registrar a emissão**: tabela de emissão por turma/semana, número sequencial, ALT que sobe quando algo muda depois de emitido, e quem assinou | migration; é o único jeito de o número e a ALT serem **fato** e não cálculo; permite reimprimir a versão emitida |
| **(b)** número **derivado** da ordem das semanas, **sem** ALT | nada no banco; perde a ALT, que a operação usa na maioria das semanas, e o número muda se a janela da turma mudar |

**E a terceira parte:** **semana sem aula consome número?** As duas contagens da planilha discordam,
então **não há prática a preservar** — é decisão.

**Recomendação: (a)**, com *"semana sem aula **não** consome número"* (a convenção da aba CRONOS), e
registrando a emissão como **fato só de acréscimo**. Sem isso, o `ALT <n>` do rodapé não tem de onde
sair, e ele está no documento oficial.

### Q-4 — Sábado

A grade mostra sábado **sempre**, **só quando há lançamento**, ou **por ação do operador**? E quantos
TA tem o sábado? Medido: o C-Ap-HN tem **oito sábados com 5 TA** (22/08 a 10/10/2026), enxertados à
mão; o `Dsa.gs` da v2.0 só conhece segunda a sexta.
**Recomendação:** mostrar **só quando há lançamento**, com uma ação explícita para abri-lo; e os TA
do sábado saindo do **mesmo regime** do curso, sem número fixo — 5 é o que aquela turma usou, não uma
regra.

### Q-5 — DSA de Reposição

Entra neste épico, vira **lançamento comum com marca "reposição"**, ou fica para depois do corte?
Medido: **oito** PDFs no CAHO em 2026, fora da grade (15:40–17:15), com **outro par de assinaturas** e
rodapé `1 ALUNO`.
**Recomendação: depois do corte.** É um **segundo documento**, com outra assinatura e outro público
(aluno específico), e tratá-lo como lançamento comum poria aula fora da grade dentro da capacidade
da turma. Fica como pendência nomeada.

### Q-6 — Relógio real × catálogo

Bernardo confirma **G45** e **G50** por curso, e a correção entra nesta feature como **dado** (nova
vigência) **antes** do PR de impressão? Medido, a divergência é em **quatro** eixos: início (08:00 ×
07:50/08:10), TA de manhã na G45 (**4** × **5**), intervalo (**10 min** × **5 min**) e retomada
(13:00 × 13:05).
**Recomendação: sim, e antes do PR 3** — ver o aviso ao fim de §8.

### Q-7 — Estudo Individual diário

Continua lançado **um a um**, ou a tela oferece **"lançar o Estudo Individual padrão da semana"** num
clique? E a nota *"É facultado ao aluno…"* é **fixa** ou **por curso**? Medido: **664** atividades no
remoto, todas sem TA.
**Recomendação:** um clique por **semana**, gerando um lançamento por dia útil — é a linha **fixa**
do documento, e exigir 5 lançamentos iguais por semana contraria o `SC-009`. A nota: **fixa**, por
ser texto do documento oficial; se variar por curso, ela é `config_parametros`, não código.

### Q-8 — Responsável de atividade não letiva

Campo de **texto livre** em `atividades_nao_letivas`, além do instrutor opcional? Medido: a tabela
**não tem coluna de responsável, palestrante nem instrutor**; a coluna INSTRUTOR da planilha é texto
livre e traz entidade (`DOEP`, `CIAARA-30`, `NAS`) e palestrante externo.
**Recomendação: sim, uma coluna de texto `responsavel_externo`, mais `instrutor_id` opcional** — o
mesmo desenho que `avaliacoes` já usa com `fiscal_id` × `nome_fiscal_externo`, com CHECK de
exclusividade. É migration, e entra no PR 2.

### Q-9 — Mais de um instrutor na mesma aula

Um **principal** e os demais em relação própria, ou fica para depois? Medido: **34 itens** no
C-Espc-FR com dois instrutores (`A / B`); `registros_aula` aceita **um** `instrutor_id`.
**Recomendação: depois**, com pendência nomeada. Entrar agora é tabela nova, mudança em
`vw_ocupacao_ta`, no conflito e na coluna do papel — e o DSA sai hoje com um nome por linha.

### Q-10 — Técnica de ensino: a sigla

A lista passa a ter **sigla** (EO, AP, EI, TG, TI, PP, PM, PO, PE, OD) e admite **combinação**
(`EO/AP`)? Qual é a lista oficial? Medido: `registros_aula.metodologia` tem **dois** valores — *"Exposição
Oral"* (1.564) e *"Avaliação"* (2) —, todos por extenso, e **sem FK**; a coluna T/E do papel e a
legenda do rodapé usam **sigla**.
**Recomendação: sim à sigla, sem migration de schema** — ela cabe em `config_listas.metadados`
(`jsonb`, medido) ou em `rotulo_exibicao`, com a FK da `RF-EXTRA-01` virando pendência (`V-6`). E
**sim à combinação**, porque ela está no documento assinado (`EO/AP`, `TG/TI`) — como **duas**
técnicas no mesmo bloco, não como um valor novo chamado "EO/AP".

### Q-11 — Local: tela e papel

A tela mostra a sala **no cabeçalho** e destaca **só o bloco que difere** (`RF-DSA-03`), e a
**impressão** mantém a coluna LOCAL **por linha**, como no documento oficial?
**Recomendação: sim às duas** — e elas **não** se contradizem: são superfícies diferentes, e o
`RF-DSA-03` fala da **tela** enquanto a `RNF-COMP-01` obriga a **paridade do papel**. Está escrito
assim em `FR-006` e `FR-034`.

### Q-12 — Histórico sem TA, e a posição falsa das avaliações

A grade **degrada e pronto**, ou a tela permite **posicionar** lançamento antigo arrastando da faixa
"Sem posição"? ⚠️ **E a segunda metade, que a medição criou:** as **188** avaliações têm
`ta_inicial = 1` **de sentinela do ETL** — a tela as mostra como posicionadas, as marca como
herdadas, ou as trata como sem posição?
**Recomendação:** degradar na `H1` e **permitir posicionar na `H5`**, onde mover já existe; e **marcar
as 188 como posição herdada**, visivelmente, porque posição falsa é mais caro que posição ausente
(`SC-017`).

### Q-13 — EAD puro e a fase a distância

O DSA **não se aplica**? Medido: os EAD puros não têm planilha no Drive, e o `C-ApA-OcOp-PR-SP`
mantém planilha **só da semana presencial**.
**Recomendação: não se aplica** — a tela abre com a frase que diz por quê, em vez de uma grade vazia
que parece defeito.

### Q-14 — Quem assina

**Elaborador = usuário que imprime** (modo dinâmico) ou o **Auxiliar fixo por curso**, como nas
planilhas? ⚠️ **Medido, e o banco já responde o contrário da planilha:** as **2** linhas de
`responsaveis_curso` são GERAL, com `elaborador` em **`dinamico_usuario_logado`** e
`encarregado_divisao` em **`fixo`**.
**Recomendação: manter o dinâmico** — ele é o que está configurado, não precisa de cadastro por curso
e faz o critério 2 valer já. Se a divisão quiser o Auxiliar fixo, é **`UPDATE` + uma linha por
curso**, não código. **E o DSA de reposição tem outro par** — o que reforça a `Q-5`.

### Q-15 — A marca "(a) aguarda confirmação"

Encarregado e Ajudante da Administração Acadêmica **lançam** no DSA? ⚠️ **Medido: hoje sim.** A marca
está em `perfil_permissao.observacao`, em **12** linhas, e nas 12 `permitido = true`; na matriz
inteira há **0** linhas com `permitido = false`.
**Recomendação: confirmar o que está** — eles lançam. Revogar é `UPDATE` na matriz e **16** asserções
negativas novas; manter é zero trabalho e é o comportamento que a fase de testes vai exercitar.

### Q-16 — Feriado e licença

Vêm **só do calendário** (`feriados`), sem lançamento TA a TA — e aparecem no documento impresso como
**linha do dia**, como hoje? Medido: na planilha, **feriado, Licença de Pagamento e Licença
Administrativa são digitados TA a TA**; no banco, `feriados` tem **26** linhas para 2026 e o ENUM
`impacto_feriado` decide o desconto.
**Recomendação: feriado só do calendário**, aparecendo como linha do dia no papel; **licença de
pagamento e administrativa como `atividades_nao_letivas` de subtipo próprio**, porque elas são
**TAD** pela `RN-EVT-01` e têm TA, enquanto feriado **não é lançamento**.

### Q-17 *(nova — da medição)* — O conflito entre turmas colide com a RLS

A `RN-CONF-01` manda considerar **todas as turmas do sistema**, e o próprio texto avisa: *"exigindo
acesso a mais dados do que o cálculo original"*. Medido: `vw_ocupacao_ta` é `security_invoker=true` e
as policies filtram `app.alcanca_turma(turma_id)` — **para o Operador de alcance recortado, o
conflito na turma de outro curso simplesmente não aparece**, sem erro e sem aviso.

| Opção | Implicação |
|---|---|
| **(a)** função `SECURITY DEFINER` com porteiro, devolvendo **só o fato** (dia, TA, instrutor) e nada da outra turma | migration; atende o critério 5 para **todos** os perfis sem vazar DSA alheio |
| **(b)** o conflito vale **dentro do alcance de quem olha** | zero banco; o critério **5** passa a valer só para perfil de alcance geral, e quem mais lança é justamente o Operador |
| **(c)** afrouxar a policy de leitura | **recusada**: entrega o DSA de outro curso a quem tem alcance recortado |

**Recomendação: (a)** — é a forma que o repositório já usa para "preciso do fato sem o dado"
(`dependentes_da_conta`, `vigencias_do_curso`), e (b) deixaria o conflito invisível para o perfil que
mais lança.

### Q-18 *(nova)* — Entrada própria no menu

O DSA ganha entrada no menu lateral, ou é alcançado só pela turma? A `D-NAV-1` fixou **oito** entradas
em 04/10/2026 e o pedido proíbe reorganizar sem perguntar. O DSA **é por turma**, então uma entrada de
menu precisaria de um seletor de turma antes da grade.
**Recomendação: sem entrada própria** — três caminhos clicáveis pela turma (ficha, lista, `/inicio`),
como `FR-011`. Se Bernardo quiser a entrada, ela abre a **lista de turmas** com a ação "abrir o DSA".

---

## 11. Regras que parecem erradas — listadas, não corrigidas

1. **`RF-DSA-06` e `RF-PDF-01` exigem "campo de observação"** no documento impresso. Os PDFs
   assinados medidos **não têm** esse campo. Não invento o campo nem apago o requisito: fica a
   divergência, e a decisão de qual dos dois vale é de Bernardo.
2. **`RF-EXTRA-02` afirma que o `CHECK` do Estudo Individual existe** (`V-5`) e ele **não existe**.
3. **`RF-EXTRA-01` declara FK de `subtipo` para `config_listas`** (`V-6`) e ela **não existe**.
4. **`RF-EXTRA-03` + `RF-EXTRA-02` mandam a atividade global refletir no DSA** e `vw_ocupacao_ta` a
   **exclui** (`V-7`).
5. **`RN-CRONOS-02` nomeia quatro categorias** — Licença de Pagamento, Administração, Tempo Reserva,
   Outras — que **não são** o ENUM `categoria_normativa`. Leitura: a `RN-EVT-01` **[RESOLVIDA]**
   prevalece e as quatro viram **subtipo**. Dito aqui porque a leitura fácil é *"falta categoria"*.
6. **A `R-2` do pedido diz que "a hora de término é derivada"** e no catálogo `hora_fim` é **coluna
   armazenada**. Leitura adotada: deriva-se o fim do **bloco**, não do TA — ver §4.1 de
   `estado-atual.md`.
