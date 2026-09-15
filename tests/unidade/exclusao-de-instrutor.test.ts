/**
 * A exclusão permanente de instrutor sem histórico — o motivo na tela e a leitura da recusa do banco
 * (autorização de Bernardo Villas Boas, 15/09/2026).
 */
import { describe, expect, it } from "vitest";

import {
  chavesDaRecusa,
  codigoConfere,
  motivoDoImpedimento,
} from "@/lib/dominio/exclusao-de-instrutor";

describe("Regra 4, exceção · o motivo escrito ao lado do botão", () => {
  it("sem impedimento não há motivo", () => {
    expect(motivoDoImpedimento([])).toBeNull();
  });

  it("um impedimento", () => {
    expect(motivoDoImpedimento(["aula_lancada"])).toBe(
      "Não pode ser excluído: tem aula lançada. Instrutor com histórico só pode ser desativado.",
    );
  });

  it("vários impedimentos, com 'e' no último", () => {
    expect(motivoDoImpedimento(["atribuicao", "vinculo_de_habilitacao", "conta_de_acesso"])).toBe(
      "Não pode ser excluído: tem atribuição, vínculo de habilitação e conta de acesso ligada. Instrutor com histórico só pode ser desativado.",
    );
  });

  it("chave desconhecida aparece como está — nunca some", () => {
    expect(motivoDoImpedimento(["chave_nova"])).toContain("chave_nova");
  });
});

describe("Regra 4, exceção · a recusa do banco e o código digitado", () => {
  it("lê as chaves de `instrutor_com_historico`", () => {
    expect(chavesDaRecusa("instrutor_com_historico: aula_lancada, vinculo_de_habilitacao")).toEqual(
      ["aula_lancada", "vinculo_de_habilitacao"],
    );
    expect(chavesDaRecusa("outra coisa")).toEqual([]);
  });

  it("o código confere só exato, aparado, e nunca vazio", () => {
    expect(codigoConfere(" 178 ", "178")).toBe(true);
    expect(codigoConfere("17", "178")).toBe(false);
    expect(codigoConfere("", "")).toBe(false);
  });
});
