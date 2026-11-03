/**
 * Bloco 18 (spec 033, RA-4, FR-003 e FR-008.2) — o lançamento de ATIVIDADE no DSA: o «Conta como», o palestrante de
 * fora com a OM, o Local pela lista de salas ou em texto livre, e o que cada escolha faz na CH da turma.
 *
 * > *"Lançamento de atividade no DSA ganha: tipo (RA-1), 'Conta como' (TA da disciplina escolhida / AEC / TAD / TR),
 * > vínculo opcional com uma AEC prevista ou uma APOINST planejada, Responsável/Palestrante (instrutor cadastrado OU
 * > texto livre com nome e OM para externo), Local (sala cadastrada OU texto livre). 'Conta como TA da disciplina' soma
 * > na CH da disciplina e do instrutor, como aula."* — `RA-4`, Bernardo Villas Boas, 03/11/2026
 *
 * O percurso, por CLIQUE a partir da lista de turmas (`goto` só no login):
 *   1. uma **Palestra** (tipo AEC) que **conta como TAD**, com **palestrante de fora e OM**, numa **sala da lista**;
 *   2. um **Reforço** (tipo TR) que **conta como TA da disciplina**, com a disciplina, um instrutor **sem habilitação**
 *      na disciplina (D-2: é atividade, não aula) e o local em **texto livre** («Outro local»);
 *   3. o cartão reabre com o «Conta como» e a OM GRAVADOS, e a OM se edita ali;
 *   4. **Salvar a semana** — e só então a CH muda: a TAD sobe 1, a CHD e o «TA da disciplina» sobem 2, a AEC e a TR
 *      não mudam (a Palestra saiu da AEC; o Reforço saiu da TR).
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA CH**: sem o «Conta como» (o comportamento de antes do Bloco 18), a Palestra somaria na
 *    AEC e o Reforço na TR — o mesmo lançamento daria `ta_aec + 1` e `ta_tr + 2`. E antes do Salvar nada muda (RP-0).
 * ⚠️ **A SEMANA É A DE REFERÊNCIA DA SEMENTE** (2026-W15) e as células são da SEXTA (coluna 4), livre na semente; a turma
 *    é a do processo (`semearDsa`), que outro arquivo do mesmo processo também usa — por isso a CH é medida por
 *    DIFERENÇA contra o retrato tirado no começo, e não por número absoluto.
 * ⚠️ **NÃO HÁ NOME REAL AQUI** (repositório público): o palestrante é «Palestrante convidado».
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplina, irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";

test.describe.configure({ mode: "serial" });

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const CARTAO = '[data-slot="acoes-do-bloco"]';
/** Sexta-feira da semana de referência: 1º tempo (a Palestra) e 3º tempo (o Reforço). */
const CELULA_DA_PALESTRA = "0:4";
const CELULA_DO_REFORCO = "2:4";
/** Uma sala da lista que a migration semeia (`20260917210558`), diferente da sala da turma («Sala 03»). */
const SALA_DA_LISTA = "Laboratório de Informática";
const LOCAL_LIVRE = "Pátio de manobras";
const PALESTRANTE = "Palestrante convidado";

let EMAIL = "";
let S: DsaSemeado;
const MARCA = `conta-como-${Date.now().toString(36)}`;
const DESCRICAO_DA_PALESTRA = `Palestra que conta como TAD ${MARCA}`;
const DESCRICAO_DO_REFORCO = `Reforço que conta na disciplina ${MARCA}`;

type CargaDaTurma = {
  readonly ta_aec: number;
  readonly ta_tad: number;
  readonly ta_tr: number;
  readonly chd_executada: number;
  readonly ta_atividade_na_disciplina: number;
};
let ANTES: CargaDaTurma;
let ANTES_NA_DISCIPLINA = 0;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

