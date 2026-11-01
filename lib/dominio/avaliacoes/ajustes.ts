/**
 * O **ajuste manual** da situação e das datas de uma avaliação da turma (Bloco 16, spec 031, ajuste D de 31/10/2026).
 *
 * > *"Ícone Editar por linha (diálogo): situação (Pendente / Em andamento / Concluída / Cancelada e as que já
 * > existirem), data de aplicação e data da vista, com JUSTIFICATIVA OBRIGATÓRIA (mín. 10 caracteres), gravando autor e
 * > data num histórico visível na linha. (…) A edição manual NÃO muda a CH."* — Bernardo Villas Boas, 31/10/2026
 *
 * ⚠️ **O MAIS RECENTE VALE, E SÓ NA LINHA**: a situação e as datas da linha passam a ser as do último ajuste; os
 *    anteriores ficam como histórico. A contagem do quadro, a projeção e a CH continuam as do lançado (D-19 da spec
 *    031): o ajuste corrige o que a linha diz, não o que foi lançado no DSA.
 * ⚠️ **O PONTO ÚNICO**: a aba Avaliações do DSA e a da ficha da turma leem o quadro por `lerAvaliacoesDaTurma`, que
 *    aplica esta função — as duas mostram a mesma situação ajustada.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import type { AjusteNoHistorico, QuadroDeAvaliacoes } from "./quadro-da-turma";
import type { SituacaoDaAvaliacao } from "./situacao";

export type { AjusteNoHistorico };

/** Uma linha de `ajustes_de_avaliacao`, já traduzida. */
export type AjusteDeAvaliacao = AjusteNoHistorico & {
  /** O item do currículo ajustado — ou nulo, quando o alvo é a avaliação lançada sem item. */
  readonly avaliacaoCurriculoId: string | null;
  readonly avaliacaoId: string | null;
};

/** Os ajustes de um alvo, do mais novo ao mais velho. */
function agrupar(
  ajustes: readonly AjusteDeAvaliacao[],
  chave: (a: AjusteDeAvaliacao) => string | null,
): ReadonlyMap<string, readonly AjusteNoHistorico[]> {
  const grupos = new Map<string, AjusteNoHistorico[]>();
  for (const a of [...ajustes].sort((x, y) => (x.em < y.em ? 1 : x.em > y.em ? -1 : 0))) {
    const k = chave(a);
    if (k === null) continue;
    const lista = grupos.get(k) ?? [];
    lista.push({
      situacao: a.situacao,
      dataAplicacao: a.dataAplicacao,
      dataVista: a.dataVista,
      justificativa: a.justificativa,
      autor: a.autor,
      em: a.em,
    });
    grupos.set(k, lista);
  }
  return grupos;
}

/** O quadro com o ajuste mais recente de cada linha aplicado, e o histórico de cada uma. */
export function comAjustes(
  quadro: QuadroDeAvaliacoes,
  ajustes: readonly AjusteDeAvaliacao[],
): QuadroDeAvaliacoes {
  const porItem = agrupar(ajustes, (a) => a.avaliacaoCurriculoId);
  const porAvaliacao = agrupar(ajustes, (a) =>
    a.avaliacaoCurriculoId === null ? a.avaliacaoId : null,
  );
  const aplicar = <
    T extends {
      situacao: SituacaoDaAvaliacao | null;
      aplicacao: string | null;
      vista: string | null;
    },
  >(
    linha: T,
    historico: readonly AjusteNoHistorico[] | undefined,
  ): T => {
    const ultimo = historico?.[0];
    if (ultimo === undefined) return { ...linha, historico: [] };
    return {
      ...linha,
      situacao: ultimo.situacao,
      aplicacao: ultimo.dataAplicacao,
      vista: ultimo.dataVista,
      historico: historico ?? [],
    };
  };
  return {
    ...quadro,
    disciplinas: quadro.disciplinas.map((d) => ({
      ...d,
      itens: d.itens.map((i) => aplicar(i, porItem.get(i.itemId))),
      semItem: d.semItem.map((a) => aplicar(a, porAvaliacao.get(a.id))),
    })),
  };
}
