/**
 * Spec 021, Bloco 6, PR 2 — a cópia (RC-7), a correção do currículo em uso (RC-6) e o arquivamento (RC-10), provados
 * com SESSÃO AUTENTICADA (DoD 4). Toda recusa conferida pelo CÓDIGO e pela CHAVE, e o dado conferido no BANCO.
 *
 * > *"RC-6 · Correção de erro. Corrigir um currículo que já tem turma com lançamento (mudar valor, acrescentar ou
 * > inativar item) é permitido só ao trio (…), com justificativa obrigatória e trilha (…). Completar o que estava vazio é
 * > livre. Os demais perfis não editam currículo em uso."*
 *
 * Os casos que discriminam (DoD 8): o OPERADOR edita disciplina (`disciplinas.editar`) e NÃO corrige o currículo em uso
 * — mas COMPLETA o vazio; o AJUDANTE corrige, e só com justificativa.
 *
 * ⚠️ Idempotente (regra 9.1, provado rodando DUAS vezes seguidas): o curso, a turma, o instrutor e a avaliação são
 *    reaproveitados; o currículo novo de cada rodada nasce com número novo, e os das rodadas anteriores saem por exclusão
 *    lógica no preparo (D-19: sem turma, o currículo se inativa); o arquivamento é desfeito no fim.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testeccc";
const SENHA = "senha-de-teste-com-12+";
const SIGLA = "CCC-REG";
const CABECALHO = "x-justificativa-de-correcao";
/* "Hoje" de quem chama (D20): fixo, para a situação de cada currículo não depender do relógio. */
const HOJE = "2030-06-01";

const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTAS = {
  admin: { perfil: "admin", escopo: "geral" },
  ajudante: { perfil: "ajudante_administracao_academica", escopo: "geral" },
  operador: { perfil: "operador", escopo: "regular" },
  visualizacao: { perfil: "visualizacao", escopo: "geral" },
} as const;
type Conta = keyof typeof CONTAS;

const sessoes = new Map<Conta, SupabaseClient>();
const sessao = (c: Conta) => sessoes.get(c)!;
const email = (c: Conta) => `ccc-${c}@${DOMINIO}`;
const autor = new Map<Conta, string>();

let CURSO = "";
let CURRICULO_1 = "";
let TURMA = "";
let DISCIPLINA = "";

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

const base64 = (texto: string) => Buffer.from(texto, "utf8").toString("base64");

