/**
 * Spec 024 (Bloco 9) — o rascunho e a publicação do DSA, por clique (SC-001 a SC-004), e a EAD sem contagem (SC-007).
 *
 *   1. Lançar no DSA é RASCUNHO: o cartão diz «não salvo» e a CH da turma não muda; a prévia pede salvar.
 *   2. Salvar: conta. Gerar prévia: o papel sai com PRÉVIA e ALT em branco.
 *   3. Publicar: a semana trava (o painel oferece só «Fazer alteração»).
 *   4. Fazer alteração → lançar → Publicar alteração: sem justificativa é recusado; com ela, ALT 1.
 *   5. Reimprimir: a original sai com «ALT —», a ALT 1 com «ALT 1».
 *   6. Descartar rascunho: o lançamento sai da grade e fica INATIVO no banco (não apagado).
 *   7. A turma EAD: o andamento da ficha diz que o controle é da Divisão de Ensino a Distância.
 *
 * ⚠️ `goto` só no login (e para voltar da impressão). ⚠️ **AS SEMANAS 9 E 10 DE 2026** (23/02 a 06/03): a semente do DSA
 *    lança na 15, e a trava é por turma — cada processo tem a sua turma, nenhuma outra suíte toca estas semanas.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia } from "./percurso-do-dsa";
import { dataComDiaDaSemana } from "@/lib/formato/data";

test.describe.configure({ mode: "serial" });

const ANO = 2026;
const SEMANA = 9;
const SEGUNDA = "2026-02-23";
const TERCA = "2026-02-24";
const QUARTA = "2026-02-25";
const SEMANA_DO_DESCARTE = 10;
const SEGUNDA_DO_DESCARTE = "2026-03-02";

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
const topico = (n: string) => `Aula B9 ${n} ${MARCA}`;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function idDaTurma(): Promise<string> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  return (data as { id: string }).id;
}

async function taDaTurma(): Promise<number> {
  const { data } = await banco()
    .from("vw_carga_horaria_turma")
    .select("ta_aula")
    .eq("turma_codigo", S.turmaComRelogio)
    .single();
  return Number((data as { ta_aula: number }).ta_aula);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  MARCA = `p${p}`;
  ADMIN = emailDeTeste("publicacao", p);
  await criarConta(ADMIN, `USR-PUB-${p}`);
  S = await semearDsa(p, ADMIN);
});

test.afterAll(async () => {
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B9 % ${MARCA}`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

async function abrirASemana(page: Page, segunda: string, semana: number): Promise<void> {
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segunda, semana, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function lancarAula(page: Page, ta: number, dia: string, texto: string): Promise<void> {
  await celula(page, ta, dia).click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(texto);
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
}

const situacao = (page: Page) => page.locator('[data-slot="publicacao-do-dsa"]');

test("SC-001/SC-003/SC-004 · rascunho → salvar → prévia → publicar → alteração (ALT 1) → reimprimir", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const antes = await taDaTurma();
  await abrirASemana(page, SEGUNDA, SEMANA);
  await expect(situacao(page)).toHaveAttribute("data-situacao", "em_preenchimento");

  /* 1. Lançar é rascunho: «não salvo», e a CH não muda. */
  await lancarAula(page, 3, TERCA, topico("um"));
  await expect(page.locator('[data-slot="nao-salvo"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="nao-salvos"]')).toContainText("1 lançamento não salvo");
  const { data: rascunho } = await banco()
    .from("registros_aula")
    .select("salvo")
    .eq("conteudo_resumo", topico("um"))
    .single();
  expect((rascunho as { salvo: boolean }).salvo).toBe(false);
  expect(await taDaTurma(), "o rascunho NÃO conta (RP-8)").toBe(antes);
  await expect(page.locator('[data-slot="imprimir-dsa"]')).toHaveAttribute(
    "data-desabilitado",
    "sim",
  );

  /* 2. Salvar: conta. */
  await page.locator('[data-slot="salvar-semana"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("Semana salva");
  await expect(situacao(page)).toHaveAttribute("data-situacao", "registrado");
  await expect.poll(taDaTurma).toBe(antes + 1);

  /* Gerar prévia: PRÉVIA e ALT em branco. */
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveText("PRÉVIA");
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT —");
  await page.goBack();
  await expect(situacao(page)).toBeVisible();

  /* 3. Publicar: trava. */
  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Semana publicada (original)",
  );
  await expect(situacao(page)).toHaveAttribute("data-situacao", "publicado");
  await expect(page.locator('[data-slot="fazer-alteracao"]')).toBeVisible();
  await expect(page.locator('[data-slot="salvar-semana"]')).toHaveCount(0);
  await expect(page.locator('[data-versao="0"]')).toContainText("Original");

  /* 4. Fazer alteração → lançar → publicar alteração (sem e com justificativa). */
  await page.locator('[data-slot="fazer-alteracao"]').click();
  await expect(situacao(page)).toHaveAttribute("data-situacao", "alteracao_em_andamento");
  await lancarAula(page, 3, QUARTA, topico("dois"));
  await expect(page.locator('[data-slot="nao-salvos"]')).toContainText("1 lançamento não salvo");
  await page.locator('[data-slot="publicar-alteracao"]').click();
  const form = page.locator('[data-slot="formulario-da-alteracao"]');
  await form.locator("#justificativa-da-alteracao").fill("curta");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(form.getByRole("alert")).toContainText("justificativa");
  await form
    .locator("#justificativa-da-alteracao")
    .fill("Inclusão de aula por remanejamento do instrutor");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("ALT 1");
  await expect(situacao(page)).toHaveAttribute("data-situacao", "publicado");
  await expect(page.locator('[data-versao="1"]')).toContainText(
    "Inclusão de aula por remanejamento",
  );
  await expect.poll(taDaTurma).toBe(antes + 2);
  const { data: eventos } = await banco()
    .from("dsa_eventos_da_semana")
    .select("tipo, numero")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO)
    .eq("semana", SEMANA)
    .in("tipo", ["publicado", "alteracao_publicada"])
    .order("numero");
  expect(eventos).toEqual([
    { tipo: "publicado", numero: 0 },
    { tipo: "alteracao_publicada", numero: 1 },
  ]);

  /* 5. Reimprimir: a original com ALT em branco, a ALT 1 com «ALT 1». */
  await page.locator('[data-versao="0"] [data-slot="reimprimir-versao"]').click();
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT —");
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveCount(0);
  await page.goBack();
  await page.locator('[data-versao="1"] [data-slot="reimprimir-versao"]').click();
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT 1");
});

