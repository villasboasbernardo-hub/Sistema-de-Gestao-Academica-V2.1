/**
 * Os DSA da semana no Início — spec 019 (Bloco 4), C-8, C-10 e C-11: quem tem DSA nesta semana e o resumo do lançado.
 */
import { describe, expect, it } from "vitest";

import { fraseDoResumo, resumoDoDsa, temDsaNaSemana } from "@/lib/dominio/dsa-da-semana";

/** Segunda 19/10/2026 a sábado 24/10/2026. */
const SEMANA = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"];

const turma = {
  status: "ativa",
  modalidade: "presencial",
  dataInicio: "2026-08-03",
  dataTermino: "2026-12-11",
  inicioEtapaPresencial: null,
  terminoEtapaPresencial: null,
  arquivada: false,
};

describe("C-8 · quem tem DSA nesta semana", () => {
  it("a turma presencial com a janela cobrindo a semana", () => {
    expect(temDsaNaSemana(turma, SEMANA)).toBe(true);
  });
  it.each([
    ["EAD pura", { modalidade: "ead" }],
    ["arquivada", { arquivada: true }],
    ["cancelada", { status: "cancelada" }],
    ["sem início", { dataInicio: null }],
    ["sem término", { dataTermino: null }],
    ["terminou antes", { dataTermino: "2026-10-16" }],
    ["começa depois", { dataInicio: "2026-10-26" }],
  ])("fica fora: %s", (_, troca) => {
    expect(temDsaNaSemana({ ...turma, ...troca }, SEMANA)).toBe(false);
  });
  it("a janela que só toca o sábado ainda conta", () => {
    expect(temDsaNaSemana({ ...turma, dataInicio: "2026-10-24" }, SEMANA)).toBe(true);
  });
  it("semipresencial: dentro da etapa entra, fora não, e sem etapa cadastrada entra (D-DSA-2)", () => {
    const semi = { ...turma, modalidade: "semipresencial" };
    expect(
      temDsaNaSemana(
        { ...semi, inicioEtapaPresencial: "2026-10-01", terminoEtapaPresencial: "2026-10-31" },
        SEMANA,
      ),
    ).toBe(true);
    expect(
      temDsaNaSemana(
        { ...semi, inicioEtapaPresencial: "2026-11-02", terminoEtapaPresencial: "2026-11-30" },
        SEMANA,
      ),
    ).toBe(false);
    expect(temDsaNaSemana(semi, SEMANA)).toBe(true);
  });
});

describe("C-10 e C-11 · o resumo do lançado", () => {
  const lancamentos = [
    { origem: "aula", data: "2026-10-19", disciplinaId: "D1", tempos: 4 },
    { origem: "aula", data: "2026-10-19", disciplinaId: "D2", tempos: 2 },
    { origem: "aula", data: "2026-10-21", disciplinaId: "D1", tempos: 3 },
    { origem: "avaliacao", data: "2026-10-22", disciplinaId: "D2", tempos: 2 },
    { origem: "sessao_aplicacao", data: "2026-10-23", disciplinaId: "D2", tempos: 1 },
    { origem: "vista_prova", data: "2026-10-23", disciplinaId: "D2", tempos: 1 },
    { origem: "atividade_nao_letiva", data: "2026-10-23", disciplinaId: null, tempos: 2 },
  ];
  it("soma os TA, conta os dias e as disciplinas, as avaliações e as atividades", () => {
    expect(resumoDoDsa(lancamentos)).toEqual({
      ta: 15,
      dias: 4,
      disciplinas: 2,
      avaliacoes: 1,
      atividades: 1,
    });
  });
  it("a frase, no singular e no plural", () => {
    expect(fraseDoResumo(resumoDoDsa(lancamentos))).toBe(
      "15 TA lançados em 4 dias · 2 disciplinas · 1 avaliação · 1 atividade",
    );
    expect(
      fraseDoResumo(
        resumoDoDsa([{ origem: "aula", data: "2026-10-19", disciplinaId: "D1", tempos: 1 }]),
      ),
    ).toBe("1 TA lançado em 1 dia · 1 disciplina");
  });
  it("nada lançado diz que não há nada ainda", () => {
    expect(fraseDoResumo(resumoDoDsa([]))).toBe("Nada lançado nesta semana ainda");
  });
});
