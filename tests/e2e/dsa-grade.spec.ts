/**
 * A grade de EDIÇÃO do DSA no modelo v4 (`RF-DSA-04`, `RF-DSA-07`, `RF-PDF-01`) — a mesma montagem
 * do papel (`gradeDoPapel`), agora a tela onde se lança, edita e exclui.
 *
 * O que este arquivo prova, num percurso só por clique na grade:
 *   · tempo vazio → formulário com dia e tempo JÁ preenchidos → gravar → o CARTÃO aparece, com as
 *     informações do papel (disciplina, tópico, TA, local, T/E, instrutor);
 *   · clicar no cartão → editar o tópico → o cartão muda;
 *   · clicar no cartão → excluir → o cartão some, e a linha fica `inativo` (regra 4);
 *   · o dia de feriado de DIA INTEIRO sai bloqueado na grade, com o motivo, e o EI da semana em um
 *     clique não lança nele (`RN-EVT-02`, `Q-7`).
 *
 * ⚠️ **O BLOQUEIO DO FERIADO É O QUE JÁ EXISTE, nem mais nem menos.** Hoje a Server Action `lancar`
 * NÃO recusa aula em feriado de dia inteiro (a semente tem "Aula no dia do feriado", e o
 * `dsa-ver.spec.ts` exige que ela continue visível); quem respeita o calendário é o EI da semana. A
 * grade marca o dia; recusar a aula seria regra nova, fora do escopo desta tela.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, QUARTA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;

const GRADE = '[data-slot="grade-da-semana"][data-modelo="v4"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const ACOES = '[data-slot="acoes-do-bloco"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("dsagrade", info.workerIndex);
  await criarConta(EMAIL, `USR-DSAG-${info.workerIndex}`);
  SEMEADO = await semearDsa(info.workerIndex, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Ficha da turma → *Abrir o DSA* (por clique) → a semana de referência. */
async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
  );
  await expect(page.locator(GRADE)).toBeVisible();
}

async function situacaoDaAula(topico: string): Promise<string | null> {
  const { data } = await banco()
    .from("registros_aula")
    .select("status")
    .eq("conteudo_resumo", topico)
    .limit(1)
    .maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}

test.describe("o cabeçalho e o rodapé do papel, na tela", () => {
  test("semana, DSA nº, período e alunos em cima; CH, técnicas e assinaturas embaixo", async ({
    page,
  }) => {
    await abrirASemana(page);
    await expect(page.locator('[data-slot="cabecalho-da-semana"]')).toContainText("Período");
    await expect(page.locator('[data-slot="tela-periodo"]')).toContainText("06/04/2026");
    await expect(page.locator('[data-slot="rodape-da-semana"]')).toContainText("Carga horária");
    await expect(page.locator('[data-slot="tela-assinaturas"]')).toContainText("Assinaturas");
    /* ⚠️ Uma versão só: a seção antiga «O documento desta semana» não existe mais. */
    await expect(page.locator('[data-slot="documento-do-dsa-na-tela"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="dsa-impresso"]')).toHaveCount(0);
  });
});

