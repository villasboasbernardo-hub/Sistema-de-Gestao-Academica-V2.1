/**
 * `lib/dominio/dsa/publicacao.ts` — a situação da semana do DSA e o que se pode fazer nela (spec 024, RP-0 a RP-4; spec 029,
 * RP-9: *Salvar alteração*).
 */
import { describe, expect, it } from "vitest";

import {
  conteudoComparavel,
  documentosIguais,
  rotuloDoAlt,
  situacaoDaSemana,
  type EventoDaSemana,
} from "@/lib/dominio/dsa/publicacao";

const ev = (
  tipo: EventoDaSemana["tipo"],
  ocorridoEm: string,
  numero: number | null = null,
): EventoDaSemana => ({
  tipo,
  ocorridoEm,
  numero,
  justificativa: tipo === "alteracao_publicada" ? "Troca de instrutor por missão" : null,
  autor: "Prova",
  hoje: "2026-10-20",
});

describe("situacaoDaSemana", () => {
  it("⚠️ D-18: sem evento e sem rascunho é REGISTRADO — o que existe nasce salvo (RP-8)", () => {
    const s = situacaoDaSemana([], 0, false);
    expect(s.situacao).toBe("registrado");
    expect(s.podeGerarPrevia).toBe(true);
    expect(s.podePublicar).toBe(true);
    expect(s.travada).toBe(false);
  });
  it("sem evento e COM rascunho: em preenchimento — salvar sim, prévia e publicar não", () => {
    const s = situacaoDaSemana([], 1, false);
    expect(s.situacao).toBe("em_preenchimento");
    expect(s.podeSalvar).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
    expect(s.podePublicar).toBe(false);
  });
  it("com rascunho: em preenchimento, e o descarte aparece", () => {
    const s = situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 2, false);
    expect(s.situacao).toBe("em_preenchimento");
    expect(s.rascunhos).toBe(2);
    expect(s.podeDescartar).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
  });
  it("salva e sem rascunho: registrado — prévia e publicar", () => {
    const s = situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 0, false);
    expect(s.situacao).toBe("registrado");
    expect(s.podeGerarPrevia).toBe(true);
    expect(s.podePublicar).toBe(true);
  });
  it("publicada: travada, só «Fazer alteração»; ALT da original em branco", () => {
    const s = situacaoDaSemana(
      [ev("salvo", "2026-10-20T10:00:00Z"), ev("publicado", "2026-10-20T11:00:00Z", 0)],
      0,
      false,
    );
    expect(s.situacao).toBe("publicado");
    expect(s.travada).toBe(true);
    expect(s.podeFazerAlteracao).toBe(true);
    expect(s.podeSalvar).toBe(false);
    expect(s.versaoVigente).toBe(0);
  });
  it("alteração iniciada: destrava, e publicar alteração (com justificativa) aparece", () => {
    const s = situacaoDaSemana(
      [
        ev("salvo", "2026-10-20T10:00:00Z"),
        ev("publicado", "2026-10-20T11:00:00Z", 0),
        ev("alteracao_iniciada", "2026-10-21T09:00:00Z"),
      ],
      1,
      false,
    );
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.travada).toBe(false);
    expect(s.podePublicarAlteracao).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
  });
  it("alteração publicada: ALT N, travada de novo, e o histórico em ordem", () => {
    const s = situacaoDaSemana(
      [
        ev("publicado", "2026-10-20T11:00:00Z", 0),
        ev("alteracao_iniciada", "2026-10-21T09:00:00Z"),
        ev("alteracao_publicada", "2026-10-21T10:00:00Z", 1),
      ],
      0,
      false,
    );
    expect(s.situacao).toBe("publicado");
    expect(s.versaoVigente).toBe(1);
    expect(s.historico.map((h) => h.numero)).toEqual([0, 1]);
  });
  it("RP-4: publicada e diferente do retrato — avisa, e só se publicada e travada", () => {
    expect(
      situacaoDaSemana([ev("publicado", "2026-10-20T11:00:00Z", 0)], 0, true)
        .alteradoDesdeAPublicacao,
    ).toBe(true);
    expect(
      situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 0, true).alteradoDesdeAPublicacao,
    ).toBe(false);
  });
});

/*
 * Spec 029 (Bloco 14), item 3 — RP-9: *Salvar alteração* registra a alteração sem publicá-la.
 *
 * ⚠️ **«SALVA» É O `salvo` DEPOIS DO ÚLTIMO `alteracao_iniciada`, SEM RASCUNHO NOVO** (D-8, D-24): a trilha não tem tipo
 *    próprio para o salvar da alteração — é o mesmo `salvo` do *Salvar minuta*, e quem o distingue é a POSIÇÃO. Um `salvo`
 *    de antes (da original ou de uma ALT anterior) não faz a alteração de agora estar salva.
 */
