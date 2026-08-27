# Implementation Plan: Seleção de Instrutor por Turma e Validação de Janela em `turma_disciplina`

**Branch**: `029-turma-disciplina-instrutor` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/029-turma-disciplina-instrutor/spec.md`

## Summary

Estende `turma_disciplina` (spec 027) com uma coluna `ID_Instrutor` (seleção efetiva de instrutor
por turma, distinta de `instrutor_disciplina` que continua sendo só qualificação), seguindo o
mesmo padrão aditivo de migração já usado para `Previsao_Inicio`/`Termino`. Estende o painel
"Período das Disciplinas" (`app/(app)/cursos/[curso]/page.tsx`) com checkboxes de instrutores habilitados por linha.
Adiciona uma função de backend dedicada que valida — e bloqueia diretamente, não é caso de
RN-DEG-02 — que o período da disciplina não saia da janela real da turma antes de gravar.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. `atualizarTurmaDisciplina`/`intervaloContidoEm_` ficam em
`lib/acoes/`lib/acoes/liq.ts`` (já o "dono" de `turma_disciplina` desde a spec 027) — reaproveita
`lerAbaComoObjetos_`/`crudAtualizar`/`'turma_disciplina'`/`'turmas'` já existentes.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — 1 coluna aditiva em `turma_disciplina` (`ID_Instrutor`), nenhuma outra
aba tocada (FR-010). Migração segue o mesmo protocolo (`fazer_backup`/`gravar_log`) de toda
migração desta sessão.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta específica — mesmo padrão de leitura única por aba envolvida já
estabelecido (spec 017).

**Constraints**: `cursos`, `turmas`, `disciplinas` e `instrutor_disciplina` MUST
permanecer intocadas (FR-007/FR-010 — achado real: o pedido original de "reestruturação relacional
completa" foi descartado, quase tudo já existia sob outros nomes). LIQ (spec 027) e O.S. de
Instrutoria (spec 028) MUST NUNCA ser alteradas nesta spec para consumir o campo novo (FR-008).

**Scale/Scope**: 1 migração Python nova (`migracao/adicionar_instrutor_turma_disciplina.py`), 1
arquivo de backend estendido (`lib/acoes/liq.ts` — 2 funções novas), 1 arquivo de frontend estendido
(`app/(app)/cursos/[curso]/page.tsx` — painel de período já existente ganha checkboxes de instrutor).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASSA — mesma ressalva já registrada no Épico LIQ (nenhum doc de Fase 1 cobre O.S./LIQ), mas aqui não há norma externa nova envolvida, só uma correção estrutural de dado já mapeado em `01-schema.md`. |
| II. Preservação de Regras de Negócio | PASSA — `instrutor_disciplina` (qualificação) permanece intocada e com o mesmo significado (FR-007); nenhuma RN existente muda. |
| III. Restrição de Plataforma | PASSA — nenhuma dependência nova. |
| IV. Integridade do Histórico | PASSA — migração aditiva, backup + `migracao_log`, mesmo protocolo de LIQ-1. |
| V. Degradação Segura | **RESSALVA DOCUMENTADA, MAS NÃO É EXCEÇÃO A RN-DEG-02** — FR-005 bloqueia diretamente a gravação de período fora da janela da turma, mas isso não é uma regra normativa de verificação incerta (o caso que RN-DEG-02 cobre); é uma checagem estrutural 100% verificável a partir de dado já no sistema, mesma categoria de `validarCamposObrigatoriosInstrutor_` (spec 016) — validação de integridade, não bloqueio normativo. FR-006 garante degradação seguindo RN-DEG-01 quando a turma não tem janela definida. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASSA — estende arquivos já donos do domínio (`lib/acoes/liq.ts`/`app/(app)/cursos/[curso]/page.tsx`), sem criar módulo novo nem tocar as 4 tabelas que o pedido original queria reestruturar. |
| VII. Configuração Sobre Constante | N/A — nenhum limite normativo novo. |
| VIII. Rastreabilidade | PASSA — achados citam coluna/arquivo real; FR-010 documenta explicitamente o que foi descartado do pedido original e por quê. |
| IX. Contenção de Escopo | PASSA — escopo reduzido deliberadamente ao gap real (FR-010), decisão do responsável em conversa direta antes da escrita da spec. |

## Project Structure

### Documentation (this feature)

```text
specs/029-turma-disciplina-instrutor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── backend-functions.md
│   └── frontend-functions.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
migracao/
└── adicionar_instrutor_turma_disciplina.py   # NOVO — coluna ID_Instrutor em turma_disciplina,
                                                 # semeada de disciplinas.ID_Instrutor

src/
├── backend/
│   └── `lib/acoes/liq.ts`                  # ESTENDIDO — intervaloContidoEm_ (função pura),
│                                 # atualizarTurmaDisciplina(id, alteracoes)
└── frontend/
    └── `app/(app)/cursos/[curso]/page.tsx`          # ESTENDIDO — renderizarPainelPeriodoTurma_/
                                  # salvarPeriodoTurmaClick_ (spec 027) ganham checkboxes de
                                  # instrutor habilitado por linha

tests/
└── regras_de_negocio_backend.test.ts   # casos novos para intervaloContidoEm_/
                                          # atualizarTurmaDisciplina
```

**Structure Decision**: Estender `lib/acoes/liq.ts`/`app/(app)/cursos/[curso]/page.tsx` em vez de criar arquivos novos —
`turma_disciplina` já tem dono desde a spec 027 (`lib/acoes/liq.ts` no backend, o painel de período em
`app/(app)/cursos/[curso]/page.tsx` no frontend); criar um módulo novo para uma extensão de 1 coluna + 1 validação
violaria Princípio VI (mudança cirúrgica: reaproveitar o que já existe, não fragmentar).
Deliberadamente **não** cria `lib/acoes/os-instrutoria.ts` nem qualquer arquivo novo — o próprio
achado desta spec é que a maior parte do pedido original já tinha dono, só faltava uma coluna.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Nenhuma violação — a ressalva do Princípio V é uma clarificação de categoria (validação estrutural,
não RN-DEG-02), não uma exceção a justificar.

## Phase 0 — Research

Ver `research.md` (4 decisões: nome/semântica da coluna nova, containment vs. intersection para a
validação de janela, localização das funções novas, formato da migração).

## Phase 1 — Design

Ver `data-model.md` (coluna nova de `turma_disciplina`, sem entidade nova) e `contracts/*.md`.
`quickstart.md` documenta os 2 roteiros de validação manual (seleção de instrutor, bloqueio de
janela).
