---
title: "CIAARA-11 v2.1 — Plano de Execução com Vibe Coding (Claude Code + Spec Kit)"
author: "Ponte entre a Fase 1 (Requisitos) e as Fases 2–4 do SDLC"
date: "26/08/2026"
version: "2.1"
---

# Plano de Execução — CIAARA-11 v2.1 com Claude Code e Spec Kit

**Status:** v1.0 · **Sucede:** `Versão 2.0/Fase 1 - Requisitos/10-Plano-de-Execucao-Spec-Kit.md` ·
**Consome:** `BRIEF-v2.1.md`, documentos 00–09 (Fase 1), 20–25 (Fase 2), 30–31 (Fase 3) ·
**Governa e é governado por:** `Vibe Coding/40-Constitution-v2.1.md`

---

## 0. O que este documento é — e o que não é

**É** o roteiro operacional que traduz a suíte de documentação da v2.1 em um fluxo de trabalho
executável, com o Claude Code como agente e o **Spec Kit** (`github/spec-kit`) como disciplina de
Spec-Driven Development. Tudo aqui é processo, comando, convenção e portão de verificação.

**Não é** requisito, não é arquitetura e não é decisão de produto. **Este documento não acrescenta
nem altera nenhum requisito.** Se um passo daqui parecer contradizer o documento 04 (regras de
negócio) ou o `BRIEF-v2.1.md`, o erro é deste documento — reporte, não contorne.

**Não é o manual de conversa com o agente.** Como escrever um bom prompt, como revisar o que o
agente produziu, quando interromper e o que nunca delegar estão no documento **41**
(`Vibe Coding/41-Guia-de-Vibe-Coding.md`). Os prompts prontos de cada épico estão no documento **42**
(`Vibe Coding/42-Prompts-por-Epico.md`). Este aqui é o **macro**: a ordem das coisas.

### 0.1 Como o Spec Kit mapeia no SDLC do projeto

| Comando | Produz | Fase do SDLC |
|---|---|---|
| `/speckit.specify` | `specs/NNN-*/spec.md` — a especificação da fatia, lida da Fase 1 | **Requisitos** (leitura) |
| `/speckit.clarify` | seção *Clarifications* no `spec.md` — o que o agente entendeu errado, exposto cedo | **Requisitos** |
| `/speckit.plan` | `plan.md`, `data-model.md`, `research.md` — o desenho técnico da fatia | **Arquitetura** |
| `/speckit.tasks` | `tasks.md` — a decomposição executável | **Desenvolvimento** (entrada) |
| `/speckit.analyze` | relatório de inconsistência entre spec, plan e tasks | **Portão** |
| `/speckit.implement` | código em `app/`, `lib/`, `components/`, `supabase/migrations/` | **Desenvolvimento** |
| `/speckit.checklist` | lista de verificação da spec | **Testes** |

### 0.2 O que mudou em relação ao documento 10 da v2.0

| Item | v2.0 | v2.1 |
|---|---|---|
| Granularidade | 1 épico = 1 feature (dez ciclos) | **1 fatia entregável = 1 feature.** Épicos 4, 5 e 7 são grandes demais para uma fatia; subdividem-se |
| Golden master | `baseline/caho-2026/` — extração da v1.0 congelada | **Não existe.** A CAHO 2026 foi rejeitada como padrão-ouro em 10/08/2026. Validação por invariante |
| Fase 2 transversal | Quatro documentos de arquitetura a escrever antes do 1º ciclo | **Já escritos** — documentos 20 a 25, mais os seis scripts de `docs/sql-referencia/` |
| Implantação | `clasp push`/`deploy` manual + `BUILD_ID` + `MANIFESTO.md` | **Git → preview por branch → merge → produção** (§8) |
| Verificação local | `node --test` sobre funções puras | `pnpm verificar` — a sequência inteira do CI (§7, passo 8) |
| Ambiente de validação | Produção, ou nada | **Preview por branch** — o Bernardo valida antes do merge |

---

## 1. Premissas

**P-1. O repositório é a única fonte da verdade.** Não existe editor no navegador, não existe cópia
publicada que possa divergir. Toda mudança nasce num arquivo versionado e chega à produção por
merge. Esta premissa não custa nada na v2.1 — na v2.0 ela custava um ritual inteiro (§8.1).

**P-2. O projeto Supabase já existe.** Criado pelo Bernardo, **vazio**, aguardando o schema do Épico
1. O trabalho do Épico 0 é **vincular** o repositório a ele (`supabase link`), não criá-lo. Nenhum
agente cria projeto Supabase; nenhum agente cria projeto na Vercel sem autorização explícita.

**P-3. O repositório GitHub já existe.** Criado pelo Bernardo, aguardando o *scaffold* do Épico 0.
O agente inicializa o Next.js **dentro** dele — não faz `git init` num diretório novo.

**P-4. A v2.0 continua em produção até o corte.** Durante toda a construção da v2.1 existem dois
sistemas vivos: a v2.0 (Apps Script + Sheets, com usuários reais lançando DSA todos os dias) e a
v2.1 (em construção). A planilha `Banco de dados CIAARA-11 v2.0`, 23 abas, **continua sendo
escrita**. Consequência prática para o Épico 2: a extração é um **snapshot datado**, e o plano de
corte (documento 30) trata do congelamento de escrita.

**P-5. O domínio já está saneado.** A v2.0 executou a migração e o saneamento: recategorização dos
663 lançamentos, correção de duplicatas, preenchimento de `Status`, fusão de agendamento e execução
de avaliação. **O ETL da v2.1 transporta; não reinterpreta.** "Aproveitar e corrigir um dado durante
o ETL" é explicitamente proibido — correção de conteúdo é evento separado e logado.

**P-6. Alterar regra de negócio exige autorização nominal.** Nenhuma regra do documento 04 é alterada
por iniciativa da Fase 2, 3 ou 4. O Princípio II da constitution codifica isso como restrição
inviolável do agente, e o Princípio X (Paridade Antes de Novidade) fecha a porta lateral: nem mesmo
"melhorar enquanto porta" é permitido.

---

## 2. Preparação do ambiente

Esta seção é para ser executada **uma vez**, na máquina de quem vai conduzir os ciclos. Cada passo
traz o comando real, o critério de sucesso e **o que fazer quando falhar** — porque falha
silenciosa em preparação de ambiente vira erro incompreensível três épicos depois.

### 2.1 Inventário de pré-requisitos

| Item | Verificação | Versão mínima | Para quê |
|---|---|---|---|
| Git | `git --version` | 2.40 | Versionamento; o Spec Kit cria uma branch por feature |
| Node.js | `node --version` | **22 LTS** | Runtime do Next.js 15. É a versão que o CI usa |
| pnpm | `pnpm --version` | 9 | Gerenciador de pacotes (ver §2.3 — depende de confirmação) |
| Docker | `docker --version` e `docker ps` | 24 | O Supabase local roda em contêineres |
| Supabase CLI | `supabase --version` | 1.200+ | Migrations, tipos gerados, pgTAP, banco local |
| Vercel CLI | `vercel --version` | 37+ | Vincular o projeto, ler logs, disparar deploy manual |
| GitHub CLI | `gh --version` | 2.50+ | PR pela linha de comando, sem sair do terminal |
| Python | `python3 --version` | 3.11 | ETL do Épico 2 e o `specify-cli` |
| `uv` | `uv --version` | 0.4+ | Instalador recomendado do Spec Kit |
| Claude Code | disponível no terminal ou no VSCode | — | O agente |

### 2.2 Node.js 22

```bash
# Instalação recomendada, via nvm — permite fixar a versão por projeto
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
exec $SHELL -l
nvm install 22
nvm use 22
node --version     # deve responder v22.x
```

Fixe a versão no repositório para que ninguém rode com outra:

```bash
node --version | sed 's/v//' > .nvmrc
```

**Quando falhar.** `nvm: command not found` depois de instalar significa que o shell não recarregou o
perfil — abra um terminal novo. Se `node --version` responder v18 ou v20, o Next.js 15 até sobe, mas
o CI usa 22 e você vai depurar diferença de ambiente em vez de código: **não prossiga com versão
diferente da do CI**.

