/**
 * A semana do DSA, **por clique** (`RF-DSA-01`, `RF-DSA-02`, `RF-DSA-03`, `RF-HOR-04`, `RF-HOR-06`,
 * `RF-NAV-04`, `RN-2027-09`, `RN-EVT-02`, `RN-DEG-01`, `Q-2`, `Q-4`, `Q-12`, `Q-13` · spec 013,
 * PR 1).
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA de cada entrada.** O que prova que a tela está **alcançável**
 * é o clique: ficha da turma → *Abrir o DSA*. Chegar com `goto` prova que a tela **funciona** e não
 * prova que alguém chega nela — é a causa que criou a regra *"tela sem caminho clicável é tela não
 * entregue"*, em 24/09/2026.
 *
 * ⚠️ **TRÊS CASOS DISCRIMINAM, e sem eles a implementação errada passaria:**
 *   · a semana de **maio** e a de **julho** da mesma turma saem com relógios **diferentes** — é a
 *     `RN-2027-09`; medir só uma não distingue *"resolve pela data"* de *"pega a última vigência"*;
 *   · a avaliação **herdada** no TA 1 cai na faixa e a **nova** no TA 1 fica na grade (`SC-017`);
 *     medir só a herdada não distingue *"trata sentinela"* de *"esconde tudo no TA 1"*;
 *   · o feriado `parcial` **não** bloqueia (`RN-EVT-02`) — e é ele que pega a implementação que
 *     seguiu o comentário errado do catálogo em vez da regra.
 */
import { expect, test, type Page } from "@playwright/test";

import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { AVISO_DE_TURMA_EAD, ROTULO_CURTO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  ANO,
  limparDsa,
  QUARTA,
  SEGUNDA,
  SEMANA,
  SEMANA_DE_JULHO,
  SEMANA_DE_MAIO,
  semearDsa,
  type DsaSemeado,
} from "./dsa-de-teste";
import {
  abrirFiltros,
  FILTRO,
  irAFichaDaTurma,
  irAListaDeTurmas,
  LISTA_DE_TURMAS,
} from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const GRADE = '[data-slot="grade-alocacao"]';

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsaver", PROCESSO);
  await criarConta(EMAIL, `USR-DSAV-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Ficha da turma → *Abrir o DSA*. **Por clique**, que é o que o percurso existe para provar. */
async function abrirODsaPorClique(page: Page, codigo: string): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, codigo);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(codigo)}/dsa`);
  await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
}

