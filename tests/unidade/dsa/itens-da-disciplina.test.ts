/**
 * `ofertaDaDisciplina` (spec 014, FR-032, FR-033, FR-040 — T200): o formulário oferece as avaliações do currículo
 * e a vista como a próxima sessão da prova aplicada; lançar além do previsto é alerta.
 */
import { describe, expect, it } from "vitest";

import {
  alertaDeItemJaAplicado,
  ofertaDaDisciplina,
  type ItemParaOferta,
} from "@/lib/dominio/dsa/itens-da-disciplina";

const PM1: ItemParaOferta = {
  id: "i1",
  rotulo: "PM 1",
  natureza: "prova",
  ueNumero: 7,
  taAplicacao: 2,
  taVista: 1,
};
const PM2: ItemParaOferta = { ...PM1, id: "i2", rotulo: "PM 2", ueNumero: null };
const TG1: ItemParaOferta = {
  ...PM1,
  id: "i3",
  rotulo: "TG 1",
  ueNumero: null,
  natureza: "trabalho",
  taVista: null,
};
const OD: ItemParaOferta = { ...PM1, id: "i4", rotulo: "OD 1", natureza: "od", taAplicacao: null };

describe("FR-032 · a oferta da disciplina", () => {
  it("oferece prova e trabalho, com a UE no rótulo, e NÃO a OD", () => {
    const o = ofertaDaDisciplina({ itens: [PM1, PM2, TG1, OD], avaliacoes: [] });
    expect(o.avaliacoes.map((a) => a.rotulo)).toEqual(["PM 1 (UE 7)", "PM 2", "TG 1"]);
    expect(o.vistas).toEqual([]);
  });

  it("a aplicada vem marcada e depois das não aplicadas", () => {
    const o = ofertaDaDisciplina({
      itens: [PM1, PM2],
      avaliacoes: [{ id: "a1", itemId: "i1", tipo: "Prova", aplicacao: "2026-10-01", sessoes: [] }],
    });
    expect(o.avaliacoes.map((a) => [a.rotulo, a.aplicada])).toEqual([
      ["PM 2", false],
      ["PM 1 (UE 7)", true],
    ]);
  });

  it("FR-040 · a vista é a PRÓXIMA sessão da prova aplicada", () => {
    const sem = ofertaDaDisciplina({
      itens: [PM1],
      avaliacoes: [{ id: "a1", itemId: "i1", tipo: "Prova", aplicacao: "2026-10-01", sessoes: [] }],
    });
    expect(sem.vistas[0]?.proximaSessao).toBe(1);
    const com = ofertaDaDisciplina({
      itens: [PM1],
      avaliacoes: [
        { id: "a1", itemId: "i1", tipo: "Prova", aplicacao: "2026-10-01", sessoes: [1, 3] },
      ],
    });
    expect(com.vistas[0]?.proximaSessao).toBe(4);
    expect(com.vistas[0]?.rotulo).toContain("sessão 4");
  });

  it("item sem vista no currículo não oferece vista; o histórico sem item oferece", () => {
    const o = ofertaDaDisciplina({
      itens: [TG1],
      avaliacoes: [
        { id: "a1", itemId: "i3", tipo: "Trabalho", aplicacao: "2026-10-01", sessoes: [] },
        { id: "a2", itemId: null, tipo: "Prova Escrita", aplicacao: "2026-09-01", sessoes: [] },
      ],
    });
    expect(o.vistas.map((v) => v.avaliacaoId)).toEqual(["a2"]);
  });

  it("edge case · lançar o item já aplicado é ALERTA, nunca bloqueio; o não aplicado, nada", () => {
    const o = ofertaDaDisciplina({
      itens: [PM1, PM2],
      avaliacoes: [{ id: "a1", itemId: "i1", tipo: "Prova", aplicacao: "2026-10-01", sessoes: [] }],
    });
    expect(alertaDeItemJaAplicado(o, "i1")).toMatch(/passa do previsto/);
    expect(alertaDeItemJaAplicado(o, "i2")).toBeNull();
    expect(alertaDeItemJaAplicado(o, null)).toBeNull();
  });
});
