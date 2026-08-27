# Feature Specification: Hotfix — Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template

**Feature Branch**: `024-hotfix-impressao-pdf-ficha`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "HOTFIX: Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template. Contexto Obrigatório: A Spec 023 corrigiu o vazamento de HTML e trocou visibility por display no @media print, mas 3 problemas permanecem [...]. Escopo: 1. Corrigir formatarNomeInstrutor_ no título (posto/especialidade vazios). 2. Cabeçalho institucional de 3 linhas centralizadas. 3. Renomear 'Gerar PDF' para 'Salvar Ficha'. 4. 'Imprimir' passa a abrir o PDF gerado numa nova aba em vez de window.print() sobre o modal. 5. Completar as 14 tags do Template ainda sem {{TAG}}, com backup prévio e verificação por leitura de volta. Critério de Aceite: título com posto/especialidade, cabeçalho de 3 linhas, botão 'Salvar Ficha', 'Imprimir' abre PDF sem página em branco, PDF final com as tags de MAPA_TAGS_FICHA_PDF preenchidas ou vazias (nunca a tag literal visível), suíte sem regressão."

## Achados reais (leitura de código e dado ao vivo antes de escrever qualquer requisito)

- **Título da Ficha sem posto/graduação e especialidade — confirmado**: `renderizarModalFichaInstrutor_`
  (``app/(app)/instrutores/page.tsx`:1285`) chama
  `formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)` — os dois
  primeiros parâmetros (`Posto_Graduacao`, `Esp_Hab_Obs`) são string vazia. `gerarPdfFichaClick`
  (mesmo arquivo, linhas 1313-1316) já passa `instrutorFichaAtual_.Posto_Graduacao`/
  `instrutorFichaAtual_.Esp_Hab_Obs` corretamente — o padrão correto já existe no mesmo arquivo,
  poucas linhas abaixo.
