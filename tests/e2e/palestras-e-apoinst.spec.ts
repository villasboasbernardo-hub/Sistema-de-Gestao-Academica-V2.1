/**
 * Bloco 18 (spec 033), RA-5 e RA-6 — **as Palestras e a APOINST, por clique**: a AEC prevista do currículo na aba
 * *Palestras* da turma (a cumprir → *Registrar cumprimento* → «Cumprida (à mão)» → *Desfazer*), a *Nova APOINST* na aba
 * *APOINST* do módulo Atividades, e a turma de ano anterior a `apoinst.ano_inicial`, que diz por que não tem APOINST.
 *
 * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…) OU marcada à mão pelo trio
 * > (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha (…). APOINST: planejada no módulo Atividades pelo
 * > trio, por turma (…). Só turmas de 2027 em diante; as de 2026 ficam como estão, sem retroajuste."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * O caso que discrimina (DoD 8): o OPERADOR lança o DSA e lê as duas abas, mas não é do trio — não ganha o
 * *Registrar cumprimento* nem a *Nova APOINST* (o banco recusaria; a prova de permissão é a de RLS, com sessão real).
 *
 * ⚠️ `goto` só no ponto de partida (`entrar`) e no ano fora do seletor (`escolherAno`, o link com `?ano=`). A prova da
 *    gravação é a CONFIRMAÇÃO da tela **e** a LINHA no banco (PEND-016-2), nunca o campo digitado.
 * ⚠️ IDEMPOTENTE (regra 9.1): o curso é reaproveitado; as marcações, a APOINST, a AEC prevista, a designação e as turmas
 *    da rodada anterior saem no preparo — nessa ordem, porque as FKs são `restrict`. Cada caso também limpa o que ele
 *    mesmo grava antes de começar, porque com `retries` a repetição cai no mesmo processo e na mesma semente.
 * ⚠️ A TURMA NOVA MORA EM 2048 (longe da atividade GLOBAL de 10/05/2026 de outras amostras, PEND-021-2, e do recorte do
 *    Início, PEND-022-1). A ANTIGA é de DOIS anos antes do parâmetro, lido do banco — nunca um ano escrito aqui como
 *    regra; em 2026 ela cairia no ano de hoje, que outras amostras contam.
 */
import { expect, test, type Page } from "@playwright/test";

import { bancoDoBloco2, limparBloco2, semearBloco2, type Bloco2Semeado } from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherAno } from "./paineis";

const ANO = 2048;
const NOME_DA_PREVISTA = "Palestra de segurança da amostra das Palestras";
const NOME_DA_APOINST = "Prática de sondagem da amostra";
/** A APOINST que o caso do Operador grava para ele mesmo (achado 27): o caso não depende do Encarregado. */
const NOME_DA_APOINST_DO_OPERADOR = "Prática de balizamento da amostra";
const JUSTIFICATIVA_DO_REGISTRO =
  "Palestra dada antes da virada para o sistema, conferida na pasta do curso.";
const JUSTIFICATIVA_DO_DESFAZER = "Registrada na turma errada; volta ao que o DSA diz.";
const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

let SEMEADO: Bloco2Semeado;
let SIGLA = "";
let INSTRUTOR = "";
let EMAIL_ENC = "";
let EMAIL_OPR = "";
let ANO_INICIAL = 0;
let ANO_ANTIGO = 0;
let PREVISTA_ID = "";
let PREVISTA_CODIGO = "";

function conferir(oQue: string, error: { message: string } | null): void {
  if (error) throw new Error(`amostra das Palestras e da APOINST — ${oQue}: ${error.message}`);
}

const banco = () => bancoDoBloco2();
const turmaNova = () => SEMEADO.turmas.N as { id: string; codigo: string };
const turmaAntiga = () => SEMEADO.turmas.V as { id: string; codigo: string };

