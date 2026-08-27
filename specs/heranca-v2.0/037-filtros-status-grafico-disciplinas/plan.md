# Implementation Plan: Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

**Branch**: `037-filtros-status-grafico-disciplinas` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-filtros-status-grafico-disciplinas/spec.md`

## Summary

Adiciona 3 filtros novos (Status da Turma, Instrutor, Status da Disciplina) e um gráfico de pizza
de Carga Horária por disciplina ao Módulo de Disciplinas (`app/(app)/disciplinas/page.tsx`), reaproveitando
por completo dado/lógica já existente — nenhuma coluna, tabela ou biblioteca nova. A abordagem
técnica central: migrar a agregação de estatísticas (hoje em `getEstatisticasDisciplinas`,
`lib/acoes/estatisticas.ts`) inteiramente para o cliente, mesmo padrão já usado pelo motor de cross-filtering
do Módulo de Instrutores (spec 015) — é o único jeito dos cartões/gráfico reagirem aos 3 filtros
novos sem round-trip de rede a cada mudança (FR-004, SC-001). Como efeito colateral direto dessa
migração (não uma tarefa negociada à parte), `getDisciplinasAnoVigente` (`lib/acoes/cronograma.ts`) passa a
computar `StatusConclusao`/`Ritmo` por linha usando `resolverPeriodoEfetivo_` — mesma correção que
`getDisciplinasDaTurmaComRitmo` já tinha desde a spec 033, nunca replicada aqui.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Tailwind CSS + shadcn/ui (pacote npm), Recharts. Nenhuma dependência nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `turmas`, `turma_disciplina`,
`disciplinas`, `registros_aula`, todas já existentes. Nenhuma coluna nova.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Reação dos filtros e do gráfico em <1s, sem nenhuma chamada a Server Action adicional além das já existentes na tela (SC-001/SC-003) — filtragem/agregação inteiramente em
memória sobre dado já carregado.

**Constraints**: Nenhuma migração de schema; nenhuma biblioteca de gráfico nova (Recharts já
aprovado); `getEstatisticasDisciplinas` só pode ser removida se ficar com zero consumidor (confirmado
por grep — `app/(app)/disciplinas/page.tsx` é o único).

**Scale/Scope**: 1 arquivo de frontend (`app/(app)/disciplinas/page.tsx`), 2 arquivos de backend
(`lib/acoes/cronograma.ts` estendido, `lib/acoes/estatisticas.ts` com 1 função removida) — mesma ordem de grandeza das
specs 030/031 (100% ou quase 100% frontend).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — feature não vem do backlog do documento 06 (como as specs 009/034+ desta sessão), pedido direto de Bernardo; RF-MATERIAS-04 (estatísticas do módulo) é a referência mais próxima, já citada pela spec 031. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma regra `RN-` alterada; a correção do item "Achado adicional" (fonte de data do ritmo) é estritamente aditiva (mesma fórmula, fonte de dado mais correta), coberta por teste de regressão. |
| III. Restrição de Plataforma | PASSA — Next.js (App Router) + Supabase PostgreSQL + TypeScript `strict` + Tailwind/shadcn intactos; nenhuma dependência nova fora da lista do Princípio III da constitution v2.1. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita nova, nenhuma migração; feature é 100% leitura/filtragem. |
| V. Degradação Segura | PASSA — combinação de filtros sem resultado degrada para mensagem "nenhuma disciplina" (Edge Cases do spec.md), nunca exceção; gráfico ausente (não quebrado) quando sem dado (FR-008). |
| VI. Mudança Cirúrgica | PASSA — 1 função backend estendida (aditiva), 1 função backend removida (zero consumidor, confirmado por grep), resto é frontend; cada User Story testável isoladamente. |
| VII. Configuração sobre Constante | N/A — nenhum limite normativo/dado anual envolvido. |
| VIII. Rastreabilidade | PASSA — FRs citam RN-ANT-01 (FR-002.1) e a origem do "Achado adicional"; tasks.md (fase seguinte) cita FR-/RN- por tarefa. |
| IX. Contenção de Escopo | PASSA — mesmo teste do documento 00 §7 já aplicado à Verificação de Premissa do spec.md; escopo re-negociado com Bernardo em conversa direta antes da spec (Status da Turma, não do Curso; sem cálculo novo de status). |

Nenhuma violação — Complexity Tracking fica vazio.

### Re-checagem pós-design (Phase 1 concluída)

Nenhum ponto novo surgiu durante `research.md`/`data-model.md`/`contracts/` que mude a avaliação
acima — a extensão de `getDisciplinasAnoVigente` continua aditiva (Princípio VI), a remoção de
`getEstatisticasDisciplinas` está confirmada como zero-consumidor por grep (Princípio VI), e nenhum
gráfico/biblioteca/coluna nova foi introduzido (Princípio III/IV). Gate mantido: PASSA.

## Project Structure

### Documentation (this feature)

```text
specs/037-filtros-status-grafico-disciplinas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── backend-functions.md
│   └── frontend-functions.md
└── tasks.md              # Phase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
lib/acoes/
├── `lib/acoes/cronograma.ts`         # ESTENDIDO — getDisciplinasAnoVigente ganha StatusConclusao/Ritmo por linha
└── `lib/acoes/estatisticas.ts`       # ESTENDIDO — getEstatisticasDisciplinas removida (zero consumidor)

app/
└── `app/(app)/disciplinas/page.tsx`  # ESTENDIDO — 3 selects novos, filtroAtual estendido, agregação client-side

tests/
├── regras_de_negocio_backend.test.ts  # getDisciplinasAnoVigente (StatusConclusao/Ritmo);
│                                       # getEstatisticasDisciplinas removida do arquivo
└── regras_ui_dados.test.ts            # funções puras novas de `app/(app)/disciplinas/page.tsx`
```

**Structure Decision**: Reaproveita a estrutura já existente do projeto (`lib/acoes/*.ts` e `lib/dominio/*.ts` +
`app/**/page.tsx` e `components/**/*.tsx` + `tests/unidade/*.test.ts`, ver `docs/arquitetura/02-modularizacao.md`) — nenhum
diretório novo, nenhuma opção de "Web application" com pastas `backend/`/`frontend/` separadas (essa
distinção já existe dentro de `src/`, não é este template genérico).

## Complexity Tracking

*(vazio — nenhuma violação de Constitution Check)*
