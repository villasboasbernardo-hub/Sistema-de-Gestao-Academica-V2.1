# Implementation Plan: Hotfix — Roteamento SPA, Fonte Rawline e Performance do DSA

**Branch**: `017-hotfix-roteamento-fonte-dsa` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-hotfix-roteamento-fonte-dsa/spec.md`

## Summary

Três defeitos reais, cada um com causa raiz confirmada por leitura de código (spec.md, "Achados
reais") — nenhum coincide exatamente com o diagnóstico original do pedido, mas o resultado
observável pedido (SC-001..005) é alcançável nos 3 casos:

1. **Roteamento**: `app/layout.tsx` sempre roteia para `'tabInicio'` no boot quando não há `#hash` —
   inclusive quando há um deep-link por query param (`?editarInstrutor=ID`/`?novoInstrutor=1`),
   escondendo `[data-view="tabInstrutores"]` mesmo com o formulário já renderizado dentro dele.
   Corrigido roteando para `'tabInstrutores'` no boot quando um dos 2 parâmetros está presente, e
   trocando `window.open()` (clique nos botões) por navegação interna (`irPara`, já usada com
   sucesso por 8 outras abas, nunca muta `window.location.hash`) — elimina a nova aba sem
   reintroduzir o risco de mutação de hash que motivou "nova aba" no Épico E.
2. **Fonte**: troca direta de URL de CDN em `app/globals.css`.
3. **Performance do DSA**: `getDsaSemanal` chama `detectarConflitosDsa_` 5× (uma por dia da semana),
   e cada chamada relê do zero `registros_aula` (1.566 linhas reais),
   `avaliacoes` (188) e `atividades_nao_letivas` (664) **para cada uma das 29 turmas ativas do
   sistema** — até ~435 leituras completas redundantes por requisição. Corrigido lendo as 4 abas
   envolvidas (`turmas`, `registros_aula`, `avaliacoes`,
   `atividades_nao_letivas`) uma única vez por requisição e passando os dados já carregados para
   `detectarConflitosDsa_`/`blocosBrutosDoDia_`, que passam a filtrar em memória em vez de reler.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Tailwind CSS + shadcn/ui (já em uso) permanece; a troca de fonte é
uma troca de URL de CDN dentro da mesma categoria de recurso já usada (CSS de fonte via `<link>`),
não uma dependência nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — hotfix comportamental/performance, zero
migração)

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: `getDsaSemanal` responde em menos de 3 segundos para qualquer turma/semana do
sistema (SC-003), incluindo cursos com múltiplas turmas ativas simultâneas — reduzindo de até ~435
leituras completas de planilha por requisição (5 dias × 29 turmas × 3 abas) para exatamente 4 (uma
por aba envolvida).

**Constraints**: Zero mudança de dado/comportamento observável no resultado do DSA (FR-007/FR-008 —
mesmos blocos, conflitos, horários e avisos de hoje, só mais rápido); nenhuma nova dependência
(Princípio III); nunca mutar `window.location.hash` dentro do página do Next.js (risco
documentado desde o Épico E, reafirmado por FR-002); chamada direta da Server Action já impõe um timeout de 30s no
cliente — a resposta do servidor precisa ficar folgadamente abaixo disso, não só abaixo do SC-003 de
3s.

