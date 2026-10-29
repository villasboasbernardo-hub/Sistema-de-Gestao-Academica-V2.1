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
  escalaDaTelaCheia,
  LARGURA_DA_FOLHA_PX,
  LARGURA_DE_UMA_BARRA_PX,
  escalaQueCabe,
  regravarAEscala,
  type MedidaDoPapel,
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

/*
 * ── A escala não alterna entre dois valores (revisão do Bloco 14, achado 4) ──────────────────────────────────────────
 *
 * Com a barra de rolagem vertical CLÁSSICA (Windows, ~17 px que ocupam largura), a escala limitada pela largura podia
 * alternar sem fim: a escala maior faz a página passar da janela → a barra aparece → a caixa estreita → a escala cai →
 * a página cabe → a barra some → a caixa alarga → a escala sobe… A guarda «só grava quando muda» não impedia isso.
 */
describe("a escala não alterna com a barra de rolagem da página (achado 4)", () => {
  /** A escala com 3 casas, para baixo — a mesma conta de `EscalaDoPapel`. */
  const tresCasas = (x: number) => Math.floor(x * 1000 + 1e-6) / 1000;
  const medir = (largura: number, altura: number): MedidaDoPapel => ({
    escala: tresCasas(escalaQueCabe(largura, altura)),
    largura,
    altura,
  });

  it("⚠️ o caso que discrimina: janela grande e quase quadrada, escala limitada pela largura, página no limite da janela", () => {
    const BARRA = 17;
    const LARGURA_SEM_BARRA = 1300;
    const ALTURA_QUE_SOBRA = 2000; /* sobra altura: quem limita é a largura */
    /* A página: 200 px acima do papel, o papel, e nada abaixo — ela passa da janela de 1110 px só com a escala maior. */
    const JANELA = 1110;
    const alturaDaPagina = (escala: number) => 200 + ALTURA_DA_FOLHA_PX * escala;
    expect(alturaDaPagina(medir(LARGURA_SEM_BARRA, ALTURA_QUE_SOBRA).escala)).toBeGreaterThan(
      JANELA,
    );
    expect(
      alturaDaPagina(medir(LARGURA_SEM_BARRA - BARRA, ALTURA_QUE_SOBRA).escala),
    ).toBeLessThanOrEqual(JANELA);

    let gravada: MedidaDoPapel | null = null;
    let barra = false;
    let gravacoes = 0;
    const escalas: number[] = [];
    for (let quadro = 0; quadro < 12; quadro += 1) {
      const nova = medir(LARGURA_SEM_BARRA - (barra ? BARRA : 0), ALTURA_QUE_SOBRA);
      if (regravarAEscala(gravada, nova)) {
        gravada = nova;
        gravacoes += 1;
      }
      if (gravada === null) throw new Error("a primeira medida não foi gravada");
      escalas.push(gravada.escala);
      barra = alturaDaPagina(gravada.escala) > JANELA;
    }
    expect(gravacoes, `a escala alternou: ${escalas.join(" → ")}`).toBeLessThanOrEqual(2);
    /* Assenta na menor — a folha cabe, sem barra, e não volta a crescer. */
    expect(new Set(escalas.slice(-6)).size).toBe(1);
    expect(barra).toBe(false);
  });

  it("a primeira medida grava; a mesma escala não grava de novo", () => {
    const m = medir(1278, 480);
    expect(regravarAEscala(null, m)).toBe(true);
    expect(regravarAEscala(m, { ...m, largura: m.largura + 5 })).toBe(false);
  });

  it("diminuir grava SEMPRE — a folha nunca passa do espaço, nem por um alargamento pequeno anterior", () => {
    const antes = medir(1300, 2000);
    expect(regravarAEscala(antes, medir(1300 - 17, 2000))).toBe(true);
    expect(regravarAEscala(antes, medir(1300, 300))).toBe(true);
  });

  it("aumentar só pela largura grava quando ela cresce MAIS que uma barra — e os alargamentos pequenos se acumulam", () => {
    const gravada = medir(1283, 2000);
    expect(LARGURA_DE_UMA_BARRA_PX).toBeGreaterThanOrEqual(17);
    expect(regravarAEscala(gravada, medir(1283 + 17, 2000))).toBe(false);
    expect(regravarAEscala(gravada, medir(1283 + LARGURA_DE_UMA_BARRA_PX, 2000))).toBe(false);
    /* Comparado com a largura GRAVADA, não com a da última observação: o arrasto lento também chega lá. */
    expect(regravarAEscala(gravada, medir(1283 + LARGURA_DE_UMA_BARRA_PX + 1, 2000))).toBe(true);
    /* A lateral recolhida devolve ~200 px: grava. */
    expect(regravarAEscala(gravada, medir(1283 + 200, 2000))).toBe(true);
  });

  it("aumentar pela ALTURA grava sempre (D-27: fechado o painel de Filtros, a escala volta)", () => {
    const comPainel = medir(1278, 300);
    const semPainel = medir(1278, 480);
    expect(semPainel.escala).toBeGreaterThan(comPainel.escala);
    expect(regravarAEscala(comPainel, semPainel)).toBe(true);
    /* Até poucos pixels de altura a mais (a fonte que carrega) entram — a altura não alterna com a barra vertical. */
    expect(regravarAEscala(medir(1278, 480), medir(1278, 484))).toBe(true);
  });
});

/*
 * Bloco 15 (spec 030, `FR-001`, D-2): a TELA CHEIA amplia o papel ao máximo que cabe — sem o teto de 1 que o carrossel
 * nunca precisou, e sem o piso de 0,35 (a sobreposição não rola).
 */
describe("escalaDaTelaCheia — o papel ampliado ao máximo que cabe (Bloco 15)", () => {
  it("⚠️ passa de 1 quando a caixa é maior que a folha (1920 × 1080 → ~1,3)", () => {
    const escala = escalaDaTelaCheia(1920 - 2 * 56, 1080 - 64);
    expect(escala).toBeGreaterThan(1.2);
    expect(ALTURA_DA_FOLHA_PX * escala).toBeLessThanOrEqual(1080 - 64 + 0.001);
    expect(LARGURA_DA_FOLHA_PX * escala).toBeLessThanOrEqual(1920 - 2 * 56 + 0.001);
  });

  it("a menor das duas: a altura limita numa janela larga e baixa", () => {
    expect(escalaDaTelaCheia(4000, ALTURA_DA_FOLHA_PX)).toBeCloseTo(1, 6);
  });

  it("sem piso: numa caixa minúscula ela fica abaixo de 0,35", () => {
    expect(escalaDaTelaCheia(200, 150)).toBeLessThan(0.35);
  });

  it("medida inválida devolve o neutro (1), sem estourar (`RN-DEG-01`)", () => {
    expect(escalaDaTelaCheia(0, 500)).toBe(1);
    expect(escalaDaTelaCheia(Number.NaN, 500)).toBe(1);
  });
});
