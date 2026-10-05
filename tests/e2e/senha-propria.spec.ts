/**
 * Trocar a própria senha (`FR-030` a `FR-032`, `US3` da spec 011).
 *
 * ⚠️ **ARQUIVO PRÓPRIO, E COM CONTA PRÓPRIA — não é organização, é isolamento.** Estes casos
 * **mudam a senha** da conta que usam, e `conta-de-teste.ts` entra com uma senha fixa. Compartilhar a
 * conta com `sair-e-perfil.spec.ts` faria o caso seguinte reprovar com *"credencial inválida"*, que
 * se lê como defeito da autenticação e seria efeito colateral do teste anterior — a família de
 * defeito que esta base já pagou três vezes.
 *
 * ⚠️ **O PERCURSO INTEIRO É POR CLIQUE**, com `goto` só no ponto de partida de cada entrada: menu do
 * avatar → *Meu perfil* → *Trocar a minha senha*. É o que prova que a tela está **alcançável**, e não
 * apenas que funciona.
 *
 * ⚠️ **O CASO QUE FECHA É O ÚLTIMO: entrar com a senha NOVA.** Sem ele, uma ação que dissesse *"senha
 * trocada"* sem trocar nada passaria em todos os outros — e a pessoa só descobriria no dia seguinte,
 * trancada para fora.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar, SENHA_DE_TESTE } from "./conta-de-teste";

let EMAIL = "";

/** A senha nova deste percurso. ⚠️ Acima do mínimo de 12, para não medir a fronteira sem querer. */
const SENHA_NOVA = "senha-nova-do-percurso-2026";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("senha-propria", info.workerIndex);
  // ⚠️ `operador`, não `admin`: um Admin a mais derruba 12 casos de `rls.test.ts` (gotcha 8).
  await criarConta(EMAIL, `USR-SENHA-${info.workerIndex}`, "operador");
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

/** Menu do avatar → *Meu perfil* → *Trocar a minha senha*. Tudo por clique. */
async function irAoTrocarSenhaPorClique(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Conta de / }).click();
  await page.getByRole("menuitem", { name: "Meu perfil" }).click();
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();

  await page.getByRole("link", { name: "Trocar a minha senha" }).click();
  await expect(page.getByRole("heading", { name: "Trocar a minha senha" })).toBeVisible();
}

/**
 * ⚠️ A resposta se procura DENTRO da seção. `getByRole("status")` casa também com a faixa
 * **AMBIENTE LOCAL**, e `getByRole("alert")` com o anunciador de rota do Next — gotcha 3 do
 * Épico 4. Violação de modo estrito falha na hora e não reexecuta: o que resolve é escopo.
 */
const secaoDaSenha = (page: Page) => page.getByRole("region", { name: "Senha nova" });

/** Entra pelo formulário com uma senha ARBITRÁRIA — o auxiliar comum só sabe a senha fixa. */
async function entrarCom(page: Page, email: string, senha: string): Promise<void> {
  await page.goto("/login?destino=%2Finicio");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="senha"]').fill(senha);
  await page.getByRole("button", { name: /entrar/i }).click();
}

test.describe("`FR-030` · a tela é alcançada por clique, e troca a senha", () => {
  test("⚠️ trocar a senha, SAIR e entrar com a NOVA — o percurso que fecha o requisito", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoTrocarSenhaPorClique(page);

    await page.locator('input[name="senha"]').fill(SENHA_NOVA);
    await page.locator('input[name="confirmacao"]').fill(SENHA_NOVA);
    await page.getByRole("button", { name: /trocar senha/i }).click();

    await expect(secaoDaSenha(page).getByRole("status")).toContainText("Senha trocada");

    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: /^Sair/ }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");

    // ⚠️ **A SENHA ANTIGA PRECISA PARAR DE FUNCIONAR**, e medir só a nova não prova isso: uma ação
    //    que criasse uma segunda credencial em vez de trocar a existente passaria pela metade boa.
    await entrarCom(page, EMAIL, SENHA_DE_TESTE);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");

    await entrarCom(page, EMAIL, SENHA_NOVA);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe("/login");
    await expect(page.getByRole("button", { name: /^Conta de / })).toBeVisible();
  });
});

