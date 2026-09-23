/**
 * `FR-002` — os indicadores agregados do catálogo de cursos.
 *
 * > *"**Decidido em 17/09/2026 (A-6), lista fechada:** dois indicadores — **cursos regulares** e
 * > **estágios de qualificação** — e dois gráficos de barras — **duração média em dias por
 * > classificação** (a `duracao_dias` não tem nulo; a `duracao_semanas` tem 12) e **cursos por
 * > classificação**. **Nada mais.** A paridade com o catálogo da v2.0 — **total de cursos** e
 * > **turmas ativas**, e os indicadores de turma (total, ativas, por status, por ano de início) —
 * > **vira pedido separado para fatia posterior**, registrado como `PEND-5a-2` no plano."*
 * > — `FR-002` da spec 009, `RF-CURSOS-02`
 *
 * ⚠️ **ELE CONTA O QUE RECEBE, E NÃO DECIDE O RECORTE.** Quem filtra por situação, classificação e
 * modalidade é a consulta da página; se esta função reaplicasse qualquer filtro, haveria **duas**
 * respostas para "quantos cursos regulares há" — a dos indicadores e a dos cartões —, e elas
 * divergiriam em silêncio no dia em que uma das duas mudasse.
 *
 * ⚠️ **A MÉDIA É EM DIAS POR CAUSA DO DADO, não por preferência.** `duracao_dias` está preenchida em
 * todos os cursos; `duracao_semanas` tem **12** vazias (medido em 16/09/2026). Uma média em semanas
 * seria calculada sobre metade da base **sem que o número dissesse isso** — e é por isso que o
 * resultado carrega `base`: quantos cursos entraram em cada média.
 *
 * ⚠️ **AUSÊNCIA É `null`, NUNCA ZERO** (`RN-DEG-01`). "Nenhum curso nesta classificação" e "a média
 * dá zero dias" são fatos diferentes, e um gráfico que os desenhasse igual mentiria na altura da
 * barra.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
  type ClassificacaoDeCurso,
} from "./classificacoes-de-curso";

/** O mínimo que um curso precisa trazer para entrar nos agregados. */
export type CursoParaIndicador = {
  readonly classificacao: string;
  readonly duracaoDias: number | null;
};

/** Uma barra da duração média. `dias` é `null` quando não houve o que somar. */
export type DuracaoMedia = {
  readonly classificacao: ClassificacaoDeCurso;
  readonly rotulo: string;
  readonly dias: number | null;
  /** Sobre quantos cursos a média foi feita — o que a torna conferível. */
  readonly base: number;
};

/** Uma barra da contagem por classificação. Aqui zero é zero de verdade. */
export type ContagemPorClassificacao = {
  readonly classificacao: ClassificacaoDeCurso;
  readonly rotulo: string;
  readonly total: number;
};

/**
 * ⚠️ **QUATRO CHAVES, E A LISTA É FECHADA.** Acrescentar uma quinta aqui é entregar o que a A-6
 * mandou para a `PEND-5a-2` — decisão de Bernardo, não manutenção.
 */
export type IndicadoresDoCatalogo = {
  readonly cursosRegulares: number;
  readonly estagiosDeQualificacao: number;
  readonly duracaoMediaPorClassificacao: readonly DuracaoMedia[];
  readonly cursosPorClassificacao: readonly ContagemPorClassificacao[];
};

export function indicadoresDoCatalogo(
  cursos: readonly CursoParaIndicador[],
): IndicadoresDoCatalogo {
  /*
   * ⚠️ CLASSIFICAÇÃO FORA DAS CINCO É IGNORADA, e isso não esconde dado: o banco recusa `geral`
   *    (`cursos_classificacao_nao_geral`) e `ead_semipresencial` (`FR-003.1`), que são os dois
   *    únicos outros valores do tipo. O filtro existe para a função não estourar se um dia o tipo
   *    crescer antes de a tela decidir onde o valor novo agrupa.
   */
  const classificados = cursos.filter((c) => ehClassificacaoDeCurso(c.classificacao));

  const daClasse = (c: ClassificacaoDeCurso) =>
    classificados.filter((curso) => curso.classificacao === c);

  const duracaoMediaPorClassificacao: DuracaoMedia[] = CLASSIFICACOES_DE_CURSO.map((c) => {
    const informadas = daClasse(c)
      .map((curso) => curso.duracaoDias)
      .filter((d): d is number => typeof d === "number" && Number.isFinite(d));
    const base = informadas.length;
    return {
      classificacao: c,
      rotulo: ROTULO_DA_CLASSIFICACAO[c],
      dias: base === 0 ? null : Math.round(informadas.reduce((s, d) => s + d, 0) / base),
      base,
    };
  });

  const cursosPorClassificacao: ContagemPorClassificacao[] = CLASSIFICACOES_DE_CURSO.map((c) => ({
    classificacao: c,
    rotulo: ROTULO_DA_CLASSIFICACAO[c],
    total: daClasse(c).length,
  }));

  return {
    cursosRegulares: daClasse("regular").length,
    estagiosDeQualificacao: daClasse("estagio_qualificacao").length,
    duracaoMediaPorClassificacao,
    cursosPorClassificacao,
  };
}
