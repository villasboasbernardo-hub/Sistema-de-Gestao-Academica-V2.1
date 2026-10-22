/**
 * Ajudantes de ponta a ponta da central de avisos (spec 022, Bloco 7, FR-004).
 *
 * ⚠️ **CHEGA-SE POR CLIQUE NO SININHO** (regra *"tela sem caminho clicável é tela não entregue"*): `goto("/avisos")`
 *    provaria que a página funciona, nunca que alguém chega nela.
 * ⚠️ **O AVISO SE ACHA PELA CHAVE** (`data-aviso="módulo:tipo:sujeito"`, `lib/dominio/avisos/central.ts`): a página tem
 *    os avisos de TODAS as amostras da suíte, rodando em paralelo — o texto casaria com o aviso de outro arquivo.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export async function abrirAvisosPeloSininho(page: Page): Promise<void> {
  await page.locator('[data-slot="sininho-de-avisos"]').click();
  await expect(page).toHaveURL(/\/avisos(\?|$)/);
  await expect(page.locator('[data-slot="pagina-de-avisos"]')).toBeVisible();
}

/** O item da página Avisos com esta chave. */
export function avisoDaChave(page: Page, chave: string): Locator {
  return page.locator(
    `[data-slot="pagina-de-avisos"] [data-aviso="${chave.replaceAll('"', '\\"')}"]`,
  );
}

/**
 * Os avisos de vista de prova de um tipo (`avaliacoes:vista_<tipo>:<id da avaliação>`). A chave leva o id, que a amostra
 * não conhece: filtra-se pela turma e pela disciplina, que estão no texto (`<turma>: …` e `<disciplina> · <tipo>, …`).
 */
export function avisosDeVista(page: Page, tipo: "atrasada" | "vence_em_breve"): Locator {
  return page.locator(`[data-slot="pagina-de-avisos"] [data-aviso^="avaliacoes:vista_${tipo}:"]`);
}

/** Os itens de um módulo cuja chave termina neste sujeito (`…:<sujeito>`). */
export function avisosDoSujeito(page: Page, modulo: string, sujeito: string): Locator {
  return page.locator(
    `[data-slot="pagina-de-avisos"] [data-modulo="${modulo}"] [data-aviso$=":${sujeito.replaceAll('"', '\\"')}"]`,
  );
}
