# Tasks: Ficha de Cadastro de Instrutores e Formulário Avançado

**Input**: Design documents from `specs/016-ficha-formulario-instrutores/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/server-functions.md`, `quickstart.md`

**Tests**: Solicitados explicitamente por `research.md`/`plan.md` para toda a lógica pura nova
(geração de ID, stamping de auditoria, cálculo de Antiguidade/Tempo no Setor, normalização de
`Esp_Hab_Obs`, serialização da matriz de Preferência) — mesmo padrão TDD já usado em todos os
hotfixes/épicos desta sessão. Máscara de NIP em tempo real, datepickers, o modal da Ficha e a nova
tabela de cadastro/edição são DOM/navegador — fora do alcance de `pnpm vitest run`, verificação manual via
`quickstart.md`.

**Organization**: Uma fase Foundational (compartilhada — FR-005 exige explicitamente que US1 e US2
usem o **mesmo** formulário/motor de renderização, então o motor em si é construído uma única vez,
antes das duas). US1 (Cadastrar) e US2 (Editar) na ordem de `spec.md`; US3 (Imprimir Ficha) é
independente das outras duas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1/US2/US3)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **227 testes, 227 passam, 0
      falham** (mesmo estado final do Hotfix Filtros/Cross-Filtering, `o SHA do commit`
      `2026-08-17.FILTROS.1`) antes de tocar qualquer arquivo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migração de schema, motor de cálculo/validação server-side, funções puras client-side e
o motor de renderização único do formulário (data-model.md §2) — prerequisito genuíno de US1 **e**
US2 (FR-005: mesmo formulário para as duas).

**⚠️ CRITICAL**: Nenhuma User Story pode começar antes desta fase estar completa.

### Migração de schema (FR-001/002)

- [X] T002 Escrever `migracao/remover_coluna_ultima_avaliacao_desempenho.py` (research.md §9) —
      mesmo padrão de `migracao/_util_migracao.py` (`fazer_backup`, `gravar_log`, `salvar`) já usado
      pelos 6 scripts anteriores: `fazer_backup("pre-remover-ultima-avaliacao-desempenho")`,
      `ws.delete_cols(...)` na coluna `Ultima_Avaliacao_Desempenho` de `instrutores`, 1 entrada em
      `migracao_log` (`Acao="Arquivado"`, `Chave_Origem`/`Chave_Destino="instrutores"` — mudança
      estrutural de coluna, não de uma linha específica). Checagem de idempotência: se a coluna já
      não existir, não faz nada (mesmo padrão dos scripts anteriores).
- [X] T003 Rodar `python migracao/remover_coluna_ultima_avaliacao_desempenho.py` contra a cópia de
      trabalho local — confirmar backup criado, `migracao_log` com 1 linha nova, e a coluna ausente
      do arquivo salvo (reabrir com `openpyxl` e conferir `instrutores` com 30 colunas, não mais
      31). **Concluído**: backup `Banco de dados CIAARA-11 v2.0 (backup pre-remover-ultima-avaliacao-
      desempenho).xlsx` criado; `migracao_log` ganhou `LOG-000504`; `instrutores` confirmado com
      30 colunas, `Data_Avaliacao` preservada. **Nota**: sincronizar essa mudança para o banco
      PostgreSQL ao vivo é uma etapa manual de Bernardo (mesmo processo das 6 migrações
      anteriores) — não bloqueia o restante desta implementação, porque nenhum código novo lê/grava
      `Ultima_Avaliacao_Desempenho`; a coluna, se ainda presente na banco de produção por um tempo,
      fica simplesmente ignorada.

### Tests for Foundational (backend) ⚠️

> Escrever estes testes PRIMEIRO — as funções ainda não existem, devem falhar antes da implementação.

- [X] T004 [P] Estender `tests/unidade/regras_de_negocio_backend.test.ts` com os testes de
      `gerarProximoIdSequencial_(nomeAba, nomeColunaId)` (`lib/supabase/server.ts`, research.md §1): (a) array de
      IDs `["1","2","10","abc"]` → devolve `"11"` (ignora `"abc"`, não-inteiro puro); (b) aba vazia →
      devolve `"1"`; (c) IDs com espaços/zeros à esquerda tratados como o próprio inteiro.
