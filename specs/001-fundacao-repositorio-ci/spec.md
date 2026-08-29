# Feature Specification: Épico 0 — Fundação: repositório, Next.js, Supabase, CI e tipos gerados

**Feature Branch**: `001-fundacao-repositorio-ci`

**Created**: 2026-08-26

**Status**: Clarificada (26–27/08/2026, 8 perguntas), planejada, decomposta em 62 tarefas e analisada.
`/speckit-analyze` de 27/08/2026 apontou 10 achados — **todos aplicados**. Pronta para
`/speckit-implement`.

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
| Primeira pré-visualização verde na Vercel | sem remote git configurado (`git remote -v` vazio) |
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

### Session 2026-08-27

- Q: Qual banco a pré-visualização da Vercel deve usar, já que hoje existe um único projeto Supabase e
  o FR-022 exige que a pré-visualização não alcance o de produção? → A: **Opção C** — o projeto existente
  `cqhpfuaweoyglhtrckcp` passa a ser o de **desenvolvimento/preview**; o projeto de **produção** é
  criado depois, antes da carga real do Épico 2.
- Q: O comando único de verificação local deve incluir os testes que exigem Docker e banco no ar
  (pgTAP e o teste negativo de RLS), ou deve ficar restrito ao que roda em segundos? → A: **Opção C** —
  **dois comandos**: `verificar` (rápido, sem Docker, como o documento 24 §7 define) e
  `verificar:tudo` (a sequência completa do CI, a rodar antes de abrir o PR). Emenda ao documento 24 §7.
- Q: Depois que a v2.1 for replantada no repositório próprio, o que acontece com a pasta
  `Versao_2.1_NextJS/` que hoje vive dentro do repositório `SIS11`? → A: **Opção A** — a cópia de
  trabalho **sai de dentro do `SIS11`** e passa a ser pasta irmã, onde vira o repositório próprio. Os
  commits de 26/08 permanecem no `SIS11` como registro; nada é apagado.
- Q: O repositório deve ligar a proteção de push contra segredos do GitHub, que recusa um push contendo
  chave reconhecida, ou basta a inspeção humana antes do merge que o FR-002 já exige? → A: **Opção A** —
  ligar **varredura de segredos e proteção de push**, mantendo o FR-002. Verificado em 27/08/2026: as
  duas estão `disabled` no repositório, que é público desde 26/08.
- Q: O Épico 0 cria um ambiente de **produção** na Vercel, ou só pré-visualizações por branch até o
  corte? → A: **Opção A** — **só pré-visualizações**. O `main` não publica em produção. O ambiente de produção
  nasce perto do corte, junto do projeto Supabase de produção (FR-022.1), pela mesma razão.

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
fonte. Entrega valor sozinho mesmo que CI e pré-visualização ainda não existam.

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
viável para quem não lê código. Fica em P2 porque depende de infraestrutura externa — Vercel e o
projeto de desenvolvimento no Supabase —, não porque valha menos. **Somente pré-visualização:** esta
fatia não cria produção da v2.1 (FR-016.1); a produção do CIAARA-11 segue sendo a v2.0 até o corte.

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
- **Segredo real chega a um commit** por descuido — no arquivo de exemplo ou em qualquer outro: o push
  precisa ser **recusado** (FR-002.1). Se ainda assim escapar, o repositório é público e a chave conta
  como comprometida: rotacionar, não apagar o commit (FR-002.2).
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
- **FR-002.1**: O repositório MUST ter **varredura de segredos e proteção de push** habilitadas, de modo
  que um push contendo chave reconhecida seja **recusado pelo servidor**, não apenas sinalizado depois.
  Verificado em 27/08/2026: ambas estavam desligadas. *(decisão de 27/08/2026; o repositório é público
  desde 26/08, e uma `service_role` vazada ignora a RLS inteira)*
- **FR-002.2**: Se um segredo real chegar a ser empurrado, o procedimento MUST ser **rotacionar a
  chave**, não apagar o commit — em repositório público, remover history não desfaz a exposição. O
  procedimento MUST estar escrito onde quem opera vá encontrá-lo.
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
- **FR-013**: MUST existir **dois** comandos de verificação local, com propósitos distintos e ambos
  documentados no README *(decisão de 27/08/2026)*:
  - **`pnpm verificar`** — rápido, **sem Docker**, exatamente como o documento 24 §7 o define
    (checagem de tipos, lint, formatação, testes de unidade, build). É o de cada commit.
  - **`pnpm verificar:tudo`** — a **sequência completa do CI**, incluindo os blocos que exigem banco no
    ar (invariantes pgTAP e teste negativo de RLS) e o de ponta a ponta. É o de antes de abrir o PR.
