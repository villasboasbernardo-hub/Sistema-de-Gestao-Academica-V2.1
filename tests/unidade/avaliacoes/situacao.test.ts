import { describe, expect, it } from "vitest";

import tabela from "@/tests/unidade/dados/situacao-da-avaliacao.json";
import { situacaoDaAvaliacao, type NaturezaDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";

/**
 * `RN-AVAL-01` e FR-050 a FR-052 da spec 014: a situação calculada na leitura, pela tabela de casos única
 * (R-8), que a prova cruzada também lê contra `app.fn_status_vista`.
 */
describe("situação da avaliação — tabela de casos única", () => {
  for (const caso of tabela.casos) {
    it(caso.nome, () => {
      expect(
        situacaoDaAvaliacao({
          natureza: caso.natureza as NaturezaDaAvaliacao,
          estadoDoRegistro: "estadoDoRegistro" in caso ? (caso.estadoDoRegistro as string) : null,
          aplicacao: caso.aplicacao,
          sessoesDeVista: caso.sessoesDeVista,
          sessoesDeAplicacao:
            "sessoesDeAplicacao" in caso ? (caso.sessoesDeAplicacao as string[]) : [],
          temItemDeVista: caso.temItemDeVista,
          prazoDias: tabela.prazoDias,
          hoje: caso.hoje,
          terminoDaTurma: caso.terminoDaTurma,
        }),
      ).toBe(caso.esperado);
    });
  }
});

describe("situação da OD — a disciplina decide, não a aplicação (Q-17)", () => {
  for (const caso of tabela.casosOd) {
    it(caso.nome, () => {
      expect(
        situacaoDaAvaliacao({
          natureza: "od",
          aplicacao: null,
          sessoesDeVista: [],
          temItemDeVista: false,
          prazoDias: tabela.prazoDias,
          hoje: "2026-10-20",
          terminoDaTurma: "2026-12-15",
          disciplinaIniciada: caso.disciplinaIniciada,
          disciplinaConcluida: caso.disciplinaConcluida,
        }),
      ).toBe(caso.esperado);
    });
  }

  it("a OD não vira «sem correspondência» nem «atrasada» depois do término", () => {
    expect(
      situacaoDaAvaliacao({
        natureza: "od",
        aplicacao: null,
        sessoesDeVista: [],
        temItemDeVista: true,
        prazoDias: 7,
        hoje: "2027-01-10",
        terminoDaTurma: "2026-12-15",
        disciplinaIniciada: true,
        disciplinaConcluida: false,
      }),
    ).toBe("em_andamento");
  });
});

describe("o prazo vem por argumento (config_parametros), não fixo", () => {
  it("com prazo de 10 dias, o 8º dia continua em andamento", () => {
    expect(
      situacaoDaAvaliacao({
        natureza: "prova",
        aplicacao: "2026-10-01",
        sessoesDeVista: [],
        temItemDeVista: true,
        prazoDias: 10,
        hoje: "2026-10-09",
        terminoDaTurma: null,
      }),
    ).toBe("em_andamento");
  });
});
