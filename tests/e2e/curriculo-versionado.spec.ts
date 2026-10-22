/**
 * Spec 021, Bloco 6, PR 2 — o currículo versionado POR CLIQUE: SC-004 (o currículo novo, a turma nova nele, e a turma
 * antiga intacta) e SC-005 (a correção do currículo em uso pede a justificativa e fica na trilha).
 *
 * ⚠️ DESDE OS AJUSTES DA CONFERÊNCIA DO PR #82 (21/10/2026): criar e editar currículo é em *Editar curso* (seletor,
 *    *Novo currículo* e as partes); a página do curso mostra o vigente, e a aba *Currículo* consulta os outros.
 *
 * > *"RC-7 · Novo currículo nasce como cópia do vigente (…)."* · *"RC-8 · (…) seletor de currículo (…)."* ·
 * > *"RC-4 · Ao criar uma turma, escolhe-se qual currículo ela segue (…)."* · *"RC-6 · (…) com justificativa
 * > obrigatória e trilha (…)."*
 *
 * ⚠️ TODO RESULTADO É CONFERIDO NO BANCO (PEND-016-2), não no campo que a prova digitou.
 * ⚠️ IDEMPOTENTE (regra 9.1): o curso é reaproveitado; turmas, disciplinas e os currículos ≥ 2 da rodada anterior saem no
 *    preparo (o 1 fica — nasce com o curso). A trilha da correção é só de acréscimo e fica presa ao id antigo (sem FK).
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import { abrirLinha } from "./linha-expansivel";
import {
  abrirAbaDoCurso,
  abrirParteDaEdicao,
  irAEdicaoDoCurso,
  irAoCursoPorClique,
} from "./navegar-curso";

/* Os dois casos usam o mesmo curso, em ordem: o SC-004 confere a CH do currículo 1 antes de o SC-005 corrigi-la. */
test.describe.configure({ mode: "default" });

const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let SIGLA = "";
let CURSO_ID = "";
let CURRICULO_1 = "";
let TURMA_ANTIGA = "";
const ANO = Number(
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(
    new Date(),
  ),
);
const DISCIPLINA = "Disciplina do currículo";

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

/** O curso (reaproveitado), o currículo 1 com uma disciplina, e a turma antiga com uma avaliação: o 1 está em uso. */
async function semear(p: number): Promise<void> {
  const { data: existe } = await banco
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (!existe) {
    const { error } = await banco.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso do currículo versionado ${p}`,
        classificacao: "expedito",
        modalidade: "presencial",
        duracao_dias: 30,
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
    conferir("curso", error);
  }
  const { data: curso } = await banco.from("cursos").select("id").eq("codigo", SIGLA).single();
  CURSO_ID = (curso as { id: string }).id;

  /* A rodada anterior sai: turmas (com as linhas e a avaliação), disciplinas, e os currículos ≥ 2. */
  const { data: turmas } = await banco.from("turmas").select("id").eq("curso_id", CURSO_ID);
  for (const t of (turmas ?? []) as { id: string }[]) {
    conferir("avaliações", (await banco.from("avaliacoes").delete().eq("turma_id", t.id)).error);
    await apagarLinhasDaTurma(t.id);
    conferir("turma", (await banco.from("turmas").delete().eq("id", t.id)).error);
  }
  const { data: discs } = await banco.from("disciplinas").select("id").eq("curso_id", CURSO_ID);
  const ids = ((discs ?? []) as { id: string }[]).map((d) => d.id);
  if (ids.length > 0) {
    conferir(
      "habilitações",
      (await banco.from("instrutor_disciplina").delete().in("disciplina_id", ids)).error,
    );
    conferir("UEs", (await banco.from("unidades_ensino").delete().in("disciplina_id", ids)).error);
    conferir("disciplinas", (await banco.from("disciplinas").delete().in("id", ids)).error);
  }
  conferir(
    "currículos novos",
    (await banco.from("curriculos").delete().eq("curso_id", CURSO_ID).gt("versao", 1)).error,
  );

  const { data: c1 } = await banco
    .from("curriculos")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("versao", 1)
    .single();
  CURRICULO_1 = (c1 as { id: string }).id;
  conferir(
    "currículo 1",
    (
      await banco
        .from("curriculos")
        .update({
          vigente_de: "2020-01-01",
          duracao_semanas: 4,
          arquivado_em: null,
          arquivado_por: null,
        })
        .eq("id", CURRICULO_1)
    ).error,
  );
  conferir(
    "disciplina",
    /* `codigo` explícito: o padrão chama `app.proximo_codigo_*`, e a `service_role` não tem `usage` em `app`. */
    (
      await banco.from("disciplinas").insert({
        codigo: `CRVE-DIS-${p}`,
        curso_id: CURSO_ID,
        curriculo_id: CURRICULO_1,
        cod_disciplina: "I",
        nome_disciplina: DISCIPLINA,
        carga_horaria_tempos: 40,
      })
    ).error,
  );
  const { data: d } = await banco
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .single();

  conferir(
    "turma antiga",
    (
      await banco.from("turmas").insert({
        curso_id: CURSO_ID,
        ano_letivo: ANO,
        turma: "T1",
        modalidade: "presencial",
        status: "ativa",
        data_inicio: `${ANO}-02-01`,
        data_termino: `${ANO}-11-30`,
        codigo: `${SIGLA} T1 ${ANO}`,
      })
    ).error,
  );
  const { data: t } = await banco
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", CURSO_ID)
    .eq("ano_letivo", ANO)
    .single();
  TURMA_ANTIGA = (t as { codigo: string }).codigo;

  /* O lançamento que põe o currículo 1 em uso. A lista de tipos nasce vazia no reset: semeia o que usa. */
  const { data: tipo } = await banco
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_avaliacao")
    .eq("valor", "Prova Escrita")
    .maybeSingle();
  if (!tipo) {
    conferir(
      "tipo",
      (
        await banco.from("config_listas").insert({
          lista: "tipos_avaliacao",
          valor: "Prova Escrita",
          rotulo_exibicao: "Prova Escrita",
          ordem: 1,
        })
      ).error,
    );
  }
  await banco.from("instrutores").upsert(
    {
      codigo: `CRVE-${p}`,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor CRVE ${p}`,
      categoria: "Militar",
      om: `OM-CRVE-${p}`,
      status: "ativo",
    },
    { onConflict: "codigo" },
  );
  const { data: ins } = await banco
    .from("instrutores")
    .select("id")
    .eq("codigo", `CRVE-${p}`)
    .single();
  conferir(
    "avaliação",
    (
      await banco.from("avaliacoes").insert({
        codigo: `CRVE-AVL-${p}`,
        turma_id: (t as { id: string }).id,
        disciplina_id: (d as { id: string }).id,
        curso_id: CURSO_ID,
        tipo_avaliacao: "Prova Escrita",
        data_avaliacao: `${ANO}-03-10`,
        instrutor_responsavel_id: (ins as { id: string }).id,
      })
    ).error,
  );
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("curriculo", p);
  SIGLA = `CRVE-${p}`;
  await criarConta(EMAIL, `USR-CRVE-${p}`);
  await semear(p);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

