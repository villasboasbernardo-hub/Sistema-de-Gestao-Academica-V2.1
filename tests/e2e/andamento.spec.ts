/**
 * A seção **Andamento** da ficha da turma, **por clique** (`FR-023` a `FR-029`, `SC-005` da spec 012).
 *
 * ⚠️ **O QUE ESTA SUÍTE MEDE É QUE A TELA DIZ O QUE NÃO SABE.** Os cinco estados de
 * `contracts/andamento.md` §2 existem porque *"0 %"*, *"saldo 0"* e *"sem atraso"* são **respostas**,
 * e nenhuma delas vale como resposta quando o insumo falta: sem data de término não há intervalo, sem
 * regime vigente não há TA/dia, sem CH em disciplina não há denominador, sem lançamento não há
 * execução. ⚠️ **O painel antigo do `/inicio` respondia `0 %` e *"em dia"* para todos esses casos** —
 * é o gotcha 4 na forma de número: a ausência chega como zero e se lê como medição.
 *
 * ⚠️ **AS CINCO TURMAS VÊM DE DUAS SEMENTES, e as duas são necessárias.** A de cursos
 * (`cursos-de-teste.ts`) tem as turmas sem término, sem regime para a modalidade e sem lançamento; a
 * do panorama (`panorama-de-teste.ts`) tem as duas que **calculam** — a em excesso e a que não cabe
 * no prazo, com término relativo a hoje. Plantar as cinco numa semente só mudaria as contagens das
 * suítes que já usam cada uma delas.
 *
 * ⚠️ **`goto` NÃO APARECE AQUI.** Toda ficha é aberta pelo menu, pela busca da lista e por clique na
 * linha — `navegar-turmas.ts`.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "./panorama-de-teste";

let EMAIL = "";
let CURSOS: CursosSemeados;
let PANORAMA: PanoramaSemeado;
let PROCESSO = 0;

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("andamento", PROCESSO);
  await criarConta(EMAIL, `USR-ANDA-${PROCESSO}`);
  CURSOS = await semearCursos(PROCESSO, EMAIL);
  PANORAMA = await semearPanorama(PROCESSO);
});

test.afterAll(async () => {
  await limparPanorama(PANORAMA);
  await limparCursos(CURSOS);
  await apagarConta(EMAIL);
});

const SECAO = '[data-slot="andamento-da-turma"]';

/** O valor de um campo do andamento, já esperado em tela. */
function campo(page: Page, nome: string) {
  return page.locator(`${SECAO} [data-andamento="${nome}"]`);
}

test.describe("`FR-023`, `FR-024` · a turma que calcula — e o excesso NÃO é atraso", () => {
  test("prevista, executada, progresso e saldo, com o número na marcação", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, PANORAMA.turmaEmExcesso);

    await expect(page.locator(SECAO)).toBeVisible();
    await expect(campo(page, "prevista")).toHaveText("10 TA");
    await expect(campo(page, "executada")).toHaveText("12 TA");
    await expect(campo(page, "percentual")).toHaveText("120 %");

    /*
     * ⚠️ **O NÚMERO VAI NO ATRIBUTO, E NÃO SÓ NA LARGURA DA FAIXA** (`FR-025`): barra colorida sem
     *    `aria-valuenow` não existe para quem usa leitor de tela. ⚠️ **E ELE PASSA DE 100 DE
     *    PROPÓSITO** — a faixa para em 100 para não transbordar a caixa, o número não para, porque
     *    recortá-lo esconderia o excesso.
     */
    const barra = page.locator(`${SECAO} [role="progressbar"]`);
    await expect(barra).toHaveAttribute("aria-valuenow", "120");
    await expect(barra).toHaveAttribute("aria-valuemax", "100");

    // A capacidade diária aparece porque foi usada: 8 TA/dia do regime presencial do curso.
    await expect(campo(page, "capacidade")).toContainText("8 TA/dia");
    await expect(campo(page, "capacidade")).toContainText("dias úteis");
  });

  test("⚠️ executou MAIS do que o previsto e NÃO está em atraso (o veredito que o Início invertia)", async ({
    page,
  }) => {
    /*
     * ⚠️ **É O MESMO CASO QUE DISCRIMINA DO `inicio.spec.ts`, VISTO DA FICHA.** `restante` é
     *    `max(prevista − executada, 0)` — **zero**, não `−2` —, então o saldo é a capacidade inteira
     *    e não há atraso nenhum a declarar. Com a fórmula antiga esta turma era a definição de
     *    turma atrasada.
     */
    await irAFichaDaTurma(page, EMAIL, PANORAMA.turmaEmExcesso);

    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toHaveCount(0);
    await expect(campo(page, "saldo")).toContainText("+");
  });

  test("⚠️ a turma que NÃO cabe no prazo acusa atraso, com o saldo negativo à vista", async ({
    page,
  }) => {
    /*
     * ⚠️ **A ASSERÇÃO É SOBRE O SINAL, E NÃO SOBRE O NÚMERO EXATO, de propósito.** A capacidade é
     *    `dias úteis × 8`, e dias úteis descontam **feriado de dia inteiro** (`RN-EVT-02`): o número
     *    exato depende do calendário carregado nesta máquina, e amarrá-lo aqui faria o caso reprovar
     *    no dia em que o PROENS publicasse um feriado. **A aritmética está nos 16 casos de unidade**,
     *    onde o calendário é parâmetro; aqui prova-se o veredito. A folga é grande: 100 previstos
     *    contra 2 dias úteis de prazo.
     */
    await irAFichaDaTurma(page, EMAIL, PANORAMA.turmaSemCapacidade);

    await expect(campo(page, "prevista")).toHaveText("100 TA");
    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toBeVisible();
    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toContainText(/em atraso/i);
    await expect(campo(page, "saldo")).toContainText("-");
    await expect(campo(page, "saldo-em-dias")).toContainText("-");
  });

  test("⚠️ saldo negativo em turma CONCLUÍDA não acusa atraso — o `RF-INI-01` diz «em andamento»", async ({
    page,
  }) => {
    /*
     * ⚠️ **É O CASO QUE SEPARA A REGRA DA ARITMÉTICA.** `turmaJanelaCedo` está **concluída**, com 6
     *    de 20 TA executados e término em 30/06/2026 — saldo negativo, capacidade zero. Alertar aqui
     *    encheria a ficha de aviso sobre o que ninguém pode mais consertar, e é a mesma razão pela
     *    qual o painel do Início também não alerta.
     */
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmaJanelaCedo);

    await expect(campo(page, "percentual")).toHaveText("30 %");
    await expect(campo(page, "saldo")).toContainText("-");
    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toHaveCount(0);
  });
});

