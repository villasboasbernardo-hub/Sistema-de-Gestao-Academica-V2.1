/**
 * `RN-CONF-01` **[REVISADA]** · critério **5** da spec 013 — o conflito de horário da grade.
 *
 * ⚠️ **A REGRA É DE *RISCO: ALTO*, E O QUE ELA GANHOU NESTA REVISÃO É JUSTAMENTE O QUE A v1.0 NÃO
 * FAZIA:** cruzar **todas** as turmas. Por isso o caso central deste arquivo é o conflito que chega
 * pela lista de **alheios** — se ele passasse só dentro da própria turma, o teste estaria provando a
 * v1.0 e dizendo que provou a v2.1.
 *
 * ⚠️ **OS CONTROLES NEGATIVOS VALEM TANTO QUANTO OS POSITIVOS AQUI.** O erro barato de escrever é a
 * sobreposição frouxa — um `+ 1` numa comparação, ou `null` casando com `null` — e o sintoma dele é
 * a semana **inteira** em vermelho, que não parece defeito de código: parece grade cheia de problema.
 * Então os casos de TA **adjacente**, de dia diferente e de sala **nula** estão aqui como primeira
 * classe, não como enfeite.
 *
 * ⚠️ **NÃO HÁ NÚMERO MEDIDO A HONRAR NESTE MÓDULO.** Ele não calcula carga nem horário: decide
 * coincidência. Os TA e os identificadores abaixo são sintéticos de propósito, e nenhuma asserção
 * daqui afirma fato sobre a base real.
 */

import { describe, expect, it } from "vitest";

import {
  detectarConflitos,
  seSobrepoem,
  type OcupacaoDeTa,
  type OcupacaoPropria,
} from "@/lib/dominio/dsa/conflitos";

const DIA = "2026-03-02";
const OUTRO_DIA = "2026-03-03";

const INSTRUTOR_ANA = "INS-ANA";
const INSTRUTOR_BENTO = "INS-BENTO";
const INSTRUTOR_CELSO = "INS-CELSO";

/** Um bloco DESTA turma. Os padrões são o mínimo que posiciona na grade. */
function meu(fatoId: string, ajustes: Partial<OcupacaoDeTa> = {}): OcupacaoPropria {
  return {
    fatoId,
    data: DIA,
    taInicial: 1,
    taFinal: 2,
    instrutorId: null,
    fiscalId: null,
    local: null,
    ...ajustes,
  };
}

/** Uma ocupação de OUTRA turma — anônima, como `public.conflitos_da_semana()` a entrega. */
function alheio(ajustes: Partial<OcupacaoDeTa> = {}): OcupacaoDeTa {
  return {
    data: DIA,
    taInicial: 1,
    taFinal: 2,
    instrutorId: null,
    fiscalId: null,
    local: null,
    ...ajustes,
  };
}

describe("`RN-CONF-01` · `seSobrepoem` — o intervalo de TA é fechado nas duas pontas", () => {
  it("TA que se cruzam no mesmo dia se sobrepõem", () => {
    expect(
      seSobrepoem(meu("A", { taInicial: 1, taFinal: 3 }), alheio({ taInicial: 3, taFinal: 5 })),
    ).toBe(true);
  });

  it("um bloco inteiramente dentro do outro se sobrepõe", () => {
    expect(
      seSobrepoem(meu("A", { taInicial: 2, taFinal: 3 }), alheio({ taInicial: 1, taFinal: 5 })),
    ).toBe(true);
  });

  it("TA ADJACENTES não se sobrepõem — termina no 3º, começa no 4º", () => {
    expect(
      seSobrepoem(meu("A", { taInicial: 1, taFinal: 3 }), alheio({ taInicial: 4, taFinal: 6 })),
    ).toBe(false);
    // E na ordem inversa, porque a relação é simétrica.
    expect(
      seSobrepoem(meu("A", { taInicial: 4, taFinal: 6 }), alheio({ taInicial: 1, taFinal: 3 })),
    ).toBe(false);
  });

  it("dias diferentes nunca se sobrepõem, mesmo nos mesmos TA", () => {
    expect(
      seSobrepoem(
        meu("A", { taInicial: 1, taFinal: 4 }),
        alheio({ data: OUTRO_DIA, taInicial: 1, taFinal: 4 }),
      ),
    ).toBe(false);
  });

  it("bloco sem posição não se sobrepõe a ninguém (`RN-DEG-01`)", () => {
    const invertido = meu("A", { taInicial: 5, taFinal: 2 });
    const foraDaFaixa = meu("B", { taInicial: 0, taFinal: 3 });
    const naoInteiro = meu("C", { taInicial: Number.NaN, taFinal: 3 });
    const bom = alheio({ taInicial: 1, taFinal: 12 });

    expect(seSobrepoem(invertido, bom)).toBe(false);
    expect(seSobrepoem(foraDaFaixa, bom)).toBe(false);
    expect(seSobrepoem(naoInteiro, bom)).toBe(false);
  });
});

