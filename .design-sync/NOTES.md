# design-sync — notas do CIAARA-11 v2.1

Sincroniza o design system do sistema (tokens do Tailwind v4 em `app/globals.css`, `components/ui`
shadcn/Radix e `components/ciaara`) com o projeto «CIAARA-11 DS» do Claude Design.

## Como este repositório é sincronizado

- **Não é uma biblioteca com `dist/`**: é o aplicativo Next.js. O "pacote" do sync é
  `.design-sync/pacote/` — `package.json` + `index.ts`, que só reexporta `components/ui/*` e
  `components/ciaara/*`. O conversor roda com `--entry ./.design-sync/pacote/index.ts`.
- **`SePodeVer` fica FORA**: importa `lib/autorizacao/matriz`, que é `server-only` (supabase de
  servidor). `components/casca` (depende do roteador do Next) e `components/graficos` (Recharts)
  também ficam fora do sync por escopo.
- **CSS**: Tailwind v4 precisa ser compilado. `cfg.buildCmd` = `node .design-sync/pacote/compilar-css.mjs`
  gera `.design-sync/pacote/ciaara.css` (não versionado) com o `@tailwindcss/postcss` e o `postcss`
  que o projeto já tem. **Rode-o antes do `package-build.mjs` em todo re-sync.**
- **Fonte**: Rawline auto-hospedada (`public/fontes/`, OFL-1.1). `fontes.css` declara o
  `@font-face`, e o CSS compilado define `--fonte-rawline: "Rawline"` (no app quem define é o
  `next/font` no `<html>`).
- **Ferramentas do conversor**: `esbuild` e `ts-morph` instalados SÓ em `.ds-sync/` (autorizado por
  Bernardo Villas Boas em 07/10/2026; fora do `package.json` e do `pnpm-lock`). O Playwright é o
  1.62.1 do projeto, ligado por junção: `.ds-sync/node_modules/playwright` →
  `node_modules/.pnpm/playwright@1.62.1/node_modules/playwright` (Chromium 1234 já em cache).
- **Fora do git sem mexer no `.gitignore`**: `.ds-sync/`, `ds-bundle/`, `.design-sync/.cache/`,
  `.design-sync/learnings/`, `.design-sync/node_modules` e `.design-sync/pacote/ciaara.css` estão em
  `.git/info/exclude` (local). Numa máquina nova, repita as linhas lá.
- **Os comandos, na ordem** (da raiz do repositório):

  ```
  node .design-sync/pacote/compilar-css.mjs
  node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/pacote/index.ts --out ./ds-bundle
  node .ds-sync/package-validate.mjs ./ds-bundle
  ```

- ⚠️ **O `.git/info/exclude` esconde os artefatos do git, NÃO do `prettier` nem do `eslint`.** Medido
  em 08/10/2026, com eles presentes: `pnpm format:check` reprovou 351 arquivos (`ds-bundle/` 256,
  `.design-sync/.cache/` 68, `.ds-sync/` 26, `pacote/ciaara.css` 1) e `pnpm lint` reprovou 43
  (`ds-bundle/` 40, `.ds-sync/` 3) — nenhum deles versionado. **No fim de todo sync, apague
  `ds-bundle/`, `.ds-sync/`, `.design-sync/.cache/`, `.design-sync/learnings/` e
  `pacote/ciaara.css`**, senão o `pnpm verificar` local fica vermelho com o CI verde. O próximo sync
  recria tudo; quem garante que componente sem mudança não precisa ser reverificado é o
  `_ds_sync.json` enviado ao projeto, não o `.cache/`.
- ⚠️ **Tire a junção do Playwright ANTES do apagar recursivo**, com
  `[System.IO.Directory]::Delete("<raiz>\.ds-sync\node_modules\playwright", $false)` no PowerShell:
  um apagar recursivo que atravesse a junção apaga o Playwright **real** do projeto. Dentro do
  OneDrive, `dir /AL` lista também os arquivos-placeholder; o que identifica link é o `LinkType`.
- **Reinstalar no próximo sync**: `esbuild` e `ts-morph`, do mesmo jeito isolado em `.ds-sync/`. A
  forma isolada foi a autorizada em 07/10/2026; qualquer outra dependência pede autorização nova.

## Armadilhas medidas

- **Tabela densa tem `min-w-[64rem]` abaixo de `lg`** (1024px): numa janela menor ela rola na
  horizontal e as últimas colunas somem da captura. Componentes largos levam
  `overrides.<Nome> = {"cardMode": "column", "viewport": "1200x520"}`.
