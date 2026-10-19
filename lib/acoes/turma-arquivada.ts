/**
 * A TRAVA DA TURMA ARQUIVADA no servidor — D-COR-5: *"trava DSA, instrutor e edição"* (spec 017, FR-004.4).
 *
 * ⚠️ **NÃO É SERVER ACTION** (sem `"use server"`): é um auxiliar chamado DENTRO das ações que gravam dado da turma,
 *    com o cliente da sessão de quem grava. Exportado de um arquivo de ações, ele viraria endpoint HTTP.
 * ⚠️ **UM AUXILIAR SÓ, E A GUARDA COBRA A CHAMADA**: `tests/unidade/turma-arquivada-trava.test.ts` enumera as ações
 *    que gravam dado da turma e reprova a que não chamar `recusaSeTurmaArquivada` (C-6).
 * ⚠️ **A TRAVA DO BANCO É A M4** (portão da regra 9.4): até ela chegar ao remoto, esta é a proteção da tela; depois,
 *    as duas valem, e esta continua dando a frase certa antes de ir ao banco.
 * ⚠️ **LER A ARQUIVADA PASSA PELA RLS**: quem não alcança a turma não a vê arquivada — e também não grava nela (a RLS
 *    da tabela de destino recusa), então a ordem das duas recusas não muda o resultado.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { RECUSA_DA_TURMA_ARQUIVADA } from "@/lib/dominio/arquivamento-da-turma";

/**
 * Devolve a frase de recusa se a turma está arquivada, ou `null` se pode gravar.
 *
 * ⚠️ **A FALHA DE LEITURA NÃO LIBERA**: se a leitura der erro, a gravação é recusada com a frase de erro — gravar numa
 *    turma que talvez esteja arquivada é o que a trava existe para impedir.
 */
export async function recusaSeTurmaArquivada(
  supabase: SupabaseClient,
  turmaId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("vw_turmas_arquivadas")
    .select("turma_id")
    .eq("turma_id", turmaId)
    .maybeSingle();
  if (error) return "Não foi possível conferir se a turma está arquivada. Tente de novo.";
  return data ? RECUSA_DA_TURMA_ARQUIVADA : null;
}

/** O mesmo, quando a ação só tem o código da turma. */
export async function recusaSeTurmaArquivadaPeloCodigo(
  supabase: SupabaseClient,
  turmaCodigo: string,
): Promise<string | null> {
  const { data: turma, error } = await supabase
    .from("turmas")
    .select("id")
    .eq("codigo", turmaCodigo)
    .maybeSingle();
  if (error) return "Não foi possível conferir se a turma está arquivada. Tente de novo.";
  if (!turma) return null;
  return recusaSeTurmaArquivada(supabase, (turma as { id: string }).id);
}
