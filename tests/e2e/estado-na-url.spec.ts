/**
 * Os quatro comportamentos do `RF-NAV-04`, medidos (`FR-002`, `FR-004`, `FR-023`, `FR-024`,
 * `FR-026`, `SC-001`, `SC-004`, `SC-014`).
 *
 * ⚠️ SÃO OS QUATRO QUE A v2.0 NÃO CONSEGUIA ENTREGAR. Sob `HtmlService` a URL era fixa e o estado
 * vivia num objeto global: não havia link para compartilhar, o botão voltar saía do sistema e
 * recarregar começava do zero. Cada caso aqui é um deles.
 *
 * ⚠️ ELES SÃO MEDIDOS NA VITRINE, e não na tela inicial, porque a tela inicial ainda não existe —
 * ela é a História 4 desta mesma fatia. O que a vitrine **não** consegue provar está declarado no
 * fim deste arquivo, em vez de passar por provado.
 *
 * ⚠️ E A VITRINE NÃO É UM SUBSTITUTO FRACO PARA ESTA PARTE: ela é o único lugar do sistema onde os
 * quatro tipos de parâmetro convivem — escolha que empilha, escolha que substitui, lista e texto com
 * limite de frequência. As telas de verdade usam um ou dois tipos cada.
 */
import { expect, test, type Page } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

/** O recorte que a amostra ligada à URL está mostrando, lido do atributo que ela publica. */
async function recorteNaTela(page: Page): Promise<Record<string, string[]>> {
  const bruto = await page
    .locator('[data-slot="amostra-filtro-na-url"] code')
    .getAttribute("data-estado");
  return JSON.parse(bruto ?? "{}") as Record<string, string[]>;
}

const parametro = (page: Page, nome: string) => new URL(page.url()).searchParams.get(nome);

const tamanhoDoHistorico = (page: Page) => page.evaluate(() => window.history.length);

test.describe("`FR-023` · link direto abre o recorte exato, sem passar por outra tela", () => {
  test("os quatro tipos de parâmetro chegam prontos da barra de endereço", async ({ page }) => {
    const navegacoes: string[] = [];
    page.on("framenavigated", (quadro) => {
      if (quadro === page.mainFrame()) navegacoes.push(quadro.url());
    });

    await abrirVitrine(page, "?demo=charlie&categoria=a&etiquetas=x,z&busca=hidrografia");

    expect(await recorteNaTela(page)).toEqual({
      categoria: ["a"],
      etiquetas: ["x", "z"],
      busca: ["hidrografia"],
    });

    /*
     * ⚠️ "SEM PASSAR PELA TELA INICIAL" SE PROVA OLHANDO A JANELA INTEIRA, e não o endereço final.
     * É a lição que a correção do destino de retorno deixou: uma asserção que amostra um instante dá
     * a ausência por provada quando só chegou cedo. Aqui a lista de navegações é conferida depois.
     */
    const forasteiras = navegacoes.filter(
      (u) => u !== "about:blank" && new URL(u).pathname !== "/estilo",
    );
    expect(forasteiras, `passou por outra tela: ${forasteiras.join(", ")}`).toEqual([]);
  });

  test("valor podre no link não impede o recorte bom ao lado (`FR-006`)", async ({ page }) => {
    await abrirVitrine(page, "?categoria=inventada&etiquetas=x");
    const recorte = await recorteNaTela(page);
    expect(recorte.categoria).toEqual([]);
    expect(recorte.etiquetas).toEqual(["x"]);
  });
});

