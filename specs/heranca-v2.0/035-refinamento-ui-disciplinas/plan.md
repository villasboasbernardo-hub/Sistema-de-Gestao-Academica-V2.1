# Implementation Plan: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

**Branch**: `master` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/035-refinamento-ui-disciplinas/spec.md`

## Summary

`app/(app)/disciplinas/page.tsx` ganha um estado inicial agregado (todas as disciplinas de todos os cursos,
turmas do ano vigente com `Status` `Planejada`/`Ativa`/`Concluida` — nunca `Cancelada`), datas
estritamente em `dd/mm/aaaa` (frontend mascarado + correção real de um bug de escrita no backend),
o painel de edição como modal Tailwind CSS centralizado, e reuso de `formatarNomeInstrutor_` no lugar
da formatação ad-hoc atual. A investigação de planejamento encontrou 2 achados reais que mudam a
implementação em relação ao pedido original:

1. **A pré-condição "todos os cursos, turmas do ano vigente" já está disponível no cliente sem
   nenhuma chamada nova** — `AppState.ctx.turmas` (`app/layout.tsx` + `lib/supabase/server.ts`) já carrega `idCurso`/`anoLetivo`/
   `status` de todas as turmas no boot da sessão. O único dado que falta é `turma_disciplina` +
   CH Cumprida cruzando múltiplas turmas de uma vez — e é aí que um novo endpoint em lote é
   necessário (FR-004.1/SC-006, já decidido no `/speckit-clarify`), para não repetir o anti-padrão
   de N+1 corrigido na spec 017.
2. **O "parser de gravação de data" que o pedido original pedia para o backend já existe e já é
   timezone-safe (`isoParaDate_`, `lib/acoes/crud.ts`/`lib/supabase/server.ts`) — mas nunca é acionado para
   `Previsao_Inicio`/`Previsao_Termino`.** `ehColunaData_(h)` (``lib/supabase/server.ts`:173`) só reconhece colunas
   cujo nome começa com `Data`, contém `_Data` ou `Data_` — `Previsao_Inicio`/`Previsao_Termino` não
   batem em nenhum desses padrões, então `crudAtualizar`/`crudCriar` gravam o valor bruto recebido
   do frontend sem passar por `isoParaDate_`, para essas duas colunas especificamente (confirmado
   lendo ``lib/acoes/crud.ts`:75-139`). Não é preciso "criar" nenhum parser novo — só ensinar `ehColunaData_` a
   reconhecer esses 2 nomes de coluna, o mesmo motor genérico já protege todo o resto (RN-CRUD-01).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita Tailwind CSS + shadcn/ui (CSS + o pacote `tailwindcss` + `shadcn/ui`,
já carregado em `app/globals.css` — primeiro uso real do componente `.modal` nativo do bundle, que já
está presente desde a spec 025 para o Toast) e `formatarNomeInstrutor_` (`components/ciaara/`, já existente).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — leitura de `turmas` (já em `AppState.ctx.turmas`, sem leitura
nova), `turma_disciplina`, `disciplinas`, `instrutores`, `registros_aula` (nova
função de agregação em lote); escrita em `turma_disciplina` (sem mudança de schema).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: A tabela de estado inicial MUST carregar com um número fixo de leituras de
aba, independente do número de turmas do ano vigente (FR-004.1/SC-006) — mesmo padrão já usado por
`getContextoInicial`/`getEstatisticasDisciplinas`/`getDisciplinasDaTurmaComRitmo` (ler cada aba
relevante 1 vez, agregar em memória por chave composta `ID_Turma`+`ID_Grade`), nunca 1 leitura por
turma.

**Constraints**: RNF-PLAT-01..04 (constitution Princípio III) — sem framework/bundler novo, Tailwind CSS
`.modal` já é parte do bundle já carregado. Princípio VI (mudança cirúrgica) — a correção de
`ehColunaData_` é uma mudança de 1 função já existente, não um "parser" novo. Princípio V (degradação
segura) — turma/curso sem disciplina no ano vigente não gera erro, só uma tabela vazia com mensagem.

**Scale/Scope**: ~29 turmas ativas totais no sistema (baseline da sessão), subconjunto do ano vigente
tipicamente menor; ~210 linhas de `turma_disciplina`, ~1.753+ linhas de `registros_aula`
— mesma ordem de grandeza já manipulada em memória por `lib/acoes/estatisticas.ts`/``app/layout.tsx` + `lib/supabase/server.ts`` sem problema,
desde que a leitura seja em lote (não por turma).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Não introduz nenhuma regra `RF-`/`RN-` nova — é UX/UI e correção de um
  bug de escrita já existente, não uma regra de negócio. A única ambiguidade real (status de turma
  incluído na tabela agregada) foi levada a Bernardo no `/speckit-clarify`, não inferida. PASS.
- **II. Preservação de Regras de Negócio**: A cascata Curso→Turma existente (specs 030/031) e a
  edição de CH/Prioridade/Início/Término/Instrutores permanecem com o mesmo comportamento — a tabela
  de estado inicial é aditiva (só define o que é mostrado antes de qualquer seleção). Nenhuma função
  de backend muda de assinatura; `ehColunaData_` ganha reconhecimento de 2 nomes de coluna a mais,
  estritamente aditivo (colunas que já deveriam ser tratadas como data e não eram). PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL + React + Tailwind CSS, sem dependência nova —
  `.modal` já faz parte do o pacote `tailwindcss` + `shadcn/ui` já carregado. PASS.
- **IV. Integridade do Histórico**: Nenhuma migração, nenhuma linha apagada. A correção de
  `ehColunaData_` é comportamento de escrita futura, não reescreve dado já gravado. PASS.
- **V. Degradação Segura**: Nenhuma turma do ano vigente → tabela vazia com mensagem (FR edge case);
  `ID_Instrutor` órfão → degrada para o ID cru (FR-013, mesmo padrão já usado no resto do projeto).
  PASS.
- **VI. Mudança Cirúrgica**: 1 função nova (`getDisciplinasAnoVigente`, em `lib/acoes/cronograma.ts`, arquivo já
  dono da agregação cross-turma), 1 função existente estendida (`ehColunaData_`), funções novas de
  frontend isoladas em `app/(app)/disciplinas/page.tsx` (máscara de data, wiring do modal Tailwind CSS, aplicação
  de `formatarNomeInstrutor_` nos pontos já mapeados). Nenhum arquivo novo de backend. PASS.
- **VII. Configuração sobre Constante**: N/A — nenhum limite normativo/dado anual do PROENS envolvido;
  "ano vigente" é sempre calculado a partir da data corrente (FR-002), nunca um literal fixo.
- **VIII. Rastreabilidade**: Tarefas citarão `FR-XXX`; commit final cita o épico (035). Cobertura de
  teste nova para `getDisciplinasAnoVigente`/`ehColunaData_`/máscara de data.
- **IX. Contenção de Escopo**: Escopo contido às 4 correções do pedido original, sem generalizar
  `mascaraDataBr_`/o modal Tailwind CSS para outros módulos além de Disciplinas (mesmo padrão de
  `mascaraCpf_` viver só em `app/(app)/instrutores/page.tsx`, não em `components/ciaara/`, até um segundo módulo
  precisar). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/035-refinamento-ui-disciplinas/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   └── backend-functions.md   # getDisciplinasAnoVigente (nova) + ehColunaData_ (estendida)
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── `lib/acoes/cronograma.ts`      # ALTERADO — getDisciplinasAnoVigente(ano) nova, mesmo padrão de
│   │                       # getDisciplinasDaTurmaComRitmo mas cross-turma/cross-curso
│   └── `lib/supabase/server.ts`             # ALTERADO — ehColunaData_ reconhece Previsao_Inicio/Previsao_Termino
│
└── frontend/
    └── `app/(app)/disciplinas/page.tsx`   # ALTERADO — estado inicial agregado, máscara de data dd/mm/aaaa,
                                 # modal Tailwind CSS centralizado, formatarNomeInstrutor_ aplicada

tests/
├── regras_de_negocio_backend.test.ts  # ALTERADO — casos novos para getDisciplinasAnoVigente e
│                                        # para a extensão de ehColunaData_
└── regras_ui_dados.test.ts             # ALTERADO — casos novos para mascaraDataBr_/dataBrParaIso_/
                                          # isoParaDataBr_ e para a integração com
                                          # formatarNomeInstrutor_ no módulo de Disciplinas
```

**Structure Decision**: Mesma estrutura de todas as specs da sessão. 2 arquivos de backend tocados
(1 função nova, 1 estendida) + 1 arquivo de frontend reescrito nos pontos relevantes — sem arquivo
novo de backend, sem módulo novo (diferente de `lib/acoes/liq.ts`/`lib/acoes/os-instrutoria.ts`, este épico não introduz
nenhuma entidade nem regra de negócio nova, só corrige apresentação e um bug de escrita já latente).

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