describe("`RN-CONF-01` · critério 5 — o conflito atravessa a turma", () => {
  it("mesmo instrutor, TA sobrepostos, OUTRA turma: o meu bloco sai marcado", () => {
    const marcas = detectarConflitos(
      [meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA })],
      [alheio({ taInicial: 3, taFinal: 5, instrutorId: INSTRUTOR_ANA })],
    );

    expect(marcas.get("F1")).toEqual({ conflito: "instrutor", alertaSala: false });
  });

  it("dois blocos meus sobrepostos à MESMA ocupação alheia saem os dois marcados", () => {
    const marcas = detectarConflitos(
      [
        meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA }),
        meu("F2", { taInicial: 4, taFinal: 6, instrutorId: INSTRUTOR_ANA }),
      ],
      [alheio({ taInicial: 3, taFinal: 4, instrutorId: INSTRUTOR_ANA })],
    );

    expect(marcas.get("F1")?.conflito).toBe("instrutor");
    expect(marcas.get("F2")?.conflito).toBe("instrutor");
  });

  it("o bloco alheio NÃO entra no mapa — ele chega sem identidade, por contrato", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA })],
      [alheio({ instrutorId: INSTRUTOR_ANA })],
    );

    expect([...marcas.keys()]).toEqual(["F1"]);
  });

  it("TA adjacentes com o mesmo instrutor não produzem marca nenhuma", () => {
    const marcas = detectarConflitos(
      [meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA })],
      [alheio({ taInicial: 4, taFinal: 6, instrutorId: INSTRUTOR_ANA })],
    );

    expect(marcas.size).toBe(0);
  });

  it("dias diferentes com o mesmo instrutor não produzem marca nenhuma", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA })],
      [alheio({ data: OUTRO_DIA, instrutorId: INSTRUTOR_ANA })],
    );

    expect(marcas.size).toBe(0);
  });

  it("instrutores diferentes, TA sobrepostos e sem sala: nada a sinalizar", () => {
    const marcas = detectarConflitos(
      [meu("F1", { taInicial: 1, taFinal: 4, instrutorId: INSTRUTOR_ANA })],
      [alheio({ taInicial: 1, taFinal: 4, instrutorId: INSTRUTOR_BENTO })],
    );

    expect(marcas.size).toBe(0);
  });
});

describe("`RN-CONF-01` · dentro da própria turma, a pessoa também conta", () => {
  it("dois blocos meus sobrepostos com o mesmo instrutor marcam-se mutuamente, sem alheios", () => {
    const marcas = detectarConflitos(
      [
        meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA }),
        meu("F2", { taInicial: 2, taFinal: 4, instrutorId: INSTRUTOR_ANA }),
      ],
      [],
    );

    expect(marcas.get("F1")).toEqual({ conflito: "instrutor", alertaSala: false });
    expect(marcas.get("F2")).toEqual({ conflito: "instrutor", alertaSala: false });
  });

  it("um bloco não é comparado consigo mesmo: sozinho e sem alheios, ele não se marca", () => {
    const marcas = detectarConflitos(
      [meu("F1", { taInicial: 1, taFinal: 4, instrutorId: INSTRUTOR_ANA, local: "Sala 3" })],
      [],
    );

    expect(marcas.size).toBe(0);
  });

  it("dois blocos meus na MESMA SALA não geram alerta de sala — a regra é entre turmas", () => {
    const marcas = detectarConflitos(
      [
        meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA, local: "Sala 3" }),
        meu("F2", { taInicial: 2, taFinal: 4, instrutorId: INSTRUTOR_BENTO, local: "Sala 3" }),
      ],
      [],
    );

    expect(marcas.size).toBe(0);
  });
});

