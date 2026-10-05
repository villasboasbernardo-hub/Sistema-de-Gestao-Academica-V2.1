/**
 * A seção de disciplinas **na ficha da turma**, por clique (`FR-018`, `FR-030` da spec 012).
 *
 * ⚠️ **ESTE ARQUIVO NÃO É NOVO EM COBERTURA: ELE RECEBEU CASOS QUE VIVIAM EM `disciplinas.spec.ts`.**
 * O recorte por turma saiu de `/disciplinas?turma=` e foi para a ficha (`FR-018`), e os casos foram
 * **com ele** — o critério 4 do período e os cinco do rateio. ⚠️ **Movê-los importava mais que
 * reescrevê-los:** apagá-los e escrever outros perderia o histórico do que cada um existe para pegar,
 * e dois deles são "casos que discriminam" de regras que já mudaram de veredito uma vez.
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA.** O percurso é `entrar('/inicio')` e daí **menu → Turmas →
 * linha da turma → ficha → linha da disciplina**. É o percurso que o `FR-022` promete, e provar que a
 * tela funciona por `goto` não prova que alguém **chega** nela.
 *
 * ⚠️ **O CASO CRÍTICO CONTINUA SENDO O DO PERÍODO**, e ele mede a linha que **não** foi editada:
 * gravar por `disciplina_id` em vez de pelo `id` da linha da turma deixaria a turma editada certa e
 * mudaria todas as outras — sintoma mudo, que aparece semanas depois, na turma do lado.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  codigoDaTurmaDois,
  codigoDaTurmaUm,
  disciplinaComUe,
  disciplinaSemUe,
  lerGradeDaTurma,
  limparAmostraDaGrade,
  semearGradeDeDisciplinas,
  siglaDoCurso,
  type AmostraDaGrade,
} from "./disciplinas-de-teste";

let EMAIL = "";
let amostra: AmostraDaGrade;

/*
 * ⚠️ **TUDO POR PROCESSO DE TRABALHO.** Com um selo único os processos semeariam o mesmo curso, e a
 * limpeza de um apagaria no meio da execução o que os outros usam — ver `disciplinas-de-teste.ts`.
 */
let PROCESSO = 0;
let CODIGO_DA_TURMA_UM = "";
let CODIGO_DA_TURMA_DOIS = "";
let DISCIPLINA_COM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_SEM_UE = { cod: "", nome: "", ch: 0 };

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  CODIGO_DA_TURMA_UM = codigoDaTurmaUm(PROCESSO);
  CODIGO_DA_TURMA_DOIS = codigoDaTurmaDois(PROCESSO);
  DISCIPLINA_COM_UE = disciplinaComUe(PROCESSO);
  DISCIPLINA_SEM_UE = disciplinaSemUe(PROCESSO);

  EMAIL = emailDeTeste("turmadisc", PROCESSO);
  await criarConta(EMAIL, `USR-TDISC-${PROCESSO}`);
  amostra = await semearGradeDeDisciplinas(PROCESSO);
});

test.afterAll(async () => {
  await limparAmostraDaGrade(PROCESSO);
  await apagarConta(EMAIL);
});

const SECAO = '[data-slot="disciplinas-da-turma"]';
const DETALHE = '[data-slot="detalhe-da-disciplina-da-turma"]';

/**
 * **O percurso por clique**: entra, vai pelo menu até Turmas, acha a turma na lista e abre a ficha.
 *
 * ⚠️ **A LISTA MOSTRA TODAS AS LINHAS** (a tabela densa não janela), então o link da turma existe sem
 * filtrar. O nome acessível do link é o rótulo completo — `código · Situação` —, e por isso procurar
 * pelo código casa por substring, que é o padrão do `getByRole`.
 */
async function irASecaoDaTurma(page: Page, turma: string): Promise<void> {
  await entrar(page, EMAIL, "/inicio");

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Turmas", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");

  await page.getByRole("link", { name: turma }).first().click();
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(turma);

  /*
   * ⚠️ **ESPERAR A SEÇÃO, E NÃO A FICHA.** A ficha chega antes da seção de disciplinas, que depende de
   * uma segunda leitura (a grade é indexada pela sigla do curso, que só existe depois de ler o curso).
   * Clicar antes acertaria o formulário da turma.
   */
  await expect(page.locator(SECAO)).toBeVisible();
}

/** Abre o detalhe de uma disciplina clicando na célula do nome, dentro da seção. */
async function abrirDetalhe(page: Page, nome: string): Promise<void> {
  await page.locator(SECAO).getByRole("gridcell", { name: nome, exact: false }).first().click();
  await expect(page.locator(DETALHE)).toBeVisible();
}

/**
 * Acrescenta o **primeiro** instrutor ainda não atribuído, pelo seletor único.
 *
 * ⚠️ **ESCOPADO AO DETALHE, e o escopo é o conserto.** `<select>` nativo também tem papel
 * `combobox`; procurar na página casava com o primeiro que aparecesse — que não abre painel nenhum. É
 * o gotcha 3 da fatia (b) do Épico 4: seletor por papel é ambíguo, e ambiguidade não se resolve com
 * mais tempo, e sim com escopo.
 */
