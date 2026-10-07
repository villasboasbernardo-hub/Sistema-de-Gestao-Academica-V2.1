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
import { expect, test } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";
/*
 * ⚠️ **OS TRÊS AUXILIARES DE PERCURSO SAÍRAM DAQUI EM 04/10/2026, E O MOTIVO É A SEGUNDA SUÍTE.**
 *    `andamento.spec.ts` precisa do mesmo caminho — menu, filtro, busca, clique — para abrir cinco
 *    fichas; copiá-los seria a segunda redação do mesmo percurso, e a terceira é a que diverge.
 */
import {
  abrirFiltros,
  escolherNoFiltro,
  FILTRO,
  irAListaDeTurmas,
  LISTA_DE_TURMAS as LISTA,
} from "./navegar-turmas";

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

test.describe("`SC-002` · do menu à ficha, sem passar pelo curso", () => {
  test("a lista mostra as turmas, e a linha leva à ficha", async ({ page }) => {
    await irAListaDeTurmas(page, EMAIL);

    const codigo = SEMEADO.turmaJanelaCedo;
    /*
     * ⚠️ **A ASSERÇÃO GANHOU ESCOPO EM 05/10/2026, E A AMBIGUIDADE FOI CAUSADA POR UMA COLUNA
     * NOVA.** O PR 1 do Épico 6 acrescentou a ação **DSA** na linha, cujo link traz
     * `aria-label="Abrir o DSA da turma <código>"` — e `getByRole("gridcell", { name: codigo })`
     * passou a resolver **duas** células, com a mensagem *"strict mode violation"*.
     * ⚠️ **O RÓTULO NÃO FOI ENCURTADO, e isso é decisão:** quem navega por leitor de tela precisa
     * saber de QUAL turma é aquele "DSA", e tirar o código do rótulo pioraria a tela para resolver
     * um problema do teste. É a lição do gotcha 3 do `CLAUDE.md`: *"ambiguidade não se resolve com
     * mais tempo — a correção é escopo"*. A célula que interessa é a **primeira** da linha.
     */
    await expect(page.getByRole("gridcell", { name: codigo, exact: false }).first()).toBeVisible();
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("turma");

    await page.getByRole("link", { name: codigo }).first().click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/turmas/${encodeURIComponent(codigo)}`);
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
  });

  test("⚠️ o cabeçalho da ficha resume a turma, e o curso é link", async ({ page }) => {
    await irAListaDeTurmas(page, EMAIL);
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
    await irAListaDeTurmas(page, EMAIL);
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
    await irAListaDeTurmas(page, EMAIL);

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
    await irAListaDeTurmas(page, EMAIL);
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
