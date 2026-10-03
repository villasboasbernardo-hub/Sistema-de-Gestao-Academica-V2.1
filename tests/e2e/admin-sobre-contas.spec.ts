/**
 * O Admin sobre contas: **cadastrar**, editar, redefinir senha, desativar e reativar
 * (`FR-033` a `FR-043`, `FR-047`) — PR 2 da spec 011, refeito em 03/10/2026.
 *
 * ⚠️ **ESTA SUÍTE FOI REESCRITA DEPOIS DE BERNARDO REPROVAR A CONFERÊNCIA DO PR 2.** O convite por
 * e-mail saiu do sistema, cadastrar e editar passaram a ser **páginas**, e a lista voltou a ser lista.
 * A versão anterior media botões numa célula de tabela que já não existe.
 *
 * ⚠️ **E AJUSTADA DE NOVO EM 03/10/2026, pelas decisões D-USR-1 a D-USR-6.** Duas mudanças de forma:
 * a linha passou a ter **quatro** ações, começando por **Editar** (D-USR-6), e a confirmação da
 * exclusão ficou **simples, sem campo para digitar** (D-USR-4). ⚠️ **O caso que provava o campo foi
 * APAGADO, não reescrito** — ele existia para medir o contrário do que passou a valer.
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

import { createClient } from "@supabase/supabase-js";

import {
  apagarConta,
  chaveLocal,
  contasDoAuth,
  criarConta,
  emailDeTeste,
  entrar,
  SENHA_DE_TESTE,
} from "./conta-de-teste";

/**
 * Cliente de privilégio elevado — **só para MONTAR estado de partida**, nunca para asserção.
 *
 * ⚠️ **ELE EXISTE PARA REPRODUZIR OS DOIS ESTADOS QUE O REMOTO TEM E A TELA NÃO SABE CRIAR:**
 * cadastro **sem** `auth_user_id` com a credencial ainda em `auth.users` (o que o convite antigo
 * deixava), e e-mail de uma conta que é a **credencial de outra**. Medidos no remoto em 03/10/2026:
 * das 5 contas reais, **4 não têm credencial**, e o e-mail de `USR-02` é o login de `USR-ADMIN-001`.
 * ⚠️ **O PERCURSO continua por clique** — o que vem por fora é só o estado de partida, que nenhuma
 * tela produz.
 */