test.describe("`FR-002` · o parâmetro no valor padrão some da URL", () => {
  test("aparece ao escolher e some ao voltar ao padrão", async ({ page }) => {
    await abrirVitrine(page);
    expect(parametro(page, "demo")).toBeNull();

    await page.getByRole("button", { name: "bravo" }).click();
    await expect.poll(() => parametro(page, "demo")).toBe("bravo");

    // O mesmo botão de novo devolve ao padrão — e o padrão não se escreve na URL.
    await page.getByRole("button", { name: "bravo" }).click();
    await expect
      .poll(() => parametro(page, "demo"), {
        message: "o padrão ficou pendurado na URL, e o link compartilhado carregaria ruído",
      })
      .toBeNull();
  });

  test("⚠️ e some TAMBÉM quando o valor volta ao padrão, não só quando é apagado", async ({
    page,
  }) => {
    /*
     * ⚠️ ESTE CASO EXISTE PORQUE O DE CIMA NÃO BASTAVA, e isso foi medido. Com `clearOnDefault`
     * desligado de propósito em 11/09/2026, o percurso acima **passou**: ele limpa mandando `null`,
     * e `null` apaga o parâmetro sem consultar o padrão. A opção que o requisito cobra nunca era
     * exercitada — o teste aprovava a implementação certa e a errada.
     *
     * Aqui o campo devolve o próprio texto vazio, que **é** o valor padrão. Só sai da URL se a opção
     * estiver ligada.
     */
    await abrirVitrine(page);
    const campo = page.getByLabel("Texto livre");

    await campo.fill("sondagem");
    await expect.poll(() => parametro(page, "busca"), { timeout: 5_000 }).toBe("sondagem");

    await campo.fill("");
    await expect
      .poll(() => parametro(page, "busca"), {
        timeout: 5_000,
        message: "`?busca=` ficou pendurado na URL depois de o campo voltar ao padrão",
      })
      .toBeNull();
  });
});

test.describe("`FR-024` · o histórico desfaz um passo por vez", () => {
  test("três trocas de contexto, três passos de volta", async ({ page }) => {
    await abrirVitrine(page);

    for (const opcao of ["alfa", "bravo", "charlie"]) {
      await page.getByRole("button", { name: opcao }).click();
      await expect.poll(() => parametro(page, "demo")).toBe(opcao);
    }

    await page.goBack();
    await expect.poll(() => parametro(page, "demo")).toBe("bravo");
    await page.goBack();
    await expect.poll(() => parametro(page, "demo")).toBe("alfa");
    await page.goBack();
    await expect.poll(() => parametro(page, "demo")).toBeNull();
  });

  test("⚠️ REFINAR NÃO EMPILHA — três cliques de filtro não são três passos", async ({ page }) => {
    /*
     * É a outra metade do `FR-004`, e a que se erra por excesso: um filtro que empilha obriga a
     * pessoa a apertar voltar seis vezes para sair de uma tela em que mexeu em três campos.
     */
    await abrirVitrine(page);
    const antes = await tamanhoDoHistorico(page);

    await page.getByRole("combobox", { name: "Categoria" }).click();
    await page.getByRole("option", { name: /Categoria A/ }).click();
    await expect.poll(() => parametro(page, "categoria")).toBe("a");

    await page.getByRole("combobox", { name: "Categoria" }).click();
    await page.getByRole("option", { name: /Categoria B/ }).click();
    await expect.poll(() => parametro(page, "categoria")).toBe("b");

    expect((await tamanhoDoHistorico(page)) - antes, "o refino empilhou entrada de histórico").toBe(
      0,
    );
  });
});

test.describe("`FR-026` · recarregar preserva todo o recorte", () => {
  test("o recorte volta inteiro depois do recarregamento", async ({ page }) => {
    await abrirVitrine(page, "?demo=alfa&categoria=b&etiquetas=y,z&busca=cartografia");
    const antes = await recorteNaTela(page);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Vocabulário visual", level: 1 })).toBeVisible({
      timeout: 15_000,
    });

    expect(await recorteNaTela(page)).toEqual(antes);
    expect(parametro(page, "demo")).toBe("alfa");
  });
});

test.describe("`SC-014` · oito teclas produzem UMA entrada de histórico, não oito", () => {
  test("digitar uma palavra de oito letras não enche o histórico", async ({ page }) => {
    await abrirVitrine(page);
    const antes = await tamanhoDoHistorico(page);

    const campo = page.getByLabel("Texto livre");
    await campo.click();
    for (const letra of "batimetr") await campo.press(letra);

    await expect.poll(() => parametro(page, "busca"), { timeout: 5_000 }).toBe("batimetr");

    const passos = (await tamanhoDoHistorico(page)) - antes;
    expect(
      passos,
      `digitar oito letras produziu ${passos} passos de histórico. A busca precisa das DUAS ` +
        `políticas: substituir a entrada e limitar a frequência da escrita.`,
    ).toBeLessThanOrEqual(1);
  });
});

