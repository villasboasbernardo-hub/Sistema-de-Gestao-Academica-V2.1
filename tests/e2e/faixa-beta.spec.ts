/**
 * A faixa Beta — FR-001 da spec 016 (item 1.1 do plano de correções), por clique.
 *
 * > *"Faixa fina e fixa no topo de todas as telas, inclusive login, em todos os ambientes, não
 * > fechável."* — Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **A SUÍTE DECLARA `NEXT_PUBLIC_AMBIENTE=local`** (`playwright.config.ts`), então aqui a faixa traz
 * *"· ambiente local"*. O que a Production mostra — só o texto Beta — é provado em
 * `tests/unidade/faixa-beta.test.ts`, que controla a variável.
 *
 * ⚠️ **O PAPEL SEM FAIXA** é provado em `tests/e2e/dsa-imprimir.spec.ts`, que chega à impressão pelo
 * botão *Imprimir* do DSA — o mesmo caminho de quem imprime.
 */
import { expect, test } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { TEXTO_DA_FAIXA_BETA } from "../../lib/ambiente";

let EMAIL = "";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("faixa", info.workerIndex);
  await criarConta(EMAIL, `USR-FAIXA-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

const faixa = '[data-slot="faixa-de-ambiente"]';

test.describe("`FR-001` da spec 016 · a faixa Beta", () => {
  test("o login mostra o texto Beta e o ambiente declarado", async ({ page }) => {
    await page.goto("/login");
    const elemento = page.locator(faixa);
    await expect(elemento).toBeVisible();
    await expect(elemento).toHaveText(`${TEXTO_DA_FAIXA_BETA} · ambiente local`);
    // Não fechável: nenhum botão dentro dela.
    await expect(elemento.getByRole("button")).toHaveCount(0);
  });

  test("numa tela da aplicação, a faixa continua no topo depois de rolar, sem cobrir a lateral", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 420 });
    await entrar(page, EMAIL);
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Turmas" })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const caixaDaFaixa = await page.locator(faixa).boundingBox();
    expect(caixaDaFaixa, "a faixa sumiu da tela depois de rolar").not.toBeNull();
    expect(Math.abs(caixaDaFaixa!.y)).toBeLessThanOrEqual(1);

    // A lateral fixa cola ABAIXO da faixa: com `top-0`, a faixa cobriria o alto dela.
    const caixaDaLateral = await page.locator('[data-slot="navegacao-lateral"]').boundingBox();
    expect(caixaDaLateral).not.toBeNull();
    expect(caixaDaLateral!.y).toBeGreaterThanOrEqual(caixaDaFaixa!.y + caixaDaFaixa!.height - 1);
  });

  test("a página de rota inexistente também mostra a faixa", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-no-sistema");
    await expect(page.locator(faixa)).toContainText(TEXTO_DA_FAIXA_BETA);
  });
});
