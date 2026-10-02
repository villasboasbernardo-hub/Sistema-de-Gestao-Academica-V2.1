/**
 * Sair do sistema pelo menu do avatar (`FR-001` a `FR-004`, `US1`, `SC-001` da spec 011).
 *
 * ⚠️ **ESTA SUÍTE EXISTE POR UM DEFEITO ENCONTRADO NA TELA, e o defeito é o pior tipo: código
 * correto e inalcançável.** `encerrarSessao()` estava em `lib/acoes/sessao.ts` desde o Épico 3,
 * com teste, e tinha **ZERO consumidores** no repositório. Bernardo entrou pelo preview em
 * 29/09/2026 e não teve por onde sair. Nenhuma suíte acusava, porque nenhuma perguntava *"dá para
 * chegar nisto clicando?"* — que é exatamente a regra que a fatia (c) do Épico 5 escreveu para
 * TELAS e que aqui vale para uma AÇÃO.
 *
 * ⚠️ **POR ISSO TUDO AQUI É POR CLIQUE, com `goto` só no ponto de partida.** Um percurso que
 * chamasse a ação por outro caminho provaria que ela funciona — que nunca esteve em dúvida — e
 * deixaria passar de novo o que de fato estava quebrado.
 *
 * ⚠️ **O CASO QUE DISCRIMINA é o último:** depois de sair, o endereço de uma tela do sistema leva à
 * **entrada**. Sem ele, um "Sair" que apenas navegasse para `/login` **sem encerrar a sessão**
 * passaria em todos os outros casos — e deixaria a conta aberta para quem usasse a mesma máquina,
 * que é o cenário real de um computador de seção.
 */
import { crc32 } from "node:zlib";

import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let EMAIL = "";
let EMAIL_SEGUNDO = "";

/**
 * Um PNG de 1×1 **que o navegador consegue decodificar**.
 *
 * ⚠️ **PRECISA SER VÁLIDO, e a primeira escrita usava só a assinatura do formato — 16 bytes.** O
 * Storage aceitou (ele confere o tipo declarado, não o conteúdo) e o caso reprovou depois, na tela:
 * o `Avatar` do Radix só troca o recuo pela imagem **quando ela carrega**, e uma imagem corrompida
 * mantém as iniciais. O sintoma dizia *"o avatar não mostrou a foto"*, que se lê como defeito do
 * componente e era defeito da amostra.
 */
const PNG_DE_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * O **mesmo** PNG de 1×1, inflado até o peso pedido por um bloco `tEXt` de comentário.
 *
 * ⚠️ **PRECISA SER UM ARQUIVO DE VERDADE, NÃO BYTES SOLTOS.** O que está sob prova aqui é o
 * caminho inteiro de um arquivo **entre 1 e 2 MB** — e ele atravessa o limite de corpo da Server
 * Action e o `file_size_limit` do balde. Um `Buffer.alloc(1_500_000)` passaria pelos dois e
 * reprovaria depois, na tela, porque o `Avatar` do Radix só troca o recuo pela imagem **quando ela
 * carrega** (a lição que o `PNG_DE_1X1` acima já pagou).
 *
 * ⚠️ **O PESO VAI NUM BLOCO ANCILAR, e é de propósito.** `tEXt` é opcional pelo formato e todo
 * decodificador o ignora, então a imagem continua decodificando — e o arquivo tem exatamente o
 * tamanho pedido, sem depender de um codificador de PNG que o projeto não tem. O CRC sai de
 * `zlib.crc32`, que é do Node (nenhuma dependência nova).
 */