/** O que esta amostra grava por cima da semente do Bloco 2 — sai ANTES dela (FKs `restrict`). */
async function limparPlanejado(sigla: string): Promise<void> {
  const { data: curso } = await banco()
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  if (!curso) return;
  const cursoId = (curso as { id: string }).id;
  const { data: turmas, error } = await banco().from("turmas").select("id").eq("curso_id", cursoId);
  conferir("ler as turmas", error);
  const ids = ((turmas ?? []) as { id: string }[]).map((t) => t.id);
  if (ids.length > 0) {
    conferir(
      "marcações",
      (await banco().from("marcacoes_de_atividade").delete().in("turma_id", ids)).error,
    );
    conferir(
      "APOINST",
      (await banco().from("apoinst_planejadas").delete().in("turma_id", ids)).error,
    );
  }
  conferir(
    "AEC previstas",
    (await banco().from("aec_previstas_curriculo").delete().eq("curso_id", cursoId)).error,
  );
}

async function idDoTipo(valor: string): Promise<string> {
  const { data, error } = await banco()
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_atividade")
    .eq("valor", valor)
    .single();
  conferir(`tipo ${valor}`, error);
  return (data as { id: string }).id;
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  SIGLA = `CUR-PAP${p}`;
  INSTRUTOR = `PAP-INS-${p}`;
  EMAIL_ENC = emailDeTeste("palestras-enc", p);
  EMAIL_OPR = emailDeTeste("palestras-opr", p);

  /* O ano inicial da APOINST é PARÂMETRO (regra 8): lido do banco, nunca escrito aqui. */
  const { data: parametro, error: erroParametro } = await banco()
    .from("config_parametros")
    .select("valor")
    .eq("chave", "apoinst.ano_inicial")
    .eq("status", "ativo")
    .is("ano_vigencia", null)
    .single();
  conferir("o parâmetro apoinst.ano_inicial", erroParametro);
  ANO_INICIAL = Number((parametro as { valor: string }).valor);
  expect(ANO, "a turma nova tem de ser do ano inicial em diante").toBeGreaterThanOrEqual(
    ANO_INICIAL,
  );
  ANO_ANTIGO = ANO_INICIAL - 2;

  await limparPlanejado(SIGLA);
  SEMEADO = await semearBloco2({
    sigla: SIGLA,
    nome: `Curso das Palestras e da APOINST ${p}`,
    disciplinas: [{ cod: "I", nome: `Disciplina da APOINST ${p}`, ch: 40 }],
    turmas: [
      {
        chave: "N",
        semRotulo: true,
        ano: ANO,
        status: "ativa",
        inicio: `${ANO}-02-03`,
        termino: `${ANO}-11-27`,
      },
      {
        chave: "V",
        semRotulo: true,
        ano: ANO_ANTIGO,
        status: "concluida",
        inicio: `${ANO_ANTIGO}-03-03`,
        termino: `${ANO_ANTIGO}-10-31`,
      },
    ],
    aulas: [],
    instrutorCodigo: INSTRUTOR,
  });

  /* O instrutor DESIGNADO na disciplina da turma nova — é ele que o gatilho da APOINST aceita como responsável. */
  conferir(
    "designação",
    (
      await banco()
        .from("turma_disciplina_instrutor")
        .insert({
          codigo: `${SIGLA}-TDI-N`,
          turma_disciplina_id: SEMEADO.linhas["N|I"] as string,
          instrutor_id: SEMEADO.instrutorId,
          status: "ativo",
        })
    ).error,
  );

  /* A AEC prevista do currículo DA TURMA (RA-3: nada se copia — a turma a herda pelo currículo). */
  const { data: turma, error: erroTurma } = await banco()
    .from("turmas")
    .select("curriculo_id")
    .eq("id", turmaNova().id)
    .single();
  conferir("o currículo da turma", erroTurma);
  const curriculoId = (turma as { curriculo_id: string | null }).curriculo_id;
  if (!curriculoId) throw new Error("a turma da amostra nasceu sem currículo");
  PREVISTA_ID = crypto.randomUUID();
  conferir(
    "AEC prevista",
    (
      await banco()
        .from("aec_previstas_curriculo")
        .insert({
          id: PREVISTA_ID,
          curso_id: SEMEADO.cursoId,
          curriculo_id: curriculoId,
          nome: NOME_DA_PREVISTA,
          tipo_atividade_id: await idDoTipo("Palestra"),
          ta_previstos: 2,
          obrigatoria: true,
          ordem: 1,
        })
    ).error,
  );
  const { data: prevista, error: erroPrevista } = await banco()
    .from("aec_previstas_curriculo")
    .select("codigo")
    .eq("id", PREVISTA_ID)
    .single();
  conferir("o código da AEC prevista", erroPrevista);
  PREVISTA_CODIGO = (prevista as { codigo: string }).codigo;

  await criarConta(EMAIL_ENC, `USR-PAPE-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_OPR, `USR-PAPO-${p}`, "operador", "regular");
});

test.afterAll(async () => {
  await apagarConta(EMAIL_ENC);
  await apagarConta(EMAIL_OPR);
  await limparPlanejado(SIGLA);
  await limparBloco2(SIGLA, INSTRUTOR);
});

async function marcacoesNoBanco() {
  const { data, error } = await banco()
    .from("marcacoes_de_atividade")
    .select(
      "situacao, atividade_prevista_id, apoinst_id, justificativa, autor_nome, data_realizada, status",
    )
    .eq("turma_id", turmaNova().id)
    .order("criado_em");
  conferir("ler as marcações", error);
  return (data ?? []) as {
    situacao: string;
    atividade_prevista_id: string | null;
    apoinst_id: string | null;
    justificativa: string;
    autor_nome: string | null;
    data_realizada: string | null;
    status: string;
  }[];
}

async function apoinstNoBanco() {
  const { data, error } = await banco()
    .from("apoinst_planejadas")
    .select(
      "codigo, nome, disciplina_id, instrutor_id, inicio_previsto, fim_previsto, ta_previstos, status, criado_por",
    )
    .eq("turma_id", turmaNova().id)
    .order("codigo");
  conferir("ler a APOINST", error);
  return (data ?? []) as {
    codigo: string;
    nome: string;
    disciplina_id: string;
    instrutor_id: string;
    inicio_previsto: string;
    fim_previsto: string;
    ta_previstos: number;
    status: string;
    criado_por: string | null;
  }[];
}

/** Na ficha: a aba pelo clique, e a URL dona dela. */
async function abrirAbaDaTurma(page: Page, rotulo: "Palestras" | "APOINST"): Promise<void> {
  const abas = page.getByRole("tablist", { name: "Seções da turma" });
  await expect(abas.getByRole("tab")).toHaveText([
    "Ficha",
    "Avaliações",
    "Atividades",
    "APOINST",
    "Palestras",
  ]);
  await abas.getByRole("tab", { name: rotulo, exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("aba"))
    .toBe(rotulo === "Palestras" ? "palestras" : "apoinst");
}

/** Menu → Atividades → a aba pelo clique → o ano (o da turma, RA-7). */
async function abrirAbaDoModulo(
  page: Page,
  email: string,
  rotulo: "Palestras" | "APOINST",
  ano: number,
) {
  await entrar(page, email, "/inicio");
  await MENU(page).getByRole("link", { name: "Atividades", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
  const abas = page.getByRole("tablist", { name: "Seções de Atividades" });
  await abas.getByRole("tab", { name: rotulo, exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("aba"))
    .toBe(rotulo === "Palestras" ? "palestras" : "apoinst");
  await escolherAno(page, ano);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("aba"))
    .toBe(rotulo === "Palestras" ? "palestras" : "apoinst");
}

const linhaDaPrevista = (page: Page) =>
  page
    .locator('[data-slot="palestras-da-turma"] tr')
    .filter({ has: page.locator(`[data-prevista="${PREVISTA_CODIGO}"]`) });

test.describe("RA-5 · a AEC prevista do currículo na aba Palestras da turma", () => {
  test("Encarregado: Turmas → a turma → Palestras → «A cumprir» → Registrar cumprimento → «Cumprida (à mão)» e a linha no banco → Desfazer", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    conferir(
      "marcações da rodada anterior",
      (await banco().from("marcacoes_de_atividade").delete().eq("turma_id", turmaNova().id)).error,
    );

    await irAFichaDaTurma(page, EMAIL_ENC, turmaNova().codigo);
    await abrirAbaDaTurma(page, "Palestras");
    await expect(page.locator('[data-slot="aba-palestras-em-breve"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="palestras-da-turma"]')).toBeVisible();
    await expect(page.locator('[data-slot="resumo-das-palestras"]')).toContainText(
      "0 de 1 AEC previstas do currículo cumpridas",
    );

    /* ── herdada do currículo: «A cumprir», 0 de 2 TA ───────────────────────────────────────────── */
    const linha = linhaDaPrevista(page);
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
      "data-situacao",
      "a_cumprir",
    );
    await expect(linha).toContainText(NOME_DA_PREVISTA);
    await expect(linha).toContainText("A cumprir");
    await expect(linha).toContainText("0 de 2 TA");
    await expect(linha).toContainText("obrigatória");
    await expect(linha.locator('[data-slot="desfazer-marcacao"]')).toHaveCount(0);

    /* ── Registrar cumprimento: o ícone, o diálogo, a justificativa ─────────────────────────────── */
    await linha.locator('[data-slot="registrar-marcacao"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-marcacao"]');
    await expect(dialogo.locator('[data-slot="formulario-da-marcacao"]')).toBeVisible();
    await dialogo
      .locator('[data-slot="justificativa-da-marcacao"]')
      .fill(JUSTIFICATIVA_DO_REGISTRO);
    await dialogo.locator('[data-slot="gravar-marcacao"]').click();
    await expect(page.locator('[data-slot="marcacao-gravada"]')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => new URL(page.url()).searchParams.get("gravada")).toBe("marcacao");

    let banco1 = await marcacoesNoBanco();
    expect(banco1).toHaveLength(1);
    expect(banco1[0]).toMatchObject({
      situacao: "cumprida",
      atividade_prevista_id: PREVISTA_ID,
      apoinst_id: null,
      justificativa: JUSTIFICATIVA_DO_REGISTRO,
      data_realizada: null,
      status: "ativo",
    });
    expect(banco1[0]?.autor_nome, "o banco carimba o autor pela sessão").toBeTruthy();

    await expect(
      linhaDaPrevista(page).locator('[data-slot="situacao-da-prevista"]'),
    ).toHaveAttribute("data-situacao", "cumprida_a_mao");
    await expect(linhaDaPrevista(page)).toContainText("Cumprida (à mão)");
    await expect(
      linhaDaPrevista(page).locator('[data-slot="historico-da-marcacao"] li'),
    ).toHaveCount(1);
    await expect(
      linhaDaPrevista(page).locator('[data-slot="historico-da-marcacao"]'),
    ).toContainText(JUSTIFICATIVA_DO_REGISTRO);
    await expect(page.locator('[data-slot="resumo-das-palestras"]')).toContainText(
      "1 de 1 AEC previstas do currículo cumpridas",
    );

    /* ── Desfazer: uma marcação NOVA (só de acréscimo), a linha volta ao que o DSA diz ─────────── */
    await linhaDaPrevista(page).locator('[data-slot="desfazer-marcacao"]').click();
    const desfazer = page.locator('[data-slot="dialogo-de-desfazer-marcacao"]');
    await expect(desfazer.locator('[data-slot="formulario-da-marcacao"]')).toBeVisible();
    await expect(desfazer.locator('input[type="date"]'), "o Desfazer não leva data").toHaveCount(0);
    await desfazer
      .locator('[data-slot="justificativa-da-marcacao"]')
      .fill(JUSTIFICATIVA_DO_DESFAZER);
    await desfazer.locator('[data-slot="gravar-marcacao"]').click();
    await expect(page.locator('[data-slot="marcacao-desfeita-gravada"]')).toBeVisible({
      timeout: 15_000,
    });

    banco1 = await marcacoesNoBanco();
    expect(
      banco1.map((m) => m.situacao),
      "a primeira marcação continua (só de acréscimo)",
    ).toEqual(["cumprida", "a_cumprir"]);
    await expect(
      linhaDaPrevista(page).locator('[data-slot="situacao-da-prevista"]'),
    ).toHaveAttribute("data-situacao", "a_cumprir");
    await expect(
      linhaDaPrevista(page).locator('[data-slot="historico-da-marcacao"] li'),
    ).toHaveCount(2);
    await expect(linhaDaPrevista(page).locator('[data-slot="registrar-marcacao"]')).toHaveCount(1);
  });

  test("o Operador lê a aba Palestras e NÃO tem o Registrar cumprimento (só o trio marca)", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL_OPR, turmaNova().codigo);
    await abrirAbaDaTurma(page, "Palestras");
    await expect(linhaDaPrevista(page)).toHaveCount(1);
    await expect(linhaDaPrevista(page)).toContainText(NOME_DA_PREVISTA);
    await expect(
      page.locator('[data-slot="palestras-da-turma"] [data-slot="registrar-marcacao"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-slot="palestras-da-turma"] [data-slot="desfazer-marcacao"]'),
    ).toHaveCount(0);
  });
});

test.describe("RA-6 · a APOINST planejada no módulo Atividades", () => {
  test("Encarregado: Atividades → APOINST → Nova APOINST → a linha no banco e na tabela → Desativar e Reativar", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    conferir(
      "marcações da rodada anterior",
      (
        await banco()
          .from("marcacoes_de_atividade")
          .delete()
          .eq("turma_id", turmaNova().id)
          .not("apoinst_id", "is", null)
      ).error,
    );
    conferir(
      "APOINST da rodada anterior",
      (await banco().from("apoinst_planejadas").delete().eq("turma_id", turmaNova().id)).error,
    );

    await abrirAbaDoModulo(page, EMAIL_ENC, "APOINST", ANO);
    /*
     * D-14: a ordem do pedido — Atividades · Palestras · APOINST, e o Calendário por último (para quem o tem).
     * ⚠️ `allTextContents` NÃO ESPERA (medido em 03/11/2026: a lista saiu vazia, a aba ainda desenhando): primeiro a
     *    contagem da aba à vista, que reexecuta, e só depois a leitura dos rótulos.
     */
    await expect(page.locator('[data-slot="contagem-de-apoinst"]')).toBeVisible();
    const abas = page.getByRole("tablist", { name: "Seções de Atividades" }).getByRole("tab");
    await expect(abas.nth(2)).toHaveText("APOINST");
    const rotulos = await abas.allTextContents();
    expect(rotulos.slice(0, 3)).toEqual(["Atividades", "Palestras", "APOINST"]);
    if (rotulos.length === 4) expect(rotulos[3]).toBe("Calendário");
    await expect(page.locator('[data-slot="aba-apoinst-em-breve"]')).toHaveCount(0);

    /* ── Nova APOINST: turma (seletor único), nome, disciplina, o DESIGNADO, período e TA ────────── */
    await page.locator('[data-slot="abrir-nova-apoinst"]').click();
    const dialogo = page.locator('[data-slot="dialogo-da-apoinst"]');
    await expect(dialogo.locator('[data-slot="formulario-da-apoinst"]')).toBeVisible();
    /*
     * ⚠️ COM UMA TURMA SÓ QUE RECEBE APOINST NO ANO, o formulário não mostra o seletor: diz «Turma: <código>» (medido em
     *    03/11/2026, na base limpa do e2e). Com mais de uma, o seletor único (SC-004). Os dois caminhos levam à mesma turma.
     */
    const seletor = dialogo.locator('[data-slot="seletor-turma"]');
    const turmaUnica = dialogo.locator('[data-slot="turma-da-apoinst"]');
    await expect(seletor.or(turmaUnica)).toBeVisible();
    if (await seletor.isVisible()) {
      await seletor.click();
      await page.getByRole("option", { name: turmaNova().codigo, exact: true }).click();
    } else {
      await expect(turmaUnica).toContainText(turmaNova().codigo);
    }
    await dialogo.locator('[data-slot="nome-da-apoinst"]').fill(NOME_DA_APOINST);
    await dialogo.getByLabel("Disciplina da turma").selectOption(SEMEADO.disciplinas.I as string);
    await dialogo.locator('[data-slot="seletor-instrutor"]').click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByRole("option", { name: new RegExp(INSTRUTOR, "i") })
      .first()
      .click();
    await dialogo.getByLabel("Início previsto").fill(`${ANO}-04-06`);
    await dialogo.getByLabel("Fim previsto").fill(`${ANO}-04-17`);
    await dialogo.getByLabel("TA previstos").fill("6");
    await dialogo.locator('[data-slot="gravar-apoinst"]').click();
    await expect(page.locator('[data-slot="resposta-da-nova-apoinst"]')).toContainText(
      turmaNova().codigo,
      {
        timeout: 15_000,
      },
    );

    const gravadas = await apoinstNoBanco();
    expect(gravadas).toHaveLength(1);
    expect(gravadas[0]).toMatchObject({
      nome: NOME_DA_APOINST,
      disciplina_id: SEMEADO.disciplinas.I,
      instrutor_id: SEMEADO.instrutorId,
      inicio_previsto: `${ANO}-04-06`,
      fim_previsto: `${ANO}-04-17`,
      ta_previstos: 6,
      status: "ativo",
    });
    expect(gravadas[0]?.criado_por, "gravada com a sessão de quem planejou").toBeTruthy();
    const codigo = gravadas[0]?.codigo as string;

    /* ── a linha: Planejada (sem lançamento, fim no futuro), previsto × realizado ───────────────── */
    const linha = page
      .locator('[data-slot="quadro-de-apoinst"] tr')
      .filter({ has: page.locator(`[data-apoinst="${codigo}"]`) });
    await expect(linha).toHaveCount(1, { timeout: 15_000 });
    await expect(linha.locator('[data-slot="situacao-da-apoinst"]')).toHaveAttribute(
      "data-situacao",
      "planejada",
    );
    await expect(linha).toContainText(turmaNova().codigo);
    await expect(linha.locator('[data-slot="ta-da-apoinst"]')).toContainText("0 de 6 TA");
    await expect(linha.locator('[data-slot="ta-da-apoinst"]')).toContainText("faltam 6");
    await expect(linha.locator('[data-slot="periodo-realizado"]')).toHaveText("—");
    /* RT-2 e regra 4: o Excluir existe, indisponível — a APOINST é registro. */
    await expect(linha.locator('[data-slot="excluir-apoinst"]')).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    /* ── Desativar (exclusão lógica) e Reativar, com confirmação ──────────────────────────────── */
    await linha.locator('[data-slot="desativar-apoinst"]').click();
    await page
      .locator('[data-slot="dialogo-confirmacao"]')
      .getByRole("button", { name: "Desativar" })
      .click();
    await expect(page.locator('[data-slot="resposta-da-apoinst"]')).toContainText(
      "APOINST desativada",
      {
        timeout: 15_000,
      },
    );
    await expect.poll(async () => (await apoinstNoBanco())[0]?.status).toBe("inativo");
    await expect(linha.locator('[data-slot="situacao-da-apoinst"]')).toHaveAttribute(
      "data-situacao",
      "desativada",
    );

    await linha.locator('[data-slot="reativar-apoinst"]').click();
    await page
      .locator('[data-slot="dialogo-confirmacao"]')
      .getByRole("button", { name: "Reativar" })
      .click();
    await expect(page.locator('[data-slot="resposta-da-apoinst"]')).toContainText(
      "APOINST reativada",
      {
        timeout: 15_000,
      },
    );
    await expect.poll(async () => (await apoinstNoBanco())[0]?.status).toBe("ativo");
    await expect(linha.locator('[data-slot="situacao-da-apoinst"]')).toHaveAttribute(
      "data-situacao",
      "planejada",
    );
  });

  test("o Operador lê a aba APOINST do módulo — a linha está lá — e NÃO tem a Nova APOINST nem as ações da linha (só o trio planeja)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    /*
     * ⚠️ INDEPENDENTE DO CASO DO ENCARREGADO (achado 27 da revisão do Bloco 18, 03/11/2026): sem modo serial e com
     *    `fullyParallel`, os casos deste arquivo se repartem em grupos, cada grupo com o seu `beforeAll` (a sua semente)
     *    e o seu `afterAll` (que apaga a APOINST). Com dois processos, este caso abre o 2º grupo, onde a APOINST do
     *    Encarregado nunca existe — e «nenhuma ação na linha» passava sobre uma lista VAZIA. A APOINST deste caso é
     *    gravada aqui, sem sessão (a carga), no instrutor designado na disciplina da turma (o gatilho o exige).
     */
    conferir(
      "marcações da rodada anterior",
      (
        await banco()
          .from("marcacoes_de_atividade")
          .delete()
          .eq("turma_id", turmaNova().id)
          .not("apoinst_id", "is", null)
      ).error,
    );
    conferir(
      "APOINST da rodada anterior",
      (await banco().from("apoinst_planejadas").delete().eq("turma_id", turmaNova().id)).error,
    );
    conferir(
      "a APOINST do caso do Operador",
      (
        await banco()
          .from("apoinst_planejadas")
          .insert({
            turma_id: turmaNova().id,
            disciplina_id: SEMEADO.disciplinas.I,
            instrutor_id: SEMEADO.instrutorId,
            nome: NOME_DA_APOINST_DO_OPERADOR,
            inicio_previsto: `${ANO}-05-03`,
            fim_previsto: `${ANO}-05-14`,
            ta_previstos: 4,
            status: "ativo",
          })
      ).error,
    );
    const gravadas = await apoinstNoBanco();
    expect(gravadas, "a APOINST do caso do Operador não foi gravada").toHaveLength(1);
    const codigo = gravadas[0]?.codigo as string;

    await abrirAbaDoModulo(page, EMAIL_OPR, "APOINST", ANO);
    await expect(page.locator('[data-slot="contagem-de-apoinst"]')).toBeVisible();
    /* O CONTROLE POSITIVO: a linha está na tabela — só então a falta das ações diz alguma coisa. */
    const linha = page
      .locator('[data-slot="quadro-de-apoinst"] tr')
      .filter({ has: page.locator(`[data-apoinst="${codigo}"]`) });
    await expect(linha).toHaveCount(1, { timeout: 15_000 });
    await expect(linha).toContainText(NOME_DA_APOINST_DO_OPERADOR);
    await expect(linha.locator('[data-slot="situacao-da-apoinst"]')).toHaveAttribute(
      "data-situacao",
      "planejada",
    );

    /* O caso que discrimina (DoD 8): o Operador lê, mas não planeja — nem a Nova APOINST, nem as ações da linha. */
    await expect(page.locator('[data-slot="abrir-nova-apoinst"]')).toHaveCount(0);
    await expect(linha.locator('[data-slot="acoes-da-apoinst"]')).toHaveCount(0);
    await expect(linha.locator('[data-slot="desativar-apoinst"]')).toHaveCount(0);
    await expect(
      page.locator('[data-slot="quadro-de-apoinst"] [data-slot="acoes-da-apoinst"]'),
    ).toHaveCount(0);
  });
});

test.describe("RA-6 · a turma de ano anterior a apoinst.ano_inicial não tem APOINST", () => {
  test("Encarregado: a ficha da turma antiga → APOINST diz por quê, sem Nova APOINST; e o módulo, no ano dela, também", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL_ENC, turmaAntiga().codigo);
    await abrirAbaDaTurma(page, "APOINST");
    const aviso = page.locator('[data-slot="apoinst-nao-se-aplica"]');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(`turmas de ${ANO_INICIAL} em diante`);
    await expect(aviso).toContainText(`Esta turma é de ${ANO_ANTIGO}`);
    await expect(page.locator('[data-slot="abrir-nova-apoinst"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="aba-apoinst-em-breve"]')).toHaveCount(0);

    /* O módulo, no ano da turma antiga: o mesmo porquê, e nenhuma Nova APOINST. */
    await MENU(page).getByRole("link", { name: "Atividades", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
    await page
      .getByRole("tablist", { name: "Seções de Atividades" })
      .getByRole("tab", { name: "APOINST" })
      .click();
    await expect.poll(() => new URL(page.url()).searchParams.get("aba")).toBe("apoinst");
    await escolherAno(page, ANO_ANTIGO);
    await expect(page.locator('[data-slot="apoinst-nao-se-aplica"]')).toContainText(
      `turmas de ${ANO_INICIAL} em diante`,
    );
    await expect(page.locator('[data-slot="abrir-nova-apoinst"]')).toHaveCount(0);
  });
});
