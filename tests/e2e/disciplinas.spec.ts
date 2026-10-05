/**
 * O **catálogo de disciplinas do curso**, por clique (`FR-001` a `FR-006`, `FR-060` a `FR-063`).
 *
 * ⚠️ **ESTA TELA DEIXOU DE TER RECORTE POR TURMA EM 04/10/2026** (`FR-018` da spec 012), e os casos
 * que o mediam **mudaram de arquivo, não desapareceram**: o critério 4 do período e os cinco do
 * rateio vivem em `turma-disciplinas.spec.ts`, sobre a seção de disciplinas da ficha da turma.
 * Apagá-los teria sido perder dois "casos que discriminam" de regras que já mudaram de veredito.
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA, e a regra tem história.** Os percursos da fatia (a) chegavam
 * às telas com `page.goto` — o que prova que a tela **funciona** e não prova que alguém **chega**
 * nela. `/cursos/novo` não tinha link nenhum e a única entrada de `/cursos/[curso]/editar` era um
 * link chamado *"histórico e correção"*: os dois passaram por uma suíte inteira. Aqui o percurso é
 * `goto('/inicio')` **uma vez**, e daí menu → curso → linha → painéis.
 *
 * ⚠️ **A AMOSTRA É IDEMPOTENTE** (regra 9.1): curso não é apagável, então ela o reaproveita. A prova
 * é rodar **duas vezes seguidas**.
 */
import { expect, test, type Page } from "@playwright/test";

import { criarConta, apagarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  contarDisciplina,
  disciplinaComUe,
  disciplinaLimpa,
  disciplinaSemUe,
  limparAmostraDaGrade,
  rastroDaExclusao,
  semearGradeDeDisciplinas,
  selo,
  siglaDoCurso,
  type AmostraDaGrade,
} from "./disciplinas-de-teste";

let EMAIL = "";
let amostra: AmostraDaGrade;

/*
 * ⚠️ **TUDO NESTA SUÍTE É POR PROCESSO DE TRABALHO.** O `beforeAll` roda uma vez por PROCESSO, e com
 * um selo único os quatro processos semeavam o mesmo curso — e a limpeza de um apagava, no meio da
 * execução, o que os outros usavam. Ver o cabeçalho de `disciplinas-de-teste.ts`.
 */
let PROCESSO = 0;
let SIGLA_DO_CURSO = "";
let DISCIPLINA_COM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_SEM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_LIMPA = { cod: "", nome: "", ch: 0 };

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  SIGLA_DO_CURSO = siglaDoCurso(PROCESSO);
  DISCIPLINA_COM_UE = disciplinaComUe(PROCESSO);
  DISCIPLINA_SEM_UE = disciplinaSemUe(PROCESSO);
  DISCIPLINA_LIMPA = disciplinaLimpa(PROCESSO);

  EMAIL = emailDeTeste("disciplinas", PROCESSO);
  await criarConta(EMAIL, `USR-DISC-${PROCESSO}`);
  amostra = await semearGradeDeDisciplinas(PROCESSO);
});

test.afterAll(async () => {
  await limparAmostraDaGrade(PROCESSO);
  await apagarConta(EMAIL);
});

/**
 * **O percurso por clique**: entra, vai pelo MENU até a grade e escolhe o curso.
 *
 * ⚠️ O único `goto` da suíte está em `entrar`, e é o ponto de partida.
 *
 * ⚠️ **ELE PERDEU O PARÂMETRO `turma` EM 04/10/2026, e com ele a espera pelo seletor de turma** — que
 * não existe mais nesta tela. A espera que ficou é pelo título: o `#curso` escreve na URL e avisa o
 * servidor, então a tabela reentregue chega **depois** do endereço mudar.
 */
