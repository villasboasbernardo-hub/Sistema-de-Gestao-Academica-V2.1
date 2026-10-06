/**
 * Situação por disciplina, quadro por unidade e o **lançado à frente** (`RF-DSA-05`,
 * `RN-CRONOS-03`, `Q-2`, `FR-028.1`, `FR-029` · spec 013, PR 5).
 *
 * ⚠️ **DOIS CASOS DISCRIMINAM, e sem eles a implementação errada passaria:**
 *   · **a mesma disciplina em DUAS semanas** — na 10 ela está *Aguardando início* com acumulada
 *     **0**, e na 15 ela já acumulou. Medir uma semana só não distingue *"acumula até a semana
 *     selecionada"* (`RN-CRONOS-03`) de *"acumula tudo o que existe"*;
 *   · **conflitou VENCE concluída** — na semana 15 a disciplina tem conflito e sai *Conflitou*; numa
 *     semana sem conflito marcado, a **mesma** disciplina com o **mesmo** acumulado sai *Em
 *     andamento* ou *Concluída*. Sem o par, a precedência do `RF-DSA-05` não se observa.
 *
 * ⚠️ **E O «LANÇADO À FRENTE» É O ÚNICO CASO DESTA SPEC COM DATA RELATIVA A HOJE, por necessidade:**
 * o veredito dele **é** uma comparação com hoje (`data > hoje`), e numa data fixa de abril de 2026
 * ele seria `false` para sempre — o caso daria o mesmo veredito antes e depois da marca existir.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  ANO,
  ANO_A_FRENTE,
  limparDsa,
  SEMANA,
  SEMANA_A_FRENTE,
  semearDsa,
  TA_A_FRENTE,
  type DsaSemeado,
} from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const PAINEL = '[data-slot="painel-de-situacao"]';
const POR_DISCIPLINA = '[data-slot="quadro-por-disciplina"]';

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsasituacao", PROCESSO);
  await criarConta(EMAIL, `USR-DSAS-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Abre a semana pedida da turma com relógio. */
