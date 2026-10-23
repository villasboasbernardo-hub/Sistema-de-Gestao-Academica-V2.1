/**
 * Spec 024 (Bloco 9) — o rascunho e a publicação do DSA com SESSÃO REAL (DoD 4).
 *
 * - Quem lança (Operador) grava o rascunho pelo RPC, salva e publica; quem só lê (Visualização) é recusado com `42501`.
 * - A escrita DIRETA pela interface de dados (sem o RPC) nasce rascunho — não conta —, e o SALVO não muda fora do Salvar
 *   (`lancamento_salvo_so_pelo_salvar`). É o que impede pular o rascunho e a trava.
 * - A trilha não se escreve direto (sem privilégio de INSERT) e não se apaga.
 *
 * ⚠️ Regra 9.1: curso não se apaga — reaproveitado. Contas, lançamentos e a turma saem no começo e no fim (a trilha é
 *    imutável: a turma da amostra fica, com a trilha, como as dos outros testes que usam trilha só de acréscimo).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb9";
const SENHA = "senha-de-teste-com-12+";
const SIGLA = "B9-CUR";
const MARCA = "Prova B9";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = { operador: "operador", visualizacao: "visualizacao" } as const;
type Conta = keyof typeof CONTAS;
const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b9-${c}@${DOMINIO}`;
let CURSO_ID = "";
let TURMA_ID = "";
let DISC_ID = "";
let INSTRUTOR_ID = "";
let ANO_TURMA = 0;

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limparContas(): Promise<void> {
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-B9-%")).error);
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
        codigo: `USR-B9-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `${MARCA} ${c}`,
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
          nome_curso: "Curso do Bloco 9",
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
  await limparContas();
  /* Uma turma nova a cada execução (o ano sobe): a trilha da semana publicada é imutável e prenderia a anterior. */
  const { data: anos } = await servico.from("turmas").select("ano_letivo").eq("curso_id", CURSO_ID);
  ANO_TURMA = Math.max(
    2050,
    ...((anos ?? []) as { ano_letivo: number }[]).map((a) => a.ano_letivo + 1),
  );
  const { data: turma, error: erroTurma } = await servico
    .from("turmas")
    .insert({
      curso_id: CURSO_ID,
      turma: "T1",
      ano_letivo: ANO_TURMA,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: `${ANO_TURMA}-02-01`,
      data_termino: `${ANO_TURMA}-11-30`,
    } as never)
    .select("id")
    .single();
  conferir("turma", erroTurma);
  TURMA_ID = (turma as { id: string }).id;
  const { data: disc } = await servico
    .from("disciplinas")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();
  if (disc) DISC_ID = (disc as { id: string }).id;
  else {
    const { data: nova, error } = await servico
      .from("disciplinas")
      .insert({
        codigo: "B9-DIS-I",
        curso_id: CURSO_ID,
        cod_disciplina: "I",
        nome_disciplina: "Disciplina B9",
        carga_horaria_tempos: 40,
      } as never)
      .select("id")
      .single();
    conferir("disciplina", error);
    DISC_ID = (nova as { id: string }).id;
  }
  const { data: instrutor } = await servico
    .from("instrutores")
    .select("id")
    .eq("codigo", "B9-INS")
    .maybeSingle();
  if (instrutor) INSTRUTOR_ID = (instrutor as { id: string }).id;
  else {
    const { data: novo, error } = await servico
      .from("instrutores")
      .insert({
        codigo: "B9-INS",
        posto_graduacao: "CT",
        esp_hab_obs: "AA",
        nome_completo: "Instrutor B9",
        categoria: "Militar",
        om: "CIAARA",
      } as never)
      .select("id")
      .single();
    conferir("instrutor", error);
    INSTRUTOR_ID = (novo as { id: string }).id;
  }
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await servico.from("registros_aula").delete().like("conteudo_resumo", `${MARCA}%`);
  await limparContas();
});

/** A segunda-feira da semana ISO 10 do ano da turma, e a semana. */
function semanaDez(): { ano: number; semana: number; de: string; ate: string; dia: string } {
  const quatroDeJaneiro = new Date(Date.UTC(ANO_TURMA, 0, 4));
  const segundaDaSemana1 = new Date(
    quatroDeJaneiro.getTime() - ((quatroDeJaneiro.getUTCDay() + 6) % 7) * 86_400_000,
  );
  const segunda = new Date(segundaDaSemana1.getTime() + 9 * 7 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    ano: ANO_TURMA,
    semana: 10,
    de: iso(segunda),
    ate: iso(new Date(segunda.getTime() + 6 * 86_400_000)),
    dia: iso(new Date(segunda.getTime() + 2 * 86_400_000)),
  };
}

