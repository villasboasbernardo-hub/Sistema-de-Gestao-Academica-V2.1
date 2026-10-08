/**
 * `RF-DSA-05` · `RN-CRONOS-01` · `RN-CRONOS-03` · `Q-2` — a situação da disciplina na semana e a CH
 * acumulada **até aquela semana**.
 *
 * ⚠️ **AS DATAS NÃO SÃO ARBITRÁRIAS: elas são a semana ISO 20 de 2026, conferida no calendário** —
 * segunda **11/05** a domingo **17/05**, e **18/05** já é a semana 21 (medido com `Date.UTC` em
 * 05/10/2026, e é o que faz o caso da `RN-CRONOS-03` provar algo em vez de repetir a implementação).
 *
 * ⚠️ **AS CH SÃO SINTÉTICAS, de propósito** — 30 TA de prevista é número redondo escolhido aqui para
 * que 15, 30 e 34 digam `50 %`, `100 %` e `113 %` sem arredondamento ambíguo. Nenhum número deste
 * arquivo é medição de curso real, e nenhum se apresenta como tal.
 */

import { describe, expect, it } from "vitest";

import {
  estaAtrasada,
  quadroDaDisciplina,
  quadroDaUnidade,
  situacaoDaDisciplina,
  situacaoDaUnidade,
  type DisciplinaParaSituacao,
  type LancamentoParaSituacao,
} from "@/lib/dominio/dsa/situacao";
import { avaliarAUnidade } from "@/lib/dominio/dsa/tetos";

/** O último dia da semana ISO **20** de 2026 — o corte do acumulado nos casos abaixo. */
const FIM_DA_SEMANA_20 = "2026-05-17";

/** Terça-feira da semana 20 — serve de "hoje" quando o caso precisa de futuro dentro do corte. */
const TERCA_DA_SEMANA_20 = "2026-05-12";

function lancamento(data: string, ta: number, temConflito = false): LancamentoParaSituacao {
  return { data, ta, temConflito };
}

function disciplina(
  chPrevistaTempos: number,
  lancamentos: readonly LancamentoParaSituacao[],
): DisciplinaParaSituacao {
  return { disciplinaId: "DIS-000001", chPrevistaTempos, lancamentos };
}

/** O quadro, com o corte na semana 20 e o `hoje` que o caso quiser. */
function quadro(d: DisciplinaParaSituacao, hoje = FIM_DA_SEMANA_20, ateODia = FIM_DA_SEMANA_20) {
  return quadroDaDisciplina({ disciplina: d, ateODia, hoje });
}

describe("`RF-DSA-05` · os quatro degraus da situação", () => {
  it("disciplina sem lançamento nenhum fica `aguardando_inicio`, e o acumulado é 0", () => {
    const q = quadro(disciplina(30, []));

    expect(q.situacao).toBe("aguardando_inicio");
    expect(q.chAcumulada).toBe(0);
    expect(q.chRestante).toBe(30);
    expect(q.taLancadoAFrente).toBe(0);
  });

  it("metade lançada fica `em_andamento`, com 50 %", () => {
    const q = quadro(disciplina(30, [lancamento("2026-05-11", 8), lancamento("2026-05-12", 7)]));

    expect(q.situacao).toBe("em_andamento");
    expect(q.chAcumulada).toBe(15);
    expect(q.chRestante).toBe(15);
    expect(q.percentual).toBe(50);
  });

  it("a prevista inteira lançada fica `concluida`, com restante 0 e 100 %", () => {
    const q = quadro(disciplina(30, [lancamento("2026-05-11", 12), lancamento("2026-05-12", 18)]));

    expect(q.situacao).toBe("concluida");
    expect(q.chAcumulada).toBe(30);
    expect(q.chRestante).toBe(0);
    expect(q.percentual).toBe(100);
  });

  it("mais que a prevista fica `concluida`, e o restante é 0 — NUNCA negativo", () => {
    const q = quadro(disciplina(30, [lancamento("2026-05-11", 20), lancamento("2026-05-12", 14)]));

    expect(q.situacao).toBe("concluida");
    expect(q.chAcumulada).toBe(34);
    // ⚠️ `−4` aqui viraria "restante negativo", que é como se lê adiantamento como atraso.
    expect(q.chRestante).toBe(0);
    expect(q.percentual).toBe(113);
  });
});

