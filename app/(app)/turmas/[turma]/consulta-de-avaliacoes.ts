/**
 * A leitura das avaliações da turma (FR-058 da spec 014): os itens do currículo com o ajuste da turma, as
 * avaliações VIVAS (lista positiva de status), as sessões de vista e o cumprido por disciplina.
 *
 * ⚠️ UMA RODADA, `Promise.all`, nenhum `await` em laço (convenção de `app/**`).
 * ⚠️ A conta é toda de `quadroDeAvaliacoesDaTurma` (`lib/dominio/avaliacoes/`); aqui só se lê e se traduz.
 * ⚠️ SEM TURMA (a aba do curso), as consultas da turma usam o uuid nulo, que não casa com linha nenhuma: o quadro
 *    sai só com o previsto do currículo.
 * ⚠️ DEGRADAÇÃO SEGURA (`RN-DEG-01`): falha de leitura devolve quadro vazio com aviso, nunca exceção.
 */
import "server-only";

import { STATUS_DE_AVALIACAO_VIVA } from "@/lib/dominio/avaliacao-viva";
import { alertasDeVista, type AlertaDeVista } from "@/lib/dominio/avaliacoes/alertas-de-vista";
import {
  naturezaPeloTipo,
  quadroDeAvaliacoesDaTurma,
  type AvaliacaoDoQuadro,
  type DisciplinaDoQuadro,
  type ItemDoQuadro,
  type QuadroDeAvaliacoes,
} from "@/lib/dominio/avaliacoes/quadro-da-turma";
import type { NaturezaDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import type { OrigemDoTempo } from "@/lib/dominio/avaliacoes/previsto";
import { criarClienteDeServidor } from "@/lib/supabase/server";

type Linha = Record<string, unknown>;

export async function lerAvaliacoesDaTurma(entrada: {
  /** `null` = só o currículo do curso (a aba Avaliações do curso sem turma escolhida). */
  readonly turmaId: string | null;
  readonly cursoId: string;
  readonly hoje: string;
  readonly terminoDaTurma: string | null;
  /** O código da turma, para os alertas de vista (FR-054). */
  readonly turmaCodigo?: string;
}): Promise<{ quadro: QuadroDeAvaliacoes | null; aviso: string | null; alertas: AlertaDeVista[] }> {
  const supabase = await criarClienteDeServidor();
  const [disc, ues, itens, ajustes, avals, execucao, prazo, breve] = await Promise.all([
    supabase
      .from("disciplinas")
      .select("id, cod_disciplina, nome_disciplina, carga_horaria_tempos")
      .eq("curso_id", entrada.cursoId)
      .eq("status", "ativo"),
    supabase
      .from("unidades_ensino")
      .select("id, disciplina_id, numero_ue, ch_prevista_tempos")
      .eq("curso_id", entrada.cursoId)
      .eq("status", "ativo"),
    supabase
      .from("avaliacoes_curriculo")
      .select(
        "id, disciplina_id, ordem, numero, unidade_ensino_id, origem_ue, ue_decidida_em, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista, instrumento:config_listas!avaliacoes_curriculo_instrumento_id_fkey(valor, metadados)",
      )
      .eq("curso_id", entrada.cursoId)
      .eq("status", "ativo"),
    supabase
      .from("avaliacoes_curriculo_turma")
      .select("avaliacao_curriculo_id, ta_aplicacao, ta_vista, origem, confirmado_em")
      .eq("turma_id", entrada.turmaId ?? "00000000-0000-0000-0000-000000000000")
      .eq("status", "ativo"),
    supabase
      .from("avaliacoes")
      .select(
        "id, disciplina_id, avaliacao_curriculo_id, tipo_avaliacao, data_avaliacao, status, vistas_de_avaliacao(data, status)",
      )
      .eq("turma_id", entrada.turmaId ?? "00000000-0000-0000-0000-000000000000")
      .in("status", [...STATUS_DE_AVALIACAO_VIVA]),
    supabase
      .from("vw_disciplinas_execucao")
      .select("disciplina_id, ta_executados, data_real_inicio")
      .eq("turma_id", entrada.turmaId ?? "00000000-0000-0000-0000-000000000000"),
    supabase
      .from("config_parametros")
      .select("valor")
      .eq("chave", "avaliacao.prazo_vista_dias")
      .eq("status", "ativo")
      .maybeSingle(),
    supabase
      .from("config_parametros")
      .select("valor")
      .eq("chave", "avaliacao.vence_em_breve_dias")
      .eq("status", "ativo")
      .maybeSingle(),
  ]);

  const falha = [disc, ues, itens, ajustes, avals, execucao].find((r) => r.error);
  if (falha?.error) {
    return {
      quadro: null,
      aviso: "Não foi possível ler as avaliações desta turma agora.",
      alertas: [],
    };
  }

  const exec = new Map(
    ((execucao.data ?? []) as Linha[]).map((e) => [String(e.disciplina_id), e] as const),
  );
  const uesPorDisciplina = new Map<
    string,
    { id: string; rotulo: string; ch: number; numero: number }[]
  >();
  for (const u of (ues.data ?? []) as Linha[]) {
    const lista = uesPorDisciplina.get(String(u.disciplina_id)) ?? [];
    lista.push({
      id: String(u.id),
      rotulo: `UE ${String(u.numero_ue)}`,
      ch: Number(u.ch_prevista_tempos ?? 0),
      numero: Number(u.numero_ue),
    });
    uesPorDisciplina.set(String(u.disciplina_id), lista);
  }

  const disciplinas: DisciplinaDoQuadro[] = ((disc.data ?? []) as Linha[]).map((d) => {
    const e = exec.get(String(d.id));
    const ch = Number(d.carga_horaria_tempos ?? 0);
    const cumprido = Number(e?.ta_executados ?? 0);
    return {
      id: String(d.id),
      cod: String(d.cod_disciplina),
      nome: String(d.nome_disciplina),
      ch,
      cumprido,
      iniciada: cumprido > 0,
      // O mesmo critério do painel da disciplina: cumprido ≥ CH (R-8, OD).
      concluida: ch > 0 && cumprido >= ch,
      unidades: (uesPorDisciplina.get(String(d.id)) ?? []).sort((a, b) => a.numero - b.numero),
    };
  });

  const ajustePorItem = new Map(
    ((ajustes.data ?? []) as Linha[]).map((a) => [String(a.avaliacao_curriculo_id), a] as const),
  );
  const itensDoQuadro: ItemDoQuadro[] = ((itens.data ?? []) as Linha[]).map((i) => {
    const instrumento = (i.instrumento ?? {}) as {
      valor?: string;
      metadados?: { natureza?: string };
    };
    const ajuste = ajustePorItem.get(String(i.id));
    return {
      id: String(i.id),
      disciplinaId: String(i.disciplina_id),
      ordem: Number(i.ordem),
      rotulo: `${instrumento.valor ?? "?"} ${String(i.numero)}`,
      natureza: (instrumento.metadados?.natureza ?? "prova") as NaturezaDaAvaliacao,
      unidadeEnsinoId: (i.unidade_ensino_id as string | null) ?? null,
      origemUe: (i.origem_ue as "curriculo" | "decisao_ciaara" | null) ?? null,
      ueDecididaEm: (i.ue_decidida_em as string | null) ?? null,
      taAplicacao: i.ta_aplicacao === null ? null : Number(i.ta_aplicacao),
      origemTaAplicacao: (i.origem_ta_aplicacao as OrigemDoTempo | null) ?? null,
      taVista: i.ta_vista === null ? null : Number(i.ta_vista),
      origemTaVista: (i.origem_ta_vista as OrigemDoTempo | null) ?? null,
      ajusteDaTurma: ajuste
        ? {
            taAplicacao: ajuste.ta_aplicacao === null ? null : Number(ajuste.ta_aplicacao),
            taVista: ajuste.ta_vista === null ? null : Number(ajuste.ta_vista),
            origem: ajuste.origem as "arbitrado" | "sugestao_planilha",
            confirmado: ajuste.confirmado_em !== null,
          }
        : null,
    };
  });

  const avaliacoes: AvaliacaoDoQuadro[] = ((avals.data ?? []) as Linha[]).map((a) => ({
    id: String(a.id),
    disciplinaId: String(a.disciplina_id),
    itemId: (a.avaliacao_curriculo_id as string | null) ?? null,
    tipo: String(a.tipo_avaliacao ?? ""),
    natureza: naturezaPeloTipo(String(a.tipo_avaliacao ?? "")),
    aplicacao: (a.data_avaliacao as string | null) ?? null,
    estadoDoRegistro: String(a.status),
    sessoesDeVista: ((a.vistas_de_avaliacao ?? []) as Linha[])
      .filter((s) => s.status === "ativo")
      .map((s) => String(s.data)),
  }));

  const prazoDias = Number((prazo.data as Linha | null)?.valor ?? 7) || 7;
  const venceEmBreveDias = Number((breve.data as Linha | null)?.valor ?? 2) || 2;
  // Tem item de vista: sem item ligado (histórico), sim; com item, o tempo de vista efetivo (ajuste da turma ou
  // currículo) maior que zero — o mesmo critério de `app.fn_status_vista`.
  const itemPorId = new Map(itensDoQuadro.map((i) => [i.id, i] as const));
  const codDe = new Map(disciplinas.map((d) => [d.id, d.cod] as const));
  const alertas = alertasDeVista(
    avaliacoes.map((a) => {
      const item = a.itemId ? itemPorId.get(a.itemId) : undefined;
      const vista = item ? (item.ajusteDaTurma?.taVista ?? item.taVista) : null;
      return {
        id: a.id,
        turma: entrada.turmaCodigo ?? "",
        disciplina: codDe.get(a.disciplinaId) ?? "",
        tipo: a.tipo,
        natureza: a.natureza,
        estadoDoRegistro: a.estadoDoRegistro,
        aplicacao: a.aplicacao,
        sessoesDeVista: a.sessoesDeVista,
        temItemDeVista: a.itemId === null || (vista !== null && vista > 0),
        itemLigado: item !== undefined,
      };
    }),
    { prazoDias, venceEmBreveDias, hoje: entrada.hoje },
  );
  return {
    alertas,
    quadro: quadroDeAvaliacoesDaTurma({
      disciplinas: disciplinas.filter((d) => d.ch > 0),
      itens: itensDoQuadro,
      avaliacoes,
      prazoDias,
      hoje: entrada.hoje,
      terminoDaTurma: entrada.terminoDaTurma,
    }),
    aviso: null,
  };
}

/**
 * A aba Avaliações do CURSO (spec 014, FR-053, T181): o previsto por disciplina e, com uma turma escolhida, o
 * quadro dela. A mesma leitura da turma — nenhuma segunda conta.
 */
export async function lerAvaliacoesDoCurso(entrada: {
  readonly cursoId: string;
  readonly turmaCodigo: string | null;
  readonly hoje: string;
}): Promise<{
  quadro: QuadroDeAvaliacoes | null;
  aviso: string | null;
  turmaId: string | null;
  alertas: AlertaDeVista[];
}> {
  let turmaId: string | null = null;
  let termino: string | null = null;
  if (entrada.turmaCodigo) {
    const supabase = await criarClienteDeServidor();
    const { data } = await supabase
      .from("turmas")
      .select("id, data_termino")
      .eq("codigo", entrada.turmaCodigo)
      .eq("curso_id", entrada.cursoId)
      .maybeSingle();
    turmaId = (data?.id as string | undefined) ?? null;
    termino = (data?.data_termino as string | null | undefined) ?? null;
  }
  const lido = await lerAvaliacoesDaTurma({
    turmaId,
    cursoId: entrada.cursoId,
    hoje: entrada.hoje,
    terminoDaTurma: termino,
  });
  return { ...lido, turmaId };
}
