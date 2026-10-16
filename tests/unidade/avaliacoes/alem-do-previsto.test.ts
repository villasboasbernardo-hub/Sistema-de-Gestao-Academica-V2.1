/**
 * `RN-AV-14` (emenda de 15/10/2026 à spec 014): *"prova a mais que o currículo prevê NÃO é erro de planilha; vira
 * alerta informativo na aba Avaliações da turma ("currículo prevê 1 PP; aplicadas 2")."*
 */
import { describe, expect, it } from "vitest";

import { alemDoPrevisto } from "@/lib/dominio/avaliacoes/alem-do-previsto";

const prova = (instrumento: string | null, aplicada = true) => ({
  instrumento,
  natureza: "prova" as const,
  aplicada,
});

describe("RN-AV-14 · alemDoPrevisto", () => {
  it("a frase literal da regra: «currículo prevê 1 PP; aplicadas 2»", () => {
    expect(
      alemDoPrevisto({
        itens: [{ instrumento: "PP", natureza: "prova" }],
        avaliacoes: [prova("PP"), prova("PP")],
      }),
    ).toEqual([
      { instrumento: "PP", previstos: 1, aplicadas: 2, frase: "currículo prevê 1 PP; aplicadas 2" },
    ]);
  });

  it("no limite não há linha (fronteira): 2 previstas, 2 aplicadas", () => {
    expect(
      alemDoPrevisto({
        itens: [
          { instrumento: "PM", natureza: "prova" },
          { instrumento: "PM", natureza: "prova" },
        ],
        avaliacoes: [prova("PM"), prova("PM")],
      }),
    ).toEqual([]);
  });

  it("só conta a APLICADA; a agendada à frente não passa do previsto", () => {
    expect(
      alemDoPrevisto({
        itens: [{ instrumento: "PP", natureza: "prova" }],
        avaliacoes: [prova("PP"), prova("PP", false)],
      }),
    ).toEqual([]);
  });

  it("instrumento que o currículo não prevê: «prevê 0»", () => {
    expect(alemDoPrevisto({ itens: [], avaliacoes: [prova("PP")] })[0]?.frase).toBe(
      "currículo prevê 0 PP; aplicadas 1",
    );
  });

  it("instrumento desconhecido e OD ficam fora", () => {
    expect(
      alemDoPrevisto({
        itens: [{ instrumento: "OD", natureza: "od" }],
        avaliacoes: [prova(null), { instrumento: "OD", natureza: "od", aplicada: true }],
      }),
    ).toEqual([]);
  });
});
