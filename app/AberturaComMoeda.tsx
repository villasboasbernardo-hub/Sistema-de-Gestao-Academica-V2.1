"use client";

/**
 * A abertura com a moeda do CIAARA na raiz (spec 028, Bloco 13) — a única folha de cliente da raiz.
 *
 * ⚠️ **EXCEÇÃO DECLARADA À REGRA DO SERVER COMPONENT** (FR-010): `app/page.tsx` continua de servidor; só a animação
 *    precisa do navegador — a aba visível, o Esc, o clique, o movimento reduzido e a API de animação nativa
 *    (`Element.animate`). Nenhuma biblioteca.
 * ⚠️ **O ROTEIRO E A MÁQUINA NÃO MORAM AQUI**: os tempos e as transições estão em `lib/design/abertura-da-moeda.ts`,
 *    testados. Esta folha só aplica o roteiro aos elementos e despacha os eventos da página.
 * ⚠️ **A COR NÃO MORA AQUI**: a borda, o reflexo e a sombra são os papéis `--moeda-*` de `app/globals.css` (ouro no
 *    claro, prata no escuro); o fundo é da página. Aqui só há `var(--…)`.
 * ⚠️ **O BOTÃO SÓ EXISTE PARA O TECLADO DEPOIS DE APARECER** (FR-005): até a revelação ele tem o atributo `hidden`, que o
 *    tira da tabulação e da árvore de acessibilidade. Sem JavaScript, o `<noscript>` mostra o mesmo botão (D-4).
 */
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  ESPERA_MAXIMA_DAS_IMAGENS_MS,
  REVELACAO_DO_BOTAO,
  ROTEIRO,
  transicao,
  type Alvo,
  type Efeito,
  type Evento,
  type Fase,
} from "@/lib/design/abertura-da-moeda";

/** O texto alternativo da frente — o do protótipo aprovado. O verso (o brasão) é decorativo. */
const TEXTO_DA_FRENTE =
  "Moeda do CIAARA: marinheiro com sextante, farol e navio, com os dizeres CIAARA e Formando do Nauta à Estrela-Guia";

/** A borda com espessura: 16 discos empilhados na profundidade. */
const CAMADAS_DA_BORDA = Array.from({ length: 16 }, (_, i) => i);

const BORDA =
  "linear-gradient(90deg, var(--moeda-borda-escura), var(--moeda-borda) 20%, var(--moeda-borda-clara) 48%, " +
  "var(--moeda-borda) 78%, var(--moeda-borda-escura))";
const REFLEXO =
  "linear-gradient(105deg, transparent 36%, transparent 41%, var(--moeda-reflexo) 50%, transparent 59%, " +
  "transparent 64%)";
const SOMBRA = "radial-gradient(ellipse, var(--moeda-sombra), transparent 70%)";

/** O tamanho da moeda (D-6) e a espessura da borda, como no protótipo. */
const MEDIDAS = {
  "--moeda": "min(48vmin, 400px)",
  "--espessura": "calc(var(--moeda) * 0.06)",
  width: "var(--moeda)",
  height: "var(--moeda)",
} as React.CSSProperties;

/** As classes de cada face: o disco que esconde as costas, para só uma face aparecer de cada vez. */
const FACE =
  "absolute inset-0 isolate overflow-hidden rounded-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
const IMAGEM = "pointer-events-none absolute inset-0 size-full select-none";