- [X] T005 [P] Estender `tests/unidade/regras_de_negocio_backend.test.ts` (mesmo harness/mock `criar
      PlanilhaFalsa` já usado pela describe "RN-CRUD-02", research.md §2) com os testes de
      `crudAtualizar` gravando `Editado_Por`/`Timestamp_Edicao`: (a) aba com essas 2 colunas no
      cabeçalho → `crudAtualizar` grava o e-mail do usuário atual e a data/hora atual nelas, além dos
      campos normais do payload; (b) aba **sem** essas colunas (ex.: mock de outra entidade) →
      `crudAtualizar` não tenta gravar nelas nem lança erro; (c) `Instrutor_Completo`/`Carga_
      Horaria_Ministrada_Ano` (já protegidas por `COLUNAS_FORMULA`) continuam nunca recebendo
      `setValue`, mesmo com o novo stamping ativo (não quebra RN-CRUD-02).
- [X] T006 [P] Estender `tests/unidade/regras_de_negocio_backend.test.ts` com os testes de
      `calcularAntiguidadeDeclarada_(postoGraduacao)` (`lib/acoes/instrutores.ts`, research.md §3): (a)
      `"AE"`/`"VA"`/`"CA"` → `0`; (b) `"CMG"` → `1` (inalterado); (c) posto desconhecido → `null`,
      nunca exceção; (d) `cadastrarInstrutor`/`atualizarInstrutor` sobrescrevem `obj['Antiguidade_
      Declarada']` com o valor calculado a partir de `obj['Posto_Graduacao']`, **mesmo que o payload
      tenha enviado um valor diferente** (defesa em profundidade, `contracts/server-functions.md`).

### Implementation for Foundational (backend)

- [X] T007 Implementar `gerarProximoIdSequencial_` em `lib/supabase/server.ts` (research.md §1). Depende
      de T004 (teste deve existir e falhar antes).
- [X] T008 Implementar o stamping de `Editado_Por`/`Timestamp_Edicao` em `crudAtualizar`
      (`lib/acoes/crud.ts`, research.md §2) — captura `usuario = exigirFuncao(cfg.escrita)` (hoje
      descartado) e grava as 2 colunas quando existem no cabeçalho, mesmo padrão já usado em
      `crudExcluir`. Depende de T005.
- [X] T009 Em `lib/acoes/instrutores.ts`: `ESCALA_ANTIGUIDADE_POSTO` ganha `AE`/`VA`/`CA` (peso
      `0`, research.md §3, achado 11 de `spec.md`); implementar `calcularAntiguidadeDeclarada_`;
      `cadastrarInstrutor` passa a chamar `gerarProximoIdSequencial_` (T007) quando `ID_Instrutor`
      não vier preenchido e sobrescrever `Antiguidade_Declarada` a partir de `Posto_Graduacao`;
      `atualizarInstrutor` sobrescreve `Antiguidade_Declarada` da mesma forma. Depende de T006, T007.
- [X] T010 Rodar `pnpm vitest run` — confirmar que os testes de T004-T006 passam e a
      suíte inteira continua em 0 falhas. **238 testes, 238 passam, 0 falham** (achado durante a
      execução: o teste de T005 usava `instanceof Date`, que falha por cross-realm entre o `vm.
      createContext` do harness e o realm principal do teste — mesmo gotcha já documentado nesta
      suíte para `Array`, agora também para `Date`; corrigido trocando para `Object.prototype.
      toString.call(v) === "[object Date]"`, realm-safe).

### Tests for Foundational (frontend) ⚠️

- [X] T011 [P] Criar `tests/unidade/ficha_formulario_instrutores.test.ts` com o harness de carregamento de
      `app/(app)/instrutores/page.tsx` (mesma técnica de extração `<script>...</script>` +
      remoção do `document.addEventListener('contexto-pronto', ...)` de nível superior + `vm.
      runInContext` já usada em `tests/unidade/filtros_cross_instrutores.test.ts`, spec 015). Escrever os
      testes de `mascaraNip_(valorDigitado)` (research.md, FR-013): `"123456789"` → `"12.3456.78"`
      (ou impede o 9º dígito, conforme a implementação); `"9876"` (parcial, ainda digitando) →
      `"98.76"`, sem erro; string vazia → string vazia.
- [X] T012 [P] Estender `tests/unidade/ficha_formulario_instrutores.test.ts` com os testes de
      `calcularAntiguidadeDeclarada_` (cópia client-side, mesmos casos de T006) e
      `calcularTempoSetorAnos_(dataAssuncaoSetor, hoje)` (research.md §3): 3 anos e alguns meses
      atrás → `3` (anos completos, `Math.floor`); data vazia/nula → `null`, nunca exceção.
