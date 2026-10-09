/**
 * O cartão único do lançamento (ajustes 1 e 2 do PR #40), o empurrão em cascata (`D-DSA-3`) e o teto
 * de TFM ao editar (dúvida 2) — conferência de Bernardo Villas Boas, 08/10/2026.
 *
 * Tudo por clique: ficha da turma → Abrir o DSA → o dia no calendário → a semana de referência.
 * A prova é sempre o BANCO, lido pelo cliente de serviço.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia } from "./percurso-do-dsa";

let EMAIL = "";
let SEMEADO: DsaSemeado;

const GRADE = '[data-slot="grade-da-semana"][data-modelo="v4"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const CARTAO = '[data-slot="acoes-do-bloco"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("dsacartao", info.workerIndex);
  await criarConta(EMAIL, `USR-DSAC-${info.workerIndex}`);
  SEMEADO = await semearDsa(info.workerIndex, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

const sufixo = (): string =>
  SEMEADO.turmaComRelogio
    .replace(/^CUR-/, "")
    .replace(/ 2026$/, "")
    .replace(/-REL$/, "");

async function aulaPorTopico(topico: string) {
  const { data } = await banco()
    .from("registros_aula")
    .select("id, local, conteudo_resumo, ta_inicial, tempos_consumidos, editado_em")
    .eq("conteudo_resumo", topico)
    .eq("status", "ativo")
    .maybeSingle();
  return data as {
    id: string;
    local: string | null;
    conteudo_resumo: string | null;
    ta_inicial: number;
    tempos_consumidos: number;
  } | null;
}

/** Espera o desfecho de uma gravação no formulário ou no cartão; reprova só a recusa. */
async function desfecho(page: Page, onde: string, recusa: string, avisos: string): Promise<string> {
  const ler = async (): Promise<string> => {
    if ((await page.locator(`[data-slot="${recusa}"]`).count()) > 0) {
      return `recusou: ${await page.locator(`[data-slot="${recusa}"]`).innerText()}`;
    }
    if ((await page.locator(onde).count()) === 0) return "fechou";
    if ((await page.locator(`[data-slot="${avisos}"]`).count()) > 0) return "avisou";
    return "em curso";
  };
  await expect.poll(ler, { timeout: 60_000 }).not.toBe("em curso");
  return ler();
}

/** Lança uma aula de 1 TA (ou `tempos`) na célula, com o tópico dado. */
async function lancarAula(
  page: Page,
  celula: string,
  topico: string,
  opcoes: { tempos?: number; cod?: string; local?: string } = {},
): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await escolherDisciplinaEUnidade(page, opcoes.cod ?? SEMEADO.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(topico);
  await page.locator("#dsa-tempos").fill(String(opcoes.tempos ?? 1));
  if (opcoes.local !== undefined) await page.locator("#dsa-local").fill(opcoes.local);
  await page.locator('[data-slot="gravar-lancamento"]').click();
  const r = await desfecho(page, FORMULARIO, "recusa-do-lancamento", "avisos-do-lancamento");
  expect(r, "o lançamento foi recusado").not.toMatch(/^recusou/);
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.locator(FORMULARIO).getByRole("button", { name: "Cancelar" }).click();
  }
  await expect.poll(async () => (await aulaPorTopico(topico)) !== null).toBe(true);
}

/** Abre o cartão do lançamento pelo tópico — clicando no cartão da grade. */
async function abrirCartao(page: Page, topico: string): Promise<void> {
  await page.locator(`${GRADE} td`).filter({ hasText: topico }).first().click();
  await expect(page.locator(CARTAO)).toBeInViewport();
}

test.describe("⚠️ ajuste 2 · o cartão reabre com o valor GRAVADO, nunca com o do cadastro", () => {
  /*
   * O caso real de Bernardo: local editado para «EAD» reabria como a sala da turma e era regravado.
   * ⚠️ A aula é a `A1` da semente (segunda, 3º tempo), que tem a sala da turma como local.
   */
  test("gravar local EAD, reabrir, ver EAD, gravar outro campo — e o banco continua EAD", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const codigo = `DSA-${sufixo()}-A1`;
    await abrirASemana(page);

    await page.locator(`${GRADE} td[data-celula="2:0"]`).click();
    await expect(page.locator(CARTAO)).toBeInViewport();
    await page.locator("#dsa-editar-local").fill("EAD");
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );
    if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");

    /* Reabrir: o campo traz o GRAVADO. */
    await page.reload();
    await expect(page.locator(GRADE)).toBeVisible();
    await page.locator(`${GRADE} td[data-celula="2:0"]`).click();
    await expect(page.locator(CARTAO)).toBeInViewport();
    await expect(page.locator("#dsa-editar-local")).toHaveValue("EAD");

    /* Gravar OUTRO campo — e o local não pode voltar à sala. */
    const novoTopico = `Tópico depois do EAD ${Date.now().toString(36)}`;
    await page.locator("#dsa-editar-conteudo").fill(novoTopico);
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );

    await expect
      .poll(async () => {
        const { data } = await banco()
          .from("registros_aula")
          .select("local, conteudo_resumo")
          .eq("codigo", codigo)
          .maybeSingle();
        const l = data as { local: string | null; conteudo_resumo: string | null } | null;
        return `${l?.local}|${l?.conteudo_resumo}`;
      })
      .toBe(`EAD|${novoTopico}`);
  });
});

