/**
 * `RN-DIST-02` — a média semanal de uma atribuição de instrutor, para o alerta de faixa da ficha.
 *
 * > *"A regra de distribuição usa a carga horária semanal cadastrada da matéria quando existir, ou a carga horária
 * > total dividida pelo número de semanas da janela; a **última semana da janela sempre recebe o resto**, de forma
 * > que a soma da distribuição feche exatamente com a carga horária total da matéria — nunca perder nem sobrar tempo
 * > de aula por arredondamento."* — documento 04, `RN-DIST-02`, *Risco: Alto*
 *
 * ⚠️ **A REGRA É APLICADA, NÃO ALTERADA** (FR-013.3 da spec 016; research R-5). Até a M2 da spec 016, a atribuição cuja
 * disciplina não tinha `semanas` cadastradas saía com a média nula, e o alerta de faixa da ficha a pulava
 * (`cargaPorSemana`: média nula não pesa) — mesmo com janela. Agora: a média que a view entrega (a cadastrada) vence;
 * sem ela, a CH dividida pelas semanas da janela efetiva (`mediaSemanalDaJanela`, no módulo da `RN-DIST-01`, com a
 * régua única); sem janela, nulo.
 *
 * ⚠️ **A JANELA É A DA CARGA** (spec 029, Bloco 14, item 4; `FR-004`, D-9 e D-10): desde então a janela que chega
 * aqui é a previsão recortada pelo período da turma (`janelaDaCarga`, em `carga-semanal.ts`), e não mais a previsão
 * crua da view. A precedência não mudou (D-10): a cadastrada vence, mesmo quando a janela vira o período da turma.
 *
 * ⚠️ **ESTE MÓDULO SÓ DECIDE A PRECEDÊNCIA** — a divisão mora em `distribuicao-semanal.ts`, o único lugar autorizado a
 * dividir carga por semanas (guarda `distribuicao-unica.test.ts`).
 *
 * ⚠️ **TypeScript puro** (Princípio II). Datas `aaaa-mm-dd`, nunca `Date`.
 */
import { mediaSemanalDaJanela } from "./distribuicao-semanal";

export type AtribuicaoParaMedia = {
  /** A `media_semanal` da view — a que sai das semanas cadastradas da disciplina. `null` sem elas. */
  readonly mediaCadastrada: number | null;
  /** Os tempos previstos da atribuição (o rateio já aplicado). */
  readonly tempos: number;
  /**
   * A janela da carga da atribuição (`janelaDaCarga`, spec 029, `FR-004`): a previsão da view (linha da turma →
   * disciplina → turma, a ordem da M2 da spec 016) recortada pelo período da turma, ou o período inteiro quando a
   * previsão não o toca. Quem chama recorta; este módulo só divide pelas semanas do que recebe.
   */
  readonly inicio: string | null;
  readonly termino: string | null;
};

/** A média semanal da atribuição: a cadastrada; senão a da janela; senão `null` (`RN-DIST-02`). */
export function mediaSemanalDaAtribuicao(a: AtribuicaoParaMedia): number | null {
  if (a.mediaCadastrada !== null) return a.mediaCadastrada;
  if (a.inicio === null || a.termino === null) return null;
  return mediaSemanalDaJanela({ inicio: a.inicio, termino: a.termino, chTempos: a.tempos });
}