describe("`RF-DSA-05` · `conflitou` atravessa os outros três", () => {
  const lancamentosConcluindo = [lancamento("2026-05-11", 12), lancamento("2026-05-12", 18, true)];

  it("conflito VENCE, mesmo com a disciplina concluída", () => {
    const q = quadro(disciplina(30, lancamentosConcluindo));

    expect(q.situacao).toBe("conflitou");
    // O conflito não tira nada do acumulado: ele é alerta, não bloqueio (`RN-DEG-02`).
    expect(q.chAcumulada).toBe(30);
    expect(q.chRestante).toBe(0);
  });

  it("CONTROLE NEGATIVO — os mesmos TA sem conflito dão `concluida`", () => {
    const q = quadro(disciplina(30, [lancamento("2026-05-11", 12), lancamento("2026-05-12", 18)]));

    expect(q.situacao).toBe("concluida");
  });

  it("conflito fora do corte da semana NÃO contamina a semana selecionada", () => {
    const q = quadro(
      disciplina(30, [lancamento("2026-05-12", 10), lancamento("2026-05-18", 5, true)]),
    );

    expect(q.situacao).toBe("em_andamento");
    expect(q.chAcumulada).toBe(10);
  });
});

describe("`RN-CRONOS-03` · o acumulado é até a SEMANA selecionada, não o total", () => {
  it("com a semana 20 selecionada, o lançamento de 18/05 (semana 21) fica FORA", () => {
    const q = quadro(
      disciplina(30, [lancamento("2026-05-12", 6), lancamento("2026-05-18", 6)]),
      TERCA_DA_SEMANA_20,
    );

    expect(q.chAcumulada).toBe(6);
    expect(q.chRestante).toBe(24);
    expect(q.percentual).toBe(20);
    expect(q.situacao).toBe("em_andamento");
    // ⚠️ O que ficou fora do acumulado também não é marcado como "à frente" (subconjunto).
    expect(q.taLancadoAFrente).toBe(0);
  });

  it("o último dia da semana ENTRA — o corte é `<=`, não `<`", () => {
    const q = quadro(disciplina(30, [lancamento(FIM_DA_SEMANA_20, 6)]), TERCA_DA_SEMANA_20);

    expect(q.chAcumulada).toBe(6);
    expect(q.taLancadoAFrente).toBe(6);
  });

  it("CONTROLE POSITIVO — com a semana 21 selecionada, os dois lançamentos entram", () => {
    const q = quadro(
      disciplina(30, [lancamento("2026-05-12", 6), lancamento("2026-05-18", 6)]),
      TERCA_DA_SEMANA_20,
      "2026-05-24",
    );

    expect(q.chAcumulada).toBe(12);
  });
});

describe("`Q-2` · lançamento com data futura CONTA, e vem marcado", () => {
  it("o futuro dentro do corte entra no acumulado E aparece em `taLancadoAFrente`", () => {
    const q = quadro(
      disciplina(30, [lancamento("2026-05-11", 4), lancamento("2026-05-15", 6)]),
      TERCA_DA_SEMANA_20,
    );

    // ⚠️ NÃO há corte por `hoje`: os 6 TA de sexta-feira estão no número (`FR-028.1`).
    expect(q.chAcumulada).toBe(10);
    expect(q.percentual).toBe(33);
    expect(q.situacao).toBe("em_andamento");
    // ⚠️ E a tela sabe quais são, para distinguir do já executado.
    expect(q.taLancadoAFrente).toBe(6);
  });

  it("lançamento do PRÓPRIO DIA não é «à frente» — a comparação é estrita", () => {
    const q = quadro(disciplina(30, [lancamento(TERCA_DA_SEMANA_20, 6)]), TERCA_DA_SEMANA_20);

    expect(q.chAcumulada).toBe(6);
    expect(q.taLancadoAFrente).toBe(0);
  });

  it("mudar `hoje` NÃO muda o acumulado — só a marca", () => {
    const d = disciplina(30, [lancamento("2026-05-11", 4), lancamento("2026-05-15", 6)]);

    const antes = quadro(d, "2026-05-10");
    const depois = quadro(d, "2026-05-20");

    expect(antes.chAcumulada).toBe(10);
    expect(depois.chAcumulada).toBe(10);
    expect(antes.taLancadoAFrente).toBe(10);
    expect(depois.taLancadoAFrente).toBe(0);
  });
});

