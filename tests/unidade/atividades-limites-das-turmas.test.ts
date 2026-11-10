/**
 * Bloco 18 (spec 033, RA-9, `FR-006.3` e `FR-007.1`) — o USO DO LIMITE de AEC, TAD e TR de várias turmas
 * (`lib/dominio/atividades/limites-das-turmas.ts`).
 *
 * ⚠️ **O VEREDITO É DE `tetosDaTurma`** (SC-003 da spec 014): o caso que importa é o de que este módulo dá o MESMO
 *    alerta que `tetosExcedidos` (o sininho, o `/inicio`) para a mesma entrada — dois agrupadores, um decisor.
 */
import { describe, expect, it } from "vitest";

import { tetosExcedidos } from "@/app/(app)/turmas/tetos-excedidos";
import {
  entradaDosTetosDaConformidade,
  tetosDasTurmas,
  type LinhaDaConformidadeDaTurma,
} from "@/lib/dominio/atividades/limites-das-turmas";
import { usoDoLimitePorTurma } from "@/lib/dominio/atividades/estatisticas";

const linha = (
  turma: string,
  categoria: string,
  cumprido: number,
  limite: number | null,
  ch: number | null = 500,
  percentual: number | null = 10,
): LinhaDaConformidadeDaTurma => ({
  turma_id: turma,
  categoria,
  cumprido,
  limite_declarado: limite,
  ch_curricular: ch,
  percentual_norma: percentual,
});

describe("a entrada de `tetosDaTurma` a partir de `vw_conformidade_tetos`", () => {
  it("cada categoria no lugar dela; o limite declarado e o percentual da norma; o resto zero", () => {
    const e = entradaDosTetosDaConformidade(
      [
        linha("t1", "AEC", 12, 20),
        linha("t1", "TAD", 7, null, 500, 5),
        linha("t1", "Estudo_Individual", 99, null),
      ],
      [{ turma_id: "t1", categoria: "TAD", tempos_previstos: 6 }],
      false,
    );
    expect(e.cumprido).toEqual({
      chd: 0,
      aec: 12,
      tad: 7,
      tr: 0,
      estudoIndividual: 0,
      apoioIndividualizado: 0,
    });
    expect(e.limitesDoCurriculo).toEqual({ aec: 20 });
    expect(e.percentuais).toEqual({ aec: 10, tad: 5, tr: null });
    expect(e.previstoProens).toEqual({ tad: 6 });
    expect(e.chCurricular).toBe(500);
    expect(e.ead).toBe(false);
  });
});

describe("o quadro de cada turma", () => {
  it("o declarado no currículo vence a norma; sem declarado, o máximo é o % da CH", () => {
    const [t] = tetosDasTurmas(
      [{ id: "t1", codigo: "CUR-X T1 2047", ead: false }],
      [linha("t1", "AEC", 30, 20), linha("t1", "TR", 10, null, 500, 10)],
      [],
    );
    expect(t?.tetos.ead).toBe(false);
    if (!t || t.tetos.ead) return;
    expect(t.tetos.cards.aec.maximo).toEqual({ valor: 20, origem: "curriculo" });
    expect(t.tetos.cards.aec.alertas).toContain("acima_do_maximo");
    expect(t.tetos.cards.tr.maximo).toEqual({ valor: 50, origem: "norma" });
    expect(t.tetos.cards.tr.alertas).toEqual([]);
  });

  it("a turma sem linha na view sai com zero e o máximo «não calculável» — nunca um limite inventado", () => {
    const [t] = tetosDasTurmas([{ id: "t9", codigo: "CUR-X T9 2047", ead: false }], [], []);
    if (!t || t.tetos.ead) throw new Error("esperava uma turma presencial");
    expect(t.tetos.cards.aec.cumprido).toBe(0);
    expect(t.tetos.cards.aec.maximo).toBe("sem_ch_curricular");
    // E nas barras ela não vira «limite zero»: o limite fica nulo.
    expect(usoDoLimitePorTurma([t]).every((u) => u.limite === null)).toBe(true);
  });

  it("a turma EAD pura não tem limite, e as barras a pulam", () => {
    const quadros = tetosDasTurmas(
      [{ id: "t2", codigo: "CUR-X T2 2047", ead: true }],
      [linha("t2", "AEC", 5, 1)],
      [],
    );
    expect(quadros[0]?.tetos.ead).toBe(true);
    expect(usoDoLimitePorTurma(quadros)).toEqual([]);
  });

  it("na ordem em que as turmas chegam (quem chama já as pôs em ordem de turma)", () => {
    const quadros = tetosDasTurmas(
      [
        { id: "b", codigo: "B", ead: false },
        { id: "a", codigo: "A", ead: false },
      ],
      [],
      [],
    );
    expect(quadros.map((q) => q.turmaCodigo)).toEqual(["B", "A"]);
  });
});

describe("um decisor só (SC-003): o mesmo alerta que `tetosExcedidos`", () => {
  it("para a mesma entrada, as mesmas turmas e categorias acima do previsto e do máximo", () => {
    const conformidade = [
      linha("t1", "AEC", 30, 20),
      linha("t1", "TAD", 29, null, 545, 5),
      linha("t2", "TR", 3, null, 500, 10),
    ];
    const previstos = [{ turma_id: "t1", categoria: "TAD", tempos_previstos: 25 }];
    const turmas = [
      { id: "t1", codigo: "CUR-X T1 2047", ead: false },
      { id: "t2", codigo: "CUR-X T2 2047", ead: false },
    ];

    const daqui = tetosDasTurmas(turmas, conformidade, previstos).flatMap((q) =>
      q.tetos.ead
        ? []
        : (["aec", "tad", "tr"] as const).flatMap((c) =>
            q.tetos.ead ? [] : q.tetos.cards[c].alertas.map((a) => `${q.turmaCodigo}|${c}|${a}`),
          ),
    );
    const doSininho = tetosExcedidos(
      conformidade.map((l) => ({
        ...l,
        turma_codigo: turmas.find((t) => t.id === l.turma_id)?.codigo ?? null,
      })),
      previstos,
      new Map([
        ["t1", "presencial"],
        ["t2", "presencial"],
      ]),
    ).map((e) => `${e.turmaCodigo}|${e.categoria}|${e.alerta}`);

    expect([...daqui].sort()).toEqual([...doSininho].sort());
    // Controle positivo: o caso tem alerta de verdade (senão a igualdade passaria com as duas listas vazias).
    expect(daqui).toEqual(
      expect.arrayContaining([
        "CUR-X T1 2047|aec|acima_do_maximo",
        "CUR-X T1 2047|tad|acima_do_previsto",
      ]),
    );
  });
});
