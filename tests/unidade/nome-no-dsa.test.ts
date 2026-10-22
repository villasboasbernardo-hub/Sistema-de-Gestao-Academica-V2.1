/** O nome da disciplina no cartão do DSA (spec 017, FR-007; R-8): cadastrado vence, abreviação reproduzível. */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  abreviarNomeNoDsa,
  LIMITE_DO_NOME_NO_DSA,
  nomeNoCartao,
  nomeNoGrafico,
  recusaDoNomeNoDsa,
} from "@/lib/dominio/nome-no-dsa";

/*
 * Spec 022 (Bloco 7), item 8 — *"Gráficos de disciplinas: legenda com o NOME da disciplina, não o código; nome longo
 * usa o Nome no DSA (ou a abreviação automática do Bloco 2)."* (Bernardo Villas Boas, 22/10/2026)
 */
describe("nomeNoGrafico", () => {
  it("o nome que cabe vai inteiro — mesmo com Nome no DSA cadastrado", () => {
    expect(nomeNoGrafico({ nomeNoDsa: "NAV.", nome: "NAVEGAÇÃO" })).toBe("NAVEGAÇÃO");
  });
  it("o nome longo usa o Nome no DSA cadastrado", () => {
    expect(
      nomeNoGrafico({ nomeNoDsa: "AUX. NAVEGAÇÃO", nome: "AUXÍLIOS À NAVEGAÇÃO ELETRÔNICA" }),
    ).toBe("AUX. NAVEGAÇÃO");
  });
  it("o nome longo sem Nome no DSA usa a abreviação automática do Bloco 2", () => {
    const nome = "AUXÍLIOS À NAVEGAÇÃO ELETRÔNICA";
    expect(nomeNoGrafico({ nomeNoDsa: null, nome })).toBe(abreviarNomeNoDsa(nome));
    expect([...nomeNoGrafico({ nomeNoDsa: null, nome })].length).toBeLessThanOrEqual(
      LIMITE_DO_NOME_NO_DSA,
    );
  });
});

describe("nomeNoCartao", () => {
  it("o Nome no DSA cadastrado vence", () => {
    expect(nomeNoCartao({ nomeNoDsa: "AUX. NAVEGAÇÃO", nome: "AUXÍLIOS À NAVEGAÇÃO." })).toBe(
      "AUX. NAVEGAÇÃO",
    );
  });
  it("cadastrado em branco é ausente", () => {
    expect(nomeNoCartao({ nomeNoDsa: "   ", nome: "TFM." })).toBe("TFM.");
  });
});

describe("abreviarNomeNoDsa — a regra R-8 com L = 20, passo a passo", () => {
  const L = 20;
  it("(1) ⚠️ quem cabe fica COMO ESTÁ — mesmo com espaço duplo ou ponto final (C-25)", () => {
    expect(abreviarNomeNoDsa("PRÁTICA DE  CURSO.", L)).toBe("PRÁTICA DE  CURSO.");
  });
  it("(2) espaço colapsado e ponto final tirado no nome que não cabe", () => {
    expect(abreviarNomeNoDsa("NAVEGAÇÃO   COSTEIRA.", L)).toBe("NAVEGAÇÃO COSTEIRA");
  });
  it("(3) sem o sufixo depois de « / »", () => {
    expect(abreviarNomeNoDsa("HIDROGRAFIA / BATIMETRIA", L)).toBe("HIDROGRAFIA");
  });
  it("(4) sem as palavras de ligação, menos a primeira", () => {
    expect(abreviarNomeNoDsa("PROJETOS DE AUXÍLIOS", 18)).toBe("PROJETOS AUXÍLIOS");
    expect(abreviarNomeNoDsa("DE OLHO NA COSTA DO NORTE", L)).toBe("DE OLHO COSTA NORTE");
  });
  it("(5) abrevia as palavras de mais de 4 letras, da última para a primeira", () => {
    expect(abreviarNomeNoDsa("EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO.", L)).toBe("EQUI. AUXÍ. NAVE.");
  });
  it("(6) ainda não cabe → corta em L − 1 com reticências", () => {
    const r = abreviarNomeNoDsa("ADM ADM ADM ADM ADM ADM ADM", 10);
    expect(r).toBe("ADM ADM A…");
    expect([...r]).toHaveLength(10);
  });
  it("reproduzível: o mesmo nome dá o mesmo resultado duas vezes", () => {
    const nome = "EQUIPAMENTOS E SISTEMAS ELETRÔNICOS DE AUXÍLIOS À NAVEGAÇÃO.";
    expect(abreviarNomeNoDsa(nome)).toBe(abreviarNomeNoDsa(nome));
  });
});

describe("o catálogo real (SC-008)", () => {
  /*
   * ⚠️ **A FIXTURE NOMEADA** (regra 9.2): os 172 nomes das disciplinas ATIVAS, lidos em 19/10/2026 do banco local
   *    restaurado de `remoto-20261019-024230.sql`. A prova de que cabem no PAPEL é a de ponta a ponta
   *    (`dsa-cartao-do-papel.spec.ts`), que mede cada um no título do cartão.
   */
  const nomes = readFileSync("tests/unidade/dados/disciplinas-ativas-2026-10-19.txt", "utf8")
    .split("\n")
    .filter((l) => l !== "");

  it("são 172, e 172 de 172 saem dentro de L", () => {
    expect(nomes).toHaveLength(172);
    const fora = nomes.filter((n) => [...abreviarNomeNoDsa(n)].length > LIMITE_DO_NOME_NO_DSA);
    expect(fora).toEqual([]);
  });
});

describe("a recusa do cadastro", () => {
  it("diz o limite na frase", () => {
    expect(recusaDoNomeNoDsa(28)).toContain("28 caracteres");
  });
});
