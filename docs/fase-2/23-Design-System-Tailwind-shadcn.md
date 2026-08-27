---
title: "CIAARA-11 v2.1 — Design System: Tailwind v4 + shadcn/ui (Fase 2, documento 23)"
author: "Arquiteto Chefe de Software — CIAARA-11 / Departamento de Ensino"
date: "26/08/2026"
version: "2.1"
origem: "BRIEF-v2.1 §5 · RF-DS-01..05 e RF-DS-03.1 (documento 02) · RNF-USA-01..07, RNF-COMP-01..03, RNF-MAN-03 (documento 03) · docs/arquitetura/03-design-system.md (v2.0) · Épico 4 (documento 06)"
---

# Design System — Tailwind v4 + shadcn/ui

**Status:** Fase 2 — Arquitetura · **Precede:** Épico 4 (Design System + shell), Épicos 10 e 11 (impressão)
**Artefatos:** `app/globals.css` · `app/print/print.css` · `components/{ui,ciaara,graficos,impressao}/`

> Este documento é a **ponte** entre o Design System da v2.0 — objeto global `UI`, Bootstrap 5 via
> CDN, variáveis CSS herdadas da v1.0 — e o da v2.1, sobre Tailwind CSS v4 e shadcn/ui. Ele não
> reabre nenhuma decisão de identidade visual: a paleta institucional, o sistema de três níveis de
> alerta e o vocabulário de status atravessam a migração intactos. O que muda é **o mecanismo pelo
> qual eles são declarados, distribuídos e verificados**.

---

## 0. Nota de migração (v2.1)

### 0.1 `RF-DS` é preservado; o mecanismo muda

`RF-DS-01` exige "um único ponto central do qual todas as telas obtêm cores, tipografia,
espaçamento e estados visuais". Na v2.0 esse ponto é o **objeto global `UI`** (`_Estilos.html` +
`UI.js` incluído por `_Comum.html`), lido em tempo de execução. Na v2.1 o objeto `UI` **deixa de
existir como objeto**; o ponto central continua existindo e muda de natureza:

| | v2.0 | v2.1 |
|---|---|---|
| Onde vive | objeto JavaScript global (`UI`) + CSS em `_Estilos.html` | *tokens* CSS em `app/globals.css` sob `@theme` |
| Quando resolve | em execução, no navegador | em *build* (utilitário) e em pintura (*custom property*) |
| Como se consome | `UI.cor.sucesso`, classe Bootstrap ou CSS ad hoc do módulo | utilitário Tailwind (`bg-executado-fundo`) ou variante `cva` |
| Se alguém errar | cor divergente que ninguém nota até a revisão visual | classe inexistente ⇒ **erro de lint**; *token* inexistente ⇒ utilitário não gerado |

**[PRESERVADO]** `RF-DS-01` a `RF-DS-05`, `RF-DS-03.1` e `RNF-MAN-03` (vocabulário visual com um
único ponto de manutenção). **[MIGRAÇÃO v2.1]** o mecanismo: `@theme` + `components/ui/` +
`components/ciaara/`. Dizer isto explicitamente é obrigação editorial (BRIEF §11): quem vier daqui
a dois anos procurando o objeto `UI` precisa encontrar, escrito, para onde ele foi.

### 0.2 O que se ganha

1. **Tipagem.** `BadgeStatus status="concluida"` é verificado por `tsc`; `status="conclu1da"` não
   compila. Na v2.0 um status errado produzia um badge cinza silencioso.
2. **Acessibilidade por construção.** Radix entrega foco gerenciado, `aria-*` correto, navegação por
   teclado e camadas de sobreposição nos primitivos (`Dialog`, `Select`, `Popover`, `Tabs`),
   atendendo boa parte de `RNF-USA-06` sem código nosso.
3. **Variantes com `cva`.** A explosão de classes ad hoc (`.aloc-verde`, `.cell-fe`, `.cell-lp`) vira
   um mapa declarativo `tom × tamanho`, com o tipo derivado por `VariantProps`.
4. **Um componente, todas as saídas.** `NomeInstrutor` (`RF-DS-05`) é o mesmo módulo na tela e na
   rota `/print/*`. Na v2.0 era impossível: `.gs` não enxerga `.html`, e a formatação existia em
   cópias — o defeito estrutural que `RF-MOD` documentou.
5. **Propriedade dos componentes.** shadcn/ui não é dependência de *runtime*: o código é **copiado
   para `components/ui/` e versionado**. Correção de acessibilidade nossa não espera *release* de
   terceiro, e nenhuma atualização quebra tela sem passar por *diff* em *pull request*.

### 0.3 O que exige cuidado — **reescrever, não traduzir**

Bootstrap e Tailwind não são duas sintaxes para a mesma ideia; são **dois modelos mentais**:

| Dimensão | Bootstrap 5 (v2.0) | Tailwind v4 (v2.1) |
|---|---|---|
| Unidade de reuso | a **classe semântica** (`.card`, `.btn-primary`) | o **componente** (`<Card>`, `<Button variant>`) |
| Onde mora a variação | *override* de CSS por módulo | *prop* tipada resolvida por `cva` |
| Grade | 12 colunas (`col-md-6`) | Flexbox/Grid nativos com utilitários |
| Tema | classe de tema + variáveis do Bootstrap | *custom properties* trocadas por `.dark` |
| Componente interativo | JS do Bootstrap sobre `data-bs-*` | primitivo Radix controlado por estado React |

O erro previsível — e é o risco nomeado no Épico 4 — é **transliterar**: procurar o equivalente
Tailwind de `col-md-6`, envolver `.aloc-verde` num `@apply`, recriar o modal do Bootstrap com
`useState` e `position: fixed`. O resultado seria Bootstrap escrito em Tailwind: todo o custo da
migração, nenhum dos ganhos, e acessibilidade pior do que a que já existe.

**Regra desta migração:** para cada tela da v2.0, capture-se **o que ela comunica** (quais estados,
qual densidade, qual hierarquia de leitura) e reconstrua-se sobre os primitivos novos. O artefato
de referência é a **captura de tela da v2.0**, não o seu CSS.

> **Ressalva de escopo.** Reescrever não é redesenhar. O Épico 4 nomeia o risco de *deriva visual
> em relação à v2.0, que o Bernardo validou tela a tela ao longo de 39 specs*, e seu critério de
> aceite 8 é literal: **nenhuma tela existente na v2.0 perde informação, cor semântica ou estado
> visual ao ser reconstruída**. Este documento só propõe mudança de aparência onde há motivo
> nomeado — e há exatamente uma: `.mat-piscar` (§3.1).

### 0.4 Destino de cada requisito

| Requisito | Destino v2.1 | Seção |
|---|---|---|
| `RF-DS-01` (ponto central) | **[PRESERVADO]** — `@theme` em `app/globals.css` | §1 |
| `RF-DS-02` (componentes consolidados) | **[PRESERVADO]** — `components/ciaara/` | §3, §4 |
| `RF-DS-03` (temas reformulados) | **[PRESERVADO]** — dois temas redesenhados, contraste AA | §2 |
| `RF-DS-03.1` (seguir o SO) | **[REVISADO — v2.1]** — deixa de ser avaliação, vira requisito | §2.1 |
| `RF-DS-04` (sem CSS por página) | **[PRESERVADO]** — exceção única: `print.css` | §6.3, §9.3 |
| `RF-DS-05` (nome de instrutor) | **[PRESERVADO]** — `NomeInstrutor`, também no impresso | §3.1, §6.4 |
| `RNF-USA-02` (densidade) | **[MIGRAÇÃO v2.1]** — escala de densidade explícita | §5 |
| `RNF-USA-04` (alertas sempre visíveis) | **[PRESERVADO]** — `AlertaConformidade` + `aria-live` | §8.4 |
| `RNF-USA-05` (tema persistido) | **[PRESERVADO]** — `next-themes`, estratégia `class` | §2 |
| `RNF-USA-06` (acessibilidade) | **[NOVO — v2.1]** — AA, foco, teclado | §8 |
| `RNF-COMP-01` (paridade de impressão) | **[PRESERVADO E REFORÇADO]** — `/print/*` + e2e | §6 |
| `RNF-MAN-03` (ponto único de manutenção) | **[PRESERVADO]** — governança de *token* e componente | §9 |

---

## 1. Tokens (`RF-DS-01`, `RNF-MAN-03`)

### 1.1 Duas famílias de *token*, e por que a distinção decide o arquivo

O Tailwind v4 configura-se em CSS, não em JavaScript. Há uma sutileza que é a causa mais comum de
tema quebrado em projeto Tailwind v4:

- **`@theme { … }`** declara valores **estáticos**, resolvidos na geração dos utilitários. Serve ao
  que **não muda com o tema**: a rampa institucional, as escalas tipográfica e de espaçamento, os
  raios e as sombras. Um `--color-ciaara-azul` aqui é o azul da Marinha em qualquer tema.
- **`@theme inline { … }` apontando para *custom properties* de `:root` e `.dark`** serve ao que
  **é papel, não cor**: fundo, superfície, texto, borda, o tom de "executado". `bg-superficie` passa
  a compilar para `background-color: var(--superficie)`, e trocar `.dark` no `<html>` repinta a
  página inteira sem recompilar nada e sem JavaScript.

Pôr um *token* de papel em `@theme` não-`inline` é o defeito clássico: a cor congela no tema claro
e o modo noturno fica com campos claros demais — exatamente a reclamação que `RF-DS-03` registra
sobre a v1.0 e que a v2.1 não pode reintroduzir por descuido de sintaxe.

### 1.2 De-para: `UI` da v2.0 → *tokens* da v2.1

| Origem v2.0 | Onde vivia | Destino v2.1 | Uso típico | Nota |
|---|---|---|---|---|
| `--ciaara-azul` | `_Estilos.html` (da v1.0) | `--color-ciaara-azul` | `bg-ciaara-azul` | valor `#003366` preservado |
| `--ciaara-ink` | `_Estilos.html` | `--color-ciaara-ink` | `text-ciaara-ink` | tinta institucional; base do texto claro |
| `bg-primary` | Bootstrap 5 | `bg-marca` | topo, barra lateral | `marca` é o papel; `ciaara-azul` é a cor |
| `bg-light` | Bootstrap 5 | `bg-fundo` | corpo | vira papel: muda no tema escuro |
| `text-success` / `bg-success` | Bootstrap 5 | `--executado-*` | badge, célula da grade | renomeado para o **vocabulário do domínio** |
| `text-warning` / `bg-warning` | Bootstrap 5 | `--atrasado-*` | aviso de Nível 2 | |
| `text-danger` / `bg-danger` | Bootstrap 5 | `--conflito-*` | alerta de Nível 3 | |
| `.aloc-verde` | CSS ad hoc do Diagrama | `--executado-*` | `GradeAlocacao` tom `executado` | a classe morre; a semântica sobrevive |
| `.cell-fe` | CSS ad hoc do Cronos | `--nao-letivo-*` | tom `feriado` | distingue-se de LP por hachura e rótulo |
| `.cell-lp` | CSS ad hoc do Cronos | `--nao-letivo-*` | tom `lp` | idem, hachura no sentido oposto |
| `.mat-piscar` | CSS ad hoc de Matérias | `--conformidade-*` **sem animação** | `BadgeStatus tom="conformidade"` | **[REVISADO — v2.1]**, §3.1 |
| `.card` + número grande | duplicado entre módulos | `CardKpi` | painéis de estatística | `RF-DS-02` |
| `shadow-sm` | Bootstrap 5 | `--shadow-ciaara-1` | cartões | |
| `col-12 col-md-6 col-lg-4` | grade Bootstrap | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | listagens em cartão | UI-02 preservado no comportamento |
| `Rawline` via CDN | `<link>` em `_Estilos.html` | `next/font/local` auto-hospedada | `--font-sans` | UI-04 preservado; sem dependência externa |
| Font Awesome 6 (UI-03) | CDN | `lucide-react` | ícones de interface | **pendência §11.2** |
| ApexCharts / Chart.js (UI-06) | CDN | **Recharts** | `components/graficos/` | BRIEF §1 |
| `#overlay` + `gs()` (IND-02) | `_Comum.html` | `loading.tsx` + `<Suspense>` + `useFormStatus` | carregamento | `RNF-PERF-06` |
| `AppState` | `AppState.js` | URL + `nuqs` | estado de navegação | documento 25 |

