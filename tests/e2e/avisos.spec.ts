/**
 * Spec 022 (Bloco 7), FR-004 e SC-004 — **o sininho de avisos**, por clique.
 *
 * > *"SININHO DE AVISOS no cabeçalho, padrão em todo o sistema: número de avisos, pulso sutil em tons da mesma cor
 * > enquanto houver aviso não visto (respeita "reduzir movimento"), para ao abrir; volta só com aviso novo ("visto" no
 * > navegador, sem banco)."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O AVISO NOVO É SEMEADO AQUI**: um instrutor sem NIP é aviso certo (`instrutores:sem-nip:<código>`), sem depender
 *    das amostras dos outros arquivos. ⚠️ **CADA CASO NASCE COM O ARMAZENAMENTO VAZIO** (contexto novo do Playwright):
 *    nada foi visto ainda, e o sininho pulsa.
 * ⚠️ **"VOLTA COM AVISO NOVO" RECARREGA A PÁGINA**: o sininho pede o resumo no máximo a cada 2 minutos (D-9), e esperar
 *    dois minutos num caso de teste seria o prazo, não o comportamento. Recarregar é o que a pessoa faz.
 */
import { expect, test, type Page } from "@playwright/test";

import { abrirAvisosPeloSininho, avisoDaChave } from "./avisos";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  limparInstrutores,
  semearInstrutores,
  type AmostraDeInstrutores,
} from "./instrutores-de-teste";

let EMAIL = "";
let PROCESSO = 0;
let AMOSTRA: AmostraDeInstrutores;

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("avisos-sininho", PROCESSO);
  await criarConta(EMAIL, `USR-AVI-${PROCESSO}`);
  AMOSTRA = await semearInstrutores(PROCESSO, "V");
});

test.afterAll(async () => {
  await limparInstrutores(PROCESSO, "V");
  await limparInstrutores(PROCESSO, "W");
  await apagarConta(EMAIL);
});

const sininho = (page: Page) => page.locator('[data-slot="sininho-de-avisos"]');

test("o sininho mostra o número e pulsa com aviso não visto; abrir Avisos para o pulso; ele volta só com aviso novo", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await entrar(page, EMAIL, "/inicio");

  // Nada visto neste navegador: há aviso (o da amostra), e o sininho pulsa e diz isso no nome.
  await expect(sininho(page)).toHaveAttribute("data-novo", "sim", { timeout: 20_000 });
  await expect(sininho(page)).toHaveAttribute("aria-label", /^Avisos: \d+, com aviso novo$/);
  const total = Number(await sininho(page).getAttribute("data-total"));
  expect(total).toBeGreaterThan(0);
  await expect(sininho(page).locator('[data-slot="numero-de-avisos"]')).toHaveText(
    total > 99 ? "99+" : String(total),
  );

  // Abrir a página para o pulso — e o aviso da amostra está lá, no módulo Instrutores.
  await abrirAvisosPeloSininho(page);
  const codigo = Object.values(AMOSTRA.codigos)[0] as string;
  await expect(avisoDaChave(page, `instrutores:sem-nip:${codigo}`)).toHaveCount(1);
  await expect(sininho(page)).toHaveAttribute("data-novo", "nao");
  await expect(sininho(page)).toHaveAttribute("aria-label", /^Avisos: \d+$/);

  // Voltar ao Início pelo menu e recarregar: sem aviso novo, o pulso não volta.
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Início", exact: true })
    .click();
  await expect(page).toHaveURL(/\/inicio/);
  await page.reload();
  await expect(sininho(page)).toHaveAttribute("data-total", /\d+/, { timeout: 20_000 });
  await expect(sininho(page)).toHaveAttribute("data-novo", "nao");

  // Um aviso novo (outro instrutor sem NIP): o pulso volta.
  await semearInstrutores(PROCESSO, "W");
  await page.reload();
  await expect(sininho(page)).toHaveAttribute("data-novo", "sim", { timeout: 20_000 });
});

test("com «reduzir movimento», o sininho não pulsa — e o número e o nome continuam dizendo que há aviso novo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await entrar(page, EMAIL, "/inicio");
  await expect(sininho(page)).toHaveAttribute("data-novo", "sim", { timeout: 20_000 });
  await expect(sininho(page)).toHaveAttribute("aria-label", /com aviso novo$/);
  const animacao = await sininho(page)
    .locator("svg")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animacao).toBe("none");

  // Controle positivo: sem a preferência, o mesmo ícone anima.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      sininho(page)
        .locator("svg")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .not.toBe("none");
});
