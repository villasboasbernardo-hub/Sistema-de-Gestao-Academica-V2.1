/**
 * `FR-026.2`, `FR-026.3` e `FR-026.4` da spec 006, com a segunda emenda de 15/09/2026 — os nove gráficos.
 *
 * ⚠️ O TETO DE SÉRIES É O DO DESIGN SYSTEM. `components/graficos/` recusa gráfico com mais de
 * `MAXIMO_DE_SERIES` (6) **séries**. A pizza não tem mais teto de categorias desde a spec 022 (Bloco 7, item 7).
 * O gráfico de OM tem oito barras e uma série.
 */
import { describe, expect, it } from "vitest";

import { conferirTetoDeSeries, MAXIMO_DE_SERIES } from "@/components/graficos/tipos";
import { escalaDeLinhas } from "@/lib/dominio/antiguidade";
import {
  CAPACITACAO_A_CORRIGIR,
  CAPACITACAO_NENHUMA,
  COM_CAPACITACAO,
  FAIXA_OUTROS,
  graficosDeInstrutores,
  NAO_INFORMADO,
  SEM_CAPACITACAO,
  type InstrutorParaGraficos,
} from "@/lib/dominio/graficos-instrutor";
import { converterCapacitacao } from "@/lib/dominio/capacitacao-didatica";

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
  capacitacao: converterCapacitacao(null),
};
const com = (id: string, campos: Partial<InstrutorParaGraficos>): InstrutorParaGraficos => ({
  ...base,
  id,
  ...campos,
});

const SELECAO = { habilitados: 2, selecionados: 3 };
const grafico = (lista: readonly InstrutorParaGraficos[], chave: string) =>
  graficosDeInstrutores(lista, ESCALA, SELECAO).find((g) => g.chave === chave);

describe("`FR-026.2` emendado · exatamente nove gráficos, três de barras e seis de pizza", () => {
  it("são nove, na ordem da spec, com os dois novos no fim", () => {
    expect(graficosDeInstrutores([], ESCALA, SELECAO).map((g) => g.chave)).toEqual([
      "status-de-selecao",
      "classificacao",
      "posto-graduacao",
      "om",
      "escolaridade",
      "regime",
      "capacitacao",
      "circulo",
      "indice-capacitacao",
    ]);
  });

  /*
   * ⚠️ A ESCOLARIDADE FICAVA EM BARRAS SÓ PELO TETO DE 5 FATIAS DA PIZZA (pendência do `FR-026.2`, 15/09/2026). O teto
   *    saiu na spec 022 (Bloco 7, item 7), e ela vai para a pizza que o `FR-026.2` decidiu: três de barras, seis de pizza.
   */
  it("barras: status de seleção, posto e OM; pizza: as seis do `FR-026.2`, escolaridade inclusive", () => {
    const formas = Object.fromEntries(
      graficosDeInstrutores([], ESCALA, SELECAO).map((g) => [g.chave, g.forma]),
    );
    expect(formas).toEqual({
      "status-de-selecao": "barras",
      classificacao: "pizza",
      "posto-graduacao": "barras",
      om: "barras",
      escolaridade: "pizza",
      regime: "pizza",
      capacitacao: "pizza",
      circulo: "pizza",
      "indice-capacitacao": "pizza",
    });
  });

  it("Status de Seleção usa as contagens recebidas — o mesmo número do indicador (spec 021)", () => {
    const g = grafico([], "status-de-selecao");
    expect(g?.titulo).toBe("Status de Seleção");
    expect(g?.barras).toEqual([
      { nome: "Habilitados", valor: 2 },
      { nome: "Selecionados", valor: 3 },
    ]);
  });

  it("a classificação é lida da coluna `categoria` — o rótulo da v2.0 é de quem desenha", () => {
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

describe("`FR-026.4` emendado · capacitação didática com a fatia 'Nenhuma'", () => {
  it("duas qualificações contam nas duas fatias; o campo vazio conta em Nenhuma, no fim", () => {
    const lista = [
      com("1", { capacitacao: converterCapacitacao("C-Exp-TE, C-Esp-DID") }),
      com("2", { capacitacao: converterCapacitacao("C-Exp-TE") }),
      com("3", { capacitacao: converterCapacitacao("") }),
      com("4", { capacitacao: converterCapacitacao(null) }),
    ];
    expect(grafico(lista, "capacitacao")?.barras).toEqual([
      { nome: "C-Exp-TE", valor: 2 },
      { nome: "C-Esp-DID", valor: 1 },
      { nome: CAPACITACAO_NENHUMA, valor: 2 },
    ]);
  });

  it("spec 020 (C-12) · o texto que não casou vira a fatia «A corrigir» e conta como COM capacitação", () => {
    const lista = [
      com("1", { capacitacao: converterCapacitacao("Pedagogia") }),
      com("2", { capacitacao: converterCapacitacao("C-Exp-TE, Pedagogia") }),
      com("3", { capacitacao: converterCapacitacao(null) }),
    ];
    expect(grafico(lista, "capacitacao")?.barras).toEqual([
      { nome: CAPACITACAO_A_CORRIGIR, valor: 2 },
      { nome: "C-Exp-TE", valor: 1 },
      { nome: CAPACITACAO_NENHUMA, valor: 1 },
    ]);
    expect(grafico(lista, "indice-capacitacao")?.barras).toEqual([
      { nome: COM_CAPACITACAO, valor: 2 },
      { nome: SEM_CAPACITACAO, valor: 1 },
    ]);
  });

  it("o índice de capacitação geral tem exatamente duas fatias e soma o total (spec 021)", () => {
    const lista = [
      com("1", { capacitacao: converterCapacitacao("C-Exp-TE, C-Esp-DID") }),
      com("2", { capacitacao: converterCapacitacao("   ") }),
      com("3", { capacitacao: converterCapacitacao(null) }),
    ];
    const fatias = grafico(lista, "indice-capacitacao")?.barras ?? [];
    expect(fatias).toEqual([
      { nome: COM_CAPACITACAO, valor: 1 },
      { nome: SEM_CAPACITACAO, valor: 2 },
    ]);
    expect(fatias.reduce((s, f) => s + f.valor, 0)).toBe(lista.length);
  });

  it("recorte vazio: o índice mostra zero nas duas fatias, sem exceção (spec 021, casos de fronteira)", () => {
    expect(grafico([], "indice-capacitacao")?.barras).toEqual([
      { nome: COM_CAPACITACAO, valor: 0 },
      { nome: SEM_CAPACITACAO, valor: 0 },
    ]);
  });
});

describe("círculo hierárquico · Oficiais, Praças e 'Outros'", () => {
  it("SC e posto fora do mapa vão para Outros, e não somem", () => {
    const lista = [
      com("1", { pg: "CMG" }),
      com("2", { pg: "SO" }),
      com("3", { pg: "3ºSG" }),
      com("4", { pg: "SC" }),
      com("5", { pg: "XYZ" }),
    ];
    expect(grafico(lista, "circulo")?.barras).toEqual([
      { nome: "Oficiais", valor: 1 },
      { nome: "Praças", valor: 2 },
      { nome: FAIXA_OUTROS, valor: 2 },
    ]);
  });

  it("fatia sem ninguém não aparece", () => {
    expect(grafico([com("1", { pg: "CT" })], "circulo")?.barras).toEqual([
      { nome: "Oficiais", valor: 1 },
    ]);
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
  it("cada um dos nove é uma série só, mesmo com muitas categorias", () => {
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
