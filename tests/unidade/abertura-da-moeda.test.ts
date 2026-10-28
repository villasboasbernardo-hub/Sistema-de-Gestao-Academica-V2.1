/**
 * A abertura com a moeda (spec 028, Bloco 13): o roteiro tem os tempos do protótipo aprovado, e a máquina de estados
 * decide quando tocar, pausar, retomar, pular e revelar o botão.
 *
 * ⚠️ O ROTEIRO É DADO, E É POR ISSO QUE SE TESTA: os ~3,5 s do pedido viram um número que este arquivo confere, em vez de
 *    tempos espalhados pelo componente que ninguém soma.
 */
import { describe, expect, it } from "vitest";

import {
  DURACAO_TOTAL_MS,
  ESPERA_MAXIMA_DAS_IMAGENS_MS,
  REVELACAO_DO_BOTAO,
  ROTEIRO,
  fimDoPasso,
  transicao,
  type Evento,
  type Fase,
} from "@/lib/design/abertura-da-moeda";

function passo(alvo: string, propriedade: string) {
  const achado = ROTEIRO.find((p) => p.alvo === alvo && propriedade in (p.quadros[0] ?? {}));
  if (!achado) throw new Error(`o roteiro não tem ${alvo}/${propriedade}`);
  return achado;
}

describe("o roteiro tem os tempos do protótipo (FR-003)", () => {
  it("o botão aparece aos 3,5 s: o fim do último passo", () => {
    expect(DURACAO_TOTAL_MS).toBe(3500);
    expect(Math.max(...ROTEIRO.map(fimDoPasso))).toBe(DURACAO_TOTAL_MS);
  });

  it("a moeda surge em 0,4 s e se afasta de 1,6× para 1× em 2,5 s", () => {
    const surge = passo("aproximacao", "opacity");
    expect(surge.quadros.map((q) => q.opacity)).toEqual([0, 1]);
    expect(surge.opcoes.duration).toBe(400);
    const zoom = passo("aproximacao", "transform");
    expect(zoom.quadros.map((q) => q.transform)).toEqual(["scale(1.6)", "scale(1)"]);
    expect(zoom.opcoes.duration).toBe(2500);
  });

  it("gira duas voltas e meia, do verso (180°) à frente (1080°), em 3 s", () => {
    const giro = passo("moeda", "transform");
    expect(giro.quadros.map((q) => q.transform)).toEqual(["rotateY(180deg)", "rotateY(1080deg)"]);
    expect((1080 - 180) / 360).toBe(2.5);
    expect(giro.opcoes.duration).toBe(3000);
  });

  it("sobe até 40 % do giro e volta; a sombra aparece de 0,4 s a 1,6 s", () => {
    const subida = passo("subida", "transform");
    expect(subida.quadros[1]).toMatchObject({
      offset: 0.4,
      transform: "translateZ(60px) rotateX(8deg)",
    });
    expect(subida.quadros.at(-1)?.transform).toBe(subida.quadros[0]?.transform);
    const sombra = passo("sombra", "opacity");
    expect([sombra.opcoes.delay, fimDoPasso(sombra)]).toEqual([400, 1600]);
  });

  it("o reflexo atravessa a frente nos últimos 0,75 s", () => {
    const reflexo = passo("reflexo", "backgroundPosition");
    expect(reflexo.quadros.map((q) => q.backgroundPosition)).toEqual(["130% 0", "-30% 0"]);
    expect([reflexo.opcoes.delay, reflexo.opcoes.duration]).toEqual([2750, 750]);
  });

  it("todo passo termina no quadro final (fill: both), para o pular e a pausa deixarem a moeda no lugar", () => {
    for (const p of ROTEIRO) expect(p.opcoes.fill, `${p.alvo}`).toBe("both");
  });

  it("o botão aparece em 0,35 s, subindo 8 px; as imagens esperam no máximo 1,5 s", () => {
    expect(REVELACAO_DO_BOTAO.opcoes.duration).toBe(350);
    expect(REVELACAO_DO_BOTAO.quadros[0]).toMatchObject({
      opacity: 0,
      transform: "translateY(8px)",
    });
    expect(ESPERA_MAXIMA_DAS_IMAGENS_MS).toBe(1500);
  });
});

describe("a máquina de estados (FR-006 a FR-008)", () => {
  const casos: readonly [Fase, Evento, Fase, string | null][] = [
    ["aguardando", "visivel", "tocando", "iniciar"],
    ["aguardando", "oculta", "aguardando", null],
    ["aguardando", "pular", "fim", "iniciar-e-finalizar"],
    ["aguardando", "terminou", "aguardando", null],
    ["tocando", "visivel", "tocando", null],
    ["tocando", "oculta", "pausado", "pausar"],
    ["tocando", "pular", "fim", "finalizar"],
    ["tocando", "terminou", "fim", "revelar"],
    ["pausado", "visivel", "tocando", "retomar"],
    ["pausado", "oculta", "pausado", null],
    ["pausado", "pular", "fim", "finalizar"],
    ["pausado", "terminou", "pausado", null],
  ];

  it.each(casos)("%s + %s → %s (%s)", (fase, evento, proxima, efeito) => {
    expect(transicao(fase, evento)).toEqual({ fase: proxima, efeito });
  });

  it("no fim, nada mais acontece: o botão não é revelado duas vezes", () => {
    for (const evento of ["visivel", "oculta", "pular", "terminou"] as const) {
      expect(transicao("fim", evento)).toEqual({ fase: "fim", efeito: null });
    }
  });

  it("com a aba oculta desde a abertura, nada toca até ela ficar visível", () => {
    let fase: Fase = "aguardando";
    fase = transicao(fase, "oculta").fase;
    expect(fase).toBe("aguardando");
    expect(transicao(fase, "visivel")).toEqual({ fase: "tocando", efeito: "iniciar" });
  });
});
