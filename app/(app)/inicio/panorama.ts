/**
 * O panorama de turmas — **regra pura, sem I/O** (`RF-INI-01`, `RF-INI-04`, Princípio IX).
 *
 * ⚠️ ELE NÃO IMPORTA `supabase`, `next` NEM `react`, e vive ao lado da página porque é dela. A regra
 * de pureza do BRIEF fala de `lib/dominio/`; aqui não há regra de **domínio**, e sim a aritmética de
 * apresentação do painel. Colocá-la em `lib/dominio/` daria a ela um peso normativo que ela não tem.
 *
 * ⚠️ **A CARGA PREVISTA É A CURRICULAR, E A EXECUTADA É A CHD.** Não são a mesma grandeza por
 * acidente de nome: `chd_executada` já soma aula, extraclasse, avaliação e vista (`RN-EVT-03`), e o
 * Estudo Individual fica **fora** por decisão normativa (`RN-EVT-01`). Trocar por `cht_executada`
 * inflaria o progresso de toda turma que tem AEC, TAD ou TR.
 */

export type CargaDaTurma = {
  readonly turma_id: string;
  readonly turma_codigo: string;
  readonly curso_id: string;
  readonly curso_codigo: string;
  readonly nome_curso: string;
  readonly ano_letivo: number;
  readonly status_turma: string;
  readonly chr_curricular: number;
  readonly chd_executada: number;
};

export type CursoDoRecorte = {
  readonly id: string;
  readonly codigo: string;
  readonly classificacao: string;
  readonly modalidade: string;
};

export type TurmaNoPanorama = {
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly cursoCodigo: string;
  readonly nomeCurso: string;
  readonly anoLetivo: number;
  readonly status: string;
  readonly prevista: number;
  readonly executada: number;
  readonly restante: number;
  readonly percentual: number;
  /**
   * Em atraso: **em andamento com saldo negativo de capacidade** (`RF-INI-01`).
   *
   * ⚠️ TURMA CONCLUÍDA COM EXCESSO NÃO É ATRASO, e turma planejada com zero executado também não.
   * O requisito escreve *"em andamento"*, e ignorar isso encheria o painel de alertas sobre turmas
   * que ninguém pode mais consertar — ruído que ensina a ignorar a região de alertas inteira.
   */
  readonly emAtraso: boolean;
};

/** Junta turma e curso, aplica o recorte e calcula o progresso. Uma passada, sem consulta por linha. */
export function montarPanorama(
  cargas: readonly CargaDaTurma[],
  cursos: readonly CursoDoRecorte[],
): readonly TurmaNoPanorama[] {
  const porId = new Map(cursos.map((c) => [c.id, c]));

  return cargas
    .filter((c) => porId.has(c.curso_id))
    .map((c) => {
      const prevista = Number(c.chr_curricular ?? 0);
      const executada = Number(c.chd_executada ?? 0);
      const restante = prevista - executada;
      return {
        turmaId: c.turma_id,
        turmaCodigo: c.turma_codigo,
        cursoCodigo: c.curso_codigo,
        nomeCurso: c.nome_curso,
        anoLetivo: c.ano_letivo,
        status: c.status_turma,
        prevista,
        executada,
        restante,
        percentual: prevista > 0 ? Math.round((executada / prevista) * 100) : 0,
        emAtraso: c.status_turma === "ativa" && restante < 0,
      };
    })
    .sort((a, b) => a.cursoCodigo.localeCompare(b.cursoCodigo, "pt-BR", { numeric: true }));
}

/** Os números do topo. Somas, nunca médias de percentual — média de percentual mente. */
export function totaisDo(panorama: readonly TurmaNoPanorama[]) {
  const prevista = panorama.reduce((s, t) => s + t.prevista, 0);
  const executada = panorama.reduce((s, t) => s + t.executada, 0);
  return {
    turmas: panorama.length,
    ativas: panorama.filter((t) => t.status === "ativa").length,
    prevista,
    executada,
    /*
     * ⚠️ O PERCENTUAL VEM DAS SOMAS, e não da média dos percentuais das turmas. Média de percentual
     * dá o mesmo peso a uma turma de 20 horas e a uma de 400 — e o número do topo passa a dizer algo
     * que ninguém consegue reconciliar com as linhas de baixo.
     */
    percentual: prevista > 0 ? Math.round((executada / prevista) * 100) : 0,
    emAtraso: panorama.filter((t) => t.emAtraso).length,
  };
}
