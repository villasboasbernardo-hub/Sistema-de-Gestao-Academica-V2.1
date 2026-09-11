/**
 * A biblioteca de estado na URL funciona **nesta versão do arcabouço** (`FR-001`).
 *
 * ⚠️ ESTE ARQUIVO EXISTE PARA SER RODADO ANTES DE QUALQUER COISA DEPENDER DELA. Os pares declarados
 * dizem `next >=14.2.0`, o que **não exclui a versão instalada nem a afirma**. Satisfazer a faixa
 * não é o mesmo que estar testado nela.
 *
 * ⚠️ É A LIÇÃO DA FATIA (b), e ela custou caro: a inicialização padrão trouxe uma base de
 * componentes diferente da decidida, **e a tela ficava idêntica**. Sem uma verificação, aquilo teria
 * entrado sem ninguém notar.
 *
 * ⚠️ ELE NÃO USA O CONTRATO DE PARÂMETROS, e não deve — o contrato nasce depois. O parâmetro `demo`
 * não pertence a rota nenhuma: ele é a prova, não o produto.
 */
import { expect, test } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

const ESCOLHIDO = '[data-slot="amostra-estado-na-url"] strong';

test.describe("FR-001 · a biblioteca escreve, lê e limpa a barra de endereço", () => {
  test("escolher um valor põe o parâmetro na URL", async ({ page }) => {
    await abrirVitrine(page);
    await page.getByRole("button", { name: "bravo", exact: true }).click();

    await expect.poll(() => new URL(page.url()).searchParams.get("demo")).toBe("bravo");
    await expect(page.locator(ESCOLHIDO)).toHaveAttribute("data-valor", "bravo");
  });

  test("o valor sobrevive ao recarregamento", async ({ page }) => {
    // ⚠️ É o comportamento que a v2.0 não tinha, e o motivo de o `AppState` existir: lá, recarregar
    // perdia o contexto, porque ele morava em memória.
    await abrirVitrine(page);
    await page.getByRole("button", { name: "charlie", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("demo")).toBe("charlie");

    await page.reload();
    await expect(page.locator(ESCOLHIDO)).toHaveAttribute("data-valor", "charlie");
  });

  test("voltar ao padrão TIRA o parâmetro da URL", async ({ page }) => {
    // ⚠️ É o `FR-002` exercitado antes de existir: parâmetro no valor padrão não aparece, e é isso
    // que mantém o link curto e o link compartilhado sem ruído.
    await abrirVitrine(page);
    await page.getByRole("button", { name: "alfa", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("demo")).toBe("alfa");

    await page.getByRole("button", { name: "alfa", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.has("demo")).toBe(false);
  });

  test("o botão voltar do navegador desfaz a escolha", async ({ page }) => {
    await abrirVitrine(page);
    await page.getByRole("button", { name: "alfa", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("demo")).toBe("alfa");

    await page.getByRole("button", { name: "bravo", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("demo")).toBe("bravo");

    await page.goBack();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("demo"), {
        message: "o histórico não guardou a troca de valor",
      })
      .toBe("alfa");
  });
});