- [X] T013 [P] Estender `tests/unidade/ficha_formulario_instrutores.test.ts` com os testes de
      `normalizarEspHabObs_(valorLegado)` (research.md §4, achado 7 de `spec.md`): `"-HN"` → `"HN"`;
      `"(RM2-T)"` → `"RM2-T"`; `"NS"` → `"NS"` (sem correspondência no catálogo, devolve como está,
      nunca lança exceção); string vazia/nula → string vazia.
- [X] T014 [P] Estender `tests/unidade/ficha_formulario_instrutores.test.ts` com os testes de
      `serializarPreferencia_(diasSelecionados)`/`parsearPreferencia_(valorGravado)` (data-model.md
      §3): ida e volta preserva o conjunto marcado (ex.: `{Segunda: ['Manhã'], Sexta: ['Manhã',
      'Tarde']}` → `"Segunda-Manhã, Sexta-Manhã, Sexta-Tarde"` → parseado de volta ao mesmo
      conjunto); nenhum dia marcado → string vazia; string vazia parseada → conjunto vazio (nunca
      exceção, cobre os 2 registros legados reais "Sem preferência", achado 9 de `spec.md`).
- [X] T015 [P] Estender `tests/unidade/ficha_formulario_instrutores.test.ts` com os testes de
      `disciplinasHabilitadasDoInstrutor_(idInstrutor, vinculos, disciplinas, cursosPorId)`
      (data-model.md §4): instrutor com 2 vínculos `Status=Ativo` em disciplinas de cursos diferentes
      → devolve 2 strings `"<curso> — <disciplina>"`; instrutor sem nenhum vínculo → array vazio,
      nunca exceção; vínculo `Status≠Ativo` não entra na lista. **Também** os testes de
      `montarPayloadEdicaoInstrutor_(valoresDoFormulario, instrutorOriginal)` (achado do
      `/speckit-analyze` U1, research.md §10, data-model.md §8): (a) payload com `Disciplinas_
      Ministradas` preenchido → devolvido **sem** essa chave, sempre, mesmo que o valor de entrada
      não seja vazio; (b) `Esp_Hab_Obs='HN'` (sigla real do catálogo) → chave mantida no payload; (c)
      `Esp_Hab_Obs='NS'` (sem correspondência, achado 7) → chave removida do payload (nunca sobrescreve
      o valor legado já gravado); (d) demais campos do formulário passam intactos, sem alteração.

### Implementation for Foundational (frontend)

- [X] T016 Em `app/(app)/instrutores/page.tsx`: implementar `mascaraNip_`, `calcularAntiguidade
      Declarada_` (cópia), `calcularTempoSetorAnos_`, `normalizarEspHabObs_` + constante
      `CATALOGO_ESP_HAB_OBS` (60 pares sigla→nome, data-model.md §6), `serializarPreferencia_`/
      `parsearPreferencia_`, `disciplinasHabilitadasDoInstrutor_`, `montarPayloadEdicaoInstrutor_`
      (achado do `/speckit-analyze` U1, research.md §10, data-model.md §8 — remove `Disciplinas_
      Ministradas` do payload sempre, e `Esp_Hab_Obs` quando não corresponde a nenhuma sigla de
      `CATALOGO_ESP_HAB_OBS`); `ESCALA_ANTIGUIDADE_POSTO`
      (`ORDEM_ANTIGUIDADE_POSTO`/`NOMES_POSTO_POR_CODIGO`/`CIRCULO_HIERARQUICO_POR_POSTO`, já
      existentes desde as specs 014/015) ganham `AE`/`VA`/`CA` (peso `0`, Círculo Hierárquico
      "Oficiais" — Assumptions de `spec.md`; efeito colateral correto: os filtros de Posto/Graduação
      e Círculo Hierárquico da spec 015 passam a oferecer os 3 códigos novos automaticamente, sem
      trabalho adicional). Depende de T011-T015 (testes devem existir e falhar antes). **Achados
      reais durante a implementação, fora do plano original**: (1) `CATALOGO_ESP_HAB_OBS` tem **57**
      pares reais (não 60 — contagem exata ao transcrever o pedido original do usuário; os
      documentos anteriores desta spec citavam "60" por aproximação, corrigido aqui como a fonte de
      verdade, nenhuma sigla inventada para fechar a conta); (2) `ORDEM_ANTIGUIDADE_POSTO` guardava
      número puro por posto (não `{ordem, nome}` como o `ESCALA_ANTIGUIDADE_POSTO` do backend) — os
      2 pontos de uso existentes (`ordenarInstrutoresPorAntiguidade_`,
      `ordenarPorAntiguidadePostoClient_`) usavam o padrão `ORDEM_ANTIGUIDADE_POSTO[x] || 999`, que
      quebra para `AE`/`VA`/`CA` (`0 || 999` avalia `999`, jogando os 3 postos novos para o fim da
      ordenação); corrigido com uma função `ordemAntiguidadePosto_` de checagem explícita de
      `undefined`, usada nos 2 pontos.
