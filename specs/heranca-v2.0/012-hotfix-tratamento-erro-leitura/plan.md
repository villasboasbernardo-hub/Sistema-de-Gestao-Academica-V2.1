# Implementation Plan: Hotfix — Tratamento de Erro Ausente em Chamadas de Leitura ao Backend

**Branch**: `012-hotfix-tratamento-erro-leitura` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-hotfix-tratamento-erro-leitura/spec.md`

## Summary

Corrige um achado real de uma auditoria estática de todos os módulos (não um relato do usuário):
15 funções em 7 arquivos front-end fazem uma chamada `gs(...)` de leitura sem nenhum `.catch()` —
diferente de toda chamada de escrita do projeto, que sempre trata erro. Entrega: as 11 chamadas
disparadas por ação do usuário ganham `.catch(e => alert(...))`, mesmo padrão já usado em toda
escrita; as 4 disparadas automaticamente no boot ganham `mostrarAvisoNivel2` (banner não-bloqueante
já existente em `components/ciaara/`), reaproveitando um container de aviso já existente em cada tela em
vez de criar elemento novo, onde disponível. Zero mudança de backend, zero mudança de
comportamento em caso de sucesso.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — `mostrarAvisoNivel2`/`limparAviso` (`components/ciaara/`) e
`alert()` já existem e são reaproveitados como estão.

**Storage**: N/A.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — nenhuma mudança de volume de leitura/escrita, só o caminho de falha
(hoje inexistente) ganha tratamento.

**Constraints**: SC-002 (spec.md) — nenhuma das 4 correções de boot pode introduzir um
`alert()`/`confirm()` bloqueante sem ação prévia do usuário. SC-003 — comportamento de sucesso
permanece byte-a-byte idêntico.

**Scale/Scope**: 7 arquivos tocados, todos já existentes: `app/(app)/avaliacoes/page.tsx` (3 pontos),
`app/(app)/cronograma/page.tsx` (1), `app/(app)/cursos/[curso]/page.tsx` (4), `app/(app)/disciplinas/page.tsx` (2),
`app/(app)/instrutores/page.tsx` (2), `app/(app)/relatorio/page.tsx` (1), `app/(app)/admin/usuarios/page.tsx` (2) — 15 pontos
(11 de US1 + 4 de US2, spec.md). `aoTrocarTurmaAvaliacao` conta como 1 função/1 correção mesmo
fazendo 3 chamadas a Server Action — um único `.catch` cobre o `Promise.all` inteiro.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Não implementa nenhum RF/RN novo — corrige uma lacuna de
  robustez de implementação achada por auditoria própria desta sessão, não um requisito do
  documento 06. Rastreável ao princípio de degradação segura (RN-DEG-01, Princípio V) mesmo sem ser
  literalmente essa regra. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: Nenhuma regra `RN-` tocada — só tratamento
  de erro de front-end, nenhum cálculo muda. **PASSA**.
- **Princípio III (Restrição de Plataforma)**: Reaproveita `alert()`/`mostrarAvisoNivel2`, ambos já
  existentes — nenhuma dependência nova. **PASSA**.
- **Princípio V (Degradação Segura)**: É literalmente o que esta spec corrige — RN-DEG-01 exige
  "retorno vazio/neutro com aviso — nunca uma exceção não tratada"; os 15 pontos hoje violam a
  metade "com aviso" (o retorno já é neutro/vazio, mas sem nenhum aviso visível). **PASSA** (spec
  fecha um desvio do próprio princípio, não o viola).
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 2 commits esperados (US1: 11
  pontos com `alert()`; US2: 4 pontos com `mostrarAvisoNivel2`), cada correção isolada e revisável
  por arquivo. **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Achado documentado em `spec.md` §"Contexto e achados" com a
  tabela exata de função/arquivo/gatilho; commits citam FR-001/002. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo restrito exatamente aos 15 pontos já identificados
  — nenhuma varredura especulativa por mais casos, nenhuma reescrita do padrão de erro do projeto
  inteiro (spec.md Assumptions). **PASSA**.

Nenhuma violação. Nenhuma entrada necessária em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-hotfix-tratamento-erro-leitura/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan) — sem entidade de dados, mapa de container/aviso
├── quickstart.md        # Fase 1 (/speckit-plan) — roteiro de verificação manual no navegador
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md             # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, nenhum arquivo novo — 7 arquivos já existentes tocados:

```text
app/
├── `app/(app)/avaliacoes/page.tsx`     # aoTrocarTurmaAvaliacao (US1, alert); popularFiscalVistaProva
│                           # (US2, mostrarAvisoNivel2 em #avisoVistaProva); carregarPainelavaliacoes
│                           # (US1, alert)
├── `app/(app)/cronograma/page.tsx`     # garantirNomesInstrutores_ (US1, alert)
├── `app/(app)/cursos/[curso]/page.tsx`          # renderizarDetalheCurso, aoTrocarTurmaCurso, aoClicarCardDisciplina,
│                           # aoTrocarTurmaEstudoIndividual (US1, alert nos 4)
├── `app/(app)/disciplinas/page.tsx`    # carregarDisciplinas, carregaravaliacoesPlanejadas (US1, alert)
├── `app/(app)/instrutores/page.tsx`    # carregarInstrutores (US2, mostrarAvisoNivel2 em #avisoInstrutor);
│                           # carregarDisciplinasParaVinculo (US2, mostrarAvisoNivel2 em #avisoVinculo)
├── `app/(app)/relatorio/page.tsx`      # carregarTotalizadoresCurso (US1, alert)
└── `app/(app)/admin/usuarios/page.tsx`       # carregarusuarios (US2, mostrarAvisoNivel2 em #avisoUsuario —
                            # container reaproveitado do formulário, nenhum novo criado);
                            # carregarCursosVinculados (US1, alert — 15o ponto, corrigido em
                            # data-model.md/plan.md/spec.md durante /speckit-implement)
```

**Structure Decision**: Nenhuma estrutura nova, nenhum arquivo novo, nenhum `id` de container novo
— os 4 pontos de US2 reaproveitam containers de aviso que já existem em cada tela
(`#avisoVistaProva`, `#avisoInstrutor`, `#avisoVinculo`, `#avisoUsuario`), hoje usados só pelo
`.catch` das chamadas de escrita da mesma tela (FR-004, spec.md). Cada um dos 11 pontos de US1 só
ganha `.catch(e => alert(e && e.message ? e.message : e))` ao final da cadeia `.then()` já
existente — mesmo padrão textual usado em toda chamada de escrita do projeto, sem nenhuma
abstração nova.

## Complexity Tracking

*Sem violações de constitution — seção não aplicável.*
