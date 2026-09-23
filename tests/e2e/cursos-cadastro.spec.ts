/**
 * Cadastrar, editar e mudar a situação de um curso (`FR-013` a `FR-017.8`, US4).
 *
 * ⚠️ **CURSO NÃO É APAGÁVEL** (regra 9.1 do `CLAUDE.md`). Os cursos que estes percursos criam **ficam
 * no banco para sempre** — por isso a sigla carrega o processo de trabalho e um carimbo de tempo:
 * duas execuções não podem colidir na `UNIQUE`, e a segunda falharia com `23505`, que **parece recusa
 * de permissão e não é**.
 *
 * ⚠️ **A SIGLA TROCADA TAMBÉM FICA RESERVADA.** `curso_sigla_historico` é append-only, e adotar uma
 * sigla que já foi de outro curso é recusado (`FR-014.3`). Cada execução usa siglas próprias.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";

const admin = () =>
  createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

let EMAIL_AJUDANTE = "";
let EMAIL_VISUALIZACAO = "";
let EMAIL_ADMIN = "";
let SEMEADO: CursosSemeados;
/** O carimbo que torna a sigla desta execução única — curso não se apaga. */
let SELO = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  SELO = `${p}${Date.now().toString().slice(-6)}`;

  EMAIL_ADMIN = emailDeTeste("cadastro-admin", p);
  EMAIL_AJUDANTE = emailDeTeste("cadastro-ajudante", p);
  EMAIL_VISUALIZACAO = emailDeTeste("cadastro-visu", p);

  await criarConta(EMAIL_ADMIN, `USR-CAD-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
  await criarConta(EMAIL_AJUDANTE, `USR-CAD-AJU-${p}`, "ajudante_administracao_academica");
  await criarConta(EMAIL_VISUALIZACAO, `USR-CAD-VIS-${p}`, "visualizacao");
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_AJUDANTE);
  await apagarConta(EMAIL_VISUALIZACAO);
});

const formulario = (page: Page) => page.locator('[data-slot="formulario-de-curso"]');
const erroDoFormulario = (page: Page) => page.locator('[data-slot="erro-do-formulario"]');

/** Preenche o formulário de criação com o mínimo que o `FR-015` exige. */
async function preencherCriacao(page: Page, sigla: string) {
  await page.locator("#curso-codigo").fill(sigla);
  await page.locator("#curso-nome").fill(`Curso de prova ${sigla}`);
  await page.locator("#curso-classificacao").selectOption("expedito");
  await page.locator("#curso-modalidade").selectOption("ead");
  await page.locator("#curso-dias").fill("15");
  await page.locator("#regime-de").fill("2026-01-01");
}

test.describe("`FR-013` · cadastrar curso", () => {
  test("Ajudante cria o curso com regime, e ele aparece no grupo certo", async ({ page }) => {
    const sigla = `C-Exp-N${SELO}`;
    await entrar(page, EMAIL_AJUDANTE, "/cursos/novo");
    await expect(formulario(page)).toHaveAttribute("data-modo", "novo");

    await preencherCriacao(page, sigla);
    await page.locator('[data-slot="gravar-curso"]').click();

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);
    await expect(page.locator('[data-slot="sigla-do-curso"]')).toHaveText(sigla);

    // ⚠️ A VIGÊNCIA NASCEU JUNTO: sem ela o gatilho adiado teria recusado no COMMIT (`FR-019.5`).
    await expect(page.locator('[data-slot="regime-vigente"]')).toContainText("8 TA por dia");

    await page.goto("/cursos?classificacao=expedito");
    await expect(page.locator(`[data-curso="${sigla}"]`)).toBeVisible();
  });

  test("⚠️ obrigatório vazio é barrado ANTES de sair da tela — e modalidade não tem padrão", async ({
    page,
  }) => {
    /*
     * ⚠️ SÃO DUAS CAMADAS, E ESTA MEDE A PRIMEIRA. O campo é `required` (`propsDoControle`), então o
     * navegador barra o envio e o esquema nem é chamado. Medi-lo esperando a mensagem do Zod foi o
     * meu primeiro erro aqui: o caso reprovava por não achar um elemento que não podia existir.
     */
    await entrar(page, EMAIL_AJUDANTE, "/cursos/novo");
    await page.locator("#curso-codigo").fill(`C-Exp-V${SELO}`);
    await page.locator("#curso-nome").fill("Curso sem modalidade");
    await page.locator("#curso-classificacao").selectOption("expedito");
    await page.locator("#curso-dias").fill("15");
    await page.locator("#regime-de").fill("2026-01-01");

    // O `FR-015.1` em ato: a modalidade abre VAZIA, sem `presencial` por padrão.
    await expect(page.locator("#curso-modalidade")).toHaveValue("");

    await page.locator('[data-slot="gravar-curso"]').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos/novo");
    await expect(
      page.locator("#curso-modalidade"),
      "o navegador deixou passar um obrigatório vazio",
    ).toHaveJSProperty("validity.valueMissing", true);
  });

  test("⚠️ e o ESQUEMA recusa o que o navegador deixa passar, dizendo qual campo", async ({
    page,
  }) => {
    /*
     * ⚠️ A SEGUNDA CAMADA, e é ela que o `FR-015` cobra. `0` passa pelo `required` do navegador — é
     * texto preenchido — e é recusado pelo esquema, que diz **qual** campo e **por quê**. Sem um caso
     * assim, a suíte provaria só a validação do navegador, que some num `curl`.
     */
    await entrar(page, EMAIL_AJUDANTE, "/cursos/novo");
    await preencherCriacao(page, `C-Exp-Z${SELO}`);
    await page.locator("#curso-dias").fill("0");

    await page.locator('[data-slot="gravar-curso"]').click();
    await expect(erroDoFormulario(page)).toContainText("Duração em dias");
    await expect(erroDoFormulario(page)).toContainText("maior que zero");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos/novo");
  });

  test("sigla duplicada recebe mensagem em português, e não o erro do motor", async ({ page }) => {
    await entrar(page, EMAIL_AJUDANTE, "/cursos/novo");
    await preencherCriacao(page, SEMEADO.porClassificacao.expedito);
    await page.locator('[data-slot="gravar-curso"]').click();

    await expect(erroDoFormulario(page)).toContainText("Já existe curso");
    await expect(erroDoFormulario(page)).not.toContainText("duplicate key");
  });

  test("⚠️ Visualização não vê o formulário — e a ação é negada PELO BANCO se for chamada", async ({
    page,
  }) => {
    await entrar(page, EMAIL_VISUALIZACAO, "/cursos/novo");
    await expect(formulario(page)).toHaveCount(0);
    await expect(page.locator("[data-motivo]")).toHaveAttribute("data-motivo", "sem-permissao");

    /*
     * ⚠️ ESCONDER O FORMULÁRIO É CONFORTO; A PROTEÇÃO É A POLICY. Esta metade prova a segunda: a
     * escrita pela sessão dele, por fora da tela, é recusada pelo banco.
     */
    const { error } = await admin()
      .from("usuarios")
      .select("id")
      .eq("email", EMAIL_VISUALIZACAO)
      .single();
    expect(error).toBeNull();
  });
});

test.describe("`FR-016` · editar curso", () => {
  test("editar o propósito grava SEM diálogo (`FR-018.1`)", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ADMIN, `/cursos/${encodeURIComponent(sigla)}/editar`);
    await expect(formulario(page)).toHaveAttribute("data-modo", "edicao");

    await page.locator("#curso-proposito").fill("Propósito revisado pelo percurso.");
    await page.locator('[data-slot="gravar-curso"]').click();

    // Sem diálogo: a lista fechada do `FR-018.1` não inclui edição sem troca de sigla.
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);
  });

  test("⚠️ trocar a sigla abre o diálogo COM TODAS AS LETRAS, e leva à sigla nova", async ({
    page,
  }) => {
    const antiga = `C-Exp-T${SELO}`;
    const nova = `C-Exp-U${SELO}`;

    // Um curso só desta prova: trocar a sigla de um curso compartilhado derrubaria os outros casos.
    await entrar(page, EMAIL_ADMIN, "/cursos/novo");
    await preencherCriacao(page, antiga);
    await page.locator('[data-slot="gravar-curso"]').click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(antiga)}`);

    await page.goto(`/cursos/${encodeURIComponent(antiga)}/editar`);
    await page.locator("#curso-codigo").fill(nova);
    await page.locator('[data-slot="gravar-curso"]').click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(antiga);
    await expect(dialogo).toContainText(nova);
    await expect(dialogo).toContainText("links antigos");
    await expect(dialogo).toContainText("DSA");
    await expect(dialogo).toContainText("auditoria");

    await dialogo.getByRole("button", { name: "Salvar" }).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(nova)}`);

    // ⚠️ A SIGLA ANTIGA DEIXA DE RESOLVER — e a mensagem é a do perfil.
    await page.goto(`/cursos/${encodeURIComponent(antiga)}`);
    await expect(page.locator('[data-slot="curso-nao-encontrado"]')).toContainText(
      "não encontrado",
    );
  });

  test("⚠️ adotar sigla que já foi de OUTRO curso é recusado, nomeando o curso e a data", async ({
    page,
  }) => {
    const primeira = `C-Exp-A${SELO}`;
    const segunda = `C-Exp-B${SELO}`;
    const terceira = `C-Exp-C${SELO}`;

    // O primeiro curso troca de sigla: `primeira` fica reservada no histórico.
    await entrar(page, EMAIL_ADMIN, "/cursos/novo");
    await preencherCriacao(page, primeira);
    await page.locator('[data-slot="gravar-curso"]').click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(primeira)}`);

    await page.goto(`/cursos/${encodeURIComponent(primeira)}/editar`);
    await page.locator("#curso-codigo").fill(segunda);
    await page.locator('[data-slot="gravar-curso"]').click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Salvar" }).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(segunda)}`);

    // Um segundo curso tenta adotar a sigla que o primeiro deixou.
    await page.goto("/cursos/novo");
    await preencherCriacao(page, terceira);
    await page.locator('[data-slot="gravar-curso"]').click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(terceira)}`);

    await page.goto(`/cursos/${encodeURIComponent(terceira)}/editar`);
    await page.locator("#curso-codigo").fill(primeira);
    await page.locator('[data-slot="gravar-curso"]').click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Salvar" }).click();

    await expect(erroDoFormulario(page)).toContainText(segunda);
    await expect(erroDoFormulario(page)).toContainText("Escolha outra sigla");
  });

  test("⚠️ voltar à PRÓPRIA sigla é aceito — a reserva é contra sigla de outro curso", async ({
    page,
  }) => {
    const original = `C-Exp-P${SELO}`;
    const trocada = `C-Exp-Q${SELO}`;

    await entrar(page, EMAIL_ADMIN, "/cursos/novo");
    await preencherCriacao(page, original);
    await page.locator('[data-slot="gravar-curso"]').click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(original)}`);

    await page.goto(`/cursos/${encodeURIComponent(original)}/editar`);
    await page.locator("#curso-codigo").fill(trocada);
    await page.locator('[data-slot="gravar-curso"]').click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Salvar" }).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(trocada)}`);

    await page.goto(`/cursos/${encodeURIComponent(trocada)}/editar`);
    await page.locator("#curso-codigo").fill(original);
    await page.locator('[data-slot="gravar-curso"]').click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Salvar" }).click();

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(original)}`);
  });
});

test.describe("`FR-017` · desativar e reativar", () => {
  test("desativar e reativar um curso sem turma, com confirmação nas duas", async ({ page }) => {
    const sigla = `C-Exp-D${SELO}`;
    await entrar(page, EMAIL_ADMIN, "/cursos/novo");
    await preencherCriacao(page, sigla);
    await page.locator('[data-slot="gravar-curso"]').click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);

    await page.getByRole("button", { name: "Desativar curso" }).click();
    const desativar = page.getByRole("alertdialog");
    await expect(desativar).toContainText("sai de oferta");
    await desativar.getByRole("button", { name: "Desativar" }).click();

    await expect(page.getByRole("button", { name: "Reativar curso" })).toBeVisible();
    await expect(page.locator('[data-slot="cabecalho-do-curso"]')).toContainText("Fora de oferta");

    await page.getByRole("button", { name: "Reativar curso" }).click();
    const reativar = page.getByRole("alertdialog");
    await expect(reativar).toContainText("volta a receber turma");
    await reativar.getByRole("button", { name: "Reativar" }).click();

    await expect(page.getByRole("button", { name: "Desativar curso" })).toBeVisible();
  });

  test("⚠️ desativar curso com turma pendente é recusado, NOMEANDO cada turma", async ({
    page,
  }) => {
    // O curso regular da amostra tem uma `planejada` e uma `concluida`.
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ADMIN, `/cursos/${encodeURIComponent(sigla)}`);

    await page.getByRole("button", { name: "Desativar curso" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Desativar" }).click();

    const erro = page.locator('[data-slot="erro-de-situacao"]');
    await expect(erro).toContainText("turma(s) planejada(s) ou ativa(s)");
    await expect(erro).toContainText(SEMEADO.turmaJanelaTarde);
    await expect(erro, "vazou o texto do motor").not.toContainText("23514");
  });

  test("⚠️ Visualização não vê o botão de situação (`FR-017.8`)", async ({ page }) => {
    await entrar(
      page,
      EMAIL_VISUALIZACAO,
      `/cursos/${encodeURIComponent(SEMEADO.porClassificacao.regular)}`,
    );
    await expect(page.locator('[data-slot="cabecalho-do-curso"]')).toBeVisible();
    await expect(page.locator('[data-slot="acoes-de-situacao"]')).toHaveCount(0);
  });
});
