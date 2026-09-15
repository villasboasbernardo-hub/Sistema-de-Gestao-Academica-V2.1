/**
 * `RN-ANT-01`, `SC-001` e `FR-025` da spec 006 — a montagem da consulta da listagem de instrutores.
 *
 * ⚠️ ESTE TESTE SUBSTITUI UM PERCURSO QUE NÃO PODIA REPROVAR (análise H4, 15/09/2026). A primeira
 * versão da tarefa pedia ao Playwright que observasse a consulta ao banco — mas ela sai do servidor,
 * e o navegador nunca a vê. Aqui a função de montagem recebe um construtor que só grava as chamadas,
 * e o teste lê o que foi pedido.
 *
 * ⚠️ O CASO QUE IMPORTA É O DE `ordem`. O contrato manda a consulta pedir `ordem_antiguidade` SEMPRE,
 * e `?ordem=` só reordenar por cima, na apresentação. Uma implementação que trocasse a coluna quando
 * `ordem=nome` chegasse deixaria de cumprir a regra de risco alto sem que a tela parecesse errada.
 */
import { describe, expect, it } from "vitest";

import {
  COLUNAS_DA_LISTAGEM,
  montarConsultaDeInstrutores,
  PARAMETROS_SEM_RECORTE,
  type ParametrosDaListagem,
} from "@/app/(app)/instrutores/consulta";
import { ORDENS_DE_INSTRUTOR } from "@/lib/navegacao/contrato";

type Chamada = readonly [string, ...unknown[]];

/** Um construtor que só grava. Encadeável como o da interface de dados. */
class Gravador {
  readonly chamadas: Chamada[] = [];
  eq(coluna: string, valor: unknown) {
    this.chamadas.push(["eq", coluna, valor]);
    return this;
  }
  ilike(coluna: string, padrao: string) {
    this.chamadas.push(["ilike", coluna, padrao]);
    return this;
  }
  in(coluna: string, valores: readonly string[]) {
    this.chamadas.push(["in", coluna, [...valores]]);
    return this;
  }
  contains(coluna: string, valores: readonly string[]) {
    this.chamadas.push(["contains", coluna, [...valores]]);
    return this;
  }
  or(filtros: string) {
    this.chamadas.push(["or", filtros]);
    return this;
  }
  order(coluna: string, opcoes: unknown) {
    this.chamadas.push(["order", coluna, opcoes]);
    return this;
  }
}

const montar = (parciais: Partial<ParametrosDaListagem>) => {
  const gravador = new Gravador();
  montarConsultaDeInstrutores(gravador, { ...PARAMETROS_SEM_RECORTE, ...parciais });
  return gravador.chamadas;
};

describe("`RN-ANT-01` · a consulta pede a antiguidade ao banco, sempre", () => {
  it.each(["", ...ORDENS_DE_INSTRUTOR])(
    "com ordem=%s, a única ordenação pedida é ordem_antiguidade crescente",
    (ordem) => {
      const ordens = montar({ ordem }).filter((c) => c[0] === "order");
      expect(ordens).toEqual([["order", "ordem_antiguidade", { ascending: true }]]);
    },
  );

  it("a lista de colunas traz a chave de ordenação, para a apresentação também ter o que usar", () => {
    expect(COLUNAS_DA_LISTAGEM.split(",").map((c) => c.trim())).toContain("ordem_antiguidade");
  });

  it("⚠️ nenhuma coluna de identificação civil é pedida", () => {
    const colunas = COLUNAS_DA_LISTAGEM.split(",").map((c) => c.trim());
    for (const pii of ["cpf", "rg", "telefone", "retelma", "endereco_cep", "endereco_logradouro"]) {
      expect(colunas).not.toContain(pii);
    }
  });
});

describe("`FR-025` · os filtros entram na mesma consulta, em E lógico", () => {
  it("sem recorte, só a situação padrão filtra — quem está ativo", () => {
    const filtros = montar({}).filter((c) => c[0] !== "order");
    expect(filtros).toEqual([["eq", "status", "ativo"]]);
  });

  it("todos os filtros juntos viram predicados da mesma consulta", () => {
    const filtros = montar({
      om: "CIAARA",
      categoria: "Militar",
      regime: "20h",
      escolaridade: "Superior",
      capacitacao: "C-Exp-TE",
      situacao: "inativo",
    }).filter((c) => c[0] !== "order");
    expect(filtros).toEqual(
      expect.arrayContaining([
        ["eq", "status", "inativo"],
        ["eq", "om", "CIAARA"],
        ["eq", "categoria", "Militar"],
        ["eq", "regime_trabalho", "20h"],
        ["eq", "nivel_escolaridade", "Superior"],
        ["ilike", "capacitacao_didatica", "%C-Exp-TE%"],
      ]),
    );
    expect(filtros).toHaveLength(6);
  });

  it("a busca compara com o nome normalizado, sem acento nem caixa", () => {
    const busca = montar({ busca: "  Müller  " }).find((c) => c[0] === "ilike");
    expect(busca).toEqual(["ilike", "nome_normalizado", "%muller%"]);
  });

  it("⚠️ curinga digitado na busca é literal — `%` e `_` não viram padrão", () => {
    const busca = montar({ busca: "a_b%c" }).find((c) => c[0] === "ilike");
    expect(busca).toEqual(["ilike", "nome_normalizado", "%a\\_b\\%c%"]);
  });
});

describe("`FR-025` emendado em 15/09/2026 · os filtros novos entram na mesma consulta", () => {
  it('capacitação = nenhuma casa com o campo vazio, e não com o texto "nenhuma"', () => {
    const filtros = montar({ capacitacao: "nenhuma" }).filter((c) => c[0] !== "order");
    expect(filtros).toEqual([
      ["eq", "status", "ativo"],
      ["or", "capacitacao_didatica.is.null,capacitacao_didatica.eq."],
    ]);
  });

  it("posto é igualdade, e círculo é a lista de postos do mapa da spec 015", () => {
    const filtros = montar({ posto: "CT", circulo: "pracas" }).filter((c) => c[0] !== "order");
    expect(filtros).toEqual(
      expect.arrayContaining([
        ["eq", "posto_graduacao", "CT"],
        ["in", "posto_graduacao", ["SO", "1ºSG", "2ºSG", "3ºSG"]],
      ]),
    );
  });

  it("habilitado e selecionado são predicados independentes, e não listas de ids", () => {
    const filtros = montar({ habilitado: "nao", selecionado: "sim" }).filter(
      (c) => c[0] !== "order",
    );
    expect(filtros).toEqual([
      ["eq", "status", "ativo"],
      ["eq", "habilitado", false],
      ["eq", "selecionado", true],
    ]);
    expect(
      filtros.some((c) => c[1] === "id"),
      "o filtro voltou a mandar ids na URL",
    ).toBe(false);
  });

  it("curso e classificação casam pelos arranjos da view — vínculo OU atribuição", () => {
    const filtros = montar({ curso: "CAHO", classificacao: "regular" }).filter(
      (c) => c[0] !== "order",
    );
    expect(filtros).toEqual(
      expect.arrayContaining([
        ["contains", "cursos_vinculados", ["CAHO"]],
        ["contains", "classificacoes_vinculadas", ["regular"]],
      ]),
    );
  });

  it("⚠️ os filtros novos não trocam a ordenação: continua sendo a antiguidade", () => {
    const ordens = montar({ curso: "X", habilitado: "sim", circulo: "oficiais" }).filter(
      (c) => c[0] === "order",
    );
    expect(ordens).toEqual([["order", "ordem_antiguidade", { ascending: true }]]);
  });
});
