# Spec 028 — Bloco 13: abertura com a moeda do CIAARA na página raiz

**Pedido:** Bernardo Villas Boas, 27/10/2026, pelo `/corrigir` — *"Abertura com a moeda do CIAARA na página raiz
(app/page.tsx)."* **Referência aprovada:** o protótipo `referencia-prototipo.html` (guardado nesta pasta) e as quatro
imagens de `public/abertura/` (`frente-ouro`, `verso-ouro`, `frente-prata`, `verso-prata`, `.webp` 800×800 com
transparência). **Ramo:** `feat/BLOCO-13-abertura-com-a-moeda`, a partir da `main` `6318aec`. **Sem banco.** **O papel
do DSA não muda.**

## 1. A triagem, medida na `main` `6318aec`

A raiz hoje (`app/page.tsx:22-72`) mostra o título *"CIAARA-11 · Gestão Acadêmica"*, a linha *"Divisão de Administração
Acadêmica. Ambiente: …"*, o aviso *"Configuração incompleta"* (só quando falta variável de ambiente), um parágrafo sobre o
Início com o link **"Ir para o Início"** e o rodapé da v2.0. Nada disso é defeito: o pedido é **regra nova de tela**.

| # | Item | Tipo |
|---|---|---|
| 1 | A raiz passa a mostrar **só a moeda e o botão "Início"**; saem o título, a linha da Divisão/Ambiente, o parágrafo e o rodapé | regra nova |
| 2 | O aviso **"Configuração incompleta" fica como está** (mesma marcação, mesma condição) | já existe — mantido |
| 3 | A **animação da moeda** (verso → frente, ~3,5 s), com borda espessa, subida, sombra e reflexo final | regra nova |
| 4 | **Tema**: claro ouro, escuro prata, e o fundo de cada tema | regra nova |
| 5 | O **botão "Início"** no padrão do sistema, que aparece e recebe o foco no fim | regra nova (substitui o link "Ir para o Início") |
| 6 | **Aba oculta** pausa; **Esc/clique** pula; **movimento reduzido** vai ao quadro final | regra nova |
| 7 | **Tokens de cor novos** nos três lugares | regra nova |
| 8 | **e2e** da abertura; o caso que procurava "Ir para o Início" passa a ir pelo botão novo | ajuste de teste |

**Fatos medidos que a spec respeita:**

- **A raiz exige sessão.** `SEM_SESSAO = ["/login", "/sem-configuracao", "/estilo"]` (`lib/supabase/middleware.ts:34`):
  quem chega sem sessão vai para o login. A abertura é, portanto, a tela de quem **já entrou** — a "página de
  boas-vindas pós-login". Isso **não muda** (o pedido proíbe mexer em login, autenticação, proxy e redirecionamento).
- **Sem configuração, o proxy manda para `/sem-configuracao`** antes da raiz (FR-005 da spec 001). O aviso da raiz
  continua sendo a explicação para quem chega nela; fica intacto.
- **As imagens não passam pelo proxy:** o `matcher` de `proxy.ts` exclui `.webp`.
- **Testes que dependem da raiz:** `tests/e2e/inicio.spec.ts:289-291` (clica em *"Ir para o Início"*) e
  `tests/e2e/aplicacao-sobe.spec.ts:10` (só o status < 400 — não muda). Nenhuma guarda de unidade lê os textos que saem.
- **Tokens que já existem e servem:** `--fundo`, `--superficie`, `--marca`, `--marca-contraste`, `--foco`, a rampa
  `--color-ciaara-azul-800/900`, `--radius-ciaara`, `--shadow-ciaara-2` e o anel de foco universal
  (`app/globals.css:363-367`). **Faltam** as cores próprias da moeda (borda em três tons, reflexo e sombra), que mudam
  entre ouro e prata.

## 2. Requisitos funcionais

- **FR-001 — O que a raiz mostra.** Só a moeda e, abaixo dela, o botão **"Início"**, que leva a `/inicio` (link, não
  redirecionamento). Saem o título, a linha da Divisão/Ambiente, o parágrafo sobre o Início e o rodapé da v2.0. A faixa
  Beta do topo continua (é de toda página). Para leitor de tela, a região principal se chama **"Abertura do
  CIAARA-11"** e a frente da moeda tem texto alternativo (D-11).
- **FR-002 — O aviso de configuração.** Quando falta variável de ambiente, o aviso *"Configuração incompleta"* aparece
  como hoje, com a mesma marcação e o mesmo texto, acima da moeda.
- **FR-003 — A animação** (o protótipo aprovado, os mesmos tempos):
  1. a moeda surge **no verso** (o brasão), com opacidade de 0 a 1 em 0,4 s;
  2. **zoom-out** de 1,6× para 1× em 2,5 s;
  3. **duas voltas e meia em 3D** — giro de 180° a 1080° em torno do eixo vertical, em 3 s —, parando **na frente**
     (CIAARA);
  4. **borda com espessura**: camadas empilhadas na profundidade, em degradê de três tons;
  5. **leve subida** durante o giro (sobe até 40 % do tempo e volta) e **sombra** embaixo, que aparece de 0,4 s a 1,6 s;
  6. no fim, um **reflexo metálico** passa na frente (0,75 s, de 2,75 s a 3,5 s);
  7. o **botão aparece** (0,35 s, sobe 8 px e ganha opacidade) e **recebe o foco**. Total: **cerca de 3,5 s**.
