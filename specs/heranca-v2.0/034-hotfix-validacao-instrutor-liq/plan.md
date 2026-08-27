# Implementation Plan: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

**Branch**: `master` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/034-hotfix-validacao-instrutor-liq/spec.md`

## Summary

`validarLiq_` e `montarDadosSecao2Liq_` (`lib/acoes/liq.ts`) trocam a fonte de "instrutor atribuído" de
`instrutor_disciplina` (qualificação, casada pelo `ID_Grade` exato) para `turma_disciplina.
ID_Instrutor` (seleção real por turma, fonte de verdade desde a spec 029) — corrige um bloqueio
falso confirmado em produção (27 de 54 casos, todos os 4 trimestres de 2026 afetados) sem tocar em
nenhum outro arquivo. `montarDadosSecao1Liq_` permanece intocada.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — reaproveita `lerAbaComoObjetos_`/`TABELAS`/
`intervalosSeInterceptam_` já existentes.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `turma_disciplina` (leitura, campo já existente), `instrutores`
(leitura, já existente). `instrutor_disciplina` deixa de ser lida por estas 2 funções (continua
lida por `montarDadosSecao1Liq_`, inalterada).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta nova — na verdade reduz 1 leitura de aba (`instrutor_disciplina`,
~798 linhas) em ambas as funções, já que ela deixa de ser necessária ali.

**Constraints**: RNF-PLAT-01..04 (constitution Princípio III) — sem framework/bundler novo.
Constitution Princípio II — nenhuma outra regra de `validarLiq_` muda (janela de período, turma
Cancelada, mensagens de erro) — só a fonte do sinal "tem instrutor" (FR-005 legado).

**Scale/Scope**: Mesmos volumes já manipulados (~210 `turma_disciplina`, ~177 `instrutores`) —
sem necessidade de otimização adicional.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Corrige a implementação de `RN-LIQ-01..04` (documento 04) para
  refletir corretamente a distinção qualificação/seleção já estabelecida pelas specs 029-032 desta
  sessão — não introduz nem contradiz nenhuma regra normativa nova. PASS.
- **II. Preservação de Regras de Negócio**: A validação de janela de período, a exclusão de turma
  Cancelada, e o texto das mensagens de erro permanecem idênticos — só a fonte do sinal "instrutor
  atribuído" muda, corrigindo um bug real sem alterar nenhuma regra `RN-LIQ` documentada. PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL, `o fluxo Git → Vercel` como sempre. PASS.
- **IV. Integridade do Histórico**: Nenhuma migração, nenhuma escrita — spec é 100% leitura
  (correção de lógica de validação/montagem de documento). PASS.
- **V. Degradação Segura**: `ID_Instrutor` órfão (sem `instrutores` correspondente) degrada para
  omissão silenciosa na Seção 2 (RN-DEG-01, já existente, preservado) — FR-005. PASS.
- **VI. Mudança Cirúrgica**: 2 funções ajustadas, mesmo arquivo, mesma assinatura/retorno — sem
  tocar em nenhum outro `.ts`. PASS.
- **VII. Configuração sobre Constante**: N/A.
- **VIII. Rastreabilidade**: Tarefas citam `FR-XXX`; commit final cita o épico. PASS.
- **IX. Contenção de Escopo**: Escopo restrito ao bug real confirmado — sem varredura sistêmica,
  sem função de limpeza genérica (FR-006/FR-007, investigação de premissa não encontrou evidência
  para nenhum dos dois). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/034-hotfix-validacao-instrutor-liq/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   └── backend-functions.md   # validarLiq_ e montarDadosSecao2Liq_ (ambas ALTERADAS)
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
└── backend/
    └── `lib/acoes/liq.ts`      # ALTERADO — validarLiq_ (FR-005 legado) e montarDadosSecao2Liq_ passam a usar
                      # turma_disciplina.ID_Instrutor em vez de instrutor_disciplina

tests/
└── regras_de_negocio_backend.test.ts  # ALTERADO — fixture de validarLiq_ atualizada + casos novos
```

**Structure Decision**: 1 único arquivo de produção tocado — o hotfix mais cirúrgico desta sessão.
Nenhum diretório novo além do padrão `specs/034-.../`.

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
