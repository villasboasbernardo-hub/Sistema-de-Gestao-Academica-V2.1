# Plano 028 — Bloco 13: abertura com a moeda do CIAARA

**Spec:** [spec.md](./spec.md) · **Ramo:** `feat/BLOCO-13-abertura-com-a-moeda` · **Sem banco, sem migration.**

## 1. Contexto técnico

- Next.js 16 (App Router), React 19, Tailwind v4 com os tokens de `app/globals.css`, `next-themes` com a classe `dark`
  (`defaultTheme="system"`, `components/ciaara/provedor-de-tema.tsx`). Fonte Rawline pelo `next/font` (`font-sans`).
- **A raiz exige sessão** (`lib/supabase/middleware.ts:34`); depois do login sem destino, a pessoa cai em `/`
  (`DESTINO_PADRAO`, `lib/navegacao/destino-seguro.ts:22`) — a abertura é a tela de boas-vindas. Nada disso muda.
- **Animação:** a API de animação nativa do navegador (`Element.animate`), sem biblioteca. As imagens servidas de
  `public/abertura/` não passam pelo proxy (o `matcher` exclui `.webp`).

## 2. Checagem da constituição

| Princípio | Como o plano cumpre |
|---|---|
| III · Plataforma | Server Component na página, **uma** folha de cliente declarada, Tailwind e tokens; nenhuma biblioteca nova |
| VI · Mudança cirúrgica | Só a raiz, os tokens da moeda (três lugares), a vitrine e os testes. Login, proxy e redirecionamento intocados |
| VII · Configuração sobre constante | Cor só em `app/globals.css`; os tempos da animação vivem num módulo puro e testado, não espalhados no componente |
| X · Paridade antes de novidade | **Novidade autorizada nominalmente** (pedido de Bernardo de 27/10/2026); não toca dado nem regra de negócio |
| XI · O banco é a fronteira | Sem leitura nem escrita de dado |

Nenhuma violação. Reavaliado depois do desenho: igual.

## 3. Desenho

### 3.1 Arquivos

| Arquivo | O quê |
|---|---|
| `lib/design/abertura-da-moeda.ts` (novo, puro) | O **roteiro** da animação (alvos, quadros, tempos, curvas — os valores do protótipo), `DURACAO_TOTAL_MS = 3500`, a revelação do botão e a **máquina de estados** `transicao(fase, evento)` |
| `tests/unidade/abertura-da-moeda.test.ts` (novo) | Roteiro (soma 3,5 s, verso→frente, 180°→1080°, 1,6×→1×) e máquina de estados (visto falhar antes) |
| `app/AberturaComMoeda.tsx` (novo, `"use client"`) | O palco: moeda com 16 camadas de borda, faces ouro e prata, sombra, reflexo; liga roteiro e máquina às imagens, à visibilidade da aba, ao Esc, ao clique e ao movimento reduzido; o botão **"Início"** |
| `app/page.tsx` | Continua Server Component: o aviso de configuração como está e a folha da abertura; sai o resto |
| `app/globals.css` | Cinco papéis novos nos dois temas e a exposição em `@theme inline` |
| `lib/design/vocabulario.ts` | A lista `MOEDA` e a inclusão em `PAPEIS` |
| `app/estilo/page.tsx` | A seção *"Moeda da abertura"* na vitrine |
| `tests/unidade/fronteira-das-telas.test.ts` | A folha nova declarada, com o motivo |
| `tests/e2e/abertura.spec.ts` (novo) | SC-001 a SC-005 |
| `tests/e2e/inicio.spec.ts` | O caso `FR-030` passa pelo botão novo |
| `public/abertura/*.webp` | As quatro imagens |

### 3.2 Os tokens (D-3)

Papéis em `:root` (ouro) e `.dark` (prata), valores do protótipo, todos em hex (o leitor de `globals.css` reconhece papel
de cor por hex, `lib/design/ler-globals.ts:54`):

| Papel | Claro (ouro) | Escuro (prata) | Uso |
|---|---|---|---|
| `--moeda-borda-escura` | `#4a3410` | `#34363b` | pontas do degradê da borda |
| `--moeda-borda` | `#6e4f1c` | `#5b5d63` | meio-tom da borda |
| `--moeda-borda-clara` | `#e3c477` | `#e6e7ea` | o brilho do centro da borda |
| `--moeda-reflexo` | `#fff5d5c0` | `#f2f6ffc8` | o reflexo metálico final |
| `--moeda-sombra` | `#0f172047` | `#00000099` | a sombra embaixo (`rgb(15 23 32 / .28)` e `rgb(0 0 0 / .6)` do protótipo) |

O **fundo** usa só tokens que já existem (D-2): claro `radial-gradient(… var(--superficie) 0%, var(--fundo) 70%)`, escuro
`var(--color-ciaara-azul-800)` → `var(--color-ciaara-azul-900)`, em classe de valor arbitrário com a variante `dark:`.
⚠️ **Não `bg-radial-…`**: a invariante `I-4c` (`tests/unidade/token-de-cor-existe.test.ts`) leria `radial` como nome de
cor e reprovaria; o valor arbitrário começa por `[` e não é lido como sufixo.

