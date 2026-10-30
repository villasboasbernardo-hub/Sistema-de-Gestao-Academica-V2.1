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
import { abrirAvisosPeloSininho, avisoDaChave } from "./avisos";
import { apagarConta, criarConta, emailDeTeste } from "./conta-de-teste";
import { abrirPainel } from "./paineis";
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
const ESCOLHA_DO_ANO = (page: Page) =>
  /* Bloco 15 (`FR-003`): o ano mora no cabeçalho do sistema. */
  page.locator('[data-slot="cabecalho-do-app"] select[data-slot="ano-do-painel-escolha"]');
const indicador = (page: Page, chave: string) =>
  page.locator(`[data-slot="indicador-de-turmas"][data-chave="${chave}"]`);

/** O número da contagem do cabeçalho da lista — as linhas do recorte. */
async function linhasDoRecorte(page: Page): Promise<number> {
  const texto = (await page.locator('[data-slot="contagem-de-turmas"]').textContent()) ?? "";
  return Number(texto.match(/\d+/)?.[0] ?? Number.NaN);
}

test.describe("FR-005 · cinco indicadores e três avisos, do recorte", () => {
  test("⚠️ um ano só: o vigente por padrão, sem a planejada do ano seguinte; o seletor troca, e com o ano o Total bate com a tabela", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await irAListaDeTurmas(page, EMAIL);
    // Spec 025 (RT-4, D-19): os números moram no painel do ícone *Estatísticas*.
    await abrirPainel(page, "estatisticas");
    const painel = page.locator('[data-slot="painel-de-turmas"]');
    await expect(painel).toBeVisible();
    await expect(painel).toHaveAttribute("data-ano", VIGENTE);
    // Spec 019, A-1: uma caixa de seleção no canto superior direito, no lugar dos botões.
    await expect(ESCOLHA_DO_ANO(page)).toHaveValue(VIGENTE);

    await abrirFiltros(page);
    await escolherNoFiltro(page, "Curso", SIGLA);
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(SIGLA);
    // REGRA DOS VALORES ESPERADOS: (a), spec 025 (RT-6, D-26) — a LISTA também é só do ano escolhido: os quatro do
    // vigente, como o painel (eram os seis, de todos os anos).
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("4 turmas");
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
    await ESCOLHA_DO_ANO(page).selectOption("2027");
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe("2027");
    await expect(painel).toHaveAttribute("data-ano", "2027");
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("1 turma");
    await conferirIndicadores(page, { total: "1", planejadas: "1", emAndamento: "0" });
    // "Batendo com a tabela": com o ano escolhido, o Total é o número de linhas do recorte.
    await expect(indicador(page, "total").locator(".text-kpi")).toHaveText(
      String(await linhasDoRecorte(page)),
    );

    /* ── 2025: a concluída ───────────────────────────────────────────────────────────────────── */
    await ESCOLHA_DO_ANO(page).selectOption("2025");
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe("2025");
    await conferirIndicadores(page, { total: "1", concluidas: "1", planejadas: "0" });

    /* ── de volta ao vigente: o padrão, e a URL fica sem `ano` ───────────────────────────────── */
    await ESCOLHA_DO_ANO(page).selectOption(VIGENTE);
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBeNull();
    await expect(painel).toHaveAttribute("data-ano", VIGENTE);
    await conferirIndicadores(page, { total: "4", planejadas: "1" });
  });

  /*
   * Spec 022 (Bloco 7, FR-004.4): o quadro "O que falta nas turmas" saiu de `/turmas` — os números ficam, e os três
   * avisos moram na página Avisos, pelo sininho, cada um com o link para onde se resolve: a janela na ficha, o instrutor
   * nas disciplinas da ficha e o conflito no DSA da semana.
   */
  test("os três avisos dizem o que falta em Avisos, e cada um leva para onde se resolve, por clique", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await irAListaDeTurmas(page, EMAIL);
    await expect(page.locator('[data-slot="avisos-de-turmas"]')).toHaveCount(0);
    await abrirAvisosPeloSininho(page);

    await expect(avisoDaChave(page, `turmas:sem_janela:${codigo("T3")}`)).toHaveCount(1);
    await expect(avisoDaChave(page, `turmas:sem_instrutor:${codigo("T1")}`)).toContainText(
      "1 disciplina",
    );
    // A concluída e a cancelada não estão em oferta: não avisam.
    await expect(avisoDaChave(page, `turmas:sem_instrutor:${codigo("T4")}`)).toHaveCount(0);
    await expect(avisoDaChave(page, `turmas:sem_instrutor:${codigo("T5")}`)).toHaveCount(0);

    await expect(avisoDaChave(page, `turmas:conflito:${codigo("T1")}`)).toContainText(
      `com ${codigo("T2")}`,
    );
    await expect(avisoDaChave(page, `turmas:conflito:${codigo("T2")}`)).toContainText(
      `com ${codigo("T1")}`,
    );
    // Sem conflito na T3 (não tem aula), e o aviso não nasce dela.
    await expect(avisoDaChave(page, `turmas:conflito:${codigo("T3")}`)).toHaveCount(0);

    for (const [tipo, chave, destino] of [
      ["sem_janela", "T3", (c: string) => `/turmas/${encodeURIComponent(c)}`],
      ["sem_instrutor", "T1", (c: string) => `/turmas/${encodeURIComponent(c)}`],
      ["conflito", "T2", (c: string) => `/turmas/${encodeURIComponent(c)}/dsa`],
    ] as const) {
      await avisoDaChave(page, `turmas:${tipo}:${codigo(chave)}`)
        .getByRole("link")
        .click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(destino(codigo(chave)));
      await page.goBack();
      await expect(page.locator('[data-slot="pagina-de-avisos"]')).toBeVisible();
    }
  });
});
