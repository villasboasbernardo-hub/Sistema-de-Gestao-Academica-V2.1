/**
 * Spec 031, Bloco 16 (ajuste D de 31/10/2026) — quem pode ajustar à mão a situação e as datas de uma avaliação, com
 * SESSÃO AUTENTICADA (DoD 4: permissão não mora em pgTAP; toda recusa conferida pelo código `42501`, com a linha
 * completa).
 *
 * > *"Edita quem lança o DSA da turma."* — Bernardo Villas Boas, 31/10/2026
 *
 * Os casos que discriminam (DoD 8): o OPERADOR, que lança o DSA (`registros_aula.criar`), grava — e o CHEFE DE
 * DEPARTAMENTO, que lê o DSA e as avaliações mas não lança, é recusado; o operador de escopo regular é recusado na turma
 * EXPEDITA, que não alcança. O controle positivo é o Admin, e a leitura da Visualização.
 * ⚠️ O autor sai do banco: o cliente não manda `autor_nome`, e a linha volta com o nome do cadastro da sessão.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb16d";
const SENHA = "senha-de-teste-com-12+";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: { perfil: "admin", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
  chefe: { perfil: "chefe_departamento_ensino", escopo: "geral" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "B16D-REG", classificacao: "regular" },
  expedito: { codigo: "B16D-EXP", classificacao: "expedito" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b16d-${c}@${DOMINIO}`;
const turmaDe = new Map<Lado, string>();
const avaliacaoDe = new Map<Lado, string>();

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
        codigo: `USR-B16D-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova B16D ${c}`,
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
    (await servico.from("usuarios").delete().like("codigo", "USR-B16D-%")).error,
  );
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
        "ajustes",
        (await servico.from("ajustes_de_avaliacao").delete().eq("turma_id", t.id)).error,
      );
      conferir(
        "avaliações",
        (await servico.from("avaliacoes").delete().eq("turma_id", t.id)).error,
      );
      conferir(
        "linhas",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
  }
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "B16D-%")).error,
  );
}

beforeAll(async () => {
  await limpar();
  for (const lado of Object.keys(CURSOS) as Lado[]) {
    const cursoId = await cursoDe(lado);
    const sufixo = lado.toUpperCase();
    const { data: d, error: eD } = await servico
      .from("disciplinas")
      .insert({
        codigo: `B16D-DIS-${sufixo}`,
        curso_id: cursoId,
        cod_disciplina: "I",
        nome_disciplina: `Disciplina B16D ${lado}`,
        carga_horaria_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`disciplina ${lado}`, eD);
    const { data: t, error: eT } = await servico
      .from("turmas")
      .insert({
        curso_id: cursoId,
        turma: "T1",
        ano_letivo: 2046,
        status: "ativa",
        modalidade: "presencial",
        data_inicio: "2046-03-02",
        data_termino: "2046-06-30",
      })
      .select("id")
      .single();
    conferir(`turma ${lado}`, eT);
    turmaDe.set(lado, (t as { id: string }).id);
    const { data: a, error: eA } = await servico
      .from("avaliacoes")
      .insert({
        codigo: `B16D-AV-${sufixo}`,
        turma_id: (t as { id: string }).id,
        curso_id: cursoId,
        disciplina_id: (d as { id: string }).id,
        tipo_avaliacao: "Prova Escrita",
        data_avaliacao: "2046-04-10",
        status: "pendente",
      })
      .select("id")
      .single();
    conferir(`avaliação ${lado}`, eA);
    avaliacaoDe.set(lado, (a as { id: string }).id);
  }
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 120_000);

afterAll(async () => {
  await limpar();
}, 120_000);

const ajuste = (lado: Lado, justificativa: string) => ({
  turma_id: turmaDe.get(lado)!,
  avaliacao_id: avaliacaoDe.get(lado)!,
  situacao: "concluida",
  data_aplicacao: "2046-04-11",
  data_vista: "2046-04-15",
  justificativa,
});

describe("Bloco 16, ajuste D · o ajuste manual da avaliação", () => {
  it("controle positivo: o Admin grava, e o autor é o cadastro da sessão (não o que o cliente manda)", async () => {
    const { error } = await sessao("admin")
      .from("ajustes_de_avaliacao")
      .insert({
        ...ajuste("regular", "Ajuste do Admin, conferido na ata."),
        autor_nome: "Forjado",
      });
    expect(error, error?.message).toBeNull();
    const { data } = await servico
      .from("ajustes_de_avaliacao")
      .select("autor_nome")
      .eq("justificativa", "Ajuste do Admin, conferido na ata.")
      .single();
    expect((data as { autor_nome: string }).autor_nome).toBe("Prova B16D admin");
  });

  it("DISCRIMINA: o Operador, que lança o DSA, grava na turma que alcança", async () => {
    const { error } = await sessao("operador")
      .from("ajustes_de_avaliacao")
      .insert(ajuste("regular", "Ajuste do Operador, conferido."));
    expect(error, error?.message).toBeNull();
  });

  it("(NEGATIVO) o Chefe de Departamento lê, mas não lança o DSA: recusado pela RLS (42501)", async () => {
    const { error } = await sessao("chefe")
      .from("ajustes_de_avaliacao")
      .insert(ajuste("regular", "Tentativa do Chefe de Departamento."));
    expect(error?.code).toBe("42501");
  });

  it("(NEGATIVO) o Operador de escopo regular, na turma expedita que não alcança (42501)", async () => {
    const { error } = await sessao("operador")
      .from("ajustes_de_avaliacao")
      .insert(ajuste("expedito", "Tentativa fora do alcance do perfil."));
    expect(error?.code).toBe("42501");
  });

  it("a Visualização lê o histórico da turma", async () => {
    const { data, error } = await sessao("visualizacao")
      .from("ajustes_de_avaliacao")
      .select("justificativa, autor_nome")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(2);
  });

  it("(NEGATIVO) ninguém reescreve: o Admin recusado ao mudar a justificativa (42501), e o valor fica", async () => {
    const { error } = await sessao("admin")
      .from("ajustes_de_avaliacao")
      .update({ justificativa: "Reescrevendo o que foi gravado." })
      .eq("turma_id", turmaDe.get("regular")!);
    expect(error?.code).toBe("42501");
    const { data } = await servico
      .from("ajustes_de_avaliacao")
      .select("justificativa")
      .eq("turma_id", turmaDe.get("regular")!);
    expect((data ?? []).map((l) => (l as { justificativa: string }).justificativa).sort()).toEqual([
      "Ajuste do Admin, conferido na ata.",
      "Ajuste do Operador, conferido.",
    ]);
  });
});
