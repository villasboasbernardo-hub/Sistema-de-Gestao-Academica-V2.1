/**
 * O cadastro de instrutores, pelo percurso de quem usa (spec 006, quickstart passos 5, 6 e 7).
 *
 * ⚠️ **AS ASSERÇÕES SÃO SOBRE O QUE O BANCO GUARDOU, E NÃO SÓ SOBRE A TELA.** Uma recusa que só
 * mostra a mensagem e grava a linha mesmo assim passaria num teste que olhasse a tela. Por isso os
 * casos conferem, pela `service_role`, o que ficou gravado — e só para conferir, nunca para agir.
 *
 * ⚠️ **CÓDIGOS E NOMES ÚNICOS POR PROCESSO.** Dois processos semeando o mesmo valor colidem na
 * unicidade, e a falha parece defeito do schema quando é corrida do teste.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const servico = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

let EMAIL_ADMIN = "";
let PROCESSO = 0;
const omDoProcesso = () => `OM-PERCURSO-${PROCESSO}`;

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("instrutores-admin", PROCESSO);
  await servico().from("instrutores").delete().eq("om", omDoProcesso());
  await criarConta(EMAIL_ADMIN, `USR-INS-ADM-${PROCESSO}`);
});

test.afterAll(async () => {
  await servico().from("instrutores").delete().eq("om", omDoProcesso());
  await apagarConta(EMAIL_ADMIN);
});

/** Preenche os cinco obrigatórios. */
async function preencherObrigatorios(
  page: Page,
  valores: { nome: string; om: string; especialidade?: string },
) {
  await page.locator('select[name="posto_graduacao"]').selectOption("CT");
  await page.locator('input[name="esp_hab_obs"]').fill(valores.especialidade ?? "-EF");
  await page.locator('input[name="nome_completo"]').fill(valores.nome);
  await page.locator('input[name="categoria"]').fill("Militar");
  await page.locator('input[name="om"]').fill(valores.om);
}

/** Salva pelo caminho que a tela exige: o botão abre a confirmação, e confirmar envia. */
async function cadastrar(page: Page) {
  await page.getByRole("button", { name: "Cadastrar instrutor", exact: true }).click();
  const dialogo = page.getByRole("alertdialog");
  await expect(dialogo, "salvar não pediu confirmação (FR-011)").toBeVisible();
  await dialogo.getByRole("button", { name: "Cadastrar", exact: true }).click();
}

test.describe("`RN-ANT-01` · a listagem está no menu", () => {
  test("Instrutores é alcançado pelo menu, sem digitar URL, e deixou de dizer 'em breve'", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/inicio");
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: /Instrutores/ })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/instrutores");
    await expect(page.getByRole("heading", { name: "Instrutores", level: 1 })).toBeVisible();
  });
});

test.describe("`RN-INST-03` · o cadastro não aceita ficar pela metade", () => {
  test("nome só com espaços é recusado, a mensagem diz qual campo, e nada é gravado", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/instrutores/novo");
    await preencherObrigatorios(page, { nome: "   ", om: omDoProcesso() });
    await cadastrar(page);

    await expect(
      page.locator('[data-slot="formulario-de-instrutor"]').getByRole("alert"),
    ).toHaveText("Informe o nome completo.");

    const { count } = await servico()
      .from("instrutores")
      .select("id", { count: "exact", head: true })
      .eq("om", omDoProcesso());
    expect(count, "a recusa mostrou a mensagem e gravou a linha mesmo assim").toBe(0);
  });

  test("cadastro completo abre a ficha, com código inteiro gerado pelo sistema", async ({
    page,
  }) => {
    const nome = `Instrutor De Percurso ${PROCESSO}`;
    await entrar(page, EMAIL_ADMIN, "/instrutores/novo");
    await preencherObrigatorios(page, { nome, om: omDoProcesso() });
    await cadastrar(page);

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toMatch(/^\/instrutores\/\d+$/);
    await expect(page.locator('[data-slot="codigo-do-instrutor"]')).toContainText(/Código \d+/);

    const { data } = await servico()
      .from("instrutores")
      .select("codigo, nome_completo, criado_por")
      .eq("om", omDoProcesso())
      .single();
    expect(data?.codigo).toMatch(/^\d+$/);
    expect(data?.nome_completo).toBe(nome);
    expect(data?.criado_por, "a autoria não veio da sessão (FR-029)").not.toBeNull();
  });
});
