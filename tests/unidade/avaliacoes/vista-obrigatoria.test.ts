/**
 * `RN-AV-13` (emenda de 15/10/2026 à spec 014): *"vista é obrigatória só para PM e PO. PP, T e TG não geram alerta de
 * vista; se a planilha trouxer vista, registra."* — `exigeVista` lê a lista de `instrumentos.json`, o dado único.
 */
import { describe, expect, it } from "vitest";

import instrumentos from "@/lib/dominio/avaliacoes/instrumentos.json";
import { exigeVista } from "@/lib/dominio/avaliacoes/vista-obrigatoria";

describe("RN-AV-13 · a vista é obrigatória só para PM e PO", () => {
  it("PM e PO exigem", () => {
    expect(exigeVista({ instrumento: "PM" })).toBe(true);
    expect(exigeVista({ instrumento: "PO" })).toBe(true);
  });

  it("PP, TG, TI, PE e OD não exigem (leitura literal: «só PM e PO»)", () => {
    for (const instrumento of ["PP", "TG", "TI", "PE", "OD"]) {
      expect(exigeVista({ instrumento }), instrumento).toBe(false);
    }
  });

  it("o instrumento chega como está no cadastro, com caixa e espaço tolerados", () => {
    expect(exigeVista({ instrumento: " pm " })).toBe(true);
    expect(exigeVista({ instrumento: "pp" })).toBe(false);
  });

  it("instrumento nulo (prova sem item ligado) exige, como antes da emenda", () => {
    expect(exigeVista({ instrumento: null })).toBe(true);
    expect(exigeVista({ instrumento: undefined })).toBe(true);
    expect(exigeVista({ instrumento: "  " })).toBe(true);
  });

  it("a lista vem do dado único — e hoje ela é exatamente PM e PO", () => {
    expect([...instrumentos.vistaObrigatoria].sort()).toEqual(["PM", "PO"]);
    for (const i of instrumentos.vistaObrigatoria)
      expect(exigeVista({ instrumento: i })).toBe(true);
  });
});
