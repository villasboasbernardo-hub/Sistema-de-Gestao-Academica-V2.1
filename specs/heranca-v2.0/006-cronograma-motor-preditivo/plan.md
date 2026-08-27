# Implementation Plan: Épico G — Cronograma Unificado e Motor Preditivo Multi-Ano

**Branch**: `006-cronograma-motor-preditivo` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-cronograma-motor-preditivo/spec.md`

## Summary

Fundir Diagrama de Alocação e Cronos num único módulo de Cronograma (previsto×executado, qualquer
ano, granularidade/visão ajustável) e generalizar o motor preditivo da V1.0 — hoje travado no ano
"2027" e nunca portado para o backend V2.0 — para qualquer ano futuro, lendo o calendário do PROENS
de `feriados`/`janelas_curso`/`reservas_proens` (já existentes desde o
Épico C) em vez de constantes de código, e gravando o resultado em `planejamento_anual`
(já existente, versionado) em vez de recriar uma aba temporária. Abordagem técnica: portar e
generalizar os algoritmos já funcionando na V1.0 (`distribuicaoSemanalMateria_`,
`gerarPlanejamento2027` e as 12 funções auxiliares com sufixo `27`) — não reescrever do zero —
trocando cada leitura de constante/aba fixa por leitura das tabelas de calendário administráveis, e
implementando pela primeira vez `getRegimeVigente` (contrato já definido em `01-schema.md` §4.2,
nunca antes escrito).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Reaproveita `lerAbaComoObjetos_`/`gerarProximoId_`/`TABELAS`
(`lib/supabase/server.ts`), `exigirFuncao`/`exigirEscopoCurso_`/`exigirEscopoTurma_` (``lib/supabase/middleware.ts` + policies RLS`), o padrão de
CRUD genérico (`lib/acoes/crud.ts`) para os poucos casos de escrita simples (ex.: evento manual do
planejamento).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `planejamento_anual`, `curso_regime_historico`, `feriados`,
`janelas_curso`, `reservas_proens` (todas já criadas e populadas pelo Épico C,
`docs/arquitetura/01-schema.md` §4.1/4.2/5.10) — nenhuma tabela nova, nenhuma coluna nova.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: A geração do motor preditivo roda sob demanda (não em trigger automático),
com o mesmo perfil de carga que a V1.0 já processa hoje de forma síncrona para todo o catálogo de
cursos do PROENS (histórico comprovado de funcionar dentro do limite de execução da função serverless da Vercel (padrão de 10 s no plano Hobby, 60 s no Pro; operação longa vai para RPC no banco ou rotina de fundo)
~6 min por chamada) — generalizar o ano não muda a quantidade de trabalho por execução, só a fonte
dos dados de calendário. Nenhum alvo de performance novo além de "continuar rodando dentro do limite
de execução do Next.js", já validado empiricamente pela V1.0.

**Constraints**: Zero duplicação da função de distribuição semanal (RN-DIST-01 — Risco Alto, é a
regra de não-duplicação mais explícita do documento 04); toda leitura de regime de horário passa a
usar `getRegimeVigente` em vez de ler `cursos` diretamente (RN-2027-09); nenhuma constante de
calendário (`FERIADOS_2027`/`SEMENTES_2027`/`RESERVAS_PROENS`) pode sobreviver no código novo — tudo
lido de `Calendario_*` (RF-DADOS-04); gotcha crítico da plataforma — a fronteira Server/Client Component e o isolamento da chave `service_role`
integralmente aos arquivos `.ts` novos deste épico.

**Scale/Scope**: 1 arquivo de backend novo (`lib/dominio/regime-curso.ts`, pequeno — só `getRegimeVigente` +
função pura de resolução), 1 arquivo de backend novo e grande (`lib/dominio/motor-preditivo.ts`, porta ~12
funções da V1.0), 1 arquivo de backend fundido/expandido (`lib/acoes/cronograma.ts`, de 15 linhas para o
módulo completo de RF-CRONOS), 1 arquivo de frontend novo (`app/(app)/cronograma/page.tsx`, já previsto e
listado como "não construído — Épico G" desde a reconciliação do Épico B).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS — todo FR cita RF-CRONOS-0x/RF-2027-0x/RF-HOR-05; todo comportamento cita a RN- correspondente. Nenhum requisito inventado. |
| II. Preservação de Regras de Negócio | PASS — as ~9 RN- Risco Alto desta spec são o contrato a preservar (RN-DIST-01/02/03, RN-2027-01/02/03/04/06/09), cada uma com teste nomeado (SC-003). |
| III. Restrição de Plataforma | PASS — só Next.js/PostgreSQL, nenhum framework novo. |
| IV. Integridade do Histórico | PASS — `planejamento_anual` versiona em vez de sobrescrever (Rascunho→Salvo→Arquivado); `curso_regime_historico` nunca reinterpreta registro passado (RN-2027-09). |
| V. Degradação Segura | PASS — curso sem janela/reservas detalhadas usa reserva genérica ou é pulado com alerta (RN-2027-03, RF-2027-02), nunca lança exceção não tratada (RN-DEG-01, Edge Cases do spec). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS — cada User Story é um incremento próprio; verificação por suíte de invariantes, não por diff contra CAHO 2026 (FR-015, Nota de escopo item 6 do spec). |
| VII. Configuração Sobre Constante | PASS — é literalmente o que este épico faz: `FERIADOS_2027`/`SEMENTES_2027`/`RESERVAS_PROENS` (constantes) → `Calendario_*` (dado administrável). |
| VIII. Rastreabilidade | PASS — tasks vão citar RF-CRONOS-0x/RF-2027-0x; os 9 `test.todo` já carregam o identificador RN- no próprio nome. |
| IX. Contenção de Escopo | PASS — RF-CRONOS-09/10 (salas) explicitamente fora, documentado como Assumption (spec, Nota de escopo item 7). |

Nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/006-cronograma-motor-preditivo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── server-functions.md   # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — ainda não gerado)
```