/**
 * ⚠️ O QUE ESTA SUÍTE NÃO PROVA, e **onde cada coisa é provada** — declarado em vez de omitido.
 *
 * | Não provado aqui | Por quê | Provado em |
 * |---|---|---|
 * | o número na tela muda ao trocar o filtro (`FR-004.1`) | a vitrine não consulta servidor nenhum | `inicio.spec.ts` ✅ |
 * | sinal visível antes de o dado chegar (`FR-045`, `SC-023`) | não há espera para sinalizar | `inicio.spec.ts` ✅ |
 * | link compartilhado entre dois perfis (`FR-025`) | quem nega é o banco, e a vitrine não lê banco | `inicio.spec.ts` ✅ |
 * | retorno após a autenticação com parâmetros (`FR-027`, `SC-005`) | a vitrine não pede sessão | `destino-do-login.spec.ts` ✅ |
 *
 * ⚠️ **OS TRÊS PRIMEIROS SÃO OS QUE MEDEM O ERRO SILENCIOSO**, e é por isso que esta tabela existe em
 * vez de a lacuna ficar implícita. Uma suíte que parasse aqui aprovaria uma tela com a URL impecável
 * e a consulta velha — o defeito que o `FR-004.1` existe para pegar. **A divisão é de meio, não de
 * rigor:** aqui se mede a mecânica da URL, lá se mede o efeito dela sobre o dado.
 */

test.describe("`FR-012` · a tabela densa entrega o recorte a quem chama", () => {
  const TABELA_NA_URL =
    'section:has([data-slot="amostra-tabela-na-url"]) [data-slot="tabela-densa"]';

  test("ordenar por uma coluna escreve na barra de endereço", async ({ page }) => {
    /*
     * ⚠️ É A METADE QUE O TESTE DE UNIDADE NÃO ALCANÇA. Lá se prova a LEITURA: dada uma ordenação,
     * a tabela desenha naquela ordem. Aqui se prova a ESCRITA — que o clique sai do componente em
     * vez de ficar guardado dentro dele, que era exatamente o achado `CHK012`.
     */
    await abrirVitrine(page);

    await page.locator(`${TABELA_NA_URL} th`, { hasText: "Curso" }).first().click();
    await expect.poll(() => parametro(page, "ordenar_por")).toBe("sigla");

    // Segundo clique inverte o sentido; o terceiro volta à ordem original e limpa os DOIS.
    await page.locator(`${TABELA_NA_URL} th`, { hasText: "Curso" }).first().click();
    await expect.poll(() => parametro(page, "sentido")).toBe("decrescente");

    await page.locator(`${TABELA_NA_URL} th`, { hasText: "Curso" }).first().click();
    await expect.poll(() => parametro(page, "ordenar_por")).toBeNull();
    expect(parametro(page, "sentido"), "o sentido ficou pendurado sem coluna").toBeNull();
  });

  test("link direto com ordenação abre a tabela já ordenada", async ({ page }) => {
    await abrirVitrine(page, "?ordenar_por=horas&sentido=decrescente");
    await expect(page.locator(`${TABELA_NA_URL} th[aria-sort="descending"]`)).toHaveCount(1);
  });

  test("⚠️ a tabela NÃO controlada ao lado continua sem escrever na URL", async ({ page }) => {
    // É a prova de que a propriedade é opcional de verdade: a amostra da fatia (b) segue guardando
    // a ordenação por dentro, e nenhuma chamada existente precisou mudar.
    await abrirVitrine(page);
    const naMemoria =
      'section:has(:text("45 linhas, todas renderizadas")) [data-slot="tabela-densa"]';

    await page.locator(`${naMemoria} th`, { hasText: "Curso" }).first().click();
    await expect(page.locator(`${naMemoria} th[aria-sort="ascending"]`)).toHaveCount(1);
    expect(parametro(page, "ordenar_por"), "a tabela não controlada escreveu na URL").toBeNull();
  });
});
