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
 * ⚠️ **RT-8 (spec 029, Bloco 14, FR-007)**: a arquivada continua contando nos números do ano dela, com a situação que
 *   tinha, e some só das listas do dia a dia. O caso que discrimina: a T7, CONCLUÍDA e ARQUIVADA, conta em *Concluídas*
 *   do Início do ano e não no do ano seguinte; e em `/turmas` as Estatísticas a contam sem *Mostrar arquivadas*, com a
 *   tabela sem ela.
 *
 * ⚠️ A SEMANA É A DE HOJE (a de São Paulo, `hojeNaCiaara`): a amostra lança aula nela, e a janela das turmas a cobre.
 * ⚠️ Regra 9.1: o curso não se apaga — reaproveitado; turmas e aulas saem no começo e no fim. O registro de
 *    arquivamento é só de acréscimo (fica, sem FK, como em `bloco-2.test.ts`).
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { responsabilizarPorCurso } from "./cursos-de-teste";
import {
  abrirFiltros,
  escolherNoFiltro,
  irAListaDeTurmas,
  LISTA_DE_TURMAS,
} from "./navegar-turmas";
import { abrirPainel, escolherAno } from "./paineis";

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
/*
 * RT-8 (spec 029): o Encarregado do curso da semente — a RLS lhe devolve só este curso (`app.cursos_do_usuario()`), e é
 * o que dá números EXATOS ao Início, que não tem filtro de curso. O Admin vê as turmas de todos os processos.
 */