- [X] T017 Adicionar a página nomeada de impressão em retrato a `app/globals.css`
      (`@page ficha-instrutor { size: portrait; }` + `.area-impressao.ficha-instrutor { page:
      ficha-instrutor; }`, research.md §7) — aditivo, não toca a regra `@page { size: landscape; }`
      existente (DSA).
- [X] T018 Em `app/(app)/instrutores/page.tsx`: `carregarInstrutores()` passa a também guardar
      `disciplinasCarregadas_`/`vinculosCarregados_` como estado do módulo (hoje descartados após
      `enriquecerInstrutoresParaFiltros_`, spec 015) — research.md §6, necessário para US2
      (Disciplinas Habilitadas) e US3 (Ficha).
- [X] T019 Rodar `pnpm vitest run` — confirmar que os testes de T011-T015 passam e a
      suíte inteira continua em 0 falhas. **260 testes, 260 passam, 0 falham** (achado durante a
      execução: `CATALOGO_ESP_HAB_OBS` é `const` de nível superior — igual ao gotcha já documentado
      para `AppState`, `vm.createContext` não anexa bindings `const` ao objeto sandbox
      automaticamente, diferente de `function`; corrigido com uma segunda chamada
      importação direta do módulo("this.CATALOGO_ESP_HAB_OBS = CATALOGO_ESP_HAB_OBS;", sandbox)` no mesmo
      contexto, mesma técnica já usada em `tests/unidade/design_system.test.ts`).
- [X] T020 Em `app/(app)/instrutores/page.tsx`: reescrever a taxonomia de tipo de campo e
      `renderizarPainelEdicaoInstrutor_` (data-model.md §2) — substitui o array simples `{chave,
      rotulo, tipo}` da spec 014 (só suportava `text`/`date`/`number`/`email`) pelos 12 tipos de
      `data-model.md` §2 (`texto-livre`, `texto-mascarado`, `data`, `dropdown-fechado`, `dropdown-
      fechado-sigla`, `dropdown-fechado-confirmacao`, `checkbox-grupo`, `checkbox-matriz`,
      `calculado-frontend`, `readonly`, `oculto`, `oculto-cadastro`); atualizar `BLOCOS_EDICAO_
      INSTRUTOR` (data-model.md §1) para a forma final de 30 colunas (`Ultima_Avaliacao_Desempenho`
      removida) com o tipo correto por campo — função de renderização única, usada tanto em modo
      cadastro quanto edição (diferenciados só pela presença/ausência de um instrutor carregado).
      Depende de T016, T018 (achado do `/speckit-analyze` D2: T017 é a página de impressão, usada só
      por US3 — este formulário nunca a toca, dependência removida por precisão).
- [X] T021 Rodar `pnpm vitest run` — confirmar 0 falhas (nenhum caso novo esperado nesta
      tarefa além dos já cobertos em T011-T015). **260 testes, 260 passam, 0 falham** (contagem
      inalterada em relação a T019, como esperado — T020 não adiciona teste novo, só reescreve o
      motor de renderização, coberto indiretamente pelas funções puras já testadas).

**Checkpoint**: Migração de schema aplicada localmente, motor de cálculo/validação server-side e
funções puras client-side prontos, motor de renderização único do formulário pronto — US1 e US2
podem começar.

---

## Phase 3: User Story 1 - Cadastrar um novo instrutor pelo formulário completo (Priority: P1)

**Goal**: Botão "Cadastrar Novo Instrutor" abre o formulário completo em nova aba, com `ID_Instrutor`
oculto (gerado pelo backend no salvamento) e todos os campos calculados/ocultos corretos.

**Independent Test**: Abrir "Cadastrar Novo Instrutor", preencher os campos visíveis, salvar, e
confirmar que o registro criado tem `ID_Instrutor` gerado (nunca digitado) e `Antiguidade_Declarada`
já calculada a partir do Posto/Graduação escolhido (`quickstart.md` Passo 2).

### Implementation for User Story 1

- [X] T022 [US1] Em `app/layout.tsx` + `lib/supabase/server.ts``: `app/layout.tsx` (layout raiz) ganha `e.parameter.novoInstrutor`
      (opcional) — quando presente, injeta `template.deepLinkNovoInstrutor = true` antes de
      `.evaluate()`, ao lado do já existente `deepLinkEditarInstrutor` (research.md §8, `contracts/
      server-functions.md`).
- [X] T023 [US1] Em `app/layout.tsx`: injetar `const DEEP_LINK_NOVO_INSTRUTOR = <?!=
      deepLinkNovoInstrutor ?? false ?>;` (mesmo mecanismo de scriptlet de `DEEP_LINK_EDITAR_
      INSTRUTOR`, spec 014). Depende de T022.
- [X] T024 [US1] Em `app/(app)/instrutores/page.tsx`: remover o formulário inline de 3 campos
      (`formInstrutor`/`salvarInstrutor`, linhas 56-76 de hoje) e o botão "Salvar" associado;
      substituir por um botão "Cadastrar Novo Instrutor" que constrói `${AppState.ctx.urlWebApp}
      ?novoInstrutor=1` e chama `window.open(url, '_blank')` — mesmo padrão de `abrirEdicaoInstrutor`
      (spec 014).
- [X] T025 [US1] Em `app/(app)/instrutores/page.tsx`: **decisão explícita** (achado do
      `/speckit-analyze` U2 — a spec 014 já tinha só uma função de verificação de deep-link, e os 2
      parâmetros são mutuamente exclusivos na prática): renomear `verificarDeepLinkEdicaoInstrutor_`
      para `verificarDeepLinksInstrutor_` (função única, não uma nova função irmã), que passa a
      checar `DEEP_LINK_NOVO_INSTRUTOR` **primeiro** e só então `DEEP_LINK_EDITAR_INSTRUTOR` — quando
      `DEEP_LINK_NOVO_INSTRUTOR` está presente, chama `renderizarPainelEdicaoInstrutor_(null)` (T020,
      "modo cadastro": nenhum instrutor carregado, `ID_Instrutor` oculto em vez de somente-leitura,
      `Status` pré-selecionado `Ativo` sem opção de confirmação — não há "desativar" um instrutor que
      ainda não existe) e o salvamento monta o payload via `montarPayloadEdicaoInstrutor_(valores,
      null)` (T016) antes de chamar `cadastrarInstrutor` (T009), nunca `atualizarInstrutor`. A
      verificação do caso `DEEP_LINK_EDITAR_INSTRUTOR` (já existente, spec 014) permanece dentro da
      mesma função, inalterada nesta tarefa — só reorganizada para o novo formato "checar os 2 casos,
      em ordem, na mesma função". Depende de T020, T023, T024.
- [X] T026 Rodar `pnpm vitest run` — confirmar 0 falhas. **260 testes, 260 passam, 0
      falham** (achado ao ligar o fio: `carregarInstrutores()` ainda chamava `mostrarAvisoNivel2
      ('avisoInstrutor', ...)` no `.catch` — elemento removido junto com o formulário inline em
      T024; corrigido para `'avisoVinculo'`, o próximo container de aviso ainda existente nesta
      tela, mesmo padrão de degradação segura já usado em outros `.catch` deste arquivo).

### Verificação manual (não automatizável — FR-004 a FR-023)

- [ ] T027 [US1] Seguir `quickstart.md` Passo 2 no navegador (migração de T003 e implantação via
      `o fluxo Git → Vercel` necessárias antes) — confirmar nova aba, campos ocultos/calculados corretos, máscara de
      NIP, Antiguidade recalculando ao vivo, `Esp_Hab_Obs` gravando só a sigla, `ID_Instrutor` gerado
      aparecendo na listagem após salvar.

**Checkpoint**: Cadastro completo funcionando — metade do MVP (P1) entregue.

---

## Phase 4: User Story 2 - Editar um instrutor existente no mesmo formulário (Priority: P1)

**Goal**: A tela de edição já existente (spec 014) passa a usar o mesmo formulário rico de US1, com
`ID_Instrutor` travado, campos calculados exibindo valores atuais, `Disciplinas Habilitadas` ao lado
do texto histórico, aviso para `Esp_Hab_Obs` legado sem correspondência, e confirmação ao mudar
`Status` para Inativo.

**Independent Test**: Abrir um instrutor real para edição, confirmar `ID_Instrutor` travado, Tempo no
Setor calculado, `Disciplinas Habilitadas` separado do texto histórico, e o aviso de confirmação ao
mudar Status (`quickstart.md` Passo 3).

### Implementation for User Story 2

- [X] T028 [US2] Em `app/(app)/instrutores/page.tsx`: dentro do ramo `DEEP_LINK_EDITAR_INSTRUTOR`
      de `verificarDeepLinksInstrutor_` (renomeada em T025 — achado do `/speckit-analyze` U2, **T028
      depende diretamente de T025**, mesma função, não arquivos/funções independentes), chamar
      `renderizarPainelEdicaoInstrutor_(instrutor)` (T020, "modo edição": `ID_Instrutor` somente-
      leitura, todos os valores pré-preenchidos, `Disciplinas Habilitadas` calculada via
      `disciplinasHabilitadasDoInstrutor_` (T016) usando `disciplinasCarregadas_`/`vinculosCarregados_`
      (T018), `Esp_Hab_Obs` com aviso quando `normalizarEspHabObs_` não corresponder a nenhuma sigla
      do catálogo — FR-024). Depende de T020, T025. Já satisfeito pelo ramo `DEEP_LINK_EDITAR_
      INSTRUTOR` de `verificarDeepLinksInstrutor_` escrito em T025 (inalterado, só reorganizado).
- [X] T029 [US2] Em `app/(app)/instrutores/page.tsx`: o salvamento (`salvarEdicaoInstrutor_` ou
      equivalente) DEVE disparar o mesmo `confirm()` do botão "Desativar" (RN-INST-02) quando o
      `Status` submetido for `Inativo` e o valor original do instrutor era `Ativo` — antes de montar o
      payload via `montarPayloadEdicaoInstrutor_(valores, instrutorOriginal)` (T016, achado do
      `/speckit-analyze` U1) e chamar `atualizarInstrutor` (Clarifications 2026-08-17, FR-021);
      cancelar o `confirm()` não perde as outras edições já digitadas no formulário (não recarrega
      nem limpa a tela). Depende de T028.
- [X] T030 Rodar `pnpm vitest run` — confirmar 0 falhas. **260 testes, 260 passam, 0
      falham**.

### Verificação manual (não automatizável — FR-005 a FR-021)

- [ ] T031 [US2] Seguir `quickstart.md` Passo 3 no navegador — confirmar `ID_Instrutor` travado,
      Tempo no Setor calculado, `Disciplinas Habilitadas` separada do texto histórico (usando um dos
      147 instrutores reais com `Disciplinas_Ministradas` preenchido), o aviso para um dos 6
      instrutores reais com `Esp_Hab_Obs="NS"`, a confirmação ao mudar Status para Inativo, e
      `Editado_Por`/`Timestamp_Edicao` atualizados após salvar (achado desta fase, T008).

**Checkpoint**: Cadastro e edição completos no mesmo formulário — MVP (P1) inteiro entregue.

---

## Phase 5: User Story 3 - Imprimir a ficha de um instrutor (Priority: P2)

**Goal**: Botão "Imprimir Ficha" na listagem abre um modal com os dados em formato de leitura,
cabeçalho institucional, e aciona `window.print()` em orientação retrato — sem chamada de rede nova.

**Independent Test**: Clicar em "Imprimir Ficha" em qualquer instrutor e confirmar cabeçalho
institucional, campos em formato de leitura (vazios como "—"), e que a impressão isola só essa área,
em retrato (`quickstart.md` Passo 4) — independente de US1/US2.

### Implementation for User Story 3

- [X] T032 [US3] Em `app/(app)/instrutores/page.tsx`: adicionar o modal `#modalFichaInstrutor`
      (cabeçalho/rodapé `no-print`, corpo `#fichaInstrutorConteudo.area-impressao.ficha-instrutor`,
      botão "Imprimir" chamando `window.print()` — mesmo esqueleto da V1.0, achado 3 de `spec.md`) e
      um botão "Imprimir Ficha" por linha na listagem (`renderizarListagemInstrutores_`, ao lado de
      "Editar"/"Desativar"). Depende de T017 (página nomeada de impressão).
- [X] T033 [US3] Implementar `renderizarModalFichaInstrutor_(instrutor)` — monta a tabela rótulo/
      valor a partir de `instrutoresCarregados`/`disciplinasCarregadas_`/`vinculosCarregados_` (T018,
      já em memória, nenhuma chamada de rede nova), incluindo `Disciplinas Habilitadas`
      (`disciplinasHabilitadasDoInstrutor_`, T016) e marcador "—" para todo campo vazio (FR-027).
      Depende de T032, T018 (achado do `/speckit-analyze` D1 — usa `disciplinasCarregadas_`/
      `vinculosCarregados_` diretamente, não só o esqueleto do modal de T032).
- [X] T034 Rodar `pnpm vitest run` — confirmar 0 falhas. **260 testes, 260 passam, 0
      falham**.

### Verificação manual (não automatizável — FR-025 a FR-027)

- [ ] T035 [US3] Seguir `quickstart.md` Passo 4 no navegador — confirmar cabeçalho institucional,
      campo vazio como "—", ausência de botões/menus na pré-visualização de impressão, e orientação
      retrato (não a paisagem do DSA).

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — documentação normativa, suíte completa, `o SHA do commit`, verificação manual
fim a fim.

- [X] T036 [P] Atualizar `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` — RN-ANT-02, 3ª revisão
      desta sessão: acrescentar `AE`/`VA`/`CA` com peso `0` à escala (achado 11 de `spec.md`), mesmo
      padrão de documentar a revisão explicitamente já usado para as 2 revisões anteriores (P-14/spec
      014, spec 015).
- [X] T037 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `lib/supabase/server.ts`, `lib/acoes/crud.ts`, `lib/acoes/instrutores.ts`, `app/globals.css` e `app/(app)/instrutores/page.tsx`
      ganham uma frase citando este épico (mesmo padrão de "última alteração" já usado para todo
      épico/hotfix anterior); `o histórico de deploys da Vercel` também perde a referência a `Ultima_Avaliacao_
      Desempenho` na lista de campos, se houver. Também atualizadas as linhas de ``app/layout.tsx` + `lib/supabase/server.ts`` e
      `app/layout.tsx` (deep-link `novoInstrutor`), não citadas no texto original da tarefa mas
      necessárias para a mesma consistência — nenhuma referência a `Ultima_Avaliacao_Desempenho`
      encontrada em `o histórico de deploys da Vercel` (nada a remover).
- [X] T038 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04). Novo valor:
      `2026-08-17.FICHA.1`. `o histórico de deploys da Vercel` também atualizado ("`o SHA do commit` atual").
