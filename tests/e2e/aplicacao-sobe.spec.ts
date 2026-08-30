/**
 * Suíte de PONTA A PONTA — roda vazia nesta fatia (FR-011).
 *
 * O percurso principal e as rotas de impressão são dos épicos 4+. O que se prova aqui é o mínimo
 * que o Épico 0 promete: a aplicação sobe a partir do build de produção.
 */
import { expect, test } from "@playwright/test";

test("a aplicação responde na raiz", async ({ page }) => {
  const resposta = await page.goto("/");
  expect(resposta?.status()).toBeLessThan(400);
});

test.skip("percurso principal do DSA — Épico 6", async () => {});
test.skip("rota de impressão /print/dsa — Épico 11", async () => {});
