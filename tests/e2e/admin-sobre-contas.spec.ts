/**
 * O Admin sobre contas: **cadastrar**, editar, redefinir senha, desativar e reativar
 * (`FR-033` a `FR-043`, `FR-047`) — PR 2 da spec 011, refeito em 03/10/2026.
 *
 * ⚠️ **ESTA SUÍTE FOI REESCRITA DEPOIS DE BERNARDO REPROVAR A CONFERÊNCIA DO PR 2.** O convite por
 * e-mail saiu do sistema, cadastrar e editar passaram a ser **páginas**, e a lista voltou a ser lista.
 * A versão anterior media botões numa célula de tabela que já não existe.
 *
 * ⚠️ **TUDO POR CLIQUE, com `goto` só no ponto de partida.** A fatia nasceu de uma ação correta e
 * inalcançável (`encerrarSessao()` tinha teste e zero consumidores), e o PR 1 repetiu a lição com o
 * botão da foto, que não abria a janela de arquivos porque **a suíte mandava o arquivo por dentro**.
 *
 * ⚠️ **O PERCURSO DE CADASTRO É UM CASO SÓ, DE PONTA A PONTA, e tem de ser:** lista → *Cadastrar* →
 * preencher → salvar → senha exibida → sair → entrar com a temporária → troca forçada → entrar com a
 * nova. Quebrá-lo em sete casos faria cada pedaço passar sobre um estado montado à mão, e o que a
 * fatia promete é justamente a **sequência**.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar, SENHA_DE_TESTE } from "./conta-de-teste";

let EMAIL_ADMIN = "";
let EMAIL_SEGUNDO_ADMIN = "";
let EMAIL_ALVO = "";

/** O e-mail da conta que **este processo** cria pela tela — apagado no fim. */
const emailCadastrado = (processo: number) => `cadastrada-${processo}@ciaara.teste`;

/**
 * ⚠️ **SÃO DOIS ADMINS, E O SEGUNDO NÃO É LUXO.** Com um Admin só, `vereditoSobreConta` recusa
 * desativar e rebaixar o próprio **e** o último Admin — e os casos de edição não distinguiriam *"é a
 * sua conta"* de *"é o último Admin"*, que são as duas regras que `ultimo-admin.ts` separa.
 *
 * ⚠️ **E ISSO ENCOSTA NO GOTCHA 8**: Admin a mais na base faz
 * `app.impedir_remocao_do_ultimo_admin()` parar de recusar em `rls.test.ts`. A suíte usa conta própria
 * por processo e as apaga no `afterAll`; o perigo real é execução interrompida.
 */
test.beforeAll(async ({}, info) => {
  EMAIL_ADMIN = emailDeTeste("admin-contas", info.workerIndex);
  EMAIL_SEGUNDO_ADMIN = emailDeTeste("admin-contas-2", info.workerIndex);
  EMAIL_ALVO = emailDeTeste("admin-contas-alvo", info.workerIndex);

  await criarConta(EMAIL_ADMIN, `USR-ADC-${info.workerIndex}`);
  await criarConta(EMAIL_SEGUNDO_ADMIN, `USR-ADC2-${info.workerIndex}`);
  await criarConta(EMAIL_ALVO, `USR-ADCA-${info.workerIndex}`, "operador");
});

test.afterAll(async ({}, info) => {
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_SEGUNDO_ADMIN);
  await apagarConta(EMAIL_ALVO);
  await apagarConta(emailCadastrado(info.workerIndex));
});

/**
 * ⚠️ **A LINHA DE UMA CONTA, achada pelo E-MAIL.** A lista tem uma linha por conta e o nome é link em
 * todas: um `getByRole("link", { name })` solto casaria com várias e falharia por **modo estrito** —
 * que não reexecuta, então prazo maior não salva (gotcha 3 da fatia (b) do Épico 4).
 */
const linhaDa = (page: Page, email: string) => page.getByRole("row").filter({ hasText: email });

