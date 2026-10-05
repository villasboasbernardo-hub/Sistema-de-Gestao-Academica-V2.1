/**
 * A lista de turmas, **por clique** (`FR-012` a `FR-017`, `FR-022`, `SC-002` da spec 012).
 *
 * ⚠️ **O QUE ESTA SUÍTE MEDE É QUE A TURMA PASSOU A TER LUGAR.** Até 04/10/2026 ela existia só como
 * **parâmetro** de outras telas, e a ficha `/turmas/[turma]` — de pé desde a fatia (a) do Épico 5 —
 * só se alcançava **por dentro do curso**. Quem pensava *"quero ver a turma T2"* não tinha por onde
 * começar. O `SC-002` cobra que a ficha esteja a no máximo três cliques de qualquer tela.
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA** — e nos dois casos em que ele **é** a prova: reabrir um
 * endereço filtrado noutro contexto é o que demonstra que o recorte virou link.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";

let EMAIL = "";
let SEMEADO: CursosSemeados;
let PROCESSO = 0;

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("turmaslista", PROCESSO);
  await criarConta(EMAIL, `USR-TLST-${PROCESSO}`);
  SEMEADO = await semearCursos(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  // ⚠️ **TURMA É APAGÁVEL, CURSO NÃO** (regra 9.1): a limpeza remove as turmas e **deixa os cursos**,
  //    que a amostra reaproveita na execução seguinte. É o que torna a amostra idempotente.
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL);
});

const LISTA = '[data-slot="lista-de-turmas"]';
const FILTRO = '[data-slot="filtro-avancado"]';

/** Entra e chega à lista **pelo menu** — nunca por endereço. */
async function irALista(page: Page): Promise<void> {
  await entrar(page, EMAIL, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Turmas", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  await expect(page.locator(LISTA)).toBeVisible();
}

/**
 * Preenche um campo do filtro avançado.
 *
 * ⚠️ **ABRE O PAINEL SÓ SE ELE ESTIVER FECHADO.** `FiltroAvancado` é um `Collapsible` e pode vir
 * aberto; um clique incondicional no gatilho o **fechava**, e o campo sumia — o sintoma era
 * `getByLabel` não achar nada, que se lê como "o filtro não foi escrito". É a lição do `SC-011`.
 */
async function abrirFiltros(page: Page): Promise<void> {
  const filtro = page.locator(FILTRO);
  if (!(await filtro.getByLabel("Buscar pelo código").isVisible())) {
    await filtro.getByRole("button", { name: "Filtros" }).click();
  }
}

/**
 * Escolhe uma opção num campo de escolha do filtro.
 *
 * ⚠️ **O CAMPO DE ESCOLHA NÃO É UM `<select>` NATIVO, e medir isso custou um caso reprovado.** O
 * `FiltroAvancado` usa o `Select` do shadcn, que é um `<button role="combobox">` com a lista num
 * painel — `selectOption` responde *"Element is not a `<select>` element"*. O percurso é **clicar e
 * escolher**, que é também o que uma pessoa faz.
 *
 * ⚠️ **A LISTA É PROCURADA NA PÁGINA, E NÃO NO FILTRO:** o painel do Radix vai por `Portal`, fora da
 * árvore do campo. Procurá-lo dentro do filtro não acharia nada.
 */
async function escolherNoFiltro(page: Page, rotulo: string, parteDaOpcao: string): Promise<void> {
  await page.locator(FILTRO).getByLabel(rotulo).click();
  await page
    .getByRole("option", { name: new RegExp(parteDaOpcao, "i") })
    .first()
    .click();
}

test.describe("`SC-002` · do menu à ficha, sem passar pelo curso", () => {
  test("a lista mostra as turmas, e a linha leva à ficha", async ({ page }) => {
    await irALista(page);

    const codigo = SEMEADO.turmaJanelaCedo;
    await expect(page.getByRole("gridcell", { name: codigo, exact: false })).toBeVisible();
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("turma");

    await page.getByRole("link", { name: codigo }).first().click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/turmas/${encodeURIComponent(codigo)}`);
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
  });

  test("⚠️ o cabeçalho da ficha resume a turma, e o curso é link", async ({ page }) => {
    await irALista(page);
    await page.getByRole("link", { name: SEMEADO.turmaJanelaCedo }).first().click();

    // `FR-021`: situação, modalidade, início, término, sala e efetivo num lugar só.
    const cabecalho = page.locator('[data-slot="cabecalho-da-turma"]');
    await expect(cabecalho).toBeVisible();
    await expect(cabecalho).toContainText("Situação");
    await expect(cabecalho).toContainText("Modalidade");
    await expect(page.locator('[data-slot="curso-da-turma"]')).toBeVisible();
  });
});

test.describe("`FR-013`, `FR-014` · os filtros vão para a URL, e o botão os limpa", () => {
  test("filtrar por curso escreve o endereço, e o endereço reproduz a lista", async ({
    page,
    context,
  }) => {
    await irALista(page);
    await abrirFiltros(page);

    const sigla = SEMEADO.porClassificacao.regular;
    await escolherNoFiltro(page, "Curso", sigla);

    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(sigla);
    const endereco = page.url();

    /*
     * ⚠️ **ABA NOVA, E NÃO `reload`: é o que prova que o RECORTE virou link.** Recarregar provaria
     *    que a página sobrevive; abrir noutro contexto prova que o endereço **basta** — que é o que
     *    o `FR-001` da spec 008 promete sobre estado na URL.
     */
    const outra = await context.newPage();
    await outra.goto(endereco);
    await expect(outra.locator(LISTA)).toBeVisible();
    // ⚠️ O campo é um `combobox` do shadcn: ele **mostra** o rótulo escolhido, não tem `value`.
    await expect(outra.locator(FILTRO).getByLabel("Curso")).toContainText(sigla);
    await outra.close();
  });

  test("⚠️ *Limpar filtros* aparece só com filtro, e devolve a lista inteira", async ({ page }) => {
    await irALista(page);

    // ⚠️ Sem filtro o botão NÃO existe — a regra de quando aparecer mora dentro dele.
    await expect(page.locator('[data-slot="limpar-filtros"]')).toHaveCount(0);

    await abrirFiltros(page);
    await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(SEMEADO.turmaJanelaCedo);
    await expect.poll(() => new URL(page.url()).searchParams.get("busca")).not.toBeNull();

    const limpar = page.locator('[data-slot="limpar-filtros"]');
    await expect(limpar).toBeVisible();
    await limpar.click();

    await expect.poll(() => new URL(page.url()).searchParams.get("busca")).toBeNull();
    await expect(page.locator('[data-slot="limpar-filtros"]')).toHaveCount(0);
  });

  test("⚠️ recorte sem resultado diz NÃO HÁ, e não 'sem permissão'", async ({ page }) => {
    await irALista(page);
    await abrirFiltros(page);

    await page.locator(FILTRO).getByLabel("Buscar pelo código").fill("ZZZ-NAO-EXISTE-ZZZ");

    /*
     * ⚠️ **A DISTINÇÃO É O REQUISITO** (gotcha 4): a policy recorta por alcance **sem erro**, então
     *    lista vazia pode significar duas coisas. Com filtro no ar, a frase é sobre o **recorte**.
     */
    const vazio = page.locator('[data-slot="estado-vazio"]');
    await expect(vazio).toBeVisible();
    await expect(vazio).toContainText(/nenhuma turma neste recorte/i);
  });
});

test.describe("`FR-017` · curso → turma, e o caminho para a lista inteira", () => {
  test("a aba Grade leva à ficha, e *Ver todas as turmas* à lista filtrada", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL, "/inicio");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Cursos", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos");
    await page.locator(`[data-curso="${sigla}"]`).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);

    const verTodas = page.locator('[data-slot="ver-todas-as-turmas"]');
    await expect(verTodas).toBeVisible();
    await verTodas.click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    // ⚠️ Já **recortada pelo curso de onde se veio**: é o estado em que a pessoa estava.
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(sigla);
  });
});
