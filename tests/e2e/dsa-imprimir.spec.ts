/**
 * O DSA impresso, **por clique** (`RF-PDF-01`, `RF-DSA-06`, `FR-036`, `FR-036.1`, `FR-039`,
 * `SC-001`, `SC-011`, `SC-013`, `SC-014`, `SC-015` · spec 013, PR 3).
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA ASSINATURA POR DATA, e ele exigiu SEMEAR DADO** (`T086`). Medido
 * no remoto em 05/10/2026: `responsaveis_curso` tem **uma só** vigência por papel, então **qualquer**
 * semana resolve para a mesma pessoa — o caso de abril e o de julho dariam o **mesmo veredito antes
 * e depois** de a resolução por data existir, que é o que o DoD 8 proíbe chamar de teste. A semente
 * cria **duas** vigências de `elaborador` no curso, e aqui se lê qual venceu pelo nome de guerra.
 *
 * ⚠️ **A CONTAGEM DE PÁGINAS TEM CONTROLE POSITIVO, e sem ele a asserção não vale nada.** Um
 * contador quebrado que devolvesse sempre `1` passaria no `SC-001` com um documento de cinco
 * páginas. O controle imprime o **mesmo** documento em retrato e ampliado, e exige **mais de uma**
 * página — provando que o contador sabe contar acima de um.
 *
 * ⚠️ **`goto` SÓ ONDE O PERCURSO JÁ FOI PROVADO.** O caminho *grade → Imprimir* é exercitado por
 * clique no primeiro caso e na jornada (`dsa-jornada.spec.ts`); os demais vão direto à semana para
 * medir **o papel**, que é o que eles existem para medir.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  ANO,
  ANO_A_FRENTE,
  ASSINANTE_DE_ABRIL,
  ASSINANTE_DE_JULHO,
  ASSINANTE_ENCARREGADO,
  CONTEUDO_A_FRENTE,
  limparDsa,
  SEMANA,
  SEMANA_A_FRENTE,
  SEMANA_DE_JULHO,
  semearDsa,
  TA_A_FRENTE,
  type DsaSemeado,
} from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const DOCUMENTO = '[data-slot="dsa-impresso"]';

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsaimprimir", PROCESSO);
  await criarConta(EMAIL, `USR-DSAI-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/**
 * Quantas páginas tem um PDF do Chromium.
 *
 * ⚠️ **`/Type /Page` CASA COM `/Type /Pages`, E O `[^s]` É O QUE SEPARA OS DOIS.** O nó da árvore é
 * `/Pages` e existe **uma vez** por documento: sem o recorte, toda contagem sairia com uma página a
 * mais — e um documento de uma página passaria por dois.
 */
