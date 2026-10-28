/**
 * A abertura com a moeda na raiz (spec 028, Bloco 13): SC-001 a SC-005.
 *
 * ⚠️ A RAIZ EXIGE SESSÃO (`lib/supabase/middleware.ts`, `SEM_SESSAO`): cada caso entra pelo Início — o ajudante
 *    `entrar` espera o menu da casca, que a raiz não tem — e então abre `/`.
 * ⚠️ A ABA OCULTA É SIMULADA: o navegador do teste está sempre visível, então um script de página troca
 *    `document.visibilityState` e dispara `visibilitychange`, que é exatamente o que a folha escuta.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let EMAIL = "";

test.beforeAll(async ({}, info) => {
  const p = info.parallelIndex;
  EMAIL = emailDeTeste("abertura", p);
  await criarConta(EMAIL, `USR-ABERTURA-${p}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

const palco = (page: Page) => page.locator('[data-slot="abertura"]');
const botao = (page: Page) => page.getByRole("link", { name: "Início", exact: true });

/** Instala a aba controlável ANTES de abrir a raiz. */
async function abaControlavel(page: Page, inicial: "visible" | "hidden"): Promise<void> {
  await page.addInitScript((estadoInicial) => {
    let estado: string = estadoInicial;
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => estado === "hidden",
    });
    (window as unknown as { mudarAba: (novo: string) => void }).mudarAba = (novo: string) => {
      estado = novo;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  }, inicial);
}

async function mudarAba(page: Page, estado: "visible" | "hidden"): Promise<void> {
  await page.evaluate((novo) => {
    (window as unknown as { mudarAba: (n: string) => void }).mudarAba(novo);
  }, estado);
}

async function abrirRaiz(page: Page): Promise<void> {
  await entrar(page, EMAIL, "/inicio");
  await page.goto("/");
  await expect(palco(page)).toBeVisible();
}

test.describe("SC-001 · da raiz ao Início, por clique", () => {
  test("Esc pula: o botão aparece focado, e o clique leva ao Início", async ({ page }) => {
    await abrirRaiz(page);
    /*
     * ⚠️ O PULAR SÓ SE PROVA ANTES DO FIM NATURAL (revisão adversarial de 27/10/2026): sem o Esc, o roteiro termina
     *    sozinho em ~3,5 s e o botão aparece do mesmo jeito, dentro dos 10 s do `expect`. Por isso: esperar `tocando`
     *    (a página hidratou, o ouvinte existe e o roteiro corre) e cobrar o botão em 1 s — bem antes do fim natural.
     */
    await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
    await page.keyboard.press("Escape");
    await expect(botao(page)).toBeVisible({ timeout: 1_000 });
    await expect(botao(page)).toBeFocused();
    await expect(palco(page)).toHaveAttribute("data-fase", "fim");

    // FR-001: só a moeda e o botão; o que saiu da raiz não volta.
    await expect(page.getByRole("main", { name: "Abertura do CIAARA-11" })).toBeVisible();
    for (const texto of [
      "CIAARA-11 · Gestão Acadêmica",
      "Ir para o Início",
      "A produção do CIAARA-11 continua",
      "O panorama das turmas fica na tela Início",
    ]) {
      await expect(page.getByText(texto)).toHaveCount(0);
    }

    await botao(page).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/inicio");
  });

  test("o clique na moeda também pula", async ({ page }) => {
    await abrirRaiz(page);
    await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
    await page.locator('[data-slot="moeda"]').click();
    await expect(botao(page)).toBeVisible({ timeout: 1_000 });
    await expect(botao(page)).toBeFocused();
  });

  test("sem pular, a animação termina sozinha e revela o botão", async ({ page }) => {
    await abrirRaiz(page);
    await expect(botao(page)).toBeVisible({ timeout: 8_000 });
    await expect(botao(page)).toBeFocused();
  });
});

