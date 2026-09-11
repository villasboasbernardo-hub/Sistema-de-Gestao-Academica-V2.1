/**
 * O destino de retorno após a autenticação (`FR-042`, `FR-043`, `SC-018`, `SC-019`).
 *
 * ⚠️ ESTA SUÍTE CORRIGE UM DEFEITO QUE JÁ ESTAVA NA `main`, e não testa funcionalidade nova. A
 * guarda era `destino.startsWith("/")`, e um endereço com **duas** barras começa com barra — ele
 * passava, e o retorno terminava fora do sistema.
 *
 * ⚠️ O QUE SE MEDE É **ONDE O NAVEGADOR PAROU**, e não o que a função devolveu. Uma asserção sobre
 * a condição passaria com a guarda antiga, que é exatamente a que tem o defeito. O teste de unidade
 * cobre a função; este cobre o caminho inteiro, com o roteador no meio.
 *
 * ⚠️ E O CONTROLE POSITIVO É METADE DO VALOR: uma guarda que recusasse tudo passaria em todos os
 * casos hostis e quebraria o retorno legítimo, que é a única razão de o parâmetro existir.
 */
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

function chaveLocal(nomeNoCli: string): string {
  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split("\n")
    .find((l) => l.startsWith(`${nomeNoCli}=`))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^"|"$/g, "")
    .trim();
  if (!valor) throw new Error(`nao achei ${nomeNoCli} no supabase status`);
  return valor;
}

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * ⚠️ UMA CONTA POR PROCESSO DE TRABALHO, e não uma para todos.
 *
 * O `beforeAll` roda **uma vez por processo**, não uma vez por suíte. Com dois processos, os dois
 * criavam a mesma conta e o segundo recebia *"Database error creating new user"* — falha que parece
 * defeito do sistema e é corrida do teste. É a mesma família dos dois casos instáveis da fatia (b):
 * **verde sozinho, vermelho em conjunto**.
 */
let EMAIL = "";
const SENHA = "senha-de-teste-com-12+";

/** O domínio que um link hostil tentaria alcançar. Não existe; não precisa existir. */
const HOSTIL = "ciaara-falso.exemplo";

/** A origem da aplicação sob teste. É contra ela que a permanência é medida. */
const ORIGEM_DA_APLICACAO = process.env.URL_BASE_E2E ?? "http://localhost:3000";

test.beforeAll(async ({}, info) => {
  EMAIL = `destino-do-login-${info.workerIndex}@ciaara.teste`;

  const { data: existentes } = await admin.auth.admin.listUsers();
  for (const u of existentes?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
  await admin.from("usuarios").delete().eq("email", EMAIL);

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar a conta de teste: ${error.message}`);

  const { error: erroUsuario } = await admin.from("usuarios").insert({
    codigo: `USR-DESTINO-LOGIN-${info.workerIndex}`,
    auth_user_id: data.user.id,
    email: EMAIL,
    nome: "Teste destino do login",
    perfil: "admin",
    escopo_curso: "geral",
  });
  if (erroUsuario) throw new Error(`falha ao cadastrar o usuario: ${erroUsuario.message}`);
});

test.afterAll(async () => {
  const { data: existentes } = await admin.auth.admin.listUsers();
  for (const u of existentes?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
  await admin.from("usuarios").delete().eq("email", EMAIL);
});

/** Entra pelo formulário, com o destino que se quer exercitar. */
async function entrarCom(page: Page, destino: string) {
  await page.goto(`/login?destino=${encodeURIComponent(destino)}`);
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="senha"]').fill(SENHA);
  await page.getByRole("button", { name: /entrar/i }).click();
}

test.describe("`FR-042` · o retorno NUNCA sai do sistema", () => {
  const hostis = [
    { nome: "relativo ao protocolo", destino: `//${HOSTIL}/` },
    { nome: "com contrabarra", destino: `/\\${HOSTIL}/` },
    { nome: "absoluto de outro domínio", destino: `https://${HOSTIL}/inicio` },
  ];

  for (const { nome, destino } of hostis) {
    test(`destino ${nome} é recusado, e o navegador não sai da aplicação`, async ({ page }) => {
      /*
       * ⚠️ O QUE SE MEDE É TODA NAVEGAÇÃO QUE O QUADRO PRINCIPAL FEZ, e não a barra de endereço num
       * instante. Duas versões anteriores deste caso passaram com a guarda antiga, e por dois
       * motivos diferentes — os dois instrutivos:
       *
       *   1. comparar o nome do host com o domínio hostil dava por aprovada a variante com
       *      contrabarra, que leva a `chrome-error://chromewebdata/`. **A navegação para fora
       *      aconteceu e falhou** por o domínio não resolver; o nome hostil não aparecia.
       *   2. comparar a origem com `expect.poll` passava no PRIMEIRO instante, antes de a navegação
       *      hostil sequer começar. `poll` aprova assim que uma leitura casa — e logo depois do
       *      clique a leitura ainda é a da tela de login.
       *
       * Registrar as navegações e conferir a lista depois resolve as duas: nada escapa por ter
       * acontecido rápido, e nada passa por ter acontecido devagar.
       */
      const navegacoes: string[] = [];
      page.on("framenavigated", (quadro) => {
        if (quadro === page.mainFrame()) navegacoes.push(quadro.url());
      });

      await entrarCom(page, destino);

      // A autenticação terminou quando a sessão existe. É sinal determinístico, não relógio.
      await expect
        .poll(async () => (await page.context().cookies()).some((c) => c.name.startsWith("sb-")), {
          message: "a autenticação não concluiu",
          timeout: 15_000,
        })
        .toBe(true);

      /*
       * ⚠️ E AQUI A ESPERA É O MECANISMO, de propósito. Provar que algo **nunca** acontece exige
       * observar uma janela: sem ela, a ausência é só a leitura ter chegado antes. Dois segundos
       * cobrem a navegação que a guarda antiga dispara — medido.
       */
      await page.waitForTimeout(2000);

      const origemDaAplicacao = new URL(ORIGEM_DA_APLICACAO).origin;
      const foraDaAplicacao = navegacoes.filter((url) => {
        if (url === "about:blank") return false;
        try {
          return new URL(url).origin !== origemDaAplicacao;
        } catch {
          return true;
        }
      });

      expect(
        foraDaAplicacao,
        `o login levou o navegador para fora da aplicação com destino ${destino}`,
      ).toEqual([]);
    });
  }
});

test.describe("controle positivo · o retorno legítimo PRECISA funcionar", () => {
  test("destino interno com parâmetros volta inteiro (`FR-027`)", async ({ page }) => {
    // ⚠️ É o `FR-027` medido de ponta a ponta: o proxy guarda caminho E consulta na ida, e a volta
    // precisa devolver os dois. Uma guarda que só aceitasse o caminho perderia o recorte.
    await entrarCom(page, "/estilo?demo=bravo");

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/estilo");
    expect(new URL(page.url()).searchParams.get("demo")).toBe("bravo");
  });

  test("sem destino, entra e fica no sistema", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="senha"]').fill(SENHA);
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe("/login");
  });
});