async function criarConta(c: Conta): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(c),
    password: SENHA,
    email_confirm: true,
  });
  conferir(`conta ${c}`, error);
  autor.set(c, data.user!.id);
  conferir(
    `cadastro ${c}`,
    (
      await servico.from("usuarios").insert({
        codigo: `USR-CCC-${c.toUpperCase()}`,
        auth_user_id: data.user!.id,
        email: email(c),
        nome: `Prova CCC ${c}`,
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

async function limparContas(): Promise<void> {
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`))
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
    }
    if (data.users.length < 200) break;
  }
  conferir("usuarios", (await servico.from("usuarios").delete().like("codigo", "USR-CCC-%")).error);
}

/** O curso (regra 9.1: reaproveitado), o currículo 1, uma disciplina, a turma e a avaliação que o põe em uso. */
async function amostra(): Promise<void> {
  const { data: existe } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (!existe) {
    const { error } = await servico.rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: SIGLA,
          nome_curso: "Curso da prova CCC",
          classificacao: "regular",
          modalidade: "presencial",
          duracao_dias: 200,
          proposito: "Propósito de origem",
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
  }
  const { data: curso } = await servico.from("cursos").select("id").eq("codigo", SIGLA).single();
  CURSO = (curso as { id: string }).id;
  /* O currículo 1 desta amostra vale desde 2020 — antes de qualquer "hoje" desta prova. */
  conferir(
    "vigência do currículo 1",
    (
      await servico
        .from("curriculos")
        .update({ vigente_de: "2020-01-01" })
        .eq("curso_id", CURSO)
        .eq("versao", 1)
    ).error,
  );
  const { data: c1 } = await servico
    .from("curriculos")
    .select("id")
    .eq("curso_id", CURSO)
    .eq("versao", 1)
    .single();
  CURRICULO_1 = (c1 as { id: string }).id;
  /* As rodadas anteriores: o currículo novo sai por exclusão lógica (sem turma); o 1 volta a não estar arquivado. */
  conferir(
    "currículos anteriores",
    (
      await servico
        .from("curriculos")
        .update({ status: "inativo" })
        .eq("curso_id", CURSO)
        .gt("versao", 1)
    ).error,
  );
  conferir(
    "desarquivar o 1",
    (
      await servico
        .from("curriculos")
        .update({ arquivado_em: null, arquivado_por: null })
        .eq("id", CURRICULO_1)
    ).error,
  );

  const { data: disc } = await servico
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .maybeSingle();
  if (!disc) {
    conferir(
      "disciplina",
      /* `codigo` explícito: o padrão chama `app.proximo_codigo_*`, e a `service_role` não tem `usage` em `app`. */
      (
        await servico.from("disciplinas").insert({
          codigo: "CCC-DIS-I",
          curso_id: CURSO,
          curriculo_id: CURRICULO_1,
          cod_disciplina: "I",
          nome_disciplina: "Disciplina da prova CCC",
          carga_horaria_tempos: 40,
        })
      ).error,
    );
  }
  const { data: d } = await servico
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .single();
  DISCIPLINA = (d as { id: string }).id;
  /* Sem sessão o gatilho da RC-6 não age: o preparo devolve a disciplina ao estado de origem. */
  conferir(
    "disciplina de origem",
    (
      await servico
        .from("disciplinas")
        .update({ carga_horaria_tempos: 40, tecnica_ensino_sugerida: null, status: "ativo" })
        .eq("id", DISCIPLINA)
    ).error,
  );

  const { data: turma } = await servico
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO)
    .eq("ano_letivo", 2030)
    .maybeSingle();
  if (!turma) {
    conferir(
      "turma",
      (
        await servico.from("turmas").insert({
          curso_id: CURSO,
          ano_letivo: 2030,
          modalidade: "presencial",
          status: "ativa",
          data_inicio: "2030-02-01",
          data_termino: "2030-11-30",
          codigo: `${SIGLA} 2030`,
        })
      ).error,
    );
  }
  const { data: t } = await servico
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO)
    .eq("ano_letivo", 2030)
    .single();
  TURMA = (t as { id: string }).id;

  /* A turma desarquivada (uma rodada interrompida pode tê-la deixado arquivada). */
  const { data: arq } = await servico
    .from("vw_turmas_arquivadas")
    .select("turma_id")
    .eq("turma_id", TURMA);
  if ((arq ?? []).length > 0) {
    conferir(
      "desarquivar a turma",
      (
        await sessao("admin")
          .from("turma_arquivamentos")
          .insert({ turma_id: TURMA, acao: "desarquivar" })
      ).error,
    );
  }

  /* O lançamento que põe o currículo 1 em uso: uma avaliação da turma. */
  const { data: av } = await servico
    .from("avaliacoes")
    .select("id")
    .eq("codigo", "CCC-AVL")
    .maybeSingle();
  if (!av) {
    /* A lista nasce vazia no `db:reset` (a carga a povoa): a amostra semeia o tipo que usa. */
    const { data: tipo } = await servico
      .from("config_listas")
      .select("id")
      .eq("lista", "tipos_avaliacao")
      .eq("valor", "Prova Escrita")
      .maybeSingle();
    if (!tipo) {
      conferir(
        "tipo de avaliação",
        (
          await servico.from("config_listas").insert({
            lista: "tipos_avaliacao",
            valor: "Prova Escrita",
            rotulo_exibicao: "Prova Escrita",
            ordem: 1,
          })
        ).error,
      );
    }
    await servico.from("instrutores").upsert(
      {
        codigo: "CCC-INS",
        posto_graduacao: "CT",
        esp_hab_obs: "-EF",
        nome_completo: "Instrutor CCC",
        categoria: "Militar",
        om: "OM-CCC",
        status: "ativo",
      },
      { onConflict: "codigo" },
    );
    const { data: ins } = await servico
      .from("instrutores")
      .select("id")
      .eq("codigo", "CCC-INS")
      .single();
    conferir(
      "avaliação",
      (
        await servico.from("avaliacoes").insert({
          codigo: "CCC-AVL",
          turma_id: TURMA,
          disciplina_id: DISCIPLINA,
          curso_id: CURSO,
          tipo_avaliacao: "Prova Escrita",
          data_avaliacao: "2030-03-10",
          instrutor_responsavel_id: (ins as { id: string }).id,
        })
      ).error,
    );
  }
}

beforeAll(async () => {
  await limparContas();
  for (const c of Object.keys(CONTAS) as Conta[]) await criarConta(c);
  await amostra();
}, 120_000);

afterAll(async () => {
  await limparContas();
});

async function cargaDaDisciplina(): Promise<number> {
  const { data } = await servico
    .from("disciplinas")
    .select("carga_horaria_tempos")
    .eq("id", DISCIPLINA)
    .single();
  return Number((data as { carga_horaria_tempos: number }).carga_horaria_tempos);
}

describe("RC-7 · Novo currículo nasce como CÓPIA do vigente — e quem cria é quem edita o curso", () => {
  it("o Operador e o perfil de leitura são recusados pelo porteiro (`42501`, `curriculo_sem_permissao`)", async () => {
    for (const c of ["operador", "visualizacao"] as const) {
      const { error } = await sessao(c).rpc(
        "criar_curriculo" as never,
        {
          p_curso_id: CURSO,
          p_vigente_de: "2031-01-01",
          p_descricao: "não deve nascer",
          p_hoje: HOJE,
        } as never,
      );
      expect(error?.code, `${c} criou currículo`).toBe("42501");
      expect((error as { hint?: string } | null)?.hint).toBe("curriculo_sem_permissao");
    }
  });

  it("o Ajudante cria; o currículo novo traz as disciplinas do vigente, na mesma linhagem, e o 1 não muda", async () => {
    const { data: id, error } = await sessao("ajudante").rpc(
      "criar_curriculo" as never,
      {
        p_curso_id: CURSO,
        p_vigente_de: "2031-01-01",
        p_descricao: "Revisão da prova",
        p_hoje: HOJE,
      } as never,
    );
    expect(error).toBeNull();
    const { data: copia } = await servico
      .from("disciplinas")
      .select("cod_disciplina, carga_horaria_tempos, linhagem_id")
      .eq("curriculo_id", id as unknown as string)
      .eq("status", "ativo");
    const { data: origem } = await servico
      .from("disciplinas")
      .select("cod_disciplina, carga_horaria_tempos, linhagem_id")
      .eq("curriculo_id", CURRICULO_1)
      .eq("status", "ativo");
    expect(copia).toEqual(origem);
    /* A turma continua no currículo dela. */
    const { data: t } = await servico
      .from("turmas")
      .select("curriculo_id")
      .eq("id", TURMA)
      .single();
    expect((t as { curriculo_id: string }).curriculo_id).toBe(CURRICULO_1);
  });

  it("⚠️ com um futuro, não se cria outro (`ja_ha_curriculo_futuro`, D-27)", async () => {
    const { error } = await sessao("ajudante").rpc(
      "criar_curriculo" as never,
      {
        p_curso_id: CURSO,
        p_vigente_de: "2032-01-01",
        p_descricao: "o segundo futuro",
        p_hoje: HOJE,
      } as never,
    );
    expect(error?.code).toBe("23514");
    expect((error as { hint?: string } | null)?.hint).toBe("ja_ha_curriculo_futuro");
  });
});

describe("RC-6 · a correção do currículo em uso: só o trio, com justificativa, na trilha", () => {
  it("o Operador NÃO corrige (`42501`, `curriculo_em_uso`), e o valor fica", async () => {
    const { error } = await sessao("operador")
      .from("disciplinas")
      .update({ carga_horaria_tempos: 41 })
      .eq("id", DISCIPLINA);
    expect(error?.code).toBe("42501");
    expect((error as { hint?: string } | null)?.hint).toBe("curriculo_em_uso");
    expect(await cargaDaDisciplina()).toBe(40);
  });

  it("o Ajudante, SEM justificativa, é recusado (`23514`, `justificativa_obrigatoria`), e o valor fica", async () => {
    const { error } = await sessao("ajudante")
      .from("disciplinas")
      .update({ carga_horaria_tempos: 41 })
      .eq("id", DISCIPLINA);
    expect(error?.code).toBe("23514");
    expect((error as { hint?: string } | null)?.hint).toBe("justificativa_obrigatoria");
    expect(await cargaDaDisciplina()).toBe(40);
  });

  it("o Ajudante, COM justificativa, corrige — e a trilha guarda quem, o valor anterior e o motivo (com acento)", async () => {
    const motivo = "Correção de digitação: a CH é 41 no currículo da DEnsM.";
    const { data, error } = await sessao("ajudante")
      .from("disciplinas")
      .update({ carga_horaria_tempos: 41 })
      .eq("id", DISCIPLINA)
      .select("id")
      .setHeader(CABECALHO, base64(motivo));
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(await cargaDaDisciplina()).toBe(41);

    const { data: trilha } = await servico
      .from("correcoes_de_curriculo")
      .select("tabela, acao, campos, antes, depois, justificativa, autor_id")
      .eq("registro_id", DISCIPLINA)
      .order("feito_em", { ascending: false })
      .limit(1)
      .single();
    expect(trilha).toMatchObject({
      tabela: "disciplinas",
      acao: "alterar",
      campos: ["carga_horaria_tempos"],
      justificativa: motivo,
      autor_id: autor.get("ajudante"),
    });
    expect((trilha as { antes: { carga_horaria_tempos: number } }).antes.carga_horaria_tempos).toBe(
      40,
    );
    expect(
      (trilha as { depois: { carga_horaria_tempos: number } }).depois.carga_horaria_tempos,
    ).toBe(41);
  });

  it("⚠️ COMPLETAR O VAZIO É LIVRE: o Operador preenche a técnica que estava nula, sem justificativa e sem trilha", async () => {
    const antes = await servico
      .from("correcoes_de_curriculo")
      .select("id", { count: "exact", head: true })
      .eq("registro_id", DISCIPLINA);
    const { data, error } = await sessao("operador")
      .from("disciplinas")
      .update({ tecnica_ensino_sugerida: "Aula expositiva" })
      .eq("id", DISCIPLINA)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const depois = await servico
      .from("correcoes_de_curriculo")
      .select("id", { count: "exact", head: true })
      .eq("registro_id", DISCIPLINA);
    expect(depois.count).toBe(antes.count);
  });
});

describe("RC-10 · arquivar o currículo passado: só o trio, com todas as turmas arquivadas", () => {
  it("o Operador é recusado (`42501`)", async () => {
    const { error } = await sessao("operador").rpc(
      "arquivar_curriculo" as never,
      {
        p_curriculo_id: CURRICULO_1,
        p_hoje: "2031-06-01",
      } as never,
    );
    expect(error?.code).toBe("42501");
    expect((error as { hint?: string } | null)?.hint).toBe(
      "arquivamento_de_curriculo_sem_permissao",
    );
  });

  it("o vigente não se arquiva (`curriculo_nao_passado`)", async () => {
    const { error } = await sessao("ajudante").rpc(
      "arquivar_curriculo" as never,
      {
        p_curriculo_id: CURRICULO_1,
        p_hoje: HOJE,
      } as never,
    );
    expect((error as { hint?: string } | null)?.hint).toBe("curriculo_nao_passado");
  });

  it("passado, com turma NÃO arquivada, é recusado; com ela arquivada, arquiva — e desarquiva", async () => {
    const depoisDoNovo = "2031-06-01";
    const recusado = await sessao("ajudante").rpc(
      "arquivar_curriculo" as never,
      {
        p_curriculo_id: CURRICULO_1,
        p_hoje: depoisDoNovo,
      } as never,
    );
    expect((recusado.error as { hint?: string } | null)?.hint).toBe(
      "curriculo_com_turma_nao_arquivada",
    );

    conferir(
      "arquivar a turma",
      (
        await sessao("admin")
          .from("turma_arquivamentos")
          .insert({ turma_id: TURMA, acao: "arquivar" })
      ).error,
    );
    const aceito = await sessao("ajudante").rpc(
      "arquivar_curriculo" as never,
      {
        p_curriculo_id: CURRICULO_1,
        p_hoje: depoisDoNovo,
      } as never,
    );
    expect(aceito.error).toBeNull();
    const { data: arquivado } = await servico
      .from("curriculos")
      .select("arquivado_em, arquivado_por")
      .eq("id", CURRICULO_1)
      .single();
    expect((arquivado as { arquivado_em: string | null }).arquivado_em).not.toBeNull();
    expect((arquivado as { arquivado_por: string | null }).arquivado_por).toBe(
      autor.get("ajudante"),
    );

    const volta = await sessao("ajudante").rpc(
      "desarquivar_curriculo" as never,
      {
        p_curriculo_id: CURRICULO_1,
      } as never,
    );
    expect(volta.error).toBeNull();
    conferir(
      "desarquivar a turma",
      (
        await sessao("admin")
          .from("turma_arquivamentos")
          .insert({ turma_id: TURMA, acao: "desarquivar" })
      ).error,
    );
    const { data: devolvido } = await servico
      .from("curriculos")
      .select("arquivado_em")
      .eq("id", CURRICULO_1)
      .single();
    expect((devolvido as { arquivado_em: string | null }).arquivado_em).toBeNull();
  });
});

describe("D-19 e D-36 · descartar o currículo criado por engano: exclusão lógica, só sem turma", () => {
  async function futuroDaRodada(): Promise<string> {
    const { data } = await servico
      .from("curriculos")
      .select("id")
      .eq("curso_id", CURSO)
      .eq("status", "ativo")
      .gt("versao", 1)
      .single();
    return (data as { id: string }).id;
  }

  it("o Operador não descarta: a RLS recusa em silêncio — zero linhas, e o currículo segue ativo", async () => {
    const id = await futuroDaRodada();
    const { data, error } = await sessao("operador")
      .from("curriculos")
      .update({ status: "inativo" })
      .eq("id", id)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
    const { data: c } = await servico.from("curriculos").select("status").eq("id", id).single();
    expect((c as { status: string }).status).toBe("ativo");
  });

  it("o currículo que a turma segue não se descarta (`23514`, `versao_em_uso`)", async () => {
    const { error } = await sessao("ajudante")
      .from("curriculos")
      .update({ status: "inativo" })
      .eq("id", CURRICULO_1);
    expect(error?.code).toBe("23514");
    expect((error as { hint?: string } | null)?.hint).toBe("versao_em_uso");
  });

  it("o Ajudante descarta o futuro que nenhuma turma segue — e ele fica guardado, inativo", async () => {
    const id = await futuroDaRodada();
    const { data, error } = await sessao("ajudante")
      .from("curriculos")
      .update({ status: "inativo" })
      .eq("id", id)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const { data: c } = await servico.from("curriculos").select("status").eq("id", id).single();
    expect((c as { status: string }).status).toBe("inativo");
  });
});
