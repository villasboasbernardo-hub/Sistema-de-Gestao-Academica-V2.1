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
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// As chaves do stack LOCAL vêm do próprio CLI, nunca do versionamento nem do `.env.local`.
// O porquê está inteiro em `chaves-locais.ts`, que a suíte de política de senha também usa.
import { chaveLocal } from "./chaves-locais";

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
// ⚠️ Disciplina e Unidade de Ensino de teste, no curso EXPEDITO. Existem por uma razao precisa:
// `registros_aula` tem a catraca `reg_aula_ue_so_nula_no_historico`, que exige UE em toda linha
// NOVA. Sem esta fixture, o insert do T-02 falha com `23514` — e o teste negativo passaria pelo
// motivo errado, medindo a catraca em vez do alcance. Foi o controle positivo que revelou isso.
const DISCIPLINA_EXPEDITA = "aaaa0000-0000-0000-0000-0000000d0001";
const UE_EXPEDITA = "aaaa0000-0000-0000-0000-0000000e0001";
// ⚠️ E um instrutor, porque `reg_aula_instrutor_obrigatorio` exige um em toda linha de categoria
// `aula`. Sao TRES catracas guardando `registros_aula` — UE, tempos e instrutor —, e cada uma
// delas faria o teste de escopo passar pelo motivo errado se a fixture nao a satisfizesse.
const INSTRUTOR_TESTE = "aaaa0000-0000-0000-0000-0000000f0001";

type Perfil =
  | "admin"
  | "operador"
  | "visualizacao"
  | "encarregado_curso"
  | "encarregado_administracao_academica"
  | "ajudante_administracao_academica"
  | "chefe_departamento_ensino"
  | "encarregado_orientacao_pedagogica"
  | "ajudante_orientacao_pedagogica";

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
  await admin.from("registros_aula").delete().like("codigo", "REG-%T02");
  await admin.from("instrutores").delete().eq("codigo", "RLS-INS-BASE");
  await admin.from("config_listas").delete().in("lista", ["tipos_atividade", "metodologias"]);
  await admin.from("unidades_ensino").delete().eq("codigo", "RLS-UE-EXP");
  await admin.from("disciplinas").delete().eq("codigo", "RLS-DISC-EXP");
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

  await admin.from("disciplinas").insert({
    id: DISCIPLINA_EXPEDITA,
    codigo: "RLS-DISC-EXP",
    curso_id: CURSO_EXPEDITO,
    cod_disciplina: "RLS-I",
    nome_disciplina: "Disciplina de Teste",
    carga_horaria_tempos: 10,
  });
  await admin.from("unidades_ensino").insert({
    id: UE_EXPEDITA,
    codigo: "RLS-UE-EXP",
    disciplina_id: DISCIPLINA_EXPEDITA,
    curso_id: CURSO_EXPEDITO,
    numero_ue: 1,
    topico: "Unidade de Teste",
    ch_prevista_tempos: 10,
  });

  // ⚠️ VOCABULARIO. Quatro gatilhos validam valor contra `config_listas`, e um banco recem
  // resetado so tem a `escala_antiguidade` semeada pela migration — as listas de metodologia e
  // tipo de atividade nascem VAZIAS. Sem esta fixture, todo insert em `registros_aula` falha com
  // "o valor nao pertence a lista", e o teste NEGATIVO de escopo passaria por esse motivo, nao
  // pela RLS. Foi o controle positivo que revelou.
  await admin.from("config_listas").insert([
    { lista: "tipos_atividade", valor: "Aula", rotulo_exibicao: "Aula", ordem: 1, ativo: true },
    {
      lista: "metodologias",
      valor: "Exposição Oral",
      rotulo_exibicao: "Exposição Oral",
      ordem: 1,
      ativo: true,
    },
  ]);

  await admin.from("instrutores").insert({
    id: INSTRUTOR_TESTE,
    codigo: "RLS-INS-BASE",
    posto_graduacao: "CT",
    esp_hab_obs: "-EF",
    nome_completo: "Instrutor De Fixture",
    categoria: "Militar",
    om: "CIAARA",
  });

  await criarUsuario("admin", "rls-admin@ciaara.teste", "geral");
  await criarUsuario("operador", "rls-operador@ciaara.teste", "expedito");
  await criarUsuario("visualizacao", "rls-visual@ciaara.teste", "geral");
  // O alcance do Encarregado de Curso vem de `usuario_curso`, nao de `escopo_curso` —
  // por isso ele recebe escopo "geral" e mesmo assim so enxerga o curso vinculado.
  await criarUsuario("encarregado_curso", "rls-enc-curso@ciaara.teste", "geral", [CURSO_EXPEDITO]);
  await criarUsuario("encarregado_administracao_academica", "rls-ciaara11@ciaara.teste", "geral");
  // O Ajudante existe nesta suite por causa do recorte de PII: ele e um dos TRES perfis que
  // leem identificacao civil, e sem ele o lado autorizado ficaria sem prova.
  await criarUsuario("ajudante_administracao_academica", "rls-ajudante@ciaara.teste", "geral");
  // Os tres ultimos fecham os NOVE perfis do ENUM. O SC-004 exige um negativo para CADA um, e
  // uma suite que cobre seis de nove nao prova nada sobre os outros tres.
  await criarUsuario("chefe_departamento_ensino", "rls-chefe@ciaara.teste", "geral");
  await criarUsuario("encarregado_orientacao_pedagogica", "rls-enc-oe@ciaara.teste", "geral");
  await criarUsuario("ajudante_orientacao_pedagogica", "rls-aju-oe@ciaara.teste", "geral");
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

