/**
 * Administração → **Tipos de atividade** (Bloco 18, spec 033, RA-1, FR-001.1, FR-001.3 e FR-001.4), por clique.
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita) (…) Cada tipo tem classificação PADRÃO
 * > (AEC/TAD/TR), que o operador pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **O CATÁLOGO É ESTADO COMPARTILHADO** por todos os arquivos que lançam no DSA (`config_listas`, lista
 *    `tipos_atividade`): o tipo deste percurso leva o número do PROCESSO e uma marca da EXECUÇÃO no nome, termina o
 *    percurso DESATIVADO (fora da escolha do lançamento) e sai no `afterAll`. É a regra de `dsa-de-teste.ts`: *amostra
 *    apaga o que carrega o número do processo; vocabulário compartilhado, não* — os tipos de verdade ficam intocados.
 * ⚠️ **CHEGA-SE À TELA CLICANDO** (menu → Administração → aba *Tipos de atividade*): `goto` só para o ponto de partida.
 * ⚠️ **A LINHA NO BANCO É CONFERIDA PELO CLIENTE DE SERVIÇO** — o campo da tela pode mostrar o que foi digitado sem que
 *    nada tenha sido gravado (`PEND-016-2`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

let EMAIL_ADMIN = "";
let EMAIL_AJUDANTE = "";
/** O prefixo de todo tipo que este PROCESSO cria — a limpeza apaga por ele, inclusive o resto de execução anterior. */
let PREFIXO = "";
/** O tipo deste percurso: o número do processo e a marca da execução (o `UNIQUE (lista, valor)` morde). */
let TIPO = "";
let TIPO_EDITADO = "";

async function limparTiposDoProcesso(): Promise<void> {
  const { error } = await banco()
    .from("config_listas")
    .delete()
    .eq("lista", "tipos_atividade")
    /* `ilike`: o caso do nome repetido tenta o mesmo nome em CAIXA ALTA, e um defeito o deixaria gravado. */
    .ilike("valor", `${PREFIXO}%`);
  if (error) throw new Error(`não consegui limpar os tipos do percurso: ${error.message}`);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("tipos-de-atividade-admin", p);
  EMAIL_AJUDANTE = emailDeTeste("tipos-de-atividade-ajudante", p);
  PREFIXO = `Tipo de percurso ${p} `;
  TIPO = `${PREFIXO}${Date.now().toString(36)}`;
  TIPO_EDITADO = `${TIPO} editado`;

  await criarConta(EMAIL_ADMIN, `USR-TAT-ADM-${p}`);
  await criarConta(EMAIL_AJUDANTE, `USR-TAT-AJU-${p}`, "ajudante_administracao_academica");
  await limparTiposDoProcesso();
});

test.afterAll(async () => {
  await limparTiposDoProcesso();
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_AJUDANTE);
});

const linhaDoTipo = (page: Page, valor: string) => page.locator(`tr[data-tipo="${valor}"]`);
const dialogoDoTipo = (page: Page) => page.locator('[data-slot="dialogo-do-tipo-de-atividade"]');
const confirmacao = (page: Page) => page.locator('[data-slot="dialogo-confirmacao"]');

async function linhaNoBanco(valor: string) {
  const { data, error } = await banco()
    .from("config_listas")
    .select("valor, rotulo_exibicao, ativo, metadados, criado_por, editado_por")
    .eq("lista", "tipos_atividade")
    .eq("valor", valor)
    .maybeSingle();
  if (error) throw new Error(`não consegui ler o tipo no banco: ${error.message}`);
  return data as {
    valor: string;
    rotulo_exibicao: string | null;
    ativo: boolean;
    metadados: { categoria?: string } | null;
    criado_por: string | null;
    editado_por: string | null;
  } | null;
}