test("SC-002 · antes do fim, o botão está oculto e o Tab não chega nele", async ({ page }) => {
  await abaControlavel(page, "visible");
  await abrirRaiz(page);
  await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
  await expect(botao(page)).toBeHidden();
  /*
   * ⚠️ O FOCO SE CONFERE A CADA Tab (revisão adversarial de 27/10/2026): o botão é o único focável da raiz, e com um
   *    número par de Tabs o foco volta ao `body` mesmo quando ele é alcançável — o caso passaria com o defeito.
   */
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    const focado = await page.evaluate(
      () => document.activeElement?.getAttribute("data-slot") ?? "",
    );
    expect(focado, `o Tab nº ${i + 1} alcançou o botão antes de ele aparecer`).not.toBe(
      "ir-ao-inicio",
    );
  }
  await expect(botao(page)).toBeHidden();
});

test("SC-003 · com movimento reduzido, a raiz abre no quadro final", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrirRaiz(page);
  await expect(botao(page)).toBeVisible({ timeout: 1_500 });
  await expect(botao(page)).toBeFocused();
  await expect(palco(page)).toHaveAttribute("data-fase", "fim");
});

test.describe("SC-004 · a aba oculta pausa, e a animação retoma de onde parou", () => {
  test("oculta no meio: pausa; de volta: retoma e termina", async ({ page }) => {
    await abaControlavel(page, "visible");
    await abrirRaiz(page);
    await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
    await page.waitForTimeout(600);

    await mudarAba(page, "hidden");
    await expect(palco(page)).toHaveAttribute("data-fase", "pausado");
    const tocando = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    );
    expect(tocando, "há animação rodando com a aba oculta").toBe(0);

    /*
     * ⚠️ «DE ONDE PAROU» SE PROVA PELO RELÓGIO DAS ANIMAÇÕES (revisão adversarial de 27/10/2026): com a aba oculta o
     *    tempo de cada uma fica parado, e ao voltar ele continua daquele ponto — recomeçar do zero o faria cair.
     */
    const tempos = () =>
      page.evaluate(() => document.getAnimations().map((a) => Number(a.currentTime ?? 0)));
    /*
     * ⚠️ A PAUSA SÓ CONGELA O TEMPO NO QUADRO SEGUINTE (medido no CI em 27/10/2026, run 40618471857): `pause()` deixa a
     *    animação «pendente» até o próximo quadro, e quem lê o tempo antes disso vê um quadro a menos — 550 ms contra
     *    566,6 ms 800 ms depois, e o caso reprovou uma vez. `ready` resolve quando a pausa foi aplicada.
     */
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.ready)));
    const parado = await tempos();
    expect(Math.max(...parado), "a animação não tinha andado antes de a aba sumir").toBeGreaterThan(
      200,
    );
    await page.waitForTimeout(800);
    expect(await tempos(), "o tempo das animações andou com a aba oculta").toEqual(parado);
    await expect(botao(page)).toBeHidden();

    await mudarAba(page, "visible");
    await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
    const retomado = await tempos();
    retomado.forEach((t, i) =>
      expect(t, `a animação ${i} recomeçou em vez de retomar`).toBeGreaterThanOrEqual(
        (parado[i] ?? 0) - 50,
      ),
    );
    await expect(botao(page)).toBeVisible({ timeout: 8_000 });
    await expect(palco(page)).toHaveAttribute("data-fase", "fim");
  });

  test("oculta desde a abertura: não começa até a aba ficar visível", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await abaControlavel(page, "hidden");
    await page.goto("/");
    await expect(palco(page)).toBeVisible();
    await page.waitForTimeout(4_500);
    await expect(palco(page)).toHaveAttribute("data-fase", "aguardando");
    await expect(botao(page)).toBeHidden();

    await mudarAba(page, "visible");
    await expect(palco(page)).toHaveAttribute("data-fase", "tocando");
    await expect(botao(page)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("SC-005 · ouro no tema claro, prata no escuro", () => {
  const face = (page: Page, metal: "ouro" | "prata") =>
    page.locator(`img[data-face="frente"][data-metal="${metal}"]`);

  test("claro: a moeda é ouro", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await abrirRaiz(page);
    await page.keyboard.press("Escape");
    await expect(face(page, "ouro")).toBeVisible();
    await expect(face(page, "prata")).toBeHidden();
  });

  test("escuro: a moeda é prata", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await abrirRaiz(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(face(page, "prata")).toBeVisible();
    await expect(face(page, "ouro")).toBeHidden();
  });
});
