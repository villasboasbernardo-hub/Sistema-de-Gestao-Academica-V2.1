# Implementation Plan: Hotfix e Refatoração UI/UX — Módulo de Instrutores

**Branch**: `014-refatoracao-modulo-instrutores` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-refatoracao-modulo-instrutores/spec.md`

## Summary

Reconstrução da camada de apresentação e dos endpoints de leitura do módulo de Instrutores, sem
nenhuma mudança de schema. O achado mais grave (`formatarNomeInstrutor_` nunca usa `Nome_Completo`,
deixando 175 dos 177 nomes invisíveis) é corrigido no componente compartilhado (`components/ciaara/`).
`getEstatisticasInstrutores` (`lib/acoes/estatisticas.ts`) é reescrita para os 4 KPIs e 7 gráficos exigidos,
com uma nova função pura de ordenação por antiguidade (11 postos reais, formalizando a revisão de
`RN-ANT-02`) e cálculo de CH Ministrada/Habilitados/Selecionados a partir das fontes corretas
(`registros_aula`, `instrutor_disciplina`, `disciplinas.ID_Instrutor` — nunca a
fórmula quebrada `Instrutores_Selecionados`). `app/(app)/instrutores/page.tsx` ganha listagem com filtros
combinados e nome legível, e uma tela de edição em blocos visuais que abre em **nova aba** (decisão
de `/speckit-clarify`) via um novo parâmetro de deep-link em `app/layout.tsx` (layout raiz) — hoje `app/layout.tsx` não recebe
nenhum parâmetro. `ID_Instrutor`/`Carga_Horaria_Ministrada_Ano` ficam somente-leitura na interface
e `Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano` passam a protegidos em
`COLUNAS_FORMULA['instrutores']` (RN-CRUD-02). O dropdown de vínculo de habilitação passa a
"[Posto/Graduação] [Nome Completo]".

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Recharts. Tailwind CSS + shadcn/ui nativo para a barra de
filtros (`<select>`/`<input>` simples, mesmo padrão de todo formulário existente — nenhuma
biblioteca de filtro/tabela nova).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `instrutores`, `instrutor_disciplina`, `disciplinas`,
`registros_aula`, todas já existentes. **Nenhuma coluna nova, nenhuma aba nova**
(restrição explícita do pedido — "sem quebrar as tabelas do banco de dados").

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — 177 instrutores, 599 vínculos, 175 disciplinas; toda listagem/filtro é
agregação em memória sobre dado já lido, mesmo padrão de todo painel de estatísticas existente.

**Constraints**: Zero mudança de schema físico (restrição do pedido); zero mudança em
`getContextoInicial`/`AppState`/rotas existentes além do novo parâmetro de `app/layout.tsx`; zero nova
dependência JS.

**Scale/Scope**: 6 arquivos de produção tocados — `app/layout.tsx` + `lib/supabase/server.ts`` (`app/layout.tsx` (layout raiz)),
`lib/acoes/`lib/acoes/estatisticas.ts`` (`getEstatisticasInstrutores` reescrita), `lib/acoes/instrutores.ts`
(nova função pura de antiguidade + função de listagem com CH agregada), `lib/acoes/crud.ts`
(`COLUNAS_FORMULA['instrutores']`), `components/ciaara/` (`formatarNomeInstrutor_`
corrigida), `app/layout.tsx` (constante de deep-link injetada via scriptlet) — mais a
reescrita completa de `app/(app)/instrutores/page.tsx`. 3 arquivos de teste ganham casos novos:
`tests/unidade/regras_ui_dados.test.ts`, `tests/unidade/design_system.test.ts`, `tests/regras_de_negocio_backend.
test.js`. `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` ganha a atualização formal de
`RN-ANT-02` (achado 3 de `spec.md`, tarefa de Polish — achado do `/speckit-analyze`, F4).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Implementa RF-INSTR-01/05/08/15 e RF-DS-05, já documentados
  e nunca implementados corretamente (achado 1 de `spec.md` — `formatarNomeInstrutor_` nunca usou
  `Nome_Completo`). Revisa `RN-ANT-02` (achado 3) formalizando uma decisão de Bernardo já tomada
  informalmente em 2026-08-14, documentada e não escondida. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: `RN-INST-01/02/03/04` preservadas
  integralmente — a mudança é de apresentação e de correção de leitura (fonte de CH/Selecionados),
  nenhuma regra de cálculo normativo é alterada. `RN-CRUD-02` passa a ser **melhor** cumprida
  (`Instrutor_Completo` estava desprotegida, achado 7). **PASSA**.
- **Princípio III (Restrição de Plataforma)**: Recharts já aprovado (Épico 009); nenhuma
  dependência nova; `app/layout.tsx` (layout raiz) com parâmetro de query é um recurso nativo do Next.js, não uma
  mudança de plataforma. **PASSA**.
- **Princípio IV (Integridade do Histórico)**: Não aplicável — nenhuma migração/saneamento de dado
  nesta spec, só leitura e apresentação.
