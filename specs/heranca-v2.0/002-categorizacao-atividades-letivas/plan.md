# Implementation Plan: Épico E — Categorização de Atividades Letivas

**Branch**: `002-categorizacao-atividades-letivas` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-categorizacao-atividades-letivas/spec.md`

## Summary

Este é o **primeiro épico a escrever código de aplicação** da V2.0 — ` e `app/`
estão vazios até aqui (o Épico C entregou só dado e scripts de migração). A abordagem: portar, das
funções já existentes e funcionando em `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` (`registrarEventoExtracurricular`,
`registrarAvaliacao`, `getDashboardGeral`, `getCronos`, `getDsaSemanal`, `getRelatorio`), a fatia
mínima necessária para as 5 histórias do spec — adaptada ao schema V2.0 (`Categoria_Normativa`,
`Escopo`, tetos em `config_parametros`) —, colocada diretamente nos arquivos modulares que
`docs/arquitetura/02-modularizacao.md` já definiu (não um monólito de transição, não a matriz
completa de 15+ arquivos — só o subconjunto que este épico precisa; ver `research.md`, achado 1).
Como `lib/supabase/server.ts`/`lib/acoes/crud.ts`/``lib/supabase/middleware.ts` + policies RLS`/``app/layout.tsx` + `lib/supabase/server.ts`` são infraestrutura genérica sem dono de épico
único, e nada disso existe ainda, este plano cria versões mínimas deles como Fase Foundational.

**Bloqueio conhecido, fora do controle deste plano**: a implementação (`/speckit-implement`) só
pode rodar de fato contra umo banco PostgreSQL **ao vivo** — hoje só existe a cópia de
trabalho `.xlsx` local. Isso já está registrado em `spec.md` (Assumptions) como pré-requisito
operacional fora do escopo funcional da spec; este plano assume que o banco estará publicada
antes da fase de implementação, e não tenta resolver isso.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Tailwind CSS + shadcn/ui como dependência versionada no `package.json` (frontend). Nenhuma dependência de backend além dos
recursos nativos do Next.js e do Supabase (o cliente Supabase, `o App Router`, `Session`). Nenhum framework,
nenhum bundler, nenhum `npm install` no runtime — constitution, Princípio III.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — o banco V2.0, que precisa estar publicada ao vivo antes da
implementação rodar de fato (ver Summary). Entidades consumidas: `atividades_nao_letivas`,
`avaliacoes`, `config_parametros`, `registros_aula`, `disciplinas`, `turmas`
— todas já entregues pelo Épico C, schema inalterado por este plano.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — RNF-PERF-01 (volume pequeno, sem requisito de reengenharia).

**Constraints**: nenhum arquivo `.ts` depende de outro por código de nível superior (gotcha crítico
do `CLAUDE.md`); tetos lidos de `config_parametros`, nunca hardcoded (Princípio VII); ultrapassar
teto é Aviso Nível 2 do Design System (banner amarelo, dispensável), nunca Alerta Crítico Nível 3
nem bloqueio (RN-DEG-02, Princípio V) — ver `research.md`, achado 2; nenhuma linha é apagada
fisicamente em nenhum CRUD novo (C-05).

**Scale/Scope**: 24 cursos, ~29 turmas, 5 categorias de lançamento, 3 tetos calculados por curso.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Re-check pós-Fase 1 (2026-08-14)**: `research.md`, `data-model.md` e `contracts/` não introduziram
nada além do já avaliado abaixo — tabela permanece válida.

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS. Toda FR cita RF-/RN- (RF-DSA-01, RF-EXTRA-01–04, RF-CRONOS-04, RN-EVT-01/03, RN-INST-01 delimitada, RN-DEG-02). Único ponto omisso pela Fase 1 (regime de Estudo Obrigatório do CIAARA) foi levado ao responsável na sessão de `/speckit-clarify`, não assumido. |
| II. Preservação de Regras de Negócio | PASS, com nota: RN-EVT-01/RN-EVT-03 (Risco Alto) hoje só têm cobertura de **dado** (`tests/unidade/regras_de_negocio.test.ts`, herdada do Épico C) — este plano acrescenta cobertura de **comportamento de função** (cálculo puro testável em Node), fechando o gap que `tests/unidade/pendentes.test.ts` ainda não cobria para este épico. |
| III. Restrição de Plataforma | PASS — é o ponto central deste plano: Next.js (App Router), React, Tailwind CSS + shadcn/ui como dependência versionada no `package.json`, `o App Router`/a importação de componentes, implantação manual. Nenhuma proposta de framework/bundler. |
| IV. Integridade do Histórico | PASS. Nenhuma migração/remoção de dado; todo CRUD novo segue C-05 (nunca hard delete) e C-06 (`Registrado_Por`/`Timestamp_Registro`). |
| V. Degradação Segura e Alerta-Não-Bloqueio | PASS — central ao design: teto ultrapassado é Aviso Nível 2 (RN-DEG-02); tabela/coluna ausente degrada com retorno vazio e aviso (RN-DEG-01, mesmo padrão já usado em `eventosExtracurricularesDe_` da V1.0). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS. Implementação em fatias por User Story (P1→P5), cada uma com `o SHA do commit` próprio incrementado, testável isoladamente. |
| VII. Configuração Sobre Constante | PASS. Tetos e referência de Estudo Individual lidos de `config_parametros` (já existe, Épico C) — nenhum literal novo em `.ts`. |
| VIII. Rastreabilidade | PASS. Funções citam RF-/RN- em comentário (mesmo padrão de `[ÉPICO 4]` já usado em ``lib/` (monólito da v1.0, hoje dividido por domínio)` V1.0); testes novos nomeados por RN-/FR-. |
| IX. Contenção de Escopo | PASS. Dashboard/status de Avaliações (Épico I), RN-CONF-01 (conflito), AppState completo (Épico D), Design System completo (Épico A) e RBAC ampliado (Épico F) explicitamente fora — este plano usa versões mínimas/stub onde a fatia de E precisa delas para funcionar, sem antecipar o trabalho desses épicos. |

