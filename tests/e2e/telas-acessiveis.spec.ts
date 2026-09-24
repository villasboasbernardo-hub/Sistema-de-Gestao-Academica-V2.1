/**
 * As telas do PR 2 na árvore de acessibilidade e no teclado (`FR-041`, `FR-048`, `SC-006`).
 *
 * ⚠️ **ARQUIVO PRÓPRIO, E NÃO DENTRO DE `acessibilidade.spec.ts` / `teclado.spec.ts`** — a T205 pedia
 * ali, e o motivo do desvio é medível: os dois têm `beforeEach` **de arquivo** que abre a vitrine, que
 * é rota **sem sessão** (`FR-038`). As telas desta fatia exigem sessão e amostra; enfiá-las lá
 * obrigaria a desmontar o preparo de arquivo dos dois e a reabrir a vitrine em casos que não a usam.
 *
 * ⚠️ **AS TRÊS DO `FR-030` VALEM PARA TODA TELA, e a vitrine já as provava numa só.** O que este
 * arquivo acrescenta é a **cobertura por rota**: nome acessível em todo controle, um `main` e um `h1`,
 * e a ordem do documento acompanhando a ordem visual — em cada tela nova, e não na média delas.
 *
 * ⚠️ **O TECLADO SE PROVA PRESSIONANDO TECLA**, nunca lendo `tabindex`: um atributo correto com um
 * tratador que não dispara passa na leitura e falha na mão de quem usa.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";

let EMAIL = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("telas-acessiveis", p);
  await criarConta(EMAIL, `USR-ACE-${p}`);
  SEMEADO = await semearCursos(p, EMAIL);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL);
});

/** As rotas desta fatia, com o que cada uma precisa da amostra. */
function rotas(): { readonly nome: string; readonly caminho: string }[] {
  const sigla = encodeURIComponent(SEMEADO.porClassificacao.regular);
  const turma = encodeURIComponent(SEMEADO.turmaJanelaCedo);
  return [
    { nome: "catálogo", caminho: "/cursos" },
    { nome: "curso · aba Grade", caminho: `/cursos/${sigla}?aba=grade` },
    { nome: "curso · aba Sobre", caminho: `/cursos/${sigla}?aba=sobre` },
    { nome: "novo curso", caminho: "/cursos/novo" },
    { nome: "editar curso e regime", caminho: `/cursos/${sigla}/editar` },
    { nome: "nova turma", caminho: `/cursos/${sigla}/turmas/nova` },
    { nome: "ficha da turma", caminho: `/turmas/${turma}` },
    { nome: "salas", caminho: "/admin/salas" },
  ];
}

/** Os controles sem nome acessível, pela árvore do navegador. */
async function semNomeAcessivel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const semNome: string[] = [];
    const controles = document.querySelectorAll<HTMLElement>(
      "main button, main a[href], main input, main select, main textarea, main [role='combobox']",
    );
    for (const c of controles) {
      if (c.hasAttribute("aria-hidden") || c.tabIndex === -1) continue;
      const rotulado = c.getAttribute("aria-labelledby");
      const porFora = rotulado
        ? rotulado
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
        : "";
      const associado = c.id
        ? (document.querySelector(`label[for="${CSS.escape(c.id)}"]`)?.textContent ?? "")
        : "";
      const nome = [
        c.getAttribute("aria-label"),
        porFora,
        associado,
        c.textContent,
        c.getAttribute("title"),
        (c as HTMLInputElement).placeholder,
      ]
        .map((t) => (t ?? "").trim())
        .find((t) => t.length > 0);
      if (!nome) semNome.push(`${c.tagName.toLowerCase()}#${c.id || "(sem id)"}`);
    }
    return semNome;
  });
}

test.describe("`FR-030` (a) · nome acessível em todo controle, tela por tela", () => {
  test("nenhuma tela do PR 2 tem controle sem nome", async ({ page }) => {
    await entrar(page, EMAIL, "/cursos");

    for (const { nome, caminho } of rotas()) {
      await page.goto(caminho);
      await expect(page.locator("main h1").first(), `${nome} não desenhou`).toBeVisible();

      const semNome = await semNomeAcessivel(page);
      expect(
        semNome,
        `${nome} (${caminho}) tem controle sem nome acessível: ${semNome.join(", ")}. ` +
          `Um controle que só tem ícone não existe para quem usa leitor de tela.`,
      ).toEqual([]);
    }
  });

  test("controle positivo: a varredura enxerga controles de verdade", async ({ page }) => {
    await entrar(page, EMAIL, "/cursos");
    const quantos = await page.evaluate(
      () => document.querySelectorAll("main button, main a[href], main select").length,
    );
    expect(quantos, "a varredura está olhando o lugar errado").toBeGreaterThan(3);
  });
});

