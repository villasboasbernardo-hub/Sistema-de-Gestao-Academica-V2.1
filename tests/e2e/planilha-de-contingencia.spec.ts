/**
 * A planilha de contingência do DSA, de ponta a ponta — `FR-001` a `FR-006`, `SC-001`, `SC-008` e o
 * caso negativo por perfil do DoD 4 (spec 015).
 *
 * ⚠️ **POR CLIQUE**: o `goto` só leva ao ponto de partida (a lista de turmas, pelo `irAFichaDaTurma`);
 * dali ao botão e ao arquivo, tudo é clique — prova que alguém CHEGA nele, e não só que ele funciona.
 * ⚠️ **DADO SINTÉTICO SÓ** — a semente do DSA de teste.
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { enderecoDaPlanilhaDeContingencia } from "@/lib/navegacao/endereco-de-turma";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { lerXlsx } from "../unidade/planilha/ler-xlsx";
import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;
const BOTAO = '[data-slot="baixar-planilha-de-contingencia"]';
const EXTRAS: string[] = [];

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("planilha", PROCESSO);
  await criarConta(EMAIL, `USR-PLAN-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
  for (const email of EXTRAS) await apagarConta(email);
});

async function baixar(page: Page): Promise<ReturnType<typeof lerXlsx>> {
  const antes = page.url();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(BOTAO).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^DSA-contingencia-.*-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const caminho = await download.path();
  /* A página não muda: o download não navega (`FR-005`). */
  expect(page.url()).toBe(antes);
  return lerXlsx(new Uint8Array(readFileSync(caminho)));
}

function textoDaCelula(pasta: ReturnType<typeof lerXlsx>, aba: string, referencia: string): string {
  const v = pasta.abas.find((a) => a.nome === aba)?.celulas.get(referencia)?.valor;
  return v === null || v === undefined ? "" : String(v);
}

test.describe("`FR-001` · quem lança baixa a planilha, do DSA e da ficha", () => {
  test("do DSA: o arquivo tem as quatro abas, o topo do `FR-005` e o código de um lançamento", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    const pasta = await baixar(page);

    expect(pasta.abas.map((a) => a.nome)).toEqual([
      "PREENCHIMENTO",
      "IMPRESSÃO",
      "BD DISCIPLINAS",
      "HORÁRIOS",
    ]);
    expect(textoDaCelula(pasta, "PREENCHIMENTO", "A1")).toBe(
      `PLANILHA DE CONTINGÊNCIA DO DSA — ${SEMEADO.turmaComRelogio}`,
    );
    expect(textoDaCelula(pasta, "PREENCHIMENTO", "A3")).toContain(
      "o sistema continua sendo a fonte",
    );
    const codigos = [...(pasta.abas[0]?.celulas.values() ?? [])].map((c) => String(c.valor ?? ""));
    expect(codigos).toContain(`DSA-E2D${PROCESSO}-A2`);

    /* `FR-022` · a IMPRESSÃO abre na semana corrente da turma. */
    const hoje = semanaIsoDe(hojeNaCiaara());
    expect(textoDaCelula(pasta, "IMPRESSÃO", "C2")).toMatch(
      new RegExp(`^Semana ${hoje?.numero} — `),
    );
  });

  test("da ficha da turma: o mesmo botão, o mesmo arquivo", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    const pasta = await baixar(page);
    expect(pasta.abas).toHaveLength(4);
  });
});

test.describe("`FR-002` · turma EAD não tem planilha", () => {
  test("sem botão na ficha, e a rota leva ao aviso de turma EAD", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaEad);
    await expect(page.locator('[data-slot="dsa-turma-ead"]')).toBeVisible();
    await expect(page.locator(BOTAO)).toHaveCount(0);
    await page.goto(enderecoDaPlanilhaDeContingencia(SEMEADO.turmaEad));
    await expect(page.locator('[data-slot="dsa-nao-se-aplica"]')).toBeVisible();
  });
});

test.describe("DoD 4 · o negativo por perfil, com sessão real", () => {
  test("um perfil que lê o DSA e NÃO lança: sem botão e 404 na rota", async ({ page }) => {
    /* ⚠️ O perfil sai da matriz da base local, nunca de memória. */
    const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from("perfil_permissao")
      .select("perfil, recurso, acao")
      .in("recurso", ["registros_aula", "turmas"])
      .eq("permitido", true);
    const linhas = (data ?? []) as { perfil: string; recurso: string; acao: string }[];
    const tem = (p: string, recurso: string, acao: string) =>
      linhas.some((l) => l.perfil === p && l.recurso === recurso && l.acao === acao);
    /* Lê a turma e o DSA, não lança, e não depende de vínculo de curso — o primeiro, em ordem alfabética. */
    const leitor = [...new Set(linhas.map((l) => l.perfil))]
      .filter((p) => tem(p, "registros_aula", "ler") && !tem(p, "registros_aula", "criar"))
      .filter((p) => tem(p, "turmas", "ler") && p !== "encarregado_curso")
      .sort()[0];
    expect(leitor, "a matriz não tem perfil que lê sem lançar").toBeDefined();

    const email = emailDeTeste("planleitor", PROCESSO);
    EXTRAS.push(email);
    await criarConta(email, `USR-PLL-${PROCESSO}`, leitor as string);
    await irAFichaDaTurma(page, email, SEMEADO.turmaComRelogio);
    await expect(page.locator(BOTAO)).toHaveCount(0);
    const resposta = await page.request.get(
      enderecoDaPlanilhaDeContingencia(SEMEADO.turmaComRelogio),
      {
        maxRedirects: 0,
      },
    );
    expect(resposta.status()).toBe(404);
  });

  test("Operador fora do alcance: 404 idêntico ao de turma inexistente (`FR-003`)", async ({
    page,
  }) => {
    const email = emailDeTeste("planoper", PROCESSO);
    EXTRAS.push(email);
    /* Escopo «especial»: a RLS devolve só os cursos dessa classificação, e a turma é «regular». */
    await criarConta(email, `USR-PLO-${PROCESSO}`, "operador", "especial");
    await entrar(page, email, "/turmas");
    const fora = await page.request.get(enderecoDaPlanilhaDeContingencia(SEMEADO.turmaComRelogio), {
      maxRedirects: 0,
    });
    const inexistente = await page.request.get(
      enderecoDaPlanilhaDeContingencia(`NAO-EXISTE ${PROCESSO}`),
      {
        maxRedirects: 0,
      },
    );
    expect([fora.status(), inexistente.status()]).toEqual([404, 404]);
    expect(await fora.text()).toBe(await inexistente.text());
  });
});