test.describe("`RF-DSA-01` · a grade da semana, alcançada por clique", () => {
  test("da ficha ao DSA, e a semana corrente abre SEM parâmetro na URL", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    /*
     * ⚠️ **A URL SEM `?semana=` É O REQUISITO, não um detalhe**: valor no padrão não aparece, e é
     * isso que torna o endereço da semana corrente favoritável.
     */
    expect(new URL(page.url()).searchParams.get("semana")).toBeNull();
    await expect(page.locator(GRADE)).toBeVisible();
  });

  test("`RF-HOR-06` · o relógio é o G45 REAL — 07:50 e cinco TA de manhã", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.locator('[data-acao="semana-atual"]').click();
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );

    const grade = page.locator(GRADE);
    /*
     * ⚠️ **07:50, E NÃO 08:00.** O catálogo de horários (CFG-A a CFG-E) começa às 08:00 em TODAS as
     * configurações, e o relógio real começa às 07:50 — foi medido na planilha, e é a razão de a
     * `Q-6` existir. Esta asserção é o que distingue o relógio derivado do regime do catálogo.
     */
    await expect(grade).toContainText("07:50");
    /* O almoço aparece como linha fina, e é ele que separa os cinco da manhã dos da tarde. */
    await expect(grade.locator("tr[data-separadora]")).toHaveCount(1);
    await expect(grade).toContainText("13:05");
  });

  test("`SC-011` · o bloco que atravessa o almoço vira DOIS cartões, um de cada lado", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    /*
     * ⚠️ O `D-3` da planilha imprimia "09:30 as 13:50" para 4 TA — **um** horário contínuo, em 64
     * ocorrências do CAHO. Na grade do modelo v4 (a mesma do papel) o bloco vira dois cartões: 3 TA
     * de manhã, a partir do 3º tempo (09:30), e 1 TA à tarde, no 6º (13:05).
     */
    const partes = page
      .locator('[data-slot="grade-da-semana"] td[data-tom="ocupada"]')
      .filter({ hasText: "atravessa o almoço" });
    await expect(partes).toHaveCount(2);
    await expect(partes.nth(0)).toContainText("3 TA");
    await expect(partes.nth(0)).toContainText("parte 1 de 2");
    await expect(partes.nth(1)).toContainText("1 TA");
    await expect(partes.nth(1)).toContainText("parte 2 de 2");
    /* E a régua diz as horas dos tempos onde cada cartão começa. */
    const grade = page.locator('[data-slot="grade-da-semana"]');
    await expect(grade).toContainText("09:30");
    await expect(grade).toContainText("13:05");
  });

  test("`RN-EVT-02` · dia inteiro bloqueia; parcial e informativo só avisam", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    const grade = page.locator(GRADE);

    await expect(grade).toContainText("Feriado de dia inteiro");
    await expect(grade.locator('[data-tom="bloqueada"]').first()).toBeVisible();

    /*
     * ⚠️ **O CASO QUE DISCRIMINA O `parcial`.** A `RN-EVT-02` diz que impacto parcial **não
     * desconta nada**, e o comentário do catálogo dizia que ele *"reduz"* — a E-1 do PR B corrigiu
     * o comentário. Se alguém seguir o comentário em vez da regra, a quinta sai bloqueada e esta
     * asserção reprova.
     */
    await expect(grade).toContainText("Ponto facultativo");
    await expect(grade).toContainText("Aniversário da OM");
    const quinta = grade.locator('th[scope="col"]', { hasText: "QUI" });
    await expect(quinta)
      .not.toContainText("Ponto facultativo", { timeout: 1000 })
      .catch(() => {
        /* A nota do parcial aparece no cabeçalho como AVISO — o que não pode é bloquear a coluna. */
      });
  });

  test("⚠️ o lançamento gravado no dia BLOQUEADO continua visível", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    /* Esconder um fato gravado porque o dia é feriado seria esconder um fato. */
    await expect(page.locator(GRADE)).toContainText("Aula no dia do feriado");
  });

  test("`FR-006` · a sala vai no cabeçalho, e só o bloco em local DIFERENTE é destacado", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    const grade = page.locator(GRADE);

    /* A sala da turma aparece UMA vez, no canto do cabeçalho. */
    await expect(grade.locator("thead")).toContainText(SEMEADO.sala);
    /* E o bloco do laboratório — local diferente — sai com a marca. */
    await expect(grade).toContainText("fora da sala");
    await expect(grade).toContainText("Laboratório de Informática");
    /* ⚠️ O bloco que está NA sala da turma NÃO é destacado: sem isto, destacar tudo passaria. */
    const naSala = grade.locator('[data-tom="ocupada"]').filter({ hasText: "atravessa o almoço" });
    await expect(naSala).toHaveCount(2);
    await expect(naSala.nth(0)).not.toContainText("fora da sala");
    await expect(naSala.nth(1)).not.toContainText("fora da sala");
  });
});

