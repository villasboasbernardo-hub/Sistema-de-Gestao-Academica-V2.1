/**
 * Bloco 16 (spec 031) — o formulário de lançamento do DSA, mais de um instrutor por aula, o pé do cartão e as abas de
 * acompanhamento. Tudo por clique, a partir da ficha da turma; `entrar` só para o ponto de partida.
 *
 * ⚠️ **A SEMANA É ESCOLHIDA NA HORA** (como em `bloco-15.spec.ts`): a primeira candidata sem evento da publicação na
 *    turma do processo, para a suíte rodar duas vezes seguidas (regra 9.1).
 * ⚠️ **O SEGUNDO INSTRUTOR DA SEMENTE NÃO É HABILITADO** — é o negativo da RD-1. O caso dos adicionais primeiro prova
 *    que ele NÃO é oferecido; depois o habilita (linha própria `B16-…`, apagada no fim) e o acrescenta.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import {
  escolherDisciplina,
  escolherDisciplinaEUnidade,
  irParaASemanaDoDia,
} from "./percurso-do-dsa";
import { dataComDiaDaSemana } from "@/lib/formato/data";

const ANO = 2026;
const segundaDe = (n: number) =>
  new Date(Date.UTC(2025, 11, 29) + (n - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
/* Fora das candidatas do Bloco 11 e do Bloco 15. */
const CANDIDATAS = [40, 41, 42, 49, 50] as const;

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
let SEMANA = 40;
let SEGUNDO = "";
let DISCIPLINA = "";

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

test.beforeAll(async ({}, info) => {
  const processo = info.workerIndex;
  MARCA = `p${processo}`;
  ADMIN = emailDeTeste("bloco16", processo);
  await criarConta(ADMIN, `USR-B16-${processo}`);
  S = await semearDsa(processo, ADMIN);
  const { data: comEvento } = await banco()
    .from("dsa_eventos_da_semana")
    .select("semana")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO);
  const usadas = new Set(((comEvento ?? []) as { semana: number }[]).map((e) => e.semana));
  const livre = CANDIDATAS.find((n) => !usadas.has(n));
  if (livre === undefined) throw new Error("sem semana candidata livre — rode o db:reset:limpo");
  SEMANA = livre;
  const { data: segundo } = await banco()
    .from("instrutores")
    .select("id")
    .eq("codigo", `DSA-E2D${processo}-SEMV`)
    .single();
  SEGUNDO = (segundo as { id: string }).id;
  const { data: turma } = await banco()
    .from("turmas")
    .select("curso_id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  const { data: disciplina } = await banco()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", (turma as { curso_id: string }).curso_id)
    .eq("cod_disciplina", S.codDisciplina)
    .single();
  DISCIPLINA = (disciplina as { id: string }).id;
});