export function AberturaComMoeda() {
  const aproximacao = React.useRef<HTMLDivElement>(null);
  const moeda = React.useRef<HTMLDivElement>(null);
  const subida = React.useRef<HTMLDivElement>(null);
  const sombra = React.useRef<HTMLDivElement>(null);
  const reflexo = React.useRef<HTMLDivElement>(null);
  const palco = React.useRef<HTMLDivElement>(null);
  const botao = React.useRef<HTMLAnchorElement>(null);
  /** O despacho vive no efeito; o clique o alcança por aqui. */
  const despachar = React.useRef<(evento: Evento) => void>(() => {});
  const reduzido = React.useRef(false);

  const [fase, definirFase] = React.useState<Fase>("aguardando");
  const [revelado, definirRevelado] = React.useState(false);

  React.useEffect(() => {
    const alvos: Record<Alvo, HTMLElement | null> = {
      aproximacao: aproximacao.current,
      moeda: moeda.current,
      subida: subida.current,
      sombra: sombra.current,
      reflexo: reflexo.current,
    };
    let faseAtual: Fase = "aguardando";
    let animacoes: Animation[] = [];
    let prontas = false;
    let desmontado = false;
    reduzido.current = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function iniciar() {
      animacoes = ROTEIRO.flatMap((passo) => {
        const alvo = alvos[passo.alvo];
        return alvo ? [alvo.animate([...passo.quadros], { ...passo.opcoes })] : [];
      });
      // O roteiro termina quando a última animação termina — o reflexo, aos 3,5 s.
      Promise.all(animacoes.map((a) => a.finished))
        .then(() => despachar.current("terminou"))
        .catch(() => {});
    }

    function finalizar() {
      for (const a of animacoes) {
        try {
          a.finish();
        } catch {
          /* animação já cancelada: não há quadro final a alcançar */
        }
      }
    }

    function aplicar(efeito: Efeito) {
      if (efeito === "iniciar") iniciar();
      else if (efeito === "iniciar-e-finalizar") {
        iniciar();
        finalizar();
        definirRevelado(true);
      } else if (efeito === "pausar") {
        for (const a of animacoes) if (a.playState === "running") a.pause();
      } else if (efeito === "retomar") {
        for (const a of animacoes) if (a.playState === "paused") a.play();
      } else if (efeito === "finalizar") {
        finalizar();
        definirRevelado(true);
      } else if (efeito === "revelar") definirRevelado(true);
    }

    despachar.current = (evento) => {
      if (desmontado) return;
      const proxima = transicao(faseAtual, evento);
      faseAtual = proxima.fase;
      definirFase(proxima.fase);
      aplicar(proxima.efeito);
    };

    const visivel = () => document.visibilityState === "visible";
    function aoMudarAba() {
      if (!visivel()) despachar.current("oculta");
      else if (prontas) despachar.current("visivel");
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") despachar.current("pular");
    }
    document.addEventListener("visibilitychange", aoMudarAba);
    window.addEventListener("keydown", aoTeclar);

    if (reduzido.current) {
      // FR-008: com movimento reduzido, o quadro final direto.
      despachar.current("pular");
    } else {
      // D-5: espera as faces que o tema mostra ficarem prontas para desenhar — no máximo 1,5 s.
      const faces = [...(palco.current?.querySelectorAll("img") ?? [])].filter(
        (img) => getComputedStyle(img).display !== "none",
      );
      const decodificadas = Promise.all(faces.map((img) => img.decode().catch(() => undefined)));
      const prazo = new Promise((resolver) => setTimeout(resolver, ESPERA_MAXIMA_DAS_IMAGENS_MS));
      void Promise.race([decodificadas, prazo]).then(() => {
        prontas = true;
        if (visivel()) despachar.current("visivel");
      });
    }

    return () => {
      desmontado = true;
      document.removeEventListener("visibilitychange", aoMudarAba);
      window.removeEventListener("keydown", aoTeclar);
      for (const a of animacoes) a.cancel();
    };
  }, []);

  React.useEffect(() => {
    if (!revelado) return;
    const alvo = botao.current;
    if (!alvo) return;
    if (!reduzido.current) alvo.animate([...REVELACAO_DO_BOTAO.quadros], REVELACAO_DO_BOTAO.opcoes);
    alvo.focus({ preventScroll: true });
  }, [revelado]);

  return (
    <div
      ref={palco}
      data-slot="abertura"
      data-fase={fase}
      onClick={(evento) => {
        // D-7: o clique fora do botão pula; no botão, é navegação.
        if (!(evento.target as HTMLElement).closest("a")) despachar.current("pular");
      }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(40px,8vh,72px)] overflow-hidden px-4 py-8"
    >
      <div data-slot="moeda" className="relative flex-none" style={MEDIDAS}>
        <div
          ref={sombra}
          aria-hidden="true"
          className="absolute inset-x-[14%] -bottom-[11%] h-[8%] rounded-[50%] blur-[6px]"
          style={{ background: SOMBRA, opacity: 0 }}
        />
        <div
          ref={aproximacao}
          className="absolute inset-0 [perspective:1400px]"
          style={{ opacity: 0 }}
        >
          <div ref={subida} className="absolute inset-0 [transform-style:preserve-3d]">
            <div
              ref={moeda}
              className="absolute inset-0 [transform-style:preserve-3d]"
              style={{ transform: "rotateY(180deg)" }}
            >
              {CAMADAS_DA_BORDA.map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="absolute inset-[0.6%] rounded-full"
                  style={{
                    background: BORDA,
                    transform: `translateZ(calc(var(--espessura) * (${i} / 15 - 0.5)))`,
                  }}
                />
              ))}

              <div className={FACE} style={{ transform: "translateZ(calc(var(--espessura) / 2))" }}>
                <Image
                  src="/abertura/frente-ouro.webp"
                  alt={TEXTO_DA_FRENTE}
                  width={800}
                  height={800}
                  unoptimized
                  loading="eager"
                  draggable={false}
                  data-face="frente"
                  data-metal="ouro"
                  className={`${IMAGEM} dark:hidden`}
                />
                <Image
                  src="/abertura/frente-prata.webp"
                  alt={TEXTO_DA_FRENTE}
                  width={800}
                  height={800}
                  unoptimized
                  loading="eager"
                  draggable={false}
                  data-face="frente"
                  data-metal="prata"
                  className={`${IMAGEM} hidden dark:block`}
                />
                {/* O reflexo só pinta onde há moeda: a máscara é a própria frente, do metal do tema. */}
                <div
                  ref={reflexo}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mix-blend-screen [--mascara:url(/abertura/frente-ouro.webp)] [mask-image:var(--mascara)] [mask-size:100%_100%] [-webkit-mask-image:var(--mascara)] [-webkit-mask-size:100%_100%] dark:[--mascara:url(/abertura/frente-prata.webp)]"
                  style={{
                    backgroundImage: REFLEXO,
                    backgroundSize: "300% 100%",
                    backgroundPosition: "130% 0",
                  }}
                />
              </div>

              <div
                className={FACE}
                style={{ transform: "rotateY(180deg) translateZ(calc(var(--espessura) / 2))" }}
              >
                <Image
                  src="/abertura/verso-ouro.webp"
                  alt=""
                  width={800}
                  height={800}
                  unoptimized
                  loading="eager"
                  draggable={false}
                  data-face="verso"
                  data-metal="ouro"
                  className={`${IMAGEM} dark:hidden`}
                />
                <Image
                  src="/abertura/verso-prata.webp"
                  alt=""
                  width={800}
                  height={800}
                  unoptimized
                  loading="eager"
                  draggable={false}
                  data-face="verso"
                  data-metal="prata"
                  className={`${IMAGEM} hidden dark:block`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-12 items-center">
        <Link
          ref={botao}
          href="/inicio"
          hidden={!revelado}
          data-slot="ir-ao-inicio"
          className="bg-marca text-marca-contraste rounded-ciaara shadow-ciaara-2 px-10 py-3.5 font-sans text-base leading-none font-semibold tracking-[0.02em] hover:brightness-110"
        >
          Início
        </Link>
        <noscript>
          <Link
            href="/inicio"
            className="bg-marca text-marca-contraste rounded-ciaara shadow-ciaara-2 px-10 py-3.5 font-sans text-base leading-none font-semibold tracking-[0.02em]"
          >
            Início
          </Link>
        </noscript>
      </div>
    </div>
  );
}
