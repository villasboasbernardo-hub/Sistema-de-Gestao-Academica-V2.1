/**
 * Os cards de AEC, TAD e TR de uma turma — `RN-EVT-01` e `FR-002` a `FR-007` da spec 014.
 *
 * > *"Fórmula normativa: **CHT = CHD + AEC + TAD + TR** (Estudo Individual não integra esta soma; é
 * > controlado à parte)."* — `RN-EVT-01`, documento 04 da Fase 1
 *
 * Cada card mostra o cumprido, o **previsto no PROENS** da turma e o **limite máximo**
 * (`limiteMaximo`), com os **dois percentuais da D-TETO-3, nesta ordem**: cumprido ÷ previsto e
 * cumprido ÷ máximo. **Nunca** percentual sobre a CH (decisão de Bernardo, 13/10/2026).
 *
 * ⚠️ **ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`, regra 6 do `CLAUDE.md`): nada no retorno serve para
 *    recusar gravação, e este é o **único** lugar que decide alerta de teto (SC-003) — a página da
 *    turma, a do curso e o `/inicio` leem daqui.
 * ⚠️ **ESTUDO INDIVIDUAL, APOIO INDIVIDUALIZADO E DIAS PARADOS FICAM FORA DA CHT, E O TIPO IMPEDE A
 *    SOMA:** os três saem como OBJETO, e `cht + estudoIndividual` é erro de compilação.
 * ⚠️ Não confundir com `lib/dominio/dsa/tetos.ts`, que é o teto SEMANAL por disciplina (`RN-DIST-03`).
 * ⚠️ TypeScript puro: sem `next`, `react` nem `supabase` (regra 9).
 */
import { limiteMaximo, type LimiteMaximo } from "./limite-maximo";

export type Categoria = "aec" | "tad" | "tr";
const CATEGORIAS: readonly Categoria[] = ["aec", "tad", "tr"];

export type EntradaDosTetos = {
  /** Σ CH das disciplinas ativas do curso, em TA. Nulo = turma sem disciplina ativa. */
  readonly chCurricular: number | null;
  readonly cumprido: {
    readonly chd: number;
    readonly aec: number;
    readonly tad: number;
    readonly tr: number;
    readonly estudoIndividual: number;
    readonly apoioIndividualizado: number;
  };
  /** De `vw_dias_parados_turma` (FR-025.4): uma linha por tipo, ou várias — este módulo agrega. */
  readonly diasParados: ReadonlyArray<{
    readonly tipo: string;
    readonly tempos: number;
    readonly dias: number;
  }>;
  readonly previstoProens: Partial<Record<Categoria, number>>;
  readonly limitesDoCurriculo: Partial<Record<Categoria, number>>;
  /** Percentuais da norma no ano; nulo = não cadastrado no ano. */
  readonly percentuais: Readonly<Record<Categoria, number | null>>;
  readonly referenciaEi: {
    readonly comEstudoObrigatorio: number | null;
    readonly semEstudoObrigatorio: number | null;
  };
  readonly ead: boolean;
};

export type AlertaDeTeto = "acima_do_previsto" | "acima_do_maximo";

export type CardDeTeto = {
  readonly cumprido: number;
  readonly previsto: number | "nao_definido";
  readonly maximo: LimiteMaximo;
  /** 1º percentual (D-TETO-3): cumprido ÷ previsto, inteiro. Nulo = previsto não definido (ou zero). */
  readonly percentualDoPrevisto: number | null;
  /** 2º percentual: cumprido ÷ máximo, inteiro. Nulo = máximo não calculável. */
  readonly percentualDoMaximo: number | null;
  /** De 0 ao máximo, com o marcador do previsto. Nulo sem máximo. */
  readonly barra: { readonly maximo: number; readonly marcadorDoPrevisto: number | null } | null;
  readonly alertas: readonly AlertaDeTeto[];
};

export type TetosDaTurma =
  | { readonly ead: true }
  | {
      readonly ead: false;
      readonly chd: number;
      readonly aec: number;
      readonly tad: number;
      readonly tr: number;
      /** = chd + aec + tad + tr. Nunca EI, Apoio nem dias parados. */
      readonly cht: number;
      readonly cards: Readonly<Record<Categoria, CardDeTeto>>;
      readonly estudoIndividual: {
        readonly cumprido: number;
        readonly referencias: ReadonlyArray<{
          readonly rotulo: string;
          readonly percentual: number | null;
        }>;
      };
      readonly apoioIndividualizado: { readonly cumprido: number };
      readonly diasParados: {
        readonly tempos: number;
        readonly dias: number;
        readonly porTipo: Readonly<
          Record<string, { readonly tempos: number; readonly dias: number }>
        >;
      };
    };

function percentual(parte: number, todo: number): number | null {
  return todo > 0 ? Math.round((parte / todo) * 100) : null;
}

function card(cumprido: number, previsto: number | undefined, maximo: LimiteMaximo): CardDeTeto {
  const numeroDoMaximo = typeof maximo === "object" ? maximo.valor : null;
  const alertas: AlertaDeTeto[] = [];
  if (previsto !== undefined && cumprido > previsto) alertas.push("acima_do_previsto");
  if (numeroDoMaximo !== null && cumprido > numeroDoMaximo) alertas.push("acima_do_maximo");
  return {
    cumprido,
    previsto: previsto ?? "nao_definido",
    maximo,
    percentualDoPrevisto: previsto === undefined ? null : percentual(cumprido, previsto),
    percentualDoMaximo: numeroDoMaximo === null ? null : percentual(cumprido, numeroDoMaximo),
    barra:
      numeroDoMaximo === null
        ? null
        : { maximo: numeroDoMaximo, marcadorDoPrevisto: previsto ?? null },
    alertas,
  };
}

export function tetosDaTurma(entrada: EntradaDosTetos): TetosDaTurma {
  if (entrada.ead) return { ead: true };
  const { chd, aec, tad, tr } = entrada.cumprido;

  const cards = Object.fromEntries(
    CATEGORIAS.map((c) => [
      c,
      card(
        entrada.cumprido[c],
        entrada.previstoProens[c],
        limiteMaximo({
          declarado: entrada.limitesDoCurriculo[c],
          chCurricular: entrada.chCurricular,
          percentual: entrada.percentuais[c],
        }),
      ),
    ]),
  ) as Record<Categoria, CardDeTeto>;

  const porTipo: Record<string, { tempos: number; dias: number }> = {};
  for (const p of entrada.diasParados) {
    const atual = porTipo[p.tipo] ?? { tempos: 0, dias: 0 };
    porTipo[p.tipo] = { tempos: atual.tempos + p.tempos, dias: atual.dias + p.dias };
  }

  return {
    ead: false,
    chd,
    aec,
    tad,
    tr,
    cht: chd + aec + tad + tr,
    cards,
    estudoIndividual: {
      cumprido: entrada.cumprido.estudoIndividual,
      referencias: [
        {
          rotulo: "com regime de Estudo Obrigatório",
          percentual: entrada.referenciaEi.comEstudoObrigatorio,
        },
        {
          rotulo: "sem regime de Estudo Obrigatório",
          percentual: entrada.referenciaEi.semEstudoObrigatorio,
        },
      ],
    },
    apoioIndividualizado: { cumprido: entrada.cumprido.apoioIndividualizado },
    diasParados: {
      tempos: entrada.diasParados.reduce((s, p) => s + p.tempos, 0),
      dias: entrada.diasParados.reduce((s, p) => s + p.dias, 0),
      porTipo,
    },
  };
}
