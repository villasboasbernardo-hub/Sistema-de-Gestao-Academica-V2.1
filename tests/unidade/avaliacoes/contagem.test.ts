import { describe, expect, it } from "vitest";

import {
  contagemDeAvaliacoes,
  type DisciplinaParaContagem,
} from "@/lib/dominio/avaliacoes/contagem";

/** FR-056 e SC-017 da spec 014: «N aplicadas de M previstas», com OD e vistas à parte. */
function disciplina(
  parcial: Partial<DisciplinaParaContagem> & { id: string },
): DisciplinaParaContagem {
  return {
    quantidadeCurriculo: null,
    quantidadeArbitrada: null,
    quantidadeOd: 0,
    vistasPrevistas: 0,
    vistasRealizadas: 0,
    ...parcial,
  };
}

describe("contagemDeAvaliacoes", () => {
  it("N e M só com prova e trabalho; substituída e cancelada fora; OD fora, com o K", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [disciplina({ id: "I", quantidadeCurriculo: 3, quantidadeOd: 1 })],
      avaliacoes: [
        { disciplinaId: "I", natureza: "prova", situacao: "concluida" },
        { disciplinaId: "I", natureza: "trabalho", situacao: "atrasada" },
        { disciplinaId: "I", natureza: "prova", situacao: "pendente" },
        { disciplinaId: "I", natureza: "prova", situacao: null },
        { disciplinaId: "I", natureza: "od", situacao: "em_andamento" },
      ],
    });
    expect([c.aplicadas, c.previstas, c.od]).toEqual([2, 3, 1]);
  });

  it("vista fora de N e M, dentro de «vistas realizadas A de B», com o comentário da OD", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [
        disciplina({ id: "I", quantidadeCurriculo: 2, vistasPrevistas: 3, vistasRealizadas: 1 }),
      ],
      avaliacoes: [],
    });
    expect([c.vistasRealizadas, c.vistasPrevistas, c.previstas]).toEqual([1, 3, 2]);
  });

  it("disciplina «não definido» contada à parte, sem esconder o total", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [disciplina({ id: "I", quantidadeCurriculo: 2 }), disciplina({ id: "II" })],
      avaliacoes: [],
    });
    expect([c.previstas, c.disciplinasNaoDefinidas]).toEqual([2, 1]);
  });

  it("quantidade arbitrada conta em M, com a marca, e tira a disciplina de «não definido»", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [disciplina({ id: "I", quantidadeArbitrada: 2 })],
      avaliacoes: [],
    });
    expect([c.previstas, c.disciplinasArbitradas, c.disciplinasNaoDefinidas]).toEqual([2, 1, 0]);
  });

  it("controle: a do currículo prevalece sobre a arbitrada", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [disciplina({ id: "I", quantidadeCurriculo: 3, quantidadeArbitrada: 5 })],
      avaliacoes: [],
    });
    expect([c.previstas, c.disciplinasArbitradas]).toEqual([3, 0]);
  });

  it("fronteira: em andamento conta como aplicada; pendente não", () => {
    const c = contagemDeAvaliacoes({
      disciplinas: [disciplina({ id: "I", quantidadeCurriculo: 2 })],
      avaliacoes: [
        { disciplinaId: "I", natureza: "prova", situacao: "em_andamento" },
        { disciplinaId: "I", natureza: "prova", situacao: "sem_correspondencia" },
      ],
    });
    expect(c.aplicadas).toBe(1);
  });
});