/** A CH da turma como a ficha a soma (`vw_carga_horaria_turma`). */
async function cargaDaTurma(): Promise<CargaDaTurma> {
  const { data, error } = await banco()
    .from("vw_carga_horaria_turma")
    .select("ta_aec, ta_tad, ta_tr, chd_executada, ta_atividade_na_disciplina")
    .eq("turma_codigo", S.turmaComRelogio)
    .single();
  if (error) throw new Error(`a CH da turma não foi lida: ${error.message}`);
  const l = data as Record<string, number | string | null>;
  return {
    ta_aec: Number(l["ta_aec"] ?? 0),
    ta_tad: Number(l["ta_tad"] ?? 0),
    ta_tr: Number(l["ta_tr"] ?? 0),
    chd_executada: Number(l["chd_executada"] ?? 0),
    ta_atividade_na_disciplina: Number(l["ta_atividade_na_disciplina"] ?? 0),
  };
}

/**
 * O retrato das atividades de TODAS as turmas, salvas e ativas.
 *
 * ⚠️ **ELAS ENTRAM NA AEC/TAD/TR DE TODA TURMA COM DSA NA DATA** (`vw_carga_horaria_turma`, ramo global), e outros
 *    arquivos as criam e apagam em paralelo (`cursos-de-teste.ts`, `dsa-tipo-e-global.spec.ts`) — a turma da semente cobre
 *    o ano inteiro. Com o retrato igual nas duas leituras, a AEC, a TAD e a TR se comparam EXATAS; com ele diferente, só
 *    as colunas que são só da turma (a CHD e o «TA da disciplina»), e a anotação diz por quê. Nunca uma tolerância.
 */
async function globaisSalvas(): Promise<string> {
  const { data, error } = await banco()
    .from("atividades_nao_letivas")
    .select("id, categoria_normativa, conta_como, tempos_consumidos, data")
    .is("turma_id", null)
    .eq("status", "ativo")
    .eq("salvo", true)
    .order("id");
  if (error) throw new Error(`as atividades de todas as turmas não foram lidas: ${error.message}`);
  return JSON.stringify(data ?? []);
}
let GLOBAIS_ANTES = "";

/** Os TA de atividade que contam NA disciplina da semente (`vw_disciplinas_execucao`). */
async function atividadeNaDisciplina(): Promise<number> {
  const { data, error } = await banco()
    .from("vw_disciplinas_execucao")
    .select("ta_atividade_executados")
    .eq("turma_codigo", S.turmaComRelogio)
    .eq("cod_disciplina", S.codDisciplina)
    .single();
  if (error) throw new Error(`a execução da disciplina não foi lida: ${error.message}`);
  return Number((data as { ta_atividade_executados: number | null }).ta_atividade_executados ?? 0);
}

type AtividadeGravada = {
  readonly conta_como: string | null;
  readonly categoria_normativa: string;
  readonly subtipo: string | null;
  readonly responsavel_externo: string | null;
  readonly responsavel_externo_om: string | null;
  readonly instrutor_id: string | null;
  readonly disciplina_id: string | null;
  readonly local: string | null;
  readonly salvo: boolean;
  readonly atividade_prevista_id: string | null;
  readonly apoinst_id: string | null;
};

/** A linha que VALE da atividade: a ativa sem sombra de rascunho (antes do Salvar, o próprio rascunho). */
async function atividadeGravada(descricao: string): Promise<AtividadeGravada | null> {
  const { data, error } = await banco()
    .from("atividades_nao_letivas")
    .select(
      "conta_como, categoria_normativa, subtipo, responsavel_externo, responsavel_externo_om, instrutor_id, disciplina_id, local, salvo, atividade_prevista_id, apoinst_id",
    )
    .eq("descricao", descricao)
    .eq("status", "ativo")
    .is("rascunho_de", null)
    .maybeSingle();
  if (error) throw new Error(`a atividade não foi lida: ${error.message}`);
  return data as AtividadeGravada | null;
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("dsaconta", p);
  await criarConta(EMAIL, `USR-DSACC-${p}`);
  S = await semearDsa(p, EMAIL);
  GLOBAIS_ANTES = await globaisSalvas();
  ANTES = await cargaDaTurma();
  ANTES_NA_DISCIPLINA = await atividadeNaDisciplina();
});

