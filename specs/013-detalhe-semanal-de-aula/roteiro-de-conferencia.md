# Roteiro de conferência do Épico 6 — o DSA inteiro, por clique

> **Um roteiro só, para os cinco PRs.** Ele começa pelas **10 linhas de relógio** que você grava na
> tela de vigência, porque sem elas a grade e o papel saem com o horário errado em quatro eixos —
> e aí a conferência compararia o documento certo com o relógio errado.
>
> ⚠️ **O preview serve os CINCO PRs porque eles estão EMPILHADOS**: o ramo do PR 5 contém o PR 4,
> que contém o PR 3, que contém o PR 2, que contém o PR 1. **Confira tudo no preview do PR 5.**
>
> ⚠️ **Nada aqui exige banco.** Todo passo é clique na tela. Onde for leitura de banco, está escrito
> que é **minha** e não sua.

---

## 0 · Antes de começar

| O quê | Valor |
|---|---|
| Ambiente | **preview do PR 5** (o link está na entrega) |
| Conta | a sua, de Admin |
| Turma usada nos exemplos | qualquer uma dos cinco cursos regulares; o roteiro usa o **C-Ap-HN** |
| Tempo estimado | 35 a 50 min, sem a Parte 0 |

⚠️ **Se algo não bater, pare e anote o passo.** O que eu preciso saber é: **qual passo**, **o que
apareceu** e **o que você esperava** — nessa ordem. Captura de tela ajuda; o número do passo é o que
resolve.

---

## Parte 0 · As 10 linhas de relógio *(é sua, e vem primeiro)*

**Onde:** *Cursos → abrir o curso → Editar curso → Registrar nova vigência*.

⚠️ **POR QUE ISTO VEM ANTES DE TUDO:** hoje as 11 vigências reais apontam para o catálogo CFG-A..E,
que começa às **08:00** em todas as configurações. O relógio real começa às **07:50** (G45) ou
**08:10** (G50), com **5** TA de manhã na G45 — medido nas 15 planilhas. Enquanto as 10 linhas não
existirem, a grade e o papel sairão com o horário do catálogo, e **isso não é defeito do sistema**:
é a `RN-2027-09` lendo o dado que está lá.

⚠️ **O `configuracao_horario_id` sai NULO sozinho** — a tela não tem esse campo, e é justamente por
isso que o regime passa a vencer o catálogo. Não há nada a desmarcar.

⚠️ **A data (`vigente_de`) é um PISO, não uma escolha:** o banco recusa data anterior ou igual ao
último lançamento do curso. Escolha qualquer data **a partir** dela — e, se possível, **antes** da
virada da carga, porque depois dela o piso sobe.

| # | Curso | Tipo | Grave assim | O que muda em relação a hoje |
|---|---|---|---|---|
| 1 | **CAHO** | padrão | 8 TA × 45 min · intervalos **5/5** · manhã **07:50** · tarde **13:05** | relógio |
| 2 | **CAHO** | exceção | 9 TA × 45 min · **5/5** · **07:50** · **13:05** | relógio |
| 3 | **C-Ap-HN** | padrão | 8 TA × **45** min · **5/5** · **07:50** · 13:05 | **duração** (era 50) + relógio |
| 4 | **C-Ap-HN** | exceção | 9 TA × 45 min · **5/5** · **07:50** · **13:05** | relógio |
| 5 | **C-Ap-FR** | padrão | 8 TA × **45** min · **5/5** · **07:50** · 13:05 | **duração** (era 50) + relógio |
| 6 | **C-Ap-FR** | exceção | 9 TA × 45 min · **5/5** · **07:50** · **13:05** | relógio |
| 7 | **C-Espc-HN** | padrão | 7 TA × 50 min · **10/5** · **08:10** · **13:05** | relógio |
| 8 | **C-Espc-HN** | exceção | 8 TA × 50 min · **10/5** · **08:10** · 13:05 | relógio |
| 9 | **C-Espc-FR** | padrão | 7 TA × 50 min · **10/5** · **08:10** · **13:05** | relógio |
| 10 | **C-Espc-FR** | exceção | 8 TA × 50 min · **10/5** · **08:10** · 13:05 | relógio |
| — | **C-Esp-ME** | — | ⚠️ **NÃO TOQUE** | aguarda a sua confirmação |
| — | os outros 18 | — | ⚠️ **NÃO TOQUE** | sem planilha medida |

