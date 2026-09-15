/**
 * `RN-2027-06` e a T011 (d) — a semanal situada na faixa do regime, com limites inclusivos.
 *
 * ⚠️ AS FAIXAS DESTE TESTE SÃO AS DO `RN-2027-06`, ESCRITAS AQUI SÓ COMO AMOSTRA. Em produção elas vêm de
 * `config_parametros`; a função as recebe e não conhece regime nenhum.
 */
import { describe, expect, it } from "vitest";

import { situarNaFaixa } from "@/lib/dominio/carga-horaria";

const REGIME_20H = { minimo: 8, maximo: 12 };
const REGIME_40H = { minimo: 16, maximo: 24 };
const DEDICACAO_EXCLUSIVA = { minimo: 16, maximo: 30 };

describe("`SC-006` · o teto é a faixa, jamais o número do regime", () => {
  it("40h com 20 horas previstas está DENTRO — comparar contra 40 passaria pelo motivo errado", () => {
    expect(situarNaFaixa(20, REGIME_40H)).toBe("dentro");
  });

  it("20h com 14 horas previstas está ACIMA", () => {
    expect(situarNaFaixa(14, REGIME_20H)).toBe("acima");
  });

  it("dedicação exclusiva com 28 está dentro, e com 31 acima", () => {
    expect(situarNaFaixa(28, DEDICACAO_EXCLUSIVA)).toBe("dentro");
    expect(situarNaFaixa(31, DEDICACAO_EXCLUSIVA)).toBe("acima");
  });
});

describe("T011 (d) · limites inclusivos", () => {
  it("exatamente 8 e exatamente 12 estão dentro", () => {
    expect(situarNaFaixa(8, REGIME_20H)).toBe("dentro");
    expect(situarNaFaixa(12, REGIME_20H)).toBe("dentro");
  });

  it("um centésimo abaixo de 8 está abaixo, e um centésimo acima de 12 está acima", () => {
    expect(situarNaFaixa(7.99, REGIME_20H)).toBe("abaixo");
    expect(situarNaFaixa(12.01, REGIME_20H)).toBe("acima");
  });

  it("subutilização também é sinalizada: zero horas está abaixo", () => {
    expect(situarNaFaixa(0, REGIME_20H)).toBe("abaixo");
  });
});
