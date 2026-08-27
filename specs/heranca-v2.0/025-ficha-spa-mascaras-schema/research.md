# Research — Hotfix e Nova Feature: Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

## 1. Ficha como 3ª view SPA (substitui o modal)

**Decision**: Adicionar um 3º painel, `painelFichaInstrutor`, irmão de `painelPrincipalInstrutores`/
`painelEdicaoInstrutor` dentro de `[data-view="tabInstrutores"]`, alternado pelo mesmo mecanismo
`style.display` já usado pelos outros 2 (`mostrarPainelEdicaoInstrutor_`/
`fecharPainelEdicaoInstrutor_`). O `<div id="modalFichaInstrutor" class="modal fade">` e
`renderizarModalFichaInstrutor_`/`abrirModalFichaInstrutor_` (spec 016/022/023/024) são removidos —
não deixados como código morto.

```js
function mostrarPainelFichaInstrutor_() {
  irPara('tabInstrutores');
  document.getElementById('painelPrincipalInstrutores').style.display = 'none';
  document.getElementById('painelEdicaoInstrutor').style.display = 'none';
  document.getElementById('painelFichaInstrutor').style.display = '';
}
function fecharPainelFichaInstrutor_() {
  document.getElementById('painelFichaInstrutor').style.display = 'none';
  document.getElementById('painelPrincipalInstrutores').style.display = '';
}
function abrirFichaInstrutor(idInstrutor) {
  const instrutor = instrutoresCarregados.find(i => String(i.ID_Instrutor) === String(idInstrutor));
  if (!instrutor) { alert('Instrutor não encontrado.'); return; }
  instrutorFichaAtual_ = instrutor;
  mostrarPainelFichaInstrutor_();
  renderizarFichaInstrutor_(instrutor);
}
```

O HTML interno de `renderizarFichaInstrutor_` adapta a grade de 12 colunas de
`ficha-cadastro-docente-template.html` (`SIS11/modelos/Ficha de Cadastro Docente.zip`) — mesmas 3
seções numeradas (Dados Pessoais/Profissionais/Complementares), mesmo cabeçalho institucional de 3
linhas maiúsculas (já implementado no modal pela spec 024, só migra de lugar), interpolação JS a
partir de `instrutor`/`disciplinasHabilitadasDoInstrutor_` no lugar de `{{TAG}}`.

**Rationale**: `painelPrincipalInstrutores`/`painelEdicaoInstrutor` já são o padrão estabelecido de
"SPA sem modal" nesta mesma tela desde a spec 017 — reaproveitar em vez de inventar um mecanismo de
view novo (`data-view` de topo, ou um framework de rota) é a definição de Princípio VI. Remover o
modal por completo (não só parar de usá-lo) evita o mesmo tipo de código morto que a spec 020 já
removeu (`criarVinculoHabilitacao`).

**Alternatives considered**:
- *Nova entrada de topo `<div data-view="tabFichaInstrutor">`, irmã das 10 já existentes em
  `app/layout.tsx`* — rejeitada: exigiria um item de menu novo na sidebar (fora do pedido, que só quer
  substituir o modal existente, acessível pelo mesmo botão "Ficha" da listagem) e uma navegação de
  volta mais complexa (a listagem já vive dentro de `tabInstrutores`, então "Voltar" precisaria
  trocar de `data-view` em vez de só alternar painel interno).

## 2. Redesenho do `@media print` compartilhado — window.print() volta a funcionar