- **FR-013.1**: `verificar:tudo` **não existe no documento 24 §7** e é **emenda** a ele, autorizada por
  Bernardo em 27/08/2026. A emenda MUST ser aplicada no documento 24, não só aqui — sob pena da mesma
  divergência silenciosa que esta spec existe para evitar. *(pendência D-7)*
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
- **FR-016.1**: Esta fatia MUST NOT criar ambiente de **produção** da v2.1. O `main` MUST NOT publicar
  em produção. A produção do CIAARA-11 é a **v2.0**, até o corte; um endereço de produção da v2.1 no ar,
  sem tela de negócio, seria só superfície de confusão. O ambiente de produção nasce perto do corte,
  junto do projeto Supabase de produção (FR-022.1). *(decisão de 27/08/2026)*
- **FR-017**: Todo ambiente MUST se identificar visualmente pelo rótulo que lhe corresponde — nesta
  fatia, apenas **`local`** e **`preview`** existem —, para que ninguém registre aula de verdade
  achando que está em homologação. O rótulo `producao` MUST permanecer previsto e **não utilizado**.
- **FR-018**: A implantação MUST ser atômica: falha de deploy MUST manter o ambiente anterior no ar.
  *(substitui `RF-MOD-04`, revogado)*

**Governança e estrutura**

- **FR-019**: A estrutura de diretórios MUST seguir o documento 24 **naquilo que esta fatia cria** —
  `lib/{supabase,dominio,validacao,acoes,tipos}/`, `tests/{unidade,invariantes/rls,e2e}/` e
  `supabase/` —, e a degradação segura MUST existir no segmento de rota que existe hoje (`app/`:
  `error.tsx`, `loading.tsx`, `not-found.tsx`). Os diretórios de outros épicos — `components/`,
  `app/(auth)/`, `app/(app)/`, `app/print/`, `scripts/etl/` — **MUST NOT ser criados aqui**: criar
  pasta vazia para um épico futuro é antecipar escopo, não preparar terreno.
  *(`RF-MOD-01/02/03` reinterpretados; `RN-DEG-01`; Princípio IX)*
- **FR-020**: Nenhuma tabela, nenhuma tela de negócio, nenhum dado, nenhum token de design, **nenhum
  ambiente de produção** e **nenhum projeto Supabase de produção** entram nesta fatia.
  *(Princípio IX — contenção de escopo)*

**Repositório e hospedagem** *(decididos em 26/08/2026 — ver Clarifications)*

- **FR-021**: O código da v2.1 MUST viver em repositório **próprio** —
  `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` — e não como subpasta do repositório
  `SIS11`, que guarda v1.0 e v2.0. O commit de 26/08/2026 MUST ser preservado no replantio; nenhuma
  história é descartada. *(Princípio IV)*
- **FR-021.1**: A cópia de trabalho MUST **sair de dentro do worktree do `SIS11`** e passar a ser pasta
  irmã — proposta: `OneDrive/Documentos/CIAARA-11-v2.1` —, onde é o repositório próprio.
  MUST NOT existir repositório aninhado dentro do worktree do `SIS11`, nem duas cópias de trabalho
  vivas da mesma árvore. *(decisão de 27/08/2026)*
- **FR-021.2**: Os commits `d19ab10` e `d31bd56`, na branch `chore/UE-1-versionar-v2.1` do `SIS11`,
  MUST permanecer como estão — registro de que a v2.1 passou por ali. **Não são apagados nem
  reescritos**, ainda que o conteúdo passe a viver noutro repositório. *(Princípio IV)*
- **FR-021.3**: Ao fim do replantio, MUST ser possível provar que existe **uma só** cópia de trabalho
  da v2.1: o caminho antigo não responde mais como projeto ativo, e o `git status` do `SIS11` não
  acusa a árvore da v2.1 como modificada.
- **FR-022**: Enquanto a CIAARA-14.2 não decidir sobre hospedagem fora da infraestrutura da MB, o
  ambiente de pré-visualização MUST operar **somente com dado sintético**: nem a base viva
  `Banco de dados CIAARA-11 v2.0`, nem o projeto Supabase de produção MUST estar alcançáveis a partir
  dele. A separação MUST ser verificável, não apenas acordada.
