# Feature Specification: Épico 0 — Fundação: repositório, Next.js, Supabase, CI e tipos gerados

**Feature Branch**: `001-fundacao-repositorio-ci`

**Created**: 2026-08-26

**Status**: Draft — clarificada em 26/08/2026 (Q1–Q3 respondidas). Pronta para `/speckit-plan`

**Input**: User description: "Épico 0 — Fundação: repositório, Next.js, Supabase, CI, tipos gerados"

---

## Verificação de premissa (antes de qualquer requisito)

O Épico 0 **já está em andamento**. Esta spec não parte do zero: parte do que foi verificado em disco
em 26/08/2026, por leitura direta — não por leitura do `CLAUDE.md`.

**Já de pé — não re-especificar:**

| Item | Evidência |
|---|---|
| Scaffold Next.js (doc 10 §6.1) | `package.json`, `app/{layout,page}.tsx`, `app/globals.css`, `next.config.ts`, `postcss.config.mjs` |
| Next **16.3.3** + React 19.2.8 + Tailwind v4 | `package.json` — veio 16, não 15 |
| `tsconfig.json` conforme doc 24 §5.1 | `exactOptionalPropertyTypes` ligado |
| `@supabase/supabase-js` 2.112.4 · `@supabase/ssr` 0.12.5 | dependências instaladas — **mas sem nenhum arquivo que as use** |
| `.env.local` e `.env.local.example` | `.example` conferido: só placeholder, nenhum segredo real |
| Spec Kit 0.16.0 + 10 skills + constitution 2.1.0 | `.specify/`, `.claude/skills/` |
| `pnpm` 11.24.0, `pnpm-lock.yaml` | `packageManager` no `package.json` |
| Node 24.19, git 2.55, Supabase CLI 2.116, Vercel CLI 59.7, gh 2.98, Docker 29.7 | verificados por `--version` |

**Pendente — é o escopo desta fatia:**

| Item | Evidência da ausência |
|---|---|
| Fronteiras de ESLint (doc 10 §6.2) | `eslint.config.mjs` traz só o preset do Next; **nenhuma** `no-restricted-imports` |
| Teste que prova a regra de lint ativa | `tests/` não existe |
| `supabase init` / `supabase start` | não existe diretório `supabase/` |
| `lib/supabase/{client,server,middleware,admin}.ts` | não existe diretório `lib/` |
| `lib/dominio/` vazio com a regra escrita | idem |
| `lib/tipos/database.ts` | idem — e o conteúdo depende do schema do Épico 1 |
| Vitest · Playwright · pgTAP rodando vazios | nenhum instalado |
| Scripts do doc 24 §7 | `package.json` tem 4 scripts: `dev`, `build`, `start`, `lint`. Faltam 24, inclusive `verificar` e `db:tipos` |
| `.github/workflows/ci.yml` | `.github/` não existe |
| Primeira preview verde na Vercel | sem remote git configurado (`git remote -v` vazio) |
| `AGENTS.md` na raiz | **existe** — conferir conteúdo antes de reescrever |

**Repositório de destino — verificado em 26/08/2026, depois do `gh auth login`:**

| Fato | Valor |
|---|---|
| Existe | ✅ `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` |
| Visibilidade | **Público** — tornado público por Bernardo em 26/08/2026, depois da primeira verificação |
| Criado | 25/08/2026 · um único commit (`a1aa9fb`, *Initial commit*) |
| Conteúdo | só `README.md`, 66 bytes — praticamente vazio |
| Branch padrão | **`main`** — e o commit de 26/08 está em `master`, no repo `SIS11`. O replantio precisa aterrissar em `main` |
| Proteção de branch | ✅ **Disponível, ainda não configurada** (`HTTP 404 — Branch not protected`). Antes era `403 — Upgrade to GitHub Pro or make this repository public` |

A mudança de visibilidade **restaurou o portão mecânico**: o bloqueio de merge do documento 10 §2.7 é
aplicável e vira entregável desta fatia (FR-014.1). O substituto por acordo escrito deixa de ser
necessário.

