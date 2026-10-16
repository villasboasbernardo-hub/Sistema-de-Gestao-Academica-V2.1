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
    /* O instrumento é a sigla do rótulo («PM 1» → PM), como na leitura de `config_listas`. */
    instrumento: rotulo.split(" ")[0] ?? null,
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
    /*
     * ⚠️ RN-AV-13 (15/10/2026): a PM 1 deste caso NÃO tem tempo de vista no item, e foi aplicada há 19 dias sem vista.
     *    Antes da emenda ela saía «concluída» (sem tempo de vista, sem vista a cobrar); agora a PM exige vista pelo
     *    INSTRUMENTO e sai «atrasada». A projeção e a contagem não mudam: atrasada também é aplicada.
     */
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
    expect(d.itens.map((i) => i.situacao)).toEqual(["atrasada", "pendente", "em_andamento"]);
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

  describe("RN-AV-13 · a vista é obrigatória pelo INSTRUMENTO do item, não pelo tempo de vista", () => {
    const aplicada = (id: string, itemId: string | null, aplicacao: string) => ({
      id,
      disciplinaId: "D",
      itemId,
      tipo: "Prova",
      natureza: "prova" as const,
      aplicacao,
      estadoDoRegistro: "concluida",
      sessoesDeVista: [] as string[],
    });

    it("o caso que discrimina: PP com tempo de vista, aplicada há 10 dias sem vista — antes atrasada, agora concluída", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1", { taVista: 1, origemTaVista: "curriculo" })],
        avaliacoes: [aplicada("a1", "i1", "2026-10-10")],
      });
      expect(q.disciplinas[0]!.itens[0]!.situacao).toBe("concluida");
    });

    it("o mesmo caso com PM: atrasada (a PM exige vista)", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PM 1", { taVista: 1, origemTaVista: "curriculo" })],
        avaliacoes: [aplicada("a1", "i1", "2026-10-10")],
      });
      expect(q.disciplinas[0]!.itens[0]!.situacao).toBe("atrasada");
    });

    it("TG e PO pelo instrumento: TG concluída sem vista; PO sem tempo de vista, atrasada", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "TG 1", { natureza: "trabalho" }), item("i2", "PO 1")],
        avaliacoes: [aplicada("a1", "i1", "2026-10-01"), aplicada("a2", "i2", "2026-10-01")],
      });
      expect(q.disciplinas[0]!.itens.map((i) => i.situacao)).toEqual(["concluida", "atrasada"]);
    });

    it("a avaliação SEM item ligado não tem instrumento conhecido e continua exigindo, como antes", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [aplicada("a1", null, "2026-10-01")],
      });
      expect(q.disciplinas[0]!.semItem.map((a) => a.situacao)).toEqual(["atrasada"]);
    });

    it("o «B» de «vistas realizadas A de B» continua sendo o TEMPO previsto, não a obrigação", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1", { taVista: 1, origemTaVista: "curriculo" }), item("i2", "PM 1")],
        avaliacoes: [],
      });
      expect(q.contagem.vistasPrevistas).toBe(1);
    });
  });

  it("a natureza da avaliação sem item sai do tipo lançado", () => {
    expect([
      naturezaPeloTipo("Trabalho em Grupo"),
      naturezaPeloTipo("Prova Mista"),
      naturezaPeloTipo("Observação de Desempenho"),
    ]).toEqual(["trabalho", "prova", "od"]);
  });
});
