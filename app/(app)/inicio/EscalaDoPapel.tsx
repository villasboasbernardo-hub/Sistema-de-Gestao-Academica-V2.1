/**
 * O papel do DSA reduzido à largura da página — folha de cliente (Bloco 11, RD-7, D-31).
 *
 * > *"o PAPEL impresso do DSA (o mesmo componente da impressão, verde e amarelo), reduzido e ocupando a largura da
 * > página"* — Bernardo Villas Boas, 26/10/2026
 *
 * ⚠️ **O PAPEL NÃO MUDA**: ele continua com 297 × 210 mm (`documento.css`), e quem o reduz é uma escala de CSS sobre a
 *    folha inteira — redesenhá-lo em outra medida faria a tela mostrar um papel que não é o impresso.
 * ⚠️ **A ESCALA SAI DA LARGURA MEDIDA** (`ResizeObserver`): é o que a faz acompanhar a lateral recolhida ou fixada e a
 *    janela do navegador. A caixa reserva a altura da folha já reduzida — `transform` não ocupa espaço no fluxo.
 * ⚠️ **SEM COR**: só medida.
 */
"use client";

import * as React from "react";

/** A folha A4 paisagem, em pixels de CSS (96 por polegada). */
const LARGURA_DA_FOLHA = (297 * 96) / 25.4;
const ALTURA_DA_FOLHA = (210 * 96) / 25.4;

export function EscalaDoPapel({ children }: { readonly children: React.ReactNode }) {
  const caixa = React.useRef<HTMLDivElement>(null);
  const [escala, definirEscala] = React.useState(1);

  React.useEffect(() => {
    const elemento = caixa.current;
    if (elemento === null) return;
    const medir = (largura: number) => {
      if (largura > 0) definirEscala(largura / LARGURA_DA_FOLHA);
    };
    medir(elemento.clientWidth);
    const observador = new ResizeObserver((entradas) => {
      const largura = entradas[0]?.contentRect.width;
      if (largura !== undefined) medir(largura);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={caixa}
      className="w-full overflow-hidden"
      style={{ height: `${ALTURA_DA_FOLHA * escala}px` }}
      data-slot="papel-reduzido"
      data-escala={escala.toFixed(3)}
    >
      <div
        style={{
          width: `${LARGURA_DA_FOLHA}px`,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
