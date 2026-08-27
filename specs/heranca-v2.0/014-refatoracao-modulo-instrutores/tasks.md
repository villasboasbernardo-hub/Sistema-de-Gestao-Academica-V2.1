# Tasks: Hotfix e Refatoração UI/UX — Módulo de Instrutores

**Input**: Design documents from `specs/014-refatoracao-modulo-instrutores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/server-functions.md`, `quickstart.md`

**Tests**: Solicitados explicitamente por `research.md`/`quickstart.md` para toda a lógica pura
nova (ordenação por antiguidade, agregação de habilitados/selecionados/CH, correção de
`formatarNomeInstrutor_`, proteção de `COLUNAS_FORMULA`) — mesmo padrão já usado em todos os
hotfixes desta sessão. Gráficos, filtros client-side, nova aba e boot do deep-link são DOM/
navegador, fora do alcance de `pnpm vitest run` — verificação manual via `quickstart.md`.

**Organization**: Uma fase por User Story de `spec.md`, na ordem de prioridade (US1/US2 = P1,
US3/US4 = P2). Todas as 4 tocam `app/(app)/instrutores/page.tsx` em seções diferentes; US2 depende de uma
função de `lib/acoes/instrutores.ts` introduzida em US1 (`somarCargaHorariaPorInstrutor_`, compartilhada entre
o KPI do dashboard e a coluna da listagem) — dependência documentada, não coincidência de arquivo.
**Achados do `/speckit-analyze` já corrigidos aqui**: T025 (US3) também depende de T007 (US1) pelo
mesmo motivo (F2); T016 (US2) e T027 (US4) editam a mesma função `carregarInstrutores()` e não são
seguras para implementação paralela sem coordenação (F3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1..US4)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **195 testes, 195 passam, 0
      falham** (mesmo estado final do Hotfix 013) antes de tocar qualquer arquivo.

---

## Phase 2: Foundational

**Não aplicável como bloqueio de todas as User Stories.** Não há pré-requisito compartilhado pelas
4 ao mesmo tempo — só uma dependência pontual entre US1 e US2 (`somarCargaHorariaPorInstrutor_`),
documentada na fase de US2 abaixo, não uma fase foundational separada.

---

## Phase 3: User Story 1 - Dashboard com dados corretos e antiguidade real (Priority: P1) 🎯 MVP

**Goal**: 4 KPIs e 7 gráficos corretos no painel de estatísticas de Instrutores, com
Posto/Graduação sempre ordenado por antiguidade (11 postos reais) e CH Ministrada/Habilitados/
Selecionados calculados das fontes corretas — nunca dos campos vazios/quebrados (achados 5/6 de
`spec.md`).

**Independent Test**: Abrir "Instrutores" → "Estatísticas" com a banco de produção e conferir os 4
KPIs e os 7 gráficos contra uma contagem manual (roteiro completo em `quickstart.md` Passo 2) —
testável isoladamente, sem depender de nenhuma das outras 3 User Stories.

### Tests for User Story 1 ⚠️

> Escrever estes testes PRIMEIRO — as funções ainda não existem, devem falhar antes da
> implementação.

- [X] T002 [P] [US1] Escrever testes para `ordenarPorAntiguidadePosto_` em
      `tests/unidade/regras_ui_dados.test.ts` (novo `describe`, carregando `lib/acoes/instrutores.ts` pelo mesmo
      harness `carregarFuncoesPuras` já usado para `resolverTurmaEmDestaque_` — acrescentar
      `'`lib/acoes/instrutores.ts`'` à lista de arquivos carregados). Casos: (a) array com os 11 postos em
      ordem embaralhada → devolve na ordem CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC,
      com `nome` por extenso (research.md §3); (b) posto fora do mapa de 11 conhecidos → cai ao
      final (ordem 999), sem lançar exceção, mantendo o código bruto como nome (Edge Case de
      `spec.md`).
