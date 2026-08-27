# Implementation Plan: Hotfix — Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)

**Branch**: `023-hotfix-pdf-impressao-ficha` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/023-hotfix-pdf-impressao-ficha/spec.md`

## Summary

Corrige 3 bugs reais e independentes na Ficha do Instrutor (spec 022), todos confirmados por
leitura direta do código antes de qualquer requisito ser escrito: (1) vazamento de HTML no título
do modal (`escapar()` envolvendo uma saída HTML de `formatarNomeInstrutor_`) — remove o wrapper de
escape, mantendo o negrito (Clarifications 2026-08-19); (2) impressão nativa gerando páginas em
branco — a regra `@media print` compartilhada (DSA + Ficha) usa `visibility` em vez de `display`,
reservando espaço de layout para elementos ocultos; (3) PDF salvo com ID cru no Supabase Storage —
`gerarFichaPDF` ganha um segundo parâmetro (nome de exibição, calculado no frontend via
`formatarNomeInstrutor_(..., isHTML=false)`) e passa a salvar dentro da pasta "Fichas dos
Instrutores" (`o Supabase Storage.getFoldersByName`/`createFolder`). Um quarto item do pedido original
("mesclagem do Template") não precisa de nenhuma mudança de código — a causa raiz real (Template
sem nenhuma tag `{{TAG}}`) já foi corrigida diretamente no documento, fora deste plano. Renomeação
do botão "Imprimir Ficha" → "Ficha" é puramente textual.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — `o Supabase Storage`/`a rota de impressão `/print/*`` já em uso desde a spec 022;
Tailwind CSS + shadcn/ui (CSS) já em uso para o modal/impressão.

**Storage**: Nenhuma mudança de schema (FR-009, restrição explícita do pedido) — só o parâmetro de
chamada `gerarFichaPDF(idInstrutor, nomeExibicao)` muda, sem tocar `instrutores`/
`config_parametros`.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mudanças de correção de bug, sem impacto de performance.

**Constraints**: Zero alteração de schema (FR-009); a correção de `@media print` MUST preservar o
comportamento já validado do DSA (FR-005); a mesclagem de dados (`gerarFichaPDF`, spec 022) MUST
permanecer com a mesma lógica de código (FR-008) — só o nome/pasta do arquivo mudam.

**Scale/Scope**: 3 arquivos tocados (`app/(app)/instrutores/page.tsx`, `app/globals.css`, `lib/acoes/instrutores.ts`),
nenhum arquivo novo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — pedido direto de Bernardo corrigindo bugs reais da spec 022 (mesmo módulo, RF-INSTR-10 continua a origem formal da Ficha imprimível). |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN de negócio tocada, são bugs de apresentação/arquivo, não de regra. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova; `o Supabase Storage`/`a rota de impressão `/print/*``/CSS nativo já em uso. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita em dado de domínio; o Template já foi corrigido fora deste plano com backup prévio (spec 022, sessão de clarify). |
| V. Degradação Segura | PASSA — nome de exibição vazio degrada para `idInstrutor` no backend (Edge Cases do spec.md), nunca lança exceção. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 3 User Stories independentes, cada uma um bug isolado; a correção de CSS é um único bloco compartilhado corrigido uma vez, beneficiando DSA e Ficha sem duplicar regra. |
| VII. Configuração Sobre Constante | PASSA — nome da pasta "Fichas dos Instrutores" é um literal aceitável aqui (não é um limite normativo nem dado anual do PROENS, é um identificador de organização de arquivo, fora do escopo do Princípio VII). |
| VIII. Rastreabilidade | PASSA — FRs citam achado real (arquivo:linha) por serem bugs de UI/arquivo sem RF/RN formal específico, mesmo padrão aceito em todo hotfix desta sessão. |
| IX. Contenção de Escopo | PASSA — correção de bugs em funcionalidade já existente (spec 022), não processo novo. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/023-hotfix-pdf-impressao-ficha/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
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
│   └── `lib/acoes/instrutores.ts`         # gerarFichaPDF ganha parametro nomeExibicao + pasta "Fichas dos
│                               # Instrutores" (linhas 289-316)
└── frontend/
    ├── `app/globals.css`          # @media print: visibility -> display (linhas 109-123)
    └── `app/(app)/instrutores/page.tsx`   # botao "Imprimir Ficha" -> "Ficha" (linha 399); modal title sem
                                # escapar() (linha 1285); gerarPdfFichaClick envia nomeExibicao
                                # (linha 1311)

appsscript/                    # staging do o fluxo Git → Vercel

tests/
└── *.test.ts                  # suite de invariantes estruturais (sem caso novo nesta spec —
                                # todos os 3 bugs sao DOM/Supabase Storage, sem harness de mock)
```

**Structure Decision**: Mesma estrutura de todo o projeto. Nenhum diretório/arquivo novo — os 3
arquivos tocados já existem e já são responsáveis por essas mesmas funcionalidades.

## Complexity Tracking

*Sem violações — seção não aplicável.*

## Phase 0 — Não há data-model.md

Sem entidade de dado nova ou alterada (FR-009) — `data-model.md` omitido, mesmo padrão das specs
020/021.