function paginasDoPdf(pdf: Buffer): number {
  const bytes = pdf.toString("latin1");
  return (bytes.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** Abre a impressão de uma semana, direto. */
async function abrirAImpressao(page: Page, semana: number, ano = ANO): Promise<void> {
  await entrar(page, EMAIL);
  await page.goto(
    `/print/dsa?turma=${encodeURIComponent(SEMEADO.turmaComRelogio)}&semana=${semana}&ano=${ano}`,
  );
  await expect(page.locator(DOCUMENTO)).toBeVisible();
}

test.describe("`RF-PDF-01` · do botão ao papel, por clique", () => {
  test("a grade leva à impressão com os MESMOS parâmetros, e sem casca", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );

    await page.locator('[data-slot="imprimir-dsa"]').click();

    /*
     * ⚠️ **`expect.poll` E NÃO `page.url()` DIRETO — a primeira redação reprovou por isto.** O
     * clique dispara a navegação e **não a espera**: a linha seguinte lia ainda
     * `/turmas/…/dsa`, e a mensagem (*"esperado /print/dsa, recebido /turmas/…"*) se lê como
     * *"o botão não leva ao lugar certo"*, quando o botão estava certo e a medição era cedo demais.
     */
    await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");

    const url = new URL(page.url());
    expect(url.searchParams.get("turma")).toBe(SEMEADO.turmaComRelogio);
    expect(url.searchParams.get("semana")).toBe(String(SEMANA));
    expect(url.searchParams.get("ano")).toBe(String(ANO));

    await expect(page.locator(DOCUMENTO)).toBeVisible();
    /*
     * ⚠️ **SEM CASCA, SEM MENU E SEM FAIXA DE AMBIENTE** — é o contrato da rota: *"a rota é só o
     * documento"*. A faixa existe no HTML (ela vem do layout RAIZ, que um layout aninhado envolve
     * em vez de substituir) e é **escondida pelo CSS desta rota**: o que se mede é a visibilidade,
     * não a ausência do nó.
     */
    await expect(page.locator('[data-slot="casca-do-app"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="navegacao-lateral"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="faixa-de-ambiente"]')).not.toBeVisible();
    /* E nenhum botão: `window.print()` é de quem imprime. */
    await expect(page.locator(`${DOCUMENTO} button`)).toHaveCount(0);
  });

  test("o cabeçalho traz a organização, o Nº e a semana em DD/MM/AAAA", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);
    const documento = page.locator(DOCUMENTO);
    await expect(documento).toContainText("CIAARA");
    await expect(documento).toContainText(
      "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO",
    );
    await expect(documento).toContainText("Detalhe Semanal de Aulas");
    await expect(page.locator('[data-slot="dsa-numero"]')).toContainText("Nº");
    /*
     * ⚠️ **O INTERVALO VAI ATÉ SÁBADO, E ISSO É A `Q-4` FUNCIONANDO — não um erro de conta.** A
     * semente lança um bloco em **11/04**, e a coluna de sábado abre **por haver lançamento nele**,
     * independentemente de `?sabado=`: esconder um fato gravado porque um parâmetro de tela está em
     * `nao` seria esconder o lançamento. A planilha vigente do `C-Ap-HN` tem **oito** sábados
     * lançados (medido), e é esse o caso real.
     */
    await expect(page.locator('[data-slot="dsa-intervalo"]')).toContainText(
      "06/04/2026 a 11/04/2026",
    );
  });
});

test.describe("`SC-001` · cabe em UMA página A4 paisagem", () => {
  test("⚠️ a semana cheia dá 1 página — e o contador sabe contar mais de uma", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);

    const paisagem = await page.pdf({ format: "A4", landscape: true });
    const paginas = paginasDoPdf(paisagem);
    expect(paginas, "não consegui contar as páginas do PDF").toBeGreaterThan(0);
    expect(paginas, "o DSA da semana passou de uma página A4 paisagem").toBe(1);

    /*
     * ⚠️ **O CONTROLE POSITIVO.** O mesmo documento em RETRATO e ampliado **tem** de passar de uma
     * página; sem este caso, um contador que devolvesse sempre `1` aprovaria um DSA de cinco
     * páginas, que é o defeito que o `SC-001` existe para impedir.
     */
    const retrato = await page.pdf({ format: "A4", landscape: false, scale: 2 });
    expect(
      paginasDoPdf(retrato),
      "o contador devolveu 1 até para um documento que não cabe — ele não está medindo",
    ).toBeGreaterThan(1);
  });
});

test.describe("`SC-011` · o bloco que atravessa o almoço sai em DOIS cartões", () => {
  /*
   * ⚠️ **É A CORREÇÃO DO `D-3`, medido 64 vezes no CAHO e 50 no C-Espc-FR**: a planilha imprimia
   * *"09:30 as 13:50"* para 4 TA que atravessam o almoço — um horário contínuo que inclui o
   * intervalo. A semente lança 4 TA a partir do 3º na G45, cujo almoço fica entre o 5º e o 6º: na
   * grade do modelo v4 isso são **dois cartões**, 3 TA de manhã e 1 à tarde, com o almoço entre eles.
   */
  test("o bloco de 4 TA vira dois cartões, um de cada lado do almoço", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);
    const manha = page.locator(
      `${DOCUMENTO} [data-slot="dsa-cartao"][data-partes="2"][data-parte="1"]`,
    );
    const tarde = page.locator(
      `${DOCUMENTO} [data-slot="dsa-cartao"][data-partes="2"][data-parte="2"]`,
    );
    await expect(manha.first()).toBeVisible();
    await expect(manha.first()).toContainText("3 TA");
    await expect(tarde.first()).toContainText("1 TA");

    const almoco = await page.locator(`${DOCUMENTO} .dsa4-almoco`).boundingBox();
    const caixaDaManha = await manha.first().boundingBox();
    const caixaDaTarde = await tarde.first().boundingBox();
    expect(almoco && caixaDaManha && caixaDaTarde, "não consegui medir a grade").toBeTruthy();
    /* O primeiro acaba antes do almoço e o segundo começa depois dele — nunca um cartão só. */
    expect((caixaDaManha?.y ?? 0) + (caixaDaManha?.height ?? 0)).toBeLessThanOrEqual(
      almoco?.y ?? 0,
    );
    expect(caixaDaTarde?.y ?? 0).toBeGreaterThanOrEqual((almoco?.y ?? 0) + (almoco?.height ?? 0));
  });
});