### 2.3 Gerenciador de pacotes — **pnpm** (pendente de confirmação do Bernardo)

O documento 24 §10 registra isto como decisão em aberto. **Este plano assume `pnpm`** (lockfile
determinístico, `node_modules` menor, e é o que os scripts do documento 24 §7 usam).

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

**Se o Bernardo preferir npm:** troque `pnpm` por `npm run` em todos os scripts, e a action
`pnpm/action-setup@v4` do `ci.yml` por `cache: npm` no `setup-node`. **Decida antes do Épico 0** — a
troca depois obriga a apagar lockfile e refazer o CI.

**Quando falhar.** `corepack: command not found` em Node instalado por gerenciador do sistema:
instale com `npm install -g pnpm`. Se conviverem `package-lock.json` e `pnpm-lock.yaml` no
repositório, **apague o que não for do gerenciador escolhido** — dois lockfiles produzem builds
diferentes entre a sua máquina e o CI, e é um dia perdido.

### 2.4 Docker

```bash
docker --version
docker ps          # precisa responder sem erro de permissão
```

**Quando falhar.** `permission denied while trying to connect to the Docker daemon socket` no Linux:
`sudo usermod -aG docker $USER` e **saia e entre na sessão**. No macOS/Windows, o Docker Desktop
precisa estar **aberto** — `supabase start` falha com mensagem obscura se ele estiver fechado.
Reserve ~4 GB de memória ao Docker: o stack local do Supabase sobe PostgreSQL, GoTrue, PostgREST,
Realtime, Storage e Studio.

### 2.5 Supabase CLI, login e vínculo

```bash
# Instalação (escolha uma)
brew install supabase/tap/supabase          # macOS
npm install -g supabase                     # multiplataforma
# Linux (deb): baixe o .deb da release em github.com/supabase/cli/releases

supabase --version
```

Autenticação e vínculo com o projeto que o Bernardo já criou:

```bash
# 1. Login — abre o navegador e devolve um token de acesso
supabase login

# 2. Descobrir a referência do projeto (a coluna REFERENCE ID)
supabase projects list

# 3. Vincular ESTE repositório ÀQUELE projeto. Pede a senha do banco.
supabase link --project-ref <ref-do-projeto>

# 4. Conferir o vínculo
supabase projects list      # o projeto vinculado aparece marcado com ●
```

Subir o ambiente local:

```bash
supabase init          # cria supabase/config.toml — só na primeira vez
supabase start         # sobe o stack em Docker; demora na primeira execução
supabase status        # imprime as URLs e as chaves LOCAIS
```

`supabase status` devolve, entre outras coisas:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGciOi...        ← pública por natureza, sujeita à RLS
service_role key: eyJhbGciOi... ← SEGREDO, mesmo local: trate como segredo desde o primeiro dia
```

**Quando falhar.**

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `supabase link` pede senha e recusa | A senha do banco não é a da conta Supabase | Painel do projeto → *Settings → Database → Reset database password*. Guarde no gerenciador de senhas, não num arquivo do repositório |
| `failed to connect to postgres` no `start` | Docker fechado ou porta 54322 ocupada | Abra o Docker; `supabase stop --no-backup` e suba de novo; ou mate o processo que ocupa a porta |
| `supabase start` trava em *Waiting for health checks* | Memória insuficiente no Docker | Aumente para 4 GB nas preferências do Docker Desktop |
| Chaves locais mudaram entre sessões | Normal após `supabase stop --no-backup` | Rode `supabase status` de novo e atualize `.env.local` |

> ⚠️ **Nunca rode `supabase db push` contra o projeto remoto durante a preparação.** O `link` só
> conecta; ele não aplica nada. A primeira migration vai ao remoto no Épico 1, pelo CI, com o
> Bernardo ciente.

### 2.6 Vercel CLI

```bash
npm install -g vercel
vercel --version
vercel login              # abre o navegador
vercel link               # vincula ESTE diretório a um projeto da Vercel
```

**Quando falhar.** `vercel link` oferecendo criar projeto novo quando já existe um: escolha
*Link to existing project* e selecione pelo nome — criar um segundo projeto para o mesmo repositório
produz duas URLs de produção e ninguém descobre qual é a boa. Se o `vercel link` não achar o
projeto, é porque a conta logada não é a dona: confirme com o Bernardo qual conta/equipe hospeda.

**Variáveis de ambiente** — a Vercel precisa delas em três escopos, e errar o escopo é a causa nº 1
de "funciona local e quebra em preview":

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY production     # NUNCA com prefixo NEXT_PUBLIC_
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add NEXT_PUBLIC_AMBIENTE preview             # valor: preview
vercel env add NEXT_PUBLIC_AMBIENTE production          # valor: producao
vercel env ls                                           # conferência
```

### 2.7 GitHub CLI

```bash
gh --version
gh auth login             # escolha HTTPS e autenticação pelo navegador
gh repo view              # confirma que o diretório aponta para o repositório certo
```

Proteção da branch principal — **faça isto antes do primeiro PR**, não depois:

```bash
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=qualidade' \
  -F 'required_status_checks.contexts[]=banco' \
  -F 'required_status_checks.contexts[]=build' \
  -F enforce_admins=false \
  -F restrictions=null
```

