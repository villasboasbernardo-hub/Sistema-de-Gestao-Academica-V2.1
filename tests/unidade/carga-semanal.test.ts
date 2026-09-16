/**
 * `FR-016` e `RN-2027-06` — a carga semanal do instrutor por semana ISO, pela decisão de 15/09/2026.
 *
 * ⚠️ AS DATAS SÃO DE 2026 E FORAM ESCOLHIDAS PELO CALENDÁRIO: 02/03/2026 é segunda-feira (semana ISO
 * 10) e 29/03/2026 é domingo (semana 13). Uma janela de 02/03 a 29/03 cobre exatamente quatro semanas.
 */
import { describe, expect, it } from "vitest";

import {
  cargaPorSemana,
  limitesDoAnoIso,
  semanaIsoDe,
  semanasDoAno,
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

describe("CHK005 · todas as semanas ISO do ano corrente, decisão de 15/09/2026", () => {
  it("o ano ISO de 2026 vai de 29/12/2025 a 03/01/2027; o de 2027, de 04/01/2027 a 02/01/2028", () => {
    expect(limitesDoAnoIso(2026)).toEqual({ inicio: "2025-12-29", fim: "2027-01-03" });
    expect(limitesDoAnoIso(2027)).toEqual({ inicio: "2027-01-04", fim: "2028-01-02" });
  });

  it("a parte de 2026 de uma janela que começou em 2025 entra; as semanas de 2025 saem", () => {
    // 01/12/2025 (segunda, semana 49 de 2025) a 25/01/2026 (domingo, semana 4 de 2026).
    const cargas = cargaPorSemana([janela("2025-12-01", "2026-01-25", 14)]);
    const doAno = semanasDoAno(cargas, 2026);
    expect(doAno.map((c) => `${c.semana.numero}/${c.semana.ano}`)).toEqual([
      "1/2026",
      "2/2026",
      "3/2026",
      "4/2026",
    ]);
    // A semana 1 de 2026 começa em 29/12/2025: ela é do ano corrente, mesmo com três dias de 2025.
    expect(doAno[0]?.semana.segunda).toBe("2025-12-29");
    expect(semanasForaDaFaixa(doAno, REGIME_20H)).toHaveLength(4);
  });

  it("semana de janela que avança para o ano seguinte sai do ano corrente", () => {
    // 21/12/2026 a 10/01/2027: semanas 52 e 53 de 2026, e 1 de 2027.
    const cargas = cargaPorSemana([janela("2026-12-21", "2027-01-10", 14)]);
    expect(semanasDoAno(cargas, 2026).map((c) => c.semana.numero)).toEqual([52, 53]);
    expect(semanasDoAno(cargas, 2027).map((c) => c.semana.numero)).toEqual([1]);
  });

  it("não há recorte por hoje: semana que já passou conta igual", () => {
    const cargas = cargaPorSemana([janela("2026-01-05", "2026-01-11", 20)]);
    expect(semanasForaDaFaixa(semanasDoAno(cargas, 2026), REGIME_20H)).toHaveLength(1);
  });
});