async function irAGradePorClique(page: Page): Promise<void> {
  await entrar(page, EMAIL, "/inicio");

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Disciplinas" })
    .click();
  await expect(page.getByRole("heading", { name: "Disciplinas" })).toBeVisible();

  await page.locator("#curso").selectOption(SIGLA_DO_CURSO);
  // ⚠️ Espera pelo que só a tabela pronta tem — nunca por tempo (achado 9 do Épico 3).
  await expect(page.getByRole("columnheader", { name: "CH" })).toBeVisible();
}

/** Abre o detalhe de uma disciplina clicando na célula do nome. */
async function abrirDetalhe(page: Page, nome: string): Promise<void> {
  await page.getByRole("gridcell", { name: nome, exact: false }).first().click();
  await expect(page.locator('[data-slot="detalhe-da-disciplina"]')).toBeVisible();
}

test.describe("`FR-001` a `FR-006` · chegar, escolher e ver", () => {
  test("o menu leva à grade, e o curso escolhido traz TODAS as disciplinas dele", async ({
    page,
  }) => {
    await irAGradePorClique(page);

    await expect(page.getByRole("gridcell", { name: DISCIPLINA_COM_UE.nome })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();

    /*
     * ⚠️ **A DISCIPLINA LIMPA APARECE AQUI, E É O QUE DISTINGUE AS DUAS TELAS.** Ela não está em
     *    turma nenhuma: o catálogo mostra todas as do curso, e a seção da ficha mostra só as da
     *    grade daquela turma. Antes de 04/10/2026 as duas vistas moravam nesta tela.
     */
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_LIMPA.nome })).toBeVisible();
  });

  test("⚠️ o que é POR TURMA degrada com aviso — nunca com zero", async ({ page }) => {
    await irAGradePorClique(page);

    // ⚠️ "0 sem instrutor" afirmaria que está tudo designado. A frase diz ONDE isso se decide.
    await expect(page.getByText(/são \s*por turma/i).first()).toBeVisible();
    await expect(page.getByText(/ficha da turma/i).first()).toBeVisible();
  });

  test("⚠️ o endereço da vista reabre a MESMA tela, com a mesma linha aberta", async ({ page }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    const endereco = page.url();
    expect(
      new URL(endereco).searchParams.get("aberta"),
      "a linha aberta não foi para a URL",
    ).not.toBeNull();

    // ⚠️ Aqui o `goto` NÃO é percurso: é a prova de que o endereço basta (quickstart passo 6).
    await page.goto(endereco);
    await expect(page.locator('[data-slot="detalhe-da-disciplina"]')).toBeVisible();
  });
});

test.describe("`FR-060` a `FR-063` · as unidades de ensino", () => {
  test("⚠️ O CASO QUE DISCRIMINA · com UE a seção aparece; sem UE não há NENHUMA menção", async ({
    page,
  }) => {
    await irAGradePorClique(page);

    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    await expect(page.locator('[data-slot="lista-de-unidades"] li')).toHaveCount(2);

    // A mesma tela, na disciplina sem unidade.
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);
    await expect(
      page.locator('[data-slot="lista-de-unidades"] li'),
      "apareceu unidade numa disciplina que não tem",
    ).toHaveCount(0);
    // ⚠️ E **nenhum aviso de que faltam** — a ausência não é pendência (`FR-061`, D-B3).
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toHaveCount(0);
  });

  test("a soma que não fecha AVISA, e não bloqueia", async ({ page }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    // As duas unidades somam 10, igual à CH: nenhum aviso.
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toHaveCount(0);

    // Acrescentar uma terceira quebra a soma — e a gravação PASSA, com aviso.
    await page.locator('input[name="numero_ue"]').last().fill("9");
    await page.locator('input[name="topico"]').last().fill("Unidade que desequilibra");
    await page.locator('input[name="ch"]').last().fill("3");
    await page.locator('[data-slot="acrescentar-unidade"]').click();

    await expect(page.getByRole("status").filter({ hasText: "acrescentada" })).toBeVisible();
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toContainText("13");
  });
});