- **FR-004 — Tema.** Claro (padrão): fundo do sistema (`fundo`, com o centro em `superficie`) e moeda **ouro**. Escuro
  (a classe `dark` do provedor de tema): fundo nos azuis `ciaara-azul-900`/`800` e moeda **prata**. A troca de imagem e
  de cor acompanha o tema sem recarregar a página — também no meio da animação, que segue de onde estava (D-12).
- **FR-005 — O botão.** No padrão do sistema: fundo `marca`, texto `marca-contraste`, canto `rounded-ciaara`, fonte
  Rawline, o anel de foco do sistema. **Só é focável depois de aparecer** — antes disso não está na ordem de tabulação
  nem na árvore de acessibilidade.
- **FR-006 — Aba oculta.** A animação **só começa com a aba visível**; se a aba ficar oculta no meio, **pausa**, e
  **retoma de onde parou** quando a aba volta.
- **FR-007 — Pular.** **Esc** (em qualquer lugar da página) ou **clique** na área da abertura vai direto ao quadro final,
  com o botão visível e focado.
- **FR-008 — Movimento reduzido.** Com a preferência *"reduzir movimento"* do sistema, a página abre **no quadro
  final**: moeda na frente, botão visível e focado.
- **FR-009 — Sem cor escrita à mão.** Nenhuma cor literal fora de `app/globals.css`. Cada token novo entra **nos três
  lugares** — `app/globals.css` (nos dois temas), `lib/design/vocabulario.ts` e a vitrine `app/estilo/page.tsx`.
- **FR-010 — Fronteira.** `app/page.tsx` continua **Server Component**; a animação vive numa **folha de cliente** própria,
  declarada na lista fechada de `tests/unidade/fronteira-das-telas.test.ts`. A animação usa a API de animação nativa do
  navegador. **Nenhuma biblioteca nova.**
- **FR-011 — Fora.** Os controles *"Protótipo / Sistema / Claro / Escuro / Rever"* do protótipo **não entram**. Login,
  autenticação, proxy e redirecionamento **não mudam**.

## 3. Critérios de aceite

- **SC-001** (e2e, por clique): entrar → abrir `/` → **Esc** → o botão **"Início"** aparece e está focado → clique →
  `/inicio`.
- **SC-002** (e2e): **antes do fim**, o botão não está visível nem é alcançado pelo `Tab`.
- **SC-003** (e2e): com **movimento reduzido**, o botão está visível e focado **sem Esc**.
- **SC-004** (e2e): com a **aba oculta** no meio, as animações ficam **pausadas** e o botão não aparece; com a aba de
  volta, elas **retomam** e o botão aparece no fim; com a aba **oculta desde a abertura**, a animação **não começa** até
  a aba ficar visível.
- **SC-005** (e2e): no tema **claro**, a moeda visível é a **ouro**; no **escuro**, a **prata**.
- **SC-006** (unidade): o roteiro da animação soma **3,5 s** e tem os valores do FR-003; a máquina de estados não revela
  o botão duas vezes, não toca com a aba oculta e pula a qualquer momento.
- **SC-007**: `pnpm verificar` verde, os e2e verdes no CI, e a conferência de Bernardo no preview — desktop e celular,
  claro e escuro, e com a aba trocada no meio da animação.

## 4. Fora do escopo

- A tela de login, a faixa Beta, o título da aba do navegador (`app/layout.tsx`) e o `/sem-configuracao`.
- Lembrar que a abertura já foi vista (ela toca a cada visita à raiz, como no protótipo).

## 5. Clarifications

*(Decididas por padrão pela recomendação — Bernardo confere no fim.)*

