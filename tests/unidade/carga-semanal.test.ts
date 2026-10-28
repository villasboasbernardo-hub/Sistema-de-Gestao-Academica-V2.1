/**
 * `FR-016` e `RN-2027-06` — a carga semanal do instrutor por semana ISO, pela decisão de 15/09/2026.
 *
 * ⚠️ **SÓ ACIMA DA FAIXA, desde 22/10/2026** (spec 022, Bloco 7, item 11 — mudança de regra autorizada nominalmente
 * por Bernardo Villas Boas): *"aviso de carga horária SÓ quando a carga semanal está ACIMA da faixa (abaixo da faixa
 * deixa de avisar)"*. Emenda o `FR-016` da spec 006 e a T011 (d); a faixa do `RN-2027-06` não muda.
 *
 * ⚠️ AS DATAS SÃO DE 2026 E FORAM ESCOLHIDAS PELO CALENDÁRIO: 02/03/2026 é segunda-feira (semana ISO
 * 10) e 29/03/2026 é domingo (semana 13). Uma janela de 02/03 a 29/03 cobre exatamente quatro semanas.
 */
import { describe, expect, it } from "vitest";

import {
  cargaPorSemana,
  janelaDaCarga,
  limitesDoAnoIso,
  semanaIsoDe,
  semanasAcimaDaFaixa,
  semanasDoAno,
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
    expect(semanasAcimaDaFaixa(cargas, REGIME_20H)).toEqual([]);
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
    // ⚠️ Item 11 da spec 022: as quatro semanas de 7 h estão ABAIXO da faixa de 8 a 12 h e não avisam mais.
    const acima = semanasAcimaDaFaixa(cargas, REGIME_20H);
    expect(acima.map((f) => [f.semana.numero, f.carga])).toEqual([
      [12, 14],
      [13, 14],
    ]);
    expect(acima[0]?.semana).toMatchObject({ segunda: "2026-03-16", domingo: "2026-03-22" });
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
    expect(semanasAcimaDaFaixa(oito, REGIME_20H)).toEqual([]);
    expect(semanasAcimaDaFaixa(doze, REGIME_20H)).toEqual([]);
  });

  it("⚠️ O CASO QUE DISCRIMINA O ITEM 11: 7,99 (abaixo) NÃO avisa; 12,01 (acima) avisa", () => {
    const abaixo = cargaPorSemana([janela("2026-03-02", "2026-03-08", 7.99)]);
    const acima = cargaPorSemana([janela("2026-03-02", "2026-03-08", 12.01)]);
    expect(semanasAcimaDaFaixa(abaixo, REGIME_20H)).toEqual([]);
    expect(semanasAcimaDaFaixa(acima, REGIME_20H).map((s) => s.carga)).toEqual([12.01]);
  });
});

describe("sem atribuição · sem semana e sem alerta", () => {
  it("instrutor sem atribuição não tem semana nenhuma, e não alerta", () => {
    expect(cargaPorSemana([])).toEqual([]);
    expect(semanasAcimaDaFaixa(cargaPorSemana([]), REGIME_20H)).toEqual([]);
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
    expect(semanasAcimaDaFaixa(cargas, null)).toEqual([]);
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
    expect(semanasAcimaDaFaixa(doAno, REGIME_20H)).toHaveLength(4);
  });

  it("semana de janela que avança para o ano seguinte sai do ano corrente", () => {
    // 21/12/2026 a 10/01/2027: semanas 52 e 53 de 2026, e 1 de 2027.
    const cargas = cargaPorSemana([janela("2026-12-21", "2027-01-10", 14)]);
    expect(semanasDoAno(cargas, 2026).map((c) => c.semana.numero)).toEqual([52, 53]);
    expect(semanasDoAno(cargas, 2027).map((c) => c.semana.numero)).toEqual([1]);
  });

  it("não há recorte por hoje: semana que já passou conta igual", () => {
    const cargas = cargaPorSemana([janela("2026-01-05", "2026-01-11", 20)]);
    expect(semanasAcimaDaFaixa(semanasDoAno(cargas, 2026), REGIME_20H)).toHaveLength(1);
  });
});

/*
 * Spec 029 (Bloco 14), item 4 — PEND-025-5, FR-004 e as decisões D-9 a D-11:
 *
 * > *"A janela da carga de uma atribuição nunca sai do período da própria turma: é a previsão (linha da turma →
 * > disciplina → turma) recortada pelo período da turma; se a previsão não toca o período, a janela é o período da
 * > turma."* — FR-004.1 (D-9, recorte)
 *
 * ⚠️ O DEFEITO MEDIDO NO REMOTO: a `CAHO 2027` (HIDROGRAFIA, instrutor de código 40) tem a janela da DISCIPLINA, de 11/05
 *    a 16/10/2026, e a turma vai de 05/01 a 17/12/2027 — disjuntas. O alerta lilás de 2027 cortava todas as semanas
 *    (`semanasDoAno`) e não a via. As datas abaixo são de 2046 e 2047, os anos da amostra do pgTAP `150`, longe do dado
 *    real; o formato da entrada e da saída é `{ inicio, termino }`, `AAAA-MM-DD` ou nulo.
 * ⚠️ A VIEW NÃO MUDA (D-11): `vw_instrutor_carga_prevista` continua devolvendo a PREVISÃO; o recorte mora nesta função,
 *    ponto único da janela da carga, aplicada na ficha do instrutor e em Avisos.
 */
