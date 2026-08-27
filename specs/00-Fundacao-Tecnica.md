---
title: "Spec 00 — Fundação Técnica"
author: "CIAARA-11 v2.1"
date: "26/08/2026"
version: "2.1"
status: "Vigente — prevalece sobre qualquer spec numerada"
---

# Spec 00 — Fundação Técnica

> **Este documento é a base de todas as specs deste repositório.**
> Toda spec de 001 a 039, e toda spec futura, **herda** o que está aqui e não precisa
> repetir. Onde uma spec numerada contradisser este documento, **este documento vence** —
> e a contradição é defeito da spec, a ser corrigido, não uma exceção a ser negociada.

## Por que este documento existe

Até a v2.0 a plataforma era uma **restrição declarada**: `RNF-PLAT-01` a `RNF-PLAT-04`
proibiam framework de frontend, banco externo, bundler e CI/CD. Cada spec repetia essa
restrição no seu Constitution Check, e cada uma a repetia com palavras ligeiramente
diferentes.

Em **25/08/2026** o Bernardo decidiu migrar de plataforma. Aqueles quatro requisitos foram
revogados e substituídos. Este documento é a nova declaração — escrita **uma vez**, num
lugar só, para que a próxima mudança de plataforma seja uma edição em vez de trinta e nove.

**As 314 specs existentes já foram convertidas** e não contêm mais uma única menção a
Google Apps Script, Google Sheets, `google.script.run`, `getSheetByName`, `SpreadsheetApp`,
`HtmlService`, `clasp` ou aos arquivos `.gs`/`View*.html`. O registro da conversão, com o
que virou o quê, está na seção 8.

---

## 1. A plataforma

| Camada | Decisão | Não-negociável porque |
|---|---|---|
| **Framework** | **Next.js 15+, App Router**, React 19, TypeScript `strict` | é a decisão de plataforma da v2.1; App Router, não Pages Router |
| **Visual** | **Tailwind CSS v4** (CSS-first, `@theme`) + **shadcn/ui** | substitui Bootstrap 5 e o objeto global `UI` da v2.0 |
| **Banco de dados** | **Supabase PostgreSQL** | substitui Google Sheets |
| **Autenticação** | **Supabase Auth** — e-mail e senha, conta criada **só por convite do Admin** | ver seção 3 |
| **Autorização** | **RLS no banco** + matriz `perfil_permissao` como dado | ver seção 4 |
| **Acesso a dados** | `@supabase/ssr` no servidor, `@supabase/supabase-js` no cliente. **Sem ORM** | o SQL fica visível e revisável |
| **Mutações** | **Server Actions**, com validação **Zod na primeira linha** | Server Action é endpoint HTTP de fato |
| **Estado de tela** | **URL** (`searchParams`) via `nuqs` | dá deep-link e histórico do navegador de graça |
| **Gráficos** | **Recharts** | substitui ApexCharts e Chart.js |
| **Impressão** | CSS `@media print` + rotas `/print/*` | paridade com a v2.0 é `RNF-COMP-01` |
| **Testes** | **Vitest** (unidade) · **pgTAP** (invariantes e RLS) · **Playwright** (e2e) | ver seção 6 |
| **Hospedagem** | **Vercel**, com preview por branch | substitui o deploy manual e o `clasp` |
| **Repositório** | **GitHub**, Conventional Commits | |
| **ETL** | Python, em `scripts/etl/` | reaproveita os scripts da v2.0 |

**Proibido, sem discussão:**

- ORM que esconda o SQL (Prisma, Drizzle) — o SQL deste projeto é revisado à mão.
- Banco fora do Supabase.
- Biblioteca de componentes além de shadcn/Radix.
- **Regra de negócio implementada apenas na interface.**

**Aposentado — não reintroduzir:** `clasp`, `BUILD_ID`, `implantacao/MANIFESTO.md`,
`include()`/`HtmlService`, `doGet`, o objeto global `UI`, o `AppState` como objeto global,
Bootstrap, ApexCharts, Chart.js, Font Awesome, `node --test`, `vm.runInContext`.

---

## 2. Server e Client — a fronteira que mais gera defeito

**Server Component é o padrão. `"use client"` é a exceção, e só em componente-folha.**

O marcador `"use client"` **contamina toda a subárvore de importação**. Um `"use client"`
no `page.tsx` de instrutores manda as 177 linhas da tabela e o catálogo de siglas para o
bundle do navegador. Pior: esse erro **frequentemente não aparece no `tsc`** — aparece no
`next build`, ou não aparece, e o usuário só sente a lentidão.

