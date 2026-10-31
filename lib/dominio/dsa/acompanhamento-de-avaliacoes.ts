/**
 * O **acompanhamento das avaliações** na página do DSA — a aba *Avaliações* (Bloco 16, spec 031, `FR-009`; colunas do
 * ajuste D da conferência de 31/10/2026).
 *
 * > *"ABA AVALIAÇÕES do DSA: colunas Avaliação · Situação · Data de aplicação · Data da vista (sair as semanas). Ícone
 * > Editar por linha (diálogo) (…)"* — Bernardo Villas Boas, 31/10/2026
 *
 * ⚠️ **NADA É CALCULADO AQUI**: a situação e as datas chegam prontas do quadro de avaliações da turma
 *    (`quadroDeAvaliacoesDaTurma`, `RN-AVAL-01`), já com o ajuste manual mais recente aplicado (`comAjustes`) — o mesmo
 *    quadro da aba Avaliações da ficha da turma. Aqui só se ordena e se diz qual é o ALVO do ajuste de cada linha: o item
 *    do currículo, ou a avaliação lançada sem item.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import type { AjusteNoHistorico } from "@/lib/dominio/avaliacoes/quadro-da-turma";
import type { SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

type Comum = {
  readonly situacao: SituacaoDaAvaliacao | null;
  readonly aplicacao: string | null;
  readonly vista: string | null;
  readonly historico?: readonly AjusteNoHistorico[] | undefined;
};

/** Uma avaliação do currículo da disciplina, como o quadro a entrega. */
export type ItemParaOAcompanhamento = Comum & {
  readonly itemId: string;
  readonly rotulo: string;
};

/** Uma avaliação lançada sem item do currículo. */
export type SemItemParaOAcompanhamento = Comum & {
  readonly id: string;
  readonly tipo: string;
};

export type DisciplinaParaOAcompanhamento = {
  readonly id: string;
  readonly cod: string;
  readonly nome: string;
  readonly itens: readonly ItemParaOAcompanhamento[];
  readonly semItem: readonly SemItemParaOAcompanhamento[];
};

/** O alvo do ajuste da linha — um dos dois, nunca os dois (`ajustes_de_avaliacao_um_alvo`). */
export type AlvoDoAjuste = {
  readonly avaliacaoCurriculoId: string | null;
  readonly avaliacaoId: string | null;
};

export type LinhaDoAcompanhamentoDeAvaliacoes = {
  readonly chave: string;
  readonly disciplina: string;
  readonly nomeDaDisciplina: string;
  readonly avaliacao: string;
  readonly situacao: SituacaoDaAvaliacao | null;
  readonly aplicacao: string | null;
  readonly vista: string | null;
  readonly alvo: AlvoDoAjuste;
  readonly historico: readonly AjusteNoHistorico[];
};

/** As linhas da aba *Avaliações*, em ordem natural da disciplina e, dentro dela, na ordem do quadro. */
export function linhasDoAcompanhamentoDeAvaliacoes(
  disciplinas: readonly DisciplinaParaOAcompanhamento[],
): readonly LinhaDoAcompanhamentoDeAvaliacoes[] {
  return emOrdemNaturalDoCodigo(disciplinas, (d) => d.cod).flatMap((d) => {
    const comum = { disciplina: d.cod, nomeDaDisciplina: d.nome };
    return [
      ...d.itens.map((i) => ({
        chave: `${d.id}-item-${i.itemId}`,
        ...comum,
        avaliacao: i.rotulo,
        situacao: i.situacao,
        aplicacao: i.aplicacao,
        vista: i.vista,
        alvo: { avaliacaoCurriculoId: i.itemId, avaliacaoId: null },
        historico: i.historico ?? [],
      })),
      ...d.semItem.map((a) => ({
        chave: `${d.id}-avaliacao-${a.id}`,
        ...comum,
        avaliacao: `${a.tipo} (sem item do currículo)`,
        situacao: a.situacao,
        aplicacao: a.aplicacao,
        vista: a.vista,
        alvo: { avaliacaoCurriculoId: null, avaliacaoId: a.id },
        historico: a.historico ?? [],
      })),
    ];
  });
}
