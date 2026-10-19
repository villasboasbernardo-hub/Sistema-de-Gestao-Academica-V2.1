/**
 * Spec 016, PR 3 · M1 — `chd_da_turma_ate` e `execucao_por_disciplina_ate` NÃO furam a RLS, provado com SESSÃO
 * AUTENTICADA (FR-014.5; DoD 4: permissão não mora em pgTAP).
 *
 * As duas funções são `security invoker`: a soma passa pela RLS de quem lê. O caso que discrimina (DoD 8) é o
 * OPERADOR de alcance restrito — o de cursos regulares recebe só a turma do curso regular, e o de cursos expeditos só
 * a do expedito. Com a função `security definer`, os dois receberiam as duas turmas, e este teste reprova.
 *
 * ⚠️ O CONTROLE POSITIVO É O ENCARREGADO de escopo geral, e não o Admin: nenhuma conta desta suíte é `admin`
 *    (gotcha 8 — `rls.test.ts` pressupõe ser o único Admin). O Encarregado alcança todos os cursos, que é o que o
 *    controle precisa mostrar: a função devolve as turmas que a RLS deixa ver, e não só uma.
 * ⚠️ `anon` não executa: a recusa é conferida pelo CÓDIGO `42501`.
 * ⚠️ Cursos reaproveitados (regra 9.1); o resto nasce e sai a cada execução, com o erro de cada limpeza conferido.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeexat";
const SENHA = "senha-de-teste-com-12+";
const ATE = "2046-12-31";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  operador: { perfil: "operador", escopo: "regular" },
  operadorDeFora: { perfil: "operador", escopo: "expedito" },
  encarregado: { perfil: "encarregado_administracao_academica", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "EXAT-REG", classificacao: "regular" },
  expedito: { codigo: "EXAT-EXP", classificacao: "expedito" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `exat-${c.toLowerCase()}@${DOMINIO}`;
const turmaDe = new Map<Lado, string>();
const disciplinaDe = new Map<Lado, string>();

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
  const { error: e2 } = await servico.from("usuarios").insert({
    codigo: `USR-EXAT-${c.toUpperCase()}`,
    auth_user_id: data.user!.id,
    email: email(c),
    nome: `Prova EXAT ${c}`,
    perfil: CONTAS[c].perfil,
    escopo_curso: CONTAS[c].escopo,
  });
  conferir(`cadastro ${c}`, e2);
  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: e3 } = await cliente.auth.signInWithPassword({ email: email(c), password: SENHA });
  conferir(`login ${c}`, e3);
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
    (await servico.from("usuarios").delete().like("codigo", "USR-EXAT-%")).error,
  );
  conferir("aulas", (await servico.from("registros_aula").delete().like("codigo", "EXAT-%")).error);
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
        "linhas da turma",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
  }
  conferir("UEs", (await servico.from("unidades_ensino").delete().like("codigo", "EXAT-%")).error);
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "EXAT-%")).error,
  );
  conferir(
    "instrutores",
    (await servico.from("instrutores").delete().like("codigo", "EXAT-%")).error,
  );
}

beforeAll(async () => {
  await limpar();
  const { data: ins, error: eIns } = await servico
    .from("instrutores")
    .insert({
      codigo: "EXAT-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor EXAT",
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
        codigo: `EXAT-DIS-${sufixo}`,
        curso_id: cursoId,
        cod_disciplina: "I",
        nome_disciplina: `Disciplina EXAT ${lado}`,
        carga_horaria_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`disciplina ${lado}`, eD);
    disciplinaDe.set(lado, (d as { id: string }).id);
    const { data: u, error: eU } = await servico
      .from("unidades_ensino")
      .insert({
        codigo: `EXAT-UE-${sufixo}`,
        disciplina_id: (d as { id: string }).id,
        curso_id: cursoId,
        numero_ue: 1,
        topico: `Tópico EXAT ${lado}`,
        ch_prevista_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`UE ${lado}`, eU);
    const { error: eT } = await servico.from("turmas").insert({
      curso_id: cursoId,
      ano_letivo: 2046,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: "2046-03-01",
      data_termino: "2046-11-30",
    });
    conferir(`turma ${lado}`, eT);
    const { data: t } = await servico
      .from("turmas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("ano_letivo", 2046)
      .single();
    const turmaId = (t as { id: string }).id;
    turmaDe.set(lado, turmaId);
    const { error: eA } = await servico.from("registros_aula").insert({
      codigo: `EXAT-${sufixo}-A1`,
      data: "2046-05-12",
      ta_inicial: 1,
      tempos_consumidos: lado === "regular" ? 3 : 5,
      turma_id: turmaId,
      curso_id: cursoId,
      unidade_ensino_id: (u as { id: string }).id,
      instrutor_id: instrutorId,
    });
    conferir(`aula ${lado}`, eA);
  }
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await limpar();
});

/** As turmas desta suíte que a função devolve para a conta, com a soma. */
async function turmasVistas(c: Conta): Promise<Map<string, number>> {
  const { data, error } = await sessao(c).rpc("chd_da_turma_ate", { p_ate: ATE });
  expect(error, `a função recusou a conta ${c}`).toBeNull();
  const nossas = new Set(turmaDe.values());
  return new Map(
    ((data ?? []) as { turma_id: string; chd_executada: number }[])
      .filter((l) => nossas.has(l.turma_id))
      .map((l) => [l.turma_id, Number(l.chd_executada)]),
  );
}

describe("FR-014.5 · as funções da M1 respeitam a RLS de quem lê (security invoker)", () => {
  it("⚠️ o operador de cursos REGULARES recebe só a turma do curso regular", async () => {
    const vistas = await turmasVistas("operador");
    expect([...vistas.entries()]).toEqual([[turmaDe.get("regular"), 3]]);
  });

  it("⚠️ o operador de cursos EXPEDITOS recebe só a turma do curso expedito", async () => {
    const vistas = await turmasVistas("operadorDeFora");
    expect([...vistas.entries()]).toEqual([[turmaDe.get("expedito"), 5]]);
  });

  it("controle positivo · o Encarregado, de escopo geral, recebe as DUAS", async () => {
    const vistas = await turmasVistas("encarregado");
    expect(vistas.get(turmaDe.get("regular")!)).toBe(3);
    expect(vistas.get(turmaDe.get("expedito")!)).toBe(5);
  });

  it("⚠️ pedir a execução por disciplina de uma turma FORA do alcance volta VAZIO (gotcha 4), e não a soma", async () => {
    const { data, error } = await sessao("operador").rpc("execucao_por_disciplina_ate", {
      p_ate: ATE,
      p_turma_id: turmaDe.get("expedito")!,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: dentro, error: e2 } = await sessao("operador").rpc(
      "execucao_por_disciplina_ate",
      {
        p_ate: ATE,
        p_turma_id: turmaDe.get("regular")!,
      },
    );
    expect(e2).toBeNull();
    expect(dentro).toEqual([
      {
        disciplina_id: disciplinaDe.get("regular"),
        ta_executados: 3,
        data_real_inicio: "2046-05-12",
      },
    ]);
  });

  it("anon NÃO executa as funções — recusa 42501", async () => {
    const anonimo = createClient(URL_SUPABASE, CHAVE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const uma = await anonimo.rpc("chd_da_turma_ate", { p_ate: ATE });
    expect(uma.error?.code).toBe("42501");
    const outra = await anonimo.rpc("execucao_por_disciplina_ate", {
      p_ate: ATE,
      p_turma_id: turmaDe.get("regular")!,
    });
    expect(outra.error?.code).toBe("42501");
  });
});
