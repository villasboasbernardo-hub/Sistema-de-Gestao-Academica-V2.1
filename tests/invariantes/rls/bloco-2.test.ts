/**
 * Spec 017, Bloco 2 — quem pode o quê no TA fora do DSA, na história da turma e na ocupação do painel, provado com
 * SESSÃO AUTENTICADA (DoD 4: permissão não mora em pgTAP; toda recusa conferida pelo código `42501`, com a linha
 * completa).
 *
 * Os casos que discriminam (DoD 8):
 *   - o OPERADOR grava aula no DSA (`registros_aula.criar`) e NÃO grava TA fora do DSA (D-COR-3: só o trio);
 *   - o OPERADOR arquiva (tem `turmas.editar`) e NÃO desarquiva; o Encarregado também não; o ADMIN desarquiva (D-COR-5);
 *   - a ocupação do painel devolve a turma que a pessoa não alcança ANÔNIMA (turma nula), e a dela com o código.
 *
 * ⚠️ UMA conta Admin, criada aqui e apagada no `afterAll`: as suítes de invariantes rodam EM SÉRIE
 *    (`--no-file-parallelism`), e o `rls.test.ts` só pressupõe ser o único Admin enquanto ELE roda (gotcha 8) — o
 *    mesmo acordo de `rateio-da-view.test.ts`.
 * ⚠️ A trilha e o arquivamento são imutáveis inclusive para a service_role: as linhas desta suíte ficam (sem FK,
 *    turma de amostra apagada), como as de `previstos_proens_alteracoes`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeblc2";
const SENHA = "senha-de-teste-com-12+";
const SEMANA = { de: "2046-05-11", ate: "2046-05-16" };

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: { perfil: "admin", escopo: "geral" },
  encarregado: { perfil: "encarregado_administracao_academica", escopo: "geral" },
  ajudante: { perfil: "ajudante_administracao_academica", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "BLC2-REG", classificacao: "regular" },
  expedito: { codigo: "BLC2-EXP", classificacao: "expedito" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const uids = new Map<Conta, string>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `blc2-${c}@${DOMINIO}`;
const turmaDe = new Map<Lado, string>();
const codigoDaTurma = new Map<Lado, string>();
const disciplinaDe = new Map<Lado, string>();
const linhaDe = new Map<Lado, string>();

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
  uids.set(c, data.user!.id);
  conferir(
    `cadastro ${c}`,
    (
      await servico.from("usuarios").insert({
        codigo: `USR-BLC2-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova BLC2 ${c}`,
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

async function cursoDe(lado: Lado): Promise<string> {
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
  conferir(
    "usuarios",
    (await servico.from("usuarios").delete().like("codigo", "USR-BLC2-%")).error,
  );
  conferir("aulas", (await servico.from("registros_aula").delete().like("codigo", "BLC2-%")).error);
  for (const lado of Object.keys(CURSOS) as Lado[]) {
    const { data: c } = await servico
      .from("cursos")
      .select("id")
      .eq("codigo", CURSOS[lado].codigo)
      .maybeSingle();
    if (!c) continue;
    const { data: turmas } = await servico
      .from("turmas")
      .select("id")
      .eq("curso_id", (c as { id: string }).id);
    for (const t of (turmas ?? []) as { id: string }[]) {
      conferir(
        "fora do DSA",
        (await servico.from("ta_fora_do_dsa").delete().eq("turma_id", t.id)).error,
      );
      conferir(
        "linhas da turma",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
  }
  conferir("UEs", (await servico.from("unidades_ensino").delete().like("codigo", "BLC2-%")).error);
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "BLC2-%")).error,
  );
  conferir(
    "instrutores",
    (await servico.from("instrutores").delete().like("codigo", "BLC2-%")).error,
  );
}

beforeAll(async () => {
  await limpar();
  const { data: ins, error: eIns } = await servico
    .from("instrutores")
    .insert({
      codigo: "BLC2-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor BLC2",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  conferir("instrutor", eIns);
  const instrutorId = (ins as { id: string }).id;

  for (const lado of Object.keys(CURSOS) as Lado[]) {
    const cursoId = await cursoDe(lado);
    const sufixo = lado.toUpperCase();
    const { data: d, error: eD } = await servico
      .from("disciplinas")
      .insert({
        codigo: `BLC2-DIS-${sufixo}`,
        curso_id: cursoId,
        cod_disciplina: "I",
        nome_disciplina: `Disciplina BLC2 ${lado}`,
        carga_horaria_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`disciplina ${lado}`, eD);
    disciplinaDe.set(lado, (d as { id: string }).id);
    const { data: u, error: eU } = await servico
      .from("unidades_ensino")
      .insert({
        codigo: `BLC2-UE-${sufixo}`,
        disciplina_id: (d as { id: string }).id,
        curso_id: cursoId,
        numero_ue: 1,
        topico: `Tópico BLC2 ${lado}`,
        ch_prevista_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`UE ${lado}`, eU);
    conferir(
      `turma ${lado}`,
      (
        await servico.from("turmas").insert({
          curso_id: cursoId,
          ano_letivo: 2046,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: "2046-03-01",
          data_termino: "2046-11-30",
        })
      ).error,
    );
    const { data: t } = await servico
      .from("turmas")
      .select("id, codigo")
      .eq("curso_id", cursoId)
      .eq("ano_letivo", 2046)
      .single();
    turmaDe.set(lado, (t as { id: string }).id);
    codigoDaTurma.set(lado, (t as { codigo: string }).codigo);
    const { data: l } = await servico
      .from("turma_disciplina")
      .select("id")
      .eq("turma_id", (t as { id: string }).id)
      .single();
    linhaDe.set(lado, (l as { id: string }).id);
    // O MESMO instrutor no MESMO dia e TA nas duas turmas: o conflito do painel.
    conferir(
      `aula ${lado}`,
      (
        await servico.from("registros_aula").insert({
          codigo: `BLC2-${sufixo}-A1`,
          data: "2046-05-12",
          ta_inicial: 1,
          tempos_consumidos: 2,
          turma_id: (t as { id: string }).id,
          curso_id: cursoId,
          unidade_ensino_id: (u as { id: string }).id,
          instrutor_id: instrutorId,
        })
      ).error,
    );
  }
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await limpar();
});

/** A linha completa de um TA fora do DSA na turma regular. */
function foraDoDsa(observacao: string, tempos = 2) {
  return {
    turma_disciplina_id: linhaDe.get("regular")!,
    turma_id: turmaDe.get("regular")!,
    disciplina_id: disciplinaDe.get("regular")!,
    data: "2046-05-13",
    tempos,
    observacao,
  };
}

