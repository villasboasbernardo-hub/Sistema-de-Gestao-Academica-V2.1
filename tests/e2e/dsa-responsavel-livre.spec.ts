/**
 * `RN-RESP-1` (emenda de 15/10/2026 à spec 014) pela tela: o FISCAL DO CADASTRO escolhido no formulário do DSA, e a
 * ATIVIDADE com «Outro responsável (nome livre)» que, no cartão de edição, troca para um instrutor do cadastro.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA TROCA NO CARTÃO.** Antes da emenda o cartão mandava só `instrutor_id` numa
 *    atividade que tinha `responsavel_externo`, e o `CHECK ativ_responsavel_exclusivo` recusava (`23514`); agora a ação
 *    zera o outro lado. O banco é a prova: `instrutor_id` preenchido E `responsavel_externo` nulo, na mesma linha.
 * ⚠️ **UM CASO SÓ, EM SÉRIE** (como `dsa-avaliacao-item.spec.ts`): as células são as de uma semente recém-criada, e o
 *    cartão abre sobre a atividade que o próprio caso lançou.
 * ⚠️ `goto` só no ponto de partida; daí, ficha → DSA → célula → formulário → grade → cartão.
 * ⚠️ **A LIMPEZA CONFERE O RESULTADO**: o `afterAll` reprova se a atividade marcada ou a turma da semente sobrarem.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ROTULO_NOME_LIVRE } from "@/lib/dominio/responsavel";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplina, irParaASemanaDoDia } from "./percurso-do-dsa";

test.describe.configure({ mode: "serial" });

let EMAIL = "";
let S: DsaSemeado;
const MARCA = `resp-livre-${Date.now().toString(36)}`;
const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const CARTAO = '[data-slot="acoes-do-bloco"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("dsaresp", info.workerIndex);
  await criarConta(EMAIL, `USR-DSAR-${info.workerIndex}`);
  S = await semearDsa(info.workerIndex, EMAIL);
});

test.afterAll(async () => {
  const { error: erroDaAtividade } = await banco()
    .from("atividades_nao_letivas")
    .delete()
    .like("descricao", `%${MARCA}%`);
  await limparDsa(S);
  await apagarConta(EMAIL);
  if (erroDaAtividade) throw new Error(`a limpeza da atividade falhou: ${erroDaAtividade.message}`);
  const [{ data: atividades, error: e1 }, { data: turmas, error: e2 }] = await Promise.all([
    banco().from("atividades_nao_letivas").select("id").like("descricao", `%${MARCA}%`),
    banco().from("turmas").select("id").eq("codigo", S.turmaComRelogio),
  ]);
  if (e1 || e2) throw new Error(`a conferência da limpeza falhou: ${(e1 ?? e2)?.message}`);
  /*
   * ⚠️ Spec 024: a turma da semente é a do processo, e outro arquivo do mesmo processo pode ter salvado uma semana nela —
   *    o evento vai para a trilha `dsa_eventos_da_semana`, imutável (nada se apaga), e a turma fica. Turma com trilha não
   *    é limpeza esquecida; as atividades da amostra, sim.
   */
  const comTrilha =
    (turmas ?? []).length > 0 &&
    ((
      await banco()
        .from("dsa_eventos_da_semana")
        .select("id", { count: "exact", head: true })
        .in(
          "turma_id",
          (turmas ?? []).map((t) => (t as { id: string }).id),
        )
    ).count ?? 0) > 0;
  if ((atividades ?? []).length > 0 || ((turmas ?? []).length > 0 && !comTrilha)) {
    throw new Error(
      `a limpeza deixou ${(atividades ?? []).length} atividade(s) e ${(turmas ?? []).length} turma(s)`,
    );
  }
});

async function turmaId(): Promise<string> {
  const { data, error } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  if (error) throw new Error(`turma da semente não encontrada: ${error.message}`);
  return (data as { id: string }).id;
}

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

/** Escolhe no seletor canônico que mora dentro de `onde`. */
async function escolherEm(page: Page, onde: string, nome: string): Promise<void> {
  await page.locator(`${onde} [data-slot="seletor-instrutor"]`).first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(nome, "i") })
    .first()
    .click();
}

/** Espera o desfecho de uma gravação: «fechou», «avisou» ou «recusou: …». */
async function desfecho(page: Page, onde: string, recusa: string, avisos: string): Promise<string> {
  const ler = async (): Promise<string> => {
    if ((await page.locator(`[data-slot="${recusa}"]`).count()) > 0) {
      return `recusou: ${await page.locator(`[data-slot="${recusa}"]`).innerText()}`;
    }
    if ((await page.locator(onde).count()) === 0) return "fechou";
    if ((await page.locator(`[data-slot="${avisos}"]`).count()) > 0) return "avisou";
    return "em curso";
  };
  await expect.poll(ler, { timeout: 60_000 }).not.toBe("em curso");
  return ler();
}

