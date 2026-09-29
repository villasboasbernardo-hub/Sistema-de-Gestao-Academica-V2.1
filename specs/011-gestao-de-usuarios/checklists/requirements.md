# Specification Quality Checklist: Gestão de usuários

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 29/09/2026
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

✅ **AS OITO DÚVIDAS FORAM DECIDIDAS em 29/09/2026** por Bernardo Villas Boas, e estão em
*Clarifications → Session 2026-09-29*, com data e autoria. Sete confirmaram o padrão que a spec já
havia adotado; a **D-4 reverteu o dela** — redefinir senha passa a **derrubar todas as sessões**
(`FR-038`, `SC-011`). **Nenhuma dúvida aberta trava o plano.**

⚠️ **Nenhum marcador `[NEEDS CLARIFICATION]` chegou a existir no corpo da spec, e isso foi escolha**:
a instrução daquela rodada foi acumular as dúvidas e apresentá-las **em lote ao final**, com opções
e recomendação, de modo que a spec fosse executável mesmo sem resposta.

⚠️ **Sobre "no implementation details": três nomes técnicos aparecem de propósito e são os únicos.**
`nome_exibicao`, `perfil_permissao` e a distinção `proxy.ts` × `middleware.ts` estão citados porque
esta spec **preserva** comportamento existente, e preservar exige nomear o que se preserva. Eles
vivem em `estado-atual.md` e nas *Assumptions*, nunca nos requisitos `FR-` nem nos critérios `SC-`.

✅ **O conflito com a asserção existente FOI RESOLVIDO, e não havia conflito**: pela **D-6**,
reativar usa a **mesma permissão de desativar**, nenhuma ação nova entra na matriz, e a asserção de
**zero** `reativar` em `supabase/tests/103_permissoes.sql` fica **intacta**.

⚠️ **`SC-002` e `SC-009` foram reescritos** depois da primeira validação. `SC-002` dizia "o perfil é
legível", que não é medível; virou cobertura de 100% das telas que o mostram. `SC-009` dizia
"arquivo grande é recusado", sem dizer **onde** — e a recusa que importa é a do servidor, com a do
navegador desligada, senão o critério passa medindo o formulário.