test.describe("a linha fixa do Estudo Individual e o dia de feriado", () => {
  test("cada dia tem o cartão de ESTUDO INDIVIDUAL · EI, sem instrutor", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);
    const linhasDeEi = page.locator(`${DOCUMENTO} [data-slot="dsa-cartao"][data-tipo="estudo"]`);
    /*
     * ⚠️ **SEIS DIAS (o sábado abre por ter lançamento, `Q-4`) MENOS O FERIADO DE DIA INTEIRO = 5.**
     * A quarta-feira é feriado `dia_inteiro` e sai como **uma** faixa com a descrição, **sem** linha
     * de Estudo Individual: não há estudo individual em dia que não houve expediente.
     */
    await expect(linhasDeEi).toHaveCount(5);
    await expect(linhasDeEi.first()).toContainText("ESTUDO INDIVIDUAL");
    await expect(linhasDeEi.first().locator(".dsa-te")).toHaveText("EI");
  });

  test("`Q-16` · o dia de feriado de dia inteiro sai como UMA faixa com a descrição", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    const bloqueado = page.locator('[data-slot="dsa-dia-bloqueado"]');
    await expect(bloqueado).toHaveCount(1);
    await expect(bloqueado).toContainText("Feriado de dia inteiro");
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA** (decisão de Bernardo Villas Boas, 06/10/2026). A semente lança uma
   * aula na quarta, que é feriado de dia inteiro. Até esta correção o dia saía como a faixa do
   * bloqueio **e mais nada**: a aula existia no banco, contava na CH e não estava no papel — foi o
   * que aconteceu com o Estudo Individual de 02/10 na carga piloto do `C-Exp-Obs-ME 2026`.
   */
  test("⚠️ o dia bloqueado imprime TAMBÉM o que foi lançado nele, sobre a faixa", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    const noFeriado = page.locator(
      `${DOCUMENTO} [data-slot="dsa-cartao"][data-dia-bloqueado="sim"]`,
    );
    await expect(noFeriado).toHaveCount(1);
    await expect(noFeriado).toContainText("Aula no dia do feriado");
    /* ⚠️ E a linha FIXA de Estudo Individual continua fora do dia sem expediente. */
    await expect(noFeriado.locator(".dsa-te")).not.toHaveText("EI");
  });
});

test.describe("⚠️ `RN-CRONOS-03` · a CH cumprida do rodapé é a ACUMULADA ATÉ A SEMANA", () => {
  /** A «CH. cumprida» que o rodapé de uma semana imprime para a disciplina comum da semente. */
  async function cumpridaNoRodape(page: Page, semana: number, ano: number): Promise<number> {
    await abrirAImpressao(page, semana, ano);
    const linha = page.locator('[data-slot="dsa-quadro-de-ch"] tbody tr').filter({
      has: page.locator("td:first-child", {
        hasText: new RegExp(`^${SEMEADO.codDisciplina}$`),
      }),
    });
    await expect(linha).toHaveCount(1);
    return Number(await linha.locator("td").nth(3).innerText());
  }

  /*
   * ⚠️ **O CASO QUE DISCRIMINA** — medido na carga piloto do `C-Exp-Obs-ME 2026` em 06/10/2026: o
   * rodapé imprimia o TOTAL da turma em toda semana (50 e 65 nas quatro), e o painel da grade, na
   * mesma semana, dizia 18 e 15. A semente tem uma aula numa semana QUE AINDA NÃO CHEGOU: o DSA de
   * abril não pode contá-la, e o da semana dela tem de contar.
   */
  test("o DSA de abril não conta a aula lançada para uma semana posterior", async ({ page }) => {
    const emAbril = await cumpridaNoRodape(page, SEMANA, ANO);
    const naSemanaAFrente = await cumpridaNoRodape(page, SEMANA_A_FRENTE, ANO_A_FRENTE);
    expect(emAbril).toBeGreaterThan(0);
    expect(naSemanaAFrente - emAbril).toBeGreaterThanOrEqual(TA_A_FRENTE);
  });
});

