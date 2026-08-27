# Implementation Plan: Arquitetura de Navegação com Estado Centralizado (AppState)

**Branch**: `011-appstate-navegacao` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-appstate-navegacao/spec.md`

## Summary

Fecha a lacuna entre `docs/arquitetura/04-appstate.md` (projetou `AppState.cache`/`invalidar()`/
`onChange()` em 2026-08-11) e o `AppState` "mínimo" efetivamente construído incrementalmente pelos
Épicos E/B/A/009. Entrega: os 3 membros que faltam em `AppState` (`cache`, `invalidar(chaves)`,
`onChange(chave, callback)`); migração das 3 flags de cache ad hoc
(`estatisticasCursoCarregadas`/`estatisticasDisciplinasCarregadas`/`estatisticasInstrutoresCarregadas`)
para o novo mecanismo; invalidação disparada no conjunto completo de escritas que cada painel de
estatística realmente agrega (achado do `/speckit-clarify`: painel de Cursos usa Cursos+Turmas numa
única chave; painel de Disciplinas depende também de lançamento de Aula via DSA); remoção do
roteador morto `registrarRota`/`ROTAS[hash]`. Inteiramente front-end — nenhuma função de backend
nova, nenhuma mudança de schema.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. `AppState` continua um objeto JS simples em `components/ciaara/`
(constitution Princípio III — nenhuma biblioteca de gerenciamento de estado, decisão já registrada
em `04-appstate.md`: "Nenhuma biblioteca nova (Redux, Zustand etc.)").

**Storage**: N/A — `AppState.cache` é estado em memória do navegador, existe só durante a sessão,
nunca persistido (`data-model.md`).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: SC-002 (spec.md) — reabrir um painel sem escrita relevante desde a última
abertura não gera nova chamada de rede; é uma garantia de *não regressão* de performance (mesmo
comportamento das 3 flags ad hoc hoje), não uma otimização nova.

**Constraints**: Zero mudança de comportamento observável de navegação (RF-NAV-02/03, FR-007) — os
mesmos pontos de entrada, a mesma persistência de seleção de curso/turma/filtro. History API/deep-
link permanecem fora de escopo (FR-008).

**Scale/Scope**: 5 arquivos tocados, todos já existentes: `components/ciaara/` (`AppState` +
remoção do roteador morto), `app/(app)/cursos/[curso]/page.tsx`, `app/(app)/disciplinas/page.tsx`,
`app/`app/(app)/instrutores/page.tsx`` (as 3 migrações de flag→cache), `app/(app)/turmas/[turma]/dsa/page.tsx`
(novo ponto de invalidação cross-file, achado do clarify).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Todo FR cita RF-NAV-01/02/03 (`docs/fase-1/02-Requisitos-
  Funcionais.md`) e o próprio documento de decisão `04-appstate.md`, já ratificado em 2026-08-11.
  Nenhum requisito novo sem origem rastreável. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: Nenhuma regra `RN-` é tocada — infraestrutura
  de front-end (cache/roteador), não cálculo normativo. **PASSA**.
- **Princípio III (Restrição de Plataforma)**: `AppState` continua objeto JS simples, decisão de
  "nenhum framework de estado" já registrada em `04-appstate.md` e reafirmada aqui. **PASSA**.
- **Princípio V (Degradação Segura)**: invalidação de cache é sempre "melhor invalidar demais que de
  menos" (ex.: `excluirBlocoDsa` invalida `estatisticasDisciplinas` para qualquer exclusão em
  `registros_aula`, não só categoria `Aula` — ver research.md §4) — nunca lança exceção
  por chave inexistente, `invalidar()` de uma chave nunca populada é no-op. **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 1 commit por User Story
  (infraestrutura `AppState` + migração das 3 views + remoção do roteador morto), testável onde a
  lógica é pura. **PASSA**.
- **Princípio VIII (Rastreabilidade)**: todo FR cita RF-NAV-0N; achados do clarify citados nos
  commits de implementação. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: escopo restrito ao que está concretamente incompleto hoje
  (spec.md, Assumptions) — History API/deep-link explicitamente fora (FR-008); nenhuma tela nova,
  nenhuma função de backend nova. **PASSA**.

Nenhuma violação. Nenhuma entrada necessária em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-appstate-navegacao/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan) — AppState.cache, sem entidade de domínio nova
├── quickstart.md        # Fase 1 (/speckit-plan) — roteiro de verificação manual no navegador
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md             # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, nenhuma pasta/arquivo novo — 5 arquivos já existentes tocados:

```text
app/
├── `components/ciaara/`            # AppState ganha cache/invalidar()/onChange(); registrarRota/ROTAS[hash]
│                           # removidos (código morto, FR-006)
├── `app/(app)/cursos/[curso]/page.tsx`          # estatisticasCursoCarregadas -> AppState.cache (FR-003); nenhum ponto
│                           # de invalidação novo (Cursos/Turmas sem escrita em app, achado do
│                           # clarify) — só a leitura/armazenamento migra
├── `app/(app)/disciplinas/page.tsx`    # estatisticasDisciplinasCarregadas -> AppState.cache; invalidação após
│                           # atualizarDisciplina/definirPrioridadeDisciplina (FR-003/004)
├── `app/(app)/instrutores/page.tsx`    # estatisticasInstrutoresCarregadas -> AppState.cache; invalidação após
│                           # cadastrarInstrutor/atualizarInstrutor/desativarInstrutor (FR-003/004)
└── `app/(app)/turmas/[turma]/dsa/page.tsx`            # NOVO ponto de invalidação cross-file (achado do clarify, FR-004): após
                            # salvarLancarAula/excluirBlocoDsa (registros_aula) resolver
                            # com sucesso, invalida a chave de cache do painel de Disciplinas

tests/
└── design_system.test.ts   # já existe (Épico A) — ganha casos novos para
                            # AppState.invalidar()/onChange() (FR-001/002), mesmo arquivo que já
                            # carrega `components/ciaara/` importadas diretamente do módulo (`export` explícito, sem carregamento dinâmico)
```

**Structure Decision**: Nenhuma estrutura nova. `AppState.cache` é um objeto simples
(`{chave: dado}`); `invalidar(chaves)` normaliza a entrada (string única, array, ou `"*"`) e chama
os `onChange` registrados para cada chave removida, sem nenhum mecanismo de reatividade automática
(sem `Proxy`, sem getters/setters mágicos) — o mesmo espírito de "objeto simples com API explícita"
que já levou `04-appstate.md` a rejeitar uma biblioteca de estado. Cada view migrada substitui sua
flag booleana por uma leitura de `AppState.cache['<chave>']` (undefined = precisa buscar) e uma
gravação após a busca (`AppState.cache['<chave>'] = dado`) — o *nome* de cada chave é decidido em
`data-model.md`/`contracts/`.

## Complexity Tracking

*Sem violações de constitution — seção não aplicável.*