/** Menu → Administração → aba *Tipos de atividade*, por clique. */
async function irAoCatalogo(page: Page, email: string): Promise<void> {
  await entrar(page, email, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Administração", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/usuarios");
  await page
    .getByRole("navigation", { name: "Administração" })
    .getByRole("link", { name: "Tipos de atividade", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/tipos-de-atividade");
  await expect(page.locator('[data-slot="tabela-de-tipos-de-atividade"]')).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("RA-1 · o catálogo, por clique a partir do menu", () => {
  test("Administração → Tipos de atividade: o rótulo «Atividade Extraclasse», com a chave gravada ao lado", async ({
    page,
  }) => {
    await irAoCatalogo(page, EMAIL_ADMIN);
    /* A aba marcada é a do catálogo, e o menu segue marcando a Administração (`ativaSob: "/admin"`). */
    await expect(
      page.getByRole("navigation", { name: "Administração" }).locator('[aria-current="page"]'),
    ).toHaveText("Tipos de atividade");
    await expect(
      page
        .getByRole("navigation", { name: "Navegação principal" })
        .locator('[aria-current="page"]'),
    ).toHaveAttribute("data-entrada", "/admin/usuarios");

    /*
     * ⚠️ DECISÃO 4: só o RÓTULO mudou. A chave («Atividade Extracurricular») é o que o gatilho, a sincronização e o ETL
     *    casam, e a tela a mostra para quem edita saber que ela fica.
     */
    const extraclasse = linhaDoTipo(page, "Atividade Extracurricular");
    await expect(extraclasse.locator('[data-slot="rotulo-do-tipo"]')).toHaveText(
      "Atividade Extraclasse",
    );
    await expect(extraclasse.locator('[data-slot="chave-do-tipo"]')).toContainText(
      "Atividade Extracurricular",
    );
    await expect(extraclasse).toHaveAttribute("data-classificacao", "AEC");

    /* FR-001.1: os quatro tipos novos entraram, cada um com a sua classificação padrão. */
    for (const [valor, classificacao] of [
      ["Desportiva", "AEC"],
      ["DeCAT", "TR"],
      ["Reforço", "TR"],
      ["Outra", "AEC"],
    ] as const) {
      await expect(linhaDoTipo(page, valor)).toHaveAttribute("data-classificacao", classificacao);
    }

    /* Os de aula não são atividade e não aparecem. */
    await expect(linhaDoTipo(page, "Aula")).toHaveCount(0);
    await expect(linhaDoTipo(page, "Vista de Prova")).toHaveCount(0);

    /* ⚠️ DECISÃO 2: Monitoria (Apoio Individualizado) aparece SÓ PARA LER — sem Editar, sem Desativar. */
    const monitoria = linhaDoTipo(page, "Monitoria");
    await expect(monitoria.locator('[data-slot="tipo-so-leitura"]')).toBeVisible();
    await expect(monitoria.locator('[data-slot="editar-tipo-de-atividade"]')).toHaveCount(0);
    await expect(monitoria.locator('[data-slot="desativar-tipo-de-atividade"]')).toHaveCount(0);
  });
});

test.describe("FR-001.3 · Novo tipo, Editar e Desativar — e a linha no banco", () => {
  /* ⚠️ SERIAL: cada caso parte do que o anterior gravou (o mesmo tipo). */
  test.describe.configure({ mode: "serial" });

  test("Novo tipo: a classificação abre SEM padrão, e o tipo nasce ativo com a chave igual ao rótulo", async ({
    page,
  }) => {
    await irAoCatalogo(page, EMAIL_ADMIN);
    await page.locator('[data-slot="novo-tipo-de-atividade"]').click();
    await expect(dialogoDoTipo(page)).toBeVisible();

    /* ⚠️ Um padrão silencioso gravaria escolha que ninguém fez. */
    await expect(page.locator("#tipo-novo-classificacao")).toHaveValue("");

    /*
     * Sem classificação, nada é gravado: o campo é obrigatório (o navegador segura o envio) e, se chegasse, o esquema
     * recusaria («Escolha a classificação padrão»). O diálogo continua aberto.
     */
    await page.locator("#tipo-novo-nome").fill(TIPO);
    await page.locator('[data-slot="gravar-tipo-de-atividade"]').click();
    await expect(dialogoDoTipo(page)).toBeVisible();
    expect(await linhaNoBanco(TIPO)).toBeNull();

    await page.locator("#tipo-novo-classificacao").selectOption("TAD");
    await page.locator('[data-slot="gravar-tipo-de-atividade"]').click();
    await expect(dialogoDoTipo(page)).toHaveCount(0, { timeout: 15_000 });

    const linha = linhaDoTipo(page, TIPO);
    await expect(linha).toBeVisible({ timeout: 15_000 });
    await expect(linha).toHaveAttribute("data-classificacao", "TAD");
    await expect(linha).toHaveAttribute("data-ativo", "true");
    await expect(linha.locator('[data-slot="situacao-do-tipo"]')).toHaveText("ativo");
    await expect(linha.locator('[data-slot="lancamentos-do-tipo"]')).toHaveAttribute(
      "data-quantidade",
      "0",
    );
    /* A chave é o próprio nome: não há «chave gravada» ao lado. */
    await expect(linha.locator('[data-slot="chave-do-tipo"]')).toHaveCount(0);

    /* ⚠️ FR-001.4: Excluir indisponível, com o motivo — sem lançamento, não há exceção à regra 4. */
    const excluir = linha.locator('[data-slot="excluir-tipo-de-atividade"]');
    await expect(excluir).toHaveAttribute("data-indisponivel", "sim");
    await expect(excluir).toHaveAttribute("aria-label", /sem exceção à regra 4: use Desativar/);

    const gravada = await linhaNoBanco(TIPO);
    expect(gravada?.rotulo_exibicao).toBe(TIPO);
    expect(gravada?.ativo).toBe(true);
    expect(gravada?.metadados).toEqual({ categoria: "TAD" });
    /* Gravado pela sessão do Admin: o gatilho de auditoria carimbou o autor. */
    expect(gravada?.criado_por).not.toBeNull();
  });

  test("o nome repetido (sem caixa, sem acento) é recusado com a frase do catálogo", async ({
    page,
  }) => {
    await irAoCatalogo(page, EMAIL_ADMIN);
    await page.locator('[data-slot="novo-tipo-de-atividade"]').click();
    await page.locator("#tipo-novo-nome").fill(TIPO.toUpperCase());
    await page.locator("#tipo-novo-classificacao").selectOption("AEC");
    await page.locator('[data-slot="gravar-tipo-de-atividade"]').click();
    await expect(
      dialogoDoTipo(page).locator('[data-slot="erro-do-tipo-de-atividade"]'),
    ).toContainText("Já existe o tipo");
    expect(await linhaNoBanco(TIPO.toUpperCase())).toBeNull();
  });

  test("Editar: muda o rótulo e a classificação, diz quantos lançamentos mudam, e a chave FICA", async ({
    page,
  }) => {
    await irAoCatalogo(page, EMAIL_ADMIN);
    const linha = linhaDoTipo(page, TIPO);
    await linha.locator('[data-slot="editar-tipo-de-atividade"]').click();
    const dialogo = dialogoDoTipo(page);
    await expect(dialogo).toBeVisible();
    /* A chave não é campo: o diálogo só a cita. */
    await expect(dialogo).toContainText(`a chave gravada («${TIPO}») fica`);

    await dialogo.locator('input[name="rotulo"]').fill(TIPO_EDITADO);
    const efeito = dialogo.locator('[data-slot="efeito-da-classificacao"]');
    await expect(efeito).toHaveText("A classificação não muda: nenhum lançamento é tocado.");
    await dialogo.locator('select[name="classificacao"]').selectOption("TR");
    /* ⚠️ FR-001.3: o número ANTES de gravar — este tipo não tem lançamento. */
    await expect(efeito).toHaveText(
      "Nenhum lançamento muda de categoria: este tipo não tem lançamento ativo.",
    );
    await dialogo.locator('[data-slot="gravar-tipo-de-atividade"]').click();
    await expect(dialogo).toHaveCount(0, { timeout: 15_000 });

    /* A linha é a mesma (a chave não mudou), com o rótulo novo e a chave ao lado. */
    await expect(linha.locator('[data-slot="rotulo-do-tipo"]')).toHaveText(TIPO_EDITADO, {
      timeout: 15_000,
    });
    await expect(linha.locator('[data-slot="chave-do-tipo"]')).toContainText(TIPO);
    await expect(linha).toHaveAttribute("data-classificacao", "TR");

    const gravada = await linhaNoBanco(TIPO);
    expect(gravada?.valor).toBe(TIPO);
    expect(gravada?.rotulo_exibicao).toBe(TIPO_EDITADO);
    expect(gravada?.metadados).toEqual({ categoria: "TR" });
    expect(gravada?.editado_por).not.toBeNull();
  });

  test("Desativar confirma; Reativar não; e o tipo termina DESATIVADO (o catálogo é compartilhado)", async ({
    page,
  }) => {
    await irAoCatalogo(page, EMAIL_ADMIN);
    const linha = linhaDoTipo(page, TIPO);

    await linha.locator('[data-slot="desativar-tipo-de-atividade"]').click();
    await expect(confirmacao(page)).toBeVisible();
    await expect(confirmacao(page)).toContainText("sai da escolha no lançamento do DSA");
    await expect(confirmacao(page)).toContainText("Nenhum lançamento ativo o usa.");
    await confirmacao(page).getByRole("button", { name: "Desativar" }).click();
    await expect(linha).toHaveAttribute("data-ativo", "false", { timeout: 15_000 });
    await expect(linha.locator('[data-slot="situacao-do-tipo"]')).toHaveText("desativado");
    /* ⚠️ Desativar não é sumir (regra 4): a linha continua na lista, agora com Reativar. */
    await expect(linha.locator('[data-slot="reativar-tipo-de-atividade"]')).toHaveCount(1);
    await expect(linha.locator('[data-slot="desativar-tipo-de-atividade"]')).toHaveCount(0);
    expect((await linhaNoBanco(TIPO))?.ativo).toBe(false);

    /* Reativar não confirma: não alcança o passado de ninguém. */
    await linha.locator('[data-slot="reativar-tipo-de-atividade"]').click();
    await expect(linha).toHaveAttribute("data-ativo", "true", { timeout: 15_000 });
    await expect(confirmacao(page)).toHaveCount(0);
    expect((await linhaNoBanco(TIPO))?.ativo).toBe(true);

    /* E de volta a desativado: o tipo do percurso não fica oferecido no DSA de ninguém. */
    await linha.locator('[data-slot="desativar-tipo-de-atividade"]').click();
    await confirmacao(page).getByRole("button", { name: "Desativar" }).click();
    await expect(linha).toHaveAttribute("data-ativo", "false", { timeout: 15_000 });
    expect((await linhaNoBanco(TIPO))?.ativo).toBe(false);
  });
});

test.describe("D-6 · quem não administra parâmetro lê o catálogo, e só", () => {
  test("⚠️ o Ajudante vê a lista e NÃO recebe Novo tipo nem ação de linha", async ({ page }) => {
    await irAoCatalogo(page, EMAIL_AJUDANTE);
    await expect(linhaDoTipo(page, "Palestra")).toBeVisible();
    /*
     * ⚠️ ESCONDER É CONFORTO, NÃO PROTEÇÃO: quem recusa é a policy de `config_listas` (`parametros.*`). Este caso mede
     *    que a tela não oferece o que o banco vai negar.
     */
    await expect(page.locator('[data-slot="novo-tipo-de-atividade"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="editar-tipo-de-atividade"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="desativar-tipo-de-atividade"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="reativar-tipo-de-atividade"]')).toHaveCount(0);
  });
});