**Brasões e identidade institucional** (CIAARA, Marinha do Brasil, mascote da DHN) continuam
**fora** de qualquer proibição de SVG: são ativos institucionais únicos, não ícone genérico — é a
exceção já registrada em UI-03 e **[PRESERVADA]**. Vivem em `public/institucional/`.

### 1.3 `app/globals.css`

```css
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
 * app/globals.css — PONTO ÚNICO DE MANUTENÇÃO DO VOCABULÁRIO VISUAL (RF-DS-01, RNF-MAN-03).
 * O QUÊ: todos os tokens de cor, tipografia, espaçamento, raio e sombra do CIAARA-11.
 * PARA QUÊ: mudar identidade visual editando UM lugar — o que o objeto `UI` fazia por convenção
 *           e aqui passa a ser garantia do motor de build.
 * COMO: (1) `@theme` para o que NÃO muda com o tema; (2) `:root`/`.dark` para os papéis, que
 *       mudam; (3) `@theme inline` para expor os papéis como utilitário.
 * REGRA INEGOCIÁVEL: nenhum valor literal de cor existe fora deste arquivo — verificado por lint (§9.3).
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
@import "tailwindcss";

/* Variante `dark` na estratégia `class`, que é a do next-themes (RNF-USA-05).
   `:where()` mantém especificidade zero — um utilitário Tailwind sempre vence. */
@custom-variant dark (&:where(.dark, .dark *));

/* ── 1. ESTÁTICOS: a marca e as escalas. Iguais nos dois temas. ──────────────────────────────── */
@theme {
  /* Rampa institucional. Âncora: #003366, azul-marinho da identidade CIAARA (v2.0 §2). */
  --color-ciaara-azul-50: #eef4fa;   --color-ciaara-azul-100: #d6e4f2;  --color-ciaara-azul-200: #adc9e4;
  --color-ciaara-azul-300: #7ea7d2;  --color-ciaara-azul-400: #4a7fb8;  --color-ciaara-azul-500: #1f5a97;
  --color-ciaara-azul-600: #003366;  /* ← a cor institucional. Não alterar sem decisão formal. */
  --color-ciaara-azul-700: #002a55;  --color-ciaara-azul-800: #001f3f;  --color-ciaara-azul-900: #00152b;
  --color-ciaara-azul: var(--color-ciaara-azul-600);  /* alias histórico: era --ciaara-azul */
  --color-ciaara-ink:  #0f1720;                       /* alias histórico: era --ciaara-ink  */
  --color-ciaara-ouro: #a67c00;                       /* acento institucional, uso pontual  */

  /* Neutros frios de propósito: convivem com o azul sem sujar. */
  --color-neutro-50: #f7f9fb;   --color-neutro-100: #eef1f5;  --color-neutro-200: #dde3ea;
  --color-neutro-300: #c3ccd8;  --color-neutro-400: #94a1b2;  --color-neutro-500: #6b7889;
  --color-neutro-600: #4d5a67;  --color-neutro-700: #39424f;  --color-neutro-800: #232b36;
  --color-neutro-900: #141a22;  --color-neutro-950: #0b0f14;

  /* Tipografia (UI-04 preservado: Rawline como fonte principal). */
  --font-sans: var(--fonte-rawline), ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;

  /* Escala de sistema de GESTÃO: começa menor que a escala web típica, de propósito (§5). */
  --text-2xs: 0.6875rem;  --text-2xs--line-height: 1rem;       /* 11px — sigla/unidade em célula */
  --text-xs:  0.75rem;    --text-xs--line-height: 1.0625rem;   /* 12px — dado tabular denso      */
  --text-sm:  0.8125rem;  --text-sm--line-height: 1.125rem;    /* 13px — rótulo, cabeçalho       */
  --text-base:0.875rem;   --text-base--line-height: 1.25rem;   /* 14px — CORPO PADRÃO            */
  --text-lg:  1rem;       --text-lg--line-height: 1.5rem;      /* 16px — prosa e impresso        */
  --text-xl:  1.25rem;    --text-2xl: 1.5rem;                  /* títulos de seção e de tela     */
  --text-kpi: 2rem;       --text-kpi--line-height: 2.25rem;    /* 32px — número do CardKpi       */

  --spacing: 0.25rem;                          /* base 4px: a densidade vive em múltiplos pequenos */
  --altura-linha-compacta: 1.75rem;            /* 28px */
  --altura-linha-padrao: 2.25rem;              /* 36px */
  --altura-linha-confortavel: 2.75rem;         /* 44px */
  --altura-celula-ta: 2.5rem;                  /* 40px — célula de Tempo de Aula na GradeAlocacao */
  --largura-coluna-ta: 3rem;                   /* 48px — coluna do rótulo de TA */

  /* Raio discreto: documento institucional, não aplicativo de consumo. Três degraus de sombra. */
  --radius-ciaara-sm: 0.25rem;  --radius-ciaara: 0.375rem;  --radius-ciaara-lg: 0.5rem;
  --shadow-ciaara-1: 0 1px 2px 0 rgb(15 23 32 / 0.06), 0 1px 3px 0 rgb(15 23 32 / 0.08);
  --shadow-ciaara-2: 0 2px 4px -1px rgb(15 23 32 / 0.08), 0 4px 8px -2px rgb(15 23 32 / 0.10);
  --shadow-ciaara-3: 0 8px 16px -4px rgb(15 23 32 / 0.12), 0 16px 32px -8px rgb(15 23 32 / 0.14);
}

/* ── 2. PAPÉIS — TEMA CLARO (padrão) ──────────────────────────────────────────────────────────
 * `RF-DS-03` manda REFORMULAR, não preservar: o claro pastel da v1.0 tinha legibilidade ruim.
 * Este claro é mais frio e de contraste maior, mantendo o azul institucional. */
:root {
  color-scheme: light;
  --fundo: #f4f7fa;              /* cinza-azulado, não branco: reduz fadiga em tabela longa */
  --superficie: #ffffff;         /* cartão, tabela, modal                                   */
  --superficie-2: #eef2f7;       /* cabeçalho fixo, zebra, área desabilitada                */
  --texto: #0f1720;              /* 15.9:1 sobre --superficie                               */
  --texto-suave: #47546a;        /* 7.6:1 — rótulo secundário, unidade, legenda             */
  --texto-tenue: #6b7889;        /* 4.6:1 — placeholder. NUNCA para dado; só para dica.     */
  --borda: #dde3ea;              --borda-forte: #c3ccd8;   /* 3.1:1 — limite de componente   */
  --marca: #003366;              --marca-contraste: #ffffff;  /* 13.4:1 sobre --marca        */
  --marca-suave: #eef4fa;        --foco: #1f5a97;             /* anel de foco — RNF-USA-06   */

  /* SEMÂNTICAS DE STATUS DO DOMÍNIO. Cada trio fundo/tinta/borda é validado em AA (§8.1).
     O nome é o do DOMÍNIO, não o da cor: quem lê `--executado-tinta` sabe o que significa;
     quem lia `text-success` precisava saber o que "success" queria dizer naquele módulo. */
  --planejado-fundo:    #e8eff7;  --planejado-tinta:    #1f4a75;  --planejado-borda:    #adc9e4;
  --executado-fundo:    #e3f5ec;  --executado-tinta:    #10603d;  --executado-borda:    #97d6b8;
  --adiantado-fundo:    #e6f4f7;  --adiantado-tinta:    #0b5563;  --adiantado-borda:    #9ed2de;
  --atrasado-fundo:     #fdf3d8;  --atrasado-tinta:     #7a5200;  --atrasado-borda:     #e8c66a;
  --conflito-fundo:     #fdeaea;  --conflito-tinta:     #96181f;  --conflito-borda:     #f0a9ac;
  --conformidade-fundo: #f1ebfa;  --conformidade-tinta: #56308a;  --conformidade-borda: #c4addf;
  --nao-letivo-fundo:   #e9ecf1;  --nao-letivo-tinta:   #4d5a67;  --nao-letivo-borda:   #c3ccd8;
  --reserva-fundo:      #eceff3;  --reserva-tinta:      #39424f;  --reserva-borda:      #b6c0cd;
  --inativo-fundo:      #f1f3f6;  --inativo-tinta:      #5c6879;  --inativo-borda:      #d5dbe3;

  /* Séries de gráfico (§7). Ordem fixa; luminâncias distintas para sobreviver ao P&B impresso. */
  --serie-1: #1f5a97;  --serie-2: #0f8a5f;  --serie-3: #b8860b;  --serie-4: #a8323c;
  --serie-5: #6b4fa0;  --serie-6: #0e7490;  --serie-7: #8a5a2b;  --serie-8: #4d5a67;
}

/* ── 3. PAPÉIS — MODO NOTURNO ──────────────────────────────────────────────────────────────────
 * `RF-DS-03` registra que o escuro da v1.0 tinha "campos com cores excessivamente claras".
 * Correção estrutural: no escuro, o FUNDO do status é escuro e pouco saturado e a TINTA é a cor
 * clara. Nunca se reaproveita o pastel do tema claro — é exatamente o defeito da v1.0. */
.dark {
  color-scheme: dark;
  --fundo: #0b0f14;              --superficie: #141a22;     --superficie-2: #1c242e;
  --texto: #e8edf3;              /* 14.2:1 */    --texto-suave: #a8b3c2;  /* 7.9:1 */
  --texto-tenue: #7b8899;        /* 4.7:1  */    --borda: #2a343f;        --borda-forte: #3d4855;
  --marca: #4a7fb8;              /* #003366 não contrasta sobre fundo escuro: sobe na rampa */
  --marca-contraste: #04121f;    --marca-suave: #17293c;    --foco: #7ea7d2;

  --planejado-fundo:    #172636;  --planejado-tinta:    #9dc2e6;  --planejado-borda:    #2f4a68;
  --executado-fundo:    #0e2b20;  --executado-tinta:    #74d3a6;  --executado-borda:    #1f5540;
  --adiantado-fundo:    #0c262c;  --adiantado-tinta:    #86ccdb;  --adiantado-borda:    #1a4a56;
  --atrasado-fundo:     #2e2410;  --atrasado-tinta:     #e8c264;  --atrasado-borda:     #5c4818;
  --conflito-fundo:     #2f1416;  --conflito-tinta:     #f19aa0;  --conflito-borda:     #5e2529;
  --conformidade-fundo: #221a33;  --conformidade-tinta: #c4aae8;  --conformidade-borda: #453465;
  --nao-letivo-fundo:   #1a212a;  --nao-letivo-tinta:   #9aa7b6;  --nao-letivo-borda:   #333d49;
  --reserva-fundo:      #191f27;  --reserva-tinta:      #94a1b2;  --reserva-borda:      #2f3945;
  --inativo-fundo:      #161c24;  --inativo-tinta:      #8593a4;  --inativo-borda:      #2b343f;

  --serie-1: #6ea8dc;  --serie-2: #4fc48c;  --serie-3: #e0b64a;  --serie-4: #e88a92;
  --serie-5: #b39ae0;  --serie-6: #52b6cc;  --serie-7: #cd9b6a;  --serie-8: #a8b3c2;
}

/* ── 4. EXPOSIÇÃO DOS PAPÉIS COMO UTILITÁRIO ──────────────────────────────────────────────────
 * `@theme inline` faz `bg-executado-fundo` compilar para `var(--executado-fundo)`: o utilitário
 * segue o tema em tempo de PINTURA, sem recompilar e sem JavaScript. */
@theme inline {
  --color-fundo: var(--fundo);                --color-superficie: var(--superficie);
  --color-superficie-2: var(--superficie-2);  --color-texto: var(--texto);
  --color-texto-suave: var(--texto-suave);    --color-texto-tenue: var(--texto-tenue);
  --color-borda: var(--borda);                --color-borda-forte: var(--borda-forte);
  --color-marca: var(--marca);                --color-marca-contraste: var(--marca-contraste);
  --color-marca-suave: var(--marca-suave);    --color-foco: var(--foco);

  /* Os nove status seguem o MESMO padrão mecânico, três linhas cada — reproduzido aqui só para
     `planejado`; `executado`, `adiantado`, `atrasado`, `conflito`, `conformidade`, `nao-letivo`,
     `reserva` e `inativo` repetem o trio idêntico, trocando o nome. Idem para `--serie-1..8`. */
  --color-planejado-fundo: var(--planejado-fundo);
  --color-planejado-tinta: var(--planejado-tinta);
  --color-planejado-borda: var(--planejado-borda);
  /* … demais status e séries, mesmo padrão … */
}

/* ── 5. CAMADA BASE. O mínimo — o resto é utilitário no componente (RF-DS-04). ────────────────── */
@layer base {
  * { border-color: var(--borda); }
  body {
    background-color: var(--fundo); color: var(--texto);
    font-size: var(--text-base); line-height: var(--text-base--line-height);  /* 14px: denso (§5) */
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  }
  /* Foco visível universal (RNF-USA-06). `:focus-visible` e não `:focus` — o clique de mouse não
     desenha anel, o teclado desenha sempre. `outline` e não `box-shadow`: acompanha o formato do
     elemento e sobrevive ao `overflow: hidden` da célula. */
  :focus-visible { outline: 2px solid var(--foco); outline-offset: 2px; border-radius: var(--radius-ciaara-sm); }
  /* Sem isto, colunas de CH e de TA "dançam" a cada linha e ler uma coluna de 300 números vira trabalho. */
  table, .tabular { font-variant-numeric: tabular-nums; }
  /* RNF-USA-06 + WCAG 2.3.3 — e é o que torna a substituição de `.mat-piscar` coerente (§3.1). */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
}
```

