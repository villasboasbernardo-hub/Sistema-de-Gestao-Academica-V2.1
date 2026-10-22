/**
 * `FR-003` da spec 022 (Bloco 7) — **a ordem única de cursos e turmas**, para toda lista, cartão e submenu.
 *
 * > *"Ordem por CLASSIFICAÇÃO em cursos e turmas (listas, cartões, submenu): Regulares → Expeditos → Especiais →
 * > Estágios de Qualificação → Aperfeiçoamento Avançado → as demais; dentro, pela sigla; turmas pela ordem do curso e
 * > depois o ano. Função única em lib/dominio/."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **A ORDEM DAS CLASSIFICAÇÕES MUDOU** (A-4 da spec 022, emenda ao `FR-003` da spec 009): Estágio de Qualificação
 *    passou a vir **antes** de Aperfeiçoamento Avançado. As "demais" são os dois valores do tipo que não são curso
 *    (`geral`, `ead_semipresencial`), na ordem do tipo; valor fora do tipo vai para o fim.
 * ⚠️ **A SIGLA E O CÓDIGO SÃO LIDOS SEM OS HÍFENS** (D-6): a ordem natural do Bloco 4 (`compararCodigoDeTurma`), a que
 *    põe *CAHO* antes de *C-Ap-FR*, como no exemplo de Bernardo — e o número continua número (*T2* antes de *T10*).
 * ⚠️ **TURMAS: O CURSO, DEPOIS O ANO MAIS RECENTE, DEPOIS O CÓDIGO** (D-6).
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { compararCodigoDeTurma } from "@/lib/dominio/ordem-natural";

export const ORDEM_DAS_CLASSIFICACOES = [
  "regular",
  "expedito",
  "especial",
  "estagio_qualificacao",
  "aperfeicoamento_avancado",
  "geral",
  "ead_semipresencial",
] as const;

export type CursoParaOrdenar = {
  readonly codigo: string;
  readonly classificacao: string | null;
};

export type TurmaParaOrdenar = {
  readonly codigo: string;
  readonly cursoCodigo: string;
  readonly cursoClassificacao: string | null;
  readonly ano: number;
};

function posicaoDaClassificacao(classificacao: string | null): number {
  const i = (ORDEM_DAS_CLASSIFICACOES as readonly string[]).indexOf(classificacao ?? "");
  return i === -1 ? ORDEM_DAS_CLASSIFICACOES.length : i;
}

/** Cursos: a classificação, depois a sigla sem os hífens. */
export function compararCursos(a: CursoParaOrdenar, b: CursoParaOrdenar): number {
  return (
    posicaoDaClassificacao(a.classificacao) - posicaoDaClassificacao(b.classificacao) ||
    compararCodigoDeTurma(a.codigo, b.codigo)
  );
}

/** Turmas: a ordem do curso, depois o ano mais recente, depois o código. */
export function compararTurmas(a: TurmaParaOrdenar, b: TurmaParaOrdenar): number {
  return (
    compararCursos(
      { codigo: a.cursoCodigo, classificacao: a.cursoClassificacao },
      { codigo: b.cursoCodigo, classificacao: b.cursoClassificacao },
    ) ||
    b.ano - a.ano ||
    compararCodigoDeTurma(a.codigo, b.codigo)
  );
}

/** Uma cópia da lista de cursos na ordem única — a recebida não é tocada. */
export function emOrdemDeCurso<T extends CursoParaOrdenar>(cursos: readonly T[]): T[] {
  return [...cursos].sort(compararCursos);
}

/** Uma cópia da lista de turmas na ordem única — a recebida não é tocada. */
export function emOrdemDeTurma<T extends TurmaParaOrdenar>(turmas: readonly T[]): T[] {
  return [...turmas].sort(compararTurmas);
}