describe("`RN-DEG-01` · prevista 0 degrada para `null`, nunca para zero", () => {
  it("currículo por competências (prevista 0) dá percentual `null`", () => {
    const q = quadro(disciplina(0, [lancamento("2026-05-12", 4)]));

    // ⚠️ `0 %` aqui seria afirmação sobre execução; o que falta é denominador.
    expect(q.percentual).toBeNull();
    expect(q.chAcumulada).toBe(4);
    expect(q.chRestante).toBe(0);
    expect(q.situacao).toBe("concluida");
  });

  it("prevista 0 e nenhum lançamento continua `aguardando_inicio`, com percentual `null`", () => {
    const q = quadro(disciplina(0, []));

    expect(q.situacao).toBe("aguardando_inicio");
    expect(q.percentual).toBeNull();
  });

  it("CONTROLE NEGATIVO — com prevista, o zero executado é 0 % de verdade", () => {
    const q = quadro(disciplina(30, []));

    expect(q.percentual).toBe(0);
    // E é a SITUAÇÃO que diz "não começou", não o percentual.
    expect(q.situacao).toBe("aguardando_inicio");
  });
});

describe("`RF-DSA-05` · a precedência isolada, sem a soma", () => {
  it("os quatro degraus saem na ordem escrita", () => {
    const base = { chPrevista: 30, chAcumulada: 30, temConflito: false, atrasada: false };

    expect(situacaoDaDisciplina({ ...base, temLancamento: false })).toBe("aguardando_inicio");
    expect(situacaoDaDisciplina({ ...base, temLancamento: true, temConflito: true })).toBe(
      "conflitou",
    );
    expect(situacaoDaDisciplina({ ...base, temLancamento: true })).toBe("concluida");
    expect(situacaoDaDisciplina({ ...base, temLancamento: true, chAcumulada: 29 })).toBe(
      "em_andamento",
    );
  });

  it("sem lançamento VENCE o conflito — ausência de dado vem antes de tudo", () => {
    const s = situacaoDaDisciplina({
      temLancamento: false,
      temConflito: true,
      chPrevista: 30,
      chAcumulada: 0,
      atrasada: false,
    });

    expect(s).toBe("aguardando_inicio");
  });
});

/*
 * ⚠️ **`atrasada` — item 8 da conferência do PR #40** (decisão de Bernardo Villas Boas, 08/10/2026):
 * *"já deveria ter iniciado e não iniciou […] OU já deveria ter terminado e não concluiu […]. Sem
 * datas de previsão: não marca atrasada (RN-DEG-01). Só na disciplina, NÃO na cascata por UE."*
 *
 * ⚠️ **AS DATAS SÃO AS DA SEMANA 20 DE 2026**, as mesmas do resto do arquivo: o corte é o domingo
 * 17/05 e "hoje" é a terça 12/05 quando o caso precisa de hoje dentro da semana.
 */
