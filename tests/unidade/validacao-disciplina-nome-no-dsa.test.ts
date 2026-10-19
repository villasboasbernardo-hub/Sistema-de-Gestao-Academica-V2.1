/** O *Nome no DSA* no esquema da edição da disciplina (spec 017, FR-007.1 e FR-007.5). */
import { describe, expect, it } from "vitest";

import { LIMITE_DO_NOME_NO_DSA } from "@/lib/dominio/nome-no-dsa";
import { esquemaDeEdicaoDeDisciplina } from "@/lib/validacao/disciplina";

const BASE = {
  disciplinaId: "13700000-0000-4000-8000-000000000001",
  codDisciplina: "XII",
  nomeDisciplina: "EQUIPAMENTOS E SISTEMAS ELETRÔNICOS DE AUXÍLIOS À NAVEGAÇÃO.",
  cargaHorariaTempos: 60,
  modoAtribuicaoPadrao: "dividido",
  tecnicaEnsinoSugerida: "AE",
  localPadrao: "Sala 3",
};

describe("esquemaDeEdicaoDeDisciplina · nomeNoDsa", () => {
  it("acima de L é recusado, e a frase diz o limite", () => {
    const r = esquemaDeEdicaoDeDisciplina.safeParse({
      ...BASE,
      nomeNoDsa: "X".repeat(LIMITE_DO_NOME_NO_DSA + 1),
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0]?.message).toContain(`${LIMITE_DO_NOME_NO_DSA} caracteres`);
  });
  it("exatamente L passa", () => {
    expect(
      esquemaDeEdicaoDeDisciplina.safeParse({
        ...BASE,
        nomeNoDsa: "X".repeat(LIMITE_DO_NOME_NO_DSA),
      }).success,
    ).toBe(true);
  });
  it("em branco vira nulo (volta à abreviação automática)", () => {
    const r = esquemaDeEdicaoDeDisciplina.safeParse({ ...BASE, nomeNoDsa: "   " });
    expect(r.success && r.data.nomeNoDsa).toBeNull();
  });
  it("⚠️ ausente fica AUSENTE — quem não manda o campo não o apaga (a ação só grava o que veio)", () => {
    const r = esquemaDeEdicaoDeDisciplina.safeParse(BASE);
    expect(r.success && r.data.nomeNoDsa).toBeUndefined();
  });
  it("técnica e local passam como vieram (o formulário os manda preenchidos, FR-007.5)", () => {
    const r = esquemaDeEdicaoDeDisciplina.safeParse(BASE);
    expect(r.success && [r.data.tecnicaEnsinoSugerida, r.data.localPadrao]).toEqual([
      "AE",
      "Sala 3",
    ]);
  });
});
