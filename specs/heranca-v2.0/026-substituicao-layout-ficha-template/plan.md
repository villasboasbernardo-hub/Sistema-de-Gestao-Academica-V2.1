# Implementation Plan: Hotfix — Substituição Estrita do Layout da Ficha pelo Template Local

**Branch**: `026-substituicao-layout-ficha-template` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-substituicao-layout-ficha-template/spec.md`

## Summary

Substitui o HTML gerado por `renderizarFichaInstrutor_` (tabela genérica rótulo/valor a partir de
`BLOCOS_EDICAO_INSTRUTOR`, spec 025) pela estrutura exata do arquivo local
`SIS11/modelos/Ficha de cadastro/FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` — mesmo export do
`.docx` que já origina o Template do PDF (specs 022-024), agora com as 2 imagens oficiais
(brasões) e as tags `{{TAG}}` quase idênticas às de `MAPA_TAGS_FICHA_PDF`. Como o arquivo fonte tem
~100 classes CSS geradas automaticamente pelo a rota de impressão `/print/*` (`.c0`–`.c104`) e ~40KB de marcação, a
transformação (extrair `<style>`, escopar sob `#fichaInstrutorConteudo`, extrair o `<body>`,
trocar `{{TAG}}` por `${...}` de interpolação JS, remover o `<hr style="page-break-before:
always">`, converter as 2 imagens para Base64) é feita por um script one-off durante o
`/speckit-implement`, não por edição manual de ~100 regras CSS — o script só GERA o texto a ser
colado no arquivo de código (`app/(app)/instrutores/page.tsx`); nenhum script novo fica no repositório depois
(diferente das migrações de schema, que são scripts permanentes versionados em `migracao/`).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — a conversão HTML→JS template literal e imagem→Base64 é
feita uma única vez, fora do runtime do Next.js (script Node/Python local, usado só para gerar
o texto final a colar no código-fonte).

**Storage**: Nenhuma mudança — esta spec toca só a renderização client-side da view SPA da Ficha
(`app/(app)/instrutores/page.tsx`), sem tocar `instrutores`/schema/backend.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — troca de layout visual, sem impacto de performance além do aumento de
tamanho do arquivo (~270KB de texto Base64 adicionado a `app/(app)/instrutores/page.tsx`, ver research.md
§2 — aceitável, sem limite de tamanho do Next.js HTML que chegue perto disso).

**Constraints**: `mostrarPainelFichaInstrutor_`/`fecharPainelFichaInstrutor_`/
`salvarFichaClick_`/`window.print()` MUST permanecer com lógica interna inalterada (FR-005);
o wrapper `id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor"` MUST continuar
existindo, preservando a correção de `@media print` da spec 025 (FR-006); o `<style>` do arquivo
local MUST ficar escopado sob `#fichaInstrutorConteudo`, nunca vazando para o resto da SPA (FR-004);
`lib/acoes/instrutores.ts`/`MAPA_TAGS_FICHA_PDF`/template da rota `/print/ficha-instrutor` MUST permanecer intocados (FR-009).

**Scale/Scope**: 1 arquivo de código tocado (`app/(app)/instrutores/page.tsx`, só a função
`renderizarFichaInstrutor_`), nenhum arquivo novo no repositório, nenhum `.ts` tocado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — pedido direto de Bernardo corrigindo o layout visual da Ficha já existente (RF-INSTR-10), nenhuma regra de negócio nova. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN tocada, é bug de apresentação/layout visual, não de regra. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova; imagens embutidas como Base64 puro (sem CDN/serviço externo), CSS/HTML nativos. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita em dado de domínio, nenhuma migração de schema. |
| V. Degradação Segura | PASSA — campo sem valor cadastrado aparece vazio, nunca `undefined`/tag `{{...}}` literal (mesmo padrão de toda spec anterior da Ficha). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 2 User Stories independentes; único arquivo tocado é o mesmo que já continha a lógica da Ficha (spec 025), sem espalhar a mudança. |
| VII. Configuração Sobre Constante | PASSA — não se aplica (sem limite normativo/dado anual do PROENS envolvido). |
| VIII. Rastreabilidade | PASSA — FRs citam achado real (arquivo/linha/classe CSS) por ser bug de UI sem RF/RN formal específico, mesmo padrão aceito em todo hotfix desta sessão. |
| IX. Contenção de Escopo | PASSA — troca de layout de funcionalidade já existente (spec 025), FR-009 confirma zero mudança de backend/PDF. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/026-substituicao-layout-ficha-template/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── frontend-functions.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── frontend/
    └── `app/(app)/instrutores/page.tsx`   # renderizarFichaInstrutor_ (unica funcao tocada) - HTML/CSS/
                                # imagens do arquivo local embutidos como constantes JS

SIS11/modelos/Ficha de cadastro/   # fonte externa ao repositorio, so leitura
├── FICHACADASTRODEDOCENTESCIAARA_2_.docx.html
└── images/
    ├── image1.png
    └── image2.png

appsscript/                    # staging do o fluxo Git → Vercel

tests/
└── *.test.ts                  # suite de invariantes estruturais (sem caso novo nesta spec -
                                # mudanca e DOM/CSS puro, sem harness de mock disponivel)
```

**Structure Decision**: Mesma estrutura de todo o projeto. Nenhum arquivo novo — o único arquivo de
código tocado (`app/(app)/instrutores/page.tsx`) já existe e já é responsável por essa mesma função desde a
spec 025. O script de transformação (HTML local → constantes JS) é uma ferramenta de geração de
texto usada uma única vez durante `/speckit-implement`, não um artefato permanente do repositório
(diferente de `migracao/*.py`, que são scripts versionados reexecutáveis).

## Complexity Tracking

*Sem violações — seção não aplicável.*

## Phase 0 — Não há data-model.md

Sem entidade de dado nova ou alterada (FR-009) — `data-model.md` omitido, mesmo padrão das specs
020/021/023/024.