- Sobreposições (Dialog, AlertDialog, DropdownMenu, Popover, Tooltip, DialogoConfirmacao) levam
  `{"cardMode": "single", "viewport": "900x620"}` para o estado aberto caber no cartão.
- `[FONT_MISSING] "Cascadia Mono"`: é da pilha monoespaçada **do sistema** (`--font-mono`); o app em
  produção também não embarca fonte mono. Não é substituição — é o comportamento real.
- ⚠️ **Formate as prévias ANTES da primeira captura.** O CI roda `prettier --check .` e `eslint`
  sobre `.design-sync/` (a pasta não é ignorada, e o `.prettierignore` e o `eslint.config.mjs` são do
  sistema — não se mexe neles por causa do sync). Formatar **depois** da nota muda a chave de fonte
  da prévia e apaga a nota: em 08/10/2026, 14 notas caíram assim, depois do envio.

  ```
  pnpm exec prettier --write .design-sync/config.json .design-sync/NOTES.md .design-sync/conventions.md .design-sync/previews .design-sync/pacote/index.ts .design-sync/pacote/package.json .design-sync/pacote/fontes.css .design-sync/pacote/compilar-css.mjs
  ```

- **A reverificação depois de formatar foi por comparação de bytes, e ela tem limite.** Das 48
  células recapturadas, 40 saíram idênticas byte a byte; as outras 8 foram vistas uma a uma. Seis
  delas **variam entre duas capturas do MESMO build** (medido em 08/10/2026): `EsqueletoTabela`
  (o pulso do esqueleto), `AvisosRecolhiveis` (Aberto, QuadroDaTurma), `BotaoLimparFiltros`
  (ComFiltroAplicado), `FiltroAvancado` (ComFiltrosAtivos) e `TabelaDensa` (Padrao). Para essas,
  igualdade de bytes não é instrumento: olhe a imagem.
- O `prettier-plugin-tailwindcss` reordena classes, e por isso a prévia compilada muda sem que a tela
  mude; formatação só de espaço não muda o `_preview/*.js` (o esbuild reimprime a partir da árvore).

## Known render warns

- `[FONT_MISSING] "Cascadia Mono"` — ver acima.

## Técnicas de prévia (lotes A–D, 07/10/2026)

- **Classe usada só em prévia**: o Tailwind não varre a pasta oculta `.design-sync/` (nem com
  `@source`); `compilar-css.mjs` passa as classes das prévias por `@source inline(...)`. Rode-o de novo
  depois de escrever ou mudar prévia, e antes do `package-build.mjs`.
- **Estado aberto sem propriedade** (ex.: `AvisosRecolhiveis`): um `useEffect` aciona o próprio botão
  ao montar. **Dica do Radix aberta**: `element.focus()` num `useEffect` (o tooltip abre no foco).
- **Sem `<input type="date">`** em prévia: o Chromium da captura é en-US e mostraria `mm/dd/aaaa`.
- **Campos do pacote, nunca nativos**: o traço de campo do sistema é o de `Input`/`SelectTrigger`.
- **Modal aberto zera o padding do `<body>`** (trava de rolagem do Radix: `body[data-scroll-locked]`
  reescreve o padding): a composição de fundo das prévias de Dialog/AlertDialog leva o próprio `p-6`.
- **Foco automático do Radix seleciona o texto do campo já preenchido**: na história do estado
  pós-recusa, `onOpenAutoFocus={(e) => e.preventDefault()}`.
- **Cartão `single` mostra a PRIMEIRA exportação em ordem alfabética** (o esbuild ordena): a história
  canônica tem nome que cai primeiro, ou declare `overrides.<Nome>.primaryStory`.
- **Quem trava a rolagem** (e zera o padding do body do cartão em grade): Select aberto,
  DropdownMenu (modal por padrão), Dialog, AlertDialog, DialogoConfirmacao. Popover não. Contorno:
  invólucro `p-6` na história; no cartão em grade do produto o recuo some enquanto a lista está aberta.
- **`ds-bundle/styles.css` só faz `@import`**: conferência de classe é contra `_ds_bundle.css`.
- **Datas inequívocas**: dia igual ao mês, em dia útil (o Chromium da captura roda em pt-BR, medido
  pelo lote B; o lote C mediu en-US em `<input type="date">` — por isso nenhuma prévia usa esse campo).
- **Popover não é modal** (SeletorInstrutor, FiltroAvancado abertos ficam bem em grade); **Select
  aberto é modal** e por isso o `SeletorTurma` tem cartão `single` com `primaryStory: "Aberta"`.
