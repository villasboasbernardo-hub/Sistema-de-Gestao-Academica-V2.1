/**
 * Spec 014, R-8 (T139) — **a função SQL é espelho da função TS, e a mesma tabela de casos prova as duas**.
 *
 * `situacaoDaAvaliacao` (lib/dominio/avaliacoes/situacao.ts) DECIDE; `app.fn_status_vista` repete a decisão para a
 * view e para o pgTAP. Duas implementações da mesma regra exigem o teste cruzado (Princípio VI): para cada caso de
 * prova e trabalho de `tests/unidade/dados/situacao-da-avaliacao.json` que tem avaliação lançada, a amostra grava a
 * avaliação no banco local e chama `public.situacao_da_avaliacao(id, hoje)` com SESSÃO autenticada.
 *
 * ⚠️ OS CASOS SEM APLICAÇÃO E A OD FICAM DE FORA DE PROPÓSITO: o SQL só fala de avaliação que existe (o «sem
 *    correspondência» de item sem lançamento e a OD vivem só na TS — data-model §3.7).
 * ⚠️ «Sem item de vista no currículo» se prova ligando a avaliação a um item com `ta_vista` nulo; sem item ligado
 *    (o histórico), a vista é exigida.
 * ⚠️ A sessão é de ENCARREGADO, não de Admin (gotcha 8). Identificadores gerados; a amostra se apaga no fim.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import tabela from "@/tests/unidade/dados/situacao-da-avaliacao.json";
import { situacaoDaAvaliacao, type NaturezaDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";

import { chaveLocal } from "./rls/chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const EMAIL = "situacao-cruzada@ciaara.testesit";
const SENHA = "senha-de-teste-com-12+";

let sessao: SupabaseClient;
let cursoId = "";
let turmaId = "";
let disciplinaId = "";
let itemSemVistaId = "";

async function limpar(): Promise<void> {
  const { data } = await servico.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email === EMAIL) await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
  }
  await servico.from("usuarios").delete().eq("codigo", "USR-SIT-CRUZ");
  const { data: avs } = await servico.from("avaliacoes").select("id").like("codigo", "SIT-%");
  for (const a of avs ?? []) {
    await servico
      .from("vistas_de_avaliacao")
      .delete()
      .eq("avaliacao_id", (a as { id: string }).id);
  }
  await servico.from("avaliacoes").delete().like("codigo", "SIT-%");
  await servico.from("avaliacoes_curriculo").delete().eq("fonte_arquivo", "sit-cruzada.pdf");
  await servico.from("disciplinas").delete().like("codigo", "SIT-DIS-%");
  await servico.from("config_listas").delete().eq("observacao", "semeado pela prova cruzada SIT");
}

beforeAll(async () => {
  await limpar();
  // A lista nasce VAZIA no db:reset e é povoada pela carga: a amostra semeia o que usa.
  await servico.from("config_listas").upsert(
    {
      lista: "tipos_avaliacao",
      valor: "Prova SIT",
      rotulo_exibicao: "Prova SIT",
      observacao: "semeado pela prova cruzada SIT",
    },
    { onConflict: "lista,valor", ignoreDuplicates: true },
  );
  const { data: c } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", "Z-SIT-CRUZ")
    .maybeSingle();
  if (c) cursoId = (c as { id: string }).id;
  else {
    const { data, error } = await servico
      .rpc(
        "criar_curso_com_regime" as never,
        {
          p_curso: {
            codigo: "Z-SIT-CRUZ",
            nome_curso: "Curso SIT",
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
      )
      .single();
    if (error) throw new Error(`curso: ${error.message}`);
    cursoId = (data as { id: string }).id;
  }
  const { data: d, error: eD } = await servico
    .from("disciplinas")
    .insert({
      codigo: `SIT-DIS-${SELO}`,
      curso_id: cursoId,
      cod_disciplina: `SIT${SELO}`,
      nome_disciplina: "Disciplina SIT",
      carga_horaria_tempos: 40,
    })
    .select("id")
    .single();
  if (eD) throw new Error(`disciplina: ${eD.message}`);
  disciplinaId = (d as { id: string }).id;
  // ⚠️ A turma é REAPROVEITADA (regra 9.1): o código é gerado pelo gatilho e a limpeza não a apaga.
  const { data: existente } = await servico
    .from("turmas")
    .select("id")
    .eq("curso_id", cursoId)
    .maybeSingle();
  if (existente) turmaId = (existente as { id: string }).id;
  else {
    const { data: t, error: eT } = await servico
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
    if (eT) throw new Error(`turma: ${eT.message}`);
    turmaId = (t as { id: string }).id;
  }
  const { data: pm } = await servico
    .from("config_listas")
    .select("id")
    .eq("lista", "instrumentos_avaliacao")
    .eq("valor", "PM")
    .single();
  const { data: it, error: eI } = await servico
    .from("avaliacoes_curriculo")
    .insert({
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      ordem: 1,
      instrumento_id: (pm as { id: string }).id,
      numero: 1,
      origem_item: "curriculo",
      fonte_arquivo: "sit-cruzada.pdf",
      fonte_pagina: 1,
      ta_aplicacao: 2,
      origem_ta_aplicacao: "curriculo",
    })
    .select("id")
    .single();
  if (eI) throw new Error(`item: ${eI.message}`);
  itemSemVistaId = (it as { id: string }).id;
  const { data: u, error: eU } = await servico.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  if (eU) throw new Error(`conta: ${eU.message}`);
  await servico.from("usuarios").insert({
    codigo: "USR-SIT-CRUZ",
    auth_user_id: u.user.id,
    email: EMAIL,
    nome: "Prova SIT",
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

const casos = tabela.casos.filter((c) => c.aplicacao !== null && c.natureza !== "od");

describe("R-8 · app.fn_status_vista dá o MESMO veredito de situacaoDaAvaliacao", () => {
  it.each(casos.map((c, n) => [n, c.nome, c] as const))("caso %i — %s", async (n, _nome, caso) => {
    const codigo = `SIT-${SELO}-${n}`;
    const { data: a, error } = await servico
      .from("avaliacoes")
      .insert({
        codigo,
        turma_id: turmaId,
        disciplina_id: disciplinaId,
        curso_id: cursoId,
        tipo_avaliacao: "Prova SIT",
        data_avaliacao: caso.aplicacao,
        ta_inicial: 1,
        tempos_consumidos: 2,
        status: "estadoDoRegistro" in caso ? caso.estadoDoRegistro : "pendente",
        avaliacao_curriculo_id: caso.temItemDeVista ? null : itemSemVistaId,
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(`avaliação ${codigo}: ${error.message}`);
    }
    const id = (a as { id: string }).id;
    for (const [s, data] of caso.sessoesDeVista.entries()) {
      await servico
        .from("vistas_de_avaliacao")
        .insert({ avaliacao_id: id, numero: s + 1, data, ta_inicial: 3, tempos_consumidos: 1 });
    }
    const { data: sql, error: eS } = await sessao.rpc(
      "situacao_da_avaliacao" as never,
      { p_avaliacao_id: id, p_hoje: caso.hoje } as never,
    );
    expect(eS).toBeNull();
    const ts = situacaoDaAvaliacao({
      natureza: caso.natureza as NaturezaDaAvaliacao,
      estadoDoRegistro: "estadoDoRegistro" in caso ? (caso.estadoDoRegistro as string) : null,
      aplicacao: caso.aplicacao,
      sessoesDeVista: caso.sessoesDeVista,
      temItemDeVista: caso.temItemDeVista,
      prazoDias: tabela.prazoDias,
      hoje: caso.hoje,
      terminoDaTurma: caso.terminoDaTurma,
    });
    expect(sql).toBe(ts);
    expect(ts).toBe(caso.esperado);
  });
});
