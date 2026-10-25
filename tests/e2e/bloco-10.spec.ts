/**
 * **Bloco 10 — padrões de tela**, por clique e conferido no banco (spec 025; `docs/correcoes/padroes-de-tela.md`).
 *
 * > *"RT-1 ações no canto superior direito, enfileiradas, ícones com dica; a dica é só o verbo. RT-2 tudo que se cadastra
 * > tem Editar, Desativar/Reativar e Excluir (permanente, com alerta). (…) RT-5 todo gráfico é interativo. RT-6 seletor
 * > de ano (…) todos os módulos mostram só o ano selecionado."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **OS CASOS QUE DISCRIMINAM** (DoD 8): a turma com uma aula tem o *Excluir* desabilitado com a dica; a turma sem
 *    registro sai — pela ficha e pela linha da aba Turmas do curso —, e o banco confirma (`count` zero e o rastro). A
 *    linha do calendário sem semana salva sai; o ano escolhido numa tela vale na outra.
 * ⚠️ **A PROVA É A TELA E O BANCO** (PEND-016-2): toda gravação é conferida por leitura do banco, não pelo campo.
 * ⚠️ **IDEMPOTENTE** (regra 9.1): a semente apaga e refaz turmas e disciplinas a cada execução; o curso fica, e o rastro
 *    das exclusões (só de acréscimo) aponta para `id`s que a execução seguinte não reusa.
 */
import { expect, test, type Page } from "@playwright/test";

import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { bancoDoBloco2, limparBloco2, semearBloco2, type Bloco2Semeado } from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirAbaDoCurso, irAoCursoPorClique } from "./navegar-curso";
import { irAFichaDaTurma } from "./navegar-turmas";
import { abrirPainel, escolherAno } from "./paineis";
import { abrirPainelDeFiltros } from "./filtros";

const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

let SEMEADO: Bloco2Semeado;
let SIGLA = "";
let INSTRUTOR = "";
let EMAIL = "";
const ANO = Number(hojeNaCiaara().slice(0, 4));
const feriado = { id: "", codigo: "", descricao: "" };

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  SIGLA = `CUR-B10E${p}`;
  INSTRUTOR = `B10E-INS-${p}`;
  SEMEADO = await semearBloco2({
    sigla: SIGLA,
    nome: `Curso do Bloco 10 ${p}`,
    disciplinas: [
      { cod: "X", nome: "Disciplina dez", ch: 30 },
      { cod: "II", nome: "Disciplina dois", ch: 20 },
      { cod: "I", nome: "Disciplina um", ch: 10 },
    ],
    turmas: [
      {
        chave: "T1",
        ano: ANO,
        status: "planejada",
        inicio: `${ANO}-03-02`,
        termino: `${ANO}-11-30`,
      },
      { chave: "T2", ano: ANO, status: "ativa", inicio: `${ANO}-03-02`, termino: `${ANO}-11-30` },
      {
        chave: "T3",
        ano: ANO,
        status: "planejada",
        inicio: `${ANO}-03-02`,
        termino: `${ANO}-11-30`,
      },
    ],
    aulas: [{ sufixo: "A1", turma: "T2", cod: "I", data: `${ANO}-03-03`, tempos: 2, taInicial: 1 }],
    instrutorCodigo: INSTRUTOR,
  });
  EMAIL = emailDeTeste("bloco-10", p);
  await criarConta(EMAIL, `USR-B10E-${p}`);

  feriado.descricao = `B10E feriado ${p}`;
  const banco = bancoDoBloco2();
  await banco.from("feriados").delete().eq("descricao", feriado.descricao);
  const { data, error } = await banco
    .from("feriados")
    .insert({
      ano: ANO,
      data: `${ANO}-12-28`,
      descricao: feriado.descricao,
      impacto: "informativo",
      status: "ativo",
    })
    .select("id, codigo")
    .single();
  if (error) throw new Error(`feriado da amostra: ${error.message}`);
  Object.assign(feriado, data);
});

