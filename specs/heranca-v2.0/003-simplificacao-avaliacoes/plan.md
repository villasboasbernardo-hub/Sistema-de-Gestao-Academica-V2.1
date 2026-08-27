# Implementation Plan: Épico I — Simplificação do Módulo de Avaliações

**Branch**: `003-simplificacao-avaliacoes` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-simplificacao-avaliacoes/spec.md`

## Summary

Este épico estende `lib/acoes/avaliacoes.ts` (criado pelo Épico E) com o que ainda faltava para
fechar o módulo de Avaliações, e **corrige uma premissa errada que o próprio Épico E carregava**:
agendar uma avaliação não consome tempo de aula — só a aplicação efetiva registrada no DSA consome
(RN-AVAL-02 revisada v1.4, correção de Bernardo durante este planejamento, já registrada em
`docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` e `docs/arquitetura/01-schema.md`). Em
consequência: (0) `registrarAvaliacao()` perde a exigência de `TA_Inicial`/`Tempos_Consumidos` —
vira função de **agendamento** puro; uma função nova, `aplicarAvaliacaoNoDsa()`, registra a
aplicação efetiva (só aí a CHD sobe) — a mesma linha, atualizada, nunca um segundo cadastro
(research.md, achado 0); (1) `registrarAvaliacao()` volta a exigir habilitação do **aplicador**
(`ID_Instrutor_Responsavel`) — a checagem que a V1.0 tinha (``lib/` (monólito da v1.0, hoje dividido por domínio)`, linha 928-930) e que o
Épico E removeu por interpretação larga demais de RN-INST-01 delimitada, que só isenta o
**fiscal**; (2) acrescenta `registrarVistaProva()` — nenhuma função hoje escreve os campos de
vista; (3) acrescenta `getPainelavaliacoesCurso()`, adaptação de `getDashboardavaliacoes` (V1.0,
``lib/` (monólito da v1.0, hoje dividido por domínio)` linha 952), agora classificando situação por presença de `TA_Inicial` + comparação de
data (não mais por um `Status` sempre `Concluída` na criação); (4) `getDsaSemanal()` ganha a lista
de avaliações agendadas-mas-não-aplicadas da semana, como sugestão na prévia do DSA (RF pedido
diretamente por Bernardo, não estava no backlog original do documento 06); (5) acrescenta exclusão
lógica (`Status = Cancelada`) via um `crudExcluir` mínimo.

**Achado de planejamento herdado (ainda válido):** FR-009/FR-010 (sinalização automática de vista
atrasada) já estão **fisicamente resolvidos** pela coluna `avaliacoes.Status_Vista`, `FORMULA`
nativa do banco entregue pelo Épico C. O backend só lê e exibe.

**Achado de revisão do `/speckit-analyze` aplicado:** RN-INST-01 (Risco Alto) ganha teste nomeado
na suíte de invariantes nesta feature — não tinha nenhum antes, apesar de já ser Risco Alto desde o
documento 04 original (achado C1 do relatório de análise).

**Bloqueio conhecido, herdado do Épico E**: a implementação só pode ser validada de ponta a ponta
contra o banco V2.0 publicada — já resolvido operacionalmente (banco de produção desde
2026-08-14, deploy via `o fluxo Git → Vercel`), mas registrado aqui pela mesma razão que no plano do Épico E.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reusa Tailwind CSS + shadcn/ui como dependência versionada no `package.json` (frontend) e os serviços nativos
do Next.js já em uso (o cliente Supabase, `a transação do PostgreSQL`).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — mesmas abas já entregues pelo Épico C, schema inalterado por este
plano: `avaliacoes`, `avaliacoes_planejadas`, `disciplinas`, `instrutor_disciplina`,
`instrutores`, `turmas`.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mesmo volume pequeno do Épico E (24 cursos, 111 avaliações reais,
118 planejadas).

**Constraints**: nenhum arquivo `.ts` depende de outro por código de nível superior (gotcha crítico
do `CLAUDE.md`); nenhuma linha é apagada fisicamente — exclusão lógica via `Status = Cancelada`
(C-05); `Status` de um lançamento nunca é escolhido manualmente pelo Operador, só derivado
(Clarifications 2026-08-14 do spec).

**Scale/Scope**: 24 cursos, 118 itens em `avaliacoes_planejadas`, 111 lançamentos reais em
`avaliacoes`, 798 vínculos em `instrutor_disciplina`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Re-check pós-Fase 1 (2026-08-14)**: `research.md`, `data-model.md` e `contracts/` não introduziram
nada além do já avaliado abaixo — tabela permanece válida.

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS. Toda FR cita RF-/RN- (RN-AVAL-01 revisada, RN-AVAL-02 revisada v1.4, RN-INST-01 delimitada, RN-EVT-03). O ponto que a Fase 1 deixava em aberto (mecanismo de derivação da situação de execução) foi levado ao responsável em `/speckit-clarify` e depois corrigido por ele mesmo (agendamento não consome TA) — ambas as decisões registradas em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`, nunca assumidas silenciosamente. |
| II. Preservação de Regras de Negócio | PASS, com nota: este épico **corrige duas regressões reais** introduzidas pelo Épico E — (a) RN-INST-01 delimitada isenta só o fiscal, não o aplicador; (b) RN-AVAL-02 não autoriza consumo de TA no agendamento, só na aplicação no DSA. Ambas as correções são o próprio objetivo do épico, não efeito colateral. |
| III. Restrição de Plataforma | PASS. Nenhuma dependência nova, nenhum framework, mesma stack do Épico E. |
| IV. Integridade do Histórico | PASS. `crudExcluir` novo é exclusão lógica (`Status = Cancelada`), nunca `deleteRow` — segue C-05. |
| V. Degradação Segura e Alerta-Não-Bloqueio | PASS. Item planejado sem correspondência nunca quebra o painel (`Sem correspondência`, RN-AVAL-01); vista/avaliação atrasada são sinalizações informativas, nunca bloqueio — o lançamento continua podendo ser aplicado/corrigido a qualquer momento mesmo depois de "Atrasado". |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS. Fatias por User Story (P1→P4), cada uma testável isoladamente; `o SHA do commit` incrementado a cada implantação. |
| VII. Configuração Sobre Constante | PASS. O limite de 7 dias corridos da vista já é `FORMULA` nativa do banco (Épico C); o prazo de atraso da própria avaliação (research.md, achado 7) é zero-graça por decisão explícita, documentado como ajustável via `config_parametros` se precisar virar administrável no futuro — nenhum literal novo introduzido em `.ts` por este plano. |
| VIII. Rastreabilidade | PASS — **corrigido nesta revisão**: `painelavaliacoesCurso_` ganha teste Node nomeado por RN-AVAL-01; RN-INST-01 (Risco Alto) e RN-AVAL-02 (Risco Alto) ganham teste nomeado na suíte de invariantes pela primeira vez (achado C1/E1 do `/speckit-analyze`), usando o harness de mock o cliente Supabase já estabelecido em `tests/unidade/regras_de_negocio_backend.test.ts`. |
| IX. Contenção de Escopo | PASS. `Formula_MF`/`Carater` permanecem fisicamente no schema (achado k, Épico C). A prévia do DSA entregue é lista de sugestões, não a grade posicional por TA nem motor de sugestão — isso continua sendo o Épico H (research.md, achado 6). AppState completo (Épico D), Design System completo (Épico A) e RBAC ampliado (Épico F) continuam fora. |

