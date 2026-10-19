/**
 * **Fora do DSA, executado é até hoje** — o caso que discrimina da D-COR-2 (FR-014.1, FR-014.4, FR-016 e SC-004 da
 * spec 016; DoD 8), **por clique a partir do menu**.
 *
 * > *"o saldo de capacidade conta só até hoje"* — D-COR-2, Bernardo Villas Boas, 16/10/2026
 * > *"fora do DSA e da planilha, executado é «até hoje» em toda tela (…). DSA e planilha continuam acumulados até a
 * > semana."* — Q-5, 17/10/2026
 *
 * ⚠️ **A SEMENTE TEM UM LANÇAMENTO NO FUTURO** (`panorama-de-teste.ts`): a `turmaSemCapacidade` tem 10 TA lançados no
 * passado e 8 no dia do término apertado, sempre depois de hoje. Com a soma sem corte (a de antes da M1), o `/inicio`,
 * a lista e a ficha mostrariam **18** de 100; até hoje são **10**. E o DSA da semana do lançamento **o conta**.
 *
 * ⚠️ **O SALDO ESPERADO SAI DA FUNÇÃO DO DOMÍNIO**, com o mesmo "hoje" da tela (`hojeNaCiaara`) e os feriados de dia
 * inteiro lidos do banco: o número exato depende do dia em que a suíte roda, e escrevê-lo à mão faria o caso
 * reprovar pelo calendário.
 *
 * ⚠️ **O QUE NÃO ESTÁ AQUI, E POR QUÊ:** `/disciplinas` não mostra execução por turma desde 04/10/2026 (ela fica na
 * ficha), e a aba *Avaliações* só mostra o "cumprido" de disciplina com avaliação do currículo, que esta semente não
 * tem. As duas leem pela MESMA função da tabela da ficha (`execucao_por_disciplina_ate`), provada no pgTAP 135 e
 * em `tests/invariantes/rls/execucao-ate.test.ts`.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { andamentoDaTurma } from "@/lib/dominio/andamento-da-turma";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "./panorama-de-teste";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let SEMEADO: PanoramaSemeado;
/** O saldo que a tela TEM de mostrar — pela função do domínio, com a executada até hoje. */
let SALDO_ATE_HOJE = 0;

const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

/** A data `n` dias antes de `iso` (`aaaa-mm-dd`). */
function diasAntes(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d - n)).toISOString().slice(0, 10);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("andamentoatehoje", p);
  SEMEADO = await semearPanorama(p);
  await criarConta(EMAIL, `USR-ATEH-${p}`);

  const hoje = hojeNaCiaara();
  const { data: feriados, error } = await admin
    .from("feriados")
    .select("data")
    .eq("impacto", "dia_inteiro")
    .eq("status", "ativo")
    .gte("data", hoje);
  if (error) throw new Error(`falha ao ler os feriados: ${error.message}`);
  const andamento = andamentoDaTurma(
    {
      status: "ativa",
      modalidade: "presencial",
      dataTermino: SEMEADO.terminoApertado,
      prevista: 100,
      executada: 10,
    },
    { regimePadraoTempos: 8, limiteDiarioEadHoras: null },
    (feriados ?? []).map((f) => f.data as string),
    hoje,
  );
  if (andamento.saldo === null) throw new Error("a conta do saldo esperado não fechou");
  SALDO_ATE_HOJE = andamento.saldo;
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
  await limparPanorama(SEMEADO);
});