**Decision**: Trocar a estratégia de "esconder tudo a partir de `body`, reverter só
`.area-impressao`" (spec 023) por "esconder só o chrome persistente da SPA, confiar no
`style.display` inline que `irPara`/os togglers de painel já mantêm corretamente". De
(``app/globals.css`:109-123`, estado atual):
```css
@media print {
  @page { size: landscape; }
  @page ficha-instrutor { size: portrait; }
  .area-impressao.ficha-instrutor { page: ficha-instrutor; }
  body * { display: none !important; }
  .area-impressao, .area-impressao * { display: revert !important; }
  .area-impressao { display: block !important; position: absolute; top: 0; left: 0; width: 100%; }
}
```
Para:
```css
@media print {
  @page { size: landscape; }
  @page ficha-instrutor { size: portrait; }
  .area-impressao.ficha-instrutor { page: ficha-instrutor; }
  nav.navbar, .sidebar-offcanvas, #overlay { display: none !important; }
  [data-view] * { visibility: hidden !important; }
  .area-impressao, .area-impressao * { visibility: visible !important; }
  .area-impressao { position: absolute; top: 0; left: 0; width: 100%; }
}
```

**Rationale**: `display: none` num ancestral remove a subárvore inteira do render tree — nenhum
`display` de um descendente consegue reverter isso (comportamento padrão de CSS, não uma
particularidade de navegador). Como o conteúdo impresso (`.area-impressao`) SEMPRE vive dentro de
`[data-view]`, por sua vez dentro de `<main>`, a regra `body * { display: none }` da spec 023
inevitavelmente aplica `display: none` a esses 2 ancestrais também — a spec 023 só "funcionou" no
sentido de não ter sido formalmente contestada porque ninguém testou a Ficha fora do modal nem o
DSA num navegador real depois dela (toda spec desde a 023 lista "teste de aceite ainda pendente").
A nova regra nunca aplica `display: none` a `[data-view]`/`<main>`/`body` — só ao chrome persistente
(`nav.navbar`/`.sidebar-offcanvas`/`#overlay`, elementos que NUNCA são ancestrais de
`.area-impressao`, então esconder eles é sempre seguro). Para isolar o conteúdo dentro da view/
painel ativo, volta a usar `visibility` (não `display`) exatamente pelo motivo oposto ao que levou a
spec 023 a trocar: um FILHO pode reverter `visibility: hidden` de um ancestral com
`visibility: visible` própria — o mecanismo funciona através de qualquer profundidade de
aninhamento, ao contrário de `display`. O problema real que motivou a spec 023
("`visibility: hidden` preserva o espaço ocupado") é resolvido do mesmo jeito de antes:
`.area-impressao { position: absolute; ... }` tira o elemento REVELADO do fluxo do documento — as
demais 9 views/2 painéis continuam ocupando espaço (invisível) no fluxo, mas como
`[data-view] > *:not(.area-impressao)` está `visibility: hidden` (não `display: none`), o
comportamento de paginação depende só da altura do conteúdo realmente impresso, não da altura da
SPA inteira — o mesmo resultado prático que `display: none` entregaria, sem o efeito colateral do
ancestral-bloqueado. Corrige ao mesmo tempo o `window.print()` da Ficha (agora fora do modal, mas
ainda dentro de `[data-view]`) e — como efeito colateral bem-vindo, não como objetivo desta spec —
o mesmo risco estrutural que a impressão do DSA carregava sem nunca ter sido verificada num
navegador desde a spec 023.

**Alternatives considered**:
- *Manter `display: none`/`revert` e usar `:has()` para preservar ancestrais* (`body >
  *:not(:has(.area-impressao)) { display: none !important; }`) — rejeitada: `:has()` é suportado
  nos navegadores Chromium do ambiente real desta aplicação Next.js, mas introduz uma seletor mais complexo e
  menos legível para o mesmo resultado que a técnica `visibility` já entrega com sintaxe mais
  simples e sem depender de um recurso de CSS relativamente recente (Princípio III, postura
  conservadora de plataforma).
- *Adicionar JS que move `.area-impressao` para fora da hierarquia da SPA antes de `window.print()`
  e volta depois* — rejeitada: manipulação de DOM frágil (risco de perder listeners/estado),
  exatamente o tipo de solução que a spec 024 já rejeitou para o caso do modal.

## 3. Reorganização das abas — Sistema e painéis de Disciplinas só na Aba 3

