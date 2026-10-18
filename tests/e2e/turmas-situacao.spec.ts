/**
 * Trocar a situação da turma — FR-015 da spec 016 (item 1.15 do plano de correções), por clique.
 *
 * > *"Ao lado do selo de Situação, um botão «Trocar situação» que abre um diálogo só com a situação e
 * > grava por uma Server Action própria."* — Q-14, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **A PROVA É O SELO DEPOIS DE RECARREGAR E O VALOR NO BANCO** — não o estado local de um campo,
 * que mostra o escolhido mesmo quando a gravação falha (era o defeito dos casos antigos).
 *
 * ⚠️ **O NEGATIVO É O PERFIL QUE SÓ LÊ TURMA** (Encarregado de Orientação Pedagógica, `L` em turmas):
 * ele não vê o botão. A chamada direta à ação, que o botão faria, é provada no banco pela suíte de RLS
 * (`cursos-e-turmas.test.ts`), com sessão real — um `UPDATE` barrado volta sem erro e com zero linhas.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";
import {
  abrirEdicaoDaTurma,
  irAFichaDaTurma,
  seloDaSituacao,
  trocarSituacaoPelaFicha,
} from "./navegar-turmas";

let cliente: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

let SEMEADO: CursosSemeados;
let EMAIL_ADMIN = "";
let EMAIL_ENCARREGADO = "";
let EMAIL_SO_LEITURA = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("situacao-admin", p);
  EMAIL_ENCARREGADO = emailDeTeste("situacao-encarregado", p);
  EMAIL_SO_LEITURA = emailDeTeste("situacao-leitura", p);
  await criarConta(EMAIL_ADMIN, `USR-SIT-ADM-${p}`);
  await criarConta(EMAIL_ENCARREGADO, `USR-SIT-ENC-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_SO_LEITURA, `USR-SIT-LER-${p}`, "encarregado_orientacao_pedagogica");
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_SO_LEITURA);
});

async function situacaoNoBanco(codigo: string): Promise<string | undefined> {
  const { data } = await banco().from("turmas").select("status").eq("codigo", codigo).single();
  return data?.status as string | undefined;
}

for (const [quem, email] of [
  ["Admin", () => EMAIL_ADMIN],
  ["Encarregado", () => EMAIL_ENCARREGADO],
] as const) {
  test(`\`FR-015.1\` · ${quem}: menu → Turmas → linha → *Trocar situação* → recarregar → o selo e o banco`, async ({
    page,
  }) => {
    const codigo = SEMEADO.turmaJanelaCedo;
    const antes = await situacaoNoBanco(codigo);
    const [nova, rotulo] =
      antes === "cancelada" ? ["planejada", "Planejada"] : ["cancelada", "Cancelada"];

    await irAFichaDaTurma(page, email(), codigo);
    await trocarSituacaoPelaFicha(page, rotulo);

    await page.reload();
    await expect(seloDaSituacao(page)).toContainText(rotulo);
    expect(await situacaoNoBanco(codigo), "a troca não chegou ao banco").toBe(nova);

    // A amostra volta ao estado que declara — o caso seguinte não herda a situação trocada.
    await banco().from("turmas").update({ status: antes }).eq("codigo", codigo);
  });
}

test("`FR-015.1` · quem só LÊ turma não vê *Trocar situação*", async ({ page }) => {
  await irAFichaDaTurma(page, EMAIL_SO_LEITURA, SEMEADO.turmaJanelaCedo);
  await expect(seloDaSituacao(page)).toBeVisible();
  await expect(page.locator('[data-slot="trocar-situacao"]')).toHaveCount(0);
});

test("`FR-015.4` · *Editar turma* não tem o campo Situação; a criação tem", async ({ page }) => {
  await irAFichaDaTurma(page, EMAIL_ADMIN, SEMEADO.turmaJanelaCedo);
  await abrirEdicaoDaTurma(page);
  await expect(page.locator('[data-slot="formulario-de-turma"]')).toHaveAttribute(
    "data-modo",
    "edicao",
  );
  await expect(page.locator("#turma-situacao")).toHaveCount(0);

  // A criação, pelo curso: menu → Cursos → cartão → *Nova turma* (a barra do topo, FR-006.1).
  const sigla = SEMEADO.porClassificacao.regular;
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Cursos", exact: true })
    .click();
  await page.locator(`[data-curso="${sigla}"]`).click();
  await page.locator('[data-slot="nova-turma"]').click();
  await expect(page.locator('[data-slot="formulario-de-turma"]')).toHaveAttribute(
    "data-modo",
    "novo",
  );
  await expect(page.locator("#turma-situacao")).toBeVisible();
});