**Passo 0.1** — grave as 10 linhas da tabela, duas por curso.
**Passo 0.2** — ao gravar cada uma, confira na tela que a vigência nova aparece na lista do curso
**sem apagar a anterior** — o histórico é append-only, e nenhuma edição reinterpreta o passado.
**Passo 0.3** — me avise quando terminar. **Eu confiro por leitura** (T076 e T077) que as 10 ficaram
com os valores certos, que **nenhuma linha anterior mudou**, e que uma data **anterior** ao
`vigente_de` continua resolvendo pela vigência **antiga** — a `RN-2027-09` nos dois sentidos.

⚠️ **O que a correção NÃO faz, e é esperado:** as semanas **antes** do `vigente_de` seguem com o
relógio do catálogo (08:00, 10 min). Abrir uma semana de março e ver 08:00 **está certo**.

---

## Parte 1 · Ver a semana  *(PR 1)*

**Como chegar — e é isto que o passo 1.1 prova:** nenhuma tela do sistema se alcança digitando
endereço.

**1.1** — *Turmas* no menu → clique na linha de uma turma → na ficha, clique em **Abrir o DSA**.
→ A grade abre. **A URL não tem `?semana=`**: a semana corrente é o padrão, e valor no padrão não
aparece no endereço (é o que torna o link favoritável).

**1.2** — Confira o **relógio** na coluna da esquerda: cada TA traz o número e a hora de início.
Depois da Parte 0, o 1º TA do C-Ap-HN começa às **07:50**, e há **5** TA antes do almoço.
→ A linha **almoço** aparece entre a manhã e a tarde. Ela é detectada pela troca de período, não por
um horário escrito no código — por isso ela cai em lugares diferentes na G45 e na G50.

**1.3** — Clique em **◀ Semana anterior** e depois em **Semana atual**.
→ A URL ganha `?semana=` e `?ano=`, e o **botão Voltar do navegador** desfaz um passo por vez: a
navegação **empilha** no histórico.

**1.4** — Escolha uma semana com **feriado de dia inteiro**.
→ A coluna do dia sai **bloqueada**, com a **descrição do feriado** escrita no cabeçalho.
→ Um feriado **parcial** ou **informativo** aparece como **aviso** no cabeçalho e **não** bloqueia —
é regra, não esquecimento.

**1.5** — Procure a faixa **Sem posição**, no pé da grade.
→ Os lançamentos migrados da planilha caem ali, **com o motivo escrito** ao lado. ⚠️ **Isto é
esperado e é a massa do histórico**: as 1.566 linhas da carga não têm Tempo de Aula — a planilha da
v2.0 não registrava. O motivo distingue *"não há"* de *"não sei onde pôr"*.

**1.6** — Abra o DSA de uma turma **EAD puro**.
→ A tela diz, em uma frase, que o DSA **não se aplica** a ela, e não desenha grade nenhuma. Turma
**semipresencial** tem DSA — ele cobre a semana presencial.

**1.7** — Abra um curso **sem vigência** que cubra a semana.
→ A grade sai com os TA **numerados, sem horário**, e um aviso com **link** para *Registrar nova
vigência*. ⚠️ Nunca uma tela de erro: é degradação com o conserto a um clique.

**1.8** — Numa semana com lançamento de **sábado**, confira que a **coluna do sábado aparece sozinha**
— mesmo sem você pedir. Depois clique no botão de **sábado** para abrir/fechar à mão.
→ Esconder um sábado gravado porque um parâmetro de tela está em "não" seria esconder um fato; a
planilha vigente do C-Ap-HN tem **oito** sábados lançados.

---

## Parte 2 · Lançar  *(PR 2)*

⚠️ **A meta aqui é o ESFORÇO: duas escolhas por bloco, como na planilha — ou menos.**

**2.1** — Clique numa **célula livre** da grade.
→ O formulário abre dizendo **o dia e o tempo** que você já escolheu com o clique. ⚠️ **Não há campo
de dia nem de tempo inicial**: eles vêm do clique, e pedi-los de novo seria o esforço da planilha
mais um.