test.afterAll(async () => {
  await bancoDoBloco2().from("feriados").delete().eq("descricao", feriado.descricao);
  await apagarConta(EMAIL);
  await limparBloco2(SIGLA, INSTRUTOR);
});

const turma = (chave: string) => SEMEADO.turmas[chave] as { id: string; codigo: string };

async function turmaNoBanco(id: string): Promise<number> {
  const { count } = await bancoDoBloco2()
    .from("turmas")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  return count ?? 0;
}

async function rastroDe(id: string): Promise<number> {
  const { count } = await bancoDoBloco2()
    .from("exclusoes_registradas")
    .select("id", { count: "exact", head: true })
    .eq("registro_id", id);
  return count ?? 0;
}

test.describe("item 1 · a ficha da turma", () => {
  test("identificação limpa, a barra no topo direito na ordem do pedido, e os oito cartões juntos", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL, turma("T2").codigo);
    const cabecalho = page.locator('[data-slot="cabecalho-da-turma"]');
    await expect(cabecalho.locator('[data-slot="curso-da-turma"]')).toContainText(
      `${SIGLA} — Curso do Bloco 10`,
    );
    await expect(cabecalho.locator('[data-slot="curriculo-da-turma"]')).toContainText("Currículo");
    await expect(page.locator('[data-slot="voltar-as-turmas"]')).toHaveCount(0);

    const ordem = await cabecalho
      .locator('[data-slot="barra-de-acoes"] [data-acao]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-slot")));
    expect(ordem).toEqual([
      "abrir-o-dsa",
      "baixar-planilha-de-contingencia",
      "editar-turma",
      "arquivar-turma",
      "excluir-turma",
    ]);

    // RT-1: a dica é só o verbo; o nome acessível diz o resto.
    await cabecalho.locator('[data-slot="editar-turma"]').hover();
    await expect(page.getByRole("tooltip")).toHaveText("Editar");

    // RT-7: os cartões de andamento, tetos e avaliações numa grade só.
    await expect(
      page.locator('[data-slot="grade-de-indicadores"] [data-slot="card-kpi"]'),
    ).toHaveCount(8);
    // O fim da página não tem mais *Editar turma*.
    await expect(page.locator('[data-slot="abrir-edicao-da-turma"]')).toHaveCount(0);
  });

  test("D-COR-6 · a turma com aula tem o Excluir desabilitado, com a dica e o que prende", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL, turma("T2").codigo);
    const excluir = page.locator('[data-slot="cabecalho-da-turma"] [data-slot="excluir-turma"]');
    await expect(excluir).toHaveAttribute("data-indisponivel", "sim");
    await expect(excluir).toHaveAttribute("aria-label", /tem registros: use Arquivar/);
    await expect(excluir).toHaveAttribute("aria-label", /aula lançada/);
    await excluir.hover();
    await expect(page.getByRole("tooltip")).toHaveText("tem registros: use Arquivar");
    expect(await turmaNoBanco(turma("T2").id)).toBe(1);
  });

  test("RT-2 · a turma sem registro sai pela ficha, com alerta e código digitado — e o banco confirma", async ({
    page,
  }) => {
    const { id, codigo } = turma("T1");
    await irAFichaDaTurma(page, EMAIL, codigo);
    await page.locator('[data-slot="cabecalho-da-turma"] [data-slot="excluir-turma"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-exclusao"]');
    await expect(dialogo).toContainText("permanente");
    const confirmar = dialogo.locator('[data-slot="confirmar-exclusao"]');
    await dialogo.locator('[data-slot="codigo-de-confirmacao"]').fill("outro código");
    await expect(confirmar).toBeDisabled();
    await dialogo.locator('[data-slot="codigo-de-confirmacao"]').fill(codigo);
    await confirmar.click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    await expect(page.locator('[data-slot="turma-excluida"]')).toContainText(codigo);
    await expect.poll(() => turmaNoBanco(id)).toBe(0);
    expect(await rastroDe(id), "a exclusão não deixou rastro").toBe(1);
  });
});

