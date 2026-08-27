# Tasks: Hotfix — Carrosséis Fixos da Página Inicial (Catálogo Completo)

**Input**: Design documents from `specs/013-hotfix-carrosseis-pagina-inicial/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/server-functions.md`, `quickstart.md`

**Tests**: Solicitados explicitamente por `research.md`/`quickstart.md` para a parte testável por
`pnpm vitest run` (FR-001/003/004/008, função pura `montarCarrosseisPainelInicio_`) — mesmo padrão já
usado para `agruparCursosParaPagina_` no Hotfix 010. FR-002 (backend inalterado) é coberto
indiretamente por esses mesmos testes, sem precisar mockar o cliente Supabase. FR-003/004/005/006/007
(estrutura visual, empty state, scroll-snap, clique, Design System) não são testáveis por
`pnpm vitest run` — verificação manual via `quickstart.md`, mesma limitação de todo hotfix visual
anterior nesta sessão.

**Organization**: Uma fase por User Story de `spec.md`, na mesma ordem/prioridade. As 3 User
Stories editam o mesmo arquivo (`app/(app)/inicio/page.tsx`) em pontos sequenciais da mesma função — não são
paralelizáveis entre si, mas cada checkpoint já é uma entrega independentemente verificável
(documentado em "Dependencies & Execution Order").

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1..US3)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution — mudança
cirúrgica validada por invariantes).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **187 testes, 187 passam, 0
      falham** (mesmo estado registrado em
      `implantacao/historico/2026-08-16-hotfix-012-tratamento-erro-leitura.md`) antes de tocar
      qualquer arquivo.

---

## Phase 2: Foundational

**Não aplicável a este hotfix.** As 3 User Stories tocam um único arquivo
(`app/(app)/inicio/page.tsx`) sem nenhum pré-requisito compartilhado além do estado atual do
repositório (já validado em T001). Não há uma fase foundational separada — a dependência entre
User Stories é sequencial e está documentada em "Dependencies & Execution Order".

---

## Phase 3: User Story 1 - Ver o catálogo completo de cursos na Página Inicial (Priority: P1) 🎯 MVP

**Goal**: Todo curso do escopo do usuário aparece na Página Inicial, independentemente do status de
qualquer turma vinculada a ele ou de ter turma em destaque resolvida (FR-001/006/008).

**Independent Test**: Abrir a Página Inicial com a banco de produção (cursos com turmas em diferentes
status, incluindo cursos sem nenhuma turma Ativa hoje) e confirmar que todo `ID_Curso` de
`cursos` aparece em algum carrossel — mesmo antes de a estrutura de seções virar fixa em 5
(US2) ou ganhar mensagem de vazio (US3).

### Tests for User Story 1 ⚠️

> Escrever este teste PRIMEIRO — `montarCarrosseisPainelInicio_` ainda não existe, o teste deve
> falhar antes da implementação (T003).

- [X] T002 [US1] Escrever teste para `montarCarrosseisPainelInicio_(cursos, turmasEmDestaque)` em
      `tests/unidade/regras_ui_dados.test.ts`, carregando `app/(app)/inicio/page.tsx` via
      importação direta do módulo — mesmo padrão já usado para `app/(app)/cursos/[curso]/page.tsx` no Hotfix 010
      (`carregarFuncoesPurasViewCurso_`): extrair o conteúdo de `<script>...</script>` por regex e
      remover a linha executável de nível superior
      (`document.addEventListener('contexto-pronto', renderizarPainelInicio);`) antes de rodar, ou
      o sandbox vazio lança `ReferenceError: document is not defined`. Casos: (a) curso cuja única
      turma tem `Status=Cancelada` (sem entrada em `turmasEmDestaque`) → aparece em `semDestaque` da
      sua classificação, nunca omitido; (b) curso sem nenhuma turma cadastrada → mesmo resultado;
      (c) curso com entrada em `turmasEmDestaque` → aparece em `comDestaque`; (d) dois cursos da
      mesma classificação, um com destaque e outro sem → o com destaque aparece antes em
      `comDestaque`/`semDestaque` (FR-008, Clarifications 2026-08-16).

### Implementation for User Story 1

