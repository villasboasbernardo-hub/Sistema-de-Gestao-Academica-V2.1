/**
 * A SESSÃO DE APLICAÇÃO no DSA, por clique (spec 014, emenda de 15/10/2026; desenho aprovado por Bernardo Villas Boas em
 * 16/10/2026, opção A) — e o INSTRUMENTO da prova sem item (A2 do mesmo desenho).
 *
 * > *"…qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD) é UMA
 * > prova com N sessões de aplicação, não N provas."* — `RN-AV-12`
 *
 * O percurso: lançar a prova (terça, 7º tempo, sem item do currículo, com o instrumento PP) → lançar a SESSÃO 2 dela
 * pelo formulário (quinta, 7º tempo) → ver o bloco «… · sessão 2» na grade → excluir a sessão pelo cartão → a sessão
 * fica `inativo` e a prova CONTINUA viva e na grade.
 *
 * ⚠️ **UM CASO SÓ, EM SÉRIE**: a sessão precisa da prova lançada, e com `fullyParallel` dois casos do mesmo arquivo
 *    podem cair em processos diferentes, com sementes diferentes.
 * ⚠️ **A LIMPEZA É A DA SEMENTE** (`limparDsa`), que apaga as `sessoes_de_aplicacao` ANTES das avaliações — as duas FKs
 *    para `avaliacoes` são `restrict`.
 * ⚠️ `goto` só no ponto de partida; daí, ficha → DSA → célula → formulário.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import {
  ANO,
  limparDsa,
  QUINTA,
  SEGUNDA,
  SEMANA,
  semearDsa,
  type DsaSemeado,
} from "./dsa-de-teste";
import { escolherDisciplina, irParaASemanaDoDia } from "./percurso-do-dsa";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let S: DsaSemeado;
let PROCESSO = 0;
const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const CARTAO = '[data-slot="acoes-do-bloco"]';
/** As células: `<linha>:<coluna do dia>` — a linha conta do 0 (a 6 é o 7º tempo); terça é a coluna 1, quinta a 3. */
const CELULA_DA_PROVA = "6:1";
const CELULA_DA_SESSAO = "6:3";

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

/** O título da prova desta amostra — é por ele que a opção do formulário e a célula da grade se acham. */
const tituloDaProva = () => `PROVA DA SESSAO ${PROCESSO}`;

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsasessao", PROCESSO);
  await criarConta(EMAIL, `USR-DSAS-${PROCESSO}`);
  S = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
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

async function escolherNoSeletor(page: Page, nome: string): Promise<void> {
  await page.locator(`${FORMULARIO} [data-slot="seletor-instrutor"]`).first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(nome, "i") })
    .first()
    .click();
}

/** Lança e devolve o desfecho: «fechou», «avisou» ou «recusou: …». */
async function lancar(page: Page): Promise<string> {
  await page.locator('[data-slot="gravar-lancamento"]').click();
  const desfecho = async (): Promise<string> => {
    if ((await page.locator('[data-slot="recusa-do-lancamento"]').count()) > 0) {
      return `recusou: ${await page.locator('[data-slot="recusa-do-lancamento"]').innerText()}`;
    }
    if ((await page.locator(FORMULARIO).count()) === 0) return "fechou";
    if ((await page.locator('[data-slot="avisos-do-lancamento"]').count()) > 0) return "avisou";
    return "em curso";
  };
  await expect.poll(desfecho, { timeout: 60_000 }).not.toBe("em curso");
  const r = await desfecho();
  if (r === "avisou") await page.getByRole("button", { name: "Entendi" }).click();
  return r;
}

async function idDaTurma(): Promise<string> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  return (data as { id: string }).id;
}

