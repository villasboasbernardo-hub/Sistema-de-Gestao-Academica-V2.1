/**
 * A **semana do curso**, "Semana N de T", na tela e no papel do DSA — FR-009 da spec 016 (item 1.9).
 *
 * > *"O número do DSA passa a ser a semana corrida do curso: a semana 1 é a que contém o início da
 * > turma, e dali em diante conta toda semana, com ou sem aula. O cabeçalho mostra «Semana N de T»."*
 * > — D-COR-1, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **A FORMA É A DA C-AP-FR 2026, MEDIDA NA CÓPIA `remoto-20261017-005738.sql`**: curso de 35 semanas,
 * turma de 06/04 a 15/12/2026 — 37 semanas —, e a semana de 12/10 é a 28ª. O dado é sintético.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É A TURMA SEM LANÇAMENTO** (DoD 8): pela contagem de antes (a da aba
 * CRONOS, que só contava semana com aula ou avaliação), esta semana sairia *"Nº —"*; pela semana
 * corrida, sai *"Semana 28 de 37"*. Com aula toda semana, as duas convenções dariam o mesmo número.
 *
 * ⚠️ **TUDO POR CLIQUE A PARTIR DO MENU** (regra *"tela sem caminho clicável é tela não entregue"*):
 * *Turmas* → a turma → o aviso → *Abrir o DSA* → *Ir para a semana do dia* → *Imprimir*.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let TURMA = "";

/**
 * O curso de 35 semanas e a turma de 37. ⚠️ **IDEMPOTENTE** (regra 9.1 do CLAUDE.md): curso não se
 * apaga, então a segunda execução reaproveita o curso e a turma, e devolve as datas ao lugar.
 */
async function semear(processo: number): Promise<string> {
  const sigla = `CUR-SEMCURSO-${processo}`;
  const { data: existente } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  let cursoId = existente?.id as string | undefined;
  if (!cursoId) {
    const { data, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: sigla,
        nome_curso: `Curso da semana do curso ${processo}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 245,
        duracao_semanas: 35,
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
    if (error) throw new Error(`falha ao semear ${sigla}: ${error.message}`);
    cursoId = (data as { id: string }).id;
  }
  await admin.from("cursos").update({ status: "ativo", duracao_semanas: 35 }).eq("id", cursoId);

  const janela = {
    status: "ativa",
    modalidade: "presencial",
    data_inicio: "2026-04-06",
    data_termino: "2026-12-15",
    alunos: 12,
  };
  const { data: turma } = await admin
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2026)
    .maybeSingle();
  if (turma) {
    const { error } = await admin.from("turmas").update(janela).eq("id", turma.id);
    if (error) throw new Error(`falha ao repor a turma: ${error.message}`);
    return turma.codigo as string;
  }
  const { error } = await admin
    .from("turmas")
    .insert({ curso_id: cursoId, ano_letivo: 2026, ...janela });
  if (error) throw new Error(`falha ao criar a turma: ${error.message}`);
  const { data: nova } = await admin
    .from("turmas")
    .select("codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2026)
    .single();
  return (nova as { codigo: string }).codigo;
}

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("semanadocurso", info.workerIndex);
  await criarConta(EMAIL, `USR-SEMC-${info.workerIndex}`);
  TURMA = await semear(info.workerIndex);
});

/* A turma sai no fim: uma turma ativa a mais apareceria nas listas e no `/inicio` de outras suítes. */
test.afterAll(async () => {
  if (TURMA !== "") await admin.from("turmas").delete().eq("codigo", TURMA);
  await apagarConta(EMAIL);
});

test.describe("FR-009 · «Semana N de T» na tela e no papel, chegando por clique", () => {
  test("menu Turmas → ficha com o aviso → DSA da 28ª semana → Imprimir → o mesmo no papel", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await irAFichaDaTurma(page, EMAIL, TURMA);

    /* ── FR-009.7 · o aviso de cadastro: a turma passa da duração do curso ───────────────────── */
    const quadro = page.locator('[data-slot="quadro-de-avisos-da-turma"]');
    await quadro.getByRole("button", { name: "Exibir avisos" }).click();
    await expect(quadro.locator('[data-aviso="turma_mais_longa_que_o_curso"]')).toHaveText(
      "A turma tem 37 semanas e o curso, 35.",
    );

    /* ── FR-009.2 · na tela: a 28ª semana, sem a semana ISO nem o «Nº» ──────────────────────── */
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await irParaASemanaDoDia(page, "2026-10-14", 42, 2026);
    await expect(page.locator('[data-slot="semana-atual"]')).toContainText("Semana 28 de 37");
    await expect(page.locator('[data-slot="semana-atual"]')).not.toContainText("semana 42");
    await expect(page.locator('[data-slot="tela-semana"]')).toHaveText("Semana 28 de 37");
    await expect(page.locator('[data-slot="cabecalho-da-semana"]')).not.toContainText("Nº");

    /* ── FR-009.2 · no papel, pelo botão Imprimir ───────────────────────────────────────────── */
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    const documento = page.locator('[data-slot="dsa-impresso"]');
    await expect(documento).toBeVisible();
    await expect(page.locator('[data-slot="dsa-semana"]')).toHaveText("Semana 28 de 37");
    await expect(page.locator('[data-slot="dsa-gerado-em"]')).toContainText("Semana 28 de 37");
    await expect(documento).not.toContainText("Nº");
  });
});
