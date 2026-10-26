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
 * ⚠️ **E O DO CURSO É O DA SEMANA, como na tela** (revisão do Bloco 11): exceção > padrão de `curso_regime_historico`
 *    na segunda-feira, por `vigenteDoCursoEm` (a mesma da tela) — e não `vw_cursos_regime_vigente`, que responde pelo padrão de **hoje**
 *    (`current_date`) e ignora a exceção. Com a vigência futura ou a exceção, o botão do EI, a parede da cascata e o dia
 *    parado usavam outro regime que o da grade. Sem `cursoId` (a atividade e a vista não o trazem), o curso sai da
 *    turma — sem ele a parede virava o limite do banco.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { regimeDaSemana } from "@/lib/dominio/dsa/regime-da-semana";
import { temposDoDiaDaTurma } from "@/lib/dominio/regime-da-turma";
import { vigenteDoCursoEm, type VigenciaDoHistorico } from "@/lib/dominio/vigencia-de-regime";

type ComTempos = { regime_tempos?: number | null } | null;

type LinhaDaVigenciaDoCurso = {
  id: string;
  codigo: string;
  tipo_regime: string;
  status: string;
  vigente_de: string;
  vigente_ate: string | null;
  regime_tempos: number;
};

/** O regime do curso na data (exceção > padrão), como a tela o resolve (`vigenteDoCursoEm`). */
function doCursoNaData(linhas: readonly LinhaDaVigenciaDoCurso[], data: string): number | null {
  const vigencias: VigenciaDoHistorico[] = linhas.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    tipo: l.tipo_regime === "excecao" ? "excecao" : "padrao",
    status: l.status,
    vigenteDe: l.vigente_de,
    vigenteAte: l.vigente_ate,
    regimeTempos: l.regime_tempos,
    /* Só o tipo, a situação e a janela decidem a vigência; o relógio não entra aqui. */
    taDuracaoMin: 0,
    intervaloManhaMin: 0,
    intervaloTardeMin: 0,
    horaInicioManha: null,
    horaInicioTarde: null,
    limiteDiarioEadHoras: null,
    fundamentoCurricular: null,
    motivo: null,
  }));
  return vigenteDoCursoEm(vigencias, data)?.regimeTempos ?? null;
}

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

  /* A atividade e a vista não trazem o curso: ele sai da turma (uma ida a mais, só nesse caso). */
  let cursoId = entrada.cursoId;
  if (cursoId === null && entrada.turmaId !== null) {
    const { data: daTurmaRes } = await supabase
      .from("turmas")
      .select("curso_id")
      .eq("id", entrada.turmaId)
      .maybeSingle();
    cursoId = ((daTurmaRes as { curso_id?: string | null } | null)?.curso_id ?? null) as
      string | null;
  }

  const [turmaRes, cursoRes, historicoRes, registroRes, vigenciasRes] = await Promise.all([
    entrada.turmaId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("turmas")
          .select("regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos)")
          .eq("id", entrada.turmaId)
          .maybeSingle(),
    cursoId === null || daSemana
      ? Promise.resolve({ data: null })
      : supabase
          .from("vw_cursos_regime_vigente")
          .select("regime_padrao_tempos")
          .eq("curso_id", cursoId)
          .maybeSingle(),
    cursoId === null || !daSemana
      ? Promise.resolve({ data: [] })
      : supabase
          .from("curso_regime_historico")
          .select("id, codigo, tipo_regime, status, vigente_de, vigente_ate, regime_tempos")
          .eq("curso_id", cursoId)
          .eq("status", "ativo"),
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
  if (!daSemana) {
    const doCursoHoje =
      (cursoRes.data as { regime_padrao_tempos?: number | null } | null)?.regime_padrao_tempos ??
      null;
    return temposDoDiaDaTurma(daTurma, doCursoHoje);
  }
  const doCurso = doCursoNaData(
    (historicoRes.data ?? []) as LinhaDaVigenciaDoCurso[],
    segunda as string,
  );

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