const servico = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

    // Avatar (sem rótulo visível), Nome, E-mail, Perfil, Último acesso, Ações.
    // ⚠️ **ERAM CINCO ATÉ 03/10/2026**, quando Bernardo pediu as três ações de volta à linha.
    //    A contagem subiu para SEIS, e as três colunas que ele tirou continuam fora.
    await expect(page.getByRole("columnheader")).toHaveCount(6);
    for (const titulo of ["Nome", "E-mail", "Perfil", "Último acesso", "Ações"]) {
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

test.describe("`FR-046` e `D-USR-6` · as quatro ações da linha, e a exclusão permanente", () => {
  /*
   * ⚠️ **ESTE CASO AGE SOBRE O SEGUNDO ADMIN, E NÃO SOBRE O ALVO — e a troca é conserto de uma
   *    interferência medida.** Ele redefinia a senha de `EMAIL_ALVO`, e o caso do perfil, adiante,
   *    **entra** com aquela conta usando `SENHA_DE_TESTE`: a redefinição a invalidava, e o caso
   *    seguinte reprovava por não conseguir autenticar. ⚠️ **O sintoma apontava para o lugar errado**
   *    — parecia que a promoção de perfil tinha deixado de valer. Nenhuma conta deste arquivo entra
   *    com a senha do segundo Admin, então aqui a redefinição não atravessa o caminho de ninguém.
   */
  test("redefinir senha PELA LISTA, com diálogo, e a senha aparece uma vez", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    const linha = linhaDa(page, EMAIL_SEGUNDO_ADMIN);
    await linha.getByRole("button", { name: "Redefinir senha" }).click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("ENCERRA todas as sessões abertas");
    await dialogo.getByRole("button", { name: "Redefinir senha" }).click();

    const bloco = linhaDa(page, EMAIL_SEGUNDO_ADMIN)
      .getByRole("status")
      .filter({ hasText: "Senha temporária" });
    await expect(bloco).toBeVisible();
    const senha = (await bloco.locator("code").textContent())?.trim();
    expect(senha!.length).toBeGreaterThanOrEqual(12);
  });

  test("desativar e reativar PELA LISTA — e o diálogo diz que NÃO é exclusão", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    const linha = () => linhaDa(page, EMAIL_SEGUNDO_ADMIN);
    await linha().getByRole("button", { name: "Desativar" }).click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("perde o acesso");
    // ⚠️ **A FRASE SEPARA AS DUAS AÇÕES, e é o pedido de Bernardo:** desativar bloqueia o acesso e
    //    mantém cadastro e perfil; excluir não tem desfazer. O diálogo diz isso em voz alta.
    await expect(dialogo).toContainText("NÃO é exclusão");
    await dialogo.getByRole("button", { name: "Desativar" }).click();

    await expect(linha()).toContainText("Desativada");

    // ⚠️ Reativar NÃO pede confirmação — é desfazer, e não há consequência a avisar.
    await linha().getByRole("button", { name: "Reativar" }).click();
    // ⚠️ **A RESPOSTA APARECE EM DOIS LUGARES desde 03/10/2026** — na linha e no bloco acima da
    //    tabela —, então o seletor por papel resolve para dois e falha por modo estrito. A
    //    asserção é sobre o bloco de cima, que é o que garante que ninguém perde a mensagem.
    await expect(page.locator('[data-slot="aviso-da-lista"]')).toContainText("Conta reativada.");
    await expect(linha()).not.toContainText("Desativada");
  });

  /**
   * ⚠️ **A METADE QUE FALTAVA DA T029, e ela é a que vale:** o caso acima prova que a LISTA muda;
   * este prova que **o acesso muda**. Sem ele, "Desativada" podia ser uma etiqueta decorativa — e a
   * promessa do diálogo (*"perde o acesso"*) ficaria sem nada que a sustentasse.
   *
   * ⚠️ **O QUE BARRA NÃO É A CREDENCIAL:** o Auth não sabe de `usuarios.status`, então o login
   * **autentica** com a senha de sempre. Quem barra é o cadastro, e **medido em 03/10/2026 ele barra
   * por DOIS caminhos independentes**: `usuarioDaSessao()` filtra `status = 'ativo'` em TypeScript, e
   * no banco `app.usuario_atual()` e `app.perfil_atual()` filtram o mesmo — sem elas a policy
   * `usuarios_ler` não casa e a linha nem volta.
   *
   * ⚠️ **E ISSO MUDOU COMO O DEFEITO DELIBERADO TEVE DE SER PLANTADO, que é o achado:** tirar **só** o
   * filtro do TypeScript deixa o caso **VERDE**, e tirar **só** o do banco também — cada metade sozinha
   * ainda nega. Ele só fica vermelho (`/inicio` onde se espera `/login`) com **as duas** fora. São duas
   * defesas de verdade, não uma com cópia; é o mesmo formato da T033 da fatia (b), e quem concluísse
   * *"o teste não discrimina"* depois de plantar uma metade estaria lendo o contrário do fato.
   */
  test("⚠️ O CASO QUE DISCRIMINA · desativar TIRA O ACESSO, e reativar o devolve sem recadastrar", async ({
    page,
    browser,
  }, info) => {
    const email = `acesso-${info.workerIndex}@ciaara.teste`;
    await apagarConta(email);
    await criarConta(email, `USR-ACS-${info.workerIndex}`, "operador");

    // Controle positivo PRIMEIRO: ela entra. Sem isto, "não entrou" não distingue conta desativada
    // de conta que nunca conseguiu entrar.
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await entrarComSenha(pagina, email, SENHA_DE_TESTE);

    await entrar(page, EMAIL_ADMIN);
    await linhaDa(page, email).getByRole("button", { name: "Desativar" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Desativar" }).click();
    await expect(linhaDa(page, email)).toContainText("Desativada");

    // ⚠️ **NA REQUISIÇÃO SEGUINTE, com o mesmo navegador e o mesmo cookie** — a autorização é lida
    //    do banco a cada pedido, e não de uma afirmação guardada no token.
    await pagina.goto("/inicio");
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 20_000 }).toBe("/login");

    await linhaDa(page, email).getByRole("button", { name: "Reativar" }).click();
    await expect(linhaDa(page, email)).not.toContainText("Desativada");

    // E o acesso volta **sem recadastrar nem redefinir senha**: desativar guarda o cadastro.
    await entrarComSenha(pagina, email, SENHA_DE_TESTE);
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 20_000 }).not.toBe("/login");

    await contexto.close();
    await apagarConta(email);
  });

  /** A senha que o cadastro acabou de mostrar, lida do bloco de status. */
  async function senhaMostrada(page: Page): Promise<string> {
    const bloco = page.getByRole("status").filter({ hasText: "Senha temporária" });
    await expect(bloco).toBeVisible();
    const valor = (await bloco.locator("code").textContent())?.trim();
    expect(valor, "o cadastro não mostrou senha").toBeTruthy();
    return valor!;
  }

  /** Cadastra uma conta **por clique**, do zero, e devolve a senha temporária. */
  async function cadastrarPorClique(page: Page, email: string, nome: string): Promise<string> {
    await page.goto("/admin/usuarios");
    await page.getByRole("link", { name: "Cadastrar usuário" }).click();
    await page.getByLabel("Nome completo").fill(nome);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Cadastrar usuário" }).click();
    return senhaMostrada(page);
  }

  test("⚠️ O CASO QUE DISCRIMINA · conta SEM registro nenhum sai INTEIRA, e o e-mail volta a servir", async ({
    page,
    browser,
  }, info) => {
    const email = `excluir-sem-rastro-${info.workerIndex}@ciaara.teste`;
    await apagarConta(email);

    await entrar(page, EMAIL_ADMIN);
    const senhaAntiga = await cadastrarPorClique(page, email, "Vai Sair Inteira");

    await page.goto("/admin/usuarios");
    await linhaDa(page, email).getByRole("button", { name: "Excluir" }).click();

    const dialogo = page.getByRole("alertdialog");
    // ⚠️ **A PERGUNTA NOMEIA A CONTA E O E-MAIL** (D-USR-4), e é ela que faz o trabalho que o campo
    //    digitado fazia: quem abriu na linha errada lê o nome errado na primeira linha do cartão.
    await expect(dialogo).toContainText("Vai Sair Inteira");
    await expect(dialogo).toContainText(email);
    await expect(dialogo).toContainText("A exclusão é permanente.");
    /*
     * ⚠️ **O DISCRIMINANTE DOS DOIS CAMINHOS SAIU DO DIÁLOGO E FICOU NO AVISO** (D-USR-4: o cartão é
     *    simples). Ele continua sendo provado, logo abaixo, por `?excluida=apagada` e pela frase
     *    "saiu inteira" — o que mudou é ONDE a distinção aparece, não se ela existe.
     */
    await dialogo.getByRole("button", { name: "Excluir" }).click();

    // ⚠️ O aviso vem da URL, fora da tabela: a linha que disparou a ação já não existe.
    await expect(resposta(page, "saiu inteira")).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("excluida"), { timeout: 10_000 })
      .toBe("apagada");
    await expect(linhaDa(page, email)).toHaveCount(0);

    // A credencial foi apagada: a senha que funcionava deixou de funcionar.
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await submeterLogin(pagina, email, senhaAntiga);
    await expect.poll(() => new URL(pagina.url()).pathname, { timeout: 15_000 }).toBe("/login");
    await contexto.close();

    // ⚠️ **E O E-MAIL VOLTA A SERVIR** — é requisito, e é o que distingue excluir de desativar.
    await cadastrarPorClique(page, email, "Mesmo E-mail De Novo");
    await apagarConta(email);
  });

  test("⚠️ O CASO QUE DISCRIMINA · conta COM registro vira «Conta excluída», sai da lista e libera o e-mail", async ({
    page,
    browser,
  }, info) => {
    const email = `excluir-com-rastro-${info.workerIndex}@ciaara.teste`;
    await apagarConta(email);

    await entrar(page, EMAIL_ADMIN);
    const temporaria = await cadastrarPorClique(page, email, "Vai Ficar Anonima");

    /*
     * ⚠️ **A CONTA PRECISA TER CARIMBADO ALGO, E ELA MESMA CARIMBA — não eu por fora.** Ela entra
     *    com a temporária e define a senha nova; `trocarPropriaSenha` deixa `editado_por` na própria
     *    linha. Montar o rastro por script provaria um caminho que não é o real.
     */
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();
    await submeterLogin(pagina, email, temporaria);
    await expect
      .poll(() => new URL(pagina.url()).pathname, { timeout: 20_000 })
      .toBe("/perfil/senha");
    const nova = `nova-senha-de-teste-${Date.now().toString(36)}`;
    await pagina.locator('input[name="senha"]').fill(nova);
    await pagina.locator('input[name="confirmacao"]').fill(nova);
    await pagina.getByRole("button", { name: /trocar senha/i }).click();
    await expect(secaoDaSenha(pagina).getByRole("status")).toContainText("Senha trocada");
    await contexto.close();

    // Agora ela carimbou — e o aviso da exclusão tem de dizer o OUTRO caminho.
    await page.goto("/admin/usuarios");
    await linhaDa(page, email).getByRole("button", { name: "Excluir" }).click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toContainText("Vai Ficar Anonima");
    await expect(dialogo).toContainText(email);
    await expect(dialogo).toContainText("A exclusão é permanente.");
    await dialogo.getByRole("button", { name: "Excluir" }).click();

    await expect(resposta(page, "saiu da lista")).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("excluida"), { timeout: 10_000 })
      .toBe("anonimizada");
    await expect(linhaDa(page, email), "a conta excluída continuou na lista").toHaveCount(0);

    // ⚠️ E ela não entra mais: a credencial foi apagada de vez.
    const outro = await browser.newContext();
    const pagina2 = await outro.newPage();
    await submeterLogin(pagina2, email, nova);
    await expect.poll(() => new URL(pagina2.url()).pathname, { timeout: 15_000 }).toBe("/login");
    await outro.close();

    // ⚠️ **E O E-MAIL VOLTA A SERVIR, mesmo com a linha antiga ainda no banco** — é o que o
    //    sentinela `.invalid` da anonimização existe para permitir.
    await cadastrarPorClique(page, email, "Reaproveitou O E-mail");
    await apagarConta(email);
  });

  /**
   * `D-USR-3` · **a credencial ÓRFÃ sai com a exclusão, e o endereço volta a servir.**
   *
   * ⚠️ **ESTE É O ESTADO DE 4 DAS 5 CONTAS REAIS**, medido no remoto em 03/10/2026, só por leitura:
   * cadastro **sem** `auth_user_id`. Ele é o que o `convidar` removido deixava — passo 1 gravava a
   * linha, passo 2 não emitia o convite — e é o que a própria exclusão deixa se o passo 2 falhar.
   *
   * ⚠️ **ERA AQUI QUE A TELA MENTIA.** O passo 2 da exclusão é guardado por `if (alvo.auth_user_id)`,
   * então com a coluna nula ele **nunca rodava**: a credencial ficava em `auth.users` prendendo o
   * e-mail, enquanto o aviso prometia que o endereço estava livre para um novo cadastro. O cadastro
   * seguinte reprovava com `email_exists`, e **nenhuma tela destravava** — só o painel do Supabase.
   */
  test("⚠️ O CASO QUE DISCRIMINA · credencial ÓRFÃ presa no e-mail sai com a exclusão", async ({
    page,
  }, info) => {
    const email = `orfa-${info.workerIndex}@ciaara.teste`;
    await apagarConta(email);
    await criarConta(email, `USR-ORF-${info.workerIndex}`, "visualizacao");

    // O estado de partida: a linha perde o vínculo, e a credencial FICA.
    await servico.from("usuarios").update({ auth_user_id: null }).eq("email", email);

    // Controle positivo — sem ele, "zero credenciais no fim" não distingue conserto de ausência.
    expect(await contasDoAuth(email), "a credencial não existia antes de excluir").toHaveLength(1);

    await entrar(page, EMAIL_ADMIN);
    await linhaDa(page, email).getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("excluida"), { timeout: 10_000 })
      .toBe("apagada");

    // ⚠️ **A ASSERÇÃO QUE ESTAVA VERMELHA ANTES DO CONSERTO.**
    await expect.poll(async () => (await contasDoAuth(email)).length, { timeout: 15_000 }).toBe(0);

    // E o endereço volta a servir de verdade — por clique, não por consulta.
    await cadastrarPorClique(page, email, "Depois Da Orfa");
    await apagarConta(email);
  });

  /**
   * `D-USR-3` · **e-mail que é a credencial de OUTRA conta: a exclusão não o libera, e diz isso.**
   *
   * ⚠️ **ESTE É O ESTADO DE `USR-02` NO REMOTO**, medido em 03/10/2026: a linha dela traz **sem
   * credencial** um e-mail que é o login de `USR-ADMIN-001` — cuja própria linha mostra um sentinela
   * `@ciaara11.invalid`. É a **única** credencial que entra no sistema. ⚠️ **O endereço real não é
   * escrito aqui:** o repositório é público, e as contas se nomeiam pelo **código**.
   *
   * ⚠️ **APAGAR AQUELA CREDENCIAL POR COINCIDÊNCIA DE E-MAIL DERRUBARIA O ACESSO DE QUEM NÃO PEDIU
   * NADA**, e é por isso que `credencialPeloEmail` distingue órfã de em uso. O que a exclusão faz
   * aqui é concluir **sem** liberar o endereço — e o aviso diz exatamente isso, em vez de prometer o
   * contrário.
   */
  test("⚠️ O CASO QUE DISCRIMINA · credencial EM USO por outra conta é preservada, e o aviso avisa", async ({
    page,
  }, info) => {
    const disputado = `disputado-${info.workerIndex}@ciaara.teste`;
    const sentinela = `dona-da-credencial-${info.workerIndex}@ciaara.teste`;
    const codigoDaDona = `USR-DON-${info.workerIndex}`;
    const codigoDaOutra = `USR-OUT-${info.workerIndex}`;

    await apagarConta(disputado);
    await apagarConta(sentinela);
    await servico.from("usuarios").delete().in("codigo", [codigoDaDona, codigoDaOutra]);

    /*
     * A dona nasce com o e-mail disputado — é ela que fica com a CREDENCIAL —, e depois a linha dela
     * passa a mostrar outro endereço. É o retrato de `USR-ADMIN-001`: credencial num e-mail, linha
     * noutro.
     */
    await criarConta(disputado, codigoDaDona, "visualizacao");
    await servico.from("usuarios").update({ email: sentinela }).eq("codigo", codigoDaDona);

    // E a segunda linha reivindica o endereço, sem credencial nenhuma. É o retrato de `USR-02`.
    await servico.from("usuarios").insert({
      codigo: codigoDaOutra,
      email: disputado,
      nome: "Reivindica O E-mail",
      perfil: "visualizacao",
      escopo_curso: "geral",
    });

    await entrar(page, EMAIL_ADMIN);
    await linhaDa(page, disputado).getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();

    // ⚠️ A exclusão CONCLUI — ela não falha por isto —, e o aviso é o terceiro, não o primeiro.
    await expect
      .poll(() => new URL(page.url()).searchParams.get("excluida"), { timeout: 10_000 })
      .toBe("apagada_email_em_uso");
    await expect(resposta(page, "NÃO ficou livre")).toBeVisible();

    // ⚠️ **E A CREDENCIAL DA OUTRA CONTA CONTINUA LÁ** — é o que protege o acesso de quem não pediu.
    expect(
      await contasDoAuth(disputado),
      "a credencial de outra conta foi apagada por coincidência de e-mail",
    ).toHaveLength(1);

    // A dona continua na lista, com o endereço dela.
    await expect(linhaDa(page, sentinela)).toBeVisible();

    await apagarConta(disputado);
    await apagarConta(sentinela);
    await servico.from("usuarios").delete().in("codigo", [codigoDaDona, codigoDaOutra]);
  });

  test("a própria conta não tem ações na linha, e a razão está escrita", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN);

    const minha = linhaDa(page, EMAIL_ADMIN);
    for (const acao of ["Excluir", "Desativar", "Redefinir senha"]) {
      await expect(
        minha.getByRole("button", { name: acao }),
        `a ação «${acao}» apareceu na própria linha`,
      ).toHaveCount(0);
    }
    /*
     * ⚠️ **O «EDITAR» PRECISA DE ASSERÇÃO SEPARADA, porque ele é LINK e não botão.** O laço acima
     *    varre `getByRole("button")` e passaria com o «Editar» de volta na própria linha — que é
     *    exatamente o caminho para uma tela que recusa editar.
     */
    await expect(
      minha.getByRole("link", { name: "Editar" }),
      "o «Editar» apareceu na própria linha",
    ).toHaveCount(0);
    await expect(minha).toContainText("sua conta");

    // Controle positivo: na linha de OUTRA conta, as quatro existem.
    const outra = linhaDa(page, EMAIL_ALVO);
    for (const acao of ["Excluir", "Desativar", "Redefinir senha"]) {
      await expect(outra.getByRole("button", { name: acao })).toBeVisible();
    }
    await expect(outra.getByRole("link", { name: "Editar" })).toBeVisible();
  });
});

