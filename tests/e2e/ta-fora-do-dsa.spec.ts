/**
 * **TA fora do DSA**, por clique — D-COR-3 (spec 017, FR-001, SC-001; T023).
 *
 * > *"TA fora do DSA, com observação (…) Esses TA somam na CH executada e no saldo, e a tela mostra separado, ex.:
 * > «45 TA executados · 40 no DSA · 5 fora do DSA»."* — D-COR-3, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **A SEMENTE FAZ O TEXTO DO PEDIDO**: duas disciplinas de 50 TA, 40 TA executados no DSA (36 históricos sem
 *    posição e 2 + 2 na grade desta semana); registrar 5 fora do DSA dá exatamente *"45 TA executados · 40 no DSA ·
 *    5 fora do DSA"*, e o `/inicio`, a `/turmas` e a ficha vão de 40 % a 45 %.
 * ⚠️ **A PROVA É A TELA E O BANCO** (PEND-016-2): a confirmação de `?gravada=` **e** a linha em `ta_fora_do_dsa`.
 * ⚠️ **SEM OBJETO, e dito em `progresso-implement.md`**: o *card de CHT* da ficha não existe (é a `PEND-014-9`), e a
 *    aba *Avaliações* mostra avaliações, não CH executada. O *"teto do dia continua aceito"* é provado no banco: o TA
 *    fora do DSA não ocupa TA na grade (pgTAP 137, FR-001.6), e é dessa ocupação que o DSA tira o teto e o conflito.
 * ⚠️ **TUDO NUM CASO SÓ, em série**: registrar, conferir as quatro telas e desfazer dependem um do outro, e com
 *    `fullyParallel` casos irmãos rodariam em processos diferentes, cada um com a sua semente.
 */
import { expect, test, type Page } from "@playwright/test";

import { semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import {
  bancoDoBloco2,
  maisDias,
  semearBloco2,
  limparBloco2,
  type Bloco2Semeado,
} from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste } from "./conta-de-teste";
import { abrirLinha } from "./linha-expansivel";
import { irAFichaDaTurma } from "./navegar-turmas";

const NOME_A = "Disciplina A do TA fora do DSA";
const NOME_B = "Disciplina B do TA fora do DSA";
const SECAO = '[data-slot="disciplinas-da-turma"]';
const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

