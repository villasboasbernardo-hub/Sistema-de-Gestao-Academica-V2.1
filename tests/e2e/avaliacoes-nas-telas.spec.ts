/**
 * As avaliações nas telas (spec 014, PR 5): T188 (card → aba), T189 (aba da turma e o arbitrado), T190 (aba do
 * curso) e T191 (alertas de vista no `/inicio`).
 *
 * ⚠️ **TODA TELA SE ALCANÇA POR CLIQUE**: `goto` só no ponto de partida (regra «tela sem caminho clicável é tela
 *    não entregue»). Card → aba, aba do curso, e o alerta do `/inicio` → a aba da turma.
 * ⚠️ **O CASO QUE DISCRIMINA** (DoD 8): a aba nasceu de uma recusa — a D5.1 punha o quadro numa âncora `#avaliacoes`
 *    da mesma página. Aqui se exige `?aba=avaliacoes` na URL **e** que «voltar» desfaça um passo; a âncora não
 *    passaria em nenhuma das duas.
 * ⚠️ **E O DA `RN-AV-13`** (emenda de 15/10/2026): uma PP COM tempo de vista no currículo, aplicada há 10 dias e sem
 *    vista, NÃO é vista atrasada — no `/inicio`, no alerta da ficha nem no quadro da aba. Antes da emenda os chamadores
 *    decidiam pelo tempo de vista do item, e ela apareceria nos três; a PM da mesma turma é o controle positivo.
 */
import { expect, test, type Page } from "@playwright/test";

import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { abrirAvisosPeloSininho, avisosDeVista } from "./avisos";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirAbaDoCurso, irAoCursoPorClique, irAsDisciplinasDaEdicao } from "./navegar-curso";
import {
  limparAvaliacoes,
  limparVistaPeloInstrumento,
  semearAvaliacoes,
  semearVistaPeloInstrumento,
  type AvaliacoesSemeadas,
  type VistaPeloInstrumentoSemeada,
} from "./avaliacoes-de-teste";

let EMAIL_ADMIN = "";
let EMAIL_OPERADOR = "";
let SEMEADO: AvaliacoesSemeadas;
let VISTA: VistaPeloInstrumentoSemeada;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("avaliacoes-admin", p);
  EMAIL_OPERADOR = emailDeTeste("avaliacoes-operador", p);
  await criarConta(EMAIL_ADMIN, `USR-AVL-ADM-${p}`);
  await criarConta(EMAIL_OPERADOR, `USR-AVL-OPE-${p}`, "operador", "especial");
  SEMEADO = await semearAvaliacoes(p);
  VISTA = await semearVistaPeloInstrumento(p);
});

test.afterAll(async ({}, info) => {
  await limparAvaliacoes(info.workerIndex);
  await limparVistaPeloInstrumento(info.workerIndex);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_OPERADOR);
});

const disciplinaNaAba = (page: import("@playwright/test").Page, cod: string) =>
  page.locator(`[data-avaliacoes-disciplina="${cod}"]`);

test("US10 · o card leva à ABA Avaliações, que mora na URL e empilha histórico", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, enderecoDaTurma(SEMEADO.turma));

  const card = page.locator('[data-slot="card-de-avaliacoes"]');
  await expect(card).toHaveAttribute("data-aplicadas", "2");
  await expect(card).toHaveAttribute("data-previstas", "3");
  await expect(card.locator('[data-avaliacoes="vistas"]')).toHaveText("vistas realizadas 0 de 2");

  await card.click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await expect(page.locator('[data-aba="avaliacoes"]')).toHaveAttribute("aria-selected", "true");
  await expect(disciplinaNaAba(page, SEMEADO.disciplinaComTempo)).toBeVisible();

  // A aba Ficha devolve as disciplinas e a edição; «voltar» desfaz UM passo.
  await page.locator('[data-aba="ficha"]').click();
  await expect(page.locator('[data-slot="disciplinas-da-turma"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-aba="avaliacoes"]')).toHaveAttribute("aria-selected", "true");
});

test("US9 · «tempo de avaliação não definido» e o Admin define o tempo no curso — a CH não muda", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, enderecoDaTurma(SEMEADO.turma));
  await page.locator('[data-slot="card-de-avaliacoes"]').click();

  const semTempo = disciplinaNaAba(page, SEMEADO.disciplinaSemTempo);
  await semTempo.locator("summary").click();
  await expect(semTempo).toContainText("tempo de avaliação não definido");

  await semTempo.locator('[data-slot="definir-tempo"]').click();
  // Spec 022 (Bloco 7, FR-002): o tempo se define num diálogo.
  const dialogo = page.locator('[data-slot="formulario-do-arbitrado"]');
  await dialogo.getByLabel("TA de aplicação").fill("3");
  await dialogo.getByLabel("Alcance do arbitrado").selectOption("curso");
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await expect(dialogo).toHaveCount(0);

  await expect(semTempo).not.toContainText("tempo de avaliação não definido");
  await expect(semTempo.locator('[data-avaliacoes="arbitrado"]').first()).toBeVisible();
});

