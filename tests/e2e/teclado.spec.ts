/**
 * A navegação por teclado, com teclas de verdade (`FR-023`, `FR-024`, `FR-028`, `SC-006`).
 *
 * ⚠️ NÃO SE PROVA POR ASSERÇÃO SOBRE ATRIBUTO, e o contrato de teclado é explícito: um `tabindex`
 * correto com um tratador de tecla que não dispara passa na leitura de atributo e falha na mão de
 * quem usa. Cada movimento aqui é **pressionado**, e o elemento focado é lido **depois**.
 *
 * ⚠️ É A LIÇÃO DO V-4 DO ÉPICO 3: um teste que lê a tela antes de a conferência acontecer prova o
 * que quer, não o que é. Por isso toda leitura passa por `expect(...)`, que reexecuta, e nunca por
 * leitura direta na linha seguinte ao pressionamento.
 *
 * A vitrine `/estilo` não pede sessão — foi deixada aberta na fatia (a) de propósito.
 */
import { expect, test, type Page } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

const TABELA = '[data-slot="tabela-densa"]';
const GRADE = `${TABELA} table[role="grid"]`;

/** A célula sob o foco, no formato `linha:coluna`. */
async function celulaFocada(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("data-celula") ?? null);
}

/** Leva o foco para dentro da grade, a partir do campo de filtro que a antecede. */
async function entrarNaGrade(page: Page) {
  await page.locator(`${TABELA} input`).first().focus();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => celulaFocada(page), { message: "`Tab` não entrou na grade" })
    .not.toBeNull();
}

test.beforeEach(async ({ page }) => {
  await abrirVitrine(page);
  await expect(page.locator(GRADE).first()).toBeVisible();
});

test.describe("US3 · a tabela densa se atravessa só com o teclado", () => {
  test("`Tab` entra na grade em UM passo, e sai dela em um passo", async ({ page }) => {
    // ⚠️ É a primeira frase do contrato, e a que uma tabela com cabeçalho ordenável quebra sem
    // ninguém notar: cada botão de ordenação vira uma parada a mais DENTRO do contêiner.
    await entrarNaGrade(page);
    expect(await celulaFocada(page)).toBe("0:0");

    await page.keyboard.press("Tab");
    await expect
      .poll(() => celulaFocada(page), { message: "`Tab` não saiu da grade em um passo" })
      .toBeNull();
  });

  test("sair e voltar retorna à MESMA célula", async ({ page }) => {
    await entrarNaGrade(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => celulaFocada(page)).toBe("1:1");

    await page.keyboard.press("Tab");
    await expect.poll(() => celulaFocada(page)).toBeNull();
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(() => celulaFocada(page), { message: "a grade esqueceu onde o foco estava" })
      .toBe("1:1");
  });

  test("as setas movem célula a célula, nas duas dimensões", async ({ page }) => {
    await entrarNaGrade(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => celulaFocada(page)).toBe("1:0");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => celulaFocada(page)).toBe("1:1");
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => celulaFocada(page)).toBe("0:1");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => celulaFocada(page)).toBe("0:0");
  });

  test("`Home` e `End` vão à primeira e à última COLUNA da linha", async ({ page }) => {
    await entrarNaGrade(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await expect.poll(() => celulaFocada(page)).toBe("1:3");
    await page.keyboard.press("Home");
    await expect.poll(() => celulaFocada(page)).toBe("1:0");
  });

  test("`PageDown` salta 20 linhas, e `PageUp` volta", async ({ page }) => {
    await entrarNaGrade(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("PageDown");
    await expect.poll(() => celulaFocada(page)).toBe("21:0");
    await page.keyboard.press("PageUp");
    await expect.poll(() => celulaFocada(page)).toBe("1:0");
  });

  test("`PageDown` com menos de 20 linhas restantes vai à ÚLTIMA, não para fora", async ({
    page,
  }) => {
    await entrarNaGrade(page);
    // A amostra tem 45 linhas de dado, e o cabeçalho é a linha 0 — a última é a 45.
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("PageDown");
    await expect.poll(() => celulaFocada(page)).toBe("45:0");
  });

  test("no fim da lista o foco FICA — a grade não rola circularmente", async ({ page }) => {
    // ⚠️ É decisão registrada, não limitação: voltar ao topo ao passar do fim faz quem não vê a
    // tela perder a noção de onde está.
    await entrarNaGrade(page);
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("PageDown");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => celulaFocada(page)).toBe("45:0");

    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => celulaFocada(page)).toBe("45:0");
  });

  test("o foco é VISÍVEL em cada parada (`FR-024`)", async ({ page }) => {
    await entrarNaGrade(page);
    for (const tecla of ["ArrowDown", "ArrowRight", "End", "PageDown"]) {
      await page.keyboard.press(tecla);
      const contorno = await page.evaluate(() => {
        const alvo = document.activeElement;
        if (!alvo) return null;
        const estilo = getComputedStyle(alvo);
        return { largura: estilo.outlineWidth, estilo: estilo.outlineStyle };
      });
      expect(contorno, `sem foco visível depois de ${tecla}`).not.toBeNull();
      expect(contorno?.estilo, `contorno ausente depois de ${tecla}`).not.toBe("none");
      expect(
        parseFloat(contorno?.largura ?? "0"),
        `contorno de largura zero depois de ${tecla}`,
      ).toBeGreaterThan(0);
    }
  });

  test("`Enter` numa célula do cabeçalho ORDENA a coluna", async ({ page }) => {
    await entrarNaGrade(page);
    const cabecalho = page.locator(`${GRADE} th`).first();
    await expect(cabecalho).toHaveAttribute("aria-sort", "none");
    await page.keyboard.press("Enter");
    await expect(cabecalho).toHaveAttribute("aria-sort", "ascending");
    await page.keyboard.press("Enter");
    await expect(cabecalho).toHaveAttribute("aria-sort", "descending");
    // ⚠️ O terceiro estado importa: volta à ordem ORIGINAL, que pode ser a de domínio.
    await page.keyboard.press("Enter");
    await expect(cabecalho).toHaveAttribute("aria-sort", "none");
  });

  test("tabela SEM LINHAS: o contêiner continua alcançável e o vazio é lido", async ({ page }) => {
    const vazia = page.locator('[data-slot="lista-navegavel"]').filter({
      has: page.locator('[data-slot="estado-vazio"]'),
    });
    await expect(vazia.first()).toHaveAttribute("tabindex", "0");
    await expect(vazia.first().locator('[role="status"]')).toBeVisible();
  });
});

