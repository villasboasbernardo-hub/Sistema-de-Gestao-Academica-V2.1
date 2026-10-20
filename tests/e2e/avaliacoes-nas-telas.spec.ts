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
import { expect, test } from "@playwright/test";

import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirAbaDoCurso, irAoCursoPorClique, irAsDisciplinasDoCurso } from "./navegar-curso";
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
  await semTempo.getByLabel("TA de aplicação").fill("3");
  await semTempo.getByLabel("Alcance do arbitrado").selectOption("curso");
  await semTempo.getByRole("button", { name: "Gravar" }).click();

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
});

test("FR-054 · o /inicio mostra a vista atrasada e a que vence em breve, com link para a aba", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, "/inicio");
  const alertas = page.locator('[data-slot="alertas-de-vista"]');
  // Nasce recolhido, com a contagem à vista (RNF-USA-04): abrir para ver a lista.
  await alertas.locator('[data-slot="avisos-recolhiveis"] button').first().click();
  await expect(
    alertas.locator(`[data-alerta-de-vista="atrasada"]`, { hasText: SEMEADO.turma }),
  ).toHaveCount(1);
  await expect(
    alertas.locator(`[data-alerta-de-vista="vence_em_breve"]`, { hasText: SEMEADO.turma }),
  ).toHaveCount(1);

  await alertas
    .locator(`[data-alerta-de-vista="atrasada"]`, { hasText: SEMEADO.turma })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await expect(page.locator('[data-slot="alertas-de-vista"]')).toBeVisible();
});

test("RN-AV-13 · a PP com tempo de vista, aplicada há 10 dias e sem vista, NÃO é vista atrasada — no /inicio nem na ficha", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, "/inicio");
  const noInicio = page.locator('[data-slot="alertas-de-vista"]');
  await noInicio.locator('[data-slot="avisos-recolhiveis"] button').first().click();
  const atrasadaNoInicio = (cod: string) =>
    noInicio.locator('[data-alerta-de-vista="atrasada"]', {
      hasText: `${VISTA.turma} · ${cod} ·`,
    });
  // Controle positivo: a PM da MESMA turma, aplicada no mesmo dia e sem vista, é atrasada.
  await expect(atrasadaNoInicio(VISTA.disciplinaPm)).toHaveCount(1);
  await expect(
    noInicio.locator("[data-alerta-de-vista]", {
      hasText: `${VISTA.turma} · ${VISTA.disciplinaPp} ·`,
    }),
  ).toHaveCount(0);

  // Pelo alerta da PM, à ficha da turma (aba Avaliações): o alerta da ficha conta UMA atrasada, não duas.
  await atrasadaNoInicio(VISTA.disciplinaPm).getByRole("link").click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  const naFicha = page.locator('[data-slot="alertas-de-vista"]');
  await expect(naFicha).toHaveAttribute("data-atrasadas", "1");
  await naFicha.locator('[data-slot="avisos-recolhiveis"] button').first().click();
  await expect(
    naFicha.locator('[data-alerta-de-vista="atrasada"]', { hasText: `${VISTA.disciplinaPm} ·` }),
  ).toHaveCount(1);
  await expect(
    naFicha.locator("[data-alerta-de-vista]", { hasText: `${VISTA.disciplinaPp} ·` }),
  ).toHaveCount(0);

  // E no quadro da aba: a PM 1 sai «Atrasada»; a PP 1, não.
  const pm = disciplinaNaAba(page, VISTA.disciplinaPm);
  await pm.locator("summary").click();
  await expect(pm.locator('[data-avaliacoes-item="PM 1"]')).toContainText("Atrasada");
  const pp = disciplinaNaAba(page, VISTA.disciplinaPp);
  await pp.locator("summary").click();
  await expect(pp.locator('[data-avaliacoes-item="PP 1"]')).toBeVisible();
  await expect(pp.locator('[data-avaliacoes-item="PP 1"]')).not.toContainText("Atrasada");
});

test("FR-038 · a aba Disciplinas do curso: as avaliações do currículo no painel, acrescentar e inativar", async ({
  page,
}) => {
  // Spec 018 (Bloco 3): a grade é a aba Disciplinas do curso — o menu não tem mais a entrada.
  await irAsDisciplinasDoCurso(page, EMAIL_ADMIN, SEMEADO.curso);
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
  const tg = painel.locator('[data-item-do-curriculo="TG 1"]');
  await expect(tg).toHaveAttribute("data-ativo", "true");
  await expect(nova).toHaveCount(0);

  // *Editar* abre os campos SÓ deste item, e gravar os fecha com o valor novo (FR-010.3).
  await tg.locator('[data-slot="editar-avaliacao-do-curriculo"]').click();
  await expect(painel.locator("input")).toHaveCount(2);
  await tg.getByLabel("TA de aplicação de TG 1").fill("3");
  await tg.locator('[data-slot="gravar-item"]').click();
  await expect(painel.getByRole("status").filter({ hasText: "TG 1 gravada" })).toBeVisible();
  await expect(painel.locator("input")).toHaveCount(0);
  await expect(tg).toContainText("3 TA");

  await tg.locator('[data-acao="inativar-item"]').click();
  await expect(tg).toHaveAttribute("data-ativo", "false");
  await expect(tg).toContainText("inativa");
});