- [X] T003 [US1] Implementar `montarCarrosseisPainelInicio_(cursos, turmasEmDestaque)` (função
      pura, sem tocar o DOM) em `app/(app)/inicio/page.tsx` — agrupa `cursos` por `classificacao`
      em `comDestaque`/`semDestaque`, preservando a ordem natural de entrada dentro de cada
      subgrupo (mesma lógica local de `agruparCursosParaPagina_` de `app/(app)/cursos/[curso]/page.tsx`, reimplementada
      aqui sem compartilhar arquivo — research.md §2/§4). Depende de T002 (teste deve existir e
      falhar antes). **Nota de implementação**: escrita já com o guard-rail das 5 categorias fixas
      (`CATEGORIAS_PAINEL_INICIO`) incluído desde o início, em vez de uma versão intermediária de
      chaves dinâmicas depois substituída em T009 — evita reescrever a mesma função duas vezes;
      T007/T008/T009 (US2) e os testes correspondentes foram escritos/verificados junto, ver notas
      nessas tasks.
- [X] T004 [US1] Reescrever `renderizarPainelInicio()` em `app/(app)/inicio/page.tsx`: remover o
      `if (!destaque) return;` (linha 29) e o filtro correspondente que hoje descarta cursos sem
      turma em destaque; chamar `montarCarrosseisPainelInicio_` e iterar o resultado. Cartão de
      curso sem destaque renderiza só nome/classificação/duração (mesmo template de `cartaoCurso` em
      `app/(app)/cursos/[curso]/page.tsx`, contracts/server-functions.md), sem badge/progresso, e continua clicável via
      `aoClicarCardInicio(idCurso)` — chamado sem o segundo argumento; `AppState.setTurma(undefined)`
      já é um comportamento seguro e existente (contracts/server-functions.md, nenhuma mudança em
      `AppState`). Depende de T003. **Nota**: escrita já preservando explicitamente o container
      `.carrossel-scroll-snap` (FR-005) dentro do próprio rewrite, e já iterando as 5 categorias
      fixas (T010) e renderizando a mensagem de vazio (T013) na mesma passagem — ver notas em T010/
      T013.
- [X] T005 [US1] Rodar `pnpm vitest run` — confirmar que o teste de T002 agora passa e
      que a suíte inteira continua em 0 falhas. **193/193 passam, 0 falhas** (baseline 187 + 6 casos
      novos).

### Verificação manual (não automatizável — FR-001/006)

- [ ] T006 [US1] Seguir `quickstart.md` Passo 3 e a primeira parte do Passo 6 no navegador
      (implantação via `o fluxo Git → Vercel` necessária antes) — confirmar que um curso sem turma `Ativa` hoje
      aparece na Página Inicial e que seu cartão continua clicável, levando à Página do Curso.

**Checkpoint**: Nenhum curso fica oculto por status de turma — MVP deste hotfix entregue e
verificável isoladamente (mesmo que a lista de seções ainda seja dinâmica, não fixa em 5).

---

## Phase 4: User Story 2 - Estrutura fixa de 5 carrosséis, sempre visível (Priority: P1)

**Goal**: A Página Inicial sempre renderiza exatamente 5 seções, nesta ordem e com estes títulos
exatos: "Cursos Regulares", "Cursos Especiais", "Cursos Expeditos", "Cursos de Aperfeiçoamento
Avançado", "Estágios de Qualificação" — independentemente de quantos cursos existem em cada
categoria (FR-003).

**Independent Test**: Abrir a Página Inicial e contar as seções renderizadas — devem ser
exatamente 5, com os 5 títulos exigidos, nesta ordem, em qualquer estado da base de dados. Testável
sem depender de US3 (a mensagem de vazio em si).

### Tests for User Story 2 ⚠️

> Estender o teste de T002 ANTES de implementar T008/T009 — os casos novos devem falhar contra a
> versão de `montarCarrosseisPainelInicio_` de US1 (chaves dinâmicas).

