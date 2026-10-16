/**
 * `RN-AV-14` — a prova a mais que o currículo prevê é INFORMAÇÃO, nunca erro (emenda de 15/10/2026 à spec 014).
 *
 * > *"RN-AV-14: prova a mais que o currículo prevê NÃO é erro de planilha; vira alerta informativo na aba Avaliações
 * > da turma ("currículo prevê 1 PP; aplicadas 2")."* — Bernardo Villas Boas, 15/10/2026
 *
 * Por disciplina e por instrumento: quantos itens o currículo prevê e quantas provas daquele instrumento foram
 * APLICADAS na turma. Só sai linha quando as aplicadas passam do previsto.
 *
 * ⚠️ **A PROVA EM N SESSÕES CONTA 1** (`RN-AV-12`): a sessão 2..N não é avaliação (`sessoes_de_aplicacao`), então
 *    nunca chega aqui como outra prova.
 * ⚠️ **O INSTRUMENTO DA PROVA** é o do item ligado ou, sem item, o da própria avaliação (`avaliacoes.instrumento_id`,
 *    A2 do desenho de 15/10/2026). Instrumento desconhecido (o `AV` que nada nomeia, o histórico) NÃO conta: não se
 *    sabe de que instrumento ela é a mais.
 * ⚠️ **A OD FICA FORA** (Q-17): é contínua, não se conta em aplicações.
 * ⚠️ **ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`): a tela mostra a frase sem cor de erro.
 * ⚠️ TypeScript puro (Princípio II): a situação «aplicada» chega pronta, de `situacaoDaAvaliacao`.
 */
import type { NaturezaDaAvaliacao } from "./situacao";

export type AlemDoPrevisto = {
  readonly instrumento: string;
  readonly previstos: number;
  readonly aplicadas: number;
  /** A frase da regra, literal: «currículo prevê 1 PP; aplicadas 2». */
  readonly frase: string;
};

export function alemDoPrevisto(entrada: {
  /** Os itens do currículo DA DISCIPLINA (com o ajuste da turma, se houver). */
  readonly itens: readonly {
    readonly instrumento: string | null;
    readonly natureza: NaturezaDaAvaliacao;
  }[];
  /** As avaliações VIVAS da disciplina na turma, com o instrumento (do item ou da própria) e se já foi aplicada. */
  readonly avaliacoes: readonly {
    readonly instrumento: string | null;
    readonly natureza: NaturezaDaAvaliacao;
    readonly aplicada: boolean;
  }[];
}): AlemDoPrevisto[] {
  const previstos = new Map<string, number>();
  for (const i of entrada.itens) {
    if (i.natureza === "od" || !i.instrumento) continue;
    previstos.set(i.instrumento, (previstos.get(i.instrumento) ?? 0) + 1);
  }
  const aplicadas = new Map<string, number>();
  for (const a of entrada.avaliacoes) {
    if (a.natureza === "od" || !a.instrumento || !a.aplicada) continue;
    aplicadas.set(a.instrumento, (aplicadas.get(a.instrumento) ?? 0) + 1);
  }
  return [...aplicadas.entries()]
    .filter(([instrumento, n]) => n > (previstos.get(instrumento) ?? 0))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([instrumento, n]) => {
      const p = previstos.get(instrumento) ?? 0;
      return {
        instrumento,
        previstos: p,
        aplicadas: n,
        frase: `currículo prevê ${p} ${instrumento}; aplicadas ${n}`,
      };
    });
}
