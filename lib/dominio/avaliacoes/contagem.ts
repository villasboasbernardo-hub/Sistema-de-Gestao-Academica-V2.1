/**
 * O card *"Avaliações — N aplicadas de M previstas no currículo"* da turma (FR-056 da spec 014):
 *
 * > *"N = avaliações (prova e trabalho) com aplicação lançada no DSA. M = soma, por disciplina, da quantidade
 * > prevista: a do currículo; sem ela, a arbitrada; sem nenhuma, a disciplina fica «não definido» e o card diz
 * > quantas, sem esconder o total. Vista não conta em N nem em M: indicador separado «vistas realizadas A de B».
 * > Substituída e cancelada ficam fora. A OD não entra em N nem em M (Q-17): «+ K avaliações contínuas (OD)».
 * > O TA de comentários da OD, quando o currículo o dá, entra em «vistas realizadas»."*
 *
 * ⚠️ **A SITUAÇÃO CHEGA PRONTA**, calculada por `situacaoDaAvaliacao` — o único lugar que a decide (R-8).
 * Aplicada = concluída, em andamento ou atrasada; `null` (substituída ou cancelada) fica fora de tudo.
 * ⚠️ TypeScript puro (Princípio II).
 */

import type { NaturezaDaAvaliacao, SituacaoDaAvaliacao } from "./situacao";

export type DisciplinaParaContagem = {
  id: string;
  /** Prova e trabalho previstos no currículo (OD fora). `null` = o currículo não dá a quantidade. */
  quantidadeCurriculo: number | null;
  /** Quantidade arbitrada pela Divisão (D-CUR-2). */
  quantidadeArbitrada: number | null;
  /** OD previstas no currículo. */
  quantidadeOd: number;
  /** Vistas previstas: itens de prova e trabalho com tempo de vista + OD com TA de comentários. */
  vistasPrevistas: number;
  /** Vistas realizadas: sessões de vista lançadas + comentários de OD lançados. */
  vistasRealizadas: number;
};

export type AvaliacaoParaContagem = {
  disciplinaId: string;
  natureza: NaturezaDaAvaliacao;
  situacao: SituacaoDaAvaliacao | null;
};

export type ContagemDeAvaliacoes = {
  aplicadas: number;
  previstas: number;
  /** Disciplinas sem quantidade do currículo nem arbitrada. */
  disciplinasNaoDefinidas: number;
  /** Disciplinas cujo M vem do arbitrado (marcado no card). */
  disciplinasArbitradas: number;
  od: number;
  vistasRealizadas: number;
  vistasPrevistas: number;
};

const APLICADA = new Set<SituacaoDaAvaliacao>(["concluida", "em_andamento", "atrasada"]);

export function contagemDeAvaliacoes(entrada: {
  disciplinas: readonly DisciplinaParaContagem[];
  avaliacoes: readonly AvaliacaoParaContagem[];
}): ContagemDeAvaliacoes {
  let previstas = 0;
  let naoDefinidas = 0;
  let arbitradas = 0;
  for (const d of entrada.disciplinas) {
    if (d.quantidadeCurriculo !== null) previstas += d.quantidadeCurriculo;
    else if (d.quantidadeArbitrada !== null) {
      previstas += d.quantidadeArbitrada;
      arbitradas += 1;
    } else naoDefinidas += 1;
  }
  const aplicadas = entrada.avaliacoes.filter(
    (a) => a.natureza !== "od" && a.situacao !== null && APLICADA.has(a.situacao),
  ).length;
  return {
    aplicadas,
    previstas,
    disciplinasNaoDefinidas: naoDefinidas,
    disciplinasArbitradas: arbitradas,
    od: entrada.disciplinas.reduce((s, d) => s + d.quantidadeOd, 0),
    vistasRealizadas: entrada.disciplinas.reduce((s, d) => s + d.vistasRealizadas, 0),
    vistasPrevistas: entrada.disciplinas.reduce((s, d) => s + d.vistasPrevistas, 0),
  };
}