- [X] T003 [P] [US1] Escrever testes para `contarHabilitadosDistintos_`/
      `contarSelecionadosDistintos_` em `tests/unidade/regras_ui_dados.test.ts`. Casos: (a) 2 vínculos
      `Status='Ativo'` do mesmo `ID_Instrutor` em `instrutor_disciplina` → conta 1, não 2; (b)
      vínculo `Status='Inativo'` não conta; (c) `disciplinas.ID_Instrutor` com CSV `"89, 173"` e
      outra linha só `"173"` → `contarSelecionadosDistintos_` devolve `{89, 173}` (2, não 3),
      espaços ao redor da vírgula tratados corretamente (dado real: `"89, 173"`).
- [X] T004 [P] [US1] Escrever testes para `somarCargaHorariaPorInstrutor_` em
      `tests/unidade/regras_ui_dados.test.ts`. Casos: (a) registros sintéticos de
      `registros_aula` com `Categoria_Normativa` mista (`Aula`/`Atividade_Extraclasse`)
      → só `Aula` soma; (b) `Status='Cancelada'` não soma; (c) `Data` de ano anterior ao corrente
      não soma; (d) dois registros do mesmo `ID_Instrutor` no ano corrente → `Tempos_Consumidos`
      somados corretamente.

### Implementation for User Story 1

- [X] T005 [US1] Adicionar `ESCALA_ANTIGUIDADE_POSTO` (constante, os 11 postos reais) e implementar
      `ordenarPorAntiguidadePosto_(itensPorPosto)` em `lib/acoes/instrutores.ts` (research.md
      §3). Depende de T002 (teste deve existir e falhar antes).
- [X] T006 [US1] Implementar `contarHabilitadosDistintos_(vinculos)` e
      `contarSelecionadosDistintos_(disciplinas)` em `lib/acoes/instrutores.ts` (research.md §4).
      Depende de T003.
- [X] T007 [US1] Implementar `somarCargaHorariaPorInstrutor_(registros, anoCorrente)` em
      `lib/acoes/instrutores.ts` (research.md §4). Depende de T004.
- [X] T008 [US1] Reescrever `getEstatisticasInstrutores()` em `lib/acoes/estatisticas.ts` —
      monta os 4 KPIs (`total`, `comCapacitacaoDidatica`, `cargaHorariaTotalMinistradaAno`,
      `habilitados`/`selecionados`) e as 7 séries (`data-model.md`), usando `ordenarPorAntiguidade
      Posto_`/`contarHabilitadosDistintos_`/`contarSelecionadosDistintos_`/
      `somarCargaHorariaPorInstrutor_` (T005-T007), `RÓTULOS_CATEGORIA` (nova constante, mesmo
      arquivo) para o gráfico de Classificação, e split por vírgula de `Capacitacao_Didatica` para
      o gráfico de Capacitação Didática (achado 9 de `spec.md`). Depende de T005, T006, T007.
- [X] T009 [US1] Rodar `pnpm vitest run` — confirmar que os testes de T002-T004 passam
      e a suíte inteira continua em 0 falhas. **208 testes, 208 passam, 0 falham** (baseline 195 +
      13 casos novos: 6 de T002-T004 + 7 reescritos/novos em `getEstatisticasInstrutores`, achado
      necessário para atualizar o teste pré-existente que assumia o retorno antigo).
- [X] T010 [US1] Reescrever a seção de estatísticas em `app/(app)/instrutores/page.tsx`
      (`carregarEstatisticasInstrutores`) para renderizar os 4 KPIs e os 7 gráficos via
      `renderizarGrafico_` (`components/ciaara/`, já existente — nenhuma dependência nova), consumindo o
      novo retorno de `getEstatisticasInstrutores()` (T008).

### Verificação manual (não automatizável — FR-001/002/003/004/005)

- [ ] T011 [US1] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar os 4 KPIs, os 7 gráficos, e a ordem de antiguidade exata do gráfico de
      Posto/Graduação.

**Checkpoint**: Dashboard de Instrutores com dados corretos — MVP deste épico entregue e
verificável isoladamente.

---

## Phase 4: User Story 2 - Listagem com nome legível e filtros avançados (Priority: P1)

