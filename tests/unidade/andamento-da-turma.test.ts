/**
 * O andamento da turma — as fórmulas da v1.0, caso a caso (`RF-INI-01`, `RN-EVT-02`, `RN-MAT-04`).
 *
 * ⚠️ **CADA NÚMERO ESPERADO FOI CALCULADO ANTES DE SER ESCRITO, e a conta está no comentário**
 * (regra 9.3). Um esperado escrito por antecipação quase sempre acerta — e por isso a vez em que ele
 * erra passa despercebida.
 *
 * ⚠️ **AS DATAS SÃO FIXAS, E O DIA DA SEMANA DE CADA UMA ESTÁ CONFERIDO.** `2026-03-02` é uma
 * **segunda** (2026-01-01 é quinta; 60 dias depois, e 60 mod 7 = 4, quinta + 4 = segunda). Um teste de
 * dias úteis que use "hoje" de verdade muda de veredito conforme o dia em que roda — que é o defeito
 * que ele existiria para pegar.
 */
import { describe, expect, it } from "vitest";

import {
  andamentoDaTurma,
  capacidadeDiaria,
  diasUteisEntre,
  percentualExecutado,
  type RegimeDoCurso,
  type TurmaParaAndamento,
} from "@/lib/dominio/andamento-da-turma";

const SEGUNDA = "2026-03-02";

const PRESENCIAL_8: RegimeDoCurso = { regimePadraoTempos: 8, limiteDiarioEadHoras: null };

function turma(dados: Partial<TurmaParaAndamento> = {}): TurmaParaAndamento {
  return {
    status: "ativa",
    modalidade: "presencial",
    dataTermino: "2026-03-13",
    prevista: 100,
    executada: 40,
    ...dados,
  };
}

describe("`RF-INI-01` · o caminho feliz, calculado à mão", () => {
  it("U1 · 10 dias úteis a 8 TA/dia cobrem o que falta, com folga de 2 dias", () => {
    /*
     * CONTA: de segunda 02/03 a sexta 13/03 são duas semanas cheias → 5 + 5 = **10** dias úteis.
     *        capacidade = 10 × 8 = **80**; restante = 100 − 40 = **60**; saldo = 80 − 60 = **20**;
     *        saldoEmDias = floor(20 / 8) = **2**; percentual = round(40/100 × 100) = **40**.
     */
    const a = andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA);

    expect(a.diasUteis).toBe(10);
    expect(a.capacidade).toBe(80);
    expect(a.restante).toBe(60);
    expect(a.saldo).toBe(20);
    expect(a.saldoEmDias).toBe(2);
    expect(a.percentual).toBe(40);
    expect(a.situacaoDaCapacidade).toBe("calculada");
    expect(a.emAtraso).toBe(false);
  });
});

