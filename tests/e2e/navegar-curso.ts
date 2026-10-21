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
  "sobre" | "grade" | "disciplinas" | "avaliacoes" | "atividades" | "horarios" | "curriculo";

/** As partes do currículo em *Editar curso* (spec 021, ajuste 3 da conferência do PR #82). */
export type ParteDaEdicao = "dados" | "disciplinas" | "horarios" | "atividades";

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

/**
 * *Editar curso* por clique — Cursos → o curso → *Editar curso* (spec 021, ajuste 3 da conferência do PR #82: o
 * currículo inteiro se edita ali).
 */
export async function irAEdicaoDoCurso(page: Page, email: string, sigla: string): Promise<void> {
  await irAoCursoPorClique(page, email, sigla);
  await page.locator('[data-slot="ir-para-editar-curso"]').click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/cursos/${encodeURIComponent(sigla)}/editar`);
  await expect(page.locator('[data-slot="curriculo-na-edicao"]')).toBeVisible();
}

/** Clica na parte do currículo em edição e espera o painel dela. */
export async function abrirParteDaEdicao(page: Page, parte: ParteDaEdicao): Promise<void> {
  await page
    .locator(`[data-slot="partes-do-curriculo"] [role="tab"][data-parte="${parte}"]`)
    .click();
  if (parte !== "dados") await expect(page).toHaveURL(new RegExp(`[?&]parte=${parte}(&|$)`));
  await expect(page.locator(`[role="tabpanel"]#painel-parte-${parte}`)).toBeVisible();
}

/** A grade de disciplinas EM EDIÇÃO, por clique: Cursos → o curso → *Editar curso* → *Disciplinas e avaliações*. */
export async function irAsDisciplinasDaEdicao(
  page: Page,
  email: string,
  sigla: string,
): Promise<void> {
  await irAEdicaoDoCurso(page, email, sigla);
  await abrirParteDaEdicao(page, "disciplinas");
  await expect(page.getByRole("columnheader", { name: "CH" })).toBeVisible();
}

/**
 * Responde ao pedido de justificativa da RC-6 (spec 021): no currículo seguido por turma com lançamento, acrescentar,
 * mudar o que tinha valor e inativar são correção — o banco pede o motivo, e a tela o pergunta.
 */
export async function justificarCorrecao(page: Page, motivo: string): Promise<void> {
  const pedido = page.locator('[data-slot="pedido-de-justificativa"]');
  await expect(pedido).toBeVisible();
  await pedido.locator('[data-slot="justificativa-da-correcao"]').fill(motivo);
  await pedido.locator('[data-slot="confirmar-justificativa"]').click();
  await expect(pedido).toHaveCount(0);
}
