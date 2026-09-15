/**
 * `RN-INST-03` delimitado e `FR-002` — quem é militar para a especialidade/habilitação (decisão de Bernardo
 * Villas Boas, 15/09/2026, CHK008 e CHK012).
 */
import { describe, expect, it } from "vitest";

import { ehMilitar, POSTOS_CIVIS } from "@/lib/dominio/militar-ou-civil";

describe("`FR-002` · civis são SC e SCNS; o resto preenchido é militar", () => {
  it("os civis da escala são exatamente SC e SCNS", () => {
    expect(POSTOS_CIVIS).toEqual(["SC", "SCNS"]);
    expect(ehMilitar("SC")).toBe(false);
    expect(ehMilitar(" SCNS ")).toBe(false);
  });

  it("posto da escala militar e posto fora da escala são militares", () => {
    for (const posto of ["CMG", "CT", "1ºTen", "SO", "MN", "XYZ"])
      expect(ehMilitar(posto)).toBe(true);
  });

  it("posto vazio não decide nada", () => {
    expect(ehMilitar(null)).toBe(false);
    expect(ehMilitar(undefined)).toBe(false);
    expect(ehMilitar("  ")).toBe(false);
  });
});
