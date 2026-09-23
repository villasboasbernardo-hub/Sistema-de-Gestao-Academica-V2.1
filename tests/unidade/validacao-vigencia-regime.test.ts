/**
 * `FR-019` / `FR-022` · o esquema da vigência de regime.
 *
 * ⚠️ **ELE ESPELHA OS `CHECK` DO BANCO, e é por isso que os casos são os valores das bordas.** Um
 * esquema mais estrito que o banco recusaria cadastro legítimo; um mais frouxo empurraria a recusa
 * para o `23514`, que não nomeia campo nenhum.
 */
import { describe, expect, it } from "vitest";

import { esquemaDeVigencia } from "@/lib/validacao/vigencia-regime";

const completa = {
  tipo_regime: "padrao",
  vigente_de: "2026-01-01",
  regime_tempos: "8",
  ta_duracao_min: "45",
  intervalo_manha_min: "10",
  intervalo_tarde_min: "10",
  hora_inicio_manha: "07:30",
  hora_inicio_tarde: "13:30",
  limite_diario_ead_horas: "",
  fundamento_curricular: "PCP-FCT-2",
  motivo: "",
};

const conferir = (entrada: Record<string, unknown>) => esquemaDeVigencia.safeParse(entrada);
const mensagens = (entrada: Record<string, unknown>) => {
  const r = conferir(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("o mínimo que o `FR-019` exige", () => {
  it("a vigência completa passa", () => {
    expect(conferir(completa).success).toBe(true);
  });

  it("⚠️ tipo e data são obrigatórios — sem padrão silencioso (`FR-015.1`)", () => {
    expect(mensagens({ ...completa, tipo_regime: "" }).join(" ")).toContain("tipo de regime");
    expect(mensagens({ ...completa, vigente_de: "" }).join(" ")).toContain("obrigatória");
  });

  it("data fora do formato é recusada com o formato na mensagem", () => {
    expect(mensagens({ ...completa, vigente_de: "01/01/2026" }).join(" ")).toContain("aaaa-mm-dd");
  });

  it("tipo fora dos dois do banco é recusado", () => {
    expect(conferir({ ...completa, tipo_regime: "provisorio" }).success).toBe(false);
  });
});

describe("`FR-022` · a validação é a que o banco já faz", () => {
  it("TA de 45 e de 50 passam; 40 não", () => {
    expect(conferir({ ...completa, ta_duracao_min: "50" }).success).toBe(true);
    expect(mensagens({ ...completa, ta_duracao_min: "40" }).join(" ")).toContain("45 ou 50");
  });

  it("de 1 a 12 TA por dia — 12 passa, 13 não", () => {
    expect(conferir({ ...completa, regime_tempos: "12" }).success).toBe(true);
    expect(conferir({ ...completa, regime_tempos: "13" }).success).toBe(false);
  });

  it("o intervalo vai de 0 a 120", () => {
    expect(conferir({ ...completa, intervalo_manha_min: "0" }).success).toBe(true);
    expect(conferir({ ...completa, intervalo_manha_min: "120" }).success).toBe(true);
    expect(conferir({ ...completa, intervalo_manha_min: "121" }).success).toBe(false);
  });

  it("⚠️ a tarde começa DEPOIS da manhã, e a recusa aponta o campo da tarde", () => {
    const r = conferir({ ...completa, hora_inicio_manha: "13:30", hora_inicio_tarde: "07:30" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["hora_inicio_tarde"]);
    }
  });

  it("⚠️ O REGIME SÓ DE EAD é a exceção escrita no próprio `CHECK`: 0 TA com limite diário", () => {
    expect(
      conferir({
        ...completa,
        regime_tempos: "0",
        ta_duracao_min: "0",
        limite_diario_ead_horas: "4",
        hora_inicio_manha: "",
        hora_inicio_tarde: "",
      }).success,
      "um curso EAD legítimo deixou de ser cadastrável",
    ).toBe(true);
  });

  it("⚠️ mas 0 TA SEM limite diário é recusado — é o outro lado do mesmo `CHECK`", () => {
    expect(mensagens({ ...completa, regime_tempos: "0", ta_duracao_min: "0" }).join(" ")).toContain(
      "limite diário de EAD",
    );
  });

  it("limite diário de EAD, quando informado, é positivo", () => {
    expect(conferir({ ...completa, limite_diario_ead_horas: "0" }).success).toBe(false);
    expect(conferir({ ...completa, limite_diario_ead_horas: "4.5" }).success).toBe(true);
  });
});

describe("branco é ausência, nunca zero", () => {
  it("horas em branco não viram `00:00`", () => {
    const r = conferir({ ...completa, hora_inicio_manha: "", hora_inicio_tarde: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.hora_inicio_manha).toBeUndefined();
      expect(r.data.hora_inicio_tarde).toBeUndefined();
    }
  });

  it("⚠️ fundamento e motivo em branco não gravam string vazia", () => {
    const r = conferir({ ...completa, fundamento_curricular: "   ", motivo: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fundamento_curricular).toBeUndefined();
      expect(r.data.motivo).toBeUndefined();
    }
  });

  it("⚠️ e o limite de EAD em branco não vira 0 — 0 seria um limite, e ausência não é", () => {
    const r = conferir(completa);
    expect(r.success && r.data.limite_diario_ead_horas).toBeUndefined();
  });
});
