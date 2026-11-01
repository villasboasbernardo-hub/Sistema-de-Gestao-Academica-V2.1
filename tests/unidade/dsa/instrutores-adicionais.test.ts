/**
 * RD-9 (Bloco 16, spec 031) — os instrutores adicionais da aula: o que a lista oferece e o que a gravação aceita.
 */
import { describe, expect, it } from "vitest";

import {
  adicionaisOferecidos,
  recusaDosAdicionais,
  semQuemMinistra,
} from "@/lib/dominio/dsa/instrutores-adicionais";

const A = { id: "a" };
const B = { id: "b" };
const C = { id: "c" };

describe("RD-9 · a lista dos adicionais", () => {
  it("oferece os habilitados da aula menos quem ministra e menos os já escolhidos", () => {
    expect(adicionaisOferecidos([A, B, C], "a", ["c"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("sem quem ministra escolhido, oferece todos os que não estão escolhidos", () => {
    expect(adicionaisOferecidos([A, B], "", []).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("trocar quem ministra para um adicional tira-o dos adicionais", () => {
    expect(semQuemMinistra(["b", "c"], "b")).toEqual(["c"]);
    expect(semQuemMinistra(["b", "c"], "")).toEqual(["b", "c"]);
  });
});

describe("RD-9 · a recusa da gravação", () => {
  it("aceita nenhum e aceita vários distintos", () => {
    expect(recusaDosAdicionais("a", [])).toBeNull();
    expect(recusaDosAdicionais("a", ["b", "c"])).toBeNull();
  });

  it("recusa o repetido, com a frase", () => {
    expect(recusaDosAdicionais("a", ["b", "b"])).toBe(
      "O mesmo instrutor adicional foi escolhido duas vezes. Deixe cada um uma vez só.",
    );
  });

  it("recusa quem ministra entre os adicionais, com a frase", () => {
    expect(recusaDosAdicionais("a", ["a"])).toBe(
      "Quem ministra a aula não entra também como instrutor adicional.",
    );
  });
});