test.describe("`FR-046` · a falha de uma ação destrutiva é VISÍVEL", () => {
  /**
   * ⚠️ **ESTE CASO REPRODUZ O DEFEITO QUE BERNARDO ENCONTROU NO PREVIEW EM 03/10/2026:** ele clicou em
   * *Excluir* e a conta não saiu da lista. Medido no remoto, só por leitura: **nenhuma linha `excluir`
   * na trilha** — e `excluir_conta` grava o rastro **antes** de tocar na linha —, **`excluida_em` nulo
   * nas cinco contas**, todas intactas. **Nada foi excluído**, então não era filtro de lista nem falta
   * de revalidação: a ação falhou, e a falha ficou **invisível**.
   *
   * ⚠️ **ELE MEDE A VISIBILIDADE, e não o caminho felizizar.** A falha era texto de 11px **dentro da
   * linha que não mudou** — que é exatamente o que "não aconteceu nada" parece. Agora a resposta
   * aparece **acima da tabela**, onde a linha pode desaparecer sem levar a mensagem com ela.
   *
   * ⚠️ **A RECUSA ESCOLHIDA É REAL, não encenada:** excluir o **último Admin ativo** é recusado pela
   * regra pura e pelo porteiro do banco. Qualquer outra falha da ação chega pelo mesmo caminho.
   */
  test("⚠️ O CASO QUE DISCRIMINA · a falha aparece ACIMA da tabela, não dentro da linha", async ({
    page,
  }, info) => {
    const email = `falha-visivel-${info.workerIndex}@ciaara.teste`;
    await apagarConta(email);
    await criarConta(email, `USR-FAL-${info.workerIndex}`, "visualizacao");

    await entrar(page, EMAIL_ADMIN);
    const linha = linhaDa(page, email);
    await linha.getByRole("button", { name: "Excluir" }).click();

    const dialogo = page.getByRole("alertdialog");

    /*
     * ⚠️ **A FALHA É REAL E DETERMINÍSTICA: a conta deixa de existir enquanto o diálogo está aberto.**
     *    É a corrida de dois administradores na mesma lista, e é o caminho por onde **qualquer** falha
     *    da ação chega à tela. Encenar a recusa do último Admin não serviria: com o operador também
     *    sendo Admin, o alvo nunca é o último — eu tentei, e o cenário simplesmente não recusava.
     */
    await apagarConta(email);
    await dialogo.getByRole("button", { name: "Excluir" }).click();

    /*
     * ⚠️ **ESTA É A ASSERÇÃO QUE ESTAVA VERMELHA ANTES DO CONSERTO.** Com a mensagem dentro da linha,
     *    `[data-slot="aviso-da-lista"]` não existia: uma ação destrutiva podia falhar sem nada visível
     *    fora de uma célula de tabela de 11px, na linha que não mudou — que é exatamente o que "não
     *    aconteceu nada" parece, e foi o que Bernardo viu no preview.
     */
    const aviso = page.locator('[data-slot="aviso-da-lista"]');
    await expect(aviso, "a falha não apareceu acima da tabela").toBeVisible();
    await expect(aviso).toContainText("não");

    // E ela é anunciada como INTERRUPÇÃO, não como informação: `alert`, não `status`.
    await expect(aviso).toHaveAttribute("role", "alert");
  });

  /**
   * `D-USR-4` · **a confirmação é simples: nenhum campo para digitar.**
   *
   * ⚠️ **ESTE CASO SUBSTITUI O QUE PROVAVA O CONTRÁRIO.** Até 03/10/2026 havia um caso chamado *"o
   * e-mail digitado é o que libera o botão de excluir"*, e ele existia só para medir o campo que esta
   * decisão removeu: *"D-USR-4. Confirmação simples, sem digitar nada."* Reescrevê-lo seria manter a
   * forma e inverter o veredito; ele foi **apagado**, e este nasceu para medir o que passou a valer.
   *
   * ⚠️ **ELE DISCRIMINA PELOS DOIS LADOS:** com o campo de volta, o botão nasceria **desabilitado** e
   * a primeira asserção reprovaria; e a ausência do campo é medida por contagem, não por aparência.
   */
  test("⚠️ O CASO QUE DISCRIMINA · o cartão não tem campo para digitar, e o botão já está liberado", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);
    await linhaDa(page, EMAIL_ALVO).getByRole("button", { name: "Excluir" }).click();

    const dialogo = page.getByRole("alertdialog");

    // A pergunta nomeia a conta e o e-mail — é o que identifica a linha certa.
    await expect(dialogo).toContainText("Tem certeza que deseja excluir a conta");
    await expect(dialogo).toContainText(EMAIL_ALVO);
    await expect(dialogo).toContainText("A exclusão é permanente.");

    // ⚠️ **NENHUM CAMPO**: nem o rótulo que havia, nem caixa de texto nenhuma dentro do cartão.
    await expect(dialogo.getByLabel("Confirme o e-mail da conta")).toHaveCount(0);
    await expect(dialogo.locator("input")).toHaveCount(0);

    // ⚠️ **E O BOTÃO JÁ ESTÁ LIBERADO** — era ele que o campo mantinha desabilitado.
    await expect(dialogo.getByRole("button", { name: "Excluir" })).toBeEnabled();
    await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeVisible();

    // Cancelar fecha sem excluir: a conta continua na lista.
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(linhaDa(page, EMAIL_ALVO)).toBeVisible();
  });
});

