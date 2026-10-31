/**
 * Bloco 16 (spec 031, `FR-009`; ajuste D da conferência de 31/10/2026) — as linhas da aba *Avaliações* do DSA:
 * *Avaliação · Situação · Data de aplicação · Data da vista*, com o alvo do ajuste e o histórico. As semanas saíram.
 */
import { describe, expect, it } from "vitest";

import {
  linhasDoAcompanhamentoDeAvaliacoes,
  type DisciplinaParaOAcompanhamento,
} from "@/lib/dominio/dsa/acompanhamento-de-avaliacoes";

const disciplina = (
  cod: string,
  extra: Partial<DisciplinaParaOAcompanhamento> = {},
): DisciplinaParaOAcompanhamento => ({
  id: `d-${cod}`,
  cod,
  nome: `Disciplina ${cod}`,
  itens: [],
  semItem: [],
  ...extra,
});

describe("FR-009 / ajuste D · a aba Avaliações do acompanhamento", () => {
  it("uma linha por avaliação: situação, data de aplicação e da vista, e o alvo do ajuste", () => {
    const linhas = linhasDoAcompanhamentoDeAvaliacoes([
      disciplina("I", {
        itens: [
          {
            itemId: "item-1",
            rotulo: "PM 1",
            situacao: "concluida",
            aplicacao: "2048-03-11",
            vista: "2048-03-13",
            historico: [],
          },
        ],
        semItem: [
          {
            id: "av-2",
            tipo: "Prova Escrita",
            situacao: "pendente",
            aplicacao: null,
            vista: null,
            historico: [],
          },
        ],
      }),
    ]);
    expect(linhas).toEqual([
      expect.objectContaining({
        disciplina: "I",
        avaliacao: "PM 1",
        situacao: "concluida",
        aplicacao: "2048-03-11",
        vista: "2048-03-13",
        alvo: { avaliacaoCurriculoId: "item-1", avaliacaoId: null },
      }),
      expect.objectContaining({
        avaliacao: "Prova Escrita (sem item do currículo)",
        aplicacao: null,
        vista: null,
        alvo: { avaliacaoCurriculoId: null, avaliacaoId: "av-2" },
      }),
    ]);
    expect(linhas[0]).not.toHaveProperty("semanaPrevista");
  });

  it("o histórico do ajuste chega à linha", () => {
    const [linha] = linhasDoAcompanhamentoDeAvaliacoes([
      disciplina("I", {
        itens: [
          {
            itemId: "item-1",
            rotulo: "PM 1",
            situacao: "cancelada",
            aplicacao: null,
            vista: null,
            historico: [
              {
                situacao: "cancelada",
                dataAplicacao: null,
                dataVista: null,
                justificativa: "Prova suprimida pelo curso.",
                autor: "Fulano",
                em: "2048-03-20T10:00:00Z",
              },
            ],
          },
        ],
      }),
    ]);
    expect(linha?.historico).toHaveLength(1);
    expect(linha?.situacao).toBe("cancelada");
  });

  it("as disciplinas saem em ordem natural do código (II antes de X)", () => {
    const item = {
      itemId: "i",
      rotulo: "PP 1",
      situacao: null,
      aplicacao: null,
      vista: null,
      historico: [],
    };
    const linhas = linhasDoAcompanhamentoDeAvaliacoes([
      disciplina("X", { itens: [{ ...item, itemId: "x" }] }),
      disciplina("II", { itens: [{ ...item, itemId: "ii" }] }),
    ]);
    expect(linhas.map((l) => l.disciplina)).toEqual(["II", "X"]);
  });
});
