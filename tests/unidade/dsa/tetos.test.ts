/**
 * `RN-DIST-03` · `RF-HOR-03.1` · `RN-DEG-02` — os tetos semanais e os alertas do lançamento.
 *
 * ⚠️ **OS DOIS NÚMEROS ESPERADOS NÃO FORAM INVENTADOS AQUI: são os de `config_parametros`** como o
 * `data-model.md` §3.9 da spec 013 os declara — `dsa.teto_tfm_semana` = **6** (`RN-DIST-03` (a)) e
 * `dsa.teto_recomendado_semana` = **25** (`RN-DIST-03` (c)).
 *
 * ⚠️ **E ELES ENTRAM POR PARÂMETRO EM TODO CASO, nunca por import do módulo sob teste.** Há um caso
 * que **troca os dois** e exige o veredito virar (DoD 8): sem ele, um `6` literal escondido no
 * módulo passaria por toda esta suíte sem ser notado, porque todos os outros casos usam justamente
 * os valores reais.
 */

import { describe, expect, it } from "vitest";

import {
  avaliarAUnidade,
  avaliarODia,
  avaliarTetosDaSemana,
  ehTfm,
  semTetoAlgum,
  type TetosDoDsa,
} from "@/lib/dominio/dsa/tetos";

/** Os valores de `config_parametros` (spec 013, `data-model.md` §3.9). */
const TETOS: TetosDoDsa = { tfmSemana: 6, recomendadoSemana: 25 };

describe("`RN-DIST-03` (a) · TFM tem teto RÍGIDO, e é o único TETO que bloqueia", () => {
  it("TFM com 7 TA na semana BLOQUEIA", () => {
    const veredito = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 7 }], TETOS);

    expect(veredito.bloqueios).toHaveLength(1);
    expect(veredito.bloqueios[0]).toContain("7 TA");
    expect(veredito.bloqueios[0]).toContain("o teto de TFM é 6");
  });

  it("TFM com exatamente 6 TA não bloqueia nem alerta — o teto é inclusivo", () => {
    const veredito = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 6 }], TETOS);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("TFM acima do teto sai SÓ como bloqueio, sem o alerta do recomendado junto", () => {
    // 26 passa dos dois tetos ao mesmo tempo: o rígido de 6 e o recomendado de 25.
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Treinamento Físico Militar", taNaSemana: 26 }],
      TETOS,
    );

    expect(veredito.bloqueios).toHaveLength(1);
    expect(veredito.alertas).toEqual([]);
  });
});

describe("`RN-DIST-03` (a) · o nome do TFM é reconhecido como as pessoas o escrevem", () => {
  it("«tfm» minúsculo e «Treinamento Físico Militar» com acento são os dois reconhecidos", () => {
    expect(ehTfm("tfm")).toBe(true);
    expect(ehTfm("Treinamento Físico Militar")).toBe(true);
    expect(ehTfm("TREINAMENTO FISICO MILITAR")).toBe(true);
    expect(ehTfm("Treinamento  Físico  Militar")).toBe(true);
  });

  it("os dois bloqueiam com 7 TA, exatamente como «TFM» em maiúscula", () => {
    const minusculo = avaliarTetosDaSemana([{ nome: "tfm", taNaSemana: 7 }], TETOS);
    const acentuado = avaliarTetosDaSemana(
      [{ nome: "Treinamento Físico Militar", taNaSemana: 7 }],
      TETOS,
    );

    expect(minusculo.bloqueios).toHaveLength(1);
    expect(acentuado.bloqueios).toHaveLength(1);
  });

  it("CONTROLE NEGATIVO: disciplina que não é TFM não é reconhecida como tal", () => {
    expect(ehTfm("Navegação Astronômica")).toBe(false);
    expect(ehTfm("Treinamento de Praça d'Armas")).toBe(false);
    expect(ehTfm("Física Aplicada")).toBe(false);
  });
});

