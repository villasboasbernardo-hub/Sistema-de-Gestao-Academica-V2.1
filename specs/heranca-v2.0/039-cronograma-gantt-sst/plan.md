# Implementation Plan: Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

**Branch**: `039-cronograma-gantt-sst` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-cronograma-gantt-sst/spec.md`

## Summary

Substitui a tela do Módulo de Cronograma (dropdown "Visão", grade previsto×executado, CSV,
impressão) por um Gráfico de Gantt (Recharts `rangeBar`), 1 sub-Gantt por Turma para o ano
vigente (fonte: `getDisciplinasAnoVigente`, já existente, zero mudança de backend) e 1 Gantt único
por Curso para ano futuro (fonte: nova função `getGanttPrevisaoAnoFuturo_`, que reaproveita o mesmo
filtro `Status_Previa==='Salvo'`+`Tipo_Linha==='Disciplina'` já usado por
`montarCronogramaDePlanejamentoAnual_`, mas agrega direto para início/término por `ID_Grade` em vez
de buckets semanais). Unifica o rótulo de Turma com `rotuloTurma_` (duplicada de
`app/(app)/disciplinas/page.tsx`) e adiciona os mesmos 3 filtros avançados da spec 037 (duplicados,
gotcha de escopo entre `.html`). CSV e impressão passam a operar sobre as barras do Gantt em vez da
tabela antiga (impressão reaproveita o componente `.area-impressao` já existente, RF-DSA-06).
`getCronograma`/`distribuicaoSemanalMateria_`/`montarCronogramaDePlanejamentoAnual_` não são
modificadas (risco de regressão em RN-2027-05/RN-DIST-03, Épico G) — só deixam de ser chamadas pela
tela removida.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — Recharts (`app/globals.css`, CDN já carregado) ganha 1 novo
helper de renderização (`renderizarGanttRangeBar_`, `components/ciaara/`) para o tipo `rangeBar`, aditivo
ao `renderizarGrafico_` já existente (não modificado — usado por 4 painéis de estatística, mudar
sua assinatura arriscaria regressão neles).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — leitura de `turma_disciplina`/`disciplinas`/`turmas`/
`instrutores`/`registros_aula` (via `getDisciplinasAnoVigente`, já existente) e de
`planejamento_anual` (via nova `getGanttPrevisaoAnoFuturo_`) — nenhuma coluna nova, nenhuma
escrita nova.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: SC-003 — mudança em qualquer um dos 3 filtros redesenha o(s) Gantt(s) em
menos de 1s, sem nenhuma chamada a Server Action nova (mesmo padrão client-side já usado pelos
filtros da spec 037).

**Constraints**: Nenhuma segunda biblioteca de gráficos; `getCronograma`/
`distribuicaoSemanalMateria_`/`montarCronogramaDePlanejamentoAnual_` não modificadas; funções puras
compartilhadas com `app/(app)/disciplinas/page.tsx`/`components/ciaara/` duplicadas em `app/(app)/cronograma/page.tsx` (gotcha
de escopo entre `.html`, `components/ciaara/`/`app/globals.css` continuam sendo os únicos includes
verdadeiramente compartilhados); impressão reaproveita `.area-impressao` (RF-DSA-06), nenhum CSS
novo de impressão.

**Scale/Scope**: 1 arquivo de frontend reescrito quase por completo (`app/(app)/cronograma/page.tsx` — grade
antiga sai, Gantt entra), 1 função nova em `components/ciaara/` (`renderizarGanttRangeBar_`), 1 função nova
em `lib/acoes/cronograma.ts` (`getGanttPrevisaoAnoFuturo_`) — o maior épico de UI desde a spec 037.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — épico do backlog do documento 06 (Épico G, RF-CRONOS-\*/RF-2027-\*); a única ambiguidade genuína encontrada durante este `/speckit-plan` (filtros Status da Turma/Instrutor sem dado real em `planejamento_anual` para ano futuro) foi levada a Bernardo antes de assumida, nunca inferida silenciosamente (ver pergunta respondida nesta sessão, integrada a spec.md Assumptions/US5 AS4). |
| II. Preservação de Regras de Negócio | PASSA — nenhuma regra `RN-` alterada; `distribuicaoSemanalMateria_`/`getCronograma`/`montarCronogramaDePlanejamentoAnual_` (RN-2027-05/RN-DIST-03) permanecem intocadas, só deixam de ser chamadas pela tela removida. O motor preditivo em si (`gerarPlanejamento`/`editarLinhaPlanejamento`/`lancarEventoManualPlanejamento`/`salvarPlanejamento`) não é tocado (FR-013). |
| III. Restrição de Plataforma | PASSA — nenhuma biblioteca nova; `renderizarGanttRangeBar_` é Recharts puro, mesmo CDN já carregado. |
| IV. Integridade do Histórico | PASSA — nenhuma escrita nova de dado, só leitura. |
| V. Degradação Segura | PASSA — disciplina sem datas completas fica fora do Gantt sem quebrar as demais (FR-004); ano futuro sem prévia `Salvo` degrada com aviso explícito (FR-012); filtros sem dado real (Status da Turma/Instrutor no ano futuro) degradam para "sem opções", nunca exceção (RN-DEG-01, decisão desta sessão). |
| VI. Mudança Cirúrgica | PASSA — cada função nova (`getGanttPrevisaoAnoFuturo_`, `renderizarGanttRangeBar_`) é isolada e testável isoladamente; funções já existentes (`getCronograma` etc.) não são tocadas, só deixam de ser chamadas. |
| VII. Configuração sobre Constante | N/A — nenhum limite normativo/dado anual novo envolvido; a granularidade de `planejamento_anual` (semana) já é o dado existente, não uma constante nova no código. |
| VIII. Rastreabilidade | PASSA — FRs citam `/speckit-clarify` e as funções de origem por nome; `tasks.md` (fase seguinte) cita cada FR por tarefa. |
| IX. Contenção de Escopo | PASSA — épico já no backlog (documento 06); a extensão de escopo por `/speckit-clarify` (Q2/Q3 — grade totalmente substituída, Gantt cobre ano futuro) veio de decisão explícita de Bernardo, não de expansão silenciosa. |

Nenhuma violação — Complexity Tracking fica vazio.

### Re-checagem pós-design (Phase 1 concluída)

`data-model.md`/`contracts/backend-functions.md` confirmam que `getGanttPrevisaoAnoFuturo_` é uma
função de leitura pura (sem escrita), com a mesma assinatura de filtro (`ID_Curso`+`Ano_Letivo`+
`Status_Previa==='Salvo'`) já usada por `montarCronogramaDePlanejamentoAnual_` — nenhum ponto novo
surgiu que mude a avaliação acima. Gate mantido: PASSA.

## Project Structure

### Documentation (this feature)

```text
specs/039-cronograma-gantt-sst/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── backend-functions.md
└── tasks.md              # Phase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
lib/acoes/
└── `lib/acoes/cronograma.ts`         # ESTENDIDO (aditivo) — nova getGanttPrevisaoAnoFuturo_(idCurso, ano);
                           # getCronograma/distribuicaoSemanalMateria_/
                           # montarCronogramaDePlanejamentoAnual_ intocadas

