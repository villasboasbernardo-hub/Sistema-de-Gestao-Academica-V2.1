/**
 * `alertasDeVista` (spec 014, FR-054, T188): as atrasadas e as que vencem em breve, decididas por
 * `situacaoDaAvaliacao` — o 8º dia é atrasada, o 7º não; «em breve» inclui hoje e os próximos N dias.
 */
import { describe, expect, it } from "vitest";

import {
  alertasDeVista,
  type AvaliacaoParaAlerta,
} from "@/lib/dominio/avaliacoes/alertas-de-vista";

const base: AvaliacaoParaAlerta = {
  id: "a",
  turma: "T",
  disciplina: "I",
  tipo: "Prova",
  natureza: "prova",
  estadoDoRegistro: "concluida",
  aplicacao: "2026-10-01",
  sessoesDeVista: [],
  temItemDeVista: true,
  itemLigado: true,
};
const P = { prazoDias: 7, venceEmBreveDias: 2 };

describe("FR-054 · alertas de vista", () => {
  it("o 8º dia sem vista é atrasada; o 7º não é", () => {
    expect(alertasDeVista([base], { ...P, hoje: "2026-10-09" })[0]?.tipoDoAlerta).toBe("atrasada");
    expect(alertasDeVista([base], { ...P, hoje: "2026-10-08" })[0]?.tipoDoAlerta).toBe(
      "vence_em_breve",
    );
  });

  it("vence em breve: o prazo cai entre hoje e hoje + N; antes disso, nada", () => {
    // Aplicação 01/10 → vence 08/10. Em 06/10 o limite do breve é 08/10: entra. Em 05/10, não.
    expect(alertasDeVista([base], { ...P, hoje: "2026-10-06" })).toHaveLength(1);
    expect(alertasDeVista([base], { ...P, hoje: "2026-10-05" })).toHaveLength(0);
  });

  it("vista registrada, sem item de vista, OD, cancelada ou não aplicada: sem alerta", () => {
    const hoje = { ...P, hoje: "2026-10-20" };
    expect(alertasDeVista([{ ...base, sessoesDeVista: ["2026-10-03"] }], hoje)).toEqual([]);
    expect(alertasDeVista([{ ...base, temItemDeVista: false }], hoje)).toEqual([]);
    expect(alertasDeVista([{ ...base, natureza: "od" }], hoje)).toEqual([]);
    expect(alertasDeVista([{ ...base, estadoDoRegistro: "cancelada" }], hoje)).toEqual([]);
    expect(alertasDeVista([{ ...base, aplicacao: null }], hoje)).toEqual([]);
  });

  it("prova SEM item do currículo ligado não entra no alerta (14/10/2026): vai para a lista de erros de planilha", () => {
    const hoje = { ...P, hoje: "2026-10-20" };
    expect(alertasDeVista([{ ...base, itemLigado: false }], hoje)).toEqual([]);
    expect(alertasDeVista([{ ...base, itemLigado: false }], { ...P, hoje: "2026-10-07" })).toEqual(
      [],
    );
    // O caso que discrimina: a mesma prova, ligada, é atrasada.
    expect(alertasDeVista([base], hoje)[0]?.tipoDoAlerta).toBe("atrasada");
  });

  it("atrasadas primeiro, e a data-limite vem calculada", () => {
    const r = alertasDeVista(
      [
        { ...base, id: "b", aplicacao: "2026-10-12" },
        { ...base, id: "a", aplicacao: "2026-10-01" },
      ],
      { ...P, hoje: "2026-10-17" },
    );
    expect(r.map((x) => [x.id, x.tipoDoAlerta, x.venceEm])).toEqual([
      ["a", "atrasada", "2026-10-08"],
      ["b", "vence_em_breve", "2026-10-19"],
    ]);
  });
});
