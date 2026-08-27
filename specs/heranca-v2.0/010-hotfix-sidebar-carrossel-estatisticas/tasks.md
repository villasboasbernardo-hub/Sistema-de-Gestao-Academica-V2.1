# Tasks: Hotfix — Sidebar, Ordenação de Cursos, Carrossel e Contagem de Estatísticas

**Input**: Design documents from `specs/010-hotfix-sidebar-carrossel-estatisticas/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/server-functions.md`, `quickstart.md`

**Tests**: Solicitados explicitamente por `research.md`/`quickstart.md` para a parte testável por
`pnpm vitest run` (FR-004/FR-006, funções puras) — mesmo padrão já usado em `tests/unidade/design_system.test.ts`
(que carrega `components/ciaara/` inteiro importadas diretamente do módulo (`export` explícito, sem carregamento dinâmico)
função pura de front-end). FR-001/002/005 (sidebar, carrossel visual) não são testáveis por
`pnpm vitest run` — verificação manual via `quickstart.md`, mesma limitação de todo hotfix visual anterior
nesta sessão.

**Organization**: Uma fase por User Story de `spec.md`, na mesma ordem/prioridade. US2 e US3 tocam a
mesma função (`popularCursos()` em `app/(app)/cursos/[curso]/page.tsx`) — não são paralelizáveis entre si, mas seguem a
ordem de prioridade natural (P1 antes de P2), documentado nas Dependências abaixo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1..US4)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution — mudança
cirúrgica validada por invariantes).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **176 testes, 176 passam, 0
      falham** (mesmo estado registrado em `implantacao/historico/2026-08-16-epico-009-refatoracao-ui-ux.md`)
      antes de tocar qualquer arquivo.

---

## Phase 2: Foundational

**Não aplicável a este hotfix.** As 4 User Stories tocam 3 arquivos distintos sem nenhum pré-requisito
compartilhado além do estado atual do repositório (já validado em T001). US2/US3 têm uma dependência
sequencial direta entre si (documentada em "Dependencies & Execution Order"), não uma fase
foundational separada.

---

## Phase 3: User Story 1 - Abrir e fechar o menu lateral (Priority: P1) 🎯 MVP

**Goal**: O botão de hambúrguer abre e fecha a sidebar (offcanvas do Tailwind CSS), que hoje não reage a
clique nenhum porque o JS do Tailwind CSS nunca foi incluído (FR-001/002).

**Independent Test**: Abrir o sistema em qualquer tela, clicar no hambúrguer — sidebar abre; clicar em
Fechar — sidebar fecha. Não depende de nenhuma outra User Story deste hotfix nem de dado de planilha.

### Implementation for User Story 1

- [X] T002 [US1] Adicionar `<script src="https://cdn.jsdelivr.net/npm/Tailwind@5.3.3/dist/js/o pacote `tailwindcss` + `shadcn/ui`"></script>`
      em `app/globals.css`, mesma versão (`5.3.3`) e mesmo CDN `jsdelivr` já usados na tag
      `<link>` do CSS do Tailwind CSS no mesmo arquivo (research.md §1, FR-001). Nenhum outro arquivo
      precisa de mudança — `app/globals.css` já é incluído uma única vez no `<head>` de `app/layout.tsx`.

### Verificação manual (não automatizável — FR-002)

- [ ] T003 [US1] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar que o hambúrguer abre a sidebar e que Fechar/clique em item do menu a fecha.

**Checkpoint**: Sidebar funcional — MVP deste hotfix entregue e verificável isoladamente.

---

## Phase 4: User Story 2 - Ver todos os cursos, ativos primeiro (Priority: P1)

**Goal**: `app/(app)/cursos/[curso]/page.tsx` (Página do Curso) passa a exibir todos os cursos de cada classificação,
com os que têm turma em destaque aparecendo antes dos demais (FR-003/FR-004).

**Independent Test**: Com a banco de produção (cursos com e sem turma ativa hoje), abrir a Página do
Curso e confirmar que nenhum curso está ausente e que os com turma em destaque vêm primeiro dentro de
cada classificação — testável sem depender de US1 ou US3.