test("US9 · o Operador vê o quadro, mas não as ações do arbitrado", async ({ page }) => {
  await entrar(page, EMAIL_OPERADOR, enderecoDaTurma(SEMEADO.turma));
  await page.locator('[data-slot="card-de-avaliacoes"]').click();
  const comTempo = disciplinaNaAba(page, SEMEADO.disciplinaComTempo);
  await comTempo.locator("summary").click();
  await expect(comTempo.locator('[data-avaliacoes="itens"]')).toBeVisible();
  await expect(page.locator('[data-slot="acoes-do-arbitrado"]')).toHaveCount(0);
});

/*
 * ⚠️ **SPEC 018 (Bloco 3), FR-002: O CURSO NÃO MOSTRA ACOMPANHAMENTO DE TURMA** (pedido de Bernardo Villas Boas,
 *    19/10/2026). Até o Bloco 3 a aba mostrava o quadro da turma da Grade — o cumprido, o "X de Y aplicadas" e a
 *    situação. O caso que discrimina: a amostra TEM turma com avaliação lançada, e a aba do curso não diz nada dela.
 */
test("US5 · a aba Avaliações do curso mostra só o previsto do currículo — nada de turma", async ({
  page,
}) => {
  await irAoCursoPorClique(page, EMAIL_ADMIN, SEMEADO.curso);
  await abrirAbaDoCurso(page, "avaliacoes");
  const aba = page.locator('[data-slot="aba-avaliacoes-do-curriculo"]');
  await expect(aba).toBeVisible();
  const disciplina = disciplinaNaAba(page, SEMEADO.disciplinaComTempo);
  await expect(disciplina).toBeVisible();
  await disciplina.locator("summary").click();
  await expect(disciplina.locator('[data-avaliacoes="itens"]')).toBeVisible();
  await expect(disciplina.locator('[data-avaliacoes="previstas"]')).toBeVisible();

  // Nada de turma: nem a turma, nem o cumprido, nem a situação, nem a projeção.
  await expect(page.locator('[data-slot="avaliacoes-do-curso-turma"]')).toHaveCount(0);
  await expect(aba.locator('[data-avaliacoes="x-de-y"]')).toHaveCount(0);
  await expect(aba.locator('[data-avaliacoes="projecao"]')).toHaveCount(0);
  await expect(aba.locator('[data-avaliacoes="sem-item"]')).toHaveCount(0);
  await expect(aba).not.toContainText(SEMEADO.turma);
  await expect(aba).not.toContainText(/aplicadas|Pendente|Concluída|Atrasada/);
  // ⚠️ Spec 021, ajuste 1 (conferência do PR #82): a página do curso é só leitura — nem o Admin tem o arbitrado ali.
  await expect(page.locator('[data-slot="acoes-do-arbitrado"]')).toHaveCount(0);
});

/*
 * ⚠️ SPEC 021, AJUSTE 3: as avaliações do currículo, com o arbitrado, editam-se em *Editar curso* → *Disciplinas e
 *    avaliações*. O caso que discrimina é o anterior: a mesma pessoa não tem a ação na página do curso.
 */
test("Spec 021 · ajuste 3 · o arbitrado do curso fica em Editar curso, no currículo escolhido", async ({
  page,
}) => {
  await irAsDisciplinasDaEdicao(page, EMAIL_ADMIN, SEMEADO.curso);
  const parte = page.locator('[data-slot="parte-disciplinas"]');
  await expect(parte.locator('[data-slot="aba-avaliacoes-do-curriculo"]')).toBeVisible();
  // As ações do arbitrado existem aqui (uma por item que não é OD); na página do curso, nenhuma (o caso de cima).
  await expect
    .poll(() => parte.locator('[data-slot="acoes-do-arbitrado"]').count())
    .toBeGreaterThan(0);
});

/*
 * Spec 022 (Bloco 7, FR-004.4): os alertas de vista saíram do /inicio e da ficha da turma — moram na página Avisos, pelo
 * sininho, no módulo Avaliações, com o link para a aba Avaliações da turma.
 */
test("FR-054 · Avisos mostra a vista atrasada e a que vence em breve, com link para a aba", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, "/inicio");
  await expect(page.locator('[data-slot="alertas-de-vista"]')).toHaveCount(0);
  await abrirAvisosPeloSininho(page);
  const atrasada = avisosDeVista(page, "atrasada").filter({ hasText: SEMEADO.turma });
  await expect(atrasada).toHaveCount(1);
  await expect(
    avisosDeVista(page, "vence_em_breve").filter({ hasText: SEMEADO.turma }),
  ).toHaveCount(1);

  await atrasada.getByRole("link").click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await expect(page.locator('[data-aba="avaliacoes"]')).toHaveAttribute("aria-selected", "true");
});

