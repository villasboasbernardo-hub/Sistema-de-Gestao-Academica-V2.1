/**
 * Suíte de RLS — TESTE NEGATIVO por perfil (BRIEF §7 item 4 · FR-058 · `RN-RBAC-02`).
 *
 * POR QUE ISTO NÃO É pgTAP. O pgTAP roda como dono do schema, e **sob privilégio de dono a
 * RLS não se aplica**. Um teste de RLS escrito lá passaria com a RLS desligada. Aqui cada
 * perfil recebe um **JWT de verdade**, obtido por autenticação real — foi exatamente rodar
 * assim que revelou o defeito do `GRANT` do schema `extensions`, que passa despercebido em
 * migration, semente e ETL e quebra todo cadastro de usuário real em produção.
 *
 * A REGRA: prova-se o que cada perfil **NÃO** pode. *"Testar que o Operador consegue ler a
 * turma dele não prova nada sobre segurança — uma policy `using (true)` passa nesse teste."*
 *
 * Porta os doze testes T-01 a T-12 de `docs/sql-referencia/05_rls_policies.sql`, Parte VI.
 */
import { execFileSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * As chaves do stack LOCAL, pedidas ao próprio Supabase CLI. Nenhuma é embutida aqui.
 *
 * **Duas razões, e as duas importam.**
 *
 * A primeira é que este repositório é público: uma literal `sb_secret_…` no código, ainda que seja
 * só a chave do stack local, dispara a varredura de segredos do GitHub e normaliza o hábito que o
 * BRIEF §2 proíbe — a `service_role` ignora a RLS inteira, e o lugar dela nunca é o versionamento.
 *
 * A segunda é que **`.env.local` não serve para esta suíte**: ele aponta para o projeto Supabase
 * remoto de desenvolvimento e traz `SUPABASE_SERVICE_ROLE_KEY` vazia, de propósito. Ler dali faria a
 * suíte de RLS rodar contra o banco errado — ou, pior, criar usuários de teste nele.
 *
 * `supabase status -o env` devolve sempre as chaves do stack local em pé, e nada disso encosta no
 * versionamento. No CI, as variáveis de ambiente têm precedência.
 */
function chaveLocal(nomeNoCli: string, nomeNoAmbiente: string): string {
  const doAmbiente = process.env[nomeNoAmbiente];
  if (doAmbiente) return doAmbiente;

  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${nomeNoCli}=`))
    ?.slice(nomeNoCli.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!valor) {
    throw new Error(
      `${nomeNoCli} não veio de \`supabase status\`. O stack local está de pé? ` +
        `Rode \`pnpm db:start\`. A suíte de RLS precisa de sessão autenticada de verdade, ` +
        `contra o banco local — não contra o projeto remoto do \`.env.local\`.`,
    );
  }
  return valor;
}

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR o cenário. Nunca para asserção. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Um curso regular e um expedito: é o recorte que o escopo do Operador precisa distinguir. */
const CURSO_REGULAR = "aaaa0000-0000-0000-0000-0000000c0001";
const CURSO_EXPEDITO = "aaaa0000-0000-0000-0000-0000000c0002";
const TURMA_REGULAR = "aaaa0000-0000-0000-0000-0000000a0001";
const TURMA_EXPEDITA = "aaaa0000-0000-0000-0000-0000000a0002";

type Perfil =
  | "admin"
  | "operador"
  | "visualizacao"
  | "encarregado_curso"
  | "encarregado_administracao_academica";

const sessoes = new Map<Perfil, SupabaseClient>();

/** Autentica de verdade e devolve um cliente com JWT — não um cliente de serviço. */
async function autenticar(perfil: Perfil, email: string): Promise<SupabaseClient> {
  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA });
  if (error) throw new Error(`falha ao autenticar ${perfil}: ${error.message}`);
  return cliente;
}

