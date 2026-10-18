/**
 * Ver a senha — FR-003 da spec 016 (item 1.3 do plano de correções), por clique.
 *
 * > *"Botão de olho que mostra e oculta a senha, no login e na troca do primeiro acesso."*
 * > — Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O PRIMEIRO ACESSO É CONFERIDO EM `admin-sobre-contas.spec.ts`** (passo 7b), que já percorre o
 * cadastro pelo Admin, a senha temporária e o redirecionamento para `/perfil/senha`: repetir esse
 * percurso aqui seria criar uma segunda conta pela tela só para olhar o mesmo componente.
 *
 * ⚠️ **ESTA SUÍTE NÃO TROCA A SENHA**: ela só aciona o olho e lê o `type` do campo. A conta de teste
 * entra com a senha fixa e continua com ela.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar, SENHA_DE_TESTE } from "./conta-de-teste";

let EMAIL = "";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("ver-senha", info.workerIndex);
  // ⚠️ `operador`, não `admin`: um Admin a mais derruba casos de `rls.test.ts` (gotcha 8).
  await criarConta(EMAIL, `USR-VERSENHA-${info.workerIndex}`, "operador");
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

/** Aciona o olho de UM campo e confere o `type` nos dois sentidos. */
async function alternarOlho(page: Page, campo: string): Promise<void> {
  const entrada = page.locator(`input[name="${campo}"]`);
  const caixa = entrada.locator("xpath=..");
  await expect(entrada).toHaveAttribute("type", "password");

  await caixa.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(entrada).toHaveAttribute("type", "text");

  await caixa.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(entrada).toHaveAttribute("type", "password");
}

test.describe("`FR-003` da spec 016 · o olho da senha", () => {
  test("no login: mostra, oculta, e o olho não envia o formulário", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="senha"]').fill(SENHA_DE_TESTE);

    await alternarOlho(page, "senha");
    // ⚠️ Acionar o olho NÃO enviou nada: a página continua no login, com o valor digitado.
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    await expect(page.locator('input[name="senha"]')).toHaveValue(SENHA_DE_TESTE);

    await page.getByRole("button", { name: /entrar/i }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe("/login");
  });

  test("na troca voluntária: os dois campos têm o olho, alcançados por clique", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: "Meu perfil" }).click();
    await page.getByRole("link", { name: "Trocar a minha senha" }).click();
    await expect(page.getByRole("heading", { name: "Trocar a minha senha" })).toBeVisible();

    await alternarOlho(page, "senha");
    await alternarOlho(page, "confirmacao");
  });
});
