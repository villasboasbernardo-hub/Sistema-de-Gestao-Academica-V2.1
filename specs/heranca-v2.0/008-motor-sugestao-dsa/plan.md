# Implementation Plan: Épico H — Motor de Sugestão Automática do Detalhe Semanal de Aula

**Branch**: `008-motor-sugestao-dsa` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-motor-sugestao-dsa/spec.md`

## Summary

Construir a grade semanal do DSA por dia × Tempo de Aula (hoje `lib/acoes/dsa.ts` só devolve totalizadores),
com horário real de cada TA (`horarios_tempos_aula`, já reconstruída no Épico C), detecção de
conflito de instrutor/sala entre todas as turmas do sistema (RN-CONF-01, Risco Alto, sem cobertura
desde o Épico C), impressão A4 paisagem com assinaturas (`responsaveis_curso`, já populada), excluir/
arrastar-e-soltar na grade, e o motor de sugestão simples e determinístico do DSA propriamente dito
(RF-DSA-08/08.1) — que propõe blocos para os espaços livres da semana reaproveitando
`distribuicaoSemanalMateria_` (Épico G) e a lógica de escolha de instrutor por carga/regime
(`escolherInstrutor_`, Épico G), nunca duplicando esses cálculos. Inclui, como pré-requisito
descoberto durante a especificação, a primeira função de lançamento manual de "Aula" do backend V2.0
(`registros_aula` hoje só é lido, nunca escrito) e a validação obrigatória da sugestão
contra uma semana real já lançada manualmente (RF-DSA-08.1(ii), gate antes de qualquer sofisticação
futura).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita `lerAbaComoObjetos_`/`isoParaDate_`/`TABELAS`
(`lib/supabase/server.ts`), `exigirFuncao`/`exigirEscopoTurma_` (``lib/supabase/middleware.ts` + policies RLS`), `crudCriar`/`crudAtualizar`
(`lib/acoes/crud.ts`) para exclusão lógica/edição, `distribuicaoSemanalMateria_` (`lib/acoes/cronograma.ts`, RN-DIST-01)
e `escolherInstrutor_`/`faixaRegimeInstrutor_` (`lib/dominio/motor-preditivo.ts`, RN-2027-06) — os dois últimos
chamados de um arquivo novo, nunca reimplementados.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `registros_aula` (ganha sua primeira função de escrita),
`horarios_tempos_aula` e `responsaveis_curso` (ganham sua primeira função de leitura), `avaliacoes` e
`atividades_nao_letivas` (já lidas, passam a ser posicionadas por TA e entrar na verificação de
conflito) — todas já existentes desde o Épico C (`docs/arquitetura/01-schema.md` §4.3/4.6). Nenhuma
aba nova, nenhuma coluna nova.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: A detecção de conflito de instrutor (FR-004) cruza **todas as turmas do
sistema** para o dia em questão — RN-CONF-01 já exige isso explicitamente. Como o volume total de
turmas ativas do CIAARA-11 é pequeno (dezenas, não milhares — mesma ordem de grandeza já processada
inteira em memória pelo motor preditivo do Épico G), a verificação filtra `registros_aula`/
`avaliacoes` por data antes de comparar pares, sem exigir índice novo nem cache persistido. A geração
da prévia semanal (FR-005) opera sobre uma única turma/semana por vez — escopo muito menor que a
simulação anual do Épico G, sem risco de aproximar o limite de execução da função serverless da Vercel (padrão de 10 s no plano Hobby, 60 s no Pro; operação longa vai para RPC no banco ou rotina de fundo).

**Constraints**: Zero duplicação de `distribuicaoSemanalMateria_` e de `escolherInstrutor_`/
`faixaRegimeInstrutor_` (FR-006); teto rígido de TFM (RN-DIST-03) bloqueia a gravação — único teto
normativo deste épico com bloqueio em vez de aviso (Clarifications 2026-08-15); nenhuma restrição de
sequenciamento de técnica de ensino (achado A-7, rejeitado); RF-INSTR-06/06.1 (preferência de
instrutor) não existe e não é construída aqui (Assumptions do spec); gotcha crítico da plataforma — a fronteira Server/Client Component e o isolamento da chave `service_role`
(constitution) se aplica integralmente aos arquivos `.ts` novos.

**Scale/Scope**: 1 arquivo de backend novo e grande (`lib/dominio/sugestao-dsa.ts` — sugestão semanal + validação
contra semana real), `lib/acoes/dsa.ts` expandido (de totalizadores para grade completa por TA + lançamento
manual de Aula + exclusão/movimentação + impressão + detecção de conflito), 1 arquivo de frontend
expandido (`app/(app)/turmas/[turma]/dsa/page.tsx`, de "versão parcial" para a grade completa com as 6 User Stories).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS — todo FR cita RF-DSA-0x/RF-INSTR-06/RF-HOR-06; todo comportamento cita a RN- correspondente. Decisão de escopo (RF-DSA-03/04/06/07 bundlados) confirmada com Bernardo antes da spec, não inferida silenciosamente. |
| II. Preservação de Regras de Negócio | PASS — RN-CONF-01 (Risco Alto) é o contrato central preservado/testado pela primeira vez (SC-002); RN-DIST-01/02/03 e RN-2027-06 reaproveitados sem reimplementação (FR-006). |
| III. Restrição de Plataforma | PASS — só Next.js/PostgreSQL, nenhum framework novo. |
| IV. Integridade do Histórico | PASS — exclusão de lançamento é lógica (C-05, FR-012), nunca `deleteRow` físico; mover um bloco atualiza o mesmo `ID_Registro`, nunca duplica. |
| V. Degradação Segura | PASS — curso EAD sem `ID_Config_Horario` degrada para lista sem coluna de horário (US1); ausência de responsável vigente degrada para assinatura em branco na impressão (US5); ambos nunca lançam exceção não tratada (RN-DEG-01). Exceção deliberada: teto de TFM **bloqueia** em vez de degradar — RN-DIST-03 marca esse teto como rígido, não como alerta normativo de verificação incerta (Clarifications 2026-08-15, distinto do padrão RN-DEG-02 que rege os demais tetos). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS — 6 User Stories independentes, cada uma testável isoladamente; verificação por suíte de invariantes (FR-013), nunca por diff contra CAHO 2026 como golden master — a validação da US4 usa CAHO como **caso real pontual**, citado pelo próprio RF-DSA-08.1, não como padrão-ouro sistêmico (spec, Nota de escopo item 8, Assumptions). |
| VII. Configuração Sobre Constante | PASS — nenhuma constante nova introduzida; teto de TFM (6) e demais limites já vêm de RN-DIST-03/RN-2027-05, mesmo padrão de configuração já estabelecido nos épicos anteriores (nenhuma tabela de configuração nova necessária, os limites já são as mesmas regras RN- reaproveitadas). |
| VIII. Rastreabilidade | PASS — tasks vão citar RF-DSA-0x; o `test.todo` de RN-CONF-01 já carrega o identificador no próprio nome. |
| IX. Contenção de Escopo | PASS — RF-INSTR-06/06.1 (preferência de instrutor) e restrições de técnica de ensino (achado A-7) explicitamente fora, documentadas como Assumption; escopo bundlado (RF-DSA-03/04/06/07) foi decisão explícita de Bernardo, não expansão silenciosa. |

Nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/008-motor-sugestao-dsa/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/
│   └── server-functions.md   # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — ainda não gerado)
```

