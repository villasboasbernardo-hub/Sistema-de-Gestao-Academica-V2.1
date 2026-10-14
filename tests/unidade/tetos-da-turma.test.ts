/**
 * `RN-EVT-01` · `FR-002` a `FR-007`, `FR-025.4` (spec 014) — os cards de AEC, TAD e TR da turma.
 *
 * Os dois percentuais da D-TETO-3, nesta ordem: cumprido ÷ previsto e cumprido ÷ máximo. NUNCA sobre a
 * CH. O alerta é informativo (`RN-DEG-02`): nada no retorno serve para recusar gravação (SC-003).
 */
import { describe, expect, it } from "vitest";

import { tetosDaTurma, type EntradaDosTetos } from "@/lib/dominio/tetos-da-turma";

const base: EntradaDosTetos = {
  chCurricular: 545,
  cumprido: { chd: 400, aec: 10, tad: 29, tr: 5, estudoIndividual: 12, apoioIndividualizado: 4 },
  diasParados: [],
  previstoProens: { tad: 25, tr: 20 },
  limitesDoCurriculo: {},
  percentuais: { aec: 10, tad: 5, tr: 10 },
  referenciaEi: { comEstudoObrigatorio: 20, semEstudoObrigatorio: 10 },
  ead: false,
};

function cards(entrada: Partial<EntradaDosTetos> = {}) {
  const r = tetosDaTurma({ ...base, ...entrada });
  if (r.ead) throw new Error("esperava turma com DSA");
  return r;
}

describe("tetosDaTurma — US1 cenário 1 (TAD acima do previsto e do máximo)", () => {
  it("29 de 25 previstos (116 %) · 29 de 27,25 máximos (106 %), nesta ordem", () => {
    const { tad } = cards().cards;
    expect(tad.cumprido).toBe(29);
    expect(tad.previsto).toBe(25);
    expect(tad.maximo).toEqual({ valor: 27.25, origem: "norma" });
    expect(tad.percentualDoPrevisto).toBe(116);
    expect(tad.percentualDoMaximo).toBe(106);
    expect(tad.alertas).toEqual(["acima_do_previsto", "acima_do_maximo"]);
  });

  it("a barra vai de 0 ao máximo, com o marcador do previsto", () => {
    expect(cards().cards.tad.barra).toEqual({ maximo: 27.25, marcadorDoPrevisto: 25 });
  });
});

describe("tetosDaTurma — US1 cenário 2.1 (no previsto, dentro do máximo)", () => {
  it("5 de 5 previstos (100 %) · 5 de 25 máximos (20 %), sem alerta", () => {
    const r = cards({
      chCurricular: 500,
      cumprido: { ...base.cumprido, tad: 5 },
      previstoProens: { tad: 5 },
    });
    expect(r.cards.tad.percentualDoPrevisto).toBe(100);
    expect(r.cards.tad.percentualDoMaximo).toBe(20);
    expect(r.cards.tad.alertas).toEqual([]);
  });
});

describe("tetosDaTurma — fronteiras", () => {
  it("cumprido = previsto: sem alerta; previsto + 1: acima do previsto", () => {
    expect(cards({ cumprido: { ...base.cumprido, tr: 20 } }).cards.tr.alertas).toEqual([]);
    expect(cards({ cumprido: { ...base.cumprido, tr: 21 } }).cards.tr.alertas).toEqual([
      "acima_do_previsto",
    ]);
  });

  it("máximo + 1 sem previsto: só acima do máximo", () => {
    const r = cards({ cumprido: { ...base.cumprido, aec: 55.5 } });
    expect(r.cards.aec.previsto).toBe("nao_definido");
    expect(r.cards.aec.alertas).toEqual(["acima_do_maximo"]);
  });

  it("sem previsto: 'nao_definido' (nunca zero) e o primeiro percentual nulo", () => {
    const { aec } = cards().cards;
    expect(aec.previsto).toBe("nao_definido");
    expect(aec.percentualDoPrevisto).toBeNull();
    expect(aec.barra).toEqual({ maximo: 54.5, marcadorDoPrevisto: null });
  });

  it("limite declarado pelo currículo vale no lugar da norma", () => {
    const r = cards({ limitesDoCurriculo: { aec: 65 } });
    expect(r.cards.aec.maximo).toEqual({ valor: 65, origem: "curriculo" });
  });

  it("turma sem CH curricular: máximo não calculável, sem segundo percentual", () => {
    const r = cards({ chCurricular: null });
    expect(r.cards.tad.maximo).toBe("sem_ch_curricular");
    expect(r.cards.tad.percentualDoMaximo).toBeNull();
    expect(r.cards.tad.barra).toBeNull();
    expect(r.cards.tad.alertas).toEqual(["acima_do_previsto"]);
  });

  it("parâmetro ausente no ano: aviso, sem número inventado", () => {
    const r = cards({ percentuais: { aec: 10, tad: null, tr: 10 } });
    expect(r.cards.tad.maximo).toBe("parametro_nao_cadastrado");
    expect(r.cards.tad.percentualDoMaximo).toBeNull();
  });
});

describe("tetosDaTurma — CHT, EI, Apoio e dias parados (FR-002, FR-025.4)", () => {
  it("CHT = CHD + AEC + TAD + TR, e só isso", () => {
    const r = cards();
    expect(r.cht).toBe(400 + 10 + 29 + 5);
    expect([r.chd, r.aec, r.tad, r.tr]).toEqual([400, 10, 29, 5]);
  });

  it("somar Estudo Individual, Apoio ou dias parados à CHT é ERRO DE TIPO", () => {
    const r = cards();
    // @ts-expect-error — Estudo Individual não é número somável à CHT (RN-EVT-01).
    expect(typeof (r.cht + r.estudoIndividual)).toBe("string");
    // @ts-expect-error — Apoio Individualizado fica fora da CHT (spec 014, D-AA-12).
    expect(typeof (r.cht + r.apoioIndividualizado)).toBe("string");
    // @ts-expect-error — dia parado fica fora da CHT (Q-14).
    expect(typeof (r.cht + r.diasParados)).toBe("string");
  });

  it("Estudo Individual traz as duas referências, só informativas", () => {
    const r = cards();
    expect(r.estudoIndividual.cumprido).toBe(12);
    expect(r.estudoIndividual.referencias.map((x) => x.percentual)).toEqual([20, 10]);
  });

  it("Apoio Individualizado é só a contagem", () => {
    expect(cards().apoioIndividualizado.cumprido).toBe(4);
  });

  it("dias parados por tipo, em tempos e em dias", () => {
    const r = cards({
      diasParados: [
        { tipo: "LA", tempos: 4, dias: 1 },
        { tipo: "FR", tempos: 16, dias: 2 },
        { tipo: "LA", tempos: 8, dias: 1 },
      ],
    });
    expect(r.diasParados.tempos).toBe(28);
    expect(r.diasParados.dias).toBe(4);
    expect(r.diasParados.porTipo).toEqual({
      LA: { tempos: 12, dias: 2 },
      FR: { tempos: 16, dias: 2 },
    });
  });

  it("turma EAD: sem cards", () => {
    expect(tetosDaTurma({ ...base, ead: true })).toEqual({ ead: true });
  });

  it("os literais de origem são sem acento, iguais ao banco", () => {
    const r = cards({ limitesDoCurriculo: { aec: 65 } });
    const origens = [r.cards.aec.maximo, r.cards.tad.maximo].map((m) =>
      typeof m === "object" ? m.origem : m,
    );
    expect(origens).toEqual(["curriculo", "norma"]);
  });
});
