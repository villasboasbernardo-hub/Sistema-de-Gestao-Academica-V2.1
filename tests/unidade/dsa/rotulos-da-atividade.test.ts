/**
 * `conteudoDaAtividade` — a marca do Apoio Individualizado e do TR bloqueante (spec 014, FR-019, FR-027).
 */
import { describe, expect, it } from "vitest";

import {
  conteudoDaAtividade,
  ROTULO_DO_APOIO,
  ROTULO_DO_TR_BLOQUEANTE,
  tituloDoLancamento,
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

/*
 * ⚠️ **D-6 da spec 029 (Bloco 14, item 2) · O TÍTULO DO EI SEM «O QUE É» NA TELA** *(decisão de Bernardo Villas Boas,
 *    27/10/2026)*: o cartão de edição e a faixa *"Sem posição"* caíam no genérico *"Lançamento"* — atividade não tem
 *    disciplina, e o EI do FR-002 pode não ter descrição. O caso que vira é o EI sem descrição; os outros são controle
 *    de que o título de sempre não mudou.
 */
describe("spec 029, D-6 · `tituloDoLancamento`", () => {
  const ei = {
    origem: "atividade_nao_letiva",
    disciplina: null,
    conteudo: null,
    tecnica: "Estudo Individual",
  };

  it("⚠️ a atividade sem descrição se nomeia pelo subtipo, e não «Lançamento»", () => {
    expect(tituloDoLancamento(ei)).toBe("Estudo Individual");
  });

  it("controle: com descrição, a descrição; na aula, disciplina — conteúdo", () => {
    expect(tituloDoLancamento({ ...ei, conteudo: "Leitura dirigida" })).toBe("Leitura dirigida");
    expect(
      tituloDoLancamento({
        origem: "aula",
        disciplina: "NAV-I",
        conteudo: "Cartas náuticas",
        tecnica: "Expositiva",
      }),
    ).toBe("NAV-I — Cartas náuticas");
  });

  it("controle: «Lançamento» só sobra para quem não tem nada a dizer — e a técnica da aula não é título", () => {
    expect(tituloDoLancamento({ ...ei, tecnica: "  " })).toBe("Lançamento");
    expect(
      tituloDoLancamento({
        origem: "aula",
        disciplina: null,
        conteudo: null,
        tecnica: "Expositiva",
      }),
    ).toBe("Lançamento");
  });
});
