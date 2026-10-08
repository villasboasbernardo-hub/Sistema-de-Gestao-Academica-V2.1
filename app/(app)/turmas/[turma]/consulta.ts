/**
 * A leitura da ficha da turma — **sem I/O, testável sem banco** (`FR-031`, `FR-031.4`, `FR-030`).
 *
 * ⚠️ **O SEGMENTO É DECODIFICADO PELA FUNÇÃO ÚNICA, E UMA VEZ SÓ** (`FR-031.2`). O código da turma tem
 * espaços; decodificar duas vezes é destrutivo para qualquer código que venha a conter `%`.
 *
 * ⚠️ **A MENSAGEM DE "NÃO ENCONTRADA" DEPENDE DO PERFIL** (`FR-031.4`), pelo mesmo motivo do curso:
 * para quem tem recorte, a turma pode existir e estar fora do alcance, e a RLS não diz qual dos dois
 * é. Dizer "não existe" a quem só não alcança é afirmar sobre o que não foi medido.
 *
 * ⚠️ **A RPC DE PROTEÇÃO SÓ É LIDA PARA QUEM PODE EDITAR** (`FR-021.8`). Ela tem porteiro próprio —
 * devolve vazio a quem não tem `turmas.editar` —, e chamá-la para quem só consulta seria uma ida ao
 * banco por requisição que nunca muda nada na tela.
 */
