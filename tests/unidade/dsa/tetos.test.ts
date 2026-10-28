/**
 * `RN-DIST-03` · `RF-HOR-03.1` · `RN-DEG-02` — os tetos semanais e os alertas do lançamento.
 *
 * ⚠️ **O NÚMERO ESPERADO NÃO FOI INVENTADO AQUI: é o de `config_parametros`** como o `data-model.md`
 * §3.9 da spec 013 o declara — `dsa.teto_recomendado_semana` = **25** (`RN-DIST-03` (c)).
 *
 * ⚠️ **A `RN-DIST-03` (a) FOI EMENDADA EM 27/10/2026** (decisão nominal, D-2 da spec 029): o TFM deixou
 * de ter teto rígido e passou a ser disciplina comum da (c) — de 7 a 25 TA não sai nada, e acima de 25
 * sai o MESMO alerta do recomendado que qualquer disciplina recebe. O parâmetro `dsa.teto_tfm_semana`
 * (= 6) **continua no banco, como dado inerte** (D-3), e por isso há um caso que o carrega junto e
 * exige que ele não valha: é o que discrimina (DoD 8).
 *
 * ⚠️ **E O NÚMERO ENTRA POR PARÂMETRO EM TODO CASO, nunca por import do módulo sob teste.** Há um caso
 * que **troca o recomendado** e exige o veredito virar (DoD 8): sem ele, um `25` literal escondido no
 * módulo passaria por toda esta suíte sem ser notado, porque todos os outros casos usam justamente o
 * valor real.
 */

import { describe, expect, it } from "vitest";

import {
  avaliarAUnidade,
  avaliarODia,
  avaliarTetosDaSemana,
  semTetoAlgum,
  type TetosDoDsa,
} from "@/lib/dominio/dsa/tetos";

/** Os valores de `config_parametros` (spec 013, `data-model.md` §3.9, emendado pela spec 029). */
const TETOS: TetosDoDsa = { recomendadoSemana: 25 };

/**
 * Os tetos COM o parâmetro antigo do TFM junto — `dsa.teto_tfm_semana` = 6, que fica no banco como dado
 * inerte (D-3 da spec 029).
 *
 * ⚠️ **SEM ESTE OBJETO, O CASO DE 7 TA PASSARIA NA `main` PELO MOTIVO ERRADO:** com `TETOS` sem o campo, o
 *    ramo antigo do TFM compara `7 > undefined`, que é falso, e devolve vazio sem a regra ter saído do
 *    módulo. Carregando o 6 junto, o ramo antigo bloqueia, e o caso só fica verde quando o ramo deixa de
 *    existir — inclusive se alguém voltar a ler a chave inerte e a repassar adiante.
 */
const COM_O_PARAMETRO_INERTE = { ...TETOS, tfmSemana: 6 };

