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
 *
 * ⚠️ **SPEC 029 (Bloco 14, item 5, FR-005): O SALDO PELO REGIME DA SEMANA** — os casos S1 a S9 e a não regressão, no
 * fim do arquivo. O contrato que eles fixam (`plan.md` §1):
 *
 * - `andamentoDaTurma(turma, regime, feriados, hoje, semanas?)` — o 5º parâmetro é **opcional** (os chamadores de
 *   hoje e os scripts de prova seguem compilando) e tem a forma `RegimesDasSemanas`:
 *   `{ registros: { ano, semana, origem: "gravado" | "so_esta_semana", tempos: number | null }[],
 *      vigencias: { vigenteDe, tempos: number | null }[], temposDoCurso: number | null }`.
 *   `tempos` nulo = o do curso. ⚠️ **`temposDoCurso` vai à parte** porque `regime` chega já fundido por
 *   `regimeEfetivo` (Editar turma > curso), e o «desde» de regime nulo volta ao do **curso** mesmo com regime em
 *   Editar turma (D-12: o padrão vigente hoje).
 * - `Andamento.faixaDiaria: { minima, maxima } | null` — a faixa do TA/dia na janela quando ele **varia** (D-13);
 *   `null` quando não varia. `capacidadeDiaria` é o TA/dia do **primeiro dia útil** da janela, e `saldoEmDias`
 *   divide por ele.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  andamentoDaTurma,
  capacidadeDiaria,
  diaSeguinte,
  diasUteisEntre,
  percentualExecutado,
  type RegimeDoCurso,
  type RegimesDasSemanas,
  type TurmaParaAndamento,
} from "@/lib/dominio/andamento-da-turma";
import { regimeEfetivo } from "@/lib/dominio/regime-da-turma";
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

/*
 * ── Spec 029 (Bloco 14, item 5, FR-005) · o saldo pelo regime DA SEMANA ─────────────────────────────────────────────
 *
 * > *"PEND-026-1: o saldo segue o regime da semana do DSA (gravado ou «só esta semana» > «desde» > Editar turma >
 * > curso)."* — item 5 do pedido de Bernardo Villas Boas, 27/10/2026 (`spec.md` da 029, FR-005; supera a D-15 da spec
 * > 026, *"o saldo fica no de Editar turma"*).
 *
 * ⚠️ **AS SEMANAS DAS CONTAS, CONFERIDAS** (2026-01-01 é quinta; a semana ISO 1 começa em 29/12/2025): seg 02/03 é a
 *    semana **10**, seg 09/03 a **11**, seg 16/03 a **12**, seg 23/03 a **13**, seg 30/03 a **14**, e seg 23/02 a **9**.
 */

/** Sem nenhum registro de semana nem «desde» — o insumo que tem de dar o resultado de hoje (FR-005.3). */
const SEM_EXCECOES = (temposDoCurso: number | null): RegimesDasSemanas => ({
  registros: [],
  vigencias: [],
  temposDoCurso,
});

const EDITAR_TURMA_9 = regimeEfetivo(PRESENCIAL_8, { regimeTempos: 9 });

describe("⚠️ FR-005 · O CASO QUE DISCRIMINA (DoD 8) · 8 TA com «desde» de 9 na segunda seguinte", () => {
  it("S1 · 8 nos dias desta semana, 9 nos seguintes — hoje dá 8 × todos, e o veredito vira", () => {
    /*
     * CONTA: hoje seg 02/03 (semana 10); a janela vai de amanhã, ter 03/03, a sex 13/03.
     *        Semana 10, ter a sex: 4 dias × 8 = **32**. Semana 11 («desde» 9 a partir de seg 09/03): 5 × 9 = **45**.
     *        capacidade = **77**; diasUteis = **9** (a contagem não muda); restante = 100 − 25 = **75**;
     *        saldo = 77 − 75 = **+2**; capacidadeDiaria = **8** (ter 03/03, semana 10); saldoEmDias = floor(2/8) = **0**.
     *        HOJE (um TA/dia só): 9 × 8 = **72** → saldo **−3**, e a turma sai «em atraso» sem estar.
     */
    const t = turma({ dataTermino: "2026-03-13", prevista: 100, executada: 25 });
    const hojeComoE = andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA);
    expect(hojeComoE.capacidade).toBe(72);
    expect(hojeComoE.emAtraso).toBe(true);

    const a = andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA, {
      registros: [],
      vigencias: [{ vigenteDe: "2026-03-09", tempos: 9 }],
      temposDoCurso: 8,
    });
    expect(a.capacidade, "a capacidade ignorou o «desde» da semana seguinte").toBe(77);
    expect(a.diasUteis).toBe(9);
    expect(a.saldo).toBe(2);
    expect(a.capacidadeDiaria).toBe(8);
    expect(a.saldoEmDias).toBe(0);
    expect(a.faixaDiaria).toEqual({ minima: 8, maxima: 9 });
    expect(a.situacaoDaCapacidade).toBe("calculada");
    expect(a.emAtraso, "com o «desde» de 9 a turma cabe no prazo").toBe(false);
  });
});

