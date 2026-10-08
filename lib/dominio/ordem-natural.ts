/**
 * A ordem das disciplinas pelo CÓDIGO, em ordem alfabética NATURAL (ajuste 5 do PR #40).
 *
 * > *"ORDEM DAS DISCIPLINAS: na situação por disciplina (abaixo da grade) e nos seletores de
 * > disciplina do lançamento, sempre por ordem alfabética do código, em ordem natural (2 antes de
 * > 10)."* — Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **NATURAL QUER DIZER QUE O NÚMERO DENTRO DO TEXTO VALE COMO NÚMERO**: `D2` antes de `D10`. A
 * comparação de texto pura poria `D10` antes de `D2`, porque compara o `1` com o `2`.
 * ⚠️ **UM COMPARADOR SÓ**: a situação e os seletores ordenam pelo mesmo, e uma segunda forma de
 * ordenar seria o segundo lugar a divergir.
 */

const COLADOR = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** Compara dois códigos em ordem alfabética natural (`2` antes de `10`, sem distinguir caixa). */
export function compararCodigoNatural(a: string, b: string): number {
  return COLADOR.compare(a, b);
}

/** Uma cópia da lista em ordem natural do código — a lista recebida não é tocada. */
export function emOrdemNaturalDoCodigo<T>(itens: readonly T[], codigo: (item: T) => string): T[] {
  return [...itens].sort((x, y) => compararCodigoNatural(codigo(x), codigo(y)));
}