let SEMEADO: Bloco2Semeado;
let SIGLA = "";
let INSTRUTOR = "";
let EMAIL_ENC = "";
let EMAIL_OPR = "";
let HOJE = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  HOJE = hojeNaCiaara();
  SIGLA = `CUR-B2TF${p}`;
  INSTRUTOR = `B2TF-INS-${p}`;
  const segunda = semanaDoPainel(HOJE).de;
  /*
   * ⚠️ PEND-019-3 (spec 020, C-16): nada de 2026 escrito à mão — o Início abre no ano de hoje, e em 01/01/2027 a
   *    turma de 2026 sumiria dele sem defeito nenhum no produto. A turma é do ano de hoje; as aulas sem posição caem
   *    na semana ANTERIOR (terça a sexta), que já passou, e o início fica quatro semanas antes.
   */
  const ano = Number(HOJE.slice(0, 4));
  const semanaPassada = (dia: number) => maisDias(segunda, -7 + dia);
  SEMEADO = await semearBloco2({
    sigla: SIGLA,
    nome: `Curso do TA fora do DSA ${p}`,
    disciplinas: [
      { cod: "I", nome: NOME_A, ch: 50 },
      { cod: "II", nome: NOME_B, ch: 50 },
    ],
    turmas: [
      {
        chave: "T",
        semRotulo: true,
        ano,
        status: "ativa",
        inicio: maisDias(segunda, -28),
        termino: maisDias(HOJE, 60),
      },
    ],
    aulas: [
      { sufixo: "A1", turma: "T", cod: "I", data: semanaPassada(1), tempos: 10, taInicial: null },
      { sufixo: "A2", turma: "T", cod: "I", data: semanaPassada(2), tempos: 8, taInicial: null },
      { sufixo: "A3", turma: "T", cod: "I", data: segunda, tempos: 2, taInicial: 1 },
      { sufixo: "B1", turma: "T", cod: "II", data: semanaPassada(3), tempos: 10, taInicial: null },
      { sufixo: "B2", turma: "T", cod: "II", data: semanaPassada(4), tempos: 8, taInicial: null },
      { sufixo: "B3", turma: "T", cod: "II", data: segunda, tempos: 2, taInicial: 3 },
    ],
    instrutorCodigo: INSTRUTOR,
  });
  EMAIL_ENC = emailDeTeste("tafora-enc", p);
  EMAIL_OPR = emailDeTeste("tafora-opr", p);
  await criarConta(EMAIL_ENC, `USR-TFE-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_OPR, `USR-TFO-${p}`, "operador", "regular");
});

test.afterAll(async () => {
  await apagarConta(EMAIL_ENC);
  await apagarConta(EMAIL_OPR);
  await limparBloco2(SIGLA, INSTRUTOR);
});

const turmaCodigo = () => SEMEADO.turmas.T?.codigo as string;

async function registrosNoBanco(): Promise<
  {
    codigo: string;
    tempos: number;
    status: string;
    observacao: string;
    disciplina_id: string;
    data: string;
  }[]
> {
  const { data, error } = await bancoDoBloco2()
    .from("ta_fora_do_dsa")
    .select("codigo, tempos, status, observacao, disciplina_id, data")
    .eq("turma_id", SEMEADO.turmas.T?.id as string)
    .order("codigo");
  if (error) throw new Error(error.message);
  return data as never;
}

const linhaDa = (page: Page, nome: string) =>
  page.locator(`${SECAO} tr`).filter({ hasText: nome }).first();

/** Abre o detalhe da linha (se fechado) e o formulário; devolve o painel. */
async function abrirFormulario(page: Page, nome: string) {
  await expect(page.locator(SECAO)).toBeVisible();
  await abrirLinha(page.locator(SECAO), nome);
  const painel = page.locator(
    '[data-slot="detalhe-da-disciplina-da-turma"] [data-slot="ta-fora-do-dsa"]',
  );
  await expect(painel).toBeVisible();
  // ⚠️ Depois de uma recusa o formulário continua aberto, e o botão de abrir some: só se clica se estiver fechado.
  if (!(await painel.locator('[data-slot="formulario-ta-fora"]').isVisible())) {
    await painel.locator('[data-slot="registrar-ta-fora"]').click();
  }
  await expect(painel.locator('[data-slot="formulario-ta-fora"]')).toBeVisible();
  return painel;
}

async function registrar(
  page: Page,
  nome: string,
  tempos: number,
  observacao: string,
): Promise<void> {
  const painel = await abrirFormulario(page, nome);
  const formulario = painel.locator('[data-slot="formulario-ta-fora"]');
  // ⚠️ A data ABRE com hoje, o de São Paulo (FR-001.1): é o valor do campo, sem ninguém digitar.
  await expect(formulario.locator('input[name="data"]')).toHaveValue(HOJE);
  await formulario.locator('input[name="tempos"]').fill(String(tempos));
  await formulario.locator('textarea[name="observacao"]').fill(observacao);
  await formulario.locator('[data-slot="gravar-ta-fora"]').click();
  await expect(page.locator('[data-slot="ta-fora-gravado"]')).toBeVisible({ timeout: 15_000 });
}

/** A porcentagem da disciplina no painel de situação do DSA desta semana. */
async function percentualNoDsa(page: Page, cod: string): Promise<number> {
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
  const celula = page.locator(
    `[data-slot="quadro-por-disciplina"] tr:has([data-disciplina="${cod}"]) [data-slot="progresso-da-disciplina"]`,
  );
  await expect(celula).toBeVisible();
  return Number(await celula.getAttribute("data-percentual"));
}

test.describe("D-COR-3 · registrar, somar em toda tela, separar e desfazer", () => {
  test("Encarregado: Turmas → turma → disciplina → TA fora do DSA → o banco, a ficha, /inicio, /turmas e o DSA", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const codigo = turmaCodigo();
    const disciplinaA = SEMEADO.disciplinas.I as string;

    /* ── antes: 40 de 100, e 40 % da disciplina A na situação do DSA ───────────────────────── */
    await irAFichaDaTurma(page, EMAIL_ENC, codigo);
    await expect(page.locator('[data-slot="execucao-separada"]')).toHaveCount(0);
    await expect(page.locator('[data-andamento="executada"]')).toContainText("40 TA");
    expect(await percentualNoDsa(page, "I"), "a situação do DSA antes do registro").toBe(40);
    const cartoesAntes = await page.locator('[data-slot="dsa-cartao"]').count();
    expect(cartoesAntes, "a semana tem as duas aulas da grade").toBeGreaterThan(0);
    await page.goBack();
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);

    /* ── a observação é obrigatória: em branco, a tela recusa e o banco não recebe nada ───────── */
    {
      const painel = await abrirFormulario(page, NOME_A);
      const formulario = painel.locator('[data-slot="formulario-ta-fora"]');
      await formulario.locator('input[name="tempos"]').fill("3");
      await formulario.locator('[data-slot="gravar-ta-fora"]').click();
      await expect(painel.locator('[data-slot="erro-ta-fora"]')).toContainText(/obrigat/i);
      expect(await registrosNoBanco(), "observação vazia gravou").toEqual([]);
    }

    /* ── registrar 5 TA na A ──────────────────────────────────────────────────────────────── */
    await registrar(page, NOME_A, 5, `Aula que virou EAD — prova ${codigo}`);
    let banco = await registrosNoBanco();
    expect(banco).toHaveLength(1);
    expect(banco[0]).toMatchObject({
      tempos: 5,
      status: "ativo",
      disciplina_id: disciplinaA,
      data: HOJE,
    });
    const codigoDoRegistroA = banco[0]?.codigo as string;
    expect(codigoDoRegistroA).toMatch(/^TFD-\d{6}$/);

    await expect(page.locator('[data-slot="execucao-separada"]')).toHaveText(
      "45 TA executados · 40 no DSA · 5 fora do DSA",
    );
    await expect(page.locator('[data-andamento="executada"]')).toContainText("45 TA");
    await expect(linhaDa(page, NOME_A).locator('[data-slot="fora-do-dsa-da-linha"]')).toContainText(
      "5 fora do DSA",
    );
    await expect(linhaDa(page, NOME_A)).toContainText("25");

    /* ── o DSA: a situação soma e a grade não ganha cartão (FR-001.6) ──────────────────────── */
    expect(await percentualNoDsa(page, "I"), "a situação do DSA não somou o TA fora do DSA").toBe(
      50,
    );
    await expect(page.locator('[data-slot="dsa-cartao"]')).toHaveCount(cartoesAntes);

    /* ── /inicio e /turmas: 45 de 100 ───────────────────────────────────────────────────────── */
    await MENU(page).getByRole("link", { name: "Início", exact: true }).click();
    const cartao = page.locator(`[data-turma="${codigo}"]`);
    await expect(cartao.locator("[data-progresso]")).toHaveAttribute("data-progresso", "45");
    await expect(cartao).toContainText("45/100 TA");
    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    const linhaDaLista = page
      .locator('[data-slot="lista-de-turmas"] tr')
      .filter({ hasText: codigo });
    await expect(linhaDaLista.locator('[data-slot="coluna-progresso"]')).toHaveAttribute(
      "data-progresso",
      "45",
    );

    /* ── registrar os 30 que faltam na B: ela sai concluída (FR-001.7) ──────────────────────── */
    await linhaDaLista
      .getByRole("link", { name: new RegExp(codigo) })
      .first()
      .click();
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
    await registrar(page, NOME_B, 30, `Histórico do curso que não está no DSA — prova ${codigo}`);
    await expect(linhaDa(page, NOME_B)).toContainText("Concluída");
    await expect(page.locator('[data-slot="execucao-separada"]')).toHaveText(
      "75 TA executados · 40 no DSA · 35 fora do DSA",
    );

    /* ── desfazer o da A: as somas voltam, e o registro fica listado, marcado ─────────────── */
    await abrirLinha(page.locator(SECAO), NOME_A);
    const registroA = page
      .locator('[data-slot="registro-fora-do-dsa"]')
      .filter({ hasText: "5 TA" });
    await registroA.locator('[data-slot="desfazer-ta-fora"]').click();
    await expect(page.locator('[data-slot="ta-fora-desfeito-gravado"]')).toBeVisible({
      timeout: 15_000,
    });
    banco = await registrosNoBanco();
    expect(banco.find((r) => r.codigo === codigoDoRegistroA)?.status).toBe("inativo");
    expect(banco.filter((r) => r.status === "ativo")).toHaveLength(1);

    await expect(page.locator('[data-slot="execucao-separada"]')).toHaveText(
      "70 TA executados · 40 no DSA · 30 fora do DSA",
    );
    await expect(linhaDa(page, NOME_A).locator('[data-slot="fora-do-dsa-da-linha"]')).toHaveCount(
      0,
    );
    await abrirLinha(page.locator(SECAO), NOME_A);
    const desfeito = page.locator('[data-slot="registro-fora-do-dsa"][data-ativo="nao"]');
    await expect(desfeito).toHaveCount(1);
    await expect(desfeito.locator('[data-slot="ta-fora-desfeito"]')).toHaveText("desfeito");
    await expect(desfeito.locator('[data-slot="desfazer-ta-fora"]')).toHaveCount(0);

    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect(
      page
        .locator('[data-slot="lista-de-turmas"] tr')
        .filter({ hasText: codigo })
        .locator('[data-slot="coluna-progresso"]'),
    ).toHaveAttribute("data-progresso", "70");
  });

  test("o Operador lê o painel e NÃO tem o botão de registrar (só o trio registra)", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL_OPR, turmaCodigo());
    await abrirLinha(page.locator(SECAO), NOME_A);
    const painel = page.locator(
      '[data-slot="detalhe-da-disciplina-da-turma"] [data-slot="ta-fora-do-dsa"]',
    );
    await expect(painel).toBeVisible();
    await expect(painel.locator('[data-slot="registrar-ta-fora"]')).toHaveCount(0);
  });
});
