/**
 * O papel do DSA enquadrado no Início — spec 029 (Bloco 14, item 8), `FR-008.3`, D-20 a D-22: a escala que faz a folha
 * de 297 × 210 mm caber pela largura **e** pela altura disponíveis, com piso de 0,35.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O LIMITADO PELA ALTURA**: até a spec 029 a escala saía só da largura (`EscalaDoPapel`,
 *    D-31 da spec 026), e em 1366 × 768 ela passava de 1 — o papel ficava com ~900 px numa janela de 768.
 */
import { describe, expect, it } from "vitest";

import {
  ALTURA_DA_FOLHA_PX,
  LARGURA_DA_FOLHA_PX,
  escalaQueCabe,
} from "@/lib/dominio/enquadramento-do-papel";

describe("a folha em pixels de CSS (96 por polegada)", () => {
  it("é a A4 paisagem da impressão: 297 × 210 mm, ≈ 1122,52 × 793,70 px", () => {
    expect(LARGURA_DA_FOLHA_PX).toBeCloseTo((297 * 96) / 25.4, 6);
    expect(ALTURA_DA_FOLHA_PX).toBeCloseTo((210 * 96) / 25.4, 6);
    expect(LARGURA_DA_FOLHA_PX).toBeCloseTo(1122.52, 2);
    expect(ALTURA_DA_FOLHA_PX).toBeCloseTo(793.7, 2);
  });
});

describe("FR-008.3 · a escala que cabe pela largura E pela altura", () => {
  it("limitada pela largura: a área é baixa para a largura, alta de sobra", () => {
    expect(escalaQueCabe(LARGURA_DA_FOLHA_PX / 2, 10_000)).toBeCloseTo(0.5, 6);
    expect(escalaQueCabe(900, 2_000)).toBeCloseTo(900 / LARGURA_DA_FOLHA_PX, 6);
  });

  it("limitada pela altura: a largura sozinha daria mais de 1, e a folha passaria da janela", () => {
    /* ~1366 × 768: 1278 px de largura útil daria 1,138 pela largura; sobram 480 px de altura. */
    expect(1278 / LARGURA_DA_FOLHA_PX).toBeGreaterThan(1);
    expect(escalaQueCabe(1278, 480)).toBeCloseTo(480 / ALTURA_DA_FOLHA_PX, 6);
    expect(escalaQueCabe(1278, 480) * ALTURA_DA_FOLHA_PX).toBeLessThanOrEqual(480 + 1e-9);
    /* ~1920 × 1080: 1832 px dariam 1,632; sobram 820 px de altura. */
    expect(escalaQueCabe(1832, 820)).toBeCloseTo(820 / ALTURA_DA_FOLHA_PX, 6);
    expect(escalaQueCabe(1832, 820) * LARGURA_DA_FOLHA_PX).toBeLessThanOrEqual(1832);
  });

  it("a folha reduzida cabe nas duas medidas ao mesmo tempo", () => {
    for (const [largura, altura] of [
      [1278, 480],
      [1832, 820],
      [640, 900],
      [1122, 793],
    ] as const) {
      const escala = escalaQueCabe(largura, altura);
      expect(escala * LARGURA_DA_FOLHA_PX).toBeLessThanOrEqual(largura + 1e-9);
      expect(escala * ALTURA_DA_FOLHA_PX).toBeLessThanOrEqual(altura + 1e-9);
    }
  });
});

describe("D-22 · o piso de 0,35: abaixo dele a página rola, em vez de o papel virar um selo", () => {
  it("o piso padrão é 0,35", () => {
    /* 200 px de altura dariam 0,252. */
    expect(200 / ALTURA_DA_FOLHA_PX).toBeLessThan(0.35);
    expect(escalaQueCabe(1278, 200)).toBe(0.35);
    /* E a largura estreita também para no piso. */
    expect(escalaQueCabe(100, 2_000)).toBe(0.35);
  });

  it("acima do piso, o piso não age", () => {
    expect(escalaQueCabe(1278, 480)).toBeGreaterThan(0.35);
  });

  it("o piso é parâmetro: outro piso, outra parada; piso zero devolve a razão inteira", () => {
    expect(escalaQueCabe(1278, 200, 0.2)).toBeCloseTo(200 / ALTURA_DA_FOLHA_PX, 6);
    expect(escalaQueCabe(1278, 100, 0.2)).toBe(0.2);
    expect(escalaQueCabe(1278, 100, 0)).toBeCloseTo(100 / ALTURA_DA_FOLHA_PX, 6);
  });
});

describe("RN-DEG-01 · medida inválida devolve o neutro (1), sem estourar", () => {
  it.each([
    ["largura zero", 0, 500],
    ["altura zero", 1278, 0],
    ["largura negativa", -10, 500],
    ["altura negativa", 1278, -1],
    ["largura NaN", Number.NaN, 500],
    ["altura NaN", 1278, Number.NaN],
    ["as duas NaN", Number.NaN, Number.NaN],
  ])("%s → 1", (_, largura, altura) => {
    expect(() => escalaQueCabe(largura, altura)).not.toThrow();
    expect(escalaQueCabe(largura, altura)).toBe(1);
  });
});
