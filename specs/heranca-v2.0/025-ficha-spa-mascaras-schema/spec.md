# Feature Specification: Hotfix e Nova Feature — Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

**Feature Branch**: `025-ficha-spa-mascaras-schema`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "HOTFIX e Nova Feature: Integração de Template SPA, Máscaras de Input e Limpeza de Formulário. Contexto: integrar um novo layout de Ficha de Instrutor (salvo localmente), refatorar a exibição em abas do formulário de edição para evitar repetição de campos, limpar o schema do banco de dados e aplicar máscaras rígidas de input. Escopo: 1. Integração da Nova Ficha (SPA, sem modal, 3 botões: Voltar/Salvar Ficha/Imprimir). 2. Limpeza de abas e redundâncias (campo 'Sistema' sem sufixo, painéis de Disciplinas movidos para dentro da Aba 3). 3. Remoção completa da coluna 'Instrutor (Nome Completo Formatado)' do schema. 4. Máscaras de CPF/CEP/Telefone/RETELMA + novo campo Estado (select de UFs, RJ padrão)."

## Achados reais (leitura de código e dado antes de escrever qualquer requisito)

- **Arquivo `app/print/ficha-instrutor/page.tsx` não existe** — confirmado por busca em todo `SIS11/`. O
  diretório `modelos/` (fora do repositório `CIAARA-11-v2/`, em `SIS11/modelos/`) contém, em vez
  disso, `Ficha de Cadastro Docente.zip` — um export de um Add-on de mala-direta do a rota de impressão `/print/*`
  (`lib/acoes/ficha-docente.ts`, `doc-page.js`, `support.js`, arquivos característicos dessa categoria de
  ferramenta, não um projeto autoral). Dentro do zip, `ficha-cadastro-docente-template.html`
  (22.656 bytes) é um HTML estático auto-contido, exatamente o design a integrar: grade de 12
  colunas por seção numerada (1 Dados Pessoais / 2 Dados Profissionais / 3 Dados Complementares),
  cabeçalho institucional de 3 linhas **idêntico** ao já implementado na spec 024 (mesma fonte
  Rawline, mesmas cores, mesma ordem), campos em `{{TAG}}` que batem quase 1:1 com
  `MAPA_TAGS_FICHA_PDF`. `uploads/FICHA CADASTRO DE DOCENTES CIAARA(2).docx` dentro do mesmo zip
  tem o **mesmo nome de arquivo** do template da rota `/print/ficha-instrutor` já em uso desde a spec 022
  (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`) — este zip é quase certamente o material de
  origem usado para montar aquele Template, reaproveitado agora como referência visual para a view
  SPA. **Consequência para esta spec**: FR-001 usa `ficha-cadastro-docente-template.html` como
  fonte do design (não existe outro arquivo candidato), com adaptação (não cópia literal) para o
  DOM real da SPA — o `{{TAG}}` fica substituído por interpolação JS a partir de
  `instrutoresCarregados`/`disciplinasHabilitadasDoInstrutor_`, mesmo padrão de todo o resto do
  projeto.
- **Nenhum campo é literalmente repetido nas 3 abas hoje — achado que corrige o pedido**:
  `renderizarPainelEdicaoInstrutor_` (``app/(app)/instrutores/page.tsx`:1038-1109`) já agrupa
  `BLOCOS_EDICAO_INSTRUTOR` por `aba` corretamente (spec 022) — cada campo aparece em exatamente 1
  lugar. O bloco "Sistema (somente leitura)" (sem chave `aba`, linha 825) e os 2 painéis de
  disciplinas (`disciplinasHabilitadasHtmlInstrutor_`/`painelAtribuicaoDisciplinasHtmlInstrutor_`)
  são renderizados **uma única vez**, fora da `<div class="tab-content">`, logo abaixo dela (linhas
  1073-1076) — visualmente ficam visíveis **por baixo de qualquer aba selecionada**, o que
  Bernardo razoavelmente percebe como "conteúdo repetido em toda aba" mesmo não sendo duplicação
  real de DOM. FR-002/FR-003 corrigem essa percepção movendo os 3 painéis para dentro do
  `tab-pane` da Aba 3, o que resolve o sintoma relatado de qualquer forma.
- **`Instrutor_Completo` confirmado seguro para remoção completa**: é fórmula nativa do banco
  (`=IFERROR(TRIM($C2&" "&$F2);"")`, ``lib/acoes/crud.ts`:37`), usada em exatamente 2 pontos de código —
  `COLUNAS_FORMULA['instrutores']` (``lib/acoes/crud.ts`:43`, protege contra sobrescrita) e o campo readonly
  "Instrutor (nome completo formatado)" dentro do bloco "Sistema" (``app/(app)/instrutores/page.tsx`:827`).
  Nenhum outro consumidor em ` (nem `MAPA_TAGS_FICHA_PDF`, nem nenhuma outra view/dropdown) —
  confirmado por busca em todo o diretório. Remoção é uma migração de schema real (exige backup +
  `migracao_log`, Princípio IV, mesmo padrão de `migracao/remover_coluna_ultima_avaliacao_
  desempenho.py` da spec 016), não um "achado sem risco", mas o raio de impacto no código é mínimo
  e totalmente mapeado.
- **Campo "Estado"/UF não existe hoje em `instrutores`** — confirmado: os 6 campos de endereço
  existentes são só `Endereco_Logradouro/Numero/Bairro/Cidade/Complemento/CEP`, sem nenhuma coluna
  de UF. Adicioná-lo é, portanto, uma migração de schema real de **adição** — dentro da mesma spec
  que remove `Instrutor_Completo`, ambas exigem o mesmo protocolo de backup/log, tratadas juntas.
  Nome de coluna escolhido por consistência com o padrão existente: `Endereco_Estado` (mesmo padrão
  de `Endereco_Cidade`). **Fora do escopo desta spec** (não pedido no texto original): a nova coluna
  não ganha `{{TAG}}` no template da rota `/print/ficha-instrutor` nem entrada em `MAPA_TAGS_FICHA_PDF` — o PDF
  continua sem mostrar o Estado até uma spec futura pedir isso explicitamente (Princípio IX).
- **Nenhuma máscara existe hoje para CPF/CEP/Telefone/RETELMA** — confirmado: os 4 campos são
  `tipo: 'texto-livre'` (``app/(app)/instrutores/page.tsx`:794/796/802/810`), um `<input type="text">` genérico
  sem `oninput`. Só NIP tem máscara hoje (`tipo: 'texto-mascarado'`, `mascaraNip_`,
  ``app/(app)/instrutores/page.tsx`:611/863-866`) — os 4 novos campos seguem exatamente esse mesmo padrão
  (`tipo: 'texto-mascarado'`, uma função `mascaraX_` pura por campo, `oninput="this.value =
  mascaraX_(this.value)"`), não um mecanismo novo.
- **Achado crítico que muda a abordagem técnica do item 1c ("Imprimir" deve usar `window.print()`
  de novo)**: o container impresso de QUALQUER view desta SPA (Ficha nova incluída) sempre fica
  aninhado dentro de `<div data-view="...">`, por sua vez dentro de `<main class="container-fluid
  py-3">` (``app/layout.tsx`:125-136`), por sua vez dentro de `<body>`. A correção `body * { display:
  none !important }` + `.area-impressao { display: revert/block !important }` (spec 023,
  ``app/globals.css`:109-123`, ainda em uso) **não revela um descendente cujo ANCESTRAL tem `display:
  none`** — comportamento padrão de CSS, não uma particularidade de navegador: `display: none` num
  ancestral remove a subárvore inteira do render tree, e nenhum `display` de um descendente
  consegue reverter isso (diferente de `visibility`, que É reversível por um descendente). Isso é
  exatamente a mesma categoria de bug que a spec 024 corrigiu para o modal (`.modal > .modal-dialog
  > .modal-content > .modal-body`) — só que aqui os ancestrais problemáticos seriam `[data-view]` e
  `<main>`, presentes em **toda** view da SPA, DSA incluído. **Isso significa que trocar o modal por
  uma view SPA, por si só, NÃO resolve o problema que motivou a spec 024 trocar "Imprimir" para o
  fluxo de PDF** — a NOVA view continuaria tendo os mesmos ancestrais problemáticos. Para o item 1c
  funcionar de verdade com `window.print()`, o mecanismo de impressão em `app/globals.css` precisa ser
  redesenhado nesta mesma spec: em vez de "esconder tudo a partir de `body` e reverter só o
  container", passa a esconder explicitamente só o CHROME persistente da SPA (`nav.navbar`,
  `.sidebar-offcanvas`, `#overlay`) e confiar no mecanismo JÁ EXISTENTE de alternância de
  `[data-view]`/painéis via `style.display` inline (`irPara`/`mostrarPainelEdicaoInstrutor_`) para
  garantir que só a view/painel ativo está visível — sem NUNCA aplicar `display: none` a
  `[data-view]`, `<main>` ou `body` durante a impressão. Achado colateral (não confirmado em
  navegador, mas decorrente da mesma mecânica de CSS): a impressão do DSA, alegada "sem regressão"
  em toda spec desde a 023, corre o mesmo risco estrutural (`#areaImpressao` também vive dentro de
  `[data-view="tabDsa"]`/`<main>`) — o redesenho proposto aqui, aplicado ao bloco `@media print`
  compartilhado, corrige os dois casos ao mesmo tempo, sem duplicar lógica (Princípio VI).

