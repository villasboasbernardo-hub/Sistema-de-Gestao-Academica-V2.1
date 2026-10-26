/**
 * RD-3 (Bloco 11, spec 026) — o regime de tempos da semana.
 *
 * > «semanas salvas ou publicadas NUNCA mudam de regime (o regime fica gravado com a semana ao salvar)» — Bernardo
 * > Villas Boas, 26/10/2026
 */
import { describe, expect, it } from "vitest";

import {
  regimeDaSemana,
  semanaSalva,
  semanasSalvasAPartirDe,
} from "@/lib/dominio/dsa/regime-da-semana";

const OITO = { nome: "curso", tempos: 8 };
const NOVE = { nome: "Regime B", tempos: 9 };
const SETE = { nome: "Regime C", tempos: 7 };

const base = {
  segunda: "2026-11-09",
  registro: null,
  vigenciasDaTurma: [],
  daTurma: null,
  doCurso: OITO,
};

describe("regimeDaSemana — a ordem: gravado > só esta semana > desde > turma > curso", () => {
  it("sem nada, o do curso", () => {
    expect(regimeDaSemana(base)).toEqual({ regime: OITO, fonte: "curso" });
  });

  it("com o regime da turma (Editar turma), ele", () => {
    expect(regimeDaSemana({ ...base, daTurma: SETE })).toEqual({ regime: SETE, fonte: "turma" });
  });

  it("⚠️ o caso que discrimina: o «desde» vale da segunda-feira dele em diante, e não antes", () => {
    const vigenciasDaTurma = [{ vigenteDe: "2026-11-09", regime: NOVE }];
    expect(regimeDaSemana({ ...base, vigenciasDaTurma }).regime).toEqual(NOVE);
    expect(regimeDaSemana({ ...base, vigenciasDaTurma, segunda: "2026-11-16" }).regime).toEqual(
      NOVE,
    );
    expect(regimeDaSemana({ ...base, vigenciasDaTurma, segunda: "2026-11-02" })).toEqual({
      regime: OITO,
      fonte: "curso",
    });
  });

  it("o «desde» mais recente que já começou vence", () => {
    const vigenciasDaTurma = [
      { vigenteDe: "2026-11-02", regime: SETE },
      { vigenteDe: "2026-11-16", regime: NOVE },
    ];
    expect(regimeDaSemana({ ...base, vigenciasDaTurma }).regime).toEqual(SETE);
    expect(regimeDaSemana({ ...base, vigenciasDaTurma, segunda: "2026-11-23" }).regime).toEqual(
      NOVE,
    );
  });

  it("o «desde» de volta ao regime do curso (regime nulo) devolve o do curso, com a fonte «desde»", () => {
    const vigenciasDaTurma = [{ vigenteDe: "2026-11-02", regime: null }];
    expect(regimeDaSemana({ ...base, daTurma: SETE, vigenciasDaTurma })).toEqual({
      regime: OITO,
      fonte: "desde",
    });
  });

  it("«só esta semana» vence o desde e a turma", () => {
    const r = regimeDaSemana({
      ...base,
      daTurma: SETE,
      vigenciasDaTurma: [{ vigenteDe: "2026-11-02", regime: SETE }],
      registro: { regime: NOVE, origem: "so_esta_semana" },
    });
    expect(r).toEqual({ regime: NOVE, fonte: "so_esta_semana" });
  });

  it("o regime GRAVADO com a semana vence tudo — a semana salva nunca muda", () => {
    const r = regimeDaSemana({
      ...base,
      vigenciasDaTurma: [{ vigenteDe: "2026-11-02", regime: NOVE }],
      registro: { regime: OITO, origem: "gravado" },
    });
    expect(r).toEqual({ regime: OITO, fonte: "semana" });
  });
});

describe("semanaSalva — evento salvo ou publicação, OU lançamento salvo (D-11)", () => {
  it("sem nada, não", () => {
    expect(semanaSalva({ tiposDeEvento: [], temLancamentoSalvo: false })).toBe(false);
  });
  it("com lançamento salvo, sim (o que veio antes do Bloco 9 nasce salvo e sem evento)", () => {
    expect(semanaSalva({ tiposDeEvento: [], temLancamentoSalvo: true })).toBe(true);
  });
  it("com evento salvo ou publicação, sim; o descarte e o início de alteração sozinhos, não", () => {
    expect(semanaSalva({ tiposDeEvento: ["salvo"], temLancamentoSalvo: false })).toBe(true);
    expect(semanaSalva({ tiposDeEvento: ["publicado"], temLancamentoSalvo: false })).toBe(true);
    expect(semanaSalva({ tiposDeEvento: ["rascunho_descartado"], temLancamentoSalvo: false })).toBe(
      false,
    );
  });
});

describe("semanasSalvasAPartirDe — as que o «desde» tem de gravar antes de valer", () => {
  it("só as salvas da semana do «desde» em diante, sem repetir", () => {
    const r = semanasSalvasAPartirDe({
      segunda: "2026-11-09",
      eventos: [
        { ano: 2026, semana: 45, tipo: "salvo" },
        { ano: 2026, semana: 46, tipo: "salvo" },
        { ano: 2026, semana: 47, tipo: "rascunho_descartado" },
      ],
      datasDeLancamentoSalvo: ["2026-11-03", "2026-11-11", "2026-11-25"],
    });
    expect(r).toEqual([
      { ano: 2026, semana: 46 },
      { ano: 2026, semana: 48 },
    ]);
  });
});
