/**
 * `RF-HOR-04` · `RF-HOR-06` · `RN-CONF-02` · `SC-011` — o relógio do TA e o horário do bloco.
 *
 * ⚠️ **OS NÚMEROS ESPERADOS NÃO FORAM ESCRITOS AQUI: eles vêm de `relogio-real.ts`**, que carrega as
 * grades medidas por Bernardo em 15 planilhas e as cinco configurações lidas do banco remoto. Um
 * teste que inventa o esperado prova que o código faz o que o código faz.
 */

import { describe, expect, it } from "vitest";

import {
  relogioDaSemana,
  relogioDoCatalogo,
  relogioDoRegime,
  slotDoEstudoIndividual,
  tempoDeAula,
  trechosDoBloco,
  type RegimeParaRelogio,
  type Relogio,
} from "@/lib/dominio/dsa/horario-do-bloco";
import {
  CATALOGO,
  G45,
  G45_ESPERADA,
  G45_EXCECAO,
  G50,
  G50_ESPERADA,
  G50_EXCECAO,
  MANHA_ESPERADA,
  TEMPOS_POR_CONFIGURACAO,
} from "./relogio-real";

/** `HH:MM-HH:MM` de cada TA, na ordem — o formato das listas esperadas. */
function janelas(regime: RegimeParaRelogio): readonly string[] {
  const relogio = relogioDoRegime(regime);
  expect(relogio, "o regime devia produzir relógio").not.toBeNull();
  return (relogio?.tempos ?? []).map((t) => `${t.inicio}-${t.fim}`);
}

describe("`RF-HOR-06` · a G45 inteira, derivada do regime", () => {
  it("os 12 TA saem exatamente como a operação os usa", () => {
    expect(janelas(G45)).toEqual(G45_ESPERADA);
  });

  it("a manhã tem CINCO TA, e o quinto encerra 11:55 — derivado pelo limite de 12:00", () => {
    const relogio = relogioDoRegime(G45);
    const manha = relogio?.tempos.filter((t) => t.periodo === "manha") ?? [];
    expect(manha).toHaveLength(MANHA_ESPERADA.G45);
    expect(manha[manha.length - 1]?.fim).toBe("11:55");
  });

  it("acima de `regimeTempos` o TA existe e é `excepcional` — o 9º da `RF-HOR-03.1`", () => {
    const relogio = relogioDoRegime(G45);
    expect(relogio?.tempos[7]?.tipo).toBe("normal"); // o 8º, dentro do regime de 8
    expect(relogio?.tempos[8]?.tipo).toBe("excepcional"); // o 9º
  });

  it("na vigência de exceção (9 TA), o 9º passa a ser `normal`", () => {
    const relogio = relogioDoRegime(G45_EXCECAO);
    expect(relogio?.tempos[8]?.tipo).toBe("normal");
    expect(janelas(G45_EXCECAO)).toEqual(G45_ESPERADA);
  });
});

describe("`RF-HOR-06` · a G50 inteira, derivada do regime", () => {
  it("os 12 TA saem exatamente como a operação os usa", () => {
    expect(janelas(G50)).toEqual(G50_ESPERADA);
  });

  it("a manhã tem QUATRO TA, e o quarto encerra 12:00 em ponto", () => {
    const relogio = relogioDoRegime(G50);
    const manha = relogio?.tempos.filter((t) => t.periodo === "manha") ?? [];
    expect(manha).toHaveLength(MANHA_ESPERADA.G50);
    expect(manha[manha.length - 1]?.fim).toBe("12:00");
  });

  it("o intervalo da manhã (10 min) difere do da tarde (5 min), e os dois são respeitados", () => {
    const relogio = relogioDoRegime(G50);
    expect(relogio?.tempos[0]?.fim).toBe("09:00");
    expect(relogio?.tempos[1]?.inicio).toBe("09:10"); // +10 de manhã
    expect(relogio?.tempos[4]?.fim).toBe("13:55");
    expect(relogio?.tempos[5]?.inicio).toBe("14:00"); // +5 à tarde
  });
});

