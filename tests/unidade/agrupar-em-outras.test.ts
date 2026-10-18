/**
 * Agrupar em "Outras (N)" — FR-007.2 da spec 016 (item 1.7 do plano de correções).
 *
 * > *"Gráfico de pizza com as 4 maiores e uma fatia «Outras (N)»; a lista em texto traz todas."*
 * > — Q-11, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **A SOMA É PRESERVADA**: a pizza mostra proporção, e uma fatia "Outras" que perdesse tempo no
 * caminho faria as quatro maiores parecerem maiores do que são.
 */
import { describe, expect, it } from "vitest";

import { agruparEmOutras, MAXIMO_DE_CATEGORIAS_NA_PIZZA } from "@/components/graficos/tipos";

const ponto = (nome: string, valor: number) => ({ nome, valor });
const soma = (pontos: readonly { valor: number }[]) => pontos.reduce((t, p) => t + p.valor, 0);

describe("FR-007.2 da spec 016 · as maiores e «Outras (N)»", () => {
  it("o teto é o da pizza, cinco fatias", () => {
    expect(MAXIMO_DE_CATEGORIAS_NA_PIZZA).toBe(5);
  });

  it("até cinco categorias passam intactas, na ordem em que chegaram", () => {
    const pontos = [
      ponto("I", 10),
      ponto("II", 40),
      ponto("III", 20),
      ponto("IV", 5),
      ponto("V", 1),
    ];
    const { pontos: fatias, agrupados } = agruparEmOutras(pontos);
    expect(fatias).toEqual(pontos);
    expect(agrupados).toEqual([]);
  });

  it("com mais, as QUATRO maiores e «Outras (N)» com a soma do resto", () => {
    const pontos = [
      ponto("I", 10),
      ponto("II", 40),
      ponto("III", 20),
      ponto("IV", 5),
      ponto("V", 1),
      ponto("VI", 30),
      ponto("VII", 2),
    ];
    const { pontos: fatias, agrupados } = agruparEmOutras(pontos);
    expect(fatias.map((p) => p.nome)).toEqual(["II", "VI", "III", "I", "Outras (3)"]);
    expect(fatias.at(-1)?.valor).toBe(8);
    expect(agrupados.map((p) => p.nome)).toEqual(["IV", "VII", "V"]);
    expect(soma(fatias)).toBe(soma(pontos));
  });

  it("nunca passa do teto da pizza", () => {
    const pontos = Array.from({ length: 30 }, (_, i) => ponto(`D${i}`, i + 1));
    const { pontos: fatias, agrupados } = agruparEmOutras(pontos);
    expect(fatias).toHaveLength(MAXIMO_DE_CATEGORIAS_NA_PIZZA);
    expect(agrupados).toHaveLength(26);
    expect(soma(fatias)).toBe(soma(pontos));
  });

  it("empate de valor mantém a ordem de chegada", () => {
    const pontos = ["A", "B", "C", "D", "E", "F"].map((n) => ponto(n, 10));
    expect(agruparEmOutras(pontos).pontos.map((p) => p.nome)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "Outras (2)",
    ]);
  });
});