### Source Code (repository root)

```text
lib/acoes/
├── `lib/supabase/server.ts`                    # + 5 entradas em TABELAS: PLANEJAMENTO_ANUAL, REGIME_HISTORICO,
│                               #   CALENDARIO_FERIADOS, CALENDARIO_JANELAS_CURSO, CALENDARIO_RESERVAS
├── `lib/dominio/regime-curso.ts`              # NOVO — getRegimeVigente(idCurso, data, tipo) + resolução pura
├── `lib/acoes/cronograma.ts`                # FUNDIDO/EXPANDIDO — getCronograma (RF-CRONOS-01..08),
│                               #   distribuicaoSemanalMateria_ (RN-DIST-01..03, portada da V1.0)
├── `lib/dominio/motor-preditivo.ts`            # NOVO — gerarPlanejamento(ano) generalizado da V1.0,
│                               #   salvarPlanejamento, editarLinhaPlanejamento,
│                               #   lancarEventoManualPlanejamento (RF-2027-01..05)
└── (`lib/acoes/avaliacoes.ts`, `lib/dominio/regras-normativas.ts`, `lib/acoes/relatorio.ts`, etc. — inalterados)

app/
├── `app/layout.tsx`                  # + item de menu #tabCronograma
└── `app/(app)/cronograma/page.tsx`         # NOVO — grade unificada, seletor de granularidade/visão/ano,
                                # geração de prévia do motor + edição + salvar

tests/
├── pendentes.test.ts           # os 9 stubs "Pendentes - Epico G" são removidos daqui
├── regras_cronograma.test.ts   # NOVO — os 9 testes reais correspondentes (decidido em
                                # /speckit-tasks, 2026-08-15)
```

**Structure Decision**: Backend organizado por domínio, mesmo padrão de todos os épicos anteriores
— `lib/dominio/regime-curso.ts` isolado (função pura, pequena, reaproveitável por qualquer módulo futuro que
precise de regime vigente) separado de `lib/acoes/cronograma.ts` (a view unificada) e `lib/dominio/motor-preditivo.ts` (a
geração/simulação), evitando um único arquivo gigante que misture três responsabilidades diferentes
— o mesmo raciocínio que motivou o Épico B a existir. Frontend: 1 view nova (`app/(app)/cronograma/page.tsx`)
já prevista desde a reconciliação de `02-modularizacao.md` (Épico B).

## Complexity Tracking

*Sem violações — seção não aplicável.*
