"use client";

/**
 * O carrossel — spec 019 (Bloco 4), C-3 a C-6: **um componente só** para os cartões das turmas e as manchetes do DSA
 * do Início. Sem pacote: o encaixe é CSS (`scroll-snap`); o JavaScript só decide quando andar.
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
 */
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react";
import * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { indiceAnterior, indiceSeguinte, passaSozinho } from "@/lib/dominio/carrossel";

export function Carrossel({
  rotulo,
  intervaloMs,
  itens,
  largura,
  dataSlot,
}: {
  /** O nome do carrossel para leitor de tela — *"Turmas de 2026"*. */
  readonly rotulo: string;
  readonly intervaloMs: number;
  readonly itens: readonly React.ReactNode[];
  /** `cartao`: cabem quantos a largura deixar; `inteira`: um por vez, na largura toda. */
  readonly largura: "cartao" | "inteira";
  readonly dataSlot?: string;
}) {
  const total = itens.length;
  const trilho = React.useRef<HTMLDivElement>(null);
  const [atual, definirAtual] = React.useState(0);
  const [pausadoPeloBotao, definirPausadoPeloBotao] = React.useState(false);
  const [apontando, definirApontando] = React.useState(false);
  const [focado, definirFocado] = React.useState(false);
  const [reduzirMovimento, definirReduzirMovimento] = React.useState(false);
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

  const passando = passaSozinho({ total, pausadoPeloBotao, apontando, focado, reduzirMovimento });

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

  function aoTeclar(e: React.KeyboardEvent<HTMLElement>) {
    if (total < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      definirAtual((i) => seguinte(i));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      definirAtual((i) => indiceAnterior(i, total));
    }
  }

  if (total === 0) return null;

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
            )}
          >
            {item}
          </div>
        ))}
      </div>

      {total > 1 ? (
        <div className="flex items-center gap-2" data-slot="controles-do-carrossel">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => definirAtual((i) => indiceAnterior(i, total))}
            data-slot="carrossel-anterior"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => definirAtual((i) => seguinte(i))}
            data-slot="carrossel-proximo"
          >
            Próximo
            <ChevronRightIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={pausadoPeloBotao}
            onClick={() => definirPausadoPeloBotao((p) => !p)}
            data-slot="carrossel-pausar"
          >
            {pausadoPeloBotao ? (
              <PlayIcon aria-hidden="true" className="size-4" />
            ) : (
              <PauseIcon aria-hidden="true" className="size-4" />
            )}
            {pausadoPeloBotao ? "Continuar" : "Pausar"}
          </Button>
          <span className="text-texto-suave ml-auto text-xs tabular-nums" aria-hidden="true">
            {atual + 1} de {total}
          </span>
        </div>
      ) : null}
    </section>
  );
}
