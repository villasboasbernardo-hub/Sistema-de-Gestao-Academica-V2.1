/**
 * Bloco 15 (spec 030), item 11 — `PEND-029-1`: a situação «Atrasada» do DSA compara a data com a **janela da carga**, e
 * não com a previsão crua.
 *
 * > *"PEND-029-1: a situação 'Atrasada' usa a janela da carga"* — Bernardo Villas Boas, 29/10/2026
 *
 * O caso que discrimina é o medido no remoto em 29/10/2026 (só leitura): a **CAHO 2027** (turma de 05/01 a 17/12/2027)
 * herda da disciplina a previsão de 11/05 a 16/10/**2026**. Com a previsão crua, em 29/10/2026 a disciplina sem
 * lançamento está «atrasada» (o início e o término já passaram); pela janela da carga — o período inteiro da turma,
 * porque a previsão não o toca (D-9 da spec 029) —, ela está **aguardando o início**.
 */
import { describe, expect, it } from "vitest";

import { quadrosDaSemana } from "@/app/(app)/turmas/[turma]/dsa/consulta";

const HOJE = "2026-10-29";

function situacao(entrada: {
  readonly previsao: { readonly inicio: string | null; readonly termino: string | null };
  readonly periodo: { readonly inicio: string | null; readonly termino: string | null };
  readonly lancado?: number;
}): string {
  const [quadro] = quadrosDaSemana({
    execucao: [
      {
        disciplinaId: "d1",
        codigo: "I",
        nome: "HIDROGRAFIA",
        prevista: 40,
        previsaoInicio: entrada.previsao.inicio,
        previsaoTermino: entrada.previsao.termino,
      },
    ],
    ocupacao: Array.from({ length: entrada.lancado ?? 0 }, (_, i) => ({
      fatoId: `f${i}`,
      data: "2026-05-12",
      disciplinaId: "d1",
      ta: 1,
    })),
    emConflito: new Set<string>(),
    ateODia: "2026-10-31",
    hoje: HOJE,
    periodoDaTurma: entrada.periodo,
  });
  return quadro?.situacao ?? "";
}

describe("PEND-029-1 · a «Atrasada» do DSA pela janela da carga", () => {
  it("⚠️ CAHO 2027 com a previsão de 2026: aguardando o início, e não atrasada", () => {
    expect(
      situacao({
        previsao: { inicio: "2026-05-11", termino: "2026-10-16" },
        periodo: { inicio: "2027-01-05", termino: "2027-12-17" },
      }),
    ).toBe("aguardando_inicio");
  });

  it("controle: a previsão dentro do período da turma continua valendo — passou sem lançamento, atrasada", () => {
    expect(
      situacao({
        previsao: { inicio: "2026-05-11", termino: "2026-10-16" },
        periodo: { inicio: "2026-02-02", termino: "2026-12-11" },
      }),
    ).toBe("atrasada");
  });

  it("a previsão que transborda o término da turma é recortada: o término efetivo é o da turma", () => {
    // Previsão até 30/11, turma até 20/10: recortada, o término passou (20/10 < 29/10) e falta CH → atrasada.
    expect(
      situacao({
        previsao: { inicio: "2026-05-11", termino: "2026-11-30" },
        periodo: { inicio: "2026-02-02", termino: "2026-10-20" },
        lancado: 10,
      }),
    ).toBe("atrasada");
    // Sem o recorte, o término (30/11) ainda não passou: em andamento.
    expect(
      situacao({
        previsao: { inicio: "2026-05-11", termino: "2026-11-30" },
        periodo: { inicio: null, termino: null },
        lancado: 10,
      }),
    ).toBe("em_andamento");
  });

  it("turma sem período: a previsão como veio (`FR-004.3` da spec 029)", () => {
    expect(
      situacao({
        previsao: { inicio: "2026-05-11", termino: "2026-10-16" },
        periodo: { inicio: null, termino: null },
      }),
    ).toBe("atrasada");
  });
});
