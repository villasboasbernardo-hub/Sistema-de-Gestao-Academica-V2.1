/**
 * **A jornada do critério 8: lançar → ver → imprimir num ÚNICO percurso, por clique**
 * (`SC-008`, critério **8** do Épico 6, documento 06 da Fase 1 · spec 013, `T086.1`).
 *
 * > *"O operador lança a semana inteira de uma turma, confere na grade e imprime o DSA, sem sair da
 * > tela da semana."*
 * > — critério **8** do Épico 6
 *
 * ⚠️ **ESTE ARQUIVO EXISTE PORQUE OS TRÊS OUTROS NÃO PROVAM A JORNADA.** `dsa-ver.spec.ts`,
 * `dsa-lancar.spec.ts` e `dsa-imprimir.spec.ts` provam as **partes**, cada um com o seu ponto de
 * partida — e três partes verdes não dizem que elas se encaixam. O que se mede aqui é a **costura**:
 * o que foi lançado num clique aparece na grade e **sai no papel**, sem navegação por endereço no
 * meio.
 *
 * ⚠️ **O `goto` APARECE UMA VEZ SÓ, para posicionar a SEMANA — e é o «ponto de partida» que a regra
 * autoriza.** A semana de referência está em abril de 2026; alcançá-la a partir de hoje pela
 * navegação levaria dezenas de cliques em *semana anterior*, e a navegação **já tem percurso
 * próprio** (`RF-NAV-04`, em `dsa-ver.spec.ts`). Tudo o que vem depois é clique.
 */
import { expect, test } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { escolherDisciplinaEUnidade } from "./percurso-do-dsa";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const DOCUMENTO = '[data-slot="dsa-impresso"]';

/** O conteúdo lançado nesta jornada — é por ele que o papel se reconhece. */
const TOPICO_DA_JORNADA = "Aula lançada na jornada do critério 8";

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsajornada", PROCESSO);
  await criarConta(EMAIL, `USR-DSAJ-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Quantas páginas tem um PDF do Chromium — `/Pages` é o nó da árvore, e o `[^s]` o separa. */
function paginasDoPdf(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

test("⚠️ critério 8 · ficha → DSA → lançar → ver na grade → imprimir, num percurso só", async ({
  page,
}) => {
  /* ── 1. A ficha da turma, alcançada por clique a partir da lista ─────────────────────────── */
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);

  /* ── 2. *Abrir o DSA* — o caminho clicável que torna a tela entregue (`SC-003`) ──────────── */
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();

  /* O único `goto` do percurso: a semana de referência. Ver a nota do topo. */
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
  );
  await expect(page.locator(GRADE)).toBeVisible();

  /* ── 3. Lançar: clicar na célula livre e gravar ──────────────────────────────────────────── */
  /*
   * ⚠️ **A CÉLULA É LIVRE DE VERDADE, E ESCOLHER ERRADO CUSTA UM DIAGNÓSTICO.** Célula coberta por
   * `rowSpan` **não tem `<td>`**, e o clique morre em *Test timeout* — sintoma que se lê como
   * lentidão. `7:1` é o TA 8 da terça, que nenhum lançamento da semente ocupa.
   */
  await page.locator(`${GRADE} td[data-celula="7:1"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();

  await escolherDisciplinaEUnidade(page, SEMEADO.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(TOPICO_DA_JORNADA);
  /*
   * ⚠️ **UM TEMPO SÓ, de propósito:** com os 4 que o pré-preenchimento sugere, o bloco passa dos 8
   * TA do regime e isso **gera alerta** — que, corretamente, **mantém o formulário aberto** para
   * ser lido (`RN-DEG-02`). A jornada mede o caminho limpo; o caminho com alerta tem caso próprio.
   */
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator(FORMULARIO)).toHaveCount(0);

  /* ── 4. Ver na grade: o que foi lançado está lá, sem recarregar à mão ────────────────────── */
  await expect(page.locator(GRADE)).toContainText(TOPICO_DA_JORNADA);

  /* ── 5. Imprimir, pelo botão ─────────────────────────────────────────────────────────────── */
  await page.locator('[data-slot="imprimir-dsa"]').click();
  /*
   * ⚠️ A TELA TAMBÉM MOSTRA O DOCUMENTO (modelo v4, mesma montagem): sem esperar a URL, a asserção
   * seguinte passaria ainda na tela, e o PDF seria o da tela inteira.
   */
  await page.waitForURL(/\/print\/dsa/);
  await expect(page.locator(DOCUMENTO)).toBeVisible();

  /*
   * ⚠️ **A COSTURA É ESTA ASSERÇÃO.** O papel traz **o lançamento que acabou de ser feito** — é o
   * que distingue "as três telas funcionam" de "a jornada funciona". Se o papel lesse outra semana,
   * outra turma ou um retrato velho, as três partes continuariam verdes e esta linha reprovaria.
   */
  await expect(page.locator(DOCUMENTO)).toContainText(TOPICO_DA_JORNADA);

  /* ── 6. E cabe em UMA página A4 paisagem (`SC-001`) ──────────────────────────────────────── */
  const pdf = await page.pdf({ format: "A4", landscape: true });
  const paginas = paginasDoPdf(pdf);
  expect(paginas, "não consegui contar as páginas do PDF").toBeGreaterThan(0);
  expect(paginas, "o DSA da jornada passou de uma página").toBe(1);
});