**2.2** — Escolha uma **unidade de ensino**.
→ Cada opção traz **a carga lançada, a prevista e o quanto resta**.
→ Ao escolher, o sistema **pré-preenche** o tópico, o instrutor da atribuição (quando houver), a
técnica sugerida e o **local = a sala da turma**. ⚠️ **Todos continuam editáveis**: o valor é
daquele lançamento, e trocá-lo **não** mexe no catálogo. É a correção do defeito que reescrevia todo
DSA passado quando alguém trocava o instrutor de uma UE.

**2.3** — Troque o tópico e grave.
→ O bloco aparece na grade, com `rowSpan` pelos tempos. O formulário **fecha**.

**2.4** — **O caso que importa:** lance de novo, agora escolhendo **um instrutor sem habilitação**
naquela disciplina.
→ A recusa **nomeia a disciplina que falta** e diz onde resolver (*ficha do instrutor*). ⚠️ **Nada é
gravado** — o banco não recusa isso, a tela é a única defesa.

**2.5** — Lance **4 tempos a partir do 8º TA** (passando dos tempos do regime).
→ O lançamento **acontece** e o formulário **fica aberto com o aviso**. ⚠️ Teto normativo é
**alerta, nunca bloqueio**; o único bloqueio do épico é o TFM acima de 6 TA na semana.

**2.6** — Lance **7 TA de TFM** na mesma semana.
→ Aí sim, **recusa**, com a frase do teto. É a única.

**2.7** — Clique em **Lançar o Estudo Individual da semana**.
→ Ele entra em **cada dia útil**, no tempo seguinte ao último lançado. Clique **de novo**: a tela diz
quantos dias foram **pulados** por já terem. ⚠️ Dia de feriado de dia inteiro **não** recebe.

**2.8** — Lance uma **avaliação** e, nela, um **fiscal de fora do cadastro** (texto livre).
→ Aceito: quem fiscaliza pode ser de fora. Depois lance uma **atividade não letiva** (AEC, TAD, TR)
escolhendo a **categoria** e o **subtipo** da lista — ⚠️ **nenhuma sigla de duas letras é digitada**,
e é isso que elimina o `FR` que significa *feriado* numa planilha e *farol* em outra.

**2.9** — Num curso **por competências** (C-Espc-HN ou C-Espc-FR), clique numa célula livre.
→ Aparece o modo **Aula sem unidade**, com a disciplina em lista e o **tópico obrigatório**.
⚠️ Em curso com UE, esse modo **não aparece** — a isenção vale só onde o banco permite.

---

## Parte 3 · Imprimir  *(PR 3)*

**3.1** — Na grade, confira o bloco **Imprimir**: ao lado do botão há os **avisos de dado faltante**
— número do DSA, efetivo da turma, relógio, assinaturas. ⚠️ **Eles ficam na tela e NÃO vão para o
papel**: a planilha imprimia *"VERIFICAR Nº DE TA"* em 10 das 15, e é isso que não se repete.

**3.2** — Clique em **Imprimir**.
→ Abre `/print/dsa?turma=…&semana=…&ano=…`: **só o documento** — sem menu, sem lateral, sem a faixa
de ambiente. ⚠️ A caixa de impressão **não** abre sozinha: você confere o papel antes.

**3.3** — Confira o **cabeçalho**: `CIAARA` · o nome do Centro · a sigla do curso ·
`DETALHE SEMANAL DE AULAS Nº <n>` · `SEMANA DE DD/MM/AAAA A DD/MM/AAAA`.
⚠️ Se a turma não tiver data de início, o número sai **`Nº —`**, e a grade avisou antes.

**3.4** — Confira as **oito colunas**: DIA · HORÁRIO · DISCIPLINA · TA · UNIDADES DE ENSINO E
TÓPICOS · **LOCAL** · T/E · INSTRUTOR/PROFESSOR. O **DIA** aparece **uma vez** por dia.

**3.5** — **O caso que importa:** ache um bloco que **atravessa o almoço**.
→ O HORÁRIO sai em **duas linhas** (`09:30 às 11:55` e `13:05 às 14:40`). ⚠️ A planilha imprimia
*"09:30 as 13:50"* — um horário contínuo que inclui o almoço — **64 vezes no CAHO e 50 no
C-Espc-FR**.

**3.6** — Confira a última linha de cada dia: **ESTUDO INDIVIDUAL**, T/E **EI**, **sem instrutor**.
→ Num dia de feriado de dia inteiro, o dia sai como **uma linha** com a descrição, e **sem** EI.

