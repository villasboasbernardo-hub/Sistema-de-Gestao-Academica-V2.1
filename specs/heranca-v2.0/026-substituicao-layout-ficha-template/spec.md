# Feature Specification: Hotfix — Substituição Estrita do Layout da Ficha pelo Template Local

**Feature Branch**: `026-substituicao-layout-ficha-template`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "HOTFIX: Substituição Estrita do Layout da Ficha pelo Template Local. Contexto: a view atual da Ficha do Instrutor não usa a formatação HTML correta previamente desenhada; o layout exato e as imagens oficiais estão salvos em um diretório local. Objetivo: substituir todo o HTML da view pelo conteúdo do arquivo local, convertendo as imagens nativamente para Base64. ZERO alterações nas lógicas de botões (Voltar, Salvar, Imprimir) ou lógicas de backend. Escopo: 1. Ler `SIS11/modelos/Ficha de cadastro` e localizar o template HTML. 2. Substituir todo o conteúdo visual da view atual pelo código exato do arquivo local, mantendo os botões (só ajustar posicionamento se necessário). 3. Localizar as 2 imagens da mesma pasta, converter para Base64, injetar nos atributos src — proibido link de caminho local. Critério de Aceite: layout milimetricamente igual ao arquivo local, imagens via Base64 instantâneo, botões funcionando."

## Achados reais (leitura de código e arquivo antes de escrever qualquer requisito)

