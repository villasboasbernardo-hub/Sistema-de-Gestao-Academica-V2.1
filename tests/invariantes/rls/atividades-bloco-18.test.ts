/**
 * Spec 033, Bloco 18 — quem planeja APOINST, quem marca à mão e quem edita as AEC previstas do currículo, com SESSÃO
 * AUTENTICADA (DoD 4: permissão não mora em pgTAP; toda recusa conferida pelo código `42501`, com a linha completa).
 *
 * > *"RA-5 (…) marcada à mão pelo trio (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha (…) RA-6
 * > APOINST: planejada no módulo Atividades pelo trio (…) Execução = lançamentos do DSA vinculados (Operador lança)."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * O caso que discrimina (DoD 8): o OPERADOR, que lança o DSA (`atividades_nao_letivas.criar`) e por isso passaria por
 * uma policy copiada dos ajustes de avaliação, é RECUSADO ao planejar APOINST e ao marcar à mão — o recurso novo
 * `planejamento_de_atividades` é só do trio. O controle positivo é o Encarregado e o Ajudante (sem conta Admin: o
 * `rls.test.ts` pressupõe ser o único — gotcha 8).
 * ⚠️ O autor da marcação sai do banco: o cliente não manda `autor_nome`.
 */
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeb18";
const SENHA = "senha-de-teste-com-12+";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  encarregado: { perfil: "encarregado_administracao_academica", escopo: "geral" },
  ajudante: { perfil: "ajudante_administracao_academica", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
  chefe: { perfil: "chefe_departamento_ensino", escopo: "geral" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const CURSOS = {
  regular: { codigo: "B18-REG", classificacao: "regular" },
  expedito: { codigo: "B18-EXP", classificacao: "expedito" },
} as const;
type Lado = keyof typeof CURSOS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `b18-${c}@${DOMINIO}`;
const cursoDe = new Map<Lado, string>();
const curriculoDe = new Map<Lado, string>();
const turmaDe = new Map<Lado, string>();
const disciplinaDe = new Map<Lado, string>();
let instrutorId = "";
let palestraId = "";

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
        codigo: `USR-B18-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova B18 ${c}`,
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
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-B18-%")).error);
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
        "marcações",
        (await servico.from("marcacoes_de_atividade").delete().eq("turma_id", t.id)).error,
      );
      conferir(
        "atividades",
        (await servico.from("atividades_nao_letivas").delete().eq("turma_id", t.id)).error,
      );
      conferir(
        "apoinst",
        (await servico.from("apoinst_planejadas").delete().eq("turma_id", t.id)).error,
      );
      const { data: linhas } = await servico
        .from("turma_disciplina")
        .select("id")
        .eq("turma_id", t.id);
      for (const l of (linhas ?? []) as { id: string }[]) {
        conferir(
          "designações",
          (
            await servico
              .from("turma_disciplina_instrutor")
              .delete()
              .eq("turma_disciplina_id", l.id)
          ).error,
        );
      }
      conferir(
        "linhas",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
    conferir(
      "previstas",
      (await servico.from("aec_previstas_curriculo").delete().eq("curso_id", cursoId)).error,
    );
  }
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "B18-%")).error,
  );
  conferir("instrutor", (await servico.from("instrutores").delete().eq("codigo", "B18-INS")).error);
}

