/**
 * Spec 015 da v2.0, `FR-009` e research §4 — o círculo hierárquico derivado do posto.
 */
import { describe, expect, it } from "vitest";

import { circuloDoPosto, POSTOS_POR_CIRCULO } from "@/lib/dominio/circulo-hierarquico";

describe("spec 015 `FR-009` · círculo hierárquico pelo mapa da v2.0", () => {
  it("os seis oficiais e as quatro praças do mapa", () => {
    expect(POSTOS_POR_CIRCULO.oficiais).toEqual(["CMG", "CF", "CC", "CT", "1ºTen", "2ºTen"]);
    expect(POSTOS_POR_CIRCULO.pracas).toEqual(["SO", "1ºSG", "2ºSG", "3ºSG"]);
    expect(circuloDoPosto("1ºTen")).toBe("oficiais");
    expect(circuloDoPosto(" 2ºsg ")).toBe("pracas");
  });

  it("SC, e CB e MN, que o mapa da v2.0 não traz, não pertencem a nenhum", () => {
    expect(circuloDoPosto("SC")).toBeNull();
    expect(circuloDoPosto("CB")).toBeNull();
    expect(circuloDoPosto("MN")).toBeNull();
    expect(circuloDoPosto(null)).toBeNull();
  });
});