test.describe("`FR-020` a `FR-024` · a exclusão, com código e rastro", () => {
  test("⚠️ disciplina COM linha de turma é recusada, NOMEANDO o impedimento", async ({ page }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    await page.locator('[data-slot="abrir-exclusao"]').first().click();
    await page.locator('input[name="codigo_confirmacao"]').fill(`DIS-${selo(PROCESSO)}-1`);
    await page.locator('[data-slot="confirmar-exclusao"]').click();

    const recusa = page.locator('[data-slot="recusa-da-exclusao"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("linha de turma");
    // ⚠️ E a recusa OFERECE A SAÍDA — sem próximo passo, a pessoa tenta de novo do mesmo jeito.
    await expect(recusa).toContainText("Desative");
  });

  test("⚠️ o botão só libera com o CÓDIGO certo, e a disciplina LIMPA some com rastro", async ({
    page,
  }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_LIMPA.nome);

    await page.locator('[data-slot="abrir-exclusao"]').first().click();

    // ⚠️ Com o código errado, o botão continua desabilitado — o segundo passo é o que protege.
    await page.locator('input[name="codigo_confirmacao"]').fill("codigo-errado");
    await expect(page.locator('[data-slot="confirmar-exclusao"]')).toBeDisabled();

    await page.locator('input[name="codigo_confirmacao"]').fill(amostra.disciplinaLimpaCodigo);
    await expect(page.locator('[data-slot="confirmar-exclusao"]')).toBeEnabled();
    await page.locator('[data-slot="confirmar-exclusao"]').click();

    await expect
      .poll(() => contarDisciplina(amostra.disciplinaLimpaId), { timeout: 15_000 })
      .toBe(0);
    // ⚠️ O rastro é o que a emenda D-B1 acrescentou em relação à exclusão de instrutor.
    expect(await rastroDaExclusao(amostra.disciplinaLimpaCodigo)).toBeGreaterThan(0);
  });
});

test.describe("`SC-011` · filtro, indicadores e gráfico refletem o MESMO subconjunto", () => {
  test("⚠️ filtrar muda os três juntos, e *Limpar filtros* mantém o curso", async ({ page }) => {
    await irAGradePorClique(page);

    const indicadorDeDisciplinas = page
      .locator('[data-slot="indicadores"] p')
      .filter({ hasText: /^\d+$/ })
      .first();
    const antes = await indicadorDeDisciplinas.textContent();

    /*
     * ⚠️ **ABRE O PAINEL SÓ SE ELE ESTIVER FECHADO.** `FiltroAvancado` é um `Collapsible` e pode vir
     * aberto; um clique incondicional no gatilho o **fechava**, e o campo sumia — o sintoma era
     * `getByLabel("Buscar")` não existir, que se lê como "o filtro de busca não foi escrito".
     */
    const filtro = page.locator('[data-slot="filtro-avancado"]');
    if (!(await filtro.getByLabel("Buscar").isVisible())) {
      await filtro.getByRole("button", { name: "Filtros" }).click();
    }
    await filtro.getByLabel("Buscar").fill(DISCIPLINA_COM_UE.cod);

    await expect
      .poll(() => indicadorDeDisciplinas.textContent(), { timeout: 10_000 })
      .not.toBe(antes);
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toHaveCount(0);

    await page.locator('[data-slot="limpar-filtros"]').click();

    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();
    /*
     * ⚠️ **O CURSO FICA — ele é navegação, não filtro** (`FR-054`). Limpar filtros e perder o curso em
     *    que se estava faria o botão **navegar**, e quem clicou queria ver a lista inteira daquele
     *    curso. ⚠️ A asserção da **turma** saiu daqui em 04/10/2026 junto com o parâmetro: ela não é
     *    mais desta tela, e está coberta na seção da ficha.
     */
    const endereco = new URL(page.url());
    expect(endereco.searchParams.get("curso")).toBe(SIGLA_DO_CURSO);
    expect(
      endereco.searchParams.get("turma"),
      "a turma voltou ao endereço desta tela: o recorte por turma mora na ficha",
    ).toBeNull();
  });
});
