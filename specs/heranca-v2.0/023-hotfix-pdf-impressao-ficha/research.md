# Research — Hotfix: Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)

## 1. Vazamento de HTML no título da Ficha

**Decision**: Em `renderizarModalFichaInstrutor_` (``app/(app)/instrutores/page.tsx`:1285`), remover o wrapper
`escapar(...)` ao redor da chamada `formatarNomeInstrutor_('', '', instrutor.Nome_Completo,
instrutor.Nome_Guerra, true)` — a chamada em si (com `isHTML=true`) permanece inalterada,
preservando o negrito do nome de guerra (Clarifications 2026-08-19). De:
```js
<h5>${escapar(formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true))}</h5>
```
Para:
```js
<h5>${formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)}</h5>
```

**Rationale**: `formatarNomeInstrutor_(..., true)` já produz HTML seguro e determinístico (só
`<strong>`/`</strong>` ao redor de palavras do nome, nenhuma interpolação de dado não sanitizado
alheio — `Nome_Completo`/`Nome_Guerra` são texto simples do próprio instrutor) — não há razão de
segurança para escapar sua saída, e escapar é exatamente o que produzia o vazamento visual
reportado. A listagem (``app/(app)/instrutores/page.tsx`:392`) já usa o mesmo padrão (sem `escapar()`) com
sucesso desde a spec 018 — este ponto só precisa ficar consistente com o que já funciona.

**Alternatives considered**:
- *Trocar para `isHTML=false`* — rejeitado no `/speckit-clarify` (Bernardo escolheu manter o
  negrito, opção A) — produziria texto plano, mudando a aparência visual do título sem necessidade.

## 2. Impressão nativa gerando páginas em branco

**Decision**: No bloco `@media print` compartilhado (``app/globals.css`:109-123`), trocar
`visibility: hidden`/`visibility: visible` por `display: none !important`/`display: revert
!important` (com uma regra adicional, mais específica, forçando `display: block !important` só no
próprio container `.area-impressao`, para a técnica de posicionamento absoluto continuar
funcionando). De:
```css
body * { visibility: hidden; }
#areaImpressao, #areaImpressao *, .area-impressao, .area-impressao * { visibility: visible; }
.area-impressao { position: absolute; top: 0; left: 0; width: 100%; }
```
Para:
```css
body * { display: none !important; }
.area-impressao, .area-impressao * { display: revert !important; }
.area-impressao { display: block !important; position: absolute; top: 0; left: 0; width: 100%; }
```
(Ordem das regras importa: a última, mais específica para `.area-impressao` sozinho, tem que vir
depois da regra `.area-impressao, .area-impressao *` para vencer em empate de especificidade por
ordem de declaração.)

**Rationale**: `visibility: hidden` retira o elemento da visão mas mantém o espaço que ele ocupa no
fluxo do documento — com a SPA inteira (sidebar, navbar, as 9 demais views, o backdrop do modal)
marcada como "invisível" mas ainda ocupando altura de página, o navegador tenta paginar essa altura
toda, gerando dezenas de páginas em branco antes do conteúdo real. `display: none` remove o
elemento do fluxo por completo — sem altura reservada, sem página extra. `display: revert` nos
descendentes de `.area-impressao` evita forçar `block` em elementos que precisam manter seu tipo
nativo de exibição (`<tr>`/`<td>` como `table-row`/`table-cell`, `<span>`/`<strong>` como `inline`)
— aplicar `block` a tudo indiscriminadamente quebraria o layout das tabelas dentro da própria
Ficha. `revert` tem suporte completo em navegadores Chromium (o ambiente real de uso desta aplicação Next.js,
já assumido pela decisão de página CSS nomeada da spec 016).

**Alternatives considered**:
- *Forçar `display: block !important` em todos os descendentes de `.area-impressao`* (leitura mais
  literal do pedido original, item 2) — rejeitado: quebraria a renderização das tabelas da Ficha
  (linhas/células viram blocos empilhados verticalmente em vez de grade tabular), um bug novo
  substituindo o bug antigo.
- *Manter `visibility` só para o DSA e criar uma segunda regra `display`-based exclusiva da Ficha*
  — rejeitado: duplicaria a lógica de "isolar para impressão" em 2 blocos paralelos fazendo a mesma
  coisa de formas diferentes, quando uma única correção do bloco compartilhado resolve os dois usos
  ao mesmo tempo (Princípio VI).

## 3. Nome de exibição e pasta do PDF

