/**
 * RT-8 (spec 029, Bloco 14, `FR-007.4`) — **a turma arquivada CONTINUA contando em Cursos, em Instrutores e na ficha
 * do instrutor**, no ano dela e pela situação que tinha. Provado contra o banco local, com SESSÃO AUTENTICADA.
 *
 * > *"Arquivar esconde a turma das listas do dia a dia — carrossel das turmas, submenu, listas de ativas e de escolha,
 * > avisos —, mas ela CONTINUA contando nas estatísticas e nos cartões do ano dela, com a situação que tinha."*
 * > — Bernardo Villas Boas, 28/10/2026 (`docs/correcoes/padroes-de-tela.md`, RT-8)
 *
 * ⚠️ **ESTE ARQUIVO FALTAVA** (revisão adversarial do Bloco 14, achado 16): o `FR-007.4` dizia *"já contam: só se
 *    confirma por teste"*, e nenhum teste exercitava os números de Instrutores, da ficha nem da página do curso com uma
 *    turma arquivada — só o Início e `/turmas` tinham caso (`inicio-bloco-4.spec.ts`, `contagem-por-situacao.test.ts`).
 *
 * ⚠️ **O QUE ELE COBRE, E O QUE NÃO COBRE.** Aqui se prova a FONTE de cada número: as duas views da carga do instrutor,
 *    a leitura das designações de `/instrutores` passada por `selecionadosNoAno` e `indicadoresDeInstrutores`, e a
 *    leitura das turmas da página do curso — cada uma com a arquivada dentro. Uma tela que tirasse a arquivada DEPOIS
 *    da leitura (um `semAsArquivadas` antes da conta) não passa por aqui: quem a pega é a guarda de unidade
 *    `tests/unidade/arquivada-conta-nas-estatisticas.test.ts`. As duas juntas fecham o `FR-007.4`.
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É A PRÓPRIA AMOSTRA:** o instrutor tem UMA designação, UMA aula e UMA atribuição,
 *    as três na turma CONCLUÍDA e ARQUIVADA. Tirada a arquivada em qualquer uma das fontes, o número cai a zero (ou a
 *    linha some), e a asserção correspondente reprova. O controle positivo confere que a turma ESTÁ arquivada — sem ele,
 *    o arquivo passaria igual medindo uma turma comum.
 *
 * ⚠️ **A LEITORA É O ENCARREGADO DA ADMINISTRAÇÃO ACADÊMICA, de escopo geral**, e não o Admin: um Admin a mais faz o
 *    `rls.test.ts` perder o "último Admin" (gotcha 8). As views são `security_invoker` e chamam `app.*`, que a
 *    `service_role` não alcança — por isso a leitura é por sessão, e a semeadura pela chave de serviço.
 * ⚠️ **AMOSTRA IDEMPOTENTE** (regra 9.1): o curso é reaproveitado; o resto nasce e sai a cada execução, com o erro de
 *    cada limpeza conferido. O registro de arquivamento é só de acréscimo e fica (sem FK), como em `bloco-2.test.ts`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { COLUNAS_DAS_TURMAS_DO_CURSO } from "@/app/(app)/cursos/[curso]/consulta";
import { capacitacaoDoCadastro } from "@/lib/dominio/capacitacao-didatica";
import { indicadoresDeInstrutores } from "@/lib/dominio/indicadores-instrutor";
import { selecionadosNoAno, type DesignacaoComAno } from "@/lib/dominio/selecao-no-ano";

import { chaveLocal } from "./rls/chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const DOMINIO = "ciaara.testearqe";
const EMAIL = `arqe-encarregado@${DOMINIO}`;
const SENHA = "senha-de-teste-com-12+";
const SIGLA = "ARQE-CUR";
/** O ano da turma arquivada — longe do dado real e dos anos das outras suítes (2026, 2030, 2045, 2046). */
const ANO = 2049;
const CH = 40;
const TEMPOS_DA_AULA = 3;

/** ⚠️ Cliente SEM tipo: a amostra insere direto em tabela com gatilho (gotcha 5). */
const servico: SupabaseClient = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let sessao: SupabaseClient;

