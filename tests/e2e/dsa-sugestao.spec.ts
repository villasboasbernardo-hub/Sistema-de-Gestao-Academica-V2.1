/**
 * A **sugestão de instrutor** do lançamento — FR-012.2 da spec 016 (item 1.12; `PEND-DSA-SUGESTAO`).
 *
 * > *"O formulário de lançamento MUST sugerir instrutor e técnica por `preencherLancamento`, com a cascata
 * > UE → disciplina na turma → vazio, e a lista de candidatos em antiguidade. A sugestão é editável e nunca
 * > bloqueia."* — FR-012.2
 *
 * ⚠️ **O CASO QUE DISCRIMINA É A ATRIBUIÇÃO POR DISCIPLINA** (DoD 8): até 18/10/2026 a tela só sugeria pela
 * UE — e a consulta dela falhava sempre —, então com a turma atribuída na disciplina o campo abria vazio.
 *
 * ⚠️ **TUDO POR CLIQUE A PARTIR DO MENU**: *Turmas* → a turma → *Abrir o DSA* → a semana pela data → um tempo
 * vazio → a disciplina e a UE.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, SEGUNDA, SEMANA, limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplina, irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const SELETOR = `${FORMULARIO} [data-slot="responsavel-do-lancamento"] [data-slot="seletor-instrutor"]`;

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;
let LINHA_DA_TURMA = "";

async function idDe(tabela: string, filtros: Record<string, string>): Promise<string> {
  let consulta = admin.from(tabela).select("id");
  for (const [coluna, valor] of Object.entries(filtros)) consulta = consulta.eq(coluna, valor);
  const { data, error } = await consulta.single();
  if (error || !data) throw new Error(`${tabela} da semente: ${error?.message}`);
  return (data as { id: string }).id;
}

/** A turma da semente com o instrutor habilitado atribuído NA DISCIPLINA — e nenhuma atribuição por UE. */
async function atribuirNaDisciplina(): Promise<void> {
  const turmaId = await idDe("turmas", { codigo: SEMEADO.turmaComRelogio });
  const { data: t } = await admin.from("turmas").select("curso_id").eq("id", turmaId).single();
  const disciplinaId = await idDe("disciplinas", {
    curso_id: (t as { curso_id: string }).curso_id,
    cod_disciplina: SEMEADO.codDisciplina,
  });
  const instrutorId = await idDe("instrutores", { nome_completo: SEMEADO.nomeHabilitado });
  /* ⚠️ `codigo` explícito: o `DEFAULT` chama função de `app`, sem `usage` para a `service_role` (gotcha 5.1). */
  const { data: td, error } = await admin
    .from("turma_disciplina")
    .insert({
      codigo: `TDI-SUG-${PROCESSO}`,
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      status: "ativo",
    })
    .select("id")
    .single();
  if (error || !td) throw new Error(`falha ao criar a linha da turma: ${error?.message}`);
  LINHA_DA_TURMA = (td as { id: string }).id;
  const { error: erroParcela } = await admin.from("turma_disciplina_instrutor").insert({
    codigo: `TDI-SUG-${PROCESSO}#1`,
    turma_disciplina_id: LINHA_DA_TURMA,
    instrutor_id: instrutorId,
    status: "ativo",
  });
  if (erroParcela) throw new Error(`falha ao atribuir na disciplina: ${erroParcela.message}`);
}

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsasugestao", PROCESSO);
  await criarConta(EMAIL, `USR-DSAS-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
  await atribuirNaDisciplina();
});

test.afterAll(async () => {
  if (LINHA_DA_TURMA !== "") {
    await admin
      .from("turma_disciplina_instrutor")
      .delete()
      .eq("turma_disciplina_id", LINHA_DA_TURMA);
    await admin.from("turma_disciplina").delete().eq("id", LINHA_DA_TURMA);
  }
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Ficha → *Abrir o DSA* → a semana de referência → o TA 8 da sexta, vazio na semente. */
async function abrirOFormulario(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await page.locator(`${GRADE} td[data-celula="7:4"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
}

test.describe("FR-012.2 · a sugestão de instrutor, chegando por clique", () => {
  test("a disciplina atribuída sugere o instrutor; a UE mantém; e ele pode ser trocado", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await abrirOFormulario(page);
    /* RD-1 (Bloco 11): sem disciplina não há habilitado — a frase pede a disciplina, no lugar do seletor. */
    await expect(page.locator('[data-slot="aula-sem-habilitado"]')).toHaveText(
      "Escolha a disciplina.",
    );
    await expect(page.locator(SELETOR)).toHaveCount(0);

    await escolherDisciplina(page, SEMEADO.codDisciplina);
    await expect(page.locator(SELETOR)).toContainText(SEMEADO.nomeHabilitado);
    await expect(page.locator('[data-slot="aviso-sem-atribuicao"]')).toHaveCount(0);

    /* Sem atribuição por UE, a UE não muda a sugestão: o segundo degrau continua valendo. */
    await page.locator("#dsa-unidade").selectOption({ index: 1 });
    await expect(page.locator(SELETOR)).toContainText(SEMEADO.nomeHabilitado);

    /*
     * ⚠️ A sugestão é editável pelo seletor canônico — e, desde a RD-1 (Bloco 11), a lista da aula traz só os
     *    habilitados na disciplina: quem não tem vínculo não está lá para ser escolhido.
     */
    await page.locator(SELETOR).click();
    const painel = page.locator('[data-slot="popover-content"]');
    await expect(
      painel.getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") }).first(),
    ).toBeVisible();
    await expect(
      painel.getByRole("option", { name: new RegExp(SEMEADO.nomeSemHabilitacao, "i") }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("disciplina sem atribuição na turma: o campo fica vazio e a frase diz onde atribuir", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await abrirOFormulario(page);
    await escolherDisciplina(page, SEMEADO.codDisciplina);
    await expect(page.locator(SELETOR)).toContainText(SEMEADO.nomeHabilitado);

    /* Trocar para a disciplina sem atribuição tira o que a SUGESTÃO pôs — nunca fica o da anterior. */
    await escolherDisciplina(page, SEMEADO.codDisciplinaIsenta);
    await expect(page.locator(SELETOR)).toContainText("Escolha o instrutor");
    await expect(page.locator('[data-slot="aviso-sem-atribuicao"]')).toContainText(
      "Instrutores nesta turma",
    );
  });
});
