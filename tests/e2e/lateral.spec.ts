/**
 * A lateral recolhível (`FR-001` a `FR-011` da spec 012, `SC-001`, `SC-003`, `SC-010`).
 *
 * ⚠️ **O QUE ESTA SUÍTE MEDE É A LARGURA DA CAIXA, E NÃO A VISIBILIDADE DO RÓTULO.** A tentação é
 * escrever `expect(rotulo).toBeHidden()` — e ela **passaria pelo motivo errado**: o Playwright chama
 * visível todo elemento com caixa não vazia, então um rótulo em `sr-only` (1 px) ou em `opacity: 0`
 * conta como **visível** para ele. Largura do `<nav>` e opacidade calculada são o que discrimina.
 *
 * ⚠️ **E O PONTEIRO É DE VERDADE.** `nav.hover()` move o mouse e `page.mouse.move()` o afasta; não há
 * classe injetada nem estado forçado. É o único jeito de provar o `FR-003`, que fala de apontar — e é
 * também o caminho pelo qual seis outros arquivos desta suíte clicam no menu, porque o Playwright
 * passa o mouse antes de todo clique.
 */
import { expect, test } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { MENU } from "../../lib/navegacao/menu";

const NAV = '[data-slot="navegacao-lateral"]';
const FIXAR = '[data-slot="fixar-lateral"]';

/** Acima deste valor a lateral está expandida; abaixo, recolhida. O desenho usa 56 px e 224 px. */
const LARGURA_DE_CORTE = 140;