test("RN-RESP-1 · fiscal do cadastro no formulário; atividade de nome livre trocada por instrutor no cartão", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await abrirASemana(page);
  const id = await turmaId();

  // ── a prova (terça, 7º tempo): o aplicador habilitado e o FISCAL DO CADASTRO, pelo seletor canônico ──
  await abrirCelula(page, "6:1");
  await page.locator('[data-tipo="avaliacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  if ((await page.locator("#dsa-item-do-curriculo").count()) > 0) {
    await page.locator("#dsa-item-do-curriculo").selectOption({ index: 1 });
  }
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-tipo-avaliacao").selectOption({ index: 1 });
  await escolherEm(page, FORMULARIO, S.nomeHabilitado);

  const fiscal = `${FORMULARIO} [data-slot="fiscal-da-avaliacao"]`;
  /* Sem fiscal do cadastro, o nome livre está à vista, com o rótulo único. */
  await expect(page.locator('label[for="dsa-fiscal-externo"]')).toHaveText(ROTULO_NOME_LIVRE);
  await escolherEm(page, fiscal, S.nomeSemHabilitacao);
  /* Com o fiscal do cadastro escolhido, o nome livre some — os dois são exclusivos. */
  await expect(page.locator("#dsa-fiscal-externo")).toHaveCount(0);
  await page.locator('[data-slot="gravar-lancamento"]').click();
  expect(
    await desfecho(page, FORMULARIO, "recusa-do-lancamento", "avisos-do-lancamento"),
  ).not.toMatch(/^recusou/);
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.getByRole("button", { name: "Fechar o lançamento" }).click();
  }

  const { data: prova, error: erroDaProva } = await banco()
    .from("avaliacoes")
    .select("fiscal_id, nome_fiscal_externo, instrutor_responsavel_id")
    .eq("turma_id", id)
    .eq("data_avaliacao", "2026-04-07")
    .eq("ta_inicial", 7)
    .not("fiscal_id", "is", null)
    .single();
  expect(erroDaProva, "a prova com fiscal do cadastro não foi gravada").toBeNull();
  const p = prova as {
    fiscal_id: string;
    nome_fiscal_externo: string | null;
    instrutor_responsavel_id: string;
  };
  expect(p.nome_fiscal_externo).toBeNull();
  expect(p.fiscal_id).not.toBe(p.instrutor_responsavel_id);

  // ── a atividade (sexta, 3º tempo): AEC com «Outro responsável (nome livre)» ──
  const descricao = `Palestra de nome livre ${MARCA}`;
  await abrirCelula(page, "2:4");
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Palestra" });
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator("#dsa-tempos").fill("1");
  await expect(page.locator('label[for="dsa-responsavel-externo"]')).toHaveText(ROTULO_NOME_LIVRE);
  await page.locator("#dsa-responsavel-externo").fill("Palestrante De Fora");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  expect(
    await desfecho(page, FORMULARIO, "recusa-do-lancamento", "avisos-do-lancamento"),
  ).not.toMatch(/^recusou/);
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.getByRole("button", { name: "Fechar o lançamento" }).click();
  }

  const lerAtividade = async () => {
    const { data, error } = await banco()
      .from("atividades_nao_letivas")
      .select("instrutor_id, responsavel_externo")
      .eq("turma_id", id)
      .eq("descricao", descricao)
      .eq("status", "ativo")
      .single();
    if (error) throw new Error(`a atividade não foi lida: ${error.message}`);
    return data as { instrutor_id: string | null; responsavel_externo: string | null };
  };
  expect(await lerAtividade()).toEqual({
    instrutor_id: null,
    responsavel_externo: "Palestrante De Fora",
  });

  // ── o cartão: reabre com o nome livre GRAVADO, e a troca por instrutor do cadastro grava sem recusa ──
  await page.reload();
  await expect(page.locator(GRADE)).toBeVisible();
  await page.locator(`${GRADE} td[data-celula="2:4"]`).click();
  await expect(page.locator(CARTAO)).toBeInViewport();
  await expect(page.locator("#dsa-editar-responsavel-externo")).toHaveValue("Palestrante De Fora");
  await escolherEm(page, CARTAO, S.nomeHabilitado);
  await expect(page.locator("#dsa-editar-responsavel-externo")).toHaveCount(0);
  await page.locator('[data-slot="gravar-edicao"]').click();
  expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(/^recusou/);

  await expect
    .poll(async () => (await lerAtividade()).responsavel_externo, { timeout: 30_000 })
    .toBeNull();
  const depois = await lerAtividade();
  expect(depois.instrutor_id, "o instrutor do cadastro não foi gravado").not.toBeNull();
});