- **FR-022.1**: O projeto Supabase existente `cqhpfuaweoyglhtrckcp` MUST ser designado, nesta fatia,
  como o projeto de **desenvolvimento/preview** — não de produção. O projeto de **produção** MUST ser
  criado adiante, **antes da carga real do Épico 2**, e MUST NOT existir enquanto não houver dado real
  a proteger. Enquanto ele não existir, FR-022 é satisfeito por construção: não há produção a alcançar.
- **FR-022.2**: Toda variável de ambiente MUST declarar a que ambiente pertence, e o rótulo de ambiente
  (`local` · `preview` · `producao`) MUST corresponder ao projeto realmente apontado. **Achado de
  26/08/2026:** o `.env.local` traz `NEXT_PUBLIC_AMBIENTE="local"` apontando para `cqhpfu…` — com
  FR-022.1 isso passa a estar correto, mas a correspondência MUST ser conferida, não presumida.
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
- **SC-005**: O veredito de `verificar:tudo` e o veredito do CI **coincidem** nos casos testados — um
  verde local seguido de vermelho no CI é defeito da verificação, não azar. *(`verificar`, o rápido,
  não faz essa promessa: ele cobre os blocos que dispensam Docker.)*
- **SC-006**: Um push em branch produz URL de pré-visualização acessível, **aberta e conferida por
  Bernardo** ao menos uma vez antes do fechamento do épico.
- **SC-007**: A camada de domínio termina o épico **vazia**, a contagem de tabelas de negócio no banco é
  **zero**, e existe **zero** ambiente de produção da v2.1 — a fundação não antecipou escopo de outro
  épico.
- **SC-008**: `pnpm verificar` (o rápido) cabe no tempo de uma pausa curta — alvo de **até 5 minutos** —
  para que ninguém o pule por pressa. `pnpm verificar:tudo` não tem esse teto: roda uma vez por PR, e o
  que se exige dele é **coincidir com o CI** (SC-005), não ser rápido.

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
- **"Dado sintético" na pré-visualização** significa o projeto de desenvolvimento/preview
  (`cqhpfuaweoyglhtrckcp`, decisão de 27/08/2026), populado por seed versionado. Assume-se que o seed
  vem com o Épico 1; até lá, a pré-visualização sobe com schema vazio.
- **A CLI do Supabase não está autenticada** nesta máquina (`supabase projects list` devolve
  *Access token not provided*), então não foi possível confirmar quantos projetos existem na conta.
  Assume-se que `cqhpfuaweoyglhtrckcp` é o único. O planejamento deve confirmar com `supabase login`.
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
| ~~**D-5**~~ | ~~O BRIEF §2.1 não conhece `unidades_ensino`~~ — **RESOLVIDO**, verificado em T005 (27/08/2026): o BRIEF foi revisado em 26/08, o §2.1 passou a 27 tabelas **com** `unidades_ensino`, e ganhou um **§2.2 novo** que fixa o grão de UE e as quatro consequências da rota (b) | — |
| ~~**D-6**~~ | ~~BRIEF × documento 05 sobre `turma_disciplina_instrutor` e `configuracoes_horario`~~ — **RESOLVIDO** na nota ao fim do §2.1 do próprio BRIEF | — |
| **D-9** | O BRIEF §1 diz "Next.js **15+**"; o instalado é **16.3.3**. Atende ao piso, mas o texto não registra que a linha 16 é a real | `docs/BRIEF-v2.1.md` §1 — nota de uma linha |
| **D-10** | O BRIEF §1 lista **TanStack Query** e **`nuqs`** na stack; nenhum dos dois é instalado nesta fatia (fora de escopo, FR-020). Não é divergência — é registro para que o Épico 4 não os julgue esquecidos | nenhuma ação |
| **D-7** | `verificar:tudo` foi autorizado por Bernardo em 27/08/2026 e **não existe** no documento 24 §7 | acrescentar o script ao **`docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` §7**, com o comentário explicando por que são dois |
| **D-8** | O `CLAUDE.md` diz "Comando único que roda a sequência do CI localmente: `pnpm verificar`" — passaram a ser dois, com promessas diferentes | `CLAUDE.md`, seção *Definition of Done* |
| D-3 | `CLAUDE.md` diz "Repositório GitHub ✅ criado — ainda sem push"; o endereço só foi nomeado em 26/08/2026 | `CLAUDE.md`, *Estado atual* |
| D-4 | A pendência "gerenciador de pacotes" continua listada como aberta no `CLAUDE.md` | `CLAUDE.md`, *Decisões pendentes* |