- **Cabeçalho fixo em ordem/formato errados — confirmado**: ``app/(app)/instrutores/page.tsx`:1282-1283` hoje
  mostra `<h5>CIAARA — Centro de Instrução e Adestramento Almirante Radler de Aquino</h5>` seguido
  de `<div>Marinha do Brasil — Ficha do Instrutor</div>`. O template da rota `/print/ficha-instrutor`
  (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`), lido ao vivo via API do a rota de impressão `/print/*` nesta
  sessão, já começa com exatamente 3 linhas separadas — `"MARINHA DO BRASIL"` /
  `"CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO"` /
  `"DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA"` — confirmando que o formato pedido no item 2 é apenas
  replicar na tela um padrão institucional que já existe no documento oficial, não inventar um novo.
- **Mecanismo do bug de página em branco dentro do modal — confirmado, não é suposição**: o botão
  "Imprimir" (``app/(app)/instrutores/page.tsx`:50`) chama `window.print()` diretamente sobre o DOM da SPA, com
  `#fichaInstrutorConteudo` (a `.area-impressao.ficha-instrutor`) aninhado dentro de
  `.modal > .modal-dialog > .modal-content > .modal-body`. A correção `display: none`/`display:
  revert`/`display: block` da spec 023 (``app/globals.css`:109-123`) aplica `display: none !important`
  a **todo** descendente de `body` via `body * { display: none !important; }` — isso inclui
  `.modal`/`.modal-dialog`/`.modal-content`/`.modal-body`, que são **ancestrais** do container
  impresso, não descendentes dele. A regra `.area-impressao, .area-impressao * { display: revert
  !important; }` só alcança o próprio container e seus descendentes, nunca seus ancestrais. Regra
  de cascata do CSS: um ancestral com `display: none` remove toda a subárvore da renderização,
  **mesmo que um descendente tenha `display: block`** — diferente de `visibility`, onde um
  descendente pode reverter `visibility: hidden` do ancestral com `visibility: visible` própria.
  Conclusão técnica confirmada: a correção CSS da spec 023 funciona para o DSA (impresso fora de
  qualquer modal) mas é estruturalmente insuficiente para a Ficha (impressa de dentro de um modal
  Tailwind CSS) — não é um ajuste fino a fazer, é uma categoria de solução diferente, exatamente como
  o pedido concluiu.
- **Botões do rodapé confirmados**: ``app/(app)/instrutores/page.tsx`:49` (`"Gerar PDF"`,
  `onclick="gerarPdfFichaClick(...)"`) e `:50` (`"Imprimir"`, `onclick="window.print()"`), únicos
  dois botões do `modal-footer`.
- **Contagem de tags corrigida — achado real, diferente do texto do pedido**: `MAPA_TAGS_FICHA_PDF`
  (``lib/acoes/instrutores.ts`:252-286`) tem **34** chaves, não 32 como citado no Critério de Aceite do pedido
  original. Lendo o conteúdo ao vivo do Template via API do a rota de impressão `/print/*` nesta sessão: **20** tags já
  têm `{{TAG}}` correspondente no documento (`ESP_HAB_OBS`, `POSTO_GRADUACAO`, `NOME_COMPLETO`,
  `NIP`, `NOME_GUERRA`, `RG`, `ORGAO_EMISSOR`, `CPF`, `DATA_NASCIMENTO`, `OM`,
  `ENDERECO_LOGRADOURO`, `ENDERECO_NUMERO`, `ENDERECO_BAIRRO`, `ENDERECO_CIDADE`,
  `ENDERECO_COMPLEMENTO`, `ENDERECO_CEP`, `EMAIL`, `TELEFONE`, `FORMACAO_PRINCIPAL_SECUNDARIA`,
  `AREA_CONHECIMENTO` — não 19 como uma nota informal de sessão anterior sugeria), e **14** ainda
  não têm — exatamente a mesma lista de 14 campos detalhada no item 5 do pedido original
  (`CATEGORIA`, `ANTIGUIDADE_DECLARADA`, `DEP_DIVISAO`, `DATA_ASSUNCAO_SETOR`, `RETELMA`,
  `REGIME_TRABALHO`, `NIVEL_ESCOLARIDADE`, `CAPACITACAO_DIDATICA`, `DATA_AVALIACAO`,
  `DISCIPLINAS_MINISTRADAS`, `DATA_INICIO_DOCENCIA_MB`, `DATA_INICIO_DOCENCIA_CIAARA`,
  `PREFERENCIA`, `ID_INSTRUTOR`) — nenhum campo a mais, nenhum a menos. A lista do item 5 do pedido
  está correta e completa; só o total "32" no Critério de Aceite precisa ser lido como 34.
- **Lacuna de disciplina já existe literalmente no Template — confirmado**: a linha `"SERÁ INSTRUTOR
  DE QUAL DISCIPLINA/CURSO: __________________________________________________________________"`
  existe hoje no documento (seção 3), pronta para receber `{{DISCIPLINAS_MINISTRADAS}}` no lugar dos
  sublinhados.
- **`gerarFichaPDF` já degrada com segurança para tag ausente do Template — nenhuma mudança de
  código necessária para esse ponto**: `Object.keys(MAPA_TAGS_FICHA_PDF).forEach(...)` (spec 022,
  inalterado) já percorre as 34 chaves e chama `Body.replaceText('{{TAG}}', ...)` para cada uma —
  uma tag que não existe no Template simplesmente não encontra nada para substituir (comportamento
  nativo do Next.js, sem exceção). Inserir as 14 tags faltantes no documento é 100% trabalho no
  Template do Supabase Storage, zero mudança em `lib/acoes/instrutores.ts`.

## Clarifications

### Session 2026-08-19

- Q: Deve o cabeçalho on-screen da Ficha usar TUDO MAIÚSCULO, igual ao Template do Supabase Storage, ou
  Título/Frase normal? → A: TUDO MAIÚSCULO — mesma convenção de cabeçalho institucional já usada no
  Template ao vivo, sem uma segunda convenção visual paralela entre tela e PDF.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o título e o cabeçalho da Ficha corretos (Priority: P1)

Como usuário abrindo a Ficha de um instrutor, quero ver o posto/graduação e a especialidade junto
do nome no título (igual à listagem principal) e o cabeçalho institucional nas 3 linhas certas, para
que a Ficha pareça um documento oficial completo, não um rascunho com informação faltando.

**Why this priority**: Bug de dado visível (informação relevante ausente do título) e de formato
institucional — baixo risco de correção, alta visibilidade.

**Independent Test**: Abrir a Ficha de um instrutor com posto/graduação e especialidade
preenchidos — confirmar que o título mostra os dois junto do nome (mesmo formato da listagem,
RF-INSTR-15) e que o cabeçalho mostra as 3 linhas institucionais centralizadas, na ordem certa.

**Acceptance Scenarios**:

1. **Given** um instrutor com `Posto_Graduacao` e `Esp_Hab_Obs` preenchidos, **When** sua Ficha é
   aberta, **Then** o título mostra `[Posto/Graduação] ([Especialidade]) Nome` (ou a variação de
   círculo hierárquico correspondente, RF-INSTR-15), nunca só o nome.
2. **Given** qualquer instrutor, **When** sua Ficha é aberta, **Then** o cabeçalho on-screen mostra,
   centralizado, nesta ordem e em TUDO MAIÚSCULO (Clarifications 2026-08-19): "MARINHA DO BRASIL",
   "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO", "DIVISÃO DE ADMINISTRAÇÃO
   ACADÊMICA", com "Ficha do Instrutor" como subtítulo logo abaixo (não maiúsculo — é o
   `modal-title`/subtítulo, não faz parte das 3 linhas institucionais copiadas do Template).

---

### User Story 2 - Imprimir a Ficha via PDF, sem página em branco (Priority: P1)

Como usuário que quer imprimir a Ficha de um instrutor, quero clicar em "Imprimir" e receber o PDF
já gerado numa nova aba do navegador — de onde eu mesmo aciono a impressão pelo visualizador nativo
de PDF — em vez de imprimir o HTML do modal, que sempre gera página em branco por estar dentro de um
modal Tailwind CSS.

**Why this priority**: Elimina de raiz a categoria inteira do bug de página em branco (a spec 023
corrigiu parcialmente, mas confirmadamente não é suficiente dentro de um modal) — é o item de maior
risco/impacto se não corrigido, mesma prioridade de US1 por decisão do responsável.

**Independent Test**: Abrir a Ficha de um instrutor, clicar em "Imprimir" — confirmar que abre uma
nova aba com o PDF gerado (não o `window.print()` nativo sobre o modal), e que o PDF, aberto no
visualizador nativo do navegador, não tem nenhuma página em branco.

**Acceptance Scenarios**:

1. **Given** a Ficha de um instrutor aberta no modal, **When** o usuário clica em "Imprimir",
   **Then** o sistema gera/atualiza o PDF do instrutor (mesmo backend de "Salvar Ficha") e
   abre o arquivo resultante numa nova aba — nunca chama `window.print()` sobre o DOM do modal.
2. **Given** o PDF aberto na nova aba, **When** o usuário aciona a impressão pelo visualizador
   nativo de PDF do navegador, **Then** só o conteúdo real da Ficha é impresso, sem nenhuma página
   em branco.
3. **Given** o botão do rodapé hoje chamado "Gerar PDF", **When** observado após esta spec,
   **Then** o texto mostra "Salvar Ficha" — mesmo comportamento de antes (gera/atualiza o
   PDF, abre numa nova aba), só o rótulo muda.
4. **Given** a correção `display: none`/`revert`/`block` do `@media print` compartilhado
   (`app/globals.css`, spec 023), **When** a impressão do DSA (Épico H) é testada depois desta spec,
   **Then** continua funcionando exatamente como antes — nenhuma regressão, a regra permanece
   intocada.

---

### User Story 3 - PDF da Ficha com todos os campos cadastrados preenchidos (Priority: P2)

Como usuário que gera o PDF da Ficha de um instrutor, quero que todos os campos que o sistema já tem
cadastrados apareçam no documento final — não só os campos de dados pessoais básicos — para não
precisar preencher manualmente no papel informação que já está no sistema.

**Why this priority**: Melhoria de completude do documento gerado, mas o fluxo de impressão (US2)
já funciona sem essas 14 tags — os campos correspondentes simplesmente saem em branco no PDF até
esta história ser concluída, sem quebrar nada.

**Independent Test**: Gerar o PDF de um instrutor de teste com os 14 campos preenchidos no
cadastro — confirmar que os 14 aparecem no PDF, em texto, no lugar antes ocupado pela tag ou por um
espaço em branco, nunca a tag `{{...}}` literal.

**Acceptance Scenarios**:

1. **Given** o template da rota `/print/ficha-instrutor` (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`), **When**
   as 14 tags faltantes são inseridas, **Then** um backup do documento é criado antes de qualquer
   edição (mesmo padrão já usado nas specs 022/023) e o texto completo do documento é lido de volta
   depois de cada inserção, para confirmar que a tag caiu no lugar certo sem corromper texto
   vizinho.
2. **Given** um instrutor de teste com todos os 34 campos de `MAPA_TAGS_FICHA_PDF` preenchidos,
   **When** seu PDF é gerado, **Then** as 34 tags aparecem substituídas por dado real — nenhuma tag
   `{{...}}` literal visível em nenhum lugar do documento.
3. **Given** um instrutor de teste com um dos 14 campos novos vazio (ex.: sem `RETELMA`
   cadastrado), **When** seu PDF é gerado, **Then** o campo correspondente aparece vazio no PDF
   (comportamento nativo de `Body.replaceText`, já usado pelos outros 20 campos desde a spec 022),
   nunca lança erro nem deixa a tag literal.

---

### Edge Cases

- Instrutor sem `Posto_Graduacao` ou `Esp_Hab_Obs` preenchidos: o título da Ficha reflete o que
  `formatarNomeInstrutor_` já produz hoje para esse caso (as 4 regras de círculo hierárquico já
  tratam campo vazio sem lançar exceção) — nenhum comportamento novo introduzido por esta spec.
- Clicar em "Imprimir" e em "Salvar Ficha" na mesma sessão do modal, em qualquer ordem:
  ambos chamam a mesma função (`gerarPdfFichaClick`) — o PDF é gerado/atualizado a cada clique de
  qualquer um dos dois, sem estado especial por botão.
- Falha de rede/permissão ao clicar em "Imprimir": mesmo tratamento de erro já existente
  (`.catch(e => alert(...))`), sem mudança — nenhuma nova aba abre se a chamada falhar.
- Tag inserida no Template sem o dado correspondente cadastrado para um instrutor específico: o
  campo sai vazio no PDF (Princípio V, mesmo comportamento das 20 tags já existentes desde a spec
  022), nunca bloqueia a geração do documento inteiro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Em `renderizarModalFichaInstrutor_`, a chamada a `formatarNomeInstrutor_` para o
  título da Ficha MUST usar `instrutor.Posto_Graduacao` e `instrutor.Esp_Hab_Obs` (nunca string
  vazia) — mesmo padrão já usado em `gerarPdfFichaClick`.
- **FR-002**: O cabeçalho fixo dentro de `renderizarModalFichaInstrutor_` MUST mostrar, centralizado
  e em TUDO MAIÚSCULO (Clarifications 2026-08-19), 3 linhas na ordem "MARINHA DO BRASIL" / "CENTRO
  DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO" / "DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA",
  preservando "Ficha do Instrutor" como subtítulo (não maiúsculo).
- **FR-003**: O botão do `modal-footer` hoje chamado "Gerar PDF" MUST ser renomeado para "Salvar
  Ficha no Supabase Storage" — texto apenas, `onclick`/`gerarPdfFichaClick` inalterados.
- **FR-004**: O botão "Imprimir" do `modal-footer` MUST NUNCA chamar `window.print()` diretamente
  sobre o DOM do modal — MUST chamar o mesmo fluxo de `gerarPdfFichaClick` (gerar/atualizar o PDF no
  backend) e abrir o PDF resultante numa nova aba do navegador.
- **FR-005**: A correção `display: none`/`display: revert`/`display: block` do `@media print`
  compartilhado (`app/globals.css`, spec 023) MUST permanecer intocada — continua sendo o mecanismo
  de impressão do DSA (Épico H), sem nenhuma regressão.
- **FR-006**: As 14 tags de `MAPA_TAGS_FICHA_PDF` ainda sem `{{TAG}}` correspondente no Template do
  a rota de impressão `/print/*` (`CATEGORIA`, `ANTIGUIDADE_DECLARADA`, `DEP_DIVISAO`, `DATA_ASSUNCAO_SETOR`,
  `RETELMA`, `REGIME_TRABALHO`, `NIVEL_ESCOLARIDADE`, `CAPACITACAO_DIDATICA`, `DATA_AVALIACAO`,
  `DISCIPLINAS_MINISTRADAS`, `DATA_INICIO_DOCENCIA_MB`, `DATA_INICIO_DOCENCIA_CIAARA`,
  `PREFERENCIA`, `ID_INSTRUTOR`) MUST ser inseridas no documento, um backup do documento MUST ser
  criado antes de qualquer edição, e o texto completo MUST ser lido de volta após cada inserção para
  confirmar o resultado.
- **FR-007**: Nenhuma mudança de código em `gerarFichaPDF`/`MAPA_TAGS_FICHA_PDF` MUST ser necessária
  para a FR-006 — a lógica de mesclagem (`Body.replaceText` por chave do mapa) já cobre as 34 tags
  automaticamente, independente de quais já existem no Template hoje.
- **FR-008**: Nenhuma mudança desta spec MUST alterar a estrutura de dados (`instrutores`,
  `config_parametros`) — confirma a restrição já explícita do pedido original.

### Key Entities *(include if feature involves data)*

- Nenhuma entidade de dado nova ou alterada — esta spec toca só frontend
  (`app/(app)/instrutores/page.tsx`) e o template da rota `/print/ficha-instrutor` (artefato externo, fora do repositório),
  sem tocar `instrutores`/`config_parametros`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das aberturas da Ficha mostram posto/graduação e especialidade junto do nome no
  título.
- **SC-002**: 100% dos cabeçalhos on-screen da Ficha mostram as 3 linhas institucionais
  centralizadas, na ordem correta.
- **SC-003**: 100% dos cliques em "Imprimir" abrem um PDF numa nova aba (nunca `window.print()`
  sobre o modal), sem nenhuma página em branco no PDF resultante.
- **SC-004**: 100% dos PDFs gerados após esta spec preenchem as 34 tags de `MAPA_TAGS_FICHA_PDF`
  com dado real ou campo vazio — nunca a tag `{{...}}` literal visível.
- **SC-005**: 0% de regressão na impressão do DSA (Épico H) e na suíte de testes
  (`pnpm vitest run`).

## Assumptions

- O botão "Imprimir" reutiliza literalmente a mesma função `gerarPdfFichaClick` que "Salvar Ficha no
  Supabase Storage" (mesmo `onclick`) — os dois botões ficam funcionalmente idênticos, só o rótulo/mental-model
  muda ("salvar no Supabase Storage" vs. "abrir para imprimir"), exatamente como descrito no pedido original.
- Nenhum indicador de carregamento (spinner) é adicionado ao clique de "Imprimir" — mesmo padrão já
  aceito para "Salvar Ficha"/"Gerar PDF" desde a spec 022, sem tratamento especial de
  espera.
- A regra CSS específica da Ficha (`@page ficha-instrutor { size: portrait; }` e
  `.area-impressao.ficha-instrutor { page: ficha-instrutor; }`, spec 016) fica presente no CSS mas
  deixa de ser efetivamente usada por esta spec (a impressão da Ficha passa a acontecer via o PDF,
  fora do DOM da SPA) — não é removida por esta spec (Princípio VI, limpeza de CSS não solicitada
  explicitamente é risco desnecessário fora do escopo pedido).
- O modal permanece aberto depois de clicar em "Imprimir" (a nova aba do PDF abre por cima, sem
  fechar o modal) — mesmo comportamento já existente do clique em "Salvar Ficha"/"Gerar
  PDF" hoje.