describe("⚠️ O CASO QUE DISCRIMINA · atraso é falta de CAPACIDADE, não excesso de execução", () => {
  it("U2 · com 5 dias úteis o que falta NÃO cabe, e a turma ativa é acusada", () => {
    /*
     * CONTA: de segunda 02/03 a sexta 06/03 → **5** dias úteis. capacidade = 5 × 8 = **40**;
     *        restante = **60**; saldo = 40 − 60 = **−20**; saldoEmDias = floor(−20/8) = floor(−2,5)
     *        = **−3** (para baixo também no negativo: faltam três dias, não dois).
     */
    const a = andamentoDaTurma(turma({ dataTermino: "2026-03-06" }), PRESENCIAL_8, [], SEGUNDA);

    expect(a.diasUteis).toBe(5);
    expect(a.capacidade).toBe(40);
    expect(a.saldo).toBe(-20);
    expect(a.saldoEmDias).toBe(-3);
    expect(a.emAtraso, "turma ativa sem capacidade para o que falta não foi acusada").toBe(true);
  });

  it("⚠️ U3 · turma que executou MAIS do que o previsto NÃO está em atraso", () => {
    /*
     * CONTA: prevista 10, executada 12 → restante = max(10 − 12, 0) = **0**, e não −2.
     *        de 02/03 a sexta 27/03 são quatro semanas → **20** dias úteis; capacidade = 160;
     *        saldo = 160 − 0 = **160**; percentual = round(12/10 × 100) = **120**.
     *
     * ⚠️ **ESTE É O VEREDITO QUE O INDICADOR ANTIGO DE `/inicio` DAVA ERRADO.** Lá, `restante` era
     *    `prevista − executada` **sem piso**, e `restante < 0` — que é EXCESSO — era chamado de
     *    "em atraso". O indicador acusava quem estava adiantado e nunca quem estava atrasado.
     */
    const a = andamentoDaTurma(
      turma({ prevista: 10, executada: 12, dataTermino: "2026-03-27" }),
      PRESENCIAL_8,
      [],
      SEGUNDA,
    );

    expect(a.restante, "o excesso virou restante negativo").toBe(0);
    expect(a.percentual).toBe(120);
    expect(a.saldo).toBe(160);
    expect(a.emAtraso, "excesso de execução foi tratado como atraso").toBe(false);
  });

  it("U4 · a MESMA turma do U2, concluída, não é acusada — `em andamento` é do requisito", () => {
    /*
     * ⚠️ Mesmo saldo (−20) e veredito oposto: o `RF-INI-01` fala de turma **em andamento**. Encher o
     *    painel de alertas sobre turmas que ninguém pode mais consertar ensina a ignorar a região de
     *    alertas inteira.
     */
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-03-06", status: "concluida" }),
      PRESENCIAL_8,
      [],
      SEGUNDA,
    );

    expect(a.saldo).toBe(-20);
    expect(a.emAtraso).toBe(false);
  });

  it("U12 · término já passado: zero capacidade, e a ativa é acusada", () => {
    /*
     * CONTA: término 27/02 é **antes** de hoje 02/03 → diasUteis = **0** (nunca negativo);
     *        capacidade = 0; restante = 30 − 0 = **30**; saldo = 0 − 30 = **−30**;
     *        saldoEmDias = floor(−30/8) = floor(−3,75) = **−4**.
     */
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-02-27", prevista: 30, executada: 0 }),
      PRESENCIAL_8,
      [],
      SEGUNDA,
    );

    expect(a.diasUteis).toBe(0);
    expect(a.capacidade).toBe(0);
    expect(a.saldo).toBe(-30);
    expect(a.saldoEmDias).toBe(-4);
    expect(a.emAtraso).toBe(true);
  });
});

