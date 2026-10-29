"use client";

/**
 * O carrossel — spec 019 (Bloco 4), C-3 a C-6: **um componente só** para os cartões das turmas e os DSA publicados do
 * Início. Sem pacote: o encaixe é CSS (`scroll-snap`); o JavaScript só decide quando andar.
 *
 * ⚠️ **QUEM DECIDE SE ELE PASSA SOZINHO É `passaSozinho`** (`lib/dominio/carrossel.ts`): o botão *Pausar*, o ponteiro
 *    em cima, o foco dentro e o *"reduzir movimento"* do sistema seguram (WCAG 2.2.2). Com movimento reduzido, a
 *    rolagem também deixa de ser suave.
 * ⚠️ **O PADRÃO DE CARROSSEL DA WAI-ARIA**: `aria-roledescription` no todo e nos itens, cada item rotulado "N de M", e a
 *    região viva desligada enquanto gira — ligada, ela anunciaria um item a cada passo.
 * ⚠️ **O COMPONENTE NÃO CONHECE A ORIGEM DOS ITENS** (Princípio XI; `fronteira-componentes`): eles chegam prontos,
 *    desenhados no servidor.
 * ⚠️ **COM VÁRIOS ITENS À VISTA, O FIM É O FIM DA ROLAGEM**: quando o último cartão já está na tela, o passo seguinte
 *    volta ao começo — senão o carrossel "andaria" sem mexer até o índice chegar ao último.
 * ⚠️ **AS SETAS FICAM NAS LATERAIS, CENTRADAS NA VERTICAL** (Bloco 15, spec 030, `FR-002`, D-4 e D-5; RT-1 emendada):
 *    *"carrossel com ícones de seta nas laterais do papel, centralizadas na vertical. Dica só com o verbo"* — Bernardo
 *    Villas Boas, 29/10/2026. Ícones, com o mesmo `data-slot` de antes; os itens ganham um respiro dos dois lados para
 *    que a seta nunca fique sobre o conteúdo. *Pausar* também virou ícone, ao lado do *N de M*, embaixo. Vale para os
 *    dois carrosséis do Início, porque é um componente só.
 * ⚠️ **A TELA CHEIA É DO CARROSSEL** (Bloco 15, `FR-001`, D-2, D-3 e D-22), quando quem o usa pede (`telaCheia`): clicar
 *    num item — ou focá-lo e apertar `Enter` ou `Espaço` — abre uma sobreposição na janela inteira com o **mesmo
 *    elemento** do item (o servidor o mandou uma vez só; a tela cheia o desenha de novo), *Sair da tela cheia* no canto
 *    superior direito, `Esc`, e as setas (e `←`/`→`) trocando de item. O índice é um só: ao fechar, o carrossel está no
 *    último item visto, e o foco volta a ele. Com a sobreposição aberta o carrossel não passa sozinho (o foco está nela).
 *    Quem desenha o item sabe que está na tela cheia por `EmTelaCheia`.
 */
import { Dialog as DialogPrimitivo } from "radix-ui";
import * as React from "react";
import { cn } from "cn";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { indiceAnterior, indiceSeguinte, passaSozinho } from "@/lib/dominio/carrossel";

/** Verdadeiro dentro da tela cheia do carrossel — o papel do DSA se amplia ao máximo que cabe (`EscalaDoPapel`). */
export const EmTelaCheia = React.createContext(false);

