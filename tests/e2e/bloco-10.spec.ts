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

    // O endereço guardado antes do Bloco 10 (`?parte=`) continua chegando onde a parte mora.
    await page.goto(`/cursos/${encodeURIComponent(SIGLA)}/editar?parte=horarios`);
    await expect.poll(() => new URL(page.url()).searchParams.get("aba")).toBe("curriculo");
    await expect(page.locator('[role="tabpanel"]#painel-parte-horarios')).toBeVisible();
  });
});
