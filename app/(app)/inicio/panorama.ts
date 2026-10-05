/**
 * O panorama de turmas — **junção e recorte, sem I/O** (`RF-INI-01`, `RF-INI-04`, Princípio IX).
 *
 * ⚠️ ELE NÃO IMPORTA `supabase`, `next` NEM `react`, e vive ao lado da página porque é dela.
 *
 * ⚠️ **O CABEÇALHO ANTERIOR AFIRMAVA QUE «AQUI NÃO HÁ REGRA DE DOMÍNIO, E SIM A ARITMÉTICA DE
 * APRESENTAÇÃO DO PAINEL». ERA FALSO, E A FRASE ERA PARTE DO PROBLEMA** *(corrigido em
 * 04/10/2026)*. O que vivia aqui era o **veredito de atraso** do `RF-INI-01` — regra de negócio
 * implementada na tela, exatamente o que o BRIEF §2 proíbe —, e ele estava **invertido**: `emAtraso`
 * era `previstos − executados < 0`, que dispara no **excesso** e nunca no atraso. Um módulo que
 * declara não ter regra nenhuma é um módulo que ninguém relê quando a regra muda.
 *
 * ⚠️ **AGORA `emAtraso` E `percentual` VÊM DE `lib/dominio/andamento-da-turma.ts`, QUE É O ÚNICO
 * LUGAR ONDE ELES SE CALCULAM** (`SC-006`, guardado por varredura). O que **sobrou** aqui é o que
 * sempre foi desta tela: juntar turma com curso, aplicar o recorte do filtro e ordenar.
 *
 * ⚠️ **A CARGA PREVISTA É A CURRICULAR, E A EXECUTADA É A CHD.** Não são a mesma grandeza por
 * acidente de nome: `chd_executada` já soma aula, extraclasse, avaliação e vista (`RN-EVT-03`), e o
 * Estudo Individual fica **fora** por decisão normativa (`RN-EVT-01`). Trocar por `cht_executada`
 * inflaria o progresso de toda turma que tem AEC, TAD ou TR.
 */

import { andamentoDaTurma, type RegimeDoCurso } from "@/lib/dominio/andamento-da-turma";

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

/**
 * A turma como a tabela a entrega — **o que a view de carga NÃO tem** (`FR-031.2` da spec 012).
 *
 * ⚠️ **`vw_carga_horaria_turma` NÃO TRAZ `data_termino` NEM `modalidade`**, medido em 04/10/2026, e é
 * por isso que o painel antigo não podia calcular capacidade nem que quisesse: os dois insumos do
 * `diasUteis` e da `RN-MAT-04` não chegavam a esta tela.
 */
export type TurmaDoPanorama = {
  readonly id: string;
  readonly data_termino: string | null;
  readonly modalidade: string;
};

/** O regime vigente por curso, de `vw_cursos_regime_vigente` — uma linha por curso. */
export type RegimeDoCursoNoBanco = {
  readonly curso_id: string;
  readonly regime_padrao_tempos: number | null;
  readonly limite_diario_ead_horas: number | null;
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
   * ⚠️ **CAPACIDADE É `dias úteis até o término × TA/dia`, e nada disso era lido aqui até
   * 04/10/2026** — o campo falava de *"saldo de capacidade"* e media `previstos − executados`. Quem
   * decide agora é `andamentoDaTurma`, e é lá que a `RN-EVT-02` e a `RN-MAT-04` moram.
   *
   * ⚠️ TURMA CONCLUÍDA COM EXCESSO NÃO É ATRASO, e turma planejada com zero executado também não.
   * O requisito escreve *"em andamento"*, e ignorar isso encheria o painel de alertas sobre turmas
   * que ninguém pode mais consertar — ruído que ensina a ignorar a região de alertas inteira.
   */
  readonly emAtraso: boolean;
};

