/**
 * Os cadastros novos do Bloco 5 — spec 020: estrangeiros e custo do curso, o currículo em PDF, a capacitação didática
 * em lista fechada e a contagem de acessos. **Por clique**, a partir do ponto de partida, e **conferidos no banco**.
 *
 * ⚠️ **O PDF DE 5 MB É O CASO QUE DISCRIMINA O CAMINHO DO ARQUIVO** (C-5, gotcha 14): a Server Action corta o corpo
 *    em 3 MB (`next.config.ts`) e a Vercel em 4,5 MB. Um envio que passasse por ela recusaria este arquivo; ele só
 *    chega ao balde porque sobe do navegador direto ao Storage.
 * ⚠️ **O CURSO DA AMOSTRA NÃO É APAGÁVEL** (regra 9.1): ele é reaproveitado, e os campos novos voltam a nulo no
 *    começo — é o que faz a segunda execução seguida passar pelo mesmo caminho.
 */
import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { bancoDoBloco2 } from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirPainel } from "./paineis";
import { abrirPainelDeFiltros } from "./filtros";
import {
  irAoCursoPorClique,
  justificarSePedir,
  abrirAbaDoCurriculoNaEdicao,
} from "./navegar-curso";
import { abrirEdicaoDoInstrutor } from "./navegar-instrutores";

const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

let SIGLA = "";
let CURSO_ID = "";
let CURRICULO_ID = "";
let EMAIL = "";
let OM = "";
let INSTRUTOR_A = "";
let INSTRUTOR_B = "";

/** Um PDF mínimo, com um marcador para reconhecer o arquivo baixado, e enchimento até `tamanho` bytes. */
function pdf(marcador: string, tamanho = 0): Buffer {
  const inicio = Buffer.from(`%PDF-1.4\n% ${marcador}\n`);
  const fim = Buffer.from("\n%%EOF\n");
  const enchimento = Math.max(0, tamanho - inicio.length - fim.length);
  return Buffer.concat([inicio, Buffer.alloc(enchimento, 0x20), fim]);
}

async function cursoNoBanco() {
  const { data, error } = await bancoDoBloco2()
    .from("cursos")
    .select(
      "ofertavel_estrangeiros, estrangeiros_observacao, custo_total, custo_composicao, curriculos:curriculos!curriculos_curso_id_fkey(pdf_carregado_em)",
    )
    .eq("id", CURSO_ID)
    .single();
  if (error) throw new Error(error.message);
  const linha = data as unknown as {
    ofertavel_estrangeiros: boolean | null;
    estrangeiros_observacao: string | null;
    custo_total: number | null;
    custo_composicao: string | null;
    curriculos: { pdf_carregado_em: string | null }[];
  };
  /* Spec 021 (Bloco 6, RC-11): a data do PDF é do CURRÍCULO (o único do curso da amostra). */
  return { ...linha, curriculo_pdf_em: linha.curriculos[0]?.pdf_carregado_em ?? null };
}

/** Da tela em que se está até a página do curso, pelo menu e pelo cartão — por clique. */
async function cursoPeloMenu(page: Page): Promise<void> {
  await MENU(page).getByRole("link", { name: "Cursos", exact: true }).click();
  const cartao = page.locator(
    `[data-slot="cartao-de-curso"][href="/cursos/${encodeURIComponent(SIGLA)}"]`,
  );
  await cartao.scrollIntoViewIfNeeded();
  await cartao.click();
  await expect(page.locator('[data-slot="abas-do-curso"]')).toBeVisible();
}

/** *Sobre o Curso* é a aba PADRÃO: clicar nela não põe `?aba=` na URL — espera-se o painel, não o endereço. */
async function abrirSobre(page: Page): Promise<void> {
  await page.locator('[data-slot="abas-do-curso"] [role="tab"][data-aba="sobre"]').click();
  await expect(page.locator('[role="tabpanel"]#painel-sobre')).toBeVisible();
}

/**
 * Os PDFs do currículo 1 da amostra. ⚠️ Spec 021 (RC-11, D-29): cada envio é um ARQUIVO NOVO na pasta do currículo
 * (`<curso>/<currículo>/<instante>.pdf`), e o anterior fica (regra 4) — a lista cresce, não se sobrescreve.
 */