describe("FR-004 · `janelaDaCarga` — a janela nunca sai do período da turma (D-9, recorte)", () => {
  const TURMA_2047 = { inicio: "2047-03-02", termino: "2047-11-30" };

  it("previsão dentro do período: a janela é a previsão, sem tocar em nada", () => {
    const previsao = { inicio: "2047-03-02", termino: "2047-06-26" };
    expect(janelaDaCarga(previsao, TURMA_2047)).toEqual(previsao);
  });

  it("previsão que TRANSBORDA o término (a C-Exp-MetocOf 2026, uma semana além): recortada no término da turma", () => {
    expect(janelaDaCarga({ inicio: "2047-10-05", termino: "2047-12-07" }, TURMA_2047)).toEqual({
      inicio: "2047-10-05",
      termino: "2047-11-30",
    });
  });

  it("previsão que começa ANTES do início: recortada no início da turma", () => {
    expect(janelaDaCarga({ inicio: "2047-02-15", termino: "2047-04-30" }, TURMA_2047)).toEqual({
      inicio: "2047-03-02",
      termino: "2047-04-30",
    });
  });

  it("previsão que cobre o período e passa dos dois lados: recortada nos dois — é o período da turma", () => {
    expect(janelaDaCarga({ inicio: "2047-01-04", termino: "2047-12-26" }, TURMA_2047)).toEqual(
      TURMA_2047,
    );
  });

  it("previsão que toca o período num dia só: o recorte é esse dia (limites inclusivos), não o período inteiro", () => {
    expect(janelaDaCarga({ inicio: "2047-02-01", termino: "2047-03-02" }, TURMA_2047)).toEqual({
      inicio: "2047-03-02",
      termino: "2047-03-02",
    });
  });

  it("⚠️ O CASO QUE DISCRIMINA: previsão de 2046 e turma de 2047, DISJUNTAS — a janela é o período da turma", () => {
    const turma = { inicio: "2047-01-04", termino: "2047-12-17" };
    expect(janelaDaCarga({ inicio: "2046-05-11", termino: "2046-10-16" }, turma)).toEqual(turma);
    // E disjunta pelo outro lado: a previsão depois do término.
    expect(janelaDaCarga({ inicio: "2048-03-06", termino: "2048-06-30" }, TURMA_2047)).toEqual(
      TURMA_2047,
    );
  });

  it("o efeito no alerta: com a previsão de 2046, o ano de 2047 não tem semana; com a janela da carga, tem", () => {
    const previsao = { inicio: "2046-05-11", termino: "2046-10-16" };
    const turma = { inicio: "2047-01-04", termino: "2047-12-17" };
    const semanas = (j: { inicio: string | null; termino: string | null }) =>
      semanasAcimaDaFaixa(
        semanasDoAno(cargaPorSemana([{ ...j, mediaSemanal: 15 }]), 2047),
        REGIME_20H,
      );
    // Hoje (a previsão crua): o alerta de 2047 corta todas as semanas, e a turma some dele.
    expect(semanas(previsao)).toEqual([]);
    // Depois: as 51 semanas ISO de 2047 que o período da turma toca, de 04/01 (sexta-feira da semana 1, que começa
    // em 31/12/2046) a 17/12 (terça-feira da semana 51).
    const depois = semanas(janelaDaCarga(previsao, turma));
    expect(depois).toHaveLength(51);
    expect(depois[0]?.semana).toMatchObject({ ano: 2047, numero: 1, segunda: "2046-12-31" });
    expect(depois.at(-1)?.semana).toMatchObject({ ano: 2047, numero: 51 });
    expect(depois.every((s) => s.carga === 15)).toBe(true);
  });

  it("turma sem período completo fica como hoje: a previsão como veio, mesmo fora do ano da turma (FR-004.3)", () => {
    const previsao = { inicio: "2046-05-11", termino: "2046-10-16" };
    expect(janelaDaCarga(previsao, { inicio: null, termino: null })).toEqual(previsao);
    expect(janelaDaCarga(previsao, { inicio: "2047-03-02", termino: null })).toEqual(previsao);
    expect(janelaDaCarga(previsao, { inicio: null, termino: "2047-11-30" })).toEqual(previsao);
    // A previsão incompleta (o início que existir, sem término) também passa como veio.
    expect(
      janelaDaCarga({ inicio: "2047-03-02", termino: null }, { inicio: null, termino: null }),
    ).toEqual({ inicio: "2047-03-02", termino: null });
  });

  it("previsão nula: sem janela — o recorte não inventa período (a view só a devolve nula quando a turma não tem um)", () => {
    expect(janelaDaCarga({ inicio: null, termino: null }, { inicio: null, termino: null })).toEqual(
      {
        inicio: null,
        termino: null,
      },
    );
    expect(janelaDaCarga({ inicio: null, termino: null }, TURMA_2047)).toEqual({
      inicio: null,
      termino: null,
    });
  });
});
