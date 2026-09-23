/**
 * Cadastrar, editar e consultar turma (`FR-025` a `FR-031.6`, US5).
 *
 * ⚠️ **OS PERCURSOS RODAM CONTRA A AMOSTRA, NUNCA CONTRA A BASE REAL.** As tarefas T190 e T191
 * nomeiam `C-Ap-FR`, `C-ApA-OcOp-PR-SP` e `C-Exp-BATI`, que são cursos da planilha da v2.0 — e **o CI
 * reseta o banco**: lá eles não existem. Um caso escrito sobre eles passaria nesta máquina e
 * reprovaria no CI **sobre o mesmo commit**, que é o defeito de verificação que o `SC-005` proíbe. A
 * amostra de `cursos-de-teste.ts` reproduz cada propriedade que os percursos medem: curso com limite
 * folgado, curso com limite atingido, turma sem janela, turma `ativa` com término passado e a
 * atividade **global** que trava a vigência.
 *
 * ⚠️ **TURMA É APAGÁVEL, CURSO NÃO** (regra 9.1). `limparCursos` remove as turmas destes percursos e
 * deixa os cursos de pé — por isso os anos usados aqui (2027 a 2031) não colidem com os da amostra.
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
let EMAIL_AJUDANTE = "";
let EMAIL_OPERADOR = "";
let SEMEADO: CursosSemeados;

/** A turma `planejada` que os percursos de edição mexem — ano próprio, para não cruzar com outros. */
let TURMA_DE_EDICAO = "";

/**
 * Cria uma turma pela `service_role` e devolve **o código que o gatilho carimbou**.
 *
 * ⚠️ O `codigo` NÃO é enviado (`FR-025.1`) — o gatilho recusa valor divergente.
 */
async function semearTurma(
  cursoId: string,
  rotulo: string | null,
  ano: number,
  status = "planejada",
): Promise<string> {
  const { data, error } = await admin()
    .from("turmas")
    .insert({
      curso_id: cursoId,
      turma: rotulo,
      ano_letivo: ano,
      status,
      modalidade: "presencial",
    })
    .select("codigo")
    .single();
  if (error) throw new Error(`falha ao semear turma ${rotulo ?? "(sem rotulo)"}: ${error.message}`);
  return data.codigo as string;
}

