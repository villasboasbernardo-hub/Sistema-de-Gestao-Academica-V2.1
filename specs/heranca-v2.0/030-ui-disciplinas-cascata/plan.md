# Implementation Plan: Módulo de Disciplinas — Navegação em Cascata e Edição de Período/Instrutor por Turma

**Branch**: `030-ui-disciplinas-cascata` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/030-ui-disciplinas-cascata/spec.md`

## Summary

Adiciona, em `app/(app)/disciplinas/page.tsx`, uma seção nova (aditiva — FR-002.1, a edição de grade
existente fica intocada) com cascata Curso→Turma, tabela de disciplinas da turma selecionada
(`turma_disciplina`) e painel de edição (período + instrutores com busca), reaproveitando 100% do
backend já existente (`atualizarTurmaDisciplina`/CRUD genérico, specs 027/029) e do contexto já
carregado no boot (`AppState.ctx.turmas`, já com `dataInicio`/`dataTermino` — `app/layout.tsx` + `lib/supabase/server.ts`). Único
código novo: frontend puro, incluindo uma cópia client-side da validação de janela (feedback
instantâneo, complementar à validação server-side já ativa).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita a Server Action (`components/ciaara/`), `AppState.ctx.turmas`
(já carregado no boot com `dataInicio`/`dataTermino`, ``app/layout.tsx` + `lib/supabase/server.ts`:73-86`), `crudListar`/
`atualizarTurmaDisciplina` (backend, specs 027/029, zero mudança).

**Storage**: Nenhuma mudança de schema — leitura pura via CRUD genérico já existente.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta específica. A população do seletor de Turma é gratuita
(`AppState.ctx.turmas`, já em memória) — nenhuma chamada de rede nova para isso.

**Constraints**: Nenhuma mudança de backend (FR-009); a edição de grade já existente (Carga
Horária/Técnica de Ensino/Local Padrão) permanece exatamente como está (FR-002.1); a validação
client-side é cópia funcional da regra já aplicada no servidor (`intervaloContidoEm_`, `lib/acoes/liq.ts`),
nunca a única camada de defesa.

**Scale/Scope**: 1 arquivo de frontend tocado (`app/(app)/disciplinas/page.tsx`) — nenhum arquivo de backend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — nenhuma norma externa nova envolvida; UI reflete um modelo de dados já implementado e documentado (`01-schema.md`, LIQ-1). |
| II. Preservação de Regras de Negócio | PASSA — FR-002.1 preserva explicitamente a edição de grade já existente; nenhuma RN muda. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova. |
| IV. Integridade do Histórico | PASSA — leitura/escrita via `atualizarTurmaDisciplina` já existente, mesmo protocolo. |
| V. Degradação Segura | PASSA — validação client-side degrada para permitir envio quando a turma não tem janela definida (FR-007, mesmo comportamento de `intervaloContidoEm_` no servidor, RN-DEG-01); nunca é a única camada (o servidor sempre revalida). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — estende `app/(app)/disciplinas/page.tsx` (já dono do domínio "Disciplinas"), sem tocar `app/(app)/cursos/[curso]/page.tsx` (FR-010) nem nenhum arquivo de backend. |
| VII. Configuração Sobre Constante | N/A. |
| VIII. Rastreabilidade | PASSA — achados citam função/arquivo real; FR-002.1 documenta explicitamente a decisão de preservação (Clarifications). |
| IX. Contenção de Escopo | PASSA — mesma competência já estabelecida para o módulo de Instrutores/Disciplinas; UI nova não amplia escopo funcional, só reflete o modelo já implementado. |

## Project Structure

### Documentation (this feature)

```text
specs/030-ui-disciplinas-cascata/
├── plan.md
├── research.md
├── data-model.md         # sem entidade nova - documenta so a forma de UI/estado local
├── quickstart.md
├── contracts/
│   └── frontend-functions.md   # so frontend - backend 100% reaproveitado, sem contrato novo
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
└── frontend/
    └── `app/(app)/disciplinas/page.tsx`    # ESTENDIDO — nova seção Curso→Turma→Tabela→Painel de edição,
                                  # aditiva (FR-002.1), reaproveita atualizarTurmaDisciplina já
                                  # existente (`lib/acoes/liq.ts`, sem mudança)
```

**Structure Decision**: Nenhum arquivo novo, nenhuma mudança de backend — estende só
`app/(app)/disciplinas/page.tsx`, já dono do domínio "Disciplinas" (achado real: `lib/acoes/disciplinas.ts` não
precisa de nenhuma função nova, todo o motor já existe desde as specs 027/029).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Nenhuma violação.

## Phase 0 — Research

Ver `research.md` (4 decisões: reaproveitar `AppState.ctx.turmas` em vez de nova leitura;
localização da seção nova na tela; padrão de busca de instrutor a replicar; validação client-side
como espelho funcional, não reescrita independente).

## Phase 1 — Design

Ver `data-model.md` (forma de estado local em memória, sem entidade de schema) e
`contracts/frontend-functions.md`. `quickstart.md` documenta os 2 roteiros de validação manual
(cascata + tabela; edição com busca e bloqueio client-side).