**Consequência não técnica, registrada porque ninguém deve descobri-la depois do push.** Repositório
público significa que **toda a suíte documental das Fases 1–3 fica legível por qualquer pessoa** —
estrutura organizacional da CIAARA-11, volumes de pessoal, regras de negócio da Marinha, referência
normativa interna (DGPM-101, NORMHIDRO 30-23, PROENS) e o identificador do projeto Supabase. Nada
disso é segredo criptográfico, e a `service_role` continua fora do repositório; é exposição
**institucional**, não credencial. A decisão é do Bernardo e está tomada. Fica o registro de que
`RNF-SEG` e a Matriz de Responsabilidades não foram consultadas a respeito.

**Contradição encontrada, resolvida em 26/08/2026:** o documento 06 escreve o critério de aceite 1
como `npm install` + `npm run dev`; o documento 10 §6.1 e o `package.json` usam `pnpm`. Bernardo
decidiu por **`pnpm`** (ver *Clarifications*). O texto do documento 06 fica **desatualizado neste
ponto** — anotado como pendência documental, não corrigido por esta spec.

---

## Clarifications

### Session 2026-08-26

**Q1 — Gerenciador de pacotes.** *Perguntado porque o documento 06 diz `npm`, o documento 10 diz
`pnpm`, e a pendência estava aberta no `CLAUDE.md`.*
→ **`pnpm`.** Já em uso (11.24.0, `pnpm-lock.yaml`, `corepack`). O critério de aceite 1 do documento 06
passa a ler-se `pnpm install` / `pnpm dev`. Fecha a pendência "gerenciador de pacotes".

**Q2 — Repositório de destino.** *Perguntado porque `git remote -v` está vazio e o commit de 26/08
entrou no repositório `SIS11`, que guarda também v1.0 e v2.0.*
→ **Repositório próprio da v2.1:**
`https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1.git`
Consequência estrutural: `Versao_2.1_NextJS/` deixa de ser subpasta do repositório `SIS11` e passa a
ser repositório próprio, com este remote. O commit de 26/08 precisa ser **replantado** ali — é o
trabalho de FR-021, e a única coisa desta fatia que mexe em história de git.

**Q3 — Publicar na Vercel antes da decisão da CIAARA-14.2.** *Perguntado porque hospedagem fora da
infraestrutura da MB é a única pendência capaz de bloquear a versão por razão não técnica.*
→ **A pré-visualização entra agora, com dado sintético apenas.** Nenhum dado real da MB — nem a base
viva, nem o projeto Supabase de produção — vai para a Vercel enquanto a CIAARA-14.2 não decidir. O
Épico 0 fecha completo; o limite vira requisito verificável (FR-022).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Máquina limpa vira ambiente de trabalho seguindo só o README (Priority: P1)

Quem chega ao projeto — outro militar da CIAARA-11, um substituto do Bernardo, ou o próprio agente
numa sessão nova — clona o repositório numa pasta vazia, lê **apenas o README**, e em poucos minutos
tem a aplicação rodando localmente. Não precisa perguntar a ninguém qual variável falta, nem descobrir
por tentativa qual comando sobe o banco.

**Why this priority**: é o critério que mais é declarado sem ser verificado, e o único que protege o
projeto do cenário real desta organização — rotatividade de pessoal. Um sistema que só o autor
consegue subir é um sistema com um único ponto de falha humano.

**Independent Test**: clonar numa pasta nova, seguir o README à risca, sem consultar nenhuma outra
fonte. Entrega valor sozinho mesmo que CI e preview ainda não existam.

**Acceptance Scenarios**:

1. **Given** uma pasta vazia numa máquina com as ferramentas do documento 10 §2 instaladas, **When** o
   recém-chegado executa exatamente os comandos do README, **Then** a aplicação responde em
   `localhost` sem nenhum passo não documentado.
