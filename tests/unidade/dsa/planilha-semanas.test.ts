/**
 * As semanas da planilha de contingência — `FR-030`, `FR-014`, `FR-022` e `DP-3` da spec 015.
 */
import { describe, expect, it } from "vitest";

import {
  AVISO_SEM_ETAPA,
  AVISO_SEM_PERIODO,
  semanasDaPlanilha,
  temSabadoNoAno,
} from "@/lib/dominio/dsa/planilha/semanas";

const presencial = (dataInicio: string | null, dataTermino: string | null) => ({
  modalidade: "presencial",
  inicioEtapaPresencial: null,
  terminoEtapaPresencial: null,
  dataInicio,
  dataTermino,
});

describe("`FR-030` · o ano inteiro da turma", () => {
  it("da semana do início à do término, inclusive as passadas e as vazias", () => {
    const { semanas, avisos } = semanasDaPlanilha({
      turma: presencial("2026-01-05", "2026-12-18"),
      datasComLancamento: [],
      hoje: "2026-10-09",
    });
    expect(semanas[0]).toMatchObject({ ano: 2026, numero: 2 });
    expect(semanas[semanas.length - 1]).toMatchObject({ ano: 2026, numero: 51 });
    expect(semanas).toHaveLength(50);
    expect(avisos).toEqual([]);
  });

  it("o rótulo é único e legível: a semana, de segunda a sábado", () => {
    const { semanas } = semanasDaPlanilha({
      turma: presencial("2026-04-06", "2026-04-17"),
      datasComLancamento: [],
      hoje: "2026-04-08",
    });
    expect(semanas.map((s) => s.rotulo)).toEqual([
      "Semana 15 — 06/04 a 11/04/2026",
      "Semana 16 — 13/04 a 18/04/2026",
    ]);
    expect(semanas[0]?.seisDias).toEqual([
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
    ]);
  });

  it("atravessa a virada do ano pela semana ISO", () => {
    const { semanas } = semanasDaPlanilha({
      turma: presencial("2026-12-21", "2027-01-15"),
      datasComLancamento: [],
      hoje: "2026-12-22",
    });
    expect(semanas.map((s) => `${s.ano}-${s.numero}`)).toEqual([
      "2026-52",
      "2026-53",
      "2027-1",
      "2027-2",
    ]);
  });
});

describe("`FR-022` · a semana que abre selecionada", () => {
  it("é a corrente quando ela está no período", () => {
    const r = semanasDaPlanilha({
      turma: presencial("2026-01-05", "2026-12-18"),
      datasComLancamento: [],
      hoje: "2026-10-09",
    });
    expect(r.semanas[r.inicial]?.numero).toBe(41);
  });

  it("é a primeira quando a corrente está fora", () => {
    const r = semanasDaPlanilha({
      turma: presencial("2026-01-05", "2026-03-27"),
      datasComLancamento: [],
      hoje: "2026-10-09",
    });
    expect(r.inicial).toBe(0);
  });
});

describe("`FR-014` · semipresencial", () => {
  it("com etapa cadastrada, só as semanas da etapa presencial", () => {
    const { semanas, avisos } = semanasDaPlanilha({
      turma: {
        modalidade: "semipresencial",
        inicioEtapaPresencial: "2026-05-04",
        terminoEtapaPresencial: "2026-05-15",
        dataInicio: "2026-03-02",
        dataTermino: "2026-06-26",
      },
      datasComLancamento: [],
      hoje: "2026-05-05",
    });
    expect(semanas.map((s) => s.numero)).toEqual([19, 20]);
    expect(avisos).toEqual([]);
  });

  it("sem etapa cadastrada, todas as semanas, com o aviso", () => {
    const { semanas, avisos } = semanasDaPlanilha({
      turma: {
        modalidade: "semipresencial",
        inicioEtapaPresencial: null,
        terminoEtapaPresencial: null,
        dataInicio: "2026-03-02",
        dataTermino: "2026-03-20",
      },
      datasComLancamento: [],
      hoje: "2026-03-05",
    });
    expect(semanas.map((s) => s.numero)).toEqual([10, 11, 12]);
    expect(avisos).toEqual([AVISO_SEM_ETAPA]);
  });
});

describe("*Edge Cases* · turma sem período cadastrado", () => {
  it("da primeira à última semana com lançamento, mais a corrente, com o aviso", () => {
    const { semanas, avisos } = semanasDaPlanilha({
      turma: presencial(null, null),
      datasComLancamento: ["2026-03-10", "2026-03-24"],
      hoje: "2026-04-08",
    });
    expect(semanas.map((s) => s.numero)).toEqual([11, 12, 13, 14, 15]);
    expect(avisos).toEqual([AVISO_SEM_PERIODO]);
  });

  it("sem período e sem lançamento, só a semana corrente — nunca um ano inventado", () => {
    const { semanas } = semanasDaPlanilha({
      turma: presencial(null, null),
      datasComLancamento: [],
      hoje: "2026-04-08",
    });
    expect(semanas.map((s) => s.numero)).toEqual([15]);
  });
});

describe("`DP-3` · o sábado do ano", () => {
  it("só há coluna do sábado quando a turma lançou em sábado", () => {
    expect(temSabadoNoAno(["2026-04-06", "2026-04-11"])).toBe(true);
    expect(temSabadoNoAno(["2026-04-06", "2026-04-12"])).toBe(false);
    expect(temSabadoNoAno([])).toBe(false);
  });
});