- **Princípio V (Degradação Segura)**: Posto/Graduação fora do domínio conhecido cai numa faixa
  "Outros" em vez de sumir (Edge Case de `spec.md`); deep-link com `ID_Instrutor` inválido mostra
  erro claro, nunca tela em branco nem dado de outro instrutor (Edge Case de `spec.md`, mesmo padrão
  do Hotfix 012). **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 6 arquivos de produção, cada
  mudança isolada e testável onde a lógica é pura (antiguidade, nome, CH, parse de CSV); DOM/gráficos
  verificados manualmente. **PASSA**.
- **Princípio VII (Configuração Sobre Constante)**: O mapeamento Posto/Graduação→antiguidade/nome
  por extenso e Categoria→rótulo são taxonomias fechadas (11 e 4 valores, achados 2/4 de `spec.md`),
  não limites normativos nem dados anuais do PROENS — mesmo padrão já aceito para
  `CLASSIFICACOES_ORDEM`/`CATEGORIAS_PAINEL_INICIO` (Épico 009/Hotfix 013). **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Todo FR de `spec.md` cita o achado que o motivou ou o
  RF-INSTR-*/RN-* correspondente; commits de implementação citarão `[FR-00N]`. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo restrito aos 6 arquivos listados; `spec.md` já
  documenta como fora de escopo a correção de `disciplinas.Instrutores_Selecionados` (fórmula
  quebrada, contornada por leitura direta) e a inclusão de CH de `avaliacoes` no cálculo de CH
  Ministrada (Assumptions). **PASSA**.

Nenhuma violação. Nenhuma entrada necessária em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-refatoracao-modulo-instrutores/
├── plan.md                     # Este arquivo (/speckit-plan)
├── research.md                 # Fase 0 (/speckit-plan)
├── data-model.md               # Fase 1 (/speckit-plan)
├── contracts/server-functions.md  # Fase 1 (/speckit-plan)
├── quickstart.md               # Fase 1 (/speckit-plan) — roteiro de verificação manual
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md                    # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, estrutura já estabelecida desde o Épico E/B
(`docs/arquitetura/02-modularizacao.md`) — nenhuma pasta nova, nenhum arquivo novo (só reescrita de
arquivos já existentes):

```text
src/
├── backend/
│   ├── `app/layout.tsx` + `lib/supabase/server.ts`        # o layout raiz() -> o layout raiz(e); le e.parameter, injeta no template Index
│   ├── `lib/acoes/crud.ts`              # COLUNAS_FORMULA['instrutores'] = ['Instrutor_Completo',
│   │                        # 'Carga_Horaria_Ministrada_Ano'] — RN-CRUD-02 (FR-012)
│   ├── `lib/acoes/estatisticas.ts`      # getEstatisticasInstrutores() reescrita — 4 KPIs + 7 series
│   └── `lib/acoes/instrutores.ts`       # ordenarPorAntiguidadePosto_() (nova, funcao pura); listagem com CH
│                            # agregada; listarInstrutores() inalterada (ainda usada por vinculo)
└── frontend/
    ├── `components/ciaara/`          # formatarNomeInstrutor_() corrigida (Nome_Completo + negrito de
    │                        # Nome_Guerra, FR-007) — efeito colateral positivo em `app/(app)/turmas/[turma]/dsa/page.tsx`
    ├── `app/layout.tsx`            # constante de deep-link injetada via scriptlet (FR-010.1)
    └── `app/(app)/instrutores/page.tsx`  # reescrita: dashboard (US1), listagem+filtros (US2), painel de
                              # edicao em blocos (US3, nova aba), dropdown de vinculo sem ID (US4)

tests/
└── regras_ui_dados.test.ts  # ganha describe novo: ordenarPorAntiguidadePosto_,
                              # formatarNomeInstrutor_, parse de ID_Instrutor CSV, agregacao de CH
```

**Structure Decision**: Nenhuma estrutura nova. `ordenarPorAntiguidadePosto_` (a única lógica
verdadeiramente nova e não-trivial desta spec) fica em `lib/acoes/instrutores.ts`, não em `lib/supabase/server.ts` — é uma
taxonomia do domínio de Instrutores, não um utilitário genérico do projeto, mesmo critério já usado
para `resolverTurmaEmDestaque_` viver em ``app/layout.tsx` + `lib/supabase/server.ts` e não em `lib/supabase/server.ts``. A tela de edição em
"nova aba" **não** é uma view nova: é a mesma `app/(app)/instrutores/page.tsx`/aba `tabInstrutores` de sempre,
carregada do zero (boot completo da SPA, como qualquer acesso à aplicação Next.js), que passa a reconhecer um
estado de "modo edição focado" quando o deep-link injetado por `app/layout.tsx` (layout raiz) está presente — evita
criar uma segunda view/rota só para isso (Princípio IX). O parâmetro de deep-link é lido no boot da
mesma forma que qualquer outro dado de contexto (`AppState`), não como um mecanismo de roteamento
novo — `irPara('tabInstrutores')` já existente é reaproveitado para a navegação inicial.

## Complexity Tracking

*Sem violações de constitution — seção não aplicável.*