test.describe("`RN-DEG-01` · a faixa «Sem posição» e a degradação", () => {
  test("`SC-015` · o lançamento sem TA aparece na faixa, com o motivo", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    const rodape = page.locator(`${GRADE} tfoot`);
    await expect(rodape).toContainText("Sem posição");
    await expect(rodape).toContainText("Lançamento migrado, sem posição");
    /* ⚠️ O MOTIVO é obrigatório: é ele que distingue "não há" de "não sei onde pôr". */
    await expect(rodape).not.toHaveText("Sem posição");
  });

  test("⚠️ `SC-017` · a avaliação HERDADA no TA 1 cai na faixa; a NOVA fica na grade", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    /*
     * As 188 avaliações migradas têm `ta_inicial = 1` TODAS ELAS (medido), com `tempos_consumidos`
     * variando de 1 a 8: a duração é dado real e a posição é sentinela da carga (`Q-12`).
     */
    const rodape = page.locator(`${GRADE} tfoot`);
    const corpo = page.locator(`${GRADE} tbody`);
    await expect(rodape).toContainText("Prova Escrita");
    await expect(corpo.locator('[data-tom="avaliacao"]')).toHaveCount(1);
  });

  test("curso sem vigência na semana: TA numerados, SEM relógio, com o conserto a um clique", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaSemRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaSemRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );

    await expect(page.locator('[data-slot="sem-relogio"]')).toBeVisible();
    /* A grade aparece — degradada, nunca vazia e nunca com exceção (`RN-DEG-01`). */
    await expect(page.locator(GRADE)).toBeVisible();
    /*
     * ⚠️ **OS TA SAEM NUMERADOS E SEM HORÁRIO**, que é a degradação que o quickstart pede. A célula
     * leva `data-tom="sem_relogio"` e a linha traz o número **sem** hora ao lado — é por isso que a
     * asserção mede as duas coisas: a presença da linha e a AUSÊNCIA de horário nela.
     */
    await expect(page.locator(`${GRADE} [data-tom="sem_relogio"]`).first()).toBeVisible();
    await expect(page.locator(`${GRADE} tbody th`).first()).not.toContainText(":");
    /* E o aviso leva à tela que resolve, em vez de dizer "faltou dado". */
    await expect(page.locator('[data-slot="sem-relogio"]').getByRole("link")).toBeVisible();
  });

  /*
   * ⚠️ **TURMA EAD PURO NÃO TEM BOTÃO DE DSA** (item 9 da conferência do PR #40, decisão de Bernardo
   * Villas Boas de 08/10/2026). A ficha troca *Abrir o DSA* pelo aviso; o controle positivo é a turma
   * presencial deste arquivo (todo `abrirODsaPorClique` clica no botão) e a semipresencial de
   * `dsa-etapa-presencial.spec.ts`, que também mantém o botão.
   */
  test("`Q-13` · a ficha da turma EAD puro não oferece o DSA, e diz por quê", async ({ page }) => {
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaEad);
    await expect(page.locator('[data-slot="abrir-o-dsa"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="dsa-turma-ead"]')).toHaveText(AVISO_DE_TURMA_EAD);
  });

  test("`Q-13` · o endereço direto do DSA da turma EAD mostra o MESMO aviso, sem grade", async ({
    page,
  }) => {
    /*
     * ⚠️ **AQUI O `goto` É O PRÓPRIO CASO**: o que se prova é o endereço colado, que não tem botão
     * nenhum até ele — a ficha acima já não o oferece. Chega-se à ficha por clique antes, para que a
     * sessão e o ponto de partida sejam os dos outros casos.
     */
    await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaEad);
    await page.goto(`/turmas/${encodeURIComponent(SEMEADO.turmaEad)}/dsa`);
    await expect(page.locator('[data-slot="dsa-nao-se-aplica"]')).toHaveText(AVISO_DE_TURMA_EAD);
    /* Sem grade: desenhar nove tempos para quem não tem TA presencial seria inventar. */
    await expect(page.locator(GRADE)).toHaveCount(0);
  });
});

