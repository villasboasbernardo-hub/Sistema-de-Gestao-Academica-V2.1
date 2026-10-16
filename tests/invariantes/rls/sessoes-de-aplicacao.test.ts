/**
 * Spec 014, emenda de 15/10/2026 (desenho aprovado em 16/10/2026) — quem lança a SESSÃO DE APLICAÇÃO 2..N
 * (`RN-AV-12`) e quem JUNTA uma avaliação como sessão de outra prova (decisão de 16/10/2026: *"juntar como sessão da
 * mesma prova" (Encarregado/Admin, com trilha)*), provado com SESSÃO AUTENTICADA (DoD 4: permissão não mora em pgTAP).
 *
 * ⚠️ O CASO QUE DISCRIMINA (DoD 8) É O OPERADOR: ele tem `avaliacoes.editar` (lança a sessão no DSA — o controle
 *    positivo) e NÃO tem `avaliacoes_juntar_sessao.editar`. Juntar pela função recebe `42501`, e tentar a trilha à mão —
 *    inserir a sessão com `juntada_de_avaliacao_id` direto na tabela — também (gatilho `app.proteger_trilha_da_juntada`).
 *    Antes da E-6 nem a tabela nem a função existiam: a suíte reprova na `main` pela ausência.
 * ⚠️ A recusa é conferida pelo CÓDIGO `42501`, com a linha completa; a leitura recusada volta VAZIA (gotcha 4).
 * ⚠️ Nenhuma conta é `admin` (gotcha 8). Cursos reaproveitados, identificadores gerados (regra 9.1).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testesap";
const SENHA = "senha-de-teste-com-12+";
const SELO = Date.now().toString(36).toUpperCase().slice(-5);

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  operador: { perfil: "operador", escopo: "regular" },
  operadorDeFora: { perfil: "operador", escopo: "expedito" },
  encarregado: { perfil: "encarregado_administracao_academica", escopo: "geral" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const authDe = new Map<Conta, string>();
const email = (c: Conta) => `sap-${c.toLowerCase()}@${DOMINIO}`;

let cursoId = "";
let turmaId = "";
let disciplinaId = "";
let provaId = "";
let provaCodigo = "";
let outraId = "";
let terceiraId = "";

async function criarConta(c: Conta): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(c),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`conta ${c}: ${error.message}`);
  authDe.set(c, data.user.id);
  const { error: e2 } = await servico.from("usuarios").insert({
    codigo: `USR-SAPT-${c.toUpperCase()}`,
    auth_user_id: data.user.id,
    email: email(c),
    nome: `Prova SAP ${c}`,
    perfil: CONTAS[c].perfil,
    escopo_curso: CONTAS[c].escopo,
  });
  if (e2) throw new Error(`cadastro ${c}: ${e2.message}`);
  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: e3 } = await cliente.auth.signInWithPassword({ email: email(c), password: SENHA });
  if (e3) throw new Error(`login ${c}: ${e3.message}`);
  sessoes.set(c, cliente);
}

async function avaliacao(codigo: string, data: string, ta: number): Promise<string> {
  const { data: a, error } = await servico
    .from("avaliacoes")
    .insert({
      codigo,
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      tipo_avaliacao: "Prova SAPT",
      data_avaliacao: data,
      ta_inicial: ta,
      tempos_consumidos: 2,
      status: "pendente",
    })
    .select("id")
    .single();
  if (error) throw new Error(`avaliação ${codigo}: ${error.message}`);
  return (a as { id: string }).id;
}

async function limpar(): Promise<void> {
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`))
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
    }
    if (data.users.length < 200) break;
  }
  await servico.from("usuarios").delete().like("codigo", "USR-SAPT-%");
  const { data: avs } = await servico.from("avaliacoes").select("id").like("codigo", "SAPT-%");
  for (const a of avs ?? []) {
    const id = (a as { id: string }).id;
    await servico.from("vistas_de_avaliacao").delete().eq("avaliacao_id", id);
    await servico.from("sessoes_de_aplicacao").delete().eq("avaliacao_id", id);
  }
  await servico.from("avaliacoes").delete().like("codigo", "SAPT-%");
  await servico.from("disciplinas").delete().like("codigo", "SAPT-DIS-%");
}

beforeAll(async () => {
  await limpar();
  await servico
    .from("config_listas")
    .upsert(
      { lista: "tipos_avaliacao", valor: "Prova SAPT", rotulo_exibicao: "Prova SAPT" },
      { onConflict: "lista,valor", ignoreDuplicates: true },
    );
  const { data: c } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", "SAPT-REG")
    .maybeSingle();
  if (c) cursoId = (c as { id: string }).id;
  else {
    const { data, error } = await servico
      .rpc(
        "criar_curso_com_regime" as never,
        {
          p_curso: {
            codigo: "SAPT-REG",
            nome_curso: "Curso SAPT",
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
        data_inicio: "2026-03-02",
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
      codigo: `SAPT-DIS-${SELO}`,
      curso_id: cursoId,
      cod_disciplina: `SAPT${SELO}`,
      nome_disciplina: "Disciplina SAPT",
      carga_horaria_tempos: 40,
    })
    .select("id")
    .single();
  if (eD) throw new Error(`disciplina: ${eD.message}`);
  disciplinaId = (d as { id: string }).id;
  provaCodigo = `SAPT-${SELO}-P`;
  provaId = await avaliacao(provaCodigo, "2026-06-22", 1);
  outraId = await avaliacao(`SAPT-${SELO}-O`, "2026-07-05", 3);
  terceiraId = await avaliacao(`SAPT-${SELO}-T`, "2026-07-06", 3);
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

/** A linha completa de uma sessão — o negativo manda tudo, para que só a RLS (ou o gatilho) possa recusar. */
const sessaoDe = (numero: number, data: string, extra: Record<string, unknown> = {}) => ({
  avaliacao_id: provaId,
  numero,
  data,
  ta_inicial: 1,
  tempos_consumidos: 2,
  local: "Sala SAPT",
  ...extra,
});