describe("situacaoDaSemana — Salvar alteração (RP-9, spec 029)", () => {
  const ORIGINAL = [
    ev("salvo", "2026-10-20T10:00:00Z"),
    ev("publicado", "2026-10-20T11:00:00Z", 0),
    ev("alteracao_iniciada", "2026-10-21T09:00:00Z"),
  ];

  it("publicado → alteração iniciada → salvo, sem rascunho: em alteração, SALVA, e o «Salvar alteração» fica", () => {
    const s = situacaoDaSemana([...ORIGINAL, ev("salvo", "2026-10-21T10:00:00Z")], 0, false);
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.alteracaoSalva).toBe(true);
    expect(s.houveSalvoNestaAlteracao).toBe(true);
    expect(s.podeSalvarAlteracao).toBe(true);
    /* O «Salvar minuta» continua sem aparecer na alteração: o botão é o outro. */
    expect(s.podeSalvar).toBe(false);
    expect(s.travada).toBe(false);
    expect(s.podePublicarAlteracao).toBe(true);
    /* O papel oficial continua o publicado: a versão vigente e o histórico não mudam com o salvar. */
    expect(s.versaoVigente).toBe(0);
    expect(s.historico.map((h) => h.numero)).toEqual([0]);
    expect(s.alteradoDesdeAPublicacao).toBe(false);
  });

  it("a ordem de entrada não importa: a mesma trilha, de trás para a frente, dá a mesma situação", () => {
    const s = situacaoDaSemana(
      [...ORIGINAL, ev("salvo", "2026-10-21T10:00:00Z")].reverse(),
      0,
      false,
    );
    expect(s.alteracaoSalva).toBe(true);
  });

  it("⚠️ O CASO QUE DISCRIMINA: o `salvo` de ANTES da publicação não faz a alteração de agora estar salva", () => {
    const s = situacaoDaSemana(ORIGINAL, 0, false);
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.alteracaoSalva).toBe(false);
    expect(s.houveSalvoNestaAlteracao).toBe(false);
    /* D-23: o botão aparece mesmo sem rascunho, sempre que a semana está em alteração. */
    expect(s.podeSalvarAlteracao).toBe(true);
  });

  it("⚠️ O CASO QUE DISCRIMINA: o `salvo` da ALT anterior não conta para a alteração que começou depois dela", () => {
    const s = situacaoDaSemana(
      [
        ...ORIGINAL,
        ev("salvo", "2026-10-21T10:00:00Z"),
        ev("alteracao_publicada", "2026-10-21T11:00:00Z", 1),
        ev("alteracao_iniciada", "2026-10-22T09:00:00Z"),
      ],
      0,
      false,
    );
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.versaoVigente).toBe(1);
    expect(s.alteracaoSalva).toBe(false);
    expect(s.houveSalvoNestaAlteracao).toBe(false);
    expect(s.podeSalvarAlteracao).toBe(true);
  });

  it("D-8: salvou, mas lançou de novo — com rascunho novo a alteração deixa de estar «salva»", () => {
    const s = situacaoDaSemana([...ORIGINAL, ev("salvo", "2026-10-21T10:00:00Z")], 1, false);
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.alteracaoSalva).toBe(false);
    /*
     * ⚠️ D-25, e O CASO QUE DISCRIMINA (achado 5 da revisão do Bloco 14): o selo perde o «· salva» (D-8), mas o que foi
     *    salvo nesta alteração CONTINUA contando na CH e fora do papel — a linha da D-25 lê este sinal, não o do selo.
     */
    expect(s.houveSalvoNestaAlteracao).toBe(true);
    expect(s.podeSalvarAlteracao).toBe(true);
    expect(s.podeDescartar).toBe(true);
  });

  it("D-29: descartar o rascunho novo volta ao último SALVO — a alteração continua «salva»", () => {
    const s = situacaoDaSemana(
      [
        ...ORIGINAL,
        ev("salvo", "2026-10-21T10:00:00Z"),
        ev("rascunho_descartado", "2026-10-21T10:30:00Z"),
      ],
      0,
      false,
    );
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.alteracaoSalva).toBe(true);
    expect(s.houveSalvoNestaAlteracao).toBe(true);
    expect(s.versaoVigente).toBe(0);
  });

  it("fora da alteração, nunca há «Salvar alteração» nem alteração salva", () => {
    const emPreenchimento = situacaoDaSemana([], 1, false);
    const registrado = situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 0, false);
    const publicado = situacaoDaSemana(ORIGINAL.slice(0, 2), 0, false);
    const altPublicada = situacaoDaSemana(
      [
        ...ORIGINAL,
        ev("salvo", "2026-10-21T10:00:00Z"),
        ev("alteracao_publicada", "2026-10-21T11:00:00Z", 1),
      ],
      0,
      false,
    );
    expect(emPreenchimento.situacao).toBe("em_preenchimento");
    expect(registrado.situacao).toBe("registrado");
    expect(publicado.situacao).toBe("publicado");
    expect(altPublicada.situacao).toBe("publicado");
    for (const s of [emPreenchimento, registrado, publicado, altPublicada]) {
      expect(s.podeSalvarAlteracao).toBe(false);
      expect(s.alteracaoSalva).toBe(false);
      expect(s.houveSalvoNestaAlteracao).toBe(false);
    }
  });
});

