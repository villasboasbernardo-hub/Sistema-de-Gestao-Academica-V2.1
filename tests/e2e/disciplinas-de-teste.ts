/**
 * A amostra da grade de disciplinas — **idempotente, com identificadores gerados** (regra 9.1).
 *
 * ⚠️ **CURSO NÃO É APAGÁVEL, e isso decide a forma desta amostra.** `curso_regime_historico` é
 * append-only com `DELETE` e `TRUNCATE` recusados por gatilho **inclusive para a `service_role`**, e
 * a FK de `cursos` é `restrict`. Logo a limpeza **reaproveita** o curso e apaga só o que é desta
 * suíte — e a idempotência é provada rodando **duas vezes seguidas**, que é o único jeito de saber
 * que a limpeza não era o que fazia a suíte passar.
 *
 * ⚠️ **CÓDIGO EXPLÍCITO EM TODA TABELA COM `DEFAULT app.proximo_codigo_*`.** O `DEFAULT` é avaliado
 * **com os direitos de quem insere** (gotcha 5.1), e a `service_role` **não tem `usage` em `app`** —
 * medido em 29/09/2026. Sem o código, o `insert` falha com `permission denied for schema app`, e o
 * erro aponta para o **schema**, não para a coluna.
 *
 * ⚠️ **AS PARCELAS E AS UNIDADES ENTRAM EM UM COMANDO SÓ.** O gatilho do `FR-043` é **adiado**: ele
 * confere a soma no fim da transação, e cada chamada à interface de dados é uma transação própria.
 * Uma parcela por vez faz o gatilho disparar com a soma **parcial**.
 *
 * ⚠️ **A TURMA VEM ANTES DAS DISCIPLINAS.** Criar turma faz nascer uma `turma_disciplina` por
 * disciplina ativa do curso; na ordem inversa a linha nasceria sozinha e o `insert` explícito
 * colidiria — o achado A-2 da fatia (a).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chaveLocal } from "./conta-de-teste";

const admin: SupabaseClient = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * O selo desta amostra — **UM POR PROCESSO DE TRABALHO**, e isso custou uma execução inteira.
 *
 * ⚠️ **COM UM SELO SÓ, A SUÍTE PASSA SOZINHA E REPROVA EM CONJUNTO.** O `beforeAll` do Playwright
 * roda **uma vez por processo**, não uma vez por suíte: com quatro processos, os quatro semeavam o
 * **mesmo** curso e o `limparAmostraDaGrade` de um apagava, no meio da execução, o que os outros
 * estavam usando. O sintoma foi `[data-slot="seletor-turma"]` **não existir** — que se lê como "a
 * cascata não foi escrita" e era "a turma sumiu debaixo do teste". É a mesma família do achado 5 da
 * fatia (c) do Épico 4, e a razão de `emailDeTeste` já receber o número do processo.
 *
 * ⚠️ **E o curso NÃO é apagável**, então cada processo deixa o seu para trás e o **reaproveita** na
 * execução seguinte. Um curso por processo, e não um por execução.
 */
export function selo(processo: number): string {
  return `E2E-DISC-${processo}`;
}

export const siglaDoCurso = (processo: number) => `Z-DISC-${selo(processo)}`;
export const codigoDaTurmaUm = (processo: number) => `${siglaDoCurso(processo)} T1 2026`;
export const codigoDaTurmaDois = (processo: number) => `${siglaDoCurso(processo)} T2 2026`;

/** A disciplina **com** unidades de ensino — é nela que a seção de UE aparece. */
export const disciplinaComUe = (processo: number) => ({
  cod: "DCU001",
  nome: `${selo(processo)} Navegação com unidades`,
  ch: 10,
});
/** A disciplina **sem** unidade — nela a seção não aparece **nem avisa** (`FR-061`). */
export const disciplinaSemUe = (processo: number) => ({
  cod: "DSU001",
  nome: `${selo(processo)} Disciplina sem unidades`,
  ch: 12,
});
/** A disciplina **limpa**, sem turma nenhuma — a única excluível (D-B1). */
export const disciplinaLimpa = (processo: number) => ({
  cod: "DLP001",
  nome: `${selo(processo)} Disciplina de amostra`,
  ch: 4,
});

export type AmostraDaGrade = {
  readonly cursoId: string;
  readonly turmaUmId: string;
  readonly turmaDoisId: string;
  readonly disciplinaComUeId: string;
  readonly disciplinaSemUeId: string;
  readonly disciplinaLimpaId: string;
  readonly disciplinaLimpaCodigo: string;
  readonly instrutores: readonly string[];
};

