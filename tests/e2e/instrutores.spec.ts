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
import {
  limparInstrutores,
  semearInstrutores,
  type AmostraDeInstrutores,
} from "./instrutores-de-teste";

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
    // `FR-014` · instrutor sem lançamento no ano: a view não tem linha, e a ficha mostra zero — não "—".
    await expect(page.locator('[data-slot="carga-ministrada"]')).toHaveText("0 TA");

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

/** Confirma uma ação de situação pelo caminho que a tela exige: botão, diálogo, confirmar. */
async function confirmarSituacao(page: Page, botao: string, confirmar: string) {
  await page.getByRole("button", { name: botao, exact: true }).click();
  const dialogo = page.getByRole("alertdialog");
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: confirmar, exact: true }).click();
}

test.describe("`RN-INST-02` · desativar preserva o passado (quickstart, passo 6)", () => {
  let amostra: AmostraDeInstrutores;

  test.beforeAll(async () => {
    amostra = await semearInstrutores(PROCESSO);
  });

  test.afterAll(async () => {
    await limparInstrutores(PROCESSO);
  });

  const grade = (page: Page) => page.getByRole("grid", { name: "Instrutores" });
  const selo = (page: Page) => page.locator('header [data-slot="badge-status"]');

  test("desativado some da listagem padrão, aparece em inativos, mantém aula e vínculo, e reativar devolve", async ({
    page,
  }) => {
    const nome = amostra.nomes.comAula;
    const codigo = amostra.codigos.comAula;

    await entrar(page, EMAIL_ADMIN, `/instrutores?om=${amostra.om}`);
    await expect(grade(page), "controle: o ativo aparece na listagem padrão").toContainText(nome);

    await page.goto(`/instrutores/${codigo}`);
    await confirmarSituacao(page, "Desativar instrutor", "Desativar");
    await expect(selo(page)).toHaveText("inativo");

    await page.goto(`/instrutores?om=${amostra.om}`);
    await expect(grade(page)).toBeVisible();
    await expect(grade(page), "o desativado continua na listagem padrão").not.toContainText(nome);

    await page.goto(`/instrutores?om=${amostra.om}&situacao=inativo`);
    await expect(grade(page), "o desativado sumiu também dos inativos").toContainText(nome);

    // O histórico: a aula continua apontando para ele, com o nome, e a habilitação continua ativa.
    const { data: instrutor } = await servico()
      .from("instrutores")
      .select("id, nome_completo, status")
      .eq("codigo", codigo)
      .single();
    expect(instrutor?.status).toBe("inativo");
    expect(instrutor?.nome_completo).toBe(nome);
    const { data: aulas } = await servico()
      .from("registros_aula")
      .select("codigo")
      .eq("instrutor_id", instrutor?.id as string);
    expect(aulas ?? [], "a desativação mexeu na aula já lançada").toHaveLength(1);
    const { data: vinculos } = await servico()
      .from("instrutor_disciplina")
      .select("status")
      .eq("instrutor_id", instrutor?.id as string);
    expect(vinculos, "a desativação desfez a habilitação").toEqual([{ status: "ativo" }]);

    await page.goto(`/instrutores/${codigo}`);
    await confirmarSituacao(page, "Reativar instrutor", "Reativar");
    await expect(selo(page)).toHaveText("ativo");

    await page.goto(`/instrutores?om=${amostra.om}`);
    await expect(grade(page), "reativar não devolveu à listagem padrão").toContainText(nome);
  });

  test("desativar o instrutor não desativa a conta, e a tela de usuários mostra o vínculo inativo", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores/${amostra.codigos.vinculado}`);
    await confirmarSituacao(page, "Desativar instrutor", "Desativar");
    await expect(selo(page)).toHaveText("inativo");

    await page.goto("/admin/usuarios");
    const linha = page.locator("tr", { hasText: amostra.emailDaContaVinculada });
    await expect(linha.locator('[data-slot="instrutor-vinculado"]')).toContainText(
      "instrutor inativo",
    );
    // A coluna Situação é a quinta: Nome, E-mail, Perfil, Escopo, Situação.
    await expect(linha.locator("td").nth(4), "a conta foi desativada em cascata").toHaveText(
      "ativo",
    );

    const { data: conta } = await servico()
      .from("usuarios")
      .select("status")
      .eq("email", amostra.emailDaContaVinculada)
      .single();
    expect(conta?.status, "desativar o instrutor desativou a conta (FR-010.1)").toBe("ativo");
  });
});
