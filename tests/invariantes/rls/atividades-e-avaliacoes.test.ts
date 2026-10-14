/**
 * Spec 014 · `FR-024` a `FR-025.1`, `FR-028.1`, `FR-065` — quem lança dia parado, atividade global
 * bloqueante e limite do currículo, provado com SESSÃO AUTENTICADA (DoD 4: permissão não mora em pgTAP).
 *
 * ⚠️ O CASO QUE DISCRIMINA (DoD 8) É O AJUDANTE: ele tem `atividades_globais.criar` e NÃO tem
 * `calendario.criar` (medido na matriz `perfil_permissao` em 14/10/2026). Ele cria a AEC global — o
 * controle positivo — e recebe `42501` no dia parado global e no TR global com `bloqueia_aula`, que
 * passaram a pedir `calendario.criar` na E-1/E-2. Antes delas, o TR global bloqueante não existia como
 * coluna, e o dia parado não existia como tabela: a suíte reprova na `main` pela ausência.
 *
 * ⚠️ A recusa é conferida pelo CÓDIGO `42501`, com a linha completa (o `23514` de um CHECK passaria pelo
 * motivo errado), e o `UPDATE` recusado volta VAZIO com o valor intacto no banco (gotcha 4).
 *
 * ⚠️ Nenhuma conta é `admin` (gotcha 8). Identificadores gerados, nunca fixos (regra 9.1).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeaav";
const SENHA = "senha-de-teste-com-12+";
const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const MARCA = "semeado pela suite de atividades e avaliacoes";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAPEIS = [
  "operador",
  "ajudante_administracao_academica",
  "encarregado_administracao_academica",
] as const;
type Papel = (typeof PAPEIS)[number];
const ESCOPO: Record<Papel, string> = {
  operador: "regular",
  ajudante_administracao_academica: "geral",
  encarregado_administracao_academica: "geral",
};

const sessoes = new Map<Papel, SupabaseClient>();
const sessao = (p: Papel) => sessoes.get(p)!;
const email = (p: Papel) => `aav-${p}@${DOMINIO}`;

let cursoRegularId = "";
let cursoExpeditoId = "";
let turmaRegularId = "";
let turmaExpeditaId = "";
let paradaLaId = "";
let tipoAecId = "";
let tipoTrId = "";
const DIA = "2026-04-08";

async function criarConta(p: Papel): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(p),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`conta ${p}: ${error.message}`);
  const { error: e2 } = await servico.from("usuarios").insert({
    codigo: `USR-AAV-${p}`,
    auth_user_id: data.user.id,
    email: email(p),
    nome: `Prova AAV ${p}`,
    perfil: p,
    escopo_curso: ESCOPO[p],
  });
  if (e2) throw new Error(`cadastro ${p}: ${e2.message}`);
  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: e3 } = await cliente.auth.signInWithPassword({ email: email(p), password: SENHA });
  if (e3) throw new Error(`login ${p}: ${e3.message}`);
  sessoes.set(p, cliente);
}

async function curso(sigla: string, classificacao: string): Promise<string> {
  const { data: existente } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  if (existente) return (existente as { id: string }).id;
  const { data, error } = await servico
    .rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: sigla,
          nome_curso: `Curso ${sigla}`,
          classificacao,
          modalidade: "presencial",
          duracao_dias: 20,
        },
        p_regime: {
          regime_tempos: 8,
          ta_duracao_min: 45,
          intervalo_manha_min: 5,
          intervalo_tarde_min: 5,
          hora_inicio_manha: "07:50",
          hora_inicio_tarde: "13:05",
          vigente_de: "2020-01-01",
        },
      } as never,
    )
    .single();
  if (error) throw new Error(`curso ${sigla}: ${error.message}`);
  return (data as { id: string }).id;
}

async function turma(cursoId: string): Promise<string> {
  const { data, error } = await servico
    .from("turmas")
    .insert({
      curso_id: cursoId,
      turma: "T1",
      ano_letivo: 2026,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: "2026-03-02",
      data_termino: "2026-06-30",
    })
    .select("id")
    .single();
  if (error) throw new Error(`turma: ${error.message}`);
  return (data as { id: string }).id;
}

async function idDaLista(lista: string, valor: string, metadados: object | null): Promise<string> {
  const { data } = await servico
    .from("config_listas")
    .select("id")
    .eq("lista", lista)
    .eq("valor", valor)
    .maybeSingle();
  if (data) return (data as { id: string }).id;
  const { data: novo, error } = await servico
    .from("config_listas")
    .insert({ lista, valor, rotulo_exibicao: valor, metadados: metadados ?? {}, observacao: MARCA })
    .select("id")
    .single();
  if (error) throw new Error(`lista ${lista}/${valor}: ${error.message}`);
  return (novo as { id: string }).id;
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
  await servico.from("usuarios").delete().like("codigo", "USR-AAV-%");
  const { data: turmas } = await servico.from("turmas").select("id").like("codigo", "AAV-%");
  for (const t of turmas ?? []) {
    const id = (t as { id: string }).id;
    await servico.from("atividades_nao_letivas").delete().eq("turma_id", id);
    await servico.from("dias_parados").delete().eq("turma_id", id);
    await servico.from("turmas").delete().eq("id", id);
  }
  await servico.from("atividades_nao_letivas").delete().like("codigo", "AAV-%");
  await servico.from("dias_parados").delete().like("motivo", "AAV %");
  await servico.from("limites_curriculo").delete().like("fonte_arquivo", "aav-%");
  await servico.from("config_listas").delete().eq("observacao", MARCA);
}

/** A linha completa de uma atividade — o negativo manda tudo, para que só a RLS possa recusar. */
function atividade(codigo: string, turmaId: string | null, extra: Record<string, unknown> = {}) {
  return {
    codigo,
    categoria_normativa: "AEC",
    escopo: turmaId ? "turma" : "global",
    turma_id: turmaId,
    data: DIA,
    descricao: `AAV ${codigo}`,
    tipo_atividade_id: tipoAecId,
    tempos_consumidos: 2,
    ta_inicial: 1,
    ...extra,
  };
}

