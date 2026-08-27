# Implementation Plan: Refatoração UI/UX e Conformidade de Dados (Correção de Dívida Técnica)

**Branch**: `009-refatoracao-ui-ux` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-refatoracao-ui-ux/spec.md`

## Summary

Sidebar retrátil (Offcanvas nativo do Tailwind CSS) substituindo a navbar horizontal; Painel Início com
carrossel de turmas por classificação (turma em destaque resolvida no backend, `getContextoInicial`
estendido); Página do Curso/módulo de Turmas/Disciplinas reconstruídos como cartões que expandem
(com um cálculo novo de ritmo/desvio, banda 90%–110% reaproveitada de `classificarDensidade_`);
correção de dívida técnica de data binding — troca de `prompt()`/`<input type="text">` de ID por
`<select>` em todo formulário de relacionamento, e remoção de toda coluna que hoje exibe um `ID_`
cru em listagem; 4 painéis de estatísticas (Cursos/Disciplinas/Instrutores/Turmas) com Recharts
como dependência versionada no `package.json`, agregação no backend. Zero mudança de lógica de cálculo já existente — tudo aditivo ou de
apresentação.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: **Recharts como dependência versionada no `package.json`** (nova, já pré-aprovada em `03-design-system.md`
UI-06) — única dependência nova deste épico. Reaproveita `lerAbaComoObjetos_`/`TABELAS` (`lib/supabase/server.ts`),
`formatarNomeInstrutor_`/`perfilEm_`/`AppState` (`components/ciaara/`), `classificarDensidade_`
(`lib/acoes/cronograma.ts`), `getCronograma`/`totalizadoresDaTurma_` para os cálculos de progresso já
existentes. Tailwind CSS Offcanvas (já incluído no bundle CSS/JS 5.3.3 pinado desde o Épico E) — não é
biblioteca nova, é um componente do framework já aprovado.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `disciplinas` ganha 2 colunas aditivas
(`Tecnica_Ensino_Sugerida`, `Local_Padrao`, DISC-1). Nenhuma outra alteração de schema — todos os
dados dos cartões/carrossel/dashboards já existem (`cursos`, `turmas`, `disciplinas`,
`registros_aula`, `avaliacoes`, `instrutores`).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Painel Início hoje não existe — precisa carregar cursos+turmas em destaque+
progresso num único `getContextoInicial` estendido (ou uma função companion), sem N chamadas
a Server Action por card (cada chamada individual tem latência de rede própria em Next.js).
Estatísticas (FR-015): agregação no backend sempre que a aba de origem passar de ~2.000 linhas —
hoje só `registros_aula` (1.567+ linhas) se aproxima, mas os 4 painéis já nascem
seguindo o padrão de agregação server-side por princípio, não just quando o limiar for cruzado.

**Constraints**: Zero alteração de lógica de cálculo já existente (FR-016) — todo cálculo novo
(ritmo/desvio, resolução de turma em destaque, agregações de estatística) é aditivo, nunca substitui
uma função já testada. Nenhuma tela perde ponto de entrada de navegação (mesmo critério de aceite
de RF-NAV-03, mesmo sem este épico ser o Épico D completo). Nenhum `ID_` cru em nenhuma listagem
tocada por este épico (FR-011) — 2 achados concretos já confirmados por grep antes do plan
(`app/(app)/instrutores/page.tsx`: coluna `ID_Instrutor` na tabela + campo de texto livre `vincGrade` no
vínculo de habilitação; `app/(app)/turmas/[turma]/dsa/page.tsx`: `prompt()` de `ID_Grade`/`ID_Instrutor` no lançamento manual
de Aula, já citado na spec).

**Scale/Scope**: 5 User Stories, ~15-18 arquivos tocados (backend: ``app/layout.tsx` + `lib/supabase/server.ts`` estendido,
`lib/acoes/instrutores.ts`/`lib/acoes/disciplinas.ts`/`lib/acoes/crud.ts` ajustados para dropdown/nome, `lib/acoes/cronograma.ts` ganha a
função pura de ritmo, `lib/acoes/estatisticas.ts` novo; frontend: `app/layout.tsx` reestruturado para Offcanvas,
`app/(app)/inicio/page.tsx` novo, `app/(app)/cursos/[curso]/page.tsx`/`app/(app)/instrutores/page.tsx`/`app/(app)/disciplinas/page.tsx`/
`app/(app)/turmas/[turma]/dsa/page.tsx` ajustados, `app/globals.css`/`components/ciaara/` ganham componentes de cartão/carrossel/
gráfico) — maior escopo de frontend desde o Épico A, mas nenhuma mudança de schema além de DISC-1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS — todo FR cita RF-INI/RF-CURSO/RF-CURSOS/RF-MATERIAS/RF-DS/RF-NAV; os 3 achados que tocavam Fase 1 omissa (UE-1/TURMA-1/DISC-1) foram levados ao responsável antes de assumidos (Clarifications da specify), não inferidos silenciosamente. |
| II. Preservação de Regras de Negócio | PASS — FR-016 é o próprio compromisso de zero alteração de cálculo; nenhuma RN- é tocada, só reaproveitada (ex.: `classificarDensidade_`). |
| III. Restrição de Plataforma | PASS com uma exceção já pré-aprovada — Recharts como dependência versionada no `package.json` (UI-06, `03-design-system.md`), mesmo mecanismo de inclusão de Rawline/FontAwesome/Tailwind CSS. Nenhum bundler, nenhum framework de componente. Offcanvas é Tailwind CSS nativo, não dependência nova. |
| IV. Integridade do Histórico | PASS — nenhuma exclusão nova introduzida; formulários corrigidos (US4) continuam usando os mesmos `crudCriar`/`crudAtualizar`/`crudExcluir` já regidos por C-05. |
| V. Degradação Segura | PASS — curso sem turma em destaque não aparece no carrossel (nunca lança exceção); disciplina sem `Carga_Horaria_Tempos` degrada o ritmo para "sem base de cálculo" (RN-DEG-01, mesmo padrão de `calcularTeto_`); brasões sem asset seguem o padrão já usado no Épico A. |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS — 5 User Stories, cada uma independentemente testável; verificação por suíte de invariantes onde há função pura (ritmo, turma em destaque, agregações), teste de aceite ao vivo para o resto (mesmo critério de todo épico de frontend anterior). |
| VII. Configuração Sobre Constante | PASS — nenhuma constante nova; banda de tolerância do ritmo reaproveita a mesma de `classificarDensidade_`, já não-hardcoded como literal de teto normativo (é threshold de exibição, não regra normativa configurável — mesmo tratamento já dado a `classificarDensidade_` no Épico G). |
| VIII. Rastreabilidade | PASS — tasks vão citar RF-INI-0x/RF-CURSO-0x/RF-DS-0x/etc.; achados de dívida técnica (ID cru, `prompt()` de ID) já citados nominalmente na spec e neste plano. |
| IX. Contenção de Escopo | PASS — escopo explicitamente contido aos 4 itens do pedido do usuário (spec.md, Nota de escopo itens 3-4), não às 10 seções inteiras do rascunho; RF-INI-04/seções 9-10/DYN-01-03/IND-01-03 além do pedido ficam fora, documentados como Assumption. |

Nenhuma violação sem justificativa. Nenhuma entrada em Complexity Tracking necessária — a única
exceção de plataforma (Recharts) já vem pré-aprovada por decisão anterior, não uma nova a
negociar aqui.

## Project Structure

### Documentation (this feature)

```text
specs/009-refatoracao-ui-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── server-functions.md   # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — ainda não gerado)
```

### Source Code (repository root)

```text
lib/acoes/
├── `app/layout.tsx` + `lib/supabase/server.ts`                  # ESTENDIDO — getContextoInicial ganha Classificacao/Status por
│                                  #   curso + turma em destaque resolvida (FR-003/004)
├── `lib/acoes/cronograma.ts`                 # ESTENDIDO — calcularRitmoDisciplina_ (FR-008, banda 90%-110%
│                                  #   reaproveitada de classificarDensidade_)
├── `lib/acoes/instrutores.ts`                # ESTENDIDO — listarInstrutores já existe; criarVinculoHabilitacao
│                                  #   passa a validar ID_Grade via lista, front troca input por select
├── `lib/acoes/disciplinas.ts`                # ESTENDIDO — disciplinas ganha Tecnica_Ensino_Sugerida/
│                                  #   Local_Padrao (DISC-1) no cadastro
├── `lib/acoes/dsa.ts`                        # ESTENDIDO — lancarAula chamado a partir de dropdown, não prompt
│                                  #   (sem mudança de assinatura/lógica — só o front muda)
└── `lib/acoes/estatisticas.ts`               # NOVO — getEstatisticasCursos/Disciplinas/Instrutores/Turmas,
                                   #   agregação server-side (FR-014/015)

