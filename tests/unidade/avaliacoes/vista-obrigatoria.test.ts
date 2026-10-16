/**
 * `RN-AV-13` (emenda de 15/10/2026 à spec 014; PE em 16/10/2026): *"Vista obrigatória para PM, PO e PE."* — a marca
 * é DADO do banco (`config_listas.metadados.vista_obrigatoria`, migration D-9); `instrumentoDaVista` a traduz da
 * linha que a consulta trouxe e `exigeVista` decide. Os valores do banco se provam no pgTAP 132 e na prova cruzada.
 */
import { describe, expect, it } from "vitest";

import { exigeVista, instrumentoDaVista } from "@/lib/dominio/avaliacoes/vista-obrigatoria";

describe("RN-AV-13 · a vista é obrigatória pela marca do instrumento", () => {
  it("a marca `true` exige; `false` não exige", () => {
    expect(exigeVista({ instrumento: { valor: "PM", vistaObrigatoria: true } })).toBe(true);
    expect(exigeVista({ instrumento: { valor: "PP", vistaObrigatoria: false } })).toBe(false);
  });

  it("instrumento desconhecido (prova sem item e sem instrumento) exige, como antes da emenda", () => {
    expect(exigeVista({ instrumento: null })).toBe(true);
    expect(exigeVista({ instrumento: undefined })).toBe(true);
  });
});

describe("instrumentoDaVista · a linha de config_listas que a consulta trouxe", () => {
  it("lê a marca de `metadados.vista_obrigatoria`", () => {
    expect(
      instrumentoDaVista({
        valor: "PE",
        metadados: { natureza: "prova", vista_obrigatoria: true },
      }),
    ).toEqual({
      valor: "PE",
      vistaObrigatoria: true,
    });
    expect(instrumentoDaVista({ valor: "TG", metadados: { vista_obrigatoria: false } })).toEqual({
      valor: "TG",
      vistaObrigatoria: false,
    });
  });

  it("marca ausente ou que não é `true` (texto, nulo) → não exige: só `true` é a decisão de exigir", () => {
    expect(instrumentoDaVista({ valor: "PD", metadados: {} })?.vistaObrigatoria).toBe(false);
    expect(
      instrumentoDaVista({ valor: "PD", metadados: { vista_obrigatoria: "true" } })
        ?.vistaObrigatoria,
    ).toBe(false);
    expect(instrumentoDaVista({ valor: "PD", metadados: null })?.vistaObrigatoria).toBe(false);
  });

  it("linha ausente ou sem valor → desconhecido (nulo), e então exige", () => {
    expect(instrumentoDaVista(null)).toBeNull();
    expect(instrumentoDaVista(undefined)).toBeNull();
    expect(instrumentoDaVista({ valor: "  ", metadados: { vista_obrigatoria: false } })).toBeNull();
    expect(exigeVista({ instrumento: instrumentoDaVista(null) })).toBe(true);
  });

  it("o valor chega aparado, como está no cadastro", () => {
    expect(
      instrumentoDaVista({ valor: " PM ", metadados: { vista_obrigatoria: true } })?.valor,
    ).toBe("PM");
  });
});
