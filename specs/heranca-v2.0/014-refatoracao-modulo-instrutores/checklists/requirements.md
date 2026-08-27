# Specification Quality Checklist: Hotfix e Refatoração UI/UX — Módulo de Instrutores

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

- O "Contexto e achados confirmados no código e nos dados" (seção não padrão, mesmo formato usado
  em todos os hotfixes desta sessão) cita arquivos/funções/fórmulas e valores reais lidos direto da
  banco de produção via Composio (domínio de `Posto_Graduacao`/`Categoria`, fórmula quebrada de
  `Instrutores_Selecionados`, `Instrutor_Completo` como fórmula nativa desprotegida,
  `Carga_Horaria_Ministrada_Ano` 100% vazio) — deliberado, evita repetir o erro do Hotfix 013
  (assumir uma string de exibição sem checar o dado real antes de escrever o requisito).
- Zero `[NEEDS CLARIFICATION]` necessários: os 4 pontos que teriam exigido pergunta (mapeamento de
  Posto/Graduação, domínio de Categoria, fonte de CH Ministrada, fonte de Habilitados/Selecionados)
  foram resolvidos por leitura direta do código/dados antes da spec — ver seção "Clarifications".
- Achado de maior severidade (não fazia parte do pedido original, descoberto durante a
  investigação): `formatarNomeInstrutor_` (`components/ciaara/`, Épico A) nunca usa `Nome_Completo`, só
  `Nome_Guerra` — que está vazio em 175 dos 177 instrutores reais, deixando o nome da pessoa
  invisível na prática. O pedido do usuário ("Nome Completo com negrito no Nome de Guerra") é,
  coincidentemente, a implementação correta do RF-INSTR-15 já documentado, nunca feita antes —
  registrado no achado 1 e assumido como correção, não como scope creep.
- Revisão de `RN-ANT-02` (achado 3, formaliza `SC`=Servidor Civil como 11º posto, decisão já tomada
  informalmente em 2026-08-14) documentada nas Assumptions em vez de escondida — mesmo padrão de
  P-14/rejeição do CAHO 2026 já usado nesta sessão para decisões de regra de negócio descobertas
  durante a implementação.