test("RN-AV-13 · a PP com tempo de vista, aplicada há 10 dias e sem vista, NÃO é vista atrasada — em Avisos nem na aba", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, "/inicio");
  await abrirAvisosPeloSininho(page);
  const daTurma = (tipo: "atrasada" | "vence_em_breve", cod: string) =>
    avisosDeVista(page, tipo)
      .filter({ hasText: `${VISTA.turma}:` })
      .filter({ hasText: `${cod} ·` });
  // Controle positivo: a PM da MESMA turma, aplicada no mesmo dia e sem vista, é atrasada — UMA vez.
  await expect(daTurma("atrasada", VISTA.disciplinaPm)).toHaveCount(1);
  await expect(daTurma("atrasada", VISTA.disciplinaPp)).toHaveCount(0);
  await expect(daTurma("vence_em_breve", VISTA.disciplinaPp)).toHaveCount(0);

  // Pelo aviso da PM, à ficha da turma (aba Avaliações).
  await daTurma("atrasada", VISTA.disciplinaPm).getByRole("link").click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);

  // E no quadro da aba: a PM 1 sai «Atrasada»; a PP 1, não.
  const pm = disciplinaNaAba(page, VISTA.disciplinaPm);
  await pm.locator("summary").click();
  await expect(pm.locator('[data-avaliacoes-item="PM 1"]')).toContainText("Atrasada");
  const pp = disciplinaNaAba(page, VISTA.disciplinaPp);
  await pp.locator("summary").click();
  await expect(pp.locator('[data-avaliacoes-item="PP 1"]')).toBeVisible();
  await expect(pp.locator('[data-avaliacoes-item="PP 1"]')).not.toContainText("Atrasada");
});

/**
 * ⚠️ SPEC 021 (Bloco 6, RC-6): O CURRÍCULO DESTA AMOSTRA ESTÁ EM USO — a turma dela tem lançamento. Acrescentar,
 *    mudar o que tinha valor e inativar são CORREÇÃO: o banco pede a justificativa, e a tela a pergunta. Responde-se aqui.
 */
async function justificar(page: Page, motivo: string): Promise<void> {
  const pedido = page.locator('[data-slot="pedido-de-justificativa"]');
  await expect(pedido).toBeVisible();
  await pedido.locator('[data-slot="justificativa-da-correcao"]').fill(motivo);
  await pedido.locator('[data-slot="confirmar-justificativa"]').click();
  await expect(pedido).toHaveCount(0);
}

test("FR-038 · Editar curso → Disciplinas e avaliações: as avaliações do currículo no painel, acrescentar e inativar", async ({
  page,
}) => {
  // Spec 021 (ajuste 3 da conferência do PR #82): editar o currículo é em *Editar curso*; a aba do curso só lê.
  await irAsDisciplinasDaEdicao(page, EMAIL_ADMIN, SEMEADO.curso);
  await page
    .getByRole("gridcell", { name: `Disciplina ${SEMEADO.disciplinaComTempo}`, exact: false })
    .first()
    .click();

  const painel = page.locator('[data-slot="avaliacoes-do-curriculo"]');
  await expect(painel.locator('[data-item-do-curriculo="PM 1"]')).toContainText(
    "2 TA + vista 1 TA",
  );

  // ⚠️ Em LEITURA desde 17/10/2026 (spec 016, FR-010.3): nenhum campo até alguém clicar em Editar.
  await expect(painel.locator("input, select")).toHaveCount(0);

  // Acrescentar um TG 1 transcrito do currículo — e depois inativá-lo: ele FICA na lista (regra 4).
  await painel.locator('[data-slot="acrescentar-avaliacao-do-curriculo"]').click();
  const nova = painel.locator('[data-slot="nova-avaliacao-do-curriculo"]');
  await nova.getByLabel("Instrumento").selectOption("TG");
  await nova.getByLabel("TA de aplicação").fill("2");
  await nova.getByLabel("Arquivo do currículo").fill("curriculo-e2e.pdf");
  await nova.getByLabel("Página").fill("3");
  await nova.getByRole("button", { name: "Acrescentar" }).click();
  await justificar(page, "Acrescentar o TG 1 que o currículo traz.");
  const tg = painel.locator('[data-item-do-curriculo="TG 1"]');
  await expect(tg).toHaveAttribute("data-ativo", "true");
  await expect(nova).toHaveCount(0);

  // *Editar* abre os campos SÓ deste item, e gravar os fecha com o valor novo (FR-010.3).
  await tg.locator('[data-slot="editar-avaliacao-do-curriculo"]').click();
  await expect(painel.locator("input")).toHaveCount(2);
  await tg.getByLabel("TA de aplicação de TG 1").fill("3");
  await tg.locator('[data-slot="gravar-item"]').click();
  await justificar(page, "O TG 1 tem 3 TA no currículo.");
  await expect(painel.getByRole("status").filter({ hasText: "TG 1 gravada" })).toBeVisible();
  await expect(painel.locator("input")).toHaveCount(0);
  await expect(tg).toContainText("3 TA");

  await tg.locator('[data-acao="inativar-item"]').click();
  await justificar(page, "O TG 1 saiu do currículo.");
  await expect(tg).toHaveAttribute("data-ativo", "false");
  await expect(tg).toContainText("inativa");
});