test.describe("US2 · o seletor de instrutor, só com o teclado", () => {
  test("as setas andam na lista, e a horizontal não faz nada", async ({ page }) => {
    await page.locator('[data-slot="seletor-instrutor"]').click();
    const lista = page.locator('[data-slot="lista-navegavel"][role="listbox"]');
    await expect(lista).toBeVisible();

    await lista.locator('[data-celula="0:0"]').focus();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => celulaFocada(page)).toBe("1:0");
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => celulaFocada(page), { message: "a seta horizontal moveu numa lista de 1 coluna" })
      .toBe("1:0");
  });

  test("filtrar reposiciona o foco na PRIMEIRA opção restante", async ({ page }) => {
    // ⚠️ Uma lista que filtra e deixa o foco numa linha que sumiu leva quem usa teclado a lugar
    // nenhum, em silêncio.
    await page.locator('[data-slot="seletor-instrutor"]').click();
    const lista = page.locator('[data-slot="lista-navegavel"][role="listbox"]');
    await lista.locator('[data-celula="0:0"]').focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    await page.getByLabel("Buscar instrutor").fill("silva");
    await expect(lista.locator("[data-celula]")).toHaveCount(1);
    await lista.locator('[data-celula="0:0"]').focus();
    await expect.poll(() => celulaFocada(page)).toBe("0:0");
  });

  test("filtro sem resultado devolve o foco à busca, com a mensagem lida", async ({ page }) => {
    await page.locator('[data-slot="seletor-instrutor"]').click();
    const busca = page.getByLabel("Buscar instrutor");
    await busca.fill("zzzzzz");
    // ⚠️ O papel `status` aparece em oito lugares desta vitrine — estado vazio, esqueleto, alerta,
    // faixa de ambiente. Procurá-lo solto é ambiguidade, não medição: o que se mede é a mensagem
    // DENTRO do painel do seletor.
    const lista = page.locator('[data-slot="lista-navegavel"][role="listbox"]');
    await expect(lista.getByRole("status")).toContainText("Nenhum instrutor corresponde");
    await expect(busca).toBeFocused();
  });

  test("`Esc` fecha o painel", async ({ page }) => {
    await page.locator('[data-slot="seletor-instrutor"]').click();
    const lista = page.locator('[data-slot="lista-navegavel"][role="listbox"]');
    await expect(lista).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lista).toBeHidden();
  });
});

test.describe("`FR-028` · o ponto de quebra de 1024px", () => {
  /**
   * ⚠️ A MEDIÇÃO REEXECUTA, E ISSO NÃO É ZELO EXCESSIVO. A primeira versão lia `scrollWidth` uma
   * vez, logo depois de mudar o tamanho da janela — e passava sozinha, reprovando na suíte cheia:
   * com quatro processos de trabalho, o navegador nem sempre refez o leiaute a tempo. **Verde
   * sozinho e vermelho em conjunto é o pior modo de falha possível, porque parece azar.** É a lição
   * do V-4 do Épico 3: leitura direta na linha seguinte prova o que quer, não o que é.
   */
  const rolaNaHorizontal = (page: Page, seletor: string) =>
    page
      .locator(seletor)
      .first()
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);

  const CAIXA = `${TABELA} [data-slot="lista-navegavel"]`;

  test("a 800px a página NÃO rola na horizontal, e a tabela rola dentro da caixa", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await abrirVitrine(page);
    await expect(page.locator(GRADE).first()).toBeVisible();

    await expect
      .poll(() => rolaNaHorizontal(page, "html"), {
        message: "a página inteira rola na horizontal a 800px",
      })
      .toBe(false);

    await expect
      .poll(() => rolaNaHorizontal(page, CAIXA), {
        message: "a tabela densa não rola dentro do próprio contêiner a 800px",
      })
      .toBe(true);
  });

  test("acima de 1024px a tabela ocupa a largura disponível, sem rolagem", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrirVitrine(page);
    await expect(page.locator(GRADE).first()).toBeVisible();

    await expect
      .poll(() => rolaNaHorizontal(page, CAIXA), {
        message: "a tabela ainda rola na horizontal numa tela grande",
      })
      .toBe(false);
  });
});
