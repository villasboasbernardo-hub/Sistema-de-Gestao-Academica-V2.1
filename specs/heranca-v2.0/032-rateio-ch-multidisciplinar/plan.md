# Implementation Plan: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

**Branch**: `master` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/032-rateio-ch-multidisciplinar/spec.md`

## Summary

Duas telas (`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx`) passam a filtrar a lista de instrutores
elegíveis por `disciplinas.Modo_Atribuicao_Padrao` — restrito à disciplina quando `Dividido`
(ou vazio), ampliado a todo o curso quando `Simultaneo` (RN-MAT-05: Prática de Fim de Curso, LHFC,
Prática de Manutenção de Auxílios à Navegação, e qualquer outra assim marcada). Um checkbox novo
("Dividir Carga Horária Igualmente") controla se o backend divide a CH da disciplina entre os
instrutores selecionados ou dá a CH integral a cada um — gravado num campo novo,
`turma_disciplina.CH_Prevista_Por_Instrutor`, sempre regravado por completo. Único ponto de backend:
`atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) ganha um 3º parâmetro opcional e uma função pura nova de
cálculo — nenhuma outra função de backend é criada.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — reaproveita `atualizarTurmaDisciplina`/`crudAtualizar`/
`crudListar`/`listarDisciplinas` já existentes.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `turma_disciplina` (ganha 1 coluna), `disciplinas` (leitura de
`Modo_Atribuicao_Padrao`/`Carga_Horaria_Tempos`, já existentes), `instrutor_disciplina` (leitura,
já existente).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta nova — 1 leitura adicional (`disciplinas` do curso) em
``app/(app)/cursos/[curso]/page.tsx`:abrirPainelPeriodoTurma_`, mesma classe de latência das leituras já existentes ali.

**Constraints**: RNF-PLAT-01..04 (constitution Princípio III) — sem framework/bundler novo.
Constitution Princípio II — `atualizarTurmaDisciplina` continua validando a janela de período
exatamente como hoje; o campo novo é estritamente aditivo, nenhum consumidor existente de
`turma_disciplina` quebra. RN-CRUD-02 — `instrutores.Carga_Horaria_Ministrada_Ano`/`registros_aula` nunca são tocados por esta spec (FR-011).

**Scale/Scope**: ~210 linhas de `turma_disciplina`, ~175 de `disciplinas`, ~798 de `instrutor_disciplina` — mesmos volumes já manipulados em memória por specs anteriores (029/030/031), sem
necessidade de otimização adicional.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Implementa `RN-MAT-05` (documento 04, já aprovada, nunca antes
  implementada) — primeira spec desta sessão a consumir `disciplinas.Modo_Atribuicao_Padrao`.
  Nenhum ponto ambíguo restante dos documentos 00-09 — resolvido em conversa direta antes da spec
  (registrado em "Achados reais"). PASS.
- **II. Preservação de Regras de Negócio**: `atualizarTurmaDisciplina` continua validando
  `intervaloContidoEm_` exatamente como hoje (specs 029/030) — a extensão desta spec só adiciona um
  campo novo ao payload de escrita, nunca altera a lógica de validação de período já existente.
  `CH_Prevista_Por_Instrutor` é aditivo — nenhuma leitura existente de `turma_disciplina` é afetada.
  PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL + React + Tailwind CSS, `o fluxo Git → Vercel` como sempre.
  PASS.
- **IV. Integridade do Histórico**: Nenhuma migração apaga dado — coluna nova nasce vazia (FR
  aditivo). `CH_Prevista_Por_Instrutor` nunca é confundido com `registros_aula`
  (histórico real de aulas), preservando a distinção Prevista/Cumprida (FR-011). PASS.
- **V. Degradação Segura**: `Modo_Atribuicao_Padrao` vazio/ausente degrada para `Dividido` (filtro
  restrito), nunca `Simultaneo` por omissão (FR-010, RN-DEG-01). Curso multidisciplinar sem nenhum
  instrutor habilitado degrada para lista vazia com mensagem, nunca erro. PASS.
- **VI. Mudança Cirúrgica**: 1 função de backend estendida (`atualizarTurmaDisciplina`) + 1 função
  pura nova (`calcularChPrevistaPorInstrutor_`), ambas em `lib/acoes/liq.ts` (já dono de `turma_disciplina`
  desde a spec 027); 2 arquivos de frontend ajustados de forma paralela e simétrica. PASS.
- **VII. Configuração sobre Constante**: É exatamente o espírito desta spec — usa o campo já
  administrável `Modo_Atribuicao_Padrao` em vez de hard-code de nomes de disciplina no código. PASS.
- **VIII. Rastreabilidade**: Tarefas citam `FR-XXX`/`RN-MAT-05`; commit final cita o épico. PASS.
- **IX. Contenção de Escopo**: Módulo de Disciplinas/Instrutores já é responsabilidade CIAARA-11
  (mesma matriz das specs 019/027/029/030/031). Escopo explicitamente contido: sem validação
  server-side de elegibilidade do instrutor (só o filtro client-side, ver research.md §3) e sem
  override por vínculo (`instrutor_disciplina.Modo_Atribuicao`, fora de escopo por decisão
  registrada no spec). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/032-rateio-ch-multidisciplinar/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   ├── backend-functions.md   # atualizarTurmaDisciplina (estendida) + calcularChPrevistaPorInstrutor_ (nova)
│   └── frontend-functions.md  # `app/(app)/cursos/[curso]/page.tsx` + `app/(app)/disciplinas/page.tsx`
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
├── backend/
│   └── `lib/acoes/liq.ts`                  # ALTERADO — atualizarTurmaDisciplina (3º parâmetro opcional) +
│                                # calcularChPrevistaPorInstrutor_ (nova, função pura)
└── frontend/
    ├── `app/(app)/cursos/[curso]/page.tsx`          # ALTERADO — abrirPainelPeriodoTurma_ ganha leitura de Cad_
    │                           # Disciplinas; checkboxesInstrutor_/salvarPeriodoTurmaClick_
    │                           # ganham filtro multidisciplinar + checkbox de rateio
    └── `app/(app)/disciplinas/page.tsx`    # ALTERADO — remove busca livre; abrirEdicaoDisciplinaTurma_/
                                 # salvarEdicaoDisciplinaTurma_ ganham a mesma lógica

migracao/
└── adicionar_ch_prevista_turma_disciplina.py   # NOVO — coluna aditiva em turma_disciplina

tests/
└── regras_de_negocio_backend.test.ts  # ALTERADO — casos novos para calcularChPrevistaPorInstrutor_
                                         # e para a extensão de atualizarTurmaDisciplina
```

**Structure Decision**: Mesma estrutura de todas as specs da sessão — o projeto Supabase e o repositório Next.js único.
Nenhum diretório novo além do padrão `specs/032-.../`.

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
