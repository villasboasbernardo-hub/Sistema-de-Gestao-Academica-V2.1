# Contrato — a lateral recolhível (PR 1)

> O que a casca promete a quem a usa, a quem a testa e a quem a mantém. Tudo aqui é verificável por
> seletor, atributo ou cookie — e é por isso que está escrito como contrato, não como descrição.

## 1. Estrutura no DOM (o que não muda, e o que a suíte já cobra)

| Promessa | Como se vê | Quem cobra hoje |
|---|---|---|
| **Um** `<nav aria-label="Navegação principal" data-slot="navegacao-lateral">`, nos dois estados e nos dois tamanhos de tela | `getByRole("navigation", { name: "Navegação principal" })` → `toHaveCount(1)` | `acessibilidade.spec.ts:226`, `conta-de-teste.ts:247-250` |
| O `<nav>` é **visível** recolhido (largura > 0, nunca `display:none` acima de `lg`) | `toBeVisible()` logo após `entrar()` | `conta-de-teste.ts:247-250` — **toda a suíte autenticada trava se isto falhar** |
| **Um `<li>` por entrada**, sem lista duplicada para os dois estados | `getByRole("listitem")` → `toHaveCount(MENU.length)` | `shell.spec.ts:29` |
| **Um** `[aria-current="page"]`, no `<a>`, com `data-entrada={rota}` | `'[data-slot="navegacao-lateral"] [aria-current="page"]'` → 1 | `shell.spec.ts:48-50` |
| O nome acessível de cada link é **exatamente o rótulo** nos dois estados | `getByRole("link", { name: "Cursos", exact: true })` | seis arquivos de e2e |
| A primeira parada de `Tab` continua sendo o atalho *"Pular para o conteúdo"* | `page.keyboard.press("Tab")` → `:focus` com esse texto | `acessibilidade.spec.ts:185-194` |
| Entrada sem tela segue como `<span aria-disabled="true">` com etiqueta *"em breve"* | `data-entrada` + texto | `shell.spec.ts`, D-NAV-1 preserva a MENU-2 |

## 2. Estado — um atributo, três fontes de verdade que coincidem

| Atributo | Onde | Valores | Quem escreve |
|---|---|---|---|
| `data-fixada` | no `<nav>` | `"true"` · `"false"` | o **servidor**, na primeira pintura, a partir do cookie; a folha, ao acionar o controle |
| `aria-pressed` | no controle de fixar | `"true"` · `"false"` | igual a `data-fixada` |
| cookie `ciaara-lateral` | navegador | `fixada` · `recolhida` | a folha, por `document.cookie` |

**Invariante:** a cada instante, `data-fixada === aria-pressed === (cookie === "fixada")`. O e2e lê os
três.

## 3. Comportamento acima de `lg` (≥ 1024px)

⚠️ **ESTA TABELA FOI EMENDADA EM 05/10/2026, na conferência de Bernardo.** O texto de 04/10 está
abaixo dela, datado, porque é contra ele que a mudança se lê — e porque **duas das linhas antigas
descreviam o defeito**, não o comportamento pretendido.

| Situação | Largura | Rótulos | Mecanismo |
|---|---|---|---|
| Padrão (sem cookie, ou `recolhida`) | `w-14` | `sr-only` (no DOM, invisíveis) | classe estática |
| Ponteiro sobre o `<nav>`, **com o apontar livre** | `w-56` | visíveis | `lg:data-[apontar=livre]:hover:` — **CSS**, com porteiro |
| Foco numa **ENTRADA** (teclado) | `w-56` | visíveis | `lg:has-[[data-entrada]:focus-visible]:` — **CSS** |
| Foco no **botão de fixar** | fica `w-14` | somem | ele é legível recolhido, e expandir ao recebê-lo faria o `Tab` alargar o menu para atravessá-lo |
| `data-fixada="true"` | `w-56` | visíveis | `data-[fixada=true]:` — e o cookie faz isto sobreviver à navegação |
| **Desafixar com o ponteiro dentro** | volta a `w-14` **na hora** | somem | `apontarBloqueado` liga no clique e o `:hover` deixa de expandir |
| Afastar o ponteiro | volta a `w-14`, e o apontar **rearma** | somem | `onPointerLeave` do `<nav>` desliga o bloqueio |

**Altura e posição:** `lg:sticky lg:top-0 lg:h-dvh`, com `lg:overflow-x-hidden lg:overflow-y-auto`.
Os ícones ficam na tela em qualquer rolagem; o eixo horizontal é recortado para o rótulo de 224 px
não produzir barra na lateral de 56 px. O bloco contêiner do `sticky` é o `<div>` do painel, que
**MUST** continuar sem `overflow` — um `overflow` ali prenderia a lateral à caixa dele, sem erro.

Transição: `transition-[width] duration-150 motion-reduce:transition-none`. O conteúdo (`<main>`)
ocupa o restante — o ganho de área útil do `SC-001` sai daqui.

