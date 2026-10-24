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
 *
 * ⚠️ **OS DIAS ÚTEIS DO SALDO CONTAM DE AMANHÃ** (D-COR-2, Bernardo Villas Boas, 16/10/2026; FR-014.2 da spec 016):
 * a executada já é "até hoje, inclusive" (`chd_da_turma_ate`), então o dia de hoje não é capacidade à frente —
 * contá-lo nas duas pontas era um dia a mais. U1, U2, U3, U4 e U7 foram recalculados com a conta nova.
 */
import { describe, expect, it } from "vitest";

import {
  andamentoDaTurma,
  capacidadeDiaria,
  diaSeguinte,
  diasUteisEntre,
  percentualExecutado,
  type RegimeDoCurso,
  type TurmaParaAndamento,
} from "@/lib/dominio/andamento-da-turma";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

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
  it("U1 · 9 dias úteis a 8 TA/dia cobrem o que falta, com folga de 1 dia", () => {
    /*
     * CONTA: hoje é segunda 02/03; de AMANHÃ, terça 03/03, a sexta 13/03 → 4 + 5 = **9** dias úteis.
     *        capacidade = 9 × 8 = **72**; restante = 100 − 40 = **60**; saldo = 72 − 60 = **12**;
     *        saldoEmDias = floor(12 / 8) = **1**; percentual = round(40/100 × 100) = **40**.
     */
    const a = andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA);

    expect(a.diasUteis).toBe(9);
    expect(a.capacidade).toBe(72);
    expect(a.restante).toBe(60);
    expect(a.saldo).toBe(12);
    expect(a.saldoEmDias).toBe(1);
    expect(a.percentual).toBe(40);
    expect(a.situacaoDaCapacidade).toBe("calculada");
    expect(a.emAtraso).toBe(false);
  });
});