2. **Given** o repositório recém-clonado, **When** o recém-chegado copia o arquivo de exemplo de
   variáveis para o arquivo local, **Then** toda variável necessária está listada, com comentário
   dizendo para que serve, e **nenhuma** traz segredo real.
3. **Given** o arquivo de variáveis ainda não preenchido, **When** a aplicação sobe, **Then** ela avisa
   claramente qual variável falta — e não quebra com exceção não tratada (`RN-DEG-01`).

---

### User Story 2 - O CI dá o veredito, e o veredito barra o merge (Priority: P1)

Quem abre um PR não precisa lembrar de rodar nada: o CI executa a sequência de qualidade e diz, na
própria página do PR, se a fatia pode entrar. Quem revisa não gasta atenção conferindo à mão o que a
máquina confere melhor.

**Why this priority**: é a substituição direta do que `RNF-PLAT-04` proibia na v2.0. Sem ele, a
*Definition of Done* do `CLAUDE.md` depende de disciplina humana em vinte e poucas fatias seguidas — e
disciplina humana é exatamente o que falha na décima quarta.

**Independent Test**: abrir um PR descartável com um erro de tipo deliberado e observar o CI reprovar e
o merge ficar bloqueado.

**Acceptance Scenarios**:

1. **Given** um PR com código correto, **When** o CI roda, **Then** os três blocos — qualidade, banco e
   build — passam e o PR fica liberado para revisão humana.
2. **Given** um PR com erro de tipo, de lint, de teste unitário ou de ponta a ponta, **When** o CI
   roda, **Then** ele reprova e **o merge fica bloqueado**, não apenas sinalizado.
3. **Given** um PR que altera o schema sem regenerar o contrato de dados, **When** o CI roda, **Then**
   ele reprova apontando a divergência.
4. **Given** que a verificação local existe, **When** alguém a executa antes de abrir o PR, **Then**
   obtém o mesmo veredito que o CI daria, sem esperar o ciclo remoto.

---

### User Story 3 - As duas fronteiras caras são impostas por ferramenta, não por memória (Priority: P1)

Quem escreve regra de negócio é **impedido** de importar banco dentro da camada de domínio, e quem
escreve tela é **impedido** de alcançar a chave administrativa do banco. A tentativa falha na hora, na
máquina de quem escreveu, com mensagem que explica o porquê.

**Why this priority**: são os dois defeitos mais caros que este projeto pode produzir. O primeiro
apodrece a testabilidade das ~40 regras `RN-` e só aparece meses depois; o segundo é vazamento de
credencial que ignora a RLS inteira. Ambos são baratos de impedir agora e caros de desfazer depois.

**Independent Test**: um arquivo de fixture que viola cada fronteira, e uma verificação que **espera a
falha**. Regra de lint que ninguém verificou é regra que alguém desligou.

**Acceptance Scenarios**:

1. **Given** um arquivo na camada de domínio, **When** ele importa qualquer cliente de banco ou
   qualquer dependência de plataforma (framework/UI), **Then** a verificação de qualidade falha com
   mensagem que cita o princípio violado.
2. **Given** um componente que roda no navegador, **When** ele importa o cliente administrativo,
   **Then** **o build falha** — não apenas a checagem de tipos.
3. **Given** que as duas regras existem, **When** a suíte de testes roda, **Then** há um teste que
   prova cada regra **ativa**, e ele quebra se alguém desligar a regra.
4. **Given** a camada de domínio recém-criada, **When** o Épico 0 termina, **Then** ela está **vazia**
   — a regra existe antes de haver o que proteger.

---

### User Story 4 - O contrato de dados é gerado, nunca digitado (Priority: P2)

Quem escreve migration regenera o contrato de dados por um comando documentado, e o CI reprova quem
esquecer. Ninguém digita à mão o nome de uma coluna.

**Why this priority**: substitui a aba `_Meta_Colunas` da v2.0 e é o exemplo canônico de requisito
absorvido pela plataforma. Coluna que a checagem de tipos não conhece é, quase sempre, coluna
inventada — e inventada em silêncio.

