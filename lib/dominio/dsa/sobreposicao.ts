/**
 * A sobreposição de lançamentos **da mesma turma** no mesmo tempo — **alerta, nunca bloqueio**.
 *
 * > *"DEFEITO: «não consigo editar o total de TA de uma disciplina no dia». (…) Reproduza PELA TELA
 * > (…) e ache onde falha."*
 * > — item 2 do comando de correções do DSA, 08/10/2026
 *
 * ⚠️ **POR QUE ESTE MÓDULO EXISTE, MEDIDO NO REMOTO EM 08/10/2026:** dos **2.096** blocos de aula
 * posicionados, **314** têm, no tempo seguinte do mesmo dia, outro bloco **da mesma disciplina** — a
 * carga das planilhas grava uma linha por UE. "Aumentar o total de TA da disciplina no dia" é, nesses
 * casos, aumentar um bloco **para dentro do vizinho**. A gravação passa (não há restrição de
 * sobreposição no banco), e a grade do modelo v4, que não desenha dois cartões na mesma célula, manda
 * o vizinho para «fora da grade» — e o que a pessoa vê é o outro bloco **sumir**, sem dizer por quê.
 *
 * ⚠️ **AVISO, E NÃO RECUSA** (`RN-DEG-02` no espírito): a grade já sabe exibir a colisão (é para isso
 * que existe a lista «fora da grade»), e recusar seria regra nova de bloqueio que ninguém decidiu. O
 * aviso diz o que vai acontecer **na hora**, que era o que faltava.
 *
 * ⚠️ **SÓ A MESMA TURMA.** Conflito com outra turma (instrutor, fiscal, sala) é a `RN-CONF-01`, em
 * `conflitos.ts`; a atividade global (`turma_id` nulo) não entra — ela vale para todas e não ocupa a
 * grade de nenhuma como cartão desta turma.
 *
 * ⚠️ **TypeScript puro.** As ocupações chegam por parâmetro.
 */
import { dataParaLeitura } from "@/lib/formato/data";

import { seSobrepoem } from "./conflitos";

/** Uma ocupação desta turma, no grão da view `vw_ocupacao_ta`. */
export type OcupacaoDaTurma = {
  readonly fatoId: string;
  readonly data: string;
  readonly taInicial: number;
  /** Último TA ocupado — **inclusive**, como a view calcula. */
  readonly taFinal: number;
};

/** O lançamento que está sendo gravado, já com o lugar que vai ocupar. */
export type PosicaoNova = {
  /** O próprio fato, quando se está editando ou movendo — ele não colide consigo mesmo. */
  readonly fatoId?: string;
  readonly data: string;
  readonly taInicial: number;
  readonly tempos: number;
};

const ocupacao = (data: string, taInicial: number, taFinal: number) => ({
  data,
  taInicial,
  taFinal,
  instrutorId: null,
  fiscalId: null,
  local: null,
});

/** As ocupações da turma que dividem algum tempo com a posição nova. */
export function sobreposicoesNaTurma(
  nova: PosicaoNova,
  ocupacoes: readonly OcupacaoDaTurma[],
): readonly OcupacaoDaTurma[] {
  const fim = nova.taInicial + Math.max(1, nova.tempos) - 1;
  const alvo = ocupacao(nova.data.slice(0, 10), nova.taInicial, fim);
  return ocupacoes.filter(
    (o) =>
      o.fatoId !== nova.fatoId &&
      seSobrepoem(alvo, ocupacao(o.data.slice(0, 10), o.taInicial, o.taFinal)),
  );
}

/**
 * A frase do aviso — ou `null` quando não há colisão.
 *
 * ⚠️ Ela nomeia o **tempo**, porque é por ele que a pessoa acha o outro bloco na grade.
 */
export function avisoDeSobreposicao(
  nova: PosicaoNova,
  ocupacoes: readonly OcupacaoDaTurma[],
): string | null {
  const colididos = sobreposicoesNaTurma(nova, ocupacoes);
  if (colididos.length === 0) return null;
  const fim = nova.taInicial + Math.max(1, nova.tempos) - 1;
  const tempos = new Set<number>();
  for (const o of colididos) {
    for (let ta = Math.max(o.taInicial, nova.taInicial); ta <= Math.min(o.taFinal, fim); ta++) {
      tempos.add(ta);
    }
  }
  const lista = [...tempos].sort((a, b) => a - b).map((t) => `${t}º`);
  const quais = lista.length === 1 ? `o ${lista[0]} tempo` : `os tempos ${lista.join(", ")}`;
  return (
    `Em ${dataParaLeitura(nova.data)}, ${quais} já tinha${lista.length === 1 ? "" : "m"} outro ` +
    `lançamento desta turma. Os dois ficam gravados, e na grade o que não couber sai em «fora da ` +
    `grade», abaixo do dia. Diminua um dos dois se não era isso.`
  );
}
