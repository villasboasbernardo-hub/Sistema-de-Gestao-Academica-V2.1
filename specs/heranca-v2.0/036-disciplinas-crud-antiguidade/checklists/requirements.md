# Specification Quality Checklist: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-21
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

- 3 ambiguidades reais resolvidas: (1) antes da redação — Turma obrigatória ou opcional no
  cadastro, decisão: obrigatória; (2) `/speckit-clarify` — propagação de Código/Nome editados para
  toda `turma_disciplina` vinculada, decisão: propagar (FR-006.1); (3) `/speckit-clarify` —
  comportamento em falha parcial do cadastro (2 gravações em sequência), decisão: desfazer
  automaticamente o catálogo via exclusão lógica (FR-013). Nenhum [NEEDS CLARIFICATION] restante.
- O pedido original propunha um array de precedência militar novo (`Almirante, ..., CB, MN`) —
  verificação de premissa contra o dado real (`instrutores.Posto_Graduacao`, 11 códigos reais
  confirmados) mostrou que esse array não corresponde ao formato nem ao domínio real de postos.
  A especificação usa a escala já existente e auditada (`ESCALA_ANTIGUIDADE_POSTO`) em vez do
  array literal do pedido — documentado como Assumption, não como requisito técnico (mantém o
  spec livre de detalhe de implementação).
- 3 achados estruturais reais (ID_Grade composto, bug latente de prefixo vazio em
  `CRUD_CONFIG['turma_disciplina']`, unicidade de Código nunca implementada) ficam documentados na
  Verificação de Premissa para orientar o `/speckit-plan` — não viram requisitos funcionais
  próprios porque são detalhes de "como", não "o quê" observável pelo usuário.