### Tests for User Story 2 ⚠️

> Escrever este teste PRIMEIRO — `agruparCursosParaPagina_` ainda não existe, o teste deve falhar
> antes da implementação (T005).

- [X] T004 [US2] Escrever teste para `agruparCursosParaPagina_(cursos, turmasEmDestaque)` em
      `tests/unidade/regras_ui_dados.test.ts`, carregando `app/(app)/cursos/[curso]/page.tsx` via
      importação direta do módulo (mesmo padrão de `tests/unidade/design_system.test.ts`, que já faz isso com
      `components/ciaara/`) — **com um ajuste em relação a `components/ciaara/`**: `app/(app)/cursos/[curso]/page.tsx` tem uma linha
      executável de nível superior (`document.addEventListener('contexto-pronto', popularCursos);`)
      que `components/ciaara/` não tem; antes de importação direta do módulo, remover/neutralizar essa linha (regex de
      strip, mesma técnica já usada para a tag `<script>`, ou fornecer
      `sandbox.document = { addEventListener: () => {} }` antes de rodar) — sem isso o carregamento
      lança `ReferenceError: document is not defined` (achado do `/speckit-analyze`, F1). Casos: (a)
      curso com destaque e curso sem destaque na mesma classificação → resultado tem o primeiro em
      `comDestaque` e o segundo em `semDestaque`; (b) dois cursos sem destaque, na mesma
      classificação, em determinada ordem de entrada → saem na mesma ordem dentro de `semDestaque`
      (Clarifications 2026-08-16, ordem natural); (c) `turmasEmDestaque` vazio → todos os cursos caem
      em `semDestaque`, nenhum em `comDestaque`.

### Implementation for User Story 2

- [X] T005 [US2] Implementar `agruparCursosParaPagina_(cursos, turmasEmDestaque)` (função pura, sem
      tocar o DOM) em `app/(app)/cursos/[curso]/page.tsx` — agrupa por `classificacao` e, dentro de cada
      classificação, separa em `comDestaque`/`semDestaque` preservando a ordem de entrada de `cursos`
      dentro de cada subgrupo (data-model.md, contracts/server-functions.md). Depende de T004 (teste
      deve existir e falhar antes).
- [X] T006 [US2] Atualizar `popularCursos()` em `app/(app)/cursos/[curso]/page.tsx` para chamar
      `agruparCursosParaPagina_` e renderizar, dentro de cada classificação, primeiro os cartões de
      `comDestaque` e depois os de `semDestaque` — sem remover nenhum curso da renderização (FR-003).
      Depende de T005.
- [X] T007 [US2] Rodar `pnpm vitest run` — confirmar que o teste de T004 agora passa e
      que a suíte inteira continua em 0 falhas.

**Checkpoint**: Página do Curso mostra todos os cursos, com destaque primeiro — verificável
isoladamente (mesmo sem o carrossel de US3, a lista já está correta, só continua em grade vertical).

---

## Phase 5: User Story 3 - Rolagem horizontal na listagem de cursos (Priority: P2)

**Goal**: Trocar o container de cada classificação em `popularCursos()` de uma grade vertical
(`row g-3`) para o carrossel de rolagem horizontal já usado em `app/(app)/inicio/page.tsx`
(`.carrossel-scroll-snap`) (FR-005).

**Independent Test**: Numa classificação com mais cursos do que cabem na largura da tela, rolar
horizontalmente dentro da faixa — cartões extras aparecem sem crescer a altura da página.

### Implementation for User Story 3

- [X] T008 [US3] Em `popularCursos()` (`app/(app)/cursos/[curso]/page.tsx`), trocar o container
      `<div class="row g-3">...</div>` de cada classificação por `<div class="carrossel-scroll-snap">...</div>`
      (classe já definida em `app/globals.css`, reaproveitada sem nenhuma mudança de CSS — research.md
      §3). Depende de T006 (US2) já ter reescrito a lógica de renderização dos dois subgrupos dentro
      dessa mesma função.

### Verificação manual (não automatizável — FR-005)

