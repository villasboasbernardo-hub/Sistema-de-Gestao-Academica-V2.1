/** `FR-023` (spec 014) — a forma de «Parar dia». */
import { describe, expect, it } from "vitest";

import { esquemaDePararDia } from "@/lib/validacao/dia-parado";

const ID = "11111111-1111-4111-8111-111111111111";
const base = {
  turmaId: ID,
  alcance: "turma",
  data: "2026-04-08",
  diaInteiro: true,
  tipoParadaId: ID,
  motivo: "Licença",
};

describe("esquemaDePararDia", () => {
  it("aceita o dia inteiro, com prevista por padrão", () => {
    const r = esquemaDePararDia.safeParse(base);
    expect(r.success && r.data.prevista).toBe(true);
  });

  it("recusa parte do dia sem o primeiro tempo", () => {
    expect(esquemaDePararDia.safeParse({ ...base, diaInteiro: false, tempos: 2 }).success).toBe(
      false,
    );
  });

  it("aceita parte do dia com tempos dentro do 12º e recusa a que passa", () => {
    expect(
      esquemaDePararDia.safeParse({ ...base, diaInteiro: false, taInicial: 3, tempos: 2 }).success,
    ).toBe(true);
    expect(
      esquemaDePararDia.safeParse({ ...base, diaInteiro: false, taInicial: 11, tempos: 3 }).success,
    ).toBe(false);
  });

  it("recusa motivo curto", () => {
    expect(esquemaDePararDia.safeParse({ ...base, motivo: "ab" }).success).toBe(false);
  });

  it("recusa Tempo Reserva em parada prevista e aceita na não prevista", () => {
    expect(esquemaDePararDia.safeParse({ ...base, consomeTempoReserva: true }).success).toBe(false);
    expect(
      esquemaDePararDia.safeParse({ ...base, prevista: false, consomeTempoReserva: true }).success,
    ).toBe(true);
  });
});
