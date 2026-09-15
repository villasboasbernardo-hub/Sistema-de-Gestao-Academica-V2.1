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
    amostra = await semearInstrutores(PROCESSO, "D");
  });

  test.afterAll(async () => {
    await limparInstrutores(PROCESSO, "D");
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

test.describe("`FR-025` a `FR-028` · a tela pelo percurso de quem usa (quickstart, passo 5)", () => {
  let amostra: AmostraDeInstrutores;
  /** Um civil ativo FORA da OM da amostra, com o mesmo marcador no nome: o que prova o E lógico. */
  const codigoDeFora = () => `${amostra.marcador}-fora`;

  test.beforeAll(async () => {
    amostra = await semearInstrutores(PROCESSO, "P");
    await servico().from("instrutores").delete().eq("codigo", codigoDeFora());
    const { error } = await servico()
      .from("instrutores")
      .insert({
        codigo: codigoDeFora(),
        posto_graduacao: "CT",
        esp_hab_obs: "-",
        nome_completo: `Fora Da Om ${amostra.marcador}`,
        categoria: "Civil",
        om: `${amostra.om}-OUTRA`,
        status: "ativo",
      });
    if (error) throw new Error(`falha ao semear o instrutor de fora: ${error.message}`);
  });

  test.afterAll(async () => {
    // ⚠️ Semeadura que falhou no meio deixa `amostra` indefinida; limpar ainda precisa acontecer.
    if (amostra) await servico().from("instrutores").delete().eq("codigo", codigoDeFora());
    await limparInstrutores(PROCESSO, "P");
  });

  const grade = (page: Page) => page.getByRole("grid", { name: "Instrutores" });
  const contagem = (page: Page) => page.locator('[data-slot="contagem-de-instrutores"]');
  const parametro = (page: Page, nome: string) => new URL(page.url()).searchParams.get(nome);

  async function escolher(page: Page, campo: string, opcao: string) {
    await page.getByRole("combobox", { name: campo, exact: true }).click();
    await page.getByRole("option", { name: opcao, exact: true }).click();
  }

  test("OM na URL muda a contagem, categoria opera sobre o resultado, e o link reproduz a tela", async ({
    page,
    context,
  }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores?busca=${amostra.marcador.toLowerCase()}`);
    // 10 ativos da amostra (o inativo fica de fora) + o civil de outra OM.
    await expect(contagem(page)).toContainText("11 instrutor(es)");

    await escolher(page, "OM", amostra.om);
    await expect.poll(() => parametro(page, "om")).toBe(amostra.om);
    await expect(contagem(page), "o filtro foi para a URL e o número ficou velho").toContainText(
      "10 instrutor(es)",
    );

    await escolher(page, "Categoria", "Civil");
    await expect.poll(() => parametro(page, "categoria")).toBe("Civil");
    await expect(
      contagem(page),
      "a categoria não operou sobre o resultado da OM: o civil de outra OM entrou",
    ).toContainText("2 instrutor(es)");
    await expect(grade(page)).toContainText(amostra.nomes.sc);
    await expect(grade(page)).toContainText(amostra.nomes.scns);
    await expect(grade(page)).not.toContainText(`Fora Da Om ${amostra.marcador}`);

    const outraAba = await context.newPage();
    await outraAba.goto(page.url());
    await expect(contagem(outraAba), "o link em aba nova não reproduziu o recorte").toContainText(
      "2 instrutor(es)",
    );
    await expect(grade(outraAba)).toContainText(amostra.nomes.scns);
    await outraAba.close();
  });

  test("os filtros de 15/09/2026: círculo, habilitado, selecionado, curso e capacitação nenhuma", async ({
    page,
  }) => {
    /*
     * A amostra deste processo, com o marcador na busca: 10 ativos e o civil de outra OM.
     *   · Oficiais: CMG, os dois CT, o CC, a 1ºTen, o CF e o de fora (CT) = 7;
     *   · habilitados: o CT mais antigo e o da aula = 2;
     *   · selecionado E não habilitado: só a 1ºTen = 1 — o caso real da v2.0;
     *   · curso da amostra: habilitados ∪ selecionados = CT mais antigo, o da aula e a 1ºTen = 3;
     *   · capacitação vazia: SC, SCNS, o de posto desconhecido, o CC, a 1ºTen, o SO e o de fora = 7.
     */
    const base = `/instrutores?busca=${amostra.marcador.toLowerCase()}`;
    await entrar(page, EMAIL_ADMIN, base);
    await expect(contagem(page)).toContainText("11 instrutor(es)");

    await escolher(page, "Círculo hierárquico", "Oficiais");
    await expect.poll(() => parametro(page, "circulo")).toBe("oficiais");
    await expect(contagem(page)).toContainText("7 instrutor(es)");

    await page.goto(base);
    await escolher(page, "Habilitado", "Sim");
    await expect.poll(() => parametro(page, "habilitado")).toBe("sim");
    await expect(contagem(page)).toContainText("2 instrutor(es)");

    await page.goto(`${base}&selecionado=sim&habilitado=nao`);
    await expect(contagem(page), "selecionado sem habilitação sumiu").toContainText(
      "1 instrutor(es)",
    );
    await expect(grade(page)).toContainText(amostra.nomes.selecionadoSemHabilitacao);

    await page.goto(`${base}&curso=CUR-${amostra.marcador}`);
    await expect(contagem(page), "curso não casou vínculo OU atribuição").toContainText(
      "3 instrutor(es)",
    );

    await page.goto(`${base}&capacitacao=nenhuma`);
    await expect(contagem(page)).toContainText("7 instrutor(es)");
  });

  test("oito letras na busca geram no máximo uma entrada de histórico", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores?om=${amostra.om}`);
    await expect(grade(page)).toBeVisible();
    const antes = await page.evaluate(() => window.history.length);

    const campo = page.getByLabel("Buscar por nome");
    await campo.click();
    for (const letra of "zacarias") await campo.press(letra);
    await expect.poll(() => parametro(page, "busca"), { timeout: 5_000 }).toBe("zacarias");

    const passos = (await page.evaluate(() => window.history.length)) - antes;
    expect(passos, `oito letras produziram ${passos} passos de histórico`).toBeLessThanOrEqual(1);
    await expect(grade(page)).toContainText(amostra.nomes.cmg);
  });

  test("a ficha abre por código, e código inexistente diz 'não há', não 'você não vê'", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores?om=${amostra.om}`);
    await grade(page).getByText(amostra.nomes.scns).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/instrutores/${amostra.codigos.scns}`);
    expect(page.url(), "a URL da ficha expôs um uuid").not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );

    await page.goto("/instrutores/CODIGO-QUE-NAO-EXISTE");
    const vazio = page.locator('[data-slot="estado-vazio"]');
    await expect(vazio).toHaveAttribute("data-motivo", "sem-dado");
    await expect(vazio).toContainText("não é falta de acesso");
  });

  test("3 indicadores, 9 gráficos com posto em antiguidade, lista em antiguidade e sem edição em linha", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores?om=${amostra.om}`);
    await expect(grade(page)).toBeVisible();

    // FR-026.5 · as estatísticas nascem recolhidas, como na v2.0, e abrir não mexe na URL.
    await expect(page.locator('[data-slot="card-kpi"]')).toHaveCount(0);
    const urlAntes = page.url();
    await page.getByRole("button", { name: "Exibir estatísticas" }).click();
    expect(page.url(), "abrir as estatísticas foi para a URL — é estado efêmero").toBe(urlAntes);

    await expect(
      page.locator('[data-slot="indicadores-de-instrutores"] [data-slot="card-kpi"]'),
    ).toHaveCount(3);
    await expect(page.locator('[data-slot="grafico-de-instrutores"]')).toHaveCount(9);
    await expect(
      page.locator('[data-slot="grafico-de-instrutores"][data-forma="barras"]'),
    ).toHaveCount(4);
    await expect(
      page.locator('[data-slot="grafico-de-instrutores"][data-forma="pizza"]'),
    ).toHaveCount(5);

    // Toda barra traz o valor escrito; o status de seleção pinta as duas barras com cores diferentes.
    const status = page.locator('[data-chave="status-de-selecao"]');
    await expect(status.locator('[data-slot="rotulo-da-barra"] text')).toHaveText(["2", "2"]);
    const cores = await status
      .locator(".recharts-bar-rectangle path")
      .evaluateAll((els) => els.map((e) => e.getAttribute("fill")));
    expect(new Set(cores).size, "habilitados e selecionados saíram na mesma cor").toBe(2);
    expect(
      cores.every((c) => /^var\(--serie-\d\)$/.test(c ?? "")),
      "cor fora do token",
    ).toBe(true);

    // A pizza escreve o percentual, e o índice de capacitação soma o recorte.
    await expect(
      page.locator('[data-chave="indice-capacitacao"] [data-slot="grafico-pizza"]'),
    ).toContainText("%");
    await page.getByRole("button", { name: "Ocultar estatísticas" }).click();
    await expect(page.locator('[data-slot="card-kpi"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Exibir estatísticas" }).click();

    const barrasDePosto = await page
      .locator('[data-slot="grafico-de-instrutores"][data-chave="posto-graduacao"]')
      .getAttribute("data-barras");
    expect(
      JSON.parse(barrasDePosto ?? "[]"),
      "as barras de posto não seguem a antiguidade",
    ).toEqual(["CMG", "CF", "CC", "CT", "1ºTen", "SO", "SC", "SCNS", "Outros"]);

    // FR-027.1 emendado · uma coluna "Instrutor", sem a de posto ao lado.
    const cabecalhos = await grade(page).locator("thead th").allInnerTexts();
    expect(cabecalhos.map((c) => c.split("\n")[0]?.trim())).toEqual([
      "Instrutor",
      "Categoria",
      "OM",
      "Regime",
      expect.stringMatching(/^CH \d{4} \(TA\)$/),
    ]);

    // A lista sem `ordem`: a amostra em antiguidade, com nomes que invertem a ordem alfabética.
    const texto = (await grade(page).innerText()).replace(/\s+/g, " ");
    const ordemEsperada = [
      amostra.nomes.cmg,
      amostra.nomes.comAula,
      amostra.nomes.semCapacitacao,
      amostra.nomes.ctMaisAntigo,
      amostra.nomes.ctMaisModerno,
      amostra.nomes.selecionadoSemHabilitacao,
      amostra.nomes.vinculado,
      amostra.nomes.scns,
      amostra.nomes.sc,
      amostra.nomes.foraDaEscala,
    ];
    const posicoes = ordemEsperada.map((nome) => texto.indexOf(nome));
    expect(
      posicoes.every((p) => p >= 0),
      "algum instrutor da amostra não apareceu",
    ).toBe(true);
    expect(posicoes, "a listagem não saiu em antiguidade").toEqual(
      [...posicoes].sort((a, b) => a - b),
    );

    await expect(page.locator('[data-slot="quadro-de-avisos"]')).toContainText("Instrutor sem NIP");

    await expect(
      grade(page).locator('input, select, textarea, [contenteditable="true"]'),
      "a listagem ganhou edição em linha — a spec 038 da v2.0 a removeu",
    ).toHaveCount(0);
  });
});

test.describe("`FR-022` e `FR-011` · painel de disciplinas, confirmação e a posição de desativar", () => {
  let amostra: AmostraDeInstrutores;

  test.beforeAll(async () => {
    amostra = await semearInstrutores(PROCESSO, "H");
  });

  test.afterAll(async () => {
    await limparInstrutores(PROCESSO, "H");
  });

  const vinculosDe = async (codigo: string) => {
    const { data: ins } = await servico()
      .from("instrutores")
      .select("id")
      .eq("codigo", codigo)
      .single();
    const { data } = await servico()
      .from("instrutor_disciplina")
      .select("codigo, status")
      .eq("instrutor_id", ins?.id as string);
    return data ?? [];
  };

  async function gravar(page: Page) {
    await page
      .locator('[data-slot="rodape-do-formulario"]')
      .getByRole("button", { name: "Gravar alterações", exact: true })
      .click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo, "gravar não pediu confirmação (FR-011)").toBeVisible();
    await dialogo.getByRole("button", { name: "Gravar", exact: true }).click();
    await expect(page.getByText("Alterações gravadas.")).toBeVisible({ timeout: 15_000 });
  }

  test("marcar grava o vínculo com código VIN, e desmarcar o inativa sem apagar", async ({
    page,
  }) => {
    const codigo = amostra.codigos.ctMaisModerno;
    const sigla = `CUR-${amostra.marcador}`;
    await entrar(page, EMAIL_ADMIN, `/instrutores/${codigo}`);

    const painel = page.locator('[data-slot="painel-de-disciplinas"]');
    await painel.getByLabel("Buscar disciplina ou sigla do curso").fill(sigla);
    const caixa = painel.getByRole("checkbox", { name: new RegExp(sigla) });
    await expect(caixa).toHaveCount(1);
    await caixa.check();
    await gravar(page);

    const depoisDeMarcar = await vinculosDe(codigo);
    expect(depoisDeMarcar).toHaveLength(1);
    expect(depoisDeMarcar[0]?.status).toBe("ativo");
    expect(depoisDeMarcar[0]?.codigo, "o vínculo novo não recebeu VIN-NNNNNN").toMatch(
      /^VIN-\d{6}$/,
    );

    await page.reload();
    await expect(page.locator('[data-slot="disciplinas-habilitadas"]')).toContainText(sigla);
    await painel.getByLabel("Buscar disciplina ou sigla do curso").fill(sigla);
    await expect(painel.getByRole("checkbox", { name: new RegExp(sigla) })).toBeChecked();

    await painel.getByRole("checkbox", { name: new RegExp(sigla) }).uncheck();
    await gravar(page);

    const depoisDeDesmarcar = await vinculosDe(codigo);
    expect(depoisDeDesmarcar, "desmarcar apagou o vínculo (RN-INST-05)").toHaveLength(1);
    expect(depoisDeDesmarcar[0]?.status).toBe("inativo");
  });

  test("Enter num campo, ou na busca do painel, não grava sem confirmação", async ({ page }) => {
    const codigo = amostra.codigos.scns;
    await entrar(page, EMAIL_ADMIN, `/instrutores/${codigo}`);

    const nomeDeGuerra = page.locator('input[name="nome_guerra"]');
    await nomeDeGuerra.fill("Zuleica");
    await nomeDeGuerra.press("Enter");
    await page
      .locator('[data-slot="painel-de-disciplinas"]')
      .getByLabel("Buscar disciplina ou sigla do curso")
      .press("Enter");

    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    const { data } = await servico()
      .from("instrutores")
      .select("nome_guerra")
      .eq("codigo", codigo)
      .single();
    expect(data?.nome_guerra, "Enter gravou sem passar pelo diálogo do FR-011").toBeNull();
  });

  test("desativar fica no fim da página, ao lado de gravar, e não no cabeçalho", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, `/instrutores/${amostra.codigos.cmg}`);
    const rodape = page.locator('[data-slot="rodape-do-formulario"]');
    await expect(rodape.getByRole("button", { name: "Gravar alterações" })).toBeVisible();
    await expect(rodape.getByRole("button", { name: "Desativar instrutor" })).toBeVisible();
    await expect(
      page.locator("header").getByRole("button", { name: "Desativar instrutor" }),
    ).toHaveCount(0);
  });
});

test.describe("`SC-006` · o alerta de faixa avisa, nomeia a semana e não bloqueia", () => {
  let amostra: AmostraDeInstrutores;

  test.beforeAll(async () => {
    amostra = await semearInstrutores(PROCESSO, "C", { comCargaPrevista: true });
  });

  test.afterAll(async () => {
    await limparInstrutores(PROCESSO, "C");
  });

  /**
   * Entra direto na ficha e só devolve quando ela está desenhada.
   *
   * ⚠️ O PRAZO É MEDIDO, NÃO CHUTADO (15/09/2026, base real carregada): a ficha leva 1,5 a 2,4 s com um
   * processo e 4,2 a 5,1 s com quatro — o prazo padrão do `expect` é 5 s. Quem domina é
   * `vw_instrutor_carga_anual`, ~700 ms sob RLS por agregar todos os registros antes de filtrar o
   * instrutor. Esta suíte abre quatro fichas ao mesmo tempo, e sem a espera reprovava três de quatro
   * casos com a página ainda em "Carregando a ficha do instrutor…". A lentidão da view fica registrada
   * como achado, e não é corrigida aqui.
   */
  async function abrirFicha(page: Page, codigo: string) {
    await entrar(page, EMAIL_ADMIN, `/instrutores/${codigo}`);
    await expect(
      page.locator('[data-slot="rodape-do-formulario"]'),
      "a ficha não terminou de desenhar",
    ).toBeVisible({ timeout: 15_000 });
  }

  test("20h com 14 horas por semana alerta nomeando as semanas, e gravar continua disponível", async ({
    page,
  }) => {
    await abrirFicha(page, amostra.codigos.ctMaisAntigo);
    const alerta = page
      .locator('[data-slot="alerta-conformidade"]')
      .filter({ hasText: "Carga semanal prevista fora da faixa do regime" });
    await expect(alerta).toBeVisible();
    await expect(
      alerta.getByText(
        /^Semana \d+\/\d{4} \(\d{2}\/\d{2} a \d{2}\/\d{2}\): 14 h, acima da faixa de 8 a 12 h\.$/,
      ),
    ).toHaveCount(4);

    // FR-018 · o alerta não condiciona nada: gravar continua habilitado, e desativar também.
    const rodape = page.locator('[data-slot="rodape-do-formulario"]');
    await expect(rodape.getByRole("button", { name: "Gravar alterações" })).toBeEnabled();
    await expect(rodape.getByRole("button", { name: "Desativar instrutor" })).toBeEnabled();
  });

  test("`RN-INST-03` emendado · militar sem especialidade salva a própria ficha, e o campo segue nulo", async ({
    page,
  }) => {
    // O defeito dos 15 instrutores da base real: sem sufixo de especialidade, a ficha não salvava.
    const codigo = amostra.codigos.cmg;
    await servico().from("instrutores").update({ esp_hab_obs: null }).eq("codigo", codigo);

    await abrirFicha(page, codigo);
    await expect(page.locator('input[name="esp_hab_obs"]')).toHaveValue("");
    await page
      .locator('[data-slot="rodape-do-formulario"]')
      .getByRole("button", { name: "Gravar alterações", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Gravar", exact: true })
      .click();
    await expect(
      page.getByText("Alterações gravadas."),
      "a ficha sem especialidade continua sem salvar",
    ).toBeVisible({ timeout: 15_000 });

    const { data } = await servico()
      .from("instrutores")
      .select("esp_hab_obs, editado_em")
      .eq("codigo", codigo)
      .single();
    expect(data?.esp_hab_obs).toBeNull();
    expect(data?.editado_em, "a gravação não chegou ao banco").not.toBeNull();
  });

  test("`FR-017` · docência há mais de um ano sem capacitação alerta, e quem tem capacitação não", async ({
    page,
  }) => {
    const titulo = "Docência há mais de um ano sem capacitação didática";
    await abrirFicha(page, amostra.codigos.semCapacitacao);
    const alerta = page.locator('[data-slot="alerta-conformidade"]').filter({ hasText: titulo });
    await expect(alerta).toBeVisible();
    await expect(
      alerta.getByText(
        "Em docência no CIAARA desde 01/03/2021, sem capacitação didática registrada.",
      ),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-slot="rodape-do-formulario"]')
        .getByRole("button", { name: "Gravar alterações" }),
    ).toBeEnabled();

    await abrirFicha(page, amostra.codigos.comAula);
    await expect(
      page.locator('[data-slot="alerta-conformidade"]').filter({ hasText: titulo }),
    ).toHaveCount(0);
  });

  test("40h com 20 horas por semana está dentro da faixa, e não alerta", async ({ page }) => {
    await abrirFicha(page, amostra.codigos.ctMaisModerno);
    await expect(page.locator('[data-slot="carga-prevista"]')).toHaveText("80 TA");
    await expect(
      page
        .locator('[data-slot="alerta-conformidade"]')
        .filter({ hasText: "Carga semanal prevista fora da faixa do regime" }),
    ).toHaveCount(0);
  });
});