describe("`RN-DIST-03` (b) · fim de curso NÃO TEM TETO ALGUM, nem recomendado", () => {
  it("«LHFC» com 40 TA não devolve nada — nem bloqueio, nem alerta", () => {
    const veredito = avaliarTetosDaSemana([{ nome: "LHFC", taNaSemana: 40 }], TETOS);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("«Laboratório de Fim de Curso» com 40 TA também não — casa pelo segundo marcador", () => {
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Laboratório de Fim de Curso", taNaSemana: 40 }],
      TETOS,
    );

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
    expect(semTetoAlgum("Laboratório de Fim de Curso")).toBe(true);
    expect(semTetoAlgum("LHFC")).toBe(true);
  });

  it("PRECEDÊNCIA: nome que é TFM **e** de fim de curso nunca bloqueia", () => {
    const nome = "Avaliação Final de Fim de Curso (TFM)";
    expect(ehTfm(nome)).toBe(true);
    expect(semTetoAlgum(nome)).toBe(true);

    const veredito = avaliarTetosDaSemana([{ nome, taNaSemana: 40 }], TETOS);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("CONTROLE NEGATIVO: disciplina comum não é de fim de curso", () => {
    expect(semTetoAlgum("Navegação Astronômica")).toBe(false);
    expect(semTetoAlgum("Fim de Semana Operativo")).toBe(false);
  });
});

describe("`RN-DIST-03` (c) · as demais têm teto de 25 apenas RECOMENDADO", () => {
  it("outra disciplina com 26 TA ALERTA, e não bloqueia", () => {
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Navegação Astronômica", taNaSemana: 26 }],
      TETOS,
    );

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("26 TA");
    expect(veredito.alertas[0]).toContain("o recomendado é 25");
  });

  it("com exatamente 25 TA não devolve nada — o teto é inclusivo", () => {
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Navegação Astronômica", taNaSemana: 25 }],
      TETOS,
    );

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("a semana inteira sai de uma vez: um bloqueio de TFM e um alerta de outra disciplina", () => {
    const veredito = avaliarTetosDaSemana(
      [
        { nome: "TFM", taNaSemana: 8 },
        { nome: "Navegação Astronômica", taNaSemana: 30 },
        { nome: "LHFC", taNaSemana: 40 },
        { nome: "Meteorologia", taNaSemana: 12 },
      ],
      TETOS,
    );

    expect(veredito.bloqueios).toHaveLength(1);
    expect(veredito.alertas).toHaveLength(1);
  });
});

describe("`RNF-NORM-08` · o caso que DISCRIMINA — os tetos vêm do parâmetro, não do código", () => {
  it("com `tfmSemana` = 8, o TFM de 7 TA deixa de bloquear", () => {
    const outros: TetosDoDsa = { tfmSemana: 8, recomendadoSemana: 25 };
    const veredito = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 7 }], outros);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("com `recomendadoSemana` = 10, a disciplina de 11 TA passa a alertar", () => {
    const outros: TetosDoDsa = { tfmSemana: 6, recomendadoSemana: 10 };
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Navegação Astronômica", taNaSemana: 11 }],
      outros,
    );

    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("o recomendado é 10");
  });
});

describe("`RF-HOR-03.1` · o dia: TA além do regime e o TA excepcional são ALERTA", () => {
  it("dia com TA acima dos do regime ALERTA, e nomeia os dois números", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 9,
      temposDoRegime: 8,
      usouExcepcional: false,
    });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("9 TA");
    expect(veredito.alertas[0]).toContain("o regime prevê 8");
  });

  it("`usouExcepcional` ALERTA — o 9º TA é recurso, nunca impedimento", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 4,
      temposDoRegime: 8,
      usouExcepcional: true,
    });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("excepcional");
  });

  it("os dois juntos dão DOIS alertas e nenhum bloqueio", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 9,
      temposDoRegime: 8,
      usouExcepcional: true,
    });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(2);
  });

  it("CONTROLE NEGATIVO: dia dentro do regime e sem excepcional não devolve nada", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 8,
      temposDoRegime: 8,
      usouExcepcional: false,
    });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });
});

