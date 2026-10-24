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
 *
 * ⚠️ **SPEC 017 (D-COR-4, T031): TODA TROCA LEVA OBSERVAÇÃO, E A FICHA MOSTRA O HISTÓRICO.** A prova é a ficha
 * recarregada **e** a linha em `turma_trocas_de_situacao`, com o autor; e o autor sai pelo NOME para quem lê
 * `usuarios` (o Admin) e como *"outra conta"* para quem não lê (o Operador e quem só lê turma) — a C-22.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { sessaoDe } from "./curso-de-teste";
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
let EMAIL_OPERADOR = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("situacao-admin", p);
  EMAIL_ENCARREGADO = emailDeTeste("situacao-encarregado", p);
  EMAIL_SO_LEITURA = emailDeTeste("situacao-leitura", p);
  EMAIL_OPERADOR = emailDeTeste("situacao-operador", p);
  await criarConta(EMAIL_ADMIN, `USR-SIT-ADM-${p}`);
  await criarConta(EMAIL_ENCARREGADO, `USR-SIT-ENC-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_SO_LEITURA, `USR-SIT-LER-${p}`, "encarregado_orientacao_pedagogica");
  // A turma da amostra é de curso REGULAR: é o recorte do Operador de escopo regular.
  await criarConta(EMAIL_OPERADOR, `USR-SIT-OPR-${p}`, "operador", "regular");
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_SO_LEITURA);
  await apagarConta(EMAIL_OPERADOR);
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

test("`FR-015.1` · quem só LÊ turma não vê *Editar turma*, onde a situação se troca (spec 025, D-2)", async ({
  page,
}) => {
  await irAFichaDaTurma(page, EMAIL_SO_LEITURA, SEMEADO.turmaJanelaCedo);
  await expect(seloDaSituacao(page)).toBeVisible();
  await expect(page.locator('[data-slot="editar-turma"]')).toHaveCount(0);
});

/*
 * REGRA DOS VALORES ESPERADOS: (a), spec 025 (Bloco 10, D-2; emenda o FR-015.4 da spec 016) — *"um único Editar edita
 * tudo"*: a situação voltou a *Editar turma*, e o botão *Trocar situação* da ficha saiu. A observação da troca aparece
 * só quando a situação muda.
 */
test("`D-2` da spec 025 · *Editar turma* tem a Situação, com a observação só quando ela muda; a criação também", async ({
  page,
}) => {
  await irAFichaDaTurma(page, EMAIL_ADMIN, SEMEADO.turmaJanelaCedo);
  await expect(page.locator('[data-slot="trocar-situacao"]')).toHaveCount(0);
  await abrirEdicaoDaTurma(page);
  await expect(page.locator('[data-slot="formulario-de-turma"]')).toHaveAttribute(
    "data-modo",
    "edicao",
  );
  await expect(page.locator("#turma-situacao")).toBeVisible();
  await expect(page.locator('[data-slot="observacao-da-situacao"]')).toHaveCount(0);
  const atual = await page.locator("#turma-situacao").inputValue();
  await page
    .locator("#turma-situacao")
    .selectOption(atual === "cancelada" ? "planejada" : "cancelada");
  await expect(page.locator('[data-slot="observacao-da-situacao"]')).toBeVisible();

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

/* ── Spec 017 · D-COR-4 · a observação em toda troca e o histórico na ficha (T031) ─────────────── */

async function idDaTurma(codigo: string): Promise<string> {
  const { data } = await banco().from("turmas").select("id").eq("codigo", codigo).single();
  return (data as { id: string }).id;
}

/** A última troca da trilha da turma — o que o gatilho anotou. */
async function ultimaTroca(codigo: string) {
  const { data } = await banco()
    .from("turma_trocas_de_situacao")
    .select("situacao_anterior, situacao_nova, observacao, autor_id")
    .eq("turma_id", await idDaTurma(codigo))
    .order("ordem", { ascending: false })
    .limit(1)
    .single();
  return data as {
    situacao_anterior: string;
    situacao_nova: string;
    observacao: string | null;
    autor_id: string | null;
  };
}

/** Troca em *Editar turma* (spec 025, D-2), com observação (ou sem, se vazia), e espera a confirmação na ficha. */
async function trocarComObservacao(page: Page, rotulo: string, observacao: string): Promise<void> {
  await trocarSituacaoPelaFicha(page, rotulo, observacao === "" ? undefined : observacao);
}

async function abrirHistorico(page: Page) {
  const historico = page.locator('[data-slot="historico-da-situacao"]');
  await expect(historico).toBeVisible();
  if ((await historico.getAttribute("open")) === null) await historico.locator("summary").click();
  return historico.locator('[data-slot="evento-da-situacao"]');
}

const ROTULO: Readonly<Record<string, string>> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

test("`D-COR-4` · a troca COM observação e a troca SEM ela vão ao histórico da ficha e à trilha, com o autor", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const codigo = SEMEADO.turmaJanelaCedo;
  const antes = (await situacaoNoBanco(codigo)) as string;
  const primeira = antes === "cancelada" ? "planejada" : "cancelada";
  const observacao = `Turma sem alunos — prova ${SEMEADO.processo}`;

  await irAFichaDaTurma(page, EMAIL_ADMIN, codigo);
  await trocarComObservacao(page, ROTULO[primeira] as string, observacao);
  await page.reload();
  let eventos = await abrirHistorico(page);
  await expect(eventos.first()).toContainText(`→ ${ROTULO[primeira]}`);
  await expect(eventos.first().locator('[data-slot="observacao-do-evento"]')).toHaveText(
    observacao,
  );
  // C-22: o Admin lê `usuarios` — o autor sai pelo nome da conta.
  await expect(eventos.first()).toContainText("Conta de percurso automatizado");
  const comObservacao = await ultimaTroca(codigo);
  expect(comObservacao).toMatchObject({ situacao_nova: primeira, observacao });
  expect(comObservacao.autor_id, "a trilha não anotou quem trocou").not.toBeNull();

  // Sem observação: a troca também fica no histórico, só que sem o texto.
  await trocarComObservacao(page, ROTULO[antes] as string, "");
  await page.reload();
  eventos = await abrirHistorico(page);
  await expect(eventos.first()).toContainText(`${ROTULO[primeira]} → ${ROTULO[antes]}`);
  await expect(eventos.first().locator('[data-slot="observacao-do-evento"]')).toHaveCount(0);
  const semObservacao = await ultimaTroca(codigo);
  expect(semObservacao).toMatchObject({ situacao_nova: antes, observacao: null });
  expect(await situacaoNoBanco(codigo)).toBe(antes);
});

test("`D-COR-4` · `C-22` · quem não lê `usuarios` vê o histórico com o autor como «outra conta»", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const codigo = SEMEADO.turmaJanelaCedo;
  const antes = (await situacaoNoBanco(codigo)) as string;
  const outra = antes === "cancelada" ? "planejada" : "cancelada";
  const marca = `Preparo do C-22 ${SEMEADO.processo}`;
  // O preparo é a troca do Admin pela MESMA função do banco que o diálogo chama (o percurso dela é o caso acima).
  const sessao = await sessaoDe(EMAIL_ADMIN);
  for (const [status, observacao] of [
    [outra, marca],
    [antes, null],
  ] as const) {
    const { error } = await sessao.rpc("trocar_situacao_da_turma", {
      p_codigo: codigo,
      p_status: status,
      p_observacao: observacao,
    });
    expect(error).toBeNull();
  }

  for (const email of [EMAIL_OPERADOR, EMAIL_SO_LEITURA]) {
    await page.context().clearCookies();
    await irAFichaDaTurma(page, email, codigo);
    const eventos = await abrirHistorico(page);
    await expect(eventos.filter({ hasText: marca }).first()).toContainText("outra conta");
    await expect(eventos.filter({ hasText: "Conta de percurso automatizado" })).toHaveCount(0);
  }
  // Quem só lê a turma vê o histórico e não o botão (a última sessão aberta é a dele).
  await expect(page.locator('[data-slot="trocar-situacao"]')).toHaveCount(0);
});
