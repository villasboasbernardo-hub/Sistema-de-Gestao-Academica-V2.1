/**
 * A barra de endereço tratada como **entrada não confiável** (`FR-041` a `FR-043`, `SC-017`).
 *
 * Contrato: `specs/008-shell-e-estado-na-url/contracts/seguranca-da-url.md`
 *
 * ⚠️ **OS TRÊS VETORES DO CONTRATO, E SÓ ELES.** Um percurso que atire cargas ao acaso mede o gerador
 * de cargas, não o sistema. Cada caso aqui corresponde a uma linha da tabela do contrato:
 *
 * | # | O que se mede | Carga |
 * |---|---|---|
 * | 1 | a navegação **sai do domínio**? | destino relativo ao protocolo, com contrabarra, absoluto |
 * | 2 | o valor chega a um **filtro de consulta**? | aspas, ponto e vírgula, operadores da API de dados |
 * | 3 | o valor chega a uma **interpolação de marcação**? | atributo de evento, esquema de script |
 *
 * ⚠️ **O VETOR 1 JÁ TEM SUÍTE PRÓPRIA** (`destino-do-login.spec.ts`), porque ele corrige um defeito
 * que estava na `main` e saiu em correção separada. Aqui ele é conferido de novo **pelo outro lado**:
 * não pela função de guarda, e sim por nenhuma tela desta fatia oferecer caminho de saída.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let EMAIL = "";

/** A origem da aplicação sob teste. É contra ela que a permanência é medida. */
const ORIGEM = process.env.URL_BASE_E2E ?? "http://localhost:3000";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("url-hostil", info.workerIndex);
  await criarConta(EMAIL, `USR-HOSTIL-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

/** Toda navegação do quadro principal, registrada para conferência posterior. */
function registrarNavegacoes(page: Page): string[] {
  const vistas: string[] = [];
  page.on("framenavigated", (quadro) => {
    if (quadro === page.mainFrame()) vistas.push(quadro.url());
  });
  return vistas;
}

test.describe("vetor 1 · a navegação não sai do domínio", () => {
  const HOSTIS = [
    { nome: "relativo ao protocolo", valor: "//ciaara-falso.exemplo/" },
    { nome: "com contrabarra", valor: "/\\ciaara-falso.exemplo/" },
    { nome: "absoluto", valor: "https://ciaara-falso.exemplo/x" },
  ];

  for (const { nome, valor } of HOSTIS) {
    test(`recorte com destino ${nome} não tira o navegador da aplicação`, async ({ page }) => {
      /*
       * ⚠️ **PROVAR QUE ALGO NUNCA ACONTECE EXIGE OBSERVAR UMA JANELA, e não amostrar um instante.**
       * Foi a lição que a correção do destino de retorno deixou: duas formulações passaram com o
       * defeito no lugar porque liam o endereço final, e o endereço final de uma saída que falha é
       * um erro de navegador — sem o nome hostil nele.
       */
      const vistas = registrarNavegacoes(page);
      await entrar(page, EMAIL, `/inicio?classificacao=${encodeURIComponent(valor)}`);
      await page.waitForTimeout(1_500);

      const forasteiras = vistas.filter(
        (u) => u !== "about:blank" && new URL(u).origin !== new URL(ORIGEM).origin,
      );
      expect(forasteiras, `o navegador saiu da aplicação: ${forasteiras.join(", ")}`).toEqual([]);
    });
  }
});

test.describe("vetor 2 · o valor não chega a filtro de consulta", () => {
  const CARGAS = [
    "'; drop table cursos; --",
    "regular,expedito",
    "regular*",
    "(or(classificacao.eq.regular))",
    "regular&modalidade=ead",
  ];

  for (const carga of CARGAS) {
    test(`carga de consulta recusada: ${carga.slice(0, 24)}`, async ({ page }) => {
      /*
       * ⚠️ **O QUE SE MEDE É QUE O VALOR NEM CHEGA A SER ACEITO**, e não que a consulta "escapou"
       * bem. A validação acontece na leitura, antes de o valor virar predicado: o filtro volta para
       * "Todas", que é o padrão, e o que vai ao banco é uma consulta sem recorte.
       *
       * ⚠️ E o cliente de dados usado neste projeto **parametriza**; a concatenação de cadeia não
       * existe aqui. Isto é defesa em profundidade, não a única.
       */
      await entrar(page, EMAIL, `/inicio?classificacao=${encodeURIComponent(carga)}`);
      await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();
      await expect(page.locator("#filtro-classificacao")).toHaveValue("");
    });
  }
});

test.describe("vetor 3 · o valor não chega a interpolação de marcação", () => {
  const CARGAS = [
    '<img src=x onerror="window.__invadido=1">',
    "<script>window.__invadido=1</script>",
    "javascript:window.__invadido=1",
    '"><svg onload="window.__invadido=1">',
  ];

  for (const carga of CARGAS) {
    test(`carga de marcação não executa: ${carga.slice(0, 24)}`, async ({ page }) => {
      /*
       * ⚠️ **O RISCO PRINCIPAL NÃO É MARCAÇÃO REFLETIDA** — a camada de renderização já escapa texto,
       * e um teste que só provasse isso estaria provando a biblioteca, não o sistema. O que este caso
       * garante é que a carga **nem vira valor aceito**, e que nada dela executa na página.
       */
      await entrar(page, EMAIL, `/inicio?classificacao=${encodeURIComponent(carga)}`);
      await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();

      const invadido = await page.evaluate(
        () => (window as unknown as { __invadido?: number }).__invadido,
      );
      expect(invadido, "a carga da URL executou na página").toBeUndefined();
      await expect(page.locator("#filtro-classificacao")).toHaveValue("");
    });
  }

  test("⚠️ controle positivo: a página REALMENTE executaria, se deixassem", async ({ page }) => {
    /*
     * Sem este caso, os quatro acima passariam num navegador com script desligado — e a suíte
     * pareceria cumprida por ausência, que é a forma mais comum de um portão não valer nada.
     */
    await entrar(page, EMAIL, "/inicio");
    await page.evaluate(() => {
      (window as unknown as { __invadido?: number }).__invadido = 1;
    });
    const invadido = await page.evaluate(
      () => (window as unknown as { __invadido?: number }).__invadido,
    );
    expect(invadido, "o script da página não roda: os casos acima não provam nada").toBe(1);
  });
});
