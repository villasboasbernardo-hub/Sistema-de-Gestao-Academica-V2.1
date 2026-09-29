# Roteiro de conferência — PR 3 da fatia (b): as telas de disciplinas

> **Para Bernardo Villas Boas.** Duas partes, e elas não se misturam:
> **LOCAL** é onde se pode gravar e apagar à vontade — a base é descartável por definição.
> **PREVIEW** é dado real, e ali o roteiro é **só olhar**, com duas exceções nomeadas que são
> correções que você já decidiu fazer.
>
> ⚠️ **NADA DESTE PR TOCA O BANCO REMOTO.** Ele **não tem migration**: tudo o que a tela usa —
> as sete RPCs, os gatilhos do rateio, as sequências, a tabela `turma_disciplina_unidade` — já foi
> aplicado nos PRs 1 e 2 e já está lá. Por isso não há backup a fazer nem `db push` a rodar.

---

## Antes de começar

```
pnpm db:reset          # base limpa, e recria a sua conta local
python -m scripts.etl.executar    # carrega os 5.394 registros + as 587 UEs
pnpm dev:local         # a tela na porta 3000 — a suíte vive na 3100 e não atrapalha
```

Entre com a conta que o ETL imprime no fim. ⚠️ **Confira na 3000**, não na 3100: a suíte de ponta a
ponta derruba e sobe o servidor dela, e as duas portas existem para não disputarem (gotcha 7).

---

# PARTE 1 — LOCAL (pode gravar, pode apagar)

## A. Chegar na tela

| # | Passo | Resultado esperado |
|---|---|---|
| A.1 | Menu → **Disciplinas** | A entrada **não** está mais marcada *"em breve"*. A tela abre pedindo um curso |
| A.2 | Escolher o curso **CAHO** | A lista traz as disciplinas do CAHO. Aparece o aviso de que *instrutores, período e execução são por turma* |
| A.3 | Escolher a turma **CAHO 2026** | A lista passa a ter as colunas **Período previsto**, **Instrutores** e **Situação** |
| A.4 | Voltar a `/cursos` → abrir **CAHO** → aba **Grade** → botão **Disciplinas** | Chega na mesma tela **já com curso e turma preenchidos** |
| A.5 | Abrir uma turma em `/turmas/…` → link **Ver as disciplinas desta turma** | Idem. ⚠️ São **três** caminhos clicáveis, e nenhum exige digitar endereço |

## B. Cadastro: criar, editar, desativar, reativar, excluir

| # | Passo | Resultado esperado |
|---|---|---|
| B.1 | Clicar numa linha da tabela | A linha **expande** e mostra Cadastro, Período, Instrutores e (se houver) Unidades |
| B.2 | **Editar disciplina** → mudar o nome → *Salvar disciplina* | *"Disciplina atualizada."* e o nome muda na linha |
| B.3 | Trocar a **carga horária** e salvar | O rateio dos instrutores recalcula. ⚠️ A CH prevista de cada um **sai impressa na LIQ** |
| B.4 | Tirar a turma (voltar ao catálogo) → **Editar disciplina** → dar a uma disciplina o **mesmo código** de outra ativa do mesmo curso | **Recusado**, com *"Já existe uma disciplina ativa com este código neste curso — escolha outro."* |
| B.5 | **Desativar** a segunda disciplina → repetir B.4 com o código dela | **Aceito.** Desativar **libera** o código (`Q-04`) |
| B.6 | **Reativar** a que você desativou | **Recusado**, pelo mesmo motivo — o código está tomado. A frase diz isso |
| B.7 | Desativar uma disciplina que **está em turma** | Abre **diálogo** dizendo em quantas turmas ela está e que nada é apagado |
| B.8 | Desativar uma disciplina **sem turma nenhuma** | **Não** abre diálogo — é desfazível e barato (decisão A-9) |
| B.9 | Numa disciplina real, clicar **Excluir**, digitar o código e confirmar | **Recusado**, nomeando o impedimento — *"tem linha de turma"* — e mandando **desativar** |
| B.10 | Digitar o código **errado** no diálogo | O botão *Excluir permanentemente* fica **desabilitado**. Só o código exato libera |
| B.11 | Criar uma disciplina de amostra (sem turma), depois excluí-la | **Some.** ⚠️ Medido em 24/09/2026: das **175** disciplinas reais, **zero** são excluíveis |
| B.12 | Conferir o rastro: `select * from exclusoes_registradas order by criado_em desc limit 3;` | A exclusão de B.11 está lá, com **quem, o quê e quando** |

## C. Período previsto — o caso crítico