test.describe("⚠️ `FR-036` · as assinaturas são as da DATA DA SEMANA — o critério 3", () => {
  test("o rodapé sai PREENCHIDO — o defeito histórico não reaparece (critério 2)", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    const assinaturas = page.locator('[data-slot="dsa-assinaturas"]');
    await expect(assinaturas).toContainText(ASSINANTE_ENCARREGADO);
    await expect(assinaturas).toContainText("Encarregado da Div. de Adm. Academica");
    /* ⚠️ E o posto sai POR EXTENSO (item 7 de 08/10/2026): a semente grava `CC`. */
    await expect(
      page.locator('[data-slot="dsa-assinatura-direita"] [data-slot="dsa-assinatura-posto"]'),
    ).toHaveText("Capitão de Corveta");
  });

  test("⚠️ O CASO QUE DISCRIMINA · abril traz quem assinava em abril; julho, quem assina em julho", async ({
    page,
  }) => {
    const esquerda = '[data-slot="dsa-assinatura-esquerda"]';

    await abrirAImpressao(page, SEMANA);
    await expect(page.locator(esquerda)).toContainText(ASSINANTE_DE_ABRIL);
    await expect(page.locator(esquerda)).not.toContainText(ASSINANTE_DE_JULHO);

    await abrirAImpressao(page, SEMANA_DE_JULHO);
    await expect(page.locator(esquerda)).toContainText(ASSINANTE_DE_JULHO);
    await expect(page.locator(esquerda)).not.toContainText(ASSINANTE_DE_ABRIL);
  });

  test("sem responsável vigente, a linha sai EM BRANCO — nunca um erro", async ({ page }) => {
    /*
     * ⚠️ 2025 é **antes** das duas vigências semeadas e antes das duas reais: nenhuma resolve. O
     * `comment on column responsaveis_curso.vigente_de` diz por que isto é honesto — *"naquela data
     * não havia responsável cadastrado"*.
     */
    await abrirAImpressao(page, 10, 2025);
    const esquerda = page.locator('[data-slot="dsa-assinatura-esquerda"]');
    await expect(esquerda).toBeVisible();
    await expect(esquerda).not.toContainText(ASSINANTE_DE_ABRIL);
    await expect(esquerda).not.toContainText(ASSINANTE_DE_JULHO);
    /* A linha onde se assina continua existindo — é ela que se assina à mão. */
    await expect(esquerda.locator(".dsa-rubrica")).toBeVisible();
  });
});

/**
 * ⚠️ **ITEM 7 DAS CORREÇÕES DE 08/10/2026** *(decisão de Bernardo Villas Boas)*: *"no campo de
 * assinatura do DSA (tela e /print/dsa), o posto/graduação sai POR EXTENSO, não abreviado […]; o
 * quadro entre parênteses continua. Só a assinatura muda; a coluna de instrutor da grade continua
 * como está."*
 *
 * ⚠️ **O PAR QUE DISCRIMINA É A MESMA SIGLA NOS DOIS LUGARES DA MESMA PÁGINA.** O instrutor da
 * semente é `1ºTEN`, e o Auxiliar de julho é `1ºTen` com o quadro `(RM2-T)`: o rodapé tem de dizer
 * `Primeiro-Tenente (RM2-T)` e o cartão, `1ºTEN`. A troca aplicada no lugar errado — no nome do
 * instrutor, ou em lugar nenhum — reprova uma das duas metades.
 *
 * ⚠️ **TUDO POR CLIQUE, e a semana é a da aula lançada à frente por isso**: é a única com aula do
 * instrutor que se alcança a partir de hoje sem dezenas de cliques — duas vezes *Próxima semana*.
 */
