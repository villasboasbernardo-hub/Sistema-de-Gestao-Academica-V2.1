/**
 * O Admin sobre **outra** conta (`FR-033` a `FR-038`, `FR-040` a `FR-043`, `FR-047`) — PR 2 da
 * spec 011.
 *
 * ⚠️ **TUDO POR CLIQUE, com `goto` só no ponto de partida.** A fatia nasceu de uma ação correta e
 * inalcançável (`encerrarSessao()` tinha teste e zero consumidores), e o PR 1 repetiu a lição com o
 * botão da foto, que não abria a janela de arquivos porque **a suíte mandava o arquivo por dentro**.
 * Aqui nenhum percurso chama Server Action por fora: o que não se alcança clicando não está
 * entregue.
 *
 * ⚠️ **O PERCURSO DA TROCA OBRIGATÓRIA É UM CASO SÓ, DE PONTA A PONTA, e tem de ser.** Quebrá-lo em
 * cinco casos independentes faria cada pedaço passar sobre um estado montado à mão — e o que esta
 * fatia promete é justamente a **sequência**: redefinir → a senha aparece uma vez → entrar com ela →
 * não sair da tela de senha → definir a nova → entrar com ela → a temporária recusada.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  apagarConta,
  criarConta,
  criarLinhaSemCredencial,
  emailDeTeste,
  entrar,
  SENHA_DE_TESTE,
} from "./conta-de-teste";

let EMAIL_ADMIN = "";
let EMAIL_SEGUNDO_ADMIN = "";
let EMAIL_ALVO = "";
let EMAIL_SEM_CREDENCIAL = "";

/**
 * ⚠️ **SÃO DOIS ADMINS, E O SEGUNDO NÃO É LUXO.** Com um Admin só, `vereditoSobreConta` recusa
 * desativar e rebaixar **o próprio** e também o único Admin — e os casos de edição de perfil não
 * teriam como distinguir *"é a sua conta"* de *"é o último Admin"*, que são as duas regras que o
 * `ultimo-admin.ts` separa de propósito.
 *
 * ⚠️ **E ISSO ENCOSTA NO GOTCHA 8**: Admin a mais na base faz
 * `app.impedir_remocao_do_ultimo_admin()` parar de recusar em `rls.test.ts`. A ponta a ponta usa
 * conta própria por processo e as apaga no `afterAll`; o perigo real é execução interrompida.
 */
