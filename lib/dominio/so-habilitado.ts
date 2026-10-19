/**
 * A marca *"só habilitado — não gera CH prevista"* nas habilitações da ficha do instrutor (FR-013.4 da spec 016).
 *
 * > *"Por disciplina: marca «só habilitado — não gera CH prevista» em cada habilitação sem atribuição no ano."*
 * > — NQ-4, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **HABILITAÇÃO NÃO É ATRIBUIÇÃO** (`RN-INST-04`): estar habilitado diz que o instrutor PODE ministrar a
 * disciplina; quem gera CH prevista é a atribuição na turma. Medido na cópia `remoto-20261017-005738.sql`: o
 * instrutor de código 15 tem 6 habilitações e 4 atribuições — duas disciplinas são só habilitação, e a lista
 * da ficha as mostrava iguais às outras.
 *
 * ⚠️ **O ANO É O MOSTRADO NA FICHA**, e a atribuição conta nele pelo ano da janela efetiva (M2). Atribuição sem ano
 * (janela desconhecida) não conta em ano nenhum — é o que a CH prevista do ano também faz.
 *
 * ⚠️ **TypeScript puro** (Princípio II).
 */

export type AtribuicaoNoAno = {
  readonly disciplinaId: string;
  /** O ano da janela efetiva da atribuição (`vw_instrutor_carga_prevista.ano`); `null` sem janela. */
  readonly ano: number | null;
};

/** As disciplinas habilitadas SEM atribuição que conte no ano — as que levam a marca. */
export function disciplinasSoHabilitadas(
  habilitadas: readonly string[],
  atribuicoes: readonly AtribuicaoNoAno[],
  ano: number,
): ReadonlySet<string> {
  const atribuidasNoAno = new Set(
    atribuicoes.filter((a) => a.ano === ano).map((a) => a.disciplinaId),
  );
  return new Set(habilitadas.filter((d) => !atribuidasNoAno.has(d)));
}