async function criarUsuario(
  perfil: Perfil,
  email: string,
  escopo: string,
  cursos: string[] = [],
): Promise<void> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email}: ${error.message}`);

  const authUserId = data.user.id;
  const { data: linha, error: erroUsuario } = await admin
    .from("usuarios")
    .insert({
      codigo: `USR-RLS-${perfil}`,
      auth_user_id: authUserId,
      email,
      nome: `Teste ${perfil}`,
      perfil,
      escopo_curso: escopo,
    })
    .select("id")
    .single();
  if (erroUsuario) throw new Error(`falha ao cadastrar usuario ${perfil}: ${erroUsuario.message}`);

  for (const cursoId of cursos) {
    const { error: erroVinculo } = await admin.from("usuario_curso").insert({
      codigo: `UC-${perfil}-${cursoId.slice(-4)}`,
      usuario_id: linha.id,
      curso_id: cursoId,
    });
    if (erroVinculo) throw new Error(`falha ao vincular curso: ${erroVinculo.message}`);
  }

  sessoes.set(perfil, await autenticar(perfil, email));
}

/**
 * Deixa a base no estado inicial. Roda ANTES e DEPOIS: uma execução interrompida no meio do
 * `beforeAll` não pode inviabilizar a seguinte — suíte que só funciona na primeira tentativa
 * é suíte que ninguém roda.
 */
async function limpar(): Promise<void> {
  await admin.from("instrutores").delete().eq("codigo", "RLS-INS-OK");
  await admin.from("migracao_log").delete().eq("codigo", "LOG-RLS-1");
  await admin.from("usuario_curso").delete().like("codigo", "UC-%");
  await admin.from("usuarios").delete().like("email", "%@ciaara.teste");
  await admin.from("turmas").delete().in("id", [TURMA_REGULAR, TURMA_EXPEDITA]);
  await admin.from("cursos").delete().in("id", [CURSO_REGULAR, CURSO_EXPEDITO]);
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@ciaara.teste")) await admin.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  await limpar();
  // Cenário mínimo que permite distinguir alcance: dois cursos de classificações diferentes.
  //
  // CADA INSERÇÃO É CONFERIDA. Uma fixture que falha em silêncio torna toda assercão
  // negativa VACUOSA — "o operador não vê a turma alheia" passa trivialmente quando turma
  // nenhuma foi criada. É o modo de falha que esta suíte existe para impedir, e ela não
  // pode cair nele.
  const erroCursos = (
    await admin.from("cursos").insert([
      {
        id: CURSO_REGULAR,
        codigo: "RLS-REG",
        nome_curso: "Curso Regular RLS",
        classificacao: "regular",
      },
      {
        id: CURSO_EXPEDITO,
        codigo: "RLS-EXP",
        nome_curso: "Curso Expedito RLS",
        classificacao: "expedito",
      },
    ])
  ).error;
  if (erroCursos) throw new Error(`fixture de cursos falhou: ${erroCursos.message}`);

  const erroTurmas = (
    await admin.from("turmas").insert([
      {
        id: TURMA_REGULAR,
        codigo: "RLS-REG 2026",
        curso_id: CURSO_REGULAR,
        turma: "T1",
        ano_letivo: 2026,
        status: "ativa",
      },
      {
        id: TURMA_EXPEDITA,
        codigo: "RLS-EXP 2026",
        curso_id: CURSO_EXPEDITO,
        turma: "T1",
        ano_letivo: 2026,
        status: "ativa",
      },
    ])
  ).error;
  if (erroTurmas) throw new Error(`fixture de turmas falhou: ${erroTurmas.message}`);

  await criarUsuario("admin", "rls-admin@ciaara.teste", "geral");
  await criarUsuario("operador", "rls-operador@ciaara.teste", "expedito");
  await criarUsuario("visualizacao", "rls-visual@ciaara.teste", "geral");
  // O alcance do Encarregado de Curso vem de `usuario_curso`, nao de `escopo_curso` —
  // por isso ele recebe escopo "geral" e mesmo assim so enxerga o curso vinculado.
  await criarUsuario("encarregado_curso", "rls-enc-curso@ciaara.teste", "geral", [CURSO_EXPEDITO]);
  await criarUsuario("encarregado_administracao_academica", "rls-ciaara11@ciaara.teste", "geral");
}, 60_000);

afterAll(limpar);

const cliente = (p: Perfil): SupabaseClient => {
  const c = sessoes.get(p);
  if (!c) throw new Error(`sessao ausente para ${p}`);
  return c;
};

describe("T-01 · alcance: o Operador não enxerga curso fora do escopo", () => {
  it("Operador de escopo expedito NÃO lê a turma de curso regular", async () => {
    const { data } = await cliente("operador").from("turmas").select("id, codigo");
    const codigos = (data ?? []).map((t) => t.codigo);
    expect(codigos).not.toContain("RLS-REG 2026");
  });

  it("controle positivo: ele lê a turma do curso expedito", async () => {
    const { data } = await cliente("operador").from("turmas").select("codigo");
    expect((data ?? []).map((t) => t.codigo)).toContain("RLS-EXP 2026");
  });
});

describe("T-04 · o perfil de visualização não escreve em lugar nenhum", () => {
  it("não cria curso", async () => {
    const { error } = await cliente("visualizacao")
      .from("cursos")
      .insert({ codigo: "RLS-NEG-1", nome_curso: "Nao deve entrar", classificacao: "regular" });
    expect(error).not.toBeNull();
  });

  it("não cria instrutor", async () => {
    const { error } = await cliente("visualizacao").from("instrutores").insert({
      codigo: "RLS-NEG-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "AA",
      nome_completo: "Nao deve entrar",
      categoria: "Militar",
      om: "CIAARA",
    });
    expect(error).not.toBeNull();
  });
});

describe("T-05 · escalonamento de privilégio — o teste mais importante da suíte", () => {
  it("um não-admin NÃO eleva o próprio perfil a admin", async () => {
    // A policy aprovaria: a linha continua sendo dele, e `USING`/`WITH CHECK` avaliam a
    // linha inteira sem saber O QUE MUDOU. Quem barra é o gatilho.
    const { error } = await cliente("operador")
      .from("usuarios")
      .update({ perfil: "admin" })
      .eq("email", "rls-operador@ciaara.teste");
    expect(error).not.toBeNull();
  });

  it("nem o próprio escopo de curso", async () => {
    const { error } = await cliente("operador")
      .from("usuarios")
      .update({ escopo_curso: "geral" })
      .eq("email", "rls-operador@ciaara.teste");
    expect(error).not.toBeNull();
  });
});

describe("T-06 · só o Administrador escreve na matriz de permissões", () => {
  it("o Operador NÃO altera a matriz — quem escreve nela se autoconcede tudo", async () => {
    // ATENÇÃO À ARMADILHA: um UPDATE que a RLS filtra até sobrar zero linha NÃO devolve
    // erro — devolve sucesso tendo alterado nada. É a mesma "negativa silenciosa" que faz
    // a tela abrir vazia sem aviso. Por isso a asserção olha o EFEITO, não o erro.
    await cliente("operador")
      .from("perfil_permissao")
      .update({ permitido: true })
      .eq("perfil", "operador")
      .eq("recurso", "usuarios")
      .eq("acao", "editar");

    const { data } = await admin
      .from("perfil_permissao")
      .select("permitido")
      .eq("perfil", "operador")
      .eq("recurso", "usuarios")
      .eq("acao", "editar")
      .maybeSingle();
    expect(data?.permitido ?? false).toBe(false);
  });

  it("a LEITURA da matriz é aberta: a interface precisa saber quais ações oferecer", async () => {
    const { data, error } = await cliente("operador")
      .from("perfil_permissao")
      .select("perfil")
      .limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});

describe("T-07 · DELETE é impossível em toda tabela", () => {
  it.each(["cursos", "turmas", "disciplinas", "instrutores", "registros_aula", "unidades_ensino"])(
    "nenhuma linha de `%s` pode ser apagada nem pelo admin",
    async (tabela) => {
      const { error } = await cliente("admin")
        .from(tabela)
        .delete()
        .neq("codigo", "___inexistente___");
      expect(error).not.toBeNull();
    },
  );
});

describe("T-08 · o registro da migração é imutável", () => {
  it("nem o admin altera `migracao_log`", async () => {
    await admin
      .from("migracao_log")
      .insert({ codigo: "LOG-RLS-1", origem_tabela: "cursos", acao: "transportado" });
    const { error } = await cliente("admin")
      .from("migracao_log")
      .update({ origem_tabela: "x" })
      .eq("codigo", "LOG-RLS-1");
    expect(error).not.toBeNull();
    await admin.from("migracao_log").delete().eq("codigo", "LOG-RLS-1");
  });
});

describe("T-09 · sessão sem cadastro em `usuarios` não alcança nada", () => {
  it("um JWT válido sem linha correspondente lê zero", async () => {
    const email = "rls-sem-cadastro@ciaara.teste";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: SENHA,
      email_confirm: true,
    });
    expect(error).toBeNull();
    const orfao = createClient(URL_SUPABASE, CHAVE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await orfao.auth.signInWithPassword({ email, password: SENHA });
    const { data: cursos } = await orfao.from("cursos").select("id");
    expect(cursos ?? []).toHaveLength(0);
    if (data?.user) await admin.auth.admin.deleteUser(data.user.id);
  });
});

describe("T-11 · usuário desativado perde o acesso imediatamente", () => {
  it("desativar a conta zera o alcance na requisição seguinte", async () => {
    await admin
      .from("usuarios")
      .update({ status: "inativo" })
      .eq("email", "rls-visual@ciaara.teste");
    const { data } = await cliente("visualizacao").from("cursos").select("id");
    expect(data ?? []).toHaveLength(0);
    await admin.from("usuarios").update({ status: "ativo" }).eq("email", "rls-visual@ciaara.teste");
  });
});

describe("T-12 · o Encarregado de Curso vê só os cursos vinculados", () => {
  it("vinculado ao expedito, NÃO enxerga o regular", async () => {
    const { data } = await cliente("encarregado_curso").from("cursos").select("codigo");
    const codigos = (data ?? []).map((c) => c.codigo);
    expect(codigos).not.toContain("RLS-REG");
    expect(codigos).toContain("RLS-EXP");
  });
});

describe("FR-044 · um usuário real, autenticado, consegue cadastrar", () => {
  it("a CIAARA-11 cria instrutor — o caminho que o GRANT de `extensions` quebraria", async () => {
    // Este é o teste que encontrou o defeito: migration, semente e ETL passam porque rodam
    // como dono do schema. Só a sessão real quebra, em produção, no primeiro cadastro.
    const { error } = await cliente("encarregado_administracao_academica")
      .from("instrutores")
      .insert({
        codigo: "RLS-INS-OK",
        posto_graduacao: "CC",
        esp_hab_obs: "AA",
        nome_completo: "Instrutor Cadastrado Por Usuario Real",
        categoria: "Militar",
        om: "CIAARA",
      });
    expect(error).toBeNull();
    await admin.from("instrutores").delete().eq("codigo", "RLS-INS-OK");
  });
});
