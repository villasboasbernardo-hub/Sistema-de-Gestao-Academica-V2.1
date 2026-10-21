"use server";

/**
 * As ações sobre o item de avaliação do currículo (spec 014, FR-031.3, FR-031.4, FR-031.7, FR-031.8):
 * `definirTempoArbitrado` (curso ou turma), `confirmarSugestao`, `arbitrarQuantidade` e `nomearUe`.
 *
 * ⚠️ **A CH NUNCA MUDA AQUI** (D-CUR-1): o arbitrado sai de DENTRO da CH da disciplina; passar da CH é AVISO
 *    (`soma_acima_da_ch`), nunca recusa (`RN-DEG-02`).
 * ⚠️ **O TEMPO DE ORIGEM CURRÍCULO NÃO SE ARBITRA** no curso: o currículo manda. Ajustar só a turma, sim.
 * ⚠️ **A PERMISSÃO É DO BANCO**: `avaliacoes_curriculo_arbitrado.editar` (Admin e Encarregado), conferida pela
 *    policy e pelo gatilho `app.proteger_arbitrado()`. O Operador e o Ajudante recebem `42501`, traduzido.
 * ⚠️ Gera o `id` antes e não usa `RETURNING` no insert (gotcha 4.1).
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { comJustificativa, pedeJustificativa } from "@/lib/acoes/justificativa";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaConfirmacao,
  esquemaDaUeDecidida,
  esquemaDoItemArbitrado,
  esquemaDoTempoArbitrado,
} from "@/lib/validacao/avaliacao-do-curriculo";

export type ResultadoDoArbitrado =
  | { readonly ok: true; readonly aviso?: "soma_acima_da_ch" }
  | {
      readonly ok: false;
      readonly erro: string;
      /** RC-6: o banco pediu a justificativa — a tela a pergunta e manda de novo. */
      readonly pedeJustificativa?: true | undefined;
    };

const SEM_PERMISSAO = "Só o Admin e o Encarregado definem o arbitrado das avaliações do currículo.";

/*
 * ⚠️ SPEC 021 (Bloco 6, RC-6): o `42501` deixou de ter um motivo só. O do currículo EM USO (`curriculo_em_uso`) diz
 *    quem corrige e que completar o vazio é livre — trocá-lo pela frase do arbitrado inventaria o motivo errado.
 */
function recusa(
  error: { code?: string; hint?: string | null } & ErroDoBanco,
): ResultadoDoArbitrado {
  if (pedeJustificativa(error)) {
    return { ok: false, erro: traduzirRecusa(error), pedeJustificativa: true };
  }
  return {
    ok: false,
    erro:
      error.code === "42501" && error.hint !== "curriculo_em_uso"
        ? SEM_PERMISSAO
        : traduzirRecusa(error),
  };
}

/** Aviso, nunca recusa: a soma dos tempos previstos da disciplina passou da CH dela. */
async function avisoDaCh(disciplinaId: string): Promise<"soma_acima_da_ch" | undefined> {
  const supabase = await criarClienteDeServidor();
  const [{ data: d }, { data: itens }] = await Promise.all([
    supabase
      .from("disciplinas")
      .select("carga_horaria_tempos")
      .eq("id", disciplinaId)
      .maybeSingle(),
    supabase
      .from("avaliacoes_curriculo")
      .select("ta_aplicacao, ta_vista")
      .eq("disciplina_id", disciplinaId)
      .eq("status", "ativo"),
  ]);
  const soma = (itens ?? []).reduce((s, i) => s + (i.ta_aplicacao ?? 0) + (i.ta_vista ?? 0), 0);
  return d && soma > (d.carga_horaria_tempos ?? 0) ? "soma_acima_da_ch" : undefined;
}

function revalidar(): void {
  revalidatePath("/turmas", "layout");
  revalidatePath("/cursos", "layout");
}

export async function definirTempoArbitrado(entrada: unknown): Promise<ResultadoDoArbitrado> {
  const conferido = esquemaDoTempoArbitrado.safeParse(entrada);
  if (!conferido.success)
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  const { itemId, alcance, turmaId, taAplicacao, taVista, justificativa } = conferido.data;
  const supabase = await criarClienteDeServidor();
  /* D-COR-5: o ajuste POR TURMA não grava em turma arquivada; o do curso é currículo, e segue. */
  if (alcance === "turma" && turmaId) {
    const arquivada = await recusaSeTurmaArquivada(supabase, turmaId);
    if (arquivada) return { ok: false, erro: arquivada };
  }
  const { data: item, error: e0 } = await supabase
    .from("avaliacoes_curriculo")
    .select("disciplina_id, origem_ta_aplicacao")
    .eq("id", itemId)
    .maybeSingle();
  if (e0) return recusa(e0);
  if (!item) return { ok: false, erro: "Avaliação do currículo não encontrada." };

  if (alcance === "curso") {
    if (item.origem_ta_aplicacao === "curriculo") {
      return {
        ok: false,
        erro: "O tempo desta avaliação é o do currículo. Para mudar só uma turma, ajuste a turma.",
      };
    }
    const { data, error } = await comJustificativa(
      supabase
        .from("avaliacoes_curriculo")
        .update({
          ta_aplicacao: taAplicacao,
          origem_ta_aplicacao: "arbitrado",
          ta_vista: taVista ?? null,
          origem_ta_vista: taVista === undefined ? null : "arbitrado",
        })
        .eq("id", itemId)
        .select("id"),
      justificativa,
    );
    if (error) return recusa(error);
    if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
  } else {
    const { data: existente, error: e1 } = await supabase
      .from("avaliacoes_curriculo_turma")
      .select("id")
      .eq("avaliacao_curriculo_id", itemId)
      .eq("turma_id", turmaId as string)
      .eq("status", "ativo")
      .maybeSingle();
    if (e1) return recusa(e1);
    const valores = {
      ta_aplicacao: taAplicacao,
      ta_vista: taVista ?? null,
      origem: "arbitrado",
      confirmado_em: new Date().toISOString(),
    };
    if (existente) {
      const { data, error } = await supabase
        .from("avaliacoes_curriculo_turma")
        .update(valores)
        .eq("id", existente.id)
        .select("id");
      if (error) return recusa(error);
      if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
    } else {
      const { error } = await supabase.from("avaliacoes_curriculo_turma").insert({
        id: randomUUID(),
        avaliacao_curriculo_id: itemId,
        turma_id: turmaId as string,
        ...valores,
      });
      if (error) return recusa(error);
    }
  }
  revalidar();
  const aviso = await avisoDaCh(item.disciplina_id);
  return aviso ? { ok: true, aviso } : { ok: true };
}

