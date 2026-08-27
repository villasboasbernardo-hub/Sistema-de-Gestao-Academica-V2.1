# Implementation Plan: Hotfix — Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos

**Branch**: `021-hotfix-graficos-siglas-cursos` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/021-hotfix-graficos-siglas-cursos/spec.md`

## Summary

Polimento de UI/UX sobre o módulo de Instrutores, sem nenhuma mudança de schema, dividido em 3
frentes independentes já mapeadas nos Achados reais do spec.md: (1) 2 correções + 1 gráfico novo no
painel de estatísticas de Instrutores (título "Status de Seleção", siglas de posto/graduação em vez
de nome extenso, pizza binária de capacitação didática) — tudo client-side, reaproveitando
`agregarEstatisticasInstrutores_`/`renderizarGrafico_` já existentes; (2) botão "Reativar" simétrico a
"Desativar" na listagem, com a mesma confirmação (`confirm()`), apoiado por uma função de backend
nova (`reativarInstrutor`) que reaproveita o motor `crudAtualizar` genérico já existente; (3) troca de
nome completo por sigla de curso (`ID_Curso`, já a fonte de verdade da sigla desde a spec 019) em 6
pontos de exibição já mapeados (4 dropdowns + 1 lista de vínculos + o texto de disciplinas habilitadas
do instrutor/Ficha), preservando as 2 exceções explícitas (cartão do Painel Início, título do cartão
de curso na Página do Curso) e o nome de Turma (fora de escopo, é `FORMULA` de schema).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Recharts (como dependência versionada no `package.json`, já carregado desde o Épico 009) para os gráficos;
Tailwind CSS + shadcn/ui (pacote npm) para os botões condicionais. Nenhuma dependência nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — banco de produção V2.0 (`instrutores.Status`, `cursos.ID_Curso`/
`Nome_Curso`), ambas colunas já existentes, nenhuma alteração de schema (FR-015).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A além do já garantido — os 3 gráficos alterados/novos e a troca de sigla
continuam sendo recálculo client-side puro sobre dados já carregados no boot (`instrutoresCarregados`/
`AppState.ctx.cursos`), sem nenhuma chamada de rede nova (FR-006, mesmo motor da spec 015).

**Constraints**: Zero alteração de schema (FR-015, restrição explícita do próprio pedido); a
tradução sigla→nome extenso de posto/graduação usada pela Ficha (`NOMES_POSTO_POR_CODIGO`) não pode
regredir (FR-003); implantação via `o fluxo Git → Vercel` (Princípio III da constitution), nunca CI/CD automatizado.

**Scale/Scope**: ~177 instrutores, ~24 cursos (mesma ordem de grandeza de specs anteriores) — sem
impacto de escala, é troca de rótulo de exibição + 1 gráfico adicional + 1 função de escrita.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — origem é pedido direto de Bernardo (mesmo padrão das specs 009-020, hotfixes de UI/UX pós-homologação, não do backlog do documento 06). A ação de reativar instrutor estende RF-INSTR-12 (desativação já é ação permitida a Admin/Divisão de Administração Acadêmica/Operador) simetricamente, sem contradizer nenhum RF/RN existente. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN de negócio muda; RN-INST-02 (confirmação ao desativar) é estendida por simetria a "Reativar" (Clarifications 2026-08-18), não substituída. |
| III. Restrição de Plataforma | PASSA — Next.js (App Router) + Supabase PostgreSQL + TypeScript `strict` + Tailwind/shadcn intactos; nenhuma dependência nova fora da lista do Princípio III da constitution v2.1. |
| IV. Integridade do Histórico | PASSA — `reativarInstrutor` usa `crudAtualizar` (grava `Status='Ativo'` na linha existente), nunca apaga/reescreve histórico; nenhuma migração envolvida. |
| V. Degradação Segura | PASSA — edge cases de curso/sigla vazia e capacitação vazia already cobertos com fallback vazio, nunca exceção (Edge Cases do spec.md). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 3 User Stories independentes, cada uma testável isoladamente; suíte `tests/` valida as funções puras alteradas/novas (`agregarEstatisticasInstrutores_`, `disciplinasHabilitadasDoInstrutor_`). |
| VII. Configuração Sobre Constante | PASSA — nenhum limite normativo/dado anual envolvido nesta spec. |
| VIII. Rastreabilidade | PASSA — FRs desta spec citam a origem do achado real (arquivo:linha) em vez de um RF/RN formal onde não existe um documento de Fase 1 cobrindo UI de gráfico/sigla — mesmo padrão aceito nas specs 009/010/013/017/018/020. |
| IX. Contenção de Escopo | PASSA — módulo de Instrutores já é processo da CIAARA-11 (Matriz de Responsabilidades, RF-INSTR-*); polimento de UI sobre módulo já existente, não processo novo. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/021-hotfix-graficos-siglas-cursos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── frontend-functions.md
│   └── server-functions.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── backend/
│   └── `lib/acoes/instrutores.ts`         # reativarInstrutor (NOVA)
└── frontend/
    ├── `app/(app)/instrutores/page.tsx`   # graficos, botao Reativar, disciplinasHabilitadasDoInstrutor_,
    │                          # nomeCursoPorId, filtroCurso (a maior parte da mudanca)
    ├── `app/(app)/cronograma/page.tsx`    # dropdown #cronoCurso -> sigla
    ├── `app/(app)/disciplinas/page.tsx`   # dropdown #discCursoSelecao -> sigla
    └── `app/(app)/admin/usuarios/page.tsx`      # dropdown #usrCursoParaVincular + lista de vinculos -> sigla

appsscript/                    # staging do o fluxo Git → Vercel (push.sh copia de src/ para ca antes do deploy)

tests/
└── *.test.ts                  # suite de invariantes estruturais (pnpm vitest run)
```

**Structure Decision**: Mesma estrutura de todo o projeto desde o Épico B — projeto único Apps
Script, sem separação física frontend/backend além de `lib/acoes/*.ts` e `lib/dominio/*.ts` vs. `app/**/page.tsx` e `components/**/*.tsx`.
Nenhum diretório novo é criado; todos os arquivos tocados já existem.

## Complexity Tracking

*Sem violações — seção não aplicável.*
