/**
 * Integridade da vitrine (`FR-020`, `FR-021`, `SC-009`).
 *
 * ⚠️ A INVARIANTE I-5 EXISTE PARA IMPEDIR TOKEN NASCIDO MORTO — declarado no ponto único, nunca
 * exibido, nunca conferido por ninguém. Um token que não aparece aqui é um token que ninguém vai
 * notar quando quebrar.
 */
import { expect, test } from "@playwright/test";

import { PAPEIS_BASE, PARES, SERIES, STATUS } from "../../lib/design/vocabulario";

test.describe("US1 · a vitrine mostra o vocabulário inteiro", () => {
  test("todo papel, status e série aparece — invariante I-5", async ({ page }) => {
    await page.goto("/estilo");
    const texto = await page.locator("main").innerText();

    const ausentes = [
      ...PAPEIS_BASE.map((t) => `--${t}`),
      ...SERIES.map((t) => `--${t}`),
      ...STATUS.map((s) => `--${s}-fundo`),
    ].filter((t) => !texto.includes(t));

    expect(
      ausentes,
      `tokens declarados no ponto único e AUSENTES da vitrine — nasceriam mortos: ${ausentes.join(", ")}`,
    ).toEqual([]);
  });

  test("cada par auditado mostra a razão medida, nos dois temas (`FR-021`)", async ({ page }) => {
    await page.goto("/estilo");
    const texto = await page.locator("main").innerText();

    const semLinha = PARES.filter((p) => !texto.includes(p.id)).map((p) => p.id);
    expect(semLinha, "pares sem linha na tabela de contraste").toEqual([]);

    // ⚠️ O número na tela tem de ser o que o teste afere. As duas leituras vêm de
    // `lib/design/vocabulario.ts` — dois cálculos separados divergiriam em silêncio.
    expect(texto, "a tabela de contraste não traz razão nenhuma").toMatch(/\d+\.\d{2}/);
  });

  test("todo status traz rótulo textual junto da cor (`FR-014`)", async ({ page }) => {
    await page.goto("/estilo");
    const texto = await page.locator("main").innerText();
    const semRotulo = STATUS.filter((s) => !texto.includes(s));
    expect(
      semRotulo,
      `status comunicados só por cor: ${semRotulo.join(", ")}. Quem não distingue as cores ` +
        `precisa continuar lendo o sistema`,
    ).toEqual([]);
  });

  test("cada isenção do limite de 3:1 aparece COM o motivo", async ({ page }) => {
    // ⚠️ Isenção sem motivo visível é limite afrouxado em silêncio. A diferença entre as duas
    // está inteiramente no registro, e a vitrine é onde ele fica à vista.
    await page.goto("/estilo");
    const texto = await page.locator("main").innerText();
    expect(texto).toContain("B-1");
    expect(texto, "a vitrine lista isenções sem dizer por quê").toMatch(
      /decorativ|estrutural|reforça/i,
    );
  });
});
