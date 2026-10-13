# Specification Quality Checklist: Atividades e avaliações (Épicos 9 e 8)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 12/10/2026
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs). As marcas [banco]/[tela]/[carga] só separam onde cada requisito mora, como pedido. Os nomes de tabela são o vocabulário do domínio já existente
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain. Os 3 de 12/10/2026 (Q-1, Q-2, Q-3) foram respondidos no clarify do mesmo dia
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (§8)
- [x] Dependencies and assumptions identified (§6, §7)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 13/10/2026: as 10 perguntas do primeiro lote estão respondidas, e a Q-1 foi substituída pela D-CUR-1 (o currículo da DEnsM é a única fonte de CH).
- 13/10/2026, **clarify encerrado**: as Q-11 a Q-15 (§14 da spec) estão respondidas e aplicadas. A Q-14 foi decidida **contra a recomendação**: feriado e licença previstos viram **dia parado**, fora do TAD e da CHT (FR-025.3 a FR-025.5). O lote §11-A foi **aprovado em bloco**, com o impacto mostrado caso a caso antes de cada aplicação; a B-11 (Ambientação) foi para a `PEND-014-3`. O §11-B é a lista de erros de planilha para os operadores. **Nenhuma trava restante para os Épicos 9 e 8.** O texto da `RN-AVAL-01` (§12) e as emendas da §13 se aprovam na implementação, e não travam o plan.
- 13/10/2026, **acréscimos de Bernardo** (§2.3 da spec):
  - D-CUR-2: previsto de avaliação com origem currículo ou arbitrado, e alerta de projeção, substituindo a Q-12;
  - cards de avaliações e aba *Avaliações* da turma (D-AV-1 e D-AV-2);
  - cards de AEC, TAD e TR com cumprido, previsto no PROENS e limite máximo (D-TETO-1);
  - limites máximos na página do curso (D-TETO-2).

  Medições M-7 e M-8 na §15. **Abertas Q-16 e Q-17** (§16), sem marcador no corpo:
  - a **Q-16** (o limite máximo: número do currículo ou percentual) trava os cards da **leva 1** e a FR-009;
  - a **Q-17** (a OD conta no "N de M"?) trava só o card de avaliações da **leva 2**.