## Clarifications

### Session 2026-08-19

- Q: Quando "Salvar Ficha" ou "Imprimir" falham, o erro também aparece como toast, ou
  continua usando `alert()`? → A: `alert()` no erro (Opção B) — toast só no caminho de sucesso,
  exatamente como descrito no pedido original, sem tocar no `.catch` já existente.
- Q: Dentro da Aba 3, o card "Sistema" fica avulso (separado) ou se mistura com os campos de
  Qualificação Docente? → A: Avulso (Opção A) — mesma separação visual de hoje, só realocada para
  dentro da Aba 3, menor risco de confundir dado editável com metadado somente-leitura.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir e usar a Ficha do Instrutor como página inteira, sem modal (Priority: P1)

Como usuário que quer ver ou gerar a Ficha de um instrutor, quero que ela abra como uma página
inteira da SPA (mesmo padrão já usado pela tela de edição), com "Voltar" me devolvendo à listagem,
para navegar de forma consistente com o resto do sistema e nunca mais esbarrar no bug de página em
branco do modal.

**Why this priority**: É o núcleo do pedido — sem essa troca, os itens de impressão/salvamento não
têm onde acontecer; corrige de vez o mesmo bug de impressão que já levou 2 hotfixes (023, 024).

**Independent Test**: Clicar em "Ficha" na listagem de um instrutor — confirmar que a tela inteira
muda para a Ficha (nunca um modal sobreposto), com os 3 botões no topo; clicar "Voltar" — confirmar
retorno à listagem.