async function objetosDoCurriculo(): Promise<string[]> {
  const { data, error } = await bancoDoBloco2()
    .storage.from("curriculos")
    .list(`${CURSO_ID}/${CURRICULO_ID}`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => o.name).filter((n) => n.endsWith(".pdf"));
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  const banco = bancoDoBloco2();
  SIGLA = `CUR-B5-${p}`;
  EMAIL = emailDeTeste("bloco5-adm", p);
  OM = `OM-B5-${p}`;
  INSTRUTOR_A = `B5CAP-${p}-A`;
  INSTRUTOR_B = `B5CAP-${p}-B`;

  /* O curso: reaproveitado (regra 9.1), ativo, e com os campos do Bloco 5 de volta a nulo. */
  const { data: existe } = await banco
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (!existe) {
    const { error } = await banco.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso do Bloco 5 ${p}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 120,
      },
      p_regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    if (error) throw new Error(`curso ${SIGLA}: ${error.message}`);
  }
  const { data: curso } = await banco.from("cursos").select("id").eq("codigo", SIGLA).single();
  CURSO_ID = (curso as { id: string }).id;
  const { data: curriculo } = await banco
    .from("curriculos")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("versao", 1)
    .single();
  CURRICULO_ID = (curriculo as { id: string }).id;
  const { error: erroReset } = await banco
    .from("cursos")
    .update({
      status: "ativo",
      ofertavel_estrangeiros: null,
      estrangeiros_observacao: null,
      custo_total: null,
      custo_composicao: null,
    })
    .eq("id", CURSO_ID);
  if (erroReset) throw new Error(erroReset.message);
  /* Spec 021 (Bloco 6, RC-11): o PDF é do CURRÍCULO — a amostra começa sem nenhum. */
  const { error: erroDoPdf } = await banco
    .from("curriculos")
    .update({ pdf_carregado_em: null, pdf_caminho: null })
    .eq("curso_id", CURSO_ID);
  if (erroDoPdf) throw new Error(erroDoPdf.message);
  await banco.storage.from("curriculos").remove([`${CURSO_ID}/curriculo.pdf`]);
  const anteriores = await objetosDoCurriculo();
  if (anteriores.length > 0) {
    await banco.storage
      .from("curriculos")
      .remove(anteriores.map((n) => `${CURSO_ID}/${CURRICULO_ID}/${n}`));
  }

  /* Dois instrutores: um com texto que não casou (o texto antigo também, para provar que fica intocado). */
  await banco.from("instrutores").delete().eq("om", OM);
  const { error: erroInstrutores } = await banco.from("instrutores").insert([
    {
      codigo: INSTRUTOR_A,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor Bloco Cinco A ${p}`,
      categoria: "Militar",
      om: OM,
      status: "ativo",
      capacitacao_didatica: "Pedagogia",
      capacitacoes_didaticas: [],
      capacitacao_didatica_a_corrigir: "Pedagogia",
    },
    {
      codigo: INSTRUTOR_B,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor Bloco Cinco B ${p}`,
      categoria: "Militar",
      om: OM,
      status: "ativo",
      capacitacoes_didaticas: ["C-Exp-TE"],
    },
  ]);
  if (erroInstrutores) throw new Error(`instrutores: ${erroInstrutores.message}`);

  await criarConta(EMAIL, `USR-B5E-${p}`, "admin");
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
  await bancoDoBloco2().from("instrutores").delete().eq("om", OM);
});

