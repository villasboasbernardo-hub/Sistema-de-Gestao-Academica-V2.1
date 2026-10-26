/**
 * Spec 026 (Bloco 11, RD-3) — o regime de tempos da semana do DSA com SESSÃO REAL (DoD 4 e DoD 8).
 *
 * - Quem lança (Operador) troca o regime «só esta semana» e «desta semana em diante»; quem só lê (Visualização) é
 *   recusado com `42501`, e nada é gravado.
 * - As duas tabelas não se escrevem direto (sem privilégio de INSERT/UPDATE): só pelas RPCs.
 * - ⚠️ O CASO QUE DISCRIMINA: uma semana SALVA depois do «desde» é gravada com o regime que tinha ANTES de a vigência
 *   valer (8), e a seguinte, não salva, abre com o novo (9); «só esta semana» numa semana salva é recusado.
 * - Regime de outro curso é recusado.
 *
 * ⚠️ Regra 9.1: curso não se apaga — os dois cursos e os regimes são reaproveitados; a turma é nova a cada execução (a
 *    trilha da semana salva é imutável e a prenderia).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb11";
const SENHA = "senha-de-teste-com-12+";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = { operador: "operador", visualizacao: "visualizacao" } as const;
type Conta = keyof typeof CONTAS;
const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b11-${c}@${DOMINIO}`;
let TURMA_ID = "";
let ANO_TURMA = 0;
let REGIME_DE_9 = "";
let REGIME_DE_OUTRO_CURSO = "";

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limparContas(): Promise<void> {
  conferir(
    "usuarios",
    (await servico.from("usuarios").delete().like("codigo", "USR-B11R-%")).error,
  );
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
        codigo: `USR-B11R-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Regime B11 ${c}`,
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

/** O curso (reaproveitado: curso não se apaga) e um regime nomeado de 9 tempos dele. */
async function cursoComRegimeDe9(sigla: string): Promise<{ curso: string; regime: string }> {
  const { data: existe } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  let curso = (existe as { id: string } | null)?.id ?? "";
  if (curso === "") {
    const { data, error } = await servico.rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: sigla,
          nome_curso: `Curso ${sigla}`,
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
    conferir(`curso ${sigla}`, error);
    curso = (data as unknown as { id: string }).id;
  }
  const { data: curriculo } = await servico
    .from("curriculos")
    .select("id")
    .eq("curso_id", curso)
    .limit(1)
    .single();
  const nome = `Regime de 9 ${sigla}`;
  const { data: regime } = await servico
    .from("regimes_de_horario")
    .select("id")
    .eq("curso_id", curso)
    .eq("nome", nome)
    .maybeSingle();
  if (regime) return { curso, regime: (regime as { id: string }).id };
  const { data: novo, error } = await servico
    .from("regimes_de_horario")
    .insert({
      curso_id: curso,
      curriculo_id: (curriculo as { id: string }).id,
      nome,
      regime_tempos: 9,
      ta_duracao_min: 45,
      intervalo_manha_min: 10,
      intervalo_tarde_min: 10,
      hora_inicio_manha: "07:30",
      hora_inicio_tarde: "13:00",
    } as never)
    .select("id")
    .single();
  conferir(`regime ${sigla}`, error);
  return { curso, regime: (novo as { id: string }).id };
}

beforeAll(async () => {
  const principal = await cursoComRegimeDe9("B11R-CUR");
  REGIME_DE_9 = principal.regime;
  REGIME_DE_OUTRO_CURSO = (await cursoComRegimeDe9("B11R-OUT")).regime;
  await limparContas();
  const { data: anos } = await servico
    .from("turmas")
    .select("ano_letivo")
    .eq("curso_id", principal.curso);
  ANO_TURMA = Math.max(
    2050,
    ...((anos ?? []) as { ano_letivo: number }[]).map((a) => a.ano_letivo + 1),
  );
  const { data: turma, error } = await servico
    .from("turmas")
    .insert({
      curso_id: principal.curso,
      turma: "T1",
      ano_letivo: ANO_TURMA,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: `${ANO_TURMA}-02-01`,
      data_termino: `${ANO_TURMA}-11-30`,
    } as never)
    .select("id")
    .single();
  conferir("turma", error);
  TURMA_ID = (turma as { id: string }).id;
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await servico.from("dsa_regime_da_semana").delete().eq("turma_id", TURMA_ID);
  await servico.from("turma_regime_vigencia").delete().eq("turma_id", TURMA_ID);
  await limparContas();
});

