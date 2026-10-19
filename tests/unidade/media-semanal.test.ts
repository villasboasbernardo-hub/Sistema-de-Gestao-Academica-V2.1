/**
 * A média semanal de reserva da atribuição — `RN-DIST-02` aplicada (FR-013.3 da spec 016; research R-5).
 *
 * > *"A regra de distribuição usa a carga horária semanal cadastrada da matéria quando existir, ou a carga horária
 * > total dividida pelo número de semanas da janela"* — `RN-DIST-02`, documento 04
 *
 * ⚠️ **AS SEMANAS SÃO AS DA RÉGUA ÚNICA** (`RN-DIST-01`): `semanasDaJanela`, que conta a semana ISO parcial do começo e
 * do fim como semana — a mesma que distribui o previsto no DSA e no Diagrama. Uma segunda régua aqui faria o alerta de
 * faixa e a distribuição discordarem sobre quantas semanas a mesma janela tem.
 *
 * ⚠️ **AS DATAS SÃO FIXAS, E A SEMANA DE CADA UMA ESTÁ CONFERIDA:** `2026-03-02` é uma segunda.
 */
import { describe, expect, it } from "vitest";

import { mediaSemanalDaJanela } from "@/lib/dominio/distribuicao-semanal";
import { mediaSemanalDaAtribuicao } from "@/lib/dominio/media-semanal";

describe("`RN-DIST-02` · a média semanal da atribuição (FR-013.3)", () => {
  it("a média CADASTRADA vence, mesmo com janela", () => {
    expect(
      mediaSemanalDaAtribuicao({
        mediaCadastrada: 5,
        tempos: 40,
        inicio: "2026-03-02",
        termino: "2026-04-10",
      }),
    ).toBe(5);
  });

  it("sem média cadastrada: a CH dividida pelas semanas da janela", () => {
    /*
     * CONTA: 02/03 (segunda) a 10/04 (sexta) → semanas de 02/03, 09/03, 16/03, 23/03, 30/03 e 06/04 = **6**;
     *        40 / 6 = 6,666… → **6,67** (duas casas, como a `media_semanal` da view).
     */
    expect(
      mediaSemanalDaAtribuicao({
        mediaCadastrada: null,
        tempos: 40,
        inicio: "2026-03-02",
        termino: "2026-04-10",
      }),
    ).toBe(6.67);
  });

  it("⚠️ a semana PARCIAL do começo e do fim conta — é a régua da RN-DIST-01", () => {
    /*
     * CONTA: quarta 04/03 a segunda 16/03 → semanas de 02/03, 09/03 e 16/03 = **3**; 40 / 3 = **13,33**.
     *        Contar dias corridos ÷ 7 daria 13 / 7 = 1,86 semana — a segunda régua que a regra proíbe.
     */
    expect(
      mediaSemanalDaAtribuicao({
        mediaCadastrada: null,
        tempos: 40,
        inicio: "2026-03-04",
        termino: "2026-03-16",
      }),
    ).toBe(13.33);
  });

  it("sem janela — sem início, sem término ou invertida — a média não existe (nulo, não zero)", () => {
    const base = { mediaCadastrada: null, tempos: 40 };
    expect(mediaSemanalDaAtribuicao({ ...base, inicio: null, termino: "2026-04-10" })).toBeNull();
    expect(mediaSemanalDaAtribuicao({ ...base, inicio: "2026-03-02", termino: null })).toBeNull();
    expect(
      mediaSemanalDaAtribuicao({ ...base, inicio: "2026-04-10", termino: "2026-03-02" }),
    ).toBeNull();
  });

  it("CH zero dá média zero — a atribuição existe e não pesa (o rateio pode deixar zero)", () => {
    expect(
      mediaSemanalDaAtribuicao({
        mediaCadastrada: null,
        tempos: 0,
        inicio: "2026-03-02",
        termino: "2026-03-06",
      }),
    ).toBe(0);
  });

  it("a conta mora no módulo da distribuição, e é a mesma régua dele", () => {
    expect(
      mediaSemanalDaJanela({ inicio: "2026-03-02", termino: "2026-04-10", chTempos: 40 }),
    ).toBe(6.67);
    expect(
      mediaSemanalDaJanela({ inicio: "2026-04-10", termino: "2026-03-02", chTempos: 40 }),
    ).toBeNull();
  });
});