async function disciplinaNoCurriculo(versao: number) {
  const { data } = await banco
    .from("disciplinas")
    .select(
      "carga_horaria_tempos, curriculos!disciplinas_curriculo_do_proprio_curso_fk!inner(versao)",
    )
    .eq("curso_id", CURSO_ID)
    .eq("cod_disciplina", "I")
    .eq("curriculos.versao", versao)
    .single();
  return Number((data as { carga_horaria_tempos: number } | null)?.carga_horaria_tempos);
}

async function editarCh(page: Page, ch: string): Promise<void> {
  await abrirLinha(page, DISCIPLINA);
  await page.locator('[data-slot="alternar-edicao"]').click();
  const formulario = page.locator('[data-slot="formulario-de-disciplina"]');
  await formulario.getByLabel("Carga horária (tempos)").fill(ch);
  await formulario.locator('[data-slot="gravar-disciplina"]').click();
}

test.describe("SC-004 · o currículo novo, a turma nova nele, e a turma antiga com os mesmos números", () => {
  test("Novo currículo → editar a cópia → Nova turma no currículo 2 — tudo por clique, conferido no banco", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await irAEdicaoDoCurso(page, EMAIL, SIGLA);
    await expect(page.locator('[data-slot="escolha-do-curriculo"]')).toContainText(
      "Currículo 1 (vigência 2020)",
    );

    /* RC-7: a cópia do vigente, em *Editar curso*. A data sugerida é 01/01 do ano que vem — depois do mais novo. */
    await page.locator('[data-slot="novo-curriculo"]').click();
    await expect(page.locator('[data-slot="o-que-se-copia"]')).toContainText("Currículo 1");
    await page.locator('[data-slot="criar-curriculo"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("curriculo")).toBe("2");
    await expect(page.locator('[data-slot="situacao-do-curriculo"]')).toHaveText("futuro");

    /* RC-5: editar o currículo ESCOLHIDO — sem justificativa, porque nenhuma turma com lançamento o segue (RC-7). */
    await page.locator("#curriculo-semanas").fill("3");
    await page.locator('[data-slot="salvar-curriculo"]').click();
    await expect(page.locator('[data-slot="curriculo-gravado"]')).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("curriculo")).toBe("2");
    await expect(page.locator('[data-slot="pedido-de-justificativa"]')).toHaveCount(0);

    await abrirParteDaEdicao(page, "disciplinas");
    await expect(page).toHaveURL(/[?&]curriculo=2(&|$)/);
    await editarCh(page, "39");
    await expect.poll(() => disciplinaNoCurriculo(2)).toBe(39);
    expect(await disciplinaNoCurriculo(1), "o currículo 1 mudou junto").toBe(40);

    const { data: duracoes } = await banco
      .from("curriculos")
      .select("versao, duracao_semanas")
      .eq("curso_id", CURSO_ID)
      .order("versao");
    expect(duracoes).toEqual([
      { versao: 1, duracao_semanas: 4 },
      { versao: 2, duracao_semanas: 3 },
    ]);

    /*
     * Ajuste 2: a página do curso mostra o VIGENTE (1); o 2 se consulta na aba *Currículo*, só para leitura, com a CH
     * da cópia editada.
     */
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "curriculo");
    const lista = page.locator('[data-slot="lista-de-curriculos"]');
    await expect(
      lista.locator('tr[data-curriculo="1"] [data-slot="situacao-na-lista"]'),
    ).toHaveText("vigente");
    await expect(
      lista.locator('tr[data-curriculo="2"] [data-slot="situacao-na-lista"]'),
    ).toHaveText("futuro");
    await lista.locator('tr[data-curriculo="2"] [data-slot="consultar-curriculo"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("curriculo")).toBe("2");
    const consulta = page.locator('[data-slot="consulta-do-curriculo"][data-curriculo="2"]');
    await expect(consulta.getByRole("gridcell", { name: DISCIPLINA })).toBeVisible();
    await expect(consulta.locator('[data-slot="nova-disciplina"]')).toHaveCount(0);

    /* RC-4: a turma nova escolhe o currículo 2. */
    await page.locator('[data-slot="nova-turma"]').click();
    const campo = page.locator('select[name="curriculo_id"]');
    await campo.selectOption({ label: `Currículo 2 (vigência ${ANO + 1}) — futuro` });
    await page.locator("#turma-ano").fill(String(ANO + 1));
    await page.locator("#turma-situacao").selectOption("planejada");
    await page.locator("#turma-modalidade").selectOption("presencial");
    await page.locator("#turma-rotulo").fill("T1");
    await page.locator('[data-slot="gravar-turma"]').click();
    await expect(page.locator('[data-slot="curriculo-da-turma"]')).toHaveText(
      `Segue o Currículo 2 (vigência ${ANO + 1})`,
    );
    const { data: nova } = await banco
      .from("turmas")
      .select("curriculos!turmas_curriculo_do_proprio_curso_fk(versao)")
      .eq("curso_id", CURSO_ID)
      .eq("ano_letivo", ANO + 1)
      .single();
    expect((nova as unknown as { curriculos: { versao: number } }).curriculos.versao).toBe(2);

    /* A turma antiga continua no currículo 1 — e a aba Grade mostra as duas, cada uma com o seu (RC-9). */
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "turmas");
    await expect(
      page.locator(`[data-linha-turma="${TURMA_ANTIGA}"] [data-slot="curriculo-na-lista"]`),
    ).toHaveText("Currículo 1 (vigência 2020)");
    await expect(page.locator('[data-slot="curriculo-na-lista"]')).toHaveCount(2);
  });
});

