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
 * ⚠️ **SPEC 025 (Bloco 10), ITEM 6** — *"um card por classificação (Regulares, Expeditos, Especiais, Estágios de
 * Qualificação, Aperfeiçoamento Avançado, demais), um card com o TOTAL de cursos e estágios do CIAARA-11, e um card com
 * a quantidade em cada classificação."* (Bernardo Villas Boas, 24/10/2026). Os dois cartões fixos (regulares e
 * estágios) viraram **um por classificação**, mais os **demais** e o **total** — que fecha a parte *"total de cursos"*
 * da `PEND-5a-2` (A-8 da spec 025). *"Turmas ativas"* continua fora.
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

/** Uma classificação: o cartão e a fatia da pizza. Aqui zero é zero de verdade. */
export type ContagemPorClassificacao = {
  readonly classificacao: ClassificacaoDeCurso;
  /** O do Glossário, para a fatia e a legenda (*"Curso Regular"*). */
  readonly rotulo: string;
  /** O plural do cartão (*"Cursos regulares"*). */
  readonly rotuloDoCartao: string;
  readonly total: number;
};

/** O plural de cada classificação, para o título do cartão — o do Glossário no plural, sem inventar palavra. */
const ROTULO_DO_CARTAO: Readonly<Record<ClassificacaoDeCurso, string>> = {
  regular: "Cursos regulares",
  expedito: "Cursos expeditos",
  especial: "Cursos especiais",
  estagio_qualificacao: "Estágios de qualificação",
  aperfeicoamento_avancado: "Cursos de aperfeiçoamento avançado",
};

/**
 * ⚠️ **QUATRO CHAVES, E A LISTA É FECHADA** (spec 025, A-8): as cinco classificações, os demais, o total e a duração.
 * *"Turmas ativas"* é a parte da `PEND-5a-2` que nenhum pedido trouxe.
 */
export type IndicadoresDoCatalogo = {
  readonly cursosPorClassificacao: readonly ContagemPorClassificacao[];
  /** Os cursos fora das cinco — hoje o banco recusa os outros dois valores do tipo, então zero é o normal. */
  readonly demais: number;
  /** Todos os cursos recebidos: os seis cartões somam ele (SC-006 da spec 025). */
  readonly total: number;
  readonly duracaoEmSemanas: DuracaoEmSemanas;
};

export function indicadoresDoCatalogo(
  cursos: readonly CursoParaIndicador[],
): IndicadoresDoCatalogo {
  /*
   * ⚠️ CLASSIFICAÇÃO FORA DAS CINCO NÃO VIRA GRUPO — vai para *demais* —, e isso não esconde dado: o banco recusa `geral`
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
    rotuloDoCartao: ROTULO_DO_CARTAO[c],
    total: daClasse(c).length,
  }));

  return {
    cursosPorClassificacao,
    demais: cursos.length - classificados.length,
    total: cursos.length,
    duracaoEmSemanas,
  };
}
