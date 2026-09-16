/**
 * `RN-INST-02`, item (i) — o inativo sai da lista de **nova** atribuição (`FR-009` da spec 006).
 */
import { describe, expect, it } from "vitest";

import { elegiveisParaNovaAtribuicao } from "@/lib/dominio/ciclo-de-vida-instrutor";

const ativo = { codigo: "1", status: "ativo" } as const;
const inativo = { codigo: "2", status: "inativo" } as const;
const outroAtivo = { codigo: "3", status: "ativo" } as const;

describe("`RN-INST-02` · elegíveis para nova atribuição", () => {
  it("o inativo sai, e os ativos ficam", () => {
    expect(elegiveisParaNovaAtribuicao([ativo, inativo, outroAtivo])).toEqual([ativo, outroAtivo]);
  });

  it("a ordem de chegada é preservada — quem ordena por antiguidade é outra função", () => {
    expect(elegiveisParaNovaAtribuicao([outroAtivo, inativo, ativo]).map((i) => i.codigo)).toEqual([
      "3",
      "1",
    ]);
  });

  it("a lista de entrada não é alterada", () => {
    const entrada = [ativo, inativo, outroAtivo];
    const copia = [...entrada];
    const saida = elegiveisParaNovaAtribuicao(entrada);
    expect(entrada).toEqual(copia);
    expect(saida).not.toBe(entrada);
  });

  it("status ausente NÃO é ativo por padrão (`RN-INST-05`)", () => {
    expect(
      elegiveisParaNovaAtribuicao([
        { codigo: "4", status: null },
        { codigo: "5", status: undefined },
        { codigo: "6", status: "" },
      ]),
    ).toEqual([]);
  });

  it("reativar devolve à lista: é o mesmo cadastro com status ativo de novo (item iv)", () => {
    const reativado = { ...inativo, status: "ativo" };
    expect(elegiveisParaNovaAtribuicao([reativado])).toEqual([reativado]);
  });
});
