/**
 * A semana que o DSA abre, e o aviso que diz o que aconteceu (`RN-DEG-01`; conferência do PR #40,
 * 08/10/2026). Casos sintéticos, sem banco.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O PRIMEIRO** (DoD 8): `?semana=22&ano=2019`. Com a página antiga, a
 * tela abria a semana 22 do ano corrente e o aviso terminava em *"Abrimos a semana corrente"* — o
 * número certo e a frase errada. Ele reprova se a consequência voltar a ser colada a todo descarte.
 *
 * Hoje fixo: **08/10/2026**, quinta-feira da semana ISO **41** de 2026. O ano ISO de 2026 tem
 * **53** semanas (1º de janeiro numa quinta) e o de 2027, **52**.
 */
import { describe, expect, it } from "vitest";

import { CONTRATO } from "@/lib/navegacao/contrato";
import { semanaEscolhida, type FaixasDaSemana } from "@/lib/dominio/dsa/semana-escolhida";

const HOJE = "2026-10-08";
const FAIXAS: FaixasDaSemana = {
  semana: { minimo: 1, maximo: 53 },
  ano: { minimo: 2020, maximo: 2099 },
};

describe("semanaEscolhida", () => {
  it("⚠️ ano fora da faixa: troca o ANO, MANTÉM a semana — e o aviso diz exatamente isso", () => {
    /* O contrato descartou o ano: ele chega como o padrão `0`, e o descarte diz o que veio. */
    const escolha = semanaEscolhida({
      semana: 22,
      ano: 0,
      hoje: HOJE,
      descartes: [{ parametro: "ano", recebido: "2019" }],
      faixas: FAIXAS,
    });
    expect(escolha.ano).toBe(2026);
    expect(escolha.numero).toBe(22);
    expect(escolha.aviso).toBe(
      'O valor "2019" não serve para ano: ele vai de 2020 a 2099. ' +
        "Trocamos o ano pelo corrente, 2026, e mantivemos a semana 22.",
    );
    expect(escolha.aviso).not.toContain("semana corrente");
  });

  it("semana fora da faixa com ano válido: abre a semana corrente, e diz isso", () => {
    const escolha = semanaEscolhida({
      semana: 0,
      ano: 2026,
      hoje: HOJE,
      descartes: [{ parametro: "semana", recebido: "99" }],
      faixas: FAIXAS,
    });
    expect(escolha).toEqual({
      ano: 2026,
      numero: 41,
      aviso: 'O valor "99" não serve para semana: ela vai de 1 a 53. Abrimos a semana corrente.',
    });
  });

  it("ano fora da faixa e SEM semana: troca o ano e abre a semana corrente", () => {
    const escolha = semanaEscolhida({
      semana: 0,
      ano: 0,
      hoje: HOJE,
      descartes: [{ parametro: "ano", recebido: "1999" }],
      faixas: FAIXAS,
    });
    expect(escolha.numero).toBe(41);
    expect(escolha.aviso).toBe(
      'O valor "1999" não serve para ano: ele vai de 2020 a 2099. ' +
        "Trocamos o ano pelo corrente, 2026, e abrimos a semana corrente.",
    );
  });

  it("os dois descartados: os dois motivos, e a semana corrente", () => {
    const escolha = semanaEscolhida({
      semana: 0,
      ano: 0,
      hoje: HOJE,
      descartes: [
        { parametro: "semana", recebido: "abc" },
        { parametro: "ano", recebido: "2019" },
      ],
      faixas: FAIXAS,
    });
    expect(escolha.aviso).toBe(
      'O valor "abc" não serve para semana: ela vai de 1 a 53. ' +
        'O valor "2019" não serve para ano: ele vai de 2020 a 2099. ' +
        "Trocamos o ano pelo corrente, 2026, e abrimos a semana corrente.",
    );
  });

  it("semana que o ano não tem, em OUTRO ano: abre a semana 1 daquele ano, e nomeia", () => {
    const escolha = semanaEscolhida({ semana: 53, ano: 2027, hoje: HOJE });
    expect(escolha).toEqual({
      ano: 2027,
      numero: 1,
      aviso: "O ano ISO de 2027 tem 52 semanas; a 53 não existe. Abrimos a semana 1 de 2027.",
    });
  });

  it("semana que o ano não tem, no ano CORRENTE de 52: abre a corrente", () => {
    const escolha = semanaEscolhida({ semana: 53, ano: 2027, hoje: "2027-03-10" });
    expect(escolha.numero).toBe(10);
    expect(escolha.aviso).toBe(
      "O ano ISO de 2027 tem 52 semanas; a 53 não existe. Abrimos a semana corrente.",
    );
  });

  it("a semana 53 de 2026 EXISTE: sem aviso", () => {
    expect(semanaEscolhida({ semana: 53, ano: 2026, hoje: HOJE })).toEqual({
      ano: 2026,
      numero: 53,
      aviso: null,
    });
  });

  it("sem parâmetro: a semana corrente, sem aviso", () => {
    expect(semanaEscolhida({ semana: 0, ano: 0, hoje: HOJE })).toEqual({
      ano: 2026,
      numero: 41,
      aviso: null,
    });
  });

  it("descarte de outro parâmetro não vira aviso de semana", () => {
    const escolha = semanaEscolhida({
      semana: 15,
      ano: 2026,
      hoje: HOJE,
      descartes: [{ parametro: "sabado", recebido: "talvez" }],
      faixas: FAIXAS,
    });
    expect(escolha).toEqual({ ano: 2026, numero: 15, aviso: null });
  });

  it("sem as faixas, o motivo não inventa números", () => {
    const escolha = semanaEscolhida({
      semana: 22,
      ano: 0,
      hoje: HOJE,
      descartes: [{ parametro: "ano", recebido: "2019" }],
    });
    expect(escolha.aviso).toBe(
      'O valor "2019" não serve para ano. Trocamos o ano pelo corrente, 2026, e mantivemos a semana 22.',
    );
  });

  it("as faixas do teste são as do contrato da rota — sem segunda fonte do número", () => {
    const { semana, ano } = CONTRATO["/turmas/[turma]/dsa"].parametros;
    expect({ minimo: semana.minimo, maximo: semana.maximo }).toEqual(FAIXAS.semana);
    expect({ minimo: ano.minimo, maximo: ano.maximo }).toEqual(FAIXAS.ano);
  });
});
