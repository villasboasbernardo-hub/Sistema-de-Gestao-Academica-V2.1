/**
 * Quem baixa a planilha de contingência — `FR-001`, `FR-002` da spec 015.
 */
import { describe, expect, it, vi } from "vitest";

/*
 * ⚠️ A matriz de permissões é módulo de servidor (`server-only`) e lê o banco; aqui só se usa a
 * função pura `pode` dela, então o cliente do servidor nunca é chamado.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  criarClienteDeServidor: async () => {
    throw new Error("o teste da rota não fala com o banco");
  },
}));

import { podeBaixarPlanilhaDeContingencia } from "@/app/(app)/turmas/[turma]/dsa/planilha/acesso";

const lanca = new Set(["registros_aula:ler", "registros_aula:criar"]);
const soLe = new Set(["registros_aula:ler"]);

describe("uma condição só, para a rota e os dois botões", () => {
  it("quem lança, em turma presencial, baixa", () => {
    expect(podeBaixarPlanilhaDeContingencia(lanca, "presencial")).toBe(true);
  });
  it("quem só lê o DSA não baixa", () => {
    expect(podeBaixarPlanilhaDeContingencia(soLe, "presencial")).toBe(false);
  });
  it("turma EAD puro não tem DSA nem planilha (`FR-002`)", () => {
    expect(podeBaixarPlanilhaDeContingencia(lanca, "ead")).toBe(false);
  });
  it("semipresencial MANTÉM — tem DSA na etapa presencial (`D-DSA-2`)", () => {
    expect(podeBaixarPlanilhaDeContingencia(lanca, "semipresencial")).toBe(true);
  });
});