let EMAIL_ENC = "";
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
  /* RT-8 (spec 029): concluída e arquivada, no ano da semente. */
  concluidaArquivada: "",
  /* RT-8 (spec 029): concluída e arquivada, no ano ANTERIOR — a única turma do curso naquele ano. */
  anteriorArquivada: "",
};
/** As turmas que a semente arquiva (`turma_arquivamentos`, só de acréscimo). */
const ARQUIVADAS: ReadonlySet<keyof typeof T> = new Set([
  "arquivada",
  "concluidaArquivada",
  "anteriorArquivada",
]);

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
  /* O vínculo do Encarregado (RT-8) prende a conta por FK `restrict`: sai antes, ou a conta não se apaga. */
  await admin.from("usuario_curso").delete().eq("curso_id", CURSO_ID);
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
  /* RT-8 (spec 029): depois do `limpar`, que solta o vínculo de uma execução anterior que tenha caído no meio. */
  EMAIL_ENC = emailDeTeste("inicio-b4-enc", p);
  await criarConta(EMAIL_ENC, `USR-INI4-ENC-${p}`, "encarregado_curso");
  await responsabilizarPorCurso(EMAIL_ENC, SIGLA);

  // A janela: [início, término]; a planejada e a concluída do ano ficam fora da semana de hoje, quando der.
  const turmas: [keyof typeof T, string, number, string, string, [string, string]][] = [
    ["comAula", "T1", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["semAula", "T2", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["ead", "T3", ANO, "ativa", "ead", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["arquivada", "T4", ANO, "ativa", "presencial", [`${ANO}-01-05`, `${ANO}-12-18`]],
    ["planejada", "T5", ANO, "planejada", "presencial", [`${ANO}-12-21`, `${ANO}-12-30`]],
    ["concluida", "T6", ANO, "concluida", "presencial", [`${ANO}-01-05`, `${ANO}-01-09`]],
    ["concluidaArquivada", "T7", ANO, "concluida", "presencial", [`${ANO}-01-05`, `${ANO}-01-09`]],
    [
      "anteriorArquivada",
      "T8",
      ANO - 1,
      "concluida",
      "presencial",
      [`${ANO - 1}-01-05`, `${ANO - 1}-01-09`],
    ],
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
    if (ARQUIVADAS.has(chave)) {
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
  await apagarConta(EMAIL_ENC);
});

const cartao = (page: Page, codigo: string) =>
  page.locator(`[data-slot="carrossel-de-turmas"] [data-turma="${codigo}"]`);

/** O número de um indicador do Início, pelo rótulo — o elemento, para as asserções que esperam. */
const numeroDoInicio = (page: Page, rotulo: string) =>
  page
    .locator('[data-slot="turmas-do-ano"] [data-slot="card-kpi"]')
    .filter({ hasText: rotulo })
    .locator(".text-kpi");

/** O número de um indicador do Início, pelo rótulo. */
async function indicadorDoInicio(page: Page, rotulo: string): Promise<number> {
  return Number(await numeroDoInicio(page, rotulo).innerText());
}

const ITENS_DO_CARROSSEL = '[data-slot="carrossel-de-turmas"] [data-slot="item-do-carrossel"]';

/** Os números do painel de Estatísticas de `/turmas`, pela chave (`data-chave`). */
async function conferirIndicadoresDeTurmas(
  page: Page,
  esperado: Record<string, string>,
): Promise<void> {
  for (const [chave, valor] of Object.entries(esperado)) {
    await expect(
      page.locator(`[data-slot="indicador-de-turmas"][data-chave="${chave}"] .text-kpi`),
      chave,
    ).toHaveText(valor);
  }
}

/**
 * As turmas ATIVAS e ARQUIVADAS do ano, contadas no banco, de curso em oferta — a parte de *Turmas ativas* que não tem
 * cartão (RT-8). ⚠️ Pelo banco, e não por número fixo: cada processo deste arquivo tem a sua T4, e
 * `turmas-arquivar.spec.ts` arquiva e desarquiva uma ativa do mesmo ano enquanto este arquivo corre.
 */
async function ativasArquivadasNoAno(): Promise<number> {
  const { data: arquivadas, error } = await admin.from("vw_turmas_arquivadas").select("turma_id");
  if (error) throw new Error(`falha ao ler as arquivadas: ${error.message}`);
  const ids = ((arquivadas ?? []) as { turma_id: string }[]).map((a) => a.turma_id);
  if (ids.length === 0) return 0;
  const { count, error: e } = await admin
    .from("turmas")
    .select("id, cursos!inner(status)", { count: "exact", head: true })
    .in("id", ids)
    .eq("ano_letivo", ANO)
    .eq("status", "ativa")
    .eq("cursos.status", "ativo");
  if (e) throw new Error(`falha ao contar as ativas arquivadas: ${e.message}`);
  return count ?? 0;
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
  test("A-2 e RD-8 · só as ATIVAS do ano têm cartão; os números contam por situação", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    await expect(cartao(page, T.comAula)).toBeVisible();
    await expect(cartao(page, T.semAula)).toHaveCount(1);
    await expect(cartao(page, T.planejada)).toHaveCount(0);
    await expect(cartao(page, T.concluida)).toHaveCount(0);
    /*
     * RD-8 (Bloco 11): Turmas ativas · Planejadas · Concluídas · Canceladas, do ano escolhido; a planejada e a concluída
     * do ano estão nos números, e não nos cartões.
     * ⚠️ **RT-8 (spec 029, FR-007) MUDOU A RELAÇÃO**: *Turmas ativas* = os cartões **mais** as ativas ARQUIVADAS do ano
     *    — a arquivada sai do carrossel e continua no número (a T4 da semente é uma). Era *Turmas ativas* = cartões.
     * ⚠️ **POR DIFERENÇA, E RELIDO ATÉ BATER**: as arquivadas são contadas no banco, e outro processo pode arquivar ou
     *    desarquivar uma ativa do ano entre a tela e a consulta — a tela é recarregada junto com o banco.
     */
    await expect
      .poll(
        async () => {
          await page.reload();
          const ativas = await indicadorDoInicio(page, "Turmas ativas");
          const cartoes = await page.locator(ITENS_DO_CARROSSEL).count();
          return ativas - cartoes - (await ativasArquivadasNoAno());
        },
        {
          message:
            "«Turmas ativas» ≠ cartões + ativas arquivadas: a arquivada saiu do número (RT-8)",
          timeout: 20_000,
        },
      )
      .toBe(0);
    expect(await indicadorDoInicio(page, "Planejadas")).toBeGreaterThanOrEqual(1);
    expect(await indicadorDoInicio(page, "Concluídas")).toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-slot="turmas-do-ano"]')).not.toContainText(
      "Turmas no recorte",
    );
    await expect(page.locator('[data-slot="turmas-do-ano"]')).not.toContainText("Carga executada");
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

/*
 * ⚠️ **AS MANCHETES DO DSA SAÍRAM NO BLOCO 11** (D-30): no lugar delas, o papel do DSA PUBLICADO da semana (RD-7), cujo
 *    percurso está em `bloco-11-dsa.spec.ts`.
 */
/*
 * ⚠️ **O CASO MEDIA O CARROSSEL DAS MANCHETES**, que saiu no Bloco 11 (D-30). O componente é UM só (`Carrossel`), e o
 *    das turmas é o que a semente garante: duas turmas ativas no ano. Numa tela estreita cabe um cartão por vez — é o
 *    que dá ao carrossel um próximo para onde passar.
 */
test.describe("Spec 019 · FR-004 · o carrossel passa sozinho, pausa e anda por teclado", () => {
  const dsa = (page: Page) => page.locator('[data-slot="carrossel-de-turmas"]');

  test("passa sozinho; pausa ao apontar, ao focar e pelo botão; ← e → passam", async ({ page }) => {
    test.setTimeout(60_000);
    await entrar(page, EMAIL, "/inicio");
    /* Depois de entrar: estreita, a lateral vira o botão «Menu», e o `entrar` espera a navegação principal. */
    await page.setViewportSize({ width: 420, height: 900 });
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

/*
 * ⚠️ **SPEC 029 (Bloco 14), FR-007 — A RT-8** (D-17 a D-19):
 *
 * > *"Arquivar esconde a turma das listas do dia a dia — carrossel das turmas, submenu, listas de ativas e de escolha,
 * > avisos —, mas ela CONTINUA contando nas estatísticas e nos cartões do ano dela, com a situação que tinha."* —
 * > Bernardo Villas Boas, 28/10/2026
 *
 * ⚠️ **NÚMEROS EXATOS SÓ PELO ENCARREGADO DO CURSO DA SEMENTE**: o Início não tem filtro de curso, e o Admin vê as turmas
 *    de todos os processos (cada um com a sua T4 arquivada) e a de `turmas-arquivar.spec.ts`, arquivada e desarquivada
 *    no mesmo ano enquanto este arquivo corre. A RLS dá ao Encarregado só o curso da semente, e ali o ano tem: ativas
 *    T1, T2, T3 e T4 (arquivada); planejada T5; concluídas T6 e T7 (arquivada). O ano anterior tem só a T8, concluída
 *    e arquivada. Em `/turmas` o recorte é o filtro de curso, e o Admin basta.
 */
test.describe("Spec 029 · FR-007 · RT-8 · a arquivada continua contando no ano dela", () => {
  test("⚠️ o caso que discrimina: a concluída ARQUIVADA conta em «Concluídas» do ano dela e fica fora do carrossel; no ano seguinte, não conta", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ENC, "/inicio");
    const doAno = page.locator('[data-slot="turmas-do-ano"]');
    await expect(doAno).toHaveAttribute("data-ano", String(ANO));
    await expect(cartao(page, T.comAula)).toBeVisible();

    await expect(
      numeroDoInicio(page, "Concluídas"),
      "a concluída arquivada saiu de «Concluídas» do ano dela (RT-8)",
    ).toHaveText("2");
    await expect(
      numeroDoInicio(page, "Turmas ativas"),
      "a ativa arquivada saiu de «Turmas ativas» (RT-8)",
    ).toHaveText("4");
    await expect(numeroDoInicio(page, "Planejadas")).toHaveText("1");
    await expect(numeroDoInicio(page, "Canceladas")).toHaveText("0");

    // O carrossel é lista do dia a dia: as duas arquivadas ficam fora, e ficam as três ativas que não estão (FR-007.2).
    await expect(cartao(page, T.concluidaArquivada)).toHaveCount(0);
    await expect(cartao(page, T.arquivada)).toHaveCount(0);
    await expect(page.locator(ITENS_DO_CARROSSEL)).toHaveCount(3);

    // O ano seguinte, pela caixa de seleção: a arquivada é do ANO dela (RT-6), e não conta em outro.
    await page
      .locator('[data-slot="cabecalho-do-inicio"] select[data-slot="ano-do-painel-escolha"]')
      .selectOption(String(ANO + 1));
    await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe(String(ANO + 1));
    await expect(doAno).toHaveAttribute("data-ano", String(ANO + 1));
    await expect(numeroDoInicio(page, "Concluídas")).toHaveText("0");
    await expect(numeroDoInicio(page, "Planejadas")).toHaveText("1");
    await expect(numeroDoInicio(page, "Turmas ativas")).toHaveText("0");
  });

  test("o ano em que a única turma do recorte está arquivada: o número a conta, e a frase não diz «nenhuma turma neste recorte»", async ({
    page,
  }) => {
    /*
     * ⚠️ O VAZIO TEM DE LER A MESMA POPULAÇÃO DOS NÚMEROS: com a T8 contada em *Concluídas*, dizer que o recorte não
     *    tem turma desmentiria o cartão ao lado. Sem turma ativa, a frase é a do A-2 (*"em andamento"*).
     */
    await entrar(page, EMAIL_ENC, "/inicio");
    await escolherAno(page, ANO - 1);
    await abrirPainel(page, "filtros");
    await page.locator("#filtro-classificacao").selectOption("especial");
    await expect.poll(() => new URL(page.url()).searchParams.get("classificacao")).toBe("especial");
    await expect(page.locator('[data-slot="filtro-do-panorama"]')).toHaveAttribute(
      "data-esperando",
      "nao",
    );
    const doAno = page.locator('[data-slot="turmas-do-ano"]');
    await expect(doAno).toHaveAttribute("data-ano", String(ANO - 1));

    await expect(
      numeroDoInicio(page, "Concluídas"),
      "a concluída arquivada saiu de «Concluídas» do ano dela (RT-8)",
    ).toHaveText("1");
    await expect(page.locator('[data-slot="sem-turma-ativa"]')).toHaveText(
      `Nenhuma turma em andamento em ${ANO - 1} neste recorte.`,
    );
    await expect(doAno).not.toContainText("Nenhuma turma neste recorte");
  });

  test("em /turmas, as Estatísticas do ano contam as arquivadas sem «Mostrar arquivadas»; a tabela não as mostra, e o cabeçalho diz quantas ficaram fora (D-19)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await irAListaDeTurmas(page, EMAIL);
    await abrirPainel(page, "estatisticas");
    await abrirFiltros(page);
    await escolherNoFiltro(page, "Curso", `^${SIGLA} —`);
    await expect.poll(() => new URL(page.url()).searchParams.get("curso")).toBe(SIGLA);

    const contagem = page.locator('[data-slot="contagem-de-turmas"]');
    const lista = page.locator(LISTA_DE_TURMAS);
    // A tabela é lista do dia a dia: do ano e do curso, T1, T2, T3, T5 e T6 — sem a T4 e a T7.
    await expect(contagem).toContainText(`5 turmas em ${ANO}`);
    await expect(lista.getByRole("link", { name: T.comAula }).first()).toBeVisible();
    await expect(lista.getByRole("link", { name: T.arquivada })).toHaveCount(0);
    await expect(lista.getByRole("link", { name: T.concluidaArquivada })).toHaveCount(0);

    // ⚠️ O CASO QUE DISCRIMINA: os números contam as duas arquivadas, pela situação que tinham (eram 5, 3 e 1).
    const comAsArquivadas = {
      total: "7",
      emAndamento: "4",
      concluidas: "2",
      planejadas: "1",
      canceladas: "0",
    };
    await conferirIndicadoresDeTurmas(page, comAsArquivadas);
    // D-19: o cabeçalho conta a tabela e diz quantas ficaram fora dela.
    await expect(contagem).toContainText(/2 arquivadas fora da lista/);

    // «Mostrar arquivadas» devolve as duas à tabela, com o selo; os números não mudam.
    await escolherNoFiltro(page, "Arquivadas", "Mostrar arquivadas");
    await expect.poll(() => new URL(page.url()).searchParams.get("arquivadas")).toBe("sim");
    await expect(contagem).toContainText(`7 turmas em ${ANO}`);
    await expect(
      lista
        .locator("tr")
        .filter({ hasText: T.concluidaArquivada })
        .locator('[data-slot="selo-arquivada"]'),
    ).toBeVisible();
    await expect(contagem).not.toContainText("fora da lista");
    await conferirIndicadoresDeTurmas(page, comAsArquivadas);
  });

  test("em /turmas, o ano em que todas as turmas estão arquivadas: o vazio diz quantas são e como mostrá-las (D-19), e as Estatísticas as contam", async ({
    page,
  }) => {
    await irAListaDeTurmas(page, EMAIL_ENC);
    await escolherAno(page, ANO - 1);
    const vazio = page.locator(`${LISTA_DE_TURMAS} [data-slot="estado-vazio"]`);
    await expect(vazio).toBeVisible();
    await expect(vazio, "o vazio esconde que a turma do ano está arquivada (D-19)").toContainText(
      /\b1\b[^.]*arquivada/,
    );
    await expect(vazio).toContainText("Mostrar arquivadas");
    await abrirPainel(page, "estatisticas");
    await conferirIndicadoresDeTurmas(page, { total: "1", concluidas: "1" });
  });
});