| # | Dúvida | Escolha | Alternativa |
|---|---|---|---|
| D-1 | Onde guardar o protótipo | Nesta pasta da spec (`referencia-prototipo.html`): em `public/` ele seria **servido** a qualquer pessoa, sem sessão | Commitar em `public/abertura/` |
| D-2 | Fundo do tema claro | Degradê radial do protótipo: centro `superficie` (branco) para `fundo` | `bg-fundo` liso |
| D-3 | Tokens da moeda | **Papéis** que mudam com o tema: `moeda-borda-escura`, `moeda-borda`, `moeda-borda-clara`, `moeda-reflexo`, `moeda-sombra` — ouro no claro, prata no escuro, com os valores do protótipo | Dez estáticos (ouro e prata) trocados por `dark:` |
| D-4 | Página sem JavaScript | Um `<noscript>` com o mesmo botão **"Início"** visível: a raiz não volta a ser beco (`FR-030` da spec 008) | Nada sem JavaScript |
| D-5 | Imagem ainda carregando | A animação espera as duas faces visíveis estarem **decodificadas** (até 1,5 s) antes de começar; passado o prazo, começa assim mesmo | Começar na hora, como o protótipo |
| D-6 | Tamanho da moeda | `min(48vmin, 400px)`, como o protótipo | Tamanho fixo |
| D-7 | Clique para pular | Na área da abertura, fora do botão; o Esc vale na página inteira | Só Esc |
| D-8 | Foco no fim | Foco no botão sem rolar a página (`preventScroll`), também no movimento reduzido e no pular | Não focar no movimento reduzido |
| D-9 | Imagens | `next/image` sem otimização (os `.webp` já estão no tamanho), carregamento imediato; a frente traz o texto alternativo do protótipo, o verso é decorativo | `<img>` com isenção de lint |
| D-10 | Repetição | Toca a cada visita à raiz | Uma vez por sessão |
| D-11 | Sem título visível, como a página se identifica para quem usa leitor de tela | A região principal ganha o rótulo **"Abertura do CIAARA-11"**, e a frente da moeda traz o texto alternativo do protótipo; **sem `h1`**, porque o título saiu por pedido | Um `h1` só para leitor de tela |
| D-12 | Troca de tema no meio da animação | Imagem e cores trocam na hora (são do tema, não da animação), e a animação segue de onde estava | Reiniciar a animação |
| D-13 | Tamanho do texto do botão | O corpo do sistema (`text-base`, 14 px), como pede "no padrão do sistema"; o protótipo usava 16 px | 16 px, como o protótipo |

### Session 2026-10-27

*Todas adotadas por padrão — Bernardo confere no fim.*

- Q: Sem o título visível, como a página se apresenta para leitor de tela? → A: região principal com rótulo
  "Abertura do CIAARA-11" e o texto alternativo da moeda; sem `h1` (D-11).
- Q: O que acontece se o tema mudar no meio da animação? → A: a moeda e o fundo trocam na hora e a animação continua
  (D-12).
- D-1 a D-10 acima: decididas na especificação, pela recomendação.

## 6. Pendências

Nenhuma nova.

## 7. Verificação e revisão adversarial (27/10/2026)

- **Visto falhar antes:** o teste de unidade (módulo inexistente) e os 9 casos de `tests/e2e/abertura.spec.ts` na raiz
  antiga (o palco da abertura não existe).
- **Depois da implementação, no local:** `pnpm verificar` verde (2.863 de unidade em 214 arquivos, tipos, lint, formato e
  build); `abertura.spec.ts`, `inicio.spec.ts` e `aplicacao-sobe.spec.ts`: 22 passados e 2 pulados (os dois pulados já
  eram). Conferência visual por captura: claro e escuro, desktop (1280×800) e celular (390×844).
- **Defeitos deliberados, cada um pego:** (a) botão sem `hidden` → SC-002 (e os dois do SC-004); (b) não pausar → SC-004;
  (c) ignorar o movimento reduzido → SC-003. O original restaurado depois de cada um.
- **Revisão adversarial** (três lentes e um verificador cético): **3 defeitos confirmados, todos nos testes**, e
  corrigidos — os casos do pular por Esc e por clique passavam pelo fim natural da animação (agora esperam a fase
  `tocando` e cobram o botão em 1 s); o laço de Tab do SC-002 terminava no `body` com número par de Tabs (agora confere a
  cada Tab); o SC-004 não provava o "de onde parou" (agora compara o tempo das animações antes e depois). Também: a guarda
  da vitrine (`vitrine.spec.ts`, I-5) passou a cobrar os tokens da moeda. **4 refutados** (a transição `pausado +
  terminou`, o prazo de 1,5 s do movimento reduzido, o tamanho do texto do botão — virou a D-13 — e a I-5 sem a moeda).
- **CI do PR #103 sobre `439f528`:** verde nos três blocos nas duas execuções (588 de ponta a ponta + 7 pulados, 1
  instável em cada). Numa delas o instável foi o SC-004 da abertura, e a causa era o teste: `pause()` só congela o tempo
  no quadro seguinte, e a leitura imediata via um quadro a menos (550 ms contra 566,6 ms). Corrigido esperando `ready`. Na
  outra, `inicio.spec.ts:363`, que esta spec não toca.
- **Não refeito no local:** a nova rodada desses e2e depois das correções da revisão, e dois defeitos deliberados novos
  (sem o ouvinte do Esc; retomar do zero), foi **interrompida pelo sistema por falta de memória** na máquina e não foi
  reiniciada. A ponta a ponta inteira ficou com o CI (regra de 26/10/2026): sobre `7e6852b`, verde nos três blocos nas
  duas execuções, com **zero** falha em `abertura.spec.ts` (588 passados + 1 instável e 586 + 3 instáveis, todos fora
  desta spec, e 7 pulados). Os dois defeitos deliberados novos **não foram executados**.
- **Fechamento (28/10/2026):** aprovado por Bernardo Villas Boas e mesclado por squash em `3f8e499` (PR #103).
