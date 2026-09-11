# Specification Quality Checklist: Épico 4, fatia (c) — shell de navegação e estado na URL

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 11/09/2026
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — ⚠️ **com uma ressalva declarada**: a
      seção *Contexto* nomeia a biblioteca de estado na URL ao registrar que ela **não está
      instalada**. É medição do estado do repositório, não requisito. **Nenhum `FR-` nomeia
      ferramenta** — o `FR-011` fala em "gerenciador de estado global", e é assim de propósito.
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — ✅ **os três foram fechados por Bernardo em
      11/09/2026**, e os três eram de escopo: a tela Início entra como **casca navegável**
      (`FR-028`, `FR-033`); o **breadcrumb fica fora**, por recusa declarada sob o Princípio X
      (`FR-040`); e o `RF-NAV-04` é provado **sobre as rotas que esta fatia cria**, sem rota
      provisória (`SC-001`). Nenhum tinha padrão razoável, e é por isso que foram perguntados.
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic — ⚠️ **exceto o `SC-015`**, que nomeia o comando de
      verificação. É convenção estabelecida do projeto desde o Épico 0 e é o portão que a
      *Definition of Done* cobra; trocá-lo por uma paráfrase tornaria o critério **menos**
      verificável, não mais.
- [x] All acceptance scenarios are defined — 5 histórias, 19 cenários
- [x] Edge cases are identified — 7 casos, e o primeiro veio de medição
- [x] Scope is clearly bounded — quatro `FR-` dizem o que a fatia **não** faz
- [x] Dependencies and assumptions identified — 8 premissas, cada uma com o motivo da escolha

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — ver as duas ressalvas acima

## Notas

- ⚠️ **Revalidado em 11/09/2026, depois da segunda rodada.** A spec passou de 42 para **49
  requisitos** e de 16 para **22 critérios**, com três acréscimos e uma recusa: a seção de
  **segurança** (`FR-041` a `FR-043`), o **guia de uso para o Épico 5** (`FR-044`), a proibição de
  contêiner de contexto como fonte de verdade (`FR-011.1`), e a **paginação recusada** (`FR-037.1`).
  Os dezesseis itens continuam aprovados.
- ⚠️ **A seção de segurança era lacuna minha, e o pedido a pegou.** A spec validava parâmetro
  inválido e parâmetro fora do contrato, e **em nenhum lugar tratava a barra de endereço como
  superfície de ataque** — apesar de o `RF-NAV-01` ser exatamente o requisito que a transforma em
  entrada de usuário.
- ⚠️ **Duas correções técnicas entraram junto, as duas medidas**: a opção `shallow` **não existe** na
  navegação desta plataforma (era do roteador antigo), e na biblioteca decidida ela significa *não
  avisar o servidor* — ligada num filtro, mantém a URL em dia e deixa a consulta velha na tela. Virou
  o `FR-004.1`.
- ⚠️ **Revalidado em 11/09/2026, depois da terceira rodada** (`/speckit-clarify`, cinco perguntas). A
  spec foi de 49 para **53 requisitos** e de 22 para **23 critérios**. **Os dezesseis itens continuam
  aprovados, e nenhum mudou de estado** — as cinco respostas fecharam lacunas de conteúdo, não de
  qualidade de redação.
- ⚠️ **Uma das cinco perguntas existiu para corrigir um defeito meu.** O `FR-038` mandava *"ficar
  escrito se a rota da vitrine continua sem sessão"* — **prometer que um requisito existe não é
  requisito**, e é o mesmo padrão que a fatia (b) corrigiu duas vezes, no `FR-028` e no `FR-030`. Ele
  reapareceu aqui e foi pego na revisão, não na implementação. **O checklist de qualidade não o
  pegou**: "requisitos testáveis e não ambíguos" passou, porque a frase é clara — ela só não decide
  nada. Vale considerar um item novo para essa classe.

- **Itens incompletos exigem atualização da spec antes de `/speckit-clarify` ou `/speckit-plan`.**
- ⚠️ **Cinco fatos desta spec foram MEDIDOS em 11/09/2026, não presumidos**, e estão marcados como
  tais no texto: nenhum componente de shell no inventário do documento 23 §3.1; o cabeçalho
  provisório do Épico 3 sem um único link; só a tabela densa guardando estado que o documento 25 põe
  na URL; nenhuma das duas bibliotecas de estado instalada; nenhum brasão em `public/`.
- ⚠️ **A refatoração pedida encolheu por medição.** O pedido falava em "os componentes da fatia (b)",
  no plural. Dos quatro que guardam estado interno, **três guardam estado efêmero de interface** —
  painel aberto, busca dentro do painel, posição do foco — que o documento 25 §3 mantém fora da URL
  **de propósito**. Mudá-los seria o erro oposto. O `FR-013` declara isso em vez de deixar a
  diferença passar em silêncio.
- As duas ressalvas de "implementation details" são **deliberadas e declaradas**, não descuido. A
  diferença entre uma ressalva escrita e um limite afrouxado em silêncio está inteiramente no
  registro — é a mesma regra que governa as isenções de contraste desde a fatia (a).
