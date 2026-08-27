# Implementation Plan: Épico F — RBAC Ampliado e Gestão de Usuários

**Branch**: `004-rbac-ampliado-usuarios` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-rbac-ampliado-usuarios/spec.md`

## Summary

O código V2.0 herdado dos Épicos E/I só reconhece dois perfis (`Admin`, `Operador`) em **todo**
`exigirFuncao(...)` do projeto, inclusive em funções de **leitura** (`getContextoInicial`,
`getPainelavaliacoesCurso`, `getCronos`, `getDsaSemanal`, `getRelatorio`, `crudListar`) — os
outros 7 perfis do documento 01 (todos com pelo menos leitura autorizada) hoje nem conseguem
carregar o sistema. Este plano: (1) introduz um domínio canônico dos 9 perfis (`PERFIS`, `lib/supabase/server.ts`)
e dois agrupamentos reutilizáveis (leitura total vs. escopo restrito); (2) redesenha `CRUD_CONFIG`
para ter `leitura`/`escrita` por aba, em vez do `['Admin','Operador']` hardcoded em `crudListar`;
(3) acrescenta um `crudAtualizar` genérico (`lib/acoes/crud.ts`) — **já existe em V1.0**
(`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 694) e nunca foi portado; (4) amplia `CRUD_CONFIG` para `usuarios`,
`instrutores` e `instrutor_disciplina`, que **já eram genéricas em V1.0** (mesmo arquivo, linhas
63-77) — cadastrar/editar/desativar usuário e instrutor não exige função nova, só a entrada de
config e a tela; (5) acrescenta o guard de escopo de curso (`exigirEscopoCurso_`, `lib/supabase/middleware.ts` + policies RLS) chamado
por toda função de leitura que recebe `idCurso`/`idTurma`, resolvendo a Opção A da sessão de
`/speckit-clarify` (Regular/Expedito/Estagio_Qualificacao vs. `cursos.Classificacao`,
EAD_Semipresencial vs. `turmas.Modalidade`); (6) corrige um gap real encontrado durante o
planejamento: `instrutorHabilitado_` (Épico I) só checa `instrutor_disciplina.Status`, nunca
`instrutores.Status` — um instrutor desativado por este épico continuaria "habilitado" até seus
vínculos serem tocados individualmente.

**Achado de planejamento:** a User Story 3 (cadastro de instrutor) é **muito mais barata** do que
a spec estimava. V1.0 nunca teve funções bespoke de cadastro/edição de instrutor ou usuário — usava
o mesmo motor `crudCriar`/`crudAtualizar` genérico de todas as outras abas, com só duas exceções
especiais (`excluirInstrutorComVinculos`/`reativarInstrutor`, que V2.0 já cobre de forma mais
simples via `crudExcluir` genérico do Épico I). A User Story 3 vira, na prática, configuração +
telas, não um port de lógica de negócio complexa.

**Correção pós-`/speckit-analyze` (achados C1/H1):** a primeira versão deste plano deixou FR-009
(escrita da Divisão de Orientação Educacional e Pedagógica em disciplinas/avaliações planejadas —
parte do próprio cenário 5 da User Story 1) sem nenhuma tarefa. Corrigido com uma **User Story 4**
nova (`lib/acoes/disciplinas.ts`/`app/(app)/disciplinas/page.tsx`, mesmo padrão barato do achado acima — V1.0 também
tratava `Cad_Matérias`/`Avaliacoes_Planejadas` como `CRUD_CONFIG` genérico, research.md achado 7).
Também corrigido: a ampliação de leitura da User Story 1 destrava 7 perfis para alcançar
`app/(app)/atividades/page.tsx`/`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` sem esconder os botões de escrita
dessas telas — retrofit acrescentado à própria User Story 1 (research.md achado 8).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `usuarios`, `usuario_curso`, `instrutores`,
`instrutor_disciplina`, `cursos`, `turmas`, todas já entregues pelo Épico C. Schema
inalterado por este plano.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mesmo volume pequeno dos épicos anteriores (24 cursos, ~29 turmas,
177 instrutores, poucas dezenas de usuários).

**Constraints**: nenhum arquivo `.ts` depende de outro por código de nível superior; toda função de
leitura que recebe `idCurso`/`idTurma` passa a chamar `exigirEscopoCurso_`/`exigirEscopoTurma_`
antes de devolver dado (RN-RBAC-02, "independentemente do que a interface mostra"); nenhuma
exclusão física de usuário/instrutor (C-05); autenticação continua exclusivamente por conta 
(RF-AUTH-01, decisão D1).

