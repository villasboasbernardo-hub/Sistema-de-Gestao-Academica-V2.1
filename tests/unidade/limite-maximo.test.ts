/**
 * `RN-EVT-01` · `FR-001.1` (spec 014) — o limite máximo de AEC, TAD e TR de uma turma.
 *
 * O currículo que declara o número manda; sem ele, vale o percentual da norma sobre a CH curricular.
 * ⚠️ O percentual chega por parâmetro (regra 8): trocá-lo troca o veredito — é o caso que discrimina
 * de um número escrito no código (DoD 8).
 */
import { describe, expect, it } from "vitest";

import { limiteMaximo } from "@/lib/dominio/limite-maximo";

describe("limiteMaximo", () => {
  it("com o número declarado pelo currículo, vale ele, com origem currículo", () => {
    expect(limiteMaximo({ declarado: 65, chCurricular: 1257, percentual: 10 })).toEqual({
      valor: 65,
      origem: "curriculo",
    });
  });

  it("o declarado vale mesmo ACIMA do percentual (C-Espc-HN: TAD 62)", () => {
    expect(limiteMaximo({ declarado: 62, chCurricular: 400, percentual: 5 })).toEqual({
      valor: 62,
      origem: "curriculo",
    });
  });

  it("sem declarado, vale CH × percentual ÷ 100, com origem norma", () => {
    expect(limiteMaximo({ declarado: null, chCurricular: 1257, percentual: 5 })).toEqual({
      valor: 62.85,
      origem: "norma",
    });
  });

  it("mudar o percentual recebido muda o máximo (nada escrito no código)", () => {
    const a = limiteMaximo({ declarado: null, chCurricular: 545, percentual: 5 });
    const b = limiteMaximo({ declarado: null, chCurricular: 545, percentual: 6 });
    expect(a).toEqual({ valor: 27.25, origem: "norma" });
    expect(b).toEqual({ valor: 32.7, origem: "norma" });
  });

  it("o declarado ignora a troca do percentual (controle)", () => {
    const a = limiteMaximo({ declarado: 65, chCurricular: 545, percentual: 5 });
    const b = limiteMaximo({ declarado: 65, chCurricular: 545, percentual: 6 });
    expect(a).toEqual(b);
  });

  it("sem CH curricular e sem declarado, o máximo não é calculável", () => {
    expect(limiteMaximo({ declarado: null, chCurricular: null, percentual: 10 })).toBe(
      "sem_ch_curricular",
    );
    expect(limiteMaximo({ declarado: undefined, chCurricular: 0, percentual: 10 })).toBe(
      "sem_ch_curricular",
    );
  });

  it("sem percentual cadastrado no ano, avisa — nunca inventa número", () => {
    expect(limiteMaximo({ declarado: null, chCurricular: 1257, percentual: null })).toBe(
      "parametro_nao_cadastrado",
    );
  });

  it("declarado zero é número (zero TA permitidos), não ausência", () => {
    expect(limiteMaximo({ declarado: 0, chCurricular: 1257, percentual: 10 })).toEqual({
      valor: 0,
      origem: "curriculo",
    });
  });
});