// =================================================================================================
// O RECORTE DO DADO PESSOAL DE INSTRUTOR — as asserções de COMPORTAMENTO
//
// As estruturais vivem em `supabase/tests/092_recorte_pii.sql`. Estas precisam estar AQUI, e o
// motivo é o mesmo que o cabeçalho deste arquivo dá para a RLS: **o pgTAP roda como dono do
// schema, e o dono tem todo privilégio de coluna.** Um teste de recorte escrito lá passaria com o
// recorte desligado.
//
// ⚠️ P-2, P-3, P-7 e P-8 são o contrato. Os positivos são controle. Uma suíte só com os positivos
//    aprova um recorte que não recorta — foi exatamente o resultado da primeira tentativa do
//    experimento do research.md §R-1, com o CPF completamente exposto.
//
// Contrato: specs/004-auth-convite-e-rbac/contracts/recorte-pii.md
// =================================================================================================

const SEM_PII: readonly Perfil[] = ["operador", "visualizacao", "encarregado_curso"];
const COM_PII: readonly Perfil[] = [
  "admin",
  "encarregado_administracao_academica",
  "ajudante_administracao_academica",
];

describe("FR-028 · recorte do dado pessoal de instrutor", () => {
  beforeAll(async () => {
    const { error } = await admin.from("instrutores").insert({
      codigo: "RLS-INS-PII",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor Com Dado Pessoal",
      categoria: "Militar",
      om: "CIAARA",
      cpf: "111.222.333-44",
      endereco_logradouro: "RUA DE TESTE",
    });
    if (error) throw new Error(`falha ao criar instrutor de PII: ${error.message}`);
  });

  afterAll(async () => {
    await admin.from("instrutores").delete().eq("codigo", "RLS-INS-PII");
  });

  // ------------------------------------------------------------------ P-2 · NEGATIVO
  it.each(SEM_PII.concat(COM_PII))(
    "P-2 (NEGATIVO) · %s NÃO lê `cpf` direto da tabela — nem os três autorizados",
    async (perfil) => {
      const { error } = await cliente(perfil).from("instrutores").select("cpf");
      expect(error).not.toBeNull();
    },
  );

  // ------------------------------------------------------------------ P-3 · NEGATIVO
  it.each(SEM_PII.concat(COM_PII))(
    "P-3 (NEGATIVO) · %s NÃO faz `select *` na tabela — o `*` expande para as colunas revogadas",
    async (perfil) => {
      const { error } = await cliente(perfil).from("instrutores").select("*");
      expect(error).not.toBeNull();
    },
  );

  // ------------------------------------------------------------------ P-8 · NEGATIVO
  it.each(SEM_PII)(
    "P-8 (NEGATIVO) · %s NÃO usa `cpf` nem como FILTRO — o privilégio é do banco, não da forma da consulta",
    async (perfil) => {
      const { error } = await cliente(perfil)
        .from("instrutores")
        .select("codigo")
        .not("cpf", "is", null);
      expect(error).not.toBeNull();
    },
  );

  // ------------------------------------------------------------------ P-1 · controle positivo
  it.each(SEM_PII.concat(COM_PII))(
    "P-1 · %s LÊ o dado funcional — o recorte não pode recortar demais (FR-029)",
    async (perfil) => {
      const { data, error } = await cliente(perfil)
        .from("instrutores")
        .select("codigo, posto_graduacao, esp_hab_obs, area_conhecimento")
        .eq("codigo", "RLS-INS-PII");
      expect(error).toBeNull();
      expect(data?.[0]?.posto_graduacao).toBe("CT");
    },
  );

  // ------------------------------------------------------------------ P-4 · a ergonomia de volta
  it.each(SEM_PII.concat(COM_PII))(
    "P-4 · %s faz `select *` em `vw_instrutores` sem PII no resultado",
    async (perfil) => {
      const { data, error } = await cliente(perfil)
        .from("vw_instrutores")
        .select("*")
        .eq("codigo", "RLS-INS-PII");
      expect(error).toBeNull();
      expect(data?.[0]).not.toHaveProperty("cpf");
      expect(data?.[0]).not.toHaveProperty("endereco_logradouro");
    },
  );

  // ------------------------------------------------------------------ P-5 · os TRÊS autorizados
  it.each(COM_PII)("P-5 · %s LÊ a PII pela visão com porteiro", async (perfil) => {
    const { data, error } = await cliente(perfil)
      .from("vw_instrutor_dados_pessoais")
      .select("codigo, cpf")
      .eq("codigo", "RLS-INS-PII");
    expect(error).toBeNull();
    expect(data?.[0]?.cpf).toBe("111.222.333-44");
  });

  // ------------------------------------------------------------------ P-6 · os SEIS demais
  it.each(SEM_PII)(
    "P-6 (NEGATIVO) · %s recebe ZERO LINHAS da visão — vazio, não erro",
    async (perfil) => {
      const { data, error } = await cliente(perfil)
        .from("vw_instrutor_dados_pessoais")
        .select("codigo, cpf");
      // ⚠️ Vazio E NÃO ERRO é o comportamento correto, e a distinção importa: erro revelaria que
      // a coluna existe e que alguém a alcança. Zero linhas não conta nada a quem não pode ver.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  // ------------------------------------------------------------------ P-9 · o ETL continua de pé
  it("P-9 · `service_role` continua lendo a PII — sem isto o ETL do Épico 2 pararia", async () => {
    const { data, error } = await admin
      .from("instrutores")
      .select("codigo, cpf")
      .eq("codigo", "RLS-INS-PII");
    expect(error).toBeNull();
    expect(data?.[0]?.cpf).toBe("111.222.333-44");
  });

  // ------------------------------------------------------------------ P-10 · nada quebrou
  it.each(["vw_instrutor_carga_anual", "vw_instrutor_disciplina_rotulada"])(
    "P-10 · a view existente `%s` continua de pé e não passou a vazar PII",
    async (view) => {
      const { data, error } = await cliente("operador").from(view).select("*").limit(1);
      expect(error).toBeNull();
      for (const linha of data ?? []) {
        expect(linha).not.toHaveProperty("cpf");
        expect(linha).not.toHaveProperty("endereco_cep");
      }
    },
  );
});

describe("FR-026 · `ultimo_acesso` e o gatilho anti-escalonamento", () => {
  // ⚠️ ESTE TESTE EXISTE POR UMA RAZÃO ESPECÍFICA, e ela é fácil de esquecer:
  // `app.impedir_autoescalonamento` bloqueia mudança de `perfil`, `escopo_curso` e `status` feita
  // por quem não é admin. `ultimo_acesso` NÃO está nessa lista hoje — e o login depende disso.
  // A lista pode crescer; no dia em que `ultimo_acesso` entrar nela, o carimbo de acesso passaria
  // a falhar em silêncio e ninguém saberia, porque a escrita é deliberadamente tolerante a falha.
  it("o próprio usuário carimba o seu `ultimo_acesso` — não é escalonamento", async () => {
    const { error } = await cliente("operador")
      .from("usuarios")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("email", "rls-operador@ciaara.teste");
    expect(error).toBeNull();
  });

  it("(NEGATIVO) mas continua NÃO podendo mexer no próprio perfil na mesma escrita", async () => {
    const { error } = await cliente("operador")
      .from("usuarios")
      .update({ ultimo_acesso: new Date().toISOString(), perfil: "admin" })
      .eq("email", "rls-operador@ciaara.teste");
    expect(error).not.toBeNull();
  });
});

// =================================================================================================
// SC-004 · UM NEGATIVO PARA CADA UM DOS NOVE PERFIS
//
// *"Testar que o Operador consegue ler a turma dele não prova nada sobre segurança — uma policy
// `using (true)` passa nesse teste."* (documento 22 §10.1)
//
// ⚠️ O QUE CADA PERFIL NÃO PODE FOI **MEDIDO NA MATRIZ**, não suposto. `perfil_permissao` guarda
//    somente o que é PERMITIDO — 152 linhas, todas `permitido = true`. A ausência de uma linha é a
//    negação, e `app.pode()` devolve falso quando não acha o par.
//
// ⚠️ E A MEDIÇÃO ENCONTROU UM LIMITE HONESTO: **três perfis não têm leitura negada nenhuma.**
//    `admin`, `encarregado_administracao_academica` e `ajudante_administracao_academica` leem
//    tudo, inclusive a PII. Para eles, um "teste de leitura negada" só existiria se fosse
//    inventado — e um teste inventado é pior que um teste ausente, porque some da lista de
//    pendências. Eles são cobertos pelas negações ESTRUTURAIS, que valem para todos: nenhum
//    perfil apaga nada, e nenhum reescreve `migracao_log`.
// =================================================================================================

/** Perfis que a matriz impede de LER `migracao_log` (recurso `auditoria`). */
const NAO_LEEM_AUDITORIA: readonly Perfil[] = [
  "operador",
  "visualizacao",
  "encarregado_curso",
  "encarregado_orientacao_pedagogica",
  "ajudante_orientacao_pedagogica",
];

/** Perfis que a matriz impede de LER `usuarios` — a tabela de fronteira. */
const NAO_LEEM_USUARIOS: readonly Perfil[] = NAO_LEEM_AUDITORIA;

/** Os três que leem tudo. Cobertos pelas negações estruturais, e a razão está acima. */
const LEEM_TUDO: readonly Perfil[] = [
  "admin",
  "encarregado_administracao_academica",
  "ajudante_administracao_academica",
];

/** Perfis que a matriz impede de ESCREVER em `cursos`. */
const NAO_ESCREVEM_CURSOS: readonly Perfil[] = [
  "chefe_departamento_ensino",
  "encarregado_orientacao_pedagogica",
  "ajudante_orientacao_pedagogica",
  "operador",
  "encarregado_curso",
  "visualizacao",
];

/** Perfis que a matriz impede de ESCREVER em `usuarios` — inclusive a CIAARA-11 inteira. */
const NAO_ESCREVEM_USUARIOS: readonly Perfil[] = [
  "chefe_departamento_ensino",
  "encarregado_administracao_academica",
  "ajudante_administracao_academica",
  "encarregado_orientacao_pedagogica",
  "ajudante_orientacao_pedagogica",
  "operador",
  "encarregado_curso",
  "visualizacao",
];

describe("SC-004 · LEITURA negada, por perfil", () => {
  it.each(NAO_LEEM_AUDITORIA)(
    "%s NÃO lê `migracao_log` — o recurso `auditoria`",
    async (perfil) => {
      const { data, error } = await cliente(perfil).from("migracao_log").select("codigo");
      // ⚠️ VAZIO, não erro: a RLS filtra a linha, ela não recusa a consulta. É por isso que o
      // `EstadoVazio` precisa distinguir "não há" de "você não vê" — daqui, os dois são iguais.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  it.each(NAO_LEEM_USUARIOS)("%s NÃO lê a tabela `usuarios` de outros", async (perfil) => {
    const { data, error } = await cliente(perfil).from("usuarios").select("codigo, perfil");
    expect(error).toBeNull();
    // Pode enxergar a própria linha; o que não pode é enxergar as alheias.
    expect((data ?? []).length).toBeLessThanOrEqual(1);
  });

  it.each(LEEM_TUDO)(
    "%s NÃO tem leitura negada na matriz — coberto pelas negações estruturais",
    async (perfil) => {
      // Não há o que negar em leitura para este perfil. O teste registra o fato e prova a
      // negação que VALE para ele: nem o admin reescreve o log de migração.
      const { error } = await cliente(perfil)
        .from("migracao_log")
        .update({ regra_aplicada: "adulterado" })
        .eq("codigo", "LOG-RLS-1");
      expect(error).not.toBeNull();
    },
  );
});

describe("SC-004 · ESCRITA negada, por perfil", () => {
  it.each(NAO_ESCREVEM_CURSOS)("%s NÃO cria curso", async (perfil) => {
    const { error } = await cliente(perfil)
      .from("cursos")
      .insert({
        codigo: `RLS-NEG-${perfil.slice(0, 6)}`,
        nome_curso: "Curso Que Nao Deve Existir",
        classificacao: "regular",
      });
    expect(error).not.toBeNull();
  });

  it.each(NAO_ESCREVEM_USUARIOS)(
    "%s NÃO cria usuário — `usuarios` é tabela de fronteira",
    async (perfil) => {
      const { error } = await cliente(perfil)
        .from("usuarios")
        .insert({
          codigo: `USR-NEG-${perfil.slice(0, 6)}`,
          email: `neg-${perfil}@ciaara.teste`,
          nome: "Usuario Que Nao Deve Existir",
          perfil: "operador",
          escopo_curso: "geral",
        });
      expect(error).not.toBeNull();
    },
  );

  it("admin NÃO escreve em `migracao_log` — a única escrita negada a ele", async () => {
    const { error } = await cliente("admin")
      .from("migracao_log")
      .update({ regra_aplicada: "adulterado" })
      .eq("codigo", "LOG-RLS-1");
    expect(error).not.toBeNull();
  });
});

// =================================================================================================
// T-02, T-03 e T-10 — os três que o documento 22 §10.2 listava como pendentes.
//
// Eles dependiam de DADO REAL para existir, e o dado passou a existir no Épico 2.
// =================================================================================================

describe("T-02 · o Operador não cria registro fora do escopo", () => {
  it("(NEGATIVO) operador de escopo `expedito` NÃO lança aula na turma de curso regular", async () => {
    const { error } = await cliente("operador").from("registros_aula").insert({
      codigo: "REG-NEG-T02",
      data: "2026-04-13",
      turma_id: TURMA_REGULAR,
      curso_id: CURSO_REGULAR,
      unidade_ensino_id: UE_EXPEDITA,
      instrutor_id: INSTRUTOR_TESTE,
      categoria_normativa: "aula",
      tipo_atividade: "Aula",
      metodologia: "Exposição Oral",
      tempos_consumidos: 2,
    });
    expect(error).not.toBeNull();
  });
});

describe("T-03 · fuga de escopo por UPDATE — só o WITH CHECK pega", () => {
  // ⚠️ ESTE É O MAIS IMPORTANTE DOS TRÊS, e o motivo é sutil: mover uma linha PARA FORA do
  // próprio escopo passa pelo `USING`, porque a linha é visível ANTES da mudança. Só o
  // `WITH CHECK` avalia a linha DEPOIS. Uma policy que declare apenas `USING` aprova a fuga, e
  // nenhum teste de leitura percebe — a linha simplesmente some do alcance de quem a moveu.
  it("(NEGATIVO) operador NÃO move a própria turma para um curso que não alcança", async () => {
    const { error } = await cliente("operador")
      .from("turmas")
      .update({ curso_id: CURSO_REGULAR })
      .eq("id", TURMA_EXPEDITA);
    expect(error).not.toBeNull();
  });
});

describe("T-10 · o Operador não cria atividade de escopo global", () => {
  it("(NEGATIVO) atividade `global` exige alcance que o operador não tem", async () => {
    const { error } = await cliente("operador").from("atividades_nao_letivas").insert({
      codigo: "EXT-NEG-T10",
      categoria_normativa: "AEC",
      subtipo: "Palestra",
      escopo: "global",
      data: "2026-04-13",
      descricao: "Atividade global que o operador nao deve criar",
      tempos_consumidos: 2,
    });
    expect(error).not.toBeNull();
  });
});

// =================================================================================================
// CONTROLES POSITIVOS DOS NEGATIVOS ACIMA
//
// ⚠️ POR QUE ELES EXISTEM: um `insert` que falha por coluna obrigatória ausente produz `error`
// não-nulo exatamente como um `insert` barrado pela RLS. Os negativos passariam iguais, e a suíte
// aprovaria uma RLS desligada — o defeito que ela existe para não ter. Estes controles usam o
// MESMO payload e provam que ele é válido para quem tem permissão.
// =================================================================================================

describe("controle positivo · o mesmo payload passa para quem PODE", () => {
  it("admin CRIA o curso que os seis outros perfis não criaram", async () => {
    const { error } = await cliente("admin").from("cursos").insert({
      codigo: "RLS-NEG-CONTROLE",
      nome_curso: "Curso Que Nao Deve Existir",
      classificacao: "regular",
    });
    expect(error).toBeNull();
    await admin.from("cursos").delete().eq("codigo", "RLS-NEG-CONTROLE");
  });

  it("admin CRIA o usuário que os oito outros perfis não criaram", async () => {
    const { error } = await cliente("admin").from("usuarios").insert({
      codigo: "USR-NEG-CONTROLE",
      email: "neg-controle@ciaara.teste",
      nome: "Usuario Que Nao Deve Existir",
      perfil: "operador",
      escopo_curso: "geral",
    });
    expect(error).toBeNull();
    await admin.from("usuarios").delete().eq("codigo", "USR-NEG-CONTROLE");
  });

  it("o operador LANÇA aula na turma que alcança — o T-02 nega só a de fora", async () => {
    const { error } = await cliente("operador").from("registros_aula").insert({
      codigo: "REG-POS-T02",
      data: "2026-04-13",
      turma_id: TURMA_EXPEDITA,
      curso_id: CURSO_EXPEDITO,
      unidade_ensino_id: UE_EXPEDITA,
      instrutor_id: INSTRUTOR_TESTE,
      categoria_normativa: "aula",
      tipo_atividade: "Aula",
      metodologia: "Exposição Oral",
      tempos_consumidos: 2,
    });
    expect(error).toBeNull();
    await admin.from("registros_aula").delete().eq("codigo", "REG-POS-T02");
  });
});

// =================================================================================================
// US3 · administrar contas ao longo do tempo
// =================================================================================================

describe("FR-015 / SC-008 · desativar corta o alcance na requisição seguinte", () => {
  // ⚠️ ESTE TESTE PASSA POR ENGANO SE A APLICAÇÃO GUARDAR PERFIL EM CACHE — ele abre conexão nova
  // a cada caso, e conexão nova nunca tem cache. Por isso o quickstart V-6 manda verificar TAMBÉM
  // no navegador. O que este prova é o lado do banco: `app.usuario_atual()` filtra por
  // `status = 'ativo'`, então o token existente para de resolver.
  it("a conta desativada zera o alcance sem precisar fechar o navegador", async () => {
    const alvo = "rls-visual@ciaara.teste";

    // Antes: alcança.
    const antes = await cliente("visualizacao").from("cursos").select("codigo");
    expect(antes.error).toBeNull();
    expect((antes.data ?? []).length).toBeGreaterThan(0);

    await admin.from("usuarios").update({ status: "inativo" }).eq("email", alvo);

    // Depois, com O MESMO cliente e O MESMO token: zero.
    const depois = await cliente("visualizacao").from("cursos").select("codigo");
    expect(depois.error).toBeNull();
    expect(depois.data).toEqual([]);

    await admin.from("usuarios").update({ status: "ativo" }).eq("email", alvo);
  });
});

describe("FR-016 · o último Admin não se desativa nem se rebaixa", () => {
  it("(NEGATIVO) desativar o último Admin ativo é recusado PELO BANCO", async () => {
    // Só existe um Admin nesta suíte, e é o que torna o teste possível sem montar cenário.
    const { error } = await admin
      .from("usuarios")
      .update({ status: "inativo" })
      .eq("email", "rls-admin@ciaara.teste");

    // ⚠️ Recusado inclusive para `service_role` — que ignora a RLS inteira. O gatilho não é
    // policy justamente por isso: ele vale para quem a RLS não alcança.
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/ultima conta Admin/i);
  });

  it("(NEGATIVO) rebaixar o último Admin também é recusado", async () => {
    const { error } = await admin
      .from("usuarios")
      .update({ perfil: "operador" })
      .eq("email", "rls-admin@ciaara.teste");
    expect(error).not.toBeNull();
  });

  it("controle positivo: com DOIS Admins, desativar um passa", async () => {
    await admin.from("usuarios").insert({
      codigo: "USR-ADMIN-2",
      email: "rls-admin2@ciaara.teste",
      nome: "Segundo Admin",
      perfil: "admin",
      escopo_curso: "geral",
    });

    const { error } = await admin
      .from("usuarios")
      .update({ status: "inativo" })
      .eq("email", "rls-admin2@ciaara.teste");
    expect(error).toBeNull();

    await admin.from("usuarios").delete().eq("codigo", "USR-ADMIN-2");
  });
});

describe("FR-017 · vincular curso muda o alcance imediatamente", () => {
  it("o Encarregado de Curso passa a enxergar o curso recém-vinculado", async () => {
    const antes = await cliente("encarregado_curso").from("turmas").select("codigo");
    const quantasAntes = (antes.data ?? []).length;

    const { data: linha } = await admin
      .from("usuarios")
      .select("id")
      .eq("email", "rls-enc-curso@ciaara.teste")
      .single();

    await admin.from("usuario_curso").insert({
      codigo: "UC-FR017",
      usuario_id: linha!.id,
      curso_id: CURSO_REGULAR,
    });

    const depois = await cliente("encarregado_curso").from("turmas").select("codigo");
    expect((depois.data ?? []).length).toBeGreaterThan(quantasAntes);

    await admin.from("usuario_curso").delete().eq("codigo", "UC-FR017");
  });
});

// =================================================================================================
// SC-006 e SC-007 · a matriz é dado, e ocultar não é proteger
// =================================================================================================

describe("SC-006 · alterar a matriz muda o comportamento sem deploy nem migration", () => {
  it("tirar a linha de `perfil_permissao` muda a policy na consulta seguinte", async () => {
    const antes = await cliente("visualizacao").from("cursos").select("codigo");
    expect((antes.data ?? []).length).toBeGreaterThan(0);

    // Um UPDATE. Nenhum deploy, nenhuma migration.
    await admin
      .from("perfil_permissao")
      .update({ permitido: false })
      .eq("perfil", "visualizacao")
      .eq("recurso", "cursos")
      .eq("acao", "ler");

    const depois = await cliente("visualizacao").from("cursos").select("codigo");
    expect(depois.data).toEqual([]);

    await admin
      .from("perfil_permissao")
      .update({ permitido: true })
      .eq("perfil", "visualizacao")
      .eq("recurso", "cursos")
      .eq("acao", "ler");

    const restaurado = await cliente("visualizacao").from("cursos").select("codigo");
    expect((restaurado.data ?? []).length).toBeGreaterThan(0);
  });
});

describe("SC-007 (parte b) · a ação invocada FORA da tela é negada pelo banco", () => {
  // ⚠️ A parte (a) — o botão some — é do e2e. As duas são provadas SEPARADAMENTE de propósito:
  // provar só (a) é provar cortesia; provar só (b) é deixar a tela oferecer o que não funciona.
  // Este teste não passa por tela nenhuma: é chamada direta à interface de dados.
  it("o `visualizacao` não cria curso mesmo chamando a interface de dados diretamente", async () => {
    const { error } = await cliente("visualizacao").from("cursos").insert({
      codigo: "RLS-FORA-DA-TELA",
      nome_curso: "Criado Por Fora",
      classificacao: "regular",
    });
    expect(error).not.toBeNull();
  });
});
