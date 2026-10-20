/**
 * Spec 019 (Bloco 4) — **o Início do ano**, **os dois carrosséis** e **o submenu da lateral**, por clique e teclado.
 *
 * Os casos que discriminam (DoD 8):
 *   - a turma PLANEJADA do ano seguinte não aparece no Início do ano vigente (SC-001);
 *   - a manchete do DSA traz os TA e os dias lançados nesta semana; a turma EAD pura, com a mesma janela, não entra
 *     (SC-003);
 *   - pela lateral, Turmas → turma abre a ficha marcada; a arquivada não está lá (SC-004).
 *
 * ⚠️ **OS CINCO AJUSTES DA CONFERÊNCIA DE 20/10/2026** (Bernardo Villas Boas), cada um com o seu caso:
 *   A-1 o ano numa CAIXA DE SELEÇÃO no canto superior direito, sem "ano letivo"; A-2 cartões só das turmas ATIVAS do
 *   ano (os números contam todas), e uma frase quando não há; A-3 o título do cartão é só o nome da turma; A-4 o
 *   cartão leva à FICHA DA TURMA; A-5 o submenu de Turmas lista direto as turmas do ano vigente, sem o nível do curso.
 *
 * ⚠️ A SEMANA É A DE HOJE (a de São Paulo, `hojeNaCiaara`): a amostra lança aula nela, e a janela das turmas a cobre.
 * ⚠️ Regra 9.1: o curso não se apaga — reaproveitado; turmas e aulas saem no começo e no fim. O registro de
 *    arquivamento é só de acréscimo (fica, sem FK, como em `bloco-2.test.ts`).
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { campoDaSemanaDoCurso, semanaDoCurso } from "@/lib/dominio/dsa/semana-do-curso";
import { semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const HOJE = hojeNaCiaara();
const ANO = Number(HOJE.slice(0, 4));
const SEMANA = semanaDoPainel(HOJE);
/** Terça da semana atual (o 2º dia de `SEMANA`), para a segunda aula. */
const TERCA = new Date(Date.parse(`${SEMANA.de}T12:00:00Z`) + 86_400_000)
  .toISOString()
  .slice(0, 10);

let EMAIL = "";
let SIGLA = "";
let PREFIXO = "";
let CURSO_ID = "";
const T = {
  comAula: "",
  semAula: "",
  ead: "",
  seguinte: "",
  arquivada: "",
  planejada: "",
  concluida: "",
};