- **`ProvedorDeTema` não aceita tema forçado**: a prévia do tema escuro aplica a classe `dark` num
  contêiner (os papéis de cor são `@theme inline`, redefinidos sob `.dark`).
- **Nomes de exemplo**: só fictícios, conferidos contra a base da v2.0 (0 ocorrência). A vitrine tem
  nomes reais — dela se porta a composição, nunca o nome.
- **A folha reduzida engana na cor**: confira em `ds-bundle/_screenshots/review/raw/` antes de
  reprovar por tonalidade.

## Achados no sistema — listados pelo sync, NÃO consertados (decisão do responsável)

1. `BadgeTeto` escreve o número cru: `medido: 7.4` sai «7.4%» (ponto decimal).
2. A vitrine (`app/estilo/amostras.tsx`, `TETOS_DA_AMOSTRA`) expande TAD como «Trabalho Acadêmico
   Dirigido» e TR como «Trabalho de Recuperação» — o glossário diz Tempo para a Administração e Tempo
   Reserva. As prévias seguem o glossário.
3. Três traços de campo no app: `Input`/`SelectTrigger` usam `border-texto-tenue`; 11 arquivos de
   `app/` (inclusive o login) usam `border-borda-forte` em campo nativo; 4 formulários usam `<select>`
   nativo com `border-borda`. Contradiz `lib/design/vocabulario.ts:211` (pendência B-2).
4. `AvisosRecolhiveis` tem `id="lista-de-avisos"` fixo: duas instâncias na mesma página repetem o id.
5. A vitrine mostra «Turmas ativas: 29» (a base tem 28) e contagens de aviso que não fecham com a lista.
6. `CardKpi`: a seta indica «favorável», não a direção do número («↗ −5»). É por desenho.
7. `Label` é `flex gap-2`: um `<strong>` dentro dele vira item separado («instrutor, 1042 , para
   confirmar») — visível hoje em `app/(app)/instrutores/[codigo]/ExcluirInstrutor.tsx:98-100`.
8. `Alert` destrutivo: a `AlertDescription` fica cinza sobre o fundo de conflito (legível).
9. `FiltroAvancado`, campo de intervalo: o `<legend>` não recebe o `gap-1` e encosta nos campos; o
   gatilho da escolha múltipla é h-8 ao lado de campos h-9.
10. `FiltrosDoCatalogo` manda sempre `situacao: ["ativo"]`, que entra na contagem: «Filtros 1» em
    `/cursos` limpo com «Limpar filtros» oculto (lido no código, não visto na tela).
11. `SeletorInstrutor`: o P/G `SCNS` (servidor civil) não está na escala de 12 postos e cai no aviso
    de posto fora da escala (não medido se a base real usa `SCNS`).
12. `GradeDsa`/`montarSemana` sem relógio: toda célula vira `sem_relogio` e os lançamentos COM tempo
    de aula não são desenhados na grade numerada (nem vão para «Sem posição»). Medido em
    `lib/dominio/dsa/grade.ts`, `estadoDa`, linha 229.

## Re-sync risks

- ⚠️ **`pacote/index.ts` lista os arquivos À MÃO**: componente novo em `components/ui/` ou
  `components/ciaara/` só entra no sync depois de ganhar a linha `export * from …` ali. Nenhum
  portão acusa a falta — o componente simplesmente não aparece no Claude Design.
- 59 subcomponentes estão no **cartão-piso**, sem prévia própria — todos são partes de um dos 36
  componentes com prévia (Card, Dialog, AlertDialog, Select, Table, Tooltip…; `CelulaNavegavel` é de
  `ListaNavegavel`). Funcionam no `_ds_bundle.js`; o que falta é o cartão. Ganham prévia em qualquer
  re-sync.
- O sync escreve **só** no projeto «CIAARA-11 DS». As telas no canvas («SIS11 — Telas») são outro
  projeto, criado pelo `/design`, e o sync não toca nele.
- `ciaara.css` depende da detecção automática de fontes do Tailwind (varre o repositório): classe
  nova usada só em prévia aparece; classe que ninguém usa no app NÃO existe no CSS.
- Os tons de status e papéis vêm de `lib/design/vocabulario.ts` + `app/globals.css`; mudança de token
  exige rodar `compilar-css.mjs` e reconstruir.
- A versão do Playwright está presa à do projeto (1.62.1) pela junção; se o projeto subir de versão,
  refaça a junção apontando para a nova pasta em `.pnpm`.