- [X] T039 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa (baseline
      227 + casos novos de T004-T006/T011-T015) em 0 falhas, 0 regressão. **260 testes, 260
      passam, 0 falham**.
- [ ] T040 Seguir `quickstart.md` do início ao fim no navegador (Passos 0-4), após a migração (T003,
      sincronizada com a banco de produção por Bernardo) e implantação via `o fluxo Git → Vercel` — confirmar as 3
      User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende de Setup — **bloqueia US1, US2 e US3** (as 3 dependem do motor
  de renderização único, T020; US3 também depende diretamente de T017/T018).
- **US1 (Phase 3)**: depende de Foundational completa. Arquivos: ``app/layout.tsx` + `lib/supabase/server.ts`, `app/layout.tsx``,
  `app/(app)/instrutores/page.tsx` (botão + deep-link de cadastro).
- **US2 (Phase 4)**: depende de Foundational completa **e diretamente de T025 (US1)** — achado do
  `/speckit-analyze` U2: `verificarDeepLinksInstrutor_` é uma única função compartilhada pelos 2 casos
  de deep-link (decisão explícita em T025, que a renomeia/reorganiza); T028 edita o ramo `editar
  Instrutor` dentro dessa mesma função, não um arquivo/função independente de US1. Não é seguro
  implementar US2 antes de T025 estar pronta.