**Independent Test**: alterar o schema local, **não** regenerar, abrir PR, e observar a reprovação.

**Acceptance Scenarios**:

1. **Given** o banco local no ar, **When** alguém roda o comando documentado de geração de tipos,
   **Then** o contrato de dados é reescrito a partir do banco, sem edição manual.
2. **Given** um PR cujo contrato de dados diverge das migrations, **When** o CI roda, **Then** ele
   reprova.
3. **Given** que o schema ainda está vazio (Épico 1 não começou), **When** o Épico 0 termina, **Then**
   o comando existe, está documentado e roda — ainda que produza um contrato vazio.

---

### User Story 5 - Toda branch tem uma URL que o Bernardo pode abrir (Priority: P2)

Quem faz push numa branch recebe um endereço próprio, com a mudança rodando, antes de qualquer merge.
O Bernardo valida olhando a tela, não lendo o diff.

**Why this priority**: é o que substitui o modelo de implantação da v2.0 e o que torna a revisão humana
viável para quem não lê código. Fica em P2 porque depende de decisão externa ainda pendente (ver Q3),
não porque valha menos.

**Independent Test**: push numa branch qualquer, abrir a URL gerada, ver a aplicação.

**Acceptance Scenarios**:

1. **Given** uma branch com commit novo, **When** o push acontece, **Then** existe uma URL própria
   daquela branch, com a aplicação no ar.
2. **Given** a pré-visualização no ar, **When** o Bernardo a abre, **Then** uma faixa visível diz em que
   ambiente ele está — para que ninguém lance DSA de verdade achando que está em homologação.
3. **Given** que a implantação é atômica, **When** um deploy falha, **Then** o ambiente anterior
   permanece no ar — implantação parcial deixa de ser um estado possível (`RF-MOD-04` revogado).

---

### Edge Cases

- **A checagem de tipos isolada falha sem o build.** Nesta versão do framework, a checagem de tipos
  sozinha acusa tipos de rota inexistentes até que um build (ou a geração de tipos do framework) os
  produza. A sequência de verificação precisa contemplar isso — **não é erro de código**, é ordem de
  execução. Armadilha já paga em 26/08/2026; não redescobrir.
- **Quebra de linha entre Windows e Linux.** O trabalho é feito no Windows e o CI roda em Linux; o git
  já avisa `LF will be replaced by CRLF`. Sem normalização declarada, a verificação de formatação pode
  reprovar no CI arquivos que passam na máquina de quem escreveu.
- **Docker ausente ou parado** na hora do bloco de banco: precisa falhar com mensagem legível, não com
  erro de conexão cru.
- **Ferramenta de CLI sem versão fixada** no CI: é a causa mais comum de o bloco de banco falhar na
  primeira execução. Ler o log do job, não adivinhar.
- **Alguém desliga uma das duas fronteiras** — por comentário de supressão ou editando a configuração:
  o teste que prova a regra ativa precisa quebrar. É o único aviso que restará.
- **Segredo real chega ao arquivo de exemplo** por descuido: precisa ser barrado antes do merge.
- **O contrato de dados é editado à mão** para "consertar" um erro de tipo: o CI precisa reprovar,
  porque a correção certa é a migration.

---

## Requirements *(mandatory)*

### Functional Requirements

**Ambiente reprodutível**

- **FR-001**: O repositório MUST permitir que um clone limpo chegue à aplicação rodando localmente
  seguindo **apenas** o README, sem passo não documentado, usando **`pnpm`** como gerenciador de
  pacotes. *(doc 06, critério 1 — cujo texto ainda diz `npm`; prevalece a decisão de 26/08/2026)*
- **FR-002**: O arquivo de exemplo de variáveis de ambiente MUST listar **toda** variável necessária,
  com comentário do que cada uma faz, e MUST NOT conter nenhum segredo real. *(doc 06, critério 6)*
- **FR-003**: A ausência de uma variável de ambiente MUST produzir aviso legível, nunca exceção não
  tratada. *(`RN-DEG-01`, Princípio V)*

