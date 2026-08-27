# Implementation Plan: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

**Branch**: `master` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/036-disciplinas-crud-antiguidade/spec.md`

## Summary

Ordena os checkboxes de instrutores do painel de edição de Disciplinas por precedência militar
(reaproveitando a escala já auditada do Módulo de Instrutores, não um array novo); expande o
painel de edição para cobrir todos os campos reais de `disciplinas` (Código/Nome/Carga
Horária/Modo de Atribuição) mais a Prioridade (hoje só em `config_parametros`, nunca lida de volta
para a tela); e adiciona "Nova Disciplina", que cria em uma operação tanto a linha de catálogo
(`disciplinas`) quanto o vínculo com a turma escolhida (`turma_disciplina`), com rollback
automático (exclusão lógica) se a segunda gravação falhar. A investigação de planejamento
encontrou 3 achados estruturais que mudam a implementação:

1. **`ID_Grade` não é gerado pelo mecanismo genérico `gerarProximoId_`** — é uma string composta
   `"{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}"`, onde `ID_Disciplina` é um inteiro
   sequencial único em toda a aba (não por curso). `ID_Disciplina` é gerado via
   `gerarProximoIdSequencial_` (já existe, criada na spec 016 para `instrutores` — mesmo padrão
   de "sequencial puro sem prefixo", reaproveitado sem mudança); `ID_Grade` é montado por
   concatenação direta, função nova e pequena.
2. **Bug real confirmado em `CRUD_CONFIG['turma_disciplina']`**: `prefixo` está `''`, mas as 210+
   linhas reais usam `TDI-NNNNNN`. Corrigir para `prefixo: 'TDI'` é suficiente — `gerarProximoId_`
   (já genérico) passa a gerar o ID certo automaticamente, sem função nova.
3. **Prioridade não tem nenhuma função pública de leitura** — `lerPesosPrioridadeDisciplina_`
   (`lib/dominio/motor-preditivo.ts`) é privada, usada só internamente pelo motor preditivo. Uma função pública
   nova (`getPesosPrioridadeDisciplinas`) expõe o mesmo mapa ao frontend, sem duplicar a leitura de
   `config_parametros`.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita Tailwind CSS + shadcn/ui (modal já introduzido na spec
035), `crudCriar`/`crudAtualizar`/`crudExcluir` (`lib/acoes/crud.ts`), `gerarProximoIdSequencial_` (`lib/supabase/server.ts`,
spec 016), `definirPrioridadeDisciplina`/`lerPesosPrioridadeDisciplina_` (`lib/dominio/motor-preditivo.ts`,
Épico G).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — leitura/escrita de `disciplinas` (primeira escrita de criação de
linha desde a migração original), `turma_disciplina` (primeira escrita de criação de linha pelo
motor genérico — todas as linhas reais até aqui vieram de script Python de migração),
`config_parametros` (primeira leitura pública do peso de Prioridade); leitura de `instrutores`
(já existente, `Posto_Graduacao` para a ordenação).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Nenhuma meta nova de leitura em lote — o cadastro/edição são operações
pontuais (1 disciplina por vez), não uma leitura agregada como a spec 035. `getPesosPrioridadeDisciplinas`
lê `config_parametros` uma única vez por chamada (mesmo padrão de `lerPesosPrioridadeDisciplina_`
já usado pelo motor preditivo), nunca por disciplina.

**Constraints**: RNF-PLAT-01..04 (Princípio III) — sem framework/bundler novo. Princípio IV
(Integridade do Histórico) — o rollback do cadastro (FR-013) usa exclusão lógica (`Status`
inativo/cancelado), nunca remove a linha fisicamente, mesmo sendo uma linha recém-criada na mesma
operação. Princípio VII — nenhum limite normativo novo, nada de literal de configuração.

**Scale/Scope**: ~175 disciplinas em `disciplinas`, ~210 em `turma_disciplina` — mesma ordem de
grandeza já manipulada por toda spec anterior desta sessão; a propagação de Código/Nome (FR-006.1)
toca no máximo o número de turmas vinculadas à disciplina editada (tipicamente 1-5), nunca a aba
inteira.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Implementa `RF-DADOS-06` (unicidade `ID_Curso`+`Cod_Disciplina`,
  documento de arquitetura `01-schema.md`, nunca antes codificada) pela primeira vez — não é regra
  nova, é a primeira vez que o código a aplica de fato. Ambiguidades reais (Turma obrigatória no
  cadastro; propagação de Código/Nome; rollback de falha parcial) foram levadas a Bernardo via
  `/speckit-clarify` antes desta fase, não inferidas. PASS.
- **II. Preservação de Regras de Negócio**: Nenhuma função existente muda de assinatura —
  `atualizarDisciplina` ganha validação/propagação internas, mas o contrato de chamada (idGrade,
  obj) e o formato de retorno continuam idênticos. A cascata Curso→Turma e a Visão 1/Visão 2
  (specs 030/031) permanecem intocadas — o formulário de cadastro é aditivo. PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL + React + Tailwind CSS, sem dependência nova.
  PASS.
- **IV. Integridade do Histórico**: FR-013 (rollback do cadastro) usa exclusão lógica — mesmo
  mecanismo de `crudExcluir` (`Status` inativo, nunca `deleteRow`), mesmo tratando-se de uma linha
  criada na mesma operação que falhou. PASS.
- **V. Degradação Segura**: Instrutor com posto fora da escala conhecida cai ao final da lista, sem
  lançar exceção (FR-003, mesmo padrão de `ordenarInstrutoresPorAntiguidade_` já existente).
  Disciplina sem nenhuma turma vinculada ainda não é tratada como erro (Edge Case do spec.md).
  PASS.
- **VI. Mudança Cirúrgica**: 1 função nova de backend (`cadastrarDisciplina`, `lib/acoes/disciplinas.ts`,
  arquivo já dono de `atualizarDisciplina`), 1 função nova pequena (`getPesosPrioridadeDisciplinas`,
  `lib/dominio/motor-preditivo.ts`, arquivo já dono do mapa de prioridades), 1 correção de 1 linha
  (`CRUD_CONFIG['turma_disciplina'].prefixo`, `lib/acoes/crud.ts`), `atualizarDisciplina` estendida (mesmo
  arquivo). Frontend: só `app/(app)/disciplinas/page.tsx`. PASS.
- **VII. Configuração sobre Constante**: N/A — nenhum limite normativo/dado anual do PROENS
  envolvido.
- **VIII. Rastreabilidade**: Tarefas citarão `FR-XXX`; commit final cita o épico (036). Cobertura de
  teste nova para `cadastrarDisciplina` (incluindo o caminho de rollback), unicidade, propagação e
  `getPesosPrioridadeDisciplinas`.
- **IX. Contenção de Escopo**: Escopo contido aos 3 itens do pedido original + os achados estruturais
  que os viabilizam (ID composto, bug de prefixo, unicidade) — nenhuma generalização além do
  necessário (ex.: a correção do prefixo de `turma_disciplina` não é estendida especulativamente a
  nenhuma outra tabela). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/036-disciplinas-crud-antiguidade/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   └── backend-functions.md   # cadastrarDisciplina (nova) + atualizarDisciplina (estendida) +
│                                # getPesosPrioridadeDisciplinas (nova) + CRUD_CONFIG (corrigido)
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── `lib/acoes/disciplinas.ts`     # ALTERADO — cadastrarDisciplina (nova); atualizarDisciplina estendida
│   │                       # (unicidade de Código + propagação para turma_disciplina)
│   ├── `lib/dominio/motor-preditivo.ts`  # ALTERADO — getPesosPrioridadeDisciplinas (nova, wrapper público de
│   │                       # lerPesosPrioridadeDisciplina_ já existente)
│   └── `lib/acoes/crud.ts`             # ALTERADO — CRUD_CONFIG['turma_disciplina'].prefixo: '' → 'TDI'
│                            # (corrige bug latente, research.md §2)
│
└── frontend/
    └── `app/(app)/disciplinas/page.tsx`   # ALTERADO — ORDEM_ANTIGUIDADE_POSTO/ordenação (duplicada de
                                 # `app/(app)/instrutores/page.tsx`, mesmo padrão já aceito no projeto);
                                 # painel de edição expandido (Código/Nome/Carga Horária/
                                 # Prioridade/Modo de Atribuição); botão "Nova Disciplina" +
                                 # formulário de cadastro reaproveitando a mesma estrutura

tests/
├── regras_de_negocio_backend.test.ts  # ALTERADO — casos novos para cadastrarDisciplina (incluindo
│                                        # rollback), unicidade de Código, propagação,
│                                        # getPesosPrioridadeDisciplinas, prefixo de turma_disciplina
└── regras_ui_dados.test.ts             # ALTERADO — casos novos para a função de ordenação por
                                          # antiguidade em `app/(app)/disciplinas/page.tsx`
```

**Structure Decision**: Mesma estrutura de todas as specs da sessão. 3 arquivos de backend tocados
(1 função nova pequena + 1 função nova + 1 correção de 1 linha + 1 função estendida) + 1 arquivo de
frontend — sem arquivo novo de backend, sem módulo novo.

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
