# Specification Quality Checklist: Ficha de Cadastro de Instrutores e Formulário Avançado

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

- O "Contexto e achados confirmados no código e nos dados" (seção não padrão, mesmo formato usado em
  todos os hotfixes/épicos desta sessão) foi construído lendo a cópia de trabalho local do banco
  real (`instrutores`, 177 linhas, via `openpyxl`) — não assumindo nenhum domínio/formato a partir
  só do texto do pedido. Achados de maior impacto, descobertos assim: (a) `Esp_Hab_Obs` real está
  longe de ser as siglas limpas pedidas — 91% preenchido, com artefatos de formatação e 7 registros
  reais sem nenhuma correspondência nas 60 siglas do catálogo; (b) `Disciplinas_Ministradas` tem 83%
  de preenchimento real e histórico, que a leitura mais literal do pedido ("read-only, calculado
  automaticamente") apagaria/esconderia se implementada sem cuidado; (c) `Data_Avaliacao` de
  `instrutores` tem nome idêntico a uma coluna completamente diferente e fortemente usada em
  `avaliacoes`/`avaliacoes_planejadas` (RN-AVAL-02) — risco real de confusão entre as duas se não
  documentado explicitamente.
- A maioria das ambiguidades reais do pedido (achados 6, 7, 8, 11) foi resolvida por leitura de
  código/dados e, nos dois pontos de maior risco de perda de dado histórico, por precedente direto da
  própria Ficha da V1.0 (que já resolvia a mesma tensão mostrando texto histórico e valor calculado
  como campos distintos) — não por suposição nova sem base.
- `/speckit-clarify` (sessão 2026-08-17) rodou 2 perguntas, ambas de impacto arquitetural real sem
  precedente/dado suficiente para decidir sozinho: (1) formato de `ID_Instrutor` auto-gerado —
  confirmado inteiro simples, continuando a sequência real (`"1"`–`"177"`), nunca o padrão
  `PREFIXO-NNNNNN` de outras entidades; (2) o aviso de confirmação de RN-INST-02 (hoje exclusivo do
  botão "Desativar") passa a valer também quando `Status` muda para `Inativo` pelo novo formulário —
  fecha um risco real de regressão silenciosa da salvaguarda daquela regra (achado F1 da spec 014,
  agora revertido deliberadamente e com o mesmo aviso preservado). Checklist já passava 100% antes da
  sessão; nenhum item mudou de estado, ficaram mais explícitos (FR-006, FR-021, Edge Cases).
- Achado de maior risco de regressão silenciosa (não estava explícito no pedido): implementar
  `Disciplinas_Ministradas`/`Esp_Hab_Obs` de forma literalmente estrita (substituindo/bloqueando)
  apagaria ou tornaria inacessível dado histórico real em até 91%/83% dos 177 registros — FR-010/
  FR-024 e a seção Assumptions existem especificamente para prevenir essa regressão antes da fase de
  planejamento, não depois.
- Escopo de schema deliberadamente mínimo: apesar do pedido intitular uma seção inteira "ALTERAÇÕES NO
  BANCO DE DADOS", a conferência campo a campo (achado 1) mostrou que **nenhuma coluna nova** é
  necessária — só a remoção já pedida de `Ultima_Avaliacao_Desempenho` (FR-001/002) — registrado
  explicitamente para não ser lido como um épico de migração de schema maior do que realmente é.