export function Carrossel({
  rotulo,
  intervaloMs,
  itens,
  largura,
  dataSlot,
  telaCheia,
}: {
  /** O nome do carrossel para leitor de tela — *"Turmas de 2026"*. */
  readonly rotulo: string;
  readonly intervaloMs: number;
  readonly itens: readonly React.ReactNode[];
  /** `cartao`: cabem quantos a largura deixar; `inteira`: um por vez, na largura toda. */
  readonly largura: "cartao" | "inteira";
  readonly dataSlot?: string;
  /**
   * A tela cheia (Bloco 15): o nome de cada item, na ordem dos itens, para o botão que a abre e para o título da
   * sobreposição. ⚠️ Uma LISTA, e não uma função: a página é servidor, e função não atravessa a fronteira. Ausente, os
   * itens não se ampliam.
   */
  readonly telaCheia?: { readonly nomes: readonly string[] };
}) {
  const total = itens.length;
  const trilho = React.useRef<HTMLDivElement>(null);
  const [atual, definirAtual] = React.useState(0);
  const [pausadoPeloBotao, definirPausadoPeloBotao] = React.useState(false);
  const [apontando, definirApontando] = React.useState(false);
  const [focado, definirFocado] = React.useState(false);
  const [reduzirMovimento, definirReduzirMovimento] = React.useState(false);
  const [ampliado, definirAmpliado] = React.useState(false);
  /* O índice veio da rolagem da própria pessoa: não rolar de novo até ele. */
  const vindoDaRolagem = React.useRef(false);
  /*
   * ⚠️ **O ALVO DA ROLAGEM QUE O PRÓPRIO CARROSSEL DISPAROU**: a rolagem suave emite eventos no meio do caminho, e sem
   *    isto o `aoRolar` leria o item de PARTIDA como o mais perto e voltaria o índice — o carrossel brigaria com ele mesmo.
   */
  const alvo = React.useRef<number | null>(null);

  React.useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => definirReduzirMovimento(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  const passando = passaSozinho({
    total,
    pausadoPeloBotao,
    apontando,
    focado: focado || ampliado,
    reduzirMovimento,
  });

  /** O próximo, ou o começo quando o último já está à vista. */
  const seguinte = React.useCallback(
    (de: number) => {
      const t = trilho.current;
      if (t && t.scrollLeft + t.clientWidth >= t.scrollWidth - 2) return 0;
      return indiceSeguinte(de, total);
    },
    [total],
  );

  React.useEffect(() => {
    if (!passando) return;
    const relogio = window.setInterval(() => definirAtual((i) => seguinte(i)), intervaloMs);
    return () => window.clearInterval(relogio);
  }, [passando, intervaloMs, seguinte]);

  React.useEffect(() => {
    if (vindoDaRolagem.current) {
      vindoDaRolagem.current = false;
      return;
    }
    const t = trilho.current;
    const item = t?.querySelectorAll<HTMLElement>('[data-slot="item-do-carrossel"]')[atual];
    if (!t || !item) return;
    /* Já está lá (ou não há como ir além do fim): sem rolagem, sem evento — e sem alvo, que ficaria preso. */
    const destino = Math.min(item.offsetLeft, t.scrollWidth - t.clientWidth);
    if (Math.abs(t.scrollLeft - destino) < 2) return;
    alvo.current = atual;
    t.scrollTo({ left: destino, behavior: reduzirMovimento ? "auto" : "smooth" });
  }, [atual, reduzirMovimento]);

  /* A pessoa rolou o trilho (toque, roda, barra): o "N de M" acompanha. */
  function aoRolar() {
    const t = trilho.current;
    if (!t) return;
    const itensDoTrilho = [...t.querySelectorAll<HTMLElement>('[data-slot="item-do-carrossel"]')];
    let perto = 0;
    let menor = Number.POSITIVE_INFINITY;
    itensDoTrilho.forEach((el, i) => {
      const d = Math.abs(el.offsetLeft - t.scrollLeft);
      if (d < menor) {
        menor = d;
        perto = i;
      }
    });
    if (alvo.current !== null) {
      /* Chegou ao alvo, ou ao fim da rolagem (com vários à vista o último não encosta à esquerda). */
      if (perto === alvo.current || t.scrollLeft + t.clientWidth >= t.scrollWidth - 2) {
        alvo.current = null;
      }
      return;
    }
    if (perto !== atual) {
      vindoDaRolagem.current = true;
      definirAtual(perto);
    }
  }

  const anteriorDe = (i: number) => indiceAnterior(i, total);

  function aoTeclar(e: React.KeyboardEvent<HTMLElement>) {
    if (total < 2 || ampliado) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      definirAtual((i) => seguinte(i));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      definirAtual(anteriorDe);
    }
  }

  function abrirNaTelaCheia(indice: number) {
    definirAtual(indice);
    definirAmpliado(true);
  }

  if (total === 0) return null;
  const comSetas = total > 1;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label={rotulo}
      data-slot={dataSlot ?? "carrossel"}
      data-carrossel="sim"
      data-passando={passando ? "true" : "false"}
      data-atual={atual}
      className="flex flex-col gap-2"
      onPointerEnter={() => definirApontando(true)}
      onPointerLeave={() => definirApontando(false)}
      onFocus={() => definirFocado(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) definirFocado(false);
      }}
      onKeyDown={aoTeclar}
    >
      <div className="relative">
        <div
          ref={trilho}
          data-slot="trilho-do-carrossel"
          aria-live={passando ? "off" : "polite"}
          onScroll={aoRolar}
          className={cn(
            "relative flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1",
            reduzirMovimento ? "" : "scroll-smooth",
          )}
        >
          {itens.map((item, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}`}
              data-slot="item-do-carrossel"
              data-atual={i === atual ? "true" : "false"}
              className={cn(
                "shrink-0 snap-start",
                /* Ajuste A-2 de 20/10/2026: os cartões do Início ficaram maiores (eram 20rem). */
                largura === "inteira" ? "w-full" : "w-[min(26rem,90%)]",
                /* O respiro das setas laterais (Bloco 15): elas nunca ficam sobre o conteúdo. */
                comSetas && largura === "inteira" ? "px-11" : "",
              )}
            >
              {telaCheia ? (
                /*
                 * ⚠️ O ITEM INTEIRO É O BOTÃO DA TELA CHEIA (`FR-001`): *"clicar no papel do DSA no Início abre o DSA em
                 *    tela cheia (…) Enter no papel abre"*. `role="button"` e não `<button>`, porque o papel tem títulos e
                 *    tabelas, que um `<button>` não admite.
                 */
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir em tela cheia: ${telaCheia.nomes[i] ?? ""}`}
                  data-slot="abrir-tela-cheia"
                  className="focus-visible:ring-marca rounded-ciaara cursor-zoom-in focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => abrirNaTelaCheia(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      abrirNaTelaCheia(i);
                    }
                  }}
                >
                  {item}
                </div>
              ) : (
                item
              )}
            </div>
          ))}
        </div>

        {comSetas ? (
          <>
            <BotaoDeIcone
              acao="voltar"
              rotulo={`Item anterior: ${rotulo}`}
              ladoDaDica="right"
              className="absolute top-1/2 left-0 -translate-y-1/2"
              onClick={() => definirAtual(anteriorDe)}
              data-slot="carrossel-anterior"
            />
            <BotaoDeIcone
              acao="avancar"
              rotulo={`Item seguinte: ${rotulo}`}
              ladoDaDica="left"
              className="absolute top-1/2 right-0 -translate-y-1/2"
              onClick={() => definirAtual((i) => seguinte(i))}
              data-slot="carrossel-proximo"
            />
          </>
        ) : null}
      </div>

      {comSetas ? (
        <div className="flex items-center justify-end gap-2" data-slot="controles-do-carrossel">
          <span className="text-texto-suave text-xs tabular-nums" aria-hidden="true">
            {atual + 1} de {total}
          </span>
          <BotaoDeIcone
            acao={pausadoPeloBotao ? "continuar" : "pausar"}
            rotulo={pausadoPeloBotao ? `Continuar: ${rotulo}` : `Pausar: ${rotulo}`}
            variante="fantasma"
            aria-pressed={pausadoPeloBotao}
            onClick={() => definirPausadoPeloBotao((p) => !p)}
            data-slot="carrossel-pausar"
          />
        </div>
      ) : null}

      {telaCheia ? (
        <TelaCheia
          aberta={ampliado}
          aoFechar={() => definirAmpliado(false)}
          titulo={telaCheia.nomes[atual] ?? ""}
          comSetas={comSetas}
          anterior={() => definirAtual(anteriorDe)}
          seguinte={() => definirAtual((i) => indiceSeguinte(i, total))}
          posicao={`${atual + 1} de ${total}`}
        >
          {itens[atual]}
        </TelaCheia>
      ) : null}
    </section>
  );
}

