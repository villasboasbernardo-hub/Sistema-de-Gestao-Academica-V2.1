# Implementation Plan: Épico A — Design System Unificado

**Branch**: `007-design-system-unificado` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-design-system-unificado/spec.md`

## Summary

Construir o objeto `UI` único (cores semânticas, tipografia, espaçamento) como CSS Custom
Properties em `app/globals.css` + um pequeno objeto JS espelho em `components/ciaara/`, migrar os 5 valores
de `badge-categoria` hoje hardcoded para referenciar essas variáveis (sem mudar nenhuma cor real),
implementar os dois temas redesenhados com detecção automática de `prefers-color-scheme` no
primeiro carregamento e toggle manual persistente (RF-DS-03/03.1, Clarifications 2026-08-15),
extrair 3 componentes reutilizáveis reais (card de KPI, formatação de nome de instrutor, estilo de
grade semanal já usado por `app/(app)/cronograma/page.tsx`), e aplicar a identidade institucional na navbar
com um slot de imagem que degrada para texto quando o asset do brasão ainda não existir (achado
real: nenhum arquivo de imagem do brasão existe hoje no repositório).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Tailwind CSS + shadcn/ui (já em uso) + lucide-react (já em uso). Nenhuma
biblioteca nova — `Rawline` (fonte) via `@font-face`/ Fonts CDN (única adição de rede);
Recharts explicitamente fora de escopo (spec, Assumptions).

**Storage**: Nenhuma — este épico não lê nem escreve nenhuma aba do PostgreSQL. A única
"persistência" é `localStorage` do navegador, para a escolha manual de tema (RF-DS-03/FR-005).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Nenhum novo — troca de tema deve ser instantânea (só troca de atributo
`data-theme` + CSS, sem recálculo de layout custoso); nenhum "flash" de tema errado perceptível no
carregamento (SC-003), o que exige que a detecção/aplicação do tema rode **antes do primeiro paint
visível**, não depois que `components/ciaara/` (incluído no fim do `<body>`) carregar.

**Constraints**: RF-DS-04 — nenhuma tela nova pode precisar de CSS específico de página; toda
migração de tela existente preserva comportamento (constitution, Princípio VI); gotcha crítico de
Next.js não se aplica (nenhum arquivo `.ts` tocado).

**Scale/Scope**: `app/globals.css` expandido (CSS Custom Properties + 2 temas + `Rawline` + 3
componentes novos); `components/ciaara/` expandido (objeto `UI` JS, `formatarNomeInstrutor_`,
`alternarTema`/detecção `prefers-color-scheme`); `app/layout.tsx` ganha script inline de aplicação de
tema (anti-flash), botão de toggle, slot de identidade institucional; `app/(app)/instrutores/page.tsx`
migrado para usar `formatarNomeInstrutor_` (única view que hoje exibe nome de instrutor cru);
`app/(app)/cronograma/page.tsx` tem sua estilização de grade semanal extraída para a classe reutilizável.
Nenhum arquivo de backend tocado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS — todo FR cita RF-DS-0x/RF-INI-05/RF-INSTR-15; `03-design-system.md` (Fase 2) é a fonte de decisão visual detalhada, ele próprio ancorado nesses RF-. |
| II. Preservação de Regras de Negócio | N/A — nenhuma RN- de negócio é tocada; é um épico de apresentação pura. |
| III. Restrição de Plataforma | PASS — só Tailwind CSS + shadcn/ui/lucide-react/CSS Custom Properties nativas, nenhum framework/bundler novo. `Rawline` como dependência versionada no `package.json` de fonte, não um pacote npm. |
| IV. Integridade do Histórico | N/A — nenhuma escrita de dado. |
| V. Degradação Segura | PASS — slot de brasão degrada para texto quando o asset não existir (RN-DEG-01, achado real desta spec); `Rawline` cai para `system-ui` se a fonte falhar (FR-003, spec Edge Cases). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS — cada User Story é um commit próprio; migração de tela existente (badges, `app/(app)/instrutores/page.tsx`, `ViewCronograma`) verificada por inspeção visual + suíte onde há saída testável (`formatarNomeInstrutor_`). |
| VII. Configuração Sobre Constante | N/A — nenhum limite normativo neste épico. |
| VIII. Rastreabilidade | PASS — tasks vão citar RF-DS-0x/RF-INI-05/RF-INSTR-15. |
| IX. Contenção de Escopo | PASS — Painel Início/Diário de Classe/estatísticas interativas explicitamente fora (spec, Nota de escopo item 2), quadro de avisos de qualidade fora (item 4). |

Nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/007-design-system-unificado/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/
│   └── ui-component-contract.md   # Phase 1 output — CSS Custom Properties, objeto UI, componentes
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — ainda não gerado)
```

Sem `data-model.md`: este épico não introduz, lê nem altera nenhuma entidade de dados — é
apresentação pura (frontend). O que substituiria um "modelo de dados" aqui (nomes de variável CSS,
formato do objeto `UI`, assinatura dos componentes) fica em `contracts/ui-component-contract.md`.

### Source Code (repository root)

```text
app/
├── `app/globals.css`          # EXPANDIDO — CSS Custom Properties (paleta única), 2 temas
│                           #   (`[data-theme="claro"]`/`[data-theme="escuro"]`), fonte Rawline,
│                           #   3 componentes novos (.card-kpi, .grade-semanal, badges migrados
│                           #   para var(--cor-*) sem mudar nenhuma cor real)
├── `components/ciaara/`             # EXPANDIDO — objeto UI (JS, espelha as CSS vars), formatarNomeInstrutor_,
│                           #   alternarTema()/aplicarTemaInicial() (prefers-color-scheme + localStorage)
├── `app/layout.tsx`              # + script inline anti-flash (roda antes do body renderizar),
│                           #   botão de toggle de tema, slot de identidade institucional (brasão)
├── `app/(app)/instrutores/page.tsx`    # Migrado para formatarNomeInstrutor_ (RF-INSTR-15) — única view que
│                           #   hoje exibe Nome_Guerra cru
└── `app/(app)/cronograma/page.tsx`     # Estilo de grade semanal extraído para .grade-semanal (sem mudar
                            #   comportamento — Épico G intocado funcionalmente)

tests/
└── design_system.test.ts  # NOVO — testa formatarNomeInstrutor_ (única função pura deste épico)
```

**Structure Decision**: Nenhum arquivo novo além do teste — o objeto `UI` e os componentes vivem
nos dois arquivos que já são o "núcleo compartilhado" do frontend desde o Épico E
(`app/globals.css`/`components/ciaara/`), consistente com como `perfilEm_` (Épico F) e o roteador mínimo já
foram adicionados lá. Nenhum arquivo de backend é tocado — confirmado que este é o primeiro épico
puramente de frontend da sessão.

## Complexity Tracking

*Sem violações — seção não aplicável.*
