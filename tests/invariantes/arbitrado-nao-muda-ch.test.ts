/**
 * Spec 014, SC-014 (T185) — **o arbitrado sai de DENTRO da CH; nenhuma ação sobre o item muda o catálogo**.
 *
 * > D-CUR-1: a CH da disciplina e a da UE são do currículo; o tempo de avaliação arbitrado não as altera.
 *
 * Com SESSÃO real de Encarregado (quem tem `avaliacoes_curriculo_arbitrado.editar`), as cinco escritas que as ações
 * de `lib/acoes/avaliacoes-do-curriculo.ts` fazem — definir no curso, ajustar a turma, confirmar a sugestão, arbitrar
 * a quantidade e nomear a UE — e, antes e depois, a impressão digital do catálogo: `disciplinas` (código, CH,
 * situação) e `unidades_ensino` (código, CH). Ela tem de ficar IGUAL.
 *
 * ⚠️ **CADA ESCRITA TEM CONTROLE POSITIVO** (devolve linha): uma escrita recusada em silêncio (gotcha 4) deixaria o
 *    catálogo igual pelo motivo errado.
 * ⚠️ A sessão é de ENCARREGADO, não de Admin (gotcha 8). Identificadores gerados; a amostra se apaga no fim.
 */
import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./rls/chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const EMAIL = "arbitrado-ch@ciaara.testearb";
const SENHA = "senha-de-teste-com-12+";
const FONTE = "arb-ch.pdf";

let sessao: SupabaseClient;
let cursoId = "";
let turmaId = "";
let disciplinaId = "";
let ueId = "";
let itemId = "";
let pmId = "";

async function limpar(): Promise<void> {
  const { data } = await servico.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email === EMAIL) await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
  }
  await servico.from("usuarios").delete().eq("codigo", "USR-ARB-CH");
  const { data: itens } = await servico
    .from("avaliacoes_curriculo")
    .select("id")
    .like("codigo", "ARB-%");
  const ids = (itens ?? []).map((i) => (i as { id: string }).id);
  if (ids.length > 0) {
    await servico.from("avaliacoes_curriculo_turma").delete().in("avaliacao_curriculo_id", ids);
    await servico.from("avaliacoes_curriculo").delete().in("id", ids);
  }
  await servico.from("unidades_ensino").delete().like("codigo", "ARB-UE-%");
  await servico.from("disciplinas").delete().like("codigo", "ARB-DIS-%");
}

/** A impressão digital do catálogo: CH de disciplina e de UE. */
async function catalogo(): Promise<string> {
  const [{ data: d }, { data: u }] = await Promise.all([
    servico.from("disciplinas").select("codigo, carga_horaria_tempos, status"),
    servico.from("unidades_ensino").select("codigo, ch_prevista_tempos, status"),
  ]);
  const linhas = [
    ...(d ?? []).map((x) => `D|${x.codigo}|${x.carga_horaria_tempos}|${x.status}`),
    ...(u ?? []).map((x) => `U|${x.codigo}|${x.ch_prevista_tempos}|${x.status}`),
  ].sort();
  return createHash("md5").update(linhas.join("\n")).digest("hex");
}

