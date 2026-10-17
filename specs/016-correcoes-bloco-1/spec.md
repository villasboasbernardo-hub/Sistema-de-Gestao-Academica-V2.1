# Feature Specification: Correções do Bloco 1 — tela e defeitos dos testes de 16/10/2026

**Feature Branch**: `fix/BLOCO-1-correcoes-de-tela`

**Created**: 17/10/2026

**Status**: Draft — specify em 17/10/2026 · **clarify em 17/10/2026**: as 17 perguntas do lote (§12)
respondidas por Bernardo Villas Boas — as de escolha, todas pela recomendação; a Q-8 com o fato (tela do
DSA, antes de 08/10). As 4 perguntas novas da §13 respondidas em 17/10/2026, antes do plan, todas pela
recomendação · plan em 17/10/2026 (`plan.md`), **aprovado** no mesmo dia, com o desenho das migrations
(regra 9.4) · tasks em 17/10/2026 (`tasks.md`)

**Input**: Bloco 1 de `docs/correcoes/plano-de-correcoes-em-blocos.md` *(decisões D-COR-1 a D-COR-5 de
Bernardo Villas Boas, 16/10/2026)* — itens 1.1 a 1.15, correções de tela e defeitos anotados nos testes
de 16/10/2026. Esta spec cobre **só o Bloco 1**.

> **Leia antes desta página:** `docs/correcoes/plano-de-correcoes-em-blocos.md` (as decisões, a lista
> *"Já está feito"* e o Bloco 1 com arquivo e linha medidos).

> ⚠️ **ONDE CADA NÚMERO DESTA SPEC FOI MEDIDO** (regra 9.2):
> - **Código:** ramo `fix/BLOCO-1-correcoes-de-tela` em `be732b3` — a `main` `b8f7100` mais o commit do
>   plano.
> - **Dado:** banco **local** restaurado da cópia **`remoto-20261017-005738.sql`** (17/10/2026, 00:57),
>   tirada por `python -m scripts.manutencao.dado_do_remoto`. O remoto foi **só lido**.
> - **Tela:** `pnpm dev:local` sobre essa cópia, capturada por Playwright em 17/10/2026, entre 01:00 e
>   01:15, como Admin, tema claro, 1440 × 1000.
> - Onde um número vem de outro artefato, ele é nomeado ali.

> ⚠️ **DADO PESSOAL:** o plano citava pelo nome o instrutor do item 1.13. O repositório é público, então
> ele é nomeado aqui **pelo código, 15** — e o commit do plano foi corrigido **antes** de subir.

---

## 1. O problema, em uma frase

**Os testes de 16/10/2026 acharam quinze pontos em que a tela engana, esconde ou dificulta.** Onze são
de tela, um é de leitura (1.12), um é de dado derivado numa view (1.13), e dois mudam regra por decisão
de Bernardo: o número da semana do DSA (D-COR-1) e o saldo de capacidade (D-COR-2).

## 2. Paridade ou novidade (Princípio X)

O Princípio X barra **funcionalidade nova de negócio** enquanto não houver paridade. Nenhum item deste
bloco cria processo, cadastro ou documento novo. Eles se dividem assim:

| Natureza | Itens | Por que entra |
|---|---|---|
| **Defeito** | 1.12, 1.13, 1.15, e a contagem errada do 1.4 — e o 1.11, **sem objeto** (Q-8), que deixa só um caso de regressão | Correção de defeito reportado (linha 3 da tabela do Princípio X) |
| **Regra mudada por decisão nominal** | 1.9 (D-COR-1), 1.14 (D-COR-2) | Decisões de Bernardo de 16/10/2026, com as regras que elas alcançam listadas na §10 |
| **Ajuste de interface, sem regra de negócio** | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.10 | Não são funcionalidade de negócio; o plano de 16/10/2026 é o pedido nominal |

## 3. O que é banco e o que é só tela

| Item | Banco? | Detalhe |
|---|---|---|
| 1.1 a 1.8, 1.10, 1.12, 1.15 | **Não** | Tela, Server Action e `lib/dominio/` |
| 1.11 | **Não** | **Sem objeto** (Q-8); fica só o caso de regressão |
| 1.9 | **Não** | `cursos.duracao_semanas`, `turmas.data_inicio` e `turmas.data_termino` já existem; a conta nasce em `lib/dominio/` |
| **1.14** | **Sim — PORTÃO 9.4** | A executada "até hoje" não sai das views atuais sem reimplementar a soma da CHD fora do banco (ver FR-014). Alcança a executada **da turma e por disciplina** (Q-5). A migration está **autorizada em princípio** (D-COR-2); **o desenho vai a Bernardo antes do remoto** |
| **1.13** | **Sim — PORTÃO 9.4, autorizado** | O defeito está em `vw_instrutor_carga_prevista`. É a **segunda** exceção de banco do bloco, **autorizada** por Bernardo em 17/10/2026 (Q-7); o desenho vai a ele antes do remoto |

Nenhum item cria **tabela**. Nenhum acrescenta `for delete`.

---

## Clarifications

### Session 2026-10-17

*(Respostas de Bernardo Villas Boas ao lote da §12, em 17/10/2026. As perguntas novas que elas
levantaram estão na §13.)*