test.describe("`FR-026.1`, `FR-027` · a tela nomeia o que falta, e nunca responde zero", () => {
  test("sem data de término: a frase manda informá-la, e não há veredito", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmaSemJanela);

    await expect(campo(page, "sem-termino")).toContainText(/sem data de término/i);
    await expect(campo(page, "saldo")).toHaveCount(0);
    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toHaveCount(0);
    // ⚠️ E a capacidade diária NÃO aparece: mostrar o insumo de uma conta que não foi feita engana.
    await expect(campo(page, "capacidade")).toHaveCount(0);
  });

  test("⚠️ e, no mesmo quadro, a CH prevista zero diz que o curso não tem carga em disciplina", async ({
    page,
  }) => {
    /*
     * ⚠️ **SÃO DUAS AUSÊNCIAS DIFERENTES NA MESMA TELA, E CADA UMA TEM A SUA FRASE.** Falta a data
     *    (que se conserta nesta ficha) e falta a carga curricular (que se conserta nas disciplinas do
     *    curso). Uma frase só mandaria metade das pessoas ao lugar errado. **São dois cursos reais
     *    por competências na base**, então este não é um caso de laboratório.
     */
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmaSemJanela);

    await expect(campo(page, "prevista")).toHaveText("0 TA");
    await expect(campo(page, "sem-prevista")).toContainText(/carga curricular/i);
    await expect(page.locator(`${SECAO} [role="progressbar"]`)).toHaveCount(0);
  });

  test("sem regime vigente para a modalidade da turma: capacidade «sem dado»", async ({ page }) => {
    /*
     * ⚠️ **A TURMA É EAD NUM CURSO CUJO REGIME NÃO DECLARA O LIMITE DIÁRIO EAD, e é assim que a
     *    `RN-MAT-04` se observa.** A escolha do TA/dia segue a modalidade da **turma**: para EAD o
     *    campo é `limite_diario_ead_horas`, e ele está vazio neste curso. ⚠️ **E NÃO HÁ RECURSO AO
     *    REGIME PRESENCIAL** (decisão D8): cair nos 8 TA/dia presenciais daria um número plausível
     *    para uma turma que não tem aula presencial nenhuma — plausível e inventado.
     */
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmasCanceladas[0] as string);

    await expect(campo(page, "sem-regime")).toContainText(/regime vigente/i);
    await expect(campo(page, "saldo")).toHaveCount(0);
    await expect(page.locator(`${SECAO} [data-slot="em-atraso"]`)).toHaveCount(0);
  });

  test("`FR-029` · sem lançamento: «ainda sem lançamentos», e NÃO «0 %»", async ({ page }) => {
    /*
     * ⚠️ **`0 %` SERIA UMA AFIRMAÇÃO SOBRE A EXECUÇÃO DA TURMA**, e o que existe é ausência de
     *    lançamento. A `RN-CRONOS-01` manda contar execução **só** de lançamento; a tela diz isso em
     *    palavras em vez de desenhar uma barra vazia.
     * ⚠️ **O SALDO CONTINUA À VISTA, e isto emenda a tabela do contrato** (04/10/2026): o saldo é
     *    `capacidade − restante`, e o restante é a prevista **inteira** quando nada foi lançado —
     *    é justamente a turma que ainda não começou que pode já não caber no prazo.
     */
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmaJanelaTarde);

    await expect(campo(page, "prevista")).toHaveText("20 TA");
    await expect(campo(page, "executada")).toHaveText("0 TA");
    await expect(campo(page, "sem-lancamentos")).toContainText(/ainda sem lançamentos/i);
    await expect(page.locator(`${SECAO} [role="progressbar"]`)).toHaveCount(0);
    await expect(campo(page, "saldo")).toBeVisible();
  });
});

test.describe("`FR-033` · nenhum estado do andamento bloqueia a edição da ficha", () => {
  test("⚠️ a turma sem término continua editável — é por ela que a data entra", async ({
    page,
  }) => {
    /*
     * ⚠️ **O ESTADO DEGRADADO MAIS PERIGOSO É O QUE ESCONDE O CONSERTO.** A frase manda informar a
     *    data de término; se a seção degradada levasse o formulário com ela, a pessoa leria a
     *    instrução e não teria onde cumpri-la (`RN-DEG-02`: alerta, nunca bloqueio).
     */
    await irAFichaDaTurma(page, EMAIL, CURSOS.turmaSemJanela);

    await expect(campo(page, "sem-termino")).toBeVisible();
    await expect(page.getByLabel("Término")).toBeVisible();
    await expect(page.getByRole("button", { name: /salvar/i })).toBeVisible();
  });
});
