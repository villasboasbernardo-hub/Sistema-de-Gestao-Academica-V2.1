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
as luminâncias das oito são distintas entre si.

**Acceptance Scenarios**:

1. **Dado** um gráfico, **quando** ele usa cor, **então** ela vem das oito séries do ponto único —
   nunca de cor escolhida no componente.
2. **Dado** a mesma tela recarregada, **quando** os dados mudam, **então** a **ordem** das cores
   **não** muda. ⚠️ Paleta que reordena conforme os dados faz o leitor reaprender a legenda a cada
   recarga.
3. **Dado** um gráfico, **quando** ele recebe dados, **então** eles chegam **prontos**: a agregação
   é de quem chama, nunca do componente.

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
- **Gráfico sem dados**: mostra estado vazio, não área em branco sem explicação.
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

#### Componentes CIAARA

- **FR-004**: MUST existir componente de **indicador** — número grande, rótulo e unidade.
- **FR-005**: MUST existir componente de **emblema de status**, com variante por tom do domínio.
- **FR-006**: MUST existir componente de **tabela densa**, com ordenação, filtro e navegação por
  teclado.
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
- **FR-012**: MUST existir componente de **nome de instrutor**, no formato
  **`P/G Especialidade Nome de Guerra`**, alimentado por **função pura de domínio**
  (`RF-INSTR-15`, `RF-DS-05`).
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
- **FR-018**: A ordem das cores MUST sobreviver à **impressão em preto e branco** — as luminâncias
  das oito são distintas entre si, e essa propriedade MUST ser verificada.

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

- **FR-028**: MUST existir requisito escrito de **ponto de quebra responsivo** para conteúdo denso,
  declarando que o uso típico é em tela grande (`RNF-USA-02`). *Fecha o `CHK005`.*
- **FR-029**: O requisito de **movimento reduzido** MUST existir como requisito, e não apenas como
  linha de folha de estilo. *Fecha o `CHK009`.*
- **FR-030**: MUST existir requisito de **leitor de tela** para os componentes desta fatia: nome
  acessível, região anunciada e ordem de leitura previsível. *Fecha o `CHK010`.*
- **FR-031**: A proibição de `--texto-tenue` **carregar dado** MUST ser verificável, e não apenas
  escrita. *Fecha o `CHK013`.*
- **FR-032**: O componente de **campo** desta fatia MUST resolver a pendência da borda de campo
  registrada na fatia (a) — o traço que identifica o campo MUST atingir o limite de borda
  interativa. ⚠️ **É aqui que a pendência vence**: ela dizia *"resolve na fatia que construir o
  primeiro campo"*, e esta é. *Fecha o `CHK018`.*

### Key Entities

Esta fatia não introduz entidade de dado. Componente recebe dado por propriedade e não conhece
origem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos componentes desta fatia aparecem na vitrine com exemplo.
- **SC-002**: A contagem de construções de seletor de instrutor no repositório é **exatamente um**.
- **SC-003**: A contagem de violações da regra de cor continua **zero**.
- **SC-004**: A contagem de variáveis de primitivo sem par com token CIAARA continua **zero**.
- **SC-005**: A auditoria de contraste continua verde nos **dois** temas, incluindo as oito séries.
- **SC-006**: **100%** dos movimentos de teclado previstos funcionam na tabela densa.
- **SC-007**: A contagem de componentes de `components/ciaara/` que importam cliente de banco ou
  implementam regra `RN-` é **zero**.
- **SC-008**: As luminâncias das oito séries são **distintas entre si** — verificado, não presumido.
- **SC-009**: O primeiro consumidor real, a spec 006, encontra **pronto** cada componente de que
  precisa, sem construir nenhum.
- **SC-011**: **Doze** itens do checklist de acessibilidade e entrega da fatia (a) passam de abertos
  a fechados — CHK005 a CHK010, CHK013 a CHK018 —, cada um com o requisito desta spec que o fecha
  apontado pelo número. ⚠️ Fechar item de checklist **sem apontar o que o fechou** é o mesmo que
  desmarcá-lo por cansaço.
- **SC-010**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit.

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
5. **A ordenação por antiguidade é resolvida no domínio e servida pelo banco.** O seletor a
   consome; não a implementa.

## Dependências

| Depende de | Estado |
|---|---|
| Épico 4, fatia (a) — tokens, tema, regra de cor, vitrine | ✅ **mesclada** (PR #7) |
| Documento 23 §3.1 — inventário e base de cada componente | ✅ escrito |
| Spec 006 — o primeiro consumidor real, que valida a genericidade | ✅ escrita e **bloqueada por esta fatia** |
| Biblioteca de gráficos | ⬜ entra aqui |

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
3. **A linha do `EstadoVazio` diz base "—" e ele já existe desde o Épico 3.** O documento o lista
   como se estivesse por fazer. Não é erro de regra, é inventário desatualizado.