**Goal**: Todo instrutor mostra um nome de pessoa legível (hoje só 2 de 177 mostram, achado 1);
listagem com as 6 colunas exigidas e filtros combinados por OM/Categoria/Capacitação/Regime/
Escolaridade.

**Independent Test**: Abrir a listagem de instrutores e confirmar que todo `Nome_Completo` aparece
legível, com negrito seletivo só quando `Nome_Guerra` existe (`quickstart.md` Passo 3) — testável
sem depender de US1 (usa a listagem base, não o dashboard), embora reutilize
`somarCargaHorariaPorInstrutor_` introduzida em US1 para a coluna de CH.

### Tests for User Story 2 ⚠️

> Escrever este teste PRIMEIRO — a correção de `formatarNomeInstrutor_` ainda não existe.

- [X] T012 [US2] Escrever/estender testes para `formatarNomeInstrutor_` em
      `tests/unidade/design_system.test.ts` (arquivo já existente desde o Épico A, já carrega `components/ciaara/`
      importadas diretamente do módulo (`export` explícito, sem carregamento dinâmico). Casos: (a) `Nome_Guerra` vazio → devolve `Nome_Completo` inteiro, sem
      `<strong>` nenhum (caso de 175 dos 177 instrutores reais); (b) `Nome_Guerra="CAMPOS"` dentro
      de `Nome_Completo="DANIEL DE OLIVEIRA CAMPOS BORGES"` → só "CAMPOS" fica dentro de
      `<strong>`, resto do nome sem marcação; (c) `Nome_Guerra` preenchido mas que NÃO é substring
      de `Nome_Completo` (Edge Case de `spec.md`) → devolve `Nome_Completo` inteiro sem negrito, sem
      lançar exceção; (d) prefixo `Posto_Graduacao`/`Esp_Hab_Obs` continua igual a antes (regressão
      de RF-INSTR-15, não deve mudar).

### Implementation for User Story 2

- [X] T013 [US2] Corrigir `formatarNomeInstrutor_` em `components/ciaara/` (research.md §5) —
      base `Nome_Completo` (com fallback para `Nome_Guerra`/`ID_Instrutor` só se `Nome_Completo`
      também estiver vazio), negrito seletivo de `Nome_Guerra` via `RegExp` com os caracteres
      especiais de `Nome_Guerra` escapados antes de construir o padrão. Depende de T012 (teste deve
      existir e falhar antes). **Efeito colateral verificado, não novo escopo**: `app/(app)/turmas/[turma]/dsa/page.tsx`
      consome a mesma função e herda a correção.
- [X] T014 [US2] Implementar `listarInstrutoresComCargaHoraria()` em `lib/acoes/instrutores.ts` —
      reaproveita `somarCargaHorariaPorInstrutor_` (T007, US1) para anexar `cargaHorariaMinistrada
      Ano` a cada instrutor devolvido por `listarInstrutores()` (`data-model.md`). Depende de T007.
- [X] T015 [US2] Rodar `pnpm vitest run` — confirmar que os testes de T012 passam e a
      suíte inteira continua em 0 falhas. **213 testes, 213 passam, 0 falham.**
- [X] T016 [US2] Reescrever a tabela/cartões de listagem em `app/(app)/instrutores/page.tsx`
      para consumir `listarInstrutoresComCargaHoraria()` (T014), exibindo exatamente as colunas
      Posto/Graduação, Nome Completo (via `formatarNomeInstrutor_` corrigida, T013), Categoria, OM,
      Regime e Carga Horária Total no ano — removendo a coluna de Status (FR-006/009). **Achado
      real durante a implementação, não previsto em `plan.md`/`research.md`**: RN-ANT-01 (Risco
      Alto) exige que toda lista/seletor de instrutores seja ordenada por antiguidade crescente —
      aplicado via `ordenarInstrutoresPorAntiguidade_` (nova, duplica `ESCALA_ANTIGUIDADE_POSTO` no
      front-end, mesmo padrão de constante duplicada por view já usado no projeto).
- [X] T017 [US2] Implementar a barra de filtros combinados (OM, Categoria, Capacitação Didática,
      Regime de Trabalho, Escolaridade) em `app/(app)/instrutores/page.tsx` — 5 `<select>`
      nativos populados a partir dos valores distintos já carregados, filtro client-side em memória
      combinando todos os selects ativos com E lógico (research.md §7). Depende de T016.

### Verificação manual (não automatizável — FR-006/007/008/009)

- [ ] T018 [US2] Seguir `quickstart.md` Passo 3 no navegador — confirmar nome legível para
      instrutores com e sem `Nome_Guerra`, as 6 colunas exatas, e os filtros combinados.

**Checkpoint**: Nome visível para 100% dos instrutores + listagem/filtros corretos — a segunda
metade do MVP (P1) completa.

---

## Phase 5: User Story 3 - Editar em nova aba, sem risco de alterar dado calculado (Priority: P2)

**Goal**: "Editar" abre uma nova aba do navegador já na tela de edição daquele instrutor (deep-link
via `app/layout.tsx` (layout raiz), Clarifications 2026-08-17); `ID_Instrutor`/CH Ministrada somente-leitura, protegidos
também no backend (`COLUNAS_FORMULA`).

**Independent Test**: Clicar em "Editar", confirmar que a nova aba abre já na tela certa
(`quickstart.md` Passo 4) — o roteamento/deep-link (`app/layout.tsx` (layout raiz), `COLUNAS_FORMULA`) é independente de
US1/US2, mas exibir o valor de Carga Horária Ministrada (FR-011) exige a mesma computação
introduzida em US1 (**achado do `/speckit-analyze`, F2**: `somarCargaHorariaPorInstrutor_`, T007 —
sem ela, o campo não tem valor real para mostrar). US3 pode ser implementada em paralelo com US1,
mas T025 especificamente depende de T007 já estar pronta.

### Tests for User Story 3 ⚠️

> Escrever este teste PRIMEIRO — `COLUNAS_FORMULA['instrutores']` ainda não existe.

- [X] T019 [US3] Escrever teste para a proteção de `Instrutor_Completo`/
      `Carga_Horaria_Ministrada_Ano` em `tests/unidade/regras_de_negocio_backend.test.ts` (arquivo já
      existente, já tem o harness `criarPlanilhaFalsa`/`carregarBackend` para `crudAtualizar`).
      Caso: `crudAtualizar('instrutores', id, {Email: 'novo@x.com', Instrutor_Completo: 'FORJADO',
      Carga_Horaria_Ministrada_Ano: 9999})` → só `Email` é gravado (`escritas` do mock não contém
      nenhuma chamada para as colunas de `Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano`).

### Implementation for User Story 3

- [X] T020 [US3] Adicionar `'instrutores': ['Instrutor_Completo', 'Carga_Horaria_Ministrada_Ano']`
      a `COLUNAS_FORMULA` em `lib/acoes/crud.ts` (research.md §6). Depende de T019 (teste deve
      existir e falhar antes).
- [X] T021 [US3] Rodar `pnpm vitest run` — confirmar que o teste de T019 passa e a
      suíte inteira continua em 0 falhas. **213 testes, 213 passam, 0 falham.**
- [X] T022 [P] [US3] Alterar `app/layout.tsx` para `app/layout.tsx` (layout raiz) em `app/layout.tsx` + `lib/supabase/server.ts`` — quando
      `e.parameter.editarInstrutor` está presente, atribuir a `template.deepLinkEditarInstrutor`
      antes de `.evaluate()`; ausente, atribuir string vazia (research.md §1). Sem dependência de
      T020 (achado do `/speckit-analyze`, F7: `lib/acoes/crud.ts`/``app/layout.tsx` + `lib/supabase/server.ts`` são arquivos e
      preocupações sem relação técnica real — pode rodar em paralelo com T019-T021).
- [X] T023 [US3] Adicionar `urlWebApp: o runtime do Next.js.getService().getUrl()` ao retorno de
      `getContextoInicial()` em `app/layout.tsx` + `lib/supabase/server.ts`` (research.md §2, `contracts/server-
      functions.md`).
- [X] T024 [US3] Injetar `const DEEP_LINK_EDITAR_INSTRUTOR = '<?!= deepLinkEditarInstrutor ?>';` em
      `app/layout.tsx`, mesmo mecanismo de scriptlet já usado por `<?!= include(...) ?>`
      (research.md §1). Depende de T022.
- [X] T025 [US3] Reescrever o painel de edição em `app/(app)/instrutores/page.tsx`: (a) botão
      "Editar" constrói `${AppState.ctx.urlWebApp}?editarInstrutor=${idInstrutor}` (T023) e chama
      `window.open(url, '_blank')` em vez de abrir o formulário inline atual; (b) `ID_Instrutor` e
      Carga Horária Ministrada renderizam como texto simples (`<span>`/`<dl>`, nunca `<input>`,
      mesmo `disabled` — FR-011); (c) todos os demais campos de `instrutores` ficam editáveis,
      **exceto** `Status` (achado do `/speckit-analyze`, F1 — permanece exclusivo da ação dedicada
      `desativarInstrutorClick` já existente, RN-INST-02) e os 3 campos de trilha de auditoria
      (`Editado_Por`/`Timestamp_Edicao`/`Origem_Migracao_v1`, nunca campos de formulário) — lista
      fechada nas Assumptions de `spec.md`; organizados em blocos visuais distintos (ex.:
      identificação, vínculo institucional, qualificação docente); (d) no boot (`contexto-pronto`),
      se `DEEP_LINK_EDITAR_INSTRUTOR` (T024) não estiver vazio, chama `irPara('tabInstrutores')` e
      abre o painel de edição já focado naquele `ID_Instrutor`, escondendo dashboard/listagem/
      filtros para uma experiência de edição focada; `ID_Instrutor` inválido/inexistente mostra
      mensagem de erro clara, nunca tela em
      branco (Edge Case de `spec.md`). Depende de T024 **e de T007 (US1)** — o valor de Carga
      Horária Ministrada exibido (FR-011) vem de `somarCargaHorariaPorInstrutor_`, não existe fonte
      própria de US3 para esse dado (achado do `/speckit-analyze`, F2).

### Verificação manual (não automatizável — FR-010/010.1/011/012/013)

- [ ] T026 [US3] Seguir `quickstart.md` Passo 4 no navegador — confirmar nova aba, campos
      somente-leitura, blocos visuais, e o comportamento de `ID_Instrutor` inválido no deep-link.

**Checkpoint**: Edição protegida contra alteração acidental de dado calculado, em nova aba
focada — 3 das 4 User Stories completas.

---

## Phase 6: User Story 4 - Vincular habilitação sem precisar decorar IDs (Priority: P2)

**Goal**: Dropdown de instrutor no formulário de vínculo de habilitação mostra
"[Posto/Graduação] [Nome Completo]" — nunca um ID cru, nunca dependente de `Nome_Guerra` (vazio em
98,9% dos casos).

**Independent Test**: Abrir o formulário de vínculo de habilitação e confirmar o texto de cada
opção do dropdown de instrutor (`quickstart.md` Passo 5) — o comportamento em si é isolado do resto
do módulo, mas a implementação (T027) toca a mesma função `carregarInstrutores()` que a listagem de
US2 (T016, achado do `/speckit-analyze` F3) — não é um arquivo/função exclusivo desta User Story.

### Implementation for User Story 4

- [X] T027 [US4] Atualizar `carregarInstrutores()` em `app/(app)/instrutores/page.tsx` — o
      `<option>` do dropdown `vincInstrutor` passa a `value="${i.ID_Instrutor}"` com texto
      `"${i.Posto_Graduacao || ''} ${i.Nome_Completo || i.ID_Instrutor}".trim()` (texto puro, sem
      HTML/negrito — um `<option>` não renderiza markup, diferente da listagem de T016) em vez de
      `i.Nome_Guerra || i.ID_Instrutor` (FR-014).

### Verificação manual (não automatizável — FR-014)

- [ ] T028 [US4] Seguir `quickstart.md` Passo 5 no navegador — confirmar
      "[Posto/Graduação] [Nome Completo]" em cada opção, mesmo para instrutores sem `Nome_Guerra`.

**Checkpoint**: As 4 User Stories completas e verificáveis independentemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, `o SHA do commit`, verificação manual fim a fim,
documentação.

- [X] T029 [P] Atualizar `RN-ANT-02` em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` —
      revisar a escala de `CMG=1, CF=2, CC=3, CT=4, 1°Ten=5, 2°Ten=6, SO=7, 1°SG=8, 2°SG=9, 3°SG=10,
      CB=11, MN=12` para incluir `SC=11` ("Servidor Civil") e remover `CB`/`MN` da escala ativa (não
      existem no domínio real de `Posto_Graduacao`, achado 2/3 de `spec.md`), formalizando a decisão
      já tomada informalmente em 2026-08-14 (`migracao/normalizar_posto_graduacao.py`). Achado do
      `/speckit-analyze` (F4): este hotfix documentava o compromisso de atualizar o texto da regra
      (Assumptions de `spec.md`), mas nenhuma tarefa o executava — só T031 (abaixo) o verificava
      como se já tivesse acontecido.
- [X] T030 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline
      + os casos novos de T002-T004/T012/T019) em 0 falhas, 0 regressão.
- [ ] T031 Seguir `quickstart.md` do início ao fim no navegador (Passos 2-5), após implantação via
      `o fluxo Git → Vercel` — confirmar as 4 User Stories juntas, inclusive que `RN-ANT-02` (T029) já reflete
      `SC`=Servidor Civil no texto.
- [X] T032 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e
      `const o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
- [X] T033 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linhas de `lib/acoes/estatisticas.ts`,
      `lib/acoes/instrutores.ts`, `lib/acoes/crud.ts`, ``app/layout.tsx` + `lib/supabase/server.ts`, `components/ciaara/`, `app/layout.tsx`` e
      `app/(app)/instrutores/page.tsx` ganham uma frase citando este épico (mesmo padrão de "última
      alteração" já usado para todo épico/hotfix anterior).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: não aplicável (ver nota acima).
- **US1 (Phase 3)**: depende só de Setup. Arquivos: `lib/acoes/instrutores.ts`, `lib/acoes/estatisticas.ts`,
  `app/(app)/instrutores/page.tsx` (seção de estatísticas).
- **US2 (Phase 4)**: depende de **T007 (US1)** — `somarCargaHorariaPorInstrutor_` é reaproveitada
  por `listarInstrutoresComCargaHoraria()` (T014). Fora isso, US2 é independente do resto de US1
  (não depende de `getEstatisticasInstrutores`/gráficos).
- **US3 (Phase 5)**: T019-T024 dependem só de Setup — arquivos isolados (`lib/acoes/crud.ts`, ``app/layout.tsx` + `lib/supabase/server.ts``,
  `app/layout.tsx`). **T025 depende também de T007 (US1)** — o campo de Carga Horária Ministrada do
  painel de edição (FR-011) usa a mesma computação do dashboard, achado do `/speckit-analyze` F2. A
  seção de edição de `app/(app)/instrutores/page.tsx` (T025) não se sobrepõe às seções de estatísticas (US1)
  ou listagem (US2) tocadas no mesmo arquivo.
- **US4 (Phase 6)**: depende só de Setup, mas **T027 toca a mesma função que T016 (US2)** —
  `carregarInstrutores()` hoje popula tanto a listagem quanto o dropdown de vínculo na mesma função
  (achado do `/speckit-analyze` F3). T016 e T027 não são seguras para implementar em paralelo sem
  coordenação — ou sequenciar (T016 antes de T027, ou vice-versa), ou combinar as duas edições numa
  única passagem pela função.
- **Polish (Phase 7)**: depende de todas as User Stories completas.

### Within Each User Story

- Teste antes de implementação (US1 T002-T004, US2 T012, US3 T019) — mesmo padrão TDD já usado
  nas specs anteriores desta sessão para lógica pura testável.
- Implementação de backend antes de frontend, dentro de cada User Story.

### Parallel Opportunities

- **T002, T003, T004 (US1, testes)** podem ser escritos em paralelo — casos de teste independentes
  dentro do mesmo arquivo, mas cobrindo funções diferentes ainda não implementadas.
- **US1 e US4 podem ser implementadas em paralelo** por pessoas diferentes — arquivos totalmente
  distintos (`lib/acoes/instrutores.ts`/`lib/acoes/estatisticas.ts` vs. o trecho do dropdown de vínculo em
  `app/(app)/instrutores/page.tsx`), sem dependência entre si.
- **US2 e US4 NÃO são seguras para paralelo sem coordenação** (achado do `/speckit-analyze`, F3) —
  T016 e T027 editam a mesma função `carregarInstrutores()`; sequenciar ou combinar as duas edições.
- **US3 é independente de US2/US4** e pode começar a qualquer momento após o Setup, mas **depende de
  T007 (US1)** para o valor exibido de Carga Horária Ministrada (achado F2 — só T025 tem essa
  dependência, T019-T024 continuam livres para começar imediatamente).
- T032/T033 (Polish) podem rodar em paralelo entre si — arquivos diferentes. T029 (Polish) também
  pode rodar em paralelo com qualquer User Story — arquivo de documentação isolado.

---

## Parallel Example: Testes de User Story 1

```bash
Task: "T002 [P] [US1] Testes de ordenarPorAntiguidadePosto_ em tests/regras_ui_dados.test.ts"
Task: "T003 [P] [US1] Testes de contarHabilitadosDistintos_/contarSelecionadosDistintos_"
Task: "T004 [P] [US1] Testes de somarCargaHorariaPorInstrutor_"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2, ambas P1)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (US1 — dashboard correto, inclusive `somarCargaHorariaPorInstrutor_` que US2
   vai reaproveitar).
3. Completar Phase 4 (US2 — nome legível + listagem/filtros).
4. **PARAR E VALIDAR**: seguir `quickstart.md` Passos 2-3 — as duas falhas mais graves relatadas
   (dados errados no dashboard, nome invisível) já estão corrigidas, entregável como MVP se
   necessário.

### Incremental Delivery

1. Setup → US1 (dashboard correto) → US2 (nome legível + listagem) — MVP P1 completo.
2. US3 (edição protegida, nova aba) — pode entrar em paralelo com US1/US2 (arquivos isolados).
3. US4 (dropdown de vínculo sem ID) — menor de todas, qualquer momento após Setup.
4. Polish → implantar tudo junto via `o fluxo Git → Vercel` (`o SHA do commit` único para as 4 User Stories).

---

## Notes

- Nenhuma tarefa deste épico cria arquivo novo — as 4 User Stories entram inteiramente nos 7
  arquivos de produção já existentes citados em `plan.md`, mais `docs/fase-1/04-Regras-de-Negocio-
  a-Preservar.md` (T029, Polish — atualização de `RN-ANT-02`, achado do `/speckit-analyze` F4).
- `app/(app)/instrutores/page.tsx` é tocado pelas 4 User Stories. US1 (estatísticas) e US3 (painel de edição)
  ficam em seções isoladas, com paralelismo real. **US2 (listagem) e US4 (dropdown de vínculo)
  editam a mesma função, `carregarInstrutores()`** (achado do `/speckit-analyze`, F3) — sequenciar
  T016 antes de T027 (ou combinar as duas edições numa só passagem), não tratar como paralelo
  seguro; mais leve que o bloqueio total do Hotfix 013 (onde as 3 User Stories editavam a mesma
  função em sequência da primeira à última), mas real.
- Commit por fase concluída (US1, US2, US3, US4, Polish) — 5 commits esperados na implementação,
  mesmo padrão de "1 unidade de mudança pequena e testável por commit" (Princípio VI). O commit de
  Polish inclui a atualização de `RN-ANT-02` (T029) junto com `o SHA do commit`/`02-modularizacao.md`.
