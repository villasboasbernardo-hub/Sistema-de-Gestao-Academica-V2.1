/**
 * Tipografia institucional auto-hospedada (`FR-015`, `SC-006`).
 *
 * ⚠️ O QUE SE MEDE É A AUSÊNCIA DE REQUISIÇÃO EXTERNA, não a aparência. Na v2.0 a fonte vinha por
 * CDN, e é isso que quebraria a impressão — que não pode depender de rede no momento em que
 * alguém manda imprimir. Aparência se confere com o olho, na vitrine; dependência de rede, não:
 * ela funciona na máquina de quem desenvolve e falha na sala onde a rede é restrita.
 */
import { expect, test } from "@playwright/test";

const DOMINIO_DE_TERCEIRO = /fonts\.(googleapis|gstatic)\.com|use\.typekit|cdnjs|unpkg|jsdelivr/i;

test.describe("US4 · a tipografia é servida pelo próprio sistema", () => {
  test("nenhuma requisição sai para domínio de terceiro", async ({ page }) => {
    const externas: string[] = [];
    page.on("request", (r) => {
      if (DOMINIO_DE_TERCEIRO.test(r.url())) externas.push(r.url());
    });

    await page.goto("/estilo");
    await page.waitForLoadState("networkidle");

    expect(
      externas,
      `a página pediu recurso a domínio de terceiro: ${externas.join(", ")}. ` +
        `A fonte tem de vir de public/fontes/ (FR-015)`,
    ).toEqual([]);
  });

  test("todo arquivo de fonte vem do próprio sistema", async ({ page }) => {
    const servidas: string[] = [];
    page.on("response", (r) => {
      if (/\.woff2?(\?|$)/i.test(r.url())) servidas.push(new URL(r.url()).pathname);
    });

    await page.goto("/estilo");
    await page.waitForLoadState("networkidle");

    const deFora = servidas.filter((p) => !p.startsWith("/_next/") && !p.startsWith("/fontes/"));
    expect(deFora, `fonte servida de fora do próprio sistema: ${deFora.join(", ")}`).toEqual([]);
  });
});