- Q: Qual é o T de "Semana N de T" quando a duração do curso é menor que a turma? → A: **Opção C.** T = `cursos.duracao_semanas`; se a turma for mais longa, T = as semanas corridas da turma, e a ficha da turma mostra o aviso de cadastro *"a turma tem N semanas e o curso, M"*. Sem duração no curso, T = as semanas da turma. **Nunca imprimir N > T** (Q-1).
- Q: O que acontece com o "Nº" e com a semana ISO? → A: **Opção A.** "Semana N de T" substitui "Nº" e "Semana 41/2026" no cabeçalho e no rodapé; a semana ISO fica só na URL; a navegação mostra "Semana N de T" e as datas (Q-2).
- Q: Na semipresencial, a contagem começa no início da turma ou da etapa presencial? → A: **Opção A**, no início da **turma** (Q-3).
- Q: A planilha de contingência acompanha? → A: **Acompanha**; a planilha usa a mesma numeração (Q-4).
- Q: Até onde vai o "até hoje" da D-COR-2? → A: **Opção B.** O andamento **e** a tabela de disciplinas da ficha cortam em hoje; a situação do DSA continua acumulada até a semana mostrada, e o `FR-028.1` da spec 013 fica preservado (Q-5).
- Q: A lista `/turmas` ganha o saldo? → A: **Opção A.** Ganha as colunas Progresso e Saldo (TA), pela mesma função (Q-6).
- Q: Corrigir a view da CH prevista neste bloco, e por qual data? → A: **Opção A, neste bloco, pelo portão 9.4** (desenho antes do remoto). Ordem: período da linha da turma → período da disciplina → janela da turma. Mais a frase na ficha para quem é só habilitado. É a **segunda exceção de banco do bloco, autorizada** (Q-7).
- Q: Onde foi visto "7 TA aparecem como 6"? → A: Na **tela do DSA**, durante o preenchimento, **antes das correções de 08/10** (PR #40). Sem reprodução: o item 1.11 fica **sem objeto**, e o caso de regressão — bloco que atravessa o almoço e dia com 7 TA — entra assim mesmo (Q-8).
- Q: As datas sem ano do papel e da planilha também mudam? → A: **Opção A**: mudam (Q-9).
- Q: A ordem das abas do curso e a cor do Desativar? → A: **Opção A**: *Sobre o Curso* primeira e padrão; Desativar mantém a cor destrutiva (Q-10).
- Q: Como fazer a pizza com mais de 5 disciplinas? → A: **Opção A**: as 4 maiores e "Outras (N)" (Q-11).
- Q: O cartão novo do DSA vale para o papel e a planilha? → A: **Opção A**: só a tela (Q-12).
- Q: Onde ficam Desativar e Excluir na ficha do instrutor? → A: **Opção A**: barra no topo, Editar · Desativar/Reativar · Excluir; as avaliações do currículo da disciplina também em leitura (Q-13).
- Q: Como a situação da turma fica à mão? → A: **Opção A**: botão "Trocar situação" ao lado do selo, com diálogo e Server Action próprios (Q-14).
- Q: A faixa Beta substitui a faixa de ambiente? → A: **Opção A**: uma faixa só, que acrescenta o ambiente em local e preview (Q-15).
- Q: Que tokens destacam o item ativo da lateral? → A: **Opção A**: fundo `marca`, texto `marca-contraste` (Q-16).
- Q: O filtro abre sozinho quando a URL já traz filtro? → A: **Opção A**: sempre recolhido; o número no botão avisa (Q-17).
- Q: E as divergências 2 e 14 da §11? → A: **Só registrar**; não são deste bloco. **A faixa Beta aparece em Production independentemente do valor de `NEXT_PUBLIC_AMBIENTE`**.

*(Respostas de Bernardo Villas Boas às perguntas novas da §13, em 17/10/2026, antes do plan.)*

- Q: A execução "até hoje" vale também em `/disciplinas` e na aba Avaliações da turma? → A: **Sim.** Fora do DSA e da planilha, executado é "até hoje" em **toda** tela — ficha, `/disciplinas`, aba Avaliações da turma, `/inicio`, `/turmas`. O DSA e a planilha continuam acumulados até a semana (NQ-1).
- Q: O campo Situação continua no formulário "Editar turma"? → A: **Não.** Na edição da turma, só o botão "Trocar situação"; o campo Situação fica **só na criação** (NQ-2).
- Q: Quando o ambiente não está declarado, a faixa mostra só o texto Beta? → A: **Sim.** A faixa mostra só o texto Beta; o ambiente entra no texto **apenas** com `local` ou `preview` declarados (NQ-3).
- Q: A frase de "só habilitado" é por instrutor ou por disciplina? → A: **Por disciplina**: a marca *"só habilitado — não gera CH prevista"* em cada habilitação sem atribuição no ano (NQ-4).

---

## 4. User Scenarios & Testing *(mandatory)*

### User Story 1 — Ver o andamento real da turma e trocar a situação dela (Priority: **P1**)

Quem acompanha a turma (Encarregado, ajudantes, Admin) abre o `/inicio` ou a ficha da turma e vê a CH
executada **até hoje** e um saldo de capacidade que não conta como feito o que foi lançado à frente. Na
mesma ficha, troca a situação da turma (planejada, ativa, concluída, cancelada) sem procurar o campo.

**Why this priority**: o saldo decide qual turma o `/inicio` acusa de atraso, e a situação decide o que
cada lista mostra. São os dois números que a operação usa para agir.

**Independent Test**: numa turma ativa com lançamento datado depois de hoje, a CH executada e o saldo
mudam ao mudar "hoje"; e a troca de situação pela ficha persiste depois de recarregar.

**Acceptance Scenarios**:

1. **Given** a C-Ap-HN 2026 com 1.008 TA de CHD lançados, 50 deles com data depois de 17/10/2026
   (medido), **When** alguém abre a ficha em 17/10/2026, **Then** a CH executada mostra **958 TA**, o
   restante e o saldo partem desse número, e os dias úteis contam a partir de **18/10/2026**.
2. **Given** um Admin **ou** um Encarregado na ficha de uma turma, **When** troca a situação e grava,
   **Then** vê a confirmação na tela, o selo do cabeçalho muda, e a nova situação continua lá depois de
   recarregar a página.

---

### User Story 2 — DSA: a semana do curso, a sugestão e o cartão (Priority: **P1**)

O operador abre o DSA da semana e lê **"Semana N de T"** contada desde o início da turma, com ou sem
aula. Ao lançar, o instrutor vem sugerido pela atribuição da UE ou, sem ela, pela da disciplina na
turma. O cartão mostra o **nome** da disciplina primeiro.

**Why this priority**: o DSA é usado todo dia e o número sai no papel assinado. A numeração antiga
deixou alguns cursos com o número errado.

**Independent Test**: na C-Ap-FR 2026, a semana de 12/10/2026 mostra "Semana 28 de 37" na tela e no
papel, e não "Nº 26"; ao lançar numa disciplina com instrutor atribuído na turma, o campo do instrutor
já vem preenchido.

**Acceptance Scenarios**:

1. **Given** a C-Ap-FR 2026 (início 06/04/2026, término 15/12/2026, 37 semanas corridas; o curso declara
   35; duas semanas passadas sem aula — medido), **When** se abre o DSA da semana de 12/10/2026, **Then**
   a tela e o papel mostram **"Semana 28 de 37"** — T é a turma, porque ela é mais longa que o curso
   (Q-1) —, e a ficha da turma mostra *"a turma tem 37 semanas e o curso, 35"*. Hoje a mesma semana sai
   **"Nº 26"**.
2. **Given** uma disciplina da turma com instrutor atribuído e a UE sem atribuição própria, **When** o
   operador clica num tempo vazio e escolhe a disciplina e a UE, **Then** o instrutor atribuído à
   disciplina na turma vem preenchido, e pode ser trocado.
3. **Given** um bloco de aula no DSA, **When** o operador olha a grade, **Then** o nome da disciplina
   aparece em destaque, o código depois, e a técnica numa linha discreta abaixo.

---

### User Story 3 — Instrutor: ver primeiro, editar ao clicar, e a CH prevista certa (Priority: **P2**)

Quem abre a ficha do instrutor lê o cadastro, as habilitações e a carga **sem** um formulário aberto
embaixo; editar é um clique. A CH prevista do ano conta todas as atribuições dele na turma.

**Why this priority**: a ficha hoje abre com **207 campos editáveis visíveis** (medido na ficha do
instrutor de código 15), e a CH prevista desse mesmo instrutor sai com **114 TA** quando as atribuições
somam **271 TA**.

**Independent Test**: a ficha abre sem campo editável visível; o botão Editar revela o formulário; a CH
prevista do instrutor de código 15 em 2026 soma as quatro atribuições dele.

**Acceptance Scenarios**:

1. **Given** um perfil que pode editar instrutor, **When** abre a ficha, **Then** não há campo editável
   visível até clicar em **Editar**; Editar, Desativar/Reativar e Excluir ficam numa barra no topo da
   ficha (Q-13).
2. **Given** o instrutor de código 15, atribuído em quatro linhas de turma (C-Espc-HN 2026, C-Esp-ME 2026
   ×2, C-Exp-Obs-ME 2026), **When** se abre a ficha dele em 2026, **Then** a CH prevista do ano conta as
   quatro (22 + 65 + 114 + 70 = **271 TA**, pela view de hoje), e não só a da C-Espc-HN.

---

### User Story 4 — Entrar e se orientar (Priority: **P2**)

Toda tela, inclusive o login, avisa que o sistema é uma versão Beta privada. Quem digita a senha pode
vê-la antes de enviar. O item do menu da página atual se destaca nos dois temas.

**Why this priority**: os testes com usuários reais começaram; a faixa evita que alguém tome a versão de
testes pelo sistema oficial, e o olho evita a senha errada no primeiro acesso.

**Independent Test**: login, uma tela da aplicação e `/estilo` mostram a faixa; `/print/dsa` não; o olho
alterna o campo entre oculto e visível; o contraste do item ativo passa na auditoria.

**Acceptance Scenarios**:

1. **Given** qualquer ambiente, inclusive Production, **When** alguém abre o login, **Then** vê no topo,
   fixa e sem botão de fechar: *"Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema
   de Gestão Acadêmica"*.
2. **Given** o campo de senha do login ou da troca de senha, **When** a pessoa aciona o olho, **Then** a
   senha aparece; acionando de novo, some.

---

### User Story 5 — Listas e páginas mais limpas (Priority: **P3**)

As telas com filtro abrem com os filtros recolhidos e dizem quantos estão em uso. Toda data aparece como
DD/MM/AAAA. A página do curso abre na aba *Sobre o Curso*, com Editar, Desativar e Nova turma numa barra
só. Em Disciplinas, as UEs aparecem como linhas de tabela, em leitura, e o gráfico é de pizza.

**Why this priority**: é ergonomia; nada aqui impede trabalho hoje.

**Independent Test**: cada tela listada no FR correspondente, aberta por clique a partir do menu.

**Acceptance Scenarios**:

1. **Given** `/instrutores` aberto sem filtro, **When** a tela carrega, **Then** os filtros estão
   recolhidos e o botão **não** mostra contagem; com OM e Categoria escolhidas, mostra **2**.
2. **Given** a página de um curso aberta pelo catálogo, **When** carrega, **Then** a aba selecionada é
   *Sobre o Curso*, e Editar, Desativar e Nova turma estão numa barra só, do mesmo tamanho.

---

### Edge Cases

- **Semana antes do início ou depois do término da turma** (1.9): não há DSA daquela turma; a tela
  mostra o motivo e o papel imprime **"—"**, como hoje para a turma sem data de início (`D-7` da spec
  013). Nunca "Semana 0" (`D-9` da spec 013).
- **Turma sem `data_inicio`** (1.9): continua **"—"** com o motivo de hoje.
- **Turma mais longa que o curso** (1.9): T = semanas corridas da turma, e a ficha da turma ganha o
  aviso de cadastro *"a turma tem N semanas e o curso, M"* (Q-1). Medido: C-Ap-FR/HN 2026 (37 × 35),
  C-Espc-FR/HN 2026 (44 × 42), C-Esp-ME 2026 (20 × 18).
- **Curso sem `duracao_semanas`** (1.9): T = semanas corridas da turma, sem aviso (Q-1).
- **Turma mais curta que o curso** (1.9): T continua sendo a duração do curso, sem aviso (Q-1 só prevê
  aviso para a turma mais longa). Medido: nenhuma turma da cópia nesse caso.
- **Curso sem `duracao_semanas` e turma sem `data_termino`** (1.9): a semana sai **"Semana N"**, sem
  "de T", com um aviso de cadastro — inventar o T seria inventar o número.
- **Início em fim de semana** (1.9): a semana 1 é a semana ISO (segunda a domingo) que contém o início.
  Medido: as 29 turmas da cópia começam em dia útil.
- **Turma que atravessa o ano** (1.9): a contagem não reinicia em janeiro (CAHO 2027 vai de 05/01 a
  17/12; a C-Ap-FR 2026 não atravessa, mas a regra não pode depender disso).
- **Saldo em sábado ou domingo** (1.14): "de amanhã" num sábado conta a partir de domingo, que não é dia
  útil. Hoje, 17/10/2026, é sábado — o saldo de hoje não muda por esse lado, só pela executada.
- **Lançamento de hoje** (1.14): conta como executado (resposta 2 da triagem: *"hoje conta como
  executado"*).
- **Dois lançamentos começando no mesmo TA** (1.12): **nenhum** dos dois some (ver FR-012.3). Medido: 0
  casos na cópia de hoje.
- **Turma de curso inativo** (1.15): a gravação continua recusada com a frase *"O curso X está inativo e
  não recebe alterações."*. Medido: 0 turmas em curso inativo hoje.
- **Disciplina com mais de 5 disciplinas no gráfico** (1.7): o componente de pizza **recusa** mais de 5
  fatias por desenho (`MAXIMO_DE_CATEGORIAS_NA_PIZZA = 5`): a pizza mostra as 4 maiores e "Outras (N)",
  e a lista em texto abaixo traz todas (Q-11).

---

## 5. Requirements *(mandatory)*

> Numeração: **FR-0NN corresponde ao item 1.NN do plano** (FR-001 = item 1.1). Cada FR traz a
> **origem medida**, o **requisito** e o **critério de aceite**. Requisito de outra spec é citado com o
> número da spec (regra de 17/09/2026).

### 5.1 Casca e entrada

**FR-001 — Faixa Beta** *(item 1.1; só tela)*
- **Medido:** `components/faixa-de-ambiente.tsx:21-36` mostra *"AMBIENTE LOCAL"* em local e
  *"PRÉ-VISUALIZAÇÃO — dado sintético, não é o sistema real"* em preview, e **some em Production**
  (`producao: null`). Ela não é fixa: não tem `sticky`/`fixed` (`:52`) e rola com a página. É montada em
  `app/layout.tsx:70`, por isso já aparece no login; `/print/dsa` a esconde por CSS
  (`app/print/dsa/impressao.css:46-48`).
- **FR-001.1**: Toda tela MUST mostrar no topo uma faixa fina, **fixa** e **sem controle de fechar**, com
  o texto exato *"Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão
  Acadêmica"* — em **todos** os ambientes, inclusive Production, e inclusive no login, em `/estilo` e
  nas telas de erro. **É uma faixa só** (Q-15): ela substitui a faixa de ambiente de hoje e, em local e
  em preview, acrescenta o ambiente ao texto (*"· ambiente local"*, *"· pré-visualização"*), e o aviso
  de variável por preencher que existe hoje.
- **FR-001.4**: Em Production a faixa MUST mostrar o texto Beta **independentemente do valor de
  `NEXT_PUBLIC_AMBIENTE`** (decisão de 17/10/2026). ⚠️ Hoje, valor ausente ou desconhecido vira
  `local` (`lib/ambiente.ts:137-140`); por isso o acréscimo de ambiente MUST aparecer **só** quando o
  ambiente for declarado como `local` ou `preview` — valor ausente ou desconhecido mostra só o texto
  Beta, para que Production nunca diga *"ambiente local"* (NQ-3, confirmada em 17/10/2026).
- **FR-001.2**: As rotas de impressão (`/print/*`) MUST NOT mostrar a faixa, na tela e no papel,
  inclusive nos estados de carregamento e de erro.
- **FR-001.3**: A faixa fixa MUST NOT cobrir conteúdo: a lateral (`lg:sticky lg:top-0 lg:h-dvh`,
  `painel-retratil.tsx:152`) e as telas de altura cheia passam a descontar a altura dela.
- **Aceite:** um caso de ponta a ponta abre o login, uma tela da aplicação **por clique** e `/estilo`, e
  confere o texto e o acréscimo *"· ambiente local"* (a suíte declara `local`); teste de unidade da regra
  do acréscimo com `local`, `preview`, `producao`, ausente e desconhecido; abre `/print/dsa` pelo botão Imprimir e confere que a faixa não está visível; rola uma
  tela longa e confere que a faixa continua no topo.

**FR-002 — Contraste do item ativo da lateral** *(item 1.2; só tela)*
- **Medido:** o item ativo usa `bg-marca-suave` sobre a lateral `bg-superficie-2`
  (`navegacao-lateral.tsx:108-114`, `painel-retratil.tsx:137`): **1,01:1** no claro e **1,06:1** no
  escuro (fórmula de `lib/design/vocabulario.ts:267-281`). O que distingue o ativo hoje é só o traço de
  2 px, o peso e o tom do texto. O hover de qualquer item usa a **mesma** cor do ativo.
- **FR-002.1**: O item da página atual MUST se destacar do fundo da lateral e do item sob o ponteiro,
  nos dois temas, **só com tokens existentes**: fundo `marca` e texto `marca-contraste` (Q-16;
  12,61:1 no claro e 4,52:1 no escuro, pela fórmula da auditoria). O item sob o ponteiro continua
  `marca-suave`.
- **FR-002.2**: O par de cor escolhido MUST entrar na auditoria de contraste (`PARES` de
  `lib/design/vocabulario.ts`), e o destaque MUST continuar marcado por `aria-current="page"`, não só
  pela cor. Origem: `RF-DS-03` (*"contraste AA em ambos os temas"*). *(Corrigido no plan, 17/10/2026:
  a primeira redação citava o `RNF-USA-05`, que trata da persistência do tema.)*
- **Aceite:** `tests/unidade/contraste.test.ts` cobre o par novo nos dois temas; o caso de
  `tests/e2e/shell.spec.ts:44-51` continua exigindo um único `[aria-current="page"]`.

**FR-003 — Ver senha** *(item 1.3; só tela)*
- **Medido:** os três campos de senha do sistema são `type="password"` sem alternância:
  `app/(auth)/login/FormularioDeLogin.tsx:86` e `app/(app)/perfil/senha/FormularioDeSenhaNova.tsx:59` e
  `:67` (senha nova e confirmação). Zero ocorrências de mostrar/ocultar senha em `app/` e
  `components/`. O primeiro acesso usa a mesma tela `/perfil/senha` (`lib/supabase/middleware.ts:43`).
- **FR-003.1**: Cada um dos três campos MUST ter um botão de olho que mostra e oculta a senha, com nome
  acessível que diga o estado (*"Mostrar senha"* / *"Ocultar senha"*), alcançável por teclado.
- **FR-003.2**: O botão MUST NOT enviar o formulário, e o nome dele MUST NOT casar com `/entrar/i` nem
  com `/trocar senha/i`, que os testes usam para achar os botões de envio.
- **Aceite:** um caso de ponta a ponta digita a senha, aciona o olho, confere o `type` do campo nos dois
  estados, e entra.

### 5.2 Listas e páginas

**FR-004 — Filtros recolhidos com contagem** *(item 1.4; só tela)*
- **Medido:** `components/ciaara/filtro-avancado.tsx:75` começa **aberto** (`useState(true)`). A
  contagem já existe no botão (`:63-66`, `:93-97`), mas **conta qualquer valor não vazio** — e em
  `/cursos`, `/instrutores` e `/disciplinas` o padrão de `situacao` é `ativo`. **Resultado medido: com a
  tela limpa o botão mostra "1" e o "Limpar filtros" não aparece; os dois discordam.** Telas com
  `FiltroAvancado`: `/turmas`, `/cursos`, `/instrutores`, `/atividades`, `/disciplinas` (depois de escolher
  o curso) e a vitrine `/estilo`.
- **FR-004.1**: Nas telas que usam o filtro avançado, os filtros MUST começar **recolhidos** — inclusive
  quando a URL já traz filtro; o número no botão é o que avisa (Q-17).
- **FR-004.2**: O botão MUST mostrar quantos filtros estão **fora do padrão** — a mesma regra que decide
  se o "Limpar filtros" aparece. Tela limpa: nenhuma contagem.
- **FR-004.3**: Abrir e recolher continua estado efêmero do componente
  (`tests/unidade/estado-efemero-intacto.test.ts`), e a contagem continua sem palavra de domínio no
  componente (`tests/unidade/filtro-avancado.test.ts`).
- **Fora:** os dois `<select>` do `/inicio` (`FiltroDoPanorama.tsx`), que o Bloco 4 refaz, e a busca de
  `/admin/usuarios` (um campo só).
- **Aceite:** para cada uma das cinco telas, um caso de ponta a ponta chega **por clique** pelo menu,
  confere o painel recolhido e o botão sem número, escolhe dois filtros e confere **2**, limpa e confere
  que o número sumiu. Os três arquivos que mexem em campos sem abrir o painel
  (`instrutores.spec.ts`, `turmas-lista.spec.ts`, `estado-na-url.spec.ts`) passam a abri-lo.

**FR-005 — DD/MM/AAAA em todo o sistema** *(item 1.5; só tela)*
- **Medido:** as **telas** já estão em DD/MM/AAAA pelo ponto único `lib/formato/data.ts` (decisão da spec
  012). Restam, fora dele:
  1. papel do DSA: cabeçalho dos dias em `DD/MM`, por formatador próprio em
     `lib/dominio/dsa/grade-do-papel.ts:98`;
  2. planilha de contingência: cabeçalho dos dias da aba IMPRESSÃO (`impressao.ts:381-382`, `:591-592`),
     a linha de datas da CRONOS (`cronos.ts:78`) e o seletor de semana (`semanas.ts:54`, *"06/04 a
     11/04/2026"*);
  3. `/atividades`: os filtros *"De (aaaa-mm-dd)"* e *"Até (aaaa-mm-dd)"* pedem ISO num campo de texto
     (`FiltrosDeAtividades.tsx:48-49`);
  4. leitor de tela: o rótulo acessível de cada célula da grade do DSA termina com a data ISO
     (`grade-alocacao.tsx:296-304`).
- **FR-005.1**: Toda data **exibida** — tela, cartão, papel, planilha e rótulo acessível — MUST sair em
  DD/MM/AAAA, pelo ponto único `lib/formato/data.ts`. **Inclui** (Q-9): o cabeçalho dos dias do papel do
  DSA, o cabeçalho dos dias da aba IMPRESSÃO, a linha de datas da CRONOS e o rótulo do seletor de semana
  da planilha. O papel MUST continuar cabendo numa página A4 (asserção de `RF-PDF-01`).
- **FR-005.2**: O filtro de período de `/atividades` MUST deixar de pedir texto em ISO; a pessoa escolhe
  a data, e a URL continua em ISO.
- **FR-005.3**: O valor de `<input type="date">`, os parâmetros de URL e o nome do arquivo da planilha
  continuam em ISO.
- **FR-005.4**: A guarda `tests/unidade/formato-de-data.test.ts` MUST passar a pegar as formas que hoje
  deixa passar e que esta varredura achou: template de dois pedaços com `padStart`, `.slice(0, 5)` sobre
  data formatada, e `Intl.DateTimeFormat` fora do ponto único.
- **Aceite:** a guarda reprova com cada uma das quatro ocorrências de volta (defeito deliberado) e passa
  sem elas.

**FR-006 — Página do curso** *(item 1.6; só tela)*
- **Medido:** os três botões estão em três lugares — **Editar curso** no cabeçalho
  (`CabecalhoDoCurso.tsx:99-107`, `outline`), **Desativar/Reativar** num bloco solto antes das abas
  (`AcoesDeSituacao.tsx:68-75`, `page.tsx:308-310`), **Nova turma** dentro da aba Grade
  (`AbaGrade.tsx:110-117`). A aba padrão é **Grade** — medido na tela da C-Exp-Obs-ME, e definida em
  **dois** lugares: `lib/navegacao/contrato.ts:794-802` e `AbasDoCurso.tsx:38`.
- **FR-006.1**: Editar, Desativar/Reativar e Nova turma MUST ficar **numa barra só**, no topo da página,
  com o **mesmo tamanho**; Desativar mantém a cor de ação destrutiva (Q-10). Cada um continua seguindo a
  permissão da tela ou ação de destino (Nova turma só com permissão de criar turma **e** curso em
  oferta).
- **FR-006.2**: *Sobre o Curso* MUST ser a **primeira** aba e a **padrão** (Q-10): ordem *Sobre o Curso ·
  Grade · Avaliações*. O padrão MUST ter **um** dono só (o contrato de parâmetros).
- **FR-006.3**: Os links que hoje levam ao curso para mostrar uma turma na Grade (o cartão do `/inicio`,
  `inicio/page.tsx:388`) MUST passar a pedir a aba Grade explicitamente, para continuar chegando nela.
- **Aceite:** caso de ponta a ponta que chega ao curso **pelo catálogo** e confere a aba e a barra;
  `tests/e2e/cards-levam-a-aba.spec.ts` continua passando; os testes que assumiam Grade como padrão
  (`curso-pagina.spec.ts`, `turmas.spec.ts:140-150`, `turmas-lista.spec.ts:147-165`,
  `contrato-de-parametros.test.ts:355-361`, `endereco-de-turma.test.ts:77-78`) são ajustados.

**FR-007 — Disciplinas: UEs em tabela e gráfico de pizza** *(item 1.7; só tela)*
- **Medido:** as UEs são uma **lista plana** com um **formulário de edição aberto em cada linha**
  (`PainelDeUnidades.tsx:83-136`) e um formulário "Acrescentar unidade" sempre aberto (`:170-196`). O
  banco **não tem subunidade** (`unidades_ensino` só tem `numero_ue`, `topico`, `ch_prevista_tempos`). O
  gráfico de `/disciplinas` é de **barras** (`ProporcaoDaCarga.tsx`), com as 6 maiores e "+N outras" —
  até 7 barras.
- **FR-007.1**: As UEs da disciplina MUST aparecer como **linhas de tabela**, em cascata sob a linha da
  disciplina (o mesmo padrão da situação por UE do DSA), **só leitura**, com **Editar** por linha para
  quem pode editar; acrescentar unidade MUST ficar atrás de um botão.
- **FR-007.2**: A proporção da CH por disciplina MUST ser um gráfico de **pizza** com as **4 maiores** e
  uma fatia **"Outras (N)"**, respeitando o teto de 5 fatias do componente; a lista em texto abaixo do
  gráfico MUST trazer todas as disciplinas (Q-11).
- **Aceite:** caso de ponta a ponta que chega em Disciplinas pelo menu, escolhe o curso, expande uma
  disciplina e confere linhas sem campo editável; clica em Editar numa UE, grava, e confere o valor
  novo. `tests/e2e/disciplinas.spec.ts:135-169` é ajustado.

**FR-008 — Cartão do DSA** *(item 1.8; só tela)*
- **Medido:** na grade com relógio (`CorpoDoCartao`, `grade-dsa.tsx:205-280`) o título é o **código**
  seguido do nome, e a técnica sai **na mesma linha** de "N TA" e do local, em negrito. Na grade sem
  relógio (`CorpoDoBloco`, `:124-182`) o nome **não aparece**.
- **FR-008.1**: O cartão da tela MUST mostrar o **nome** da disciplina em destaque, o **código** depois,
  e a **técnica** numa linha própria, discreta, abaixo — nas duas grades.
- **FR-008.2**: O papel e a planilha **não mudam** (Q-12): o papel continua o documento assinado de hoje
  (`RNF-COMP-01`), e a planilha continua igual ao papel.
- **Aceite:** caso de ponta a ponta que confere a ordem nome → código no cartão de uma aula, e a técnica
  numa linha separada.

### 5.3 DSA

**FR-009 — A semana do curso, "Semana N de T"** *(item 1.9; D-COR-1; só tela e domínio)*
- **Medido:**
  - O número sai de `numeroDoDsa` (`lib/dominio/dsa/numero-do-dsa.ts:160-194`), que conta **semanas com
    lançamento** desde o início (convenção CRONOS). Uma só montagem serve tela, papel e planilha
    (`app/print/dsa/documento.ts:69-73`), mas a **planilha reescreve a convenção em fórmula**
    (`lib/dominio/dsa/planilha/preenchimento.ts:579-635`).
  - A tela mostra **duas** numerações: *"semana 41 de 2026"* na navegação (`NavegacaoDaSemana.tsx:153-155`,
    semana ISO do calendário) e *"Semana 41/2026 · DSA Nº 4"* no cabeçalho (`DocumentoNaTela.tsx:24-28`).
    O papel mostra *"Semana 41/2026"*, *"DSA Nº 4"* e *"DSA Nº"* no rodapé (`DocumentoDoDsa.tsx:110-115`,
    `:227-230`).
  - **Nenhum código do DSA lê `cursos.duracao_semanas`** (só `AbaSobre.tsx:132` a exibe).
  - **A diferença hoje, na semana de 12/10/2026:** C-Ap-FR 2026 e C-Ap-HN 2026 saem **Nº 26** e estão na
    semana corrida **28**; C-Espc-FR 2026 sai **39** e está na **40**. Nas outras sete turmas com
    lançamento, os dois coincidem.
  - ⚠️ **E o T de D-COR-1 é menor que a turma em três pares de cursos:** `duracao_semanas` × semanas
    corridas da turma — C-Ap-FR/C-Ap-HN **35 × 37**, C-Espc-FR/C-Espc-HN **42 × 44**, C-Esp-ME **18 × 20**.
    Nenhuma semana dessas turmas é inteira de feriado (medido em `feriados`). Lido ao pé da letra, o fim
    da C-Ap-FR sairia **"Semana 37 de 35"**. **12 dos 24 cursos** não têm `duracao_semanas`.
- **FR-009.1**: O número da semana do DSA MUST ser a **semana corrida do curso**: a semana 1 é a semana
  que contém `turmas.data_inicio`, e dali em diante conta **toda** semana, com ou sem aula (D-COR-1).
- **FR-009.2**: A tela **e** o papel MUST mostrar **"Semana N de T"**, que **substitui** o "Nº" e a
  semana ISO ("Semana 41/2026") no cabeçalho e no rodapé do papel e no cabeçalho da tela; a navegação
  de semanas MUST mostrar "Semana N de T" e as datas da semana. A semana ISO fica **só na URL**
  (`?semana=&ano=`), sem mudar o contrato de parâmetros (Q-2).
- **FR-009.3**: T MUST ser `cursos.duracao_semanas`; quando a turma for **mais longa** que o curso, T
  MUST ser as semanas corridas da turma (da semana do início à semana do término); sem duração no
  curso, T MUST ser as semanas corridas da turma (Q-1). **N MUST NOT passar de T** em lugar nenhum. Sem
  duração no curso **e** sem término na turma, a tela mostra "Semana N" e um aviso de cadastro.
- **FR-009.4**: A conta MUST viver em `lib/dominio/`, numa função só, e MUST usar a semana ISO do ponto
  único `semanaIsoDe` (a numeração ISO não nasce num segundo lugar — o cabeçalho de
  `numero-do-dsa.ts` e `tests/unidade/distribuicao-unica.test.ts:131,176-183`).
- **FR-009.5**: A planilha de contingência MUST usar a **mesma numeração** (Q-4): a fórmula do número na
  entrada, o "DSA Nº" da IMPRESSÃO e o rótulo do seletor de semana passam a "Semana N de T". A suíte da
  spec 015 continua provando a fórmula contra a função do sistema
  (`tests/unidade/dsa/planilha-preenchimento.test.ts:69-72`).
- **FR-009.6**: Semana pedida fora da janela da turma MUST mostrar o motivo na tela e **"—"** no papel;
  nunca "Semana 0" nem "Semana N de T" com N > T.
- **FR-009.7**: Quando a turma for mais longa que o curso, a ficha da turma MUST mostrar, nos avisos de
  qualidade de cadastro, *"a turma tem N semanas e o curso, M"* (Q-1). O aviso não bloqueia nada
  (`RN-DEG-02`).
- **FR-009.8**: Na semipresencial, a contagem começa no início da **turma**, não da etapa presencial
  (Q-3): a C-ApA-AuxNav-PR-SP T2 2026 (início 03/08, etapa presencial de 12/10 a 23/10) tem o primeiro
  DSA na **Semana 11 de 13**.
- **Aceite:** testes de unidade da função nova com: semana vazia no meio **consome** número (o inverso
  de `numero-do-dsa.test.ts:89`); virada do ano; início em quinta-feira; T pela duração do curso, pela
  turma mais longa, pela turma sem duração no curso, e sem os dois; N nunca maior que T; semana fora da
  janela; a semipresencial. Caso de ponta a ponta sobre uma turma **semeada com a forma medida da
  C-Ap-FR 2026** (curso de 35 semanas, turma de 37, duas semanas sem aula) — a suíte roda em base limpa,
  sem o dado real —, que abre o DSA **a partir da ficha da turma**, vai à 28ª semana e confere "Semana 28
  de 37" na tela e no papel, e o aviso *"a turma tem 37 semanas e o curso, 35"* na ficha. Na cópia do
  remoto, a mesma conferência é feita à mão na C-Ap-FR 2026. O auxiliar `tests/e2e/percurso-do-dsa.ts:27`,
  que exige *"semana X de 2026"* e serve 14 suítes, é ajustado.

**FR-011 — "7 TA aparecem como 6"** *(item 1.11; **SEM OBJETO** — Q-8; fica o caso de regressão)*
- **Onde foi visto** (Q-8, Bernardo, 17/10/2026): na **tela do DSA**, durante o preenchimento, **antes das
  correções de 08/10**. As correções entraram na `main` pelo PR #40 (`d0a899a`, 08/10/2026 22:18), que
  passou a dividir no almoço o cartão do bloco que o atravessa (*"parte 1 de 2 · bloco de N TA"*).
- **Medido — NÃO REPRODUZIDO.** Na C-Exp-Obs-ME 2026, segunda 05/10/2026, a cópia de hoje tem **um**
  bloco de aula de **7 TA** (TA 1 a 7, `DSAP-C-EXP-OBS-ME-2026-L184-A`, editado em 07/10/2026) e o Estudo
  Individual no TA 8. O regime é de 7 TA, com 4 de manhã. **A tela do DSA mostra os 7** (*"parte 1 de 2 ·
  bloco de 7 TA"*, 4 TA de manhã, e *"parte 2 de 2"*, 3 TA à tarde), e **a aba PREENCHIMENTO da planilha
  traz os 7** (linhas 170 a 176, TA 1 a 7, o mesmo código). O papel sai certo, como o relato diz.
- **Achado no caminho, latente:** a grade **sem relógio** (`GradeNumerada`, `grade-dsa.tsx:573` em
  diante) dá ao cartão `rowSpan = tempos` sem contar a linha do almoço; um bloco que atravessasse o
  almoço terminaria um TA antes e deslocaria a linha seguinte. **Hoje é inalcançável**: essa grade só é
  usada quando não há relógio, e sem relógio não há linha de almoço. Fica na §11, não vira requisito.
- **FR-011.1** *(caso de regressão — o que fica do item)*: um **dia com 7 TA** num regime de 7, com **um
  bloco que atravessa o almoço** (a forma medida: 7 TA, 4 de manhã), MUST aparecer com **todos** os TA
  na grade da tela, na aba PREENCHIMENTO da planilha e no papel. O caso entra assim mesmo, sem defeito a
  corrigir (Q-8).
- **FR-011.2**: Nenhuma correção de código é feita por este item.
- **Aceite:** um caso de ponta a ponta sobre uma turma semeada com essa forma, que chega ao DSA pela
  ficha da turma e confere os 7 TA do dia na tela e no papel; e um caso de unidade da planilha que
  confere os 7 TA na entrada.

**FR-012 — Sugestão de instrutor e técnica no DSA** *(item 1.12; `PEND-DSA-SUGESTAO`; só leitura e tela)*
- **Medido:**
  - A consulta das atribuições por UE filtra `turma_disciplina_unidade` por `turma_id`, coluna que **não
    existe** (`app/(app)/turmas/[turma]/dsa/leitura.ts:490-497`; a tabela se liga à turma por
    `turma_disciplina_id`, `20260925135054_rateio_por_instrutor.sql:111-145`), e o erro é **guardado e
    não chega à tela** (`listaOuVazia`, `:298-308`, `:729`). Resultado: `atribuidoId` é sempre nulo.
  - A tela **não lê** `turma_disciplina_instrutor`, então o segundo degrau da cascata não existe.
    `preencherLancamento` (`lib/dominio/dsa/pre-preenchimento.ts:148-159`) tem **um** consumidor de
    produção, a planilha (`planilha/catalogo.ts:140-178`); o formulário pré-preenche à mão
    (`FormularioDeLancamento.tsx:309-318`).
  - `tecnicaSugerida: null` está escrito à mão (`leitura.ts:1248`), e a consulta de UEs nem pede a
    coluna. **Mas o dado também não existe:** **0 de 587** UEs e **0** disciplinas têm
    `tecnica_ensino_sugerida` na cópia. A sugestão de técnica fica certa e **sem efeito** até alguém
    preencher a coluna.
  - Atribuições na cópia: **4** por UE e **110** por disciplina, em **92** linhas de turma.
  - **Dois lançamentos começando no mesmo TA: o segundo SOME** da grade, do papel e da planilha, e
    continua contando na CH (`grade.ts:263`, `doDia.find(...)`, e nada o manda para "sem posição"). A
    nota da `PEND-DSA-SUGESTAO` dizia que ele ia para "sem posição"; não vai. **0 casos** na cópia.
- **FR-012.1**: A leitura das atribuições por UE MUST ligar pela linha da turma e só considerar
  atribuição ativa; um erro dessa leitura MUST aparecer, e não virar lista vazia em silêncio
  (`RN-DEG-01`: vazio com aviso).
- **FR-012.2**: O formulário de lançamento MUST sugerir instrutor e técnica por `preencherLancamento`, com
  a cascata **UE → disciplina na turma → vazio** (`FR-014` da spec 013), e a lista de candidatos em
  antiguidade (`RN-ANT-01`). A sugestão é editável e nunca bloqueia (`RF-DSA-08`).
- **FR-012.3**: Dois lançamentos que começam no mesmo TA MUST ter ordem **estável** entre cargas (que não
  dependa do `fato_id`), e o que não couber na grade MUST ir para "sem posição" com o motivo — na tela, no
  papel e na planilha. Nenhum lançamento fica escondido.
- **Aceite:** caso de ponta a ponta que abre o DSA de uma turma com atribuição por disciplina, clica num
  tempo vazio, escolhe a disciplina e confere o instrutor preenchido. Teste de unidade com dois
  lançamentos no mesmo TA, em duas ordens de entrada, com o mesmo resultado. Teste que planta o filtro
  errado e confere que o aviso aparece.

### 5.4 Instrutor

**FR-010 — Ficha do instrutor: ver primeiro, editar ao clicar** *(item 1.10; só tela)*
- **Medido:** `app/(app)/instrutores/[codigo]/page.tsx:275-279` mostra a leitura e, logo abaixo
  (`:288-316`), o formulário **sempre montado**: **207 campos editáveis visíveis** na ficha do instrutor
  de código 15 (tela capturada). Desativar e Excluir ficam **no rodapé do formulário** (`:302-314`). A
  ficha da turma já usa o padrão pedido (`EdicaoDaTurma.tsx`, recolhido, com o auxiliar e2e
  `abrirEdicaoDaTurma`). **Curso:** já é leitura, com a edição em rota própria. **Disciplina:** o cadastro
  já abre em leitura (`DetalheDaDisciplina.tsx:38-97`), mas dois painéis do detalhe ficam **sempre
  abertos** — as UEs (FR-007) e as avaliações do currículo (`PainelDeAvaliacoesDoCurriculo.tsx:86-125`).
- **FR-010.1**: A ficha do instrutor MUST abrir em leitura; um botão **Editar** MUST revelar o
  formulário, como na ficha da turma.
- **FR-010.2**: A ficha MUST ter uma barra no topo com **Editar · Desativar/Reativar · Excluir**, como a
  do curso (FR-006), cada um com a mesma permissão de hoje (Q-13). Desativar e Excluir saem do rodapé do
  formulário.
- **FR-010.3**: O painel de avaliações do currículo da disciplina MUST abrir em leitura, com Editar por
  item, como as UEs (FR-007, Q-13). Os painéis de período e de instrutores **da linha da turma**, na
  ficha da turma, **não mudam** (são do Bloco 2).
- **Aceite:** caso de ponta a ponta que chega à ficha pela lista de instrutores, confere zero campo
  editável visível, clica em Editar e grava. Os casos de `tests/e2e/instrutores.spec.ts` que usam o
  formulário sem abrir (listados na §11) passam a abri-lo por um auxiliar, como `abrirEdicaoDaTurma`.

**FR-013 — Instrutor atribuído sem CH prevista** *(item 1.13; defeito; banco — PORTÃO 9.4, segunda
exceção do bloco, autorizada na Q-7)*
- **Medido:** o instrutor de código 15 **está atribuído** (não só habilitado) em **4** linhas de turma
  ativas. `vw_instrutor_carga_prevista` calcula **22 + 65 + 114 + 70 = 271 TA**, mas o `ano` de **3** das 4
  sai **nulo**, porque vem de `disciplinas.previsao_inicio` — o período **do currículo** —, e essas três
  disciplinas não têm. A ficha filtra por ano (`instrutores/[codigo]/page.tsx:127-140`) e
  `vw_instrutor_carga_anual` descarta `ano` nulo (`where ano is not null`): **a CH prevista do ano sai
  114**. Uma das três (C-Exp-Obs-ME 2026, II) **tem** o período preenchido na linha da turma
  (`turma_disciplina.previsao_inicio` = 14/09/2026, `manual`), que a view ignora; as outras duas
  (C-Esp-ME 2026) não têm período em lugar nenhum, mas a turma tem janela (13/04 a 28/08/2026). **Na base
  inteira: 8 linhas da view com ano nulo, de 5 instrutores.**
- **Medido também (17/10/2026, na clarify):** as **8** linhas com ano nulo são as **mesmas 8** com
  `semanas` nulo — e sem `semanas` a média semanal é nula, e o alerta de faixa da ficha **pula** a
  atribuição (`lib/dominio/carga-semanal.ts`, `cargaPorSemana`, `if (… a.mediaSemanal === null)
  continue`). Corrigir só o ano faria a atribuição entrar na CH prevista do ano e continuar fora do
  alerta semanal. As 8: C-Esp-ME 2026 (II e X), C-Exp-Ag-Mag 2026 (I e II), C-Exp-Obs-ME 2026 (I duas
  vezes, II) e EST-QF-PROC-MF-EAD 2026 (I), de 5 instrutores.
- **FR-013.1**: Toda atribuição ativa de instrutor numa linha de turma MUST contar na CH prevista do ano
  em que ela acontece. O ano e a janela MUST sair, nesta ordem (Q-7): do **período da linha da turma**
  (`turma_disciplina.previsao_inicio/termino`); sem ele, do **período da disciplina**
  (`disciplinas.previsao_inicio/termino`); sem ele, da **janela da turma** (`turmas.data_inicio/termino`).
- **FR-013.2**: A correção MUST preservar o rateio em cinco casos (decisão A-1 da spec 010) e a
  `security_invoker` da view (gotcha 10).
- **FR-013.3**: Quando a disciplina não tiver o número de semanas cadastrado, a média semanal da
  atribuição MUST ser a CH prevista dividida pelas semanas da janela usada no FR-013.1 — é a `RN-DIST-02`
  do documento 04 (*"usa a carga horária semanal cadastrada da matéria quando existir, ou a carga
  horária total dividida pelo número de semanas da janela"*), aplicada, não alterada. Assim a atribuição
  entra também no alerta de faixa semanal. As semanas da janela MUST ser contadas pela régua única de
  semana do domínio (`RN-DIST-01`); onde a conta mora — view ou `lib/dominio/` — é decisão do plano.
- **FR-013.4**: Na lista de habilitações da ficha do instrutor, **cada disciplina habilitada sem
  atribuição que conte no ano mostrado** MUST levar a marca *"só habilitado — não gera CH prevista"*, e a
  ficha MUST explicar, junto da CH prevista: *"Habilitação não gera CH prevista; a CH prevista vem da
  atribuição na turma (Disciplinas da turma)."* (Q-7 e NQ-4, por disciplina). Sem banco.
- **FR-013.5**: ⚠️ **PORTÃO DA REGRA 9.4**: o desenho da view nova MUST ser mostrado a Bernardo e
  aprovado **antes** de qualquer aplicação no remoto, com backup antes do `db push`.
- **Aceite:** pgTAP com uma atribuição sem período na disciplina e com período na linha da turma, e outra
  só com a janela da turma, que **reprovam antes** da correção e passam depois (DoD 8); e uma sem
  `semanas` na disciplina, cuja média semanal sai da janela. Na cópia, a ficha do instrutor de código 15
  em 2026 passa de **114** para a soma das quatro atribuições (**271**, pela view de hoje), e a view
  passa de **8** linhas com ano nulo para **0** (as 8 têm janela de turma). Caso de ponta a ponta que
  chega pela lista de instrutores a um instrutor semeado só com habilitação e confere a frase.
  Conferência na cópia do remoto: o instrutor de código 15 tem **6** habilitações e **4** atribuições —
  duas disciplinas (C-Ap-HN IV e C-Espc-HN `HN-1114-0730`) são habilitação sem atribuição.

### 5.5 Turma

**FR-014 — Saldo de capacidade só até hoje** *(item 1.14; D-COR-2; banco — PORTÃO 9.4)*
- **Medido:**
  - Dois consumidores chamam `andamentoDaTurma`: o `/inicio` (`inicio/panorama.ts:120-137`) e a ficha
    da turma (`turmas/[turma]/page.tsx:247-258`). Os dois tiram a executada de
    `vw_carga_horaria_turma.chd_executada`, que **não corta por data** (última definição em
    `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql:308-391`): soma aula, extraclasse,
    aplicação de prova e vista, inclusive futuras e inclusive avaliação `pendente`. **A lista `/turmas`
    não mostra saldo** (`turmas/page.tsx:61`).
  - `diasUteisEntre` conta **de hoje** até o término, inclusivo nas duas pontas
    (`andamento-da-turma.ts:115-140`).
  - **CHD lançada com data depois de 17/10/2026, por turma ativa** (calibrado: a soma por ocupação bate
    com `chd_executada` nas cinco): C-Ap-FR **40**, C-Ap-HN **50**, C-Espc-FR **0**, C-Espc-HN **34**,
    CAHO **11** TA.
  - ⚠️ **Por que exige banco:** fazer o corte em TypeScript obrigaria a recompor a soma da CHD fora da
    view — o que o cabeçalho de `andamento-da-turma.ts:17-20` proíbe (`RN-CRONOS-01` num lugar só) — e a
    alternativa barata, somar `vw_ocupacao_ta`, **perde a linha histórica sem posição** (a view exige
    `ta_inicial`), que é exatamente a forma da semente do e2e (`tests/e2e/panorama-de-teste.ts:350-389`).
- **FR-014.1**: A CH executada do andamento MUST contar só a CHD com data **até hoje, inclusive**; o
  lançado no futuro MUST NOT entrar na executada, no restante, no percentual nem no saldo.
- **FR-014.2**: Os dias úteis do saldo MUST contar de **amanhã** até o término.
- **FR-014.3**: "Hoje" MUST ser o dia em São Paulo, passado **explicitamente** ao banco — nunca o
  `current_date` do servidor, que é UTC e erra das 21h à meia-noite (pendência `D20`; precedente:
  `fn_status_vista(p_avaliacao_id, p_hoje)`).
- **FR-014.4**: **Fora do DSA e da planilha, executado é "até hoje" em toda tela** (Q-5 e NQ-1): o
  andamento da turma (CH executada, percentual, restante, saldo) no `/inicio`, na ficha e em `/turmas`; a
  tabela de disciplinas da ficha (CH executada e % por disciplina), para que a conferência *"sem unidade
  de ensino"* (`DisciplinasDaTurma.tsx:257`) compare duas grandezas da mesma base; a aba **Avaliações** da
  turma (o "cumprido" que decide se a disciplina começou ou terminou); e **`/disciplinas`** com a turma
  escolhida. A **situação do DSA**, o rodapé do papel e a **planilha** MUST continuar acumulados **até a
  semana mostrada** (ou a data de referência da planilha) — o `FR-028.1` da spec 013 fica preservado.
- **FR-014.5**: ⚠️ **PORTÃO DA REGRA 9.4:** a migration nova (view, coluna ou função) — que entrega a
  CHD executada **até um dia dado**, por turma **e** por disciplina da turma — MUST ter o desenho
  mostrado a Bernardo e aprovado **antes** de qualquer aplicação no remoto, com backup antes do
  `db push`. Coluna nova em `vw_carga_horaria_turma` só entra **no fim** (`vw_conformidade_tetos`
  depende da ordem — `supabase/tests/124_dias_parados.sql:44-48`), e a `security_invoker` MUST continuar
  (gotcha 10). A soma que o DSA e a planilha usam MUST NOT mudar.
- **FR-014.6**: A lista `/turmas` MUST ganhar as colunas **Progresso** e **Saldo (TA)**, calculadas pela
  mesma função de domínio (`andamentoDaTurma`), com a mesma marca de atraso do `/inicio` e da ficha
  (Q-6). **Progresso** aparece para **todas** as turmas; **Saldo** só para turma **ativa** ou
  **planejada**, e **"—"** nas demais (decisão de Bernardo Villas Boas sobre o plan, P-4, 17/10/2026). Ela passa a ser o terceiro consumidor; a guarda `tests/unidade/andamento-unico.test.ts` o
  admite, desde que ele não decida atraso por conta própria.
- **Aceite:** teste de unidade com lançamento futuro, hoje e ontem, num sábado e numa segunda. Caso de
  ponta a ponta que semeia **um lançamento futuro** (hoje nenhum e2e semeia) e confere que nem o saldo,
  nem a CH executada da turma, nem a da disciplina na ficha o contam, e que a situação do DSA da semana
  dele **o conta** — o caso que discrimina (DoD 8). Caso de ponta a ponta que chega a `/turmas` pelo menu
  e confere as duas colunas novas. Os cinco casos de `tests/unidade/andamento-da-turma.test.ts` que
  mudam de número (U1, U2, U3, U4, U7) são reescritos com a conta nova.

**FR-015 — Trocar a situação da turma** *(item 1.15; defeito de tela; só tela e ação)*
- **Medido — o diagnóstico:**
  - **Reproduzido como Admin, pela tela, no banco local:** três trocas — planejada → ativa
    (EST-QF-PGRS100 2026), ativa → concluída (C-Ap-FR 2026), cancelada → planejada (C-Esp-ALH 2026) —
    **gravaram as três**, conferidas no banco, e foram desfeitas em seguida no local. Na cópia, 5
    turmas concluídas e 1 cancelada têm edição entre 05 e 08/10/2026 — compatível com trocas que
    funcionaram, mas **não prova**: a cópia não guarda o valor anterior.
  - **A permissão não é a causa:** `turmas/editar` vale para admin, encarregado, ajudante e operador
    (`20260830000111_acesso_rls_e_permissoes.sql:999,1045,1080,1132`), e o Encarregado da cópia tem
    escopo `geral`. **Nenhum gatilho nem `CHECK` recusa troca de status** (pgTAP
    `101_turma_codigo_e_rotulo.sql:346-380`: as 12 transições são aceitas). O Zod inclui o status
    (`lib/validacao/turma.ts:38`) e o erro é traduzido e mostrado.
  - **A causa que a evidência sustenta: o campo está escondido.** O cabeçalho mostra a Situação como
    **selo só de leitura** (`turmas/[turma]/page.tsx:496-506`); o campo editável existe
    (`app/(app)/turmas/FormularioDeTurma.tsx:213-229`), mas está dentro de *"Editar turma"*, que nasce
    **fechado** (`EdicaoDaTurma.tsx:34`) e fica **no fim da página**, abaixo da seção Disciplinas — o
    campo nem existe no DOM até o clique (medido nas três turmas). E **gravar com sucesso não mostra
    aviso nenhum** (`FormularioDeTurma.tsx:176`, só `router.push`).
  - **Não reproduzido como Encarregado pela tela:** a cópia não traz credencial (o schema `auth` não
    vem). O veredito vale pela matriz, pelo escopo e pela policy, e o caso de ponta a ponta do aceite o
    prova com sessão real.
- **FR-015.1**: Quem pode editar a turma MUST ter, **ao lado do selo de Situação no cabeçalho da ficha**,
  um botão **"Trocar situação"** que abre um diálogo só com a situação (planejada, ativa, concluída,
  cancelada) e grava por uma **Server Action própria** — Zod na primeira linha, só o código da turma e a
  situação (Q-14). O botão segue a permissão `turmas/editar` e o curso em oferta, como a edição da
  turma; a recusa do banco continua traduzida e mostrada. É o diálogo que o Bloco 2 vai estender com a
  observação (D-COR-4).
- **FR-015.2**: Trocar a situação **e** gravar o formulário da turma MUST mostrar uma confirmação
  visível, e o selo do cabeçalho MUST refletir a nova situação.
- **FR-015.4**: Na **edição** da turma, a situação MUST se trocar **só** pelo botão *"Trocar situação"*: o
  formulário *"Editar turma"* deixa de ter o campo *Situação*, e a ação de gravar a turma deixa de
  mandá-lo. Na **criação** da turma o campo continua (NQ-2). Um caminho só, para que a observação do
  Bloco 2 (D-COR-4) nasça num lugar.
- **FR-015.3**: A observação por troca de status (D-COR-4) **não** entra aqui: exige coluna ou tabela
  nova, e é do Bloco 2.
- **Aceite:** caso de ponta a ponta para **Admin e para Encarregado**, chegando à ficha **por clique**
  pela lista de turmas, que aciona *"Trocar situação"*, troca, confere a confirmação, **recarrega** e
  confere o selo; e um negativo com um perfil sem `turmas/editar`, que não vê o botão, e cuja chamada
  direta à ação **não grava** — conferido **no banco**, porque um `UPDATE` barrado pela RLS volta sem
  erro e com zero linhas (gotcha 4; DoD 4). Os casos atuais que não provam a gravação (§11, itens 11 e
  12) são corrigidos.

### 5.6 O que vale para todos

- **FR-016**: Toda tela tocada MUST continuar alcançável por clique, e todo caso de ponta a ponta novo
  MUST chegar à tela por clique; `goto` só para o ponto de partida.
- **FR-017**: Regra nova MUST viver em `lib/dominio/` (TypeScript puro, com o `RN-`/decisão e a citação
  literal no topo); leitura em Server Component; escrita em Server Action com Zod na primeira linha;
  estado de tela na URL; só tokens existentes de `app/globals.css`.
- **FR-018**: Nenhuma correção deste bloco MUST mudar regra do documento 04 além das listadas na §10.

### 5.7 Key Entities

- **Semana do curso** (FR-009): número de 1 a T de uma semana dentro da janela da turma; derivado de
  `turmas.data_inicio`, `turmas.data_termino` e `cursos.duracao_semanas`, com N ≤ T. Não é gravado.
- **CHD executada até uma data** (FR-014): a soma da CHD lançada com data até o dia dado, **por turma e
  por disciplina da turma**; hoje as views só oferecem a soma total.
- **Atribuição prevista do instrutor** (FR-013): a linha de `vw_instrutor_carga_prevista`, com ano e
  janela tirados da linha da turma → da disciplina → da turma, e média semanal pela `RN-DIST-02`.

---

## 6. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das telas da aplicação e o login mostram a faixa Beta, e 0 rotas de impressão a
  mostram.
- **SC-002**: 0 datas exibidas sem o ano ou em ISO, nas telas, no papel e na planilha (Q-9), medido pela
  guarda reforçada.
- **SC-003**: O DSA da C-Ap-FR 2026 na semana de 12/10/2026 mostra **"Semana 28 de 37"** na tela e no
  papel (hoje, "Nº 26"); a ficha dela mostra *"a turma tem 37 semanas e o curso, 35"*; e nenhuma semana
  de turma alguma mostra N maior que T.
- **SC-004**: Na C-Ap-HN 2026, com a cópia de 17/10/2026, a CH executada do andamento passa de **1.008**
  para **958 TA** (1.008 − 50 lançados depois de hoje), e a soma da CH executada das disciplinas na
  ficha também deixa de contar esses 50; a situação do DSA da semana em que eles caem continua os
  contando.
- **SC-005**: Admin e Encarregado trocam a situação de uma turma em até **2 cliques** a partir da ficha, e
  a troca persiste depois de recarregar.
- **SC-006**: Ao lançar numa disciplina com instrutor atribuído na turma, o instrutor vem preenchido em
  100% dos casos (92 linhas de turma com atribuição na cópia).
- **SC-007**: A CH prevista de 2026 do instrutor de código 15 conta as **4** atribuições (**271 TA**),
  não **1** (114); a view passa a ter **0** linhas com ano nulo e **0** com média semanal nula quando a
  turma tem janela (hoje, 8 e 8).
- **SC-012**: A lista `/turmas` mostra Progresso e Saldo (TA) em 100% das turmas com término e regime, e
  a mesma marca de atraso que o `/inicio` dá à mesma turma.
- **SC-013**: O caso de regressão do dia com 7 TA e bloco que atravessa o almoço passa na tela, no papel
  e na planilha.
- **SC-008**: A ficha do instrutor abre com **0** campos editáveis visíveis (hoje, 207).
- **SC-009**: Telas com filtro abrem recolhidas, e o número do botão é igual ao número de filtros fora do
  padrão (hoje mostra 1 com a tela limpa em três telas).
- **SC-010**: O item ativo da lateral mede contraste suficiente contra o fundo da lateral nos dois temas
  (hoje, 1,01:1 e 1,06:1), pela auditoria de contraste.
- **SC-011**: A verificação completa passa, com o mesmo veredito e a mesma contagem na máquina local e na
  integração contínua (Definition of Done).

---

## 7. Assumptions

- **A-1** (1.9): a contagem começa no **início da turma** também na semipresencial — **confirmado na
  Q-3**; o DSA só existe nas semanas da etapa presencial (D-DSA-2), então a primeira semana com DSA dela
  não é a 1 (FR-009.8).
- **A-2** (1.9): o número da semana **não é gravado**; continua derivado, como hoje. O registro da emissão
  com `ALT` (PR 6 da spec 013) não entra.
- **A-3** (1.9): a semana 1 é a semana ISO que contém o início — a mesma régua (`semanaIsoDe`) de todo o
  DSA.
- **A-4** (1.9): a planilha de contingência acompanha o sistema (FR-009.5) — **confirmado na Q-4**.
- **A-5** (1.12): a ordem estável de dois lançamentos no mesmo TA é a de criação (`criado_em`), e o
  código desempata.
- **A-6** (1.14): "hoje" é `hojeNaCiaara()`; um lançamento de hoje conta como executado (triagem,
  resposta 2).
- **A-7** (1.7): "cascata" de UE são linhas da UE sob a linha da disciplina — o banco não tem
  subunidade.
- **A-8** (1.3): o Admin não digita senha (o cadastro e a redefinição mostram a senha gerada), então são
  só os três campos medidos.
- **A-9** (1.4): o filtro abre recolhido mesmo quando a URL já traz filtro; a contagem no botão é o que
  avisa — **confirmado na Q-17**.
- **A-10**: Os perfis e permissões de hoje não mudam. Nenhum item cria tela nova sem caminho clicável.

---

## 8. Restrições dadas por Bernardo — para o plano

- Só o Bloco 1. Observação de status, TA fora do DSA e arquivar são do **Bloco 2**.
- Domínio em `lib/dominio/` (TS puro); leitura em Server Component; escrita em Server Action com Zod; a
  URL é dona do estado; só tokens existentes.
- Toda tela com caminho clicável; e2e chegando por clique.
- Separar banco de tela (§3).
- O 1.15 só diagnostica e, se não exigir banco, corrige (é o caso: não exige).
- **Duas exceções de banco, as duas pelo portão da regra 9.4** (desenho a Bernardo antes do remoto): a
  do saldo (D-COR-2, autorizada em princípio) e a da CH prevista do instrutor (autorizada na Q-7, em
  17/10/2026). Nenhuma tabela nova. Todo `db push` é precedido de
  `python -m scripts.manutencao.dado_do_remoto --somente-copia`.
- O 1.11 fica **sem objeto**; o caso de regressão entra (Q-8).
- As divergências 2 e 14 da §11 são **só registro** (17/10/2026).

## 9. O que NÃO entra nesta spec

- **Bloco 2**: observação em toda troca de status (D-COR-4), TA fora do DSA (D-COR-3), arquivar
  (D-COR-5), dashboard de turmas. **Blocos 3 a 6**: nada.
- A **impressão do DSA no modelo atual** (desconsiderada na triagem, resposta 10).
- Preencher `tecnica_ensino_sugerida` nas UEs (é dado, não código).
- Corrigir a grade sem relógio (`GradeNumerada`) — o defeito é latente (§11).
- Corrigir o cadastro de `duracao_semanas` dos cursos — é dado, de Bernardo; o bloco só **avisa** na
  ficha da turma (FR-009.7).
- Investigar a C-Exp-Obs-ME 2026 concluída antes do término e a disciplina II em 64/65 (divergência 2), e
  o valor de `NEXT_PUBLIC_AMBIENTE` em Production (divergência 14).

---

## 10. Regras e decisões anteriores que este bloco muda

> Medido: **o documento 04 não tem regra sobre a numeração do DSA** — varrido por "numera", "Nº",
> "sequencial por turma" e "semana 0": zero ocorrências. A convenção CRONOS **não cita regra do
> documento 04**; ela vem de decisões da spec 013. A autorização nominal de Bernardo de 16/10/2026 cobre
> as mudanças abaixo, e elas ficam listadas para que nenhuma passe calada.

| O que muda | De onde vinha | Decisão que muda |
|---|---|---|
| Semana sem aula **passa a consumir** número | `Q-3` e `D-7` da spec 013; prática `P-6` de `praticas-da-planilha.md` (a aba CRONOS); `numero-do-dsa.ts` | **D-COR-1** |
| O motivo *"Nenhuma semana desta turma tem lançamento até aqui"* deixa de existir | `MOTIVO_SEM_SEMANA_COM_AULA`, `numero-do-dsa.ts:102-103` | **D-COR-1** |
| "Número sequencial da semana" do cabeçalho passa a ser "Semana N de T" | `RF-DSA-06` e `RF-PDF-01` (documento 02) — **compatível**: continua sendo número sequencial da semana | **D-COR-1** |
| Os dias úteis do saldo passam a contar de **amanhã** | `diasUteis_` da v1.0, inclusivo em hoje, conferido por Bernardo em 04/10/2026 (`andamento-da-turma.ts:99-103`); `RF-INI-01` | **D-COR-2** |
| A executada do andamento **e** da tabela de disciplinas da ficha passa a cortar em hoje | `RN-CRONOS-01` (*"a execução real é a soma dos registros efetivamente lançados"*) passa a ler, nesses dois lugares, *"lançados com data até hoje"* | **D-COR-2**, alcance da **Q-5** |

O que **não** muda:
- `RN-DIST-01` — a semana ISO continua com um ponto único (`semanaIsoDe`).
- `FR-028.1` da spec 013 (*"MUST NOT existir corte por data no cálculo"*) — a situação do DSA continua
  acumulada até a semana mostrada (Q-5).
- `RN-DIST-02` — o FR-013.3 a **aplica** (carga ÷ semanas da janela quando não há carga semanal
  cadastrada); não a altera.
- `RN-INST-04` — a CH prevista continua *"derivada das disciplinas em que ele está designado"*; o
  FR-013 só faz a designação que já existe ser contada no ano certo.

## 11. Divergências encontradas — listadas, não corrigidas

1. **`duracao_semanas` menor que a turma** em C-Ap-FR/HN (35 × 37), C-Espc-FR/HN (42 × 44) e C-Esp-ME
   (18 × 20); **12 de 24** cursos sem duração. É dado; a Q-1 decidiu como a tela se comporta (FR-009.3 e
   o aviso do FR-009.7).
2. **C-Exp-Obs-ME 2026** foi marcada **concluída em 06/10/2026 às 16:23**, três dias antes do término
   (09/10), na hora da carga dela; e a disciplina II mostra **64 de 65 TA, "Atrasada"**, numa turma
   concluída. **Só registro, fora deste bloco** (Bernardo, 17/10/2026).
3. **`vw_instrutor_carga_prevista` ignora o período por turma** que a spec 010 criou
   (`turma_disciplina.previsao_inicio`). É o FR-013; listado aqui porque é desenho de view anterior.
4. **Dois donos da aba padrão do curso**: `contrato.ts:794-802` e `AbasDoCurso.tsx:38`.
5. **A contagem do filtro discorda do "Limpar filtros"** onde o padrão não é vazio. Corrigido no FR-004.
6. **Segundo formatador de data e segunda lista de dias da semana** em `grade-do-papel.ts:90,98` e
   `preenchimento.ts:71`.
7. **Grade sem relógio com `rowSpan` que ignora o almoço** (`grade-dsa.tsx`, `GradeNumerada`) — latente,
   inalcançável hoje.
8. **O segundo lançamento no mesmo TA some** da grade, do papel e da planilha, e conta na CH; a nota da
   `PEND-DSA-SUGESTAO` dizia outra coisa. Corrigido no FR-012.3.
9. **0 de 587 UEs com técnica sugerida** — a sugestão de técnica não terá efeito até haver dado.
10. **A planilha sabe da falha da leitura de atribuições** (`FALHA_CONHECIDA_DO_DSA`,
    `planilha/leitura.ts:75`) e lê do jeito certo; a tela não.
11. **Casos de ponta a ponta que não provam a troca de status**: `tests/e2e/turmas.spec.ts:297-313` e
    `:391-412` leem o valor do `<select>` depois de escolher, que é estado local — passariam sem gravar.
12. **Asserção de RLS que não discrimina**: `tests/invariantes/rls/cursos-e-turmas.test.ts:564-576`
    confere só `error === null`, e um `UPDATE` barrado pela RLS também devolve `error` nulo (gotcha 4).
13. **Gravar a turma não dá aviso de sucesso** (`FormularioDeTurma.tsx:176`). Corrigido no FR-015.2.
14. **`NEXT_PUBLIC_AMBIENTE` fora de `preview`/`producao` mostra "AMBIENTE LOCAL"** (`lib/ambiente.ts:137-140`);
    o repositório não diz qual valor o escopo Production tem. **Só registro, fora deste bloco** (Bernardo,
    17/10/2026); a faixa Beta aparece em Production independentemente desse valor (FR-001.4).
15. **ISO latente** em `lib/dominio/dsa/itens-da-disciplina.ts:97` (*"aplicada em <ISO>"*), sem consumidor
    hoje.
16. **`vw_carga_horaria_turma` usa `current_date` em lugar nenhum hoje, mas a ficha já registra a
    divergência UTC × São Paulo** (`turmas/[turma]/page.tsx:85-90`); por isso o FR-014.3.
17. **A ficha do instrutor esconderia Desativar e Excluir junto com o formulário**, porque eles moram no
    rodapé dele (`instrutores/[codigo]/page.tsx:302-314`). Tratado no FR-010.2.
18. **A média semanal da CH prevista é calculada na view, em SQL** (`tempos_previstos / semanas`), e a
    distribuição semanal vive em `lib/dominio/distribuicao-semanal.ts` — a `RN-DIST-01` pede uma
    implementação só. É anterior a este bloco; o FR-013.3 não pode piorá-la (achado da clarify, 17/10/2026).
19. **As 8 atribuições sem ano são as mesmas 8 sem média semanal** — hoje elas não entram nem na CH
    prevista do ano nem no alerta de faixa da ficha (achado da clarify; tratado no FR-013.3).

---

## 12. As perguntas — ✅ **AS 17 RESPONDIDAS em 17/10/2026** (registro na seção Clarifications)

> As opções ficam abaixo como foram feitas, para que a escolha se leia contra as alternativas. As três que
> bloqueavam o plano (Q-1, Q-5, Q-7) foram respondidas e os marcadores saíram do corpo.

### Q-1 — Qual é o T de "Semana N de T" quando a duração do curso é menor que a turma? *(FR-009.3)* · ✅ **RESPONDIDA: opção C**

**Contexto:** C-Ap-FR/HN 2026 duram 35 semanas no cadastro do curso e a turma tem 37 semanas corridas;
C-Espc-FR/HN, 42 × 44; C-Esp-ME, 18 × 20. Nenhuma dessas semanas é inteira de feriado.

| Opção | Resposta | Implicações |
|---|---|---|
| A | T = `duracao_semanas`, ao pé da letra | O fim da C-Ap-FR sai **"Semana 37 de 35"** |
| B | T = semanas corridas da turma (início → término); `duracao_semanas` só quando falta o término | N nunca passa de T; o cadastro do curso deixa de mandar no T |
| C | T = `duracao_semanas`; quando a turma for mais longa, T = semanas da turma, **e** a ficha da turma ganha um aviso de cadastro *"a turma tem 37 semanas e o curso, 35"* | Respeita a D-COR-1 sempre que o cadastro é coerente, nunca imprime N > T, e expõe a divergência para ser corrigida |

**Recomendação: C.**

### Q-2 — O que acontece com o "Nº" e com a semana ISO? *(FR-009.2)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | "Semana N de T" **substitui** "Nº" e "Semana 41/2026" no cabeçalho e no rodapé; a semana ISO fica só na URL; a navegação mostra "Semana N de T" e as datas | Um número só no papel; 14 suítes do DSA trocam o texto esperado |
| B | O papel mostra "Nº N" **e** "Semana N de T" | Dois números iguais lado a lado |
| C | Mantém a semana ISO ("Semana 41/2026") e troca só o Nº | Três números na tela, dois no papel |

**Recomendação: A.**

### Q-3 — Na semipresencial, a contagem começa no início da turma ou da etapa presencial? · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | No início da **turma** (D-COR-1 ao pé da letra) | A C-ApA-AuxNav-PR-SP T2 2026 (início 03/08, etapa presencial 12/10–23/10) tem o primeiro DSA na **Semana 11 de 13** |
| B | No início da **etapa presencial** | O primeiro DSA é a Semana 1 de 2; T deixa de ser a duração do curso |

**Recomendação: A.**

### Q-4 — (registrada como premissa A-4) A planilha de contingência acompanha? · ✅ **RESPONDIDA: acompanha**

Se a resposta for *não*, a suíte da spec 015 tem de ser emendada para deixar de comparar o número da
planilha com o do sistema. **Recomendação: acompanha** (FR-009.5).

### Q-5 — Até onde vai o "até hoje" da D-COR-2? *(FR-014.4)* · ✅ **RESPONDIDA: opção B**

**Contexto:** o `FR-028.1` da spec 013 proíbe corte por data na situação do DSA; e a ficha da turma
confere a executada da turma contra a soma das disciplinas (`DisciplinasDaTurma.tsx:257`).

| Opção | Resposta | Implicações |
|---|---|---|
| A | Só o andamento da turma (CH executada, %, restante, saldo) no `/inicio` e na ficha | A tabela de disciplinas da ficha continua somando tudo, e a conferência *"sem unidade de ensino"* passa a misturar duas bases — um número errado na tela |
| B | O andamento **e** a tabela de disciplinas da ficha; o DSA continua *"acumulado até a semana mostrada"* (`FR-028.1` da spec 013 preservado) | A ficha fica coerente; o DSA mantém a semântica dele, que é por semana |
| C | Tudo, inclusive a situação do DSA | Revoga o `FR-028.1` da spec 013; numa semana futura, o DSA deixaria de mostrar o lançado nela |

**Recomendação: B.**

### Q-6 — "Vale na lista": a lista `/turmas` ganha o saldo? · ✅ **RESPONDIDA: opção A**

**Contexto:** a lista não mostra saldo hoje; o plano diz *"Vale em /inicio, na ficha e na lista"*.

| Opção | Resposta | Implicações |
|---|---|---|
| A | A lista ganha as colunas **Progresso** e **Saldo (TA)**, pela mesma função | Terceiro consumidor de `andamentoDaTurma` (a guarda o admite); a lista passa a ler a carga de todas as turmas |
| B | "Lista" é a do `/inicio`; `/turmas` não muda | Nada novo |
| C | Fica para o dashboard de turmas do Bloco 2 | Nada novo agora |

**Recomendação: A**, porque o plano pede.

### Q-7 — Instrutor atribuído sem CH prevista: corrigir a view neste bloco? E por qual data? *(FR-013.1)* · ✅ **RESPONDIDA: opção A, neste bloco**

**Contexto:** a correção é na view `vw_instrutor_carga_prevista` — uma **segunda** exceção de banco num
bloco que previa só a do saldo.

| Opção | Resposta | Implicações |
|---|---|---|
| A | Corrigir **neste bloco** (portão 9.4); ano e janela pela ordem: período da **linha da turma** → período da **disciplina** → janela da **turma** | O instrutor de código 15 passa a 271 TA previstos em 2026; os alertas de faixa semanal desses 5 instrutores podem mudar, porque a janela também muda |
| B | Corrigir neste bloco, só com **linha da turma → janela da turma** (ignorar o período do currículo) | A disciplina deixa de influir; a que tem previsão no currículo e não na turma passa a valer a janela da turma |
| C | Levar para o **Bloco 2** e, neste bloco, só a frase na ficha | O número errado continua até lá |

**Recomendação: A.** E, junto, uma linha na ficha para quem é **só habilitado**: *"Habilitação não gera
CH prevista; a CH prevista vem da atribuição na turma (Disciplinas da turma)."* — sem banco.

### Q-8 — Onde você viu "7 TA aparecem como 6"? *(FR-011)* · ✅ **RESPONDIDA: tela do DSA, antes de 08/10 — item sem objeto**

**Contexto:** não reproduzido na cópia de hoje — a tela e a aba PREENCHIMENTO mostram os 7.

| Opção | Resposta | Implicações |
|---|---|---|
| A | Na **tela** do DSA (grade) | Pedir um print; pode ter sido antes da edição de 07/10/2026 |
| B | Na aba **PREENCHIMENTO** da planilha de contingência | Gerar a planilha da mesma data que você usou |
| C | No **cartão de edição** (o "Quantos tempos") | O campo aceita de 1 a 12; conferir o valor que abriu |
| D | Em outra semana ou turma | Dizer qual |

**Recomendação:** responder A–D com um print. Sem reprodução, o item fica **sem objeto** e o caso de
regressão do bloco que atravessa o almoço entra assim mesmo.

### Q-9 — As datas sem ano do papel e da planilha também mudam? *(FR-005.1)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | Sim: o cabeçalho dos dias do papel, a IMPRESSÃO, a CRONOS e o seletor de semana da planilha passam a DD/MM/AAAA | "Todo o sistema" ao pé da letra; a asserção de uma página A4 tem de continuar passando |
| B | Só as telas; o papel e a planilha mantêm DD/MM sob um "Período" que já traz o ano | Menos texto no papel; fica uma exceção à decisão |

**Recomendação: A.**

### Q-10 — Página do curso: a ordem das abas e a cor do Desativar *(FR-006)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | *Sobre o Curso* vira a **primeira** aba e a padrão; os três botões têm o mesmo tamanho e Desativar mantém a cor de ação destrutiva | Mesmo tamanho, sem perder o aviso visual do destrutivo |
| B | Só muda a padrão; a ordem continua Grade · Sobre · Avaliações; os três com a mesma variante | A aba aberta não é a primeira da fila |

**Recomendação: A.**

### Q-11 — O gráfico de pizza com mais de 5 disciplinas *(FR-007.2)* · ✅ **RESPONDIDA: opção A**

**Contexto:** o componente de pizza recusa mais de 5 fatias (regra do design system, `tipos.ts:68`); um
curso tem dezenas de disciplinas.

| Opção | Resposta | Implicações |
|---|---|---|
| A | As **4 maiores** e uma fatia **"Outras (N)"** | Respeita o teto; a lista em texto abaixo do gráfico mostra todas |
| B | Subir o teto só para este gráfico | Pizza com fatias ilegíveis; abre exceção na regra do componente |
| C | Pizza só com até 5 disciplinas; barras acima disso | Duas formas na mesma tela |

**Recomendação: A.**

### Q-12 — O cartão novo do DSA vale também para o papel e a planilha? *(FR-008.2)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Só a tela** | O papel continua o documento assinado de hoje (`RNF-COMP-01`); a planilha continua igual ao papel |
| B | Tela, papel e planilha | Muda o documento oficial e os testes que comparam a planilha com o papel |

**Recomendação: A** — a triagem desconsiderou mexer na impressão do DSA (resposta 10).

### Q-13 — Ficha do instrutor: onde ficam Desativar e Excluir? E o alcance na disciplina *(FR-010)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | Uma barra no topo da ficha: **Editar · Desativar/Reativar · Excluir**, como a do curso (FR-006); na disciplina, as avaliações do currículo também em leitura com Editar | Padrão único nas três fichas; os casos do `instrutores.spec.ts` que usam o rodapé mudam |
| B | Os três dentro do recolhível | Desativar some até alguém clicar em Editar |

**Recomendação: A.** Os painéis de período e de instrutores **da linha da turma** ficam como estão (são
do Bloco 2).

### Q-14 — Como a situação fica à mão? *(FR-015.1)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | Um botão **"Trocar situação"** ao lado do selo do cabeçalho, com um diálogo só com a situação e uma Server Action própria | Dois cliques; é o mesmo diálogo que o Bloco 2 estende com a observação (D-COR-4) |
| B | "Editar turma" sobe para o topo da ficha e abre com o foco na Situação | Um clique, mas o formulário inteiro se abre para trocar um campo |
| C | Os dois | Dois caminhos para a mesma coisa |

**Recomendação: A.**

### Q-15 — A faixa Beta substitui a faixa de ambiente? *(FR-001.1)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Uma faixa só**, com o texto Beta; em local e preview ela acrescenta o ambiente (*"· ambiente local"*, *"· pré-visualização"*) | Ninguém confunde ambiente, e não há duas faixas |
| B | Duas faixas em local e preview | Mais altura fixa no topo |
| C | A Beta substitui e o aviso de ambiente some | Perde-se a marca de que o preview é dado sintético |

**Recomendação: A.**

### Q-16 — Que tokens destacam o item ativo? *(FR-002.1)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | Fundo `marca` com texto `marca-contraste` (12,61:1 no claro e 4,52:1 no escuro, medidos) | Destaque forte e inequívoco; o hover continua `marca-suave` |
| B | Fundo `superficie` (o da página) com o traço `marca` mais grosso | Destaque discreto; contraste do fundo com a lateral a medir |

**Recomendação: A.**

### Q-17 — Filtros: abrir sozinho quando a URL já traz filtro? *(FR-004.1)* · ✅ **RESPONDIDA: opção A**

| Opção | Resposta | Implicações |
|---|---|---|
| A | Sempre recolhido; o número no botão avisa | Ao pé da letra; quem recebe um link filtrado vê o número, não os campos |
| B | Recolhido, mas abre quando há filtro fora do padrão | Quem abre limpo vê recolhido; quem chega filtrado vê os campos |

**Recomendação: A** (premissa A-9).

---

## 13. Perguntas novas, levantadas pelas respostas — ✅ **AS 4 RESPONDIDAS em 17/10/2026**, todas pela recomendação (registro na seção Clarifications)

> As opções ficam abaixo como foram feitas.

### NQ-1 — A execução "até hoje" vale também em `/disciplinas` e na aba Avaliações da turma? *(FR-014.4)* · ✅ **RESPONDIDA: opção A**

**Contexto (medido na clarify):** a execução por disciplina sai de `vw_disciplinas_execucao`, lida em
quatro lugares: a tabela de disciplinas da ficha da turma (que a Q-5 já cortou em hoje), a aba
**Avaliações** da turma (`consulta-de-avaliacoes.ts:71` — o "cumprido" que diz se a disciplina já começou
ou já terminou, `lib/dominio/avaliacoes/quadro-da-turma.ts:40`), **`/disciplinas`** com a turma escolhida
(`disciplinas/consulta.ts:380`, a CH executada por disciplina) e o **DSA**/planilha (`dsa/leitura.ts:1530`).
Cortar só a ficha faz a mesma disciplina da mesma turma mostrar **dois números** em duas telas.

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Toda tela fora do DSA e da planilha** corta em hoje: ficha (andamento e tabela), aba Avaliações e `/disciplinas` | Uma regra só, que se diz numa frase: *"fora do DSA, executado é até hoje"*; o DSA e a planilha mantêm a semântica de semana/data de referência |
| B | Só a ficha, como respondido na Q-5 | `/disciplinas` e a aba Avaliações seguem somando o futuro; a mesma disciplina mostra dois números |

**Recomendação: A.**

### NQ-2 — O campo *Situação* continua no formulário "Editar turma"? *(FR-015.2)* · ✅ **RESPONDIDA: opção A**

**Contexto:** a Q-14 criou o botão *"Trocar situação"* no cabeçalho. Se o campo continuar também no
formulário, a turma tem dois caminhos para trocar de situação — e a observação de cada troca, que o
Bloco 2 traz (D-COR-4), teria de nascer nos dois, ou um deles passaria por fora dela.

| Opção | Resposta | Implicações |
|---|---|---|
| A | Na **edição**, a situação só se troca pelo botão; o formulário deixa de ter o campo. Na **criação** da turma o campo continua | Um caminho só; os casos de ponta a ponta que trocam a situação pelo formulário (`turmas.spec.ts:297-313`, `:391-412`) passam para o botão — e são justamente os que hoje não provam a gravação |
| B | Os dois caminhos | Duas portas para a mesma ação; o Bloco 2 tem de pôr a observação nas duas |

**Recomendação: A.**

### NQ-3 — Quando o ambiente não está declarado, a faixa mostra só o texto Beta? *(FR-001.4)* · ✅ **RESPONDIDA: opção A**

**Contexto:** hoje, `NEXT_PUBLIC_AMBIENTE` ausente ou desconhecido vira `local` (`lib/ambiente.ts:137-140`).
Com a faixa única da Q-15, isso faria a Production dizer *"· ambiente local"* se a variável não estiver
lá — e o repositório não diz qual valor ela tem (divergência 14).

| Opção | Resposta | Implicações |
|---|---|---|
| A | O acréscimo de ambiente só aparece com `local` ou `preview` **declarados**; ausente ou desconhecido, só o texto Beta | Production nunca diz "ambiente local"; quem roda `pnpm dev` sem a variável também vê só o Beta (`pnpm dev:local` e a suíte já declaram `local`) |
| B | Manter a regra de hoje (ausente = local) | Risco de "ambiente local" em Production |

**Recomendação: A.**

### NQ-4 — A frase de "só habilitado" é por instrutor ou por disciplina? *(FR-013.4)* · ✅ **RESPONDIDA: opção B**

**Contexto:** o pedido original do 1.13 falava de quem *"só está habilitado **na disciplina**"*. O
instrutor de código 15, que é atribuído em 4 disciplinas, tem **2** habilitações sem atribuição nenhuma
(C-Ap-HN IV e C-Espc-HN `HN-1114-0730`).

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Por instrutor**: a frase aparece só quando ele não tem nenhuma atribuição que conte no ano | O instrutor 15 não veria a frase; as duas habilitações sem atribuição não são explicadas |
| B | **Por disciplina**: na lista de habilitações da ficha, cada disciplina habilitada **sem** atribuição no ano leva a marca *"só habilitado — não gera CH prevista"*, e a frase explica onde se atribui | Responde à dúvida do 1.13 para qualquer instrutor, inclusive o 15 |

**Recomendação: B.**
