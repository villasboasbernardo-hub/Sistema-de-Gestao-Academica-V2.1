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
import type { VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import type { Database } from "@/lib/tipos/database";

/** As colunas da turma que a ficha consome. Nunca `select *`. */
export const COLUNAS_DA_FICHA_DA_TURMA =
  "id, codigo, turma, ano_letivo, status, modalidade, data_inicio, data_termino, sala_alocada, alunos, curso_id";

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
