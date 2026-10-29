/**
 * O papel do DSA no Início ANTES da medição — spec 029 (Bloco 14, item 8), D-28, e a revisão do Bloco 14 (achado 3).
 *
 * > *"Antes da medição no navegador, a caixa do papel já sai do servidor visível, com a proporção da folha reservada pela
 * > largura (degradação segura: sem script, o papel aparece); a medição só ajusta a escala."* — spec 029, D-28
 *
 * ⚠️ **O PÉ DA FOLHA FICAVA CORTADO, E SEM COMO CHEGAR A ELE**: a caixa reserva `aspect-ratio: 297/210` pela largura, e a
 *    folha antes da medição está na escala 1 (~1122 × 794 px). Com a caixa mais estreita que a folha — 1366 × 768 com a
 *    lateral fixada, por exemplo —, a altura reservada é menor que a da folha, e a caixa tinha `overflow-y-hidden`: as
 *    assinaturas, no pé, sumiam sem rolagem nenhuma. Sem script, era o papel inteiro da tela.
 * ⚠️ Como em `seletor-instrutor-vazio.test.ts`: o que o servidor desenha se prova com a renderização de servidor do
 *    próprio React — e ela é exatamente o quadro de antes da medição (o efeito de leiaute não roda no servidor).
 */
import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EscalaDoPapel } from "@/app/(app)/inicio/EscalaDoPapel";

/** A caixa do papel, como o servidor a desenha. */
function caixaDoServidor(): string {
  const html = renderToStaticMarkup(
    createElement(EscalaDoPapel, null, createElement("div", null, "a folha")),
  );
  const caixa = /<div[^>]*data-slot="papel-reduzido"[^>]*>/.exec(html)?.[0];
  if (caixa === undefined) throw new Error(`a caixa do papel não foi desenhada: ${html}`);
  return caixa;
}

const classesDe = (caixa: string): string[] =>
  (/class="([^"]*)"/.exec(caixa)?.[1] ?? "").split(/\s+/);

describe("D-28 · antes da medição, o papel aparece — inteiro, por rolagem (achado 3)", () => {
  it("a caixa sai do servidor com a proporção da folha pela largura, e sem escala medida", () => {
    const caixa = caixaDoServidor();
    expect(caixa).toMatch(/aspect-ratio:\s*297 \/ 210/);
    expect(caixa).not.toContain("data-escala");
  });

  it("⚠️ o caso que discrimina: a caixa ROLA nos dois eixos — o pé da folha em escala 1 não fica escondido", () => {
    const classes = classesDe(caixaDoServidor());
    expect(
      classes,
      "a caixa esconde o que passa da altura reservada: o pé da folha some",
    ).not.toContain("overflow-y-hidden");
    expect(classes).toContain("overflow-auto");
  });
});
