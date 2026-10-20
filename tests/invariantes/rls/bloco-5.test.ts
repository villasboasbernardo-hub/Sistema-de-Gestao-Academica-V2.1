/**
 * Spec 020 (Bloco 5) — quem pode o quê nos cadastros novos, com SESSÃO REAL (DoD 4).
 *
 * - Estrangeiros e custo: grava quem edita curso (`cursos.editar`); quem só lê é recusado em silêncio (0 linhas).
 * - Currículo em PDF (balde `curriculos`): carrega quem edita curso; baixa quem lê; nome, tipo e tamanho conferidos no
 *   motor (`403`, `415`, `413` — a recusa do Storage é HTTP, gotcha 11); sem `DELETE` (`remove()` devolve lista vazia).
 * - Capacitação em lista: grava quem edita instrutor; valor fora da lista é recusado pelo tipo.
 * - Acessos: cada conta grava o próprio pela função; ninguém grava direto; só o Admin lê.
 *
 * ⚠️ Regra 9.1: curso não se apaga — reaproveitado. Contas, instrutor e arquivos saem no começo e no fim.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb5";
const SENHA = "senha-de-teste-com-12+";
const BALDE = "curriculos";
const SIGLA = "B5-CUR";
const INSTRUTOR = "B5-INS";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: "admin",
  encarregado: "encarregado_administracao_academica",
  chefe: "chefe_departamento_ensino",
  visualizacao: "visualizacao",
} as const;
type Conta = keyof typeof CONTAS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b5-${c}@${DOMINIO}`;
const statusDe = (erro: unknown) => (erro as { statusCode?: string } | null)?.statusCode;
let CURSO_ID = "";
const usuarioDe = new Map<Conta, string>();

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "latin1");
const arquivo = () => `${CURSO_ID}/curriculo.pdf`;

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limpar(): Promise<void> {
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-B5-%")).error);
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`))
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
    }
    if (data.users.length < 200) break;
  }
  await servico.from("instrutores").delete().eq("codigo", INSTRUTOR);
  if (CURSO_ID) {
    // ⚠️ Pela chave de serviço: pela sessão não sairia (não há policy de DELETE — é o que um caso abaixo prova).
    await servico.storage.from(BALDE).remove([arquivo()]);
  }
}

async function criarConta(c: Conta): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(c),
    password: SENHA,
    email_confirm: true,
  });
  conferir(`conta ${c}`, error);
  const { data: linha, error: erroCadastro } = await servico
    .from("usuarios")
    .insert({
      codigo: `USR-B5-${c.toUpperCase()}`,
      auth_user_id: data.user!.id,
      email: email(c),
      nome: `Prova B5 ${c}`,
      perfil: CONTAS[c],
      escopo_curso: "geral",
    })
    .select("id")
    .single();
  conferir(`cadastro ${c}`, erroCadastro);
  usuarioDe.set(c, (linha as { id: string }).id);
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
          nome_curso: "Curso do Bloco 5",
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
  conferir(
    "instrutor",
    (
      await servico.from("instrutores").insert({
        codigo: INSTRUTOR,
        posto_graduacao: "CT",
        esp_hab_obs: "-EF",
        nome_completo: "Instrutor do Bloco 5",
        categoria: "Militar",
        om: "CIAARA",
      })
    ).error,
  );
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(limpar);

async function cursoNoBanco() {
  const { data } = await servico
    .from("cursos")
    .select("ofertavel_estrangeiros, estrangeiros_observacao, custo_total, custo_composicao")
    .eq("id", CURSO_ID)
    .single();
  return data as Record<string, unknown>;
}

describe("FR-001/FR-002 · estrangeiros e custo: grava quem edita curso", () => {
  it("o Encarregado grava, e o banco guarda o que foi mandado", async () => {
    const { data, error } = await sessao("encarregado")
      .from("cursos")
      .update({
        ofertavel_estrangeiros: true,
        estrangeiros_observacao: "Vagas por convênio",
        custo_total: 12345.67,
        custo_composicao: "Material e diárias",
      })
      .eq("id", CURSO_ID)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(await cursoNoBanco()).toMatchObject({
      ofertavel_estrangeiros: true,
      custo_total: 12345.67,
      custo_composicao: "Material e diárias",
    });
  });

  it("⚠️ quem só lê é recusado em silêncio (0 linhas), e o banco não muda", async () => {
    const { data, error } = await sessao("visualizacao")
      .from("cursos")
      .update({ custo_total: 1 })
      .eq("id", CURSO_ID)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    expect((await cursoNoBanco()).custo_total).toBe(12345.67);
  });

  it("⚠️ custo negativo é recusado pelo banco (23514)", async () => {
    const { error } = await sessao("encarregado")
      .from("cursos")
      .update({ custo_total: -1 })
      .eq("id", CURSO_ID);
    expect(error?.code).toBe("23514");
  });
});

describe("FR-003 · o currículo em PDF", () => {
  it("o Encarregado carrega, e substituir deixa UM arquivo", async () => {
    for (let vez = 0; vez < 2; vez += 1) {
      const { error } = await sessao("encarregado")
        .storage.from(BALDE)
        .upload(arquivo(), PDF, { contentType: "application/pdf", upsert: true });
      expect(error, `envio ${vez + 1}: ${error?.message}`).toBeNull();
    }
    const { data } = await servico.storage.from(BALDE).list(CURSO_ID);
    expect(data?.map((o) => o.name)).toEqual(["curriculo.pdf"]);
  });

  it("quem só lê o curso baixa — controle positivo", async () => {
    const { data, error } = await sessao("visualizacao").storage.from(BALDE).download(arquivo());
    expect(error).toBeNull();
    expect(data?.size).toBe(PDF.length);
  });

  it("⚠️ quem só lê NÃO carrega: 403 da RLS", async () => {
    const { error } = await sessao("visualizacao")
      .storage.from(BALDE)
      .upload(arquivo(), PDF, { contentType: "application/pdf", upsert: true });
    expect(statusDe(error)).toBe("403");
  });

  it("⚠️ nem quem edita grava fora do nome do arquivo (um por curso): 403", async () => {
    const { error } = await sessao("encarregado")
      .storage.from(BALDE)
      .upload(`${CURSO_ID}/outro.pdf`, PDF, { contentType: "application/pdf", upsert: true });
    expect(statusDe(error)).toBe("403");
  });

  it("⚠️ não-PDF é recusado pelo motor: 415", async () => {
    const { error } = await sessao("encarregado")
      .storage.from(BALDE)
      .upload(arquivo(), Buffer.from("png"), { contentType: "image/png", upsert: true });
    expect(statusDe(error)).toBe("415");
  });

  it("⚠️ acima de 20 MB é recusado pelo motor: 413", async () => {
    const grande = Buffer.alloc(20 * 1024 * 1024 + 1024, 0x20);
    const { error } = await sessao("encarregado")
      .storage.from(BALDE)
      .upload(arquivo(), grande, { contentType: "application/pdf", upsert: true });
    expect(statusDe(error)).toBe("413");
  }, 60_000);

  it("⚠️ não há DELETE: `remove()` devolve lista vazia e o arquivo fica (gotcha 11)", async () => {
    const { data, error } = await sessao("encarregado").storage.from(BALDE).remove([arquivo()]);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
    const { data: lista } = await servico.storage.from(BALDE).list(CURSO_ID);
    expect(lista?.map((o) => o.name)).toEqual(["curriculo.pdf"]);
  });
});

describe("FR-004 · a capacitação em lista", () => {
  it("o Encarregado marca da lista; o banco guarda", async () => {
    const { data, error } = await sessao("encarregado")
      .from("instrutores")
      .update({ capacitacoes_didaticas: ["C-Esp-DID", "Licenciatura"] })
      .eq("codigo", INSTRUTOR)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const { data: linha } = await servico
      .from("instrutores")
      .select("capacitacoes_didaticas")
      .eq("codigo", INSTRUTOR)
      .single();
    expect((linha as { capacitacoes_didaticas: string[] }).capacitacoes_didaticas).toEqual([
      "C-Esp-DID",
      "Licenciatura",
    ]);
  });

  it("⚠️ valor fora da lista é recusado pelo tipo (22P02)", async () => {
    const { error } = await sessao("encarregado")
      .from("instrutores")
      .update({ capacitacoes_didaticas: ["Pedagogia"] } as never)
      .eq("codigo", INSTRUTOR);
    expect(error?.code).toBe("22P02");
  });

  it("⚠️ quem só lê instrutor não grava (0 linhas)", async () => {
    const { data } = await sessao("visualizacao")
      .from("instrutores")
      .update({ capacitacoes_didaticas: [] })
      .eq("codigo", INSTRUTOR)
      .select("id");
    expect(data ?? []).toHaveLength(0);
  });
});

describe("FR-005 · acessos: cada conta grava o próprio; só o Admin lê", () => {
  it("a conta grava o próprio acesso pela função, e o Admin o vê", async () => {
    conferir("registrar", (await sessao("encarregado").rpc("registrar_acesso")).error);
    const { data } = await sessao("admin")
      .from("acessos_de_conta")
      .select("usuario_id")
      .eq("usuario_id", usuarioDe.get("encarregado")!);
    expect(data).toHaveLength(1);
    const { data: resumo } = await sessao("admin")
      .from("vw_acessos_por_conta")
      .select("total")
      .eq("usuario_id", usuarioDe.get("encarregado")!)
      .single();
    expect((resumo as { total: number }).total).toBe(1);
  });

  it("⚠️ ninguém grava direto na tabela — nem de si mesmo (42501)", async () => {
    const { error } = await sessao("encarregado")
      .from("acessos_de_conta")
      .insert({ usuario_id: usuarioDe.get("admin")! });
    expect(error?.code).toBe("42501");
  });

  it.each(["encarregado", "chefe", "visualizacao"] as const)(
    "⚠️ %s não lê acesso nenhum (a recusa da leitura chega vazia, gotcha 4)",
    async (c) => {
      const { data: linhas } = await sessao(c).from("acessos_de_conta").select("id");
      const { data: resumo } = await sessao(c).from("vw_acessos_por_conta").select("usuario_id");
      expect(linhas ?? []).toHaveLength(0);
      expect(resumo ?? []).toHaveLength(0);
      // Controle: há o que ler — o Admin vê.
      const { data: doAdmin } = await sessao("admin").from("acessos_de_conta").select("id");
      expect((doAdmin ?? []).length).toBeGreaterThan(0);
    },
  );
});
