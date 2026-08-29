# Specification Quality Checklist: Épico 0 — Fundação: repositório, Next.js, Supabase, CI e tipos gerados

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-26
**Última validação**: 2026-08-27, após a segunda sessão de clarificação (5 perguntas) — 16/16, nenhum item mudou de estado
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

**Resultado: 16 de 16.** A spec está pronta para `/speckit-plan`.

## Notes

### Iteração 1 → 2: o que mudou

A primeira validação reprovou em `No [NEEDS CLARIFICATION] markers remain`, com três decisões
institucionais em aberto. Bernardo respondeu em 26/08/2026 e a spec foi atualizada:

| # | Decisão | Efeito na spec |
|---|---|---|
| Q1 | **`pnpm`** como gerenciador de pacotes | FR-001, FR-012 e FR-013 passaram a nomeá-lo. Fecha a pendência do `CLAUDE.md` |
| Q2 | Repositório **próprio**: `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` | FR-014 nomeia o repositório; **FR-021 é novo** — replantar preservando o commit de 26/08 |
| Q3 | Pré-visualização **entra agora, só com dado sintético** | **FR-022 é novo** — o limite virou requisito verificável, não acordo verbal. User Story 5 fica de pé |

Um quarto requisito nasceu da revisão dos *Edge Cases*: **FR-023**, normalização de fim de linha —
o trabalho é no Windows e o CI roda em Linux, e o git já emitiu `LF will be replaced by CRLF`.

### Sobre "No implementation details" e "technology-agnostic" — aprovados com ressalva declarada

O item passa **por decisão de projeto, não por omissão**. Nesta fatia a plataforma **é** o requisito:
Next.js, Supabase, Vercel e GitHub Actions são restrição normativa já decidida (Princípio III da
constitution; Spec 00, que *prevalece sobre qualquer spec numerada*), não escolha técnica em aberto.
Especificar o Épico 0 sem nomeá-los produziria um documento que não descreve nada verificável.

Mitigação aplicada: os **Success Criteria** e os **Acceptance Scenarios** foram escritos em termos de
resultado observável — "o merge fica bloqueado", "a URL abre", "o teste quebra quando a regra é
desligada" — sem citar comando, arquivo ou biblioteca. Quem valida o épico não precisa ler código.

### Verificação de premissa

Conforme prática estabelecida na v2.0 e reafirmada pelo Bernardo: a spec abre com o estado real
verificado em disco, separando o que **já está de pé** do que **falta**. Sem isso, o Épico 0 seria
re-especificado por inteiro, incluindo os itens entregues em 26/08/2026.

### O que o `/speckit-plan` precisa resolver antes de escrever tarefa

1. **`gh` não está autenticado** nesta máquina — a existência e o estado do repositório de destino
   não foram verificados. `gh auth login` é interativo e cabe ao Bernardo.
2. **Técnica do replantio** (FR-021): `git init` na pasta reaproveitando o histórico, ou filtro de
   subdiretório a partir do `SIS11`. Ambas preservam o commit de 26/08; a escolha é do plano.
3. **Ordem de execução** dentro da fatia: as fronteiras de ESLint (§6.2) não dependem de rede e podem
   vir antes de qualquer coisa de repositório ou de Vercel.

### Pendências documentais registradas (D-1 a D-4)

Estão no fim da spec. Nenhuma bloqueia o plano; **D-2** (`docs/BRIEF-v2.1.md` inexistente) bloqueará
o Épico 1, cujo prompt manda usar "EXATAMENTE estes nomes" do BRIEF §2.1.