test.describe("item 2 · a aba Turmas do curso", () => {
  test("cada linha tem Editar · Arquivar · Excluir; a turma limpa sai pela linha", async ({
    page,
  }) => {
    const { id, codigo } = turma("T3");
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "turmas");
    const linha = page.locator(`[data-slot="turmas-do-curso"] tr`).filter({ hasText: codigo });
    await expect(linha.locator('[data-slot="editar-da-linha"]')).toBeVisible();
    await expect(linha.locator('[data-slot="arquivar-da-linha"]')).toBeVisible();
    // A com aula, desabilitada; a limpa, liberada.
    await expect(
      page
        .locator(`[data-slot="turmas-do-curso"] tr`)
        .filter({ hasText: turma("T2").codigo })
        .locator('[data-slot="excluir-da-linha"]'),
    ).toHaveAttribute("data-indisponivel", "sim");

    await linha.locator('[data-slot="excluir-da-linha"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-exclusao"]');
    await dialogo.locator('[data-slot="codigo-de-confirmacao"]').fill(codigo);
    await dialogo.locator('[data-slot="confirmar-exclusao"]').click();
    await expect.poll(() => turmaNoBanco(id)).toBe(0);
    await expect(
      page.locator(`[data-slot="turmas-do-curso"] tr`).filter({ hasText: codigo }),
    ).toHaveCount(0);
  });
});

test.describe("item 11 · o calendário", () => {
  test("a dica é o verbo, «Desativar» no lugar de «Inativar», e a linha sem semana salva sai", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Atividades", exact: true }).click();
    await page.locator('[data-aba="calendario"]').click();
    const linha = page.locator(`[data-linha="${feriado.codigo}"]`);
    await expect(linha).toBeVisible({ timeout: 15_000 });
    await expect(linha.locator('[data-slot="desativar-linha"]')).toHaveAttribute(
      "aria-label",
      /^Desativar /,
    );
    await linha.locator('[data-slot="desativar-linha"]').hover();
    await expect(page.getByRole("tooltip")).toHaveText("Desativar");
    await expect(page.locator("main")).not.toContainText("Inativar");
    // O Excluir se alcança por teclado: a tabela do calendário não é grade, e o `Tab` passa por ele (revisão do PR #90).
    await linha.locator('[data-slot="desativar-linha"]').focus();
    await page.keyboard.press("Tab");
    await expect(linha.locator('[data-slot="excluir-linha"]')).toBeFocused();

    await linha.locator('[data-slot="excluir-linha"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-exclusao"]');
    await dialogo.locator('[data-slot="codigo-de-confirmacao"]').fill(feriado.codigo);
    await dialogo.locator('[data-slot="confirmar-exclusao"]').click();
    await expect(page.locator('[data-slot="resposta-do-calendario"]')).toHaveText(
      "Linha excluída do calendário.",
    );
    const { count } = await bancoDoBloco2()
      .from("feriados")
      .select("id", { count: "exact", head: true })
      .eq("id", feriado.id);
    expect(count).toBe(0);
  });
});

