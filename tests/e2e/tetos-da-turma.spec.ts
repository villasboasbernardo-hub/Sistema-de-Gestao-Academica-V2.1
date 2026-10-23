/**
 * Spec 014, PR 2 — os cards de AEC, TAD e TR, o previsto do PROENS, os limites do curso, o alerta no
 * `/inicio` e a lista `/atividades`, por clique (T066 a T070).
 *
 * ⚠️ `goto` só no ponto de partida (o login); o resto é menu, busca e link.
 * ⚠️ Os dois percentuais, nesta ordem: do previsto e do máximo (D-TETO-3).
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { abrirAvisosPeloSininho, avisoDaChave } from "./avisos";
import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";
import { limparTetos, previstoNoBanco, semearTetos, type TetosSemeados } from "./tetos-de-teste";
import { abrirAbaDoCurso } from "./navegar-curso";

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
  // Spec 022 (Bloco 7, FR-002): o previsto se edita num diálogo; a resposta fica no card.
  const dialogo = page.locator('[data-slot="formulario-do-previsto"]');
  await tad.locator('[data-slot="editar-previsto"]').click();
  await expect(dialogo.locator('[data-slot="sugestao-do-previsto"]')).toContainText("Sugestão");
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toHaveCount(0);

  const aec = card(page, "aec");
  await aec.locator('[data-slot="editar-previsto"]').click();
  await dialogo.getByLabel("Previsto no PROENS (TA)").fill("70");
  await dialogo.locator('[data-slot="gravar-previsto"]').click();
  await expect(dialogo).toHaveCount(0);
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

test("US1 2.4 · a aba Atividades do curso mostra os limites com a origem, e a turma excedida vai para Avisos", async ({
  page,
}) => {
  await irAFichaDaTurma(page, ADMIN, T.turmaSemPrevisto);
  await page.locator('[data-slot="curso-da-turma"]').click();
  // Spec 018 (Bloco 3, C-5/C-6): os limites (o previsto) moram na aba Atividades.
  await abrirAbaDoCurso(page, "atividades");
  const bloco = page.locator('[data-slot="aba-atividades"] [data-slot="limites-do-curso"]');
  await expect(bloco.locator('[data-limite="AEC"]')).toHaveText("AEC — 65 TA (currículo, p. 7)");
  await expect(bloco.locator('[data-limite="TAD"]')).toHaveText("TAD — 30 TA (norma: 5 % de 600)");

  await irAFichaDaTurma(page, ADMIN, T.turmaAcima);
  await page.locator('[data-slot="curso-da-turma"]').click();
  /*
   * Spec 022 (Bloco 7, FR-004.4): a turma excedida saiu da página do curso — está na página Avisos, pelo sininho, com a
   * mesma frase, e o link leva à ficha.
   */
  await expect(page.locator('[data-slot="abas-do-curso"]')).toBeVisible();
  await expect(page.locator('[data-slot="turma-excedida"]')).toHaveCount(0);
  await abrirAvisosPeloSininho(page);
  const excedida = avisoDaChave(page, `turmas:teto_tad_acima_do_maximo:${T.turmaAcima}`);
  await expect(excedida).toContainText(`${T.turmaAcima}: TAD acima do máximo (29 de 27,25)`);
  await excedida.getByRole("link").click();
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(T.turmaAcima);
});

test("FR-005 · o teto excedido está em Avisos (era o /inicio) e leva à turma", async ({ page }) => {
  await entrar(page, ADMIN, "/inicio");
  await expect(page.locator('[data-slot="alertas-de-teto"]')).toHaveCount(0);
  await abrirAvisosPeloSininho(page);
  const alerta = avisoDaChave(page, `turmas:teto_tad_acima_do_maximo:${T.turmaAcima}`);
  await expect(alerta).toContainText(`${T.turmaAcima}: TAD acima do máximo`);
  await alerta.getByRole("link").click();
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

/*
 * SC-003 (spec 014, fechamento de 16/10/2026): «nenhum lançamento é recusado por teto excedido» — PELA TELA.
 * ⚠️ Até aqui a prova era do banco: a semente grava os 29 TA de TAD direto, e nenhum caso LANÇAVA acima do teto.
 *    Este lança pelo DSA mais 1 TA de TAD numa turma já acima do máximo, lê a linha no banco e confere que a
 *    ficha só ALERTA (regra 6: teto é alerta, nunca `CHECK`).
 * ⚠️ É O ÚLTIMO CASO DO ARQUIVO, de propósito: os anteriores conferem o número exato «29 de 27,25».
 */
let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function atividadeNoBanco(descricao: string): Promise<Record<string, unknown> | null> {
  const { data } = await banco()
    .from("atividades_nao_letivas")
    .select("categoria_normativa, status, tempos_consumidos, data")
    .eq("descricao", descricao)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

test("SC-003 · lançar PELA TELA acima do máximo grava a linha e só alerta (o teto não recusa)", async ({
  page,
}) => {
  const descricao = `Recepção acima do teto ${Date.now().toString(36)}`;
  await irAFichaDaTurma(page, ADMIN, T.turmaAcima);
  const tad = card(page, "tad");
  await expect(tad.locator('[data-teto="do-maximo"]')).toContainText("29 de 27,25 máximos");

  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, "2026-03-09", 11, 2026);
  await page.locator('[data-slot="grade-alocacao"] td[data-celula="0:0"]').click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
  await page.locator('[data-tipo="TAD"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Recepção aos alunos" });
  await expect(page.locator('[data-slot="categoria-do-tipo"]')).toHaveText("Conta como: TAD");
  await page.locator("#dsa-responsavel-externo").fill("DOEP");
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator('[data-slot="recusa-do-lancamento"]')).toHaveCount(0);
  // Spec 024 (RP-0): o lançado é rascunho e não conta no teto até o «Salvar a semana». Espera o desfecho (fechou, ou o
  // alerta do teto, que mantém o formulário aberto — RN-DEG-02), fecha o alerta e salva.
  const formulario = page.locator('[data-slot="formulario-de-lancamento"]');
  const avisos = page.locator('[data-slot="avisos-do-lancamento"]');
  await expect
    .poll(async () => (await formulario.count()) === 0 || (await avisos.count()) > 0, {
      timeout: 60_000,
    })
    .toBe(true);
  if ((await avisos.count()) > 0) await page.getByRole("button", { name: "Entendi" }).click();
  await salvarASemana(page);

  // A linha está no banco: o teto não a recusou.
  await expect
    .poll(() => atividadeNoBanco(descricao))
    .toMatchObject({
      categoria_normativa: "TAD",
      status: "ativo",
      tempos_consumidos: 1,
      data: "2026-03-09",
    });

  // E a ficha só alerta, com o número novo.
  await irAFichaDaTurma(page, ADMIN, T.turmaAcima);
  await expect(card(page, "tad").locator('[data-teto="do-maximo"]')).toContainText(
    "30 de 27,25 máximos",
  );
  await expect(card(page, "tad").getByRole("status")).toHaveText(
    "acima do previsto · acima do máximo",
  );
});