- [X] T007 [US2] Estender o `describe` de `montarCarrosseisPainelInicio_` em
      `tests/unidade/regras_ui_dados.test.ts` com os casos novos: (a) `cursos` cobrindo só 3 das 5
      classificações → o resultado tem exatamente 5 entradas, as 2 ausentes com `comDestaque: []` e
      `semDestaque: []`; (b) a ordem das 5 entradas é sempre `Regular, Especial, Expedito,
      Aperfeiçoamento Avançado, Estágio de Qualificação`, cada uma com o título exato exigido por
      FR-003 (`Cursos Regulares`, `Cursos Especiais`, `Cursos Expeditos`, `Cursos de Aperfeiçoamento
      Avançado`, `Estágios de Qualificação`); (c) `cursos` vazio (`[]`) → as 5 entradas vêm todas
      vazias, sem lançar exceção. **Caso adicional** (achado do `/speckit-analyze`, F1): curso com
      `Classificacao` fora do domínio fechado de 5 valores nunca aparece em nenhuma das 5 entradas —
      teste dedicado, ver nota da spec sobre esse Edge Case.

### Implementation for User Story 2

- [X] T008 [US2] Adicionar a constante `CATEGORIAS_PAINEL_INICIO` (as 5 categorias fixas
      `{classificacao, titulo}`, nesta ordem — data-model.md) em `app/(app)/inicio/page.tsx`,
      substituindo `CLASSIFICACOES_ORDEM`.
- [X] T009 [US2] Atualizar `montarCarrosseisPainelInicio_` para iterar `CATEGORIAS_PAINEL_INICIO`
      (sempre as 5 entradas, nesta ordem, com `titulo`) em vez de derivar as chaves dinamicamente de
      `cursos` — cursos cuja `classificacao` está fora do domínio fechado de 5 valores (Edge Case de
      `spec.md`) não entram em nenhuma das 5 entradas. Depende de T007 (teste deve existir e falhar
      antes) e T008. **Nota de implementação**: T003/T008/T009 foram implementados juntos (mesma
      função escrita já com a versão final) — ver nota em T003.
- [X] T010 [US2] Atualizar `renderizarPainelInicio()` em `app/(app)/inicio/page.tsx` para iterar
      o array fixo de 5 entradas devolvido por `montarCarrosseisPainelInicio_` (sempre renderiza os
      5 títulos, nesta ordem) em vez do antigo `chavesOrdenadas`/`Object.keys(porClassificacao)`.
      Depende de T009. Feito junto de T004 (mesma reescrita) — ver nota em T004.
- [X] T011 [US2] Rodar `pnpm vitest run` — confirmar que os casos novos de T007 passam e
      que a suíte inteira continua em 0 falhas. **193/193 passam, 0 falhas.**

### Verificação manual (não automatizável — FR-003/005)

- [ ] T012 [US2] Seguir `quickstart.md` Passo 2 no navegador — confirmar exatamente 5 seções, com os
      5 títulos e a ordem exatos, e rolagem horizontal funcionando em uma categoria com vários
      cursos.

**Checkpoint**: Estrutura fixa de 5 carrosséis sempre presente, com o catálogo completo de US1
dentro dela.

---

## Phase 5: User Story 3 - Mensagem clara quando uma categoria não tem cursos (Priority: P2)

**Goal**: Uma categoria sem nenhum curso cadastrado exibe seu título normalmente e a mensagem
"Nenhum curso cadastrado nesta modalidade" no lugar dos cartões, sem quebrar o layout (FR-004).

**Independent Test**: Com uma categoria conhecida sem cursos cadastrados (ou dado sintético
temporário), abrir a Página Inicial e confirmar que a seção aparece com título + mensagem, sem
cartões e sem espaço em branco quebrado.

### Implementation for User Story 3

- [X] T013 [US3] Em `renderizarPainelInicio()` (`app/(app)/inicio/page.tsx`), quando
      `comDestaque.length + semDestaque.length === 0` para uma entrada, renderizar a mensagem
      "Nenhum curso cadastrado nesta modalidade" no lugar do `.carrossel-scroll-snap` daquela seção
      (FR-004). Depende de T010. Feito junto de T004/T010 (mesma reescrita) — ver nota em T004.

### Verificação manual (não automatizável — FR-004)

- [ ] T014 [US3] Seguir `quickstart.md` Passo 5 no navegador — se todas as 5 categorias já tiverem
      pelo menos um curso na banco de produção, validar este comportamento indiretamente pelos casos
      automatizados de T007(c)/T009 (array vazio) e registrar isso na nota de verificação; caso
      contrário, confirmar a mensagem exata na(s) categoria(s) vazia(s) real(is).

**Checkpoint**: As 3 User Stories completas — catálogo completo, estrutura fixa de 5 seções,
mensagem de vazio.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, `o SHA do commit`, verificação manual fim a fim,
documentação.

