/**
 * `RF-PDF-01` — a grade do DSA no modelo v4 (`lib/dominio/dsa/grade-do-papel.ts`): linhas do relógio
 * vigente, colunas dos dias da semana, cartões nos tempos de cada lançamento.
 */
import { describe, expect, it } from "vitest";

import { gradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { relogioDoCatalogo, relogioDoRegime } from "@/lib/dominio/dsa/horario-do-bloco";
import type { DiaImpresso, LinhaImpressa } from "@/lib/dominio/dsa/impressao";

import { G45 } from "./relogio-real";

function linha(ajustes: Partial<LinhaImpressa> = {}): LinhaImpressa {
  return {
    chave: "l1",
    trechos: [],
    taInicial: 1,
    tempos: 2,
    disciplina: "II",
    conteudo: "UE 3 — Navegação",
    local: "Sala 01",
    te: "EO",
    instrutor: "1ºTen FULANA",
    estudoIndividual: false,
    lancadoAFrente: false,
    ...ajustes,
  };
}

function dia(data: string, linhas: LinhaImpressa[], bloqueio: string | null = null): DiaImpresso {
  return { data, bloqueio, linhas };
}

/** O catálogo do CAHO (CFG-H): 9 tempos, 5 de manhã, 10 min antes do 8º. */
const CFG_H = [
  ["07:50", "08:35"],
  ["08:40", "09:25"],
  ["09:30", "10:15"],
  ["10:20", "11:05"],
  ["11:10", "11:55"],
  ["13:05", "13:50"],
  ["13:55", "14:40"],
  ["14:50", "15:35"],
  ["15:40", "16:25"],
].map(([inicio, fim], i) => ({
  tempoNumero: i + 1,
  periodo: (i < 5 ? "manha" : "tarde") as "manha" | "tarde",
  tipoTempo: "normal" as const,
  horaInicio: inicio as string,
  horaFim: fim as string,
}));

describe("as linhas da grade saem do relógio vigente", () => {
  it("CFG-H: 9 tempos, 5 de manhã, almoço 11:55–13:05 e o intervalo real de 10 min antes do 8º", () => {
    const grade = gradeDoPapel([dia("2026-07-20", [])], relogioDoCatalogo(CFG_H, 9));
    const tempos = grade?.faixas.filter((f) => f.tipo === "tempo") ?? [];
    expect(tempos).toHaveLength(9);
    const almoco = grade?.faixas.filter((f) => f.tipo === "almoco");
    expect(almoco).toEqual([{ tipo: "almoco", inicio: "11:55", fim: "13:05" }]);
    const intervalos = grade?.faixas.flatMap((f) => (f.tipo === "intervalo" ? [f.minutos] : []));
    expect(intervalos).toEqual([5, 5, 5, 5, 5, 10, 5]);
  });

  it("o regime de 8 TA mostra 8 linhas — e cresce até o último tempo ocupado da semana (EI excepcional)", () => {
    const relogio = relogioDoRegime(G45);
    const oito = gradeDoPapel([dia("2026-10-05", [linha()])], relogio);
    expect(oito?.faixas.filter((f) => f.tipo === "tempo")).toHaveLength(G45.regimeTempos);
    const comEi = gradeDoPapel(
      [
        dia("2026-10-05", [
          linha({ taInicial: 10, tempos: 1, estudoIndividual: true, disciplina: "" }),
        ]),
      ],
      relogio,
    );
    const tempos = comEi?.faixas.filter((f) => f.tipo === "tempo") ?? [];
    expect(tempos).toHaveLength(10);
    expect(tempos.at(-1)).toMatchObject({ numero: 10, excepcional: true });
  });

  it("sem relógio, não há grade (quem chama degrada para a lista)", () => {
    expect(gradeDoPapel([dia("2026-10-05", [])], null)).toBeNull();
  });
});

describe("as colunas saem dos dias do documento, com o sábado quando houver", () => {
  it("SEG a SÁB, com DD/MM e o bloqueio do feriado", () => {
    const datas = [
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
    ];
    const grade = gradeDoPapel(
      datas.map((d, i) => dia(d, [], i === 2 ? "Feriado de dia inteiro" : null)),
      relogioDoRegime(G45),
    );
    expect(grade?.colunas.map((c) => c.sigla)).toEqual(["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]);
    expect(grade?.colunas[5]?.diaMes).toBe("22/08");
    expect(grade?.colunas[2]?.bloqueio).toBe("Feriado de dia inteiro");
  });
});

describe("os cartões ocupam os tempos do lançamento", () => {
  it("um bloco de manhã é um cartão, do 1º ao 3º tempo", () => {
    const grade = gradeDoPapel(
      [dia("2026-10-05", [linha({ taInicial: 1, tempos: 3 })])],
      relogioDoRegime(G45),
    );
    expect(grade?.cartoes).toHaveLength(1);
    const c = grade?.cartoes[0];
    expect(grade?.faixas[c?.faixaInicial ?? -1]).toMatchObject({ tipo: "tempo", numero: 1 });
    expect(grade?.faixas[c?.faixaFinal ?? -1]).toMatchObject({ tipo: "tempo", numero: 3 });
    expect(c?.ta).toBe(3);
  });

  it("⚠️ o bloco que atravessa o almoço vira DOIS cartões, um de cada lado (SC-011)", () => {
    const grade = gradeDoPapel(
      [dia("2026-10-05", [linha({ taInicial: 4, tempos: 4 })])],
      relogioDoRegime(G45),
    );
    expect(grade?.cartoes).toHaveLength(2);
    expect(grade?.cartoes.map((c) => [c.ta, c.parte, c.partes])).toEqual([
      [2, 1, 2],
      [2, 2, 2],
    ]);
    const [manha, tarde] = grade?.cartoes ?? [];
    const almoco = grade?.faixas.findIndex((f) => f.tipo === "almoco") ?? -1;
    expect(manha?.faixaFinal).toBeLessThan(almoco);
    expect(tarde?.faixaInicial).toBeGreaterThan(almoco);
  });

  it("o tipo do cartão sai da linha: EI, avaliação (pela técnica), atividade e aula", () => {
    const grade = gradeDoPapel(
      [
        dia("2026-10-05", [
          linha({ chave: "a", taInicial: 1, tempos: 1 }),
          linha({ chave: "b", taInicial: 2, tempos: 1, te: "PM" }),
          linha({ chave: "c", taInicial: 3, tempos: 1, disciplina: "", te: "" }),
          linha({
            chave: "d",
            taInicial: 4,
            tempos: 1,
            estudoIndividual: true,
            disciplina: "",
            te: "EI",
          }),
        ]),
      ],
      relogioDoRegime(G45),
    );
    expect(grade?.cartoes.map((c) => c.tipo)).toEqual(["aula", "avaliacao", "atividade", "estudo"]);
  });

  it("linha sem tempo no relógio não some: vai para fora da grade", () => {
    const grade = gradeDoPapel(
      [dia("2026-10-05", [linha({ taInicial: null, tempos: null })])],
      relogioDoCatalogo(CFG_H, 9),
    );
    expect(grade?.cartoes).toHaveLength(0);
    expect(grade?.foraDaGrade).toHaveLength(1);
  });
});