describe("`RN-DEG-01` · DEGRADAÇÃO: o que falta é `null`, e `null` CALA — nunca zero", () => {
  it("sem regime (`temposDoRegime: null`), nenhum lançamento é acusado de passar do regime", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 12,
      temposDoRegime: null,
      usouExcepcional: false,
    });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("sem regime, o alerta do TA excepcional continua saindo — as duas causas são independentes", () => {
    const veredito = avaliarODia({
      taLancadosNoDia: 12,
      temposDoRegime: null,
      usouExcepcional: true,
    });

    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("excepcional");
  });

  it("UE sem carga prevista (`null`) não «passa» nunca — o caso dos currículos por competências", () => {
    const veredito = avaliarAUnidade({ chPrevista: null, chLancada: 40 });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("semana sem disciplina nenhuma devolve NEUTRO, não aviso", () => {
    const veredito = avaliarTetosDaSemana([], TETOS);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });
});

describe("`RN-DIST-03` · o «PASSOU» da unidade de ensino é ALERTA", () => {
  it("UE com 11 lançados contra 10 previstos ALERTA", () => {
    const veredito = avaliarAUnidade({ chPrevista: 10, chLancada: 11 });

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("11 lançada contra 10 prevista");
  });

  it("CONTROLE NEGATIVO: exatamente a carga prevista não alerta", () => {
    expect(avaliarAUnidade({ chPrevista: 10, chLancada: 10 }).alertas).toEqual([]);
    expect(avaliarAUnidade({ chPrevista: 10, chLancada: 4 }).alertas).toEqual([]);
    expect(avaliarAUnidade({ chPrevista: 10, chLancada: 0 }).alertas).toEqual([]);
  });
});

describe("`RN-DEG-02` · NENHUM bloqueio existe fora do TFM", () => {
  it("disciplina comum, LHFC, dia estourado, TA excepcional e UE passada: zero bloqueios", () => {
    const naSemana = avaliarTetosDaSemana(
      [
        { nome: "Navegação Astronômica", taNaSemana: 99 },
        { nome: "LHFC", taNaSemana: 99 },
        { nome: "Laboratório de Fim de Curso", taNaSemana: 99 },
        { nome: "Meteorologia", taNaSemana: 99 },
      ],
      TETOS,
    );
    const noDia = avaliarODia({
      taLancadosNoDia: 12,
      temposDoRegime: 4,
      usouExcepcional: true,
    });
    const naUnidade = avaliarAUnidade({ chPrevista: 1, chLancada: 99 });

    expect(naSemana.bloqueios).toEqual([]);
    expect(noDia.bloqueios).toEqual([]);
    expect(naUnidade.bloqueios).toEqual([]);

    // E os alertas continuam saindo: calar não é a forma de não bloquear.
    expect(naSemana.alertas).toHaveLength(2);
    expect(noDia.alertas).toHaveLength(2);
    expect(naUnidade.alertas).toHaveLength(1);
  });

  it("`avaliarODia` e `avaliarAUnidade` NÃO TÊM caminho que devolva bloqueio", () => {
    const combinacoes = [
      avaliarODia({ taLancadosNoDia: 0, temposDoRegime: 0, usouExcepcional: false }),
      avaliarODia({ taLancadosNoDia: 1, temposDoRegime: 0, usouExcepcional: true }),
      avaliarODia({ taLancadosNoDia: 99, temposDoRegime: null, usouExcepcional: true }),
      avaliarAUnidade({ chPrevista: 0, chLancada: 99 }),
      avaliarAUnidade({ chPrevista: null, chLancada: 0 }),
    ];

    for (const veredito of combinacoes) {
      expect(veredito.bloqueios).toEqual([]);
    }
  });
});
