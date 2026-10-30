/**
 * O **acompanhamento das avaliações** na página do DSA — a aba *Avaliações* (Bloco 16, spec 031, `FR-009`, D-16).
 *
 * > *"Ao lado: aba 'Avaliações' (acompanhamento das avaliações da turma no mesmo estilo: situação, semana
 * > prevista/lançada/aplicada, TA)"* — Bernardo Villas Boas, 30/10/2026
 *
 * ⚠️ **NADA DE SITUAÇÃO CALCULADA AQUI**: ela chega pronta do quadro de avaliações da turma (`quadroDeAvaliacoesDaTurma`,
 *    `RN-AVAL-01`), montado com a referência no fim da semana mostrada — o mesmo corte do acompanhamento das disciplinas.
 * ⚠️ **AS TRÊS SEMANAS SÃO A SEMANA DO CURSO** (D-COR-1), pela `semanaDoCurso`:
 *    · **prevista** — a do término previsto da disciplina (a janela da carga; a prova fecha a disciplina) — D-16;
 *    · **lançada** — a da data lançada no DSA;
 *    · **aplicada** — a lançada, quando a data já chegou (até a referência). Sem data, nenhuma das duas.
 *    Data fora do curso (antes do início, depois do término) fica vazia — nunca um número inventado.
 * ⚠️ **TA** é o tempo da avaliação do currículo (o arbitrado da turma, se houver, já vem no `tempo`); a lançada sem item
 *    não tem tempo de currículo.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import type { SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

import { semanaDoCurso, type JanelaDaSemanaDoCurso } from "./semana-do-curso";

/** Uma avaliação do currículo da disciplina, como o quadro a entrega. */
export type ItemParaOAcompanhamento = {
  readonly rotulo: string;
  readonly situacao: SituacaoDaAvaliacao | null;
  /** A data da aplicação lançada (`AAAA-MM-DD`), ou nula. */
  readonly aplicacao: string | null;
  readonly tempo: number | null;
};

/** Uma avaliação lançada sem item do currículo. */
export type SemItemParaOAcompanhamento = {
  readonly tipo: string;
  readonly situacao: SituacaoDaAvaliacao | null;
  readonly aplicacao: string | null;
};

export type DisciplinaParaOAcompanhamento = {
  readonly id: string;
  readonly cod: string;
  readonly nome: string;
  /** O término previsto da disciplina na turma (a janela da carga), ou nulo. */
  readonly terminoPrevisto: string | null;
  readonly itens: readonly ItemParaOAcompanhamento[];
  readonly semItem: readonly SemItemParaOAcompanhamento[];
};

export type LinhaDoAcompanhamentoDeAvaliacoes = {
  readonly chave: string;
  readonly disciplina: string;
  readonly nomeDaDisciplina: string;
  readonly avaliacao: string;
  readonly situacao: SituacaoDaAvaliacao | null;
  readonly semanaPrevista: number | null;
  readonly semanaLancada: number | null;
  readonly semanaAplicada: number | null;
  readonly ta: number | null;
};

/** O número da semana do curso de uma data, ou nulo (sem data, ou fora do curso). */
function numeroDaSemana(data: string | null, janela: JanelaDaSemanaDoCurso): number | null {
  if (data === null) return null;
  const iso = semanaIsoDe(data);
  if (iso === null) return null;
  return semanaDoCurso({ ...janela, semana: { ano: iso.ano, numero: iso.numero } }).numero;
}

/** As linhas da aba *Avaliações*, em ordem natural da disciplina e, dentro dela, na ordem do quadro. */
export function linhasDoAcompanhamentoDeAvaliacoes(entrada: {
  readonly janela: JanelaDaSemanaDoCurso;
  /** O último dia da semana mostrada (`AAAA-MM-DD`) — o corte do «aplicada». */
  readonly referencia: string;
  readonly disciplinas: readonly DisciplinaParaOAcompanhamento[];
}): readonly LinhaDoAcompanhamentoDeAvaliacoes[] {
  const { janela, referencia } = entrada;
  const semanas = (aplicacao: string | null) => {
    const lancada = numeroDaSemana(aplicacao, janela);
    return {
      semanaLancada: lancada,
      semanaAplicada: aplicacao !== null && aplicacao <= referencia ? lancada : null,
    };
  };
  return emOrdemNaturalDoCodigo(entrada.disciplinas, (d) => d.cod).flatMap((d) => {
    const prevista = numeroDaSemana(d.terminoPrevisto, janela);
    const comum = { disciplina: d.cod, nomeDaDisciplina: d.nome, semanaPrevista: prevista };
    return [
      ...d.itens.map((i, n) => ({
        chave: `${d.id}-item-${n}`,
        ...comum,
        avaliacao: i.rotulo,
        situacao: i.situacao,
        ...semanas(i.aplicacao),
        ta: i.tempo,
      })),
      ...d.semItem.map((a, n) => ({
        chave: `${d.id}-sem-item-${n}`,
        ...comum,
        avaliacao: `${a.tipo} (sem item do currículo)`,
        situacao: a.situacao,
        ...semanas(a.aplicacao),
        ta: null,
      })),
    ];
  });
}