/** A segunda-feira da semana ISO `n` do ano da turma. */
function segundaDaSemana(n: number): string {
  const quatroDeJaneiro = new Date(Date.UTC(ANO_TURMA, 0, 4));
  const segundaDa1 =
    quatroDeJaneiro.getTime() - ((quatroDeJaneiro.getUTCDay() + 6) % 7) * 86_400_000;
  return new Date(segundaDa1 + (n - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
}

const linhaDaSemana = async (semana: number) =>
  (
    await servico
      .from("dsa_regime_da_semana")
      .select("origem, regime_de_horario_id, regime_tempos")
      .eq("turma_id", TURMA_ID)
      .eq("ano", ANO_TURMA)
      .eq("semana", semana)
      .eq("status", "ativo")
      .maybeSingle()
  ).data as {
    origem: string;
    regime_de_horario_id: string | null;
    regime_tempos: number | null;
  } | null;

describe("Spec 026 · RD-3 · o regime de tempos da semana com sessão real", () => {
  it("a Visualização não troca o regime (42501), e nada é gravado", async () => {
    const { error } = await sessao("visualizacao").rpc("definir_regime_do_dsa_desde", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 9,
      p_regime: REGIME_DE_9,
    });
    expect(error?.code).toBe("42501");
    const { count } = await servico
      .from("turma_regime_vigencia")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", TURMA_ID);
    expect(count).toBe(0);
  });

  it("ninguém escreve direto nas duas tabelas (sem privilégio de INSERT)", async () => {
    const direta = await sessao("operador")
      .from("turma_regime_vigencia")
      .insert({
        turma_id: TURMA_ID,
        vigente_de: segundaDaSemana(5),
        regime_de_horario_id: REGIME_DE_9,
      } as never);
    expect(direta.error?.code).toBe("42501");
    const daSemana = await sessao("operador")
      .from("dsa_regime_da_semana")
      .insert({
        turma_id: TURMA_ID,
        ano: ANO_TURMA,
        semana: 5,
        origem: "so_esta_semana",
      } as never);
    expect(daSemana.error?.code).toBe("42501");
  });

  it("controle positivo · o Operador troca «só esta semana» numa semana não salva", async () => {
    const { error } = await sessao("operador").rpc("definir_regime_do_dsa_so_nesta_semana", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 6,
      p_regime: REGIME_DE_9,
    });
    expect(error).toBeNull();
    expect(await linhaDaSemana(6)).toEqual({
      origem: "so_esta_semana",
      regime_de_horario_id: REGIME_DE_9,
      regime_tempos: 9,
    });
    /* E quem só lê ENXERGA o regime da semana (a policy de leitura). */
    const { data } = await sessao("visualizacao")
      .from("dsa_regime_da_semana")
      .select("semana")
      .eq("turma_id", TURMA_ID);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("regime de OUTRO curso é recusado", async () => {
    const { error } = await sessao("operador").rpc("definir_regime_do_dsa_so_nesta_semana", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 7,
      p_regime: REGIME_DE_OUTRO_CURSO,
    });
    expect(error?.code).toBe("23514");
    expect(error?.hint).toBe("regime_de_outro_curso");
  });

  it("⚠️ o caso que discrimina · a semana SALVA depois do «desde» fica com 8; a seguinte abre com 9", async () => {
    /* A semana 10 salva (o evento da trilha, pelo Salvar do Operador). */
    const segunda = segundaDaSemana(10);
    const sabado = new Date(Date.parse(`${segunda}T00:00:00Z`) + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const salvo = await sessao("operador").rpc("salvar_semana_do_dsa", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 10,
      p_de: segunda,
      p_ate: sabado,
    });
    expect(salvo.error).toBeNull();

    /* «Só esta semana» na salva: recusado. */
    const naSalva = await sessao("operador").rpc("definir_regime_do_dsa_so_nesta_semana", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 10,
      p_regime: REGIME_DE_9,
    });
    expect(naSalva.error?.code).toBe("23514");
    expect(naSalva.error?.hint).toBe("semana_do_dsa_salva");

    /* «Desde» a semana 9 com 9 tempos. */
    const desde = await sessao("operador").rpc("definir_regime_do_dsa_desde", {
      p_turma: TURMA_ID,
      p_ano: ANO_TURMA,
      p_semana: 9,
      p_regime: REGIME_DE_9,
    });
    expect(desde.error).toBeNull();
    expect(desde.data).toBe(1);
    expect(await linhaDaSemana(10)).toEqual({
      origem: "gravado",
      regime_de_horario_id: null,
      regime_tempos: null,
    });
    expect(await linhaDaSemana(11)).toBeNull();
    const { data: vigencia } = await servico
      .from("turma_regime_vigencia")
      .select("vigente_de, regime_de_horario_id")
      .eq("turma_id", TURMA_ID)
      .eq("status", "ativo")
      .single();
    expect(vigencia).toEqual({ vigente_de: segundaDaSemana(9), regime_de_horario_id: REGIME_DE_9 });
  });
});
