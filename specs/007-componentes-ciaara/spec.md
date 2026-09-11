# Especificação: Épico 4, fatia (b) — Componentes CIAARA

**Criado**: 10/09/2026 · **Épico**: 4 — Design System · **Fatia**: (b), componentes
**Fontes**: [documento 23](../../docs/fase-2/23-Design-System-Tailwind-shadcn.md) §3.1, §3.2, §4, §5,
§7 e §8 · [spec 005](../005-design-system-tokens-e-tema/spec.md) e seus contratos ·
[checklist de acessibilidade e entrega](../005-design-system-tokens-e-tema/checklists/acessibilidade-e-entrega.md)
· [spec 006](../006-cadastro-de-instrutores/spec.md), o primeiro consumidor real

## Contexto

O Épico 4 foi subdividido em três fatias. A **(a)** está **mesclada na `main`** desde 10/09/2026
(PR #7): ponto único com 229 declarações de token, dois temas, 23 pares de contraste auditados,
regra de cor bloqueante em duas metades, tipografia auto-hospedada, a vitrine **`/estilo`** e
**quatro** primitivos já copiados — botão, cartão, tabela e emblema — com a reconciliação de 18
variáveis.

Esta é a **(b)**: o **vocabulário de componentes**. A **(c)**, shell e estado de navegação na URL,
vem depois.

⚠️ **Esta fatia é a que destrava o Épico 5.** A spec 006, instrutores, está **completa e bloqueada**
por decisão de 09/09/2026 justamente à espera dela. Ela é o primeiro consumidor real, e é ela que
prova se os componentes nasceram genéricos ou moldados a uma tela.

### O que NÃO entra, porque já existe

| Item | Onde já está |
|---|---|
| Paleta, tokens, dois temas | `app/globals.css`, fatia (a) |
| Regra de cor bloqueante | `eslint.config.mjs`, fatia (a) |
| Auditoria de contraste | fatia (a), 23 pares |
| Botão, cartão, tabela, emblema | `components/ui/`, fatia (a) |
| Vitrine | `app/estilo/`, fatia (a) |

## Clarifications

### Session 2026-09-10

- Q: As três grades densas entram nesta fatia? → A: **Nenhuma.** Pertencem aos Épicos 6 e 7, que são quem as usa. **Componente moldado a uma tela não é Design System, é antecipação** — a mesma regra que decidiu a dependência do Épico 5.
- Q: A documentação viva fica na vitrine ou entra ferramenta dedicada? → A: **Na vitrine `/estilo`**, sem ferramenta nova. Zero dependência acrescentada, e o teste que exige todo token aparecer lá estende-se a componente.
- Q: O seletor de instrutor **ordena** a lista que recebe, ou só exibe uma já ordenada? → A: **Ordena sempre**, aplicando a função pura de domínio e ignorando a ordem de chegada. Ponto único que aceita qualquer ordem não garante nada.
- Q: Qual biblioteca de ícones, já que o documento 23 deixou a pendência §11.2 aberta? → A: **A que acompanha o shadcn**, versionada e sem rede externa. **Fecha a pendência §11.2.**
- Q: A tabela densa renderiza só as linhas visíveis quando a lista for grande? → A: **Não — renderiza todas.** Os volumes reais não pedem isso, e a complexidade brigaria com a navegação por teclado.
- Q: Impresso em preto e branco, o que distingue uma série da outra? → A: **Forma e rótulo.** Medido: no tema claro as séries 1 e 8 ficam a 0,0003 de luminância; no noturno, a 4 e a 7 a 0,0005. A cor deixa de ser o que distingue.
- Q: Qual traço identifica a borda do campo, se nenhuma cor de borda alcança 3:1? → A: **`--texto-tenue`**, medido em 4,49 no claro e 4,85 no noturno. Nenhuma cor muda, nenhum token nasce. **Fecha a pendência da fatia (a).**
- Q: Quantos dos 21 itens abertos do checklist esta fatia fecha? → A: **Doze, nomeados**: CHK005, CHK006, CHK007, CHK008, CHK009, CHK010, CHK013, CHK014, CHK015, CHK016, CHK017 e CHK018. Mais o CHK003 **em parte**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quem constrói tela não reinventa o vocabulário (Priority: P1)

Quem for construir uma tela de domínio precisa **encontrar pronto** o componente de que precisa —
tabela densa, emblema de status, cartão de indicador, filtro, alerta — em vez de montar o seu e
divergir dos outros.

**Why this priority**: é a razão de existir da fatia. A v2.0 tinha a mesma tabela remontada por
tela, e cada remontagem divergia um pouco. É o defeito que o Design System veio fechar.

**Independent Test**: percorrer o inventário do documento 23 §3.1 e conferir que cada componente
desta fatia existe, está tipado e aparece na vitrine com exemplo.

**Acceptance Scenarios**:

1. **Dado** o inventário do documento 23, **quando** se procura um componente desta fatia,
   **então** ele existe em `components/ciaara/` e tem exemplo na vitrine.
2. **Dado** um componente novo, **quando** ele é escrito, **então** ele **não** acessa banco, **não**
   implementa regra de negócio e **não** declara marcador de cliente por precaução.
3. **Dado** qualquer componente desta fatia, **quando** o lint roda, **então** ele **não** introduz
   cor fora do ponto único.

---

### User Story 2 - O seletor de instrutor é um só, em todo lugar (Priority: P1)

Quem escolhe um instrutor precisa vê-los **sempre na mesma ordem**, e quem constrói tela precisa
que isso aconteça **sem ter de lembrar**.

**Why this priority**: é o `RN-ANT-01`, **Risco: Alto** — a diretriz mais transversal do sistema.
Um **ponto único de construção** transforma "lembrar em cada tela nova" em **impossível de
esquecer**, que é a diferença entre uma regra e uma intenção.

**Independent Test**: procurar no repositório qualquer outra construção de seletor de instrutor; não
deve existir nenhuma.

**Acceptance Scenarios**:

1. **Dado** o repositório, **quando** se busca por construção de seletor de instrutor, **então**
   existe **exatamente um** componente que o faz.
2. **Dado** esse componente, **quando** ele lista instrutores, **então** a ordem é a da antiguidade,
   sem que quem o usa precise pedir.
2.1. **Dado** uma lista **desordenada** entregue ao componente, **quando** ele a exibe, **então** ela
   aparece **ordenada mesmo assim** — a ordem de chegada é ignorada.
3. **Dado** uma tela nova, **quando** ela precisa de seletor de instrutor, **então** usá-lo é o
   caminho mais curto — e construir outro exige esforço deliberado.

---

### User Story 3 - A tabela densa é utilizável só com o teclado (Priority: P2)

Quem trabalha o dia inteiro numa tabela de centenas de linhas precisa navegá-la **sem tirar as mãos
do teclado**, com o foco sempre visível.

**Why this priority**: é o `RNF-USA-06` e o critério 6 do documento 06, adiado da fatia (a) sem
endereço até agora. É também onde acessibilidade fica difícil — e por isso onde ela costuma faltar.

**Independent Test**: percorrer a tabela apenas por teclado e conferir cada movimento previsto no
documento 23 §8.3.

**Acceptance Scenarios**:

1. **Dado** a tabela, **quando** se pressiona a tecla de tabulação, **então** entra-se nela e
   sai-se dela em **um** passo, não célula a célula.
2. **Dado** o foco numa célula, **quando** se usam as setas, **então** move-se célula a célula nas
   duas dimensões.
3. **Dado** o foco numa linha, **quando** se usam início e fim, **então** vai-se à primeira e à
   última coluna da linha.
4. **Dado** uma tabela longa, **quando** se usa página acima e abaixo, **então** salta-se uma tela
   de cada vez.
5. **Dado** qualquer movimento, **quando** ele acontece, **então** o foco é **visível**.

---

### User Story 4 - Os gráficos são legíveis, inclusive impressos em preto e branco (Priority: P2)

Quem lê um gráfico precisa distinguir as séries na tela **e no papel**, porque o Relatório do Curso
e a Ficha do Instrutor são impressos e a impressora nem sempre é colorida.

**Why this priority**: é o documento 23 §7. Uma paleta que só funciona colorida transforma relatório
impresso em mancha cinza, e ninguém descobre isso antes de imprimir.

**Independent Test**: conferir contraste de cada série contra o fundo nos dois temas, e conferir que
cada série traz **marcador de forma própria e rótulo** — a prova é o gráfico continuar legível com a
cor removida.

**Acceptance Scenarios**:

1. **Dado** um gráfico, **quando** ele usa cor, **então** ela vem das oito séries do ponto único —
   nunca de cor escolhida no componente.
2. **Dado** a mesma tela recarregada, **quando** os dados mudam, **então** a **ordem** das cores
   **não** muda. ⚠️ Paleta que reordena conforme os dados faz o leitor reaprender a legenda a cada
   recarga.
3. **Dado** um gráfico, **quando** ele recebe dados, **então** eles chegam **prontos**: a agregação
   é de quem chama, nunca do componente.
4. **Dado** um gráfico **com a cor removida**, **quando** alguém o lê, **então** ainda distingue
   cada série — por forma e por rótulo (`FR-018`). ⚠️ É o caso de quem imprime em preto e branco e
   o de quem não distingue cores, e um único requisito cobre os dois.

---

### User Story 5 - O alerta normativo aparece, e não impede (Priority: P3)

Quem administra precisa **ver** o aviso de teto normativo e de conformidade sempre, sem que ele
bloqueie o trabalho.

**Why this priority**: é o `RNF-USA-04` e o `RN-DEG-02`. O componente que exibe o alerta é desta
fatia; a regra que decide **quando** alertar é do domínio, e não entra aqui.

**Acceptance Scenarios**:

1. **Dado** um alerta, **quando** ele é exibido, **então** ele é anunciado a leitor de tela.
2. **Dado** um alerta de conformidade, **quando** ele é exibido, **então** ele usa **faixa lateral,
   ícone e rótulo textual** — e **nunca** piscar. ⚠️ A v2.0 fazia piscar; o documento 23 §3.1
   substituiu por saliência estática, e reintroduzir movimento desfaz uma correção de
   acessibilidade já feita.
3. **Dado** qualquer componente desta fatia, **quando** ele comunica estado, **então** a cor
   **nunca** é a única codificação.

### Edge Cases

- **Lista vazia**: o componente MUST distinguir *"não há dado"* de *"você não tem permissão de ver"*.
  É o gotcha nº 4 do BRIEF, e o componente que o faz já existe desde o Épico 3.
- **Valor fora do domínio conhecido** — posto desconhecido, status inesperado: aparece numa faixa
  **"Outros"** ao final, **nunca é omitido em silêncio** (`RN-DEG-01`).
- **Tabela sem colunas** ou com uma coluna só: não quebra a navegação por teclado.
- **Tabela com muitas linhas**: renderiza todas (`FR-006.1`). ⚠️ Se algum dia um conjunto real
  chegar inteiro e grande à tela, a decisão de 10/09/2026 precisa ser **reaberta com a medição na
  mão** — não contornada com um limite arbitrário no componente.
- **Gráfico sem dados**: mostra estado vazio, não área em branco sem explicação.
- **Gráfico com mais séries do que formas de marcador**: as formas **repetem** antes de a cor virar
  o único distintivo, e o rótulo junto do traço continua desempatando.
- **Instrutor sem nome de guerra**: o componente de nome degrada para o formato possível, sem
  espaço duplo nem rótulo órfão.
- **Preferência por menos movimento** declarada no sistema: nenhum componente introduz animação
  que a pessoa pediu para não ver.

## Requirements *(mandatory)*

### Functional Requirements

#### Primitivos e reconciliação

- **FR-001**: MUST ser copiados os primitivos que o documento 23 §3.1 nomeia e que ainda não
  existem — entre eles diálogo, diálogo de confirmação, seletor, campo, rótulo, formulário, alerta,
  dica, menu suspenso, área rolável, sobreposição, colapsável, progresso e esqueleto.
- **FR-002**: Cada primitivo novo MUST ter **todas** as suas variáveis de cor reconciliadas com
  tokens CIAARA, e a verificação MUST continuar em **zero órfãs**.
  ⚠️ Sem isso passam a existir **dois** pontos únicos de verdade — a negação do `RF-DS-01` com a
  agravante de parecer cumprido.
- **FR-003**: Nenhuma biblioteca de componentes além da já decidida MUST ser instalada, e a
  verificação existente MUST continuar verde (BRIEF §1).
- **FR-003.1**: A **biblioteca de ícones** MUST ser a que acompanha a base de componentes já
  decidida, **versionada** e **sem depender de rede externa**.
  ⚠️ **Decisão de 10/09/2026, e ela FECHA a pendência §11.2 do documento 23**, que estava aberta
  desde a Fase 2. Ícone não é componente, então não esbarra na proibição do BRIEF §1 — mas é
  dependência, e dependência não decidida é cada componente resolvendo do seu jeito.
  ⚠️ **A alternativa da v2.0 vinha por CDN** — a mesma classe de dependência externa que já quebrou
  a tipografia e que a fatia (a) removeu.
- **FR-003.2**: Nenhum componente MUST desenhar ícone próprio quando existir equivalente na
  biblioteca, e isso MUST ser **verificado por varredura** de desenho vetorial escrito à mão em
  `components/`. ⚠️ Treze componentes desenhando o próprio ícone é a mesma divergência que a paleta
  veio fechar, num vocabulário diferente.

#### Componentes CIAARA

- **FR-004**: MUST existir componente de **indicador** — número grande, rótulo e unidade.
- **FR-005**: MUST existir componente de **emblema de status**, com variante por tom do domínio.
- **FR-006**: MUST existir componente de **tabela densa**, com ordenação, filtro e navegação por
  teclado.
- **FR-006.1**: A tabela MUST renderizar **todas** as linhas recebidas. Renderização parcial por
  janela de visão MUST **não** ser implementada nesta fatia.
  ⚠️ **Decisão de 10/09/2026, e é a mais difícil de reverter desta fatia** — por isso foi decidida
  aqui e não no plano. Os volumes reais não a pedem: 177 instrutores, 175 disciplinas, 29 turmas, e
  o maior conjunto, ~1.753 registros de aula, chega **filtrado por turma e semana**, nunca inteiro.
  O `CLAUDE.md` manda priorizar clareza e manutenibilidade sobre desempenho **porque a base é
  pequena**.
  ⚠️ **E a complexidade brigaria com a acessibilidade**: renderização parcial precisa de artifício
  para que o teclado alcance linha que não está na tela, e o `FR-023` exige justamente isso.
  Complexidade que briga com acessibilidade precisa de um problema **medido**, e não há.
- **FR-007**: MUST existir componente de **filtro avançado**, **genérico**, com filtragem cruzada —
  cada filtro opera sobre o resultado do anterior.
  ⚠️ Ele MUST **não conhecer instrutor**. É o teste de que a fatia entregou vocabulário, e não uma
  tela disfarçada de componente.
- **FR-008**: MUST existir componente de **alerta de conformidade**, sempre visível e anunciado a
  leitor de tela.
- **FR-009**: MUST existir componente de **emblema de teto normativo**, com explicação ao apontar.
- **FR-010**: MUST existir **seletor de turma** e **seletor de instrutor**.
- **FR-011**: O **seletor de instrutor** MUST ser o **único** ponto de construção de seletor de
  instrutor da aplicação, e isso MUST ser verificado por teste (`RN-ANT-01`).
- **FR-011.1**: Ele MUST **ordenar** a lista que recebe, aplicando a função pura de domínio, e MUST
  **ignorar a ordem em que os dados chegaram**.
  ⚠️ **Decisão de 10/09/2026, e é ela que faz a `FR-011` valer alguma coisa.** Um ponto único que
  apenas **exibe** aceita lista desordenada — o esquecimento não desaparece, só muda de lugar. Um
  que **ordena** torna o esquecimento impossível, que é o que uma regra de Risco Alto pede.
  ⚠️ **Isto não fere a fronteira do `FR-020`**: quem **calcula** o peso da antiguidade continua
  sendo função pura de domínio, fora do componente. O componente **aplica**; não decide.
- **FR-012**: MUST existir componente de **nome de instrutor**, no formato
  **`P/G Especialidade/Habilitação Nome Completo`**, com **as palavras do nome de guerra em
  negrito**, alimentado por **função pura de domínio** (`RF-INSTR-15`, `RF-DS-05`).
  ⚠️ **Correção de 10/09/2026, e o erro era meu.** Esta linha dizia
  `P/G Especialidade Nome de Guerra` — uma compressão que **descartava o nome completo** e
  contrariava o `RF-INSTR-15`, que é **[PRESERVADO]**. A spec 006 já concordava com o documento, no
  `FR-027.2`. **Nenhuma regra mudou**: o que mudou foi a transcrição errada dela.
  ⚠️ **O erro é mais antigo que esta spec.** O `CHK016`, escrito na fatia (a), trazia a mesma
  compressão e ainda a chamava de *"vocabulário intraduzível"* — corrigido no mesmo dia.
  ⚠️ **O nome de guerra NÃO substitui o nome completo: marca palavras dentro dele**, e palavras não
  contíguas recebem destaque cada uma. É o porte da spec 020 da v2.0, com seus casos de teste.
- **FR-013**: MUST existir **diálogo de confirmação** para ação destrutiva ou irreversível
  (`RNF-USA-03`).
- **FR-014**: MUST existir marcação de **campo obrigatório** e **esqueleto de carregamento**.
- **FR-015**: O componente de **estado vazio**, que já existe, MUST ser revisado para consumir o
  vocabulário desta fatia.

#### Gráficos

- **FR-016**: MUST existir componente de gráfico para cada um dos **sete tipos** que a spec 006
  nomeia, **genéricos**, recebendo a série **pronta** por propriedade.
  ⚠️ **Agregação é de quem chama, nunca do componente** (documento 24).
- **FR-017**: Todo gráfico MUST usar as **oito séries** do ponto único, em **ordem fixa**.
  ⚠️ Reordenar a paleta conforme os dados faz o leitor **reaprender a legenda a cada recarga**.
- **FR-018**: Todo gráfico MUST distinguir suas séries **por forma e por rótulo**, e MUST continuar
  legível quando a cor é removida — impresso em preto e branco, ou lido por quem não distingue
  cores. Marcador de forma própria por série e rótulo junto do traço, não só na legenda.
  ⚠️ **Decisão de 10/09/2026, e ela SUBSTITUI o que esta linha dizia.** A redação anterior cobrava
  luminâncias distintas entre as oito séries. **Eu medi, e a paleta que já está na `main` não
  entrega isso**: no tema claro a série 1 (`0,0984`) e a série 8 (`0,0987`) ficam a **0,0003** uma
  da outra; no noturno, a série 4 e a série 7 ficam a **0,0005**. Em cinza, cada par vira a mesma
  tinta. O critério reprovaria no primeiro dia — é a mesma armadilha da fatia (a), um requisito meu
  cobrando da paleta o que ela não entrega.
  ⚠️ **Por que não reabrir a paleta:** ela está mesclada, e a premissa 1 desta spec diz que a fatia
  **consome** sem redesenhar. E forma resolve também **na tela**, para quem não distingue cores —
  reespaçar luminância só resolveria no papel.
  ⚠️ **Isto não é requisito novo:** é o `FR-025` — nunca comunicar significado só por cor —
  aplicado ao gráfico.

#### Fronteira — o que estes componentes não fazem

- **FR-019**: Componente de `components/ciaara/` MUST **não** acessar banco.
- **FR-020**: Componente de `components/ciaara/` MUST **não** implementar regra `RN-`. Conflito de
  horário, teto normativo, antiguidade e distribuição de carga são **funções puras de domínio**; o
  componente **exibe o resultado**.
- **FR-021**: Componente MUST **não** declarar marcador de cliente por precaução — só onde há
  interação (documento 23 §3.2).
- **FR-022**: Nenhum componente MUST introduzir cor fora do ponto único.

#### Acessibilidade

- **FR-023**: A tabela densa MUST ser navegável por teclado conforme o documento 23 §8.3:
  tabulação entra e sai em um passo; setas movem célula a célula; início e fim vão à primeira e à
  última coluna; página acima e abaixo saltam uma tela.
- **FR-024**: O foco MUST ser visível em todo elemento interativo.
  ⚠️ **O anel nativo dos primitivos é aceito** desde a emenda de 10/09/2026 ao documento 23 §8.2,
  sob duas condições: foco visível ao teclado e indicador a 3:1. **Remover sem substituir continua
  rejeitado.**
- **FR-025**: Nenhum componente MUST comunicar significado **apenas** por cor.
- **FR-026**: O alerta de conformidade MUST usar **saliência estática** — faixa, ícone e rótulo — e
  MUST **não** piscar.

#### Documentação viva

- **FR-027**: Todo componente desta fatia MUST aparecer na **vitrine `/estilo`**, que já existe, com
  exemplo utilizável. **Nenhuma ferramenta de documentação MUST ser instalada.**
  ⚠️ **Decisão de 10/09/2026.** Ferramenta dedicada seria dependência nova, o que a restrição desta
  fatia proíbe; e a vitrine já cumpre o papel, com um teste que exige **todo token** aparecer nela —
  aqui ele passa a exigir **todo componente**.

#### Requisitos que fecham dívida da fatia (a)

- **FR-028**: Abaixo de **1024px** de largura, conteúdo denso MUST rolar **horizontalmente dentro do
  próprio contêiner**, e a página MUST **não** rolar horizontalmente. Acima disso, a tabela ocupa a
  largura disponível. **Nenhuma versão dedicada a telefone é construída nesta fase** (`RNF-USA-02`).
  *Fecha o `CHK005`.*
  ⚠️ **Correção de 10/09/2026.** Esta linha dizia *"MUST existir requisito escrito de ponto de
  quebra"* — **um requisito que promete que um requisito existe não é requisito**, e o `CHK005`
  reclamava exatamente de *"uso típico em desktop, sem número"*. A redação anterior reproduzia o
  defeito que dizia fechar.
  ⚠️ **1024px não é escolha de gosto**: oito colunas a 14px numa tabela densa ocupam perto de 900px,
  e o `RNF-USA-02` diz que o uso típico destas telas é em tela grande.
- **FR-029**: O requisito de **movimento reduzido** MUST existir como requisito, e não apenas como
  linha de folha de estilo. *Fecha o `CHK009`.*
- **FR-030**: Todo componente desta fatia MUST satisfazer as três, **cada uma verificada**:
  **(a) nome acessível** — todo controle tem nome legível por leitor de tela, e nenhum depende só de
  ícone; **(b) região anunciada** — o alerta de conformidade é anunciado ao mudar, sem roubar o
  foco; **(c) ordem de leitura previsível** — a ordem do documento acompanha a ordem visual.
  *Fecha o `CHK010`.*
  ⚠️ **Correção de 10/09/2026**: a redação anterior dizia *"MUST existir requisito de leitor de
  tela"*, que é a mesma promessa circular do `FR-028`. As três agora são afirmações sobre o
  comportamento, e as três são medíveis na árvore de acessibilidade.
- **FR-031**: Todo uso de `--texto-tenue` em `components/` e `app/` MUST trazer, na linha acima, um
  comentário declarando **o que** ele veste — e o texto declarado MUST ser **estático**: rótulo,
  dica, unidade, cabeçalho ou traço de campo, **nunca valor vindo de propriedade**. Uma verificação
  MUST reprovar o uso sem essa declaração. *Fecha o `CHK013`.*
  ⚠️ **Correção de 10/09/2026**: a redação anterior dizia *"MUST ser verificável"* sem dizer **como**
  — e o `CHK013` reclamava justamente que *"nada distingue dica de dado no código"*. Continuava
  verdade.
  ⚠️ **O mecanismo é o mesmo das isenções da fatia (a)**, que exigem `motivo` obrigatório: a máquina
  não sabe distinguir dica de dado, mas sabe exigir que alguém tenha declarado qual é qual. **Ela
  não valida a frase; ela impede a omissão.**
  ⚠️ **O traço de campo do `FR-032` é um uso legítimo** e declarado — não é texto, e é por isso que
  a regra fala em *"o que ele veste"* e não em *"que texto ele pinta"*.
- **FR-032**: O componente de **campo** desta fatia MUST usar `--texto-tenue` como traço
  identificador, e esse traço MUST atingir o limite de borda interativa nos dois temas.
  ⚠️ **É aqui que a pendência da fatia (a) vence**: ela dizia *"resolve na fatia que construir o
  primeiro campo"*, e esta é. *Fecha o `CHK018`.*
  ⚠️ **Decisão de 10/09/2026, tomada sobre medição.** Medi os catorze tokens de borda da paleta:
  **nenhum** alcança 3:1. O melhor é `--conformidade-borda`, com **2,02** no claro, e
  `--executado-borda`, com **2,23** no noturno. `--texto-tenue` mede **4,49** e **4,85** contra o
  preenchimento do campo, e passa com folga.
  ⚠️ **Nenhuma cor muda e nenhum token nasce.** A regra proíbe cor fora do ponto único; não proíbe
  usar um token do ponto único num papel novo. E `--borda` e `--borda-forte` ficam intactos, como
  Bernardo determinou em 09/09/2026.
  ⚠️ **A consequência visual é intencional**: o campo fica com traço mais escuro que toda outra
  borda do sistema. É isso que faz o campo parecer um campo.
- **FR-032.1**: O par `--texto-tenue` contra o preenchimento do campo MUST entrar na auditoria de
  contraste como par próprio. ⚠️ Sem isso a decisão vira anotação, e anotação que ninguém confere
  envelhece — foi o que aconteceu com as sete do documento 23.

### Key Entities

Esta fatia não introduz entidade de dado. Componente recebe dado por propriedade e não conhece
origem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos componentes desta fatia aparecem na vitrine com exemplo.
- **SC-002**: A contagem de construções de seletor de instrutor no repositório é **exatamente um**, e
  esse um **reordena** o que recebe — provado entregando-lhe uma lista fora de ordem.
- **SC-003**: A contagem de violações da regra de cor continua **zero**.
- **SC-004**: A contagem de variáveis de primitivo sem par com token CIAARA continua **zero**.
- **SC-005**: A auditoria de contraste continua verde nos **dois** temas, incluindo as oito séries
  **e o par novo do traço de campo** (`FR-032.1`).
- **SC-006**: **100%** dos movimentos de teclado previstos funcionam na tabela densa.
- **SC-007**: A contagem de componentes de `components/ciaara/` que importam cliente de banco ou
  implementam regra `RN-` é **zero**.
- **SC-008**: **100%** das séries de um gráfico trazem marcador de forma própria e rótulo, e o
  gráfico continua legível **com a cor removida** — verificado, não presumido.
  ⚠️ **Note o que este critério NÃO diz mais**: não cobra luminâncias distintas. A paleta mesclada
  não as tem, e está medido no `FR-018`.
- **SC-009**: **100%** dos componentes que a spec 006 nomeia existem e são exportados — verificado
  aqui, por lista.
  ⚠️ **Este é o proxy, não a prova.** A prova é o Épico 5 consumir os treze **sem construir
  nenhum**, e ela só acontece lá. Até lá, *"genérico"* é intenção verificada só por mim, e o
  critério diz o que pode dizer.
- **SC-010**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit.
- **SC-011**: **Doze** itens do checklist de acessibilidade e entrega da fatia (a) passam de abertos
  a fechados — CHK005 a CHK010, CHK013 a CHK018 —, cada um com o requisito desta spec que o fecha
  apontado pelo número. ⚠️ Fechar item de checklist **sem apontar o que o fechou** é o mesmo que
  desmarcá-lo por cansaço.

## Assumptions

1. **O ponto único não muda.** A paleta, os tokens e a regra de cor são da fatia (a) e estão
   mesclados. Esta fatia **consome**; não redesenha. Token novo, se for preciso, entra pelos três
   lugares que a regra 4 do contrato de vocabulário exige.
2. **A biblioteca de gráficos é a decidida no BRIEF.** Ela ainda não está instalada, e entra aqui —
   é dependência prevista, não escolha nova.
3. **Estado de navegação na URL não entra.** É da fatia (c), por decisão de 09/09/2026. Os
   componentes desta fatia recebem e devolvem estado por propriedade, sem saber onde ele mora.
4. **As regras de negócio ficam no domínio.** O componente exibe; quem calcula é função pura. É a
   fronteira do documento 23 §3.2, e é o que permite testar regra sem navegador.
5. **Quem CALCULA a antiguidade é o domínio; quem a APLICA é o seletor.** A função é pura e vive
   fora do componente — o componente não a implementa, mas **também não confia** em receber a lista
   já ordenada (`FR-011.1`, decisão de 10/09/2026).

## Dependências

| Depende de | Estado |
|---|---|
| Épico 4, fatia (a) — tokens, tema, regra de cor, vitrine | ✅ **mesclada** (PR #7) |
| Documento 23 §3.1 — inventário e base de cada componente | ✅ escrito |
| Spec 006 — o primeiro consumidor real, que valida a genericidade | ✅ escrita e **bloqueada por esta fatia** |
| Biblioteca de gráficos | ⬜ entra aqui |
| Biblioteca de ícones | ⬜ entra aqui — **fecha a pendência §11.2** do documento 23 |

## Quem espera esta fatia

| Quem | O que espera |
|---|---|
| **Épico 4, fatia (c)** | O shell consome os mesmos componentes |
| **Épico 5, fatia (c)** — instrutores | **Bloqueada.** Precisa de tabela densa, filtro, indicadores, gráficos, seletor e nome |
| **Épico 5, fatias (a) e (b)** | Cursos, turmas e disciplinas, pelo mesmo motivo |
| **Épicos 6 e 7** | As grades densas, que **ficaram com eles** — decisão de 10/09/2026 |

## Fora de escopo

- **Estado de navegação na URL e shell** — fatia (c).
- **Marca institucional** — fatia (c).
- **As cinco telas do Épico 3 sem vocabulário** — fatia (c).
- **As três grades densas** — alocação, DSA e cronograma. Pertencem aos **Épicos 6 e 7**, por
  decisão de 10/09/2026. ⚠️ **Componente moldado a uma tela não é Design System, é antecipação** — e
  a grade do DSA é a tela do Épico 6. É a mesma regra que decidiu a dependência do Épico 5.
- **Telas de domínio** — Épico 5 em diante.
- **Rotas de impressão** — Épicos 10 e 11. O vocabulário já prevê que o papel é branco.
- **Qualquer regra `RN-`** — componente exibe, domínio decide.
- **Paleta, tokens e regra de cor** — entregues pela fatia (a), mescladas.

## Regras que pareceram estranhas — listadas, não corrigidas

1. **O documento 23 §3.1 lista as três grades no inventário do Design System**, e elas são ao mesmo
   tempo os componentes mais densos e os mais específicos de domínio — a grade do DSA **é** a tela
   do Épico 6. ✅ **Resolvido em 10/09/2026: ficam com os Épicos 6 e 7.** ⚠️ **O documento 23
   continua listando-as como do Design System**, e emendá-lo é decisão à parte.
2. **O inventário do §3.1 mistura três destinos.** Ele traz componentes de `components/ciaara/`, de
   `components/impressao/` e de `components/graficos/` na mesma tabela, com a coluna de arquivo
   distinguindo-os. Os de impressão são dos Épicos 10 e 11 e **não** entram aqui, mas quem ler a
   tabela como lista de trabalho desta fatia os incluiria.
3. **Nenhum dos catorze tokens de borda da paleta alcança 3:1** — medido em 10/09/2026, o teto é
   `2,02` no claro e `2,23` no noturno. ⚠️ A pendência da fatia (a) supunha que a fatia do primeiro
   campo escolheria **uma borda** que servisse, e não havia nenhuma. Resolvido pelo `FR-032` com um
   token de **texto**. **A paleta não foi tocada.**
4. **A paleta das oito séries NÃO sobrevive à conversão para cinza**, e isso não estava registrado
   em lugar nenhum. Medido em 10/09/2026: tema claro, série 1 em `0,0984` e série 8 em `0,0987`;
   tema noturno, série 4 e série 7 a `0,0005` uma da outra. ⚠️ **O documento 23 §7 trata a
   distinção impressa como resolvida pela paleta**, e ela não resolve. Contornado aqui pelo
   `FR-018`, que passa a distinção para forma e rótulo. **A paleta não foi tocada**, e o parágrafo
   do documento 23 continua dizendo o que dizia — emendá-lo é decisão à parte.
5. **A pendência §11.2 do documento 23 ficou aberta desde a Fase 2**, e ninguém a tinha reaberto:
   ela pergunta qual biblioteca de ícones o sistema usa. ✅ **Fechada em 10/09/2026** pelo
   `FR-003.1`. ⚠️ **O documento 23 continua registrando-a como pendente**, e emendá-lo é decisão à
   parte.
6. **A linha do `EstadoVazio` diz base "—" e ele já existe desde o Épico 3.** O documento o lista
   como se estivesse por fazer. Não é erro de regra, é inventário desatualizado.
