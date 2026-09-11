/**
 * As três do `FR-030`, cada uma verificada. *Fecha o `CHK010`.*
 *
 * > **(a) nome acessível** — todo controle tem nome legível por leitor de tela, e nenhum depende só
 * > de ícone. **(b) região anunciada** — o alerta de conformidade é anunciado ao mudar, sem roubar o
 * > foco. **(c) ordem de leitura previsível** — a ordem do documento acompanha a ordem visual.
 *
 * ⚠️ O `CHK010` DIZIA QUE LEITOR DE TELA *"é a parte que mais custa se deixada para o fim"*. O
 * requisito anterior prometia que um requisito existiria, o que não é requisito. As três acima são
 * afirmações sobre comportamento, e as três são medíveis na árvore de acessibilidade.
 */
import { expect, test, type Page } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

/**
 * ⚠️ A ABERTURA DA VITRINE DESCEU PARA DENTRO DE CADA BLOCO EM 11/09/2026. Ela era de arquivo, e a
 * casca de navegação **não vive na vitrine** — o `FR-038` a mantém fora do grupo autenticado, de
 * propósito. Um preparo de arquivo obrigaria os casos da casca a abrir uma tela que não os contém.
 */
const naVitrine = () =>
  test.beforeEach(async ({ page }) => {
    await abrirVitrine(page);
  });

/** O nome acessível de um elemento, pela árvore de acessibilidade do navegador. */
async function semNomeAcessivel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const semNome: string[] = [];
    const controles = document.querySelectorAll<HTMLElement>(
      "button, a[href], input, select, textarea, [role='combobox'], [role='option']",
    );
    for (const c of controles) {
      if (c.hasAttribute("aria-hidden") || c.tabIndex === -1) continue;
      const rotulado = c.getAttribute("aria-labelledby");
      const porFora = rotulado
        ? rotulado
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
        : "";
      const associado = c.id
        ? (document.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.textContent ?? "")
        : "";
      const nome = [
        c.getAttribute("aria-label"),
        porFora,
        associado,
        c.textContent,
        c.getAttribute("title"),
        (c as HTMLInputElement).placeholder,
      ]
        .map((t) => (t ?? "").trim())
        .find((t) => t.length > 0);
      if (!nome) semNome.push(`${c.tagName.toLowerCase()}.${c.className.slice(0, 40)}`);
    }
    return semNome;
  });
}

test.describe("`FR-030` (a) · nome acessível em todo controle", () => {
  naVitrine();

  test("nenhum controle da vitrine fica sem nome", async ({ page }) => {
    const semNome = await semNomeAcessivel(page);
    expect(
      semNome,
      `controles sem nome acessível: ${semNome.join(", ")}. ` +
        `Um controle que só tem ícone não existe para quem usa leitor de tela.`,
    ).toEqual([]);
  });

  test("nenhum controle depende SÓ de ícone", async ({ page }) => {
    // ⚠️ O caso concreto: o botão de fechar do diálogo tem um `X` desenhado e a palavra "Fechar"
    // escondida para o leitor. O primeiro é para quem vê; a segunda, para quem não vê.
    const soIcone = await page.evaluate(() => {
      const achados: string[] = [];
      for (const b of document.querySelectorAll<HTMLElement>("button")) {
        if (b.tabIndex === -1) continue;
        const temSvg = b.querySelector("svg") !== null;
        const texto = (b.textContent ?? "").trim();
        const rotulo = b.getAttribute("aria-label") ?? "";
        if (temSvg && texto.length === 0 && rotulo.length === 0) {
          achados.push(b.className.slice(0, 50));
        }
      }
      return achados;
    });
    expect(soIcone, `botões que só têm ícone: ${soIcone.join(", ")}`).toEqual([]);
  });

  test("controle positivo: a varredura enxerga controles de verdade", async ({ page }) => {
    const quantos = await page.evaluate(
      () => document.querySelectorAll("button, input, [role='combobox']").length,
    );
    expect(
      quantos,
      "a vitrine não tem controle nenhum: a varredura está olhando o lugar errado",
    ).toBeGreaterThan(10);
  });
});