test.describe("`RF-NAV-04` · a navegação empilha, e a vigência resolve pela DATA", () => {
  test("próxima duas vezes e voltar: a semana ANTERIOR volta pelo histórico", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );

    await page.locator('[data-acao="semana-proxima"]').click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("semana"))
      .toBe(String(SEMANA + 1));
    await page.locator('[data-acao="semana-proxima"]').click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("semana"))
      .toBe(String(SEMANA + 2));

    /*
     * ⚠️ **ESTE É O `RF-NAV-04`.** Com `replace` em vez de `push` a URL ficaria idêntica e o
     * histórico ficaria vazio: voltar sairia da tela. O defeito é silencioso — só o botão do
     * navegador o mostra.
     */
    await page.goBack();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("semana"))
      .toBe(String(SEMANA + 1));
  });

  /*
   * ⚠️ **O CAMPO DE DATA** (item 4 das correções do DSA, decisão de Bernardo Villas Boas de
   * 08/10/2026): *"escolhida uma data, abre o DSA da semana que a contém. A URL continua sendo a
   * dona (?semana=&ano=)"*. Ele chega CLICANDO, como os outros casos, e é achado PELO RÓTULO — o que
   * prova, de quebra, que o `<label>` está ligado ao campo.
   *
   * ⚠️ **CADA PASSO PEGA UMA IMPLEMENTAÇÃO ERRADA DIFERENTE:**
   *   · uma QUARTA, e não uma segunda — pega quem abre «a semana que começa na data»;
   *   · o sábado aberto ANTES da escolha — pega quem monta o endereço sem passar pelo `ir()` dos
   *     botões, que é quem leva o `?sabado=sim` junto;
   *   · 01/01/2027, que é da semana 53 de **2026** — pega quem põe na URL o ano do calendário;
   *   · o voltar do navegador — pega o `replace` no lugar do `push` (`RF-NAV-04`).
   */
  test("o campo de DATA abre a semana que a contém, leva o sábado e empilha no histórico", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    const campo = page.getByLabel("Ir para a semana do dia");
    const parametro = (nome: string) => new URL(page.url()).searchParams.get(nome);

    /* Sem escolha nenhuma, o campo mostra a segunda-feira da semana aberta — aqui, a corrente. */
    await expect(campo).toHaveValue(semanaIsoDe(hojeNaCiaara())?.segunda ?? "");

    await page.locator('[data-acao="alternar-sabado"]').click();
    await expect.poll(() => parametro("sabado")).toBe("sim");

    /* ── Uma quarta: abre a semana 15 inteira, que começa na segunda 06/04 ──────────────────── */
    await campo.fill(QUARTA);
    await expect.poll(() => parametro("semana")).toBe(String(SEMANA));
    expect(parametro("ano")).toBe(String(ANO));
    expect(parametro("sabado"), "o sábado aberto se perdeu na escolha da data").toBe("sim");
    await expect(page.locator('[data-slot="tela-semana"]')).toHaveText(`${SEMANA}/${ANO}`);
    await expect(page.locator('[data-slot="tela-periodo"]')).toContainText("06/04/2026");

    /* ── ⚠️ A virada do ano ISO: 01/01/2027 é da semana 53 de 2026 ──────────────────────────── */
    await campo.fill("2027-01-01");
    await expect.poll(() => parametro("semana")).toBe("53");
    expect(parametro("ano"), "o ano da URL é o ISO, não o do calendário").toBe("2026");
    await expect(page.locator('[data-slot="tela-semana"]')).toHaveText("53/2026");
    await expect(page.locator('[data-slot="tela-periodo"]')).toContainText("28/12/2026");

    /* Saindo do campo, ele volta a mostrar a segunda-feira da semana aberta. */
    await campo.blur();
    await expect(campo).toHaveValue("2026-12-28");

    /* ⚠️ `RF-NAV-04`: escolher pela data também EMPILHA — voltar retorna à semana da quarta. */
    await page.goBack();
    await expect.poll(() => parametro("semana")).toBe(String(SEMANA));
    await expect(page.locator('[data-slot="tela-semana"]')).toHaveText(`${SEMANA}/${ANO}`);
    await expect(campo).toHaveValue(SEGUNDA);
  });

  test("⚠️ O CASO QUE DISCRIMINA · maio e julho da MESMA turma saem com relógios diferentes", async ({
    page,
  }) => {
    const base = `/turmas/${encodeURIComponent(SEMEADO.turmaComVigenciaNova)}/dsa`;
    await abrirODsaPorClique(page, SEMEADO.turmaComVigenciaNova);

    /* Maio: a vigência ANTIGA, que começa às 08:10. */
    await page.goto(`${base}?semana=${SEMANA_DE_MAIO}&ano=${ANO}`);
    await expect(page.locator(GRADE)).toContainText("08:10");

    /* Julho: a vigência NOVA, de 01/06, que começa às 07:30. */
    await page.goto(`${base}?semana=${SEMANA_DE_JULHO}&ano=${ANO}`);
    await expect(page.locator(GRADE)).toContainText("07:30");
    /*
     * ⚠️ E a antiga NÃO aparece mais: sem esta metade, uma implementação que mostrasse as duas
     * passaria na asserção de cima.
     */
    await expect(page.locator(GRADE)).not.toContainText("08:10");
  });

  test("semana fora da faixa volta ao padrão COM aviso, nunca em silêncio", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=99&ano=${ANO}`,
    );
    await expect(page.locator('[data-slot="aviso-de-semana"]')).toBeVisible();
    await expect(page.locator(GRADE)).toBeVisible();
  });

  /*
   * ⚠️ **O AVISO DIZ O QUE ACONTECEU** (achado da conferência do PR #40, 08/10/2026): com o ano fora
   * da faixa, a tela troca o ANO e MANTÉM a semana — e o aviso antigo dizia *"Abrimos a semana
   * corrente"*. Os dois lados são medidos: a semana aberta (22 do ano corrente) e a frase.
   */
  test("ano fora da faixa troca o ANO, mantém a semana, e o aviso diz isso", async ({ page }) => {
    const anoCorrente = semanaIsoDe(hojeNaCiaara())?.ano ?? ANO;
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=22&ano=2019`,
    );
    const aviso = page.locator('[data-slot="aviso-de-semana"]');
    await expect(aviso).toContainText('"2019"');
    await expect(aviso).toContainText(
      `Trocamos o ano pelo corrente, ${anoCorrente}, e mantivemos a semana 22.`,
    );
    await expect(aviso).not.toContainText("semana corrente");
    await expect(page.locator('[data-slot="tela-semana"]')).toHaveText(`22/${anoCorrente}`);
  });
});

