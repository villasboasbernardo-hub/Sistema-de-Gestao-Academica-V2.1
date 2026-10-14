import { describe, expect, it } from "vitest";

import {
  AVISO_SEM_TEMPO,
  AVISO_SEM_UE,
  previstoDaDisciplina,
  type ItemDoCurriculo,
} from "@/lib/dominio/avaliacoes/previsto";

/** FR-031 a FR-031.10 da spec 014: aula + avaliação = CH do currículo (D-CUR-1, D-CUR-2). */
function item(parcial: Partial<ItemDoCurriculo> & { rotulo: string }): ItemDoCurriculo {
  return {
    natureza: "prova",
    unidadeEnsinoId: null,
    taAplicacao: null,
    origemTaAplicacao: null,
    taVista: null,
    origemTaVista: null,
    ...parcial,
  };
}

describe("previstoDaDisciplina", () => {
  it("120 = 116 aula + 4 avaliação (SC-014)", () => {
    const p = previstoDaDisciplina({
      ch: 120,
      unidades: [],
      itens: [
        item({ rotulo: "PM 1", taAplicacao: 2, origemTaAplicacao: "curriculo" }),
        item({ rotulo: "PM 2", taAplicacao: 2, origemTaAplicacao: "curriculo" }),
      ],
    });
    expect([p.taAula, p.taAvaliacao]).toEqual([116, 4]);
  });

  it("UE 7 Física = 18 aula + 2 aplicação + 1 vista, por UE", () => {
    const p = previstoDaDisciplina({
      ch: 126,
      unidades: [{ id: "ue7", rotulo: "UE 7", ch: 21 }],
      itens: [
        item({
          rotulo: "PM 2",
          unidadeEnsinoId: "ue7",
          origemUe: "curriculo",
          taAplicacao: 2,
          origemTaAplicacao: "curriculo",
          taVista: 1,
          origemTaVista: "curriculo",
        }),
      ],
    });
    expect(p.porUnidade).toEqual([{ id: "ue7", rotulo: "UE 7", ch: 21, avaliacao: 3, aula: 18 }]);
    expect(p.itens[0]!.origemDaUe).toBe("currículo");
  });

  it("item sem tempo → «tempo de avaliação não definido», fora da soma", () => {
    const p = previstoDaDisciplina({ ch: 40, unidades: [], itens: [item({ rotulo: "PE 1" })] });
    expect(p.avisos).toContain(AVISO_SEM_TEMPO);
    expect(p.itens[0]!.semTempoDefinido).toBe(true);
    expect(p.taAula).toBe(40);
  });

  it("controle: a OD sem tempo NÃO é «não definido» (Q-17)", () => {
    const p = previstoDaDisciplina({
      ch: 40,
      unidades: [],
      itens: [item({ rotulo: "OD 1", natureza: "od" })],
    });
    expect(p.avisos).toEqual([]);
  });

  it("arbitrado e sugestão contam, e vêm marcados", () => {
    const p = previstoDaDisciplina({
      ch: 50,
      unidades: [],
      itens: [
        item({ rotulo: "PE 1", taAplicacao: 2, origemTaAplicacao: "arbitrado" }),
        item({ rotulo: "PE 2", taAplicacao: 3, origemTaAplicacao: "sugestao_planilha" }),
      ],
    });
    expect(p.taAvaliacao).toBe(5);
    expect(p.itens.map((i) => i.marca)).toEqual([
      "nao_consta_do_curriculo",
      "sugestao_a_confirmar",
    ]);
  });

  it("o ajuste por turma sobrepõe o tempo do item do curso", () => {
    const p = previstoDaDisciplina({
      ch: 50,
      unidades: [],
      itens: [
        item({
          rotulo: "PM 1",
          taAplicacao: 2,
          origemTaAplicacao: "curriculo",
          ajusteDaTurma: { taAplicacao: 4, taVista: null, origem: "arbitrado", confirmado: true },
        }),
      ],
    });
    expect([p.itens[0]!.tempo, p.itens[0]!.marca, p.taAula]).toEqual([
      4,
      "nao_consta_do_curriculo",
      46,
    ]);
  });

  it("avaliação no nível da disciplina → aviso «o currículo não diz de qual UE sai» (Q-11)", () => {
    const p = previstoDaDisciplina({
      ch: 30,
      unidades: [{ id: "ue1", rotulo: "UE 1", ch: 30 }],
      itens: [item({ rotulo: "PM 1", taAplicacao: 2, origemTaAplicacao: "curriculo" })],
    });
    expect(p.avisos).toContain(AVISO_SEM_UE);
    expect(p.avaliacaoNaDisciplina).toBe(2);
  });

  it("UE decidida pela CIAARA-11, com a data", () => {
    const p = previstoDaDisciplina({
      ch: 30,
      unidades: [{ id: "ue1", rotulo: "UE 1", ch: 30 }],
      itens: [
        item({
          rotulo: "PM 1",
          unidadeEnsinoId: "ue1",
          origemUe: "decisao_ciaara",
          ueDecididaEm: "2026-10-14",
          taAplicacao: 2,
          origemTaAplicacao: "curriculo",
        }),
      ],
    });
    expect(p.itens[0]!.origemDaUe).toBe("decisão CIAARA-11, 14/10/2026");
    expect(p.avisos).not.toContain(AVISO_SEM_UE);
  });

  it("fronteira: avaliação = CH dá aula 0, sem aviso; uma a mais dá aula −1, com aviso (nunca bloqueio)", () => {
    const igual = previstoDaDisciplina({
      ch: 4,
      unidades: [],
      itens: [item({ rotulo: "PE 1", taAplicacao: 4, origemTaAplicacao: "arbitrado" })],
    });
    const passa = previstoDaDisciplina({
      ch: 4,
      unidades: [],
      itens: [item({ rotulo: "PE 1", taAplicacao: 5, origemTaAplicacao: "arbitrado" })],
    });
    expect([igual.taAula, igual.avisos.length]).toEqual([0, 0]);
    expect(passa.taAula).toBe(-1);
    expect(passa.avisos.some((a) => a.includes("passa da CH"))).toBe(true);
  });
});
