/**
 * Os passos do percurso do DSA que mais de um arquivo repete — a semana pela data e o formulário de
 * lançamento na ORDEM do item 1 das correções de 08/10/2026 *(decisão de Bernardo Villas Boas)*:
 * tipo → disciplina → unidade de ensino (opcional) → em qual tempo começa → quantos tempos.
 *
 * ⚠️ **UM AUXILIAR SÓ, porque são vários arquivos que lançam pela grade**: cada um escrevendo a ordem
 * à mão seria mais um lugar a esquecer que a unidade só aparece DEPOIS da disciplina — e o sintoma
 * seria `locator.selectOption: Test timeout`, que se lê como lentidão e não como passo faltando.
 */
import { expect, type Page } from "@playwright/test";

/**
 * Abre a semana que contém `dia` pelo CAMPO DE DATA da navegação (item 4 de 08/10/2026), e espera a
 * semana chegar.
 *
 * ⚠️ **É O QUE TIRA O `page.goto` DO MEIO DO PERCURSO.** Até o item 4, a semana de referência (abril
 * de 2026) só se alcançava digitando o endereço — a partir de hoje seriam dezenas de cliques em
 * *Semana anterior*. Agora se chega a ela como a pessoa chega: escolhendo o dia no calendário.
 */
export async function irParaASemanaDoDia(
  page: Page,
  dia: string,
  semana: number,
  ano: number,
): Promise<void> {
  await page.getByLabel("Ir para a semana do dia").fill(dia);
  await expect(page.locator('[data-slot="semana-atual"]')).toHaveText(`semana ${semana} de ${ano}`);
}

/**
 * Escolhe a disciplina pelo CÓDIGO (`cod_disciplina`), que é o começo do rótulo da opção
 * (`"D0 — Disciplina do percurso do DSA"`). ⚠️ Por código e não por posição: a ordem das opções é a
 * do curso, e a semente põe três disciplinas nele.
 */
export async function escolherDisciplina(page: Page, cod: string): Promise<void> {
  const campo = page.locator("#dsa-disciplina");
  await expect(campo).toBeVisible();
  const opcao = campo.locator("option").filter({ hasText: new RegExp(`^${cod} — `) });
  await expect(opcao, `a disciplina ${cod} não está entre as opções`).toHaveCount(1);
  const valor = await opcao.getAttribute("value");
  await campo.selectOption(valor ?? "");
}

/** A disciplina e a PRIMEIRA unidade dela — o caminho de sempre do lançamento de aula. */
export async function escolherDisciplinaEUnidade(page: Page, cod: string): Promise<void> {
  await escolherDisciplina(page, cod);
  await page.locator("#dsa-unidade").selectOption({ index: 1 });
}