| # | Passo | Resultado esperado |
|---|---|---|
| C.1 | Curso com **duas turmas**; escolher a **T2**; abrir uma disciplina; pôr início e término; *Gravar período* | *"Período gravado nesta turma."* |
| C.2 | Trocar para a **T1**, mesma disciplina | ⚠️ **O período da T1 continua como estava.** É o critério 4 do Épico 5, e o modo de falha dele é mudo |
| C.3 | Na T1, pôr um período **fora da janela da turma** (ex.: janeiro, numa turma de março a junho) | **Recusado pelo banco**, e a frase traz **as datas da janela** — sem elas você tentaria de novo às cegas |
| C.4 | Apagar as duas datas e gravar | Volta a *"não informado"*. ⚠️ É estado **válido**: a base copiada tem **121** linhas assim |

## D. Os cinco casos do rateio

> ⚠️ Antes: a soma que aparece na tela é **antecipação**, calculada pela mesma função que a view usa.
> Quem **garante** é o banco, por gatilho adiado. Se um dia os dois discordarem, quem está errada é a
> tela — e há um teste que amarra os dois (`rateio-da-view.test.ts`).

| # | Caso | Passo | Resultado esperado |
|---|---|---|---|
| D.1 | **Um instrutor** | Numa disciplina de 12 tempos, acrescentar **um** instrutor | **12 tempos.** A frase diz *"recebe a carga horária integral"* |
| D.2 | **Divisão igual** | Numa disciplina de **10** tempos, acrescentar **três** | **4 / 3 / 3**, nessa ordem — o resto vai **ao mais antigo**. ⚠️ A v2.0 dava 3/3/4; a regra mudou por decisão sua (A-1) |
| D.3 | **Divisão igual, resto 2** | Mudar a CH para **11** | **4 / 4 / 3** |
| D.4 | **Por TA digitados** | Marcar *Informar os tempos de cada um*; pôr 7 e 2 numa disciplina de 10 | **Recusa na hora**: *"As parcelas somam 9 tempos e a disciplina tem 10."* ⚠️ **É a soma errada sendo recusada** |
| D.5 | idem | Corrigir para 7 e 3 | A recusa **some**. *Gravar instrutores* funciona |
| D.6 | idem | Apagar o campo de **um** dos dois e gravar | **Recusado**: *"Informe a parcela de TODOS os instrutores, ou de nenhum."* Deixar parte em branco **não** divide o resto |
| D.7 | **Simultâneo** | No cadastro, pôr o modo **Simultâneo**; voltar ao painel | **Cada** instrutor recebe a CH **integral**. ⚠️ A soma fica **maior** que a CH, e isso está **certo** (`RN-MAT-05`) |
| D.8 | **Por UE** | Numa disciplina **com** unidades, marcar *Dividir pelas unidades de ensino* | Aparece uma linha por unidade, com um seletor de instrutor em cada |
| D.9 | idem | Deixar uma unidade **sem** instrutor | **Recusado**: *"Faltam unidades de ensino sem instrutor: 1 de 2 atribuídas."* |
| D.10 | idem | Atribuir todas | A CH de cada um passa a ser **a soma das unidades dele** |
| D.11 | **O modo não oferecido** | Abrir uma disciplina **sem** unidade | A opção *Dividir pelas unidades* **não aparece** (`FR-041.5`) |
| D.12 | **Sem habilitado** | Abrir uma das **55** disciplinas sem instrutor habilitado | Em vez de um seletor mudo, o **caminho clicável** para a lista de instrutores |

## E. Unidades de ensino

| # | Passo | Resultado esperado |
|---|---|---|
| E.1 | Abrir uma disciplina do **CAHO** | A seção **Unidades de ensino** lista as do currículo, com a soma |
| E.2 | Abrir uma disciplina do **C-Espc-FR** | ⚠️ **Nenhuma menção a unidade** — nem a seção, nem aviso de que faltam. Ter UE é **dado**, e a ausência não é pendência (D-B3) |
| E.3 | No CAHO, acrescentar uma unidade que **desequilibra** a soma | **Grava**, e aparece o **aviso**: *"as N unidades somam X e a disciplina tem Y"*. ⚠️ Avisa, **não** bloqueia |
| E.4 | **Desativar** uma unidade | Ela **continua na lista**, marcada *inativa*, e **sai da soma**. Some da atribuição por unidade |
| E.5 | **Excluir** uma unidade sem aula lançada, com o código | Some, e o rastro fica em `exclusoes_registradas` |

## F. Filtros, indicadores e gráfico

| # | Passo | Resultado esperado |
|---|---|---|
| F.1 | Ver os indicadores do topo | Disciplinas, CH prevista, Sem instrutor e CH cumprida |
| F.2 | Abrir **Filtros** → buscar por parte de um código | ⚠️ **Tabela, indicadores e gráfico mudam juntos** — os três saem das **mesmas** linhas |
| F.3 | Filtrar por **instrutor** | Só as disciplinas em que ele está |
| F.4 | Filtrar por **Situação na turma** = *Atrasada* | Só as que passaram do término **e** ainda têm saldo. ⚠️ Disciplina **concluída** fora do prazo **não** é atrasada |
| F.5 | Clicar **Limpar filtros** | A lista volta inteira, e **curso e turma ficam** — eles são navegação, não filtro (`FR-054`) |
| F.6 | Copiar o endereço da barra e abrir numa **janela nova** | A **mesma** tela, com a mesma linha expandida |