test.describe("`FR-040` e `FR-041` · a página da conta", () => {
  /**
   * `D-USR-6` · **«Editar» na linha leva à página da conta.**
   *
   * ⚠️ **SEM ESTE CASO O BOTÃO PODERIA NASCER E SUMIR COM A SUÍTE VERDE** — não havia asserção
   * nenhuma sobre ele no repositório. O nome continua sendo link, e os dois caminhos levam ao mesmo
   * endereço; o que este caso mede é o **verbo**, que é o que a decisão pediu.
   */
  test("⚠️ «Editar» na linha abre a página da conta — e o nome continua funcionando", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN);

    await linhaDa(page, EMAIL_ALVO).getByRole("link", { name: "Editar" }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toMatch(/^[/]admin[/]usuarios[/][0-9a-f-]+$/);
    await expect(page.getByRole("button", { name: "Gravar nome" })).toBeVisible();

    // Controle positivo do outro caminho: o nome leva ao MESMO lugar.
    const porEditar = new URL(page.url()).pathname;
    await page.goto("/admin/usuarios");
    await abrirContaPorClique(page, EMAIL_ALVO);
    expect(new URL(page.url()).pathname, "o nome e o Editar levam a páginas diferentes").toBe(
      porEditar,
    );

    /*
     * ⚠️ **DE VOLTA À LISTA ANTES DE MEDIR A AUSÊNCIA — e esquecer isto custou uma reprovação.** O
     *    passo anterior deixa o navegador na PÁGINA da conta, onde não existe linha nenhuma: ali o
     *    `toHaveCount(0)` do «Editar» passava **pelo motivo errado**, porque não havia tabela. Quem
     *    pegou foi o controle positivo da linha seguinte, que exige a frase *"sua conta"* — asserção
     *    negativa sem controle positivo ao lado é asserção que se satisfaz com a tela errada.
     */
    await page.goto("/admin/usuarios");

    // ⚠️ E na PRÓPRIA linha não há «Editar» — a página dela recusa editar, e oferecer seria beco.
    await expect(
      linhaDa(page, EMAIL_ADMIN).getByRole("link", { name: "Editar" }),
      "a própria conta ganhou um Editar que leva a uma tela que recusa",
    ).toHaveCount(0);
    await expect(linhaDa(page, EMAIL_ADMIN)).toContainText("sua conta");
  });

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
    // ⚠️ As ações de ACESSO saíram desta página em 03/10/2026 e voltaram para a linha da lista;
    //    o que resta aqui é o formulário, e é dele que este caso trata.
    for (const acao of ["Gravar perfil e vínculos", "Gravar nome"]) {
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
    for (const acao of ["Gravar perfil e vínculos", "Gravar nome"]) {
      await expect(page.getByRole("button", { name: acao })).toBeVisible();
    }
  });
});