**Decision**: Em `renderizarPainelEdicaoInstrutor_`, mover a montagem de `blocosForaDeAbaHtml`
(bloco "Sistema") e as chamadas de `disciplinasHabilitadasHtmlInstrutor_`/
`painelAtribuicaoDisciplinasHtmlInstrutor_` para dentro do `tab-pane` da tabela `'complementares'`, em
vez de depois de `<div class="tab-content">`. De (``app/(app)/instrutores/page.tsx`:1060-1076`, atual):
```js
const panesHtml = ABAS_EDICAO_INSTRUTOR.map((a, i) => {
  const blocosDaAba = BLOCOS_EDICAO_INSTRUTOR.filter(b => b.aba === a.aba).map(cardBloco).join('');
  return `<div class="tab-pane fade${i === 0 ? ' show active' : ''}" id="abaInstrutor-${a.aba}" role="tabpanel">${blocosDaAba}</div>`;
}).join('');
const blocosForaDeAbaHtml = BLOCOS_EDICAO_INSTRUTOR.filter(b => !b.aba).map(cardBloco).join('');
...
painel.innerHTML = `... <div class="tab-content mb-3">${panesHtml}</div>
  ${blocosForaDeAbaHtml}
  ${disciplinasHabilitadasHtmlInstrutor_(instrutor)}
  ${painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)} ...`;
```
Para:
```js
const panesHtml = ABAS_EDICAO_INSTRUTOR.map((a, i) => {
  const blocosDaAba = BLOCOS_EDICAO_INSTRUTOR.filter(b => b.aba === a.aba).map(cardBloco).join('');
  const extraDaAba3 = a.aba === 'complementares'
    ? blocosForaDeAbaHtml + disciplinasHabilitadasHtmlInstrutor_(instrutor) + painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)
    : '';
  return `<div class="tab-pane fade${i === 0 ? ' show active' : ''}" id="abaInstrutor-${a.aba}" role="tabpanel">${blocosDaAba}${extraDaAba3}</div>`;
}).join('');
...
painel.innerHTML = `... <div class="tab-content mb-3">${panesHtml}</div> ...`;
```
`blocosForaDeAbaHtml` continua vindo de `BLOCOS_EDICAO_INSTRUTOR.filter(b => !b.aba).map(cardBloco)`
(o bloco "Sistema", sem `aba`) — só o PONTO de inserção muda, de fora do `tab-content` para dentro
do `tab-pane` de `'complementares'`, preservando-o como card avulso (Clarifications 2026-08-19).
Título do bloco (`BLOCOS_EDICAO_INSTRUTOR`, linha 825) muda de `'Sistema (somente leitura)'` para
`'Sistema'`.

**Rationale**: Nenhum campo é duplicado hoje (achado real, spec.md) — o sintoma relatado é
visual (conteúdo aparece "embaixo" de qualquer aba escolhida). Mover o ponto de concatenação do HTML
resolve o sintoma sem duplicar `BLOCOS_EDICAO_INSTRUTOR`/as 2 funções de painel de disciplinas.

**Alternatives considered**: nenhuma — mudança mecânica direta, sem trade-off real.

## 4. Migração de schema — remover `Instrutor_Completo`, adicionar `Endereco_Estado`

**Decision**: Um único script Python (`migracao/remover_instrutor_completo_adicionar_estado.py`),
mesmo padrão de `migracao/remover_coluna_ultima_avaliacao_desempenho.py` (spec 016) — backup do
arquivo `.xlsx` de trabalho antes de qualquer mudança, remove a coluna `Instrutor_Completo` de
`instrutores`, adiciona a coluna `Endereco_Estado` (texto livre, 2 caracteres) ao final do
cabeçalho, registra 2 linhas novas em `migracao_log` (`Acao='Remocao_Coluna'`/`'Adicao_Coluna'`).
Código: `COLUNAS_FORMULA['instrutores']` (``lib/acoes/crud.ts`:43`) perde `'Instrutor_Completo'` da lista
(fica só `['Carga_Horaria_Ministrada_Ano']`); `BLOCOS_EDICAO_INSTRUTOR` (``app/(app)/instrutores/page.tsx`:827`)
perde a linha do campo `Instrutor_Completo`; o bloco de Endereço ganha um novo campo
`{ chave: 'Endereco_Estado', rotulo: 'Estado', tipo: 'dropdown-uf' }` (tipo novo, ver contracts/).

