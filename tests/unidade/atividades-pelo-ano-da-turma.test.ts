/**
 * RT-6 — a lista de Atividades pelo ANO DA TURMA (Bloco 10, conferência de 24/10/2026).
 */
import { describe, expect, it } from "vitest";

import { predicadoDoAno } from "@/app/(app)/atividades/predicado-do-ano";

describe("predicadoDoAno — a atividade de turma pelo ano da turma, a global pela data", () => {
  it("a de turma entra pelo id da turma do ano, sem olhar a data", () => {
    const p = predicadoDoAno(2027, ["t1", "t2"]);
    expect(p.startsWith("turma_id.in.(t1,t2),")).toBe(true);
    expect(p).not.toMatch(/^data\./);
  });

  it("a global (sem turma) entra pela data do ano", () => {
    expect(predicadoDoAno(2027, ["t1"])).toContain(
      "and(turma_id.is.null,data.gte.2027-01-01,data.lte.2027-12-31)",
    );
  });

  it("sem turma no ano, só as globais", () => {
    expect(predicadoDoAno(2028, [])).toBe(
      "and(turma_id.is.null,data.gte.2028-01-01,data.lte.2028-12-31)",
    );
  });
});
