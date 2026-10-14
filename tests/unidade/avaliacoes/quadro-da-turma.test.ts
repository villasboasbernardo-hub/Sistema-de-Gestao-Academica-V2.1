import { describe, expect, it } from "vitest";

import {
  naturezaPeloTipo,
  quadroDeAvaliacoesDaTurma,
  type ItemDoQuadro,
} from "@/lib/dominio/avaliacoes/quadro-da-turma";

/** Spec 014, FR-055 a FR-058: o quadro só COMPÕE as funções puras — a conta é delas. */
const disciplina = {
  id: "D",
  cod: "I",
  nome: "Disciplina",
  ch: 120,
  cumprido: 100,
  iniciada: true,
  concluida: false,
  unidades: [],
};
function item(id: string, rotulo: string, extra: Partial<ItemDoQuadro> = {}): ItemDoQuadro {
  return {
    id,
    disciplinaId: "D",
    ordem: Number(id.slice(1)),
    rotulo,
    natureza: "prova",
    unidadeEnsinoId: null,
    taAplicacao: 2,
    origemTaAplicacao: "curriculo",
    taVista: null,
    origemTaVista: null,
    ...extra,
  };
}

describe("quadroDeAvaliacoesDaTurma", () => {
  const base = {
    disciplinas: [disciplina],
    itens: [
      item("i1", "PM 1"),
      item("i2", "PM 2"),
      item("i3", "OD 1", { natureza: "od", taAplicacao: null, origemTaAplicacao: null }),
    ],
    prazoDias: 7,
    hoje: "2026-10-20",
    terminoDaTurma: "2026-12-15",
  };

  it("a avaliação ligada ao item dá a situação dele; a não aplicada fica pendente e entra na projeção", () => {
    const q = quadroDeAvaliacoesDaTurma({
      ...base,
      avaliacoes: [
        {
          id: "a1",
          disciplinaId: "D",
          itemId: "i1",
          tipo: "Prova",
          natureza: "prova",
          aplicacao: "2026-10-01",
          estadoDoRegistro: "pendente",
          sessoesDeVista: [],
        },
      ],
    });
    const d = q.disciplinas[0]!;
    expect(d.itens.map((i) => i.situacao)).toEqual(["concluida", "pendente", "em_andamento"]);
    expect(d.projecao.frase.startsWith("restam 20 TA; falta 1 avaliação (2 TA) → sobram 18")).toBe(
      true,
    );
    expect([q.contagem.aplicadas, q.contagem.previstas, q.contagem.od]).toEqual([1, 2, 1]);
  });

  it("a avaliação sem item ligado aparece à parte, e a substituída some de tudo", () => {
    const q = quadroDeAvaliacoesDaTurma({
      ...base,
      avaliacoes: [
        {
          id: "a2",
          disciplinaId: "D",
          itemId: null,
          tipo: "Prova Escrita",
          natureza: "prova",
          aplicacao: "2026-10-05",
          estadoDoRegistro: "pendente",
          sessoesDeVista: [],
        },
        {
          id: "a3",
          disciplinaId: "D",
          itemId: null,
          tipo: "Prova",
          natureza: "prova",
          aplicacao: "2026-10-05",
          estadoDoRegistro: "substituida_pela_planilha",
          sessoesDeVista: [],
        },
      ],
    });
    expect(q.disciplinas[0]!.semItem).toHaveLength(1);
    expect(q.contagem.aplicadas).toBe(1);
  });

  it("a natureza da avaliação sem item sai do tipo lançado", () => {
    expect([
      naturezaPeloTipo("Trabalho em Grupo"),
      naturezaPeloTipo("Prova Mista"),
      naturezaPeloTipo("Observação de Desempenho"),
    ]).toEqual(["trabalho", "prova", "od"]);
  });
});