async function idDoCurso(sigla: string): Promise<string> {
  const { data, error } = await admin().from("cursos").select("id").eq("codigo", sigla).single();
  if (error) throw new Error(`nao li o curso ${sigla}: ${error.message}`);
  return data.id as string;
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;

  EMAIL_ADMIN = emailDeTeste("turmas-admin", p);
  EMAIL_AJUDANTE = emailDeTeste("turmas-ajudante", p);
  EMAIL_OPERADOR = emailDeTeste("turmas-operador", p);

  await criarConta(EMAIL_ADMIN, `USR-TUR-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
  await criarConta(EMAIL_AJUDANTE, `USR-TUR-AJU-${p}`, "ajudante_administracao_academica");
  /* ⚠️ O ESCOPO ESTREITO É O QUE DÁ CONTRAPROVA ao recorte: ele alcança só o Expedito. */
  await criarConta(EMAIL_OPERADOR, `USR-TUR-OPE-${p}`, "operador", "expedito");

  const regular = await idDoCurso(SEMEADO.porClassificacao.regular);
  const expedito = await idDoCurso(SEMEADO.porClassificacao.expedito);

  /*
   * ⚠️ O LIMITE É ATINGIDO NO EXPEDITO, E FOLGADO NO REGULAR — são cursos diferentes de propósito.
   *    O Expedito não declara `limite_turmas_ano`, então o gatilho o preenche pela classificação:
   *    **2**. Duas turmas que contam em 2030 e a terceira já pergunta. O regular declara **3**.
   */
  await semearTurma(expedito, "T1", 2030, "planejada");
  await semearTurma(expedito, "T2", 2030, "ativa");

  /* A turma que os percursos de rótulo colidem, e a sem rótulo do outro ano. */
  await semearTurma(regular, "T1", 2027);
  await semearTurma(regular, null, 2029);

  TURMA_DE_EDICAO = await semearTurma(regular, "T1", 2031);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_AJUDANTE);
  await apagarConta(EMAIL_OPERADOR);
});

const formulario = (page: Page) => page.locator('[data-slot="formulario-de-turma"]');
const erro = (page: Page) => page.locator('[data-slot="erro-do-formulario"]');
const dialogo = (page: Page) => page.locator('[data-slot="dialogo-confirmacao"]');
const enderecoDe = (codigo: string) => `/turmas/${encodeURIComponent(codigo)}`;

/** Preenche o mínimo que o `FR-025` exige numa turma nova. */
async function preencherNova(page: Page, ano: string, rotulo: string) {
  await page.locator("#turma-ano").fill(ano);
  await page.locator("#turma-situacao").selectOption("planejada");
  await page.locator("#turma-modalidade").selectOption("presencial");
  await page.locator("#turma-rotulo").fill(rotulo);
}

test.describe("`FR-025` · criar turma sob o curso do caminho", () => {
  test("cria a T3 de 2027 e cai na ficha, com o curso e o caminho de volta", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_AJUDANTE, `/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await expect(formulario(page)).toHaveAttribute("data-modo", "novo");

    // ⚠️ `FR-015.1` em ato: os três abrem VAZIOS, sem padrão silencioso.
    await expect(page.locator("#turma-ano")).toHaveValue("");
    await expect(page.locator("#turma-situacao")).toHaveValue("");
    await expect(page.locator("#turma-modalidade")).toHaveValue("");

    await preencherNova(page, "2027", "T3");
    await page.locator('[data-slot="gravar-turma"]').click();

    /*
     * ⚠️ O CÓDIGO É O DO GATILHO, e o endereço carrega os espaços dele codificados (`FR-025.1`).
     *    Escrevê-lo à mão aqui seria reimplementar `app.gerar_codigo_da_turma()` no teste.
     */
    const codigo = `${sigla} T3 2027`;
    await expect.poll(() => new URL(page.url()).pathname).toBe(enderecoDe(codigo));
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);

    const volta = page.locator('[data-slot="voltar-ao-curso"]');
    await expect(volta).toContainText(sigla);
    await volta.click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);
  });

  test("⚠️ o ano no limite pergunta com ano, contagem e limite — e o curso folgado NÃO", async ({
    page,
  }) => {
    const expedito = SEMEADO.porClassificacao.expedito;
    await entrar(page, EMAIL_AJUDANTE, `/cursos/${encodeURIComponent(expedito)}/turmas/nova`);
    await preencherNova(page, "2030", "T3");

    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText("2 turma(s) em 2030");
    await expect(dialogo(page)).toContainText("o limite é 2");

    await dialogo(page).getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(enderecoDe(`${expedito} T3 2030`));

    /*
     * ⚠️ O CASO QUE DISCRIMINA: o mesmo ano, no curso de limite folgado, grava **sem** perguntar. Sem
     *    esta metade, uma implementação que perguntasse sempre passaria no caso de cima.
     */
    const regular = SEMEADO.porClassificacao.regular;
    await page.goto(`/cursos/${encodeURIComponent(regular)}/turmas/nova`);
    await preencherNova(page, "2030", "T1");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(enderecoDe(`${regular} T1 2030`));
    await expect(dialogo(page)).toHaveCount(0);
  });

  test("⚠️ a segunda turma sem rótulo recebe a NOTA, e nota não é diálogo (`FR-026.1`)", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_AJUDANTE, `/cursos/${encodeURIComponent(sigla)}/turmas/nova`);

    await page.locator("#turma-ano").fill("2029");
    await page.locator("#turma-situacao").selectOption("planejada");
    await page.locator("#turma-modalidade").selectOption("presencial");

    const nota = page.locator('[data-slot="nota-do-rotulo"]');
    await expect(nota).toContainText(`${sigla} 2029`);
    await expect(nota).toContainText("T2");
    await expect(dialogo(page), "a nota virou diálogo").toHaveCount(0);

    // ⚠️ E ela SOME quando o rótulo é preenchido — a nota é sobre a ausência dele.
    await page.locator("#turma-rotulo").fill("T9");
    await expect(nota).toHaveCount(0);
  });
});