describe("RN-AV-12 · a sessão de aplicação 2..N (RLS pela avaliação-mãe)", () => {
  it("o Operador lança a sessão 2 da prova do seu alcance (controle positivo: é o DSA)", async () => {
    const { error } = await sessao("operador")
      .from("sessoes_de_aplicacao")
      .insert(sessaoDe(2, "2026-06-23"));
    expect(error).toBeNull();
  });

  it("o Operador FORA do alcance recebe 42501 ao lançar, e não lê a sessão (vazio, não erro)", async () => {
    const { error } = await sessao("operadorDeFora")
      .from("sessoes_de_aplicacao")
      .insert(sessaoDe(3, "2026-06-24"));
    expect(error?.code).toBe("42501");
    const { data, error: eL } = await sessao("operadorDeFora")
      .from("sessoes_de_aplicacao")
      .select("id")
      .eq("avaliacao_id", provaId);
    expect(eL).toBeNull();
    expect(data).toEqual([]);
  });

  it("a Visualização lê a sessão e recebe 42501 ao lançar (só leitura)", async () => {
    const { data } = await sessao("visualizacao")
      .from("sessoes_de_aplicacao")
      .select("numero")
      .eq("avaliacao_id", provaId);
    expect(data).toEqual([{ numero: 2 }]);
    const { error } = await sessao("visualizacao")
      .from("sessoes_de_aplicacao")
      .insert(sessaoDe(3, "2026-06-24"));
    expect(error?.code).toBe("42501");
  });

  it("ninguém APAGA sessão (regra 4): o Encarregado recebe 42501 no DELETE, e a linha continua", async () => {
    const { error } = await sessao("encarregado")
      .from("sessoes_de_aplicacao")
      .delete()
      .eq("avaliacao_id", provaId);
    expect(error?.code).toBe("42501");
    const { count } = await servico
      .from("sessoes_de_aplicacao")
      .select("id", { count: "exact", head: true })
      .eq("avaliacao_id", provaId);
    expect(count).toBe(1);
  });
});

