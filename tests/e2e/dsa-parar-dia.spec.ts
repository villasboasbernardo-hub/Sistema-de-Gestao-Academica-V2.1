/**
 * Spec 014, PR 2.1 — «Parar dia» e «Desfazer» no DSA, por clique (US4, `FR-023` a `FR-028.1`).
 *
 * ⚠️ `goto` só no login. ⚠️ A parada de parte do dia bloqueia só as células dos tempos dela, e
 *    desfazer devolve o tempo (regra 4: a linha fica `inativo`).
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";

/** A sexta da semana da semente: os tempos 2 a 8 são livres (medido); a quarta é feriado. */
const SEXTA = "2026-04-10";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

test.describe.configure({ mode: "serial" });

let ADMIN = "";
let OPERADOR = "";
let S: DsaSemeado;
const MOTIVO = "Licença da turma (teste de parada)";

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  ADMIN = emailDeTeste("dsaparar", p);
  OPERADOR = emailDeTeste("dsaparar-op", p);
  await criarConta(ADMIN, `USR-DSAP-${p}`);
  await criarConta(OPERADOR, `USR-DSAPO-${p}`, "operador", "geral");
  S = await semearDsa(p, ADMIN);
});

test.afterAll(async () => {
  await banco().from("dias_parados").update({ status: "inativo" }).eq("motivo", MOTIVO);
  await banco().from("dias_parados").delete().eq("motivo", MOTIVO);
  await limparDsa(S);
  await apagarConta(ADMIN);
  await apagarConta(OPERADOR);
});

async function abrirASemana(page: Page, email: string): Promise<void> {
  await irAFichaDaTurma(page, email, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await expect(page.locator('[data-slot="grade-alocacao"]')).toBeVisible();
}

/** A célula pelo rótulo acessível, que termina em «· <tempo> · <data>». */
const celula = (page: Page, ta: number) =>
  page.locator(`[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${SEXTA}"]`);

test("US4 · parar os tempos 6 e 7 da sexta bloqueia só eles, e desfazer devolve", async ({
  page,
}) => {
  await abrirASemana(page, ADMIN);
  await page.locator('[data-slot="parar-dia"]').click();
  const form = page.locator('[data-slot="formulario-de-parada"]');
  await form.locator("#parada-dia").selectOption(SEXTA);
  await form.locator("#parada-tipo").selectOption({ label: "LA — Licença Administrativa" });
  await form.locator("#parada-motivo").fill(MOTIVO);
  await form.getByLabel("Dia inteiro").uncheck();
  await form.getByLabel("Do tempo").fill("6");
  await form.getByLabel("quantos").fill("2");
  await form.locator('[data-slot="gravar-parada"]').click();
  // Com lançamento no dia, pede confirmação e não grava sem ela (US4); sem lançamento, grava direto.
  const confirmar = page.locator('[data-slot="confirmar-parada"]');
  const resposta = page.locator('[data-slot="resposta-da-parada"]');
  await expect(confirmar.or(resposta)).toBeVisible();
  if (await confirmar.isVisible()) {
    const { count } = await banco()
      .from("dias_parados")
      .select("id", { count: "exact", head: true })
      .eq("motivo", MOTIVO);
    expect(count, "sem confirmação, nada é gravado").toBe(0);
    await confirmar.getByRole("button", { name: "Parar mesmo assim" }).click();
  }
  await expect(page.locator('[data-slot="resposta-da-parada"]')).toHaveText(
    "Dia parado registrado.",
  );

  const chip = page.locator("[data-parada]", { hasText: MOTIVO });
  await expect(chip).toContainText("tempos 6 a 7");
  await expect(celula(page, 6)).toHaveAttribute("data-tom", "bloqueada");
  await expect(celula(page, 7)).toHaveAttribute("data-tom", "bloqueada");
  await expect(celula(page, 5)).toHaveAttribute("data-tom", "livre");
  await expect(celula(page, 8)).toHaveAttribute("data-tom", "livre");

  const { data: gravada } = await banco()
    .from("dias_parados")
    .select("status, ta_inicial, tempos, prevista")
    .eq("motivo", MOTIVO)
    .single();
  expect(gravada).toEqual({ status: "ativo", ta_inicial: 6, tempos: 2, prevista: true });

  await chip.locator('[data-slot="desfazer-parada"]').click();
  await expect(page.locator('[data-slot="resposta-da-parada"]')).toHaveText("Parada desfeita.");
  await expect(page.locator("[data-parada]", { hasText: MOTIVO })).toHaveCount(0);
  const { data: desfeita } = await banco()
    .from("dias_parados")
    .select("status")
    .eq("motivo", MOTIVO)
    .single();
  expect(desfeita?.status).toBe("inativo");
});

test("Q-8 · o Operador não vê «Todas as turmas»; o Admin vê", async ({ page }) => {
  await abrirASemana(page, ADMIN);
  await page.locator('[data-slot="parar-dia"]').click();
  await expect(page.locator('[data-slot="parada-de-todas"]')).toBeVisible();

  await page.context().clearCookies();
  await abrirASemana(page, OPERADOR);
  await page.locator('[data-slot="parar-dia"]').click();
  await expect(page.locator('[data-slot="formulario-de-parada"]')).toBeVisible();
  await expect(page.locator('[data-slot="parada-de-todas"]')).toHaveCount(0);
});
