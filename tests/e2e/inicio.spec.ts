/**
 * A tela Início (`RF-INI-01` a `RF-INI-05`, `FR-004.1`, `FR-025`, `FR-028` a `FR-033`, `FR-045`).
 *
 * ⚠️ **AQUI ESTÁ O QUE A VITRINE NÃO CONSEGUIA PROVAR.** `estado-na-url.spec.ts` mede a mecânica da
 * URL numa tela que não consulta servidor nenhum; três exigências ficaram declaradas lá e são
 * fechadas aqui: **o número na tela muda** ao trocar o filtro, **o sinal aparece antes do dado**, e
 * **o mesmo link mostra coisas diferentes para escopos diferentes** — porque quem nega é o banco.
 *
 * ⚠️ **O PRIMEIRO DELES É O QUE NÃO SE PROVA POR ATRIBUTO.** Um percurso que confira só a barra de
 * endereço passa com o aviso ao servidor desligado — e é exatamente esse o defeito que ele deveria
 * pegar. Por isso a asserção é sobre o conteúdo, e não sobre a URL.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "./panorama-de-teste";

let EMAIL_GERAL = "";
let EMAIL_EXPEDITO = "";
let SEMEADO: PanoramaSemeado;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_GERAL = emailDeTeste("inicio-geral", p);
  EMAIL_EXPEDITO = emailDeTeste("inicio-expedito", p);

  SEMEADO = await semearPanorama(p);
  await criarConta(EMAIL_GERAL, `USR-INI-GERAL-${p}`);
  /*
   * ⚠️ O SEGUNDO USUÁRIO TEM ESCOPO ESTREITO, e é ele que dá sentido ao `FR-025`. Sem um perfil que
   * enxergue menos, "o link compartilhado não vaza" é afirmação sem contraprova.
   */
  await criarConta(EMAIL_EXPEDITO, `USR-INI-EXP-${p}`, "operador", "expedito");
});

test.afterAll(async () => {
  await apagarConta(EMAIL_GERAL);
  await apagarConta(EMAIL_EXPEDITO);
  await limparPanorama(SEMEADO);
});

/** Quantas turmas o panorama está mostrando, lido do conteúdo — nunca da URL. */
async function turmasNaTela(page: Page): Promise<number> {
  return page.locator('[data-slot="panorama-de-turmas"] li').count();
}

test.describe("`RF-INI-01` · o panorama mostra previsto, executado e o que está em atraso", () => {
  test("as duas turmas semeadas aparecem, com progresso", async ({ page }) => {
    await entrar(page, EMAIL_GERAL, "/inicio");

    const atrasada = page.locator(`[data-turma="${SEMEADO.turmaAtrasada}"]`);
    const emDia = page.locator(`[data-turma="${SEMEADO.turmaEmDia}"]`);
    await expect(atrasada).toBeVisible();
    await expect(emDia).toBeVisible();

    // 12 tempos executados sobre 10 previstos, e 10 sobre 50.
    await expect(atrasada.locator("[data-progresso]")).toHaveAttribute("data-progresso", "120");
    await expect(emDia.locator("[data-progresso]")).toHaveAttribute("data-progresso", "20");
  });

  test("⚠️ só a turma com saldo NEGATIVO é sinalizada", async ({ page }) => {
    /*
     * O `RF-INI-01` escreve *"em andamento com saldo negativo de capacidade"*. Sinalizar as duas
     * encheria a região de alertas de turmas que ninguém precisa olhar — ruído que ensina a ignorar
     * a região inteira, que é o oposto do que o `RNF-USA-04` quer.
     */
    await entrar(page, EMAIL_GERAL, "/inicio");
    await expect(
      page.locator(`[data-turma="${SEMEADO.turmaAtrasada}"]`).getByText("em atraso"),
    ).toBeVisible();
    await expect(
      page.locator(`[data-turma="${SEMEADO.turmaEmDia}"]`).getByText("em atraso"),
    ).toHaveCount(0);
  });

  test("`RF-INI-04` · a região de alertas existe mesmo sem nada a alertar", async ({ page }) => {
    // Região que some quando está tudo bem ensina a não procurá-la.
    await entrar(page, EMAIL_GERAL, "/inicio?classificacao=expedito");
    await expect(page.locator('[data-slot="alerta-conformidade"]')).toBeVisible();
  });
});

