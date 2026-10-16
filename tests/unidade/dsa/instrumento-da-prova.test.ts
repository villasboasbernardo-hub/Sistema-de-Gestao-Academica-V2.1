/**
 * A2 do desenho de 15/10/2026 (aprovado por Bernardo Villas Boas em 16/10/2026) — o INSTRUMENTO da prova sem item do
 * currículo, `avaliacoes.instrumento_id` (`RN-AV-13`, `RN-AV-14` da spec 014).
 *
 * ⚠️ **OS CASOS QUE DISCRIMINAM** (DoD 8): com item ligado a gravação manda NULO mesmo que um instrumento venha (o
 *    instrumento é o do item, e a coluna nunca é segunda fonte de verdade); e a OD não é oferecida NEM aceita — a
 *    regra não pode viver só na tela.
 */
import { describe, expect, it } from "vitest";

import {
  INSTRUMENTO_FORA_DO_DSA,
  instrumentoNaGravacao,
  instrumentosOferecidos,
  type InstrumentoDaLista,
} from "@/lib/dominio/dsa/instrumento-da-prova";

const LISTA: readonly InstrumentoDaLista[] = [
  { id: "pe", valor: "PE", rotulo: "Prova Escrita", ativo: true },
  { id: "pm", valor: "PM", rotulo: "Prova Mista", ativo: true },
  { id: "pp", valor: "PP", rotulo: null, ativo: true },
  { id: "pd", valor: "PD", rotulo: "Prova Discursiva", ativo: false },
  { id: "od", valor: "OD", rotulo: "Observação de Desempenho", ativo: true },
];

describe("A2 · os instrumentos oferecidos", () => {
  it("os ATIVOS, menos a OD, na ordem recebida, com a sigla e o nome", () => {
    expect(instrumentosOferecidos(LISTA)).toEqual([
      { id: "pe", valor: "PE", rotulo: "PE — Prova Escrita" },
      { id: "pm", valor: "PM", rotulo: "PM — Prova Mista" },
      { id: "pp", valor: "PP", rotulo: "PP" },
    ]);
  });

  it("a OD fica fora mesmo escrita em minúscula ou com espaço", () => {
    const comOd = instrumentosOferecidos([{ id: "x", valor: " od ", rotulo: null, ativo: true }]);
    expect(comOd).toEqual([]);
    expect(INSTRUMENTO_FORA_DO_DSA).toBe("OD");
  });
});

describe("A2 · o instrumento que a gravação escreve", () => {
  const oferecidos = instrumentosOferecidos(LISTA);

  it("COM item do currículo: nulo, mesmo que um instrumento tenha vindo", () => {
    expect(
      instrumentoNaGravacao({ avaliacaoCurriculoId: "item-1", instrumentoId: "pe", oferecidos }),
    ).toEqual({ ok: true, instrumentoId: null });
  });

  it("SEM item: o escolhido, quando é um dos oferecidos", () => {
    expect(
      instrumentoNaGravacao({ avaliacaoCurriculoId: null, instrumentoId: "pm", oferecidos }),
    ).toEqual({ ok: true, instrumentoId: "pm" });
  });

  it("SEM item e sem instrumento: nulo (o campo é opcional)", () => {
    expect(
      instrumentoNaGravacao({ avaliacaoCurriculoId: null, instrumentoId: null, oferecidos }),
    ).toEqual({ ok: true, instrumentoId: null });
  });

  it("a OD, um inativo ou um id de fora da lista: RECUSA no servidor", () => {
    for (const instrumentoId of ["od", "pd", "outro"]) {
      expect(
        instrumentoNaGravacao({ avaliacaoCurriculoId: null, instrumentoId, oferecidos }).ok,
        instrumentoId,
      ).toBe(false);
    }
  });
});