async function acrescentarInstrutor(page: Page): Promise<void> {
  const detalhe = page.locator(DETALHE);
  await detalhe.locator('[data-slot="seletor-instrutor"]').first().click();
  const painel = page.locator('[data-slot="popover-content"]');
  await painel.getByRole("option").first().click();
}

test.describe("`FR-022` · menu → Turmas → ficha → a seção de disciplinas", () => {
  test("a seção mostra as disciplinas DAQUELA turma, e só elas", async ({ page }) => {
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);

    const secao = page.locator(SECAO);
    await expect(secao.getByRole("gridcell", { name: DISCIPLINA_COM_UE.nome })).toBeVisible();
    await expect(secao.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();

    // ⚠️ A disciplina LIMPA não está em turma nenhuma: ela aparece no catálogo do curso, não aqui.
    await expect(secao.getByRole("gridcell", { name: "Limpa" })).toHaveCount(0);
  });

  test("⚠️ o endereço antigo de disciplinas chega NESTA seção", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");

    /*
     * ⚠️ **AQUI O `goto` NÃO É PERCURSO: É A PROVA DO REDIRECIONAMENTO** (`FR-019`). O endereço é o
     *    que alguém salvou em setembro, e ele tem de continuar levando a algum lugar correto.
     */
    const sigla = siglaDoCurso(PROCESSO);
    await page.goto(
      `/disciplinas?curso=${encodeURIComponent(sigla)}&turma=${encodeURIComponent(CODIGO_DA_TURMA_UM)}`,
    );

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/turmas/${encodeURIComponent(CODIGO_DA_TURMA_UM)}`);
    await expect(page.locator(SECAO)).toBeVisible();
  });

  test("o caminho de volta é a LISTA, e o curso fica a um clique", async ({ page }) => {
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);

    // ⚠️ `D-NAV-3`: a volta deixou de ser o curso, que continua alcançável pelo cabeçalho.
    await expect(page.locator('[data-slot="curso-da-turma"]')).toBeVisible();
    await page.locator('[data-slot="voltar-a-lista"]').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  });
});

test.describe("⚠️ CRITÉRIO 4 · o período é DAQUELA turma, e de mais nenhuma", () => {
  test("gravar na T2 não toca na T1", async ({ page }) => {
    const antes = await lerGradeDaTurma(amostra.turmaUmId, amostra.disciplinaComUeId);

    await irASecaoDaTurma(page, CODIGO_DA_TURMA_DOIS);
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
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    // A janela da turma é 02/03 a 30/06. Janeiro está fora.
    await page.locator('input[name="previsao_inicio"]').fill("2026-01-05");
    await page.locator('input[name="previsao_termino"]').fill("2026-01-20");
    await page.locator('[data-slot="gravar-periodo"]').click();

    const recusa = page.getByRole("alert").filter({ hasText: "janela" });
    await expect(recusa).toBeVisible();
    // ⚠️ A frase traz AS DATAS da janela: sem elas, quem corrige tenta de novo às cegas.
    // ⚠️ A frase vem do BANCO e passa pela tradução, que desde 05/10/2026 escreve DD/MM/AAAA.
    await expect(recusa).toContainText("02/03/2026");
    await expect(recusa).toContainText("30/06/2026");
  });

  test("⚠️ e gravar na seção REVALIDA a ficha — sem recarregar à mão", async ({ page }) => {
    /*
     * ⚠️ **ESTE CASO É NOVO, E NASCEU DE UM RISCO MEDIDO** (decisão **D12**). As ações de período e de
     *    instrutores revalidavam só `/disciplinas`; com os painéis aqui, gravar deixaria a ficha
     *    mostrando o valor **velho, sem erro nenhum** — o gotcha 4 na forma de cache. A linha de
     *    `revalidatePath(ROTA_DA_FICHA_DA_TURMA)` é o conserto, e este caso é o que a cobra.
     */
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_DOIS);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    await page.locator('input[name="previsao_inicio"]').fill("2026-04-01");
    await page.locator('input[name="previsao_termino"]').fill("2026-05-01");
    await page.locator('[data-slot="gravar-periodo"]').click();
    await expect(page.getByRole("status").filter({ hasText: "Período gravado" })).toBeVisible();

    // A coluna da própria seção passa a mostrar o período, sem `reload`.
    // ⚠️ A célula do período é EXIBIÇÃO: DD/MM/AAAA. O `fill` acima continua em ISO, que é o valor.
    await expect(page.locator(SECAO)).toContainText("01/04/2026");
  });
});

test.describe("`FR-041` · os cinco casos do rateio, na seção da turma", () => {
  test("⚠️ divisão igual: 10 TA entre 3 dá 4/3/3 — o resto vai ao MAIS ANTIGO", async ({
    page,
  }) => {
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
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
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    await acrescentarInstrutor(page);

    await expect(page.locator('[data-slot="parcela"]')).toHaveText("12 tempos");
    await expect(page.locator('[data-slot="soma-do-rateio"]')).toContainText("integral");
  });

  test("⚠️ por TA digitados: a SOMA ERRADA é recusada, com os dois números", async ({ page }) => {
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    for (let i = 0; i < 2; i++) await acrescentarInstrutor(page);

    await page.getByRole("radio", { name: /Informar os tempos/ }).check();
    const campos = page.locator(`${DETALHE} input[type="number"]`);
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
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
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
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);

    await acrescentarInstrutor(page);

    await expect(page.getByRole("radio", { name: /Informar os tempos/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /unidades de ensino/ })).toHaveCount(0);
  });
});

test.describe("`FR-028`, `SC-005` · a execução POR DISCIPLINA, e o rodapé que se confere", () => {
  /*
   * ⚠️ **AS DUAS COLUNAS SÃO DO PR 3, E ELAS RESPONDEM A PERGUNTA QUE A GRADE NÃO RESPONDIA:**
   *    *"quanto desta disciplina já foi dado NESTA turma?"*. A CH prevista já estava ali desde a
   *    fatia (b); o que faltava era a executada ao lado dela, que é o que transforma a tabela em
   *    acompanhamento.
   * ⚠️ **ESTA AMOSTRA NÃO TEM LANÇAMENTO NENHUM, e é o que torna o caso útil:** as colunas existem
   *    com zero, e o rodapé soma zero — o estado em que uma turma começa, e o estado em que uma
   *    implementação que não lê execução **também** fica. O caso que distingue os dois é o da
   *    `andamento.spec.ts` sobre `turmaJanelaCedo` (6 de 20 TA, 30 %), onde o número não é zero.
   */
  test("cada linha mostra CH executada e %, ao lado da prevista", async ({ page }) => {
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);

    const secao = page.locator(SECAO);
    await expect(secao.getByRole("columnheader", { name: /CH prevista/ })).toBeVisible();
    await expect(secao.getByRole("columnheader", { name: /CH executada/ })).toBeVisible();
    /*
     * ⚠️ **O NOME ACESSÍVEL DO CABEÇALHO NÃO É SÓ O TÍTULO, e `exact` reprovou por isso** (medido em
     *    04/10/2026): coluna ordenável carrega um texto `sr-only` — *"ordenável: pressione Enter…"* —
     *    que entra no nome, porque é ele que torna a ordenação audível. O casamento é pelo começo.
     */
    await expect(secao.getByRole("columnheader", { name: /^%/ })).toBeVisible();

    /*
     * ⚠️ **A LINHA É LIDA PELO NOME DA DISCIPLINA, e a célula pelo papel** — procurar o texto "0 %"
     *    na seção casaria com qualquer linha e com o rodapé.
     */
    const linha = secao.getByRole("row", { name: new RegExp(DISCIPLINA_COM_UE.nome) });
    await expect(linha).toContainText(String(DISCIPLINA_COM_UE.ch));
    await expect(linha).toContainText("0 %");
  });

  test("⚠️ o rodapé soma A GRADE desta turma — e o rótulo diz isso", async ({ page }) => {
    /*
     * ⚠️ **A SOMA DO RODAPÉ NÃO É A CH PREVISTA DO ANDAMENTO, E A DIFERENÇA É DE DESENHO.** A grade
     *    desta turma tem duas disciplinas (10 + 12 = 22 TA); o currículo do curso tem **três** — a
     *    `DISCIPLINA_LIMPA`, de 4 TA, fica fora de turma nenhuma de propósito (é a única excluível).
     *    E `chr_curricular` soma **o currículo do curso**, medido na definição da view: 26 TA.
     *    Chamar isso de reconciliação, como o contrato chamava, era afirmar o que não se mede.
     */
    await irASecaoDaTurma(page, CODIGO_DA_TURMA_UM);

    const rodape = page.locator('[data-slot="rodape-das-disciplinas"]');
    await expect(rodape).toContainText("nesta grade");
    await expect(rodape.locator('[data-rodape="prevista"]')).toHaveText(
      String(DISCIPLINA_COM_UE.ch + DISCIPLINA_SEM_UE.ch),
    );
    await expect(rodape.locator('[data-rodape="executada"]')).toHaveText("0");

    /*
     * ⚠️ **O AVISO DOS LANÇAMENTOS SEM UNIDADE DE ENSINO NÃO APARECE AQUI, E NÃO PODERIA APARECER:**
     *    a catraca `reg_aula_ue_so_nula_no_historico` **recusa** lançamento novo sem UE, então
     *    nenhuma semente consegue produzir a diferença — só as 1.566 linhas migradas do ETL a têm
     *    nula. O caso positivo dele está no roteiro de conferência do PR 3, sobre o banco local
     *    carregado. **Afirmar aqui que ele aparece seria afirmar sobre o que não foi medido.**
     */
    await expect(page.locator('[data-slot="lancamentos-sem-unidade"]')).toHaveCount(0);
  });
});