**Scale/Scope**: 9 perfis, ~24 cursos, ~29 turmas, 177 instrutores, poucas dezenas de usuários
cadastrados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Re-check pós-Fase 1 (2026-08-14)**: `research.md`, `data-model.md` e `contracts/` não introduziram
nada além do já avaliado abaixo — tabela permanece válida.

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS. Toda FR cita RF-/RN- (RF-AUTH-01 a 05, RN-RBAC-01, RN-RBAC-02 revisada). A matriz de perfis vem literalmente do documento 01 §2.2, não inferida. |
| II. Preservação de Regras de Negócio | PASS, com nota: este épico **corrige** um gap real de RN-INST-01 (instrutor desativado continuava "habilitado") — achado durante o planejamento, não uma regressão introduzida por este plano. |
| III. Restrição de Plataforma | PASS. Nenhuma dependência nova, nenhum framework. Autenticação continua só por conta  (RF-AUTH-01). |
| IV. Integridade do Histórico | PASS. `crudAtualizar` (novo, genérico) nunca sobrescreve o ID (mesmo padrão de V1.0); desativação de usuário/instrutor é sempre `Status`, nunca `deleteRow`. |
| V. Degradação Segura e Alerta-Não-Bloqueio | PASS. `Encarregado de Curso` sem vínculo abre tela vazia, não erro (RN-DEG-01); `Escopo_Curso` vazio é tratado como `Geral`, nunca bloqueia silenciosamente um Operador pré-existente. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS. Fatias por User Story (P1→P2), cada uma testável isoladamente. |
| VII. Configuração Sobre Constante | PASS. Domínio de perfis e agrupamentos vivem em `lib/supabase/server.ts` como constantes nomeadas (não literais espalhados) — mesmo espírito do princípio, ainda que não seja `config_parametros` (perfis são estrutura de código, não dado administrável em runtime, mesmo tratamento já dado a `TABELAS`). |
| VIII. Rastreabilidade | PASS. RN-RBAC-01/RN-RBAC-02 (ambas Risco Alto) ganham teste nomeado nesta feature — RN-RBAC-01 nunca teve nenhum antes. |
| IX. Contenção de Escopo | PASS, com decisão explícita: a restrição de escopo por curso é aplicada em `getContextoInicial` (seletor) e num guard (`exigirEscopoCurso_`) chamado pelas funções de leitura que este e os épicos anteriores já entregaram (`getPainelavaliacoesCurso`, `getCronos`, `getDsaSemanal`, `getRelatorio`, `calcularTetosDoCurso`) — retrofit completo de escopo em toda função futura de todo épico é responsabilidade de cada épico que a criar, não deste (ver research.md, achado 4). |