**Decision**: Frontend (`gerarPdfFichaClick`, ``app/(app)/instrutores/page.tsx`:1311`) passa a calcular o nome
de exibição antes de chamar `gs`:
```js
function gerarPdfFichaClick(idInstrutor) {
  if (!idInstrutor || !instrutorFichaAtual_) { alert('Instrutor não encontrado.'); return; }
  const nomeExibicao = formatarNomeInstrutor_(
    instrutorFichaAtual_.Posto_Graduacao, instrutorFichaAtual_.Esp_Hab_Obs,
    instrutorFichaAtual_.Nome_Completo, instrutorFichaAtual_.Nome_Guerra, false
  );
  gs('gerarFichaPDF', idInstrutor, nomeExibicao).then(url => window.open(url, '_blank'))
    .catch(e => alert(e && e.message ? e.message : e));
}
```
Backend (`gerarFichaPDF`, ``lib/acoes/instrutores.ts`:289`) ganha o parâmetro e uma função auxiliar de pasta:
```js
function pastaFichasInstrutores_() {
  var nome = 'Fichas dos Instrutores';
  var pastas = o Supabase Storage.getFoldersByName(nome);
  return pastas.hasNext() ? pastas.next() : o Supabase Storage.createFolder(nome);
}

function gerarFichaPDF(idInstrutor, nomeExibicao) {
  exigirFuncao(CRUD_CONFIG['instrutores'].leitura);
  var instrutor = lerAbaComoObjetos_('instrutores').filter(function (i) {
    return String(i['ID_Instrutor']) === String(idInstrutor);
  })[0];
  if (!instrutor) throw new Error('Instrutor não encontrado.');
  var nome = nomeExibicao || idInstrutor;
  var idTemplate = lerConfigParametros_()['ID_TEMPLATE_FICHA_INSTRUTOR'];
  if (!idTemplate) throw new Error('Template da Ficha não configurado em config_parametros.');

  var copia = o Supabase Storage.getFileById(idTemplate).makeCopy('Ficha - ' + nome);
  try {
    var doc = a rota de impressão `/print/*`.openById(copia.getId());
    var corpo = doc.getBody();
    Object.keys(MAPA_TAGS_FICHA_PDF).forEach(function (tag) {
      var valor = instrutor[MAPA_TAGS_FICHA_PDF[tag]];
      corpo.replaceText('{{' + tag + '}}', valor == null ? '' : String(valor));
    });
    doc.saveAndClose();

    var pdf = o Supabase Storage.getFileById(copia.getId()).getAs('application/pdf');
    var arquivoPdf = pastaFichasInstrutores_().createFile(pdf).setName('Ficha - ' + nome + '.pdf');
    return arquivoPdf.getUrl();
  } finally {
    o Supabase Storage.getFileById(copia.getId()).setTrashed(true);
  }
}
```

**Rationale**: `formatarNomeInstrutor_` já vive em `components/ciaara/` (frontend) e implementa as 4 regras
de círculo hierárquico de RF-INSTR-15 — Next.js não permite que `.ts` importe função de `.html`
(restrição já documentada em toda spec anterior), então computar no frontend e enviar como
parâmetro é a única forma de reaproveitar a formatação sem duplicar as 4 regras inteiras em
`lib/acoes/instrutores.ts`. `o Supabase Storage.getFoldersByName`/`createFolder` é o padrão idiomático do Next.js
para "pasta se existir, senão cria" — sem risco de duplicar pasta em chamadas subsequentes.
`nomeExibicao || idInstrutor` é a mesma degradação seg segura já usada em outros pontos do projeto
(nunca falha silenciosamente nem lança exceção por um parâmetro ausente).

**Alternatives considered**:
- *Backend recalcular o nome sozinho a partir de `instrutor['Nome_Completo']`* (mais simples, sem
  depender do frontend enviar nada) — rejeitado: perderia a formatação de posto/especialidade e as
  4 regras de círculo hierárquico já implementadas (o pedido original explicitamente quer "CMG
  (RM1) Antônio Ricardo Nunes Guimarães", não só o nome cru).
- *Duplicar as 4 regras de `formatarNomeInstrutor_` em `lib/acoes/instrutores.ts`* — rejeitado: haveria 2
  implementações da mesma regra de negócio (RF-INSTR-15) em arquivos diferentes, risco real de
  divergência futura (ex.: um ajuste na regra do círculo hierárquico feito só de um lado).
