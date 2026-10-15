/**
 * A aba Avaliações da turma — a projeção e o arbitrado (spec 014, T189; US9 e US10 cenário 4).
 *
 * ⚠️ **SÉRIE, NUMA SEMENTE PRÓPRIA** (`semearAvaliacoes(p, "E2P")`): os casos mudam o dado uns dos outros (o cumprido
 *    sobe de 100 para 118; a sugestão vira arbitrado), e o curso é outro que o de `avaliacoes-nas-telas`.
 * ⚠️ **OS NÚMEROS DA PROJEÇÃO SÃO OS DA T189**: a disciplina A1 tem CH 120, PM 1 e PM 2 aplicadas (2 TA cada, sem vista)
 *    e uma PM 3 de 3 + 1 TA ainda não aplicada. Com 96 TA de aula, o cumprido é 100 → *"restam 20 TA; falta 1 avaliação
 *    (4 TA) → sobram 16 TA para aula"*; com mais 18, é 118 → *"sobram -2 … — estouro"*, em ALERTA e sem bloqueio.
 * ⚠️ **AS AULAS ENTRAM COMO HISTÓRICO** (`origem_migracao_v1`, sem TA): a catraca do instrutor só vale para linha nova,
 *    e a projeção lê `vw_disciplinas_execucao`, que soma as duas.
 * ⚠️ **O QUE O OPERADOR NÃO PODE É PROVADO PELO BANCO** em `tests/invariantes/rls/atividades-e-avaliacoes.test.ts`
 *    (T142: `42501` ao arbitrar, com o caso que discrimina); aqui se prova que a tela não lhe oferece o botão.
 * ⚠️ `goto` só no ponto de partida (a ficha da turma); daí, card → aba → disciplina.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparAvaliacoes, semearAvaliacoes, type AvaliacoesSemeadas } from "./avaliacoes-de-teste";

test.describe.configure({ mode: "serial" });

const PREFIXO = "E2P";
let P = 0;
let S: AvaliacoesSemeadas;
let EMAIL_ENCARREGADO = "";
let EMAIL_OPERADOR = "";
let IDS: {
  cursoId: string;
  turmaId: string;
  turma2: string;
  a1: string;
  a2: string;
  item3: string;
};

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function ok(promessa: PromiseLike<{ error: { message: string } | null }>, oQue: string) {
  const { error } = await promessa;
  if (error) throw new Error(`falha ao ${oQue}: ${error.message}`);
}

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + dias)).toISOString().slice(0, 10);
}

/** Aulas históricas (sem TA) na disciplina A1: `blocos` de 12 TA e um resto. */
async function lancarAulas(de: number, tempos: number[]) {
  const hoje = hojeNaCiaara();
  await ok(
    banco()
      .from("registros_aula")
      .upsert(
        tempos.map((t, k) => ({
          codigo: `AVL-${PREFIXO}${P}-R${de + k}`,
          data: somarDias(hoje, -100 + de + k),
          turma_id: IDS.turmaId,
          curso_id: IDS.cursoId,
          disciplina_id: IDS.a1,
          tempos_consumidos: t,
          conteudo_resumo: "Aula da projeção (semente)",
          origem_migracao_v1: `Semente_AVL:${PREFIXO}${P}:R${de + k}`,
        })),
        { onConflict: "codigo" },
      ),
    "lançar as aulas da projeção",
  );
}

async function limparExtras() {
  if (!IDS) return;
  await banco().from("registros_aula").delete().like("codigo", `AVL-${PREFIXO}${P}-R%`);
}