- **US3 (Phase 5)**: depende de Foundational completa (T017/T018 especificamente). Independente de
  US1/US2 (modal próprio, nenhuma sobreposição de função).
- **Polish (Phase 6)**: depende de todas as User Stories completas.

### Within Each Phase

- Teste antes de implementação (T004-T006 antes de T007-T009; T011-T015 antes de T016) — mesmo padrão
  TDD já usado nas specs anteriores desta sessão para lógica pura testável.
- Dentro de Foundational, a maioria das tarefas de implementação toca `app/(app)/instrutores/page.tsx` em
  sequência (T016→T018→T020) — não há paralelismo seguro entre elas, mesmo sem `[P]` explícito.

### Parallel Opportunities

- **T004, T005, T006 (Foundational, testes backend)** podem ser escritos em paralelo — casos de teste
  independentes no mesmo arquivo (`tests/unidade/regras_de_negocio_backend.test.ts`), cobrindo funções
  diferentes ainda não implementadas.
- **T011-T015 (Foundational, testes frontend)** podem ser escritos em paralelo pela mesma razão,
  todos em `tests/unidade/ficha_formulario_instrutores.test.ts`.
- **T036/T037/T038 (Polish)** podem rodar em paralelo entre si — arquivos diferentes.
- **US1 e US2 NÃO são seguras para paralelo** (achado do `/speckit-analyze` U2, revisado em relação à
  avaliação inicial) — T028 (US2) edita o mesmo `verificarDeepLinksInstrutor_` que T025 (US1) cria/
  reorganiza; sequenciar sempre US1 antes de US2 (T025 antes de T028), nunca implementar em paralelo
  por pessoas diferentes.
