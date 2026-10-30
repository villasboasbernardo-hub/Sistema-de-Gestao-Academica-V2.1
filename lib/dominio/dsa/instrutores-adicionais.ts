/**
 * RD-9 — **mais de um instrutor por aula** (Bloco 16, spec 031). Emenda a `RN-INST-04` do documento 04.
 *
 * > *"MAIS DE UM INSTRUTOR POR AULA (aula e atividade prática, ex.: LHFC, instrutor acompanhando outro): selecionar 1
 * > ou mais instrutores no lançamento; todos têm de ser HABILITADOS na disciplina (RD-1). REGRA: a CH da TURMA conta os
 * > TA uma vez só; a carga de CADA instrutor conta os TA inteiros."* — Bernardo Villas Boas, 30/10/2026
 * > (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-9)
 *
 * ⚠️ **A LISTA É A DA AULA** (`instrutoresDaAula`, RD-1): os habilitados na disciplina, ativos. Aqui só se tira quem
 *    ministra e quem já foi escolhido — nunca se ordena: a ordem é a antiguidade, e ela tem dono único (`RN-ANT-01`).
 * ⚠️ **A HABILITAÇÃO DE CADA UM É CONFERIDA NA SERVER ACTION**, como a de quem ministra (D-11 da spec 031); o banco
 *    recusa inexistente, repetido e o próprio titular (gatilho `trg_registros_aula_instrutores_adicionais`), com as
 *    MESMAS frases de `recusaDosAdicionais`.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** A frase de cada recusa — as mesmas da tradução da recusa do banco (`traducao-de-recusas.ts`). */
export const FRASE_ADICIONAL_REPETIDO =
  "O mesmo instrutor adicional foi escolhido duas vezes. Deixe cada um uma vez só.";
export const FRASE_ADICIONAL_E_QUEM_MINISTRA =
  "Quem ministra a aula não entra também como instrutor adicional.";

/** Quem a lista dos adicionais oferece: a lista da aula, sem quem ministra e sem os já escolhidos. */
export function adicionaisOferecidos<T extends { readonly id: string }>(
  listaDaAula: readonly T[],
  quemMinistra: string,
  escolhidos: readonly string[],
): readonly T[] {
  const fora = new Set(escolhidos);
  return listaDaAula.filter((i) => i.id !== quemMinistra && !fora.has(i.id));
}

/** Os adicionais sem quem ministra — trocar quem ministra para um adicional o tira da lista dos adicionais. */
export function semQuemMinistra(adicionais: readonly string[], quemMinistra: string): string[] {
  return adicionais.filter((id) => id !== quemMinistra);
}

/** A recusa da gravação (repetido, ou quem ministra entre os adicionais) — `null` quando a lista serve. */
export function recusaDosAdicionais(
  quemMinistra: string | null,
  adicionais: readonly string[],
): string | null {
  if (new Set(adicionais).size !== adicionais.length) return FRASE_ADICIONAL_REPETIDO;
  if (quemMinistra !== null && adicionais.includes(quemMinistra)) {
    return FRASE_ADICIONAL_E_QUEM_MINISTRA;
  }
  return null;
}