**Acceptance Scenarios**:

1. **Given** a listagem de instrutores, **When** o usuário clica no botão que hoje abre o modal da
   Ficha, **Then** a tela inteira é substituída pela nova view da Ficha (mesmo mecanismo de
   `mostrarPainelEdicaoInstrutor_`/`painelEdicaoInstrutor`, um 3º painel dentro de
   `[data-view="tabInstrutores"]`), nunca um `.modal` do Tailwind CSS.
2. **Given** a Ficha aberta, **When** o usuário clica "Voltar", **Then** a listagem principal volta
   a aparecer (mesmo padrão de `fecharPainelEdicaoInstrutor_`).
3. **Given** a Ficha aberta, **When** o usuário clica "Salvar Ficha", **Then** o mesmo
   backend `gerarFichaPDF` já existente é acionado e, em caso de sucesso, um toast (Tailwind CSS
   Toast, primeiro uso no projeto — já compatível, o pacote `tailwindcss` + `shadcn/ui` em uso desde o Hotfix
   010) confirma o salvamento — nunca mais um `alert()`/nova aba silenciosa para este botão
   especificamente.
4. **Given** a Ficha aberta, **When** o usuário clica "Imprimir", **Then** `window.print()` do
   navegador é acionado e produz **só** o conteúdo real da Ficha, sem nenhuma página em branco —
   requer o redesenho do `@media print` compartilhado descrito nos Achados reais (não é suficiente
   reaproveitar a regra da spec 023 como está).