/** As globais mudaram desde o retrato do começo? (ver `globaisSalvas`). */
async function globaisMudaram(): Promise<boolean> {
  const mudaram = (await globaisSalvas()) !== GLOBAIS_ANTES;
  if (mudaram) {
    test.info().annotations.push({
      type: "atividade-de-todas-as-turmas",
      description:
        "Outra suíte criou ou apagou atividade de todas as turmas no meio do caso: AEC, TAD e TR não se comparam exatas nesta rodada; a CHD e o «TA da disciplina», só da turma, sim.",
    });
  }
  return mudaram;
}

test.afterAll(async () => {
  await banco().from("atividades_nao_letivas").delete().like("descricao", `%${MARCA}%`);
  await limparDsa(S);
  await apagarConta(EMAIL);
});

async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

async function abrirCelula(page: Page, celula: string): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
}

/** Espera o desfecho de uma gravação: «fechou», «avisou» ou «recusou: …». */
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

async function lancarEFechar(page: Page): Promise<void> {
  await page.locator('[data-slot="gravar-lancamento"]').click();
  expect(
    await desfecho(page, FORMULARIO, "recusa-do-lancamento", "avisos-do-lancamento"),
  ).not.toMatch(/^recusou/);
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.locator('[data-slot="fechar-formulario"]').click();
  }
}

test("RA-4 · Palestra que conta como TAD, com palestrante de fora e OM, numa sala da lista", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirASemana(page);
  await abrirCelula(page, CELULA_DA_PALESTRA);
  await page.locator('[data-tipo="AEC"]').click();

  /* RA-1 (FR-001.2): o tipo aparece pelo RÓTULO do catálogo — «Atividade Extraclasse», nunca «Extracurricular». */
  const subtipo = page.locator("#dsa-subtipo");
  await expect(subtipo).toContainText("Atividade Extraclasse");
  await expect(subtipo).not.toContainText("Extracurricular");
  await subtipo.selectOption({ label: "Palestra" });

  /* FR-003.2: o «Conta como» nasce com o padrão do tipo (AEC), com as quatro opções. */
  const contaComo = page.locator("#dsa-conta-como");
  await expect(contaComo).toHaveValue("AEC");
  await expect(contaComo.locator("option")).toHaveText(["TA da disciplina", "AEC", "TAD", "TR"]);
  /* Como AEC, a disciplina é opcional; trocada para TAD, ela some (só a AEC e o «TA da disciplina» a levam). */
  await expect(page.locator('label[for="dsa-disciplina"]')).toContainText("opcional");
  await contaComo.selectOption("TAD");
  await expect(page.locator("#dsa-disciplina")).toHaveCount(0);

  /* FR-003.3: o «Cumpre» existe, e diz POR QUE está vazio — a turma da semente não tem AEC prevista nem APOINST. */
  await expect(page.locator("#dsa-vinculo")).toBeVisible();
  await expect(page.locator("#dsa-vinculo-ajuda")).toContainText("não tem AEC prevista");

  await page.locator("#dsa-descricao").fill(DESCRICAO_DA_PALESTRA);
  await page.locator("#dsa-tempos").fill("1");

  /* FR-003.4: o palestrante de fora leva nome e OM. */
  await page.locator("#dsa-responsavel-externo").fill(PALESTRANTE);
  await page.locator("#dsa-responsavel-om").fill("DHN");

  /* FR-003.5: o Local nasce com a sala da turma, escolhida na LISTA — e sem o campo livre à vista. */
  const sala = page.locator("#dsa-sala");
  await expect(sala).toHaveValue(S.sala);
  await expect(page.locator("#dsa-local")).toHaveCount(0);
  await sala.selectOption(SALA_DA_LISTA);

  await lancarEFechar(page);

  await expect
    .poll(() => atividadeGravada(DESCRICAO_DA_PALESTRA), { timeout: 30_000 })
    .not.toBeNull();
  expect(await atividadeGravada(DESCRICAO_DA_PALESTRA)).toMatchObject({
    conta_como: "TAD",
    categoria_normativa: "TAD",
    subtipo: "Palestra",
    responsavel_externo: PALESTRANTE,
    responsavel_externo_om: "DHN",
    instrutor_id: null,
    disciplina_id: null,
    local: SALA_DA_LISTA,
    atividade_prevista_id: null,
    apoinst_id: null,
    /* RP-0: lançar é rascunho. */
    salvo: false,
  });

  /* Na grade, o palestrante de fora sai «Nome (OM)» (FR-003.4). */
  await expect(page.locator(`${GRADE} td[data-celula="${CELULA_DA_PALESTRA}"]`)).toContainText(
    `${PALESTRANTE} (DHN)`,
  );
});

