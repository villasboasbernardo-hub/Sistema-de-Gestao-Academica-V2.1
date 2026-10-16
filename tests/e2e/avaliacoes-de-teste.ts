/**
 * A semente das telas de avaliação (spec 014, PR 5, T187).
 *
 * ⚠️ **ARQUIVO PRÓPRIO, E NÃO MAIS UMA SEÇÃO DE `dsa-de-teste.ts`** (desvio declarado da T187): aquela semente
 *    tem mais de mil linhas e serve a seis arquivos do DSA, e a grade de avaliações precisa de um curso com o
 *    currículo inteiro dela — misturar as duas faria toda suíte do DSA pagar pelos itens, e cada mudança aqui
 *    arriscar a grade de lá.
 * ⚠️ **IDEMPOTENTE, COM CÓDIGOS GERADOS POR PROCESSO** (regra 9.1): curso não se apaga, então ele é reaproveitado;
 *    o que é desta semente (itens, avaliações, sessões) é limpo e recriado a cada execução.
 * ⚠️ **AS DATAS SÃO RELATIVAS A HOJE** (`hojeNaCiaara`): a vista atrasada é a prova de 10 dias atrás, e a que vence
 *    em breve, a de 6 — com o prazo de 7 dias, ela vence amanhã. Uma data fixa envelheceria e mudaria o veredito.
 * ⚠️ O `codigo` vai EXPLÍCITO em toda linha cujo `DEFAULT` chama função de `app`: a `service_role` não tem `usage`
 *    em `app` (gotcha 5.1).
 * ⚠️ **A SEMENTE DA `RN-AV-13` É OUTRO CURSO** (`semearVistaPeloInstrumento`, prefixo `E2V`): uma PP a mais no curso
 *    `E2A` mudaria o «N de M» e as «vistas realizadas» que os outros casos conferem.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { chaveLocal } from "./conta-de-teste";

let clienteAdmin: SupabaseClient | undefined;
function admin(): SupabaseClient {
  clienteAdmin ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clienteAdmin;
}

const TIPO = "Prova Escrita";
const MARCA = "semente de percurso automatizado (spec 014)";

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + dias)).toISOString().slice(0, 10);
}

export type AvaliacoesSemeadas = {
  readonly curso: string;
  readonly turma: string;
  /** CH 120, PM 1 e PM 2 de 2 TA com 1 de vista — as duas aplicadas, nenhuma com vista. */
  readonly disciplinaComTempo: string;
  /** CH 40, um PE 1 SEM tempo do currículo — o «tempo de avaliação não definido». */
  readonly disciplinaSemTempo: string;
};

async function ou(promessa: PromiseLike<{ error: { message: string } | null }>, o_que: string) {
  const { error } = await promessa;
  if (error) throw new Error(`falha ao ${o_que}: ${error.message}`);
}

/** O tipo de avaliação da semente, na lista administrável (idempotente). */
async function garantirTipo(): Promise<void> {
  await ou(
    admin().from("config_listas").upsert(
      {
        lista: "tipos_avaliacao",
        valor: TIPO,
        rotulo_exibicao: TIPO,
        ordem: 910,
        ativo: true,
        observacao: MARCA,
      },
      { onConflict: "lista,valor", ignoreDuplicates: true },
    ),
    "semear tipos_avaliacao",
  );
}

/**
 * O curso e a turma do ano corrente — reaproveitados quando existem (curso não se apaga, regra 9.1).
 * ⚠️ `nomeDoCurso` distingue os cursos das duas sementes na lista; o regime e a turma são os mesmos.
 */
