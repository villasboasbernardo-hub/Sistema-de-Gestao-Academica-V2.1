/**
 * Spec 014, PR 2.1 — o TIPO da atividade decide a categoria (US2, `FR-011`, `FR-017`, `FR-019`,
 * `FR-020`) e a atividade de TODAS AS TURMAS (US3, `FR-014`), por clique (T097 e T098).
 *
 * ⚠️ `goto` só no login. ⚠️ Os tipos usados aqui nascem na migration D-2 (`Recepção aos alunos`, TAD;
 *    `BDA`, Apoio Individualizado; `Apoio à Instrução`, AEC) e existem também na base limpa.
 * ⚠️ **A GLOBAL APARECE NA GRADE DE TODA TURMA**, inclusive das outras suítes que rodam em paralelo:
 *    por isso ela vai para uma semana que nenhuma outra suíte do DSA usa (a 47, 16/11/2026) e sai no
 *    fim do próprio caso.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ROTULO_NOME_LIVRE } from "@/lib/dominio/responsavel";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

test.describe.configure({ mode: "serial" });

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
/** A segunda da semana 47 — fora de toda outra suíte do DSA. */
const SEGUNDA_DA_GLOBAL = "2026-11-16";
const SEMANA_DA_GLOBAL = 47;

let ADMIN = "";
let OPERADOR = "";
let S: DsaSemeado;
const MARCA = `tipo-e-global-${Date.now().toString(36)}`;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  ADMIN = emailDeTeste("dsatipo", p);
  OPERADOR = emailDeTeste("dsatipo-op", p);
  await criarConta(ADMIN, `USR-DSAT-${p}`);
  await criarConta(OPERADOR, `USR-DSATO-${p}`, "operador", "geral");
  S = await semearDsa(p, ADMIN);
});

test.afterAll(async () => {
  await banco().from("atividades_nao_letivas").delete().like("descricao", `%${MARCA}%`);
  await limparDsa(S);
  await apagarConta(ADMIN);
  await apagarConta(OPERADOR);
});

async function abrirASemana(
  page: Page,
  email: string,
  turma: string,
  segunda = SEGUNDA,
  semana = SEMANA,
): Promise<void> {
  await irAFichaDaTurma(page, email, turma);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segunda, semana, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

async function abrirCelula(page: Page, celula: string): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
}

async function gravar(page: Page): Promise<void> {
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator('[data-slot="recusa-do-lancamento"]')).toHaveCount(0);
}

async function atividadeGravada(descricao: string) {
  let linha: Record<string, unknown> | null = null;
  await expect
    .poll(
      async () => {
        const { data } = await banco()
          .from("atividades_nao_letivas")
          .select(
            "categoria_normativa, subtipo, compoe_cht, quantidade_alunos, tipo_atividade_id, turma_id, escopo",
          )
          .eq("descricao", descricao)
          .eq("status", "ativo")
          .maybeSingle();
        linha = data;
        return data !== null;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  return linha as unknown as {
    categoria_normativa: string;
    subtipo: string;
    compoe_cht: boolean;
    quantidade_alunos: number | null;
    tipo_atividade_id: string | null;
    turma_id: string | null;
    escopo: string;
  };
}

test("US2 · BDA mostra «Apoio Individualizado» antes de gravar, grava fora da CHT e sai marcado", async ({
  page,
}) => {
  const descricao = `Reforço de matemática ${MARCA}`;
  await abrirASemana(page, ADMIN, S.turmaComRelogio);
  /* Sexta, 2º tempo (linha 1, coluna 4): livre na semente. */
  await abrirCelula(page, "1:4");
  await page.locator('[data-tipo="Apoio_Individualizado"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "BDA" });
  await expect(page.locator('[data-slot="categoria-do-tipo"]')).toHaveText(
    "Conta como: Apoio Individualizado (fora da CHT)",
  );
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator("#dsa-quantidade-alunos").fill("3");
  await page.locator("#dsa-tempos").fill("1");
  await gravar(page);

  const gravada = await atividadeGravada(descricao);
  expect(gravada).toMatchObject({
    categoria_normativa: "Apoio_Individualizado",
    subtipo: "BDA",
    compoe_cht: false,
    quantidade_alunos: 3,
    escopo: "turma",
  });
  expect(gravada.tipo_atividade_id).not.toBeNull();
  await expect(page.locator(GRADE)).toContainText("Apoio Individualizado");
  /* Bloco 16 (FR-005): o sufixo saiu da tela e do papel. */
  await expect(page.locator(GRADE)).not.toContainText("alunos específicos");
});

test("US2 · Recepção aos alunos conta como TAD; o externo é o «Outro responsável (nome livre)» (RN-RESP-1)", async ({
  page,
}) => {
  const descricao = `Recepção da turma ${MARCA}`;
  await abrirASemana(page, ADMIN, S.turmaComRelogio);
  await abrirCelula(page, "2:4");
  await page.locator('[data-tipo="TAD"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Recepção aos alunos" });
  await expect(page.locator('[data-slot="categoria-do-tipo"]')).toHaveText("Conta como: TAD");
  await expect(page.locator('label[for="dsa-responsavel-externo"]')).toHaveText(ROTULO_NOME_LIVRE);
  await page.locator("#dsa-responsavel-externo").fill("DOEP");
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator("#dsa-tempos").fill("1");
  await gravar(page);

  expect(await atividadeGravada(descricao)).toMatchObject({
    categoria_normativa: "TAD",
    subtipo: "Recepção aos alunos",
    compoe_cht: true,
  });
});

test("US3 · a AEC de TODAS AS TURMAS aparece no DSA de outra turma; o Operador não vê a caixa", async ({
  page,
}) => {
  const descricao = `Palestra geral ${MARCA}`;
  await abrirASemana(page, ADMIN, S.turmaComRelogio, SEGUNDA_DA_GLOBAL, SEMANA_DA_GLOBAL);
  await abrirCelula(page, "0:0");
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Apoio à Instrução" });
  await page.locator('[data-slot="atividade-de-todas-as-turmas"]').check();
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator("#dsa-tempos").fill("2");
  await gravar(page);

  expect(await atividadeGravada(descricao)).toMatchObject({
    categoria_normativa: "AEC",
    escopo: "global",
    turma_id: null,
  });

  /* Na grade de OUTRA turma com DSA na data. */
  await abrirASemana(page, ADMIN, S.turmaComVigenciaNova, SEGUNDA_DA_GLOBAL, SEMANA_DA_GLOBAL);
  await expect(page.locator(GRADE)).toContainText(descricao);

  /* O Operador lança atividade, mas não vê «todas as turmas» (Q-8). */
  await page.context().clearCookies();
  await abrirASemana(page, OPERADOR, S.turmaComRelogio);
  await abrirCelula(page, "3:4");
  await page.locator('[data-tipo="AEC"]').click();
  await expect(page.locator("#dsa-subtipo")).toBeVisible();
  await expect(page.locator('[data-slot="atividade-de-todas-as-turmas"]')).toHaveCount(0);
});
