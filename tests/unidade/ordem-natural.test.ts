/**
 * `lib/dominio/ordem-natural.ts` — a ordem das disciplinas pelo código (ajuste 5 do PR #40).
 */
import { describe, expect, it } from "vitest";

import {
  compararCodigoNatural,
  emOrdemNaturalDoCodigo,
  valorRomano,
} from "@/lib/dominio/ordem-natural";

describe("ordem natural do código", () => {
  it("⚠️ 2 antes de 10 — o caso que a ordem de texto pura erra", () => {
    expect(["D10", "D2", "D1"].sort(compararCodigoNatural)).toEqual(["D1", "D2", "D10"]);
    // controle: a ordem de texto pura punha D10 antes de D2
    expect(["D10", "D2"].sort()).toEqual(["D10", "D2"]);
  });

  it("é alfabética entre letras, sem distinguir caixa", () => {
    expect(["b2", "A10", "a2"].sort(compararCodigoNatural)).toEqual(["a2", "A10", "b2"]);
  });

  it("devolve uma cópia ordenada e não toca a lista recebida", () => {
    const lista = [{ c: "II" }, { c: "I" }, { c: "III" }] as const;
    expect(emOrdemNaturalDoCodigo(lista, (x) => x.c).map((x) => x.c)).toEqual(["I", "II", "III"]);
    expect(lista.map((x) => x.c)).toEqual(["II", "I", "III"]);
  });
});

describe("dúvida 5 · algarismo romano ordena pelo VALOR do numeral", () => {
  it("⚠️ IX depois de VIII e X depois de IX — a ordem pela letra punha IX antes de V", () => {
    const codigos = ["X", "IX", "V", "IV", "VIII", "I", "XI", "II", "III", "VI", "VII"];
    expect([...codigos].sort(compararCodigoNatural)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
    ]);
  });

  it("o valor do numeral, e null para o que não é romano", () => {
    expect(valorRomano("XIV")).toBe(14);
    expect(valorRomano("ix")).toBe(9);
    expect(valorRomano("D2")).toBeNull();
    expect(valorRomano("IIII")).toBeNull();
    expect(valorRomano("")).toBeNull();
  });

  it("código que não é romano segue a ordem natural", () => {
    expect(["T10", "T2", "A1"].sort(compararCodigoNatural)).toEqual(["A1", "T2", "T10"]);
  });
});
