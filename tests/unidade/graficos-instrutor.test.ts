/**
 * `FR-026.2`, `FR-026.3` e `FR-026.4` da spec 006 — os sete gráficos.
 *
 * ⚠️ O TETO DE SÉRIES É O DO DESIGN SYSTEM, NÃO "SETE VALORES". A T064 dizia *"nenhuma série com mais
 * de 7 valores"*; o que `components/graficos/` recusa é gráfico com mais de `MAXIMO_DE_SERIES` (6)
 * **séries**. Uma OM a mais é uma categoria a mais no eixo, não uma série — o gráfico de OM da base
 * viva tem oito barras e uma série só. O caso abaixo confere o teto real.
 */
import { describe, expect, it } from "vitest";

import { conferirTetoDeSeries, MAXIMO_DE_SERIES } from "@/components/graficos/tipos";
import { escalaDeLinhas } from "@/lib/dominio/antiguidade";
import {
  FAIXA_OUTROS,
  graficosDeInstrutores,
  NAO_INFORMADO,
  type InstrutorParaGraficos,
} from "@/lib/dominio/graficos-instrutor";

/** A escala como `config_listas` a entrega, com SC e SCNS no mesmo peso. */
const ESCALA = escalaDeLinhas(
  ["CMG", "CF", "CC", "CT", "1ºTen", "2ºTen", "SO", "1ºSG", "2ºSG", "3ºSG"]
    .map((valor, i) => ({ valor, ordem: i + 1, ativo: true }))
    .concat([
      { valor: "SC", ordem: 13, ativo: true },
      { valor: "SCNS", ordem: 13, ativo: true },
    ]),
);

const base: InstrutorParaGraficos = {
  id: "",
  pg: "CT",
  categoria: "Militar da Ativa",
  om: "CHM",
  escolaridade: null,
  regime: "20h",
  capacitacaoDidatica: null,
};
const com = (id: string, campos: Partial<InstrutorParaGraficos>): InstrutorParaGraficos => ({
  ...base,
  id,
  ...campos,
});

const SELECAO = { habilitados: 2, selecionados: 3 };
const grafico = (lista: readonly InstrutorParaGraficos[], chave: string) =>
  graficosDeInstrutores(lista, ESCALA, SELECAO).find((g) => g.chave === chave);

describe("`FR-026.2` · exatamente sete gráficos, na ordem da spec", () => {
  it("são sete, e são os sete nomeados", () => {
    expect(graficosDeInstrutores([], ESCALA, SELECAO).map((g) => g.chave)).toEqual([
      "habilitados-selecionados",
      "classificacao",
      "posto-graduacao",
      "om",
      "escolaridade",
      "regime",
      "capacitacao",
    ]);
  });

  it("habilitados × selecionados usa as contagens recebidas — o mesmo número do indicador", () => {
    expect(grafico([], "habilitados-selecionados")?.barras).toEqual([
      { nome: "Habilitados", valor: 2 },
      { nome: "Selecionados", valor: 3 },
    ]);
  });

  it("a classificação é lida da coluna `categoria`", () => {
    const lista = [
      com("1", { categoria: "TTC" }),
      com("2", { categoria: "Militar da Ativa" }),
      com("3", { categoria: "Militar da Ativa" }),
    ];
    expect(grafico(lista, "classificacao")?.barras).toEqual([
      { nome: "Militar da Ativa", valor: 2 },
      { nome: "TTC", valor: 1 },
    ]);
  });
});

describe("`RN-ANT-01` · barras de posto/graduação em antiguidade, nunca alfabética", () => {
  it("a ordem segue a escala, e não o alfabeto nem a quantidade", () => {
    // Alfabeticamente: 1ºSG, CC, CMG, CT, SC. Por quantidade: CT primeiro. Por antiguidade: CMG, CC, CT, 1ºSG, SC.
    const lista = [
      com("1", { pg: "CT" }),
      com("2", { pg: "CT" }),
      com("3", { pg: "CT" }),
      com("4", { pg: "SC" }),
      com("5", { pg: "1ºSG" }),
      com("6", { pg: "CMG" }),
      com("7", { pg: "CC" }),
    ];
    expect(grafico(lista, "posto-graduacao")?.barras.map((b) => b.nome)).toEqual([
      "CMG",
      "CC",
      "CT",
      "1ºSG",
      "SC",
    ]);
  });

  it("`FR-026.3` · posto fora da escala vai para 'Outros', no fim, e não some", () => {
    const lista = [com("1", { pg: "XYZ" }), com("2", { pg: "AE" }), com("3", { pg: "CMG" })];
    expect(grafico(lista, "posto-graduacao")?.barras).toEqual([
      { nome: "CMG", valor: 1 },
      { nome: FAIXA_OUTROS, valor: 2 },
    ]);
  });
});

describe("`FR-026.4` · capacitação didática", () => {
  it("duas qualificações contam nas duas barras; campo vazio não conta em nenhuma", () => {
    const lista = [
      com("1", { capacitacaoDidatica: "C-Exp-TE, C-Esp-DID" }),
      com("2", { capacitacaoDidatica: "C-Exp-TE" }),
      com("3", { capacitacaoDidatica: "" }),
      com("4", { capacitacaoDidatica: null }),
    ];
    const barras = grafico(lista, "capacitacao")?.barras ?? [];
    expect(barras).toEqual([
      { nome: "C-Exp-TE", valor: 2 },
      { nome: "C-Esp-DID", valor: 1 },
    ]);
    expect(
      barras.reduce((s, b) => s + b.valor, 0),
      "a soma não fecha com o total, e isso é correto",
    ).toBe(3);
  });
});

describe("degradação segura · valor vazio não some do gráfico", () => {
  it("escolaridade e regime vazios viram 'Não informado', no fim", () => {
    const lista = [
      com("1", { escolaridade: "Graduação", regime: null }),
      com("2", { escolaridade: null, regime: "40h" }),
      com("3", { escolaridade: " ", regime: "40h" }),
    ];
    expect(grafico(lista, "escolaridade")?.barras.at(-1)).toEqual({
      nome: NAO_INFORMADO,
      valor: 2,
    });
    expect(grafico(lista, "regime")?.barras).toEqual([
      { nome: "40h", valor: 2 },
      { nome: NAO_INFORMADO, valor: 1 },
    ]);
  });
});

describe("o teto do Design System · nenhum gráfico passa de MAXIMO_DE_SERIES séries", () => {
  it("cada um dos sete é uma série só, mesmo com muitas categorias", () => {
    const muitasOms = Array.from({ length: 12 }, (_, i) => com(String(i), { om: `OM-${i}` }));
    for (const g of graficosDeInstrutores(muitasOms, ESCALA, SELECAO)) {
      const series = [
        { chave: g.chave, rotulo: g.titulo, forma: "quadrado" as const, pontos: g.barras },
      ];
      expect(series.length).toBeLessThanOrEqual(MAXIMO_DE_SERIES);
      expect(conferirTetoDeSeries(series), `${g.chave} seria recusado pela moldura`).toBeNull();
    }
    expect(grafico(muitasOms, "om")?.barras).toHaveLength(12);
  });
});