test.describe("`FR-026` · os quatro caminhos de colisão nomeiam quem ocupa", () => {
  const ocupada = () => `${SEMEADO.porClassificacao.regular} T1 2027`;
  const semRotulo = () => `${SEMEADO.porClassificacao.regular} 2029`;

  test("criar com rótulo já ocupado", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_AJUDANTE, `/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await preencherNova(page, "2027", "T1");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(erro(page)).toContainText(ocupada());
  });

  test("⚠️ criar SEM rótulo onde já há uma sem rótulo — o nulo também colide", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_AJUDANTE, `/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await page.locator("#turma-ano").fill("2029");
    await page.locator("#turma-situacao").selectOption("planejada");
    await page.locator("#turma-modalidade").selectOption("presencial");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(erro(page)).toContainText(semRotulo());
  });

  test("editar para um rótulo ocupado", async ({ page }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(TURMA_DE_EDICAO));
    await page.locator("#turma-ano").fill("2027");
    await page.locator("#turma-rotulo").fill("T1");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(erro(page)).toContainText(ocupada());
    // ⚠️ E a ficha continua sendo a mesma: recusa não grava metade.
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(TURMA_DE_EDICAO);
  });

  test("editar para SEM rótulo num ano que já tem uma sem rótulo", async ({ page }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(TURMA_DE_EDICAO));
    await page.locator("#turma-ano").fill("2029");
    await page.locator("#turma-rotulo").fill("");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(erro(page)).toContainText(semRotulo());
  });
});

test.describe("`FR-028` · editar a turma na própria ficha", () => {
  test("de `planejada` a `concluida` e de volta — sem passar por rota de edição", async ({
    page,
  }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(TURMA_DE_EDICAO));
    await expect(formulario(page)).toHaveAttribute("data-modo", "edicao");
    await expect(page.locator("#turma-situacao")).toHaveValue("planejada");

    await page.locator("#turma-situacao").selectOption("concluida");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-situacao")).toHaveValue("concluida", { timeout: 15_000 });

    await page.locator("#turma-situacao").selectOption("planejada");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-situacao")).toHaveValue("planejada", { timeout: 15_000 });
  });

  test("⚠️ mexer só no efetivo grava SEM diálogo — o limite não é da turma que já existe", async ({
    page,
  }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(TURMA_DE_EDICAO));
    await page.locator("#turma-alunos").fill("27");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(dialogo(page), "salvar o efetivo abriu diálogo").toHaveCount(0);
    await expect(page.locator("#turma-alunos")).toHaveValue("27", { timeout: 15_000 });
  });
});

test.describe("`FR-028.1` · os avisos informam e não bloqueiam", () => {
  test("turma `ativa` com término passado avisa, e a gravação acontece assim mesmo", async ({
    page,
  }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(SEMEADO.turmaAtivaComTerminoPassado));

    const quadro = page.locator('[data-slot="quadro-de-avisos-da-turma"]');
    /*
     * ⚠️ O QUADRO NASCE RECOLHIDO (`RNF-USA-04`), e fechado a lista **não é montada**. Contar
     *    `[data-aviso]` sem abrir mede zero em qualquer implementação — inclusive numa que nunca avisa.
     */
    await quadro.getByRole("button", { name: "Exibir avisos" }).click();
    await expect(quadro.locator('[data-aviso="ativa_com_termino_passado"]')).toHaveCount(1);

    await page.locator("#turma-alunos").fill("13");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-alunos")).toHaveValue("13", { timeout: 15_000 });
  });

  test("⚠️ turma sem janela avisa a janela — e NÃO acusa incoerência de data", async ({ page }) => {
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(SEMEADO.turmaSemJanela));
    const quadro = page.locator('[data-slot="quadro-de-avisos-da-turma"]');
    await quadro.getByRole("button", { name: "Exibir avisos" }).click();

    await expect(quadro.locator('[data-aviso="sem_janela"]')).toHaveCount(1);
    /*
     * ⚠️ DATA VAZIA NÃO DISPARA INCOERÊNCIA (`FR-028.1`): a ausência de janela já tem aviso próprio, e
     *    contar a mesma falha duas vezes mandaria corrigir a coisa errada.
     */
    await expect(quadro.locator('[data-aviso="planejada_com_inicio_passado"]')).toHaveCount(0);
    await expect(quadro.locator('[data-aviso="ativa_com_termino_passado"]')).toHaveCount(0);
  });
});

