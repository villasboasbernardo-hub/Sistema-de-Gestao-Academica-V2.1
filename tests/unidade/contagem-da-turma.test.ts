/**
 * Spec 024 (Bloco 9, item 2): a EAD não conta TA (FR-018) e a semipresencial conta só a etapa presencial (FR-020).
 */
import { describe, expect, it } from "vitest";

import { andamentoDaTurma, contagemDaTurma } from "@/lib/dominio/andamento-da-turma";

const REGIME = { regimePadraoTempos: 8, limiteDiarioEadHoras: 5 };

describe("FR-018 · a EAD não conta TA", () => {
  it("nunca em atraso, sem saldo, sem progresso — o controle é da Divisão de Ensino a Distância", () => {
    const a = andamentoDaTurma(
      {
        status: "ativa",
        modalidade: "ead",
        dataTermino: "2026-11-30",
        prevista: 300,
        executada: 0,
      },
      REGIME,
      [],
      "2026-10-23",
    );
    expect(a.situacaoDaCapacidade).toBe("controle_da_dead");
    expect(a.emAtraso).toBe(false);
    expect(a.saldo).toBeNull();
    expect(a.percentual).toBeNull();
    expect(a.capacidade).toBeNull();
  });
  it("o caso que discrimina: a mesma turma presencial ESTARIA em atraso", () => {
    const a = andamentoDaTurma(
      {
        status: "ativa",
        modalidade: "presencial",
        dataTermino: "2026-11-30",
        prevista: 300,
        executada: 0,
      },
      REGIME,
      [],
      "2026-10-23",
    );
    expect(a.emAtraso).toBe(true);
  });
});

describe("FR-020 · a semipresencial conta só a etapa presencial", () => {
  const turma = {
    modalidade: "semipresencial",
    prevista: 400,
    executada: 120,
    dataTermino: "2026-12-18",
  };
  const etapa = { inicioEtapa: "2026-10-26", terminoEtapa: "2026-10-30" };

  it("com disciplina marcada e etapa cadastrada: prevista das marcadas, executada na etapa, janela da etapa", () => {
    expect(
      contagemDaTurma(turma, {
        disciplinasMarcadas: 2,
        chPresencial: 40,
        executadaNaEtapa: 8,
        ...etapa,
      }),
    ).toEqual({
      prevista: 40,
      executada: 8,
      dataTermino: "2026-10-30",
      inicioDaCapacidade: "2026-10-26",
      aviso: null,
    });
  });
  it("sem disciplina marcada: conta tudo, como hoje, com o aviso da marca", () => {
    expect(
      contagemDaTurma(turma, {
        disciplinasMarcadas: 0,
        chPresencial: 0,
        executadaNaEtapa: 8,
        ...etapa,
      }),
    ).toEqual({
      prevista: 400,
      executada: 120,
      dataTermino: "2026-12-18",
      inicioDaCapacidade: null,
      aviso: "sem_marca",
    });
  });
  it("com marca e sem etapa cadastrada: conta tudo, com o aviso da etapa (D-10)", () => {
    expect(
      contagemDaTurma(turma, {
        disciplinasMarcadas: 2,
        chPresencial: 40,
        executadaNaEtapa: 0,
        inicioEtapa: null,
        terminoEtapa: null,
      }),
    ).toEqual({
      prevista: 400,
      executada: 120,
      dataTermino: "2026-12-18",
      inicioDaCapacidade: null,
      aviso: "sem_etapa",
    });
  });
  it("presencial e EAD não mudam", () => {
    for (const modalidade of ["presencial", "ead"]) {
      const r = contagemDaTurma(
        { ...turma, modalidade },
        { disciplinasMarcadas: 2, chPresencial: 40, executadaNaEtapa: 8, ...etapa },
      );
      expect(r.prevista).toBe(400);
      expect(r.aviso).toBeNull();
    }
  });
  it("a capacidade começa no início da etapa quando ele ainda não chegou (D-9)", () => {
    const a = andamentoDaTurma(
      {
        status: "ativa",
        modalidade: "semipresencial",
        dataTermino: "2026-10-30",
        inicioDaCapacidade: "2026-10-26",
        prevista: 40,
        executada: 0,
      },
      REGIME,
      [],
      "2026-10-20",
    );
    expect(a.diasUteis).toBe(5);
  });
});
