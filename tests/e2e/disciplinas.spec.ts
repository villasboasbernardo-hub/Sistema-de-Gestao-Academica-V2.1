/**
 * A grade de disciplinas, **por clique** (`FR-001` a `FR-006`, `FR-030` a `FR-063`, `SC-001`).
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA, e a regra tem história.** Os percursos da fatia (a) chegavam
 * às telas com `page.goto` — o que prova que a tela **funciona** e não prova que alguém **chega**
 * nela. `/cursos/novo` não tinha link nenhum e a única entrada de `/cursos/[curso]/editar` era um
 * link chamado *"histórico e correção"*: os dois passaram por uma suíte inteira. Aqui o percurso é
 * `goto('/inicio')` **uma vez**, e daí menu → curso → turma → linha → painéis.
 *
 * ⚠️ **O CASO CRÍTICO É O DO PERÍODO**, e ele mede a linha que **não** foi editada. Gravar por
 * `disciplina_id` em vez de pelo `id` da linha da turma deixaria a turma editada certa e mudaria
 * todas as outras — sintoma mudo, que só aparece semanas depois, na turma do lado.
 *
 * ⚠️ **A AMOSTRA É IDEMPOTENTE** (regra 9.1): curso não é apagável, então ela o reaproveita. A prova
 * é rodar **duas vezes seguidas**.
 */
import { expect, test, type Page } from "@playwright/test";

