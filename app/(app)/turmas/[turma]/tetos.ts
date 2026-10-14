/**
 * Monta a entrada de `tetosDaTurma` a partir das linhas que a ficha da turma lê (spec 014, PR 2).
 *
 * ⚠️ **SÓ TIRA COLUNA DE LINHA.** Nenhuma regra mora aqui: o máximo, a origem e o alerta são de
 *    `tetosDaTurma`/`limiteMaximo`. O que este arquivo decide é só **qual parâmetro vale no ano** — a
 *    mesma regra de `app.fn_parametro_numerico` (vigência específica vence a perene) —, porque os
 *    parâmetros chegam numa leitura só, em vez de uma chamada por chave.
 */
import type { Categoria, EntradaDosTetos } from "@/lib/dominio/tetos-da-turma";

export const CHAVES_DOS_PARAMETROS_DOS_TETOS = [
  "estudo_obrig_com_regime_pct",
  "estudo_obrig_sem_regime_pct",
  "proens.reserva_generica_aec",
  "proens.reserva_generica_tad",
  "proens.reserva_generica_tr",
] as const;

export const COLUNAS_DO_PREVISTO =
  "categoria, tempos_previstos, criado_por, criado_em, editado_por, editado_em";

type LinhaDoParametro = { chave: string; valor: string; ano_vigencia: number | null };

/** O valor numérico de `chave` que vale em `ano`: a vigência mais recente ≤ ano, senão a perene. */
export function parametroDoAno(
  linhas: readonly LinhaDoParametro[],
  chave: string,
  ano: number,
): number | null {
  const candidatas = linhas
    .filter((l) => l.chave === chave && (l.ano_vigencia === null || l.ano_vigencia <= ano))
    .sort((a, b) => (b.ano_vigencia ?? -1) - (a.ano_vigencia ?? -1));
  const valor = candidatas[0] ? Number(candidatas[0].valor) : NaN;
  return Number.isFinite(valor) ? valor : null;
}

const minuscula = (c: string) => c.toLowerCase() as Categoria;

export function entradaDosTetos({
  carga,
  diasParados,
  previstos,
  conformidade,
  referenciaEi,
  ead,
}: {
  readonly carga: Record<string, unknown> | null;
  readonly diasParados: ReadonlyArray<{
    tipo: string | null;
    tempos: number | null;
    dias: number | null;
  }>;
  readonly previstos: ReadonlyArray<{ categoria: string; tempos_previstos: number }>;
  readonly conformidade: ReadonlyArray<{
    categoria: string | null;
    limite_declarado: number | null;
    percentual_norma: number | null;
    ch_curricular: number | null;
  }>;
  readonly referenciaEi: EntradaDosTetos["referenciaEi"];
  readonly ead: boolean;
}): EntradaDosTetos {
  const n = (v: unknown) => Number(v ?? 0);
  const previstoProens: Partial<Record<Categoria, number>> = {};
  for (const p of previstos) previstoProens[minuscula(p.categoria)] = Number(p.tempos_previstos);
  const limitesDoCurriculo: Partial<Record<Categoria, number>> = {};
  const percentuais: Record<Categoria, number | null> = { aec: null, tad: null, tr: null };
  for (const c of conformidade) {
    if (!c.categoria) continue;
    const k = minuscula(c.categoria);
    if (c.limite_declarado !== null) limitesDoCurriculo[k] = Number(c.limite_declarado);
    percentuais[k] = c.percentual_norma === null ? null : Number(c.percentual_norma);
  }
  const ch = carga?.chr_curricular;
  return {
    chCurricular: ch === null || ch === undefined ? null : Number(ch),
    cumprido: {
      chd: n(carga?.chd_executada),
      aec: n(carga?.ta_aec),
      tad: n(carga?.ta_tad),
      tr: n(carga?.ta_tr),
      estudoIndividual: n(carga?.ta_estudo_individual),
      apoioIndividualizado: n(carga?.ta_apoio_individualizado),
    },
    diasParados: diasParados.map((d) => ({
      tipo: d.tipo ?? "FR",
      tempos: n(d.tempos),
      dias: n(d.dias),
    })),
    previstoProens,
    limitesDoCurriculo,
    percentuais,
    referenciaEi,
    ead,
  };
}