async function idPorCodigo(tabela: string, codigo: string, novo: Record<string, unknown>) {
  const { data: existe } = await admin.from(tabela).select("id").eq("codigo", codigo).maybeSingle();
  if (existe) return (existe as { id: string }).id;
  const { data, error } = await admin
    .from(tabela)
    .insert({ codigo, ...novo })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao semear ${tabela} ${codigo}: ${error.message}`);
  return (data as { id: string }).id;
}

async function limpar(): Promise<void> {
  if (CURSO_ID === "") return;
  await admin.from("registros_aula").delete().like("codigo", `${PREFIXO}-%`);
  const { data: turmas } = await admin.from("turmas").select("id").eq("curso_id", CURSO_ID);
  for (const t of (turmas ?? []) as { id: string }[]) {
    await admin.from("turma_disciplina").delete().eq("turma_id", t.id);
    await admin.from("turmas").delete().eq("id", t.id);
  }
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("inicio-b4", p);
  SIGLA = `CUR-INI4-${p}`;
  PREFIXO = `INI4-${p}`;
  await criarConta(EMAIL, `USR-INI4-${p}`);

  const { data: existe } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) CURSO_ID = (existe as { id: string }).id;
  else {
    const { data, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso do Início ${p}`,
        classificacao: "especial",
        modalidade: "presencial",
        duracao_dias: 200,
        duracao_semanas: 40,
      },
      p_regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    if (error) throw new Error(`falha ao semear ${SIGLA}: ${error.message}`);
    CURSO_ID = (data as { id: string }).id;
  }
  await limpar();

  // A janela: [início, término]; a planejada e a concluída do ano ficam fora da semana de hoje, quando der.
  const turmas: [keyof typeof T, string, number, string, string, [string, string]][] = [
    ["comAula", "T1", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["semAula", "T2", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["ead", "T3", ANO, "ativa", "ead", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["arquivada", "T4", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["planejada", "T5", ANO, "planejada", "presencial", [`${ANO}-12-21`, `${ANO}-12-30`]],
    ["concluida", "T6", ANO, "concluida", "presencial", [`${ANO}-01-05`, `${ANO}-01-09`]],
    [
      "seguinte",
      "T1",
      ANO + 1,
      "planejada",
      "presencial",
      [`${ANO + 1}-03-01`, `${ANO + 1}-11-30`],
    ],
  ];
  for (const [chave, rotulo, ano, status, modalidade, [inicio, termino]] of turmas) {
    const { error } = await admin.from("turmas").insert({
      curso_id: CURSO_ID,
      turma: rotulo,
      ano_letivo: ano,
      status,
      modalidade,
      data_inicio: inicio,
      data_termino: termino,
      alunos: 10,
    });
    if (error) throw new Error(`falha ao criar a turma ${chave}: ${error.message}`);
    const { data } = await admin
      .from("turmas")
      .select("id, codigo")
      .eq("curso_id", CURSO_ID)
      .eq("ano_letivo", ano)
      .eq("turma", rotulo)
      .single();
    T[chave] = (data as { codigo: string }).codigo;
    if (chave === "arquivada") {
      const { error: e } = await admin
        .from("turma_arquivamentos")
        .insert({ turma_id: (data as { id: string }).id, acao: "arquivar", observacao: "amostra" });
      if (e) throw new Error(`falha ao arquivar: ${e.message}`);
    }
  }

  // Duas aulas da T1 nesta semana: 3 TA na segunda e 2 na terça → 5 TA em 2 dias, 1 disciplina.
  const disciplinaId = await idPorCodigo("disciplinas", `${PREFIXO}-DIS`, {
    curso_id: CURSO_ID,
    cod_disciplina: "I",
    nome_disciplina: "Disciplina do Início",
    carga_horaria_tempos: 40,
  });
  const ueId = await idPorCodigo("unidades_ensino", `${PREFIXO}-UE`, {
    disciplina_id: disciplinaId,
    curso_id: CURSO_ID,
    numero_ue: 1,
    topico: "Tópico do Início",
    ch_prevista_tempos: 40,
  });
  const instrutorId = await idPorCodigo("instrutores", `${PREFIXO}-INS`, {
    posto_graduacao: "CT",
    esp_hab_obs: "-EF",
    nome_completo: "Instrutor do Início",
    categoria: "Militar",
    om: "CIAARA",
  });
  const { data: t1 } = await admin.from("turmas").select("id").eq("codigo", T.comAula).single();
  for (const [n, data, tempos] of [
    [1, SEMANA.de, 3],
    [2, TERCA, 2],
  ] as const) {
    const { error } = await admin.from("registros_aula").insert({
      codigo: `${PREFIXO}-A${n}`,
      data,
      ta_inicial: 1,
      tempos_consumidos: tempos,
      turma_id: (t1 as { id: string }).id,
      curso_id: CURSO_ID,
      unidade_ensino_id: ueId,
      instrutor_id: instrutorId,
    });
    if (error) throw new Error(`falha ao lançar a aula ${n}: ${error.message}`);
  }
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
});

const cartao = (page: Page, codigo: string) =>
  page.locator(`[data-slot="carrossel-de-turmas"] [data-turma="${codigo}"]`);
const manchete = (page: Page, codigo: string) =>
  page.locator(`[data-slot="manchete-do-dsa"][data-turma-da-manchete="${codigo}"]`);

/** O número de um indicador do Início, pelo rótulo. */
async function indicadorDoInicio(page: Page, rotulo: string): Promise<number> {
  const card = page
    .locator('[data-slot="turmas-do-ano"] [data-slot="card-kpi"]')
    .filter({ hasText: rotulo });
  return Number(await card.locator(".text-kpi").innerText());
}

test.describe("Spec 019 · FR-001 e A-1 · o ano, numa caixa de seleção no canto superior direito", () => {
  test("abre no ano de hoje; a caixa troca o ano na URL; e não se fala em «ano letivo»", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    const cabecalho = page.locator('[data-slot="cabecalho-do-inicio"]');
    const escolha = cabecalho.locator('select[data-slot="ano-do-painel-escolha"]');
    await expect(escolha).toHaveValue(String(ANO));
    await expect(page.locator('[data-slot="ano-do-painel-opcao"]')).toHaveCount(0);

    // No canto superior direito: à direita do título, na mesma faixa.
    const titulo = await cabecalho.getByRole("heading", { level: 1 }).boundingBox();
    const caixa = await escolha.boundingBox();
    expect(caixa && titulo && caixa.x > titulo.x + titulo.width).toBe(true);
    expect(caixa && titulo && caixa.y < titulo.y + titulo.height).toBe(true);
    await expect(page.locator("main")).not.toContainText(/ano letivo/i);

    await expect(page.locator('[data-slot="turmas-do-ano"]')).toHaveAttribute(
      "data-ano",
      String(ANO),
    );
    await expect(cartao(page, T.comAula)).toBeVisible();
    await expect(cartao(page, T.seguinte)).toHaveCount(0);
    await expect(cartao(page, T.arquivada)).toHaveCount(0);

    await escolha.selectOption(String(ANO + 1));
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe(String(ANO + 1));
    await expect(page.locator('[data-slot="turmas-do-ano"]')).toHaveAttribute(
      "data-ano",
      String(ANO + 1),
    );
    await expect(cartao(page, T.comAula)).toHaveCount(0);

    await escolha.selectOption(String(ANO));
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBeNull();
    await expect(cartao(page, T.comAula)).toBeVisible();
  });

  test("em Turmas, a mesma caixa, no mesmo canto", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await page
      .locator('[data-slot="navegacao-lateral"]')
      .getByRole("link", { name: "Turmas", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    const cabecalho = page.locator('[data-slot="cabecalho-de-turmas"]');
    const escolha = cabecalho.locator('select[data-slot="ano-do-painel-escolha"]');
    await expect(escolha).toHaveValue(String(ANO));
    const titulo = await cabecalho.getByRole("heading", { level: 1 }).boundingBox();
    const caixa = await escolha.boundingBox();
    expect(caixa && titulo && caixa.x > titulo.x + titulo.width).toBe(true);
    await expect(page.locator("main")).not.toContainText(/ano letivo/i);
    await escolha.selectOption(String(ANO + 1));
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe(String(ANO + 1));
  });
});

test.describe("Spec 019 · A-2 a A-4 · os cartões", () => {
  test("A-2 · só as ATIVAS do ano têm cartão; os números contam todas", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await expect(cartao(page, T.comAula)).toBeVisible();
    await expect(cartao(page, T.semAula)).toHaveCount(1);
    await expect(cartao(page, T.planejada)).toHaveCount(0);
    await expect(cartao(page, T.concluida)).toHaveCount(0);
    const cartoes = await page
      .locator('[data-slot="carrossel-de-turmas"] [data-slot="item-do-carrossel"]')
      .count();
    // A planejada e a concluída do ano estão nos números, e não nos cartões.
    expect(await indicadorDoInicio(page, "Turmas no recorte")).toBeGreaterThanOrEqual(cartoes + 2);
  });

  test("A-2 · sem turma ativa no ano, uma frase, e nada de carrossel", async ({ page }) => {
    await entrar(page, EMAIL, `/inicio?ano=${ANO + 1}`);
    await expect(page.locator('[data-slot="sem-turma-ativa"]')).toHaveText(
      `Nenhuma turma em andamento em ${ANO + 1}.`,
    );
    await expect(page.locator('[data-slot="carrossel-de-turmas"]')).toHaveCount(0);
  });

  test("A-3 · o título do cartão é só o nome da turma, sem o nome do curso", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    const c = cartao(page, T.comAula);
    await expect(c.locator('[data-slot="titulo-do-cartao"]')).toHaveText(T.comAula);
    await expect(c).not.toContainText("Curso do Início");
  });

  test("A-4 · clicar no cartão leva à FICHA DA TURMA", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    await cartao(page, T.comAula).click();
    await expect
      .poll(() => decodeURIComponent(new URL(page.url()).pathname))
      .toBe(`/turmas/${T.comAula}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(T.comAula);
  });

  test("o cartão tem a barra de progresso", async ({ page }) => {
    await entrar(page, EMAIL, "/inicio");
    const barra = page
      .locator('[data-slot="carrossel-de-turmas"] [data-slot="cartao-da-turma"]')
      .filter({ has: page.locator(`[data-turma="${T.comAula}"]`) })
      .locator('[role="progressbar"]');
    await expect(barra).toHaveAttribute("aria-valuenow", /^\d+$/);
  });
});

test.describe("Spec 019 · FR-003 · os DSA da semana", () => {
  test("a manchete diz a semana do curso, os TA e os dias lançados, e abre o DSA; a EAD não entra", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    const m = manchete(page, T.comAula);
    await expect(m).toHaveCount(1);
    // A MESMA conta do cabeçalho do DSA (`semanaDoCurso`): a manchete não tem número próprio.
    await expect(m.locator('[data-slot="semana-do-curso-da-manchete"]')).toHaveText(
      campoDaSemanaDoCurso(
        semanaDoCurso({
          dataInicio: `${ANO}-01-05`,
          dataTermino: `${ANO}-12-18`,
          duracaoSemanasDoCurso: 40,
          semana: semanaIsoDe(HOJE) ?? { ano: ANO, numero: 1 },
        }),
      ),
    );
    const resumo = m.locator('[data-slot="resumo-do-dsa"]');
    await expect(resumo).toHaveAttribute("data-ta", "5");
    await expect(resumo).toHaveAttribute("data-dias", "2");
    await expect(resumo).toHaveText("5 TA lançados em 2 dias · 1 disciplina");
    await expect(manchete(page, T.semAula).locator('[data-slot="resumo-do-dsa"]')).toHaveText(
      "Nada lançado nesta semana ainda",
    );
    await expect(manchete(page, T.ead)).toHaveCount(0);
    await expect(manchete(page, T.arquivada)).toHaveCount(0);
    await expect(manchete(page, T.seguinte)).toHaveCount(0);

    await m.locator('[data-slot="abrir-o-dsa-da-manchete"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await expect
      .poll(() => decodeURIComponent(new URL(page.url()).pathname))
      .toBe(`/turmas/${T.comAula}/dsa`);
  });
});

test.describe("Spec 019 · FR-004 · o carrossel passa sozinho, pausa e anda por teclado", () => {
  const dsa = (page: Page) => page.locator('[data-slot="carrossel-de-dsa"]');

  test("passa sozinho; pausa ao apontar, ao focar e pelo botão; ← e → passam", async ({ page }) => {
    test.setTimeout(60_000);
    await entrar(page, EMAIL, "/inicio");
    await page.mouse.move(0, 0);
    const c = dsa(page);
    await expect(c).toHaveAttribute("data-passando", "true");
    await expect.poll(() => c.getAttribute("data-atual"), { timeout: 15_000 }).not.toBe("0");

    await c.hover();
    await expect(c).toHaveAttribute("data-passando", "false");
    await page.mouse.move(0, 0);
    await expect(c).toHaveAttribute("data-passando", "true");

    await c.locator('[data-slot="carrossel-pausar"]').click();
    await page.mouse.move(0, 0);
    await page.locator("body").press("Tab");
    await expect(c.locator('[data-slot="carrossel-pausar"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(c).toHaveAttribute("data-passando", "false");

    await c.locator('[data-slot="carrossel-proximo"]').focus();
    const antes = Number(await c.getAttribute("data-atual"));
    await page.keyboard.press("ArrowLeft");
    await expect.poll(async () => Number(await c.getAttribute("data-atual"))).not.toBe(antes);
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => Number(await c.getAttribute("data-atual"))).toBe(antes);
  });

  test("com «reduzir movimento» do sistema, não passa sozinho", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await entrar(page, EMAIL, "/inicio");
    await page.mouse.move(0, 0);
    await expect(dsa(page)).toHaveAttribute("data-passando", "false");
  });
});

test.describe("Spec 019 · FR-005 · o submenu da lateral", () => {
  const NAV = '[data-slot="navegacao-lateral"]';

  test("A-5 · Turmas → turma (sem o nível do curso) abre a ficha marcada; só as do ano, sem a arquivada; Cursos → classificação → curso", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    // Fixa a lateral expandida (o botão do topo), para o submenu ficar à vista.
    await page.locator(`${NAV} [data-slot="fixar-lateral"]`).click();

    await page
      .locator(`${NAV} [data-slot="expandir-submenu"][aria-label="Abrir as turmas"]`)
      .click();
    const lista = page.locator(`${NAV} [data-slot="submenu"][data-raiz="turmas"]`);
    await expect(lista.locator('[data-slot="grupo-do-submenu"]')).toHaveCount(0);
    await expect(lista.getByRole("link", { name: T.comAula, exact: true })).toBeVisible();
    await expect(lista.getByRole("link", { name: T.planejada, exact: true })).toBeVisible();
    await expect(lista.getByRole("link", { name: T.arquivada, exact: true })).toHaveCount(0);
    await expect(lista.getByRole("link", { name: T.seguinte, exact: true })).toHaveCount(0);
    await lista.getByRole("link", { name: T.comAula, exact: true }).click();
    await expect
      .poll(() => decodeURIComponent(new URL(page.url()).pathname))
      .toBe(`/turmas/${T.comAula}`);
    await expect(page.locator(`${NAV} [data-subentrada][aria-current="page"]`)).toHaveText(
      T.comAula,
    );

    await page
      .locator(`${NAV} [data-slot="expandir-submenu"][aria-label="Abrir os cursos"]`)
      .click();
    await page
      .locator(`${NAV} [data-slot="submenu"][data-raiz="cursos"] [data-slot="grupo-do-submenu"]`)
      .filter({ hasText: "Curso Especial" })
      .click();
    await page
      .locator(`${NAV} [data-slot="submenu"][data-raiz="cursos"]`)
      .getByRole("link", { name: SIGLA, exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/cursos/${SIGLA}`);
    await expect(page.locator(`${NAV} [data-subentrada][aria-current="page"]`)).toHaveText(SIGLA);
  });

  test("recolhida, a lateral não mostra o submenu, e Turmas continua levando à lista", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await entrar(page, EMAIL, "/inicio");
    await page.mouse.move(1300, 800);
    await expect(page.locator(`${NAV} [data-slot="expandir-submenu"]`).first()).toBeHidden();
    await page.locator(`${NAV}`).getByRole("link", { name: "Turmas", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  });
});