async function garantirCursoETurma(
  curso: string,
  nomeDoCurso: string,
  hoje: string,
): Promise<{ cursoId: string; turma: { id: string; codigo: string } }> {
  let { data: c } = await admin().from("cursos").select("id").eq("codigo", curso).maybeSingle();
  if (!c) {
    await ou(
      admin().rpc("criar_curso_com_regime", {
        p_curso: {
          codigo: curso,
          nome_curso: nomeDoCurso,
          classificacao: "especial",
          modalidade: "presencial",
          duracao_dias: 60,
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
      }),
      `criar o curso ${curso}`,
    );
    ({ data: c } = await admin().from("cursos").select("id").eq("codigo", curso).maybeSingle());
  }
  const cursoId = (c as { id: string }).id;
  const ano = Number(hoje.slice(0, 4));

  let { data: t } = await admin()
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", ano)
    .maybeSingle();
  if (!t) {
    await ou(
      admin()
        .from("turmas")
        .insert({
          curso_id: cursoId,
          ano_letivo: ano,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: somarDias(hoje, -120),
          data_termino: somarDias(hoje, 60),
          sala_alocada: "Sala 03",
          alunos: 12,
        }),
      "criar a turma",
    );
    ({ data: t } = await admin()
      .from("turmas")
      .select("id, codigo")
      .eq("curso_id", cursoId)
      .eq("ano_letivo", ano)
      .maybeSingle());
  }
  return { cursoId, turma: t as { id: string; codigo: string } };
}

/** A disciplina do curso pelo código — reaproveitada quando existe. */
async function garantirDisciplina(
  s: string,
  cursoId: string,
  cod: string,
  ch: number,
): Promise<string> {
  const { data } = await admin()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("cod_disciplina", cod)
    .maybeSingle();
  if (data) return (data as { id: string }).id;
  await ou(
    admin()
      .from("disciplinas")
      .insert({
        codigo: `AVL-${s}-${cod}`,
        curso_id: cursoId,
        cod_disciplina: cod,
        nome_disciplina: `Disciplina ${cod} das avaliações`,
        carga_horaria_tempos: ch,
      }),
    `criar a disciplina ${cod}`,
  );
  const { data: d } = await admin()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("cod_disciplina", cod)
    .maybeSingle();
  return (d as { id: string }).id;
}

/**
 * ⚠️ `prefixo` separa os cursos de dois arquivos que usam esta semente (`avaliacoes-nas-telas` usa o padrão,
 *    `avaliacoes-da-turma` o seu): o mesmo `workerIndex` em arquivos diferentes dá cursos diferentes.
 */
export async function semearAvaliacoes(
  processo: number,
  prefixo = "E2A",
): Promise<AvaliacoesSemeadas> {
  const s = `${prefixo}${processo}`;
  const curso = `CUR-${s}`;
  const hoje = hojeNaCiaara();

  await garantirTipo();
  const { cursoId, turma } = await garantirCursoETurma(
    curso,
    `Curso das avaliações ${processo}`,
    hoje,
  );
  const comTempo = await garantirDisciplina(s, cursoId, "A1", 120);
  const semTempo = await garantirDisciplina(s, cursoId, "A2", 40);

  // A UE da disciplina sem tempo — é ela que o «nomear a UE» oferece.
  const { data: ue } = await admin()
    .from("unidades_ensino")
    .select("id")
    .eq("disciplina_id", semTempo)
    .eq("numero_ue", 1)
    .maybeSingle();
  if (!ue) {
    await ou(
      admin()
        .from("unidades_ensino")
        .insert({
          codigo: `AVL-${s}-UE1`,
          disciplina_id: semTempo,
          curso_id: cursoId,
          numero_ue: 1,
          topico: "Unidade das avaliações",
          ch_prevista_tempos: 36,
        }),
      "criar a UE",
    );
  }

  // O que é desta semente sai e volta inteiro: sessões, avaliações, ajustes e itens.
  const { data: avs } = await admin().from("avaliacoes").select("id").eq("turma_id", turma.id);
  const idsAv = (avs ?? []).map((a) => (a as { id: string }).id);
  if (idsAv.length > 0) {
    await admin().from("vistas_de_avaliacao").delete().in("avaliacao_id", idsAv);
    await admin().from("avaliacoes").delete().in("id", idsAv);
  }
  await admin().from("avaliacoes_curriculo_turma").delete().eq("turma_id", turma.id);
  await admin().from("avaliacoes_curriculo").delete().in("disciplina_id", [comTempo, semTempo]);

  const { data: insts } = await admin()
    .from("config_listas")
    .select("id, valor")
    .eq("lista", "instrumentos_avaliacao")
    .in("valor", ["PM", "PE"]);
  const inst = new Map((insts ?? []).map((i) => [i.valor as string, i.id as string] as const));

  const item = (
    n: number,
    disciplinaId: string,
    instrumento: string,
    numero: number,
    tempo: number | null,
    vista: number | null,
  ) => ({
    codigo: `AVL-${s}-I${n}`,
    disciplina_id: disciplinaId,
    curso_id: cursoId,
    ordem: numero,
    instrumento_id: inst.get(instrumento),
    numero,
    origem_item: "curriculo",
    fonte_arquivo: "semente-e2e.pdf",
    fonte_pagina: 1,
    ta_aplicacao: tempo,
    origem_ta_aplicacao: tempo === null ? null : "curriculo",
    ta_vista: vista,
    origem_ta_vista: vista === null ? null : "curriculo",
  });
  await ou(
    admin()
      .from("avaliacoes_curriculo")
      .insert([
        item(1, comTempo, "PM", 1, 2, 1),
        item(2, comTempo, "PM", 2, 2, 1),
        item(3, semTempo, "PE", 1, null, null),
      ]),
    "criar os itens do currículo",
  );
  const { data: itens } = await admin()
    .from("avaliacoes_curriculo")
    .select("id, codigo")
    .in("disciplina_id", [comTempo, semTempo]);
  const idDoItem = new Map((itens ?? []).map((i) => [i.codigo as string, i.id as string] as const));

  const avaliacao = (n: number, itemCodigo: string, dias: number) => ({
    codigo: `AVL-${s}-A${n}`,
    turma_id: turma.id,
    disciplina_id: comTempo,
    curso_id: cursoId,
    avaliacao_curriculo_id: idDoItem.get(itemCodigo),
    tipo_avaliacao: TIPO,
    data_avaliacao: somarDias(hoje, -dias),
    status: "concluida",
    ta_inicial: 1,
    tempos_consumidos: 2,
  });
  await ou(
    admin()
      .from("avaliacoes")
      .insert([avaliacao(1, `AVL-${s}-I1`, 10), avaliacao(2, `AVL-${s}-I2`, 6)]),
    "criar as avaliações aplicadas",
  );

  return {
    curso,
    turma: turma.codigo,
    disciplinaComTempo: "A1",
    disciplinaSemTempo: "A2",
  };
}

/** Limpa o que a semente criou; o curso fica (regra 9.1). */
export async function limparAvaliacoes(processo: number, prefixo = "E2A"): Promise<void> {
  const curso = `CUR-${prefixo}${processo}`;
  const { data: c } = await admin().from("cursos").select("id").eq("codigo", curso).maybeSingle();
  if (!c) return;
  const cursoId = (c as { id: string }).id;
  const { data: avs } = await admin().from("avaliacoes").select("id").eq("curso_id", cursoId);
  const ids = (avs ?? []).map((a) => (a as { id: string }).id);
  if (ids.length > 0) {
    await admin().from("vistas_de_avaliacao").delete().in("avaliacao_id", ids);
    await admin().from("avaliacoes").delete().in("id", ids);
  }
  await admin()
    .from("avaliacoes_curriculo_turma")
    .delete()
    .in(
      "avaliacao_curriculo_id",
      (
        (await admin().from("avaliacoes_curriculo").select("id").eq("curso_id", cursoId)).data ?? []
      ).map((i) => (i as { id: string }).id),
    );
  await admin().from("avaliacoes_curriculo").delete().eq("curso_id", cursoId);
}

export type VistaPeloInstrumentoSemeada = {
  readonly turma: string;
  /** CH 40, PM 1 (2 TA + vista 1 TA) aplicada há 10 dias, sem vista — ATRASADA (o controle positivo). */
  readonly disciplinaPm: string;
  /**
   * CH 40, PP 1 (2 TA + vista 1 TA — COM tempo de vista no currículo) aplicada há 10 dias, sem vista: pela `RN-AV-13`
   * NÃO é atrasada; pelo critério de antes (o tempo de vista do item), seria.
   */
  readonly disciplinaPp: string;
};

/**
 * A semente do caso que DISCRIMINA a `RN-AV-13` nos chamadores (emenda de 15/10/2026): *"vista é obrigatória só para
 * PM e PO. PP, T e TG não geram alerta de vista"*.
 *
 * ⚠️ **A PP TEM TEMPO DE VISTA NO CURRÍCULO DE PROPÓSITO**: é o que faz o veredito VIRAR (DoD 8). Pelo critério antigo
 *    — `ta_vista > 0` — a PP aplicada há 10 dias sem vista era «atrasada»; pelo instrumento, não é. Uma PP sem tempo de
 *    vista daria o mesmo veredito antes e depois, e não provaria a mudança.
 * ⚠️ **A PM DA MESMA TURMA, NAS MESMAS CONDIÇÕES, É O CONTROLE POSITIVO**: sem ela, a PP ausente do alerta passaria
 *    igual com o alerta cego.
 * ⚠️ **CURSO PRÓPRIO** (`CUR-E2V<processo>`): reaproveitado, nunca apagado (regra 9.1); itens e avaliações saem e
 *    voltam a cada execução, com o erro de cada exclusão conferido.
 */
export async function semearVistaPeloInstrumento(
  processo: number,
  prefixo = "E2V",
): Promise<VistaPeloInstrumentoSemeada> {
  const s = `${prefixo}${processo}`;
  const hoje = hojeNaCiaara();

  await garantirTipo();
  const { cursoId, turma } = await garantirCursoETurma(
    `CUR-${s}`,
    `Curso da vista pelo instrumento ${processo}`,
    hoje,
  );
  const comPm = await garantirDisciplina(s, cursoId, "V1", 40);
  const comPp = await garantirDisciplina(s, cursoId, "V2", 40);

  await limparDoCurso(cursoId);

  const { data: insts, error: erroInst } = await admin()
    .from("config_listas")
    .select("id, valor")
    .eq("lista", "instrumentos_avaliacao")
    .in("valor", ["PM", "PP"]);
  if (erroInst) throw new Error(`falha ao ler os instrumentos: ${erroInst.message}`);
  const inst = new Map((insts ?? []).map((i) => [i.valor as string, i.id as string] as const));
  for (const sigla of ["PM", "PP"]) {
    if (!inst.has(sigla)) throw new Error(`o instrumento ${sigla} não está em config_listas`);
  }

  const item = (n: number, disciplinaId: string, instrumento: string) => ({
    codigo: `AVL-${s}-I${n}`,
    disciplina_id: disciplinaId,
    curso_id: cursoId,
    ordem: 1,
    instrumento_id: inst.get(instrumento),
    numero: 1,
    origem_item: "curriculo",
    fonte_arquivo: "semente-e2e.pdf",
    fonte_pagina: 1,
    ta_aplicacao: 2,
    origem_ta_aplicacao: "curriculo",
    ta_vista: 1,
    origem_ta_vista: "curriculo",
  });
  await ou(
    admin()
      .from("avaliacoes_curriculo")
      .insert([item(1, comPm, "PM"), item(2, comPp, "PP")]),
    "criar a PM 1 e a PP 1 do currículo",
  );
  const { data: itens, error: erroItens } = await admin()
    .from("avaliacoes_curriculo")
    .select("id, codigo")
    .eq("curso_id", cursoId);
  if (erroItens) throw new Error(`falha ao ler os itens: ${erroItens.message}`);
  const idDoItem = new Map((itens ?? []).map((i) => [i.codigo as string, i.id as string] as const));

  const avaliacao = (n: number, disciplinaId: string, itemCodigo: string) => ({
    codigo: `AVL-${s}-A${n}`,
    turma_id: turma.id,
    disciplina_id: disciplinaId,
    curso_id: cursoId,
    avaliacao_curriculo_id: idDoItem.get(itemCodigo),
    tipo_avaliacao: TIPO,
    data_avaliacao: somarDias(hoje, -10),
    status: "concluida",
    ta_inicial: 1,
    tempos_consumidos: 2,
  });
  await ou(
    admin()
      .from("avaliacoes")
      .insert([avaliacao(1, comPm, `AVL-${s}-I1`), avaliacao(2, comPp, `AVL-${s}-I2`)]),
    "criar a PM e a PP aplicadas há 10 dias",
  );

  return { turma: turma.codigo, disciplinaPm: "V1", disciplinaPp: "V2" };
}

/** Sessões, avaliações, ajustes e itens do curso — cada exclusão com o erro conferido. */
async function limparDoCurso(cursoId: string): Promise<void> {
  const { data: avs, error } = await admin()
    .from("avaliacoes")
    .select("id")
    .eq("curso_id", cursoId);
  if (error) throw new Error(`falha ao ler as avaliações do curso: ${error.message}`);
  const ids = (avs ?? []).map((a) => (a as { id: string }).id);
  if (ids.length > 0) {
    await ou(
      admin().from("vistas_de_avaliacao").delete().in("avaliacao_id", ids),
      "apagar as sessões de vista",
    );
    await ou(admin().from("avaliacoes").delete().in("id", ids), "apagar as avaliações");
  }
  const { data: itens, error: erroItens } = await admin()
    .from("avaliacoes_curriculo")
    .select("id")
    .eq("curso_id", cursoId);
  if (erroItens) throw new Error(`falha ao ler os itens do curso: ${erroItens.message}`);
  const idsItens = (itens ?? []).map((i) => (i as { id: string }).id);
  if (idsItens.length > 0) {
    await ou(
      admin().from("avaliacoes_curriculo_turma").delete().in("avaliacao_curriculo_id", idsItens),
      "apagar os ajustes da turma",
    );
    await ou(
      admin().from("avaliacoes_curriculo").delete().in("id", idsItens),
      "apagar os itens do currículo",
    );
  }
}

/** Limpa o que `semearVistaPeloInstrumento` criou; o curso fica (regra 9.1). */
export async function limparVistaPeloInstrumento(processo: number, prefixo = "E2V"): Promise<void> {
  const { data: c, error } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", `CUR-${prefixo}${processo}`)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler o curso da semente: ${error.message}`);
  if (!c) return;
  await limparDoCurso((c as { id: string }).id);
}
