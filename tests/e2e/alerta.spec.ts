/**
 * O alerta normativo aparece, e **não impede** (`RNF-USA-04`, `RN-DEG-02`, `FR-008`, `FR-026`).
 *
 * > **Regra 6 do contrato do projeto:** *regra normativa vira alerta, nunca bloqueio.*
 *
 * ⚠️ O CASO QUE IMPORTA É O ÚLTIMO: com o alerta na tela, a ação que ele comenta continua
 * disponível. Transformar teto normativo em impedimento **mudaria a regra de negócio** — é a mesma
 * razão pela qual os tetos nunca viram `CHECK` no banco.
 */
import { expect, test } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

const ALERTA = '[data-slot="alerta-conformidade"]';

test.beforeEach(async ({ page }) => {
  await abrirVitrine(page);
  await expect(page.locator(ALERTA)).toBeVisible();
});

test.describe("US5 · o alerta de conformidade", () => {
  test("ele é anunciado ao leitor de tela, sem roubar o foco", async ({ page }) => {
    const alerta = page.locator(ALERTA);
    // ⚠️ `status` e não `alert`: `alert` interrompe o leitor no meio do que ele estiver dizendo.
    // Um aviso normativo é para ser sabido, não para tomar a vez (`FR-030` item b).
    await expect(alerta).toHaveAttribute("role", "status");
    await expect(alerta).toHaveAttribute("aria-live", "polite");

    const focoRoubado = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="alerta-conformidade"]');
      return el ? el.contains(document.activeElement) : false;
    });
    expect(focoRoubado, "o alerta roubou o foco ao aparecer").toBe(false);
  });

  test("SOBREVIVE À ROLAGEM da região — é o 'sempre visível' do `RNF-USA-04`", async ({ page }) => {
    const alerta = page.locator(ALERTA);
    const caixa = page.locator(ALERTA).locator("..");

    const antes = await alerta.boundingBox();
    await caixa.evaluate((el) => el.scrollTo({ top: 400 }));
    await expect(alerta).toBeVisible();
    const depois = await alerta.boundingBox();

    expect(antes, "o alerta não foi desenhado").not.toBeNull();
    expect(depois, "o alerta sumiu ao rolar a região").not.toBeNull();
    // Fixado no topo: a posição vertical na janela não muda quando a região rola.
    expect(Math.abs((depois?.y ?? 0) - (antes?.y ?? 0))).toBeLessThan(2);
  });

  test("NÃO oferece botão de dispensar", async ({ page }) => {
    // ⚠️ Deliberado: um alerta que a pessoa fecha e esquece é bloqueio nenhum e alerta nenhum.
    const botoes = page.locator(`${ALERTA} button`);
    await expect(botoes).toHaveCount(0);
  });

  test("usa saliência ESTÁTICA — faixa, ícone e rótulo — e não pisca (`FR-026`)", async ({
    page,
  }) => {
    const alerta = page.locator(ALERTA);
    await expect(alerta.locator("svg")).toHaveCount(1);
    await expect(alerta).toContainText("acima do teto");

    const animacao = await alerta.evaluate((el) => getComputedStyle(el).animationName);
    expect(animacao, "o alerta pisca — substituto do .mat-piscar da v2.0, que saiu").toBe("none");
  });

  test("a cor NÃO é a única codificação: o texto diz o mesmo", async ({ page }) => {
    const alerta = page.locator(ALERTA);
    await expect(alerta).toContainText("TAD");
    await expect(alerta).toContainText("teto vigente");
  });
});

test.describe("US5 · o emblema de teto", () => {
  test("a comparação numérica fica NO EMBLEMA, não só na dica ao apontar", async ({ page }) => {
    // ⚠️ Quem usa toque não aponta nada: o que estiver só na dica não existe para essa pessoa.
    const emblemas = page.locator('[data-slot="badge-teto"]');
    await expect(emblemas).toHaveCount(3);
    await expect(emblemas.nth(0)).toContainText("AEC");
    await expect(emblemas.nth(0)).toContainText("/");
    await expect(emblemas.nth(1)).toContainText("TAD");
  });

  test("o estouro é dito em TEXTO, além da cor e do ícone", async ({ page }) => {
    const estourado = page.locator('[data-slot="badge-teto"][data-estourou="true"]');
    await expect(estourado).toHaveCount(1);
    await expect(estourado).toContainText("TAD");
    await expect(estourado.locator(".sr-only")).toContainText("alerta, não impedimento");
  });

  test("a explicação aparece ao APONTAR (`FR-009`)", async ({ page }) => {
    const emblema = page.locator('[data-slot="badge-teto"]').first();
    await emblema.scrollIntoViewIfNeeded();
    await emblema.hover();
    await expect(page.getByRole("tooltip")).toContainText("teto normativo");
  });

  test("e ela é alcançável pelo TECLADO — com tabulação de verdade", async ({ page }) => {
    /*
     * ⚠️ `focus()` PROGRAMÁTICO NÃO SERVE AQUI, e descobrir isso custou uma execução do CI. A dica
     * ao apontar do Radix só abre no foco quando ele é **visível** — `:focus-visible` —, e o
     * navegador não o aplica a um foco programático quando a última interação foi de ponteiro.
     * Resultado: o caso passava numa execução e reprovava na outra, no mesmo commit, porque o que
     * decidia era o que tinha acontecido na página antes.
     *
     * ⚠️ A FORMA QUE NÃO DEPENDE DISSO É PRESSIONAR TECLA: focar o segundo emblema e voltar um com
     * `Shift+Tab` é navegação real, com modalidade de teclado, e o `:focus-visible` vale. **E é
     * mais honesto**: mede o caminho de quem de fato navega por teclado, em vez de simular o
     * resultado dele.
     *
     * ⚠️ QUEM USA TECLADO PRECISA ALCANÇAR A EXPLICAÇÃO. Uma dica que só abre ao apontar não existe
     * para essa pessoa — e é por isso que a comparação numérica fica no emblema, não aqui.
     */
    const primeiro = page.locator('[data-slot="badge-teto"]').first();
    const segundo = page.locator('[data-slot="badge-teto"]').nth(1);

    await segundo.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(primeiro).toBeFocused();
    await expect(page.getByRole("tooltip")).toContainText("teto normativo");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("NADA é desabilitado: a ação que o alerta comenta continua disponível", async ({ page }) => {
    /*
     * ⚠️ É O CASO QUE JUSTIFICA O ARQUIVO INTEIRO. `RN-DEG-02`: regra normativa vira alerta, nunca
     * bloqueio. Se um dia alguém desabilitar o botão "porque está fora do teto", este caso reprova
     * — e reprovar aqui é o sinal de que uma REGRA DE NEGÓCIO foi mudada, não de que a tela
     * quebrou.
     */
    const botao = page.getByRole("button", { name: "Salvar mesmo assim" });
    await expect(botao).toBeEnabled();
    await botao.click();
    await expect(page.getByText("o alerta não impediu nada")).toBeVisible();
    await expect(page.locator(ALERTA), "o alerta sumiu depois da ação").toBeVisible();
  });
});
