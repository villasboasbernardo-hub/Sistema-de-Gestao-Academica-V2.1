/**
 * O custo do curso em reais — spec 020 (Bloco 5), C-3: digita-se com vírgula, lê-se *R$ 12.345,67*.
 */
import { describe, expect, it } from "vitest";

import { lerReais, reaisParaEdicao, reaisParaLeitura } from "@/lib/formato/moeda";

describe("ler o que se digita", () => {
  it.each([
    ["12.345,67", 12345.67],
    ["12345,67", 12345.67],
    ["R$ 1.000", 1000],
    ["0,5", 0.5],
    ["  250  ", 250],
  ] as const)("«%s» → %s", (texto, valor) => {
    expect(lerReais(texto)).toBe(valor);
  });

  it("vazio é nulo; texto que não é número é inválido", () => {
    expect(lerReais("")).toBeNull();
    expect(lerReais("   ")).toBeNull();
    expect(lerReais("doze reais")).toBeNaN();
    expect(lerReais("1,2,3")).toBeNaN();
    expect(lerReais("12,345")).toBeNaN();
  });
});

describe("escrever para ler", () => {
  it("com R$, ponto de milhar e duas casas", () => {
    expect(reaisParaLeitura(12345.67)).toBe("R$ 12.345,67");
    expect(reaisParaLeitura(0)).toBe("R$ 0,00");
  });

  it("nulo é «Não informado»", () => {
    expect(reaisParaLeitura(null)).toBe("Não informado");
  });

  it("e o valor do campo de edição volta a ser lido igual", () => {
    expect(lerReais(reaisParaLeitura(9876.5))).toBe(9876.5);
    expect(reaisParaEdicao(9876.5)).toBe("9.876,50");
    expect(lerReais(reaisParaEdicao(9876.5))).toBe(9876.5);
    expect(reaisParaEdicao(null)).toBe("");
  });
});
