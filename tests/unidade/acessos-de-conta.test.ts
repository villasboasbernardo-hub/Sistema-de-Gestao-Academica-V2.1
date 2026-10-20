/**
 * O quadro de acessos — spec 020 (Bloco 5), C-13 a C-15: quem mais acessou e os acessos recentes.
 */
import { describe, expect, it } from "vitest";

import { quemMaisAcessou, totalDeAcessos } from "@/lib/dominio/acessos-de-conta";

const resumo = [
  { usuarioId: "a", total: 3, ultimoEm: "2026-10-20T10:00:00Z" },
  { usuarioId: "b", total: 9, ultimoEm: "2026-10-19T10:00:00Z" },
  { usuarioId: "c", total: 9, ultimoEm: "2026-10-20T12:00:00Z" },
  { usuarioId: "d", total: 1, ultimoEm: "2026-10-01T10:00:00Z" },
];

describe("C-15 · quem mais acessou", () => {
  it("pelo total; no empate, o acesso mais recente primeiro; corta no limite", () => {
    expect(quemMaisAcessou(resumo, 3).map((r) => r.usuarioId)).toEqual(["c", "b", "a"]);
  });

  it("conta que não está entre as vivas fica de fora (excluída)", () => {
    expect(quemMaisAcessou(resumo, 5, new Set(["a", "d"])).map((r) => r.usuarioId)).toEqual([
      "a",
      "d",
    ]);
  });
});

describe("o total de uma conta", () => {
  it("é o do resumo, e zero sem acesso", () => {
    expect(totalDeAcessos(resumo, "b")).toBe(9);
    expect(totalDeAcessos(resumo, "z")).toBe(0);
  });
});
