/**
 * O regime de horário da turma — spec 018 (Bloco 3), `RF-HOR-02`, `RF-HOR-05`, `RN-MAT-04`.
 *
 * O caso que discrimina: a turma COM regime escolhido usa os TA dele; a turma SEM escolha fica exatamente como
 * antes (o regime vigente do curso). E a turma EAD não muda nada — a capacidade dela é o limite EAD (`RN-MAT-04`).
 */
import { describe, expect, it } from "vitest";

import { andamentoDaTurma, capacidadeDiaria } from "@/lib/dominio/andamento-da-turma";
import {
  FRASE_DA_ESCOLHA_TRAVADA,
  aceitaRegimeNomeado,
  regimeEfetivo,
  rotuloDoRegime,
  temposDoDiaDaTurma,
} from "@/lib/dominio/regime-da-turma";

const doCurso = { regimePadraoTempos: 8, limiteDiarioEadHoras: 4 };

describe("regimeEfetivo — o regime que o saldo da turma usa", () => {
  it("sem regime escolhido, é o do curso, inalterado (nada muda em quem não escolher)", () => {
    expect(regimeEfetivo(doCurso, null)).toEqual(doCurso);
  });

  it("com regime escolhido, os TA presenciais são os do regime da turma", () => {
    expect(regimeEfetivo(doCurso, { regimeTempos: 9 })).toEqual({
      regimePadraoTempos: 9,
      limiteDiarioEadHoras: 4,
    });
  });

  it("⚠️ `RN-MAT-04`: a turma EAD continua no limite EAD, com ou sem regime nomeado", () => {
    expect(capacidadeDiaria("ead", regimeEfetivo(doCurso, { regimeTempos: 9 }))).toBe(4);
    expect(capacidadeDiaria("presencial", regimeEfetivo(doCurso, { regimeTempos: 9 }))).toBe(9);
    expect(capacidadeDiaria("semipresencial", regimeEfetivo(doCurso, { regimeTempos: 9 }))).toBe(9);
  });

  it("o caso que discrimina: o saldo da turma com 9 TA é maior que o da mesma turma com o padrão de 8", () => {
    const turma = {
      status: "ativa",
      modalidade: "presencial",
      dataTermino: "2026-10-30",
      prevista: 200,
      executada: 100,
    };
    const entrada = { hoje: "2026-10-19", feriados: [] as string[] };
    const com8 = andamentoDaTurma(turma, regimeEfetivo(doCurso, null), entrada.feriados, entrada.hoje);
    const com9 = andamentoDaTurma(
      turma,
      regimeEfetivo(doCurso, { regimeTempos: 9 }),
      entrada.feriados,
      entrada.hoje,
    );
    expect(com8.saldo).not.toBeNull();
    expect(com9.saldo).not.toBeNull();
    expect((com9.saldo ?? 0) - (com8.saldo ?? 0)).toBe(com8.diasUteis ?? -1);
  });
});

describe("temposDoDiaDaTurma — os TA do dia nas ações do DSA", () => {
  it("o regime da turma vence o do curso", () => {
    expect(temposDoDiaDaTurma(9, 8)).toBe(9);
  });
  it("sem regime da turma, é o do curso (o comportamento de antes)", () => {
    expect(temposDoDiaDaTurma(null, 8)).toBe(8);
  });
  it("sem nenhum dos dois, `null` — quem chama decide a reserva, como hoje", () => {
    expect(temposDoDiaDaTurma(null, null)).toBeNull();
  });
  it("⚠️ zero não é regime: o 0 do regime EAD do curso não vira TA do dia da turma com regime", () => {
    expect(temposDoDiaDaTurma(9, 0)).toBe(9);
    expect(temposDoDiaDaTurma(null, 0)).toBe(0);
  });
});

describe("rotuloDoRegime e aceitaRegimeNomeado", () => {
  it("o rótulo diz o nome, os TA e a duração", () => {
    expect(rotuloDoRegime({ nome: "Regime B", regimeTempos: 9, taDuracaoMin: 45 })).toBe(
      "Regime B — 9 TA de 45 min",
    );
    expect(rotuloDoRegime({ nome: "Regime A", regimeTempos: 1, taDuracaoMin: 50 })).toBe(
      "Regime A — 1 TA de 50 min",
    );
  });

  it("só a turma EAD pura fica fora (não tem tempos presenciais); a semipresencial escolhe", () => {
    expect(aceitaRegimeNomeado("presencial")).toBe(true);
    expect(aceitaRegimeNomeado("semipresencial")).toBe(true);
    expect(aceitaRegimeNomeado("ead")).toBe(false);
    expect(aceitaRegimeNomeado(null)).toBe(true);
  });

  it("a frase da escolha travada diz por quê e o que fazer", () => {
    expect(FRASE_DA_ESCOLHA_TRAVADA).toMatch(/lançamento/);
    expect(FRASE_DA_ESCOLHA_TRAVADA).toMatch(/regime/);
  });
});
