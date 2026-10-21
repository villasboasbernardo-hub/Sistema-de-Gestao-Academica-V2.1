/**
 * Spec 021, Bloco 6 — quem pode o quê no CURRÍCULO, provado com SESSÃO AUTENTICADA (DoD 4: permissão não mora em
 * pgTAP; toda recusa conferida pelo código, ou pelo zero de linhas quando a RLS recusa em silêncio — gotcha 4).
 *
 * RC-1 (Bernardo Villas Boas, 21/10/2026): o propósito, a duração, o modelo e o PDF saíram do curso para o currículo,
 * e quem os edita NÃO muda: é `cursos.editar` (o trio), com alcance e curso em oferta — a policy `curriculos_editar`
 * copia a `cursos_editar`.
 *
 * O caso que discrimina (DoD 8): o OPERADOR tem `disciplinas.editar` e NÃO tem `cursos.editar`. Se o currículo fosse
 * editado pelo direito das disciplinas (o desenho de 21/10/2026, antes das RC), ele passaria a editar o propósito e a
 * duração — que antes, no curso, não editava. Aqui ele é recusado; o Ajudante, que tem `cursos.editar`, passa.
 *
 * ⚠️ Contas criadas aqui e apagadas no `afterAll`: as suítes de invariantes rodam EM SÉRIE (`--no-file-parallelism`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testecrv";
const SENHA = "senha-de-teste-com-12+";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: { perfil: "admin", escopo: "geral" },
  ajudante: { perfil: "ajudante_administracao_academica", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "CRV-REG", classificacao: "regular" },
  expedito: { codigo: "CRV-EXP", classificacao: "expedito" },
  inativo: { codigo: "CRV-INA", classificacao: "regular" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `crv-${c}@${DOMINIO}`;
const curriculoDe = new Map<Lado, string>();

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
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
        codigo: `USR-CRV-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova CRV ${c}`,
        perfil: CONTAS[c].perfil,
        escopo_curso: CONTAS[c].escopo,
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

/* Regra 9.1: curso não se apaga — a amostra é idempotente, reaproveita o que já existe. */
async function curso(lado: Lado): Promise<string> {
  const { codigo, classificacao } = CURSOS[lado];
  const { data: existe } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  let id = (existe as { id: string } | null)?.id;
  if (!id) {
    const { data, error } = await servico.rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo,
          nome_curso: `Curso ${codigo}`,
          classificacao,
          modalidade: "presencial",
          duracao_dias: 200,
          proposito: "Propósito de origem",
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
    conferir(`curso ${codigo}`, error);
    id = (data as unknown as { id: string }).id;
  }
  const { data: cr, error: erroCr } = await servico
    .from("curriculos")
    .select("id")
    .eq("curso_id", id)
    .eq("versao", 1)
    .single();
  conferir(`currículo ${codigo}`, erroCr);
  return cr!.id as string;
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
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-CRV-%")).error);
}

async function propositoNoBanco(lado: Lado): Promise<string | null> {
  const { data } = await servico
    .from("curriculos")
    .select("proposito")
    .eq("id", curriculoDe.get(lado)!)
    .single();
  return (data as { proposito: string | null } | null)?.proposito ?? null;
}

beforeAll(async () => {
  await limpar();
  for (const lado of Object.keys(CURSOS) as Lado[]) curriculoDe.set(lado, await curso(lado));
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
  /*
   * ⚠️ A SITUAÇÃO DO CURSO SÓ MUDA COM SESSÃO DE QUEM TEM `cursos.desativar` (o gatilho recusa até a `service_role`):
   *    o Admin reativa o inativo (segunda rodada), a amostra volta ao propósito de origem, e o Admin o inativa de novo.
   */
  const inativo = sessao("admin").from("cursos");
  conferir(
    "reativar",
    (await inativo.update({ status: "ativo" }).eq("codigo", CURSOS.inativo.codigo)).error,
  );
  for (const lado of Object.keys(CURSOS) as Lado[]) {
    conferir(
      `propósito ${lado}`,
      (
        await servico
          .from("curriculos")
          .update({ proposito: "Propósito de origem" })
          .eq("id", curriculoDe.get(lado)!)
      ).error,
    );
  }
  conferir(
    "inativar",
    (
      await sessao("admin")
        .from("cursos")
        .update({ status: "inativo" })
        .eq("codigo", CURSOS.inativo.codigo)
    ).error,
  );
}, 120_000);

