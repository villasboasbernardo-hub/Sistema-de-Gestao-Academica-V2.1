/**
 * Spec 014, PR 2 — os cards de AEC, TAD e TR, o previsto do PROENS, os limites do curso, o alerta no
 * `/inicio` e a lista `/atividades`, por clique (T066 a T070).
 *
 * ⚠️ `goto` só no ponto de partida (o login); o resto é menu, busca e link.
 * ⚠️ Os dois percentuais, nesta ordem: do previsto e do máximo (D-TETO-3).
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { limparTetos, previstoNoBanco, semearTetos, type TetosSemeados } from "./tetos-de-teste";

/*
 * ⚠️ SERIAL: a sugestão da reserva genérica é um parâmetro do sistema inteiro (`config_parametros`),
 *    e dois processos semeando-a ao mesmo tempo colidem em `uq_config_param_chave_ano`.
 */
test.describe.configure({ mode: "serial" });

let ADMIN = "";
let AJUDANTE = "";
let OPERADOR = "";
let T: TetosSemeados;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  ADMIN = emailDeTeste("tetos-adm", p);
  AJUDANTE = emailDeTeste("tetos-aju", p);
  OPERADOR = emailDeTeste("tetos-ope", p);
  await criarConta(ADMIN, `USR-TETA-${p}`, "encarregado_administracao_academica");
  await criarConta(AJUDANTE, `USR-TETJ-${p}`, "ajudante_administracao_academica");
  await criarConta(OPERADOR, `USR-TETO-${p}`, "operador", "regular");
  T = await semearTetos(p);
});

test.afterAll(async () => {
  await limparTetos(T);
  for (const e of [ADMIN, AJUDANTE, OPERADOR]) await apagarConta(e);
});

const card = (page: Page, c: string) => page.locator(`[data-teto-card="${c}"]`);

test("US1 cenário 1 · a turma acima do previsto e do máximo, abaixo do Andamento", async ({
  page,
}) => {
  await irAFichaDaTurma(page, ADMIN, T.turmaAcima);

  const tetos = page.locator('[data-slot="tetos-da-turma"]');
  await expect(tetos).toBeVisible();
  // A faixa dos cards vem DEPOIS da seção Andamento (comentário de Bernardo, 13/10/2026).
  const ordem = await page.evaluate(() => {
    const a = document.querySelector('[data-slot="andamento-da-turma"]');
    const t = document.querySelector('[data-slot="tetos-da-turma"]');
    return !!a && !!t && !!(a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(ordem, "os cards têm de vir abaixo do Andamento").toBe(true);

  const tad = card(page, "tad");
  await expect(tad.locator('[data-teto="do-previsto"]')).toHaveText("29 de 25 previstos (116 %)");
  await expect(tad.locator('[data-teto="do-maximo"]')).toContainText("29 de 27,25 máximos (106 %)");
  await expect(tad.locator('[data-teto="origem"]')).toContainText("norma");
  await expect(tad.locator('[data-teto="barra"]')).toHaveAttribute("data-maximo", "27.25");
  await expect(tad.locator('[data-teto="barra"]')).toHaveAttribute("data-previsto", "25");
  await expect(tad.getByRole("status")).toHaveText("acima do previsto · acima do máximo");
  // AEC sem previsto: a frase, nunca zero.
  await expect(card(page, "aec").locator('[data-teto="previsto-nao-definido"]')).toBeVisible();
});

test("FR-006 · turma EAD não tem cards", async ({ page }) => {
  await irAFichaDaTurma(page, ADMIN, T.turmaEad);
  await expect(page.locator('[data-slot="dsa-turma-ead"]')).toBeVisible();
  await expect(page.locator('[data-slot="tetos-da-turma"]')).toHaveCount(0);
});

test("US1 2.2/2.3 · o Ajudante grava acima do máximo, e é avisado; a sugestão aparece marcada", async ({
  page,
}) => {
  await irAFichaDaTurma(page, AJUDANTE, T.turmaSemPrevisto);
  const tad = card(page, "tad");
  await tad.locator('[data-slot="editar-previsto"]').click();
  await expect(tad.locator('[data-slot="sugestao-do-previsto"]')).toContainText("Sugestão");

  const aec = card(page, "aec");
  await aec.locator('[data-slot="editar-previsto"]').click();
  await aec.getByLabel("Previsto no PROENS (TA)").fill("70");
  await aec.locator('[data-slot="gravar-previsto"]').click();
  await expect(aec.locator('[data-slot="previsto-gravado"]')).toContainText(
    "acima do limite máximo",
  );
  await expect.poll(() => previstoNoBanco(T.turmaSemPrevisto, "AEC")).toBe(70);
  await expect(aec.locator('[data-teto="autoria"]')).toContainText("previsto alterado por");
});

test("FR-008.1 · o Operador não vê o botão de editar o previsto", async ({ page }) => {
  await irAFichaDaTurma(page, OPERADOR, T.turmaAcima);
  await expect(card(page, "tad")).toBeVisible();
  await expect(page.locator('[data-slot="editar-previsto"]')).toHaveCount(0);
});

test("US1 2.4 · a página do curso mostra os limites com a origem e a turma excedida", async ({
  page,
}) => {
  await irAFichaDaTurma(page, ADMIN, T.turmaSemPrevisto);
  await page.locator('[data-slot="curso-da-turma"]').click();
  const bloco = page.locator('[data-slot="limites-do-curso"]');
  await expect(bloco.locator('[data-limite="AEC"]')).toHaveText("AEC — 65 TA (currículo, p. 7)");
  await expect(bloco.locator('[data-limite="TAD"]')).toHaveText("TAD — 30 TA (norma: 5 % de 600)");

  await irAFichaDaTurma(page, ADMIN, T.turmaAcima);
  await page.locator('[data-slot="curso-da-turma"]').click();
  const excedida = page.locator('[data-slot="turma-excedida"]', { hasText: "TAD acima do máximo" });
  await expect(excedida).toHaveText(`${T.turmaAcima}: TAD acima do máximo (29 de 27,25)`);
  await excedida.click();
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(T.turmaAcima);
});

test("FR-005 · o /inicio alerta o teto excedido e leva à turma", async ({ page }) => {
  await entrar(page, ADMIN, "/inicio");
  const alerta = page.locator('[data-slot="alerta-de-teto"]', {
    hasText: `${T.turmaAcima}: TAD acima do máximo`,
  });
  await expect(alerta).toBeVisible();
  await alerta.click();
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(T.turmaAcima);
});

test("FR-063 · Atividades sai do «em breve» e lista as atividades com a categoria", async ({
  page,
}) => {
  await entrar(page, ADMIN, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
  const linha = page.locator(`[data-atividade="${T.cursoNorma.replace(/-N$/, "")}-ATV-1"]`);
  await expect(linha).toBeVisible();
  await expect(linha.locator("[data-categoria]")).toHaveAttribute("data-categoria", "TAD");
  await expect(page.locator('[data-slot="limpar-filtros"]')).toHaveCount(0);
});
