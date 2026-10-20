/**
 * Os TA do dia de uma turma, no servidor — spec 018 (Bloco 3), C-9: *"o regime da turma substitui o do curso no DSA,
 * no alerta do excepcional, na cascata e no dia parado"*.
 *
 * ⚠️ **NÃO É SERVER ACTION** (sem `"use server"`): é um auxiliar chamado DENTRO das ações do DSA e do dia parado, com o
 *    cliente da sessão de quem grava. Exportado de um arquivo de ações, ele viraria endpoint HTTP.
 * ⚠️ **UMA LEITURA SÓ, NOS TRÊS LUGARES** que antes liam `vw_cursos_regime_vigente.regime_padrao_tempos` cada um por
 *    si: o regime da turma, senão o padrão vigente do curso. Sem nenhum dos dois, `null` — e a reserva continua sendo
 *    a de cada chamador, como antes (`temposDoDiaDaTurma`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { temposDoDiaDaTurma } from "@/lib/dominio/regime-da-turma";

export async function temposDoDiaDaTurmaNoServidor(
  supabase: SupabaseClient,
  entrada: { readonly turmaId: string | null; readonly cursoId: string | null },
): Promise<number | null> {
  const [turmaRes, cursoRes] = await Promise.all([
    entrada.turmaId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("turmas")
          .select("regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos)")
          .eq("id", entrada.turmaId)
          .maybeSingle(),
    entrada.cursoId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("vw_cursos_regime_vigente")
          .select("regime_padrao_tempos")
          .eq("curso_id", entrada.cursoId)
          .maybeSingle(),
  ]);
  const daTurma =
    (turmaRes.data as { regime?: { regime_tempos?: number | null } | null } | null)?.regime
      ?.regime_tempos ?? null;
  const doCurso =
    (cursoRes.data as { regime_padrao_tempos?: number | null } | null)?.regime_padrao_tempos ??
    null;
  return temposDoDiaDaTurma(daTurma, doCurso);
}