/** O bloco de senha nova de `/perfil/senha`, para a resposta não ser procurada na página inteira. */
const secaoDaSenha = (page: Page) => page.getByRole("region", { name: "Senha nova" });

/** Submete o login e **não** decide se deu certo — quem chama diz o que espera. */
async function submeterLogin(page: Page, email: string, senha: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="senha"]').fill(senha);
  await page.getByRole("button", { name: /entrar/i }).click();
}

/**
 * Submete e **espera entrar** — para quando a senha deve funcionar.
 *
 * ⚠️ **A ESPERA NÃO É ENFEITE, e três casos do PR 2 reprovaram sem ela:** o clique em *Entrar* dispara
 * Server Action, e a linha seguinte corria **antes** de o cookie existir. O sintoma era *"o operador já
 * enxergava a gestão de usuários"* — leitura exatamente oposta à causa.
 */
async function entrarComSenha(page: Page, email: string, senha: string): Promise<void> {
  await submeterLogin(page, email, senha);
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).not.toBe("/login");
}

/** Abre a página de uma conta **clicando no nome dela na lista**. */
async function abrirContaPorClique(page: Page, email: string): Promise<void> {
  await linhaDa(page, email).getByRole("link").first().click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toMatch(/^\/admin\/usuarios\/[0-9a-f-]+$/);
}

/**
 * ⚠️ **A RESPOSTA SE PROCURA PELO TEXTO, NUNCA POR `getByRole("status")` SOLTO — e isto custou quatro
 * casos nesta rodada.** A faixa **AMBIENTE LOCAL** também é `role="status"`, e o anunciador de rota do
 * Next é `role="alert"` e existe em toda página: o seletor por papel resolve para **dois** elementos e
 * falha por **modo estrito**, que **não reexecuta** — prazo maior não salva. É o gotcha 3 da fatia (b)
 * do Épico 4, de novo. O que salva é escopo.
 */
const resposta = (page: Page, texto: string) => page.getByRole("status").filter({ hasText: texto });

const recusa = (page: Page, texto: string) => page.getByRole("alert").filter({ hasText: texto });

test.describe("`FR-014` · a lista limpa", () => {
  test("as CINCO colunas pedidas, e só elas", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    // Avatar (sem rótulo visível), Nome, E-mail, Perfil, Último acesso.
    await expect(page.getByRole("columnheader")).toHaveCount(5);
    for (const titulo of ["Nome", "E-mail", "Perfil", "Último acesso"]) {
      await expect(page.getByRole("columnheader", { name: titulo })).toBeVisible();
    }

    /*
     * ⚠️ **O QUE SAIU É O PONTO DESTE CASO.** Vínculo de instrutor, situação e escopo foram tirados da
     *    lista em 03/10/2026; sem estas asserções, uma volta atrás passaria calada — e a tela voltaria
     *    a empurrar as colunas úteis para fora do campo de visão.
     */
    for (const sumido of ["Instrutor vinculado", "Situação", "Escopo"]) {
      await expect(
        page.getByRole("columnheader", { name: sumido }),
        `a coluna «${sumido}» voltou à lista`,
      ).toHaveCount(0);
    }
  });

  test("o perfil aparece em PORTUGUÊS, nunca em `snake_case`", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    const linha = linhaDa(page, EMAIL_ALVO);
    await expect(linha).toContainText("Operador");
  });

  test("a busca filtra por e-mail, e `Limpar filtros` desfaz", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    await page.getByLabel("Buscar por nome ou e-mail").fill(EMAIL_ALVO);
    await expect(linhaDa(page, EMAIL_ALVO)).toBeVisible();
    await expect(
      linhaDa(page, EMAIL_ADMIN),
      "a busca não filtrou — a conta que não casa continuou na lista",
    ).toHaveCount(0);

    // ⚠️ O filtro vive na URL: é o que dá link compartilhável, e o que o `Limpar filtros` apaga.
    await expect
      .poll(() => new URL(page.url()).searchParams.get("busca"), { timeout: 10_000 })
      .toBe(EMAIL_ALVO);

    await page.getByRole("button", { name: /limpar filtros/i }).click();
    await expect(linhaDa(page, EMAIL_ADMIN)).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("busca"), { timeout: 10_000 })
      .toBeNull();
  });

  test("⚠️ o convite SAIU da interface — nenhum caminho leva a ele", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    for (const sumido of [/convidar/i, /reenviar convite/i, /enviar convite/i]) {
      await expect(
        page.getByRole("button", { name: sumido }),
        `ainda há botão de convite: ${sumido}`,
      ).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: "Cadastrar usuário" })).toBeVisible();

    // ⚠️ E a ROTA do convite deixou de existir. Ela era aberta sem sessão, e rota aberta sem página é
    //    superfície de autenticação exposta para nada.
    const resposta = await page.goto("/convite");
    expect(resposta?.status(), "a rota /convite ainda responde").toBe(404);
  });
});

