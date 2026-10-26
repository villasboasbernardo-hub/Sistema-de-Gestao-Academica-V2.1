/**
 * RD-4 (Bloco 11, spec 026) — Limpar semana: os lançamentos da turma, pela mesma exclusão do cartão.
 */
import { describe, expect, it } from "vitest";

import { camposDaExclusao, lancamentosParaLimpar } from "@/lib/dominio/dsa/limpar-semana";

const T = "turma-1";
const l = (
  origem: string,
  fatoId: string,
  extra: Partial<{ sessaoId: string | null; turmaId: string | null; bloqueiaAula: boolean }> = {},
) => ({ origem, fatoId, sessaoId: null, turmaId: T, bloqueiaAula: false, ...extra });

describe("camposDaExclusao — a do cartão", () => {
  it("a prova sai cancelada; o resto, inativo", () => {
    expect(camposDaExclusao("avaliacao")).toEqual({ status: "cancelada" });
    expect(camposDaExclusao("aula")).toEqual({ status: "inativo" });
    expect(camposDaExclusao("vista_prova")).toEqual({ status: "inativo" });
  });
});

describe("lancamentosParaLimpar — o que entra (D-17)", () => {
  it("aula, atividade da turma, prova e EI entram", () => {
    const r = lancamentosParaLimpar([
      l("aula", "a1"),
      l("atividade_nao_letiva", "ei"),
      l("avaliacao", "p1"),
    ]);
    expect(r.map((x) => `${x.origem}:${x.id}`).sort()).toEqual([
      "atividade_nao_letiva:ei",
      "aula:a1",
      "avaliacao:p1",
    ]);
  });

  it("⚠️ a atividade de TODAS as turmas fica — excluí-la tiraria de todas", () => {
    expect(lancamentosParaLimpar([l("atividade_nao_letiva", "g", { turmaId: null })])).toEqual([]);
  });

  it("a parada do Calendário (TR que bloqueia aula) fica", () => {
    expect(
      lancamentosParaLimpar([l("atividade_nao_letiva", "tr", { bloqueiaAula: true })]),
    ).toEqual([]);
  });

  it("a sessão e a vista de prova de OUTRA semana saem sozinhas, pelo id da sessão", () => {
    const r = lancamentosParaLimpar([l("vista_prova", "prova-antiga", { sessaoId: "v1" })]);
    expect(r).toEqual([{ origem: "vista_prova", id: "v1" }]);
  });

  it("a sessão de uma prova que já sai inteira não vira operação de novo", () => {
    const r = lancamentosParaLimpar([
      l("avaliacao", "p1"),
      l("sessao_aplicacao", "p1", { sessaoId: "s2" }),
    ]);
    expect(r).toEqual([{ origem: "avaliacao", id: "p1" }]);
  });

  it("sem repetir o mesmo lançamento (a aula de vários tempos aparece uma vez)", () => {
    expect(lancamentosParaLimpar([l("aula", "a1"), l("aula", "a1")])).toHaveLength(1);
  });
});
