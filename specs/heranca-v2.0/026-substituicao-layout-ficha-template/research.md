# Research — Hotfix: Substituição Estrita do Layout da Ficha pelo Template Local

## 1. Estratégia de transformação (script one-off, não edição manual)

**Decision**: O arquivo local (~40KB de HTML, ~100 regras CSS geradas pelo a rota de impressão `/print/*`) é
processado por um script Node/Python local (não versionado, usado uma única vez) que:
1. Extrai o conteúdo de `<style>...</style>` do arquivo.
2. Prefixa cada seletor de regra com `#fichaInstrutorConteudo ` (combinador descendente) — mesmo
   conjunto de regras, mesma especificidade relativa entre si, escopado a um único container
   (FR-004).
3. Extrai o conteúdo de `<body class="c70 doc-content">...</body>`.
4. Remove o `<hr style="page-break-before:always;display:none;">` (Clarifications 2026-08-19).
5. Troca cada `{{TAG}}` por `${...}` de interpolação JS, mapeado conforme a tabela da seção 3.
6. Troca `src="images/image1.png"`/`src="images/image2.png"` pelas 2 constantes Base64 (seção 2).
7. Gera o texto final de `renderizarFichaInstrutor_` (seção 4) para colar em
   `app/(app)/instrutores/page.tsx`.

**Rationale**: ~100 regras CSS coladas/reescritas à mão têm risco real de erro de transcrição
(faltar um ponto e vírgula, trocar um valor de cor) — um script determinístico elimina esse risco e
é auditável (roda de novo, produz o mesmo resultado). O script em si não fica no repositório
porque não é reexecutável de forma útil no futuro (é uma transformação de um arquivo externo
específico, não uma migração de dado versionado como os scripts de `migracao/`).

**Alternatives considered**:
- *Copiar e colar manualmente o HTML/CSS* — rejeitada: volume e risco de erro de transcrição
  incompatíveis com "milimetricamente igual" (um erro de transcrição seria exatamente o oposto do
  pedido).

## 2. Imagens em Base64

**Decision**: `image1.png` (90.438 bytes → 120.584 caracteres Base64) e `image2.png` (112.334
bytes → 149.780 caracteres Base64) são convertidas uma única vez e embutidas como
`data:image/png;base64,<...>` diretamente no atributo `src` de cada `<img>` correspondente,
preservando a técnica de recorte de `image1.png` (contêiner `overflow:hidden` 73×89.87px + `<img>`
sobredimensionada 325.05×174.45px com `margin-left:-127.21px; margin-top:-38.31px`) e o tamanho
simples de `image2.png` (79.67×78.47px, sem recorte) — mesmas dimensões/margens do arquivo
original (FR-003).