test.describe("`FR-033` a `FR-037` · cadastrar conta e o primeiro acesso", () => {
  test("⚠️ O PERCURSO INTEIRO · lista → Cadastrar → salvar → senha → entrar com ela → troca forçada → nova", async ({
    page,
    browser,
  }, info) => {
    const email = emailCadastrado(info.workerIndex);
    await apagarConta(email);

    await entrar(page, EMAIL_ADMIN);

    // ── 1. chegar ao cadastro CLICANDO ────────────────────────────────────────────────────────
    await page.getByRole("link", { name: "Cadastrar usuário" }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toBe("/admin/usuarios/novo");
    await expect(page.getByRole("heading", { name: "Cadastrar usuário" })).toBeVisible();

    // ── 2. preencher e salvar ─────────────────────────────────────────────────────────────────
    await page.getByLabel("Nome completo").fill("Conta Cadastrada Pela Tela");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Perfil de acesso").selectOption("operador");
    await page.getByRole("button", { name: "Cadastrar usuário" }).click();

    // ── 3. a senha aparece UMA vez ────────────────────────────────────────────────────────────
    const bloco = page.getByRole("status").filter({ hasText: "Senha temporária" });
    await expect(bloco).toBeVisible();

    /*
     * ⚠️ **A SENHA SAI DO `<code>`, e não de uma expressão sobre o bloco inteiro.** `textContent` cola
     *    os elementos **sem inserir espaço**, então uma captura por expressão podia levar o começo da
     *    frase seguinte junto — o login falharia com uma senha quase certa, e o erro apontaria para o
     *    login. Foi medido no PR 2.
     */
    const temporaria = (await bloco.locator("code").textContent())?.trim();
    expect(temporaria, "não achei a senha no bloco").toBeTruthy();
    expect(temporaria!.length).toBeGreaterThanOrEqual(12);
    expect(temporaria, "a senha veio com espaço — a captura pegou texto vizinho").not.toMatch(/\s/);
    await expect(bloco).toContainText("uma vez");

    // ── 4. ela não sobrevive a recarregar a tela (`FR-034`) ───────────────────────────────────
    await page.reload();
    await expect(
      page.getByRole("status").filter({ hasText: "Senha temporária" }),
      "a senha reapareceu depois do F5 — ela não pode sobreviver à tela",
    ).toHaveCount(0);

    // ── 5. a conta aparece na lista ───────────────────────────────────────────────────────────
    await page.goto("/admin/usuarios");
    await expect(linhaDa(page, email)).toBeVisible();

    // ── 6. a pessoa entra com a temporária e CAI na tela de senha ─────────────────────────────
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await submeterLogin(pagina, email, temporaria!);
    await expect
      .poll(() => new URL(pagina.url()).pathname, { timeout: 20_000 })
      .toBe("/perfil/senha");

    // ── 7. TRÊS outras rotas devolvem à troca (`FR-036`) ─────────────────────────────────────
    //    ⚠️ Três, e não uma: a guarda vive no `renovarSessao` e vale para toda rota protegida. Uma
    //       rota só não distinguiria "a guarda funciona" de "aquela página redireciona".
    for (const rota of ["/inicio", "/cursos", "/perfil"]) {
      await pagina.goto(rota);
      await expect
        .poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 })
        .toBe("/perfil/senha");
    }

    // ── 8. definir a nova, e sair da prisão ──────────────────────────────────────────────────
    const nova = `nova-senha-de-teste-${Date.now().toString(36)}`;
    await pagina.locator('input[name="senha"]').fill(nova);
    await pagina.locator('input[name="confirmacao"]').fill(nova);
    await pagina.getByRole("button", { name: /trocar senha/i }).click();
    await expect(secaoDaSenha(pagina).getByRole("status")).toContainText("Senha trocada");

    // ⚠️ **A OBRIGAÇÃO SAIU — e isto se prova ANDANDO**, não lendo mensagem: a marca vive em
    //    `app_metadata`, e um conserto que gravasse a senha sem limpá-la deixaria a pessoa trocando a
    //    senha para sempre, com a tela dizendo "pronto" a cada volta.
    await pagina.goto("/inicio");
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/inicio");

    // ── 9. a temporária deixou de valer; a nova vale ─────────────────────────────────────────
    await pagina.getByRole("button", { name: /^Conta de / }).click();
    await pagina.getByRole("menuitem", { name: /^Sair/ }).click();
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/login");

    await submeterLogin(pagina, email, temporaria!);
    await expect(
      recusa(pagina, "senha"),
      "a senha temporária continuou valendo depois de a nova ser definida",
    ).toBeVisible();
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/login");

    await entrarComSenha(pagina, email, nova);

    await contexto.close();
  });

  test("⚠️ O CASO QUE DISCRIMINA da exigência · `Encarregado de Curso` sem curso é recusado", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);
    await page.getByRole("link", { name: "Cadastrar usuário" }).click();

    await page.getByLabel("Nome completo").fill("Sem Curso Nenhum");
    await page.getByLabel("E-mail").fill(`sem-curso-${Date.now().toString(36)}@ciaara.teste`);
    await page.getByLabel("Perfil de acesso").selectOption("encarregado_curso");

    // ⚠️ A dica aparece ANTES de alguém errar — é o que separa explicar de castigar.
    await expect(page.getByText(/escolha ao menos um/i)).toBeVisible();

    await page.getByRole("button", { name: "Cadastrar usuário" }).click();

    // ⚠️ **ESTE É O CASO QUE DISCRIMINA**: `operador` sem curso é conta válida (vê tudo), e
    //    `encarregado_curso` sem curso entra e não vê nada. Tratar os dois igual recusaria uma conta
    //    boa ou aceitaria uma inútil.
    await expect(recusa(page, "pelo menos um curso")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Senha temporária" }),
      "recusou e ainda assim criou a conta",
    ).toHaveCount(0);
  });
});