const aula = (id: string, sufixo: string) => ({
  id,
  codigo: `B9-${sufixo}-${id.slice(0, 8)}`,
  turma_id: TURMA_ID,
  curso_id: CURSO_ID,
  disciplina_id: DISC_ID,
  data: semanaDez().dia,
  ta_inicial: 1,
  tempos_consumidos: 2,
  categoria_normativa: "aula",
  conteudo_resumo: `${MARCA} ${sufixo}`,
  instrutor_id: INSTRUTOR_ID,
});

async function taDaTurma(): Promise<number> {
  const { data } = await servico
    .from("vw_carga_horaria_turma")
    .select("ta_aula")
    .eq("turma_id", TURMA_ID)
    .single();
  return Number((data as { ta_aula: number }).ta_aula);
}

describe("Spec 024 · o rascunho e a publicação com sessão real", () => {
  it("o Operador grava o RASCUNHO pelo RPC — e ele não conta", async () => {
    const antes = await taDaTurma();
    const id = crypto.randomUUID();
    const { error } = await sessao("operador").rpc("gravar_rascunho_do_dsa", {
      p_operacoes: [{ acao: "inserir", tabela: "registros_aula", campos: aula(id, "rpc") }],
    });
    expect(error).toBeNull();
    const { data } = await servico.from("registros_aula").select("salvo").eq("id", id).single();
    expect((data as { salvo: boolean }).salvo).toBe(false);
    expect(await taDaTurma()).toBe(antes);
  });

  it("⚠️ o caso que discrimina: a escrita DIRETA (sem o RPC) também nasce rascunho", async () => {
    const id = crypto.randomUUID();
    const { error } = await sessao("operador")
      .from("registros_aula")
      .insert(aula(id, "direta") as never);
    expect(error).toBeNull();
    const { data } = await servico.from("registros_aula").select("salvo").eq("id", id).single();
    expect((data as { salvo: boolean }).salvo).toBe(false);
  });

  it("a Visualização não grava rascunho (42501, linha completa)", async () => {
    const { error } = await sessao("visualizacao").rpc("gravar_rascunho_do_dsa", {
      p_operacoes: [
        { acao: "inserir", tabela: "registros_aula", campos: aula(crypto.randomUUID(), "vis") },
      ],
    });
    expect(error?.code).toBe("42501");
  });

  it("Salvar: conta; e o salvo não muda direto, só pelo Salvar", async () => {
    const s = semanaDez();
    const antes = await taDaTurma();
    const { error } = await sessao("operador").rpc("salvar_semana_do_dsa", {
      p_turma: TURMA_ID,
      p_ano: s.ano,
      p_semana: s.semana,
      p_de: s.de,
      p_ate: s.ate,
    });
    expect(error).toBeNull();
    expect(await taDaTurma()).toBe(antes + 4);
    const { data: salva } = await servico
      .from("registros_aula")
      .select("id")
      .eq("conteudo_resumo", `${MARCA} rpc`)
      .single();
    const direta = await sessao("operador")
      .from("registros_aula")
      .update({ tempos_consumidos: 1 } as never)
      .eq("id", (salva as { id: string }).id);
    expect(direta.error?.code).toBe("42501");
  });

  it("publicar trava: a edição da semana publicada é recusada", async () => {
    const s = semanaDez();
    const publicada = await sessao("operador").rpc("publicar_semana_do_dsa", {
      p_turma: TURMA_ID,
      p_ano: s.ano,
      p_semana: s.semana,
      p_de: s.de,
      p_ate: s.ate,
      p_retrato: { hoje: s.ate, dados: {} },
    });
    expect(publicada.error).toBeNull();
    const nova = await sessao("operador").rpc("gravar_rascunho_do_dsa", {
      p_operacoes: [
        { acao: "inserir", tabela: "registros_aula", campos: aula(crypto.randomUUID(), "travada") },
      ],
    });
    expect(nova.error?.code).toBe("23514");
    expect((nova.error as { hint?: string } | null)?.hint).toBe("semana_do_dsa_publicada");
  });

  it("a trilha não se escreve nem se apaga direto", async () => {
    const insercao = await sessao("operador")
      .from("dsa_eventos_da_semana")
      .insert({ turma_id: TURMA_ID, ano: 2050, semana: 1, tipo: "salvo" } as never);
    expect(insercao.error?.code).toBe("42501");
    const apagar = await servico.from("dsa_eventos_da_semana").delete().eq("turma_id", TURMA_ID);
    expect(apagar.error?.code).toBe("42501");
  });
});
