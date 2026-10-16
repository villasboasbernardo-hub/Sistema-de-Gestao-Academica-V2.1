/**
 * Todo card (e todo link) que leva a uma ABA chega à aba ABERTA E À VISTA — defeito achado por Bernardo Villas Boas
 * em Production, 16/10/2026: *"clicar no card de Avaliações não abre nada"*.
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É `toBeInViewport`, e não a URL nem o `aria-selected`.** Os e2e do PR 5 (#52)
 *    clicavam no card e conferiam `?aba=avaliacoes` e a aba selecionada — os dois verdadeiros com o defeito no lugar:
 *    o `<Link>` do Next rolava a página para o TOPO ao trocar a consulta, e as abas ficavam abaixo da faixa dos cards.
 *    Medido com o dado do remoto no local (CAHO 2026, 1366×768): `scrollY` 617 → 0, abas em y = 1.101. A aba trocava
 *    fora da tela, e quem clicou via o topo da ficha, igual a antes. Sem a âncora de `enderecoDasAvaliacoesDaTurma`,
 *    os casos 1, 2 e 4 abaixo reprovam no `toBeInViewport`.
 * ⚠️ **A JANELA É A DE UM NOTEBOOK (1366×768)**: numa janela alta o bastante, o defeito some — e o teste também.
 * ⚠️ `goto` só no ponto de partida; o resto é clique (regra «tela sem caminho clicável é tela não entregue»).
 */
import { expect, test, type Page } from "@playwright/test";

import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparAvaliacoes, semearAvaliacoes, type AvaliacoesSemeadas } from "./avaliacoes-de-teste";

const PREFIXO = "E2K";
let EMAIL_ADMIN = "";
let SEMEADO: AvaliacoesSemeadas;

test.use({ viewport: { width: 1366, height: 768 } });

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("cards-abas-admin", p);
  await criarConta(EMAIL_ADMIN, `USR-CARD-ABA-${p}`);
  SEMEADO = await semearAvaliacoes(p, PREFIXO);
});

test.afterAll(async ({}, info) => {
  await limparAvaliacoes(info.workerIndex, PREFIXO);
  await apagarConta(EMAIL_ADMIN);
});

const ABAS_DA_TURMA = '[role="tablist"][aria-label="Seções da turma"]';

/** A aba «Avaliações» da ficha: na URL, selecionada, e com as abas e o quadro DENTRO da janela. */
async function conferirAbaDeAvaliacoesAVista(page: Page) {
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await expect(page.locator('[data-aba="avaliacoes"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(ABAS_DA_TURMA)).toBeInViewport();
  await expect(
    page.locator(`[data-avaliacoes-disciplina="${SEMEADO.disciplinaComTempo}"]`),
  ).toBeInViewport();
}

test("1 · ficha da turma → card «Avaliações» → a aba Avaliações, aberta e à vista; «voltar» desfaz um passo", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, enderecoDaTurma(SEMEADO.turma));
  const card = page.locator('[data-slot="card-de-avaliacoes"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await conferirAbaDeAvaliacoesAVista(page);

  await page.goBack();
  await expect(page).not.toHaveURL(/[?&]aba=avaliacoes/);
  await expect(page.locator('[data-aba="ficha"]')).toHaveAttribute("aria-selected", "true");
});

test("2 · ficha da turma → alerta de vista → a aba Avaliações, aberta e à vista", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, enderecoDaTurma(SEMEADO.turma));
  const alertas = page.locator('[data-slot="alertas-de-vista"]');
  await alertas.locator('[data-slot="avisos-recolhiveis"] button').first().click();
  await alertas.locator('[data-alerta-de-vista="atrasada"]').getByRole("link").first().click();
  await conferirAbaDeAvaliacoesAVista(page);
});

test("3 · /inicio → card da turma → a página do curso na aba Grade, com a turma, aberta e à vista", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, "/inicio");
  const card = page.locator(`[data-slot="panorama-de-turmas"] [data-turma="${SEMEADO.turma}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/cursos\/[^?]+\?turma=/);
  const abas = page.locator('[data-slot="abas-do-curso"]');
  await expect(abas.locator('[data-aba="grade"]')).toHaveAttribute("aria-selected", "true");
  await expect(abas.getByRole("tablist")).toBeInViewport();
  await expect(abas.getByRole("tabpanel")).toBeInViewport();
});

test("4 · aba Avaliações do curso → «abrir na ficha da turma» → a aba Avaliações da turma, aberta e à vista", async ({
  page,
}) => {
  await entrar(page, EMAIL_ADMIN, `/cursos/${encodeURIComponent(SEMEADO.curso)}`);
  await page.locator('[data-slot="abas-do-curso"] [data-aba="avaliacoes"]').click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await page
    .locator('[data-slot="avaliacoes-do-curso-turma"]')
    .getByRole("link", { name: "abrir na ficha da turma" })
    .click();
  await expect(page).toHaveURL(/\/turmas\//);
  await conferirAbaDeAvaliacoesAVista(page);
});
