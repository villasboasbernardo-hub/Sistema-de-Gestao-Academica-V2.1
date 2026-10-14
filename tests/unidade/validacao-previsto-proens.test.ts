/** `FR-008.1` (spec 014) — a forma do previsto do PROENS. */
import { describe, expect, it } from "vitest";

import { esquemaDoPrevistoProens } from "@/lib/validacao/previsto-proens";

const TURMA = "11111111-1111-4111-8111-111111111111";

describe("esquemaDoPrevistoProens", () => {
  it("aceita AEC, TAD e TR com tempos inteiros não negativos", () => {
    for (const categoria of ["AEC", "TAD", "TR"]) {
      expect(
        esquemaDoPrevistoProens.safeParse({ turmaId: TURMA, categoria, tempos: 0 }).success,
      ).toBe(true);
    }
  });

  it("recusa tempo negativo", () => {
    const r = esquemaDoPrevistoProens.safeParse({ turmaId: TURMA, categoria: "TAD", tempos: -1 });
    expect(r.success).toBe(false);
  });

  it("recusa categoria fora das três", () => {
    const r = esquemaDoPrevistoProens.safeParse({ turmaId: TURMA, categoria: "CHD", tempos: 1 });
    expect(r.success).toBe(false);
  });

  it("recusa tempo fracionário e turma que não é uuid", () => {
    expect(
      esquemaDoPrevistoProens.safeParse({ turmaId: TURMA, categoria: "TR", tempos: 1.5 }).success,
    ).toBe(false);
    expect(
      esquemaDoPrevistoProens.safeParse({ turmaId: "x", categoria: "TR", tempos: 1 }).success,
    ).toBe(false);
  });

  it("aceita o número vindo de formulário como texto", () => {
    const r = esquemaDoPrevistoProens.safeParse({ turmaId: TURMA, categoria: "TR", tempos: "130" });
    expect(r.success && r.data.tempos).toBe(130);
  });
});