async function abrirSemana(page: Page, semana: number, ano = ANO): Promise<void> {
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${semana}&ano=${ano}`,
  );
  await expect(page.locator(PAINEL)).toBeVisible();
}

/** A linha do quadro de uma disciplina, pelo código. */
function linhaDaDisciplina(page: Page, codigo: string) {
  return page.locator(`${POR_DISCIPLINA} tr[data-disciplina="${codigo}"]`);
}

test.describe("`RF-DSA-05` · o painel chega por clique, junto com a grade", () => {
  test("da ficha ao DSA, e o painel está lá com os dois quadros", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    await page.locator('[data-slot="abrir-o-dsa"]').click();

    const painel = page.locator(PAINEL);
    await expect(painel).toBeVisible();
    await expect(painel).toContainText("Situação por disciplina");
    await expect(painel).toContainText("Por unidade de ensino");
    /* ⚠️ O corte é DITO na tela: sem a frase, o acumulado de uma semana passada se leria como o de hoje. */
    await expect(painel).toContainText("Carga horária acumulada até a semana de");
  });
});

test.describe("⚠️ `RN-CRONOS-03` · o acumulado é até a SEMANA SELECIONADA", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA.** A semente lança em abril (semana 15). Na semana **10** a mesma
   * disciplina não tem nada até o corte — e é essa a diferença entre *"acumula até a semana"* e
   * *"acumula tudo"*, que uma única medição não separa.
   */
  test("na semana 10 a disciplina está Aguardando início; na 15 ela já acumulou", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    await abrirSemana(page, 10);
    const antes = linhaDaDisciplina(page, SEMEADO.codDisciplina);
    await expect(antes).toContainText("Aguardando início");

    await abrirSemana(page, SEMANA);
    const depois = linhaDaDisciplina(page, SEMEADO.codDisciplina);
    await expect(depois).not.toContainText("Aguardando início");
  });

  test("disciplina sem lançamento nenhum fica Aguardando início em qualquer semana", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);
    /* A disciplina de TFM existe no curso e a semente não lança nela. */
    await expect(linhaDaDisciplina(page, SEMEADO.codDisciplinaTfm)).toContainText(
      "Aguardando início",
    );
  });
});

test.describe("⚠️ `RF-DSA-05` · conflitou VENCE as outras situações", () => {
  /*
   * ⚠️ **O PAR QUE PROVA A PRECEDÊNCIA.** Na semana 15 a disciplina tem um bloco em conflito com
   * outra turma (a semente cria a sobreposição), e a situação sai **Conflitou**. Numa semana sem
   * conflito **marcado** — a 16, vazia —, a **mesma** disciplina, com o **mesmo** acumulado, sai
   * com outra situação. Esconder conflito atrás de *"Concluída"* é o pior dos dois erros.
   */
  test("na semana com conflito sai Conflitou; na semana sem conflito, não", async ({ page }) => {
    await entrar(page, EMAIL);

    await abrirSemana(page, SEMANA);
    await expect(linhaDaDisciplina(page, SEMEADO.codDisciplina)).toContainText("Conflitou");

    await abrirSemana(page, SEMANA + 1);
    await expect(linhaDaDisciplina(page, SEMEADO.codDisciplina)).not.toContainText("Conflitou");
  });
});

test.describe("`FR-029` · o quadro por unidade de ensino", () => {
  test("traz lançada, prevista e resta de cada unidade", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);
    const porUnidade = page.locator('[data-slot="quadro-por-unidade"]');
    await expect(porUnidade).toBeVisible();
    await expect(porUnidade).toContainText("Lançada");
    await expect(porUnidade).toContainText("Prevista");
    await expect(porUnidade).toContainText("Resta");
    /* ⚠️ Os três números por UE são o `P-3` da planilha, que o operador acompanha no grão de UE. */
    await expect(porUnidade.locator("tr[data-unidade]").first()).toBeVisible();
  });
});

test.describe("⚠️ `Q-2` e `FR-028.1` · o lançado à frente CONTA, e é dito", () => {
  /*
   * ⚠️ **A DECISÃO É CONTAR, e a marca é o que torna isso honesto.** O `D-5` da planilha é o avesso:
   * *"a CH cumprida é COUNTIF sobre a aba inteira — conta semana futura já planejada como
   * cumprida"*. Aqui o número é o mesmo **e** a tela declara quanto dele ainda não aconteceu.
   */
  test("o painel marca os TA lançados à frente, com o número", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA_A_FRENTE, ANO_A_FRENTE);

    const marca = page.locator('[data-slot="lancado-a-frente"]').first();
    await expect(marca).toBeVisible();
    /* ⚠️ O número vai no ATRIBUTO, não só no texto (`RNF-USA-05`). */
    await expect(marca).toHaveAttribute("data-ta", String(TA_A_FRENTE));
    await expect(marca).toContainText("lançado(s) à frente");
  });

  test("a grade também marca o bloco, e o PAPEL diz quantos TA são", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA_A_FRENTE, ANO_A_FRENTE);
    /* A marca na célula vem do PR 1; aqui o que se confere é que ela continua. */
    await expect(page.locator('[data-slot="grade-alocacao"]')).toContainText("lançado à frente");

    await page.locator('[data-slot="imprimir-dsa"]').click();
    const documento = page.locator('[data-slot="dsa-impresso"]');
    await expect(documento).toBeVisible();
    const aFrente = page.locator('[data-slot="dsa-a-frente"]');
    await expect(aFrente).toBeVisible();
    await expect(aFrente).toContainText("ainda não chegaram");
  });

  test("na semana só de datas passadas, a marca NÃO aparece — ela não é decorativa", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);
    await expect(page.locator('[data-slot="lancado-a-frente"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="grade-alocacao"]')).not.toContainText(
      "lançado à frente",
    );
  });
});
