/**
 * Spec 023 (Bloco 8) — o calendário, por clique (SC-001 a SC-004).
 *
 *   1. Parar o dia de TODAS as turmas pelo DSA → o dia bloqueado → desfazer pelo DSA, com confirmação → a linha fica
 *      INATIVA no banco (não some) → lançar aula no mesmo dia.
 *   2. A aba Calendário em Atividades: cadastrar uma linha de TURMAS ESCOLHIDAS → ela bloqueia a turma escolhida e não a
 *      outra (o caso que discrimina) → inativar → reativar; uma linha só no banco.
 *   3. O Operador não vê a aba Calendário nem o «Desfazer» do feriado.
 *
 * ⚠️ `goto` só no login. ⚠️ **A SEMANA É A 8 (16 a 20/02/2026), QUE NENHUM OUTRO ARQUIVO USA**: a parada de todas as
 *    turmas é global, e na semana da semente (15) ela bloquearia os casos dos outros processos. E fevereiro já passou:
 *    a linha não desconta capacidade de ninguém (os dias úteis contam de amanhã).
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia } from "./percurso-do-dsa";
import { dataComDiaDaSemana } from "@/lib/formato/data";

test.describe.configure({ mode: "serial" });

const ANO = 2026;
const SEMANA = 8;
const SEGUNDA = "2026-02-16";
const QUARTA = "2026-02-18";
const QUINTA = "2026-02-19";
const SEXTA = "2026-02-20";

let ADMIN = "";
let OPERADOR = "";
let S: DsaSemeado;
let MARCA = "";
const motivoDoDsa = () => `Feriado B8 pelo DSA ${MARCA}`;
const nomeDoCalendario = () => `Licença B8 pelo Calendário ${MARCA}`;
const nomeDoServico = () => `Feriado B8 do operador ${MARCA}`;
const topico = () => `Aula depois do desfazer ${MARCA}`;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function limparCalendario(): Promise<void> {
  const { data } = await banco().from("feriados").select("id").like("descricao", `%B8 % ${MARCA}`);
  const ids = (data ?? []).map((f) => f.id as string);
  if (ids.length > 0) {
    await banco().from("feriado_turma").delete().in("feriado_id", ids);
    await banco().from("feriados").delete().in("id", ids);
  }
  await banco().from("registros_aula").delete().eq("conteudo_resumo", topico());
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  MARCA = `p${p}`;
  ADMIN = emailDeTeste("calendario", p);
  OPERADOR = emailDeTeste("calendario-op", p);
  await criarConta(ADMIN, `USR-CAL-${p}`);
  await criarConta(OPERADOR, `USR-CALO-${p}`, "operador", "geral");
  S = await semearDsa(p, ADMIN);
  await limparCalendario();
});

test.afterAll(async () => {
  await limparCalendario();
  await limparDsa(S);
  await apagarConta(ADMIN);
  await apagarConta(OPERADOR);
});

async function abrirASemana(page: Page, email: string, turma: string): Promise<void> {
  await irAFichaDaTurma(page, email, turma);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await expect(page.locator('[data-slot="controle-de-paradas"]')).toBeVisible();
}

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function abrirOCalendario(page: Page, email: string): Promise<void> {
  await entrar(page, email, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
}

test("SC-001 · parar todas as turmas pelo DSA, desfazer pelo DSA e lançar aula no dia", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirASemana(page, ADMIN, S.turmaComRelogio);

  await page.locator('[data-slot="parar-dia"]').click();
  const form = page.locator('[data-slot="formulario-de-parada"]');
  await form.locator("#parada-dia").selectOption(QUARTA);
  await form.locator("#parada-tipo").selectOption({ label: "FR — Feriado" });
  await form.locator("#parada-motivo").fill(motivoDoDsa());
  await form.locator('[data-slot="parada-de-todas"]').check();
  await form.locator('[data-slot="gravar-parada"]').click();
  const confirmar = page.locator('[data-slot="confirmar-parada"]');
  const resposta = page.locator('[data-slot="resposta-da-parada"]');
  await expect(confirmar.or(resposta)).toBeVisible();
  if (await confirmar.isVisible()) {
    await confirmar.getByRole("button", { name: "Parar mesmo assim" }).click();
  }
  await expect(resposta).toHaveText("Dia parado registrado.");

  /* FR-001: o feriado aparece na faixa, «· todas as turmas», e o dia fica bloqueado. */
  const chip = page.locator("[data-feriado]", { hasText: motivoDoDsa() });
  await expect(chip).toContainText("todas as turmas");
  await expect(celula(page, 3, QUARTA)).toHaveAttribute("data-tom", "bloqueada");
  const { data: gravado } = await banco()
    .from("feriados")
    .select("id, status, impacto, tipo:config_listas(valor)")
    .like("descricao", `%${motivoDoDsa()}`)
    .single();
  expect(gravado).toMatchObject({ status: "ativo", impacto: "dia_inteiro", tipo: { valor: "FR" } });

  /* FR-003: desfazer pede confirmação e diz o que libera. */
  await chip.locator('[data-slot="desfazer-feriado"]').click();
  const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
  await expect(dialogo).toContainText("libera o dia em todas as turmas");
  await dialogo.getByRole("button", { name: "Desfazer" }).click();
  await expect(resposta).toHaveText("Feriado desfeito: o dia está liberado.");
  await expect(page.locator("[data-feriado]", { hasText: motivoDoDsa() })).toHaveCount(0);
  await expect(celula(page, 3, QUARTA)).toHaveAttribute("data-tom", "livre");

  /* Regra 4: a linha fica, INATIVA — não é apagada. */
  const { data: desfeito } = await banco()
    .from("feriados")
    .select("status")
    .eq("id", (gravado as { id: string }).id)
    .single();
  expect((desfeito as { status: string }).status).toBe("inativo");

  /* E o dia volta a aceitar aula. */
  await celula(page, 3, QUARTA).click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(topico());
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect
    .poll(async () => {
      const { count } = await banco()
        .from("registros_aula")
        .select("id", { count: "exact", head: true })
        .eq("conteudo_resumo", topico())
        .eq("data", QUARTA);
      return count;
    })
    .toBe(1);
});

