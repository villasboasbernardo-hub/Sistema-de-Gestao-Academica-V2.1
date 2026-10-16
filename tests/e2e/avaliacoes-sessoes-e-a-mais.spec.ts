/**
 * A aba Avaliações da turma com as regras da emenda de 15/10/2026 (desenho aprovado por Bernardo Villas Boas em
 * 16/10/2026): a prova A MAIS como informação (`RN-AV-14`) e «juntar como sessão da mesma prova» (`RN-AV-12`), por
 * clique (T258, T259).
 *
 * > *"RN-AV-14: prova a mais que o currículo prevê NÃO é erro de planilha; vira alerta informativo na aba Avaliações
 * > da turma ("currículo prevê 1 PP; aplicadas 2")."*
 * > *"Dias próximos = 7, e na aba Avaliações da turma a ação "juntar como sessão da mesma prova" (Encarregado/Admin,
 * > com trilha)."* — 16/10/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É A MESMA SEMENTE ANTES E DEPOIS DE JUNTAR**: a PP 1 aplicada e uma 2ª PP sem item
 *    (instrumento gravado), 20 dias depois — fora da janela de 7 que a sincronização usaria. Antes: o card diz «2
 *    aplicadas de 1», a aba mostra «currículo prevê 1 PP; aplicadas 2». O Encarregado junta → «1 aplicadas de 1», a
 *    linha da PP 1 diz «em 2 sessões», o aviso some, e a trilha fica no banco.
 * ⚠️ **O QUE O OPERADOR NÃO PODE É PROVADO PELO BANCO** (`tests/invariantes/rls/sessoes-de-aplicacao.test.ts`, `42501`);
 *    aqui, que a tela não lhe oferece o botão.
 * ⚠️ **CURSO PRÓPRIO** (`CUR-E2S<processo>`), reaproveitado (regra 9.1); o resto sai e volta. `goto` só no ponto de
 *    partida (a ficha da turma); daí, card → aba → disciplina.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

test.describe.configure({ mode: "serial" });

const TIPO = "Prova Prática";
let P = 0;
let EMAIL_ENCARREGADO = "";
let EMAIL_OPERADOR = "";
let IDS: {
  cursoId: string;
  turmaId: string;
  turmaCodigo: string;
  disciplinaId: string;
  a1: string;
  a2: string;
};
let DIA_1 = "";
let DIA_2 = "";

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function ok<T>(
  promessa: PromiseLike<{ data: T; error: { message: string } | null }>,
  oQue: string,
): Promise<T> {
  const { data, error } = await promessa;
  if (error) throw new Error(`falha ao ${oQue}: ${error.message}`);
  return data;
}

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + dias)).toISOString().slice(0, 10);
}

async function limpar(): Promise<void> {
  if (!IDS) return;
  const avs = await ok(
    banco().from("avaliacoes").select("id").eq("turma_id", IDS.turmaId),
    "ler as avaliações",
  );
  const ids = ((avs ?? []) as { id: string }[]).map((a) => a.id);
  if (ids.length > 0) {
    await ok(
      banco().from("vistas_de_avaliacao").delete().in("avaliacao_id", ids),
      "apagar as vistas",
    );
    await ok(
      banco().from("sessoes_de_aplicacao").delete().in("avaliacao_id", ids),
      "apagar as sessões",
    );
    await ok(
      banco().from("sessoes_de_aplicacao").delete().in("juntada_de_avaliacao_id", ids),
      "apagar as juntadas",
    );
    await ok(banco().from("avaliacoes").delete().in("id", ids), "apagar as avaliações");
  }
  await ok(
    banco().from("avaliacoes_curriculo").delete().eq("curso_id", IDS.cursoId),
    "apagar os itens",
  );
}

test.beforeAll(async ({}, info) => {
  P = info.workerIndex;
  const s = `E2S${P}`;
  const hoje = hojeNaCiaara();
  DIA_1 = somarDias(hoje, -30);
  DIA_2 = somarDias(hoje, -10);
  EMAIL_ENCARREGADO = emailDeTeste("avsess-enc", P);
  EMAIL_OPERADOR = emailDeTeste("avsess-ope", P);
  await criarConta(EMAIL_ENCARREGADO, `USR-AVS-ENC-${P}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_OPERADOR, `USR-AVS-OPE-${P}`, "operador", "especial");

  await ok(
    banco()
      .from("config_listas")
      .upsert(
        { lista: "tipos_avaliacao", valor: TIPO, rotulo_exibicao: TIPO },
        { onConflict: "lista,valor", ignoreDuplicates: true },
      ),
    "garantir o tipo de avaliação",
  );
  let curso = await ok(
    banco().from("cursos").select("id").eq("codigo", `CUR-${s}`).maybeSingle(),
    "ler o curso",
  );
  if (!curso) {
    await ok(
      banco().rpc("criar_curso_com_regime", {
        p_curso: {
          codigo: `CUR-${s}`,
          nome_curso: `Curso das sessões ${P}`,
          classificacao: "especial",
          modalidade: "presencial",
          duracao_dias: 120,
        },
        p_regime: {
          regime_tempos: 8,
          ta_duracao_min: 45,
          intervalo_manha_min: 5,
          intervalo_tarde_min: 5,
          hora_inicio_manha: "07:50",
          hora_inicio_tarde: "13:05",
          vigente_de: "2020-01-01",
        },
      }),
      "criar o curso",
    );
    curso = await ok(
      banco().from("cursos").select("id").eq("codigo", `CUR-${s}`).maybeSingle(),
      "ler o curso",
    );
  }
  const cursoId = (curso as { id: string }).id;
  const ano = Number(hoje.slice(0, 4));
  let turma = await ok(
    banco()
      .from("turmas")
      .select("id, codigo")
      .eq("curso_id", cursoId)
      .eq("ano_letivo", ano)
      .maybeSingle(),
    "ler a turma",
  );
  if (!turma) {
    await ok(
      banco()
        .from("turmas")
        .insert({
          curso_id: cursoId,
          ano_letivo: ano,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: somarDias(hoje, -60),
          data_termino: somarDias(hoje, 60),
          sala_alocada: "Sala 03",
          alunos: 10,
        }),
      "criar a turma",
    );
    turma = await ok(
      banco()
        .from("turmas")
        .select("id, codigo")
        .eq("curso_id", cursoId)
        .eq("ano_letivo", ano)
        .maybeSingle(),
      "ler a turma",
    );
  }
  const { id: turmaId, codigo: turmaCodigo } = turma as { id: string; codigo: string };
  let disc = await ok(
    banco()
      .from("disciplinas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("cod_disciplina", "S1")
      .maybeSingle(),
    "ler a disciplina",
  );
  if (!disc) {
    await ok(
      banco()
        .from("disciplinas")
        .insert({
          codigo: `AVS-${s}-D1`,
          curso_id: cursoId,
          cod_disciplina: "S1",
          nome_disciplina: "Disciplina das sessões",
          carga_horaria_tempos: 40,
        }),
      "criar a disciplina",
    );
    disc = await ok(
      banco()
        .from("disciplinas")
        .select("id")
        .eq("curso_id", cursoId)
        .eq("cod_disciplina", "S1")
        .maybeSingle(),
      "ler a disciplina",
    );
  }
  const disciplinaId = (disc as { id: string }).id;
  IDS = { cursoId, turmaId, turmaCodigo, disciplinaId, a1: "", a2: "" };
  await limpar();

  const pp = await ok(
    banco()
      .from("config_listas")
      .select("id")
      .eq("lista", "instrumentos_avaliacao")
      .eq("valor", "PP")
      .single(),
    "ler o instrumento PP",
  );
  const ppId = (pp as { id: string }).id;
  await ok(
    banco()
      .from("avaliacoes_curriculo")
      .insert({
        codigo: `AVS-${s}-I1`,
        disciplina_id: disciplinaId,
        curso_id: cursoId,
        ordem: 1,
        instrumento_id: ppId,
        numero: 1,
        origem_item: "curriculo",
        fonte_arquivo: "semente-e2e.pdf",
        fonte_pagina: 1,
        ta_aplicacao: 2,
        origem_ta_aplicacao: "curriculo",
      }),
    "criar a PP 1 do currículo",
  );
  const item = await ok(
    banco().from("avaliacoes_curriculo").select("id").eq("codigo", `AVS-${s}-I1`).single(),
    "ler a PP 1",
  );
  const base = {
    turma_id: turmaId,
    disciplina_id: disciplinaId,
    curso_id: cursoId,
    tipo_avaliacao: TIPO,
    status: "concluida",
    tempos_consumidos: 2,
  };
  await ok(
    banco()
      .from("avaliacoes")
      .insert([
        // A PP 1, ligada ao item; e a 2ª PP, SEM item, com o instrumento gravado (A2) — 20 dias depois.
        {
          ...base,
          codigo: `AVS-${s}-A1`,
          avaliacao_curriculo_id: (item as { id: string }).id,
          data_avaliacao: DIA_1,
          ta_inicial: 1,
        },
        {
          ...base,
          codigo: `AVS-${s}-A2`,
          instrumento_id: ppId,
          data_avaliacao: DIA_2,
          ta_inicial: 3,
        },
      ]),
    "criar as duas PP aplicadas",
  );
  const avs = (await ok(
    banco().from("avaliacoes").select("id, codigo").eq("turma_id", turmaId),
    "ler as avaliações",
  )) as { id: string; codigo: string }[];
  IDS.a1 = avs.find((a) => a.codigo.endsWith("-A1"))!.id;
  IDS.a2 = avs.find((a) => a.codigo.endsWith("-A2"))!.id;
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_OPERADOR);
});

const disciplinaNaAba = (page: Page) => page.locator('[data-avaliacoes-disciplina="S1"]');

async function abrirAba(page: Page, email: string) {
  await entrar(page, email, enderecoDaTurma(IDS.turmaCodigo));
  await page.locator('[data-slot="card-de-avaliacoes"]').click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  await disciplinaNaAba(page).locator("summary").click();
}

test("RN-AV-14 · a prova a mais é INFORMAÇÃO na aba; e o Operador não vê «juntar»", async ({
  page,
}) => {
  await abrirAba(page, EMAIL_OPERADOR);
  const s1 = disciplinaNaAba(page);
  const aviso = s1.locator('[data-avaliacoes="alem-do-previsto"]');
  await expect(aviso).toContainText("currículo prevê 1 PP; aplicadas 2");
  // Informação, nunca alerta de erro (RN-DEG-02): sem `role="alert"` nem `role="status"`.
  await expect(aviso).not.toHaveAttribute("role", /.+/);
  await expect(s1.locator('[data-avaliacoes-sem-item="PP"]')).toBeVisible();
  await expect(page.locator('[data-slot="juntar-como-sessao"]')).toHaveCount(0);
});

test("RN-AV-12 · o Encarregado junta a 2ª PP como sessão da PP 1: o card conta 1, a linha diz «em 2 sessões», e a trilha fica", async ({
  page,
}) => {
  await entrar(page, EMAIL_ENCARREGADO, enderecoDaTurma(IDS.turmaCodigo));
  const card = page.locator('[data-slot="card-de-avaliacoes"]');
  await expect(card).toHaveAttribute("data-aplicadas", "2");
  await card.click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
  const s1 = disciplinaNaAba(page);
  await s1.locator("summary").click();

  const semItem = s1.locator('[data-avaliacoes-sem-item="PP"]');
  await semItem.locator('[data-slot="juntar-como-sessao"]').click();
  await semItem
    .locator('[data-slot="prova-para-juntar"]')
    .selectOption({ label: `PP 1 · ${dataParaLeitura(DIA_1)}` });
  await semItem.getByRole("button", { name: "Juntar", exact: true }).click();

  await expect(s1.locator('[data-avaliacoes-sem-item="PP"]')).toHaveCount(0);
  await expect(s1.locator('[data-avaliacoes-item="PP 1"] [data-avaliacoes="sessoes"]')).toHaveText(
    "em 2 sessões",
  );
  await expect(s1.locator('[data-avaliacoes="alem-do-previsto"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="card-de-avaliacoes"]')).toHaveAttribute(
    "data-aplicadas",
    "1",
  );

  const sessao = (await ok(
    banco()
      .from("sessoes_de_aplicacao")
      .select("numero, data, juntada_de_avaliacao_id, juntada_por, juntada_em")
      .eq("avaliacao_id", IDS.a1)
      .eq("status", "ativo"),
    "ler a sessão",
  )) as {
    numero: number;
    data: string;
    juntada_de_avaliacao_id: string;
    juntada_por: string | null;
    juntada_em: string | null;
  }[];
  expect(sessao.map((x) => [x.numero, x.data, x.juntada_de_avaliacao_id])).toEqual([
    [2, DIA_2, IDS.a2],
  ]);
  expect(sessao[0]!.juntada_por).not.toBeNull();
  expect(sessao[0]!.juntada_em).not.toBeNull();
  const juntada = (await ok(
    banco().from("avaliacoes").select("status").eq("id", IDS.a2).single(),
    "ler a juntada",
  )) as {
    status: string;
  };
  expect(juntada.status).toBe("cancelada");
});