describe("juntar como sessão da mesma prova (decisão de 16/10/2026, com trilha)", () => {
  it("DISCRIMINA: o Operador (tem avaliacoes.editar) recebe 42501 ao juntar, e nada muda", async () => {
    const { error } = await sessao("operador").rpc(
      "juntar_como_sessao" as never,
      { p_prova_id: provaId, p_avaliacao_id: outraId } as never,
    );
    expect(error?.code).toBe("42501");
    const { data } = await servico.from("avaliacoes").select("status").eq("id", outraId).single();
    expect((data as { status: string }).status).toBe("pendente");
  });

  it("DISCRIMINA: o Operador não escreve a trilha à mão (sessão com avaliação juntada, direto na tabela) → 42501", async () => {
    const { error } = await sessao("operador")
      .from("sessoes_de_aplicacao")
      .insert(
        sessaoDe(3, "2026-07-06", {
          juntada_de_avaliacao_id: terceiraId,
          juntada_em: new Date().toISOString(),
          avaliacao_juntada_antes: { codigo: "forjado" },
        }),
      );
    expect(error?.code).toBe("42501");
  });

  it("o Encarregado junta (controle positivo): a sessão nasce com a trilha dele, e a juntada fica cancelada com a marca", async () => {
    const { data: id, error } = await sessao("encarregado").rpc(
      "juntar_como_sessao" as never,
      { p_prova_id: provaId, p_avaliacao_id: outraId } as never,
    );
    expect(error).toBeNull();
    const { data: s } = await servico
      .from("sessoes_de_aplicacao")
      .select(
        "numero, data, ta_inicial, juntada_de_avaliacao_id, juntada_por, juntada_em, avaliacao_juntada_antes",
      )
      .eq("id", id as unknown as string)
      .single();
    const sessaoJuntada = s as {
      numero: number;
      data: string;
      ta_inicial: number;
      juntada_de_avaliacao_id: string;
      juntada_por: string;
      juntada_em: string | null;
      avaliacao_juntada_antes: { codigo?: string };
    };
    expect(sessaoJuntada.numero).toBe(3);
    expect(sessaoJuntada.data).toBe("2026-07-05");
    expect(sessaoJuntada.ta_inicial).toBe(3);
    expect(sessaoJuntada.juntada_de_avaliacao_id).toBe(outraId);
    expect(sessaoJuntada.juntada_por).toBe(authDe.get("encarregado"));
    expect(sessaoJuntada.juntada_em).not.toBeNull();
    expect(sessaoJuntada.avaliacao_juntada_antes.codigo).toBe(`SAPT-${SELO}-O`);
    const { data: a } = await servico
      .from("avaliacoes")
      .select("status, observacoes")
      .eq("id", outraId)
      .single();
    const juntada = a as { status: string; observacoes: string };
    expect(juntada.status).toBe("cancelada");
    expect(juntada.observacoes).toContain(`[JUNTADA COMO SESSAO 3 DE ${provaCodigo}]`);
  });

  it("a trilha não muda depois: o Encarregado recebe 42501 ao reescrever quando juntou", async () => {
    const { error } = await sessao("encarregado")
      .from("sessoes_de_aplicacao")
      .update({ juntada_em: "2020-01-01T00:00:00Z" })
      .eq("juntada_de_avaliacao_id", outraId);
    expect(error?.code).toBe("42501");
  });

  it("juntar a mesma avaliação de novo é recusado: ela já não é viva (23514)", async () => {
    const { error } = await sessao("encarregado").rpc(
      "juntar_como_sessao" as never,
      { p_prova_id: provaId, p_avaliacao_id: outraId } as never,
    );
    expect(error?.code).toBe("23514");
  });
});

/*
 * E-7 (`20261016153228`, pedido de Bernardo Villas Boas, 16/10/2026): a 1ª aplicação não passa das sessões. O gatilho
 * é ADIADO — a recusa acontece no COMMIT da requisição —, e o que se prova aqui é que ela chega a quem grava pela
 * interface de dados com o código 23514 e a chave da frase (`aplicacao_depois_das_sessoes`, `traducao-de-recusas.ts`),
 * e não como erro genérico de transação. A prova tem a sessão 2 em 23/06.
 */
describe("E-7 · a 1ª aplicação não passa das sessões (gatilho adiado, pela interface de dados)", () => {
  const dataDaProva = async () =>
    (
      (await servico.from("avaliacoes").select("data_avaliacao").eq("id", provaId).single())
        .data as { data_avaliacao: string }
    ).data_avaliacao;

  it("DISCRIMINA: mover a 1ª aplicação para DEPOIS da sessão 2 é recusado com 23514 e a chave da frase, e a data fica", async () => {
    const { error } = await sessao("encarregado")
      .from("avaliacoes")
      .update({ data_avaliacao: "2026-06-30" })
      .eq("id", provaId);
    expect(error?.code).toBe("23514");
    expect(error?.hint).toBe("aplicacao_depois_das_sessoes");
    expect(await dataDaProva()).toBe("2026-06-22");
  });

  it("controle positivo: o MESMO dia da sessão 2 é aceito", async () => {
    const { error } = await sessao("encarregado")
      .from("avaliacoes")
      .update({ data_avaliacao: "2026-06-23" })
      .eq("id", provaId);
    expect(error).toBeNull();
    expect(await dataDaProva()).toBe("2026-06-23");
    await servico.from("avaliacoes").update({ data_avaliacao: "2026-06-22" }).eq("id", provaId);
  });
});