import { criarConta, apagarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  codigoDaTurmaDois,
  codigoDaTurmaUm,
  contarDisciplina,
  disciplinaComUe,
  disciplinaLimpa,
  disciplinaSemUe,
  lerGradeDaTurma,
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
let CODIGO_DA_TURMA_UM = "";
let CODIGO_DA_TURMA_DOIS = "";
let DISCIPLINA_COM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_SEM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_LIMPA = { cod: "", nome: "", ch: 0 };

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  SIGLA_DO_CURSO = siglaDoCurso(PROCESSO);
  CODIGO_DA_TURMA_UM = codigoDaTurmaUm(PROCESSO);
  CODIGO_DA_TURMA_DOIS = codigoDaTurmaDois(PROCESSO);
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
 * **O percurso por clique**: entra, vai pelo MENU até a grade e escolhe curso e turma.
 *
 * ⚠️ O único `goto` da suíte está em `entrar`, e é o ponto de partida.
 */
async function irAGradePorClique(page: Page, turma?: string): Promise<void> {
  await entrar(page, EMAIL, "/inicio");

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Disciplinas" })
    .click();
  await expect(page.getByRole("heading", { name: "Disciplinas" })).toBeVisible();

  await page.locator("#curso").selectOption(SIGLA_DO_CURSO);
  await expect(page.locator('[data-slot="seletor-turma"]')).toBeVisible();

  if (turma) {
    await page.locator('[data-slot="seletor-turma"]').click();
    await page.getByRole("option", { name: turma }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("turma")).toBe(turma);

    /*
     * ⚠️ **ESPERAR A URL NÃO BASTA, e foi isto que derrubou nove casos.** `turma` avisa o servidor
     * (`shallow: false`): o endereço muda **na hora** e a tela reentregue chega **depois**. Clicar
     * em seguida acertava a tabela do CATÁLOGO — quatro linhas em vez de duas, sem período nem
     * instrutores —, e o sintoma era `input[name="previsao_inicio"]` não existir, que se lê como
     * "o painel de período não foi escrito".
     * ⚠️ O conserto é esperar pelo que **só a vista por turma tem**: a coluna de período. É a mesma
     * lição do `abrirVitrine` e do `entrar` — esperar pelo que a página pronta tem, nunca por tempo.
     */
    await expect(page.getByRole("columnheader", { name: "Período previsto" })).toBeVisible();
  }
}

/** Abre o detalhe de uma disciplina clicando na célula do nome. */
async function abrirDetalhe(page: Page, nome: string): Promise<void> {
  await page.getByRole("gridcell", { name: nome, exact: false }).first().click();
  await expect(page.locator('[data-slot="detalhe-da-disciplina"]')).toBeVisible();
}

/**
 * Acrescenta o **primeiro** instrutor ainda não atribuído, pelo seletor único.
 *
 * ⚠️ **A LISTA É PROCURADA DENTRO DO PAINEL FLUTUANTE, e não na página.** `getByRole("option")` no
 * escopo da página casa também com as `<option>` NATIVAS do seletor de curso — elas têm o mesmo
 * papel e ficam invisíveis, e o clique esperava 30 s por um elemento que nunca apareceria. É o
 * gotcha 3 da fatia (b) do Épico 4: seletor por papel é ambíguo, e ambiguidade não se resolve com
 * mais tempo, e sim com escopo.
 */
async function acrescentarInstrutor(page: Page): Promise<void> {
  // ⚠️ **ESCOPADO AO DETALHE, e o escopo é o conserto.** `<select>` nativo também tem papel
  //    `combobox`: a página tem SEIS, entre a cascata e os filtros, e o `.first()` pegava um deles —
  //    que não abre painel nenhum. É o gotcha 3 da fatia (b) do Épico 4, de novo.
  const detalhe = page.locator('[data-slot="detalhe-da-disciplina"]');
  await detalhe.locator('[data-slot="seletor-instrutor"]').first().click();
  const painel = page.locator('[data-slot="popover-content"]');
  await painel.getByRole("option").first().click();
}

test.describe("`FR-001` a `FR-006` · chegar, escolher e ver", () => {
  test("o menu leva à grade, e a cascata curso → turma traz as disciplinas daquela turma", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);

    await expect(page.getByRole("gridcell", { name: DISCIPLINA_COM_UE.nome })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();

    // ⚠️ A disciplina LIMPA não está em turma nenhuma: ela aparece no catálogo e **não** aqui.
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_LIMPA.nome })).toHaveCount(0);
  });

  test("⚠️ sem turma, o que é POR TURMA degrada com aviso — nunca com zero", async ({ page }) => {
    await irAGradePorClique(page);

    // A disciplina limpa aparece: no catálogo estão todas as do curso.
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_LIMPA.nome })).toBeVisible();
    // ⚠️ "0 sem instrutor" afirmaria que está tudo designado. A frase diz que isso é por turma.
    await expect(page.getByText(/são \s*por turma/i).first()).toBeVisible();
  });

  test("⚠️ o endereço da vista reabre a MESMA tela, com a mesma linha aberta", async ({ page }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
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

test.describe("⚠️ CRITÉRIO 4 · o período é DAQUELA turma, e de mais nenhuma", () => {
  test("gravar na T2 não toca na T1", async ({ page }) => {
    const antes = await lerGradeDaTurma(amostra.turmaUmId, amostra.disciplinaComUeId);

    await irAGradePorClique(page, CODIGO_DA_TURMA_DOIS);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    await page.locator('input[name="previsao_inicio"]').fill("2026-03-10");
    await page.locator('input[name="previsao_termino"]').fill("2026-04-10");
    await page.locator('[data-slot="gravar-periodo"]').click();
    await expect(page.getByRole("status").filter({ hasText: "Período gravado" })).toBeVisible();

    const t2 = await lerGradeDaTurma(amostra.turmaDoisId, amostra.disciplinaComUeId);
    expect(t2.previsaoInicio).toBe("2026-03-10");
    expect(t2.origemPeriodo).toBe("manual");

    const t1 = await lerGradeDaTurma(amostra.turmaUmId, amostra.disciplinaComUeId);
    expect(
      t1.previsaoInicio,
      "a T1 recebeu a previsão da T2 — a gravação filtra por disciplina, não pela linha da turma",
    ).toBeNull();
    expect(t1.editadoEm, "o carimbo de edição da T1 mudou").toBe(antes.editadoEm);
  });

  test("⚠️ e período FORA da janela da turma é recusado pelo BANCO, com a janela na frase", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    // A janela da turma é 02/03 a 30/06. Janeiro está fora.
    await page.locator('input[name="previsao_inicio"]').fill("2026-01-05");
    await page.locator('input[name="previsao_termino"]').fill("2026-01-20");
    await page.locator('[data-slot="gravar-periodo"]').click();

    const recusa = page.getByRole("alert").filter({ hasText: "janela" });
    await expect(recusa).toBeVisible();
    // ⚠️ A frase traz AS DATAS da janela: sem elas, quem corrige tenta de novo às cegas.
    await expect(recusa).toContainText("2026-03-02");
    await expect(recusa).toContainText("2026-06-30");
  });
});

test.describe("`FR-041` · os cinco casos do rateio, na tela", () => {
  test("⚠️ divisão igual: 10 TA entre 3 dá 4/3/3 — o resto vai ao MAIS ANTIGO", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    // Acrescenta os três pelo seletor único, em ordem de antiguidade.
    for (let i = 0; i < 3; i++) await acrescentarInstrutor(page);

    const parcelas = page.locator('[data-slot="parcela"]');
    await expect(parcelas).toHaveCount(3);
    // ⚠️ **O CASO QUE DISCRIMINA A MUDANÇA DE REGRA**: a v2.0 daria 3/3/4.
    await expect(parcelas.nth(0)).toHaveText("4 tempos");
    await expect(parcelas.nth(1)).toHaveText("3 tempos");
    await expect(parcelas.nth(2)).toHaveText("3 tempos");

    await expect(page.locator('[data-slot="soma-do-rateio"]')).toContainText("10");
  });

  test("um instrutor só recebe a CH integral", async ({ page }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    await acrescentarInstrutor(page);

    await expect(page.locator('[data-slot="parcela"]')).toHaveText("12 tempos");
    await expect(page.locator('[data-slot="soma-do-rateio"]')).toContainText("integral");
  });

  test("⚠️ por TA digitados: a SOMA ERRADA é recusada, com os dois números", async ({ page }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    for (let i = 0; i < 2; i++) await acrescentarInstrutor(page);

    await page.getByRole("radio", { name: /Informar os tempos/ }).check();
    const campos = page.locator('input[type="number"]');
    await campos.nth(0).fill("7");
    await campos.nth(1).fill("2");

    // ⚠️ A recusa aparece ANTES de gravar: a função pura antecipa o que o gatilho vai dizer.
    const recusa = page.locator('[data-slot="rateio-nao-fecha"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("9");
    await expect(recusa).toContainText("10");

    // E a soma exata some com a recusa.
    await campos.nth(1).fill("3");
    await expect(recusa).toHaveCount(0);
  });

  test("⚠️ por unidade de ensino: a CH de cada um é a soma das unidades dele", async ({ page }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    for (let i = 0; i < 2; i++) await acrescentarInstrutor(page);

    await page.getByRole("radio", { name: /unidades de ensino/ }).check();
    await expect(page.locator('[data-slot="unidades-por-instrutor"] li')).toHaveCount(2);

    // ⚠️ Enquanto nenhuma unidade tem dono, a recusa nomeia o que falta.
    await expect(page.locator('[data-slot="rateio-nao-fecha"]')).toContainText(
      "sem nenhuma unidade",
    );
  });

  test("⚠️ o modo POR UNIDADE não é oferecido em disciplina sem unidade (`FR-041.5`)", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    await acrescentarInstrutor(page);

    await expect(page.getByRole("radio", { name: /Informar os tempos/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /unidades de ensino/ })).toHaveCount(0);
  });
});

test.describe("`FR-060` a `FR-063` · as unidades de ensino", () => {
  test("⚠️ O CASO QUE DISCRIMINA · com UE a seção aparece; sem UE não há NENHUMA menção", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);

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
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
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
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);
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
  test("⚠️ filtrar muda os três juntos, e *Limpar filtros* mantém curso e turma", async ({
    page,
  }) => {
    await irAGradePorClique(page, CODIGO_DA_TURMA_UM);

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
    // ⚠️ **CURSO E TURMA FICAM** — eles são navegação, não filtro (`FR-054`).
    const endereco = new URL(page.url());
    expect(endereco.searchParams.get("curso")).toBe(SIGLA_DO_CURSO);
    expect(endereco.searchParams.get("turma")).toBe(CODIGO_DA_TURMA_UM);
  });
});
