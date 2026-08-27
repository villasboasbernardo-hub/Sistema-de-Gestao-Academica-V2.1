# Specification Quality Checklist: Hotfix — Substituição Estrita do Layout da Ficha pelo Template Local

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-19
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

- A seção "Achados reais" cita arquivo/linha/classe CSS deliberadamente (mesmo padrão aceito em
  todo hotfix desta sessão, Princípio VIII — Rastreabilidade) — são evidências de verificação de
  premissa (o arquivo lido byte a byte antes de qualquer requisito), não prescrição de
  implementação.
- Achado real que reverte uma decisão anterior: o cabeçalho volta de TUDO MAIÚSCULO (spec 024,
  Clarifications 2026-08-19) para Título/Frase normal com as 2 imagens oficiais — justificado
  porque a fonte de verdade mudou (as imagens reais não existiam quando aquela decisão foi tomada).
- Achado real de escopo: o arquivo local tem 2 tags (`DISCIPLINAS_HABILITADAS`, `DATA_GERACAO`)
  fora de `MAPA_TAGS_FICHA_PDF` e falta 1 tag que o Template do PDF tem (`ANTIGUIDADE_DECLARADA`)
  — resolvido sem mudança de backend, já que a view SPA sempre interpolou de dados em memória, não
  do pipeline de geração de PDF.
