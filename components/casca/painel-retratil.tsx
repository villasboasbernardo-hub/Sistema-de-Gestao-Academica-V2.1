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
 * ⚠️ **A EXPANSÃO AO APONTAR É CSS, SEM UMA LINHA DE ESTADO EM JAVASCRIPT**, e a razão é medida: o
 * Playwright passa o mouse **antes de todo clique**, e seis arquivos de ponta a ponta clicam links
 * deste menu. Guardar `apontado` num `useState` poria uma renderização entre o `hover` e o `click`
 * em cada um deles — a receita da instabilidade que já custou uma investigação nesta base. Por
 * `:hover` e `:focus-within`, o navegador resolve antes de o React saber que algo aconteceu.
 *
 * ⚠️ **O QUE ELE GUARDA É DE DUAS NATUREZAS, E NÃO SE MISTURAM:** `aberto` é efêmero e só vale em
 * tela estreita (a gaveta); `fixada` é **persistido em cookie** e só vale acima do ponto de quebra.
 * Juntá-los num estado só aplicaria as regras de apontar e fixar à gaveta, que o `FR-006` proíbe.
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

  function alternarFixada() {
    const proxima = !fixada;
    definirFixada(proxima);
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
          className={cn(
            "group border-borda bg-superficie-2 flex flex-col",
            "lg:h-full lg:shrink-0 lg:overflow-hidden lg:border-r",
            "transition-[width] duration-150 motion-reduce:transition-none",
            /*
             * ⚠️ **A ORDEM DESTAS TRÊS LINHAS NÃO DECIDE NADA — QUEM DECIDE É O `cn`.** Ele resolve
             *    conflito de utilitário do mesmo grupo e variante: com `fixada`, `lg:w-56` vence
             *    `lg:w-14`. Escritas à mão, as duas larguras sobreviveriam e a vencedora seria a
             *    ordem de geração do CSS, que ninguém controla a partir daqui.
             */
            "lg:w-14 lg:hover:w-56 lg:focus-within:w-56",
            fixada && "lg:w-56",
          )}
        >
          {children}

          {/*
           * ⚠️ **O CONTROLE VEM DEPOIS DA LISTA, E ISSO É ORDEM DE TABULAÇÃO, NÃO ESTÉTICA.** A
           *    primeira parada de `Tab` na aplicação é o atalho "Pular para o conteúdo", e há caso
           *    de acessibilidade que o cobra; um botão antes da lista roubaria essa posição.
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
                  "text-texto-suave rounded-ciaara-sm m-2 mt-auto hidden items-center gap-2 px-3 py-2",
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
        </nav>
      </div>
    </>
  );
}
