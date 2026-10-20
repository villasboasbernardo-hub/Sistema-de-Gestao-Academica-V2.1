/**
 * O carrossel do Início — spec 019 (Bloco 4), C-3 a C-6: o passo, a volta e quando ele passa sozinho.
 */
import { describe, expect, it } from "vitest";

import { indiceAnterior, indiceSeguinte, passaSozinho } from "@/lib/dominio/carrossel";

describe("o passo do carrossel", () => {
  it("avança um e volta ao começo depois do último", () => {
    expect(indiceSeguinte(0, 3)).toBe(1);
    expect(indiceSeguinte(2, 3)).toBe(0);
  });
  it("recua um e vai ao último antes do primeiro", () => {
    expect(indiceAnterior(1, 3)).toBe(0);
    expect(indiceAnterior(0, 3)).toBe(2);
  });
  it("sem itens, fica em zero", () => {
    expect(indiceSeguinte(0, 0)).toBe(0);
    expect(indiceAnterior(0, 0)).toBe(0);
  });
});

describe("C-5 · quando ele passa sozinho", () => {
  const livre = {
    total: 4,
    pausadoPeloBotao: false,
    apontando: false,
    focado: false,
    reduzirMovimento: false,
  };
  it("passa quando nada o segura", () => {
    expect(passaSozinho(livre)).toBe(true);
  });
  it.each([
    ["o botão Pausar", { pausadoPeloBotao: true }],
    ["o ponteiro em cima", { apontando: true }],
    ["o foco dentro", { focado: true }],
    ["o «reduzir movimento» do sistema", { reduzirMovimento: true }],
    ["um item só", { total: 1 }],
  ])("não passa com %s", (_, troca) => {
    expect(passaSozinho({ ...livre, ...troca })).toBe(false);
  });
});