async function gravar(tabela: string, linha: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from(tabela).insert(linha).select("id").single();
  if (error) throw new Error(`falha ao semear ${tabela}: ${error.message}`);
  return (data as { id: string }).id;
}

/** Apaga o que é desta suíte. ⚠️ **O CURSO FICA** — ver o cabeçalho. */
export async function limparAmostraDaGrade(processo: number): Promise<void> {
  const MARCA = selo(processo);
  const { data: curso } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", siglaDoCurso(processo))
    .maybeSingle();
  if (!curso) return;
  const cursoId = (curso as { id: string }).id;

  const { data: disciplinas } = await admin
    .from("disciplinas")
    .select("id")
    .eq("curso_id", cursoId);
  const ids = (disciplinas ?? []).map((d) => (d as { id: string }).id);

  if (ids.length > 0) {
    await admin.from("turma_disciplina_unidade").delete().in("disciplina_id", ids);
    const { data: grades } = await admin
      .from("turma_disciplina")
      .select("id")
      .in("disciplina_id", ids);
    const idsDaGrade = (grades ?? []).map((g) => (g as { id: string }).id);
    if (idsDaGrade.length > 0) {
      await admin.from("turma_disciplina_instrutor").delete().in("turma_disciplina_id", idsDaGrade);
      await admin.from("turma_disciplina").delete().in("id", idsDaGrade);
    }
    await admin.from("unidades_ensino").delete().in("disciplina_id", ids);
    await admin.from("instrutor_disciplina").delete().in("disciplina_id", ids);
    await admin.from("disciplinas").delete().in("id", ids);
  }
  await admin.from("turmas").delete().eq("curso_id", cursoId);
  await admin.from("instrutores").delete().like("nome_completo", `${MARCA}%`);
}