**Fronteiras impostas por ferramenta**

- **FR-004**: A camada de domínio MUST ser criada **vazia** e MUST ser proibida, por regra de qualidade
  automática, de importar cliente de banco ou dependência de plataforma. *(Princípio II, risco R-10)*
- **FR-005**: O cliente administrativo do banco MUST ser inalcançável a partir de código que roda no
  navegador, e a violação MUST **quebrar o build**, não apenas a checagem de tipos. *(risco R-09; as
  três defesas: sem prefixo público, marcador de servidor, regra de importação)*
- **FR-006**: MUST existir teste que prove **cada** uma das duas regras ativa, e esse teste MUST quebrar
  se a regra for desligada. *(doc 06, critério 5; doc 10 §6.2)*

**Acesso a dados**

- **FR-007**: MUST existir a camada de acesso ao Supabase com os quatro pontos de entrada previstos —
  navegador, servidor, middleware e administrativo — e as armadilhas de sessão/cookie MUST ser
  resolvidas **aqui**, não espalhadas pelos épicos seguintes. *(doc 06, riscos do Épico 0)*
- **FR-008**: O ambiente de banco local MUST subir por comando documentado e MUST ser descartável —
  reconstruível do zero sem passo manual.

**Contrato de dados**

- **FR-009**: O contrato de dados MUST ser **gerado** a partir do banco por comando documentado, nunca
  editado à mão. *(doc 06, critério 4)*
- **FR-010**: O CI MUST reprovar quando o contrato de dados commitado divergir das migrations.
  *(risco R-04)*

**Qualidade e CI**

- **FR-011**: As quatro suítes — unidade, invariantes de banco, negativo de RLS e ponta a ponta — MUST
  estar configuradas e **rodando vazias**, cada uma com um teste trivial que passa. *(doc 10 §6.5)*
- **FR-012**: O `package.json` MUST conter os scripts do documento 24 §7 **com os comentários**, que são
  a interface de comando do projeto, e MUST declarar `pnpm` como gerenciador. *(doc 10 §6.6)*
- **FR-013**: MUST existir um comando único (`pnpm verificar`) que roda localmente a mesma sequência do
  CI. *(doc 24 §7)*
- **FR-014**: O CI MUST rodar em três blocos — qualidade, banco e build — no repositório
  `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1`, em **todo push e todo PR**, e MUST
  **bloquear o merge** quando qualquer bloco falhar. *(doc 06, critério 3)*
- **FR-014.1**: A branch `main` MUST ter proteção configurada conforme o documento 10 §2.7 — revisão
  aprovada obrigatória, verificações de status estritas e os três contextos (`qualidade`, `banco`,
  `build`) exigidos. Passou a ser possível quando o repositório virou público, em 26/08/2026.
  **Fazer antes do primeiro PR, não depois.**
- **FR-015**: O bloqueio do merge MUST ser provado quebrando o CI de propósito uma vez, com commit
  descartável. *(doc 10 §6.7; Princípio VI — prova, não declaração)*

**Implantação**

- **FR-016**: Todo push em branch MUST gerar um ambiente de pré-visualização com URL própria.
  *(doc 06, critério 2)*
- **FR-017**: Todo ambiente MUST se identificar visualmente (local · preview · produção), para que
  ninguém registre aula de verdade achando que está em homologação.
- **FR-018**: A implantação MUST ser atômica: falha de deploy MUST manter o ambiente anterior no ar.
  *(substitui `RF-MOD-04`, revogado)*

**Governança e estrutura**

- **FR-019**: A estrutura de diretórios MUST seguir o documento 24, e a degradação segura MUST existir
  por segmento de rota (`error.tsx` + `loading.tsx`). *(`RF-MOD-01/02/03` reinterpretados; `RN-DEG-01`)*
- **FR-020**: Nenhuma tabela, nenhuma tela de negócio, nenhum dado e nenhum token de design entram
  nesta fatia. *(Princípio IX — contenção de escopo)*

**Repositório e hospedagem** *(decididos em 26/08/2026 — ver Clarifications)*

