# Implementation Plan: Épico B — Modularização do Frontend e do Backend

**Branch**: `005-modularizacao-frontend-backend` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-modularizacao-frontend-backend/spec.md`

## Summary

Extrair as duas telas que ainda misturam assuntos diferentes (`app/(app)/cursos/[curso]/page.tsx`,
`app/(app)/atividades/page.tsx`) em dois arquivos de view novos e dedicados — `app/(app)/avaliacoes/page.tsx`
(agendamento + painel de situação de execução + registro de vista de prova, hoje espalhados entre
as duas telas, Clarifications 2026-08-15) e `app/(app)/relatorio/page.tsx` (bloco de totalizadores, hoje só
em `app/(app)/cursos/[curso]/page.tsx`) — sem alterar nenhuma função de backend (todas já vivem em `lib/acoes/avaliacoes.ts`,
`lib/dominio/regras-normativas.ts` e `lib/acoes/relatorio.ts`, nenhuma precisa mover nem mudar assinatura), reconciliar
`docs/arquitetura/02-modularizacao.md` com os 13 arquivos `.ts`/9 arquivos `.html` reais do
projeto, e confirmar que a detecção de implantação parcial (`o SHA do commit`) continua correta com o
número atual de arquivos. Abordagem técnica: recorte e realocação de blocos HTML/`<script>` já
existentes, seguindo o padrão de acoplamento fraco já estabelecido no próprio código
(`if (typeof fn === 'function') fn(...)`, ``app/(app)/cursos/[curso]/page.tsx`:127`) em vez de introduzir um mecanismo
novo — nenhuma linha de comportamento muda, só o arquivo onde ela mora.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. `o App Router`/a importação de componentes nativo do Next.js (já em uso
desde o Épico E) é o único mecanismo de modularização de frontend; backend usa múltiplos arquivos
`.ts` compartilhando o escopo global (já em uso, 13 arquivos).

**Storage**: N/A — este épico não cria, move nem altera nenhuma aba/coluna do PostgreSQL (FR-003;
nenhuma Key Entity de dados no spec, só unidades organizacionais de código).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — nenhuma mudança de comportamento observável (FR-003), logo nenhum alvo
de performance novo. `o SHA do commit` continua sendo checado uma vez por carregamento de página, como
hoje.

**Constraints**: Zero mudança de comportamento observável (FR-003, RF-MOD-03); nenhum nome de
função de backend muda (RF-MOD-02); gotcha crítico da plataforma — a fronteira Server/Client Component e o isolamento da chave `service_role`
`.html` (scripts client-side de partials incluídos compartilham o mesmo escopo global do
navegador, sem ordem de avaliação de topo relevante para chamadas disparadas por evento) mas
**se aplica** integralmente a qualquer arquivo `.ts` tocado — none previsto aqui, já que backend
não muda.

**Scale/Scope**: 2 arquivos de frontend novos (`app/(app)/avaliacoes/page.tsx`, `app/(app)/relatorio/page.tsx`); 2
arquivos de frontend reduzidos (`app/(app)/cursos/[curso]/page.tsx` 244→~120 linhas, `app/(app)/atividades/page.tsx`
179→~110 linhas); `app/layout.tsx` ganha 1 item de menu (`#tabavaliacoes`) e 2 a importação de componentes novos;
`docs/arquitetura/02-modularizacao.md` reescrito (tabela de arquivos reconciliada); 0 arquivos de
backend tocados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS — todo FR cita RF-MOD-01..04 (doc 02) ou a decisão de 2026-08-10 sobre CAHO 2026 (constitution). Nenhum requisito inventado. |
| II. Preservação de Regras de Negócio | PASS — nenhuma regra `RN-` é tocada; nenhuma função de backend muda de arquivo, nome ou corpo. Verificado por FR-007/SC-003 (suíte de invariantes, zero regressão esperada). |
| III. Restrição de Plataforma | PASS — só a importação de componentes/`o App Router` nativo, nenhum framework/bundler/CI novo. Deploy via `o fluxo Git → Vercel` (padrão já vigente). |
| IV. Integridade do Histórico | N/A — nenhuma migração de dados, `migracao_log` intocado. |
| V. Degradação Segura | PASS — o padrão `typeof fn === 'function'` já usado em ``app/(app)/cursos/[curso]/page.tsx`:127` (degrada silenciosamente se a função de outra view não existir) é reaproveitado, não substituído por um mecanismo que poderia lançar exceção não tratada. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS — cada extração (Avaliações, depois Relatório) é um commit próprio, verificada pela suíte antes/depois (FR-007). Não regressão por CAHO 2026 explicitamente rejeitada (spec, Nota de escopo item 3). |
| VII. Configuração Sobre Constante | N/A — nenhum limite normativo novo introduzido. |
| VIII. Rastreabilidade | PASS — tasks vão citar RF-MOD-01..04 e os FR-00x desta spec. |
| IX. Contenção de Escopo | PASS — spec já delimita explicitamente o que fica de fora (telas sem conteúdo implementado, Assumptions). |

Nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/005-modularizacao-frontend-backend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/
│   └── frontend-view-contract.md   # Phase 1 output — limites de arquivo e pontos de integração
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — ainda não gerado)
```

Sem `data-model.md`: este épico não introduz, move nem altera nenhuma entidade de dados (aba/coluna
do PostgreSQL) — as "Key Entities" do spec (Arquivo de view, Arquivo de domínio backend, Mapa de
arquitetura) são unidades organizacionais de código, documentadas em `contracts/` e no próprio
`docs/arquitetura/02-modularizacao.md` reconciliado, não num modelo de dados.

### Source Code (repository root)

```text
lib/acoes/                       # Inalterado — nenhum arquivo tocado neste épico
├── `lib/acoes/avaliacoes.ts`                  # registrarAvaliacao, registrarVistaProva,
│                                   #   getPainelavaliacoesCurso, cancelarAvaliacao (já aqui)
├── `lib/dominio/regras-normativas.ts`            # calcularTetosDoCurso, acompanhamentoEstudoIndividualDaTurma (já aqui)
└── `lib/acoes/relatorio.ts`                   # getRelatorio (já aqui)

app/
├── `app/layout.tsx`                     # + item de menu #tabavaliacoes, + 2 a importação de componentes novos
├── `app/(app)/cursos/[curso]/page.tsx`                 # REDUZIDO: seletor de curso + tetos + Estudo Individual só
├── `app/(app)/atividades/page.tsx`     # REDUZIDO: só AEC/TAD/TR/Estudo Individual (FR-001a)
├── `app/(app)/avaliacoes/page.tsx`            # NOVO: agendar + painel + vista de prova (FR-001)
├── `app/(app)/relatorio/page.tsx`             # NOVO: totalizadores por curso (FR-002)
└── `components/ciaara/`                    # Inalterado — perfilEm_, a Server Action, AppState já servem as views novas

docs/arquitetura/
└── 02-modularizacao.md            # Reescrito: tabela de arquivos reconciliada (FR-004/FR-005)

tests/                             # Inalterado em conteúdo — roda antes/depois de cada extração
```

**Structure Decision**: Reorganização in-place dentro de `app/` (estrutura já estabelecida
desde o Épico E) — nenhum diretório novo, nenhuma mudança de build/deploy. `lib/acoes/` não é
tocado: os três arquivos que já hospedam as funções relevantes (`lib/acoes/avaliacoes.ts`,
`lib/dominio/regras-normativas.ts`, `lib/acoes/relatorio.ts`) continuam servindo as views novas sem nenhuma mudança, porque
RF-MOD-02 já foi cumprido organicamente pelos Épicos E/I/F (spec, Nota de escopo).

## Complexity Tracking

*Sem violações — seção não aplicável.*