Nenhuma violação. `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/002-categorizacao-atividades-letivas/
├── plan.md              # este arquivo
├── research.md          # Fase 0 — decisões de escopo e arquitetura
├── data-model.md         # Fase 1 — validações e forma de dado na camada de aplicação
├── contracts/            # Fase 1 — assinatura das funções expostas ao frontend
│   └── server-functions.md
├── quickstart.md         # Fase 1 — como rodar os testes e validar manualmente
└── tasks.md              # Fase 2 (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
CIAARA-11-v2/
├── src/
│   ├── backend/
│   │   ├── `lib/supabase/server.ts`             # NOVO (mínimo) — ss_, tz_, lerAbaComoObjetos_, isoParaDate_,
│   │   │                       #   gerarProximoId_ (6 dígitos, C-04), normalizarTexto_
│   │   ├── `lib/supabase/middleware.ts` + policies RLS             # NOVO (mínimo) — getUsuarioAtual, exigirFuncao (RN-RBAC-01/02)
│   │   ├── `lib/acoes/crud.ts`             # NOVO (mínimo) — crudCriar, crudListar (só o que `lib/acoes/aulas.ts`/
│   │   │                       #   `lib/acoes/avaliacoes.ts` precisam; crudAtualizar/crudExcluir ficam
│   │   │                       #   para o épico que primeiro precisar deles)
│   │   ├── `app/layout.tsx` + `lib/supabase/server.ts`        # NOVO (mínimo) — o layout raiz, include, getContextoInicial
│   │   ├── `lib/dominio/regras-normativas.ts`  # NOVO — calcularTetoAEC_/TAD_/TR_ (cálculo puro, testável em
│   │   │                       #   Node), lerConfigParametros_
│   │   ├── `lib/acoes/aulas.ts`            # NOVO — registrarEventoExtracurricular (RN-EVT-01), adaptada de
│   │   │                       #   `lib/` (monólito da v1.0, hoje dividido por domínio) V1.0 linha 1006
│   │   ├── `lib/acoes/avaliacoes.ts`       # NOVO — registrarAvaliacao com cômputo de CHD (RN-EVT-03),
│   │   │                       #   adaptada de `lib/` (monólito da v1.0, hoje dividido por domínio) V1.0 linha 914
│   │   ├── `lib/acoes/cronograma.ts`       # NOVO (parcial) — getCronos com totalizador de 5 categorias
│   │   │                       #   (RF-CRONOS-04)
│   │   ├── `lib/acoes/dsa.ts`              # NOVO (parcial) — getDsaSemanal refletindo lançamentos novos
│   │   └── `lib/acoes/relatorio.ts`        # NOVO (parcial) — getRelatorio com CHD/AEC/TAD/TR/Estudo
│   │                           #   Individual separados
│   └── frontend/
│       ├── `app/layout.tsx`          # NOVO (mínimo) — casca da SPA, só o necessário para host das views
│       │                       #   desta feature
│       ├── `app/globals.css`       # NOVO (mínimo) — só os componentes que esta feature usa (badge de
│       │                       #   categoria, banner de Aviso Nível 2) — não o Design System
│       │                       #   completo (Épico A)
│       ├── `components/ciaara/`         # NOVO (mínimo) — a Server Action wrapper, um AppState mínimo (só
│       │                       #   cursoSelecionado/turmaSelecionada/filtros — não o AppState
│       │                       #   completo do Épico D)
│       ├── `app/(app)/atividades/page.tsx`  # NOVO — lançamento AEC/TAD/TR/Estudo Individual
│       ├── `app/(app)/cursos/[curso]/page.tsx`      # NOVO (parcial) — só o suficiente para mostrar os 3 tetos
│       └── `app/(app)/turmas/[turma]/dsa/page.tsx`        # NOVO (parcial) — só o suficiente para refletir os lançamentos
├── tests/
│   ├── regras_normativas.test.ts  # NOVO — testa `lib/dominio/regras-normativas.ts` em Node (RN-EVT-01, RF-EXTRA-04)
│   └── pendentes.test.ts          # ALTERADO — remove os stubs que este épico implementa de verdade
└── specs/002-categorizacao-atividades-letivas/   # esta feature
```

**Estrutura selecionada**: "Option 2" adaptada — `src/backend`/`src/frontend` já são a convenção do
projeto (não `backend/`/`frontend/` na raiz). Cada arquivo listado como "NOVO (mínimo)" ou "NOVO
(parcial)" é deliberadamente incompleto frente ao mapa final de `docs/arquitetura/02-modularizacao.md`
— só a fatia que as 5 User Stories desta feature exigem para funcionar de ponta a ponta; o resto do
mapa (RBAC ampliado em ``lib/supabase/middleware.ts` + policies RLS`, CRUD genérico completo, `lib/dominio/motor-preditivo.ts`, AppState/Design
System completos) é trabalho de épicos futuros (F, B, G, D, A), não deste plano — ver `research.md`,
achado 1.

## Complexity Tracking

*Sem violações do Constitution Check — seção vazia.*
