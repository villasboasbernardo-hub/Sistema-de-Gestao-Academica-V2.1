/**
 * A linha expansível da tabela densa — abrir, fechar e reabrir (conferência do PR #67, 17/10/2026).
 *
 * > *"Clicar de novo na mesma linha não fecha. O clique, o Enter e o Espaço na linha aberta passam a
 * > FECHAR, voltando ao estado inicial."* — Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **O ESTADO SE LÊ NO `aria-expanded` DA LINHA**, que a tabela única põe no `<tr>` principal: é o
 * que leitor de tela anuncia, e é o mesmo para qualquer tela que use `detalhe`.
 *
 * ⚠️ **`abrirLinha` É IDEMPOTENTE**, no modelo de `abrirEdicaoDaTurma`: desde o conserto, clicar numa
 * linha aberta a FECHA, e um auxiliar que clicasse sem olhar fecharia o detalhe em silêncio.
 */
import { expect, type Locator, type Page } from "@playwright/test";

/** A linha principal (não a de detalhe) que contém o texto. */
export function linhaExpansivel(escopo: Page | Locator, texto: string): Locator {
  return escopo.locator("tr[aria-expanded]").filter({ hasText: texto }).first();
}

function celulaDa(linha: Locator, texto: string): Locator {
  return linha.getByRole("gridcell", { name: texto, exact: false }).first();
}

/** Abre a linha — só se ela estiver fechada. */
export async function abrirLinha(escopo: Page | Locator, texto: string): Promise<void> {
  const linha = linhaExpansivel(escopo, texto);
  await expect(linha).toBeVisible();
  if ((await linha.getAttribute("aria-expanded")) !== "true") await celulaDa(linha, texto).click();
  await expect(linha).toHaveAttribute("aria-expanded", "true");
}

/**
 * Fecha e reabre a linha por **clique**, **Enter** e **Espaço**, a partir dela ABERTA, conferindo em
 * cada passo o `aria-expanded`, o detalhe e o `?aberta=` da URL (que some ao fechar: é o estado
 * inicial).
 */
export async function conferirQueALinhaAlterna(
  page: Page,
  escopo: Page | Locator,
  texto: string,
  detalhe: Locator,
): Promise<void> {
  const linha = linhaExpansivel(escopo, texto);
  const celula = celulaDa(linha, texto);
  const aberta = () => new URL(page.url()).searchParams.get("aberta");

  await expect(linha).toHaveAttribute("aria-expanded", "true");
  const chave = await aberta();
  expect(chave, "a linha aberta não está no endereço").not.toBeNull();

  async function conferir(abertaAgora: boolean, passo: string): Promise<void> {
    await expect(linha, `${passo}: aria-expanded`).toHaveAttribute(
      "aria-expanded",
      String(abertaAgora),
    );
    if (abertaAgora) await expect(detalhe, `${passo}: o detalhe não abriu`).toBeVisible();
    else await expect(detalhe, `${passo}: o detalhe não fechou`).toHaveCount(0);
    await expect
      .poll(aberta, { message: `${passo}: o endereço não acompanhou` })
      .toBe(abertaAgora ? chave : null);
  }

  await celula.click();
  await conferir(false, "clique na linha aberta");
  await celula.click();
  await conferir(true, "clique na linha fechada");

  await celula.focus();
  await page.keyboard.press("Enter");
  await conferir(false, "Enter na linha aberta");
  await page.keyboard.press("Enter");
  await conferir(true, "Enter na linha fechada");

  await page.keyboard.press(" ");
  await conferir(false, "Espaço na linha aberta");
  await page.keyboard.press(" ");
  await conferir(true, "Espaço na linha fechada");
}
