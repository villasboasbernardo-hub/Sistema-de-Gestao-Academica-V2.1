/**
 * A turma SEMIPRESENCIAL só tem DSA na etapa presencial (`D-DSA-2`, item 6 das correções de
 * 08/10/2026 · decisão de Bernardo Villas Boas).
 *
 * O que este arquivo prova, num percurso só, por clique:
 *   · sem a etapa cadastrada, o DSA abre e AVISA, sem bloquear (`RN-DEG-01`);
 *   · o aviso leva à ficha, e «Editar turma» grava o início e o término da etapa — no BANCO;
 *   · a semana inteira fora da etapa diz *"Etapa a distância — sem DSA nesta semana"*, sem grade;
 *   · a semana que a etapa corta ao meio abre, nomeia os dias de fora, e **lançar num deles é
 *     recusado pela Server Action** — o banco não ganha linha;
 *   · ⚠️ e o controle positivo: o dia DENTRO da etapa, na mesma semana, grava.
 *
 * ⚠️ **A TURMA É DE 2027, DO MESMO CURSO DA SEMENTE**: aproveita a disciplina, a unidade e o instrutor
 * habilitado que `semearDsa` já cria, e o ano próprio não colide com a turma de 2026 dele.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { abrirEdicaoDaTurma, irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia } from "./percurso-do-dsa";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let TURMA = "";
let TURMA_ID = "";

const GRADE = '[data-slot="grade-da-semana"][data-modelo="v4"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';

/** A etapa presencial: de uma quarta a uma sexta — a semana do início fica CORTADA ao meio. */
const INICIO_DA_ETAPA = "2027-05-05";
const TERMINO_DA_ETAPA = "2027-05-28";

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

/**
 * A turma semipresencial de 2027 — idempotente, e SEMPRE sem a etapa ao começar: uma execução
 * anterior no mesmo banco a teria deixado cadastrada.
 */
async function semearTurmaSemipresencial(): Promise<void> {
  const { data: curso } = await banco()
    .from("cursos")
    .select("id")
    .eq("codigo", SEMEADO.cursoComRelogio)
    .maybeSingle();
  const cursoId = (curso as { id: string } | null)?.id;
  if (!cursoId) throw new Error("o curso da semente não existe");

  const { data: existe } = await banco()
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2027)
    .maybeSingle();
  let linha = existe as { id: string; codigo: string } | null;
  if (!linha) {
    const { data, error } = await banco()
      .from("turmas")
      .insert({
        curso_id: cursoId,
        ano_letivo: 2027,
        status: "ativa",
        modalidade: "semipresencial",
        data_inicio: "2027-03-01",
        data_termino: "2027-11-30",
        sala_alocada: SEMEADO.sala,
        alunos: 18,
      })
      .select("id, codigo")
      .single();
    if (error) throw new Error(`falha ao criar a turma semipresencial: ${error.message}`);
    linha = data as { id: string; codigo: string };
  }
  const { error: erroJanela } = await banco()
    .from("turmas")
    .update({ inicio_etapa_presencial: null, termino_etapa_presencial: null })
    .eq("id", linha.id);
  if (erroJanela) throw new Error(`falha ao limpar a etapa: ${erroJanela.message}`);
  TURMA = linha.codigo;
  TURMA_ID = linha.id;
}

async function aulasDaTurma(): Promise<number> {
  const { count } = await banco()
    .from("registros_aula")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", TURMA_ID);
  return count ?? -1;
}

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("dsaetapa", info.workerIndex);
  await criarConta(EMAIL, `USR-DSAE-${info.workerIndex}`);
  SEMEADO = await semearDsa(info.workerIndex, EMAIL);
  await semearTurmaSemipresencial();
});