- [X] T015 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline +
      os casos novos de T002/T007) em 0 falhas, 0 regressão. **193 testes, 193 passam, 0 falham.**
- [ ] T016 Seguir `quickstart.md` do início ao fim no navegador (Passos 2–7), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas, inclusive a ausência de mudança visual de Design
      System (Passo 7, SC-004).
- [X] T017 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e
      `const o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04) —
      sugestão `2026-08-16.HOTFIX013.1`. **Feito**: `2026-08-16.HOTFIX013.1` nos dois arquivos.
- [X] T018 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linha de `app/(app)/inicio/page.tsx` ganha
      uma frase citando este hotfix (mesmo padrão de "última alteração" já usado para todo épico
      anterior). **Feito.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: não aplicável (ver nota acima).
- **US1 (Phase 3)**: depende só de Setup. Único arquivo tocado: `app/(app)/inicio/page.tsx`.
- **US2 (Phase 4)**: depende de **US1 completa** (T003/T004) — mesma função
  `montarCarrosseisPainelInicio_` e mesma função `renderizarPainelInicio()`, mesmo arquivo. Não é
  uma dependência arquitetural nova, é sequenciamento de edição no mesmo trecho de código; coincide
  com a ordem de prioridade (as duas são P1, US1 vem primeiro por ser o achado mais crítico do
  pedido original).
- **US3 (Phase 5)**: depende de **US2 completa** (T010) — a mensagem de vazio só faz sentido depois
  que a estrutura fixa de 5 seções existe.
- **Polish (Phase 6)**: depende de todas as User Stories completas.

### Within Each User Story

- Teste antes de implementação (US1 T002, US2 T007) — mesmo padrão TDD já usado nas specs
  anteriores desta sessão para lógica pura testável.
- Implementação antes de verificação manual (US1, US2, US3).

### Parallel Opportunities

- Este hotfix tem paralelismo real limitado — as 3 User Stories editam sequencialmente a mesma
  função/arquivo (`app/(app)/inicio/page.tsx`), diferente de hotfixes anteriores que tocavam arquivos
  distintos por User Story.
- T017/T018 (Polish) podem rodar em paralelo entre si — arquivos diferentes (`lib/supabase/server.ts`+`app/layout.tsx`
  vs. `02-modularizacao.md`).

---

## Parallel Example: Polish (únicos arquivos independentes deste hotfix)

```bash
Task: "T017 [P] Incrementar o SHA do commit em `lib/supabase/server.ts` e `app/layout.tsx`"
Task: "T018 [P] Atualizar docs/arquitetura/02-modularizacao.md com a linha de `app/(app)/inicio/page.tsx`"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (US1 — catálogo completo, mesmo sem estrutura fixa de 5).
3. **PARAR E VALIDAR**: seguir `quickstart.md` Passo 3 isoladamente.
4. US1 sozinha já resolve o sintoma mais grave relatado ("cursos somem") — implantável como MVP se
   necessário, mesmo antes de US2/US3 fecharem a estrutura visual completa.

### Incremental Delivery

1. Setup → US1 (MVP — nenhum curso fica oculto).
2. US2 (estrutura fixa de 5 seções, sempre) — depende de US1, mesma função.
3. US3 (mensagem de vazio) — depende de US2, mesma função.
4. Polish → implantar tudo junto via `o fluxo Git → Vercel` (`o SHA do commit` único para as 3 User Stories, mesmo padrão
   de todo hotfix anterior desta sessão — nunca implantar uma User Story de cada vez para um hotfix
   deste tamanho, já que as 3 tocam a mesma função em sequência).

---

## Notes

- Nenhuma tarefa deste hotfix cria arquivo novo — as 3 User Stories entram inteiramente em
  `app/(app)/inicio/page.tsx`, já existente desde o Épico 009.
- `[P]` só aparece na Phase 6 (Polish) — dentro das Phases 3–5, cada User Story edita a mesma função
  da anterior, então não há nada para paralelizar entre as tarefas de uma mesma fase nem entre
  fases.
- Commit por fase concluída (US1, US2, US3, Polish) — 4 commits esperados na implementação, mesmo
  padrão de "1 unidade de mudança pequena e testável por commit" (Princípio VI).
