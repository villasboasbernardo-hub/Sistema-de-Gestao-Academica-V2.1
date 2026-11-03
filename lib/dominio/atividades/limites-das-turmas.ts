/**
 * RA-9 (Bloco 18, spec 033, `FR-006.3` e `FR-007.1`) — o USO DO LIMITE de AEC, TAD e TR de várias turmas de uma vez.
 *
 * > *"Estatísticas pensadas para a DEnsM e a auditoria interna: por turma, TA de AEC/TAD/TR usados × limite do
 * > currículo (…). Calculadas em lib/dominio (TS puro) e reaproveitáveis pelo Épico 10."* — Bernardo Villas Boas,
 * > 03/11/2026
 *
 * ⚠️ **O VEREDITO É DE `tetosDaTurma`**, o decisor único do teto (SC-003 da spec 014): aqui só se monta a ENTRADA dele a
 *    partir das linhas de `vw_conformidade_tetos` (uma por turma × categoria) e dos previstos PROENS, e se chama a
 *    função para cada turma — em memória, depois das leituras. É o mesmo agrupamento de `tetosExcedidos` (Avisos,
 *    `/inicio`), que devolve só as excedidas; este devolve o quadro inteiro de cada turma.
 * ⚠️ **O CUMPRIDO É O DA VIEW**, que já sai do «Conta como» (`conta_como = 'CHD'` sai da AEC/TAD/TR, M2 do Bloco 18).
 * ⚠️ **A TURMA EAD PURA NÃO TEM LIMITE** (`FR-006` da spec 014): sai com `ead: true`, e quem desenha a pula.
 * ⚠️ **ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`, regra 6): nada aqui serve para recusar gravação.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  tetosDaTurma,
  type Categoria,
  type EntradaDosTetos,
  type TetosDaTurma,
} from "@/lib/dominio/tetos-da-turma";

export type LinhaDaConformidadeDaTurma = {
  readonly turma_id: string | null;
  readonly categoria: string | null;
  readonly cumprido: number | null;
  readonly limite_declarado: number | null;
  readonly ch_curricular: number | null;
  readonly percentual_norma: number | null;
};

export type PrevistoDaTurma = {
  readonly turma_id: string;
  readonly categoria: string;
  readonly tempos_previstos: number;
};

export type TurmaDoLimite = {
  readonly id: string;
  readonly codigo: string;
  /** EAD pura (`ehEadPuro`): sem limite de AEC, TAD e TR. */
  readonly ead: boolean;
};

const CATEGORIAS: readonly Categoria[] = ["aec", "tad", "tr"];

function categoriaDaLinha(valor: string | null): Categoria | null {
  const c = (valor ?? "").toLowerCase();
  return (CATEGORIAS as readonly string[]).includes(c) ? (c as Categoria) : null;
}

/** A entrada de `tetosDaTurma` de UMA turma, a partir das linhas dela. */
export function entradaDosTetosDaConformidade(
  linhas: readonly LinhaDaConformidadeDaTurma[],
  previstos: readonly PrevistoDaTurma[],
  ead: boolean,
): EntradaDosTetos {
  const cumprido = { aec: 0, tad: 0, tr: 0 };
  const limites: Partial<Record<Categoria, number>> = {};
  const percentuais: Record<Categoria, number | null> = { aec: null, tad: null, tr: null };
  let ch: number | null = null;
  for (const l of linhas) {
    const c = categoriaDaLinha(l.categoria);
    if (c === null) continue;
    cumprido[c] = Number(l.cumprido ?? 0);
    if (l.limite_declarado !== null) limites[c] = Number(l.limite_declarado);
    percentuais[c] = l.percentual_norma === null ? null : Number(l.percentual_norma);
    ch = l.ch_curricular === null ? ch : Number(l.ch_curricular);
  }
  const previstoProens: Partial<Record<Categoria, number>> = {};
  for (const p of previstos) {
    const c = categoriaDaLinha(p.categoria);
    if (c !== null) previstoProens[c] = Number(p.tempos_previstos);
  }
  return {
    chCurricular: ch,
    cumprido: { chd: 0, ...cumprido, estudoIndividual: 0, apoioIndividualizado: 0 },
    diasParados: [],
    previstoProens,
    limitesDoCurriculo: limites,
    percentuais,
    referenciaEi: { comEstudoObrigatorio: null, semEstudoObrigatorio: null },
    ead,
  };
}

/**
 * O quadro de tetos de cada turma, na ordem em que as turmas chegam. A turma sem linha na view (sem disciplina, sem
 * conformidade calculada) sai com o cumprido zero e o máximo «não calculável» — nunca um limite inventado.
 */
export function tetosDasTurmas(
  turmas: readonly TurmaDoLimite[],
  conformidade: readonly LinhaDaConformidadeDaTurma[],
  previstos: readonly PrevistoDaTurma[],
): { readonly turmaId: string; readonly turmaCodigo: string; readonly tetos: TetosDaTurma }[] {
  const linhasPorTurma = new Map<string, LinhaDaConformidadeDaTurma[]>();
  for (const l of conformidade) {
    if (l.turma_id === null) continue;
    linhasPorTurma.set(l.turma_id, [...(linhasPorTurma.get(l.turma_id) ?? []), l]);
  }
  const previstosPorTurma = new Map<string, PrevistoDaTurma[]>();
  for (const p of previstos) {
    previstosPorTurma.set(p.turma_id, [...(previstosPorTurma.get(p.turma_id) ?? []), p]);
  }
  return turmas.map((t) => ({
    turmaId: t.id,
    turmaCodigo: t.codigo,
    tetos: tetosDaTurma(
      entradaDosTetosDaConformidade(
        linhasPorTurma.get(t.id) ?? [],
        previstosPorTurma.get(t.id) ?? [],
        t.ead,
      ),
    ),
  }));
}
