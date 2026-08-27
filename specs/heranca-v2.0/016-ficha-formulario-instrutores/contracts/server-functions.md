# Contrato — Funções de servidor (Ficha de Cadastro de Instrutores e Formulário Avançado)

Expostas via Server Action (chamada direta, tipada), exceto `app/layout.tsx` (entrada HTTP da
aplicação Next.js).

## ``app/layout.tsx` + `lib/supabase/server.ts``

### `app/layout.tsx` (layout raiz) (assinatura preservada — já aceita `e` desde a spec 014)

- **Parâmetros**: ganha `e.parameter.novoInstrutor` (opcional, qualquer valor truthy) ao lado do já
  existente `e.parameter.editarInstrutor`. Ambos podem ser lidos, mas só um faz sentido por vez —
  `novoInstrutor` tem prioridade se os dois vierem presentes (caso não deveria acontecer na prática,
  já que os dois botões constroem URLs mutuamente exclusivas).
- **Comportamento novo**: quando `novoInstrutor` está presente, `template.deepLinkNovoInstrutor` é
  injetado (booleano) antes de `.evaluate()`, ao lado de `template.deepLinkEditarInstrutor`.
- **Regras**: FR-004 (research.md §8).

## `lib/supabase/server.ts`

### `gerarProximoIdSequencial_(nomeAba, nomeColunaId)` (nova, função pura, não exposta)

- **Entrada**: nome da aba e nome da coluna de PK.
- **Saída**: string do próximo inteiro sequencial (sem prefixo/hífen/padding), ignorando qualquer
  valor existente que não seja um inteiro puro.
- **Regras**: FR-006, research.md §1.

## `lib/acoes/instrutores.ts`

### `cadastrarInstrutor(obj)` (comportamento estendido — assinatura preservada)

- **Mudança**: se `obj['ID_Instrutor']` não vier preenchido, chama `gerarProximoIdSequencial_`
  (`lib/supabase/server.ts`) antes de delegar a `crudCriar('instrutores', obj)` — antes, `ID_Instrutor` era
  sempre digitado manualmente pelo formulário de 3 campos (spec 014); agora é sempre gerado.
  **Sempre sobrescreve** `obj['Antiguidade_Declarada']` com `calcularAntiguidadeDeclarada_(obj
  ['Posto_Graduacao'])` antes de delegar — nunca confia no valor que o cliente mandou, mesmo
  espírito de defesa em profundidade de RN-CRUD-02 (o servidor recalcula, não só valida).
- **Regras**: FR-006/FR-007, research.md §1/§3.

### `atualizarInstrutor(idInstrutor, obj)` (assinatura preservada — comportamento estendido)

- **Mudança**: mesma sobrescrita de `obj['Antiguidade_Declarada']` de `cadastrarInstrutor` acima,
  sempre a partir do `Posto_Graduacao` recebido no mesmo payload. Herda automaticamente o stamping
  de `Editado_Por`/`Timestamp_Edicao` da mudança em `crudAtualizar` (`lib/acoes/crud.ts`, ver abaixo) — nenhuma
  mudança adicional necessária ali para isso.
- **Regras**: FR-007/FR-011, research.md §2/§3.

### `ESCALA_ANTIGUIDADE_POSTO` (constante existente — 3 entradas novas)

- **Mudança**: ganha `AE`/`VA`/`CA`, todas com `ordem: 0` — os 11 pesos já formalizados (spec 014)
  permanecem exatamente como estão.
- **Regras**: FR-007, achado 11 de `spec.md`, research.md §3.

### `calcularAntiguidadeDeclarada_(postoGraduacao)` (nova, função pura, não exposta)

- **Regras**: FR-007, research.md §3. Único cálculo desta spec que precisa de uma cópia no backend —
  `Antiguidade_Declarada` é persistida (FR-007, "gravada pelo backend no salvamento") e o servidor
  nunca confia no valor vindo do cliente (acima). `calcularTempoSetorAnos_`/`normalizarEspHabObs_`/
  `CATALOGO_ESP_HAB_OBS` **não têm cópia no backend** — `Tempo_Setor_Anos` nunca é persistido (FR-008,
  puramente de exibição, calculado de novo a cada carregamento) e o backend nunca precisa validar
  `Esp_Hab_Obs` contra o catálogo (o formulário só envia uma sigla válida ou omite o campo do payload
  quando o valor legado não corresponde a nenhuma sigla — `crudAtualizar` preserva o que já está
  gravado quando a chave está ausente do payload, comportamento já existente, sem mudança).

