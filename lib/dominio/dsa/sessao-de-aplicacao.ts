/**
 * A **sessão de aplicação** — a 2ª, 3ª… sessão da MESMA prova, lançada no DSA (`RN-AV-12`, emenda de 15/10/2026 à
 * spec 014; desenho `desenho-emenda-15-10.md`, opção A, aprovado por Bernardo Villas Boas em 16/10/2026).
 *
 * > *"…qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD) é UMA
 * > prova com N sessões de aplicação, não N provas. O card "N de M" conta 1."*
 * > — `RN-AV-12`, spec 014 §2.4
 *
 * ⚠️ **A SESSÃO NÃO É OUTRA PROVA.** A 1ª sessão continua sendo a própria linha de `avaliacoes` (o fato único da
 *    `RN-AVAL-02`); a 2ª em diante vive em `sessoes_de_aplicacao`, aponta para a avaliação e herda dela o aplicador,
 *    o fiscal e a disciplina. Por isso o «X de Y» do DSA continua contando AVALIAÇÕES, e a sessão nunca entra nele.
 * ⚠️ **O MOLDE É A SESSÃO DE VISTA** (`vistas_de_avaliacao`): o número é o seguinte ao maior ATIVO, calculado no
 *    servidor (duas abas não abrem a mesma sessão), e excluir a sessão a põe `inativo` sem tocar na prova.
 * ⚠️ **QUEM RECUSA PRIMEIRO É A SERVER ACTION, COM ESTA FUNÇÃO** — a prova é desta turma, está viva e foi aplicada
 *    no dia da sessão ou antes. O banco repete a última condição por gatilho (`sessao_antes_da_aplicacao`), e a RLS
 *    decide o alcance; a frase daqui chega antes, e diz o que fazer.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II, imposto por ESLint).
 */
import { STATUS_DE_AVALIACAO_VIVA } from "@/lib/dominio/avaliacao-viva";
import { dataParaLeitura } from "@/lib/formato/data";

/** A 1ª sessão é a própria avaliação: a primeira linha de `sessoes_de_aplicacao` é a 2ª (`CHECK numero >= 2`). */
export const PRIMEIRA_SESSAO_DA_TABELA = 2;

/**
 * O número da sessão que um lançamento novo abre: o seguinte ao maior ATIVO, e nunca menos que 2.
 *
 * ⚠️ **SÓ AS ATIVAS CONTAM** — o índice único `sap_numero_unico` é parcial (`where status = 'ativo'`): a sessão
 *    excluída libera o número dela, como na vista. Contar as inativas abriria buraco na sequência sem motivo.
 */
export function numeroDaProximaSessao(numerosAtivos: readonly number[]): number {
  const maior = numerosAtivos.reduce((m, n) => Math.max(m, n), PRIMEIRA_SESSAO_DA_TABELA - 1);
  return maior + 1;
}

/** Uma prova da turma, como a leitura do DSA a entrega ao formulário. */
export type ProvaParaSessao = {
  readonly id: string;
  readonly disciplinaId: string;
  /** `aaaa-mm-dd` da 1ª aplicação, ou nulo. */
  readonly aplicadaEm: string | null;
  /** Os números das sessões de aplicação ATIVAS (2, 3…). */
  readonly sessoesDeAplicacao: readonly number[];
};

/**
 * As provas que podem receber uma sessão no dia escolhido: as da disciplina, **aplicadas no dia ou antes** — a
 * sessão nunca vem antes da 1ª aplicação —, cada uma com o número da sessão que abriria.
 *
 * ⚠️ **A LISTA JÁ CHEGA SÓ COM AS VIVAS** (a leitura filtra por `STATUS_DE_AVALIACAO_VIVA`); a prova sem data de
 *    aplicação fica fora, porque não há 1ª sessão de onde a 2ª continuar.
 */
export function provasParaSessaoNoDia<T extends ProvaParaSessao>(
  provas: readonly T[],
  filtro: { readonly disciplinaId: string; readonly dia: string },
): readonly (T & { readonly proximaSessao: number })[] {
  return provas
    .filter(
      (p) =>
        p.disciplinaId === filtro.disciplinaId &&
        p.aplicadaEm !== null &&
        p.aplicadaEm <= filtro.dia,
    )
    .map((p) => ({ ...p, proximaSessao: numeroDaProximaSessao(p.sessoesDeAplicacao) }));
}

/** A prova escolhida, como o servidor a leu do banco (`null` quando a RLS não a deixa ver, ou ela não existe). */
export type ProvaLidaParaSessao = {
  readonly turmaId: string;
  readonly status: string;
  readonly dataAvaliacao: string | null;
};

/**
 * A recusa de lançar uma sessão de aplicação, ou `null` quando ela pode ser gravada.
 *
 * ⚠️ **A ORDEM É A DO QUE SE CONSERTA PRIMEIRO:** a prova existe e é desta turma; está viva (cancelada ou
 *    substituída pela planilha não recebe sessão — a view da ocupação nem a mostraria); tem a 1ª aplicação; e a
 *    sessão não vem antes dela.
 */
export function recusaDaSessaoDeAplicacao(entrada: {
  readonly prova: ProvaLidaParaSessao | null;
  readonly turmaId: string;
  readonly dia: string;
}): string | null {
  const { prova } = entrada;
  if (prova === null) return "Não encontrei esta prova: escolha uma prova da turma.";
  if (prova.turmaId !== entrada.turmaId) return "Esta prova não é desta turma.";
  if (!(STATUS_DE_AVALIACAO_VIVA as readonly string[]).includes(prova.status)) {
    return "Esta prova foi cancelada ou substituída: ela não recebe sessão de aplicação.";
  }
  if (prova.dataAvaliacao === null) {
    return "Esta prova ainda não tem a 1ª aplicação lançada: lance-a como avaliação antes da sessão seguinte.";
  }
  if (entrada.dia < prova.dataAvaliacao) {
    return `A sessão de aplicação não pode ser antes da 1ª aplicação da prova (${dataParaLeitura(prova.dataAvaliacao)}).`;
  }
  return null;
}

/**
 * O rótulo da sessão na grade e no papel: o da prova, com a marca da sessão — *"PP 1 · sessão 2"*.
 *
 * ⚠️ **AUSÊNCIA NUNCA VIRA TEXTO** (`SC-013`): sem o rótulo da prova, sai *"Sessão 2 da prova"*; sem número, o
 *    rótulo da prova sozinho — nunca `null` nem `undefined` dentro da frase.
 */
export function rotuloDaSessaoDeAplicacao(entrada: {
  readonly prova: string | null | undefined;
  readonly numero: number | null | undefined;
}): string {
  const prova = (entrada.prova ?? "").trim();
  const numero = entrada.numero;
  if (numero === null || numero === undefined) return prova === "" ? "Sessão de aplicação" : prova;
  return prova === "" ? `Sessão ${numero} da prova` : `${prova} · sessão ${numero}`;
}