test.describe("SC-005 · a correção do currículo em uso pede a justificativa, e a trilha a guarda", () => {
  test("mudar a CH no currículo 1 (seguido pela turma com avaliação): diálogo → justificativa → trilha", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const motivo = "Correção de digitação: o currículo diz 41.";
    await irAEdicaoDoCurso(page, EMAIL, SIGLA);
    /* O vigente é o padrão do seletor de *Editar curso* — e é o currículo 1, seguido pela turma com avaliação. */
    await expect(page.locator('[data-slot="escolha-do-curriculo"]')).toHaveValue("1");
    await abrirParteDaEdicao(page, "disciplinas");
    await editarCh(page, "41");

    const pedido = page.locator('[data-slot="pedido-de-justificativa"]');
    await expect(pedido).toBeVisible();
    await expect(pedido.locator('[data-slot="confirmar-justificativa"]')).toBeDisabled();
    await pedido.locator('[data-slot="justificativa-da-correcao"]').fill(motivo);
    await pedido.locator('[data-slot="confirmar-justificativa"]').click();

    await expect.poll(() => disciplinaNoCurriculo(1)).toBe(41);
    const { data: d } = await banco
      .from("disciplinas")
      .select("id")
      .eq("curriculo_id", CURRICULO_1)
      .eq("cod_disciplina", "I")
      .single();
    const { data: trilha } = await banco
      .from("correcoes_de_curriculo")
      .select("campos, justificativa, antes, depois")
      .eq("registro_id", (d as { id: string }).id)
      .single();
    expect(trilha).toMatchObject({ campos: ["carga_horaria_tempos"], justificativa: motivo });
  });
});
