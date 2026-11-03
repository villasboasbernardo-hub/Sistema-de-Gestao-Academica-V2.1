/**
 * Spec 022 (Bloco 7), FR-004 — **a leitura da página Avisos funciona contra o banco, com sessão de verdade**.
 *
 * ⚠️ **POR QUE ESTE TESTE EXISTE:** `lerAvisos` faz dezessete leituras numa rodada, e cada falha vira "não pude ler" —
 *    que é a degradação certa na tela, mas esconde um nome de relação ou de coluna errado: a página abriria dizendo
 *    *"não pude ler"* para sempre, sem erro em lugar nenhum. Aqui a leitura roda pela sessão de um Admin (a RLS
 *    aplicada, como na tela) e tem de ler TODOS os módulos.
 * ⚠️ **COM CONTROLE POSITIVO**: um instrutor sem NIP semeado aqui tem de aparecer, com a chave e o link certos —
 *    leitura que não acha nada passaria igual se estivesse cega.
 * ⚠️ **E O DAS ATIVIDADES** (Bloco 18, spec 033, RA-8, FR-009.1): uma AEC obrigatória do currículo, sem cumprimento,
 *    numa turma ativa que termina daqui a 2 dias úteis, tem de virar aviso no módulo Atividades, na aba Palestras da
 *    turma. ⚠️ **COM O CASO QUE DISCRIMINA**: a mesma AEC obrigatória na turma que termina daqui a 30 dias úteis (mais
 *    de 4 semanas) NÃO avisa, e a facultativa na turma apertada também não — sem os dois, um aviso que saísse para toda
 *    AEC prevista passaria igual. A turma é a do panorama do processo 0 dos percursos (`semearPanorama`), que é
 *    idempotente e reaproveita o curso (curso não se apaga, regra 9.1): rodar aqui não cria curso novo nenhum.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { lerAvisos } from "@/app/(app)/avisos/leitura";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaAbaDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "../e2e/panorama-de-teste";

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

/*
 * ⚠️ O PANORAMA DO PROCESSO 0 É O MESMO dos percursos de ponta a ponta (`inicio`, `andamento`…), e por isso esta suíte e
 *    a de ponta a ponta NÃO rodam juntas — o CI as roda em sequência (`test:rls` antes de `test:e2e`). As AEC previstas
 *    levam a marca do processo deste teste no nome e saem no fim.
 */
const MARCA_DA_AEC = `AEC da sonda dos avisos ${process.pid}`;

describe("RA-8 (Bloco 18) · a AEC obrigatória não cumprida perto do fim vira aviso de Atividades", () => {
  let panorama: PanoramaSemeado | undefined;
  /** Os códigos `AEP-` gerados pelo banco: a obrigatória da turma apertada, a da folgada e a facultativa. */
  const codigos = { apertada: "", folgada: "", facultativa: "" };

  async function limparAec(): Promise<void> {
    const { error } = await admin
      .from("aec_previstas_curriculo")
      .delete()
      .like("nome", `${MARCA_DA_AEC}%`);
    if (error) throw new Error(`não consegui limpar as AEC previstas da sonda: ${error.message}`);
  }

  beforeAll(async () => {
    await limparAec();
    panorama = await semearPanorama(0);
    const { data: turmas, error: erroTurmas } = await admin
      .from("turmas")
      .select("id, codigo, curso_id, curriculo_id")
      .in("codigo", [panorama.turmaSemCapacidade, panorama.turmaEmExcesso]);
    if (erroTurmas)
      throw new Error(`não consegui ler as turmas do panorama: ${erroTurmas.message}`);
    const turma = (codigo: string) => {
      const t = (turmas ?? []).find((x) => x.codigo === codigo);
      if (!t?.curriculo_id)
        throw new Error(`a turma ${codigo} do panorama não tem currículo — a sonda ficaria cega`);
      return t as { id: string; codigo: string; curso_id: string; curriculo_id: string };
    };
    const apertada = turma(panorama.turmaSemCapacidade);
    const folgada = turma(panorama.turmaEmExcesso);

    const { data: tipo, error: erroTipo } = await admin
      .from("config_listas")
      .select("id")
      .eq("lista", "tipos_atividade")
      .eq("valor", "Palestra")
      .single();
    if (erroTipo || !tipo)
      throw new Error(`não achei o tipo Palestra: ${erroTipo?.message ?? "ausente"}`);

    /* Sem sessão (a `service_role`), a RC-6 do currículo em uso passa sem trilha — é o caminho da carga. */
    const linhas = [
      { chave: "apertada", alvo: apertada, obrigatoria: true },
      { chave: "folgada", alvo: folgada, obrigatoria: true },
      { chave: "facultativa", alvo: apertada, obrigatoria: false },
    ] as const;
    for (const [ordem, l] of linhas.entries()) {
      const id = crypto.randomUUID();
      const { error } = await admin.from("aec_previstas_curriculo").insert({
        id,
        curso_id: l.alvo.curso_id,
        curriculo_id: l.alvo.curriculo_id,
        nome: `${MARCA_DA_AEC} ${l.chave}`,
        tipo_atividade_id: tipo.id,
        ta_previstos: 2,
        obrigatoria: l.obrigatoria,
        ordem: 900 + ordem,
      });
      if (error) throw new Error(`não consegui semear a AEC prevista ${l.chave}: ${error.message}`);
      const { data: lida, error: erroLida } = await admin
        .from("aec_previstas_curriculo")
        .select("codigo")
        .eq("id", id)
        .single();
      if (erroLida || !lida)
        throw new Error(`não consegui ler o código da AEC prevista ${l.chave}`);
      codigos[l.chave] = lida.codigo as string;
    }
  }, 120_000);

  afterAll(async () => {
    await limparAec();
    await limparPanorama(panorama);
  }, 60_000);

  it("a obrigatória da turma que termina em 2 dias úteis avisa, com a turma E o código na chave, na aba Palestras", async () => {
    const { avisos, naoLidos } = await lerAvisos(sessao as never, hojeNaCiaara());
    expect(naoLidos).toEqual([]);
    const turma = panorama!.turmaSemCapacidade;
    const aviso = avisos.find(
      (a) => a.chave === `atividades:aec_obrigatoria_pendente:${turma}:${codigos.apertada}`,
    );
    expect(aviso?.modulo).toBe("atividades");
    expect(aviso?.destino).toBe(enderecoDaAbaDaTurma(turma, "palestras"));
    expect(aviso?.titulo).toBe(`${turma}: AEC obrigatória não cumprida`);
  }, 60_000);

  it("⚠️ o caso que discrimina: a turma a mais de 4 semanas do fim e a AEC facultativa NÃO avisam", async () => {
    const { avisos } = await lerAvisos(sessao as never, hojeNaCiaara());
    const daSonda = avisos.filter(
      (a) =>
        a.modulo === "atividades" &&
        (a.chave.endsWith(`:${codigos.folgada}`) || a.chave.endsWith(`:${codigos.facultativa}`)),
    );
    expect(daSonda).toEqual([]);
  }, 60_000);
});
