/**
 * `conteudoDaAtividade` — a marca do Apoio Individualizado e do TR bloqueante (spec 014, FR-019, FR-027).
 */
import { describe, expect, it } from "vitest";

import {
  conteudoDaAtividade,
  ROTULO_DO_APOIO,
  ROTULO_DO_TR_BLOQUEANTE,
} from "@/lib/dominio/dsa/rotulos";

describe("FR-019 · a marca do Apoio", () => {
  it("o Apoio sai marcado com «alunos específicos»", () => {
    expect(
      conteudoDaAtividade({
        descricao: "Monitoria de cálculo",
        categoria: "Apoio_Individualizado",
      }),
    ).toBe(`${ROTULO_DO_APOIO}: Monitoria de cálculo`);
    expect(ROTULO_DO_APOIO).toBe("Apoio Individualizado — alunos específicos");
  });

  it("sem descrição, só a marca", () => {
    expect(conteudoDaAtividade({ descricao: "  ", categoria: "Apoio_Individualizado" })).toBe(
      ROTULO_DO_APOIO,
    );
  });

  it("o TR que bloqueia aula sai marcado como TR e bloqueio", () => {
    expect(
      conteudoDaAtividade({ descricao: "LA não prevista", categoria: "TR", bloqueiaAula: true }),
    ).toBe(`${ROTULO_DO_TR_BLOQUEANTE}: LA não prevista`);
  });

  it("controle: TAD, AEC e TR comum saem com a descrição, sem marca", () => {
    expect(conteudoDaAtividade({ descricao: "Palestra", categoria: "AEC" })).toBe("Palestra");
    expect(conteudoDaAtividade({ descricao: "TR", categoria: "TR", bloqueiaAula: false })).toBe(
      "TR",
    );
    expect(conteudoDaAtividade({ descricao: null, categoria: "TAD" })).toBeNull();
  });
});