test.afterAll(async () => {
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B16 % ${MARCA}`);
  await banco().from("instrutor_disciplina").delete().like("codigo", `B16-${MARCA}-%`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function abrirODsa(page: Page): Promise<void> {
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segundaDe(SEMANA), SEMANA, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

const FORM = '[data-slot="formulario-de-lancamento"]';

test("FR-001 a FR-005 · o formulário: ícones, «Início», avaliação sem técnica, EI sem instrutor, Apoio sem o sufixo", async ({
  page,
}) => {
  await abrirODsa(page);
  await celula(page, 1, segundaDe(SEMANA)).click();
  const form = page.locator(FORM);
  await expect(form).toBeVisible();

  /* FR-001: Lançar e Cancelar são ÍCONES, no grupo do canto inferior esquerdo — nenhum botão escrito. */
  const acoes = form.locator('[data-slot="acoes-do-formulario"]');
  await expect(acoes.locator('[data-acao="lancar"]')).toBeVisible();
  await expect(acoes.locator('[data-acao="cancelar"]')).toBeVisible();
  await expect(acoes.getByText("Lançar", { exact: true })).toHaveCount(0);
  await expect(acoes.getByText("Cancelar", { exact: true })).toHaveCount(0);

  /* FR-002: «Início», e não «Em qual tempo começa». */
  await expect(form.getByLabel("Início")).toBeVisible();
  await expect(form.getByText("Em qual tempo começa")).toHaveCount(0);

  /* FR-003: na avaliação, sem «Técnica de ensino»; na aula, com. */
  await expect(form.locator("#dsa-tecnica")).toBeVisible();
  await form.locator('[data-tipo="avaliacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  await expect(form.locator("#dsa-tecnica")).toHaveCount(0);
  /* ⛔ Item 3a, parado: os dois continuam — o tipo da avaliação segue no formulário. */
  await expect(form.locator("#dsa-tipo-avaliacao")).toBeVisible();

  /* FR-004: no Estudo Individual, nenhum campo de quem ministra nem de nome livre. */
  await form.locator('[data-tipo="Estudo_Individual"]').click();
  await expect(form.locator('[data-slot="responsavel-do-lancamento"]')).toHaveCount(0);
  await expect(form.locator('[data-slot="seletor-instrutor"]')).toHaveCount(0);
  await expect(form.locator("#dsa-outros-instrutores")).toHaveCount(0);

  /* FR-005: o Apoio sem «alunos específicos». */
  await form.locator('[data-tipo="Apoio_Individualizado"]').click();
  await form.locator("#dsa-subtipo").selectOption({ index: 1 });
  await expect(form.locator('[data-slot="categoria-do-tipo"]')).toHaveText(
    "Conta como: Apoio Individualizado (fora da CHT)",
  );

  /* Cancelar, pelo ícone, fecha sem gravar. */
  await acoes.locator('[data-acao="cancelar"]').click();
  await expect(form).toHaveCount(0);
});

test("FR-006 e FR-008 · mais de um instrutor: só o habilitado é oferecido; grava os dois; o cartão mostra «A / B · local»", async ({
  page,
}) => {
  const dia = segundaDe(SEMANA);
  const topico = `Aula B16 adicionais ${MARCA}`;
  await abrirODsa(page);

  /* RD-1: o segundo instrutor NÃO é habilitado — a lista dos adicionais não o oferece. */
  await celula(page, 2, dia).click();
  const form = page.locator(FORM);
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await expect(form.locator('[data-slot="instrutores-adicionais"]')).toBeVisible();
  await form
    .locator(
      '[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor"], [data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor-vazio"]',
    )
    .first()
    .waitFor();
  const naoOferecido = form.locator(
    '[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor-vazio"]',
  );
  /* Com o habilitado como quem ministra, não sobra ninguém: o vazio diz por quê. */
  await form
    .locator('[data-slot="responsavel-do-lancamento"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await expect(naoOferecido).toContainText("Nenhum outro instrutor habilitado nesta disciplina");
  await form.locator('[data-acao="cancelar"]').click();

  /* Habilitar o segundo (o que a ficha do instrutor faria) e lançar com ele como adicional. */
  const { error } = await banco()
    .from("instrutor_disciplina")
    .insert({
      codigo: `B16-${MARCA}-VIN`,
      instrutor_id: SEGUNDO,
      disciplina_id: DISCIPLINA,
      modo_atribuicao: "dividido",
    });
  expect(error, error?.message).toBeNull();
  await page.reload();
  await celula(page, 2, dia).click();
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await form
    .locator('[data-slot="responsavel-do-lancamento"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await form
    .locator('[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeSemHabilitacao, "i") })
    .first()
    .click();
  await expect(form.locator('[data-slot="instrutor-adicional"]')).toHaveCount(1);
  await form.locator("#dsa-conteudo").fill(topico);
  await form.locator("#dsa-tempos").fill("1");
  await form.locator('[data-acao="lancar"]').click();
  await expect(form).toHaveCount(0);

  /* No banco: quem ministra e o adicional, cada um no seu lugar — nunca o valor digitado. */
  const { data: gravada } = await banco()
    .from("registros_aula")
    .select("instrutor_id, instrutores_adicionais, tempos_consumidos")
    .eq("conteudo_resumo", topico)
    .eq("status", "ativo")
    .single();
  const linha = gravada as {
    instrutor_id: string;
    instrutores_adicionais: string[];
    tempos_consumidos: number;
  };
  expect(linha.instrutores_adicionais).toEqual([SEGUNDO]);
  expect(linha.instrutor_id).not.toBe(SEGUNDO);
  expect(linha.tempos_consumidos).toBe(1);

  /* FR-006.5 e FR-008: o cartão de 1 TA mostra os dois nomes com « / » e o local NA MESMA LINHA. */
  const pe = celula(page, 2, dia).locator('[data-slot="cartao-pe"]');
  await expect(pe).toContainText(" / ");
  await expect(pe.locator('[data-slot="cartao-local"]')).toBeVisible();
  await expect(pe.locator('[data-slot="cartao-instrutor"]')).toBeVisible();
});

test("FR-009 · as abas de acompanhamento: Disciplinas (igual), Avaliações, APOINST e Palestras «Em breve», na URL", async ({
  page,
}) => {
  await abrirODsa(page);
  const abas = page.locator('[data-slot="abas-de-acompanhamento"]');
  await expect(abas.getByRole("tab")).toHaveText([
    "Disciplinas",
    "Avaliações",
    "APOINST",
    "Palestras",
  ]);
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toBeVisible();

  await abas.locator('[data-acompanhamento="avaliacoes"]').click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("acompanhamento"))
    .toBe("avaliacoes");
  await expect(page.locator('[data-slot="acompanhamento-de-avaliacoes"]')).toBeVisible();
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toHaveCount(0);
  for (const titulo of ["Situação", "Semana prevista", "Semana lançada", "Semana aplicada", "TA"]) {
    await expect(
      page.locator('[data-slot="acompanhamento-de-avaliacoes"]').getByText(titulo, { exact: true }),
    ).toBeVisible();
  }

  await abas.locator('[data-acompanhamento="apoinst"]').click();
  await expect(page.locator('[data-slot="acompanhamento-em-breve"]')).toHaveText("Em breve");
  await abas.locator('[data-acompanhamento="palestras"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("acompanhamento")).toBe("palestras");
  await expect(page.locator('[data-slot="acompanhamento-em-breve"]')).toHaveText("Em breve");

  await abas.locator('[data-acompanhamento="disciplinas"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("acompanhamento")).toBeNull();
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toBeVisible();
});
