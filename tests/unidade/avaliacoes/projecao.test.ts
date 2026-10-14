import { describe, expect, it } from "vitest";

import { projecaoDaDisciplina } from "@/lib/dominio/avaliacoes/projecao";

/** FR-031.11 e SC-016 da spec 014: a projeção é alerta, nunca bloqueio. */
describe("projecaoDaDisciplina", () => {
  const duas = [
    { rotulo: "PM 1", tempo: 2 },
    { rotulo: "PM 2", tempo: 2 },
  ];

  it("restam 20 TA; faltam 2 avaliações (4 TA) → sobram 16", () => {
    const p = projecaoDaDisciplina({ ch: 120, cumprido: 100, faltam: duas });
    expect(p.frase.startsWith("restam 20 TA; faltam 2 avaliações (4 TA) → sobram 16")).toBe(true);
    expect(p.estouro).toBe(false);
  });

  it("com 118 cumpridos, Z = −2: estouro", () => {
    const p = projecaoDaDisciplina({ ch: 120, cumprido: 118, faltam: duas });
    expect([p.sobram, p.estouro]).toEqual([-2, true]);
  });

  it("fronteira: Z = 0 não é estouro; Z = −1 é", () => {
    expect(projecaoDaDisciplina({ ch: 120, cumprido: 116, faltam: duas }).estouro).toBe(false);
    expect(projecaoDaDisciplina({ ch: 120, cumprido: 117, faltam: duas }).estouro).toBe(true);
  });

  it("item sem tempo conta em N e não em Y, e a frase diz quantos", () => {
    const p = projecaoDaDisciplina({
      ch: 120,
      cumprido: 100,
      faltam: [...duas, { rotulo: "TG 1", tempo: null }],
    });
    expect([p.faltam, p.tempoQueFalta, p.semTempo]).toEqual([3, 4, 1]);
    expect(p.frase).toContain("(1 sem tempo definido)");
  });

  it("controle: sem avaliação faltando, sobra o que resta", () => {
    expect(projecaoDaDisciplina({ ch: 50, cumprido: 30, faltam: [] }).sobram).toBe(20);
  });
});