describe("item 8 · `estaAtrasada` — as duas metades da regra, cada uma com a sua data", () => {
  const base = {
    previsaoInicio: null,
    previsaoTermino: null,
    referencia: TERCA_DA_SEMANA_20,
    chPrevista: 30,
  };

  it("NÃO INICIOU: previsão de início passou e nada lançado → atrasada", () => {
    expect(estaAtrasada({ ...base, previsaoInicio: "2026-05-04", chAcumulada: 0 })).toBe(true);
  });

  it("CONTROLE — previsão de início passou mas JÁ lançou → não atrasada pelo início", () => {
    expect(estaAtrasada({ ...base, previsaoInicio: "2026-05-04", chAcumulada: 1 })).toBe(false);
  });

  it("NÃO CONCLUIU: previsão de término passou e lançada < prevista → atrasada", () => {
    expect(estaAtrasada({ ...base, previsaoTermino: "2026-05-08", chAcumulada: 29 })).toBe(true);
  });

  it("CONTROLE — término passou com a prevista cumprida (ou passada) → não atrasada", () => {
    expect(estaAtrasada({ ...base, previsaoTermino: "2026-05-08", chAcumulada: 30 })).toBe(false);
    expect(estaAtrasada({ ...base, previsaoTermino: "2026-05-08", chAcumulada: 34 })).toBe(false);
  });

  it("«já passou» é ESTRITO: no próprio dia da previsão ainda não é atraso", () => {
    expect(estaAtrasada({ ...base, previsaoInicio: TERCA_DA_SEMANA_20, chAcumulada: 0 })).toBe(
      false,
    );
    expect(estaAtrasada({ ...base, previsaoTermino: TERCA_DA_SEMANA_20, chAcumulada: 10 })).toBe(
      false,
    );
  });

  it("previsão no FUTURO não é atraso, nas duas metades", () => {
    expect(
      estaAtrasada({
        ...base,
        previsaoInicio: "2026-06-01",
        previsaoTermino: "2026-07-01",
        chAcumulada: 0,
      }),
    ).toBe(false);
  });

  it("`RN-DEG-01` — SEM DATAS não marca, nem com nada lançado nem com quase tudo", () => {
    expect(estaAtrasada({ ...base, chAcumulada: 0 })).toBe(false);
    expect(estaAtrasada({ ...base, chAcumulada: 29 })).toBe(false);
    // Texto vazio vale como ausência — e `undefined` também (campo opcional na entrada).
    expect(estaAtrasada({ ...base, previsaoInicio: "", previsaoTermino: "", chAcumulada: 0 })).toBe(
      false,
    );
    expect(
      estaAtrasada({
        ...base,
        previsaoInicio: undefined,
        previsaoTermino: undefined,
        chAcumulada: 0,
      }),
    ).toBe(false);
  });

  it("uma data ausente não desliga a outra metade", () => {
    // Só término, e ele passou com a disciplina por terminar.
    expect(
      estaAtrasada({
        ...base,
        previsaoInicio: null,
        previsaoTermino: "2026-05-08",
        chAcumulada: 5,
      }),
    ).toBe(true);
    // Só início, e ele passou sem lançamento.
    expect(
      estaAtrasada({
        ...base,
        previsaoInicio: "2026-05-04",
        previsaoTermino: null,
        chAcumulada: 0,
      }),
    ).toBe(true);
  });

  it("prevista 0 (competências): o término nunca atrasa — não há o que faltar", () => {
    expect(
      estaAtrasada({ ...base, chPrevista: 0, previsaoTermino: "2026-05-08", chAcumulada: 0 }),
    ).toBe(false);
  });
});

describe("item 8 · a PRECEDÊNCIA da `atrasada` entre as cinco situações", () => {
  const base = { chPrevista: 30, temConflito: false };

  it("sem lançamento e atrasada → `atrasada` (não `aguardando_inicio`)", () => {
    expect(
      situacaoDaDisciplina({ ...base, temLancamento: false, chAcumulada: 0, atrasada: true }),
    ).toBe("atrasada");
  });

  it("com lançamento, em andamento e atrasada → `atrasada` vence `em_andamento`", () => {
    expect(
      situacaoDaDisciplina({ ...base, temLancamento: true, chAcumulada: 10, atrasada: true }),
    ).toBe("atrasada");
  });

  it("⚠️ `conflitou` CONTINUA vencendo, inclusive a atrasada", () => {
    expect(
      situacaoDaDisciplina({
        ...base,
        temLancamento: true,
        temConflito: true,
        chAcumulada: 10,
        atrasada: true,
      }),
    ).toBe("conflitou");
  });

  it("⚠️ CONCLUÍDA NUNCA É ATRASADA — mesmo se alguém mandar `atrasada: true`", () => {
    expect(
      situacaoDaDisciplina({ ...base, temLancamento: true, chAcumulada: 30, atrasada: true }),
    ).toBe("concluida");
  });
});