describe("`RN-DEG-01` · o que falta é dito, nunca inventado", () => {
  it("U5 · sem data de término não há saldo, e o resto continua", () => {
    const a = andamentoDaTurma(turma({ dataTermino: null }), PRESENCIAL_8, [], SEGUNDA);

    expect(a.situacaoDaCapacidade).toBe("sem_termino");
    expect(a.saldo).toBeNull();
    expect(a.diasUteis).toBeNull();
    expect(a.emAtraso).toBe(false);
    // ⚠️ E o que se mediu continua à vista: prevista, executada e percentual não dependem do saldo.
    expect(a.prevista).toBe(100);
    expect(a.executada).toBe(40);
    expect(a.percentual).toBe(40);
  });

  it("⚠️ U6 · modalidade sem o campo do regime é SEM DADO — não cai na outra coluna", () => {
    /*
     * ⚠️ **ESTE CASO MEDE A DECISÃO `D8`, E ELE REPROVA QUALQUER FALLBACK.** Uma escrita como
     *    `limiteDiarioEadHoras ?? regimePadraoTempos` passaria em todos os casos acima e **falharia
     *    aqui**: ela daria **8 TA/dia a uma turma EAD**, e o atraso falso apareceria em toda turma
     *    EAD de curso com regime presencial — que é o estado que a amostra de teste já tinha.
     */
    const presencialEmCursoEad = andamentoDaTurma(
      turma({ modalidade: "presencial" }),
      { regimePadraoTempos: 0, limiteDiarioEadHoras: 6 },
      [],
      SEGUNDA,
    );
    expect(presencialEmCursoEad.capacidadeDiaria).toBeNull();
    expect(presencialEmCursoEad.situacaoDaCapacidade).toBe("sem_regime");
    expect(presencialEmCursoEad.emAtraso).toBe(false);

    const eadEmCursoPresencial = andamentoDaTurma(
      turma({ modalidade: "ead" }),
      { regimePadraoTempos: 8, limiteDiarioEadHoras: null },
      [],
      SEGUNDA,
    );
    expect(eadEmCursoPresencial.capacidadeDiaria).toBeNull();
    expect(eadEmCursoPresencial.situacaoDaCapacidade).toBe("sem_regime");
  });

  it("U7 · turma EAD usa o limite diário em horas, a 1 TA por hora", () => {
    // CONTA: 10 dias úteis × 4 h = **40** de capacidade; restante 60 → saldo **−20**.
    const a = andamentoDaTurma(
      turma({ modalidade: "ead" }),
      { regimePadraoTempos: 0, limiteDiarioEadHoras: 4 },
      [],
      SEGUNDA,
    );

    expect(a.capacidadeDiaria).toBe(4);
    expect(a.capacidade).toBe(40);
    expect(a.saldo).toBe(-20);
  });

  it("⚠️ a precedência é declarada: faltando AS DUAS, vale a falta de término", () => {
    // O campo mais perto de quem olha: a data é da turma, na ficha aberta; o regime é do curso.
    const a = andamentoDaTurma(
      turma({ dataTermino: null }),
      { regimePadraoTempos: null, limiteDiarioEadHoras: null },
      [],
      SEGUNDA,
    );
    expect(a.situacaoDaCapacidade).toBe("sem_termino");
  });

  it("U10 · prevista zero não divide por zero — o percentual não existe", () => {
    // Currículo por competências: há **dois** cursos assim na base real.
    const a = andamentoDaTurma(turma({ prevista: 0, executada: 5 }), PRESENCIAL_8, [], SEGUNDA);

    expect(a.percentual).toBeNull();
    expect(a.restante, "max(0 − 5, 0)").toBe(0);
  });

  it("U11 · executada zero é `ainda sem lançamentos`, e não `0%`", () => {
    const a = andamentoDaTurma(turma({ executada: 0 }), PRESENCIAL_8, [], SEGUNDA);

    expect(a.semLancamentos).toBe(true);
    // ⚠️ O percentual EXISTE e é zero; quem decide a frase da tela é `semLancamentos`.
    expect(a.percentual).toBe(0);
  });

  it("capacidade diária zero ou negativa vale sem dado", () => {
    expect(
      capacidadeDiaria("presencial", { regimePadraoTempos: 0, limiteDiarioEadHoras: null }),
    ).toBeNull();
    expect(
      capacidadeDiaria("presencial", { regimePadraoTempos: -4, limiteDiarioEadHoras: null }),
    ).toBeNull();
  });
});