describe("`RN-CONF-02` · o catálogo é LIDO, nunca recalculado", () => {
  for (const [codigo, linhas] of Object.entries(CATALOGO)) {
    it(`${codigo} devolve os ${TEMPOS_POR_CONFIGURACAO[codigo]} TA com as horas armazenadas`, () => {
      const relogio = relogioDoCatalogo(linhas, 8);
      expect(relogio?.origem).toBe("catalogo");
      expect(relogio?.tempos).toHaveLength(TEMPOS_POR_CONFIGURACAO[codigo] ?? 0);
      for (const linha of linhas) {
        const ta = relogio?.tempos.find((t) => t.numero === linha.tempoNumero);
        expect(`${ta?.inicio}-${ta?.fim}`).toBe(`${linha.horaInicio}-${linha.horaFim}`);
      }
    });
  }

  it("a CFG-D traz o `excepcional` do banco, não um derivado", () => {
    const relogio = relogioDoCatalogo(CATALOGO["CFG-D"] ?? [], 9);
    const nono = relogio?.tempos.find((t) => t.numero === 9);
    expect(nono?.tipo).toBe("excepcional");
    expect(`${nono?.inicio}-${nono?.fim}`).toBe("16:40-17:25");
  });

  it("⚠️ a CFG-E tem CINCO TA de manhã e o quinto encerra 12:05 — e é por isso que a derivação para em 12:00", () => {
    const doCatalogo = relogioDoCatalogo(CATALOGO["CFG-E"] ?? [], 8);
    const manhaLida = doCatalogo?.tempos.filter((t) => t.periodo === "manha") ?? [];
    expect(manhaLida).toHaveLength(5);
    expect(manhaLida[4]?.fim).toBe("12:05");

    // Derivar dos MESMOS parâmetros daria QUATRO — a janela de almoço preservada.
    const comoRegime: RegimeParaRelogio = {
      regimeTempos: 8,
      taDuracaoMin: 45,
      intervaloManhaMin: 5,
      intervaloTardeMin: 5,
      horaInicioManha: "08:00",
      horaInicioTarde: "13:00",
      configuracaoHorarioId: null,
    };
    const derivado = relogioDoRegime(comoRegime);
    expect(derivado?.tempos.filter((t) => t.periodo === "manha")).toHaveLength(4);
  });
});

describe("a precedência entre as duas fontes", () => {
  it("o catálogo vence quando a vigência o aponta", () => {
    const relogio = relogioDaSemana({
      regime: { ...G45, configuracaoHorarioId: "alguma-config" },
      catalogo: CATALOGO["CFG-C"] ?? [],
    });
    expect(relogio?.origem).toBe("catalogo");
    expect(relogio?.tempos[0]?.inicio).toBe("08:00");
  });

  it("o regime vence quando a vigência NÃO aponta — é o que a `Q-6` usa", () => {
    const relogio = relogioDaSemana({ regime: G45, catalogo: CATALOGO["CFG-C"] ?? [] });
    expect(relogio?.origem).toBe("regime");
    expect(relogio?.tempos[0]?.inicio).toBe("07:50");
  });

  it("aponta, mas o catálogo não chegou: cai no regime em vez de ficar sem relógio", () => {
    const relogio = relogioDaSemana({
      regime: { ...G45, configuracaoHorarioId: "alguma-config" },
      catalogo: [],
    });
    expect(relogio?.origem).toBe("regime");
  });
});

describe("`RN-DEG-01` · sem relógio é `null`, nunca zero", () => {
  it("regime EAD (0 tempos, horas nulas) devolve `null`", () => {
    const ead: RegimeParaRelogio = {
      regimeTempos: 0,
      taDuracaoMin: 0,
      intervaloManhaMin: 0,
      intervaloTardeMin: 0,
      horaInicioManha: null,
      horaInicioTarde: null,
      configuracaoHorarioId: null,
    };
    expect(relogioDoRegime(ead)).toBeNull();
    expect(relogioDaSemana({ regime: ead, catalogo: [] })).toBeNull();
  });

  it("regime sem nenhum lado devolve `null`", () => {
    expect(relogioDaSemana({ regime: null, catalogo: [] })).toBeNull();
  });

  it("hora fora de formato devolve `null`, não `Invalid Date`", () => {
    expect(relogioDoRegime({ ...G45, horaInicioManha: "sete e meia" })).toBeNull();
    expect(relogioDoRegime({ ...G45, horaInicioManha: "25:00" })).toBeNull();
  });
});