test("RN-AV-12 · a prova ganha a sessão 2 pelo formulário, e excluir a sessão NÃO cancela a prova", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await abrirASemana(page);
  const turmaId = await idDaTurma();

  // ── a prova (a 1ª sessão): sem item do currículo, com o instrumento PP (A2) ──
  await abrirCelula(page, CELULA_DA_PROVA);
  await page.locator('[data-tipo="avaliacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  const instrumento = page.locator("#dsa-instrumento");
  await expect(instrumento, "a prova sem item devia oferecer o instrumento").toBeVisible();
  await expect(instrumento.locator("option").filter({ hasText: /^OD/ })).toHaveCount(0);
  await instrumento.selectOption({ label: "PP — Prova Prática" });
  await page.locator("#dsa-tipo-avaliacao").selectOption({ index: 1 });
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-conteudo").fill(tituloDaProva());
  await escolherNoSeletor(page, S.nomeHabilitado);
  expect(await lancar(page)).not.toMatch(/^recusou/);

  const [{ data: av }, { data: pp }] = await Promise.all([
    banco()
      .from("avaliacoes")
      .select("id, status, instrumento_id")
      .eq("turma_id", turmaId)
      .eq("conteudo_resumo", tituloDaProva())
      .single(),
    banco()
      .from("config_listas")
      .select("id")
      .eq("lista", "instrumentos_avaliacao")
      .eq("valor", "PP")
      .single(),
  ]);
  const prova = av as { id: string; status: string; instrumento_id: string | null };
  expect(prova.instrumento_id, "o instrumento escolhido não foi gravado").toBe(
    (pp as { id: string }).id,
  );

  // ── a SESSÃO 2, pelo tipo próprio do formulário: a mesma prova, outro dia ──
  await abrirCelula(page, CELULA_DA_SESSAO);
  await page.locator('[data-tipo="sessao_aplicacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  const daSessao = page.locator("#dsa-prova-da-sessao");
  const opcao = daSessao.locator("option").filter({ hasText: tituloDaProva() });
  await expect(opcao).toHaveCount(1);
  await expect(opcao).toContainText("sessão 2");
  await daSessao.selectOption((await opcao.getAttribute("value")) ?? "");
  /* A sessão não tem aplicador próprio — o formulário diz isso em vez do seletor. */
  await expect(page.locator(`${FORMULARIO} [data-slot="responsavel-da-sessao"]`)).toBeVisible();
  await page.locator("#dsa-tempos").fill("1");
  expect(await lancar(page)).not.toMatch(/^recusou/);

  const { data: sessoes } = await banco()
    .from("sessoes_de_aplicacao")
    .select("id, numero, data, ta_inicial, tempos_consumidos")
    .eq("avaliacao_id", prova.id)
    .eq("status", "ativo");
  const lidas = (sessoes ?? []) as {
    id: string;
    numero: number;
    data: string;
    ta_inicial: number;
    tempos_consumidos: number;
  }[];
  expect(lidas.map((x) => [x.numero, x.data, x.ta_inicial, x.tempos_consumidos])).toEqual([
    [2, QUINTA, 7, 1],
  ]);
  const sessaoId = lidas[0]?.id ?? "";
  /* ⚠️ A sessão NÃO é outra avaliação: a turma continua com UMA linha desta prova em `avaliacoes`. */
  const { count: provasComOTitulo } = await banco()
    .from("avaliacoes")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turmaId)
    .eq("conteudo_resumo", tituloDaProva());
  expect(provasComOTitulo).toBe(1);

  // ── a grade: a prova na terça e a sessão 2 na quinta, com a marca dela ──
  await page.reload();
  await expect(page.locator(`${GRADE} td[data-celula="${CELULA_DA_PROVA}"]`)).toContainText(
    tituloDaProva(),
  );
  const celulaDaSessao = page.locator(`${GRADE} td[data-celula="${CELULA_DA_SESSAO}"]`);
  await expect(celulaDaSessao).toContainText(tituloDaProva());
  await expect(celulaDaSessao).toContainText("sessão 2");

  // ── excluir a SESSÃO pelo cartão: só ela sai; a prova continua ──
  await celulaDaSessao.click();
  await expect(page.locator(CARTAO)).toBeVisible();
  await expect(page.locator(`${CARTAO} [data-slot="responsavel-da-sessao"]`)).toBeVisible();
  await page.locator('[data-slot="excluir-bloco"]').click();
  const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText("Só esta sessão de aplicação");
  await dialogo.getByRole("button", { name: "Excluir" }).click();

  await expect
    .poll(
      async () => {
        const { data } = await banco()
          .from("sessoes_de_aplicacao")
          .select("status")
          .eq("id", sessaoId)
          .single();
        return (data as { status: string } | null)?.status;
      },
      { message: "a exclusão não inativou a sessão", timeout: 60_000 },
    )
    .toBe("inativo");
  const { data: depois } = await banco()
    .from("avaliacoes")
    .select("status")
    .eq("id", prova.id)
    .single();
  expect((depois as { status: string }).status, "excluir a sessão cancelou a prova").toBe(
    prova.status,
  );

  await expect(celulaDaSessao).not.toContainText("sessão 2");
  await expect(page.locator(`${GRADE} td[data-celula="${CELULA_DA_PROVA}"]`)).toContainText(
    tituloDaProva(),
  );
});