test.describe("⚠️ item 7 · a ASSINATURA traz o posto POR EXTENSO; a coluna de instrutor, a sigla", () => {
  const POSTO_DA_ESQUERDA =
    '[data-slot="dsa-assinatura-esquerda"] [data-slot="dsa-assinatura-posto"]';
  const POSTO_DA_DIREITA =
    '[data-slot="dsa-assinatura-direita"] [data-slot="dsa-assinatura-posto"]';

  test("ficha → Abrir o DSA → duas semanas à frente → tela → Imprimir → papel", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();

    /*
     * ⚠️ **ESPERAR A SEMANA MUDAR ANTES DO SEGUNDO CLIQUE**: o botão navega e não espera — clicado de
     * novo cedo demais, ele leva à MESMA semana seguinte, e o caso abriria a semana errada.
     */
    const semanaNaTela = page.locator('[data-slot="semana-atual"]');
    const deHoje = await semanaNaTela.innerText();
    await page.locator('[data-acao="semana-proxima"]').click();
    await expect(semanaNaTela).not.toHaveText(deHoje);
    await page.locator('[data-acao="semana-proxima"]').click();
    await expect(semanaNaTela).toHaveText(`semana ${SEMANA_A_FRENTE} de ${ANO_A_FRENTE}`);

    /* ── 1. Na tela: a grade com a sigla, o rodapé por extenso ───────────────────────────── */
    const cartaoNaTela = page
      .locator('[data-slot="grade-da-semana"] [data-slot="dsa-cartao"]')
      .filter({ hasText: CONTEUDO_A_FRENTE });
    await expect(cartaoNaTela).toHaveCount(1);
    await expect(cartaoNaTela).toContainText("1ºTEN");
    await expect(cartaoNaTela).not.toContainText("Primeiro-Tenente");

    const assinaturasNaTela = page.locator('[data-slot="tela-assinaturas"]');
    await expect(assinaturasNaTela).toContainText("Primeiro-Tenente (RM2-T) JOAQUIM DE JULHO");
    await expect(assinaturasNaTela).toContainText("Capitão de Corveta ERNESTO ENCARREGADO");
    await expect(assinaturasNaTela).not.toContainText(/1º\s*ten/i);
    await expect(assinaturasNaTela).not.toContainText(/\bCC\b/);

    /* ── 2. No papel, pelo botão Imprimir ─────────────────────────────────────────────────── */
    await page.locator('[data-slot="imprimir-dsa"]').click();
    /* ⚠️ A tela também tem cartões: sem esperar a URL, as asserções seguintes leriam a tela. */
    await page.waitForURL(/\/print\/dsa/);
    expect(new URL(page.url()).searchParams.get("semana")).toBe(String(SEMANA_A_FRENTE));
    const documento = page.locator(DOCUMENTO);
    await expect(documento).toBeVisible();

    await expect(page.locator(POSTO_DA_ESQUERDA)).toHaveText("Primeiro-Tenente (RM2-T)");
    await expect(page.locator(POSTO_DA_DIREITA)).toHaveText("Capitão de Corveta");

    const cartaoNoPapel = documento
      .locator('[data-slot="dsa-cartao"]')
      .filter({ hasText: CONTEUDO_A_FRENTE });
    await expect(cartaoNoPapel).toHaveCount(1);
    await expect(cartaoNoPapel).toContainText("1ºTEN");
    await expect(cartaoNoPapel).not.toContainText("Primeiro-Tenente");
  });

  test("sem quadro cadastrado, nada entre parênteses — abril sai só `Primeiro-Tenente`", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    await expect(page.locator(POSTO_DA_ESQUERDA)).toHaveText("Primeiro-Tenente");
  });
});

test.describe("`SC-014` · o rodapé traz só o que aparece na semana", () => {
  test("a tabela de CH lista a disciplina da semana, e a legenda só as siglas usadas", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    const quadro = page.locator('[data-slot="dsa-quadro-de-ch"]');
    await expect(quadro).toBeVisible();
    await expect(quadro).toContainText(SEMEADO.codDisciplina);
    await expect(quadro).toContainText("CH. prevista");

    /* ⚠️ A disciplina de TFM existe no curso e **não** é lançada nesta semana: não entra. */
    await expect(quadro).not.toContainText(SEMEADO.codDisciplinaTfm);

    const legenda = page.locator('[data-slot="dsa-legenda"]');
    await expect(legenda).toContainText("TÉCNICAS DE ENSINO");
    await expect(legenda).toContainText("EI —");
  });

  test("a nota do Estudo Individual e a linha de OBSERVAÇÕES, em branco", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);
    await expect(page.locator('[data-slot="dsa-nota-do-ei"]')).toContainText(
      "É FACULTADO AO ALUNO PERMANECER A BORDO PARA ESTUDO INDIVIDUAL.",
    );
    /*
     * ⚠️ **NENHUM DOS PDFs MEDIDOS TEM ESTE CAMPO, e o `RF-DSA-06` o exige LITERALMENTE** — decisão
     * de Bernardo (`H8`, opção **a**): a linha sai **vazia**, para escrever à mão.
     */
    const observacoes = page.locator('[data-slot="dsa-observacoes"]');
    await expect(observacoes).toContainText("OBSERVAÇÕES:");
    await expect(observacoes.locator(".dsa-observacoes")).toHaveText("");
  });

  test("o `Gerado em` sai com data e hora", async ({ page }) => {
    await abrirAImpressao(page, SEMANA);
    await expect(page.locator('[data-slot="dsa-gerado-em"]')).toContainText(
      /Gerado em: \d{2}\/\d{2}\/\d{4}/,
    );
  });
});

