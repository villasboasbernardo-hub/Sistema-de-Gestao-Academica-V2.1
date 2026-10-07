/**
 * `RF-PDF-01` — o DSA no **modelo v4**, nas quatro semanas de referência, com o **dado real**.
 *
 * ⚠️ **SÓ RODA CONTRA O BANCO LOCAL COM A CÓPIA DO REMOTO** (`python -m scripts.manutencao.dado_do_remoto`)
 * e o servidor de `pnpm dev:local`: as quatro semanas são turmas reais, que a base do CI não tem.
 * Sem `DSA_V4_URL` ele é pulado.
 *
 *     DSA_V4_URL=http://localhost:3000 DSA_V4_EMAIL=<o seu e-mail local> pnpm exec playwright test dsa-layout-v4
 *
 * ⚠️ **AS IMAGENS NÃO VÃO PARA O GIT**: elas trazem nome de instrutor, e o repositório é público. Saem
 * em `test-results/dsa-v4/` (ignorado), uma PNG e um PDF por semana, para conferência a olho.
 *
 * O que se afirma em cada semana: **uma** página A4 paisagem; **nada transborda** da folha nem da
 * grade; as **colunas** são os dias da semana (com o sábado quando houver); as **linhas** são os
 * tempos do relógio da turma; e **nenhum Estudo Individual** fica sem tempo.
 */
import { mkdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { enderecoDaImpressaoDoDsa, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

const URL_BASE = process.env.DSA_V4_URL ?? "";
const EMAIL = process.env.DSA_V4_EMAIL ?? "";
const SENHA = process.env.DSA_V4_SENHA ?? "conferencia-local-12345";
const SAIDA = "test-results/dsa-v4";

const SEMANAS = [
  { nome: "obs-me-05-09-out", turma: "C-Exp-Obs-ME 2026", semana: 41, dias: 5, tempos: null },
  {
    nome: "c-ap-hn-17-22-ago",
    turma: "C-Ap-HN 2026",
    semana: 34,
    sabado: true,
    dias: 6,
    tempos: null,
  },
  { nome: "caho-20-24-jul", turma: "CAHO 2026", semana: 30, dias: 5, tempos: 9 },
  { nome: "c-espc-hn-13-17-jul", turma: "C-Espc-HN 2026", semana: 29, dias: 5, tempos: null },
] as const;

test.skip(
  URL_BASE === "" || EMAIL === "",
  "só roda com DSA_V4_URL e DSA_V4_EMAIL (dado real, local)",
);
test.use({ baseURL: URL_BASE });

function paginasDoPdf(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

async function entrar(page: Page): Promise<void> {
  await page.goto("/login?destino=%2Finicio");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="senha"]').fill(SENHA);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe("/login");
}

for (const s of SEMANAS) {
  test(`${s.turma}, semana ${s.semana}: uma folha, nada transborda`, async ({ page }) => {
    test.setTimeout(120_000);
    mkdirSync(SAIDA, { recursive: true });
    await entrar(page);
    const recorte = {
      semana: s.semana,
      ano: 2026,
      ...("sabado" in s && s.sabado ? { sabado: true } : {}),
    };
    await page.goto(enderecoDaImpressaoDoDsa(s.turma, recorte));
    const folha = page.locator('[data-slot="dsa-impresso"]');
    await expect(folha).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator(".dsa4-cabeca-dia")).toHaveCount(s.dias);
    if (s.tempos !== null) await expect(page.locator(".dsa4-tempo")).toHaveCount(s.tempos);
    await expect(page.locator('[data-slot="dsa-fora-da-grade"]')).toHaveCount(0);
    await expect(
      page.locator('[data-slot="dsa-assinatura-esquerda"] .dsa4-assinatura-nome'),
    ).not.toBeEmpty();
    await expect(
      page.locator('[data-slot="dsa-assinatura-direita"] .dsa4-assinatura-nome'),
    ).not.toBeEmpty();

    /* ⚠️ Nada transborda: nem a folha, nem a grade, nem um cartão (conteúdo cortado é o defeito). */
    const transbordos = await page.evaluate(() => {
      const fora: string[] = [];
      const medir = (el: Element, nome: string) => {
        const h = el as HTMLElement;
        if (h.scrollHeight > h.clientHeight + 1)
          fora.push(`${nome}: ${h.scrollHeight} > ${h.clientHeight}`);
      };
      const folhaEl = document.querySelector(".dsa4");
      if (folhaEl) {
        const r = folhaEl.getBoundingClientRect();
        const filhos = [...folhaEl.children].map((c) => c.getBoundingClientRect().bottom);
        const fim = Math.max(...filhos);
        if (fim > r.bottom + 1) fora.push(`folha: conteúdo até ${fim}, folha até ${r.bottom}`);
      }
      const grade = document.querySelector(".dsa4-grade");
      if (grade) medir(grade, "grade");
      document.querySelectorAll(".dsa4-cartao").forEach((c, i) => medir(c, `cartão ${i}`));
      return fora;
    });
    await folha.screenshot({ path: `${SAIDA}/${s.nome}.png` });
    expect(transbordos, "conteúdo transbordou").toEqual([]);

    const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`${SAIDA}/${s.nome}.pdf`, pdf);
    expect(paginasDoPdf(pdf), "passou de uma folha A4 paisagem").toBe(1);

    /* ⚠️ A MESMA montagem na tela da turma: o mesmo número de cartões, a mesma folha. */
    const cartoesNoPapel = await page.locator('[data-slot="dsa-cartao"]').count();
    await page.goto(enderecoDoDsa(s.turma, recorte));
    const naTela = page.locator(
      '[data-slot="documento-do-dsa-na-tela"] [data-slot="dsa-impresso"]',
    );
    await expect(naTela).toBeVisible({ timeout: 60_000 });
    await expect(naTela.locator('[data-slot="dsa-cartao"]')).toHaveCount(cartoesNoPapel);
    await naTela.screenshot({ path: `${SAIDA}/${s.nome}-tela.png` });
  });
}