test.describe("⚠️ `D-DSA-3` · o bloco que cresce EMPURRA os seguintes, numa transação só", () => {
  test("o exemplo da decisão: A de 1 para 2 TA leva B do 2º para o 3º tempo, com aviso", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const marca = Date.now().toString(36);
    const topicoA = `Aula A ${marca}`;
    const topicoB = `Aula B ${marca}`;
    await abrirASemana(page);

    /* Sexta (coluna 4), vazia na semente: A no 1º tempo, B no 2º. */
    await lancarAula(page, "0:4", topicoA);
    await lancarAula(page, "1:4", topicoB);
    const bAntes = await aulaPorTopico(topicoB);
    expect(bAntes?.ta_inicial).toBe(2);

    await abrirCartao(page, topicoA);
    await page.locator("#dsa-editar-tempos").fill("2");
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).toBe("avisou");
    await expect(page.locator('[data-slot="avisos-da-acao"]')).toContainText("empurrado");
    await expect(page.locator('[data-slot="avisos-da-acao"]')).toContainText("para o 3º tempo");

    const a = await aulaPorTopico(topicoA);
    const b = await aulaPorTopico(topicoB);
    expect(`${a?.ta_inicial}/${a?.tempos_consumidos}`).toBe("1/2");
    expect(b?.ta_inicial, "B não foi empurrado").toBe(3);
    /* ⚠️ UPDATE do MESMO registro: o id de B é o mesmo. */
    expect(b?.id).toBe(bAntes?.id);
  });

  test("⚠️ não cabe até o último tempo do dia: RECUSA, e NADA muda — nem o bloco que cresceu", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const marca = Date.now().toString(36);
    const topicoC = `Aula C ${marca}`;
    const topicoD = `Aula D ${marca}`;
    await abrirASemana(page);

    /* Sexta: C no 5º tempo, D no 8º — o último do regime (8) mais o excepcional é o 9º. */
    await lancarAula(page, "4:4", topicoC);
    await lancarAula(page, "7:4", topicoD, { tempos: 2 });

    await abrirCartao(page, topicoC);
    /* C de 5 a 8 empurra D para o 9º e 10º — o 10º passa do 9º. */
    await page.locator("#dsa-editar-tempos").fill("4");
    await page.locator('[data-slot="gravar-edicao"]').click();
    const r = await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao");
    expect(r).toMatch(/^recusou/);
    await expect(page.locator('[data-slot="recusa-da-acao"]')).toContainText("Nada foi gravado");

    expect((await aulaPorTopico(topicoC))?.tempos_consumidos, "C cresceu mesmo recusado").toBe(1);
    expect((await aulaPorTopico(topicoD))?.ta_inicial, "D se mexeu mesmo recusado").toBe(8);
  });
});

test.describe("⚠️ dúvida 2 · editar «Quantos tempos» confere o teto de TFM, como o mover", () => {
  test("passar de 6 TA de TFM na semana pelo editar é recusado, e nada grava", async ({ page }) => {
    test.setTimeout(180_000);
    const topico = `TFM ${Date.now().toString(36)}`;
    await abrirASemana(page);

    /* Terça (coluna 1), 3º tempo, 4 TA de TFM — dentro do teto. */
    await lancarAula(page, "2:1", topico, { tempos: 4, cod: SEMEADO.codDisciplinaTfm });

    await abrirCartao(page, topico);
    await page.locator("#dsa-editar-tempos").fill("7");
    await page.locator('[data-slot="gravar-edicao"]').click();
    const r = await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao");
    expect(r, "passar do teto de TFM pelo editar foi aceito").toMatch(/^recusou/);
    expect((await aulaPorTopico(topico))?.tempos_consumidos, "o TFM cresceu mesmo recusado").toBe(
      4,
    );
  });
});

test.describe("ajuste 1 · o cartão único edita dia, tempo e disciplina de uma vez", () => {
  test("mudar o tempo inicial e a disciplina na mesma gravação", async ({ page }) => {
    test.setTimeout(180_000);
    const topico = `Aula do cartão único ${Date.now().toString(36)}`;
    await abrirASemana(page);
    /* Terça, 8º tempo. */
    await lancarAula(page, "7:1", topico);

    await abrirCartao(page, topico);
    /* Nenhuma aba: os campos estão todos no mesmo cartão, com um botão Gravar. */
    await expect(page.locator("[data-aba]")).toHaveCount(0);
    await expect(page.locator('[data-slot="gravar-edicao"]')).toHaveCount(1);
    await page.locator("#dsa-mover-ta").selectOption("7");
    /* A disciplina sem UE (`D-DSA-1`): a isenta da semente, com o tópico. */
    const campo = page.locator("#dsa-editar-disciplina");
    const opcao = campo
      .locator("option")
      .filter({ hasText: new RegExp(`^${SEMEADO.codDisciplinaIsenta} — `) });
    await campo.selectOption((await opcao.getAttribute("value")) ?? "");
    await expect(page.locator('[data-slot="alerta-sem-unidade"]')).toBeVisible();
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );

    await expect
      .poll(async () => {
        const { data } = await banco()
          .from("registros_aula")
          .select("ta_inicial, unidade_ensino_id, disciplina_id")
          .eq("conteudo_resumo", topico)
          .maybeSingle();
        const l = data as {
          ta_inicial: number;
          unidade_ensino_id: string | null;
          disciplina_id: string | null;
        } | null;
        return `${l?.ta_inicial}/${l?.unidade_ensino_id === null ? "sem UE" : "com UE"}/${l?.disciplina_id === null ? "sem disciplina" : "com disciplina"}`;
      })
      .toBe("7/sem UE/com disciplina");
  });
});