test("SC-002 · descartar o rascunho: sai da grade e fica inativo no banco", async ({ page }) => {
  test.setTimeout(180_000);
  await abrirASemana(page, SEGUNDA_DO_DESCARTE, SEMANA_DO_DESCARTE);
  await lancarAula(page, 3, SEGUNDA_DO_DESCARTE, topico("descartada"));
  await expect(page.locator('[data-slot="nao-salvos"]')).toBeVisible();
  await page.locator('[data-slot="descartar-rascunho"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Descartar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Rascunho descartado",
  );
  await expect(page.locator('[data-slot="nao-salvos"]')).toHaveCount(0);
  const { data } = await banco()
    .from("registros_aula")
    .select("status, salvo")
    .eq("conteudo_resumo", topico("descartada"))
    .single();
  expect(data).toEqual({ status: "inativo", salvo: false });
});

test("SC-007 · a turma EAD: o andamento é da Divisão de Ensino a Distância", async ({ page }) => {
  test.setTimeout(120_000);
  await irAFichaDaTurma(page, ADMIN, S.turmaEad);
  await expect(page.locator('[data-slot="andamento-ead"]')).toContainText(
    "Divisão de Ensino a Distância",
  );
  await expect(page.locator('[data-slot="em-atraso"]')).toHaveCount(0);
});
