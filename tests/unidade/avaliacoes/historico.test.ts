import { describe, expect, it } from "vitest";

import { casaPorNome, casarHistorico } from "@/lib/dominio/avaliacoes/historico";

/** FR-039.1 e `RN-AVAL-01`: o casamento por nome normalizado vale só para o histórico da v2.0. */
describe("casarHistorico", () => {
  const planejadas = [
    { id: "p1", cursoId: "c", nomeNormalizado: "navegacao costeira" },
    { id: "p2", cursoId: "c", nomeNormalizado: "meteorologia" },
  ];

  it("a planejada sem par vira «Sem correspondência», nunca some", () => {
    const r = casarHistorico({
      planejadas,
      avaliacoes: [
        {
          id: "a1",
          cursoId: "c",
          disciplinaNomeNormalizado: "navegacao costeira",
          ligadaAoCurriculo: false,
        },
      ],
    });
    expect(r).toEqual([
      { planejadaId: "p1", avaliacoes: ["a1"], situacao: "casada" },
      { planejadaId: "p2", avaliacoes: [], situacao: "sem_correspondencia" },
    ]);
  });

  it("tolerante a abreviação nos dois sentidos, palavra a palavra", () => {
    expect(casaPorNome("navegacao cost", "navegacao costeira")).toBe(true);
    expect(casaPorNome("navegacao costeira", "nav costeira")).toBe(true);
    expect(casaPorNome("navegacao costeira", "navegacao astronomica")).toBe(false);
  });

  it("a avaliação ligada ao currículo fica fora do casamento por nome", () => {
    const r = casarHistorico({
      planejadas,
      avaliacoes: [
        {
          id: "a1",
          cursoId: "c",
          disciplinaNomeNormalizado: "meteorologia",
          ligadaAoCurriculo: true,
        },
      ],
    });
    expect(r[1]!.situacao).toBe("sem_correspondencia");
  });

  it("controle: outro curso não casa, e chave nula não casa", () => {
    const r = casarHistorico({
      planejadas,
      avaliacoes: [
        {
          id: "a1",
          cursoId: "x",
          disciplinaNomeNormalizado: "meteorologia",
          ligadaAoCurriculo: false,
        },
      ],
    });
    expect(r[1]!.situacao).toBe("sem_correspondencia");
    expect(casaPorNome(null, "meteorologia")).toBe(false);
  });
});