test.describe("⚠️ D-COR-2 · FR-014.4 · o lançamento no futuro não conta fora do DSA — e conta no DSA", () => {
  test("Início → Turmas → ficha (andamento e disciplinas) → Abrir o DSA na semana dele", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const turma = SEMEADO.turmaSemCapacidade;

    /* ── menu Início: 10 de 100, e não 18 ─────────────────────────────────────────────────────── */
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Início", exact: true }).click();
    const cartao = page.locator(`[data-turma="${turma}"]`);
    await expect(cartao).toBeVisible();
    await expect(cartao.locator("[data-progresso]")).toHaveAttribute("data-progresso", "10");
    await expect(cartao).toContainText("10/100 TA");
    await expect(cartao).not.toContainText("18/100 TA");

    /* ── menu Turmas: as colunas novas, com o mesmo número ───────────────────────────────────── */
    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    const linha = page.locator('[data-slot="lista-de-turmas"] tr').filter({ hasText: turma });
    await expect(linha.locator('[data-slot="coluna-progresso"]')).toHaveAttribute(
      "data-progresso",
      "10",
    );
    await expect(linha.locator('[data-slot="coluna-saldo"]')).toHaveAttribute(
      "data-saldo",
      String(SALDO_ATE_HOJE),
    );
    /* A marca de atraso é a mesma do `/inicio` (Q-6): a turma não cabe no prazo. */
    await expect(linha.locator('[data-slot="coluna-saldo"]')).toContainText("em atraso");

    /* ── a ficha: o andamento e a tabela de disciplinas, até hoje ────────────────────────────── */
    await linha
      .getByRole("link", { name: new RegExp(turma) })
      .first()
      .click();
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(turma);
    const andamento = page.locator('[data-slot="andamento-da-turma"]');
    await expect(andamento.locator('[data-andamento="executada"]')).toContainText("10 TA");
    await expect(andamento.locator('[data-andamento="percentual"]')).toContainText("10 %");
    /* O cartão escreve o saldo com sinal (`comSinal`: "+12" ou "-82"). */
    await expect(andamento.locator('[data-andamento="saldo"]')).toContainText(
      `${SALDO_ATE_HOJE > 0 ? "+" : ""}${SALDO_ATE_HOJE} TA`,
    );
    const daDisciplina = page
      .locator('[data-slot="disciplinas-da-turma"] tr')
      .filter({ hasText: "PERC-03" });
    await expect(daDisciplina).toContainText("10 %");
    await expect(daDisciplina).not.toContainText("18 %");

    /*
     * ── e o DSA da semana do lançamento O CONTA (acumulado até a semana, FR-028.1 da spec 013) ──
     * ⚠️ **`PEND-016-5`, RESOLVIDA NA SPEC 017** (decisão de Bernardo Villas Boas, 19/10/2026): a situação do DSA
     *    passou a somar o lançamento histórico da semente, que não tem tempo no dia (`ta_inicial` nulo, 10 TA em
     *    04/03/2026). Antes ela mostrava **8 %** na semana do lançamento futuro; agora mostra **18 %** — os 10 do
     *    histórico mais os 8 do futuro, em 100 de CH — e **10 %** na semana anterior, que já conta o histórico.
     */
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    const naSituacao = page.locator(
      '[data-slot="quadro-por-disciplina"] tr:has([data-disciplina="PERC-03"]) [data-slot="progresso-da-disciplina"]',
    );
    const irPara = async (dia: string) => {
      const semana = semanaIsoDe(dia);
      if (semana === null) throw new Error(`data inválida: ${dia}`);
      await irParaASemanaDoDia(page, dia, semana.numero, semana.ano);
      await expect(page.locator('[data-slot="quadro-por-disciplina"]')).toBeVisible();
      /* Sem nada contado até a semana, a disciplina pode nem ter linha: é zero. */
      return (await naSituacao.count()) === 0
        ? 0
        : Number(await naSituacao.getAttribute("data-percentual"));
    };
    const naSemanaDele = await irPara(SEMEADO.lancamentoFuturo.data);
    const naSemanaAnterior = await irPara(diasAntes(SEMEADO.lancamentoFuturo.data, 7));
    expect(
      naSemanaDele - naSemanaAnterior,
      "o DSA da semana do lançamento futuro não o contou",
    ).toBe(SEMEADO.lancamentoFuturo.tempos);
    expect(naSemanaAnterior, "PEND-016-5 · a situação do DSA não somou o lançamento sem posição").toBe(10);
    expect(naSemanaDele).toBe(18);
  });
});