describe("⚠️ `RN-EVT-02` e `diasUteis_` · os dias úteis, conferidos no `Código.gs`", () => {
  it("U8 · feriado de dia inteiro na quarta tira um dia; repetido, tira um só", () => {
    /*
     * CONTA: segunda 02/03 a sexta 06/03 → **5** dias úteis. Com 04/03 (uma **quarta**) de feriado,
     *        **4**. Com a MESMA data duas vezes na lista, **4** de novo.
     *
     * ⚠️ **A DUPLICATA NÃO É HIPÓTESE: a origem da v2.0 tem 16/02 em DUAS linhas** (`FER-000003` e
     *    `FER-000022`). Contar por linha descontaria o mesmo dia duas vezes, e a capacidade sairia
     *    menor — alerta de atraso onde não há.
     */
    expect(diasUteisEntre("2026-03-02", "2026-03-06", [])).toBe(5);
    expect(diasUteisEntre("2026-03-02", "2026-03-06", ["2026-03-04"])).toBe(4);
    expect(
      diasUteisEntre("2026-03-02", "2026-03-06", ["2026-03-04", "2026-03-04"]),
      "a data repetida descontou duas vezes",
    ).toBe(4);
  });

  it("feriado que cai no sábado não desconta nada", () => {
    // CONTA: 02/03 (seg) a 08/03 (dom) → só os cinco dias de semana. 07/03 é **sábado**.
    expect(diasUteisEntre("2026-03-02", "2026-03-08", [])).toBe(5);
    expect(diasUteisEntre("2026-03-02", "2026-03-08", ["2026-03-07"])).toBe(5);
  });

  it("⚠️ U9 · as duas pontas são INCLUSIVAS — é o `while (d <= ate)` da v1.0", () => {
    /*
     * CONTA: 04/03 é uma **quarta**; de 04/03 a 04/03 → **1** dia útil. Uma implementação exclusiva
     *        numa das pontas daria **0** aqui, e daria 9 no U1 em vez de 10 — um dia de capacidade a
     *        menos, que não dá exceção nenhuma: dá saldo errado.
     */
    expect(diasUteisEntre("2026-03-04", "2026-03-04", [])).toBe(1);

    // E o fim de semana nas pontas não acrescenta nada: 07/03 (sáb) a 15/03 (dom) → 09 a 13 = **5**.
    expect(diasUteisEntre("2026-03-07", "2026-03-15", [])).toBe(5);
  });

  it("término antes de hoje dá zero, e data inválida também", () => {
    expect(diasUteisEntre("2026-03-02", "2026-02-27", [])).toBe(0);
    // ⚠️ Texto que não é data vira zero, nunca exceção (`RN-DEG-01`).
    expect(diasUteisEntre("2026-03-02", "amanhã", [])).toBe(0);
    expect(diasUteisEntre("", "2026-03-06", [])).toBe(0);
  });
});

describe("`FR-028` · o percentual é UMA função, e ela serve aos três grãos", () => {
  /*
   * ⚠️ **ELA FOI EXTRAÍDA EM 04/10/2026 PORQUE TRÊS LUGARES FAZEM A MESMA CONTA**: a turma (nesta
   *    seção), cada disciplina da grade e o painel do Início. A fórmula é uma linha — e é justamente
   *    por isso que três cópias dela passariam sem ninguém notar, até o dia em que uma arredondasse
   *    para o outro lado.
   */
  it("arredonda para o inteiro mais próximo", () => {
    // CONTA: 100 · 1/3 = 33,33… → 33. E 100 · 2/3 = 66,66… → 67.
    expect(percentualExecutado(3, 1)).toBe(33);
    expect(percentualExecutado(3, 2)).toBe(67);
  });

  it("⚠️ prevista ZERO devolve `null`, e não `0` — é ausência de denominador", () => {
    expect(percentualExecutado(0, 0)).toBeNull();
    // ⚠️ E com execução sem previsão também: o currículo por competências não tem CH em disciplina.
    expect(percentualExecutado(0, 12)).toBeNull();
  });

  it("passa de 100 quando houve excesso — o número não é recortado", () => {
    // CONTA: 100 · 12/10 = 120.
    expect(percentualExecutado(10, 12)).toBe(120);
  });

  it("⚠️ e é a MESMA função que o andamento usa, não uma cópia com o mesmo resultado", () => {
    const a = andamentoDaTurma(turma({ prevista: 3, executada: 1 }), PRESENCIAL_8, [], SEGUNDA);
    expect(a.percentual).toBe(percentualExecutado(3, 1));
  });
});