test.describe("`FR-004.1` · o NÚMERO na tela muda ao trocar o filtro", () => {
  test("⚠️ é o que não se prova olhando a barra de endereço", async ({ page }) => {
    /*
     * Um percurso que confira só a URL passa com o aviso ao servidor desligado: o endereço fica
     * certo, o histórico funciona, o link abre — **e a consulta continua a velha**. A asserção é
     * sobre o conteúdo justamente por isso.
     */
    await entrar(page, EMAIL_GERAL, "/inicio");
    const antes = await turmasNaTela(page);
    expect(antes, "o panorama abriu vazio: o preparo não semeou").toBeGreaterThanOrEqual(2);

    await page.selectOption("#filtro-classificacao", "expedito");
    await expect
      .poll(() => turmasNaTela(page), {
        timeout: 10_000,
        message: "a URL mudou e o conteúdo não: o aviso ao servidor está desligado",
      })
      .toBeLessThan(antes);

    await expect(page.locator(`[data-turma="${SEMEADO.turmaEmDia}"]`)).toBeVisible();
    await expect(page.locator(`[data-turma="${SEMEADO.turmaAtrasada}"]`)).toHaveCount(0);
  });

  test("e o recorte fica no endereço, para o link carregá-lo", async ({ page }) => {
    await entrar(page, EMAIL_GERAL, "/inicio");
    await page.selectOption("#filtro-modalidade", "ead");
    await expect.poll(() => new URL(page.url()).searchParams.get("modalidade")).toBe("ead");
  });
});

test.describe("`FR-045` · a troca de recorte não fica muda", () => {
  test("⚠️ o sinal aparece ANTES de o dado chegar (`SC-023`)", async ({ page }) => {
    /*
     * ⚠️ A MEDIÇÃO OBSERVA UMA JANELA, E NÃO AMOSTRA UM INSTANTE. O sinal dura o tempo da ida ao
     * servidor: uma leitura feita depois encontra a tela já pronta e aprova uma implementação que
     * nunca sinalizou nada. É a mesma lição que a correção do destino de retorno deixou.
     */
    await entrar(page, EMAIL_GERAL, "/inicio");

    await page.evaluate(() => {
      const janela = window as unknown as { __sinais?: string[] };
      janela.__sinais = [];
      const alvo = document.querySelector('[data-slot="filtro-do-panorama"]');
      if (!alvo) return;
      new MutationObserver(() => {
        janela.__sinais?.push(alvo.getAttribute("data-esperando") ?? "");
      }).observe(alvo, { attributes: true, attributeFilter: ["data-esperando"] });
    });

    /*
     * ⚠️ A ASSERÇÃO É SOBRE A TURMA SEMEADA, E NÃO SOBRE UMA CONTAGEM ABSOLUTA. Contagem absoluta
     * amarra o caso ao estado inteiro da base: uma execução anterior que tenha deixado resto — ou a
     * carga real do Épico 2 aplicada nesta máquina — faz o número mudar sem que nada tenha
     * quebrado. **O caso mediria o banco, e não o requisito.**
     */
    await page.selectOption("#filtro-classificacao", "regular");
    await expect
      .poll(() => page.locator(`[data-turma="${SEMEADO.turmaEmDia}"]`).count(), {
        timeout: 10_000,
      })
      .toBe(0);

    const sinais = await page.evaluate(
      () => (window as unknown as { __sinais?: string[] }).__sinais ?? [],
    );
    expect(
      sinais,
      "nenhum sinal de espera foi emitido entre o comando e a resposta: a tela ficou muda",
    ).toContain("sim");
  });
});

test.describe("`FR-025` · o link compartilhado, e quem nega é o banco", () => {
  test("⚠️ o MESMO endereço mostra menos para quem tem menos escopo", async ({ page }) => {
    /*
     * ⚠️ O PARÂMETRO É IDÊNTICO NOS DOIS CASOS. O que muda é quem está autenticado, e o recorte não
     * é aplicado por disciplina de código nesta tela: é a RLS que não devolve a linha. Um filtro
     * escrito na página seria uma segunda fronteira — e a segunda é a que alguém esquece.
     */
    const endereco = "/inicio";

    await entrar(page, EMAIL_GERAL, endereco);
    const comEscopoGeral = await turmasNaTela(page);
    expect(comEscopoGeral).toBeGreaterThanOrEqual(2);

    await page.context().clearCookies();
    await entrar(page, EMAIL_EXPEDITO, endereco);
    const comEscopoEstreito = await turmasNaTela(page);

    expect(
      comEscopoEstreito,
      "o segundo perfil enxergou tanto quanto o primeiro: ou a RLS não recorta, ou a página filtra " +
        "por conta própria — e nos dois casos o link vaza",
    ).toBeLessThan(comEscopoGeral);
    await expect(page.locator(`[data-turma="${SEMEADO.turmaAtrasada}"]`)).toHaveCount(0);
  });
});

test.describe("`FR-030` · a raiz deixou de ser um beco", () => {
  test("de `/` chega-se ao Início por clique", async ({ page }) => {
    /*
     * ⚠️ A RAIZ EXIGE SESSÃO, e é por isso que este caso entra antes. Ela não está na lista de rotas
     * abertas do proxy: quem chega sem sessão vai para o login, com o destino guardado. **O beco que
     * este requisito conserta é o de quem JÁ entrou** — a pessoa autenticada que cai em `/` sem
     * destino guardado e não encontra um único link.
     */
    await entrar(page, EMAIL_GERAL, "/inicio");
    await page.goto("/");
    await page.getByRole("link", { name: /ir para o início/i }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/inicio");
  });
});