### 3.3 O roteiro (FR-003), em milissegundos

| Alvo | Quadros | Duração | Atraso | Curva |
|---|---|---|---|---|
| aproximação (opacidade) | 0 → 1 | 400 | 0 | `ease-out` |
| aproximação (zoom) | `scale(1.6)` → `scale(1)` | 2500 | 0 | `cubic-bezier(.2,.7,.2,1)`, `composite: add` |
| moeda (giro) | `rotateY(180deg)` → `rotateY(1080deg)` | 3000 | 0 | `cubic-bezier(.3,.05,.15,1)` |
| subida | `translateZ(0) rotateX(0)` → `translateZ(60px) rotateX(8deg)` em 40 % → volta | 3000 | 0 | `ease-in-out` |
| sombra | opacidade 0 → 1 | 1200 | 400 | linear |
| reflexo (frente) | `background-position 130% 0` → `-30% 0` | 750 | 2750 | `ease-in-out` |
| botão (depois do reflexo) | opacidade 0 e `translateY(8px)` → visível | 350 | — | `cubic-bezier(.2,.7,.2,1)` |

Total até o botão: **3500 ms** (2750 + 750). Todos com `fill: both`.

### 3.4 A máquina de estados (FR-006 a FR-008)

`fase ∈ { aguardando, tocando, pausado, fim }`, eventos `visivel`, `oculta`, `pular`, `terminou`:

| Fase | `visivel` | `oculta` | `pular` | `terminou` |
|---|---|---|---|---|
| aguardando | tocando · **iniciar** | — | fim · **iniciar e finalizar** | — |
| tocando | — | pausado · **pausar** | fim · **finalizar** | fim · **revelar** |
| pausado | tocando · **retomar** | — | fim · **finalizar** | — |
| fim | — | — | — | — |

*Finalizar* = levar toda animação ao quadro final e **revelar** o botão. A folha só despacha `visivel` quando a aba está
visível **e** as faces visíveis estão decodificadas (ou passou 1,5 s — D-5). Movimento reduzido = `visivel` seguido de
`pular` na mesma volta (o quadro final direto, como o protótipo).

### 3.5 O contrato de tela (o que os testes e a conferência leem)

- `main` da raiz: `aria-label="Abertura do CIAARA-11"` (D-11).
- O palco: `data-slot="abertura"` e **`data-fase`** com a fase da máquina (`aguardando`/`tocando`/`pausado`/`fim`).
- Cada imagem: `data-face="frente|verso"` e `data-metal="ouro|prata"`; ouro com `dark:hidden`, prata com `hidden
  dark:block`.
- O botão: um `Link` para `/inicio` com o texto **"Início"**, `data-slot="ir-ao-inicio"`; até a revelação, com o
  atributo `hidden` (fora da tabulação e da árvore de acessibilidade — FR-005). Um `<noscript>` traz o mesmo link
  visível (D-4).

### 3.6 Imagens (D-9)

`next/image` com `unoptimized` (os `.webp` já têm 800 px), `width`/`height` 800 e carregamento imediato. A máscara do
reflexo usa a imagem da frente do metal do tema, por variável CSS trocada com `dark:` (valor de URL, sem cor).

## 4. Testes

- **Unidade, visto falhar antes:** roteiro e máquina (`abertura-da-moeda.test.ts`). As guardas existentes cobrem o resto:
  `vocabulario.test.ts` (os papéis novos nos dois temas e expostos), `token-de-cor-existe.test.ts`,
  `fronteira-das-telas.test.ts`, `lint/regra-de-cor`.
- **e2e por clique** (`abertura.spec.ts`): entrar → `/` → Esc → botão focado → clique → `/inicio` (SC-001) e o pular
  por clique; antes do fim o botão está oculto e o `Tab` não o alcança (SC-002); movimento reduzido (SC-003); aba
  oculta pausa e retoma, e oculta desde o início não começa (SC-004, simulando `visibilityState`); ouro no claro e prata
  no escuro (SC-005, `emulateMedia`).
- **Defeitos deliberados:** (a) botão sem `hidden` antes do fim → SC-002 reprova; (b) não pausar na aba oculta →
  SC-004 reprova; (c) ignorar o movimento reduzido → SC-003 reprova.
- **Ponta a ponta inteira:** fica com o CI (regra de 26/10/2026, Bloco 11).

## 5. Riscos

- **`next/image` no Next 16:** confirmar a propriedade de carregamento prioritário na versão instalada antes de usar.
- **Modo estrito do React em desenvolvimento** roda o efeito duas vezes: a limpeza cancela as animações e tira os
  ouvintes.
- **Sem JavaScript**, a moeda fica no quadro inicial invisível (opacidade 0): o `<noscript>` mostra o botão.

## 6. Artefatos

- Não há modelo de dados nem contrato externo: a abertura não lê nem grava dado. O contrato de tela está no §3.5.
- O guia de conferência (o *quickstart*) é [roteiro-de-conferencia.md](./roteiro-de-conferencia.md).
