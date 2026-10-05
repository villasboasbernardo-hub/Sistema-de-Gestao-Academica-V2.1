/**
 * A montagem da consulta da lista de turmas (`FR-012`, `FR-013` da spec 012).
 *
 * ⚠️ **ELA É FUNÇÃO PURA SOBRE O CONSTRUTOR, e é isso que permite medi-la sem banco.** O duplo abaixo
 * só registra as chamadas — o que se prova aqui é **qual predicado** a tela manda ao PostgREST, que é
 * onde os defeitos de filtro moram: coluna errada, valor não escapado, ordem esquecida.
 *
 * ⚠️ **O CASO QUE MAIS IMPORTA É O DO `ano` QUE NÃO É NÚMERO.** `?ano=abc` chega de link velho e de
 * endereço digitado; filtrar por `NaN` devolveria **zero turmas sem erro nenhum**, e a tela diria
 * "nenhuma turma neste recorte" sobre um banco cheio. A degradação certa é **ignorar o valor**
 * (`RN-DEG-01`).
 */
import { describe, expect, it } from "vitest";

import {
  montarConsultaDeTurmas,
  type Encadeavel,
  type ParametrosDaListaDeTurmas,
} from "@/app/(app)/turmas/consulta";

type Chamada = readonly [string, ...unknown[]];

/** Um encadeável que só anota o que recebeu. */
function duplo(): { readonly consulta: Encadeavel; readonly chamadas: Chamada[] } {
  const chamadas: Chamada[] = [];
  const consulta: Encadeavel = {
    eq(coluna, valor) {
      chamadas.push(["eq", coluna, valor]);
      return consulta;
    },
    ilike(coluna, padrao) {
      chamadas.push(["ilike", coluna, padrao]);
      return consulta;
    },
    order(coluna, opcoes) {
      chamadas.push(["order", coluna, opcoes]);
      return consulta;
    },
  };
  return { consulta, chamadas };
}

const VAZIO: ParametrosDaListaDeTurmas = { curso: "", ano: "", situacao: "", busca: "" };

function chamadasCom(parametros: Partial<ParametrosDaListaDeTurmas>): Chamada[] {
  const { consulta, chamadas } = duplo();
  montarConsultaDeTurmas(consulta, { ...VAZIO, ...parametros });
  return chamadas;
}

describe("`FR-013` · cada filtro vira um predicado, e só quando tem valor", () => {
  it("sem filtro nenhum, só a ordem é aplicada", () => {
    expect(chamadasCom({})).toEqual([
      ["order", "ano_letivo", { ascending: false }],
      ["order", "codigo", { ascending: true }],
    ]);
  });

  it("⚠️ a ordem é ANO DECRESCENTE e código crescente — o ano corrente primeiro", () => {
    const ordens = chamadasCom({ curso: "C-Ap-FR" }).filter((c) => c[0] === "order");
    expect(ordens).toEqual([
      ["order", "ano_letivo", { ascending: false }],
      ["order", "codigo", { ascending: true }],
    ]);
  });

  it("curso filtra pela SIGLA do curso embutido, não por `curso_id`", () => {
    /*
     * ⚠️ **A COLUNA É `cursos.codigo`, e a distinção é o que faz o link funcionar.** O endereço carrega
     *    a sigla — legível e compartilhável —, não o `uuid`. Filtrar por `curso_id` exigiria traduzir
     *    a sigla antes, numa consulta a mais.
     */
    expect(chamadasCom({ curso: "C-Ap-FR" })).toContainEqual(["eq", "cursos.codigo", "C-Ap-FR"]);
  });

  it("situação filtra `status`, que é o ciclo de vida da turma", () => {
    expect(chamadasCom({ situacao: "ativa" })).toContainEqual(["eq", "status", "ativa"]);
  });

  it("busca procura no código, por `ilike`", () => {
    expect(chamadasCom({ busca: "T2" })).toContainEqual(["ilike", "codigo", "%T2%"]);
  });

  it("busca só com espaços não filtra nada", () => {
    expect(chamadasCom({ busca: "   " }).some((c) => c[0] === "ilike")).toBe(false);
  });

  it("⚠️ os curingas do `ilike` são escapados — senão a busca procura outra coisa", () => {
    /*
     * ⚠️ `%` e `_` são curingas do `ilike`: sem escapar, buscar `T_2` casaria `T12`, `TA2` e por aí,
     *    e quem digitou acharia que a busca está quebrada.
     */
    expect(chamadasCom({ busca: "T_2" })).toContainEqual(["ilike", "codigo", "%T\\_2%"]);
    expect(chamadasCom({ busca: "50%" })).toContainEqual(["ilike", "codigo", "%50\\%%"]);
  });
});

describe("⚠️ `RN-DEG-01` · o ano que não é número é IGNORADO, nunca filtrado", () => {
  it("ano válido vira predicado numérico", () => {
    expect(chamadasCom({ ano: "2026" })).toContainEqual(["eq", "ano_letivo", 2026]);
  });

  /*
   * ⚠️ **ESTE É O CASO QUE DISCRIMINA.** Uma montagem escrita como
   *    `if (ano !== "") c = c.eq("ano_letivo", Number(ano))` passaria em todos os casos acima e
   *    **reprovaria aqui**: ela mandaria `NaN` ao banco, que devolve zero linhas **sem erro**. O
   *    sintoma seria "nenhuma turma neste recorte" com o banco cheio — e ninguém suspeitaria do
   *    endereço.
   */
  it.each(["abc", "20x6", "", "  ", "-", "2026-01"])("`%s` não filtra o ano", (valor) => {
    const filtrosDeAno = chamadasCom({ ano: valor }).filter(
      (c) => c[0] === "eq" && c[1] === "ano_letivo",
    );
    expect(filtrosDeAno, `"${valor}" virou predicado de ano`).toEqual([]);
  });
});

describe("os filtros se somam", () => {
  it("curso, ano, situação e busca entram todos, e a ordem fecha a cadeia", () => {
    const chamadas = chamadasCom({
      curso: "C-Ap-FR",
      ano: "2026",
      situacao: "ativa",
      busca: "T2",
    });

    expect(chamadas).toEqual([
      ["eq", "cursos.codigo", "C-Ap-FR"],
      ["eq", "ano_letivo", 2026],
      ["eq", "status", "ativa"],
      ["ilike", "codigo", "%T2%"],
      ["order", "ano_letivo", { ascending: false }],
      ["order", "codigo", { ascending: true }],
    ]);
  });
});