## `lib/acoes/crud.ts`

### `crudAtualizar(nomeAba, id, obj)` (assinatura preservada — comportamento estendido)

- **Mudança**: passa a gravar `Editado_Por` (e-mail do usuário atual) e `Timestamp_Edicao` (agora)
  quando essas colunas existem no cabeçalho da aba de destino — mesmo padrão que `crudExcluir` já
  usa desde a spec 003, nunca antes estendido a `crudAtualizar`. Afeta **toda** entidade que usa o
  motor genérico (`usuarios`, `instrutores`, `instrutor_disciplina`, `usuario_curso`, `disciplinas`, `avaliacoes_planejadas`, `planejamento_anual`, `registros_aula`,
  `atividades_nao_letivas`, `avaliacoes`) — estritamente aditivo, nenhuma aba sem essas 2 colunas
  é afetada.
- **Regras**: FR-011, research.md §2 (achado desta fase, não do pedido original).

## Frontend — funções puras novas, não expostas a Server Action

Todas em `app/(app)/instrutores/page.tsx` (mesmo critério de localização já usado desde as specs 014/015 —
específicas do domínio de Instrutores):

- `mascaraNip_(valorDigitado)` — aplica o padrão `00.0000.00` progressivamente (FR-013).
- `calcularAntiguidadeDeclarada_(postoGraduacao)` — cópia client-side da função homônima de
  `lib/acoes/instrutores.ts` (mesmo padrão de duplicação de `ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_
  POSTO` já aceito desde a spec 014), para o recálculo instantâneo no formulário antes de salvar —
  o valor exibido é só uma prévia; quem persiste de fato é o backend (acima), que nunca confia no
  valor client-side.
- `calcularTempoSetorAnos_(dataAssuncaoSetor, hoje)` — só existe aqui, nunca no backend (nunca
  persistido, FR-008).
- `montarPayloadEdicaoInstrutor_(valoresDoFormulario, instrutorOriginal)` — achado do
  `/speckit-analyze` (U1), research.md §10, data-model.md §8. Chamada pelos 2 caminhos de
  salvamento (cadastro e edição) antes de `gs('cadastrarInstrutor', ...)`/`gs('atualizarInstrutor',
  ...)` — remove `Disciplinas_Ministradas` do payload sempre, e `Esp_Hab_Obs` quando o valor não
  corresponde a nenhuma sigla de `CATALOGO_ESP_HAB_OBS`. É a proteção real de SC-004 — testável
  isoladamente, não só confiança na interface.
- `normalizarEspHabObs_(valorLegado)` / `CATALOGO_ESP_HAB_OBS` — só existem aqui, nunca no backend
  (data-model.md §6) — o backend não precisa validar `Esp_Hab_Obs` contra o catálogo (acima).
- `disciplinasHabilitadasDoInstrutor_(idInstrutor, vinculosCarregados_, disciplinasCarregadas_, cursosPorId)`
  — data-model.md §4.
- `serializarPreferencia_(diasSelecionados)` / `parsearPreferencia_(valorGravado)` — data-model.md §3.
- `renderizarModalFichaInstrutor_(instrutor)` — monta o conteúdo de `#fichaInstrutorConteudo.area-
  impressao.ficha-instrutor` (FR-025/026/027), a partir de dados 100% já carregados (research.md §6).

## `app/globals.css` — CSS estendido, sem função JS

### Página nomeada `ficha-instrutor` (nova regra `@media print`)

- **Mudança**: `@page ficha-instrutor { size: portrait; }` mais `.area-impressao.ficha-instrutor {
  page: ficha-instrutor; }`, aditiva à regra `@page { size: landscape; }` já existente (DSA,
  inalterada).
- **Regras**: FR-025, research.md §7.

## Nenhuma outra função de backend ou de front-end exposta é criada, removida ou tem assinatura
alterada além das listadas acima.