function pngComPesoDe(bytes: number): Buffer {
  const antesDoIend = PNG_DE_1X1.length - 12; // IEND ocupa 12 bytes: tamanho + tipo + CRC
  const palavraChave = Buffer.from("Comment\0", "latin1");
  const recheio = Math.max(0, bytes - PNG_DE_1X1.length - 12 - palavraChave.length);
  const dados = Buffer.concat([palavraChave, Buffer.alloc(recheio, 0x20)]);
  const tipo = Buffer.from("tEXt", "latin1");
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length, 0);
  const verificacao = Buffer.alloc(4);
  verificacao.writeUInt32BE(crc32(Buffer.concat([tipo, dados])), 0);
  return Buffer.concat([
    PNG_DE_1X1.subarray(0, antesDoIend),
    tamanho,
    tipo,
    dados,
    verificacao,
    PNG_DE_1X1.subarray(antesDoIend),
  ]);
}

/** Entre 1 e 2 MB — acima do limite padrão da Server Action, abaixo do limite do balde. */
const PNG_DE_1_5_MB = pngComPesoDe(1_500_000);

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("sair-e-perfil", info.workerIndex);
  EMAIL_SEGUNDO = emailDeTeste("sair-e-perfil-2", info.workerIndex);
  await criarConta(EMAIL, `USR-SAIR-${info.workerIndex}`);
  // ⚠️ A segunda conta NÃO é Admin: `app.impedir_remocao_do_ultimo_admin()` conta os OUTROS Admins
  //    ativos, e uma conta a mais com esse perfil derruba 12 casos de `rls.test.ts` (gotcha 8).
  await criarConta(EMAIL_SEGUNDO, `USR-SAIR2-${info.workerIndex}`, "operador");
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
  await apagarConta(EMAIL_SEGUNDO);
});

test.describe("`FR-002` · o menu do avatar", () => {
  test("o avatar está no cabeçalho e abre com o nome, o e-mail e as duas ações", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    const gatilho = page.getByRole("button", { name: /^Conta de / });
    await expect(gatilho, "não há avatar no cabeçalho — não há por onde sair").toBeVisible();

    await gatilho.click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu, "o menu não identifica a conta aberta").toContainText(EMAIL);
    await expect(menu.getByRole("menuitem", { name: "Meu perfil" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /^Sair/ })).toBeVisible();
  });

  test("⚠️ o menu abre e se opera pelo TECLADO — `Sair` é a ação que não pode depender do mouse", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    const gatilho = page.getByRole("button", { name: /^Conta de / });
    await gatilho.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("menu")).toBeVisible();

    // ⚠️ **MEDIDO, não suposto:** abrir por `Enter` já deixa o PRIMEIRO item focado — a primeira
    //    escrita deste caso esperava que a seta o alcançasse, e ela na verdade passa ao seguinte.
    //    A identificação da conta é `Label`, não item, e por isso o foco não para nela.
    await expect(page.getByRole("menuitem", { name: "Meu perfil" })).toBeFocused();

    // E a seta alcança `Sair`, que é a ação que esta fatia veio entregar. Sem esta linha o caso
    // provaria só que o menu abre — e abrir sem chegar em `Sair` é o estado de antes.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: /^Sair/ })).toBeFocused();
  });
});

test.describe("`FR-003` e `FR-004` · sair, e trocar de usuário", () => {
  test("clicar em `Sair` leva à entrada", async ({ page }) => {
    await entrar(page, EMAIL);

    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: /^Sair/ }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("trocar de usuário é sair e entrar de novo — e o cabeçalho passa a mostrar o outro", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: /^Sair/ }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");

    // ⚠️ O segundo `entrar` usa `goto` porque a entrada É o ponto de partida do segundo percurso —
    //    é o único uso que a regra permite.
    await entrar(page, EMAIL_SEGUNDO);

    await page.getByRole("button", { name: /^Conta de / }).click();
    await expect(page.getByRole("menu"), "o menu ainda mostra a conta anterior").toContainText(
      EMAIL_SEGUNDO,
    );
    await expect(page.getByRole("menu")).not.toContainText(EMAIL);
  });

  test("⚠️ O CASO QUE DISCRIMINA · depois de sair, o endereço de uma tela leva à ENTRADA", async ({
    page,
  }) => {
    await entrar(page, EMAIL);

    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: /^Sair/ }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");

    // ⚠️ Aqui o `goto` NÃO é percurso: é a tentativa hostil que o caso mede. Um "Sair" que só
    //    navegasse, sem encerrar a sessão, passaria em todos os casos acima e falharia neste.
    await page.goto("/admin/usuarios");

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/login");
    await expect(
      page.getByRole("button", { name: /^Conta de / }),
      "a casca foi desenhada depois de sair — a sessão não foi encerrada",
    ).toHaveCount(0);
  });
});