### 1.4 Cores semânticas de status — leitura do domínio

| *Token* | Estado do domínio | Onde aparece | Nível (v2.0 §5) | Regra `RN-` |
|---|---|---|---|---|
| `planejado` | previsto, não executado | `GradeAlocacao`, Cronograma, `BarraProgressoTurma` | — | `RF-CRONOS` |
| `executado` | aula lançada / atividade cumprida | `GradeAlocacao`, DSA, Relatório | — | `RF-DSA-04` |
| `adiantado` | executado acima do previsto para a data | badge de ritmo da disciplina | — | candidata `RN-DISC-0X` |
| `atrasado` | abaixo do previsto para a data; prazo apertado | badge de ritmo, `AlertaConformidade` | **2 — Aviso** | candidata `RN-DISC-0X` |
| `conflito` | mesmo TA em dois blocos; instrutor em duas turmas | célula da grade, banner | **3 — Crítico** | `RN-CONF-01` |
| `conformidade` | teto AEC/TAD/TR excedido, 9º TA, docência sem capacitação | `AlertaConformidade`, `BadgeTeto` | **2 — Aviso** (nunca bloqueio) | `RN-DEG-02`, `RNF-NORM-01`, `RF-INSTR-16` |
| `nao-letivo` | feriado, LP, dia fora da janela do curso | coluna/linha da grade | — | `RNF-MAN-04` |
| `reserva` | bloco de TAD ou TR do PROENS | grade e Cronograma | — | `RNF-MAN-04` |
| `inativo` | registro em exclusão lógica | listagens e seletores | — | convenção C-05 → `status` |

Três consequências que vale escrever:

1. **`conformidade` não é `atrasado`.** Teto normativo excedido e disciplina atrasada são coisas
   diferentes: a primeira é conformidade com a DGPM/DEnsM, a segunda é execução. Dar às duas o
   mesmo âmbar do Bootstrap (`text-warning`) foi uma economia da v2.0 que a v2.1 desfaz — sem
   custo, porque é um *token* a mais.
2. **`conflito` é o único bloqueante**, coerente com o sistema de três níveis: o Nível 3
   corresponde sempre a uma regra `RN-` de *Risco: Alto* violada, nunca a preferência de UI.
3. **Nenhum status é comunicado só por cor** (§8.1): todo *token* de status entra acompanhado de
   rótulo textual e, na grade, de padrão de preenchimento.

---

## 2. Tema claro e modo noturno (`RF-DS-03`, `RF-DS-03.1`, `RNF-USA-05`)

### 2.1 Mecanismo

```tsx
// app/layout.tsx — trecho.
// O QUÊ: instala o provedor de tema na raiz.
// PARA QUÊ: preservar RNF-USA-05 (tema selecionável e persistido) e atender RF-DS-03.1, que na
//           v2.1 deixa de ser "avaliar a viabilidade" e vira requisito confirmado.
// COMO: next-themes escreve a classe `.dark` no <html> e guarda a escolha em localStorage.
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";

// UI-04 preservado: Rawline continua a fonte principal. Muda a entrega — auto-hospedada por
// next/font, sem CDN. Ganho: sem requisição a terceiro, sem FOUT, e a fonte também disponível
// na rota /print/*, que não pode depender de rede no momento da impressão (RNF-COMP-03).
const rawline = localFont({
  src: [
    { path: "../public/fontes/rawline-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fontes/rawline-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fontes/rawline-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fontes/rawline-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--fonte-rawline",   // consumida por --font-sans em globals.css
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` é OBRIGATÓRIO: o next-themes escreve a classe no <html> antes da
    // hidratação, e sem isto o React acusa divergência servidor/cliente.
    <html lang="pt-BR" suppressHydrationWarning className={rawline.variable}>
      <body>
        <ThemeProvider
          attribute="class"          // estratégia `class` — a que @custom-variant dark espera
          defaultTheme="system"      // RF-DS-03.1: acompanha o SO por padrão…
          enableSystem               // …e a escolha manual sobrepõe e persiste (RNF-USA-05)
          disableTransitionOnChange  // evita o "arrastão" de transição ao trocar de tema
          storageKey="ciaara-tema"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Sem flash de tema errado** (critério de aceite 2 do Épico 4): o `next-themes` injeta um script
bloqueante no `<head>` que aplica a classe antes da primeira pintura. Duas condições para que
funcione: (a) `suppressHydrationWarning` no `<html>`; (b) **nenhum componente decide cor lendo
`useTheme()` durante a renderização** — a cor vem do *token*, e o *token* já é o certo. Um
`const { theme } = useTheme(); const cor = theme === "dark" ? … : …` reintroduz o flash e **é
rejeitado em revisão**. A exceção legítima é o `SeletorTema`, que precisa saber qual ícone
destacar e por isso só monta depois da hidratação.

### 2.2 Cobertura dos dois temas

Todo *token* de papel está declarado **nas duas seções** (`:root` e `.dark`) — nenhum existe só no
claro. A verificação é mecânica: um teste lê `globals.css`, extrai os nomes declarados em cada
bloco e falha se os conjuntos diferirem. É barato e elimina de uma vez a classe de defeito que
`RF-DS-03` descreve ("campos com cores excessivamente claras" no escuro), que quase sempre nasce de
*token* esquecido, não de escolha de cor.

O escuro **não é o claro invertido**. Regra estrutural: no claro, fundo pastel e tinta escura; no
escuro, **fundo escuro e pouco saturado, tinta clara**. Reaproveitar `#e3f5ec` como fundo de
"executado" no modo noturno é precisamente o defeito da v1.0.

---

## 3. Inventário de componentes (`RF-DS-02`)

### 3.1 Origem e destino

| Componente CIAARA | Origem na v2.0 | Base shadcn/ui (Radix) | Arquivo | `"use client"` | Requisito |
|---|---|---|---|---|---|
| `CardKpi` | `.card` + número grande + ícone FA, duplicado por módulo | `Card` | `ciaara/card-kpi.tsx` | não | `RF-DS-02`, v2.0 §4 |
| `BadgeStatus` | `badge bg-success/warning/danger`, `.aloc-verde`, `.mat-piscar` | `Badge` + `cva` | `ciaara/badge-status.tsx` | não | `RF-DS-02` |
| `BadgeTeto` | inexistente (texto solto) | `Badge` + `Tooltip` | `ciaara/badge-teto.tsx` | sim | `RNF-NORM-01..03` |
| `TabelaDensa` | `<table class="table table-sm">` ad hoc por tela | `Table` | `ciaara/tabela-densa.tsx` | sim | `RNF-USA-02/06` |
| `GradeAlocacao` | `getDiagramaAlocacao` + `getCronos` (quase duplicados), `.cell-fe`, `.cell-lp` | — (CSS Grid próprio) | `ciaara/grade-alocacao.tsx` | sim | `RF-DS-02`, D4 doc. 08 |
| `GradeDsa` | grade semanal do DSA | composição sobre `GradeAlocacao` | `ciaara/grade-dsa.tsx` | sim | `RF-DSA-01..08` |
| `GradeCronograma` | Diagrama + Cronos unificados | composição sobre `GradeAlocacao` | `ciaara/grade-cronograma.tsx` | sim | `RF-CRONOS` |
| `FiltroAvancado` | bloco "Filtros Avançados" recopiado em Disciplinas/Instrutores | `Select`, `Combobox`, `Input`, `Collapsible` | `ciaara/filtro-avancado.tsx` | sim | `RF-DS-02`, spec 015 |
| `AlertaConformidade` | banner amarelo/vermelho + quadro de avisos (RF-INSTR-09) | `Alert` + região `aria-live` | `ciaara/alerta-conformidade.tsx` | não | **`RNF-USA-04`**, `RN-DEG-02` |
| `PainelAlertas` | central de notificações (NOT-02, sino na topbar) | `Popover` + `ScrollArea` | `ciaara/painel-alertas.tsx` | sim | `RF-INI-04` |
| `SeletorTurma` | `<select>` de turma reconstruído por tela | `Select` / `Combobox` | `ciaara/seletor-turma.tsx` | sim | `RF-CURSO`, doc. 25 |
| `SeletorCurso` | idem | `Combobox` | `ciaara/seletor-curso.tsx` | sim | `RF-CURSOS` |
| `BarraProgressoTurma` | barra do card de turma (CH concluída ÷ CH total) | `Progress` | `ciaara/barra-progresso-turma.tsx` | não | v2.0 §3.2-A |
| `CardTurma` | card do carrossel da Início | `Card` + `BarraProgressoTurma` + `BadgeStatus` | `ciaara/card-turma.tsx` | não | `RF-INI-02/03` |
| `DialogoCrud` | modal Bootstrap + `IND-03` | `Dialog` | `ciaara/dialogo-crud.tsx` | sim | `RF-CRUD`, `IND-03` |
| `DialogoConfirmacao` | `confirm()` / modal ad hoc de desativação | `AlertDialog` | `ciaara/dialogo-confirmacao.tsx` | sim | **`RNF-USA-03`** |
| `FormularioCiaara` | formulário + `CAMPOS_OBRIGATORIOS` + `IND-01/02` | `Form` (react-hook-form + `zodResolver`) | `ciaara/formulario-ciaara.tsx` | sim | `RF-CRUD-01` |
| `CampoObrigatorio` | asterisco vermelho na label (`IND-01`) | `Label` | `ciaara/campo-obrigatorio.tsx` | não | `IND-01` |
| `NomeInstrutor` | montado inline em vários pontos do `index.html` | — (texto + `<strong>`) | `ciaara/nome-instrutor.tsx` | não | **`RF-DS-05`**, `RF-INSTR-15` |
| `SeletorTema` | botão de tema da topbar | `DropdownMenu` | `ciaara/seletor-tema.tsx` | sim | `RNF-USA-05` |
| `EstadoVazio` | ad hoc, quando existia | — | `ciaara/estado-vazio.tsx` | não | `RN-DEG-01` |
| `EsqueletoTabela` / `EsqueletoGrade` | `#overlay` global (`IND-02`) | `Skeleton` | `ciaara/esqueleto-*.tsx` | não | `RNF-PERF-06` |
| `CabecalhoImpressao` | cabeçalho reconstruído por relatório | — | `impressao/cabecalho-impressao.tsx` | **nunca** | `RNF-COMP-01` |
| `RodapeAssinatura` | rodapé de assinatura do DSA | — | `impressao/rodape-assinatura.tsx` | **nunca** | `RF-DSA-06` |
| `LegendaTons` / `QuebraPagina` | legenda ad hoc / `<div class="page-break">` | — | `impressao/*.tsx` | **nunca** | `RNF-COMP-01` |
| `GraficoBarras` / `GraficoPizza` / `GraficoLinha` | *helper* `renderizarGrafico_` (ApexCharts) | Recharts | `graficos/*.tsx` | **sempre** | `RF-INSTR-08`, §7 |

