# Implementation Plan: Hotfix — Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template

**Branch**: `024-hotfix-impressao-pdf-ficha` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/024-hotfix-impressao-pdf-ficha/spec.md`

## Summary

Corrige 3 problemas remanescentes da Ficha do Instrutor após a spec 023, todos confirmados por
leitura de código/dado ao vivo antes de qualquer requisito ser escrito: (1) o título do modal chama
`formatarNomeInstrutor_` com posto/especialidade vazios, diferente de `gerarPdfFichaClick` (mesmo
arquivo) que já passa os valores reais — corrige o argumento; (2) o cabeçalho fixo do modal está em
ordem/formato errados — substituído pelas 3 linhas institucionais em TUDO MAIÚSCULO, mesma
convenção já usada no Template do Supabase Storage (Clarifications 2026-08-19); (3) a correção CSS
`display`/`revert` da spec 023 é estruturalmente insuficiente dentro de um modal Tailwind CSS — um
ancestral (`.modal`/`.modal-body`) com `display: none` apaga a subárvore inteira mesmo com
`display: block` no descendente — por isso o botão "Imprimir" deixa de chamar `window.print()`
sobre o DOM do modal e passa a reaproveitar o mesmo fluxo de "Gerar PDF" (renomeado para "Salvar
Ficha no Supabase Storage"), abrindo o PDF gerado numa nova aba para impressão pelo visualizador nativo do
navegador — um documento isolado, sem DOM de app em volta. Adicionalmente, completa as 14 tags de
`MAPA_TAGS_FICHA_PDF` que ainda não têm `{{TAG}}` correspondente no Template (achado real: a
contagem correta é 34 tags, não 32 como no pedido original; 20 já estão inseridas, não 19).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — `gerarFichaPDF`/`gerarPdfFichaClick` (spec 022/023) já
existem e cobrem 100% do fluxo de geração/abertura de PDF necessário para o novo comportamento do
botão "Imprimir"; a rota de impressão `/print/*` API (via toolkit já conectado nesta sessão) para editar o Template.

**Storage**: Nenhuma mudança de schema (FR-008) — o template da rota `/print/ficha-instrutor` é um artefato externo
ao repositório e ao banco de dados (PostgreSQL), editado diretamente via API, fora do escopo de
`instrutores`/`config_parametros`.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mudanças de correção de bug/UX e completude de documento, sem impacto
de performance.

**Constraints**: Zero alteração de schema (FR-008); a correção `display`/`revert`/`block` do
`@media print` compartilhado (`app/globals.css`, spec 023) MUST permanecer intocada — continua sendo
o mecanismo de impressão do DSA (FR-005); nenhuma mudança de código é necessária em
`gerarFichaPDF`/`MAPA_TAGS_FICHA_PDF` para a completude de tags (FR-007) — a lógica de mesclagem já
cobre as 34 chaves automaticamente.

**Scale/Scope**: 1 arquivo de código tocado (`app/(app)/instrutores/page.tsx`) + 1 artefato externo (Template
do a rota de impressão `/print/*`, 14 tags novas), nenhum arquivo novo, nenhum `.ts` tocado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — pedido direto de Bernardo corrigindo bugs reais remanescentes da spec 023 (mesmo módulo, RF-INSTR-10/15 continuam a origem formal da Ficha). |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN de negócio tocada, são bugs de apresentação/UX e completude de documento, não de regra. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova; reaproveita `gerarFichaPDF`/a rota de impressão `/print/*` API já em uso desde a spec 022. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita em dado de domínio; edição do Template exige backup prévio (FR-006, mesmo padrão das specs 022/023). |
| V. Degradação Segura | PASSA — tag inserida sem dado cadastrado sai vazia no PDF (comportamento nativo de `Body.replaceText`, já usado pelas 20 tags existentes), nunca lança exceção; falha de rede em "Imprimir" usa o mesmo `.catch(alert)` já existente. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 3 User Stories independentes; a correção do fluxo de impressão (US2) resolve a causa raiz de uma categoria inteira de bug em vez de mais um ajuste fino de CSS (decisão explícita do responsável, documentada no pedido original). |
| VII. Configuração Sobre Constante | PASSA — nenhum limite normativo ou dado anual do PROENS envolvido; texto institucional do cabeçalho é conteúdo de UI, não configuração administrável (mesmo raciocínio aceito para o nome da pasta do Supabase Storage na spec 023). |
| VIII. Rastreabilidade | PASSA — FRs citam achado real (arquivo:linha) por serem bugs de UI/documento sem RF/RN formal específico, mesmo padrão aceito em todo hotfix desta sessão. |
| IX. Contenção de Escopo | PASSA — correção de bugs em funcionalidade já existente (specs 022/023), não processo novo. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/024-hotfix-impressao-pdf-ficha/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── frontend-functions.md
│   └── template-tags.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── frontend/
    └── `app/(app)/instrutores/page.tsx`   # titulo do modal (linha 1285); cabecalho fixo (linhas 1282-1283);
                                # botoes do modal-footer (linhas 49-50)

template da rota `/print/ficha-instrutor` (externo, fora do repositorio)
└── 1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg   # 14 tags novas, backup previo

appsscript/                    # staging do o fluxo Git → Vercel

tests/
└── *.test.ts                  # suite de invariantes estruturais (sem caso novo nesta spec - as
                                # 4 mudancas de codigo sao DOM/JS sem harness de mock, e a
                                # completude de tags do Template nao e testavel por pnpm vitest run)
```

**Structure Decision**: Mesma estrutura de todo o projeto. Nenhum diretório/arquivo novo — o único
arquivo de código tocado já existe e já é responsável por essa mesma funcionalidade. Nenhum `.ts` é
tocado (FR-007 confirma que a lógica de mesclagem já cobre as 34 tags automaticamente).

## Complexity Tracking

*Sem violações — seção não aplicável.*

## Phase 0 — Não há data-model.md

Sem entidade de dado nova ou alterada (FR-008) — `data-model.md` omitido, mesmo padrão das specs
020/021/023.