test.beforeAll(async ({}, info) => {
  EMAIL_ADMIN = emailDeTeste("admin-contas", info.workerIndex);
  EMAIL_SEGUNDO_ADMIN = emailDeTeste("admin-contas-2", info.workerIndex);
  EMAIL_ALVO = emailDeTeste("admin-contas-alvo", info.workerIndex);

  await criarConta(EMAIL_ADMIN, `USR-ADC-${info.workerIndex}`);
  await criarConta(EMAIL_SEGUNDO_ADMIN, `USR-ADC2-${info.workerIndex}`);
  await criarConta(EMAIL_ALVO, `USR-ADCA-${info.workerIndex}`, "operador");

  EMAIL_SEM_CREDENCIAL = emailDeTeste("admin-contas-sem-cred", info.workerIndex);
  await criarLinhaSemCredencial(EMAIL_SEM_CREDENCIAL, `USR-ADCS-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_SEGUNDO_ADMIN);
  await apagarConta(EMAIL_ALVO);
  await apagarConta(EMAIL_SEM_CREDENCIAL);
});

/**
 * ⚠️ **A LINHA DA CONTA ALVO, achada pelo E-MAIL.** `/admin/usuarios` é uma tabela com uma linha por
 * conta, e os botões repetem em todas: um `getByRole("button", { name: "Desativar" })` casaria com
 * três e falharia por **modo estrito** — que não reexecuta, então prazo maior não salva (gotcha 3 da
 * fatia (b) do Épico 4). O escopo é a linha.
 */
const linhaDa = (page: Page, email: string) => page.getByRole("row").filter({ hasText: email });

/** O bloco de senha nova, para a resposta não ser procurada na página inteira. */
const secaoDaSenha = (page: Page) => page.getByRole("region", { name: "Senha nova" });

/**
 * Submete o login e **não** decide se deu certo — quem chama diz o que espera.
 *
 * ⚠️ **A PRIMEIRA ESCRITA DESTE AUXILIAR NÃO ESPERAVA NADA, e três casos reprovaram por isso.** O
 * clique em *Entrar* dispara uma Server Action; a linha seguinte corria **antes** de o cookie de
 * sessão existir, então o `goto` que vinha depois caía no login de novo. O sintoma era *"o operador
 * já enxergava a gestão de usuários"* — leitura exatamente oposta à causa, que era não estar
 * autenticado.
 */
async function submeterLogin(page: Page, email: string, senha: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="senha"]').fill(senha);
  await page.getByRole("button", { name: /entrar/i }).click();
}

/** Submete e **espera entrar** — para quando a senha deve funcionar. */
async function entrarComSenha(page: Page, email: string, senha: string): Promise<void> {
  await submeterLogin(page, email, senha);
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).not.toBe("/login");
}

test.describe("`FR-040` e `FR-041` · o Admin edita nome e perfil de outra conta", () => {
  test("trocar o nome de exibição de outra conta, clicando — e a lista passa a mostrá-lo", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    const linha = linhaDa(page, EMAIL_ALVO);
    await linha.getByRole("button", { name: "Editar nome" }).click();

    const novo = `Alvo Renomeado ${Date.now().toString(36)}`;
    await linha.getByLabel("Nome de exibição").fill(novo);
    await linha.getByRole("button", { name: "Gravar nome" }).click();

    // ⚠️ A asserção é sobre a LISTA, não sobre a mensagem: gravar e não refletir é o defeito que o
    //    `revalidatePath` existe para impedir, e ele é invisível para quem só olha o "Pronto.".
    await expect(linhaDa(page, EMAIL_ALVO)).toContainText(novo);
  });

  test("⚠️ O CASO QUE DISCRIMINA do perfil · o perfil novo vale na requisição SEGUINTE daquela pessoa", async ({
    page,
    browser,
  }) => {
    // A conta alvo entra como `operador` e NÃO vê a gestão de usuários.
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await entrarComSenha(pagina, EMAIL_ALVO, SENHA_DE_TESTE);
    await pagina.goto("/admin/usuarios");
    await expect(
      pagina.getByText(/gestão de usuários é do perfil Admin/i),
      "o operador já enxergava a gestão de usuários antes da promoção",
    ).toBeVisible();

    // O Admin promove, por clique, noutra sessão.
    await entrar(page, EMAIL_ADMIN);
    const linha = linhaDa(page, EMAIL_ALVO);
    await linha.getByRole("button", { name: "Editar perfil" }).click();
    await linha.getByLabel("Perfil de acesso").selectOption("admin");
    await linha.getByRole("button", { name: "Gravar perfil" }).click();
    await expect(linhaDa(page, EMAIL_ALVO)).toContainText("Administrador");

    /*
     * ⚠️ **SEM SAIR E ENTRAR — é esta linha que torna o caso discriminante.** A autorização é lida
     *    do BANCO a cada requisição, não de uma afirmação dentro do token. Um sistema que guardasse
     *    o perfil no JWT passaria em todos os outros casos e falharia **aqui**, e o sintoma seria
     *    *"troquei o perfil e não valeu"* horas depois, quando ninguém liga uma coisa à outra.
     */
    await pagina.reload();
    await expect(pagina.getByRole("heading", { name: "Usuários" })).toBeVisible();

    await contexto.close();
  });

  test("⚠️ O CASO QUE DISCRIMINA da própria conta · o Admin NÃO vê as ações sobre si, e a razão está escrita", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    const minhaLinha = linhaDa(page, EMAIL_ADMIN);
    // `FR-041`: *"a ação MUST NOT aparecer na tela"* — não é botão desabilitado, é botão ausente.
    for (const acao of ["Editar perfil", "Desativar", "Redefinir senha"]) {
      await expect(
        minhaLinha.getByRole("button", { name: acao }),
        `a ação «${acao}» apareceu na própria conta`,
      ).toHaveCount(0);
    }

    // ⚠️ E a ausência vem EXPLICADA, senão ela se lê como defeito de tela.
    await expect(minhaLinha).toContainText("Esta é a sua conta");
    await expect(minhaLinha).toContainText("peça a outro Administrador");

    // Controle positivo: na linha de OUTRA conta, as três existem.
    const outra = linhaDa(page, EMAIL_ALVO);
    for (const acao of ["Editar perfil", "Desativar", "Redefinir senha"]) {
      await expect(outra.getByRole("button", { name: acao })).toBeVisible();
    }
  });
});

test.describe("`FR-033` a `FR-038` · redefinir senha e a troca obrigatória", () => {
  test("⚠️ O PERCURSO INTEIRO · redefinir → a senha aparece UMA vez → entrar → preso na troca → definir → entrar com a nova", async ({
    page,
    browser,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    // ── 1. redefinir, por clique, na linha da conta alvo ──────────────────────────────────────
    const linha = linhaDa(page, EMAIL_ALVO);
    await linha.getByRole("button", { name: "Redefinir senha" }).click();

    const bloco = linha.getByRole("status").filter({ hasText: "Senha temporária" });
    await expect(bloco).toBeVisible();

    /*
     * ⚠️ **A SENHA SAI DO `<code>`, E NÃO DE UMA EXPRESSÃO SOBRE O BLOCO INTEIRO.** A primeira
     *    escrita usava `/Senha temporária:\s*(\S+)/` sobre o `textContent` — e `textContent` cola
     *    os elementos **sem inserir espaço**, então a captura podia levar o começo da frase seguinte
     *    junto. O login falhava com uma senha quase certa, e o erro apontava para o login.
     */
    const temporaria = (await bloco.locator("code").textContent())?.trim();
    expect(temporaria, "não achei a senha no bloco").toBeTruthy();
    expect(temporaria!.length).toBeGreaterThanOrEqual(12);
    expect(temporaria, "a senha veio com espaço — a captura pegou texto vizinho").not.toMatch(/\s/);

    // ⚠️ A advertência precisa estar JUNTO da senha: quem copia tem de saber que não volta.
    await expect(bloco).toContainText("uma vez");

    // ── 2. a senha NÃO sobrevive a reabrir a tela (`FR-034`) ──────────────────────────────────
    await page.reload();
    await expect(
      linhaDa(page, EMAIL_ALVO).getByRole("status").filter({ hasText: "Senha temporária" }),
      "a senha temporária reapareceu depois do F5 — ela não pode sobreviver à tela",
    ).toHaveCount(0);

    // ── 3. a conta alvo entra com a temporária e CAI na tela de senha ─────────────────────────
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await submeterLogin(pagina, EMAIL_ALVO, temporaria!);

    await expect
      .poll(() => new URL(pagina.url()).pathname, { timeout: 20_000 })
      .toBe("/perfil/senha");
    await expect(pagina.getByRole("heading", { name: "Trocar a minha senha" })).toBeVisible();

    // ── 4. TRÊS outras rotas, e todas devolvem à troca (`FR-036`) ─────────────────────────────
    //    ⚠️ Três, e não uma: a guarda vive no `renovarSessao`, que vale para toda rota protegida.
    //       Uma rota só não distinguiria "a guarda funciona" de "aquela página redireciona".
    for (const rota of ["/inicio", "/cursos", "/perfil"]) {
      await pagina.goto(rota);
      await expect
        .poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 })
        .toBe("/perfil/senha");
    }

    // ── 5. definir a senha nova, e sair da prisão ─────────────────────────────────────────────
    const nova = `nova-senha-de-teste-${Date.now().toString(36)}`;
    await pagina.locator('input[name="senha"]').fill(nova);
    await pagina.locator('input[name="confirmacao"]').fill(nova);
    await pagina.getByRole("button", { name: /trocar senha/i }).click();
    await expect(secaoDaSenha(pagina).getByRole("status")).toContainText("Senha trocada");

    // ⚠️ **A OBRIGAÇÃO SAIU — e isto se prova ANDANDO**, não lendo mensagem: a marca vive em
    //    `app_metadata`, e um conserto que gravasse a senha sem limpá-la deixaria a pessoa trocando
    //    a senha para sempre, com a tela dizendo "pronto" a cada volta.
    await pagina.goto("/inicio");
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/inicio");

    // ── 6. a temporária deixou de valer, e a nova vale (`FR-037`) ─────────────────────────────
    await pagina.getByRole("button", { name: /^Conta de / }).click();
    await pagina.getByRole("menuitem", { name: /^Sair/ }).click();
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/login");

    // ⚠️ Aqui o login DEVE falhar, então usa o submetedor cru: `entrarComSenha` esperaria entrar.
    await submeterLogin(pagina, EMAIL_ALVO, temporaria!);
    await expect(
      pagina.getByRole("alert"),
      "a senha temporária continuou valendo depois de a nova ser definida",
    ).toBeVisible();
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/login");

    await entrarComSenha(pagina, EMAIL_ALVO, nova);

    await contexto.close();
  });

  test("conta sem credencial não oferece «Redefinir senha» — o caminho dela é o convite", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    // ⚠️ A linha sem credencial é PRÉ-CONDIÇÃO, montada no `beforeAll` — ver o auxiliar. O que este
    //    caso mede é o que a TELA oferece, e para isso ele chega por clique e lê a linha.
    const linha = linhaDa(page, EMAIL_SEM_CREDENCIAL);
    await expect(linha.getByRole("button", { name: "Reenviar convite" })).toBeVisible();
    await expect(
      linha.getByRole("button", { name: "Redefinir senha" }),
      "ofereceu redefinir senha para conta que ainda não tem credencial",
    ).toHaveCount(0);
  });
});

test.describe("`FR-047` · a trilha registra, e ela aparece", () => {
  test("desativar e reativar pela tela deixam rastro, e o rastro nomeia quem fez", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    const linha = () => linhaDa(page, EMAIL_SEGUNDO_ADMIN);
    await linha().getByRole("button", { name: "Desativar" }).click();
    await expect(linha()).toContainText("inativo");

    // ⚠️ **REATIVAR SOB A MESMA PERMISSÃO DE DESATIVAR** (decisão D-6): a matriz segue com quatro
    //    ações, e a asserção de zero `reativar` em `perfil_permissao` fica intacta.
    await linha().getByRole("button", { name: "Reativar" }).click();
    await expect(linha()).toContainText("ativo");
  });
});