let cursoId = "";
let turmaId = "";
let turmaCodigo = "";
let curriculoDaTurma = "";
let instrutorId = "";

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limpar(): Promise<void> {
  const { data: curso } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (curso) {
    const id = (curso as { id: string }).id;
    conferir(
      "aulas",
      (await servico.from("registros_aula").delete().like("codigo", "ARQE-%")).error,
    );
    const { data: turmas } = await servico.from("turmas").select("id").eq("curso_id", id);
    for (const t of (turmas ?? []) as { id: string }[]) {
      const { data: tds } = await servico
        .from("turma_disciplina")
        .select("id")
        .eq("turma_id", t.id);
      const ids = ((tds ?? []) as { id: string }[]).map((td) => td.id);
      if (ids.length > 0) {
        conferir(
          "designações",
          (await servico.from("turma_disciplina_instrutor").delete().in("turma_disciplina_id", ids))
            .error,
        );
      }
      conferir(
        "linhas da turma",
        (await servico.from("turma_disciplina").delete().eq("turma_id", t.id)).error,
      );
      conferir("turma", (await servico.from("turmas").delete().eq("id", t.id)).error);
    }
  }
  conferir(
    "habilitações",
    (await servico.from("instrutor_disciplina").delete().like("codigo", "ARQE-%")).error,
  );
  conferir("UEs", (await servico.from("unidades_ensino").delete().like("codigo", "ARQE-%")).error);
  conferir(
    "disciplinas",
    (await servico.from("disciplinas").delete().like("codigo", "ARQE-%")).error,
  );
  conferir(
    "instrutores",
    (await servico.from("instrutores").delete().like("codigo", "ARQE-%")).error,
  );
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`)) {
        await servico.from("usuarios").delete().eq("auth_user_id", u.id);
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
    if (data.users.length < 200) break;
  }
}

async function cursoReaproveitado(): Promise<string> {
  const { data: existe } = await servico
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) return (existe as { id: string }).id;
  // Curso e regime nascem juntos, pela RPC (o gatilho recusa curso sem regime).
  const { data, error } = await servico.rpc("criar_curso_com_regime", {
    p_curso: {
      codigo: SIGLA,
      nome_curso: "Curso da RT-8 nas estatísticas",
      classificacao: "expedito",
      modalidade: "presencial",
      duracao_dias: 80,
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
  });
  conferir("curso", error);
  return (data as { id: string }).id;
}

beforeAll(async () => {
  await limpar();
  cursoId = await cursoReaproveitado();

  // ── o instrutor, habilitado na disciplina ─────────────────────────────────────────────────────
  // ⚠️ `codigo` explícito em toda tabela cujo `DEFAULT` chama `app.proximo_codigo_*`: a `service_role` não tem
  //    `usage` em `app` (gotcha 5.1).
  const { data: ins, error: eIns } = await servico
    .from("instrutores")
    .insert({
      codigo: "ARQE-INS",
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor da RT-8",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  conferir("instrutor", eIns);
  instrutorId = (ins as { id: string }).id;

  const { data: d, error: eD } = await servico
    .from("disciplinas")
    .insert({
      codigo: "ARQE-DIS",
      curso_id: cursoId,
      cod_disciplina: "I",
      nome_disciplina: "Disciplina da RT-8",
      carga_horaria_tempos: CH,
    })
    .select("id")
    .single();
  conferir("disciplina", eD);
  const disciplinaId = (d as { id: string }).id;
  const { data: u, error: eU } = await servico
    .from("unidades_ensino")
    .insert({
      codigo: "ARQE-UE",
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      numero_ue: 1,
      topico: "Tópico da RT-8",
      ch_prevista_tempos: CH,
    })
    .select("id")
    .single();
  conferir("UE", eU);
  conferir(
    "habilitação",
    (
      await servico.from("instrutor_disciplina").insert({
        codigo: "ARQE-VIN",
        instrutor_id: instrutorId,
        disciplina_id: disciplinaId,
        status: "ativo",
      })
    ).error,
  );

  // ── a turma CONCLUÍDA, com a designação e a aula, e só DEPOIS arquivada ─────────────────────────
  // ⚠️ A ordem é obrigatória: a trava da arquivada recusa `INSERT`/`UPDATE` nas linhas dela (`23514 turma_arquivada`).
  //    A turma nasce depois da disciplina, e a `turma_disciplina` nasce com ela (`FR-032.2` da spec 009).
  conferir(
    "turma",
    (
      await servico.from("turmas").insert({
        curso_id: cursoId,
        turma: "T1",
        ano_letivo: ANO,
        status: "concluida",
        modalidade: "presencial",
        data_inicio: `${ANO}-03-01`,
        data_termino: `${ANO}-06-30`,
      })
    ).error,
  );
  const { data: t, error: eT } = await servico
    .from("turmas")
    .select("id, codigo, curriculo_id")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", ANO)
    .single();
  conferir("turma lida", eT);
  turmaId = (t as { id: string }).id;
  turmaCodigo = (t as { codigo: string }).codigo;
  curriculoDaTurma = (t as { curriculo_id: string }).curriculo_id;

  const { data: td, error: eTd } = await servico
    .from("turma_disciplina")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("disciplina_id", disciplinaId)
    .single();
  conferir("linha da turma", eTd);
  conferir(
    "designação",
    (
      await servico.from("turma_disciplina_instrutor").insert({
        codigo: "ARQE-TDI",
        turma_disciplina_id: (td as { id: string }).id,
        instrutor_id: instrutorId,
        status: "ativo",
      })
    ).error,
  );
  conferir(
    "aula",
    (
      await servico.from("registros_aula").insert({
        codigo: "ARQE-A1",
        data: `${ANO}-03-08`,
        ta_inicial: 1,
        tempos_consumidos: TEMPOS_DA_AULA,
        turma_id: turmaId,
        curso_id: cursoId,
        unidade_ensino_id: (u as { id: string }).id,
        instrutor_id: instrutorId,
      })
    ).error,
  );
  conferir(
    "arquivamento",
    (
      await servico
        .from("turma_arquivamentos")
        .insert({ turma_id: turmaId, acao: "arquivar", observacao: "amostra da RT-8" })
    ).error,
  );

  // ── a leitora ─────────────────────────────────────────────────────────────────────────────────
  const { data: conta, error: eConta } = await servico.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  conferir("conta", eConta);
  conferir(
    "cadastro",
    (
      await servico.from("usuarios").insert({
        codigo: "USR-ARQE-ENC",
        auth_user_id: conta.user!.id,
        email: EMAIL,
        nome: "Leitora da RT-8",
        perfil: "encarregado_administracao_academica",
        escopo_curso: "geral",
      })
    ).error,
  );
  sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  conferir(
    "login",
    (await sessao.auth.signInWithPassword({ email: EMAIL, password: SENHA })).error,
  );
}, 120_000);

afterAll(limpar);

/**
 * As designações do instrutor como `/instrutores` as lê — a MESMA consulta da página (`app/(app)/instrutores/page.tsx`,
 * o *Selecionado* com ano), restrita a este instrutor —, no formato que `selecionadosNoAno` recebe.
 */
async function designacoesComoAListaLe(): Promise<DesignacaoComAno[]> {
  const { data, error } = await sessao
    .from("turma_disciplina_instrutor")
    .select(
      "id, instrutor_id, turma_disciplina!inner(status, turmas!inner(ano_letivo, curso:cursos!turmas_curso_id_fkey(codigo, classificacao)))",
    )
    .eq("status", "ativo")
    .eq("turma_disciplina.status", "ativo")
    .eq("instrutor_id", instrutorId);
  expect(error, "a leitura das designações falhou").toBeNull();
  type Lida = {
    instrutor_id: string;
    turma_disciplina: {
      turmas: {
        ano_letivo: number | null;
        curso: { codigo: string | null; classificacao: string | null } | null;
      } | null;
    } | null;
  };
  return ((data ?? []) as unknown as Lida[]).map((d) => ({
    instrutorId: d.instrutor_id,
    anoDaTurma: d.turma_disciplina?.turmas?.ano_letivo ?? null,
    cursoCodigo: d.turma_disciplina?.turmas?.curso?.codigo ?? null,
    classificacao: d.turma_disciplina?.turmas?.curso?.classificacao ?? null,
  }));
}

describe("RT-8 (spec 029, FR-007.4) · a arquivada CONTA em Cursos, Instrutores e na ficha do instrutor", () => {
  it("controle positivo: a turma da amostra ESTÁ arquivada, e concluída — sem isto, o resto mediria uma turma comum", async () => {
    const { data, error } = await sessao
      .from("vw_turmas_arquivadas")
      .select("turma_id")
      .eq("turma_id", turmaId);
    expect(error).toBeNull();
    expect(data, "a turma da amostra não está arquivada").toEqual([{ turma_id: turmaId }]);
    const { data: turma } = await sessao.from("turmas").select("status").eq("id", turmaId).single();
    expect((turma as { status: string }).status, "arquivar mudou a situação da turma").toBe(
      "concluida",
    );
  });

  it("Instrutores · *Selecionado* e a taxa de seleção contam o designado na arquivada — no ano DELA, e só nele", async () => {
    const designacoes = await designacoesComoAListaLe();
    expect(designacoes, "a designação na turma arquivada sumiu da leitura da lista").toEqual([
      { instrutorId, anoDaTurma: ANO, cursoCodigo: SIGLA, classificacao: "expedito" },
    ]);

    const selecionados = selecionadosNoAno(designacoes, ANO);
    expect(
      selecionados.has(instrutorId),
      "o designado na arquivada não conta como selecionado",
    ).toBe(true);
    // O ano é o da turma (RT-6): no ano seguinte ele não é selecionado.
    expect(selecionadosNoAno(designacoes, ANO + 1).has(instrutorId)).toBe(false);

    const { data: linha, error } = await sessao
      .from("vw_instrutores")
      .select("id, habilitado")
      .eq("id", instrutorId)
      .single();
    expect(error).toBeNull();
    const habilitados = new Set(
      (linha as { habilitado: boolean | null }).habilitado === true ? [instrutorId] : [],
    );
    const indicadores = indicadoresDeInstrutores(
      [{ id: instrutorId, capacitacao: capacitacaoDoCadastro(null, null) }],
      habilitados,
      selecionados,
    );
    expect(indicadores.taxaDeSelecao).toEqual({ habilitados: 1, selecionados: 1, percentual: 100 });
  });

  it("Instrutores e ficha · a CH do ano (ministrada) e a prevista contam a aula e a atribuição da arquivada", async () => {
    const { data, error } = await sessao
      .from("vw_instrutor_carga_anual")
      .select("ta_ministrado_ano, ta_previsto_ano")
      .eq("instrutor_id", instrutorId)
      .eq("ano", ANO)
      .maybeSingle();
    expect(error).toBeNull();
    expect(
      data,
      "a carga do ano da arquivada sumiu de `vw_instrutor_carga_anual` (coluna *CH do ano* da lista e números da ficha)",
    ).not.toBeNull();
    const carga = data as { ta_ministrado_ano: number | string; ta_previsto_ano: number | string };
    expect(Number(carga.ta_ministrado_ano), "a aula da arquivada não conta como ministrada").toBe(
      TEMPOS_DA_AULA,
    );
    expect(Number(carga.ta_previsto_ano), "a atribuição da arquivada não conta como prevista").toBe(
      CH,
    );
  });

  it("Ficha do instrutor · a tabela de atribuições do ano traz a da arquivada", async () => {
    const { data, error } = await sessao
      .from("vw_instrutor_carga_prevista")
      .select("turma_codigo, tempos_previstos")
      .eq("instrutor_id", instrutorId)
      .eq("ano", ANO);
    expect(error).toBeNull();
    expect(
      ((data ?? []) as { turma_codigo: string; tempos_previstos: number | string }[]).map((l) => ({
        turma: l.turma_codigo,
        tempos: Number(l.tempos_previstos),
      })),
      "a atribuição na turma arquivada sumiu de `vw_instrutor_carga_prevista`",
    ).toEqual([{ turma: turmaCodigo, tempos: CH }]);
  });

  it("Cursos · a página do curso lê a arquivada, e ela conta nas turmas do currículo que segue", async () => {
    const { data, error } = await sessao
      .from("turmas")
      .select(COLUNAS_DAS_TURMAS_DO_CURSO)
      .eq("curso_id", cursoId);
    expect(error).toBeNull();
    const turmas = (data ?? []) as unknown as { id: string; curriculo_id: string | null }[];
    expect(
      turmas.map((t) => t.id),
      "a leitura das turmas do curso não trouxe a arquivada",
    ).toEqual([turmaId]);
    expect(curriculoDaTurma, "a turma da amostra nasceu sem currículo").toBeTruthy();
    expect(turmas.filter((t) => t.curriculo_id === curriculoDaTurma)).toHaveLength(1);
  });
});
