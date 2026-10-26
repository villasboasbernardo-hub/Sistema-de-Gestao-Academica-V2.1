/**
 * RD-8 (Bloco 11, spec 026) — os cartões do Início contam as turmas do ano por situação.
 */
import { describe, expect, it } from "vitest";

import { contagemPorSituacao } from "@/lib/dominio/cartoes-do-inicio";

describe("contagemPorSituacao", () => {
  it("as quatro situações, cada turma na sua", () => {
    const r = contagemPorSituacao([
      { status: "ativa" },
      { status: "ativa" },
      { status: "planejada" },
      { status: "concluida" },
      { status: "cancelada" },
      { status: "cancelada" },
    ]);
    expect(r).toEqual({ ativas: 2, planejadas: 1, concluidas: 1, canceladas: 2 });
  });

  it("sem turma, zeros — nunca vazio", () => {
    expect(contagemPorSituacao([])).toEqual({
      ativas: 0,
      planejadas: 0,
      concluidas: 0,
      canceladas: 0,
    });
  });
});
