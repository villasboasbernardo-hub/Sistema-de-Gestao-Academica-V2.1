/**
 * Como se **chega** à lista de turmas e à ficha — por clique, nunca por endereço.
 *
 * ⚠️ **ESTE ARQUIVO NASCEU NA SEGUNDA SUÍTE QUE PRECISOU DO MESMO PERCURSO** (04/10/2026, PR 3 da
 * spec 012). Os três auxiliares viviam dentro de `turmas-lista.spec.ts`, e `andamento.spec.ts`
 * precisava dos três para abrir a ficha de cinco turmas diferentes. **Duas cópias já são padrão; a
 * terceira é a que diverge em silêncio** — é a mesma lição do botão de limpar filtros.
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA.** A regra *"tela sem caminho clicável é tela não entregue"*
 * nasceu de dois defeitos que a suíte inteira deixou passar porque os percursos chegavam com
 * `page.goto`: ele prova que a tela **funciona** e não prova que alguém **chega** nela.
 */
import { expect, type Page } from "@playwright/test";

import { entrar } from "./conta-de-teste";

export const LISTA_DE_TURMAS = '[data-slot="lista-de-turmas"]';
export const FILTRO = '[data-slot="filtro-avancado"]';

/** Entra e chega à lista **pelo menu** — nunca por endereço. */
export async function irAListaDeTurmas(page: Page, email: string): Promise<void> {
  await entrar(page, email, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Turmas", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  await expect(page.locator(LISTA_DE_TURMAS)).toBeVisible();
}

/**
 * Abre o painel de filtros — **só se ele estiver fechado**.
 *
 * ⚠️ `FiltroAvancado` é um `Collapsible` e pode vir aberto; um clique incondicional no gatilho o
 * **fechava**, e o campo sumia — o sintoma era `getByLabel` não achar nada, que se lê como "o filtro
 * não foi escrito".
 */
export async function abrirFiltros(page: Page): Promise<void> {
  const filtro = page.locator(FILTRO);
  if (!(await filtro.getByLabel("Buscar pelo código").isVisible())) {
    await filtro.getByRole("button", { name: "Filtros" }).click();
  }
}

/**
 * Escolhe uma opção num campo de escolha do filtro.
 *
 * ⚠️ **O CAMPO NÃO É UM `<select>` NATIVO, e medir isso custou um caso reprovado.** O
 * `FiltroAvancado` usa o `Select` do shadcn, que é um `<button role="combobox">` com a lista num
 * painel — `selectOption` responde *"Element is not a `<select>` element"*. O percurso é **clicar e
 * escolher**, que é também o que uma pessoa faz.
 *
 * ⚠️ **A LISTA É PROCURADA NA PÁGINA, E NÃO NO FILTRO:** o painel do Radix vai por `Portal`, fora da
 * árvore do campo.
 */
export async function escolherNoFiltro(
  page: Page,
  rotulo: string,
  parteDaOpcao: string,
): Promise<void> {
  await page.locator(FILTRO).getByLabel(rotulo).click();
  await page
    .getByRole("option", { name: new RegExp(parteDaOpcao, "i") })
    .first()
    .click();
}

/**
 * Do menu até a ficha de UMA turma, pela busca da lista.
 *
 * ⚠️ **A BUSCA É O CAMINHO HONESTO PARA UMA TURMA ESPECÍFICA**, e não um atalho de teste: é o que
 * alguém faz quando sabe o código e a lista tem dezenas de linhas. ⚠️ **E O FILTRO DE SITUAÇÃO VEM
 * VAZIO POR PADRÃO** (`D4`), o que importa aqui: turma **cancelada** também precisa ser alcançável,
 * e com um padrão `ativa` ela nunca apareceria na busca.
 */
export async function irAFichaDaTurma(page: Page, email: string, codigo: string): Promise<void> {
  await irAListaDeTurmas(page, email);
  await abrirFiltros(page);
  await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(codigo);
  await page.getByRole("link", { name: codigo }).first().click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(codigo)}`);
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
}

/**
 * Abre o formulário de edição da ficha, que desde 05/10/2026 nasce **recolhido**.
 *
 * ⚠️ **ELE EXISTE PORQUE QUATRO ARQUIVOS DE PONTA A PONTA AGIAM NOS CAMPOS SEM CLICAR EM NADA** —
 * `turmas`, `salas`, `andamento` e `telas-acessiveis` —, e o `Collapsible` do Radix **desmonta** o
 * conteúdo fechado: os campos deixam de **existir**, não só de estar visíveis. O sintoma no
 * Playwright é *"locator resolved to 0 elements"*, que se lê como "o campo foi apagado" e não como
 * "o painel está fechado".
 *
 * ⚠️ **E ELE É IDEMPOTENTE**: se o painel já estiver aberto, não clica — assim um caso pode
 * chamá-lo duas vezes sem fechar o que acabou de abrir.
 */
export async function abrirEdicaoDaTurma(page: Page): Promise<void> {
  const campo = page.locator("#turma-ano");
  if (await campo.isVisible()) return;
  await page.locator('[data-slot="abrir-edicao-da-turma"]').click();
  await expect(campo).toBeVisible();
}
