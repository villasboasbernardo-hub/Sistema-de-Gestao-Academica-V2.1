/**
 * A tradução de `public.vigencias_do_curso` para o vocabulário do domínio — **sem I/O**.
 *
 * ⚠️ **O GERADOR DE TIPOS NÃO ENXERGA NULO EM `RETURNS TABLE`.** Ele declara toda coluna como não
 * nula, e as cinco de trava só vêm preenchidas quando há lançamento. Confiar no tipo faria a ausência
 * de trava chegar à tela como a string `"null"` — pior que um erro, porque parece dado. Por isso o
 * mapeamento normaliza com `?? null` mesmo onde o tipo jura que não precisa.
 *
 * ⚠️ **AUSÊNCIA DE TRAVA É AUSÊNCIA DE LINHA**, e não um `false`: é assim que
 * `app.lancamentos_que_travam_vigencia` responde, e é assim que `podeCorrigir` espera receber.
 */
import type { TravaDaVigencia, VigenciaDoHistorico } from "@/lib/dominio/vigencia-de-regime";
import type { Database } from "@/lib/tipos/database";

/** Uma linha de `public.vigencias_do_curso`, como o banco a emite. */
export type LinhaDeVigencia =
  Database["public"]["Functions"]["vigencias_do_curso"]["Returns"][number];

const numeroOuNulo = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

export function vigenciasDoBanco(linhas: readonly LinhaDeVigencia[]): VigenciaDoHistorico[] {
  return linhas.map((v) => ({
    id: v.id,
    codigo: v.codigo,
    tipo: v.tipo_regime,
    status: v.status,
    vigenteDe: v.vigente_de,
    vigenteAte: v.vigente_ate ?? null,
    regimeTempos: Number(v.regime_tempos),
    taDuracaoMin: Number(v.ta_duracao_min),
    intervaloManhaMin: Number(v.intervalo_manha_min),
    intervaloTardeMin: Number(v.intervalo_tarde_min),
    horaInicioManha: v.hora_inicio_manha ?? null,
    horaInicioTarde: v.hora_inicio_tarde ?? null,
    limiteDiarioEadHoras: numeroOuNulo(v.limite_diario_ead_horas),
    fundamentoCurricular: v.fundamento_curricular ?? null,
    motivo: v.motivo ?? null,
  }));
}

export function travasDoBanco(linhas: readonly LinhaDeVigencia[]): TravaDaVigencia[] {
  return linhas
    .filter((v) => v.trava_tipo !== null && v.trava_tipo !== undefined)
    .map((v) => ({
      vigenciaId: v.id,
      tipo: v.trava_tipo,
      data: v.trava_data,
      turma: v.trava_turma ?? null,
      atividade: v.trava_atividade ?? null,
      total: Number(v.trava_total ?? 1),
      pontaAusente: v.trava_ponta_ausente ?? null,
    }));
}
