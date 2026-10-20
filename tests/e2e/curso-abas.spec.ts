/**
 * Spec 018 (Bloco 3) — **a página do curso em seis abas**, e **o regime nomeado da turma chegando ao DSA**, tudo por
 * clique a partir do menu.
 *
 * O caso que discrimina (DoD 8): a turma que escolhe o *Regime B* (9 TA, manhã às 07:15) tem o DSA com nove tempos e
 * o relógio dele; a OUTRA turma do mesmo curso, que não escolheu, continua com os oito do regime vigente do curso e o
 * relógio de antes (07:30). E a escolha trava no primeiro lançamento (`RF-HOR-05`).
 *
 * ⚠️ `goto` só no ponto de partida (`entrar`). A prova da gravação é o BANCO (PEND-016-2).
 * ⚠️ Regra 9.1: curso não se apaga — a amostra reaproveita o curso; turmas, regimes e o dia parado saem no fim.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { abrirAbaDoCurso, irAoCursoPorClique } from "./navegar-curso";
import { abrirEdicaoDaTurma, esperarGravacaoDaTurma, irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Terça, 04/04/2045 — semana 14. ⚠️ **O ANO É LONGE DE PROPÓSITO**: a amostra de `semearCursos` (de outros arquivos,
 * que rodam em paralelo) cria uma atividade GLOBAL em 10/05/2026, e atividade global na janela da turma é lançamento
 * que trava a escolha do regime (C-8) — numa janela de 2026 a turma nasceria travada.
 */
const DIA = "2045-04-04";

let EMAIL = "";
let SIGLA = "";
let CURSO_ID = "";
const TURMAS: Record<"comRegime" | "semRegime" | "comLancamento", string> = {
  comRegime: "",
  semRegime: "",
  comLancamento: "",
};