test.describe("`FR-031.4` · não encontrada depende do perfil", () => {
  test("Admin: a turma não existe, e a frase não fala em alcance", async ({ page }) => {
    const inexistente = `${SEMEADO.porClassificacao.regular} T9 2035`;
    await entrar(page, EMAIL_ADMIN, enderecoDe(inexistente));

    const aviso = page.locator('[data-slot="turma-nao-encontrada"]');
    await expect(aviso).toContainText("não encontrada");
    await expect(aviso).not.toContainText("alcance");
  });

  test("⚠️ Operador de escopo estreito: a mesma tela, e a frase carrega as DUAS possibilidades", async ({
    page,
  }) => {
    /*
     * ⚠️ A TURMA EXISTE — é a do curso regular, que o Operador `expedito` não alcança. Dizer-lhe "não
     *    existe" seria afirmar sobre o que a consulta dele não mediu, e a RLS não distingue os dois.
     */
    await entrar(page, EMAIL_OPERADOR, enderecoDe(SEMEADO.turmaJanelaCedo));

    const aviso = page.locator('[data-slot="turma-nao-encontrada"]');
    await expect(aviso).toContainText("fora do seu alcance");
    await expect(page.locator('[data-slot="formulario-de-turma"]')).toHaveCount(0);
  });
});

test.describe("`SC-011.5` · o Operador de escopo estreito trabalha dentro dele", () => {
  test("cria turma no Expedito que alcança, e muda a situação dela", async ({ page }) => {
    const expedito = SEMEADO.porClassificacao.expedito;
    await entrar(page, EMAIL_OPERADOR, `/cursos/${encodeURIComponent(expedito)}/turmas/nova`);

    await preencherNova(page, "2032", "T1");
    await page.locator("#turma-modalidade").selectOption("ead");
    await page.locator('[data-slot="gravar-turma"]').click();

    const codigo = `${expedito} T1 2032`;
    await expect.poll(() => new URL(page.url()).pathname).toBe(enderecoDe(codigo));

    await page.locator("#turma-situacao").selectOption("ativa");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-situacao")).toHaveValue("ativa", { timeout: 15_000 });
  });
});

test.describe("`FR-021.8` · encurtar a janela avisa qual vigência perde proteção", () => {
  test("⚠️ o diálogo NOMEIA a vigência e a atividade — e a gravação acontece", async ({ page }) => {
    /*
     * ⚠️ A ATIVIDADE É **GLOBAL**: ela não tem turma, e alcança o curso porque a data cai dentro da
     *    janela desta turma. Encurtar a janela para antes de 10/05/2026 tira o último alcance — e é
     *    exatamente isso que o `FR-021.8` manda dizer antes de gravar.
     */
    await entrar(page, EMAIL_AJUDANTE, enderecoDe(SEMEADO.turmaAtivaComTerminoPassado));
    await expect(page.locator("#turma-termino")).toHaveValue("2026-06-30");

    await page.locator("#turma-termino").fill("2026-04-30");
    await page.locator('[data-slot="gravar-turma"]').click();

    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText("deixam de estar protegidas");
    /*
     * ⚠️ A FRASE NOMEIA A ATIVIDADE PELA DESCRIÇÃO E PELA DATA — que é o que a RPC devolve, e o que
     *    quem lê reconhece. O código `ANL-…` não aparece em tela nenhuma.
     */
    await expect(dialogo(page)).toContainText("2026-05-10");

    // ⚠️ E ELA APARECE UMA VEZ SÓ: o envoltório tem um dono, e a frase aninhada era defeito.
    expect((await dialogo(page).innerText()).match(/deixam de estar protegidas/g)?.length).toBe(1);

    await dialogo(page).getByRole("button", { name: "Salvar" }).click();
    await expect(page.locator("#turma-termino")).toHaveValue("2026-04-30", { timeout: 15_000 });

    // A amostra volta ao estado que declara — o próximo caso não herda a janela encurtada.
    await page.locator("#turma-termino").fill("2026-06-30");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator("#turma-termino")).toHaveValue("2026-06-30", { timeout: 15_000 });
  });
});
