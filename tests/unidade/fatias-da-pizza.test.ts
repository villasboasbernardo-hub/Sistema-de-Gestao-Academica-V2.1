/**
 * Spec 022 (Bloco 7), item 7 — a pizza desenha TODAS as fatias.
 *
 * > *"Gráficos de pizza: TODAS as fatias, sem agrupar em «Outras» (desfaz a regra de 5 fatias da Q-11 da spec 016 e o
 * > teto do componente). Legenda legível com muitas fatias."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ Até 22/10/2026 a pizza RECUSAVA mais de cinco categorias e a grade agrupava o resto em "Outras (N)". O caso que
 *    discrimina é o de seis ou mais: antes, recusa ou "Outras"; agora, cada fatia com o seu número.
 */
import { describe, expect, it } from "vitest";

import {
  MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO,
  percentualDaFatia,
  rotuloDaFatia,
} from "@/components/graficos/tipos";

describe("item 7 da spec 022 · todas as fatias", () => {
  it("até cinco fatias, a fatia leva nome e percentual escrito", () => {
    expect(MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO).toBe(5);
    expect(rotuloDaFatia(0, { nome: "20h", valor: 3 }, 12, 5)).toBe("20h — 25.0%");
  });

  it("com seis ou mais, cada fatia leva o NÚMERO dela — nenhuma vira «Outras»", () => {
    const pontos = Array.from({ length: 12 }, (_, i) => ({
      nome: `Disciplina ${i + 1}`,
      valor: i + 1,
    }));
    const total = pontos.reduce((s, p) => s + p.valor, 0);
    const rotulos = pontos.map((p, i) => rotuloDaFatia(i, p, total, pontos.length));
    expect(rotulos).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    expect(rotulos.some((r) => r.includes("Outras"))).toBe(false);
  });

  it("o percentual é sobre o total, com uma casa", () => {
    expect(percentualDaFatia(1, 3)).toBe("33.3%");
    expect(percentualDaFatia(78, 78)).toBe("100.0%");
  });
});
