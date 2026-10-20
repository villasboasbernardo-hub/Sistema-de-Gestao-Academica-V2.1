/**
 * `FR-016`, `FR-017` e `FR-018` — os alertas da ficha, que avisam e nunca bloqueiam.
 */
import { describe, expect, it } from "vitest";

import { alertaForaDaFaixa, alertaSemCapacitacao } from "@/lib/dominio/alertas-instrutor";
import { cargaPorSemana, semanasForaDaFaixa } from "@/lib/dominio/carga-semanal";
import { converterCapacitacao } from "@/lib/dominio/capacitacao-didatica";

const REGIME_20H = { minimo: 8, maximo: 12 };
const REGIME_40H = { minimo: 16, maximo: 24 };

describe("`FR-016` · o alerta nomeia a semana fora da faixa", () => {
  it("`SC-006` · 20h com 14 h numa semana alerta; 40h com 20 h não alerta", () => {
    const quatorze = cargaPorSemana([
      { inicio: "2026-03-02", termino: "2026-03-08", mediaSemanal: 14 },
    ]);
    const vinte = cargaPorSemana([
      { inicio: "2026-03-02", termino: "2026-03-08", mediaSemanal: 20 },
    ]);
    const alerta = alertaForaDaFaixa(semanasForaDaFaixa(quatorze, REGIME_20H), REGIME_20H);
    expect(alerta?.detalhes).toEqual([
      "Semana 10/2026 (02/03/2026 a 08/03/2026): 14 h, acima da faixa de 8 a 12 h.",
    ]);
    expect(alertaForaDaFaixa(semanasForaDaFaixa(vinte, REGIME_40H), REGIME_40H)).toBeNull();
  });

  it("sem semana fora da faixa, ou sem faixa, não há alerta", () => {
    expect(alertaForaDaFaixa([], REGIME_20H)).toBeNull();
    expect(alertaForaDaFaixa([], null)).toBeNull();
  });
});

describe("`FR-017` · mais de um ano de docência sem capacitação", () => {
  const HOJE = "2026-09-16";

  it("docência iniciada há mais de um ano e capacitação vazia gera aviso", () => {
    const alerta = alertaSemCapacitacao(
      { dataInicioDocenciaCiaara: "2021-03-01", capacitacao: converterCapacitacao("  ") },
      HOJE,
    );
    expect(alerta?.chave).toBe("sem-capacitacao");
    expect(alerta?.detalhes[0]).toContain("01/03/2021");
  });

  it("⚠️ data vazia NÃO alerta — sem data não há como contar o ano (decisão de 15/09/2026)", () => {
    expect(
      alertaSemCapacitacao(
        { dataInicioDocenciaCiaara: null, capacitacao: converterCapacitacao(null) },
        HOJE,
      ),
    ).toBeNull();
  });

  it("com capacitação preenchida não alerta, qualquer que seja a data", () => {
    expect(
      alertaSemCapacitacao(
        { dataInicioDocenciaCiaara: "2010-01-01", capacitacao: converterCapacitacao("C-Exp-TE") },
        HOJE,
      ),
    ).toBeNull();
  });

  it('"mais de um ano" é estrito: exatamente um ano não alerta, um ano e um dia alerta', () => {
    const dados = {
      dataInicioDocenciaCiaara: "2025-09-16",
      capacitacao: converterCapacitacao(null),
    };
    expect(alertaSemCapacitacao(dados, "2026-09-16")).toBeNull();
    expect(alertaSemCapacitacao(dados, "2026-09-17")).not.toBeNull();
  });
});

describe("`FR-018` · o resultado é só aviso", () => {
  it("nenhum campo do alerta pode ser usado para bloquear", () => {
    const alerta = alertaSemCapacitacao(
      { dataInicioDocenciaCiaara: "2020-01-01", capacitacao: converterCapacitacao(null) },
      "2026-09-16",
    );
    expect(Object.keys(alerta ?? {}).sort()).toEqual(["chave", "detalhes", "titulo"]);
  });
});

describe("spec 020 (C-12) · o texto a corrigir conta como capacitação — o veredito não muda com a conversão", () => {
  const HOJE = "2026-09-16";

  it("quem só tem texto que não casou com a lista NÃO é alertado (tinha texto antes)", () => {
    expect(
      alertaSemCapacitacao(
        { dataInicioDocenciaCiaara: "2010-01-01", capacitacao: converterCapacitacao("Pedagogia") },
        HOJE,
      ),
    ).toBeNull();
  });

  it("e quem tem a lista marcada também não", () => {
    expect(
      alertaSemCapacitacao(
        {
          dataInicioDocenciaCiaara: "2010-01-01",
          capacitacao: { lista: ["C-Esp-DID"], aCorrigir: null },
        },
        HOJE,
      ),
    ).toBeNull();
  });
});