describe("`SC-011` · o bloco que atravessa o almoço sai em DOIS trechos — corrige o `D-3`", () => {
  it("4 TA começando no 3º tempo da G45: «09:30 às 11:55» e «13:05 às 13:50»", () => {
    const relogio = relogioDoRegime(G45);
    expect(relogio).not.toBeNull();
    const trechos = trechosDoBloco(relogio!, 3, 4);
    expect(trechos.map((t) => `${t.inicio}-${t.fim}`)).toEqual(["09:30-11:55", "13:05-13:50"]);
    expect(trechos.map((t) => t.periodo)).toEqual(["manha", "tarde"]);
  });

  it("⚠️ NUNCA «09:30 às 13:50» — o horário contínuo é o defeito medido 64 vezes no CAHO", () => {
    const relogio = relogioDoRegime(G45);
    const trechos = trechosDoBloco(relogio!, 3, 4);
    expect(trechos).toHaveLength(2);
    expect(trechos.map((t) => `${t.inicio}-${t.fim}`)).not.toContain("09:30-13:50");
  });

  it("bloco todo de manhã sai em UM trecho, com o intervalo dentro dele", () => {
    const relogio = relogioDoRegime(G45);
    expect(trechosDoBloco(relogio!, 1, 2).map((t) => `${t.inicio}-${t.fim}`)).toEqual([
      "07:50-09:25",
    ]);
  });

  it("bloco de 1 TA sai em UM trecho", () => {
    const relogio = relogioDoRegime(G50);
    expect(trechosDoBloco(relogio!, 6, 1).map((t) => `${t.inicio}-${t.fim}`)).toEqual([
      "14:00-14:50",
    ]);
  });

  it("bloco que passa do último TA devolve lista VAZIA — a tela mostra sem horário", () => {
    const relogio = relogioDoRegime(G45);
    expect(trechosDoBloco(relogio!, 12, 2)).toEqual([]);
    expect(trechosDoBloco(relogio!, 0, 1)).toEqual([]);
    expect(trechosDoBloco(relogio!, 1, 0)).toEqual([]);
  });
});

describe("`D-4` · o Estudo Individual vai para o slot seguinte ao último TA lançado", () => {
  it("⚠️ reproduz o C-Espc-HN EXATAMENTE nos dois casos medidos", () => {
    const comSete = relogioDoRegime(G50);
    const slot7 = slotDoEstudoIndividual(7);
    expect(slot7).toBe(8);
    expect(trechosDoBloco(comSete!, slot7!, 1).map((t) => `${t.inicio}-${t.fim}`)).toEqual([
      "15:50-16:40",
    ]);

    const comOito = relogioDoRegime(G50_EXCECAO);
    const slot8 = slotDoEstudoIndividual(8);
    expect(slot8).toBe(9);
    expect(trechosDoBloco(comOito!, slot8!, 1).map((t) => `${t.inicio}-${t.fim}`)).toEqual([
      "16:45-17:35",
    ]);
  });

  it("⚠️ e DIVERGE do CAHO e do C-Ap-HN — medido, registrado, não corrigido (`plan.md` §7.3)", () => {
    // CAHO, 8 TA: a regra dá 15:35-16:20; a planilha traz 15:40-16:25 (5 min de diferença).
    const g45 = relogioDoRegime(G45);
    expect(
      trechosDoBloco(g45!, slotDoEstudoIndividual(8)!, 1).map((t) => `${t.inicio}-${t.fim}`),
    ).toEqual(["15:35-16:20"]);
    // C-Ap-HN, 9 TA: o início bate (16:25) e o fim difere 10 min (a planilha traz 17:20).
    const g45ex = relogioDoRegime(G45_EXCECAO);
    const trecho = trechosDoBloco(g45ex!, slotDoEstudoIndividual(9)!, 1)[0];
    expect(trecho?.inicio).toBe("16:25");
    expect(trecho?.fim).toBe("17:10");
  });

  it("dia sem lançamento nenhum: o EI é o 1º TA", () => {
    expect(slotDoEstudoIndividual(null)).toBe(1);
  });

  it("dia já cheio até o 12º: `null`, e a tela não inventa um 13º", () => {
    expect(slotDoEstudoIndividual(12)).toBeNull();
    expect(slotDoEstudoIndividual(0)).toBeNull();
  });
});

