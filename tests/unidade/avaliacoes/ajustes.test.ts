/**
 * Bloco 16 (spec 031, ajuste D de 31/10/2026) — o ajuste manual da situação e das datas de uma avaliação: o mais recente
 * vale na linha, os anteriores são o histórico, e nada além da linha muda.
 */
import { describe, expect, it } from "vitest";

import { comAjustes, type AjusteDeAvaliacao } from "@/lib/dominio/avaliacoes/ajustes";
import type { QuadroDeAvaliacoes } from "@/lib/dominio/avaliacoes/quadro-da-turma";

const quadro = (): QuadroDeAvaliacoes =>
  ({
    contagem: { total: 1 },
    disciplinas: [
      {
        disciplina: { id: "d1", cod: "I", nome: "D I" },
        itens: [
          {
            itemId: "item-1",
            rotulo: "PM 1",
            situacao: "pendente",
            aplicacao: null,
            vista: null,
            avaliacaoId: null,
          },
        ],
        semItem: [
          {
            id: "av-9",
            tipo: "Prova Escrita",
            situacao: "concluida",
            aplicacao: "2049-04-01",
            vista: null,
          },
        ],
      },
    ],
  }) as unknown as QuadroDeAvaliacoes;

const ajuste = (extra: Partial<AjusteDeAvaliacao>): AjusteDeAvaliacao => ({
  avaliacaoCurriculoId: "item-1",
  avaliacaoId: null,
  situacao: "concluida",
  dataAplicacao: "2049-04-10",
  dataVista: "2049-04-12",
  justificativa: "Aplicada fora do DSA, conforme a ata.",
  autor: "Fulano",
  em: "2049-04-20T10:00:00Z",
  ...extra,
});

describe("comAjustes · o mais recente vale", () => {
  it("sem ajuste, a linha é a do quadro, sem histórico", () => {
    const q = comAjustes(quadro(), []);
    expect(q.disciplinas[0]!.itens[0]).toEqual(
      expect.objectContaining({ situacao: "pendente", aplicacao: null, historico: [] }),
    );
  });

  it("o item do currículo ganha a situação e as datas do ÚLTIMO ajuste; o histórico, do mais novo ao mais velho", () => {
    const q = comAjustes(quadro(), [
      ajuste({
        situacao: "em_andamento",
        em: "2049-04-18T10:00:00Z",
        justificativa: "Primeiro ajuste feito.",
      }),
      ajuste({ situacao: "concluida", em: "2049-04-20T10:00:00Z" }),
    ]);
    const linha = q.disciplinas[0]!.itens[0]!;
    expect(linha.situacao).toBe("concluida");
    expect(linha.aplicacao).toBe("2049-04-10");
    expect(linha.vista).toBe("2049-04-12");
    expect((linha.historico ?? []).map((h) => h.situacao)).toEqual(["concluida", "em_andamento"]);
  });

  it("a avaliação sem item, pelo id dela — e Cancelada só existe pelo ajuste", () => {
    const q = comAjustes(quadro(), [
      ajuste({
        avaliacaoCurriculoId: null,
        avaliacaoId: "av-9",
        situacao: "cancelada",
        dataAplicacao: null,
        dataVista: null,
      }),
    ]);
    const linha = q.disciplinas[0]!.semItem[0]!;
    expect(linha.situacao).toBe("cancelada");
    expect(linha.aplicacao).toBeNull();
    /* O item do currículo, sem ajuste, não muda. */
    expect(q.disciplinas[0]!.itens[0]!.situacao).toBe("pendente");
  });

  it("a contagem não muda: o ajuste é da linha (a CH também não)", () => {
    const q = comAjustes(quadro(), [ajuste({})]);
    expect(q.contagem).toEqual(quadro().contagem);
  });
});