5. **Given** a impressão do DSA (Épico H), **When** testada depois desta spec, **Then** continua
   (ou passa a) funcionar corretamente — o redesenho do `@media print` beneficia os dois usos ao
   mesmo tempo, sem lógica duplicada.

---

### User Story 2 - Formulário de edição sem conteúdo fora das 3 abas (Priority: P2)

Como usuário editando um instrutor, quero que tudo — inclusive os painéis de disciplinas e os
campos de sistema — esteja dentro de uma das 3 abas nomeadas, para não ver conteúdo "solto" embaixo
de qualquer aba que eu escolher.

**Why this priority**: Melhoria de organização/clareza, sem bloquear nenhuma outra história — o
formulário já funciona hoje, mesmo com os painéis fora da estrutura de abas.

**Independent Test**: Abrir a edição de um instrutor — confirmar que os painéis de "Qualificação do
Instrutor", "Disciplinas Habilitadas (calculado)" e o card "Sistema" só aparecem dentro da Aba 3
("Dados Complementares"), nunca visíveis nas Abas 1/2.

**Acceptance Scenarios**:

1. **Given** o formulário de edição aberto na Aba 1 ou 2, **When** observado, **Then** nenhum dos 3
   painéis (Sistema, Disciplinas Habilitadas, Qualificação do Instrutor) aparece na tela.
2. **Given** o formulário de edição, **When** a Aba 3 é selecionada, **Then** os 3 painéis aparecem
   dentro dela, na ordem: campos de Qualificação Docente já existentes → Disciplinas Habilitadas →
   Qualificação do Instrutor (busca+checkboxes) → Sistema.
3. **Given** o card "Sistema", **When** observado, **Then** o título mostra só "Sistema" (sem o
   sufixo "(Somente Leitura)").

---

### User Story 3 - Remover a coluna "Instrutor (Nome Completo Formatado)" (Priority: P3)

Como responsável pela integridade do schema, quero remover completamente a coluna
`Instrutor_Completo` (fórmula nativa, sem nenhum outro consumidor real), para não manter uma coluna
morta no banco.

**Why this priority**: É limpeza de schema sem efeito colateral funcional (achado real: zero outro
consumidor) — pode esperar as 2 histórias anteriores sem bloquear nada.

**Independent Test**: Rodar o script de migração contra a cópia local de trabalho — confirmar que a
coluna some do cabeçalho, backup existe, `migracao_log` ganha uma linha nova; abrir a edição de um
instrutor — confirmar que o campo "Instrutor (nome completo formatado)" não aparece mais em lugar
nenhum.

**Acceptance Scenarios**:

1. **Given** o banco de trabalho, **When** a migração roda, **Then** a coluna `Instrutor_Completo`
   é removida do cabeçalho de `instrutores`, com backup prévio e uma linha nova em
   `migracao_log` (nunca reescrevendo linhas antigas, Princípio IV).
2. **Given** o código-fonte, **When** buscado por `Instrutor_Completo`, **Then** nenhuma referência
   resta em `lib/acoes/crud.ts`/`app/(app)/instrutores/page.tsx` (os 2 únicos pontos hoje).

---

### User Story 4 - Campo Estado e máscaras rígidas de CPF/CEP/Telefone/RETELMA (Priority: P2)

Como usuário cadastrando/editando um instrutor, quero que Estado seja um dropdown de UFs (RJ
pré-selecionado) e que CPF/CEP/Telefone/RETELMA se formatem sozinhos enquanto digito, para nunca
salvar um desses campos fora do formato esperado.

**Why this priority**: Mesma prioridade de US2 — melhoria de qualidade de dado, independente das
outras 3 histórias.

**Independent Test**: Abrir o cadastro de um novo instrutor — confirmar que "Estado" já nasce com
"RJ" selecionado; digitar um CPF/CEP/Telefone/RETELMA cru (só dígitos) num desses 4 campos —
confirmar que a formatação aparece em tempo real, caractere a caractere.

**Acceptance Scenarios**:

1. **Given** o bloco de Endereço do formulário, **When** renderizado, **Then** mostra um `<select>`
   "Estado" com as 27 UFs do Brasil, `"RJ"` selecionado por padrão em modo cadastro (mesma
   convenção de `Status='Ativo'` pré-selecionado em cadastro, já usada hoje).
