/**
 * `RN-EVT-02` · `FR-007` · critério **6** — a capacidade da semana e o desconto por feriado.
 *
 * ⚠️ **OS FERIADOS DESTE ARQUIVO SÃO LINHAS REAIS DA ORIGEM**, lidas de
 * `scripts/etl/dados/bruto/v20/Calendario_Feriados.csv` em 05/10/2026 (26 linhas, 25 datas
 * distintas): **24 `Dia_Inteiro`** e **2 `Informativo`**. Inventar feriado deixaria de provar o que
 * a operação realmente tem — a data repetida, o ponto facultativo marcado como dia inteiro e os dois
 * informativos caídos em **domingo**.
 *
 * ⚠️ **E É POR ISSO QUE `parcial` E `informativo` APARECEM AQUI COMO IMPACTO TROCADO DE UMA LINHA
 * REAL:** medido, a origem **não tem nenhuma** linha `parcial`, e as duas `Informativo` são
 * `2026-08-09` e `2026-11-15`, **os dois domingos** — dia que a grade do DSA não desenha. Trocar só
 * o impacto da mesma linha, na mesma semana, é também **o caso que discrimina** (DoD 8): o veredito
 * vira, e nada mais muda.
 *
 * ⚠️ **`TA_POR_DIA = 8` NÃO É NÚMERO ESCOLHIDO:** é o regime vigente medido do `C-Ap-FR 2026`,
 * registrado em `specs/012-navegacao-e-turmas/roteiro-de-conferencia-pr3.md` (*"a capacidade diária
 * 8 TA/dia"*).
 */

import { describe, expect, it } from "vitest";

import { capacidadeDaSemana, type FeriadoDaSemana } from "@/lib/dominio/dsa/capacidade";

/** O regime vigente medido do `C-Ap-FR 2026`. */
const TA_POR_DIA = 8;

/** Segunda a sexta de 26 a 30/10/2026 — a semana que tem **um** feriado real, numa quarta. */
const SEMANA_OUTUBRO = [
  "2026-10-26",
  "2026-10-27",
  "2026-10-28",
  "2026-10-29",
  "2026-10-30",
] as const;

/** Segunda a sexta de 16 a 20/02/2026 — a semana do carnaval, com a **data repetida**. */
const SEMANA_CARNAVAL = [
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
] as const;

/** Segunda a sexta de 16 a 20/11/2026 — sem feriado nenhum **dentro** dela. */
const SEMANA_NOVEMBRO = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
] as const;

/** Segunda a sexta de 16 a 20/03/2026 — a origem não tem feriado nesta semana. */
const SEMANA_MARCO = [
  "2026-03-16",
  "2026-03-17",
  "2026-03-18",
  "2026-03-19",
  "2026-03-20",
] as const;

/* As linhas reais, pelo `ID_Feriado` da origem. */

/** `FER-000024` — **quarta** 28/10/2026, e é o **ponto facultativo** marcado dia inteiro (`D21`). */
const FER_000024: FeriadoDaSemana = {
  data: "2026-10-28",
  descricao: "Dia do Servidor Público federal (ponto facultativo)",
  impacto: "dia_inteiro",
};

/** `FER-000003` — segunda 16/02/2026. A **primeira** das duas linhas desta data. */
const FER_000003: FeriadoDaSemana = {
  data: "2026-02-16",
  descricao: "Feriado nacional (carnaval) (CAHO 2026 - PREENCHIMENTO)",
  impacto: "dia_inteiro",
};

/** `FER-000022` — segunda 16/02/2026, **a mesma data** de `FER-000003`. */
const FER_000022: FeriadoDaSemana = {
  data: "2026-02-16",
  descricao: "Licença administrativa (C-Espc-HN 2026 - PREENCHIMENTO)",
  impacto: "dia_inteiro",
};

/** `FER-000004` — terça 17/02/2026. */
const FER_000004: FeriadoDaSemana = {
  data: "2026-02-17",
  descricao: "Feriado nacional (carnaval) (CAHO 2026 - PREENCHIMENTO)",
  impacto: "dia_inteiro",
};

/** `FER-000005` — quarta 18/02/2026. */
const FER_000005: FeriadoDaSemana = {
  data: "2026-02-18",
  descricao: "Feriado (quarta-feira de cinzas) (CAHO 2026 - PREENCHIMENTO)",
  impacto: "dia_inteiro",
};

/** `FER-000023` — **quinta 12/11/2026**, fora da semana de 16 a 20/11. */
const FER_000023: FeriadoDaSemana = {
  data: "2026-11-12",
  descricao: "Nossa Senhora Aparecida (feriado nacional)",
  impacto: "dia_inteiro",
};

/** `FER-000026` — **domingo 15/11/2026**, dia que a grade não desenha. */
const FER_000026: FeriadoDaSemana = {
  data: "2026-11-15",
  descricao: "Proclamação da República",
  impacto: "informativo",
};

