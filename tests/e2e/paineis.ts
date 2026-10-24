/**
 * Os painéis de *Filtros* e *Estatísticas* e o seletor de ano — **por clique**, como alguém usa (spec 025, Bloco 10,
 * RT-4 e RT-6).
 *
 * ⚠️ **OS PAINÉIS NASCEM RECOLHIDOS E O CONTEÚDO SÓ EXISTE ABERTO** (D-18): campo de filtro e cartão de estatística
 *    não estão no DOM antes do clique — `getByLabel` não acha nada, o que se lê como *"o filtro sumiu"*. Abrir é
 *    idempotente: com o painel aberto, não clica (um segundo clique o fecharia).
 * ⚠️ **O ANO VALE NO SISTEMA INTEIRO** (D-24): escolhê-lo grava a escolha no navegador, e cada caso começa num contexto
 *    novo do Playwright — sem escolha guardada, a tela abre no ano de hoje.
 */
import { expect, type Page } from "@playwright/test";

export type Painel = "filtros" | "estatisticas";

export async function abrirPainel(page: Page, painel: Painel): Promise<void> {
  const gatilho = page.locator(`[data-slot="abrir-${painel}"]`).first();
  await expect(gatilho, `o ícone ${painel} não está na barra`).toBeVisible({ timeout: 15_000 });
  if ((await gatilho.getAttribute("aria-expanded")) !== "true") await gatilho.click();
  await expect(page.locator(`[data-slot="painel-de-${painel}"]`).first()).toBeVisible();
}

/** O ano da tela, pelo seletor do canto superior direito; espera a tela redesenhar no ano escolhido. */
export async function escolherAno(page: Page, ano: number | string): Promise<void> {
  const escolha = page.locator('[data-slot="ano-do-painel-escolha"]').first();
  await expect(escolha).toBeVisible({ timeout: 15_000 });
  if ((await escolha.inputValue()) === String(ano)) return;
  /*
   * ⚠️ AS AMOSTRAS DE TESTE VIVEM EM ANOS LONGE DO DADO REAL (2044 a 2046), e o seletor oferece de 2020 ao ano de hoje
   *    + 10 (D-25). Fora disso, o caminho é o LINK com `?ano=` — o mesmo que alguém mandaria —, que o seletor honra e
   *    passa a oferecer. Dentro, é o clique.
   */
  if ((await escolha.locator(`option[value="${ano}"]`).count()) === 0) {
    const url = new URL(page.url());
    url.searchParams.set("ano", String(ano));
    await page.goto(url.toString());
    await expect(page.locator('[data-slot="ano-do-painel-escolha"]').first()).toHaveValue(
      String(ano),
      { timeout: 15_000 },
    );
    return;
  }
  await escolha.selectOption(String(ano));
  await expect(escolha).toHaveValue(String(ano), { timeout: 15_000 });
  await expect(page.locator('[data-slot="ano-do-painel"]').first()).toHaveAttribute(
    "data-esperando",
    "nao",
    { timeout: 15_000 },
  );
}

/** O ano de uma turma, pelo código (`… 2026`); sem ano no fim, `null`. */
export function anoDoCodigoDaTurma(codigo: string): number | null {
  const achado = /(\d{4})\s*$/.exec(codigo);
  return achado ? Number(achado[1]) : null;
}
