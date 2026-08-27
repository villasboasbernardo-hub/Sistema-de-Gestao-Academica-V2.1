# Tasks: Hotfix — Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

**Input**: Design documents from `specs/015-hotfix-filtros-cross-instrutores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/server-functions.md`, `quickstart.md`

**Tests**: Solicitados explicitamente por `research.md`/`plan.md` para toda a lógica pura nova
(enriquecimento, predicado de 8 filtros, agregação de KPIs/gráficos) — mesmo padrão TDD já usado em
todos os hotfixes desta sessão. Reatividade real de DOM/Recharts, e a ausência de chamada de rede
por filtro, são browser, fora do alcance de `pnpm vitest run` — verificação manual via `quickstart.md`.

**Organization**: Uma fase Foundational (compartilhada, genuinamente bloqueante — ao contrário da
spec 014, aqui as duas User Stories P1 dependem do mesmo enriquecimento/predicado/estado de filtro)
mais uma fase por User Story de `spec.md`. **Ordem de fase invertida em relação à numeração de
`spec.md`**: User Story 2 (a barra com as 8 categorias) é implementada em Phase 3, antes de User
Story 1 (Phase 4, a reatividade de KPIs/gráficos) — decisão explícita, não descuido: o próprio
`spec.md` já documenta que "sem as 8 categorias existirem como filtro, a User Story 1 não tem o que
filtrar" (Why priority de US2), e o Independent Test de US1 pressupõe a barra já funcionando
("escolher qualquer valor em qualquer filtro da barra"). US1 continua P1/"mais crítica" e MVP —
só a ordem de implementação segue a dependência técnica real, mesmo espírito de transparência já
usado para a inversão de fases do Épico B (achado F1 do `/speckit-analyze` daquela spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1/US2/US3)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **213 testes, 213 passam, 0
      falham** (mesmo estado final do Hotfix Módulo de Instrutores, `o SHA do commit`
      `2026-08-17.MODINSTR.2`) antes de tocar qualquer arquivo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dados carregados no boot, enriquecimento client-side e predicado de 8 filtros —
prerequisito genuíno de US1 **e** US2 (ao contrário da spec 014, nenhuma das duas User Stories P1
desta spec é implementável isoladamente sem isto).

**⚠️ CRITICAL**: Nenhuma User Story pode começar antes desta fase estar completa.

### Tests for Foundational ⚠️

> Escrever estes testes PRIMEIRO — as funções ainda não existem, devem falhar antes da
> implementação.

- [X] T002 [P] Criar `tests/unidade/filtros_cross_instrutores.test.ts` com o harness de carregamento de
      `app/(app)/instrutores/page.tsx` (extração `<script>...</script>` via regex + `vm.
      runInContext`, mesmo padrão de `tests/unidade/design_system.test.ts` para `components/ciaara/`) — **adaptado**
      porque, ao contrário de `components/ciaara/` (100% script), `app/(app)/instrutores/page.tsx` tem HTML antes do
      `<script>` (usar `.match(/<script>([\s\S]*)<\/script>/)[1]`, mesma técnica de
      `carregarFuncoesPurasViewCurso_`/`carregarFuncoesPurasViewInicio_` em `tests/
      regras_ui_dados.test.ts`) **e** tem uma linha executável de nível superior
      (`document.addEventListener('contexto-pronto', () => {...})`, corpo multi-linha, diferente do
      callback de referência única de `app/(app)/cursos/[curso]/page.tsx`/`app/(app)/inicio/page.tsx`) que precisa ser removida
      antes de importação direta do módulo para não lançar `ReferenceError: document is not defined` no sandbox
      vazio (mesmo achado do `/speckit-analyze` F1 do Hotfix 010, regex adaptada para um bloco
      multi-linha). Escrever os testes de `enriquecerInstrutoresParaFiltros_(instrutores, vinculos,
      disciplinas)` (`research.md` §2, `data-model.md` §2): (a) instrutor com vínculo `Status='Ativo'`
      em `instrutor_disciplina` mas ausente de todo `disciplinas.ID_Instrutor` →
      `_qualificado=true`, `_selecionado=false`; (b) o inverso (selecionado sem qualificação, achado 5
      de `spec.md`) → `_qualificado=false`, `_selecionado=true`; (c) `Posto_Graduacao='CMG'` →
      `_circuloHierarquico='Oficiais'`; `Posto_Graduacao='SO'` → `'Praças'`; `Posto_Graduacao='SC'` →
      `''` (Edge Case); (d) `_cursosVinculados` de um instrutor só-qualificado numa disciplina do
      Curso A e só-selecionado noutra disciplina do Curso B → `Set` contém A **e** B (união, FR-005).
