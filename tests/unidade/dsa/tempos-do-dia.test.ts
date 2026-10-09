/** Os tempos do dia para o campo «Em qual tempo começa» (item 1d, 08/10/2026). */
import { describe, expect, it } from "vitest";

import type { DiaDaGrade } from "@/lib/dominio/dsa/grade";
import { temposParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";

const dia = (estados: readonly string[], comHorario = true): DiaDaGrade =>
  ({
    data: "2026-04-10",
    bloqueio: null,
    avisos: [],
    semPosicao: [],
    celulas: estados.map((estado, i) => ({
      dia: "2026-04-10",
      ta: i + 1,
      estado,
      bloco: null,
      horario: comHorario
        ? { inicio: `0${7 + i}:50`, fim: `0${8 + i}:35`, periodo: "manha" }
        : null,
    })),
  }) as unknown as DiaDaGrade;

describe("temposParaEscolher", () => {
  it("cada tempo sai com o horário do relógio, na ordem", () => {
    const tempos = temposParaEscolher(dia(["livre", "livre"]), 2);
    expect(tempos.map((t) => t.rotulo)).toEqual([
      "1º tempo · 07:50–08:35",
      "2º tempo · 08:50–09:35",
    ]);
  });

  it("o tempo ocupado (início ou continuação) continua na lista, marcado", () => {
    const tempos = temposParaEscolher(dia(["ocupada", "continuacao", "livre"]), 3);
    expect(tempos.map((t) => t.ocupado)).toEqual([true, true, false]);
    expect(tempos[0]?.rotulo).toBe("1º tempo · 07:50–08:35 · ocupado");
  });

  it("sem relógio, o tempo sai numerado, sem horário inventado (RN-DEG-01)", () => {
    expect(temposParaEscolher(dia(["sem_relogio"], false), 1)[0]?.rotulo).toBe("1º tempo");
  });

  it("sem o dia (semana sem esse dia), ainda numera as linhas da grade", () => {
    expect(temposParaEscolher(undefined, 3).map((t) => t.ta)).toEqual([1, 2, 3]);
  });
});