**3.7** — Confira o **rodapé**: `Gerado em`, a nota *"É FACULTADO AO ALUNO…"*, `<n> ALUNOS`, a
**tabela de CH só das disciplinas daquela semana**, a **legenda de T/E só das siglas usadas**, e a
linha **`OBSERVAÇÕES:`** em branco.
⚠️ **A linha de observações é decisão sua (`H8`, opção a):** nenhum PDF medido a tem, e o requisito
a exige literalmente — ela sai **vazia, para escrever à mão**.
⚠️ **A T/E imprime a SIGLA quando a lista tem uma, e o NOME POR EXTENSO quando não tem.** Hoje **9
das 22** metodologias têm sigla; as outras saem por extenso, de propósito — inventar sigla é pior,
porque a mesma sigla muda de sentido entre planilhas.

**3.8** — Confira as **duas assinaturas**: à esquerda o elaborador, à direita o Encarregado da
Divisão, com **nome, posto e função**.
⚠️ **Quem assina à esquerda é QUEM IMPRIME** — é o que a configuração do banco já diz, e é o
**contrário** do hábito da planilha, onde o Auxiliar é fixo por curso. Mudar isso é `UPDATE` em
`responsaveis_curso`, **nunca** código: se você quiser o Auxiliar fixo por curso, me diga e eu abro
uma linha por curso.
⚠️ **Reimprimir uma semana ANTIGA traz quem assinava NAQUELA data** — não quem assina hoje. E se
naquela data não havia responsável cadastrado, a linha sai **em branco, para assinar à mão**.

**3.9** — Mande imprimir (ou *Salvar como PDF*) em **A4 paisagem**.
→ **Uma página**, para a semana cheia. Se sair em duas, **pare e me diga a turma e a semana**: o
teste mede exatamente isto, e um caso real que estoure é informação que eu não tenho.

**3.10** — **A jornada inteira, de uma vez:** ficha da turma → *Abrir o DSA* → lance um bloco → veja
na grade → **Imprimir** → o bloco que você acabou de lançar **está no papel**.

---

## Parte 4 · Mover, editar, excluir · conflitos  *(PR 4)*

**4.1** — Clique num **lançamento** da grade (não numa célula livre).
→ Abre o painel de ações, com **Mover para…**, **Editar** e **Excluir**.

**4.2** — **Pelo TECLADO, sem mouse:** clique uma vez fora da grade, use `Tab` até entrar nela, ande
com as **setas** até um lançamento e aperte **Enter**.
→ O mesmo painel abre. ⚠️ **O teclado é o caminho primário**, não um consolo: arrastar é o
secundário.

**4.3** — Em **Mover para…**, troque o **dia** e/ou o **tempo** e confirme.
→ O bloco muda de lugar. ⚠️ **É o mesmo registro** — não é excluir e recriar: quem criou e quando
continuam gravados, e só *quem editou e quando* é carimbado.

**4.4** — **Arraste** um bloco para outra célula.
→ Mesmo resultado, e a resposta aparece **acima da grade** (não dentro da célula, que sai do lugar).

**4.5** — Mova um lançamento **da faixa "Sem posição"**: clique no item da faixa → *Posicionar* →
escolha o tempo.
→ Ele entra na grade. ⚠️ É **o mesmo mover**, com o nome do que você está fazendo.

**4.6** — **O caso que importa:** tente mover uma **aula migrada que não tem unidade de ensino**.
→ A tela **pede a unidade no mesmo ato**, com a frase da decisão **UE-1**. Sem ela, **nada é
gravado**. Escolha a unidade e mova: funciona. ⚠️ A unidade pode faltar em linha migrada **nunca
editada**; mexer nela reativa a exigência — é uma catraca, por desenho.

**4.7** — Em **Editar**, troque o **local** e o **tópico** de um bloco.
→ Muda **só naquele lançamento**. ⚠️ Confira que o **catálogo não mudou**: a unidade de ensino
continua com o tópico dela.

**4.8** — Em **Editar**, tente trocar por um **instrutor sem habilitação**.
→ Recusado, com a mesma frase do lançamento. ⚠️ Sem isso haveria uma porta lateral: lançar com quem
é habilitado e trocar depois.

