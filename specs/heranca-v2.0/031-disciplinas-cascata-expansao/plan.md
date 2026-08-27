# Implementation Plan: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

**Branch**: `master` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/031-disciplinas-cascata-expansao/spec.md`

## Summary

Refatorar `app/(app)/disciplinas/page.tsx` para remover a divisão lateral com Avaliações Planejadas (movida
para o final, `d-none`), unificar a tabela de grade (spec 009) e a tabela por turma (spec 030) numa
única tabela expansível (Visão 1 = só curso; Visão 2 = curso+turma), aplicar a regra de nomenclatura
de turma (sem repetir o nome do curso) e tornar as estatísticas do topo reativas ao filtro
selecionado. Reaproveita quase 100% do backend já existente; os únicos 2 pontos tocados são
aditivos: ``app/layout.tsx` + `lib/supabase/server.ts`` (2 campos crus novos em `AppState.ctx.turmas`) e `lib/acoes/estatisticas.ts`
(`getEstatisticasDisciplinas` ganha um parâmetro `filtros` opcional, retrocompatível).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — reaproveita `AppState`/a Server Action/`crudListar` já existentes
(`app/AppState.html` ou equivalente) e `renderizarGrafico_` (Recharts já embarcado) para o
painel de estatísticas.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `disciplinas`, `turmas`, `turma_disciplina`,
`instrutor_disciplina`, `instrutores`, `registros_aula` (todas já existentes, nenhum
schema novo).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta numérica nova — mantém a mesma classe de latência das trocas de
filtro já existentes na tela (1 chamada a Server Action por troca de seleção, como `carregarDisciplinas`/
`popularTurmasDisciplinas_` já fazem hoje).

**Constraints**: RNF-PLAT-01..04 (constitution, Princípio III) — proibido framework/bundler novo.
Constitution Princípio V (RN-DEG-01) — nomenclatura de turma degrada para o nome atual
(`Nome_Completo_Curso`) se `Turma`/`Ano_Letivo` vierem vazios, nunca quebra a tela.

**Scale/Scope**: Mesmos volumes já em produção (~175 `disciplinas`, ~29 `turmas`, ~1.753
`registros_aula`) — agregação em memória no Next.js já é o padrão estabelecido
(`lib/acoes/estatisticas.ts`, cabeçalho do arquivo) e continua suficiente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Continuidade direta do Épico 009 (Refatoração UI/UX) — cita os mesmos
  `RF-MATERIAS-04` (`getEstatisticasDisciplinas`, já citado em `lib/acoes/estatisticas.ts`) e `FR-013/014/015`
  daquele épico (comentários em `app/(app)/disciplinas/page.tsx`). Nenhum ponto ambíguo dos documentos 00–09
  foi necessário nesta spec — resolvido via `/speckit-clarify` (1 pergunta, decisão registrada). PASS.
- **II. Preservação de Regras de Negócio**: Nenhuma `RN-` de negócio muda de comportamento —
  `atualizarDisciplina`, `definirPrioridadeDisciplina`, `atualizarTurmaDisciplina` continuam
  idênticas; a extensão de `getEstatisticasDisciplinas(filtros)` é retrocompatível (chamada sem
  argumento reproduz exatamente o resultado global de hoje — coberto por teste). PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL + React + Tailwind CSS, ``git push` (a Vercel publica a preview da branch)`/`o fluxo Git → Vercel
  deploy` como sempre. Nenhuma dependência nova. PASS.
- **IV. Integridade do Histórico**: Nenhuma migração/exclusão de dado. Avaliações Planejadas é
  ocultada (`d-none`), não removida — dado e função de backend intactos. Colunas Técnica de
  Ensino/Local Padrão saem só da UI; os campos no banco permanecem. PASS.
- **V. Degradação Segura**: Turma sem `Turma`/`Ano_Letivo` preenchido degrada para o nome atual
  (`Nome_Completo_Curso`), nunca erro (RN-DEG-01) — ver research.md §3. CH Cumprida sem nenhuma aula
  lançada mostra `0`, nunca erro (já coberto pela spec, edge case). PASS.
- **VI. Mudança Cirúrgica**: 2 arquivos de backend tocados de forma aditiva
  (``app/layout.tsx` + `lib/supabase/server.ts`/`lib/acoes/estatisticas.ts``), 1 arquivo de frontend reescrito
  (`app/(app)/disciplinas/page.tsx`) — tarefas pequenas e testáveis isoladamente (ver tasks.md). PASS.
- **VII. Configuração sobre Constante**: Não se aplica — nenhum limite normativo novo. N/A.
- **VIII. Rastreabilidade**: Tarefas citam `FR-XXX` desta spec; commit final cita o épico. PASS.
- **IX. Contenção de Escopo**: Módulo de Disciplinas já é responsabilidade CIAARA-11 (mesma
  matriz que já cobre as specs 009/029/030). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/031-disciplinas-cascata-expansao/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── contracts/
│   └── backend-functions.md   # Fase 1 — `app/layout.tsx` + `lib/supabase/server.ts`/`lib/acoes/estatisticas.ts` (únicos 2 pontos de backend)
├── quickstart.md        # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── `app/layout.tsx` + `lib/supabase/server.ts`        # ALTERADO (aditivo) — AppState.ctx.turmas ganha `turma`/`anoLetivo`
│   └── `lib/acoes/estatisticas.ts`     # ALTERADO (aditivo) — getEstatisticasDisciplinas(filtros) opcional
└── frontend/
    └── `app/(app)/disciplinas/page.tsx`  # REESCRITO — cascata, tabela única expansível, estatísticas reativas,
                               # Avaliações Planejadas movida para o final com `d-none`

tests/
└── regras_de_negocio_backend.test.ts  # ALTERADO — casos novos para getEstatisticasDisciplinas(filtros)
```

**Structure Decision**: Mesma estrutura de todas as specs anteriores da sessão — projeto Apps
Script único, sem separação física frontend/backend além dos diretórios `src/backend`/`src/frontend`
já existentes. Nenhum diretório novo.

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
