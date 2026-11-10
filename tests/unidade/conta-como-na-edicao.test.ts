/**
 * RA-4 (Bloco 18, spec 033) — o «Conta como» que a EDIÇÃO do cartão do DSA manda ao servidor
 * (`lib/dominio/atividades/conta-como-na-edicao.ts`).
 *
 * > *"Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador pode trocar no lançamento."*
 * > — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * O caso que discrimina (DoD 8; achado da revisão do Bloco 18): a escolha gravada que ficou IGUAL ao padrão do tipo —
 * porque o Admin trocou depois a classificação dele no catálogo — NÃO vai como «padrão» (nulo) quando a pessoa grava o
 * cartão sem mexer no campo. Com a regra antiga (comparar só com o gravado), ela ia, e a escolha explícita sumia.
 */
import { describe, expect, it } from "vitest";

import {
  contaComoInicialDoCampo,
  contaComoNaEdicao,
} from "@/lib/dominio/atividades/conta-como-na-edicao";
import { contaComoParaGravar } from "@/lib/dominio/atividades/lancamento-de-atividade";
import { contaComoDoBanco } from "@/lib/dominio/categoria-pelo-tipo";

describe("RA-4 · o valor com que o campo abre", () => {
  it("a escolha gravada, ou vazio (o padrão do tipo)", () => {
    expect(contaComoInicialDoCampo("TAD")).toBe("TAD");
    expect(contaComoInicialDoCampo("CHD")).toBe("CHD");
    expect(contaComoInicialDoCampo(null)).toBe("");
    expect(contaComoInicialDoCampo(undefined)).toBe("");
    // Valor que não é «Conta como» conhecido abre como o padrão.
    expect(contaComoInicialDoCampo("XYZ")).toBe("");
  });
});

describe("RA-4 · o que a edição manda", () => {
  it("⚠️ o caso que discrimina: escolha gravada igual ao padrão NOVO do tipo, campo intocado → nada vai", () => {
    // Gravado TAD quando Palestra era AEC; depois o Admin passou Palestra para TAD.
    const entrada = { categoriaDoTipo: "TAD" as const, gravada: "TAD", campo: "TAD" };
    expect(contaComoNaEdicao(entrada)).toEqual({ mandar: false });
    // A regra antiga — comparar o que iria (nulo) só com o gravado (TAD) — mandaria o nulo:
    const antigo = contaComoParaGravar("TAD", contaComoDoBanco(entrada.campo));
    expect(antigo).toBeNull();
    expect(antigo).not.toBe(contaComoDoBanco(entrada.gravada));
  });

  it("a pessoa troca a escolha: vai o valor novo", () => {
    expect(contaComoNaEdicao({ categoriaDoTipo: "AEC", gravada: "TAD", campo: "TR" })).toEqual({
      mandar: true,
      valor: "TR",
    });
    expect(contaComoNaEdicao({ categoriaDoTipo: "AEC", gravada: null, campo: "CHD" })).toEqual({
      mandar: true,
      valor: "CHD",
    });
  });

  it("a pessoa volta ao padrão a partir de uma escolha gravada: vai o nulo («padrão do tipo»)", () => {
    expect(contaComoNaEdicao({ categoriaDoTipo: "AEC", gravada: "TAD", campo: "AEC" })).toEqual({
      mandar: true,
      valor: null,
    });
  });

  it("gravado nulo, a pessoa escolhe outro valor e volta ao padrão: nada vai", () => {
    expect(contaComoNaEdicao({ categoriaDoTipo: "AEC", gravada: null, campo: "AEC" })).toEqual({
      mandar: false,
    });
  });

  it("campo intocado sem escolha gravada: nada vai", () => {
    expect(contaComoNaEdicao({ categoriaDoTipo: "TR", gravada: null, campo: "" })).toEqual({
      mandar: false,
    });
  });

  it("sem classificação do tipo (aula, avaliação, tipo sem categoria): nunca vai", () => {
    expect(contaComoNaEdicao({ categoriaDoTipo: null, gravada: "TAD", campo: "AEC" })).toEqual({
      mandar: false,
    });
  });
});