| Situação | Onde vive |
|---|---|
| Buscar dado e renderizar | **Server Component** — lê do Supabase com o cookie do usuário; a RLS aplica sozinha |
| Gravar dado | **Server Action** — Zod na primeira linha, depois Supabase, depois `revalidatePath` |
| Operação multi-tabela que precisa ser atômica | **RPC no banco** (função PostgreSQL) |
| Interação de tela (filtro, ordenação, modal) | **Client Component folha** |
| Regra de negócio `RN-` | **`lib/dominio/`** — função pura, sem I/O |

**`lib/dominio/` não importa `supabase`, `next` nem `react`.** É onde as ~40 regras `RN-`
viram funções puras, testáveis sem banco. É o Princípio II da constitution, e é o que
garante que a migração não perca a lógica que a v2.0 levou meses validando.

---

## 3. Autenticação — a primeira tela do sistema é o Login

**Requisito estrutural: nenhuma rota da aplicação é acessível sem sessão autenticada.**
A primeira tela que qualquer pessoa vê ao abrir o sistema é a de **Login**.

### 3.1 Estrutura de rotas

```
app/
├── (auth)/                      ← sem sessão; layout próprio, sem menu nem barra lateral
│   ├── login/page.tsx           ← A PRIMEIRA TELA
│   ├── convite/[token]/page.tsx ← definição de senha no primeiro acesso
│   └── recuperar-senha/page.tsx
├── (app)/                       ← exige sessão; o middleware redireciona para /login
│   ├── inicio/ · cursos/ · turmas/ · cronograma/ · avaliacoes/
│   ├── atividades/ · relatorio/ · instrutores/ · disciplinas/
│   └── admin/usuarios/ · admin/parametros/ · admin/calendario/
└── print/                       ← exige sessão; sem shell, para impressão
```

O middleware (`lib/supabase/middleware.ts`) valida a sessão em toda requisição a `(app)` e
`print`, e redireciona para `/login` quando não houver. A raiz `/` redireciona para
`/inicio` quando há sessão, e para `/login` quando não há.

### 3.2 Conta por convite — não há autocadastro

**`Enable Sign Ups` fica DESLIGADO no painel do Supabase.** É item de checklist do Épico 0,
verificável no painel, sem equivalente em código.

O fluxo:

1. O Admin cadastra nome, e-mail, perfil e escopo. Isso cria a linha em `public.usuarios`
   **com `auth_user_id` nulo** — a pessoa já tem perfil definido e ainda não tem credencial.
2. Uma Server Action com a chave `service_role` chama `auth.admin.inviteUserByEmail()`.
3. A pessoa recebe o e-mail, abre `/convite/[token]` e define a senha.
4. O Supabase cria a linha em `auth.users`; a aplicação preenche `usuarios.auth_user_id`.
5. A partir daí `app.usuario_atual()` resolve, e só a partir daí a conta alcança dado.

**A janela do passo 1 ao 4 é deliberada.** É nela que o Admin revisa ou corrige o perfil
antes de a pessoa conseguir entrar. **Uma conta nunca existe com poder indefinido.**

### 3.3 Política de senha

Mínimo de 12 caracteres; verificação contra vazamentos (HaveIBeenPwned, nativo do Supabase)
**habilitada**; **sem** exigência de símbolo e **sem** expiração compulsória — as duas
últimas produzem senhas piores e anotadas em papel. MFA opcional, recomendado para `admin`.

### 3.4 Ciclo de vida da conta

Desativar é `status = 'inativo'`, **nunca `DELETE`**: milhares de lançamentos referenciam a
linha por `criado_por`/`editado_por`. O efeito é imediato e não depende da sessão —
`app.usuario_atual()` filtra por `status = 'ativo'`, então o token que a pessoa já tem no
navegador para de resolver na consulta seguinte.

### 3.5 A decisão que mudou

A **decisão D1 da v2.0** — manter a autenticação pela conta Google
(`Session.getActiveUser()`) — foi **revertida em 25/08/2026**. Ela estava certa para o
Apps Script, onde o mecanismo era nativo e gratuito; fora daquele runtime, cada razão que a
sustentava desapareceu. Detalhamento no documento 22, §3.1.

---

## 4. Autorização — o banco é a fronteira

**A interface esconde o botão. O banco recusa a linha. Só o segundo é segurança.**