describe("FR-005.1 · a ordem é a do DSA: gravado ou «só esta semana» > «desde» > Editar turma > curso", () => {
  it("S2 · «só esta semana» com 6 numa semana do meio muda SÓ os dias daquela semana; as demais seguem Editar turma", () => {
    /*
     * CONTA: Editar turma 9 (curso 8). Janela ter 03/03 a sex 27/03: semanas 10 (4 dias), 11, 12 e 13 (5 cada) = 19.
     *        4×9 + 5×9 + 5×**6** + 5×9 = 36 + 45 + 30 + 45 = **156**. HOJE: 19 × 9 = **171**.
     *        A diferença é **15** = 5 dias × (9 − 6): só a semana 12.
     *        restante = 200 − 40 = **160**; saldo = 156 − 160 = **−4**; saldoEmDias = floor(−4/9) = **−1**.
     */
    const t = turma({ dataTermino: "2026-03-27", prevista: 200, executada: 40 });
    const hojeComoE = andamentoDaTurma(t, EDITAR_TURMA_9, [], SEGUNDA);
    expect(hojeComoE.capacidade).toBe(171);

    const a = andamentoDaTurma(t, EDITAR_TURMA_9, [], SEGUNDA, {
      registros: [{ ano: 2026, semana: 12, origem: "so_esta_semana", tempos: 6 }],
      vigencias: [],
      temposDoCurso: 8,
    });
    expect(a.capacidade, "a «só esta semana» não mudou os dias da semana 12").toBe(156);
    expect(a.capacidade).toBe(171 - 5 * (9 - 6));
    expect(a.diasUteis).toBe(19);
    expect(a.saldo).toBe(-4);
    expect(a.capacidadeDiaria).toBe(9);
    expect(a.saldoEmDias).toBe(-1);
    expect(a.faixaDiaria).toEqual({ minima: 6, maxima: 9 });
    expect(a.emAtraso).toBe(true);
  });

  it("S3 · a semana GRAVADA vence o «desde» posterior — com o do curso (nulo) ou com o retrato de um nomeado", () => {
    /*
     * CONTA: curso 8, «desde» 9 a partir de seg 09/03. Janela ter 03/03 a sex 20/03: semanas 10 (4), 11 (5), 12 (5).
     *        Semana 12 gravada com o do curso (tempos nulo → 8): 4×8 + 5×9 + 5×8 = 32 + 45 + 40 = **117**.
     *        Sem o gravado seriam 32 + 45 + 45 = **122**; HOJE, 14 × 8 = **112**.
     *        restante = 200 − 80 = **120**; saldo = 117 − 120 = **−3**.
     *        Gravada com o retrato de 6: 32 + 45 + 30 = **107**.
     */
    const t = turma({ dataTermino: "2026-03-20", prevista: 200, executada: 80 });
    const desde9 = [{ vigenteDe: "2026-03-09", tempos: 9 }] as const;

    const comOCurso = andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA, {
      registros: [{ ano: 2026, semana: 12, origem: "gravado", tempos: null }],
      vigencias: desde9,
      temposDoCurso: 8,
    });
    expect(comOCurso.capacidade, "o «desde» passou por cima da semana gravada").toBe(117);
    expect(comOCurso.saldo).toBe(-3);

    const comORetrato = andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA, {
      registros: [{ ano: 2026, semana: 12, origem: "gravado", tempos: 6 }],
      vigencias: desde9,
      temposDoCurso: 8,
    });
    expect(comORetrato.capacidade).toBe(107);
  });

  it("S4 · «desde» de regime NULO volta ao do CURSO (padrão de hoje, D-12) mesmo com regime em Editar turma", () => {
    /*
     * CONTA: Editar turma 9, curso 8; «desde» nulo a partir de seg 09/03. Janela ter 03/03 a sex 13/03.
     *        Semana 10: 4 × 9 (Editar turma) = **36**. Semana 11: «desde» nulo = o do curso, 5 × 8 = **40**. Total **76**.
     *        HOJE: 9 × 9 = **81** — e é também o que daria ler «nulo» como «Editar turma», o erro que este caso pega.
     *        restante = **60**; saldo = **16**; capacidadeDiaria = **9**; saldoEmDias = floor(16/9) = **1**.
     */
    const t = turma({ dataTermino: "2026-03-13" });
    const pelaVigencia = andamentoDaTurma(t, EDITAR_TURMA_9, [], SEGUNDA, {
      registros: [],
      vigencias: [{ vigenteDe: "2026-03-09", tempos: null }],
      temposDoCurso: 8,
    });
    expect(pelaVigencia.capacidade, "o «desde» nulo ficou com o regime de Editar turma").toBe(76);
    expect(pelaVigencia.saldo).toBe(16);
    expect(pelaVigencia.capacidadeDiaria).toBe(9);
    expect(pelaVigencia.saldoEmDias).toBe(1);
    expect(pelaVigencia.faixaDiaria).toEqual({ minima: 8, maxima: 9 });

    /* E a «só esta semana» de regime nulo também é o do curso: a mesma conta. */
    const peloRegistro = andamentoDaTurma(t, EDITAR_TURMA_9, [], SEGUNDA, {
      registros: [{ ano: 2026, semana: 11, origem: "so_esta_semana", tempos: null }],
      vigencias: [],
      temposDoCurso: 8,
    });
    expect(peloRegistro.capacidade).toBe(76);
  });

  it("S5 · o «desde» de uma semana PASSADA vale para a janela inteira; e o de maior segunda vence", () => {
    /*
     * CONTA: curso 8; «desde» 9 desde seg 23/02 (semana 9, antes de hoje). Janela ter 03/03 a sex 13/03: 9 × 9 = **81**;
     *        restante 60 → saldo **21**; capacidadeDiaria **9**; saldoEmDias floor(21/9) = **2**; o TA/dia não varia →
     *        sem faixa. Com um segundo «desde», nulo, desde seg 09/03: 4 × 9 + 5 × 8 = **76** — em qualquer ordem.
     */
    const t = turma({ dataTermino: "2026-03-13" });
    const passado = { vigenteDe: "2026-02-23", tempos: 9 } as const;
    const a = andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA, {
      registros: [],
      vigencias: [passado],
      temposDoCurso: 8,
    });
    expect(a.capacidade, "o «desde» anterior à janela não valeu nela").toBe(81);
    expect(a.saldo).toBe(21);
    expect(a.capacidadeDiaria).toBe(9);
    expect(a.saldoEmDias).toBe(2);
    expect(a.faixaDiaria).toBeNull();

    const depois = { vigenteDe: "2026-03-09", tempos: null } as const;
    for (const vigencias of [
      [passado, depois],
      [depois, passado],
    ]) {
      expect(
        andamentoDaTurma(t, PRESENCIAL_8, [], SEGUNDA, {
          registros: [],
          vigencias,
          temposDoCurso: 8,
        }).capacidade,
      ).toBe(76);
    }
  });
});

