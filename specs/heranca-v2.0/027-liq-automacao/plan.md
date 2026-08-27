# Implementation Plan: Épico — Automação da Lista de Instrutores Qualificados (LIQ)

**Branch**: `027-liq-automacao` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/027-liq-automacao/spec.md`

## Summary

Aplica a migração `turma_disciplina` (LIQ-1, já escrita e validada em sandbox) à banco de produção;
entrega uma tela de período por turma (Página do Curso) para o operador preencher as 121 lacunas
que a migração deixa; e um novo módulo de backend (`lib/acoes/liq.ts`) que valida (bloqueando, nunca
alertando — exceção deliberada a RN-DEG-02) e gera a minuta trimestral da LIQ em a rota de impressão `/print/*` via
clonagem de linha nas 2 tabelas de tamanho variável do Template já existente. LIQ-3 (titular/
reserva) e LIQ-4 (persistência/histórico) ficam fora desta entrega (Clarifications 2026-08-20).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: `o Supabase Storage`/`a rota de impressão `/print/*`` (já em uso desde a spec 022, escopos já
declarados em `appsscript.json`) — primeiro uso da API de tabelas (`Table`/`TableRow`) do
`a rota de impressão `/print/*``, nunca usada antes neste projeto (a Ficha usa só `Body.replaceText`).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — nova tabela `turma_disciplina` (migração já escrita,
`migracao/criar_turma_disciplina.py`, aplicação à banco de produção faz parte desta spec); `disciplinas.Previsao_Inicio/Termino` permanece como semente da grade, sem mudança de schema; nova
chave `ID_TEMPLATE_LIQ` em `config_parametros` (aditiva, mesmo padrão de `ID_TEMPLATE_FICHA_
INSTRUTOR`).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: A validação/geração roda sob demanda (clique do usuário), não em todo boot
— sem meta de latência específica, mas deve evitar o mesmo padrão de leitura redundante já corrigido
na spec 017 (ler cada aba envolvida uma única vez por chamada, não uma vez por turma/disciplina).

**Constraints**: Nenhuma alteração de schema além de `turma_disciplina` (FR-015); FR-004/FR-005 MUST
bloquear a geração, nunca apenas alertar — exceção deliberada e documentada a RN-DEG-02 (Princípio
V), ver Complexity Tracking; a técnica de clonagem de linha (FR-011) é obrigatória para as 2
tabelas, `replaceText` global no corpo só é seguro para as tags de documento (não-repetidas).

**Scale/Scope**: 1 arquivo de backend novo (`lib/acoes/liq.ts`), 1 entrada nova em `CRUD_CONFIG` (`lib/acoes/crud.ts`),
2 arquivos de frontend tocados (`app/(app)/cursos/[curso]/page.tsx` para o painel de período; `app/(app)/instrutores/page.tsx`
para o botão/modal), 1 migração aplicada à banco de produção, 4 novas regras `RN-LIQ-0X` registradas
em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — NORMHIDRO 30-23 é a origem normativa externa citada em cada FR/RN nova (documento 00 §7, item 5.1 confirma que confeccionar a LIQ é competência da CIAARA-11). |
| II. Preservação de Regras de Negócio | PASSA — reaproveita RN-ANT-01 (antiguidade) sem alterá-la; nenhuma RN existente é modificada, só regras novas (`RN-LIQ-0X`). |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova; `a rota de impressão `/print/*``/`o Supabase Storage` já em uso desde a spec 022, só um recurso da mesma API (`Table`) nunca antes exercitado. |
| IV. Integridade do Histórico | PASSA — migração `turma_disciplina` segue o protocolo padrão (backup + `migracao_log`, script já escrito e validado em sandbox); nenhuma escrita da geração da LIQ apaga dado existente. |
| V. Degradação Segura | **PASSA COM EXCEÇÃO DELIBERADA E DOCUMENTADA** — FR-004/FR-005 bloqueiam em vez de alertar (contrariando RN-DEG-02 em geral). Justificativa (FR-007, spec.md): a LIQ é documento oficial submetido à DHN para aprovação externa (NORMHIDRO 30-23, item 3.2) — gerar uma LIQ incompleta tem consequência institucional que um alerta de tela não cobre. Ver Complexity Tracking. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 2 User Stories independentes; `lib/acoes/liq.ts` isolado como módulo novo (mesmo padrão de `lib/dominio/sugestao-dsa.ts`, Épico H) em vez de inflar `lib/acoes/instrutores.ts`/`lib/acoes/dsa.ts` com um domínio conceitualmente distinto. |
| VII. Configuração Sobre Constante | PASSA — `ID_TEMPLATE_LIQ` em `config_parametros`, nunca constante literal (FR-013). |
| VIII. Rastreabilidade | PASSA — FR-014 exige `RN-LIQ-0X` com origem normativa citada para toda regra nova, registrada em `04-Regras-de-Negocio-a-Preservar.md`. |
| IX. Contenção de Escopo | PASSA — item 5.1 da NORMHIDRO 30-23 confirma que confeccionar a LIQ é competência explícita da CIAARA-11 (documento 00 §7). LIQ-3/LIQ-4 deliberadamente fora do escopo (Clarifications 2026-08-20). |

Uma exceção deliberada (Princípio V) — ver Complexity Tracking abaixo.

## Project Structure

### Documentation (this feature)

```text
specs/027-liq-automacao/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── backend-functions.md
│   └── frontend-functions.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── `lib/acoes/liq.ts`                 # NOVO - validarLiq_, gerarLiq, pastaLiqInstrutores_,
│   │                           # trimestreParaIntervalo_, intervalosSeInterceptam_,
│   │                           # montarDadosSecao1Liq_/montarDadosSecao2Liq_
│   └── `lib/acoes/crud.ts`                 # CRUD_CONFIG ganha entrada 'turma_disciplina'
└── frontend/
    ├── `app/(app)/cursos/[curso]/page.tsx`          # painel de periodo por turma (US1) - novo
    └── `app/(app)/instrutores/page.tsx`    # botao "LIQ" + modal Ano/Trimestre (US2) - novo

migracao/
└── criar_turma_disciplina.py  # JA EXISTE - so falta aplicar a banco de produção

docs/fase-1/
└── 04-Regras-de-Negocio-a-Preservar.md   # RN-LIQ-01 a RN-LIQ-04, com origem normativa

appsscript/                    # staging do o fluxo Git → Vercel

tests/
└── regras_de_negocio_backend.test.ts   # casos novos para trimestreParaIntervalo_/
                                          # intervalosSeInterceptam_/validarLiq_ (o cliente Supabase
                                          # mockado, mesmo harness ja usado desde a spec 014/019)
```

**Structure Decision**: `lib/acoes/liq.ts` como módulo novo e isolado (mesmo precedente de `lib/dominio/sugestao-dsa.ts`,
Épico H) — o domínio (validação trimestral + geração de documento multi-tabela) é conceitualmente
distinto de `lib/acoes/instrutores.ts`/`lib/acoes/dsa.ts`, mesmo reaproveitando dados/funções deles
(`instrutores.Antiguidade_Declarada` para ordenação — ver research.md § 6, correção de
`/speckit-analyze` —, `listarInstrutoresComCargaHoraria`, `pastaFichasInstrutores_` como precedente
de padrão). Nenhum arquivo de frontend novo — os 2 pontos de UI (painel de período,
botão/modal da LIQ) encaixam nas views já existentes que já são donas desses domínios (Curso e
Instrutores, respectivamente).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| FR-004/FR-005 bloqueiam a geração em vez de alertar (contraria RN-DEG-02 em geral) | A LIQ é documento oficial submetido à DHN (NORMHIDRO 30-23, item 3.2) — uma LIQ incompleta gerada e enviada tem consequência institucional real (retrabalho formal, possível não-conformidade normativa), diferente de qualquer outro alerta de tela deste projeto, que sempre é sobre dado interno sem consequência externa direta | Um alerta ignorável (padrão RN-DEG-02) permitiria ao operador gerar e enviar à DHN uma LIQ com disciplinas sem período/instrutor sem perceber — exatamente o cenário que motivou o pedido original ("o pior resultado possível para um documento oficial"); a proteção só funciona se for impossível de ignorar |

## Phase 0 — Research

Ver `research.md` para as decisões técnicas completas (7 decisões: aplicação da migração,
`CRUD_CONFIG` para `turma_disciplina`, painel de período por turma, aritmética de interseção de
trimestre, validação bloqueante, geração por clonagem de linha, pasta+`config_parametros`).

## Phase 1 — Design

Ver `data-model.md` (entidade `turma_disciplina` completa) e `contracts/*.md` (funções de backend e
frontend). `quickstart.md` documenta o roteiro de validação manual (2 passos, espelhando as 2 User
Stories).
