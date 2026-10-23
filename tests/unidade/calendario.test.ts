/**
 * `lib/dominio/calendario.ts` — a abrangência e o tipo das linhas do calendário (spec 023, Bloco 8; `RN-EVT-02`).
 */
import { describe, expect, it } from "vitest";

import {
  alcancaTurma,
  datasQueAlcancam,
  diasBloqueadosComLancamento,
  feriadosDaTurma,
  rotuloDaAbrangencia,
  tipoDaLinha,
  turmasEscolhidas,
} from "@/lib/dominio/calendario";

const TIPOS = ["FR", "LA", "LP", "RC", "PF", "NT"] as const;

describe("turmasEscolhidas", () => {
  it("só as ligações ativas contam", () => {
    expect(
      turmasEscolhidas([
        { turma_id: "a", status: "ativo" },
        { turma_id: "b", status: "inativo" },
      ]),
    ).toEqual(["a"]);
  });
  it("sem ligação (nulo, ausente ou vazia) é a lista vazia = todas", () => {
    expect(turmasEscolhidas(null)).toEqual([]);
    expect(turmasEscolhidas(undefined)).toEqual([]);
    expect(turmasEscolhidas([])).toEqual([]);
  });
});

describe("alcancaTurma", () => {
  it("lista vazia alcança toda turma", () => {
    expect(alcancaTurma([], "x")).toBe(true);
  });
  it("com turmas escolhidas, só elas", () => {
    expect(alcancaTurma(["a", "b"], "a")).toBe(true);
    expect(alcancaTurma(["a", "b"], "c")).toBe(false);
  });
});

describe("feriadosDaTurma e datasQueAlcancam", () => {
  const linhas = [
    { data: "2026-10-28", turmas: [] as string[] },
    { data: "2026-11-02", turmas: ["a"] },
    { data: "2026-11-20", turmas: ["b"] },
  ];
  it("a turma recebe as de todas e as que a escolheram", () => {
    expect(feriadosDaTurma(linhas, "a").map((l) => l.data)).toEqual(["2026-10-28", "2026-11-02"]);
    expect(datasQueAlcancam(linhas, "b")).toEqual(["2026-10-28", "2026-11-20"]);
    expect(datasQueAlcancam(linhas, "c")).toEqual(["2026-10-28"]);
  });
});

describe("tipoDaLinha", () => {
  it("a coluna vence", () => {
    expect(tipoDaLinha({ tipo: "LA", descricao: "FR — qualquer" }, TIPOS)).toBe("LA");
  });
  it("sem coluna, a sigla do prefixo «<sigla> — »", () => {
    expect(tipoDaLinha({ tipo: null, descricao: "PF — Dia do Servidor" }, TIPOS)).toBe("PF");
  });
  it("sem coluna e sem prefixo conhecido, nulo (não informado)", () => {
    expect(tipoDaLinha({ tipo: null, descricao: "Dia do Hidrógrafo" }, TIPOS)).toBeNull();
    expect(tipoDaLinha({ tipo: null, descricao: "XX — algo" }, TIPOS)).toBeNull();
  });
});

describe("rotuloDaAbrangencia", () => {
  it("todas, ou os códigos das turmas escolhidas", () => {
    expect(rotuloDaAbrangencia([])).toBe("Todas as turmas");
    expect(rotuloDaAbrangencia(["CAHO 2026", "C-Ap-FR 2026"])).toBe("CAHO 2026, C-Ap-FR 2026");
  });
});

describe("diasBloqueadosComLancamento", () => {
  it("conta só os lançamentos das turmas que a linha alcança", () => {
    const linhas = [
      { codigo: "FER-1", data: "2026-10-28", descricao: "PF — Servidor", turmas: [] as string[] },
      { codigo: "FER-2", data: "2026-11-02", descricao: "LA — só a", turmas: ["a"] },
      { codigo: "FER-3", data: "2026-11-20", descricao: "sem lançamento", turmas: [] as string[] },
    ];
    const ocupacoes = [
      { data: "2026-10-28", turma_id: "a" },
      { data: "2026-10-28", turma_id: "b" },
      { data: "2026-11-02", turma_id: "b" },
      { data: "2026-11-02", turma_id: "a" },
    ];
    expect(diasBloqueadosComLancamento(linhas, ocupacoes)).toEqual([
      { codigo: "FER-1", data: "2026-10-28", descricao: "PF — Servidor", lancamentos: 2 },
      { codigo: "FER-2", data: "2026-11-02", descricao: "LA — só a", lancamentos: 1 },
    ]);
  });
});