test("SC-002/SC-004 · a aba Calendário: cadastrar para turmas escolhidas, inativar e reativar", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await abrirOCalendario(page, ADMIN);
  await page.locator('[data-aba="calendario"]').click();
  await expect(page.locator('[data-slot="calendario"]')).toBeVisible();

  await page.locator('[data-slot="cadastrar-linha"]').click();
  const form = page.locator('[data-slot="formulario-do-calendario"]');
  await form.locator("#linha-nova-data").fill(QUINTA);
  await form.locator("#linha-nova-nome").fill(nomeDoCalendario());
  await form.locator("#linha-nova-tipo").selectOption({ label: "LA — Licença Administrativa" });
  await form.locator("#linha-nova-impacto").selectOption("dia_inteiro");
  await form.locator('[data-slot="abrangencia-turmas"]').check();
  await form.locator(`[data-turma-escolhida="${S.turmaComRelogio}"]`).check();
  await form.locator('[data-slot="gravar-linha"]').click();
  await expect(page.locator('[data-slot="resposta-do-calendario"]')).toContainText(
    "Linha cadastrada",
  );

  const { data: linhas } = await banco()
    .from("feriados")
    .select("id, codigo, status, feriado_turma(status, turma:turmas(codigo))")
    .eq("descricao", nomeDoCalendario());
  expect(linhas).toHaveLength(1);
  const linha = (linhas ?? [])[0] as unknown as {
    id: string;
    codigo: string;
    status: string;
    feriado_turma: { status: string; turma: { codigo: string } }[];
  };
  expect(linha.status).toBe("ativo");
  expect(linha.feriado_turma).toEqual([{ status: "ativo", turma: { codigo: S.turmaComRelogio } }]);
  const naLista = page.locator(`[data-linha="${linha.codigo}"]`);
  await expect(naLista).toHaveAttribute("data-situacao", "ativo");
  await expect(naLista).toContainText(S.turmaComRelogio);

  /* O caso que discrimina: a turma escolhida vê a licença; a outra, não. */
  await abrirASemana(page, ADMIN, S.turmaComRelogio);
  await expect(page.locator("[data-feriado]", { hasText: nomeDoCalendario() })).toContainText(
    "turmas escolhidas",
  );
  await expect(celula(page, 3, QUINTA)).toHaveAttribute("data-tom", "bloqueada");
  await abrirASemana(page, ADMIN, S.turmaSemRelogio);
  await expect(page.locator('[data-slot="controle-de-paradas"]')).toBeVisible();
  await expect(page.locator("[data-feriado]", { hasText: nomeDoCalendario() })).toHaveCount(0);

  /* Inativar, com confirmação — pela aba, chegando pelo menu. */
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await page.locator('[data-aba="calendario"]').click();
  await page.locator(`[data-linha="${linha.codigo}"] [data-slot="inativar-linha"]`).click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Inativar" })
    .click();
  await expect(page.locator(`[data-linha="${linha.codigo}"]`)).toHaveAttribute(
    "data-situacao",
    "inativo",
  );
  await expect
    .poll(
      async () =>
        (await banco().from("feriados").select("status").eq("id", linha.id).single()).data?.status,
    )
    .toBe("inativo");

  /* Reativar, com confirmação. */
  await page.locator(`[data-linha="${linha.codigo}"] [data-slot="reativar-linha"]`).click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Reativar" })
    .click();
  await expect(page.locator(`[data-linha="${linha.codigo}"]`)).toHaveAttribute(
    "data-situacao",
    "ativo",
  );
  await expect
    .poll(
      async () =>
        (await banco().from("feriados").select("status").eq("id", linha.id).single()).data?.status,
    )
    .toBe("ativo");
  const { count } = await banco()
    .from("feriados")
    .select("id", { count: "exact", head: true })
    .eq("descricao", nomeDoCalendario());
  expect(count, "nada foi apagado nem duplicado: a mesma linha").toBe(1);
});

test("SC-003 · o Operador não vê a aba Calendário nem o «Desfazer» do feriado", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { data: tipo } = await banco()
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_parada")
    .eq("valor", "FR")
    .single();
  const { error } = await banco()
    .from("feriados")
    .insert({
      ano: ANO,
      data: SEXTA,
      descricao: nomeDoServico(),
      impacto: "dia_inteiro",
      tipo_parada_id: (tipo as { id: string }).id,
    });
  expect(error).toBeNull();

  await abrirOCalendario(page, OPERADOR);
  await expect(page.locator('[data-slot="lista-de-atividades"]')).toBeVisible();
  await expect(page.locator('[data-aba="calendario"]')).toHaveCount(0);

  await page.context().clearCookies();
  await abrirASemana(page, OPERADOR, S.turmaComRelogio);
  const chip = page.locator("[data-feriado]", { hasText: nomeDoServico() });
  await expect(chip).toBeVisible();
  await expect(chip.locator('[data-slot="desfazer-feriado"]')).toHaveCount(0);

  /* Controle positivo: o Admin vê o botão no mesmo feriado. */
  await page.context().clearCookies();
  await abrirASemana(page, ADMIN, S.turmaComRelogio);
  await expect(
    page
      .locator("[data-feriado]", { hasText: nomeDoServico() })
      .locator('[data-slot="desfazer-feriado"]'),
  ).toBeVisible();
});