test.describe("⚠️ `SC-013` · nenhuma cadeia técnica chega ao papel", () => {
  test("o documento não tem `undefined`, `null`, `NaN`, `#REF!` nem identificador", async ({
    page,
  }) => {
    await abrirAImpressao(page, SEMANA);
    /*
     * ⚠️ **A VARREDURA É DO TEXTO VISÍVEL, não do HTML.** `page.content()` traz `data-slot`,
     * `className` e os identificadores de chave de render — e eles **não** são impressos. Medir o
     * HTML acusaria o que está certo, que é o modo de falha da regra 9.1.1 pelo avesso.
     */
    const texto = (await page.locator(DOCUMENTO).innerText()).toLowerCase();
    for (const proibido of ["undefined", "null", "nan", "#ref!", "#n/a", "invalid date"]) {
      expect(texto, `o papel saiu com "${proibido}"`).not.toContain(proibido);
    }
    /* Nenhum `uuid` — o formato de 8-4-4-4-12. */
    expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });
});

test.describe("`SC-015` · a semana sem lançamento imprime, com o aviso NA TELA antes", () => {
  test("o aviso aparece ao lado do botão, e o papel sai mesmo assim", async ({ page }) => {
    /* A semana 40 de 2026 não tem lançamento nenhum na semente. */
    await entrar(page, EMAIL);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=40&ano=${ANO}`,
    );
    const avisos = page.locator('[data-slot="avisos-da-impressao"]');
    await expect(avisos).toBeVisible();
    await expect(avisos).toContainText("Nenhum Tempo de Aula está lançado nesta semana");
    /* ⚠️ **O AVISO NÃO BLOQUEIA** (`RN-DEG-02`): o botão continua clicável. */
    await page.locator('[data-slot="imprimir-dsa"]').click();
    /* ⚠️ A tela também mostra o documento: só a URL prova que se chegou ao papel. */
    await page.waitForURL(/\/print\/dsa/);
    await expect(page.locator(DOCUMENTO)).toBeVisible();
    /* E o papel sai com os dias e só os cartões de Estudo Individual. */
    await expect(
      page.locator(`${DOCUMENTO} [data-slot="dsa-cartao"][data-tipo="estudo"]`).first(),
    ).toBeVisible();
  });

  test("⚠️ e o aviso NÃO vai para o papel — ele é da tela", async ({ page }) => {
    await abrirAImpressao(page, 40);
    await expect(page.locator('[data-slot="avisos-da-impressao"]')).toHaveCount(0);
    const texto = await page.locator(DOCUMENTO).innerText();
    expect(texto).not.toContain("Nenhum Tempo de Aula");
  });
});

test.describe("o porteiro da rota de impressão", () => {
  test("sem `?turma=`, `not-found` — e não uma folha em branco", async ({ page }) => {
    await entrar(page, EMAIL);
    await page.goto("/print/dsa");

    /*
     * ⚠️ **MEDIDO: O `notFound()` DESTA ROTA CHEGA COM HTTP 200, e isso NÃO é defeito.** A primeira
     * redação deste caso exigia `404` e reprovou com `200`. A causa é o `loading.tsx` do segmento:
     * com ele, o Next **começa a transmitir** a resposta antes de o componente terminar, o cabeçalho
     * já foi enviado quando o `notFound()` dispara, e a tela de *não encontrado* vem no corpo
     * transmitido. ⚠️ **O que o requisito pede é que NÃO SAIA DOCUMENTO** — e é isso que se mede:
     * conferir o código de situação mediria a transmissão, não o porteiro.
     */
    await expect(page.locator(DOCUMENTO)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });
});
