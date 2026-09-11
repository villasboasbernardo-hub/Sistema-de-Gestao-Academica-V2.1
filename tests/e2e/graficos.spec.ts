/**
 * Os gráficos continuam legíveis sem cor (`FR-016` a `FR-018`, `SC-008`).
 *
 * ⚠️ O QUE ESTE ARQUIVO MEDE QUE O TESTE DE UNIDADE NÃO MEDE: o de unidade prova que o **tipo**
 * exige forma e rótulo. Aqui se prova que eles **chegam à tela** — que o marcador foi desenhado e
 * que o rótulo aparece junto do traço. Um componente pode ter o tipo certo e não desenhar nada.
 *
 * ⚠️ E A PROVA DE QUE A COR NÃO É A ÚNICA CODIFICAÇÃO É REMOVER A COR. O último caso pinta todo o
 * gráfico de uma tinta só, por folha de estilo, e exige que as séries continuem distinguíveis.
 */
import { expect, test } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

test.beforeEach(async ({ page }) => {
  await abrirVitrine(page);
  await expect(page.locator('[data-slot="grafico-barras"]').first()).toBeVisible();
});

test.describe("US4 · forma e rótulo, não cor", () => {
  test("os três tipos de gráfico aparecem na vitrine", async ({ page }) => {
    await expect(page.locator('[data-slot="grafico-barras"]').first()).toBeVisible();
    await expect(page.locator('[data-slot="grafico-pizza"]')).toBeVisible();
    await expect(page.locator('[data-slot="grafico-linha"]')).toBeVisible();
  });

  test("toda série traz marcador de forma E rótulo", async ({ page }) => {
    const legenda = page.locator('[data-slot="legenda-de-grafico"]').first();
    await expect(legenda).toBeVisible();

    const itens = legenda.locator("li");
    await expect(itens).toHaveCount(2);
    for (let i = 0; i < 2; i += 1) {
      // O marcador é desenhado pela biblioteca: um `<svg>` com um caminho dentro.
      await expect(itens.nth(i).locator("svg")).toHaveCount(1);
      await expect(itens.nth(i)).not.toBeEmpty();
    }
    await expect(legenda).toContainText("Habilitados");
    await expect(legenda).toContainText("Selecionados");
  });

  test("as duas séries usam marcadores DIFERENTES", async ({ page }) => {
    // ⚠️ Duas séries com o mesmo marcador seriam o mesmo defeito da cor, com outra roupa.
    const legenda = page.locator('[data-slot="legenda-de-grafico"]').first();
    const desenhos = await legenda
      .locator("svg path")
      .evaluateAll((nos) => nos.map((n) => n.getAttribute("d")));
    expect(desenhos).toHaveLength(2);
    expect(desenhos[0]).not.toBe(desenhos[1]);
  });

  test("nenhuma cor literal aparece no desenho: toda cor vem de token", async ({ page }) => {
    const cores = await page
      .locator('[data-slot="grafico-barras"] svg [fill], [data-slot="grafico-linha"] svg [stroke]')
      .evaluateAll((nos) =>
        nos.flatMap((n) => [n.getAttribute("fill"), n.getAttribute("stroke")]).filter(Boolean),
      );
    const literais = cores.filter((c) => /^#|^rgb|^hsl/i.test(c as string));
    expect(
      literais,
      `cor literal no desenho do gráfico: ${literais.join(", ")}. Toda cor vem de var(--serie-N).`,
    ).toEqual([]);
  });

  test("o percentual da pizza é ESCRITO, não só desenhado", async ({ page }) => {
    const pizza = page.locator('[data-slot="grafico-pizza"]');
    await expect(pizza).toContainText("%");
    await expect(pizza).toContainText("20h");
    await expect(pizza).toContainText("Dedicação Exclusiva");
  });

  test("sete séries são RECUSADAS, e a recusa aponta a tabela densa", async ({ page }) => {
    const recusa = page.locator('[data-slot="grafico-recusado"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("recusado");
    await expect(recusa).toContainText("tabela densa");
  });

  test("gráfico sem dado mostra estado vazio, não área em branco", async ({ page }) => {
    const vazio = page
      .locator('[data-slot="estado-vazio"]')
      .filter({ hasText: "Gráfico sem dado" });
    await expect(vazio).toBeVisible();
    await expect(vazio).toContainText("Não há dado");
  });

  test("SEM COR, as séries continuam distinguíveis (`SC-008`)", async ({ page }) => {
    /*
     * ⚠️ É A SIMULAÇÃO DO PAPEL EM PRETO E BRANCO, e ela é o teste que a medição de 10/09/2026
     * tornou obrigatório: no tema claro, as séries 1 e 8 ficam a 0,0003 de luminância uma da
     * outra. Em cinza, viram a mesma tinta. Se o que distingue as séries for a cor, este caso
     * reprova.
     */
    await page.addStyleTag({
      content: "svg * { fill: currentColor !important; stroke: currentColor !important; }",
    });
    const legenda = page.locator('[data-slot="legenda-de-grafico"]').first();
    const desenhos = await legenda
      .locator("svg path")
      .evaluateAll((nos) => nos.map((n) => n.getAttribute("d")));
    expect(new Set(desenhos).size, "sem cor, as séries ficaram indistinguíveis").toBe(
      desenhos.length,
    );
    await expect(legenda).toContainText("Habilitados");
  });

  test("nenhum gráfico anima a entrada", async ({ page }) => {
    // Animação atrapalha a impressão, que captura o quadro errado, e contraria a preferência por
    // menos movimento. A biblioteca a desliga por propriedade; aqui se mede a ausência.
    const animados = await page
      .locator('[data-slot="grafico-barras"] svg, [data-slot="grafico-linha"] svg')
      .evaluateAll((nos) => nos.filter((n) => n.querySelector("animate, animateTransform")).length);
    expect(animados).toBe(0);
  });
});