test.describe("item 10 · RT-6 · o ano escolhido vale nos outros módulos", () => {
  test("escolher o ano em Turmas, e o Início abre nele; voltar ao de hoje limpa a escolha", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    await escolherAno(page, ANO + 1);
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText(`em ${ANO + 1}`);

    await MENU(page).getByRole("link", { name: "Início", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/inicio");
    await expect(page.locator('[data-slot="ano-do-painel-escolha"]')).toHaveValue(String(ANO + 1));
    await expect(page.locator('[data-slot="turmas-do-ano"]')).toHaveAttribute(
      "data-ano",
      String(ANO + 1),
    );

    await escolherAno(page, ANO);
    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect(page.locator('[data-slot="ano-do-painel-escolha"]')).toHaveValue(String(ANO));
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText(`em ${ANO}`);
  });

  test("aberto por um link com «?ano=», o seletor troca o ano e o endereço acompanha", async ({
    page,
  }) => {
    /*
     * Revisão do PR #90: com `window.history.state` (que traz a marca `__NA`) o Next não passava a URL nova ao
     * roteador, o `refresh()` pedia a antiga, e a URL vence o cookie — a tela ficava presa no ano do link.
     */
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    // O ponto de partida é o link que alguém mandaria, com o ano nele.
    await page.goto(`/turmas?ano=${ANO + 1}`);
    const escolha = page.locator('[data-slot="ano-do-painel-escolha"]');
    await expect(escolha).toHaveValue(String(ANO + 1), { timeout: 15_000 });

    await escolha.selectOption(String(ANO + 2));
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText(`em ${ANO + 2}`, {
      timeout: 15_000,
    });
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe(String(ANO + 2));
    await expect(escolha).toHaveValue(String(ANO + 2));

    await escolha.selectOption(String(ANO));
    await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText(`em ${ANO}`, {
      timeout: 15_000,
    });
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBeNull();
  });

  test("o seletor oferece qualquer ano de 2020 até o de hoje + 10", async ({ page }) => {
    await entrar(page, EMAIL, "/turmas");
    await expect(page.locator('[data-slot="ano-do-painel-escolha"]')).toBeVisible({
      timeout: 15_000,
    });
    const opcoes = await page
      .locator('[data-slot="ano-do-painel-escolha"] option')
      .evaluateAll((els) => els.map((e) => Number(e.getAttribute("value"))));
    expect(opcoes[0]).toBe(ANO + 10);
    expect(opcoes.at(-1)).toBe(2020);
    expect(opcoes).toHaveLength(ANO + 10 - 2020 + 1);
  });
});

test.describe("item 8 · RT-5 · o gráfico é interativo", () => {
  test("clicar na legenda tira o grupo, o gráfico se redistribui e «Mostrar todos» devolve", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Cursos", exact: true }).click();
    await abrirPainel(page, "estatisticas");
    const pizza = page.locator('[data-chave="por-classificacao"] [data-slot="grafico-pizza"]');
    await expect(pizza).toBeVisible();
    const visiveis = Number(await pizza.getAttribute("data-visiveis"));
    expect(visiveis, "a amostra precisa de duas classificações").toBeGreaterThan(1);

    const primeiro = pizza.locator('[data-slot="alternar-grupo"]').first();
    await expect(primeiro).toHaveAttribute("aria-pressed", "true");
    await primeiro.click();
    await expect(primeiro).toHaveAttribute("aria-pressed", "false");
    await expect(pizza).toHaveAttribute("data-visiveis", String(visiveis - 1));
    await expect(primeiro).toContainText("oculto");

    await pizza.locator('[data-slot="mostrar-todos"]').click();
    await expect(pizza).toHaveAttribute("data-visiveis", String(visiveis));
    await expect(pizza.locator('[data-slot="mostrar-todos"]')).toHaveCount(0);
  });
});