describe("`RN-EVT-02` · feriado e fim de semana não somam TA, também na semana de regime diferente", () => {
  it("S6 · o feriado da semana de 9 tira 9 (uma vez só); sábado e domingo não somam nada", () => {
    /*
     * CONTA: curso 8, «desde» 9 desde seg 09/03; janela ter 03/03 a DOM 15/03; feriados qua 11/03 (duas vezes) e sáb 14/03.
     *        Semana 10: ter a sex = 4 × 8 = **32** (sáb 07 e dom 08 fora). Semana 11: seg 09, ter 10, qui 12, sex 13 =
     *        4 × 9 = **36** (qua 11 é feriado; sáb 14 e dom 15, fim de semana). Total **68**; diasUteis **8**.
     *        Os erros que este número separa: contar o feriado (77); descontá-lo pelo TA/dia do regime, 77 − 8 (69);
     *        descontar a data repetida duas vezes (59); somar o fim de semana a 9 (+18).
     */
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-03-15" }),
      PRESENCIAL_8,
      ["2026-03-11", "2026-03-11", "2026-03-14"],
      SEGUNDA,
      { registros: [], vigencias: [{ vigenteDe: "2026-03-09", tempos: 9 }], temposDoCurso: 8 },
    );
    expect(a.diasUteis).toBe(8);
    expect(a.capacidade).toBe(68);
    expect(a.saldo).toBe(8);
  });
});

