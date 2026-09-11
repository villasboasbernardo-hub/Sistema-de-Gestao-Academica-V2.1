/**
 * Integridade da vitrine (`FR-020`, `FR-021`, `SC-009`).
 *
 * ⚠️ A INVARIANTE I-5 EXISTE PARA IMPEDIR TOKEN NASCIDO MORTO — declarado no ponto único, nunca
 * exibido, nunca conferido por ninguém. Um token que não aparece aqui é um token que ninguém vai
 * notar quando quebrar.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { abrirVitrine } from "./abrir-vitrine";

import { PAPEIS_BASE, PARES, SERIES, STATUS } from "../../lib/design/vocabulario";

test.describe("US1 · a vitrine mostra o vocabulário inteiro", () => {
  test("todo papel, status e série aparece — invariante I-5", async ({ page }) => {
    await abrirVitrine(page);
    const texto = await page.locator("main").innerText();

    const ausentes = [
      ...PAPEIS_BASE.map((t) => `--${t}`),
      ...SERIES.map((t) => `--${t}`),
      ...STATUS.map((s) => `--${s}-fundo`),
    ].filter((t) => !texto.includes(t));

    expect(
      ausentes,
      `tokens declarados no ponto único e AUSENTES da vitrine — nasceriam mortos: ${ausentes.join(", ")}`,
    ).toEqual([]);
  });

  test("cada par auditado mostra a razão medida, nos dois temas (`FR-021`)", async ({ page }) => {
    await abrirVitrine(page);
    const texto = await page.locator("main").innerText();

    const semLinha = PARES.filter((p) => !texto.includes(p.id)).map((p) => p.id);
    expect(semLinha, "pares sem linha na tabela de contraste").toEqual([]);

    // ⚠️ O número na tela tem de ser o que o teste afere. As duas leituras vêm de
    // `lib/design/vocabulario.ts` — dois cálculos separados divergiriam em silêncio.
    expect(texto, "a tabela de contraste não traz razão nenhuma").toMatch(/\d+\.\d{2}/);
  });

  test("todo status traz rótulo textual junto da cor (`FR-014`)", async ({ page }) => {
    await abrirVitrine(page);
    const texto = await page.locator("main").innerText();
    const semRotulo = STATUS.filter((s) => !texto.includes(s));
    expect(
      semRotulo,
      `status comunicados só por cor: ${semRotulo.join(", ")}. Quem não distingue as cores ` +
        `precisa continuar lendo o sistema`,
    ).toEqual([]);
  });

  test("cada isenção do limite de 3:1 aparece COM o motivo", async ({ page }) => {
    // ⚠️ Isenção sem motivo visível é limite afrouxado em silêncio. A diferença entre as duas
    // está inteiramente no registro, e a vitrine é onde ele fica à vista.
    await abrirVitrine(page);
    const texto = await page.locator("main").innerText();
    expect(texto).toContain("B-1");
    expect(texto, "a vitrine lista isenções sem dizer por quê").toMatch(
      /decorativ|estrutural|reforça/i,
    );
  });
});

/**
 * ⚠️ A INVARIANTE I-5 ESTENDIDA DE TOKEN PARA COMPONENTE (`SC-001`, `FR-027`). O bloco de cima
 * exige que todo token do ponto único apareça na vitrine; este exige o mesmo de todo componente de
 * `components/ciaara/` e `components/graficos/`. Componente sem amostra é componente que ninguém
 * nota quando quebra — e o Épico 5 vai consumir treze deles.
 *
 * ⚠️ A LISTA NÃO É ESCRITA À MÃO: ela é EXTRAÍDA dos próprios arquivos, pelos marcadores `data-slot`
 * que cada componente declara. Uma lista copiada envelheceria no dia em que um componente novo
 * entrasse, e envelheceria em silêncio — que é o padrão que este projeto já viu acontecer com a
 * pendência §11.2 do documento 23 e com as sete anotações de contraste do §1.3.
 */
test.describe("US1 · a vitrine mostra o vocabulário de COMPONENTES inteiro", () => {
  /** Marcadores que só existem enquanto algo está aberto — com o motivo, que é obrigatório. */
  const SO_QUANDO_ABERTO = [
    {
      slot: "dialogo-confirmacao",
      motivo: "vive dentro do diálogo modal, que só é montado depois do clique no gatilho",
      abrir: "Desativar",
    },
  ];

  function slotsDeclarados(): string[] {
    const achados = new Set<string>();
    for (const dir of ["components/ciaara", "components/graficos"]) {
      const caminho = resolve(process.cwd(), dir);
      for (const arquivo of readdirSync(caminho).filter((f) => f.endsWith(".tsx"))) {
        const fonte = readFileSync(resolve(caminho, arquivo), "utf8");
        for (const achado of fonte.matchAll(/data-slot="([a-z-]+)"/g)) {
          if (achado[1]) achados.add(achado[1]);
        }
      }
    }
    return [...achados].sort();
  }

  test("todo marcador de componente aparece na vitrine — invariante I-5 estendida", async ({
    page,
  }) => {
    await abrirVitrine(page);
    const adiados = SO_QUANDO_ABERTO.map((s) => s.slot);
    const esperados = slotsDeclarados().filter((s) => !adiados.includes(s));

    expect(esperados.length, "a extração de marcadores não achou nada").toBeGreaterThan(12);

    const ausentes: string[] = [];
    for (const slot of esperados) {
      if ((await page.locator(`[data-slot="${slot}"]`).count()) === 0) ausentes.push(slot);
    }
    expect(
      ausentes,
      `componentes declarados e AUSENTES da vitrine — nasceriam mortos: ${ausentes.join(", ")}`,
    ).toEqual([]);
  });

  test("o que só existe aberto é aberto, e conferido", async ({ page }) => {
    // ⚠️ Isentar seria mais fácil e provaria menos: um diálogo que nunca é aberto num teste é um
    // diálogo cujo foco preso ninguém nunca exercitou.
    await abrirVitrine(page);
    for (const { slot, abrir } of SO_QUANDO_ABERTO) {
      await page.getByRole("button", { name: abrir }).click();
      await expect(page.locator(`[data-slot="${slot}"]`)).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("cada isenção traz motivo escrito", () => {
    for (const s of SO_QUANDO_ABERTO) {
      expect(s.motivo.length, `${s.slot} isento sem motivo`).toBeGreaterThan(40);
    }
  });
});
