/**
 * Bloco 18 (spec 033), RA-2 e FR-002 — **as AEC previstas do currículo, por clique**: Cursos → o curso → *Editar curso*
 * → *Currículo* → *Atividades e limites* → *Nova AEC prevista*, editar, desativar e reativar; a página do curso só para
 * ler; e o Operador, que não edita o curso, sem o *Novo*.
 *
 * > *"RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória
 * > sim/não. Editadas na aba Atividades de Editar curso → Currículo. Correção em currículo em uso segue RC-6."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * O caso que discrimina (DoD 8): o currículo desta amostra está EM USO (a turma tem um dia parado), então incluir,
 * mudar o que tinha valor e desativar pedem a justificativa e deixam a trilha em `correcoes_de_curriculo` — e
 * COMPLETAR o TA que estava vazio passa sem pedido nem trilha (D-24 da spec 021).
 *
 * ⚠️ `goto` só no ponto de partida (`entrar`). A prova da gravação é o BANCO (PEND-016-2), não o campo digitado.
 * ⚠️ IDEMPOTENTE (regra 9.1): o curso é reaproveitado; as AEC previstas, a turma, o dia parado e a disciplina da rodada
 *    anterior saem no preparo. A trilha é só de acréscimo e fica presa aos ids antigos (sem FK); por isso toda conferência
 *    dela filtra pelo `registro_id` da rodada.
 * ⚠️ A TURMA MORA EM 2046: a atividade GLOBAL de 10/05/2026 de outras amostras não alcança a janela dela, e quem põe o
 *    currículo em uso é só o dia parado desta amostra.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, contasDoAuth, criarConta, emailDeTeste } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import {
  abrirAbaDoCurso,
  abrirParteDaEdicao,
  irAEdicaoDoCurso,
  irAoCursoPorClique,
  justificarCorrecao,
} from "./navegar-curso";

const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ANO = 2046;
const NOME_NOVA = "Palestra de segurança orgânica da amostra";
const NOME_SEMEADA = "Visita ao centro de dados da amostra";
const MOTIVO_INCLUIR = "O currículo prevê a palestra no anexo B.";
const MOTIVO_ALTERAR = "O anexo B dá três tempos à palestra.";
const MOTIVO_DESATIVAR = "A palestra saiu do currículo nesta revisão.";
const MOTIVO_REATIVAR = "A palestra voltou ao currículo.";

let EMAIL = "";
let EMAIL_OPERADOR = "";
let SIGLA = "";
let CURSO_ID = "";
let CURRICULO_1 = "";
let DISCIPLINA_ID = "";
let SEMEADA_ID = "";

function conferir(oQue: string, error: { message: string } | null): void {
  if (error) throw new Error(`${oQue}: ${error.message}`);
}

/** A rodada anterior sai: AEC previstas (antes da disciplina, por causa da FK), dias parados, linhas, turmas e disciplinas. */
async function limpar(): Promise<void> {
  if (CURSO_ID === "") return;
  conferir(
    "AEC previstas",
    (await banco.from("aec_previstas_curriculo").delete().eq("curso_id", CURSO_ID)).error,
  );
  const { data: turmas } = await banco.from("turmas").select("id").eq("curso_id", CURSO_ID);
  for (const t of (turmas ?? []) as { id: string }[]) {
    conferir("dias parados", (await banco.from("dias_parados").delete().eq("turma_id", t.id)).error);
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
}

async function idDoTipo(valor: string): Promise<string> {
  const { data, error } = await banco
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_atividade")
    .eq("valor", valor)
    .single();
  conferir(`tipo ${valor}`, error);
  return (data as { id: string }).id;
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("aec-previstas", p);
  EMAIL_OPERADOR = emailDeTeste("aec-previstas-operador", p);
  SIGLA = `CUR-AEP-${p}`;
  await criarConta(EMAIL, `USR-AEP-${p}`);
  await criarConta(EMAIL_OPERADOR, `USR-AEPO-${p}`, "operador", "geral");

  const { data: existe } = await banco
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) CURSO_ID = (existe as { id: string }).id;
  else {
    const { data, error } = await banco.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso das AEC previstas ${p}`,
        classificacao: "expedito",
        modalidade: "presencial",
        duracao_dias: 60,
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
    conferir(`curso ${SIGLA}`, error);
    CURSO_ID = (data as { id: string }).id;
  }
  await limpar();

  const { data: c1, error: e1 } = await banco
    .from("curriculos")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("versao", 1)
    .single();
  conferir("currículo 1", e1);
  CURRICULO_1 = (c1 as { id: string }).id;

  /* A disciplina que a AEC prevista pode citar. `codigo` explícito, como nas outras amostras de disciplina. */
  conferir(
    "disciplina",
    (
      await banco.from("disciplinas").insert({
        codigo: `AEPE-DIS-${p}`,
        curso_id: CURSO_ID,
        curriculo_id: CURRICULO_1,
        cod_disciplina: "I",
        nome_disciplina: "Disciplina da AEC",
        carga_horaria_tempos: 20,
      })
    ).error,
  );
  const { data: d } = await banco
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .single();
  DISCIPLINA_ID = (d as { id: string }).id;

  /* A turma e o dia parado que põem o currículo 1 EM USO (`app.curriculo_em_uso_com_lancamento`). */
  conferir(
    "turma",
    (
      await banco.from("turmas").insert({
        curso_id: CURSO_ID,
        turma: "T1",
        ano_letivo: ANO,
        status: "ativa",
        modalidade: "presencial",
        data_inicio: `${ANO}-02-01`,
        data_termino: `${ANO}-11-30`,
        alunos: 10,
      })
    ).error,
  );
  const { data: turma } = await banco
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("ano_letivo", ANO)
    .single();
  const { data: parada } = await banco
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_parada")
    .eq("valor", "LA")
    .single();
  conferir(
    "dia parado",
    (
      await banco.from("dias_parados").insert({
        turma_id: (turma as { id: string }).id,
        data: `${ANO}-04-03`,
        tipo_parada_id: (parada as { id: string }).id,
        motivo: "Parada da amostra das AEC previstas",
      })
    ).error,
  );

  /*
   * Uma AEC prevista com o TA VAZIO («não definido»), gravada sem sessão (a carga, que não passa pela RC-6): é a que o
   * Admin COMPLETA sem justificativa, e a que o Operador vê sem ação.
   */
  SEMEADA_ID = crypto.randomUUID();
  conferir(
    "AEC prevista semeada",
    (
      await banco.from("aec_previstas_curriculo").insert({
        id: SEMEADA_ID,
        curso_id: CURSO_ID,
        curriculo_id: CURRICULO_1,
        nome: NOME_SEMEADA,
        tipo_atividade_id: await idDoTipo("Visita Técnica"),
        ta_previstos: null,
        obrigatoria: false,
        ordem: 1,
      })
    ).error,
  );
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
  await apagarConta(EMAIL_OPERADOR);
});

/** Editar curso → Currículo → Atividades e limites, por clique, e a seção das AEC previstas. */
async function irAsAecPrevistas(page: Page, email: string) {
  await irAEdicaoDoCurso(page, email, SIGLA);
  await abrirParteDaEdicao(page, "atividades");
  const secao = page.locator('[data-slot="aec-previstas-do-curriculo"]');
  await expect(secao).toBeVisible();
  return secao;
}

async function linhaNoBanco(nome: string) {
  const { data, error } = await banco
    .from("aec_previstas_curriculo")
    .select(
      "id, curriculo_id, nome, tipo_atividade_id, ta_previstos, obrigatoria, disciplina_id, fonte_arquivo, fonte_pagina, status, criado_por",
    )
    .eq("curso_id", CURSO_ID)
    .eq("nome", nome)
    .single();
  conferir(`a AEC prevista ${nome}`, error);
  return data as {
    id: string;
    curriculo_id: string;
    tipo_atividade_id: string;
    ta_previstos: number | null;
    obrigatoria: boolean;
    disciplina_id: string | null;
    fonte_arquivo: string | null;
    fonte_pagina: string | null;
    status: string;
    criado_por: string | null;
  };
}

async function trilhaDe(registroId: string) {
  const { data, error } = await banco
    .from("correcoes_de_curriculo")
    .select("tabela, acao, campos, justificativa, autor_id, curriculo_id")
    .eq("registro_id", registroId)
    .order("feito_em");
  conferir("a trilha", error);
  return (data ?? []) as {
    tabela: string;
    acao: string;
    campos: string[];
    justificativa: string;
    autor_id: string;
    curriculo_id: string;
  }[];
}

test.describe("Bloco 18 · RA-2 · as AEC previstas do currículo em uso, por clique", () => {
  test("Nova AEC prevista com justificativa e trilha; editar; completar o TA vazio sem pedido; desativar e reativar", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const [conta] = await contasDoAuth(EMAIL);
    const autor = conta?.id ?? "";
    expect(autor, "a conta do Admin não está no Auth").not.toBe("");

    const secao = await irAsAecPrevistas(page, EMAIL);
    const resposta = secao.locator('[data-slot="resposta-das-aec-previstas"]');

    /* ── 1. Nova AEC prevista: o currículo está em uso, e incluir é correção (RC-6) ── */
    await secao.locator('[data-slot="nova-aec-prevista"]').click();
    const form = page.locator('[data-slot="formulario-da-aec-prevista"]');
    await expect(form).toBeVisible();
    await form.getByLabel("Nome", { exact: true }).fill(NOME_NOVA);
    await form.getByLabel("Tipo", { exact: true }).selectOption({ label: "Palestra" });
    await form.getByLabel("TA previstos").fill("2");
    await form.getByLabel("Obrigatória").selectOption("sim");
    await form
      .getByLabel("Disciplina (opcional)")
      .selectOption({ label: "I — Disciplina da AEC" });
    await form.getByLabel("Arquivo do currículo (opcional)").fill("Curriculo da amostra.pdf");
    await form.getByLabel("Página (opcional)").fill("A-74 (Anexo B)");
    await form.locator('[data-slot="gravar-aec-prevista"]').click();
    await justificarCorrecao(page, MOTIVO_INCLUIR);
    await expect(resposta).toHaveText("AEC prevista incluída.");
    await expect(form).toHaveCount(0);

    const nova = await linhaNoBanco(NOME_NOVA);
    expect(nova).toMatchObject({
      curriculo_id: CURRICULO_1,
      tipo_atividade_id: await idDoTipo("Palestra"),
      ta_previstos: 2,
      obrigatoria: true,
      disciplina_id: DISCIPLINA_ID,
      fonte_arquivo: "Curriculo da amostra.pdf",
      fonte_pagina: "A-74 (Anexo B)",
      status: "ativo",
      criado_por: autor,
    });
    expect(await trilhaDe(nova.id)).toEqual([
      expect.objectContaining({
        tabela: "aec_previstas_curriculo",
        acao: "incluir",
        justificativa: MOTIVO_INCLUIR,
        autor_id: autor,
        curriculo_id: CURRICULO_1,
      }),
    ]);

    const linhaNova = secao.locator('[data-slot="aec-prevista"]', { hasText: NOME_NOVA });
    await expect(linhaNova).toContainText("Palestra");
    await expect(linhaNova.locator('[data-slot="ta-previstos"]')).toHaveText("2 TA");
    await expect(linhaNova).toContainText("I — Disciplina da AEC");
    /* Regra 4: sem exceção nominal, o Excluir fica desabilitado, com a dica do motivo (RT-2). */
    await expect(linhaNova.locator('[data-slot="excluir-aec-prevista"]')).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    /* ── 2. Editar o que tinha valor (2 → 3 TA): correção, com justificativa e trilha ── */
    await linhaNova.locator('[data-slot="editar-aec-prevista"]').click();
    await expect(form.getByLabel("TA previstos")).toHaveValue("2");
    await form.getByLabel("TA previstos").fill("3");
    await form.locator('[data-slot="gravar-aec-prevista"]').click();
    await justificarCorrecao(page, MOTIVO_ALTERAR);
    await expect(resposta).toHaveText("AEC prevista gravada.");
    expect((await linhaNoBanco(NOME_NOVA)).ta_previstos).toBe(3);
    const aposAlterar = await trilhaDe(nova.id);
    expect(aposAlterar.map((t) => t.acao)).toEqual(["incluir", "alterar"]);
    expect(aposAlterar[1]?.campos).toEqual(["ta_previstos"]);

    /* ── 3. ⚠️ O caso que discrimina: COMPLETAR o TA «não definido» é livre — sem pedido e sem trilha (D-24) ── */
    const linhaSemeada = secao.locator('[data-slot="aec-prevista"]', { hasText: NOME_SEMEADA });
    await expect(linhaSemeada.locator('[data-slot="ta-previstos"]')).toHaveText("não definido");
    await linhaSemeada.locator('[data-slot="editar-aec-prevista"]').click();
    await form.getByLabel("TA previstos").fill("4");
    await form.locator('[data-slot="gravar-aec-prevista"]').click();
    await expect(resposta).toHaveText("AEC prevista gravada.");
    await expect(page.locator('[data-slot="pedido-de-justificativa"]')).toHaveCount(0);
    expect((await linhaNoBanco(NOME_SEMEADA)).ta_previstos).toBe(4);
    expect(await trilhaDe(SEMEADA_ID)).toEqual([]);

    /* ── 4. Desativar (confirmação, justificativa e trilha) e reativar ── */
    await linhaNova.locator('[data-slot="desativar-aec-prevista"]').click();
    await page
      .locator('[data-slot="dialogo-confirmacao"]')
      .getByRole("button", { name: "Desativar" })
      .click();
    await justificarCorrecao(page, MOTIVO_DESATIVAR);
    await expect(resposta).toHaveText("AEC prevista desativada.");
    expect((await linhaNoBanco(NOME_NOVA)).status).toBe("inativo");
    await expect(linhaNova.locator('[data-slot="situacao-da-aec-prevista"]')).toHaveText("Inativa");

    await linhaNova.locator('[data-slot="reativar-aec-prevista"]').click();
    await page
      .locator('[data-slot="dialogo-confirmacao"]')
      .getByRole("button", { name: "Reativar" })
      .click();
    await justificarCorrecao(page, MOTIVO_REATIVAR);
    await expect(resposta).toHaveText("AEC prevista reativada.");
    expect((await linhaNoBanco(NOME_NOVA)).status).toBe("ativo");
    expect((await trilhaDe(nova.id)).map((t) => t.acao)).toEqual([
      "incluir",
      "alterar",
      "inativar",
      "reativar",
    ]);

    /* ── 5. A página do curso, aba Atividades: as AEC previstas, só para ler (FR-002.3) ── */
    await page.locator('[data-slot="curriculo-na-edicao"]').waitFor();
    await irAoCursoPorClique(page, EMAIL, SIGLA);
    await abrirAbaDoCurso(page, "atividades");
    const leitura = page.locator('[data-slot="aba-atividades"] [data-slot="aec-previstas-do-curso"]');
    await expect(leitura.locator('[data-slot="aec-prevista-do-curso"]')).toHaveCount(2);
    await expect(leitura).toContainText(NOME_NOVA);
    await expect(leitura).toContainText("3 TA");
    await expect(leitura).toContainText(NOME_SEMEADA);
    for (const acao of [
      "nova-aec-prevista",
      "editar-aec-prevista",
      "desativar-aec-prevista",
      "excluir-aec-prevista",
    ]) {
      await expect(
        page.locator(`[data-slot="aba-atividades"] [data-slot="${acao}"]`),
        `a página do curso ofereceu ${acao}`,
      ).toHaveCount(0);
    }
  });
});

test.describe("Bloco 18 · RA-2 · quem não edita o curso vê as AEC previstas e não as edita", () => {
  test("o Operador chega à parte Atividades e não vê Nova AEC prevista, Editar nem Desativar", async ({
    page,
  }) => {
    const secao = await irAsAecPrevistas(page, EMAIL_OPERADOR);
    await expect(secao.locator('[data-slot="aec-prevista"]', { hasText: NOME_SEMEADA })).toBeVisible();
    for (const acao of [
      "nova-aec-prevista",
      "editar-aec-prevista",
      "desativar-aec-prevista",
      "reativar-aec-prevista",
    ]) {
      await expect(secao.locator(`[data-slot="${acao}"]`), `o Operador viu ${acao}`).toHaveCount(0);
    }
  });
});
