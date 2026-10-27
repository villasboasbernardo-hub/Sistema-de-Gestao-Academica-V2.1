/**
 * Suíte de RLS do *Excluir* do Calendário — exclusão LÓGICA, só do Admin (spec `027`, Bloco 12, D-COR-7, FR-004).
 *
 * **A regra é a mesma de sempre**: prova-se o que cada perfil **NÃO** pode, com **JWT de verdade**, e a recusa é
 * conferida pelo **código** (`42501` do porteiro e do gatilho, `55000` da linha excluída, `P0002` da inexistente) e
 * pelo **valor no banco** depois — nunca por `error not null` (DoD 4 do `CLAUDE.md`). É a prova da *"chamada direta à
 * ação"*: a Server Action `excluirLinhaDoCalendario` só chama `excluir_linha_do_calendario` com a sessão de quem clica.
 *
 * ⚠️ **OS CASOS QUE DISCRIMINAM** (DoD 8):
 *    · o **Encarregado** tem `calendario.editar`: o mesmo `UPDATE` que marca a exclusão é recusado pelo gatilho, e o
 *      `UPDATE` que só desativa a MESMA linha passa (controle positivo) — a recusa é da coluna nova, não da permissão;
 *    · o **Admin** exclui, e a linha excluída não se altera mais nem para ele.
 *
 * ⚠️ **DOMÍNIO E CÓDIGOS PRÓPRIOS** (`@ciaara.teste12`, `USR-B12-`). A conta Admin daqui nasce e sai com o arquivo
 *    (como em `bloco-2.test.ts`; os arquivos rodam em série — gotcha 8). ⚠️ O rastro em `exclusoes_registradas` é
 *    imutável inclusive para a `service_role`: cada exclusão desta suíte deixa uma linha nele, com o código da linha
 *    (sequência), que nenhuma outra suíte conta.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");
const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR e conferir o cenário. Nunca para a ação testada. */
const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Perfil =
  "admin" | "encarregado_administracao_academica" | "ajudante_administracao_academica" | "operador";

const sessoes = new Map<Perfil, SupabaseClient>();
const idDoAuth = new Map<Perfil, string>();
const email = (p: Perfil) => `b12-${p}@ciaara.teste12`;
const cliente = (p: Perfil): SupabaseClient => {
  const c = sessoes.get(p);
  if (!c) throw new Error(`sessao ausente para ${p}`);
  return c;
};

const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const feriado = { id: "", codigo: "" };
const outro = { id: "", codigo: "" };