**Scale/Scope**: 3 arquivos tocados por 3 defeitos independentes (`app/layout.tsx`,
`app/`app/(app)/instrutores/page.tsx``, `app/globals.css`, `lib/acoes/dsa.ts`) — dados
reais confirmados na cópia local de trabalho: 29 turmas ativas em `turmas`, 1.566 linhas em
`registros_aula`, 188 em `avaliacoes`, 664 em `atividades_nao_letivas`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | N/A direto — hotfix técnico (roteamento/CDN/performance), não implementa nenhum RF-/RN- novo. RN-CONF-01 (Risco Alto, conflito cross-turma) é a única regra de negócio tocada indiretamente pela refatoração de performance — preservada integralmente por FR-007/FR-008, verificada pela suíte já existente (`tests/unidade/regras_dsa.test.ts`). **PASSA**. |
| II. Preservação de Regras de Negócio | Núcleo do hotfix da User Story 2: FR-007 exige resultado byte-a-byte idêntico ao de antes da otimização. Verificação: suíte de testes existente roda inalterada antes/depois (mesmas asserções, mesmos casos) — se qualquer resultado mudasse, os testes já existentes quebrariam. **PASSA**. |
| III. Restrição de Plataforma | Continua 100% Next.js/React + Tailwind CSS como dependência versionada no `package.json`. A troca de CDN da fonte é uma troca de URL dentro da mesma categoria de recurso (CSS de fonte), não uma dependência nova. Nenhum framework, bundler ou biblioteca nova. **PASSA**. |
| IV. Integridade do Histórico | N/A — nenhuma migração/alteração de dado envolvida. |
| V. Degradação Segura | A refatoração de `detectarConflitosDsa_`/`blocosBrutosDoDia_` preserva os avisos de degradação já existentes (ex.: "Curso sem catálogo de horários vigente"); nenhum novo caminho de exceção não tratada introduzido. **PASSA**. |
| VI. Mudança Cirúrgica | 3 defeitos, 3 unidades de mudança independentes e testáveis isoladamente (routing / fonte / performance) — nenhuma depende de outra para funcionar ou ser verificada. **PASSA**. |
| VII. Configuração sobre Constante | N/A — nenhum limite normativo/dado anual novo introduzido. |
| VIII. Rastreabilidade | RN-CONF-01 (Risco Alto) já tem teste nomeado em `tests/unidade/regras_dsa.test.ts` — preservado, não removido nem enfraquecido pela refatoração. **PASSA**. |
| IX. Contenção de Escopo | Escopo estritamente limitado aos 3 defeitos relatados. O item 4 do pedido original (a Server Action/`withSuccessHandler`) já está 100% conforme — documentado como achado, não vira tarefa de implementação, exatamente para não inflar escopo com uma mudança desnecessária. **PASSA**. |

Nenhuma violação — **Complexity Tracking não se aplica a este plano** (nenhuma exceção a justificar).

## Project Structure

### Documentation (this feature)

```text
specs/017-hotfix-roteamento-fonte-dsa/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/            # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
lib/acoes/
└── `lib/acoes/dsa.ts`                  # detectarConflitosDsa_/blocosBrutosDoDia_ ganham leitura pre-carregada;
                             # nova dadosBrutosDsaSemana_(); getDsaSemanal chama 1x, nao 5x

app/
├── `app/layout.tsx`               # boot: roteia para 'tabInstrutores' quando ha deep-link presente
├── `app/globals.css`            # troca de URL da fonte Rawline
└── `app/(app)/instrutores/page.tsx`     # abrirCadastroInstrutor/abrirEdicaoInstrutor deixam de usar
                             # window.open; novo abrirPainelEdicaoInstrutor_/fecharPainelEdicaoInstrutor_
                             # compartilhado com verificarDeepLinksInstrutor_

tests/
└── regras_dsa.test.ts              # ja cobre getDsaSemanal - reforcada com contagem de leituras
                                     # (US2). Nenhum arquivo de teste novo/estendido para US1: a
                                     # correcao de roteamento e 100% manipulacao de DOM
                                     # (irPara, abrirPainelEdicaoInstrutor_, boot de `app/layout.tsx`),
                                     # fora do alcance do harness existente (ver Testing acima).
```

**Structure Decision**: Nenhuma estrutura nova — as 3 correções tocam arquivos já existentes nos
diretórios já estabelecidos (`, `, `tests/`), seguindo a modularização
via a importação de componentes/`o App Router` já em vigor desde o Épico B (`docs/arquitetura/02-modularizacao.md`).

## Complexity Tracking

*Sem entradas — Constitution Check não encontrou violação a justificar (ver tabela acima).*

## Constitution Check — reavaliação pós-Fase 1

Nenhuma decisão de `research.md`/`data-model.md`/`contracts/` introduziu violação nova: a mudança de
assinatura de `blocosBrutosDoDia_`/`detectarConflitosDsa_` é estritamente interna (sem outro ponto de
chamada, confirmado por grep antes da decisão); `dadosBrutosDsaSemana_()` é uma função pura sem
efeito colateral; `abrirPainelEdicaoInstrutor_`/`fecharPainelEdicaoInstrutor_` reaproveitam `irPara`
já existente, sem mecanismo de navegação novo. **Gate PASSA, inalterado em relação à pré-Fase 0.**
