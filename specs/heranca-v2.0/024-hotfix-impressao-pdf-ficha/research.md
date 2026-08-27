# Research — Hotfix: Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template

## 1. Título sem posto/especialidade e cabeçalho em ordem errada

**Decision**: Em `renderizarModalFichaInstrutor_` (``app/(app)/instrutores/page.tsx`:1280-1285`), trocar os dois
primeiros argumentos vazios de `formatarNomeInstrutor_` por `instrutor.Posto_Graduacao`/
`instrutor.Esp_Hab_Obs`, e reescrever o bloco de cabeçalho fixo para 3 linhas institucionais em
TUDO MAIÚSCULO (Clarifications 2026-08-19), preservando "Ficha do Instrutor" como subtítulo
(não maiúsculo). De:
```js
document.getElementById('fichaInstrutorConteudo').innerHTML = `
  <div class="text-center mb-3">
    <h5 class="mb-0">CIAARA — Centro de Instrução e Adestramento Almirante Radler de Aquino</h5>
    <div class="text-muted small">Marinha do Brasil — Ficha do Instrutor</div>
  </div>
  <h5>${formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)}</h5>
  ...
```
Para:
```js
document.getElementById('fichaInstrutorConteudo').innerHTML = `
  <div class="text-center mb-3">
    <div class="fw-bold">MARINHA DO BRASIL</div>
    <div class="fw-bold">CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO</div>
    <div class="fw-bold">DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA</div>
    <div class="text-muted small mt-1">Ficha do Instrutor</div>
  </div>
  <h5>${formatarNomeInstrutor_(instrutor.Posto_Graduacao, instrutor.Esp_Hab_Obs, instrutor.Nome_Completo, instrutor.Nome_Guerra, true)}</h5>
  ...
```