- [X] T003 Estender `tests/unidade/filtros_cross_instrutores.test.ts` (mesmo arquivo de T002,
      sequencial — harness compartilhado) com os testes de `instrutorPassaNosFiltros_(instrutor
      Enriquecido, filtrosAtivos, classificacaoPorCursoNormalizada)` (`data-model.md` §4): (a) 2+
      filtros ativos simultaneamente → só passa quem atende a todos (E lógico, FR-013), com um caso
      onde um instrutor atende só 1 dos 2 filtros e é corretamente excluído; (b) `status=
      'Qualificados'` e `status='Selecionados'` aplicados separadamente ao mesmo instrutor
      "selecionado sem qualificação" (do caso T002-b) → resultados diferentes, nenhum força o outro
      (Edge Case de `spec.md`); (c) `circuloHierarquico='Oficiais'` aplicado a um instrutor `SC` →
      excluído; filtro vazio (`''`) → incluído; (d) `classificacaoCurso` testado com variação de
      capitalização/espaço no dado de `cursos.Classificacao` (ex. `'estágio de qualificação'` vs.
      `'Estágio de Qualificação'`) → mesmo resultado, via `normalizarClassificacao_` (regressão
      conhecida do Hotfix 013 a não repetir, FR-006).

### Implementation for Foundational

- [X] T004 Implementar `CIRCULO_HIERARQUICO_POR_POSTO` (constante) e
      `enriquecerInstrutoresParaFiltros_(instrutores, vinculos, disciplinas)` no `<script>` de
      `app/(app)/instrutores/page.tsx` (`research.md` §2/§4). Depende de T002 (teste deve existir e
      falhar antes).
- [X] T005 Implementar `normalizarClassificacao_(valor)` (duplicada de `app/(app)/inicio/page.tsx`,
      mesmo padrão de utilitário pequeno já aceito no projeto) e `instrutorPassaNosFiltros_(instrutor
      Enriquecido, filtrosAtivos, classificacaoPorCursoNormalizada)` no `<script>` de
      `app/(app)/instrutores/page.tsx` (`data-model.md` §4). Depende de T003 e de T004 (mesmo
      arquivo, sequencial — não seguro para paralelo com T004).
- [X] T006 Redesenhar `filtrosInstrutoresAtivos` para as 8 chaves de `data-model.md` §3
      (substituindo as 5 atuais: `om`/`categoria`/`capacitacao`/`regime`/`escolaridade` →
      `curso`/`classificacaoCurso`/`status`/`postoGraduacao`/`circuloHierarquico`/`categoria`/`om`/
      `capacitacao`) e reescrever o boot (`document.addEventListener('contexto-pronto', ...)`) para
      `Promise.all([gs('listarInstrutoresComCargaHoraria'), gs('listarDisciplinas'), gs('crudListar',
      'instrutor_disciplina')])`, chamando `enriquecerInstrutoresParaFiltros_` (T004) uma única vez
      sobre o resultado antes da primeira renderização (`research.md` §1/§2). Depende de T004, T005.
- [X] T007 Rodar `pnpm vitest run` — confirmar que os testes de T002/T003 passam e a
      suíte inteira continua em 0 falhas. **226 testes, 226 passam, 0 falham** (213 baseline + 13
      novos).

**Checkpoint**: Dados enriquecidos e predicado de 8 filtros prontos — as duas User Stories P1 podem
começar.

---

## Phase 3: User Story 2 - Filtrar instrutores pelas 8 categorias exigidas (Priority: P1)

**Goal**: Barra de filtros com exatamente 8 caixas de seleção (Curso, Classificação de Curso,
Status, Posto/Graduação, Círculo Hierárquico, Categoria, OM, Capacitação Didática), cada uma com o
domínio de valores exigido, e a listagem reagindo à interseção de todos os filtros ativos.

**Independent Test**: Abrir o módulo de Instrutores, confirmar as 8 caixas com os rótulos e opções
exigidos, e testar cada uma isoladamente contra a listagem (`quickstart.md` Passo 3/5) — testável sem
que o painel de estatísticas reaja a nada (isso é US1).

### Implementation for User Story 2