export async function semearGradeDeDisciplinas(processo: number): Promise<AmostraDaGrade> {
  const MARCA = selo(processo);
  const SIGLA_DO_CURSO = siglaDoCurso(processo);
  const DISCIPLINA_COM_UE = disciplinaComUe(processo);
  const DISCIPLINA_SEM_UE = disciplinaSemUe(processo);
  const DISCIPLINA_LIMPA = disciplinaLimpa(processo);
  await limparAmostraDaGrade(processo);

  // ── o curso, reaproveitado e criado pela RPC ────────────────────────────────────────────────
  const { data: existente } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA_DO_CURSO)
    .maybeSingle();

  let cursoId: string;
  if (existente) {
    cursoId = (existente as { id: string }).id;
  } else {
    const { data: curso, error } = await admin
      .rpc("criar_curso_com_regime", {
        p_curso: {
          codigo: SIGLA_DO_CURSO,
          nome_curso: `Amostra da grade (${MARCA})`,
          classificacao: "expedito",
          modalidade: "presencial",
          duracao_dias: 60,
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
    if (error) throw new Error(`falha ao criar o curso da amostra: ${error.message}`);
    cursoId = (curso as { id: string }).id;
  }

  // ── as DUAS turmas, antes das disciplinas ───────────────────────────────────────────────────
  const janela = { data_inicio: "2026-03-02", data_termino: "2026-06-30" };
  const turmaUmId = await gravar("turmas", {
    curso_id: cursoId,
    turma: "T1",
    ano_letivo: 2026,
    modalidade: "presencial",
    status: "planejada",
    ...janela,
  });
  const turmaDoisId = await gravar("turmas", {
    curso_id: cursoId,
    turma: "T2",
    ano_letivo: 2026,
    modalidade: "presencial",
    status: "planejada",
    ...janela,
  });

  // ── três instrutores, com antiguidade determinística ────────────────────────────────────────
  // ⚠️ `antiguidade_declarada_num` é DERIVADA (`GENERATED ALWAYS`); só a declarada entra. E militar
  //    novo sem especialidade é recusado (`instrutores_esp_hab_obs_de_militar_novo`).
  const instrutores: string[] = [];
  for (let posicao = 1; posicao <= 3; posicao++) {
    instrutores.push(
      await gravar("instrutores", {
        codigo: `${MARCA}-${posicao}`,
        posto_graduacao: "CC",
        esp_hab_obs: "-EF",
        nome_completo: `${MARCA} Instrutor ${posicao}`,
        categoria: "Militar",
        om: "CIAARA",
        antiguidade_declarada: String(posicao),
        status: "ativo",
      }),
    );
  }

  // ── as disciplinas ──────────────────────────────────────────────────────────────────────────
  const criarDisciplina = (n: number, d: { cod: string; nome: string; ch: number }) =>
    gravar("disciplinas", {
      codigo: `DIS-${MARCA}-${n}`,
      curso_id: cursoId,
      cod_disciplina: d.cod,
      nome_disciplina: d.nome,
      carga_horaria_tempos: d.ch,
      modo_atribuicao_padrao: "dividido",
      ordem_sugerida: n,
      status: "ativo",
    });

  const disciplinaComUeId = await criarDisciplina(1, DISCIPLINA_COM_UE);
  const disciplinaSemUeId = await criarDisciplina(2, DISCIPLINA_SEM_UE);
  const disciplinaLimpaId = await criarDisciplina(3, DISCIPLINA_LIMPA);
  const disciplinaLimpaCodigo = `DIS-${MARCA}-3`;

  // ── as unidades da primeira, somando EXATAMENTE a CH ────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    await gravar("unidades_ensino", {
      codigo: `UE-${MARCA}-${i}`,
      disciplina_id: disciplinaComUeId,
      curso_id: cursoId,
      numero_ue: String(i),
      topico: `${MARCA} Unidade ${i}`,
      ch_prevista_tempos: 5,
      status: "ativo",
    });
  }

  // ── habilitação: os três, nas duas disciplinas que vão para turma ───────────────────────────
  const habilitacoes = [disciplinaComUeId, disciplinaSemUeId].flatMap((disciplinaId, d) =>
    instrutores.map((instrutorId, i) => ({
      codigo: `VIN-${MARCA}-${d}-${i}`,
      instrutor_id: instrutorId,
      disciplina_id: disciplinaId,
      status: "ativo",
    })),
  );
  const { error: erroHabilitacao } = await admin.from("instrutor_disciplina").insert(habilitacoes);
  if (erroHabilitacao) {
    throw new Error(`falha ao habilitar os instrutores: ${erroHabilitacao.message}`);
  }

  // ── a grade das duas turmas ─────────────────────────────────────────────────────────────────
  // ⚠️ A `DISCIPLINA_LIMPA` fica FORA: é ela que não tem linha de turma, e por isso é a única
  //    excluível. Com linha de turma, o banco recusaria — como recusa nas 175 reais.
  for (const turmaId of [turmaUmId, turmaDoisId]) {
    for (const disciplinaId of [disciplinaComUeId, disciplinaSemUeId]) {
      await gravar("turma_disciplina", { turma_id: turmaId, disciplina_id: disciplinaId });
    }
  }

  return {
    cursoId,
    turmaUmId,
    turmaDoisId,
    disciplinaComUeId,
    disciplinaSemUeId,
    disciplinaLimpaId,
    disciplinaLimpaCodigo,
    instrutores,
  };
}

/** A linha da grade daquela turma e disciplina — usada para medir o que a tela gravou. */
export async function lerGradeDaTurma(
  turmaId: string,
  disciplinaId: string,
): Promise<{
  readonly previsaoInicio: string | null;
  readonly previsaoTermino: string | null;
  readonly editadoEm: string | null;
  readonly origemPeriodo: string;
}> {
  const { data, error } = await admin
    .from("turma_disciplina")
    .select("previsao_inicio, previsao_termino, editado_em, origem_periodo")
    .eq("turma_id", turmaId)
    .eq("disciplina_id", disciplinaId)
    .single();
  if (error) throw new Error(`falha ao ler a grade: ${error.message}`);
  const linha = data as {
    previsao_inicio: string | null;
    previsao_termino: string | null;
    editado_em: string | null;
    origem_periodo: string;
  };
  return {
    previsaoInicio: linha.previsao_inicio,
    previsaoTermino: linha.previsao_termino,
    editadoEm: linha.editado_em,
    origemPeriodo: linha.origem_periodo,
  };
}

/** Quantas disciplinas com este código existem — para provar que a exclusão apagou. */
export async function contarDisciplina(disciplinaId: string): Promise<number> {
  const { data } = await admin.from("disciplinas").select("id").eq("id", disciplinaId);
  return (data ?? []).length;
}

/** O rastro da exclusão — a tabela só de acréscimo do `FR-024`. */
export async function rastroDaExclusao(codigo: string): Promise<number> {
  const { data } = await admin
    .from("exclusoes_registradas")
    .select("id")
    .eq("registro_codigo", codigo);
  return (data ?? []).length;
}
