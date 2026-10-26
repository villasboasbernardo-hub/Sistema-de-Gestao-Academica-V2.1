/**
 * Abrir o painel de filtros — **só se ele estiver fechado** (spec 016, item 1.4; spec 025, RT-4).
 *
 * ⚠️ **DESDE O BLOCO 10 (spec 025, D-18) OS FILTROS DAS TELAS MORAM NO PAINEL DA PÁGINA**: o ícone *Filtros* fica na
 *    barra de ações do cabeçalho, e o painel nasce recolhido — o conteúdo só existe aberto, e `getByLabel` não acha
 *    nada antes do clique, o que se lê como *"o filtro não foi escrito"*. Um clique incondicional **fecharia** o
 *    painel aberto: a decisão é pelo estado declarado do gatilho, `aria-expanded`.
 * ⚠️ **ONDE NÃO HÁ PAINEL DA PÁGINA** (a vitrine), o `FiltroAvancado` continua com o gatilho próprio, recolhível — e o
 *    nome dele pode trazer o número (*"Filtros 2"*): a busca é pelo começo do nome.
 */
import type { Page } from "@playwright/test";

export async function abrirPainelDeFiltros(page: Page, titulo = "Filtros"): Promise<void> {
  const nome = new RegExp(`^${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d*$`);
  const legado = page
    .locator('[data-slot="filtro-avancado"]')
    .getByRole("button", { name: nome })
    .first();
  const daPagina = page.locator('[data-slot="abrir-filtros"]').first();
  /*
   * ⚠️ TÍTULO PRÓPRIO É O `FiltroAvancado` QUE TEM O GATILHO DELE (a vitrine, *"Filtros na URL"*) — e a vitrine também
   *    tem a amostra do painel da página: decidir pelo ícone ali abriria o painel errado.
   * ⚠️ E decidir pelo que JÁ está na tela correria contra o desenho dela: espera-se o gatilho existir.
   */
  if (titulo === "Filtros") {
    await legado.or(daPagina).first().waitFor({ state: "visible", timeout: 15_000 });
    if ((await daPagina.count()) > 0) {
      if ((await daPagina.getAttribute("aria-expanded")) !== "true") await daPagina.click();
      await page.locator('[data-slot="painel-de-filtros"]').first().waitFor({ state: "visible" });
      return;
    }
  }
  await legado.waitFor({ state: "visible", timeout: 15_000 });
  if ((await legado.getAttribute("aria-expanded")) !== "true") await legado.click();
}

/** O número do ícone de filtros — `null` quando não há filtro fora do padrão. */
export async function numeroDeFiltrosAtivos(page: Page): Promise<string | null> {
  const selo = page
    .locator(
      '[data-slot="gatilho-de-filtros"] [data-slot="filtros-ativos"], [data-slot="filtro-avancado"] [data-slot="filtros-ativos"]',
    )
    .first();
  return (await selo.count()) === 0 ? null : ((await selo.textContent())?.trim() ?? null);
}
