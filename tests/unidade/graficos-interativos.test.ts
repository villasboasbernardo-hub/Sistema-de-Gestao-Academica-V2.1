/**
 * RT-5 do Bloco 10 (spec 025, D-22, FR-008, SC-007) — o que fica à vista quando um grupo se oculta.
 *
 * > *"Todo gráfico é interativo: clicar na legenda ou na série oculta/mostra o grupo (…) inclusive a pizza de
 * > escolaridade: clicar em 'Não informado' tira o grupo e o gráfico se redistribui."* — Bernardo Villas Boas,
 * > 24/10/2026
 */
import { describe, expect, it } from "vitest";

import {
  alternarGrupo,
  gruposVisiveis,
  percentualDaFatia,
  totalVisivel,
  type PontoDeSerie,
} from "@/components/graficos/tipos";

const ESCOLARIDADE: readonly PontoDeSerie[] = [
  { nome: "Superior", valor: 30 },
  { nome: "Médio", valor: 50 },
  { nome: "Não informado", valor: 20 },
];
const nome = (p: PontoDeSerie) => p.nome;

describe("RT-5 · ocultar redistribui", () => {
  it("sem oculto, tudo à vista com o índice de origem", () => {
    expect(gruposVisiveis(ESCOLARIDADE, nome, new Set()).map((g) => g.indice)).toEqual([0, 1, 2]);
  });

  it("ocultar «Não informado» deixa as fatias restantes somando 100 % (SC-007)", () => {
    const visiveis = gruposVisiveis(ESCOLARIDADE, nome, new Set(["Não informado"]));
    const total = totalVisivel(visiveis);
    expect(total).toBe(80);
    expect(visiveis.map((g) => percentualDaFatia(g.item.valor, total))).toEqual(["37.5%", "62.5%"]);
  });

  it("o índice de origem fica — a cor da fatia não muda quando outra some", () => {
    const visiveis = gruposVisiveis(ESCOLARIDADE, nome, new Set(["Superior"]));
    expect(visiveis.map((g) => g.indice)).toEqual([1, 2]);
  });
});

describe("RT-5 · alternar", () => {
  const todos = ESCOLARIDADE.map(nome);

  it("oculta o que está à vista e mostra o que está oculto", () => {
    const oculto = alternarGrupo(new Set(), "Médio", todos);
    expect([...oculto]).toEqual(["Médio"]);
    expect([...alternarGrupo(oculto, "Médio", todos)]).toEqual([]);
  });

  it("o último à vista não se oculta", () => {
    const dois = new Set(["Superior", "Médio"]);
    expect(alternarGrupo(dois, "Não informado", todos)).toBe(dois);
  });
});