import type { RegimeDoCurso } from "@/lib/dominio/andamento-da-turma";
import type { VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import type { Database } from "@/lib/tipos/database";

/** As colunas da turma que a ficha consome. Nunca `select *`. */
export const COLUNAS_DA_FICHA_DA_TURMA =
  "id, codigo, turma, ano_letivo, status, modalidade, data_inicio, data_termino, sala_alocada, alunos, curso_id, inicio_etapa_presencial, termino_etapa_presencial";

/** O código gravado, a partir do que a rota entregou. */
export function codigoDaFicha(segmento: string): string {
  return codigoDaTurmaNoSegmento(segmento);
}

/**
 * A mensagem de turma não encontrada — **pelo perfil**.
 *
 * ⚠️ NENHUMA DAS DUAS REVELA DADO: a que fala em alcance não confirma que a turma existe.
 */
export function mensagemDeTurmaNaoEncontrada(
  codigo: string,
  alcance: "todos" | "recortado",
): string {
  return alcance === "recortado"
    ? `Turma ${codigo} não encontrada, ou fora do seu alcance.`
    : `Turma ${codigo} não encontrada.`;
}

/**
 * A RPC de proteção deve ser lida?
 *
 * ⚠️ **SÓ PARA QUEM PODE EDITAR.** Quem consulta não vai mudar janela nenhuma, e o aviso do
 * `FR-021.8` só existe no momento de salvar.
 */
export function deveLerProtecao(podeEditar: boolean): boolean {
  return podeEditar;
}

/** Uma linha de `protecao_das_vigencias_por_atividade_global`, como o banco a emite. */
export type LinhaDeProtecao =
  Database["public"]["Functions"]["protecao_das_vigencias_por_atividade_global"]["Returns"][number];

/**
 * A tradução das linhas da RPC para o vocabulário do domínio.
 *
 * ⚠️ **ELA EXISTE PORQUE SÃO DUAS TELAS** — a ficha e a de nova turma —, e duas cópias do mesmo
 * `snake_case → camelCase` divergiriam na primeira coluna que o banco acrescentar.
 *
 * ⚠️ **`turmas` NÃO ATRAVESSA.** A RPC devolve quais turmas travam cada vigência **hoje**; quem
 * responde *"e se"* é `vigenciasQuePerdemProtecao`, com as janelas do curso. Passar as duas fontes
 * ao domínio seria deixá-lo escolher entre um retrato e uma hipótese.
 */
export function protecoesDoBanco(linhas: readonly LinhaDeProtecao[]): VigenciaProtegida[] {
  return linhas.map((linha) => ({
    vigencia: linha.vigencia,
    vigenteDe: linha.vigente_de,
    travadaPorLancamentoProprio: linha.travada_por_lancamento_proprio,
    atividade: linha.atividade,
    dataAtividade: linha.data_atividade,
  }));
}

/*
 * ⚠️ **O ANDAMENTO (PR 3) ACRESCENTA TRÊS LEITURAS, E NENHUMA DELAS INVENTA PARÂMETRO.** A capacidade
 *    diária sai do **regime vigente do curso** (`vw_cursos_regime_vigente`), que já alimenta o
 *    cabeçalho da página do curso desde a fatia (a) do Épico 5; a CH executada sai de
 *    `vw_carga_horaria_turma`, a mesma view que o `/inicio` lê; e os feriados saem de `feriados`.
 *    **Nada aqui é TA/dia novo** (restrição de Bernardo, 04/10/2026).
 */

/**
 * As colunas de `vw_carga_horaria_turma` que o Andamento consome.
 *
 * ⚠️ **`chd_executada` É LANÇAMENTO, NUNCA PLANEJAMENTO** (`RN-CRONOS-01`): a view soma
 * `registros_aula.tempos_consumidos` com `status = 'ativo'` e as avaliações. A regra é honrada
 * **antes** do módulo puro, que só recebe o número.
 */
export const COLUNAS_DA_CARGA_DA_TURMA = "chr_curricular, chd_executada";

/**
 * As colunas de `vw_cursos_regime_vigente` de que a capacidade diária depende.
 *
 * ⚠️ **SÃO DUAS PORQUE A ESCOLHA É DA MODALIDADE DA TURMA** (`RN-MAT-04`): a mesma linha de curso
 * serve turma presencial e turma EAD, e quem decide qual campo vale é `capacidadeDiaria`. Pedir só
 * uma delas aqui seria mover a regra para a consulta.
 */
export const COLUNAS_DO_REGIME_DO_CURSO = "regime_padrao_tempos, limite_diario_ead_horas";

/**
 * Os feriados devem ser lidos?
 *
 * ⚠️ **SÓ COM DATA DE TÉRMINO.** Sem ela não há intervalo `[hoje, término]`, e a capacidade sai
 * `sem_termino` sem olhar feriado nenhum — a consulta seria uma ida ao banco cujo resultado o
 * domínio descarta (`FR-012`). É o mesmo critério de `deveLerProtecao`.
 */
export function deveLerFeriados(dataTermino: string | null): boolean {
  return dataTermino !== null && dataTermino !== "";
}

/**
 * O regime do curso como o domínio o espera.
 *
 * ⚠️ **LINHA AUSENTE E LINHA COM OS DOIS CAMPOS NULOS DÃO O MESMO RESULTADO, e isso é o desenho.**
 * `vw_cursos_regime_vigente` resolve a vigência por `LEFT JOIN LATERAL`: curso **sem** vigência
 * corrente devolve a linha com todos os campos de regime nulos, e curso fora do alcance não devolve
 * linha. Os dois chegam ao domínio como *"sem dado"* (`RN-DEG-01`), que é a frase que a tela diz.
 */
export function regimeDoBanco(
  linha: { regime_padrao_tempos: number | null; limite_diario_ead_horas: number | null } | null,
): RegimeDoCurso {
  return {
    regimePadraoTempos: linha?.regime_padrao_tempos ?? null,
    limiteDiarioEadHoras: linha?.limite_diario_ead_horas ?? null,
  };
}

/**
 * As datas dos feriados que descontam capacidade.
 *
 * ⚠️ **QUEM FILTRA O IMPACTO É A CONSULTA, E A LISTA QUE CHEGA AQUI JÁ É SÓ DE DIA INTEIRO**
 * (`RN-EVT-02`). Esta função não decide impacto: ela só tira a coluna da linha. Decidir aqui seria
 * ter a regra em dois lugares.
 *
 * ⚠️ **DATA REPETIDA NÃO É PROBLEMA DAQUI:** dois feriados no mesmo dia (nacional e local, por
 * exemplo) chegam como duas linhas, e quem conta uma vez só é `diasUteisEntre`, com um `Set`.
 */
export function datasDeFeriado(linhas: readonly { data: string }[]): string[] {
  return linhas.map((l) => l.data);
}