/**
 * ⚠️ **D1 DA VIRADA-1** *(decisão de Bernardo Villas Boas, 06/10/2026)*: quando o Estudo Individual
 * da turma tem um horário que a tabela HORÁRIOS da planilha não cobre e o regime não representa
 * (C-Exp-Ag-Mag: `16:50–17:30`, um tempo de 40 min; C-Ap-HN: `16:25–17:20`), o horário vive no
 * **catálogo**, como tempo `excepcional` depois do último TA do regime — e o catálogo é **lido,
 * nunca recalculado**. O `CFG-F` é o primeiro: a tabela da planilha mais o EI como 9º tempo.
 * Medido na onda 1: 8 blocos de EI do C-Exp-Ag-Mag divergiam da IMPRESSÃO; com o CFG-F, zero.
 */
describe("D1 · o Estudo Individual fora da tabela HORÁRIOS vem do catálogo, como tempo excepcional", () => {
  const CFG_F = [
    ...[
      ["08:10", "09:00"],
      ["09:10", "10:00"],
      ["10:10", "11:00"],
      ["11:10", "12:00"],
    ].map(([inicio, fim], i) => ({
      tempoNumero: i + 1,
      periodo: "manha" as const,
      tipoTempo: "normal" as const,
      horaInicio: inicio as string,
      horaFim: fim as string,
    })),
    ...[
      ["13:05", "13:55"],
      ["14:00", "14:50"],
      ["14:55", "15:45"],
      ["15:50", "16:40"],
    ].map(([inicio, fim], i) => ({
      tempoNumero: i + 5,
      periodo: "tarde" as const,
      tipoTempo: "normal" as const,
      horaInicio: inicio as string,
      horaFim: fim as string,
    })),
    {
      tempoNumero: 9,
      periodo: "tarde" as const,
      tipoTempo: "excepcional" as const,
      horaInicio: "16:50",
      horaFim: "17:30",
    },
  ];

  it("com 8 TA lançados, o EI cai no 9º e sai com o horário do catálogo — 16:50–17:30, não 16:45–17:35", () => {
    const relogio = relogioDoCatalogo(CFG_F, 8);
    expect(relogio).not.toBeNull();
    const slot = slotDoEstudoIndividual(8);
    expect(slot).toBe(9);
    const ei = tempoDeAula(relogio as Relogio, slot as number);
    expect(ei).toMatchObject({ inicio: "16:50", fim: "17:30", tipo: "excepcional" });
  });

  it("⚠️ o caso que discrimina: o mesmo regime SEM catálogo deriva 16:45–17:35 — é por isso que o catálogo existe", () => {
    const derivado = relogioDoRegime({
      regimeTempos: 8,
      taDuracaoMin: 50,
      intervaloManhaMin: 10,
      intervaloTardeMin: 5,
      horaInicioManha: "08:10",
      horaInicioTarde: "13:05",
      configuracaoHorarioId: null,
    });
    expect(tempoDeAula(derivado as Relogio, 9)).toMatchObject({ inicio: "16:45", fim: "17:35" });
  });

  it("os oito tempos do catálogo são os da tabela HORÁRIOS da planilha, tempo a tempo", () => {
    const relogio = relogioDoCatalogo(CFG_F, 8) as Relogio;
    expect(relogio.tempos.slice(0, 8).map((t) => `${t.inicio}-${t.fim}`)).toEqual(
      relogioDoRegime({
        regimeTempos: 8,
        taDuracaoMin: 50,
        intervaloManhaMin: 10,
        intervaloTardeMin: 5,
        horaInicioManha: "08:10",
        horaInicioTarde: "13:05",
        configuracaoHorarioId: null,
      })
        ?.tempos.slice(0, 8)
        .map((t) => `${t.inicio}-${t.fim}`),
    );
  });
});
