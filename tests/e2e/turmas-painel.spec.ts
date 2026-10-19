/**
 * **O painel de turmas**, por clique — Bloco 2, item 4 (spec 017, FR-005; T057).
 *
 * > *"Dashboard de turmas, no molde do de instrutores: total, canceladas, concluídas, em andamento, iniciando nos
 * > próximos 30 dias, e alertas do que falta (data, instrutor, conflito)."* — pedido de Bernardo Villas Boas,
 * > 16/10/2026
 *
 * ⚠️ **A SEMENTE TEM CADA AVISO E CADA INDICADOR**, num curso só, para o filtro por curso dar números exatos:
 *
 * | Turma | Situação | Janela | O que ela prova |
 * |---|---|---|---|
 * | T1 | ativa | completa | conflito de instrutor com a T2 nesta semana; disciplina sem instrutor |
 * | T2 | ativa | completa | conflito de instrutor com a T1 |
 * | T3 | planejada | sem término, início em 10 dias | *sem janela* e *iniciando* |
 * | T4 | concluída | 2025 | conta em *concluídas* e não avisa |
 * | T5 | cancelada | início em 5 dias | ⚠️ NÃO conta em *iniciando* (cancelada), nem avisa |
 * | T6 | planejada | 2027 | ⚠️ NÃO conta no ano vigente; conta quando o painel passa a 2027 |
 *
 * ⚠️ **O PAINEL É DE UM ANO SÓ** *(ajuste da conferência do PR #73, 19/10/2026)*: por padrão o ano letivo vigente, e
 *    o seletor do painel troca o `ano` da URL — o mesmo filtro da lista. Com o ano escolhido, o *Total* bate com a
 *    tabela (C-14); sem ele, a tabela tem todos os anos e o painel, só o vigente.
 */
import { expect, test, type Page } from "@playwright/test";

import { semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { limparBloco2, maisDias, semearBloco2, type Bloco2Semeado } from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste } from "./conta-de-teste";
import { abrirFiltros, escolherNoFiltro, irAListaDeTurmas } from "./navegar-turmas";

