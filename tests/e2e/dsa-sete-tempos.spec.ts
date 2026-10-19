/**
 * O dia de **7 TA** com o bloco que atravessa o almoço — caso de regressão do item 1.11 (FR-011.1 e
 * SC-013 da spec 016).
 *
 * > *"foi na TELA do DSA, durante o preenchimento, antes das correções de 08/10. Sem reprodução: o item
 * > 1.11 fica SEM OBJETO, e o caso de regressão (bloco que atravessa o almoço e dia com 7 TA) entra
 * > assim mesmo."* — Q-8, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **A FORMA É A MEDIDA: REGIME DE 7, QUATRO TA DE MANHÃ** — TA de 50 min a partir das 08:10, com 10 min
 * de intervalo, fecham a manhã às 12:00 no 4º tempo; a tarde abre às 13:10 com o 5º. O bloco ocupa os sete,
 * então a grade o mostra em DUAS partes (4 TA e 3 TA), e nenhum tempo pode sumir — nem na tela, nem no papel.
 *
 * ⚠️ **ELE PASSA DE PRIMEIRA, E É ISSO QUE ELE PROVA**: não há defeito a corrigir (FR-011.2). O que o caso
 * guarda é que a próxima mudança da grade não esconda o 5º, o 6º ou o 7º tempo.
 *
 * ⚠️ **TUDO POR CLIQUE A PARTIR DO MENU**: *Turmas* → a turma → *Abrir o DSA* → a semana pela data → *Imprimir*.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTEUDO = "Bloco de sete tempos";
/** Terça, 07/04/2026 — semana 15. */
const DIA = "2026-04-07";

let EMAIL = "";
let TURMA = "";
let PREFIXO = "";

/** Um registro por chave, reaproveitado se já existir (regra 9.1: curso não se apaga). */
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

