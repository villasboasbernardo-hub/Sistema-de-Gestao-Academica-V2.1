"use server";

/**
 * «Juntar como sessão da mesma prova» (spec 014 — decisão de Bernardo Villas Boas, 16/10/2026: *"Dias próximos = 7, e
 * na aba Avaliações da turma a ação "juntar como sessão da mesma prova" (Encarregado/Admin, com trilha)"*).
 *
 * > *"RN-AV-12: (…) qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo
 * > COD) é UMA prova com N sessões de aplicação, não N provas. O card "N de M" conta 1."*
 *
 * A sincronização junta sozinha o que cai na janela de 7 dias; o que passou dela (os casos de 13 e 43 dias da rodada
 * de 14/10/2026) é decisão de gente, e é esta a ação.
 *
 * ⚠️ **A REGRA E A PERMISSÃO SÃO DO BANCO** (`public.juntar_como_sessao`, migration E-6): mesma turma e disciplina,
 *    as duas vivas, a juntada no dia da prova ou depois, e só `avaliacoes_juntar_sessao.editar` (Admin e Encarregado).
 *    A trilha — quem, quando e o retrato da juntada antes — é gravada pelo banco, imutável.
 * ⚠️ Server Action é endpoint HTTP: Zod na primeira linha.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa } from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeJuntarSessao } from "@/lib/validacao/juntar-sessao";

export type ResultadoDeJuntar =
  { readonly ok: true } | { readonly ok: false; readonly erro: string };

export async function juntarComoSessao(entrada: unknown): Promise<ResultadoDeJuntar> {
  const conferido = esquemaDeJuntarSessao.safeParse(entrada);
  if (!conferido.success)
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  const { provaId, avaliacaoId } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("juntar_como_sessao", {
    p_prova_id: provaId,
    p_avaliacao_id: avaliacaoId,
  });
  if (error) return { ok: false, erro: traduzirRecusa(error) };
  revalidatePath("/turmas", "layout");
  revalidatePath("/cursos", "layout");
  return { ok: true };
}