- [ ] T009 [US3] Seguir `quickstart.md` Passo 3 no navegador — confirmar rolagem horizontal e que os
      cartões com destaque continuam aparecendo primeiro (herda o comportamento de US2).

**Checkpoint**: Página do Curso com todos os cursos, destaque primeiro, em carrossel horizontal — as
3 primeiras User Stories deste hotfix completas.

---

## Phase 6: User Story 4 - Contagem de cursos por classificação sem duplicidade (Priority: P1)

**Goal**: `getEstatisticasCursos()` deduplica por `ID_Curso` antes de calcular KPI/gráfico/duração
média — nenhuma linha duplicada é contada duas vezes (FR-006).

**Independent Test**: Injetar linhas duplicadas de `ID_Curso` num array sintético e confirmar que a
contagem resultante trata cada `ID_Curso` uma única vez — totalmente independente de US1/US2/US3
(arquivo diferente, `lib/acoes/estatisticas.ts`).

### Tests for User Story 4 ⚠️

> Escrever este teste PRIMEIRO — a dedup ainda não existe, o teste deve falhar antes da implementação
> (T011).

- [X] T010 [P] [US4] Escrever teste para `getEstatisticasCursos()` em `tests/unidade/regras_ui_dados.test.ts`
      (mesmo arquivo que já testa as outras 3 funções de `lib/acoes/estatisticas.ts` desde o Épico 009) —
      array sintético de `cursos` com 2 linhas de mesmo `ID_Curso` e `Classificacao` divergente
      entre elas: `kpis.totalCursos` conta 1, não 2; `porClassificacao` usa a `Classificacao` da
      primeira linha (Clarifications 2026-08-16); `duracaoMediaPorClassificacao` idem para
      `Duracao_Semanas`. **Caso adicional (achado do `/speckit-analyze`, C1)**: 2 linhas sintéticas
      com `ID_Curso: ''` (vazio) → `kpis.totalCursos` conta as duas separadamente, nunca as trata como
      duplicata uma da outra (Edge Case de `spec.md`: linha sem `ID_Curso` nunca se funde com outra
      igualmente vazia).

### Implementation for User Story 4

- [X] T011 [P] [US4] Em `getEstatisticasCursos()` (`lib/acoes/estatisticas.ts`), deduplicar `cursos`
      por `ID_Curso` (primeira linha encontrada na ordem de leitura vence — mesmo mapa
      `ID_Curso → linha`, `Object.values()` como entrada) **antes** de calcular
      `kpis.totalCursos`/`porClassificacao`/`duracaoMediaPorClassificacao` (research.md §4). **A
      deduplicação só se aplica quando `ID_Curso` é um valor não-vazio** — linhas com `ID_Curso`
      vazio/nulo nunca são casadas entre si, cada uma continua contando individualmente (achado do
      `/speckit-analyze`, C1; sem essa guarda, duas linhas com `ID_Curso` vazio colidiriam no mesmo
      slot do mapa e uma seria descartada, violando o Edge Case de `spec.md`). Não alterar
      `contarPorChave_` (usado por outras 3 funções fora de escopo) nem `kpis.totalTurmasAtivas` (não
      relacionado à duplicidade de `cursos`). Depende de T010 (teste deve existir e falhar antes).
- [X] T012 [US4] Rodar `pnpm vitest run` — confirmar que o teste de T010 agora passa e que
      a suíte inteira continua em 0 falhas.

**Checkpoint**: Todas as 4 User Stories completas e verificáveis independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, `o SHA do commit`, verificação manual fim a fim, documentação.

- [X] T013 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline +
      os 2 testes novos de T004/T010) em 0 falhas, 0 regressão.
- [ ] T014 Seguir `quickstart.md` do início ao fim no navegador (Passos 2-4), após implantação via
      `o fluxo Git → Vercel` — confirmar as 4 correções juntas, não só isoladamente.
