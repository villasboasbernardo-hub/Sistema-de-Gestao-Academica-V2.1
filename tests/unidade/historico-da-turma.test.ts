/** D-COR-4 e D-COR-5 — o histórico da situação da turma na ficha (spec 017, FR-003.4 e FR-004.5). */
import { describe, expect, it } from "vitest";

import { historicoDaTurma } from "@/lib/dominio/historico-da-turma";

const NOMES = new Map([["u-1", "CT Encarregado"]]);

describe("historicoDaTurma", () => {
  it("junta trocas e arquivamentos, o mais recente primeiro", () => {
    const h = historicoDaTurma({
      trocas: [
        {
          ordem: 1,
          anterior: "planejada",
          nova: "ativa",
          observacao: null,
          autorId: "u-1",
          em: "2026-03-02T10:00:00Z",
        },
        {
          ordem: 2,
          anterior: "ativa",
          nova: "concluida",
          observacao: "Curso encerrado",
          autorId: "u-1",
          em: "2026-10-10T14:00:00Z",
        },
      ],
      arquivamentos: [
        {
          ordem: 1,
          acao: "arquivar",
          observacao: "Fim do ano",
          autorId: "u-1",
          em: "2026-10-15T09:00:00Z",
        },
      ],
      nomes: NOMES,
    });
    expect(h.map((e) => e.rotulo)).toEqual(["Arquivada", "Ativa → Concluída", "Planejada → Ativa"]);
    expect(h[1]).toMatchObject({ autor: "CT Encarregado", observacao: "Curso encerrado" });
  });

  it("⚠️ o autor que a pessoa não lê sai como «outra conta» (C-22), e o sem sessão, como tal", () => {
    const h = historicoDaTurma({
      trocas: [
        {
          ordem: 1,
          anterior: "ativa",
          nova: "cancelada",
          observacao: null,
          autorId: "u-2",
          em: "2026-05-01T10:00:00Z",
        },
        {
          ordem: 2,
          anterior: "cancelada",
          nova: "ativa",
          observacao: null,
          autorId: null,
          em: "2026-05-02T10:00:00Z",
        },
      ],
      arquivamentos: [],
      nomes: NOMES,
    });
    expect(h.map((e) => e.autor)).toEqual(["sem sessão", "outra conta"]);
  });

  it("desarquivar aparece como «Desarquivada»", () => {
    const h = historicoDaTurma({
      trocas: [],
      arquivamentos: [
        {
          ordem: 1,
          acao: "arquivar",
          observacao: null,
          autorId: "u-1",
          em: "2026-10-15T09:00:00Z",
        },
        {
          ordem: 2,
          acao: "desarquivar",
          observacao: null,
          autorId: "u-1",
          em: "2026-10-16T09:00:00Z",
        },
      ],
      nomes: NOMES,
    });
    expect(h.map((e) => e.rotulo)).toEqual(["Desarquivada", "Arquivada"]);
  });

  it("no mesmo instante, o arquivamento vem antes da troca (arquivar é o ato que fecha)", () => {
    const h = historicoDaTurma({
      trocas: [
        {
          ordem: 9,
          anterior: "ativa",
          nova: "concluida",
          observacao: null,
          autorId: "u-1",
          em: "2026-10-15T09:00:00Z",
        },
      ],
      arquivamentos: [
        {
          ordem: 1,
          acao: "arquivar",
          observacao: null,
          autorId: "u-1",
          em: "2026-10-15T09:00:00Z",
        },
      ],
      nomes: NOMES,
    });
    expect(h.map((e) => e.rotulo)).toEqual(["Arquivada", "Ativa → Concluída"]);
  });
});
