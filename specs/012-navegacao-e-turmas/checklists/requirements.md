# Specification Quality Checklist: Navegação recolhível e o módulo de Turmas

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 03/10/2026
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

**Dois itens ficam abertos, e os dois pelo mesmo motivo — não por descuido de redação.**

1. **`No [NEEDS CLARIFICATION] markers remain` — reprova com DOIS marcadores, de propósito.**
   - **FR-026** (de onde sai o TA/dia de uma turma). Não há valor plausível a assumir: o único dado
     existente é um **teto de alerta** que não varia por modalidade, e a `RN-MAT-04` fala de
     *"modalidade real da turma"*. ⚠️ **Assumir 8 para toda turma faria a tela acusar atraso errado
     em toda turma EAD** — e acusar errado é pior que não acusar (`RN-DEG-02`). O limite de três
     marcadores do fluxo permite um palpite informado; aqui o palpite tem **consequência medida na
     tela**, então ele não é feito.
   - **FR-031** (se `/inicio` passa a consumir o cálculo único agora). É **escopo**, não redação: a
     resposta muda o conteúdo do PR 3.

2. **`All functional requirements have clear acceptance criteria` — reprova SÓ por FR-026 e FR-031.**
   Os outros 31 requisitos têm cenário de aceitação nomeado nas quatro histórias. Estes dois não
   podem ter: um critério de aceitação para *"a capacidade diária é a da modalidade"* precisa saber
   **qual é** a capacidade de cada modalidade.

⚠️ **O que NÃO está sendo contado como falha, e a razão:** a palavra **cookie** aparece em `D-NAV-2`,
`FR-005` e `FR-010`, e *"implementation details"* costuma proibir isso. Aqui ela **é a decisão** — a
escolha de Bernardo foi *"persiste entre páginas, e não pela URL"*, e nomear o mecanismo é o que
torna a **exceção à regra da URL** registrável e verificável. Trocá-la por *"o sistema lembra"*
apagaria justamente o que precisa ser ratificado.

⚠️ **E `estado-atual.md` é artefato SEPARADO, cheio de caminho de arquivo e nome de coluna, por
desenho.** Ele é a **medição** que a spec consome; a proibição de detalhe de implementação vale para
a spec, não para o retrato que a sustenta. Sem ele, afirmações como *"o indicador de `/inicio` está
invertido"* seriam opinião.