describe("D-14 · um dia útil sem TA/dia resolvido deixa a capacidade inteira SEM REGIME (`RN-DEG-01`)", () => {
  it("S7 · «desde» nulo num curso sem padrão vigente: sem capacidade, sem saldo e sem veredito", () => {
    /*
     * CONTA: Editar turma 8, curso SEM padrão vigente (nulo); «desde» nulo desde seg 09/03 → a semana 11 não resolve.
     *        HOJE: 9 × 8 = 72, calculada. Somar só os dias com regime daria 4 × 8 = 32 e saldo 32 − 60 = −28: um
     *        «em atraso» FALSO — é o lado inseguro que a D-14 recusa.
     */
    const cursoSemPadrao: RegimeDoCurso = { regimePadraoTempos: null, limiteDiarioEadHoras: null };
    const regime = regimeEfetivo(cursoSemPadrao, { regimeTempos: 8 });
    const t = turma({ dataTermino: "2026-03-13" });
    expect(andamentoDaTurma(t, regime, [], SEGUNDA).situacaoDaCapacidade).toBe("calculada");

    for (const semanas of [
      {
        registros: [],
        vigencias: [{ vigenteDe: "2026-03-09", tempos: null }],
        temposDoCurso: null,
      },
      {
        registros: [{ ano: 2026, semana: 11, origem: "gravado", tempos: null }],
        vigencias: [],
        temposDoCurso: null,
      },
    ] satisfies RegimesDasSemanas[]) {
      const a = andamentoDaTurma(t, regime, [], SEGUNDA, semanas);
      expect(a.situacaoDaCapacidade, "a semana sem TA/dia não deixou a capacidade sem regime").toBe(
        "sem_regime",
      );
      expect(a.capacidade).toBeNull();
      expect(a.saldo).toBeNull();
      expect(a.saldoEmDias).toBeNull();
      expect(a.emAtraso, "sem capacidade não se afirma atraso").toBe(false);
    }
  });

  it("e o dia sem TA/dia FORA da janela não conta: depois do término a capacidade continua calculada", () => {
    // CONTA: o «desde» nulo começa em seg 16/03, depois do término (sex 13/03): 9 dias × 8 = **72**.
    const regime = regimeEfetivo(
      { regimePadraoTempos: null, limiteDiarioEadHoras: null },
      { regimeTempos: 8 },
    );
    const a = andamentoDaTurma(turma({ dataTermino: "2026-03-13" }), regime, [], SEGUNDA, {
      registros: [],
      vigencias: [{ vigenteDe: "2026-03-16", tempos: null }],
      temposDoCurso: null,
    });
    expect(a.situacaoDaCapacidade).toBe("calculada");
    expect(a.capacidade).toBe(72);
  });
});

describe("D-13 · o TA/dia do PRIMEIRO dia útil divide o saldo em dias; a faixa aparece quando ele varia", () => {
  it("S8 · hoje sexta: o 1º dia útil é a segunda, já no «desde» — 9 TA/dia, e não o 8 do regime", () => {
    /*
     * CONTA: hoje sex 06/03; amanhã sáb 07; o 1º dia útil é seg 09/03 (semana 11, «desde» 9). Término sex 20/03.
     *        Semana 11: 5 × 9 = **45**. Semana 12 («só esta semana» 6): 5 × 6 = **30**. capacidade **75**; diasUteis **10**.
     *        restante = 100 − 16 = **84**; saldo = **−9**; capacidadeDiaria = **9**; saldoEmDias = floor(−9/9) = **−1**.
     *        Os divisores errados dariam outro número: pelo 8 do regime, floor(−1,125) = −2; pela média 7,5, −2; pelo 6, −2.
     */
    const a = andamentoDaTurma(
      turma({ dataTermino: "2026-03-20", prevista: 100, executada: 16 }),
      PRESENCIAL_8,
      [],
      "2026-03-06",
      {
        registros: [{ ano: 2026, semana: 12, origem: "so_esta_semana", tempos: 6 }],
        vigencias: [{ vigenteDe: "2026-03-09", tempos: 9 }],
        temposDoCurso: 8,
      },
    );
    expect(a.capacidade).toBe(75);
    expect(a.diasUteis).toBe(10);
    expect(a.saldo).toBe(-9);
    expect(a.capacidadeDiaria, "o TA/dia não é o do primeiro dia útil da janela").toBe(9);
    expect(a.saldoEmDias, "o saldo em dias não dividiu pelo TA/dia do primeiro dia útil").toBe(-1);
    expect(a.faixaDiaria).toEqual({ minima: 6, maxima: 9 });
    expect(a.emAtraso).toBe(true);
  });

  it("S9 · sem variação na janela não há faixa — nem sem as semanas, nem com elas", () => {
    expect(andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA).faixaDiaria).toBeNull();
    expect(
      andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA, SEM_EXCECOES(8)).faixaDiaria,
    ).toBeNull();
    expect(
      andamentoDaTurma(turma({ dataTermino: null }), PRESENCIAL_8, [], SEGUNDA, SEM_EXCECOES(8))
        .faixaDiaria,
    ).toBeNull();
  });
});

