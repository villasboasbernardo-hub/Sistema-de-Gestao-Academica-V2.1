/**
 * O limite máximo de AEC, TAD e TR de uma turma — `RN-EVT-01` e `FR-001.1` da spec 014.
 *
 * > *"AEC (Atividades Extraclasse) […] Teto normativo: 10% do somatório das CHD do curso. TAD (Tempo
 * > para Administração) […] Teto normativo: 5% da CHR. TR (Tempo Reserva) […] Teto normativo: 10% da
 * > CHR."* — `RN-EVT-01`, documento 04 da Fase 1
 *
 * > *"O limite máximo de cada categoria é o número que o quadro final do currículo do curso declara;
 * > onde o currículo não declara, vale o percentual da norma sobre a CH curricular."*
 * > — `FR-001.1` da spec 014 (decisão Q-16, 13/10/2026)
 *
 * ⚠️ **O PERCENTUAL CHEGA POR PARÂMETRO, NUNCA ESCRITO AQUI** (regra 8): ele vive em
 *    `config_parametros` (`teto.aec_percentual_chr` etc.), e uma revisão normativa é `UPDATE`.
 * ⚠️ **É O ÚNICO LUGAR QUE DECIDE O MÁXIMO E A ORIGEM** — `vw_conformidade_tetos` entrega só os números
 *    crus, para não haver segunda implementação da regra em SQL.
 * ⚠️ TypeScript puro: sem `next`, `react` nem `supabase` (regra 9).
 */

export type OrigemDoLimite = "curriculo" | "norma";

/** As duas ausências são estados da tela, nunca zero (`RN-DEG-01`). */
export type LimiteMaximo =
  | { readonly valor: number; readonly origem: OrigemDoLimite }
  | "sem_ch_curricular"
  | "parametro_nao_cadastrado";

export type EntradaDoLimite = {
  /** O número do quadro final do currículo, em TA (1 h = 1 TA, A-10). Nulo = o currículo não declara. */
  readonly declarado: number | null | undefined;
  /** Σ CH das disciplinas ativas do curso, em TA. */
  readonly chCurricular: number | null;
  /** O percentual da norma no ano da turma. Nulo = não cadastrado para o ano. */
  readonly percentual: number | null;
};

/** Duas casas, sem erro de ponto flutuante (545 × 5 ÷ 100 = 27,25). */
function duasCasas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function limiteMaximo({
  declarado,
  chCurricular,
  percentual,
}: EntradaDoLimite): LimiteMaximo {
  if (declarado !== null && declarado !== undefined) {
    return { valor: declarado, origem: "curriculo" };
  }
  if (chCurricular === null || chCurricular <= 0) return "sem_ch_curricular";
  if (percentual === null) return "parametro_nao_cadastrado";
  return { valor: duasCasas((chCurricular * percentual) / 100), origem: "norma" };
}