let SEMEADO: Bloco2Semeado;
let SIGLA = "";
let INSTRUTOR = "";
let EMAIL = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  const hoje = hojeNaCiaara();
  const segunda = semanaDoPainel(hoje).de;
  SIGLA = `CUR-B2PN${p}`;
  INSTRUTOR = `B2PN-INS-${p}`;
  SEMEADO = await semearBloco2({
    sigla: SIGLA,
    nome: `Curso do painel de turmas ${p}`,
    disciplinas: [{ cod: "I", nome: "Disciplina do painel", ch: 20 }],
    turmas: [
      {
        chave: "T1",
        ano: 2026,
        status: "ativa",
        inicio: "2026-03-02",
        termino: maisDias(hoje, 60),
      },
      {
        chave: "T2",
        ano: 2026,
        status: "ativa",
        inicio: "2026-03-02",
        termino: maisDias(hoje, 60),
      },
      { chave: "T3", ano: 2026, status: "planejada", inicio: maisDias(hoje, 10), termino: null },
      { chave: "T4", ano: 2025, status: "concluida", inicio: "2025-03-03", termino: "2025-11-28" },
      {
        chave: "T5",
        ano: 2026,
        status: "cancelada",
        inicio: maisDias(hoje, 5),
        termino: maisDias(hoje, 90),
      },
      { chave: "T6", ano: 2027, status: "planejada", inicio: "2027-03-01", termino: "2027-11-30" },
    ],
    /* O MESMO instrutor, no MESMO dia e TA, em duas turmas: o conflito de pessoa (RN-CONF-01). */
    aulas: [
      { sufixo: "C1", turma: "T1", cod: "I", data: segunda, tempos: 2, taInicial: 1 },
      { sufixo: "C2", turma: "T2", cod: "I", data: segunda, tempos: 2, taInicial: 1 },
    ],
    instrutorCodigo: INSTRUTOR,
  });
  EMAIL = emailDeTeste("painel-turmas", p);
  await criarConta(EMAIL, `USR-PNT-${p}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
  await limparBloco2(SIGLA, INSTRUTOR);
});

const codigo = (chave: string) => SEMEADO.turmas[chave]?.codigo as string;
/** O ano letivo vigente — o de hoje em São Paulo, como a página o calcula. */
const VIGENTE = hojeNaCiaara().slice(0, 4);

async function conferirIndicadores(page: Page, esperado: Record<string, string>): Promise<void> {
  for (const [chave, valor] of Object.entries(esperado)) {
    await expect(indicador(page, chave).locator(".text-kpi"), chave).toHaveText(valor);
  }
}
const indicador = (page: Page, chave: string) =>
  page.locator(`[data-slot="indicador-de-turmas"][data-chave="${chave}"]`);

/** O número da contagem do cabeçalho da lista — as linhas do recorte. */
async function linhasDoRecorte(page: Page): Promise<number> {
  const texto = (await page.locator('[data-slot="contagem-de-turmas"]').textContent()) ?? "";
  return Number(texto.match(/\d+/)?.[0] ?? Number.NaN);
}

/**
 * O aviso de UM tipo, da turma dona dele — pelo LINK da turma, e não pelo texto: o aviso de conflito da T2 diz
 * *"com T1"*, e filtrar por texto casaria as duas linhas (medido na 1ª rodada, 19/10/2026).
 */
function avisoDa(quadro: ReturnType<Page["locator"]>, tipo: string, turma: string) {
  return quadro
    .locator(`[data-slot="aviso-de-turma"][data-tipo="${tipo}"]`)
    .filter({ has: quadro.page().getByRole("link", { name: turma, exact: true }) });
}

async function avisos(page: Page) {
  const quadro = page.locator('[data-slot="avisos-de-turmas"]');
  await expect(quadro).toBeVisible();
  const botao = quadro.getByRole("button", { name: /Exibir avisos/ });
  if (await botao.isVisible()) await botao.click();
  return quadro;
}

test.describe("FR-005 · cinco indicadores e três avisos, do recorte", () => {
  test("⚠️ um ano só: o vigente por padrão, sem a planejada do ano seguinte; o seletor troca, e com o ano o Total bate com a tabela", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await irAListaDeTurmas(page, EMAIL);
    const painel = page.locator('[data-slot="painel-de-turmas"]');
    await expect(painel).toBeVisible();
    await expect(painel).toHaveAttribute("data-ano", VIGENTE);
    await expect(
      page.locator(`[data-slot="ano-do-painel-opcao"][data-ano="${VIGENTE}"]`),
    ).toHaveAttribute("aria-pressed", "true");

    await abrirFiltros(page);
    await escolherNoFiltro(page, "Curso", SIGLA);
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(SIGLA);
    // A lista tem os seis, de todos os anos; o painel, só os quatro do vigente.
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("6 turmas");
    await conferirIndicadores(page, {
      total: "4",
      // ⚠️ O CASO QUE DISCRIMINA do ano único: a T6, planejada de 2027, NÃO conta aqui — seriam 2.
      planejadas: "1",
      emAndamento: "2",
      // A T4 é de 2025.
      concluidas: "0",
      canceladas: "1",
      // ⚠️ E o da cancelada: a T5 começa em 5 dias e NÃO conta.
      iniciando: "1",
    });

    /* ── 2027 pelo seletor do painel: só a T6, e o Total bate com a tabela ───────────────────── */
    await page.locator('[data-slot="ano-do-painel-opcao"][data-ano="2027"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe("2027");
    await expect(painel).toHaveAttribute("data-ano", "2027");
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("1 turma");
    await conferirIndicadores(page, { total: "1", planejadas: "1", emAndamento: "0" });
    // "Batendo com a tabela": com o ano escolhido, o Total é o número de linhas do recorte.
    await expect(indicador(page, "total").locator(".text-kpi")).toHaveText(
      String(await linhasDoRecorte(page)),
    );

    /* ── 2025: a concluída ───────────────────────────────────────────────────────────────────── */
    await page.locator('[data-slot="ano-do-painel-opcao"][data-ano="2025"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe("2025");
    await conferirIndicadores(page, { total: "1", concluidas: "1", planejadas: "0" });

    /* ── de volta ao vigente: o padrão, e a URL fica sem `ano` ───────────────────────────────── */
    await page.locator(`[data-slot="ano-do-painel-opcao"][data-ano="${VIGENTE}"]`).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBeNull();
    await expect(painel).toHaveAttribute("data-ano", VIGENTE);
    await conferirIndicadores(page, { total: "4", planejadas: "1" });
  });

  test("os três avisos dizem o que falta, e cada um leva à ficha por clique", async ({ page }) => {
    test.setTimeout(120_000);
    await irAListaDeTurmas(page, EMAIL);
    await abrirFiltros(page);
    await escolherNoFiltro(page, "Curso", SIGLA);
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(SIGLA);

    let quadro = await avisos(page);
    const semJanela = quadro.locator('[data-slot="aviso-de-turma"][data-tipo="sem_janela"]');
    await expect(semJanela).toHaveCount(1);
    await expect(semJanela).toContainText(codigo("T3"));

    await expect(avisoDa(quadro, "sem_instrutor", codigo("T1"))).toContainText("1 disciplina");
    // A concluída e a cancelada não estão em oferta: não avisam.
    await expect(avisoDa(quadro, "sem_instrutor", codigo("T4"))).toHaveCount(0);
    await expect(avisoDa(quadro, "sem_instrutor", codigo("T5"))).toHaveCount(0);

    await expect(avisoDa(quadro, "conflito", codigo("T1"))).toContainText(`com ${codigo("T2")}`);
    await expect(avisoDa(quadro, "conflito", codigo("T2"))).toContainText(`com ${codigo("T1")}`);
    // Sem conflito na T3 (não tem aula), e o aviso não nasce dela.
    await expect(avisoDa(quadro, "conflito", codigo("T3"))).toHaveCount(0);

    for (const [tipo, chave] of [
      ["sem_janela", "T3"],
      ["sem_instrutor", "T1"],
      ["conflito", "T2"],
    ] as const) {
      quadro = await avisos(page);
      await avisoDa(quadro, tipo, codigo(chave))
        .getByRole("link", { name: codigo(chave), exact: true })
        .click();
      await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo(chave));
      await page.goBack();
      await expect(page.locator('[data-slot="painel-de-turmas"]')).toBeVisible();
    }
  });
});
