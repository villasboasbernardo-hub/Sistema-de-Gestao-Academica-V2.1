"use server";

/**
 * Criar, editar e inativar a avaliação do currículo de uma disciplina, no cadastro (`/disciplinas`, painel das
 * unidades) — spec 014, FR-038.
 *
 * ⚠️ **É TRANSCRIÇÃO DO CURRÍCULO**: o item nasce com `origem_item = curriculo`, com o arquivo e a página de onde
 *    veio (`avc_fonte_se_curriculo`), e os tempos com origem `curriculo`. O arbitrado é outra ação
 *    (`avaliacoes-do-curriculo.ts`), com outra permissão.
 * ⚠️ **A MESMA PERMISSÃO DAS UEs** (`disciplinas.editar`), conferida pela policy do banco; o botão segue ela.
 * ⚠️ **A CH NÃO MUDA, E PASSAR DELA É AVISO** (FR-031, `RN-DEG-02`): a gravação devolve `soma_acima_da_ch`.
 * ⚠️ **INATIVAR, NUNCA APAGAR** (regra 4): `status = 'inativo'`, e o item continua na lista.
 * ⚠️ Gera o `id` antes e não usa `RETURNING` no insert (gotcha 4.1).
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaSituacaoDoItem,
  esquemaDoItemDoCurriculo,
} from "@/lib/validacao/avaliacao-do-curriculo";

export type ResultadoDoItem =
  | { readonly ok: true; readonly aviso?: "soma_acima_da_ch" }
  | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "O seu perfil não pode editar as avaliações do currículo desta disciplina.";

function recusa(error: { code?: string } & ErroDoBanco): ResultadoDoItem {
  return { ok: false, erro: error.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(error) };
}

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

export async function salvarItemDoCurriculo(entrada: unknown): Promise<ResultadoDoItem> {
  const conferido = esquemaDoItemDoCurriculo.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { itemId, disciplinaId, instrumento, taAplicacao, taVista, fonteArquivo, fontePagina } =
    conferido.data;
  const supabase = await criarClienteDeServidor();
  const tempos = {
    ta_aplicacao: taAplicacao ?? null,
    origem_ta_aplicacao: taAplicacao === undefined ? null : "curriculo",
    ta_vista: taVista ?? null,
    origem_ta_vista: taVista === undefined ? null : "curriculo",
  };

  if (itemId) {
    const { data, error } = await supabase
      .from("avaliacoes_curriculo")
      .update(tempos)
      .eq("id", itemId)
      .select("id");
    if (error) return recusa(error);
    if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
  } else {
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
          .eq("disciplina_id", disciplinaId),
      ]);
    const falha = e1 ?? e2 ?? e3;
    if (falha) return recusa(falha);
    if (!d || !inst) return { ok: false, erro: "Disciplina ou instrumento não encontrado." };
    const lista = existentes ?? [];
    const { error } = await supabase.from("avaliacoes_curriculo").insert({
      id: randomUUID(),
      disciplina_id: disciplinaId,
      curso_id: d.curso_id,
      ordem: lista.reduce((m, i) => Math.max(m, i.ordem), 0) + 1,
      instrumento_id: inst.id,
      numero:
        lista
          .filter((i) => i.instrumento_id === inst.id)
          .reduce((m, i) => Math.max(m, i.numero), 0) + 1,
      origem_item: "curriculo",
      fonte_arquivo: fonteArquivo,
      fonte_pagina: fontePagina,
      ...tempos,
    });
    if (error) return recusa(error);
  }
  revalidatePath("/disciplinas");
  revalidatePath("/turmas", "layout");
  const aviso = await avisoDaCh(disciplinaId);
  return aviso ? { ok: true, aviso } : { ok: true };
}

export async function mudarSituacaoDoItem(entrada: unknown): Promise<ResultadoDoItem> {
  const conferido = esquemaDaSituacaoDoItem.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("avaliacoes_curriculo")
    .update({ status: conferido.data.ativo ? "ativo" : "inativo" })
    .eq("id", conferido.data.itemId)
    .select("id");
  if (error) return recusa(error);
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
  revalidatePath("/disciplinas");
  revalidatePath("/turmas", "layout");
  return { ok: true };
}