describe("`RN-EVT-02` · os três impactos sobre a MESMA linha e a MESMA semana (critério 6)", () => {
  it("`dia_inteiro` numa quarta: o dia NÃO conta e aparece em `bloqueios` com o motivo", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_OUTUBRO],
      feriados: [FER_000024],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade).not.toBeNull();
    expect(capacidade?.diasUteis).toBe(4);
    expect(capacidade?.ta).toBe(32);
    expect(capacidade?.bloqueios).toEqual([
      { data: "2026-10-28", descricao: "Dia do Servidor Público federal (ponto facultativo)" },
    ]);
    expect(capacidade?.avisos).toEqual([]);
  });

  it("`parcial`: o dia CONTA, não desconta nada e o feriado vira `avisos`", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_OUTUBRO],
      feriados: [{ ...FER_000024, impacto: "parcial" }],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(5);
    expect(capacidade?.ta).toBe(40);
    expect(capacidade?.bloqueios).toEqual([]);
    expect(capacidade?.avisos).toEqual([
      { data: "2026-10-28", descricao: "Dia do Servidor Público federal (ponto facultativo)" },
    ]);
  });

  it("`informativo`: igual ao `parcial` — o dia CONTA e o feriado vira `avisos`", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_OUTUBRO],
      feriados: [{ ...FER_000024, impacto: "informativo" }],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(5);
    expect(capacidade?.ta).toBe(40);
    expect(capacidade?.bloqueios).toEqual([]);
    expect(capacidade?.avisos).toHaveLength(1);
  });

  it("CONTROLE NEGATIVO: semana sem feriado nenhum tem os 5 dias e nenhuma marca", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_MARCO],
      feriados: [],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(5);
    expect(capacidade?.ta).toBe(40);
    expect(capacidade?.bloqueios).toEqual([]);
    expect(capacidade?.avisos).toEqual([]);
  });
});

describe("`RN-EVT-02` · mais de um feriado na semana, e a data repetida da origem", () => {
  it("as três datas de dia inteiro do carnaval tiram três dias: sobram 2 dias e 16 TA", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_CARNAVAL],
      feriados: [FER_000003, FER_000022, FER_000004, FER_000005],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(2);
    expect(capacidade?.ta).toBe(16);
    expect(capacidade?.bloqueios.map((b) => b.data)).toEqual([
      "2026-02-16",
      "2026-02-17",
      "2026-02-18",
    ]);
  });

  it("DUAS LINHAS NA MESMA DATA (`FER-000003` e `FER-000022`) tiram UM dia só", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_CARNAVAL],
      feriados: [FER_000003, FER_000022],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.bloqueios).toHaveLength(1);
    expect(capacidade?.diasUteis).toBe(4);
    expect(capacidade?.ta).toBe(32);
    // Fica a descrição da primeira linha daquela data, na ordem em que ela chegou.
    expect(capacidade?.bloqueios[0]?.descricao).toBe(FER_000003.descricao);
  });

  it("os `bloqueios` saem na ordem dos DIAS, não na ordem em que os feriados chegaram", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_CARNAVAL],
      feriados: [FER_000005, FER_000004, FER_000003],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.bloqueios.map((b) => b.data)).toEqual([
      "2026-02-16",
      "2026-02-17",
      "2026-02-18",
    ]);
  });

  it("data bloqueada NÃO aparece também em `avisos` — a grade não diz as duas coisas", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_OUTUBRO],
      feriados: [FER_000024, { ...FER_000024, descricao: "Aviso", impacto: "informativo" }],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.bloqueios).toHaveLength(1);
    expect(capacidade?.avisos).toEqual([]);
    expect(capacidade?.diasUteis).toBe(4);
  });
});

describe("`RN-EVT-02` · feriado FORA da semana é ignorado", () => {
  it("`FER-000023` (12/11, quinta) não desconta da semana de 16 a 20/11", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_NOVEMBRO],
      feriados: [FER_000023],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(5);
    expect(capacidade?.ta).toBe(40);
    expect(capacidade?.bloqueios).toEqual([]);
  });

  it("`FER-000026` (15/11, domingo) não vira nem aviso — o dia não está na grade", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_NOVEMBRO],
      feriados: [FER_000026],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.avisos).toEqual([]);
    expect(capacidade?.diasUteis).toBe(5);
  });
});

describe("`FR-007` · a semana de 6 dias, com sábado aberto", () => {
  it("o sábado 21/02 entra na conta, e as três datas de carnaval continuam fora", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_CARNAVAL, "2026-02-21"],
      feriados: [FER_000003, FER_000022, FER_000004, FER_000005],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(3);
    expect(capacidade?.ta).toBe(24);
  });

  it("sem feriado, a semana de 6 dias dá 6 dias e 48 TA", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_MARCO, "2026-03-21"],
      feriados: [],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(6);
    expect(capacidade?.ta).toBe(48);
  });
});

describe("`RN-DEG-01` · sem regime a resposta é `null`, nunca zero", () => {
  it("`temposPorDia` nulo devolve `null` — e não uma semana de 0 TA", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_MARCO],
      feriados: [],
      temposPorDia: null,
    });

    expect(capacidade).toBeNull();
  });

  it("`temposPorDia` ZERO devolve `null` — é o valor do regime EAD em `regime_padrao_tempos`", () => {
    expect(
      capacidadeDaSemana({ dias: [...SEMANA_MARCO], feriados: [], temposPorDia: 0 }),
    ).toBeNull();
  });

  it("`temposPorDia` negativo devolve `null`", () => {
    expect(
      capacidadeDaSemana({ dias: [...SEMANA_MARCO], feriados: [], temposPorDia: -8 }),
    ).toBeNull();
  });
});

describe("`FR-007` · a data chega da origem com carimbo de hora", () => {
  it("`2026-10-28 00:00:00` casa com o dia `2026-10-28` — não passa em silêncio", () => {
    const capacidade = capacidadeDaSemana({
      dias: [...SEMANA_OUTUBRO],
      feriados: [{ ...FER_000024, data: "2026-10-28 00:00:00" }],
      temposPorDia: TA_POR_DIA,
    });

    expect(capacidade?.diasUteis).toBe(4);
    expect(capacidade?.bloqueios[0]?.data).toBe("2026-10-28");
  });
});
