/**
 * Bloco 16 (spec 031) — o que muda no papel do DSA: o campo ALT (FR-007, RP-1) e o texto do Apoio (FR-005).
 */
import { describe, expect, it } from "vitest";

import { conteudoComparavel, documentosIguais, rotuloDoAlt } from "@/lib/dominio/dsa/publicacao";
import { ROTULO_DO_APOIO, conteudoDaAtividade } from "@/lib/dominio/dsa/rotulos";
import { MOTIVO_DO_APOIO_NO_MESMO_TEMPO } from "@/lib/dominio/dsa/grade";

describe("FR-007 · o campo ALT do papel", () => {
  it("a primeira versão publicada diz ORIGINAL", () => {
    expect(rotuloDoAlt(0)).toBe("ORIGINAL");
  });

  it("a alteração N diz ALT N", () => {
    expect(rotuloDoAlt(1)).toBe("ALT 1");
    expect(rotuloDoAlt(2)).toBe("ALT 2");
  });

  it("a prévia (sem versão) diz PRÉVIA", () => {
    expect(rotuloDoAlt(null)).toBe("PRÉVIA");
  });
});

describe("FR-005 · o Apoio Individualizado sem o sufixo", () => {
  it("o texto é só «Apoio Individualizado»", () => {
    expect(ROTULO_DO_APOIO).toBe("Apoio Individualizado");
    expect(
      conteudoDaAtividade({ descricao: "Monitoria", categoria: "Apoio_Individualizado" }),
    ).toBe("Apoio Individualizado: Monitoria");
    expect(MOTIVO_DO_APOIO_NO_MESMO_TEMPO).not.toContain("alunos específicos");
  });

  it("o RP-4 lê o retrato publicado com o texto antigo como o de hoje (D-6)", () => {
    const papel = (conteudo: string) => ({
      curso: "C",
      semana: 1,
      semanaDoCurso: "1 de 10",
      primeiro: "2026-10-26",
      ultimo: "2026-10-30",
      alunos: 10,
      assinaturas: [],
      dias: [{ data: "2026-10-26", linhas: [{ chave: "f1", conteudo }] }],
    });
    const publicado = papel("Apoio Individualizado — alunos específicos: Monitoria");
    const hoje = papel("Apoio Individualizado: Monitoria");
    expect(documentosIguais(conteudoComparavel(publicado), conteudoComparavel(hoje))).toBe(true);
    /* O controle: mudar o que se escreveu continua acusando. */
    expect(
      documentosIguais(
        conteudoComparavel(publicado),
        conteudoComparavel(papel("Apoio Individualizado: Outra coisa")),
      ),
    ).toBe(false);
  });
});
