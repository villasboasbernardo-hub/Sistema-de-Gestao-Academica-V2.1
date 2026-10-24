"use server";

/**
 * As ações da publicação do DSA — spec 024 (Bloco 9): Salvar, Descartar rascunho, Fazer alteração e Publicar (a
 * original e a alteração). Regras: `docs/correcoes/regras-da-publicacao-do-dsa.md` (RP-0 a RP-8).
 *
 * ⚠️ **QUEM DECIDE É O BANCO** (`salvar_semana_do_dsa`, `descartar_rascunho_do_dsa`, `iniciar_alteracao_do_dsa`,
 *    `publicar_semana_do_dsa`): a situação, a trava e a permissão (RP-5, quem lança o DSA da turma). Aqui se monta o
 *    retrato e se traduz a recusa.
 * ⚠️ **O RETRATO É O DOCUMENTO SALVO** (RP-8): a alteração SALVA primeiro e só então monta o papel — o quadro de CH lê
 *    só o salvo, e um retrato montado antes sairia sem o que a alteração acabou de salvar. A original exige a semana
 *    já salva, então o salvo é o papel.
 * ⚠️ Zod na primeira linha.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDaPublicacao, esquemaDaSemanaDoDsa } from "@/lib/validacao/publicacao-do-dsa";

import { montarRetratoDaSemana } from "@/app/print/dsa/retrato";

export type RespostaDaPublicacao =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "O seu perfil não lança o DSA desta turma.";

function revalidar(): void {
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath("/inicio");
  revalidatePath("/turmas");
  revalidatePath("/avisos");
}

function recusa(erro: ErroDoBanco): RespostaDaPublicacao {
  return { ok: false, erro: erro.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(erro) };
}

/** A semana ISO de segunda a domingo — o intervalo dos rascunhos da semana. */
function intervalo(ano: number, semana: number): { de: string; ate: string } {
  const dias = datasDaSemanaIso(ano, semana);
  return { de: dias[0] ?? "", ate: dias[6] ?? dias[dias.length - 1] ?? "" };
}

/** Salvar (RP-0): aplica os rascunhos da semana de uma vez e registra o salvamento. */
export async function salvarSemanaDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const { data, error } = await supabase.rpc("salvar_semana_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  const n = Number(data ?? 0);
  return {
    ok: true,
    mensagem:
      n === 0
        ? "Semana salva (não havia rascunho)."
        : `Semana salva: ${n} lançamento${n === 1 ? "" : "s"} registrado${n === 1 ? "" : "s"}.`,
  };
}

/** Descartar rascunho (RP-0): desfaz o que não foi salvo — inativa, nunca apaga. */
export async function descartarRascunhoDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const { data, error } = await supabase.rpc("descartar_rascunho_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  const n = Number(data ?? 0);
  return {
    ok: true,
    mensagem: `Rascunho descartado: ${n} mudança${n === 1 ? "" : "s"} desfeita${n === 1 ? "" : "s"}.`,
  };
}

/** Fazer alteração (RP-1): destrava a semana publicada. */
export async function fazerAlteracaoNoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("iniciar_alteracao_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  return { ok: true, mensagem: "Alteração iniciada: a semana está destravada." };
}

/**
 * Publicar (RP-1, RP-2): sem justificativa, a ORIGINAL (exige a semana salva); com ela, a ALTERAÇÃO — salva os
 * rascunhos, monta o retrato do salvo e publica a ALT N.
 */
export async function publicarSemanaDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaPublicacao.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { turmaId, ano, semana, justificativa } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const alteracao = justificativa !== undefined;

  if (alteracao) {
    const salvo = await supabase.rpc("salvar_semana_do_dsa", {
      p_turma: turmaId,
      p_ano: ano,
      p_semana: semana,
      p_de: de,
      p_ate: ate,
    });
    if (salvo.error) return recusa(salvo.error as ErroDoBanco);
  }

  const hoje = hojeNaCiaara();
  const retrato = await montarRetratoDaSemana(supabase, { turmaId, ano, numero: semana, hoje });
  if (retrato === null) return { ok: false, erro: SEM_PERMISSAO };

  const { data, error } = await supabase.rpc("publicar_semana_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
    p_retrato: JSON.parse(JSON.stringify(retrato)),
    ...(alteracao ? { p_justificativa: justificativa } : {}),
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  const numero = Number(data ?? 0);
  return {
    ok: true,
    mensagem: numero === 0 ? "Semana publicada (original)." : `Alteração publicada: ALT ${numero}.`,
  };
}