test("RA-4 · Reforço que conta como TA da disciplina, com instrutor sem habilitação (D-2) e local em texto livre", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirASemana(page);
  await abrirCelula(page, CELULA_DO_REFORCO);
  await page.locator('[data-tipo="TR"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Reforço" });

  const contaComo = page.locator("#dsa-conta-como");
  await expect(contaComo).toHaveValue("TR");
  /* TR não leva disciplina; «TA da disciplina» a EXIGE. */
  await expect(page.locator("#dsa-disciplina")).toHaveCount(0);
  await contaComo.selectOption("CHD");
  await expect(page.locator('label[for="dsa-disciplina"]')).not.toContainText("opcional");
  await expect(page.locator("#dsa-disciplina")).toHaveAttribute("required", "");
  await escolherDisciplina(page, S.codDisciplina);

  await page.locator("#dsa-descricao").fill(DESCRICAO_DO_REFORCO);
  await page.locator("#dsa-tempos").fill("2");

  /*
   * ⚠️ D-2 da spec 033: «TA da disciplina» NÃO exige instrutor habilitado — é atividade, não aula (a RD-1 é da aula).
   *    O instrutor escolhido é o da semente SEM vínculo com a disciplina, que a aula recusaria.
   */
  await page.locator(`${FORMULARIO} [data-slot="seletor-instrutor"]`).first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeSemHabilitacao, "i") })
    .first()
    .click();
  /* Com o instrutor do cadastro, o nome livre e a OM somem. */
  await expect(page.locator("#dsa-responsavel-externo")).toHaveCount(0);
  await expect(page.locator("#dsa-responsavel-om")).toHaveCount(0);

  /* FR-003.5: «Outro local» abre o texto livre, que grava no mesmo `local`. */
  await page.locator("#dsa-sala").selectOption("");
  await expect(page.locator("#dsa-local")).toBeVisible();
  await page.locator("#dsa-local").fill(LOCAL_LIVRE);

  await lancarEFechar(page);

  await expect
    .poll(() => atividadeGravada(DESCRICAO_DO_REFORCO), { timeout: 30_000 })
    .not.toBeNull();
  const { data: disciplina } = await banco()
    .from("disciplinas")
    .select("id")
    .eq("cod_disciplina", S.codDisciplina)
    .like("codigo", "DSA-%")
    .maybeSingle();
  const { data: semVinculo } = await banco()
    .from("instrutores")
    .select("id")
    .eq("nome_completo", S.nomeSemHabilitacao);
  const gravada = await atividadeGravada(DESCRICAO_DO_REFORCO);
  expect(gravada).toMatchObject({
    conta_como: "CHD",
    /* O «TA da disciplina» mantém a categoria do TIPO; quem a move para a CHD são as views (D-1). */
    categoria_normativa: "TR",
    subtipo: "Reforço",
    responsavel_externo: null,
    responsavel_externo_om: null,
    local: LOCAL_LIVRE,
    salvo: false,
  });
  expect(gravada?.disciplina_id).toBe((disciplina as { id: string } | null)?.id);
  expect(
    ((semVinculo ?? []) as { id: string }[]).map((i) => i.id),
    "o instrutor gravado não é o sem habilitação",
  ).toContain(gravada?.instrutor_id);
});