afterAll(async () => {
  await limpar();
});

describe("spec 021 · ler o currículo segue ler o curso", () => {
  it("quem lê o curso lê o currículo dele; o recorte do Operador vale para o currículo", async () => {
    const { data: vis } = await sessao("visualizacao")
      .from("curriculos")
      .select("id")
      .in("id", [curriculoDe.get("regular")!, curriculoDe.get("expedito")!]);
    expect(vis?.length, "a Visualização lê os dois currículos").toBe(2);
    const { data: ope } = await sessao("operador")
      .from("curriculos")
      .select("id")
      .in("id", [curriculoDe.get("regular")!, curriculoDe.get("expedito")!]);
    expect(
      (ope ?? []).map((r) => r.id),
      "o Operador (escopo regular) não vê o do expedito",
    ).toEqual([curriculoDe.get("regular")]);
  });
});

describe("spec 021 · RC-1 — editar o currículo é o mesmo direito que editava essas colunas no curso", () => {
  it("o Ajudante (cursos.editar) edita o propósito do currículo", async () => {
    const { data, error } = await sessao("ajudante")
      .from("curriculos")
      .update({ proposito: "Editado pelo Ajudante" })
      .eq("id", curriculoDe.get("regular")!)
      .select("id");
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(await propositoNoBanco("regular")).toBe("Editado pelo Ajudante");
  });

  it("⚠️ O CASO QUE DISCRIMINA: o Operador (disciplinas.editar, sem cursos.editar) NÃO edita o currículo", async () => {
    const { data, error } = await sessao("operador")
      .from("curriculos")
      .update({ proposito: "Editado pelo Operador" })
      .eq("id", curriculoDe.get("regular")!)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? [], "a RLS recusa em silêncio: zero linhas").toEqual([]);
    expect(await propositoNoBanco("regular")).toBe("Editado pelo Ajudante");
  });

  it("a Visualização não edita", async () => {
    const { data } = await sessao("visualizacao")
      .from("curriculos")
      .update({ proposito: "Editado pela Visualização" })
      .eq("id", curriculoDe.get("regular")!)
      .select("id");
    expect(data ?? []).toEqual([]);
    expect(await propositoNoBanco("regular")).toBe("Editado pelo Ajudante");
  });

  it("FR-017.5 da spec 009 · curso fora de oferta não recebe escrita no currículo, nem do Admin", async () => {
    const { data } = await sessao("admin")
      .from("curriculos")
      .update({ proposito: "Editado com o curso inativo" })
      .eq("id", curriculoDe.get("inativo")!)
      .select("id");
    expect(data ?? []).toEqual([]);
    expect(await propositoNoBanco("inativo")).toBe("Propósito de origem");
  });
});

describe("spec 021 · regra 4 e RC-10 — o currículo não nasce por INSERT, não sai, e arquivar não é edição", () => {
  it("INSERT de sessão é recusado (42501), inclusive para o Admin", async () => {
    const { data: c } = await servico.from("cursos").select("id").eq("codigo", "CRV-REG").single();
    const { error } = await sessao("admin")
      .from("curriculos")
      .insert({ curso_id: c!.id, versao: 9, vigente_de: "2099-01-01", duracao_dias: 10 });
    expect(error?.code).toBe("42501");
  });

  it("DELETE é recusado (42501)", async () => {
    const { error } = await sessao("admin")
      .from("curriculos")
      .delete()
      .eq("id", curriculoDe.get("regular")!);
    expect(error?.code).toBe("42501");
  });

  it("o arquivamento não se escreve por coluna (42501) — é função, no PR 2", async () => {
    const { error } = await sessao("admin")
      .from("curriculos")
      .update({ arquivado_em: new Date().toISOString() })
      .eq("id", curriculoDe.get("regular")!);
    expect(error?.code).toBe("42501");
  });
});