**4.9** — **Excluir**: clique em *Excluir* e **leia o diálogo**.
→ Ele diz **o que acontece**: o lançamento sai da grade e do papel e deixa de contar na carga, **e
não é apagado do banco** — fica inativo e pode voltar. Confirme: o bloco desaparece da grade.
⚠️ **Nada neste sistema é apagado.** Se o diálogo prometer apagar para sempre, é defeito **do
texto** e eu quero saber.

**4.10** — **O conflito:** ache um bloco cujo **instrutor** esteja em **outra turma** no mesmo dia e
tempo.
→ A célula é **tingida** e traz a palavra **conflito de instrutor**. Se a **sala** também coincidir,
vem **mesma sala em outra turma** — são coisas diferentes: pessoa é conflito, sala é alerta.
⚠️ **Você não vê de QUAL turma é o conflito, e isso é por desenho:** o sistema diz **que** há
sobreposição sem mostrar o DSA de um curso que o seu perfil não alcança.
⚠️ **O conflito NÃO impede gravar.** Ele é sinalização; o único bloqueio é o TFM.

---

## Parte 5 · Situação e carga horária  *(PR 5)*

**5.1** — Ao lado da grade (ou abaixo dela, em tela estreita) confira o painel **Situação por
disciplina**, com a frase *"Carga horária acumulada até a semana de …"*.

**5.2** — **O caso que importa:** abra uma semana **anterior** aos lançamentos de uma disciplina e
depois uma **posterior**.
→ Na primeira ela está **Aguardando início**, com acumulada **0**; na segunda, já acumulou.
⚠️ **O acumulado é até a semana que você abriu**, não até hoje — é o que preserva o número de um DSA
reimpresso.

**5.3** — Confira as **quatro situações**: *Aguardando início* · *Em andamento* · *Concluída* ·
*Conflitou*.
⚠️ **Conflitou VENCE Concluída**: esconder conflito atrás de "Concluída" é o pior dos dois erros.
⚠️ **Nos dois cursos por competências a CH prevista é zero**, então a coluna sai com **—** em vez de
`0 %` — ausência de denominador não é 0 %.

**5.4** — Confira o quadro **Por unidade de ensino**: lançada, prevista e **resta**, por UE.
→ É o acompanhamento no **grão de UE** que a planilha fazia na aba BD DISCIPLINAS.

**5.5** — Abra uma semana **futura** em que já haja lançamento.
→ No painel, a disciplina traz **`<n> TA lançado(s) à frente`**; na grade, o bloco traz **lançado à
frente**; e no **papel**, o rodapé diz quantos TA *"ainda não chegaram"*.
⚠️ **Eles CONTAM na carga, e é decisão sua (`Q-2`):** o DSA é emitido **antes** da semana — em
05/10/2026 todas as planilhas ativas já estavam preenchidas até 09 ou 10/10 —, e cortar por hoje
faria o número da ficha da turma **mudar sozinho**, da noite para o dia.

**5.6** — Abra a **ficha da turma** e o **/inicio**.
→ A **CH executada** da ficha e as **turmas em atraso** do Início continuam com **os mesmos valores
de antes** deste épico. ⚠️ Nenhum arquivo que calcula esses dois números foi tocado, e não há
migration nesta fatia — mas o número na tela é o que vale, e é por isso que o passo existe.

---

## O que **não** está neste épico — e é esperado não achar

| Não tem | Por quê |
|---|---|
| **`ALT <n>`** no rodapé | a numeração da alteração é **PR 6** (`Q-3`): o registro da emissão virá como fato, só de acréscimo |
| **DSA de reposição** | **PR 6** (`Q-5`) — ele tem outro layout e outro par de assinaturas |
| Nota, aprovação, documento escolar | **não é da CIAARA-11** (`RNF-NORM-06`) |
| Prévia automática da semana | **Épico 12** — esta spec só garantiu que o lançamento é um dado que uma função consegue produzir |
| Painel planejado × real e prazo de vista | **Épico 8** |

---

## Como reportar

Cinco linhas, por achado:

1. **Passo** (ex.: 4.6)
2. **Turma e semana** (ex.: C-Ap-HN 2026, semana 42)
3. **O que apareceu**
4. **O que você esperava**
5. **Captura de tela**, se der

⚠️ **O que mais ajuda é a ordem 3 → 4.** *"Não funcionou"* me faz adivinhar; *"apareceu X e eu
esperava Y"* me dá o caso.