---

# PARTE 2 — PREVIEW (dado real: **só olhar**, com duas exceções)

> ⚠️ **NÃO grave nada no preview além das duas correções abaixo.** O remoto é a fonte da verdade dos
> cadastros desde 24/09/2026, e o que você editar ali é o que vale.

## G. A cascata, só olhando

| # | Passo | Resultado esperado |
|---|---|---|
| G.1 | Menu → **Disciplinas** → **CAHO** → **CAHO 2026** | **22** linhas de grade. Cada uma com período (ou *não informado*), instrutores e situação |
| G.2 | Trocar para **C-Ap-HN 2026** | **19** linhas. A lista muda inteira — nada do curso anterior fica |
| G.3 | Expandir uma disciplina do CAHO | As **unidades do currículo** aparecem, com a soma contra a CH |
| G.4 | Expandir uma do **C-Espc-FR** | Nenhuma menção a unidade |
| G.5 | Olhar quantas disciplinas estão **sem instrutor** no indicador | É o número que interessa ao planejamento do ano |

## H. As correções que você vai fazer de propósito

> Estas são gravações **intencionais**, no dado real, e é para isso que a tela existe. ⚠️ Cada uma
> carimba `editado_por` e `editado_em` — a auditoria do **P-1**.

### H.1 — As quatro CH divergentes

A conferência do PR 2 achou quatro disciplinas em que a **CH do cadastro** e a **soma das UEs do
currículo da DEnsM** não fecham. O currículo é o documento normativo; o cadastro veio da planilha.

| Curso | Disciplina | CH no cadastro | Soma das UEs | O que fazer |
|---|---|---|---|---|
| `C-Ap-FR` | **III** | 76 | 75 | Corrigir o cadastro para **75** |
| `C-Exp-MetocOf` | **I** | *(ver na tela)* | *(ver na tela)* | Corrigir para a soma das UEs |
| `C-Exp-MetocOf` | **V** | *(ver na tela)* | *(ver na tela)* | Corrigir para a soma das UEs |
| `EST-QF-APOC` | **I** | *(ver na tela)* | *(ver na tela)* | Corrigir para a soma das UEs |

**Como:** abrir a disciplina → *Editar disciplina* → trocar a carga horária → *Salvar*.
⚠️ **Se ela tiver instrutor atribuído, um diálogo avisa quantos têm a CH recalculada** — e a CH do
instrutor sai impressa na LIQ e na ficha de docentes.

**Depois de corrigir**, o aviso da soma das unidades **some** naquela disciplina. É a conferência de
que deu certo.

**E confira o carimbo**, para o P-1 ficar provado:

```sql
select cod_disciplina, carga_horaria_tempos, editado_por, editado_em
  from disciplinas
 where editado_em is not null
 order by editado_em desc limit 5;
```

### H.2 — As duas linhas do `C-Esp-ALH`, lado a lado

O currículo do `C-Esp-ALH` tem **duas** disciplinas cujo desdobramento ficou ambíguo na extração.
A tela as mostra uma ao lado da outra para você decidir **qual vale**.

| # | Passo | Resultado esperado |
|---|---|---|
| H.2.1 | Escolher `C-Esp-ALH`, **sem turma** (catálogo) | As duas linhas aparecem, com código, nome, CH e número de UEs |
| H.2.2 | Expandir as duas | As unidades de cada uma, com a soma contra a CH |
| H.2.3 | **Decidir** qual é a correta | A outra: *Desativar* — **nunca excluir**. Ela tem UE, e a UE é impedimento |
| H.2.4 | Conferir | A desativada **continua na lista**, marcada *Fora de oferta*, e sai da escolha de atribuição nova |

⚠️ **Lembrete do achado do PR 2:** há **3 UEs ativas** sob a disciplina **inativa**
`96 - C-Esp-ALH - ALH-II` — a única disciplina inativa da base. Elas continuam ali de propósito
(regra 4: nada é apagado). Se a decisão de H.2.3 mudar qual das duas vale, é dessas três que se
trata.

---

## O que **não** está neste PR, e por quê

| O quê | Por quê |
|---|---|
| Migration nova | Não há. Tudo o que a tela usa entrou nos PRs 1 e 2, e já está no remoto |
| Tela de **avaliações** e de **relatório** da disciplina | Fora do escopo desta fatia (`FR-008`, decisão A-4) |
| Estender a exclusão a **cursos, turmas e salas** | Pendência **`PEND-5b-1`**, não escopo |
| Lançamento de aula por unidade | Épico 9 |

---

*Roteiro escrito em 29/09/2026, sobre o ramo `feat/EPICO-5b-telas-de-disciplinas`.*
