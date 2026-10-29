/**
 * Bloco 15 (spec 030), item 7 — as abas de versão do DSA: *"Minuta · Original · ALT 1 · ALT 2… Semana nunca publicada:
 * só a aba Minuta. Estado da aba na URL."* (Bernardo Villas Boas, 29/10/2026).
 */
import { describe, expect, it } from "vitest";

import { abasDeVersao, versaoEscolhida } from "@/lib/dominio/dsa/versao-escolhida";

describe("abasDeVersao — Minuta, depois as publicadas em ordem", () => {
  it("semana nunca publicada: só a Minuta", () => {
    expect(abasDeVersao([])).toEqual([{ valor: "", rotulo: "Minuta" }]);
  });

  it("com a original e duas ALT: Minuta · Original · ALT 1 · ALT 2, na ordem do número", () => {
    expect(abasDeVersao([2, 0, 1]).map((a) => a.rotulo)).toEqual([
      "Minuta",
      "Original",
      "ALT 1",
      "ALT 2",
    ]);
    expect(abasDeVersao([0, 1]).map((a) => a.valor)).toEqual(["", "0", "1"]);
  });
});

describe("versaoEscolhida — o `?versao=` da URL", () => {
  it("vazio é a Minuta, sem aviso", () => {
    expect(versaoEscolhida("", [0, 1])).toEqual({ numero: null, aviso: null });
  });

  it("`0` é a Original; `1`, a ALT 1", () => {
    expect(versaoEscolhida("0", [0, 1])).toEqual({ numero: 0, aviso: null });
    expect(versaoEscolhida("1", [0, 1])).toEqual({ numero: 1, aviso: null });
  });

  it("⚠️ a versão que não existe abre a Minuta, COM aviso (`RN-DEG-01`)", () => {
    expect(versaoEscolhida("3", [0, 1])).toEqual({
      numero: null,
      aviso: "A versão pedida no endereço não existe nesta semana: abrimos a Minuta.",
    });
    expect(versaoEscolhida("0", []).numero).toBeNull();
    expect(versaoEscolhida("x", [0]).aviso).not.toBeNull();
  });
});
