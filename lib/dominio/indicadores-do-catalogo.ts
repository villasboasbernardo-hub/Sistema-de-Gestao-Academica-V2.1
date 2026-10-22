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
 * ⚠️ **SPEC 022 (Bloco 7), ITEM 10** — *"Cursos: estatísticas no mesmo componente/estilo das de Instrutores — cursos
 * por classificação e duração em semanas de cada curso/estágio; remova o de duração média por classificação."*
 * (Bernardo Villas Boas, 22/10/2026). A **duração média em dias por classificação SAIU**; no lugar, a duração em
 * **semanas de cada curso**, do currículo vigente (spec 021, RC-1). Continua sendo um dos quatro itens da lista
 * fechada da A-6 — trocado, não acrescentado.
 *
 * ⚠️ **AUSÊNCIA NÃO É ZERO** (`RN-DEG-01`). O curso sem a duração em semanas não vira barra no chão — que se leria
 * como "dura zero semanas" —: ele sai do gráfico e é **nomeado** em `semInformacao`.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
  type ClassificacaoDeCurso,
} from "./classificacoes-de-curso";
import { emOrdemDeCurso } from "./ordem-de-cursos";

/** O mínimo que um curso precisa trazer para entrar nos agregados. */
export type CursoParaIndicador = {
  readonly codigo: string;
  readonly classificacao: string;
  /** Do currículo vigente (spec 021, RC-1); `null` quando não informada. */
  readonly duracaoSemanas: number | null;
};

/** A duração em semanas de cada curso — as barras — e os cursos sem ela, nomeados (spec 022, item 10). */
export type DuracaoEmSemanas = {
  readonly porCurso: readonly { readonly codigo: string; readonly semanas: number }[];
  readonly semInformacao: readonly string[];
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
  readonly duracaoEmSemanas: DuracaoEmSemanas;
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

  // A ordem única do sistema (spec 022, item 3): classificação, depois a sigla.
  const emOrdem = emOrdemDeCurso(classificados);
  const informada = (s: number | null): s is number =>
    typeof s === "number" && Number.isFinite(s) && s > 0;
  const duracaoEmSemanas: DuracaoEmSemanas = {
    porCurso: emOrdem
      .filter((c) => informada(c.duracaoSemanas))
      .map((c) => ({ codigo: c.codigo, semanas: c.duracaoSemanas as number })),
    semInformacao: emOrdem.filter((c) => !informada(c.duracaoSemanas)).map((c) => c.codigo),
  };

  const cursosPorClassificacao: ContagemPorClassificacao[] = CLASSIFICACOES_DE_CURSO.map((c) => ({
    classificacao: c,
    rotulo: ROTULO_DA_CLASSIFICACAO[c],
    total: daClasse(c).length,
  }));

  return {
    cursosRegulares: daClasse("regular").length,
    estagiosDeQualificacao: daClasse("estagio_qualificacao").length,
    duracaoEmSemanas,
    cursosPorClassificacao,
  };
}
