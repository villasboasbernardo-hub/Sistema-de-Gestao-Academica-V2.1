/**
 * O ano corrente no fuso da CIAARA-11 — a fronteira que o servidor em UTC erra.
 */
import { describe, expect, it } from "vitest";

import { anoCorrente } from "@/lib/formato/ano-corrente";

describe("`FR-027.1` · ano corrente em America/Sao_Paulo", () => {
  it("às 23h30 de 31/12 em Brasília ainda é o ano que termina, embora em UTC já seja o seguinte", () => {
    const agora = new Date("2027-01-01T02:30:00Z");
    expect(agora.getUTCFullYear(), "controle: em UTC o ano já virou").toBe(2027);
    expect(anoCorrente(agora)).toBe(2026);
  });

  it("à meia-noite e meia de 01/01 em Brasília o ano já virou", () => {
    expect(anoCorrente(new Date("2027-01-01T03:30:00Z"))).toBe(2027);
  });
});