- **US3 é totalmente independente de US1/US2** — pode começar a qualquer momento após o Foundational.

---

## Parallel Example: Testes de Foundational

```bash
Task: "T004 [P] Testes de gerarProximoIdSequencial_ em tests/regras_de_negocio_backend.test.ts"
Task: "T005 [P] Testes de crudAtualizar gravando Editado_Por/Timestamp_Edicao"
Task: "T006 [P] Testes de calcularAntiguidadeDeclarada_ e sobrescrita server-side"
```

```bash
Task: "T011 [P] Harness + testes de mascaraNip_ em tests/ficha_formulario_instrutores.test.ts"
Task: "T012 [P] Testes de calcularAntiguidadeDeclarada_/calcularTempoSetorAnos_ (frontend)"
Task: "T013 [P] Testes de normalizarEspHabObs_"
Task: "T014 [P] Testes de serializarPreferencia_/parsearPreferencia_"
Task: "T015 [P] Testes de disciplinasHabilitadasDoInstrutor_"
```

---

## Implementation Strategy

### MVP First (Foundational + US1 + US2, as fases P1)

1. Completar Phase 1 (Setup).
2. Completar Phase 2 (Foundational — migração de schema, motor de cálculo/validação, motor de
   renderização único do formulário).
3. Completar Phase 3 (US1 — cadastro completo).
4. Completar Phase 4 (US2 — edição completa no mesmo formulário).
5. **PARAR E VALIDAR**: seguir `quickstart.md` Passos 0-3 — o formulário completo pedido (cadastro +
   edição, todas as regras de automação/máscara/dropdown) já está funcionando, entregável como MVP se
   necessário.

