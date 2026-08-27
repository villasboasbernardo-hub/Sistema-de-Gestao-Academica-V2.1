# Implementation Plan: Módulo Gerador de O.S. de Instrutoria (Lógica, Agrupamento e Validação)

**Branch**: `028-os-instrutoria` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/028-os-instrutoria/spec.md`

## Summary

Nova tela SPA (`view-os-instrutoria`) no módulo de Instrutores que filtra aulas efetivamente
realizadas (`registros_aula`) por curso OU por trimestre/semestre, agrupa por
instrutor (Posto/Graduação, NIP, Nome puro, Capacitação Didática SIM/NÃO) com as disciplinas
ministradas por ele aninhadas (Início/Término = menor/maior `Data` registrada no recorte, Curso,
Disciplina), e renderiza uma tabela de validação com `rowspan` nas células de dados cadastrais do
instrutor. Sem geração de documento — só cálculo e exibição (FR-012/013 de spec.md).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita `lerAbaComoObjetos_` (`lib/supabase/server.ts`),
`trimestreParaIntervalo_`/`intervalosSeInterceptam_` (`lib/acoes/liq.ts`, spec 027, já globais no mesmo
o projeto Supabase e o repositório Next.js — sem necessidade de "importar", mesmo escopo compartilhado entre `.ts`).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — leitura pura, nenhuma coluna nova (FR-013). Fontes:
`registros_aula`, `instrutores`, `disciplinas`, `turmas`, `cursos`.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta específica — mesma ausência de SLA que toda leitura-agregação já
existente no projeto (`getEstatisticasCursos`, `gerarLiq`); lê cada aba envolvida uma única vez por
chamada (evita o padrão de releitura redundante já corrigido na spec 017).

**Constraints**: Nenhuma escrita em nenhuma aba (FR-013); nenhuma geração de a rota de impressão `/print/*`/PDF/Supabase Storage
(FR-012); nome do instrutor exibido sem formatação hierárquica (`formatarNomeInstrutor_` é
frontend-only, achado de spec.md); ordenação por antiguidade — **achado de planejamento**: RN-ANT-01
("toda lista, seletor ou filtro de instrutores, em qualquer tela do sistema, deve ser ordenado por
antiguidade crescente — sem exceção", Risco Alto) se aplica a esta tabela mesmo sem o pedido
original mencionar ordenação — ver Complexity Tracking.

**Scale/Scope**: 1 arquivo de backend novo (`lib/acoes/os-instrutoria.ts`), 1 arquivo de frontend tocado
(`app/(app)/instrutores/page.tsx`, novo painel sibling — mesmo padrão de `painelLiq_`/`painelFichaInstrutor`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | **RESSALVA DOCUMENTADA** — nenhum documento de Fase 1 (docs 00-09) cobre a O.S. de Instrutoria nem a NORMHIDRO-30-23 a menciona; o layout de 8 colunas vem diretamente do pedido do responsável (achado real de spec.md, sem corroboração documental própria). Aceito por vir do responsável, mesmo padrão de autoridade normativa direta já usado nesta sessão — mas sem o lastro de PDF/achado prévio que o Épico LIQ teve. |
| II. Preservação de Regras de Negócio | PASSA COM ADIÇÃO — RN-ANT-01 (Risco Alto) se aplica a esta tabela nova (achado de planejamento acima); nenhuma RN existente é alterada. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova. |
| IV. Integridade do Histórico | PASSA — leitura pura, nenhuma escrita, nenhuma migração. |
| V. Degradação Segura | PASSA — recorte sem nenhum instrutor com aula real degrada para tabela vazia com mensagem, nunca exceção (Edge Cases de spec.md); nenhuma regra de bloqueio nesta spec (diferente da LIQ — aqui não há geração de documento oficial a proteger, só uma tela de conferência). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — módulo novo isolado (`lib/acoes/os-instrutoria.ts`, mesmo precedente de `lib/acoes/liq.ts`/`lib/dominio/sugestao-dsa.ts`); `semestreParaIntervalo_` fica no novo arquivo, não em `lib/acoes/liq.ts` (evita acoplar 2 specs diferentes no mesmo arquivo). |
| VII. Configuração Sobre Constante | N/A — nenhum limite normativo/parâmetro configurável nesta spec. |
| VIII. Rastreabilidade | PASSA — achados citam arquivo/coluna real; RN-ANT-01 citada explicitamente onde se aplica. |
| IX. Contenção de Escopo | PASSA — item 5.1 (já usado para LIQ) e a competência geral da CIAARA-11 sobre gestão de instrutores cobrem esta funcionalidade; escopo deliberadamente parcial (sem geração de documento, FR-012) é decisão explícita do próprio pedido. |

## Project Structure

### Documentation (this feature)

```text
specs/028-os-instrutoria/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md         # Phase 1 (estrutura de saída, sem entidade de schema nova)
├── quickstart.md        # Phase 1
├── contracts/
│   ├── backend-functions.md
│   └── frontend-functions.md
└── tasks.md             # Phase 2 (/speckit-tasks, não este comando)
```

### Source Code (repository root)

```text
src/
├── backend/
│   └── `lib/acoes/os-instrutoria.ts`        # NOVO — calcularOsInstrutoria, semestreParaIntervalo_,
│                                 # montarNoInstrutorOs_ (funções puras/quase-puras)
└── frontend/
    └── `app/(app)/instrutores/page.tsx`    # painel `view-os-instrutoria` novo (sibling de painelLiq_/
                                  # painelFichaInstrutor), botão "Gerar O.S. de Instrutoria"

tests/
└── regras_de_negocio_backend.test.ts   # casos novos para semestreParaIntervalo_ e o
                                          # agrupamento de calcularOsInstrutoria
```

**Structure Decision**: `lib/acoes/os-instrutoria.ts` como módulo novo e isolado — mesmo precedente de
`lib/acoes/liq.ts`/`lib/dominio/sugestao-dsa.ts` (Princípio VI): o domínio (agrupamento por instrutor a partir de aulas
realizadas) é conceitualmente distinto de `lib/acoes/instrutores.ts` (cadastro) e de `lib/acoes/liq.ts` (geração de
documento oficial trimestral), mesmo reaproveitando funções puras de ambos
(`trimestreParaIntervalo_`/`intervalosSeInterceptam_` de `lib/acoes/liq.ts`). Nenhum arquivo de frontend
novo — o ponto de entrada (botão) e a nova view vivem dentro de `app/(app)/instrutores/page.tsx`, que já é
dono do domínio "Instrutores" e já hospeda 2 painéis sibling análogos (`painelFichaInstrutor`,
`painelLiq_`).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Nenhuma violação de constitution — a ressalva do Princípio I é uma limitação documentada de
proveniência (achado real), não uma violação de regra; RN-ANT-01 é uma adição de conformidade
(Princípio II), não uma exceção a justificar.

## Phase 0 — Research

Ver `research.md` (6 decisões: fonte de dados de "aula realizada", filtro de recorte
curso/período, ordenação por antiguidade, nome sem formatação, `semestreParaIntervalo_`, ausência
de RBAC adicional).

## Phase 1 — Design

Ver `data-model.md` (estrutura de saída de `calcularOsInstrutoria`, sem entidade de schema nova) e
`contracts/*.md`. `quickstart.md` documenta os 2 roteiros de validação manual (modo Curso, modo
Período).