async function limpar(): Promise<void> {
  if (CURSO_ID === "") return;
  const { data: turmas } = await admin.from("turmas").select("id").eq("curso_id", CURSO_ID);
  for (const t of (turmas ?? []) as { id: string }[]) {
    await admin.from("dias_parados").delete().eq("turma_id", t.id);
    await admin.from("turma_disciplina").delete().eq("turma_id", t.id);
    await admin.from("turmas").delete().eq("id", t.id);
  }
  await admin.from("regimes_de_horario").delete().eq("curso_id", CURSO_ID);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("curso-abas", p);
  SIGLA = `CUR-ABAS-${p}`;
  await criarConta(EMAIL, `USR-ABAS-${p}`);

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
        nome_curso: `Curso das abas ${p}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 200,
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

  for (const rotulo of ["T1", "T2", "T3"]) {
    const { error } = await admin.from("turmas").insert({
      curso_id: CURSO_ID,
      turma: rotulo,
      ano_letivo: 2045,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: "2045-01-09",
      data_termino: "2045-12-15",
      alunos: 10,
    });
    if (error) throw new Error(`falha ao criar a turma ${rotulo}: ${error.message}`);
  }
  const { data: turmas } = await admin
    .from("turmas")
    .select("id, codigo, turma")
    .eq("curso_id", CURSO_ID);
  for (const t of (turmas ?? []) as { id: string; codigo: string; turma: string }[]) {
    if (t.turma === "T1") TURMAS.comRegime = t.codigo;
    if (t.turma === "T2") TURMAS.semRegime = t.codigo;
    if (t.turma === "T3") {
      TURMAS.comLancamento = t.codigo;
      // O lançamento que trava a escolha: um dia parado da turma.
      const { data: tipo } = await admin
        .from("config_listas")
        .select("id")
        .eq("lista", "tipos_parada")
        .eq("valor", "LA")
        .single();
      const { error } = await admin.from("dias_parados").insert({
        turma_id: t.id,
        data: DIA,
        tipo_parada_id: (tipo as { id: string }).id,
        motivo: "Parada da amostra das abas",
      });
      if (error) throw new Error(`falha ao lançar o dia parado: ${error.message}`);
    }
  }
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
});

test.describe("Spec 018 · FR-006 · as seis abas, por clique", () => {
  test("Cursos → o curso → cada aba abre o seu painel, na ordem", async ({ page }) => {
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await expect(page.locator('[data-slot="aba-sobre"]')).toBeVisible();

    await abrirAbaDoCurso(page, "grade");
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();

    await abrirAbaDoCurso(page, "disciplinas");
    await expect(page.locator('[data-slot="aba-disciplinas"]')).toBeVisible();
    await expect(page.locator('[data-slot="nova-disciplina"]')).toBeVisible();

    await abrirAbaDoCurso(page, "avaliacoes");
    await expect(page.locator('[data-slot="aba-avaliacoes-do-curriculo"]')).toBeVisible();

    await abrirAbaDoCurso(page, "atividades");
    const atividades = page.locator('[data-slot="aba-atividades"]');
    await expect(atividades.getByRole("heading", { level: 2 })).toHaveText(
      "Atividades extraclasse previstas no currículo",
    );
    await expect(atividades.locator("[data-limite]")).toHaveCount(3);
    await expect(atividades.locator('[data-slot="referencia-do-estudo-individual"]')).toBeVisible();

    await abrirAbaDoCurso(page, "horarios");
    await expect(page.locator('[data-slot="regimes-do-curso"]')).toBeVisible();
    await expect(
      page.locator('[data-slot="vigencias-do-curso"] [data-vigencia="padrao"]'),
    ).toContainText("8 TA de 45 min");
  });
});

test.describe("Spec 018 · FR-003 · o regime nomeado: cadastrado no curso, escolhido pela turma, usado no DSA", () => {
  test("cadastrar o Regime B, escolhê-lo numa turma e ver o DSA dela com 9 tempos — e a outra turma igual", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    /* ── 1. A aba Horários: Novo regime ───────────────────────────────────────────────────────── */
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "horarios");
    await page.locator('[data-slot="novo-regime"]').click();
    const form = page.locator('[data-slot="formulario-de-regime"]');
    await form.getByLabel("Nome").fill("Regime B");
    await form.getByLabel("TA por dia").fill("9");
    await form.getByLabel("Duração do TA (min)").selectOption("45");
    await form.getByLabel("Início da manhã").fill("07:15");
    await form.getByLabel("Intervalo da manhã (min)").fill("5");
    await form.getByLabel("Início da tarde").fill("13:15");
    await form.getByLabel("Intervalo da tarde (min)").fill("5");
    await form.locator('[data-slot="gravar-regime"]').click();
    await expect(page.locator('[data-slot="resposta-dos-regimes"]')).toHaveText(
      "Regime cadastrado.",
    );
    const linha = page.locator('[data-slot="regime-do-curso"][data-regime="Regime B"]');
    await expect(linha).toContainText("Regime B — 9 TA de 45 min");
    await expect(linha.locator('[data-slot="uso-do-regime"]')).toHaveText("nenhuma turma o usa");

    const { data: regime } = await admin
      .from("regimes_de_horario")
      .select("id, regime_tempos, ta_duracao_min, hora_inicio_manha, status")
      .eq("curso_id", CURSO_ID)
      .eq("nome", "Regime B")
      .single();
    expect(regime).toMatchObject({
      regime_tempos: 9,
      ta_duracao_min: 45,
      hora_inicio_manha: "07:15:00",
      status: "ativo",
    });

    /* ── 2. A turma escolhe o regime em Editar turma ──────────────────────────────────────────── */
    await irAFichaDaTurma(page, EMAIL, TURMAS.comRegime);
    await abrirEdicaoDaTurma(page);
    await page.locator("#turma-regime").selectOption({ label: "Regime B — 9 TA de 45 min" });
    await page.locator('[data-slot="gravar-turma"]').click();
    await esperarGravacaoDaTurma(page);
    const { data: escolhida } = await admin
      .from("turmas")
      .select("regime_de_horario_id")
      .eq("codigo", TURMAS.comRegime)
      .single();
    expect((escolhida as { regime_de_horario_id: string }).regime_de_horario_id).toBe(
      (regime as { id: string }).id,
    );

    /* ── 3. O DSA da turma: o relógio do Regime B, nove tempos no papel ───────────────────────── */
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await irParaASemanaDoDia(page, DIA, 14, 2045);
    const grade = page.locator('[data-slot="grade-da-semana"]');
    await expect(grade).toContainText("07:15");
    await expect(grade).not.toContainText("07:30");
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    await expect(
      page.locator('[data-slot="dsa-impresso"] .dsa4-tempo:not(.dsa4-tempo-excepcional)'),
    ).toHaveCount(9);

    /* ── 4. A outra turma do curso, que não escolheu: os oito de antes ────────────────────────── */
    await irAFichaDaTurma(page, EMAIL, TURMAS.semRegime);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await irParaASemanaDoDia(page, DIA, 14, 2045);
    await expect(page.locator('[data-slot="grade-da-semana"]')).toContainText("07:30");
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    await expect(
      page.locator('[data-slot="dsa-impresso"] .dsa4-tempo:not(.dsa4-tempo-excepcional)'),
    ).toHaveCount(8);

    /* ── 5. A aba Horários diz quem usa o regime ──────────────────────────────────────────────── */
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "horarios");
    await expect(
      page.locator(
        '[data-slot="regime-do-curso"][data-regime="Regime B"] [data-slot="uso-do-regime"]',
      ),
    ).toHaveText(`usado por 1 turma: ${TURMAS.comRegime}`);
  });

  test("RF-HOR-05 · na turma com lançamento a escolha está travada, e diz por quê", async ({
    page,
  }) => {
    await irAFichaDaTurma(page, EMAIL, TURMAS.comLancamento);
    await abrirEdicaoDaTurma(page);
    await expect(page.locator("#turma-regime")).toBeDisabled();
    await expect(page.locator('[data-slot="regime-travado"]')).toContainText(
      "já tem lançamento no DSA",
    );
  });
});
