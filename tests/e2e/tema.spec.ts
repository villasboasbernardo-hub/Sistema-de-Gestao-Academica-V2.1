/**
 * Tema claro e noturno: escolha, persistência e — o que importa — AUSÊNCIA DE FLASH.
 * (`FR-006` a `FR-010`, `SC-003`, `SC-004`)
 *
 * ⚠️ **ELES MUDARAM DE LUGAR EM 11/09/2026, E O MOTIVO É O `FR-018`.** Até a fatia (b) o alternador
 * morava na vitrine, porque não existia cabeçalho nem navegação — sem ele não haveria onde clicar.
 * Com a casca de pé, o alternador definitivo vive no cabeçalho e **o da vitrine saiu**: manter os
 * dois seria a duplicação que o `CHK019` previu.
 *
 * ⚠️ **SÓ OS DOIS CASOS QUE CLICAM PRECISAM DE SESSÃO.** Os demais leem preferência do sistema,
 * armazenamento e a primeira classe escrita na raiz — nada disso exige alternador, e mantê-los na
 * vitrine preserva a medição do flash na tela mais pesada do sistema, que é onde ela é mais dura.
 *
 * ⚠️ **E A PERSISTÊNCIA CONTINUA SENDO CONFERIDA NA VITRINE**, de propósito: o tema é do documento
 * inteiro, e provar a escolha numa rota e o efeito noutra é prova mais forte que fazer as duas na
 * mesma tela.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

const VITRINE = "/estilo";

/** A tela autenticada onde o alternador existe. Serve de ponto de clique, não de objeto de teste. */
const COM_CABECALHO = "/admin/usuarios";

let EMAIL = "";
let contaPronta: Promise<void> | undefined;

/**
 * ⚠️ A CONTA NASCE SÓ QUANDO ALGUÉM PRECISA DELA, e não num `beforeAll`. Três dos cinco casos desta
 * suíte não têm sessão: criar conta para todos faria **todo** processo de trabalho falar com a CLI
 * do Supabase ao mesmo tempo — que é exatamente a falha de contenção medida em 11/09/2026.
 */
async function garantirConta(processo: number): Promise<string> {
  EMAIL = emailDeTeste("tema", processo);
  contaPronta ??= criarConta(EMAIL, `USR-TEMA-${processo}`);
  await contaPronta;
  return EMAIL;
}

test.afterAll(async () => {
  if (contaPronta) await apagarConta(EMAIL);
});

/** A classe que o provedor escreve no elemento raiz. */
const classeDoTema = (page: Page) => page.evaluate(() => document.documentElement.className);

test.describe("US2 · tema escolhido e lembrado", () => {
  test("a escolha do noturno atravessa a navegação e a aba nova", async ({
    page,
    context,
  }, info) => {
    await entrar(page, await garantirConta(info.workerIndex), COM_CABECALHO);
    await page.getByTestId("tema-dark").click();
    await expect.poll(() => classeDoTema(page)).toContain("dark");

    await page.goto(VITRINE);
    await expect
      .poll(() => classeDoTema(page), {
        message: "a escolha não atravessou a navegação para outra rota",
      })
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

  test("havendo escolha manual, ela prevalece sobre o sistema operacional", async ({
    browser,
  }, info) => {
    // ⚠️ O sistema pede escuro; a pessoa escolheu claro. A escolha vence — é o `FR-008`, e é o
    // caso que uma implementação ingênua erra, porque o sinal do sistema chega depois.
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await entrar(pagina, await garantirConta(info.workerIndex), COM_CABECALHO);
    await pagina.getByTestId("tema-light").click();
    await expect.poll(() => classeDoTema(pagina)).toContain("light");

    await pagina.goto(VITRINE);
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
