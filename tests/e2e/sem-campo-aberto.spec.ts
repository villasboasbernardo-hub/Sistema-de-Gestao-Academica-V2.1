/**
 * Spec 022 (Bloco 7), FR-002.1 e SC-001 — **nenhuma página de leitura tem campo de formulário aberto**.
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime) ou página própria (formulário
 * > longo: disciplina, curso) — nunca campos abertos na página. Modelo: a ficha do instrutor."*
 * > — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O QUE CONTA COMO CAMPO ABERTO**: `input` (menos `hidden` e o de arquivo escondido), `textarea` e `select`
 *    VISÍVEIS no conteúdo da página, fora de diálogo. **Filtro e navegação não são formulário**: o filtro avançado, o
 *    ano do painel, a navegação da semana do DSA e a busca da lista ficam na lista do que é permitido — e a lista é
 *    curta e nomeada, para que um campo novo de edição não passe por ela.
 * ⚠️ **PÁGINA DE EDIÇÃO NÃO ENTRA**: *Editar curso*, a página própria da disciplina, o cadastro de turma, de curso, de
 *    instrutor e de usuário são formulários longos em página própria (D-1); a ficha do instrutor e a da turma abrem o
 *    formulário só depois de *Editar*.
 * ⚠️ **AS PÁGINAS SÃO VISITADAS PELO ENDEREÇO** — é uma guarda de propriedade das telas, como a de acessibilidade; o
 *    caminho por clique de cada uma é provado nos casos dela.
 * ⚠️ **COM CONTROLE POSITIVO**: o detector acha o campo de uma página de edição (*Editar curso*); varredura que não acha
 *    nada passaria igual se estivesse cega.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { semearCursos, type CursosSemeados } from "./cursos-de-teste";

let EMAIL = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("sem-campo-aberto", p);
  await criarConta(EMAIL, `USR-SCA-${p}`);
  SEMEADO = await semearCursos(p, EMAIL);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

/** Os contêineres de filtro e de navegação — os únicos com campo permitido numa página de leitura. */
const PERMITIDOS = [
  '[data-slot="filtro-avancado"]',
  '[data-slot="ano-do-painel"]',
  '[data-slot="navegacao-da-semana"]',
  '[data-slot="busca-de-usuarios"]',
];

/** Os campos abertos da página, com um retrato curto de cada um para a mensagem. */
async function camposAbertos(page: Page): Promise<string[]> {
  return page.evaluate((permitidos) => {
    const principal = document.querySelector("main") ?? document.body;
    const campos = principal.querySelectorAll<HTMLElement>("input, textarea, select");
    return [...campos]
      .filter((c) => {
        if (c instanceof HTMLInputElement && (c.type === "hidden" || c.type === "file"))
          return false;
        if (c.closest('[role="dialog"], [role="alertdialog"]')) return false;
        if (permitidos.some((p) => c.closest(p))) return false;
        const caixa = c.getBoundingClientRect();
        const estilo = getComputedStyle(c);
        return caixa.width > 0 && caixa.height > 0 && estilo.visibility !== "hidden";
      })
      .map((c) => {
        const dono = c.closest("[data-slot]")?.getAttribute("data-slot") ?? "?";
        const nome =
          c.getAttribute("name") ?? c.getAttribute("id") ?? c.getAttribute("aria-label") ?? "";
        return `${c.tagName.toLowerCase()}[${nome}] em [data-slot=${dono}]`;
      });
  }, PERMITIDOS);
}

async function conferir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await camposAbertos(page), `campo aberto na página de leitura ${caminho}`).toEqual([]);
}

test("controle positivo: o detector acha os campos de uma página de edição", async ({ page }) => {
  await entrar(
    page,
    EMAIL,
    `/cursos/${encodeURIComponent(SEMEADO.porClassificacao.regular)}/editar`,
  );
  await expect(page.locator('[data-slot="formulario-de-curso"]')).toBeVisible();
  expect((await camposAbertos(page)).length).toBeGreaterThan(0);
});

test("as páginas de leitura não têm campo aberto", async ({ page }) => {
  test.setTimeout(180_000);
  const sigla = encodeURIComponent(SEMEADO.porClassificacao.regular);
  const turma = encodeURIComponent(SEMEADO.turmaJanelaCedo);
  await entrar(page, EMAIL, "/inicio");
  for (const caminho of [
    "/inicio",
    "/avisos",
    "/cursos",
    ...["sobre", "turmas", "disciplinas", "avaliacoes", "atividades", "horarios", "curriculo"].map(
      (aba) => `/cursos/${sigla}?aba=${aba}`,
    ),
    "/turmas",
    `/turmas/${turma}`,
    `/turmas/${turma}?aba=avaliacoes`,
    `/turmas/${turma}/dsa`,
    "/instrutores",
    "/perfil",
    "/admin/salas",
    "/admin/usuarios",
  ]) {
    await conferir(page, caminho);
  }
});
