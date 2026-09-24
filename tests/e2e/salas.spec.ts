/**
 * A lista de salas (`FR-029.2`, `FR-029.4` a `FR-029.6`, `SC-014.3`, US5 cenários 15 e 16).
 *
 * ⚠️ **A SALA DO PERCURSO É A DA AMOSTRA, E NÃO `Sala 04`.** A T195 nomeia `Sala 04` e as **5** turmas
 * que a usam, que são da base real — e o CI **reseta o banco**. O que o cenário mede é *"desativar
 * sala em uso lista as turmas e deixa prosseguir"*; a contagem é lida da própria amostra, em vez de
 * escrita à mão, porque número fixo aqui passaria nesta máquina e reprovaria no CI.
 *
 * ⚠️ **SÃO TRÊS VERBOS, NÃO QUATRO** (`FR-029.5`): acrescentar, desativar e reativar. **Renomear não
 * existe** — o nome da sala é o valor gravado em `turmas.sala_alocada` — e **apagar** também não
 * (regra 4). O caso de contagem mede a ausência dos dois, que é o que a regra promete.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

let EMAIL_ADMIN = "";
let EMAIL_ENCARREGADO = "";
let EMAIL_AJUDANTE = "";
let SEMEADO: CursosSemeados;
/** A sala que este percurso acrescenta pela tela — carimbada por processo, e apagada no fim. */
let SALA_NOVA = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;

  EMAIL_ADMIN = emailDeTeste("salas-admin", p);
  EMAIL_ENCARREGADO = emailDeTeste("salas-encarregado", p);
  EMAIL_AJUDANTE = emailDeTeste("salas-ajudante", p);
  SALA_NOVA = `Sala de percurso ${p}`;

  await criarConta(EMAIL_ADMIN, `USR-SAL-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
  await criarConta(EMAIL_ENCARREGADO, `USR-SAL-ENC-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_AJUDANTE, `USR-SAL-AJU-${p}`, "ajudante_administracao_academica");

  // ⚠️ Idempotência: a execução anterior deixou a sala no banco, e a `UNIQUE (lista, valor)` morde.
  await admin().from("config_listas").delete().eq("lista", "salas").eq("valor", SALA_NOVA);
});

test.afterAll(async () => {
  await admin().from("config_listas").delete().eq("lista", "salas").eq("valor", SALA_NOVA);
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_AJUDANTE);
});

const linhaDaSala = (page: Page, valor: string) => page.locator(`tr[data-sala="${valor}"]`);

const dialogo = (page: Page) => page.locator('[data-slot="dialogo-confirmacao"]');

