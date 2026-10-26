/**
 * Os TA do dia de uma turma, no servidor — spec 018 (Bloco 3), C-9: *"o regime da turma substitui o do curso no DSA,
 * no alerta do excepcional, na cascata e no dia parado"*.
 *
 * ⚠️ **NÃO É SERVER ACTION** (sem `"use server"`): é um auxiliar chamado DENTRO das ações do DSA e do dia parado, com o
 *    cliente da sessão de quem grava. Exportado de um arquivo de ações, ele viraria endpoint HTTP.
 * ⚠️ **UMA LEITURA SÓ, NOS TRÊS LUGARES** que antes liam `vw_cursos_regime_vigente.regime_padrao_tempos` cada um por
 *    si: o regime da turma, senão o padrão vigente do curso. Sem nenhum dos dois, `null` — e a reserva continua sendo
 *    a de cada chamador, como antes (`temposDoDiaDaTurma`).
 * ⚠️ **RD-3 (Bloco 11, D-14): COM A DATA, É O REGIME DA SEMANA** — o gravado ou *"só esta semana"* > o *"desde"* > o de
 *    *Editar turma* > o do curso, pela mesma `regimeDaSemana` da tela. Sem a data (a parada global, que não tem
 *    semana de uma turma só), o de antes: turma > curso.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { regimeDaSemana } from "@/lib/dominio/dsa/regime-da-semana";
import { temposDoDiaDaTurma } from "@/lib/dominio/regime-da-turma";

type ComTempos = { regime_tempos?: number | null } | null;

export async function temposDoDiaDaTurmaNoServidor(
  supabase: SupabaseClient,
  entrada: {
    readonly turmaId: string | null;
    readonly cursoId: string | null;
    /** O dia do lançamento, `aaaa-mm-dd` — dá a semana do regime (RD-3). */
    readonly data?: string | null;
  },
): Promise<number | null> {
  const semana = entrada.data ? semanaIsoDe(entrada.data) : null;
  const segunda = semana === null ? null : (datasDaSemanaIso(semana.ano, semana.numero)[0] ?? null);
  const daSemana = entrada.turmaId !== null && semana !== null && segunda !== null;

  const [turmaRes, cursoRes, registroRes, vigenciasRes] = await Promise.all([
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
    !daSemana
      ? Promise.resolve({ data: null })
      : supabase
          .from("dsa_regime_da_semana")
          .select("origem, regime_de_horario_id, regime_tempos")
          .eq("turma_id", entrada.turmaId as string)
          .eq("ano", semana.ano)
          .eq("semana", semana.numero)
          .eq("status", "ativo")
          .maybeSingle(),
    !daSemana
      ? Promise.resolve({ data: [] })
      : supabase
          .from("turma_regime_vigencia")
          .select("vigente_de, regime:regimes_de_horario(regime_tempos)")
          .eq("turma_id", entrada.turmaId as string)
          .eq("status", "ativo")
          .lte("vigente_de", segunda as string),
  ]);
  const daTurma = (turmaRes.data as { regime?: ComTempos } | null)?.regime?.regime_tempos ?? null;
  const doCurso =
    (cursoRes.data as { regime_padrao_tempos?: number | null } | null)?.regime_padrao_tempos ??
    null;
  if (!daSemana) return temposDoDiaDaTurma(daTurma, doCurso);

  const linha = registroRes.data as {
    origem: string;
    regime_de_horario_id: string | null;
    regime_tempos: number | null;
  } | null;
  const resolvido = regimeDaSemana<number | null>({
    segunda: segunda as string,
    registro:
      linha === null
        ? null
        : {
            /* Regime nulo = o do curso na data da semana (sem retrato). */
            regime: linha.regime_de_horario_id === null ? doCurso : linha.regime_tempos,
            origem: linha.origem === "gravado" ? "gravado" : "so_esta_semana",
          },
    vigenciasDaTurma: (
      (vigenciasRes.data ?? []) as { vigente_de: string; regime: ComTempos }[]
    ).map((v) => ({ vigenteDe: v.vigente_de, regime: v.regime?.regime_tempos ?? null })),
    daTurma,
    doCurso,
  });
  return resolvido.regime ?? null;
}
