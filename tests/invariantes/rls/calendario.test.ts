/**
 * Spec 023 (Bloco 8) — quem pode o quê no calendário, com SESSÃO REAL (DoD 4, SC-003).
 *
 * - `feriados` e `feriado_turma`: grava quem tem `calendario.criar`/`editar` (Admin e Encarregado); o Operador é recusado
 *   pelo banco — `42501` no insert (linha COMPLETA, para a recusa não ser de coluna obrigatória) e 0 linhas no update
 *   (a RLS nega em silêncio, gotcha 4), com o banco conferido.
 * - A leitura é ampla: a grade e o saldo de toda turma dependem dela.
 * - Ninguém apaga: `authenticated` não tem DELETE, e a linha continua no banco.
 *
 * ⚠️ Regra 9.1: curso não se apaga — reaproveitado. Contas, linhas do calendário e a turma saem no começo e no fim.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb8";
const SENHA = "senha-de-teste-com-12+";
const SIGLA = "B8-CUR";
const PREFIXO = "Prova B8";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  encarregado: "encarregado_administracao_academica",
  operador: "operador",
  visualizacao: "visualizacao",
} as const;
type Conta = keyof typeof CONTAS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b8-${c}@${DOMINIO}`;
let CURSO_ID = "";
let TURMA_ID = "";
let TIPO_LA = "";

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limpar(): Promise<void> {
  const { data: feriados } = await servico
    .from("feriados")
    .select("id")
    .like("descricao", `${PREFIXO}%`);
  const ids = (feriados ?? []).map((f) => f.id as string);
  if (ids.length > 0) {
    // ⚠️ Pela chave de serviço: pela sessão não sairia (não há DELETE para `authenticated` — um caso abaixo prova).
    await servico.from("feriado_turma").delete().in("feriado_id", ids);
    await servico.from("feriados").delete().in("id", ids);
  }
  if (CURSO_ID) await servico.from("turmas").delete().eq("curso_id", CURSO_ID);
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-B8-%")).error);
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`))
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
    }
    if (data.users.length < 200) break;
  }
}

async function criarConta(c: Conta): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(c),
    password: SENHA,
    email_confirm: true,
  });
  conferir(`conta ${c}`, error);
  conferir(
    `cadastro ${c}`,
    (
      await servico.from("usuarios").insert({
        codigo: `USR-B8-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova B8 ${c}`,
        perfil: CONTAS[c],
        escopo_curso: "geral",
      })
    ).error,
  );
  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  conferir(
    `login ${c}`,
    (await cliente.auth.signInWithPassword({ email: email(c), password: SENHA })).error,
  );
  sessoes.set(c, cliente);
}

beforeAll(async () => {
  const { data: existe } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) CURSO_ID = (existe as { id: string }).id;
  else {
    const { data, error } = await servico.rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: SIGLA,
          nome_curso: "Curso do Bloco 8",
          classificacao: "especial",
          modalidade: "presencial",
          duracao_dias: 100,
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
      } as never,
    );
    conferir("curso", error);
    CURSO_ID = (data as unknown as { id: string }).id;
  }
  await limpar();
  const { data: turma, error: erroTurma } = await servico
    .from("turmas")
    .insert({
      curso_id: CURSO_ID,
      turma: "T1",
      ano_letivo: 2046,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: "2046-03-02",
      data_termino: "2046-06-30",
    } as never)
    .select("id")
    .single();
  conferir("turma", erroTurma);
  TURMA_ID = (turma as { id: string }).id;
  const { data: tipo } = await servico
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_parada")
    .eq("valor", "LA")
    .single();
  TIPO_LA = (tipo as { id: string }).id;
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(limpar);

const linhaCompleta = (nome: string) => ({
  id: crypto.randomUUID(),
  ano: 2046,
  data: "2046-04-15",
  descricao: `${PREFIXO} ${nome}`,
  impacto: "dia_inteiro",
  tipo_parada_id: TIPO_LA,
});

async function feriadoDoServico(nome: string): Promise<string> {
  const linha = linhaCompleta(nome);
  conferir("feriado", (await servico.from("feriados").insert(linha as never)).error);
  return linha.id;
}

describe("SC-003 · o calendário é de quem tem permissão de calendário", () => {
  it("o Operador NÃO cadastra linha no calendário (42501, linha completa)", async () => {
    const { error } = await sessao("operador")
      .from("feriados")
      .insert(linhaCompleta("operador") as never);
    expect(error?.code).toBe("42501");
  });

  it("controle positivo: o Encarregado cadastra, com o tipo", async () => {
    const linha = linhaCompleta("encarregado");
    const { error } = await sessao("encarregado")
      .from("feriados")
      .insert(linha as never);
    expect(error).toBeNull();
    const { data } = await servico
      .from("feriados")
      .select("tipo_parada_id, codigo")
      .eq("id", linha.id)
      .single();
    expect((data as { tipo_parada_id: string }).tipo_parada_id).toBe(TIPO_LA);
    expect((data as { codigo: string }).codigo).toMatch(/^FER-\d{6}$/);
  });

  it("o Operador NÃO escolhe turma para uma linha (42501, linha completa)", async () => {
    const feriadoId = await feriadoDoServico("turma do operador");
    const { error } = await sessao("operador")
      .from("feriado_turma")
      .insert({ feriado_id: feriadoId, turma_id: TURMA_ID } as never);
    expect(error?.code).toBe("42501");
    const { count } = await servico
      .from("feriado_turma")
      .select("id", { count: "exact", head: true })
      .eq("feriado_id", feriadoId);
    expect(count).toBe(0);
  });

  it("o caso que discrimina: o Encarregado escolhe a turma, e a Visualização LÊ a ligação", async () => {
    const feriadoId = await feriadoDoServico("turma do encarregado");
    const { error } = await sessao("encarregado")
      .from("feriado_turma")
      .insert({ feriado_id: feriadoId, turma_id: TURMA_ID } as never);
    expect(error).toBeNull();
    const { data } = await sessao("visualizacao")
      .from("feriado_turma")
      .select("turma_id, status")
      .eq("feriado_id", feriadoId);
    expect(data).toEqual([{ turma_id: TURMA_ID, status: "ativo" }]);
  });

  it("o Operador NÃO inativa a linha: 0 linhas, e o banco continua ativo (gotcha 4)", async () => {
    const feriadoId = await feriadoDoServico("inativar pelo operador");
    const { data, error } = await sessao("operador")
      .from("feriados")
      .update({ status: "inativo" } as never)
      .eq("id", feriadoId)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    const { data: noBanco } = await servico
      .from("feriados")
      .select("status")
      .eq("id", feriadoId)
      .single();
    expect((noBanco as { status: string }).status).toBe("ativo");
  });

  it("controle positivo: o Encarregado inativa, e a linha fica (nada é apagado)", async () => {
    const feriadoId = await feriadoDoServico("inativar pelo encarregado");
    const { data } = await sessao("encarregado")
      .from("feriados")
      .update({ status: "inativo" } as never)
      .eq("id", feriadoId)
      .select("id");
    expect(data).toHaveLength(1);
    const { data: noBanco } = await servico
      .from("feriados")
      .select("status")
      .eq("id", feriadoId)
      .single();
    expect((noBanco as { status: string }).status).toBe("inativo");
  });

  it("regra 4: nem o Encarregado apaga a ligação — ela continua no banco", async () => {
    const feriadoId = await feriadoDoServico("apagar ligacao");
    conferir(
      "ligação",
      (
        await servico
          .from("feriado_turma")
          .insert({ feriado_id: feriadoId, turma_id: TURMA_ID } as never)
      ).error,
    );
    const { error } = await sessao("encarregado")
      .from("feriado_turma")
      .delete()
      .eq("feriado_id", feriadoId);
    expect(error?.code).toBe("42501");
    const { count } = await servico
      .from("feriado_turma")
      .select("id", { count: "exact", head: true })
      .eq("feriado_id", feriadoId);
    expect(count).toBe(1);
  });
});
