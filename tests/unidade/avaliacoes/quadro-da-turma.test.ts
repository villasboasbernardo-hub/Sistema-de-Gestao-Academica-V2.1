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
function marcaDoBanco(valor: string) {
  return { valor, vistaObrigatoria: valor === "PM" || valor === "PO" || valor === "PE" };
}
function item(id: string, rotulo: string, extra: Partial<ItemDoQuadro> = {}): ItemDoQuadro {
  return {
    id,
    disciplinaId: "D",
    ordem: Number(id.slice(1)),
    rotulo,
    /*
     * O instrumento é a sigla do rótulo («PM 1» → PM), com a marca que a D-9 grava em `config_listas.metadados`
     * (PM, PO e PE exigem vista — DADO DE TESTE, espelho do banco, não a regra).
     */
    instrumento: marcaDoBanco(rotulo.split(" ")[0] ?? ""),
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

  describe("RN-AV-12, RN-AV-13 e RN-AV-14 · desenho de 15/10/2026, aprovado em 16/10/2026", () => {
    const aval = (
      id: string,
      itemId: string | null,
      aplicacao: string,
      extra: Record<string, unknown> = {},
    ) => ({
      id,
      disciplinaId: "D",
      itemId,
      tipo: "Prova Prática",
      natureza: "prova" as const,
      aplicacao,
      estadoDoRegistro: "concluida",
      sessoesDeVista: [] as string[],
      ...extra,
    });

    it("DISCRIMINA (T258): a prova em 3 sessões conta UMA no «N de M» e no «X de Y», e a linha diz «em 3 sessões»", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [
          aval("a1", "i1", "2026-06-22", { sessoesDeAplicacao: ["2026-06-23", "2026-06-25"] }),
        ],
      });
      const d = q.disciplinas[0]!;
      expect([d.aplicadas, d.previstas]).toEqual([1, 1]);
      expect([q.contagem.aplicadas, q.contagem.previstas]).toEqual([1, 1]);
      expect(d.itens[0]!.sessoes).toBe(3);
      // E a mesma prova lançada como 3 avaliações (o que a opção A evita) contaria 3:
      const tres = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [
          aval("a1", "i1", "2026-06-22"),
          aval("a2", null, "2026-06-23"),
          aval("a3", null, "2026-06-25"),
        ],
      });
      expect(tres.contagem.aplicadas).toBe(3);
    });

    it("RN-AV-14 · prova a mais é informação: «currículo prevê 1 PP; aplicadas 2», pelo instrumento da prova sem item", () => {
      const pp = { valor: "PP", vistaObrigatoria: false };
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [
          aval("a1", "i1", "2026-06-22"),
          aval("a2", null, "2026-08-19", { instrumento: pp }),
        ],
      });
      expect(q.disciplinas[0]!.alemDoPrevisto.map((a) => a.frase)).toEqual([
        "currículo prevê 1 PP; aplicadas 2",
      ]);
      // Sem o instrumento gravado, a prova sem item não se conta: não se sabe de qual instrumento ela é a mais.
      const sem = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [aval("a1", "i1", "2026-06-22"), aval("a2", null, "2026-08-19")],
      });
      expect(sem.disciplinas[0]!.alemDoPrevisto).toEqual([]);
    });

    it("RN-AV-13 · a prova sem item com instrumento gravado decide a vista por ele (PP concluída; PM atrasada)", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [],
        avaliacoes: [
          aval("a1", null, "2026-10-01", { instrumento: { valor: "PP", vistaObrigatoria: false } }),
          aval("a2", null, "2026-10-01", { instrumento: { valor: "PM", vistaObrigatoria: true } }),
        ],
      });
      expect(q.disciplinas[0]!.semItem.map((a) => [a.instrumento, a.situacao])).toEqual([
        ["PP", "concluida"],
        ["PM", "atrasada"],
      ]);
    });

    it("juntar como sessão: a candidata é a prova viva da disciplina aplicada no mesmo dia ou ANTES, e não ela mesma", () => {
      const q = quadroDeAvaliacoesDaTurma({
        ...base,
        itens: [item("i1", "PP 1")],
        avaliacoes: [
          aval("a1", "i1", "2026-07-07"),
          aval("a2", null, "2026-08-19"),
          aval("a3", null, "2026-06-01"),
          aval("a4", null, "2026-08-20", { sessoesDeAplicacao: ["2026-08-21"] }),
        ],
      });
      const d = q.disciplinas[0]!;
      const de = (id: string) => d.semItem.find((a) => a.id === id)!.juntarEm.map((p) => p.id);
      expect(de("a2")).toEqual(["a3", "a1"]);
      expect(de("a3")).toEqual([]);
      // A que já tem sessões próprias não vira sessão de outra (o banco recusa, `juntar_prova_com_sessoes`).
      expect(de("a4")).toEqual([]);
      expect(d.itens[0]!.juntarEm.map((p) => [p.id, p.rotulo, p.aplicacao])).toEqual([
        ["a3", "Prova Prática", "2026-06-01"],
      ]);
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