2. **Given** o campo CPF, **When** o usuário digita `12345678901`, **Then** o campo mostra
   `123.456.789-01` em tempo real, a cada tecla.
3. **Given** o campo CEP, **When** o usuário digita `12345678`, **Then** o campo mostra `12345-678`.
4. **Given** o campo Telefone, **When** o usuário digita 11 dígitos, **Then** o campo mostra
   `(00) 00000-0000`; com 10 dígitos, mostra `(00) 0000-0000`.
5. **Given** o campo RETELMA, **When** o usuário digita 10 dígitos, **Then** o campo mostra `(00)
   0000-0000`; com 8 dígitos (sem o prefixo de 2 dígitos), mostra `0000-0000` (achado real durante
   a implementação — o pedido original citava "8 dígitos" para o formato completo, mas `(00)
   0000-0000` soma 10 dígitos: 2 do prefixo + 4+4 do número; corrigido para manter os dois formatos
   internamente consistentes).
6. **Given** os campos NIP e de Data já existentes, **When** usados depois desta spec, **Then**
   continuam validando exatamente como hoje — nenhuma regressão.

---

### Edge Cases

- Instrutor com `Instrutor_Completo` já vazio (padrão real de vários registros, achado da spec
  014): a remoção da coluna não perde nenhum dado real — o campo nunca teve valor confiável fora da
  fórmula nativa.
- CPF/CEP/Telefone/RETELMA com valor legado já salvo fora do formato esperado (dado antigo, sem
  máscara aplicada retroativamente): a máscara só formata o que é digitado dali para frente, nunca
  reformata em lote o dado já salvo — mesmo comportamento de `mascaraNip_` hoje.
- Instrutor sem nenhuma disciplina qualificada/ministrada: os painéis de Disciplinas dentro da Aba 3
  aparecem vazios/com mensagem "—", nunca escondidos por completo (mesmo padrão já usado em toda a
  tela).
- Impressão da Ficha SPA com o navegador em modo mobile/janela estreita: fora do escopo desta spec
  (mesma assunção de toda tela do projeto, sem breakpoint dedicado a impressão).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A Ficha do Instrutor MUST deixar de ser um `.modal` do Tailwind CSS e passar a ser um 3º
  painel dentro de `[data-view="tabInstrutores"]` (mesmo mecanismo de alternância por
  `style.display` já usado por `painelPrincipalInstrutores`/`painelEdicaoInstrutor`), com o design
  visual baseado em `SIS11/modelos/Ficha de Cadastro Docente.zip` →
  `ficha-cadastro-docente-template.html` (achado real — `app/print/ficha-instrutor/page.tsx` não existe).
- **FR-002**: O painel da Ficha MUST ter exatamente 3 botões no topo: "Voltar" (retorna à listagem),
  "Salvar Ficha" (aciona `gerarFichaPDF` via `gerarPdfFichaClick`, exibe um Tailwind CSS Toast
  de sucesso em vez de nova aba silenciosa) e "Imprimir" (aciona `window.print()`). Em caso de erro
  (rede/permissão), MUST continuar usando `alert()` — mesmo `.catch` já existente, sem mudança
  (Clarifications 2026-08-19); o Toast é exclusivo do caminho de sucesso.
- **FR-003**: O bloco `@media print` compartilhado (`app/globals.css`) MUST ser redesenhado para nunca
  aplicar `display: none` a `[data-view]`, `<main>` ou `body` — MUST esconder apenas o chrome
  persistente da SPA (`nav.navbar`, `.sidebar-offcanvas`, `#overlay`) e confiar no mecanismo já
  existente de alternância de view/painel por `style.display` inline para garantir que só o
  conteúdo ativo aparece — sem regressão na impressão A4 paisagem do DSA (Épico H).
- **FR-004**: O bloco "Sistema" (renomeado de "Sistema (somente leitura)" para só "Sistema") e os
  painéis "Disciplinas Habilitadas (calculado)" e "Qualificação do Instrutor" MUST aparecer
  exclusivamente dentro do `tab-pane` da Aba 3 ("Dados Complementares"), nunca fora da estrutura de
  abas. "Sistema" MUST permanecer um card avulso dentro da Aba 3 (Clarifications 2026-08-19) — não
  se mistura com os campos de Qualificação Docente já existentes.
