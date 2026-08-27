# Implementation Plan: Hotfix — Sidebar, Ordenação de Cursos, Carrossel e Contagem de Estatísticas

**Branch**: `010-hotfix-sidebar-carrossel-estatisticas` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-hotfix-sidebar-carrossel-estatisticas/spec.md`

## Summary

Correção cirúrgica de 4 falhas reais introduzidas pelo Épico 009 (Refatoração UI/UX), todas já
localizadas por leitura de código antes desta spec: (1) o pacote `tailwindcss` + `shadcn/ui` nunca foi incluído
— o offcanvas da sidebar (HTML já correto) não tem JS para funcionar; (2)/(3) `app/(app)/cursos/[curso]/page.tsx`
(Página do Curso) lista todos os cursos dentro de `<div class="row g-3">` (grade vertical), sem
nenhuma ordenação por "turma em destaque" — vira `.carrossel-scroll-snap` (mesmo componente já usado
em `app/(app)/inicio/page.tsx`) com destaque primeiro, ordem natural do banco dentro de cada subgrupo
(Clarifications); (4) `getEstatisticasCursos()` conta linhas brutas de `cursos` sem deduplicar
por `ID_Curso` — passa a agrupar por `ID_Curso` antes de qualquer contagem, primeira linha encontrada
vence em caso de divergência (Clarifications). Nenhuma lógica de cálculo/regra de negócio é tocada;
nenhuma dependência nova é introduzida (o Tailwind CSS JS como dependência versionada no `package.json` já é a mesma origem do CSS já em uso).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Tailwind CSS + shadcn/ui (CSS já incluído; **este hotfix adiciona a tag `<script>`
do o pacote `tailwindcss` + `shadcn/ui`, mesmo CDN `jsdelivr` já usado para o CSS** — não é uma dependência nova,
é completar uma que já estava declarada pela metade). Nenhuma outra biblioteca nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — nenhuma mudança de schema).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — nenhuma das 4 correções muda volume de leitura/escrita no banco
(FR-006 é uma agregação em memória sobre dados já lidos, RF-014/015 do Épico 009 já garantiam isso).

**Constraints**: Zero mudança de comportamento fora dos 4 pontos do escopo (Princípio II/IX da
constitution) — nenhuma outra tela, nenhuma outra função de agregação, nenhuma regra `RN-` tocada.

**Scale/Scope**: 3 arquivos tocados: `app/globals.css` (1 tag `<script>`),
`app/`app/(app)/cursos/[curso]/page.tsx`` (função `popularCursos`), `lib/acoes/estatisticas.ts` (função
`getEstatisticasCursos`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Este hotfix não implementa nenhum RF/RN novo — corrige um
  desvio de implementação do Épico 009 em relação ao que RF-INI-01..03/RF-CURSOS-02/UI-05 (já citados
  em `specs/009-refatoracao-ui-ux/spec.md`) pediam. Nenhum identificador novo é necessário; os FRs
  desta spec referenciam os mesmos RF/UI já usados no Épico 009. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: Nenhuma regra `RN-` é tocada — as 4 correções
  são de apresentação (sidebar, ordenação, layout) e de agregação em memória (contagem), não de
  cálculo normativo. **PASSA**.
- **Princípio III (Restrição de Plataforma)**: o pacote `tailwindcss` + `shadcn/ui` vem do mesmo CDN `jsdelivr`
  já usado para `app/globals.css` em `app/globals.css` — nenhum bundler, nenhum framework novo, nenhum
  build step. **PASSA**.
- **Princípio V (Degradação Segura)**: FR-006 define explicitamente o comportamento para dado
  duplicado/divergente (primeira linha vence) em vez de lançar exceção ou produzir `NaN` — mantém o
  espírito de RN-DEG-01 mesmo não sendo uma regra `RN-` numerada. **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 4 correções, 4 commits esperados na
  fase de implementação (um por FR/arquivo), cada uma testável isoladamente onde aplicável
  (FR-006 por `pnpm vitest run`, demais por verificação manual documentada em `quickstart.md`). **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Todo FR desta spec cita o achado de código que o motivou (ver
  "Contexto e achados" em `spec.md`); commits de implementação citarão `[FR-00N]`. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo explicitamente restrito aos 4 arquivos identificados;
  `spec.md` já documenta como fora de escopo qualquer outra tela (inclusive `app/(app)/inicio/page.tsx`, que
  fica intencionalmente inalterado por FR-007). **PASSA**.

Nenhuma violação. Nenhuma entrada necessária em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-hotfix-sidebar-carrossel-estatisticas/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan) — sem entidade nova, só nota de leitura
├── quickstart.md        # Fase 1 (/speckit-plan) — roteiro de verificação manual no navegador
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md             # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, estrutura já estabelecida desde o Épico E/B (`docs/arquitetura/02-modularizacao.md`)
— nenhuma pasta nova, nenhum arquivo novo. Este hotfix toca exatamente 3 arquivos:

```text
src/
├── backend/
│   └── `lib/acoes/estatisticas.ts`        # getEstatisticasCursos() — FR-006 (dedup por ID_Curso)
└── frontend/
    ├── `app/globals.css`          # + <script> o pacote `tailwindcss` + `shadcn/ui` — FR-001
    └── `app/(app)/cursos/[curso]/page.tsx`         # popularCursos() — FR-003/004/005 (todos os cursos,
                                # destaque primeiro, carrossel)

tests/
└── regras_ui_dados.test.ts    # já existe (Épico 009) — ganha casos novos para a função de
                                # dedup/ordenação extraída (FR-004/FR-006)
```

**Structure Decision**: Nenhuma estrutura nova. As 3 correções entram nos mesmos arquivos que o
Épico 009 já criou/tocou — `getEstatisticasCursos()` ganha uma etapa de deduplicação antes de calcular
os KPIs; `popularCursos()` em `app/(app)/cursos/[curso]/page.tsx` passa a construir dois subgrupos (com/sem destaque) por
classificação em vez de um único array, e troca `row g-3` por `carrossel-scroll-snap`; `app/globals.css`
ganha uma linha de `<script>`. A lógica de agrupamento (destaque primeiro, ordem natural dentro do
subgrupo) é extraída como função pura testável (`ordenarCursosPorDestaque_` ou nome equivalente,
decisão da fase `/speckit-tasks`), seguindo o mesmo padrão já usado em `resolverTurmaEmDestaque_`
(Épico 009) — lógica de decisão isolada do DOM para ser testável por `pnpm vitest run`.

## Complexity Tracking

*Sem violações de constitution — seção não aplicável.*
