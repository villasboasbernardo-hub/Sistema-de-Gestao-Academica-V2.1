/** D-COR-3 · o Zod do TA fora do DSA (spec 017, FR-001.1): data não futura pelo dia de São Paulo, sem ajuste negativo. */
import { describe, expect, it } from "vitest";

import { esquemaDeDesfazerTaForaDoDsa, esquemaDoTaForaDoDsa } from "@/lib/validacao/ta-fora-do-dsa";

const HOJE = "2026-10-19";
const valido = {
  turmaCodigo: "C-Ap-FR 2026",
  turmaDisciplinaId: "13700000-0000-4000-8000-000000000001",
  data: "2026-10-19",
  tempos: "5",
  instrutorId: "",
  observacao: "Aula que virou EAD",
};
const mensagem = (r: ReturnType<ReturnType<typeof esquemaDoTaForaDoDsa>["safeParse"]>) =>
  r.success ? null : r.error.issues[0]?.message;

describe("esquemaDoTaForaDoDsa", () => {
  it("aceita o registro válido, com hoje e sem instrutor (nulo)", () => {
    const r = esquemaDoTaForaDoDsa(HOJE).safeParse(valido);
    expect(r.success && r.data).toMatchObject({ tempos: 5, instrutorId: null, data: "2026-10-19" });
  });
  it("⚠️ recusa a data de amanhã — o executado já aconteceu", () => {
    expect(
      mensagem(esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, data: "2026-10-20" })),
    ).toMatch(/futuro/);
  });
  it("aceita o histórico (data antiga)", () => {
    expect(esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, data: "2024-03-01" }).success).toBe(
      true,
    );
  });
  it.each(["0", "-2", "1.5"])("⚠️ sem ajuste negativo nem fração: %s é recusado", (tempos) => {
    expect(esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, tempos }).success).toBe(false);
  });
  it("⚠️ observação obrigatória: em branco é recusada", () => {
    expect(
      mensagem(esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, observacao: "   " })),
    ).toMatch(/obrigatória/);
  });
  it("observação acima de 1.000 é recusada", () => {
    expect(
      esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, observacao: "x".repeat(1001) }).success,
    ).toBe(false);
  });
  it("instrutor, quando vem, tem de ser um id", () => {
    expect(esquemaDoTaForaDoDsa(HOJE).safeParse({ ...valido, instrutorId: "abc" }).success).toBe(
      false,
    );
  });
});

describe("esquemaDeDesfazerTaForaDoDsa", () => {
  it("aceita só o código TFD-NNNNNN", () => {
    expect(
      esquemaDeDesfazerTaForaDoDsa.safeParse({ turmaCodigo: "T", codigo: "TFD-000001" }).success,
    ).toBe(true);
    expect(
      esquemaDeDesfazerTaForaDoDsa.safeParse({ turmaCodigo: "T", codigo: "REG-000001" }).success,
    ).toBe(false);
  });
});