**`.mat-piscar` — [REVISADO — v2.1], a única mudança de aparência proposta.** A classe fazia piscar
a linha da disciplina que exigia atenção. Conteúdo que pisca é problema de acessibilidade por três
frentes: WCAG 2.2.2 (*Pause, Stop, Hide*), WCAG 2.3.1 (limiar de cintilação) e a diretriz de
movimento reduzido já implementada em `prefers-reduced-motion`. Além disso, pisca-pisca **perde
eficácia** numa tela com muitas linhas sinalizadas — que é o cenário do módulo de Disciplinas.
**Substituição:** faixa lateral de 3px no *token* `conformidade`, ícone persistente e rótulo
textual, mais entrada no `AlertaConformidade` do topo do módulo, que `RNF-USA-04` já exige sempre
visível. A saliência é preservada; o movimento não. **Precisa de confirmação** (§11.1).

### 3.2 O que um componente de `components/ciaara/` **não** faz

Fronteira herdada do documento 24, reafirmada porque é a que mais se viola sob pressão de prazo:
**não acessa o Supabase** (o dado chega por *props*, carregado pela página); **não implementa regra
`RN-`** (conflito de horário, teto normativo, antiguidade e distribuição de CH são funções puras de
`lib/dominio/` — o componente exibe o resultado); **não define cor literal** (§9.3); **não declara
`"use client"` por precaução**. Na prática: `GradeAlocacao` recebe `conflitos` já calculados por
`detectarConflitos()` (`RN-CONF-01`). Ele não sabe o que é um conflito — sabe pintá-lo.

### 3.3 `GradeAlocacao` e `GradeDsa` — reconciliação de nomes

O BRIEF §5, o `RF-DS-02` e o Épico 4 nomeiam **`GradeAlocacao`**; os documentos 20 e 24 usam
**`GradeDsa`** nos exemplos. Não são o mesmo componente. A divisão adotada:

- **`GradeAlocacao`** — o primitivo denso: matriz `linha × coluna` de células com *token* semântico,
  cabeçalhos fixos, navegação bidimensional por teclado e modo de impressão. Não conhece DSA nem
  Cronograma.
- **`GradeDsa`** — composição para a semana da turma: arrastar/soltar bloco, saldo de CH, sugestão
  automática (`RF-DSA-08`).
- **`GradeCronograma`** — composição para a visão anual unificada (Diagrama de Alocação + Cronos,
  decisão D4 do documento 08).

É literalmente o que `RF-DS-02` pediu: *"grades de alocação semanal hoje quase duplicadas entre
`getDiagramaAlocacao` e `getCronos` — unificadas, estilizadas uma vez só"*.

---

## 4. Três componentes em código

### 4.1 `BadgeStatus` — variantes com `cva`

```tsx
// components/ciaara/badge-status.tsx
// O QUÊ: o rótulo visual de qualquer estado do domínio — turma, disciplina, ritmo, cadastro,
//        célula da grade, conformidade normativa.
// PARA QUÊ: RF-DS-02, substituindo `badge bg-success`, `.aloc-verde`, `.mat-piscar` e variações
//        ad hoc por UM componente; e RF-DS-01, porque a cor vem sempre do token.
// COMO: `cva` mapeia (tom × tamanho) → classes; o dicionário STATUS mapeia o vocabulário do
//        DOMÍNIO → (tom, rótulo). Quem escreve a tela usa a palavra do domínio ("atrasada"),
//        não a palavra da cor ("warning") — a inversão que a v2.0 sofria.
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 1. GRAMÁTICA VISUAL. Cada tom é um trio fundo/tinta/borda do §1.3. NENHUMA cor literal aqui.
// `whitespace-nowrap` porque o badge mora dentro de célula densa e não pode empurrar a altura da linha.
const badgeVariantes = cva(
  ["inline-flex items-center gap-1 whitespace-nowrap align-middle",
   "rounded-ciaara-sm border font-medium tabular-nums transition-colors duration-150"],
  {
    variants: {
      tom: {
        neutro:       "bg-superficie-2 text-texto-suave border-borda",
        marca:        "bg-marca-suave text-marca border-marca/30",
        planejado:    "bg-planejado-fundo text-planejado-tinta border-planejado-borda",
        executado:    "bg-executado-fundo text-executado-tinta border-executado-borda",
        adiantado:    "bg-adiantado-fundo text-adiantado-tinta border-adiantado-borda",
        atrasado:     "bg-atrasado-fundo text-atrasado-tinta border-atrasado-borda",
        conflito:     "bg-conflito-fundo text-conflito-tinta border-conflito-borda",
        conformidade: "bg-conformidade-fundo text-conformidade-tinta border-conformidade-borda",
        naoLetivo:    "bg-nao-letivo-fundo text-nao-letivo-tinta border-nao-letivo-borda",
        reserva:      "bg-reserva-fundo text-reserva-tinta border-reserva-borda",
        inativo:      "bg-inativo-fundo text-inativo-tinta border-inativo-borda",
      },
      // Três tamanhos, não cinco. `xs` existe para caber DENTRO de célula da grade (§5).
      tamanho: { xs: "h-4 px-1 text-2xs", sm: "h-5 px-1.5 text-xs", md: "h-6 px-2 text-sm" },
    },
    defaultVariants: { tom: "neutro", tamanho: "sm" },
  },
);

// 2. VOCABULÁRIO DO DOMÍNIO. Fonte única da tradução "estado do sistema" → "como isso aparece".
// `as const` faz o TypeScript derivar a união de chaves: um status inexistente NÃO COMPILA — é o
// ganho de tipagem do §0.2 sobre o `UI.cor.xxx` da v2.0, que aceitava qualquer string.
const STATUS = {
  ativa: { tom: "executado", rotulo: "Ativa" },                    // turmas.status
  planejada: { tom: "planejado", rotulo: "Planejada" },
  concluida: { tom: "neutro", rotulo: "Concluída" },
  cancelada: { tom: "inativo", rotulo: "Cancelada" },
  registroAtivo: { tom: "executado", rotulo: "Ativo" },            // exclusão lógica (BRIEF §2)
  registroInativo: { tom: "inativo", rotulo: "Inativo" },
  naoIniciada: { tom: "neutro", rotulo: "Não iniciada" },          // execução da disciplina
  emAndamento: { tom: "planejado", rotulo: "Em andamento" },
  disciplinaConcluida: { tom: "executado", rotulo: "Concluída" },
  noPrazo: { tom: "executado", rotulo: "No prazo" },               // ritmo (previsto × executado)
  atrasada: { tom: "atrasado", rotulo: "Atrasada" },
  adiantada: { tom: "adiantado", rotulo: "Adiantada" },
  conflito: { tom: "conflito", rotulo: "Conflito" },               // grade / DSA
  feriado: { tom: "naoLetivo", rotulo: "Feriado" },
  lp: { tom: "naoLetivo", rotulo: "LP" },                          // termos intraduzíveis (BRIEF §9)
  tad: { tom: "reserva", rotulo: "TAD" },
  tr: { tom: "reserva", rotulo: "TR" },
  tetoExcedido: { tom: "conformidade", rotulo: "Teto excedido" },  // conformidade — NUNCA bloqueio
  nonoTa: { tom: "conformidade", rotulo: "9º TA" },                // (RN-DEG-02)
  semInstrutor: { tom: "conformidade", rotulo: "Sem instrutor" },
  semCapacitacao: { tom: "conformidade", rotulo: "Sem capacitação didática" },
} as const satisfies Record<string, { tom: VariantProps<typeof badgeVariantes>["tom"]; rotulo: string }>;

export type StatusCiaara = keyof typeof STATUS;

type Props = {
  status: StatusCiaara;
  rotulo?: string;                  // substitui o padrão; use com parcimônia (rótulo divergente é regressão)
  icone?: React.ReactNode;          // reforça o significado sem ser a única codificação (§8.1)
  tamanho?: VariantProps<typeof badgeVariantes>["tamanho"];
  descricaoAcessivel?: string;      // texto extra só para leitor de tela
  className?: string;
};

export function BadgeStatus({ status, rotulo, icone, tamanho, descricaoAcessivel, className }: Props) {
  const { tom, rotulo: rotuloPadrao } = STATUS[status];
  return (
    // ACESSIBILIDADE (§8.1): o badge SEMPRE renderiza texto. Não existe a variante "só ícone
    // colorido" — cor não é a única codificação, e um leitor de tela precisa do rótulo.
    <span
      className={cn(badgeVariantes({ tom, tamanho }), className)}
      data-status={status}          // gancho estável para o Playwright (§6.6), não seletor de estilo
    >
      {icone ? <span aria-hidden="true" className="shrink-0">{icone}</span> : null}
      {rotulo ?? rotuloPadrao}
      {descricaoAcessivel ? <span className="sr-only"> — {descricaoAcessivel}</span> : null}
    </span>
  );
}
```

### 4.2 `TabelaDensa` — ordenação, filtro e teclado