test.describe("criar, editar e excluir uma aula pela grade", () => {
  test("⚠️ o percurso inteiro, só com cliques na grade", async ({ page }) => {
    test.setTimeout(120_000);
    const topico = `Aula da grade v4 ${Date.now().toString(36)}`;
    const editado = `${topico} — editada`;
    await abrirASemana(page);

    /* ── 1. Tempo vazio da sexta, 8º tempo → o formulário já sabe o dia e o tempo ──────────── */
    await page.locator(`${GRADE} td[data-celula="7:4"]`).click();
    await expect(page.locator(FORMULARIO)).toBeVisible();
    const alvo = page.locator('[data-slot="alvo-do-lancamento"]');
    await expect(alvo).toContainText("2026-04-10");
    await expect(alvo).toContainText("8");

    await page.locator("#dsa-unidade").selectOption({ index: 1 });
    await page.locator('[data-slot="seletor-instrutor"]').first().click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
      .first()
      .click();
    await page.locator("#dsa-conteudo").fill(topico);
    await page.locator("#dsa-tempos").fill("1");
    await page.locator('[data-slot="gravar-lancamento"]').click();
    /*
     * ⚠️ **ALERTA MANTÉM O FORMULÁRIO ABERTO, e isso é comportamento correto** (`RN-DEG-02`): com
     * dois processos, o instrutor da semente pode estar no mesmo tempo em outra turma, e o aviso de
     * conflito (`RN-CONF-01`) sai — mas a aula GRAVOU. Recusa é que reprova o caso.
     */
    const desfecho = async (): Promise<string> => {
      if ((await page.locator(FORMULARIO).count()) === 0) return "fechou";
      if ((await page.locator('[data-slot="recusa-do-lancamento"]').count()) > 0) {
        return `recusou: ${await page.locator('[data-slot="recusa-do-lancamento"]').innerText()}`;
      }
      if ((await page.locator('[data-slot="avisos-do-lancamento"]').count()) > 0) return "avisou";
      return "em curso";
    };
    await expect.poll(desfecho, { timeout: 60_000 }).not.toBe("em curso");
    const resultado = await desfecho();
    expect(resultado, "o lançamento pela grade foi recusado").not.toMatch(/^recusou/);
    if (resultado === "avisou") {
      await page.locator(FORMULARIO).getByRole("button", { name: "Cancelar" }).click();
    }
    await expect(page.locator(FORMULARIO)).toHaveCount(0);

    /* ── 2. O cartão aparece, com as informações do papel ───────────────────────────────── */
    const cartao = page.locator(`${GRADE} td`).filter({ hasText: topico });
    await expect(cartao).toHaveCount(1, { timeout: 30_000 });
    await expect(cartao).toContainText("1 TA");
    await expect(cartao.locator('[data-slot="dsa-cartao"]')).toHaveAttribute("data-lancado", "sim");

    /* ── 3. Clicar no cartão → editar o tópico ──────────────────────────────────────────── */
    await cartao.click();
    await expect(page.locator(ACOES)).toBeVisible();
    await page.locator('[data-aba="editar"]').click();
    await page.locator("#dsa-editar-conteudo").fill(editado);
    await page.locator('[data-slot="confirmar-edicao"]').click();
    await expect(page.locator(ACOES)).toHaveCount(0, { timeout: 30_000 });
    const cartaoEditado = page.locator(`${GRADE} td`).filter({ hasText: editado });
    await expect(cartaoEditado).toHaveCount(1, { timeout: 30_000 });

    /* ── 4. Clicar no cartão → excluir (lógico) ─────────────────────────────────────────── */
    await cartaoEditado.click();
    await expect(page.locator(ACOES)).toBeVisible();
    await page.locator('[data-slot="excluir-bloco"]').click();
    const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Excluir" }).click();
    await expect(page.locator(`${GRADE} td`).filter({ hasText: editado })).toHaveCount(0, {
      timeout: 30_000,
    });
    /* ⚠️ Regra 4: a linha não some do banco, fica inativa. */
    await expect.poll(() => situacaoDaAula(editado)).toBe("inativo");
  });
});

test.describe("`RN-EVT-02` · o dia de feriado de DIA INTEIRO na grade", () => {
  test("o dia sai bloqueado, com o motivo, e o EI da semana não lança nele", async ({ page }) => {
    await abrirASemana(page);
    const grade = page.locator(GRADE);
    const quarta = grade.locator('th[scope="col"]').nth(3);
    await expect(quarta).toContainText("Feriado de dia inteiro");
    /* Os tempos vazios da quarta (coluna 2) estão bloqueados, e isso vai no atributo. */
    await expect(grade.locator('td[data-celula^="5:2"]')).toHaveAttribute("data-tom", "bloqueada");

    await page.locator('[data-slot="lancar-estudo-individual"]').click();
    await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toBeVisible({
      timeout: 30_000,
    });
    const { data: turma } = await banco()
      .from("turmas")
      .select("id")
      .eq("codigo", SEMEADO.turmaComRelogio)
      .maybeSingle();
    const { count } = await banco()
      .from("atividades_nao_letivas")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", (turma as { id: string } | null)?.id ?? "")
      .eq("data", QUARTA)
      .eq("categoria_normativa", "Estudo_Individual")
      .eq("status", "ativo");
    expect(count ?? 0, "o feriado de dia inteiro recebeu Estudo Individual").toBe(0);
  });
});
