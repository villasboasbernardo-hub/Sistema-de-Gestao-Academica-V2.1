/**
 * `RN-ANT-02`, `FR-003` da spec 006 — a escala de antiguidade chega de `config_listas`.
 *
 * ⚠️ A ESCALA É DADO ADMINISTRÁVEL, e esta função é a ponte entre as linhas que a consulta devolve e
 * o formato que `ordenarPorAntiguidade` recebe. Ela não conhece posto nenhum: se conhecesse, a regra
 * do Princípio VII seria violada exatamente no lugar que existe para respeitá-la.
 */
import { describe, expect, it } from "vitest";

import { escalaDeLinhas, type LinhaDaEscala } from "@/lib/dominio/antiguidade";

/** As 14 linhas que `config_listas.escala_antiguidade` tem hoje, medidas em 15/09/2026. */
const LINHAS: readonly LinhaDaEscala[] = [
  ["CMG", 1],
  ["CF", 2],
  ["CC", 3],
  ["CT", 4],
  ["1ºTen", 5],
  ["2ºTen", 6],
  ["SO", 7],
  ["1ºSG", 8],
  ["2ºSG", 9],
  ["3ºSG", 10],
  ["CB", 11],
  ["MN", 12],
  ["SC", 13],
  ["SCNS", 13],
].map(([valor, ordem]) => ({ valor: valor as string, ordem: ordem as number, ativo: true }));

describe("`FR-003` · a escala vem das linhas de config_listas", () => {
  it("14 linhas viram 14 pesos", () => {
    const escala = escalaDeLinhas(LINHAS);
    expect(Object.keys(escala)).toHaveLength(14);
    expect(escala.CMG).toBe(1);
    expect(escala.MN).toBe(12);
  });

  it("SC e SCNS empatam em 13 — civis depois de todo militar", () => {
    const escala = escalaDeLinhas(LINHAS);
    expect(escala.SC).toBe(13);
    expect(escala.SCNS).toBe(13);
  });

  it("linha inativa não entra na escala", () => {
    const escala = escalaDeLinhas([
      ...LINHAS,
      { valor: "CAPITAO-DESATIVADO", ordem: 4, ativo: false },
    ]);
    expect(escala).not.toHaveProperty("CAPITAO-DESATIVADO");
  });

  it("sem linha, escala vazia — e a ordenação manda todo mundo para o fim com aviso", () => {
    expect(escalaDeLinhas([])).toEqual({});
  });
});
