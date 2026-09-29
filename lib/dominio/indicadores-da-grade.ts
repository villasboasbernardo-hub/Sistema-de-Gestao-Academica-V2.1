/**
 * `FR-053` e `FR-062` — a situação de execução de uma disciplina numa turma, e os indicadores da
 * grade.
 *
 * ⚠️ **A SITUAÇÃO É DERIVADA DA EXECUÇÃO, NUNCA GRAVADA** (regra 8 e *Convenções de banco*: coluna
 * derivada é VIEW ou `GENERATED`, nunca uma segunda fonte de verdade). Não existe
 * `turma_disciplina.situacao`: existe CH prevista, CH cumprida e data. Uma coluna de situação
 * envelheceria em silêncio no dia em que alguém lançasse uma aula e ninguém a recalculasse.
 *
 * ⚠️ **A CH CUMPRIDA NÃO É TOCADA POR NADA DESTA FATIA** (`FR-044`). Ela vem de `registros_aula` por
 * `vw_disciplinas_execucao`; aqui ela só é **lida**.
 *
 * ⚠️ **E O CASO QUE DISCRIMINA É, DE NOVO, A DATA NULA.** *"Atrasada"* é *"passou do término previsto
 * e ainda falta CH"* — com `previsao_termino` nula não há término, e portanto **não há atraso**. As
 * 121 linhas `nao_informado` da base copiada apareceriam todas como atrasadas se a comparação
 * tratasse a ausência como data.
 *
 * Módulo **puro**.
 */

import { diasAte } from "./sinalizacao-de-disciplina";

export type SituacaoDeExecucao = "nao_iniciada" | "em_andamento" | "concluida" | "atrasada";

export type ExecucaoDaDisciplina = {
  /** CH prevista em TA. */
  readonly previstos: number;
  /** CH já cumprida em TA, lida de `vw_disciplinas_execucao`. */
  readonly executados: number;
  /** `previsao_termino`, em `YYYY-MM-DD`. `null` = não informado. */
  readonly previsaoTermino: string | null;
};

/**
 * A situação de uma disciplina numa turma.
 *
 * ⚠️ **A ORDEM DOS TESTES IMPORTA, e é a do `FR-053`:** concluída primeiro, atrasada depois. Uma
 * disciplina cuja CH fechou **não é atrasada**, mesmo que o término previsto já tenha passado — ela
 * terminou fora do prazo, e o que interessa a quem olha a grade é que **não falta nada a fazer**.
 * Inverter os dois ramos encheria a tela de "atrasada" para disciplinas concluídas.
 */
export function situacaoDaExecucao(
  execucao: ExecucaoDaDisciplina,
  hoje: string,
): SituacaoDeExecucao {
  const saldo = execucao.previstos - execucao.executados;

  if (saldo <= 0) return "concluida";

  if (execucao.previsaoTermino !== null && diasAte(execucao.previsaoTermino, hoje) < 0) {
    return "atrasada";
  }

  return execucao.executados > 0 ? "em_andamento" : "nao_iniciada";
}

export const ROTULO_DA_SITUACAO: Readonly<Record<SituacaoDeExecucao, string>> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

export type IndicadoresDaGrade = {
  readonly disciplinas: number;
  readonly semInstrutor: number;
  readonly chPrevistaTempos: number;
  readonly chCumpridaTempos: number;
  /** Quantas em cada situação — a soma fecha com `disciplinas`. */
  readonly porSituacao: Readonly<Record<SituacaoDeExecucao, number>>;
};

export type LinhaDaGrade = ExecucaoDaDisciplina & {
  readonly instrutoresAtribuidos: number;
};

/**
 * Os quatro indicadores do topo da grade (`FR-053`).
 *
 * ⚠️ **ELES SOMAM O QUE ESTÁ NA TABELA, e é isso que o `SC-011` cobra**: aplicado um filtro, tabela,
 * indicadores e gráfico têm de refletir **o mesmo subconjunto**. Por isso a função recebe as linhas
 * já filtradas em vez de buscar contagem à parte — uma segunda consulta divergiria do que está à
 * vista, e a divergência seria invisível.
 */
export function indicadoresDaGrade(
  linhas: readonly LinhaDaGrade[],
  hoje: string,
): IndicadoresDaGrade {
  const porSituacao: Record<SituacaoDeExecucao, number> = {
    nao_iniciada: 0,
    em_andamento: 0,
    concluida: 0,
    atrasada: 0,
  };

  let chPrevistaTempos = 0;
  let chCumpridaTempos = 0;
  let semInstrutor = 0;

  for (const linha of linhas) {
    chPrevistaTempos += linha.previstos;
    chCumpridaTempos += linha.executados;
    if (linha.instrutoresAtribuidos === 0) semInstrutor += 1;
    porSituacao[situacaoDaExecucao(linha, hoje)] += 1;
  }

  return {
    disciplinas: linhas.length,
    semInstrutor,
    chPrevistaTempos,
    chCumpridaTempos,
    porSituacao,
  };
}
