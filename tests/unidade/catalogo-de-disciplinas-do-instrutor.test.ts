/**
 * O catálogo de disciplinas da ficha e do cadastro do instrutor com dois currículos — spec 021, Bloco 6, RC-12.
 *
 * ⚠️ COM UM CURRÍCULO SÓ, NADA MUDA: a sigla é a do curso, como sempre — é o que mantém as telas de hoje idênticas.
 * ⚠️ COM DOIS, a mesma disciplina aparece duas vezes (uma por currículo), e sem o currículo no rótulo a pessoa
 *    habilitaria o instrutor no currículo errado sem ter como saber.
 */
import { describe, expect, it } from "vitest";

import { comSigla } from "@/app/(app)/instrutores/catalogo";

const CAHO = { id: "c1", codigo: "CAHO", status: "ativo" };
const C1 = { id: "k1", curso_id: "c1", versao: 1, vigente_de: "2026-01-01" };
const C2 = { id: "k2", curso_id: "c1", versao: 2, vigente_de: "2027-01-01" };
const disciplina = (id: string, curriculo: string) => ({
  id,
  nome_disciplina: "Hidrografia",
  curso_id: "c1",
  curriculo_id: curriculo,
  status: "ativo",
});

describe("RC-12 · o currículo no rótulo da disciplina do instrutor", () => {
  it("com um currículo só, a sigla é a do curso — como antes", () => {
    const [d] = comSigla([disciplina("d1", "k1")], [CAHO], [C1]);
    expect(d?.sigla).toBe("CAHO");
  });

  it("sem a lista de currículos, a sigla é a do curso (quem não a passa não muda)", () => {
    const [d] = comSigla([disciplina("d1", "k1")], [CAHO]);
    expect(d?.sigla).toBe("CAHO");
  });

  it("com dois currículos, cada disciplina diz de qual é — «Currículo N», com o ano da vigência", () => {
    const lista = comSigla([disciplina("d1", "k1"), disciplina("d2", "k2")], [CAHO], [C1, C2]);
    expect(lista.map((d) => d.sigla)).toEqual([
      "CAHO · Currículo 1 (vigência 2026)",
      "CAHO · Currículo 2 (vigência 2027)",
    ]);
  });
});
