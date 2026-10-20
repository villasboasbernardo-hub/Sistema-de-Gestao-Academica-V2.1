/**
 * O Zod dos regimes nomeados (spec 018) e o campo do regime na edição da turma.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaEdicaoDoRegime,
  esquemaDaSituacaoDoRegime,
  esquemaDoRegime,
} from "@/lib/validacao/regime-de-horario";
import { esquemaDeEdicaoDaTurma } from "@/lib/validacao/turma";

const CURSO = "6f1c2c1e-6f3a-4c5e-9a39-2c4b7f1d0a11";
const REGIME = "8d2e1f0a-3b4c-4d5e-8f60-718293a4b5c6";

const valido = {
  curso_id: CURSO,
  nome: "  Regime B  ",
  regime_tempos: "9",
  ta_duracao_min: "45",
  intervalo_manha_min: "5",
  intervalo_tarde_min: "5",
  hora_inicio_manha: "07:15",
  hora_inicio_tarde: "13:15",
  configuracao_horario_id: "",
  observacao: "",
};

describe("esquemaDoRegime", () => {
  it("aceita o regime e normaliza nome, números, relógio vazio e observação vazia", () => {
    const r = esquemaDoRegime.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success)
      expect(r.data).toEqual({
        curso_id: CURSO,
        nome: "Regime B",
        regime_tempos: 9,
        ta_duracao_min: 45,
        intervalo_manha_min: 5,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "07:15",
        hora_inicio_tarde: "13:15",
        configuracao_horario_id: null,
        observacao: null,
      });
  });

  it.each([
    [{ regime_tempos: "0" }, "TA por dia vai de 1 a 12."],
    [{ regime_tempos: "13" }, "TA por dia vai de 1 a 12."],
    [{ ta_duracao_min: "40" }, "A duração do TA é 45 ou 50 minutos."],
    [{ intervalo_manha_min: "121" }, "O intervalo vai até 120 minutos."],
    [{ nome: "   " }, "O nome do regime é obrigatório."],
    [{ hora_inicio_tarde: "07:00" }, "O início da tarde tem de ser depois do início da manhã."],
    [{ hora_inicio_manha: "7h" }, "Informe o início da manhã no formato hh:mm."],
  ])("recusa %o", (troca, mensagem) => {
    const r = esquemaDoRegime.safeParse({ ...valido, ...troca });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain(mensagem);
  });
});

describe("esquemaDaEdicaoDoRegime — RF-HOR-02", () => {
  it("descarta quantidade e duração que vierem no corpo", () => {
    const r = esquemaDaEdicaoDoRegime.safeParse({
      ...valido,
      id: REGIME,
      regime_tempos: "10",
      ta_duracao_min: "50",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("regime_tempos");
      expect(r.data).not.toHaveProperty("ta_duracao_min");
      expect(r.data).not.toHaveProperty("curso_id");
    }
  });
});

describe("esquemaDaSituacaoDoRegime", () => {
  it("só o id do regime: a situação é a da ação, e uma que venha no corpo é descartada", () => {
    const r = esquemaDaSituacaoDoRegime.safeParse({ id: REGIME, status: "apagado" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ id: REGIME });
    expect(esquemaDaSituacaoDoRegime.safeParse({ id: "Regime B" }).success).toBe(false);
  });
});

describe("o regime na edição da turma", () => {
  const turma = { ano_letivo: 2026, modalidade: "presencial" };

  it("ausente, NÃO entra no que se grava (a coluna fica como está)", () => {
    const r = esquemaDeEdicaoDaTurma.safeParse(turma);
    expect(r.success).toBe(true);
    if (r.success) expect("regime_de_horario_id" in r.data).toBe(false);
  });

  it("vazio é o regime vigente do curso (nulo); um id é o regime escolhido", () => {
    const vazio = esquemaDeEdicaoDaTurma.safeParse({ ...turma, regime_de_horario_id: "" });
    const escolhido = esquemaDeEdicaoDaTurma.safeParse({ ...turma, regime_de_horario_id: REGIME });
    expect(vazio.success && vazio.data.regime_de_horario_id).toBeNull();
    expect(escolhido.success && escolhido.data.regime_de_horario_id).toBe(REGIME);
  });

  it("⚠️ na turma EAD o regime não é tocado, mesmo que venha (C-15)", () => {
    const r = esquemaDeEdicaoDaTurma.safeParse({
      ...turma,
      modalidade: "ead",
      regime_de_horario_id: REGIME,
    });
    expect(r.success).toBe(true);
    if (r.success) expect("regime_de_horario_id" in r.data).toBe(false);
  });

  it("recusa o que não é id", () => {
    expect(
      esquemaDeEdicaoDaTurma.safeParse({ ...turma, regime_de_horario_id: "Regime B" }).success,
    ).toBe(false);
  });
});