> **O texto de 04/10/2026, superado:** *ponteiro sobre o `<nav>` → `w-56` por `lg:hover:`; foco
> **dentro** do `<nav>` → `w-56` por `lg:focus-within:`; afastar o ponteiro ou sair com `Tab` →
> volta a `w-14` pela ausência de `:hover`/`:focus-within`; altura `lg:h-full`.* ⚠️ **As duas
> primeiras linhas eram o defeito:** `:focus-within` casa com o **botão de fixar**, que vive no
> mesmo `<nav>`, e um clique nele deixa `:hover` **e** foco verdadeiros — então desafixar não
> recolhia. E `lg:h-full` é a altura da **linha** do flex, que numa página longa é a altura do
> conteúdo: a lateral rolava para fora da tela.

## 4. Comportamento abaixo de `lg` (< 1024px)

**Nada muda em relação a hoje.** Botão `Menu` (`lg:hidden`, `aria-expanded`, `aria-controls`), painel
`hidden`/`block`. Nenhuma das classes `lg:hover:`/`lg:focus-within:`/`data-[fixada]` se aplica — o
`FR-006` sai da **ausência** de variante, não de uma condição em JavaScript. O cookie pode existir e
não tem efeito.

## 5. O controle de fixar

```html
<button type="button" aria-pressed="false" data-slot="fixar-lateral">
  <PanelLeftOpenIcon aria-hidden="true" />        <!-- PanelLeftCloseIcon quando fixada -->
  <span class="sr-only">Fixar menu expandido</span><!-- "Recolher menu" quando fixada -->
</button>
```

- Vive **dentro** do `<nav>` e **antes** da lista, no **topo**, sempre visível *(decisão de
  Bernardo, 05/10/2026)*. ⚠️ **O texto anterior dizia *"depois da lista, para não entrar na ordem de
  tabulação antes do atalho"*, e a razão era falsa — medida no mesmo dia:** o atalho *"Pular para o
  conteúdo"* é renderizado em `casca-do-app.tsx`, **fora e antes** do `<nav>`, e entre os dois ainda
  há o cabeçalho com dois controles focáveis. O botão no topo é a primeira parada **dentro da
  lateral**, nunca a primeira da aplicação — e é por isso que focá-lo **não** expande.
- Único lugar com `Tooltip` (D3): o rótulo é um ícone. O `TooltipContent` vai por `Portal` — fora do
  `<nav>`, o que não afeta `getByRole("listitem")`.
- Acionar: alterna `data-fixada` e `aria-pressed`, grava o cookie, **não navega e não recarrega**.
  Na navegação seguinte o servidor já lê o cookie e renderiza certo.

## 6. Ícones

Cada `<a>` leva `<Icone aria-hidden="true" class="size-4 shrink-0" />` seguido do `<span>` com o
rótulo. O mapa `NomeDeIcone → lucide` é único (`components/casca/icones-do-menu.tsx`); ícone à mão
(`<path`, `d="M`) é proibido por `fronteira-componentes`.

## 7. Como se prova (os seletores do e2e novo, `tests/e2e/lateral.spec.ts`)

1. **Nasce recolhida:** após `entrar()`, `nav` com `data-fixada="false"`; a caixa do `nav` tem largura
   `< 100px`; `getByRole("link", { name: "Cursos", exact: true })` **existe** (nome acessível) e o
   rótulo visível tem `toHaveCount(0)` fora do hover.
2. **Expande ao apontar e recolhe ao afastar:** `nav.hover()` → largura `> 200px` e rótulo visível;
   `page.mouse.move(600, 400)` → largura `< 100px`. **Sem clique.**
3. **Fixar persiste:** clicar `[data-slot="fixar-lateral"]` → `aria-pressed="true"`, cookie
   `ciaara-lateral=fixada` (`context.cookies()`); navegar por clique para outra entrada → ainda
   `data-fixada="true"`; `page.reload()` → `data-fixada="true"` **na primeira escrita do atributo**
   (`addInitScript` + `MutationObserver`, como `tema.spec.ts:137-165`); clicar de novo → `false`,
   cookie `recolhida`, e a próxima tela abre recolhida.
4. **Teclado:** `Tab` até a lateral → largura `> 200px` (`focus-within`); todas as entradas
   disponíveis e o controle recebem foco; `aria-current` presente **sem depender de cor**.
5. **Tela estreita:** `page.setViewportSize({ width: 800, height: 900 })` → botão `Menu` visível,
   `nav` oculto até clicar, `hover` no `nav` **não** o expande; `data-fixada` sem efeito.
6. **Ordem:** os `data-entrada` dos `<li>`, em ordem, são `/inicio`, `/cursos`, `/turmas`,
   `/disciplinas`, `/instrutores`, `/cronograma`, `/atividades`, `/admin/usuarios` — e os dois sem
   tela trazem *"em breve"*. *(No PR 1 a entrada `/turmas` ainda não existe; o caso nasce com sete e
   ganha a oitava no PR 2 — a ordem relativa já é a da D-NAV-1 desde o PR 1.)*