`RNF-SEG-02` — *"toda operação de escrita deve ser verificada no servidor contra o perfil
do usuário autenticado, independentemente do que a interface exibe"* — deixa de ser
disciplina de código e passa a ser garantia do motor: **é RLS**. Uma Server Action nova que
esqueça a verificação **não vira vulnerabilidade**; vira, na pior hipótese, uma tela que
mostra menos do que deveria.

Duas perguntas independentes, e **ambas precisam ser verdadeiras**:

| Pergunta | Função |
|---|---|
| Este **perfil** pode executar esta **ação** neste **recurso**? | `app.pode(recurso, acao)` — lê a tabela `perfil_permissao` |
| Sobre **quais cursos**? | `app.cursos_do_usuario()` |

Nenhuma policy do sistema contém `perfil = 'operador'`. **Mudar quem pode lançar aula é um
`UPDATE` numa linha** — não é migration, não é deploy, não é janela de manutenção.

**Toda tabela tem `ENABLE ROW LEVEL SECURITY`. Nenhuma tem policy de `DELETE`** — e isso é
regra de negócio (`RN-INST-05` generalizada), não lacuna. PR que acrescente `for delete`
é rejeitado.

---

## 5. Dados

- `snake_case` minúsculo, sem acento. **Tabelas no plural.**
- `id uuid primary key default gen_random_uuid()`; `codigo text unique not null` guarda o
  `ID_*` da v2.0 verbatim. **FKs apontam para `id`, nunca para `codigo`.**
- Exclusão é **lógica** (`status`), nunca inferida de `NULL`.
- Auditoria (`criado_por`, `criado_em`, `editado_por`, `editado_em`) por trigger.
- Vigência temporal: `vigente_de` + `vigente_ate`. **Nenhuma edição reinterpreta o passado.**
- **`ENUM` só para domínio normativo fechado**; domínio administrável vive em
  `config_listas`.
- Limite normativo é **dado** (`config_parametros`), nunca constante em código.
- `timestamptz`, banco em UTC, apresentação em `America/Sao_Paulo`.

O schema completo está em `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` e nos seis scripts
de `sql/`. **26 tabelas, 34 chaves estrangeiras, todas com `ON DELETE` explícito.**

---

## 6. Definition of Done

Uma fatia só está pronta quando **todos** passam:

1. `tsc --noEmit` sem erro e `eslint` sem aviso novo.
2. **Vitest** em toda função de `lib/dominio/` tocada.
3. **pgTAP**: contagens, integridade referencial e uma asserção **nomeada** por regra `RN-`
   de Risco Alto. Stub explicitamente pendente é aceito; cobertura fingida não.
4. **RLS — teste negativo por perfil.** O que cada perfil **não** pode ler ou escrever é
   negado **pelo banco**. Testar só o caminho feliz aprovaria uma RLS desligada.
5. **Playwright** no percurso principal, incluindo `/print/*` quando houver.
6. Migration aplicada em preview e revertível.
7. Commit no padrão `feat(RF-DSA-08): …`, citando o identificador de origem.

**Não regressão se prova por invariante estrutural**, nunca por diff com a saída histórica
de um curso — a CAHO 2026 foi rejeitada como padrão-ouro pelo Bernardo em 10/08/2026.

---

## 7. Implantação

`clasp`, `BUILD_ID` e `implantacao/MANIFESTO.md` estão **aposentados**. O fluxo é:

```
branch → commit → PR → preview automática da Vercel → revisão → merge na main → produção
```

Migration em produção: `supabase db push` a partir da `main`, com plano de reversão escrito
no PR. Nunca `git push` direto na `main`.

---

## 8. O que foi removido das specs existentes

As 314 specs foram convertidas por tradução determinística, não por reescrita manual — o
que garante que **o mesmo conceito recebeu o mesmo nome nas 39 specs**. Cerca de 11.300
substituições. O dicionário completo:

| Da v2.0 | Para a v2.1 |
|---|---|
| `Instrutores.gs`, `Cronograma.gs`, `Crud.gs`, `Liq.gs`… | `lib/acoes/*.ts` (com I/O) |
| `MotorPreditivo.gs`, `RegrasNormativas.gs`, `SugestaoDsa.gs`, `RegimeCurso.gs` | `lib/dominio/*.ts` (funções puras) |
| `Core.gs` · `Auth.gs` | `lib/supabase/server.ts` · `middleware.ts` + policies RLS |
| `ViewInstrutores.html`, `ViewDisciplinas.html`, `ViewCurso.html`… | `app/(app)/…/page.tsx` |
| `_Comum.html` · `_Estilos.html` · `Index.html` | `components/ciaara/` · `app/globals.css` · `app/layout.tsx` |
| `google.script.run` · o wrapper `gs()` | Server Action (chamada direta, tipada) |
| `SpreadsheetApp` · `getSheetByName` · `ABAS.*` | cliente Supabase · `.from(<tabela>)` · nome da tabela |
| `Session.getActiveUser()` | `supabase.auth.getUser()` |
| `LockService` | transação do PostgreSQL |
| `PropertiesService` · `CacheService` | `config_parametros` · `revalidateTag` |
| `HtmlService` · `include()` · `doGet` · Web App | App Router · importação de componentes · `app/layout.tsx` |
| `clasp push` · `clasp deploy` · `BUILD_ID` | `git push` · merge na `main` · SHA do commit |
| Abas `Cad_Disciplinas`, `Cad_Instrutor`, `Turmas_Ativas`… | tabelas `disciplinas`, `instrutores`, `turmas`… |
| Google Docs (template da ficha) · Drive (PDF salvo) | rota `/print/ficha-instrutor` · Supabase Storage |
| Bootstrap 5 · ApexCharts · Chart.js · Font Awesome | Tailwind + shadcn/ui · Recharts · lucide-react |
| `node --test` · `vm.runInContext` · `*.test.js` | Vitest · importação direta de módulo · `*.test.ts` |
| "aba da planilha", "planilha viva" | "tabela", "banco de produção" |

### 8.1 O que foi deliberadamente preservado

**"aba" continua "aba" quando é do navegador ou do formulário.** A palavra tem três
sentidos neste corpus — aba da planilha, aba do navegador ("o PDF abre em nova aba") e aba
do formulário ("a ficha tem 3 abas") — e só o primeiro virou "tabela". Confundi-los
produziria "abre em nova tabela", que é besteira com aparência de correção.

Menções à plataforma antiga **permanecem** onde narram um fato datado — de-para da migração
v1.0→v2.0, decisão P-14, `Origem_Migracao_v1`, colunas `*_Legado_v1`, histórico de revisão.
Traduzir isso apagaria a trilha, e é o **Princípio IV** (Integridade do Histórico) aplicado
à documentação: corrige-se o passado registrando evento novo, nunca reescrevendo o registro.

Hoje isso se resume a três arquivos, em **001-migracao-saneamento-dados** e
**004-rbac-ampliado-usuarios**, que descrevem a própria migração e por isso citam os nomes
antigos por dever de ofício.

### 8.2 O que NÃO foi convertido, e por quê

O ferramental de execução de cada spec — o `plan.md` e o `tasks.md` — descrevia como se
implementou **naquela** plataforma. A tradução ajustou a plataforma declarada e o
vocabulário, **mas um plano traduzido não é um plano executado.**

> **Ao retomar qualquer feature, regere `plan.md` e `tasks.md`** com `/speckit.plan` e
> `/speckit.tasks` a partir do `spec.md` convertido. O `spec.md` guarda o requisito, que é
> durável; o plano é do momento em que foi feito.

---

## 9. Como uma spec usa este documento

Toda spec nova declara, no Constitution Check:

```
| III. Restrição de Plataforma | PASSA — conforme Spec 00 §1; nenhuma dependência nova. |
```

e **não repete** a stack no `Technical Context`: aponta para cá. Se uma spec precisa de algo
que este documento não permite, o caminho é **emendar este documento com decisão registrada
do Bernardo** — nunca abrir exceção local. Uma exceção local é uma restrição que morreu sem
que ninguém tenha notado.

---

## Rastreabilidade

**Revoga:** `RNF-PLAT-01` a `RNF-PLAT-04` (v2.0) · decisão D1 (autenticação por conta Google).
**Implementa:** `RNF-PLAT-01.1` a `RNF-PLAT-08` · `RNF-SEG-01` (revisado) · `RF-AUTH-01` a
`RF-AUTH-10` · `RN-RBAC-01` · `RN-RBAC-02` · `RN-INST-05` (generalizada).
**Depende de:** constitution v2.1 (`docs/vibe-coding/40`), documentos 21, 22, 23, 24 e 25.
**Prevalece sobre:** todas as specs de 001 a 039 e as futuras.

*Fim do Spec 00.*