- **FR-021**: O código da v2.1 MUST viver em repositório **próprio** —
  `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` — e não como subpasta do repositório
  `SIS11`, que guarda v1.0 e v2.0. O commit de 26/08/2026 MUST ser preservado no replantio; nenhuma
  história é descartada. *(Princípio IV)*
- **FR-022**: Enquanto a CIAARA-14.2 não decidir sobre hospedagem fora da infraestrutura da MB, o
  ambiente de pré-visualização MUST operar **somente com dado sintético**: nem a base viva
  `Banco de dados CIAARA-11 v2.0`, nem o projeto Supabase de produção MUST estar alcançáveis a partir
  dele. A separação MUST ser verificável, não apenas acordada.
- **FR-023**: O repositório MUST declarar normalização de fim de linha, para que a verificação de
  formatação produza o mesmo resultado no Windows (onde se escreve) e no Linux (onde o CI roda).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa máquina limpa com as ferramentas de base instaladas, uma pessoa que nunca viu o
  projeto chega à aplicação rodando em **menos de 15 minutos**, consultando **apenas** o README, com
  **zero** perguntas a outra pessoa.
- **SC-002**: **100%** das variáveis necessárias estão no arquivo de exemplo, e **zero** segredos reais
  — verificado por inspeção antes do merge.
- **SC-003**: Um PR deliberadamente defeituoso é reprovado em **cada uma** das quatro formas de defeito
  testadas (tipo, lint, teste de unidade, ponta a ponta) e **em nenhum** dos quatro casos o merge fica
  disponível — com a proteção da branch `main` configurada (FR-014.1).
- **SC-004**: As duas fronteiras arquiteturais têm, cada uma, **um teste que falha quando a regra é
  desligada** — verificado desligando-as de propósito uma vez.
- **SC-005**: O veredito local e o veredito do CI **coincidem** nos casos testados.
- **SC-006**: Um push em branch produz URL de pré-visualização acessível, **aberta e conferida por
  Bernardo** ao menos uma vez antes do fechamento do épico.
- **SC-007**: A camada de domínio termina o épico **vazia** e a contagem de tabelas no banco é **zero**
  — a fundação não antecipou escopo de outro épico.
- **SC-008**: O ciclo completo de verificação local cabe no tempo de uma pausa curta — alvo de **até 5
  minutos** — para que ninguém o pule por pressa.

---

## Assumptions

- **Esta fatia é a exceção declarada ao ciclo Spec Kit.** O documento 10 §6 diz que o Épico 0 é o único
  que **não** passa pelo ciclo completo, por ser encanamento e não fatia de domínio. Bernardo invocou
  `/speckit-specify` para ele mesmo assim, em 26/08/2026. Registrado aqui para que a divergência com o
  documento 10 seja **deliberada e legível**, não um esquecimento. O documento 10 tem precedência 5
  (processo) e cede à decisão do responsável.
- **A plataforma não é escolha desta spec.** Next.js, Supabase, Tailwind, Vercel e GitHub Actions são
  restrição decidida (Princípio III, Spec 00), não decisão em aberto. Por isso aparecem nomeados: aqui
  a plataforma **é** o requisito, não o "como".
- **Veio Next 16, não 15.** Os documentos falam em "15+"; o instalado é 16.3.3. Assume-se que 16 atende,
  por ser superior ao piso declarado.
- **O README ainda não foi escrito** para este fim. FR-001 o transforma em entregável desta fatia, não
  em pressuposto.
- **`AGENTS.md` já existe** na raiz e não foi lido nesta spec. Assume-se que será conferido — não
  reescrito às cegas — durante o planejamento.
- **`lib/tipos/database.ts` nasce vazio.** O schema é do Épico 1. Nesta fatia prova-se o **comando** e o
  **portão de CI**, não o conteúdo.
- **Os testes das quatro suítes são triviais de propósito.** Suíte que roda vazia hoje é suíte que
  ninguém precisa configurar sob pressão amanhã, no meio de um épico com prazo.
