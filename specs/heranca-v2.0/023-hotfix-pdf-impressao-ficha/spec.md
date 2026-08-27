# Feature Specification: Hotfix — Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)

**Feature Branch**: `023-hotfix-pdf-impressao-ficha`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "HOTFIX: Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor). Contexto Obrigatório: A funcionalidade de geração e impressão da Ficha do Instrutor apresentou falhas críticas. O texto HTML está vazando para títulos, a impressão nativa está gerando páginas em branco, os PDFs estão sendo salvos no Supabase Storage e o conteúdo do Template não está sendo mesclado (PDFs em branco). [...] Escopo: 1. Renomear botão para 'Ficha', isHTML=false em títulos/nomes de arquivo. 2. Corrigir @media print (display:none/block em vez do que causa páginas em branco). 3. Nome do arquivo com Nome de Exibição formatado, salvar em pasta 'Fichas dos Instrutores'. 4. Corrigir mesclagem do Template (copiar, abrir, getBody, replaceText exaustivo, saveAndClose ANTES de converter para PDF, deletar temporário, retornar URL). Critério de Aceite: nomes em texto puro, impressão sem páginas vazias, PDF na pasta certa com nome correto e dados mesclados."

## Achados reais (leitura de código e dados antes de escrever qualquer requisito)

- **Vazamento de HTML confirmado — bug real, pré-existente desde a spec 016 (2026-08-17), não
  introduzido pela spec 022**: `renderizarModalFichaInstrutor_` (``app/(app)/instrutores/page.tsx`:1285`) chama
  `formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)` —
  `isHTML=true`, que produz `<strong>...</strong>` — e envolve o resultado em `escapar()`
  (`replace(/</g, '&lt;').replace(/>/g, '&gt;')`), convertendo as tags em texto literal visível
  (`&lt;strong&gt;`) em vez de renderizar negrito. Único ponto de vazamento no arquivo — o outro
  uso de `formatarNomeInstrutor_` (``app/(app)/instrutores/page.tsx`:392`, célula da listagem) já usa
  `isHTML=true` corretamente, SEM `escapar()` em volta, porque ali o negrito É desejado no corpo da
  página — nenhuma mudança necessária ali (RF-INSTR-15 continua exigindo negrito na listagem).
- **Impressão nativa gerando páginas em branco — causa raiz confirmada, não é suposição**: o bloco
  `@media print` compartilhado (``app/globals.css`:109-123`, usado tanto pelo DSA quanto pela Ficha
  desde os Épicos H/016) usa `visibility: hidden`/`visibility: visible`, não `display`.
  `visibility: hidden` retira o elemento visualmente MAS preserva o espaço que ele ocupa no layout —
  toda a estrutura da SPA (sidebar, navbar, as demais 9 views escondidas via `[data-view] {display:
  none}` normalmente, o backdrop do modal Tailwind CSS) continua reservando altura de página, gerando
  dezenas de páginas em branco antes/depois do conteúdo real. A correção troca para `display`, que
  remove o elemento do fluxo — mesmo bloco compartilhado por DSA (Épico H) e Ficha (spec 016), a
  correção beneficia os dois usos, não só a Ficha.
- **PDF salvo com ID no nome e no Supabase Storage — confirmado no código de `gerarFichaPDF`
  (``lib/acoes/instrutores.ts`:289-316`, spec 022)**: `.setName('Ficha_' + idInstrutor + '.pdf')` usa o ID
  cru; `o Supabase Storage.createFile(pdf)` não recebe nenhuma pasta de destino, caindo no Supabase Storage do
  executor por padrão da API. Ambos confirmados lendo o código realmente implantado.