**Quando falhar.** Em repositório pessoal de plano gratuito, a proteção de branch pode não estar
disponível — nesse caso a regra vira **acordo escrito no `CLAUDE.md`** ("nunca `git push` direto na
`main`") e o CI continua rodando em `push`. Não é equivalente, mas é o que há.

### 2.8 Spec Kit

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z
specify --version
```

Substitua `vX.Y.Z` pela tag mais recente em `github.com/github/spec-kit/releases`. Inicialização
**dentro do repositório já clonado**:

```bash
specify init . --integration claude
```

Se a pasta já tiver arquivos (e terá, porque o repositório existe), acrescente `--force`.

**Critério de sucesso:** ao abrir o Claude Code nessa pasta, os comandos `/speckit.constitution`,
`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`,
`/speckit.checklist` e `/speckit.implement` aparecem disponíveis. **Se não aparecerem, o `init`
falhou ou você não está na pasta certa — não prossiga.**

**Quando falhar.** `uv: command not found` → `curl -LsSf https://astral.sh/uv/install.sh | sh`.
Comandos não aparecendo no Claude Code → confira que `.claude/skills/` foi criado e reinicie a
sessão do agente.

### 2.9 Conferência final do ambiente

```bash
node --version && pnpm --version && docker ps -q >/dev/null && echo "docker ok" \
  && supabase --version && vercel --version && gh --version && specify --version \
  && python3 --version
```

Se qualquer linha falhar, **resolva antes de escrever a primeira linha de código**. Ambiente
meio-configurado produz erro que o agente tenta consertar no código, e aí você tem dois problemas.

---

## 3. Estrutura do repositório

**Não duplicada aqui de propósito.** A árvore completa, pasta por pasta, com o que entra e o que não
entra em cada uma, está em **`Fase 2 - Arquitetura/24-Estrutura-do-Repositorio-e-Convencoes.md`
§1** — e o BRIEF §4 traz a versão resumida. Ler os dois é obrigatório antes do Épico 0.

O que este plano precisa fixar são **três pontos de processo** que decorrem daquela estrutura:

**3.1 A documentação vive dentro do repositório.** Copie a suíte inteira da v2.1 para `docs/`:

```bash
mkdir -p docs
cp -r "v2.1/Fase 1 - Requisitos"  docs/fase-1
cp -r "v2.1/Fase 2 - Arquitetura" docs/fase-2
cp -r "v2.1/Fase 3 - Migracao"    docs/fase-3
cp -r "v2.1/Vibe Coding"          docs/vibe-coding
cp    "BRIEF-v2.1.md"             docs/BRIEF-v2.1.md
cp -r "v2.1/sql"                  docs/sql-referencia
git add docs && git commit -m "docs(BRIEF): incorporar a suíte da v2.1 ao repositório"
```

Não é redundância burocrática: é o que permite ao agente **citar `RF-DSA-08` com o texto real à
vista**, em vez de parafrasear de memória. É a diferença entre um agente que respeita a Fase 1 e um
que a inventa.

**3.2 `docs/sql-referencia/` é fonte, `supabase/migrations/` é execução.** Os seis scripts de `docs/sql-referencia/` (`00_extensoes_e_tipos`,
`01_tabelas_cadastro`, `02_tabelas_fato`, `03_config_e_calendario`, `04_views_e_funcoes`,
`05_rls_policies`) são a **referência comentada** do schema, e a ordem numérica é a ordem de
execução. As migrations de verdade nascem deles, com timestamp, em `supabase/migrations/`. **O SQL é
escrito à mão** — migration gerada por diff que ninguém leu é exatamente como o schema da v2.0
divergiu do documentado.

**3.3 `lib/dominio/` é o coração, e nasce protegido.** É onde as ~40 regras `RN-` viram funções
TypeScript puras. **Nada em `lib/dominio/` importa `supabase`, `next` ou `react`** — e essa regra é
imposta por ESLint no Épico 0, com teste que prova a regra ativa, **antes** de haver a primeira
função. Regra que depende de memória é regra que se perde no sexto épico.

---

## 4. Passo 1 — `CLAUDE.md`, o contexto permanente

**Antes de qualquer comando do Spec Kit**, crie `CLAUDE.md` na raiz do repositório. Ele é lido
automaticamente pelo Claude Code em **toda** sessão, e é o que impede a deriva de contexto ao longo
de catorze épicos.

**O arquivo já está escrito:** `v2.1/CLAUDE.md`. Copie-o para a raiz do repositório novo:

```bash
cp v2.1/CLAUDE.md ./CLAUDE.md
git add CLAUDE.md && git commit -m "docs(BRIEF): ancorar contexto permanente do agente"
```

**O que ele contém** (não repita aqui; leia lá): o que é o sistema em cinco linhas · idioma ·
plataforma e proibições · quais documentos ler e **quando** · regras invioláveis · vocabulário
intraduzível · convenções de banco, código e commit · a Definition of Done · os gotchas da
plataforma · o estado atual e onde retomar.

**A regra de manutenção que mais importa: mantenha-o curto.** Um `CLAUDE.md` de trezentas linhas é
lido com o mesmo cuidado que um contrato de licença. Ele aponta para os documentos; não os resume.
Quando o agente começar a violar uma restrição que está lá, o diagnóstico provável **não** é "falta
escrever mais" — é "o arquivo cresceu e parou de ser lido".

**Atualize `CLAUDE.md` ao fim de cada épico**, na seção *Estado atual*: qual épico fechou, qual é o
próximo, o que está bloqueado por decisão do Bernardo. É a primeira coisa que o agente lê numa
sessão nova, e é onde ele descobre onde retomar.

---

## 5. Passo 2 — A constitution

A constitution é o único artefato que o agente carrega em **todos** os comandos seguintes. Aqui
entram os princípios que não podem ser esquecidos no décimo quarto épico.

**Ela também já está escrita:** `Vibe Coding/40-Constitution-v2.1.md`, versão 2.1.0, ratificada em
26/08/2026. **Não a gere com `/speckit.constitution`** — instale-a:

```bash
mkdir -p .specify/memory
cp "v2.1/Vibe Coding/40-Constitution-v2.1.md" .specify/memory/constitution.md
git add .specify/memory/constitution.md
git commit -m "docs(BRIEF): instalar constitution v2.1.0 (Princípio III reescrito)"
```

**Por que não gerar.** A constitution da v2.1 carrega decisões que só o Bernardo podia tomar e que o
agente não tem como inferir: a revogação datada de `RNF-PLAT-01..04`, a rejeição da CAHO 2026 como
padrão-ouro, LIQ-2, P-14, e o texto revogado do Princípio III **preservado para leitura**. Um
`/speckit.constitution` produziria um texto plausível e perderia a trilha — que é justamente o que a
v2.1 existe para não perder.

**Confira, depois de instalar,** que o agente enxerga os onze princípios. Um teste barato e honesto:
peça a ele, numa sessão limpa, *"o que o Princípio III proíbe hoje, e o que ele proibia antes?"*. Se
a resposta não citar Prisma/Drizzle de um lado e Apps Script do outro, a constitution não está sendo
carregada — investigue antes de seguir.

---

## 6. Passo 3 — Épico 0 (Fundação), comando a comando

O objetivo do Épico 0 é **um deploy verde na Vercel, a partir de um repositório que compila, testa e
gera os tipos do banco sozinho**. Nenhuma tabela, nenhuma tela de negócio, nenhum dado.

Este épico é o único que **não** passa pelo ciclo Spec Kit completo: é encanamento, não fatia de
domínio. Conduza-o em conversa normal com o agente, comando a comando, revisando cada passo.

### 6.1 Scaffold do Next.js dentro do repositório existente

```bash
git clone https://github.com/<org>/<repo>.git ciaara-11
cd ciaara-11
git checkout -b chore/epico-0-fundacao

pnpm dlx create-next-app@latest . \
  --typescript --tailwind --app --eslint \
  --src-dir=false --import-alias "@/*" --use-pnpm
```

**Quando falhar.** `create-next-app` recusando pasta não vazia: mova `README.md` e `.git` de lado não
— ele aceita pasta com `.git` e `README.md`; se houver mais arquivos, crie em pasta temporária e
copie o conteúdo por cima. **Não apague o `.git`.**

Confira que sobe:

```bash
pnpm dev        # http://localhost:3000 deve responder
```

### 6.2 TypeScript `strict` e as regras que sustentam a arquitetura

Ajuste `tsconfig.json` conforme o documento 24 §5.1 (`strict: true` não é negociável). Depois,
instale as regras de ESLint que protegem as duas fronteiras mais caras deste projeto — a pureza de
`lib/dominio/` e a chave `service_role`:

```bash
pnpm add -D eslint-plugin-import
```

```javascript
// eslint.config.mjs — trecho essencial. Ver documento 24 §5.2 para o arquivo completo.
export default [
  // ...configuração base do Next.js
  {
    // FRONTEIRA 1 — lib/dominio/ é puro. Nada de I/O, nada de plataforma.
    files: ["lib/dominio/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@supabase/*", "@/lib/supabase/*"], message: "lib/dominio/ é puro: sem acesso a banco (Princípio II)." },
          { group: ["next/*", "react", "react-dom"],    message: "lib/dominio/ é puro: sem dependência de plataforma (risco R-10)." },
        ],
      }],
    },
  },
  {
    // FRONTEIRA 2 — a service_role nunca chega ao navegador (risco R-09).
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "@/lib/supabase/admin", message: "admin.ts usa service_role: só de Server Action. Ver constitution, Restrições Adicionais." }],
      }],
    },
  },
];
```

**Critério de aceite 5 do Épico 0:** existe um teste que **prova a regra ativa** — um arquivo de
fixture em `tests/unidade/lint/` que importa `supabase` de dentro de `lib/dominio/` e uma verificação
que espera o lint falhar. Regra de lint que ninguém verificou é regra que alguém desligou.

### 6.3 Supabase local e os clientes de acesso a dados

```bash
supabase init
supabase start
supabase status
```

Crie `lib/supabase/` com os quatro arquivos do BRIEF §4 — `client.ts`, `server.ts`, `middleware.ts`,
`admin.ts` — usando `@supabase/ssr`:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D server-only
```

`lib/supabase/admin.ts` **começa** com `import "server-only";`. Não é detalhe estilístico: é a
segunda das três defesas contra o vazamento da `service_role`, e é a que quebra o **build**.

**Este é o ponto do projeto onde resolver as armadilhas de cookie/sessão do `@supabase/ssr` com o App
Router** — o documento 06 avisa explicitamente: resolver **aqui**, não espalhado pelos épicos
seguintes.

### 6.4 Tipos gerados — o contrato de dados

```bash
mkdir -p lib/tipos
supabase gen types typescript --local > lib/tipos/database.ts
```

Este arquivo **substitui a aba `_Meta_Colunas` da v2.0**: o contrato de coluna que o Sheets não tinha
nativamente passa a ser garantido pelo motor. É o exemplo canônico de *requisito absorvido pela
plataforma* (BRIEF §2.1) — cite-o quando alguém perguntar o que se ganhou na migração.

**Regra permanente, e o risco R-04:** `pnpm db:tipos` **depois de toda migration**, sempre. O CI
falha se o resultado divergir do que está commitado — é a única defesa que não depende de alguém
lembrar.

### 6.5 Suíte de testes, rodando vazia

```bash
pnpm add -D vitest @vitest/coverage-v8
pnpm add -D @playwright/test && pnpm exec playwright install --with-deps chromium
mkdir -p tests/unidade tests/invariantes/rls tests/e2e supabase/tests
```

Um teste trivial em cada suíte, que passa. **Suíte que roda vazia hoje é suíte que ninguém precisa
configurar sob pressão amanhã**, no meio de um épico com prazo.

### 6.6 Scripts de `package.json`

Copie os scripts do documento 24 §7 **integralmente, com os comentários**. Eles são a interface de
comando do projeto inteiro, e os comentários explicam *por que* cada um existe — inclusive os dois
que o agente mais esquece: `db:tipos` (risco R-04) e `verificar` (a sequência do CI, local).

### 6.7 CI no GitHub Actions

Crie `.github/workflows/ci.yml` a partir do esqueleto do documento 24 §6.4, com os três jobs:
**qualidade** (typecheck, lint, unidade), **banco** (`supabase start` → `db reset` → conferência de
tipos gerados → pgTAP → RLS) e **build**.

```bash
git add . && git commit -m "chore(CI): pipeline de qualidade, banco e build"
git push -u origin chore/epico-0-fundacao
gh pr create --fill
```

**Quando falhar.** O job `banco` é o que mais falha na primeira execução, quase sempre por
`supabase/setup-cli@v1` sem `version` fixada ou por falta de Docker no runner (`ubuntu-latest` tem).
Leia o log do job, não adivinhe: `gh run view --log-failed`.

### 6.8 Primeiro deploy verde

```bash
vercel link
vercel env ls                 # as seis variáveis de §2.6 precisam estar lá
git push                      # a Vercel publica a preview da branch automaticamente
```

**O portão de saída do Épico 0** — os seis critérios de aceite do documento 06, verificados um a um:

1. `git clone` + `pnpm install` + `pnpm dev` sobe a aplicação num ambiente limpo, **seguindo apenas o
   README**. Teste isto de verdade, numa pasta nova. É o critério que mais é declarado sem ser
   verificado.
2. Um push em branch gera preview na Vercel com URL própria — abra a URL.
3. O CI roda `tsc --noEmit`, `eslint`, `vitest` e `playwright`, e **falha o merge** se qualquer um
   falhar. Prove quebrando de propósito: um `const x: number = "a"` num commit descartável.
4. `lib/tipos/database.ts` é gerado por comando documentado, e o CI falha se estiver desatualizado.
5. A regra de lint impede `import … from '@/lib/supabase…'` dentro de `lib/dominio/`, **com teste que
   prova a regra ativa**.
6. `.env.local.example` lista toda variável necessária, **sem nenhum segredo real**.

Só então: merge, e o Épico 1 abre.

---

## 7. Passo 4 — O ciclo padrão de uma fatia

Este é o loop que se repete dezenas de vezes. Dez passos; os quatro últimos são o que separa "código
gerado" de "código implantado e conferido".

| # | Passo | Comando / ação | Quem conduz | Saída |
|---|---|---|---|---|
| 1 | **Especificar** | `/speckit.specify <prompt do documento 42>` | Humano cola o prompt · agente escreve | branch `NNN-*` + `specs/NNN-*/spec.md` |
| 2 | **Clarificar** | `/speckit.clarify` | Agente pergunta · **humano responde** | seção *Clarifications* no `spec.md` |
| 3 | **Conferir a spec** | leitura, com os documentos 02/04/06 ao lado | **Humano, sozinho** | correções no `spec.md` |
| 4 | **Planejar** | `/speckit.plan <restrições repetidas>` | Agente propõe · humano aprova | `plan.md`, `data-model.md`, `research.md` |
| 5 | **Tarefas** | `/speckit.tasks` | Agente decompõe | `tasks.md`, toda tarefa com `RF-`/`RN-` |
| 6 | **Analisar** | `/speckit.analyze` | Agente confere a si mesmo | relatório de inconsistência |
| 7 | **Implementar** | `/speckit.implement` (em fatias) | Agente escreve · humano revisa o diff | código + migration + testes |
| 8 | **Verificar** | `pnpm verificar` + `test:invariantes` + `test:rls` + `test:e2e` | Agente roda · humano lê o resultado | tudo verde |
| 9 | **PR e preview** | `gh pr create --fill` | Agente abre · **Bernardo valida na URL** | preview aprovada |
| 10 | **Merge** | squash na `main` | **Humano** | produção + migration aplicada |

### 7.1 Notas que economizam retrabalho

**Passo 2 é obrigatório, não opcional.** A suíte da v2.1 é densa e cheia de referência cruzada; o
`/speckit.clarify` é onde o agente **expõe o que entendeu errado**, enquanto corrigir ainda é barato.
Pular esse passo desloca a descoberta para o passo 8 — ou, pior, para o preview.

**Passo 3 não se delega.** É o único passo do ciclo em que o agente não participa. Ler a spec com o
documento 04 ao lado é o que pega regra de negócio traduzida em vez de portada — o erro mais caro e
mais silencioso desta migração (§11.1).

**Passo 4 sempre repete as restrições de plataforma.** Mesmo com a constitution e o `CLAUDE.md`, é no
`/speckit.plan` que o agente mais tende a propor "uma pequena biblioteca". Repita, literalmente:
*Next.js 15 App Router, Server Components por padrão, Tailwind v4, shadcn/ui, Supabase, sem ORM, sem
biblioteca de componentes além de shadcn/Radix, regra de negócio em `lib/dominio/` pura.*

**Passo 5 exige origem em toda tarefa.** `[RF-CRONOS-07] Aplicar mudança de regime a partir da data
de vigência`. Tarefa sem `RF-`/`RN-` significa **requisito faltando na spec ou tarefa fora de
escopo** — ambos bloqueiam. Não relaxe este critério "porque é óbvio de onde veio".

**Passo 6 antes do 7, sempre.** O `/speckit.analyze` roda em segundos e pega tarefa sem requisito,
requisito sem tarefa e contradição entre plan e spec. É o mais barato dos passos e o mais fácil de
pular.

**Passo 7 em fatias.** Se o `tasks.md` tiver mais de vinte tarefas, peça a implementação por fase
(`/speckit.implement fase 1`), revisando o diff entre uma e outra. Um `implement` de cem tarefas
produz um diff que ninguém revisa de verdade — e "revisei" vira uma afirmação sem lastro.

**Ordem de implementação dentro do passo 7: de dentro para fora** (documento 24 §8):

```
a) lib/dominio/    → a regra RN-, pura, com o teste Vitest ao lado
b) lib/validacao/  → o schema Zod, compartilhado cliente + servidor
c) lib/acoes/      → a Server Action: Zod → domínio → Supabase → revalidatePath
d) app/            → a página (Server Component) e as ilhas "use client"
e) components/     → só o que for reutilizado por 2+ rotas
```

Quem começa pela tela escreve a regra dentro do componente e descobre no passo 8 que ela não é
testável. Quem começa pelo domínio tem a regra provada antes de existir botão.

**Migration no meio da fatia:** `pnpm db:migration <nome>` → escreva o SQL **à mão** (tabela,
`ENABLE ROW LEVEL SECURITY`, policies, índices, trigger `set_auditoria()`, colunas de auditoria,
`origem_migracao_v1`) → `pnpm db:reset` (prova que a sequência inteira aplica do zero) →
`pnpm db:tipos` (**não pule** — risco R-04).

### 7.2 A divisão de trabalho, explícita

| O agente faz | O humano faz |
|---|---|
| Escrever spec, plan, tasks a partir dos prompts do documento 42 | Colar o prompt certo; responder as perguntas do `clarify` |
| Portar regra `RN-` para `lib/dominio/` com teste | **Conferir que é porte, não reescrita** — documento 04 ao lado |
| Escrever migration, policy e teste pgTAP | **Ler a migration linha a linha** antes do merge (documento 41) |
| Rodar `pnpm verificar` e consertar o que quebrar | Ler o resultado; decidir se o conserto é legítimo |
| Abrir o PR com o template preenchido | **Validar na URL de preview**; aprovar; fazer o merge |
| Atualizar `CLAUDE.md` no fim do épico | Conferir que o *Estado atual* está correto |
| — | **Decidir**: LIQ-3, LIQ-4, hospedagem, gerenciador de pacotes · *(UE-1 decidido em 26/08/2026 — rota (b))* |

---

## 8. Protocolo de implantação

Esta seção **substitui integralmente** o §8 do documento 10 da v2.0. Ela é curta porque a plataforma
nova resolve, de graça, o que antes exigia ritual.

### 8.1 O que se aposenta, e o que fica no lugar

| Aposentado (v2.0) | Por que existia | Substituto (v2.1) |
|---|---|---|
| `clasp login` / `push` / `deploy` manual | Colar 16 arquivos no editor gerou 17 implantações órfãs e deixou um erro de digitação passar | **`git push`** → preview automática; **merge** → produção |
| `BUILD_ID` idêntico em backend e frontend (`RF-MOD-04`) | Detectar **implantação parcial**, estado possível quando arquivos iam um a um | **[ABSORVIDO PELA PLATAFORMA]** — build atômico e versionado. Implantação parcial deixa de ser estado alcançável |
| `implantacao/MANIFESTO.md` | Lista de conferência arquivo a arquivo | `git log` + histórico de deploys da Vercel |
| `implantacao/historico/AAAA-MM-DD.md` | Registro manual de cada publicação | Histórico da Vercel + `supabase/migrations/` versionadas |
| "Substituir tudo, nunca editar trecho" | Impedir dessincronia repositório × navegador | **Não há navegador.** O repositório é a única origem (P-1) |
| Conferência contra `baseline/caho-2026/` | Não regressão por diff de saída histórica | **Invariantes** (Princípio VI). A CAHO 2026 foi rejeitada em 10/08/2026 |

### 8.2 O fluxo, ponta a ponta

```
branch  ──push──▶  CI (qualidade · banco · build)  ──▶  Vercel Preview + banco de preview
                                                              │
                                                     Bernardo valida na URL
                                                              │
                                                        PR aprovado
                                                              │
                                                   merge por squash na main
                                                              │
                                       ┌──────────────────────┴──────────────────────┐
                                  deploy de produção                    supabase db push (migrations)