describe("`RN-DIST-03` (a) emendada em 27/10/2026 · o TFM NÃO TEM mais teto rígido (D-2 da spec 029)", () => {
  it("o caso que DISCRIMINA: TFM com 7 TA na semana não bloqueia nem alerta", () => {
    for (const tetos of [TETOS, COM_O_PARAMETRO_INERTE]) {
      const veredito = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 7 }], tetos);

      expect(veredito.bloqueios).toEqual([]);
      expect(veredito.alertas).toEqual([]);
    }
  });

  it("«Treinamento Físico Militar», «tfm» e sem acento: 7 TA também não bloqueiam nem alertam", () => {
    for (const nome of [
      "Treinamento Físico Militar",
      "tfm",
      "TREINAMENTO FISICO MILITAR",
      "Treinamento  Físico  Militar",
      "TFM do percurso",
    ]) {
      const veredito = avaliarTetosDaSemana([{ nome, taNaSemana: 7 }], COM_O_PARAMETRO_INERTE);

      expect(veredito.bloqueios, nome).toEqual([]);
      expect(veredito.alertas, nome).toEqual([]);
    }
  });

  it("TFM com 25 TA não devolve nada — o recomendado é inclusivo, como para qualquer disciplina", () => {
    const veredito = avaliarTetosDaSemana(
      [{ nome: "Treinamento Físico Militar", taNaSemana: 25 }],
      COM_O_PARAMETRO_INERTE,
    );

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toEqual([]);
  });

  it("TFM com 26 TA dá SÓ o alerta do recomendado (25) — o MESMO de qualquer disciplina", () => {
    for (const tetos of [TETOS, COM_O_PARAMETRO_INERTE]) {
      const tfm = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 26 }], tetos);
      const comum = avaliarTetosDaSemana(
        [{ nome: "Navegação Astronômica", taNaSemana: 26 }],
        tetos,
      );

      expect(tfm.bloqueios).toEqual([]);
      expect(tfm.alertas).toHaveLength(1);
      expect(tfm.alertas[0]).toContain("26 TA");
      expect(tfm.alertas[0]).toContain("o recomendado é 25");
      expect(tfm.alertas[0]).not.toContain("teto de TFM");
      // A mesma frase, trocado só o nome: o TFM não tem aviso próprio.
      expect(tfm.alertas[0]?.replace("«TFM»", "«X»")).toBe(
        comum.alertas[0]?.replace("«Navegação Astronômica»", "«X»"),
      );
    }
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

  it("PRECEDÊNCIA: nome com «TFM» **e** de fim de curso continua sem teto algum — nem o recomendado", () => {
    const nome = "Avaliação Final de Fim de Curso (TFM)";
    expect(semTetoAlgum(nome)).toBe(true);

    const veredito = avaliarTetosDaSemana([{ nome, taNaSemana: 40 }], COM_O_PARAMETRO_INERTE);

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

  it("a semana inteira sai de uma vez: o TFM e outra disciplina acima de 25 alertam, e nada bloqueia", () => {
    const veredito = avaliarTetosDaSemana(
      [
        { nome: "TFM", taNaSemana: 30 },
        { nome: "Navegação Astronômica", taNaSemana: 30 },
        { nome: "LHFC", taNaSemana: 40 },
        { nome: "Meteorologia", taNaSemana: 12 },
      ],
      TETOS,
    );

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(2);
    expect(veredito.alertas.filter((a) => a.startsWith("«TFM»"))).toHaveLength(1);
  });
});

describe("`RNF-NORM-08` · o caso que DISCRIMINA — o teto vem do parâmetro, não do código", () => {
  it("com `recomendadoSemana` = 10, o TFM de 11 TA passa a alertar — o número dele é o do recomendado", () => {
    const outros: TetosDoDsa = { recomendadoSemana: 10 };
    const veredito = avaliarTetosDaSemana([{ nome: "TFM", taNaSemana: 11 }], outros);

    expect(veredito.bloqueios).toEqual([]);
    expect(veredito.alertas).toHaveLength(1);
    expect(veredito.alertas[0]).toContain("o recomendado é 10");
  });

  it("com `recomendadoSemana` = 10, a disciplina de 11 TA passa a alertar", () => {
    const outros: TetosDoDsa = { recomendadoSemana: 10 };
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

describe("`RN-DEG-02` · NENHUM teto bloqueia — nem o do TFM, desde a emenda de 27/10/2026", () => {
  it("TFM, disciplina comum, LHFC, dia estourado, TA excepcional e UE passada: zero bloqueios", () => {
    const naSemana = avaliarTetosDaSemana(
      [
        { nome: "TFM", taNaSemana: 99 },
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

    // E os alertas continuam saindo: calar não é a forma de não bloquear. O TFM alerta como as comuns.
    expect(naSemana.alertas).toHaveLength(3);
    expect(noDia.alertas).toHaveLength(2);
    expect(naUnidade.alertas).toHaveLength(1);
  });

  it("`avaliarTetosDaSemana` NÃO TEM caminho que devolva bloqueio — com ou sem o parâmetro inerte", () => {
    const nomes = [
      "TFM",
      "Treinamento Físico Militar",
      "LHFC",
      "Avaliação Final de Fim de Curso (TFM)",
      "Navegação Astronômica",
    ];
    for (const tetos of [TETOS, COM_O_PARAMETRO_INERTE, { recomendadoSemana: 0 }]) {
      for (const nome of nomes) {
        for (const taNaSemana of [0, 1, 6, 7, 8, 12, 25, 26, 99]) {
          const veredito = avaliarTetosDaSemana([{ nome, taNaSemana }], tetos);
          expect(veredito.bloqueios, `${nome} com ${taNaSemana} TA`).toEqual([]);
        }
      }
    }
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