- [X] T008 [US2] Reescrever a barra de filtros HTML em `app/(app)/instrutores/page.tsx` — 8
      `<select>` (Curso, Classificação de Curso, Status, Posto/Graduação, Círculo Hierárquico,
      Categoria, OM, Capacitação Didática), substituindo os 5 atuais (OM, Categoria, Capacitação,
      Regime, Escolaridade — FR-004).
- [X] T009 [US2] Implementar `RÓTULOS_CATEGORIA_FILTRO` (constante nova, distinta de `RÓTULOS_
      CATEGORIA` do gráfico "Classificação" — FR-010, divergência aceita em Assumptions de
      `spec.md`) e reescrever `popularOpcoesFiltrosInstrutores_` em `app/(app)/instrutores/page.tsx` para popular as 8 caixas: Curso a partir de `AppState.ctx.cursos`; Classificação de Curso
      com as 5 classificações reais fechadas (FR-006); Status com as 3 opções fixas "Qualificados"/
      "Selecionados"/"Inativos" (FR-007); Posto/Graduação com os valores distintos presentes,
      ordenados por antiguidade (reaproveitar `ORDEM_ANTIGUIDADE_POSTO` já existente no arquivo,
      FR-008); Círculo Hierárquico com as 2 opções fixas "Oficiais"/"Praças" (FR-009); Categoria via
      `RÓTULOS_CATEGORIA_FILTRO` (FR-010); OM com os valores distintos (FR-011); Capacitação Didática
      com as qualificações individuais distintas mais "Sem capacitação didática" (FR-012). Depende de
      T006 (Foundational) e é sequencial com T008 (mesmo arquivo).
- [X] T010 [US2] Reescrever `aplicarFiltrosInstrutores`/`renderizarListagemInstrutores_` em
      `app/(app)/instrutores/page.tsx` para ler as 8 chaves de `filtrosInstrutoresAtivos` (T006) e
      chamar `instrutorPassaNosFiltros_` (T005) para cada instrutor enriquecido, combinando as 8
      condições com E lógico por construção do próprio predicado (FR-013/015). Depende de T009
      (sequencial, mesmo arquivo).
- [X] T011 Rodar `pnpm vitest run` — confirmar 0 falhas (nenhum caso novo esperado nesta
      fase além dos já cobertos em Foundational). **226 testes, 226 passam, 0 falham.**

### Verificação manual (não automatizável — FR-004 a FR-013)

- [ ] T012 [US2] Seguir `quickstart.md` Passo 2 (ausência de chamada de rede ao trocar filtro — já
      válido nesta fase, a listagem sozinha não depende de US1), Passo 3 (as 8 caixas e suas opções
      exatas) e Passo 5 (filtro Curso/Classificação de Curso com união qualificação+seleção, contra a
      banco de produção) no navegador — implantação via `o fluxo Git → Vercel` necessária antes.

**Checkpoint**: Barra com as 8 categorias exigidas e listagem reagindo corretamente — testável
independentemente da reatividade das estatísticas.

---

## Phase 4: User Story 1 - Ver listagem, gráficos e KPIs mudarem juntos ao aplicar um filtro (Priority: P1) 🎯 "o mais crítico"

**Goal**: Qualquer mudança em qualquer um dos 8 filtros recalcula e re-renderiza, junto com a
listagem (já entregue em US2), os 4 KPIs e os 7 gráficos do painel de estatísticas — sem nenhuma
chamada nova ao backend, e sem nunca mostrar dado não filtrado seguido de uma correção perceptível.

**Independent Test**: Com o painel de estatísticas expandido, escolher "Oficiais" no filtro Círculo
Hierárquico e confirmar que KPI Total, listagem e os 7 gráficos (inclusive OM e Capacitação Didática)
mudam no mesmo instante, sem indicador de rede (`quickstart.md` Passo 2/4 — critério de aceite
literal do pedido original, SC-004).

### Tests for User Story 1 ⚠️

> Escrever estes testes PRIMEIRO — a função ainda não existe, deve falhar antes da implementação.

