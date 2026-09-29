"use server";

/**
 * Server Actions de **Unidade de Ensino** (`FR-060` a `FR-063`, D-B3).
 *
 * ⚠️ **A UE PERTENCE À DISCIPLINA, e `curso_id` vem DELA, nunca da tela.** A tabela tem as duas
 * colunas e um `CHECK` composto (`ue_id_curso`) que exige coerência: mandar `curso_id` do formulário
 * abriria a porta para uma UE apontando para curso diferente do da sua disciplina, e o erro seria
 * `23514` numa gravação que parece correta. Aqui ele é **lido** da disciplina.
 *
 * ⚠️ **O `codigo` NÃO É PASSADO** — ele sai de `DEFAULT app.proximo_codigo_ue`, e `authenticated` tem
 * `usage` em `app` (medido em 29/09/2026). Passá-lo à mão criaria numeração paralela à do sistema.
 *
 * ⚠️ **NÃO HÁ `delete`**: a exclusão vai por RPC com porteiro, código digitado e rastro (regra 4,
 * emenda D-B1).
 */
import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeEdicaoDeUnidade,
  esquemaDeExclusaoDeUnidade,
  esquemaDeSituacaoDaUnidade,
  esquemaDeUnidadeEnsino,
} from "@/lib/validacao/unidade-ensino";

export type ResultadoDaUnidade =
  | { readonly ok: true; readonly unidadeId?: string | undefined }
  | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDaUnidade => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

function revalidar(): void {
  revalidatePath("/disciplinas");
}

/** Cria a unidade dentro da disciplina (`FR-060`). */
export async function criarUnidadeEnsino(entrada: unknown): Promise<ResultadoDaUnidade> {
  const conferido = esquemaDeUnidadeEnsino.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const u = conferido.data;
  const supabase = await criarClienteDeServidor();

  // ⚠️ O curso vem da DISCIPLINA. Ver o cabeçalho.
  const { data: disciplina, error: erroLeitura } = await supabase
    .from("disciplinas")
    .select("curso_id")
    .eq("id", u.disciplinaId)
    .maybeSingle();

  if (erroLeitura) return falha(traduzirRecusa(erroLeitura as ErroDoBanco));
  if (!disciplina) return falha(recusaPorAlcance());

  const { error } = await supabase.from("unidades_ensino").insert({
    disciplina_id: u.disciplinaId,
    curso_id: (disciplina as { curso_id: string }).curso_id,
    numero_ue: u.numeroUe,
    topico: u.topico,
    ch_prevista_tempos: u.chPrevistaTempos,
    status: "ativo",
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}

export async function editarUnidadeEnsino(entrada: unknown): Promise<ResultadoDaUnidade> {
  const conferido = esquemaDeEdicaoDeUnidade.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const u = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { error, count } = await supabase
    .from("unidades_ensino")
    .update(
      { numero_ue: u.numeroUe, topico: u.topico, ch_prevista_tempos: u.chPrevistaTempos },
      { count: "exact" },
    )
    .eq("id", u.unidadeId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  // ⚠️ Zero linhas é recusa da policy, não sucesso vazio (gotcha 4 do lado da escrita).
  if (count === 0) return falha(recusaPorAlcance());

  revalidar();
  return { ok: true, unidadeId: u.unidadeId };
}

async function mudarSituacaoDaUnidade(
  entrada: unknown,
  status: "ativo" | "inativo",
): Promise<ResultadoDaUnidade> {
  const conferido = esquemaDeSituacaoDaUnidade.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { error, count } = await supabase
    .from("unidades_ensino")
    .update({ status }, { count: "exact" })
    .eq("id", conferido.data.unidadeId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  if (count === 0) return falha(recusaPorAlcance());

  revalidar();
  return { ok: true, unidadeId: conferido.data.unidadeId };
}

export async function desativarUnidadeEnsino(entrada: unknown): Promise<ResultadoDaUnidade> {
  return mudarSituacaoDaUnidade(entrada, "inativo");
}

export async function reativarUnidadeEnsino(entrada: unknown): Promise<ResultadoDaUnidade> {
  return mudarSituacaoDaUnidade(entrada, "ativo");
}

/** Exclusão permanente, com código e rastro (`FR-020` a `FR-024`, D-B1). */
export async function excluirUnidadeEnsino(entrada: unknown): Promise<ResultadoDaUnidade> {
  const conferido = esquemaDeExclusaoDeUnidade.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("excluir_unidade_ensino", {
    p_unidade_id: conferido.data.unidadeId,
    p_codigo_confirmacao: conferido.data.codigoConfirmacao,
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}
