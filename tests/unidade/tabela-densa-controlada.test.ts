/**
 * A tabela densa aceita ordenação e busca **de fora** (`FR-012`, `FR-012.1`, `SC-009`).
 *
 * ⚠️ É O ACHADO `CHK012` DO CHECKLIST DE ENTRADA, e era a única divergência conhecida entre o que a
 * fatia (b) entregou e o que o documento 25 prescreve: a tabela guardava ordenação e filtro como
 * estado interno e **não os expunha**, o que impedia a fatia (c) de levar o recorte para a URL.
 *
 * ⚠️ AS PROPRIEDADES SÃO OPCIONAIS, E ISSO É METADE DO REQUISITO. Se alguma virasse obrigatória,
 * toda chamada da fatia (b) precisaria mudar — e a prova de não regressão seria uma suíte reescrita,
 * que não prova nada.
 *
 * ⚠️ A LEITURA SE PROVA AQUI; O CLIQUE SE PROVA NO NAVEGADOR. Esta suíte desenha o componente com a
 * renderização de servidor do próprio React — sem navegador, sem biblioteca nova — e confere o que
 * saiu. Interação é `tests/e2e/`.
 */
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TabelaDensa, type Coluna, type TabelaDensaProps } from "@/components/ciaara/tabela-densa";

type Linha = { readonly nome: string; readonly horas: number };

/** ⚠️ DESORDENADA DE PROPÓSITO: se a tabela se ordenar sozinha, esta ordem não sobrevive. */
const LINHAS: readonly Linha[] = [
  { nome: "Zulu", horas: 3 },
  { nome: "Alfa", horas: 9 },
  { nome: "Mike", horas: 1 },
];

const COLUNAS: readonly Coluna<Linha>[] = [
  { chave: "nome", titulo: "Nome", ordenavel: true, valor: (l) => l.nome, celula: (l) => l.nome },
  {
    chave: "horas",
    titulo: "Horas",
    numerica: true,
    ordenavel: true,
    valor: (l) => l.horas,
    celula: (l) => String(l.horas),
  },
];

function desenhar(extra: Partial<TabelaDensaProps<Linha>> = {}): string {
  return renderToStaticMarkup(
    createElement(TabelaDensa<Linha>, {
      linhas: LINHAS,
      colunas: COLUNAS,
      chaveLinha: (l) => l.nome,
      rotulo: "Amostra",
      ...extra,
    }),
  );
}

/** A ordem em que os nomes aparecem no que foi desenhado. */
function ordemNaTela(marcacao: string): string[] {
  return ["Zulu", "Alfa", "Mike"]
    .map((nome) => ({ nome, onde: marcacao.indexOf(`>${nome}<`) }))
    .filter((x) => x.onde >= 0)
    .sort((a, b) => a.onde - b.onde)
    .map((x) => x.nome);
}

describe("`SC-009` · não controlada, ela continua exatamente como a fatia (b) a entregou", () => {
  it("sem propriedade alguma, a ordem é a de chegada", () => {
    expect(ordemNaTela(desenhar())).toEqual(["Zulu", "Alfa", "Mike"]);
  });

  it("sem propriedade alguma, nenhuma coluna se declara ordenada", () => {
    expect(desenhar()).not.toContain('aria-sort="ascending"');
    expect(desenhar()).not.toContain('aria-sort="descending"');
  });

  it("todas as linhas aparecem — não há filtro sem alguém pedir", () => {
    expect(ordemNaTela(desenhar())).toHaveLength(3);
  });
});

describe("`FR-012` · controlada, quem manda é quem chama", () => {
  it("a ordenação vem de fora, crescente", () => {
    const saida = desenhar({ ordem: { chave: "nome", crescente: true } });
    expect(ordemNaTela(saida)).toEqual(["Alfa", "Mike", "Zulu"]);
    expect(saida).toContain('aria-sort="ascending"');
  });

  it("a ordenação vem de fora, decrescente, e por coluna numérica", () => {
    const saida = desenhar({ ordem: { chave: "horas", crescente: false } });
    expect(ordemNaTela(saida)).toEqual(["Alfa", "Zulu", "Mike"]);
    expect(saida).toContain('aria-sort="descending"');
  });

  it("a busca vem de fora e recorta", () => {
    expect(ordemNaTela(desenhar({ busca: "al" }))).toEqual(["Alfa"]);
  });

  it("⚠️ controlar a LEITURA não exige entregar o retorno de chamada", () => {
    // Uma tabela de impressão recebe o recorte e não oferece clique nenhum. Exigir `aoOrdenar` para
    // aceitar `ordem` obrigaria essa tela a inventar uma função vazia.
    expect(ordemNaTela(desenhar({ ordem: { chave: "nome", crescente: true } }))).toEqual([
      "Alfa",
      "Mike",
      "Zulu",
    ]);
  });
});

describe("`FR-012.1` · fonte única — a PRESENÇA da propriedade decide", () => {
  it("⚠️ `ordem: null` é PRESENÇA, e significa sem ordenação", () => {
    /*
     * É a distinção que `exactOptionalPropertyTypes` torna possível e que uma conferência por
     * `undefined` apagaria: ausente e nulo seriam o mesmo caso, e uma tabela controlada com ordem
     * nula voltaria a se ordenar sozinha — em silêncio, e só depois do primeiro clique.
     */
    const saida = desenhar({ ordem: null, aoOrdenar: () => {} });
    expect(ordemNaTela(saida)).toEqual(["Zulu", "Alfa", "Mike"]);
  });

  it('`busca: ""` é presença, e significa sem filtro', () => {
    expect(ordemNaTela(desenhar({ busca: "", aoBuscar: () => {} }))).toHaveLength(3);
  });

  const FONTE = readFileSync(resolve(process.cwd(), "components/ciaara/tabela-densa.tsx"), "utf8");

  it("a conferência é `in`, e não comparação com `undefined`", () => {
    expect(FONTE).toContain('"ordem" in props');
    expect(FONTE).toContain('"busca" in props');
    expect(FONTE).not.toContain("props.ordem !== undefined");
    expect(FONTE).not.toContain("props.busca !== undefined");
  });

  it("⚠️ NENHUM EFEITO COPIA A PROPRIEDADE PARA O ESTADO INTERNO", () => {
    /*
     * É a armadilha conhecida deste padrão, e ela não quebra nada na primeira renderização: manter
     * as duas cópias "em dia" faz elas divergirem no primeiro clique, e a tabela passa a mostrar uma
     * ordenação que a URL não tem. Quem copia é quem tem duas fontes.
     */
    const efeitos = FONTE.match(/useEffect/g) ?? [];
    expect(efeitos, "apareceu efeito na tabela: é o sinal do estado duplicado").toEqual([]);
  });
});