```tsx
"use client";
// components/ciaara/tabela-densa.tsx
// O QUÊ: a tabela padrão do sistema — centenas de linhas, cabeçalho fixo, ordenação por coluna,
//        filtro textual e navegação completa por teclado.
// PARA QUÊ: RF-DS-02 (uma tabela, não uma por tela), RNF-USA-02 (densidade é requisito) e
//        RNF-USA-06 (teclado e foco visível nas tabelas densas).
// COMO: genérica em <T>. A ordenação pode ser INTERNA (padrão) ou CONTROLADA pela página — é
//        assim que uma tela põe a ordenação na URL via `nuqs` (RNF-USA-07) sem que este
//        componente conheça `nuqs`, o que quebraria a fronteira do §3.2 e a testabilidade.
import * as React from "react";
import { cn } from "@/lib/utils";

export type ColunaDensa<T> = {
  chave: string;
  cabecalho: string;
  celula: (linha: T) => React.ReactNode;         // recebe a linha inteira: a coluna decide o que mostrar
  valorOrdenacao?: (linha: T) => string | number | null;  // ausente = coluna não ordenável
  textoBusca?: (linha: T) => string;             // ausente = coluna fora da busca
  alinhamento?: "esquerda" | "centro" | "direita";
  largura?: string;                              // coluna numérica DEVE ter largura fixa (§5.2)
  ocultarNaImpressao?: boolean;                  // some no papel sem sair da tela (RNF-COMP-01)
};
export type Ordenacao = { chave: string; direcao: "asc" | "desc" } | null;

type Props<T> = {
  linhas: readonly T[];
  colunas: ReadonlyArray<ColunaDensa<T>>;
  chaveLinha: (linha: T) => string;
  densidade?: "compacta" | "padrao" | "confortavel";
  busca?: string;                                     // vem do FiltroAvancado ou da URL
  ordenacao?: Ordenacao;                              // controlada; se ausente, é interna
  onOrdenacaoChange?: (o: Ordenacao) => void;
  onAtivarLinha?: (linha: T) => void;                 // quando presente, a linha inteira é alvo (§5.2)
  tomDaLinha?: (linha: T) => "conflito" | "atrasado" | "conformidade" | "inativo" | null;
  legenda: string;                                    // <caption>: toda tabela tem nome acessível
  vazio?: React.ReactNode;
};

const ALTURA = {
  compacta: "h-7 text-xs",      // 28px — Cronograma, listas de vínculo instrutor↔disciplina
  padrao: "h-9 text-base",      // 36px — PADRÃO do sistema
  confortavel: "h-11 text-base",// 44px — telas com edição inline (alvo de clique maior)
} as const;
const TOM_LINHA = {
  conflito: "bg-conflito-fundo/60", atrasado: "bg-atrasado-fundo/60",
  conformidade: "bg-conformidade-fundo/60",
  inativo: "text-texto-tenue",  // inativo NÃO some da tela: perde ênfase (exclusão lógica, C-05)
} as const;

export function TabelaDensa<T>({
  linhas, colunas, chaveLinha, densidade = "padrao", busca = "",
  ordenacao: ordenacaoControlada, onOrdenacaoChange, onAtivarLinha, tomDaLinha, legenda, vazio,
}: Props<T>) {
  // Ordenação híbrida: usa a controlada se veio, senão administra a própria. Uma implementação
  // serve à tela simples e à tela que precisa de deep-link (RNF-USA-07).
  const [ordenacaoInterna, setOrdenacaoInterna] = React.useState<Ordenacao>(null);
  const ordenacao = ordenacaoControlada !== undefined ? ordenacaoControlada : ordenacaoInterna;
  const definirOrdenacao = onOrdenacaoChange ?? setOrdenacaoInterna;

  // Normaliza acento e caixa: buscar "cartografia" precisa achar "Cartografía" e "CARTOGRAFIA".
  const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  // Filtrar ANTES de ordenar: ordenar o que será descartado é trabalho jogado fora.
  const linhasFiltradas = React.useMemo(() => {
    const alvo = normalizar(busca.trim());
    if (!alvo) return linhas;
    const buscaveis = colunas.filter((c) => c.textoBusca);
    return linhas.filter((l) => buscaveis.some((c) => normalizar(c.textoBusca!(l)).includes(alvo)));
  }, [linhas, colunas, busca]);

  const linhasVisiveis = React.useMemo(() => {
    if (!ordenacao) return linhasFiltradas;
    const coluna = colunas.find((c) => c.chave === ordenacao.chave);
    if (!coluna?.valorOrdenacao) return linhasFiltradas;
    const sinal = ordenacao.direcao === "asc" ? 1 : -1;
    return linhasFiltradas.slice().sort((a, b) => {   // `slice()`: `linhas` é do chamador, não muta
      const va = coluna.valorOrdenacao!(a), vb = coluna.valorOrdenacao!(b);
      if (va === null) return 1;                      // nulo sempre no fim, nos dois sentidos
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sinal;
      // `localeCompare` com "pt-BR": sem isto "Ávila" cai depois de "Zaqueu".
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * sinal;
    });
  }, [linhasFiltradas, ordenacao, colunas]);

  // Ciclo de TRÊS estados: asc → desc → sem ordenação. O terceiro importa porque "ordem natural"
  // é a ordenação por antiguidade (RN-ANT-01), e o usuário precisa poder voltar a ela.
  function alternarOrdenacao(chave: string) {
    if (!ordenacao || ordenacao.chave !== chave) return definirOrdenacao({ chave, direcao: "asc" });
    if (ordenacao.direcao === "asc") return definirOrdenacao({ chave, direcao: "desc" });
    return definirOrdenacao(null);
  }

  // NAVEGAÇÃO 2D POR TECLADO (RNF-USA-06), estratégia `roving tabindex`: exatamente UMA célula tem
  // tabIndex=0. O Tab entra e sai da tabela em um passo — e não em 300×8 passos, que é o defeito
  // clássico de tabela densa e a razão de a técnica ser obrigatória, não um refinamento.
  const [foco, setFoco] = React.useState({ l: 0, c: 0 });
  const refCorpo = React.useRef<HTMLTableSectionElement>(null);
  React.useEffect(() => {
    refCorpo.current?.querySelector<HTMLElement>(`[data-l="${foco.l}"][data-c="${foco.c}"]`)?.focus();
  }, [foco]);

  function aoTeclar(e: React.KeyboardEvent, l: number, c: number, linha: T) {
    const ultimaL = linhasVisiveis.length - 1, ultimaC = colunas.length - 1;
    const mapa: Record<string, () => { l: number; c: number }> = {
      ArrowDown: () => ({ l: Math.min(l + 1, ultimaL), c }), ArrowUp: () => ({ l: Math.max(l - 1, 0), c }),
      ArrowRight: () => ({ l, c: Math.min(c + 1, ultimaC) }), ArrowLeft: () => ({ l, c: Math.max(c - 1, 0) }),
      Home: () => ({ l, c: 0 }), End: () => ({ l, c: ultimaC }),
      PageDown: () => ({ l: Math.min(l + 20, ultimaL), c }),  // 20 ≈ uma "tela" de tabela densa
      PageUp: () => ({ l: Math.max(l - 20, 0), c }),
    };
    if (mapa[e.key]) { e.preventDefault(); return setFoco(mapa[e.key]()); }
    if ((e.key === "Enter" || e.key === " ") && onAtivarLinha) {
      e.preventDefault();                                     // impede o espaço de rolar a página
      onAtivarLinha(linha);
    }
  }

  // Degradação segura (RN-DEG-01): estado vazio é uma tela, não a ausência de uma tela.
  if (linhasVisiveis.length === 0) {
    return <div className="rounded-ciaara border border-borda bg-superficie p-6 text-center text-sm
                           text-texto-suave">{vazio ?? "Nenhum registro encontrado."}</div>;
  }

  return (
    <div className="relative overflow-auto rounded-ciaara border border-borda bg-superficie">
      {/* Contagem anunciada a cada mudança de filtro, sem roubar o foco (§8.4). */}
      <p aria-live="polite" className="sr-only">
        {linhasVisiveis.length} de {linhas.length} registros exibidos.
      </p>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{legenda}</caption>
        {/* Cabeçalho fixo: com 300 linhas, rolar e perder o nome da coluna é perder a tabela. */}
        <thead className="sticky top-0 z-10 bg-superficie-2 shadow-[0_1px_0_0_var(--borda)]">
          <tr>
            {colunas.map((col) => {
              const ativa = ordenacao?.chave === col.chave;
              return (
                <th key={col.chave} scope="col" style={{ width: col.largura }}
                  // `aria-sort` é o que faz o leitor de tela anunciar "ordenado crescente".
                  aria-sort={ativa ? (ordenacao!.direcao === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("h-8 border-b border-borda px-2 text-sm font-semibold text-texto-suave",
                    col.alinhamento === "direita" && "text-right",
                    col.alinhamento === "centro" && "text-center",
                    col.ocultarNaImpressao && "print:hidden")}
                >
                  {col.valorOrdenacao ? (
                    <button type="button" onClick={() => alternarOrdenacao(col.chave)}
                            className="inline-flex items-center gap-1 hover:text-texto">
                      {col.cabecalho}
                      {/* Seta com aria-hidden: o estado real já está em aria-sort. */}
                      <span aria-hidden="true" className="text-2xs">
                        {ativa ? (ordenacao!.direcao === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : col.cabecalho}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={refCorpo}>
          {linhasVisiveis.map((linha, l) => {
            const tom = tomDaLinha?.(linha) ?? null;
            return (
              <tr key={chaveLinha(linha)}
                  className={cn("border-b border-borda/70 last:border-0",
                    "odd:bg-superficie even:bg-superficie-2/40",       // zebra discreta, não listrada
                    onAtivarLinha && "cursor-pointer hover:bg-marca-suave", tom && TOM_LINHA[tom])}
                  onClick={onAtivarLinha ? () => onAtivarLinha(linha) : undefined}>
                {colunas.map((col, c) => (
                  <td key={col.chave} data-l={l} data-c={c}
                      tabIndex={foco.l === l && foco.c === c ? 0 : -1}   // roving tabindex
                      onKeyDown={(e) => aoTeclar(e, l, c, linha)} onFocus={() => setFoco({ l, c })}
                      className={cn(ALTURA[densidade], "px-2 align-middle",
                        col.alinhamento === "direita" && "text-right tabular-nums",
                        col.alinhamento === "centro" && "text-center",
                        col.ocultarNaImpressao && "print:hidden")}>
                    {col.celula(linha)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### 4.3 `GradeAlocacao` — a grade densa do DSA e do Cronograma

```tsx
"use client";
// components/ciaara/grade-alocacao.tsx
// O QUÊ: a matriz densa TA × dia (ou disciplina × semana) que o DSA e o Cronograma desenham.
// PARA QUÊ: RF-DS-02 pede a unificação das grades hoje quase duplicadas entre `getDiagramaAlocacao`
//        e `getCronos`. Este é o componente único — e é o mesmo que a rota /print/* usa, com
//        `modo="impressao"` (RNF-COMP-01).
// COMO: CSS Grid, não <table>: células vazias precisam ser alvo de clique e de arrastar/soltar, e
//        um bloco pode ocupar N linhas (3 TA seguidos são UM bloco, não três). `role="grid"`
//        devolve à árvore de acessibilidade a semântica que o CSS Grid não tem.
// FRONTEIRA (§3.2): NÃO detecta conflito, NÃO calcula saldo de CH, NÃO sabe o que é teto normativo.
//        Recebe tudo pronto de lib/dominio/. Sabe PINTAR, não decidir.
import * as React from "react";
import { cn } from "@/lib/utils";
import { BadgeStatus } from "@/components/ciaara/badge-status";

export type TomCelula = "vago" | "planejado" | "executado" | "conflito"
                      | "feriado" | "lp" | "tad" | "tr" | "foraDaJanela";

export type BlocoGrade = {
  id: string;
  colunaIndice: number;              // 0 = primeira coluna (segunda-feira, ou primeira semana)
  linhaIndice: number;               // 0 = primeiro TA do dia
  extensao: number;                  // quantos TA consecutivos ocupa
  tom: TomCelula;
  titulo: string;                    // sigla/código da disciplina — o que se lê primeiro
  subtitulo?: string;                // instrutor, sala, tipo de atividade
  emConflito?: boolean;              // veredito de RN-CONF-01, já calculado
  observacaoConformidade?: string;   // teto, 9º TA — alerta, nunca bloqueio (RN-DEG-02)
};
export type ColunaGrade = { rotulo: string; sublegenda?: string; tom?: TomCelula };
export type LinhaGrade = { rotulo: string; sublegenda?: string };

type Props = {
  colunas: readonly ColunaGrade[];   // dias da semana, ou semanas do ano
  linhas: readonly LinhaGrade[];     // tempos de aula (1º TA … 9º TA)
  blocos: readonly BlocoGrade[];
  onSelecionarCelula?: (coluna: number, linha: number) => void;
  onAtivarBloco?: (bloco: BlocoGrade) => void;
  densidade?: "compacta" | "padrao";
  modo?: "tela" | "impressao";
  legenda: string;
};

// Fundo, tinta e borda vêm SEMPRE de token (§9.3). A hachura nas variantes não letivas cumpre a
// regra do §8.1: dia não letivo é reconhecível por PADRÃO, não só por cinza — inclusive em P&B.
const TOM_CELULA: Record<TomCelula, string> = {
  vago: "bg-superficie border-borda/60 text-texto-tenue",
  planejado: "bg-planejado-fundo border-planejado-borda text-planejado-tinta",
  executado: "bg-executado-fundo border-executado-borda text-executado-tinta",
  conflito: "bg-conflito-fundo border-conflito-borda text-conflito-tinta",
  feriado: "bg-nao-letivo-fundo border-nao-letivo-borda text-nao-letivo-tinta " +
    "bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,var(--nao-letivo-borda)_5px,var(--nao-letivo-borda)_6px)]",
  lp: "bg-nao-letivo-fundo border-nao-letivo-borda text-nao-letivo-tinta " +
    "bg-[repeating-linear-gradient(-45deg,transparent,transparent_5px,var(--nao-letivo-borda)_5px,var(--nao-letivo-borda)_6px)]",
  tad: "bg-reserva-fundo border-reserva-borda text-reserva-tinta",
  tr: "bg-reserva-fundo border-reserva-borda text-reserva-tinta",
  foraDaJanela: "bg-inativo-fundo border-inativo-borda text-texto-tenue",
};