- [X] T013 [US1] Estender `tests/unidade/filtros_cross_instrutores.test.ts` (T002) com os testes de
      `agregarEstatisticasInstrutores_(instrutoresFiltrados)` (`data-model.md` §5) — **portando as 5
      asserções hoje cobertas pelos testes de `getEstatisticasInstrutores` em
      `tests/unidade/regras_ui_dados.test.ts` (linhas ~501-549, describe "FR-014/015 - `lib/acoes/estatisticas.ts`")**,
      adaptadas para operar sobre um array de instrutores já enriquecido/filtrado em vez de um mock de
      planilha: (a) 4 KPIs corretos (total, comCapacitacaoDidatica, cargaHorariaTotalMinistradaAno via
      soma de `cargaHorariaMinistradaAno` já anexado, qualificados/selecionados via `_qualificado`/
      `_selecionado`); (b) Posto/Graduação ordenado por antiguidade, nunca alfabético; (c)
      Classificação usa os rótulos de exibição (achado 4 da spec 014, `RÓTULOS_CATEGORIA` — cliente);
      (d) Capacitação Didática conta cada qualificação separadamente (CSV multivalorado); (e) OM e
      Regime de Trabalho agregados. Mais 1 caso novo desta spec: (f) subconjunto vazio (`[]`) → todos
      os KPIs zerados, as 7 séries vazias, sem lançar exceção (FR-018).
- [X] T014 [US1] Implementar `agregarEstatisticasInstrutores_` e `contarPorChaveClient_` (mirror
      client-side de `contarPorChave_`) e a constante `RÓTULOS_CATEGORIA` (cópia client-side, mesmos 4
      pares da versão backend que será removida em T017) no `<script>` de
      `app/(app)/instrutores/page.tsx` (`data-model.md` §5). Depende de T013.

### Implementation for User Story 1

- [X] T015 [P] [US1] Modificar `renderizarGrafico_(elementoId, tipo, categorias, series)` em
      `components/ciaara/` — registro de instâncias Recharts por `elementoId`, destruindo
      (`.destroy()`) a anterior antes de criar uma nova (`research.md` §3). Retrocompatível com os
      outros 3 painéis de estatística do projeto (Cursos/Disciplinas/Turmas) — arquivo diferente de
      T014, sem dependência, seguro para paralelo.
- [X] T016 [US1] Reescrever `carregarEstatisticasInstrutores`/`alternarEstatisticasInstrutores` em
      `app/(app)/instrutores/page.tsx`: substituir `gs('getEstatisticasInstrutores')` por uma
      chamada direta a `agregarEstatisticasInstrutores_` (T014) sobre o subconjunto atualmente
      filtrado; disparar o recálculo a cada mudança de filtro quando o painel estiver visível, e
      também na primeira expansão do painel (garantindo que ele já nasça mostrando o filtro ativo no
      momento, nunca o total geral seguido de correção — FR-016/017); remover o uso de
      `AppState.cache.estatisticasInstrutores` (recomputar é barato o suficiente para não precisar de
      cache) e as 2 chamadas agora obsoletas de `AppState.invalidar('estatisticasInstrutores')` em
      `salvarInstrutor`/`desativarInstrutorClick`. Depende de T010 (US2, barra/predicado já
      funcionando), T014 e T015.
- [X] T017 [P] [US1] Remover `getEstatisticasInstrutores()` e `RÓTULOS_CATEGORIA` de
      `lib/acoes/estatisticas.ts` (`contracts/server-functions.md` — zero consumidor restante) e
      remover os 5 `test(...)` correspondentes em `tests/unidade/regras_ui_dados.test.ts` (dentro do
      `describe("FR-014/015 - `lib/acoes/estatisticas.ts` (agregacao no backend)")`, linhas ~501-549) — manter
      `montarMock`/`carregarEstatisticasCompleto` e os testes de `getEstatisticasCursos()`/
      `getEstatisticasDisciplinas()`/`getEstatisticasTurmas()` intactos (ainda ativos, não tocados).
      Depende de T013 (cobertura já portada para o novo arquivo antes de remover a antiga) — arquivos
      diferentes de T016, seguro para paralelo com ele.
- [X] T018 Rodar `pnpm vitest run` — confirmar que os testes de T013 passam, os 5 testes
      removidos em T017 não deixam referência quebrada, e a suíte inteira fecha em 0 falhas.
      **227 testes, 227 passam, 0 falham** (232 − 5 órfãos removidos).

### Verificação manual (não automatizável — FR-014 a FR-018)

- [ ] T019 [US1] Seguir `quickstart.md` Passo 2 (ausência de chamada de rede por filtro) e Passo 4 (o
      cenário "Oficiais" mudando KPI/listagem/gráficos simultaneamente, e o caso de filtro sem
      resultado nenhum) no navegador.

