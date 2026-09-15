/**
 * `FR-016` e `RN-2027-06` — a carga semanal do instrutor por semana ISO, pela decisão de 15/09/2026.
 *
 * ⚠️ AS DATAS SÃO DE 2026 E FORAM ESCOLHIDAS PELO CALENDÁRIO: 02/03/2026 é segunda-feira (semana ISO
 * 10) e 29/03/2026 é domingo (semana 13). Uma janela de 02/03 a 29/03 cobre exatamente quatro semanas.
 */
import { describe, expect, it } from "vitest";

import {
  cargaPorSemana,
  semanaIsoDe,
  semanasForaDaFaixa,
  type AtribuicaoComJanela,
} from "@/lib/dominio/carga-semanal";

const REGIME_20H = { minimo: 8, maximo: 12 };
const janela = (inicio: string, termino: string, mediaSemanal: number): AtribuicaoComJanela => ({
  inicio,
  termino,
  mediaSemanal,
});

describe("semana ISO · segunda a domingo", () => {
  it("02/03/2026 é segunda da semana 10; 29/03/2026 é domingo da semana 13", () => {
    expect(semanaIsoDe("2026-03-02")).toEqual({
      ano: 2026,
      numero: 10,
      segunda: "2026-03-02",
      domingo: "2026-03-08",
    });
    expect(semanaIsoDe("2026-03-29")?.numero).toBe(13);
  });

  it("a virada de ano segue a ISO: 01/01/2027 cai na semana 53 de 2026", () => {
    expect(semanaIsoDe("2027-01-01")).toMatchObject({ ano: 2026, numero: 53 });
  });
});

describe("`FR-016` · a soma é por semana, nunca do ano inteiro", () => {
  it("janelas que não se tocam: cada semana carrega só a sua média", () => {
    const cargas = cargaPorSemana([
      janela("2026-03-02", "2026-03-15", 10),
      janela("2026-08-03", "2026-08-16", 10),
    ]);
    expect(cargas.map((c) => [c.semana.numero, c.carga])).toEqual([
      [10, 10],
      [11, 10],
      [32, 10],
      [33, 10],
    ]);
    // 🛑 Somar o ano daria 20 h e um alerta falso para quem nunca passou de 10 h numa semana.
    expect(semanasForaDaFaixa(cargas, REGIME_20H)).toEqual([]);
  });

  it("janelas sobrepostas somam só nas semanas em comum, e o alerta nomeia a semana", () => {
    const cargas = cargaPorSemana([
      janela("2026-03-02", "2026-03-29", 7),
      janela("2026-03-16", "2026-04-12", 7),
    ]);
    expect(cargas.map((c) => [c.semana.numero, c.carga, c.atribuicoes])).toEqual([
      [10, 7, 1],
      [11, 7, 1],
      [12, 14, 2],
      [13, 14, 2],
      [14, 7, 1],
      [15, 7, 1],
    ]);
    const fora = semanasForaDaFaixa(cargas, REGIME_20H);
    expect(fora.map((f) => [f.semana.numero, f.situacao])).toEqual([
      [10, "abaixo"],
      [11, "abaixo"],
      [12, "acima"],
      [13, "acima"],
      [14, "abaixo"],
      [15, "abaixo"],
    ]);
    expect(fora[2]?.semana).toMatchObject({ segunda: "2026-03-16", domingo: "2026-03-22" });
  });

  it("uma janela que começa na quarta cobre a semana inteira daquela quarta", () => {
    const cargas = cargaPorSemana([janela("2026-03-04", "2026-03-10", 9)]);
    expect(cargas.map((c) => c.semana.numero)).toEqual([10, 11]);
  });
});

describe("T011 (d) · limites inclusivos, sem erro de ponto flutuante", () => {
  it("exatamente 8 e exatamente 12 estão dentro — inclusive somando 0,1 + 0,2 + …", () => {
    const oito = cargaPorSemana([
      janela("2026-03-02", "2026-03-08", 2.7),
      janela("2026-03-02", "2026-03-08", 5.3),
    ]);
    const doze = cargaPorSemana([
      janela("2026-03-02", "2026-03-08", 0.1),
      janela("2026-03-02", "2026-03-08", 0.2),
      janela("2026-03-02", "2026-03-08", 11.7),
    ]);
    expect(oito[0]?.carga).toBe(8);
    expect(doze[0]?.carga).toBe(12);
    expect(semanasForaDaFaixa(oito, REGIME_20H)).toEqual([]);
    expect(semanasForaDaFaixa(doze, REGIME_20H)).toEqual([]);
  });

  it("7,99 alerta abaixo e 12,01 alerta acima", () => {
    const abaixo = cargaPorSemana([janela("2026-03-02", "2026-03-08", 7.99)]);
    const acima = cargaPorSemana([janela("2026-03-02", "2026-03-08", 12.01)]);
    expect(semanasForaDaFaixa(abaixo, REGIME_20H)[0]?.situacao).toBe("abaixo");
    expect(semanasForaDaFaixa(acima, REGIME_20H)[0]?.situacao).toBe("acima");
  });
});

describe("sem atribuição · sem semana e sem alerta", () => {
  it("instrutor sem atribuição não tem semana nenhuma, e não alerta", () => {
    expect(cargaPorSemana([])).toEqual([]);
    expect(semanasForaDaFaixa(cargaPorSemana([]), REGIME_20H)).toEqual([]);
  });

  it("atribuição sem janela ou sem média não entra em semana nenhuma", () => {
    expect(
      cargaPorSemana([
        { inicio: null, termino: "2026-03-29", mediaSemanal: 10 },
        { inicio: "2026-03-02", termino: null, mediaSemanal: 10 },
        { inicio: "2026-03-02", termino: "2026-03-29", mediaSemanal: null },
      ]),
    ).toEqual([]);
  });

  it("sem faixa — regime não informado — não há o que comparar", () => {
    const cargas = cargaPorSemana([janela("2026-03-02", "2026-03-08", 40)]);
    expect(semanasForaDaFaixa(cargas, null)).toEqual([]);
  });
});
