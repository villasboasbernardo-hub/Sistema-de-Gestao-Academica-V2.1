/**
 * As turmas com teto de AEC, TAD ou TR excedido — para a página do curso e o `/inicio` (`FR-005`,
 * `RF-CURSO-06`, `RF-INI-04`; spec 014, PR 2).
 *
 * ⚠️ **O VEREDITO É DE `tetosDaTurma`**, o mesmo dos cards da ficha (SC-003): este arquivo só agrupa
 *    as linhas de `vw_conformidade_tetos` e de `previstos_proens_turma` por turma e chama a função pura
 *    para cada uma — em memória, depois das leituras, nunca com `await` em laço.
 * ⚠️ Turma EAD não tem cards e não entra (`FR-006`).
 */
import { ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import {
  tetosDaTurma,
  type AlertaDeTeto,
  type Categoria,
  type EntradaDosTetos,
} from "@/lib/dominio/tetos-da-turma";

export type LinhaDaConformidade = {
  turma_id: string | null;
  turma_codigo: string | null;
  categoria: string | null;
  cumprido: number | null;
  limite_declarado: number | null;
  ch_curricular: number | null;
  percentual_norma: number | null;
};

export type LinhaDoPrevisto = { turma_id: string; categoria: string; tempos_previstos: number };

export type TetoExcedido = {
  readonly turmaCodigo: string;
  readonly categoria: Categoria;
  readonly alerta: AlertaDeTeto;
  readonly cumprido: number;
  /** O número contra o qual excedeu: o previsto, ou o máximo. */
  readonly referencia: number;
};

export const COLUNAS_DA_CONFORMIDADE =
  "turma_id, turma_codigo, categoria, cumprido, limite_declarado, ch_curricular, percentual_norma";

export function tetosExcedidos(
  conformidade: readonly LinhaDaConformidade[],
  previstos: readonly LinhaDoPrevisto[],
  modalidadePorTurma: ReadonlyMap<string, string | null>,
): TetoExcedido[] {
  const porTurma = new Map<string, LinhaDaConformidade[]>();
  for (const l of conformidade) {
    if (!l.turma_id) continue;
    porTurma.set(l.turma_id, [...(porTurma.get(l.turma_id) ?? []), l]);
  }
  const saida: TetoExcedido[] = [];
  for (const [turmaId, linhas] of porTurma) {
    if (ehEadPuro(modalidadePorTurma.get(turmaId) ?? null)) continue;
    const cumprido = { aec: 0, tad: 0, tr: 0 };
    const limites: Partial<Record<Categoria, number>> = {};
    const percentuais: Record<Categoria, number | null> = { aec: null, tad: null, tr: null };
    let ch: number | null = null;
    for (const l of linhas) {
      const c = (l.categoria ?? "").toLowerCase() as Categoria;
      if (!(c in cumprido)) continue;
      cumprido[c] = Number(l.cumprido ?? 0);
      if (l.limite_declarado !== null) limites[c] = Number(l.limite_declarado);
      percentuais[c] = l.percentual_norma === null ? null : Number(l.percentual_norma);
      ch = l.ch_curricular === null ? ch : Number(l.ch_curricular);
    }
    const previstoProens: Partial<Record<Categoria, number>> = {};
    for (const p of previstos) {
      if (p.turma_id === turmaId)
        previstoProens[p.categoria.toLowerCase() as Categoria] = Number(p.tempos_previstos);
    }
    const entrada: EntradaDosTetos = {
      chCurricular: ch,
      cumprido: { chd: 0, ...cumprido, estudoIndividual: 0, apoioIndividualizado: 0 },
      diasParados: [],
      previstoProens,
      limitesDoCurriculo: limites,
      percentuais,
      referenciaEi: { comEstudoObrigatorio: null, semEstudoObrigatorio: null },
      ead: false,
    };
    const r = tetosDaTurma(entrada);
    if (r.ead) continue;
    const codigo = linhas[0]?.turma_codigo ?? "";
    for (const c of ["aec", "tad", "tr"] as const) {
      const card = r.cards[c];
      for (const alerta of card.alertas) {
        const referencia =
          alerta === "acima_do_previsto"
            ? (card.previsto as number)
            : typeof card.maximo === "object"
              ? card.maximo.valor
              : 0;
        saida.push({
          turmaCodigo: codigo,
          categoria: c,
          alerta,
          cumprido: card.cumprido,
          referencia,
        });
      }
    }
  }
  return saida.sort((a, b) => a.turmaCodigo.localeCompare(b.turmaCodigo, "pt-BR"));
}

const SIGLA: Readonly<Record<Categoria, string>> = { aec: "AEC", tad: "TAD", tr: "TR" };

/** `C-Ap-HN 2026: TAD acima do máximo (29 de 27,25)` */
export function fraseDoExcedido(e: TetoExcedido): string {
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const qual = e.alerta === "acima_do_previsto" ? "acima do previsto" : "acima do máximo";
  return `${e.turmaCodigo}: ${SIGLA[e.categoria]} ${qual} (${n(e.cumprido)} de ${n(e.referencia)})`;
}