**Rationale**: Achado real (spec.md) — `Instrutor_Completo` é fórmula nativa sem nenhum outro
consumidor de código; remover é seguro para a aplicação, só exige o protocolo padrão de migração
(Princípio IV) porque é uma alteração de schema real. As 2 operações (remover + adicionar) cabem no
mesmo script/mesma migração porque são a mesma unidade de trabalho pedida ("limpar e adicionar
campos" no mesmo item do pedido original), evitando 2 scripts órfãos para uma única intenção.

**Alternatives considered**:
- *Manter `Instrutor_Completo` no banco, só escondê-la do formulário* — rejeitada: o pedido é
  explícito ("Remova COMPLETAMENTE"), e manter uma coluna morta na banco de produção contradiz a
  intenção de limpeza declarada.

## 5. Máscaras de CPF/CEP/Telefone/RETELMA

**Decision**: 4 funções puras novas em `app/(app)/instrutores/page.tsx`, mesmo padrão de `mascaraNip_`
(``app/(app)/instrutores/page.tsx`:611`) — mantêm só dígitos, inserem separadores conforme a posição:
```js
function mascaraCpf_(valorDigitado) {
  const digitos = String(valorDigitado || '').replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d{2})$/, '$1-$2');
}
function mascaraCep_(valorDigitado) {
  const digitos = String(valorDigitado || '').replace(/\D/g, '').slice(0, 8);
  return digitos.replace(/^(\d{5})(\d)/, '$1-$2');
}
function mascaraTelefone_(valorDigitado) {
  const digitos = String(valorDigitado || '').replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) return digitos.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  return digitos.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
}
function mascaraRetelma_(valorDigitado) {
  const digitos = String(valorDigitado || '').replace(/\D/g, '').slice(0, 10);
  if (digitos.length <= 8) return digitos.replace(/^(\d{4})(\d)/, '$1-$2');
  return digitos.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
}
```
**Achado real durante a implementação**: o pedido original descrevia RETELMA como "formato de 4
dígitos - 4 dígitos, ex: `(00) 0000-0000`" e "8 dígitos" — mas `(00) 0000-0000` soma 10 dígitos (2
do prefixo entre parênteses + 4+4 do número), não 8; corrigido para `slice(0, 10)`/limiar de 8
dígitos (sem prefixo) vs. mais de 8 (com prefixo de 2 dígitos), mantendo os dois formatos do próprio
exemplo do pedido internamente consistentes (FR-007, spec.md).
Os 4 campos ganham `tipo: 'texto-mascarado-generico'` em `BLOCOS_EDICAO_INSTRUTOR`, com uma chave
`mascara` apontando para a função correspondente — `renderizarCampoEdicaoInstrutor_` generaliza o
bloco `if (campo.tipo === 'texto-mascarado')` já existente para aceitar a função por parâmetro em
vez de chamar `mascaraNip_` fixo, evitando 4 blocos `if` quase idênticos.

**Rationale**: Reaproveita 100% do padrão já usado e testado por `mascaraNip_` — mesma técnica
(regex sequenciais sobre string só-dígitos, `oninput` chamando a função e reatribuindo `this.value`)
sem introduzir uma biblioteca de máscara nova (Princípio III). Generalizar
`renderizarCampoEdicaoInstrutor_` para receber a função de máscara por parâmetro evita duplicar o
bloco de renderização 4 vezes.

**Alternatives considered**:
- *Biblioteca de máscara de terceiros (ex.: IMask, Cleave.js)* — rejeitada: dependência nova sem
  necessidade, quando o padrão `mascaraNip_` já resolve o mesmo problema há 2 specs sem nenhum
  relato de bug.