**Rationale**: Instrução explícita do pedido ("É ESTRITAMENTE PROIBIDO linkar arquivos com
caminhos locais... converta para Base64"). ~270KB de texto adicionados a `app/(app)/instrutores/page.tsx` —
aceitável (Next.js não tem limite de tamanho de arquivo `.html` que chegue perto disso; o
a importação de componentes já serve arquivos desse porte sem problema).

**Alternatives considered**:
- *Upload das imagens para o  Supabase Storage e referência por URL* — rejeitada: não é "carregamento
  instantâneo" (depende de uma requisição de rede), e o pedido pede Base64 explicitamente, não uma
  URL hospedada alternativa.

## 3. Mapeamento de tags — `{{TAG}}` do arquivo local → interpolação JS

| Tag no arquivo | Fonte de dado (JS) | Observação |
|---|---|---|
| `ID_INSTRUTOR` | `instrutor.ID_Instrutor` | |
| `POSTO_GRADUACAO` | `instrutor.Posto_Graduacao` | |
| `ESP_HAB_OBS` | `instrutor.Esp_Hab_Obs` | |
| `NOME_COMPLETO` | `instrutor.Nome_Completo` | |
| `NOME_GUERRA` | `instrutor.Nome_Guerra` | |
| `NIP` | `instrutor.NIP` | |
| `RG` | `instrutor.RG` | |
| `ORGAO_EMISSOR` | `instrutor.Orgao_Emissor` | |
| `CPF` | `instrutor.CPF` | |
| `DATA_NASCIMENTO` | `instrutor.Data_Nascimento` | |
| `EMAIL` | `instrutor.Email` | |
| `TELEFONE` | `instrutor.Telefone` | |
| `RETELMA` | `instrutor.RETELMA` | |
| `ENDERECO_LOGRADOURO`/`_NUMERO`/`_BAIRRO`/`_CIDADE`/`_COMPLEMENTO`/`_CEP` | `instrutor.Endereco_*` | 6 campos, mesmo padrão |
| `CATEGORIA` | `instrutor.Categoria` | |
| `REGIME_TRABALHO` | `instrutor.Regime_Trabalho` | |
| `NIVEL_ESCOLARIDADE` | `instrutor.Nivel_Escolaridade` | |
| `DATA_AVALIACAO` | `instrutor.Data_Avaliacao` | |
| `OM` | `instrutor.OM` | |
| `DEP_DIVISAO` | `instrutor.Dep_Divisao` | |
| `DATA_ASSUNCAO_SETOR` | `instrutor.Data_Assuncao_Setor` | |
| `PREFERENCIA` | `instrutor.Preferencia` | texto bruto serializado, mesmo campo já usado no formulário |
| `FORMACAO_PRINCIPAL_SECUNDARIA` | `instrutor.Formacao_Principal_Secundaria` | |
| `AREA_CONHECIMENTO` | `instrutor.Area_Conhecimento` | |
| `DATA_INICIO_DOCENCIA_MB`/`_CIAARA` | `instrutor.Data_Inicio_Docencia_MB`/`_CIAARA` | |
| `CAPACITACAO_DIDATICA` | `instrutor.Capacitacao_Didatica` | |
| `DISCIPLINAS_MINISTRADAS` | `instrutor.Disciplinas_Ministradas` | texto histórico livre, mesmo campo do formulário |
| `DISCIPLINAS_HABILITADAS` | `disciplinasHabilitadasDoInstrutor_(instrutor.ID_Instrutor, vinculosCarregados_, disciplinasCarregadas_).join('; ')` | já computada hoje (spec 019), tag nova nesta view (FR-007) |
| `DATA_GERACAO` | `new Date().toLocaleDateString('pt-BR')` | calculada no cliente, sem chamada de rede (FR-007) |

**Ausente do arquivo local, portanto ausente da view** (FR-008): `ANTIGUIDADE_DECLARADA` — existe
no Template do PDF (spec 024) mas não neste layout on-screen; achado real, não uma omissão.

Todo valor `null`/vazio é tratado com o mesmo padrão de degradação segura já usado
(`escapar(valor) || ''`, nunca a tag literal nem `undefined`).

## 4. Preservação de botões e wrapper de impressão

**Decision**: `renderizarFichaInstrutor_` mantém a mesma assinatura e o mesmo toolbar de 3 botões
(`Voltar`/`Salvar Ficha`/`Imprimir`) já existente (spec 025), acima do conteúdo do
template — nenhuma mudança de `onclick`/lógica. O conteúdo gerado pelo script (seção 1) substitui
só o miolo de `<div id="fichaInstrutorConteudo" class="area-impressao ficha-instrutor">...</div>`
— o `id`/classes do wrapper continuam exatamente iguais, preservando a compatibilidade com o
`@media print` redesenhado na spec 025 sem nenhuma mudança nele.

**Rationale**: FR-005/006/009 são restrições explícitas do pedido original ("ZERO alterações nas
lógicas de botões... ou lógicas de backend") — o único elemento que muda é o HTML dentro do
wrapper já existente, nunca o mecanismo de exibição/impressão em volta dele.

**Alternatives considered**: nenhuma — restrição direta do pedido, sem trade-off real.
