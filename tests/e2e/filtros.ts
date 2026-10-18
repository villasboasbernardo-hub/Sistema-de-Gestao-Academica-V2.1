/**
 * Abrir o painel de filtros — **só se ele estiver fechado** (spec 016, item 1.4).
 *
 * ⚠️ **DESDE 17/10/2026 O `FiltroAvancado` NASCE RECOLHIDO**, e o `Collapsible` do Radix **desmonta** o
 * conteúdo fechado: os campos deixam de existir, e `getByLabel` não acha nada — o que se lê como *"o
 * filtro não foi escrito"*. Um clique incondicional no gatilho, por outro lado, **fecharia** um painel
 * aberto. Por isso a decisão é pelo estado declarado do gatilho, `aria-expanded`.
 *
 * ⚠️ **O NOME DO GATILHO PODE TRAZER O NÚMERO** (*"Filtros 2"*), e o espaço entre as duas palavras
 * depende de como o navegador junta o texto. A busca é pelo começo do nome, e o número de filtros
 * ativos se confere pela marca `filtros-ativos`, não pelo nome.
 */
import type { Page } from "@playwright/test";

export async function abrirPainelDeFiltros(page: Page, titulo = "Filtros"): Promise<void> {
  const nome = new RegExp(`^${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d*$`);
  const gatilho = page
    .locator('[data-slot="filtro-avancado"]')
    .getByRole("button", { name: nome })
    .first();
  if ((await gatilho.getAttribute("aria-expanded")) !== "true") await gatilho.click();
}

/** O número do botão de filtros — `null` quando não há filtro fora do padrão. */
export async function numeroDeFiltrosAtivos(page: Page): Promise<string | null> {
  const selo = page.locator('[data-slot="filtro-avancado"] [data-slot="filtros-ativos"]').first();
  return (await selo.count()) === 0 ? null : ((await selo.textContent())?.trim() ?? null);
}