describe("item 8 · o quadro da disciplina, com as datas de previsão", () => {
  function comPrevisao(
    lancamentos: readonly LancamentoParaSituacao[],
    previsaoInicio: string | null,
    previsaoTermino: string | null,
  ): DisciplinaParaSituacao {
    return { ...disciplina(30, lancamentos), previsaoInicio, previsaoTermino };
  }

  /*
   * ⚠️ **O CASO QUE DISCRIMINA** (DoD 8): a MESMA disciplina, os MESMOS lançamentos e a MESMA semana,
   * com e sem a previsão de término. Sem a regra nova as duas saem `em_andamento`; com ela, a que tem
   * o término no passado sai `atrasada` e a outra continua `em_andamento`.
   */
  it("o par: término passado → `atrasada`; sem datas → `em_andamento`", () => {
    const lancamentos = [lancamento("2026-05-11", 8)];

    const comData = quadro(
      comPrevisao(lancamentos, "2026-04-01", "2026-05-08"),
      TERCA_DA_SEMANA_20,
    );
    const semData = quadro(comPrevisao(lancamentos, null, null), TERCA_DA_SEMANA_20);

    expect(comData.situacao).toBe("atrasada");
    expect(semData.situacao).toBe("em_andamento");
    // O atraso não mexe em número nenhum (`RN-DEG-02`: alerta, nunca bloqueio).
    expect(comData.chAcumulada).toBe(semData.chAcumulada);
    expect(comData.percentual).toBe(semData.percentual);
  });

  it("não iniciou: início passado e nada lançado até o corte → `atrasada`", () => {
    const q = quadro(comPrevisao([], "2026-05-04", "2026-06-30"), TERCA_DA_SEMANA_20);

    expect(q.situacao).toBe("atrasada");
  });

  it("disciplina concluída com o término passado continua `concluida`", () => {
    const q = quadro(
      comPrevisao([lancamento("2026-05-11", 30)], "2026-04-01", "2026-05-08"),
      TERCA_DA_SEMANA_20,
    );

    expect(q.situacao).toBe("concluida");
  });

  it("conflito com término passado sai `conflitou`", () => {
    const q = quadro(
      comPrevisao([lancamento("2026-05-11", 8, true)], "2026-04-01", "2026-05-08"),
      TERCA_DA_SEMANA_20,
    );

    expect(q.situacao).toBe("conflitou");
  });

  /*
   * ⚠️ **A REFERÊNCIA É `min(hoje, ateODia)`.** Numa semana PASSADA, a previsão é comparada com o fim
   * daquela semana — a situação da semana 20 é a que a semana 20 tinha; numa semana FUTURA, com hoje.
   */
  it("semana PASSADA: uma previsão posterior ao fim da semana não acusa atraso naquela semana", () => {
    // Hoje é 01/06; a previsão de início era 25/05 — depois do fim da semana 20 (17/05).
    const d = comPrevisao([], "2026-05-25", "2026-06-30");

    expect(quadro(d, "2026-06-01").situacao).toBe("aguardando_inicio");
    // CONTROLE — na semana 22 (até 31/05), a mesma previsão já passou, e a disciplina está atrasada.
    expect(quadro(d, "2026-06-01", "2026-05-31").situacao).toBe("atrasada");
  });

  it("semana FUTURA: quem decide é HOJE, não o fim da semana aberta", () => {
    // Hoje é 12/05; a semana aberta vai até 31/05; o término previsto é 20/05 — ainda não passou HOJE.
    const d = comPrevisao([lancamento("2026-05-11", 8)], "2026-04-01", "2026-05-20");

    expect(quadro(d, TERCA_DA_SEMANA_20, "2026-05-31").situacao).toBe("em_andamento");
  });
});

/*
 * ⚠️ **A UNIDADE DE ENSINO — a cascata da situação por disciplina** (item 3 do comando de correções
 * do DSA, 08/10/2026). A regra é a do `P-3` da planilha de controle: *"AGUARDANDO INÍCIO, FALTA
 * (lançou menos que a CH), CONCLUÍDO (igual) e PASSOU (lançou mais)"*, com a palavra *Em andamento*
 * do `RF-DSA-05` no lugar de *Falta*.
 *
 * ⚠️ **AS CH TAMBÉM SÃO SINTÉTICAS**: 20 de prevista para que 11, 20 e 23 caiam um em cada degrau.
 */
