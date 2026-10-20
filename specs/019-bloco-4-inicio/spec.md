# Feature Specification: Bloco 4 — a página de Início

**Feature Branch**: `feat/BLOCO-4-inicio`

**Created**: 20/10/2026

**Status**: Draft — specify e clarify em 20/10/2026, pelo `/corrigir` (um pedido = uma spec = um PR = uma conferência;
as dúvidas são decididas pela recomendação e conferidas por Bernardo no fim): 17 decisões adotadas por padrão (C-1 a
C-17, seção Clarifications).

**Input**: o pedido de Bernardo Villas Boas de 20/10/2026 — *"Bloco 4 do plano de correções — a página de Início,
tudo num PR só"* — e o Bloco 4 de `docs/correcoes/plano-de-correcoes-em-blocos.md` (itens 1 a 4).

> **Leia antes desta página:** `triagem.md` (os itens, medidos).

> ⚠️ **ONDE CADA NÚMERO DESTA SPEC FOI MEDIDO** (regra 9.2): código na `main` `747b78b`; dado no **remoto, só
> leitura**, em 20/10/2026 (consulta em `triagem.md`).

---

## 1. O problema, em uma frase

O Início mistura turmas de todos os anos (a planejada de 2027 entra nos números de 2026), mostra as turmas numa coluna
sem barra de progresso, não diz o que está lançado no DSA da semana, e a lateral só leva às listas — para chegar a um
curso ou a uma turma é preciso abrir a lista e procurar.

## 2. Paridade ou novidade (Princípio X)

- **Item 1 (o ano)** — correção de recorte: o painel de Turmas do Bloco 2 já tem a régua de ano; o Início não. Paridade
  com a própria v2.1.
- **Itens 2, 3 e 4 (carrosséis e submenu)** — melhoria de navegação e de leitura, sem regra de negócio nova: nenhuma
  conta muda (o progresso é `andamentoDaTurma`, a semana do curso é `semanaDoCurso`, o que conta como DSA é o que o DSA
  já mostra). Pedido nominal de Bernardo Villas Boas, 20/10/2026.
