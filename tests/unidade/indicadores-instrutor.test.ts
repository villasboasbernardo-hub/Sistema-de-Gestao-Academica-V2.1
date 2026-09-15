/**
 * `FR-026` e `FR-026.1` da spec 006 — os quatro indicadores, e a taxa de seleção que não esconde nada.
 */
import { describe, expect, it } from "vitest";

import {
  indicadoresDeInstrutores,
  type InstrutorParaIndicadores,
} from "@/lib/dominio/indicadores-instrutor";

const instrutor = (id: string, capacitacaoDidatica: string | null): InstrutorParaIndicadores => ({
  id,
  capacitacaoDidatica,
});

describe("`FR-026` emendado em 15/09/2026 · exatamente três indicadores", () => {
  it("o resultado tem três chaves, e o cartão de CH do ano não está entre elas", () => {
    const r = indicadoresDeInstrutores([], new Set(), new Set());
    expect(Object.keys(r).sort()).toEqual(["comCapacitacaoDidatica", "taxaDeSelecao", "total"]);
  });

  it("capacitação conta o campo NÃO VAZIO — espaço em branco não é capacitação", () => {
    const r = indicadoresDeInstrutores(
      [
        instrutor("a", "C-Exp-TE"),
        instrutor("b", "C-Exp-TE, C-Esp-DID"),
        instrutor("c", ""),
        instrutor("d", "   "),
        instrutor("e", null),
      ],
      new Set(),
      new Set(),
    );
    expect(r.total).toBe(5);
    expect(r.comCapacitacaoDidatica, "duas qualificações ainda é UM instrutor").toBe(2);
  });
});

describe("`FR-026.1` · selecionados NÃO é subconjunto de habilitados", () => {
  it("com mais selecionados que habilitados, os dois absolutos aparecem e o percentual passa de 100%", () => {
    const r = indicadoresDeInstrutores(
      [instrutor("a", null), instrutor("b", null), instrutor("c", null)],
      new Set(["a"]),
      new Set(["a", "b", "c"]),
    );
    expect(r.taxaDeSelecao.habilitados).toBe(1);
    expect(r.taxaDeSelecao.selecionados).toBe(3);
    expect(r.taxaDeSelecao.percentual, "o excesso foi escondido ou arredondado").toBe(300);
  });

  it("habilitado e selecionado fora do recorte filtrado não contam", () => {
    const r = indicadoresDeInstrutores(
      [instrutor("a", null)],
      new Set(["a", "fora"]),
      new Set(["fora"]),
    );
    expect(r.taxaDeSelecao).toEqual({ habilitados: 1, selecionados: 0, percentual: 0 });
  });

  it("sem habilitado, o percentual é null — divisão por zero não é 0%", () => {
    const r = indicadoresDeInstrutores([instrutor("a", null)], new Set(), new Set(["a"]));
    expect(r.taxaDeSelecao.percentual).toBeNull();
    expect(r.taxaDeSelecao.selecionados).toBe(1);
  });
});