`data-model.md` omitido — nenhuma aba/coluna nova (mesmo caso do Épico G/Épico A): este épico
constrói funções de leitura/escrita sobre entidades já existentes desde o Épico C.

### Source Code (repository root)

```text
lib/acoes/
├── `lib/acoes/dsa.ts`                       # EXPANDIDO — getDsaSemanal vira a grade completa por TA
│                                 #   (RF-DSA-03), lancarAula (RF-DSA-01, novo), excluirLancamentoDsa/
│                                 #   moverLancamentoDsa (RF-DSA-07), detectarConflitosDsa_
│                                 #   (RF-DSA-04/RN-CONF-01), getImpressaoDsa (RF-DSA-06)
├── `lib/dominio/sugestao-dsa.ts`                # NOVO — gerarSugestaoSemanal (RF-DSA-08/08.1(i)),
│                                 #   validarSugestaoContraSemanaReal (RF-DSA-08.1(ii)), reaproveita
│                                 #   distribuicaoSemanalMateria_ (`lib/acoes/cronograma.ts`) e
│                                 #   escolherInstrutor_/faixaRegimeInstrutor_ (`lib/dominio/motor-preditivo.ts`)
└── (`lib/acoes/cronograma.ts`, `lib/dominio/motor-preditivo.ts`, `lib/acoes/crud.ts`, `lib/supabase/middleware.ts` + policies RLS, `lib/supabase/server.ts` — inalterados, só consumidos)

app/
└── `app/(app)/turmas/[turma]/dsa/page.tsx`                  # EXPANDIDO — grade por TA, lançamento manual, exclusão/
                                  # arrastar-e-soltar, sinalização de conflito, prévia da sugestão,
                                  # validação contra semana real, botão de impressão

tests/
├── pendentes.test.ts            # o stub "Pendentes - Epico C/DSA" (RN-CONF-01) é removido daqui
└── regras_dsa.test.ts            # NOVO — teste real de RN-CONF-01 + testes das funções puras de
                                  # `lib/dominio/sugestao-dsa.ts` (decidido em /speckit-tasks)
```

**Structure Decision**: Backend organizado por domínio, mesmo padrão de todos os épicos anteriores —
`lib/acoes/dsa.ts` cresce para cobrir a grade/lançamento/conflito/impressão (é literalmente o módulo DSA,
mesmo raciocínio que manteve `lib/acoes/cronograma.ts` como dono de `getCronograma` no Épico G), enquanto a
lógica de geração de prévia/sugestão (que reaproveita peças do motor preditivo do Épico G) vive em
`lib/dominio/sugestao-dsa.ts` separado — evita misturar "exibir/editar a grade real" com "simular uma prévia",
mesmo raciocínio que separou `lib/acoes/cronograma.ts` de `lib/dominio/motor-preditivo.ts`. Frontend: `app/(app)/turmas/[turma]/dsa/page.tsx` já
existe (versão parcial desde os Épicos E/I) e é expandida no lugar, não recriada.

## Complexity Tracking

*Sem violações — seção não aplicável.*
