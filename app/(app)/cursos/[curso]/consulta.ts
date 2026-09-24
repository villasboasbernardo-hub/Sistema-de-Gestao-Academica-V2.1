/**
 * A leitura da página do curso — **sem I/O, testável sem banco** (`FR-006`, `FR-012`, `FR-031.4`).
 *
 * ⚠️ **A LEITURA É `Promise.all` DE CONSULTAS INDEPENDENTES, NUNCA UMA POR TURMA** (`FR-012`). Este
 * módulo entrega as colunas e as decisões; quem dispara é a página, numa rodada só. Uma consulta por
 * turma num curso de duas turmas custa pouco e não se nota — e no dia em que um curso tiver doze, a
 * tela fica lenta sem que nada tenha mudado.
 *
 * ⚠️ **`?turma=` QUE NÃO SERVE DEGRADA COM AVISO, NUNCA EM SILÊNCIO.** Quem colou um link precisa
 * saber que está vendo outra turma; sem o aviso, ele lê a tela como se fosse a que pediu — e é o
 * mesmo defeito do estado vazio que não distingue "não há" de "você não vê".
 *
 * ⚠️ **O `?turma=` NÃO É DECODIFICADO AQUI** — ele chega pronto do `searchParams`. Decodificar
 * parâmetro de consulta à mão é o defeito que `tests/unidade/sem-decode-manual.test.ts` proíbe.
 */
import { preSelecionarTurma, type TurmaParaSelecao } from "@/lib/dominio/pre-selecao-de-turma";

/**
 * As colunas do curso que a página consome.
 *
 * ⚠️ NUNCA `select *` — coluna nova do schema apareceria na tela sem que ninguém tivesse decidido
 * mostrá-la, e a primeira notícia seria a tela.
 */
export const COLUNAS_DA_PAGINA_DO_CURSO =
  "id, codigo, nome_curso, classificacao, modalidade, proposito, duracao_dias, duracao_semanas, limite_turmas_ano, status";

/** As colunas das turmas do curso — a lista da aba Grade e a base dos avisos de cada uma. */
export const COLUNAS_DAS_TURMAS_DO_CURSO =
  "id, codigo, turma, ano_letivo, status, modalidade, data_inicio, data_termino, sala_alocada, alunos";

export type TurmaSelecionada = {
  /** O código da turma a mostrar, ou `null` quando a página abre sem seleção. */
  readonly codigo: string | null;
  /** O que dizer a quem pediu uma turma que não serve. `null` quando não há o que avisar. */
  readonly aviso: string | null;
};

/**
 * Resolve qual turma a página mostra.
 *
 * ⚠️ **`?turma=` EXPLÍCITO NUNCA É SOBRESCRITO PELA PRÉ-SELEÇÃO**, nem quando a turma pedida está
 * `cancelada`: o veto do `FR-006.1` é da **pré-seleção**, não da escolha de quem navegou até ali. Um
 * link para uma turma cancelada é um link legítimo — ela existe e é consultável.
 */
export function resolverTurmaSelecionada(
  turmas: readonly TurmaParaSelecao[],
  pedida: string,
  hoje: string,
): TurmaSelecionada {
  const preSelecionada = preSelecionarTurma(turmas, hoje);

  /*
   * ⚠️ **O `?turma=` CHEGA JÁ DECODIFICADO, e decodificá-lo de novo era defeito.** Ele vem do
   * `searchParams` do Next, que é `URLSearchParams`: o `+` já virou espaço e o `%20` também. Até
   * 23/09/2026 esta função chamava `codigoDaTurmaNoSegmento` aqui — inofensivo para os 28 códigos de
   * hoje e **destrutivo** para qualquer código que venha a conter `%`, que viraria sequência de
   * escape. Aquela função é do **caminho**, não da consulta.
   */
  const codigo = pedida.trim();
  if (codigo === "") return { codigo: preSelecionada, aviso: null };
  if (turmas.some((t) => t.codigo === codigo)) return { codigo, aviso: null };

  /*
   * ⚠️ O AVISO EXISTE MESMO SEM PARA ONDE DEGRADAR. Num curso sem turma, calar aqui tornaria o link
   * errado indistinguível de um curso que de fato não tem turma nenhuma.
   */
  return {
    codigo: preSelecionada,
    aviso:
      `A turma ${codigo} não é deste curso, ou não existe mais. ` +
      (preSelecionada === null
        ? "Este curso não tem turma para mostrar."
        : `Mostrando ${preSelecionada}.`),
  };
}

/**
 * A mensagem de curso não encontrado — **pelo perfil** (`FR-031.4`).
 *
 * ⚠️ **PARA QUEM TEM RECORTE, "NÃO EXISTE" SERIA AFIRMAÇÃO SOBRE O QUE ELE NÃO PODE VER.** O curso
 * pode existir e estar fora do alcance dele, e a RLS não diz qual dos dois é. A frase do recorte
 * carrega as duas possibilidades; a do alcance total, só uma — porque ali as duas coincidem.
 *
 * ⚠️ E NENHUMA DAS DUAS REVELA DADO: a que fala em alcance não confirma que o curso existe.
 */
export function mensagemDeCursoNaoEncontrado(
  sigla: string,
  alcance: "todos" | "recortado",
): string {
  return alcance === "recortado"
    ? `Curso ${sigla} não encontrado, ou fora do seu alcance.`
    : `Curso ${sigla} não encontrado.`;
}