- [X] T015 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e
      `const o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04) — sugestão
      `2026-08-16.HOTFIX010.1`.
- [X] T016 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linhas de `lib/acoes/estatisticas.ts`,
      `app/(app)/cursos/[curso]/page.tsx` e `app/globals.css` ganham uma frase citando este hotfix (mesmo padrão de "Última
      alteração" já usado para todo épico anterior).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: não aplicável (ver nota acima).
- **US1 (Phase 3)**: depende só de Setup. Arquivo `app/globals.css`, isolado de tudo mais.
- **US2 (Phase 4)**: depende só de Setup. Arquivo `app/(app)/cursos/[curso]/page.tsx`.
- **US3 (Phase 5)**: depende de **US2 completa** (T006) — mesma função `popularCursos()`, mesmo
  arquivo. Não é uma dependência arquitetural, é sequenciamento de edição no mesmo trecho de código;
  coincide com a ordem de prioridade (P1 antes de P2).
- **US4 (Phase 6)**: depende só de Setup. Arquivo `lib/acoes/estatisticas.ts`, isolado de tudo mais — pode
  rodar em paralelo com US1/US2/US3 a qualquer momento.
- **Polish (Phase 7)**: depende de todas as User Stories desejadas estarem completas.

### Within Each User Story

- Teste antes de implementação (US2, US4) — mesmo padrão TDD já usado nas specs anteriores desta
  sessão para lógica pura testável.
- Implementação antes de verificação manual (US1, US3).

### Parallel Opportunities

- **US1 e US4 podem rodar em paralelo** entre si (e com o início de US2) — arquivos totalmente
  distintos (`app/globals.css` vs. `lib/acoes/estatisticas.ts`), nenhuma dependência cruzada.
- T010 e T011 (US4) marcados `[P]` entre si só no sentido de "arquivo isolado do resto do hotfix";
  T011 ainda depende de T010 existir primeiro (teste antes de implementação) — a marcação `[P]` aqui
  descreve independência **entre User Stories**, não dentro da própria US4.
- T015/T016 (Polish) podem rodar em paralelo entre si — arquivos diferentes (`lib/supabase/server.ts`+`app/layout.tsx`
  vs. `02-modularizacao.md`).

---

## Parallel Example: US1 + US4 (arquivos independentes)

```bash
# US1 (sidebar) e US4 (estatísticas) podem ser feitas na mesma sessão, em qualquer ordem, sem
# conflito de arquivo:
Task: "T002 [US1] Adicionar <script> do o pacote `tailwindcss` + `shadcn/ui` em `app/globals.css`"
Task: "T010 [P] [US4] Escrever teste de dedup para getEstatisticasCursos em tests/regras_ui_dados.test.ts"
Task: "T011 [P] [US4] Implementar dedup por ID_Curso em `lib/acoes/estatisticas.ts`"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (US1 — sidebar).
3. **PARAR E VALIDAR**: seguir `quickstart.md` Passo 2 isoladamente.
4. US1 sozinha já é implantável — desbloqueia toda a navegação do sistema, que hoje depende da sidebar
   em qualquer tela que não seja a rota padrão.

### Incremental Delivery

1. Setup → US1 (MVP — sidebar funcional).
2. US4 (contagem correta) — pode entrar em paralelo com US1, é o achado "mais crítico" do relato
   original do usuário.
3. US2 (todos os cursos, destaque primeiro) → US3 (carrossel) — sequenciais, mesmo arquivo/função.
4. Polish → implantar tudo junto via `o fluxo Git → Vercel` (`o SHA do commit` único para as 4 correções, mesmo padrão de
   todo épico anterior desta sessão — nunca implantar uma User Story de cada vez para um hotfix deste
   tamanho).

---

## Notes

- Nenhuma tarefa deste hotfix cria arquivo novo — as 4 correções entram inteiramente nos 3 arquivos já
  existentes citados em `plan.md`.
- `[P]` nas Phases 3/5 (US1/US3) não aparece porque cada uma tem só uma tarefa de implementação —
  não há nada para paralelizar dentro da própria fase.
- Commit por fase concluída (US1, US2, US3, US4, Polish) — 5 commits esperados na implementação,
  mesmo padrão de "1 unidade de mudança pequena e testável por commit" (Princípio VI).