let EMAIL = "";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("lateral", info.workerIndex);
  await criarConta(EMAIL, `USR-LAT-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

async function larguraDaLateral(page: import("@playwright/test").Page): Promise<number> {
  const caixa = await page.locator(NAV).boundingBox();
  return caixa?.width ?? 0;
}

function rotuloDe(page: import("@playwright/test").Page, rotulo: string) {
  return page.locator(`${NAV} [data-entrada] span`, { hasText: rotulo }).first();
}

test.describe("`FR-001` · a lateral nasce recolhida, e devolve a largura à tela", () => {
  test("recolhida: só ícones, com o nome do link intacto", async ({ page }) => {
    await entrar(page, EMAIL);

    const nav = page.locator(NAV);
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute("data-fixada", "false");

    expect(
      await larguraDaLateral(page),
      "a lateral não nasceu recolhida — ela abriu com a largura de antes",
    ).toBeLessThan(LARGURA_DE_CORTE);

    /*
     * ⚠️ **O NOME DO LINK CONTINUA EXISTINDO, E É DISSO QUE DEPENDE O RESTO DA SUÍTE.** Seis
     *    arquivos clicam `getByRole("link", { name: "<rótulo>", exact: true })` dentro deste `<nav>`.
     *    Se o rótulo saísse do DOM, todos quebrariam — e o leitor de tela anunciaria um menu de
     *    ícones sem nome.
     */
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", {
        name: "Cursos",
        exact: true,
      }),
    ).toHaveCount(1);

    // ⚠️ O rótulo está apagado, não removido: é a opacidade que o esconde.
    await expect(rotuloDe(page, "Cursos")).toHaveCSS("opacity", "0");
  });

  test("⚠️ `FR-009` · a ordem é a da `D-NAV-1`, e o que não tem tela segue marcado", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    const entradas = await page.locator(`${NAV} [data-entrada]`).all();
    const rotas = await Promise.all(entradas.map((e) => e.getAttribute("data-entrada")));

    expect(rotas, "a ordem do menu não é a que a `D-NAV-1` validou em 04/10/2026").toEqual(
      MENU.map((e) => e.rota),
    );
    await expect(page.locator(`${NAV}`).getByText("em breve")).toHaveCount(
      MENU.filter((e) => !e.disponivel).length,
    );
  });
});

test.describe("`FR-003` · apontar expande, afastar recolhe", () => {
  test("com o mouse de verdade, sem clicar em nada", async ({ page }) => {
    await entrar(page, EMAIL);
    const nav = page.locator(NAV);

    await nav.hover();
    await expect
      .poll(() => larguraDaLateral(page), {
        message: "apontar para a lateral não a expandiu",
      })
      .toBeGreaterThan(LARGURA_DE_CORTE);
    await expect(rotuloDe(page, "Cursos")).toHaveCSS("opacity", "1");

    // Afasta o ponteiro para o meio do conteúdo — fora da lateral, sem clicar.
    await page.mouse.move(900, 400);
    await expect
      .poll(() => larguraDaLateral(page), {
        message: "a lateral ficou expandida depois de o ponteiro sair",
      })
      .toBeLessThan(LARGURA_DE_CORTE);

    // ⚠️ E apontar NÃO fixa: o estado persistido continua intocado.
    await expect(nav).toHaveAttribute("data-fixada", "false");
  });
});

test.describe("`FR-004`, `FR-005` · clicar fixa, e o fixado sobrevive", () => {
  test("fixa, atravessa a navegação, sobrevive ao recarregamento e solta", async ({
    page,
    context,
  }) => {
    await entrar(page, EMAIL);
    const nav = page.locator(NAV);

    await page.locator(FIXAR).click();
    await expect(page.locator(FIXAR)).toHaveAttribute("aria-pressed", "true");
    await expect(nav).toHaveAttribute("data-fixada", "true");
    await expect.poll(() => larguraDaLateral(page)).toBeGreaterThan(LARGURA_DE_CORTE);

    const cookie = (await context.cookies()).find((c) => c.name === "ciaara-lateral");
    expect(cookie?.value, "fixar não gravou a preferência").toBe("fixada");

    // Troca de tela POR CLIQUE, não por `goto`.
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Cursos", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos");
    await expect(nav, "a lateral recolheu ao trocar de página").toHaveAttribute(
      "data-fixada",
      "true",
    );

    /*
     * ⚠️ **A LINHA ACIMA, SOZINHA, NÃO PROVA QUE O COOKIE FUNCIONA — E ISSO FOI MEDIDO.** Clicar num
     *    `<Link>` é navegação do CLIENTE: a casca não remonta, e o estado sobrevive **em memória**.
     *    Com o defeito deliberado da T011 no servidor (o layout deixando de ler o cookie), este
     *    caso **passava** — ele mede que a navegação macia não perde o estado, que é promessa de
     *    verdade, mas não encosta no cookie.
     *
     *    **Quem mede a travessia de verdade é uma CARGA COMPLETA**, e é o que a aba nova faz: outro
     *    documento, mesmo cookie, servidor decidindo de novo. ⚠️ Aqui o `goto` é legítimo — é o
     *    ponto de partida desta aba, não um atalho no meio de um percurso.
     */
    const outraAba = await context.newPage();
    await outraAba.goto("/inicio");
    await expect(
      outraAba.locator(NAV),
      "numa aba nova a lateral abriu recolhida: a preferência não atravessou a carga completa",
    ).toHaveAttribute("data-fixada", "true");
    await outraAba.close();

    await page.locator(FIXAR).click();
    await expect(nav).toHaveAttribute("data-fixada", "false");
    const soltou = (await context.cookies()).find((c) => c.name === "ciaara-lateral");
    expect(soltou?.value, "soltar não gravou a preferência").toBe("recolhida");
  });

  test("⚠️ o estado fixado vem do SERVIDOR — nenhuma correção depois da hidratação", async ({
    page,
    context,
  }) => {
    await entrar(page, EMAIL);
    await page.locator(FIXAR).click();
    await expect(page.locator(NAV)).toHaveAttribute("data-fixada", "true");

    /*
     * ⚠️ **A MEDIÇÃO É EM DUAS METADES, E NENHUMA DELAS É CAPTURA DE TELA.** O flash dura
     *    milissegundos: uma captura tirada depois que a página assentou mostra o estado CERTO mesmo
     *    quando a tela piscou.
     *
     *    **Metade 1 — o que o SERVIDOR mandou**, lido no próprio HTML, sem navegador no caminho.
     *    É a metade que discrimina: com o estado descoberto só no cliente, o HTML sai com
     *    `data-fixada="false"` e esta linha reprova. **Medido em 04/10/2026, com o defeito
     *    deliberado da T011 no lugar: o HTML trazia exatamente `"false"`.**
     *
     *    **Metade 2 — ninguém o corrige depois**: zero mudanças do atributo durante o carregamento.
     */
    const html = await page.request.get(page.url()).then((r) => r.text());
    expect(
      html,
      "o HTML veio do servidor com a lateral recolhida: quem descobre o estado é o navegador, e a " +
        "tela vai saltar depois da hidratação — o flash que o `FR-005` proíbe",
    ).toContain('data-fixada="true"');

    /*
     * ⚠️ **`observe(document)`, E NÃO `document.documentElement` — ISSO FOI MEDIDO, COM CUSTO.**
     *    `addInitScript` roda **antes de o documento ter elemento raiz**: medido em 04/10/2026,
     *    `document.documentElement` é `null` ali, `observe()` lança
     *    *"parameter 1 is not of type 'Node'"*, e o observador **nunca existe**. A primeira versão
     *    deste caso fazia isso e **passava com o defeito deliberado no lugar**, sobre uma lista
     *    vazia — o modo de falha mais caro que existe num teste: verde por cegueira. `document` é
     *    `Node` desde o primeiro instante, e `subtree` alcança nós criados depois.
     */
    await page.addInitScript(() => {
      const janela = window as unknown as { __mudancas?: string[] };
      janela.__mudancas = [];
      new MutationObserver((registros) => {
        for (const r of registros) {
          const alvo = r.target as HTMLElement;
          janela.__mudancas?.push(alvo.getAttribute("data-fixada") ?? "ausente");
        }
      }).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-fixada"],
      });
    });

    await page.reload({ waitUntil: "commit" });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(NAV)).toHaveAttribute("data-fixada", "true");

    const mudancas = await page.evaluate(
      () => (window as unknown as { __mudancas?: string[] }).__mudancas ?? ["OBSERVADOR-AUSENTE"],
    );
    expect(
      mudancas,
      "`data-fixada` MUDOU durante o carregamento: a lateral abriu num estado e saltou para o " +
        "outro depois da hidratação, que é o flash que o `FR-005` proíbe",
    ).toEqual([]);

    await context.clearCookies();
  });
});

test.describe("`FR-008`, `FR-006` · teclado e tela estreita", () => {
  test("entrar na lateral por `Tab` expande, e o atalho continua sendo a primeira parada", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    await page.keyboard.press("Tab");
    await expect(
      page.locator(":focus"),
      "a primeira parada de tabulação deixou de ser o atalho para o conteúdo",
    ).toHaveText(/pular para o conteúdo/i);

    // Segue tabulando até cair dentro da lateral — o foco ali dentro expande, sem mouse nenhum.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const dentro = await page.locator(`${NAV} :focus`).count();
      if (dentro > 0) break;
    }
    await expect(page.locator(`${NAV} :focus`)).toHaveCount(1);
    await expect
      .poll(() => larguraDaLateral(page), {
        message: "o foco dentro da lateral não a expandiu — quem usa teclado veria só ícones",
      })
      .toBeGreaterThan(LARGURA_DE_CORTE);
  });

  test("a 800px a navegação é gaveta, e apontar não expande nada", async ({ page }) => {
    await entrar(page, EMAIL);
    await page.setViewportSize({ width: 800, height: 900 });

    const botao = page.getByRole("button", { name: "Menu" });
    await expect(botao).toBeVisible();
    await expect(page.locator(NAV)).toBeHidden();
    // ⚠️ O controle de fixar NÃO existe na gaveta: não há o que fixar onde o menu já abre inteiro.
    await expect(page.locator(FIXAR)).toBeHidden();

    await botao.click();
    await expect(page.locator(NAV)).toBeVisible();

    const largura = await larguraDaLateral(page);
    await page.locator(NAV).hover();
    expect(
      await larguraDaLateral(page),
      "apontar expandiu a gaveta: as regras de desktop escaparam do ponto de quebra",
    ).toBe(largura);
  });
});