```

**Três regras que sustentam o fluxo:**

1. **`main` é sempre implantável.** Push direto bloqueado por proteção de branch (§2.7).
2. **Uma branch por fatia**, nomeada `<tipo>/<identificador>-<resumo-curto>` —
   `feat/RF-DSA-08-sugestao-semanal`, `db/RN-2027-09-regime-historico`.
3. **A validação do Bernardo acontece na preview, antes do merge.** Nunca em produção, nunca em
   captura de tela. É o ambiente que a v2.0 nunca teve.

### 8.3 Migration em produção

A migration é a única parte deste protocolo que **não** é reversível por clique. Trate-a com o
cuidado proporcional.

```bash
# 1. Local — a migration nasce e é provada do zero
pnpm db:migration criar_registros_aula
#    → escreva o SQL À MÃO
pnpm db:reset          # prova que a sequência INTEIRA aplica numa base limpa
pnpm db:tipos          # regenera lib/tipos/database.ts — obrigatório

# 2. Preview — o CI aplica no banco de preview automaticamente ao abrir o PR
#    Confira no Studio do projeto de preview que o schema chegou como esperado.

# 3. Produção — pelo merge, executado pelo CI
#    Se precisar rodar à mão (só com autorização explícita e conferindo o alvo):
supabase link --project-ref <ref-de-PRODUCAO>   # confira DUAS vezes
supabase db push --linked
supabase migration list --linked                 # confirma o que foi aplicado
```

**A checagem que evita o pior erro possível:** antes de qualquer `db push`, rode
`supabase projects list` e **leia em voz alta** qual projeto está marcado. Aplicar migration de
desenvolvimento no projeto de produção é o único erro deste plano que não tem desfazer barato.

**Regras de migration nesta base:**

- **Nunca `drop column` numa tabela com histórico.** Coluna que perdeu uso vira comentário
  `-- [APOSENTADA — v2.1]` e continua lá. É o Princípio IV.
- **Nunca `drop table`.** Vale o mesmo.
- **Renomeação é migration própria**, separada de qualquer mudança de comportamento, para que o
  rollback seja possível sem desfazer as duas coisas.
- **Toda migration que cria tabela cria junto:** `ENABLE ROW LEVEL SECURITY`, as policies, os índices,
  o trigger `set_auditoria()`, o quarteto de auditoria e `origem_migracao_v1`. Tabela criada sem RLS
  numa migration é tabela exposta até alguém notar.

### 8.4 Rollback

| Situação | O que fazer |
|---|---|
| Defeito só na aplicação, schema intacto | **Vercel → Deployments → o deploy anterior → Promote to Production.** Segundos, sem tocar no banco |
| Defeito na aplicação **e** migration aditiva (coluna/tabela nova, nada removido) | Promova o deploy anterior. A migration aditiva **pode ficar**: código antigo ignora coluna nova. Corrija e siga adiante |
| Migration destrutiva ou com transformação de dado | **Aplique a migration de reversão** escrita no PR (campo obrigatório do template). Se não houver, restaure do backup do Supabase — e trate a ausência do plano de reversão como defeito de processo |
| Dado corrompido por carga do ETL | Procedimento do documento 30 (plano de migração): restaurar o snapshot e reexecutar. O ETL é **idempotente** por exigência do Épico 2 |

**O que nunca é rollback:** apagar linhas para "voltar ao que era". Corrigir dado é evento novo,
logado em `migracao_log` (Princípio IV). O `UPDATE` que reescreve log já gravado é bloqueado por
gatilho, **inclusive para `service_role`** — e isso é proteção, não obstáculo.

### 8.5 O que fica registrado, automaticamente

Nada de `historico/*.md` escrito à mão. O rastro vem de graça: o **título do commit** carrega o
identificador `RF-`/`RN-`; o **PR** carrega o template preenchido com a DoD e o plano de reversão;
o **histórico da Vercel** carrega qual commit está em produção e desde quando; **`supabase migration
list`** carrega quais migrations estão aplicadas onde.

---

## 9. Roteiro dos catorze épicos

O detalhamento de cada épico — escopo, fora de escopo, `RF-`/`RN-` cobertos, critérios de aceite,
dependências, riscos e esforço — está no **documento 06 §3**. Os **prompts prontos** estão no
documento **42**. Aqui fica o **objetivo de cada ciclo** e o portão de saída: a frase que responde
*"como sei que este épico acabou?"*.

**Sequenciamento** (documento 06 §6.5):

```
Caminho crítico:   0 → 1 → 2 → 3 → 5 → 6 → 9 → 8 → 7 → 10 → 12
Paralelo desde 0:  4 (Design System + shell) · lib/dominio/ (regras RN- puras)
Paralelo desde 5:  11 (LIQ/OS/Ficha) · 13 (ROTA)
Decisão antes de 1: TURMA-1 · P-1        [UE-1 decidido em 26/08 — rota (b), grão de UE]
Decisão antes de 2: hospedagem fora da infraestrutura da MB (CIAARA-14.2)
Decisão antes de 11: LIQ-3 · LIQ-4
```

| # | Épico | Objetivo do ciclo | Portão de saída |
|---|---|---|---|
| **0** | Fundação | Repositório que compila, testa e implanta sozinho, com Supabase vinculado e tipos gerados | Os seis critérios de §6.8 verificados um a um, **inclusive o clone limpo** |
| **1** | Schema + RLS + matriz | O modelo do documento 05 vira DDL executável, com integridade, vigência por `EXCLUDE` e RLS em toda tabela | `supabase db reset` reconstrói do zero; as sete regras de unicidade têm teste que **espera a falha**; trocar permissão é `UPDATE`, não migration |
| **2** | ETL + reconciliação | 100% do histórico da planilha no PostgreSQL, verificável linha a linha | Contagens batem com o documento 05 §10; as três identidades aritméticas fecham; **zero FK órfã**; reexecutar produz base idêntica |
| **3** | Auth por convite + RBAC | Só entra quem o Admin convidou; o que cada um faz é o que a matriz permite, **verificado pelo banco** | E-mail não convidado não cria conta por **nenhum** caminho; para cada perfil há teste que prova o banco **negando** leitura e escrita fora do escopo |
| **4** | Design System + shell por URL | Linguagem visual única e navegação em que **a URL é o estado** | `/cursos/[curso]?turma=T2&semana=34` numa aba nova reproduz a mesma tela; voltar/avançar funcionam; contraste AA nos dois temas |
| **5** | Cadastros | Cursos, turmas, disciplinas e instrutores, com o refinamento acumulado em quinze specs | Ordenação por antiguidade em **toda** lista, filtro e seletor, verificada por teste em todas as ocorrências; CH do instrutor nunca digitável |
| **6** | DSA | A tela mais usada: lançar a semana e imprimi-la | Impressão em **uma** página A4 paisagem com paridade contra o modelo da v2.0; DSA de março traz quem assinava em março |
| **7** | Cronograma + motor preditivo | Previsto × executado no mesmo módulo; motor para **qualquer** ano | Nenhum literal de ano no código, provado por busca; alterar feriado muda a simulação sem redeploy; toda `RN-2027-*` com função pura e teste |
| **8** | Avaliações | Acompanhamento por **situação de execução**, sem fórmula de nota | Nada depende de `formula_mf` nem `carater`, provado por busca; agendar não consome TA, executar consome no **mesmo** registro |
| **9** | Atividades + tetos | As grandezas normativas corretas, com tetos calculados e **sinalizados** | Estudo Individual **nunca** entra na CHT; estourar teto gera alerta e **nunca** impede o lançamento; 531/62/60/11 conferem |
| **10** | Relatórios e impressão | O documento consolidado da turma por período | Formato por seção e geral produzem **totais idênticos**; totais batem com DSA e Cronograma — invariante cruzado |
| **11** | LIQ, OS de Instrutoria, Ficha | Os três documentos oficiais, por `/print/*` | LIQ de trimestre com segunda turma sai com o período **da T2**; coluna "Observação" sai **vazia**, verificada por teste |
| **12** | Sugestão do DSA | Prévia semanal sugerida — **ajuda, nunca trava** | A etapa (ii), de validação contra semana real, é executada e registrada **antes** de qualquer trabalho da (iii) |
| **13** | ROTA | Organizar o que o sistema já tem, para transcrição manual | **Não** gera nem submete a planilha; nenhum campo novo de cadastro criado para alimentá-la |

**Duas notas de sequenciamento que valem repetir:**

**2 antes de 3 é deliberado e contraintuitivo.** O instinto é proteger antes de povoar. A razão é
operacional: durante o Épico 2 o único acesso ao banco é o do ETL, com `service_role`, num ambiente
sem usuário nenhum — não há exposição real. E uma suíte de RLS validada contra **dados reais** é
qualitativamente diferente de uma validada contra fixtures: o caso interessante ("este usuário vê
estas linhas e não aquelas") só existe quando há linhas.

**Duas frentes nunca escrevem migrations ao mesmo tempo.** Conflito de ordenação de migrations é caro
de resolver e fácil de evitar: **uma frente detém a caneta do schema**. Isso limita a paralelização
do Épico 4 (que não toca no schema) e do trabalho de `lib/dominio/` (que não toca em nada) — ambos
seguros.

---

## 10. Rastreabilidade

O `RNF-AUD-03` entrega o elo requisito ↔ regra. Este plano fecha os demais com quatro convenções
mecânicas — mecânicas de propósito, porque convenção que exige julgamento não sobrevive ao décimo
épico.

**10.1 Tarefa cita origem.** `[RF-CRONOS-07] Aplicar mudança de regime a partir da data de
vigência`. Sem `RF-`/`RN-`: ou o requisito falta na spec, ou a tarefa está fora de escopo. **Ambos
bloqueiam.**

**10.2 Commit cita a fatia.**

```
feat(RF-DSA-08): gerar sugestão semanal do DSA
fix(RN-CONF-01): ignorar bloco sem TA inicial na detecção de conflito
db(RN-2027-09): criar curso_regime_historico com vigência por EXCLUDE
test(RN-ANT-02): cobrir empate de posto por antiguidade declarada
docs(BRIEF): registrar revogação de RNF-PLAT-01..04
chore(CI): validar tipos gerados contra o schema
```

Commit **sem** identificador só é aceito em `chore`, `style` e `docs` genéricos. Todo `feat`, `fix`,
`perf`, `db` e `test` cita o seu. Combinado com um commit por fatia (squash no merge), o `git log`
vira o registro de execução da Fase 3 **sem esforço adicional**.

**10.3 Teste carrega o nome da regra.** Toda `RN-` de *Risco: Alto* do documento 04 tem asserção
nomeada pelo próprio identificador: `RN-ANT-01`, `RN-ANT-02`, `RN-RBAC-01`, `RN-RBAC-02`,
`RN-CRUD-02`, `RN-CRUD-03`, `RN-INST-01`, `RN-INST-02`, `RN-INST-05`, `RN-MAT-01`, `RN-MAT-02`,
`RN-DIST-01`, `RN-DIST-02`, `RN-DIST-03`, `RN-CONF-01`, `RN-CONF-02`, `RN-2027-01` a `RN-2027-09`,
`RN-EVT-01`, `RN-EVT-02`, `RN-EVT-03`, `RN-AVAL-01`, `RN-AVAL-02`, `RN-DEG-01`, `RN-DEG-02`.

Esse inventário **já está pronto no documento 04** — basta não perdê-lo. **Stub explicitamente
pendente é aceito e é melhor que cobertura fingida** (Princípio VIII).

**10.4 Linha migrada carrega a chave legada.** `codigo` guarda o `ID_*` da v2.0 verbatim
(`CUR-000001`, `VIN-000123`); `origem_migracao_v1` guarda a origem. FKs apontam para `id`, nunca para
`codigo` — mas é o `codigo` que permite responder *"esta linha é qual linha da planilha?"* daqui a
dois anos.

**10.5 O PR amarra tudo.** O template do documento 24 §6.3 exige, em cada PR: identificador de
origem; o destino do requisito na v2.1 (`[PRESERVADO]` / `[PRESERVADO — nova implementação]` /
`[ABSORVIDO PELA PLATAFORMA]` / `[REVOGADO — v2.1]` / `[NOVO — v2.1]`); a DoD dos sete itens; a
conferência de fronteira servidor/cliente; o plano de reversão da migration; e como validar no
preview.

Ao final de cada fatia, `/speckit.checklist` gera a verificação da spec. **Rode antes de declarar a
fatia concluída**, não depois.

---

## 11. Riscos e armadilhas do vibe coding **neste** projeto

Riscos genéricos de IA ("pode alucinar") não ajudam ninguém. Estes são os modos de falha concretos
que **este** domínio, **esta** stack e **esta** documentação tornam prováveis. Cada um traz o
**sinal de alerta** — o que você vê antes do estrago — e a **defesa**.

### 11.1 O agente reescreve a regra de negócio em vez de portá-la

**O mais provável e o mais caro.** Um modelo bom, olhando `RN-CONF-02` (o horário ancora no início do
dia, deliberadamente diferente das planilhas legadas), enxerga um bug. E conserta. Com uma
justificativa convincente no comentário.

O catálogo das regras mais convidativas ao "conserto" está no documento 04 e é curto o bastante para
decorar: `RN-CRUD-03` (o instrutor usa inteiro simples, não prefixo — unificar quebra referências),
`RN-ANT-02` (antiguidade vem do P/G, não da coluna `antiguidade_declarada`, que é só desempate),
`RN-CONF-02`, `RN-DIST-03` (rígido × recomendado × sem-teto — três regimes, não um), `RN-MAT-02`
(dedução silenciosa de identidade), `RN-2027-06` (o teto é a **faixa** por regime, não o número do
regime: usar 20 como teto para os 90,4% em 20h permitiria 67% acima do máximo normativo, num
controle auditado pela CoPeCoD).

**Sinal de alerta.** Comentário do tipo *"corrigi o cálculo, que estava considerando…"*, *"simplifiquei
a lógica de…"*, *"unifiquei as duas implementações"*. Teste novo cujo caso esperado difere do que o
documento 04 descreve. Função de `lib/dominio/` mais curta e mais elegante que a original.

**Defesa.** Passo 3 do ciclo (conferir a spec com o documento 04 ao lado) é obrigatório e não se
delega. Toda função de `lib/dominio/` carrega no topo o identificador `RN-` e a **citação literal**
da regra, para que o revisor compare texto com código sem trocar de arquivo. No prompt, exija
sempre: *"porte a regra preservando o comportamento, inclusive o que parecer errado; se algo parecer
errado, **liste ao final** em vez de corrigir."*

### 11.2 O agente "conserta" a RLS — removendo-a ou acrescentando `for delete`

Duas variantes do mesmo erro, e a segunda é a pior porque parece zelo.

**Variante A — remover.** Uma consulta volta vazia; o agente diagnostica "policy restritiva demais" e
afrouxa o `USING`, ou desabilita a RLS "para testar" e esquece de reabilitar. Frequentemente o
diagnóstico está errado: a causa real é o **`GRANT` faltando** (`permission denied for schema
extensions` é o caso clássico deste projeto, achado pelo teste T-04), não a policy.

**Variante B — acrescentar `for delete`.** O agente nota que nenhuma tabela tem policy de `DELETE`,
conclui que é esquecimento e propõe corrigir. **É regra de negócio, não lacuna**: a ausência é a
implementação física de `RN-INST-05` generalizada — exclusão lógica universal. O que a interface
chama de "excluir" é `UPDATE status = 'inativo'`.

**Sinal de alerta.** No diff: `drop policy`, `alter table … disable row level security`, `using
(true)` numa tabela de fato, `for delete`, `grant delete on … to authenticated`. Na conversa: *"a
policy estava bloqueando indevidamente"*, *"faltava a policy de exclusão"*.

**Defesa.** Toda policy no PR é lida **linha a linha** por humano (documento 41). O aviso está
gravado três vezes — em `docs/sql-referencia/05_rls_policies.sql` no ponto exato, no documento 22 §6.2 e na
constitution XI.a — porque é o erro que mais custa. **Um PR que acrescenta `for delete` é rejeitado
sem discussão.** E quando uma consulta vier vazia, o primeiro suspeito é o `GRANT`, não a policy.

### 11.3 O agente gera Client Component desnecessário

`"use client"` no topo de um `page.tsx` "porque precisava de um `useState` para o filtro". O
marcador **contamina toda a subárvore de importação**: a tabela de 177 instrutores, o catálogo de
siglas e a escala de antiguidade vão para o bundle do navegador (risco R-01). O ganho arquitetural
dos Server Components some, e ninguém percebe até a tela ficar lenta.

**Sinal de alerta.** `"use client"` em `page.tsx` ou `layout.tsx`. Crescimento do bundle por rota no
`next build`. `useEffect` buscando dado que o servidor já tinha. Estado de filtro em `useState` em
vez de `searchParams` — que é justamente o que `nuqs` resolve, e o que dá deep-link de graça.

**Defesa.** Item obrigatório no template de PR: *"nenhum `"use client"` novo em `page.tsx` ou
`layout.tsx` — só em folha"*. `next build` imprime o tamanho por rota; **regressão acima de 20 KB
numa rota abre discussão no PR**. E a pergunta que resolve a maioria dos casos: *este componente
precisa de evento do usuário, ou só de dado?* — se é só dado, é Server Component.

### 11.4 O agente inventa coluna que não existe

O modelo conhece milhares de schemas de sistema acadêmico e "sabe" que existe `alunos.nota_final`.
Este sistema **não tem nota** — é competência da CIAARA-32 e da CIAARA-12 (`RNF-NORM-06`). O mesmo
vale para colunas que existiam na v2.0 e foram aposentadas, e para colunas de nome plausível que
nunca existiram.

**Sinal de alerta.** `tsc` acusando propriedade inexistente em `Database["public"]["Tables"]` — este
é o **bom** caso, porque falha cedo. O caso ruim: SQL cru dentro de uma RPC referenciando coluna
inexistente, que só quebra em runtime. Ou pior: o agente **cria** a coluna numa migration para
sustentar a própria invenção.

**Defesa.** `lib/tipos/database.ts` é o contrato, e o CI falha se estiver desatualizado (risco R-04)
— é a razão de `pnpm db:tipos` ser obrigatório após toda migration. Nenhum acesso a dado sem os tipos
gerados. Migration que **cria coluna** exige justificativa com `RF-`/`RN-` de origem no PR: coluna
sem origem é invenção até prova em contrário.

### 11.5 O agente traduz termo normativo

`DSA` vira `WeeklyClassDetail`. `CHD` vira `teachingHours`. `AEC` vira `extraClassActivity`. `TA`
vira `classPeriod`. Cada tradução parece uma melhoria de legibilidade e **destrói a rastreabilidade
até a norma** — que é o que faz este sistema ser auditável pela CoPeCoD e pela ROTA.

**Sinal de alerta.** Nome de tipo, função, coluna, rota ou variável em inglês. Comentário do tipo
*"DSA (Weekly Class Detail)"*. Texto de interface em inglês. `matéria` reaparecendo onde deveria ser
`disciplina` (P-14).

**Defesa.** A lista de intraduzíveis está no `CLAUDE.md`, na constitution e no documento 07
(Glossário): **CHD, AEC, TAD, TR, TA, DSA, CHR, PROENS, DGPM-101/103, CAHO, LIQ, OS de Instrutoria,
ROTA, LHFC, PM, OD, TFM** e as siglas de curso. Uma busca por termos ingleses típicos
(`grade`, `subject`, `teacher`, `student`, `schedule`) na revisão do PR pega a maioria. E a regra
mais simples de todas: **se o Bernardo não usaria a palavra numa conversa, ela não entra no código.**

### 11.6 Deriva de escopo, agora barata de cometer

Next.js e PostgreSQL tornam trivial gerar um arquivo, expor um endpoint, integrar um serviço. O
agente vai sugerir exportar para Excel, mandar e-mail de aviso, gerar a planilha ROTA, calcular
média. **Barato não é o critério.** O critério é o do documento 00 §7: *este processo está atribuído
à CIAARA-11 na Matriz de Responsabilidades?*

**Sinal de alerta.** Frases com *"já que estamos aqui"*, *"seria simples acrescentar"*, *"o usuário
provavelmente vai querer"*. Tarefa no `tasks.md` sem `RF-`/`RN-` de origem. Dependência nova no
`package.json` para uma funcionalidade que ninguém pediu.

**Defesa.** Princípio IX e Princípio X (Paridade Antes de Novidade). A pergunta de triagem, sempre a
mesma: **isto é paridade com a v2.0 ou é novidade?** Novidade espera o corte, vira nota com
identificador, e o Bernardo decide.

### 11.7 O agente move regra de negócio para SQL "porque resolve mais rápido"

Uma RPC em PL/pgSQL resolve a agregação em uma consulta, e a regra `RN-` acaba dentro dela — fora do
alcance do Vitest, fora de `lib/dominio/`, invisível ao teste de unidade (risco R-06).

**Sinal de alerta.** Migration com dezenas de linhas de PL/pgSQL contendo `if`/`case` sobre regra de
negócio. Server Action que só chama `supabase.rpc(...)`. Teste de unidade que sumiu porque "agora é
no banco".

**Defesa.** A fronteira do Princípio XI é explícita: **integridade e autorização** vão para o banco;
**cálculo de domínio** fica em `lib/dominio/`. Toda RPC nova **declara no PR por que não é Server
Action**. Contagem de linhas de PL/pgSQL por migration é sinal de alerta na revisão.

### 11.8 Sessão longa: o agente esquece o que combinamos

No décimo prompt de uma sessão, a restrição do segundo saiu da janela de contexto. O agente propõe
Prisma, ou reescreve algo que já tinha sido revisado e aprovado.

**Sinal de alerta.** Sugestão que contradiz decisão tomada **nesta mesma sessão**. Reescrita de
arquivo que não estava no escopo do pedido. Perda do identificador `RF-` nos commits.

**Defesa.** `CLAUDE.md` curto (por isso a insistência), sessão por fatia e não por dia, e a prática
do documento 41 §7: ao começar uma fatia, mande o agente **reler** a spec e a constitution e
**resumir em cinco linhas** o que vai fazer. Se o resumo estiver errado, você gastou trinta segundos
em vez de duas horas.

### 11.9 Épico 12 virando projeto próprio

Motor de horário é problema de otimização sem fundo. O fatiamento obrigatório em (i) versão simples
→ (ii) **validação contra semana real** → (iii) sofisticação existe exatamente para impedir isso.
**A etapa (ii) é porta, não formalidade**: sem o número medido, a (iii) não abre. Herdado da
recomendação R-5 da v2.0 e preservado no documento 06.

### 11.10 Perda de paridade de impressão

O `@media print` da v2.0 levou **quatro hotfixes** (specs 023–026) para funcionar. Reescrever do zero
convida os mesmos bugs de volta (risco R-08). Impressão é **requisito** (`RNF-COMP-01`), não detalhe:
DSA, Relatório, Cronograma, Ficha do Instrutor, LIQ e OS de Instrutoria mantêm paridade.

**Defesa.** Rotas `/print/*` sem shell, servidor puro; teste e2e Playwright comparando contra o
layout aprovado da v2.0, **obrigatório na DoD da fatia**; e conferência em papel para os documentos
que vão assinados.

---

## 12. Checklist mestre

### Antes do primeiro comando

- [ ] Node 22, pnpm, Docker, Git verificados (`§2.9` responde tudo)
- [ ] Supabase CLI instalada; `supabase login` feito; `supabase link --project-ref <ref>` concluído
- [ ] `supabase start` sobe e `supabase status` imprime as URLs locais
- [ ] Vercel CLI instalada; `vercel link` apontando para o **projeto existente**
- [ ] Variáveis de ambiente cadastradas na Vercel nos escopos **production** e **preview**
- [ ] `gh auth login` feito; proteção da branch `main` configurada (ou o acordo escrito, §2.7)
- [ ] `specify init . --integration claude` concluído; comandos `/speckit.*` visíveis
- [ ] Suíte da v2.1 copiada para `docs/` e commitada
- [ ] **`CLAUDE.md` na raiz**, revisado
- [ ] **`.specify/memory/constitution.md`** = documento 40, instalado e verificado
- [ ] Gerenciador de pacotes **decidido pelo Bernardo** (pnpm ou npm) — antes do Épico 0
- [x] Decisão **UE-1** obtida — **rota (b)**, 26/08/2026: `registros_aula` no grão de Unidade de Ensino
- [ ] Decisão sobre **hospedagem fora da infraestrutura da MB** encaminhada — bloqueia o Épico 2

### Épico 0 — uma vez

- [ ] Scaffold do Next.js dentro do repositório existente (`.git` preservado)
- [ ] `tsconfig.json` com `strict: true`
- [ ] Regras de ESLint das duas fronteiras (`lib/dominio/` puro · `admin.ts` só no servidor)
- [ ] **Teste que prova a regra de lint ativa**
- [ ] `lib/supabase/{client,server,middleware,admin}.ts` com `@supabase/ssr`
- [ ] `import "server-only"` no topo de `admin.ts`
- [ ] `lib/tipos/database.ts` gerado por comando documentado
- [ ] Vitest, Playwright e pgTAP configurados e **rodando vazios**
- [ ] Scripts de `package.json` copiados do documento 24 §7, **com os comentários**
- [ ] CI com os três jobs (qualidade · banco · build), quebrado de propósito uma vez para provar
- [ ] `.env.local.example` completo, **sem segredo real**
- [ ] Primeira preview verde na Vercel, aberta e conferida
- [ ] **Clone limpo → `pnpm install` → `pnpm dev` funciona seguindo só o README**

### Por fatia — repetir dezenas de vezes

- [ ] `/speckit.specify` com o prompt do documento 42
- [ ] `/speckit.clarify` executado e as perguntas **respondidas por humano**
- [ ] `spec.md` lido **por você**, com os documentos 02/04/06 ao lado
- [ ] `/speckit.plan` com as restrições de plataforma **repetidas literalmente**
- [ ] `/speckit.tasks` — **toda** tarefa com `RF-`/`RN-` de origem
- [ ] `/speckit.analyze` sem inconsistência pendente
- [ ] `/speckit.implement` em fatias, diff revisado entre elas
- [ ] Ordem de dentro para fora: `dominio` → `validacao` → `acoes` → `app` → `components`
- [ ] Migration escrita **à mão**, com RLS, policies, índices, auditoria e `origem_migracao_v1`
- [ ] `pnpm db:reset` prova a sequência do zero
- [ ] **`pnpm db:tipos` executado** e o resultado commitado
- [ ] `pnpm verificar` verde
- [ ] `pnpm test:invariantes` (pgTAP) verde
- [ ] `pnpm test:rls` verde — **com teste negativo por perfil**
- [ ] `pnpm test:e2e` verde, incluindo `/print/*` quando houver
- [ ] Commits no padrão `feat(RF-…): …`
- [ ] PR aberto com o template **inteiro** preenchido, inclusive o plano de reversão
- [ ] **Bernardo validou na URL de preview**
- [ ] `/speckit.checklist` executado e fechado
- [ ] Merge por squash; branch apagada
- [ ] `CLAUDE.md` atualizado na seção *Estado atual*

### Portão de cada épico

- [ ] Todos os critérios de aceite do documento 06 §3 daquele épico, **verificados um a um**
- [ ] Toda `RN-` de *Risco: Alto* tocada tem asserção nomeada (stub pendente é aceito)
- [ ] Nenhum requisito do documento 02 marcado como coberto sem teste que o cubra
- [ ] Nenhuma decisão pendente do documento 06 §5 atropelada por suposição

---

## 13. Ordem de execução, em uma linha

Ambiente (§2) → `CLAUDE.md` → constitution → ~~decisão UE-1~~ *(tomada em 26/08)* → **Épico 0** (fundação, até a preview
verde) → **1** (schema + RLS) → **2** (ETL + reconciliação) → **3** (auth + RBAC) → **4** (design
system + shell, *já em paralelo desde o 0*) → **5** (cadastros: cursos+turmas → disciplinas →
instrutores) → **6** (DSA) → **9** (atividades + tetos) → **8** (avaliações) → **7** (cronograma +
motor) → **10** (relatórios) → **12** (sugestão do DSA, etapas i → ii → **portão** → iii) — com
**11** (LIQ/OS/Ficha) e **13** (ROTA) encaixáveis a qualquer momento depois do **5**, em frente
paralela, desde que **uma única frente detenha a caneta do schema**.

Ao final: os 12 critérios de aceite do documento 00 §9 verdes, o corte executado pelo plano do
documento 30 — e **só então** a paridade declarada pelo Bernardo, encerrando o Princípio X e abrindo
a porta para funcionalidade nova.

---

*Fim do documento 10. Ver também `Vibe Coding/40-Constitution-v2.1.md` (os princípios),
`Vibe Coding/41-Guia-de-Vibe-Coding.md` (como conversar com o agente),
`Vibe Coding/42-Prompts-por-Epico.md` (os prompts prontos) e
`Fase 2 - Arquitetura/24-Estrutura-do-Repositorio-e-Convencoes.md` (onde cada coisa mora).*