- **O arquivo não se chama exatamente como esperado, mas existe e é inequívoco**: o diretório
  `SIS11/modelos/Ficha de cadastro` (fora do repositório `CIAARA-11-v2/`) contém exatamente 1
  arquivo HTML — `FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` (39.933 bytes) — e 1 subpasta
  `images/` com exatamente 2 arquivos: `image1.png` (90.438 bytes) e `image2.png` (112.334 bytes),
  batendo exatamente com "2 imagens" do pedido. O nome do arquivo HTML confirma que é um export
  "Salvar como página da Web" do MESMO `.docx` (`FICHA CADASTRO DE DOCENTES CIAARA(2).docx`) que já
  é a origem do template da rota `/print/ficha-instrutor` em uso desde a spec 022 para gerar o PDF
  (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`) — não é um design novo e independente, é uma
  exportação HTML fiel do mesmo documento oficial.
- **O arquivo já tem as tags `{{TAG}}` — lido por completo antes de escrever qualquer requisito**:
  33 das 34 chaves de `MAPA_TAGS_FICHA_PDF` aparecem literalmente no HTML
  (`{{ID_INSTRUTOR}}`, `{{POSTO_GRADUACAO}}`, `{{ESP_HAB_OBS}}`, `{{NOME_COMPLETO}}`,
  `{{NOME_GUERRA}}`, `{{NIP}}`, `{{RG}}`, `{{ORGAO_EMISSOR}}`, `{{CPF}}`, `{{DATA_NASCIMENTO}}`,
  `{{EMAIL}}`, `{{TELEFONE}}`, `{{RETELMA}}`, `{{ENDERECO_LOGRADOURO/NUMERO/BAIRRO/CIDADE/
  COMPLEMENTO/CEP}}`, `{{CATEGORIA}}`, `{{REGIME_TRABALHO}}`, `{{NIVEL_ESCOLARIDADE}}`,
  `{{DATA_AVALIACAO}}`, `{{OM}}`, `{{DEP_DIVISAO}}`, `{{DATA_ASSUNCAO_SETOR}}`, `{{PREFERENCIA}}`,
  `{{FORMACAO_PRINCIPAL_SECUNDARIA}}`, `{{AREA_CONHECIMENTO}}`, `{{DATA_INICIO_DOCENCIA_MB/
  CIAARA}}`, `{{CAPACITACAO_DIDATICA}}`, `{{DISCIPLINAS_MINISTRADAS}}`). **Diferenças reais**:
  `{{ANTIGUIDADE_DECLARADA}}` (presente no template da rota `/print/ficha-instrutor` desde a spec 024) NÃO aparece
  neste arquivo local — é uma versão de layout diferente/anterior daquela edição específica; e o
  arquivo tem 2 tags a mais que não existem em `MAPA_TAGS_FICHA_PDF`: `{{DISCIPLINAS_HABILITADAS}}`
  e `{{DATA_GERACAO}}`. Como a view SPA nunca passou pelo backend de PDF (interpola direto de dados
  já em memória, spec 025), essas 2 tags extras são preenchíveis sem nenhuma mudança de backend —
  `DISCIPLINAS_HABILITADAS` já é computada hoje (`disciplinasHabilitadasDoInstrutor_`, spec 019) e
  `DATA_GERACAO` é a data atual calculada no cliente (`new Date()`).
- **Achado que reverte uma decisão de Clarifications anterior**: o cabeçalho institucional atual da
  view (3 linhas em TUDO MAIÚSCULO, decisão da spec 024, Clarifications 2026-08-19) NÃO bate com o
  cabeçalho do arquivo local, que usa Título/Frase normal ("Marinha do Brasil", não "MARINHA DO
  BRASIL") mais as 2 imagens (brasões) lado a lado com o texto — exatamente a opção B que havia sido
  rejeitada naquela sessão de clarify. Como o pedido desta spec é "substituir TODO o conteúdo visual
  pelo código exato" e agora existe uma fonte imagética oficial que não existia na spec 024 (na
  época, os brasões eram só um espaço reservado sem imagem real, `style="display:none"` na navbar),
  a fonte de verdade muda: o arquivo local, com as imagens reais, passa a ser a referência
  autoritativa — o cabeçalho maiúsculo-sem-imagem da spec 024 é substituído pelo cabeçalho
  Título/Frase-com-imagens do arquivo local, revertendo aquela decisão à luz de um dado novo
  (as imagens oficiais nunca tinham sido fornecidas antes).
- **`renderizarFichaInstrutor_` (``app/(app)/instrutores/page.tsx`:1312`, spec 025) hoje NÃO usa o layout do
  arquivo local** — usa uma tabela genérica rótulo/valor construída a partir de
  `BLOCOS_EDICAO_INSTRUTOR` (a mesma taxonomia de campo do formulário de edição), com cabeçalho
  próprio de 3 linhas maiúsculas. Confirma o sintoma relatado no pedido ("não está usando a
  formatação HTML correta"). `BLOCOS_EDICAO_INSTRUTOR` continua intocado — é usado pelo formulário
  de edição (spec 016/022/025), fora do escopo desta spec.
- **As classes CSS do arquivo exportado (`.c0` a `.c104`, geradas automaticamente pelo 
  Docs) são perigosamente genéricas para injeção direta no documento inteiro da SPA** — um
  `<style>` sem escopo aplicaria essas ~100 regras a QUALQUER elemento do sistema que
  coincidentemente tivesse uma classe `c0`...`c104` (nenhum encontrado hoje em `src/`, mas é uma
  premissa frágil para o futuro). Mitigação sem alterar nenhum pixel do resultado visual: as
  regras do `<style>` do arquivo são copiadas exatamente como estão, mas prefixadas por um único
  seletor de contêiner (`#fichaInstrutorConteudo`) — mesmo conjunto de regras, mesma especificidade
  relativa entre elas, blast radius contido a um único elemento da árvore.
- **As 2 imagens usam uma técnica de recorte do a rota de impressão `/print/*`, não são plaquinhas simples** —
  `image1.png` aparece dentro de um contêiner de 73×89.87px com `overflow:hidden`, contendo uma
  tag `<img>` sobredimensionada (325×174px) deslocada por margens negativas — recorta visualmente
  a imagem original para mostrar só uma região dela. `image2.png` aparece sem recorte, 79.67×
  78.47px, ao lado do texto "Marinha do Brasil". Preservar essa técnica exatamente (mesmas
  dimensões/margens do HTML original) é necessário para a fidelidade "milimetricamente igual".
- **Tamanho real do Base64**: `image1.png` (90.438 bytes) vira 120.584 caracteres Base64;
  `image2.png` (112.334 bytes) vira 149.780 caracteres — ~270KB de texto adicionados a
  `app/(app)/instrutores/page.tsx`. Aceitável (sem limite de tamanho de arquivo `.html` do Next.js que
  chegue perto disso), mas documentado como o custo real do pedido, não escondido.
- **Botões e lógica confirmados intocados**: `mostrarPainelFichaInstrutor_`/
  `fecharPainelFichaInstrutor_`/`salvarFichaClick_`/`window.print()` (spec 025) — nenhuma
  dessas funções precisa mudar; só o HTML gerado por `renderizarFichaInstrutor_` muda por dentro,
  mantendo o wrapper `id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor"` (spec
  023/024/025) para o `@media print` redesenhado continuar funcionando sem regressão.

## Clarifications

### Session 2026-08-19

- Q: O `<hr style="page-break-before:always;">` do arquivo local (antes do bloco de data/
  assinatura) deve ser mantido literalmente ou removido? → A: Removido (Opção B) — único ponto de
  desvio deliberado do "código exato"; pensado para paginação de um documento Word/PDF de várias
  páginas, sem sentido numa impressão de página única, e evita reintroduzir a mesma categoria de
  bug de página extra/quase-vazia já corrigida 3 vezes nesta sessão (specs 023/024/025). Todo o
  resto do arquivo (tabela, imagens, rodapé) permanece exato.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a Ficha com o layout oficial exato, imagens incluídas (Priority: P1)

Como usuário que abre a Ficha de um instrutor, quero ver exatamente o layout oficial desenhado
(mesma estrutura de tabela, mesmo cabeçalho com os 2 brasões, mesma tipografia), para que a tela
corresponda ao documento oficial que a organização já aprovou.

**Why this priority**: É o núcleo do pedido — sem isso, nenhuma outra parte do hotfix faz sentido.

**Independent Test**: Abrir a Ficha de um instrutor de teste — comparar visualmente com o arquivo
`FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` aberto num navegador — mesma estrutura, mesmas 3
seções numeradas, mesmo cabeçalho com os 2 brasões.

**Acceptance Scenarios**:

1. **Given** a Ficha de um instrutor aberta, **When** observada, **Then** o layout é
   estruturalmente idêntico ao arquivo HTML local (mesma tabela de 3 seções numeradas, mesmos
   rótulos, mesmo cabeçalho institucional com 2 imagens), com os campos preenchidos pelos dados
   reais do instrutor no lugar de cada `{{TAG}}`.
2. **Given** o cabeçalho da Ficha, **When** observado, **Then** mostra as 2 imagens (brasões) e o
   texto em Título/Frase normal ("Marinha do Brasil"), não mais em maiúsculo — reverte a decisão
   visual da spec 024 à luz do arquivo oficial agora disponível (achado real).
3. **Given** as 2 imagens do cabeçalho, **When** a página carrega, **Then** aparecem
   instantaneamente (nunca uma requisição de rede separada nem um caminho de arquivo local) — os
   atributos `src` contêm a imagem em Base64 diretamente.
4. **Given** um campo do instrutor sem valor cadastrado, **When** a Ficha é renderizada, **Then** o
   campo correspondente aparece vazio (nunca a tag `{{...}}` literal nem `undefined`/`null`).

---

### User Story 2 - Botões e impressão continuam funcionando sem nenhuma mudança de lógica (Priority: P1)

Como usuário que já usa "Voltar"/"Salvar Ficha"/"Imprimir" na Ficha, quero que os 3
botões continuem se comportando exatamente como antes depois da troca de layout, para não perder
nenhuma funcionalidade já entregue.

**Why this priority**: Restrição explícita do pedido ("ZERO alterações nas lógicas de botões... ou
lógicas de backend") — mesma prioridade da US1, é a garantia de não regressão desta spec.

**Independent Test**: Clicar nos 3 botões após a troca de layout — confirmar que "Voltar" retorna
à listagem, "Salvar Ficha" gera o PDF com toast de sucesso, "Imprimir" produz impressão
sem página em branco — comportamento idêntico ao da spec 025.

**Acceptance Scenarios**:

1. **Given** a Ficha com o novo layout, **When** o usuário clica "Voltar", **Then** retorna à
   listagem principal — mesma função `fecharPainelFichaInstrutor_()`, inalterada.
2. **Given** a Ficha com o novo layout, **When** o usuário clica "Salvar Ficha", **Then**
   o mesmo `salvarFichaClick_`/`gerarFichaPDF` (backend, inalterado) é acionado, com o mesmo
   toast de sucesso.
3. **Given** a Ficha com o novo layout, **When** o usuário clica "Imprimir", **Then**
   `window.print()` produz a impressão sem página em branco — o novo conteúdo continua dentro do
   wrapper `id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor"`, preservando a
   correção de `@media print` da spec 025 sem regressão.
4. **Given** o restante da SPA (outras 9 views, formulário de edição, DSA), **When** usado depois
   desta spec, **Then** nada muda — as classes CSS do arquivo local ficam contidas ao container da
   Ficha, sem vazar para o resto do sistema.

---

### Edge Cases

- Instrutor sem `Antiguidade_Declarada` visível na Ficha: comportamento esperado, não um bug — o
  arquivo local não tem essa tag (achado real), a Ficha on-screen nunca mostrou esse campo desde
  antes desta spec pelo layout local.
- `Disciplinas_Ministradas` (texto histórico livre) vazio: campo aparece vazio, nunca `undefined`
  (mesmo padrão de degradação segura já usado em toda a Ficha).
- Recarregar a página (F5) com a Ficha aberta: as imagens em Base64 continuam disponíveis
  instantaneamente (embutidas no HTML servido pelo Next.js, não dependem de cache de rede).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `renderizarFichaInstrutor_` MUST substituir o HTML gerado a partir de
  `BLOCOS_EDICAO_INSTRUTOR` (tabela genérica rótulo/valor) pela estrutura exata de
  `SIS11/modelos/Ficha de cadastro/FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` — mesma tabela de 3
  seções numeradas, mesmos rótulos, mesma tipografia — com cada `{{TAG}}` substituída por
  interpolação client-side a partir dos mesmos dados já em memória (`instrutor`,
  `disciplinasHabilitadasDoInstrutor_`), nunca uma chamada de rede nova. Único desvio deliberado do
  conteúdo literal: o `<hr style="page-break-before:always;">` antes do bloco de data/assinatura
  MUST ser removido (Clarifications 2026-08-19) — todo o resto do arquivo permanece exato.
- **FR-002**: As 2 imagens (`image1.png`, `image2.png`) MUST ser convertidas para Base64 e
  injetadas diretamente nos atributos `src` das tags `<img>` correspondentes — MUST NUNCA referenciar
  um caminho de arquivo local (`C:\...`) nem uma URL externa.
- **FR-003**: A técnica de recorte visual de `image1.png` (contêiner `overflow:hidden` + `<img>`
  sobredimensionada com margens negativas) MUST ser preservada exatamente como no arquivo local —
  mesmas dimensões, mesmo deslocamento.
- **FR-004**: O `<style>` do arquivo local (classes `.c0`–`.c104`, geradas pelo a rota de impressão `/print/*`) MUST
  ser incluído com o mesmo conjunto de regras e a mesma especificidade relativa entre si, mas
  escopado sob um único seletor de contêiner (`#fichaInstrutorConteudo`) — MUST NUNCA vazar para o
  restante da SPA (outras views, formulário de edição, DSA).
- **FR-005**: `mostrarPainelFichaInstrutor_`, `fecharPainelFichaInstrutor_`,
  `salvarFichaClick_` e o `onclick="window.print()"` do botão "Imprimir" MUST permanecer
  com a lógica interna 100% inalterada — só a posição visual dos 3 botões pode mudar, se o novo
  layout exigir.
- **FR-006**: O wrapper `id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor"` MUST
  continuar envolvendo o conteúdo da Ficha, preservando a correção de `@media print`/impressão da
  spec 025 sem regressão.
- **FR-007**: `DISCIPLINAS_HABILITADAS` MUST ser preenchida por `disciplinasHabilitadasDoInstrutor_`
  (já existente); `DISCIPLINAS_MINISTRADAS` MUST continuar vindo de `instrutor.Disciplinas_Ministradas`
  (mesmo campo já usado); `DATA_GERACAO` MUST ser a data atual calculada no cliente
  (`new Date()`), formatada em pt-BR — nenhuma das 3 exige mudança de backend.
- **FR-008**: `ANTIGUIDADE_DECLARADA` MUST NUNCA aparecer na view da Ficha — o arquivo local de
  referência não tem essa tag (achado real); não é uma omissão a corrigir nesta spec.
- **FR-009**: Nenhuma mudança desta spec MUST alterar `lib/acoes/instrutores.ts`, `gerarFichaPDF`,
  `MAPA_TAGS_FICHA_PDF` ou o template da rota `/print/ficha-instrutor` usado para gerar o PDF — a troca de layout é
  exclusiva da view SPA on-screen (Princípio IX, restrição explícita do pedido original).

### Key Entities *(include if feature involves data)*

- Nenhuma entidade de dado nova ou alterada — esta spec toca só a renderização client-side da view
  da Ficha (`app/(app)/instrutores/page.tsx`), sem tocar schema nem backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das aberturas da Ficha mostram a estrutura exata do arquivo HTML local (3 seções
  numeradas, mesmos rótulos, cabeçalho com as 2 imagens).
- **SC-002**: 100% das imagens do cabeçalho carregam via `src` em Base64, 0% de referência a
  caminho de arquivo local ou URL externa.
- **SC-003**: 100% dos cliques nos 3 botões continuam funcionando exatamente como antes (Voltar,
  Salvar Ficha com toast, Imprimir sem página em branco).
- **SC-004**: 0% de vazamento de estilo — nenhuma outra view/tela do sistema muda de aparência
  depois desta spec.
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`) e no
  `@media print` compartilhado (Ficha e DSA).

## Assumptions

- O toolbar de 3 botões (Voltar/Salvar Ficha/Imprimir) continua fora do conteúdo do
  arquivo local, acima dele — mesma posição da spec 025 — já que o arquivo local em si não prevê
  nenhum botão interativo (é um documento estático); "ajustar o posicionamento" é lido como
  "manter o toolbar onde já está, cabendo visualmente acima do novo layout", não como "inserir os
  botões dentro da estrutura de tabela do documento".
- O `<hr style="page-break-before:always;...">` e o bloco de assinatura/rodapé do arquivo local
  (data, linha de assinatura, texto de uso interno) são incluídos como parte do "conteúdo exato" —
  fazem parte do documento oficial, sem motivo para omitir.
- O rótulo "Ficha do Instrutor" que hoje aparece como `<h4>` no toolbar (fora da área impressa)
  permanece — é parte do chrome da SPA, não do conteúdo do arquivo local, e o pedido não menciona
  removê-lo.