describe("`RN-CONF-01` · a sala é alerta secundário", () => {
  it("mesma sala e pessoas diferentes: `alertaSala`, com `conflito` nulo", () => {
    const marcas = detectarConflitos(
      [meu("F1", { taInicial: 1, taFinal: 3, instrutorId: INSTRUTOR_ANA, local: "Sala 3" })],
      [alheio({ taInicial: 2, taFinal: 4, instrutorId: INSTRUTOR_BENTO, local: "Sala 3" })],
    );

    expect(marcas.get("F1")).toEqual({ conflito: null, alertaSala: true });
  });

  it("a sala casa com caixa e espaço diferentes", () => {
    const marcas = detectarConflitos(
      [meu("F1", { local: "  Sala Azul " })],
      [alheio({ local: "sala azul" })],
    );

    expect(marcas.get("F1")?.alertaSala).toBe(true);
  });

  it("`local` nulo nos dois NÃO casa (`RN-DEG-01`)", () => {
    const marcas = detectarConflitos([meu("F1", { local: null })], [alheio({ local: null })]);

    expect(marcas.size).toBe(0);
  });

  it("`local` só com espaço vale nada, e não casa com outro só com espaço", () => {
    const marcas = detectarConflitos([meu("F1", { local: "   " })], [alheio({ local: " " })]);

    expect(marcas.size).toBe(0);
  });

  it("salas diferentes não casam", () => {
    const marcas = detectarConflitos(
      [meu("F1", { local: "Sala 3" })],
      [alheio({ local: "Sala 4" })],
    );

    expect(marcas.size).toBe(0);
  });

  it("pessoa e sala ao mesmo tempo: as duas marcas, porque os pesos são dois", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA, local: "Sala 3" })],
      [alheio({ instrutorId: INSTRUTOR_ANA, local: "Sala 3" })],
    );

    expect(marcas.get("F1")).toEqual({ conflito: "instrutor", alertaSala: true });
  });
});

describe("`RN-CONF-01` · o fiscal cadastrado cruza; o externo não participa", () => {
  it("a coincidência pelo FISCAL do meu bloco marca `fiscal`", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA, fiscalId: INSTRUTOR_BENTO })],
      [alheio({ instrutorId: INSTRUTOR_BENTO })],
    );

    expect(marcas.get("F1")).toEqual({ conflito: "fiscal", alertaSala: false });
  });

  it("a coincidência pelo instrutor PREVALECE sobre a do fiscal, na mesma célula", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA, fiscalId: INSTRUTOR_BENTO })],
      [alheio({ instrutorId: INSTRUTOR_ANA, fiscalId: INSTRUTOR_BENTO })],
    );

    expect(marcas.get("F1")?.conflito).toBe("instrutor");
  });

  it("o meu instrutor coincidindo com o FISCAL do alheio ainda é `instrutor`", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA })],
      [alheio({ instrutorId: INSTRUTOR_CELSO, fiscalId: INSTRUTOR_ANA })],
    );

    expect(marcas.get("F1")?.conflito).toBe("instrutor");
  });

  it("fiscal EXTERNO não tem `id` e não casa com ninguém — degradação declarada", () => {
    const marcas = detectarConflitos(
      // A avaliação fiscalizada por alguém de fora chega sem `instrutorId` e sem `fiscalId`.
      [meu("F1", { taInicial: 1, taFinal: 4, instrutorId: null, fiscalId: null })],
      [alheio({ taInicial: 1, taFinal: 4, instrutorId: INSTRUTOR_ANA, fiscalId: INSTRUTOR_BENTO })],
    );

    expect(marcas.size).toBe(0);
  });

  it("alheio sem pessoa e sem sala não marca nada", () => {
    const marcas = detectarConflitos(
      [meu("F1", { instrutorId: INSTRUTOR_ANA, local: "Sala 3" })],
      [alheio({ instrutorId: null, fiscalId: null, local: null })],
    );

    expect(marcas.size).toBe(0);
  });
});

describe("`RN-DEG-02` · a função marca, e nunca bloqueia", () => {
  it("não lança e não altera a entrada, mesmo com a grade inteira em conflito", () => {
    const meus = [
      meu("F1", { taInicial: 1, taFinal: 6, instrutorId: INSTRUTOR_ANA, local: "Sala 3" }),
      meu("F2", { taInicial: 1, taFinal: 6, instrutorId: INSTRUTOR_ANA, local: "Sala 3" }),
    ];
    const alheios = [
      alheio({ taInicial: 1, taFinal: 6, instrutorId: INSTRUTOR_ANA, local: "Sala 3" }),
    ];
    const copiaDosMeus = structuredClone(meus);
    const copiaDosAlheios = structuredClone(alheios);

    const marcas = detectarConflitos(meus, alheios);

    expect(marcas.size).toBe(2);
    expect(meus).toEqual(copiaDosMeus);
    expect(alheios).toEqual(copiaDosAlheios);
  });

  it("bloco sem posição sai SEM marca, e o vizinho bem posicionado continua sendo avaliado", () => {
    const marcas = detectarConflitos(
      [
        meu("SEM-POSICAO", { taInicial: 5, taFinal: 2, instrutorId: INSTRUTOR_ANA }),
        meu("F2", { taInicial: 1, taFinal: 4, instrutorId: INSTRUTOR_ANA }),
      ],
      [alheio({ taInicial: 2, taFinal: 3, instrutorId: INSTRUTOR_ANA })],
    );

    expect(marcas.has("SEM-POSICAO")).toBe(false);
    expect(marcas.get("F2")?.conflito).toBe("instrutor");
  });
});