Nenhuma violação. `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/004-rbac-ampliado-usuarios/
├── plan.md              # este arquivo
├── research.md          # Fase 0 — achados técnicos e decisões de escopo
├── data-model.md        # Fase 1 — validações e forma de dado na camada de aplicação
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
│   │   ├── `lib/supabase/server.ts`             # ALTERADO — acrescenta PERFIS (domínio dos 9 + agrupamentos
│   │   │                       #   PERFIS_LEITURA_TOTAL/PERFIS_DIVISAO_ADMIN_ACADEMICA/
│   │   │                       #   PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA), 'usuario_curso'
│   │   ├── `lib/supabase/middleware.ts` + policies RLS             # ALTERADO — acrescenta exigirEscopoCurso_/exigirEscopoTurma_
│   │   │                       #   (guard de leitura por escopo, RN-RBAC-02)
│   │   ├── `lib/dominio/regras-normativas.ts` # ALTERADO — acrescenta instrutorHabilitado_ corrigida (checa
│   │   │                       #   instrutores.Status também) e cursoDentroDoEscopoOperador_
│   │   │                       #   (núcleo puro, Clarifications 2026-08-14)
│   │   ├── `lib/acoes/crud.ts`             # ALTERADO — CRUD_CONFIG ganha leitura/escrita por aba (mais
│   │   │                       #   usuarios/instrutores/instrutor_disciplina/usuario_curso);
│   │   │                       #   crudListar usa cfg.leitura; crudExcluir passa a gravar
│   │   │                       #   cfg.statusInativo (default 'Cancelada', preserva avaliacoes)
│   │   │                       #   em vez de 'Cancelada' fixo; NOVO crudAtualizar genérico
│   │   │                       #   (portado de V1.0 linha 694)
│   │   ├── `app/layout.tsx` + `lib/supabase/server.ts`        # ALTERADO — getContextoInicial aceita todos os 9 perfis, filtra
│   │   │                       #   cursos/turmas por escopo/vínculo
│   │   ├── `lib/acoes/avaliacoes.ts`       # ALTERADO — getPainelavaliacoesCurso chama exigirEscopoCurso_
│   │   ├── `lib/acoes/cronograma.ts`       # ALTERADO — getCronos aceita todos os perfis + exigirEscopoTurma_
│   │   ├── `lib/acoes/dsa.ts`              # ALTERADO — getDsaSemanal aceita todos os perfis + exigirEscopoTurma_
│   │   ├── `lib/acoes/relatorio.ts`        # ALTERADO — getRelatorio aceita todos os perfis + exigirEscopoCurso_
│   │   ├── `lib/acoes/usuarios.ts`         # NOVO — listarusuarios/cadastrarUsuario/atualizarUsuario/
│   │   │                       #   desativarUsuario/vincularUsuarioACurso/
│   │   │                       #   desvincularUsuarioDeCurso (wrappers finos sobre
│   │   │                       #   crudCriar/crudAtualizar/crudExcluir, validação de e-mail
│   │   │                       #   duplicado e de Perfil=Encarregado_Curso para o vínculo)
│   │   ├── `lib/acoes/instrutores.ts`      # NOVO — listarInstrutores/cadastrarInstrutor/atualizarInstrutor/
│   │   │                       #   desativarInstrutor/criarVinculoHabilitacao (idem, wrappers finos)
│   │   └── `lib/acoes/disciplinas.ts`      # NOVO — listarDisciplinas/atualizarDisciplina/
│   │                           #   listaravaliacoesPlanejadas/atualizarAvaliacaoPlanejada (idem,
│   │                           #   wrappers finos — User Story 4, research.md achado 7)
│   └── frontend/
│       ├── `app/(app)/admin/usuarios/page.tsx`    # NOVO — tela de gestão de usuários (Admin), User Story 2
│       ├── `app/(app)/instrutores/page.tsx` # NOVO — cadastro de instrutor + vínculo de habilitação
│       │                       #   (Operador/Divisão de Administração Acadêmica), User Story 3
│       ├── `app/(app)/disciplinas/page.tsx` # NOVO — edição de disciplinas/avaliações planejadas
│       │                       #   (Divisão de Orientação Pedagógica), User Story 4
│       ├── `app/(app)/atividades/page.tsx` # ALTERADO — esconde botões de escrita para perfis fora
│       │                       #   de Admin/Operador (research.md achado 8, RF-AUTH-04)
│       ├── `app/(app)/cursos/[curso]/page.tsx`      # ALTERADO — idem
│       ├── `app/(app)/turmas/[turma]/dsa/page.tsx`        # ALTERADO — idem
│       ├── `app/layout.tsx`          # ALTERADO — rotas novas (#tabusuarios, #tabInstrutores,
│       │                       #   #tabDisciplinas), menu condicional por perfil (RF-AUTH-04)
│       └── `components/ciaara/`         # ALTERADO — AppState.ctx.usuario.perfil disponível para toda
│                               #   view decidir o que mostrar/esconder; helper perfilEm_
├── tests/
│   ├── regras_normativas.test.ts          # ALTERADO — testes para cursoDentroDoEscopoOperador_
│   ├── regras_de_negocio_backend.test.ts  # ALTERADO — testes RN-RBAC-01/RN-RBAC-02 ampliada,
│   │                                       #   instrutorHabilitado_ corrigida, crudAtualizar
│   └── pendentes.test.ts                  # ALTERADO — remove o stub RN-RBAC-01 (T033, `lib/supabase/middleware.ts` + policies RLS)
└── specs/004-rbac-ampliado-usuarios/      # esta feature
```

**Estrutura selecionada**: extensão dos arquivos já existentes + 2 arquivos de backend novos
(`lib/acoes/usuarios.ts`, `lib/acoes/instrutores.ts`) + 2 arquivos de frontend novos — nenhuma infraestrutura nova de
verdade, porque `crudCriar`/`crudAtualizar`/`crudExcluir` genéricos já cobrem o motor de dados
(research.md, achado 2).

## Complexity Tracking

*Sem violações do Constitution Check — seção vazia.*
