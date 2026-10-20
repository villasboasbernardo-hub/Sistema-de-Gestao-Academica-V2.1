/**
 * Chegar à página do curso e às abas dela **por clique** — spec 018 (Bloco 3).
 *
 * ⚠️ **O CAMINHO É O DO USUÁRIO**: menu *Cursos* → cartão do curso → aba. Desde o Bloco 3 a grade de disciplinas é a
 *    aba *Disciplinas* do curso, e o menu não tem mais a entrada (*"todo caminho por clique passa pelo curso"*). O
 *    `goto` fica só no ponto de partida (`entrar`).
 */
import { expect, type Page } from "@playwright/test";

import { entrar } from "./conta-de-teste";

export type AbaDoCurso =
  "sobre" | "grade" | "disciplinas" | "avaliacoes" | "atividades" | "horarios";

/** Entra, vai pelo menu até *Cursos* e abre o curso pelo cartão. */
export async function irAoCursoPorClique(page: Page, email: string, sigla: string): Promise<void> {
  await entrar(page, email, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Cursos" })
    .click();
  const cartao = page.locator(
    `[data-slot="cartao-de-curso"][href="/cursos/${encodeURIComponent(sigla)}"]`,
  );
  await cartao.scrollIntoViewIfNeeded();
  await cartao.click();
  await expect(page.locator('[data-slot="abas-do-curso"]')).toBeVisible();
}

/** Clica na aba e espera o painel dela. */
export async function abrirAbaDoCurso(page: Page, aba: AbaDoCurso): Promise<void> {
  await page.locator(`[data-slot="abas-do-curso"] [role="tab"][data-aba="${aba}"]`).click();
  await expect(page).toHaveURL(new RegExp(`[?&]aba=${aba}(&|$)`));
  await expect(page.locator(`[role="tabpanel"]#painel-${aba}`)).toBeVisible();
}

/** A grade de disciplinas do curso, por clique: Cursos → curso → *Disciplinas*. */
export async function irAsDisciplinasDoCurso(
  page: Page,
  email: string,
  sigla: string,
): Promise<void> {
  await irAoCursoPorClique(page, email, sigla);
  await abrirAbaDoCurso(page, "disciplinas");
  // ⚠️ Espera pelo que só a tabela pronta tem — nunca por tempo (achado 9 do Épico 3).
  await expect(page.getByRole("columnheader", { name: "CH" })).toBeVisible();
}
