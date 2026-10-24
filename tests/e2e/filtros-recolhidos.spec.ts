/**
 * Filtros recolhidos, com o número dos que estão fora do padrão — FR-004 da spec 016 (item 1.4).
 *
 * > *"Filtros recolhidos: começam fechados; o botão mostra quantos filtros estão ativos."*
 * > — Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA É A TELA LIMPA SEM NÚMERO.** Até 17/10/2026 `/cursos`, `/instrutores` e
 * `/disciplinas` mostravam **1** com a tela limpa, porque `situacao=ativo` é o padrão e o selo contava
 * qualquer valor não vazio. Com a contagem antiga de volta, o primeiro `expect` de cada uma reprova.
 *
 * ⚠️ **TODA TELA É ALCANÇADA PELO MENU**, e o `goto` só existe no login (`entrar`).
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";
import { abrirPainelDeFiltros, numeroDeFiltrosAtivos } from "./filtros";
import { abrirAbaDoCurso, irAoCursoPorClique } from "./navegar-curso";

let EMAIL = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("filtros", info.workerIndex);
  await criarConta(EMAIL, `USR-FILTROS-${info.workerIndex}`);
  // A semente traz um curso para a aba Disciplinas.
  SEMEADO = await semearCursos(info.workerIndex, EMAIL);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL);
});

async function irPeloMenu(page: Page, rotulo: string, rota: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: rotulo, exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(rota);
}

/**
 * O painel nasce recolhido e o ícone não traz número.
 *
 * ⚠️ Spec 025 (Bloco 10, RT-4): o gatilho é o ÍCONE *Filtros* da barra de ações da página, e não mais o botão do
 *    `FiltroAvancado`; o número de filtros fora do padrão vai no selo do ícone.
 */
async function conferirRecolhidoELimpo(page: Page): Promise<void> {
  const gatilho = page.locator('[data-slot="abrir-filtros"]').first();
  await expect(gatilho).toBeVisible({ timeout: 15_000 });
  await expect(gatilho).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-slot="painel-de-filtros"]')).toHaveCount(0);
  expect(await numeroDeFiltrosAtivos(page), "a tela limpa mostra número no ícone").toBeNull();
}

async function escolherOpcao(page: Page, campo: string, opcao: RegExp | string): Promise<void> {
  await page.getByRole("combobox", { name: campo, exact: true }).click();
  await page.getByRole("option", { name: opcao }).first().click();
}

async function limparEConferir(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect.poll(() => numeroDeFiltrosAtivos(page)).toBeNull();
}

test.describe("`FR-004` da spec 016 · filtros recolhidos com o número fora do padrão", () => {
  test("/cursos", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await irPeloMenu(page, "Cursos", "/cursos");
    await conferirRecolhidoELimpo(page);

    await abrirPainelDeFiltros(page);
    await escolherOpcao(page, "Modalidade", "Presencial");
    await escolherOpcao(page, "Situação", "Fora de oferta");
    await expect.poll(() => numeroDeFiltrosAtivos(page)).toBe("2");
    await limparEConferir(page);
  });

  test("/instrutores", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await irPeloMenu(page, "Instrutores", "/instrutores");
    await conferirRecolhidoELimpo(page);

    await abrirPainelDeFiltros(page);
    await page.getByLabel("Buscar por nome").fill("zz");
    await escolherOpcao(page, "Situação", "Inativos");
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 10_000 }).toBe("2");
    await limparEConferir(page);
  });

  test("/turmas", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await irPeloMenu(page, "Turmas", "/turmas");
    await conferirRecolhidoELimpo(page);

    await abrirPainelDeFiltros(page);
    await page.getByLabel("Buscar pelo código").fill("2026");
    await escolherOpcao(page, "Situação", /^Cancelada/);
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 10_000 }).toBe("2");
    await limparEConferir(page);
  });

  test("/atividades", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await irPeloMenu(page, "Atividades", "/atividades");
    await conferirRecolhidoELimpo(page);

    await abrirPainelDeFiltros(page);
    await page.getByLabel("Tipo", { exact: true }).fill("Palestra");
    await escolherOpcao(page, "Categoria", /^AEC/);
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 10_000 }).toBe("2");
    await limparEConferir(page);
  });

  test("o número do ícone segue o clique, sem esperar a resposta do servidor", async ({ page }) => {
    /*
     * Revisão do PR #90: o número do ícone da barra vinha só do servidor, e sob carga continuava em 2 depois do *Limpar
     * filtros* (instável no CI). O filtro aberto agora publica o número dele. Para o caso discriminar, as respostas da
     * página passam a demorar 5 s DEPOIS de o filtro estar escolhido: o número tem de sumir antes delas.
     */
    await entrar(page, EMAIL, "/inicio");
    await irPeloMenu(page, "Atividades", "/atividades");
    await abrirPainelDeFiltros(page);
    await escolherOpcao(page, "Categoria", /^AEC/);
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 10_000 }).toBe("1");

    await page.route(
      (url) => url.pathname === "/atividades",
      async (rota) => {
        if (rota.request().headers()["rsc"]) await new Promise((r) => setTimeout(r, 5_000));
        await rota.fallback();
      },
    );
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 2_000 }).toBeNull();
  });

  test("a aba Disciplinas do curso (spec 018: era /disciplinas, depois de escolher o curso)", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await irAoCursoPorClique(page, EMAIL, sigla);
    await abrirAbaDoCurso(page, "disciplinas");
    await conferirRecolhidoELimpo(page);

    await abrirPainelDeFiltros(page);
    await page.getByLabel("Buscar", { exact: true }).fill("ZZ");
    await escolherOpcao(page, "Situação do cadastro", "Fora de oferta");
    await expect.poll(() => numeroDeFiltrosAtivos(page), { timeout: 10_000 }).toBe("2");
    await limparEConferir(page);
  });
});
