# Implementation Plan: Hotfix — Remoção de Edição Inline, Auditoria de Persistência de Datas e Permissão de Admin

**Branch**: `038-hotfix-edicao-inline-datas-admin` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-hotfix-edicao-inline-datas-admin/spec.md`

## Summary

Três correções independentes e cirúrgicas no Módulo de Disciplinas: (1) remove a edição inline de
Carga Horária/Prioridade de `linhaVisao2_` (as 2 visões turma-aware — o modal já tem paridade
completa desde a spec 036), preservando a edição inline em `linhaVisao1_` (catálogo puro, sem
modal alternativo); (2) `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) ganha uma releitura de verificação
pós-gravação para `Previsao_Inicio`/`Previsao_Termino` — lança erro real se o valor gravado não
bater com o enviado, mais `Logger.log` permanente no ponto de gravação, já que a investigação de
premissa (código + dado ao vivo) não localizou uma causa raiz para reproduzir corrigir; (3)
`definirPrioridadeDisciplina` (`lib/dominio/motor-preditivo.ts`) ganha `'Admin'` na lista de perfis autorizados,
igualando o padrão `['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)` já usado por toda outra
função de escrita do mesmo arquivo.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — Tailwind CSS + shadcn/ui/Recharts já em uso, sem relação com este
hotfix (0 mudança de UI visual além de remover inputs).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — nenhuma coluna nova.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem impacto perceptível — a releitura pós-gravação (US2) é 1 leitura extra
de uma aba já pequena (`turma_disciplina`), só quando `Previsao_Inicio`/`Previsao_Termino` fazem
parte da chamada.

**Constraints**: Nenhuma migração de schema; a remoção de edição inline (US1) não pode reduzir
capacidade na visão de catálogo puro (FR-002, já decidido na Verificação de Premissa).

**Scale/Scope**: 1 arquivo de frontend (`app/(app)/disciplinas/page.tsx`, só `linhaVisao2_`), 2 arquivos de
backend (`lib/acoes/liq.ts` estendido, `lib/dominio/motor-preditivo.ts` 1 linha) — o hotfix mais cirúrgico desde a spec
034 (Hotfix Validação da LIQ).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — hotfix pontual pedido direto por Bernardo, não vem do backlog do documento 06; nenhuma regra `RF-`/`RN-` nova envolvida. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma regra `RN-` alterada; US1 preserva 100% da capacidade de edição (só move onde ela vive), US3 só amplia quem pode gravar Prioridade, nunca restringe. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova, nenhuma mudança de arquitetura. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita nova de dado; `Logger.log` (US2) não é `migracao_log`, é o log de execução nativo do Next.js (efêmero, sem relação com o histórico de dados). |
| V. Degradação Segura | PASSA diretamente — US2 é a aplicação literal deste princípio: uma falha de gravação hoje silenciosa passa a ser um erro visível (RN-DEG-01 é sobre degradar para vazio/neutro COM aviso — aqui o "aviso" estava faltando). |
| VI. Mudança Cirúrgica | PASSA — 3 correções independentes, cada uma testável isoladamente, escopo mínimo (1 função de cada vez). |
| VII. Configuração sobre Constante | N/A — nenhum limite normativo/dado anual envolvido. |
| VIII. Rastreabilidade | PASSA — FRs citam a Verificação de Premissa; `tasks.md` (fase seguinte) cita cada FR por tarefa. |
| IX. Contenção de Escopo | PASSA — pedido de Bernardo sobre um módulo já dentro do escopo do projeto; item 1 do pedido original (remover completamente, sem exceção) foi corrigido para preservar capacidade na visão sem modal (FR-002), decisão documentada na Verificação de Premissa, não uma expansão de escopo. |

Nenhuma violação — Complexity Tracking fica vazio.

### Re-checagem pós-design (Phase 1 concluída)

Nenhum ponto novo surgiu durante `research.md`/`data-model.md`/`contracts/` que mude a avaliação
acima. Gate mantido: PASSA.

## Project Structure

### Documentation (this feature)

```text
specs/038-hotfix-edicao-inline-datas-admin/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── backend-functions.md
└── tasks.md              # Phase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
lib/acoes/
├── `lib/acoes/liq.ts`                # ESTENDIDO — atualizarTurmaDisciplina ganha releitura de verificação + Logger.log
└── `lib/dominio/motor-preditivo.ts`      # ESTENDIDO — definirPrioridadeDisciplina ganha 'Admin' na lista de perfis

app/
└── `app/(app)/disciplinas/page.tsx`   # ESTENDIDO — linhaVisao2_ perde inputs/botão Salvar de CH/Prioridade

tests/
└── regras_de_negocio_backend.test.ts  # atualizarTurmaDisciplina (releitura), definirPrioridadeDisciplina (Admin)
```

**Structure Decision**: Reaproveita a estrutura já existente (`lib/acoes/*.ts` e `lib/dominio/*.ts` + `app/
*.html` + `tests/unidade/*.test.ts`) — nenhum diretório novo.

## Complexity Tracking

*(vazio — nenhuma violação de Constitution Check)*