app/
├── `app/layout.tsx`                    # REESTRUTURADO — Offcanvas sidebar substitui navbar horizontal
│                                  #   (FR-002), rota padrão passa a ser #tabInicio
├── `app/(app)/inicio/page.tsx`                # NOVO — carrossel por classificação, cards de turma em destaque
│                                  #   (FR-003/005/006)
├── `app/(app)/cursos/[curso]/page.tsx`                 # RECONSTRUÍDO — cartões de curso que expandem (FR-007), acesso
│                                  #   ao módulo de turmas/disciplinas em cartões (FR-008/009/010)
├── `app/(app)/instrutores/page.tsx`           # AJUSTADO — remove coluna ID_Instrutor da tabela (FR-011),
│                                  #   campo "Disciplina" do vínculo vira <select> (FR-012)
├── `app/(app)/disciplinas/page.tsx`           # AJUSTADO — 2 campos novos (DISC-1, FR-013)
├── `app/(app)/turmas/[turma]/dsa/page.tsx`                   # AJUSTADO — lançamento manual de Aula usa <select> em vez de
│                                  #   prompt() de ID (FR-012, achado concreto da spec)
├── `app/globals.css`                  # ESTENDIDO — CDN Recharts; componentes `.card-expansivel`,
│                                  #   `.carrossel-scroll-snap`, sidebar Offcanvas
└── `components/ciaara/`                    # ESTENDIDO — helper de inicialização de gráfico Recharts
                                   #   reutilizável entre os 4 painéis de estatística

tests/
└── regras_ui_dados.test.ts        # NOVO — calcularRitmoDisciplina_, resolução de turma em
                                    #   destaque, agregações de estatística (decidido em
                                    #   /speckit-tasks)
```

**Structure Decision**: Backend por domínio, mesmo padrão de todos os épicos anteriores —
`lib/acoes/estatisticas.ts` isolado (mesma responsabilidade única que separou `lib/dominio/motor-preditivo.ts` de
`lib/acoes/cronograma.ts` no Épico G), o cálculo de ritmo entra em `lib/acoes/cronograma.ts` por ser conceitualmente a
mesma família de `classificarDensidade_` (previsto×executado), não um arquivo próprio. Frontend:
`app/(app)/inicio/page.tsx` novo (não existia nenhuma tela equivalente); os demais arquivos tocados já
existem e são ajustados no lugar, nunca recriados do zero — preserva histórico de porquês já
documentado em cada um.

## Complexity Tracking

*Sem violações — seção não aplicável.*