test.describe("`FR-030` (c) · um `main`, um `h1`, e a ordem do documento", () => {
  test("cada tela tem um marco só, e os títulos saem na ordem em que aparecem", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/cursos");

    for (const { nome, caminho } of rotas()) {
      await page.goto(caminho);
      await expect(page.locator("main"), `${nome} tem mais de um \`main\``).toHaveCount(1);
      await expect(page.locator("main h1"), `${nome} não tem exatamente um \`h1\``).toHaveCount(1);

      const posicoes = await page
        .locator("main h2")
        .evaluateAll((nos) => nos.map((n) => n.getBoundingClientRect().top + window.scrollY));
      expect(posicoes, `${nome}: a ordem do documento não acompanha a ordem visual`).toEqual(
        [...posicoes].sort((a, b) => a - b),
      );
    }
  });
});

test.describe("`SC-006` · o formulário se atravessa só com o teclado", () => {
  test("⚠️ `Tab` alcança todos os campos da turma, na ordem, e chega ao botão de gravar", async ({
    page,
  }) => {
    /*
     * ⚠️ PRESSIONANDO TECLA, e lendo o foco DEPOIS. O contrato de teclado do Épico 4 (b) foi escrito
     *    contra a leitura de atributo justamente porque ela aprova um `tabindex` correto cujo
     *    tratador não dispara.
     */
    await entrar(
      page,
      EMAIL,
      `/cursos/${encodeURIComponent(SEMEADO.porClassificacao.regular)}/turmas/nova`,
    );
    await expect(page.locator('[data-slot="formulario-de-turma"]')).toBeVisible();

    const esperados = [
      "turma-ano",
      "turma-situacao",
      "turma-modalidade",
      "turma-rotulo",
      "turma-inicio",
      "turma-termino",
      "turma-sala",
      "turma-alunos",
    ];

    await page.locator("#turma-ano").focus();
    await expect(page.locator("#turma-ano")).toBeFocused();

    /*
     * ⚠️ **UM `<input type="date">` CONSOME MAIS DE UM `Tab`, e isso é do NAVEGADOR.** O Chromium
     *    desenha dia, mês e ano como subcampos, e cada um é uma parada interna. Exigir um `Tab` por
     *    campo reprovava numa ordem de tabulação CORRETA — o teste mediria o navegador, não a tela.
     *    O que o `SC-006` promete é a **sequência**: nenhum controle aparece fora de ordem, e
     *    nenhum campo fica inalcançável.
     */
    const foco = () =>
      page.evaluate(() => document.activeElement?.getAttribute("id") ?? "(sem id)");

    let anterior = "turma-ano";
    for (const id of esperados.slice(1)) {
      let chegou = false;
      for (let passo = 0; passo < 4 && !chegou; passo++) {
        await page.keyboard.press("Tab");
        const atual = await foco();
        if (atual === id) chegou = true;
        /*
         * ⚠️ **CONTINUAR NO CAMPO ANTERIOR NÃO É ORDEM TROCADA** — é o `Tab` andando entre dia, mês e
         *    ano do mesmo `<input type="date">`. O que seria defeito é o foco **pular** para outro
         *    campo da lista, e é só isso que esta guarda acusa.
         */
        else if (atual !== anterior && esperados.includes(atual)) {
          throw new Error(`a ordem saiu trocada: esperava ${id} e o foco foi para ${atual}`);
        }
      }
      expect(chegou, `\`Tab\` não alcançou ${id} em quatro passos`).toBe(true);
      anterior = id;
    }

    // ⚠️ E o botão de gravar é alcançável a partir do último campo — sem parada morta no fim.
    for (let passo = 0; passo < 4; passo++) {
      await page.keyboard.press("Tab");
      const gravar = page.locator('[data-slot="gravar-turma"]');
      if (await gravar.evaluate((b) => b === document.activeElement)) return;
    }
    throw new Error("o botão de gravar não é alcançável por `Tab` a partir do último campo");
  });
});
