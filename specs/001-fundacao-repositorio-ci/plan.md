# Implementation Plan: Épico 0 — Fundação: repositório, Next.js, Supabase, CI e tipos gerados

**Branch**: `001-fundacao-repositorio-ci` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fundacao-repositorio-ci/spec.md`

## Summary

Levar o repositório do estado atual — scaffold Next.js que compila e nada mais — até **um repositório
próprio, público, que compila, testa e implanta sozinho**, com preview por branch e o contrato de
dados gerado por comando. Nenhuma tabela, nenhuma tela de negócio, nenhum dado.

A abordagem tem três frentes, deliberadamente nesta ordem:

1. **O que não depende de rede** — fronteiras de ESLint, `lib/`, suítes de teste, scripts. Pode ser
   feito e provado hoje, sem repositório novo, sem Vercel, sem Docker autenticado.
2. **O replantio** — mover a árvore para fora do `SIS11`, `git init`, remote, push. É a única etapa
   que mexe em história de git e a única irreversível na prática; vai depois de a frente 1 estar
   verde, para que o primeiro push do repositório novo já seja um repositório saudável.
3. **O que depende de serviço externo** — CI no GitHub, proteção de branch, varredura de segredos,
   preview na Vercel. Depende do replantio e de escopos/credenciais que hoje faltam.

**Restrição que molda o plano:** o `pnpm dev` de hoje já sobe. O risco desta fatia não é técnico, é
de *ordem* — fazer o replantio antes de a base estar verde transforma um problema de configuração
num problema de git.

## Technical Context

**Language/Version**: TypeScript 5.x com `strict` e `exactOptionalPropertyTypes`; Node 24.19 local,
**Node 22 LTS no CI** — fixado em research R-2 e executado por T001 e T044; React 19.2.8

**Primary Dependencies**: Next.js **16.3.3** (App Router, Server Components por padrão) ·
Tailwind CSS v4.3.3 (`@theme`, CSS-first) · `@supabase/supabase-js` 2.112.4 · `@supabase/ssr` 0.12.5 ·
`server-only` · `eslint-plugin-import`

**Storage**: Supabase PostgreSQL. Projeto `cqhpfuaweoyglhtrckcp` **designado como
desenvolvimento/preview** (FR-022.1). **Schema vazio nesta fatia** — o schema é o Épico 1. Banco local
por Docker via Supabase CLI.

**Testing**: Vitest (unidade + teste negativo de RLS) · Playwright/Chromium (ponta a ponta) ·
pgTAP via `supabase test db` (invariantes). **Todas rodam vazias** nesta fatia (FR-011).

**Target Platform**: Vercel — **somente pré-visualização por branch** (FR-016.1). Desenvolvimento em
Windows 11 + Docker Desktop 29.7; CI em `ubuntu-latest`.

**Project Type**: Aplicação web — Next.js App Router, um único projeto (sem separação
frontend/backend: Server Actions substituem a camada de API).

**Performance Goals**: `pnpm verificar` ≤ **5 min** (SC-008) · clone limpo → aplicação no ar ≤
**15 min** (SC-001). `verificar:tudo` não tem teto: o que se exige dele é coincidir com o CI (SC-005).

**Constraints**: sem ORM · sem biblioteca de componentes além de shadcn/Radix · nada em
`lib/dominio/` importa `supabase`, `next` ou `react` · `"use client"` só em folha · **nenhum ambiente
de produção e nenhum projeto Supabase de produção nesta fatia** (FR-016.1, FR-020).

**Scale/Scope**: base pequena — 24 cursos, 29 turmas, 175 disciplinas, 177 instrutores, ~1.753
registros de aula; dezenas de usuários simultâneos no máximo. **Clareza de schema e manutenibilidade
acima de desempenho.** Esta fatia não carrega nenhum desses volumes.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| # | Princípio | Veredito | Justificativa |
|---|---|---|---|
| I | Fidelidade à Fase 1 | ✅ **Passa, com ressalva** | Todo FR cita origem em documento 06, 10, 24 ou decisão datada. **Ressalva:** o `BRIEF-v2.1.md` (precedência 2) só apareceu em 26/08, depois de a spec estar escrita; foi verificado o suficiente para fechar D-2 e abrir D-5/D-6, **não relido linha a linha**. Tarefa de leitura integral entra no `tasks.md`. |
| II | Preservação de Regras de Negócio | ✅ **Não aplicável, por construção** | Nenhuma regra `RN-` é tocada. `lib/dominio/` nasce **vazia** (FR-004) — a regra existe antes de haver o que proteger. |
| III | Restrição de Plataforma | ✅ **Passa** | Esta fatia **é** a materialização da plataforma decidida. Nenhuma dependência fora da lista; nenhum ORM; nenhuma biblioteca de componentes nova. |
| IV | Integridade do Histórico | ✅ **Passa** | FR-021.2 preserva `d19ab10` e `d31bd56` no `SIS11`. O replantio **não reescreve** história alheia. FR-002.2 (rotacionar, não apagar commit) é o mesmo princípio aplicado a segredo. |
| V | Degradação Segura | ✅ **Passa** | FR-003 (variável ausente avisa, não explode) e FR-019 (`error.tsx` + `loading.tsx` por segmento). |
| VI | Mudança Cirúrgica | ✅ **Passa** | O plano decompõe em três frentes com ordem obrigatória; cada uma fecha num commit próprio. FR-015 exige **provar** o CI quebrando-o, não declará-lo. |
| VII | Configuração Sobre Constante | ✅ **Passa** | Nenhum parâmetro normativo nesta fatia. Variáveis de ambiente são configuração por definição, e FR-002 exige que estejam todas declaradas. |
| VIII | Rastreabilidade | ✅ **Passa** | 33 FRs, cada um com origem citada. As decisões de 26–27/08 estão em *Clarifications* com data. |
| IX | Contenção de Escopo | ✅ **Passa** | FR-020 enumera o que **não** entra, e a lista cresceu com a decisão de 27/08 (produção fora). |
| X | Paridade Antes de Novidade | ✅ **Passa** | Zero funcionalidade de negócio. É encanamento — a pergunta de triagem nem se aplica. |
| XI | O Banco é a Fronteira | ⚠️ **Adiado por ausência de objeto** | Nenhuma policy, nenhuma constraint: o schema é do Épico 1. **Não é violação** — mas FR-011 exige a suíte de RLS **configurada e rodando vazia** justamente para que o Épico 1 não tenha de inventá-la sob pressão. Reavaliar no Épico 1. |

**Gate: PASSA.** Nenhuma violação não justificada. Duas divergências de processo estão registradas em
*Complexity Tracking* — ambas com autorização nominal e data.

### Reavaliação após a Fase 1

**Gate: continua PASSANDO.** O desenho não introduziu violação nova. Três observações que a Fase 1
produziu e que o `/speckit-tasks` precisa carregar:

1. **Princípio IV, precisão ganha na pesquisa.** `git subtree split` preserva mensagem, autor e data,
   mas **os SHAs mudam** (`d19ab10` → `27e977a`, `d31bd56` → `a693373`) — verificado em teste seco. Não
   é violação: os commits originais ficam intactos no `SIS11`. Mas a tarefa MUST **registrar a
   correspondência de SHA**, senão a trilha fica legível só para quem estava presente. Ver research R-1.
2. **Princípio VI, risco descoberto no desenho.** Os fixtures que provam as fronteiras (FR-006) violam
   as regras **de propósito**. Se ficarem sob `lib/dominio/`, o `pnpm lint` do repositório passa a
   falhar para sempre. Ficam sob `tests/`, e a exclusão que os isenta é ela mesma um risco — excluir
   demais desliga a regra em silêncio. Ver research R-4.
3. **Princípio XI, adiado com objeto nomeado.** A Fase 1 confirmou: `supabase/migrations/` e
   `lib/dominio/` nascem vazias, e o bloco `banco` do CI roda com schema vazio. Um verde ali prova que
   **o encanamento funciona**, não que há invariante protegida — e o contrato
   [`ci-contextos.md`](./contracts/ci-contextos.md) registra isso como invariante CI-6, para que
   ninguém confunda os dois no Épico 1.

## Project Structure

### Documentation (this feature)

```text
specs/001-fundacao-repositorio-ci/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — as sete incógnitas e o que se decidiu
├── data-model.md        # Fase 1 — não há entidade de domínio; há matriz de ambiente
├── quickstart.md        # Fase 1 — como provar que a fatia funciona
├── contracts/
│   ├── comandos.md      # a interface de comando (scripts do package.json)
│   ├── variaveis-ambiente.md
│   └── ci-contextos.md  # os três nomes que a proteção de branch referencia
├── checklists/
│   └── requirements.md  # 16/16
└── tasks.md             # Fase 2 — /speckit-tasks, NÃO criado aqui
```

### Source Code (repository root)

Árvore-alvo do BRIEF §4. **Nesta fatia**: `[CRIA]` nasce com conteúdo, `[VAZIO]` nasce e fica vazio
de propósito, `[ADIADO]` não é tocado.

```text
app/
├── layout.tsx · page.tsx · globals.css        [JÁ EXISTE]
├── error.tsx · loading.tsx · not-found.tsx    [CRIA]  ← RN-DEG-01 na raiz (FR-019)
├── (auth)/ · (app)/ · print/                  [ADIADO — Épicos 3, 4+]
components/{ui,ciaara,graficos,impressao}/     [ADIADO — Épico 4]
lib/
├── supabase/{client,server,middleware,admin}.ts   [CRIA]  ← FR-007
├── dominio/                                       [VAZIO] ← FR-004, com a regra de lint ativa
├── validacao/ · acoes/                            [ADIADO]
└── tipos/database.ts                              [CRIA]  ← gerado, vazio (FR-009)
supabase/
├── config.toml                                [CRIA]  ← supabase init
├── migrations/                                [VAZIO] ← o schema é o Épico 1
├── seed.sql                                   [VAZIO]
└── tests/                                     [CRIA]  ← um teste pgTAP trivial (FR-011)
tests/
├── unidade/                                   [CRIA]  ← inclui o teste que prova o lint (FR-006)
├── invariantes/rls/                           [CRIA]  ← suíte vazia, um teste trivial
└── e2e/                                       [CRIA]  ← percurso mínimo: a página sobe
scripts/etl/                                   [ADIADO — Épico 2]
docs/ · specs/ · CLAUDE.md · AGENTS.md · .claude/   [JÁ EXISTE]
.github/workflows/ci.yml                       [CRIA]  ← FR-014
.gitattributes                                 [CRIA]  ← FR-023, normalização de fim de linha
README.md                                      [REESCREVE] ← FR-001, é o contrato do SC-001
eslint.config.mjs                              [REESCREVE] ← as duas fronteiras (FR-004, FR-005)
package.json                                   [REESCREVE] ← 25 scripts + verificar:tudo (FR-012/013)
```

**Structure Decision**: projeto **único** (não `backend/` + `frontend/`). Server Actions substituem a
camada de API, então não há segundo projeto a estruturar — é a decisão do BRIEF §4 e do documento 24
§1, e esta fatia apenas a materializa. As três frentes do *Summary* mapeiam assim:

| Frente | Toca | Depende de |
|---|---|---|
| **1 — sem rede** | `eslint.config.mjs`, `lib/`, `tests/`, `supabase/`, `package.json`, `.gitattributes`, `app/error.tsx` | Docker local |
| **2 — replantio** | localização do repositório inteiro | Frente 1 verde |
| **3 — serviços** | `.github/workflows/ci.yml`, proteção de branch, varredura de segredos, Vercel | Frente 2 + credenciais |

## Complexity Tracking

> Duas divergências de processo, ambas autorizadas nominalmente. Nenhuma é violação de princípio.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Épico 0 passa pelo ciclo Spec Kit**, contra o documento 10 §6 ("é o único que **não** passa… conduza em conversa normal") | Bernardo invocou `/speckit-specify`, `/speckit-clarify` e `/speckit-plan` para ele, em 26–27/08/2026. O documento 10 é precedência 5 (processo) e cede à decisão do responsável | "Conversa normal" foi o que produziu o estado atual — Épico 0 iniciado em 26/08 e parado no §6.2, com o `CLAUDE.md` divergindo do disco em quatro pontos que só a *Verificação de premissa* desta spec encontrou. O ciclo formal é mais caro e foi escolhido de olhos abertos |
| **`verificar:tudo` não existe no documento 24 §7** e é emenda a documento de Fase 2 | Sem ele, `pnpm verificar` promete "a mesma sequência do CI" e entrega os blocos que dispensam Docker — um verde local seguido de vermelho no CI. Autorizado por Bernardo em 27/08/2026 | Manter só `verificar` exigia enfraquecer o SC-005; estender `verificar` exigia subir Docker a cada commit e furar o teto de 5 min do SC-008. Ambas foram apresentadas e recusadas |

**Dívida documental aberta, rastreada em `spec.md` §Pendências:** D-1 (doc 06 diz `npm`), D-5 (BRIEF
§2.1 não conhece `unidades_ensino` — **bloqueia o Épico 1**), D-6 (BRIEF × doc 05), D-7 (doc 24 §7
precisa de `verificar:tudo`), D-8 (`CLAUDE.md` fala em comando único).
