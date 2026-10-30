/**
 * Bloco 16 (spec 031, `FR-009`, D-16) — as linhas da aba *Avaliações* do acompanhamento do DSA.
 */
import { describe, expect, it } from "vitest";

import {
  linhasDoAcompanhamentoDeAvaliacoes,
  type DisciplinaParaOAcompanhamento,
} from "@/lib/dominio/dsa/acompanhamento-de-avaliacoes";

/* Turma de 2048: início segunda 02/03/2048 (semana 1), 20 semanas. */
const janela = { dataInicio: "2048-03-02", dataTermino: "2048-07-17", duracaoSemanasDoCurso: 20 };

const disciplina = (
  cod: string,
  extra: Partial<DisciplinaParaOAcompanhamento> = {},
): DisciplinaParaOAcompanhamento => ({
  id: `d-${cod}`,
  cod,
  nome: `Disciplina ${cod}`,
  terminoPrevisto: "2048-03-20",
  itens: [],
  semItem: [],
  ...extra,
});

describe("FR-009 · a aba Avaliações do acompanhamento", () => {
  it("uma linha por avaliação, com as três semanas e o TA", () => {
    const linhas = linhasDoAcompanhamentoDeAvaliacoes({
      janela,
      referencia: "2048-03-13",
      disciplinas: [
        disciplina("I", {
          itens: [
            { rotulo: "PM 1", situacao: "concluida", aplicacao: "2048-03-11", tempo: 2 },
            { rotulo: "PM 2", situacao: "pendente", aplicacao: "2048-03-18", tempo: 3 },
            { rotulo: "PM 3", situacao: "pendente", aplicacao: null, tempo: null },
          ],
        }),
      ],
    });
    expect(linhas).toEqual([
      expect.objectContaining({
        disciplina: "I",
        avaliacao: "PM 1",
        situacao: "concluida",
        semanaPrevista: 3,
        semanaLancada: 2,
        semanaAplicada: 2,
        ta: 2,
      }),
      /* Lançada na semana 3, mas a referência (o fim da semana mostrada) ainda não chegou: não aplicada. */
      expect.objectContaining({ avaliacao: "PM 2", semanaLancada: 3, semanaAplicada: null, ta: 3 }),
      expect.objectContaining({
        avaliacao: "PM 3",
        semanaLancada: null,
        semanaAplicada: null,
        ta: null,
      }),
    ]);
  });

  it("a avaliação lançada sem item entra, pelo tipo, sem TA do currículo", () => {
    const [linha] = linhasDoAcompanhamentoDeAvaliacoes({
      janela,
      referencia: "2048-03-13",
      disciplinas: [
        disciplina("II", {
          semItem: [{ tipo: "Prova Escrita", situacao: "concluida", aplicacao: "2048-03-04" }],
        }),
      ],
    });
    expect(linha).toEqual(
      expect.objectContaining({
        avaliacao: "Prova Escrita (sem item do currículo)",
        semanaLancada: 1,
        semanaAplicada: 1,
        ta: null,
      }),
    );
  });

  it("as disciplinas saem em ordem natural do código (II antes de X)", () => {
    const linhas = linhasDoAcompanhamentoDeAvaliacoes({
      janela,
      referencia: "2048-03-13",
      disciplinas: [
        disciplina("X", { itens: [{ rotulo: "PP 1", situacao: null, aplicacao: null, tempo: 1 }] }),
        disciplina("II", {
          itens: [{ rotulo: "PP 1", situacao: null, aplicacao: null, tempo: 1 }],
        }),
      ],
    });
    expect(linhas.map((l) => l.disciplina)).toEqual(["II", "X"]);
  });

  it("sem término previsto, a semana prevista fica vazia (nunca inventada)", () => {
    const [linha] = linhasDoAcompanhamentoDeAvaliacoes({
      janela,
      referencia: "2048-03-13",
      disciplinas: [
        disciplina("I", {
          terminoPrevisto: null,
          itens: [{ rotulo: "PM 1", situacao: null, aplicacao: null, tempo: 2 }],
        }),
      ],
    });
    expect(linha?.semanaPrevista).toBeNull();
  });
});