/**
 * ⚠️ **ESTE BLOCO TEM CONTA PRÓPRIA, E A FALTA DELA ERA UM DEFEITO LATENTE — medido na `main` em
 * 05/10/2026** (decisão F-3 de Bernardo Villas Boas, corrigida no PR 1 do Épico 6).
 *
 * O primeiro bloco do arquivo **TROCA a senha** da conta que usa, e não a restaura; `entrar()`
 * entra com a senha fixa. Enquanto os dois blocos compartilhavam a conta, o segundo passava **só
 * quando o Playwright os punha em workers diferentes** — e o e-mail deriva do `workerIndex`, então
 * cada worker criava a sua. Com `fullyParallel: true` isso acontece quase sempre; com
 * `--workers=1`, **nunca**: a reprovação era reprodutível na `main`, sem relação com fatia nenhuma.
 *
 * ⚠️ **O SINTOMA ERA O PIOR POSSÍVEL:** o caso falhava em `entrar()`, com *"credencial inválida"*
 * sobre a tela de login — que se lê como defeito da AUTENTICAÇÃO, e era efeito colateral do teste
 * anterior. É a mesma família que o cabeçalho deste arquivo já descreve, e que a separação de
 * arquivos resolveu **entre** arquivos mas não **dentro** deste.
 */
test.describe("⚠️ OS DOIS CASOS QUE DISCRIMINAM · a recusa, e QUANDO ela acontece", () => {
  let EMAIL_DA_RECUSA = "";

  test.beforeAll(async ({}, info) => {
    EMAIL_DA_RECUSA = emailDeTeste("senha-recusa", info.workerIndex);
    // `operador`, não `admin`: um Admin a mais derruba 12 casos de `rls.test.ts` (gotcha 8).
    await criarConta(EMAIL_DA_RECUSA, `USR-SREC-${info.workerIndex}`, "operador");
  });

  test.afterAll(async () => {
    await apagarConta(EMAIL_DA_RECUSA);
  });

  test("senha curta é recusada COM A FRASE DA REGRA, e não com a palavra `inválida`", async ({
    page,
  }) => {
    await entrar(page, EMAIL_DA_RECUSA);
    await irAoTrocarSenhaPorClique(page);

    await page.locator('input[name="senha"]').fill("curta");
    await page.locator('input[name="confirmacao"]').fill("curta");
    await page.getByRole("button", { name: /trocar senha/i }).click();

    const recusa = secaoDaSenha(page).getByRole("alert");
    await expect(recusa).toContainText("12");

    // ⚠️ **É ISTO QUE DISCRIMINA.** Uma política que devolvesse só verdadeiro/falso mostraria
    //    *"inválida"* — ou, pior, a frase da plataforma em inglês — e passaria numa asserção que só
    //    perguntasse se houve recusa. O requisito `FR-032` é sobre a EXPLICAÇÃO, não sobre o
    //    veredito.
    await expect(recusa).not.toContainText(/inválid/i);
    await expect(recusa).not.toContainText(/password|characters|should be/i);
  });

  test("⚠️ duas digitações diferentes são recusadas ANTES de qualquer envio ao servidor", async ({
    page,
  }) => {
    await entrar(page, EMAIL_DA_RECUSA);
    await irAoTrocarSenhaPorClique(page);

    // ⚠️ **O QUE SE MEDE É A AUSÊNCIA DE CHAMADA, não a presença da mensagem.** Uma tela que
    //    mandasse as duas senhas ao servidor e mostrasse a recusa dele exibiria o mesmo texto — e o
    //    servidor teria de decidir qual das duas a pessoa quis. Contar as requisições é o único jeito
    //    de separar os dois desenhos.
    let chamadas = 0;
    page.on("request", (requisicao) => {
      if (requisicao.method() === "POST") chamadas += 1;
    });

    await page.locator('input[name="senha"]').fill("uma-senha-bem-longa");
    await page.locator('input[name="confirmacao"]').fill("outra-senha-bem-longa");
    await page.getByRole("button", { name: /trocar senha/i }).click();

    const recusa = secaoDaSenha(page).getByRole("alert");
    await expect(recusa).toContainText("coincidem");
    // E a recusa fala DA DIVERGÊNCIA, não de tamanho — as duas passam do mínimo.
    await expect(recusa).not.toContainText("12");

    expect(chamadas, "a divergência foi mandada ao servidor em vez de barrada na tela").toBe(0);
  });
});
