/**
 * D-COR-3 — a execução separada (*"45 TA executados · 40 no DSA · 5 fora do DSA"*) e o que conta até hoje.
 */
import { describe, expect, it } from "vitest";

import { execucaoSeparada, foraDoDsaAte } from "@/lib/dominio/ta-fora-do-dsa";

describe("D-COR-3 · foraDoDsaAte — só o ativo, até o dia, inclusive", () => {
  const registros = [
    { data: "2026-10-10", tempos: 3, status: "ativo" },
    { data: "2026-10-19", tempos: 2, status: "ativo" },
    { data: "2026-10-20", tempos: 4, status: "ativo" },
    { data: "2026-10-01", tempos: 7, status: "inativo" },
  ] as const;

  it("soma o ativo com data até hoje, inclusive", () => {
    expect(foraDoDsaAte(registros, "2026-10-19")).toBe(5);
  });
  it("o desfeito não conta", () => {
    expect(foraDoDsaAte(registros, "2026-12-31")).toBe(9);
  });
  it("nada até o dia = 0", () => {
    expect(foraDoDsaAte(registros, "2026-09-30")).toBe(0);
  });
});

describe("D-COR-3 · execucaoSeparada", () => {
  it("com TA fora do DSA, mostra os três números", () => {
    expect(execucaoSeparada({ total: 45, foraDoDsa: 5 })).toEqual({
      total: 45,
      noDsa: 40,
      foraDoDsa: 5,
      texto: "45 TA executados · 40 no DSA · 5 fora do DSA",
    });
  });
  it("sem TA fora do DSA, só o total — e nenhum 'fora' na tela", () => {
    expect(execucaoSeparada({ total: 40, foraDoDsa: 0 }).texto).toBe("40 TA executados");
  });
  it("singular: 1 TA executado", () => {
    expect(execucaoSeparada({ total: 1, foraDoDsa: 1 }).texto).toBe(
      "1 TA executado · 0 no DSA · 1 fora do DSA",
    );
  });
  it("o fora do DSA nunca deixa o 'no DSA' negativo (dado incoerente vira 0, não número inventado)", () => {
    expect(execucaoSeparada({ total: 3, foraDoDsa: 5 }).noDsa).toBe(0);
  });
});
