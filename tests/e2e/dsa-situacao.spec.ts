/**
 * Situação por disciplina, a **cascata das unidades de ensino** e o **lançado à frente**
 * (`RF-DSA-05`, `RN-CRONOS-03`, `Q-2`, `FR-018`, `FR-028.1` · spec 013, PR 5, e item 3 do comando de
 * correções do DSA de 08/10/2026).
 *
 * ⚠️ **O DESENHO MUDOU EM 08/10/2026** *(decisão de Bernardo Villas Boas)*: a situação saiu do lado da
 * grade e foi para **baixo dela, em largura total**; cada disciplina é uma linha que **abre em
 * cascata** as UEs dela, e o quadro *"Por unidade de ensino"* separado **deixou de existir**. Os casos
 * do PR 5 continuam valendo sobre a linha da disciplina; os novos chegam às UEs **clicando**.
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
const GRADE = '[data-slot="grade-da-semana"][data-modelo="v4"]';

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

/** Abre a semana pedida da turma com relógio — o ponto de partida, não o percurso. */
async function abrirSemana(page: Page, semana: number, ano = ANO): Promise<void> {
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${semana}&ano=${ano}`,
  );
  await expect(page.locator(PAINEL)).toBeVisible();
}

/**
 * A linha de uma disciplina na tabela da situação, pelo código.
 *
 * ⚠️ **O `tr` É DA TABELA ÚNICA, e por isso o marcador mora DENTRO dele** (`data-disciplina`, na célula
 * do nome) — quem desenha a linha é `tabela-densa.tsx`. ⚠️ E o `:has()` casa **só** a linha da
 * disciplina: a linha de detalhe e as das UEs, que também são `tr` dentro do quadro, não levam esse
 * marcador — sem isso, a linha aberta casaria duas vezes e o modo estrito reprovaria.
 */
function linhaDaDisciplina(page: Page, codigo: string) {
  return page.locator(`${POR_DISCIPLINA} tr:has([data-disciplina="${codigo}"])`);
}

/** A cascata de uma disciplina — só existe com a linha aberta. */
function cascataDa(page: Page, codigo: string) {
  return page.locator(`${PAINEL} [data-slot="ues-da-disciplina"][data-unidades-de="${codigo}"]`);
}

test.describe("`RF-DSA-05` · o painel chega por clique, junto com a grade", () => {
  test("da ficha ao DSA, e o painel está lá, sem o quadro separado por unidade", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    await page.locator('[data-slot="abrir-o-dsa"]').click();

    const painel = page.locator(PAINEL);
    await expect(painel).toBeVisible();
    await expect(painel).toContainText("Situação por disciplina");
    /* ⚠️ O corte é DITO na tela: sem a frase, o acumulado de uma semana passada se leria como o de hoje. */
    await expect(painel).toContainText("Carga horária acumulada até a semana de");
    /* ⚠️ O quadro «Por unidade de ensino» SAIU (08/10/2026): as UEs vivem dentro da cascata. */
    await expect(painel.getByRole("heading", { name: "Por unidade de ensino" })).toHaveCount(0);
  });
});

test.describe("item 3 do comando de 08/10/2026 · o painel fica ABAIXO da grade, em largura total", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA O DESENHO NOVO DO ANTIGO** (DoD 8). O viewport do projeto é o *Desktop
   * Chrome*, 1280 px — exatamente o ponto `xl` em que o desenho antigo punha o painel AO LADO, com
   * 384 px (`xl:w-96`). Ali, o topo do painel ficava na altura do cabeçalho da semana e a largura era
   * uma fração da barra de impressão: as duas asserções abaixo reprovam o desenho antigo e passam no
   * novo.
   * ⚠️ **A RÉGUA DA LARGURA É A BARRA DE IMPRESSÃO**, que é filha direta da página e ocupa a coluna
   * inteira: comparar com o viewport dependeria da largura da lateral, que é preferência de quem olha
   * (`D-NAV-2`).
   */
  test("a situação começa depois do fim da grade e tem a largura da página", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);

    const grade = await page.locator(GRADE).boundingBox();
    const painel = await page.locator(PAINEL).boundingBox();
    const barra = await page.locator('[data-slot="barra-de-impressao"]').boundingBox();
    expect(grade, "a grade da semana não está na tela").not.toBeNull();
    expect(painel, "o painel de situação não está na tela").not.toBeNull();
    expect(barra, "a barra de impressão não está na tela").not.toBeNull();
    if (grade === null || painel === null || barra === null) return;

    expect(painel.y, "o painel não está ABAIXO da grade").toBeGreaterThanOrEqual(
      grade.y + grade.height - 1,
    );
    expect(
      Math.abs(painel.width - barra.width),
      `o painel tem ${painel.width}px e a página ${barra.width}px: ele não está em largura total`,
    ).toBeLessThanOrEqual(2);
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

test.describe("⚠️ `FR-018` · as UEs vivem NA CASCATA da disciplina, e chega-se a elas CLICANDO", () => {
  /*
   * ⚠️ **OS QUATRO NÚMEROS SAEM DA SEMENTE, e a conta está aqui para ser conferida** (regra 9.2 —
   *    artefato: `tests/e2e/dsa-de-teste.ts`):
   *   · **prevista 20** — o `ch_prevista_tempos` da UE 1 de `codDisciplina`;
   *   · **lançada 9** — as aulas daquela UE na turma com relógio ATÉ O FIM DA SEMANA 15: `A1` (4) +
   *     `A2` (2) + `A3` (2) + `A4` (1). O `AFRENTE` (2, duas semanas depois de hoje) fica de fora do
   *     corte; a `SEMTA` tem tempo NULO, a `HERDSEMUE` não tem UE, e as avaliações não apontam UE;
   *   · **resta 11** — 20 − 9; **situação *Em andamento*** — lançou, e menos que a CH (`P-3`).
   * ⚠️ **A LANÇADA DA UE TEM O MESMO CORTE DA DISCIPLINA: o fim da semana aberta.** A primeira versão
   *    da cascata usava o total da turma (`vw_unidades_ensino_execucao`, sem data), e dava **11**.
   */
  test("clicar na disciplina abre as UEs com prevista, lançada, resta e situação", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);

    const linha = linhaDaDisciplina(page, SEMEADO.codDisciplina);
    const cascata = cascataDa(page, SEMEADO.codDisciplina);

    /* ⚠️ Fechada, a cascata não existe — e nenhuma UE aparece solta no painel: o quadro separado saiu. */
    await expect(linha).toHaveAttribute("aria-expanded", "false");
    await expect(cascata).toHaveCount(0);
    await expect(page.locator(`${PAINEL} tr[data-unidade]`)).toHaveCount(0);

    await linha.locator("[data-disciplina]").click();

    await expect(linha).toHaveAttribute("aria-expanded", "true");
    await expect(cascata).toBeVisible();
    const ue1 = cascata.locator('tr[data-unidade="1"]');
    /* ⚠️ Os números vão no ATRIBUTO, não só no texto (`RNF-USA-05`). */
    await expect(ue1).toHaveAttribute("data-prevista", "20");
    await expect(ue1).toHaveAttribute("data-lancada", "9");
    await expect(ue1).toHaveAttribute("data-restante", "11");
    await expect(ue1).toHaveAttribute("data-situacao", "em_andamento");
    await expect(ue1).toContainText("Navegação costeira");
    await expect(ue1).toContainText("Em andamento");
    /* ⚠️ O corte da UE é DITO: é o mesmo da linha de cima. */
    await expect(cascata).toContainText("acumuladas até a mesma semana");
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA A LEITURA DAS UNIDADES** (medido no catálogo em 08/10/2026): a lista
   * vinha de `vw_unidades_ensino_execucao` filtrada pela turma, e a view agrupa por `r.turma_id` de um
   * `LEFT JOIN` — a UE que a turma não deu saía com `turma_id` nulo e era descartada. A de TFM da
   * semente nunca tem aula: com a leitura antiga a cascata dela dizia *"sem unidades"*.
   */
  test("⚠️ a UE que a turma AINDA NÃO DEU aparece, aguardando início", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);

    const linha = linhaDaDisciplina(page, SEMEADO.codDisciplinaTfm);
    await linha.locator("[data-disciplina]").click();
    const cascata = cascataDa(page, SEMEADO.codDisciplinaTfm);
    await expect(cascata).toBeVisible();
    await expect(cascata.locator('[data-slot="sem-unidades"]')).toHaveCount(0);
    const ue1 = cascata.locator('tr[data-unidade="1"]');
    await expect(ue1).toHaveAttribute("data-lancada", "0");
    await expect(ue1).toHaveAttribute("data-restante", "20");
    await expect(ue1).toHaveAttribute("data-situacao", "aguardando_inicio");
  });

  test("⚠️ com ENTER também: a mesma tecla fecha e reabre a cascata", async ({ page }) => {
    await entrar(page, EMAIL);
    await abrirSemana(page, SEMANA);

    const linha = linhaDaDisciplina(page, SEMEADO.codDisciplina);
    const cascata = cascataDa(page, SEMEADO.codDisciplina);

    /*
     * O clique abre **e** deixa o foco na célula — é a parada da grade de teclado (`ListaNavegavel`).
     * Dali em diante, só teclado: é o caminho de quem não usa mouse (`RNF-USA-06`).
     */
    await linha.locator("[data-disciplina]").click();
    await expect(cascata).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(cascata).toHaveCount(0);
    await expect(linha).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(cascata).toBeVisible();
    await expect(cascata.locator('tr[data-unidade="1"]')).toHaveAttribute("data-lancada", "9");
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