test.beforeAll(async ({}, info) => {
  P = info.workerIndex;
  EMAIL_ENCARREGADO = emailDeTeste("avturma-enc", P);
  EMAIL_OPERADOR = emailDeTeste("avturma-ope", P);
  await criarConta(EMAIL_ENCARREGADO, `USR-AVT-ENC-${P}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_OPERADOR, `USR-AVT-OPE-${P}`, "operador", "especial");
  S = await semearAvaliacoes(P, PREFIXO);

  const { data: c } = await banco().from("cursos").select("id").eq("codigo", S.curso).single();
  const cursoId = (c as { id: string }).id;
  const { data: t } = await banco()
    .from("turmas")
    .select("id, ano_letivo")
    .eq("codigo", S.turma)
    .single();
  const turma = t as { id: string; ano_letivo: number };
  const disc = async (cod: string) =>
    (
      (
        await banco()
          .from("disciplinas")
          .select("id")
          .eq("curso_id", cursoId)
          .eq("cod_disciplina", cod)
          .single()
      ).data as { id: string }
    ).id;
  const [a1, a2] = await Promise.all([disc(S.disciplinaComTempo), disc(S.disciplinaSemTempo)]);

  // A segunda turma do curso (ano seguinte): o ajuste «só esta turma» não pode alcançá-la.
  const ano2 = turma.ano_letivo + 1;
  let { data: t2 } = await banco()
    .from("turmas")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", ano2)
    .maybeSingle();
  if (!t2) {
    await ok(
      banco()
        .from("turmas")
        .insert({
          curso_id: cursoId,
          ano_letivo: ano2,
          status: "planejada",
          modalidade: "presencial",
          data_inicio: `${ano2}-02-01`,
          data_termino: `${ano2}-06-30`,
          sala_alocada: "Sala 03",
          alunos: 10,
        }),
      "criar a segunda turma",
    );
    ({ data: t2 } = await banco()
      .from("turmas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("ano_letivo", ano2)
      .maybeSingle());
  }

  // A PM 3 de A1, ainda não aplicada (3 + 1 TA), e a sugestão da planilha no PE 1 de A2 (sem tempo do currículo).
  const { data: pm } = await banco()
    .from("config_listas")
    .select("id")
    .eq("lista", "instrumentos_avaliacao")
    .eq("valor", "PM")
    .single();
  await ok(
    banco()
      .from("avaliacoes_curriculo")
      .insert({
        codigo: `AVL-${PREFIXO}${P}-I4`,
        disciplina_id: a1,
        curso_id: cursoId,
        ordem: 3,
        instrumento_id: (pm as { id: string }).id,
        numero: 3,
        origem_item: "curriculo",
        fonte_arquivo: "semente-e2e.pdf",
        fonte_pagina: 1,
        ta_aplicacao: 3,
        origem_ta_aplicacao: "curriculo",
        ta_vista: 1,
        origem_ta_vista: "curriculo",
      }),
    "criar a PM 3",
  );
  const { data: i3 } = await banco()
    .from("avaliacoes_curriculo")
    .select("id")
    .eq("codigo", `AVL-${PREFIXO}${P}-I3`)
    .single();
  const item3 = (i3 as { id: string }).id;
  await ok(
    banco().from("avaliacoes_curriculo_turma").insert({
      avaliacao_curriculo_id: item3,
      turma_id: turma.id,
      ta_aplicacao: 2,
      ta_vista: 1,
      origem: "sugestao_planilha",
    }),
    "semear a sugestão da planilha",
  );

  IDS = { cursoId, turmaId: turma.id, turma2: (t2 as { id: string }).id, a1, a2, item3 };
  await limparExtras();
  await lancarAulas(0, [12, 12, 12, 12, 12, 12, 12, 12]); // 96 TA de aula + 4 das provas = 100
});

test.afterAll(async () => {
  await limparExtras();
  await banco().from("avaliacoes_curriculo_turma").delete().eq("turma_id", IDS.turma2);
  await limparAvaliacoes(P, PREFIXO);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_OPERADOR);
});

const disciplinaNaAba = (page: Page, cod: string) =>
  page.locator(`[data-avaliacoes-disciplina="${cod}"]`);

async function abrirAba(page: Page, email: string) {
  await entrar(page, email, enderecoDaTurma(S.turma));
  await page.locator('[data-slot="card-de-avaliacoes"]').click();
  await expect(page).toHaveURL(/[?&]aba=avaliacoes/);
}

test("US10 cenário 4 · a projeção: 100 cumpridos sobram 16; 118 é estouro, em alerta e sem bloqueio", async ({
  page,
}) => {
  await abrirAba(page, EMAIL_ENCARREGADO);
  const a1 = disciplinaNaAba(page, S.disciplinaComTempo);
  await a1.locator("summary").click();
  const projecao = a1.locator('[data-avaliacoes="projecao"]');
  await expect(projecao).toHaveText(
    "restam 20 TA; falta 1 avaliação (4 TA) → sobram 16 TA para aula",
  );
  await expect(projecao).toHaveAttribute("data-estouro", "false");
  // A1 não tem UE: não há de qual UE escolher, e o aviso «não diz de qual UE» não cabe ali (FR-031.3).
  await expect(a1.locator('[data-avaliacoes="avisos"]')).toHaveCount(0);

  await lancarAulas(8, [12, 6]); // +18 → cumprido 118
  await page.reload();
  const a1Depois = disciplinaNaAba(page, S.disciplinaComTempo);
  await a1Depois.locator("summary").click();
  const estouro = a1Depois.locator('[data-avaliacoes="projecao"]');
  await expect(estouro).toHaveText(
    "restam 2 TA; falta 1 avaliação (4 TA) → sobram -2 TA para aula — estouro",
  );
  await expect(estouro).toHaveAttribute("data-estouro", "true");
  await expect(estouro).toHaveAttribute("role", "status");
});

test("US9 · o ajuste «só esta turma» não muda a outra turma do curso", async ({ page }) => {
  await abrirAba(page, EMAIL_ENCARREGADO);
  const a1 = disciplinaNaAba(page, S.disciplinaComTempo);
  await a1.locator("summary").click();
  const pm1 = a1.locator('[data-avaliacoes-item="PM 1"]');
  await expect(pm1).toContainText("3 TA");
  await pm1.locator('[data-slot="definir-tempo"]').click();
  await pm1.getByLabel("TA de aplicação").fill("5");
  await pm1.getByLabel("TA de vista").fill("1");
  await expect(pm1.getByLabel("Alcance do arbitrado")).toHaveValue("turma");
  await pm1.getByRole("button", { name: "Gravar" }).click();
  await expect(pm1).toContainText("6 TA");
  await expect(pm1.locator('[data-avaliacoes="arbitrado"]')).toBeVisible();

  const { data: ajustes } = await banco()
    .from("avaliacoes_curriculo_turma")
    .select("turma_id, ta_aplicacao, origem")
    .eq("turma_id", IDS.turma2);
  expect(ajustes ?? []).toEqual([]);
  const { data: item } = await banco()
    .from("avaliacoes_curriculo")
    .select("ta_aplicacao, origem_ta_aplicacao")
    .eq("codigo", `AVL-${PREFIXO}${P}-I1`)
    .single();
  // o tempo do CURRÍCULO, no curso, não muda (D-CUR-1): o arbitrado é da turma
  expect(item).toEqual({ ta_aplicacao: 2, origem_ta_aplicacao: "curriculo" });
});

test("US9 cenário 3 · o Operador vê a sugestão e não tem o botão de confirmar", async ({
  page,
}) => {
  await abrirAba(page, EMAIL_OPERADOR);
  const a2 = disciplinaNaAba(page, S.disciplinaSemTempo);
  await a2.locator("summary").click();
  await expect(a2.locator('[data-avaliacoes="sugestao"]')).toHaveText(
    "arbitrado — sugestão da planilha, a confirmar",
  );
  await expect(a2.locator('[data-slot="confirmar-sugestao"]')).toHaveCount(0);
  await expect(a2.locator('[data-slot="acoes-do-arbitrado"]')).toHaveCount(0);
});

test("US9 cenário 3 · o Encarregado confirma a sugestão: vira «definido pela Divisão», com confirmado_em", async ({
  page,
}) => {
  await abrirAba(page, EMAIL_ENCARREGADO);
  const a2 = disciplinaNaAba(page, S.disciplinaSemTempo);
  await a2.locator("summary").click();
  await expect(a2.locator('[data-avaliacoes="sugestao"]')).toBeVisible();
  await a2.locator('[data-slot="confirmar-sugestao"]').click();
  await expect(a2.locator('[data-avaliacoes="arbitrado"]')).toHaveText(
    "não consta do currículo — definido pela Divisão",
  );
  await expect(a2.locator('[data-avaliacoes="sugestao"]')).toHaveCount(0);

  const { data } = await banco()
    .from("avaliacoes_curriculo_turma")
    .select("origem, confirmado_em")
    .eq("avaliacao_curriculo_id", IDS.item3)
    .eq("turma_id", IDS.turmaId)
    .eq("status", "ativo")
    .single();
  const ajuste = data as { origem: string; confirmado_em: string | null };
  expect(ajuste.origem).toBe("arbitrado");
  expect(ajuste.confirmado_em).not.toBeNull();
});

test("FR-031.3 · nomear a UE do item que o currículo deixou na disciplina mostra «decisão CIAARA-11»", async ({
  page,
}) => {
  await abrirAba(page, EMAIL_ENCARREGADO);
  const a2 = disciplinaNaAba(page, S.disciplinaSemTempo);
  await a2.locator("summary").click();
  // com o tempo da turma e sem UE, a disciplina avisa; nomeada a UE, o aviso sai (FR-031.3)
  await expect(a2.locator('[data-avaliacoes="avisos"]')).toContainText(
    "o currículo não diz de qual UE sai",
  );
  const pe1 = a2.locator('[data-avaliacoes-item="PE 1"]');
  await pe1.getByLabel("Unidade de ensino da avaliação").selectOption({ label: "UE 1" });
  await pe1.locator('[data-slot="nomear-ue"]').click();
  await expect(pe1).toContainText("UE 1 · decisão CIAARA-11,");
  await expect(a2.locator('[data-avaliacoes="avisos"]')).toHaveCount(0);
});
