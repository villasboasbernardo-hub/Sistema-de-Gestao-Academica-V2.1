/**
 * Tema claro e noturno: escolha, persistência e — o que importa — AUSÊNCIA DE FLASH.
 * (`FR-006` a `FR-010`, `SC-003`, `SC-004`)
 *
 * ⚠️ ESTES TESTES RODAM NA VITRINE porque, até a fatia (c), não existe cabeçalho nem navegação.
 * Sem ela não haveria onde clicar, e a história 2 sairia da fatia sem que ninguém pudesse
 * exercitá-la.
 */
import { expect, test, type Page } from "@playwright/test";

const VITRINE = "/estilo";

/** A classe que o provedor escreve no elemento raiz. */
const classeDoTema = (page: Page) => page.evaluate(() => document.documentElement.className);

test.describe("US2 · tema escolhido e lembrado", () => {
  test("a escolha do noturno sobrevive ao recarregamento e a outra aba", async ({
    page,
    context,
  }) => {
    await page.goto(VITRINE);
    await page.getByTestId("tema-dark").click();
    await expect.poll(() => classeDoTema(page)).toContain("dark");

    await page.reload();
    await expect
      .poll(() => classeDoTema(page), { message: "a escolha não sobreviveu ao recarregamento" })
      .toContain("dark");

    const outraAba = await context.newPage();
    await outraAba.goto(VITRINE);
    await expect
      .poll(() => classeDoTema(outraAba), { message: "a escolha não valeu na aba nova" })
      .toContain("dark");
    await outraAba.close();
  });

  test("sem escolha manual, segue a preferência do sistema operacional", async ({ browser }) => {
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await pagina.goto(VITRINE);
    await expect.poll(() => classeDoTema(pagina)).toContain("dark");
    await contexto.close();
  });

  test("havendo escolha manual, ela prevalece sobre o sistema operacional", async ({ browser }) => {
    // ⚠️ O sistema pede escuro; a pessoa escolheu claro. A escolha vence — é o `FR-008`, e é o
    // caso que uma implementação ingênua erra, porque o sinal do sistema chega depois.
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await pagina.goto(VITRINE);
    await pagina.getByTestId("tema-light").click();
    await expect.poll(() => classeDoTema(pagina)).toContain("light");

    await pagina.reload();
    await expect
      .poll(() => classeDoTema(pagina), { message: "o sistema operacional atropelou a escolha" })
      .toContain("light");
    await contexto.close();
  });

  test("armazenamento indisponível não quebra nem pisca — degradação segura", async ({
    browser,
  }) => {
    // ⚠️ Princípio V. Janela anônima ou política do navegador: a escolha não persiste, e isso é
    // aceitável. O que não é aceitável é a página quebrar — e não há aviso, porque não é falha do
    // usuário e não há o que ele faça a respeito.
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await pagina.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("armazenamento indisponível");
        },
      });
    });
    await pagina.goto(VITRINE);
    await expect(pagina.getByRole("heading", { name: /vocabulário visual/i })).toBeVisible();
    await expect.poll(() => classeDoTema(pagina)).toContain("dark");
    await contexto.close();
  });
});

test.describe("US2 · nenhum quadro com o tema errado (`FR-009`)", () => {
  test("o tema já está aplicado ANTES da hidratação", async ({ browser }) => {
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();

    // ⚠️ A MEDIÇÃO É NA PRIMEIRA ESCRITA DA CLASSE, e não por captura de tela. O flash dura
    // milissegundos: uma captura tirada depois que a página assentou mostra o tema CERTO mesmo
    // quando o flash aconteceu — o teste passaria e o usuário continuaria vendo a página piscar.
    // É a mesma armadilha do V-4 do Épico 3, que lia a tela antes da conferência assíncrona.
    await pagina.addInitScript(() => {
      localStorage.setItem("ciaara-tema", "dark");
      const janela = window as unknown as { __primeiraClasse?: string };
      const observador = new MutationObserver(() => {
        if (janela.__primeiraClasse === undefined && document.documentElement.className) {
          janela.__primeiraClasse = document.documentElement.className;
        }
      });
      observador.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });

    await pagina.goto(VITRINE, { waitUntil: "commit" });
    await pagina.waitForLoadState("domcontentloaded");
    const primeira = await pagina.evaluate(
      () => (window as unknown as { __primeiraClasse?: string }).__primeiraClasse,
    );

    expect(
      primeira ?? (await classeDoTema(pagina)),
      "a PRIMEIRA classe escrita no elemento raiz não era o tema escolhido: houve um quadro claro " +
        "antes do noturno, que é exatamente o flash que o FR-009 proíbe",
    ).toContain("dark");
    await contexto.close();
  });
});