Nenhuma violação. `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/003-simplificacao-avaliacoes/
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
│   │   ├── `lib/supabase/server.ts`             # ALTERADO — acrescenta 'instrutores'/'instrutor_disciplina'
│   │   ├── `lib/dominio/regras-normativas.ts`  # ALTERADO — acrescenta instrutorHabilitado_ (RN-INST-01, portada
│   │   │                       #   de `lib/` (monólito da v1.0, hoje dividido por domínio) V1.0 linha 751, adaptada a instrutor_disciplina)
│   │   ├── `lib/acoes/crud.ts`             # ALTERADO — acrescenta crudExcluir (exclusão lógica genérica,
│   │   │                       #   Status=Cancelada) e CRUD_CONFIG/COLUNAS_FORMULA continuam
│   │   │                       #   cobrindo só as abas que o projeto já escreve
│   │   ├── `lib/acoes/avaliacoes.ts`       # ALTERADO — registrarAvaliacao corrigida (agendamento puro,
│   │   │                       #   FR-001/FR-013); NOVAS: aplicarAvaliacaoNoDsa (FR-002/FR-003),
│   │   │                       #   registrarVistaProva (FR-011/FR-012/FR-014),
│   │   │                       #   painelavaliacoesCurso_ (núcleo puro, RN-AVAL-01) +
│   │   │                       #   getPainelavaliacoesCurso (I/O), cancelarAvaliacao (usa crudExcluir)
│   │   └── `lib/acoes/dsa.ts`              # ALTERADO — getDsaSemanal acrescenta avaliacoesAgendadasNaSemana
│   │                           #   (FR-002, sugestão na prévia do DSA — research.md achado 6)
│   └── frontend/
│       ├── `app/(app)/atividades/page.tsx`  # ALTERADO — formAvaliacao vira só agendamento: remove os
│       │                       #   campos TA inicial/tempos consumidos (não existem mais em
│       │                       #   registrarAvaliacao) e a mensagem de sucesso não cita mais
│       │                       #   chdAtualizada (agendar não altera CHD, User Story 1)
│       ├── `app/(app)/cursos/[curso]/page.tsx`      # ALTERADO — novo bloco "Avaliações" no painel do curso (User
│       │                       #   Story 2/3) + formulário de registro de vista de prova (User
│       │                       #   Story 4), no mesmo padrão dos blocos de teto/totalizadores
│       │                       #   já existentes
│       └── `app/(app)/turmas/[turma]/dsa/page.tsx`        # ALTERADO — lista de avaliações agendadas-não-aplicadas da
│                               #   semana consultada, com ação "aplicar no DSA" (User Story 1)
├── tests/
│   ├── regras_normativas.test.ts          # ALTERADO — novos casos para painelavaliacoesCurso_ (RN-AVAL-01)
│   ├── regras_de_negocio_backend.test.ts  # ALTERADO — novos describe para RN-INST-01 e RN-AVAL-02
│   │                                       #   (achado C1/E1 do /speckit-analyze, mesmo harness de
│   │                                       #   mock o cliente Supabase já usado para RN-CRUD-02)
│   └── pendentes.test.ts                  # ALTERADO — remove os stubs que este épico implementa de verdade
└── specs/003-simplificacao-avaliacoes/   # esta feature
```

**Estrutura selecionada**: extensão pura dos arquivos que o Épico E já criou — nenhum arquivo novo
de infraestrutura. `app/(app)/cursos/[curso]/page.tsx` e `app/(app)/turmas/[turma]/dsa/page.tsx` são os únicos arquivos de frontend tocados —
o segundo porque a prévia do DSA (User Story 1) é onde a avaliação agendada precisa aparecer como
sugestão, e a tela já existe com totalizadores desde o Épico E.

## Complexity Tracking

*Sem violações do Constitution Check — seção vazia.*