**Checkpoint**: As duas User Stories P1 completas e verificáveis — MVP do pedido original entregue.

---

## Phase 5: User Story 3 - Ver "qualificado" em vez de "habilitado" em toda a interface (Priority: P2)

**Goal**: Nenhuma ocorrência de "habilitado"/"habilitação"/"habilitar" permanece na interface do
módulo — "qualificado" no lugar, nos 6 pontos já inventariados no achado 6 de `spec.md`, sem mudar
nenhum cálculo por trás.

**Independent Test**: Inspecionar visualmente os 6 pontos de UI (título da seção de vínculo, botão,
mensagem de sucesso, rótulo de coluna, KPI, título de gráfico) e confirmar ausência total da raiz
"habilita-" (`quickstart.md` Passo 6) — testável independentemente de US1/US2 (é troca de texto,
não de comportamento).

### Implementation for User Story 3

- [X] T020 [US3] Substituir os 6 pontos de texto do achado 6 de `spec.md` em
      `app/(app)/instrutores/page.tsx`: título "Vínculo de habilitação" → "Vínculo de
      qualificação"; botão "Habilitar" → "Qualificar"; mensagem "Vínculo de habilitação criado." →
      "Vínculo de qualificação criado."; rótulo de coluna `Esp_Hab_Obs`/"Especialidade/Habilitação" →
      "Especialidade/Qualificação"; rótulo do KPI "Taxa de Seleção (Selecionados/Habilitados)" →
      "Taxa de Seleção (Selecionados/Qualificados)"; título do gráfico "Habilitados vs. Selecionados"
      → "Qualificados vs. Selecionados" (FR-001/002/003) — nenhuma mudança de nome de função/variável
      nem do valor calculado por trás de cada rótulo. Sequenciada por último entre os arquivos de
      conteúdo desta spec para evitar conflito de merge com T008-T010/T016 (mesmo arquivo), embora
      logicamente independente delas.

### Verificação manual (não automatizável — FR-001/002/003)

- [ ] T021 [US3] Seguir `quickstart.md` Passo 6 no navegador — confirmar zero ocorrências da raiz
      "habilita-" e que os valores numéricos de "Qualificados" batem com os de "Habilitados" de antes
      desta spec.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, `o SHA do commit`, verificação manual fim a fim,
documentação.

- [X] T022 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04). Novo valor:
      `2026-08-17.FILTROS.1`.
- [X] T023 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linhas de `lib/acoes/estatisticas.ts`,
      `components/ciaara/` e `app/(app)/instrutores/page.tsx` ganham uma frase citando este hotfix (mesmo padrão de
      "última alteração" já usado para todo épico/hotfix anterior).
- [X] T024 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline
      213 − 5 removidos em T017 + casos novos de T002/T003/T013) em 0 falhas, 0 regressão. **227
      testes, 227 passam, 0 falham** (213 baseline − 5 órfãos + 19 novos em
      `tests/unidade/filtros_cross_instrutores.test.ts`).
- [ ] T025 Seguir `quickstart.md` do início ao fim no navegador (Passos 2-7), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende de Setup — **bloqueia US1 e US2**, ao contrário da spec 014
  (aqui o enriquecimento/predicado/estado de filtro é compartilhado de verdade pelas duas).
- **US2 (Phase 3)**: depende de Foundational (T004-T006). Arquivo: `app/(app)/instrutores/page.tsx` (barra +
  listagem).
- **US1 (Phase 4)**: depende de Foundational **e de T010 (US2)** — a reatividade dos KPIs/gráficos
  reage ao mesmo estado de filtro/listagem que US2 constrói; não é possível demonstrar "listagem e
  gráficos mudam juntos" sem a listagem já reagindo (US2) primeiro. Arquivos: `app/(app)/instrutores/page.tsx`
  (seção de estatísticas), `components/ciaara/` (`renderizarGrafico_`), `lib/acoes/estatisticas.ts` (remoção).
- **US3 (Phase 5)**: depende só de Foundational (nenhuma lógica nova, só texto) — logicamente
  independente de US1/US2, mas sequenciada por último no mesmo arquivo (`app/(app)/instrutores/page.tsx`) para
  evitar conflito de merge com as reescritas de T008-T010/T016.
- **Polish (Phase 6)**: depende de todas as User Stories completas.

### Within Each Phase

- Teste antes de implementação (T002/T003 antes de T004/T005; T013 antes de T014) — mesmo padrão TDD
  já usado nas specs anteriores desta sessão para lógica pura testável.