/**
 * Junta turma e curso, aplica o recorte e **delega o andamento**. Uma passada, sem consulta por linha.
 *
 * ⚠️ **TURMA SEM LINHA EM `turmas` DEGRADA PARA «SEM TÉRMINO», E NÃO PARA «EM ATRASO»** (`RN-DEG-01`).
 * Se a leitura das turmas falhar, ou se ela recortar mais que a da view de carga, o que falta é o
 * término — e sem término não há capacidade nem veredito. **O lado seguro de errar é não alertar**:
 * alerta falso na região de conformidade ensina a ignorá-la (`RNF-USA-04`).
 */
export function montarPanorama(
  cargas: readonly CargaDaTurma[],
  cursos: readonly CursoDoRecorte[],
  turmas: readonly TurmaDoPanorama[],
  regimes: readonly RegimeDoCursoNoBanco[],
  feriadosDiaInteiro: readonly string[],
  hoje: string,
): readonly TurmaNoPanorama[] {
  const porId = new Map(cursos.map((c) => [c.id, c]));
  const turmaPorId = new Map(turmas.map((t) => [t.id, t]));
  const regimePorCurso = new Map(regimes.map((r) => [r.curso_id, r]));

  return cargas
    .filter((c) => porId.has(c.curso_id))
    .map((c) => {
      const daTabela = turmaPorId.get(c.turma_id);
      const andamento = andamentoDaTurma(
        {
          status: c.status_turma,
          /*
           * ⚠️ **A MODALIDADE É DA TURMA, NUNCA DO CURSO** (`RN-MAT-04`): curso semipresencial tem
           *    turma EAD, e usar a do curso trocaria o TA/dia de todas elas. Sem a linha da turma a
           *    modalidade sai vazia, que não casa com campo nenhum do regime — e a capacidade sai
           *    *"sem dado"*, que é o que a ausência significa.
           */
          modalidade: daTabela?.modalidade ?? "",
          dataTermino: daTabela?.data_termino ?? null,
          prevista: Number(c.chr_curricular ?? 0),
          executada: Number(c.chd_executada ?? 0),
        },
        regimeDoCurso(regimePorCurso.get(c.curso_id)),
        feriadosDiaInteiro,
        hoje,
      );

      return {
        turmaId: c.turma_id,
        turmaCodigo: c.turma_codigo,
        cursoCodigo: c.curso_codigo,
        nomeCurso: c.nome_curso,
        anoLetivo: c.ano_letivo,
        status: c.status_turma,
        prevista: andamento.prevista,
        executada: andamento.executada,
        /*
         * ⚠️ **`restante` PASSOU A SER `max(…, 0)`, COMO A FÓRMULA DA v1.0 SEMPRE FOI.** Ele não é
         *    desenhado em lugar nenhum desta tela (medido em 04/10/2026: nenhum consumidor), e era
         *    justamente **ele**, negativo, que o veredito antigo chamava de atraso.
         */
        restante: andamento.restante,
        /*
         * ⚠️ **`percentual` NULO VIRA `0` AQUI, E A PERDA ESTÁ DECLARADA.** O módulo devolve `null`
         *    quando não há CH prevista (currículo por competências), e a **ficha da turma** diz a
         *    frase certa. Este painel mostra `0%` desde a fatia (c) do Épico 4, e o `FR-031.2` desta
         *    fatia manda **não** mudar coluna nem texto do Início: trocar o `0%` por frase é entrega
         *    de tela, não conserto de veredito. Fica nomeado como dívida do painel.
         */
        percentual: andamento.percentual ?? 0,
        emAtraso: andamento.emAtraso,
      };
    })
    .sort((a, b) => a.cursoCodigo.localeCompare(b.cursoCodigo, "pt-BR", { numeric: true }));
}

/** O regime como o domínio o espera — linha ausente e campos nulos dão o mesmo *"sem dado"*. */
function regimeDoCurso(linha: RegimeDoCursoNoBanco | undefined): RegimeDoCurso {
  return {
    regimePadraoTempos: linha?.regime_padrao_tempos ?? null,
    limiteDiarioEadHoras: linha?.limite_diario_ead_horas ?? null,
  };
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
