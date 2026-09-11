/**
 * O estado efêmero **permanece onde está** (`FR-013`, documento 25 §3.3).
 *
 * ⚠️ ESTE ARQUIVO GUARDA O ERRO OPOSTO AO DA TABELA DENSA, e é por isso que ele existe. A fatia (c)
 * leva recorte para a URL; empurrar painel aberto, seção recolhida e posição do foco junto seria
 * igualmente proibido — e nada estava conferindo isso. A não regressão da tabela mede só a tabela.
 *
 * ⚠️ O CRITÉRIO NÃO É UMA LISTA DE CASOS, É UMA PERGUNTA (`FR-010`): **este estado faz sentido num
 * link que eu mando para outra pessoa?**
 *
 * | Exemplo — vai para a URL | Contraexemplo — fica no componente |
 * |---|---|
 * | a turma que estou vendo | o painel de filtros estar aberto |
 * | o recorte por classificação | o texto digitado dentro do seletor, antes de escolher |
 * | a coluna pela qual ordenei | qual linha tem o foco do teclado |
 *
 * ⚠️ E A MEDIÇÃO É DE 11/09/2026: dos quatro componentes da fatia (b) com estado, **só a tabela
 * densa** guardava algo digno de link. Os outros três guardam efêmero, e a refatoração pedida em
 * plural era, medida, uma refatoração no singular.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/** Os três que guardam estado efêmero, e o que cada um guarda. */
const EFEMEROS = [
  {
    arquivo: "components/ciaara/seletor-instrutor.tsx",
    guarda: "o texto digitado dentro do painel, antes de alguém escolher",
  },
  {
    arquivo: "components/ciaara/filtro-avancado.tsx",
    guarda: "o painel estar recolhido ou aberto",
  },
  {
    arquivo: "components/ciaara/lista-navegavel.tsx",
    guarda: "qual célula tem o foco do teclado",
  },
] as const;

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("`FR-013` · os três continuam guardando o estado deles", () => {
  it.each(EFEMEROS)("$arquivo ainda tem estado interno — $guarda", ({ arquivo }) => {
    const codigo = semComentarios(readFileSync(resolve(process.cwd(), arquivo), "utf8"));
    expect(
      /React\.useState|useState\(/.test(codigo),
      "o estado interno sumiu: ele foi empurrado para fora, que é o erro oposto",
    ).toBe(true);
  });

  it.each(EFEMEROS)("$arquivo NÃO ganhou propriedade de controle desse estado", ({ arquivo }) => {
    /*
     * ⚠️ O SINAL É O PAR: uma propriedade de valor com o retorno de chamada correspondente é o que
     * transforma estado interno em estado de quem chama. `aoMudar` sozinho não conta — o filtro
     * avançado tem um desde a fatia (b), e ele devolve o **recorte**, não o painel aberto.
     */
    const codigo = semComentarios(readFileSync(resolve(process.cwd(), arquivo), "utf8"));
    for (const par of ["aoAbrir", "aoRecolher", "aoFocar", "aoDigitar", "aoMudarFoco"]) {
      expect(codigo, `${arquivo} passou a expor ${par}`).not.toContain(par);
    }
  });
});

describe("controle positivo · a tabela densa É a exceção, e de propósito", () => {
  it("só ela expõe o recorte a quem chama", () => {
    // Sem este caso, os testes acima passariam num mundo em que ninguém expôs nada — inclusive a
    // tabela, que era justamente o achado a corrigir.
    const tabela = readFileSync(
      resolve(process.cwd(), "components/ciaara/tabela-densa.tsx"),
      "utf8",
    );
    expect(tabela).toContain("aoOrdenar");
    expect(tabela).toContain("aoBuscar");
  });
});