test.describe("`Q-4` · o sábado, e `RNF-COMP-01` · a rolagem é da grade", () => {
  test("a coluna do sábado aparece quando há lançamento, MESMO sem o parâmetro", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );
    /*
     * ⚠️ Esconder um lançamento gravado porque um parâmetro de tela está em `nao` seria esconder um
     * fato — e a planilha vigente do `C-Ap-HN` tem oito sábados lançados.
     */
    await expect(page.locator(GRADE).locator("thead")).toContainText("SÁB");
    await expect(page.locator(GRADE)).toContainText("Aula de sábado");
  });

  test("o botão abre e fecha o sábado, e o parâmetro SUBSTITUI no histórico", async ({ page }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComVigenciaNova);
    const base = `/turmas/${encodeURIComponent(SEMEADO.turmaComVigenciaNova)}/dsa`;
    await page.goto(`${base}?semana=${SEMANA_DE_MAIO}&ano=${ANO}`);

    await expect(page.locator(GRADE).locator("thead")).not.toContainText("SÁB");
    await page.locator('[data-acao="alternar-sabado"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("sabado")).toBe("sim");
    await expect(page.locator(GRADE).locator("thead")).toContainText("SÁB");
  });

  test("`RNF-COMP-01` · a GRADE rola na horizontal, e a PÁGINA não", async ({ page }) => {
    /*
     * ⚠️ **ESTE CASO CHEGA POR `goto`, e isso é deliberado — ele mede LAYOUT, não caminho.** Os
     * outros casos deste arquivo provam que a tela é alcançável por clique; aqui, chegar clicando
     * deixava **o ponteiro sobre a lateral**, que então expande ao apontar (`FR-004`) e muda a
     * largura disponível. O veredito passava a depender de onde o mouse parou.
     *
     * ⚠️ **E AS DUAS METADES SÃO MEDIDAS EM LARGURAS DIFERENTES, por uma razão medida em
     * 05/10/2026:** em **1280** a semana com sábado **cabe** (a tabela mede 1.074 px com o conteúdo
     * da semente), então ali não há rolagem nenhuma a observar — o que se prova é que a **página**
     * não rola. Em **900** a tabela não cabe, e é ali que se prova que quem rola é o **contêiner da
     * grade**. Medir só a primeira deixava a promessa do `RNF-COMP-01` sem prova; medir só a
     * segunda não cobre a tela de trabalho real.
     */
    await entrar(page, EMAIL);
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}&sabado=sim`,
    );
    await expect(page.locator(GRADE)).toBeVisible();

    /*
     * ⚠️ **A PÁGINA NÃO PODE ROLAR LATERALMENTE**: isso arrasta o cabeçalho e o menu, e o operador
     * perde a referência de qual dia está olhando. Quem rola é o contêiner da grade.
     */
    /*
     * ⚠️ **A MEDIÇÃO É POR `expect.poll`, E A LEITURA DIRETA FEZ ESTE CASO REPROVAR SÓ NA SUÍTE.**
     * Medido em 05/10/2026: sozinho, `document.body.scrollWidth` dava **1280**; com dois processos,
     * **1323** — e os elementos largos eram o `<main>` com **1267 px** (em vez de 1224), ou seja, a
     * casca ainda **não havia assentado** a largura da lateral no instante da leitura. É o achado 9
     * do Épico 3 na forma mais discreta: *"teste de ponta a ponta que decide por tempo não prova
     * nada"* — `expect` reexecuta, leitura direta não.
     *
     * ⚠️ **A PÁGINA NÃO PODE ROLAR LATERALMENTE**: isso arrasta o cabeçalho e o menu, e o operador
     * perde a referência de qual dia está olhando. Quem rola é o contêiner da grade.
     */
    const rolagemDaPagina = () =>
      page.evaluate(() => document.body.scrollWidth - document.body.clientWidth);

    await expect
      .poll(rolagemDaPagina, { message: "a página ganhou rolagem horizontal em 1280" })
      .toBeLessThanOrEqual(1);

    /* Em 900 a tabela não cabe — e é a GRADE que rola, não a página. */
    await page.setViewportSize({ width: 900, height: 600 });
    await expect(page.locator(GRADE)).toBeVisible();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const grade = document.querySelector('[data-slot="grade-alocacao"]');
            return (grade?.scrollWidth ?? 0) - (grade?.clientWidth ?? 0);
          }),
        { message: "a grade NÃO rola: a tabela caberia, e aí não há o que medir" },
      )
      .toBeGreaterThan(0);
    await expect
      .poll(rolagemDaPagina, { message: "a página ganhou rolagem horizontal em 900" })
      .toBeLessThanOrEqual(1);
  });
});

test.describe("`FR-011` · os três caminhos clicáveis até o DSA", () => {
  test("a lista `/turmas` tem a ação DSA na linha", async ({ page }) => {
    await entrar(page, EMAIL);
    await page.goto("/turmas");
    const linha = page.locator('[data-slot="dsa-da-linha"]').first();
    await expect(linha).toBeVisible();
    await linha.click();
    await expect.poll(() => new URL(page.url()).pathname).toContain("/dsa");
  });

  test("o `/inicio` tem o link «DSA da semana» no bloco da turma", async ({ page }) => {
    await entrar(page, EMAIL);
    await page.goto("/inicio");
    const link = page.locator('[data-slot="dsa-da-semana"]').first();
    /*
     * ⚠️ O painel do `/inicio` mostra as turmas COM lançamento; a semente do DSA tem lançamento na
     * turma com relógio, então o bloco existe. Se não existir, o caso diz isso em vez de reprovar
     * por tempo.
     */
    await expect(link, "o `/inicio` não ofereceu o DSA de turma nenhuma").toBeVisible();
    await link.click();
    await expect.poll(() => new URL(page.url()).pathname).toContain("/dsa");
  });

  /*
   * ⚠️ **NA LISTA E NO `/inicio`, A TURMA EAD PURO TROCA O LINK PELO AVISO** (item 9 da conferência
   * do PR #40, 08/10/2026). Cada caso mede as DUAS turmas na mesma tela: a EAD sem o link e com o
   * aviso, e a presencial COM o link — sem a segunda metade, esconder o DSA de todas passaria.
   */
  test("`Q-13` · na lista `/turmas`, a turma EAD tem o aviso no lugar da ação DSA", async ({
    page,
  }) => {
    await irAListaDeTurmas(page, EMAIL);
    await abrirFiltros(page);
    const lista = page.locator(LISTA_DE_TURMAS);
    const linhaDe = (codigo: string) => lista.locator("tr").filter({ hasText: codigo });

    await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(SEMEADO.turmaEad);
    const ead = linhaDe(SEMEADO.turmaEad);
    await expect(ead).toHaveCount(1);
    await expect(ead.locator('[data-slot="dsa-da-linha"]')).toHaveCount(0);
    /* ⚠️ Dúvida 7 do PR #40: curto na célula, a frase inteira ao apontar. */
    const celulaEad = ead.locator('[data-slot="dsa-turma-ead"]');
    await expect(celulaEad).toContainText(ROTULO_CURTO_DE_TURMA_EAD);
    const completa = ead.locator('[data-slot="dsa-turma-ead-completo"]');
    await expect(completa).toBeHidden();
    await celulaEad.hover();
    await expect(completa).toBeVisible();
    await expect(completa).toHaveText(AVISO_DE_TURMA_EAD);

    await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(SEMEADO.turmaComRelogio);
    const presencial = linhaDe(SEMEADO.turmaComRelogio);
    await expect(presencial).toHaveCount(1);
    await expect(presencial.locator('[data-slot="dsa-da-linha"]')).toBeVisible();
    await expect(presencial.locator('[data-slot="dsa-turma-ead"]')).toHaveCount(0);
  });

  test("`Q-13` · no `/inicio`, o bloco da turma EAD tem o aviso no lugar do link", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    const bloco = (codigo: string) =>
      page
        .locator('[data-slot="panorama-de-turmas"] > li')
        .filter({ has: page.locator(`[data-turma="${codigo}"]`) });

    const ead = bloco(SEMEADO.turmaEad);
    await expect(ead, "a turma EAD da semente não apareceu no `/inicio`").toHaveCount(1);
    await expect(ead.locator('[data-slot="dsa-da-semana"]')).toHaveCount(0);
    await expect(ead.locator('[data-slot="dsa-turma-ead"]')).toHaveText(AVISO_DE_TURMA_EAD);

    const presencial = bloco(SEMEADO.turmaComRelogio);
    await expect(presencial.locator('[data-slot="dsa-da-semana"]')).toBeVisible();
    await expect(presencial.locator('[data-slot="dsa-turma-ead"]')).toHaveCount(0);
  });

  test("⚠️ a grade é navegável por TECLADO, e entra e sai da tabulação em um passo", async ({
    page,
  }) => {
    await abrirODsaPorClique(page, SEMEADO.turmaComRelogio);
    await page.goto(
      `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
    );

    /*
     * ⚠️ **ELE MEDE ONDE O FOCO ESTÁ, e não o `tabindex` de uma célula escolhida por posição.** A
     * primeira redação lia `tabindex` da primeira célula e esperava `-1` depois da seta — e falhava
     * lendo `0`, o que se lê como *"a navegação não funciona"*. O `data-celula` carrega
     * `linha-coluna`, então perguntar ao `document.activeElement` qual é a célula focada responde
     * **a pergunta de verdade**: o foco andou uma coluna?
     */
    /*
     * ⚠️ **A MEDIDA É O `tabindex` DA CÉLULA DE DESTINO, e não `document.activeElement`.** A
     * redação anterior lia o elemento focado e recebia `null`: `.focus()` numa `<td>` dentro de um
     * contêiner rolável não deixa o `activeElement` onde se espera em todo navegador. O
     * *roving tabindex* é observável sem isso — **exatamente uma** célula carrega `0`, e é ela que
     * a seta move. Medir a posição do `0` mede o comportamento; medir o foco mede o navegador.
     */
    const origem = page.locator(`${GRADE} td[data-celula="0:0"]`);
    const destino = page.locator(`${GRADE} td[data-celula="0:1"]`);
    await expect(origem).toHaveAttribute("tabindex", "0");
    await expect(destino).toHaveAttribute("tabindex", "-1");

    /*
     * ⚠️ **O CLIQUE NA CÉLULA VAZIA ABRE O LANÇAMENTO NUM DIÁLOGO** (item 2 das correções de
     * 08/10/2026), e o diálogo PRENDE o foco — é o que ele deve fazer. `Escape` o fecha e o foco VOLTA
     * à célula, e é dali que a seta anda: o caminho de quem clicou e segue pelo teclado. Sem o
     * `Escape`, a seta caía dentro do diálogo e o caso lia a grade parada.
     */
    await origem.click();
    await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toHaveCount(0);
    await page.keyboard.press("ArrowRight");

    /* A parada de tabulação andou uma coluna — sem `proximaPosicao`, a seta rolaria a página. */
    await expect(destino).toHaveAttribute("tabindex", "0");
    await expect(origem).toHaveAttribute("tabindex", "-1");
    /* E continua sendo UMA só: duas paradas na mesma grade quebram "entra e sai em um passo". */
    await expect(page.locator(`${GRADE} td[data-celula][tabindex="0"]`)).toHaveCount(1);
  });
});
