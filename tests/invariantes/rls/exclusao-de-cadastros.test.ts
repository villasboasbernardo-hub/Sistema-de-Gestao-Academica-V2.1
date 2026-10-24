/**
 * Suíte de RLS da exclusão permanente do Bloco 10 — turma, linha do calendário, regime, item de avaliação do currículo
 * e sala (spec `025`, D-COR-6, D-9 a D-13, D-30).
 *
 * **A regra é a mesma de sempre**: prova-se o que cada perfil **NÃO** pode, com **JWT de verdade**, e a recusa é
 * conferida pelo **código** (`42501` do porteiro, `22023` do código digitado, `23503` do registro, `P0002` do
 * inexistente) — nunca por `error not null` (DoD 4 do `CLAUDE.md`).
 *
 * ⚠️ **OS CASOS QUE DISCRIMINAM** (DoD 8):
 *    · o **Operador** tem `turmas.criar` e escopo `regular`: a turma do curso `expedito` da amostra é recusada com
 *      `42501` pelo ALCANCE, não pela permissão — só ele observa que a função confere as duas;
 *    · o **Ajudante da Divisão** tem `turmas.criar` e não tem `calendario.criar` nem `parametros.criar`: exclui a
 *      turma e é recusado no feriado e na sala;
 *    · no regime e no item, o mesmo id inexistente dá `42501` a quem não tem a permissão e `P0002` a quem tem — a
 *      diferença prova que o porteiro vem ANTES de qualquer leitura.
 *
 * ⚠️ **NENHUM REGISTRO IMUTÁVEL NA AMOSTRA**: o evento do DSA é só de acréscimo inclusive para a `service_role`, e uma
 *    turma presa por ele não sairia mais do banco local — `099_salas.sql` decide asserir ou pular pela existência de
 *    turma. O registro que prende aqui é a turma escolhida num feriado, que a limpeza desfaz; a semana salva fica
 *    provada no pgTAP `149`, dentro de transação desfeita.
 *
 * ⚠️ **DOMÍNIO E CÓDIGOS PRÓPRIOS** (`@ciaara.teste10`, `USR-B10-`), e **NENHUMA CONTA `admin`** (gotcha 8).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");
const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR e conferir o cenário. Nunca para a ação testada. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Perfil =
  | "encarregado_administracao_academica"
  | "ajudante_administracao_academica"
  | "operador"
  | "encarregado_orientacao_pedagogica";

const sessoes = new Map<Perfil, SupabaseClient>();
const idDoAuth = new Map<Perfil, string>();
const email = (p: Perfil) => `b10-${p}@ciaara.teste10`;
const cliente = (p: Perfil): SupabaseClient => {
  const c = sessoes.get(p);
  if (!c) throw new Error(`sessao ausente para ${p}`);
  return c;
};

const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const SIGLA = `C-Exp-B10${SELO}`;
const INEXISTENTE = "00000000-0000-4000-8000-0000000000b1";

let cursoId = "";
const turma = { limpa: { id: "", codigo: "" }, presa: { id: "", codigo: "" } };
const feriado = { id: "", codigo: "" };
const sala = { id: "", valor: `Sala B10 ${SELO}` };

async function criarUsuario(perfil: Perfil, escopo: string): Promise<void> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(perfil),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email(perfil)}: ${error.message}`);
  idDoAuth.set(perfil, data.user.id);
  const { error: erroUsuario } = await admin.from("usuarios").insert({
    codigo: `USR-B10-${perfil}`,
    auth_user_id: data.user.id,
    email: email(perfil),
    nome: `Teste B10 ${perfil}`,
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
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith("@ciaara.teste10")) {
        await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
    if (data.users.length < 200) break;
  }
  await admin.from("usuarios").delete().like("codigo", "USR-B10-%");
  const { data: feriados } = await admin.from("feriados").select("id").like("descricao", "B10 %");
  for (const f of feriados ?? []) {
    await admin.from("feriado_turma").delete().eq("feriado_id", f.id);
    await admin.from("feriados").delete().eq("id", f.id);
  }
  const { data: turmas } = await admin.from("turmas").select("id").like("codigo", "C-Exp-B10%");
  for (const t of turmas ?? []) {
    const { data: linhas } = await admin.from("turma_disciplina").select("id").eq("turma_id", t.id);
    for (const l of linhas ?? []) {
      await admin.from("turma_disciplina_instrutor").delete().eq("turma_disciplina_id", l.id);
    }
    await admin.from("turma_disciplina").delete().eq("turma_id", t.id);
    await admin.from("turmas").delete().eq("id", t.id);
  }
  await admin.from("config_listas").delete().eq("lista", "salas").like("valor", "Sala B10 %");
}

async function criarTurma(rotulo: string): Promise<{ id: string; codigo: string }> {
  const { data, error } = await admin
    .from("turmas")
    .insert({
      curso_id: cursoId,
      turma: rotulo,
      ano_letivo: 2026,
      status: "planejada",
      modalidade: "presencial",
      data_inicio: "2026-03-02",
      data_termino: "2026-06-30",
    })
    .select("id, codigo")
    .single();
  if (error) throw new Error(`falha ao criar turma ${rotulo}: ${error.message}`);
  return data as { id: string; codigo: string };
}

beforeAll(async () => {
  await limpar();
  await criarUsuario("encarregado_administracao_academica", "geral");
  await criarUsuario("ajudante_administracao_academica", "geral");
  await criarUsuario("operador", "regular");
  await criarUsuario("encarregado_orientacao_pedagogica", "geral");

  const { data: curso, error: erroCurso } = await admin
    .rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: "Curso da suite B10",
        classificacao: "expedito",
        modalidade: "presencial",
        duracao_dias: 20,
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
    })
    .single();
  if (erroCurso) throw new Error(`falha ao criar curso: ${erroCurso.message}`);
  cursoId = (curso as { id: string }).id;

  turma.limpa = await criarTurma("T1");
  turma.presa = await criarTurma("T2");

  // A turma presa é a escolhida num feriado: apagá-la ALARGARIA o feriado para todas (D-10).
  const { data: f, error: erroFeriado } = await admin
    .from("feriados")
    .insert({
      ano: 2026,
      data: "2026-04-15",
      descricao: `B10 ${SELO}`,
      impacto: "dia_inteiro",
      status: "ativo",
    })
    .select("id, codigo")
    .single();
  if (erroFeriado) throw new Error(`falha ao criar feriado: ${erroFeriado.message}`);
  Object.assign(feriado, f);
  const { error: erroLigacao } = await admin
    .from("feriado_turma")
    .insert({ feriado_id: feriado.id, turma_id: turma.presa.id, status: "ativo" });
  if (erroLigacao) throw new Error(`falha ao ligar o feriado: ${erroLigacao.message}`);

  const { data: s, error: erroSala } = await admin
    .from("config_listas")
    .insert({
      lista: "salas",
      valor: sala.valor,
      rotulo_exibicao: sala.valor,
      ativo: true,
      ordem: 999,
      metadados: { ambiente_virtual: false },
    })
    .select("id")
    .single();
  if (erroSala) throw new Error(`falha ao criar sala: ${erroSala.message}`);
  sala.id = (s as { id: string }).id;
}, 120_000);

afterAll(async () => {
  await limpar();
});

describe("D-9 · a turma: quem tem `turmas.criar` E alcança o curso", () => {
  it("o Encarregado de Orientação Pedagógica, sem `turmas.criar`, é recusado pelo porteiro (42501)", async () => {
    const { error } = await cliente("encarregado_orientacao_pedagogica").rpc("excluir_turma", {
      p_turma_id: turma.limpa.id,
      p_codigo_confirmacao: turma.limpa.codigo,
    });
    expect(error?.code).toBe("42501");
  });

  it("⚠️ DISCRIMINA · o Operador TEM `turmas.criar`, e é recusado pelo ALCANCE (curso expedito, escopo regular)", async () => {
    const { error } = await cliente("operador").rpc("excluir_turma", {
      p_turma_id: turma.limpa.id,
      p_codigo_confirmacao: turma.limpa.codigo,
    });
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/escopo/);
  });

  it("o impedimento em lote também tem porteiro", async () => {
    const { error } = await cliente("encarregado_orientacao_pedagogica").rpc(
      "impedimentos_de_exclusao_das_turmas",
      { p_turmas: [turma.limpa.id, turma.presa.id] },
    );
    expect(error?.code).toBe("42501");
  });

  it("o Ajudante lê o que prende cada turma: a limpa, nada; a escolhida num feriado, a abrangência", async () => {
    const { data, error } = await cliente("ajudante_administracao_academica").rpc(
      "impedimentos_de_exclusao_das_turmas",
      { p_turmas: [turma.limpa.id, turma.presa.id] },
    );
    expect(error).toBeNull();
    const porId = new Map(
      ((data ?? []) as { registro_id: string; impedimentos: string[] }[]).map((l) => [
        l.registro_id,
        l.impedimentos,
      ]),
    );
    expect(porId.get(turma.limpa.id)).toEqual([]);
    expect(porId.get(turma.presa.id)).toEqual(["feriado_da_turma"]);
  });

  it("o código digitado errado é recusado (22023), e nada sai", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_turma", {
      p_turma_id: turma.limpa.id,
      p_codigo_confirmacao: "outro",
    });
    expect(error?.code).toBe("22023");
    const { count } = await admin
      .from("turmas")
      .select("id", { count: "exact", head: true })
      .eq("id", turma.limpa.id);
    expect(count).toBe(1);
  });

  it("a turma com registro é recusada (23503), nomeando o que prende", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_turma", {
      p_turma_id: turma.presa.id,
      p_codigo_confirmacao: turma.presa.codigo,
    });
    expect(error?.code).toBe("23503");
    expect(error?.message).toMatch(/turma_com_historico: feriado_da_turma/);
  });

  it("controle positivo · o Ajudante exclui a turma limpa, e o rastro diz quem", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_turma", {
      p_turma_id: turma.limpa.id,
      p_codigo_confirmacao: turma.limpa.codigo,
    });
    expect(error).toBeNull();
    const { count } = await admin
      .from("turmas")
      .select("id", { count: "exact", head: true })
      .eq("id", turma.limpa.id);
    expect(count, "a turma continua no banco").toBe(0);
    const { data: rastro } = await admin
      .from("exclusoes_registradas")
      .select("tabela, registro_codigo, excluido_por")
      .eq("registro_id", turma.limpa.id)
      .single();
    expect(rastro).toEqual({
      tabela: "turmas",
      registro_codigo: turma.limpa.codigo,
      excluido_por: idDoAuth.get("ajudante_administracao_academica"),
    });
  });
});

describe("D-9 · a linha do calendário: quem tem `calendario.criar`", () => {
  it("⚠️ DISCRIMINA · o Ajudante, que exclui turma, NÃO exclui do calendário (42501)", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_feriado", {
      p_feriado_id: feriado.id,
      p_codigo_confirmacao: feriado.codigo,
    });
    expect(error?.code).toBe("42501");
  });

  it("controle positivo · o Encarregado da Divisão exclui a linha sem semana salva, e a abrangência sai junto", async () => {
    const { error } = await cliente("encarregado_administracao_academica").rpc("excluir_feriado", {
      p_feriado_id: feriado.id,
      p_codigo_confirmacao: feriado.codigo,
    });
    expect(error).toBeNull();
    const { count } = await admin
      .from("feriado_turma")
      .select("id", { count: "exact", head: true })
      .eq("feriado_id", feriado.id);
    expect(count).toBe(0);
  });

  it("e, sem a ligação, a turma que estava presa só pelo feriado fica livre", async () => {
    const { data } = await cliente("ajudante_administracao_academica").rpc(
      "impedimentos_de_exclusao_da_turma",
      { p_turma_id: turma.presa.id },
    );
    expect(data).toEqual([]);
  });
});

describe("D-30 · a sala: quem tem `parametros.criar`", () => {
  it("o Ajudante é recusado (42501)", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_sala", {
      p_sala_id: sala.id,
      p_nome_confirmacao: sala.valor,
    });
    expect(error?.code).toBe("42501");
  });

  it("controle positivo · o Encarregado exclui a sala que nenhuma turma usa", async () => {
    const { error } = await cliente("encarregado_administracao_academica").rpc("excluir_sala", {
      p_sala_id: sala.id,
      p_nome_confirmacao: sala.valor,
    });
    expect(error).toBeNull();
    const { count } = await admin
      .from("config_listas")
      .select("id", { count: "exact", head: true })
      .eq("id", sala.id);
    expect(count).toBe(0);
  });
});

describe("D-30 · o regime e o item: o porteiro vem ANTES da leitura", () => {
  for (const [rpc, args] of [
    ["excluir_regime_de_horario", { p_regime_id: INEXISTENTE, p_codigo_confirmacao: "x" }],
    [
      "excluir_item_de_avaliacao_do_curriculo",
      { p_item_id: INEXISTENTE, p_codigo_confirmacao: "x" },
    ],
  ] as const) {
    it(`${rpc}: sem a permissão, 42501; com ela, P0002 do inexistente`, async () => {
      const sem = await cliente("encarregado_orientacao_pedagogica").rpc(rpc, args);
      expect(sem.error?.code).toBe("42501");
      const com = await cliente("ajudante_administracao_academica").rpc(rpc, args);
      expect(com.error?.code).toBe("P0002");
    });
  }
});