- **O repositório de destino foi verificado** em 26/08/2026, após `gh auth login` como
  `villasboasbernardo-hub` — ver o quadro na *Verificação de premissa*. Não é mais suposição.
- **O repositório é público desde 26/08/2026**, por decisão de Bernardo tomada durante esta spec.
  Assume-se que a exposição institucional descrita na *Verificação de premissa* foi considerada e
  aceita. Esta fatia **não** publica dado de pessoa — nenhum dado real entra antes do Épico 2, e
  FR-022 mantém a pré-visualização em dado sintético.
- **A proteção de branch virou entregável, não impossibilidade.** É um comando só (documento 10 §2.7),
  mas depende de os três contextos do CI já existirem com os nomes certos — logo, vem **depois** do
  `ci.yml` e **antes** do primeiro PR. Ordem que o `/speckit-plan` precisa respeitar.
- **O replantio do repositório é operação de git com história.** Assume-se que o commit de 26/08/2026 é
  preservado — `git init` na pasta com o histórico reaproveitado, ou filtro de subdiretório —, nunca
  refeito do zero. Qual das duas técnicas usar é decisão do `/speckit-plan`, não desta spec.
- **"Dado sintético" na pré-visualização** significa projeto Supabase separado do de produção, populado
  por seed versionado. Assume-se que o seed vem com o Épico 1; até lá, a preview sobe com schema vazio.
- **`docs/BRIEF-v2.1.md` apareceu no repositório em 26/08/2026**, durante esta spec. Ela foi escrita
  antes dele, a partir dos documentos 06, 10 e 24 — que não o contradizem em nada relevante ao Épico 0.
  O BRIEF **não foi relido linha a linha** para reconferir esta spec; foi verificado o suficiente para
  fechar D-2 e abrir D-5 e D-6. O `/speckit-plan` deve lê-lo integralmente.

---

## Pendências documentais abertas por esta spec

Nenhuma bloqueia o `/speckit-plan`. Registradas para que ninguém as descubra depois:

| # | Item | Onde corrigir |
|---|---|---|
| D-1 | O critério de aceite 1 do documento 06 diz `npm install` / `npm run dev`; a decisão é `pnpm` | `docs/fase-1/06-Backlog-de-Epicos-V2.1.md`, Épico 0 |
| ~~D-2~~ | ~~`docs/BRIEF-v2.1.md` não existe~~ — **resolvido em 26/08/2026**: o arquivo apareceu no repositório, 394 linhas, datado 26/08/2026, com §2.1 (mapa de tabelas), §7 (DoD), §9 (invariáveis) e §10 (volumes) | — |
| **D-5** | **O BRIEF §2.1 não conhece `unidades_ensino`.** Verificado: **zero** menções a "Unidade de Ensino", `unidades_ensino` ou UE-1 nas 394 linhas; `registros_aula` aparece no grão antigo. Como o §2.1 manda "use **exatamente** estes nomes", o Épico 1 excluiria a tabela que a decisão UE-1 rota (b) exige. É o mesmo padrão de P-1 (`turma_disciplina` fora do mapa) | **`docs/BRIEF-v2.1.md` §2.1** — propor a inclusão de `unidades_ensino` e a nota de grão em `registros_aula`. **Decisão do Bernardo: não aplicar sem autorização** — o BRIEF é precedência 2 |
| **D-6** | O BRIEF §2.1 traz `turma_disciplina_instrutor` (tabela 11) e `configuracoes_horario` (tabela 2), ausentes do dicionário do documento 05 §4 | conciliar documento 05 com o BRIEF, ou registrar a diferença |
| D-3 | `CLAUDE.md` diz "Repositório GitHub ✅ criado — ainda sem push"; o endereço só foi nomeado em 26/08/2026 | `CLAUDE.md`, *Estado atual* |
| D-4 | A pendência "gerenciador de pacotes" continua listada como aberta no `CLAUDE.md` | `CLAUDE.md`, *Decisões pendentes* |