test.describe("`FR-030` (b) · região anunciada ao mudar, sem roubar o foco", () => {
  naVitrine();

  test("as regiões vivas declaram como são anunciadas", async ({ page }) => {
    const alerta = page.locator('[data-slot="alerta-conformidade"]');
    await expect(alerta).toHaveAttribute("aria-live", "polite");

    // Todo estado vazio e todo carregamento também são regiões — sem isso, a tela abre em silêncio
    // para quem não a vê.
    await expect(page.locator('[data-slot="estado-vazio"]').first()).toHaveAttribute(
      "role",
      "status",
    );
    await expect(page.locator('[data-slot="esqueleto-tabela"]')).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  test("a mudança de conteúdo não move o foco", async ({ page }) => {
    // Filtrar a tabela muda a região inteira. O foco tem de continuar onde estava.
    const filtro = page.locator('[data-slot="tabela-densa"] input').first();
    await filtro.focus();
    await filtro.fill("Registro 01");
    await expect(page.locator('[data-slot="tabela-densa"] tbody tr').first()).toBeVisible();
    await expect(filtro, "o foco saiu do campo de filtro sozinho").toBeFocused();
  });
});

test.describe("`FR-030` (c) · a ordem de leitura acompanha a ordem visual", () => {
  naVitrine();

  test("os títulos de seção saem no documento na mesma ordem em que aparecem", async ({ page }) => {
    /*
     * ⚠️ É O REQUISITO MEDIDO, e não uma impressão: a ordem do DOM é a ordem em que o leitor de
     * tela lê; a posição vertical é a ordem em que o olho lê. Quando as duas divergem — quase
     * sempre por causa de posicionamento em folha de estilo — a tela fica correta para quem vê e
     * embaralhada para quem não vê, sem nada acusar.
     */
    const posicoes = await page
      .locator("main h2")
      .evaluateAll((nos) => nos.map((n) => n.getBoundingClientRect().top + window.scrollY));
    expect(posicoes.length, "a vitrine não tem seção nenhuma").toBeGreaterThan(10);
    const ordenadas = [...posicoes].sort((a, b) => a - b);
    expect(posicoes, "a ordem do documento não acompanha a ordem visual").toEqual(ordenadas);
  });

  test("há um `main` e um `h1`, e o `h1` vem antes de todo `h2`", async ({ page }) => {
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    const primeiroH2 = await page
      .locator("main h2")
      .first()
      .evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
    const h1 = await page
      .locator("h1")
      .evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
    expect(h1).toBeLessThan(primeiroH2);
  });
});

/**
 * A navegação — a parte que a fatia (b) não alcançou (`FR-021`).
 *
 * ⚠️ **SEM O ATALHO, QUEM USA TECLADO ATRAVESSA O MENU INTEIRO A CADA TELA.** É o mesmo problema dos
 * 2.400 pressionamentos que a tabela densa resolveu na fatia (b), noutro lugar: lá era a grade, aqui
 * é a casca, e a casca aparece em **toda** tela do sistema.
 */
test.describe("`FR-021` · a casca se atravessa por teclado", () => {
  let EMAIL = "";

  test.beforeAll(async ({}, info) => {
    EMAIL = emailDeTeste("acessibilidade-casca", info.workerIndex);
    await criarConta(EMAIL, `USR-ACESS-CASCA-${info.workerIndex}`);
  });

  test.afterAll(async () => {
    await apagarConta(EMAIL);
  });

  test("o atalho para o conteúdo é a PRIMEIRA parada de tabulação", async ({ page }) => {
    await entrar(page, EMAIL);
    /*
     * ⚠️ `keyboard.press`, E NÃO `locator("body").press`. O segundo foca o elemento antes de
     * teclar, e `body` não é focável: a tabulação parte de um lugar indefinido e o caso reprova com
     * *"element(s) not found"* — que se lê como "o atalho não existe", quando ele existe.
     */
    await page.keyboard.press("Tab");

    const foco = page.locator(":focus");
    await expect(foco).toHaveText(/pular para o conteúdo/i);
  });

  test("⚠️ e ele APARECE ao receber o foco — invisível no foco é enfeite", async ({ page }) => {
    /*
     * Um atalho que continua escondido depois de focado existe para o leitor de tela e não para
     * quem enxerga e navega por teclado — que é metade de quem precisa dele.
     */
    await entrar(page, EMAIL);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /pular para o conteúdo/i })).toBeInViewport();
  });

  test("o atalho leva o foco ao conteúdo, e o conteúdo aceita foco", async ({ page }) => {
    await entrar(page, EMAIL);
    /*
     * ⚠️ A PRIMEIRA PARADA É CONFERIDA ANTES DE TECLAR ENTER. Sem isto o caso é uma corrida: se a
     * tabulação acontecer antes de a página assentar, o `Enter` aciona outra coisa e a falha se lê
     * como "o atalho não leva a lugar nenhum" — diagnóstico errado sobre um atalho que funciona.
     */
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveText(/pular para o conteúdo/i);

    await page.keyboard.press("Enter");

    // ⚠️ Alvo que não aceita foco recebe a âncora e deixa o foco onde estava: o endereço muda, a
    // tabulação seguinte volta para o menu, e o atalho parece funcionar sem funcionar.
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("conteudo");
  });

  test("o marco de navegação é anunciado, e há um só", async ({ page }) => {
    await entrar(page, EMAIL);
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(1);
  });

  test("trocar de rota não deixa o foco na entrada que ficou para trás", async ({ page }) => {
    /*
     * ⚠️ É O CASO QUE DISTINGUE NAVEGAÇÃO DE TROCA DE CONTEÚDO. Se o foco permanecer no link
     * clicado, quem usa leitor de tela continua ouvindo o menu enquanto a tela inteira mudou — e
     * precisa procurar, a cada navegação, onde o conteúdo novo começou.
     */
    await entrar(page, EMAIL);
    await page.getByRole("link", { name: "Permissões" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/permissoes");

    const focoContinuaNoLink = await page.evaluate(
      () => document.activeElement?.getAttribute("href") === "/admin/permissoes",
    );
    expect(focoContinuaNoLink, "o foco ficou preso no link do menu depois da navegação").toBe(
      false,
    );
  });
});