test("RA-4 · o cartão reabre com o «Conta como» e a OM gravados, e a OM se edita ali", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirASemana(page);
  await page.locator(`${GRADE} td[data-celula="${CELULA_DA_PALESTRA}"]`).click();
  await expect(page.locator(CARTAO)).toBeInViewport();
  await expect(page.locator("#dsa-editar-conta-como")).toHaveValue("TAD");
  await expect(page.locator("#dsa-editar-responsavel-externo")).toHaveValue(PALESTRANTE);
  await expect(page.locator("#dsa-editar-responsavel-om")).toHaveValue("DHN");

  await page.locator("#dsa-editar-responsavel-om").fill("DPC");
  await page.locator('[data-slot="gravar-edicao"]').click();
  expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(/^recusou/);
  if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");

  await expect
    .poll(async () => (await atividadeGravada(DESCRICAO_DA_PALESTRA))?.responsavel_externo_om, {
      timeout: 30_000,
    })
    .toBe("DPC");
  /* O que não foi tocado no cartão continua como estava (undefined não mexe). */
  expect(await atividadeGravada(DESCRICAO_DA_PALESTRA)).toMatchObject({
    conta_como: "TAD",
    categoria_normativa: "TAD",
    responsavel_externo: PALESTRANTE,
    local: SALA_DA_LISTA,
  });
});

test("RA-4 · só depois de «Salvar a semana» a CH muda: TAD +1, CHD +2; AEC e TR não mudam", async ({
  page,
}) => {
  test.setTimeout(180_000);
  /* RP-0: os dois lançamentos ainda são rascunho — nada mudou na CH. */
  const aindaRascunho = await cargaDaTurma();
  expect(aindaRascunho.chd_executada).toBe(ANTES.chd_executada);
  expect(aindaRascunho.ta_atividade_na_disciplina).toBe(ANTES.ta_atividade_na_disciplina);
  if (!(await globaisMudaram())) expect(aindaRascunho).toEqual(ANTES);

  await abrirASemana(page);
  await salvarASemana(page);

  /* O que é só da turma: a CHD e o «TA da disciplina» sobem os 2 TA do Reforço. */
  await expect
    .poll(async () => (await cargaDaTurma()).ta_atividade_na_disciplina, { timeout: 30_000 })
    .toBe(ANTES.ta_atividade_na_disciplina + 2);
  const depois = await cargaDaTurma();
  expect(depois.chd_executada).toBe(ANTES.chd_executada + 2);
  /* E na CH da disciplina escolhida, como aula (FR-003.2). */
  expect(await atividadeNaDisciplina()).toBe(ANTES_NA_DISCIPLINA + 2);
  if (!(await globaisMudaram())) {
    expect(depois).toEqual({
      /* ⚠️ O caso que discrimina: sem o «Conta como», a Palestra somaria aqui (+1) e o Reforço na TR (+2). */
      ta_aec: ANTES.ta_aec,
      ta_tad: ANTES.ta_tad + 1,
      ta_tr: ANTES.ta_tr,
      chd_executada: ANTES.chd_executada + 2,
      ta_atividade_na_disciplina: ANTES.ta_atividade_na_disciplina + 2,
    });
  }

  /* Os dois salvos, com as escolhas de antes. */
  expect(await atividadeGravada(DESCRICAO_DA_PALESTRA)).toMatchObject({
    conta_como: "TAD",
    responsavel_externo_om: "DPC",
    salvo: true,
  });
  expect(await atividadeGravada(DESCRICAO_DO_REFORCO)).toMatchObject({
    conta_como: "CHD",
    salvo: true,
  });
});
