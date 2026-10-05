/**
 * A lateral que recolhe — **o único marcador de cliente da navegação** (`FR-019`; `FR-001` a
 * `FR-008` e `FR-011` da spec 012).
 *
 * ⚠️ ELE EXISTE PARA SER PEQUENO. O marcador contamina toda a subárvore de importação: um deles na
 * casca manda **todas as telas** do sistema para o pacote do navegador. Separar o comportamento da
 * lista mantém a navegação inteira no servidor, e o erro que isto evita **não aparece na checagem de
 * tipos** — aparece no tamanho do pacote, e só quem for olhar vai ver.
 *
 * ⚠️ **ELE PASSOU A SER DONO DO `<nav>` EM 04/10/2026, E A ALTERNATIVA ERA PIOR.** O estado precisa
 * estar num ancestral da lista — é dele que saem a largura e a opacidade dos rótulos — e
 * `navegacao-lateral.tsx` **não pode** levar marcador de cliente: a proibição é nominal em
 * `tests/unidade/fronteira-casca.test.ts`. Pôr o comportamento num arquivo novo exigiria entrada nas
 * **duas** listas fechadas de folhas de cliente; dar-lhe o `<nav>` e receber a `<ul>` por conteúdo
 * **não acrescenta folha nenhuma**. A lista continua montada no servidor.
 *
 * ⚠️ **A EXPANSÃO AO APONTAR CONTINUA SENDO CSS, SEM ESTADO DE `hover` EM JAVASCRIPT**, e a razão é
 * medida: o Playwright passa o mouse **antes de todo clique**, e seis arquivos de ponta a ponta
 * clicam links deste menu. Guardar `apontado` num `useState` poria uma renderização entre o `hover` e
 * o `click` em cada um deles — a receita da instabilidade que já custou uma investigação nesta base.
 * Por `:hover`, o navegador resolve antes de o React saber que algo aconteceu.
 *
 * ⚠️ **MAS ELE GANHOU UM TERCEIRO ESTADO EM 05/10/2026, E ELE NASCEU DE UM DEFEITO MEDIDO NA TELA**
 * *(conferência de Bernardo)*: **clicar em desafixar não recolhia**. A causa é que a expansão vinha de
 * três condições irmãs — `fixada`, `:hover` e `:focus-within` —, e um clique no botão de fixar deixa
 * as **duas últimas verdadeiras**: o ponteiro está sobre a lateral e o foco está no botão. Desfixar
 * apagava só a primeira, e a largura não mudava; a lateral só recolhia quando o mouse saía.
 *
 * ⚠️ **O CONSERTO NÃO FOI TROCAR O `hover` POR ESTADO: FOI DAR AO `hover` UM PORTEIRO.**
 * `apontarBloqueado` vale `true` **só** entre o clique de desafixar e a saída do ponteiro, e nesse
 * intervalo o `:hover` não expande. Ele muda em **dois** eventos, e nenhum deles é o `hover`: no
 * clique e no `onPointerLeave`. A promessa do parágrafo acima continua de pé — não há renderização
 * entre apontar e clicar.
 *
 * ⚠️ **E O FOCO DEIXOU DE SER `:focus-within`:** ele casa com foco em **qualquer** descendente,
 * incluindo o próprio botão de fixar, e era a segunda metade do defeito. Agora a expansão por teclado
 * é `has-[[data-entrada]:focus-visible]` — foco numa **entrada do menu**, que é o que o `FR-008`
 * promete. Focar o botão de fixar não expande mais, e é o que se quer: ele é visível recolhido.
 *
 * ⚠️ **O QUE ELE GUARDA É DE TRÊS NATUREZAS, E NÃO SE MISTURAM:** `aberto` é efêmero e só vale em
 * tela estreita (a gaveta); `fixada` é **persistido em cookie** e só vale acima do ponto de quebra;
 * `apontarBloqueado` é efêmero, dura segundos e **nunca** vai para o cookie — ele morre ao sair da
 * lateral, que é exatamente a condição que o rearma. Juntá-los num estado só aplicaria as regras de
 * apontar e fixar à gaveta, que o `FR-006` proíbe.
 *
 * ⚠️ **ACIMA DO PONTO DE QUEBRA O BOTÃO DA GAVETA NÃO EXISTE E O PAINEL ESTÁ SEMPRE ABERTO** — o
 * `aberto` não tem efeito. É por isso que ele pode começar fechado sem esconder a navegação de
 * ninguém.
 *
 * ⚠️ **O ESTADO INICIAL DE `fixada` CHEGA PRONTO DO SERVIDOR.** Lê-lo aqui, no navegador, faria a
 * tela abrir recolhida e **saltar** — ver `lib/navegacao/lateral.ts`.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cookieDaLateral } from "@/lib/navegacao/lateral";

export function PainelRetratil({
  idDoPainel,
  fixadaInicial,
  children,
}: {
  readonly idDoPainel: string;
  readonly fixadaInicial: boolean;
  readonly children: React.ReactNode;
}) {
  const [aberto, definirAberto] = React.useState(false);
  const [fixada, definirFixada] = React.useState(fixadaInicial);
  /*
   * ⚠️ **O PORTEIRO DO APONTAR.** `true` só no intervalo entre desafixar e o ponteiro sair da
   *    lateral — ver o cabeçalho. Começa `false`: quem acabou de carregar a página e aponta expande.
   */
  const [apontarBloqueado, definirApontarBloqueado] = React.useState(false);

  function alternarFixada() {
    const proxima = !fixada;
    definirFixada(proxima);
    /*
     * ⚠️ **DESAFIXAR BLOQUEIA O APONTAR; FIXAR LIBERA.** Sem a segunda metade, fixar e desafixar duas
     *    vezes seguidas deixaria o bloqueio ligado com a lateral expandida — e o apontar só voltaria
     *    na próxima saída do ponteiro, sem nada na tela que explicasse por quê.
     */
    definirApontarBloqueado(!proxima);
    /*
     * ⚠️ **GRAVAR AQUI, NO NAVEGADOR, É DECISÃO — e a alternativa era uma Server Action.** Uma ação
     *    de servidor para lembrar a largura de um menu seria um endereço alcançável sem tela nenhuma,
     *    da classe que a pendência de guarda de Server Action existe para vigiar; e a casca **não
     *    pode** importar `@/lib/acoes/`, então ela teria de descer por propriedade desde o layout.
     * ⚠️ **E o proxy não encosta neste cookie:** ele só reescreve os da sessão do Supabase, então o
     *    valor chega intacto ao `cookies()` do layout na navegação seguinte.
     */
    document.cookie = cookieDaLateral(proxima, window.location.protocol === "https:");
  }

  const rotuloDoControle = fixada ? "Recolher menu" : "Fixar menu expandido";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lg:hidden"
        aria-expanded={aberto}
        aria-controls={idDoPainel}
        onClick={() => definirAberto((x) => !x)}
      >
        {/* veste: o ícone acompanha o rótulo, nunca o substitui (FR-031 da fatia b) */}
        {aberto ? (
          <XIcon aria-hidden="true" className="size-4" />
        ) : (
          <MenuIcon aria-hidden="true" className="size-4" />
        )}
        Menu
      </Button>

      <div id={idDoPainel} className={cn("lg:block", aberto ? "block" : "hidden")}>
        <nav
          aria-label="Navegação principal"
          data-slot="navegacao-lateral"
          data-fixada={fixada ? "true" : "false"}
          data-apontar={apontarBloqueado ? "bloqueado" : "livre"}
          /*
           * ⚠️ **O REARME DO APONTAR MORA AQUI, e é por isso que ele é confiável:** `onPointerLeave`
           *    do próprio `<nav>` dispara quando o ponteiro sai da lateral — a mesma fronteira que o
           *    `:hover` usa. Não há cálculo de coordenada, nem prazo, nem ouvinte no documento.
           * ⚠️ **E ELE COBRE O MOUSE E O TOQUE**: `pointer` é o evento unificado, então um toque que
           *    sai da lateral rearma do mesmo jeito.
           */
          onPointerLeave={() => definirApontarBloqueado(false)}
          className={cn(
            "group border-borda bg-superficie-2 flex flex-col",
            /*
             * ⚠️ **A LATERAL FICOU FIXA NA ALTURA DA TELA EM 05/10/2026** *(decisão de Bernardo: os
             *    ícones sempre visíveis, em qualquer rolagem)*. Antes era `lg:h-full`, que é a
             *    altura da LINHA do flex — numa página longa, a altura do conteúdo —, e a lateral
             *    rolava para fora junto com ele.
             * ⚠️ **O BLOCO CONTÊINER DO `sticky` É O `<div>` DO PAINEL, e ele MUST continuar sem
             *    `overflow`**: um `overflow` ali prenderia a lateral à caixa dele em vez de à tela,
             *    sem erro nenhum. O cabeçalho **não** é fixo, então a lateral começa logo abaixo
             *    dele e cola no alto da tela depois da primeira rolagem.
             * ⚠️ **E A ROLAGEM DA LATERAL É SÓ VERTICAL, de propósito:** `overflow-y-auto` sozinho
             *    faria o eixo horizontal computar `auto`, e o rótulo `whitespace-nowrap` de 224 px
             *    dentro da caixa de 56 px produziria uma barra horizontal na lateral recolhida.
             *    `overflow-x-hidden` é quem recorta o rótulo, como o `overflow-hidden` antigo fazia.
             */
            "lg:sticky lg:top-0 lg:h-dvh lg:shrink-0 lg:overflow-x-hidden lg:overflow-y-auto lg:border-r",
            "transition-[width] duration-150 motion-reduce:transition-none",
            /*
             * ⚠️ **A ORDEM DESTAS TRÊS LINHAS NÃO DECIDE NADA — QUEM DECIDE É O `cn`.** Ele resolve
             *    conflito de utilitário do mesmo grupo e variante: com `fixada`, `lg:w-56` vence
             *    `lg:w-14`. Escritas à mão, as duas larguras sobreviveriam e a vencedora seria a
             *    ordem de geração do CSS, que ninguém controla a partir daqui.
             * ⚠️ **AS DUAS CONDIÇÕES DE EXPANSÃO MUDARAM EM 05/10/2026** (ver o cabeçalho): o apontar
             *    passa pelo porteiro `data-apontar`, e o foco passou a exigir uma **entrada** — não
             *    `:focus-within`, que o botão de fixar também satisfazia.
             */
            "lg:w-14 lg:data-[apontar=livre]:hover:w-56 lg:has-[[data-entrada]:focus-visible]:w-56",
            fixada && "lg:w-56",
          )}
        >
          {/*
           * ⚠️ **O CONTROLE SUBIU PARA O TOPO EM 05/10/2026** *(decisão de Bernardo: acima dos
           *    ícones, sempre visível)*. Antes ele vivia no pé, com `mt-auto`.
           * ⚠️ **E O MEDO ESCRITO AQUI ANTES ERA FALSO, medido no mesmo dia:** o comentário dizia que
           *    um botão antes da lista roubaria a primeira parada de `Tab` da aplicação. Ele **não**
           *    rouba — o atalho *"Pular para o conteúdo"* é renderizado em `casca-do-app.tsx`, FORA
           *    e ANTES do `<nav>`, e entre os dois ainda há o cabeçalho com dois controles
           *    focáveis. O que o botão passa a ser é a primeira parada **dentro** da lateral, e é
           *    por isso que focá-lo **não** expande mais (ver as classes do `<nav>`): ele é
           *    legível recolhido, e expandir ao recebê-lo faria o `Tab` alargar o menu para
           *    atravessá-lo.
           * ⚠️ **E ELE NÃO EXISTE NA GAVETA** (`hidden lg:flex`): abaixo do ponto de quebra não há o
           *    que fixar — a navegação já abre inteira, e o `FR-006` manda não aplicar as regras de
           *    apontar e fixar ali.
           */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={alternarFixada}
                aria-pressed={fixada}
                data-slot="fixar-lateral"
                className={cn(
                  "text-texto-suave rounded-ciaara-sm m-2 hidden shrink-0 items-center gap-2 px-3 py-2",
                  "hover:bg-marca-suave focus-visible:ring-marca lg:flex focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                {fixada ? (
                  <PanelLeftCloseIcon aria-hidden="true" className="size-4 shrink-0" />
                ) : (
                  <PanelLeftOpenIcon aria-hidden="true" className="size-4 shrink-0" />
                )}
                {/*
                 * ⚠️ **AQUI `sr-only` É O CERTO, ao contrário do rótulo das entradas.** Este botão
                 *    **nunca** mostra texto: o nome dele existe só para leitor de tela e para o
                 *    teste, e a dica ao apontar é que o explica a quem usa mouse. É também o único
                 *    lugar da lateral com dica — nas entradas ela seria redundante, porque apontar
                 *    já expande e traz o rótulo (decisão D3 do plano).
                 */}
                <span className="sr-only">{rotuloDoControle}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{rotuloDoControle}</TooltipContent>
          </Tooltip>

          {children}
        </nav>
      </div>
    </>
  );
}
