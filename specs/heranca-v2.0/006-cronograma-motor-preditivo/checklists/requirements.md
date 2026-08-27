# Specification Quality Checklist: Épico G — Cronograma Unificado e Motor Preditivo Multi-Ano

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-15
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

- Nenhum item incompleto. Nenhum `[NEEDS CLARIFICATION]` foi necessário — as fontes de Fase 1
  (RF-CRONOS-01 a 10, RF-2027-01 a 05, RN-DIST-01 a 03, RN-2027-01 a 09) já são extremamente
  detalhadas, deixando pouca ambiguidade real. A única decisão de escopo genuína (incluir ou não
  RF-CRONOS-09/10, visão de ocupação de salas) tinha um default claro e defensável — o próprio
  documento 06 não a menciona em nenhuma história/critério de aceite do Épico G, então foi excluída
  e documentada como Assumption, em vez de virar uma pergunta de clarify (constitution, Princípio
  IX — mesmo padrão de contenção de escopo já aplicado em `specs/005-modularizacao-frontend-backend/`).
- Sessão de `/speckit-clarify` (2026-08-15): 1 pergunta feita e respondida — mecanismo de
  priorização manual de disciplina (User Story 4, FR-008): peso numérico 1–10, ajusta/desempata o
  critério automático (RN-2027-05) sem substituí-lo. `## Clarifications`, User Story 4 (descrição,
  cenários) e FR-008/Assumptions atualizados. 16/16 → 16/16 itens continuam passando — a resposta
  fechou a única lacuna real de decisão de dado/UX que restava, sem introduzir nova falha.
- Grounding real feito antes de escrever: `lib/acoes/cronograma.ts` é hoje um stub de 15 linhas;
  `lib/dominio/motor-preditivo.ts` não existe; o modelo de dados (`planejamento_anual`,
  `curso_regime_historico`, `config_parametros`, `Calendario_*`) já foi criado e populado pelo
  Épico C; e `tests/unidade/pendentes.test.ts` já tem 9 stubs `test.todo` nomeados sob o título "Pendentes -
  Epico G" (RN-DIST-01/02/03, RN-2027-01/02/03/04/06/09), usados como critério objetivo de cobertura
  em SC-003.