describe("`P-3` · a situação da UNIDADE DE ENSINO — os quatro degraus da planilha", () => {
  it("nada lançado fica `aguardando_inicio`, com o restante igual à prevista", () => {
    const q = quadroDaUnidade({ chPrevista: 20, chLancada: 0 });

    expect(q.situacao).toBe("aguardando_inicio");
    expect(q.chLancada).toBe(0);
    expect(q.chRestante).toBe(20);
  });

  it("lançou menos que a CH fica `em_andamento` — o «FALTA» da planilha", () => {
    const q = quadroDaUnidade({ chPrevista: 20, chLancada: 11 });

    expect(q.situacao).toBe("em_andamento");
    expect(q.chPrevista).toBe(20);
    expect(q.chLancada).toBe(11);
    expect(q.chRestante).toBe(9);
  });

  it("lançou exatamente a CH fica `concluida`, com restante 0", () => {
    const q = quadroDaUnidade({ chPrevista: 20, chLancada: 20 });

    expect(q.situacao).toBe("concluida");
    expect(q.chRestante).toBe(0);
  });

  it("lançou MAIS fica `passou` — e o restante é 0, NUNCA negativo", () => {
    const q = quadroDaUnidade({ chPrevista: 20, chLancada: 23 });

    expect(q.situacao).toBe("passou");
    // ⚠️ O `ta_saldo` da view daria −3 aqui; quem diz o excesso é a situação, não o restante.
    expect(q.chRestante).toBe(0);
    expect(q.chLancada).toBe(23);
  });
});

describe("`RN-DIST-03` · o `passou` da UE é o MESMO fato do alerta `ue_passou`", () => {
  /*
   * ⚠️ **O PAR QUE DISCRIMINA.** Um TA acima da prevista separa *passou* de *concluída*; na prevista
   * exata, não. E nos dois lados a situação concorda com `avaliarAUnidade` — que é quem alerta no
   * lançamento. Se um dia o alerta ganhar tolerância, este caso mostra se a situação foi junto.
   */
  it("um TA acima da prevista é `passou` E alerta; na prevista exata é `concluida` E cala", () => {
    expect(situacaoDaUnidade({ chPrevista: 10, chLancada: 11 })).toBe("passou");
    expect(avaliarAUnidade({ chPrevista: 10, chLancada: 11 }).alertas).toHaveLength(1);

    expect(situacaoDaUnidade({ chPrevista: 10, chLancada: 10 })).toBe("concluida");
    expect(avaliarAUnidade({ chPrevista: 10, chLancada: 10 }).alertas).toHaveLength(0);
  });
});

describe("`RF-DSA-05` · a UE reaproveita a precedência da disciplina, sem o conflito", () => {
  it("os três degraus comuns saem iguais aos de `situacaoDaDisciplina`", () => {
    for (const [prevista, lancada] of [
      [20, 0],
      [20, 7],
      [20, 20],
    ] as const) {
      expect(situacaoDaUnidade({ chPrevista: prevista, chLancada: lancada })).toBe(
        situacaoDaDisciplina({
          temLancamento: lancada > 0,
          temConflito: false,
          chPrevista: prevista,
          chAcumulada: lancada,
          atrasada: false,
        }),
      );
    }
  });

  it("a UE nunca sai `conflitou` — a ocupação não diz em que UE o lançamento caiu", () => {
    const casos = [
      [20, 0],
      [20, 7],
      [20, 20],
      [20, 30],
    ] as const;
    const situacoes = casos.map(([chPrevista, chLancada]) =>
      situacaoDaUnidade({ chPrevista, chLancada }),
    );

    expect(situacoes).toEqual(["aguardando_inicio", "em_andamento", "concluida", "passou"]);
    expect(situacoes).not.toContain("conflitou");
    // ⚠️ E nunca `atrasada` (item 8: "só na disciplina, NÃO na cascata por UE").
    expect(situacoes).not.toContain("atrasada");
  });
});

describe("`RN-DEG-01` · a entrada da UE vem do PostgREST, e degrada para neutro", () => {
  it("lançada nula é nada lançado, e prevista em texto é número", () => {
    // ⚠️ `ta_executados` da view é `number | null` no tipo gerado; `numeric` chega como texto.
    const q = quadroDaUnidade({
      chPrevista: "20" as unknown as number,
      chLancada: null as unknown as number,
    });

    expect(q.situacao).toBe("aguardando_inicio");
    expect(q.chPrevista).toBe(20);
    expect(q.chLancada).toBe(0);
    expect(q.chRestante).toBe(20);
  });
});
