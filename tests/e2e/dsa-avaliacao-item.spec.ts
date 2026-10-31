/**
 * O DSA com a avaliação do currículo, as sessões de vista e os papéis (spec 014, PR 5.1): T215 (o item e o painel
 * da UE), T216 (a vista em duas sessões) e T217 (o aplicador sem habilitação grava com aviso; o 2º instrutor; quem
 * conduz de fora); e, no fim, T208 e T218 — o 2º nome também em AULA e em ATIVIDADE, o fiscal de fora, e o PAPEL com
 * a faixa de UEs, as duas sessões, quem conduz, o fiscal e os demais instrutores (tela e papel iguais).
 *
 * ⚠️ **UM CASO SÓ, EM SÉRIE**: a vista precisa da prova aplicada, e com `fullyParallel` dois casos do mesmo arquivo
 *    podem cair em processos diferentes, com sementes diferentes.
 * ⚠️ **O ITEM DO CURRÍCULO É DESTA AMOSTRA** (`AVC-DSA-<processo>-1`), na disciplina e na UE 1 da semente do DSA:
 *    PM 1, 2 TA de aplicação e 1 de vista. Ele sai no fim, depois das avaliações (a FK do item é `restrict`).
 * ⚠️ `goto` só no ponto de partida; daí, ficha → DSA → célula → formulário.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { escolherDisciplina, irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let S: DsaSemeado;
let PROCESSO = 0;
const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

const codigoDoItem = () => `AVC-DSA-${PROCESSO}-1`;

async function turmaECurso(): Promise<{ turmaId: string; cursoId: string; disciplinaId: string }> {
  const { data: t } = await banco()
    .from("turmas")
    .select("id, curso_id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  const turma = t as { id: string; curso_id: string };
  const { data: d } = await banco()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", turma.curso_id)
    .eq("cod_disciplina", S.codDisciplina)
    .single();
  return { turmaId: turma.id, cursoId: turma.curso_id, disciplinaId: (d as { id: string }).id };
}

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsaitem", PROCESSO);
  await criarConta(EMAIL, `USR-DSAI-${PROCESSO}`);
  S = await semearDsa(PROCESSO, EMAIL);
  const { cursoId, disciplinaId } = await turmaECurso();
  const [{ data: ue }, { data: pm }] = await Promise.all([
    banco()
      .from("unidades_ensino")
      .select("id")
      .eq("disciplina_id", disciplinaId)
      .eq("numero_ue", 1)
      .single(),
    banco()
      .from("config_listas")
      .select("id")
      .eq("lista", "instrumentos_avaliacao")
      .eq("valor", "PM")
      .single(),
  ]);
  await banco().from("avaliacoes_curriculo").delete().eq("codigo", codigoDoItem());
  const { error } = await banco()
    .from("avaliacoes_curriculo")
    .insert({
      codigo: codigoDoItem(),
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      ordem: 1,
      instrumento_id: (pm as { id: string }).id,
      numero: 1,
      unidade_ensino_id: (ue as { id: string }).id,
      origem_ue: "curriculo",
      origem_item: "curriculo",
      fonte_arquivo: "semente-e2e.pdf",
      fonte_pagina: 1,
      ta_aplicacao: 2,
      origem_ta_aplicacao: "curriculo",
      ta_vista: 1,
      origem_ta_vista: "curriculo",
    });
  if (error) throw new Error(`falha ao semear o item: ${error.message}`);
});

test.afterAll(async () => {
  await limparDsa(S);
  await banco().from("avaliacoes_curriculo").delete().eq("codigo", codigoDoItem());
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
  return desfecho();
}

test("US6 e US7 · a PM 1 aponta o item, a vista abre a sessão 1 e a 2, e os papéis aparecem", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await abrirASemana(page);

  // ── a prova: o item do currículo, o aplicador SEM habilitação (aviso, D-AV-3) e o 2º instrutor ──
  await abrirCelula(page, "6:1");
  await page.locator('[data-tipo="avaliacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  const item = page.locator("#dsa-item-do-curriculo");
  await expect(item).toContainText("PM 1 (UE 1) — 2 TA");
  await item.selectOption({ label: "PM 1 (UE 1) — 2 TA" });
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-tipo-avaliacao").selectOption({ index: 1 });
  await escolherNoSeletor(page, S.nomeSemHabilitacao);
  await page.locator("#dsa-outros-instrutores").fill("1ºTen Segundo Nome");
  await page.locator("#dsa-ues-abordadas").fill("U.E. 1 a 2");
  await page.locator("#dsa-fiscal-externo").fill("SO Fiscal De Fora");
  expect(await lancar(page)).toBe("avisou");
  await expect(page.locator('[data-slot="avisos-do-lancamento"]')).toContainText(
    "não está habilitado",
  );
  /* Bloco 16 (FR-001): o «Entendi» virou o ícone «Fechar» do rodapé. */
  await page.locator('[data-slot="fechar-formulario"]').click();

  const { turmaId } = await turmaECurso();
  const { data: av } = await banco()
    .from("avaliacoes")
    .select(
      "id, avaliacao_curriculo_id, outros_instrutores, ues_abordadas, instrutor_responsavel_id",
    )
    .eq("turma_id", turmaId)
    .eq("data_avaliacao", "2026-04-07")
    .not("avaliacao_curriculo_id", "is", null)
    .single();
  const prova = av as {
    id: string;
    avaliacao_curriculo_id: string;
    outros_instrutores: string[];
    ues_abordadas: string;
  };
  expect(prova.outros_instrutores).toEqual(["1ºTen Segundo Nome"]);
  expect(prova.ues_abordadas).toBe("U.E. 1 a 2");

  // ── a vista, sessão 1 (sexta, 6º tempo), com quem conduz de fora do cadastro ──
  await abrirCelula(page, "5:4");
  await page.locator('[data-tipo="vista_prova"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  const daVista = page.locator("#dsa-avaliacao-da-vista");
  const sessao1 = daVista.locator("option").filter({ hasText: "PM 1 (UE 1)" });
  await expect(sessao1).toContainText("sessão 1");
  await daVista.selectOption((await sessao1.getAttribute("value")) ?? "");
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-conduz-externo").fill("CF Conduz De Fora");
  expect(await lancar(page)).not.toMatch(/^recusou/);

  // ── a vista, sessão 2 (sexta, 8º tempo): a MESMA prova oferece agora a sessão 2 ──
  await abrirCelula(page, "7:4");
  await page.locator('[data-tipo="vista_prova"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  const sessao2 = page.locator("#dsa-avaliacao-da-vista option").filter({ hasText: "PM 1 (UE 1)" });
  await expect(sessao2).toContainText("sessão 2");
  await page
    .locator("#dsa-avaliacao-da-vista")
    .selectOption((await sessao2.getAttribute("value")) ?? "");
  await page.locator("#dsa-tempos").fill("1");
  expect(await lancar(page)).not.toMatch(/^recusou/);

  const { data: sessoes } = await banco()
    .from("vistas_de_avaliacao")
    .select("numero, data, conduz_nome_externo")
    .eq("avaliacao_id", prova.id)
    .eq("status", "ativo")
    .order("numero");
  expect(sessoes).toEqual([
    { numero: 1, data: "2026-04-10", conduz_nome_externo: "CF Conduz De Fora" },
    { numero: 2, data: "2026-04-10", conduz_nome_externo: null },
  ]);

  /*
   * ── T208: o 2º nome em ATIVIDADE (sexta, 3º tempo). ⚠️ Na AULA o texto livre saiu no Bloco 16 (spec 031, FR-006.6):
   *    ela tem os instrutores adicionais do cadastro (RD-9), provados em `bloco-16-dsa.spec.ts`. ──
   */
  await abrirCelula(page, "0:4");
  await escolherDisciplina(page, S.codDisciplina);
  await page.locator("#dsa-unidade").selectOption({ index: 1 });
  await expect(page.locator("#dsa-outros-instrutores")).toHaveCount(0);
  await page.locator('[data-slot="fechar-formulario"]').click();

  await abrirCelula(page, "2:4");
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Palestra" });
  await page.locator("#dsa-descricao").fill("Palestra com dois instrutores");
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-outros-instrutores").fill("1ºSG Atividade Dois");
  expect(await lancar(page)).not.toMatch(/^recusou/);

  const { data: atividade } = await banco()
    .from("atividades_nao_letivas")
    .select("outros_instrutores, observacoes")
    .eq("turma_id", turmaId)
    .eq("descricao", "Palestra com dois instrutores");
  expect(atividade).toEqual([{ outros_instrutores: ["1ºSG Atividade Dois"], observacoes: null }]);

  // ── a grade: as duas sessões, cada uma no seu dia; o fiscal, o 2º instrutor e quem conduz de fora ──
  await page.reload();
  await expect(page.locator(`${GRADE} td[data-celula="7:4"]`)).toContainText("sessão 2");
  await expect(page.locator(`${GRADE} td[data-celula="5:4"]`)).toContainText("CF Conduz De Fora");
  await expect(page.locator(`${GRADE} td[data-celula="6:1"]`)).toContainText("1ºTen Segundo Nome");
  await expect(page.locator(`${GRADE} td[data-celula="6:1"]`)).toContainText(
    "SO Fiscal De Fora (FISCAL)",
  );
  await expect(page.locator(`${GRADE} td[data-celula="2:4"]`)).toContainText("1ºSG Atividade Dois");

  // ── T218: o PAPEL, pelo botão Imprimir — a faixa, as sessões, quem conduz, o fiscal e os demais instrutores ──
  // Spec 024 (RP-0): o lançado pela grade é rascunho até o «Salvar a semana», e o papel só traz o salvo.
  await salvarASemana(page);
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await page.waitForURL(/\/print\/dsa/);
  const papel = page.locator('[data-slot="dsa-impresso"]');
  await expect(papel).toBeVisible();
  for (const esperado of [
    /U\.E\. 1 a 2/,
    /sess[aã]o 2/i,
    /CF Conduz De Fora/i,
    /SO Fiscal De Fora \(FISCAL\)/i,
    /1ºTen Segundo Nome/i,
    /1ºSG Atividade Dois/i,
  ]) {
    await expect(papel).toContainText(esperado);
  }
});