export async function confirmarSugestao(entrada: unknown): Promise<ResultadoDoArbitrado> {
  const conferido = esquemaDaConfirmacao.safeParse(entrada);
  if (!conferido.success)
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await criarClienteDeServidor();
  /* D-COR-5: a turma arquivada é somente leitura (spec 017, FR-004.4). */
  const arquivada = await recusaSeTurmaArquivada(supabase, conferido.data.turmaId);
  if (arquivada) return { ok: false, erro: arquivada };
  const { data, error } = await supabase
    .from("avaliacoes_curriculo_turma")
    .update({ origem: "arbitrado", confirmado_em: new Date().toISOString() })
    .eq("avaliacao_curriculo_id", conferido.data.itemId)
    .eq("turma_id", conferido.data.turmaId)
    .eq("status", "ativo")
    .eq("origem", "sugestao_planilha")
    .select("id");
  if (error) return recusa(error);
  if (!data || data.length === 0)
    return { ok: false, erro: "Não há sugestão da planilha a confirmar nesta avaliação." };
  revalidar();
  return { ok: true };
}

export async function arbitrarQuantidade(entrada: unknown): Promise<ResultadoDoArbitrado> {
  const conferido = esquemaDoItemArbitrado.safeParse(entrada);
  if (!conferido.success)
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  const { disciplinaId, instrumento, taAplicacao, taVista, justificativa } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const [{ data: d, error: e1 }, { data: inst, error: e2 }, { data: existentes, error: e3 }] =
    await Promise.all([
      supabase.from("disciplinas").select("curso_id").eq("id", disciplinaId).maybeSingle(),
      supabase
        .from("config_listas")
        .select("id")
        .eq("lista", "instrumentos_avaliacao")
        .eq("valor", instrumento)
        .maybeSingle(),
      supabase
        .from("avaliacoes_curriculo")
        .select("ordem, numero, instrumento_id")
        .eq("disciplina_id", disciplinaId)
        .eq("status", "ativo"),
    ]);
  const falha = e1 ?? e2 ?? e3;
  if (falha) return recusa(falha);
  if (!d || !inst) return { ok: false, erro: "Disciplina ou instrumento não encontrado." };
  const lista = existentes ?? [];
  const { error } = await comJustificativa(
    supabase.from("avaliacoes_curriculo").insert({
      id: randomUUID(),
      disciplina_id: disciplinaId,
      curso_id: d.curso_id,
      ordem: lista.reduce((m, i) => Math.max(m, i.ordem), 0) + 1,
      instrumento_id: inst.id,
      numero:
        lista
          .filter((i) => i.instrumento_id === inst.id)
          .reduce((m, i) => Math.max(m, i.numero), 0) + 1,
      origem_item: "arbitrado",
      ta_aplicacao: taAplicacao ?? null,
      origem_ta_aplicacao: taAplicacao === undefined ? null : "arbitrado",
      ta_vista: taVista ?? null,
      origem_ta_vista: taVista === undefined ? null : "arbitrado",
    }),
    justificativa,
  );
  if (error) return recusa(error);
  revalidar();
  const aviso = await avisoDaCh(disciplinaId);
  return aviso ? { ok: true, aviso } : { ok: true };
}

export async function nomearUe(entrada: unknown): Promise<ResultadoDoArbitrado> {
  const conferido = esquemaDaUeDecidida.safeParse(entrada);
  if (!conferido.success)
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await criarClienteDeServidor();
  const hoje = hojeNaCiaara();
  const { data, error } = await comJustificativa(
    supabase
      .from("avaliacoes_curriculo")
      .update({
        unidade_ensino_id: conferido.data.unidadeEnsinoId,
        origem_ue: "decisao_ciaara",
        ue_decidida_em: hoje,
      })
      .eq("id", conferido.data.itemId)
      .is("unidade_ensino_id", null)
      .select("id"),
    conferido.data.justificativa,
  );
  if (error) return recusa(error);
  if (!data || data.length === 0)
    return {
      ok: false,
      erro: "Esta avaliação já tem unidade de ensino, ou o seu perfil não pode nomeá-la.",
    };
  revalidar();
  return { ok: true };
}
