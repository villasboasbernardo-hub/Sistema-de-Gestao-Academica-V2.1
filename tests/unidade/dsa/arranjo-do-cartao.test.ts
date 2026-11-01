/**
 * Bloco 16 (ajuste C da conferência de 31/10/2026) — o cartão adaptável: instrutores empilhados ou lado a lado, o local
 * na última linha ou na dos instrutores, pela altura (tempos) e pelo número de nomes. 1, 3 e 5 tempos × 1 e 4 nomes.
 */
import { describe, expect, it } from "vitest";

import { arranjoDoCartao, instrutoresDoCartao } from "@/lib/dominio/dsa/arranjo-do-cartao";

describe("instrutoresDoCartao · todos os nomes, um por item", () => {
  it("separa a linha do papel por « / », sem item vazio", () => {
    expect(instrutoresDoCartao("CF A / CC B / SO C")).toEqual(["CF A", "CC B", "SO C"]);
    expect(instrutoresDoCartao("")).toEqual([]);
    expect(instrutoresDoCartao("1ºTen D (FISCAL)")).toEqual(["1ºTen D (FISCAL)"]);
  });
});

describe("arranjoDoCartao · empilhar quando há altura", () => {
  it.each([
    [1, 1, { emPilha: false, localNaLinhaDosInstrutores: true }],
    [1, 4, { emPilha: false, localNaLinhaDosInstrutores: true }],
    [3, 1, { emPilha: true, localNaLinhaDosInstrutores: false }],
    [3, 4, { emPilha: true, localNaLinhaDosInstrutores: false }],
    [5, 1, { emPilha: true, localNaLinhaDosInstrutores: false }],
    [5, 4, { emPilha: true, localNaLinhaDosInstrutores: false }],
  ] as const)("%i tempo(s), %i instrutor(es)", (ta, n, esperado) => {
    expect(arranjoDoCartao(ta, n)).toEqual(esperado);
  });

  it("2 tempos com 4 nomes não cabe empilhado: lado a lado, e o local na última linha", () => {
    expect(arranjoDoCartao(2, 4)).toEqual({ emPilha: false, localNaLinhaDosInstrutores: false });
  });

  it("muitos nomes num cartão médio vão lado a lado (3 tempos, 6 nomes)", () => {
    expect(arranjoDoCartao(3, 6).emPilha).toBe(false);
  });
});
