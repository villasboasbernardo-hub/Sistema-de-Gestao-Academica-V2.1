/**
 * A capacitação didática em lista fechada — spec 020 (Bloco 5), C-9 a C-12.
 *
 * > *"CAPACITAÇÃO DIDÁTICA DO INSTRUTOR: múltipla escolha de lista fechada (C-Esp-DID, C-Exp-TE, Licenciatura). Hoje é
 * > texto livre: a CONVERSÃO do texto para a lista está AUTORIZADA (…); valor que não casar com a lista NÃO se perde —
 * > fica guardado e aparece como aviso na ficha para correção à mão."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ A conversão que vale é a do banco (`app.converter_capacitacoes_didaticas()`, M2); esta é o espelho, e o pgTAP
 *    `143_bloco_5.sql` cobra do banco os mesmos casos.
 */
import { describe, expect, it } from "vitest";

import {
  CAPACITACOES_DIDATICAS,
  converterCapacitacao,
  rotuloDasCapacitacoes,
  temCapacitacao,
} from "@/lib/dominio/capacitacao-didatica";
import { Constants } from "@/lib/tipos/database";

describe("a lista fechada", () => {
  it("é a do pedido, nesta ordem", () => {
    expect(CAPACITACOES_DIDATICAS).toEqual(["C-Esp-DID", "C-Exp-TE", "Licenciatura"]);
  });

  it("é o tipo do banco, nas duas direções", () => {
    expect([...Constants.public.Enums.tipo_capacitacao_didatica].sort()).toEqual(
      [...CAPACITACOES_DIDATICAS].sort(),
    );
  });
});

describe("C-10 · a conversão do texto antigo", () => {
  it.each([
    ["C-Exp-TE", ["C-Exp-TE"], null],
    ["C-Exp-TE, C-Esp-DID", ["C-Esp-DID", "C-Exp-TE"], null],
    ["Licenciatura, C-Esp-DID", ["C-Esp-DID", "Licenciatura"], null],
    ["licenciatura; c esp did / C-EXP-TE", ["C-Esp-DID", "C-Exp-TE", "Licenciatura"], null],
    ["C-Exp-TE, c-exp-te", ["C-Exp-TE"], null],
    ["Pedagogia, C-Exp-TE", ["C-Exp-TE"], "Pedagogia"],
    ["Curso de Didática, Pós em Docência", [], "Curso de Didática, Pós em Docência"],
    // Só separadores: nenhuma parte casa, e o texto não pode sumir (o alerta viraria).
    [", ,", [], ", ,"],
  ] as const)("«%s»", (texto, lista, aCorrigir) => {
    expect(converterCapacitacao(texto)).toEqual({ lista, aCorrigir });
  });

  it("vazio e nulo não viram nada", () => {
    expect(converterCapacitacao(null)).toEqual({ lista: [], aCorrigir: null });
    expect(converterCapacitacao("  ")).toEqual({ lista: [], aCorrigir: null });
  });
});

describe("C-12 · «tem capacitação» é a lista ou o texto a corrigir", () => {
  it("o veredito do texto antigo se mantém depois da conversão", () => {
    for (const texto of [null, "", "C-Exp-TE", "Pedagogia", "Licenciatura, Pedagogia", ", ,"]) {
      const antes = texto !== null && texto.trim() !== "";
      const depois = temCapacitacao(converterCapacitacao(texto));
      expect(depois, `«${texto}»`).toBe(antes);
    }
  });
});

describe("a leitura", () => {
  it("as marcadas, na ordem da lista, ou «Nenhuma»", () => {
    expect(rotuloDasCapacitacoes(["Licenciatura", "C-Esp-DID"])).toBe("C-Esp-DID, Licenciatura");
    expect(rotuloDasCapacitacoes([])).toBe("Nenhuma");
  });
});