function paradaGlobal(motivo: string) {
  return {
    turma_id: null,
    data: DIA,
    ta_inicial: 1,
    tempos: 2,
    tipo_parada_id: paradaLaId,
    motivo,
    prevista: false,
  };
}

beforeAll(async () => {
  await limpar();
  cursoRegularId = await curso("AAV-REG", "regular");
  cursoExpeditoId = await curso("AAV-EXP", "expedito");
  turmaRegularId = await turma(cursoRegularId);
  turmaExpeditaId = await turma(cursoExpeditoId);
  paradaLaId = await idDaLista("tipos_parada", "LA", { pode_global: true, aceita_tr: true });
  tipoAecId = await idDaLista("tipos_atividade", "AAV Palestra", { categoria: "AEC" });
  tipoTrId = await idDaLista("tipos_atividade", "AAV Tempo Reserva", { categoria: "TR" });
  for (const p of PAPEIS) await criarConta(p);
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

describe("dias parados (FR-024, FR-028.1)", () => {
  it("o Operador cria o dia parado da turma do seu alcance (controle positivo)", async () => {
    const { error } = await sessao("operador").from("dias_parados").insert({
      turma_id: turmaRegularId,
      data: DIA,
      ta_inicial: 3,
      tempos: 2,
      tipo_parada_id: paradaLaId,
      motivo: "AAV parada da turma",
      prevista: true,
    });
    expect(error).toBeNull();
  });

  it("o Operador recebe 42501 no dia parado da turma FORA do seu alcance", async () => {
    const { error } = await sessao("operador").from("dias_parados").insert({
      turma_id: turmaExpeditaId,
      data: DIA,
      ta_inicial: 3,
      tempos: 2,
      tipo_parada_id: paradaLaId,
      motivo: "AAV parada alheia",
      prevista: true,
    });
    expect(error?.code).toBe("42501");
  });

  it("o Operador recebe 42501 no dia parado GLOBAL", async () => {
    const { error } = await sessao("operador")
      .from("dias_parados")
      .insert(paradaGlobal("AAV global do operador"));
    expect(error?.code).toBe("42501");
  });

  it("o Ajudante recebe 42501 no dia parado GLOBAL — não tem calendario.criar (o caso que discrimina)", async () => {
    const { error } = await sessao("ajudante_administracao_academica")
      .from("dias_parados")
      .insert(paradaGlobal("AAV global do ajudante"));
    expect(error?.code).toBe("42501");
  });

  it("o Encarregado cria o dia parado GLOBAL (controle positivo)", async () => {
    const { error } = await sessao("encarregado_administracao_academica")
      .from("dias_parados")
      .insert(paradaGlobal("AAV global do encarregado"));
    expect(error).toBeNull();
  });

  it("desfazer o global exige a mesma permissão: o UPDATE do Ajudante volta vazio e o valor fica", async () => {
    const { data: linha } = await servico
      .from("dias_parados")
      .select("id")
      .eq("motivo", "AAV global do encarregado")
      .single();
    const id = (linha as { id: string }).id;
    const { data } = await sessao("ajudante_administracao_academica")
      .from("dias_parados")
      .update({ status: "inativo" })
      .eq("id", id)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: depois } = await servico
      .from("dias_parados")
      .select("status")
      .eq("id", id)
      .single();
    expect((depois as { status: string }).status).toBe("ativo");

    const { data: desfeito, error } = await sessao("encarregado_administracao_academica")
      .from("dias_parados")
      .update({ status: "inativo" })
      .eq("id", id)
      .select("id");
    expect(error).toBeNull();
    expect(desfeito).toHaveLength(1);
  });
});

describe("atividade global bloqueante (FR-025.1, FR-065)", () => {
  it("o Ajudante cria a AEC global (controle positivo: tem atividades_globais.criar)", async () => {
    const { error } = await sessao("ajudante_administracao_academica")
      .from("atividades_nao_letivas")
      .insert(atividade(`AAV-AECG-${SELO}`, null));
    expect(error).toBeNull();
  });

  it("o Ajudante recebe 42501 no TR global com bloqueia_aula (o caso que discrimina)", async () => {
    const { error } = await sessao("ajudante_administracao_academica")
      .from("atividades_nao_letivas")
      .insert(
        atividade(`AAV-TRG-AJ-${SELO}`, null, {
          categoria_normativa: "TR",
          tipo_atividade_id: tipoTrId,
          bloqueia_aula: true,
          tipo_parada_id: paradaLaId,
        }),
      );
    expect(error?.code).toBe("42501");
  });

  it("o Encarregado cria o TR global com bloqueia_aula (controle positivo)", async () => {
    const { error } = await sessao("encarregado_administracao_academica")
      .from("atividades_nao_letivas")
      .insert(
        atividade(`AAV-TRG-EN-${SELO}`, null, {
          categoria_normativa: "TR",
          tipo_atividade_id: tipoTrId,
          bloqueia_aula: true,
          tipo_parada_id: paradaLaId,
        }),
      );
    expect(error).toBeNull();
  });

  it("o Operador recebe 42501 em qualquer atividade global", async () => {
    const { error } = await sessao("operador")
      .from("atividades_nao_letivas")
      .insert(atividade(`AAV-AECG-OP-${SELO}`, null));
    expect(error?.code).toBe("42501");
  });
});

describe("limites do currículo (FR-001.1, R-11)", () => {
  it("o Operador recebe 42501 — não tem cursos.editar", async () => {
    const { error } = await sessao("operador").from("limites_curriculo").insert({
      curso_id: cursoRegularId,
      categoria: "AEC",
      tempos: 10,
      fonte_arquivo: "aav-op.pdf",
      fonte_pagina: 1,
    });
    expect(error?.code).toBe("42501");
  });

  it("o Ajudante grava (controle positivo: tem cursos.editar)", async () => {
    const { error } = await sessao("ajudante_administracao_academica")
      .from("limites_curriculo")
      .insert({
        curso_id: cursoRegularId,
        categoria: "AEC",
        tempos: 10,
        fonte_arquivo: "aav-aj.pdf",
        fonte_pagina: 1,
      });
    expect(error).toBeNull();
  });

  it("o Operador lê o limite do curso do seu alcance e não lê o do curso alheio", async () => {
    await servico.from("limites_curriculo").insert({
      curso_id: cursoExpeditoId,
      categoria: "TR",
      tempos: 4,
      fonte_arquivo: "aav-exp.pdf",
      fonte_pagina: 2,
    });
    const { data: proprio } = await sessao("operador")
      .from("limites_curriculo")
      .select("id")
      .eq("curso_id", cursoRegularId);
    const { data: alheio } = await sessao("operador")
      .from("limites_curriculo")
      .select("id")
      .eq("curso_id", cursoExpeditoId);
    expect((proprio ?? []).length).toBeGreaterThan(0);
    expect(alheio ?? []).toHaveLength(0);
  });
});