async function criarUsuario(perfil: Perfil, escopo: string): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(perfil),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email(perfil)}: ${error.message}`);
  idDoAuth.set(perfil, data.user.id);
  const { error: erroUsuario } = await servico.from("usuarios").insert({
    codigo: `USR-B12-${perfil}`,
    auth_user_id: data.user.id,
    email: email(perfil),
    nome: `Teste B12 ${perfil}`,
    perfil,
    escopo_curso: escopo,
  });
  if (erroUsuario) throw new Error(`falha ao cadastrar usuario ${perfil}: ${erroUsuario.message}`);
  const sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroLogin } = await sessao.auth.signInWithPassword({
    email: email(perfil),
    password: SENHA,
  });
  if (erroLogin) throw new Error(`falha ao autenticar ${perfil}: ${erroLogin.message}`);
  sessoes.set(perfil, sessao);
}

/** Deixa a base no estado inicial. Roda ANTES e DEPOIS. */
async function limpar(): Promise<void> {
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith("@ciaara.teste12")) {
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
    if (data.users.length < 200) break;
  }
  await servico.from("usuarios").delete().like("codigo", "USR-B12-%");
  const { data: feriados } = await servico.from("feriados").select("id").like("descricao", "B12 %");
  for (const f of feriados ?? []) {
    await servico.from("feriado_turma").delete().eq("feriado_id", f.id);
    await servico.from("feriados").delete().eq("id", f.id);
  }
}

async function noBanco(id: string) {
  const { data, error } = await servico
    .from("feriados")
    .select("status, excluido_em, excluido_por")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as { status: string; excluido_em: string | null; excluido_por: string | null };
}

beforeAll(async () => {
  await limpar();
  await criarUsuario("admin", "geral");
  await criarUsuario("encarregado_administracao_academica", "geral");
  await criarUsuario("ajudante_administracao_academica", "geral");
  await criarUsuario("operador", "regular");

  /* 2047: longe do dado real, e sem turma — o impacto vem vazio, o que não muda nada para a permissão. */
  const { data, error } = await servico
    .from("feriados")
    .insert([
      { ano: 2047, data: "2047-08-14", descricao: `B12 a excluir ${SELO}`, impacto: "dia_inteiro" },
      { ano: 2047, data: "2047-08-15", descricao: `B12 outra ${SELO}`, impacto: "dia_inteiro" },
    ])
    .select("id, codigo, descricao");
  if (error) throw new Error(error.message);
  const linhas = data as { id: string; codigo: string; descricao: string }[];
  Object.assign(
    feriado,
    linhas.find((l) => l.descricao.startsWith("B12 a excluir"))!,
  );
  Object.assign(
    outro,
    linhas.find((l) => l.descricao.startsWith("B12 outra"))!,
  );
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

describe("D-COR-7 · quem NÃO exclui do calendário", () => {
  it.each([
    "encarregado_administracao_academica",
    "ajudante_administracao_academica",
    "operador",
  ] as const)("%s: a função de excluir recusa com 42501, e a linha não muda", async (perfil) => {
    const { error } = await cliente(perfil).rpc("excluir_linha_do_calendario", {
      p_feriado_id: feriado.id,
    });
    expect(error?.code).toBe("42501");
    expect(await noBanco(feriado.id)).toEqual({
      status: "ativo",
      excluido_em: null,
      excluido_por: null,
    });
  });

  it("o Encarregado não lê o impacto (42501): o alerta é de quem exclui", async () => {
    const { error } = await cliente("encarregado_administracao_academica").rpc(
      "impacto_da_exclusao_do_feriado",
      { p_feriado_id: feriado.id },
    );
    expect(error?.code).toBe("42501");
  });

  it("DISCRIMINA: o Encarregado não marca a exclusão por UPDATE direto (gatilho, 42501) — e desativa a mesma linha", async () => {
    const enc = cliente("encarregado_administracao_academica");
    const { error } = await enc
      .from("feriados")
      .update({
        status: "inativo",
        excluido_em: new Date().toISOString(),
        excluido_por: idDoAuth.get("encarregado_administracao_academica"),
      })
      .eq("id", outro.id);
    expect(error?.code).toBe("42501");
    expect(await noBanco(outro.id)).toEqual({
      status: "ativo",
      excluido_em: null,
      excluido_por: null,
    });

    /* Controle positivo: a permissão de editar existe — só a coluna da exclusão é do Admin. */
    const { data, error: erroDesativar } = await enc
      .from("feriados")
      .update({ status: "inativo" })
      .eq("id", outro.id)
      .select("status");
    expect(erroDesativar).toBeNull();
    expect(data).toEqual([{ status: "inativo" }]);
  });
});

describe("D-COR-7 · o Admin exclui, e a excluída congela", () => {
  it("o Admin lê o impacto", async () => {
    const { data, error } = await cliente("admin").rpc("impacto_da_exclusao_do_feriado", {
      p_feriado_id: feriado.id,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ data: "2047-08-14", situacao: "ativo", turmas: [] });
  });

  it("o Admin exclui: a linha fica inativa e excluída, com quem e quando, e continua no banco", async () => {
    const { error } = await cliente("admin").rpc("excluir_linha_do_calendario", {
      p_feriado_id: feriado.id,
    });
    expect(error).toBeNull();
    const linha = await noBanco(feriado.id);
    expect(linha.status).toBe("inativo");
    expect(linha.excluido_em).not.toBeNull();
    expect(linha.excluido_por).toBe(idDoAuth.get("admin"));

    const { count } = await servico
      .from("exclusoes_registradas")
      .select("id", { count: "exact", head: true })
      .eq("tabela", "feriados")
      .eq("registro_id", feriado.id)
      .eq("excluido_por", idDoAuth.get("admin")!);
    expect(count).toBe(1);
  });

  it("a linha excluída não se altera mais, nem para o Admin (55000)", async () => {
    const { error } = await cliente("admin")
      .from("feriados")
      .update({ status: "ativo" })
      .eq("id", feriado.id);
    expect(error?.code).toBe("55000");
    expect((await noBanco(feriado.id)).status).toBe("inativo");
  });

  it("excluir de novo: a linha não existe mais para a tela (P0002)", async () => {
    const { error } = await cliente("admin").rpc("excluir_linha_do_calendario", {
      p_feriado_id: feriado.id,
    });
    expect(error?.code).toBe("P0002");
  });

  it("nada é apagado: a linha excluída continua no banco", async () => {
    const { count } = await servico
      .from("feriados")
      .select("id", { count: "exact", head: true })
      .eq("id", feriado.id);
    expect(count).toBe(1);
  });
});
