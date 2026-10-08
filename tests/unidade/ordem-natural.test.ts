/**
 * `lib/dominio/ordem-natural.ts` — a ordem das disciplinas pelo código (ajuste 5 do PR #40).
 */
import { describe, expect, it } from "vitest";

import { compararCodigoNatural, emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

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
