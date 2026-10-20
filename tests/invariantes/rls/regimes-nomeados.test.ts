/**
 * Spec 018, Bloco 3 — quem pode o quê nos REGIMES NOMEADOS e na ESCOLHA DA TURMA, provado com SESSÃO AUTENTICADA
 * (DoD 4: permissão não mora em pgTAP; toda recusa conferida pelo código, com a linha completa).
 *
 * Os casos que discriminam (DoD 8):
 *   - o OPERADOR cria e edita regime (`horarios.criar`/`editar`) e NÃO inativa (não tem `horarios.desativar`) — é o
 *     perfil que separa as duas permissões, e a recusa vem do gatilho (a policy não vê OLD, gotcha 4);
 *   - quem não tem `horarios.criar` (Visualização, Chefe) é recusado pela RLS (`42501`);
 *   - o curso fora de oferta não recebe regime novo (`42501`), nem para o Admin;
 *   - a turma escolhe o regime por `turmas.editar`, e a escolha trava no primeiro lançamento (`23514`).
 *
 * ⚠️ UMA conta Admin, criada aqui e apagada no `afterAll`: as suítes de invariantes rodam EM SÉRIE
 *    (`--no-file-parallelism`), o mesmo acordo de `bloco-2.test.ts` (gotcha 8).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testergn";
const SENHA = "senha-de-teste-com-12+";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: { perfil: "admin", escopo: "geral" },
  encarregado: { perfil: "encarregado_administracao_academica", escopo: "geral" },
  ajudante: { perfil: "ajudante_administracao_academica", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
  chefe: { perfil: "chefe_departamento_ensino", escopo: "geral" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "RGN-REG", classificacao: "regular" },
  expedito: { codigo: "RGN-EXP", classificacao: "expedito" },
  inativo: { codigo: "RGN-INA", classificacao: "regular" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `rgn-${c}@${DOMINIO}`;
const cursoDe = new Map<Lado, string>();
let turmaLivre = "";
let turmaComLancamento = "";

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
        codigo: `USR-RGN-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova RGN ${c}`,
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
  if (existe) return (existe as { id: string }).id;
  const { data, error } = await servico.rpc(
    "criar_curso_com_regime" as never,
    {
      p_curso: {
        codigo,
        nome_curso: `Curso ${codigo}`,
        classificacao,
        modalidade: "presencial",
        duracao_dias: 200,
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
  return (data as unknown as { id: string }).id;
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
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-RGN-%")).error);
  conferir("aulas", (await servico.from("registros_aula").delete().like("codigo", "RGN-%")).error);
  for (const lado of Object.keys(CURSOS) as Lado[]) {
    const { data: c } = await servico
      .from("cursos")
      .select("id")
      .eq("codigo", CURSOS[lado].codigo)
      .maybeSingle();
    if (!c) continue;
    const cursoId = (c as { id: string }).id;
    const { data: turmas } = await servico.from("turmas").select("id").eq("curso_id", cursoId);
    for (const t of (turmas ?? []) as { id: string }[]) {
      conferir(
        "linhas da turma",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
    conferir(
      "regimes",
      (await servico.from("regimes_de_horario").delete().eq("curso_id", cursoId)).error,
    );
  }
  conferir("UEs", (await servico.from("unidades_ensino").delete().like("codigo", "RGN-%")).error);
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "RGN-%")).error,
  );
  conferir(
    "instrutores",
    (await servico.from("instrutores").delete().like("codigo", "RGN-%")).error,
  );
}

const REGIME = {
  regime_tempos: 9,
  ta_duracao_min: 45,
  intervalo_manha_min: 5,
  intervalo_tarde_min: 5,
  hora_inicio_manha: "07:15",
  hora_inicio_tarde: "13:15",
};

async function novoRegime(c: Conta, lado: Lado, nome: string) {
  return sessao(c)
    .from("regimes_de_horario")
    .insert({ curso_id: cursoDe.get(lado)!, nome, ...REGIME });
}

async function idDoRegime(lado: Lado, nome: string): Promise<string> {
  const { data, error } = await servico
    .from("regimes_de_horario")
    .select("id")
    .eq("curso_id", cursoDe.get(lado)!)
    .eq("nome", nome)
    .single();
  conferir(`regime ${nome}`, error);
  return (data as { id: string }).id;
}

beforeAll(async () => {
  await limpar();
  for (const lado of Object.keys(CURSOS) as Lado[]) cursoDe.set(lado, await curso(lado));

  const { data: d, error: eD } = await servico
    .from("disciplinas")
    .insert({
      codigo: "RGN-DIS",
      curso_id: cursoDe.get("regular")!,
      cod_disciplina: "I",
      nome_disciplina: "Disciplina RGN",
      carga_horaria_tempos: 40,
    })
    .select("id")
    .single();
  conferir("disciplina", eD);
  const { data: u, error: eU } = await servico
    .from("unidades_ensino")
    .insert({
      codigo: "RGN-UE",
      disciplina_id: (d as { id: string }).id,
      curso_id: cursoDe.get("regular")!,
      numero_ue: 1,
      topico: "Tópico RGN",
      ch_prevista_tempos: 40,
    })
    .select("id")
    .single();
  conferir("UE", eU);
  const { data: ins, error: eIns } = await servico
    .from("instrutores")
    .insert({
      codigo: "RGN-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor RGN",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  conferir("instrutor", eIns);

  for (const rotulo of ["T1", "T2"]) {
    conferir(
      `turma ${rotulo}`,
      (
        await servico.from("turmas").insert({
          curso_id: cursoDe.get("regular")!,
          turma: rotulo,
          ano_letivo: 2046,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: "2046-03-01",
          data_termino: "2046-11-30",
        })
      ).error,
    );
  }
  const { data: turmas } = await servico
    .from("turmas")
    .select("id, turma")
    .eq("curso_id", cursoDe.get("regular")!)
    .eq("ano_letivo", 2046);
  for (const t of (turmas ?? []) as { id: string; turma: string }[]) {
    if (t.turma === "T1") turmaLivre = t.id;
    else turmaComLancamento = t.id;
  }
  conferir(
    "aula",
    (
      await servico.from("registros_aula").insert({
        codigo: "RGN-A1",
        data: "2046-05-12",
        turma_id: turmaComLancamento,
        curso_id: cursoDe.get("regular")!,
        unidade_ensino_id: (u as { id: string }).id,
        instrutor_id: (ins as { id: string }).id,
        tempos_consumidos: 2,
        ta_inicial: 1,
      })
    ).error,
  );

  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
  // ⚠️ Desativar curso exige sessão com `cursos.desativar` (o gatilho confere): pelo Admin, depois das contas.
  const { data: situacao } = await servico
    .from("cursos")
    .select("status")
    .eq("id", cursoDe.get("inativo")!)
    .single();
  if ((situacao as { status: string }).status === "ativo")
    conferir(
      "curso inativo",
      (
        await sessao("admin")
          .from("cursos")
          .update({ status: "inativo" })
          .eq("id", cursoDe.get("inativo")!)
      ).error,
    );
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

describe("Spec 018 · criar regime nomeado — horarios.criar, com o curso no alcance e em oferta", () => {
  it.each(["admin", "encarregado", "ajudante", "operador"] as const)(
    "%s cria regime no curso que alcança",
    async (c) => {
      const { error } = await novoRegime(c, "regular", `Regime ${c}`);
      expect(error).toBeNull();
      const { data } = await servico
        .from("regimes_de_horario")
        .select("regime_tempos, codigo")
        .eq("curso_id", cursoDe.get("regular")!)
        .eq("nome", `Regime ${c}`)
        .single();
      expect((data as { regime_tempos: number }).regime_tempos).toBe(9);
      expect((data as { codigo: string }).codigo).toMatch(/^RGH-\d{6}$/);
    },
  );

  it.each(["visualizacao", "chefe"] as const)(
    "%s NÃO cria (não tem horarios.criar): 42501 da RLS",
    async (c) => {
      const { error } = await novoRegime(c, "regular", `Regime ${c}`);
      expect(error?.code).toBe("42501");
    },
  );

  it("o operador (escopo regular) NÃO cria no curso expedito, que não alcança: 42501", async () => {
    const { error } = await novoRegime("operador", "expedito", "Regime fora do alcance");
    expect(error?.code).toBe("42501");
  });

  it("o curso fora de oferta não recebe regime novo, nem do Admin: 42501", async () => {
    const { error } = await novoRegime("admin", "inativo", "Regime do inativo");
    expect(error?.code).toBe("42501");
  });
});

describe("Spec 018 · editar e inativar — o Operador edita e NÃO inativa (o caso que discrimina)", () => {
  it("o operador edita o nome e o horário do regime (sem lançamento nas turmas que o usam)", async () => {
    const id = await idDoRegime("regular", "Regime operador");
    const { error } = await sessao("operador")
      .from("regimes_de_horario")
      .update({ nome: "Regime operador editado", hora_inicio_manha: "07:00" })
      .eq("id", id);
    expect(error).toBeNull();
    const { data } = await servico
      .from("regimes_de_horario")
      .select("nome, hora_inicio_manha")
      .eq("id", id)
      .single();
    expect(data).toEqual({ nome: "Regime operador editado", hora_inicio_manha: "07:00:00" });
  });

  it("o operador NÃO inativa: 42501 do gatilho, e o regime continua ativo no banco", async () => {
    const id = await idDoRegime("regular", "Regime operador editado");
    const { error } = await sessao("operador")
      .from("regimes_de_horario")
      .update({ status: "inativo" })
      .eq("id", id);
    expect(error?.code).toBe("42501");
    const { data } = await servico
      .from("regimes_de_horario")
      .select("status")
      .eq("id", id)
      .single();
    expect((data as { status: string }).status).toBe("ativo");
  });

  it.each(["admin", "encarregado", "ajudante"] as const)("%s inativa e reativa", async (c) => {
    const id = await idDoRegime("regular", `Regime ${c}`);
    for (const status of ["inativo", "ativo"] as const) {
      const { error } = await sessao(c).from("regimes_de_horario").update({ status }).eq("id", id);
      expect(error).toBeNull();
      const { data } = await servico
        .from("regimes_de_horario")
        .select("status")
        .eq("id", id)
        .single();
      expect((data as { status: string }).status).toBe(status);
    }
  });

  it("RF-HOR-02 · nem o Admin muda a quantidade de TA: 23514", async () => {
    const id = await idDoRegime("regular", "Regime admin");
    const { error } = await sessao("admin")
      .from("regimes_de_horario")
      .update({ regime_tempos: 10 })
      .eq("id", id);
    expect(error?.code).toBe("23514");
  });

  it("a Visualização não edita: a linha não muda (UPDATE recusado em silêncio pela RLS)", async () => {
    const id = await idDoRegime("regular", "Regime admin");
    const { data: linhas } = await sessao("visualizacao")
      .from("regimes_de_horario")
      .update({ nome: "Invadido" })
      .eq("id", id)
      .select("id");
    expect(linhas ?? []).toHaveLength(0);
    const { data } = await servico.from("regimes_de_horario").select("nome").eq("id", id).single();
    expect((data as { nome: string }).nome).toBe("Regime admin");
  });

  it("o operador (escopo regular) NÃO lê regime do curso expedito", async () => {
    conferir("regime expedito", (await novoRegime("admin", "expedito", "Regime expedito")).error);
    const { data, error } = await sessao("operador")
      .from("regimes_de_horario")
      .select("id")
      .eq("curso_id", cursoDe.get("expedito")!);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});

describe("Spec 018 · a turma escolhe o regime — turmas.editar, e trava no primeiro lançamento", () => {
  it("o operador escolhe o regime numa turma sem lançamento, e o banco guarda", async () => {
    const id = await idDoRegime("regular", "Regime admin");
    const { error } = await sessao("operador")
      .from("turmas")
      .update({ regime_de_horario_id: id })
      .eq("id", turmaLivre);
    expect(error).toBeNull();
    const { data } = await servico
      .from("turmas")
      .select("regime_de_horario_id")
      .eq("id", turmaLivre)
      .single();
    expect((data as { regime_de_horario_id: string }).regime_de_horario_id).toBe(id);
  });

  it("a Visualização não escolhe: a turma não muda", async () => {
    const { data: linhas } = await sessao("visualizacao")
      .from("turmas")
      .update({ regime_de_horario_id: null })
      .eq("id", turmaLivre)
      .select("id");
    expect(linhas ?? []).toHaveLength(0);
    const { data } = await servico
      .from("turmas")
      .select("regime_de_horario_id")
      .eq("id", turmaLivre)
      .single();
    expect((data as { regime_de_horario_id: string | null }).regime_de_horario_id).not.toBeNull();
  });

  it("RF-HOR-05 · com lançamento, nem o Admin troca o regime: 23514, e a turma continua sem regime", async () => {
    const id = await idDoRegime("regular", "Regime admin");
    const { error } = await sessao("admin")
      .from("turmas")
      .update({ regime_de_horario_id: id })
      .eq("id", turmaComLancamento);
    expect(error?.code).toBe("23514");
    const { data } = await servico
      .from("turmas")
      .select("regime_de_horario_id")
      .eq("id", turmaComLancamento)
      .single();
    expect((data as { regime_de_horario_id: string | null }).regime_de_horario_id).toBeNull();
  });

  it("a leitura da tela diz quem está travado, com sessão", async () => {
    const travada = await sessao("admin").rpc(
      "regime_da_turma_travado" as never,
      {
        p_turma: turmaComLancamento,
      } as never,
    );
    const livre = await sessao("admin").rpc(
      "regime_da_turma_travado" as never,
      {
        p_turma: turmaLivre,
      } as never,
    );
    expect(travada.error).toBeNull();
    expect(travada.data).toBe(true);
    expect(livre.data).toBe(false);
  });
});