test.describe("`SC-003` · chega-se a Salas CLICANDO, pela aba da Administração", () => {
  test("menu → Administração → aba Salas", async ({ page }) => {
    /*
     * ⚠️ `/admin/salas` NÃO É DESTINO DO MENU — Administração é **entrada única** (decisão MENU-1),
     *    e as demais telas dela se alcançam por aba. Sem um percurso que **clique** a aba, a tela
     *    ficaria na mesma situação em que `/cursos/novo` ficou: existindo e inalcançável.
     */
    await entrar(page, EMAIL_ENCARREGADO, "/inicio");
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Administração", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/usuarios");

    await page
      .getByRole("navigation", { name: "Administração" })
      .getByRole("link", { name: "Salas", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/salas");
    await expect(page.locator('[data-slot="tabela-de-salas"]')).toBeVisible();
  });
});

test.describe("`FR-029.2` · acrescentar sala", () => {
  /* ⚠️ SERIAL PELO MESMO MOTIVO DO BLOCO DE BAIXO: o segundo caso lê o que o primeiro gravou. */
  test.describe.configure({ mode: "serial" });

  test("o Encarregado acrescenta escolhendo física ou virtual — e a natureza NÃO vem marcada", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ENCARREGADO, "/admin/salas");

    // ⚠️ `FR-029.6`: abrir com "Física" marcada gravaria escolha que ninguém fez.
    await expect(page.locator("#sala-natureza")).toHaveValue("");

    await page.locator("#sala-nome").fill(SALA_NOVA);
    await page.locator("#sala-natureza").selectOption("virtual");
    await page.locator('[data-slot="acrescentar-sala"]').click();

    const linha = linhaDaSala(page, SALA_NOVA);
    await expect(linha).toBeVisible({ timeout: 15_000 });
    await expect(linha).toContainText("Ambiente virtual");
    await expect(linha).toContainText("ativa");
  });

  test("⚠️ e ela aparece no formulário de turma NA HORA — a lista é a mesma fonte", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ENCARREGADO, `/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await expect(page.locator("#turma-sala")).toContainText(SALA_NOVA);
  });
});

test.describe("`FR-029.4` · desativar sala em uso avisa e deixa prosseguir", () => {
  /**
   * ⚠️ **UM CASO SÓ, E ISSO É CORREÇÃO DE DESENHO.** Desativar, gravar a turma que já usa a sala,
   * vê-la sumir da turma nova e reativar é **um percurso**, e parti-lo em quatro casos fez o estado
   * do banco atravessar as fronteiras deles. Medido em 23/09/2026, e o modo de falha é específico:
   * isolado passava; na suíte inteira reprovava; e com o ponto de partida escrito **direto no banco**
   * reprovava **só na segunda execução seguida** — porque o `webServer` do Playwright **reaproveita o
   * servidor** da execução anterior, e mudança feita fora da Server Action não revalida o que ele já
   * tem em mãos. Aqui cada passo é ação de tela, e é a ação que revalida o caminho.
   */
  test("desativar, continuar gravando a turma que a usa, sumir da turma nova e reativar", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ENCARREGADO, "/admin/salas");
    const linha = linhaDaSala(page, SEMEADO.salaDeTeste);

    /*
     * ⚠️ O PONTO DE PARTIDA É LIDO DA TELA, não imposto: a sala pode chegar aqui ativa ou desativada,
     *    e o percurso normaliza pelo mesmo caminho que uma pessoa usaria.
     */
    if ((await linha.locator('[data-slot="reativar-sala"]').count()) === 1) {
      await linha.locator('[data-slot="reativar-sala"]').click();
      await expect(linha).toContainText("ativa", { timeout: 15_000 });
    }

    /*
     * ⚠️ A CONTAGEM É LIDA DA TELA, NÃO ESCRITA À MÃO. O que o cenário mede é que o diálogo nomeia
     *    **as turmas medidas**; fixar "5" seria medir a base real, que o CI não tem.
     */
    /*
     * ⚠️ **O PRAZO AQUI É O MESMO DOS OUTROS PASSOS DESTE PERCURSO (15 s), e não o padrão de 5 s.**
     *    Medido em 23/09/2026: numa execução em três da suíte inteira, em paralelo, este primeiro
     *    `expect` reprovava enquanto os seguintes — que já pediam 15 s — passavam. A tela de salas lê
     *    a lista **e** todas as turmas, para dizer quem usa cada sala; sob quatro processos ela passa
     *    dos 5 s. Deixar o primeiro passo com prazo menor que os demais não media nada: media qual
     *    passo do percurso tinha o número menor escrito ao lado.
     */
    const usadaPor = linha.locator('[data-slot="turmas-que-usam"]');
    await expect(usadaPor).toContainText(SEMEADO.turmaJanelaTarde, { timeout: 15_000 });
    expect(Number(await usadaPor.getAttribute("data-quantidade"))).toBeGreaterThan(0);

    await linha.locator('[data-slot="desativar-sala"]').click();
    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText(SEMEADO.turmaJanelaTarde);
    await expect(dialogo(page)).toContainText("continuam com a sala registrada");

    await dialogo(page).getByRole("button", { name: "Desativar" }).click();
    await expect(linha).toContainText("desativada", { timeout: 15_000 });

    /*
     * ⚠️ É ESTA A METADE QUE O `FR-029.4` PROTEGE. Sem a sala atual na lista, salvar o efetivo de uma
     *    turma cuja sala foi desativada apagaria a sala **sem ninguém pedir**.
     */
    await page.goto(`/turmas/${encodeURIComponent(SEMEADO.turmaJanelaTarde)}`);
    await expect(page.locator("#turma-sala")).toHaveValue(SEMEADO.salaDeTeste);
    await page.locator("#turma-alunos").fill("19");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-alunos")).toHaveValue("19", { timeout: 15_000 });
    await expect(page.locator("#turma-sala")).toHaveValue(SEMEADO.salaDeTeste);

    // ⚠️ Mas ela SOME da turma nova — desativar é tirar da escolha, não reescrever o passado.
    await page.goto(`/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await expect(page.locator("#turma-sala")).not.toContainText(SEMEADO.salaDeTeste);

    // ⚠️ E reativar devolve à escolha, SEM confirmar (`FR-018.1`): não alcança o passado de ninguém.
    await page.goto("/admin/salas");
    await linha.locator('[data-slot="reativar-sala"]').click();
    await expect(linha).toContainText("ativa", { timeout: 15_000 });
    await expect(dialogo(page)).toHaveCount(0);

    await page.goto(`/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await expect(page.locator("#turma-sala")).toContainText(SEMEADO.salaDeTeste);
  });
});

test.describe("`FR-029.5` · o que a tela NÃO oferece", () => {
  test("⚠️ três verbos, e nenhum caminho de renomear ou apagar", async ({ page }) => {
    await entrar(page, EMAIL_ENCARREGADO, "/admin/salas");
    await expect(page.locator('[data-slot="tabela-de-salas"]')).toBeVisible();

    const principal = page.getByRole("main");
    for (const proibido of [/renomear/i, /excluir/i, /apagar/i, /remover/i]) {
      await expect(
        principal.getByRole("button", { name: proibido }),
        `a tela oferece ${proibido}`,
      ).toHaveCount(0);
    }

    /*
     * ⚠️ E os três que existem estão todos presentes de uma vez: acrescentar sempre, e por linha um
     *    dos dois — nunca os dois na mesma linha, que seria oferecer o estado em que ela já está.
     */
    await expect(page.locator('[data-slot="acrescentar-sala"]')).toHaveCount(1);

    /*
     * ⚠️ **UMA DAS DUAS POR LINHA, E NUNCA AS DUAS** — oferecer o estado em que a sala já está é o
     *    defeito que este caso pega. Ele não exige **qual**: a linha pode chegar aqui ativa ou
     *    desativada, e o que a regra promete é a exclusividade, não a situação.
     */
    const linha = linhaDaSala(page, SEMEADO.salaDeTeste);
    const desativar = await linha.locator('[data-slot="desativar-sala"]').count();
    const reativar = await linha.locator('[data-slot="reativar-sala"]').count();
    expect(desativar + reativar, "a linha da sala não oferece exatamente uma ação").toBe(1);
  });
});

test.describe("`SC-014.3` · quem não administra parâmetro vê a lista, e só", () => {
  test("⚠️ o Ajudante lê as salas e NÃO recebe botão nenhum", async ({ page }) => {
    await entrar(page, EMAIL_AJUDANTE, "/admin/salas");

    /* Ele lê: a lista é `config_listas_ler`, que só pede sessão. */
    await expect(linhaDaSala(page, SEMEADO.salaDeTeste)).toBeVisible();

    /*
     * ⚠️ E ESCONDER É CONFORTO, NÃO PROTEÇÃO. Quem recusa é a policy `parametros` — este caso mede
     *    que a tela não oferece o que o banco vai negar.
     */
    await expect(page.locator('[data-slot="acrescentar-sala"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="desativar-sala"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="reativar-sala"]')).toHaveCount(0);
  });
});