/**
 * A sobreposição da tela cheia (Bloco 15, `FR-001`): a janela inteira, o item ampliado no centro, *Sair da tela cheia*
 * no canto superior direito e as setas nas laterais. O `Dialog` do Radix dá o `Esc`, o foco preso e a devolução do foco.
 */
function TelaCheia({
  aberta,
  aoFechar,
  titulo,
  comSetas,
  anterior,
  seguinte,
  posicao,
  children,
}: {
  readonly aberta: boolean;
  readonly aoFechar: () => void;
  readonly titulo: string;
  readonly comSetas: boolean;
  readonly anterior: () => void;
  readonly seguinte: () => void;
  readonly posicao: string;
  readonly children: React.ReactNode;
}) {
  return (
    <DialogPrimitivo.Root open={aberta} onOpenChange={(v) => (v ? undefined : aoFechar())}>
      <DialogPrimitivo.Portal>
        <DialogPrimitivo.Overlay className="bg-fundo fixed inset-0 z-50" />
        <DialogPrimitivo.Content
          className="bg-fundo text-texto fixed inset-0 z-50 flex flex-col focus:outline-none"
          data-slot="tela-cheia"
          onKeyDown={(e) => {
            if (!comSetas) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              seguinte();
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              anterior();
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <DialogPrimitivo.Title className="text-texto-suave text-sm">
              {titulo}
              {comSetas ? ` · ${posicao}` : ""}
            </DialogPrimitivo.Title>
            <DialogPrimitivo.Description className="sr-only">
              O papel ampliado. Esc ou o botão Sair da tela cheia fecham; as setas trocam de papel.
            </DialogPrimitivo.Description>
            <DialogPrimitivo.Close asChild>
              <BotaoDeIcone
                acao="sair-da-tela-cheia"
                rotulo="Sair da tela cheia"
                ladoDaDica="left"
                data-slot="sair-da-tela-cheia"
              />
            </DialogPrimitivo.Close>
          </div>
          {/*
            ⚠️ O ITEM OCUPA A ALTURA QUE SOBRA, e a legenda dele (a `figcaption`) vai para o título acima — dita uma vez só.
          */}
          <div className="relative min-h-0 flex-1 px-14 pb-4">
            <div
              className="flex h-full min-h-0 flex-col [&_figcaption]:hidden [&_figure]:h-full [&_figure]:min-h-0"
              data-slot="conteudo-da-tela-cheia"
            >
              <EmTelaCheia.Provider value={true}>{children}</EmTelaCheia.Provider>
            </div>
            {comSetas ? (
              <>
                <BotaoDeIcone
                  acao="voltar"
                  rotulo={`Item anterior: ${titulo}`}
                  ladoDaDica="right"
                  className="absolute top-1/2 left-2 -translate-y-1/2"
                  onClick={anterior}
                  data-slot="tela-cheia-anterior"
                />
                <BotaoDeIcone
                  acao="avancar"
                  rotulo={`Item seguinte: ${titulo}`}
                  ladoDaDica="left"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={seguinte}
                  data-slot="tela-cheia-proximo"
                />
              </>
            ) : null}
          </div>
        </DialogPrimitivo.Content>
      </DialogPrimitivo.Portal>
    </DialogPrimitivo.Root>
  );
}
