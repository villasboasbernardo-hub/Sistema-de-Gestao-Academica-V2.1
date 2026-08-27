# Implementation Plan: Hotfix e Nova Feature — Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

**Branch**: `025-ficha-spa-mascaras-schema` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/025-ficha-spa-mascaras-schema/spec.md`

## Summary

Substitui o modal da Ficha do Instrutor por uma 3ª view SPA dentro de `tabInstrutores` (mesmo
mecanismo já usado pelo painel de edição), com 3 botões (Voltar/Salvar Ficha/Imprimir);
reorganiza o formulário de edição para que "Sistema" e os 2 painéis de disciplinas fiquem
exclusivamente dentro da Aba 3; remove a coluna `Instrutor_Completo` (fórmula morta, achado real) e
adiciona `Endereco_Estado`; adiciona máscaras de CPF/CEP/Telefone/RETELMA seguindo o padrão já
existente de `mascaraNip_`. O item de maior risco técnico é o botão "Imprimir": a spec 024 trocou
`window.print()` por um fluxo de PDF porque o CSS de impressão (spec 023) não funciona dentro de um
`.modal` — um ancestral com `display:none` bloqueia a renderização do descendente mesmo que ele
tenha `display:block`. Essa spec traz `window.print()` de volta, mas isso só é seguro se o CSS
compartilhado (`app/globals.css`) for redesenhado para nunca aplicar `display:none` a `[data-view]`/
`<main>`/`body` — ver research.md §2 para a análise completa e a técnica escolhida.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — Tailwind CSS + shadcn/ui Toast é a primeira vez que esse componente
específico é usado no projeto, mas o pacote `tailwindcss` + `shadcn/ui` (que já inclui `Tailwind.Toast`) está
carregado desde o Hotfix 010; nenhum `<script>` novo.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `instrutores` perde `Instrutor_Completo` e ganha `Endereco_Estado`
(2 migrações reais, backup + `migracao_log`, Princípio IV). Primeiro aplicadas contra a cópia
local de trabalho; aplicar contra a banco de produção fica como pendência real explícita (mesmo
padrão de toda migração desta sessão).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — reorganização de UI e correção de bug, sem impacto de performance.

**Constraints**: A correção do `@media print` MUST beneficiar Ficha e DSA ao mesmo tempo, sem
duplicar lógica (Princípio VI); nenhuma tag nova no template da rota `/print/ficha-instrutor` para `Endereco_Estado`
(Princípio IX, fora do pedido original); migração de schema segue o protocolo padrão (backup +
`migracao_log`, nunca reescreve linha antiga).

**Scale/Scope**: 3 arquivos de código tocados (`app/(app)/instrutores/page.tsx`, `app/globals.css`, `lib/acoes/crud.ts`)
+ 1 script de migração novo (2 operações: remover 1 coluna, adicionar 1 coluna) + 1 arquivo de
teste estendido.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — pedido direto de Bernardo evoluindo a Ficha (RF-INSTR-10) e o formulário de edição (RF-INSTR-15) já existentes. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN de negócio tocada; são bugs de apresentação/UX, organização de formulário e limpeza/adição de schema sem regra normativa associada. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova; Tailwind CSS Toast já está disponível via o pacote `tailwindcss` + `shadcn/ui` (Hotfix 010), mesmo raciocínio de "componente nativo já carregado" usado para Offcanvas/Nav-Tabs em épicos anteriores. |
| IV. Integridade do Histórico | PASSA — as 2 migrações de schema seguem o protocolo padrão: backup prévio, `migracao_log` só-acrescenta, nunca reescreve linha antiga. |
| V. Degradação Segura | PASSA — máscaras nunca bloqueiam submissão por formato "errado" (só formatam visualmente, mesmo padrão de `mascaraNip_`); `Endereco_Estado` sem valor não quebra a Ficha/PDF (campo novo, opcional na prática). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 4 User Stories independentes; a correção do `@media print` é um único bloco compartilhado corrigido uma vez, beneficiando Ficha e DSA sem duplicar regra (mesmo raciocínio da spec 023). |
| VII. Configuração Sobre Constante | PASSA — a lista de 27 UFs é um domínio fechado e estável (não é limite normativo nem dado anual do PROENS) — literal aceitável no código, mesmo padrão do nome da pasta do Supabase Storage (spec 023). |
| VIII. Rastreabilidade | PASSA — FRs citam achado real (arquivo:linha/mecânica de CSS) por serem bugs de UI/schema sem RF/RN formal específico, mesmo padrão aceito em todo hotfix desta sessão. |
| IX. Contenção de Escopo | PASSA — `Endereco_Estado` explicitamente NÃO ganha tag no Template do PDF (FR-006) — fora do pedido original, não implementado preventivamente. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/025-ficha-spa-mascaras-schema/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── frontend-functions.md
│   └── backend-migration.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── backend/
│   └── `lib/acoes/crud.ts`                # COLUNAS_FORMULA['instrutores'] perde Instrutor_Completo
└── frontend/
    ├── `app/globals.css`          # @media print redesenhado (ancestrais nunca display:none)
    └── `app/(app)/instrutores/page.tsx`   # painelFichaInstrutor (novo, substitui o modal); abas
                                # reorganizadas (Sistema/Disciplinas so na Aba 3); 4 mascaras
                                # novas (CPF/CEP/Telefone/RETELMA); campo Endereco_Estado

migracao/
└── remover_instrutor_completo_adicionar_estado.py   # NOVO - migracao dupla (remove + adiciona)

appsscript/                    # staging do o fluxo Git → Vercel

tests/
└── ficha_formulario_instrutores.test.ts   # 4 casos novos (mascaraCpf_/mascaraCep_/
                                             # mascaraTelefone_/mascaraRetelma_)
```

**Structure Decision**: Mesma estrutura de todo o projeto. `lib/acoes/crud.ts` é o único `.ts` tocado (só a
lista `COLUNAS_FORMULA`, sem nova função). Um script de migração novo, mesmo padrão de
`migracao/remover_coluna_ultima_avaliacao_desempenho.py` (spec 016).

## Complexity Tracking

*Sem violações — seção não aplicável.*
