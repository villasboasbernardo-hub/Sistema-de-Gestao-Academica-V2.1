/**
 * Abrir o formulário do instrutor — **pela página própria** (spec 025, Bloco 10, D-35; era o formulário recolhido no
 * fim da ficha, spec 016, FR-010.1).
 *
 * ⚠️ **DESDE 24/10/2026 *EDITAR INSTRUTOR* É UM LINK** para `/instrutores/[codigo]/editar` (RT-3). Quem já está na
 * página de edição — depois de um `page.reload()`, por exemplo — não clica de novo: só espera o formulário.
 * ⚠️ **CHEGA POR CLIQUE**, a partir da ficha: o caminho clicável é parte do que se prova.
 */
import { expect, type Page } from "@playwright/test";

export async function abrirEdicaoDoInstrutor(page: Page): Promise<void> {
  if (!/\/instrutores\/[^/?#]+\/editar(?:[?#]|$)/.test(page.url())) {
    const gatilho = page.locator('[data-slot="abrir-edicao-do-instrutor"]');
    // ⚠️ Prazo medido na base real: a ficha leva de 1,5 a 5,1 s sob quatro processos (ver `abrirFicha`).
    await expect(gatilho, "a ficha não terminou de desenhar").toBeVisible({ timeout: 15_000 });
    await gatilho.click();
    await expect(page).toHaveURL(/\/instrutores\/[^/?#]+\/editar/);
  }
  await expect(page.locator('[data-slot="rodape-do-formulario"]')).toBeVisible({
    timeout: 15_000,
  });
}

/** Voltar da página de edição para a ficha, por clique. */
export async function voltarAFichaDoInstrutor(page: Page): Promise<void> {
  await page.locator('[data-slot="voltar-a-ficha"]').click();
  await expect(page).not.toHaveURL(/\/editar/);
}