### Incremental Delivery

1. Setup → Foundational → US1 (cadastro) → US2 (edição) — MVP P1 completo.
2. US3 (Ficha imprimível) — pode entrar em paralelo com US1/US2 (arquivo/função isolados após
   Foundational) ou depois, é P2.
3. Polish → migração sincronizada com a banco de produção + implantação via `o fluxo Git → Vercel` (`o SHA do commit` único
   para as 3 User Stories).

---

## Notes

- Nenhuma tarefa cria view nova ou rota nova — entra em 5 arquivos de produção já existentes
  (`lib/supabase/server.ts`, `lib/acoes/crud.ts`, `lib/acoes/instrutores.ts`, `app/globals.css`, `app/(app)/instrutores/page.tsx`) + ``app/layout.tsx` + `lib/supabase/server.ts``/
  `app/layout.tsx` (deep-link de cadastro, mesmo mecanismo já usado pelo de edição) + 1 script de
  migração novo + 2 arquivos de teste (1 estendido, 1 novo).
- A mudança em `crudAtualizar` (T008) é a única que toca um motor genérico compartilhado por 9
  entidades — testada antes (T005) de qualquer outra implementação, mesmo padrão de cautela já usado
  para mudanças em componentes compartilhados nas specs 014/015.
- `app/(app)/instrutores/page.tsx` é tocado por Foundational, US1, US2 e US3 — Foundational constrói o motor
  compartilhado primeiro; **US1 e US2 editam a mesma função `verificarDeepLinksInstrutor_`** (achado
  do `/speckit-analyze` U2, T025 antes de T028, nunca em paralelo — ver Dependencies); US3 é uma
  seção nova isolada (modal), essa sim independente. Commit por fase concluída (Foundational, US1,
  US2, US3, Polish) — 5 commits esperados, mesmo padrão de "1 unidade de mudança pequena e testável
  por commit" (Princípio VI).