test.afterAll(async () => {
  if (TURMA_ID !== "") {
    await banco().from("registros_aula").delete().eq("turma_id", TURMA_ID);
    await banco().from("atividades_nao_letivas").delete().eq("turma_id", TURMA_ID);
    await banco().from("turma_disciplina_unidade").delete().eq("turma_id", TURMA_ID);
    await banco().from("turma_disciplina").delete().eq("turma_id", TURMA_ID);
    await banco().from("turmas").delete().eq("id", TURMA_ID);
  }
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Clica numa célula livre, escolhe disciplina, unidade e quem ministra, e manda gravar. */
async function lancarNaCelula(page: Page, celula: string, topico: string): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await escolherDisciplinaEUnidade(page, SEMEADO.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(topico);
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
}

test.describe("⚠️ `D-DSA-2` · a turma semipresencial só tem DSA na etapa presencial", () => {
  test("sem etapa avisa; a etapa se cadastra na ficha; fora dela não há DSA nem lançamento", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    /* ── 1. Sem a etapa cadastrada: o DSA abre como sempre, e AVISA (`RN-DEG-01`) ────────── */
    await irAFichaDaTurma(page, EMAIL, TURMA);
    /*
     * ⚠️ **SEMIPRESENCIAL MANTÉM O BOTÃO** (item 9 da conferência do PR #40, 08/10/2026): só a turma
     * EAD puro troca o botão pelo aviso. É o controle positivo do caso `Q-13` de `dsa-ver.spec.ts`.
     */
    await expect(page.locator('[data-slot="dsa-turma-ead"]')).toHaveCount(0);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    const semEtapa = page.locator('[data-slot="dsa-sem-etapa-presencial"]');
    await expect(semEtapa).toBeVisible();
    await expect(page.locator(GRADE)).toBeVisible();

    /* ── 2. O aviso leva à ficha, e «Editar turma» grava a etapa — no BANCO ──────────────── */
    await semEtapa.getByRole("link").click();
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(TURMA);
    await abrirEdicaoDaTurma(page);
    await expect(page.locator('[data-slot="etapa-presencial-da-turma"]')).toBeVisible();
    await page.locator("#turma-etapa-inicio").fill(INICIO_DA_ETAPA);
    await page.locator("#turma-etapa-termino").fill(TERMINO_DA_ETAPA);
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect
      .poll(async () => {
        const { data } = await banco()
          .from("turmas")
          .select("inicio_etapa_presencial, termino_etapa_presencial")
          .eq("id", TURMA_ID)
          .maybeSingle();
        const l = data as {
          inicio_etapa_presencial: string | null;
          termino_etapa_presencial: string | null;
        } | null;
        return `${l?.inicio_etapa_presencial}/${l?.termino_etapa_presencial}`;
      })
      .toBe(`${INICIO_DA_ETAPA}/${TERMINO_DA_ETAPA}`);

    /* ── 3. A semana inteira fora da etapa: a frase, e grade nenhuma ──────────────────────── */
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await irParaASemanaDoDia(page, "2027-04-05", 14, 2027);
    const aDistancia = page.locator('[data-slot="dsa-etapa-a-distancia"]');
    await expect(aDistancia).toContainText("Etapa a distância — sem DSA nesta semana");
    await expect(aDistancia).toContainText("05/05/2027 a 28/05/2027");
    await expect(page.locator(GRADE)).toHaveCount(0);

    /* ── 4. A semana que a etapa corta ao meio: abre, e nomeia os dias de fora ──────────── */
    await irParaASemanaDoDia(page, "2027-05-03", 18, 2027);
    await expect(page.locator(GRADE)).toBeVisible();
    const diasDeFora = page.locator('[data-slot="dsa-dias-a-distancia"]');
    await expect(diasDeFora).toContainText("03/05/2027");
    await expect(diasDeFora).toContainText("04/05/2027");
    await expect(diasDeFora).not.toContainText("05/05/2027");

    /* ── 5. Lançar na segunda (fora): a Server Action RECUSA, e o banco não ganha linha ─── */
    const antes = await aulasDaTurma();
    expect(antes, "não li as aulas da turma no banco").toBeGreaterThanOrEqual(0);
    await lancarNaCelula(page, "0:0", "Aula num dia da etapa a distância");
    const recusa = page.locator('[data-slot="recusa-do-lancamento"]');
    await expect(recusa).toBeVisible({ timeout: 60_000 });
    await expect(recusa).toContainText("Fora da etapa presencial (05/05/2027 a 28/05/2027)");
    expect(await aulasDaTurma(), "a aula entrou num dia da etapa a distância").toBe(antes);
    await page.locator(FORMULARIO).getByRole("button", { name: "Cancelar" }).click();

    /* ── 6. ⚠️ CONTROLE POSITIVO: a quarta, dentro da etapa, na MESMA semana, grava ─────── */
    await lancarNaCelula(page, "0:2", "Aula no primeiro dia da etapa presencial");
    await expect.poll(aulasDaTurma, { timeout: 60_000 }).toBe(antes + 1);
  });
});
