/**
 * Suíte de RLS da fatia (b) do Épico 5 — disciplinas e unidades de ensino (spec `010`).
 *
 * **A regra é a mesma de sempre**: prova-se o que cada perfil **NÃO** pode, com **JWT de verdade**.
 * O pgTAP roda como dono do schema, e sob privilégio de dono **a RLS não se aplica** — uma asserção
 * de permissão escrita lá passaria com a RLS desligada, que é o defeito que a suíte existe para
 * impedir (DoD 4 do `CLAUDE.md`).
 *
 * ⚠️ **O CASO QUE DISCRIMINA DESTA FATIA É O OPERADOR.** Ele é o único perfil que tem
 * `disciplinas.editar` **sem** ter `disciplinas.criar` — medido na matriz em 24/09/2026 —, e a
 * decisão `FR-021` amarrou a exclusão permanente a **quem pode criar**. Um negativo qualquer (um
 * perfil sem nenhuma das duas) e um controle positivo (quem tem as duas) dariam o **mesmo veredito
 * antes e depois** da migration; só o Operador observa a escolha. E ele prova as duas metades: é
 * recusado ao excluir e **aceito** ao editar período e instrutores por turma (Q-10).
 *
 * ⚠️ **DOMÍNIO E CÓDIGOS PRÓPRIOS**, `@ciaara.teste5b` e `USR-5B-`: a suíte do Épico 1 apaga todos os
 * usuários de `@ciaara.teste` e os códigos `UC-%` na limpeza dela. Mesmo domínio = uma suíte derruba
 * a sessão da outra.
 *
 * ⚠️ **ESTA SUÍTE NÃO CRIA CONTA `admin`**, de propósito: `app.impedir_remocao_do_ultimo_admin()`
 * conta os **outros** Admins ativos do banco inteiro, e um Admin a mais faz o caso *"desativar o
 * último Admin é recusado"* do `rls.test.ts` deixar de ter o que proteger (gotcha 8 do `CLAUDE.md`,
 * `PEND-5a-5`). O controle positivo da exclusão é o **Ajudante da Divisão**, que tem
 * `disciplinas.criar` — e é o perfil que de fato faria isso na Divisão.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR o cenário. Nunca para asserção. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Perfil =
  | "encarregado_administracao_academica"
  | "ajudante_administracao_academica"
  | "operador"
  | "encarregado_orientacao_pedagogica";

const sessoes = new Map<Perfil, SupabaseClient>();
const email = (p: Perfil) => `5b-${p}@ciaara.teste5b`;

const cliente = (p: Perfil): SupabaseClient => {
  const c = sessoes.get(p);
  if (!c) throw new Error(`sessao ausente para ${p}`);
  return c;
};

/*
 * ⚠️ IDENTIFICADORES GERADOS, NUNCA FIXOS (regra 9.1 do `CLAUDE.md`): curso não é apagável, então a
 * amostra é idempotente e a sigla carrega um carimbo de tempo. Código fixo faria a segunda execução
 * falhar por `23505`, que **parece recusa de permissão e não é**.
 */
const SELO = Date.now().toString(36).toUpperCase().slice(-5);
const SIGLA_CURSO = `C-Exp-5B${SELO}`;

let cursoId = "";
let turmaId = "";
let disciplinaParaExcluirId = "";
let disciplinaComTurmaId = "";
let turmaDisciplinaId = "";