describe("⚠️ O CASO QUE DISCRIMINA · atraso é falta de CAPACIDADE, não excesso de execução", () => {
  it("U2 · com 4 dias úteis o que falta NÃO cabe, e a turma ativa é acusada", () => {
    /*
     * CONTA: de amanhã, terça 03/03, a sexta 06/03 → **4** dias úteis. capacidade = 4 × 8 = **32**;
     *        restante = **60**; saldo = 32 − 60 = **−28**; saldoEmDias = floor(−28/8) = floor(−3,5)
     *        = **−4** (para baixo também no negativo: faltam quatro dias, não três).
     */
    const a = andamentoDaTurma(turma({ dataTermino: "2026-03-06" }), PRESENCIAL_8, [], SEGUNDA);

    expect(a.diasUteis).toBe(4);
    expect(a.capacidade).toBe(32);
    expect(a.saldo).toBe(-28);
    expect(a.saldoEmDias).toBe(-4);
    expect(a.emAtraso, "turma ativa sem capacidade para o que falta não foi acusada").toBe(true);
  });

  it("⚠️ U3 · turma que executou MAIS do que o previsto NÃO está em atraso", () => {
    /*
     * CONTA: prevista 10, executada 12 → restante = max(10 − 12, 0) = **0**, e não −2.
     *        de amanhã, 03/03, a sexta 27/03 são quatro semanas menos a segunda → **19** dias úteis;
     *        capacidade = 152; saldo = 152 − 0 = **152**; percentual = round(12/10 × 100) = **120**.
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
    expect(a.saldo).toBe(152);
    expect(a.emAtraso, "excesso de execução foi tratado como atraso").toBe(false);
  });

  it("U4 · a MESMA turma do U2, concluída, não é acusada — `em andamento` é do requisito", () => {
    /*
     * ⚠️ Mesmo saldo (−28) e veredito oposto: o `RF-INI-01` fala de turma **em andamento**. Encher o
     *    painel de alertas sobre turmas que ninguém pode mais consertar ensina a ignorar a região de
     *    alertas inteira.
     */
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-03-06", status: "concluida" }),
      PRESENCIAL_8,
      [],
      SEGUNDA,
    );

    expect(a.saldo).toBe(-28);
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
    /* Spec 024 (FR-018): a turma EAD não conta TA — o «sem regime» deixou de se aplicar a ela. */
    expect(eadEmCursoPresencial.situacaoDaCapacidade).toBe("controle_da_dead");
  });

  /*
   * ⚠️ **U7 MUDOU DE REGRA na spec 024 (FR-018, Bernardo Villas Boas, 23/10/2026):** *"EAD NÃO CONTA TA em lugar
   *    nenhum"*. Até o Bloco 9 a turma EAD tinha capacidade pelo limite diário em horas (D8 da spec 012) e podia sair
   *    «em atraso»; agora o andamento dela é da Divisão de Ensino a Distância e nada se conta. A `RN-MAT-04` (decidir
   *    pela modalidade DA TURMA) continua: é por ela que a turma EAD é reconhecida.
   */
  it("U7 · turma EAD não conta TA: nem capacidade, nem saldo, nem atraso (FR-018)", () => {
    const a = andamentoDaTurma(
      turma({ modalidade: "ead" }),
      { regimePadraoTempos: 0, limiteDiarioEadHoras: 4 },
      [],
      SEGUNDA,
    );

    expect(a.situacaoDaCapacidade).toBe("controle_da_dead");
    expect(a.capacidade).toBeNull();
    expect(a.saldo).toBeNull();
    expect(a.emAtraso).toBe(false);
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

describe("⚠️ D-COR-2 · FR-014.2 · os dias úteis do saldo contam de AMANHÃ, e o dia é o de São Paulo", () => {
  it("hoje num SÁBADO: amanhã é domingo, e a conta não muda — os dias úteis começam na segunda", () => {
    /*
     * CONTA: hoje sábado 07/03; amanhã domingo 08/03; de 08/03 a sexta 13/03 → **5** dias úteis (09 a 13).
     *        É o mesmo número de antes (de sábado a sexta também dá 5): num fim de semana a regra nova não muda nada.
     */
    const a = andamentoDaTurma(turma(), PRESENCIAL_8, [], "2026-03-07");
    expect(a.diasUteis).toBe(5);
    expect(a.capacidade).toBe(40);
  });

  it("hoje numa SEGUNDA que é o próprio término: não sobra dia útil à frente", () => {
    // CONTA: hoje segunda 09/03 = término; amanhã 10/03 > 09/03 → **0** dias úteis; restante 60 → saldo **−60**.
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-03-09" }),
      PRESENCIAL_8,
      [],
      "2026-03-09",
    );
    expect(a.diasUteis).toBe(0);
    expect(a.saldo).toBe(-60);
    expect(a.emAtraso).toBe(true);
  });

  it("`diaSeguinte` vira o mês, o ano e o 29 de fevereiro", () => {
    expect(diaSeguinte("2026-03-02")).toBe("2026-03-03");
    expect(diaSeguinte("2026-01-31")).toBe("2026-02-01");
    expect(diaSeguinte("2026-02-28")).toBe("2026-03-01");
    expect(diaSeguinte("2028-02-28")).toBe("2028-02-29");
    expect(diaSeguinte("2028-02-29")).toBe("2028-03-01");
    expect(diaSeguinte("2026-12-31")).toBe("2027-01-01");
  });

  it("⚠️ FR-014.3 · às 23:30 em São Paulo (já o dia seguinte em UTC), hoje é o dia de São Paulo", () => {
    /*
     * 19/10/2026 02:30 UTC = 18/10/2026 23:30 em São Paulo (UTC−3, sem horário de verão). Um `current_date` em UTC
     * diria 19/10 — e contaria como passado um lançamento de 19/10, das 21h à meia-noite (D20).
     */
    const agora = new Date("2026-10-19T02:30:00Z");
    expect(agora.toISOString().slice(0, 10)).toBe("2026-10-19");
    const hoje = hojeNaCiaara(agora);
    expect(hoje).toBe("2026-10-18");
    // CONTA: hoje domingo 18/10; amanhã segunda 19/10; de 19/10 a sexta 23/10 → **5** dias úteis.
    const a = andamentoDaTurma(turma({ dataTermino: "2026-10-23" }), PRESENCIAL_8, [], hoje);
    expect(a.diasUteis).toBe(5);
  });
});
