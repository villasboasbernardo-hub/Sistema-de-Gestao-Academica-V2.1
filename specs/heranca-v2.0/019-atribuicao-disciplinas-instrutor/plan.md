# Implementation Plan: Painel de Atribuição de Disciplinas do Instrutor (Multi-Select Pesquisável)

**Branch**: `019-atribuicao-disciplinas-instrutor` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-atribuicao-disciplinas-instrutor/spec.md`

## Summary

Substituir o bloco read-only "Disciplinas Habilitadas" da ficha de cadastro/edição de instrutor por
um painel interativo (busca + checkboxes) que exibe cada disciplina como "Nome (Código do Curso)" e
permite marcar/desmarcar o conjunto de disciplinas do instrutor. A gravação sincroniza a tabela
relacional `instrutor_disciplina` reaproveitando o motor CRUD genérico já existente (`crudCriar`/
`crudAtualizar`/`crudExcluir`) por vínculo — nunca apagando fisicamente uma linha (Princípio IV/
C-05) — em vez do "apagar tudo e recriar" descrito literalmente no pedido original. Toda a
exibição (lista completa, rótulos, estado pré-marcado) usa dados já carregados no boot da tela;
apenas o salvamento introduz uma função de backend nova.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Tailwind CSS + shadcn/ui (já em uso) para os componentes visuais
(`form-check`, `form-control`); nenhuma biblioteca de busca/multi-select de terceiros.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `AppState.ctx.cursos` já carregado), `instrutor_disciplina` (leitura + escrita via motor CRUD
genérico existente), `instrutores` (leitura + escrita já existente, sem mudança de schema).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Filtragem da lista de disciplinas (~175 itens) deve ser perceptualmente
instantânea a cada tecla digitada (sem debounce necessário nessa escala) — SC-001. Sincronização de
vínculos por salvamento toca no máximo a dezena de linhas do instrutor em questão (real:
máximo observado 20), não o catálogo inteiro.

**Constraints**: Nenhuma chamada de rede nova para exibir o painel (FR-014) — reaproveita
`disciplinasCarregadas_`/`vinculosCarregados_`/`AppState.ctx.cursos` já carregados por
`carregarInstrutores()`. Sincronização de vínculos nunca chama `deleteRow` (Princípio IV/C-05).

**Scale/Scope**: ~175 disciplinas no catálogo (174 ativas), ~175 instrutores, ~798 vínculos hoje
(máximo 20 vínculos por instrutor). 2 arquivos de frontend tocados
(`app/(app)/instrutores/page.tsx`, mais `o SHA do commit` em `app/layout.tsx`), 1 arquivo de backend tocado
(`lib/acoes/instrutores.ts`, mais `o SHA do commit` em `lib/supabase/server.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | **PASSA.** Não há RF-/RN- de Fase 1 sobre um painel de seleção de disciplinas em si (feature nova, não presente no documento 04) — a única RN- tocada é a já existente sobre `Modo_Atribuicao` (divisão de carga horária entre múltiplos instrutores, preservada por FR do plano, não alterada). |
| II. Preservação de Regras de Negócio | **PASSA.** Nenhuma regra `RN-` existente muda de comportamento — a criação/desativação de vínculo já seguia as mesmas validações de instrutor/disciplina existentes (`criarVinculoHabilitacao`), agora aplicadas em lote via sincronização em vez de um vínculo por vez pelo formulário auxiliar dedicado (que continua existindo, inalterado). |
| III. Restrição de Plataforma | **PASSA.** Zero dependência nova — Tailwind CSS + shadcn/ui e React já em uso, nenhum bundler/framework/build. |
| IV. Integridade do Histórico | **GATE CRÍTICO — RESOLVIDO NA SPEC.** O pedido original descrevia "apagar e recriar" vínculos; a spec (FR-009 a FR-012) substitui isso por sincronização via exclusão lógica (desativar/reativar/criar, nunca `deleteRow`), usando o mesmo mecanismo `crudExcluir`/`crudAtualizar`/`crudCriar` já auditado do resto do projeto. Nenhuma linha de `instrutor_disciplina` é fisicamente removida em nenhum fluxo desta feature. |
| V. Degradação Segura | **PASSA.** Um `ID_Grade` marcado que não corresponde a nenhuma disciplina real do catálogo (ex.: dado obsoleto no navegador) é ignorado silenciosamente pela sincronização, sem lançar exceção que interrompa o salvamento do instrutor já concluído — ver research.md §3. |
| VI. Mudança Cirúrgica | **PASSA.** Uma função de backend nova (`sincronizarDisciplinasInstrutor`), reaproveitando o motor CRUD genérico linha a linha — nenhuma tabela nova, nenhum mecanismo de escrita bespoke inventado do zero. |
| VII. Configuração sobre Constante | **PASSA.** Nenhum limite normativo novo introduzido; o único "padrão" usado (`Modo_Atribuicao_Padrao`) já vem de `disciplinas`, não de uma constante no código. |
| VIII. Rastreabilidade | **PASSA.** Tarefas citam FR-00X desta spec; `instrutor_disciplina` continua registrando `Editado_Por`/`Timestamp_Edicao` a cada mudança de vínculo, via os mesmos `crudAtualizar`/`crudExcluir` que já gravam essas colunas. |
| IX. Contenção de Escopo | **PASSA.** Gestão de habilitação de instrutor por disciplina já está dentro do escopo original do projeto (spec 004, User Story 3) — esta feature só melhora a interface de um fluxo já existente. |

## Project Structure

### Documentation (this feature)

```text
specs/019-atribuicao-disciplinas-instrutor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── server-functions.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
lib/acoes/
├── `lib/acoes/instrutores.ts`        # + sincronizarDisciplinasInstrutor(idInstrutor, idsGrade) [NOVO]
└── `lib/supabase/server.ts`                # o SHA do commit bump

app/
├── `app/(app)/instrutores/page.tsx`   # + painelAtribuicaoDisciplinasHtmlInstrutor_, filtrarPainelDisciplinasInstrutor_,
│                           #   coletarDisciplinasSelecionadasInstrutor_ [NOVOS]; renderizarPainelEdicaoInstrutor_
│                           #   e salvarEdicaoInstrutor_ [MODIFICADOS]
└── `app/layout.tsx`              # o SHA do commit_FRONTEND bump

tests/
├── regras_de_negocio_backend.test.ts   # + testes de sincronizarDisciplinasInstrutor (criar/reativar/desativar/no-op)
└── ficha_formulario_instrutores.test.ts # + testes de filtragem/coleta/rótulo do painel novo
```

**Structure Decision**: Projeto único já modularizado por camada (`lib/acoes/` +
`app/`), sem separação de pastas por feature — mesma estrutura de todas as specs
anteriores desta sessão. Nenhuma pasta nova é criada; a feature inteira cabe em código adicionado a
2 arquivos já existentes (`lib/acoes/instrutores.ts`, `app/(app)/instrutores/page.tsx`) mais os 2 `o SHA do commit`.
