# Implementation Plan: Hotfix — Refinamento de UI e Correção do Algoritmo de Nome de Guerra

**Branch**: `020-hotfix-refinamento-listagem-instrutores` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-hotfix-refinamento-listagem-instrutores/spec.md`

## Summary

Consolidar as colunas "Posto/Graduação" e "Nome Completo" da listagem principal de instrutores em
uma única coluna "Instrutor", corrigir `formatarNomeInstrutor_` (`components/ciaara/`) para destacar cada
palavra do nome de guerra individualmente (em vez de exigir substring contíguo), remover
completamente a seção legada de vínculo isolado de `app/(app)/instrutores/page.tsx` (HTML + JS + a função de
backend que só ela consumia) e renomear o rótulo do painel de disciplinas para "Qualificação do
Instrutor". Mudança estritamente de frontend + 1 função de backend removida — zero alteração de
schema/dado persistido (FR-009).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — nenhuma leitura/escrita nova; `instrutor_disciplina` continua sendo
escrita exclusivamente pelo caminho já existente (`sincronizarDisciplinasInstrutor`, spec 019), que
não é tocado por esta spec.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mudança de exibição/formatação de texto, sem impacto de desempenho
mensurável.

**Constraints**: FR-009 (zero alteração de schema/dado persistido) — nenhuma coluna de planilha,
nenhum novo campo gravado. Toda mudança de comportamento observável fica restrita a HTML renderizado
e à string retornada por `formatarNomeInstrutor_`.

**Scale/Scope**: 3 arquivos de frontend tocados (`components/ciaara/`, `app/(app)/instrutores/page.tsx`, mais
`app/layout.tsx` só para o `o SHA do commit`), 1 arquivo de backend tocado (`lib/acoes/instrutores.ts`, função removida,
mais `lib/supabase/server.ts` só para o `o SHA do commit`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | **PASSA.** Nenhuma RF-/RN- de Fase 1 rege o layout de colunas de uma listagem nem o algoritmo de destaque de nome de guerra — ambos são refinamentos de interface desta versão, sem contrato normativo correspondente. |
| II. Preservação de Regras de Negócio | **PASSA.** Nenhuma regra `RN-` muda de comportamento — a criação/desativação de vínculo continua existindo (via o painel de edição de instrutor, spec 019), só o caminho redundante de criar-um-vínculo-isolado é removido. |
| III. Restrição de Plataforma | **PASSA.** Zero dependência nova. |
| IV. Integridade do Histórico | **PASSA.** Nenhuma escrita em planilha é tocada por esta spec — é puramente exibição/formatação e remoção de UI/função de backend sem consumidor. Remover uma função de backend sem nenhum caminho de escrita ativo não é uma "migração/saneamento" no sentido do Princípio IV (não há dado a preservar; a função nunca é executada). |
| V. Degradação Segura | **PASSA.** FR-004 exige que uma palavra do nome de guerra não encontrada no nome completo simplesmente não receba destaque, sem lançar exceção; FR-007 exige que erros de carregamento da listagem continuem visíveis após a remoção do contêiner de aviso antigo. |
| VI. Mudança Cirúrgica | **PASSA.** Correção pontual em uma função já existente (`formatarNomeInstrutor_`), consolidação de 2 células já existentes em 1, remoção de HTML/JS autocontido — nenhuma abstração nova introduzida. |
| VII. Configuração sobre Constante | **PASSA.** Nenhum limite normativo novo. |
| VIII. Rastreabilidade | **PASSA.** Tarefas citam FR-00X desta spec. |
| IX. Contenção de Escopo | **PASSA.** Refinamento de uma tela já dentro do escopo do projeto (módulo de Instrutores). |

## Project Structure

### Documentation (this feature)

```text
specs/020-hotfix-refinamento-listagem-instrutores/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── frontend-functions.md
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Nenhum `data-model.md` — esta spec não introduz nem altera nenhuma entidade de dado (FR-009,
Key Entities de `spec.md`: "Nenhuma entidade de dado nova ou alterada").

### Source Code (repository root)

```text
lib/acoes/
├── `lib/acoes/instrutores.ts`        # - criarVinculoHabilitacao [REMOVIDA, achado real, sem consumidor]
└── `lib/supabase/server.ts`                # o SHA do commit bump

app/
├── `components/ciaara/`            # formatarNomeInstrutor_ [MODIFICADA - algoritmo de destaque por palavra]
├── `app/(app)/instrutores/page.tsx`   # renderizarListagemInstrutores_ [MODIFICADA - coluna consolidada];
│                           #   secao "Vinculo de qualificacao" + carregarDisciplinasParaVinculo +
│                           #   salvarVinculoHabilitacao [REMOVIDOS]; carregarInstrutores
│                           #   [MODIFICADA - novo container de aviso de pagina]; label do painel
│                           #   de disciplinas [MODIFICADA - "Qualificação do Instrutor"]
└── `app/layout.tsx`              # o SHA do commit_FRONTEND bump

tests/
└── design_system.test.ts  # 2 testes migrados (nova asercao de 2 tags) + casos novos de palavras
                             #  nao contiguas (US2)
```

**Structure Decision**: Mesma estrutura de sempre — nenhuma pasta nova. Todo o trabalho cabe em
mudanças a 3 arquivos de frontend e 1 de backend já existentes.

## Complexity Tracking

*Nenhuma violação de Constitution Check — seção não aplicável.*