describe("rotuloDoAlt", () => {
  it("a original e a semana sem publicação saem em branco; a alteração, ALT N", () => {
    expect(rotuloDoAlt(null)).toBe("PRÉVIA");
    expect(rotuloDoAlt(0)).toBe("ORIGINAL");
    expect(rotuloDoAlt(2)).toBe("ALT 2");
  });
});

describe("documentosIguais", () => {
  it("compara pelo conteúdo, sem a ordem das chaves", () => {
    expect(documentosIguais({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(documentosIguais({ a: 1 }, { a: 2 })).toBe(false);
  });
});

/*
 * Bloco 15 (spec 030, `FR-004.4`, D-10): o retrato publicado com a linha FIXA do Estudo Individual (que o papel
 * desenhava sozinho até 29/10/2026) e o papel de hoje, sem ela, com o MESMO dado, são o mesmo papel — senão 4 originais
 * e 1 ALT do remoto passariam a acusar «alterado desde a publicação» sem ninguém ter mexido na semana.
 */
describe("conteudoComparavel — a linha fixa dos retratos antigos não conta (Bloco 15, D-10)", () => {
  const aula = {
    chave: "9f1c2d3e-0000-4000-8000-000000000001",
    conteudo: "Aula",
    estudoIndividual: false,
  };
  const fixa = { chave: "ei-2026-10-05", conteudo: "ESTUDO INDIVIDUAL", estudoIndividual: true };
  const base = {
    curso: "C-Ap-HN",
    semana: { ano: 2026, numero: 41 },
    semanaDoCurso: 30,
    primeiro: "2026-10-05",
    ultimo: "2026-10-10",
    alunos: 16,
    assinaturas: { esquerda: null, direita: null },
  };
  const retratoAntigo = {
    ...base,
    dias: [{ data: "2026-10-05", linhas: [aula, fixa] }],
    grade: { cartoes: ["aula", "fixa"] },
    legenda: [{ sigla: "EI" }, { sigla: "EO" }],
  };
  const papelDeHoje = {
    ...base,
    dias: [{ data: "2026-10-05", linhas: [aula] }],
    grade: { cartoes: ["aula"] },
    legenda: [{ sigla: "EO" }],
  };

  it("⚠️ o caso que discrimina: o retrato com a linha fixa e o papel de hoje sem ela são IGUAIS", () => {
    expect(documentosIguais(retratoAntigo, papelDeHoje)).toBe(false);
    expect(
      documentosIguais(conteudoComparavel(retratoAntigo), conteudoComparavel(papelDeHoje)),
    ).toBe(true);
  });

  it("controle: a aula que mudou continua acusando a alteração", () => {
    const mudou = {
      ...papelDeHoje,
      dias: [{ data: "2026-10-05", linhas: [{ ...aula, conteudo: "Outra" }] }],
    };
    expect(documentosIguais(conteudoComparavel(retratoAntigo), conteudoComparavel(mudou))).toBe(
      false,
    );
  });

  it("controle: o EI LANÇADO (chave do fato) conta — ele é dado, não a linha fixa", () => {
    const lancado = {
      chave: "9f1c2d3e-0000-4000-8000-000000000002",
      conteudo: "ESTUDO INDIVIDUAL",
      estudoIndividual: true,
    };
    const comEi = { ...papelDeHoje, dias: [{ data: "2026-10-05", linhas: [aula, lancado] }] };
    expect(documentosIguais(conteudoComparavel(papelDeHoje), conteudoComparavel(comEi))).toBe(
      false,
    );
  });
});