describe("D-COR-3 · TA fora do DSA: grava só o trio", () => {
  it.each(["encarregado", "ajudante", "admin"] as const)(
    "controle positivo · %s registra",
    async (c) => {
      const { error } = await sessao(c)
        .from("ta_fora_do_dsa")
        .insert(foraDoDsa(`Registro do ${c}`));
      expect(error).toBeNull();
      const { data } = await servico
        .from("ta_fora_do_dsa")
        .select("criado_por, codigo")
        .eq("observacao", `Registro do ${c}`)
        .single();
      expect((data as { criado_por: string }).criado_por).toBe(uids.get(c));
      expect((data as { codigo: string }).codigo).toMatch(/^TFD-\d{6}$/);
    },
  );

  it("⚠️ o caso que discrimina: o OPERADOR grava aula no DSA e NÃO grava TA fora do DSA — 42501", async () => {
    const { error: aula } = await sessao("operador")
      .from("registros_aula")
      .insert({
        codigo: "BLC2-REG-OPER",
        data: "2046-05-14",
        ta_inicial: 3,
        tempos_consumidos: 1,
        turma_id: turmaDe.get("regular")!,
        curso_id: await cursoDe("regular"),
        unidade_ensino_id: (
          (
            await servico
              .from("unidades_ensino")
              .select("id")
              .eq("codigo", "BLC2-UE-REGULAR")
              .single()
          ).data as {
            id: string;
          }
        ).id,
        instrutor_id: (
          (await servico.from("instrutores").select("id").eq("codigo", "BLC2-INS").single())
            .data as { id: string }
        ).id,
      });
    expect(aula, "o operador deveria gravar aula no DSA").toBeNull();
    const { error } = await sessao("operador")
      .from("ta_fora_do_dsa")
      .insert(foraDoDsa("Registro do operador"));
    expect(error?.code).toBe("42501");
  });

  it("anon é recusado — 42501", async () => {
    const anonimo = createClient(URL_SUPABASE, CHAVE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anonimo.from("ta_fora_do_dsa").insert(foraDoDsa("Registro anônimo"));
    expect(error?.code).toBe("42501");
  });

  it("⚠️ o operador também não desfaz: o UPDATE dele não alcança linha nenhuma (gotcha 4), e o banco fica igual", async () => {
    const { data, error } = await sessao("operador")
      .from("ta_fora_do_dsa")
      .update({ status: "inativo" })
      .eq("observacao", "Registro do encarregado")
      .select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: linha } = await servico
      .from("ta_fora_do_dsa")
      .select("status")
      .eq("observacao", "Registro do encarregado")
      .single();
    expect((linha as { status: string }).status).toBe("ativo");
  });

  it("o Encarregado desfaz, e a quantidade não se edita (ta_fora_so_desfaz)", async () => {
    const editar = await sessao("encarregado")
      .from("ta_fora_do_dsa")
      .update({ tempos: 9 })
      .eq("observacao", "Registro do encarregado");
    expect(editar.error?.code).toBe("23514");
    expect(editar.error?.hint).toBe("ta_fora_so_desfaz");
    const desfazer = await sessao("encarregado")
      .from("ta_fora_do_dsa")
      .update({ status: "inativo" })
      .eq("observacao", "Registro do encarregado")
      .select("id");
    expect(desfazer.error).toBeNull();
    expect(desfazer.data).toHaveLength(1);
  });

  it("a soma até hoje da turma inclui o que sobrou ativo (ajudante 2 + admin 2) e a aula", async () => {
    const { data, error } = await sessao("encarregado").rpc("chd_da_turma_ate", {
      p_ate: "2046-12-31",
    });
    expect(error).toBeNull();
    const linha = ((data ?? []) as { turma_id: string; chd_executada: number }[]).find(
      (l) => l.turma_id === turmaDe.get("regular"),
    );
    expect(Number(linha?.chd_executada)).toBe(2 + 1 + 2 + 2);
  });
});