async function criarUsuario(perfil: Perfil, escopo: string): Promise<void> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(perfil),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email(perfil)}: ${error.message}`);

  const { error: erroUsuario } = await admin.from("usuarios").insert({
    codigo: `USR-5B-${perfil}`,
    auth_user_id: data.user.id,
    email: email(perfil),
    nome: `Teste 5B ${perfil}`,
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

/** Deixa a base no estado inicial. Roda ANTES e DEPOIS — execução interrompida não inviabiliza a seguinte. */
async function limpar(): Promise<void> {
  /*
   * ⚠️ AS CONTAS DO AUTH SÃO VARRIDAS PELO DOMÍNIO, e não pelas linhas de `usuarios` — e a razão
   * foi MEDIDA em 25/09/2026, na prova dos defeitos deliberados. Quando o `beforeAll` morre entre
   * `createUser` e o `insert` em `usuarios`, a conta do Auth fica ÓRFÃ: `usuarios` não a conhece,
   * a limpeza não a alcança, e a execução seguinte morre com *"A user with this email address has
   * already been registered"* — em `beforeAll`, o que reporta **14 pulados** e nenhum reprovado.
   * É a mesma classe do `_conta_do_auth` paginado de `conta_local.py`.
   */
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith("@ciaara.teste5b")) {
        await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
    if (data.users.length < 200) break;
  }
  await admin.from("usuarios").delete().like("codigo", "USR-5B-%");
  await admin.from("exclusoes_registradas").delete().like("registro_codigo", "5B-%");

  /*
   * ⚠️ E A TURMA DA AMOSTRA É APAGADA, o que não é zelo: `099_salas.sql` decide entre asserir e
   * pular pela pergunta `count(turmas) > 0`, e uma turma deixada atrás faz aquele arquivo ACHAR
   * que a base do ETL está carregada e reprovar duas asserções com os números da base real
   * (medido: `have: 0, want: 9`). Turma É apagável — só curso não é (regra 9.1).
   * ⚠️ `turma_disciplina` sai ANTES: a FK é `restrict`.
   */
  const { data: turmas } = await admin.from("turmas").select("id").like("codigo", "C-Exp-5B%");
  for (const t of turmas ?? []) {
    await admin.from("turma_disciplina_unidade").delete().eq("turma_disciplina_id", t.id);
    await admin.from("turma_disciplina").delete().eq("turma_id", t.id);
    await admin.from("turmas").delete().eq("id", t.id);
  }
  // O curso fica, como o de toda suíte: o selo no código impede a colisão da próxima execução.
}

beforeAll(async () => {
  await limpar();

  await criarUsuario("encarregado_administracao_academica", "geral");
  await criarUsuario("ajudante_administracao_academica", "geral");
  await criarUsuario("operador", "geral");
  await criarUsuario("encarregado_orientacao_pedagogica", "geral");

  const { data: curso, error: erroCurso } = await admin
    .rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA_CURSO,
        nome_curso: "Curso da suite 5B",
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

  // ⚠️ A TURMA VEM ANTES DAS DISCIPLINAS: criar turma faz nascer a linha de `turma_disciplina` por
  //    disciplina ATIVA do curso (`FR-032.2` da spec 009). Com a disciplina antes, a linha nasceria
  //    sozinha e a inserção explícita colidiria — é o achado A-2 da fatia (a).
  const { data: turma, error: erroTurma } = await admin
    .from("turmas")
    .insert({
      curso_id: cursoId,
      turma: "T1",
      ano_letivo: 2026,
      status: "planejada",
      modalidade: "presencial",
      data_inicio: "2026-03-02",
      data_termino: "2026-06-30",
    })
    .select("id")
    .single();
  if (erroTurma) throw new Error(`falha ao criar turma: ${erroTurma.message}`);
  turmaId = (turma as { id: string }).id;

  const { error: erroInstrutor } = await admin
    .from("instrutores")
    .insert({
      codigo: `5B-INS-${SELO}`,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor Da Suite 5B",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  if (erroInstrutor) throw new Error(`falha ao criar instrutor: ${erroInstrutor.message}`);

  // Uma disciplina LIMPA (para excluir) e uma COM linha de turma (para ser recusada).
  const { data: limpa, error: erroLimpa } = await admin
    .from("disciplinas")
    .insert({
      codigo: `5B-LIMPA-${SELO}`,
      curso_id: cursoId,
      cod_disciplina: `L${SELO}`,
      nome_disciplina: "Disciplina limpa da suite 5B",
      carga_horaria_tempos: 10,
    })
    .select("id")
    .single();
  if (erroLimpa) throw new Error(`falha ao criar disciplina limpa: ${erroLimpa.message}`);
  disciplinaParaExcluirId = (limpa as { id: string }).id;

  const { data: comTurma, error: erroComTurma } = await admin
    .from("disciplinas")
    .insert({
      codigo: `5B-TURMA-${SELO}`,
      curso_id: cursoId,
      cod_disciplina: `T${SELO}`,
      nome_disciplina: "Disciplina com linha de turma",
      carga_horaria_tempos: 10,
    })
    .select("id")
    .single();
  if (erroComTurma) throw new Error(`falha ao criar disciplina com turma: ${erroComTurma.message}`);
  disciplinaComTurmaId = (comTurma as { id: string }).id;

  const { data: td, error: erroTd } = await admin
    .from("turma_disciplina")
    .insert({
      turma_id: turmaId,
      disciplina_id: disciplinaComTurmaId,
      origem_periodo: "nao_informado",
    })
    .select("id")
    .single();
  if (erroTd) throw new Error(`falha ao criar turma_disciplina: ${erroTd.message}`);
  turmaDisciplinaId = (td as { id: string }).id;
}, 120_000);

afterAll(async () => {
  await limpar();
});

describe("`FR-021` · quem exclui disciplina é quem pode CRIAR disciplina", () => {
  /*
   * ⚠️ ESTE É O CASO QUE DISCRIMINA. O Operador tem `disciplinas.editar` e **não** tem
   * `disciplinas.criar` — é o único perfil nessa situação. Antes da migration não havia RPC
   * nenhuma; depois dela, a escolha de amarrar a exclusão a `criar` só se observa por ele.
   */
  it("N-1 · o OPERADOR — que edita disciplina — NÃO exclui: o banco devolve 42501", async () => {
    const { error } = await cliente("operador").rpc("excluir_disciplina", {
      p_disciplina_id: disciplinaParaExcluirId,
      p_codigo_confirmacao: `5B-LIMPA-${SELO}`,
    });
    expect(error, "o Operador excluiu disciplina").not.toBeNull();
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });

  it("N-1b · e o perfil sem `disciplinas.editar` nem `criar` também recebe 42501", async () => {
    const { error } = await cliente("encarregado_orientacao_pedagogica").rpc("excluir_disciplina", {
      p_disciplina_id: disciplinaParaExcluirId,
      p_codigo_confirmacao: `5B-LIMPA-${SELO}`,
    });
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });

  it("P-1 · o AJUDANTE DA DIVISÃO — que pode criar — exclui a disciplina sem dependente", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_disciplina", {
      p_disciplina_id: disciplinaParaExcluirId,
      p_codigo_confirmacao: `5B-LIMPA-${SELO}`,
    });
    expect(error, JSON.stringify(error)).toBeNull();

    const { data } = await admin.from("disciplinas").select("id").eq("id", disciplinaParaExcluirId);
    expect(data ?? [], "a disciplina continua no banco depois da exclusão").toHaveLength(0);
  });

  it("`FR-024` · e a exclusão deixou rastro com QUEM, o quê e quando", async () => {
    const { data } = await admin
      .from("exclusoes_registradas")
      .select("tabela, registro_codigo, excluido_por, excluido_em, retrato")
      .eq("registro_codigo", `5B-LIMPA-${SELO}`);

    expect(data ?? [], "nenhum rastro gravado").toHaveLength(1);
    const linha = (data ?? [])[0] as {
      excluido_por: string;
      tabela: string;
      retrato: Record<string, unknown>;
    };
    expect(linha.tabela).toBe("disciplinas");
    expect(linha.retrato.cod_disciplina).toBe(`L${SELO}`);

    // ⚠️ `excluido_por` é lido de `auth.uid()` DENTRO da função — nunca mandado pelo cliente.
    const { data: quem } = await admin
      .from("usuarios")
      .select("auth_user_id")
      .eq("codigo", "USR-5B-ajudante_administracao_academica")
      .single();
    expect(linha.excluido_por).toBe((quem as { auth_user_id: string }).auth_user_id);
  });

  it("`FR-022` · disciplina COM linha de turma é recusada com 23503, mesmo para quem pode", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_disciplina", {
      p_disciplina_id: disciplinaComTurmaId,
      p_codigo_confirmacao: `5B-TURMA-${SELO}`,
    });
    expect(error?.code, JSON.stringify(error)).toBe("23503");
    expect(error?.hint ?? "", "a chave da recusa é o que a tela traduz").toBe(
      "registro_com_historico",
    );
  });

  it("`FR-023` · código de confirmação errado é recusado com 22023, antes de qualquer outra coisa", async () => {
    const { error } = await cliente("ajudante_administracao_academica").rpc("excluir_disciplina", {
      p_disciplina_id: disciplinaComTurmaId,
      p_codigo_confirmacao: "CODIGO-QUE-NAO-CONFERE",
    });
    expect(error?.code, JSON.stringify(error)).toBe("22023");
  });
});

describe("`FR-035` / Q-10 · quem edita período e instrutor por turma é `disciplinas.editar`", () => {
  /*
   * ⚠️ A OUTRA METADE DO CASO QUE DISCRIMINA: o mesmo Operador que é recusado na exclusão é
   * ACEITO aqui. É isto que prova que a recusa de cima é sobre a permissão certa, e não um
   * "operador não pode nada" acidental.
   */
  it("P-2 · o OPERADOR edita o período da disciplina na turma", async () => {
    const { error } = await cliente("operador")
      .from("turma_disciplina")
      .update({
        previsao_inicio: "2026-03-10",
        previsao_termino: "2026-04-10",
        origem_periodo: "manual",
      })
      .eq("id", turmaDisciplinaId);
    expect(error, JSON.stringify(error)).toBeNull();
  });

  it("N-2 · mas NÃO cria disciplina — o banco devolve 42501", async () => {
    const { error } = await cliente("operador")
      .from("disciplinas")
      .insert({
        curso_id: cursoId,
        cod_disciplina: `X${SELO}`,
        nome_disciplina: "Disciplina que o Operador tentou criar",
        carga_horaria_tempos: 10,
      });
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });

  it("`FR-030.1` · e período fora da janela da turma é recusado pelo banco, com a chave certa", async () => {
    const { error } = await cliente("operador")
      .from("turma_disciplina")
      .update({
        previsao_inicio: "2026-01-05",
        previsao_termino: "2026-01-20",
        origem_periodo: "manual",
      })
      .eq("id", turmaDisciplinaId);
    expect(error?.code, JSON.stringify(error)).toBe("23514");
    expect(error?.hint ?? "").toBe("periodo_fora_da_janela");
  });
});

describe("Q-09 / P-3 · o rastro de exclusão é lido por quem tem `auditoria.ler`", () => {
  it("P-3 · o Encarregado da Divisão lê `exclusoes_registradas`", async () => {
    const { data, error } = await cliente("encarregado_administracao_academica")
      .from("exclusoes_registradas")
      .select("registro_codigo")
      .eq("registro_codigo", `5B-LIMPA-${SELO}`);
    expect(error, JSON.stringify(error)).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it("N-3 · o OPERADOR, que não tem `auditoria.ler`, não vê nada — e a lista vem VAZIA, não com erro", async () => {
    // ⚠️ Distinguir "não há" de "você não vê" é o gotcha 4: a policy de SELECT não devolve erro,
    //    devolve lista vazia. A asserção confere as duas coisas — sem erro E sem linha.
    const { data, error } = await cliente("operador")
      .from("exclusoes_registradas")
      .select("registro_codigo")
      .eq("registro_codigo", `5B-LIMPA-${SELO}`);
    expect(error, JSON.stringify(error)).toBeNull();
    expect(data ?? [], "o Operador enxergou o rastro").toHaveLength(0);
  });

  it("N-4 · e ninguém escreve no rastro pela interface de dados — nem quem o lê", async () => {
    const { error } = await cliente("encarregado_administracao_academica")
      .from("exclusoes_registradas")
      .insert({
        tabela: "disciplinas",
        registro_id: disciplinaComTurmaId,
        registro_codigo: "5B-FORJADO",
        retrato: {},
        excluido_por: "00000000-0000-0000-0000-000000000000",
      });
    expect(error, "o rastro aceitou escrita pela interface de dados").not.toBeNull();
  });
});

describe("`FR-070` / A-2 · a disciplina nasce nas turmas pela RPC", () => {
  it("P-4 · o Ajudante cria disciplina pela RPC e a linha da turma nasce junto", async () => {
    const { data, error } = await cliente("ajudante_administracao_academica")
      .rpc("criar_disciplina", {
        p_disciplina: {
          curso_id: cursoId,
          cod_disciplina: `R${SELO}`,
          nome_disciplina: "Disciplina criada pela RPC na suite 5B",
          carga_horaria_tempos: 20,
        },
      })
      .single();
    expect(error, JSON.stringify(error)).toBeNull();

    const nova = data as { id: string; codigo: string };
    // `FR-012`: o código veio do banco, no formato DIS-NNNNNN — ninguém digitou.
    expect(nova.codigo).toMatch(/^DIS-\d{6}$/);

    const { data: linhas } = await admin
      .from("turma_disciplina")
      .select("id, origem_periodo")
      .eq("disciplina_id", nova.id);
    expect(linhas ?? [], "a linha da turma não nasceu com a disciplina").toHaveLength(1);
    expect((linhas ?? [])[0]?.origem_periodo).toBe("nao_informado");
  });

  it("N-5 · o OPERADOR não cria disciplina pela RPC — a RPC é INVOKER, e a RLS decide", async () => {
    const { error } = await cliente("operador").rpc("criar_disciplina", {
      p_disciplina: {
        curso_id: cursoId,
        cod_disciplina: `O${SELO}`,
        nome_disciplina: "Disciplina que o Operador tentou criar pela RPC",
        carga_horaria_tempos: 10,
      },
    });
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });
});
