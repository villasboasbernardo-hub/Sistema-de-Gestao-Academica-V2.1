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
import { abrirPainel, anoDoCodigoDaTurma, escolherAno } from "./paineis";

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
 * Abre o painel de filtros — **só se ele estiver fechado** (spec 025, RT-4: o ícone *Filtros* da barra).
 *
 * ⚠️ Um clique incondicional no gatilho **fechava** o painel aberto, e o campo sumia — o sintoma era `getByLabel` não
 * achar nada, que se lê como "o filtro não foi escrito".
 */
export async function abrirFiltros(page: Page): Promise<void> {
  await abrirPainel(page, "filtros");
  await expect(page.locator(FILTRO).getByLabel("Buscar pelo código")).toBeVisible();
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
/**
 * Clica no código da turma na lista — o link da primeira coluna — **com ele no meio da janela**.
 *
 * ⚠️ **O CLIQUE NA BORDA DE BAIXO CAÍA NO VAZIO** (medido em 19/10/2026): com a coluna *Arquivo* as linhas ficaram mais
 *    altas, e a linha da turma podia cair rente ao rodapé da janela — o link com 18 px de altura começando em *y* = 714
 *    numa janela de 720. O clique saía, sem erro, e não navegava. No CI, com outra métrica de fonte, foi a primeira
 *    tentativa de `turmas-lista.spec.ts:48` nas duas rodadas. Centralizar antes de clicar tira a borda da conta.
 */
export async function clicarNaTurmaDaLista(page: Page, codigo: string): Promise<void> {
  const link = page.getByRole("link", { name: codigo }).first();
  await link.evaluate((e) => e.scrollIntoView({ block: "center", inline: "nearest" }));
  await link.click();
}

export async function irAFichaDaTurma(page: Page, email: string, codigo: string): Promise<void> {
  await irAListaDeTurmas(page, email);
  /* Spec 025 (RT-6): a lista mostra só o ano escolhido — o da turma sai do código dela. */
  const ano = anoDoCodigoDaTurma(codigo);
  if (ano !== null) await escolherAno(page, ano);
  await abrirFiltros(page);
  await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(codigo);
  /*
   * ⚠️ **ESPERAR A LISTA DO RECORTE CHEGAR ANTES DE CLICAR** (medido em 19/10/2026): o clique saía logo depois de
   *    digitar, sobre a lista AINDA SEM a busca, e a lista filtrada chegava no meio dele — o link mudava de lugar e o
   *    clique caía no vazio, sem navegar e sem erro. Ficou visível quando a coluna *Arquivo* deixou as linhas mais
   *    altas e o link foi parar no rodapé da janela. *"neste recorte"* só aparece quando o servidor já respondeu com
   *    o filtro.
   */
  await expect.poll(() => new URL(page.url()).searchParams.get("busca")).toBe(codigo);
  await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText("neste recorte");
  await clicarNaTurmaDaLista(page, codigo);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(codigo)}`);
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
}

/**
 * Abre *Editar turma* — **a página própria** desde o Bloco 10 (spec 025, D-1; era o formulário recolhido no fim da
 * ficha), pelo ícone da barra de ações da ficha.
 *
 * ⚠️ **ELE É IDEMPOTENTE**: já na página de edição (depois de uma gravação recusada, por exemplo), não clica.
 */
export async function abrirEdicaoDaTurma(page: Page): Promise<void> {
  const campo = page.locator("#turma-ano");
  if (await campo.isVisible()) return;
  await page.locator('[data-slot="cabecalho-da-turma"] [data-slot="editar-turma"]').click();
  await expect(page).toHaveURL(/\/turmas\/[^/?#]+\/editar/);
  await expect(campo).toBeVisible({ timeout: 15_000 });
}

/**
 * Espera a confirmação da gravação da turma e **reabre** o formulário (spec 016, FR-015.2).
 *
 * ⚠️ **DESDE 17/10/2026 GRAVAR A EDIÇÃO VOLTA À FICHA COM `?gravada=turma`**, e a navegação pode
 * remontar a página com o formulário recolhido. Ler um campo logo depois do clique em gravar
 * correria contra essa navegação — o campo ainda está lá antes dela e some depois. Por isso a espera é
 * pela confirmação, que só existe depois da volta, e só então o formulário é reaberto.
 */
export async function esperarGravacaoDaTurma(page: Page): Promise<void> {
  await expect(page.locator('[data-slot="turma-gravada"]')).toBeVisible({ timeout: 15_000 });
  await abrirEdicaoDaTurma(page);
}

/** O selo de situação do cabeçalho da ficha. */
export const seloDaSituacao = (page: Page) =>
  page.locator('[data-slot="cabecalho-da-turma"] [data-slot="badge-status"]').first();

/**
 * Troca a situação **dentro de Editar turma** (spec 025, D-2; era o botão *"Trocar situação"* do cabeçalho, spec 016)
 * e espera a confirmação na ficha. `rotulo` é o da tela — *Planejada*, *Ativa*, *Concluída*, *Cancelada* —, e a
 * observação, quando vem, vai para o histórico (D-COR-4).
 */
export async function trocarSituacaoPelaFicha(
  page: Page,
  rotulo: string,
  observacao?: string,
): Promise<void> {
  await abrirEdicaoDaTurma(page);
  await page.locator("#turma-situacao").selectOption({ label: rotulo });
  if (observacao !== undefined) {
    await page.locator('[data-slot="observacao-da-situacao"]').fill(observacao);
  }
  await page.locator('[data-slot="gravar-turma"]').click();
  const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
  if (await dialogo.isVisible().catch(() => false)) {
    await dialogo.getByRole("button", { name: "Salvar" }).click();
  }
  await expect(page.locator('[data-slot="situacao-gravada"]')).toContainText(rotulo, {
    timeout: 15_000,
  });
}
