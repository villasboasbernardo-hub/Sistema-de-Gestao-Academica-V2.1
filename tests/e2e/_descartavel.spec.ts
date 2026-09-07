import { expect, test } from "@playwright/test";

test("descartavel — prova do FR-015 e do CHK011", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("ESTE TEXTO NAO EXISTE NA PAGINA");
});
