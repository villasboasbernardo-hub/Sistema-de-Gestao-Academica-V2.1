# Contrato das telas — Bloco 4

## `/inicio`

- Parâmetros: `classificacao`, `modalidade` (como hoje) e **`ano`** (texto, padrão `""` = o ano vigente; `substitui`;
  avisa o servidor).
- Ordem: título → **seletor de ano** (o mesmo `AnoDoPainel` de `/turmas`, com `rota="/inicio"`: `data-slot="ano-do-painel"`, botões `ano-do-painel-opcao` com `data-ano` e `aria-pressed`) → filtro de recorte →
  alertas → números do ano (`data-ano`) → **Turmas de <ano>** (carrossel) → **DSA da semana** (carrossel).

### O carrossel (`components/ciaara/carrossel.tsx`)

- `section[aria-roledescription="carrossel"][aria-label]`, `data-slot="carrossel"`, `data-passando="true|false"`.
- Trilho `data-slot="trilho-do-carrossel"` (rolagem horizontal com encaixe), itens `role="group"`,
  `aria-roledescription="slide"`, `aria-label="N de M"`, `data-slot="item-do-carrossel"`, `data-atual`.
- Botões `data-slot="carrossel-anterior"`, `carrossel-proximo`, `carrossel-pausar` (*Pausar*/*Continuar*,
  `aria-pressed`). Com um item só, sem botões e sem movimento.

### O cartão da turma (`data-slot="cartao-da-turma"`, `data-turma`)

Link para a aba Grade do curso com a turma; dentro: curso · turma, nome e ano, situação, `BarraDeProgresso` (percentual),
`executada/prevista TA`, *em atraso*. Abaixo, fora do link: *DSA da semana →* ou o aviso de EAD.

### A manchete do DSA (`data-slot="manchete-do-dsa"`, `data-turma-da-manchete` — o `data-turma` é só do cartão, que os percursos procuram na página inteira)

*Semana do curso N de T* (`data-slot="semana-do-curso-da-manchete"`), turma e curso, datas da semana, o resumo
(`data-slot="resumo-do-dsa"`, `data-ta`, `data-dias`) e o link *Abrir o DSA* (`data-slot="abrir-o-dsa-da-manchete"`).
Sem turma: `data-slot="sem-dsa-na-semana"`.

## A lateral

Ao lado de *Cursos* e *Turmas*: botão `data-slot="expandir-submenu"` (`aria-expanded`, `aria-controls`, rótulo
*"Abrir os cursos"*/*"Abrir as turmas"*). Sublistas `data-slot="submenu"`; grupos (classificação, curso) com o mesmo botão;
links `data-subentrada="<rota>"`, com `aria-current="page"` no ativo. Só aparecem com a lateral expandida; na gaveta do
celular, sempre.
