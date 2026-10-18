/**
 * Abrir o formulário da ficha do instrutor — **só se estiver fechado** (spec 016, FR-010.1).
 *
 * ⚠️ **DESDE 17/10/2026 A FICHA ABRE EM LEITURA**, com o formulário recolhido atrás de *Editar
 * instrutor*, e o `Collapsible` do Radix **desmonta** o conteúdo fechado: os campos deixam de existir,
 * e um `getByLabel` não acha nada — o que se lê como *"o campo não foi escrito"*. Um clique
 * incondicional, por outro lado, **fecharia** um formulário aberto. Por isso a decisão é pelo estado
 * declarado do gatilho, `aria-expanded` — o mesmo desenho de `abrirEdicaoDaTurma`.
 *
 * ⚠️ **E DEPOIS DE `page.reload()` ELE VOLTA FECHADO**: aberto/fechado é estado efêmero, e recarregar
 * o zera. Todo caso que recarrega a ficha e volta a mexer no formulário chama este auxiliar de novo.
 */
import { expect, type Page } from "@playwright/test";

export async function abrirEdicaoDoInstrutor(page: Page): Promise<void> {
  const gatilho = page.locator('[data-slot="abrir-edicao-do-instrutor"]');
  // ⚠️ Prazo medido na base real: a ficha leva de 1,5 a 5,1 s sob quatro processos (ver `abrirFicha`).
  await expect(gatilho, "a ficha não terminou de desenhar").toBeVisible({ timeout: 15_000 });
  if ((await gatilho.getAttribute("aria-expanded")) !== "true") await gatilho.click();
  await expect(page.locator('[data-slot="rodape-do-formulario"]')).toBeVisible();
}