- **FR-005**: A coluna `Instrutor_Completo` MUST ser removida por completo — do cabeçalho de
  `instrutores` (via script de migração com backup prévio e nova linha em `migracao_log`,
  Princípio IV), de `COLUNAS_FORMULA['instrutores']` (`lib/acoes/crud.ts`) e do bloco "Sistema"
  (`app/(app)/instrutores/page.tsx`).
- **FR-006**: Uma nova coluna `Endereco_Estado` MUST ser adicionada a `instrutores` (migração
  aditiva, mesmo protocolo de backup/log do FR-005), exibida como `<select>` de 27 UFs no bloco de
  Endereço, com `"RJ"` pré-selecionado em modo cadastro. Fora do escopo: nenhuma tag nova no
  template da rota `/print/ficha-instrutor`/`MAPA_TAGS_FICHA_PDF` para este campo (Princípio IX).
- **FR-007**: Os campos CPF, CEP, Telefone e RETELMA MUST ganhar `tipo: 'texto-mascarado-generico'`
  (mesmo padrão de NIP/`mascaraNip_`, generalizado — FR-008) com uma função de máscara dedicada
  cada, aplicada via evento `input`: CPF `000.000.000-00`; CEP `00000-000`; Telefone `(00)
  00000-0000` (11 dígitos) ou `(00) 0000-0000` (10 dígitos); RETELMA `(00) 0000-0000` (10 dígitos —
  prefixo de 2 dígitos + número em 4+4) ou `0000-0000` (8 dígitos, sem o prefixo).
- **FR-008**: As validações já existentes de NIP e dos campos de Data MUST permanecer estritamente
  como estão — nenhuma mudança de comportamento nelas.

### Key Entities *(include if feature involves data)*

- **`instrutores`**: perde a coluna `Instrutor_Completo` (FR-005); ganha a coluna
  `Endereco_Estado` (FR-006, texto livre de 2 caracteres, UF).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das aberturas da Ficha usam a nova view em página inteira, nunca um modal.
- **SC-002**: 100% dos cliques em "Imprimir" produzem impressão sem nenhuma página em branco,
  verificável no preview de impressão do navegador — incluindo a impressão do DSA, testada em
  conjunto.
- **SC-003**: 0% de campo/painel visível fora da aba correta no formulário de edição.
- **SC-004**: 100% dos campos CPF/CEP/Telefone/RETELMA mostram o formato correto durante a digitação
  (não só ao salvar).
- **SC-005**: 0% de referência a `Instrutor_Completo` restante em `src/` após a migração.
- **SC-006**: 0% de regressão na suíte de testes (`pnpm vitest run`) e nas validações já
  existentes de NIP/Data.

## Assumptions

- "Imprimir" não depende de "Salvar Ficha" ter sido clicado antes — os 2 botões são ações
  independentes (leitura mais direta do Escopo item 1, que descreve os 2 como itens `b`/`c`
  paralelos, não sequenciais); a frase "validando o salvamento prévio" do Critério de Aceite
  original é lida como "a impressão funciona corretamente, o que valida indiretamente que o fluxo
  de geração de PDF continua saudável", não como um bloqueio técnico novo.
- O design de `ficha-cadastro-docente-template.html` é adaptado (grade de 12 colunas, cores,
  tipografia, numeração de seção), não copiado literalmente byte a byte — os `{{TAG}}` do arquivo
  viram interpolação JS a partir dos mesmos dados já carregados em memória
  (`instrutoresCarregados`/`disciplinasCarregadas_`/`vinculosCarregados_`), sem nenhuma chamada de
  rede nova.
- A migração de `Instrutor_Completo`/`Endereco_Estado` roda primeiro contra a cópia local de
  trabalho (mesmo padrão de toda migração desta sessão) — aplicar contra a banco de produção exige
  autorização explícita de Bernardo, tratada como pendência real ao final da spec, não como parte
  do `/speckit-implement`.
