/**
 * URL errada **não quebra a tela** (`FR-006`, `FR-007`, `FR-008`, `FR-041`, `SC-008`).
 *
 * ⚠️ **AQUI SE DEGRADA, NÃO SE RECUSA, E A DISTINÇÃO É ENTRE ACIDENTE E INTENÇÃO.** Link velho,
 * truncado ou editado à mão é acidente: recusá-lo transformaria um favorito antigo numa tela de
 * erro. Quem recusa é só o destino de retorno, e ele tem suíte própria.
 *
 * ⚠️ **A MEDIÇÃO É SOBRE A TELA, E NÃO SOBRE A FUNÇÃO.** Os casos de unidade já provam que
 * `lerParametros` devolve o padrão; o que estes provam é que **a página abre**, com o cabeçalho, o
 * menu e o conteúdo no lugar. Uma degradação que funcione na função e estoure na renderização não
 * teria sido pega por nenhum teste de unidade.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "./panorama-de-teste";

let EMAIL = "";
let SEMEADO: PanoramaSemeado | undefined;

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("url-degradada", info.workerIndex);
  SEMEADO = await semearPanorama(info.workerIndex);
  await criarConta(EMAIL, `USR-DEGRAD-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
  await limparPanorama(SEMEADO);
});

/** Abre a tela inicial com a consulta dada, já autenticado. */
async function abrirInicioCom(page: Page, consulta: string) {
  await entrar(page, EMAIL, `/inicio${consulta}`);
}

/** A tela abriu de verdade: título, casca e conteúdo. */
async function aTelaAbriu(page: Page) {
  await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
}

test.describe("`FR-006` · valor fora do domínio usa o padrão e preserva os demais", () => {
  test("classificação impossível não apaga a modalidade ao lado", async ({ page }) => {
    await abrirInicioCom(page, "?classificacao=inexistente&modalidade=ead");
    await aTelaAbriu(page);

    // O inválido caiu para "Todas"; o válido ao lado sobreviveu.
    await expect(page.locator("#filtro-classificacao")).toHaveValue("");
    await expect(page.locator("#filtro-modalidade")).toHaveValue("ead");
  });

  test("⚠️ e o recorte bom continua VALENDO, não só aparecendo", async ({ page }) => {
    // Um filtro que mostra "ead" no controle e lista tudo é pior que um que não filtra: ele afirma
    // um recorte que não aconteceu.
    await abrirInicioCom(page, "?classificacao=inexistente&modalidade=ead");
    await expect(page.locator(`[data-turma="${SEMEADO?.turmaEmDia}"]`)).toBeVisible();
    await expect(page.locator(`[data-turma="${SEMEADO?.turmaAtrasada}"]`)).toHaveCount(0);
  });
});

test.describe("`FR-007` · parâmetro fora do contrato é ignorado, e a tela não quebra", () => {
  test("um parâmetro que ninguém declarou não impede nada", async ({ page }) => {
    await abrirInicioCom(page, "?parametro_inventado=1&modalidade=presencial");
    await aTelaAbriu(page);
    await expect(page.locator("#filtro-modalidade")).toHaveValue("presencial");
  });
});

test.describe("par incompleto — o que falta usa o padrão", () => {
  test("só metade do recorte continua sendo um recorte", async ({ page }) => {
    /*
     * ⚠️ É O CASO DO LINK TRUNCADO POR UM MENSAGEIRO, e ele é comum o bastante para ter requisito.
     * A tela precisa abrir com o que sobrou, e não exigir o par completo — exigir seria recusar.
     */
    await abrirInicioCom(page, "?classificacao=expedito");
    await aTelaAbriu(page);
    await expect(page.locator("#filtro-classificacao")).toHaveValue("expedito");
    await expect(page.locator("#filtro-modalidade")).toHaveValue("");
  });
});

test.describe("`SC-008` · tudo inválido de uma vez, e a tela ainda abre", () => {
  test("quatro parâmetros podres não produzem tela em branco", async ({ page }) => {
    await abrirInicioCom(
      page,
      "?classificacao=%3Cscript%3E&modalidade=%00&lixo=1&outro=2&pagina=-9999",
    );
    await aTelaAbriu(page);
    await expect(page.locator("#filtro-classificacao")).toHaveValue("");
    await expect(page.locator("#filtro-modalidade")).toHaveValue("");
  });

  test("⚠️ e o conteúdo continua sendo o de sempre, não um vazio de erro", async ({ page }) => {
    // Degradar para "nada" seria tecnicamente seguro e praticamente inútil: a pessoa concluiria que
    // o sistema perdeu os dados. O padrão é "todas", e é isso que precisa aparecer.
    await abrirInicioCom(page, "?classificacao=%3Cscript%3E&modalidade=%00");
    await expect(page.locator(`[data-turma="${SEMEADO?.turmaAtrasada}"]`)).toBeVisible();
    await expect(page.locator(`[data-turma="${SEMEADO?.turmaEmDia}"]`)).toBeVisible();
  });
});

test.describe("`FR-008` · o vazio distingue *não há* de *você não vê*", () => {
  test("recorte legítimo sem resultado diz que NÃO HÁ, e como voltar", async ({ page }) => {
    /*
     * ⚠️ É O GOTCHA Nº 4 DO BRIEF, e ele produz o defeito que ninguém reporta: a tela abre vazia,
     * sem erro, e quem olha conclui *"não tem nada cadastrado"*. Aqui há turmas — só não com esta
     * combinação — e a tela precisa dizer exatamente isso.
     */
    await abrirInicioCom(page, "?classificacao=regular&modalidade=ead");
    await aTelaAbriu(page);
    await expect(page.getByText(/nenhuma turma neste recorte/i)).toBeVisible();
    await expect(page.getByText(/há turmas cadastradas/i)).toBeVisible();
  });

  test("⚠️ e ele NÃO diz que a base está vazia", async ({ page }) => {
    // O terceiro estado — "ainda não existe no sistema" — é para a base sem carga, e é o único dos
    // três que some sozinho com o tempo. Usá-lo aqui seria afirmar algo falso sobre a CIAARA-11.
    await abrirInicioCom(page, "?classificacao=regular&modalidade=ead");
    await expect(page.getByText(/ainda não existe no sistema/i)).toHaveCount(0);
  });
});