describe("D-COR-4 · a trilha da situação", () => {
  it("a troca pela função anota quem trocou e a observação; quem lê a turma lê a trilha", async () => {
    const { error } = await sessao("operador").rpc("trocar_situacao_da_turma", {
      p_codigo: codigoDaTurma.get("regular")!,
      p_status: "concluida",
      p_observacao: "Curso encerrado",
    });
    expect(error).toBeNull();
    const { data } = await sessao("operador")
      .from("turma_trocas_de_situacao")
      .select("situacao_anterior, situacao_nova, observacao, autor_id")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(data).toEqual([
      {
        situacao_anterior: "ativa",
        situacao_nova: "concluida",
        observacao: "Curso encerrado",
        autor_id: uids.get("operador"),
      },
    ]);
  });

  it("ninguém escreve na trilha direto — 42501", async () => {
    const { error } = await sessao("encarregado")
      .from("turma_trocas_de_situacao")
      .insert({
        turma_id: turmaDe.get("regular")!,
        situacao_anterior: "concluida",
        situacao_nova: "ativa",
        observacao: "forjada",
      });
    expect(error?.code).toBe("42501");
  });

  it("a turma fora do alcance: a função recusa (42501), não troca calada", async () => {
    const { error } = await sessao("operador").rpc("trocar_situacao_da_turma", {
      p_codigo: codigoDaTurma.get("expedito")!,
      p_status: "concluida",
      p_observacao: null as unknown as string,
    });
    expect(error?.code).toBe("42501");
    expect(error?.hint).toBe("turma_fora_do_alcance");
  });
});

