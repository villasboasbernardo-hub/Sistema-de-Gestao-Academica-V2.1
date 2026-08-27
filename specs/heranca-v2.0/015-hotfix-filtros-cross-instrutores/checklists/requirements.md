# Specification Quality Checklist: Hotfix — Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- O "Contexto e achados confirmados no código antes desta spec" (seção não padrão, mesmo formato
  usado em todos os hotfixes desta sessão, inclusive 013/014) cita arquivos/funções/campos reais
  (`app/(app)/instrutores/page.tsx`, `AppState.ctx.cursos`, `instrutor_disciplina`,
  `ESCALA_ANTIGUIDADE_POSTO`) e o domínio fechado real de `cursos.Classificacao` (Hotfix 013) —
  deliberado, evita repetir o erro do Hotfix 013 (assumir um valor de exibição sem checar o dado
  real antes de escrever o requisito). Os requisitos funcionais (seção `Requirements`) descrevem
  comportamento observável pelo usuário (o que cada filtro faz, o que re-renderiza junto), não como
  implementar — as referências técnicas ficam concentradas no Contexto/Assumptions, mesmo padrão já
  aceito nos checklists de 013/014 desta sessão.
- Zero `[NEEDS CLARIFICATION]` necessários: as 4 ambiguidades reais do pedido (vínculo curso↔
  instrutor para os filtros de Curso/Classificação, tratamento de Servidor Civil no Círculo
  Hierárquico, não-exclusividade de Qualificados/Selecionados no filtro Status, divergência de
  rótulo de Categoria entre o pedido e o gráfico "Classificação" já existente) foram resolvidas por
  leitura direta do código antes da spec e documentadas na seção Assumptions — ver seção
  "Clarifications".
- Achado de maior impacto arquitetural (não estava explícito no pedido, descoberto durante a
  investigação): hoje o painel de estatísticas de Instrutores é carregado **uma única vez** e nunca
  reage a filtro nenhum, nem aos 5 filtros que já existem — o "engine de cross-filtering" pedido não
  é uma melhoria incremental, é a primeira vez que qualquer filtro toca KPIs/gráficos nesta tela
  (achado 1). FR-016/017/SC-003 tornam esse comportamento explícito e testável.
- Escopo deliberadamente reduzido em relação à barra de filtros atual: `Regime_Trabalho` e
  `Nivel_Escolaridade`, filtráveis hoje, saem da barra por não estarem nas "8 categorias estritas"
  do pedido (FR-004, Assumptions) — registrado explicitamente para não ser lido como regressão não
  documentada por quem revisar a spec depois.
- `/speckit-clarify` (sessão 2026-08-17) rodou 2 perguntas, ambas confirmando/fechando decisões:
  (1) o critério de vínculo Curso↔Instrutor é união (qualificação OU seleção), formalizando o que já
  era assumido em FR-005; (2) os formulários de vínculo de qualificação e cadastro de instrutor
  ficam explicitamente fora do alcance da barra de filtros (FR-019, novo) — ambiguidade real que a
  spec original deixava implícita só por omissão. Checklist já passava 100% antes da sessão; nenhum
  item mudou de estado, só ficou mais explícito.