test.describe("`FR-010` · sem foto, aparecem as INICIAIS", () => {
  test("o recuo do avatar traz as iniciais do nome da conta", async ({ page }) => {
    await entrar(page, EMAIL);

    // A conta de percurso chama-se "Conta de percurso automatizado" — primeira e última palavra,
    // com a ligação "de" descartada: `CA`. A regra inteira está em `lib/dominio/iniciais-do-nome.ts`
    // e é provada por unidade; aqui prova-se que ela CHEGOU na tela.
    //
    // ⚠️ **O ESCOPO `header` ENTROU EM 03/10/2026, e a ausência dele passou a reprovar.** Desde que a
    //    lista de usuários ganhou um avatar por linha, o seletor solto resolve para **nove** elementos
    //    e falha por modo estrito — que não reexecuta, então prazo maior não salva (gotcha 3). O caso
    //    sempre falou do avatar do **cabeçalho**; agora ele diz isso.
    await expect(page.locator('header [data-slot="avatar-recuo"]')).toHaveText("CA");
  });
});

test.describe("`FR-020` a `FR-023` · o próprio cadastro", () => {
  /**
   * ⚠️ **CHEGA CLICANDO, e é o ponto do requisito** (`FR-023`). Um `goto("/perfil")` provaria que a
   * tela funciona — que nunca esteve em dúvida — e deixaria passar de novo o defeito desta fatia,
   * que era justamente não haver por onde chegar.
   */
  async function irAoPerfilPorClique(page: Page): Promise<void> {
    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: "Meu perfil" }).click();
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
  }

  /**
   * ⚠️ **A RESPOSTA SE PROCURA DENTRO DA SEÇÃO, NUNCA NA PÁGINA INTEIRA — e isto custou três casos
   * nesta sessão.** `getByRole("status")` casa também com a faixa **AMBIENTE LOCAL**, e
   * `getByRole("alert")` com o anunciador de rota do Next, que é invisível e existe em toda página.
   * É o gotcha 3 da fatia (b) do Épico 4, de novo: violação de modo estrito **falha na hora e não
   * reexecuta**, então prazo maior não salva — o que salva é escopo.
   */
  const secao = (page: Page, nome: string) => page.getByRole("region", { name: nome });

  test("o menu do avatar leva a `/perfil`, e o e-mail e o perfil ficam só para leitura", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    await expect(new URL(page.url()).pathname).toBe("/perfil");

    // ⚠️ O que se mede é a AUSÊNCIA de campo editável, não a presença do texto: uma tela que
    //    mostrasse o e-mail num `input` desabilitado ainda o mandaria no formulário.
    await expect(page.getByText(EMAIL)).toBeVisible();
    await expect(
      page.locator('input[name="email"]'),
      "apareceu campo de e-mail no próprio cadastro — ele não é editável por ninguém (`FR-021`)",
    ).toHaveCount(0);
    await expect(
      page.locator('select[name="perfil"], input[name="perfil"]'),
      "apareceu campo de perfil — ninguém muda o próprio (`FR-022`)",
    ).toHaveCount(0);

    // E a razão de não serem editáveis está NA TELA, não num documento.
    await expect(page.getByText(/não é editável por ninguém/i)).toBeVisible();
  });

  test("trocar o nome de exibição, e vê-lo no cabeçalho de toda tela", async ({ page }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    const novo = `Nome Trocado ${Date.now().toString(36)}`;
    await page.locator('input[name="nomeExibicao"]').fill(novo);
    await page.getByRole("button", { name: /gravar nome/i }).click();

    await expect(secao(page, "Nome").getByRole("status")).toContainText("Nome atualizado.");

    // ⚠️ **O CASO QUE DISCRIMINA do nome:** o cabeçalho é montado pelo layout, uma vez por
    //    requisição. Uma ação que gravasse e NÃO invalidasse o cache deixaria a tela certa e o
    //    cabeçalho com o nome velho — e só este trecho pega isso.
    await expect(page.getByRole("button", { name: `Conta de ${novo}` })).toBeVisible();
  });

  test("⚠️ enviar foto, ver o avatar com imagem, remover e ver as INICIAIS de volta", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    await page.locator('input[name="foto"]').setInputFiles({
      name: "retrato.png",
      mimeType: "image/png",
      buffer: PNG_DE_1X1,
    });
    // ⚠️ **NÃO HÁ CLIQUE EM "Enviar foto" AQUI, e a ausência é deliberada.** Desde o conserto de
    //    30/09/2026 o botão ABRE a janela de arquivos, e escolher é que envia — então
    //    `setInputFiles` já dispara o `change` e o envio. Um clique a mais abriria uma janela que
    //    ninguém atende. Quem prova o caminho do clique é o caso do `filechooser`, adiante.
    await expect(secao(page, "Foto").getByRole("status")).toContainText("Foto atualizada.");

    // ⚠️ Com foto, o recuo das iniciais SAI do cabeçalho — é o que distingue "tem foto" de "não
    //    tem". Medir só a presença da imagem deixaria passar um avatar que mostrasse as duas.
    await expect(page.locator('header [data-slot="avatar-imagem"]')).toBeVisible();

    await page.getByRole("button", { name: /remover foto/i }).click();
    await expect(secao(page, "Foto").getByRole("status")).toContainText("voltou às iniciais");

    await expect(page.locator('header [data-slot="avatar-recuo"]')).toBeVisible();
    await expect(
      page.locator('header [data-slot="avatar-imagem"]'),
      "removeu a foto e o cabeçalho continua mostrando a imagem",
    ).toHaveCount(0);
  });

  test("⚠️ O CASO QUE DISCRIMINA da recusa · o tipo errado é barrado ANTES do envio", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    // ⚠️ O `accept` do campo é conveniência do navegador e **não** impede um arquivo colocado por
    //    programa — nem impede quem chamar a ação direto. Aqui o GIF entra de verdade, e o que se
    //    mede é a recusa com a razão em português (`FR-013`).
    await page.locator('input[name="foto"]').setInputFiles({
      name: "animado.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    // ⚠️ **NÃO HÁ CLIQUE EM "Enviar foto" AQUI, e a ausência é deliberada.** Desde o conserto de
    //    30/09/2026 o botão ABRE a janela de arquivos, e escolher é que envia — então
    //    `setInputFiles` já dispara o `change` e o envio. Um clique a mais abriria uma janela que
    //    ninguém atende. Quem prova o caminho do clique é o caso do `filechooser`, adiante.

    await expect(secao(page, "Foto").getByRole("alert")).toContainText("JPG ou PNG");
    await expect(
      secao(page, "Foto").getByRole("status"),
      "recusou e ainda assim disse que atualizou",
    ).toHaveCount(0);
  });

  /**
   * ⚠️ **ESTE CASO NASCEU DE UM DEFEITO QUE A SUÍTE INTEIRA DEIXAVA PASSAR**, achado por Bernardo
   * no preview em 30/09/2026: *"clicar em enviar foto NÃO abre a janela de arquivos do
   * computador"*. **E a causa de a suíte não ver era a própria suíte**: os dois casos acima mandam
   * o arquivo com `setInputFiles` **direto no `input`**, o que prova que o campo funciona — que
   * nunca esteve em dúvida — e **nunca pergunta se alguém consegue abrir o seletor clicando**.
   *
   * É o mesmo erro de forma que criou esta spec: `encerrarSessao()` tinha teste e nenhum
   * consumidor. Aqui o campo tinha teste e nenhum caminho de clique.
   *
   * ⚠️ **O QUE ELE MEDE É O EVENTO DO NAVEGADOR**, `filechooser`, que só dispara quando um
   * `input type="file"` é de fato acionado. Nenhum atalho: se o botão não abrir o seletor, o
   * `waitForEvent` estoura o prazo.
   */
  test("⚠️ O CASO QUE DISCRIMINA do caminho · o BOTÃO abre o seletor de arquivos do sistema", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    // ⚠️ **O NOME É EXATO, E A PRIMEIRA ESCRITA DESTE CASO ERRAVA AQUI.** Ela pedia `button` com
    //    nome contendo "foto" e pegava o PRIMEIRO — que é o próprio `<input type="file">`: o
    //    Chromium o expõe como **button**, com o nome vindo do `<label>` ("Escolher uma foto"), e
    //    ele vem antes no DOM. Clicar nele abre o seletor por definição, então o caso **passaria
    //    sem provar nada**. É a guarda cega de sempre; só o nome exato o faz medir o botão.
    const botao = secao(page, "Foto").getByRole("button", { name: /^Enviar foto$/ });
    await expect(botao).toBeVisible();

    const seletor = page.waitForEvent("filechooser");
    await botao.click();
    const janela = await seletor;

    // ⚠️ E o seletor precisa aceitar UM arquivo, não vários: a foto do avatar é uma só.
    expect(janela.isMultiple(), "o seletor abriu pedindo vários arquivos").toBe(false);

    // E escolher ali dentro tem de levar a foto à tela — abrir a janela e não gravar não entrega
    // nada a quem clicou.
    await janela.setFiles({ name: "retrato.png", mimeType: "image/png", buffer: PNG_DE_1X1 });
    await expect(secao(page, "Foto").getByRole("status")).toContainText("Foto atualizada.");
    await expect(page.locator('header [data-slot="avatar-imagem"]')).toBeVisible();
  });

  /**
   * ⚠️ **O SEGUNDO DEFEITO DO MESMO RELATO, e ele é invisível no teste de 1×1.** A tela promete
   * *"até 2 MB"* e o balde aceita 2.097.152 bytes — mas a **Server Action** tem limite de corpo
   * próprio, e o padrão do Next 16.3.3 é **1 MB** (medido em
   * `node_modules/next/dist/server/app-render/action-handler.js:519`, `1024 * 1024`, com recusa
   * `413 Body exceeded 1mb limit`).
   *
   * ⚠️ **TODA foto de câmera de celular cai nessa faixa.** Os casos de 1×1 passam porque pesam 70
   * bytes: eles exercitam o caminho e **não** exercitam o limite. Este caso é o único entre 1 e
   * 2 MB, e é ele que separa a promessa da tela do que o servidor aceita.
   */
  test("⚠️ O CASO QUE DISCRIMINA do tamanho · uma foto de ~1,5 MB (entre 1 e 2 MB) é aceita", async ({
    page,
  }) => {
    await entrar(page, EMAIL);
    await irAoPerfilPorClique(page);

    expect(PNG_DE_1_5_MB.length).toBe(1_500_000);

    await page.locator('input[name="foto"]').setInputFiles({
      name: "retrato-grande.png",
      mimeType: "image/png",
      buffer: PNG_DE_1_5_MB,
    });

    await expect(secao(page, "Foto").getByRole("status")).toContainText("Foto atualizada.");
    await expect(page.locator('header [data-slot="avatar-imagem"]')).toBeVisible();

    // ⚠️ E a recusa de 1 MB chega como erro GENÉRICO do servidor, não com a frase da regra — se
    //    este trecho reprovar dizendo "passou de 2 MB", o limite que barrou foi outro.
    await expect(
      secao(page, "Foto").getByRole("alert"),
      "a foto de 1,5 MB foi recusada, e a tela promete até 2 MB",
    ).toHaveCount(0);
  });
});
