/**
 * Spec 022 (Bloco 7), FR-004 — **a leitura da página Avisos funciona contra o banco, com sessão de verdade**.
 *
 * ⚠️ **POR QUE ESTE TESTE EXISTE:** `lerAvisos` faz dezessete leituras numa rodada, e cada falha vira "não pude ler" —
 *    que é a degradação certa na tela, mas esconde um nome de relação ou de coluna errado: a página abriria dizendo
 *    *"não pude ler"* para sempre, sem erro em lugar nenhum. Aqui a leitura roda pela sessão de um Admin (a RLS
 *    aplicada, como na tela) e tem de ler TODOS os módulos.
 * ⚠️ **COM CONTROLE POSITIVO**: um instrutor sem NIP semeado aqui tem de aparecer, com a chave e o link certos —
 *    leitura que não acha nada passaria igual se estivesse cega.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { lerAvisos } from "@/app/(app)/avisos/leitura";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CODIGO = `AVI-SONDA-${process.pid}`;
let EMAIL = "";
let sessao: SupabaseClient;

beforeAll(async () => {
  EMAIL = emailDeTeste("leitura-dos-avisos", process.pid);
  await criarConta(EMAIL, `USR-AVI-SONDA-${process.pid}`);
  sessao = await sessaoDe(EMAIL);
  await admin.from("instrutores").delete().eq("codigo", CODIGO);
  const { error } = await admin.from("instrutores").insert({
    codigo: CODIGO,
    posto_graduacao: "CT",
    esp_hab_obs: "-",
    nome_completo: `Sonda dos Avisos ${process.pid}`,
    categoria: "Militar",
    om: "OM-SONDA-AVISOS",
    status: "ativo",
    capacitacoes_didaticas: [],
  });
  if (error) throw new Error(`não consegui semear o instrutor da sonda: ${error.message}`);
}, 60_000);

afterAll(async () => {
  await admin.from("instrutores").delete().eq("codigo", CODIGO);
  await apagarConta(EMAIL);
});

describe("FR-004 · a página Avisos lê todos os módulos, pela sessão", () => {
  it("nenhum módulo fica em «não pude ler»", async () => {
    const { naoLidos } = await lerAvisos(sessao as never, hojeNaCiaara());
    expect(naoLidos).toEqual([]);
  }, 60_000);

  it("controle positivo: o instrutor sem NIP semeado aqui aparece, com a chave e o link da ficha", async () => {
    const { avisos } = await lerAvisos(sessao as never, hojeNaCiaara());
    const aviso = avisos.find((a) => a.chave === `instrutores:sem-nip:${CODIGO}`);
    expect(aviso?.modulo).toBe("instrutores");
    expect(aviso?.destino).toBe(`/instrutores/${CODIGO}`);
    expect(aviso?.titulo).toContain("Instrutor sem NIP");
  }, 60_000);
});