async function semear(processo: number): Promise<string> {
  PREFIXO = `DSA7-${processo}`;
  const sigla = `CUR-SETE-${processo}`;
  const { data: existe } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  let cursoId = existe?.id as string | undefined;
  if (!cursoId) {
    const { data, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: sigla,
        nome_curso: `Curso de sete tempos ${processo}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 60,
      },
      p_regime: {
        regime_tempos: 7,
        ta_duracao_min: 50,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "08:10",
        hora_inicio_tarde: "13:10",
        vigente_de: "2020-01-01",
      },
    });
    if (error) throw new Error(`falha ao semear ${sigla}: ${error.message}`);
    cursoId = (data as { id: string }).id;
  }
  await admin.from("cursos").update({ status: "ativo" }).eq("id", cursoId);

  const { error: erroTurma } = await admin.from("turmas").insert({
    curso_id: cursoId,
    ano_letivo: 2026,
    status: "ativa",
    modalidade: "presencial",
    data_inicio: "2026-01-05",
    data_termino: "2026-12-18",
    /* Sem sala: `sala_alocada` só aceita a lista `salas`, e a sala não importa ao caso. */
    sala_alocada: null,
    alunos: 12,
  });
  if (erroTurma) throw new Error(`falha ao criar a turma: ${erroTurma.message}`);
  const { data: turma } = await admin
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2026)
    .single();
  const turmaId = (turma as { id: string }).id;

  const disciplinaId = await idPorCodigo("disciplinas", `${PREFIXO}-DIS`, {
    curso_id: cursoId,
    cod_disciplina: "S7",
    nome_disciplina: "Disciplina dos sete tempos",
    carga_horaria_tempos: 40,
  });
  const ueId = await idPorCodigo("unidades_ensino", `${PREFIXO}-UE1`, {
    disciplina_id: disciplinaId,
    curso_id: cursoId,
    numero_ue: 1,
    topico: "Tópico dos sete tempos",
    ch_prevista_tempos: 20,
  });
  const instrutorId = await idPorCodigo("instrutores", `${PREFIXO}-INS`, {
    posto_graduacao: "1ºTEN",
    esp_hab_obs: "-EF",
    nome_completo: "Instrutor dos Sete Tempos",
    categoria: "Militar",
    om: "CIAARA",
  });
  const { error: erroAula } = await admin.from("registros_aula").upsert(
    {
      codigo: `${PREFIXO}-A1`,
      data: DIA,
      ta_inicial: 1,
      tempos_consumidos: 7,
      conteudo_resumo: CONTEUDO,
      local: "Laboratório de Informática",
      turma_id: turmaId,
      curso_id: cursoId,
      unidade_ensino_id: ueId,
      instrutor_id: instrutorId,
      metodologia: null,
    },
    { onConflict: "codigo" },
  );
  if (erroAula) throw new Error(`falha ao lançar o bloco: ${erroAula.message}`);
  return (turma as { codigo: string }).codigo;
}

async function limpar(): Promise<void> {
  if (PREFIXO === "") return;
  await admin.from("registros_aula").delete().like("codigo", `${PREFIXO}-%`);
  if (TURMA !== "") await admin.from("turmas").delete().eq("codigo", TURMA);
}

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("setetempos", info.workerIndex);
  await criarConta(EMAIL, `USR-SETE-${info.workerIndex}`);
  /* Resto de uma execução interrompida: a turma do curso sai antes de nascer de novo. */
  PREFIXO = `DSA7-${info.workerIndex}`;
  const { data: velho } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", `CUR-SETE-${info.workerIndex}`)
    .maybeSingle();
  if (velho) {
    await admin.from("registros_aula").delete().like("codigo", `${PREFIXO}-%`);
    await admin
      .from("turmas")
      .delete()
      .eq("curso_id", (velho as { id: string }).id);
  }
  TURMA = await semear(info.workerIndex);
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
});

test.describe("FR-011.1 · o dia de 7 TA aparece inteiro, na tela e no papel", () => {
  test("menu Turmas → turma → DSA → as duas partes do bloco → Imprimir → os 7 TA no papel", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await irAFichaDaTurma(page, EMAIL, TURMA);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await irParaASemanaDoDia(page, DIA, 15, 2026);

    /* ── Na tela: 4 TA de manhã e 3 à tarde, as duas partes do mesmo bloco ─────────────────── */
    const partes = page
      .locator('[data-slot="grade-da-semana"] td[data-tom="ocupada"]')
      .filter({ hasText: CONTEUDO });
    await expect(partes).toHaveCount(2);
    await expect(partes.nth(0)).toContainText("4 TA");
    await expect(partes.nth(0)).toContainText("parte 1 de 2");
    await expect(partes.nth(1)).toContainText("3 TA");
    await expect(partes.nth(1)).toContainText("parte 2 de 2");
    const grade = page.locator('[data-slot="grade-da-semana"]');
    await expect(grade).toContainText("08:10");
    await expect(grade).toContainText("13:10");

    /* ── No papel, pelo botão Imprimir: os sete tempos na régua e o bloco nas duas partes ───── */
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    const documento = page.locator('[data-slot="dsa-impresso"]');
    await expect(documento).toBeVisible();
    /*
     * ⚠️ A régua tem OITO linhas, e não é defeito (medido em 18/10/2026): os sete do regime e o 8º, marcado
     *    excepcional (`RF-HOR-03.1`). O que o caso guarda são os sete do regime, todos no papel.
     */
    const doRegime = documento.locator(".dsa4-tempo:not(.dsa4-tempo-excepcional)");
    await expect(doRegime).toHaveCount(7);
    await expect(doRegime.nth(6)).toContainText("7º");
    const noPapel = documento.locator('[data-slot="dsa-cartao"]').filter({ hasText: CONTEUDO });
    await expect(noPapel).toHaveCount(2);
    await expect(noPapel.nth(0)).toHaveAttribute("data-parte", "1");
    await expect(noPapel.nth(1)).toHaveAttribute("data-parte", "2");
  });
});