describe("FR-005.3 · sem nenhum registro de semana nem «desde», o Andamento é IDÊNTICO ao de hoje, campo a campo", () => {
  /*
   * ⚠️ **CONTROLE, E NÃO CASO QUE DISCRIMINA**: passa antes e tem de passar depois. Os números são os dos casos U1 a U12
   *    e de D-COR-2, acima — cada um já conferido à mão lá; aqui eles voltam pelo caminho novo (o 5º parâmetro vazio)
   *    e têm de sair iguais, campo a campo, ao caminho sem ele.
   */
  const CASOS: readonly {
    readonly nome: string;
    readonly turma: TurmaParaAndamento;
    readonly regime: RegimeDoCurso;
    readonly temposDoCurso: number | null;
    readonly feriados: readonly string[];
    readonly hoje: string;
    readonly esperado: Record<string, unknown>;
  }[] = [
    {
      nome: "U1 · 9 dias úteis a 8 TA/dia",
      turma: turma(),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      esperado: {
        prevista: 100,
        executada: 40,
        restante: 60,
        percentual: 40,
        semLancamentos: false,
        capacidadeDiaria: 8,
        diasUteis: 9,
        capacidade: 72,
        saldo: 12,
        saldoEmDias: 1,
        situacaoDaCapacidade: "calculada",
        emAtraso: false,
      },
    },
    {
      nome: "U2 · 4 dias úteis, em atraso",
      turma: turma({ dataTermino: "2026-03-06" }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      esperado: { diasUteis: 4, capacidade: 32, saldo: -28, saldoEmDias: -4, emAtraso: true },
    },
    {
      nome: "U3 · excesso não é atraso",
      turma: turma({ prevista: 10, executada: 12, dataTermino: "2026-03-27" }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      esperado: {
        restante: 0,
        percentual: 120,
        diasUteis: 19,
        capacidade: 152,
        saldo: 152,
        saldoEmDias: 19,
        emAtraso: false,
      },
    },
    {
      nome: "U12 · término já passado",
      turma: turma({ dataTermino: "2026-02-27", prevista: 30, executada: 0 }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      esperado: {
        semLancamentos: true,
        percentual: 0,
        diasUteis: 0,
        capacidade: 0,
        saldo: -30,
        saldoEmDias: -4,
        emAtraso: true,
      },
    },
    {
      nome: "U5 · sem término",
      turma: turma({ dataTermino: null }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      esperado: {
        capacidadeDiaria: 8,
        diasUteis: null,
        capacidade: null,
        saldo: null,
        saldoEmDias: null,
        situacaoDaCapacidade: "sem_termino",
        emAtraso: false,
      },
    },
    {
      nome: "U6 · regime presencial zero é sem dado",
      turma: turma(),
      regime: { regimePadraoTempos: 0, limiteDiarioEadHoras: 6 },
      temposDoCurso: 0,
      feriados: [],
      hoje: SEGUNDA,
      esperado: {
        capacidadeDiaria: null,
        capacidade: null,
        saldo: null,
        situacaoDaCapacidade: "sem_regime",
        emAtraso: false,
      },
    },
    {
      nome: "U7 · turma EAD",
      turma: turma({ modalidade: "ead" }),
      regime: { regimePadraoTempos: 0, limiteDiarioEadHoras: 4 },
      temposDoCurso: 0,
      feriados: [],
      hoje: SEGUNDA,
      esperado: { situacaoDaCapacidade: "controle_da_dead", capacidade: null, emAtraso: false },
    },
    {
      nome: "U8 · feriado na quarta, repetido",
      turma: turma({ dataTermino: "2026-03-06" }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: ["2026-03-04", "2026-03-04"],
      hoje: SEGUNDA,
      // CONTA: ter 03, qui 05 e sex 06 = 3 × 8 = 24; saldo 24 − 60 = −36; floor(−4,5) = −5.
      esperado: { diasUteis: 3, capacidade: 24, saldo: -36, saldoEmDias: -5, emAtraso: true },
    },
    {
      nome: "D-COR-2 · hoje num sábado",
      turma: turma(),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: "2026-03-07",
      // CONTA: seg 09 a sex 13 = 5 × 8 = 40; saldo 40 − 60 = −20; floor(−2,5) = −3.
      esperado: { diasUteis: 5, capacidade: 40, saldo: -20, saldoEmDias: -3, emAtraso: true },
    },
    {
      nome: "spec 024 (D-9) · etapa presencial que ainda não começou",
      turma: turma({ modalidade: "semipresencial", inicioDaCapacidade: "2026-03-09" }),
      regime: PRESENCIAL_8,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      // CONTA: da seg 09/03 (início da etapa) a sex 13/03 = 5 × 8 = 40; saldo −20; floor(−2,5) = −3.
      esperado: { diasUteis: 5, capacidade: 40, saldo: -20, saldoEmDias: -3, emAtraso: true },
    },
    {
      nome: "spec 018 (C-9) · o regime de Editar turma, 9",
      turma: turma(),
      regime: EDITAR_TURMA_9,
      temposDoCurso: 8,
      feriados: [],
      hoje: SEGUNDA,
      // CONTA: 9 dias × 9 = 81; saldo 81 − 60 = 21; floor(21/9) = 2.
      esperado: { capacidadeDiaria: 9, diasUteis: 9, capacidade: 81, saldo: 21, saldoEmDias: 2 },
    },
  ];

  for (const c of CASOS) {
    it(c.nome, () => {
      const deHoje = andamentoDaTurma(c.turma, c.regime, c.feriados, c.hoje);
      const peloCaminhoNovo = andamentoDaTurma(
        c.turma,
        c.regime,
        c.feriados,
        c.hoje,
        SEM_EXCECOES(c.temposDoCurso),
      );
      expect(peloCaminhoNovo).toMatchObject(c.esperado);
      expect(peloCaminhoNovo, "sem exceções o caminho novo mudou um campo").toEqual(deHoje);
    });
  }

  it("e o registro e o «desde» FORA da janela não mexem em nada", () => {
    // A janela de U1 é ter 03/03 a sex 13/03: a semana 9 já passou, a 14 e o «desde» de 30/03 vêm depois do término.
    const deHoje = andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA);
    const comForaDaJanela = andamentoDaTurma(turma(), PRESENCIAL_8, [], SEGUNDA, {
      registros: [
        { ano: 2026, semana: 9, origem: "gravado", tempos: 6 },
        { ano: 2026, semana: 14, origem: "so_esta_semana", tempos: 6 },
      ],
      vigencias: [{ vigenteDe: "2026-03-30", tempos: 9 }],
      temposDoCurso: 8,
    });
    expect(comForaDaJanela).toEqual(deHoje);
  });
});

describe("D-14 da spec 026 · a ordem da resolução mora em `regimeDaSemana`, e o saldo a usa (não a copia)", () => {
  /*
   * ⚠️ **GUARDA DE PONTO ÚNICO, lida SEM COMENTÁRIO** (regra 9.1.1): a ordem «gravado ou só esta semana > desde >
   *    Editar turma > curso» é a do DSA, da prévia, do papel, da planilha e das ações. Uma segunda cópia dela no saldo é
   *    o que faria a ficha e a grade discordarem da semana em silêncio no dia em que uma das duas mudasse.
   */
  it("`andamento-da-turma.ts` importa e chama `regimeDaSemana`", () => {
    const fonte = readFileSync(resolve(process.cwd(), "lib/dominio/andamento-da-turma.ts"), "utf8");
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codigo, "o saldo não importa a resolução do DSA").toMatch(
      /from\s+["'](?:\.\/dsa|@\/lib\/dominio\/dsa)\/regime-da-semana["']/,
    );
    expect(codigo, "o saldo não chama `regimeDaSemana`").toMatch(/\bregimeDaSemana\s*[<(]/);
  });
});