beforeAll(async () => {
  await limpar();
  const { data: c } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", "Z-ARB-CH")
    .maybeSingle();
  if (c) cursoId = (c as { id: string }).id;
  else {
    const { error } = await servico.rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: "Z-ARB-CH",
          nome_curso: "Curso ARB",
          classificacao: "regular",
          modalidade: "presencial",
          duracao_dias: 20,
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
      } as never,
    );
    if (error) throw new Error(`curso: ${error.message}`);
    const { data } = await servico.from("cursos").select("id").eq("codigo", "Z-ARB-CH").single();
    cursoId = (data as { id: string }).id;
  }
  const { data: t } = await servico
    .from("turmas")
    .select("id")
    .eq("curso_id", cursoId)
    .maybeSingle();
  if (t) turmaId = (t as { id: string }).id;
  else {
    const { data, error } = await servico
      .from("turmas")
      .insert({
        curso_id: cursoId,
        turma: "T1",
        ano_letivo: 2026,
        status: "ativa",
        modalidade: "presencial",
        data_inicio: "2026-01-05",
        data_termino: "2026-12-15",
      })
      .select("id")
      .single();
    if (error) throw new Error(`turma: ${error.message}`);
    turmaId = (data as { id: string }).id;
  }
  const { data: d, error: eD } = await servico
    .from("disciplinas")
    .insert({
      codigo: `ARB-DIS-${SELO}`,
      curso_id: cursoId,
      cod_disciplina: `ARB${SELO}`,
      nome_disciplina: "Disciplina ARB",
      carga_horaria_tempos: 40,
    })
    .select("id")
    .single();
  if (eD) throw new Error(`disciplina: ${eD.message}`);
  disciplinaId = (d as { id: string }).id;
  const { data: u, error: eU } = await servico
    .from("unidades_ensino")
    .insert({
      codigo: `ARB-UE-${SELO}`,
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      numero_ue: 1,
      topico: "UE ARB",
      ch_prevista_tempos: 36,
    })
    .select("id")
    .single();
  if (eU) throw new Error(`UE: ${eU.message}`);
  ueId = (u as { id: string }).id;
  const { data: pm } = await servico
    .from("config_listas")
    .select("id")
    .eq("lista", "instrumentos_avaliacao")
    .eq("valor", "PM")
    .single();
  pmId = (pm as { id: string }).id;
  // O item do currículo SEM tempo e SEM UE — o caso que o arbitrado existe para resolver.
  const { data: it, error: eI } = await servico
    .from("avaliacoes_curriculo")
    .insert({
      codigo: `ARB-${SELO}-1`,
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      ordem: 1,
      instrumento_id: pmId,
      numero: 1,
      origem_item: "curriculo",
      fonte_arquivo: FONTE,
      fonte_pagina: 1,
    })
    .select("id")
    .single();
  if (eI) throw new Error(`item: ${eI.message}`);
  itemId = (it as { id: string }).id;

  const { data: conta, error: eC } = await servico.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  if (eC) throw new Error(`conta: ${eC.message}`);
  await servico.from("usuarios").insert({
    codigo: "USR-ARB-CH",
    auth_user_id: conta.user.id,
    email: EMAIL,
    nome: "Prova ARB",
    perfil: "encarregado_administracao_academica",
    escopo_curso: "geral",
  });
  sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: eL } = await sessao.auth.signInWithPassword({ email: EMAIL, password: SENHA });
  if (eL) throw new Error(`login: ${eL.message}`);
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

describe("SC-014 · o arbitrado não muda a CH de disciplina nem de UE", () => {
  it("as cinco escritas passam, e o catálogo fica igual", async () => {
    const antes = await catalogo();

    // 1. Definir o tempo no curso.
    const r1 = await sessao
      .from("avaliacoes_curriculo")
      .update({
        ta_aplicacao: 3,
        origem_ta_aplicacao: "arbitrado",
        ta_vista: 1,
        origem_ta_vista: "arbitrado",
      })
      .eq("id", itemId)
      .select("id");
    expect(r1.error, "definir no curso").toBeNull();
    expect(r1.data).toHaveLength(1);

    // 2. Ajustar só a turma, como sugestão da planilha; 3. confirmar a sugestão.
    const r2 = await sessao.from("avaliacoes_curriculo_turma").insert({
      avaliacao_curriculo_id: itemId,
      turma_id: turmaId,
      ta_aplicacao: 4,
      origem: "sugestao_planilha",
    });
    expect(r2.error, "ajustar a turma").toBeNull();
    const r3 = await sessao
      .from("avaliacoes_curriculo_turma")
      .update({ origem: "arbitrado", confirmado_em: new Date().toISOString() })
      .eq("avaliacao_curriculo_id", itemId)
      .eq("turma_id", turmaId)
      .select("id");
    expect(r3.error, "confirmar a sugestão").toBeNull();
    expect(r3.data).toHaveLength(1);

    // 4. Arbitrar a quantidade: um item a mais, de origem arbitrada.
    const r4 = await sessao.from("avaliacoes_curriculo").insert({
      codigo: `ARB-${SELO}-2`,
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      ordem: 2,
      instrumento_id: pmId,
      numero: 2,
      origem_item: "arbitrado",
      ta_aplicacao: 2,
      origem_ta_aplicacao: "arbitrado",
    });
    expect(r4.error, "arbitrar a quantidade").toBeNull();

    // 5. Nomear a UE.
    const r5 = await sessao
      .from("avaliacoes_curriculo")
      .update({
        unidade_ensino_id: ueId,
        origem_ue: "decisao_ciaara",
        ue_decidida_em: "2026-10-14",
      })
      .eq("id", itemId)
      .select("id");
    expect(r5.error, "nomear a UE").toBeNull();
    expect(r5.data).toHaveLength(1);

    expect(await catalogo()).toBe(antes);
  });
});