- **Item 5** — regra existente (`lib/dominio/dsa/ead-puro.ts`, item 9 da conferência do PR #40).

## 3. O que é banco e o que é só tela

**Nada é banco.** O ano é filtro de leitura sobre `ano_letivo`; o resumo do DSA sai de `vw_ocupacao_ta` (uma leitura da
semana, todas as turmas); o submenu lê `cursos` e `turmas` pela RLS de sempre. **Sem migration.**

## Clarifications

### Session 2026-10-20 *(todas adotadas por padrão — Bernardo confere no fim)*

- C-1 · Q: Como se escolhe o ano do Início? → A: Pela **mesma régua do painel de Turmas** (Bloco 2): `?ano=` na URL;
  vazio ou inválido = o ano vigente em São Paulo (`anoDoPainel`); o seletor oferece os anos das turmas e o vigente
  (`anosDoSeletor`), com o vigente limpando o parâmetro. — FR-001
- C-2 · Q: O ano filtra o quê? → A: **Tudo o que é turma no Início**: os números, os cartões, a região de atraso e os
  alertas de teto e de vista (que já seguem o panorama). O filtro de classificação e modalidade continua e se combina
  com o ano. — FR-001
- C-3 · Q: O carrossel de turmas mostra quantos cartões por vez? → A: **Um trilho horizontal com encaixe**: cabem
  quantos a largura deixar (um no celular, três ou mais no computador), e cada passo avança **um cartão**; no fim,
  volta ao começo. Alternativa: um cartão por vez em qualquer tela. — FR-002
- C-4 · Q: De quanto em quanto tempo ele passa sozinho? → A: **6 s** o de turmas e **8 s** o de DSA (a manchete tem
  mais texto). É ritmo de tela, não parâmetro normativo (regra 8 não se aplica). — FR-004
- C-5 · Q: Como se para o movimento? → A: **Pausa** ao apontar e ao focar qualquer coisa dentro do carrossel, e um botão
  **Pausar/Continuar** sempre visível (WCAG 2.2.2: movimento automático com mais de 5 s precisa de pausa). Com *"reduzir
  movimento"* do sistema, **não passa sozinho** e a rolagem não é suave; as setas continuam. — FR-004
- C-6 · Q: E pelo teclado? → A: Os botões *Anterior*, *Próximo* e *Pausar* são alcançáveis por `Tab`; com o foco dentro
  do carrossel, **← e →** passam o cartão; os cartões são links e entram na ordem do `Tab`. — FR-004
- C-7 · Q: O que o cartão da turma mostra? → A: Curso · turma, nome do curso e ano, a situação, a **barra de progresso**
  (o percentual de `andamentoDaTurma`, com o número no atributo e por escrito), `executada/prevista TA` e o selo *em
  atraso*; abaixo, *DSA da semana* ou o aviso de turma EAD. A ordem dos cartões é a de hoje (por curso). — FR-002
- C-8 · Q: Quais turmas "têm DSA nesta semana"? → A: A turma **não arquivada, não cancelada, não EAD pura**, com início
  e término cadastrados cobrindo algum dia de segunda a sábado da semana atual; a **semipresencial** entra se a semana
  toca a etapa presencial — e entra também **sem etapa cadastrada**, porque o DSA dela aparece com aviso (`D-DSA-2`).
  — FR-003
- C-9 · Q: O carrossel de DSA segue o seletor de ano? → A: **Não**: é a semana de **hoje** (`semanaDoPainel`), em
  qualquer ano escolhido; segue o filtro de classificação e modalidade. — FR-003
- C-10 · Q: O que a manchete do DSA diz? → A: **"Semana do curso: N de T"** (`campoDaSemanaDoCurso`, o mesmo texto do
  cabeçalho do DSA), a turma e o curso, e o resumo do lançado — as datas da semana vão **no título da seção**, que é o
  mesmo para todas as manchetes: **TA lançados**, em quantos **dias**, de quantas **disciplinas**, e quantas
  **avaliações** e **atividades** — ou *"Nada lançado nesta semana ainda"*; e o link **Abrir o DSA** da turma (a semana
  atual é a padrão do DSA). — FR-003
- C-11 · Q: Atividade global entra no resumo? → A: **Sim**, na turma cuja janela contém o dia: ela aparece no DSA
  daquela turma. (Medido: 0 globais no remoto em 20/10/2026.) — FR-003
- C-12 · Q: Como o submenu abre? → A: *Cursos* e *Turmas* ganham um **botão de expandir** ao lado do link (que continua
  levando à lista); a **classificação** e o **curso** de *Turmas* também expandem; o aberto/fechado é estado de tela
  (não vai para a URL), e o ramo da página atual **abre sozinho**. — FR-005
- C-13 · Q: E com a lateral recolhida? → A: Recolhida, a lateral mostra só os ícones, e *Cursos* e *Turmas* continuam
  links para as listas; os botões de expandir e as sublistas aparecem **com a lateral expandida** (apontar, foco de
  teclado ou fixada) e **sempre** na gaveta do celular. — FR-005
- C-14 · Q: Que cursos e turmas entram no submenu? → A: **Cursos em oferta** (ativos), por classificação, pela sigla (o
  nome no título do link); **turmas não arquivadas**, de qualquer situação e ano, por curso, as mais novas primeiro, pelo
  rótulo e o ano. Tudo pela RLS — cada perfil vê o que alcança. — FR-005
- C-15 · Q: O item ativo do submenu? → A: Marcado como as entradas do menu (`aria-current="page"`, traço e peso): o
  curso em `/cursos/<sigla>` e nas páginas abaixo dele; a turma em `/turmas/<código>` e abaixo (o DSA). — FR-005
- C-16 · Q: O submenu se atualiza quando nasce um curso ou uma turma? → A: O layout não é redesenhado na navegação por
  clique, então as ações que mudam a lista — **criar curso, desativar/reativar curso, criar turma, arquivar e
  desarquivar turma** — passam a revalidar o layout. — FR-005
- C-17 · Q: O DSA no papel ou a numeração mudam? → A: **Não** — o merge segue a conferência, sem esperar a virada de
  semana. — FR-006

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — O Início do ano vigente (Priority: P1)

Quem entra no Início vê as turmas **do ano vigente**: os números, os cartões e os alertas dizem respeito ao ano; a
turma planejada do ano seguinte só aparece escolhendo esse ano.

**Independent Test**: com turmas em dois anos, o Início abre no ano vigente e não conta a do ano seguinte; escolher o
ano seguinte mostra só ela.

**Acceptance Scenarios**:

1. **Given** turmas de 2026 e uma planejada de 2027, **When** o Início abre, **Then** os números e os cartões são só de
   2026, e o seletor marca 2026.
2. **Given** o Início, **When** se escolhe 2027, **Then** a URL ganha `?ano=2027`, e só a turma de 2027 aparece.
3. **Given** `?ano=abc`, **When** a página abre, **Then** vale o ano vigente.

### User Story 2 — Os cartões das turmas em carrossel (Priority: P1)

Os cartões das turmas do ano, com barra de progresso, passam sozinhos; a pessoa pode pausar, voltar e avançar, por
mouse ou teclado; com *"reduzir movimento"*, nada se move sozinho.

**Independent Test**: o carrossel avança sozinho; apontar ou focar pausa; ← e → passam; *Pausar* para; com movimento
reduzido, não avança.

**Acceptance Scenarios**:

1. **Given** o Início, **When** se espera o intervalo, **Then** o carrossel avança um cartão.
2. **Given** o ponteiro sobre o carrossel ou o foco num cartão, **When** passa o intervalo, **Then** ele não avança.
3. **Given** o foco no carrossel, **When** se aperta →, **Then** passa ao cartão seguinte; ← volta.
4. **Given** *"reduzir movimento"* ligado, **When** se espera, **Then** ele não avança, e as setas funcionam.
5. **Given** um cartão, **Then** ele mostra a barra de progresso com o percentual por escrito e no atributo.

### User Story 3 — Os DSA da semana como manchetes (Priority: P1)

Um carrossel com as turmas que têm DSA nesta semana, uma por vez: semana do curso, turma, o que está lançado e o link
para abrir o DSA.

**Independent Test**: uma turma presencial com aula lançada nesta semana aparece com o resumo e o link; uma EAD pura
não aparece; uma fora da janela não aparece.

**Acceptance Scenarios**:

1. **Given** uma turma com aulas nesta semana, **Then** a manchete diz *"Semana do curso N de T"*, os TA lançados, os
   dias e as disciplinas, e *Abrir o DSA* leva ao DSA dela.
2. **Given** uma turma EAD pura em andamento, **Then** ela não aparece no carrossel de DSA.
3. **Given** uma turma com DSA na semana e nada lançado, **Then** a manchete diz *"Nada lançado nesta semana ainda"*.
4. **Given** nenhuma turma com DSA na semana, **Then** o lugar do carrossel diz que não há DSA nesta semana.

### User Story 4 — O submenu na lateral (Priority: P2)

Pela lateral: *Cursos* → classificação → curso abre a página do curso; *Turmas* → curso → turma abre a ficha. O ativo
fica marcado, a lateral recolhida continua funcionando, e as arquivadas não aparecem.

**Independent Test**: expandir *Turmas* → o curso → a turma abre a ficha, marcada como ativa; uma turma arquivada não
está na lista; recolhida, a lateral mostra só os ícones e *Turmas* continua levando à lista.

**Acceptance Scenarios**:

1. **Given** a lateral expandida, **When** se expande *Cursos* e a classificação, **Then** os cursos dela aparecem, e
   clicar num abre a página do curso.
2. **Given** a ficha de uma turma, **Then** o ramo *Turmas* → o curso dela está aberto e a turma está marcada.
3. **Given** uma turma arquivada, **Then** ela não está no submenu.
4. **Given** a lateral recolhida, **Then** os botões de expandir e as sublistas não aparecem, e *Cursos* e *Turmas*
   continuam links para as listas.

### Edge Cases

- Ano sem turma nenhuma → o vazio diz que não há turma nesse ano (distinto de "a base não tem carga").
- Uma turma só no carrossel → sem setas nem movimento (não há para onde ir).
- Turma sem duração de curso → a semana do curso sai sem o T, como no DSA.
- Turma semipresencial com a semana fora da etapa presencial → fora do carrossel de DSA.
- Perfil com recorte → o submenu e os carrosséis só têm o que a RLS entrega.

## Requirements *(mandatory)*

### FR-001 — O ano

- **FR-001.1**: O Início MUST mostrar as turmas do ano letivo escolhido, com padrão o ano vigente (São Paulo) e o ano na
  URL (`?ano=`), pela régua de `anoDoPainel`/`anosDoSeletor`.
- **FR-001.2**: Números, cartões, região de atraso e alertas de teto e de vista MUST seguir o ano (C-2).

### FR-002 — O carrossel das turmas

- **FR-002.1**: As turmas do ano MUST aparecer como cartões num carrossel, com barra de progresso (C-3, C-7).
- **FR-002.2**: Cada cartão MUST levar à página do curso na aba Grade com a turma (como hoje) e, fora dele, ao DSA da
  semana ou ao aviso de EAD.

### FR-003 — O carrossel dos DSA da semana

- **FR-003.1**: O Início MUST ter um carrossel com as turmas que têm DSA na semana atual (C-8, C-9), uma por vez.
- **FR-003.2**: Cada manchete MUST ter a semana do curso, a turma, as datas, o resumo do lançado e o link para o DSA
  (C-10, C-11).
- **FR-003.3**: Turma EAD pura MUST NOT entrar.

### FR-004 — O comportamento dos dois carrosséis

- **FR-004.1**: Os dois MUST passar sozinhos (C-4), com setas, pausa ao apontar e ao focar, botão Pausar/Continuar,
  teclado (C-5, C-6) e sem movimento automático com *"reduzir movimento"*.
- **FR-004.2**: Os dois MUST ser o mesmo componente, sem pacote novo.

### FR-005 — O submenu da lateral

- **FR-005.1**: *Cursos* MUST expandir em classificação → curso, e *Turmas* em curso → turma, dentro da lateral (C-12,
  C-14).
- **FR-005.2**: O item ativo MUST estar marcado (C-15), e o ramo da página atual aberto.
- **FR-005.3**: Recolhida, a lateral MUST continuar só com os ícones e os links das listas (C-13).
- **FR-005.4**: Turmas arquivadas MUST NOT aparecer; cursos fora de oferta também não.
- **FR-005.5**: Criar curso, mudar a situação do curso, criar turma, arquivar e desarquivar turma MUST atualizar o
  submenu (C-16).

### FR-006 — O DSA no papel

- **FR-006.1**: O DSA (tela, papel, planilha e numeração) MUST NOT mudar.

### Key Entities

Nenhuma nova. Lê `turmas`, `cursos`, `vw_carga_horaria_turma`, `vw_ocupacao_ta`, `vw_turmas_arquivadas`.

## Success Criteria *(mandatory)*

- **SC-001**: Com turmas em 2026 e 2027, o Início abre só com as de 2026; `?ano=2027` mostra só a de 2027.
- **SC-002**: O carrossel de turmas avança sozinho, pausa ao apontar, ao focar e pelo botão, anda por ← e →, e não
  anda sozinho com *"reduzir movimento"* — provado por clique e teclado.
- **SC-003**: Uma turma com aula lançada nesta semana aparece no carrossel de DSA com o número de TA e de dias certo; a
  EAD pura e a fora da janela não aparecem.
- **SC-004**: Pela lateral, *Turmas* → curso → turma abre a ficha com a turma marcada; a arquivada não aparece; recolhida,
  a lateral não mostra sublistas.
- **SC-005**: Nenhuma conta muda: o percentual do cartão é o mesmo de antes para a mesma turma.

## Assumptions

- O ritmo dos carrosséis (6 s e 8 s) é decisão de tela.
- O submenu usa a sigla do curso e o rótulo e o ano da turma (o código inteiro repetiria a sigla).

## Out of scope

- Busca na lateral; favoritos; o Bloco 5 e o Bloco 6.