export function GradeAlocacao({
  colunas, linhas, blocos, onSelecionarCelula, onAtivarBloco,
  densidade = "padrao", modo = "tela", legenda,
}: Props) {
  const alturaCelula = densidade === "compacta" ? "1.75rem" : "var(--altura-celula-ta)";
  const [foco, setFoco] = React.useState({ c: 0, l: 0 });
  const refGrade = React.useRef<HTMLDivElement>(null);

  // Índice bloco-por-célula: evita varrer `blocos` dentro de dois laços aninhados.
  const mapaBlocos = React.useMemo(() => {
    const m = new Map<string, BlocoGrade>();
    for (const b of blocos) m.set(`${b.colunaIndice}:${b.linhaIndice}`, b);
    return m;
  }, [blocos]);

  // Células cobertas pela EXTENSÃO de um bloco: não recebem célula vaga por baixo.
  const cobertas = React.useMemo(() => {
    const s = new Set<string>();
    for (const b of blocos)
      for (let i = 1; i < b.extensao; i++) s.add(`${b.colunaIndice}:${b.linhaIndice + i}`);
    return s;
  }, [blocos]);

  React.useEffect(() => {
    if (modo === "impressao") return;              // impressão não tem foco: é papel
    refGrade.current?.querySelector<HTMLElement>(`[data-c="${foco.c}"][data-l="${foco.l}"]`)?.focus();
  }, [foco, modo]);

  function aoTeclar(e: React.KeyboardEvent, c: number, l: number) {
    const passo: Record<string, [number, number]> = {
      ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1],
    };
    if (passo[e.key]) {
      e.preventDefault();
      const [dc, dl] = passo[e.key];
      return setFoco({ c: Math.min(Math.max(c + dc, 0), colunas.length - 1),
                       l: Math.min(Math.max(l + dl, 0), linhas.length - 1) });
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const bloco = mapaBlocos.get(`${c}:${l}`);
      if (bloco && onAtivarBloco) onAtivarBloco(bloco); else onSelecionarCelula?.(c, l);
    }
  }

  return (
    <div ref={refGrade} role="grid" aria-label={legenda} aria-readonly={modo === "impressao"}
      className={cn("grid w-full gap-px rounded-ciaara border border-borda bg-borda",
        modo === "tela" && "overflow-x-auto",       // no papel o documento não rola, ele cabe (§6)
        modo === "impressao" && "border-borda-forte text-2xs")}
      style={{
        // 1ª coluna = rótulo do TA (largura fixa); demais = frações iguais com largura mínima
        // suficiente para caber a sigla da disciplina sem truncar (§5).
        gridTemplateColumns: `var(--largura-coluna-ta) repeat(${colunas.length}, minmax(6.5rem, 1fr))`,
        gridAutoRows: alturaCelula,
      }}>
      {/* Cabeçalho: canto morto + um rótulo por coluna. */}
      <div role="columnheader" aria-hidden="true" className="bg-superficie-2" />
      {colunas.map((col, c) => (
        <div key={`h-${c}`} role="columnheader"
          className={cn("flex flex-col items-center justify-center bg-superficie-2 px-1",
            "text-2xs font-semibold uppercase tracking-wide text-texto-suave",
            col.tom && col.tom !== "vago" && TOM_CELULA[col.tom])}>
          <span>{col.rotulo}</span>
          {col.sublegenda ? <span className="font-normal opacity-80">{col.sublegenda}</span> : null}
        </div>
      ))}

      {/* Corpo: para cada TA (linha), o rótulo e depois uma célula por dia. */}
      {linhas.map((lin, l) => (
        <React.Fragment key={`l-${l}`}>
          <div role="rowheader" className="flex flex-col items-center justify-center bg-superficie-2
                                           px-1 text-2xs font-semibold text-texto-suave">
            <span>{lin.rotulo}</span>
            {lin.sublegenda ? <span className="font-normal opacity-80">{lin.sublegenda}</span> : null}
          </div>
          {colunas.map((_, c) => {
            const chave = `${c}:${l}`;
            if (cobertas.has(chave)) return null;       // já pintada pela extensão do bloco acima
            const bloco = mapaBlocos.get(chave);
            const tom: TomCelula = bloco?.emConflito ? "conflito" : (bloco?.tom ?? "vago");
            return (
              <div key={chave} role="gridcell" data-c={c} data-l={l}
                data-tom={tom}                          // gancho para o e2e (§6.6)
                tabIndex={modo === "impressao" ? -1 : (foco.c === c && foco.l === l ? 0 : -1)}
                onKeyDown={(e) => aoTeclar(e, c, l)} onFocus={() => setFoco({ c, l })}
                onClick={() => (bloco ? onAtivarBloco?.(bloco) : onSelecionarCelula?.(c, l))}
                // `gridRow: span N` é o que faz 3 TA seguidos serem UM retângulo — a leitura que
                // o instrutor faz no papel é "esta disciplina ocupou a manhã inteira".
                style={bloco && bloco.extensao > 1 ? { gridRow: `span ${bloco.extensao}` } : undefined}
                className={cn("flex flex-col justify-center gap-0.5 overflow-hidden border px-1 py-0.5",
                  "text-2xs leading-tight", TOM_CELULA[tom],
                  modo === "tela" && "cursor-pointer", modo === "tela" && !bloco && "hover:bg-marca-suave",
                  // impede que um bloco de 3 TA seja cortado pela quebra de página (§6.3)
                  "print:break-inside-avoid")}>
                {bloco ? (
                  <>
                    <span className="truncate font-semibold" title={bloco.titulo}>{bloco.titulo}</span>
                    {bloco.subtitulo ? <span className="truncate opacity-90" title={bloco.subtitulo}>
                      {bloco.subtitulo}</span> : null}
                    {/* Conflito e conformidade recebem RÓTULO, não só cor (§8.1). */}
                    {bloco.emConflito ? <BadgeStatus status="conflito" tamanho="xs" className="print:hidden" /> : null}
                    {bloco.observacaoConformidade ? (
                      <BadgeStatus status="tetoExcedido" rotulo={bloco.observacaoConformidade} tamanho="xs" />
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

## 5. Densidade e legibilidade (`RNF-USA-02`)

`RNF-USA-02` é explícito: *"Densidade é requisito: este é um sistema de gestão com tabelas grandes —
prefira compacto e legível a espaçado e bonito."* Não é preferência estética; decorre do uso real.
O Cronograma exibe 175 disciplinas contra 52 semanas; a tela de instrutores lista 177 registros com
8 filtros; `turma_disciplina` tem 210 linhas. **A informação que não cabe na tela custa uma rolagem,
e a rolagem custa a comparação** — e comparar é o que o Encarregado de Curso faz o dia inteiro.

| Nível | Altura de linha | Fonte | Onde se usa |
|---|---|---|---|
| Compacta | 28px | 12px (`text-xs`) | Cronograma, `GradeAlocacao` anual, listas de vínculo |
| Padrão | 36px | 14px (`text-base`) | **padrão do sistema** — todas as listagens de cadastro |
| Confortável | 44px | 14px | telas com edição inline e telas de formulário |
| Célula de TA | 40px | 11px (`text-2xs`) | `GradeAlocacao` semanal (DSA) |

**Pisos que não se atravessam:**

- **Corpo padrão de 14px, não 16px.** Um sistema de gestão não é um site de conteúdo: o usuário lê
  uma matriz, não um artigo. 14px com `line-height` 1.25 mantém legibilidade e ganha cerca de duas
  linhas por tela.
- **12px é o piso do dado.** Nada abaixo disso carrega informação de leitura contínua.
- **11px (`text-2xs`) só** para sigla, unidade e rótulo de TA dentro de célula da grade — texto
  curto, alto contraste, nunca prosa. Fora da grade, é rejeitado em revisão.
- **Alvo de clique ≥ 24×24 CSS px** (WCAG 2.2, SC 2.5.8), 28×28 preferido. Onde um botão de linha
  ficar em 24px, **a linha inteira também é alvo** (`onAtivarLinha`) — a exceção do critério só
  vale porque existe o caminho equivalente maior.
- **`line-height` 1.25 em tabela e grade; 1.5 em prosa** (alerta, ajuda, documento impresso).
  Comprimir prosa a 1.25 é onde a densidade deixa de ser eficiência e vira ruído.
- **Números sempre `tabular-nums` e alinhados à direita.** Coluna de CH desalinhada é coluna que
  ninguém soma de cabeça.

**O que a densidade não autoriza:** reduzir o alvo de clique abaixo de 24px, remover espaçamento
entre grupos de campo num formulário, cortar rótulo de coluna a ponto de exigir *tooltip* para
entender, ou usar cor sem rótulo para economizar largura. **Densidade é ganhar linhas, não perder
significado.**

---

## 6. Impressão — seção crítica (`RNF-COMP-01`, `RNF-COMP-03`)

### 6.1 Por que esta é a seção crítica

`RNF-COMP-01` é **[PRESERVADO E REFORÇADO]** e não deixa margem: *"uma fatia que produza uma dessas
saídas não está pronta enquanto o teste de impressão não passar — paridade de impressão é critério
de aceite, não ajuste posterior"*. A razão está no próprio requisito: **o documento impresso circula
fora do sistema e tem leitores que nunca abriram a aplicação.** O DSA é assinado semanalmente; a LIQ
vai à Superintendência; a OS de Instrutoria é ordem de serviço. Regressão de layout aqui não é
defeito de UI — é documento institucional errado.

`RNF-COMP-03` fecha o mecanismo: **CSS `@media print` sobre rota dedicada mais a impressão do
próprio navegador**, sem serviço externo de PDF. Nenhum dado institucional sai da fronteira.

### 6.2 Arquitetura das rotas `/print/*`

```
app/print/
├── layout.tsx                  # layout MÍNIMO: <html> + fonte + print.css. Sem shell.
├── dsa/page.tsx                # RF-DSA        · A4 paisagem
├── relatorio/page.tsx          # RF-REL        · A4 retrato
├── cronograma/page.tsx         # doc. 08, D4   · A4 paisagem
├── ficha-instrutor/page.tsx    # specs 022–026 · A4 retrato
├── liq/page.tsx                # spec 027      · A4 retrato
├── os-instrutoria/page.tsx     # spec 028      · A4 retrato
└── print.css                   # ← a ÚNICA exceção autorizada a RF-DS-04 (§9.3)
```

Cinco invariantes, todas verificáveis:

1. **Sem *shell*.** A rota fica **fora** do grupo `(app)`: nada de barra lateral, cabeçalho de
   navegação, *breadcrumb*, seletor de tema ou botão. O documento começa no papel.
2. **100% Server Component.** Nada de `"use client"`, `useEffect`, animação ou menu — fronteira já
   fixada no documento 24. Impressão não tem estado; tem conteúdo.
3. **Herda os parâmetros da tela de origem, sem tradução** (documento 25, regra 2):
   `/print/dsa?turma=TUR-000012&semana=34&ano=2026` imprime exatamente o que está em
   `/turmas/TUR-000012/dsa?semana=34&ano=2026`. Isso elimina a classe inteira de defeito "o
   impresso não bate com a tela".
4. **Sempre no tema claro.** O layout força o claro independentemente da preferência do usuário —
   imprimir o modo noturno gasta toner e produz documento ilegível.
5. **Uma rota, um `@page`.** Cada `/print/*` é um documento HTML próprio, então cada um declara o
   seu `@page`. **Não se usa `@page` nomeada com a propriedade `page`**: o suporte é irregular
   entre os navegadores exigidos por `RNF-COMP-02` (Chrome, Edge, Firefox, Safari), e uma rota por
   documento resolve o mesmo problema sem depender de recurso instável.

### 6.3 O CSS de impressão

```css
/* app/print/print.css — a ÚNICA exceção autorizada a "sem CSS por página" (RF-DS-04). Existe
   porque `@page`, controle de quebra e `@media print` não têm utilitário Tailwind equivalente. */

@page { size: A4 portrait; margin: 14mm 12mm 16mm 12mm; }  /* rodapé maior: paginação + assinatura */

@media print {
  /* Fundo branco e tinta preta SEMPRE: o tema noturno não vai ao papel. */
  :root, .dark {
    --fundo: #ffffff; --superficie: #ffffff; --superficie-2: #f2f4f7;
    --texto: #000000; --texto-suave: #333333; --borda: #999999; --borda-forte: #666666;
  }
  /* Sem isto o navegador descarta o fundo das células "para economizar tinta", e o DSA sai sem a
     distinção entre executado, feriado e reserva. É a linha mais importante deste arquivo para a
     paridade com a v2.0. */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body { font-size: 10pt; line-height: 1.35; }   /* prosa volta a respirar no papel (§5) */
  .print\:hidden, [data-somente-tela] { display: none !important; }

  /* Controle de quebra */
  .quebra-pagina { break-after: page; }
  .manter-junto  { break-inside: avoid; }        /* bloco da grade, cartão de disciplina */
  h1, h2, h3     { break-after: avoid; }         /* título nunca fica órfão no pé da página */
  tr, [role="gridcell"] { break-inside: avoid; }
  p, li { orphans: 3; widows: 3; }

  /* Cabeçalho de tabela repetido em toda página — nativo do <table>, e é a razão de a
     TabelaDensa usar <table> de verdade em vez de `div` com `role`. */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }

  /* O leitor do papel não pode clicar: a URL vai impressa. */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #333; }
}
```

Cada rota acrescenta apenas a sua orientação, num `<style>` do próprio `page.tsx`:

```tsx
// app/print/dsa/page.tsx — trecho.
// O QUÊ: fixa a orientação deste documento. PARA QUÊ: o DSA é uma matriz de dias (colunas) por TA
// (linhas) — em retrato, ou trunca colunas ou desce a fonte abaixo do piso. COMO: `@page` local,
// porque cada /print/* é um documento independente (§6.2, item 5).
export default async function ImprimirDsa({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 10mm 10mm 14mm 10mm; }`}</style>
      {/* … CabecalhoImpressao · GradeAlocacao modo="impressao" · LegendaTons · RodapeAssinatura … */}
    </>
  );
}
```

### 6.4 Ficha técnica por documento

| Documento | Rota | Papel/orientação | Margens | Quebra | Cabeçalho | Rodapé |
|---|---|---|---|---|---|---|
| **DSA** | `/print/dsa` | A4 **paisagem** | 10/10/14/10 mm | uma semana por página; bloco de TA nunca cortado | brasão + curso + turma + semana ISO + intervalo | bloco de assinatura (`RF-DSA-06`) + paginação |
| **Relatório do Curso** | `/print/relatorio` | A4 retrato | 14/12/16/12 mm | `break-after: page` por seção; `secoes` da URL define quais entram | brasão + curso + ano + data de emissão | paginação `x / y` |
| **Cronograma** | `/print/cronograma` | A4 **paisagem** | 8/8/12/8 mm | por trimestre quando `granularidade=semana`; `thead` repetido | brasão + curso + ano + legenda de tons | paginação + legenda repetida |
| **Ficha do Instrutor** | `/print/ficha-instrutor` | A4 retrato | 14/12/16/12 mm | uma ficha por página | brasão + `NomeInstrutor` (`RF-DS-05`) + P/G + OM | paginação + data de emissão |
| **LIQ** | `/print/liq` | A4 retrato | 14/12/18/12 mm | por curso; `thead` repetido nas continuações | brasão + curso + **trimestre** + referência NORMHIDRO 30-23 | assinatura do Encarregado + paginação |
| **OS de Instrutoria** | `/print/os-instrutoria` | A4 retrato | 14/12/18/12 mm | uma OS por instrutor, `break-after: page` | brasão + identificação da OS + período | assinatura do Encarregado da CIAARA-11 + paginação |

Notas de decisão: **Cronograma em A4 paisagem, não A3** — A3 resolveria a largura, mas exige
impressora que o CIAARA não tem garantidamente; a alternativa é recorte por trimestre com legenda
repetida (**confirmar**, §11.3). **Paginação `x / y`** por `counter(page)`/`counter(pages)`:
documento institucional precisa dizer quantas páginas tem. **`NomeInstrutor` é o mesmo componente
da tela** (`RF-DS-05`) — o nome de guerra sai em negrito na LIQ, na OS e na Ficha exatamente como
sai na tela; na v2.0 isso era impossível.

`components/impressao/` reúne os blocos comuns: `CabecalhoImpressao`, `RodapeAssinatura`
(`RF-DSA-06`), `QuebraPagina` e `LegendaTons` — a legenda das cores da grade, **obrigatória em todo
impresso que use `GradeAlocacao`**, porque o leitor do papel não tem *tooltip*. Nenhum deles tem
interatividade: é fronteira do documento 24, e existe para que ninguém introduza um `useState` num
componente que precisa renderizar no servidor.

### 6.5 Verificação de paridade com a v2.0

Ponto delicado: `RNF-COMP-01` manda "comparar contra o layout aprovado da v2.0", enquanto o BRIEF §7
determina validação de não regressão **por invariantes estruturais e matemáticos, nunca por diff com
a saída histórica de um curso específico** — a CAHO 2026 foi rejeitada como padrão-ouro em
2026-08-10. **As duas exigências são compatíveis, e a distinção é o que torna o teste honesto:**

> Compara-se o **layout** (estrutura do documento) contra a v2.0. **Nunca** se compara o **conteúdo
> numérico** de um curso histórico.

**(a) Invariantes estruturais — Playwright, automático, bloqueante.** Com dados sintéticos de valores
conhecidos, cada rota é verificada quanto a: número de páginas esperado; presença e ordem dos blocos
obrigatórios; repetição de `thead` em página de continuação; ausência total de elemento do *shell*;
nenhum bloco de grade cortado por quebra; orientação e tamanho de papel efetivos.

```ts
// tests/e2e/impressao/dsa.spec.ts
// O QUÊ: garante que o DSA impresso mantém a estrutura aprovada na v2.0 (RNF-COMP-01).
// PARA QUÊ: uma fatia que produz DSA não está pronta enquanto isto não passar (BRIEF §7.5).
// COMO: emula mídia de impressão e afirma INVARIANTES — nunca compara números de um curso real.
import { test, expect } from "@playwright/test";
import { contarPaginas } from "./_apoio/pdf";

test("DSA impresso: sem shell, uma semana por página, assinatura presente", async ({ page }) => {
  await page.goto("/print/dsa?turma=TUR-SINTETICA-01&semana=34&ano=2026");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator("nav, aside, [data-shell]")).toHaveCount(0);          // 1. sem shell
  await expect(page.getByTestId("cabecalho-impressao")).toBeVisible();            // 2. blocos, em ordem
  await expect(page.getByRole("grid", { name: /detalhe semanal/i })).toBeVisible();
  await expect(page.getByTestId("rodape-assinatura")).toBeVisible();              //    RF-DSA-06

  // 3. Nenhum bloco de grade cortado: toda célula tem break-inside: avoid aplicado.
  const semAvoid = await page.locator('[role="gridcell"]').evaluateAll(
    (cs) => cs.filter((c) => getComputedStyle(c).breakInside !== "avoid").length);
  expect(semAvoid).toBe(0);

  // 4. Uma semana ⇒ uma página. Invariante ESTRUTURAL, não valor histórico.
  const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true });
  expect(contarPaginas(pdf)).toBe(1);
});
```

**(b) Instantâneo visual — automático, não bloqueante na primeira execução.** `toHaveScreenshot()`
com `media: "print"` sobre dados sintéticos fixos, para pegar deriva acidental. A referência é
gerada **uma vez, revisada por pessoa e versionada**; alterá-la exige justificativa no PR. Detecta
mudança, não julga correção.

**(c) Conferência em papel — manual, uma vez por documento, na entrega da fatia.** As seis saídas
são impressas de verdade e conferidas contra o exemplar da v2.0, folha a folha, pelo Bernardo. É a
única camada que verifica o que nenhuma automação verifica: se o documento **serve** — se cabe na
prancheta, se a assinatura tem espaço, se a fonte é legível a braço estendido. O resultado é
registrado como aprovação nominal da fatia.

Restrição técnica a registrar: `page.pdf()` existe **apenas no Chromium**. A camada (a) roda em
Chromium; Firefox e Safari (`RNF-COMP-02`) são cobertos pela camada (b) com emulação de mídia e por
conferência manual pontual. Geração de PDF fiel fora do Chromium não é automatizável hoje sem
serviço externo — e serviço externo é proibido por `RNF-COMP-03`.

---

## 7. Gráficos — Chart.js/ApexCharts → Recharts

A v1.0 usava Chart.js pontualmente; a v2.0 adotou ApexCharts (UI-06) com o *helper* único
`renderizarGrafico_`. A v2.1 usa **Recharts** (BRIEF §1). Todos os gráficos vivem em
`components/graficos/`, são **sempre `"use client"`** e **recebem a série pronta** — agregação é do
servidor, nunca do componente (documento 24).

Os *tokens* `--serie-1` a `--serie-8` são a paleta oficial, escolhidos por três propriedades:
contraste ≥ 3:1 com o fundo **nos dois temas** (exigência AA para elemento gráfico); **luminâncias
distintas entre si**, para que o gráfico continue legível impresso em P&B — o que não é capricho,
porque o Relatório do Curso e a Ficha do Instrutor são impressos e a impressora nem sempre é
colorida; e **ordem fixa**, porque um gráfico que reordena a paleta conforme os dados faz o leitor
reaprender a legenda a cada recarga.

| Regra | Motivo |
|---|---|
| **Uma cor por série, a mesma em todas as telas** | "Instrutores ativos" é o mesmo tom na Início e no módulo de Instrutores |
| **Cor nunca é a única codificação** | traço tracejado, marcador distinto ou rótulo direto; WCAG 1.4.1 e a impressão em P&B |
| **Rótulo direto em vez de legenda quando couber** | ≤ 4 séries: rótulo na ponta da linha ou dentro da barra; a legenda obriga o olho a ir e voltar |
| **Máximo de 6 séries** | acima disso vira tabela — use `TabelaDensa` |
| **Pizza/donut só com ≤ 5 categorias**, sempre com percentual escrito | barra horizontal ordenada é quase sempre melhor |
| **Eixo Y começa em zero** em barras | eixo truncado exagera diferença — inaceitável em documento institucional |
| **Sem 3D, gradiente, sombra ou animação de entrada** | não comunicam nada e atrapalham a impressão |
| **Toda cor vem de `var(--serie-N)`** | `RF-DS-01` e §9.3 valem também para gráfico |
| **Todo gráfico tem alternativa em tabela** | DYN-03 da v2.0 preservado; é o que torna o dado acessível a leitor de tela |

```tsx
// components/graficos/grafico-barras.tsx — trecho.
// O QUÊ: barras horizontais ordenadas — o gráfico padrão para distribuição por ENUM (status, P/G,
//        categoria, OM), conforme o padrão de estatísticas da v2.0 §4.
// PARA QUÊ: RF-INSTR-08, RF-CURSO — indicadores que reagem aos filtros.
// COMO: Recharts, cor por token, rótulo direto no fim da barra (dispensa legenda).
"use client";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function GraficoBarras({ dados }: { dados: { nome: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 28)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 48 }}>
        <XAxis type="number" domain={[0, "dataMax"]} hide />  {/* começa em zero — regra do §7 */}
        <YAxis type="category" dataKey="nome" width={140} axisLine={false} tickLine={false}
               tick={{ fontSize: 12, fill: "var(--texto-suave)" }} />
        <Bar dataKey="valor" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {/* Uma cor por categoria, da paleta oficial, em ordem estável. */}
          {dados.map((_, i) => <Cell key={i} fill={`var(--serie-${(i % 8) + 1})`} />)}
          {/* Rótulo direto: o número fica no fim da barra e nenhuma legenda é necessária. */}
          <LabelList dataKey="valor" position="right" style={{ fill: "var(--texto)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## 8. Acessibilidade (`RNF-USA-06`, `RNF-USA-04`)

### 8.1 Contraste AA e codificação dupla

Texto normal ≥ **4.5:1**; texto grande (≥ 24px, ou ≥ 18.7px em negrito) ≥ **3:1**; limite de
componente e elemento gráfico ≥ **3:1**. Os *tokens* do §1.3 satisfazem isso **nos dois temas**, e a
verificação entra no CI como auditoria automática das combinações declaradas (`fundo × tinta` de
cada status). **`--texto-tenue` nunca carrega dado** — serve a *placeholder* e dica; usá-lo para
conteúdo real reintroduz a reclamação de `RF-DS-03`.

**Cor nunca é a única codificação** (WCAG 1.4.1). Vale para: badge (sempre com rótulo), célula da
grade (sempre com sigla; feriado e LP com **hachura** de sentidos opostos), gráfico (rótulo direto
ou padrão de traço) e linha de tabela em conflito (badge, não só fundo avermelhado).

### 8.2 Foco visível

`:focus-visible` global de 2px no *token* `--foco`, com 2px de deslocamento (§1.3). Regra de
revisão: **`outline: none` sem substituto é rejeitado**, inclusive ao reescrever o anel de foco dos
primitivos shadcn/ui copiados — o ajuste é feito no arquivo de `components/ui/` e passa por *diff*
como qualquer código nosso.

### 8.3 Teclado nas tabelas e grades densas

Padrão implementado em `TabelaDensa` (§4.2) e `GradeAlocacao` (§4.3):

| Tecla | Efeito |
|---|---|
| `Tab` | entra na grade e sai dela em **um** passo (*roving tabindex*) |
| Setas | move célula a célula, nas duas dimensões |
| `Home` / `End` | primeira / última coluna da linha |
| `PageUp` / `PageDown` | salta 20 linhas — uma "tela" de tabela densa |
| `Enter` / `Espaço` | ativa a linha ou o bloco sob o foco |
| `Esc` | fecha diálogo / cancela seleção múltipla |

Sem *roving tabindex*, uma tabela de 300 linhas × 8 colunas exige 2.400 pressionamentos de `Tab`
para ser atravessada. É por isso que a técnica é obrigatória e não um refinamento opcional.

### 8.4 `aria-live` e os alertas de `RNF-USA-04`

`RNF-USA-04` exige avisos e alertas de qualidade de dados **sempre visíveis, nunca ocultos por
padrão**. Duas consequências de arquitetura: **(1)** a região de alertas é parte do layout, não um
painel recolhível — `AlertaConformidade` fica no topo do módulo, aberto, e nenhum alerta de Nível 2
ou 3 nasce dentro de um `Collapsible`; **(2)** o anúncio é por `aria-live`, com polidez
proporcional ao nível do sistema de três níveis da v2.0:

| Nível | Componente | ARIA | Dispensável? |
|---|---|---|---|
| 1 — Notificação | `sonner` (toast) | `role="status"` + `aria-live="polite"` | some sozinho |
| 2 — Aviso | `AlertaConformidade` variante `atencao`/`conformidade` | região `aria-live="polite"` | "Ciente" quando a regra permitir |
| 3 — Alerta crítico | `AlertaConformidade` variante `critico` | `role="alert"` (assertivo) | **não** — só some com o dado corrigido |

`role="alert"` é reservado ao Nível 3 porque interrompe a leitura em curso. Usá-lo para aviso de
conformidade — que por `RN-DEG-02` **nunca bloqueia** — treinaria o usuário a ignorar interrupções,
que é exatamente o que não pode acontecer com um conflito de horário real.

**Outros pontos:** `lang="pt-BR"` no `<html>` (`RNF-USA-01`), para pronúncia correta em leitor de
tela; `Label` associada por `htmlFor` em todo formulário, com `CampoObrigatorio` marcando asterisco
**e** `aria-required` (o asterisco vermelho sozinho é `IND-01` incompleto); erro de validação Zod
ligado ao campo por `aria-describedby`, em português; e `prefers-reduced-motion` respeitado
globalmente — a diretriz que torna a substituição de `.mat-piscar` coerente e não arbitrária.

---

## 9. Governança do Design System (`RNF-MAN-03`)

### 9.1 Como acrescentar um componente

Três perguntas, nesta ordem; parar na primeira que responder "sim".

1. **Um primitivo do shadcn/ui já resolve?** Então use-o direto de `components/ui/`, sem invólucro:
   um `<Button>` não precisa de um `<BotaoCiaara>` que só repassa *props*.
2. **É variação de um componente CIAARA existente?** Então é **variante**, não componente novo (§9.2).
3. **É usado por duas ou mais rotas?** Só então sobe para `components/ciaara/`. Com um consumidor
   só, mora na pasta da rota (*colocation*, documento 24 §1.2) — uma pasta `components/` inchada de
   coisa usada num lugar só é a versão moderna do `index.html` de 3.120 linhas da v1.0.

Todo componente novo entra com: tipo de *props* exportado, ao menos um caso em teste de componente,
verificação de teclado se for interativo, e comportamento definido em `print:` — mesmo que a decisão
seja "some".

### 9.2 Variante ou componente novo?

| Sintoma | Decisão |
|---|---|
| Muda só aparência (cor, tamanho, ênfase); DOM e contrato de acessibilidade idênticos | **variante `cva`** |
| Muda a estrutura do DOM ou a semântica ARIA | **componente novo** |
| Muda o modelo de interação (clicável vira arrastável; leitura vira edição) | **componente novo** |
| Precisa de uma *prop* booleana que desliga metade do render | **componente novo** — o booleano esconde dois componentes |
| Precisa da mesma coisa "só que na impressão" | **variante `modo="impressao"`**, nunca um `X` e um `XParaImprimir` |

O critério é de manutenção, não de estética: **variante é barata porque o contrato de
acessibilidade não muda**. Quando ele muda, um componente novo é mais honesto que uma quarta *prop*
condicional.

### 9.3 Nenhuma cor entra fora dos *tokens*

`RF-DS-01` traz o critério verificável: *"nenhum valor de cor literal (`#RRGGBB`, `rgb()`) fora de
`globals.css` — regra de lint"*.

```js
// eslint.config.mjs — trecho.
// O QUÊ: proíbe cor literal em qualquer arquivo de componente ou de rota.
// PARA QUÊ: RF-DS-01 e RNF-MAN-03 — um único ponto de manutenção do vocabulário visual.
// COMO: `no-restricted-syntax` sobre literais de string. A mensagem ENSINA o caminho certo, em
//       vez de só barrar — quem esbarra na regra precisa saber para onde ir.
{
  files: ["app/**/*.tsx", "components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": ["error", {
      selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla)\\(/]",
      message:
        "Cor literal é proibida fora de app/globals.css (RF-DS-01, RNF-MAN-03). " +
        "Use um token: bg-executado-fundo, text-conflito-tinta, var(--serie-1). " +
        "Falta um token? Acrescente-o em globals.css nos DOIS temas e registre no doc. 23 §1.",
    }],
  },
}
```

Complementos: **`stylelint`** sobre `globals.css` garante que todo *token* de `:root` tenha
contraparte em `.dark` (§2.2); **auditoria de contraste no CI** percorre os pares `fundo × tinta`
declarados e falha abaixo de 4.5:1 (texto) ou 3:1 (borda), nos dois temas; e **a exceção autorizada
é uma só** — `app/print/print.css`, apenas para `@page`, quebra e a normalização preto-no-branco.

### 9.4 Verificação em *pull request*

Além do *lint*, a revisão de um PR que toque o Design System confere: nenhum `"use client"` novo sem
interação real; nenhum `useTheme()` decidindo cor durante a renderização (§2.1); nenhum componente
de `components/ciaara/` importando `supabase` ou regra `RN-`; nenhum arquivo CSS por página
(`RF-DS-04`); *token* novo declarado nos dois temas e registrado neste documento; e — quando a fatia
produzir impresso — o teste de `/print/*` verde (`RNF-COMP-01`).

**Versionamento do shadcn/ui:** os arquivos de `components/ui/` são código nosso a partir do momento
em que `npx shadcn add` os copia. Atualizar um primitivo é um PR com *diff* revisado, nunca
`npm update`. Todo ajuste local (anel de foco, densidade, *token*) é comentado no próprio arquivo
com referência a este documento, para que a próxima atualização não o apague por descuido.

---

## 10. O que este documento não decide

**Microcopy** (textos de *toast*, de estado vazio e de confirmação — `RNF-USA-03` exige descrever o
efeito, não perguntar "tem certeza?") fica para a especificação de cada fatia. **Layout tela a
tela**: este documento fixa o vocabulário; a composição é do épico correspondente (5 a 13).
**Breakpoints finos**: `RNF-USA-02` mantém o desktop como uso típico, e os padrões do Tailwind
bastam até que uma tela prove o contrário. **Ilustração e ícone institucional** são ativos, não
decisão de Design System. E nada de banco, RLS, Server Action ou regra `RN-` — documentos 21, 22,
24, 25 e 04.

---

## Rastreabilidade

**Requisitos implementados:** `RF-DS-01` (§1) · `RF-DS-02` (§3, §4) · `RF-DS-03` (§2) ·
`RF-DS-03.1` **[REVISADO — v2.1]** (§2.1) · `RF-DS-04` (§9.3; exceção única em §6.3) ·
`RF-DS-05` (§3.1, §6.4) · `RF-INSTR-15` (`NomeInstrutor`) · `RF-DSA-06` (`RodapeAssinatura`) ·
`RNF-USA-01` (idioma) · `RNF-USA-02` (§5) · `RNF-USA-03` (`DialogoConfirmacao`) ·
`RNF-USA-04` (§8.4) · `RNF-USA-05` (§2) · `RNF-USA-06` (§8) · `RNF-USA-07` (§4.2) ·
`RNF-COMP-01` **[PRESERVADO E REFORÇADO]** (§6) · `RNF-COMP-02` (§6.2 item 5, §6.5) ·
`RNF-COMP-03` (§6.1) · `RNF-MAN-03` **[PRESERVADO]** (§1, §9) · `RNF-PERF-06` (esqueletos) ·
`RN-DEG-01` (§4.2) · `RN-DEG-02` (§1.4, §8.4) · `RN-CONF-01` (§4.3, fronteira) · `RN-ANT-01` (§4.2).

**Marcações de migração:** objeto `UI` **[MIGRAÇÃO v2.1]** → *tokens* + biblioteca tipada (§0.1) ·
`.aloc-verde`, `.cell-fe`, `.cell-lp` **[MIGRAÇÃO v2.1]** → *tokens* semânticos (§1.2) ·
`.mat-piscar` **[REVISADO — v2.1]** → saliência sem movimento (§3.1) · Bootstrap 5, Font Awesome 6 e
ApexCharts **[REVOGADOS — v2.1]** com substituto nomeado (§1.2) · brasões institucionais fora da
proibição de SVG **[PRESERVADO]** de UI-03 (§1.2).

**Artefatos:** `app/globals.css` · `app/print/print.css` · `components/{ui,ciaara,graficos,impressao}/` ·
`tests/e2e/impressao/`. **Documentos irmãos:** 20 (arquitetura) · 21 (schema) · 24 (repositório e
convenções) · 25 (dados e estado).

---

## 11. Pontos que dependem de confirmação do Bernardo

**11.1 — Substituição de `.mat-piscar`.** É a **única mudança de aparência** proposta em relação à
v2.0. Motivo: WCAG 2.2.2 e 2.3.1, e perda de eficácia quando muitas linhas piscam ao mesmo tempo.
Substituto: faixa lateral no *token* `conformidade` + ícone persistente + rótulo + entrada no
`AlertaConformidade`. **Confirmar** que a perda do movimento é aceitável.

**11.2 — Biblioteca de ícones.** UI-03 da v2.0 fixava **Font Awesome 6**. O shadcn/ui traz
`lucide-react` por padrão, e o BRIEF §1 proíbe biblioteca de *componentes* além de shadcn/Radix, mas
não trata de ícones. **Confirmar** `lucide-react` (recomendado: acompanha o shadcn, é
*tree-shakeable*, não depende de CDN) ou manter Font Awesome 6.

**11.3 — Cronograma impresso: A4 paisagem por trimestre, ou A3?** A proposta é A4 paisagem com
recorte por trimestre, por não pressupor impressora A3. **Confirmar** se há A3 disponível.

**11.4 — Valores exatos da paleta v2.0.** A única cor documentada na suíte é `#003366`. A rampa, os
neutros e as semânticas do §1.3 são **proposta**, construídas a partir dessa âncora e validadas em
contraste. **Confirmar contra as variáveis CSS da v2.0 ao vivo** (`_Estilos.html`) antes de
congelar: se houver valor institucional já em uso, ele prevalece.

**11.5 — `--color-ciaara-ouro`.** Acento institucional proposto (`#a67c00`), sem uso obrigatório.
**Confirmar** se cabe na identidade ou se sai.

**11.6 — Fonte Rawline auto-hospedada.** Passa a ser servida pelo repositório (`public/fontes/`).
**Confirmar a licença de redistribuição** dos arquivos `.woff2` antes do commit — a Rawline é a
fonte do padrão gov.br, mas a licença precisa ser verificada.

**11.7 — Corpo padrão de 14px.** Densidade é requisito (`RNF-USA-02`), e 14px é a consequência.
**Confirmar** com quem usa o sistema o dia inteiro, na tela real de trabalho.

**11.8 — `GradeAlocacao` vs. `GradeDsa`.** Os documentos 20 e 24 usam `GradeDsa`; o BRIEF e o Épico
4 usam `GradeAlocacao`. A reconciliação do §3.3 (primitivo + duas composições) precisa de aval para
virar convenção.

*Fim do documento 23.*