app/
├── `components/ciaara/`            # ESTENDIDO (aditivo) — nova renderizarGanttRangeBar_(elementoId,
                           # categorias, series); renderizarGrafico_ intocada
└── `app/(app)/cronograma/page.tsx`    # REESCRITO — dropdown "Visão"/grade/CSV antigos saem; Gantt por Turma
                           # (ano vigente) ou por Curso (ano futuro), 3 filtros avançados
                           # duplicados, CSV/impressão novos

tests/
├── regras_cronograma.test.ts  # getGanttPrevisaoAnoFuturo_ (agregação, degradação sem versão Salvo)
└── regras_ui_dados.test.ts    # rotuloTurma_/filtros duplicados, montagem de série do Gantt,
                                # linha de CSV (sandboxCronograma_ novo)
```

**Structure Decision**: Reaproveita a estrutura já existente (`lib/acoes/*.ts` e `lib/dominio/*.ts` + `app/
*.html` + `tests/unidade/*.test.ts`) — nenhum diretório novo. `components/ciaara/`/`lib/acoes/cronograma.ts` recebem funções
aditivas (nunca modificam assinatura de função já existente); `app/(app)/cronograma/page.tsx` é o único
arquivo reescrito de fato, por ser o alvo direto da substituição de tela (FR-008).

## Complexity Tracking

*(vazio — nenhuma violação de Constitution Check)*