beforeAll(async () => {
  await limpar();
  const { data: tipo, error: eTipo } = await servico
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_atividade")
    .eq("valor", "Palestra")
    .single();
  conferir("tipo Palestra", eTipo);
  palestraId = (tipo as { id: string }).id;
  const { data: ins, error: eIns } = await servico
    .from("instrutores")
    .insert({
      codigo: "B18-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor de prova B18",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  conferir("instrutor", eIns);
  instrutorId = (ins as { id: string }).id;
  for (const lado of Object.keys(CURSOS) as Lado[]) {
    const cursoId = await curso(lado);
    cursoDe.set(lado, cursoId);
    const { data: cu } = await servico
      .from("curriculos")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("versao", 1)
      .single();
    curriculoDe.set(lado, (cu as { id: string }).id);
    const sufixo = lado.toUpperCase();
    const { data: d, error: eD } = await servico
      .from("disciplinas")
      .insert({
        codigo: `B18-DIS-${sufixo}`,
        curso_id: cursoId,
        cod_disciplina: "I",
        nome_disciplina: `Disciplina B18 ${lado}`,
        carga_horaria_tempos: 40,
      })
      .select("id")
      .single();
    conferir(`disciplina ${lado}`, eD);
    disciplinaDe.set(lado, (d as { id: string }).id);
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
    const { data: linha } = await servico
      .from("turma_disciplina")
      .select("id")
      .eq("turma_id", (t as { id: string }).id)
      .eq("disciplina_id", (d as { id: string }).id)
      .maybeSingle();
    let linhaId = (linha as { id: string } | null)?.id;
    if (!linhaId) {
      const { data: nova, error: eL } = await servico
        .from("turma_disciplina")
        .insert({ turma_id: (t as { id: string }).id, disciplina_id: (d as { id: string }).id })
        .select("id")
        .single();
      conferir(`linha ${lado}`, eL);
      linhaId = (nova as { id: string }).id;
    }
    conferir(
      `designação ${lado}`,
      (
        await servico.from("turma_disciplina_instrutor").insert({
          codigo: `B18-TDI-${sufixo}#B18-INS`,
          turma_disciplina_id: linhaId,
          instrutor_id: instrutorId,
          status: "ativo",
        })
      ).error,
    );
  }
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
}, 180_000);

afterAll(async () => {
  await limpar();
}, 180_000);

const apoinst = (lado: Lado, nome: string) => ({
  id: randomUUID(),
  turma_id: turmaDe.get(lado)!,
  disciplina_id: disciplinaDe.get(lado)!,
  instrutor_id: instrutorId,
  nome,
  inicio_previsto: "2046-04-01",
  fim_previsto: "2046-04-30",
  ta_previstos: 8,
});

describe("Bloco 18 · RA-6 — quem planeja a APOINST", () => {
  it("controle positivo: o Encarregado planeja na turma que alcança", async () => {
    const linha = apoinst("regular", "APOINST do Encarregado");
    const { error } = await sessao("encarregado").from("apoinst_planejadas").insert(linha);
    expect(error, error?.message).toBeNull();
    const { data } = await servico
      .from("apoinst_planejadas")
      .select("codigo")
      .eq("id", linha.id)
      .single();
    expect((data as { codigo: string }).codigo).toMatch(/^APO-\d{6}$/);
  });

  it("controle positivo: o Ajudante planeja na turma expedita (escopo geral)", async () => {
    const { error } = await sessao("ajudante")
      .from("apoinst_planejadas")
      .insert(apoinst("expedito", "Do Ajudante"));
    expect(error, error?.message).toBeNull();
  });

  it("DISCRIMINA: o Operador, que lança o DSA, NÃO planeja — recusado pela RLS (42501)", async () => {
    const { error } = await sessao("operador")
      .from("apoinst_planejadas")
      .insert(apoinst("regular", "Do Operador"));
    expect(error?.code).toBe("42501");
  });

  it("(NEGATIVO) o Chefe de Departamento, que lê, não planeja (42501)", async () => {
    const { error } = await sessao("chefe")
      .from("apoinst_planejadas")
      .insert(apoinst("regular", "Do Chefe"));
    expect(error?.code).toBe("42501");
  });

  it("a Visualização lê a APOINST da turma", async () => {
    const { data, error } = await sessao("visualizacao")
      .from("apoinst_planejadas")
      .select("nome")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });
});

describe("Bloco 18 · RA-5 — quem marca à mão", () => {
  it("controle positivo: o Ajudante marca a APOINST concluída, e o autor é o cadastro da sessão", async () => {
    const { data: a } = await servico
      .from("apoinst_planejadas")
      .select("id")
      .eq("turma_id", turmaDe.get("regular")!)
      .single();
    const id = randomUUID();
    const { error } = await sessao("ajudante")
      .from("marcacoes_de_atividade")
      .insert({
        id,
        turma_id: turmaDe.get("regular")!,
        apoinst_id: (a as { id: string }).id,
        situacao: "cumprida",
        justificativa: "Concluída em campo, conferida na ata.",
        autor_nome: "Forjado",
      });
    expect(error, error?.message).toBeNull();
    const { data } = await servico
      .from("marcacoes_de_atividade")
      .select("autor_nome")
      .eq("id", id)
      .single();
    expect((data as { autor_nome: string }).autor_nome).toBe("Prova B18 ajudante");
  });

  it("DISCRIMINA: o Operador não marca à mão (42501)", async () => {
    const { data: a } = await servico
      .from("apoinst_planejadas")
      .select("id")
      .eq("turma_id", turmaDe.get("regular")!)
      .single();
    const { error } = await sessao("operador")
      .from("marcacoes_de_atividade")
      .insert({
        id: randomUUID(),
        turma_id: turmaDe.get("regular")!,
        apoinst_id: (a as { id: string }).id,
        situacao: "cumprida",
        justificativa: "Tentativa do Operador, sem o recurso.",
      });
    expect(error?.code).toBe("42501");
  });

  it("(NEGATIVO) ninguém reescreve a marcação: a atualização volta vazia e o valor fica", async () => {
    const { data } = await sessao("encarregado")
      .from("marcacoes_de_atividade")
      .update({ justificativa: "Reescrevendo o que foi gravado." })
      .eq("turma_id", turmaDe.get("regular")!)
      .select("id");
    expect((data ?? []).length).toBe(0);
    const { data: ficou } = await servico
      .from("marcacoes_de_atividade")
      .select("justificativa")
      .eq("turma_id", turmaDe.get("regular")!);
    expect(((ficou ?? []) as { justificativa: string }[]).map((m) => m.justificativa)).toEqual([
      "Concluída em campo, conferida na ata.",
    ]);
  });
});

describe("Bloco 18 · RA-2 — quem edita as AEC previstas do currículo (RC-6)", () => {
  const prevista = (lado: Lado, nome: string) => ({
    id: randomUUID(),
    curso_id: cursoDe.get(lado)!,
    curriculo_id: curriculoDe.get(lado)!,
    nome,
    tipo_atividade_id: palestraId,
    ta_previstos: 2,
    obrigatoria: true,
  });

  it("controle positivo: o Encarregado inclui no currículo SEM turma com lançamento (livre, sem trilha)", async () => {
    const linha = prevista("regular", "Prevista livre");
    const { error } = await sessao("encarregado").from("aec_previstas_curriculo").insert(linha);
    expect(error, error?.message).toBeNull();
    const { count } = await servico
      .from("correcoes_de_curriculo")
      .select("id", { count: "exact", head: true })
      .eq("registro_id", linha.id);
    expect(count).toBe(0);
  });

  it("(NEGATIVO) o Operador não edita currículo (42501)", async () => {
    const { error } = await sessao("operador")
      .from("aec_previstas_curriculo")
      .insert(prevista("regular", "Do Operador"));
    expect(error?.code).toBe("42501");
  });

  it("DISCRIMINA: no currículo EM USO, o Ajudante sem justificativa é recusado, e com ela grava a trilha", async () => {
    // A turma passa a ter lançamento salvo (o script grava sem sessão, salvo): o currículo fica em uso.
    conferir(
      "lançamento",
      (
        await servico.from("atividades_nao_letivas").insert({
          codigo: "B18-ATV-1",
          turma_id: turmaDe.get("regular")!,
          escopo: "turma",
          data: "2046-03-10",
          ta_inicial: 1,
          tempos_consumidos: 1,
          tipo_atividade_id: palestraId,
          categoria_normativa: "AEC",
          descricao: "Deixa o currículo em uso",
        })
      ).error,
    );
    const sem = await sessao("ajudante")
      .from("aec_previstas_curriculo")
      .insert(prevista("regular", "Sem justificativa"));
    expect(sem.error?.hint).toBe("justificativa_obrigatoria");
    const linha = prevista("regular", "Com justificativa");
    const com = await sessao("ajudante")
      .from("aec_previstas_curriculo")
      .insert(linha)
      .setHeader(
        "x-justificativa-de-correcao",
        Buffer.from("Correção de prova B18", "utf8").toString("base64"),
      );
    expect(com.error, com.error?.message).toBeNull();
    const { data } = await servico
      .from("correcoes_de_curriculo")
      .select("acao, tabela, justificativa")
      .eq("registro_id", linha.id)
      .single();
    expect(data).toEqual({
      acao: "incluir",
      tabela: "aec_previstas_curriculo",
      justificativa: "Correção de prova B18",
    });
  });
});