test.describe("item 7 · Editar curso", () => {
  test("Cadastro e Currículo em abas; o link antigo com «parte» abre o Currículo", async ({
    page,
  }) => {
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await page.locator('[data-slot="ir-para-editar-curso"]').click();
    const abas = page.locator('[data-slot="abas-da-edicao-do-curso"]');
    await expect(abas.locator('[role="tab"][data-aba="cadastro"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator('[data-slot="formulario-de-curso"]')).toBeVisible();
    await expect(page.locator('[data-slot="curriculo-na-edicao"]')).toHaveCount(0);

    await abas.locator('[role="tab"][data-aba="curriculo"]').click();
    await expect(page.locator('[data-slot="parte-dados"]')).toBeVisible();
    const partes = await page
      .locator('[data-slot="partes-do-curriculo"] [role="tab"]')
      .allInnerTexts();
    expect(partes).toEqual(["Disciplinas", "Horários", "Atividades e limites"]);

    // Da sub-aba Horários de volta ao Cadastro: a sub-aba sai junto, e a página não devolve ao Currículo (revisão do
    // PR #90 — sobrava `?parte=` sem `?aba=`, a forma do link antigo).
    await page
      .locator('[data-slot="partes-do-curriculo"] [role="tab"]', { hasText: "Horários" })
      .click();
    await expect.poll(() => new URL(page.url()).searchParams.get("parte")).toBe("horarios");
    await abas.locator('[role="tab"][data-aba="cadastro"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("parte")).toBeNull();
    await page.waitForLoadState("networkidle");
    await expect(abas.locator('[role="tab"][data-aba="cadastro"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator('[data-slot="formulario-de-curso"]')).toBeVisible();
    expect(new URL(page.url()).searchParams.get("aba")).toBeNull();

    // O endereço guardado antes do Bloco 10 (`?parte=`) continua chegando onde a parte mora.
    await page.goto(`/cursos/${encodeURIComponent(SIGLA)}/editar?parte=horarios`);
    await expect.poll(() => new URL(page.url()).searchParams.get("aba")).toBe("curriculo");
    await expect(page.locator('[role="tabpanel"]#painel-parte-horarios')).toBeVisible();
  });
});

/*
 * Conferência de 24/10/2026 (Bernardo Villas Boas): «REGRA PARA O SISTEMA TODO (RT-6): o ano de qualquer informação
 * ligada a turma é o ANO DA TURMA, nunca a data do registro ou a janela da atribuição». O defeito: o mesmo instrutor
 * na mesma disciplina numa turma de cada ano, e a ficha de um ano somava as duas — a janela da turma do ano seguinte
 * cai no ano corrente (a previsão é da DISCIPLINA, como no CAHO 2027 do remoto). A amostra reproduz isso, com uma aula
 * da turma do ano seguinte DATADA no ano corrente, e um segundo currículo, vigente no ano seguinte, com outra duração.
 */
test.describe("RT-6 · o ano da turma (conferência de 24/10/2026)", () => {
  let ANUAL: Bloco2Semeado;
  let SIGLA_A = "";
  let INS_A = "";

  async function semErro(o: string, p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) throw new Error(`semente do ano da turma — ${o}: ${error.message}`);
  }

  test.beforeAll(async ({}, info) => {
    const p = info.workerIndex;
    SIGLA_A = `CUR-B10A${p}`;
    INS_A = `B10A-INS-${p}`;
    const banco = bancoDoBloco2();
    // O segundo currículo de uma rodada anterior sai ANTES da semente (o curso fica — regra 9.1).
    const { data: existe } = await banco
      .from("cursos")
      .select("id")
      .eq("codigo", SIGLA_A)
      .maybeSingle();
    if (existe) {
      await semErro(
        "currículo 2 antigo",
        banco
          .from("curriculos")
          .delete()
          .eq("curso_id", (existe as { id: string }).id)
          .gt("versao", 1),
      );
    }
    ANUAL = await semearBloco2({
      sigla: SIGLA_A,
      nome: `Curso do ano da turma ${p}`,
      disciplinas: [{ cod: "I", nome: "Disciplina do ano", ch: 30 }],
      turmas: [
        {
          chave: "T1",
          ano: ANO,
          status: "planejada",
          inicio: `${ANO}-03-02`,
          termino: `${ANO}-11-30`,
        },
        {
          chave: "T2",
          ano: ANO + 1,
          status: "planejada",
          inicio: `${ANO}-12-01`,
          termino: `${ANO + 1}-06-30`,
        },
      ],
      // A aula da turma do ano SEGUINTE, datada no ano corrente.
      aulas: [
        { sufixo: "A2", turma: "T2", cod: "I", data: `${ANO}-12-10`, tempos: 4, taInicial: 1 },
      ],
      instrutorCodigo: INS_A,
    });
    const disciplina = ANUAL.disciplinas.I as string;
    // A janela das DUAS turmas cai no ano corrente: a previsão é da disciplina.
    await semErro(
      "previsão da disciplina",
      banco
        .from("disciplinas")
        .update({ previsao_inicio: `${ANO}-03-02`, previsao_termino: `${ANO}-06-26` })
        .eq("id", disciplina),
    );
    await semErro(
      "designações",
      banco.from("turma_disciplina_instrutor").insert(
        (["T1", "T2"] as const).map((t) => ({
          codigo: `${SIGLA_A}-TDI-${t}`,
          turma_disciplina_id: ANUAL.linhas[`${t}|I`] as string,
          instrutor_id: ANUAL.instrutorId,
        })),
      ),
    );
    // A duração: o currículo 1 desde sempre, com 29 semanas; o 2, vigente no ano seguinte, com 41.
    await semErro(
      "currículo 1",
      banco
        .from("curriculos")
        .update({ vigente_de: "2020-01-01", duracao_semanas: 29 })
        .eq("curso_id", ANUAL.cursoId)
        .eq("versao", 1),
    );
    await semErro(
      "currículo 2",
      banco.from("curriculos").insert({
        codigo: `${SIGLA_A}-CUR-2`,
        curso_id: ANUAL.cursoId,
        versao: 2,
        vigente_de: `${ANO + 1}-01-01`,
        duracao_dias: 200,
        duracao_semanas: 41,
      }),
    );
  });

  test.afterAll(async () => {
    if (!ANUAL) return;
    await bancoDoBloco2().from("curriculos").delete().eq("curso_id", ANUAL.cursoId).gt("versao", 1);
    await limparBloco2(SIGLA_A, INS_A);
  });

  test("a ficha do instrutor: em cada ano, só a turma DO ano — atribuições, prevista e ministrada", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Instrutores", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/instrutores");
    await abrirPainelDeFiltros(page);
    await page.getByLabel("Buscar por nome").fill(INS_A.toLowerCase());
    await page.locator(`a[href="/instrutores/${INS_A}"]`).click();

    const carga = page.locator('[data-slot="carga-do-instrutor"]');
    const prevista = page.locator('[data-slot="carga-prevista"]');
    const ministrada = page.locator('[data-slot="carga-ministrada"]');
    const tabela = page.locator('[data-slot="atribuicoes-previstas"]');
    await expect(carga).toContainText(`Carga horária de ${ANO}`, { timeout: 15_000 });
    await expect(prevista, "a turma do ano seguinte entrou na prevista deste ano").toHaveText(
      "30 TA",
    );
    await expect(ministrada, "a aula da turma do ano seguinte entrou neste ano").toHaveText("0 TA");
    await expect(tabela).toContainText(ANUAL.turmas.T1!.codigo);
    await expect(tabela).not.toContainText(ANUAL.turmas.T2!.codigo);

    await escolherAno(page, ANO + 1);
    await expect(carga).toContainText(`Carga horária de ${ANO + 1}`);
    await expect(prevista, "a turma do ano seguinte não ficou no ano dela").toHaveText("30 TA");
    await expect(ministrada).toHaveText("4 TA");
    await expect(tabela).toContainText(ANUAL.turmas.T2!.codigo);
    await expect(tabela).not.toContainText(ANUAL.turmas.T1!.codigo);
  });

  test("o filtro Curso de Instrutores: só quem foi designado em turma do ano escolhido", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Instrutores", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/instrutores");
    await abrirPainelDeFiltros(page);
    await page.getByRole("combobox", { name: "Curso", exact: true }).click();
    await page
      .getByRole("option", { name: new RegExp(`^${SIGLA_A}`) })
      .first()
      .click();
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(SIGLA_A);
    const contagem = page.locator('[data-slot="contagem-de-instrutores"]');
    await expect(contagem).toContainText("1 instrutor(es)", { timeout: 15_000 });

    // Dois anos à frente não há turma do curso: o vínculo de outro ano não conta (D-39 invertida).
    await escolherAno(page, ANO + 2);
    await expect(contagem, "a designação de outro ano entrou no filtro Curso").toContainText(
      "0 instrutor(es)",
    );
  });

  test("Cursos: a duração é a do currículo vigente no ano escolhido", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await MENU(page).getByRole("link", { name: "Cursos", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos");
    const cartao = page.locator(`[data-slot="cartao-de-curso"][data-curso="${SIGLA_A}"]`);
    await expect(cartao).toContainText("29 semanas", { timeout: 15_000 });

    await escolherAno(page, ANO + 1);
    await expect(cartao, "a duração não seguiu o currículo do ano").toContainText("41 semanas");
  });
});