describe("D-COR-5 · arquivar: quem edita a turma arquiva, só o Admin desarquiva", () => {
  it("o OPERADOR arquiva", async () => {
    const { error } = await sessao("operador")
      .from("turma_arquivamentos")
      .insert({ turma_id: turmaDe.get("regular")!, acao: "arquivar", observacao: "Encerrada" });
    expect(error).toBeNull();
    const { data } = await sessao("operador")
      .from("vw_turmas_arquivadas")
      .select("turma_id, arquivada_por, observacao")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(data).toEqual([
      {
        turma_id: turmaDe.get("regular"),
        arquivada_por: uids.get("operador"),
        observacao: "Encerrada",
      },
    ]);
  });

  it.each(["operador", "encarregado"] as const)(
    "⚠️ o caso que discrimina: %s NÃO desarquiva — 42501",
    async (c) => {
      const { error } = await sessao(c)
        .from("turma_arquivamentos")
        .insert({ turma_id: turmaDe.get("regular")!, acao: "desarquivar" });
      expect(error?.code).toBe("42501");
    },
  );

  it("controle positivo · o Admin desarquiva", async () => {
    const { error } = await sessao("admin")
      .from("turma_arquivamentos")
      .insert({ turma_id: turmaDe.get("regular")!, acao: "desarquivar" });
    expect(error).toBeNull();
    const { data } = await servico
      .from("vw_turmas_arquivadas")
      .select("turma_id")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(data).toEqual([]);
  });

  it("o operador não arquiva turma que não alcança — 42501", async () => {
    const { error } = await sessao("operador")
      .from("turma_arquivamentos")
      .insert({ turma_id: turmaDe.get("expedito")!, acao: "arquivar" });
    expect(error?.code).toBe("42501");
  });
});

describe("FR-005.2 · a ocupação do painel: a turma que não se alcança sai anônima", () => {
  it("o operador de cursos regulares vê a turma dele com o código e a do expedito sem turma", async () => {
    const { data, error } = await sessao("operador").rpc("ocupacao_para_conflitos", {
      p_de: SEMANA.de,
      p_ate: SEMANA.ate,
    });
    expect(error).toBeNull();
    const linhas = (data ?? []) as {
      turma_id: string | null;
      data: string;
      instrutor_id: string | null;
    }[];
    const doDia = linhas.filter((l) => l.data === "2046-05-12");
    expect(doDia.some((l) => l.turma_id === turmaDe.get("regular"))).toBe(true);
    expect(doDia.some((l) => l.turma_id === turmaDe.get("expedito"))).toBe(false);
    expect(doDia.some((l) => l.turma_id === null)).toBe(true);
  });

  it("controle positivo · o Encarregado de escopo geral vê as duas com o código", async () => {
    const { data, error } = await sessao("encarregado").rpc("ocupacao_para_conflitos", {
      p_de: SEMANA.de,
      p_ate: SEMANA.ate,
    });
    expect(error).toBeNull();
    const turmas = new Set(((data ?? []) as { turma_id: string | null }[]).map((l) => l.turma_id));
    expect(turmas.has(turmaDe.get("regular")!)).toBe(true);
    expect(turmas.has(turmaDe.get("expedito")!)).toBe(true);
  });

  it("anon não executa — 42501", async () => {
    const anonimo = createClient(URL_SUPABASE, CHAVE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anonimo.rpc("ocupacao_para_conflitos", {
      p_de: SEMANA.de,
      p_ate: SEMANA.ate,
    });
    expect(error?.code).toBe("42501");
  });
});