test.describe("spec 020 · os cadastros novos", () => {
  test("C-1 a C-4 · estrangeiros e custo: Editar curso → banco → Sobre o Curso → filtro do catálogo", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await page.locator('[data-slot="ir-para-editar-curso"]').first().click();
    const bloco = page.locator('[data-slot="grupo-oferta-e-custo"]');
    await expect(bloco).toBeVisible();

    /* Custo que não é valor em reais: a tela recusa com a frase do campo, e o banco não recebe nada. */
    await page.locator("#curso-custo-total").fill("doze mil");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.locator('[data-slot="erro-do-formulario"]')).toContainText("Custo total");
    expect((await cursoNoBanco()).custo_total).toBeNull();

    await page.locator('select[name="ofertavel_estrangeiros"]').selectOption("sim");
    await page.locator("#curso-estrangeiros-observacao").fill("Aceita alunos de marinhas amigas");
    await page.locator("#curso-custo-total").fill("12.345,67");
    await page.locator("#curso-custo-composicao").fill("Diárias e material didático");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.locator('[data-slot="abas-do-curso"]')).toBeVisible();

    expect(await cursoNoBanco()).toMatchObject({
      ofertavel_estrangeiros: true,
      estrangeiros_observacao: "Aceita alunos de marinhas amigas",
      custo_total: 12345.67,
      custo_composicao: "Diárias e material didático",
    });

    await abrirSobre(page);
    const cadastro = page.locator('[data-slot="cadastro-do-bloco-5"]');
    await expect(cadastro).toContainText("Ofertável a estrangeiros: Sim");
    await expect(cadastro).toContainText("R$ 12.345,67");
    await expect(cadastro).toContainText("Diárias e material didático");
    await expect(page.locator('[data-slot="curriculo-do-curso"]')).toContainText(
      "Currículo ainda não carregado.",
    );

    /* O catálogo: «Ofertável» mostra o curso; «Não informado» não. */
    await MENU(page).getByRole("link", { name: "Cursos", exact: true }).click();
    const cartao = page.locator(
      `[data-slot="cartao-de-curso"][href="/cursos/${encodeURIComponent(SIGLA)}"]`,
    );
    await expect(cartao).toBeVisible();
    await abrirPainelDeFiltros(page);
    await page.getByRole("combobox", { name: "Estrangeiros", exact: true }).click();
    await page.getByRole("option", { name: "Ofertável", exact: true }).click();
    await expect(page).toHaveURL(/[?&]estrangeiros=sim(&|$)/);
    await expect(cartao).toBeVisible();
    await page.getByRole("combobox", { name: "Estrangeiros", exact: true }).click();
    await page.getByRole("option", { name: "Não informado", exact: true }).click();
    await expect(page).toHaveURL(/[?&]estrangeiros=nao_informado(&|$)/);
    await expect(cartao).toHaveCount(0);
  });

  test("C-5 a C-8 · currículo: carregar 5 MB pela janela de arquivo, baixar em Sobre o Curso, substituir (RC-11)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    /*
     * Spec 021 (RC-11; ajuste 3 da conferência do PR #82): o PDF é do currículo — carrega-se em *Editar curso*, na seção
     * *Currículo*, parte *Dados e PDF* (a padrão), no currículo escolhido (o vigente).
     */
    await page.locator('[data-slot="ir-para-editar-curso"]').click();
    // Spec 025 (D-28): o PDF mora no alto da aba *Currículo* de *Editar curso*.
    await abrirAbaDoCurriculoNaEdicao(page);
    const envio = page.locator('[data-slot="envio-do-curriculo"]');
    await expect(envio).toContainText("Nenhum currículo carregado.");

    /* Não-PDF: a tela recusa antes de enviar, e o balde segue vazio. */
    {
      const [janela] = await Promise.all([
        page.waitForEvent("filechooser"),
        envio.locator('[data-slot="carregar-curriculo"]').click(),
      ]);
      await janela.setFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("x") });
      await expect(envio.locator('[data-slot="aviso-do-curriculo"]')).toContainText("só PDF");
      expect(await objetosDoCurriculo()).toEqual([]);
    }

    /* 5 MB: acima dos 3 MB da Server Action — só passa porque vai do navegador direto ao balde. */
    {
      const [janela] = await Promise.all([
        page.waitForEvent("filechooser"),
        envio.locator('[data-slot="carregar-curriculo"]').click(),
      ]);
      await janela.setFiles({
        name: "curriculo.pdf",
        mimeType: "application/pdf",
        buffer: pdf("primeira-versao", 5 * 1024 * 1024),
      });
      await expect(envio.locator('[data-slot="aviso-do-curriculo"]')).toHaveText(
        "Currículo carregado.",
        { timeout: 30_000 },
      );
    }
    const primeiro = await objetosDoCurriculo();
    expect(primeiro).toHaveLength(1);
    expect((await cursoNoBanco()).curriculo_pdf_em).not.toBeNull();
    // Spec 022 (Bloco 7): o botão é ícone — o verbo está no nome acessível (e na dica).
    await expect(envio.locator('[data-slot="carregar-curriculo"]')).toHaveAccessibleName(
      "Substituir PDF",
    );

    /* Baixar pela aba Sobre o Curso. */
    await cursoPeloMenu(page);
    await abrirSobre(page);
    const baixar = async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator('[data-slot="baixar-curriculo"]').click(),
      ]);
      expect(download.suggestedFilename()).toBe(`Curriculo ${SIGLA}.pdf`);
      return readFileSync((await download.path()) as string, "latin1");
    };
    expect(await baixar()).toContain("primeira-versao");

    /*
     * Substituir aponta o currículo para um ARQUIVO NOVO (D-29): o anterior fica no balde (regra 4, sem `DELETE`), e o
     * baixado é o novo.
     */
    await page.locator('[data-slot="ir-para-editar-curso"]').click();
    await abrirAbaDoCurriculoNaEdicao(page);
    {
      const [janela] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.locator('[data-slot="carregar-curriculo"]').click(),
      ]);
      await janela.setFiles({
        name: "curriculo-novo.pdf",
        mimeType: "application/pdf",
        buffer: pdf("segunda-versao"),
      });
      /*
       * RC-6: substituir o PDF do currículo EM USO é correção. "Em uso" depende da ordem dos arquivos (a atividade global
       * de outra amostra conta), então a justificativa se responde quando for pedida.
       */
      const carregado = page
        .locator('[data-slot="aviso-do-curriculo"]')
        .filter({ hasText: "Currículo carregado." });
      await justificarSePedir(page, "O currículo em PDF foi substituído.", carregado);
      await expect(page.locator('[data-slot="aviso-do-curriculo"]')).toHaveText(
        "Currículo carregado.",
      );
    }
    const depois = await objetosDoCurriculo();
    expect(depois).toHaveLength(2);
    expect(depois).toEqual(expect.arrayContaining(primeiro));
    await cursoPeloMenu(page);
    await abrirSobre(page);
    expect(await baixar()).toContain("segunda-versao");
  });

  test("C-9 a C-12 · capacitação: o aviso do texto que não casou, a correção à mão e o filtro", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const banco = bancoDoBloco2();
    await entrar(page, EMAIL, `/instrutores?busca=${encodeURIComponent("Bloco Cinco")}`);
    await page.locator(`a[href="/instrutores/${INSTRUTOR_A}"]`).click();

    const aviso = page.locator('[data-slot="capacitacao-a-corrigir"]');
    await expect(aviso).toContainText("Capacitação a corrigir: «Pedagogia»");

    await abrirEdicaoDoInstrutor(page);
    await page.locator('input[name="capacitacoes_didaticas"][value="C-Esp-DID"]').check();
    await page.locator("#capacitacao_didatica_a_corrigir").fill("");
    await page.getByRole("button", { name: "Gravar alterações", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Gravar", exact: true })
      .click();
    await expect(page.getByText("Alterações gravadas.")).toBeVisible({ timeout: 15_000 });

    const { data } = await banco
      .from("instrutores")
      .select("capacitacoes_didaticas, capacitacao_didatica_a_corrigir, capacitacao_didatica")
      .eq("codigo", INSTRUTOR_A)
      .single();
    expect(data).toEqual({
      capacitacoes_didaticas: ["C-Esp-DID"],
      capacitacao_didatica_a_corrigir: null,
      // C-10: o texto antigo fica como foi escrito — nenhuma tela o grava.
      capacitacao_didatica: "Pedagogia",
    });
    await page.reload();
    await expect(aviso).toHaveCount(0);

    /* O filtro da lista: C-Esp-DID traz o A, e não o B (que tem só C-Exp-TE). */
    await MENU(page).getByRole("link", { name: "Instrutores", exact: true }).click();
    await abrirPainelDeFiltros(page);
    await page.getByLabel("Buscar por nome").fill("Bloco Cinco");
    await page.getByRole("combobox", { name: "Capacitação didática", exact: true }).click();
    await page.getByRole("option", { name: "C-Esp-DID", exact: true }).click();
    await expect(page).toHaveURL(/[?&]capacitacao=C-Esp-DID(&|$)/);
    await expect(page.locator(`a[href="/instrutores/${INSTRUTOR_A}"]`)).toBeVisible();
    await expect(page.locator(`a[href="/instrutores/${INSTRUTOR_B}"]`)).toHaveCount(0);
  });

  test("C-13 a C-15 · acessos: entrar grava um acesso, e o Admin vê a coluna e o quadro", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const banco = bancoDoBloco2();
    const { data: conta } = await banco.from("usuarios").select("id").eq("email", EMAIL).single();
    const id = (conta as { id: string }).id;
    const acessos = async () => {
      const { count, error } = await banco
        .from("acessos_de_conta")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", id);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const antes = await acessos();

    await entrar(page, EMAIL, "/inicio");
    await expect.poll(acessos, { message: "entrar não gravou o acesso" }).toBe(antes + 1);

    await MENU(page).getByRole("link", { name: "Administração", exact: true }).click();
    const linha = page.locator("tr").filter({ hasText: EMAIL });
    await expect(linha.locator('[data-slot="acessos-da-conta"]')).toHaveText(String(antes + 1));
    // Spec 025 (RT-4, D-19): o quadro é a estatística da tela, no painel do ícone *Estatísticas*.
    await abrirPainel(page, "estatisticas");
    const quadro = page.locator('[data-slot="quadro-de-acessos"]');
    await expect(quadro).toContainText("Acessos ao sistema");
    await expect(quadro).toContainText(/contados desde \d{2}\/\d{2}\/\d{4}/);
    await expect(quadro.locator('[data-slot="quem-mais-acessou"] tbody tr').first()).toBeVisible();
    await expect(quadro.locator('[data-slot="acessos-recentes"] tbody tr').first()).toBeVisible();
  });
});
