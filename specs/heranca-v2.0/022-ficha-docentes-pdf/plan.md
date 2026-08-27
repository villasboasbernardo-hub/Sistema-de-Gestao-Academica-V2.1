# Implementation Plan: Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

**Branch**: `022-ficha-docentes-pdf` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/022-ficha-docentes-pdf/spec.md`

## Summary

Amplia a Ficha de Cadastro de Instrutores já existente (spec 016) em 3 frentes independentes, todas
grounded nos Achados reais do spec.md: (1) 12 colunas genuinamente novas em `instrutores`
(documentos de identificação, endereço, RETELMA, área de conhecimento), aditivas, sem tocar nenhuma
coluna existente; (2) reorganização visual do formulário de 4 cards empilhados para 3 abas Tailwind CSS
Nav-Tabs, via uma chave `aba` nova em `BLOCOS_EDICAO_INSTRUTOR` — os demais consumidores da mesma
taxonomia (`coletarValoresFormularioInstrutor_`, `renderizarModalFichaInstrutor_`,
`disciplinasHabilitadasHtmlInstrutor_`) continuam iterando a lista completa sem nenhuma mudança,
porque nenhum deles depende de agrupamento visual; validação dos 4 campos essenciais (client + server,
defesa em profundidade); (3) `gerarFichaPDF(idInstrutor)` — primeiro uso de `a rota de impressão `/print/*``/`o Supabase Storage`
no projeto — copia o Template já existente (ID fornecido por Bernardo, gravado em
`config_parametros` por Princípio VII), mescla via substituição de tags, exporta PDF, limpa o
documento temporário, devolve URL ao cliente, tudo dentro do wrapper genérico a Server Action já usado por
toda chamada do sistema (sem timeout dedicado, Clarifications 2026-08-19).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Tailwind CSS + shadcn/ui (já em uso) para `.nav-tabs`/`.tab-pane`. `a rota de impressão `/print/*``
e `o Supabase Storage` (recursos nativos do Next.js e do Supabase, sem SDK/dependência externa) — primeiro uso no
projeto, mas nenhuma dependência nova é adicionada (serviços built-in do runtime, mesma categoria de
o cliente Supabase/`o runtime do Next.js` já usados).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — 12 colunas novas em `instrutores` (aditivas) + 1 linha nova em
`config_parametros` (ID do Template). a rota de impressão `/print/*` — 1 Template já existente
(`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`, editável para atender ao contrato de tags) + cópias
temporárias criadas e apagadas a cada geração de PDF.  Supabase Storage — destino do PDF exportado
(mesma pasta do Template, por padrão do `o Supabase Storage`, a menos que uma pasta específica seja decidida
no research).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Geração de PDF de um único instrutor MUST caber no limite de 30s já
compartilhado pela Server Action (Clarifications 2026-08-19, FR-012) — sem meta de throughput/concorrência,
é uma operação sob demanda de um usuário por vez.

**Constraints**: Zero remoção/renomeação de coluna existente (FR-002); ID do Template em
`config_parametros`, nunca constante literal (FR-008, Princípio VII); geração de PDF sem timeout
dedicado (FR-012); implantação via `o fluxo Git → Vercel` (Princípio III).

**Scale/Scope**: ~177 instrutores — sem impacto de escala; PDF gerado 1 instrutor por vez, sob ação
explícita do usuário, nunca em lote.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — origem é pedido direto de Bernardo (mesmo padrão das specs 009-022); a ampliação de campos e a geração de PDF estendem RF-INSTR-10 ("o sistema deve gerar uma ficha individual do instrutor, imprimível") sem contradizer nenhum RF/RN existente — RF-INSTR-10 já previa Ficha imprimível, esta spec só troca "impressão do navegador" por "PDF real gerado pelo servidor" como opção adicional. |
| II. Preservação de Regras de Negócio | PASSA — nenhuma RN de negócio muda; RN-INST-01/02 (habilitação/desativação) continuam intocadas, os 12 campos novos não participam de nenhuma regra normativa existente. |
| III. Restrição de Plataforma | PASSA — `a rota de impressão `/print/*``/`o Supabase Storage` são serviços nativos do runtime Next.js já usado (não é dependência/framework/bundler novo); Tailwind CSS + shadcn/ui Nav-Tabs é componente nativo do mesmo Tailwind CSS já em uso (mesmo raciocínio de `data-bs-theme`/Offcanvas em épicos anteriores); implantação via `o fluxo Git → Vercel` inalterada. |
| IV. Integridade do Histórico | PASSA — FR-001/FR-002 são estritamente aditivos (novas colunas, nenhuma remoção/reescrita); migração segue o padrão já estabelecido (script versionado, `migracao_log`, nunca apaga histórico). O documento Docs temporário criado por `gerarFichaPDF` não é um registro de negócio (é um artefato técnico intermediário) — apagá-lo após uso não viola o princípio, que trata de dados do domínio, não de arquivos de trabalho descartáveis. |
| V. Degradação Segura | PASSA — FR-009 (tag sem correspondência degrada para vazio/ignorada, nunca exceção); campos novos vazios em instrutor legado não geram erro (Edge Cases do spec.md). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — 3 User Stories independentes; a reestruturação em abas usa uma chave nova (`aba`) sem tocar a lógica dos 4 outros consumidores de `BLOCOS_EDICAO_INSTRUTOR` (research.md §1), minimizando a superfície de mudança. |
| VII. Configuração Sobre Constante | PASSA — é o próprio objeto desta spec: FR-008 move o ID do Template para `config_parametros`, corrigindo a sugestão original do pedido (Achados reais do spec.md). |
| VIII. Rastreabilidade | PASSA — FR-007/FR-010 citam RF-INSTR-10 (Ficha imprimível) como origem formal; os demais FRs citam o achado real (arquivo:linha) por não haver RF/RN formal cobrindo os 12 campos cadastrais específicos ou o layout em abas — mesmo padrão aceito em toda spec de hotfix/polimento desta sessão. |
| IX. Contenção de Escopo | PASSA — módulo de Instrutores já é processo da CIAARA-11 (RF-INSTR-*); ampliação de um formulário já existente, não processo novo. |

Nenhuma violação — Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/022-ficha-docentes-pdf/
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
│   └── `lib/acoes/instrutores.ts`         # validacao dos 4 campos obrigatorios (cadastrarInstrutor/
│                               # atualizarInstrutor); gerarFichaPDF (NOVA); helper de leitura de
│                               # config_parametros (reaproveita lerConfigParametros_,
│                               # `lib/dominio/regras-normativas.ts`, ja existente)
└── frontend/
    └── `app/(app)/instrutores/page.tsx`   # BLOCOS_EDICAO_INSTRUTOR ganha chave `aba`; 12 campos novos;
                                # renderizarPainelEdicaoInstrutor_ reescrita para Nav-Tabs;
                                # validacao client-side + troca automatica de aba; botao "Gerar PDF"
                                # no modal da Ficha, ao lado de "Imprimir"

migracao/                      # script novo, aditivo: 12 colunas em instrutores + 1 linha em
                                # config_parametros (ID do Template)

appsscript/                    # staging do o fluxo Git → Vercel (push.sh copia de src/ para ca antes do deploy)

tests/
└── *.test.ts                  # suite de invariantes estruturais (pnpm vitest run)
```

**Structure Decision**: Mesma estrutura de todo o projeto — projeto único Next.js. Nenhum
diretório novo além de `migracao/` (já existente, só ganha um script novo). Nenhum arquivo de
frontend/backend novo é criado — todo o trabalho é dentro dos 2 arquivos já responsáveis pelo
módulo de Instrutores.

## Complexity Tracking

*Sem violações — seção não aplicável.*