- Dentro de Foundational e US2, todas as tarefas de implementação tocam o mesmo arquivo
  (`app/(app)/instrutores/page.tsx`) em sequência — não há paralelismo seguro entre T004→T005→T006→T008→T009→
  T010, mesmo quando não explicitamente `[P]`.

### Parallel Opportunities

- **T002 (Foundational)** pode começar imediatamente após Setup — cria um arquivo novo, sem conflito
  com nenhuma outra tarefa desta fase.
- **T015 (US1, `components/ciaara/`) e T014 (US1, `app/(app)/instrutores/page.tsx`)** são seguras para paralelo —
  arquivos diferentes, sem dependência entre si (`renderizarGrafico_` não depende da forma exata do
  retorno de `agregarEstatisticasInstrutores_`, só do contrato já estável de `data-model.md`).
- **T017 (US1, `lib/acoes/estatisticas.ts` + `tests/unidade/regras_ui_dados.test.ts`) e T016 (US1,
  `app/(app)/instrutores/page.tsx`)** são seguras para paralelo — arquivos diferentes, ambas dependendo só de
  T013/T014 já estarem prontas (não uma da outra).
- **T022/T023 (Polish)** podem rodar em paralelo entre si — arquivos diferentes.
- **US3 (Phase 5) pode ser implementada por outra pessoa a qualquer momento após Foundational** —
  mas como toca o mesmo arquivo das outras duas User Stories, coordenar para não colidir com edições
  simultâneas (mesmo achado de risco já documentado para US2/US4 na spec 014).

---

## Parallel Example: User Story 1

```bash
Task: "T014 [US1] Implementar agregarEstatisticasInstrutores_ em `app/(app)/instrutores/page.tsx`"
Task: "T015 [P] [US1] Modificar renderizarGrafico_ em `components/ciaara/`"
```

```bash
Task: "T016 [US1] Rewire carregarEstatisticasInstrutores em `app/(app)/instrutores/page.tsx`"
Task: "T017 [P] [US1] Remover getEstatisticasInstrutores em `lib/acoes/estatisticas.ts` + testes órfãos"
```

---

## Implementation Strategy

### MVP First (Foundational + US2 + US1, as 3 fases P1-relevantes)

1. Completar Phase 1 (Setup).
2. Completar Phase 2 (Foundational — enriquecimento, predicado, boot com 3 leituras em paralelo).
3. Completar Phase 3 (US2 — barra com 8 filtros, listagem reagindo).
4. Completar Phase 4 (US1 — KPIs/gráficos reagindo junto, "o mais crítico").
5. **PARAR E VALIDAR**: seguir `quickstart.md` Passos 2-5 — o critério de aceite literal do pedido
   ("selecionar Oficiais muda listagem e gráficos de OM/Capacitação Didática") já está cumprido,
   entregável como MVP se necessário.

### Incremental Delivery

1. Setup → Foundational → US2 (barra funcionando) → US1 (cross-filtering completo) — MVP P1
   completo, é o próprio pedido original ponta a ponta.
2. US3 (terminologia) — pode entrar a qualquer momento após Foundational, mais leve que o resto.
3. Polish → implantar tudo junto via `o fluxo Git → Vercel` (`o SHA do commit` único para as 3 User Stories).

---

## Notes

- Nenhuma tarefa desta spec cria view nova ou rota nova — entra inteiramente em 3 arquivos de
  produção já existentes (`app/(app)/instrutores/page.tsx`, `components/ciaara/`, `lib/acoes/estatisticas.ts`) mais 1 arquivo de
  teste novo (`tests/unidade/filtros_cross_instrutores.test.ts`) e 1 arquivo de teste editado (`tests/
  regras_ui_dados.test.ts`, remoção de 5 casos órfãos).
- `app/(app)/instrutores/page.tsx` é tocado por Foundational, US2 e US1 (seções relacionadas — dados/
  enriquecimento, barra/listagem, estatísticas — mas o mesmo arquivo) e por US3 (texto). Sequenciar
  na ordem das fases evita a maior parte do risco de conflito; T014/T015 e T016/T017 são as únicas
  duas oportunidades reais de paralelismo dentro de US1 (arquivos diferentes).
- Commit por fase concluída (Foundational, US2, US1, US3, Polish) — 5 commits esperados na
  implementação, mesmo padrão de "1 unidade de mudança pequena e testável por commit" (Princípio VI).