**Rationale**: `gerarPdfFichaClick` (mesmo arquivo, poucas linhas abaixo) já chama
`formatarNomeInstrutor_` com os 4 valores reais do instrutor — o título do modal só precisa ficar
consistente com o padrão já correto e já usado no mesmo arquivo (mesmo raciocínio de "replicar o
que já funciona" usado nas specs 018/023). O cabeçalho de 3 linhas em maiúsculo replica exatamente
o texto já existente no template da rota `/print/ficha-instrutor` oficial (lido ao vivo nesta sessão), evitando duas
convenções visuais paralelas para o mesmo documento (tela vs. PDF).

**Alternatives considered**:
- *Cabeçalho em Título/Frase normal (Title Case)* — era a redação original do pedido (Escopo item
  2); rejeitada no `/speckit-clarify` (Bernardo escolheu Opção A, maiúsculo) por divergir do padrão
  já oficial do Template.

## 2. Fluxo de impressão via PDF do Supabase Storage, não mais `window.print()` sobre o modal

**Decision**: ``app/(app)/instrutores/page.tsx`:49-50` (modal-footer) — renomear o botão "Gerar PDF" para
"Salvar Ficha" (texto apenas) e trocar o `onclick` do botão "Imprimir" de `window.print()`
para o mesmo `gerarPdfFichaClick(...)` já usado pelo botão de salvar. De:
```html
<button type="button" class="btn btn-outline-primary" onclick="gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)">Gerar PDF</button>
<button type="button" class="btn btn-primary" onclick="window.print()">Imprimir</button>
```
Para:
```html
<button type="button" class="btn btn-outline-primary" onclick="gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)">Salvar Ficha</button>
<button type="button" class="btn btn-primary" onclick="gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)">Imprimir</button>
```
Nenhuma mudança em `gerarPdfFichaClick` nem em `gerarFichaPDF` (backend) — a função já gera o PDF e
abre `url` numa nova aba via `window.open(url, '_blank')` (spec 022/023, inalterado).

**Rationale**: A correção `display: none`/`revert`/`block` da spec 023 é estruturalmente
insuficiente dentro de um modal Tailwind CSS — `body * { display: none !important; }` também atinge
`.modal`/`.modal-dialog`/`.modal-content`/`.modal-body`, que são **ancestrais** do container
impresso (`.area-impressao`), não descendentes dele; a regra de `revert` só alcança o próprio
container e seus descendentes, nunca seus ancestrais. Regra de cascata do CSS: um ancestral com
`display: none` remove a subárvore inteira da renderização mesmo que um descendente tenha
`display: block` — diferente de `visibility`, onde um filho pode reverter `hidden` do ancestral.
Por isso a correção não é mais um ajuste fino de CSS (decisão explícita do responsável): gerar um
PDF real via `a rota de impressão `/print/*``/`o Supabase Storage` e abri-lo numa nova aba remove o problema pela raiz — o PDF é
um documento isolado, sem nenhum DOM de app em volta, então nenhuma regra `display`/`visibility` da
SPA pode afetá-lo.

**Alternatives considered**:
- *Mover `#fichaInstrutorConteudo` para fora do `.modal` antes de `window.print()`, movendo de
  volta depois* — rejeitada: reimplementaria manualmente, com manipulação de DOM frágil, o mesmo
  resultado que gerar o PDF real já entrega de forma robusta e sem duplicar a lógica de
  renderização entre tela e impressão (a Ficha teria 2 fontes de verdade: o HTML do modal E o
  template da rota `/print/ficha-instrutor`).
- *Adicionar uma segunda regra CSS `.modal:has(.area-impressao) { display: block !important; }`
  para forçar os ancestrais também* — rejeitada: `:has()` tem suporte inconsistente em versões
  mais antigas de navegadores baseados em Chromium, e mesmo funcionando, ainda deixaria o `.modal`
  visível por cima do conteúdo real durante a impressão (backdrop, barra de rolagem do modal),
  exigindo uma terceira camada de regras `display: none` seletivas — a mesma categoria de
  fragilidade que motivou a decisão do responsável de trocar de abordagem.

## 3. Completar as 14 tags faltantes do Template

**Decision**: As 14 tags de `MAPA_TAGS_FICHA_PDF` (``lib/acoes/instrutores.ts`:252-286`) ainda sem `{{TAG}}`
correspondente no Template (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`) são inseridas num único
`batchUpdate` da API do a rota de impressão `/print/*` (mesmo mecanismo atômico das specs 022/023 — as 13 requisições
de inserção pura usam índices aplicados em ordem decrescente para não sofrer drift entre elas
dentro do mesmo lote; `DISCIPLINAS_MINISTRADAS` é a exceção mecânica — não é inserção de linha
nova, é substituição de um trecho de texto já existente, ver `contracts/template-tags.md`), com
backup do documento criado antes de qualquer edição e leitura de volta do texto completo **depois
que o lote inteiro (`batchUpdate`) commita** — uma única verificação combinada das 14 tags, não 14
round-trips separados de inserir-e-verificar. Ver `contracts/template-tags.md` para a posição exata
de cada uma das 14 tags (mesma lista e posições do Escopo item 5 do pedido original, confirmada
correta e completa pelo achado real desta spec — só o total "32" precisava de correção para 34).

**Rationale**: `Object.keys(MAPA_TAGS_FICHA_PDF).forEach(...)` em `gerarFichaPDF` já percorre as 34
chaves e chama `Body.replaceText('{{TAG}}', ...)` para cada uma — uma tag ausente do Template
simplesmente não encontra nada para substituir (degradação segura nativa do Next.js, Princípio
V), então inserir as 14 tags faltantes é 100% trabalho no documento do Supabase Storage, zero mudança em
`lib/acoes/instrutores.ts` (FR-007). O item CATEGORIA é inserido só como texto de conferência (sem tentar
marcar automaticamente nenhum checkbox do Template) — instrução explícita do pedido original, e
consistente com a decisão da spec 022 de nunca inventar automação sobre uma UI de formulário em
papel que o sistema não controla.

**Alternatives considered**:
- *Marcar automaticamente o checkbox de categoria correspondente no Template* — rejeitada
  explicitamente pelo pedido original: exigiria mapear o valor de `Categoria` para uma posição
  exata de checkbox no a rota de impressão `/print/*` (frágil a qualquer edição futura do layout do Template) só para
  economizar uma conferência manual de baixo custo.
