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

  let { data: c } = await admin().from("cursos").select("id").eq("codigo", curso).maybeSingle();
  if (!c) {
    await ou(
      admin().rpc("criar_curso_com_regime", {
        p_curso: {
          codigo: curso,
          nome_curso: `Curso das avaliações ${processo}`,
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
  const turma = t as { id: string; codigo: string };

  const disciplina = async (cod: string, ch: number): Promise<string> => {
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
  };
  const comTempo = await disciplina("A1", 120);
  const semTempo = await disciplina("A2", 40);

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