- **Mesclagem do Template — achado crítico que muda o escopo real deste item**: a lógica de
  `gerarFichaPDF` já chama `doc.saveAndClose()` ANTES de `o Supabase Storage.getFileById(copia.getId()).getAs
  ('application/pdf')` — exatamente a ordem correta já pedida no item 4(e) do texto original, sem
  bug de código nesse ponto. A causa real do "PDF em branco" relatado por Bernardo foi confirmada
  lendo o conteúdo do Template ao vivo
  (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`, mimeType `application/vnd.google-apps.document`,
  confirmado nativo do a rota de impressão `/print/*` — não um `.docx` bruto, apesar do nome do arquivo): o Template
  era um formulário em branco (rótulos como "NOME COMPLETO:", "CPF:" sem nenhuma tag `{{...}}` em
  lugar nenhum) — `replaceText` não tinha absolutamente nada para substituir, então o PDF "mesclado"
  era só o formulário vazio original. **Resolvido nesta mesma sessão, antes de qualquer código
  desta spec ser escrito**: com autorização de Bernardo (dada na spec 022 e reconfirmada aqui, opção
  B — "conecte e tente, com revisão"), o Template foi editado via API do a rota de impressão `/print/*` (backup criado
  antes: `1biZK3aG--VA2xjhAr0wrnYdPRqHVgsG3ZY87OL2_V4E`) — 19 tags `{{TAG}}` inseridas nos campos com
  correspondência real em `instrutores`/`MAPA_TAGS_FICHA_PDF` (Posto/Graduação, Nome Completo,
  NIP, Nome de Guerra, RG, Órgão Emissor, CPF, Data de Nascimento, OM, Endereço completo, E-mail,
  Telefone, Formação Principal/Secundária, Área de Conhecimento), verificado por leitura de volta do
  texto completo do documento. Campos do Template sem coluna real correspondente (Curso/Período/
  Local de formação ×3, Experiência Profissional ×3, Disciplina/CH/Apoinst/PCE ×3, Técnica de
  Ensino, Metodologia Didática, Premiação, categoria por checkbox) foram deliberadamente deixados
  em branco — inventar uma tag para um dado que não existe no sistema violaria o Princípio V
  (Degradação Segura), não é um "bug" a corrigir. **Consequência para esta spec**: o item 4 do
  pedido original não precisa de nenhuma mudança de código em `gerarFichaPDF` além do que os itens
  2/3 abaixo já cobrem (nome de exibição, pasta) — a lógica de mesclagem já estava correta.
- **"Nome de Exibição" pedido no item 3 não existe hoje em nenhum lugar** — nem no frontend nem no
  backend. `gerarPdfFichaClick(idInstrutor)` (``app/(app)/instrutores/page.tsx`:1311`) só envia o ID;
  `gerarFichaPDF(idInstrutor)` só recebe o ID. Como `formatarNomeInstrutor_` (a função que já monta
  "[Posto/Graduação] ([Especialidade]) Nome Completo" seguindo as 4 regras de círculo hierárquico de
  RF-INSTR-15) vive em `components/ciaara/` (frontend) e Next.js não permite que um arquivo `.ts`
  importe uma função de um arquivo `.html` (mesma restrição já documentada em toda spec anterior
  desta sessão), a única forma de reaproveitar a formatação sem duplicar as 4 regras de círculo
  hierárquico inteiras em `.ts` é o frontend computar o texto (`isHTML=false`) e enviá-lo ao backend
  — exatamente o que o pedido original já propõe, e a abordagem correta dado o constraint real do
  projeto.
- **Botão "Imprimir Ficha" → "Ficha"**: confirmado em ``app/(app)/instrutores/page.tsx`:399`, único lugar do
  projeto com esse texto exato — renomeação estritamente textual, sem mudança de comportamento
  (continua abrindo o mesmo modal com "Imprimir"/"Gerar PDF" dentro).

## Clarifications

### Session 2026-08-19

- Q: Deve o título da Ficha continuar exibindo o nome de guerra em negrito visual (consistente com
  a listagem), ou virar texto plano sem nenhuma ênfase? → A: Manter negrito — remover só o wrapper
  de escape (`escapar()`), preservando `isHTML=true`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o nome do instrutor em texto puro, sem tags vazando (Priority: P1)

Como usuário abrindo a Ficha de um instrutor, quero ver o nome dele em texto normal no título da
Ficha (com negrito de verdade no nome de guerra, não a tag `<strong>` aparecendo como texto), para
que a tela pareça profissional e não uma tela quebrada.

**Why this priority**: É o bug mais visível e constrangente (texto de código aparecendo na tela),
com a correção de menor risco entre as 3 (troca de um único argumento).

**Independent Test**: Abrir a Ficha de um instrutor com nome de guerra preenchido — confirmar que o
título mostra o nome em negrito visual (HTML renderizado), nunca as tags `<strong>`/`</strong>`
como texto literal.

**Acceptance Scenarios**:

1. **Given** um instrutor com `Nome_Guerra` preenchido, **When** sua Ficha é aberta, **Then** o
   título da Ficha mostra o nome com o trecho correspondente ao nome de guerra em negrito visual
   (renderizado), nunca as tags HTML como texto.
2. **Given** o mesmo cenário, **When** o nome é usado para compor o nome do arquivo PDF gerado
   (User Story 3), **Then** o nome de exibição enviado ao backend é 100% texto puro, sem nenhuma
   tag HTML.
3. **Given** a listagem principal de instrutores (não a Ficha), **When** observada, **Then**
   continua mostrando o nome de guerra em negrito normalmente — este ponto não muda (já estava
   correto).

---

### User Story 2 - Imprimir a Ficha sem páginas em branco (Priority: P1)

Como usuário que clica em "Imprimir" na Ficha de um instrutor, quero que a impressão nativa do
navegador gere só a página (ou páginas) com o conteúdo real da Ficha, para não desperdiçar papel
nem confundir quem recebe o documento impresso.

**Why this priority**: Mesma prioridade da US1 — bug crítico e visível, com causa raiz já
confirmada (não é investigação, é aplicação direta da correção).

**Independent Test**: Abrir a Ficha de um instrutor, acionar "Imprimir" (ou o preview de impressão
do navegador, `Ctrl+P`) — confirmar que apenas a página(s) do conteúdo da Ficha aparece(m), sem
nenhuma página em branco antes/depois.

**Acceptance Scenarios**:

1. **Given** a Ficha de um instrutor aberta no modal, **When** o usuário aciona a impressão nativa
   do navegador, **Then** o preview de impressão mostra só o conteúdo da Ficha, sem sidebar, navbar,
   backdrop do modal ou qualquer outra view da SPA, e sem nenhuma página em branco adicional.
2. **Given** a mesma correção de CSS (compartilhada com o DSA), **When** a impressão A4 paisagem do
   DSA é testada, **Then** continua funcionando exatamente como antes — nenhuma regressão no
   comportamento já validado do Épico H.

---

### User Story 3 - PDF salvo com nome correto na pasta certa (Priority: P2)

Como usuário que gera o PDF da Ficha de um instrutor, quero que o arquivo seja salvo com um nome
legível (não um ID cru) dentro de uma pasta dedicada do Supabase Storage, para conseguir localizar e organizar
as Fichas geradas sem precisar abrir cada uma para saber de quem é.

**Why this priority**: Depende logicamente da US1 (o nome de exibição em texto puro é o mesmo dado
usado para nomear o arquivo) — por isso vem depois, mesmo sendo um bug real e visível.

**Independent Test**: Gerar o PDF de um instrutor de teste — confirmar que o arquivo aparece dentro
da pasta "Fichas dos Instrutores" no Supabase Storage, com o nome `"Ficha - [Nome de Exibição formatado]"`
(nunca o ID cru).

**Acceptance Scenarios**:

1. **Given** um instrutor de teste com Posto/Graduação, Especialidade e nome preenchidos, **When**
   o PDF é gerado, **Then** o arquivo salvo se chama exatamente `"Ficha - " + <nome de exibição
   formatado por formatarNomeInstrutor_ com isHTML=false>` (ex.: `"Ficha - CMG (RM1) Antônio
   Ricardo Nunes Guimarães.pdf"`), nunca contendo o `ID_Instrutor` cru.
2. **Given** a primeira geração de PDF depois desta spec, **When** a pasta "Fichas dos Instrutores"
   ainda não existe no Supabase Storage do executor, **Then** o sistema a cria no Supabase Storage antes de salvar
   o arquivo.
3. **Given** gerações subsequentes, **When** a pasta já existe, **Then** o sistema reaproveita a
   pasta existente — nunca cria uma segunda pasta com o mesmo nome.
4. **Given** o documento a rota de impressão `/print/*` temporário criado para a mesclagem, **When** o PDF termina de
   ser gerado (sucesso ou erro), **Then** o documento temporário é sempre apagado (comportamento já
   existente da spec 022, sem mudança).

---

### Edge Cases

- Instrutor sem Posto/Graduação ou Especialidade preenchidos: o nome de exibição usado no arquivo
  reflete o que `formatarNomeInstrutor_` já produz hoje para esse caso (as 4 regras de círculo
  hierárquico já tratam campo vazio sem lançar exceção) — nenhum comportamento novo introduzido.
- Nome de exibição vazio/ausente por algum motivo (contorno do frontend): o backend usa
  `idInstrutor` como retaguarda para nomear o arquivo, em vez de falhar (Princípio V, mesmo padrão
  já usado em outros pontos do projeto).
- Impressão de uma tela diferente da Ficha (ex.: DSA) enquanto a correção de CSS está ativa: deve
  continuar funcionando exatamente como antes — este hotfix não adiciona nenhum caso novo de
  impressão, só corrige o mecanismo genérico já compartilhado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O botão hoje chamado "Imprimir Ficha" na listagem de instrutores MUST ser renomeado
  estritamente para "Ficha", sem nenhuma mudança de comportamento (continua abrindo o mesmo modal).
- **FR-002**: O título da Ficha (modal) MUST continuar exibindo o nome de guerra em negrito visual
  (`isHTML=true`, consistente com a listagem, ``app/(app)/instrutores/page.tsx`:392`), removendo o wrapper de
  escape de HTML (`escapar()`) desse ponto específico — o resultado final MUST NUNCA exibir tags
  HTML como texto literal na tela (Clarifications 2026-08-19).
- **FR-003**: O nome de exibição usado para compor o nome do arquivo PDF (User Story 3) MUST ser
  calculado no frontend via `formatarNomeInstrutor_` com `isHTML=false` (texto puro, nunca HTML) e
  enviado ao backend como parâmetro explícito — o backend MUST NUNCA derivar esse nome sozinho a
  partir de campos brutos, nem usar o `ID_Instrutor` como nome de exibição.
- **FR-004**: A regra `@media print` compartilhada (usada por DSA e pela Ficha) MUST usar
  `display: none`/`display: block` (nunca `visibility: hidden`/`visibility: visible`) para
  isolar o conteúdo impresso — elementos fora do container de impressão MUST ser removidos do
  fluxo do documento durante a impressão, não apenas ocultados visualmente. Os descendentes do
  container impresso MUST usar `display: revert` (não `display: block` indiscriminado) para
  preservar seu tipo de exibição nativo (`<tr>`/`<td>` como tabela, `<span>`/`<strong>` como
  inline) — forçar `block` em todos eles quebraria o layout tabular da própria Ficha (research.md
  §2).
- **FR-005**: A correção do FR-004 MUST preservar o comportamento de impressão já validado do DSA
  (Épico H) — mesmo `@page` paisagem, mesma seleção de conteúdo, sem regressão.
- **FR-006**: `gerarFichaPDF` MUST receber um segundo parâmetro (nome de exibição em texto puro) e
  MUST usá-lo para nomear tanto a cópia temporária do Template quanto o arquivo PDF final, no
  formato `"Ficha - <nome de exibição>"`. Se o parâmetro vier vazio/ausente por qualquer motivo, o
  backend MUST usar `idInstrutor` como retaguarda para nomear o arquivo, nunca lançar exceção
  (Princípio V, Degradação Segura — mesmo comportamento já descrito em Edge Cases).
- **FR-007**: `gerarFichaPDF` MUST salvar o PDF final dentro de uma pasta do Supabase Storage chamada
  exatamente "Fichas dos Instrutores" — se a pasta já existir (`o Supabase Storage.getFoldersByName`), MUST
  reaproveitá-la; se não existir, MUST criá-la no Supabase Storage antes de salvar o arquivo.
- **FR-008**: A lógica de mesclagem de dados do Template (copiar → abrir via `a rota de impressão `/print/*`.openById`
  → `getBody()` → `replaceText` por tag → `saveAndClose()` → converter para PDF) MUST permanecer
  exatamente como já implementada na spec 022 — nenhuma mudança de código é necessária aqui, já
  segue a ordem correta (achado real, ver Achados reais).
- **FR-009**: Nenhuma mudança desta spec MUST alterar a estrutura de dados (`instrutores`,
  `config_parametros`) — confirma a restrição já explícita do pedido original ("ZERO alterações na
  estrutura de dados").

### Key Entities *(include if feature involves data)*

- Nenhuma entidade de dado nova ou alterada — esta spec toca só frontend (`app/(app)/instrutores/page.tsx`,
  `components/ciaara/`/`app/globals.css`) e a assinatura de uma função de backend já existente
  (`gerarFichaPDF`), sem tocar schema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das aberturas da Ficha exibem o nome do instrutor sem nenhuma tag HTML visível
  como texto na tela.
- **SC-002**: 0% das impressões da Ficha (ou do DSA) produzem página em branco adicional além do
  conteúdo real — verificável no preview de impressão do navegador.
- **SC-003**: 100% dos PDFs gerados após esta spec são salvos dentro da pasta "Fichas dos
  Instrutores", nunca no Supabase Storage, com o nome no formato `"Ficha - <nome de exibição>"`, nunca
  contendo o `ID_Instrutor` cru.
- **SC-004**: 0% de regressão no conteúdo mesclado do PDF (já corrigido via edição do Template,
  fora do código) e no comportamento de impressão já validado do DSA.

## Assumptions

- O item 4 do pedido original ("correção da mesclagem") é tratado como já resolvido pela edição do
  Template (fora desta spec de código) — nenhuma tarefa de implementação é gerada para ele além da
  verificação manual de que o PDF sai preenchido corretamente.
- O nome da pasta do Supabase Storage é exatamente "Fichas dos Instrutores" (texto literal do pedido original),
  sem acento/variação — criada no Supabase Storage do executor do script (`executeAs: USER_DEPLOYING`),
  mesmo padrão de propriedade já usado pelos PDFs gerados hoje.