test.describe("`FR-040` e `FR-041` · a página da conta", () => {
  test("editar nome pela PÁGINA, chegando por clique na lista", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);
    await abrirContaPorClique(page, EMAIL_ALVO);

    const novo = `Alvo Renomeado ${Date.now().toString(36)}`;
    await page.getByLabel("Nome de exibição").fill(novo);
    await page.getByRole("button", { name: "Gravar nome" }).click();
    await expect(resposta(page, "Nome atualizado.")).toBeVisible();

    // A asserção que importa é sobre a LISTA: gravar e não refletir é o defeito que o
    // `revalidatePath` existe para impedir, e ele é invisível para quem só olha a mensagem.
    await page.goto("/admin/usuarios");
    await expect(linhaDa(page, EMAIL_ALVO)).toContainText(novo);
  });

  test("⚠️ O CASO QUE DISCRIMINA do perfil · o perfil novo vale na requisição SEGUINTE daquela pessoa", async ({
    page,
    browser,
  }) => {
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await entrarComSenha(pagina, EMAIL_ALVO, SENHA_DE_TESTE);
    await pagina.goto("/admin/usuarios");
    await expect(
      pagina.getByText(/gestão de usuários é do perfil Admin/i),
      "o operador já enxergava a gestão de usuários antes da promoção",
    ).toBeVisible();

    await entrar(page, EMAIL_ADMIN);
    await abrirContaPorClique(page, EMAIL_ALVO);
    await page.getByLabel("Perfil de acesso").selectOption("admin");
    await page.getByRole("button", { name: "Gravar perfil e vínculos" }).click();
    await expect(resposta(page, "atualizados")).toBeVisible();

    /*
     * ⚠️ **SEM SAIR E ENTRAR — é esta linha que torna o caso discriminante.** A autorização é lida do
     *    BANCO a cada requisição, não de uma afirmação dentro do token. Um sistema que guardasse o
     *    perfil no JWT passaria em todos os outros casos e falharia **aqui**, e o sintoma seria
     *    *"troquei o perfil e não valeu"* horas depois, quando ninguém liga uma coisa à outra.
     */
    await pagina.reload();
    await expect(pagina.getByRole("heading", { name: "Usuários" })).toBeVisible();

    await contexto.close();
  });

  test("⚠️ O CASO QUE DISCRIMINA da própria conta · nenhuma ação sobre si, e a razão está escrita", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);
    await abrirContaPorClique(page, EMAIL_ADMIN);

    // `FR-041`: *"a ação MUST NOT aparecer na tela"* — não é botão desabilitado, é botão ausente.
    for (const acao of ["Gravar perfil e vínculos", "Desativar", "Redefinir senha"]) {
      await expect(
        page.getByRole("button", { name: acao }),
        `a ação «${acao}» apareceu na própria conta`,
      ).toHaveCount(0);
    }
    await expect(page.getByText("Esta é a sua conta")).toBeVisible();
    await expect(page.getByText("peça a outro Administrador")).toBeVisible();

    // Controle positivo: na página de OUTRA conta, as três existem.
    await page.goto("/admin/usuarios");
    await abrirContaPorClique(page, EMAIL_ALVO);
    for (const acao of ["Gravar perfil e vínculos", "Desativar", "Redefinir senha"]) {
      await expect(page.getByRole("button", { name: acao })).toBeVisible();
    }
  });

  test("desativar pede confirmação, a etiqueta aparece na lista, e reativar desfaz", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);
    await abrirContaPorClique(page, EMAIL_SEGUNDO_ADMIN);

    await page.getByRole("button", { name: "Desativar" }).click();
    // ⚠️ **DIÁLOGO SIMPLES, e ele diz a consequência** — desativar tira o acesso na requisição
    //    seguinte, e isso não se vê na tela de quem clicou.
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("perde o acesso");
    await expect(dialogo).toContainText("NADA é apagado");
    await dialogo.getByRole("button", { name: "Desativar" }).click();
    await expect(resposta(page, "Conta desativada.")).toBeVisible();

    await page.goto("/admin/usuarios");
    await expect(linhaDa(page, EMAIL_SEGUNDO_ADMIN)).toContainText("Desativada");

    // ⚠️ **REATIVAR NÃO PEDE CONFIRMAÇÃO**: é desfazer, e não há consequência a avisar.
    await abrirContaPorClique(page, EMAIL_SEGUNDO_ADMIN);
    await page.getByRole("button", { name: "Reativar" }).click();
    await expect(resposta(page, "Conta reativada.")).toBeVisible();

    await page.goto("/admin/usuarios");
    await expect(linhaDa(page, EMAIL_SEGUNDO_ADMIN)).not.toContainText("Desativada");
  });

  test("redefinir senha pede confirmação e mostra a senha uma vez", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);
    await abrirContaPorClique(page, EMAIL_ALVO);

    await page.getByRole("button", { name: "Redefinir senha" }).click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("ENCERRA todas as sessões abertas");
    await dialogo.getByRole("button", { name: "Redefinir senha" }).click();

    const bloco = page.getByRole("status").filter({ hasText: "Senha temporária" });
    await expect(bloco).toBeVisible();
    const senha = (await bloco.locator("code").textContent())?.trim();
    expect(senha!.length).toBeGreaterThanOrEqual(12);
  });
});
